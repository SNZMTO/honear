/** L'étape 6 : l'écran de l'hôte, en grand. Le meuble entier d'un seul regard, la tablée devant, lisible depuis le canapé. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imagesDeLHote, placesDeLaTablee, SUR_LE_MEUBLE } from '../src/planche/etape6/scenes';
import { pochetteDExemple } from '../src/planche/exemples';
import { CADRAGES } from '../src/ressources/cadrages';
import { PARTIE } from '../src/ressources/reglages';
import { TABLEE } from '../src/ressources/tablee';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque, Texte } from '../src/scene/calque';
import { surLeBois } from '../src/scene/meuble';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { empriseDe, type Emprise } from '../src/scene/rendu/emprise';
import { dessinerLaTablee } from '../src/scene/tablee';
import { dessins, ENCRIER } from './planche';

const IMAGES = imagesDeLHote(TEXTES, ENCRIER);
const image = (fichier: string) => {
  const trouvee = IMAGES.find((i) => i.fichier === fichier);
  assert.ok(trouvee !== undefined, fichier);
  return trouvee;
};
const calques = (fichier: string, motif: RegExp): Calque[] =>
  image(fichier).scene.contenu.flatMap((d) => (d.genre === 'calque' && motif.test(d.nom) ? [d] : []));
const textesDe = (fichier: string): Texte[] => dessins(image(fichier).scene).flatMap((d) => (d.genre === 'texte' ? [d] : []));
const emprise = (c: readonly Calque[]): Emprise => {
  const e = empriseDe(c, ENCRIER.largeur);
  assert.ok(e !== undefined);
  return e;
};
const dans = (e: Emprise): boolean => {
  const [ox, oy] = SUR_LE_MEUBLE.origine;
  return e.x >= ox && e.y >= oy && e.x + e.largeur <= ox + SUR_LE_MEUBLE.largeur && e.y + e.hauteur <= oy + SUR_LE_MEUBLE.hauteur;
};
const seCroisent = (a: Emprise, b: Emprise): boolean =>
  a.x < b.x + b.largeur && b.x < a.x + a.largeur && a.y < b.y + b.hauteur && b.y < a.y + a.hauteur;

test('l’écran de l’hôte tient les règles du rendu : aucun défaut, décor et calques mobiles sous leurs limites', () => {
  assert.equal(IMAGES.length, 6);
  for (const i of IMAGES) {
    const c = controler(i.scene);
    assert.deepEqual(c.constats, [], i.fichier);
    assert.ok(c.plusLourdCalqueMobile.poids < LIMITES.mobile, `${i.fichier} : ${c.plusLourdCalqueMobile.nom}`);
  }
});

test('un seul regard, qui ne glisse jamais : 1440 × 900, le meuble entier dedans, du bac à l’ampli, la kraft comprise', () => {
  const { largeur, hauteur } = CADRAGES.hote;
  for (const { fichier, regard } of IMAGES) {
    assert.deepEqual(regard, SUR_LE_MEUBLE, fichier);
    assert.deepEqual([regard.largeur, regard.hauteur], [largeur, hauteur]);
    for (const nom of ['bac', 'ampli', 'platine']) {
      const c = calques(fichier, new RegExp(`^${nom}$`));
      assert.equal(c.length, 1, `${fichier} : ${nom}`);
      assert.ok(dans(emprise(c)), `${fichier} : ${nom} sort du cadre`);
    }
    for (const t of textesDe(fichier)) assert.ok(!t.contenu.endsWith('…'), `${fichier} : « ${t.contenu} » est abrégé`);
    // Tout ce qui est posé devant le meuble reste entier dans le cadre.
    for (const c of calques(fichier, /^(pochette-|pastille-(?!decompte)|touche-|etiquette-|disque-(diamant|platine|or))[^/]*$/))
      assert.ok(dans(emprise([c])), `${fichier} : ${c.nom}`);
  }
  // Le bac et l'ampli sont à égale distance des bords : le meuble est centré.
  const bac = emprise(calques('hote-salon', /^bac$/));
  const ampli = emprise(calques('hote-salon', /^ampli$/));
  const [ox] = SUR_LE_MEUBLE.origine;
  assert.ok(Math.abs(bac.x - ox - (ox + SUR_LE_MEUBLE.largeur - ampli.x - ampli.largeur)) < 40);
});

test('la tablée tient ses douze pochettes devant le bac, sans mordre sur la platine ni sur la kraft', () => {
  const places = placesDeLaTablee(PARTIE.joueurs.auPlus);
  assert.equal(places.length, 12);
  const pochette = pochetteDExemple(TEXTES);
  const douze = dessinerLaTablee(
    places.map(() => ({ pochette, expression: 'content' as const, pastilles: ['A', 'T'] })),
    places,
    TABLEE.hote.tablee.taille,
    SUR_LE_MEUBLE,
    TABLEE.hote.trouve,
    ENCRIER.largeur,
    'hote',
  );
  const tablee = emprise(douze);
  assert.ok(dans(tablee));
  // La platine du salon, à l'arrêt, sans sa piste : la kraft est à part.
  assert.ok(!seCroisent(tablee, emprise(calques('hote-salon', /^platine$/))), 'elle mord sur la platine');
  assert.ok(!seCroisent(tablee, emprise(calques('hote-salon', /^kraft\/corps$/))), 'elle mord sur la kraft');
  for (const angle of TABLEE.hote.tablee.angles) assert.ok(Math.abs(angle) >= 3 && Math.abs(angle) <= 9);
  void surLeBois;
});

test('de loin, on lit le code, le lien, ce que chacun a trouvé et ses points : en plus grand qu’au téléphone', () => {
  const salon = textesDe('hote-salon');
  const code = salon.find((t) => /^[A-Z]{4}$/.test(t.contenu));
  assert.ok(code !== undefined && code.corps >= 20, `${code?.corps}`);
  const lien = salon.find((t) => t.contenu.includes(`/${code.contenu}`));
  assert.ok(lien !== undefined && lien.corps >= 14, `${lien?.corps}`);
  assert.ok(TABLEE.hote.trouve.rayon > TABLEE.telephone.trouve.rayon);
  assert.ok(TABLEE.hote.tablee.taille > TABLEE.telephone.eventail.taille);
  // À la révélation, la réponse se lit sur le disque, et les points sont collés sur les pochettes ; la vraie pochette est sortie.
  const revelation = textesDe('hote-revelation').map((t) => t.contenu);
  assert.ok(revelation.some((c) => c.startsWith('+')));
  assert.ok(revelation.join(' ').includes(TEXTES.exemples.interprete));
  assert.equal(calques('hote-revelation', /^pochette-vraie$/).length, 1);
});

test('chaque moment a ce qu’il lui faut : le salon son code et ses touches, la piste en 4 choix ses étiquettes, la finale ses disques', () => {
  assert.equal(calques('hote-salon', /^kraft-qr$/).length, 1);
  assert.equal(calques('hote-salon', /^touche-lancer$/).length, 1);
  assert.equal(calques('hote-quatre-choix', /^etiquette-choix-\d$/).length, 4);
  for (const genre of ['diamant', 'platine', 'or']) assert.equal(calques('hote-finale', new RegExp(`^disque-${genre}-\\d+$`)).length, 1, genre);
  assert.ok(textesDe('hote-finale').some((t) => t.contenu === TEXTES.touches.rejouer));
  assert.ok(textesDe('hote-hit-parade').some((t) => t.contenu === TEXTES.pastilles.entree));
});
