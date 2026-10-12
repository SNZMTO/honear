import assert from 'node:assert/strict';
import { test } from 'node:test';
import { anneau, arc, cercle, rayonRentre, rectangle, rectangleArrondi, trait } from '../src/lowpoly/contours';
import { aireSignee, anglesInterieurs, decouper, enveloppeConvexe, orienter, placer, plusPetitAngle, rentrer } from '../src/lowpoly/polygones';
import { distance, plus, type Vec2 } from '../src/lowpoly/vecteurs';

const CARRE = rectangle(0, 0, 10, 10);
const proche = (p: Vec2, q: Vec2): boolean => distance(p, q) < 1e-9;

test('un rectangle est donné par un coin et ses deux côtés, dans le sens de toutes les facettes dessinées', () => {
  assert.deepEqual(rectangle(2, 3, 10, 4), [
    [2, 3],
    [12, 3],
    [12, 7],
    [2, 7],
  ]);
  assert.equal(aireSignee(rectangle(2, 3, 10, 4)), 40);
  assert.deepEqual(anglesInterieurs(CARRE), [90, 90, 90, 90]);
  assert.equal(plusPetitAngle(CARRE), 90);
});

test('un rectangle arrondi garde son encombrement, n’a aucun sommet en double, et redevient droit sans rayon', () => {
  const arrondi = rectangleArrondi(0, 0, 100, 60, 8, 4);
  assert.equal(arrondi.length, 4 * 5);
  assert.deepEqual([Math.min(...arrondi.map((p) => p[0])), Math.max(...arrondi.map((p) => p[0]))], [0, 100]);
  assert.deepEqual([Math.min(...arrondi.map((p) => p[1])), Math.max(...arrondi.map((p) => p[1]))], [0, 60]);
  assert.ok(aireSignee(arrondi) > 0 && aireSignee(arrondi) < 6000);
  assert.ok(plusPetitAngle(arrondi) > 150, 'chaque coin est découpé en petits pans, sans angle vif');
  assert.deepEqual(rectangleArrondi(0, 0, 100, 60, 0, 4), rectangle(0, 0, 100, 60));
  // Un rayon plus grand que le demi-côté est ramené à ce demi-côté : le rectangle devient une pastille, sans se retourner.
  assert.ok(aireSignee(rectangleArrondi(0, 0, 100, 20, 50, 4)) > 0);
});

test('un arc a toujours au moins un segment, ses deux extrémités comprises', () => {
  assert.equal(arc([0, 0], 10, 0, 90, 4).length, 5);
  const [debut, fin] = arc([0, 0], 10, 0, 90, 0);
  assert.ok(debut !== undefined && fin !== undefined && proche(debut, [10, 0]) && proche(fin, [0, 10]), 'sans segment demandé, il en garde un');
  assert.equal(arc([0, 0], 10, 0, 90, 0).length, 2);
});

test('un rond est un polygone régulier ; un anneau, deux ronds de sens opposés', () => {
  const rond = cercle([5, 5], 10, 16);
  assert.equal(rond.length, 16);
  for (const p of rond) assert.ok(Math.abs(distance(p, [5, 5]) - 10) < 1e-9);
  assert.ok(aireSignee(rond) > 0);
  const [dehors, dedans] = anneau([0, 0], 10, 6, 24);
  assert.ok(dehors !== undefined && dedans !== undefined);
  assert.ok(aireSignee(dehors) > 0 && aireSignee(dedans) < 0, 'dessinés ensemble, ils laissent un trou');
  // Le bord intérieur d'un chanfrein : les côtés du polygone rentrent de la largeur demandée, mesurée en travers.
  const rentreDe2 = cercle([0, 0], rayonRentre(10, 2, 16), 16);
  const apotheme = (p: readonly Vec2[]): number =>
    distance([0, 0], [((p[0]?.[0] ?? 0) + (p[1]?.[0] ?? 0)) / 2, ((p[0]?.[1] ?? 0) + (p[1]?.[1] ?? 0)) / 2]);
  assert.ok(Math.abs(apotheme(cercle([0, 0], 10, 16)) - apotheme(rentreDe2) - 2) < 1e-9);
});

test('un trait épais a les bouts ronds, quelle que soit sa direction', () => {
  for (const points of [
    [
      [0, 0],
      [20, 0],
    ],
    [
      [0, 0],
      [0, 20],
    ],
    [
      [0, 0],
      [8, -3],
      [16, 0],
    ],
  ] as const) {
    const forme = trait(points, 4);
    assert.ok(aireSignee(forme) > 0);
    assert.ok(plusPetitAngle(forme) > 90, `plus petit angle : ${plusPetitAngle(forme).toFixed(0)}°`);
  }
});

test('orienter remet un polygone dans le sens positif, sans toucher à celui qui y est déjà', () => {
  const aLEnvers = [...CARRE].reverse();
  assert.ok(aireSignee(aLEnvers) < 0);
  assert.equal(aireSignee(orienter(aLEnvers)), 100);
  assert.deepEqual(orienter(CARRE), CARRE);
});

test('rentrer un polygone convexe le rapproche de son centre de la distance demandée', () => {
  assert.deepEqual(
    rentrer(CARRE, 2).map(([x, y]) => [Math.round(x * 1e9) / 1e9, Math.round(y * 1e9) / 1e9]),
    rectangle(2, 2, 6, 6),
  );
  assert.deepEqual(
    rentrer([...CARRE].reverse(), 2).map(([x, y]) => [Math.round(x * 1e9) / 1e9, Math.round(y * 1e9) / 1e9]),
    rectangle(2, 2, 6, 6).reverse(),
    'dans un sens comme dans l’autre',
  );
});

test('découper garde ce qui tombe dans la fenêtre, et rien quand il ne reste rien', () => {
  const moitie = decouper(CARRE, rectangle(5, -5, 20, 20));
  assert.equal(Math.abs(aireSignee(moitie)), 50);
  assert.deepEqual(decouper(CARRE, rectangle(-5, -5, 30, 30)), CARRE, 'ce qui est tout entier dedans ne change pas');
  assert.deepEqual(decouper(CARRE, rectangle(20, 20, 5, 5)), [], 'ce qui est tout entier dehors disparaît');
  assert.deepEqual(decouper(CARRE, rectangle(10, 0, 5, 10)), [], 'toucher par une arête ne laisse aucune surface');
  // La fenêtre peut être donnée dans un sens ou dans l'autre.
  assert.equal(Math.abs(aireSignee(decouper(CARRE, rectangle(5, -5, 20, 20).reverse()))), 50);
});

test('placer agrandit, puis tourne, puis déplace', () => {
  const [coin] = placer([[1, 0]], { echelle: 2, angle: 90, en: [10, 10] });
  assert.ok(coin !== undefined && proche(coin, [10, 12]));
  const [aplati] = placer([[1, 1]], { echelle: [2, 0.5] });
  assert.ok(aplati !== undefined && proche(aplati, [2, 0.5]));
});

test('l’enveloppe convexe est la trace d’une forme qu’on fait glisser : c’est elle qui dessine l’ombre au pied d’un objet', () => {
  // Des points dedans ou sur les bords ne changent rien.
  const avecDuRemplissage: Vec2[] = [...CARRE, [5, 5], [2, 7], [5, 0], [10, 5]];
  const enveloppe = enveloppeConvexe(avecDuRemplissage);
  assert.equal(enveloppe.length, 4);
  assert.equal(aireSignee(enveloppe), 100, 'dans le sens de toutes les facettes dessinées');
  for (const coin of CARRE) assert.ok(enveloppe.some((p) => proche(p, coin)));

  // Un carré glissé en biais laisse un hexagone : ses deux coins extrêmes, deux fois, et un coin de chaque côté.
  const glisse = enveloppeConvexe([...CARRE, ...CARRE.map((p) => plus(p, [6, 4]))]);
  assert.equal(glisse.length, 6);
  assert.equal(aireSignee(glisse), 100 + 10 * 6 + 10 * 4);
  for (const angle of anglesInterieurs(glisse)) assert.ok(angle < 180, 'convexe');

  // Deux points ou moins : rien à envelopper, ils sont rendus tels quels.
  assert.equal(enveloppeConvexe([[3, 3]]).length, 1);
});
