/**
 * Les vraies pochettes : l'image que la source donne d'un titre, posée à la révélation sur le carton dessiné, et sur le dos des
 * titres joués, qu'on revoit en touchant leur papier à la finale. Sans image, la vignette reste.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoireDeDepart, recevoir, toucher, type Memoire, type Preparatifs } from '../src/ecran/telephone/memoire';
import { ecranDuTelephone } from '../src/ecran/telephone/route';
import { choseATouche } from '../src/ecran/telephone/touchers';
import { chargerLEncrier } from '../src/planche/polices';
import { pochetteDExemple } from '../src/planche/exemples';
import type { EvenementDePartie } from '../src/regles/partie';
import type { Reponse } from '../src/regles/piste';
import { TEXTES } from '../src/ressources/textes.fr';
import { vueDeLaFinale } from '../src/scene/telephone/ecrans';
import { SUR_LA_PLATINE } from '../src/scene/telephone/pieces';
import { dessusDeLaVraiePochette } from '../src/scene/telephone/piste';
import { imagesDesTitres, vueDesTitres } from '../src/scene/telephone/titres';
import { dessinerLeMeuble } from '../src/scene/meuble';
import { DENSITE } from '../src/scene/telephone/pieces';
import { controler } from '../src/scene/rendu/controle';

const encrier = chargerLEncrier(TEXTES.langue);
const A = { textes: TEXTES, encrier };
const POCHETTE = pochetteDExemple(TEXTES);

const titre = (n: number, image = true): Reponse => ({
  titre: `Chanson ${n}`,
  artiste: `Groupe ${n}`,
  pochette: {
    vignette: { fond: 'olive', motif: 'rayons' },
    ...(image ? { image: `https://cdn-images.dzcdn.net/images/cover/${n.toString(16).padStart(32, '0')}/500x500-000000-80-0-0.jpg` } : {}),
  },
});

const P: Preparatifs = {
  mode: 'libre',
  pistes: 1,
  extrait: 20,
  son: 'tous',
  commandes: false,
  chercher: false,
  playlist: 'bac',
  listes: TEXTES.pochette,
  graine: 7,
};

test('la vraie pochette révélée se pose sur le dessus du carton, dans le regard', () => {
  const d = dessusDeLaVraiePochette();
  assert.ok(d.cote > 0 && d.ecrasement > 0 && d.ecrasement < 1);
  for (const v of [d.centre[0] - d.cote / 2, d.centre[0] + d.cote / 2]) assert.ok(v >= 0 && v <= SUR_LA_PLATINE.largeur);
  for (const v of [d.centre[1] - d.cote / 2, d.centre[1] + d.cote / 2]) assert.ok(v >= 0 && v <= SUR_LA_PLATINE.hauteur);
});

test('le dos des titres joués : une colonne jusqu’à dix, deux au-delà ; une image par titre qui en a une, chacune à sa place', () => {
  const dix = imagesDesTitres(Array.from({ length: 10 }, (_, i) => titre(i + 1)));
  assert.equal(dix.length, 10);
  assert.equal(new Set(dix.map((i) => i.centre[0])).size, 1, 'une colonne');
  const vingt = imagesDesTitres(Array.from({ length: 20 }, (_, i) => titre(i + 1, i !== 4)));
  assert.equal(vingt.length, 19, 'le titre sans image garde sa vignette');
  assert.equal(new Set(vingt.map((i) => i.centre[0])).size, 2, 'deux colonnes');
  for (const i of vingt) assert.ok(i.centre[1] + i.cote / 2 < 760 && i.centre[0] + i.cote / 2 < 390);
  // L'écran se dessine sans défaut, avec vingt titres.
  const v = vueDesTitres(
    A,
    Array.from({ length: 20 }, (_, i) => titre(i + 1)),
  );
  assert.deepEqual(controler(dessinerLeMeuble({ regard: v.regard, densite: DENSITE, objets: v.objets })).constats, []);
});

test('à la finale, le papier dit combien de titres on a joués, et se touche pour les revoir ; « Retour » y ramène', () => {
  const joues = Array.from({ length: 15 }, (_, i) => titre(i + 1));
  const journal: EvenementDePartie[] = [
    { genre: 'ouverture', a: 0, mode: 'libre', pistes: 1 },
    { genre: 'arrivee', a: 1, id: 'j1', pochette: POCHETTE },
    { genre: 'extrait', a: 10, piste: { reponse: titre(1) } },
    { genre: 'revelation', a: 20, reponse: titre(1) },
  ];
  let m: Memoire = recevoir(memoireDeDepart(P, {}), { genre: 'etat', heure: 30, code: 'FUNK', toi: 'j1', jeton: 'x', journal, seance: [] });
  const finale = ecranDuTelephone(m, 30, P, TEXTES);
  assert.equal(finale.genre, 'finale');
  if (finale.genre !== 'finale') return;
  const vue = vueDeLaFinale(A, finale.etat, joues, true, true, true);
  const papier = vue.objets.find((o) => o.nom === 'etiquette-titres');
  assert.ok(papier !== undefined);
  const ecrit = JSON.stringify(papier);
  assert.ok(ecrit.includes('15 titres') && ecrit.includes(TEXTES.partie.revoir) && !ecrit.includes('Chanson 7'));
  assert.equal(choseATouche('etiquette-titres', finale, TEXTES)?.toucher.genre, 'revoirLesTitres');
  m = toucher(m, { genre: 'revoirLesTitres' }, 30, P).memoire;
  const titres = ecranDuTelephone(m, 30, P, TEXTES);
  assert.equal(titres.genre, 'titres');
  assert.deepEqual(titres.genre === 'titres' ? titres.joues.map((j) => j.titre) : [], ['Chanson 1']);
  m = toucher(m, { genre: 'fermerLesTitres' }, 30, P).memoire;
  assert.equal(ecranDuTelephone(m, 30, P, TEXTES).genre, 'finale');
  // La room qui repart (la face B) referme les titres d'avant.
  m = toucher(m, { genre: 'revoirLesTitres' }, 30, P).memoire;
  m = recevoir(m, { genre: 'etat', heure: 40, code: 'FUNK', toi: 'j1', jeton: 'x', journal: journal.slice(0, 2), seance: [] });
  assert.equal(ecranDuTelephone(m, 40, P, TEXTES).genre, 'salon');
});
