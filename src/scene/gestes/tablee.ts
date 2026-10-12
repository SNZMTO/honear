/**
 * Les gestes de la tablée, au téléphone : une pochette qui arrive et pousse sa voisine, une pastille qui claque sur une pochette
 * (qui encaisse), « Presque. » qui se colle puis s'en va, les quatre étiquettes du mode 4 choix, la vraie pochette qui sort de sous
 * la kraft, une pochette qui se retourne quand la connexion tombe, le hit-parade qui se range, la finale. Chacun est écrit une fois,
 * depuis l'instant où il part ; les places viennent de la tablée, les temps et les matières de la table des gestes.
 */

import { tempsDeDescente } from '../../mouvement/chute';
import type { Coup } from '../../mouvement/moteur';
import { GESTES, MATIERES, TOUCHES } from '../../ressources/mouvement';
import { PASTILLES } from '../../ressources/pastilles';
import type { Place } from '../../ressources/tablee';
import { pourLArreterNet, quiTombe, type Chute } from '../piste/gestes/chutes';
import { auRythmeDe, aVitesseConstante, glissant, immobile, role, selon, vers, type Geste, type Pas, type RoleDuGeste } from './geste';

const ARRIVEE = PASTILLES.decompte.arrivee;
/** La chute d'une pastille qu'on plaque : de la hauteur d'où elle arrive jusqu'à ce qui la reçoit. */
const CHUTE: Chute = { amortisseur: MATIERES.pastille.tombe, hauteur: ARRIVEE.hauteur };
/** Le temps qu'une pastille met à claquer, depuis qu'elle part : 90 ms. */
export const CLAQUE = tempsDeDescente(CHUTE.amortisseur, CHUTE.hauteur);

/** La taille d'une pastille en l'air, selon la hauteur où elle est : un peu plus grande en haut, à sa taille une fois collée. */
export const echelleEnLAir = (hauteur: number): number => 1 + (ARRIVEE.echelle - 1) * Math.max(0, Math.min(1, hauteur / ARRIVEE.hauteur));

/** La hauteur d'une pastille qui part à l'instant a : elle tombe, puis ce qui la reçoit l'arrête net. Et le coup qui l'arrête. */
function pastilleQuiClaque(a: number): { readonly role: RoleDuGeste; readonly coup: Coup<'pastille'> } {
  const impact = a + CLAQUE;
  return {
    role: role(
      ARRIVEE.hauteur,
      { a, consigne: quiTombe(CHUTE, a, ARRIVEE.hauteur, 0, MATIERES.recalage), arrivee: 0, regle: { genre: 'chute', duree: CLAQUE } },
      vers(impact, 0, MATIERES.recalage),
    ),
    coup: { a: impact, grandeur: 'pastille', vitesse: pourLArreterNet(CHUTE, ARRIVEE.hauteur, 0) },
  };
}

// ————— Une pochette qui arrive —————

export type GrandeurDArrivee = 'x' | 'y' | 'angle' | 'pousse';

/**
 * Une pochette qui arrive à sa place, lancée depuis le bord le plus proche du cadre (un peu plus bas qu'elle), en tournant ;
 * la voisine qu'elle touche à l'arrivée est poussée de 2 px, dans le sens du lancer, pendant ses deux derniers px.
 * @param largeur la largeur du cadre ; la place est dans le regard.
 */
export function arriveeDUnePochette(
  place: Place,
  taille: number,
  largeur: number,
  a: number,
): Geste<GrandeurDArrivee> & { readonly sens: readonly [number, number]; readonly duree: number } {
  const A = GESTES.arrivee;
  const parLaGauche = place.en[0] < largeur / 2;
  const depart: readonly [number, number] = [parLaGauche ? -taille / 2 - A.depuis : largeur + taille / 2 + A.depuis, place.en[1] + taille];
  const [dx, dy] = [place.en[0] - depart[0], place.en[1] - depart[1]];
  const distance = Math.hypot(dx, dy);
  const chemin = glissant(a, 0, distance, A.frottement);
  const tour = parLaGauche ? A.tour : -A.tour;
  // La voisine ne bouge que pendant les derniers px du chemin : c'est là qu'elle est touchée.
  const pousse = (ecoule: number): number => Math.max(0, chemin.glissade.chemin(ecoule) - (distance - A.pousse));
  return {
    roles: {
      x: role(depart[0], auRythmeDe(a, chemin.glissade, depart[0], place.en[0])),
      y: role(depart[1], auRythmeDe(a, chemin.glissade, depart[1], place.en[1])),
      angle: role(place.angle - tour, auRythmeDe(a, chemin.glissade, place.angle - tour, place.angle)),
      pousse: role(0, selon(a, pousse, A.pousse, chemin.glissade.duree)),
    },
    sens: [dx / distance, dy / distance],
    duree: chemin.glissade.duree,
  };
}

// ————— Une pastille qui claque sur une pochette —————

export type GrandeurDeBonneReponse = 'pastille' | 'pochette';

/**
 * Une bonne réponse : une pastille tombe sur la pochette du joueur, un peu plus grande, d'un peu plus haut, et claque ;
 * la pochette encaisse, s'enfonce d'un px et revient. Le téléphone vibre à l'impact : c'est aussi là que le joueur passe en « content ».
 */
export function bonneReponse(a: number): Geste<GrandeurDeBonneReponse> & { readonly impact: number } {
  const { role: pastille, coup } = pastilleQuiClaque(a);
  const impact = a + CLAQUE;
  return {
    roles: { pastille, pochette: role(0, vers(impact, 0, GESTES.encaisse.ressort)) },
    coups: [coup, { a: impact, grandeur: 'pochette', vitesse: GESTES.encaisse.coup }],
    vibrations: [impact],
    impact,
  };
}

// ————— « Presque. » —————

export type GrandeurDePresque = 'pastille' | 'fuite';

/** « Presque. » : elle claque sur l'étiquette vierge, y reste 1,2 s, se décolle, et glisse hors du cadre vers la droite. */
export function presque(a: number): Geste<GrandeurDePresque> & { readonly impact: number } {
  const P = GESTES.presque;
  const { role: tombe, coup } = pastilleQuiClaque(a);
  const impact = a + CLAQUE;
  const decolle = impact + P.reste;
  return {
    roles: {
      pastille: role(ARRIVEE.hauteur, ...tombe.pas, vers(decolle, P.decollee, MATIERES.pastille.seDecolle)),
      fuite: role(0, glissant(decolle + P.seDecolle, 0, P.fuite, P.frottement)),
    },
    coups: [coup],
    impact,
  };
}

// ————— Les quatre étiquettes du mode 4 choix —————

export type GrandeurDeChoix = `x${number}` | `angle${number}` | `enfonce${number}`;

/**
 * Les quatre étiquettes : elles arrivent en glissant depuis la gauche, à 40 ms d'écart, de travers ; celle qu'on touche s'enfonce
 * comme une touche, et le reste ; à la révélation, les trois mauvaises repartent vers la gauche, à 40 ms d'écart, hors du cadre.
 * x est un décalage depuis la place de l'étiquette.
 */
export function quatreEtiquettes(
  angles: readonly number[],
  arrivent: number,
  touchee: { readonly rang: number; readonly a: number } | undefined,
  revelation: { readonly a: number; readonly bonne: number } | undefined,
): Geste<GrandeurDeChoix> {
  const C = GESTES.choix;
  const roles: Record<string, RoleDuGeste> = {};
  let sortie = 0;
  for (const [rang, angle] of angles.entries()) {
    const part = arrivent + rang * C.ecart;
    const entree = glissant(part, -C.depuis, 0, C.frottement);
    const pas: Pas[] = [entree];
    if (revelation !== undefined && rang !== revelation.bonne) pas.push(glissant(revelation.a + sortie++ * C.ecart, 0, -C.sortie, C.frottement));
    roles[`x${rang}`] = role(-C.depuis, ...pas);
    roles[`angle${rang}`] = role(angle - C.tour, auRythmeDe(part, entree.glissade, angle - C.tour, angle));
    roles[`enfonce${rang}`] =
      touchee !== undefined && touchee.rang === rang ? role(0, aVitesseConstante(touchee.a, 0, TOUCHES.course, TOUCHES.enfonce)) : immobile(0);
  }
  return { roles: roles as Record<GrandeurDeChoix, RoleDuGeste>, ...(touchee !== undefined ? { vibrations: [touchee.a] } : {}) };
}

// ————— La vraie pochette —————

export type GrandeurDeLaVraie = 'x' | 'y' | 'angle';

/** La vraie pochette sort de sous la kraft : elle glisse jusqu'à sa place en tournant, et s'arrête de travers. */
export function vraiePochette(place: Place, a: number): Geste<GrandeurDeLaVraie> {
  const V = GESTES.vraie;
  const [x0, y0] = [place.en[0] + V.depuis[0], place.en[1] + V.depuis[1]];
  const chemin = glissant(a, 0, Math.hypot(V.depuis[0], V.depuis[1]), V.frottement);
  return {
    roles: {
      x: role(x0, auRythmeDe(a, chemin.glissade, x0, place.en[0])),
      y: role(y0, auRythmeDe(a, chemin.glissade, y0, place.en[1])),
      angle: role(place.angle + V.tour, auRythmeDe(a, chemin.glissade, place.angle + V.tour, place.angle)),
    },
  };
}

// ————— La connexion qui tombe —————

/** Une pochette qui se retourne, côté dos, quand la connexion de son joueur tombe ; à son retour, elle se remet côté face. */
export const seRetourne = (a: number, versLeDos: boolean): Geste<'retourne'> => ({
  roles: { retourne: role(versLeDos ? 0 : 1, vers(a, versLeDos ? 1 : 0, GESTES.deconnexion.retourne)) },
});

// ————— Le hit-parade —————

export type GrandeurDuHitParade = `x-${string}` | `y-${string}` | `leve-${string}` | `pastille-${string}`;

/**
 * Le hit-parade : chaque pochette va de sa place d'avant à sa place d'après. Elles partent du dernier au premier, à 70 ms d'écart.
 * Celle qui monte se soulève, passe par-dessus, et se pose ; celle qu'elle double se pousse un temps après qu'elle est partie.
 * Une pastille claque sur chaque pochette qui a bougé, une fois posée.
 * @param avant les joueurs, dans l'ordre du classement d'avant ; `apres`, dans celui d'après.
 * @param places les places du classement, de la première à la dernière.
 */
export function hitParade(
  avant: readonly string[],
  apres: readonly string[],
  places: readonly Place[],
  a: number,
  bougent: readonly string[],
): Geste<GrandeurDuHitParade> & { readonly fin: number } {
  const H = GESTES.hitParade;
  const roles: Record<string, RoleDuGeste> = {};
  const departs = new Map<string, number>();
  [...apres].reverse().forEach((id, k) => departs.set(id, a + k * H.ecart));
  // Celle qui double : elle part à son tour ; celles qu'elle passe se poussent un temps après elle.
  for (const id of apres) {
    const de = avant.indexOf(id);
    const rangApres = apres.indexOf(id);
    if (rangApres >= de) continue;
    for (const doublee of avant.slice(rangApres, de)) {
      const pousse = (departs.get(id) ?? a) + H.poussee;
      departs.set(doublee, Math.max(departs.get(doublee) ?? a, pousse));
    }
  }
  let fin = a;
  for (const id of apres) {
    const de = places[avant.indexOf(id)] ?? places[apres.indexOf(id)];
    const la = places[apres.indexOf(id)];
    if (de === undefined || la === undefined) continue;
    const part = departs.get(id) ?? a;
    const monte = apres.indexOf(id) < avant.indexOf(id);
    const bouge = de.en[0] !== la.en[0] || de.en[1] !== la.en[1];
    const glisse = monte ? part + H.passeA : part;
    roles[`x-${id}`] = bouge ? role(de.en[0], vers(glisse, la.en[0], H.passe)) : immobile(la.en[0]);
    roles[`y-${id}`] = bouge ? role(de.en[1], vers(glisse, la.en[1], H.passe)) : immobile(la.en[1]);
    roles[`leve-${id}`] = monte ? role(0, vers(part, H.leve, H.seSouleve), vers(part + H.poseA, 0, H.sePose)) : immobile(0);
    if (bougent.includes(id)) {
      const claque = pastilleQuiClaque(part + H.pastille);
      roles[`pastille-${id}`] = claque.role;
      fin = Math.max(fin, part + H.pastille + CLAQUE);
    } else roles[`pastille-${id}`] = immobile(0);
  }
  return { roles: roles as Record<GrandeurDuHitParade, RoleDuGeste>, fin };
}

// ————— La finale —————

export type GrandeurDeLaFinale = 'or' | 'platine' | 'diamant' | 'eclat';

/**
 * La finale : l'or, le platine, puis le diamant, posés un par un, chacun descendant avec son ombre qui se resserre ;
 * puis l'éclat du diamant, de 0 à 1, pendant son dernier tour lent.
 */
export function finale(a: number): Geste<GrandeurDeLaFinale> & { readonly eclatDe: number; readonly eclatA: number } {
  const F = GESTES.finale;
  const pose = (rang: number): RoleDuGeste => role(F.vol, vers(a + rang * F.ecart, 0, F.descend));
  const eclatDe = a + 2 * F.ecart + F.tour.apres;
  const eclatA = eclatDe + F.tour.duree;
  return {
    roles: { or: pose(0), platine: pose(1), diamant: pose(2), eclat: role(0, aVitesseConstante(eclatDe, 0, 1, F.tour.duree)) },
    eclatDe,
    eclatA,
  };
}
