/** Une room : qui est là, qui tient la platine, ses points, la tête que chacun fait, le hit-parade, la finale, le code. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import {
  assezLongue,
  codeDePartie,
  codeValide,
  disquesDeLaFinale,
  hitParade,
  mouvementsDuClassement,
  numeroDeLaPiste,
  partieA,
  rangs,
  type EvenementDePartie,
} from '../src/regles/partie';
import type { Reponse } from '../src/regles/piste';
import { PARTIE } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';

const POCHETTE = pochetteDExemple(TEXTES);
const DEMONS: Reponse = { titre: 'Les Démons de minuit', artiste: 'Images', pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } };
const PISTE = { reponse: DEMONS };
const ouvre = (pistes = 3): EvenementDePartie => ({ genre: 'ouverture', a: -1, mode: 'libre', pistes });
const arrivent = (...ids: string[]): EvenementDePartie[] => [
  ouvre(),
  ...ids.map((id, rang): EvenementDePartie => ({ genre: 'arrivee', a: rang, id, pochette: POCHETTE })),
];
const extrait = (a: number): EvenementDePartie => ({ genre: 'extrait', a, piste: PISTE });
const tape = (a: number, id: string, texte: string): EvenementDePartie => ({ genre: 'reponse', a, id, proposition: { genre: 'saisie', texte } });
const tetes = (journal: readonly EvenementDePartie[], t = Infinity): Record<string, string> =>
  Object.fromEntries(partieA(journal, t).joueurs.map((j) => [j.id, j.expression]));
const points = (journal: readonly EvenementDePartie[], t = Infinity): Record<string, number> =>
  Object.fromEntries(partieA(journal, t).joueurs.map((j) => [j.id, j.points]));

test('de 2 à 12 pochettes : on arrive content, le premier tient la platine ; au-delà de douze, on reste à la porte', () => {
  const ids = Array.from({ length: PARTIE.joueurs.auPlus + 2 }, (_, i) => `j${i}`);
  const etat = partieA(arrivent(...ids), 100);
  assert.equal(etat.joueurs.length, 12);
  assert.deepEqual(etat.refuses, ['j12', 'j13']);
  assert.equal(etat.hote, 'j0');
  assert.ok(etat.joueurs.every((j) => j.expression === 'content' && j.points === 0 && j.connecte));
});

test('l’hôte parti, la platine passe au suivant ; une connexion qui tombe retourne la pochette, et la garde', () => {
  const journal: EvenementDePartie[] = [...arrivent('a', 'b', 'c'), { genre: 'deconnexion', a: 5, id: 'b' }, { genre: 'depart', a: 6, id: 'a' }];
  const etat = partieA(journal, 10);
  assert.equal(etat.hote, 'c', 'b est déconnecté : c’est c qui tient la platine');
  assert.deepEqual(
    etat.joueurs.map((j) => [j.id, j.connecte]),
    [
      ['b', false],
      ['c', true],
    ],
  );
  assert.equal(partieA([...journal, { genre: 'retour', a: 12, id: 'b' }], 20).joueurs[0]?.connecte, true);
});

test('arrivé pendant une piste, on regarde : on ne marque rien jusqu’à la suivante, puis on joue', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b'),
    extrait(10),
    { genre: 'arrivee', a: 11, id: 'tard', pochette: POCHETTE },
    tape(12, 'tard', 'images'),
  ];
  const etat = partieA(journal, 13);
  assert.equal(etat.joueurs.find((j) => j.id === 'tard')?.spectateur, true);
  assert.equal(points(journal).tard, 0);
  const suite: EvenementDePartie[] = [...journal, { genre: 'revelation', a: 20 }, extrait(30), tape(31, 'tard', 'images')];
  assert.equal(points(suite).tard, 1);
});

test('l’extrait part : tout le monde se concentre ; une bonne réponse rend content, une mauvaise ou un « presque » dépité', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b', 'c', 'd'),
    extrait(10),
    tape(12, 'a', 'images'),
    tape(13, 'b', 'voyage voyage'),
    tape(14, 'd', 'les demons du minou'),
  ];
  assert.deepEqual(tetes(journal, 11), { a: 'concentre', b: 'concentre', c: 'concentre', d: 'concentre' });
  assert.deepEqual(tetes(journal), { a: 'content', b: 'depite', c: 'concentre', d: 'depite' });
  assert.equal(partieA(journal, 20).piste?.dernierVerdict.d, 'presque');
});

test('le barème vient du mode : en libre, 1 pour l’artiste, 1 pour le titre, 1 de plus au premier qui trouve les deux', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b'),
    extrait(10),
    tape(11, 'b', 'images'),
    tape(12, 'a', 'images les demons de minuit'),
    tape(13, 'b', 'les demons de minuit'),
    tape(14, 'a', 'images'),
  ];
  assert.deepEqual(points(journal), { a: 3, b: 2 });
  const quatre: EvenementDePartie[] = [
    { genre: 'ouverture', a: -1, mode: 'quatreChoix', pistes: 3 },
    { genre: 'arrivee', a: 0, id: 'a', pochette: POCHETTE },
    { genre: 'arrivee', a: 1, id: 'b', pochette: POCHETTE },
    { genre: 'extrait', a: 10, piste: { reponse: DEMONS, choix: [DEMONS, DEMONS, DEMONS, DEMONS] } },
    { genre: 'reponse', a: 11, id: 'b', proposition: { genre: 'choix', rang: 2 } },
    { genre: 'reponse', a: 12, id: 'a', proposition: { genre: 'choix', rang: 0 } },
  ];
  assert.deepEqual(points(quatre), { a: 1, b: 2 });
});

test('avec un feat, il y a trois points à prendre, et le bonus va au premier qui a les trois', () => {
  const feat: Reponse = { titre: 'Tout oublier', artiste: 'Angèle', feat: 'Roméo Elvis', pochette: DEMONS.pochette };
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b'),
    { genre: 'extrait', a: 10, piste: { reponse: feat } },
    tape(11, 'a', 'angele tout oublier'),
    tape(12, 'b', 'angele feat romeo elvis'),
    tape(13, 'b', 'tout oublier'),
    tape(14, 'a', 'romeo elvis'),
  ];
  assert.deepEqual(points(journal), { a: 3, b: 4 });
  assert.deepEqual(partieA(journal, 20).piste?.trouve, { a: ['artiste', 'titre', 'feat'], b: ['artiste', 'feat', 'titre'] });
});

test('celui qu’on double fait la tête : quelqu’un qui était derrière lui passe devant ; celui qu’on rejoint, non', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b', 'c'),
    extrait(10),
    tape(11, 'a', 'images'),
    tape(12, 'a', 'les demons de minuit'),
    tape(13, 'b', 'images'),
    { genre: 'revelation', a: 20 },
    extrait(30),
    tape(31, 'c', 'images les demons de minuit'),
  ];
  // Après la première piste : a 3 points, b 1, c 0. Puis c trouve tout d'un coup, le premier : 3 points.
  assert.deepEqual(rangs(partieA(journal, 25).joueurs), { a: 1, b: 2, c: 3 });
  assert.deepEqual(tetes(journal), { a: 'concentre', b: 'depite', c: 'content' });
});

test('à la révélation : personne n’a trouvé, tout le monde est dépité ; qui n’a rien répondu de toute la piste s’endort', () => {
  const personne: EvenementDePartie[] = [
    ...arrivent('a', 'b', 'c'),
    extrait(10),
    tape(12, 'a', 'voyage'),
    tape(13, 'b', 'ouragan'),
    { genre: 'revelation', a: 20 },
  ];
  assert.deepEqual(tetes(personne), { a: 'depite', b: 'depite', c: 'endormi' });
  assert.deepEqual(partieA(personne, 30).trouvees, [false]);
  assert.deepEqual(tetes([...personne, extrait(30)]), { a: 'concentre', b: 'concentre', c: 'concentre' });
});

test('après la dernière piste, c’est la fin : diamant pour le premier, platine, or ; à égalité en tête, un diamant chacun', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('a', 'b', 'c', 'd'),
    ouvre(1),
    extrait(10),
    tape(11, 'a', 'images les demons de minuit'),
    tape(12, 'b', 'images'),
    tape(13, 'c', 'images'),
    { genre: 'revelation', a: 20 },
  ];
  const fin = partieA(journal, 30);
  assert.equal(fin.phase, 'fin');
  assert.deepEqual(disquesDeLaFinale(fin), { a: 'diamant', b: 'platine', c: 'platine' });
  const egalite = partieA([...arrivent('a', 'b'), extrait(10), tape(11, 'a', 'images'), tape(12, 'b', 'images'), { genre: 'revelation', a: 20 }], 30);
  assert.deepEqual(disquesDeLaFinale(egalite), { a: 'diamant', b: 'diamant' });
});

test('le hit-parade range du premier au dernier, ex æquo dans l’ordre d’arrivée ; il bouge comme au hit-parade', () => {
  const avant: EvenementDePartie[] = [
    ...arrivent('a', 'b', 'c', 'd'),
    extrait(10),
    tape(11, 'a', 'images'),
    tape(12, 'b', 'images'),
    tape(13, 'c', 'images'),
    { genre: 'revelation', a: 20 },
  ];
  const apres: EvenementDePartie[] = [
    ...avant,
    extrait(30),
    tape(31, 'd', 'images les demons de minuit'),
    tape(32, 'c', 'les demons de minuit'),
    { genre: 'revelation', a: 40 },
  ];
  const fin = partieA(apres, 45);
  // Après la première piste, a, b et c ont l'artiste (1 point chacun). Puis d trouve tout d'un coup (3), c le titre (2).
  assert.deepEqual(
    hitParade(fin).map(({ joueur, rang }) => [joueur.id, rang]),
    [
      ['d', 1],
      ['c', 2],
      ['a', 3],
      ['b', 3],
    ],
  );
  assert.deepEqual(mouvementsDuClassement(partieA(avant, 25), fin), {
    a: { genre: 'descend', places: 2 },
    b: { genre: 'descend', places: 2 },
    c: { genre: 'descend', places: 1 },
    d: { genre: 'entree' },
  });
});

test('le journal se rejoue dans l’ordre de ses instants, quel que soit l’ordre où il arrive', () => {
  const journal: EvenementDePartie[] = [...arrivent('a', 'b'), extrait(10), tape(12, 'b', 'images'), tape(11, 'a', 'images')];
  assert.deepEqual(partieA(journal, 20), partieA([...journal].reverse(), 20));
});

test('le code : quatre lettres qu’on ne confond pas, rejouables depuis une graine ; un code tapé se vérifie ; une playlist trop courte se dit', () => {
  const t = hasard(7).suivant;
  const codes = Array.from({ length: 200 }, () => codeDePartie(t));
  for (const code of codes) {
    assert.ok(codeValide(code), code);
    assert.doesNotMatch(code, /[ILOQ]/);
  }
  assert.ok(new Set(codes).size > 190, 'presque jamais deux fois le même');
  assert.equal(codeDePartie(hasard(7).suivant), codes[0]);
  assert.ok(codeValide('mxpv') && !codeValide('MIEL') && !codeValide('ABC'));
  assert.ok(assezLongue(15, 15) && !assezLongue(9, 10));
});

test('« Piste N sur M » suit la partie : la première au salon, celle qu’on joue dès son décompte, la dernière révélée ensuite', () => {
  const journal: EvenementDePartie[] = [
    ...arrivent('toi', 'lady'),
    extrait(10),
    { genre: 'revelation', a: 20 },
    extrait(40),
    { genre: 'revelation', a: 50 },
    extrait(70),
    { genre: 'revelation', a: 80 },
  ];
  const piste = (t: number, decompte = false): string => {
    const { numero, sur } = numeroDeLaPiste(partieA(journal, t), decompte);
    return `${numero}/${sur}`;
  };
  assert.equal(piste(5), '1/3', 'au salon');
  assert.equal(piste(5, true), '1/3', 'pendant le premier décompte');
  assert.equal(piste(12), '1/3', 'pendant le premier extrait');
  assert.equal(piste(25), '1/3', 'au hit-parade de la première');
  assert.equal(piste(35, true), '2/3', 'pendant le décompte de la deuxième');
  assert.equal(piste(45), '2/3');
  assert.equal(piste(75), '3/3');
  assert.equal(piste(90), '3/3', 'à la finale : jamais au-delà de la dernière');
  assert.equal(numeroDeLaPiste(partieA([ouvre(15)], 0)).sur, 15, 'combien : ce que l’hôte a réglé en ouvrant la room');
});

test('rejoué jusqu’au bout, un journal ne l’est qu’une fois ; un événement de plus, et il l’est de nouveau', () => {
  const journal: EvenementDePartie[] = arrivent('a', 'b');
  const etat = partieA(journal, Infinity);
  assert.equal(partieA(journal, Infinity), etat, 'le même état, sans tout rejouer');
  journal.push({ genre: 'depart', a: 5, id: 'b' });
  assert.equal(partieA(journal, Infinity).joueurs.length, 1, 'le journal s’est allongé : il est rejoué');
});
