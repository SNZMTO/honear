/**
 * La planche « Ce qui se touche » : ses images tiennent les règles du rendu ; aujourd'hui, rien ne signale ce qui se touche ;
 * dans chaque variante, chaque chose qu'on touche sur l'écran (hors des touches) a son signe, et le signe reste dans l'écran.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imagesDesReperes, VARIANTES } from '../src/planche/reperes/scenes';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque } from '../src/scene/calque';
import { controler } from '../src/scene/rendu/controle';
import { empriseDe } from '../src/scene/rendu/emprise';
import { ENCRIER } from './planche';

const IMAGES = imagesDesReperes(TEXTES, ENCRIER);
const signesDe = (scene: Calque): Calque[] => scene.contenu.flatMap((d) => (d.genre === 'calque' && d.nom.startsWith('signe-') ? [d] : []));

test('les images de « Ce qui se touche » tiennent les règles du rendu', () => {
  for (const v of VARIANTES) for (const i of IMAGES[v]) assert.deepEqual(controler(i.scene).constats, [], i.fichier);
});

test('aujourd’hui, aucun signe ; dans chaque variante, autant de signes à chaque écran, tous dans l’écran', () => {
  for (const i of IMAGES.aujourdhui) assert.equal(signesDe(i.scene).length, 0, i.fichier);
  const nombres = IMAGES.coins.map((i) => signesDe(i.scene).length);
  // Les réglages : les deux boutons, la manette et ses deux noms ; le bac : ses onglets et ses playlists ; le duel : le disque, A et B.
  assert.ok(
    nombres.every((n) => n >= 3),
    nombres.join(' '),
  );
  for (const v of VARIANTES.filter((x) => x !== 'aujourdhui'))
    for (const [rang, i] of IMAGES[v].entries()) {
      assert.equal(signesDe(i.scene).length, nombres[rang], i.fichier);
      const [ox, oy] = i.regard.origine;
      for (const s of signesDe(i.scene)) {
        const e = empriseDe([s], ENCRIER.largeur);
        assert.ok(
          e !== undefined && e.x >= ox && e.y >= oy && e.x + e.largeur <= ox + i.regard.largeur && e.y + e.hauteur <= oy + i.regard.hauteur,
          `${i.fichier} : ${s.nom}`,
        );
      }
    }
});
