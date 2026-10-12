/**
 * Ce qu'une étiquette de disque écrit, toujours aux mêmes places : une ligne en arc en haut, deux mentions
 * de part et d'autre du trou, une ligne en arc en bas. Le logo et le numéro d'une piste s'écrivent ainsi.
 * Toutes les mesures suivent le rayon : la même fonction écrit l'étiquette de la platine et le logo en grand.
 */

import { ETIQUETTE } from '../../ressources/etiquette';
import { CORPS, type Echelon, type RoleDeTexte } from '../../ressources/typo';
import type { Mesure, Texte } from '../calque';
import { ENCRE_SUR_MIEL, ligneDeBaseSous, ligneSurMiel } from '../encre';
import { faireTenir, placeSurUnArc } from '../texte';
import { CENTRE_DE_L_ETIQUETTE as CENTRE, echelleDEtiquette, type Etiquette } from './papier';

/** Une ligne en arc : ce qu'elle dit, dans quel caractère, et le plus grand corps qu'elle peut prendre. */
export interface LigneEnArc {
  readonly contenu: string;
  readonly role: RoleDeTexte;
  readonly auPlus: Echelon;
}

export interface LignesDEtiquette {
  readonly haut: LigneEnArc;
  /** Les deux mentions du centre : au-dessus du trou, puis au-dessous. */
  readonly mentions?: readonly [string, string];
  readonly bas?: LigneEnArc;
}

export function ecrireUneEtiquette(e: Etiquette, lignes: LignesDEtiquette, mesurer: Mesure): Texte[] {
  const r = e.rayon;
  const echelle = echelleDEtiquette(e);
  const { haut, mentions, bas } = ETIQUETTE.lignes;

  const enArc = (ligne: LigneEnArc, place: { rayon: number; ouverture: number }, milieu: number, lecture: 'dessus' | 'dessous'): Texte => ({
    genre: 'texte',
    role: ligne.role,
    ...faireTenir(mesurer, ligne, placeSurUnArc(r * place.rayon, place.ouverture), ligne.auPlus, echelle),
    en: CENTRE,
    ancrage: 'milieu',
    arc: { centre: CENTRE, rayon: r * place.rayon, milieu, lecture },
    ...ENCRE_SUR_MIEL,
  });
  // Les deux mentions du centre : à égale distance du trou, l'une au-dessus, l'autre au-dessous.
  const corps = CORPS.gravure * echelle;
  const mention = (contenu: string, y: number): Texte => ligneSurMiel(contenu, 'technique', corps, y);

  return [
    enArc(lignes.haut, haut, -90, 'dessus'),
    ...(lignes.mentions !== undefined
      ? [mention(lignes.mentions[0], -r * mentions.ecart), mention(lignes.mentions[1], ligneDeBaseSous(r * mentions.ecart, corps))]
      : []),
    ...(lignes.bas !== undefined ? [enArc(lignes.bas, bas, 90, 'dessous')] : []),
  ];
}
