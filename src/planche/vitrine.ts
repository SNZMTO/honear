/**
 * La vitrine : les images du README, sur GitHub, dessinées par le moteur du site. Fabrique leurs SVG dans .github/vitrine/.
 * Sur la bannière et le logo en face B, l'étiquette tourne à 33 tours, comme sur la platine : seule l'étiquette, car le reflet
 * des sillons, lui, reste où la lampe le pose.
 *
 *   npm run vitrine
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import { chargerLEncrier } from './polices';
import { imagesDeLaPlanche } from './scenes';
import { imagesDeLaVitrine } from './vitrine/scenes';

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'vitrine');
mkdirSync(DOSSIER, { recursive: true });

/** Un tour d'étiquette, en secondes : 33 tours et un tiers par minute. */
const SECONDES_PAR_MINUTE = 60;
const TOURS_PAR_MINUTE = 100 / 3;
const UN_TOUR = SECONDES_PAR_MINUTE / TOURS_PAR_MINUTE;

/** Les images où l'étiquette tourne. */
const QUI_TOURNENT = new Set(['banniere', 'face-b']);

/**
 * Fait tourner l'étiquette, son ombre et les repères gravés du plateau autour de leur centre : il est déjà à l'origine de leur
 * repère. Le bras, les boutons et les pastilles ont aussi un calque « tourne », mais ils ne tournent pas avec le disque.
 */
const fairetourner = (svg: string): string =>
  svg.replace(
    /(<g [^>]*data-calque="(?:logo\/)?(?:etiquette\/(?:papier|ombre\/palier-\d+)|reperes\/gravure)\/tourne"[^>]*>)/g,
    `$1<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${UN_TOUR}s" repeatCount="indefinite"/>`,
  );

const encrier = chargerLEncrier(TEXTES.langue);
const eclatee = imagesDeLaPlanche(TEXTES, encrier).find((image) => image.fichier === 'platine-eclatee');
if (eclatee === undefined) throw new Error('La planche de l’étape 1 n’a plus de platine éclatée.');

for (const image of [...imagesDeLaVitrine(TEXTES, encrier), eclatee]) {
  const controle = controler(image.scene);
  const svg = enSvg(image.scene, {
    ...image.regard,
    prefixe: `${image.fichier}-`,
    tracerLeTexte: encrier.tracer,
    titre: image.titre,
    ...(image.echelle !== undefined ? { echelle: image.echelle } : {}),
  });
  const final = QUI_TOURNENT.has(image.fichier) ? fairetourner(svg) : svg;
  writeFileSync(join(DOSSIER, `${image.fichier}.svg`), final);
  console.log(`${image.fichier.padEnd(24)} ${String(Math.round(final.length / 1024)).padStart(4)} Ko  ${controle.constats.length} défaut(s)`);
}
