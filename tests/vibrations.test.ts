/** Les vibrations : une courte à une bonne réponse, une brève à chaque cran du volume, et rien sur un téléphone qui ne vibre pas. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creerLeVibreur } from '../src/ecran/vibreur';
import { VIBRATIONS } from '../src/ressources/vibrations';

test('une bonne réponse vibre court, un cran du volume encore plus bref', () => {
  const total = (motif: readonly number[]): number => motif.reduce((s, d) => s + d, 0);
  assert.ok(total(VIBRATIONS.bonneReponse) <= 40 && total(VIBRATIONS.cranDuVolume) < total(VIBRATIONS.bonneReponse));
});

test('le vibreur passe le motif au téléphone, et ne fait rien sur un téléphone qui ne sait pas vibrer', () => {
  const recus: number[][] = [];
  creerLeVibreur({ vibrate: (m) => (recus.push(m), true) }).vibrer('bonneReponse');
  assert.deepEqual(recus, [[...VIBRATIONS.bonneReponse]]);
  assert.doesNotThrow(() => creerLeVibreur({}).vibrer('cranDuVolume'));
});
