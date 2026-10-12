/**
 * Ce qu'on pose autour de la piste, au téléphone : le classement (ce que chacun a trouvé, puis ce que la piste lui a rapporté, son
 * nom et ses points), ou l'éventail des pochettes quand le clavier est ouvert ; l'étiquette vierge où l'on tape ou les quatre étiquettes à toucher, la phrase d'un état, le clavier ouvert ; et la
 * place de la vraie pochette, au milieu du disque retourné. Tout est placé dans le regard : ces objets restent à l'écran pendant
 * que le regard suit la piste.
 */

import { surLEcran } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { EtatDeLaPartie } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { ETIQUETTE } from '../../ressources/etiquette';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import { VERSO } from '../../ressources/verso';
import type { Calque } from '../calque';
import { dessinerLeClassement, lesPremiersEtToi, lignesDuClassement, type LigneDuClassement } from '../classement';
import type { Regard } from '../meuble';
import type { PoseDeLaPiste } from '../piste/pose';
import { regardDeLaPiste } from '../piste/regard';
import { dessinerLaTablee, eventail, placesEnEventail } from '../tablee';
import { phrase, type Ecritoire } from './pieces';
import { clavier, etiquetteDeReponse, etiquettesAToucher } from './reponse';

/** Ce que la projection garde de la profondeur du meuble : une image posée à plat y est écrasée d'autant. */
const ecrasement = (): number => surLEcran([0, 1])[1] - surLEcran([0, 0])[1];
const T = TABLEE.telephone;

/** Comment on répond à la piste : on tape sur l'étiquette vierge, ou l'on touche une des étiquettes tendues. */
export type CeQuOnRepond =
  | {
      readonly genre: 'saisie';
      /** Ce qu'on a tapé, et le mot collé sur l'étiquette (« Presque. », « Rayé. »), s'il y en a un. */
      readonly tape: string;
      readonly mot?: string;
      readonly clavier: boolean;
      /** Le dessus du vrai clavier, en px depuis le haut du regard, quand la page sait le lire ; sans lui, celui d'un clavier ordinaire. */
      readonly dessus?: number;
    }
  | { readonly genre: 'choix'; readonly proposes: readonly Reponse[]; readonly touchee?: number };

export interface AutourDeLaPiste {
  /** L'état de la room à l'instant, et celui d'avant l'extrait : à la révélation, chacun montre ce que la piste lui a rapporté. */
  readonly etat: EtatDeLaPartie;
  readonly avantLExtrait: EtatDeLaPartie;
  /** Le joueur qui tient ce téléphone. */
  readonly toi: string;
  readonly repondre: CeQuOnRepond;
  /** La réponse, une fois révélée. */
  readonly revelee?: Reponse;
  /** Une phrase qui dit ce qui se passe, à la place de l'étiquette : la connexion perdue, un spectateur, personne n'a trouvé. */
  readonly phrase?: string;
}

/** De combien le disque peut encore être penché, en degrés, quand on y pose la vraie pochette : il est à plat, son verso en haut. */
const A_PLAT = 3;
/** Le disque retourné : son verso en haut. */
const DEMI_TOUR = 180;

/**
 * Où se pose l'image de la vraie pochette, quand la source en donne une : au milieu du disque retourné, à la place de la pochette
 * ronde que son verso dessine (sa vignette, en attendant qu'elle arrive), en px dans le regard de la piste. Son centre, son côté,
 * ses coins (elle est ronde), le trou de l'axe (en part de son côté) et l'écrasement de la profondeur, comme le disque.
 * Rien tant que le disque n'est pas à plat, son verso en haut.
 */
export function pochetteSurLeVerso(pose: PoseDeLaPiste):
  | {
      readonly centre: Vec2;
      readonly cote: number;
      readonly coin: number;
      readonly trou: number;
      readonly ecrasement: number;
    }
  | undefined {
  const { en, hauteur, retourne } = pose.disque;
  if (Math.abs(retourne - DEMI_TOUR) > A_PLAT) return undefined;
  const E = VERSO.etiquette;
  const rayon = E.pochette - E.lisere;
  const [x, y] = surLEcran(en, hauteur + PLATINE.disque.epaisseur + ETIQUETTE.colle);
  const { origine } = regardDeLaPiste(pose);
  const trou = PLATINE.axe.rayon + PLATINE.axe.jeu;
  return { centre: [x - origine[0], y - origine[1]], cote: 2 * rayon, coin: rayon, trou: trou / (2 * rayon), ecrasement: ecrasement() };
}

/**
 * Le dessus du clavier ouvert, en px depuis le haut du regard : celui du vrai clavier, s'il est plus haut qu'un clavier ordinaire,
 * sans monter au-delà de `auPlusHaut` ; sinon, celui d'un clavier ordinaire.
 */
export const dessusDuClavier = (regard: Regard, vrai: number | undefined): number => {
  const ordinaire = regard.hauteur - T.clavier.hauteur;
  return vrai === undefined ? ordinaire : Math.max(T.clavier.auPlusHaut, Math.min(ordinaire, vrai));
};

/** Le classement pendant la piste : ce que chacun a trouvé ; à la révélation, ce qu'elle lui a rapporté. */
export const lignesDeLaPiste = (textes: Textes, o: AutourDeLaPiste): LigneDuClassement[] =>
  lignesDuClassement(o.etat, textes, o.revelee !== undefined ? 'points' : 'trouvailles', o.revelee !== undefined ? o.avantLExtrait : undefined);

/**
 * Les objets posés autour de la piste, dans ce regard.
 * @param classementAilleurs vrai quand le classement se lit ailleurs (sous le bac, sur un grand écran) : ici, l'éventail des pochettes.
 */
export function autourDeLaPiste(a: Ecritoire, regard: Regard, o: AutourDeLaPiste, classementAilleurs = false): Calque[] {
  const { revelee, repondre } = o;
  const ouvert = repondre.genre === 'saisie' && repondre.clavier;
  // Un vrai clavier plus haut qu'un clavier ordinaire remonte l'éventail et l'étiquette d'autant : ils restent au-dessus de lui.
  const dessus = dessusDuClavier(regard, repondre.genre === 'saisie' ? repondre.dessus : undefined);
  const remonte = dessus - (regard.hauteur - T.clavier.hauteur);
  const objets: Calque[] = [];
  if (ouvert || classementAilleurs) {
    // Le clavier ouvert prend le bas de l'écran : l'éventail remonte au-dessus de l'étiquette, sans la kraft.
    const joueurs = eventail(o.etat, a.textes, revelee !== undefined ? 'points' : 'trouvailles', revelee !== undefined ? o.avantLExtrait : undefined);
    const places = placesEnEventail(joueurs.length, ouvert).map((p) => (ouvert ? { ...p, en: [p.en[0], T.clavier.eventail + remonte] as const } : p));
    objets.push(...dessinerLaTablee(joueurs, places, T.eventail.taille, regard, T.trouve, a.encrier.largeur));
  }
  // Le classement, en jeu : chacun sa ligne, son nom et ses points, sous la platine ; à plus de six, les premiers et soi. Le clavier
  // ouvert prend la place.
  else {
    const C = T.classement.piste;
    const lignes = lesPremiersEtToi(lignesDeLaPiste(a.textes, o), o.toi, C.parColonne);
    objets.push(...dessinerLeClassement(lignes, C, regard, a.textes, a.encrier.largeur, 'joueur'));
  }
  if (repondre.genre === 'choix') {
    objets.push(...etiquettesAToucher(a, regard, repondre.proposes, revelee, revelee !== undefined ? undefined : repondre.touchee));
    return objets;
  }
  if (revelee === undefined) {
    if (o.phrase === undefined)
      objets.push(
        ...etiquetteDeReponse(
          a,
          regard,
          repondre.tape,
          o.etat.piste?.trouve[o.toi] ?? [],
          repondre.mot,
          ouvert ? T.clavier.reponse + remonte : undefined,
        ),
      );
  }
  // La pochette de la réponse est au milieu du disque retourné : rien d'autre ne se pose à côté de la kraft.
  const M = T.message;
  if (o.phrase !== undefined) objets.push(...phrase(o.phrase, regard, a.encrier, M.en, M.largeur));
  if (ouvert) objets.push(clavier(regard, dessus));
  return objets;
}
