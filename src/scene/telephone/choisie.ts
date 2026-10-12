/**
 * Les playlists d'un genre, aux « Prêtes à jouer » : quand on touche un intercalaire du bac, ses playlists s'étalent au milieu de
 * l'écran, chacune un disque (son étiquette à la couleur du genre) et son nom sur un papier. Les pochettes sont les joueurs ; les
 * disques, la musique. Celle qu'on choisit se soulève. On touche un disque ou son papier.
 */

import { cercle } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { disque } from '../../lowpoly/formes/disque';
import { COULEURS_DES_THEMES, type CleDeTheme } from '../../ressources/bac';
import type { NomDeTeinte } from '../../ressources/palette';
import { RECOMPENSES } from '../../ressources/recompenses';
import { TABLEE } from '../../ressources/tablee';
import { calque, peinture, type Calque } from '../calque';
import { surLeBois, type Regard } from '../meuble';
import { ombreAuPied } from '../ombre';
import { papier, type Ecritoire } from './pieces';

const L = TABLEE.telephone.bac.playlists;

/** Vrai si cette clé est celle d'un thème du bac. */
export const estUnTheme = (cle: string): cle is CleDeTheme => cle in COULEURS_DES_THEMES;

/** Une playlist proposée : son nom, et combien de titres on peut en jouer. */
export interface PlaylistProposee {
  readonly titre: string;
  readonly total: number;
}

/** Un disque de playlist, à plat sur le bois, son étiquette de cette teinte ; soulevé de `leve` px s'il est choisi. */
export function disqueDePlaylist(
  nom: `disque-${string}`,
  regard: Regard,
  en: readonly [number, number],
  teinte: NomDeTeinte,
  leve: number,
  rayon: number = L.disque.rayon,
): Calque[] {
  const centre = surLeBois(regard, en[0], en[1]);
  const maille = disque({
    centre,
    hauteur: RECOMPENSES.epaisseur,
    pans: RECOMPENSES.pans,
    anneaux: [
      { de: rayon, a: rayon * RECOMPENSES.etiquette, teinte: 'vinyle', fini: 'sillons' },
      { de: rayon * RECOMPENSES.etiquette, a: 0, teinte },
    ],
  });
  return [
    ombreAuPied(`${nom}/ombre`, {
      silhouettes: [cercle(centre, rayon, RECOMPENSES.pans)],
      hauteur: RECOMPENSES.epaisseur + leve,
      support: 0,
      paliers: 2,
    }),
    calque(nom, [peinture(peindre(maille))], { role: 'image', ...(leve !== 0 ? { transformations: [{ genre: 'glisser', de: [0, -leve] }] } : {}) }),
  ];
}

/**
 * Les playlists proposées pour ce genre, une par rang, de haut en bas : « disque-playlist-n » et « etiquette-playlist-n », de 1 à
 * n. Celle de rang `choisie` se soulève, et son nom s'écrit plus appuyé.
 */
export function playlistsDuGenre(
  a: Ecritoire,
  regard: Regard,
  theme: CleDeTheme,
  proposees: readonly PlaylistProposee[],
  choisie: number | undefined,
): Calque[] {
  return proposees.slice(0, L.y.length).flatMap((p, rang) => {
    const y = L.y[rang] ?? 0;
    const elue = rang === choisie;
    const nom = papier(
      `etiquette-playlist-${rang + 1}`,
      regard,
      [L.papier.x, y],
      L.papier.largeur,
      L.angles[rang] ?? 0,
      [{ contenu: p.titre, role: elue ? 'techniqueFort' : 'technique', auPlus: 'mention' }],
      a.encrier,
      { ancre: 'debut', role: 'mobile' },
    ).calques;
    return [...disqueDePlaylist(`disque-playlist-${rang + 1}`, regard, [L.disque.x, y], COULEURS_DES_THEMES[theme], elue ? L.leve : 0), ...nom];
  });
}
