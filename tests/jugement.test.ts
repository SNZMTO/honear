/** Le jugement d'une réponse tapée, et les deux premiers modes de jeu. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fautes, juger, normaliser } from '../src/regles/jugement';
import { MODES, MODES_PAR_CRAN } from '../src/regles/modes';
import type { Reponse } from '../src/regles/piste';

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

test('juste, presque ou faux : on tolère les fautes de frappe, et une réponse proche vaut un « Presque. »', () => {
  for (const s of ['les demons de minuit', 'Démons de minuit', 'les demosn de minuit', 'LES DÉMONS DE MINUIT (version longue)', 'lesdemonsdeminuit'])
    assert.equal(juger(s, DEMONS.titre), 'juste', s);
  for (const s of ['les demons du minou', 'démons de minuit et demi', 'les demons de']) assert.equal(juger(s, DEMONS.titre), 'presque', s);
  for (const s of ['', 'voyage voyage', 'minuit', 'demons']) assert.equal(juger(s, DEMONS.titre), 'faux', s);
  assert.equal(juger('imajes', 'Images'), 'juste');
  assert.equal(juger('Images feat. personne', 'Images'), 'juste');
});

test('en saisie libre, sans feat, on trouve l’artiste, le titre, ou les deux d’un coup ; 1 point par partie trouvée, 1 de plus au premier qui a tout', () => {
  const { libre } = MODES;
  const piste = { reponse: DEMONS };
  assert.deepEqual(libre.juger({ genre: 'saisie', texte: 'images' }, piste, []), { trouve: ['artiste'], verdict: 'juste' });
  assert.deepEqual(libre.juger({ genre: 'saisie', texte: 'les démons de minuit' }, piste, ['artiste']), { trouve: ['titre'], verdict: 'juste' });
  assert.deepEqual(libre.juger({ genre: 'saisie', texte: 'Images - Les Démons de minuit' }, piste, []), {
    trouve: ['artiste', 'titre'],
    verdict: 'juste',
  });
  assert.deepEqual(
    libre.juger({ genre: 'saisie', texte: 'images' }, piste, ['artiste']),
    { trouve: [], verdict: 'faux' },
    'déjà trouvé : rien de plus',
  );
  assert.equal(libre.juger({ genre: 'saisie', texte: 'les demons du minou' }, piste, []).verdict, 'presque');
  assert.equal(libre.points(['artiste'], false), 1);
  assert.equal(libre.points(['titre'], true), 2);
  assert.equal(libre.points(['artiste', 'titre'], true), 3);
});

test('une piste avec un feat a trois parties à trouver : l’artiste, le titre et le feat, une par une ou d’un coup, dans n’importe quel ordre', () => {
  const { libre } = MODES;
  const piste = { reponse: TOUT_OUBLIER };
  assert.deepEqual(libre.aTrouver(piste), ['artiste', 'titre', 'feat']);
  assert.deepEqual(libre.aTrouver({ reponse: DEMONS }), ['artiste', 'titre'], 'sans feat, deux parties');
  const trouve = (texte: string, deja: string[] = []): readonly string[] => libre.juger({ genre: 'saisie', texte }, piste, deja).trouve;
  assert.deepEqual(trouve('romeo elvis'), ['feat']);
  assert.deepEqual(trouve('Angèle feat. Roméo Elvis'), ['artiste', 'feat']);
  assert.deepEqual(trouve('angele ft romeo elvis'), ['artiste', 'feat']);
  assert.deepEqual(trouve('angele romeo elvis'), ['artiste', 'feat']);
  assert.deepEqual(trouve('tout oublier angele romeo elvis'), ['artiste', 'titre', 'feat']);
  assert.deepEqual(trouve('Roméo Elvis x Angèle - Tout oublier'), ['artiste', 'titre', 'feat']);
  assert.deepEqual(trouve('tout oublier', ['artiste', 'feat']), ['titre']);
  assert.equal(libre.juger({ genre: 'saisie', texte: 'romeo elvi' }, piste, []).verdict, 'juste', 'une faute de frappe passe');
  assert.equal(libre.juger({ genre: 'saisie', texte: 'romeo' }, piste, []).verdict, 'presque');
  // Un titre qui contient un mot de liaison se trouve quand même, seul ou avec son artiste.
  const ferre = { reponse: autre('Avec le temps', 'Léo Ferré') };
  assert.deepEqual(libre.juger({ genre: 'saisie', texte: 'avec le temps' }, ferre, []).trouve, ['titre']);
  assert.deepEqual(libre.juger({ genre: 'saisie', texte: 'léo ferré avec le temps' }, ferre, []).trouve, ['artiste', 'titre']);
  // Le barème ne change pas : 1 par partie, 1 de plus au premier qui a tout.
  assert.equal(libre.points(['artiste', 'titre', 'feat'], true), 4);
});

test('un feat de plusieurs invités se trouve avec l’un d’eux, et ce qu’on tape se lit mot à mot, sans virgule ni « feat »', () => {
  const { libre, premierArrive } = MODES;
  const bande = { reponse: { ...autre('Bande organisée', 'Kofs'), feat: 'Soso Maness, Elams, Jul, SCH, Naps & 13 Organisé' } };
  const trouve = (texte: string, piste: { readonly reponse: Reponse } = bande): readonly string[] =>
    libre.juger({ genre: 'saisie', texte }, piste, []).trouve;
  assert.deepEqual(trouve('jul'), ['feat']);
  assert.deepEqual(trouve('SCH'), ['feat']);
  assert.deepEqual(trouve('kofs jul'), ['artiste', 'feat']);
  assert.deepEqual(trouve('bande organisée 13 organisé'), ['titre', 'feat']);
  assert.deepEqual(trouve('gradur', { reponse: { ...autre('Sapés comme jamais', 'GIMS'), feat: 'Alonzo, Gradur, KeBlack & Awa Imani' } }), ['feat']);
  assert.deepEqual(trouve('daft punk around the world', { reponse: autre('Around the World', 'Daft Punk') }), ['artiste', 'titre']);
  // Un mot court ne vaut une partie que s'il est toute la saisie : un bout de phrase ne trouve pas -M- par hasard.
  assert.deepEqual(trouve('m pokora', { reponse: autre('Je dis aime', '-M-') }), []);
  assert.deepEqual(trouve('m', { reponse: autre('Je dis aime', '-M-') }), ['artiste']);
  assert.equal(libre.juger({ genre: 'saisie', texte: 'on danse' }, { reponse: autre('Alors on danse', 'Stromae') }, []).verdict, 'presque');
  // First one : le feat ne se cherche pas, mais un invité vaut l'artiste (il chante aussi).
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
  assert.deepEqual(
    MODES_PAR_CRAN.map((m) => m.cle),
    ['libre', 'quatreChoix', 'premierArrive', 'premiereNote'],
  );
  assert.equal(new Set(MODES_PAR_CRAN.map((m) => m.cran)).size, MODES_PAR_CRAN.length);
  for (const mode of MODES_PAR_CRAN) {
    assert.ok(TEXTES.commandes.modes[mode.cle] !== undefined && TEXTES.partie.bareme[mode.cle] !== undefined, mode.cle);
    assert.ok(mode.aTrouver({ reponse: DEMONS }).length > 0 && mode.phases.includes('extrait'), mode.cle);
  }
});
