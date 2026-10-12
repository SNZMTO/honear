/**
 * Le mode d'emploi de la façade : chaque touche par son nom, comme il est gravé dessus, puis ce qu'elle fait.
 * C'est aussi ce qu'entend qui s'arrête sur une touche : chacune désigne son entrée.
 */

import { GENRES_DE_VERSO } from '../../../scene/disque/verso';
import { remplir } from '../../../scene/phrases';
import { ecrire } from '../../nombres.fr';
import { aideDe, ANCRES } from '../ancres';
import { LEGENDES } from '../legendes.fr';
import { VITESSES } from '../options';
import { MOMENTS, tardeACharger } from '../seance';
import { aideDuMoment, nomDeLaVitesse } from './facade';
import type { Plume } from './plume';

const L = LEGENDES;
const M = L.modeDEmploi;

/** Une entrée : les touches par leur nom, puis ce qu'elles font. */
const entree = (h: Plume, cle: string, noms: readonly string[], aide: string): string =>
  `<dt>${noms.map((nom) => `<span>${h(nom)}</span>`).join('')}</dt><dd id="${aideDe(cle)}">${h(aide)}</dd>`;

/** Ce que dit l'entrée du ralenti : combien de fois moins vite va chacun de ses crans. */
function aideDuRalenti(): string {
  const [, lent, tresLent] = VITESSES;
  return remplir(M.ralenti, { lent: ecrire(1 / lent), tresLent: ecrire(1 / tresLent) });
}

export function modeDEmploi(h: Plume): string {
  const [aLHeure, enRetard] = [MOMENTS.filter((moment) => !tardeACharger(moment)), MOMENTS.filter(tardeACharger)];
  const [premier] = aLHeure;
  if (premier === undefined) throw new Error('La piste n’a aucun moment à rejouer.');
  const entrees = [
    entree(
      h,
      aideDuMoment(premier),
      aLHeure.map((moment) => L.moments[moment]),
      M.moments,
    ),
    ...enRetard.map((moment) => entree(h, aideDuMoment(moment), [L.moments[moment]], M.attente)),
    entree(h, ANCRES.rayer, [L.rayer], M.rayer),
    entree(h, ANCRES.reveler, [L.reveler], M.reveler),
    entree(h, ANCRES.ralenti, VITESSES.map(nomDeLaVitesse), aideDuRalenti()),
    entree(
      h,
      ANCRES.verso,
      GENRES_DE_VERSO.map((genre) => L.versos[genre]),
      M.verso,
    ),
    entree(h, 'sobre', [L.poussoirs.sobre], M.sobre),
    entree(h, 'leger', [L.poussoirs.leger], M.leger),
  ];
  return `<section class="mode-d-emploi">
<h2>${h(M.titre)}</h2>
<dl>
${entrees.join('\n')}
</dl>
<p class="note">${h(M.note)}</p>
</section>`;
}
