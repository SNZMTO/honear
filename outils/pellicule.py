"""Tire la pellicule de la séance (outils/pellicule.ts) et l'assemble en planche-contact : toutes les images côte à côte, à regarder d'un coup.

Usage : python3 outils/pellicule.py DOSSIER [colonnes=6] [echelle=0.5] [zone=x,y,largeur,hauteur] [option=valeur ...] t1 t2 ...
Les instants et les autres options sont ceux de outils/pellicule.ts. La planche est écrite dans DOSSIER/planche.png.
"""
import io, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
dossier, demandes = Path(sys.argv[1]), sys.argv[2:]
DE_LA_PLANCHE = ("colonnes=", "echelle=", "zone=")
reglages = dict(d.split("=") for d in demandes if d.startswith(DE_LA_PLANCHE))
colonnes, echelle = int(reglages.get("colonnes", 6)), float(reglages.get("echelle", 0.5))
zone = [float(v) for v in reglages["zone"].split(",")] if "zone" in reglages else None
instants = [d for d in demandes if "=" not in d]

subprocess.run(["npx", "tsx", "outils/pellicule.ts", str(dossier.resolve()), *(d for d in demandes if not d.startswith(DE_LA_PLANCHE))], cwd=RACINE, check=True)

images = []
with sync_playwright() as p:
    nav = p.chromium.launch()
    for t in instants:
        fichier = dossier / f"t{float(t):07.3f}.svg"
        svg = fichier.read_text()
        m = re.search(r'width="([\d.]+)" height="([\d.]+)"', svg)
        x, y, largeur, hauteur = zone or [0, 0, float(m.group(1)), float(m.group(2))]
        page = nav.new_page(viewport={"width": int(float(m.group(1))) + 1, "height": int(float(m.group(2))) + 1}, device_scale_factor=echelle)
        page.set_content(f'<body style="margin:0">{svg}</body>')
        png = page.screenshot(clip={"x": x, "y": y, "width": largeur, "height": hauteur})
        page.close()
        images.append((fichier.stem, Image.open(io.BytesIO(png)).convert("RGB")))
    nav.close()

MARGE, LEGENDE = 6, 16
# Les couleurs de la planche-contact : un outil d'atelier, hors du site. Un fond sombre, des légendes claires.
FOND_DE_PLANCHE, ENCRE_DES_LEGENDES = (26, 19, 19), (243, 231, 207)
l, h = images[0][1].size
rangs = (len(images) + colonnes - 1) // colonnes
planche = Image.new("RGB", (colonnes * (l + MARGE) + MARGE, rangs * (h + LEGENDE + MARGE) + MARGE), FOND_DE_PLANCHE)
crayon = ImageDraw.Draw(planche)
for rang, (nom, image) in enumerate(images):
    x, y = MARGE + (rang % colonnes) * (l + MARGE), MARGE + (rang // colonnes) * (h + LEGENDE + MARGE)
    planche.paste(image, (x, y))
    crayon.text((x + 2, y + h + 2), nom, fill=ENCRE_DES_LEGENDES)
planche.save(dossier / "planche.png")
print(dossier / "planche.png", planche.size)
