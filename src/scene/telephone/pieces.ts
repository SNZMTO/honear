/**
 * Ce qu'on pose sur le meuble, sous la platine, dans le regard du téléphone : les touches, les papiers, les phrases, les pastilles
 * de mot. Chacun se place en px du regard et se dessine sur le meuble : c'est le vocabulaire des écrans du téléphone, celui du jeu
 * comme celui des planches.
 */

import { surLEcran } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Reponse } from '../../regles/piste';
import { DENSITES, type Densite } from '../../ressources/densites';
import { PASTILLES } from '../../ressources/pastilles';
import type { NomDeTeinte } from '../../ressources/palette';
import { TABLEE } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import type { Calque } from '../calque';
import { regardSurLaPlatine, surLeBois, type Regard } from '../meuble';
import { dessinerUnPapier, type LigneDePapier } from '../papier';
import { dessinerUnePastille, faceEcrite, type Pastille } from '../pastille';
import { remplir } from '../phrases';
import { empriseDe } from '../rendu/emprise';
import type { Encrier } from '../rendu/texte';
import { dessinerUneTouche, largeurDeLaTouche, type EtatDeTouche } from '../touche';

const T = TABLEE.telephone;

/** Ce qu'il faut pour dessiner un écran du téléphone : les textes du site, et de quoi les mesurer et les tracer. */
export interface Ecritoire {
  readonly textes: Textes;
  readonly encrier: Encrier;
  /** L'adresse du site, comme le lien d'une room l'écrit (« honear.fr ») ; sans elle, celle des planches. */
  readonly site?: string;
}

/** Un écran du téléphone : où son regard se pose sur le meuble, et ce qu'on y a posé. */
export interface VueDuTelephone {
  readonly regard: Regard;
  readonly objets: readonly Calque[];
}

/** Le regard du téléphone posé sur la platine : celui de presque tous ses écrans. */
export const SUR_LA_PLATINE: Regard = regardSurLaPlatine();
/** La densité des écrans du téléphone : la fine, celle du site. */
export const DENSITE: Densite = DENSITES.fine;

export const touche = (
  nom: `touche-${string}`,
  genre: 'principale' | 'secondaire' | 'cran',
  libelle: string,
  regard: Regard,
  p: readonly [number, number],
  encrier: Encrier,
  etat: EtatDeTouche = 'repos',
  ajustee = false,
): Calque => dessinerUneTouche({ nom, genre, libelle, centre: surLeBois(regard, p[0], p[1]), support: 0, etat, ajustee }, DENSITE, encrier.largeur);

/** Une touche posée par son bord gauche, à cette hauteur : sur la colonne, quelle que soit la longueur de son libellé. */
export function toucheAuBord(
  nom: `touche-${string}`,
  genre: 'principale' | 'secondaire',
  libelle: string,
  regard: Regard,
  [gauche, y]: readonly [number, number],
  encrier: Encrier,
  etat: EtatDeTouche = 'repos',
): Calque {
  const largeur = largeurDeLaTouche({ genre, libelle }, encrier.largeur);
  return touche(nom, genre, libelle, regard, [gauche + largeur / 2, y], encrier, etat);
}

/** Une touche posée au milieu du regard, à cette hauteur : les touches d'un écran se centrent les unes sous les autres. */
export function toucheAuMilieu(
  nom: `touche-${string}`,
  genre: 'principale' | 'secondaire',
  libelle: string,
  regard: Regard,
  y: number,
  encrier: Encrier,
  etat: EtatDeTouche = 'repos',
): Calque {
  return touche(nom, genre, libelle, regard, [regard.largeur / 2, y], encrier, etat);
}

/** Un papier posé dans un regard. */
export function papier(
  nom: `etiquette-${string}`,
  regard: Regard,
  en: readonly [number, number],
  largeur: number,
  angle: number,
  lignes: readonly LigneDePapier[],
  encrier: Encrier,
  options: {
    readonly curseur?: boolean;
    readonly alignement?: 'debut' | 'milieu';
    readonly role?: 'decor' | 'mobile';
    readonly auMoins?: number;
    readonly ancre?: 'debut' | 'milieu';
    readonly teinte?: NomDeTeinte;
    /** Un papier enfoncé, plaqué sur la table : sans ombre. */
    readonly plaque?: boolean;
  } = {},
): { readonly calques: Calque[]; readonly haut: number; readonly milieu: Vec2; readonly largeur: number } {
  const p = dessinerUnPapier(
    {
      nom,
      centre: surLeBois(regard, en[0], en[1]),
      largeur,
      angle,
      lignes,
      alignement: options.alignement ?? 'milieu',
      ...(options.curseur !== undefined ? { curseur: options.curseur } : {}),
      ...(options.role !== undefined ? { role: options.role } : {}),
      ...(options.auMoins !== undefined ? { auMoins: options.auMoins } : {}),
      ...(options.ancre !== undefined ? { ancre: options.ancre } : {}),
      ...(options.teinte !== undefined ? { teinte: options.teinte } : {}),
    },
    encrier.largeur,
  );
  return { calques: options.plaque === true ? [p.papier] : [p.ombre, p.papier], haut: p.haut, milieu: p.milieu, largeur: p.largeur };
}

/** Une phrase qui dit ce qui se passe, sur un papier au-dessus de la zone du pouce : il garde son bord gauche, sur la colonne. */
export const phrase = (
  contenu: string,
  regard: Regard,
  encrier: Encrier,
  en: readonly [number, number] = T.message.en,
  largeur: number = T.message.largeur,
): Calque[] =>
  papier('etiquette-message', regard, en, largeur, T.message.angle, [{ contenu, role: 'titrage', auPlus: 'intertitre' }], encrier, { ancre: 'debut' })
    .calques;

/** Une pastille de mot collée sur une étiquette, à tant du regard, de travers : telle qu'on la dessine, ou qu'on la règle. */
export function pastilleDeMot(
  nom: `pastille-${string}`,
  contenu: string,
  regard: Regard,
  en: readonly [number, number],
  angle: number,
  encrier: Encrier,
  rayon: number = PASTILLES.mot.rayon,
  enLAir?: { readonly hauteur: number; readonly echelle: number },
): Pastille {
  return {
    nom,
    en: surLeBois(regard, en[0], en[1]),
    support: 1,
    angle,
    rayon,
    ...(enLAir !== undefined ? { enLAir } : {}),
    // Un mot, en technique étroit, comme sur les pastilles de la tablée : « Presque. » tient sans s'abréger.
    faces: { ecrite: faceEcrite(contenu, 'techniqueFort', rayon, 'titre', encrier.largeur) },
    montre: 'ecrite',
  };
}

/** La même pastille, dessinée : son ombre, puis elle. */
export function pastilleCollee(...parametres: Parameters<typeof pastilleDeMot>): Calque[] {
  const p = dessinerUnePastille(pastilleDeMot(...parametres));
  return [p.ombre, p.pastille];
}

/** Un point du meuble, dans le regard : en px depuis le coin haut-gauche du cadre. */
export function dansLeRegard(regard: Regard, p: Vec2): Vec2 {
  const [x, y] = surLEcran(p);
  return [x - regard.origine[0], y - regard.origine[1]];
}

/** Un regard du téléphone posé sur un objet du meuble, à la même hauteur que sur la platine : le regard glisse de l'un à l'autre. */
export function regardSur(objet: Calque, encrier: Encrier): Regard {
  const e = empriseDe([objet], encrier.largeur);
  if (e === undefined) throw new Error(`Le calque « ${objet.nom} » ne dessine rien à regarder.`);
  return { ...SUR_LA_PLATINE, origine: [e.x + e.largeur / 2 - SUR_LA_PLATINE.largeur / 2, SUR_LA_PLATINE.origine[1]] };
}

/** L'interprète d'une réponse tel qu'on l'écrit : l'artiste, et son invité s'il y en a un. */
export const interprete = (textes: Textes, r: Reponse): string =>
  r.feat !== undefined ? remplir(textes.partie.avecUnFeat, { artiste: r.artiste, feat: r.feat }) : r.artiste;
