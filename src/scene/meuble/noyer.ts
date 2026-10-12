/**
 * Le dessus du meuble : du noyer, la nappe de lumière de la lampe en deux paliers,
 * et un veinage en longues facettes aux bouts émoussés. Une grande surface calme.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { ellipse, rectangle } from '../../lowpoly/contours';
import { facetteAPlat, peindre, type Facette } from '../../lowpoly/facette';
import { veine } from '../../lowpoly/formes/veine';
import { azimutDeLaLampe, type Nuance } from '../../lowpoly/ombrage';
import { decouper, placer, type Polygone } from '../../lowpoly/polygones';
import { moins, plus, scalaire, tourner, type Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { LAMPE } from '../../ressources/lampe';
import { MEUBLE } from '../../ressources/meuble';
import { calque, peinture, type Calque } from '../calque';

/** Portion du meuble à dessiner, dans son plan. */
export interface Zone {
  readonly x: number;
  readonly y: number;
  readonly largeur: number;
  readonly profondeur: number;
}

/** Le grand axe de la nappe suit la lumière : c'est l'azimut de la lampe. */
const AXE_DE_LA_NAPPE = azimutDeLaLampe();

/** Niveau de lumière d'un point du bois : 0 hors de la nappe, puis un de plus par palier qui le contient. */
function niveauDeLumiere(p: Vec2): number {
  const [long, travers] = tourner(moins(p, LAMPE.nappe.centre), -AXE_DE_LA_NAPPE);
  return LAMPE.nappe.paliers.filter(([grand, petit]) => scalaire([long / grand, travers / petit], [long / grand, travers / petit]) <= 1).length;
}

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

interface Troncon {
  readonly contour: Polygone;
  /** Le niveau de lumière où il tombe tout entier. */
  readonly niveau: number;
  readonly nuance: Nuance;
}

/**
 * Une veine que le bord de la nappe traverse est refaite en tronçons, chacun tout entier dans un seul niveau
 * de lumière et fini comme une veine : jamais de morceau coupé en biseau, donc jamais de pointe.
 */
function troncons(v: Veine): Troncon[] {
  const surLaVeine = (long: number, travers: number): Vec2 => plus(v.milieu, tourner([long, travers], v.angle));
  // Le niveau d'une tranche de la veine, ou -1 si le bord de la nappe passe dedans.
  const niveauEn = (long: number): number => {
    const dessus = niveauDeLumiere(surLaVeine(long, -v.epaisseur / 2));
    return dessus === niveauDeLumiere(surLaVeine(long, v.epaisseur / 2)) ? dessus : -1;
  };
  const morceaux: Troncon[] = [];
  const fin = v.longueur / 2;
  let debut = -fin;
  let niveau = niveauEn(debut);
  const fermer = (jusqua: number): void => {
    if (niveau >= 0 && jusqua - debut >= Math.min(v.longueur, VEINAGE.tronconMinimal)) {
      const contour = placer(veine(jusqua - debut, v.epaisseur), { en: surLaVeine((debut + jusqua) / 2, 0), angle: v.angle });
      morceaux.push({ contour, niveau, nuance: v.nuance });
    }
  };
  for (let long = -fin + VEINAGE.pas; long < fin; long += VEINAGE.pas) {
    const ici = niveauEn(long);
    if (ici === niveau) continue;
    fermer(long - VEINAGE.pas);
    debut = long;
    niveau = ici;
  }
  fermer(fin);
  return morceaux;
}

export function dessinerLeNoyer(zone: Zone, densite: Densite): Calque {
  const fond = rectangle(zone.x, zone.y, zone.largeur, zone.profondeur);
  const paliers = LAMPE.nappe.paliers.map((rayons) => decouper(ellipse(LAMPE.nappe.centre, rayons, densite.pansDeNappe, AXE_DE_LA_NAPPE), fond));
  const veinage = veines(zone, densite).flatMap(troncons);

  // Du bois nu vers le cœur de la nappe : chaque niveau recouvre le précédent, puis reçoit ses veines.
  const contenu = [fond, ...paliers].flatMap((fenetre, niveau) => {
    const teinte = MEUBLE.noyer[niveau];
    if (teinte === undefined) throw new Error(`La nappe a ${LAMPE.nappe.paliers.length} paliers : il faut une teinte de bois par niveau.`);
    if (fenetre.length === 0) return [];
    const facettes: Facette[] = veinage
      .filter((morceau) => morceau.niveau === niveau)
      .map((morceau) => facetteAPlat(morceau.contour, 0, teinte, morceau.nuance));
    return [peinture(peindre([facetteAPlat(fenetre, 0, teinte)])), peinture(peindre(facettes))];
  });
  return calque('noyer', contenu, { role: 'decor' });
}
