/**
 * Le serveur : une room qu'on crée et qu'on rejoint par son code, une piste de bout en bout (décompte, appareils prêts, extrait,
 * réponses jugées, révélation), une connexion qui tombe et revient, « Rejouer la face B ». Chaque téléphone rejoue ce qu'il reçoit,
 * et voit ce que voit le serveur ; il ne voit jamais ce qu'il faut trouver avant la révélation, ni ce qu'un autre a tapé.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import { lireUneAction, type Action, type Connexion, type Nouvelle } from '../src/regles/messages';
import { MODES, type PisteDuMode } from '../src/regles/modes';
import { partieA, type EvenementDePartie } from '../src/regles/partie';
import { DUREE_DU_DECOMPTE, jouer, memeReponse, type ActionDePiste, type Piste } from '../src/regles/piste';
import { DEROULE, REGLAGES, SERVEUR } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { avecDesChoix } from '../src/serveur/choix';
import { dansLOrdre, lOrdreDeLaPlaylist, unOrdreAuHasard } from '../src/serveur/ordre';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { PISTES_D_ESSAI } from '../src/serveur/sources/essai';

const POCHETTE = pochetteDExemple(TEXTES);
const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;
const PLAYLIST: PisteDuMode[] = [
  { reponse: { titre: 'Les Démons de minuit', artiste: 'Images', pochette: vignette } },
  { reponse: { titre: 'Voyage, voyage', artiste: 'Desireless', pochette: vignette } },
  { reponse: { titre: 'Ouragan', artiste: 'Stéphanie', pochette: vignette } },
];

/** Un téléphone : il rejoue ce qu'on lui envoie, comme le ferait l'écran. */
interface Telephone {
  readonly connexion: Connexion;
  readonly recu: Nouvelle[];
  journal: EvenementDePartie[];
  seance: ActionDePiste[];
  toi: string;
  jeton: string;
  code: string;
}

function monde() {
  let heure = 0;
  let jetons = 0;
  /** Ce que les rooms ont dit qu'elles allaient jouer : la source s'y prépare (les invités des prochaines pistes). */
  const annoncees: (readonly PisteDuMode[])[] = [];
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(37).suivant,
    // Les pistes dans l'ordre de la playlist : les tests savent laquelle vient.
    ordre: lOrdreDeLaPlaylist,
    jeton: () => `jeton-${++jetons}`,
    playlist: (lien) => (lien === 'bac' ? PLAYLIST : undefined),
    bientot: (pistes) => annoncees.push(pistes),
  });
  const telephone = (): Telephone => {
    const t: Telephone = { connexion: undefined as unknown as Connexion, recu: [], journal: [], seance: [], toi: '', jeton: '', code: '' };
    Object.assign(t, {
      connexion: serveur.connecter((n) => {
        t.recu.push(n);
        if (n.genre === 'etat') Object.assign(t, { journal: [...n.journal], seance: [...n.seance], toi: n.toi, jeton: n.jeton, code: n.code });
        if (n.genre === 'evenement') t.journal.push(n.evenement);
        if (n.genre === 'piste') t.seance.push(n.action);
      }),
    });
    return t;
  };
  const a = (t: number): void => {
    heure = t;
    serveur.avancer();
  };
  return { serveur, telephone, a, heure: () => heure, annoncees };
}

const creer: Action = { genre: 'creer', mode: 'libre', pistes: 3, extrait: 20, son: 'tous', playlist: 'bac', pochette: POCHETTE };
const piste = (t: Telephone): Piste | undefined => t.seance.reduce<Piste | undefined>(jouer, undefined);

test('on crée une room, on la rejoint par son code ; un code inconnu, une playlist trop courte, une room pleine sont refusés', () => {
  const m = monde();
  const hote = m.telephone();
  hote.connexion.envoyer({ ...creer, playlist: 'inconnue' });
  assert.deepEqual(hote.recu.at(-1), { genre: 'refus', heure: 0, raison: 'tropCourt' });
  hote.connexion.envoyer(creer);
  assert.equal(hote.code.length, 4);
  assert.equal(partieA(hote.journal, Infinity).hote, hote.toi);
  const perdu = m.telephone();
  perdu.connexion.envoyer({ genre: 'rejoindre', code: 'ZZZZ', pochette: POCHETTE });
  assert.equal(perdu.recu.at(-1)?.genre, 'refus');
  const invites = Array.from({ length: 11 }, () => m.telephone());
  for (const t of invites) t.connexion.envoyer({ genre: 'rejoindre', code: hote.code.toLowerCase(), pochette: POCHETTE });
  assert.equal(partieA(hote.journal, Infinity).joueurs.length, 12);
  const treizieme = m.telephone();
  treizieme.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  assert.deepEqual(treizieme.recu.at(-1), { genre: 'refus', heure: 0, raison: 'complet' });
});

test('une piste de bout en bout : le décompte, tous prêts, l’extrait, des réponses jugées, la révélation ; chacun voit ce que voit le serveur', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer(creer);
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  m.a(10);
  invite.connexion.envoyer({ genre: 'lancer' });
  assert.equal(piste(hote), undefined, 'seul l’hôte lance');
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.equal(piste(invite)?.decompteA, 10);
  hote.connexion.envoyer({ genre: 'pret' });
  m.a(11);
  invite.connexion.envoyer({ genre: 'pret' });
  // Tous prêts : l'extrait part à la fin du décompte, ou après le préavis si l'on a tardé.
  const extraitA = Math.max(10 + DUREE_DU_DECOMPTE, 11 + DEROULE.preavis);
  assert.equal(piste(hote)?.extraitA, extraitA);
  m.a(extraitA);
  const extrait = invite.journal.find((e) => e.genre === 'extrait');
  assert.ok(extrait?.genre === 'extrait');
  assert.equal(extrait.piste.reponse.titre, '', 'le titre ne part pas avant la révélation');
  m.a(extraitA + 2);
  invite.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'images' } });
  hote.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'les demons de minuit' } });
  assert.ok(!JSON.stringify(hote.journal).includes('images'), 'l’hôte ne voit pas ce que l’invité a tapé');
  m.a(extraitA + 20);
  const revelation = invite.journal.find((e) => e.genre === 'revelation');
  assert.ok(revelation?.genre === 'revelation');
  assert.equal(revelation.reponse?.titre, 'Les Démons de minuit');
  const serveur = m.serveur.room(hote.code)?.etat;
  for (const t of [hote, invite]) {
    const vu = partieA(t.journal, Infinity);
    assert.deepEqual(
      vu.joueurs.map((j) => j.points),
      serveur?.joueurs.map((j) => j.points),
    );
    assert.equal(vu.pistesJouees, 1);
  }
});

test('un appareil en retard ne retient pas la piste ; une connexion qui tombe garde sa place, et revient avec l’état complet', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer(creer);
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  hote.connexion.envoyer({ genre: 'lancer' });
  hote.connexion.envoyer({ genre: 'pret' });
  m.a(DUREE_DU_DECOMPTE + DEROULE.attente);
  assert.equal(piste(hote)?.extraitA, DUREE_DU_DECOMPTE + DEROULE.attente + DEROULE.preavis, 'il part sans l’invité');
  m.a(8);
  invite.connexion.couper();
  assert.equal(partieA(hote.journal, Infinity).joueurs.find((j) => j.id === invite.toi)?.connecte, false);
  // Il revient au milieu de l'extrait : l'état complet, et le déroulé de la piste pour reprendre au bon endroit.
  const revenu = m.telephone();
  m.a(9);
  revenu.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE, jeton: invite.jeton });
  assert.equal(revenu.toi, invite.toi);
  assert.equal(partieA(revenu.journal, Infinity).joueurs.find((j) => j.id === invite.toi)?.connecte, true);
  assert.equal(piste(revenu)?.extraitA, piste(hote)?.extraitA);
  assert.equal(partieA(revenu.journal, Infinity).joueurs.length, 2, 'sa place, pas une de plus');
});

test('« First one » : le premier qui trouve l’artiste et le titre gagne la piste, qui se révèle aussitôt ; « 1re note » ne fait entendre qu’une seconde', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer({ ...creer, mode: 'premierArrive' });
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  hote.connexion.envoyer({ genre: 'lancer' });
  hote.connexion.envoyer({ genre: 'pret' });
  invite.connexion.envoyer({ genre: 'pret' });
  const extraitA = piste(hote)?.extraitA ?? 0;
  m.a(extraitA + 2);
  invite.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'images' } });
  assert.equal(
    invite.journal.find((e) => e.genre === 'revelation'),
    undefined,
    'l’artiste seul ne suffit pas',
  );
  m.a(extraitA + 3);
  hote.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'Images, les démons de minuit' } });
  const revelation = invite.journal.find((e) => e.genre === 'revelation');
  assert.equal(revelation?.a, extraitA + 3, 'la piste s’arrête au premier qui a tout trouvé');
  const points = partieA(invite.journal, Infinity).joueurs.map((j) => j.points);
  assert.deepEqual(points, [3, 0]);
  assert.equal(MODES.premiereNote.son, DEROULE.premiereNote);
});

test('« Solo » : l’hôte lance seul, personne d’autre n’entre, et la piste passe dès qu’il a tout trouvé', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer({ ...creer, mode: 'solo' });
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  assert.deepEqual(invite.recu.at(-1), { genre: 'refus', heure: 0, raison: 'solo' }, 'la room du solo n’accueille que son hôte, et le dit');
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.ok(piste(hote) !== undefined, 'seul, il lance');
  hote.connexion.envoyer({ genre: 'pret' });
  const extraitA = piste(hote)?.extraitA ?? 0;
  m.a(extraitA + 2);
  hote.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'images' } });
  assert.equal(
    hote.journal.find((e) => e.genre === 'revelation'),
    undefined,
    'l’artiste seul ne suffit pas',
  );
  m.a(extraitA + 4);
  hote.connexion.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'les démons de minuit' } });
  assert.equal(hote.journal.find((e) => e.genre === 'revelation')?.a, extraitA + 4, 'tout trouvé : la piste passe aussitôt');
  // Le barème de la saisie libre : l'artiste, le titre, et 1 de plus pour tout.
  assert.deepEqual(
    partieA(hote.journal, Infinity).joueurs.map((j) => j.points),
    [3],
  );
  // Une autre room, qui n'est pas en solo : seul, on ne lance pas.
  const autre = monde().telephone();
  autre.connexion.envoyer(creer);
  autre.connexion.envoyer({ genre: 'lancer' });
  assert.equal(piste(autre), undefined);
});

test('une room dit à la source ce qu’elle va jouer, dans l’ordre : en s’ouvrant, puis à chaque lancer', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer(creer);
  assert.equal(m.annoncees.length, 1, 'dès qu’elle prend sa playlist');
  assert.deepEqual(m.annoncees[0], PLAYLIST);
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  hote.connexion.envoyer({ genre: 'lancer' });
  assert.equal(m.annoncees.length, 2, 'et quand elle lance une piste');
});

test('une room joue sa playlist dans un ordre tiré au hasard, chaque piste une fois', () => {
  const ordre = unOrdreAuHasard(20, hasard(5).suivant);
  assert.deepEqual(
    [...ordre].sort((a, b) => a - b),
    Array.from({ length: 20 }, (_, rang) => rang),
  );
  assert.notDeepEqual(
    ordre,
    Array.from({ length: 20 }, (_, rang) => rang),
  );
  assert.deepEqual(dansLOrdre(['a', 'b', 'c', 'd'], [2, 0, 1]), ['c', 'a', 'b', 'd']);
  assert.deepEqual(dansLOrdre(['a', 'b'], [2, 0, 1]), ['a', 'b']);
});

test('« Rejouer la face B » : une nouvelle partie, avec les mêmes ; la playlist reprend où elle s’était arrêtée', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer({ ...creer, pistes: 1 });
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  hote.connexion.envoyer({ genre: 'lancer' });
  hote.connexion.envoyer({ genre: 'pret' });
  invite.connexion.envoyer({ genre: 'pret' });
  m.a(60);
  assert.equal(partieA(hote.journal, Infinity).phase, 'fin');
  hote.connexion.envoyer({ genre: 'rejouer' });
  const etat = partieA(invite.journal, Infinity);
  assert.equal(etat.phase, 'salon');
  assert.deepEqual(
    etat.joueurs.map((j) => [j.id, j.points]),
    [
      [hote.toi, 0],
      [invite.toi, 0],
    ],
  );
  m.a(70);
  hote.connexion.envoyer({ genre: 'lancer' });
  hote.connexion.envoyer({ genre: 'pret' });
  invite.connexion.envoyer({ genre: 'pret' });
  m.a(120);
  const revelation = invite.journal.find((e) => e.genre === 'revelation');
  assert.ok(revelation?.genre === 'revelation');
  assert.equal(revelation.reponse?.titre, 'Voyage, voyage', 'la face B commence où la face A s’est arrêtée');
});

test('l’hôte change de playlist en pleine piste : la room repart sur la face A de la nouvelle, avec les mêmes ; une trop courte est refusée', () => {
  let heure = 0;
  const AUTRE: PisteDuMode[] = [
    { reponse: { titre: 'Tombé pour la France', artiste: 'Étienne Daho', pochette: vignette } },
    { reponse: { titre: 'Toute première fois', artiste: 'Jeanne Mas', pochette: vignette } },
    { reponse: { titre: 'Marcia Baïla', artiste: 'Les Rita Mitsouko', pochette: vignette } },
  ];
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(37).suivant,
    ordre: lOrdreDeLaPlaylist,
    jeton: () => 'jeton',
    playlist: (lien) => (lien === 'bac' ? PLAYLIST : lien === 'autre' ? AUTRE : lien === 'courte' ? AUTRE.slice(0, 1) : undefined),
  });
  const recus: Nouvelle[][] = [[], []];
  const [hote, invite] = recus.map((r) => serveur.connecter((n) => r.push(n)));
  hote?.envoyer(creer);
  const code = (recus[0]?.find((n) => n.genre === 'etat') as Extract<Nouvelle, { genre: 'etat' }> | undefined)?.code ?? '';
  invite?.envoyer({ genre: 'rejoindre', code, pochette: POCHETTE });
  hote?.envoyer({ genre: 'lancer' });
  hote?.envoyer({ genre: 'pret' });
  invite?.envoyer({ genre: 'pret' });
  heure = 10;
  serveur.avancer();
  const room = serveur.room(code);
  assert.equal(room?.etat.piste?.attendue.reponse.titre, 'Les Démons de minuit', 'la piste joue');
  // L'invité ne change rien ; une playlist trop courte pour la face est refusée à l'hôte.
  invite?.envoyer({ genre: 'changerDePlaylist', playlist: 'autre' });
  hote?.envoyer({ genre: 'changerDePlaylist', playlist: 'courte' });
  assert.deepEqual(recus[0]?.at(-1), { genre: 'refus', heure: 10, raison: 'tropCourt' });
  assert.equal(room?.playlist, 'bac');
  hote?.envoyer({ genre: 'changerDePlaylist', playlist: 'autre' });
  assert.equal(room?.playlist, 'autre');
  assert.equal(room?.etat.phase, 'salon', 'la piste s’arrête là');
  assert.equal(room?.etat.face, 'A');
  assert.equal(room?.etat.joueurs.length, 2, 'avec les mêmes');
  assert.equal(recus[1]?.at(-1)?.genre, 'etat', 'chacun reçoit la room qui repart');
  hote?.envoyer({ genre: 'lancer' });
  hote?.envoyer({ genre: 'pret' });
  invite?.envoyer({ genre: 'pret' });
  heure = 20;
  serveur.avancer();
  assert.equal(room?.etat.piste?.attendue.reponse.titre, 'Tombé pour la France', 'la nouvelle playlist, depuis le début');
});

test('le jeton, et lui seul, rouvre une place : l’identifiant que tous voient ne suffit pas', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer(creer);
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  assert.notEqual(invite.jeton, '');
  assert.notEqual(invite.jeton, invite.toi);
  // Quelqu'un qui connaît l'identifiant de l'hôte, et le donne pour jeton, entre comme un nouveau joueur, sans prendre sa place.
  const intrus = m.telephone();
  intrus.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE, jeton: hote.toi });
  assert.notEqual(intrus.toi, hote.toi);
  assert.equal(partieA(intrus.journal, Infinity).hote, hote.toi);
  // Le jeton d'une room n'en ouvre pas une autre.
  const autreHote = m.telephone();
  autreHote.connexion.envoyer(creer);
  const egare = m.telephone();
  egare.connexion.envoyer({ genre: 'rejoindre', code: autreHote.code, pochette: POCHETTE, jeton: invite.jeton });
  assert.notEqual(egare.toi, invite.toi);
});

test('le serveur donne son heure à qui la demande, dans une room ou hors d’elle', () => {
  const m = monde();
  const t = m.telephone();
  m.a(12.5);
  t.connexion.envoyer({ genre: 'quelleHeure', depart: 3.25 });
  assert.deepEqual(t.recu[t.recu.length - 1], { genre: 'heure', heure: 12.5, depart: 3.25 });
  t.connexion.envoyer(creer);
  t.connexion.envoyer({ genre: 'quelleHeure', depart: 4 });
  assert.deepEqual(t.recu[t.recu.length - 1], { genre: 'heure', heure: 12.5, depart: 4 });
});

test('une room où plus personne n’est branché s’en va, et ses jetons avec elle ; une room où l’on joue reste', () => {
  const m = monde();
  const [hote, invite] = [m.telephone(), m.telephone()];
  hote.connexion.envoyer(creer);
  invite.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE });
  const autre = m.telephone();
  autre.connexion.envoyer(creer);
  hote.connexion.couper();
  invite.connexion.couper();
  m.a(SERVEUR.expiration.sansPersonne - 1);
  assert.ok(m.serveur.room(hote.code) !== undefined, 'elle attend qu’on revienne');
  m.a(SERVEUR.expiration.sansPersonne + 1);
  assert.equal(m.serveur.room(hote.code), undefined);
  assert.ok(m.serveur.room(autre.code) !== undefined, 'on y est encore branché');
  const revenu = m.telephone();
  revenu.connexion.envoyer({ genre: 'rejoindre', code: hote.code, pochette: POCHETTE, jeton: invite.jeton });
  assert.deepEqual(revenu.recu[revenu.recu.length - 1], { genre: 'refus', heure: SERVEUR.expiration.sansPersonne + 1, raison: 'codeInconnu' });
  m.a(SERVEUR.expiration.auPlus + 1);
  assert.equal(m.serveur.rooms, 0, 'aucune ne vit plus d’une soirée');
});

test('ce qui arrive du réseau n’est pas cru sur parole : seule une action bien formée passe, et rien de plus qu’elle', () => {
  const bonne = { genre: 'creer', mode: 'libre', pistes: 15, extrait: 20, son: 'tous', playlist: 'essai', pochette: POCHETTE };
  assert.deepEqual(lireUneAction(bonne), bonne);
  assert.deepEqual(lireUneAction({ ...bonne, intrus: 'oui' }), bonne, 'un champ de trop est laissé dehors');
  for (const mauvaise of [
    null,
    'creer',
    [],
    { genre: 'inconnu' },
    { ...bonne, mode: 'triche' },
    { ...bonne, mode: 'toString' },
    { ...bonne, pistes: 0 },
    { ...bonne, pistes: 2.5 },
    { ...bonne, pistes: 1000 },
    { ...bonne, extrait: 25 },
    { ...bonne, son: 'fort' },
    { ...bonne, pochette: { ...POCHETTE, artiste: 'x'.repeat(200) } },
    { ...bonne, pochette: { ...POCHETTE, artiste: 'DJ\u0007Bip' } },
    { ...bonne, pochette: { ...POCHETTE, motif: 'pois' } },
    { ...bonne, pochette: { ...POCHETTE, avatar: { ...POCHETTE.avatar, tete: '__proto__' } } },
    { genre: 'rejoindre', code: 'A'.repeat(50), pochette: POCHETTE },
    { genre: 'rejoindre', code: 'ABCD', pochette: POCHETTE, jeton: 42 },
    { genre: 'repondre', proposition: { genre: 'saisie', texte: 'x'.repeat(1000) } },
    { genre: 'repondre', proposition: { genre: 'choix', rang: -1 } },
    { genre: 'quelleHeure', depart: 'midi' },
    { genre: 'quelleHeure', depart: Infinity },
  ])
    assert.equal(lireUneAction(mauvaise), undefined, JSON.stringify(mauvaise));
  assert.deepEqual(lireUneAction({ genre: 'lancer', puis: 'tout' }), { genre: 'lancer' });
});

test('en 4 choix, chaque piste a ses étiquettes : la bonne parmi des leurres de la même playlist, tous différents', () => {
  const choisies = avecDesChoix(PISTES_D_ESSAI, 'quatreChoix', hasard(7).suivant);
  assert.equal(choisies.length, PISTES_D_ESSAI.length);
  for (const piste of choisies) {
    assert.equal(piste.choix?.length, MODES.quatreChoix.reglages['choix']);
    assert.equal(piste.choix?.filter((c) => memeReponse(c, piste.reponse)).length, 1);
    assert.equal(new Set(piste.choix?.map((c) => c.titre)).size, piste.choix?.length);
  }
  // La bonne n'est pas toujours à la même place, et le mode libre n'en propose pas.
  assert.ok(new Set(choisies.map((p) => p.choix?.findIndex((c) => memeReponse(c, p.reponse)))).size > 1);
  assert.ok(avecDesChoix(PISTES_D_ESSAI, 'libre', hasard(7).suivant).every((p) => p.choix === undefined));
  // La source d'essai tient une face A et une face B de vingt pistes.
  assert.ok(PISTES_D_ESSAI.length >= 2 * Math.max(...REGLAGES.pistes.choix));
});
