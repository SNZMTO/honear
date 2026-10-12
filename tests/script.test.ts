/**
 * Le script d'une page : ce que son assemblage garantit à ce qui la transporte.
 */

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assemblerUnScript, pourUnePage } from '../src/planche/script';

const ICI = dirname(fileURLToPath(import.meta.url));
/** Ce qu'une page ne doit pas trouver dans un script : un caractère de commande écrit tel quel, une balise qui le fermerait. */
const INTRANSPORTABLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|<\/script/i;
/** Ce que vaut une expression, une fois lue comme un navigateur la lirait. */
const lue = (expression: string): unknown => new Function(`return ${expression}`)();

test('un script posé dans une page n’y laisse ni balise qui le fermerait ni caractère de commande, et se lit pareil', () => {
  const chaine = '"a\u0001b\u0000c\u001Fd\u007F </script> </SCRIPT> é\t"';
  assert.match(chaine, INTRANSPORTABLE);
  const ecrite = pourUnePage(chaine);
  assert.doesNotMatch(ecrite, INTRANSPORTABLE);
  assert.equal(lue(ecrite), lue(chaine));
  // Un zéro suivi d'un chiffre reste un zéro puis un chiffre.
  assert.equal(lue(pourUnePage('"\u00001"')), '\u00001');
  // Une barre oblique écrite pour elle-même, devant un caractère de commande, reste une barre oblique.
  assert.equal(lue(pourUnePage('"\\\\\u0001"')), '\\\u0001');
  // Un caractère de commande que le script échappe lui-même ne se récrit pas sans risque : on s'arrête.
  assert.throws(() => pourUnePage('"\\\u0001"'), /caractère de commande/);
  // Ce qui n'a rien à échapper sort tel quel : les sauts de ligne et les tabulations sont du texte.
  const sage = 'let a = "é" + `\n\t`;';
  assert.equal(pourUnePage(sage), sage);
});

test('le script de la page de l’atelier s’assemble, se lit, et ne porte rien qu’une page ne transporte', async () => {
  const script = await assemblerUnScript(join(ICI, '..', 'src', 'planche', 'etape2', 'page.ts'));
  assert.ok(script.length > 100_000, `${script.length} caractères`);
  assert.doesNotMatch(script, INTRANSPORTABLE);
  // Ni de quoi faire croire à la page qu'un commentaire ou un autre script commence au milieu de celui-ci.
  assert.doesNotMatch(script, /<!--|<script/i);
  // Il se lit : on le compile sans le lancer, il n'a pas de page ici.
  assert.doesNotThrow(() => new Function(script));
});

test('le script est assemblé pour les navigateurs d’un téléphone vieux de cinq ans : ce qu’ils ne lisent pas est récrit', async () => {
  const [ACCES_QUI_S_ARRETE, VALEUR_DE_REPLI] = ['?.', '??'];
  // Le témoin écrit ce qu'ils ne lisent pas ; assemblé, il dit la même chose sans plus l'écrire.
  const script = await assemblerUnScript(join(ICI, 'temoin-de-cible.ts'));
  assert.ok(script.includes('sans nom') && script.includes('console.log'), 'le témoin est bien dans le script');
  assert.ok(!script.includes(ACCES_QUI_S_ARRETE) && !script.includes(VALEUR_DE_REPLI), script.slice(-200));
  // Et il dit bien la même chose : lancé, il écrit le repli tant que la fenêtre n'a pas de témoin, puis son nom.
  const dits: unknown[] = [];
  const lancer = new Function('console', 'globalThis', script);
  lancer({ log: (dit: unknown) => dits.push(dit) }, {});
  lancer({ log: (dit: unknown) => dits.push(dit) }, { temoin: { nom: 'platine' } });
  assert.deepEqual(dits, ['sans nom', 'platine']);
});
