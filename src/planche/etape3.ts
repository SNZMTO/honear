/**
 * Étape 3 : la planche du système visuel. Fabrique les SVG de ses images dans sortie/systeme/, et la page qui les montre
 * avec la palette, les encres et les caractères, autonome (polices embarquées, aucun script) : sortie/etape3.html, à publier,
 * et sortie/etape3-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/etape3.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import { pageDuSysteme, type FigureDuSysteme } from './etape3/page';
import { imagesDuSysteme } from './etape3/scenes';
import { chargerLEncrier, policesEnBase64 } from './polices';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sortie');
const DOSSIER = join(SORTIE, 'systeme');
mkdirSync(DOSSIER, { recursive: true });

const encrier = chargerLEncrier(TEXTES.langue);
const figures: FigureDuSysteme[] = imagesDuSysteme(TEXTES, encrier).map((image) => {
  const controle = controler(image.scene);
  console.log(
    `${image.fichier.padEnd(24)} décor ${String(controle.polygonesDuDecor).padStart(4)}  mobile le plus lourd : ${controle.plusLourdCalqueMobile.nom || '—'} ${controle.plusLourdCalqueMobile.poids}  ${controle.constats.length} défaut(s)`,
  );
  const svg = enSvg(image.scene, {
    ...image.regard,
    prefixe: `${image.fichier}-`,
    tracerLeTexte: encrier.tracer,
    titre: image.titre,
    ...(image.echelle !== undefined ? { echelle: image.echelle } : {}),
  });
  writeFileSync(join(DOSSIER, `${image.fichier}.svg`), svg);
  return { fichier: image.fichier, svg, legende: image.titre, largeur: image.regard.largeur * (image.echelle ?? 1) };
});
const { aPublier, locale } = pageDuSysteme(figures, policesEnBase64('web'), TEXTES.langue);
writeFileSync(join(SORTIE, 'etape3.html'), aPublier);
writeFileSync(join(SORTIE, 'etape3-local.html'), locale);
