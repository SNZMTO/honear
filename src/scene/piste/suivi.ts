/**
 * Le suivi d'une piste : la pose de ses pièces à chaque instant de l'horloge, pour un écran. Il tient le moteur de mouvement
 * et la partition de la piste en cours. Quand la piste change (une rayure, la révélation) ou qu'on change d'allure,
 * il écrit une autre partition, et chaque pièce repart de sa position et de sa vitesse du moment.
 */

import { creerLeMoteur, type Moteur, type Partition } from '../../mouvement/moteur';
import { AMPLEURS, TOLERANCES } from '../../ressources/mouvement';
import { seulement } from '../etiquette/fondu';
import { chiffreDeLaPastille } from './decompte';
import type { PisteEnScene } from './etat';
import type { Grandeur, OptionsDeGestes } from './gestes/vocabulaire';
import { partitionDeLaPiste } from './partition';
import { etiquetteSelonLaVitesse, regimeDuPlateau } from './plateau';
import type { PoseDeLaPiste } from './pose';
import { poseSobre } from './sobre';

/** L'étiquette qui se recale : rien d'elle ne se voit, ses arcs longs la couvrent. */
const CACHEE_SOUS_SES_ARCS = seulement('arcsLongs');

/**
 * La pose à l'instant t, celui où en est le moteur : les grandeurs qu'il tient, et ce qui change d'un coup sans passer par lui
 * (le chiffre de la pastille, le fondu de l'étiquette selon la vitesse du plateau).
 */
function lireLaPose(scene: PisteEnScene, moteur: Pick<Moteur<Grandeur>, 'valeur' | 'ecart'>, t: number): PoseDeLaPiste {
  // Tant que l'étiquette se recale sur l'angle où elle doit être, ses arcs longs la cachent : on ne la voit jamais se rattraper,
  // même sur un téléphone qui apprend la révélation en retard, quand le disque a déjà bien ralenti.
  const recalee = Math.abs(moteur.ecart('etiquette.recalage')) < AMPLEURS.etiquette.recalee;
  // L'étiquette tourne avec le disque, rayé ou non : c'est le même objet. Son recalage s'y ajoute.
  const tourne = moteur.valeur('disque.angle');
  return {
    disque: {
      en: [moteur.valeur('disque.x'), moteur.valeur('disque.y')],
      hauteur: moteur.valeur('disque.hauteur'),
      retourne: moteur.valeur('disque.retourne'),
      etiquette: {
        angle: tourne + moteur.valeur('etiquette.recalage'),
        angleDesArcs: tourne,
        ...(recalee ? etiquetteSelonLaVitesse(regimeDuPlateau(scene.piste, t).vitesse) : CACHEE_SOUS_SES_ARCS),
      },
    },
    reperes: moteur.valeur('reperes'),
    bras: { angle: moteur.valeur('bras.angle'), leve: moteur.valeur('bras.leve') },
    levier: moteur.valeur('levier'),
    pastille: {
      montre: chiffreDeLaPastille(scene, t),
      hauteur: moteur.valeur('pastille.hauteur'),
      echelle: moteur.valeur('pastille.echelle'),
      glisse: moteur.valeur('pastille.glisse'),
    },
    kraft: { entrainee: moteur.valeur('kraft.entrainee') },
    regard: moteur.valeur('regard'),
  };
}

/** L'allure à laquelle on suit une piste : ce qu'on retire à ses gestes, et si l'on a demandé de réduire les animations. */
export interface Allure extends OptionsDeGestes {
  /** Vrai quand « réduire les animations » est demandé : les pièces changent de place d'un coup. */
  readonly sobre: boolean;
}

const ALLURE_ENTIERE: Allure = { sobre: false, reactions: true };

export interface SuiviDeLaPiste {
  /**
   * La pose de la piste à l'instant t de l'horloge.
   * @param scene tant que c'est le même objet, à la même allure, la partition n'est pas récrite : qui tient l'état de la piste
   * rend le même objet tant que rien n'y a changé, et un autre dès qu'il change.
   */
  poseA(scene: PisteEnScene, t: number, allure?: Allure): PoseDeLaPiste;
}

export function suivreLaPiste(): SuiviDeLaPiste {
  const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
  let enCours: { readonly scene: PisteEnScene; readonly reactions: boolean; readonly partition: Partition<Grandeur> } | undefined;

  return {
    poseA(scene, t, allure = ALLURE_ENTIERE) {
      const { reactions } = allure;
      if (enCours?.scene !== scene || enCours.reactions !== reactions)
        enCours = { scene, reactions, partition: partitionDeLaPiste(scene, { reactions }) };
      if (allure.sobre) {
        // Le moteur reste posé sur l'instant : si les animations reviennent, rien ne se rejoue.
        moteur.poser(enCours.partition, t);
        return poseSobre(scene, t);
      }
      return lireLaPose(scene, moteur, moteur.avancer(enCours.partition, t));
    },
  };
}
