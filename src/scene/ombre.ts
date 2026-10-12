/**
 * L'ombre d'un objet, toujours dans son propre calque.
 * - Sous une pièce du décor, elle part du pied de l'objet et s'éclaircit par paliers vers sa pointe ; elle ne bouge jamais.
 * - Sous une pièce mobile, elle glisse avec sa pièce, puis s'en éloigne de sa portée, d'autant plus que la pièce est haute ;
 *   chaque palier est un sous-calque, en retrait de cette portée : on les écarte ou on les resserre quand la pièce monte ou se pose.
 */

import type { NomDeCalque } from '../lexique';
import { decalagesDOmbre, decalagesParPxDeHauteur, epaisseurLeLongDeLOmbre } from '../lowpoly/ombrePortee';
import { enveloppeConvexe, orienter, type Polygone } from '../lowpoly/polygones';
import { penchement, surLEcran, type Matrice } from '../lowpoly/projection';
import { fois, moins, plus, tourner, type Vec2 } from '../lowpoly/vecteurs';
import { LAMPE } from '../ressources/lampe';
import { calque, type Aplat, type Calque, type Transformation } from './calque';
import { uneFoisPar } from './memoire';
import type { Penche } from './pile';
import { rotation, type Reglage } from './reglage';

/** Le nom d'un palier d'ombre : celui de son ombre, puis son rang, compté à partir de un. */
const nomDuPalier = (ombre: NomDeCalque, rang: number): NomDeCalque => `${ombre}/palier-${rang + 1}`;
/** Vrai pour un nom de palier d'ombre. */
export const estUnPalier = (nom: string): boolean => /\/palier-\d+$/.test(nom);

const aplatDOmbre = (contours: readonly Polygone[]): Aplat => ({
  genre: 'aplat',
  contours,
  teinte: LAMPE.ombre.teinte,
  ton: LAMPE.ombre.ton,
  opacite: LAMPE.ombre.opacite,
});

/** La plus fine des silhouettes, mesurée le long de l'ombre, telles qu'on les voit à l'écran. */
const finesse = (aLEcran: readonly Polygone[]): number => Math.min(...aLEcran.map(epaisseurLeLongDeLOmbre));

/** Des silhouettes données dans le plan du meuble, telles qu'on les voit à l'écran. */
const aLEcran = (silhouettes: readonly Polygone[]): Polygone[] => silhouettes.map((s) => s.map((p) => surLEcran(p)));

/** La finesse d'une pièce qui ne tourne pas : elle ne change pas tant que ses silhouettes sont les mêmes, et se mesure donc une fois. */
const finesseSansTourner: (silhouettes: readonly Polygone[]) => number = uneFoisPar((silhouettes) => finesse(aLEcran(silhouettes)));

export interface Ombre {
  /** Silhouette(s) convexes de l'objet au sol, dans le plan du meuble. */
  readonly silhouettes: readonly Polygone[];
  /** Hauteur du dessus de l'objet au-dessus de la surface qui reçoit l'ombre, en px visibles. */
  readonly hauteur: number;
  /** Hauteur de cette surface au-dessus du bois, en px visibles. */
  readonly support: number;
  readonly paliers?: 2 | 3;
}

/**
 * Les paliers de l'ombre d'une pièce du décor, à l'écran, du plus proche au plus lointain. Chacun est la trace de la silhouette,
 * de son pied jusqu'à son décalage : l'ombre tient à l'objet, même s'il est fin et haut, et part de ses coins en biais.
 */
function tracesAuPied(o: Ombre): Polygone[][] {
  const auSol = o.silhouettes.map((s) => s.map((p) => surLEcran(p, o.support)));
  return decalagesDOmbre(o.hauteur, o.paliers ?? 3).map((de) => auSol.map((s) => enveloppeConvexe([...s, ...s.map((p) => plus(p, de))])));
}

/** L'ombre d'une pièce du décor, posée sur son support : elle ne bouge jamais. */
export function ombreAuPied(nom: NomDeCalque, o: Ombre): Calque {
  return calque(nom, tracesAuPied(o).map(aplatDOmbre), { role: 'decor' });
}

/** Tout ce que l'ombre d'une pièce du décor couvre, à l'écran : son palier le plus lointain. */
export function etendueDeLOmbreAuPied(o: Ombre): Polygone[] {
  const traces = tracesAuPied(o);
  return traces[traces.length - 1] ?? [];
}

export interface OmbreMobile extends Ombre {
  /** Où est la pièce sur le meuble : ses silhouettes sont données autour de ce point, et l'ombre le suit comme elle. */
  readonly en: Vec2;
  /**
   * Pour une pièce qui peut se pencher ou se retourner : la déformation de chaque palier de son ombre, du plus proche
   * au plus lointain. Chaque palier la garde après son décalage, même sans effet, pour que le mouvement puisse la régler.
   */
  readonly deformations?: readonly Matrice[];
}

/** Un palier d'une ombre : son retrait, et sa déformation si la pièce peut se pencher ou se retourner. */
interface Palier {
  /** Ce dont il reste en deçà de la portée de l'ombre, à l'écran : rien pour le plus lointain, de plus en plus vers la pièce pour les autres. */
  readonly retrait: Vec2;
  readonly par?: Matrice;
}

/** Une ombre mobile, telle qu'on la pose : sa portée, et ses paliers, du plus proche de la pièce au plus lointain. */
interface OmbrePortee {
  /** Ce dont l'ombre s'éloigne de sa pièce, à l'écran : le décalage de son palier le plus lointain. C'est elle qui dit la hauteur. */
  readonly portee: Vec2;
  readonly paliers: readonly Palier[];
}

const SANS_PORTEE: Vec2 = [0, 0];

/**
 * @param decalages celui de chaque palier, compté depuis la pièce, du plus proche au plus lointain.
 * @param deformation celle du palier de ce rang, s'il en a une.
 */
function porter(decalages: readonly Vec2[], deformation: (rang: number) => Matrice | undefined): OmbrePortee {
  const portee = decalages[decalages.length - 1] ?? SANS_PORTEE;
  return {
    portee,
    paliers: decalages.map((decalage, rang): Palier => {
      const par = deformation(rang);
      return par !== undefined ? { retrait: moins(decalage, portee), par } : { retrait: moins(decalage, portee) };
    }),
  };
}

/** Les transformations du calque d'une ombre mobile : elle glisse avec sa pièce sur ce qui la reçoit, puis s'en éloigne de sa portée. */
const transformationsDeLOmbre = (o: Pick<OmbreMobile, 'en' | 'support'>, portee: Vec2): Transformation[] => [
  { genre: 'glisser', de: surLEcran(o.en, o.support) },
  { genre: 'glisser', de: portee },
];

/** Ce que le mouvement règle sur le calque d'une ombre déjà dessinée : les mêmes transformations, chacune à son rang. */
const reglerLaPortee = (nom: NomDeCalque, o: Pick<OmbreMobile, 'en' | 'support'>, portee: Vec2): Reglage[] =>
  transformationsDeLOmbre(o, portee).map((transformation, rang) => ({ calque: nom, rang, transformation }));

/** Les transformations d'un palier : son retrait, puis sa déformation s'il en a une. Le mouvement les règle par leur rang. */
const transformationsDuPalier = ({ retrait, par }: Palier): Transformation[] => [
  { genre: 'glisser', de: retrait },
  ...(par !== undefined ? [{ genre: 'deformer', par } as const] : []),
];

/**
 * Ce que le mouvement règle sur un palier déjà dessiné : les mêmes transformations, chacune à son rang.
 * Son retrait écarte les paliers ; sa déformation aussi, si c'est la hauteur qui la donne.
 * @param laHauteurDeforme vrai sous une pièce penchée, dont chaque palier s'éloigne à sa façon avec la hauteur ; faux sous une pièce
 * qui se retourne, dont l'ombre change de forme d'un seul bloc.
 */
const reglerUnPalier = (nom: NomDeCalque, palier: Palier, laHauteurDeforme: boolean): Reglage[] =>
  transformationsDuPalier(palier).map((transformation, rang) => ({
    calque: nom,
    rang,
    transformation,
    ...(transformation.genre === 'glisser' || laHauteurDeforme ? { ecarteLesPaliers: true as const } : {}),
  }));

/** L'ombre d'une pièce mobile qui ne tourne pas, à la hauteur où elle est. */
function ombrePortee(o: OmbreMobile): OmbrePortee {
  return porter(decalagesDOmbre(o.hauteur, o.paliers ?? 3, finesseSansTourner(o.silhouettes)), (rang) => o.deformations?.[rang]);
}

/** L'ombre d'une pièce mobile qui ne tourne pas : elle glisse avec elle, s'en éloigne quand elle monte, et ses paliers s'écartent. */
export function ombre(nom: NomDeCalque, o: OmbreMobile): Calque {
  const silhouette = aplatDOmbre(aLEcran(o.silhouettes));
  const { portee, paliers } = ombrePortee(o);
  return calque(
    nom,
    paliers.map((palier, rang) => calque(nomDuPalier(nom, rang), [silhouette], { transformations: transformationsDuPalier(palier) })),
    { role: 'ombre', transformations: transformationsDeLOmbre(o, portee) },
  );
}

/** Ce que le mouvement règle sur cette ombre déjà dessinée : où elle tombe, sa portée, et le retrait de ses paliers. */
export function reglerUneOmbre(nom: NomDeCalque, o: OmbreMobile): Reglage[] {
  const { portee, paliers } = ombrePortee(o);
  return [...reglerLaPortee(nom, o, portee), ...paliers.flatMap((palier, rang) => reglerUnPalier(nomDuPalier(nom, rang), palier, false))];
}

export interface OmbreDePile extends Omit<OmbreMobile, 'deformations'> {
  /** Angle de la pile, en degrés : elle tourne autour de `en`. */
  readonly angle: number;
  /** Si la pile est penchée (voir pile.ts) : son ombre s'éloigne d'autant plus que la pièce est haute. */
  readonly penche?: Penche;
  /**
   * Le contour, à l'écran, de la surface qui reçoit l'ombre, si elle peut en déborder : l'ombre s'arrête à son bord.
   * C'est ainsi qu'une pièce porte deux ombres, une par surface qu'elle survole : le bras, sur le socle et sur le plateau.
   */
  readonly surface?: readonly Polygone[];
  /**
   * Ce qu'une autre pièce, posée sur cette surface, y cache à la lampe, à l'écran : cette ombre-ci ne s'y voit pas.
   * Sans cela, là où elle croise l'ombre de l'autre pièce, une tache plus sombre apparaît.
   */
  readonly saufDans?: readonly Polygone[];
  /**
   * Ce que la pile peut survoler, posé sur cette surface : des contours dans le plan du meuble. Ses parties qui sont au-dessus
   * ne portent pas d'ombre ici : elles la portent sur ce qu'elles survolent, et une seule lampe ne leur en donne pas deux.
   */
  readonly saufAuDessusDe?: readonly Polygone[];
}

/**
 * Un carré autour d'un point, assez grand pour que l'ombre d'une pile n'en sorte jamais, quels que soient son angle, sa hauteur
 * et sa pente : elle ne tombe pas plus loin de son pied que la longueur de la pile, plus ce dont sa hauteur l'éloigne, fût-elle
 * penchée de toute sa longueur. C'est la fenêtre d'une ombre que rien d'autre ne borne.
 */
function autourDe(centre: Vec2, o: Pick<OmbreDePile, 'silhouettes' | 'hauteur'>): Polygone {
  const longueur = Math.max(...o.silhouettes.flat().map((p) => Math.hypot(p[0], p[1])));
  const demi = longueur + LAMPE.ombre.allongement * (Math.max(0, o.hauteur) + longueur);
  const [x, y] = centre;
  return [
    [x - demi, y - demi],
    [x + demi, y - demi],
    [x + demi, y + demi],
    [x - demi, y + demi],
  ];
}

/** Une découpe trouée : rien ne se voit hors de ces contours, ni dans ces trous. Un contour qui tourne à l'envers des autres y fait un trou. */
const trouer = (contours: readonly Polygone[], trous: readonly Polygone[]): Polygone[] => [
  ...contours.map(orienter),
  ...trous.map((trou) => orienter(trou).reverse()),
];

/** La découpe d'une ombre de pile, à l'écran : la surface qui la reçoit, moins ce qu'une autre pièce y cache à la lampe. */
function decoupeDeLOmbre(o: OmbreDePile): readonly Polygone[] | undefined {
  return o.saufDans === undefined ? o.surface : trouer(o.surface ?? [autourDe(surLEcran(o.en, o.support), o)], o.saufDans);
}

/**
 * La découpe de chaque palier d'une ombre de pile, autour du pied de la pile : tout, sauf ce que la pile peut survoler.
 * Elle est donnée là où est la pièce, pas là où tombe son ombre : chaque palier l'emporte avec lui en s'écartant.
 */
function decoupeDesPaliers(o: OmbreDePile): readonly Polygone[] | undefined {
  if (o.saufAuDessusDe === undefined) return undefined;
  return trouer(
    [autourDe([0, 0], o)],
    o.saufAuDessusDe.map((contour) => contour.map((p) => surLEcran(moins(p, o.en)))),
  );
}

/** La finesse d'une pile à son angle du moment. */
function finesseDeLaPile(o: OmbreDePile): number {
  return finesse(o.silhouettes.map((s) => s.map((p) => surLEcran(tourner(p, o.angle)))));
}

/** L'ombre d'une pile, à l'angle, à la hauteur et à la pente où elle est : c'est ce que le mouvement règle quand la pièce tourne, monte ou se penche. */
function ombrePorteeDePile(o: OmbreDePile): OmbrePortee {
  const nombre = o.paliers ?? 3;
  const epaisseur = finesseDeLaPile(o);
  const parPx = decalagesParPxDeHauteur(o.hauteur, nombre, epaisseur);
  return porter(decalagesDOmbre(o.hauteur, nombre, epaisseur), (rang) => {
    const pente = parPx[rang];
    return o.penche !== undefined && pente !== undefined ? penchement(o.penche.vers, fois(pente, o.penche.de)) : undefined;
  });
}

/**
 * Un palier d'une ombre de pile : des silhouettes qui tournent avec elle, sous le même écrasement, puis mises en retrait, et penchées s'il le faut.
 * @param decoupe ce hors de quoi le palier ne se voit pas, autour du pied de la pile (voir `decoupeDesPaliers`).
 */
function palierDePile(
  nom: NomDeCalque,
  silhouettes: readonly Polygone[],
  angle: number,
  palier: Palier,
  decoupe: readonly Polygone[] | undefined,
): Calque {
  return calque(
    nom,
    [
      calque(`${nom}/plan`, [calque(`${nom}/tourne`, [aplatDOmbre(silhouettes)], { transformations: [{ genre: 'tourner', de: angle }] })], {
        transformations: [{ genre: 'ecraser' }],
        ...(decoupe !== undefined ? { decoupe } : {}),
      }),
    ],
    { transformations: transformationsDuPalier(palier) },
  );
}

/**
 * L'ombre d'une pile : elle tourne avec l'objet, sous le même écrasement.
 * Le calque est posé au pied de l'objet, puis porté à sa portée ; chaque palier n'a plus que son retrait, et sa déformation s'il peut se pencher.
 */
export function ombreDePile(nom: NomDeCalque, o: OmbreDePile): Calque {
  const { portee, paliers } = ombrePorteeDePile(o);
  const decoupe = decoupeDeLOmbre(o);
  const deChaquePalier = decoupeDesPaliers(o);
  return calque(
    nom,
    paliers.map((palier, rang) => palierDePile(nomDuPalier(nom, rang), o.silhouettes, o.angle, palier, deChaquePalier)),
    {
      role: 'ombre',
      transformations: transformationsDeLOmbre(o, portee),
      ...(decoupe !== undefined ? { decoupe } : {}),
    },
  );
}

/** Ce que le mouvement règle sur l'ombre d'une pile déjà dessinée : où elle tombe, sa portée, son angle, le retrait et la pente de ses paliers. */
export function reglerUneOmbreDePile(nom: NomDeCalque, o: OmbreDePile): Reglage[] {
  const { portee, paliers } = ombrePorteeDePile(o);
  return [
    ...reglerLaPortee(nom, o, portee),
    ...paliers.flatMap((palier, rang) => {
      const calque = nomDuPalier(nom, rang);
      return [...reglerUnPalier(calque, palier, true), rotation(`${calque}/tourne`, 0, o.angle)];
    }),
  ];
}
