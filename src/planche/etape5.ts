/**
 * Étape 5 : la planche « Tous les écrans du téléphone ». Fabrique ses SVG dans sortie/ecrans/, et la page qui les montre :
 * sortie/etape5.html, à publier, et sortie/etape5-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/etape5.ts
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import { pelliculesDesAnimations } from './etape5/animations';
import { DOSSIER as IMAGES, pageDesEcrans, type FiguresDesEcrans } from './etape5/page';
import { imagesDesEcrans } from './etape5/scenes';
import type { FigureDePlanche } from './feuille';
import type { ImageDePlanche } from './image';
import { chargerLEncrier, policesEnBase64 } from './polices';

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

const images = imagesDesEcrans(TEXTES, encrier);
const figures: FiguresDesEcrans = {
  hote: images.hote.map(ecrire),
  invite: images.invite.map(ecrire),
  libre: images.libre.map(ecrire),
  quatreChoix: images.quatreChoix.map(ecrire),
  fin: images.fin.map(ecrire),
  etats: images.etats.map(ecrire),
  danse: images.danse.map(ecrire),
};
const pellicules = pelliculesDesAnimations(TEXTES, encrier).map((p) => ({ ...p, figures: p.images.map(ecrire) }));
const { aPublier, locale } = pageDesEcrans(figures, pellicules, TEXTES, policesEnBase64('web'));
writeFileSync(join(SORTIE, 'etape5.html'), aPublier);
writeFileSync(join(SORTIE, 'etape5-local.html'), locale);
console.log(`etape5.html : ${Math.round(aPublier.length / 1024)} Ko ; ${defauts === 0 ? 'aucun défaut' : `${defauts} défaut(s)`}`);
