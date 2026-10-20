/**
 * La pochette kraft du disque mystère : deux papiers, le dos et le devant, entre lesquels le disque glisse.
 * Le devant a une fenêtre ronde, par où l'on voit l'étiquette, et une encoche du côté ouvert, par où le disque sort.
 * Posée de travers à côté de la platine, elle porte son tampon et la pastille de la piste.
 * Elle se dessine en deux fois : son corps, entier, sous le disque ; puis son papier du devant, une seconde fois, par-dessus
 * le disque tant qu'il est pris dedans. Sorti, le disque porte ainsi son ombre sur elle comme sur le bois.
 */

import type { NomDeCalque } from '../lexique';
import { arc, cercle, rectangleArrondi } from '../lowpoly/contours';
import { tonAPlat } from '../lowpoly/ombrage';
import { sansDoublons } from '../lowpoly/polygones';
import { surLEcran } from '../lowpoly/projection';
import { TON_DE_BASE } from '../lowpoly/tons';
import { plus, tourner, type Vec2 } from '../lowpoly/vecteurs';
import { KRAFT } from '../ressources/kraft';
import type { Textes } from '../ressources/textes';
import { CORPS } from '../ressources/typo';
import { aplat, calque, type Calque, type Dessin, type Mesure, type Texte, type Transformation } from './calque';
import { ligneDeBaseSous, ligneSurMiel } from './encre';
import { ombreDePile } from './ombre';
import { papierDePastille } from './pastille';
import { remplir } from './phrases';
import { pile, tranche, type Etage } from './pile';
import { glissement, visibilite, type Reglage } from './reglage';
import { mettreEnLignes } from './texte';

const K = KRAFT;
const DEMI = K.cote / 2;

/** Le contour de la pochette, autour de son centre : un carré aux coins arrondis. Son côté ouvert est à gauche. */
const carre = (): Vec2[] => rectangleArrondi(-DEMI, -DEMI, K.cote, K.cote, K.coin, K.pansDeCoin);

/** Le même, creusé de l'encoche du pouce au milieu du côté ouvert : c'est le contour du papier du devant. */
function carreEncoche(): Vec2[] {
  const contour = carre();
  // Le côté gauche remonte du coin bas-gauche au coin haut-gauche : l'encoche s'y insère, bombée vers le dedans.
  const coin = contour.findIndex((p) => Math.abs(p[0] + DEMI) < 1e-9 && p[1] < 0);
  if (coin < 0) throw new Error('La pochette kraft n’a pas de côté gauche où creuser son encoche.');
  const encoche = arc([-DEMI, 0], K.encoche.rayon, 90, -90, K.encoche.pans);
  return sansDoublons([...contour.slice(0, coin), ...encoche, ...contour.slice(coin)]);
}

export interface Kraft {
  /** Son centre sur le meuble, et son angle, en degrés : elle n'est jamais droite. */
  readonly centre: Vec2;
  readonly angle: number;
  /** La piste dont elle porte la pastille. */
  readonly piste: { readonly numero: number; readonly sur: number };
  /**
   * Ce qu'elle porte, quand ce n'est pas un disque mystère : son tampon, et les deux lignes de sa pastille. Au tournoi, rien n'est à
   * deviner : elle dit « Tournoi », et combien de titres sont en lice.
   */
  readonly ecrit?: { readonly tampon: string; readonly pastille: readonly [string, string] };
  /** Ce dont le disque qui en sort l'a entraînée, en px, du côté de son ouverture : le papier frotte contre lui. */
  readonly entrainee?: number;
  /** Vrai tant que le disque est pris entre ses deux papiers, même à moitié sorti : le papier du devant le recouvre. */
  readonly disqueDedans: boolean;
}

export interface KraftDessinee {
  readonly ombre: Calque;
  /** Son corps : le dos, la tranche et le papier du devant. Il se dessine sous le disque. */
  readonly corps: Calque;
  /** Le papier du devant, une seconde fois : il se dessine sur le disque, et ne se montre que si le disque est dedans. */
  readonly devant: Calque;
}

/** Le tampon « Disque mystère », un peu de travers, comme un vrai : ses lignes centrées l'une sous l'autre, dans la largeur qu'on lui laisse. */
function tampon(nom: NomDeCalque, ecrit: string, mesurer: Mesure): Calque {
  const { lignes, corps } = mettreEnLignes(mesurer, { contenu: ecrit, role: 'titrage' }, K.tampon.place, 'intertitre');
  const ecrites = lignes.map((contenu, rang): Texte => ({
    genre: 'texte',
    role: 'titrage',
    contenu,
    corps,
    en: [0, rang * corps * K.tampon.interligne],
    ancrage: 'milieu',
    teinte: 'expresso',
    ton: TON_DE_BASE,
    fond: { teinte: 'kraft' },
  }));
  return calque(nom, [calque(`${nom}/tourne`, ecrites, { transformations: [{ genre: 'tourner', de: K.tampon.angle }] })], {
    transformations: [{ genre: 'glisser', de: K.tampon.en }],
  });
}

/** La pastille du numéro de la piste : « Piste 3 », et « sur 15 » dessous ; ou les deux lignes qu'on lui donne. */
function pastilleDuNumero(nom: NomDeCalque, [ligne, dessous]: readonly [string, string]): Calque {
  const [grand, petit] = [CORPS.mention, CORPS.gravure];
  // Les deux lignes, serrées autour du centre de la pastille : du haut de la première au pied de la seconde, deux fois « haut ».
  const haut = (ligneDeBaseSous(0, grand) + K.pastille.interligne + ligneDeBaseSous(0, petit)) / 2;
  const contenu: Dessin[] = [
    ...papierDePastille(K.pastille.rayon),
    ligneSurMiel(ligne, 'techniqueFort', grand, ligneDeBaseSous(-haut, grand)),
    ligneSurMiel(dessous, 'technique', petit, haut),
  ];
  return calque(nom, [calque(`${nom}/tourne`, contenu, { transformations: [{ genre: 'tourner', de: K.pastille.angle }] })], {
    transformations: [{ genre: 'glisser', de: K.pastille.en }],
  });
}

const CALQUES = { ombre: 'kraft/ombre', corps: 'kraft/corps', devant: 'kraft/devant' } as const;

/** Le papier du devant, avec ce qu'il porte : sa fenêtre et son encoche, le tampon, la pastille de la piste. */
function papierDuDevant(nom: NomDeCalque, k: Pick<Kraft, 'piste' | 'ecrit'>, textes: Textes, mesurer: Mesure): Dessin[] {
  const fenetre = cercle([0, 0], K.fenetre.rayon, K.fenetre.pans);
  const pastille = k.ecrit?.pastille ?? [remplir(textes.piste.numero, { numero: k.piste.numero }), remplir(textes.piste.sur, { total: k.piste.sur })];
  return [
    // Deux contours de sens opposés : la fenêtre est un trou dans le papier.
    aplat([carreEncoche(), [...fenetre].reverse()], 'kraft', tonAPlat()),
    tampon(`${nom}/tampon`, k.ecrit?.tampon ?? textes.piste.mystere, mesurer),
    pastilleDuNumero(`${nom}/pastille`, pastille),
  ];
}

/** Le déplacement, à l'écran, de la pochette que le disque a entraînée : vers son côté ouvert. */
const entrainementALEcran = (k: Pick<Kraft, 'angle' | 'entrainee'>): Vec2 => surLEcran(tourner([-(k.entrainee ?? 0), 0], k.angle));

/** @param mesurer largeur d'un texte : le tampon descend l'échelle typographique s'il le faut. */
export function dessinerLaPochetteKraft(k: Kraft, textes: Textes, mesurer: Mesure): KraftDessinee {
  const contour = carre();
  const commun = { centre: k.centre, angle: k.angle, role: 'image' } as const;
  const papier = (nom: NomDeCalque): Etage => ({ nom: 'papier', hauteur: K.tranche, contenu: papierDuDevant(nom, k, textes, mesurer) });
  // Ses trois calques sont entraînés ensemble : chacun porte ce déplacement en premier.
  const entrainement: Transformation = { genre: 'glisser', de: entrainementALEcran(k) };
  const entraine = (c: Calque): Calque => ({ ...c, transformations: [entrainement, ...(c.transformations ?? [])] });
  return {
    ombre: entraine(ombreDePile(CALQUES.ombre, { en: k.centre, angle: k.angle, silhouettes: [contour], hauteur: K.tranche, support: 0 })),
    // Le dos et l'épaisseur de la pochette, puis son devant : par la fenêtre et par l'encoche, disque sorti, on en voit le dedans, dans l'ombre.
    corps: entraine(
      pile(CALQUES.corps, {
        ...commun,
        etages: [...tranche({ de: 0, a: K.tranche, silhouettes: [contour], teinte: 'kraft' }), papier(CALQUES.corps)],
      }),
    ),
    devant: { ...entraine(pile(CALQUES.devant, { ...commun, etages: [papier(CALQUES.devant)] })), opacite: k.disqueDedans ? 1 : 0 },
  };
}

/** Ce que le mouvement règle sur la pochette kraft déjà dessinée : ce dont le disque l'entraîne, et son papier du devant, qui ne le recouvre que s'il est dedans. */
export function reglerLaPochetteKraft(k: Pick<Kraft, 'angle' | 'entrainee' | 'disqueDedans'>): Reglage[] {
  return [...Object.values(CALQUES).map((nom) => glissement(nom, 0, entrainementALEcran(k))), visibilite(CALQUES.devant, k.disqueDedans)];
}

/**
 * Vrai si un disque de ce rayon, centré à cet endroit du meuble et tenu à cette hauteur, est pris dans la pochette :
 * il la recouvre au moins en partie, sans être passé au-dessus d'elle.
 */
export function estPrisDansLaPochette(
  k: Pick<Kraft, 'centre' | 'angle'>,
  disque: { readonly en: Vec2; readonly rayon: number; readonly hauteur: number },
): boolean {
  const [x, y] = tourner([disque.en[0] - k.centre[0], disque.en[1] - k.centre[1]], -k.angle);
  const horsDuCarre = Math.hypot(Math.max(0, Math.abs(x) - DEMI), Math.max(0, Math.abs(y) - DEMI));
  return horsDuCarre < disque.rayon && disque.hauteur < K.tranche;
}

/** Où se trouve, sur le meuble, un point donné par rapport au centre de la pochette, avant qu'elle ne soit posée de travers. */
export const surLaPochetteKraft = (k: Pick<Kraft, 'centre' | 'angle'>, p: Vec2): Vec2 => plus(k.centre, tourner(p, k.angle));
