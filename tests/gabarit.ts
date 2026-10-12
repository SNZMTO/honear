/**
 * La page de l'atelier telle que son gabarit l'écrit, pour les tests qui la lisent ou la posent sur une fausse page :
 * ses polices factices, sa liste des temps, un script qui ne fait rien.
 */

import type { Banc } from '../src/planche/etape2/banc';
import { ecrireLaPage } from '../src/planche/etape2/gabarit';
import { seanceDExemple, seanceEntiere } from '../src/planche/etape2/seance';
import { listeDesTemps } from '../src/planche/etape2/temps';
import { TEXTES } from '../src/ressources/textes.fr';
import { CARACTERES, ROLES_DE_TEXTE } from '../src/ressources/typo';

/** Des polices de page qui n'en sont pas : le gabarit n'en lit que le nom. */
export const POLICES_FACTICES = Object.fromEntries(ROLES_DE_TEXTE.map((role) => [CARACTERES[role].web, 'AAAA']));

/** La liste des temps de la séance d'exemple, telle que la page l'affiche. */
export const TEMPS_DE_LA_SEANCE = listeDesTemps(seanceEntiere(seanceDExemple(TEXTES)));

/** @param bancs les relevés du banc que la page affiche. */
export const pageDuGabarit = (bancs: readonly Banc[]): string =>
  ecrireLaPage({ textes: TEXTES, polices: POLICES_FACTICES, enchainements: TEMPS_DE_LA_SEANCE, bancs, script: 'void 0' });
