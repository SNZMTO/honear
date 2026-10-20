/**
 * Un duel du tournoi, au téléphone : la platine et son disque à deux faces (voir scene/duel.ts), et sous elle, ce qu'on y pose : le
 * papier du tour, qui dit aussi qui a voté ; l'éventail des pochettes, une pastille sur celles qui ont voté (jamais pour quelle face) ;
 * l'aide du premier duel, ou la phrase d'un état ; les deux étiquettes des faces, celle qu'on a votée enfoncée en kraft ; chez l'hôte,
 * la touche qui clôt le duel sans attendre. À la clôture, chacun passe sous la face qu'il a votée, et chaque face dit ses voix.
 */

import type { EtatDeLaPartie, Joueur } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import {
  FACES_DU_DUEL,
  placeDuDuel,
  quiVotent,
  toutLeMondeAVote,
  voix,
  type DuelClos,
  type DuelEnCours,
  type FaceDuDuel,
} from '../../regles/tournoi';
import { PASTILLES } from '../../ressources/pastilles';
import { TOURNOI } from '../../ressources/reglages';
import { TABLEE, type Place } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import type { Calque } from '../calque';
import { dessinerLeDuel, REGARD_DU_DUEL, type DecorDuDuel, type PoseDuDuel } from '../duel';
import { remplir } from '../phrases';
import { dessinerLaTablee, type JoueurPose, type PlaceDeLaTablee } from '../tablee';
import { platineDeLAccueil } from './meuble';
import { dansLeRegard, DENSITE, interprete, papier, pastilleCollee, phrase, toucheAuBord, type Ecritoire, type VueDuTelephone } from './pieces';

const T = TABLEE.telephone;
const D = T.duel;

/** La pastille de qui a voté : rien d'écrit, un rond miel, jamais pour quelle face ; le papier du tour dit combien ont voté. */
const A_VOTE = '';

/** Ce qu'un téléphone sait d'un duel, à un instant. */
export interface DuelAuTelephone {
  /** La room à cet instant : son tournoi (le duel qui se joue, ou le dernier clos), ses joueurs. */
  readonly etat: EtatDeLaPartie;
  /** Le joueur qui tient ce téléphone. */
  readonly toi: string;
  /** La platine de ce téléphone : chacun retourne son disque et l'écoute à son rythme. */
  readonly pose: PoseDuDuel;
  /** La face pour laquelle ce téléphone a voté : il le sait, le serveur ne le dit à personne avant la clôture. */
  readonly monVote?: FaceDuDuel;
  /** Vrai au premier duel : on dit comment écouter l'autre face. */
  readonly aide?: boolean;
  /** Ce qui se passe, à la place de l'aide : la connexion perdue… */
  readonly phrase?: string;
}

/** Le décor d'un duel : la platine de l'accueil, le bouton « Titres » gravé des tailles du tableau, sur celle de la room. */
export function decorDuDuel(textes: Textes, titres: number): DecorDuDuel {
  const { commandes, marque } = platineDeLAccueil(textes);
  const { choix } = TOURNOI.titres;
  const pistes = { ...commandes.boutons.pistes, crans: choix.map(String), choisi: Math.max(0, choix.indexOf(titres as (typeof choix)[number])) };
  return { marque, commandes: { ...commandes, boutons: { ...commandes.boutons, pistes } } };
}

/** Le duel dont parle l'écran : celui qui se joue, sinon le dernier qu'on a clos ; et son rang dans l'ordre de jeu. */
function duelMontre(etat: EtatDeLaPartie): { readonly duel: DuelEnCours | DuelClos; readonly numero: number } | undefined {
  const t = etat.tournoi;
  if (t === undefined) return undefined;
  if (t.enCours !== undefined) return { duel: t.enCours, numero: t.clos.length };
  const dernier = t.clos[t.clos.length - 1];
  return dernier !== undefined ? { duel: dernier, numero: t.clos.length - 1 } : undefined;
}

const estClos = (duel: DuelEnCours | DuelClos): duel is DuelClos => 'gagnante' in duel;

/** Le nom d'un tour, d'après son nombre de duels : la finale en a un, les demies deux, les quarts quatre… */
export function nomDuTour(textes: Textes, duels: number): string {
  const rang = Math.round(Math.log2(Math.max(1, duels)));
  return textes.tournoi.tours[Math.min(rang, textes.tournoi.tours.length - 1)] ?? '';
}

/** Ce que dit le papier du tour : le tour, le rang du duel dans son tour ; et combien ont voté, sur combien. */
function lignesDuTour(textes: Textes, etat: EtatDeLaPartie, duel: DuelEnCours | DuelClos, numero: number): [string, string] {
  const titres = etat.tournoi?.titres ?? 0;
  const ou = placeDuDuel(titres, numero);
  const tour = remplir(textes.tournoi.duel, { tour: nomDuTour(textes, ou?.duels ?? 1), numero: (ou?.rang ?? 0) + 1, sur: ou?.duels ?? 1 });
  const votants = estClos(duel) ? Object.keys(duel.votes).length : duel.votants.length;
  const joueurs = estClos(duel) ? Math.max(votants, quiVotent(etat.joueurs).length) : quiVotent(etat.joueurs).length;
  return [tour, remplir(textes.tournoi.ontVote, { n: votants, sur: joueurs })];
}

/** Ce que dit la phrase de la clôture : qui passe, et comment. */
function phraseDeLaCloture(textes: Textes, duel: DuelClos): string {
  const gagnant = duel.faces[duel.gagnante].reponse;
  const perdant = duel.faces[duel.gagnante === 'A' ? 'B' : 'A'].reponse;
  if (duel.par === 'forfait') return remplir(textes.tournoi.forfait, { titre: perdant.titre });
  if (duel.par === 'pileOuFace') return remplir(textes.tournoi.egalite, { face: textes.tournoi.faces[duel.gagnante] });
  return remplir(textes.tournoi.passe, { titre: gagnant.titre });
}

/** La pose d'un joueur dans l'éventail : sa tête, son dos si sa ligne est tombée, et « Voté » s'il a voté. */
const poseDuJoueur = (joueur: Joueur, pastilles: readonly string[]): JoueurPose => ({
  pochette: joueur.pochette,
  expression: joueur.expression,
  pastilles,
  dos: !joueur.connecte,
});

/** Les places d'un éventail de n pochettes entre deux bords, à cette hauteur : elles se serrent pour tenir. */
function placesEntre(n: number, de: number, a: number, y: number, pasAuPlus: number, angles: readonly number[], decalage = 0): Place[] {
  const pas = n > 1 ? Math.min(pasAuPlus, (a - de) / (n - 1)) : 0;
  const debut = n > 1 ? (de + a) / 2 - ((n - 1) * pas) / 2 : (de + a) / 2;
  return Array.from({ length: n }, (_, rang) => ({
    en: [debut + rang * pas, y + (rang % 2) * decalage] as const,
    angle: angles[rang % angles.length] ?? 0,
  }));
}

/** Les deux étiquettes des faces, côte à côte : le titre et l'interprète, la lettre de la face collée sur le coin ; à la clôture, ses voix. */
function etiquettesDesFaces(
  a: Ecritoire,
  faces: Readonly<Record<FaceDuDuel, Reponse>>,
  monVote: FaceDuDuel | undefined,
  clos: DuelClos | undefined,
): Calque[] {
  const r = REGARD_DU_DUEL;
  const F = D.faces;
  const touchee = T.choix.touchee;
  // Les voix de chaque face, à la clôture : il n'y en a pas quand l'une a gagné par forfait.
  const comptes = clos !== undefined && clos.par !== 'forfait' ? voix(clos.votes) : undefined;
  return FACES_DU_DUEL.flatMap((face, rang) => {
    const reponse = faces[face];
    // Celle qu'on a votée s'enfonce, comme une étiquette touchée au 4 choix : plaquée à plat, dans un papier plus sombre.
    const enfoncee = clos === undefined && monVote === face;
    const etiquette = papier(
      `etiquette-face-${face}`,
      r,
      [F.x[rang] ?? 0, F.y + (enfoncee ? touchee.enfonce : 0)],
      F.largeur,
      enfoncee ? 0 : (F.angles[rang] ?? 0),
      [
        { contenu: reponse.titre, role: 'techniqueFort', auPlus: 'mention' },
        { contenu: interprete(a.textes, reponse), role: 'technique', auPlus: 'mention' },
      ],
      a.encrier,
      { role: 'mobile', auMoins: F.largeur, ...(enfoncee ? { teinte: touchee.teinte, plaque: true } : {}) },
    );
    const [mx, my] = dansLeRegard(r, etiquette.milieu);
    const haut = dansLeRegard(r, [etiquette.milieu[0], etiquette.haut])[1];
    const lettre = pastilleCollee(
      `pastille-face-${face}`,
      a.textes.tournoi.faces[face],
      r,
      [mx + F.lettre.coin[0] * etiquette.largeur, haut + F.lettre.coin[1]],
      F.lettre.angle,
      a.encrier,
      PASTILLES.point.rayon,
    );
    const lesVoix =
      comptes !== undefined
        ? pastilleCollee(
            `pastille-voix-${face}`,
            remplir(a.textes.tournoi.voix, { n: comptes[face] }),
            r,
            [mx + F.voix.coin * etiquette.largeur, 2 * my - haut + F.voix.sous],
            F.voix.angle,
            a.encrier,
          )
        : [];
    return [...etiquette.calques, ...lettre, ...lesVoix];
  });
}

/** À la clôture, chacun sous la face qu'il a votée : ses pochettes, plus petites, serrées dans la colonne de cette face. */
function votesSousLesFaces(a: Ecritoire, etat: EtatDeLaPartie, clos: DuelClos): Calque[] {
  const V = D.votes;
  const F = D.faces;
  return FACES_DU_DUEL.flatMap((face, rang) => {
    const pour = etat.joueurs.filter((j) => clos.votes[j.id] === face);
    const x = F.x[rang] ?? 0;
    const places: PlaceDeLaTablee[] = placesEntre(
      pour.length,
      x - F.largeur / 2 + V.taille / 2,
      x + F.largeur / 2 - V.taille / 2,
      V.y,
      V.pasAuPlus,
      V.angles,
    );
    return dessinerLaTablee(
      pour.map((j) => poseDuJoueur(j, [])),
      places,
      V.taille,
      REGARD_DU_DUEL,
      T.trouve,
      a.encrier.largeur,
      `vote-${face}`,
    );
  });
}

/** L'écran d'un duel, au téléphone. */
export function vueDuDuel(a: Ecritoire, o: DuelAuTelephone): VueDuTelephone {
  const r = REGARD_DU_DUEL;
  const montre = duelMontre(o.etat);
  if (montre === undefined) throw new Error('Pas de duel à montrer : le tournoi n’a pas commencé.');
  const { duel, numero } = montre;
  const clos = estClos(duel) ? duel : undefined;
  const faces = { A: duel.faces.A.reponse, B: duel.faces.B.reponse };
  const [tour, ontVote] = lignesDuTour(a.textes, o.etat, duel, numero);
  const papierDuTour = papier(
    'etiquette-tour',
    r,
    D.tour.en,
    D.tour.largeur,
    D.tour.angle,
    [
      { contenu: tour, role: 'titrage', auPlus: 'intertitre' },
      { contenu: ontVote, role: 'technique', auPlus: 'mention' },
    ],
    a.encrier,
    { ancre: 'debut', alignement: 'debut' },
  ).calques;
  const moi = o.etat.joueurs.find((j) => j.id === o.toi);
  // Pendant le duel, l'éventail : une pastille sur qui a voté, jamais pour quoi. À la clôture, chacun passe sous sa face.
  const votants = clos === undefined ? (o.etat.tournoi?.enCours?.votants ?? []) : [];
  const E = D.eventail;
  const eventail =
    clos === undefined
      ? dessinerLaTablee(
          o.etat.joueurs.map((j) => poseDuJoueur(j, votants.includes(j.id) ? [A_VOTE] : [])),
          placesEntre(o.etat.joueurs.length, E.de, E.a, E.y, T.eventail.pasAuPlus, T.eventail.angles, T.eventail.decalage),
          T.eventail.taille,
          r,
          T.trouve,
          a.encrier.largeur,
        )
      : votesSousLesFaces(a, o.etat, clos);
  const dite =
    o.phrase ??
    (moi?.spectateur === true ? a.textes.tournoi.spectateur : undefined) ??
    (clos !== undefined ? phraseDeLaCloture(a.textes, clos) : undefined) ??
    (o.aide === true ? a.textes.tournoi.aide : undefined);
  const enCours = o.etat.tournoi?.enCours;
  // L'hôte clôt le duel sans attendre ceux qui n'ont pas voté : il faut qu'un au moins ait voté.
  const clore =
    enCours !== undefined && o.etat.hote === o.toi && enCours.votants.length > 0 && !toutLeMondeAVote(enCours, quiVotent(o.etat.joueurs))
      ? [toucheAuBord('touche-clore', 'secondaire', a.textes.tournoi.touches.clore, r, D.clore, a.encrier)]
      : [];
  return {
    regard: r,
    objets: [
      dessinerLeDuel(decorDuDuel(a.textes, o.etat.tournoi?.titres ?? o.etat.pistes), faces, o.pose, a.encrier.largeur, DENSITE),
      ...papierDuTour,
      ...eventail,
      ...(dite !== undefined ? phrase(dite, r, a.encrier) : []),
      ...etiquettesDesFaces(a, faces, o.monVote, clos),
      ...clore,
    ],
  };
}
