/**
 * Le jeu comme une application : le manifeste qui le fait s'ouvrir en plein écran une fois posé sur l'écran d'accueil d'un
 * téléphone, et son icône, un vinyle à l'étiquette de miel sur le vert de la platine. Fabriqués avec la page ; le serveur les sert.
 */

import { couleur } from '../../lowpoly/tons';
import { APPLICATION } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';

/** L'icône, dessinée sur un carré de cent : le fond, le disque, ses deux sillons, l'étiquette, le trou. */
const ICONE = { cote: 100, arrondi: 22, disque: 40, sillons: [33, 26], etiquette: 15, trou: 3 } as const;

export function iconeDeLApplication(): string {
  const I = ICONE;
  const milieu = I.cote / 2;
  const rond = (r: number, teinte: string, trait?: string): string =>
    `<circle cx="${milieu}" cy="${milieu}" r="${r}" fill="${trait === undefined ? teinte : 'none'}"${trait !== undefined ? ` stroke="${teinte}" stroke-width="${trait}"` : ''}/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${I.cote} ${I.cote}">`,
    `<rect width="${I.cote}" height="${I.cote}" rx="${I.arrondi}" fill="${couleur('laque')}"/>`,
    rond(I.disque, couleur('vinyle')),
    ...I.sillons.map((r) => rond(r, couleur('laque'), '1')),
    rond(I.etiquette, couleur('miel')),
    rond(I.trou, couleur('creme')),
    '</svg>',
  ].join('');
}

export function manifesteDeLApplication(textes: Textes): string {
  return JSON.stringify({
    name: textes.logo.nom,
    short_name: textes.logo.nom,
    lang: textes.langue,
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    background_color: couleur('laque'),
    theme_color: couleur('laque'),
    icons: [{ src: APPLICATION.icone, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  });
}
