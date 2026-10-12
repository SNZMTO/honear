/**
 * Étape 1 : la planche de rendu, telle que les choix l'ont laissée.
 * Fabrique ses SVG dans sortie/ (les cinq images, et le même détail des deux densités, grossi), leur inventaire,
 * et une page d'aperçu pour les regarder côte à côte.
 *
 *   npx tsx src/planche/etape1.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { couleur } from '../lowpoly/tons';
import { CADRAGES } from '../ressources/cadrages';
import { TEXTES } from '../ressources/textes.fr';
import { APPROCHES, CARACTERES, CORPS } from '../ressources/typo';
import { remplir } from '../scene/phrases';
import { controler } from '../scene/rendu/controle';
import { inventaire, poidsTotal } from '../scene/rendu/inventaire';
import { enSvg } from '../scene/rendu/svg';
import type { ImageDePlanche } from './image';
import { compter, LEGENDES } from './legendes.fr';
import { chargerLEncrier } from './polices';
import { detailsDesDensites, imagesDeLaPlanche } from './scenes';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sortie');
/** Le caractère des légendes de l'aperçu : le technique, servi depuis le dossier polices/. */
const { technique } = CARACTERES;
const { largeur: largeurDuTelephone, hauteur: hauteurDuTelephone } = CADRAGES.telephone;

mkdirSync(SORTIE, { recursive: true });
const encrier = chargerLEncrier(TEXTES.langue);
const images = imagesDeLaPlanche(TEXTES, encrier);
/** Les figures de l'aperçu, rangée par rangée : les platines, leurs détails grossis, puis la pochette et le logo. */
const rangees = { platines: [] as string[], details: [] as string[], autres: [] as string[] };
const rapport: Record<string, unknown> = {};

/** Écrit le SVG d'une image dans sortie/, et le rend. */
function ecrire(image: ImageDePlanche): string {
  const svg = enSvg(image.scene, {
    ...image.regard,
    prefixe: `${image.fichier}-`,
    tracerLeTexte: encrier.tracer,
    titre: image.titre,
    ...(image.echelle !== undefined ? { echelle: image.echelle } : {}),
  });
  writeFileSync(join(SORTIE, `${image.fichier}.svg`), svg);
  return svg;
}

/** La figure d'une image dans l'aperçu : son SVG dans un cadre, et sa légende dessous. */
function figure(image: ImageDePlanche, svg: string, legende: string): string {
  const { largeur, hauteur } = image.regard;
  const classe = largeur === largeurDuTelephone && hauteur === hauteurDuTelephone ? 'cadre telephone' : 'cadre';
  return `<figure style="width:${largeur * (image.echelle ?? 1)}px"><div class="${classe}">${svg}</div><figcaption>${legende}</figcaption></figure>`;
}

for (const image of images) {
  const svg = ecrire(image);
  const lignes = inventaire(image.scene);
  const controle = controler(image.scene);
  const { polygones } = poidsTotal(lignes);
  rapport[image.fichier] = { titre: image.titre, polygones, octets: svg.length, calques: lignes, controle };
  console.log(
    `${image.fichier.padEnd(18)} ${String(polygones).padStart(5)} polygones  ${String(Math.round(svg.length / 1024)).padStart(4)} Ko  ${controle.constats.length} défaut(s)`,
  );
  const legende = remplir(LEGENDES.images.poids, { titre: image.titre, polygones: compter(polygones, LEGENDES.polygones) });
  rangees[image.fichier.startsWith('platine') ? 'platines' : 'autres'].push(figure(image, svg, legende));
}
// Les détails ne sont pas de nouvelles scènes : les mêmes platines, regardées de plus près.
for (const detail of detailsDesDensites(images)) rangees.details.push(figure(detail, ecrire(detail), detail.titre));

writeFileSync(join(SORTIE, 'rapport.json'), JSON.stringify(rapport, null, 2));
writeFileSync(
  join(SORTIE, 'apercu.html'),
  `<!doctype html><html lang="${TEXTES.langue}"><meta charset="utf-8"><title>${LEGENDES.titre}</title>
<style>
@font-face{font-family:'${technique.famille}';font-weight:${technique.graisse};src:url('../polices/${technique.web}') format('woff2')}
body{margin:0;background:${couleur('vinyle', 1)};color:${couleur('creme')};padding:40px;
  font:${technique.graisse} ${CORPS.mention}px/1.4 '${technique.famille}',sans-serif;letter-spacing:${APPROCHES.technique}em;text-transform:uppercase}
.rang{display:flex;flex-wrap:wrap;gap:60px;align-items:flex-start;margin-bottom:70px}
figure{margin:0;flex:none}
.cadre{overflow:hidden;outline:10px solid ${couleur('vinyle', 0)}}
.telephone{width:${largeurDuTelephone}px;height:${hauteurDuTelephone}px;border-radius:44px}
.cadre svg{display:block}
figcaption{margin-top:18px;text-align:center;text-wrap:balance}
</style>
${[rangees.platines, rangees.details, rangees.autres].map((figures) => `<div class="rang">${figures.join('')}</div>`).join('')}</html>`,
);
