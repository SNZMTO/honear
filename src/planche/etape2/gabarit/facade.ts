/**
 * La façade, telle que le gabarit l'écrit : ses groupes de touches, chacun sous son nom gravé. L'ordre des groupes est celui
 * de la piste, puis de ses variantes : c'est aussi l'ordre du clavier, et celui du mode d'emploi.
 */

import { GENRES_DE_VERSO } from '../../../scene/disque/verso';
import { remplir } from '../../../scene/phrases';
import { ecrire } from '../../nombres.fr';
import { aideDe, ANCRES, POUSSOIRS, type Poussoir } from '../ancres';
import { LEGENDES } from '../legendes.fr';
import { A_L_OUVERTURE, VITESSES, type Vitesse } from '../options';
import { MOMENTS, tardeACharger, type Moment } from '../seance';
import type { Plume } from './plume';

const L = LEGENDES;

/** Le nom gravé sur le cran d'une vitesse : « ×1 », « ×0,5 ». */
export const nomDeLaVitesse = (vitesse: Vitesse): string => remplir(L.vitesse, { vitesse: ecrire(vitesse, 2) });

/** L'aide que lit chaque moment dans le mode d'emploi : celui dont l'extrait tarde à charger a la sienne. */
export const aideDuMoment = (moment: Moment): string => (tardeACharger(moment) ? 'attente' : 'moments');

/** Une touche qui rejoue la piste depuis un moment. La première lance la piste : c'est la touche maîtresse. */
const toucheDeMoment = (h: Plume, moment: Moment): string =>
  `<button type="button" class="touche${moment === MOMENTS[0] ? ' maitresse' : ''}" ${ANCRES.moment}="${moment}" aria-describedby="${aideDe(aideDuMoment(moment))}">${h(L.moments[moment])}</button>`;

/** Une touche qui ne sert que pendant l'extrait : hors de lui, elle est éteinte. La page s'ouvre avant la piste : elle l'est donc d'abord. */
const toucheDeLExtrait = (h: Plume, id: string, nom: string): string =>
  `<button type="button" class="touche" id="${id}" aria-disabled="true" aria-describedby="${aideDe(id)}">${h(nom)}</button>`;

/** Les poussoirs enclenchés à l'ouverture. La version sobre dépend de l'appareil : la page s'écrit sans elle, et le script l'enclenche s'il le faut. */
const ENCLENCHEE: Readonly<Record<Poussoir, boolean>> = { sobre: false, leger: A_L_OUVERTURE.leger };

/** Un poussoir : relâché, ou enclenché. */
const poussoir = (h: Plume, nom: Poussoir): string =>
  `<button type="button" class="touche" ${ANCRES.poussoir}="${nom}" aria-pressed="${ENCLENCHEE[nom]}" aria-describedby="${aideDe(nom)}">${h(L.poussoirs[nom])}</button>`;

/** Un cran : un bouton radio sous son libellé, qui est la touche. Un seul du groupe est enfoncé. */
const cran = (h: Plume, groupe: string, valeur: string, nom: string, choisi: boolean): string =>
  `<label class="touche${choisi ? ` ${ANCRES.choisi}` : ''}"><input type="radio" name="${groupe}" value="${valeur}" autocomplete="off"${choisi ? ' checked' : ''}><span>${h(nom)}</span></label>`;

/** Un groupe de touches, sous son nom gravé : c'est aussi le nom qu'entend qui écoute la page. */
function groupe(h: Plume, cle: keyof typeof L.groupes, touches: readonly string[], o: { readonly aCrans?: string } = {}): string {
  // L'identifiant du nom gravé : la clé du groupe, écrite comme un identifiant de page.
  const id = `groupe-${cle.replace(/[A-Z]/g, (capitale) => `-${capitale.toLowerCase()}`)}`;
  const role = o.aCrans !== undefined ? `role="radiogroup" aria-describedby="${aideDe(o.aCrans)}"` : 'role="group"';
  return `<div class="groupe" ${role} aria-labelledby="${id}"><p class="gravure" id="${id}">${h(L.groupes[cle])}</p><div class="touches">${touches.join('')}</div></div>`;
}

export function facade(h: Plume): string {
  const { ralenti, verso } = ANCRES;
  return `<section class="facade" id="${ANCRES.facade}" aria-label="${h(L.facade)}">
${groupe(
  h,
  'rejouer',
  MOMENTS.map((moment) => toucheDeMoment(h, moment)),
)}
${groupe(h, 'enExtrait', [toucheDeLExtrait(h, ANCRES.rayer, L.rayer), toucheDeLExtrait(h, ANCRES.reveler, L.reveler)])}
${groupe(
  h,
  'ralenti',
  VITESSES.map((vitesse) => cran(h, ralenti, String(vitesse), nomDeLaVitesse(vitesse), vitesse === A_L_OUVERTURE.vitesse)),
  { aCrans: ralenti },
)}
${groupe(
  h,
  'verso',
  GENRES_DE_VERSO.map((genre) => cran(h, verso, genre, L.versos[genre], genre === A_L_OUVERTURE.verso)),
  { aCrans: verso },
)}
${groupe(
  h,
  'options',
  POUSSOIRS.map((nom) => poussoir(h, nom)),
)}
</section>`;
}
