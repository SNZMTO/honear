/**
 * La page de la planche « Fais ta pochette » : l'écran, l'avatar et ses deux choix, les expressions, les motifs,
 * la touche « Au hasard » (qui fait défiler douze tirages déjà dessinés), douze pochettes, les noms et les albums.
 * Son seul script fait défiler les tirages ; tout le reste se lit sans lui.
 */

import { CHOIX_DE_L_AVATAR, type ChoixDeLAvatar } from '../../ressources/avatar';
import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, figure, figureDe, type FigureDePlanche } from '../feuille';
import { LEGENDES_DE_LA_POCHETTE as L } from './legendes.fr';

/** Les figures de la page, rangées par section. */
export interface FiguresDeLaPochette {
  readonly ecran: FigureDePlanche;
  readonly choix: Readonly<Record<ChoixDeLAvatar, readonly FigureDePlanche[]>>;
  readonly expressions: readonly (readonly FigureDePlanche[])[];
  readonly motifs: readonly FigureDePlanche[];
  readonly hasard: readonly FigureDePlanche[];
  readonly toucheAuHasard: FigureDePlanche;
  readonly exemples: readonly FigureDePlanche[];
}

const grille = (figures: readonly FigureDePlanche[], classe: string): string =>
  `<div class="${classe}">${figures.map((f) => figure(f)).join('')}</div>`;

/** @param polices les polices woff2 de la page, en base 64, par nom de fichier. */
export function pageDeLaPochette(
  f: FiguresDeLaPochette,
  textes: Textes,
  polices: Readonly<Record<string, string>>,
): { readonly aPublier: string; readonly locale: string } {
  const S = L.sections;
  const P = textes.pochette;
  const section = (id: string, titre: string, texte: string, contenu: string): string =>
    `<section id="${id}"><h2>${enXml(titre)}</h2>${texte !== '' ? `<p class="note">${enXml(texte)}</p>` : ''}${contenu}</section>`;
  const choix = CHOIX_DE_L_AVATAR.map((c) => `<h3>${enXml(P.choix[c])}</h3>${grille(f.choix[c], 'choix')}`).join('');
  const expressions = f.expressions.map((rangee) => grille(rangee, 'expressions')).join('');
  const tirages = f.hasard
    .map(
      (t, rang) =>
        `<figure class="tirage" data-tirage${rang === 0 ? '' : ' hidden'}><div class="cadre">${t.svg}</div><figcaption>${enXml(t.legende)}</figcaption></figure>`,
    )
    .join('');
  const hasard = `<div class="hasard"><button type="button" id="au-hasard" class="touches bouton" aria-label="${enXml(P.auHasard)}">${f.toucheAuHasard.svg}</button><div class="scene-du-tirage">${tirages}</div></div>`;
  const listes = `<div class="listes"><div><h3>${enXml(S.listes.artistes)}</h3><ol>${P.artistes.map((a) => `<li>${enXml(a)}</li>`).join('')}</ol></div><div><h3>${enXml(S.listes.albums)}</h3><ol class="albums">${P.albums.map((a) => `<li>${enXml(a)}</li>`).join('')}</ol></div></div>`;
  const ecran = figureDe([f.ecran], f.ecran.fichier);

  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.ecran{display:grid;grid-template-columns:minmax(0,390px) minmax(0,1fr);gap:40px;align-items:start}
.ecran .cadre{border-radius:40px;outline:10px solid var(--papier)}
.choix{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px 20px;margin-bottom:12px}
.expressions{display:grid;grid-template-columns:repeat(4,minmax(0,140px));gap:14px 18px;margin-bottom:14px}
.motifs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px 20px}
.choix .cadre,.expressions .cadre,.motifs .cadre,.tirage .cadre{outline:0;border-radius:0}
.hasard{display:grid;grid-template-columns:minmax(0,220px) minmax(0,260px);gap:28px;align-items:center}
.bouton{all:unset;display:block;cursor:pointer;border-radius:8px}
.bouton:focus-visible{outline:2px solid var(--miel);outline-offset:4px}
.bouton svg{display:block;width:100%;height:auto}
.tirage[hidden]{display:none}
.listes{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:32px}
ol{margin:0;padding-left:2.4em;color:var(--doux);font-variant-numeric:tabular-nums}
ol li{padding:2px 0;color:var(--encre)}
.albums{columns:2;column-gap:32px}
@media (max-width:760px){.ecran,.listes,.hasard{grid-template-columns:minmax(0,1fr)}.albums{columns:1}.expressions{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
<main ontouchstart="">
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
${section('ecran', S.ecran.titre, '', `<div class="ecran">${figure(ecran)}<div><p class="note">${enXml(S.ecran.texte)}</p></div></div>`)}
${section('choix', S.choix.titre, S.choix.texte, choix)}
${section('expressions', S.expressions.titre, S.expressions.texte, expressions)}
${section('motifs', S.motifs.titre, S.motifs.texte, grille(f.motifs, 'motifs'))}
${section('hasard', S.hasard.titre, S.hasard.texte, hasard)}
${section('exemples', S.exemples.titre, S.exemples.texte, `<div class="rang">${f.exemples.map((e) => figure(e)).join('')}</div>`)}
${section('listes', S.listes.titre, '', listes)}
</main>
<script>
(function () {
  var tirages = document.querySelectorAll('[data-tirage]');
  var touche = document.getElementById('au-hasard');
  var rang = 0;
  if (!touche || tirages.length === 0) return;
  touche.addEventListener('click', function () {
    tirages[rang].hidden = true;
    rang = (rang + 1) % tirages.length;
    tirages[rang].hidden = false;
  });
})();
</script>`;
  return deuxEcritures(page, textes.langue);
}
