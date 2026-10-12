/**
 * Le QR code du salon, imprimé à l'encre expresso sur la pochette kraft : qui le vise arrive dans la room, code compris.
 * Ses modules sombres, réunis en bandes horizontales : peu de polygones, tous droits. Le codage lui-même est confié à une petite
 * bibliothèque éprouvée.
 */

import qrcode from 'qrcode-generator';
import { rectangle } from '../lowpoly/contours';
import type { Polygone } from '../lowpoly/polygones';

/** Les bandes sombres d'un QR code de ce côté, centré sur l'origine, sans sa marge blanche. */
export function bandesDuQr(texte: string, cote: number): Polygone[] {
  const qr = qrcode(0, 'M');
  qr.addData(texte);
  qr.make();
  const n = qr.getModuleCount();
  const module = cote / n;
  const bandes: Polygone[] = [];
  for (let ligne = 0; ligne < n; ligne++) {
    let debut = -1;
    for (let colonne = 0; colonne <= n; colonne++) {
      const sombre = colonne < n && qr.isDark(ligne, colonne);
      if (sombre && debut < 0) debut = colonne;
      if (!sombre && debut >= 0) {
        bandes.push(rectangle(-cote / 2 + debut * module, -cote / 2 + ligne * module, (colonne - debut) * module, module));
        debut = -1;
      }
    }
  }
  return bandes;
}
