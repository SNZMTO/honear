/**
 * Les mesures, telles que le gabarit les écrit : celles que la page prend sur le vif, que son script tiendra à jour,
 * puis les relevés du banc, une table par ralenti, et ce qu'il faut en lire.
 */

import { PHASES_DE_PISTE } from '../../../regles/piste';
import { remplir } from '../../../scene/phrases';
import { ecrire } from '../../nombres.fr';
import { ANCRES, MESURES_AFFICHEES } from '../ancres';
import { FLUIDITE, type Banc, type Fluidite, type ReleveDeBanc } from '../banc';
import { lectureDesBancs } from '../lecture';
import { LEGENDES } from '../legendes.fr';
import type { Plume } from './plume';

const M = LEGENDES.mesures;
const B = M.banc;

const surLeVif = (h: Plume): string =>
  `<div class="groupe-de-mesures sur-le-vif"><p class="chapeau">${h(M.surLeVif)}</p>
<dl class="releve">${MESURES_AFFICHEES.map((nom) => `<dt>${h(M.surLeVifDe[nom])}</dt><dd ${ANCRES.mesure}="${nom}">${h(M.rienEncore)}</dd>`).join('')}</dl></div>`;

/** Les colonnes d'un banc, dans l'ordre, et ce que chacune dit d'un relevé. */
const COLONNES: readonly { readonly nom: string; readonly dire: (releve: ReleveDeBanc) => string }[] = [
  { nom: B.colonnes.montage, dire: (r) => remplir(M.ms, { valeur: ecrire(r.montage) }) },
  { nom: B.colonnes.fil, dire: (r) => remplir(M.ms, { valeur: ecrire(r.fil, 1) }) },
  { nom: B.colonnes.script, dire: (r) => remplir(M.ms, { valeur: ecrire(r.script, 1) }) },
  ...PHASES_DE_PISTE.map((phase) => ({ nom: B.colonnes[phase], dire: (r: ReleveDeBanc) => fluidite(r[phase]) })),
];

const fluidite = (f: Fluidite): string => remplir(B.fluidite, { mediane: ecrire(f.mediane, 1), longues: ecrire(f.longues, 1) });

/** Les relevés d'un banc : une table, que la feuille de style range en fiches tant qu'elle ne tient pas en colonnes. */
function tableDUnBanc(h: Plume, banc: Banc): string {
  const lignes = banc.releves.map(
    (r) =>
      `<tr role="row"><th role="rowheader" scope="row">${h(B.scenes[r.scene])}</th>${COLONNES.map(({ nom, dire }) => `<td role="cell" data-colonne="${h(nom)}">${h(dire(r))}</td>`).join('')}</tr>`,
  );
  const entetes = [B.colonnes.scene, ...COLONNES.map(({ nom }) => nom)].map((nom) => `<th role="columnheader" scope="col">${h(nom)}</th>`);
  return `<table role="table"><caption>${h(remplir(B.ralenti, { ralenti: ecrire(banc.ralenti) }))}</caption>
<thead><tr role="row">${entetes.join('')}</tr></thead>
<tbody>
${lignes.join('\n')}
</tbody></table>`;
}

/** Les bancs ont tous la même définition d'écran : on la dit une fois, au chapeau. */
function chapeauDesBancs(bancs: readonly Banc[]): string {
  const definitions = [...new Set(bancs.map((banc) => banc.definition))];
  const [definition] = definitions;
  if (definition === undefined || definitions.length > 1) throw new Error('Les bancs n’ont pas tous été mesurés à la même définition d’écran.');
  return remplir(B.chapeau, {
    definition: ecrire(definition),
    enRetard: ecrire(FLUIDITE.enRetard),
    cadence: ecrire(FLUIDITE.cadence),
    intervalle: remplir(M.ms, { valeur: ecrire(1000 / FLUIDITE.cadence, 1) }),
  });
}

function auBanc(h: Plume, bancs: readonly Banc[]): string {
  if (bancs.length === 0) return '';
  return `<div class="groupe-de-mesures"><h3>${h(B.titre)}</h3>
<p class="chapeau">${h(chapeauDesBancs(bancs))}</p>
${bancs.map((banc) => tableDUnBanc(h, banc)).join('\n')}
${lectureDesBancs(bancs)
  .map((phrase) => `<p class="note">${h(phrase)}</p>`)
  .join('\n')}</div>`;
}

export const sectionDesMesures = (h: Plume, bancs: readonly Banc[]): string =>
  `<section class="mesures">
<h2>${h(M.titre)}</h2>
${surLeVif(h)}
${auBanc(h, bancs)}
</section>`;
