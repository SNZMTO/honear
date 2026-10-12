/**
 * Le dos d'une pochette, et la vraie pochette d'un titre : le même carton que celui d'un joueur, autrement imprimé.
 * Le dos se montre quand un joueur a perdu sa connexion : sa pochette s'est retournée, et attend qu'il revienne.
 * La vraie pochette, c'est celle du titre, révélée : dans les maquettes, une vignette la remplace.
 */

import { rectangle } from '../../lowpoly/contours';
import { tonAPlat } from '../../lowpoly/ombrage';
import { MESURES_DE_POCHETTE as M } from '../../ressources/pochettes';
import type { Vignette } from '../../ressources/vignettes';
import { aplat, type Dessin } from '../calque';
import { dessinerUneVignette } from '../vignette';
import { contourDuCarton } from './carton';
import { poserUnCarton, type PochetteDessinee, type PoseDePochette } from './index';

/** Le dos imprimé : du papier crème, deux colonnes de titres en lignes fines, comme au dos d'un vrai disque. */
function dosImprime(taille: number): Dessin[] {
  const k = taille / M.cote;
  const D = M.dos;
  const lignes = [-1, 1].flatMap((cote) =>
    Array.from({ length: D.lignes }, (_, rang) => {
      const largeur = (D.largeur - (rang % 3) * D.raccourci) * k;
      const x = cote < 0 ? -D.colonne * k - largeur / 2 : D.colonne * k - largeur / 2;
      return rectangle(x, (D.haut + rang * D.pas) * k, largeur, D.epaisseur * k);
    }),
  );
  return [aplat([contourDuCarton(taille)], 'creme', tonAPlat()), aplat(lignes, 'kraft', tonAPlat(-1))];
}

export function dessinerLeDosDUnePochette(
  pose: Pick<PoseDePochette, 'nom' | 'centre' | 'angle' | 'taille' | 'leve'>,
  usure: string,
): PochetteDessinee {
  return poserUnCarton(pose, dosImprime(pose.taille), [], usure);
}

export function dessinerLaVraiePochette(
  vignette: Vignette,
  pose: Pick<PoseDePochette, 'nom' | 'centre' | 'angle' | 'taille' | 'leve'>,
  usure: string,
): PochetteDessinee {
  return poserUnCarton(pose, dessinerUneVignette(vignette, contourDuCarton(pose.taille), [0, 0], pose.taille), [], usure);
}
