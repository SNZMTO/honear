/**
 * La page du jeu, en ligne : un document qui tient tout entier dans le téléphone. Le cadre du téléphone prend la hauteur de l'écran
 * (sur un téléphone, tout l'écran) ; sous lui, le noir du vinyle. Sur un ordinateur, le script l'élargit au meuble entier, au milieu.
 * En bas, les liens des pages légales : à l'accueil et au compte sur un téléphone (le script le dit), toujours sur un ordinateur. Le script est posé à la fin, avec ses polices et ses textes. Sans
 * script, la page dit ce qui lui manque, dans la voix du site.
 */

import { couleur } from '../../lowpoly/tons';
import { CADRAGES } from '../../ressources/cadrages';
import { TELEPHONE } from '../../ressources/ecran';
import { PAGES_LEGALES } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';

const { largeur, hauteur } = CADRAGES.telephone;
/** L'interligne des quelques phrases que la page écrit elle-même, en part du corps. */
const INTERLIGNE = 1.45;

/** La feuille de la page : le cadre du téléphone, ses zones à toucher (rien de dessiné), le champ où tape le clavier (rien de visible). */
const STYLE = `
:root{color-scheme:dark;--fond:${couleur('vinyle', 1)};--encre:${couleur('creme')};--doux:${couleur('creme', 1)};--miel:${couleur('miel')};--expresso:${couleur('expresso')}}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--fond);color:var(--encre);font:16px/${INTERLIGNE} system-ui,sans-serif;display:flex;align-items:flex-start;justify-content:center;overflow:hidden}
body.grand{align-items:center}
.telephone{position:relative;width:min(100vw,calc(100svh * ${largeur} / ${hauteur}));aspect-ratio:${largeur}/${hauteur};max-height:100svh;overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.telephone .attente,.telephone .manque{margin:0;padding:24px 18px;color:var(--doux);max-width:32ch}
.telephone .zone{background:transparent;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.telephone .zone:focus-visible,.telephone .champ:focus-visible{outline:2px solid var(--miel);outline-offset:2px;border-radius:4px}
.telephone .zone.pouls::after{content:"";position:absolute;inset:18%;border-radius:10px;background:var(--encre);opacity:0;pointer-events:none;animation:pouls ${TELEPHONE.pouls.duree}s ease-in-out infinite}
@keyframes pouls{50%{opacity:${TELEPHONE.pouls.eclat}}}
@media (prefers-reduced-motion:reduce){.telephone .zone.pouls::after{animation:none}}
.telephone .champ{background:transparent;border:0;padding:0 12px;margin:0;color:transparent;caret-color:transparent;font:16px/1 system-ui,sans-serif;outline:none;-webkit-user-select:text;user-select:text}
.telephone .champ::selection{background:transparent}
.legal{position:fixed;left:0;right:0;bottom:max(4px,env(safe-area-inset-bottom));display:none;justify-content:center;gap:14px;font-size:12px;line-height:1;pointer-events:none}
.legal a{pointer-events:auto;color:var(--doux);text-decoration:underline;padding:6px 2px}
body.pied .legal,body.grand .legal{display:flex}
.legal button{pointer-events:auto;background:none;border:0;color:var(--doux);font:inherit;text-decoration:underline;padding:6px 2px;cursor:pointer}
.tuto{position:fixed;inset:0;display:grid;place-items:center;padding:16px;z-index:2}
.tuto[hidden]{display:none}
.tuto::before{content:"";position:absolute;inset:0;background:var(--fond);opacity:${TELEPHONE.tuto.voile}}
.tuto .carte{position:relative;max-width:26rem;width:100%;background:var(--encre);color:var(--expresso);border-radius:14px;padding:22px 20px 18px}
.tuto h2{margin:0 0 10px;font:700 22px/${INTERLIGNE} Georgia,serif}
.tuto p{margin:0 0 18px}
.tuto .points{display:flex;gap:6px;margin-bottom:14px}
.tuto .points span{width:8px;height:8px;border-radius:50%;background:var(--doux)}
.tuto .points span.ici{background:var(--miel)}
.tuto .touches{display:flex;gap:10px;justify-content:space-between;align-items:center}
.tuto button{font:600 16px/1 system-ui,sans-serif;border-radius:10px;padding:12px 16px;cursor:pointer;border:0}
.tuto .passer{background:none;color:var(--expresso);text-decoration:underline;padding:12px 4px}
.tuto .suivant{background:var(--miel);color:var(--expresso)}
.tuto .precedent{background:var(--doux);color:var(--expresso)}
.tuto button:focus-visible{outline:2px solid var(--expresso);outline-offset:2px}
`;

/** Une page en HTML entier : le serveur la sert telle quelle, à l'adresse du site et à celle de chaque room. */
export function pageDuJeu(textes: Textes, script: string): string {
  const N = textes.navigateur;
  return `<!doctype html>
<html lang="${textes.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual">
<meta name="theme-color" content="${couleur('vinyle', 1)}">
<title>${enXml(textes.logo.nom)}</title>
<style>${STYLE}</style>
</head>
<body>
<main class="telephone" data-telephone role="application" aria-label="${enXml(textes.logo.nom)}"><p class="attente">${enXml(N.enAttendant)}</p></main>
<nav class="legal"><button type="button" data-tuto>${enXml(textes.tuto.lien)}</button><a href="${PAGES_LEGALES.confidentialite}">${enXml(textes.legal.liens.confidentialite)}</a><a href="${PAGES_LEGALES.mentions}">${enXml(textes.legal.liens.mentions)}</a></nav>
<div class="tuto" role="dialog" aria-modal="true" aria-labelledby="tuto-titre" hidden><div class="carte"><div class="points"></div><h2 id="tuto-titre"></h2><p></p><div class="touches"><button type="button" class="passer"></button><span><button type="button" class="precedent"></button> <button type="button" class="suivant"></button></span></div></div></div>
<noscript><p class="manque">${enXml(N.sansScript.titre)} ${enXml(N.sansScript.conseil)}</p></noscript>
<script>${script}</script>
</body>
</html>
`;
}
