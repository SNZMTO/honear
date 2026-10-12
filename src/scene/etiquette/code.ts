/**
 * L'étiquette du disque du salon : le code de la partie en arc, ce qu'il est et combien on est autour du meuble de part et d'autre
 * du trou, le nom de la maison en bas. Ceux qui arrivent le lisent sur le disque de l'hôte, ou le tapent.
 */

import { ETIQUETTE } from '../../ressources/etiquette';
import type { Textes } from '../../ressources/textes';
import type { Mesure } from '../calque';
import type { EtiquetteDeDisque } from '../disque';
import { remplir } from '../phrases';
import { enArcs } from './arcs';
import { ecrireUneEtiquette } from './lignes';
import { papierDEtiquette, type Etiquette } from './papier';

export function etiquetteDuCode(e: Etiquette, textes: Textes, code: string, joueurs: number, mesurer: Mesure): EtiquetteDeDisque {
  const texte = ecrireUneEtiquette(
    e,
    {
      haut: { contenu: code, role: 'titrage', auPlus: 'titre' },
      mentions: [textes.partie.code, remplir(textes.partie.autourDuMeuble, { nombre: joueurs })],
      bas: { contenu: textes.logo.nom, role: 'technique', auPlus: 'gravure' },
    },
    mesurer,
  );
  return {
    angle: 0,
    papier: papierDEtiquette(e),
    texte,
    arcs: { courts: enArcs(e, texte, mesurer, ETIQUETTE.arcs.courts), longs: enArcs(e, texte, mesurer, ETIQUETTE.arcs.longs) },
    montre: 'texte',
  };
}
