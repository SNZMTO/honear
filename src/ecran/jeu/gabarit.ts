/**
 * La page du jeu, en ligne : un document qui tient tout entier dans le téléphone. Le cadre du téléphone prend la hauteur de l'écran
 * (sur un téléphone, tout l'écran) ; sous lui, le noir du vinyle. Le script est posé à la fin, avec ses polices et ses textes. Sans
 * script, la page dit ce qui lui manque, dans la voix du site.
 */

import { couleur } from '../../lowpoly/tons';
import { CADRAGES } from '../../ressources/cadrages';
import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';

const { largeur, hauteur } = CADRAGES.telephone;
/** L'interligne des quelques phrases que la page écrit elle-même, en part du corps. */
const INTERLIGNE = 1.45;

/** La feuille de la page : le cadre du téléphone, ses zones à toucher (rien de dessiné), le champ où tape le clavier (rien de visible). */
const STYLE = `
:root{color-scheme:dark;--fond:${couleur('vinyle', 1)};--encre:${couleur('creme')};--doux:${couleur('creme', 1)};--miel:${couleur('miel')}}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--fond);color:var(--encre);font:16px/${INTERLIGNE} system-ui,sans-serif;display:flex;align-items:flex-start;justify-content:center;overflow:hidden}
.telephone{position:relative;width:min(100vw,calc(100svh * ${largeur} / ${hauteur}));aspect-ratio:${largeur}/${hauteur};max-height:100svh;overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.telephone .attente,.telephone .manque{margin:0;padding:24px 18px;color:var(--doux);max-width:32ch}
.telephone .zone{background:transparent;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.telephone .zone:focus-visible,.telephone .champ:focus-visible{outline:2px solid var(--miel);outline-offset:2px;border-radius:4px}
.telephone .champ{background:transparent;border:0;padding:0 12px;margin:0;color:transparent;caret-color:transparent;font:16px/1 system-ui,sans-serif;outline:none;-webkit-user-select:text;user-select:text}
.telephone .champ::selection{background:transparent}
`;

/** Une page en HTML entier : le serveur la sert telle quelle, à l'adresse du site et à celle de chaque room. */
export function pageDuJeu(textes: Textes, script: string): string {
  const N = textes.navigateur;
  return `<!doctype html>
<html lang="${textes.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${couleur('vinyle', 1)}">
<title>${enXml(textes.logo.nom)}</title>
<style>${STYLE}</style>
</head>
<body>
<main class="telephone" data-telephone role="application" aria-label="${enXml(textes.logo.nom)}"><p class="attente">${enXml(N.enAttendant)}</p></main>
<noscript><p class="manque">${enXml(N.sansScript.titre)} ${enXml(N.sansScript.conseil)}</p></noscript>
<script>${script}</script>
</body>
</html>
`;
}
