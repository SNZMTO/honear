/**
 * Ce qu'on pose autour de la piste, au téléphone : l'éventail des pochettes (ce que chacun a trouvé, puis ce que la piste lui a
 * rapporté), l'étiquette vierge où l'on tape ou les quatre étiquettes à toucher, la vraie pochette sortie de sous la kraft
 * à la révélation, la phrase d'un état, le clavier ouvert. Tout est placé dans le regard : ces objets restent à l'écran pendant
 * que le regard suit la piste.
 */

import { surLEcran } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { EtatDeLaPartie } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { MESURES_DE_POCHETTE } from '../../ressources/pochettes';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import { surLeBois, type Regard } from '../meuble';
import { dessinerLaVraiePochette } from '../pochette/dos';
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

/**
 * Où se pose l'image de la vraie pochette, quand la source en donne une : sur le dessus du carton qu'on a dessiné (sa vignette, en
 * attendant qu'elle arrive), en px dans le regard. Son centre, son côté (au bord du chanfrein), ses coins, son angle sur le meuble,
 * et l'écrasement de la profondeur, comme le carton.
 */
export function dessusDeLaVraiePochette(): {
  readonly centre: Vec2;
  readonly cote: number;
  readonly coin: number;
  readonly angle: number;
  readonly ecrasement: number;
} {
  const V = T.vraiePochette;
  const M = MESURES_DE_POCHETTE;
  const k = V.taille / M.cote;
  return { centre: [V.en[0], V.en[1] - M.tranche], cote: V.taille - 2 * M.chanfrein * k, coin: M.coin * k, angle: V.angle, ecrasement: ecrasement() };
}

/** Les objets posés autour de la piste, dans ce regard. */
export function autourDeLaPiste(a: Ecritoire, regard: Regard, o: AutourDeLaPiste): Calque[] {
  const { revelee, repondre } = o;
  const ouvert = repondre.genre === 'saisie' && repondre.clavier;
  const joueurs = eventail(o.etat, a.textes, revelee !== undefined ? 'points' : 'trouvailles', revelee !== undefined ? o.avantLExtrait : undefined);
  // Le clavier ouvert prend le bas de l'écran : l'éventail remonte au-dessus de l'étiquette, sans la kraft.
  const places = placesEnEventail(joueurs.length, ouvert).map((p) => (ouvert ? { ...p, en: [p.en[0], T.clavier.eventail] as const } : p));
  const objets: Calque[] = [...dessinerLaTablee(joueurs, places, T.eventail.taille, regard, T.trouve, a.encrier.largeur)];
  if (repondre.genre === 'choix') {
    objets.push(...etiquettesAToucher(a, regard, repondre.proposes, revelee, revelee !== undefined ? undefined : repondre.touchee));
    return objets;
  }
  if (revelee === undefined) {
    if (o.phrase === undefined)
      objets.push(
        ...etiquetteDeReponse(a, regard, repondre.tape, o.etat.piste?.trouve[o.toi] ?? [], repondre.mot, ouvert ? T.clavier.reponse : undefined),
      );
  } else if ('vignette' in revelee.pochette) {
    // La vraie pochette a glissé de sous la kraft : elle est posée à côté, de travers.
    const V = T.vraiePochette;
    const vraie = dessinerLaVraiePochette(
      revelee.pochette.vignette,
      { nom: 'pochette-vraie', centre: surLeBois(regard, V.en[0], V.en[1]), angle: V.angle, taille: V.taille },
      'vraie',
    );
    objets.push(vraie.ombre, vraie.pochette);
  }
  const M = revelee !== undefined ? T.message.aCoteDeLaVraie : T.message;
  if (o.phrase !== undefined) objets.push(...phrase(o.phrase, regard, a.encrier, M.en, M.largeur));
  if (ouvert) objets.push(clavier(regard));
  return objets;
}
