/**
 * La planche « Ce qui se touche ». Fabrique ses SVG dans sortie/reperes/, et la page qui les montre : sortie/reperes.html, à publier,
 * et sortie/reperes-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/reperes.ts
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import type { FigureDePlanche } from './feuille';
import type { ImageDePlanche } from './image';
import { chargerLEncrier, policesEnBase64 } from './polices';
import { DOSSIER as IMAGES, pageDesReperes } from './reperes/page';
import { imagesDesReperes } from './reperes/scenes';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sortie');
const DOSSIER = join(SORTIE, IMAGES);
rmSync(DOSSIER, { recursive: true, force: true });
mkdirSync(DOSSIER, { recursive: true });
const encrier = chargerLEncrier(TEXTES.langue);
let defauts = 0;

function ecrire(image: ImageDePlanche): FigureDePlanche {
  const controle = controler(image.scene);
  defauts += controle.constats.length;
  for (const c of controle.constats.slice(0, 3)) console.log(`   ✗ ${image.fichier} : ${c.regle} @ ${c.calque} : ${c.detail}`);
  const svg = enSvg(image.scene, { ...image.regard, prefixe: `${image.fichier}-`, tracerLeTexte: encrier.tracer, titre: image.titre });
  writeFileSync(join(DOSSIER, `${image.fichier}.svg`), svg);
  return { fichier: image.fichier, svg, legende: image.titre, largeur: image.regard.largeur, hauteur: image.regard.hauteur };
}

const images = imagesDesReperes(TEXTES, encrier);
const { aPublier, locale } = pageDesReperes(
  {
    aujourdhui: images.aujourdhui.map(ecrire),
    coins: images.coins.map(ecrire),
    pointilles: images.pointilles.map(ecrire),
    pastilles: images.pastilles.map(ecrire),
  },
  TEXTES,
  policesEnBase64('web'),
);
writeFileSync(join(SORTIE, 'reperes.html'), aPublier);
writeFileSync(join(SORTIE, 'reperes-local.html'), locale);
console.log(`reperes.html : ${Math.round(aPublier.length / 1024)} Ko ; ${defauts === 0 ? 'aucun défaut' : `${defauts} défaut(s)`}`);
