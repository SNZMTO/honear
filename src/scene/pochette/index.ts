/**
 * Une pochette : c'est un joueur. Un carton carré posé sur le bois, un peu de travers,
 * avec son avatar imprimé, son nom d'artiste et le titre de son album.
 * Elle glisse et tourne comme une seule pièce : c'est une pile, son ombre est un calque à part.
 */

import { anneau, cercle, rectangleArrondi } from '../../lowpoly/contours';
import { contraste } from '../../lowpoly/couleur';
import { peindre, VUE_DE_DESSUS } from '../../lowpoly/facette';
import type { Nuance } from '../../lowpoly/ombrage';
import { tonAPlat } from '../../lowpoly/ombrage';
import { surLEcran } from '../../lowpoly/projection';
import { couleur } from '../../lowpoly/tons';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { NomDExpression } from '../../ressources/avatar';
import type { NomDeTeinte } from '../../ressources/palette';
import { MESURES_DE_POCHETTE as M, type Pochette } from '../../ressources/pochettes';
import { CONTRASTES, HAUTEUR_DE_CAPITALE } from '../../ressources/typo';
import type { Echelon, RoleDeTexte } from '../../ressources/typo';
import { dessinerLAvatar } from '../avatar';
import { aplat, peinture, type Calque, type Dessin, type Mesure, type Texte } from '../calque';
import { encreLisibleSur } from '../encre';
import { ombreDePile, reglerUneOmbreDePile } from '../ombre';
import { pile, reglerUnePileQuiGlisse, tranche } from '../pile';
import type { Reglage } from '../reglage';
import { rogner } from '../retouche';
import { faireTenir, seLit } from '../texte';
import { chanfreinDuCarton, coinsUses, contourDuCarton } from './carton';
import { MOTIFS } from './motifs';

export interface PoseDePochette {
  /** Nom du calque : un par joueur. */
  readonly nom: `pochette-${string}`;
  /** Centre de la pochette sur le meuble. */
  readonly centre: Vec2;
  /** Angle de la pochette, en degrés. Posée, elle n'est jamais droite : entre 3 et 9 degrés, d'un côté ou de l'autre. */
  readonly angle: number;
  /** Côté de la pochette, en px : 240 pour « Fais ta pochette », 48 en jeu. */
  readonly taille: number;
  readonly expression: NomDExpression;
  /** Ce dont elle est soulevée au-dessus du bois, en px visibles : son ombre s'en écarte. Négatif, elle s'enfonce (une pastille l'a frappée). */
  readonly leve?: number;
}

/** Vrai si cette encre se lit sur chaque nuance du fond, au corps qu'on voit : le contraste d'un texte, ou celui d'un grand texte. */
function seLitSur(encre: Pick<Texte, 'teinte' | 'ton'>, corps: number, nuances: readonly Nuance[], fond: NomDeTeinte): boolean {
  const vu = surLEcran([0, corps])[1];
  const seuil = vu >= CONTRASTES.grandCorps ? CONTRASTES.grandTexte : CONTRASTES.texte;
  return nuances.every((nuance) => contraste(couleur(encre.teinte, encre.ton), couleur(fond, tonAPlat(nuance))) >= seuil);
}

/** L'étiquette de papier qui porte le nom et l'album : de la marge de gauche à celle de droite, du haut du nom au pied de l'album. */
function bandeauDuNom(lignes: readonly { readonly y: number; readonly corps: number }[], k: number): Dessin {
  const haut = Math.min(...lignes.map((l) => l.y * k - l.corps * HAUTEUR_DE_CAPITALE)) - M.etiquette.retrait * k;
  const bas = Math.max(...lignes.map((l) => l.y * k)) + M.etiquette.retrait * k;
  const largeur = (M.cote - 2 * M.etiquette.bord) * k;
  return aplat([rectangleArrondi(-largeur / 2, haut, largeur, bas - haut, M.etiquette.coin * k, 2)], 'creme', tonAPlat());
}

export interface PochetteDessinee {
  readonly ombre: Calque;
  readonly pochette: Calque;
}

/** @param mesurer largeur d'un texte : le nom d'artiste descend l'échelle typographique s'il est long. */
export function dessinerLaPochette(pochette: Pochette, pose: PoseDePochette, mesurer: Mesure): PochetteDessinee {
  const k = pose.taille / M.cote;
  const miniature = pose.taille <= M.miniature.jusqua;
  const carton = contourDuCarton(pose.taille);

  const centreDeTete = miniature ? M.miniature.tete : M.tete;
  const tete: Vec2 = [centreDeTete[0] * k, centreDeTete[1] * k];
  const echelle = k * (miniature ? M.miniature.echelle : 1);

  // L'image imprimée : le fond, son motif, l'avatar. Elle s'arrête au bord du carton.
  const image: Dessin[] = [
    aplat([carton], pochette.fond, tonAPlat()),
    ...rogner(
      [
        peinture(peindre(MOTIFS[pochette.motif].dessiner(pochette.fond, tete, pose.taille), VUE_DE_DESSUS)),
        ...dessinerLAvatar(pochette.avatar, pose.expression, { tete, echelle }),
      ],
      carton,
    ),
  ];
  const imprime: Dessin[] = [...image];

  if (!miniature) {
    // Le fond porte un motif en deux tons voisins : l'encre doit se lire sur l'un comme sur l'autre.
    const encre = {
      teinte: encreLisibleSur(pochette.fond),
      ton: TON_DE_BASE,
      fond: { teinte: pochette.fond, nuances: MOTIFS[pochette.motif].nuances },
    } as const;
    const utile = (M.cote - 2 * M.marge) * k;
    const mettre = (contenu: string, role: RoleDeTexte, auPlus: Echelon, y: number) => ({
      role,
      y,
      ...faireTenir(mesurer, { contenu, role }, utile, auPlus, k),
    });
    // Une ligne trop petite pour être lue n'est pas imprimée : mieux vaut un nom seul qu'un titre en pattes de mouche.
    const lignes = [mettre(pochette.artiste, 'titrage', 'grandTitre', M.nom), mettre(pochette.album, 'technique', 'gravure', M.album)].filter((l) =>
      seLit(l.corps, true),
    );
    // Sur un fond où l'encre ne se lit pas assez à ce corps, le nom et l'album sont écrits sur une étiquette de papier crème, collée en travers du haut.
    const etiquette = lignes.some((l) => !seLitSur(encre, l.corps, MOTIFS[pochette.motif].nuances, pochette.fond));
    if (etiquette && lignes.length > 0) imprime.push(bandeauDuNom(lignes, k));
    const surLeBandeau = { teinte: encreLisibleSur('creme'), ton: TON_DE_BASE, fond: { teinte: 'creme', ton: tonAPlat() } } as const;
    imprime.push(
      ...lignes.map((l): Texte => ({
        genre: 'texte',
        role: l.role,
        contenu: l.contenu,
        corps: l.corps,
        en: [0, l.y * k],
        ancrage: 'milieu',
        ...(etiquette ? surLeBandeau : encre),
      })),
    );
  }
  return poserUnCarton(pose, image, imprime.slice(image.length), pochette.artiste, true);
}

/**
 * Un carton de pochette posé sur le bois : ce qui est imprimé dessus, chanfreiné, aux coins usés, sur sa tranche, avec son ombre.
 * C'est le même carton pour la pochette d'un joueur, son dos, et la vraie pochette d'un titre.
 * @param image ce qui est imprimé, que le chanfrein éclaire ; @param pardessus ce qui s'y ajoute sans chanfrein (les textes).
 * @param usure ce qui tire au sort les coins usés : le même carton s'use toujours pareil.
 */
export function poserUnCarton(
  pose: Pick<PoseDePochette, 'nom' | 'centre' | 'angle' | 'taille' | 'leve'>,
  image: readonly Dessin[],
  pardessus: readonly Dessin[],
  usure: string,
  avecSonDisque = false,
): PochetteDessinee {
  const k = pose.taille / M.cote;
  const carton = contourDuCarton(pose.taille);
  const imprime: Dessin[] = [...image, ...pardessus];
  // À la taille d'une miniature, le chanfrein est plus fin qu'un demi-pixel : on ne le dessine pas.
  const chanfrein = M.chanfrein * k;
  if (chanfrein >= 0.5) imprime.push(...chanfreinDuCarton(image, carton, chanfrein));
  imprime.push(coinsUses(usure, pose.taille, carton));
  const leve = pose.leve ?? 0;
  const etages = [
    // Le disque glissé dedans, qui dépasse du haut : sous le carton, il n'en montre que son bord.
    ...(avecSonDisque ? [{ nom: 'disque', hauteur: M.tranche / 2, contenu: disqueDansLaPochette(pose.taille) }] : []),
    ...tranche({ de: 0, a: M.tranche, silhouettes: [carton], teinte: 'creme' }),
    { nom: 'imprime', hauteur: M.tranche, contenu: imprime },
  ];
  return {
    ombre: ombreDePile(`${pose.nom}/ombre`, { en: pose.centre, angle: pose.angle, silhouettes: [carton], hauteur: M.tranche + leve, support: 0 }),
    pochette: pile(pose.nom, {
      // Une pochette validée est figée en image : en jeu, on ne déplace que des images.
      role: 'image',
      centre: pose.centre,
      angle: pose.angle,
      etages: etages.map((e) => ({ ...e, hauteur: e.hauteur + leve })),
    }),
  };
}

/** Le disque glissé dans une pochette de ce côté, qui en dépasse par le haut : du vinyle, et deux sillons un ton plus clair. */
function disqueDansLaPochette(cote: number): Dessin[] {
  const D = M.disque;
  const rayon = D.rayon * cote;
  const centre: Vec2 = [0, -cote / 2 - D.depasse * cote + rayon];
  return [
    aplat([cercle(centre, rayon, D.pans)], 'vinyle', tonAPlat()),
    ...D.sillons.map((part) => aplat(anneau(centre, part * rayon, part * rayon - 1, D.pans), 'vinyle', tonAPlat(1))),
  ];
}

/** Où est une pochette qui bouge : son centre sur le meuble, son angle, et ce dont elle est soulevée. */
export type PlaceDePochette = Pick<PoseDePochette, 'centre' | 'angle' | 'leve'>;

/**
 * Ce que le mouvement règle sur une pochette déjà dessinée : elle glisse, tourne et se soulève d'un bloc, et son ombre la suit,
 * s'écarte quand elle monte et se resserre quand elle se pose. On ne redessine rien : c'est une image.
 * @param dessineeA la place où elle a été dessinée.
 */
export function reglerLaPochette(dessinee: PochetteDessinee, taille: number, dessineeA: PlaceDePochette, a: PlaceDePochette): Reglage[] {
  const leve = a.leve ?? 0;
  return [
    ...reglerUnePileQuiGlisse(dessinee.pochette, surLEcran(dessineeA.centre, dessineeA.leve ?? 0), surLEcran(a.centre, leve), a.angle),
    ...reglerUneOmbreDePile(dessinee.ombre.nom, {
      en: a.centre,
      angle: a.angle,
      silhouettes: [contourDuCarton(taille)],
      hauteur: M.tranche + leve,
      support: 0,
    }),
  ];
}
