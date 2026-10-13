/**
 * Un geste de la tablée ou du meuble : pour chaque grandeur qu'il fait bouger (une place, un angle, une hauteur), la valeur
 * d'où elle part, puis ses pas, chacun avec la valeur où il arrive. Le moteur le suit ; la version sobre, elle, met chaque grandeur
 * d'un coup à l'arrivée de son dernier pas parti, comme des images imprimées. Un geste ne lit que l'état qu'on lui donne.
 */

import { partitionDe, type Etape, type Role } from '../../mouvement/choregraphie';
import { glisser, type Frottement, type Glissade } from '../../mouvement/glissade';
import { cible, trajectoire, type Coup, type Partition } from '../../mouvement/moteur';
import { rejouer } from '../../mouvement/rejeu';
import { tempsDArrivee, type Ressort } from '../../mouvement/ressort';
import { GESTES, MATIERES, TOLERANCES } from '../../ressources/mouvement';

/** La courbe d'une loi écrite : un mouvement régulier, ou une loi propre au geste (la poussée d'une voisine pendant les derniers px). */
export type CourbeDUneLoi = 'reguliere' | 'ecrite';

/**
 * Ce qui porte un pas, tel que la planche d'animations le montre : un ressort (sa raideur, son amortissement, sa masse),
 * une glissade (son frein, et le temps qu'elle met), une chute qui claque, ou une loi écrite qui dure tant, et sa courbe.
 */
export type RegleDuPas =
  | { readonly genre: 'ressort'; readonly ressort: Ressort }
  | { readonly genre: 'glissade'; readonly frein: number; readonly duree: number }
  | { readonly genre: 'chute'; readonly duree: number }
  | { readonly genre: 'loi'; readonly duree: number; readonly courbe: CourbeDUneLoi };

/** Un pas : à partir d'un instant, une consigne, et la valeur où elle mène. */
export interface Pas extends Etape {
  readonly arrivee: number;
  /** Vrai pour ce qu'on lance : la grandeur part avec la vitesse de sa trajectoire, sans avoir à la prendre. */
  readonly lance?: boolean;
  readonly regle?: RegleDuPas;
}

/** Le temps qu'un pas met à mener sa grandeur où il va : celui de sa glissade, de sa chute, de sa loi, ou l'arrivée de son ressort. */
export function dureeDuPas(p: Pas): number {
  const r = p.regle;
  if (r === undefined) return 0;
  return r.genre === 'ressort' ? tempsDArrivee(r.ressort) : r.duree;
}

export interface RoleDuGeste {
  readonly depart: number;
  readonly pas: readonly Pas[];
}

export interface Geste<N extends string> {
  readonly roles: Readonly<Record<N, RoleDuGeste>>;
  /** Les coups donnés en route : une pochette qui encaisse une pastille. */
  readonly coups?: readonly Coup<N>[];
  /** Les instants où le téléphone vibre, là où il sait. */
  readonly vibrations?: readonly number[];
}

/** Ce qui suit une trajectoire écrite : ça la rejoint d'un coup s'il le faut, puis la suit sans traîner. */
const SUIT: Ressort = MATIERES.recalage;

/** Une grandeur qui part, à l'instant a, vers une valeur, portée par un ressort. */
export const vers = (a: number, valeur: number, ressort: Ressort): Pas => ({
  a,
  consigne: cible(valeur, ressort),
  arrivee: valeur,
  regle: { genre: 'ressort', ressort },
});

/** Une grandeur qui glisse, à l'instant a, d'une valeur à une autre, freinée par un frottement sec ; elle s'arrête net. */
export function glissant(a: number, de: number, a2: number, frottement: Frottement): Pas & { readonly glissade: Glissade } {
  const glissade = glisser(frottement, a2 - de);
  return {
    a,
    consigne: trajectoire(
      (t) => de + glissade.chemin(t - a),
      SUIT,
      (t) => glissade.vitesse(t - a),
    ),
    arrivee: a2,
    lance: true,
    regle: { genre: 'glissade', frein: frottement.frein, duree: glissade.duree },
    glissade,
  };
}

/**
 * Une grandeur qui suit une glissade partie à l'instant a : elle va de sa valeur de départ à celle d'arrivée au même rythme.
 * Ce qui la porte est cette glissade : son frein, et le temps qu'elle met.
 */
export const auRythmeDe = (a: number, glissade: Glissade, de: number, a2: number): Pas => ({
  a,
  consigne: trajectoire((t) => de + (a2 - de) * glissade.part(t - a), SUIT),
  arrivee: a2,
  lance: true,
  regle: { genre: 'glissade', frein: glissade.frein, duree: glissade.duree },
});

/** Un rôle : une valeur de départ, puis des pas, rangés dans l'ordre de leurs instants. */
export const role = (depart: number, ...pas: readonly Pas[]): RoleDuGeste => ({ depart, pas: [...pas].sort((x, y) => x.a - y.a) });

/** Un rôle qui ne bouge pas. */
export const immobile = (valeur: number): RoleDuGeste => role(valeur);

/** Où en est chaque grandeur du geste à l'instant t, en version sobre : à l'arrivée de son dernier pas parti, d'un coup. */
export function enSobre<N extends string>(geste: Geste<N>, t: number): Readonly<Record<N, number>> {
  const noms = Object.keys(geste.roles) as N[];
  return Object.fromEntries(
    noms.map((nom) => {
      const r = geste.roles[nom];
      const partis = r.pas.filter((p) => p.a <= t);
      return [nom, partis[partis.length - 1]?.arrivee ?? r.depart];
    }),
  ) as Record<N, number>;
}

/**
 * La partition d'un geste, telle que le moteur la suit : chaque grandeur, de sa valeur de départ à ses pas, et les coups qui
 * la lancent. Un écran tient un moteur et la lui donne ; quand l'état change en route, il lui en donne une autre, et chaque
 * grandeur repart d'où elle est, avec sa vitesse.
 */
export function partitionDuGeste<N extends string>(geste: Geste<N>): Partition<N> {
  const noms = Object.keys(geste.roles) as N[];
  const roles = Object.fromEntries(
    noms.map((nom): [N, Role] => [nom, { depart: cible(geste.roles[nom].depart, SUIT), etapes: geste.roles[nom].pas }]),
  ) as Record<N, Role>;
  // Ce qu'on lance part avec sa vitesse : un coup, à son départ, la lui donne.
  const lances = noms.flatMap((nom) =>
    geste.roles[nom].pas
      .filter((p) => p.lance === true)
      // Le moteur lit à cet instant la vitesse que la trajectoire déclare : le coup la donne telle quelle, la grandeur la suit sans écart.
      .map((p): Coup<N> => ({ a: p.a, grandeur: nom, vitesse: p.consigne.vitesse(p.a) })),
  );
  return partitionDe(roles, [...(geste.coups ?? []), ...lances]);
}

/** Où en est chaque grandeur du geste à l'instant t, suivie depuis son début ; en version sobre, d'un coup à l'arrivée. */
export function aLInstant<N extends string>(geste: Geste<N>, t: number, sobre = false): Readonly<Record<N, number>> {
  return sobre ? enSobre(geste, t) : rejouer(partitionDuGeste(geste), t, { tolerances: TOLERANCES, ...GESTES.rejeu });
}

/** L'instant où tout le geste est au repos : la fin du plus tardif de ses pas. */
export const finDuGeste = <N extends string>(geste: Geste<N>): number =>
  Math.max(0, ...Object.values<RoleDuGeste>(geste.roles).flatMap((r) => r.pas.map((p) => p.a + dureeDuPas(p))));

/** Une grandeur qui suit, à partir de l'instant a, une loi écrite du temps écoulé, et finit à une valeur. */
export const selon = (a: number, loi: (ecoule: number) => number, arrivee: number, duree = 0, courbe: CourbeDUneLoi = 'ecrite'): Pas => ({
  a,
  consigne: trajectoire((t) => loi(t - a), SUIT),
  arrivee,
  lance: true,
  regle: { genre: 'loi', duree, courbe },
});

/** Une grandeur qui va d'une valeur à une autre à vitesse constante, en tant de secondes : une touche qui s'enfonce. */
export const aVitesseConstante = (a: number, de: number, a2: number, duree: number): Pas =>
  selon(a, (ecoule) => de + (a2 - de) * Math.min(1, Math.max(0, ecoule / duree)), a2, duree, 'reguliere');
