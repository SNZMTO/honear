/**
 * Le pied de la page, au téléphone, sur une fausse page : la page suit le doigt qui la fait glisser vers le haut, jusqu'à montrer
 * son pied, et pas plus loin ; lâchée, elle se pose du côté le plus proche ; un toucher la referme ; rien quand l'écran n'a pas de
 * pied ; un autre écran la range.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brancherLePied } from '../src/ecran/jeu/pied';
import { DOIGT, enElement, installerUneFaussePage } from './fausse-page';

const PAGE = installerUneFaussePage();
// L'iPhone dans Safari : on voit 695 px ; la page en a 735 de jeu (le bas sous la barre de Safari), puis 90 de pied.
Object.assign(PAGE.fenetre, { innerHeight: 695 });

function unePage(actif = true) {
  const page = PAGE.poser('div');
  page.clientHeight = 735 + 90;
  const etat = { actif };
  const pied = brancherLePied(enElement(page), () => etat.actif, false);
  const doigt = (genre: string, y: number, x = 200): void => void page.envoyer(genre, { ...DOIGT, pointerId: 1, clientX: x, clientY: y });
  const monte = (): number => {
    const ecrit = /translateY\((-?[\d.]+)px\)/.exec(page.style.transform)?.[1];
    return ecrit === undefined ? 0 : -Number(ecrit);
  };
  return { page, pied, etat, doigt, monte };
}

test('la page suit le doigt qui la fait glisser vers le haut, jusqu’à montrer tout son pied, pas plus ; lâchée, elle se pose du côté le plus proche', () => {
  const { doigt, monte, pied } = unePage();
  doigt('pointerdown', 600);
  doigt('pointermove', 560);
  assert.equal(monte(), 40, 'elle suit le doigt');
  doigt('pointermove', 300);
  assert.equal(monte(), 130, 'pas plus haut que son pied : 735 + 90 − 695');
  doigt('pointermove', 520);
  doigt('pointerup', 520);
  assert.equal(monte(), 130, 'lâchée plus haut que la moitié : ouverte');
  doigt('pointerdown', 300);
  doigt('pointermove', 400);
  doigt('pointerup', 400);
  assert.equal(monte(), 0, 'redescendue plus bas que la moitié : fermée');
  pied.fermer();
});

test('un toucher ne la fait pas glisser ; le pied ouvert, il la referme', () => {
  const { doigt, monte, pied } = unePage();
  doigt('pointerdown', 600);
  doigt('pointermove', 594);
  doigt('pointerup', 594);
  assert.equal(monte(), 0, 'un doigt qui bouge à peine touche, il ne fait pas glisser');
  doigt('pointerdown', 600);
  doigt('pointermove', 400);
  doigt('pointerup', 400);
  assert.equal(monte(), 130);
  doigt('pointerdown', 200);
  doigt('pointerup', 200);
  assert.equal(monte(), 0, 'un toucher sur le jeu le referme');
  pied.fermer();
});

test('sans pied (un autre écran, un grand écran), la page ne bouge pas ; un autre écran la range sur-le-champ, sans glisser', () => {
  const { doigt, monte, pied, etat, page } = unePage(false);
  doigt('pointerdown', 600);
  doigt('pointermove', 400);
  doigt('pointerup', 400);
  assert.equal(monte(), 0);
  etat.actif = true;
  doigt('pointerdown', 600);
  doigt('pointermove', 400);
  doigt('pointerup', 400);
  assert.equal(monte(), 130);
  pied.ranger();
  assert.equal(monte(), 0);
  assert.equal(page.style.transition, '', 'rangée sans glisser');
  pied.fermer();
});
