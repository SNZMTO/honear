"""Capture une page ou une portion de page, pour regarder le rendu de près.

Usage : python3 outils/capture.py page.html sortie.png [largeur hauteur [x y l h [densite]]]
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

page_html = Path(sys.argv[1]).resolve()
sortie = sys.argv[2]
largeur = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
hauteur = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
zone = [float(v) for v in sys.argv[5:9]] if len(sys.argv) > 8 else None
densite = float(sys.argv[9]) if len(sys.argv) > 9 else 1

with sync_playwright() as p:
    navigateur = p.chromium.launch()
    page = navigateur.new_page(viewport={"width": largeur, "height": hauteur}, device_scale_factor=densite)
    erreurs = []
    page.on("console", lambda m: erreurs.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: erreurs.append(str(e)))
    page.goto(page_html.as_uri())
    page.wait_for_timeout(400)
    if zone:
        page.screenshot(path=sortie, clip={"x": zone[0], "y": zone[1], "width": zone[2], "height": zone[3]}, full_page=True)
    else:
        page.screenshot(path=sortie, full_page=True)
    for e in erreurs:
        print("ERREUR", e)
    navigateur.close()
