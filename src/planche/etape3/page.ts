/**
 * La page de la planche du système visuel : une seule page, à lire de haut en bas. Les images y sont en SVG, telles que
 * le moteur les écrit ; la palette, les encres et les caractères sont lus dans les ressources, jamais recopiés.
 * Les touches de leur section se pressent : c'est du CSS, réglé sur la table des touches. Elle n'a pas de script.
 */

import { contraste } from '../../lowpoly/couleur';
import { couleur, TON_DE_BASE, type IndiceDeTon } from '../../lowpoly/tons';
import { PALETTE, type NomDeTeinte } from '../../ressources/palette';
import { APPROCHES, CARACTERES, CONTRASTES, CORPS, ECHELONS } from '../../ressources/typo';
import { encreLisibleSur } from '../../scene/encre';
import { enXml } from '../../scene/rendu/balisage';
import { deuxEcritures, feuilleDeBase, figure, figureDe, type FigureDePlanche } from '../feuille';
import { ecrire } from '../nombres.fr';
import { LEGENDES_DU_SYSTEME as L } from './legendes.fr';

const TONS: readonly IndiceDeTon[] = [0, 1, 2, 3, 4];

/** Une image de la planche, déjà écrite en SVG, et sa légende. */
export type FigureDuSysteme = FigureDePlanche;

function palette(): string {
  const teintes = Object.keys(PALETTE) as NomDeTeinte[];
  return `<div class="palette">${teintes
    .map(
      (teinte) =>
        `<figure class="teinte"><div class="tons">${TONS.map(
          (ton) =>
            `<span style="background:${couleur(teinte, ton)};color:${couleur(encreLisibleSur(teinte))}"${ton === TON_DE_BASE ? ' class="base"' : ''}>${ton}</span>`,
        ).join('')}</div><figcaption><b>${teinte}</b> ${PALETTE[teinte]}</figcaption></figure>`,
    )
    .join('')}</div>`;
}

function encres(): string {
  const C = L.sections.contrastes;
  const lignes = (Object.keys(PALETTE) as NomDeTeinte[]).map((teinte) => {
    const encre = encreLisibleSur(teinte);
    const rapport = contraste(couleur(encre), couleur(teinte));
    const pour = rapport >= CONTRASTES.texte ? C.texteCourant : rapport >= CONTRASTES.grandTexte ? C.grandTexte : C.illisible;
    return `<tr><td><i style="background:${couleur(teinte)}"></i>${teinte}</td><td style="background:${couleur(teinte)};color:${couleur(encre)}">${encre}</td><td class="nombre">${ecrire(rapport, 2)}</td><td>${pour}</td></tr>`;
  });
  return `<table class="encres"><thead><tr>${C.colonnes.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${lignes.join('')}</tbody></table>`;
}

function caracteres(): string {
  const T = L.sections.typo;
  const titrage = T.echantillons.titrage.map((t) => `<p class="titrage">${enXml(t)}</p>`).join('');
  const technique = T.echantillons.technique.map((t) => `<p class="technique">${enXml(t)}</p>`).join('');
  const echelle = ECHELONS.map(
    (echelon) =>
      `<div class="echelon"><span class="mesure">${echelon} · ${ecrire(CORPS[echelon], 1)} px</span><span class="titrage" style="font-size:${CORPS[echelon]}px">${enXml(T.echantillons.titrage[1] ?? '')}</span><span class="technique" style="font-size:${CORPS[echelon]}px">${enXml(T.echantillons.technique[0] ?? '')}</span></div>`,
  ).join('');
  return `<div class="specimens"><div><h3>${T.titrage}</h3>${titrage}</div><div><h3>${T.technique}</h3>${technique}</div></div><h3>${T.echelle}</h3><div class="echelle">${echelle}</div>`;
}

/**
 * La page, en deux écritures : celle qu'on publie, sans enveloppe (l'outil de publication la pose dans la sienne), et celle
 * qu'on ouvre ici, dans la sienne.
 * @param polices les polices woff2 de la page, en base 64, par nom de fichier.
 */
export function pageDuSysteme(
  figures: readonly FigureDuSysteme[],
  polices: Readonly<Record<string, string>>,
  langue: string,
): { readonly aPublier: string; readonly locale: string } {
  const par = (fichier: string): FigureDuSysteme => figureDe(figures, fichier);
  const S = L.sections;
  const section = (cle: keyof typeof S, contenu: string): string => {
    const { titre, texte } = S[cle];
    return `<section id="${cle}"><h2>${enXml(titre)}</h2>${texte !== '' ? `<p class="note">${enXml(texte)}</p>` : ''}${contenu}</section>`;
  };
  const rang = (...fichiers: string[]): string => `<div class="rang">${fichiers.map((f) => figure(par(f))).join('')}</div>`;
  const { titrage, technique, techniqueFort } = CARACTERES;

  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
.palette{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px 22px}
.tons{display:flex;height:54px;border-radius:5px;overflow:hidden}
.tons span{flex:1;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;font-size:${CORPS.gravure}px;font-variant-numeric:tabular-nums}
.tons span.base{flex:1.6}
.teinte figcaption{margin-top:6px;text-transform:none}
.teinte b{font-weight:${techniqueFort.graisse};color:var(--encre)}
table{border-collapse:collapse;width:100%;max-width:720px;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--trait)}
th{font-weight:${techniqueFort.graisse};text-transform:uppercase;font-size:${CORPS.gravure}px;color:var(--doux)}
td i{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:8px;vertical-align:-1px}
td.nombre{text-align:right}
.specimens{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.titrage{font-family:'${titrage.famille}',serif;font-weight:${titrage.graisse};letter-spacing:0;font-size:${CORPS.grandTitre}px;line-height:1.2;margin:0 0 8px}
.technique{font-family:'${technique.famille}',sans-serif;font-weight:${technique.graisse};text-transform:uppercase;letter-spacing:${APPROCHES.technique}em;font-size:${CORPS.titre}px;font-variant-numeric:tabular-nums;margin:0 0 8px}
.echelon{display:grid;grid-template-columns:150px minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--trait);overflow:hidden;white-space:nowrap}
.echelon .titrage,.echelon .technique{margin:0;overflow:hidden;text-overflow:clip}
.mesure{font-size:${CORPS.gravure}px;color:var(--doux);text-transform:uppercase}
@media (max-width:640px){.echelon{grid-template-columns:96px minmax(0,1fr)}.echelon .technique{display:none}}
</style>
<main ontouchstart="">
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
${section('meuble', `<div class="rang">${figure(par('systeme-meuble'))}</div>`)}
${section('palette', palette())}
${section('contrastes', encres())}
${section('typo', caracteres())}
${section('logo', rang('systeme-logo'))}
${section('platine', rang('systeme-platine', 'systeme-bras'))}
${section('ampli', rang('systeme-ampli-eteint', 'systeme-ampli-allume', 'systeme-vumetre'))}
${section('bac', rang('systeme-bac'))}
${section('touches', `<div class="rang">${figure(par('systeme-touches'), 'touches')}</div>`)}
${section('pastilles', rang('systeme-pastilles'))}
${section('pochette', rang('systeme-pochette'))}
</main>`;
  return deuxEcritures(page, langue);
}
