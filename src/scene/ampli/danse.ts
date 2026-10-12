/**
 * La danse des aiguilles : la chorégraphie des deux vumètres d'un ampli allumé, écrite une fois, et suivie par le moteur.
 * Au repos, la gauche respire ; au départ de l'extrait, elles sursautent ensemble ; puis elles dansent, cible après cible,
 * proches mais jamais identiques ; dans les 5 dernières secondes, elles passent dans le rouge ; à une mauvaise réponse, elles font
 * un pic ; à la révélation ou à la fin de l'extrait, elles retombent. Tous les temps viennent de la table des mouvements.
 * Un ampli éteint garde ses aiguilles au repos, immobiles.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { partitionDe, type Etape, type Role } from '../../mouvement/choregraphie';
import { cible, creerLeMoteur, trajectoire, type Consigne, type Partition } from '../../mouvement/moteur';
import { finDeLExtrait, type Piste } from '../../regles/piste';
import { DANSE_DES_AIGUILLES as D, MATIERES, TOLERANCES } from '../../ressources/mouvement';
import { CANAUX, type Canal } from './vumetre';

/** Le repos d'une aiguille : la gauche respire, la droite ne bouge pas. Une respiration est un souffle lent, qui part du repos. */
const auRepos = (canal: Canal): Consigne =>
  canal === 'gauche'
    ? trajectoire((t) => (D.respire.place * (1 - Math.cos((2 * Math.PI * t) / D.respire.souffle))) / 2, MATIERES.aiguille.retombe)
    : cible(0, MATIERES.aiguille.retombe);

/** Le rôle d'une aiguille pendant une piste, rayures du joueur comprises. */
function roleDeLAiguille(piste: Piste, canal: Canal, rayures: readonly number[]): Role {
  const repos = auRepos(canal);
  const fin = finDeLExtrait(piste);
  if (piste.extraitA === undefined || fin === undefined) return { depart: repos, etapes: [] };
  const debut = piste.extraitA;
  const arret = Math.min(fin, piste.revelation?.a ?? Infinity);
  // Elles sursautent ensemble, à la même place : c'est le diamant qui touche.
  const etapes: Etape[] = [{ a: debut, consigne: cible(D.sursaut.place, MATIERES.aiguille.monte) }];
  // Chaque canal tire ses cibles de son propre germe : la gauche et la droite ne dansent jamais pareil.
  const tirage = hasard(D.germe + CANAUX.indexOf(canal));
  const decalage = canal === 'droite' ? D.decalage * D.battement : 0;
  const rouge = fin - D.rouge.avantLaFin;
  for (let a = debut + D.sursaut.duree + decalage; a < arret; a += D.battement) {
    const [de, jusqua] = a >= rouge ? [D.rouge.de, D.rouge.a] : [D.danse.de, D.danse.a];
    etapes.push({ a, consigne: cible(tirage.entre(de, jusqua), MATIERES.aiguille.monte) });
  }
  // Une mauvaise réponse : un pic, le temps du pic, puis la danse reprend à sa cible suivante.
  const pics = rayures.filter((r) => r >= debut && r < arret);
  const pendantUnPic = (a: number): boolean => pics.some((r) => a >= r && a < r + D.pic.duree);
  const dansees = etapes.filter((e, rang) => rang === 0 || !pendantUnPic(e.a));
  etapes.length = 0;
  etapes.push(...dansees, ...pics.map((r): Etape => ({ a: r, consigne: cible(D.pic.place, MATIERES.aiguille.monte) })));
  etapes.push({ a: arret, consigne: repos });
  return { depart: repos, etapes: etapes.sort((x, y) => x.a - y.a) };
}

/** La partition des deux aiguilles pendant une piste. */
export const partitionDesAiguilles = (piste: Piste, rayures: readonly number[] = []): Partition<Canal> =>
  partitionDe({ gauche: roleDeLAiguille(piste, 'gauche', rayures), droite: roleDeLAiguille(piste, 'droite', rayures) });

/** Le pas sur lequel on rejoue la danse pour une image arrêtée, en secondes : bien plus fin que la montée d'une aiguille. */
const PAS = 1 / 480;
/** Ce qu'on rejoue avant l'instant demandé, au repos, en secondes : de quoi laisser la respiration se mettre en route. */
const AVANT = 2;

/**
 * Où sont les aiguilles à l'instant t, de 0 à 1 : la danse rejouée comme un écran l'aurait suivie. Pour une image arrêtée ;
 * un écran, lui, tient son moteur et avance d'image en image.
 */
export function aiguillesA(piste: Piste, t: number, rayures: readonly number[] = []): readonly [number, number] {
  const partition = partitionDesAiguilles(piste, rayures);
  const moteur = creerLeMoteur<Canal>(TOLERANCES);
  const depart = Math.min(t, piste.extraitA ?? t) - AVANT;
  moteur.poser(partition, depart);
  for (let instant = depart; instant < t; instant = Math.min(t, instant + PAS)) moteur.avancer(partition, Math.min(t, instant + PAS));
  const borne = (v: number): number => Math.min(1, Math.max(0, v));
  return [borne(moteur.valeur('gauche')), borne(moteur.valeur('droite'))];
}
