"""Regarde un SVG de sortie/ de près : le pose dans une page nue et en capture une zone.

Usage : python3 outils/voir.py sortie/nom.svg image.png [x y largeur hauteur [densite]]
"""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

svg = Path(sys.argv[1]).read_text()
sortie = sys.argv[2]
m = re.search(r'width="([\d.]+)" height="([\d.]+)"', svg)
largeur, hauteur = float(m.group(1)), float(m.group(2))
zone = [float(v) for v in sys.argv[3:7]] if len(sys.argv) > 6 else [0, 0, largeur, hauteur]
densite = float(sys.argv[7]) if len(sys.argv) > 7 else 1

with sync_playwright() as p:
    navigateur = p.chromium.launch()
    page = navigateur.new_page(viewport={"width": int(largeur) + 1, "height": int(hauteur) + 1}, device_scale_factor=densite)
    page.set_content(f'<body style="margin:0">{svg}</body>')
    page.wait_for_timeout(200)
    page.screenshot(path=sortie, clip={"x": zone[0], "y": zone[1], "width": zone[2], "height": zone[3]})
    navigateur.close()
