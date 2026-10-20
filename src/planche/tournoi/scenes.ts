/**
 * Les images de la planche « Le tournoi » : les deux façons de le choisir sur la platine, son salon, un duel à ses moments (le premier,
 * le disque qui se retourne, le vote, la clôture, l'égalité, le forfait, qui arrive en cours), le tableau entre deux duels, le
 * palmarès et le tableau fini. Une partie d'exemple de seize titres, jouée par les règles du tournoi : la planche n'y écrit que
 * qui vote quoi. Les écrans sont ceux du jeu (scene/telephone/duel.ts, tableau.ts) ; seules les variantes de la platine sont faites ici.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { MODES } from '../../regles/modes';
import { codeDePartie, partieA, type EtatDeLaPartie, type EvenementDePartie } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { pochetteAuHasard } from '../../regles/pochette';
import { prochainDuel, type FaceDuDuel } from '../../regles/tournoi';
import { REGLAGES, TOURNOI } from '../../ressources/reglages';
import { TABLEE } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import type { Calque } from '../../scene/calque';
import { dessinerLeDisque } from '../../scene/disque';
import { POSE_DU_DUEL, type PoseDuDuel } from '../../scene/duel';
import { dessinerLeMeuble } from '../../scene/meuble';
import { dessinerLaPlatine, type EtatDesCommandes } from '../../scene/platine';
import type { EtatDInterrupteur } from '../../scene/platine/interrupteur';
import type { Encrier } from '../../scene/rendu/texte';
import { vueDuDuel, type DuelAuTelephone } from '../../scene/telephone/duel';
import { vueDesReglages, vueDuSalon } from '../../scene/telephone/ecrans';
import { disqueDeLAccueil, manetteDuMode, platineDeLAccueil } from '../../scene/telephone/meuble';
import { DENSITE, phrase, SUR_LA_PLATINE, toucheAuMilieu, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import { vueDuPalmares, vueDuTableau } from '../../scene/telephone/tableau';
import { joueursDExemple } from '../etape5/scenes';
import type { ImageDePlanche } from '../image';
import { LEGENDES_DU_TOURNOI as L } from './legendes.fr';

const T = TABLEE.telephone;

/** Les seize titres de l'exemple, dans l'ordre du tableau, chacun sa vignette. */
const titresDExemple = (): Reponse[] => L.titres.map((t) => ({ titre: t.titre, artiste: t.artiste, pochette: { vignette: t.vignette } }));

/** Un instant de la partie d'exemple : chaque duel a ses dix secondes, son ouverture au début, sa clôture au bout. */
const DUREE_D_UN_DUEL = 10;
const CLOTURE = 8;

/** Qui joue, dans l'ordre d'arrivée : toi (l'hôte) et cinq potes. */
const ids = (textes: Textes): string[] => joueursDExemple(textes).map((j) => j.id);

/**
 * Les votes d'un duel de l'exemple : quatre pour la face qui passe, deux pour l'autre, la minorité changeant d'un duel à l'autre ;
 * trois partout à l'égalité ; aucun au forfait.
 */
function votesDuDuel(textes: Textes, numero: number, gagnante: FaceDuDuel): Readonly<Record<string, FaceDuDuel>> {
  if (numero === L.forfait) return {};
  const autre: FaceDuDuel = gagnante === 'A' ? 'B' : 'A';
  const joueurs = ids(textes);
  const minorite = numero === L.egalite ? 3 : 2;
  return Object.fromEntries(joueurs.map((id, rang) => [id, (rang + numero) % joueurs.length < minorite ? autre : gagnante]));
}

/** Le journal de la room de l'exemple jusqu'au début de ce duel (ouvert, sans vote), ou jusqu'à la fin du tournoi (`Infinity`). */
export function journalJusquAuDuel(textes: Textes, numero: number): EvenementDePartie[] {
  const titres = titresDExemple();
  const journal: EvenementDePartie[] = [
    { genre: 'ouverture', a: -200, mode: 'tournoi', pistes: L.titres.length },
    ...joueursDExemple(textes).map(({ id, pochette }, rang): EvenementDePartie => ({ genre: 'arrivee', a: -190 + rang, id, pochette })),
  ];
  // Au premier lancer, le tableau entier, publié d'un coup.
  if (numero >= 0) journal.push({ genre: 'tableau', a: 0, titres });
  for (let n = 0; n <= numero; n++) {
    const t = partieA(journal, Infinity).tournoi;
    const p = t !== undefined ? prochainDuel(t) : undefined;
    if (p === undefined) break;
    const [haut, bas] = p.places;
    const [A, B] = [titres[haut], titres[bas]];
    if (A === undefined || B === undefined) break;
    const a = n * DUREE_D_UN_DUEL;
    journal.push({ genre: 'duel', a, faces: { A: { place: haut, reponse: A }, B: { place: bas, reponse: B } } });
    if (n === numero) break;
    const gagnante = (L.duels[n] ?? 'A') as FaceDuDuel;
    const votes = votesDuDuel(textes, n, gagnante);
    for (const [rang, [id, face]] of Object.entries(votes).entries()) journal.push({ genre: 'vote', a: a + 1 + rang / 2, id, face });
    const par = n === L.forfait ? 'forfait' : n === L.egalite ? 'pileOuFace' : 'voix';
    journal.push({ genre: 'cloture', a: a + CLOTURE, votes, gagnante, par });
  }
  return journal;
}

/** Le journal de l'exemple avec ce duel clos : celui d'avant son ouverture, puis lui, joué jusqu'au bout. */
const journalApresLeDuel = (textes: Textes, numero: number): EvenementDePartie[] =>
  journalJusquAuDuel(textes, numero + 1).filter((e) => e.genre !== 'duel' || e.a <= numero * DUREE_D_UN_DUEL);

/** Un écran du jeu, posé sur le meuble, avec son nom de fichier et son titre de planche. */
const ecran = (fichier: string, titre: string, { regard, objets }: VueDuTelephone): ImageDePlanche => ({
  fichier: `tournoi-${fichier}`,
  titre,
  regard,
  scene: dessinerLeMeuble({ regard, densite: DENSITE, objets }),
});

// ————— Choisir le tournoi —————

/** Les commandes réglées pour un tournoi : « Titres » gravé des tailles du tableau, sur seize ; la manette qu'on lui donne. */
function commandesDuTournoi(textes: Textes, manette: EtatDInterrupteur): EtatDesCommandes {
  const { commandes } = platineDeLAccueil(textes);
  const { choix, defaut } = TOURNOI.titres;
  return {
    boutons: { ...commandes.boutons, pistes: { ...commandes.boutons.pistes, crans: choix.map(String), choisi: choix.indexOf(defaut) } },
    interrupteurs: { mode: manette },
  };
}

/** La platine des réglages, son disque du logo sur le plateau, et ce qu'on y ajoute (un sélecteur). */
function platineDesReglages(a: Ecritoire, commandes: EtatDesCommandes, enPlus: readonly Calque[] = []): Calque[] {
  const disque = dessinerLeDisque(disqueDeLAccueil(a.textes, DENSITE, a.encrier.largeur), DENSITE);
  return [dessinerLaPlatine({ ...platineDeLAccueil(a.textes), commandes }, DENSITE, [disque.ombre, disque.disque]), ...enPlus];
}

/** L'écran des réglages d'une variante : la platine, ce que rapporte le tournoi, « Ouvrir le salon » et « Retour ». */
const reglages = (a: Ecritoire, platine: readonly Calque[]): VueDuTelephone => ({
  regard: SUR_LA_PLATINE,
  objets: [
    ...platine,
    ...phrase(a.textes.partie.bareme['tournoi'] ?? '', SUR_LA_PLATINE, a.encrier),
    toucheAuMilieu('touche-ouvrir', 'principale', a.textes.partie.ouvrirLeSalon, SUR_LA_PLATINE, T.reglages.ouvrir, a.encrier),
    toucheAuMilieu('touche-revenir', 'secondaire', a.textes.partie.retour, SUR_LA_PLATINE, T.reglages.retour, a.encrier),
  ],
});

/** Variante 1 : le tournoi prend la place de 1re note, en bas de la manette ; la manette se couche vers lui. */
function variantePlaceDeLaManette(a: Ecritoire): ImageDePlanche {
  const actuelle = manetteDuMode(a.textes, MODES.libre.cran);
  const [haut = '', gauche = '', droite = ''] = actuelle.positions;
  const manette: EtatDInterrupteur = { titre: '', positions: [haut, gauche, droite, a.textes.commandes.modes['tournoi'] ?? ''], choisie: 3 };
  return ecran('reglages-manette', L.images.reglagesManette, reglages(a, platineDesReglages(a, commandesDuTournoi(a.textes, manette))));
}

/**
 * Variante 2, celle du jeu : la manette garde ses quatre modes, qui ne servent qu'au blind test ; deux crans, sous la platine,
 * choisissent le jeu. Sur la platine elle-même, entre « Secondes » et la manette, un sélecteur n'avait pas la place de ses deux noms.
 */
function varianteSelecteur(a: Ecritoire): ImageDePlanche {
  const reglages = { pistes: TOURNOI.titres.defaut, extrait: REGLAGES.extrait.defaut, son: 'tous' as const };
  return ecran('reglages-selecteur', L.images.reglagesSelecteur, vueDesReglages(a, MODES.libre, reglages, 'tournoi'));
}

/** Le salon du tournoi, chez l'hôte : la kraft dit le tournoi et ses titres ; « Lancer le tournoi ». */
function salon(a: Ecritoire): ImageDePlanche {
  const journal = journalJusquAuDuel(a.textes, -1);
  const code = codeDePartie(hasard(L.graine).suivant);
  return ecran('salon', L.images.salon, vueDuSalon(a, partieA(journal, Infinity), code, 'hote'));
}

// ————— Un duel —————

/** Où en est la platine de ce téléphone, à chaque image : la face A qui joue, le disque qui se retourne, la face B qui joue. */
const POSES = {
  faceA: { ...POSE_DU_DUEL, avancement: 0.38 },
  retourne: { retourne: 112, enLAir: true, avancement: 0.38, brasLeve: true },
  faceB: { retourne: 180, enLAir: false, avancement: 0.16, brasLeve: false },
} as const satisfies Readonly<Record<string, PoseDuDuel>>;

/** Le deuxième quart de finale : celui du vote, de la clôture et du retardataire. */
const QUART = 9;

/** Un duel, tel que le voit ce joueur. */
const duel = (a: Ecritoire, fichier: string, titre: string, etat: EtatDeLaPartie, o: Omit<DuelAuTelephone, 'etat'>): ImageDePlanche =>
  ecran(fichier, titre, vueDuDuel(a, { etat, ...o }));

function imagesDuDuel(a: Ecritoire): ImageDePlanche[] {
  const premier = partieA(journalJusquAuDuel(a.textes, 0), Infinity);
  const ouvert = journalJusquAuDuel(a.textes, QUART);
  const debut = QUART * DUREE_D_UN_DUEL;
  // Au deuxième quart : toi vote B, deux potes votent A ; l'hôte, c'est toi.
  const enVote: EvenementDePartie[] = [
    ...ouvert,
    { genre: 'vote', a: debut + 2, id: 'toi', face: 'B' },
    { genre: 'vote', a: debut + 3, id: 'lady', face: 'A' },
    { genre: 'vote', a: debut + 4, id: 'dj', face: 'A' },
  ];
  const retardataire = {
    genre: 'arrivee',
    a: debut + 5,
    id: 'nouveau',
    pochette: pochetteAuHasard(hasard(L.retardataire).suivant, a.textes.pochette),
  } as const;
  return [
    duel(a, 'premier', L.images.premier, premier, { toi: 'toi', pose: POSES.faceA, aide: true }),
    duel(a, 'retourne', L.images.retourne, premier, { toi: 'toi', pose: POSES.retourne, aide: true }),
    duel(a, 'vote', L.images.vote, partieA(enVote, Infinity), { toi: 'toi', pose: POSES.faceB, monVote: 'B' }),
    duel(a, 'cloture', L.images.cloture, partieA(journalApresLeDuel(a.textes, QUART), Infinity), { toi: 'toi', pose: POSES.faceA }),
    duel(a, 'egalite', L.images.egalite, partieA(journalApresLeDuel(a.textes, L.egalite), Infinity), { toi: 'toi', pose: POSES.faceB }),
    duel(a, 'forfait', L.images.forfait, partieA(journalApresLeDuel(a.textes, L.forfait), Infinity), { toi: 'toi', pose: POSES.faceB }),
    duel(a, 'spectateur', L.images.spectateur, partieA([...enVote, retardataire], Infinity), { toi: 'nouveau', pose: POSES.faceA }),
  ];
}

// ————— Entre deux duels, et à la fin —————

function imagesDeLaFin(a: Ecritoire): ImageDePlanche[] {
  const apresLesQuarts = partieA(journalApresLeDuel(a.textes, L.forfait), Infinity);
  const fin = partieA(journalJusquAuDuel(a.textes, L.duels.length), Infinity);
  return [
    ecran('tableau', L.images.tableau, vueDuTableau(a, apresLesQuarts, 'toi')),
    ecran('palmares', L.images.palmares, vueDuPalmares(a, fin, 'toi')),
    ecran('tableau-fini', L.images.tableauFini, vueDuTableau(a, fin, 'toi', true)),
  ];
}

export interface ImagesDuTournoi {
  readonly choisir: readonly ImageDePlanche[];
  readonly duel: readonly ImageDePlanche[];
  readonly fin: readonly ImageDePlanche[];
}

export function imagesDuTournoi(textes: Textes, encrier: Encrier): ImagesDuTournoi {
  const a: Ecritoire = { textes, encrier };
  return {
    choisir: [variantePlaceDeLaManette(a), varianteSelecteur(a), salon(a)],
    duel: imagesDuDuel(a),
    fin: imagesDeLaFin(a),
  };
}

/** Toutes les images, à la file, pour les contrôles. */
export const toutesLesImagesDuTournoi = (textes: Textes, encrier: Encrier): ImageDePlanche[] =>
  Object.values(imagesDuTournoi(textes, encrier)).flat();
