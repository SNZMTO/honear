/**
 * Les instants d'une piste, sur l'horloge du serveur : ses signaux (les chiffres du décompte, l'extrait, la révélation,
 * l'arrêt du plateau), et ce qui s'en déduit. Chaque geste de la piste est compté depuis l'un de ses signaux.
 */

import { tempsDeDescente } from '../../mouvement/chute';
import { entrainer, tempsPourRalentir } from '../../mouvement/volant';
import { instantDuChiffre, type Piste } from '../../regles/piste';
import { AMPLEURS, MATIERES, TEMPS } from '../../ressources/mouvement';
import { uneFoisPar } from '../memoire';

const V = MATIERES.plateau;
/** L'instant de ce qui n'arrivera pas, ou qu'on ne connaît pas encore. */
export const JAMAIS = Infinity;

/** Le temps que le bras met à descendre sur son amortisseur, de sa levée jusqu'au disque ou jusqu'à son repos. */
export const DESCENTE_DU_BRAS: number = tempsDeDescente(MATIERES.bras.descend, AMPLEURS.brasLeve);

/** Les instants d'une piste. Ceux qu'on ne connaît pas encore sont rejetés à jamais. */
export interface InstantsDeLaPiste {
  readonly trois: number;
  readonly deux: number;
  readonly un: number;
  /** Le bras commence à descendre : c'est compté à rebours depuis l'extrait, pour que le diamant touche à l'instant où il part. */
  readonly descente: number;
  readonly extrait: number;
  readonly revelation: number;
  readonly moteurCoupe: number;
  /**
   * À partir d'ici, un écran peut dessiner la réponse au verso sans gêner ce qui bouge : le disque ralentit et ne se retournera
   * que deux secondes après, le regard n'a pas encore bougé.
   */
  readonly reponseADessiner: number;
  /** Le plateau s'arrête : le frottement a usé la vitesse qu'il avait à la coupure. */
  readonly arret: number;
  /** Le disque commence à se retourner. */
  readonly retournement: number;
}

/** Les signaux : ceux des instants d'une piste depuis lesquels on compte, et la rayure, qui a le sien à chaque mauvaise réponse. */
export type Signal = 'trois' | 'deux' | 'un' | 'extrait' | 'rayure' | 'revelation' | 'arret';

export const instantsDeLaPiste: (piste: Piste) => InstantsDeLaPiste = uneFoisPar((piste) => {
  const extrait = piste.extraitA ?? JAMAIS;
  const revelation = piste.revelation?.a ?? JAMAIS;
  const deux = instantDuChiffre(piste, 2);
  const moteurCoupe = revelation + TEMPS.revelation.moteurCoupe;
  const arret = moteurCoupe + (Number.isFinite(moteurCoupe) ? tempsPourRalentir(V, entrainer(V, 0, moteurCoupe - deux).vitesse) : 0);
  return {
    trois: instantDuChiffre(piste, 3),
    deux,
    un: instantDuChiffre(piste, 1),
    descente: extrait - DESCENTE_DU_BRAS,
    extrait,
    revelation,
    moteurCoupe,
    reponseADessiner: revelation + TEMPS.revelation.reponse,
    arret,
    retournement: arret + TEMPS.retournement.seRetourne,
  };
});
