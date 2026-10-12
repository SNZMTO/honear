/**
 * Le chantier d'un montage : la scène parcourue du fond vers l'avant, et chaque dessin mis où il doit vivre. Ce qui ne bougera pas
 * est figé avec ses voisins sur une même toile ; ce qui bouge en restant en polygones est écrit avec ses voisins dans un même SVG ;
 * une pièce qu'on déplace d'un bloc, ou dont on changera le contenu, devient un conteneur à elle, garni de la même façon.
 */

import type { NomDeCalque } from '../../lexique';
import type { Calque, Dessin } from '../../scene/calque';
import type { Emprise } from '../../scene/rendu/emprise';
import { affineDeToutes, composer, SANS_EFFET, type Affine } from '../../scene/rendu/transformation';
import type { APoser, Lettrage } from './couche';
import { figerSurUneToile } from './figes';
import type { Grille } from './grille';
import { retirer } from './lacher';
import { creerUnBloc, type Bloc, type Poignee } from './poignees';
import { ecrireEnSvg } from './vivants';

/** Ce qu'on est en train de poser dans un conteneur : une suite de dessins à figer sur une même toile, ou de calques à écrire dans un même SVG. */
interface Lot {
  readonly conteneur: HTMLElement;
  /** Vrai pour la scène elle-même : ses toiles et ses SVG couvrent l'étendue, pas plus. */
  readonly aLaRacine: boolean;
  figes: APoser[];
  vivants: APoser[];
}

export interface Chantier {
  /** Les poignées de ce qui a été posé jusqu'ici, par nom de calque. */
  readonly poignees: ReadonlyMap<NomDeCalque, Poignee>;
  /** Pose toute la scène dans un conteneur : la racine du montage. */
  poserLaScene(scene: Calque, racine: HTMLElement): void;
  /**
   * Pose dans un bloc, à la suite de ce qu'il porte, ce qu'il doit contenir : figé, ou en SVG si son calque est de ceux qui restent
   * en polygones. Tout ou rien : d'un contenu qui ne peut pas être posé en entier, il ne reste rien, ni dans le bloc ni parmi les poignées.
   * @throws si le contenu ne peut pas être posé.
   */
  garnir(bloc: Bloc, contenu: readonly Dessin[]): void;
}

/** Vrai pour un calque qui bouge en restant en polygones : une pièce mobile, une ombre. */
const resteEnPolygones = (calque: Calque): boolean => calque.role === 'mobile' || calque.role === 'ombre';

/**
 * @param o.etendue toute la portion du meuble que le regard pourra parcourir : à la racine, rien n'est figé ni écrit au-delà.
 * @param o.reglables les calques que le mouvement réglera ; `o.remplacables`, ceux dont on changera le contenu.
 * @param o.marque ce qui distingue les identifiants de cette scène (voir marque.ts).
 */
export function ouvrirLeChantier(o: {
  readonly etendue: Emprise;
  readonly reglables: ReadonlySet<NomDeCalque>;
  readonly remplacables: ReadonlySet<NomDeCalque>;
  readonly grille: Grille;
  readonly marque: string;
  readonly lettrage: Lettrage;
}): Chantier {
  const { etendue, reglables, remplacables, grille, marque, lettrage } = o;
  const poignees = new Map<NomDeCalque, Poignee>();
  /** Les blocs remplaçables qui restent en polygones : ce qu'on y pose s'écrit en SVG, sans rien figer. */
  const enPolygones = new Set<Bloc>();

  /** Vrai si le calque doit rester un bloc à lui : on le réglera, ou on en changera le contenu. */
  const estUnBloc = (calque: Calque): boolean => reglables.has(calque.nom) || remplacables.has(calque.nom);
  const change = new Map<Calque, boolean>();
  /** Vrai si le calque, ou quoi que ce soit en lui, changera : il ne peut pas être figé avec le décor. */
  const changera = (calque: Calque): boolean => {
    let reponse = change.get(calque);
    if (reponse === undefined) {
      reponse = estUnBloc(calque) || calque.contenu.some((d) => d.genre === 'calque' && changera(d));
      change.set(calque, reponse);
    }
    return reponse;
  };

  /** Fige sur une toile les dessins en attente, à leur place dans le conteneur. */
  function fermerLesFiges(lot: Lot): void {
    const { figes } = lot;
    lot.figes = [];
    figerSurUneToile(lot.conteneur, figes, lot.aLaRacine ? { grille, limite: etendue, lettrage } : { grille, lettrage });
  }

  /** Écrit dans un SVG les calques vivants en attente, et garde la main sur ceux de leurs groupes qu'on réglera. */
  function fermerLesVivants(lot: Lot): void {
    const { vivants } = lot;
    lot.vivants = [];
    const ecrits = ecrireEnSvg(lot.conteneur, vivants, lot.aLaRacine ? { etendue, reglables, marque, lettrage } : { reglables, marque, lettrage });
    for (const [nom, groupe] of ecrits) poignees.set(nom, groupe);
  }

  function fermer(lot: Lot): void {
    fermerLesFiges(lot);
    fermerLesVivants(lot);
  }

  /** Pose un dessin dans un lot, à la suite de ce qui y est déjà : du fond vers l'avant. */
  function poser(dessin: Dessin, sous: Affine, lot: Lot): void {
    if (dessin.genre !== 'calque' || !changera(dessin)) {
      // Rien n'y bougera : quel que soit son rôle, c'est du décor.
      fermerLesVivants(lot);
      lot.figes.push({ dessin, sous });
      return;
    }
    if (resteEnPolygones(dessin) && !remplacables.has(dessin.nom)) {
      fermerLesFiges(lot);
      lot.vivants.push({ dessin, sous });
      return;
    }
    // Une découpe tient sur une toile ou dans un SVG ; un calque qui se fond dans son conteneur, ou qu'on déplace d'un bloc, n'en a pas.
    if (dessin.decoupe !== undefined) throw new Error(`Le calque « ${dessin.nom} » a une découpe : il doit être figé, ou rester en polygones.`);
    if (!estUnBloc(dessin)) {
      // Lui-même ne bouge pas : il se fond dans son conteneur, et ses transformations passent à ce qu'il contient.
      if ((dessin.opacite ?? 1) < 1)
        throw new Error(
          `Le calque « ${dessin.nom} » est caché ou à demi transparent, et l'on règle ce qu'il contient : il faut le régler lui aussi.`,
        );
      const transformations = dessin.transformations ?? [];
      const dessous = transformations.length === 0 ? sous : composer(sous, affineDeToutes(transformations));
      for (const d of dessin.contenu) poser(d, dessous, lot);
      return;
    }
    // Il bouge d'un bloc : un conteneur à lui, que le navigateur déplace sans rien repeindre de ce qu'il contient.
    fermer(lot);
    const bloc = creerUnBloc(dessin, sous, grille);
    lot.conteneur.append(bloc.element);
    poignees.set(dessin.nom, bloc);
    if (resteEnPolygones(dessin)) enPolygones.add(bloc);
    garnir(bloc, dessin.contenu);
  }

  function garnir(bloc: Bloc, contenu: readonly Dessin[]): void {
    const dedans: Lot = { conteneur: bloc.element, aLaRacine: false, figes: [], vivants: [] };
    for (const dessin of contenu) {
      if (enPolygones.has(bloc)) dedans.vivants.push({ dessin, sous: SANS_EFFET });
      else poser(dessin, SANS_EFFET, dedans);
    }
    fermer(dedans);
  }

  return {
    poignees,
    poserLaScene(scene, racine) {
      const lot: Lot = { conteneur: racine, aLaRacine: true, figes: [], vivants: [] };
      poser(scene, SANS_EFFET, lot);
      fermer(lot);
    },
    garnir(bloc, contenu) {
      const dejaLa = Array.from(bloc.element.children);
      const tenues = new Map(poignees);
      try {
        garnir(bloc, contenu);
      } catch (erreur) {
        // Ce qui a été posé avant l'échec s'en va, et les poignées redeviennent celles de ce qui reste dans la page :
        // un contenu ne nomme que des calques que la scène avait déjà au montage, il n'y en a donc aucune à retirer.
        retirer(Array.from(bloc.element.children).filter((pose) => !dejaLa.includes(pose)));
        for (const [nom, poignee] of tenues) poignees.set(nom, poignee);
        throw erreur;
      }
    },
  };
}
