/**
 * La pose d'une piste : où est chaque pièce qui bouge à un instant donné. C'est tout ce que le dessin a besoin de savoir
 * pour la dessiner, et tout ce que le mouvement règle d'une image à la suivante.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import { PASTILLES } from '../../ressources/pastilles';
import { PLATINE } from '../../ressources/platine';
import { seulement, type FaceDEtiquette, type FonduDEtiquette } from '../etiquette/fondu';
import type { PoseDuBras } from '../platine';
import { HALTES_DU_DISQUE } from './emplacements';

export interface PoseDeLaPiste {
  readonly disque: {
    /** Son centre sur le meuble, et la hauteur de son dessous au-dessus du bois. */
    readonly en: Vec2;
    readonly hauteur: number;
    /** De combien il est retourné, en degrés : 0, son recto ; 180, son verso. */
    readonly retourne: number;
    /** Son étiquette : l'angle de son texte, celui de ses arcs longs, et ce qu'elle montre. */
    readonly etiquette: { readonly angle: number; readonly angleDesArcs: number; readonly montre: FaceDEtiquette; readonly fondu: FonduDEtiquette };
  };
  /** Angle des repères du plateau, tels qu'on les voit : ils semblent dériver, puis se figent. */
  readonly reperes: number;
  readonly bras: PoseDuBras;
  /** Le levier : 0, baissé ; 1, levé. */
  readonly levier: number;
  /** La pastille du décompte : le chiffre qu'elle montre (ou rien : elle n'est pas là), sa hauteur, sa taille, et ce dont elle a filé. */
  readonly pastille: { readonly montre: string | undefined; readonly hauteur: number; readonly echelle: number; readonly glisse: number };
  /** Ce dont le disque a entraîné la pochette kraft en en sortant, en px, du côté de son ouverture. */
  readonly kraft: { readonly entrainee: number };
  /** Ce dont le regard a glissé sur le meuble depuis son arrêt sur la platine, en px vers la droite. */
  readonly regard: number;
}

/** Avant la piste : le disque dans sa pochette kraft, le plateau vide et à l'arrêt, le bras sur son repos, pas de pastille. */
export const POSE_AVANT_LA_PISTE: PoseDeLaPiste = {
  disque: { ...HALTES_DU_DISQUE.dansLaPochette, retourne: 0, etiquette: { angle: 0, angleDesArcs: 0, ...seulement('texte') } },
  reperes: 0,
  bras: { angle: PLATINE.bras.repos, leve: 0 },
  levier: 0,
  pastille: { montre: undefined, hauteur: PASTILLES.decompte.arrivee.hauteur, echelle: PASTILLES.decompte.arrivee.echelle, glisse: 0 },
  kraft: { entrainee: 0 },
  regard: 0,
};
