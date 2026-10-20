/**
 * La page de la planche « Ce qui se touche » : trois écrans du jeu, tels qu'ils sont aujourd'hui, puis avec chacune des trois façons
 * de signaler ce qui se touche. Une seule page, sans script ; ses images sont des SVG à côté d'elle, dans `reperes/`.
 */

import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, type FigureDePlanche } from '../feuille';
import { LEGENDES_DES_REPERES as L } from './legendes.fr';
import { VARIANTES, type Variante } from './scenes';

/** Le dossier des images, à côté de la page. */
export const DOSSIER = 'reperes';

/** @param polices les polices woff2 de la page, en base 64, par nom de fichier. */
export function pageDesReperes(
  f: Readonly<Record<Variante, readonly FigureDePlanche[]>>,
  textes: Textes,
  polices: Readonly<Record<string, string>>,
): { readonly aPublier: string; readonly locale: string } {
  const figure = (x: FigureDePlanche): string =>
    `<figure class="image" style="max-width:${x.largeur}px"><div class="cadre"><img src="${DOSSIER}/${x.fichier}.svg" alt="${enXml(x.legende)}" loading="lazy" width="${Math.round(x.largeur)}" height="${Math.round(x.hauteur ?? x.largeur)}" style="display:block;width:100%;height:auto"></div><figcaption>${enXml(x.legende)}</figcaption></figure>`;
  const section = (v: Variante): string =>
    `<section id="${v}"><h2>${enXml(L.variantes[v].titre)}</h2><p class="note">${enXml(L.variantes[v].texte)}</p><div class="telephones">${f[v].map(figure).join('')}</div></section>`;
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.telephones{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:28px 22px}
.telephones .cadre{border-radius:26px;outline:7px solid var(--papier)}
</style>
<main>
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p><p class="note">${enXml(L.note)}</p></header>
${VARIANTES.map(section).join('\n')}
</main>`;
  return deuxEcritures(page, textes.langue);
}
