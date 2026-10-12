/**
 * L'heure du serveur, vue d'un téléphone : l'écart se déduit de chaque question et de sa réponse, en comptant l'aller aussi long que
 * le retour ; parmi les derniers échantillons, on garde celui que le réseau a le moins retardé. Sur un réseau qui hoquette, le
 * téléphone se cale ainsi à quelques millisecondes du serveur.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { heureDuServeur } from '../src/ecran/telephone/heure';
import { hasard } from '../src/lowpoly/aleatoire';
import { TELEPHONE } from '../src/ressources/ecran';

test('l’écart se lit à la moitié de l’aller-retour, et zéro tant qu’on ne sait rien', () => {
  const h = heureDuServeur();
  assert.equal(h.ecart, 0);
  assert.equal(h.aPres, Infinity);
  // Le téléphone est à 10 s, le serveur à 110 s ; l'aller et le retour prennent 40 ms chacun.
  h.noter({ depart: 10, retour: 10.08, serveur: 110.04 });
  assert.ok(Math.abs(h.ecart - 100) < 1e-9);
  assert.ok(Math.abs(h.aPres - 0.08) < 1e-9);
});

test('sur un réseau qui hoquette, on garde l’échantillon le plus rapide, et l’on suit la dérive des derniers seulement', () => {
  const h = heureDuServeur();
  const tirage = hasard(11).suivant;
  const ECART = 42.5;
  // L'aller et le retour tirés au sort, de 15 à 400 ms chacun, jamais pareils : une réponse sur quatre arrive vite.
  for (let n = 0; n < 40; n++) {
    const depart = n;
    const aller = n % 4 === 0 ? 0.015 : 0.015 + tirage() * 0.385;
    const retour = n % 4 === 0 ? 0.017 : 0.015 + tirage() * 0.385;
    h.noter({ depart, retour: depart + aller + retour, serveur: depart + aller + ECART });
  }
  assert.ok(Math.abs(h.ecart - ECART) < 0.002, `écart ${h.ecart}`);
  assert.ok(h.aPres < 0.05);
  // Le serveur a été redémarré : son heure repart d'ailleurs. Au bout des derniers échantillons, le téléphone l'a suivi.
  for (let n = 0; n < TELEPHONE.horloge.echantillons; n++) h.noter({ depart: 100 + n, retour: 100.1 + n, serveur: 5.05 + n });
  assert.ok(Math.abs(h.ecart - (5.05 - 100.05)) < 1e-9);
});

test('une réponse revenue avant d’être partie ne vient pas de cette horloge : elle est oubliée', () => {
  const h = heureDuServeur();
  h.noter({ depart: 5, retour: 5.02, serveur: 7.01 });
  h.noter({ depart: 6, retour: 5.9, serveur: 1000 });
  assert.ok(Math.abs(h.ecart - 2) < 1e-9);
});
