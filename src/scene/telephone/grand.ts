/**
 * Le grand écran (un ordinateur, une tablette couchée) : le regard s'élargit au meuble entier, du bac à l'ampli, sans changer
 * d'échelle. Les écrans du téléphone y gardent leur place sur le meuble ; ce qu'ils ne montrent pas du meuble (le bac, la platine,
 * l'ampli) y est posé au repos, pour que rien ne paraisse coupé.
 */

import { dessinerLAmpli } from '../ampli';
import { dessinerLeBac } from '../bac';
import type { Calque } from '../calque';
import { regardSurLeMeuble, type Regard } from '../meuble';
import { ampliDuSalon, bacDesPlaylistsPretes, platineArretee } from './meuble';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire } from './pieces';

const MEUBLE: Regard = regardSurLeMeuble();
/** Le haut du grand regard : celui du meuble entier, au-dessus des intercalaires du bac ; celui du téléphone s'il est plus haut. */
const HAUT = Math.min(MEUBLE.origine[1], SUR_LA_PLATINE.origine[1]);
/** Le bas du grand regard : celui du téléphone, sous ce qu'on touche. */
const BAS = SUR_LA_PLATINE.origine[1] + SUR_LA_PLATINE.hauteur;

/** La hauteur du grand regard, en px de la scène : la page en tire la largeur qu'elle lui donne. */
export const HAUTEUR_DU_GRAND_ECRAN = BAS - HAUT;
/** La largeur du meuble entier, avec ses marges : le grand regard n'en montre jamais moins. */
export const LARGEUR_DU_MEUBLE = MEUBLE.largeur;

/**
 * Le regard du grand écran : centré sur le meuble entier, de la largeur qu'on lui demande (jamais moins que le meuble), et de la
 * hauteur du grand écran, son bas sur celui du regard de l'écran du téléphone qu'on y montre : ce qu'on y touche reste en vue. Sur
 * la platine, il montre le meuble jusqu'en haut des intercalaires du bac. Il ne glisse jamais pendant une piste.
 */
export function regardDuGrandEcran(largeur: number, ecran: Regard = SUR_LA_PLATINE): Regard {
  const l = Math.max(LARGEUR_DU_MEUBLE, Math.round(largeur));
  const bas = ecran.origine[1] + ecran.hauteur;
  return { origine: [MEUBLE.origine[0] + MEUBLE.largeur / 2 - l / 2, bas - HAUTEUR_DU_GRAND_ECRAN], largeur: l, hauteur: HAUTEUR_DU_GRAND_ECRAN };
}

/**
 * Le meuble au repos autour d'un écran du téléphone : le bac rangé, la platine à l'arrêt, l'ampli éteint, chacun s'il n'y est pas
 * déjà. Une piste dessine sa propre platine : on ne lui en ajoute pas.
 */
export function meubleAutour(a: Ecritoire, objets: readonly Calque[], o: { readonly platine: boolean } = { platine: true }): Calque[] {
  const deja = new Set(objets.map((objet) => objet.nom));
  return [
    ...(deja.has('bac') ? [] : [dessinerLeBac(bacDesPlaylistsPretes(a.textes), DENSITE, a.encrier.largeur)]),
    ...(deja.has('platine') || !o.platine ? [] : [platineArretee(a)]),
    ...(deja.has('ampli') ? [] : [dessinerLAmpli(ampliDuSalon(a.textes, false), DENSITE)]),
  ];
}
