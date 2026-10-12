/**
 * La palette : une valeur de base par couleur, et le réglage qui en tire ses 5 tons (voir lowpoly/tons.ts).
 * Aucune couleur n'est écrite ailleurs dans le projet.
 */

export const PALETTE = {
  // Le meuble : la table en noyer, et deux tons plus sombre et plus clair.
  noyerSombre: '#4F2E19',
  noyer: '#734929', // la table, d'une seule teinte
  noyerClair: '#A8703F',

  // La platine.
  laque: '#1F3A33', // vert bouteille du socle
  vinyle: '#1C1715', // jamais noir pur
  alu: '#B8AE9D', // métal brossé : la crème tirée vers l'expresso
  miel: '#E2A72E', // la signature : lampe, feutrine, pastilles, étiquette

  // Papier et encre.
  creme: '#F1E0BD', // étiquettes, papier, touches claires, la caisse du bac, texte sur fond sombre : un crème chaud, jamais blanc
  expresso: '#2A1E17', // texte sur fond clair
  kraft: '#CBA772', // la pochette du disque mystère : le crème tiré vers le noyer clair

  // Pochettes et personnages : saturées mais patinées.
  orangeBrule: '#D8652C',
  rougeTomate: '#C4432F',
  vieuxRose: '#D08A8F',
  bleuPetrole: '#1E6E78',
  bleuFane: '#7FB3C4',
  olive: '#7E8B3D',
  lilasFume: '#8C7BB0',
} as const;

export type NomDeTeinte = keyof typeof PALETTE;

/** Réglage commun du calcul des tons. */
export const REGLAGE_DES_TONS = {
  /** Écart de clarté (OKLab) entre deux tons voisins : petit, pour que deux facettes ne claquent jamais. */
  pas: 0.042,
  /** Les tons clairs tirent vers la lumière de la lampe. */
  lumiere: PALETTE.miel,
  /** Part de cette teinte prise à chaque ton plus clair. */
  chaleur: 0.07,
  /** Les tons sombres tirent vers un brun prune, plus froid que la lampe. */
  penombre: '#3B2233',
  /** Part de cette teinte prise à chaque ton plus sombre. */
  fraicheur: 0.09,
  /** Bornes de clarté : ni noir pur, ni blanc pur. */
  clarteMin: 0.18,
  clarteMax: 0.965,
} as const;
