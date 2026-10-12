/**
 * Les allègements : ce qu'on peut retirer à une scène quand l'appareil peine. Les réactions et les ombres animées, la finesse
 * du dessin et celle des images ; jamais l'action principale. Le mode léger les retire tous d'un coup : c'est le joueur qui l'enclenche.
 */

export interface Allegements {
  /** La densité sobre à la place de la fine. */
  readonly densiteSobre: boolean;
  /** Des images figées à demi-définition. */
  readonly demiDefinition: boolean;
  /** Plus de réactions des pièces voisines. */
  readonly sansReactions: boolean;
  /** Des ombres qui suivent leurs pièces sans plus s'écarter. */
  readonly ombresFigees: boolean;
}

export const SCENE_ENTIERE: Allegements = { densiteSobre: false, demiDefinition: false, sansReactions: false, ombresFigees: false };
export const MODE_LEGER: Allegements = { densiteSobre: true, demiDefinition: true, sansReactions: true, ombresFigees: true };
