/**
 * La planche « Le tournoi ». Fabrique ses SVG dans sortie/tournoi/, et la page qui les montre : sortie/tournoi.html, à publier, et
 * sortie/tournoi-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/tournoi.ts
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
import { DOSSIER as IMAGES, pageDuTournoi } from './tournoi/page';
import { imagesDuTournoi } from './tournoi/scenes';

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

const images = imagesDuTournoi(TEXTES, encrier);
const { aPublier, locale } = pageDuTournoi(
  { choisir: images.choisir.map(ecrire), duel: images.duel.map(ecrire), fin: images.fin.map(ecrire) },
  TEXTES,
  policesEnBase64('web'),
);
writeFileSync(join(SORTIE, 'tournoi.html'), aPublier);
writeFileSync(join(SORTIE, 'tournoi-local.html'), locale);
console.log(`tournoi.html : ${Math.round(aPublier.length / 1024)} Ko ; ${defauts === 0 ? 'aucun défaut' : `${defauts} défaut(s)`}`);
