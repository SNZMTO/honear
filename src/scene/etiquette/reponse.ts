/**
 * Ce qu'une étiquette de disque écrit quand c'est elle qui dit la réponse : le titre au-dessus du trou, sur une ou deux lignes
 * droites, et l'artiste au-dessous. Des lignes droites, parce qu'un titre se lit plus grand ainsi que sur un arc aussi court.
 */

import { ETIQUETTE } from '../../ressources/etiquette';
import type { Mesure, Texte } from '../calque';
import { ligneDeBaseSous, ligneSurMiel } from '../encre';
import { faireTenir, mettreEnLignes } from '../texte';
import { echelleDEtiquette, type Etiquette } from './papier';

export function ecrireUneReponse(e: Etiquette, reponse: { readonly titre: string; readonly artiste: string }, mesurer: Mesure): Texte[] {
  const r = e.rayon;
  const echelle = echelleDEtiquette(e);
  const { reponse: R, lignes: L } = ETIQUETTE;
  const titre = mettreEnLignes(mesurer, { contenu: reponse.titre, role: 'titrage' }, r * R.titre.place, 'texte', echelle, R.titre.lignes);
  const artiste = faireTenir(mesurer, { contenu: reponse.artiste, role: 'technique' }, r * R.artiste.place, 'texte', echelle);
  const ecart = r * L.mentions.ecart;
  const pas = titre.corps * R.titre.interligne;
  return [
    // La dernière ligne du titre est la plus proche du trou ; les autres montent au-dessus d'elle.
    ...titre.lignes.map((contenu, rang) => ligneSurMiel(contenu, 'titrage', titre.corps, -ecart - (titre.lignes.length - 1 - rang) * pas)),
    ligneSurMiel(artiste.contenu, 'technique', artiste.corps, ligneDeBaseSous(ecart, artiste.corps)),
  ];
}
