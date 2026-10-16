/** Les messages entre les téléphones et le serveur : ce qu'un téléphone apprend, et ce qu'il n'apprend jamais avant l'heure. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { journalDExemple } from '../src/planche/etape5/scenes';
import { publier, REPONSE_MASQUEE } from '../src/regles/messages';
import { partieA, type EvenementDePartie } from '../src/regles/partie';
import { TEXTES } from '../src/ressources/textes.fr';

const JOURNAL = journalDExemple(TEXTES);
const PUBLIE = publier(JOURNAL);
const instants = [...new Set(JOURNAL.map((e) => e.a))].sort((a, b) => a - b);

test('le journal publié, rejoué par un téléphone, donne la même room que celle du serveur, à chaque instant', () => {
  for (const t of instants) {
    const [serveur, telephone] = [partieA(JOURNAL, t), partieA(PUBLIE, t)];
    assert.deepEqual(
      telephone.joueurs.map((j) => [j.id, j.points, j.expression, j.connecte]),
      serveur.joueurs.map((j) => [j.id, j.points, j.expression, j.connecte]),
      `à ${t} s`,
    );
    assert.deepEqual(telephone.piste?.trouve, serveur.piste?.trouve, `ce que chacun a trouvé, à ${t} s`);
    assert.equal(telephone.pistesJouees, serveur.pistesJouees);
  }
});

test('avant la révélation, rien de publié ne dit la réponse ; ce que chacun a tapé ne l’est jamais', () => {
  const titre = TEXTES.exemples.titre;
  const revele = (e: EvenementDePartie): boolean => e.genre === 'revelation';
  const derniereRevelation = PUBLIE.map(revele).lastIndexOf(true);
  const avantLaFin = PUBLIE.slice(0, derniereRevelation);
  for (const e of PUBLIE) {
    assert.notEqual(e.genre, 'reponse', 'une réponse est publiée jugée, sans ce qui a été tapé');
    if (e.genre === 'extrait') assert.deepEqual(e.piste.reponse, REPONSE_MASQUEE);
  }
  assert.ok(!JSON.stringify(avantLaFin.filter((e) => e.genre !== 'revelation')).includes(titre));
  // La révélation, elle, apporte la réponse : le disque peut l'écrire à son verso.
  const derniere = PUBLIE[derniereRevelation];
  assert.ok(derniere?.genre === 'revelation' && derniere.reponse?.titre === titre);
});

test('l’extrait publié ne dit rien qui mène à la réponse : ni son identifiant Deezer, ni ses surnoms, ni son anecdote', () => {
  const anecdote = 'Écrite en une nuit, pour un film qui ne l’a jamais gardée.';
  const piste = {
    reponse: { ...REPONSE_MASQUEE, titre: 'Bella', artiste: 'GIMS' },
    deezer: 72717420,
    surnoms: { artiste: ['Maître Gims'], titre: [] },
    anecdote,
  };
  const journal: EvenementDePartie[] = [
    { genre: 'ouverture', a: 0, mode: 'libre', pistes: 10 },
    { genre: 'extrait', a: 1, piste: { ...piste, extrait: 'https://cdnt-preview.dzcdn.net/extrait.mp3' } },
    { genre: 'revelation', a: 30 },
  ];
  const [, extrait, revelation] = publier(journal);
  assert.deepEqual(extrait?.genre === 'extrait' && extrait.piste, { reponse: REPONSE_MASQUEE });
  // La révélation apporte la réponse et son anecdote, pour le papier sous la platine.
  assert.deepEqual(revelation?.genre === 'revelation' && revelation.reponse, { ...piste.reponse, anecdote });
});
