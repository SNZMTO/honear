/**
 * Le verso du disque : son côté réponse, tel qu'on le verra une fois le disque retourné et posé. Deux façons de faire,
 * à comparer : l'étiquette est la pochette, ou tout le disque est la pochette. Son fond, le vinyle, se dessine d'avance ;
 * la réponse (la pochette, le titre, l'artiste) ne se dessine qu'à la révélation, et c'est peu de chose.
 */

import { anneau, arc, cercle } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { azimutDeLaLampe, nuancer, tonAPlat } from '../../lowpoly/ombrage';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Reponse } from '../../regles/piste';
import type { Densite } from '../../ressources/densites';
import { ETIQUETTE } from '../../ressources/etiquette';
import type { NomDeTeinte } from '../../ressources/palette';
import { PLATINE } from '../../ressources/platine';
import { VERSO } from '../../ressources/verso';
import type { Vignette } from '../../ressources/vignettes';
import { aplat, aPlatSurLeMeuble, peinture, type Dessin, type Mesure, type Texte } from '../calque';
import { papierDEtiquette, trouDeLAxe, type Etiquette } from '../etiquette/papier';
import { ecrireUneReponse } from '../etiquette/reponse';
import { deplacerLesTons, rogner } from '../retouche';
import { faireTenir, placeSurUnArc } from '../texte';
import { dessinerUneVignette } from '../vignette';
import { vinyle } from '../vinyle';
import { ICI } from './centre';

const D = PLATINE.disque;

/** Les deux façons de montrer la réponse : l'étiquette est la pochette, ou tout le disque l'est. */
export const GENRES_DE_VERSO = ['etiquette', 'disque'] as const;
export type GenreDeVerso = (typeof GENRES_DE_VERSO)[number];
/** Celle du jeu ; et celles qu'on lui compare, tant que le choix n'est pas arrêté. */
export const VERSO_DU_JEU: GenreDeVerso = 'etiquette';
export const VERSOS_A_COMPARER: readonly GenreDeVerso[] = GENRES_DE_VERSO.filter((genre) => genre !== VERSO_DU_JEU);

/** Le verso d'un disque : la façon dont il montre la réponse, et la réponse, qu'on ne connaît qu'à la révélation. */
export interface Verso {
  readonly genre: GenreDeVerso;
  readonly reponse?: Reponse;
}

/** Ce que le verso dit, une fois la réponse tombée. */
export type VersoRevele = Required<Verso>;

/** Les deux couches d'un verso, autour du centre du disque, posé à plat : son fond, et la réponse par-dessus. */
export interface VersoDessine {
  readonly fond: Dessin[];
  readonly reponse: Dessin[];
}

/**
 * La vignette d'une réponse, ou rien si sa pochette est une vraie image : celle-là arrivera avec la source de musique, et rien
 * ne sait encore la montrer. Ce dessin lui garde sa place, en papier nu.
 */
const vignetteDe = (reponse: Reponse): Vignette | undefined => ('vignette' in reponse.pochette ? reponse.pochette.vignette : undefined);

/** La teinte du papier qui attend une vraie pochette. */
const PAPIER_NU: NomDeTeinte = 'creme';

/** La pochette, ronde, imprimée à plat autour du centre du disque. Son motif ne part jamais du milieu. */
function pochetteRonde(reponse: Reponse, rayon: number, pans: number): Dessin[] {
  const [x, y] = VERSO.origineDuMotif;
  const [rond, vignette] = [cercle(ICI, rayon, pans), vignetteDe(reponse)];
  return vignette !== undefined ? dessinerUneVignette(vignette, rond, [x * rayon, y * rayon], 2 * rayon) : [aplat([rond], PAPIER_NU, tonAPlat())];
}

/**
 * « L'étiquette est la pochette ». Le vinyle garde ses sillons au bord ; autour de la pochette, une large plage lisse
 * porte le titre en arc, en haut, et l'artiste sur une ligne droite, en bas, en crème, comme gravés près de l'étiquette.
 */
function etiquettePochette(v: VersoRevele, mesurer: Mesure, densite: Densite): Dessin[] {
  const E = VERSO.etiquette;
  // Le vinyle lisse passe par tous ses tons sous la lampe : le texte doit se lire sur le plus clair comme sur le plus sombre.
  const gravure = { teinte: 'creme', ton: TON_DE_BASE, fond: { teinte: 'vinyle', nuances: [-1, 0, 1] } } as const;
  const titre: Texte = {
    genre: 'texte',
    role: 'titrage',
    ...faireTenir(mesurer, { contenu: v.reponse.titre, role: 'titrage' }, placeSurUnArc(E.titre.rayon, E.titre.ouverture), 'titre'),
    en: ICI,
    ancrage: 'milieu',
    arc: { centre: ICI, rayon: E.titre.rayon, milieu: -90, lecture: 'dessus' },
    ...gravure,
  };
  // L'artiste s'écrit droit : sur un arc aussi serré, une capitale sans empattement penche, et un I se lit comme une barre.
  const artiste: Texte = {
    genre: 'texte',
    role: 'technique',
    ...faireTenir(mesurer, { contenu: v.reponse.artiste, role: 'technique' }, E.artiste.place, 'texte'),
    en: [0, E.artiste.sous],
    ancrage: 'milieu',
    ...gravure,
  };
  return [
    aPlatSurLeMeuble('disque/verso/pochette', D.epaisseur + ETIQUETTE.colle, [
      // Un liseré crème, comme le bord du papier, puis l'image.
      aplat([cercle(ICI, E.pochette, densite.pansDeDisque)], 'creme', tonAPlat(-1)),
      ...pochetteRonde(v.reponse, E.pochette - E.lisere, densite.pansDeDisque),
      trouDeLAxe({ rayon: D.etiquette, pans: densite.pansDeDisque }),
    ]),
    aPlatSurLeMeuble('disque/verso/titres', D.epaisseur, [titre, artiste]),
  ];
}

/** Les deux secteurs clairs d'un disque, comptés depuis l'axe de la lumière, en degrés : du côté de la lampe, et à l'opposé. */
const SECTEURS_CLAIRS = [0, 180] as const;

/** Un secteur de disque, de part et d'autre d'un angle : une fenêtre convexe, pour y rogner une image. */
const secteur = (rayon: number, milieu: number, demi: number): Vec2[] => [ICI, ...arc(ICI, rayon * 1.1, milieu - demi, milieu + demi, 6)];

/**
 * « Tout le disque est la pochette ». Elle est imprimée sur toute la face, traversée de quelques sillons ;
 * sous la lampe, elle prend un ton de plus sur les deux secteurs où le vinyle brille. L'étiquette miel dit le titre et l'artiste.
 */
function disquePochette(v: VersoRevele, mesurer: Mesure, densite: Densite): Dessin[] {
  const P = VERSO.disque;
  const pans = densite.pansDeDisque;
  const fond: NomDeTeinte = vignetteDe(v.reponse)?.fond ?? PAPIER_NU;
  const image = pochetteRonde(v.reponse, P.image, pans);
  // Les deux secteurs clairs d'un vinyle, dans l'axe de la lampe : là où ses sillons sont en travers de la lumière. Les mêmes qu'au recto.
  const brillants = SECTEURS_CLAIRS.flatMap((cote) => deplacerLesTons(rogner(image, secteur(P.image, azimutDeLaLampe() + cote, P.secteur)), 1));
  const sillons = aplat(
    P.sillons.flatMap((rayon) => anneau(ICI, rayon, rayon - P.largeurDeSillon, pans)),
    fond,
    nuancer(tonAPlat(), -2),
  );
  const etiquette: Etiquette = { rayon: D.etiquette, pans };
  return [
    aPlatSurLeMeuble('disque/verso/pochette', D.epaisseur, [...image, ...brillants, sillons]),
    aPlatSurLeMeuble('disque/verso/etiquette', D.epaisseur + ETIQUETTE.colle, [
      ...papierDEtiquette(etiquette),
      ...ecrireUneReponse(etiquette, v.reponse, mesurer),
    ]),
  ];
}

/**
 * Le fond d'un verso : son vinyle, qu'on connaît avant la réponse et qu'on dessine donc d'avance. Quand l'étiquette est la pochette,
 * il a une large plage lisse autour d'elle, pour le titre et l'artiste.
 */
export function dessinerLeFondDuVerso(genre: GenreDeVerso, densite: Densite): Dessin[] {
  const { lisse, pochette } = VERSO.etiquette;
  const centreDeFace = genre === 'etiquette' ? { centreDeFace: { sortie: lisse, etiquette: pochette } } : {};
  return [peinture(peindre(vinyle({ centre: ICI, dessus: D.epaisseur, ...centreDeFace }, densite)))];
}

/** La réponse au verso : la pochette, le titre et l'artiste, posés sur son fond. On ne la dessine qu'à la révélation. */
export function dessinerLaReponseAuVerso(v: VersoRevele, mesurer: Mesure, densite: Densite): Dessin[] {
  return v.genre === 'etiquette' ? etiquettePochette(v, mesurer, densite) : disquePochette(v, mesurer, densite);
}

/** Le verso entier : son fond, et la réponse si elle est tombée. */
export function dessinerLeVerso({ genre, reponse }: Verso, mesurer: Mesure, densite: Densite): VersoDessine {
  return {
    fond: dessinerLeFondDuVerso(genre, densite),
    reponse: reponse !== undefined ? dessinerLaReponseAuVerso({ genre, reponse }, mesurer, densite) : [],
  };
}
