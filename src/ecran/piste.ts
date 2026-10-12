/**
 * L'écran d'une piste : la scène de la piste montée dans un cadre de la page, et tenue à jour d'image en image.
 * Il dessine le meuble et la piste, les monte, suit la pose de chaque pièce sur l'horloge, tient le verso du disque à jour,
 * et remonte la scène quand sa facture change (un mode plus léger, un cadre qui change de taille), sans que rien ne saute.
 */

import type { Densite } from '../ressources/densites';
import { MONTAGE } from '../ressources/ecran';
import type { Textes } from '../ressources/textes';
import { CALQUES_DU_VERSO } from '../scene/disque';
import type { GenreDeVerso } from '../scene/disque/verso';
import type { Calque } from '../scene/calque';
import { dessinerLeMeuble, type Regard } from '../scene/meuble';
import { dessinerLaPiste, type DecorDeLaPiste } from '../scene/piste/dessin';
import type { PisteEnScene } from '../scene/piste/etat';
import { instantsDeLaPiste } from '../scene/piste/instants';
import { POSE_AVANT_LA_PISTE, type PoseDeLaPiste } from '../scene/piste/pose';
import { ETENDUE_DE_LA_PISTE, regardDeLaPiste } from '../scene/piste/regard';
import { poseDeDepart, regleurDeLaPiste } from '../scene/piste/reglages';
import { suivreLaPiste } from '../scene/piste/suivi';
import type { Reglage } from '../scene/reglage';
import type { Encrier } from '../scene/rendu/texte';
import type { Allegements } from './allegements';
import { factureIdentique, factureVoulue, memeDessin, memeFacture, type Facture } from './facture';
import type { Horloge } from './horloge';
import { monter, type BilanDeMontage, type Montage } from './montage';
import { poserUnPlan } from './plan';
import { tenirLeVerso, type VersoALEcran } from './verso';
import { vider } from './vider';

/** Ce qu'il faut pour dessiner une piste : ce qui n'y bouge pas, les textes du site, et de quoi les tracer. */
export interface PisteADessiner {
  readonly decor: DecorDeLaPiste;
  readonly textes: Textes;
  readonly encrier: Encrier;
  /**
   * Sur un grand écran : le regard, qui ne glisse jamais et montre tout ce que la piste parcourt, et le reste du meuble, au repos.
   * Sans lui, le regard du téléphone, qui glisse vers le disque.
   */
  readonly grand?: { readonly regard: Regard; readonly meuble: readonly Calque[] };
}

/** Une piste dessinée et montée dans la page. */
export interface PisteMontee {
  readonly densite: Densite;
  readonly montage: Montage;
  /** Pour une pose, tous les réglages qui y amènent la scène montée. */
  readonly reglages: (pose: PoseDeLaPiste) => Reglage[];
}

/**
 * Dessine le meuble et la piste sur toute l'étendue que le regard parcourra, et les monte : ce qui ne bougera pas est figé,
 * le reste attend ses réglages. La réponse n'y est pas : elle est posée au verso du disque le moment venu.
 * @param verso la façon dont le verso du disque montrera la réponse : son fond est dessiné pour elle.
 */
export function monterLaPiste(piste: PisteADessiner, facture: Facture, verso: GenreDeVerso): PisteMontee {
  const { decor, textes, encrier } = piste;
  const { densite, ombresFigees, definition } = facture;
  const etendue = piste.grand?.regard ?? ETENDUE_DE_LA_PISTE;
  const arbre = dessinerLeMeuble({
    regard: etendue,
    densite,
    objets: [
      ...(piste.grand?.meuble ?? []),
      ...dessinerLaPiste(decor, { genre: verso }, poseDeDepart(ombresFigees), textes, encrier.largeur, densite),
    ],
  });
  const reglages = regleurDeLaPiste(arbre, densite, ombresFigees);
  const montage = monter(arbre, {
    etendue,
    reglables: new Set(reglages(POSE_AVANT_LA_PISTE).map((reglage) => reglage.calque)),
    remplacables: new Set(Object.values(CALQUES_DU_VERSO)),
    definition,
    mesurer: encrier.largeur,
    tracerLeTexte: encrier.tracer,
  });
  return { densite, montage, reglages };
}

/** Ce qu'on peut choisir sur un écran ouvert. */
export interface OptionsDEcran {
  readonly allegements: Allegements;
  /** La façon dont le verso du disque montre la réponse. */
  readonly verso: GenreDeVerso;
  /** Vrai quand on a demandé de réduire les animations : la version sobre. */
  readonly sobre: boolean;
}

export interface EcranDeLaPiste {
  /**
   * Tient la scène à la facture qu'on lui veut : à l'échelle de son cadre, et remontée quand son dessin ou sa définition ne sont plus
   * les bons (un mode plus léger, un cadre qui a changé de taille). À appeler à chaque image, avant de montrer la piste.
   */
  tenirLaFacture(): void;
  /** Montre la piste à l'instant t de son horloge : à appeler à chaque image, la facture tenue. Rend la pose montrée. */
  montrer(scene: PisteEnScene, t: number): PoseDeLaPiste;
  /**
   * Change des options. Rien n'est refait sur-le-champ : la touche qui l'a demandé a le temps de s'enfoncer à l'écran,
   * et la scène suit à l'image d'après, d'où en sont les pièces.
   */
  changer(options: Partial<OptionsDEcran>): void;
  /** Vrai tant qu'il lui reste à faire sans que la piste bouge : une scène à remonter. Il faut alors continuer de lui donner des images. */
  aFaire(): boolean;
  /** Le temps qu'a pris le dernier montage de la scène, en ms, et ce qu'il a fabriqué. */
  mesures(): { readonly montage: number; readonly bilan: BilanDeMontage };
  fermer(): void;
}

const RIEN_DE_MONTE: BilanDeMontage = { toiles: 0, pxDeToile: 0, svg: 0, reglables: 0 };

/**
 * @param cadre l'élément de la page où montrer la scène : elle s'y met à l'échelle de sa largeur.
 * @param o.horloge une horloge qui bat pour de bon : elle sert à mesurer, et à attendre que la taille du cadre se tienne.
 * @param o.densiteDeLEcran px de l'appareil par px de la page.
 * @param o.enCasDeRefus appelé si la scène n'a pas pu être remontée, ou la réponse dessinée : l'écran garde alors ce qu'il montrait.
 * @throws si la scène ne peut pas être montée à l'ouverture : le cadre garde alors ce qu'il contenait.
 */
export function ouvrirLEcranDeLaPiste(
  cadre: HTMLElement,
  o: PisteADessiner & {
    readonly horloge: Horloge;
    readonly densiteDeLEcran: () => number;
    readonly options: OptionsDEcran;
    readonly enCasDeRefus?: (erreur: unknown) => void;
  },
): EcranDeLaPiste {
  let options = o.options;
  /** Le regard à cette pose : celui du grand écran ne glisse jamais. */
  const regard = (pose: PoseDeLaPiste): Regard => o.grand?.regard ?? regardDeLaPiste(pose);
  const plan = poserUnPlan(cadre, regard(POSE_AVANT_LA_PISTE));
  const suivi = suivreLaPiste();
  const refuser = (erreur: unknown): void => o.enCasDeRefus?.(erreur);
  const voulue = (echelle: number): Facture => factureVoulue(options.allegements, echelle, o.densiteDeLEcran());

  /** La scène montée, ce qui la fait telle, et le verso de son disque. */
  let montee: (PisteMontee & { readonly facture: Facture; readonly verso: VersoALEcran }) | undefined;
  let tempsDeMontage = 0;
  /** La dernière facture qu'on n'a pas pu monter : on ne la retente pas à chaque image. */
  let refusee: Facture | undefined;
  /** La facture qu'on attend de monter, et depuis quand on veut celle-là même. */
  let attendue: { readonly facture: Facture; readonly depuis: number } | undefined;

  /**
   * Monte la scène de cette facture, puis la met à la place de l'ancienne : celle-ci ne s'en va que lorsque la nouvelle est prête.
   * Le suivi des pièces, lui, ne change pas : la nouvelle scène les reprend où elles en sont, avec leur vitesse.
   */
  function monterLaScene(facture: Facture): void {
    const debut = o.horloge.maintenant();
    const nouvelle = monterLaPiste(o, facture, options.verso);
    montee?.montage.demonter();
    vider(plan.element).append(nouvelle.montage.element);
    const verso = tenirLeVerso(nouvelle.montage, { genre: options.verso, densite: facture.densite, encrier: o.encrier, enCasDEchec: refuser });
    montee = { ...nouvelle, facture, verso };
    tempsDeMontage = (o.horloge.maintenant() - debut) * 1000;
  }

  /**
   * Remonte la scène quand sa facture n'est plus la bonne, mais pas à l'image même où on s'en aperçoit. Un autre dessin, c'est quelqu'un
   * qui l'a demandé : on le lui donne à l'image d'après, le temps que sa touche s'enfonce à l'écran. Une autre définition seulement,
   * c'est le cadre qui change de taille : on attend qu'il se tienne, pour ne pas refaire les toiles à chaque image du geste.
   */
  function suivreLaFacture(echelle: number): void {
    if (montee === undefined) return;
    const facture = voulue(echelle);
    // On veut autre chose que ce qui a été refusé : si on le redemande plus tard, ce sera une nouvelle demande, tentée à son tour.
    if (refusee !== undefined && !memeFacture(facture, refusee)) refusee = undefined;
    if (memeFacture(facture, montee.facture) || refusee !== undefined) {
      attendue = undefined;
      return;
    }
    const maintenant = o.horloge.maintenant();
    // Une facture qui change encore, même d'un rien (un cadre qu'on étire lentement), fait repartir l'attente.
    if (attendue === undefined || !factureIdentique(facture, attendue.facture)) {
      attendue = { facture, depuis: maintenant };
      return;
    }
    if (memeDessin(facture, montee.facture) && maintenant - attendue.depuis < MONTAGE.attente) return;
    attendue = undefined;
    try {
      monterLaScene(facture);
      refusee = undefined;
    } catch (erreur) {
      // On garde la scène qu'on montre.
      refusee = facture;
      refuser(erreur);
    }
  }

  // La scène d'abord, le cadre ensuite : si elle ne peut pas se monter, le cadre garde ce qu'il disait.
  monterLaScene(voulue(plan.suivreLeCadre()));
  vider(cadre).append(plan.element);

  return {
    tenirLaFacture: () => suivreLaFacture(plan.suivreLeCadre()),
    montrer(scene, t) {
      const pose = suivi.poseA(scene, t, { sobre: options.sobre, reactions: !options.allegements.sansReactions });
      if (montee === undefined) return pose;
      montee.verso.tenirAJour({
        genre: options.verso,
        reponse: scene.piste?.revelation?.reponse,
        // Pendant que le disque ralentit, bien avant qu'il ne se retourne.
        aDessiner: scene.piste !== undefined && t >= instantsDeLaPiste(scene.piste).reponseADessiner,
        // Il se retourne déjà : la scène vient d'être remontée, ou les pièces ont changé de place d'un coup.
        presse: pose.disque.retourne > 0,
      });
      montee.montage.regler(montee.reglages(pose));
      montee.montage.regarder(regard(pose).origine);
      return pose;
    },
    changer(nouvelles) {
      options = { ...options, ...nouvelles };
    },
    aFaire: () => attendue !== undefined,
    mesures: () => ({ montage: tempsDeMontage, bilan: montee?.montage.bilan() ?? RIEN_DE_MONTE }),
    fermer() {
      montee?.montage.demonter();
      montee = undefined;
      plan.element.remove();
    },
  };
}
