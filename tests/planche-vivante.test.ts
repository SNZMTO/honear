/**
 * La page de la planche d'animations : une section par animation, avec ses commandes (rejouer, ralentir, sobre, interrompre),
 * ses réglages, et ses deux frises, où chaque pas du geste a sa barre. Tout vient du geste.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lesAnimations } from '../src/planche/animations';
import { pasDuGeste, reglagesDuGeste } from '../src/planche/etape7/fiche';
import { pageDeLaPlanche } from '../src/planche/etape7/gabarit';
import { TEXTES } from '../src/ressources/textes.fr';
import { ENCRIER } from './planche';

const compter = (dans: string, motif: RegExp): number => dans.match(motif)?.length ?? 0;

test('la planche d’animations : une section par animation, ses commandes, ses réglages, et une barre par pas sur sa frise', () => {
  const animations = lesAnimations({ textes: TEXTES, encrier: ENCRIER });
  const { aPublier } = pageDeLaPlanche(animations, TEXTES, {}, '');
  const sections = aPublier.split('<section class="animation"').slice(1);
  assert.equal(sections.length, animations.length);
  for (const [rang, animation] of animations.entries()) {
    const section = sections[rang] ?? '';
    const quoi = animation.cle;
    assert.match(section, new RegExp(`data-animation="${quoi}"`), quoi);
    for (const commande of ['data-rejouer', 'data-interrompre', 'data-sobre', 'data-vitre', 'data-etat'])
      assert.ok(section.includes(commande), `${quoi} : ${commande}`);
    assert.equal(compter(section, /data-vitesse="/g), 3, `${quoi} : ×1, ×0,5, ×0,25`);
    assert.equal(compter(section, /<li><span class="regle /g), reglagesDuGeste(animation.geste).length, `${quoi} : ses réglages`);
    const [frise] = section.split('data-frise="reprise"');
    assert.equal(compter(frise ?? '', /<rect class="pas /g), pasDuGeste(animation.geste).length, `${quoi} : une barre par pas`);
    // Chaque pas dit ce qui le porte : un ressort, une glissade, une chute ou une loi.
    assert.ok(
      pasDuGeste(animation.geste).every((p) => p.regle !== undefined),
      `${quoi} : un pas sans règle`,
    );
  }
});
