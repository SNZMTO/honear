import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectangle } from '../src/lowpoly/contours';
import { tonDuFlanc } from '../src/lowpoly/ombrage';
import { surLEcran } from '../src/lowpoly/projection';
import { aplat, type Calque } from '../src/scene/calque';
import { pile, tranche } from '../src/scene/pile';

const CARTON = rectangle(-20, -20, 40, 40);
const hauteurs = (niveaux: readonly { hauteur: number }[]): number[] => niveaux.map((n) => n.hauteur);
const sousCalques = (c: Calque): Calque[] => c.contenu.flatMap((d) => (d.genre === 'calque' ? [d] : []));

test('une tranche répète la silhouette de niveau en niveau, comptés depuis le haut, et finit au pied', () => {
  const niveaux = tranche({ de: 0, a: 3, silhouettes: [CARTON], teinte: 'creme' });
  assert.deepEqual(hauteurs(niveaux), [0, 0.75, 1.5, 2.25], 'du bas vers le haut, sans le dessus : c’est l’étage du haut qui le dessine');
  for (const niveau of niveaux) {
    assert.equal(niveau.nom, undefined);
    assert.deepEqual(niveau.contenu, [aplat([CARTON], 'creme', tonDuFlanc())], 'dans le ton que la lampe donne à un flanc tourné vers le joueur');
  }
  // Une épaisseur qui ne tombe pas juste : les niveaux restent sur la grille du haut, le pied est où on l'a demandé.
  assert.deepEqual(
    hauteurs(tranche({ de: 1, a: 3.2, silhouettes: [CARTON], teinte: 'creme' })).map((h) => Math.round(h * 100) / 100),
    [1, 1.7, 2.45],
  );
  // Plus fine qu'un pas : un seul niveau, au pied.
  assert.deepEqual(hauteurs(tranche({ de: 2.6, a: 3, silhouettes: [CARTON], teinte: 'creme' })), [2.6]);
});

test('une pile range ses étages du bas vers le haut, et réunit les niveaux sans nom qui sont à la même hauteur', () => {
  const dessus = aplat([CARTON], 'miel');
  const p = pile('bras', {
    centre: [100, 50],
    angle: 30,
    etages: [
      { nom: 'dessus', hauteur: 3, contenu: [dessus] },
      // Deux tranches de même sommet partagent leurs niveaux : 2,25 et 1,5 n'en font qu'un chacun.
      ...tranche({ de: 0, a: 3, silhouettes: [CARTON], teinte: 'alu' }),
      ...tranche({ de: 1.2, a: 3, silhouettes: [rectangle(0, 0, 5, 5)], teinte: 'alu' }),
    ],
  });
  const etages = sousCalques(p);
  assert.deepEqual(
    etages.map((e) => e.nom),
    ['bras/niveau-1', 'bras/niveau-2', 'bras/niveau-3', 'bras/niveau-4', 'bras/niveau-5', 'bras/dessus'],
  );
  assert.deepEqual(
    etages.map((e) => sousCalques(e)[0]?.contenu.length),
    [1, 1, 1, 2, 2, 1],
    'les niveaux 1,5 et 2,25 portent les deux silhouettes',
  );
  // Deux étages nommés à la même hauteur restent deux étages, dans l'ordre où on les a donnés.
  const deux = pile('etiquette', {
    centre: [0, 0],
    angle: 0,
    etages: [
      { nom: 'papier', hauteur: 2, contenu: [dessus] },
      { nom: 'encre', hauteur: 2, contenu: [dessus] },
    ],
  });
  assert.deepEqual(
    sousCalques(deux).map((e) => e.nom),
    ['etiquette/papier', 'etiquette/encre'],
  );
});

test('chaque étage d’une pile est posé à sa hauteur, écrasé, et son calque enfant tourne : la pile tourne rond', () => {
  const p = pile('pochette-essai', {
    role: 'image',
    centre: [100, 50],
    angle: -4,
    etages: [...tranche({ de: 0, a: 3, silhouettes: [CARTON], teinte: 'creme' }), { nom: 'imprime', hauteur: 3, contenu: [aplat([CARTON], 'miel')] }],
  });
  assert.equal(p.role, 'image');
  assert.equal(p.transformations, undefined, 'la pile elle-même ne porte aucune transformation : on règle ses étages');
  const etages = sousCalques(p);
  assert.equal(etages.length, 5);
  etages.forEach((etage, rang) => {
    const hauteur = [0, 0.75, 1.5, 2.25, 3][rang] ?? NaN;
    assert.deepEqual(etage.transformations, [{ genre: 'glisser', de: surLEcran([100, 50], hauteur) }, { genre: 'ecraser' }], etage.nom);
    const [tourne] = sousCalques(etage);
    assert.equal(tourne?.nom, `${etage.nom}/tourne`);
    assert.deepEqual(tourne?.transformations, [{ genre: 'tourner', de: -4 }]);
  });
  // À l'écran, la tranche descend droit vers le bas, quel que soit l'angle : chaque niveau est 0,75 px sous le suivant.
  const [bas, suivant] = etages.map((e) => e.transformations?.[0]);
  assert.ok(bas?.genre === 'glisser' && suivant?.genre === 'glisser');
  assert.deepEqual([suivant.de[0] - bas.de[0], Math.round((bas.de[1] - suivant.de[1]) * 100) / 100], [0, 0.75]);
  assert.equal(pile('bras', { centre: [0, 0], angle: 0, etages: [] }).role, undefined, 'sans rôle donné, c’est un simple groupe');
});
