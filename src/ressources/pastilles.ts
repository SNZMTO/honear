/**
 * Les pastilles de disquaire : un petit rond de papier miel, collé de travers. Un message court, ou un point marqué.
 */

export const PASTILLES = {
  /** Nombre de pans d'une pastille, et largeur de son liseré, un ton plus sombre, en part de son rayon. */
  pans: 28,
  lisere: 0.1,
  /** L'épaisseur de son papier, en px visibles : même collée, elle garde un fil d'ombre. */
  epaisseur: 0.4,
  /**
   * La pastille du décompte, sur le socle de la platine, près du bras : sa place par rapport au coin haut-gauche du socle,
   * son rayon, son angle. Elle arrive un peu plus grande (`arrivee`, en part de sa taille) et d'un peu plus haut (px visibles).
   */
  decompte: { en: [466, 352], rayon: 20, angle: -7, arrivee: { echelle: 1.22, hauteur: 9 } },
  /**
   * Les deux tailles d'une pastille qui dit quelque chose : un point marqué (« +2 ») et un message court (« Presque. »).
   * Ce qu'elle écrit tient dans cette part de son diamètre.
   */
  point: { rayon: 22 },
  message: { rayon: 36 },
  /** Un mot seul collé sur une pochette (« Entrée », « 5 pts ») : un peu plus grand qu'un point, bien plus petit qu'un message. */
  mot: { rayon: 27 },
  ecrit: 0.78,
  /** Une pastille écrit une ligne, deux au plus : l'interligne, en part du corps. */
  lignes: 2,
  interligne: 0.3,
} as const;
