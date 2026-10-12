/**
 * La liste des temps de la piste : pour chaque signal (un chiffre du décompte, l'extrait, une rayure, la révélation, l'arrêt),
 * ce qui part, quand, comment la pièce y va, et avec quels réglages. Les départs sont lus dans les gestes mêmes de la piste :
 * la liste ne peut pas dire autre chose que ce qui se joue. Ce module les met en phrases, calcule ce qu'elles annoncent
 * (un temps d'arrivée, un dépassement), et y ajoute ce qui se voit sans avoir d'heure de départ.
 */

import { consigneDuRole, partitionDe } from '../../mouvement/choregraphie';
import { descendre, tempsDeDescente, type Amortisseur } from '../../mouvement/chute';
import { creerLeMoteur, type Partition } from '../../mouvement/moteur';
import { tempsDArriveeDuPortage, tempsDePointeDuPortage } from '../../mouvement/portage';
import { depassement, SEUIL_D_ARRIVEE, tempsDArrivee, tempsDeRetombee, type Ressort } from '../../mouvement/ressort';
import { PART_DE_CROISIERE, tempsDeMiseEnVitesse, tempsPourRalentir, type Volant } from '../../mouvement/volant';
import { AMPLEURS, TOLERANCES } from '../../ressources/mouvement';
import { remplir } from '../../scene/phrases';
import type { PisteEnScene } from '../../scene/piste/etat';
import { gestesDeLaPiste } from '../../scene/piste/gestes';
import { GRANDEURS, type Grandeur, type NomDeGeste, type Porteur } from '../../scene/piste/gestes/vocabulaire';
import type { Signal } from '../../scene/piste/instants';
import { ecrire } from '../nombres.fr';
import { LEGENDES } from './legendes.fr';
import { MINUTAGE } from './minutage';

const L = LEGENDES.temps;

export interface LigneDeTemps {
  /** Quand la pièce part, compté depuis son signal. Vide : ce n'est pas un départ. */
  readonly quand: string;
  readonly quoi: string;
  /** Comment la pièce y va, en clair ; pour ce qui n'a pas d'heure de départ, ce qui le fait bouger. */
  readonly effet: string;
  /** Ses réglages, lus dans la table des réglages de mouvement. Vide : elle n'en a pas en propre. */
  readonly reglage: string;
}

export interface Enchainement {
  readonly titre: string;
  readonly lignes: readonly LigneDeTemps[];
}

/** En dessous de cette part de sa course, un dépassement ne se voit pas : la pièce s'arrête net. */
const DEPASSEMENT_VISIBLE = 0.005;

/** Le pas auquel on arrondit une durée, en ms, et les décimales qu'on lui garde quand elle passe la seconde. */
interface Arrondi {
  readonly ms: number;
  readonly decimales: number;
}
/** Une durée écrite dans la table se dit telle quelle. */
const TELLE_QUELLE: Arrondi = { ms: 1, decimales: 2 };
/** Une durée calculée se dit à 10 ms près : une arrivée est comptée à un seuil près, l'annoncer à la milliseconde serait promettre plus qu'on ne sait. */
const A_PEU_PRES: Arrondi = { ms: 10, decimales: 1 };
/** Un départ déduit d'une durée calculée : à 10 ms près lui aussi, et au centième quand il passe la seconde. */
const DEDUIT: Arrondi = { ms: 10, decimales: 2 };

/** En deçà de cet écart, en ms, un temps tombe sur une milliseconde entière : il a été écrit dans la table, pas calculé. */
const BRUIT_DE_CALCUL = 1e-6;

/** Une durée, en clair : en millisecondes sous la seconde, en secondes au-delà. */
function duree(secondes: number, arrondi: Arrondi = A_PEU_PRES): string {
  const ms = Math.round((secondes * 1000) / arrondi.ms) * arrondi.ms;
  return ms < 1000 ? remplir(L.durees.ms, { ms: ecrire(ms) }) : remplir(L.durees.s, { s: ecrire(ms / 1000, arrondi.decimales) });
}

const enPourCent = (part: number): string => ecrire(part * 100);
const tours = (degresParSeconde: number): string => ecrire(degresParSeconde / 6);

/** Le chapeau de la liste : il dit à quel seuil une pièce est tenue pour arrivée, celui-là même sur lequel ses temps sont comptés. */
export const chapeauDeLaListe = (): string => remplir(L.chapeau, { seuil: enPourCent(SEUIL_D_ARRIVEE) });

/** Ce qu'on dit sous un geste : comment la pièce y va, et ses réglages. */
type Comment = Pick<LigneDeTemps, 'effet' | 'reglage'>;

const reglageDuRessort = (r: Ressort): string =>
  remplir(L.reglages.ressort, { raideur: ecrire(r.raideur, 1), amortissement: ecrire(r.amortissement, 1), masse: ecrire(r.masse, 1) });

function commentVaLeRessort(r: Ressort): Comment {
  const depasse = depassement(r);
  const arrive = { duree: duree(tempsDArrivee(r)) };
  return {
    effet: depasse < DEPASSEMENT_VISIBLE ? remplir(L.effets.net, arrive) : remplir(L.effets.depasse, { ...arrive, part: enPourCent(depasse) }),
    reglage: reglageDuRessort(r),
  };
}

function commentVaLeVolant(v: Volant, effet: string): Comment {
  const reglage = remplir(L.reglages.volant, {
    couple: ecrire(v.moteur.couple),
    sec: ecrire(v.frottement.sec, 1),
    visqueux: ecrire(v.frottement.visqueux, 2),
  });
  return { effet, reglage };
}

function commentVaLaChute(a: Amortisseur, hauteur: number): Comment {
  // Ce qu'elle descend vraiment dans le temps annoncé : la phrase ne peut pas mentir sur la table.
  const temps = tempsDeDescente(a, hauteur);
  return {
    effet: remplir(L.effets.descend, { px: ecrire(descendre(a, temps).chemin, 1), duree: duree(temps) }),
    reglage: remplir(L.reglages.chute, { vitesse: ecrire(a.vitesse, 1), elan: ecrire(a.elan, 2) }),
  };
}

const reglageDeLaMain = (main: Ressort, suit: Ressort): string =>
  remplir(L.reglages.main, { main: reglageDuRessort(main), suit: reglageDuRessort(suit) });

const commentVaLePortage = (main: Ressort, suit: Ressort): Comment => ({
  effet: remplir(L.effets.porte, { pointe: duree(tempsDePointeDuPortage(main, suit)), duree: duree(tempsDArriveeDuPortage(main, suit)) }),
  reglage: reglageDeLaMain(main, suit),
});

/** Le disque qu'une main retourne : il arrive à plat au bout d'un temps qu'on connaît, et c'est le plateau qui l'arrête. */
const commentVaLeRetournement = (main: Ressort, suit: Ressort, aPlat: number): Comment => ({
  effet: remplir(L.effets.retourne, { pointe: duree(tempsDePointeDuPortage(main, suit)), duree: duree(aPlat) }),
  reglage: reglageDeLaMain(main, suit),
});

/** Un coup donné à une pièce : elle sursaute, et retombe par le ressort qu'elle suit à cet instant. */
const commentVaLeCoup = (r: Ressort): Comment => ({
  effet: remplir(L.effets.retombe, { duree: duree(tempsDeRetombee(r)) }),
  reglage: reglageDuRessort(r),
});

/** Ce qui porte un geste, en clair : le volant du plateau, une chute freinée, la main qui mène le disque ; sinon, le ressort de sa consigne. */
function commentVa(porte: Porteur | undefined, consigne: Ressort): Comment {
  if (porte === undefined) return commentVaLeRessort(consigne);
  switch (porte.genre) {
    case 'lancement':
      return commentVaLeVolant(
        porte.volant,
        remplir(L.effets.lance, { part: enPourCent(PART_DE_CROISIERE), duree: duree(tempsDeMiseEnVitesse(porte.volant)) }),
      );
    case 'frottement':
      return commentVaLeVolant(porte.volant, remplir(L.effets.arrete, { duree: duree(tempsPourRalentir(porte.volant, porte.volant.croisiere)) }));
    case 'chute':
      return commentVaLaChute(porte.amortisseur, porte.hauteur);
    case 'main':
      return commentVaLePortage(porte.main, porte.suit);
    case 'retournement':
      return commentVaLeRetournement(porte.main, porte.suit, porte.duree);
  }
}

/** Le temps qu'on rejoue avant un départ, puis après lui, pour mesurer ce qu'il fait à sa pièce, et le pas de cette mesure, en secondes. */
const MESURE = MINUTAGE.mesure;
/**
 * Ce dont une grandeur dépasse sa consigne après un départ, tel que le moteur le joue : le tassement d'une pièce qui se pose,
 * le sursaut que lui donne un coup. La liste des temps l'annonce ; elle ne le recopie pas.
 * @param coup vrai pour un coup : la pièce était sur sa consigne, et tout ce dont il l'en écarte compte. Sinon elle part de loin
 * vers sa nouvelle place, et seul compte ce dont elle la dépasse, de l'autre côté.
 */
function depassementJoue(partition: Partition<Grandeur>, grandeur: Grandeur, a: number, coup: boolean): number {
  const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
  moteur.poser(partition, a - MESURE.avant);
  for (let t = a - MESURE.avant + MESURE.pas; t < a; t += MESURE.pas) moteur.avancer(partition, t);
  moteur.avancer(partition, a);
  const cote = coup ? 0 : Math.sign(moteur.ecart(grandeur));
  let auPlus = 0;
  for (let t = a + MESURE.pas; t <= a + MESURE.apres; t += MESURE.pas) {
    moteur.avancer(partition, t);
    const ecart = moteur.ecart(grandeur);
    auPlus = Math.max(auPlus, coup ? Math.abs(ecart) : -cote * ecart);
  }
  return auPlus;
}

/** Ce qu'un départ a fait à sa pièce : de quoi le dire dans sa phrase. */
interface Joue {
  /** Ce dont la pièce dépasse sa consigne, ou sursaute, dans l'unité de sa grandeur. */
  readonly depasse: () => number;
}

/** Ce que la phrase d'un geste a besoin de savoir : lu dans la table des réglages de mouvement, ou mesuré sur ce que le moteur joue. */
const PRECISIONS: Partial<Record<NomDeGeste, (joue: Joue) => Readonly<Record<string, string>>>> = {
  kraftEntrainee: () => ({ px: ecrire(AMPLEURS.entrainementDuKraft) }),
  disqueSePose: ({ depasse }) => ({ px: ecrire(depasse()) }),
  brasSeLeve: () => ({ px: ecrire(AMPLEURS.brasLeve) }),
  diamantTouche: ({ depasse }) => ({ px: ecrire(depasse()) }),
  mainRecule: () => ({ degres: ecrire(AMPLEURS.rayure.recul) }),
  brasTressaute: ({ depasse }) => ({ px: ecrire(depasse()) }),
  regardGlisse: () => ({ px: ecrire(Math.abs(AMPLEURS.regardSurLaReponse)) }),
  disqueSeTasse: ({ depasse }) => ({ px: ecrire(depasse()) }),
};

/**
 * L'arrondi d'un départ. Un départ écrit dans la table tombe sur une milliseconde ronde, et se dit tel quel. Un départ qui se déduit
 * d'un autre mouvement (le bras qui commence à descendre, le disque qui retombe à plat) se dit à 10 ms près, comme le temps dont il vient :
 * la somme qu'on lit dans la liste est alors celle qu'on y ferait soi-même.
 */
const arrondiDUnDepart = (apres: number): Arrondi => (Math.abs(apres * 1000 - Math.round(apres * 1000)) < BRUIT_DE_CALCUL ? TELLE_QUELLE : DEDUIT);

/** Quand un geste part : tant après son signal ; ou tant avant lui, pour ce qui est compté à rebours. */
function quand(signal: Signal, apres: number): string {
  if (apres >= 0) return remplir(L.apres, { duree: duree(apres, arrondiDUnDepart(apres)) });
  const aRebours: Partial<Record<Signal, string>> = L.avant;
  const modele = aRebours[signal];
  if (modele === undefined) throw new Error(`La liste des temps ne sait pas dire un départ compté à rebours depuis « ${signal} ».`);
  return remplir(modele, { duree: duree(-apres, arrondiDUnDepart(apres)) });
}

const note = (
  { quoi, comment }: { readonly quoi: string; readonly comment: string },
  valeurs: Readonly<Record<string, string>> = {},
): LigneDeTemps => ({
  quand: '',
  quoi: remplir(quoi, valeurs),
  effet: remplir(comment, valeurs),
  reglage: '',
});

/** Un départ : un geste qui a un nom, compté depuis son signal. */
interface Depart {
  readonly signal: Signal;
  readonly apres: number;
  readonly ligne: LigneDeTemps;
}

/**
 * Les départs d'une piste : chaque geste qui a un nom, une seule fois (un disque qui sort de sa pochette bouge en long
 * et en large, et ne part qu'une fois ; trois rayures font trois fois les mêmes gestes).
 */
function departsDe(scene: PisteEnScene): Depart[] {
  const { roles, coups } = gestesDeLaPiste(scene);
  const partition = partitionDe(roles, coups);
  const gestes = GRANDEURS.flatMap((grandeur) =>
    roles[grandeur].etapes.map(({ a, signal, apres, nom, porte, consigne }) => ({
      a,
      grandeur,
      signal,
      apres,
      nom,
      coup: false,
      comment: () => commentVa(porte, consigne.matiere),
    })),
  );
  // Un coup ne change pas de consigne : il se résorbe par le ressort de celle que sa grandeur suit à cet instant.
  const donnes = coups.map(({ signal, apres, nom, grandeur, a }) => ({
    a,
    grandeur,
    signal,
    apres,
    nom,
    coup: true,
    comment: () => commentVaLeCoup(consigneDuRole(roles[grandeur], a).matiere),
  }));
  const vus = new Set<string>();
  const departs: Depart[] = [];
  for (const { a, grandeur, signal, apres, nom, coup, comment } of [...gestes, ...donnes]) {
    const cle = `${signal}/${apres}/${nom}`;
    if (nom === undefined || vus.has(cle)) continue;
    vus.add(cle);
    const precisions = PRECISIONS[nom]?.({ depasse: () => depassementJoue(partition, grandeur, a, coup) }) ?? {};
    departs.push({ signal, apres, ligne: { quand: quand(signal, apres), quoi: remplir(L.gestes[nom], precisions), ...comment() } });
  }
  return departs;
}

/**
 * @param scene une piste entière, avec au moins une rayure : c'est sur elle qu'on lit les gestes.
 * @returns les enchaînements de la piste, dans l'ordre où ils arrivent ; dans chacun, les départs du premier au dernier,
 * puis ce qui n'a pas d'heure de départ.
 */
export function listeDesTemps(scene: PisteEnScene): Enchainement[] {
  const departs = departsDe(scene);
  const E = AMPLEURS.etiquette;
  const seuils = {
    trainee: tours(E.trainee.parait.de),
    texte: tours(E.texte.de),
    efface: tours(E.texte.a),
    longs: tours(E.arcsLongs.a),
    ecart: ecrire(E.trainee.retard * 1000),
  };
  const N = L.notes;
  const enchainement = (signal: Signal, notes: readonly LigneDeTemps[] = []): Enchainement => ({
    titre: L.signaux[signal],
    lignes: [
      ...departs
        .filter((depart) => depart.signal === signal)
        .sort((a, b) => a.apres - b.apres)
        .map((depart) => depart.ligne),
      ...notes,
    ],
  });
  return [
    enchainement('trois'),
    enchainement('deux', [note(N.reperesDerivent), note(N.texteEnArcs, seuils)]),
    enchainement('un', [note(N.attente)]),
    enchainement('extrait', [note(N.aiguillesSursautent)]),
    {
      titre: L.pendantLExtrait,
      lignes: [note(N.chrono), note(N.ondulation, { degres: ecrire(AMPLEURS.ondulation, 1) }), note(N.secteurs), note(N.aiguillesDansent)],
    },
    enchainement('rayure', [note(N.aiguillesPic)]),
    enchainement('revelation', [note(N.arcsEnTexte, seuils)]),
    enchainement('arret'),
  ];
}
