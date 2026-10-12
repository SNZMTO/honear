/**
 * Les finis : comment une surface répond à la lampe.
 * La fonction d'ombrage est la même pour tous ; seules ces valeurs changent.
 *
 * Un fini sans sillons (laque, bois, papier, feutre, peau, métal) prend son ton
 * de l'inclinaison de la facette face à la lampe.
 * Un fini à sillons (le vinyle) le prend du sens de ses sillons : il est clair là où ils sont
 * en travers de la lumière, donc sur deux secteurs opposés qui restent fixes sous la lampe quand le disque tourne.
 */

export interface Sillons {
  /** Éclairement loin des deux secteurs clairs. */
  readonly base: number;
  /** Ce que les sillons ajoutent au cœur d'un secteur clair. */
  readonly eclat: number;
  /** Demi-largeur d'un secteur clair, en degrés : au-delà, il ne reste que la base. */
  readonly largeur: number;
}

export interface Fini {
  readonly sillons?: Sillons;
}

export const FINIS = {
  mat: {},
  /** Plages gravées du disque : deux larges secteurs clairs, les 4 tons du haut. */
  sillons: { sillons: { base: 0, eclat: 1, largeur: 90 } },
  /** Vinyle lisse (plage d'entrée, plage de sortie) : reflets plus étroits, fonds plus noirs. */
  vinyleLisse: { sillons: { base: -0.2, eclat: 1.2, largeur: 60 } },
} as const satisfies Record<string, Fini>;

export type NomDeFini = keyof typeof FINIS;
