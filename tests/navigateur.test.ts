/**
 * Ce que l'écran demande à un navigateur : ce qui lui manque est dit par son nom, l'appareil qui veut moins d'animations
 * est entendu, et la finesse de son écran lue.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { animationsReduites, ceQuiManqueAuNavigateur, densiteDeLEcran, suivreLesAnimationsReduites, type Manque } from '../src/ecran/navigateur';
import { TEXTES } from '../src/ressources/textes.fr';
import { installerUneFaussePage } from './fausse-page';

const monde = globalThis as unknown as Record<string, unknown>;

test('un navigateur à qui rien ne manque le dit ; sans toile, sans tracés, sans images animées ou sans SVG, il dit ce qui lui manque, dans cet ordre', () => {
  const complet = installerUneFaussePage();
  assert.deepEqual(ceQuiManqueAuNavigateur(), []);
  // Il n'a fait qu'essayer : une seule toile, jamais posée dans la page.
  assert.equal(complet.toiles.length, 1);
  assert.equal(complet.toiles[0]?.isConnected, false);

  const sansToile = installerUneFaussePage();
  sansToile.sansToile = true;
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['toile']);
  // Un navigateur dont les toiles ne savent même pas donner de contexte : c'est le même manque, pas une erreur.
  const sansContexte = installerUneFaussePage();
  const creer = sansContexte.document.createElement;
  sansContexte.document.createElement = (balise) => Object.assign(creer(balise), balise === 'canvas' ? { getContext: undefined } : {});
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['toile']);

  // Les tracés : absents, ou présents mais qui ne se lisent pas écrits comme dans un SVG.
  installerUneFaussePage();
  delete monde['Path2D'];
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['traces']);
  monde['Path2D'] = class {
    constructor(trace?: string) {
      if (trace !== undefined) throw new TypeError('Ce navigateur ne lit pas un tracé écrit.');
    }
  };
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['traces']);

  const sansImages = installerUneFaussePage();
  delete sansImages.fenetre['requestAnimationFrame'];
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['images']);

  // Le SVG : des éléments sans transformation, ou pas d'éléments du tout.
  const sansSvg = installerUneFaussePage();
  sansSvg.saitLeSvg = false;
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['svg']);
  Object.assign(sansSvg.document, { createElementNS: undefined });
  assert.deepEqual(ceQuiManqueAuNavigateur(), ['svg']);

  // Tout à la fois : chacun est dit, une fois, et les textes du site savent dire chacun.
  sansSvg.sansToile = true;
  delete monde['Path2D'];
  delete sansSvg.fenetre['requestAnimationFrame'];
  const tous: Manque[] = ['toile', 'traces', 'images', 'svg'];
  assert.deepEqual(ceQuiManqueAuNavigateur(), tous);
  assert.deepEqual(Object.keys(TEXTES.navigateur.manques).sort(), [...tous].sort());
});

test('l’appareil qui a demandé de réduire les animations est entendu ; un navigateur qui ne sait pas le dire n’a rien demandé', () => {
  const page = installerUneFaussePage();
  assert.equal(animationsReduites(), false);
  page.animationsReduites = true;
  assert.equal(animationsReduites(), true);
  // La question est posée dans les mots de la norme : toute autre resterait sans réponse.
  const posees: string[] = [];
  const repondre = page.fenetre['matchMedia'] as (requete: string) => { matches: boolean };
  page.fenetre['matchMedia'] = (requete: string) => {
    posees.push(requete);
    return repondre(requete);
  };
  assert.equal(animationsReduites(), true);
  assert.deepEqual(posees, ['(prefers-reduced-motion: reduce)']);
  delete page.fenetre['matchMedia'];
  assert.equal(animationsReduites(), false);
  // Sans de quoi poser la question, on ne sera jamais prévenu non plus ; et cesser d'écouter ne fait rien.
  suivreLesAnimationsReduites(() => assert.fail('personne ne peut prévenir'))();
});

test('l’appareil qui change d’avis en route prévient chaque fois, jusqu’à ce qu’on cesse de l’écouter ; un navigateur d’il y a cinq ans s’écoute à l’ancienne façon', () => {
  for (const facon of ['addEventListener', 'addListener'] as const) {
    const page = installerUneFaussePage();
    page.ecouteLesDemandes = facon === 'addEventListener';
    const dits: boolean[] = [];
    const cesser = suivreLesAnimationsReduites((reduites) => dits.push(reduites));
    assert.deepEqual([...page.ecouteursDesAnimations.values()], [facon]);
    assert.deepEqual(dits, [], 'rien n’est dit tant que rien ne change');
    assert.equal(page.demanderMoinsDAnimations(true), 1);
    assert.equal(page.demanderMoinsDAnimations(false), 1);
    assert.deepEqual(dits, [true, false]);
    cesser();
    assert.equal(page.demanderMoinsDAnimations(true), 0, 'on n’écoute plus');
    assert.deepEqual(dits, [true, false]);
  }
});

test('la finesse de l’écran se lit sur la fenêtre : tant de px de l’appareil par px de la page, un seul si elle ne le dit pas', () => {
  const page = installerUneFaussePage();
  assert.equal(densiteDeLEcran(), 3);
  page.fenetre['devicePixelRatio'] = 1.5;
  assert.equal(densiteDeLEcran(), 1.5);
  delete page.fenetre['devicePixelRatio'];
  assert.equal(densiteDeLEcran(), 1);
  page.fenetre['devicePixelRatio'] = 0;
  assert.equal(densiteDeLEcran(), 1);
});
