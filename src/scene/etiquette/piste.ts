/**
 * L'étiquette du disque mystère : le numéro de la piste en arc, « sur 15 » et la face de part et d'autre du trou,
 * le nom de la maison en bas. À l'arrêt on la lit ; dès que le disque tourne, son texte laisse la place à ses arcs.
 */

import { ETIQUETTE } from '../../ressources/etiquette';
import type { Textes } from '../../ressources/textes';
import type { Mesure } from '../calque';
import type { EtiquetteDeDisque } from '../disque';
import { remplir } from '../phrases';
import { enArcs } from './arcs';
import { ecrireUneEtiquette } from './lignes';
import { papierDEtiquette, type Etiquette } from './papier';

/** L'étiquette d'une piste, à l'arrêt et à l'endroit. */
export function etiquetteDeLaPiste(
  e: Etiquette,
  textes: Textes,
  piste: { readonly numero: number; readonly sur: number },
  mesurer: Mesure,
): EtiquetteDeDisque {
  const lignes = {
    haut: { contenu: remplir(textes.piste.numero, { numero: piste.numero }), role: 'titrage', auPlus: 'titre' },
    mentions: [remplir(textes.piste.sur, { total: piste.sur }), textes.logo.face],
    bas: { contenu: textes.logo.nom, role: 'technique', auPlus: 'gravure' },
  } as const;
  const texte = ecrireUneEtiquette(e, lignes, mesurer);
  return {
    angle: 0,
    papier: papierDEtiquette(e),
    texte,
    arcs: { courts: enArcs(e, texte, mesurer, ETIQUETTE.arcs.courts), longs: enArcs(e, texte, mesurer, ETIQUETTE.arcs.longs) },
    montre: 'texte',
  };
}
