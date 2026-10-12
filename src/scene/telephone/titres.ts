/**
 * Les titres joués, qu'on revoit en touchant leur papier à la finale : le dos d'une pochette, posé sur le bois nu à côté de la
 * platine. En haut, ce qu'on a joué ce soir ; puis chaque titre, son numéro, son interprète, et sa pochette imprimée à côté :
 * sa vignette, que la vraie image recouvre quand la source en donne une (le client du jeu la pose par-dessus, voir
 * `imagesDesTitres`). Une colonne jusqu'à dix titres, deux au-delà ; « Retour » dessous.
 */

import { rectangleArrondi } from '../../lowpoly/contours';
import { placer } from '../../lowpoly/polygones';
import { surLEcran } from '../../lowpoly/projection';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Reponse } from '../../regles/piste';
import { PAPIER, TABLEE } from '../../ressources/tablee';
import { HAUTEUR_DE_CAPITALE, CORPS, type RoleDeTexte } from '../../ressources/typo';
import { aplat, aPlatSurLeMeuble, type Calque, type Dessin, type Texte } from '../calque';
import { encreLisibleSur } from '../encre';
import { surLeBois } from '../meuble';
import { ombreAuPied } from '../ombre';
import { faireTenir } from '../texte';
import { dessinerUneVignette } from '../vignette';
import { interprete, touche, type Ecritoire, type VueDuTelephone } from './pieces';
import { REGARD_DE_LA_POCHETTE } from './pochette';

/** Ce que la projection garde de la profondeur du meuble : une image posée à plat y est écrasée d'autant. */
const ecrasement = (): number => surLEcran([0, 1])[1] - surLEcran([0, 0])[1];
const T = TABLEE.telephone.titres;
const R = REGARD_DE_LA_POCHETTE;

/** Où se pose chaque titre, en px dans le regard : le centre de sa pochette, son côté, et la place de son texte. */
interface PlaceDUnTitre {
  readonly pochette: Vec2;
  readonly cote: number;
  readonly texte: { readonly x: number; readonly largeur: number };
}

/** Le haut de la liste, sous le titre du papier. */
const HAUT_DE_LA_LISTE = T.papier.haut + T.papier.marge + CORPS.titre * HAUTEUR_DE_CAPITALE + T.sousLeTitre;

/** La place de chaque titre, du premier au dernier : en colonne, puis en deux colonnes de même hauteur. */
function placesDesTitres(n: number): PlaceDUnTitre[] {
  const colonnes = n > T.colonneAuPlus ? 2 : 1;
  const parColonne = Math.max(1, Math.ceil(n / colonnes));
  const interieur = T.papier.largeur - 2 * T.papier.marge;
  const largeur = (interieur - (colonnes - 1) * T.entreColonnes) / colonnes;
  const bas = T.papier.bas - T.papier.marge;
  const pas = Math.min(T.pasAuPlus, (bas - HAUT_DE_LA_LISTE) / parColonne);
  const cote = Math.min(T.pochetteAuPlus, pas * (T.pochetteAuPlus / T.pasAuPlus));
  return Array.from({ length: n }, (_, rang) => {
    const colonne = Math.floor(rang / parColonne);
    const ligne = rang % parColonne;
    const gauche = T.papier.gauche + T.papier.marge + colonne * (largeur + T.entreColonnes);
    const y = HAUT_DE_LA_LISTE + ligne * pas + pas / 2;
    return {
      pochette: [gauche + cote / 2, y],
      cote,
      texte: { x: gauche + cote + T.apresLaPochette, largeur: largeur - cote - T.apresLaPochette },
    };
  });
}

/**
 * Les vraies pochettes à poser sur le papier, par-dessus leurs vignettes : l'adresse de chaque image, son centre et son côté en
 * px dans le regard, l'écrasement de la profondeur (le papier est à plat sur le meuble). Rien pour un titre qui n'en a pas.
 */
export function imagesDesTitres(
  joues: readonly Reponse[],
): { readonly adresse: string; readonly centre: Vec2; readonly cote: number; readonly ecrasement: number }[] {
  const places = placesDesTitres(joues.length);
  return joues.flatMap((j, rang) => {
    const place = places[rang];
    const adresse = 'vignette' in j.pochette ? j.pochette.image : undefined;
    if (place === undefined || adresse === undefined) return [];
    return [{ adresse, centre: [place.pochette[0], place.pochette[1] - PAPIER.epaisseur] as Vec2, cote: place.cote, ecrasement: ecrasement() }];
  });
}

/** L'écran des titres joués, dans le regard posé à côté de la platine. */
export function vueDesTitres(a: Ecritoire, joues: readonly Reponse[]): VueDuTelephone {
  const P = a.textes.partie;
  const mesurer = a.encrier.largeur;
  const ici = (x: number, y: number): Vec2 => surLeBois(R, x, y);
  const encre = encreLisibleSur('creme');
  const ecrire = (contenu: string, role: RoleDeTexte, corps: number, en: Vec2): Texte => ({
    genre: 'texte',
    contenu,
    role,
    corps,
    en,
    ancrage: 'debut',
    teinte: encre,
    ton: TON_DE_BASE,
    fond: { teinte: 'creme' },
  });
  const { gauche, haut, largeur, bas, angle, marge } = T.papier;
  const coin = ici(gauche, haut);
  const coinOppose = ici(gauche + largeur, bas);
  const milieu: Vec2 = [(coin[0] + coinOppose[0]) / 2, (coin[1] + coinOppose[1]) / 2];
  const [l, h] = [coinOppose[0] - coin[0], coinOppose[1] - coin[1]];
  const contour = placer(rectangleArrondi(-l / 2, -h / 2, l, h, PAPIER.coin, 3), { en: milieu, angle });
  const titre = faireTenir(mesurer, { contenu: P.titresJoues, role: 'titrage' }, largeur - 2 * marge, 'titre');
  const dessins: Dessin[] = [
    aplat([contour], 'creme', 3),
    ecrire(titre.contenu, 'titrage', titre.corps, ici(gauche + marge, haut + marge + titre.corps * HAUTEUR_DE_CAPITALE)),
  ];
  for (const [rang, place] of placesDesTitres(joues.length).entries()) {
    const j = joues[rang];
    if (j === undefined) continue;
    // La pochette imprimée : sa vignette, carrée sur le papier ; la vraie image la recouvre quand elle arrive.
    const centre = ici(place.pochette[0], place.pochette[1]);
    const cote = place.cote;
    const carre = rectangleArrondi(centre[0] - cote / 2, centre[1] - cote / 2, cote, cote, PAPIER.coin / 2, 1);
    if ('vignette' in j.pochette) dessins.push(...dessinerUneVignette(j.pochette.vignette, carre, centre, cote));
    // Le titre, numéroté, et son interprète dessous : chacun sur une ligne, abrégé s'il le faut.
    const nom = faireTenir(mesurer, { contenu: `${rang + 1}. ${j.titre}`, role: 'techniqueFort' }, place.texte.largeur, 'mention');
    const qui = faireTenir(mesurer, { contenu: interprete(a.textes, j), role: 'technique' }, place.texte.largeur, 'gravure');
    // Les deux lignes, centrées sur la pochette : l'interligne des papiers entre elles.
    const [capitaleDuNom, capitaleDeQui, interligne] = [
      nom.corps * HAUTEUR_DE_CAPITALE,
      qui.corps * HAUTEUR_DE_CAPITALE,
      qui.corps * PAPIER.interligne,
    ];
    const premiere = place.pochette[1] - (capitaleDuNom + interligne + capitaleDeQui) / 2 + capitaleDuNom;
    dessins.push(ecrire(nom.contenu, 'techniqueFort', nom.corps, ici(place.texte.x, premiere)));
    dessins.push(ecrire(qui.contenu, 'technique', qui.corps, ici(place.texte.x, premiere + interligne + capitaleDeQui)));
  }
  const papier: Calque = { ...aPlatSurLeMeuble('etiquette-dos-des-titres', PAPIER.epaisseur, dessins), role: 'decor' };
  return {
    regard: R,
    objets: [
      ombreAuPied('etiquette-dos-des-titres/ombre', { silhouettes: [contour], hauteur: PAPIER.epaisseur, support: 0, paliers: 2 }),
      papier,
      touche('touche-fermer-titres', 'secondaire', P.retour, R, T.retour, a.encrier),
    ],
  };
}
