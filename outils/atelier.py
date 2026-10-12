"""Ouvre la page de l'atelier (sortie/etape2-local.html) dans un navigateur sans tête, y fait des gestes, et capture ce qu'on voit.

Usage : python3 outils/atelier.py DOSSIER LARGEUR HAUTEUR DENSITE [geste ...]
Un geste :
  clic:SELECTEUR        un clic de souris ; toucher:SELECTEUR, un doigt qui se pose et se relève
  clavier:TOUCHE        une touche du clavier (Tab, Enter, Space, ArrowRight…)
  attendre:MS           laisser passer du temps
  capture:NOM           ce qu'on voit, dans DOSSIER/NOM.png ; film:NOM:N:MS, N captures à MS millisecondes d'écart
  defiler:Y             faire défiler la page jusqu'à Y px
  lire:SELECTEUR        écrire le texte d'un élément ; evaluer:JS, le résultat d'une expression
Avant l'ouverture : « mouvement:reduit » (l'appareil demande de réduire les animations), « prive:NOM » (le navigateur
n'a pas window.NOM : Path2D, requestAnimationFrame…), « sans:script » (il ne lance aucun script).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
dossier, largeur, hauteur, densite, gestes = Path(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5:]
dossier.mkdir(parents=True, exist_ok=True)
AVANT_L_OUVERTURE = ("mouvement:", "prive:", "sans:")

with sync_playwright() as p:
    nav = p.chromium.launch()
    reduit = "mouvement:reduit" in gestes
    contexte = nav.new_context(viewport={"width": largeur, "height": hauteur}, device_scale_factor=densite, has_touch=True,
                               reduced_motion="reduce" if reduit else "no-preference", java_script_enabled="sans:script" not in gestes)
    page = contexte.new_page()
    for geste in gestes:
        if geste.startswith("prive:"):
            page.add_init_script(f"delete window[{geste[6:]!r}]; Object.defineProperty(window, {geste[6:]!r}, {{value: undefined}});")
    erreurs = []
    page.on("console", lambda m: erreurs.append(m.text) if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    page.goto((RACINE / "sortie" / "etape2-local.html").as_uri())
    page.wait_for_timeout(600)
    for geste in gestes:
        if geste.startswith(AVANT_L_OUVERTURE):
            continue
        quoi, _, arg = geste.partition(":")
        if quoi == "clic":
            page.click(arg)
        elif quoi == "toucher":
            page.tap(arg)
        elif quoi == "clavier":
            page.keyboard.press(arg)
        elif quoi == "attendre":
            page.wait_for_timeout(int(arg))
        elif quoi == "capture":
            page.screenshot(path=str(dossier / f"{arg}.png"))
        elif quoi == "film":
            nom, nombre, ecart = arg.split(":")
            for rang in range(int(nombre)):
                page.screenshot(path=str(dossier / f"{nom}-{rang:02d}.png"))
                page.wait_for_timeout(int(ecart))
        elif quoi == "defiler":
            page.evaluate(f"window.scrollTo(0, {arg})")
            page.wait_for_timeout(120)
        elif quoi == "lire":
            print(arg, "→", page.evaluate(f"document.querySelector({arg!r})?.textContent"))
        elif quoi == "evaluer":
            print(arg, "→", page.evaluate(arg))
        else:
            raise SystemExit(f"geste inconnu : {geste}")
    debordement = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    print("débordement horizontal :", debordement, "px")
    for e in erreurs:
        print("ERREUR", e)
    nav.close()
