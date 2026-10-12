import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contraste } from '../src/lowpoly/couleur';
import { couleur, type IndiceDeTon } from '../src/lowpoly/tons';
import { PALETTE, type NomDeTeinte } from '../src/ressources/palette';
import { CONTRASTES, CORPS } from '../src/ressources/typo';
import { calque, type Texte } from '../src/scene/calque';
import { encreLisibleSur } from '../src/scene/encre';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { dessins, TOUTES_LES_IMAGES } from './planche';

const texte = (teinte: NomDeTeinte, fond: NomDeTeinte, corps: number = CORPS.gravure): Texte => ({
  genre: 'texte',
  contenu: 'Piste 3 sur 15',
  role: 'technique',
  corps,
  en: [0, 0],
  ancrage: 'debut',
  teinte,
  ton: 2,
  fond: { teinte: fond },
});
const constatsDeContraste = (t: Texte) => controler(calque('legende', [t], { role: 'decor' })).constats.filter((c) => c.regle === 'contraste');

test('les contrôles refusent un texte trop peu contrasté sur son fond', () => {
  assert.equal(constatsDeContraste(texte('creme', 'laque')).length, 0);
  assert.equal(constatsDeContraste(texte('expresso', 'miel')).length, 0);
  assert.equal(constatsDeContraste(texte('creme', 'miel')).length, 1, 'du crème sur du miel ne se lit pas');
  assert.equal(constatsDeContraste(texte('expresso', 'laque')).length, 1, 'de l’expresso sur la laque non plus');
});

test('un grand texte se contente d’un contraste plus faible, un petit non', () => {
  assert.ok(contraste(couleur('creme'), couleur('rougeTomate')) < CONTRASTES.texte);
  assert.ok(contraste(couleur('creme'), couleur('rougeTomate')) >= CONTRASTES.grandTexte);
  assert.equal(constatsDeContraste(texte('creme', 'rougeTomate', CORPS.gravure)).length, 1);
  assert.equal(constatsDeContraste(texte('creme', 'rougeTomate', CORPS.titre)).length, 0);
});

test('chaque texte de la planche dit sur quoi il est écrit, et s’y lit', () => {
  let textes = 0;
  for (const image of TOUTES_LES_IMAGES) {
    for (const dessin of dessins(image.scene)) {
      if (dessin.genre !== 'texte') continue;
      textes++;
      assert.notEqual(dessin.teinte, dessin.fond.teinte, `${image.fichier} : « ${dessin.contenu} » est de la couleur de son fond`);
    }
    assert.deepEqual(
      controler(image.scene).constats.filter((c) => c.regle === 'contraste'),
      [],
    );
  }
  assert.ok(textes >= 40, `${textes} textes vérifiés`);
});

test('l’encre choisie pour une teinte est toujours la plus lisible des deux', () => {
  for (const fond of Object.keys(PALETTE) as NomDeTeinte[]) {
    const encre = encreLisibleSur(fond);
    const autre = encre === 'creme' ? 'expresso' : 'creme';
    assert.ok(contraste(couleur(encre), couleur(fond)) >= contraste(couleur(autre), couleur(fond)), fond);
  }
  assert.equal(encreLisibleSur('miel'), 'expresso');
  assert.equal(encreLisibleSur('laque'), 'creme');
});

test('le crème ne s’écrit pas en petit sur le noyer clair : il faut un objet dessous', () => {
  assert.ok(contraste(couleur('creme'), couleur('noyerClair')) < CONTRASTES.texte);
  assert.ok(contraste(couleur('creme'), couleur('noyerSombre')) >= CONTRASTES.texte);
});

test('deux facettes voisines d’une même teinte ne claquent jamais : deux tons d’écart au plus, et c’est l’exception', () => {
  for (const image of TOUTES_LES_IMAGES) {
    const { ecartsDeTon, plusFortContraste } = controler(image.scene);
    const [memeTon = 0, unTon = 0, deuxTons = 0, ...auDela] = ecartsDeTon;
    assert.deepEqual(auDela, [0, 0], `${image.fichier} : des voisines à plus de deux tons d'écart`);
    // De quoi juger : même la pochette seule, et son avatar d'une cinquantaine de polygones, en a assez.
    assert.ok(memeTon + unTon > 80, `${image.fichier} : ${memeTon + unTon + deuxTons} paires de voisines mesurées`);
    assert.ok(deuxTons < (memeTon + unTon + deuxTons) * 0.1, `${image.fichier} : ${deuxTons} arêtes franches sur ${memeTon + unTon + deuxTons}`);
    assert.ok(
      plusFortContraste < LIMITES.contrasteDeVoisines,
      `${image.fichier} : un contraste de ${plusFortContraste.toFixed(2)} entre deux voisines`,
    );
  }
});

test('dans chaque teinte de la palette, deux tons d’écart restent sous le contraste où deux voisines claqueraient ; trois le passent presque partout', () => {
  const TONS: readonly IndiceDeTon[] = [0, 1, 2, 3, 4];
  let auDela = 0;
  let aTroisTons = 0;
  for (const teinte of Object.keys(PALETTE) as NomDeTeinte[])
    for (const sombre of TONS)
      for (const clair of TONS) {
        const ecart = clair - sombre;
        if (ecart <= 0) continue;
        const rapport = contraste(couleur(teinte, sombre), couleur(teinte, clair));
        if (ecart <= LIMITES.ecartDeTon)
          assert.ok(rapport < LIMITES.contrasteDeVoisines, `${teinte}, tons ${sombre} et ${clair} : ${rapport.toFixed(3)}`);
        else if (ecart === LIMITES.ecartDeTon + 1) {
          aTroisTons++;
          if (rapport >= LIMITES.contrasteDeVoisines) auDela++;
        }
      }
  // La limite n'est pas lâche : un ton de plus, et presque toutes les teintes la passent.
  assert.ok(auDela > aTroisTons * 0.8, `${auDela} paires à trois tons d’écart sur ${aTroisTons} passent la limite`);
});
