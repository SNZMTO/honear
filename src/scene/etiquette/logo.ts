/**
 * L'étiquette de l'accueil, et donc le logo : « Honear » écrit en arc sur le papier miel,
 * les deux mentions d'un vrai disque de part et d'autre du trou, et une troisième en bas.
 */

import type { Textes } from '../../ressources/textes';
import type { Dessin, Mesure } from '../calque';
import type { EtiquetteDeDisque } from '../disque';
import { ecrireUneEtiquette } from './lignes';
import { papierDEtiquette, type Etiquette } from './papier';

/** L'étiquette du disque de l'accueil : à l'arrêt, à l'endroit. Ce disque ne tourne pas : elle n'a pas d'arcs. */
export function etiquetteDuLogo(e: Etiquette, textes: Textes, mesurer: Mesure): EtiquetteDeDisque {
  const lignes = {
    haut: { contenu: textes.logo.nom, role: 'titrage', auPlus: 'titre' },
    mentions: [textes.logo.vitesse, textes.logo.face],
    bas: { contenu: textes.logo.mention, role: 'technique', auPlus: 'gravure' },
  } as const;
  return { angle: 0, papier: papierDEtiquette(e), texte: ecrireUneEtiquette(e, lignes, mesurer), montre: 'texte' };
}

/** La même, d'un seul tenant : le logo montré seul. */
export function faceDuLogo(e: Etiquette, textes: Textes, mesurer: Mesure): Dessin[] {
  const { papier, texte } = etiquetteDuLogo(e, textes, mesurer);
  return [...papier, ...texte];
}
