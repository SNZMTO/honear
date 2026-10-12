/**
 * Le bac, chez l'hôte : chacun de ses états se dessine, avec les polices du site, sans un signe qu'elles n'auraient pas (c'est ce
 * qu'on a écrit, et l'encrier des tests s'arrête à la première faute). Un titre venu d'ailleurs (de Deezer, de Spotify), lui, peut
 * porter n'importe quoi : la page du jeu le dessine quand même, ce qui manque aux polices remplacé. Et ce qu'on y fait : un thème,
 * une recherche, un lien collé, ce que le serveur en dit.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BAC_VIDE, MEMOIRE_VIDE, recevoir, saisir, toucher, valider, type Memoire, type Preparatifs } from '../src/ecran/telephone/memoire';
import { pochetteDExemple } from '../src/planche/exemples';
import { lireUnePolice } from '../src/planche/polices';
import { CARACTERES } from '../src/ressources/typo';
import { TEXTES } from '../src/ressources/textes.fr';
import { encrier } from '../src/scene/rendu/texte';
import { vueDuBac, type BacOuvert } from '../src/scene/telephone/ecrans';
import { ENCRIER } from './planche';

const A = { textes: TEXTES, encrier: ENCRIER, site: 'miel-doreilles.fr' };
const vignette = { fond: 'olive', motif: 'rayons' } as const;
const choisie = { titre: 'Soirée 2000', total: 24 };
const source = TEXTES.playlists.source;

const ETATS: readonly BacOuvert[] = [
  { cran: 'pretes' },
  { cran: 'pretes', themeAToucher: true, source },
  { cran: 'pretes', theme: 'annees80', etat: 'fouille', source },
  { cran: 'pretes', theme: 'annees80', etat: 'rien', source },
  { cran: 'pretes', theme: 'annees80', choisie, source },
  { cran: 'chercher', source },
  { cran: 'chercher', recherche: 'soirée', etat: 'fouille', source },
  { cran: 'chercher', recherche: 'soirée', resultats: [], etat: 'rien', source },
  { cran: 'chercher', recherche: 'soirée', resultats: [vignette, vignette, vignette, vignette], choisie, source },
  { cran: 'chercher', recherche: 'soirée', resultats: [vignette, vignette], touche: 1, choisie, source },
  { cran: 'laMienne', source },
  { cran: 'laMienne', lien: 'https://open.spotify.com/playlist/1a2B3c4D5e6F7g8H9i0JkL', etat: 'fouille', source },
  { cran: 'laMienne', lien: 'https://open.spotify.com/playlist/1a2B3c4D5e6F7g8H9i0JkL', refus: 'spotify', source },
  { cran: 'laMienne', lien: 'deezer.com/playlist/1', refus: 'introuvable', source },
  { cran: 'laMienne', lien: 'deezer.com/playlist/2', importee: { jouables: 3, total: 3 }, refus: 'tropCourt', source },
  { cran: 'laMienne', lien: 'deezer.com/playlist/3', importee: { jouables: 38, total: 40 }, choisie, source },
];

test('chaque état du bac se dessine, avec les signes que les polices du site ont', () => {
  for (const bac of ETATS) {
    const vue = vueDuBac(A, bac);
    const noms = vue.objets.map((o) => o.nom);
    const aChoisir = noms.includes('touche-choisir');
    // On choisit ce qu'on a sous les yeux, et rien tant que le bac fouille ou qu'un refus est affiché.
    assert.equal(
      aChoisir,
      bac.etat !== 'fouille' &&
        bac.refus === undefined &&
        (bac.cran !== 'pretes' || bac.themeAToucher !== true || bac.choisie !== undefined) &&
        (bac.cran !== 'chercher' || (bac.resultats?.length ?? 0) > 0) &&
        (bac.cran !== 'laMienne' || bac.importee !== undefined),
      JSON.stringify(bac),
    );
  }
});

test('un titre venu d’ailleurs, avec des signes que les polices n’ont pas, se dessine quand même dans la page du jeu', () => {
  const indulgent = encrier(CARACTERES, lireUnePolice, TEXTES.langue, true);
  const etrange = { titre: 'Été ☀️ 2026 · 夏の歌 · Ωmega', total: 30 };
  assert.throws(() => vueDuBac(A, { cran: 'pretes', theme: 'annees80', choisie: etrange }));
  const vue = vueDuBac({ ...A, encrier: indulgent }, { cran: 'pretes', theme: 'annees80', choisie: etrange });
  assert.ok(vue.objets.some((o) => o.nom === 'etiquette-choisie'));
  assert.equal(indulgent.ecrivable('Ωmega'), `${indulgent.ecrivable('Ω')}mega`);
});

const PREPARATIFS: Preparatifs = {
  mode: 'libre',
  pistes: 10,
  extrait: 20,
  son: 'tous',
  commandes: true,
  playlist: 'essai:tubes',
  chercher: true,
  listes: TEXTES.pochette,
  graine: 1,
};
const auBac = (cran: 'pretes' | 'chercher' | 'laMienne'): Memoire => ({
  ...MEMOIRE_VIDE,
  preparation: { ecran: 'bac', pochette: pochetteDExemple(TEXTES), cran, bac: BAC_VIDE },
});
const bacDe = (m: Memoire) => (m.preparation.ecran === 'bac' ? m.preparation.bac : undefined);
const SOIREE = { lien: 'deezer:4242', titre: 'Soirée 2000', total: 24 };

test('dans le bac, un thème cherche ses playlists et prend la première ; une recherche montre ce qu’elle trouve, et l’on en touche une', () => {
  let s = toucher(auBac('pretes'), { genre: 'theme', cle: 'annees80', recherche: 'Années 80' }, 0, PREPARATIFS);
  assert.deepEqual(s.actions, [{ genre: 'chercher', recherche: 'Années 80' }]);
  let m = recevoir(s.memoire, { genre: 'playlists', heure: 1, recherche: 'Années 80', playlists: [SOIREE] });
  assert.deepEqual(bacDe(m)?.choisie, SOIREE);
  // Une réponse à une autre recherche, ou qui arrive quand on a changé de cran, ne change rien.
  assert.equal(recevoir(s.memoire, { genre: 'playlists', heure: 1, recherche: 'Rock', playlists: [SOIREE] }), s.memoire);

  m = saisir(auBac('chercher'), 'soirée');
  s = valider(m, 0, PREPARATIFS);
  assert.deepEqual(s.actions, [{ genre: 'chercher', recherche: 'soirée' }]);
  m = recevoir(s.memoire, {
    genre: 'playlists',
    heure: 1,
    recherche: 'soirée',
    playlists: [SOIREE, { ...SOIREE, lien: 'deezer:1', titre: 'Autre' }],
  });
  m = toucher(m, { genre: 'resultat', rang: 1 }, 2, PREPARATIFS).memoire;
  assert.equal(bacDe(m)?.choisie?.lien, 'deezer:1');
  m = toucher(m, { genre: 'choisir' }, 3, PREPARATIFS).memoire;
  assert.equal(m.preparation.ecran === 'reglages' ? m.preparation.playlist : undefined, 'deezer:1');
});

test('dans le bac, un lien collé part ; trop courte, Spotify privée ou introuvable, on le dit ; changer de cran abandonne ce qu’on attendait', () => {
  let m = saisir(auBac('laMienne'), 'https://open.spotify.com/playlist/1a2B3c4D5e6F7g8H9i0JkL');
  const s = valider(m, 0, PREPARATIFS);
  assert.deepEqual(s.actions, [{ genre: 'importer', lien: 'https://open.spotify.com/playlist/1a2B3c4D5e6F7g8H9i0JkL' }]);
  m = s.memoire;
  assert.equal(
    recevoir(m, { genre: 'refus', heure: 1, raison: 'spotify' }).preparation.ecran === 'bac' &&
      bacDe(recevoir(m, { genre: 'refus', heure: 1, raison: 'spotify' }))?.refus,
    'spotify',
  );
  const courte = recevoir(m, { genre: 'importee', heure: 1, playlist: { lien: 'spotify:x', titre: 'Courte', total: 5, jouables: 4 } });
  assert.deepEqual([bacDe(courte)?.refus, bacDe(courte)?.choisie], ['tropCourt', undefined]);
  const bonne = recevoir(m, { genre: 'importee', heure: 1, playlist: { lien: 'spotify:x', titre: 'Ma soirée', total: 22, jouables: 21 } });
  assert.deepEqual([bacDe(bonne)?.refus, bacDe(bonne)?.choisie?.lien], [undefined, 'spotify:x']);
  // On passe à la recherche avant la réponse : on ne l'attend plus, et elle ne change rien.
  const ailleurs = toucher(m, { genre: 'cranDuBac', cran: 'chercher' }, 1, PREPARATIFS).memoire;
  assert.equal(bacDe(ailleurs)?.enAttente, undefined);
  assert.equal(
    recevoir(ailleurs, { genre: 'importee', heure: 2, playlist: { lien: 'spotify:x', titre: 'Ma soirée', total: 22, jouables: 21 } }),
    ailleurs,
  );
});
