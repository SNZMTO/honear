/**
 * Les règles de « Fais ta pochette » : tirer une pochette complète au hasard, en un geste ; tirer un autre titre d'album.
 * Des fonctions pures : le hasard leur est donné, une graine le rejoue à l'identique.
 * Elles ne savent rien de l'écran : elles rendent une pochette, l'écran la dessine.
 */

import { DESSUS, TETES, type Avatar, type CleDeDessus, type CleDeTete } from '../ressources/avatar';
import { PALETTE, type NomDeTeinte } from '../ressources/palette';
import { FONDS_DE_POCHETTE, MOTIFS_DE_POCHETTE, PEAUX_INTERDITES, type Pochette } from '../ressources/pochettes';

/** Un tirage : un nombre de 0 (compris) à 1 (non compris). Le navigateur, ou une graine pour les planches et les tests. */
export type Tirage = () => number;

/** Ce qu'on tire au sort, en plus de l'avatar : les noms d'artiste et les titres d'album, dans la langue du joueur. */
export interface ListesAuHasard {
  readonly artistes: readonly string[];
  readonly albums: readonly string[];
}

const TEINTES = Object.keys(PALETTE) as NomDeTeinte[];
/** Les peaux qu'on tire : toute la palette, sauf ce qui rendrait les traits illisibles. */
const PEAUX = TEINTES.filter((teinte) => !(PEAUX_INTERDITES as readonly NomDeTeinte[]).includes(teinte));

function parmi<T>(liste: readonly T[], tirage: Tirage, sauf: readonly T[] = []): T {
  const restants = liste.filter((element) => !sauf.includes(element));
  const choix = restants.length > 0 ? restants : liste;
  const element = choix[Math.min(choix.length - 1, Math.floor(tirage() * choix.length))];
  if (element === undefined) throw new Error('Rien à tirer au sort.');
  return element;
}

/**
 * Un avatar au hasard : une forme de tête, ce qu'il y a dessus, et trois couleurs toutes différentes.
 * @param fond la couleur de la pochette : ni la peau, ni les cheveux, ni la tenue ne la prennent, pour que l'avatar s'en détache.
 */
function avatarAuHasard(tirage: Tirage, fond: NomDeTeinte): Avatar {
  const peau = parmi(PEAUX, tirage, [fond]);
  const cheveux = parmi(TEINTES, tirage, [fond, peau]);
  return {
    tete: parmi(Object.keys(TETES) as CleDeTete[], tirage),
    dessus: parmi(Object.keys(DESSUS) as CleDeDessus[], tirage),
    peau,
    cheveux,
    tenue: parmi(TEINTES, tirage, [fond, peau, cheveux]),
  };
}

/** « Au hasard » : une pochette complète, nom d'artiste et titre d'album compris. Personne n'est obligé de régler quoi que ce soit. */
export function pochetteAuHasard(tirage: Tirage, listes: ListesAuHasard): Pochette {
  const fond = parmi(FONDS_DE_POCHETTE, tirage);
  return {
    artiste: parmi(listes.artistes, tirage),
    album: parmi(listes.albums, tirage),
    fond,
    motif: parmi(MOTIFS_DE_POCHETTE, tirage),
    avatar: avatarAuHasard(tirage, fond),
  };
}

/** « Un autre album » : un autre titre que celui qu'elle a, tiré au sort. */
export const autreAlbum = (pochette: Pochette, tirage: Tirage, albums: readonly string[]): Pochette => ({
  ...pochette,
  album: parmi(albums, tirage, [pochette.album]),
});

/** Ce qu'un nom d'artiste et un titre d'album peuvent compter de caractères, au plus. */
export const TEXTES_DE_POCHETTE = { artiste: 40, album: 60 } as const;

/** Ce qu'un nom qu'on tape soi-même peut compter de caractères : ce que la grande pochette imprime encore lisiblement, sur une ligne. */
export const NOM_AU_PLUS = 24;

/**
 * Un nom d'artiste qu'on tape : sans caractère de commande ni pictogramme (les polices du site n'en ont pas), les espaces
 * resserrées, coupé à la longueur qu'une pochette imprime encore lisiblement. Les espaces du bout restent, pour qu'on puisse taper le mot suivant.
 */
export function nomTape(texte: string): string {
  const propre = texte
    .replace(/[^\p{L}\p{M}\p{N}\p{P}\p{Zs}\p{Sm}\p{Sc}\p{Sk}]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^ /, '');
  let nom = '';
  for (const signe of propre) {
    if (nom.length + signe.length > NOM_AU_PLUS) break;
    nom += signe;
  }
  return nom;
}

/**
 * Vrai si ce qui est arrivé est bien une pochette : un nom d'artiste et un titre d'album d'une longueur raisonnable, sans caractère
 * de commande ; un fond, un motif, une tête, un dessus de tête et des couleurs que le site connaît. Le joueur peut tout choisir,
 * pourvu que cela existe.
 */
export function estUnePochette(x: unknown): x is Pochette {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Readonly<Record<string, unknown>>;
  const avatar = p['avatar'] as Readonly<Record<string, unknown>> | null | undefined;
  const texte = (t: unknown, auPlus: number): boolean => typeof t === 'string' && t.length <= auPlus && !/[\u0000-\u001f\u007f]/.test(t);
  const parmiLes = (cle: unknown, de: object): boolean => typeof cle === 'string' && Object.prototype.hasOwnProperty.call(de, cle);
  return (
    texte(p['artiste'], TEXTES_DE_POCHETTE.artiste) &&
    texte(p['album'], TEXTES_DE_POCHETTE.album) &&
    parmiLes(p['fond'], PALETTE) &&
    (MOTIFS_DE_POCHETTE as readonly unknown[]).includes(p['motif']) &&
    typeof avatar === 'object' &&
    avatar !== null &&
    parmiLes(avatar['tete'], TETES) &&
    parmiLes(avatar['dessus'], DESSUS) &&
    parmiLes(avatar['peau'], PALETTE) &&
    parmiLes(avatar['cheveux'], PALETTE) &&
    parmiLes(avatar['tenue'], PALETTE)
  );
}
