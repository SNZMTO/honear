/**
 * Le dessus du meuble : du noyer, la nappe de lumière de la lampe en fondu, et un veinage en longues facettes aux bouts
 * émoussés. Une grande surface calme.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { ellipse, rectangle } from '../../lowpoly/contours';
import { facetteAPlat, peindre, type Facette } from '../../lowpoly/facette';
import { veine } from '../../lowpoly/formes/veine';
import { azimutDeLaLampe, type Nuance } from '../../lowpoly/ombrage';
import { decouper, placer } from '../../lowpoly/polygones';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { LAMPE } from '../../ressources/lampe';
import { MEUBLE } from '../../ressources/meuble';
import { aplat, aPlatSurLeMeuble, calque, peinture, type Calque } from '../calque';

/** Portion du meuble à dessiner, dans son plan. */
export interface Zone {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly profondeur: number;
}

/** Le grand axe de la nappe suit la lumière : c'est l'azimut de la lampe. */
const AXE_DE_LA_NAPPE = azimutDeLaLampe();

interface Veine {
  readonly milieu: Vec2;
  readonly longueur: number;
  readonly epaisseur: number;
  readonly angle: number;
  readonly nuance: Nuance;
}

const VEINAGE = MEUBLE.veinage;
/** D'une rangée à la suivante, le germe avance d'un grand nombre premier : deux rangées voisines tirent des suites sans rapport. */
const D_UNE_RANGEE_A_L_AUTRE = 7919;
/** Ce qu'on dessine de veines au-delà de la zone demandée, en px : une veine à cheval sur son bord n'est pas coupée net. */
const DEBORD = 40;

/** Les veines suivent la longueur du meuble, rangée par rangée, sans jamais se toucher. */
function veines(zone: Zone, densite: Densite): Veine[] {
  const liste: Veine[] = [];
  const pas = densite.pasDesVeines;
  const [fin, epais] = VEINAGE.epaisseur.bornes;
  // Les rangées partent d'une grille fixe du meuble : la même veine tombe au même endroit quelle que soit la zone.
  const premiere = Math.floor(zone.y / pas) - 1;
  const derniere = Math.ceil((zone.y + zone.profondeur) / pas) + 1;
  for (let rangee = premiere; rangee <= derniere; rangee++) {
    const propre = hasard(rangee * D_UNE_RANGEE_A_L_AUTRE + VEINAGE.germe);
    const y = rangee * pas + propre.entre(-VEINAGE.flottement.rangee, VEINAGE.flottement.rangee) * pas;
    let x = -propre.entre(0, VEINAGE.longueur[1]);
    while (x < zone.x + zone.largeur + DEBORD) {
      const longueur = propre.entre(...VEINAGE.longueur);
      const epaisseur = Math.min(epais, Math.max(fin, pas * propre.entre(...VEINAGE.epaisseur.part)));
      const nuance: Nuance = propre.suivant() < VEINAGE.claires ? 1 : -1;
      const milieu: Vec2 = [x + longueur / 2, y + propre.entre(-VEINAGE.flottement.veine, VEINAGE.flottement.veine)];
      const angle = propre.entre(-VEINAGE.flottement.inclinaison, VEINAGE.flottement.inclinaison);
      if (milieu[0] + longueur / 2 > zone.x - DEBORD) liste.push({ milieu, longueur, epaisseur, angle, nuance });
      x += longueur + propre.entre(...VEINAGE.ecart);
    }
  }
  return liste;
}

export function dessinerLeNoyer(zone: Zone, densite: Densite): Calque {
  const fond = rectangle(zone.x, zone.y, zone.largeur, zone.profondeur);
  const { nu, eclaire } = MEUBLE.noyer;
  const veinage: Facette[] = veines(zone, densite).map((v) =>
    facetteAPlat(placer(veine(v.longueur, v.epaisseur), { en: v.milieu, angle: v.angle }), 0, nu, v.nuance),
  );
  // La lumière : des ellipses de bois clair, à peine opaques, de la plus large à la plus étroite ; leur pile éclaircit le bois et
  // ses veines peu à peu vers le cœur de la nappe, en fondu, sans marche qu'on voie.
  const N = LAMPE.nappe;
  // Chacune entière (découpée au bord de la zone, elle y ferait des pointes) ; celles qui ne touchent pas la zone ne se dessinent pas.
  const lumiere = Array.from({ length: N.pas }, (_, rang) => {
    const part = rang / Math.max(1, N.pas - 1);
    const rayons: Vec2 = [N.du[0] + part * (N.au[0] - N.du[0]), N.du[1] + part * (N.au[1] - N.du[1])];
    return ellipse(N.centre, rayons, densite.pansDeNappe, AXE_DE_LA_NAPPE);
  })
    .filter((contour) => decouper(contour, fond).length > 0)
    .map((contour) => aplat([contour], eclaire, TON_DE_BASE, N.opacite));
  // Les ellipses sont dans le plan du meuble : on les y couche, comme le bois.
  return calque(
    'noyer',
    [peinture(peindre([facetteAPlat(fond, 0, nu)])), peinture(peindre(veinage)), aPlatSurLeMeuble('noyer/lumiere', 0, lumiere)],
    {
      role: 'decor',
    },
  );
}
