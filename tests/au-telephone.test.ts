/**
 * Le téléphone à l'usage, tel que l'audit de la version mobile l'a repris : le meuble ne se rebâtit pas d'une lettre tapée à
 * l'autre ; les points s'accordent ; le vrai clavier ne se dessine pas ; la citrouille de saison ne se glisse sous rien de ce que
 * l'écran montre.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chargerLEncrier } from '../src/planche/polices';
import { journalDExemple } from '../src/planche/etape5/scenes';
import { MODES } from '../src/regles/modes';
import { partieA } from '../src/regles/partie';
import { TEXTES } from '../src/ressources/textes.fr';
import { pointsEcrits } from '../src/scene/phrases';
import { empriseDe } from '../src/scene/rendu/emprise';
import { decorDHalloween } from '../src/scene/saison/halloween';
import { vueDuCompte } from '../src/scene/telephone/compte';
import { vueDeLAccueil, vueDeLaSaisie, vueDesReglages, vueDuBac } from '../src/scene/telephone/ecrans';
import { regardPourLaFenetre } from '../src/scene/telephone/grand';
import { platineArretee } from '../src/scene/telephone/meuble';
import { SUR_LA_PLATINE } from '../src/scene/telephone/pieces';
import { pouceDeLaPiste } from '../src/scene/telephone/piste';
import { vueDeLaPochette } from '../src/scene/telephone/pochette';
import { pochetteDExemple } from '../src/planche/exemples';

const A = { textes: TEXTES, encrier: chargerLEncrier(TEXTES.langue) };

test('la platine, le bac et l’ampli ne se rebâtissent pas d’une lettre tapée à l’autre : l’écran les retrouve tels quels', () => {
  const avant = vueDeLaSaisie(A, 'A', undefined).objets.find((c) => c.nom === 'platine');
  const apres = vueDeLaSaisie(A, 'AB', undefined).objets.find((c) => c.nom === 'platine');
  assert.ok(avant !== undefined && avant === apres, 'la même platine, d’une lettre à l’autre');
  assert.equal(
    platineArretee(A),
    vueDeLAccueil(A).objets.find((c) => c.nom === 'platine'),
    'celle de l’accueil aussi',
  );
  // D'autres réglages, une autre platine : le code de la room sur son disque, un autre mode.
  assert.notEqual(platineArretee(A, { code: { code: 'AENV', joueurs: 2 } }), platineArretee(A));
  assert.notEqual(platineArretee(A, { mode: MODES.quatreChoix.cran }), platineArretee(A));
  const bac = (recherche: string) => vueDuBac(A, { cran: 'chercher', recherche }).objets.find((c) => c.nom === 'bac');
  assert.ok(bac('ab') !== undefined && bac('ab') === bac('abc'), 'le même bac, d’une lettre cherchée à l’autre');
});

test('les points s’écrivent au singulier jusqu’à un, au pluriel ensuite', () => {
  assert.deepEqual(
    [0, 1, 2, 12].map((n) => pointsEcrits(TEXTES, n)),
    ['0 pt', '1 pt', '2 pts', '12 pts'],
  );
});

test('le vrai clavier du téléphone ne se dessine pas : seul celui qui tape tout seul (le prototype) a sa place dessinée', () => {
  const journal = journalDExemple(TEXTES);
  const etat = partieA(journal, Infinity);
  const autour = (vrai: boolean) =>
    pouceDeLaPiste(A, SUR_LA_PLATINE, {
      etat,
      avantLExtrait: etat,
      toi: 'toi',
      repondre: { genre: 'saisie', tape: 'images', clavier: true, ...(vrai ? { vrai: true } : {}) },
    }).map((c) => c.nom);
  assert.ok(!autour(true).includes('decor-clavier'));
  assert.ok(autour(false).includes('decor-clavier'));
  assert.ok(autour(true).includes('etiquette-reponse'), 'l’étiquette, elle, est là, au-dessus du clavier');
});

test('la citrouille de saison ne se glisse sous rien de ce que l’écran montre, dans une fenêtre d’iPhone comme dans celle du téléphone', () => {
  const vues = [
    vueDeLAccueil(A, true, true),
    vueDeLaSaisie(A, 'AB', 'codeInconnu'),
    vueDeLaPochette(A, pochetteDExemple(TEXTES), 'dessus', false, true),
    vueDesReglages(A, MODES.libre),
    vueDuBac(A, { cran: 'pretes' }),
    vueDuCompte(A, { etape: 'adresse', email: '', enAttente: false }),
  ];
  let posees = 0;
  for (const proportion of [SUR_LA_PLATINE.largeur / SUR_LA_PLATINE.hauteur, 0.57]) {
    for (const vue of vues) {
      const regard = regardPourLaFenetre(proportion, vue.regard);
      const decor = decorDHalloween(regard, vue.objets, A.encrier.largeur);
      const citrouille = decor.dessous.filter((c) => c.nom.startsWith('babiole-citrouille') && !c.nom.endsWith('/ombre'));
      const e = empriseDe(citrouille, A.encrier.largeur);
      if (e === undefined) continue;
      posees++;
      for (const objet of vue.objets) {
        const o = empriseDe([objet], A.encrier.largeur);
        if (o === undefined) continue;
        const chevauche: boolean = e.x < o.x + o.largeur && o.x < e.x + e.largeur && e.y < o.y + o.hauteur && o.y < e.y + e.hauteur;
        assert.ok(!chevauche, `la citrouille touche « ${objet.nom} »`);
      }
    }
  }
  assert.ok(posees > 0, 'il reste des écrans où elle a sa place');
});
