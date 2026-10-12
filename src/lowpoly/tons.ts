/**
 * Les 5 tons d'une couleur, calculés à partir de sa valeur de base.
 * Le ton 2 est la valeur de base ; 0 est le plus sombre, 4 le plus clair.
 */

import { PALETTE, REGLAGE_DES_TONS, type NomDeTeinte } from '../ressources/palette';
import { hexDepuisOkLab, okLabDepuisHex } from './couleur';

export type IndiceDeTon = 0 | 1 | 2 | 3 | 4;
export type CinqTons = readonly [string, string, string, string, string];

export const TON_DE_BASE: IndiceDeTon = 2;

export interface ReglageDesTons {
  readonly pas: number;
  readonly lumiere: string;
  readonly chaleur: number;
  readonly penombre: string;
  readonly fraicheur: number;
  readonly clarteMin: number;
  readonly clarteMax: number;
}

export function cinqTons(base: string, reglage: ReglageDesTons = REGLAGE_DES_TONS): CinqTons {
  const centre = okLabDepuisHex(base);
  const lumiere = okLabDepuisHex(reglage.lumiere);
  const penombre = okLabDepuisHex(reglage.penombre);
  // Près du noir ou du blanc, on resserre les pas du côté qui manque de place.
  const pasClair = Math.min(reglage.pas, Math.max(0, reglage.clarteMax - centre.l) / 2);
  const pasSombre = Math.min(reglage.pas, Math.max(0, centre.l - reglage.clarteMin) / 2);

  const ton = (indice: IndiceDeTon): string => {
    const ecart = indice - TON_DE_BASE;
    if (ecart === 0) return base.toUpperCase();
    const cible = ecart > 0 ? lumiere : penombre;
    const part = Math.abs(ecart) * (ecart > 0 ? reglage.chaleur : reglage.fraicheur);
    return hexDepuisOkLab({
      l: centre.l + ecart * (ecart > 0 ? pasClair : pasSombre),
      a: centre.a + (cible.a - centre.a) * part,
      b: centre.b + (cible.b - centre.b) * part,
    });
  };
  return [ton(0), ton(1), ton(2), ton(3), ton(4)];
}

/** Les 5 tons de chaque couleur de la palette, calculés une fois. */
export const TEINTES: Readonly<Record<NomDeTeinte, CinqTons>> = Object.fromEntries(
  (Object.keys(PALETTE) as NomDeTeinte[]).map((nom) => [nom, cinqTons(PALETTE[nom])]),
) as Record<NomDeTeinte, CinqTons>;

/** La couleur d'une teinte à un ton donné. */
export const couleur = (teinte: NomDeTeinte, ton: IndiceDeTon = TON_DE_BASE): string => TEINTES[teinte][ton];
