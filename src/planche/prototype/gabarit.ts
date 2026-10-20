/**
 * La page du prototype : le téléphone, à la taille d'un téléphone (sur un téléphone, tout l'écran), et à côté ce qu'il faut savoir
 * pour y jouer, avec le réglage du prototype. Le script est posé à la fin, avec ses polices. Sans script, la page dit ce qu'elle
 * aurait montré.
 */

import { CADRAGES } from '../../ressources/cadrages';
import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase } from '../feuille';
import { LEGENDES_DU_PROTOTYPE as L } from './legendes.fr';

const { largeur, hauteur } = CADRAGES.telephone;

const STYLE = `
.etabli{display:flex;flex-wrap:wrap;gap:24px 48px;align-items:flex-start}
.telephone{position:relative;flex:0 0 auto;width:min(${largeur}px,100%,calc((100svh - 32px) * ${largeur} / ${hauteur}));aspect-ratio:${largeur}/${hauteur};overflow:hidden;border-radius:18px 14px 20px 16px;outline:1px solid var(--trait);background:var(--papier);touch-action:manipulation;-webkit-user-select:none;user-select:none}
.telephone .attente{margin:0;padding:14px 16px;color:var(--doux)}
.telephone .zone{background:transparent;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.telephone .zone:focus-visible{outline:2px solid var(--miel);outline-offset:2px;border-radius:4px}
.pupitre{flex:1 1 320px;min-width:0;max-width:560px}
.commandes{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 12px;align-items:center}
.commandes button{font:inherit;text-transform:uppercase;color:var(--encre);background:var(--papier);border:1px solid var(--trait);border-radius:4px;padding:6px 12px;cursor:pointer;min-height:40px}
.commandes button[aria-pressed="true"]{background:var(--miel);color:var(--fond);border-color:var(--miel)}
.commandes button:focus-visible{outline:2px solid var(--miel);outline-offset:2px}
.ecran{margin:0 0 20px;color:var(--miel);text-transform:uppercase;min-height:1.45em}
@media (max-width:640px){main{padding:0 0 48px}.etabli{gap:20px}.telephone{width:min(100%,calc(100svh * ${largeur} / ${hauteur}));margin:0 auto;border-radius:0;outline:0}.pupitre{padding:0 16px}header{order:1;padding:0 16px}}
`;

/**
 * @param polices les polices woff2 de la page, en base 64, par nom de fichier.
 * @param script le script de la page, assemblé, avec ses polices à tracer.
 */
export function pageDuPrototype(
  textes: Textes,
  polices: Readonly<Record<string, string>>,
  script: string,
): { readonly aPublier: string; readonly locale: string } {
  const R = L.reglage;
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
${STYLE}
</style>
<main id="prototype">
<div class="etabli">
<div class="telephone" data-telephone role="application" aria-label="${enXml(L.telephone)}"><p class="attente">${enXml(textes.navigateur.enAttendant)}</p></div>
<div class="pupitre">
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
<p class="ecran" data-ecran aria-live="polite"></p>
<div class="commandes" role="group" aria-label="${enXml(R.groupe)}">
<button type="button" id="mode-libre" data-mode="libre" aria-pressed="true">${enXml(R.libre)}</button>
<button type="button" id="mode-quatre-choix" data-mode="quatreChoix" aria-pressed="false">${enXml(R.quatreChoix)}</button>
<button type="button" id="mode-tournoi" data-mode="tournoi" aria-pressed="false">${enXml(R.tournoi)}</button>
<button type="button" id="recommencer" data-recommencer>${enXml(R.recommencer)}</button>
</div>
<p class="note">${enXml(L.intro)}</p>
<p class="note">${enXml(L.clavier)}</p>
<p class="note">${enXml(L.sansSon)} ${enXml(L.court)}</p>
<p class="note">${enXml(L.frontieres)}</p>
</div>
</div>
<noscript><p class="note">${enXml(textes.navigateur.sansScript.titre)} ${enXml(textes.navigateur.sansScript.conseil)}</p></noscript>
</main>
<script>${script}</script>`;
  return deuxEcritures(page, textes.langue);
}
