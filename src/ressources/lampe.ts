/**
 * La lampe : une seule, chaude, hors champ en haut à gauche. Elle ne bouge jamais.
 * Tout ce qui dépend de la lumière (tons des facettes, sens et longueur des ombres, nappe sur le bois)
 * se lit ici et nulle part ailleurs.
 */

import type { NomDeTeinte } from './palette';

export const LAMPE = {
  /**
   * Direction vers la lampe, dans le repère du meuble (x à droite, y vers le joueur, z vers le haut) :
   * à gauche, au fond, et haute d'environ 45°.
   */
  versLaLampe: [-0.48, -0.52, 0.71],

  /**
   * Angles (en degrés) entre la normale d'une facette et la direction de la lampe,
   * aux frontières des 5 tons : en dessous de 22° le ton le plus clair, au-delà de 100° le plus sombre.
   * Une face posée à plat tombe à 45° : elle prend le ton de base.
   */
  seuilsDesTons: [22, 40, 68, 100],

  ombre: {
    /** Une ombre est de l'encre posée en aplats translucides, jamais floutée : sa teinte, et son ton, le plus sombre. */
    teinte: 'expresso' satisfies NomDeTeinte,
    ton: 0,
    /** Longueur de l'ombre à l'écran, en px par px de hauteur d'extrusion. */
    allongement: 0.82,
    /** Part de cette longueur atteinte par chaque palier, du plus proche au plus lointain. */
    paliers: [0.6, 0.8, 1],
    /** Opacité d'un palier. Là où les paliers se recouvrent, l'ombre fonce : c'est ce qui fait les marches. */
    opacite: 0.17,
    /**
     * Part de l'épaisseur d'un objet que le cœur de son ombre garde toujours. Sous un objet fin et haut (le tube du bras),
     * les paliers se resserrent pour ne pas se décoller les uns des autres.
     */
    coeur: 1 / 3,
    /**
     * L'ombre d'une pièce qu'on retourne passe par un trait quand la pièce est dans l'axe de la lampe. En dessous de cette
     * épaisseur, en px, ce n'est plus qu'une lame à pointes d'aiguille : on ne la montre pas.
     */
    lame: 14,
  },

  /**
   * La nappe de lumière posée sur le bois, en fondu. Elle est attachée au meuble : ses mesures sont dans le plan du meuble, en px.
   * Son grand axe est couché le long de la lumière, de la lampe vers le bas à droite : c'est la direction de la lampe qui le donne.
   * Son centre est au fond à gauche, hors du meuble ; la platine est en plein dedans. Le bois s'y éclaircit par paliers doux, comme
   * le reste se découpe en facettes : des ellipses de bois clair, chacune un peu transparente, de la plus large (`du`, rayons du
   * grand et du petit axe) à la plus étroite (`au`), tant de pas ; chaque palier n'éclaircit qu'un peu.
   */
  nappe: {
    centre: [374, -156],
    du: [1220, 1000],
    au: [640, 525],
    pas: 5,
    opacite: 0.16,
  },
} as const;
