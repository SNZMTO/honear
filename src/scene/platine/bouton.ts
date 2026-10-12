/**
 * Un bouton à crans de la platine : un réglage. Son corps moleté ne tourne pas, ses facettes claires restent
 * du côté de la lampe ; seul son index tourne, de cran en cran. Les crans et leurs inscriptions sont gravés dans le socle.
 *
 * Ce module ne sait pas ce que les crans veulent dire : on lui donne un titre, une inscription par cran occupé,
 * et le cran choisi. Les crans en trop restent gravés mais vides.
 */

import { rectangle, rectangleArrondi } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { boutonMolete, contourDeBouton } from '../../lowpoly/formes/bouton';
import { placer } from '../../lowpoly/polygones';
import { depuisLEcran, surLEcran } from '../../lowpoly/projection';
import { direction, fois, plus, type Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { aplat, calque, peinture, soulever, type Calque, type Dessin, type Texte } from '../calque';
import { ombre } from '../ombre';
import { pile } from '../pile';
import { surLeBandeau, type PlaceDeCommande } from './emplacements';
import { graver, MI_HAUTEUR } from './gravure';

const C = PLATINE.commandes;

/** Un bouton à crans : un titre, une inscription par cran occupé, le cran choisi. */
export interface EtatDeBouton {
  readonly titre: string;
  readonly crans: readonly string[];
  readonly choisi: number;
}

/** Où est un bouton sur le socle, et les angles de ses crans (0° vers le fond du meuble). */
export interface MesuresDeBouton {
  readonly x: number;
  readonly rayon: number;
  readonly crans: readonly number[];
  /** Distance de son centre à la ligne de base de son titre : celle des commandes de la platine, par défaut. */
  readonly titre?: number;
}

export interface BoutonDessine {
  /** Les traits de cran, leurs inscriptions et le titre, gravés dans le socle : dans le décor. */
  readonly gravures: Dessin[];
  readonly ombre: Calque;
  readonly bouton: Calque;
}

/** Un cran à 0° pointe vers le fond du meuble (le haut de l'écran). */
const versLeCran = (angle: number): Vec2 => direction(angle - 90);

/**
 * @param souleve hauteur ajoutée au bouton, en px visibles : 0 quand il est en place.
 * @param place où il se pose : par défaut, sur le bandeau avant de la platine. Un cran dont l'inscription est vide reste gravé, sans rien d'écrit.
 */
export function dessinerUnBouton(
  cle: string,
  mesures: MesuresDeBouton,
  etat: EtatDeBouton,
  densite: Densite,
  souleve = 0,
  place: PlaceDeCommande = surLeBandeau(mesures.x),
): BoutonDessine {
  const angleChoisi = mesures.crans[etat.choisi];
  if (etat.crans.length > mesures.crans.length) {
    throw new Error(`Le bouton « ${cle} » n'a que ${mesures.crans.length} crans : ${etat.crans.length} inscriptions ne tiennent pas autour.`);
  }
  if (angleChoisi === undefined || etat.crans[etat.choisi] === undefined) {
    throw new Error(`Le bouton « ${cle} » ne peut pas être sur le cran ${etat.choisi} : il n'a que ${etat.crans.length} crans occupés.`);
  }

  const { epaisseur, chanfrein, index } = C.bouton;
  const { centre, support } = place;
  const r = mesures.rayon;
  const dessus = support + epaisseur;
  // La couronne des crans est gravée autour du dessus du bouton tel qu'on le voit, pas autour de son pied :
  // sinon, vu d'ici, l'index tomberait entre deux crans.
  const couronne = depuisLEcran(surLEcran(centre, dessus), support);

  // Les traits de cran, tous gravés ; les inscriptions, seulement pour les crans occupés.
  const trait = rectangle(-C.trait.largeur / 2, -(r + C.trait.a), C.trait.largeur, C.trait.a - C.trait.de);
  const traits = aplat(
    mesures.crans.map((angle) => placer(trait, { en: couronne, angle })),
    'creme',
  );
  const inscriptions = etat.crans.flatMap((contenu, i): Texte[] => {
    if (contenu === '') return [];
    const angle = mesures.crans[i] ?? 0;
    const point = plus(couronne, fois(versLeCran(angle), r + C.inscription));
    // Une inscription sur le côté s'aligne sur son trait, à mi-hauteur ; une inscription du fond se pose au-dessus du sien, centrée.
    const ancrage: Texte['ancrage'] = angle < -C.cranDuFond ? 'fin' : angle > C.cranDuFond ? 'debut' : 'milieu';
    return [graver(contenu, [point[0], point[1] + (ancrage === 'milieu' ? 0 : MI_HAUTEUR)], ancrage)];
  });
  const titre = graver(etat.titre, [centre[0], centre[1] + (mesures.titre ?? C.titre)], 'milieu');

  // L'index : un trait aux bouts ronds, du cœur vers le bord. C'est lui qui dit le cran choisi.
  const trace = aplat(
    [rectangleArrondi(-index.largeur / 2, -r * index.a, index.largeur, r * (index.a - index.de), index.largeur / 2, 2)],
    'expresso',
  );
  const forme = { centre, base: support, epaisseur, rayon: r, pans: densite.pansDeBouton, teinte: 'alu', chanfrein } as const;

  return {
    gravures: [traits, ...inscriptions, titre],
    ombre: ombre(`bouton-${cle}/ombre`, {
      en: centre,
      silhouettes: [contourDeBouton({ ...forme, centre: [0, 0] })],
      hauteur: epaisseur + souleve,
      support,
      paliers: 2,
    }),
    bouton: calque(
      `bouton-${cle}`,
      [
        // Le corps ne change jamais de facettes : il est figé en image, comme le vinyle.
        calque(`bouton-${cle}/corps`, [peinture(peindre(boutonMolete(forme)))], { role: 'image' }),
        pile(`bouton-${cle}/index`, {
          role: 'mobile',
          centre,
          angle: angleChoisi,
          etages: [{ nom: 'trait', hauteur: dessus, contenu: [trace] }],
        }),
      ],
      { transformations: [soulever(souleve)] },
    ),
  };
}
