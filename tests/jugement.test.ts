/** Le jugement d'une réponse tapée, et les deux premiers modes de jeu. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aLOreille, fautes, juger, normaliser } from '../src/regles/jugement';
import { MODES, MODES_PAR_CRAN } from '../src/regles/modes';
import type { Reponse } from '../src/regles/piste';
import { CAS_DE_JUGER, CAS_DES_PARTIES } from './cas-du-jugement';

const DEMONS: Reponse = { titre: 'Les Démons de minuit', artiste: 'Images', pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } };
const autre = (titre: string, artiste: string): Reponse => ({ titre, artiste, pochette: { vignette: { fond: 'olive', motif: 'damier' } } });
const TOUT_OUBLIER: Reponse = { ...autre('Tout oublier', 'Angèle'), feat: 'Roméo Elvis' };

test('une saisie se ramène à ce qui compte : ni accents, ni majuscules, ni ponctuation, ni « feat. », ni parenthèses, ni petits mots du début', () => {
  assert.equal(normaliser('Les Démons de Minuit'), 'demons de minuit');
  assert.equal(normaliser('  ÉCHOUÉ !  '), 'echoue');
  assert.equal(normaliser('Bad Day (Remastered 2009)'), 'bad day');
  assert.equal(normaliser('Tout oublier feat. Pomme'), 'tout oublier');
  assert.equal(normaliser('Simon & Garfunkel'), 'simon et garfunkel');
  assert.equal(normaliser('Cœur de pirate'), 'coeur de pirate');
  assert.equal(normaliser('The'), 'the', 'un mot seul reste, même petit');
});

test('les fautes de frappe se comptent : une lettre en trop, en moins, changée, ou deux voisines inversées', () => {
  assert.equal(fautes('minuit', 'minuit'), 0);
  assert.equal(fautes('minuit', 'minut'), 1);
  assert.equal(fautes('minuit', 'minuti'), 1);
  assert.equal(fautes('minuit', 'mimuit'), 1);
  assert.equal(fautes('demons', 'deomns'), 1);
});

test('juste, presque ou faux : les fautes de frappe et d’orthographe passent (ce qui se dit pareil), une réponse proche vaut un « Presque. », une autre chanson non', () => {
  // Les cas sont partagés avec le MCP de Honear (tests/cas-du-jugement.ts), qui vérifie contre eux le portage de ce jugement.
  for (const c of CAS_DE_JUGER) assert.equal(juger(c.saisie, c.attendu), c.verdict, `${c.saisie} pour ${c.attendu}`);
  assert.equal(aLOreille('beyonce'), aLOreille('bionse').replace('i', 'e'));
});

test('en saisie libre, chaque cas partagé trouve les parties qu’il dit, avec les surnoms d’une liste sur mesure', () => {
  for (const c of CAS_DES_PARTIES) {
    const reponse = { ...autre(c.titre, c.artiste), ...(c.feat !== undefined ? { feat: c.feat } : {}) };
    const piste = { reponse, ...(c.surnoms !== undefined ? { surnoms: c.surnoms } : {}) };
    assert.deepEqual(MODES.libre.juger({ genre: 'saisie', texte: c.texte }, piste, [...c.deja]), { trouve: c.trouve, verdict: c.verdict }, c.texte);
  }
});

test('le barème de la saisie libre : 1 point par partie trouvée, 1 de plus au premier qui a tout ; un feat est une troisième partie', () => {
  const { libre } = MODES;
  assert.deepEqual(libre.aTrouver({ reponse: TOUT_OUBLIER }), ['artiste', 'titre', 'feat']);
  assert.deepEqual(libre.aTrouver({ reponse: DEMONS }), ['artiste', 'titre'], 'sans feat, deux parties');
  assert.equal(libre.points(['artiste'], false), 1);
  assert.equal(libre.points(['titre'], true), 2);
  assert.equal(libre.points(['artiste', 'titre'], true), 3);
  assert.equal(libre.points(['artiste', 'titre', 'feat'], true), 4);
});

test('First one : le feat ne se cherche pas, mais un invité vaut l’artiste (il chante aussi)', () => {
  const { premierArrive } = MODES;
  const duo = { reponse: TOUT_OUBLIER };
  assert.deepEqual(premierArrive.juger({ genre: 'saisie', texte: 'roméo elvis tout oublier' }, duo, []).trouve, ['artiste', 'titre']);
  assert.deepEqual(premierArrive.juger({ genre: 'saisie', texte: 'angèle' }, duo, []).trouve, ['artiste']);
});

test('en 4 choix, une étiquette est la bonne : 1 point, 1 de plus au plus rapide', () => {
  const { quatreChoix } = MODES;
  const piste = {
    reponse: DEMONS,
    choix: [autre('Voyage, voyage', 'Desireless'), DEMONS, autre('Ouragan', 'Stéphanie'), autre('Femme libérée', 'Cookie Dingler')],
  };
  assert.deepEqual(quatreChoix.juger({ genre: 'choix', rang: 1 }, piste, []), { trouve: ['reponse'], verdict: 'juste' });
  assert.equal(quatreChoix.juger({ genre: 'choix', rang: 0 }, piste, []).verdict, 'faux');
  assert.equal(quatreChoix.juger({ genre: 'saisie', texte: 'les démons de minuit' }, piste, []).verdict, 'faux', 'on ne tape rien en 4 choix');
  assert.equal(quatreChoix.points(['reponse'], true), 2);
  assert.equal(quatreChoix.points(['reponse'], false), 1);
  assert.equal(quatreChoix.reglages.choix, 4);
});

test('le registre range les modes par cran, un cran chacun ; chaque mode a son nom dans les textes et tient le contrat', async () => {
  const { TEXTES } = await import('../src/ressources/textes.fr');
  // Sur la manette : le solo a pris le cran des 4 choix, rangés au-delà, au registre, sans position.
  assert.deepEqual(
    MODES_PAR_CRAN.map((m) => m.cle),
    ['libre', 'solo', 'premierArrive', 'premiereNote'],
  );
  assert.ok(!MODES_PAR_CRAN.includes(MODES.quatreChoix));
  const tous = Object.values(MODES);
  assert.equal(new Set(tous.map((m) => m.cran)).size, tous.length);
  for (const mode of tous) {
    assert.ok(TEXTES.commandes.modes[mode.cle] !== undefined && TEXTES.partie.bareme[mode.cle] !== undefined, mode.cle);
    assert.ok(mode.aTrouver({ reponse: DEMONS }).length > 0 && mode.phases.includes('extrait'), mode.cle);
  }
});
