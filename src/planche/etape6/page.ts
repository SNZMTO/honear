/**
 * La page de la planche « L'écran de l'hôte » (étape 6) : les six moments d'une partie sur le grand écran, l'un sous l'autre,
 * chacun à la largeur de la page. Sans script. Ses images sont des fichiers SVG à côté d'elle, dans `hote/`.
 */

import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, type FigureDePlanche } from '../feuille';
import { LEGENDES_DE_L_HOTE as L } from './legendes.fr';

/** Le dossier des images, à côté de la page. */
export const DOSSIER = 'hote';

export function pageDeLHote(
  figures: readonly FigureDePlanche[],
  textes: Textes,
  polices: Readonly<Record<string, string>>,
): { readonly aPublier: string; readonly locale: string } {
  const figure = (x: FigureDePlanche): string =>
    `<figure class="image grand"><div class="cadre"><img src="${DOSSIER}/${x.fichier}.svg" alt="${enXml(x.legende)}" loading="lazy" width="${Math.round(x.largeur)}" height="${Math.round(x.hauteur ?? x.largeur)}" style="display:block;width:100%;height:auto"></div><figcaption>${enXml(x.legende)}</figcaption></figure>`;
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.grands{display:flex;flex-direction:column;gap:36px}
.grand{max-width:1440px;width:100%}
.grand .cadre{border-radius:12px;outline:10px solid var(--papier)}
</style>
<main>
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
<section><p class="note">${enXml(L.texte)}</p><div class="grands">${figures.map(figure).join('')}</div></section>
</main>`;
  return deuxEcritures(page, textes.langue);
}
