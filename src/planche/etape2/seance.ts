/**
 * La séance de l'atelier : une piste écrite d'avance, action par action, comme un serveur la jouerait. L'état à un instant
 * est ce que donnent les règles une fois jouées toutes les actions dont l'heure est passée : rejouer, c'est remettre l'horloge.
 */

import { DUREE_DU_DECOMPTE, finDeLExtrait, instantDuChiffre, jouer, type ActionDePiste, type Piste, type Reponse } from '../../regles/piste';
import { REGLAGES } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import type { PisteEnScene } from '../../scene/piste/etat';
import { reponseDExemple } from '../exemples';
import { MINUTAGE } from './minutage';

/**
 * Les moments d'où l'on peut rejouer la piste, dans l'ordre où ils arrivent : chacun s'enchaîne avec les suivants, jusqu'à la fin.
 * L'attente est celle d'une piste dont l'extrait tarde à charger : au « 1 », le bras attend, levé, que les appareils soient prêts.
 */
export const MOMENTS = ['decompte', 'attente', 'extrait', 'rayure', 'revelation'] as const;
export type Moment = (typeof MOMENTS)[number];

/** Vrai pour le moment qui se rejoue sur la piste dont l'extrait tarde à charger. */
export const tardeACharger = (moment: Moment): boolean => moment === 'attente';

/** Le déroulé de la séance, en secondes. */
const S = MINUTAGE.seance;

export interface Seance {
  /** Les actions du serveur, dans l'ordre. */
  readonly actions: readonly ActionDePiste[];
  /** L'instant où la piste est lancée : le « 3 ». Avant lui, la platine est au repos. */
  readonly lance: number;
  /** L'instant où l'extrait part, et celui où la réponse tombe. */
  readonly extrait: number;
  readonly revelation: number;
  /** La mauvaise réponse écrite d'avance. */
  readonly rayure: number;
  /** L'instant d'où l'on rejoue chaque moment : un peu avant lui, pour le voir venir. */
  readonly departs: Readonly<Record<Moment, number>>;
  /** L'instant où tout est retombé. */
  readonly fin: number;
}

export function preparerLaSeance(o: {
  /** Durée de l'extrait, en secondes. */
  readonly duree: number;
  readonly reponse: Reponse;
  /** Vrai pour voir l'état « extrait lent à charger » : les appareils ne sont prêts qu'après la fin du décompte. */
  readonly extraitLent: boolean;
}): Seance {
  const lance = S.avant;
  const prets = o.extraitLent ? lance + DUREE_DU_DECOMPTE + S.retard : lance + S.prets;
  // L'heure de l'extrait, c'est la règle qui la donne : on la lit sur une piste jouée jusque-là.
  const lancer: ActionDePiste = { genre: 'lancer', a: lance, duree: o.duree };
  const pretsA: ActionDePiste = { genre: 'prets', a: prets };
  const prete = jouer(jouer(undefined, lancer), pretsA);
  const [extrait, revelation] = [prete?.extraitA, prete !== undefined ? finDeLExtrait(prete) : undefined];
  if (prete === undefined || extrait === undefined || revelation === undefined)
    throw new Error("La séance n'a pas pu être écrite : sa piste ne se lance pas.");
  const rayure = extrait + S.rayure;
  return {
    actions: [lancer, pretsA, { genre: 'reveler', a: revelation, reponse: o.reponse }],
    lance,
    extrait,
    revelation,
    rayure,
    departs: {
      decompte: 0,
      attente: instantDuChiffre(prete, 1) - S.elan.attente,
      extrait: extrait - S.elan.extrait,
      rayure: rayure - S.elan.rayure,
      revelation: revelation - S.elan.revelation,
    },
    fin: revelation + S.apres,
  };
}

/**
 * La séance de l'atelier : la piste d'exemple, avec l'extrait le plus court que proposent les réglages, pour rejouer vite.
 * @param extraitLent vrai pour celle dont l'extrait tarde à charger.
 */
export const seanceDExemple = (textes: Textes, extraitLent = false): Seance =>
  preparerLaSeance({ duree: REGLAGES.extrait.choix[0], reponse: reponseDExemple(textes), extraitLent });

/**
 * L'instant où remettre l'horloge pour rejouer la séance depuis un moment.
 * @param maintenant où en est l'horloge : si la platine est encore au repos, le décompte part sans attendre.
 * @param vitesse celle du temps de la séance : ce qu'on laisse voir de la platine au repos se compte en temps de montre.
 */
export function instantDeDepart(seance: Seance, moment: Moment, maintenant: number, vitesse: number): number {
  const depart = seance.departs[moment];
  if (depart >= seance.lance) return depart;
  return seance.lance - (maintenant < seance.lance ? S.souffle : S.avant) * vitesse;
}

/**
 * La même séance, révélée dès l'instant t : le serveur n'attend pas toujours que le bras arrive à l'étiquette.
 * C'est une piste qui change en route : chaque pièce repart d'où elle est. Hors de l'extrait, rien ne change.
 */
export function revelerDes(seance: Seance, t: number): Seance {
  if (t < seance.extrait || t >= seance.revelation) return seance;
  return {
    ...seance,
    actions: seance.actions.map((action) => (action.genre === 'reveler' ? { ...action, a: t } : action)),
    revelation: t,
    fin: t + S.apres,
  };
}

/**
 * Ce qu'un écran sait de la piste à l'instant t : les actions dont l'heure est passée, et les rayures déjà faites.
 * @param rayuresDuJoueur les mauvaises réponses données à la main, en plus de celle qui est écrite d'avance.
 */
export function etatDeLaSeance(seance: Seance, t: number, rayuresDuJoueur: readonly number[]): PisteEnScene {
  const aucune: Piste | undefined = undefined;
  const piste = seance.actions.filter((action) => action.a <= t).reduce(jouer, aucune);
  const rayuresA = [seance.rayure, ...rayuresDuJoueur].filter((a) => a <= t).sort((a, b) => a - b);
  return piste === undefined ? { rayuresA } : { piste, rayuresA };
}

/** La séance une fois jouée jusqu'au bout : la piste entière, connue d'avance. */
export const seanceEntiere = (seance: Seance): PisteEnScene => etatDeLaSeance(seance, seance.fin, []);

/**
 * Le même état, et toujours le même objet tant que rien n'y a changé : l'écran sait ainsi qu'il n'a pas à récrire
 * sa partition (voir `SuiviDeLaPiste`).
 */
export function lecteurDeSeance(): (seance: Seance, t: number, rayuresDuJoueur: readonly number[]) => PisteEnScene {
  let derniere: { readonly cle: string; readonly scene: PisteEnScene } | undefined;
  return (seance, t, rayuresDuJoueur) => {
    const scene = etatDeLaSeance(seance, t, rayuresDuJoueur);
    const cle = JSON.stringify(scene);
    if (derniere?.cle !== cle) derniere = { cle, scene };
    return derniere.scene;
  };
}
