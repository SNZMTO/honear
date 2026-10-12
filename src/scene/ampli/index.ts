/**
 * L'ampli, à droite de la platine : c'est le son. Un coffre de laque vert bouteille, comme le socle de la platine, qui porte
 * deux vumètres, le gros bouton du volume, l'interrupteur « Allume l'ampli » et son voyant. Ce module assemble ses pièces
 * à partir de l'état qu'on lui donne et ne lit rien d'autre ; il ne modifie jamais le jeu.
 *
 * Ce qui bouge, chacun dans son calque avec son ombre : les deux aiguilles, l'index du volume, la bascule de l'interrupteur,
 * le voyant (qui passe d'un dessin à l'autre). Le coffre, ses vis, les lunettes, les cadrans et les gravures sont figés.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { rectangleArrondi } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { prisme } from '../../lowpoly/formes/boite';
import { contourDePlot, plot } from '../../lowpoly/formes/plot';
import { plus, type Vec2 } from '../../lowpoly/vecteurs';
import { AMPLI } from '../../ressources/ampli';
import type { Densite } from '../../ressources/densites';
import type { NomDeTeinte } from '../../ressources/palette';
import { CORPS } from '../../ressources/typo';
import { aPlatSurLeMeuble, calque, peinture, type Calque, type Dessin } from '../calque';
import { ombreAuPied } from '../ombre';
import { dessinerUnBouton } from '../platine/bouton';
import { graver } from '../platine/gravure';
import { dessinerUnInterrupteur } from '../platine/interrupteur';
import { vis } from '../platine/socle';
import { rotation, visibilite, type Reglage } from '../reglage';
import { CANAUX, dessinerUnVumetre, reglerUnVumetre, type SignesDeLEchelle } from './vumetre';

export { CANAUX, type Canal } from './vumetre';

const C = AMPLI.coffre;
/** Hauteur du dessus du coffre, en px visibles : tout ce qu'il porte y est posé. */
export const DESSUS_DE_L_AMPLI: number = C.epaisseur;

/** Un point donné par rapport au coin du coffre, replacé dans le plan du meuble. */
export const surLAmpli = (p: readonly [number, number]): Vec2 => plus(AMPLI.position, p);

/** Les crans du volume, de -135 à +135 degrés, un tous les 15. */
export const CRANS_DU_VOLUME: readonly number[] = Array.from(
  { length: Math.round((AMPLI.volume.a - AMPLI.volume.de) / AMPLI.volume.pas) + 1 },
  (_, rang) => AMPLI.volume.de + rang * AMPLI.volume.pas,
);

/** Ce que l'ampli a besoin de savoir pour se dessiner. */
export interface EtatDeLAmpli {
  readonly allume: boolean;
  /** Où en sont les aiguilles, de 0 (au repos) à 1 (en butée) : la gauche, puis la droite. */
  readonly aiguilles: readonly [number, number];
  /** Le cran du volume, de 0 au dernier. */
  readonly volume: number;
  /** L'interrupteur en train de basculer, de 0 (éteint) à 1 (allumé) ; sans elle, il est couché du côté de `allume`. */
  readonly interrupteur?: number;
  /** Vrai pour un ampli qu'on allume sous les yeux : sa bascule est dessinée dans ses trois poses (voir `reglerLaBascule`). */
  readonly interrupteurEnTroisPoses?: boolean;
  /** Ce qui est gravé sur lui. */
  readonly inscriptions: {
    readonly volume: string;
    readonly allume: string;
    readonly sigle: string;
    readonly canaux: readonly [string, string];
    readonly graduations: SignesDeLEchelle;
    readonly marque: string;
  };
}

/** Ce qui bouge sur l'ampli : ses aiguilles, son volume, et s'il est allumé. */
export type PoseDeLAmpli = Pick<EtatDeLAmpli, 'allume' | 'aiguilles' | 'volume'>;

const PLACE = { position: AMPLI.position, dessus: DESSUS_DE_L_AMPLI } as const;

/** Le voyant : une lentille bombée sur une bague sombre, d'une teinte éteint, d'une autre allumé. Les deux sont dessinés. */
function lentille(teinte: NomDeTeinte, densite: Densite): Dessin {
  const V = AMPLI.voyant;
  const centre = surLAmpli(V.centre);
  const pans = densite.pansDePetitRond;
  return peinture(
    peindre(
      plot({
        centre,
        base: DESSUS_DE_L_AMPLI,
        epaisseur: V.epaisseur,
        rayon: V.rayon,
        pans,
        chanfrein: V.chanfrein,
        teinte: 'vinyle',
        dessus: (bord) => [
          { de: bord, a: bord * V.lentille, teinte: 'vinyle' },
          { de: bord * V.lentille, a: bord * V.coeur, teinte, monte: V.bombe },
          { de: bord * V.coeur, a: 0, teinte },
        ],
      }),
    ),
  );
}

/** Les quatre vis du coffre, aux fentes jamais alignées. */
function visDuCoffre(densite: Densite): Dessin[] {
  const tirage = hasard(AMPLI.vis.germe);
  const r = AMPLI.vis.retrait;
  const coins: [number, number][] = [
    [r, r],
    [C.largeur - r, r],
    [r, C.profondeur - r],
    [C.largeur - r, C.profondeur - r],
  ];
  return coins.flatMap((coin) => vis(surLAmpli(coin), tirage.entre(0, 180), densite, DESSUS_DE_L_AMPLI));
}

/** Le cran le plus proche d'un volume demandé. */
const cranDuVolume = (volume: number): number => Math.min(CRANS_DU_VOLUME.length - 1, Math.max(0, Math.round(volume)));

/** Le contour du coffre, au sol : le même sert à son volume et à son ombre. */
const contourDuCoffre = (densite: Densite): Vec2[] =>
  rectangleArrondi(AMPLI.position[0], AMPLI.position[1], C.largeur, C.profondeur, C.rayon, densite.pansDeCoin);

export function dessinerLAmpli(etat: EtatDeLAmpli, densite: Densite): Calque {
  const contour = contourDuCoffre(densite);
  const { inscriptions: I } = etat;

  const vumetres = CANAUX.map((canal, rang) =>
    dessinerUnVumetre(PLACE, canal, etat.aiguilles[rang] ?? 0, { sigle: I.sigle, signes: I.graduations }, densite),
  );
  const crans = CRANS_DU_VOLUME.map((_, rang) => (rang % AMPLI.volume.ecritTousLes === 0 ? String(rang / AMPLI.volume.ecritTousLes) : ''));
  const volume = dessinerUnBouton(
    'volume',
    { x: 0, rayon: AMPLI.volume.rayon, crans: CRANS_DU_VOLUME, titre: AMPLI.volume.titre },
    { titre: I.volume, crans, choisi: cranDuVolume(etat.volume) },
    densite,
    0,
    { centre: surLAmpli(AMPLI.volume.centre), support: DESSUS_DE_L_AMPLI, porteur: 'ampli' },
  );
  const interrupteur = dessinerUnInterrupteur(
    'ampli',
    0,
    {
      titre: I.allume,
      positions: ['', ''],
      choisie: etat.allume ? 1 : 0,
      ...(etat.interrupteur !== undefined ? { course: etat.interrupteur } : {}),
      ...(etat.interrupteurEnTroisPoses === true ? { enTroisPoses: true } : {}),
    },
    densite,
    0,
    {
      centre: surLAmpli(AMPLI.interrupteur.centre),
      support: DESSUS_DE_L_AMPLI,
      porteur: 'ampli',
    },
  );
  const canaux = CANAUX.map((_, rang) =>
    graver(
      I.canaux[rang] ?? '',
      surLAmpli([(AMPLI.vumetres.x[rang] ?? 0) + AMPLI.vumetres.canal[0], AMPLI.vumetres.y + AMPLI.vumetres.canal[1]]),
      'milieu',
    ),
  );
  const marque = graver(I.marque, surLAmpli(AMPLI.marque), 'fin', 'titrage', CORPS.mention);
  const V = AMPLI.voyant;

  const decor: Dessin[] = [
    ombreAuPied('ampli/ombre', { silhouettes: [contour], hauteur: C.epaisseur, support: 0 }),
    peinture(peindre(prisme({ contour, base: 0, epaisseur: C.epaisseur, chanfrein: C.chanfrein, teinte: 'laque' }))),
    ...visDuCoffre(densite),
    ...vumetres.flatMap((v) => v.decor),
    aPlatSurLeMeuble('ampli/gravures', DESSUS_DE_L_AMPLI, [...volume.gravures, ...interrupteur.gravures, ...canaux, marque]),
    ...interrupteur.fixe,
    ombreAuPied('voyant/ombre', {
      silhouettes: [contourDePlot({ centre: surLAmpli(V.centre), rayon: V.rayon, pans: densite.pansDePetitRond })],
      hauteur: V.epaisseur,
      support: DESSUS_DE_L_AMPLI,
      paliers: 2,
    }),
  ];
  return calque('ampli', [
    calque('ampli/decor', decor, { role: 'decor' }),
    ...vumetres.flatMap((v) => [v.ombre, v.aiguille]),
    volume.ombre,
    volume.bouton,
    interrupteur.ombre,
    interrupteur.bascule,
    calque(
      'voyant',
      [
        calque('voyant/eteint', [lentille('noyerSombre', densite)], { opacite: etat.allume ? 0 : 1 }),
        calque('voyant/allume', [lentille('miel', densite)], { opacite: etat.allume ? 1 : 0 }),
      ],
      { role: 'mobile' },
    ),
  ]);
}

/** Ce que le mouvement règle des seules aiguilles de l'ampli, et de leurs ombres : de 0 (au repos) à 1 (en butée), la gauche puis la droite. */
export const reglerLesAiguilles = (aiguilles: readonly [number, number]): Reglage[] =>
  CANAUX.flatMap((canal, rang) => reglerUnVumetre(PLACE, canal, aiguilles[rang] ?? 0));

/**
 * Ce que le mouvement règle sur l'ampli déjà dessiné : ses aiguilles et leurs ombres, l'index du volume, le voyant.
 * La bascule de l'interrupteur, comme celle de la platine, est redessinée quand elle change de position.
 */
export function reglerLAmpli(pose: PoseDeLAmpli): Reglage[] {
  return [
    ...reglerLesAiguilles([pose.aiguilles[0] ?? 0, pose.aiguilles[1] ?? 0]),
    rotation('bouton-volume/index/trait/tourne', 0, CRANS_DU_VOLUME[cranDuVolume(pose.volume)] ?? 0),
    visibilite('voyant/eteint', !pose.allume),
    visibilite('voyant/allume', pose.allume),
  ];
}
