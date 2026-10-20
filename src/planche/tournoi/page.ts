/**
 * La page de la planche « Le tournoi » : choisir le tournoi (deux variantes, et son salon), un duel à ses moments, puis le tableau,
 * le palmarès et le tableau fini. Une seule page, à lire de haut en bas, sans script ; ses images sont des SVG à côté d'elle, dans
 * `tournoi/`, comme celles de la planche des écrans.
 */

import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, type FigureDePlanche } from '../feuille';
import { LEGENDES_DU_TOURNOI as L } from './legendes.fr';

/** Le dossier des images, à côté de la page. */
export const DOSSIER = 'tournoi';

export type FiguresDuTournoi = Readonly<Record<keyof typeof L.sections, readonly FigureDePlanche[]>>;

/** @param polices les polices woff2 de la page, en base 64, par nom de fichier. */
export function pageDuTournoi(
  f: FiguresDuTournoi,
  textes: Textes,
  polices: Readonly<Record<string, string>>,
): { readonly aPublier: string; readonly locale: string } {
  const S = L.sections;
  const figure = (x: FigureDePlanche): string =>
    `<figure class="image" style="max-width:${x.largeur}px"><div class="cadre"><img src="${DOSSIER}/${x.fichier}.svg" alt="${enXml(x.legende)}" loading="lazy" width="${Math.round(x.largeur)}" height="${Math.round(x.hauteur ?? x.largeur)}" style="display:block;width:100%;height:auto"></div><figcaption>${enXml(x.legende)}</figcaption></figure>`;
  const section = (id: keyof typeof S): string =>
    `<section id="${id}"><h2>${enXml(S[id].titre)}</h2><p class="note">${enXml(S[id].texte)}</p><div class="telephones">${f[id].map(figure).join('')}</div></section>`;
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.telephones{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:28px 22px}
.telephones .cadre{border-radius:26px;outline:7px solid var(--papier)}
</style>
<main>
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
${section('choisir')}
${section('duel')}
${section('fin')}
</main>`;
  return deuxEcritures(page, textes.langue);
}
