/**
 * Le verso du disque : son côté réponse. Deux façons d'y montrer la pochette, le titre et l'artiste.
 * Mesures en px, à l'échelle du disque de la platine.
 */

export const VERSO = {
  /**
   * « L'étiquette est la pochette » : la pochette, ronde, tient lieu d'étiquette. Autour d'elle, une large plage lisse
   * porte le titre en arc, en haut, et l'artiste sur une ligne droite, en bas : comme les inscriptions gravées près
   * de l'étiquette d'un vrai disque. Rayon de la pochette et largeur de son liseré ; rayon où reprennent les sillons ;
   * ligne de base et ouverture de l'arc du titre ; ligne de base de l'artiste, sous le centre, et la largeur qu'elle peut prendre.
   */
  etiquette: {
    pochette: 97,
    lisere: 1.4,
    lisse: 146,
    titre: { rayon: 108, ouverture: 152 },
    artiste: { sous: 118, place: 172 },
  },
  /**
   * « Tout le disque est la pochette » : elle est imprimée sur toute la face, et l'étiquette miel dit le titre et l'artiste.
   * Rayon de l'image ; rayons de quelques sillons, deux tons plus sombres, et leur largeur ; demi-largeur, en degrés,
   * des deux secteurs où l'image prend un ton de plus sous la lampe.
   */
  disque: {
    image: 158,
    sillons: [146, 131, 113, 97],
    largeurDeSillon: 1.1,
    secteur: 34,
  },
  /** D'où part le motif de la pochette, par rapport au centre du disque, en parts du rayon de l'image : jamais du milieu. */
  origineDuMotif: [-0.42, 0.34],
} as const;
