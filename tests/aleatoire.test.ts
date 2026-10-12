import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { DENSITES } from '../src/ressources/densites';
import { dessinerLeMeuble, regardSurLaPlatine } from '../src/scene/meuble';

test('le hasard du rendu est reproductible : le même germe redonne la même suite, un autre germe une autre', () => {
  const suite = (germe: number): number[] => {
    const tirage = hasard(germe);
    return Array.from({ length: 200 }, () => tirage.suivant());
  };
  assert.deepEqual(suite(1975), suite(1975));
  assert.notDeepEqual(suite(1975), suite(1976));
  for (const valeur of suite(7)) assert.ok(valeur >= 0 && valeur < 1);
  const moyenne = suite(7).reduce((somme, valeur) => somme + valeur, 0) / 200;
  assert.ok(moyenne > 0.4 && moyenne < 0.6, `moyenne ${moyenne.toFixed(2)} : les tirages se répartissent`);
  const tirage = hasard(3);
  for (let i = 0; i < 100; i++) {
    const valeur = tirage.entre(-2, 5);
    assert.ok(valeur >= -2 && valeur < 5);
  }
});

test('les veines du noyer ne changent pas d’un dessin à l’autre : recharger la page ne redessine pas le meuble', () => {
  const regard = regardSurLaPlatine();
  for (const densite of Object.values(DENSITES)) {
    assert.deepEqual(dessinerLeMeuble({ regard, densite, objets: [] }), dessinerLeMeuble({ regard, densite, objets: [] }), densite.cle);
  }
});
