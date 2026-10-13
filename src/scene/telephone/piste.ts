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
import { CORPS } from '../../ressources/typo';
import type { Textes } from '../../ressources/textes';
import { VERSO } from '../../ressources/verso';
import type { Calque } from '../calque';
import { dessinerLeClassement, lesPremiersEtToi, lignesDuClassement, type LigneDuClassement } from '../classement';
import type { Regard } from '../meuble';
import type { PoseDeLaPiste } from '../piste/pose';
import { regardDeLaPiste } from '../piste/regard';
import { dessinerLaTablee, eventail, placesEnEventail } from '../tablee';
import { phrase, type Ecritoire } from './pieces';
import { clavier, etiquetteDeReponse, etiquettesAToucher, reponseLaPlusGrande } from './reponse';

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
      /** Vrai un instant après qu'on a validé ce qu'on a tapé : l'étiquette s'enfonce, la réponse part. */
      readonly enfoncee?: boolean;
      /**
       * Vrai quand c'est le vrai clavier du téléphone qui s'ouvre : il se montre lui-même, on ne le dessine pas (dessiné, il se
       * voyait le temps qu'il monte ou qu'il descende, moins large que l'écran). Sans lui, le clavier qui tape tout seul se dessine.
       */
      readonly vrai?: boolean;
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

/** Où se tient l'étiquette, et l'éventail, quand le clavier est ouvert : remontés au-dessus de lui. */
function auDessusDuClavier(regard: Regard, o: AutourDeLaPiste): { readonly ouvert: boolean; readonly dessus: number; readonly remonte: number } {
  const { repondre } = o;
  const ouvert = repondre.genre === 'saisie' && repondre.clavier;
  // Un vrai clavier plus haut qu'un clavier ordinaire remonte l'éventail et l'étiquette d'autant : ils restent au-dessus de lui.
  const dessus = dessusDuClavier(regard, repondre.genre === 'saisie' ? repondre.dessus : undefined);
  return { ouvert, dessus, remonte: dessus - (regard.hauteur - T.clavier.hauteur) };
}

/**
 * La tablée de la piste : le classement, sous la platine (à plus de six, les premiers et soi) ; ou l'éventail des pochettes, quand
 * le clavier ouvert prend la place, ou que le classement se lit ailleurs. Elle ne change qu'avec les points et les trouvailles.
 * @param classementAilleurs vrai quand le classement se lit ailleurs (sous le bac, sur un grand écran).
 */
export function tableeDeLaPiste(a: Ecritoire, regard: Regard, o: AutourDeLaPiste, classementAilleurs = false): Calque[] {
  const { ouvert, remonte } = auDessusDuClavier(regard, o);
  if (ouvert || classementAilleurs) {
    // Le clavier ouvert prend le bas de l'écran : l'éventail remonte au-dessus de l'étiquette, sans la kraft.
    const revelee = o.revelee !== undefined;
    const joueurs = eventail(o.etat, a.textes, revelee ? 'points' : 'trouvailles', revelee ? o.avantLExtrait : undefined);
    const places = placesEnEventail(joueurs.length, ouvert).map((p) => (ouvert ? { ...p, en: [p.en[0], T.clavier.eventail + remonte] as const } : p));
    return dessinerLaTablee(joueurs, places, T.eventail.taille, regard, T.trouve, a.encrier.largeur);
  }
  const C = T.classement.piste;
  return dessinerLeClassement(lesPremiersEtToi(lignesDeLaPiste(a.textes, o), o.toi, C.parColonne), C, regard, a.textes, a.encrier.largeur, 'joueur');
}

/**
 * Ce qu'on touche et ce qu'on lit pendant la piste : l'étiquette vierge où l'on tape (enfoncée un instant quand la réponse part),
 * ou les quatre étiquettes à toucher ; la phrase d'un état ; le clavier ouvert. Cela change à chaque lettre tapée.
 */
export function pouceDeLaPiste(a: Ecritoire, regard: Regard, o: AutourDeLaPiste): Calque[] {
  const { revelee, repondre } = o;
  const { ouvert, dessus, remonte } = auDessusDuClavier(regard, o);
  const objets: Calque[] = [];
  if (repondre.genre === 'choix') {
    objets.push(...etiquettesAToucher(a, regard, repondre.proposes, revelee, revelee !== undefined ? undefined : repondre.touchee));
    return objets;
  }
  if (revelee === undefined && o.phrase === undefined)
    objets.push(
      ...etiquetteDeReponse(
        a,
        regard,
        repondre.tape,
        o.etat.piste?.trouve[o.toi] ?? [],
        repondre.mot,
        ouvert ? T.clavier.reponse + remonte : undefined,
        undefined,
        repondre.enfoncee === true,
      ),
    );
  // La pochette de la réponse est au milieu du disque retourné : rien d'autre ne se pose à côté de la kraft.
  const M = T.message;
  if (o.phrase !== undefined) objets.push(...phrase(o.phrase, regard, a.encrier, M.en, M.largeur));
  if (ouvert && !(repondre.genre === 'saisie' && repondre.vrai === true)) objets.push(clavier(regard, dessus));
  return objets;
}

/**
 * Ce qu'on touche, à la plus grande place qu'il puisse prendre pendant cette piste : l'étiquette vierge pleine sur toutes ses
 * lignes, ses trois pastilles collées et le plus long de ses mots ; ou les quatre étiquettes du 4 choix ; et la phrase d'un état,
 * s'il y en a une. Ce qui doit s'en tenir à l'écart (le décor de saison), ou glisser avec lui (sur un grand écran), s'en sert : cela
 * ne change pas d'une lettre tapée à l'autre.
 */
export function pouceAuPlusGrand(a: Ecritoire, regard: Regard, o: AutourDeLaPiste): Calque[] {
  const { repondre } = o;
  const { ouvert, dessus, remonte } = auDessusDuClavier(regard, o);
  const objets: Calque[] = [];
  if (repondre.genre === 'choix') objets.push(...etiquettesAToucher(a, regard, repondre.proposes, undefined));
  else {
    const mots = [a.textes.pastilles.presque, a.textes.piste.raye];
    const mot = mots.reduce((long, m) =>
      a.encrier.largeur({ contenu: m, role: 'techniqueFort', corps: CORPS.mention }) >
      a.encrier.largeur({ contenu: long, role: 'techniqueFort', corps: CORPS.mention })
        ? m
        : long,
    );
    const y = ouvert ? T.clavier.reponse + remonte : undefined;
    objets.push(...etiquetteDeReponse(a, regard, reponseLaPlusGrande(a.encrier.largeur), ['artiste', 'titre', 'feat'], mot, y));
  }
  const M = T.message;
  if (o.phrase !== undefined) objets.push(...phrase(o.phrase, regard, a.encrier, M.en, M.largeur));
  if (ouvert) objets.push(clavier(regard, dessus));
  return objets;
}

/**
 * Les objets posés autour de la piste, dans ce regard : la tablée, puis ce qu'on touche.
 * @param classementAilleurs vrai quand le classement se lit ailleurs (sous le bac, sur un grand écran) : ici, l'éventail des pochettes.
 */
export const autourDeLaPiste = (a: Ecritoire, regard: Regard, o: AutourDeLaPiste, classementAilleurs = false): Calque[] => [
  ...tableeDeLaPiste(a, regard, o, classementAilleurs),
  ...pouceDeLaPiste(a, regard, o),
];
