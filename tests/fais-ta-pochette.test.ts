/** L'étape 4 : « Fais ta pochette » — l'avatar et ses choix, les expressions, le hasard, les listes, les images de la planche. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { imagesDeLaPochette, pochettesDExemple } from '../src/planche/etape4/scenes';
import { pochetteDExemple } from '../src/planche/exemples';
import { autreAlbum, pochetteAuHasard } from '../src/regles/pochette';
import { CHOIX_DE_L_AVATAR, DESSUS, EXPRESSIONS, TETES, type CleDeDessus, type CleDeTete, type NomDExpression } from '../src/ressources/avatar';
import { PALETTE, type NomDeTeinte } from '../src/ressources/palette';
import { FONDS_DE_POCHETTE, MOTIFS_DE_POCHETTE, PEAUX_INTERDITES, type Pochette } from '../src/ressources/pochettes';
import { TEXTES } from '../src/ressources/textes.fr';
import { dessinerLAvatar } from '../src/scene/avatar';
import type { Dessin, Texte } from '../src/scene/calque';
import { dessinerLaPochette } from '../src/scene/pochette';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { dessins, ENCRIER } from './planche';

const P = TEXTES.pochette;
const TIRAGES = 600;
const POSE = { tete: [0, 0], echelle: 1 } as const;

const textesDe = (pochette: Pochette, taille = 240): Texte[] =>
  dessins(
    dessinerLaPochette(pochette, { nom: 'pochette-essai', centre: [300, 200], angle: -4, taille, expression: 'content' }, ENCRIER.largeur).pochette,
  ).flatMap((d) => (d.genre === 'texte' ? [d] : []));
const tirages = (graine: number, combien = TIRAGES): Pochette[] => {
  const t = hasard(graine).suivant;
  return Array.from({ length: combien }, () => pochetteAuHasard(t, P));
};
const ys = (d: Dessin): number[] =>
  d.genre === 'peinture' ? d.facettes.flatMap((f) => f.contour.map((p) => p[1])) : d.genre === 'aplat' ? d.contours.flat().map((p) => p[1]) : [];

test('deux choix, chacun avec son nom ; chaque tête, chaque dessus de tête et chaque motif a son nom dans les textes, et seulement eux', () => {
  assert.deepEqual([...CHOIX_DE_L_AVATAR], ['tete', 'dessus']);
  assert.deepEqual(Object.keys(P.choix).sort(), ['dessus', 'tete']);
  assert.deepEqual(Object.keys(P.tetes).sort(), Object.keys(TETES).sort());
  assert.deepEqual(Object.keys(P.dessus).sort(), Object.keys(DESSUS).sort());
  assert.equal(MOTIFS_DE_POCHETTE.length, 4);
  assert.deepEqual(Object.keys(P.motifs).sort(), [...MOTIFS_DE_POCHETTE].sort());
});

test('ce qu’on porte sur la tête ne descend jamais sur les sourcils, quelle que soit la tête et l’expression', () => {
  const base = pochetteDExemple(TEXTES).avatar;
  for (const tete of Object.keys(TETES) as CleDeTete[])
    for (const nom of Object.keys(EXPRESSIONS) as NomDExpression[]) {
      const nu = dessinerLAvatar({ ...base, tete, dessus: 'rien' }, nom, POSE);
      // Les sourcils sont les deux derniers dessins d'un avatar sans rien sur la tête : leur haut.
      const hautDesSourcils = Math.min(...nu.slice(-2).flatMap(ys));
      for (const dessus of Object.keys(DESSUS) as CleDeDessus[]) {
        const avec = dessinerLAvatar({ ...base, tete, dessus }, nom, POSE);
        const derriere = dessus === 'chignon' || dessus === 'bonnet' ? 1 : 0;
        const coiffe = avec.slice(nu.length + derriere).flatMap(ys);
        if (coiffe.length === 0) continue;
        // Le casque descend sur les oreilles, pas sur le front : on ne mesure que ce qui passe entre les deux yeux.
        const surLeFront = avec
          .slice(nu.length + derriere)
          .flatMap((d) => (d.genre === 'peinture' ? d.facettes.flatMap((f) => f.contour.filter((p) => Math.abs(p[0]) < 8).map((p) => p[1])) : []));
        if (surLeFront.length === 0) continue;
        assert.ok(
          Math.max(...surLeFront) <= hautDesSourcils,
          `${tete}, ${dessus}, ${nom} : le dessus descend à ${Math.max(...surLeFront).toFixed(1)}, les sourcils montent à ${hautDesSourcils.toFixed(1)}`,
        );
      }
    }
});

test('vingt noms d’artiste et quarante albums, tous différents, qui tiennent entiers sur une pochette de 240 px', () => {
  assert.equal(P.artistes.length, 20);
  assert.equal(P.albums.length, 40);
  assert.equal(new Set(P.artistes).size, 20);
  assert.equal(new Set(P.albums).size, 40);
  const base = pochetteDExemple(TEXTES);
  for (const artiste of P.artistes) assert.equal(textesDe({ ...base, artiste })[0]?.contenu, artiste);
  for (const album of P.albums) assert.equal(textesDe({ ...base, album })[1]?.contenu, album);
});

test('« Au hasard » : une pochette complète, rejouable ; le fond n’est jamais la couleur de la peau, des cheveux ni de la tenue', () => {
  assert.deepEqual(tirages(42, 20), tirages(42, 20), 'la même graine redonne les mêmes pochettes');
  assert.notDeepEqual(tirages(42, 20), tirages(43, 20));
  for (const p of tirages(2026)) {
    const { peau, cheveux, tenue } = p.avatar;
    assert.ok(P.artistes.includes(p.artiste) && P.albums.includes(p.album));
    assert.ok((FONDS_DE_POCHETTE as readonly string[]).includes(p.fond));
    assert.equal(new Set([p.fond, peau, cheveux, tenue]).size, 4, `${p.fond}, ${peau}, ${cheveux}, ${tenue}`);
    assert.ok(!(PEAUX_INTERDITES as readonly NomDeTeinte[]).includes(peau), `peau ${peau}`);
  }
});

test('le hasard finit par tout donner : chaque tête, chaque dessus de tête, chaque motif, chaque fond, chaque peau permise', () => {
  const vus = tirages(1986);
  for (const tete of Object.keys(TETES))
    assert.ok(
      vus.some((p) => p.avatar.tete === tete),
      tete,
    );
  for (const dessus of Object.keys(DESSUS))
    assert.ok(
      vus.some((p) => p.avatar.dessus === dessus),
      dessus,
    );
  for (const motif of MOTIFS_DE_POCHETTE)
    assert.ok(
      vus.some((p) => p.motif === motif),
      motif,
    );
  for (const fond of FONDS_DE_POCHETTE)
    assert.ok(
      vus.some((p) => p.fond === fond),
      fond,
    );
  const peaux = (Object.keys(PALETTE) as NomDeTeinte[]).filter((t) => !(PEAUX_INTERDITES as readonly NomDeTeinte[]).includes(t));
  for (const peau of peaux)
    assert.ok(
      vus.some((p) => p.avatar.peau === peau),
      `peau ${peau}`,
    );
});

test('« Un autre album » change le titre, et lui seul', () => {
  const t = hasard(5).suivant;
  let pochette = pochetteAuHasard(t, P);
  for (let i = 0; i < 60; i++) {
    const suivante = autreAlbum(pochette, t, P.albums);
    assert.notEqual(suivante.album, pochette.album);
    assert.deepEqual({ ...suivante, album: '' }, { ...pochette, album: '' });
    pochette = suivante;
  }
});

test('douze pochettes d’exemple, toutes différentes', () => {
  const exemples = pochettesDExemple(TEXTES);
  assert.equal(exemples.length, 12);
  assert.equal(new Set(exemples.map((p) => JSON.stringify(p))).size, 12);
});

test('les images de « Fais ta pochette » tiennent les règles du rendu : aucun défaut, décor et calques mobiles sous leurs limites', () => {
  for (const image of imagesDeLaPochette(TEXTES, ENCRIER)) {
    const c = controler(image.scene);
    assert.deepEqual(c.constats, [], image.fichier);
    assert.ok(c.polygonesDuDecor <= LIMITES.decor, `${image.fichier} : ${c.polygonesDuDecor} polygones de décor`);
    assert.ok(c.plusLourdCalqueMobile.poids < LIMITES.mobile, `${image.fichier} : ${c.plusLourdCalqueMobile.nom}`);
  }
});

test('tous les avatars possibles passent les contrôles du rendu, en 240 px comme en 48 px', () => {
  const base = pochetteDExemple(TEXTES);
  const peaux: readonly NomDeTeinte[] = ['vieuxRose', 'noyer', 'bleuFane'];
  let rang = 0;
  for (const tete of Object.keys(TETES) as CleDeTete[])
    for (const dessus of Object.keys(DESSUS) as CleDeDessus[])
      for (const expression of Object.keys(EXPRESSIONS) as NomDExpression[])
        for (const taille of [240, 48]) {
          const peau = peaux[rang++ % peaux.length] ?? 'vieuxRose';
          const pochette: Pochette = { ...base, avatar: { ...base.avatar, tete, dessus, peau } };
          const { pochette: posee } = dessinerLaPochette(
            pochette,
            { nom: 'pochette-essai', centre: [300, 200], angle: 5, taille, expression },
            ENCRIER.largeur,
          );
          assert.deepEqual(controler(posee).constats, [], `${tete}, ${dessus}, ${expression}, ${taille} px`);
        }
});
