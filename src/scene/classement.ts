/**
 * Le classement, le tableau des scores qu'on lit : une feuille crème où chacun a sa ligne, du premier au dernier. Son rang, sa
 * pochette en petit (la tête qu'il fait, côté dos si sa connexion est tombée), son nom d'artiste, ce que la piste lui vaut (« A T »,
 * « +2 », « Entrée ») et ses points. Au-delà d'une colonne pleine, une deuxième s'ouvre à côté. Ce module ne fait que la poser
 * dans la place qu'on lui donne.
 */

import { rectangleArrondi } from '../lowpoly/contours';
import { placer, type Polygone } from '../lowpoly/polygones';
import { surLEcran } from '../lowpoly/projection';
import { TON_DE_BASE } from '../lowpoly/tons';
import type { Vec2 } from '../lowpoly/vecteurs';
import { hitParade, type EtatDeLaPartie } from '../regles/partie';
import { PAPIER, TABLEE } from '../ressources/tablee';
import type { Textes } from '../ressources/textes';
import { CORPS, HAUTEUR_DE_CAPITALE, type Echelon } from '../ressources/typo';
import { aplat, aPlatSurLeMeuble, type Calque, type Mesure, type Texte } from './calque';
import { surLeBois, type Regard } from './meuble';
import { ombreAuPied } from './ombre';
import { pointsEcrits } from './phrases';
import { dessinerLaTablee, eventail, type JoueurPose } from './tablee';
import { faireTenir } from './texte';

const C = TABLEE.telephone.classement;

/** Une ligne du classement : le joueur tel qu'on pose sa pochette, son rang, son nom, ses points, et ce que la piste lui vaut, une marque par pastille. */
export interface LigneDuClassement {
  readonly id: string;
  readonly pose: JoueurPose;
  readonly rang: number;
  readonly nom: string;
  readonly points: number;
  readonly marques: readonly string[];
}

/** Où se pose le classement, en px dans le regard : son coin haut-gauche, sa place au plus, combien de lignes par colonne, la hauteur d'une ligne au plus. */
export interface PlaceDuClassement {
  readonly gauche: number;
  readonly haut: number;
  readonly largeur: number;
  readonly hauteur: number;
  readonly parColonne: number;
  readonly ligne: number;
}

/**
 * Les lignes d'un état, du premier au dernier : ce que chacun a trouvé pendant la piste (« A T »), ou ce qu'elle lui a rapporté depuis
 * l'état d'avant (« +2 »), ou rien.
 */
export function lignesDuClassement(
  etat: EtatDeLaPartie,
  textes: Textes,
  montrer: 'trouvailles' | 'points' | 'rien',
  avant?: EtatDeLaPartie,
): LigneDuClassement[] {
  const poses = eventail(etat, textes, montrer, avant);
  return hitParade(etat).flatMap(({ joueur, rang }, i) => {
    const pose = poses[i];
    if (pose === undefined) return [];
    return [
      { id: joueur.id, pose: { ...pose, pastilles: [] }, rang, nom: joueur.pochette.artiste, points: joueur.points, marques: pose.pastilles ?? [] },
    ];
  });
}

/** Les premières lignes, autant qu'il en tient ; et la sienne, à la place de la dernière, si elle n'en est pas. */
export function lesPremiersEtToi(lignes: readonly LigneDuClassement[], toi: string, n: number): LigneDuClassement[] {
  if (lignes.length <= n) return [...lignes];
  const premiers = lignes.slice(0, n);
  if (premiers.some((l) => l.id === toi)) return premiers;
  const sienne = lignes.find((l) => l.id === toi);
  return sienne !== undefined ? [...premiers.slice(0, n - 1), sienne] : premiers;
}

/** Le corps des noms d'une ligne de cette hauteur : le plus grand échelon dont la capitale y tient avec de l'air. */
const echelonPour = (ligne: number): Echelon => (ligne >= 30 ? 'texte' : ligne >= 24 ? 'mention' : 'gravure');

/**
 * Le classement posé dans cette place : la feuille, taillée à ses lignes, puis les pochettes en petit.
 * @param nom ce qui distingue ses calques : les pochettes s'appellent `pochette-${nom}-1`, `-2`…
 */
export function dessinerLeClassement(
  lignes: readonly LigneDuClassement[],
  place: PlaceDuClassement,
  regard: Regard,
  textes: Textes,
  mesurer: Mesure,
  nom = 'classement',
): Calque[] {
  if (lignes.length === 0) return [];
  // Ce que la projection garde d'une hauteur posée à plat : un texte couché y est écrasé d'autant.
  const ecrasement = surLEcran([0, 1])[1] - surLEcran([0, 0])[1];
  const colonnes = Math.ceil(lignes.length / place.parColonne);
  const parColonne = Math.ceil(lignes.length / colonnes);
  const ligne = Math.min(place.ligne, (place.hauteur - 2 * C.marge) / parColonne);
  const largeurDeColonne = place.largeur / colonnes;
  const hauteur = parColonne * ligne + 2 * C.marge;
  const echelon = echelonPour(ligne);
  const corps = CORPS[echelon];
  const cote = ligne * C.pochette;
  // La place du rang : celle du plus long, pour que les noms s'alignent.
  const largeurDuRang = Math.max(...lignes.map((l) => mesurer({ contenu: String(l.rang), role: 'techniqueFort', corps })));

  const ecrit = (
    contenu: string,
    role: Texte['role'],
    c: number,
    x: number,
    y: number,
    ancrage: Texte['ancrage'],
    teinte: Texte['teinte'],
  ): Texte => ({
    genre: 'texte',
    contenu,
    role,
    corps: c,
    en: surLeBois(regard, x, y),
    ancrage,
    teinte,
    ton: TON_DE_BASE,
    fond: { teinte: 'creme' },
  });
  const textesDesLignes: Texte[] = [];
  const pastilles: Polygone[] = [];
  const places: { readonly en: readonly [number, number]; readonly angle: number }[] = [];
  for (const [i, l] of lignes.entries()) {
    const colonne = Math.floor(i / parColonne);
    const gauche = place.gauche + colonne * largeurDeColonne + C.marge;
    const droite = place.gauche + (colonne + 1) * largeurDeColonne - C.marge;
    const milieu = place.haut + C.marge + (i % parColonne) * ligne + ligne / 2;
    // La ligne de base : la capitale, écrasée comme la feuille, centrée sur la ligne.
    const base = (c: number): number => milieu + (c * HAUTEUR_DE_CAPITALE * ecrasement) / 2;
    textesDesLignes.push(ecrit(String(l.rang), 'techniqueFort', corps, gauche + largeurDuRang, base(corps), 'fin', 'expresso'));
    const xPochette = gauche + largeurDuRang + C.ecart + cote / 2;
    places.push({ en: [xPochette, milieu], angle: i % 2 === 0 ? -3 : 3 });
    // À deux colonnes, les points s'écrivent seuls : le nom garde la place.
    const points = colonnes > 1 ? String(l.points) : pointsEcrits(textes, l.points);
    textesDesLignes.push(ecrit(points, 'techniqueFort', corps, droite, base(corps), 'fin', 'expresso'));
    let finDuNom = droite - mesurer({ contenu: points, role: 'techniqueFort', corps }) - C.ecart;
    // Ce que la piste lui vaut, chaque marque sur une petite pastille miel : on ne la confond pas avec ses points.
    for (const marque of [...l.marques].reverse()) {
      const largeur = mesurer({ contenu: marque, role: 'techniqueFort', corps });
      const demi = (corps * HAUTEUR_DE_CAPITALE * ecrasement) / 2 + C.pastille;
      const de = surLeBois(regard, finDuNom - largeur - 2 * C.pastille, milieu - demi);
      const a = surLeBois(regard, finDuNom, milieu + demi);
      pastilles.push(rectangleArrondi(de[0], de[1], a[0] - de[0], a[1] - de[1], C.pastille, 2));
      textesDesLignes.push({
        ...ecrit(marque, 'techniqueFort', corps, finDuNom - C.pastille, base(corps), 'fin', 'expresso'),
        fond: { teinte: 'miel' },
      });
      finDuNom -= largeur + 2 * C.pastille + C.ecart / 2;
    }
    if (l.marques.length > 0) finDuNom -= C.ecart / 2;
    const debutDuNom = xPochette + cote / 2 + C.ecart;
    const tenu = faireTenir(mesurer, { contenu: l.nom, role: 'titrage' }, Math.max(0, finDuNom - debutDuNom), echelon);
    textesDesLignes.push(ecrit(tenu.contenu, 'titrage', tenu.corps, debutDuNom, base(tenu.corps), 'debut', 'expresso'));
  }

  // La feuille, taillée à ses lignes ; à plat sur le bois, un rien de travers.
  const coin = surLeBois(regard, place.gauche, place.haut);
  const oppose = surLeBois(regard, place.gauche + place.largeur, place.haut + hauteur);
  const centre: Vec2 = [(coin[0] + oppose[0]) / 2, (coin[1] + oppose[1]) / 2];
  const [l, h] = [oppose[0] - coin[0], oppose[1] - coin[1]];
  const feuille = placer(rectangleArrondi(-l / 2, -h / 2, l, h, 5, 3), { en: centre, angle: C.angle });
  const epaisseur = PAPIER.epaisseur;
  return [
    ombreAuPied(`classement-${nom}/ombre`, { silhouettes: [feuille], hauteur: epaisseur, support: 0, paliers: 2 }),
    {
      ...aPlatSurLeMeuble(`classement-${nom}`, epaisseur, [
        aplat([feuille], 'creme', 3),
        ...(pastilles.length > 0 ? [aplat(pastilles, 'miel', 3)] : []),
        ...textesDesLignes,
      ]),
      role: 'decor',
    },
    ...dessinerLaTablee(
      lignes.map((l) => l.pose),
      places,
      cote,
      regard,
      TABLEE.telephone.trouve,
      mesurer,
      nom,
    ),
  ];
}
