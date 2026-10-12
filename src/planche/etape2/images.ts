/**
 * Les images de la piste : une séance de l'atelier arrêtée à des instants de son horloge. Celles de ses dix instants marquants,
 * du disque dans sa pochette à la réponse retournée, passent aux contrôles du rendu et aux tests, comme celles de la planche
 * de l'étape 1 ; et l'on en tire une pellicule, image par image, quand on touche au mouvement (voir outils/pellicule.ts).
 */

import { DENSITES, type Densite } from '../../ressources/densites';
import type { Textes } from '../../ressources/textes';
import type { Calque } from '../../scene/calque';
import { VERSO_DU_JEU, VERSOS_A_COMPARER, type GenreDeVerso, type Verso } from '../../scene/disque/verso';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import { dessinerLaPiste, type DecorDeLaPiste } from '../../scene/piste/dessin';
import { instantsDeLaPiste } from '../../scene/piste/instants';
import type { PoseDeLaPiste } from '../../scene/piste/pose';
import { regardDeLaPiste } from '../../scene/piste/regard';
import { poseDeDepart, regleurDeLaPiste } from '../../scene/piste/reglages';
import { suivreLaPiste, type Allure } from '../../scene/piste/suivi';
import { regler } from '../../scene/reglage';
import type { Encrier } from '../../scene/rendu/texte';
import { pisteDExemple } from '../exemples';
import type { ImageDePlanche } from '../image';
import { LEGENDES } from './legendes.fr';
import { MINUTAGE } from './minutage';
import { lecteurDeSeance, seanceDExemple, seanceEntiere, type Seance } from './seance';

/** Une séance à regarder : ce qu'on y dessine, et à quelle allure on la suit. */
export interface PriseDeVue {
  readonly textes: Textes;
  readonly encrier: Encrier;
  readonly densite: Densite;
  /** La façon dont le disque montre la réponse. */
  readonly verso: GenreDeVerso;
  readonly seance: Seance;
  /** Les mauvaises réponses données en plus de celle qui est écrite, sur l'horloge de la séance. */
  readonly rayuresDuJoueur?: readonly number[];
  /** L'allure à laquelle on la suit : entière si l'on ne dit rien. */
  readonly allure?: Allure;
  /**
   * Vrai pour la voir comme un écran qui peine la montre : dessinée une fois dans sa pose de départ, puis réglée d'image en image,
   * ses ombres figées. Sinon elle est redessinée à chaque arrêt.
   */
  readonly ombresFigees?: boolean;
  /** Ce qu'on pose en plus sur le meuble, autour de la piste, à chaque arrêt : les pochettes des joueurs, les touches de réponse. */
  readonly autour?: (a: number, regard: Regard) => readonly Calque[];
  /** Le décor de la piste, s'il n'est pas celui de l'exemple : d'autres commandes, un autre numéro. */
  readonly decor?: DecorDeLaPiste;
  /** Un regard posé une fois pour toutes, s'il n'est pas celui du téléphone qui suit la piste : l'écran de l'hôte voit tout le meuble. */
  readonly regard?: Regard;
}

/** Un arrêt sur image : son instant sur l'horloge de la séance, le nom de son fichier et ce qu'on y voit. */
export interface Arret {
  readonly a: number;
  readonly fichier: string;
  readonly titre: string;
}

/**
 * La séance suivie depuis son début, comme à l'écran, et dessinée à chaque arrêt.
 * @param arrets dans l'ordre où ils viennent : on ne remonte pas le temps.
 */
export function arreterLaSeance(vue: PriseDeVue, arrets: readonly Arret[]): ImageDePlanche[] {
  const { textes, encrier, densite, verso: genre, seance } = vue;
  const decor = vue.decor ?? pisteDExemple(textes);
  const lire = lecteurDeSeance();
  const suivi = suivreLaPiste();
  const a = (pas: number): number => pas / MINUTAGE.rythme;
  const suivre = (pas: number) => {
    const scene = lire(seance, a(pas), vue.rayuresDuJoueur ?? []);
    return { scene, pose: suivi.poseA(scene, a(pas), vue.allure) };
  };
  let pas = 0;
  let { scene, pose } = suivre(pas);
  return arrets.map((arret, rang): ImageDePlanche => {
    if (arret.a < (arrets[rang - 1]?.a ?? 0))
      throw new Error(`L'arrêt « ${arret.fichier} » vient avant celui qui le précède : la séance ne se remonte pas.`);
    for (; a(pas) <= arret.a; pas++) ({ scene, pose } = suivre(pas));
    // La réponse n'est dessinée au verso qu'une fois tombée, comme à l'écran.
    const reponse = scene.piste?.revelation?.reponse;
    const verso: Verso = { genre, ...(reponse !== undefined ? { reponse } : {}) };
    const regard = vue.regard ?? regardDeLaPiste(pose);
    const autour = vue.autour?.(arret.a, regard) ?? [];
    const dessiner = (dans: PoseDeLaPiste): Calque =>
      dessinerLeMeuble({ regard, densite, objets: [...dessinerLaPiste(decor, verso, dans, textes, encrier.largeur, densite), ...autour] });
    const figee = vue.ombresFigees === true ? dessiner(poseDeDepart(true)) : undefined;
    return {
      fichier: arret.fichier,
      titre: arret.titre,
      scene: figee !== undefined ? regler(figee, regleurDeLaPiste(figee, densite, true)(pose)) : dessiner(pose),
      regard,
    };
  });
}

/** Les instants marquants, comptés chacun depuis un signal ou un geste de la piste, en secondes. */
const INSTANTS = MINUTAGE.images;

/** Les images de la piste, dans l'ordre où leurs instants arrivent. */
const NOMS_DES_IMAGES = ['repos', 'sortie', 'vol', 'arcsCourts', 'brasLeve', 'extrait', 'rayure', 'ralentit', 'tranche', 'reponse'] as const;
export type NomDImageDePiste = (typeof NOMS_DES_IMAGES)[number];

/**
 * @param verso la façon dont le disque montre la réponse.
 * @returns la piste d'exemple à chacun de ses instants marquants, dans l'ordre où ils arrivent.
 */
export function imagesDeLaPiste(
  textes: Textes,
  encrier: Encrier,
  densite: Densite = DENSITES.fine,
  verso: GenreDeVerso = VERSO_DU_JEU,
): ImageDePlanche[] {
  const seance = seanceDExemple(textes);
  // Les instants de la piste se lisent sur la piste entière : celle de la fin de la séance.
  const { piste } = seanceEntiere(seance);
  if (piste === undefined) throw new Error("La séance de l'atelier n'a pas de piste.");
  const T = instantsDeLaPiste(piste);
  const instants: Readonly<Record<NomDImageDePiste, number>> = {
    repos: 0,
    sortie: T.trois + INSTANTS.sortie,
    vol: T.trois + INSTANTS.vol,
    arcsCourts: T.deux + INSTANTS.arcsCourts,
    brasLeve: T.un + INSTANTS.brasLeve,
    extrait: T.extrait + INSTANTS.extrait,
    rayure: seance.rayure + INSTANTS.rayure,
    ralentit: T.moteurCoupe + INSTANTS.ralentit,
    tranche: T.retournement + INSTANTS.tranche,
    reponse: T.retournement + INSTANTS.reponse,
  };
  const arrets = NOMS_DES_IMAGES.map((nom): Arret => ({
    a: instants[nom],
    fichier: `piste-${nom}${verso === VERSO_DU_JEU ? '' : `-${verso}`}`,
    titre: LEGENDES.images[nom],
  }));
  return arreterLaSeance({ textes, encrier, densite, verso, seance }, arrets);
}

/**
 * Les images de la piste que regardent les contrôles du rendu et les tests : ses instants marquants en densité fine, avec le verso
 * du jeu, puis en densité sobre avec celui qu'on lui compare. Les deux densités et les deux versos y passent ainsi une fois.
 */
export const imagesDeLaPisteAControler = (textes: Textes, encrier: Encrier): ImageDePlanche[] => [
  ...imagesDeLaPiste(textes, encrier, DENSITES.fine, VERSO_DU_JEU),
  ...VERSOS_A_COMPARER.flatMap((verso) =>
    imagesDeLaPiste(textes, encrier, DENSITES.sobre, verso).map((image) => ({ ...image, fichier: `${image.fichier}-${DENSITES.sobre.cle}` })),
  ),
];
