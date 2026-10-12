/**
 * Le bouton du volume : celui de l'ampli, qu'on tourne pour régler le son de ce téléphone, librement, d'une butée à l'autre. Sur un grand écran, il est sur l'ampli même, par-dessus le sien. Au téléphone, où l'ampli n'est pas dans le
 * cadre, sa copie, plus petite, se pose sur le coin haut droit de la platine ; sur un écran qui regarde ailleurs (le bac, sa
 * pochette), dans le coin haut droit du cadre. Il se dessine seul : changer le volume ne redessine que lui.
 */

import { depuisLEcran } from '../../lowpoly/projection';
import { AMPLI } from '../../ressources/ampli';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import { CRANS_DU_VOLUME, DESSUS_DE_L_AMPLI, surLAmpli } from '../ampli';
import type { Calque } from '../calque';
import type { Regard } from '../meuble';
import { dessinerUnBouton } from '../platine/bouton';
import type { PlaceDeCommande } from '../platine/emplacements';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire } from './pieces';

const V = TABLEE.telephone.volume;

/** Où se pose le bouton : sur l'ampli (un grand écran le montre), sur le coin de la platine, ou dans le coin du cadre. */
export type PlaceDuVolume = 'ampli' | 'platine' | 'coin';

/** Le cran du bouton pour un volume de 0 à 1 : le plus proche. */
export const cranDuVolume = (volume: number): number => Math.round(Math.min(1, Math.max(0, volume)) * (CRANS_DU_VOLUME.length - 1));

/** L'angle de l'index pour un volume de 0 à 1, sans cran : on tourne le bouton librement, d'une butée à l'autre. */
export const angleDuVolume = (volume: number): number => AMPLI.volume.de + Math.min(1, Math.max(0, volume)) * (AMPLI.volume.a - AMPLI.volume.de);

/** Le calque qu'on tourne : l'index du bouton du volume. */
export const INDEX_DU_VOLUME = 'bouton-volume/index/trait/tourne';

/** Le bouton du volume, à ce volume (de 0 à 1), à sa place dans ce regard. Il s'appelle « bouton-volume ». */
export function boutonDuVolume(a: Ecritoire, regard: Regard, volume: number, ou: PlaceDuVolume): Calque[] {
  const crans = CRANS_DU_VOLUME.map(() => '');
  const surLAmpliMeme = ou === 'ampli';
  const support = surLAmpliMeme ? DESSUS_DE_L_AMPLI : PLATINE.socle.epaisseur;
  // Sur la platine, à sa place sur le meuble ; au coin, à la même distance du bord droit du cadre, quelle que soit sa largeur.
  const [x, y] =
    ou === 'platine'
      ? [SUR_LA_PLATINE.origine[0] + V.en[0], SUR_LA_PLATINE.origine[1] + V.en[1]]
      : [regard.origine[0] + regard.largeur - (SUR_LA_PLATINE.largeur - V.en[0]), regard.origine[1] + V.en[1]];
  const place: PlaceDeCommande = surLAmpliMeme
    ? { centre: surLAmpli(AMPLI.volume.centre), support, porteur: 'ampli' }
    : { centre: depuisLEcran([x, y], support), support, porteur: 'platine' };
  const b = dessinerUnBouton(
    'volume',
    { x: 0, rayon: surLAmpliMeme ? AMPLI.volume.rayon : V.rayon, crans: CRANS_DU_VOLUME, titre: AMPLI.volume.titre },
    { titre: a.textes.ampli.volume, crans, choisi: cranDuVolume(volume) },
    DENSITE,
    0,
    place,
  );
  // Ses gravures (le nom, les crans) sont celles de l'ampli : la copie, petite, n'a que son bouton, qui dit déjà son cran.
  return [b.ombre, b.bouton];
}
