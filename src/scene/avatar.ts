/**
 * L'avatar, du fond vers l'avant : les épaules, le cou, les oreilles, ce qui dépasse derrière la tête (un chignon, un pompon),
 * la tête taillée, le visage, puis ce qui couvre le crâne. Tout se pose d'après la forme de la tête : rien n'est ajusté à la main.
 * L'expression ne change que les sourcils, les paupières, le regard et la bouche, d'un coup, comme une image imprimée.
 */

import { cercle, ellipse, rectangle, trait } from '../lowpoly/contours';
import { facetteAPlat, facetteInclinee, peindre, VUE_DE_DESSUS, type Maille } from '../lowpoly/facette';
import { drape } from '../lowpoly/formes/drape';
import { galet } from '../lowpoly/formes/galet';
import { versLaLampeAuSol } from '../lowpoly/ombrage';
import { decouper, placer } from '../lowpoly/polygones';
import type { IndiceDeTon } from '../lowpoly/tons';
import { fois, plus, radians, type Vec2 } from '../lowpoly/vecteurs';
import {
  AVATAR as A,
  BOUCHES,
  DESSUS,
  EXPRESSIONS,
  TETES,
  type Avatar,
  type CouleurDePiece,
  type Expression,
  type FormeDeTete,
  type Morceau,
  type NomDExpression,
} from '../ressources/avatar';
import type { NomDeTeinte } from '../ressources/palette';
import { aplat, peinture, type Dessin } from './calque';
import { encreLisibleSur } from './encre';

/** Où et à quelle taille l'avatar est imprimé : le centre de sa tête, et l'échelle (1 pour une pochette de 240 px). */
export interface Pose {
  readonly tete: Vec2;
  readonly echelle: number;
}

/** Des facettes en bas-relief, mises en ton par la lampe : l'avatar est imprimé à plat, son relief vient vers celui qui regarde. */
const relief = (maille: Maille): Dessin => peinture(peindre(maille, VUE_DE_DESSUS));
const ton = (t: number): IndiceDeTon => Math.max(0, Math.min(4, Math.round(t))) as IndiceDeTon;

/** Le contour de la tête, de `pans` sommets, le premier en haut. */
function contourDeTete(forme: FormeDeTete, centre: Vec2, k: number, pans: number, debord = 0): Vec2[] {
  const puissance = 2 / forme.galbe;
  return Array.from({ length: pans }, (_, i): Vec2 => {
    const angle = radians(-90 + (360 * i) / pans);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      centre[0] + (forme.rayons[0] * k + debord * k) * Math.sign(c) * Math.abs(c) ** puissance,
      centre[1] + (forme.rayons[1] * k + debord * k) * Math.sign(s) * Math.abs(s) ** puissance,
    ];
  });
}

/** Le point du bord de la tête (agrandie de `debord`) à la hauteur `y`, du côté droit ; sur une tête au galbe d'ellipse ou plus plein. */
function bordALaHauteur(forme: FormeDeTete, y: number, debord: number): number {
  const ry = forme.rayons[1] + debord;
  const s = Math.max(-1, Math.min(1, y / ry));
  // Sur la courbe |x/rx|^g + |y/ry|^g = 1.
  return (forme.rayons[0] + debord) * (1 - Math.abs(s) ** forme.galbe) ** (1 / forme.galbe);
}

interface Contexte {
  readonly forme: FormeDeTete;
  readonly pose: Pose;
  readonly couleurDe: (c: CouleurDePiece) => NomDeTeinte;
}

/** Un point de l'avatar, de ses mesures (px sur une pochette de 240 px, autour du centre de la tête) à la pochette. */
const ici = (pose: Pose, p: readonly [number, number], miroir = false): Vec2 => [
  pose.tete[0] + (miroir ? -p[0] : p[0]) * pose.echelle,
  pose.tete[1] + p[1] * pose.echelle,
];

/** Une calotte : un drapé d'une seule rangée, du bord de la tête agrandie jusqu'à la frange, qui remonte du milieu vers les tempes. */
function calotte(m: Extract<Morceau, { genre: 'calotte' }>, x: Contexte): Dessin {
  const colonnes = 9;
  const { forme, pose } = x;
  const haut: Vec2[] = [];
  const bas: Vec2[] = [];
  // Les côtés de la calotte s'arrêtent à la hauteur `cotes` ; entre les deux, elle suit le bord de la tête par-dessus le crâne.
  const ry = forme.rayons[1] + m.debord;
  const depart = Math.asin(Math.max(-1, Math.min(1, m.cotes / ry)));
  for (let i = 0; i < colonnes; i++) {
    const t = i / (colonnes - 1);
    // De la tempe gauche à la tempe droite, en passant par le haut du crâne.
    const angle = Math.PI - depart + t * (Math.PI + 2 * depart);
    const s = Math.sin(angle);
    const y = ry * s;
    const cote = Math.cos(angle) < 0 ? -1 : 1;
    // Au-dessus du centre, la calotte monte de sa rehausse en plus : un bonnet qui coiffe, une casquette qui a du volume.
    haut.push(ici(pose, [cote * bordALaHauteur(forme, y, m.debord), y < 0 ? y * (1 + m.rehausse / ry) : y]));
    // La frange : au milieu à `frange`, et sur les tempes à `cotes`, un peu en dedans du bord de la tête.
    const u = 2 * t - 1;
    const yFrange = m.frange + (m.cotes - m.frange) * Math.abs(u) ** 2.4;
    const xFrange = u * (bordALaHauteur(forme, yFrange, 0) - 1.5);
    bas.push(ici(pose, [xFrange, yFrange]));
  }
  return relief(drape({ haut, bas, rangs: 1, relief: m.relief * pose.echelle, profil: 'coupole', teinte: x.couleurDe(m.couleur) }));
}

/** Un bord : une bande en travers du front, qui descend vers l'avant, et dont le bas se bombe au milieu. */
function bord(m: Extract<Morceau, { genre: 'bord' }>, x: Contexte): Dessin {
  const colonnes = 6;
  const demi = x.forme.rayons[0] * m.largeur;
  const ligne = (y: number, bombe: number): Vec2[] =>
    Array.from({ length: colonnes }, (_, i) => {
      const u = (2 * i) / (colonnes - 1) - 1;
      return ici(x.pose, [u * demi, y + bombe * (1 - u * u)]);
    });
  return relief(
    drape({
      haut: ligne(m.hauteur - m.epaisseur / 2, 0),
      bas: ligne(m.hauteur + m.epaisseur / 2, m.bombe),
      rangs: 1,
      relief: m.relief * x.pose.echelle,
      profil: 'coupole',
      teinte: x.couleurDe(m.couleur),
    }),
  );
}

/** Une boule : un galet rond. */
function boule(m: Extract<Morceau, { genre: 'boule' }>, x: Contexte): Dessin {
  const k = x.pose.echelle;
  const centre = ici(x.pose, [m.place[0] * x.forme.rayons[0], m.place[1] * x.forme.rayons[1]]);
  const contour = ellipse(centre, [m.rayon * k, m.rayon * k], 7);
  return relief(
    galet({ contour, sommet: plus(centre, [-0.15 * m.rayon * k, -0.2 * m.rayon * k]), relief: m.relief * k, teinte: x.couleurDe(m.couleur) }),
  );
}

/** Un casque : l'arceau par-dessus le crâne, puis une coque cerclée sur chaque oreille, d'une seule facette. */
function casque(m: Extract<Morceau, { genre: 'casque' }>, x: Contexte): Dessin[] {
  const k = x.pose.echelle;
  const teinte = x.couleurDe(m.couleur);
  const { rayons } = x.forme;
  const ligne = (debord: number): Vec2[] =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = radians(192 + (156 * i) / 5);
      const y = (rayons[1] + debord) * Math.sin(angle);
      return ici(x.pose, [Math.sign(Math.cos(angle)) * bordALaHauteur(x.forme, y, debord), y]);
    });
  const arceau = relief(drape({ haut: ligne(4 + m.arceau), bas: ligne(4), rangs: 1, relief: m.arceau * 0.3 * k, profil: 'coupole', teinte }));
  const coques = [false, true].flatMap((miroir): Dessin[] => {
    const centre = ici(x.pose, [rayons[0] + 1, 2], miroir);
    const contour = ellipse(centre, [m.coques[0] * k, m.coques[1] * k], 10);
    // Une coque fuit vers l'extérieur, comme l'oreille qu'elle couvre.
    return [
      relief([facetteInclinee(contour, [miroir ? 0.4 : -0.4, -0.15], teinte)]),
      aplat([ellipse(plus(centre, [miroir ? -4 * k : 4 * k, 0]), [2.6 * k, m.coques[1] * 0.62 * k], 8)], m.cerclage, ton(2)),
    ];
  });
  return [arceau, ...coques];
}

function morceau(m: Morceau, x: Contexte): Dessin[] {
  switch (m.genre) {
    case 'calotte':
      return [calotte(m, x)];
    case 'bord':
      return [bord(m, x)];
    case 'boule':
      return [boule(m, x)];
    case 'casque':
      return casque(m, x);
  }
}

/** Un œil : le blanc, la pupille et son reflet ; la paupière qui en couvre une part, et la joue qui remonte quand on sourit. */
function oeil(peau: NomDeTeinte, cheveux: NomDeTeinte, expression: Expression, pose: Pose, miroir: boolean): Dessin[] {
  const k = pose.echelle;
  const { centre, blanc, pupille, reflet, paupiere, pommette } = A.oeil;
  const c = ici(pose, centre, miroir);
  const rx = blanc.rayons[0] * k;
  const ry = blanc.rayons[1] * k;
  const { haut, bas } = expression.paupieres;
  if (haut >= paupiere.fermee) {
    // Fermé : un trait de cils, un peu bombé vers le bas.
    return [
      aplat(
        [
          trait(
            [
              [c[0] - rx, c[1]],
              [c[0], c[1] + ry * 0.3],
              [c[0] + rx, c[1]],
            ],
            paupiere.trait * k,
          ),
        ],
        cheveux,
        ton(1),
      ),
    ];
  }
  const globe = ellipse(c, [rx, ry], blanc.pans);
  const iris: Vec2 = [c[0] + expression.regard[0] * k, c[1] + expression.regard[1] * k];
  const dessin: Dessin[] = [
    aplat([globe], blanc.teinte, ton(blanc.ton)),
    aplat([decouper(ellipse(iris, [pupille.rayons[0] * k, pupille.rayons[1] * k], pupille.pans), globe)], pupille.teinte, ton(pupille.ton)),
    aplat([cercle(plus(iris, fois(versLaLampeAuSol(), reflet.ecart * k)), reflet.rayon * k, reflet.pans)], reflet.teinte, ton(reflet.ton)),
  ];
  if (haut > 0) {
    // La paupière qui tombe : un pan de peau d'un ton plus sombre, bordé des cils.
    const bordDeLaPaupiere = c[1] - ry + 2 * ry * haut;
    dessin.push(
      relief([
        facetteInclinee(decouper(globe, rectangle(c[0] - rx - 1, c[1] - ry - 1, 2 * rx + 2, bordDeLaPaupiere - c[1] + ry + 1)), [0, -0.8], peau),
      ]),
    );
    dessin.push(aplat([decouper(globe, rectangle(c[0] - rx - 1, bordDeLaPaupiere - 1.1 * k, 2 * rx + 2, 2.2 * k))], cheveux, ton(1)));
  }
  if (bas > 0) {
    const rayon = rx * pommette.rayon;
    const joue = cercle([c[0], c[1] + ry + rayon - 2 * ry * bas], rayon, pommette.pans);
    dessin.push(relief([facetteAPlat(decouper(globe, joue), 0, peau)]));
  }
  return dessin;
}

/** Un sourcil : un trait gras, cambré, penché selon l'humeur (pente positive : le bout côté nez descend). */
function sourcil(cheveux: NomDeTeinte, expression: Expression, pose: Pose, miroir: boolean): Dessin {
  const { hauteur, longueur, epaisseur } = A.sourcil;
  const { pente, arc } = expression.sourcils;
  const centre = ici(pose, [A.oeil.centre[0], hauteur + expression.sourcils.hauteur], miroir);
  const l = longueur / 2;
  const ligne = trait(
    [
      [-l, arc * 0.5],
      [-l * 0.4, -arc * 0.42],
      [l * 0.4, -arc * 0.42],
      [l, arc * 0.5],
    ],
    epaisseur,
  );
  return aplat([placer(ligne, { en: centre, angle: miroir ? pente : -pente, echelle: pose.echelle })], cheveux, ton(1));
}

function bouche(expression: Expression, pose: Pose, encre: NomDeTeinte): Dessin[] {
  const k = pose.echelle;
  const milieu = ici(pose, [0, A.bouche]);
  const p = (q: readonly [number, number]): Vec2 => [milieu[0] + q[0] * k, milieu[1] + q[1] * k];
  return BOUCHES[expression.bouche].map((m): Dessin => {
    const teinte = m.couleur === 'encre' ? encre : m.couleur;
    switch (m.genre) {
      case 'contours':
        return aplat(
          m.contours.map((c) => c.map(p)),
          teinte,
          ton(m.ton),
        );
      case 'trait':
        return aplat([trait(m.points.map(p), m.epaisseur * k)], teinte, ton(m.ton));
      case 'pastille':
        return aplat([ellipse(p(m.centre), [m.rayons[0] * k, m.rayons[1] * k], m.pans)], teinte, ton(m.ton));
    }
  });
}

/** Ce qui se dessine derrière la tête : une boule au-dessus du crâne (un chignon, un pompon) dépasse, le reste la couvre. */
const estDerriere = (m: Morceau): boolean => m.genre === 'boule';

export function dessinerLAvatar(avatar: Avatar, nom: NomDExpression, pose: Pose): Dessin[] {
  const k = pose.echelle;
  const forme = TETES[avatar.tete];
  const expression = EXPRESSIONS[nom];
  const { peau, cheveux } = avatar;
  const x: Contexte = {
    forme,
    pose,
    couleurDe: (c) => (c === 'cheveux' ? avatar.cheveux : c === 'tenue' ? avatar.tenue : c),
  };
  const dessus: readonly Morceau[] = DESSUS[avatar.dessus];
  const cotes = [false, true];

  const { epaules, bas, relief: saillie } = A.torse;
  const torse = relief(
    drape({
      haut: epaules.map((q) => ici(pose, q)),
      bas: bas.map((q) => ici(pose, q)),
      rangs: 1,
      relief: saillie * k,
      profil: 'coupole',
      teinte: avatar.tenue,
    }),
  );
  const cou = relief([
    facetteInclinee(
      rectangle(pose.tete[0] - A.cou.demiLargeur * k, pose.tete[1] + A.cou.haut * k, 2 * A.cou.demiLargeur * k, (A.cou.bas - A.cou.haut) * k),
      [0, 0.25],
      peau,
      -1,
    ),
  ]);
  const oreilles = cotes.map((miroir) => {
    const { rayons, pans, fuite, retrait } = A.oreille;
    const contour = ellipse(ici(pose, [forme.rayons[0] - retrait, A.oreille.hauteur], miroir), [rayons[0] * k, rayons[1] * k], pans);
    return relief([facetteInclinee(contour, [miroir ? fuite : -fuite, 0], peau)]);
  });
  const contour = contourDeTete(forme, pose.tete, k, A.tete.pans);
  const tete = relief(
    galet({
      contour,
      sommet: [pose.tete[0] + A.tete.sommet[0] * forme.rayons[0] * k, pose.tete[1] + A.tete.sommet[1] * forme.rayons[1] * k],
      relief: A.tete.relief * forme.rayons[0] * k,
      teinte: peau,
    }),
  );
  const joues = aplat(
    cotes.map((miroir) => cercle(ici(pose, A.joue.centre, miroir), A.joue.rayon * k, A.joue.pans, 180 / A.joue.pans)),
    A.joue.teinte,
    ton(A.joue.ton),
    A.joue.opacite,
  );
  const nez = relief([
    facetteInclinee(ellipse(ici(pose, A.nez.centre), [A.nez.rayons[0] * k, A.nez.rayons[1] * k], A.nez.pans), [0, -0.35], peau, -1),
  ]);

  return [
    torse,
    cou,
    ...oreilles,
    ...dessus.filter(estDerriere).flatMap((m) => morceau(m, x)),
    tete,
    joues,
    nez,
    ...bouche(expression, pose, encreLisibleSur(peau)),
    ...cotes.flatMap((miroir) => oeil(peau, cheveux, expression, pose, miroir)),
    ...cotes.map((miroir) => sourcil(cheveux, expression, pose, miroir)),
    ...dessus.filter((m) => !estDerriere(m)).flatMap((m) => morceau(m, x)),
  ];
}
