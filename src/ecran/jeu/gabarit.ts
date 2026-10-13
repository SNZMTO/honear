/**
 * La page du jeu, en ligne : un document qui tient tout entier dans le téléphone. Le cadre du téléphone prend la fenêtre entière,
 * bord à bord ; le regard en prend la proportion, jusqu'au meuble entier sur un ordinateur. Posé sur l'écran d'accueil d'un
 * téléphone, le jeu s'ouvre en plein écran, comme une application (son manifeste et son icône, le serveur les sert).
 * En bas, les liens des pages légales : à l'accueil et au compte sur un téléphone (le script le dit), toujours sur un ordinateur. Le script est posé à la fin, avec ses polices et ses textes. Sans
 * script, la page dit ce qui lui manque, dans la voix du site.
 */

import { couleur } from '../../lowpoly/tons';
import { TELEPHONE } from '../../ressources/ecran';
import { APPLICATION, META_DE_LA_VERSION, PAGES_LEGALES } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';

/** L'interligne des quelques phrases que la page écrit elle-même, en part du corps. */
const INTERLIGNE = 1.45;

/**
 * La feuille de la page : le cadre du téléphone, ses zones à toucher (rien de dessiné), le champ où tape le clavier (rien de visible).
 * Le fond de la page est le noyer de la table : dans Safari, la bande de la barre d'état n'est pas à la page, et Safari la peint de
 * ce fond. À l'accueil et au compte d'un téléphone, la page a un pied, sous le jeu : on la fait glisser pour y trouver le tutoriel
 * et les pages légales ; Safari montre déjà son haut sous sa barre d'outils. Sur un grand écran, ces liens flottent en bas à droite.
 */
const STYLE = `
:root{color-scheme:dark;--fond:${couleur('vinyle', 1)};--encre:${couleur('creme')};--doux:${couleur('creme', 1)};--miel:${couleur('miel')};--expresso:${couleur('expresso')};--laque:${couleur('laque')};--table:${couleur('noyer')}}
*{box-sizing:border-box}
html,body{height:100%;overscroll-behavior:none}
body{margin:0;background:var(--table);color:var(--encre);font:16px/${INTERLIGNE} system-ui,sans-serif;overflow:hidden}
.telephone{position:fixed;left:0;top:0;width:100vw;height:100vh;height:100lvh;overflow:hidden;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.bords{position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.telephone .attente,.telephone .manque{margin:0;padding:24px 18px;color:var(--doux);max-width:32ch}
.telephone .zone{background:transparent;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.telephone .zone:focus-visible{outline:2px solid var(--miel);outline-offset:2px;border-radius:4px}
.telephone .champ{background:transparent;border:0;padding:0 12px;margin:0;color:transparent;caret-color:transparent;font:16px/1 system-ui,sans-serif;outline:none!important;-webkit-user-select:text;user-select:text}
.telephone .champ::selection{background:transparent}
.legal{position:fixed;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));display:none;align-items:center;gap:8px;padding:3px 8px;background:var(--miel);border:2px solid var(--laque);border-radius:9px;font:600 10px/1 system-ui,sans-serif;z-index:1}
.legal a,.legal button{color:var(--expresso);text-decoration:none;padding:5px 1px;background:none;border:0;font:inherit;cursor:pointer}
.legal a:hover,.legal button:hover{text-decoration:underline}
body.grand .legal{display:flex}
.espace{display:none}
body.pied:not(.grand){overflow:visible}
body.pied:not(.grand) .espace{display:block;height:100vh;height:100svh}
body.pied:not(.grand) .legal{display:flex;position:relative;right:auto;bottom:auto;flex-wrap:wrap;justify-content:center;gap:10px;padding:16px 16px calc(24px + env(safe-area-inset-bottom));background:var(--table);border:0;border-top:2px solid var(--laque);border-radius:0;font-size:12px}
body.pied:not(.grand) .legal a,body.pied:not(.grand) .legal button{padding:9px 12px;background:var(--miel);border:2px solid var(--laque);border-radius:9px}
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

/**
 * Une page en HTML entier : le serveur la sert telle quelle, à l'adresse du site et à celle de chaque room.
 * @param version celle de la page (l'empreinte de son contenu), qu'elle donne en se branchant : une page restée ouverte quand le
 * site a changé se recharge d'elle-même.
 */
export function pageDuJeu(textes: Textes, script: string, version = ''): string {
  const N = textes.navigateur;
  return `<!doctype html>
<html lang="${textes.langue}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual">
<meta name="theme-color" content="${couleur('noyer')}">${version !== '' ? `\n<meta name="${META_DE_LA_VERSION}" content="${enXml(version)}">` : ''}
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${enXml(textes.logo.nom)}">
<link rel="manifest" href="${APPLICATION.manifeste}">
<link rel="icon" href="${APPLICATION.icone}" type="image/svg+xml">
<title>${enXml(textes.logo.nom)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="bords" aria-hidden="true"></div>
<main class="telephone" data-telephone role="application" aria-label="${enXml(textes.logo.nom)}"><p class="attente">${enXml(N.enAttendant)}</p></main>
<div class="espace" aria-hidden="true"></div>
<nav class="legal"><button type="button" data-tuto>${enXml(textes.tuto.lien)}</button><a href="${PAGES_LEGALES.confidentialite}">${enXml(textes.legal.liens.confidentialite)}</a><a href="${PAGES_LEGALES.mentions}">${enXml(textes.legal.liens.mentions)}</a></nav>
<div class="tuto" role="dialog" aria-modal="true" aria-labelledby="tuto-titre" hidden><div class="carte"><div class="points"></div><h2 id="tuto-titre"></h2><p></p><div class="touches"><button type="button" class="passer"></button><span><button type="button" class="precedent"></button> <button type="button" class="suivant"></button></span></div></div></div>
<noscript><p class="manque">${enXml(N.sansScript.titre)} ${enXml(N.sansScript.conseil)}</p></noscript>
<script>${script}</script>
</body>
</html>
`;
}
