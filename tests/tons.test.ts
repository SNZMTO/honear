import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contraste, okLabDepuisHex } from '../src/lowpoly/couleur';
import { cinqTons, TEINTES, TON_DE_BASE } from '../src/lowpoly/tons';
import { PALETTE, REGLAGE_DES_TONS, type NomDeTeinte } from '../src/ressources/palette';

const noms = Object.keys(PALETTE) as NomDeTeinte[];

test('le ton 2 de chaque couleur est sa valeur de base', () => {
  for (const nom of noms) assert.equal(TEINTES[nom][TON_DE_BASE], PALETTE[nom].toUpperCase());
});

test('les 5 tons vont du plus sombre au plus clair, par petits pas', () => {
  for (const nom of noms) {
    const clartes = TEINTES[nom].map((hex) => okLabDepuisHex(hex).l);
    for (let i = 1; i < clartes.length; i++) {
      const pas = (clartes[i] ?? 0) - (clartes[i - 1] ?? 0);
      assert.ok(pas > 0.004, `${nom} : le ton ${i} n'est pas plus clair que le ton ${i - 1}`);
      assert.ok(pas <= REGLAGE_DES_TONS.pas + 0.004, `${nom} : le ton ${i} est trop loin du ton ${i - 1} (${pas.toFixed(3)})`);
    }
  }
});

test('ni noir pur ni blanc pur, nulle part', () => {
  for (const nom of noms) {
    for (const hex of TEINTES[nom]) {
      assert.notEqual(hex, '#000000', `${nom} contient du noir pur`);
      assert.notEqual(hex, '#FFFFFF', `${nom} contient du blanc pur`);
    }
  }
});

test('deux tons voisins ne claquent jamais : contraste inférieur à 1,35', () => {
  for (const nom of noms) {
    const tons = TEINTES[nom];
    for (let i = 1; i < tons.length; i++) {
      const rapport = contraste(tons[i] ?? '', tons[i - 1] ?? '');
      assert.ok(rapport < 1.35, `${nom} : tons ${i - 1} et ${i} à ${rapport.toFixed(2)}`);
    }
  }
});

test('les tons se recalculent à l’identique', () => {
  assert.deepEqual(cinqTons(PALETTE.miel), TEINTES.miel);
});
