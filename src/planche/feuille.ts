/**
 * Ce que les pages des planches ont en commun : leurs polices embarquées, leurs couleurs (le soir, sur le vinyle), leur mise en page,
 * leurs figures, et les touches qui se pressent. Chaque planche y ajoute ce qui lui est propre.
 */

import { couleur } from '../lowpoly/tons';
import { TOUCHES } from '../ressources/mouvement';
import { APPROCHES, CARACTERES, CORPS, ROLES_DE_TEXTE } from '../ressources/typo';
import { enXml } from '../scene/rendu/balisage';

const ms = (secondes: number): string => `${Math.round(secondes * 1000)}ms`;

/** Une image d'une planche, déjà écrite en SVG, sa légende, et la largeur qu'elle prend au plus. */
export interface FigureDePlanche {
  readonly fichier: string;
  readonly svg: string;
  readonly legende: string;
  readonly largeur: number;
  /** Sa hauteur, quand la page doit lui réserver sa place avant de l'avoir chargée. */
  readonly hauteur?: number;
}

/** Une figure : son SVG dans un cadre, sa légende dessous. */
export const figure = (f: FigureDePlanche, classe = ''): string =>
  `<figure class="image ${classe}" style="max-width:${f.largeur}px"><div class="cadre">${f.svg}</div><figcaption>${enXml(f.legende)}</figcaption></figure>`;

/** Retrouve une figure par son fichier, ou dit laquelle manque. */
export function figureDe(figures: readonly FigureDePlanche[], fichier: string): FigureDePlanche {
  const trouvee = figures.find((f) => f.fichier === fichier);
  if (trouvee === undefined) throw new Error(`La planche n'a pas d'image « ${fichier} ».`);
  return trouvee;
}

/**
 * La feuille de style commune.
 * @param polices les polices woff2 de la page, en base 64, par nom de fichier.
 */
export function feuilleDeBase(polices: Readonly<Record<string, string>>): string {
  const fontes = ROLES_DE_TEXTE.map((role) => {
    const c = CARACTERES[role];
    return `@font-face{font-family:'${c.famille}';font-weight:${c.graisse};font-display:block;src:url(data:font/woff2;base64,${polices[c.web] ?? ''}) format('woff2')}`;
  }).join('');
  const { titrage, technique, techniqueFort } = CARACTERES;
  return `${fontes}
:root{color-scheme:dark;--fond:${couleur('vinyle', 1)};--papier:${couleur('vinyle', 2)};--encre:${couleur('creme')};--doux:${couleur('creme', 1)};--miel:${couleur('miel')};--trait:${couleur('vinyle', 3)}}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--encre);font:${technique.graisse} ${CORPS.mention}px/1.45 '${technique.famille}',sans-serif;letter-spacing:${APPROCHES.technique}em}
main{max-width:1440px;margin:0 auto;padding:40px 16px 80px}
header h1{font:${titrage.graisse} ${CORPS.enseigne}px/1.1 '${titrage.famille}',serif;letter-spacing:0;margin:0 0 6px;color:var(--miel);text-wrap:balance}
header p{margin:0 0 40px;text-transform:uppercase;color:var(--doux)}
section{margin:0 0 64px}
h2{font:${titrage.graisse} ${CORPS.grandTitre}px/1.15 '${titrage.famille}',serif;letter-spacing:0;margin:0 0 8px;color:var(--miel);text-wrap:balance}
h3{font:${techniqueFort.graisse} ${CORPS.gravure}px/1.3 '${techniqueFort.famille}',sans-serif;text-transform:uppercase;margin:24px 0 10px;color:var(--doux)}
.note{max-width:68ch;margin:0 0 22px;color:var(--doux)}
.rang{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
figure{margin:0}
.image{flex:1 1 auto;min-width:0}
.cadre{overflow:hidden;border-radius:6px;outline:1px solid var(--trait)}
.cadre svg{display:block;width:100%;height:auto}
figcaption{margin-top:10px;text-transform:uppercase;font-size:${CORPS.gravure}px;color:var(--doux);max-width:60ch}
.touches [data-calque$="/capuchon"]{transition:transform ${ms(TOUCHES.remonte)} linear}
.touches [data-calque^="touche-"]{cursor:pointer;-webkit-tap-highlight-color:transparent}
.touches [data-calque^="touche-"]:active [data-calque$="/capuchon"]{transform:translateY(${TOUCHES.course}px);transition-duration:${ms(TOUCHES.enfonce)}}
.touches [data-calque^="touche-"]:active [data-calque$="/ombre-repos"]{opacity:0}
.touches [data-calque^="touche-"]:active [data-calque$="/ombre-enfoncee"]{opacity:1}
@media (prefers-reduced-motion:reduce){.touches [data-calque$="/capuchon"]{transition:none}}
@media (max-width:640px){main{padding-top:24px}}`;
}

/** La page, en deux écritures : celle qu'on publie, sans enveloppe (l'outil de publication la pose dans la sienne), et celle qu'on ouvre ici. */
export const deuxEcritures = (page: string, langue: string): { readonly aPublier: string; readonly locale: string } => ({
  aPublier: page,
  locale: `<!doctype html><html lang="${langue}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`,
});
