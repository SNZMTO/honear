import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle } from '../src/lowpoly/contours';
import { depuisLEcran, estVisible, hauteurPour, projeter, surLEcran } from '../src/lowpoly/projection';
import type { Vec3 } from '../src/lowpoly/vecteurs';

test('un cercle devient une ellipse de 1 × 0,88', () => {
  const ellipse = cercle([0, 0], 100, 96).map((p) => projeter([p[0], p[1], 0]));
  const etendue = (axe: 0 | 1): number => Math.max(...ellipse.map((p) => p[axe])) - Math.min(...ellipse.map((p) => p[axe]));
  const [largeur, hauteur] = [etendue(0), etendue(1)];
  assert.ok(Math.abs(largeur - 200) < 0.2);
  assert.ok(Math.abs(hauteur / largeur - 0.88) < 0.002);
});

test('les objets sont extrudés droit vers le bas, sans point de fuite', () => {
  for (const point of [
    [0, 0],
    [300, 50],
    [-80, 400],
  ] as const) {
    const pied = projeter([point[0], point[1], 0]);
    const tete = projeter([point[0], point[1], hauteurPour(16)]);
    assert.equal(tete[0], pied[0], 'le haut est à la verticale du bas');
    assert.ok(Math.abs(pied[1] - tete[1] - 16) < 1e-9, 'une épaisseur de 16 px fait 16 px à l’écran, partout');
  }
});

test('poser un point à l’écran et le reprendre sur le meuble sont deux gestes inverses', () => {
  for (const hauteur of [0, 6, 16]) {
    const [x, y] = depuisLEcran(surLEcran([312, 187], hauteur), hauteur);
    assert.ok(Math.abs(x - 312) < 1e-9 && Math.abs(y - 187) < 1e-9);
  }
  const dansLEspace = projeter([120, 80, hauteurPour(10)]);
  const aPlat = surLEcran([120, 80], 10);
  assert.ok(
    Math.abs(dansLEspace[0] - aPlat[0]) < 1e-9 && Math.abs(dansLEspace[1] - aPlat[1]) < 1e-9,
    'les deux écritures de la projection donnent le même point',
  );
});

test('on voit le dessus et les flancs tournés vers le joueur, jamais le dos ni les côtés', () => {
  const visibles: Vec3[] = [
    [0, 0, 1],
    [0, 1, 0],
    [0.7, 0.7, 0],
    [0, -1, 1],
  ];
  const caches: Vec3[] = [
    [0, -1, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, -1],
  ];
  for (const n of visibles) assert.ok(estVisible(n));
  for (const n of caches) assert.ok(!estVisible(n));
});
