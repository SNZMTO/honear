/**
 * Étape 6 : la planche « L'écran de l'hôte ». Fabrique ses SVG dans sortie/hote/, et la page qui les montre :
 * sortie/etape6.html, à publier, et sortie/etape6-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/etape6.ts
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import { DOSSIER as IMAGES, pageDeLHote } from './etape6/page';
import { imagesDeLHote } from './etape6/scenes';
import type { FigureDePlanche } from './feuille';
import { chargerLEncrier, policesEnBase64 } from './polices';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sortie');
const DOSSIER = join(SORTIE, IMAGES);
rmSync(DOSSIER, { recursive: true, force: true });
mkdirSync(DOSSIER, { recursive: true });
const encrier = chargerLEncrier(TEXTES.langue);
let defauts = 0;

const figures: FigureDePlanche[] = imagesDeLHote(TEXTES, encrier).map((image) => {
  const controle = controler(image.scene);
  defauts += controle.constats.length;
  for (const c of controle.constats.slice(0, 3)) console.log(`   ✗ ${image.fichier} : ${c.regle} @ ${c.calque} : ${c.detail}`);
  const svg = enSvg(image.scene, { ...image.regard, prefixe: `${image.fichier}-`, tracerLeTexte: encrier.tracer, titre: image.titre });
  writeFileSync(join(DOSSIER, `${image.fichier}.svg`), svg);
  return { fichier: image.fichier, svg, legende: image.titre, largeur: image.regard.largeur, hauteur: image.regard.hauteur };
});
const { aPublier, locale } = pageDeLHote(figures, TEXTES, policesEnBase64('web'));
writeFileSync(join(SORTIE, 'etape6.html'), aPublier);
writeFileSync(join(SORTIE, 'etape6-local.html'), locale);
console.log(`etape6.html : ${Math.round(aPublier.length / 1024)} Ko ; ${defauts === 0 ? 'aucun défaut' : `${defauts} défaut(s)`}`);
