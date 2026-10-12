/**
 * Les mesures que la page tient à jour : ce que l'atelier a mesuré sur cet appareil, écrit à sa place dans la page.
 */

import { ecrire } from '../../nombres.fr';
import { ANCRES, MESURES_AFFICHEES, type MesureAffichee } from '../ancres';
import type { Mesures } from '../atelier';
import type { Compte } from '../compteur';
import { LEGENDES } from '../legendes.fr';
import { dire, ecrireDans } from './dom';

const M = LEGENDES.mesures;

/** Les toiles se pèsent en millions de px. */
const PX_PAR_MPX = 1e6;

/** Un temps en ms : au dixième sous dix, à l'unité au-delà. */
const ms = (valeur: number): string => ecrire(valeur, valeur < 10 ? 1 : 0);

/** Ce qu'un compteur a retenu, en ms : rien tant qu'il n'a rien noté, et le nombre d'images sur lequel il porte vraiment. */
function direUnCompte(compte: Compte): string {
  if (compte.sur === 0) return M.rienEncore;
  if (compte.sur === 1) return dire(M.msSurUneImage, { valeur: ms(compte.moyenne) });
  return dire(M.msAuPire, { valeur: ms(compte.moyenne), pire: ms(compte.auPire), images: compte.sur });
}

export function ecrireLesMesures(mesures: Mesures): void {
  const dites: Readonly<Record<MesureAffichee, string>> = {
    montage: dire(M.ms, { valeur: ms(mesures.montage) }),
    parImage: direUnCompte(mesures.parImage),
    entreDeux: direUnCompte(mesures.entreDeuxImages),
    toiles: dire(M.toilesPesees, { nombre: mesures.bilan.toiles, mpx: ecrire(mesures.bilan.pxDeToile / PX_PAR_MPX, 1) }),
  };
  for (const nom of MESURES_AFFICHEES) ecrireDans(document.querySelector(`[${ANCRES.mesure}="${nom}"]`), dites[nom]);
}
