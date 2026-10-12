/**
 * Les rayures d'une piste, vues du disque : à chaque mauvaise réponse, la main le prend, le ramène en arrière, le rend, le lâche.
 * Ses gestes ne sont écrits qu'ici ; la chorégraphie de la piste les lit pour en faire des consignes. Ce module les suit aussi,
 * par les mêmes ressorts que le moteur, pour savoir où est vraiment le disque quand la main le reprend : même s'il n'a pas fini
 * de se remettre de la rayure d'avant.
 */

import { detendre, estCritique, pulsation, type Ressort } from '../../mouvement/ressort';
import type { Course } from '../../mouvement/volant';
import { rayeLeDisque } from '../../regles/piste';
import { AMPLEURS, MATIERES, TEMPS } from '../../ressources/mouvement';
import type { PisteEnScene } from './etat';
import type { NomDeGeste } from './gestes/vocabulaire';
import { JAMAIS } from './instants';
import { regimeDuPlateau } from './plateau';

const M = MATIERES.main;

/** Un geste de la main qui tient le disque : tant de temps après l'avoir pris, elle le mène à un angle, compté depuis celui de la prise. */
export interface GesteDeLaMain {
  readonly apres: number;
  /** De combien elle l'écarte de l'angle où elle l'a pris, en degrés. */
  readonly ecart: number;
  readonly matiere: Ressort;
  readonly nom: NomDeGeste;
}

/** Ce que la main fait du disque à une rayure : elle le ramène en arrière, puis le rend où il était. */
export const GESTES_DE_LA_MAIN: readonly GesteDeLaMain[] = [
  { apres: 0, ecart: -AMPLEURS.rayure.recul, matiere: M.recule, nom: 'mainRecule' },
  { apres: TEMPS.rayure.mainRend, ecart: 0, matiere: M.rend, nom: 'mainRend' },
];

/** Puis elle le lâche : il reprend sa vitesse comme un volant, par ce ressort, sans jamais dépasser celle du plateau. */
export const LACHER = { apres: TEMPS.rayure.mainLache, matiere: M.lache, nom: 'disqueReprend' } as const satisfies Omit<GesteDeLaMain, 'ecart'>;

export interface Rayure {
  /** L'instant où la main prend le disque. */
  readonly a: number;
  /** L'instant de la rayure suivante, qui coupe court à celle-ci ; jamais, s'il n'y en a pas. */
  readonly jusqua: number;
  /** L'angle où le disque en était quand la main l'a pris. */
  readonly prise: number;
  /** Le retard qu'il garde sur le plateau une fois lâché, en degrés : il a glissé sur la feutrine, et ne le rattrape pas. */
  readonly retard: number;
}

/** Le disque ramené par un ressort vers un angle fixe, pendant une durée. */
function versUnAngle(disque: Course, cible: number, matiere: Ressort, duree: number): Course {
  const elan = detendre(matiere, { ecart: disque.angle - cible, vitesse: disque.vitesse }, duree);
  return { angle: cible + elan.ecart, vitesse: elan.vitesse };
}

/** Les rayures faites pendant que le disque joue, dans l'ordre, et ce que chacune fait au disque. */
export function rayuresDeLaPiste(scene: PisteEnScene): Rayure[] {
  const { piste } = scene;
  if (piste === undefined) return [];
  // Le calcul du retard, plus bas, suppose ce ressort amorti au plus juste : sinon le disque dépasserait la vitesse du plateau.
  if (!estCritique(LACHER.matiere)) throw new Error('Le ressort du disque lâché doit être amorti au plus juste.');
  const plateau = (t: number): Course => regimeDuPlateau(piste, t);

  const rayures: Rayure[] = [];
  const instants = scene.rayuresA.filter((a) => rayeLeDisque(piste, a)).sort((a, b) => a - b);
  let disque: Course | undefined;
  let depuis = 0;
  let retard = 0;
  instants.forEach((a, rang) => {
    // Où il en est quand la main le prend : sur le plateau s'il n'a jamais été rayé, sinon là où le geste d'avant l'a laissé.
    if (disque === undefined) {
      disque = plateau(a);
    } else {
      const [de, vers] = [plateau(depuis), plateau(a)];
      const elan = detendre(LACHER.matiere, { ecart: disque.angle - (de.angle - retard), vitesse: disque.vitesse - de.vitesse }, a - depuis);
      disque = { angle: vers.angle - retard + elan.ecart, vitesse: vers.vitesse + elan.vitesse };
    }
    const prise = disque.angle;
    // Les gestes de la main, chacun jusqu'au suivant, s'ils ne sont pas coupés par la rayure d'après.
    const jusqua = instants[rang + 1] ?? JAMAIS;
    const avantLaSuivante = (apres: number): number => Math.min(a + apres, jusqua);
    let tenu: Course = disque;
    for (const [i, geste] of GESTES_DE_LA_MAIN.entries()) {
      const fin = avantLaSuivante(GESTES_DE_LA_MAIN[i + 1]?.apres ?? LACHER.apres);
      tenu = versUnAngle(tenu, prise + geste.ecart, geste.matiere, fin - avantLaSuivante(geste.apres));
    }
    // Lâché, il reprend sa vitesse comme un volant : son retard est choisi pour qu'il la rejoigne sans jamais la dépasser.
    const lache = avantLaSuivante(LACHER.apres);
    const suivi = plateau(lache);
    retard = suivi.angle - tenu.angle + (suivi.vitesse - tenu.vitesse) / pulsation(LACHER.matiere);
    disque = tenu;
    depuis = lache;
    rayures.push({ a, jusqua, prise, retard });
  });
  return rayures;
}
