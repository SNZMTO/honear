/**
 * La liste des temps, telle que le gabarit l'écrit : un enchaînement par signal, et sous chaque geste, comment la pièce y va,
 * puis ses réglages. C'est le seul endroit du projet où une frise des temps est permise.
 */

import { remplir } from '../../../scene/phrases';
import { LEGENDES } from '../legendes.fr';
import { chapeauDeLaListe, type Enchainement, type LigneDeTemps } from '../temps';
import type { Plume } from './plume';

const L = LEGENDES.temps;

/** Une ligne de la liste : quand, quoi, puis comment la pièce y va et ses réglages. */
function ligneDeTemps(h: Plume, l: LigneDeTemps): string {
  const quand = l.quand === '' ? '' : `<span class="quand">${h(l.quand)}</span>`;
  const comment = l.reglage === '' ? l.effet : remplir(L.comment, { effet: l.effet, reglage: l.reglage });
  return `<li>${quand}<span class="quoi">${h(l.quoi)}</span><span class="comment">${h(comment)}</span></li>`;
}

const enchainement = (h: Plume, e: Enchainement): string =>
  `<div class="enchainement"><h3>${h(e.titre)}</h3><ol class="lignes">${e.lignes.map((l) => ligneDeTemps(h, l)).join('')}</ol></div>`;

export const sectionDesTemps = (h: Plume, enchainements: readonly Enchainement[]): string =>
  `<section class="temps">
<h2>${h(L.titre)}</h2>
<p class="chapeau">${h(chapeauDeLaListe())}</p>
${enchainements.map((e) => enchainement(h, e)).join('\n')}
</section>`;
