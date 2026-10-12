/** La danse des aiguilles des vumètres d'un ampli allumé. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detendre } from '../src/mouvement/ressort';
import type { Piste } from '../src/regles/piste';
import { AMPLI } from '../src/ressources/ampli';
import { DANSE_DES_AIGUILLES as D, MATIERES } from '../src/ressources/mouvement';
import { aiguillesA, partitionDesAiguilles } from '../src/scene/ampli/danse';
import { angleDeLAiguille } from '../src/scene/ampli/vumetre';

const PISTE: Piste = { duree: 20, decompteA: 0, extraitA: 3 };
const REVELEE: Piste = {
  ...PISTE,
  revelation: { a: 9, reponse: { titre: 'T', artiste: 'A', pochette: { vignette: { fond: 'miel', motif: 'rayons' } } } },
};
/** Le temps qu'un ressort met à faire 98 % du chemin, depuis l'arrêt. */
const arrivee = (r: { raideur: number; amortissement: number; masse: number }): number => {
  for (let t = 0; t < 2; t += 0.001) if (Math.abs(detendre(r, { ecart: 1, vitesse: 0 }, t).ecart) < 0.02) return t;
  return Infinity;
};

test('les aiguilles sont nerveuses : elles montent en 80 ms, retombent en 300 ms', () => {
  assert.ok(Math.abs(arrivee(MATIERES.aiguille.monte) - 0.08) < 0.015, `montée en ${arrivee(MATIERES.aiguille.monte)} s`);
  assert.ok(Math.abs(arrivee(MATIERES.aiguille.retombe) - 0.3) < 0.03, `retombée en ${arrivee(MATIERES.aiguille.retombe)} s`);
});

test('au repos, la gauche respire, à peine ; à l’extrait, elles sursautent ensemble', () => {
  const repos = Array.from({ length: 12 }, (_, i) => aiguillesA(PISTE, 0.2 * i));
  assert.ok(
    repos.every(([g, d]) => g <= D.respire.place + 0.01 && d < 0.001),
    'au repos, rien ne danse',
  );
  assert.ok(new Set(repos.map(([g]) => g.toFixed(3))).size > 3, 'la gauche respire');
  const [g, d] = aiguillesA(PISTE, 3 + D.sursaut.duree * 0.6);
  assert.ok(g > D.sursaut.place * 0.9 && d > D.sursaut.place * 0.9, `sursaut à ${g.toFixed(2)} et ${d.toFixed(2)}`);
});

test('pendant l’extrait elles dansent, chacune la sienne ; dans les 5 dernières secondes, elles sont dans le rouge', () => {
  const { rouge } = AMPLI.vumetres.echelle;
  const valeurs = Array.from({ length: 40 }, (_, i) => aiguillesA(PISTE, 4 + i * 0.25));
  for (const [g, d] of valeurs) assert.ok(g > 0.2 && g < 0.9 && d > 0.2 && d < 0.9, `${g.toFixed(2)}, ${d.toFixed(2)}`);
  assert.ok(
    valeurs.some(([g, d]) => Math.abs(g - d) > 0.08),
    'la gauche et la droite ne vont pas ensemble',
  );
  for (const avantLaFin of [4.5, 3, 1.5, 0.4]) {
    const [g2, d2] = aiguillesA(PISTE, 3 + PISTE.duree - avantLaFin);
    for (const v of [g2, d2])
      assert.ok(angleDeLAiguille(v) > rouge.de, `${avantLaFin} s avant la fin, l’aiguille est à ${angleDeLAiguille(v).toFixed(1)}°`);
  }
});

test('une mauvaise réponse les fait piquer, puis la danse reprend', () => {
  const [g, d] = aiguillesA(PISTE, 7.1, [7]);
  assert.ok(g > D.pic.place * 0.93 && d > D.pic.place * 0.93, `pic à ${g.toFixed(2)}, ${d.toFixed(2)}`);
  const [g2] = aiguillesA(PISTE, 7.6, [7]);
  assert.ok(g2 < 0.85, 'elle est redescendue danser');
});

test('à la révélation, elles retombent au repos, et la danse ne reprend pas', () => {
  const [g, d] = aiguillesA(REVELEE, 9.6);
  assert.ok(g < D.respire.place + 0.02 && d < 0.02, `${g.toFixed(3)}, ${d.toFixed(3)}`);
  assert.ok((partitionDesAiguilles(REVELEE).instants.at(-1) ?? 0) <= 9, 'aucune cible après la révélation');
});

test('le même extrait danse toujours de la même façon : tous les écrans voient les mêmes aiguilles', () => {
  assert.deepEqual(aiguillesA(PISTE, 7.3), aiguillesA(PISTE, 7.3));
});
