/**
 * La tablée : les pochettes des joueurs posées sur le bois, chacune avec la tête que fait son joueur, côté dos si sa connexion est
 * tombée, et les pastilles collées dans son coin (« A », « T », « +2 », « Entrée »). Les places viennent de la tablée de l'écran,
 * ou de l'éventail ; ce module ne fait que les poser.
 */

import { surLEcran } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import { hitParade, type EtatDeLaPartie } from '../regles/partie';
import type { NomDExpression } from '../ressources/avatar';
import { GESTES } from '../ressources/mouvement';
import { PASTILLES } from '../ressources/pastilles';
import { MESURES_DE_POCHETTE, type Pochette } from '../ressources/pochettes';
import { TABLEE, type Place } from '../ressources/tablee';
import type { Textes } from '../ressources/textes';
import { calque, type Calque, type Mesure } from './calque';
import { surLeBois, type Regard } from './meuble';
import { dessinerUnePastille, faceEcrite, type Pastille } from './pastille';
import { dessinerLaPochette, type PochetteDessinee } from './pochette';
import { dessinerLeDosDUnePochette } from './pochette/dos';

export interface JoueurPose {
  readonly pochette: Pochette;
  readonly expression: NomDExpression;
  /** Ce qu'écrivent les pastilles collées sur sa pochette, de la première à la dernière : chacune se pose à cheval sur la précédente. */
  readonly pastilles?: readonly string[];
  /** Vrai si sa connexion est tombée : sa pochette est retournée, côté dos. */
  readonly dos?: boolean;
  /** En train de se retourner, de 0 (côté face) à 1 (côté dos) : elle se soulève, tourne sur elle-même, et montre son dos passé le milieu. */
  readonly retourne?: number;
  /** La dernière de ses pastilles, encore en l'air : un peu plus grande, un peu plus haut, avant de claquer. */
  readonly pastilleEnLAir?: { readonly hauteur: number; readonly echelle: number };
}

/** Une place de la tablée : son centre et son angle, sa taille si elle n'est pas celle de la tablée, et ce dont la pochette y est soulevée. */
export type PlaceDeLaTablee = Place & { readonly taille?: number; readonly leve?: number };

/** En deçà, une pochette vue de profil n'est plus qu'un fil : on la garde un peu plus large que ça. */
const PROFIL = 0.06;

/** Où et comment se colle une pastille : dans le coin bas-droit d'une pochette (en part du côté), son angle, et son rayon s'il est imposé. */
export interface CollageDePastille {
  readonly coin: readonly [number, number];
  readonly angle: number;
  readonly rayon?: number;
}

/** Les places d'un éventail de `n` pochettes, du premier au dernier, qui se serrent pour tenir entre ses bords. */
export function placesEnEventail(n: number, sansKraft = false): Place[] {
  const E = TABLEE.telephone.eventail;
  const a = sansKraft ? E.aSansKraft : E.a;
  const pas = n > 1 ? Math.min(E.pasAuPlus, (a - E.de) / (n - 1)) : 0;
  return Array.from({ length: n }, (_, rang) => ({
    en: [E.de + rang * pas, E.y + (rang % 2) * E.decalage] as const,
    angle: E.angles[rang % E.angles.length] ?? 0,
  }));
}

/**
 * Une pochette qui se retourne : elle tourne sur elle-même autour de son axe, et ne montre plus, vue d'en haut, qu'une part de sa largeur.
 * C'est une déformation de son calque et de son ombre, autour de son centre à l'écran : on ne redessine rien.
 */
function retournee(p: PochetteDessinee, centre: Vec2, part: number): PochetteDessinee {
  const largeur = Math.max(PROFIL, Math.abs(Math.cos(Math.PI * part)));
  const [x, y] = surLEcran(centre);
  const autour = (dedans: Calque, role: Calque['role']): Calque =>
    calque(`${dedans.nom}-retournee`, [dedans], {
      ...(role !== undefined ? { role } : {}),
      transformations: [
        { genre: 'glisser', de: [x, y] },
        { genre: 'deformer', par: [largeur, 0, 0, 1] },
        { genre: 'glisser', de: [-x, -y] },
      ],
    });
  return { ombre: autour(p.ombre, 'ombre'), pochette: autour(p.pochette, 'image') };
}

/** Un nombre s'écrit en titrage, comme un point marqué ; un mot, en technique étroit, sur une pastille un peu plus grande. */
const estUnNombre = (texte: string): boolean => /^[+–-]?\d+$/.test(texte) || [...texte].length === 1;

/**
 * Les pastilles collées dans le coin d'une pochette de la tablée, de la première à la dernière : chacune se pose à cheval sur la
 * précédente, un peu plus loin dans le coin. La dernière peut être encore en l'air. Elles suivent la pochette quand elle se soulève.
 * @param nom ce qui distingue la pochette : les pastilles s'appellent `pastille-${nom}-1`, `-2`…
 */
export function pastillesDUnePochette(
  textes: readonly string[],
  place: PlaceDeLaTablee,
  cote: number,
  regard: Regard,
  collage: CollageDePastille,
  mesurer: Mesure,
  nom: string,
  leve = 0,
  enLAir?: { readonly hauteur: number; readonly echelle: number },
): Pastille[] {
  return textes.map((texte, i) => {
    const nombre = estUnNombre(texte);
    const rayon = collage.rayon ?? (nombre ? PASTILLES.point.rayon : PASTILLES.mot.rayon);
    const [x, y] = [place.en[0] + collage.coin[0] * cote + i * rayon * 0.9, place.en[1] + collage.coin[1] * cote - i * rayon * 0.5];
    const enCore = i === textes.length - 1 ? enLAir : undefined;
    return {
      nom: `pastille-${nom}-${i + 1}`,
      en: surLeBois(regard, x, y),
      support: MESURES_DE_POCHETTE.tranche + leve,
      ...(enCore !== undefined ? { enLAir: enCore } : {}),
      angle: collage.angle + i * 14,
      rayon,
      faces: {
        ecrite: faceEcrite(
          texte,
          nombre ? 'titrage' : 'techniqueFort',
          rayon,
          nombre && rayon < PASTILLES.point.rayon ? 'mention' : 'titre',
          mesurer,
        ),
      },
      montre: 'ecrite',
    };
  });
}

/**
 * Les pochettes des joueurs, à leurs places, dans l'ordre : ombres et pochettes, puis les pastilles par-dessus.
 * @param nom ce qui distingue les calques de cette tablée de ceux d'une autre, sur le même meuble.
 */
export function dessinerLaTablee(
  joueurs: readonly JoueurPose[],
  places: readonly PlaceDeLaTablee[],
  taille: number,
  regard: Regard,
  collage: CollageDePastille,
  mesurer: Mesure,
  nom = 'joueur',
): Calque[] {
  if (joueurs.length > places.length) throw new Error(`${joueurs.length} joueurs pour ${places.length} places autour du meuble.`);
  const poses = joueurs.map((joueur, rang) => {
    const place = places[rang];
    if (place === undefined) throw new Error(`Pas de place pour le joueur ${rang + 1}.`);
    const cote = place.taille ?? taille;
    const retourne = joueur.retourne ?? 0;
    const leve = (place.leve ?? 0) + Math.sin(Math.PI * retourne) * GESTES.deconnexion.leve;
    const pose = {
      nom: `pochette-${nom}-${rang + 1}` as const,
      centre: surLeBois(regard, place.en[0], place.en[1]),
      angle: place.angle,
      taille: cote,
      leve,
    };
    const dos = (joueur.dos === true) !== retourne >= 1 / 2;
    const posee = dos
      ? dessinerLeDosDUnePochette(pose, joueur.pochette.artiste)
      : dessinerLaPochette(joueur.pochette, { ...pose, expression: joueur.expression }, mesurer);
    const pochette = retourne > 0 && retourne < 1 ? retournee(posee, pose.centre, retourne) : posee;
    // Une pastille qui vient de claquer ne descend jamais sous ce qui l'a reçue.
    const enLAir =
      joueur.pastilleEnLAir !== undefined ? { ...joueur.pastilleEnLAir, hauteur: Math.max(0, joueur.pastilleEnLAir.hauteur) } : undefined;
    const pastilles = pastillesDUnePochette(
      joueur.pastilles ?? [],
      place,
      cote,
      regard,
      collage,
      mesurer,
      `${nom}-${rang + 1}`,
      leve,
      enLAir,
    ).flatMap((pastille) => {
      const p = dessinerUnePastille(pastille);
      return [p.ombre, p.pastille];
    });
    return { pochette: [pochette.ombre, pochette.pochette], pastilles };
  });
  return [...poses.flatMap((p) => p.pochette), ...poses.flatMap((p) => p.pastilles)];
}

/**
 * Les joueurs d'un état, dans l'ordre du classement, tels qu'on les pose dans l'éventail : leur tête, leur dos si leur connexion est
 * tombée, et sur leur pochette ce qu'ils ont trouvé (« A », « T », « F »), ou les points que la piste leur a rapportés depuis l'état
 * d'avant, ou rien.
 */
export function eventail(etat: EtatDeLaPartie, textes: Textes, montrer: 'trouvailles' | 'points' | 'rien', avant?: EtatDeLaPartie): JoueurPose[] {
  const P = textes.partie;
  return hitParade(etat).map(({ joueur }): JoueurPose => {
    const trouve = etat.piste?.trouve[joueur.id] ?? [];
    const gagne = avant !== undefined ? joueur.points - (avant.joueurs.find((j) => j.id === joueur.id)?.points ?? 0) : 0;
    const pastilles =
      montrer === 'trouvailles'
        ? trouve.flatMap((p) => (p === 'artiste' ? [P.aTrouveLArtiste] : p === 'feat' ? [P.aTrouveLeFeat] : [P.aTrouveLeTitre]))
        : montrer === 'points' && gagne > 0
          ? [`+${gagne}`]
          : [];
    return { pochette: joueur.pochette, expression: joueur.expression, pastilles, dos: !joueur.connecte };
  });
}
