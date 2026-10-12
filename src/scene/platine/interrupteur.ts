/**
 * Un interrupteur à bascule de la platine : un réglage à deux positions. Un écrou moleté vissé sur sa rondelle,
 * et une bascule couchée vers la position choisie, seule pièce qui bouge. Les deux positions sont gravées dans le socle.
 */

import { cercle } from '../../lowpoly/contours';
import { facetteAPlat, peindre } from '../../lowpoly/facette';
import { prisme } from '../../lowpoly/formes/boite';
import { contourDePlot, plot } from '../../lowpoly/formes/plot';
import { placer, type Polygone } from '../../lowpoly/polygones';
import { direction, fois, moins, plus } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { calque, peinture, soulever, type Calque, type Dessin } from '../calque';
import { ombre, ombreAuPied } from '../ombre';
import { visibilite, type Reglage } from '../reglage';
import { surLeBandeau, type PlaceDeCommande } from './emplacements';
import { graver, MI_HAUTEUR } from './gravure';

const C = PLATINE.commandes;

/** Un interrupteur à deux positions : la première à gauche, la seconde à droite. */
export interface EtatDInterrupteur {
  readonly titre: string;
  readonly positions: readonly [string, string];
  readonly choisie: 0 | 1;
  /**
   * En train de basculer : de 0 (couchée vers la première position) à 1 (vers la seconde). À mi-course, elle est debout :
   * vue d'en haut, elle raccourcit, et sa boule monte. Sans elle, la bascule est couchée vers la position choisie.
   */
  readonly course?: number;
  /**
   * Vrai pour une bascule qu'on anime : elle est dessinée dans ses trois poses (couchée d'un côté, debout, couchée de l'autre),
   * et le mouvement montre celle de l'instant. C'est ainsi qu'elle bascule en deux temps sans qu'on redessine rien.
   */
  readonly enTroisPoses?: boolean;
}

/** Debout, vue d'en haut, la tige garde au moins cette part de sa longueur : elle ne disparaît pas sous sa boule. */
const DEBOUT = 0.3;

/** Les trois poses d'une bascule qu'on anime : couchée vers la première position, debout, couchée vers la seconde. */
export const POSES_DE_LA_BASCULE = [0, 1 / 2, 1] as const;

/** La pose la plus proche d'une course. */
const poseLaPlusProche = (course: number): number =>
  POSES_DE_LA_BASCULE.reduce(
    (meilleure, pose, rang) => (Math.abs(pose - course) < Math.abs((POSES_DE_LA_BASCULE[meilleure] ?? 0) - course) ? rang : meilleure),
    0,
  );

/** Ce que le mouvement règle sur une bascule dessinée dans ses trois poses : on montre celle de l'instant, et son ombre. */
export function reglerLaBascule(cle: string, course: number): Reglage[] {
  const montree = poseLaPlusProche(course);
  return POSES_DE_LA_BASCULE.flatMap((_, rang) => [
    visibilite(`interrupteur-${cle}/pose-${rang}`, rang === montree),
    visibilite(`interrupteur-${cle}/ombre/pose-${rang}`, rang === montree),
  ]);
}

export interface InterrupteurDessine {
  /** Les deux positions et le titre, gravés dans le socle : dans le décor. */
  readonly gravures: Dessin[];
  /** La rondelle et l'écrou, vissés sur le socle : dans le décor. */
  readonly fixe: Dessin[];
  readonly ombre: Calque;
  readonly bascule: Calque;
}

/**
 * @param souleve hauteur ajoutée à la bascule, en px visibles : 0 quand elle est en place.
 * @param place où il se pose : par défaut, sur le bandeau avant de la platine.
 */
export function dessinerUnInterrupteur(
  cle: string,
  x: number,
  etat: EtatDInterrupteur,
  densite: Densite,
  souleve = 0,
  place: PlaceDeCommande = surLeBandeau(x),
): InterrupteurDessine {
  const { centre, support } = place;
  const { rondelle, ecrou, bascule, inscription } = C.interrupteur;
  const pans = densite.pansDePetitRond + 4;
  const surLEcrou = support + ecrou.epaisseur;
  const formeDEcrou = { centre, rayon: ecrou.rayon, pans };

  const { boule } = bascule;
  const sommet = bascule.hauteur - bascule.epaisseur / 2;
  /** La bascule à une course : couchée vers la position choisie, une tige puis une boule un peu plus haute ; debout à mi-course. */
  const basculeA = (course: number): { readonly silhouettes: Polygone[]; readonly contenu: Dessin[] } => {
    const bascul = Math.PI * course;
    const versLaPosition = Math.cos(bascul) >= 0 ? 180 : 0;
    const longueur = (bascule.longueur - boule.rayon) * Math.max(DEBOUT, Math.abs(Math.cos(bascul)));
    const tige = placer(
      [
        [0, -bascule.pied / 2],
        [longueur, -bascule.col / 2],
        [longueur, bascule.col / 2],
        [0, bascule.pied / 2],
      ],
      { en: centre, angle: versLaPosition },
    );
    const formeDeBoule = { centre: plus(centre, fois(direction(versLaPosition), longueur)), rayon: boule.rayon, pans };
    const sousLaBoule = surLEcrou + bascule.epaisseur / 2 + Math.sin(bascul) * (bascule.longueur - boule.rayon);
    return {
      silhouettes: [tige, contourDePlot(formeDeBoule)].map((silhouette) => silhouette.map((p) => moins(p, centre))),
      contenu: [
        peinture(peindre(prisme({ contour: tige, base: surLEcrou, epaisseur: bascule.epaisseur, chanfrein: bascule.chanfrein, teinte: 'alu' }))),
        peinture(
          peindre(
            // La boule : un flanc bas, puis un dôme dont les facettes du côté de la lampe sont les plus claires.
            plot({
              ...formeDeBoule,
              base: sousLaBoule,
              epaisseur: sommet * boule.flanc,
              chanfrein: boule.chanfrein,
              teinte: 'alu',
              dessus: (bord) => [
                { de: bord, a: bord * boule.plat, teinte: 'alu', monte: sommet * (1 - boule.flanc) },
                { de: bord * boule.plat, a: 0, teinte: 'alu' },
              ],
            }),
          ),
        ),
      ],
    };
  };
  const course = etat.course ?? etat.choisie;
  const ombreA = (nom: `interrupteur-${string}`, silhouettes: readonly Polygone[]): Calque =>
    ombre(nom, { en: centre, silhouettes, hauteur: ecrou.epaisseur + bascule.hauteur + souleve, support, paliers: 2 });
  const montree = poseLaPlusProche(course);
  const poses = etat.enTroisPoses === true ? POSES_DE_LA_BASCULE.map((pose) => basculeA(pose)) : [];
  const seule = basculeA(course);

  return {
    // Une position sans inscription n'est pas gravée : l'interrupteur de l'ampli a son voyant pour dire où il en est.
    gravures: [
      graver(etat.positions[0], [centre[0] - inscription, centre[1] + MI_HAUTEUR], 'fin'),
      graver(etat.positions[1], [centre[0] + inscription, centre[1] + MI_HAUTEUR], 'debut'),
      graver(etat.titre, [centre[0], centre[1] + C.titre], 'milieu'),
    ].filter((gravure) => gravure.contenu !== ''),
    fixe: [
      peinture(peindre([facetteAPlat(cercle(centre, rondelle.rayon, pans), support + rondelle.epaisseur, 'expresso')])),
      ombreAuPied(`${place.porteur}/ecrou-${cle}/ombre`, {
        silhouettes: [contourDePlot(formeDEcrou)],
        hauteur: ecrou.epaisseur,
        support,
        paliers: 2,
      }),
      // Un écrou rond et moleté, au dessus plat.
      peinture(
        peindre(
          plot({
            ...formeDEcrou,
            base: support,
            epaisseur: ecrou.epaisseur,
            chanfrein: ecrou.chanfrein,
            teinte: 'alu',
            moletage: true,
            dessus: (bord) => [{ de: bord, a: 0, teinte: 'alu' }],
          }),
        ),
      ),
      // Le puits d'où sort la bascule.
      peinture(peindre([facetteAPlat(cercle(centre, ecrou.rayon * ecrou.puits, pans), surLEcrou, 'vinyle', -1)])),
    ],
    ombre:
      poses.length === 0
        ? ombreA(`interrupteur-${cle}/ombre`, seule.silhouettes)
        : calque(
            `interrupteur-${cle}/ombre`,
            poses.map((pose, rang) => ({ ...ombreA(`interrupteur-${cle}/ombre/pose-${rang}`, pose.silhouettes), opacite: rang === montree ? 1 : 0 })),
            { role: 'ombre' },
          ),
    bascule: calque(
      `interrupteur-${cle}`,
      poses.length === 0
        ? seule.contenu
        : // Chaque pose pèse ce que pèse une bascule : une seule se montre à la fois.
          poses.map((pose, rang) => calque(`interrupteur-${cle}/pose-${rang}`, pose.contenu, { role: 'mobile', opacite: rang === montree ? 1 : 0 })),
      { role: 'mobile', transformations: [soulever(souleve)] },
    ),
  };
}
