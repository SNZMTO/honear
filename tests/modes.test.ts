/**
 * Le contrat d'un mode tient : trois modes d'exemple (« Année », « Intro express », « Équipes »), écrits sans toucher au socle,
 * jouent contre lui. Le socle les juge, départage, règle l'extrait et compte les équipes par le contrat seul.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pochetteDExemple } from '../src/planche/exemples';
import { MODES, MODES_PAR_CRAN, type Proposition } from '../src/regles/modes';
import { LIBRE } from '../src/regles/modes/libre';
import { departageDeLaPiste, dureeDeLExtrait, equipesDeLaPartie, partieA, suivre, type EvenementDePartie } from '../src/regles/partie';
import type { Reponse } from '../src/regles/piste';
import { TEXTES } from '../src/ressources/textes.fr';
import { ANNEE, EQUIPES, INTRO_EXPRESS, MODES_D_EXEMPLE } from './modes-d-exemple';

const DEMONS: Reponse = {
  titre: 'Les Démons de minuit',
  artiste: 'Images',
  annee: 1986,
  pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } },
};
const tape = (texte: string): Proposition => ({ genre: 'saisie', texte });
const POCHETTE = pochetteDExemple(TEXTES);
const arrivent = (...ids: string[]): EvenementDePartie[] => [
  { genre: 'ouverture', a: -1, mode: 'libre', pistes: 3 },
  ...ids.map((id, rang): EvenementDePartie => ({ genre: 'arrivee', a: rang, id, pochette: POCHETTE })),
];

test('chaque mode d’exemple prend un cran libre, après les quatre de la manette (qui n’en grave pas plus)', () => {
  const pris = MODES_PAR_CRAN.map((m) => m.cran);
  assert.equal(pris.length, 4, 'la manette a quatre positions : en haut, à gauche, à droite, en bas');
  for (const mode of MODES_D_EXEMPLE) {
    assert.ok(!pris.includes(mode.cran), `${mode.cle} : cran ${mode.cran} libre`);
    assert.ok(!(mode.cle in MODES), `${mode.cle} n’est pas encore dans le registre`);
  }
});

test('« Année » : la bonne vaut 2 points, à deux ans près c’est « Presque. », et sans elle le plus proche marque à la révélation', () => {
  const piste = { reponse: DEMONS };
  assert.deepEqual(ANNEE.juger(tape('1986'), piste, []), { trouve: ['annee'], verdict: 'juste' });
  assert.deepEqual(ANNEE.juger(tape('je dirais 1988'), piste, []), { trouve: [], verdict: 'presque' });
  assert.deepEqual(ANNEE.juger(tape('1979'), piste, []), { trouve: [], verdict: 'faux' });
  assert.equal(ANNEE.points(['annee'], true), 2);
  // Le socle garde la dernière proposition de chacun, et départage par le contrat.
  const journal: EvenementDePartie[] = [
    ...arrivent('toi', 'lady', 'dj'),
    { genre: 'extrait', a: 10, piste },
    { genre: 'reponse', a: 11, id: 'toi', proposition: tape('1979') },
    { genre: 'reponse', a: 12, id: 'toi', proposition: tape('1984') },
    { genre: 'reponse', a: 13, id: 'lady', proposition: tape('1988') },
    { genre: 'reponse', a: 14, id: 'dj', proposition: tape('1990') },
  ];
  const enCours = partieA(journal, 15).piste;
  assert.ok(enCours !== undefined);
  assert.deepEqual(
    enCours.propositions.map((p) => p.id),
    ['toi', 'lady', 'dj'],
  );
  assert.deepEqual(departageDeLaPiste(ANNEE, enCours), { toi: 1, lady: 1 }, '1984 et 1988 sont à deux ans de 1986 : ex æquo');
  // Le téléphone ne voit que la révélation publiée, avec son départage : il marque les mêmes points.
  const revelee = suivre(partieA(journal, 15), { genre: 'revelation', a: 20, departage: { toi: 1, lady: 1 } });
  assert.deepEqual(Object.fromEntries(revelee.joueurs.map((j) => [j.id, j.points])), { toi: 1, lady: 1, dj: 0 });
  assert.deepEqual(Object.fromEntries(revelee.joueurs.map((j) => [j.id, j.expression])), { toi: 'content', lady: 'content', dj: 'depite' });
  // Quelqu'un l'a eue : personne ne départage.
  assert.deepEqual(
    departageDeLaPiste(ANNEE, { ...enCours, propositions: [...enCours.propositions, { id: 'baron', proposition: tape('1986'), a: 16 }] }),
    {},
  );
});

test('« Intro express » : 3 secondes d’extrait, quel que soit le bouton « Extrait » ; les autres modes suivent le bouton', () => {
  assert.equal(dureeDeLExtrait(INTRO_EXPRESS, 20), 3);
  assert.equal(dureeDeLExtrait(LIBRE, 20), 20);
  assert.deepEqual(INTRO_EXPRESS.juger(tape('images'), { reponse: DEMONS }, []), LIBRE.juger(tape('images'), { reponse: DEMONS }, []));
});

test('« Équipes » : deux équipes à tour de rôle, dans l’ordre d’arrivée, leurs points mis en commun ; les autres modes n’en font pas', () => {
  const etat = partieA(
    [
      ...arrivent('toi', 'lady', 'dj', 'baron', 'mc'),
      { genre: 'extrait', a: 10, piste: { reponse: DEMONS } },
      { genre: 'reponse', a: 11, id: 'lady', proposition: tape('Images Les Démons de minuit') },
      { genre: 'reponse', a: 12, id: 'baron', proposition: tape('images') },
      { genre: 'reponse', a: 13, id: 'toi', proposition: tape('les demons de minuit') },
    ],
    20,
  );
  const equipes = equipesDeLaPartie(EQUIPES, etat);
  assert.deepEqual(
    equipes.map((e) => e.joueurs.map((j) => j.id)),
    [
      ['toi', 'dj', 'mc'],
      ['lady', 'baron'],
    ],
  );
  assert.deepEqual(
    equipes.map((e) => [e.points, e.rang]),
    [
      [1, 2],
      [4, 1],
    ],
  );
  assert.deepEqual(equipesDeLaPartie(LIBRE, etat), []);
});
