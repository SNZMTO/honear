/**
 * Le tournoi : le tableau (qui rencontre qui, tour après tour), les titres qu'une playlist y met (chacun une fois), l'issue d'un
 * duel (la majorité, l'égalité à pile ou face), l'oreille de la room ; puis, contre le serveur, des tournois de bout en bout :
 * chacun vote sans voir les votes des autres, la clôture les révèle, l'hôte clôt sans attendre, une ligne qui tombe ne retient pas
 * le duel, les extraits se relisent, une piste qui ne se joue plus perd par forfait, une revanche prend d'autres titres.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import { lireUneAction, publier, type Action, type Connexion, type ExtraitsDuDuel, type Nouvelle } from '../src/regles/messages';
import type { CleDeMode, PisteDuMode } from '../src/regles/modes';
import { partieA, type EtatDeLaPartie, type EvenementDePartie } from '../src/regles/partie';
import {
  disqueDOr,
  duelsDuTableau,
  issueAuxVoix,
  memeTitre,
  oreillesDeLaRoom,
  placeDuDuel,
  prochainDuel,
  tailleDuTableau,
  titresDifferents,
  titresDuTableau,
  type DuelClos,
  type DuelEnCours,
  type Engage,
  type FaceDuDuel,
} from '../src/regles/tournoi';
import { TOURNOI } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import type { FaitDuJeu } from '../src/serveur/faits';
import { demarrerLeServeur } from '../src/serveur/serveur';

const POCHETTE = pochetteDExemple(TEXTES);
const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;

/** Un titre de playlist, tel que Deezer le donnerait : son identifiant, son extrait. */
const titre = (n: number, artiste = `Artiste ${n}`, nom = `Titre ${n}`, version = 1): PisteDuMode => ({
  reponse: { titre: nom, artiste, pochette: vignette },
  extrait: `https://extraits.test/${1000 + n}.mp3?v=${version}`,
  deezer: 1000 + n,
});
const playlist = (combien: number, version = 1): PisteDuMode[] => Array.from({ length: combien }, (_, n) => titre(n, undefined, undefined, version));

const engage = (place: number): Engage => ({ place, reponse: titre(place).reponse });
const duelClos = ([haut, bas]: readonly [number, number], gagnante: FaceDuDuel, votes: Readonly<Record<string, FaceDuDuel>> = {}): DuelClos => ({
  a: 0,
  closA: 1,
  faces: { A: engage(haut), B: engage(bas) },
  votes,
  gagnante,
  par: 'voix',
});

test('le tableau : 8 titres font 7 duels, en quarts, demies et finale ; le gagnant d’en haut rencontre celui d’en bas', () => {
  assert.equal(duelsDuTableau(8), 7);
  assert.equal(duelsDuTableau(32), 31);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((n) => placeDuDuel(8, n)),
    [
      { tour: 0, rang: 0, duels: 4 },
      { tour: 0, rang: 1, duels: 4 },
      { tour: 0, rang: 2, duels: 4 },
      { tour: 0, rang: 3, duels: 4 },
      { tour: 1, rang: 0, duels: 2 },
      { tour: 1, rang: 1, duels: 2 },
      { tour: 2, rang: 0, duels: 1 },
    ],
  );
  assert.equal(placeDuDuel(8, 7), undefined, 'rien après la finale');
  assert.deepEqual(placeDuDuel(32, 30), { tour: 4, rang: 0, duels: 1 }, 'la finale d’un tableau de 32');
  // Le tableau joué jusqu'au bout, la face B gagnant chaque fois.
  let clos: DuelClos[] = [];
  const rencontres: (readonly [number, number])[] = [];
  for (let p = prochainDuel({ titres: 8, clos }); p !== undefined; p = prochainDuel({ titres: 8, clos })) {
    rencontres.push(p.places);
    clos = [...clos, duelClos(p.places, 'B')];
  }
  assert.deepEqual(rencontres, [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
    [1, 3],
    [5, 7],
    [3, 7],
  ]);
  assert.equal(disqueDOr({ titres: 8, clos })?.place, 7);
  assert.equal(disqueDOr({ titres: 8, clos: clos.slice(0, 6) }), undefined, 'pas de disque d’or avant la finale');
});

test('une playlist met chaque titre une fois au tableau : un live, un feat de plus ne font pas un titre de plus ; une revanche en prend d’autres', () => {
  const pistes = [
    titre(1, 'Daft Punk', 'One More Time'),
    titre(2, 'Daft Punk', 'One More Time (Live)'),
    titre(3, 'Angèle', 'Tout oublier (feat. Roméo Elvis)'),
    titre(4, 'ANGELE', 'Tout oublier'),
    ...Array.from({ length: 8 }, (_, i) => titre(10 + i)),
  ];
  assert.deepEqual(
    titresDifferents(pistes).map((p) => p.deezer),
    [1001, 1003, ...Array.from({ length: 8 }, (_, i) => 1010 + i)],
  );
  // Le tableau qu'on a réglé, si la playlist le remplit ; sinon le plus grand qu'elle remplit ; sous huit titres différents, aucun.
  assert.equal(tailleDuTableau(pistes, 16), 8);
  assert.equal(tailleDuTableau(playlist(20), 16), 16);
  assert.equal(tailleDuTableau(playlist(40), 32), 32);
  assert.equal(tailleDuTableau(pistes.slice(0, 9), 8), undefined, 'sept titres différents : pas de tableau');
  // Une revanche prend d'abord ce qui n'a pas encore été au tableau, puis, s'il n'y en a plus assez, ce qui y a été.
  const vingt = playlist(20);
  const premier = titresDuTableau(vingt, 8, new Set());
  const revanche = titresDuTableau(vingt, 8, new Set(premier.map(memeTitre)));
  assert.ok(revanche.every((p) => !premier.includes(p)));
  const belle = titresDuTableau(vingt, 8, new Set([...premier, ...revanche].map(memeTitre)));
  assert.deepEqual(
    belle.map((p) => p.deezer),
    [1016, 1017, 1018, 1019, 1000, 1001, 1002, 1003],
  );
});

test('l’issue d’un duel : la majorité passe ; à égalité, même à zéro, le disque est lancé comme une pièce', () => {
  assert.deepEqual(
    issueAuxVoix({ toi: 'A', lady: 'B', dj: 'A' }, () => 0),
    { votes: { toi: 'A', lady: 'B', dj: 'A' }, gagnante: 'A', par: 'voix' },
  );
  assert.equal(issueAuxVoix({ toi: 'B' }, () => 0).gagnante, 'B');
  assert.deepEqual(
    issueAuxVoix({ toi: 'A', lady: 'B' }, () => 0.1),
    { votes: { toi: 'A', lady: 'B' }, gagnante: 'A', par: 'pileOuFace' },
  );
  assert.equal(issueAuxVoix({ toi: 'A', lady: 'B' }, () => 0.9).gagnante, 'B');
  const graine = hasard(5);
  assert.deepEqual([...new Set(Array.from({ length: 20 }, () => issueAuxVoix({}, graine.suivant).gagnante))].sort(), ['A', 'B']);
});

test('l’oreille de la room : qui a le plus souvent voté comme la majorité ; une égalité ou un forfait ne comptent pas', () => {
  const clos: DuelClos[] = [
    duelClos([0, 1], 'A', { toi: 'A', lady: 'A', dj: 'B' }),
    duelClos([2, 3], 'B', { toi: 'B', lady: 'A', dj: 'A' }),
    { ...duelClos([4, 5], 'A', { toi: 'A', lady: 'B' }), par: 'pileOuFace' },
    { ...duelClos([6, 7], 'B'), par: 'forfait' },
  ];
  assert.deepEqual(oreillesDeLaRoom(clos, ['dj', 'lady', 'toi', 'baron']), [
    { id: 'toi', justes: 2, votes: 2, rang: 1 },
    { id: 'lady', justes: 1, votes: 2, rang: 2 },
    { id: 'dj', justes: 0, votes: 2, rang: 3 },
    { id: 'baron', justes: 0, votes: 0, rang: 3 },
  ]);
});

const ouverture = (titres = 8): EvenementDePartie => ({ genre: 'ouverture', a: -1, mode: 'tournoi', pistes: titres });
const arrivee = (a: number, id: string): EvenementDePartie => ({ genre: 'arrivee', a, id, pochette: POCHETTE });
const duel = (a: number, haut: number, bas: number): EvenementDePartie => ({ genre: 'duel', a, faces: { A: engage(haut), B: engage(bas) } });
const vote = (a: number, id: string, face: FaceDuDuel): EvenementDePartie => ({ genre: 'vote', a, id, face });

test('au journal : un duel ouvert, des votes dont la face ne sort pas avant la clôture, qui les révèle ; les têtes suivent', () => {
  const journal: EvenementDePartie[] = [
    ouverture(),
    ...['toi', 'lady', 'dj', 'baron'].map((id, rang) => arrivee(rang, id)),
    duel(10, 0, 1),
    arrivee(11, 'retard'),
    vote(12, 'toi', 'A'),
    vote(13, 'lady', 'B'),
    vote(14, 'toi', 'B'),
    vote(15, 'dj', 'A'),
    vote(16, 'retard', 'A'),
  ];
  const enCours = partieA(journal, Infinity);
  assert.equal(enCours.phase, 'pistes');
  assert.deepEqual(enCours.tournoi?.enCours?.votants, ['toi', 'lady', 'dj'], 'qui change d’avis ne vote pas deux fois ; qui arrive en cours regarde');
  assert.deepEqual(enCours.tournoi?.enCours?.votes, { toi: 'B', lady: 'B', dj: 'A' });
  assert.equal(enCours.joueurs.find((j) => j.id === 'retard')?.spectateur, true);
  assert.ok(
    enCours.joueurs.filter((j) => !j.spectateur).every((j) => j.expression === 'concentre'),
    'chacun écoute',
  );
  // Publié : un vote par joueur, sans sa face ; le téléphone sait qui a voté, pas pour quoi.
  const publie = publier(journal);
  assert.deepEqual(
    publie.filter((e) => e.genre === 'vote'),
    [
      { genre: 'vote', a: 12, id: 'toi' },
      { genre: 'vote', a: 13, id: 'lady' },
      { genre: 'vote', a: 15, id: 'dj' },
    ],
  );
  assert.deepEqual(partieA(publie, Infinity).tournoi?.enCours?.votes, {});
  // La clôture révèle les votes : content si sa face passe, dépité sinon, endormi sans avoir voté ; qui regardait ne bouge pas.
  const clos: EvenementDePartie[] = [...journal, { genre: 'cloture', a: 20, votes: { toi: 'B', lady: 'B', dj: 'A' }, gagnante: 'B', par: 'voix' }];
  for (const vu of [partieA(clos, Infinity), partieA(publier(clos), Infinity)]) {
    assert.deepEqual(Object.fromEntries(vu.joueurs.map((j) => [j.id, j.expression])), {
      toi: 'content',
      lady: 'content',
      dj: 'depite',
      baron: 'endormi',
      retard: 'content',
    });
    assert.deepEqual(vu.tournoi?.clos[0]?.votes, { toi: 'B', lady: 'B', dj: 'A' });
    assert.equal(vu.tournoi?.enCours, undefined);
    assert.equal(vu.pistesJouees, 1);
  }
  // Au duel suivant, qui regardait vote ; qui s'en va pour de bon ne compte plus.
  const ensuite = partieA(
    [...clos, duel(30, 2, 3), vote(31, 'retard', 'A'), vote(32, 'lady', 'B'), { genre: 'depart', a: 33, id: 'lady' }],
    Infinity,
  );
  assert.deepEqual(ensuite.tournoi?.enCours?.votants, ['retard']);
  assert.deepEqual(ensuite.tournoi?.enCours?.votes, { retard: 'A' });
});

test('au journal : la finale close, la partie est finie ; plus aucun duel ne s’ouvre', () => {
  const journal: EvenementDePartie[] = [ouverture(), arrivee(0, 'toi')];
  let clos = 0;
  for (let p = prochainDuel(partieA(journal, Infinity).tournoi ?? { titres: 0, clos: [] }); p !== undefined; clos++) {
    journal.push(duel(10 * (clos + 1), ...p.places), vote(10 * (clos + 1) + 1, 'toi', 'A'));
    journal.push({ genre: 'cloture', a: 10 * (clos + 1) + 2, votes: { toi: 'A' }, gagnante: 'A', par: 'voix' });
    p = prochainDuel(partieA(journal, Infinity).tournoi ?? { titres: 0, clos: [] });
  }
  const fin = partieA(journal, Infinity);
  assert.equal(clos, 7);
  assert.equal(fin.phase, 'fin');
  assert.equal(fin.tournoi !== undefined ? disqueDOr(fin.tournoi)?.place : undefined, 0, 'la face A a toujours gagné : la place 0');
  assert.deepEqual(partieA([...journal, duel(200, 0, 1)], Infinity).tournoi?.enCours, undefined);
  assert.ok(
    fin.joueurs.every((j) => j.points === 0),
    'pas de points au tournoi',
  );
});

test('ce qu’un téléphone envoie : un vote pour A ou B ; un tournoi de 8, 16 ou 32 titres, pas un blind test de 32', () => {
  assert.deepEqual(lireUneAction({ genre: 'voter', face: 'B' }), { genre: 'voter', face: 'B' });
  assert.equal(lireUneAction({ genre: 'voter', face: 'C' }), undefined);
  assert.deepEqual(lireUneAction({ genre: 'clore', pour: 'rien' }), { genre: 'clore' });
  const creer = { genre: 'creer', mode: 'tournoi', extrait: 20, son: 'tous', playlist: 'bac', pochette: POCHETTE };
  for (const pistes of TOURNOI.titres.choix) assert.equal(lireUneAction({ ...creer, pistes })?.genre, 'creer');
  assert.equal(lireUneAction({ ...creer, pistes: 12 }), undefined);
  assert.equal(lireUneAction({ ...creer, mode: 'libre', pistes: 32 }), undefined);
});

/** Un téléphone : il rejoue ce qu'on lui envoie, comme le ferait l'écran, et garde les extraits du duel. */
interface Telephone {
  readonly connexion: Connexion;
  readonly recu: Nouvelle[];
  journal: EvenementDePartie[];
  extraits: ExtraitsDuDuel | undefined;
  toi: string;
  jeton: string;
  code: string;
}

function monde(pistes: () => readonly PisteDuMode[] | undefined) {
  let heure = 0;
  let jetons = 0;
  const faits: FaitDuJeu[] = [];
  const finies: EtatDeLaPartie[] = [];
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(11).suivant,
    jeton: () => `jeton-${++jetons}`,
    playlist: (lien) => (lien === 'bac' ? pistes() : undefined),
    raconter: (fait) => faits.push(fait),
    quandUneFaceFinit: (_code, etat) => finies.push(etat),
  });
  const telephone = (): Telephone => {
    const t: Telephone = { connexion: undefined as unknown as Connexion, recu: [], journal: [], extraits: undefined, toi: '', jeton: '', code: '' };
    Object.assign(t, {
      connexion: serveur.connecter((n) => {
        t.recu.push(n);
        if (n.genre === 'etat') Object.assign(t, { journal: [...n.journal], toi: n.toi, jeton: n.jeton, code: n.code, extraits: n.extraits });
        if (n.genre === 'evenement') t.journal.push(n.evenement);
        if (n.genre === 'extraits') t.extraits = { duel: n.duel, faces: n.faces, duree: n.duree };
      }),
    });
    return t;
  };
  const a = (t: number): void => {
    heure = t;
    serveur.avancer();
  };
  return { serveur, telephone, a, faits, finies };
}

const creerLeTournoi = (pistes = 8, mode: CleDeMode = 'tournoi'): Action => ({
  genre: 'creer',
  mode,
  pistes,
  extrait: 20,
  son: 'tous',
  playlist: 'bac',
  pochette: POCHETTE,
});
const vu = (t: Telephone): EtatDeLaPartie => partieA(t.journal, Infinity);
type Cloture = Extract<EvenementDePartie, { genre: 'cloture' }>;
const clotures = (t: Telephone): Cloture[] => t.journal.filter((e): e is Cloture => e.genre === 'cloture');

/** Une room en tournoi, l'hôte et des invités dedans. */
function tablee(m: ReturnType<typeof monde>, invites: number, pistes = 8): Telephone[] {
  const hote = m.telephone();
  hote.connexion.envoyer(creerLeTournoi(pistes));
  const autres = Array.from({ length: invites }, () => m.telephone());
  for (const t of autres) t.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  return [hote, ...autres];
}

test('un tournoi de bout en bout : sept duels, chacun vote sans voir les autres, la clôture révèle tout, jusqu’au disque d’or', () => {
  const m = monde(() => playlist(12));
  const [hote, invite] = tablee(m, 1);
  assert.ok(hote !== undefined && invite !== undefined);
  assert.equal(vu(invite).tournoi?.titres, 8);
  invite.connexion.envoyer({ genre: 'lancer' });
  assert.equal(vu(hote).tournoi?.enCours, undefined, 'seul l’hôte lance');
  for (let n = 0; n < 7; n++) {
    m.a(10 * (n + 1));
    hote.connexion.envoyer({ genre: 'lancer' });
    const enCours: DuelEnCours | undefined = vu(invite).tournoi?.enCours;
    assert.ok(enCours !== undefined, `duel ${n + 1}`);
    // Les deux extraits arrivent avec le duel : chacun les écoute à son rythme.
    assert.equal(invite.extraits?.duel, enCours.a);
    assert.equal(invite.extraits?.faces.A, playlist(12).find((p) => p.reponse.titre === enCours.faces.A.reponse.titre)?.extrait);
    assert.ok(invite.extraits?.faces.B?.startsWith('https://extraits.test/'));
    hote.connexion.envoyer({ genre: 'lancer' });
    assert.equal(vu(hote).tournoi?.enCours?.a, enCours.a, 'un duel à la fois');
    m.a(10 * (n + 1) + 2);
    invite.connexion.envoyer({ genre: 'voter', face: 'B' });
    assert.ok(
      hote.journal.every((e) => e.genre !== 'vote' || e.face === undefined),
      'l’hôte sait que l’invité a voté, pas pour quelle face',
    );
    assert.deepEqual(vu(hote).tournoi?.enCours?.votants, [invite.toi]);
    // L'hôte vote : tout le monde a voté, le duel se clôt ; une fois sur deux, à égalité.
    hote.connexion.envoyer({ genre: 'voter', face: n % 2 === 0 ? 'B' : 'A' });
    const cloture: Cloture | undefined = clotures(invite)[n];
    assert.deepEqual(cloture?.votes, { [hote.toi]: n % 2 === 0 ? 'B' : 'A', [invite.toi]: 'B' });
    assert.equal(cloture?.par, n % 2 === 0 ? 'voix' : 'pileOuFace');
  }
  const fin = vu(hote);
  assert.equal(fin.phase, 'fin');
  assert.deepEqual(fin, m.serveur.room(hote.code)?.etat, 'le téléphone voit ce que voit le serveur');
  assert.equal(m.finies.length, 1, 'la finale close, la partie compte une fois');
  assert.ok(
    m.finies[0]?.joueurs.every((j) => j.points === 0),
    'sans victoire à personne',
  );
  assert.deepEqual(
    m.faits.filter((f) => f.genre === 'duel').map((f) => (f.genre === 'duel' ? f.numero : 0)),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.equal(m.faits.filter((f) => f.genre === 'cloture').length, 7);
  assert.ok(m.faits.some((f) => f.genre === 'faceFinie' && f.mode === 'tournoi'));
});

test('une playlist de moins de huit titres différents est refusée ; une de dix fait un tableau de huit, même réglé sur seize', () => {
  const courte = monde(() => [...playlist(7), titre(0, undefined, 'Titre 0 (Live)')]);
  const hote = courte.telephone();
  hote.connexion.envoyer(creerLeTournoi());
  assert.deepEqual(hote.recu.at(-1), { genre: 'refus', heure: 0, raison: 'tropCourt' });
  const m = monde(() => playlist(10));
  const [seul] = tablee(m, 0, 16);
  assert.ok(seul !== undefined);
  assert.equal(vu(seul).tournoi?.titres, 8);
  // Seul, on joue aussi : sa voix tranche chaque duel.
  seul.connexion.envoyer({ genre: 'lancer' });
  seul.connexion.envoyer({ genre: 'voter', face: 'A' });
  assert.equal(clotures(seul)[0]?.par, 'voix');
});

test('l’hôte clôt un duel sans attendre, s’il y a au moins un vote ; une ligne qui tombe ne retient pas le duel ; qui arrive en cours regarde', () => {
  const m = monde(() => playlist(8));
  const [hote, lady, dj] = tablee(m, 2);
  assert.ok(hote !== undefined && lady !== undefined && dj !== undefined);
  hote.connexion.envoyer({ genre: 'lancer' });
  hote.connexion.envoyer({ genre: 'clore' });
  assert.equal(clotures(hote).length, 0, 'personne n’a voté : rien à clore');
  lady.connexion.envoyer({ genre: 'voter', face: 'A' });
  dj.connexion.envoyer({ genre: 'clore' });
  assert.equal(clotures(hote).length, 0, 'seul l’hôte clôt');
  hote.connexion.envoyer({ genre: 'clore' });
  assert.deepEqual(clotures(dj)[0], { genre: 'cloture', a: 0, votes: { [lady.toi]: 'A' }, gagnante: 'A', par: 'voix' });
  // Le duel suivant : l'hôte et Lady votent, la ligne de DJ tombe ; on ne l'attend plus.
  m.a(5);
  hote.connexion.envoyer({ genre: 'lancer' });
  const retard = m.telephone();
  retard.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  retard.connexion.envoyer({ genre: 'voter', face: 'B' });
  assert.equal(vu(retard).joueurs.find((j) => j.id === retard.toi)?.spectateur, true);
  assert.deepEqual(vu(hote).tournoi?.enCours?.votants, [], 'qui arrive en cours regarde jusqu’au duel suivant');
  hote.connexion.envoyer({ genre: 'voter', face: 'B' });
  lady.connexion.envoyer({ genre: 'voter', face: 'B' });
  assert.equal(clotures(hote).length, 1, 'on attend encore DJ ; pas le retardataire, qui regarde');
  m.a(6);
  dj.connexion.couper();
  assert.deepEqual(clotures(hote)[1]?.votes, { [hote.toi]: 'B', [lady.toi]: 'B' });
  // Au duel suivant, le retardataire vote.
  m.a(7);
  hote.connexion.envoyer({ genre: 'lancer' });
  retard.connexion.envoyer({ genre: 'voter', face: 'A' });
  assert.deepEqual(vu(hote).tournoi?.enCours?.votants, [retard.toi]);
});

test('un téléphone qui revient retrouve les extraits du duel ; un duel qui dure relit ses liens, et chacun reçoit les neufs', () => {
  let version = 1;
  const m = monde(() => playlist(8, version));
  const [hote, invite] = tablee(m, 1);
  assert.ok(hote !== undefined && invite !== undefined);
  hote.connexion.envoyer({ genre: 'lancer' });
  const avant = invite.extraits;
  assert.ok(avant?.faces.A?.endsWith('v=1'));
  version = 2;
  m.a(TOURNOI.relecture - 1);
  assert.deepEqual(invite.extraits, avant, 'pas avant l’heure');
  m.a(TOURNOI.relecture);
  assert.ok(invite.extraits?.faces.A?.endsWith('v=2') && invite.extraits.faces.B?.endsWith('v=2'));
  assert.equal(invite.extraits?.duel, avant?.duel);
  // L'invité recharge sa page : il revient avec son jeton, et l'état complet porte les extraits du duel.
  invite.connexion.couper();
  const revenu = m.telephone();
  revenu.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE, jeton: invite.jeton });
  assert.deepEqual(revenu.extraits, invite.extraits);
});

test('une piste qui ne se joue plus perd par forfait ; une revanche prend d’autres titres', () => {
  let sauf: string | undefined;
  const seize = playlist(16);
  const m = monde(() => seize.filter((p) => p.reponse.titre !== sauf));
  const [hote] = tablee(m, 0);
  assert.ok(hote !== undefined);
  // Les quarts et les demies, la face A gagnant chaque fois.
  for (let n = 0; n < 6; n++) {
    hote.connexion.envoyer({ genre: 'lancer' });
    hote.connexion.envoyer({ genre: 'voter', face: 'A' });
  }
  const [demiHaut, demiBas] = vu(hote).tournoi?.clos.slice(4, 6) ?? [];
  assert.ok(demiHaut !== undefined && demiBas !== undefined);
  // Le finaliste d'en bas ne se joue plus : l'autre gagne la finale par forfait, sans qu'on vote.
  sauf = demiBas.faces.A.reponse.titre;
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.deepEqual(clotures(hote)[6], { genre: 'cloture', a: 0, votes: {}, gagnante: 'A', par: 'forfait' });
  const fini = vu(hote);
  assert.equal(fini.phase, 'fin');
  assert.ok(fini.tournoi !== undefined);
  assert.equal(disqueDOr(fini.tournoi)?.reponse.titre, demiHaut.faces.A.reponse.titre);
  // La revanche : un autre tableau, fait des huit titres qu'on n'a pas encore joués.
  const joues = new Set(fini.tournoi.clos.slice(0, 4).flatMap((d) => [d.faces.A.reponse.titre, d.faces.B.reponse.titre]));
  hote.connexion.envoyer({ genre: 'rejouer' });
  assert.equal(vu(hote).phase, 'salon');
  for (let n = 0; n < 4; n++) {
    hote.connexion.envoyer({ genre: 'lancer' });
    const faces: DuelEnCours['faces'] | undefined = vu(hote).tournoi?.enCours?.faces;
    assert.ok(faces !== undefined && !joues.has(faces.A.reponse.titre) && !joues.has(faces.B.reponse.titre));
    hote.connexion.envoyer({ genre: 'voter', face: 'B' });
  }
});

test('au premier lancer, le tableau est publié en entier : chacun voit les titres en lice, à leur place, avant le premier duel', () => {
  const m = monde(() => playlist(12));
  const [hote, invite] = tablee(m, 1);
  assert.ok(hote !== undefined && invite !== undefined);
  assert.equal(vu(invite).tournoi?.tableau, undefined, 'rien avant le lancer');
  m.a(10);
  hote.connexion.envoyer({ genre: 'lancer' });
  const t = vu(invite).tournoi;
  assert.equal(t?.tableau?.length, 8);
  const enCours = t?.enCours;
  assert.ok(enCours !== undefined);
  assert.equal(t?.tableau?.[enCours.faces.A.place]?.titre, enCours.faces.A.reponse.titre);
  assert.equal(t?.tableau?.[enCours.faces.B.place]?.titre, enCours.faces.B.reponse.titre);
  // Une seule fois : les duels suivants ne le republient pas.
  m.a(20);
  invite.connexion.envoyer({ genre: 'voter', face: 'A' });
  hote.connexion.envoyer({ genre: 'voter', face: 'A' });
  m.a(30);
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.equal(hote.journal.filter((e) => e.genre === 'tableau').length, 1);
  // Et il reste, duel clos après duel clos.
  assert.equal(vu(hote).tournoi?.clos.length, 1);
  assert.equal(vu(hote).tournoi?.tableau?.length, 8);
});

test('le tournoi en solo : la room n’accueille que son hôte, et chaque duel se clôt à son vote', () => {
  const m = monde(() => playlist(12));
  const hote = m.telephone();
  hote.connexion.envoyer(creerLeTournoi(8, 'tournoiSolo'));
  const invite = m.telephone();
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  assert.equal(invite.recu.at(-1)?.genre, 'refus');
  assert.deepEqual(invite.recu.at(-1), { genre: 'refus', heure: 0, raison: 'solo' });
  m.a(10);
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.ok(vu(hote).tournoi?.enCours !== undefined);
  m.a(12);
  hote.connexion.envoyer({ genre: 'voter', face: 'B' });
  assert.equal(vu(hote).tournoi?.enCours, undefined);
  assert.equal(clotures(hote).at(-1)?.gagnante, 'B');
});
