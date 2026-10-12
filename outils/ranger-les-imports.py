"""Range les imports en tête de chaque fichier TypeScript : node, paquets, puis modules du projet,
triés par chemin ; `import type` quand tout ce qui est importé est un type.
À faire suivre de `npm run format`, qui remet les lignes trop longues à la bonne largeur.
Un fichier déjà rangé n'est pas réécrit.

Usage : python3 outils/ranger-les-imports.py
"""
import pathlib
import re

RACINE = pathlib.Path(__file__).resolve().parent.parent
BLOC = re.compile(r"(?:^import [^;]*;\n)+", re.M)
INSTRUCTION = re.compile(r"import [^;]*;")
NOMME = re.compile(r"^import (type )?\{([^}]*)\} from '([^']+)';$")
PAR_DEFAUT = re.compile(r"^import (\w+) from '([^']+)';$")


def rang(chemin: str):
    if chemin.startswith("node:"):
        return (0, chemin)
    if not chemin.startswith("."):
        return (1, chemin)
    return (2, -chemin.count("../"), chemin)


def ranger(instruction: str, fichier: pathlib.Path):
    ligne = " ".join(instruction.split())
    nomme = NOMME.match(ligne)
    if nomme:
        noms = [n.strip() for n in nomme.group(2).split(",") if n.strip()]
        if nomme.group(1) or all(n.startswith("type ") for n in noms):
            noms = sorted({n.removeprefix("type ") for n in noms}, key=str.lower)
            return nomme.group(3), f"import type {{ {', '.join(noms)} }} from '{nomme.group(3)}';"
        valeurs = sorted((n for n in noms if not n.startswith("type ")), key=str.lower)
        types = sorted((n for n in noms if n.startswith("type ")), key=str.lower)
        return nomme.group(3), f"import {{ {', '.join(valeurs + types)} }} from '{nomme.group(3)}';"
    defaut = PAR_DEFAUT.match(ligne)
    if not defaut:
        raise SystemExit(f"{fichier} : import non reconnu : {ligne}")
    return defaut.group(2), ligne


for fichier in [f for dossier in ("src", "tests", "outils") for f in (RACINE / dossier).rglob("*.ts")]:
    texte = fichier.read_text()
    bloc = BLOC.search(texte)
    if bloc is None:
        continue
    ecrites = INSTRUCTION.findall(bloc.group(0))
    ranges = [e[1] for e in sorted((ranger(i, fichier) for i in ecrites), key=lambda e: rang(e[0]))]
    # Déjà rangé, à la coupe des lignes près : on n'y touche pas, la mise en forme a fait son travail.
    if [" ".join(i.split()).replace("{ ", "{").replace(" }", "}").replace(",}", "}") for i in ecrites] == [
        r.replace("{ ", "{").replace(" }", "}") for r in ranges
    ]:
        continue
    fichier.write_text(texte[: bloc.start()] + "\n".join(ranges) + "\n" + texte[bloc.end() :])
    print("rangé", fichier.relative_to(RACINE))
