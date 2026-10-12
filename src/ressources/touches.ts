/**
 * Le dessin des touches : ce qu'on presse. Une touche de platine est un capuchon chanfreiné, logé dans le puits d'un petit socle
 * de laque posé sur le meuble : on voit son flanc dépasser du puits, et il s'y enfonce de 2 px quand on le presse.
 * Comment elle bouge (sa course, ses temps) est dans la table des réglages de mouvement (`TOUCHES`, mouvement.ts).
 * Les longueurs sont en px dans le plan du meuble, les épaisseurs et les hauteurs en px visibles.
 */

import type { NomDeTeinte } from './palette';
import type { Echelon, RoleDeTexte } from './typo';

export interface GenreDeTouche {
  /** Le capuchon : sa largeur et sa profondeur, sa teinte au repos. */
  readonly largeur: number;
  readonly profondeur: number;
  readonly teinte: NomDeTeinte;
  /** Son libellé : le caractère, et le plus grand corps qu'il peut prendre. */
  readonly role: RoleDeTexte;
  readonly auPlus: Echelon;
}

export const FORMES_DES_TOUCHES = {
  /** L'action de l'écran, sous le pouce : miel, la couleur signature, son libellé dans le caractère de titrage. */
  principale: { largeur: 248, profondeur: 52, teinte: 'miel', role: 'titrage', auPlus: 'intertitre' },
  /** Une action de plus, plus petite : crème, son libellé gravé. */
  secondaire: { largeur: 168, profondeur: 40, teinte: 'creme', role: 'techniqueFort', auPlus: 'mention' },
  /** Un cran d'un groupe, côte à côte avec les autres : crème, petit, son libellé gravé. Choisi, il s'allume. */
  cran: { largeur: 120, profondeur: 32, teinte: 'creme', role: 'techniqueFort', auPlus: 'gravure' },
  /** Une réponse proposée, en mode 4 choix : large, pour un titre et son interprète ; crème, son libellé gravé. */
  reponse: { largeur: 214, profondeur: 36, teinte: 'creme', role: 'techniqueFort', auPlus: 'mention' },
} as const satisfies Readonly<Record<string, GenreDeTouche>>;

export type NomDeGenreDeTouche = keyof typeof FORMES_DES_TOUCHES;

export const TOUCHE = {
  /** Le socle : sa marge autour du puits, son épaisseur, ses coins, son chanfrein, sa teinte. */
  socle: { marge: 7, epaisseur: 7, rayon: 10, pansParCoin: 3, chanfrein: 2.2, teinte: 'laque' },
  /** Le puits : le jeu autour du capuchon, et sa profondeur sous le dessus du socle. */
  puits: { jeu: 2.4, profondeur: 2, rayon: 8 },
  /** Le capuchon : son épaisseur, ses coins, son chanfrein ; la marge que garde son libellé de chaque côté. */
  capuchon: { epaisseur: 6, rayon: 7, chanfrein: 2, marge: 14 },
  /** Allumée (un poussoir enclenché, un cran choisi) : face sombre, inscription miel, et elle reste enfoncée. */
  allumee: { teinte: 'vinyle', encre: 'miel' },
} as const satisfies { readonly allumee: { readonly teinte: NomDeTeinte; readonly encre: NomDeTeinte } } & Record<string, unknown>;
