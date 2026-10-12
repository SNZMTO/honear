/**
 * Un vumètre de l'ampli : une fenêtre à lunette sombre, un cadran crème gradué de -20 à +3 avec sa zone rouge,
 * et une aiguille, seule pièce qui bouge, avec son ombre sur le cadran. On ne voit de l'aiguille que ce qui passe
 * sur le cadran : son pivot est caché sous le bord bas de la fenêtre.
 */

import { arc, rectangle, rectangleArrondi, trait } from '../../lowpoly/contours';
import { facetteAPlat, peindre } from '../../lowpoly/facette';
import { boiteChanfreinee } from '../../lowpoly/formes/boite';
import { surLEcran } from '../../lowpoly/projection';
import { TON_DE_BASE } from '../../lowpoly/tons';
import { direction, fois, plus, type Vec2 } from '../../lowpoly/vecteurs';
import { AMPLI } from '../../ressources/ampli';
import type { Densite } from '../../ressources/densites';
import { CORPS, HAUTEUR_DE_CAPITALE } from '../../ressources/typo';
import { aplat, aPlatSurLeMeuble, peinture, type Calque, type Dessin, type Texte } from '../calque';
import { encreLisibleSur } from '../encre';
import { ombreDePile, reglerUneOmbreDePile, type OmbreDePile } from '../ombre';
import { remplir } from '../phrases';
import { pile } from '../pile';
import { rotation, type Reglage } from '../reglage';

const V = AMPLI.vumetres;
const A = V.aiguille;

/** Les deux canaux, de gauche à droite. */
export const CANAUX = ['gauche', 'droite'] as const;
export type Canal = (typeof CANAUX)[number];

/** Une aiguille à 0 est au repos, à gauche ; à 1, en butée, à droite. Son angle depuis la verticale, en degrés. */
export const angleDeLAiguille = (valeur: number): number => A.repos + (A.butee - A.repos) * Math.min(1, Math.max(0, valeur));

/** Le coin haut-gauche de la fenêtre d'un canal, sur le meuble. */
function coinDeLaFenetre(position: Vec2, canal: Canal): Vec2 {
  return plus(position, [V.x[CANAUX.indexOf(canal)] ?? 0, V.y]);
}

/** Un point du cadran, à cet angle depuis la verticale et à ce rayon du pivot. */
const surLeCadran = (pivot: Vec2, angle: number, rayon: number): Vec2 => plus(pivot, fois(direction(angle - 90), rayon));

/** Ce qu'on écrit sur un cadran : l'encre qui s'y lit, en caractère technique. */
function ecrireSurLeCadran(contenu: string, en: Vec2, corps: number): Texte {
  return {
    genre: 'texte',
    contenu,
    role: 'technique',
    corps,
    en: [en[0], en[1] + (corps * HAUTEUR_DE_CAPITALE) / 2],
    ancrage: 'milieu',
    teinte: encreLisibleSur('creme'),
    ton: TON_DE_BASE,
    fond: { teinte: 'creme' },
  };
}

/** Comment s'écrit un nombre de l'échelle : avec son signe, sauf le zéro. Les modèles viennent des textes. */
export interface SignesDeLEchelle {
  readonly positif: string;
  readonly negatif: string;
}

const nombreDeLEchelle = (n: number, signes: SignesDeLEchelle): string =>
  n === 0 ? String(n) : remplir(n > 0 ? signes.positif : signes.negatif, { n: Math.abs(n) });

export interface VumetreDessine {
  /** La lunette, le cadran et ses graduations : dans le décor. */
  readonly decor: Dessin[];
  readonly ombre: Calque;
  readonly aiguille: Calque;
}

/** Ce qu'il faut savoir de l'ampli pour poser un vumètre : où il est, et la hauteur de son dessus. */
export interface PlaceDuVumetre {
  readonly position: Vec2;
  readonly dessus: number;
}

/** Ce qui fait l'ombre d'une aiguille, sur le cadran : elle tourne avec elle, et s'arrête au bord du cadran. */
function ombreDeLAiguille(place: PlaceDuVumetre, canal: Canal, valeur: number, surface: readonly (readonly Vec2[])[]): OmbreDePile {
  const coin = coinDeLaFenetre(place.position, canal);
  return {
    en: plus(coin, V.pivot),
    angle: angleDeLAiguille(valeur),
    silhouettes: [rectangle(-A.largeur / 2, -A.longueur, A.largeur, A.longueur)],
    hauteur: A.hauteur,
    support: place.dessus + V.lunette.epaisseur,
    paliers: 2,
    surface,
  };
}

/** Le cadran d'un canal, tel qu'on le voit : ce qui en sort n'est pas montré. */
function cadranALEcran(place: PlaceDuVumetre, canal: Canal): Vec2[] {
  const coin = coinDeLaFenetre(place.position, canal);
  const { bord, rayon } = V.lunette;
  const hauteur = place.dessus + V.lunette.epaisseur;
  return rectangleArrondi(coin[0] + bord, coin[1] + bord, V.largeur - 2 * bord, V.profondeur - 2 * bord, rayon - bord / 2, 3).map((p) =>
    surLEcran(p, hauteur),
  );
}

/**
 * @param valeur où est l'aiguille, de 0 (au repos) à 1 (en butée).
 * @param inscriptions le sigle du cadran, et comment s'écrivent les nombres de son échelle.
 */
export function dessinerUnVumetre(
  place: PlaceDuVumetre,
  canal: Canal,
  valeur: number,
  inscriptions: { readonly sigle: string; readonly signes: SignesDeLEchelle },
  densite: Densite,
): VumetreDessine {
  const coin = coinDeLaFenetre(place.position, canal);
  const { lunette, graduations: G, echelle } = V;
  const surLaLunette = place.dessus + lunette.epaisseur;
  const pivot = plus(coin, V.pivot);
  const cadran = rectangleArrondi(
    coin[0] + lunette.bord,
    coin[1] + lunette.bord,
    V.largeur - 2 * lunette.bord,
    V.profondeur - 2 * lunette.bord,
    lunette.rayon - lunette.bord / 2,
    densite.pansDeCoin,
  );

  // Les graduations : un trait par valeur de l'échelle, long pour celles qu'on écrit ; la zone rouge, une bande sous l'arc.
  const traits = echelle.graduations.map((n, rang) => {
    const angle = echelle.angles[rang] ?? 0;
    const longueur = echelle.ecrits.includes(n as (typeof echelle.ecrits)[number]) ? G.longues : G.courtes;
    return trait([surLeCadran(pivot, angle, G.rayon - longueur), surLeCadran(pivot, angle, G.rayon)], G.largeur);
  });
  const { rouge } = echelle;
  const segments = Math.ceil((rouge.a - rouge.de) / 4);
  const zoneRouge = trait(arc(pivot, G.rayon + rouge.epaisseur / 2 + G.largeur, rouge.de - 90, rouge.a - 90, segments), rouge.epaisseur);
  const arcDeLEchelle = trait(
    arc(pivot, G.rayon, (echelle.angles[0] ?? 0) - 90, (echelle.angles[echelle.angles.length - 1] ?? 0) - 90, 16),
    G.largeur,
  );
  const nombres = echelle.ecrits.map((n) => {
    const angle = echelle.angles[echelle.graduations.indexOf(n)] ?? 0;
    return ecrireSurLeCadran(nombreDeLEchelle(n, inscriptions.signes), surLeCadran(pivot, angle, G.nombres), CORPS.gravure);
  });
  const encre = encreLisibleSur('creme');

  const surface = [cadranALEcran(place, canal)];
  const silhouette = rectangleArrondi(-A.largeur / 2, -A.longueur, A.largeur, A.longueur, A.largeur / 2, 2);
  return {
    decor: [
      peinture(
        peindre(
          boiteChanfreinee({
            x: coin[0],
            y: coin[1],
            largeur: V.largeur,
            profondeur: V.profondeur,
            rayon: lunette.rayon,
            pansParCoin: densite.pansDeCoin,
            base: place.dessus,
            epaisseur: lunette.epaisseur,
            chanfrein: lunette.chanfrein,
            teinte: 'vinyle',
          }),
        ),
      ),
      peinture(peindre([facetteAPlat(cadran, surLaLunette, 'creme')])),
      aPlatSurLeMeuble(`vumetre-${canal}/cadran`, surLaLunette, [
        aplat([...traits, arcDeLEchelle], encre),
        aplat([zoneRouge], 'rougeTomate'),
        ...nombres,
        ecrireSurLeCadran(inscriptions.sigle, plus(coin, V.sigle), CORPS.mention),
      ]),
    ],
    ombre: ombreDePile(`vumetre-${canal}/aiguille/ombre`, ombreDeLAiguille(place, canal, valeur, surface)),
    aiguille: {
      ...pile(`vumetre-${canal}/aiguille`, {
        role: 'mobile',
        centre: pivot,
        angle: angleDeLAiguille(valeur),
        etages: [{ nom: 'trait', hauteur: surLaLunette + A.hauteur, contenu: [aplat([silhouette], encre)] }],
      }),
      // Ce qui de l'aiguille passe hors du cadran est sous la lunette.
      decoupe: surface,
    },
  };
}

/** Ce que le mouvement règle sur un vumètre déjà dessiné : l'angle de son aiguille, et son ombre. */
export function reglerUnVumetre(place: PlaceDuVumetre, canal: Canal, valeur: number): Reglage[] {
  return [
    rotation(`vumetre-${canal}/aiguille/trait/tourne`, 0, angleDeLAiguille(valeur)),
    ...reglerUneOmbreDePile(`vumetre-${canal}/aiguille/ombre`, ombreDeLAiguille(place, canal, valeur, [cadranALEcran(place, canal)])),
  ];
}
