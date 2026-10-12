/**
 * La facture d'une scène montée : ce qui la fait telle, et qu'on ne peut pas changer sans la remonter. La finesse de son dessin,
 * ses ombres figées ou non, et la définition de ses toiles.
 */

import { DENSITES, type Densite } from '../ressources/densites';
import { MONTAGE } from '../ressources/ecran';
import type { Allegements } from './allegements';

export interface Facture {
  readonly densite: Densite;
  /** Vrai quand les paliers des ombres ne s'écartent plus : la scène est alors dessinée dans une autre pose de départ. */
  readonly ombresFigees: boolean;
  /** Px de toile par px de scène. */
  readonly definition: number;
}

/**
 * La facture que demandent des allègements, pour une scène montrée à cette échelle sur cet écran.
 * Ses toiles ont la définition de ce que l'écran montre vraiment d'un px de la scène, sans dépasser ce qui se voit.
 * @param densiteDeLEcran px de l'appareil par px de la page.
 */
export function factureVoulue(allegements: Allegements, echelle: number, densiteDeLEcran: number): Facture {
  const { auPlus, auMoinsEnLeger } = MONTAGE.definition;
  const pleine = Math.min(auPlus, densiteDeLEcran * echelle);
  return {
    densite: allegements.densiteSobre ? DENSITES.sobre : DENSITES.fine,
    ombresFigees: allegements.ombresFigees,
    definition: allegements.demiDefinition ? Math.min(pleine, Math.max(auMoinsEnLeger, pleine / 2)) : pleine,
  };
}

/** Vrai si deux scènes ont le même dessin : seule la définition de leurs toiles peut les séparer. */
export const memeDessin = (une: Facture, autre: Facture): boolean => une.densite === autre.densite && une.ombresFigees === autre.ombresFigees;

/** Vrai si ce sont la même facture, exactement : le même dessin, à la même définition. */
export const factureIdentique = (une: Facture, autre: Facture): boolean => memeDessin(une, autre) && une.definition === autre.definition;

/** Vrai si l'une de ces factures peut tenir lieu de l'autre : le même dessin, à une définition si proche qu'on ne refait pas les toiles pour elle. */
export const memeFacture = (une: Facture, autre: Facture): boolean =>
  memeDessin(une, autre) && Math.abs(une.definition - autre.definition) <= MONTAGE.tolerance * autre.definition;
