/**
 * La page des statistiques, en HTML entier : sa feuille, aux couleurs du site (le vert de la platine, le miel, la crème des
 * papiers), ses polices embarquées (le caractère de titrage pour les titres, le technique pour les chiffres), et son script à la
 * fin. Sans script, elle dit qu'elle compte. Le serveur la sert à son adresse, hors des moteurs de recherche.
 */

import { couleur } from '../../lowpoly/tons';
import type { Textes } from '../../ressources/textes';
import { CARACTERES } from '../../ressources/typo';
import { enXml } from '../../scene/rendu/balisage';

/** Les interlignes de la page, en part du corps : le texte courant, les titres, les petites étiquettes, le pied de page. */
const INTERLIGNE = 1.4;
const INTERLIGNE_DES_TITRES = 1.15;
const INTERLIGNE_SERRE = 1.25;
const INTERLIGNE_DU_PIED = 1.6;

/** Les polices de la page, en base 64, par nom de fichier (les « web », plus légères). */
function facesDesPolices(polices: Readonly<Record<string, string>>): string {
  const caracteres = [CARACTERES.titrage, CARACTERES.technique, CARACTERES.techniqueFort];
  return caracteres
    .map((c) => {
      const donnees = polices[c.web];
      return donnees === undefined
        ? ''
        : `@font-face{font-family:'${c.famille}';font-weight:${c.graisse};font-display:swap;src:url(data:font/woff2;base64,${donnees}) format('woff2')}`;
    })
    .join('');
}

const STYLE = `
:root{color-scheme:dark;--fond:${couleur('vinyle', 0)};--carte:${couleur('laque', 1)};--carte-claire:${couleur('laque', 3)};--encre:${couleur('creme')};--doux:${couleur('alu', 2)};--miel:${couleur('miel')};--kraft:${couleur('kraft')};--rose:${couleur('vieuxRose')};--bleu:${couleur('bleuFane')};--olive:${couleur('olive', 4)};--rouge:${couleur('rougeTomate', 4)};--lilas:${couleur('lilasFume', 4)};--orange:${couleur('orangeBrule', 3)};--petrole:${couleur('bleuPetrole', 4)};--expresso:${couleur('expresso')};--titrage:'${CARACTERES.titrage.famille}',Georgia,serif;--technique:'${CARACTERES.technique.famille}','Arial Narrow',system-ui,sans-serif}
*{box-sizing:border-box}
html{background:var(--fond)}
body{margin:0;background:var(--fond);color:var(--encre);font:500 16px/${INTERLIGNE} var(--technique)}
main{max-width:1180px;margin:0 auto;padding:28px 18px 64px}
.attente,.fermee{padding:64px 0;text-align:center;color:var(--doux);font-size:18px}
.fermee h1{font:400 30px/${INTERLIGNE_DES_TITRES} var(--titrage);color:var(--miel);margin:0 0 10px}
header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 24px;margin-bottom:22px}
header h1{font:400 42px/${INTERLIGNE_DES_TITRES} var(--titrage);color:var(--miel);margin:0}
header p{margin:6px 0 0;color:var(--doux);font-size:15px;letter-spacing:.02em}
.periodes{display:flex;flex-wrap:wrap;gap:6px;background:var(--carte);padding:5px;border-radius:999px}
.periodes button{font:600 14px/1 var(--technique);letter-spacing:.06em;text-transform:uppercase;color:var(--encre);background:none;border:0;border-radius:999px;padding:10px 14px;cursor:pointer}
.periodes button[aria-pressed="true"]{background:var(--encre);color:var(--expresso)}
.periodes button:focus-visible{outline:2px solid var(--miel);outline-offset:2px}
section{margin:32px 0 0}
section>h2{font:400 25px/${INTERLIGNE_DES_TITRES} var(--titrage);color:var(--miel);margin:0 0 12px}
h3{font:600 13px/${INTERLIGNE_SERRE} var(--technique);letter-spacing:.08em;text-transform:uppercase;color:var(--doux);margin:0 0 12px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:12px}
.grille.large{grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
.tuile,.carte{background:var(--carte);border-radius:16px;padding:16px 16px 14px;min-width:0}
.tuile .nombre{font:600 38px/1 var(--technique);font-variant-numeric:tabular-nums;color:var(--encre)}
.tuile .libelle{margin-top:8px;font:600 13px/${INTERLIGNE_SERRE} var(--technique);letter-spacing:.07em;text-transform:uppercase;color:var(--doux)}
.tuile .detail{margin-top:6px;font-size:14px;color:var(--kraft)}
.evolution{display:inline-block;margin-top:8px;font:600 13px/1 var(--technique);padding:4px 8px;border-radius:999px;background:var(--carte-claire)}
.evolution.hausse{color:var(--olive)}
.evolution.baisse{color:var(--rouge)}
.evolution .avant{font-weight:500;color:var(--doux);margin-left:4px}
.tuile.miel{background:var(--miel)}
.tuile.miel .nombre,.tuile.miel .libelle,.tuile.miel .detail{color:var(--expresso)}
.courbe svg{display:block;width:100%;height:auto;overflow:visible}
.courbe .total{font:600 30px/1 var(--technique);font-variant-numeric:tabular-nums;margin-bottom:12px}
.courbe .total small{font-size:14px;color:var(--doux);margin-left:6px;letter-spacing:.04em}
svg text{font:500 11px var(--technique);fill:var(--doux)}
.barres{display:grid;gap:8px}
.barre{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;align-items:center;gap:10px;font-size:15px}
.barre .nom{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.barre .jauge{height:10px;border-radius:999px;background:var(--carte-claire);overflow:hidden}
.barre .jauge span{display:block;height:100%;border-radius:999px;background:var(--miel)}
.barre .valeur{font-variant-numeric:tabular-nums;min-width:4em;text-align:right}
.barre .valeur small{color:var(--doux);margin-left:6px}
table{width:100%;border-collapse:collapse;font-size:15px}
th{font:600 12px/${INTERLIGNE_SERRE} var(--technique);letter-spacing:.07em;text-transform:uppercase;color:var(--doux);text-align:right;padding:0 0 8px 12px;white-space:nowrap}
th:first-child,td:first-child{text-align:left;padding-left:0}
td{padding:7px 0 7px 12px;border-top:1px solid var(--carte-claire);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td:first-child{max-width:0;width:100%;overflow:hidden;text-overflow:ellipsis}
td .second{color:var(--doux)}
.empile{display:flex;height:16px;border-radius:999px;overflow:hidden;background:var(--carte-claire)}
.empile span{display:block;height:100%}
.legende{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:12px;font-size:14px}
.legende i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.rooms{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:6px}
.rooms li{background:var(--carte);border-radius:12px;padding:10px 14px;font-size:15px}
.rooms li b{color:var(--miel);font-weight:600}
.vide{color:var(--doux);font-size:15px;margin:6px 0 0}
footer{margin-top:40px;color:var(--doux);font-size:14px;line-height:${INTERLIGNE_DU_PIED}}
@media (max-width:560px){header h1{font-size:34px}.tuile .nombre{font-size:32px}.barre{grid-template-columns:minmax(80px,42%) 1fr auto}}
`;

/** La page, en HTML entier : son script à la fin, avec ses textes ; ses polices dans sa feuille. */
export function pageDesStatistiques(textes: Textes, script: string, polices: Readonly<Record<string, string>>): string {
  const T = textes.statistiques;
  return `<!doctype html>
<html lang="${textes.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="${couleur('vinyle', 0)}">
<title>${enXml(T.titre)} · ${enXml(textes.logo.nom)}</title>
<style>${facesDesPolices(polices)}${STYLE}</style>
</head>
<body>
<main data-statistiques><p class="attente">${enXml(T.chargement)}</p></main>
<script>${script}</script>
</body>
</html>
`;
}
