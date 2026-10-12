/**
 * Le plateau : un lourd cylindre d'aluminium, sa feutrine couleur miel,
 * et sur sa jante les repères stroboscopiques, seule partie qui tourne.
 * Les facettes claires de la jante restent du côté de la lampe.
 */

import { anneau, cercle, rectangle } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { contourDePlot, plot } from '../../lowpoly/formes/plot';
import { tonAPlat, tonDuFlanc } from '../../lowpoly/ombrage';
import { placer, type Polygone } from '../../lowpoly/polygones';
import { direction, fois, type Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { aplat, aPlatSurLeMeuble, peinture, type Calque, type Dessin } from '../calque';
import { uneFoisPar } from '../memoire';
import { etendueDeLOmbreAuPied, ombreAuPied, type Ombre } from '../ombre';
import { pile } from '../pile';
import { rotation, type Reglage } from '../reglage';
import { CENTRE_DU_PLATEAU, HAUTEURS } from './emplacements';

/** La feutrine : sa mince tranche, puis une grande surface calme, d'un seul ton, et deux rainures un ton plus sombre. */
function dessinerLaFeutrine(densite: Densite): Calque[] {
  const { rainures, largeurDeRainure } = PLATINE.feutrine;
  const pans = densite.pansDeDisque;
  const contour = cercle(CENTRE_DU_PLATEAU, PLATINE.plateau.gorge, pans);
  return [
    aPlatSurLeMeuble('feutrine/tranche', HAUTEURS.plateau, [aplat([contour], 'miel', tonDuFlanc())]),
    aPlatSurLeMeuble('feutrine', HAUTEURS.feutrine, [
      aplat([contour], 'miel', tonAPlat()),
      aplat(
        rainures.flatMap((rayon) => anneau(CENTRE_DU_PLATEAU, rayon, rayon - largeurDeRainure, pans)),
        'miel',
        tonAPlat(-1),
      ),
    ]),
  ];
}

/** Le contour du plateau, vu de dessus. */
const formeDuPlateau = (densite: Densite): { centre: Vec2; rayon: number; pans: number } => ({
  centre: CENTRE_DU_PLATEAU,
  rayon: PLATINE.plateau.rayon,
  pans: densite.pansDeDisque,
});

/** L'ombre que le plateau porte sur le socle. */
const ombreDuPlateau = (densite: Densite): Ombre => ({
  silhouettes: [contourDePlot(formeDuPlateau(densite))],
  hauteur: PLATINE.plateau.epaisseur,
  support: HAUTEURS.socle,
});

/** Ce que le plateau cache du socle à la lampe, à l'écran : son ombre. Une autre ombre portée sur le socle n'a rien à y ajouter. */
export const dansLOmbreDuPlateau: (densite: Densite) => readonly Polygone[] = uneFoisPar((densite) => etendueDeLOmbreAuPied(ombreDuPlateau(densite)));

/** L'emprise du plateau sur le socle, dans le plan du meuble : ce qui est au-dessus porte son ombre sur lui, pas sur le socle. */
export const empriseDuPlateau: (densite: Densite) => readonly Polygone[] = uneFoisPar((densite) => ombreDuPlateau(densite).silhouettes);

/** Tout ce qui ne bouge pas : l'ombre sur le socle, le cylindre, la jante, la feutrine. */
export function dessinerLePlateau(densite: Densite): Dessin[] {
  const { plateau } = PLATINE;
  const forme = formeDuPlateau(densite);
  // Le flanc s'arrête à la lèvre ; la jante monte ensuite, en pente douce, jusqu'à la hauteur du plateau.
  const cylindre = plot({
    ...forme,
    base: HAUTEURS.socle,
    epaisseur: plateau.epaisseur - plateau.monte,
    chanfrein: plateau.chanfrein,
    teinte: 'alu',
    dessus: (rayon) => [
      { de: rayon, a: rayon - plateau.levre, teinte: 'alu' },
      { de: rayon - plateau.levre, a: plateau.jante, teinte: 'alu', monte: plateau.monte },
      // La gorge sombre qui sépare la jante de la feutrine.
      { de: plateau.jante, a: plateau.gorge, teinte: 'alu', nuance: -1 },
    ],
  });

  return [ombreAuPied('plateau/ombre', ombreDuPlateau(densite)), peinture(peindre(cylindre)), ...dessinerLaFeutrine(densite)];
}

/**
 * Les repères du bord du plateau : un calque à part, qui tourne rond sous l'écrasement.
 * @param souleve hauteur ajoutée aux repères, en px visibles : 0 quand ils sont sur la jante.
 */
export function dessinerLesReperes(angle: number, densite: Densite, souleve = 0): Calque {
  const { rayon, longueur, largeur } = PLATINE.reperes;
  const repere = rectangle(-longueur / 2, -largeur / 2, longueur, largeur);
  const contours = Array.from({ length: densite.reperes }, (_, i) => {
    const a = (360 * i) / densite.reperes;
    return placer(repere, { en: fois(direction(a), rayon), angle: a });
  });
  return pile('reperes', {
    role: 'mobile',
    centre: CENTRE_DU_PLATEAU,
    angle,
    // Ils sont gravés au milieu de la jante, donc à mi-pente.
    etages: [{ nom: 'gravure', hauteur: HAUTEURS.plateau - PLATINE.plateau.monte / 2 + souleve, contenu: [aplat(contours, 'expresso')] }],
  });
}

/** Ce que le mouvement règle sur les repères déjà dessinés : leur angle. */
export const reglerLesReperes = (angle: number): Reglage[] => [rotation('reperes/gravure/tourne', 0, angle)];
