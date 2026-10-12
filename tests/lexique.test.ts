import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEXIQUE, type NomDeCalque, type Terme } from '../src/lexique';
import { calques, TOUTES_LES_IMAGES } from './planche';

/** La règle de `NomDeCalque`, relue à l'exécution : un mot du lexique, seul ou prolongé par un tiret ou une barre. */
const commenceParUnTerme = (nom: string): boolean => Object.hasOwn(LEXIQUE, nom.split(/[-/]/)[0] ?? '');

test('le lexique fixe les mots du brief, et dit de chacun ce qu’il désigne', () => {
  const duBrief: Terme[] = ['room', 'piste', 'pochette', 'pastille', 'platine', 'bras', 'bac'];
  for (const terme of duBrief) assert.ok(Object.hasOwn(LEXIQUE, terme), terme);
  for (const [terme, definition] of Object.entries(LEXIQUE)) {
    assert.match(terme, /^[a-z]+$/, `« ${terme} » : un mot simple, sans accent ni majuscule, qui peut nommer un calque`);
    assert.ok(definition.length > 20 && definition.endsWith('.'), `« ${terme} » n'a pas de définition`);
  }
});

test('le nom d’un calque commence par un mot du lexique : le compilateur refuse les autres', () => {
  const acceptes: NomDeCalque[] = ['bras', 'bouton-mode', 'bouton-mode/index', 'pochette-240/ombre/palier-1'];
  // @ts-expect-error « tapis » n'est pas dans le lexique : c'est la feutrine.
  const refuse: NomDeCalque = 'tapis';
  // @ts-expect-error un mot du lexique ne se prolonge que par un tiret ou une barre.
  const colle: NomDeCalque = 'brasgauche';
  assert.ok(acceptes.every(commenceParUnTerme));
  assert.ok(![refuse, colle].some(commenceParUnTerme), 'ce que le compilateur refuse, la règle relue à l’exécution le refuse aussi');
});

test('dans chaque scène, tout calque porte bien un mot du lexique, et aucun nom ne sert deux fois', () => {
  let vus = 0;
  for (const image of TOUTES_LES_IMAGES) {
    const noms = calques(image.scene).map((c) => c.nom as string);
    vus += noms.length;
    for (const nom of noms) assert.ok(commenceParUnTerme(nom), `${image.fichier} : le calque « ${nom} » ne vient pas du lexique`);
    assert.equal(new Set(noms).size, noms.length, `${image.fichier} : ${noms.filter((n, i) => noms.indexOf(n) !== i).join(', ')}`);
  }
  assert.ok(vus > 400, `${vus} calques vérifiés`);
});

test('l’ombre d’une pièce porte son nom, suivi de « /ombre » ; portée sur une autre surface, elle la nomme ensuite : « bras/ombre/plateau »', () => {
  let [ombres, surUneSurface] = [0, 0];
  for (const image of TOUTES_LES_IMAGES) {
    const tous = calques(image.scene);
    for (const ombre of tous.filter((c) => c.role === 'ombre')) {
      ombres++;
      const [, piece, surface] = /^(.+)\/ombre(?:\/([a-z]+))?$/.exec(ombre.nom) ?? [];
      assert.ok(piece !== undefined, ombre.nom);
      assert.ok(
        tous.some((c) => c.nom === piece || (c.nom.startsWith(`${piece}/`) && !c.nom.startsWith(`${piece}/ombre`))),
        `${image.fichier} : l'ombre « ${ombre.nom} » n'a pas de pièce`,
      );
      if (surface === undefined) continue;
      surUneSurface++;
      // La surface est un mot du lexique, celui d'une pièce de la scène ; et la pièce a aussi son ombre ordinaire.
      assert.ok(Object.hasOwn(LEXIQUE, surface) && tous.some((c) => c.nom === surface), `${image.fichier} : « ${ombre.nom} »`);
      assert.ok(
        tous.some((c) => c.nom === `${piece}/ombre` && c.role === 'ombre'),
        `${image.fichier} : « ${ombre.nom} » sans « ${piece}/ombre »`,
      );
    }
  }
  assert.ok(ombres >= 24 && surUneSurface >= 10, `${ombres} ombres vérifiées, dont ${surUneSurface} portées sur une autre surface`);
});
