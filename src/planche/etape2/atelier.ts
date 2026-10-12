/**
 * L'atelier : la piste d'exemple à l'écran, qu'on rejoue à volonté. Il tient la séance, son horloge et la boucle d'images,
 * et mesure ce que coûte chacune. La page lui dit quoi rejouer, à quelle vitesse et avec quelles options ;
 * il ne sait rien de ses touches ni de ce qu'elle écrit autour.
 */

import { lancerLaBoucle } from '../../ecran/boucle';
import type { Horloge } from '../../ecran/horloge';
import type { BilanDeMontage } from '../../ecran/montage';
import { ouvrirLEcranDeLaPiste, type PisteADessiner } from '../../ecran/piste';
import { TOLERANCES } from '../../ressources/mouvement';
import type { PisteEnScene } from '../../scene/piste/etat';
import type { PoseDeLaPiste } from '../../scene/piste/pose';
import { horlogeDePlanche } from '../horloge';
import { compteur, type Compte } from './compteur';
import type { OptionsDAtelier } from './options';
import { instantDeDepart, lecteurDeSeance, revelerDes, tardeACharger, type Moment, type Seance } from './seance';

/** Ce qu'on a mesuré : de quoi dire ce que coûte une image. */
export interface Mesures {
  /** Le temps que le dernier montage de la scène a pris, en ms : dessiner ses polygones, figer ses toiles. */
  readonly montage: number;
  /** Ce que le script travaille par image, en ms : le moteur, les réglages, leur écriture dans la page. Sur ses dernières images. */
  readonly parImage: Compte;
  /** Le temps entre deux images, en ms, sur les dernières qui se sont suivies : un sommeil de l'atelier n'en est pas un. */
  readonly entreDeuxImages: Compte;
  readonly bilan: BilanDeMontage;
}

/** Où en est l'atelier à l'instant d'une image. */
export interface Lecture {
  /** L'instant de la séance, en secondes. */
  readonly instant: number;
  readonly scene: PisteEnScene;
  readonly pose: PoseDeLaPiste;
  /**
   * Vrai quand plus rien ne bougera tant qu'on ne touche à rien : la piste n'a pas été lancée, ou tout est retombé.
   * L'atelier s'endort après cette image.
   */
  readonly auRepos: boolean;
}

export interface Atelier {
  /**
   * Rejoue la séance telle qu'elle est écrite, depuis l'un de ses moments : tout s'enchaîne ensuite jusqu'à la fin.
   * L'attente se rejoue sur la séance dont l'extrait tarde à charger, les autres moments sur celle qui part à l'heure.
   */
  rejouer(moment: Moment): void;
  /** Une mauvaise réponse, tout de suite. Elle ne raye le disque que si l'extrait joue. */
  rayer(): void;
  /** La révélation, tout de suite, sans attendre la fin de l'extrait : la piste change en route. Sans effet hors de l'extrait. */
  reveler(): void;
  changer(options: Partial<OptionsDAtelier>): void;
  /** Dit à l'atelier si l'on voit la scène ou ses touches. Hors de vue, il ne demande plus d'images ; l'horloge, elle, court toujours. */
  voir(enVue: boolean): void;
  /** À appeler quand quelque chose a pu changer sans lui (la taille du cadre, la finesse de l'écran) : s'il dormait, il y regarde. */
  reveiller(): void;
  mesures(): Mesures;
  fermer(): void;
}

/** Nombre d'images sur lesquelles on moyenne les mesures. */
export const FENETRE_DES_MESURES = 90;
/**
 * Au-delà de ce temps entre deux images, en ms, ce n'est pas une image lente : l'onglet était caché, et la boucle arrêtée.
 * C'est le trou d'horloge que le moteur de mouvement ne rejoue pas non plus.
 */
const ONGLET_CACHE = TOLERANCES.trou * 1000;

/**
 * @param o.horloge l'horloge qui bat pour de bon : celle de la séance, qu'on remet à l'heure et qu'on ralentit, s'appuie sur elle.
 * @throws si la scène ne peut pas être montée : le cadre garde alors ce qu'il contenait.
 */
export function ouvrirLAtelier(
  cadre: HTMLElement,
  o: PisteADessiner & {
    /** La séance écrite d'avance : celle dont l'extrait part à l'heure, et celle où il tarde à charger. */
    readonly seance: (extraitLent: boolean) => Seance;
    readonly horloge: Horloge;
    /** Px de l'appareil par px de la page. */
    readonly densiteDeLEcran: () => number;
    readonly options: OptionsDAtelier;
    /** Appelé à chaque image, une fois la scène réglée : pour écrire à côté d'elle où en est la séance. */
    readonly chaqueImage?: (lecture: Lecture) => void;
    /** Appelé si la scène n'a pas pu être refaite après un changement d'option : l'atelier garde celle qu'il montrait. */
    readonly enCasDeRefus?: (erreur: unknown) => void;
  },
): Atelier {
  let options = o.options;
  const horloge = horlogeDePlanche(o.horloge);
  horloge.ralentir(options.vitesse);
  const lire = lecteurDeSeance();
  const ecrites = { aLHeure: o.seance(false), enRetard: o.seance(true) };
  /** La séance qui se joue : l'une des deux qui sont écrites, tant qu'on n'a pas révélé plus tôt. */
  let seance: Seance = ecrites.aLHeure;
  let rayuresDuJoueur: number[] = [];
  /** Faux tant qu'on n'a rien rejoué : l'horloge attend, la platine est au repos. */
  let lancee = false;
  let enVue = true;

  const ecran = ouvrirLEcranDeLaPiste(cadre, o);
  const travail = compteur(FENETRE_DES_MESURES);
  const intervalle = compteur(FENETRE_DES_MESURES);
  let imageDAvant: number | undefined;

  /** Montre la séance où elle en est. Rend vrai tant qu'il faudra une autre image : quelque chose bouge encore, ou reste à refaire. */
  function chaqueImage(): boolean {
    const debut = o.horloge.maintenant();
    const ecart = imageDAvant === undefined ? undefined : (debut - imageDAvant) * 1000;
    if (ecart !== undefined && ecart < ONGLET_CACHE) intervalle.noter(ecart);
    // Une scène à refaire l'est avant qu'on ne chronomètre le travail de l'image : son montage a sa propre mesure.
    ecran.tenirLaFacture();
    const depart = o.horloge.maintenant();
    const instant = horloge.maintenant();
    const scene = lire(seance, instant, rayuresDuJoueur);
    const pose = ecran.montrer(scene, instant);
    travail.noter((o.horloge.maintenant() - depart) * 1000);
    const auRepos = !lancee || instant >= seance.fin;
    o.chaqueImage?.({ instant, scene, pose, auRepos });
    const encore = enVue && (!auRepos || ecran.aFaire());
    // Une boucle qui s'endort ne compte pas son sommeil pour une image lente.
    imageDAvant = encore ? debut : undefined;
    return encore;
  }

  const boucle = lancerLaBoucle(chaqueImage);

  return {
    rejouer(moment) {
      // La séance repart telle qu'elle est écrite : ce qu'on y avait ajouté en route (une rayure, une révélation avant l'heure) est oublié.
      const ecrite = tardeACharger(moment) ? ecrites.enRetard : ecrites.aLHeure;
      const depart = instantDeDepart(ecrite, moment, horloge.maintenant(), horloge.vitesse);
      seance = ecrite;
      rayuresDuJoueur = [];
      horloge.mettreA(depart);
      lancee = true;
      boucle.reveiller();
    },
    rayer() {
      rayuresDuJoueur = [...rayuresDuJoueur, horloge.maintenant()];
      boucle.reveiller();
    },
    reveler() {
      seance = revelerDes(seance, horloge.maintenant());
      boucle.reveiller();
    },
    changer(nouvelles) {
      const avant = options;
      options = { ...options, ...nouvelles };
      if (options.vitesse !== avant.vitesse) horloge.ralentir(options.vitesse);
      ecran.changer({ allegements: options.allegements, verso: options.verso, sobre: options.sobre });
      boucle.reveiller();
    },
    voir(vue) {
      enVue = vue;
      if (vue) boucle.reveiller();
    },
    reveiller: () => boucle.reveiller(),
    mesures: () => ({
      ...ecran.mesures(),
      parImage: travail.compte(),
      entreDeuxImages: intervalle.compte(),
    }),
    fermer() {
      boucle.arreter();
      ecran.fermer();
    },
  };
}
