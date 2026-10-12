/**
 * Les mots de la planche de rendu : titres des images, noms des densités, légendes de la vue éclatée.
 * Ce sont des annotations de document de travail : elles ne sont jamais affichées dans le jeu,
 * et restent donc à part des textes du site.
 */

import type { Densite } from '../ressources/densites';
import type { RoleDeCalque } from '../scene/calque';
import { remplir } from '../scene/phrases';
import { ecrire } from './nombres.fr';

/** Un nom qui s'accorde avec le nombre devant lui. */
interface Accord {
  readonly un: string;
  readonly plusieurs: string;
}

export const LEGENDES = {
  titre: 'Aperçu de la planche de rendu',

  densites: { fine: 'Fine', sobre: 'Sobre' } satisfies Record<Densite['cle'], string>,

  /** Titres des images. Ce qui est entre accolades est remplacé par sa valeur. */
  images: {
    platine: 'La platine sur le noyer, densité {densite}',
    detail: 'Le même détail en densité {densite}, grossi {fois} fois',
    eclatee: 'La platine entière, calques écartés',
    pochette: 'La pochette de {artiste}, en 240 px et en 48 px',
    logo: 'Le logo sur son étiquette',
    poids: '{titre} · {polygones}',
  },

  /**
   * La vue éclatée. Première ligne d'une légende : le nom de la pièce et ce que devient son calque à l'écran, selon son rôle.
   * Deuxième ligne : ce qu'il pèse. Troisième ligne, s'il en a une : ce que pèse son ombre.
   */
  pieces: {
    etiquette: 'Étiquette',
    vinyle: 'Vinyle',
    reperes: 'Repères',
    decor: 'Décor',
    bras: 'Bras',
    levier: 'Levier',
    bouton: 'Corps de bouton',
    index: 'Index de bouton',
    interrupteur: 'Interrupteur',
  },
  traitements: { decor: 'figé', image: 'image', mobile: 'calque', ombre: 'ombre' } satisfies Record<RoleDeCalque, string>,
  pieceEtTraitement: '{piece} · {traitement}',
  polygones: { un: '{nombre} polygone', plusieurs: '{nombre} polygones' },
  lettres: { un: '{nombre} lettre', plusieurs: '{nombre} lettres' },
  /** Ce que pèse un calque : ses polygones, et ses lettres s'il en porte. */
  pesee: { sansLettres: '{polygones}', avecLettres: '{polygones}, {lettres}' },
  ombre: 'ombre · {polygones}',
} as const;

export type PieceLegendee = keyof typeof LEGENDES.pieces;

/** Un nombre suivi de son nom, accordé : en français, le pluriel commence à deux. */
export const compter = (nombre: number, accord: Accord): string => remplir(nombre < 2 ? accord.un : accord.plusieurs, { nombre: ecrire(nombre) });
