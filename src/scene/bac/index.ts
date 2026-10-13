/**
 * Le bac à disques, à gauche de la platine : ce sont les playlists. Une caisse de lattes, où les pochettes des playlists
 * se tiennent debout derrière des intercalaires de couleur, un par thème, dont l'onglet porte le titre. On feuillette.
 * Ce module range ce qu'on lui donne et ne lit rien d'autre ; il ne modifie jamais le jeu.
 *
 * La caisse est figée. Chaque intercalaire et chaque pochette est un calque à part, figé en image : on les déplace d'un bloc
 * quand on feuillette. Ils se tiennent serrés, et l'ombre de chacun tombe sur le dos de son voisin : on ne la voit pas.
 */

import { arc, rectangleArrondi } from '../../lowpoly/contours';
import { facetteAPlat, peindre, type Facette } from '../../lowpoly/facette';
import { boiteChanfreinee } from '../../lowpoly/formes/boite';
import { plaqueDebout } from '../../lowpoly/formes/plaque';
import { tonDeFacette } from '../../lowpoly/ombrage';
import type { Polygone } from '../../lowpoly/polygones';
import { hauteurPour, projeter } from '../../lowpoly/projection';
import { TON_DE_BASE } from '../../lowpoly/tons';
import { radians, type Vec2, type Vec3 } from '../../lowpoly/vecteurs';
import { BAC } from '../../ressources/bac';
import type { Densite } from '../../ressources/densites';
import type { NomDeTeinte } from '../../ressources/palette';
import { HAUTEUR_DE_CAPITALE } from '../../ressources/typo';
import { aplat, calque, peinture, type Calque, type Dessin, type Mesure, type Texte } from '../calque';
import { encreLisibleSur } from '../encre';
import { ombreAuPied } from '../ombre';
import { glissement, type Reglage } from '../reglage';
import { mettreEnLignes } from '../texte';

const C = BAC.caisse;
const R = BAC.rangement;

/** Ce qui se tient debout dans le bac, de l'avant vers le fond : un intercalaire et son titre, ou une pochette de playlist. */
export type Rangee = (
  | { readonly genre: 'intercalaire'; readonly cle: string; readonly titre: string; readonly teinte: NomDeTeinte }
  | { readonly genre: 'pochette'; readonly cle: string; readonly teinte: NomDeTeinte }
) & {
  /** Penchée d'autant de degrés, si ce n'est pas comme les autres : un intercalaire qu'on a fait basculer vers l'avant. */
  readonly penche?: number;
  /** Soulevée d'autant de px : la playlist qu'on sort du bac. Donnée, même nulle, la playlist se règle sans se redessiner. */
  readonly leve?: number;
};

export interface EtatDuBac {
  readonly rangees: readonly Rangee[];
}

/** Un point donné par rapport au coin de la caisse, replacé dans le plan du meuble. */
const dansLaCaisse = (x: number, y: number): Vec2 => [BAC.position[0] + x, BAC.position[1] + y];

/** La normale d'une face qui se tient debout face au joueur, penchée en arrière : c'est elle qui lui donne son ton. */
const NORMALE_DEBOUT: Vec3 = [0, Math.cos(radians(R.penche)), Math.sin(radians(R.penche))];

/** Le pied de la rangée de ce rang, dans la profondeur du meuble. */
const piedDuRang = (rang: number): number => BAC.position[1] + C.profondeur - C.paroi - R.avant - rang * R.pas;

/** Une paroi de la caisse : une boîte peinte, de tout son haut. */
function paroi(x: number, y: number, largeur: number, profondeur: number, densite: Densite): Dessin {
  const [px, py] = dansLaCaisse(x, y);
  return peinture(
    peindre(
      boiteChanfreinee({
        x: px,
        y: py,
        largeur,
        profondeur,
        rayon: C.rayon,
        pansParCoin: Math.max(2, densite.pansDeCoin / 2),
        base: 0,
        epaisseur: C.hauteur,
        chanfrein: C.chanfrein,
        teinte: C.teinte,
      }),
    ),
  );
}

/** Une facette posée sur la face avant de la caisse, un rien devant elle : un joint entre deux lattes, la fente de la poignée. */
function surLaFaceAvant(contour: Polygone, teinte: NomDeTeinte): Facette {
  const y = BAC.position[1] + C.profondeur + 0.01;
  return { sommets: contour.map(([x, h]): Vec3 => [BAC.position[0] + x, y, hauteurPour(h)]).reverse(), teinte, nuance: -1 };
}

/** La paroi avant : ses trois lattes, leurs joints, et la fente de la poignée, au milieu de la latte du haut : on y voit le premier rang. */
function paroiAvant(densite: Densite, auPremierRang: NomDeTeinte): Dessin[] {
  const { joints, joint, poignee } = C;
  const traits = joints.map((h) =>
    surLaFaceAvant(rectangleArrondi(C.chanfrein, h - joint / 2, C.largeur - 2 * C.chanfrein, joint, 0, 1), C.teinteDesJoints),
  );
  const milieu = C.largeur / 2;
  const fente = rectangleArrondi(
    milieu - poignee.largeur / 2,
    poignee.bas,
    poignee.largeur,
    poignee.haut - poignee.bas,
    (poignee.haut - poignee.bas) / 2,
    4,
  );
  return [paroi(0, C.profondeur - C.paroi, C.largeur, C.paroi, densite), peinture(peindre([...traits, surLaFaceAvant(fente, auPremierRang)]))];
}

/** Le contour d'une pochette, dans le plan de sa face, centré sur la largeur de la caisse. */
function contourDeFace(largeur: number, hauteur: number, coin: number, pans: number): Polygone {
  return rectangleArrondi(BAC.position[0] + (C.largeur - largeur) / 2, 0, largeur, hauteur, coin, pans);
}

/**
 * Le contour d'un intercalaire et de son onglet : un seul carton, dont on fait le tour en partant du coin bas gauche,
 * dans le plan de sa face (x à droite, hauteur vers le haut). Les coins sont arrondis ; les épaules de l'onglet sont des creux, jamais des pointes.
 */
function contourDIntercalaire(place: number, pans: number): Polygone {
  const I = BAC.intercalaire;
  const O = I.onglet;
  const [g, L, H, c] = [BAC.position[0] + (C.largeur - I.largeur) / 2, I.largeur, I.hauteur, I.coin];
  const x0 = g + place;
  return [
    ...arc([g + c, c], c, 180, 270, pans),
    ...arc([g + L - c, c], c, 270, 360, pans),
    ...arc([g + L - c, H - c], c, 0, 90, pans),
    [x0 + O.largeur, H],
    ...arc([x0 + O.largeur - O.coin, H + O.hauteur - O.coin], O.coin, 0, 90, pans),
    ...arc([x0 + O.coin, H + O.hauteur - O.coin], O.coin, 90, 180, pans),
    [x0, H],
    ...arc([g + c, H - c], c, 90, 180, pans),
  ];
}

/**
 * L'étiquette de papier de l'onglet, et le titre qui s'y écrit. Debout face au joueur, elle n'est pas écrasée :
 * on la dessine telle qu'on la voit, à l'écran.
 */
function etiquetteDOnglet(titre: string, place: number, pied: number, mesurer: Mesure): Dessin[] {
  const I = BAC.intercalaire;
  const { retrait, lignes: auPlus, interligne } = I.etiquette;
  const gauche = (C.largeur - I.largeur) / 2 + place + retrait;
  const largeur = I.onglet.largeur - 2 * retrait;
  const bas = I.hauteur + retrait;
  const haut = I.hauteur + I.onglet.hauteur - retrait;
  // La face penche en arrière : ses points montent et reculent ensemble. On les pose comme le reste du carton.
  const surLaFace = (x: number, h: number): Vec2 =>
    projeter([BAC.position[0] + x, pied - Math.tan(radians(R.penche)) * hauteurPour(h), hauteurPour(C.fond + h)]);
  const papier = [surLaFace(gauche, bas), surLaFace(gauche + largeur, bas), surLaFace(gauche + largeur, haut), surLaFace(gauche, haut)];
  const ton = tonDeFacette({ normale: NORMALE_DEBOUT });
  const mis = mettreEnLignes(mesurer, { contenu: titre, role: 'technique' }, largeur - 2 * retrait, 'gravure', 1, auPlus);
  const hauteurDesLignes = mis.lignes.length * mis.corps * HAUTEUR_DE_CAPITALE + (mis.lignes.length - 1) * interligne;
  const milieu = surLaFace(gauche + largeur / 2, (bas + haut) / 2);
  const textes = mis.lignes.map((contenu, rang): Texte => ({
    genre: 'texte',
    contenu,
    role: 'technique',
    corps: mis.corps,
    en: [milieu[0], milieu[1] - hauteurDesLignes / 2 + (rang + 1) * mis.corps * HAUTEUR_DE_CAPITALE + rang * interligne],
    ancrage: 'milieu',
    teinte: encreLisibleSur('creme'),
    ton: TON_DE_BASE,
    fond: { teinte: 'creme', ton },
  }));
  return [aplat([papier], 'creme', ton), ...textes];
}

/** En deçà de cet écart à son inclinaison de repos, en degrés, l'étiquette d'un intercalaire se lit encore à sa place. */
const BASCULE_LISIBLE = 3;

/** Une rangée du bac, debout à son rang : une pochette, ou un intercalaire et l'étiquette de son onglet. */
function dessinerUneRangee(rangee: Rangee, rang: number, rangDIntercalaire: number, densite: Densite, mesurer: Mesure): Calque {
  const pans = Math.max(2, densite.pansDeCoin / 2);
  const y = piedDuRang(rang);
  if (rangee.genre === 'pochette') {
    const P = BAC.pochette;
    const carton = plaqueDebout({
      contour: contourDeFace(P.largeur, P.hauteur, P.coin, pans),
      y,
      base: C.fond,
      epaisseur: P.epaisseur,
      chanfrein: P.chanfrein,
      penche: rangee.penche ?? R.penche,
      teinte: rangee.teinte,
    });
    // Soulevée, elle monte d'un bloc : on ne la redessine pas (voir `reglerUnePlaylist`).
    return calque(`pochette-${rangee.cle}`, [peinture(peindre(carton))], {
      role: 'image',
      ...(rangee.leve !== undefined ? { transformations: [{ genre: 'glisser', de: [0, -rangee.leve] }] } : {}),
    });
  }
  const I = BAC.intercalaire;
  const place = I.onglet.places[rangDIntercalaire % I.onglet.places.length] ?? 0;
  const carton = plaqueDebout({
    contour: contourDIntercalaire(place, pans),
    y,
    base: C.fond,
    epaisseur: I.epaisseur,
    chanfrein: I.chanfrein,
    penche: rangee.penche ?? R.penche,
    teinte: rangee.teinte,
  });
  // Penché, son étiquette n'est plus là où on la colle debout : on ne la lit pas.
  const lisible = Math.abs((rangee.penche ?? R.penche) - R.penche) < BASCULE_LISIBLE;
  // Son onglet est un calque à lui : c'est lui qu'on touche, pas le carton entier, que les intercalaires de devant cachent en partie.
  const onglet = lisible ? [calque(`intercalaire-${rangee.cle}/onglet`, etiquetteDOnglet(rangee.titre, place, y, mesurer))] : [];
  return calque(`intercalaire-${rangee.cle}`, [peinture(peindre(carton)), ...onglet], {
    role: 'image',
    // Celui du thème choisi sort du bac d'un bloc, son onglet avec lui.
    ...(rangee.leve !== undefined ? { transformations: [{ genre: 'glisser', de: [0, -rangee.leve] }] } : {}),
  });
}

export function dessinerLeBac(etat: EtatDuBac, densite: Densite, mesurer: Mesure): Calque {
  const [x, y] = BAC.position;
  const contour = rectangleArrondi(x, y, C.largeur, C.profondeur, C.rayon, densite.pansDeCoin);
  // De l'avant vers le fond, on compte les intercalaires pour placer leurs onglets ; on les dessine du fond vers l'avant.
  let intercalaires = 0;
  const rangees = etat.rangees.map((rangee, rang) => {
    const dessinee = dessinerUneRangee(rangee, rang, intercalaires, densite, mesurer);
    if (rangee.genre === 'intercalaire') intercalaires++;
    return dessinee;
  });
  // L'ombre de la caisse et de ce qui en dépasse : les pochettes, serrées ; les onglets, trop minces pour en porter une qui compte.
  const hauteurDuRangement = C.fond + BAC.pochette.hauteur;
  return calque('bac', [
    calque(
      'bac/fond',
      [
        ombreAuPied('bac/ombre', { silhouettes: [contour], hauteur: hauteurDuRangement, support: 0 }),
        // Le fond de la caisse, peint comme elle, un ton plus sombre : entre les rangées et les parois, on ne voit pas la table.
        peinture(peindre([facetteAPlat(rectangleArrondi(x, y, C.largeur, C.profondeur, C.rayon, densite.pansDeCoin), C.fond, C.teinte, -1)])),
        paroi(0, 0, C.largeur, C.paroi, densite),
        paroi(0, 0, C.paroi, C.profondeur, densite),
        paroi(C.largeur - C.paroi, 0, C.paroi, C.profondeur, densite),
      ],
      { role: 'decor' },
    ),
    ...rangees.reverse(),
    // Par la fente de la poignée, on voit ce qui se tient au premier rang, contre la paroi avant.
    calque('bac/devant', paroiAvant(densite, etat.rangees[0]?.teinte ?? C.teinteDesJoints), { role: 'decor' }),
  ]);
}

/** Ce que le mouvement règle sur une playlist du bac dessinée avec sa hauteur : elle monte d'un bloc. */
export const reglerUnePlaylist = (cle: string, leve: number): Reglage[] => [glissement(`pochette-${cle}`, 0, [0, -leve])];
