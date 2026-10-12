/**
 * La typo : deux familles, auto-hébergées.
 * Caprasimo pour le titrage : des empattements gras et ronds, dans l'esprit des pochettes des années 70.
 * Barlow Condensed pour tout ce qui est technique : étroit, en capitales espacées, à chiffres tabulaires.
 */

export interface Caractere {
  readonly famille: string;
  /** Fichier pour le tracé des textes (woff ou ttf), dans le dossier polices/. */
  readonly trace: string;
  /** Fichier servi par le site (woff2), dans le dossier polices/. */
  readonly web: string;
  readonly graisse: number;
}

/** Les rôles de la typo : le titrage, le technique, et le technique en plus gras (code de la room, scores, noms de pièces). */
export const ROLES_DE_TEXTE = ['titrage', 'technique', 'techniqueFort'] as const;
export type RoleDeTexte = (typeof ROLES_DE_TEXTE)[number];

export interface PaireDeCaracteres extends Readonly<Record<RoleDeTexte, Caractere>> {
  readonly nom: string;
}

export const CARACTERES = {
  nom: 'Caprasimo + Barlow Condensed',
  titrage: { famille: 'Caprasimo', trace: 'caprasimo-400.woff', web: 'caprasimo-400.woff2', graisse: 400 },
  technique: { famille: 'Barlow Condensed', trace: 'barlow-condensed-500.woff', web: 'barlow-condensed-500.woff2', graisse: 500 },
  techniqueFort: { famille: 'Barlow Condensed', trace: 'barlow-condensed-600.woff', web: 'barlow-condensed-600.woff2', graisse: 600 },
} as const satisfies PaireDeCaracteres;

/**
 * L'échelle typographique, en px, à l'échelle du téléphone : huit échelons, chacun 1,2 fois le précédent,
 * arrondis au demi-pixel.
 * Tout texte prend l'un d'eux. Un texte imprimé sur un objet plus grand ou plus petit que sa taille de référence
 * (le logo en grand, une pochette réduite) le multiplie par l'échelle de l'objet, et rien d'autre.
 * Un texte qui doit tenir dans une place donnée (un nom sur une pochette, un titre sur un arc) descend d'échelon en échelon.
 */
export const CORPS = {
  /** Inscriptions gravées, mentions : le plus petit texte du site. */
  gravure: 11.5,
  mention: 14,
  texte: 16.5,
  intertitre: 20,
  titre: 24,
  grandTitre: 28.5,
  enseigne: 34.5,
  /** Le code de la room, en énorme sur l'étiquette. */
  affiche: 41,
} as const;

export type Echelon = keyof typeof CORPS;

/** Du plus grand au plus petit : l'ordre dans lequel un texte trop long descend l'échelle. */
export const ECHELONS: readonly Echelon[] = ['affiche', 'enseigne', 'grandTitre', 'titre', 'intertitre', 'texte', 'mention', 'gravure'];

/**
 * Plus petite hauteur de corps lisible, en px tels qu'on les voit : à plat sur le meuble, un texte est écrasé
 * comme le reste, et c'est sa hauteur écrasée qui compte.
 */
export const CORPS_LISIBLE = 10;

/**
 * Contraste demandé entre un texte et son fond (rapport WCAG) : celui d'un texte courant,
 * et celui d'un grand texte, à partir du corps donné.
 */
export const CONTRASTES = { texte: 4.5, grandTexte: 3, grandCorps: 24 } as const;

/** Approche ajoutée entre les lettres, en fraction du corps : le technique est espacé comme une gravure. */
export const APPROCHES: Readonly<Record<RoleDeTexte, number>> = { titrage: 0, technique: 0.09, techniqueFort: 0.09 };

/** Hauteur d'une capitale du caractère technique, en fraction du corps : pour centrer une inscription sur un point. */
export const HAUTEUR_DE_CAPITALE = 0.7;

/**
 * Le signe qu'on écrit à la place d'un signe que les caractères du site n'ont pas, quand le texte vient d'ailleurs que du fichier
 * de textes (un titre, un artiste) et qu'on ne peut donc pas le corriger.
 */
export const SIGNE_DE_REPLI = '?';
