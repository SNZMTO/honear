/**
 * Les pages légales du jeu en ligne : la confidentialité et les mentions légales. Deux documents HTML entiers, sans script, aux
 * couleurs du site, que le serveur sert à leur adresse. « {site} » et « {contact} » y restent écrits tels quels : c'est le serveur
 * qui les remplit, avec ce qu'il sait de lui-même.
 */

import { couleur } from '../../lowpoly/tons';
import { PAGES_LEGALES } from '../../ressources/reglages';
import type { PageLegale, Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';

export type CleDePageLegale = keyof typeof PAGES_LEGALES;

/** L'interligne et la largeur du texte, en signes : de quoi lire sans fatigue, sur un téléphone comme sur un écran large. */
const INTERLIGNE = 1.55;
const MESURE = 64;

const STYLE = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:${couleur('vinyle', 1)};color:${couleur('creme')};font:17px/${INTERLIGNE} system-ui,sans-serif}
main{max-width:${MESURE}ch;margin:0 auto;padding:32px 20px 56px}
h1{font:700 32px/37px Georgia,serif;color:${couleur('miel')};margin:8px 0 4px}
h2{font:700 19px/25px Georgia,serif;color:${couleur('miel')};margin:28px 0 6px}
p{margin:0 0 10px}
.date{color:${couleur('creme', 1)};font-size:15px;margin-bottom:20px}
a{color:${couleur('miel')}}
nav{display:flex;gap:16px;flex-wrap:wrap;font-size:16px}
`;

/** Une page légale, en HTML entier. */
export function pageLegale(textes: Textes, cle: CleDePageLegale): string {
  const L = textes.legal;
  const page: PageLegale = L[cle];
  const autre: CleDePageLegale = cle === 'confidentialite' ? 'mentions' : 'confidentialite';
  const parties = page.parties
    .map((p) => `<h2>${enXml(p.titre)}</h2>${p.paragraphes.map((x) => `<p>${enXml(x)}</p>`).join('')}`)
    .join('\n');
  return `<!doctype html>
<html lang="${textes.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="${couleur('vinyle', 1)}">
<title>${enXml(page.titre)} · ${enXml(textes.logo.nom)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<nav><a href="/">${enXml(L.retour)}</a><a href="${PAGES_LEGALES[autre]}">${enXml(L.liens[autre])}</a></nav>
<h1>${enXml(page.titre)}</h1>
<p class="date">${enXml(page.date)}</p>
${parties}
</main>
</body>
</html>
`;
}
