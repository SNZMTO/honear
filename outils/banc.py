"""Construit le banc d'essai du montage (outils/banc.ts) et le pilote dans un navigateur sans tête.

Usage :
  python3 outils/banc.py image DOSSIER [fine|sobre] [dN] [figees] t1 t2 ...  # la scène montée et sa référence, côte à côte, et leur écart
                                                                             # (dN : N px d'appareil par px ; figees : ombres figées)
  python3 outils/banc.py mesure [dN] [ecrire] r1 r2 ...                      # ce que coûtent le premier dessin, puis une image, le processeur
                                                                             # ralenti r1 fois, puis r2 fois… ; ecrire : recopie les relevés
                                                                             # dans src/planche/etape2/banc.ts
Les mesures ne valent que si rien d'autre ne tourne sur la machine.
"""
import io, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "sortie" / "banc"
SORTIE.mkdir(parents=True, exist_ok=True)
# Ce qui sépare, à l'écran, la scène montée de sa référence, en px.
ENTRE_LES_DEUX = 10
# À partir de cet écart de ton, sur 255, deux px diffèrent nettement.
ECART_NET = 24


def construire() -> Path:
    js = SORTIE / "banc.js"
    # Le même assemblage que la page de l'atelier : ses polices, et les navigateurs qu'elle vise.
    subprocess.run(["npx", "tsx", "outils/assembler.ts", "outils/banc.ts", str(js)], cwd=RACINE, check=True)
    page = SORTIE / "banc.html"
    # Le script donne leur taille aux deux cadres : c'est lui qui connaît celle de la scène.
    page.write_text(
        f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000;display:flex;gap:{ENTRE_LES_DEUX}px">'
        '<div id="cadre"></div><div id="reference"></div><script src="banc.js"></script>')
    return page


def ouvrir(p, page_html, densite_ecran=1.0, ralentissement=1.0):
    """Ouvre le banc dans un navigateur sans tête, au processeur ralenti s'il le faut. Rend aussi de quoi lui parler de près (CDP),
    et la taille du cadre où la scène se monte."""
    nav = p.chromium.launch()
    page = nav.new_page(device_scale_factor=densite_ecran)
    erreurs = []
    page.on("console", lambda m: erreurs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    cdp = page.context.new_cdp_session(page)
    if ralentissement != 1:
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": ralentissement})
    page.goto(page_html.as_uri())
    page.wait_for_function("window.banc !== undefined", timeout=120000)
    cadrage = page.evaluate("banc.cadrage")
    largeur, hauteur = cadrage["largeur"], cadrage["hauteur"]
    page.set_viewport_size({"width": 2 * largeur + ENTRE_LES_DEUX, "height": hauteur})
    return nav, page, erreurs, cdp, (largeur, hauteur)


def images(dossier, cle, definition, instants, ombres_figees=False):
    from PIL import Image, ImageChops
    Path(dossier).mkdir(parents=True, exist_ok=True)
    page_html = construire()
    with sync_playwright() as p:
        nav, page, erreurs, _, (largeur, hauteur) = ouvrir(p, page_html, densite_ecran=definition)
        print("monté :", page.evaluate(f"banc.monter('{cle}', {definition}, {str(ombres_figees).lower()})"))
        revelee_a = page.evaluate("banc.reveleeA")
        for t in instants:
            if t >= revelee_a:
                page.evaluate("banc.remplirLeVerso()")
            page.evaluate(f"banc.poser({t})")
            page.wait_for_timeout(120)
            image = Image.open(io.BytesIO(page.screenshot())).convert("RGB")
            l, h, a_droite = int(largeur * definition), int(hauteur * definition), int((largeur + ENTRE_LES_DEUX) * definition)
            montee, reference = image.crop((0, 0, l, h)), image.crop((a_droite, 0, a_droite + l, h))
            ecart = ImageChops.difference(montee, reference)
            pixels = list(ecart.convert("L").tobytes())
            differents = sum(1 for v in pixels if v > ECART_NET)
            print(f"t={t:<7} écart moyen {sum(pixels) / len(pixels):.3f}  au pire {max(pixels)}  px qui diffèrent nettement : {differents} ({100 * differents / len(pixels):.3f} %)")
            image.save(f"{dossier}/t{t:07.3f}.png")
            ecart.point(lambda v: min(255, v * 6)).save(f"{dossier}/ecart-t{t:07.3f}.png")
        for e in erreurs:
            print("ERREUR", e)
        nav.close()


# Combien de fois la séance est rejouée pour chaque scène : de chaque mesure, on garde la médiane des passes.
PASSES = 5
RELEVES = RACINE / "src" / "planche" / "etape2" / "banc.ts"

mediane = lambda valeurs: sorted(valeurs)[len(valeurs) // 2]


def passer(page, cdp, scenes):
    """Rejoue la séance PASSES fois pour chaque scène, et rend ses passes. Les passes sont entrelacées : à chacune, toutes les scènes
    sont mesurées l'une après l'autre. Une machine qui ralentit un moment touche alors une passe de plusieurs scènes, que la médiane
    écarte, au lieu de toutes les passes d'une seule."""
    taches = lambda: next(m["value"] for m in cdp.send("Performance.getMetrics")["metrics"] if m["name"] == "TaskDuration")
    passes = {nom: [] for nom in scenes}
    for _ in range(PASSES):
        for nom in scenes:
            # Chaque mesure part d'une mémoire rangée : les toiles de la scène d'avant ne pèsent pas sur celle-ci.
            cdp.send("HeapProfiler.collectGarbage")
            avant = taches()
            r = page.evaluate(f"banc.mesurer({nom!r})")
            # Ce que le fil principal a travaillé pendant la séance, le premier dessin mis à part, ramené à une image.
            passes[nom].append({**r, "fil": 1000 * (taches() - avant - r["montage"] / 1000) / r["images"]})
    return passes


def releve_de(nom, passes, en_retard):
    """Le relevé d'une scène : la médiane de ses passes, mesure par mesure. Rend aussi la ligne qui le dit, suivie de ce que chaque passe
    a donné pour le premier dessin et pour le fil principal : c'est là qu'on lit de combien une mesure bouge seule."""
    releve = {"scene": nom, "montage": round(mediane([q["montage"] for q in passes])), "fil": round(mediane([q["fil"] for q in passes]), 1),
              "script": round(mediane([q["script"] for q in passes]), 1)}
    ligne = f"  {nom:15} premier dessin {releve['montage']:5} ms   fil principal {releve['fil']:4.1f} ms par image, dont script {releve['script']:4.1f}"
    for phase in passes[0]["phases"]:
        de_la_phase = [q["phases"][phase] for q in passes]
        releve[phase] = {cle: round(mediane([f[cle] for f in de_la_phase]), 1) for cle in ("mediane", "longues")}
        ligne += f"   {phase} : {releve[phase]['mediane']:5.1f} ms, {releve[phase]['longues']:4.1f} % > {en_retard:g} ms, pire {mediane([f['pire'] for f in de_la_phase]):5.1f}"
    ligne += "   passes : premier dessin " + " ".join(f"{q['montage']:.0f}" for q in passes) + " ; fil " + " ".join(f"{q['fil']:.1f}" for q in passes)
    return releve, ligne


def mesure(ralentissement, definition, page_html):
    """Pour chaque scène du banc : l'atelier de la page ouvert, la séance rejouée en entier, et ce que coûte une image à chaque phase."""
    releves = []
    with sync_playwright() as p:
        nav, page, erreurs, cdp, _ = ouvrir(p, page_html, densite_ecran=definition, ralentissement=ralentissement)
        cdp.send("Performance.enable")
        en_retard = page.evaluate("banc.enRetard")
        print(f"processeur ralenti {ralentissement:g} fois, {definition:g} px d'appareil par px ; lire les polices : {page.evaluate('banc.tempsDeLEncrier'):.0f} ms", flush=True)
        for nom, passes in passer(page, cdp, page.evaluate("banc.scenes")).items():
            releve, ligne = releve_de(nom, passes, en_retard)
            print(ligne, flush=True)
            releves.append(releve)
        for e in erreurs:
            print("ERREUR", e)
        nav.close()
    return {"ralenti": ralentissement, "definition": definition, "releves": releves}


def ecrire_les_releves(bancs):
    """Recopie les relevés dans le module que la page de l'atelier affiche, sous la marque qui les précède."""
    source = RELEVES.read_text()
    marque = "/** Les relevés, écrits par outils/banc.py : on ne les retouche pas à la main. */\n"
    if marque not in source:
        raise SystemExit(f"{RELEVES} n'a plus sa marque : les relevés n'y sont pas écrits.")
    en_ts = lambda valeur: (
        "{ " + ", ".join(f"{cle}: {en_ts(v)}" for cle, v in valeur.items()) + " }" if isinstance(valeur, dict)
        else "[" + ", ".join(en_ts(v) for v in valeur) + "]" if isinstance(valeur, list)
        else f"'{valeur}'" if isinstance(valeur, str)
        else f"{valeur:g}")
    RELEVES.write_text(source[: source.index(marque) + len(marque)] + f"export const BANCS: readonly Banc[] = {en_ts(bancs)};\n")
    subprocess.run(["npx", "prettier", "--write", "--log-level=warn", str(RELEVES)], cwd=RACINE, check=True)
    print("relevés écrits dans", RELEVES.relative_to(RACINE))


def definition_demandee(reste):
    """Retire d'une liste d'arguments le « dN » qui dit combien de px d'appareil par px, et rend N ; 1 s'il n'y est pas."""
    for rang, argument in enumerate(reste):
        if argument.startswith("d") and argument[1:].replace(".", "", 1).isdigit():
            reste.pop(rang)
            return float(argument[1:])
    return 1.0


if __name__ == "__main__":
    quoi, reste = sys.argv[1], sys.argv[2:]
    if quoi == "image":
        dossier = reste.pop(0)
        cle = reste.pop(0) if reste and reste[0] in ("fine", "sobre") else "fine"
        definition = definition_demandee(reste)
        figees = "figees" in reste
        images(dossier, cle, definition, [float(t) for t in reste if t != "figees"], figees)
    elif quoi == "mesure":
        definition = definition_demandee(reste)
        ecrire = "ecrire" in reste
        ralentissements = [float(v) for v in reste if v != "ecrire"] or [1.0]
        page_html = construire()
        bancs = [mesure(ralentissement, definition, page_html) for ralentissement in ralentissements]
        if ecrire:
            ecrire_les_releves(bancs)
    else:
        raise SystemExit(__doc__)
