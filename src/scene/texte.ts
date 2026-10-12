/**
 * La mise en place des textes : faire tenir un texte dans la place qu'on lui donne, sur une ligne ou sur plusieurs,
 * sans jamais sortir de l'échelle typographique. Un texte trop long descend d'un échelon, il ne rétrécit pas à la demande ;
 * et s'il ne tient pas au plus petit, il est abrégé.
 */

import { surLEcran } from '../lowpoly/projection';
import { radians } from '../lowpoly/vecteurs';
import { CORPS, CORPS_LISIBLE, ECHELONS, type Echelon } from '../ressources/typo';
import type { Mesure, Texte } from './calque';
import { OU_COUPER } from './typographie';

/** Le signe qui dit qu'un texte a été abrégé. */
const ELLIPSE = '…';

/** Un texte prêt à être posé : ce qu'il en reste à écrire, et son corps. */
export interface TexteMisEnPlace {
  readonly contenu: string;
  readonly corps: number;
}

/** La place qu'un arc de cercle offre à une ligne de texte, en px : sa longueur sur la ligne de base, là où les lettres sont posées. */
export const placeSurUnArc = (rayon: number, ouvertureEnDegres: number): number => rayon * radians(ouvertureEnDegres);

/**
 * Fait tenir un texte dans une place : le plus grand corps qui passe, en partant d'un échelon et en descendant l'échelle.
 * Si même le plus petit échelon ne suffit pas, le texte est abrégé, une lettre après l'autre, et fini par une ellipse.
 * @param place largeur disponible sur la ligne de base, en px.
 * @param echelle taille de l'objet qui porte le texte, par rapport à sa taille de référence.
 */
export function faireTenir(mesurer: Mesure, texte: Pick<Texte, 'contenu' | 'role'>, place: number, auPlus: Echelon, echelle = 1): TexteMisEnPlace {
  let corps = CORPS[auPlus] * echelle;
  for (const echelon of ECHELONS.slice(ECHELONS.indexOf(auPlus))) {
    corps = CORPS[echelon] * echelle;
    if (mesurer({ ...texte, corps }) <= place) return { contenu: texte.contenu, corps };
  }
  const signes = [...texte.contenu];
  while (signes.length > 1) {
    signes.pop();
    const contenu = signes.join('').trimEnd() + ELLIPSE;
    if (mesurer({ role: texte.role, contenu, corps }) <= place) return { contenu, corps };
  }
  return { contenu: ELLIPSE, corps };
}

/** Un texte mis en lignes : ce que chaque ligne écrit, et le corps qu'elles partagent. */
export interface TexteEnLignes {
  readonly lignes: readonly string[];
  readonly corps: number;
}

/**
 * Met un texte en lignes dans une largeur donnée : il passe à la ligne à une espace qui peut se couper, jamais au milieu d'un mot,
 * ni à une espace insécable (avant un signe double, entre un nombre et son unité).
 * Le corps est celui que demande son mot le plus long ; comme partout, il descend l'échelle plutôt que de rétrécir à la demande.
 * S'il fait trop de lignes, il la descend encore ; et s'il en fait trop au plus petit corps, la dernière est abrégée.
 * @param place largeur qu'une ligne peut prendre, en px.
 * @param lignesAuPlus le plus de lignes qu'on lui laisse : autant qu'il veut, par défaut.
 */
export function mettreEnLignes(
  mesurer: Mesure,
  texte: Pick<Texte, 'contenu' | 'role'>,
  place: number,
  auPlus: Echelon,
  echelle = 1,
  lignesAuPlus = Infinity,
): TexteEnLignes {
  const mots = texte.contenu.split(OU_COUPER).filter((mot) => mot !== '');
  const largeur = (contenu: string, corps: number): number => mesurer({ role: texte.role, contenu, corps });
  // Le mot le plus long, mesuré au plus grand corps permis, dit jusqu'où il faut descendre l'échelle.
  const auPlusGrand = CORPS[auPlus] * echelle;
  const plusLong = mots.reduce((long, mot) => (largeur(mot, auPlusGrand) > largeur(long, auPlusGrand) ? mot : long), '');
  const depart = faireTenir(mesurer, { contenu: plusLong, role: texte.role }, place, auPlus, echelle).corps;
  const enLignes = (corps: number): string[] => {
    const lignes: string[] = [];
    for (const mot of mots) {
      const derniere = lignes[lignes.length - 1];
      // Un mot qui ne tient pas, même seul et au plus petit corps, est abrégé comme le ferait une ligne seule.
      const ecrit = largeur(mot, corps) <= place ? mot : faireTenir(mesurer, { contenu: mot, role: texte.role }, place, auPlus, echelle).contenu;
      if (derniere !== undefined && largeur(`${derniere} ${ecrit}`, corps) <= place) lignes[lignes.length - 1] = `${derniere} ${ecrit}`;
      else lignes.push(ecrit);
    }
    return lignes;
  };
  let mis: TexteEnLignes = { lignes: enLignes(depart), corps: depart };
  for (const echelon of ECHELONS.slice(ECHELONS.indexOf(auPlus))) {
    const corps = CORPS[echelon] * echelle;
    if (corps > depart || mis.lignes.length <= lignesAuPlus) continue;
    mis = { lignes: enLignes(corps), corps };
  }
  if (mis.lignes.length <= lignesAuPlus) return mis;
  // Trop de lignes au plus petit corps : la dernière qu'on lui laisse prend tout le reste, et s'abrège.
  const reste = { contenu: mis.lignes.slice(lignesAuPlus - 1).join(' '), role: texte.role };
  const plusPetit = ECHELONS[ECHELONS.length - 1] ?? auPlus;
  return { lignes: [...mis.lignes.slice(0, lignesAuPlus - 1), faireTenir(mesurer, reste, place, plusPetit, echelle).contenu], corps: mis.corps };
}

/**
 * Vrai si un texte de ce corps se lit encore à l'écran.
 * @param couche vrai s'il est couché sur le meuble : il est alors écrasé comme le reste, et c'est sa hauteur écrasée qui compte.
 */
export const seLit = (corps: number, couche: boolean): boolean => (couche ? surLEcran([0, corps])[1] : corps) >= CORPS_LISIBLE;
