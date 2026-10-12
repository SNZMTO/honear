/**
 * Les contrôles du rendu voient bien ce qu'ils disent voir : chaque défaut que le brief demande de traquer,
 * fabriqué exprès, donne son constat ; et le même dessin, corrigé, n'en donne plus.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectangle } from '../src/lowpoly/contours';
import type { FacettePeinte } from '../src/lowpoly/facette';
import { plusPetitAngle, type Polygone } from '../src/lowpoly/polygones';
import type { IndiceDeTon } from '../src/lowpoly/tons';
import type { NomDeTeinte } from '../src/ressources/palette';
import { CORPS } from '../src/ressources/typo';
import { aplat, calque, peinture, type Calque, type Dessin, type RoleDeCalque, type Texte } from '../src/scene/calque';
import { controler, LIMITES, type Constat } from '../src/scene/rendu/controle';
import { inventaire, poidsTotal } from '../src/scene/rendu/inventaire';

const facette = (contour: Polygone, ton: IndiceDeTon, teinte: NomDeTeinte = 'alu'): FacettePeinte => ({
  contour,
  teinte,
  ton,
  angle: plusPetitAngle(contour),
});
const scene = (contenu: readonly Dessin[], role: RoleDeCalque = 'decor'): Calque => calque('legende', contenu, { role });
const regles = (c: Calque): Constat['regle'][] => controler(c).constats.map((constat) => constat.regle);
const texte = (corps: number): Texte => ({
  genre: 'texte',
  contenu: 'Face A',
  role: 'technique',
  corps,
  en: [0, 0],
  ancrage: 'debut',
  teinte: 'creme',
  ton: 2,
  fond: { teinte: 'laque' },
});
/** Des petits carreaux côte à côte, tous du même ton : de quoi peser, sans autre défaut. */
const carreaux = (nombre: number): Dessin =>
  peinture(Array.from({ length: nombre }, (_, i) => facette(rectangle((i % 100) * 3, Math.floor(i / 100) * 3, 3, 3), 2)));

test('deux facettes voisines d’une même teinte qui claquent sont relevées : plus de deux tons d’écart', () => {
  const [gauche, droite] = [rectangle(0, 0, 10, 10), rectangle(10, 0, 10, 10)];
  assert.deepEqual(regles(scene([peinture([facette(gauche, 0), facette(droite, 3)])])), ['voisines']);
  assert.deepEqual(regles(scene([peinture([facette(gauche, 0), facette(droite, 2)])])), [], 'deux tons d’écart : une arête franche, admise');
  assert.deepEqual(
    regles(scene([peinture([facette(gauche, 0, 'alu'), facette(droite, 4, 'laque')])])),
    [],
    'deux matières différentes ne se comparent pas',
  );
  assert.deepEqual(
    regles(scene([peinture([facette(gauche, 0), facette(rectangle(12, 0, 10, 10), 4)])])),
    [],
    'sans arête commune, elles ne sont pas voisines',
  );
  // Ce qui a été mesuré pour en juger est rendu avec les constats.
  const mesure = controler(scene([peinture([facette(gauche, 1), facette(droite, 3), facette(rectangle(20, 0, 10, 10), 3)])]));
  assert.deepEqual(mesure.ecartsDeTon, [1, 0, 1, 0, 0]);
  assert.ok(mesure.plusFortContraste > 1.2 && mesure.plusFortContraste < 2, mesure.plusFortContraste.toFixed(2));
});

test('une pointe en lame est relevée, sur une facette comme sur un aplat ; une miette qu’on ne voit pas ne l’est pas', () => {
  const lame: Polygone = [
    [0, 0],
    [40, 0],
    [40, 4],
  ];
  assert.ok(plusPetitAngle(lame) < LIMITES.angle);
  assert.deepEqual(regles(scene([peinture([facette(lame, 2)])])), ['pointe']);
  assert.deepEqual(regles(scene([aplat([lame], 'creme')])), ['pointe']);
  const miette: Polygone = [
    [0, 0],
    [4, 0],
    [4, 0.4],
  ];
  assert.deepEqual(regles(scene([peinture([facette(miette, 2)])])), [], 'moins de 3 px² : personne ne voit ses angles');
  const franche: Polygone = [
    [0, 0],
    [40, 0],
    [40, 20],
  ];
  assert.deepEqual(regles(scene([peinture([facette(franche, 2)])])), []);
});

test('une ombre qui ne part pas vers le bas à droite est relevée, comme un palier qui repasse sous sa pièce ou dépasse sa portée', () => {
  const ombre = (portee: readonly [number, number] | undefined, retrait: readonly [number, number] | null = [0, 0]): Calque =>
    calque(
      'bras/ombre',
      [
        calque(
          'bras/ombre/palier-1',
          [aplat([rectangle(0, 0, 10, 10)], 'expresso', 0, 0.17)],
          retrait !== null ? { transformations: [{ genre: 'glisser', de: retrait }] } : {},
        ),
      ],
      {
        role: 'ombre',
        transformations: [{ genre: 'glisser', de: [200, 100] }, ...(portee !== undefined ? [{ genre: 'glisser', de: portee } as const] : [])],
      },
    );
  assert.deepEqual(regles(ombre([3, 2])), []);
  assert.deepEqual(regles(ombre([3, 2], [-1, -0.5])), [], 'un palier en retrait reste entre la pièce et la portée');
  assert.deepEqual(regles(ombre([-3, 2])), ['ombre'], 'vers la gauche');
  assert.deepEqual(regles(ombre([3, -2])), ['ombre'], 'vers le haut');
  assert.deepEqual(regles(ombre([0, 0])), ['ombre'], 'collée sous sa pièce : elle ne dit plus de hauteur');
  assert.deepEqual(regles(ombre([3, 2], [-3, -2])), ['ombre'], 'un palier revenu sous la pièce');
  assert.deepEqual(regles(ombre([3, 2], [1, 1])), ['ombre'], 'un palier plus loin que la portée');
  assert.deepEqual(regles(ombre([3, 2], null)), ['ombre'], 'un palier sans retrait à régler');
  // Sans portée, la seule transformation du calque est sa place sur le meuble : ce n'est pas une ombre qui dit une hauteur.
  assert.deepEqual(regles(ombre(undefined)), ['ombre'], 'posée, mais sans portée');
  // Une ombre cachée ne dit rien : sa pièce n'est pas là, ou ne dépasse pas encore. On la jugera quand on la verra.
  assert.deepEqual(regles({ ...ombre([0, 0]), opacite: 0 }), []);
  assert.deepEqual(regles(calque('axe/pointe', [ombre([0, 0])], { role: 'mobile', opacite: 0 })), [], 'cachée avec sa pièce');
  assert.deepEqual(regles(calque('axe/pointe', [ombre([0, 0])], { role: 'mobile' })), ['ombre']);
});

test('un texte illisible est relevé : trop petit debout, ou trop petit une fois couché sur le meuble', () => {
  assert.deepEqual(regles(scene([texte(CORPS.gravure)])), []);
  assert.deepEqual(regles(scene([texte(9)])), ['texte']);
  const couche = (corps: number): Calque => scene([calque('legende/plan', [texte(corps)], { transformations: [{ genre: 'ecraser' }] })]);
  assert.deepEqual(regles(scene([texte(11)])), [], '11 px debout se lisent');
  assert.deepEqual(regles(couche(11)), ['texte'], '11 px couchés n’en font plus que 9,7 à l’écran');
  assert.deepEqual(regles(couche(CORPS.gravure)), [], 'le plus petit échelon se lit encore couché');
  assert.ok(Math.abs(controler(couche(CORPS.gravure)).plusPetitCorps - CORPS.gravure * 0.88) < 1e-9);
});

test('les budgets sont tenus : 2 500 polygones de décor au plus, et moins de 150 par calque mobile, lettres comprises', () => {
  assert.deepEqual([LIMITES.decor, LIMITES.mobile], [2500, 150]);
  assert.deepEqual(regles(scene([carreaux(2500)])), []);
  assert.deepEqual(regles(scene([carreaux(2501)])), ['poids']);
  assert.deepEqual(regles(scene([carreaux(149)], 'mobile')), []);
  assert.deepEqual(regles(scene([carreaux(150)], 'mobile')), ['poids'], '150, c’est déjà trop : le brief dit « sous 150 »');
  // Une lettre est un contour comme un autre : « Face A » en compte cinq.
  assert.deepEqual(regles(scene([carreaux(144), texte(CORPS.titre)], 'mobile')), []);
  assert.deepEqual(regles(scene([carreaux(145), texte(CORPS.titre)], 'mobile')), ['poids']);
  assert.deepEqual(controler(scene([carreaux(145), texte(CORPS.titre)], 'mobile')).plusLourdCalqueMobile, { nom: 'legende', poids: 150 });
  // Une image, figée dès qu'elle est prête, n'a pas de budget : c'est le cas du vinyle ou d'une pochette.
  assert.deepEqual(regles(scene([carreaux(1400)], 'image')), []);
});

test('un dessin posé hors de tout calque à rôle est relevé : il échapperait aux budgets', () => {
  assert.deepEqual(regles(calque('legende', [carreaux(4)])), ['role']);
  assert.deepEqual(regles(calque('legende', [calque('legende/decor', [carreaux(4)], { role: 'decor' })])), []);
});

test('l’inventaire pèse chaque calque à rôle sans ce que pèsent les calques à rôle qu’il contient', () => {
  const racine = calque('platine', [
    calque('platine/decor', [carreaux(10), texte(12)], { role: 'decor' }),
    calque('disque', [
      calque('disque/vinyle', [carreaux(30)], { role: 'image' }),
      calque('etiquette', [aplat([rectangle(0, 0, 1, 1)], 'miel'), texte(12)], { role: 'mobile' }),
    ]),
    calque('bras', [carreaux(7), calque('bras/ombre', [aplat([rectangle(0, 0, 1, 1), rectangle(2, 0, 1, 1)], 'expresso')], { role: 'ombre' })], {
      role: 'mobile',
    }),
  ]);
  assert.deepEqual(inventaire(racine), [
    { nom: 'platine/decor', role: 'decor', polygones: 10, lettres: 5 },
    { nom: 'disque/vinyle', role: 'image', polygones: 30, lettres: 0 },
    { nom: 'etiquette', role: 'mobile', polygones: 1, lettres: 5 },
    { nom: 'bras', role: 'mobile', polygones: 7, lettres: 0 },
    { nom: 'bras/ombre', role: 'ombre', polygones: 2, lettres: 0 },
  ]);
  assert.deepEqual(poidsTotal(inventaire(racine)), { polygones: 50, lettres: 10 });
  // Ce qui n'est sous aucun rôle est compté à part, sous le nom de la racine.
  assert.deepEqual(inventaire(calque('legende', [carreaux(3)])), [{ nom: 'legende', role: null, polygones: 3, lettres: 0 }]);
});
