/**
 * La page de la planche « Tous les écrans du téléphone » : le chemin de l'hôte, celui de l'invité, une piste en saisie libre et en
 * 4 choix, le hit-parade et la finale, chaque état avec sa phrase, la danse des aiguilles. Une seule page, à lire de haut en bas,
 * sans script. Ses images sont des fichiers SVG à côté d'elle, dans `ecrans/` : écrites dans la page, elles la rendraient trop lourde.
 */

import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, type FigureDePlanche } from '../feuille';
import { LEGENDES_DES_ECRANS as L } from './legendes.fr';

/** Le dossier des images, à côté de la page. */
export const DOSSIER = 'ecrans';

export type FiguresDesEcrans = Readonly<Record<Exclude<keyof typeof L.sections, 'animations'>, readonly FigureDePlanche[]>>;

/** Une pellicule telle que la page la montre : son nom, ce qu'elle fait, ses images, et ce que la page les grossit. */
export interface PelliculeDeLaPage {
  readonly titre: string;
  readonly texte: string;
  readonly figures: readonly FigureDePlanche[];
  readonly grossissement: number;
}

/** @param polices les polices woff2 de la page, en base 64, par nom de fichier. */
export function pageDesEcrans(
  f: FiguresDesEcrans,
  pellicules: readonly PelliculeDeLaPage[],
  textes: Textes,
  polices: Readonly<Record<string, string>>,
): { readonly aPublier: string; readonly locale: string } {
  const S = L.sections;
  const figure = (x: FigureDePlanche): string =>
    `<figure class="image" style="max-width:${x.largeur}px"><div class="cadre"><img src="${DOSSIER}/${x.fichier}.svg" alt="${enXml(x.legende)}" loading="lazy" style="display:block;width:100%;height:auto"></div><figcaption>${enXml(x.legende)}</figcaption></figure>`;
  const image = (x: FigureDePlanche, grossissement: number): string =>
    `<figure class="image" style="width:${Math.round(x.largeur * grossissement)}px"><div class="cadre"><img src="${DOSSIER}/${x.fichier}.svg" alt="${enXml(x.legende)}" loading="lazy" width="${Math.round(x.largeur)}" height="${Math.round(x.hauteur ?? x.largeur)}" style="display:block;width:100%;height:auto"></div><figcaption>${enXml(x.legende)}</figcaption></figure>`;
  const bande = (p: PelliculeDeLaPage): string =>
    `<div class="pellicule"><h3>${enXml(p.titre)}</h3><p class="note">${enXml(p.texte)}</p><div class="bande">${p.figures.map((x) => image(x, p.grossissement)).join('')}</div></div>`;
  const section = (id: Exclude<keyof typeof S, 'animations'>, classe: string): string =>
    `<section id="${id}"><h2>${enXml(S[id].titre)}</h2><p class="note">${enXml(S[id].texte)}</p><div class="${classe}">${f[id].map(figure).join('')}</div></section>`;
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.telephones{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:28px 22px}
.telephones .cadre{border-radius:26px;outline:7px solid var(--papier)}
.danse{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}
.pellicule{margin:0 0 40px}
.pellicule h3{margin:0 0 6px}
.bande{display:flex;flex-wrap:wrap;gap:14px 12px;align-items:flex-start}
.bande .image{flex:0 1 auto;max-width:100%}
.bande .cadre{border-radius:8px}
</style>
<main>
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
${section('hote', 'telephones')}
${section('invite', 'telephones')}
${section('libre', 'telephones')}
${section('quatreChoix', 'telephones')}
${section('fin', 'telephones')}
${section('etats', 'telephones')}
${section('danse', 'danse')}
<section id="animations"><h2>${enXml(S.animations.titre)}</h2><p class="note">${enXml(S.animations.texte)}</p>${pellicules.map(bande).join('')}</section>
</main>`;
  return deuxEcritures(page, textes.langue);
}
