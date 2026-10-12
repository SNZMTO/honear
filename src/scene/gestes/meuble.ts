/**
 * Les gestes du meuble : le regard qui glisse d'un objet à l'autre et le signe que l'objet visé lui fait, l'ampli qu'on allume
 * (l'interrupteur en deux temps, le voyant, les aiguilles en butée), le gros bouton du volume qui suit le doigt de cran en cran,
 * un sélecteur de la platine qui passe ses crans un à un, la playlist qui sort du bac.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Ressort } from '../../mouvement/ressort';
import { GESTES, MATIERES } from '../../ressources/mouvement';
import { role, vers, type Geste, type Pas, type RoleDuGeste } from './geste';

/** Un ressort critique arrive, à 2 % près, en tant de fois l'inverse de sa pulsation. */
const ARRIVEE_CRITIQUE = 5.834;

/** Le ressort critique qui arrive en tant de secondes. */
function critiqueEn(duree: number): Ressort {
  const pulsation = ARRIVEE_CRITIQUE / duree;
  return { raideur: pulsation * pulsation, amortissement: 2 * pulsation, masse: 1 };
}

// ————— Le regard —————

/** Le temps que le regard met à glisser de tant de px : 350 ms pour un voisin, 550 ms pour le bout du meuble. */
export function dureeDuRegard(distance: number): number {
  const { court, long } = GESTES.regard;
  const part = Math.max(0, Math.min(1, (distance - court.distance) / (long.distance - court.distance)));
  return court.duree + part * (long.duree - court.duree);
}

export type GrandeurDuRegard = 'x' | 'y' | 'signe';

/**
 * Le regard glisse d'une origine à une autre, d'un bloc, sans dépasser, en freinant à l'arrivée. Quand il arrive, l'objet visé
 * répond d'un petit signe : `signe` va de 0 à sa place et revient (une aiguille qui tressaille).
 */
export function regardQuiGlisse(de: Vec2, a2: Vec2, a: number): Geste<GrandeurDuRegard> & { readonly arrivee: number } {
  const duree = dureeDuRegard(Math.hypot(a2[0] - de[0], a2[1] - de[1]));
  const matiere = critiqueEn(duree);
  const arrivee = a + duree;
  const { signe } = GESTES.regard;
  return {
    roles: {
      x: role(de[0], vers(a, a2[0], matiere)),
      y: role(de[1], vers(a, a2[1], matiere)),
      signe: role(0, vers(arrivee, signe.place, MATIERES.aiguille.monte), vers(arrivee + signe.tient, 0, MATIERES.aiguille.retombe)),
    },
    arrivee,
  };
}

// ————— Un interrupteur, l'ampli —————

/** Un interrupteur qui bascule en deux temps : la course, jusqu'au milieu, puis le clic. De 0 (une position) à 1 (l'autre). */
export function basculer(a: number, versLaSeconde: boolean): RoleDuGeste & { readonly clic: number } {
  const { course, clic } = GESTES.ampli;
  const [de, a2] = versLaSeconde ? [0, 1] : [1, 0];
  return { ...role(de, vers(a, de + (a2 - de) * course.part, course.ressort), vers(a + clic.a, a2, clic.ressort)), clic: a + clic.a };
}

export type GrandeurDeLAmpli = 'interrupteur' | 'gauche' | 'droite';

/**
 * « Allume l'ampli » : l'interrupteur bascule en deux temps ; au clic, le voyant passe au miel et le téléphone vibre ;
 * puis les deux aiguilles partent en butée, à 30 ms l'une de l'autre, et retombent, comme sur un vrai ampli qu'on allume.
 */
export function allumerLAmpli(a: number): Geste<GrandeurDeLAmpli> & { readonly clic: number } {
  const { aiguilles } = GESTES.ampli;
  const interrupteur = basculer(a, true);
  const aiguille = (decalage: number): RoleDuGeste => {
    const part = interrupteur.clic + aiguilles.a + decalage;
    return role(0, vers(part, 1, MATIERES.aiguille.monte), vers(part + aiguilles.retombent, 0, MATIERES.aiguille.retombe));
  };
  return {
    roles: { interrupteur, gauche: aiguille(0), droite: aiguille(aiguilles.a) },
    vibrations: [interrupteur.clic],
    clic: interrupteur.clic,
  };
}

/**
 * Le gros bouton du volume suit le doigt : à chaque cran que le doigt passe, il saute sur ce cran et le téléphone vibre brièvement.
 * @param doigt l'angle du doigt autour du bouton, à des instants ; `crans`, les angles des crans.
 */
export function volumeAuDoigt(doigt: readonly { readonly a: number; readonly angle: number }[], crans: readonly number[]): Geste<'volume'> {
  const plusProche = (angle: number): number =>
    crans.reduce((meilleur, cran) => (Math.abs(cran - angle) < Math.abs(meilleur - angle) ? cran : meilleur));
  const pas: Pas[] = [];
  const vibrations: number[] = [];
  let cran = plusProche(doigt[0]?.angle ?? 0);
  const depart = cran;
  for (const { a, angle } of doigt) {
    const vise = plusProche(angle);
    if (vise === cran) continue;
    cran = vise;
    pas.push(vers(a, cran, GESTES.selecteur.tourne));
    vibrations.push(a);
  }
  return { roles: { volume: role(depart, ...pas) }, vibrations };
}

/** Un sélecteur de la platine qui passe d'un cran à un autre, un cran à la fois : à chacun, il dépasse de 2 degrés, puis revient. */
export function deCranEnCran(crans: readonly number[], de: number, a2: number, a: number): Geste<'angle'> {
  const S = GESTES.selecteur;
  const sens = Math.sign(a2 - de);
  const pas: Pas[] = [];
  for (let k = 1; k <= Math.abs(a2 - de); k++) {
    const angle = crans[de + sens * k] ?? 0;
    const depasse = Math.sign(angle - (crans[de + sens * (k - 1)] ?? 0)) * S.depasse;
    const part = a + (k - 1) * S.cran;
    pas.push(vers(part, angle + depasse, S.tourne), vers(part + S.revient.a, angle, S.revient.ressort));
  }
  return { roles: { angle: role(crans[de] ?? 0, ...pas) } };
}

// ————— Le bac —————

/**
 * La playlist choisie sort du bac : elle se soulève de 6 px, puis monte, hors du bac, par le haut. Les intercalaires qui basculent
 * quand on feuillette attendent une plaque qui sache tourner : vu d'ici, une plaque debout qu'on penche grandit au lieu de se coucher.
 */
export function sortirUnePlaylist(a: number): Geste<'leve'> {
  const B = GESTES.bac;
  return { roles: { leve: role(0, vers(a, B.leve, B.seLeve), vers(a + B.sortA, B.sort, B.sortie)) } };
}
