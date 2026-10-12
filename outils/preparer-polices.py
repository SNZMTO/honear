"""Prépare les polices auto-hébergées du projet à partir des paquets Fontsource (licence OFL) :
copie les fichiers utiles, woff2 pour le site et woff pour le tracé des textes.

Usage : python3 outils/preparer-polices.py
"""
import shutil
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PAQUETS = RACINE / "node_modules"
SORTIE = RACINE / "polices"
SORTIE.mkdir(exist_ok=True)

COPIES = {
    "caprasimo-400": "@fontsource/caprasimo/files/caprasimo-latin-400-normal",
    "barlow-condensed-500": "@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal",
    "barlow-condensed-600": "@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal",
}
for nom, source in COPIES.items():
    for ext in ("woff", "woff2"):
        shutil.copyfile(PAQUETS / f"{source}.{ext}", SORTIE / f"{nom}.{ext}")
        print("copié", f"{nom}.{ext}")
