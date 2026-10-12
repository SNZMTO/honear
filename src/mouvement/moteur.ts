/**
 * Le moteur de mouvement : un seul pour tout le site. Il tient des grandeurs (un angle, une hauteur, une position),
 * et ramène chacune sur sa consigne par un ressort. Quand une consigne change, la grandeur repart de sa position
 * et de sa vitesse du moment : rien ne saute. Il avance sur le temps qu'on lui donne, jamais sur un nombre d'images.
 */

import { detendre, SANS_ELAN, type Elan, type Ressort } from './ressort';

/**
 * Une consigne : où une grandeur doit être à chaque instant, et la matière qui l'y ramène quand elle s'en écarte.
 * Une consigne immobile est une cible ; une consigne qui bouge est une trajectoire que la grandeur rattrape puis suit.
 */
export interface Consigne {
  /** Où être à l'instant t (en secondes), et à quelle vitesse on y passe. */
  readonly position: (t: number) => number;
  readonly vitesse: (t: number) => number;
  readonly matiere: Ressort;
}

const IMMOBILE = (): number => 0;

/** Une consigne qui ne bouge pas : une cible. */
export const cible = (valeur: number, matiere: Ressort): Consigne => ({ position: () => valeur, vitesse: IMMOBILE, matiere });

/** Le pas sur lequel on mesure la vitesse d'une trajectoire qui ne la donne pas, en secondes. */
const PAS_DE_MESURE = 1e-4;

/**
 * Une consigne qui bouge : une trajectoire.
 * @param vitesse sa vitesse, si on sait l'écrire ; sinon elle est mesurée sur la trajectoire, de part et d'autre de l'instant.
 */
export function trajectoire(position: (t: number) => number, matiere: Ressort, vitesse?: (t: number) => number): Consigne {
  return { position, vitesse: vitesse ?? ((t) => (position(t + PAS_DE_MESURE) - position(t - PAS_DE_MESURE)) / (2 * PAS_DE_MESURE)), matiere };
}

/** Un coup donné à une grandeur à un instant précis : sa vitesse change d'un coup, pas sa position. */
export interface Coup<N extends string> {
  readonly a: number;
  readonly grandeur: N;
  readonly vitesse: number;
}

/**
 * Ce qu'une chorégraphie donne au moteur : la consigne de chaque grandeur à tout instant, les instants où une consigne
 * change (le moteur s'y arrête, pour repartir exactement de là), et les coups donnés en chemin.
 * Entre deux de ses instants, une partition rend toujours les mêmes consignes : le moteur ne les relit qu'à ces instants-là.
 * Quand l'état change, on en écrit une autre : le moteur le voit à ce que ce n'est plus le même objet.
 */
export interface Partition<N extends string> {
  readonly consignes: (t: number) => Readonly<Record<N, Consigne>>;
  readonly instants: readonly number[];
  readonly coups: readonly Coup<N>[];
}

/** Ce que le moteur tolère de l'horloge qu'on lui donne, en secondes. */
export interface Tolerances {
  /** Au-delà de ce trou entre deux avancées, on ne rejoue pas ce qui a été manqué : on saute des étapes. */
  readonly trou: number;
  /** Jusqu'à ce recul, l'horloge hésite (elle vient d'être recalée sur le serveur) : on l'attend. Au-delà, on a remis la piste en arrière. */
  readonly recul: number;
  /**
   * En deçà de cet écart à sa consigne et de cette vitesse (par seconde), une grandeur est arrivée : elle s'arrête net.
   * Un ressort s'approche de sa place sans jamais l'atteindre ; un objet, lui, s'arrête.
   */
  readonly repos: { readonly ecart: number; readonly vitesse: number };
}

interface Suivi {
  consigne: Consigne;
  elan: Elan;
}

export interface Moteur<N extends string> {
  /** Pose chaque grandeur sur sa consigne de l'instant t, sans élan : l'état d'un écran qu'on vient d'ouvrir, ou d'un retardataire. */
  poser(partition: Partition<N>, t: number): void;
  /**
   * Avance jusqu'à l'instant t. Si la partition n'est plus celle d'avant, chaque grandeur passe à sa nouvelle consigne
   * là où elle est, avec sa vitesse. Si l'horloge saute ou recule au-delà de ce qu'il tolère, les grandeurs sont posées plutôt que rejouées.
   * @returns l'instant où il en est : t, ou un peu plus tard si l'horloge hésite et qu'il l'attend.
   */
  avancer(partition: Partition<N>, t: number): number;
  valeur(nom: N): number;
  vitesse(nom: N): number;
  /** Ce dont une grandeur est encore loin de sa consigne : nul quand elle l'a rejointe. */
  ecart(nom: N): number;
  /** L'instant où en est le moteur, ou rien s'il n'a pas encore été posé. */
  readonly instant: number | undefined;
}

/** Tous les instants où une partition demande au moteur de s'arrêter, dans l'ordre : ses changements de consigne et ses coups. */
function arretsDe<N extends string>(partition: Partition<N>): number[] {
  return [...new Set([...partition.instants, ...partition.coups.map((coup) => coup.a)])].sort((a, b) => a - b);
}

export function creerLeMoteur<N extends string>(tolerances: Tolerances): Moteur<N> {
  const suivis = new Map<N, Suivi>();
  let instant: number | undefined;
  /** La partition qu'on suit, et ses arrêts : tant qu'on nous donne la même, on ne les recompte pas. */
  let suivie: { readonly partition: Partition<N>; readonly arrets: readonly number[] } | undefined;

  const suivi = (nom: N): Suivi => {
    const trouve = suivis.get(nom);
    if (trouve === undefined) throw new Error(`Le moteur ne suit pas de grandeur « ${nom} » : il faut d'abord le poser.`);
    return trouve;
  };

  function poser(partition: Partition<N>, t: number): void {
    suivis.clear();
    const consignes = partition.consignes(t);
    for (const nom of Object.keys(consignes) as N[]) suivis.set(nom, { consigne: consignes[nom], elan: SANS_ELAN });
    suivie = { partition, arrets: arretsDe(partition) };
    instant = t;
  }

  /** D'un instant au suivant, sans changement de consigne entre les deux : chaque élan se détend librement, puis s'éteint. */
  function detendreJusqua(t: number): void {
    const duree = t - (instant ?? t);
    for (const s of suivis.values()) {
      if (s.elan === SANS_ELAN) continue;
      const elan = detendre(s.consigne.matiere, s.elan, duree);
      const arrive = Math.abs(elan.ecart) < tolerances.repos.ecart && Math.abs(elan.vitesse) < tolerances.repos.vitesse;
      s.elan = arrive ? SANS_ELAN : elan;
    }
    instant = t;
  }

  /** À l'instant t : chaque grandeur dont la consigne n'est plus la même passe à la nouvelle, d'où elle est, avec sa vitesse. */
  function reprendre(partition: Partition<N>, t: number): void {
    const consignes = partition.consignes(t);
    for (const nom of Object.keys(consignes) as N[]) {
      const nouvelle = consignes[nom];
      const s = suivis.get(nom);
      if (s === undefined) {
        suivis.set(nom, { consigne: nouvelle, elan: SANS_ELAN });
      } else if (s.consigne !== nouvelle) {
        s.elan = {
          ecart: s.consigne.position(t) + s.elan.ecart - nouvelle.position(t),
          vitesse: s.consigne.vitesse(t) + s.elan.vitesse - nouvelle.vitesse(t),
        };
        s.consigne = nouvelle;
      }
    }
  }

  function avancer(partition: Partition<N>, t: number): number {
    if (instant === undefined || suivie === undefined || t - instant > tolerances.trou || instant - t > tolerances.recul) {
      poser(partition, t);
      return t;
    }
    // Une autre partition : l'état a changé en route. On la prend là où en est le moteur, avant d'avancer d'un pas.
    if (suivie.partition !== partition) {
      reprendre(partition, instant);
      suivie = { partition, arrets: arretsDe(partition) };
    }
    // L'horloge hésite : on reste où l'on est, le temps qu'elle reparte.
    if (t <= instant) return instant;
    // Les arrêts en chemin : chaque instant de la partition, chaque coup, puis l'arrivée.
    for (const arret of suivie.arrets) {
      if (arret <= instant) continue;
      if (arret > t) break;
      detendreJusqua(arret);
      reprendre(partition, arret);
      for (const coup of partition.coups) {
        if (coup.a !== arret) continue;
        const s = suivi(coup.grandeur);
        s.elan = { ecart: s.elan.ecart, vitesse: s.elan.vitesse + coup.vitesse };
      }
    }
    detendreJusqua(t);
    return t;
  }

  return {
    poser,
    avancer,
    valeur: (nom) => {
      const s = suivi(nom);
      return s.consigne.position(instant ?? 0) + s.elan.ecart;
    },
    vitesse: (nom) => {
      const s = suivi(nom);
      return s.consigne.vitesse(instant ?? 0) + s.elan.vitesse;
    },
    ecart: (nom) => suivi(nom).elan.ecart,
    get instant() {
      return instant;
    },
  };
}
