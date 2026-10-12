/**
 * « Mon compte », au téléphone : la touche de l'accueil (dans le jeu en ligne seulement), l'adresse qu'on tape, le lien qui part,
 * la page ouverte par le lien (on entre en touchant « Entrer », pas avant), le compte ouvert et sa pochette qui revient, la session
 * gardée, sortir, effacer (qu'on confirme). Chaque étape se dessine avec les signes des polices du site.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEMOIRE_VIDE, memoireDeDepart, recevoir, saisir, toucher, valider, type Memoire, type Preparatifs } from '../src/ecran/telephone/memoire';
import { ecranDuTelephone } from '../src/ecran/telephone/route';
import { choseATouche } from '../src/ecran/telephone/touchers';
import { pochetteDExemple } from '../src/planche/exemples';
import { REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { vueDuCompte } from '../src/scene/telephone/compte';
import { vueDeLAccueil } from '../src/scene/telephone/ecrans';
import { ENCRIER } from './planche';

const A = { textes: TEXTES, encrier: ENCRIER, site: 'miel-doreilles.fr' };
const POCHETTE = pochetteDExemple(TEXTES);
const EN_LIGNE: Preparatifs = {
  mode: 'libre',
  pistes: REGLAGES.pistes.defaut,
  extrait: REGLAGES.extrait.defaut,
  son: 'tous',
  commandes: true,
  playlist: 'essai:tubes',
  chercher: true,
  comptes: true,
  listes: TEXTES.pochette,
  graine: 3,
};
const LIEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const SESSION = 'sessionsessionsessionsessionsessionsession1';

/** L'écran du compte que montre cette mémoire, et ce qu'on peut y toucher. */
function ecranDuCompte(m: Memoire) {
  const e = ecranDuTelephone(m, 0, EN_LIGNE, TEXTES);
  assert.equal(e.genre, 'compte');
  const vue = vueDuCompte(A, e.genre === 'compte' ? e.compte : { etape: 'adresse', email: '' });
  return { e, touches: vue.objets.map((o) => o.nom).filter((nom) => choseATouche(nom, e, TEXTES) !== undefined) };
}

test('la touche « Mon compte » n’est à l’accueil que dans le jeu en ligne', () => {
  const accueil = ecranDuTelephone(MEMOIRE_VIDE, 0, EN_LIGNE, TEXTES);
  assert.deepEqual(accueil, { genre: 'accueil', compte: true });
  assert.ok(vueDeLAccueil(A, true).objets.some((o) => o.nom === 'touche-compte'));
  assert.ok(!vueDeLAccueil(A).objets.some((o) => o.nom === 'touche-compte'));
  assert.deepEqual(ecranDuTelephone(MEMOIRE_VIDE, 0, { ...EN_LIGNE, comptes: false }, TEXTES), { genre: 'accueil', compte: false });
});

test('on tape son adresse, le lien part ; une adresse refusée se dit, et l’on peut en taper une autre', () => {
  let m = toucher(MEMOIRE_VIDE, { genre: 'compte' }, 0, EN_LIGNE).memoire;
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-email', 'touche-envoyer', 'touche-retour']);
  assert.deepEqual(toucher(m, { genre: 'envoyerLeLien' }, 0, EN_LIGNE).actions, [], 'rien de tapé, rien ne part');
  m = saisir(m, ' mateo @example.com');
  let s = valider(m, 0, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'demanderUnLien', email: 'mateo@example.com' }]);
  m = s.memoire;
  assert.deepEqual(toucher(m, { genre: 'envoyerLeLien' }, 0, EN_LIGNE).actions, [], 'on ne demande pas deux fois en attendant');
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-email', 'touche-retour'], 'pas de touche tant qu’on attend');
  const refusee = recevoir(m, { genre: 'refus', heure: 1, raison: 'adresse' });
  assert.equal(ecranDuCompte(refusee).e.genre === 'compte' && ecranDuCompte(refusee).e.compte.refus, 'adresse');
  m = recevoir(m, { genre: 'lienEnvoye', heure: 1, email: 'mateo@example.com' });
  assert.deepEqual(ecranDuCompte(m).touches, ['touche-autre-adresse', 'touche-retour']);
  s = toucher(m, { genre: 'autreAdresse' }, 2, EN_LIGNE);
  assert.equal(s.memoire.preparation.ecran === 'compte' && s.memoire.preparation.etape, 'adresse');
  assert.equal(toucher(m, { genre: 'retour' }, 2, EN_LIGNE).memoire.preparation.ecran, 'accueil');
});

test('la page ouverte par le lien attend qu’on touche « Entrer » ; dedans, la pochette revient et la session se garde', () => {
  let m = memoireDeDepart(EN_LIGNE, { lien: LIEN });
  assert.deepEqual(ecranDuCompte(m).touches, ['touche-entrer-compte', 'touche-retour']);
  const s = toucher(m, { genre: 'entrerParLeLien' }, 0, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'ouvrirLeCompte', lien: LIEN }]);
  // Un lien qui ne marche plus : on le dit, et l'on peut demander un autre lien.
  const perime = recevoir(s.memoire, { genre: 'refus', heure: 1, raison: 'lienPerime' });
  assert.deepEqual(ecranDuCompte(perime).touches, ['touche-autre-adresse', 'touche-retour']);
  m = recevoir(s.memoire, {
    genre: 'compte',
    heure: 1,
    compte: { email: 'mateo@example.com', pochette: POCHETTE, parties: 3, victoires: 1 },
    session: SESSION,
  });
  assert.equal(m.session, SESSION);
  assert.deepEqual(m.pochette, POCHETTE, 'la pochette du compte revient sur ce téléphone');
  assert.deepEqual(ecranDuCompte(m).touches, ['touche-sortir', 'touche-effacer', 'touche-retour']);
  // Un téléphone qui revient avec sa session : la même mémoire, sans le lien.
  assert.equal(memoireDeDepart(EN_LIGNE, { session: SESSION }).session, SESSION);
});

test('dedans : on sort, ou l’on efface tout, après l’avoir confirmé', () => {
  const dedans = recevoir(toucher(MEMOIRE_VIDE, { genre: 'compte' }, 0, EN_LIGNE).memoire, {
    genre: 'compte',
    heure: 1,
    compte: { email: 'mateo@example.com', parties: 0, victoires: 0 },
  });
  assert.deepEqual(toucher(dedans, { genre: 'sortirDuCompte' }, 2, EN_LIGNE).actions, [{ genre: 'sortirDuCompte' }]);
  const question = toucher(dedans, { genre: 'effacerLeCompte' }, 2, EN_LIGNE);
  assert.deepEqual(question.actions, [], 'effacer se confirme');
  assert.deepEqual(ecranDuCompte(question.memoire).touches, ['touche-effacer-vraiment', 'touche-garder', 'touche-retour']);
  assert.deepEqual(toucher(question.memoire, { genre: 'garderLeCompte' }, 3, EN_LIGNE).actions, []);
  const efface = toucher(question.memoire, { genre: 'effacerVraiment' }, 3, EN_LIGNE);
  assert.deepEqual(efface.actions, [{ genre: 'effacerLeCompte' }]);
  const dehors = recevoir(efface.memoire, { genre: 'horsCompte', heure: 4 });
  assert.deepEqual([dehors.compte, dehors.session], [undefined, undefined]);
  assert.deepEqual(ecranDuCompte(dehors).touches, ['etiquette-email', 'touche-envoyer', 'touche-retour']);
});

test('chaque étape du compte se dessine avec les signes des polices du site, une adresse longue comprise', () => {
  const compte = { email: 'mateo.sanchez+miel@example.com', pochette: POCHETTE, parties: 12, victoires: 1 };
  for (const etape of ['adresse', 'envoye', 'lien', 'dedans', 'effacer'] as const)
    for (const refus of [undefined, 'adresse', 'tropDeLiens', 'lienPerime', 'comptesFermes'] as const)
      vueDuCompte(A, { etape, email: compte.email, compte, ...(refus !== undefined ? { refus } : {}) });
});

test('un téléphone déjà dans un compte, ouvert par un lien : le retour dans son compte ne fait pas perdre le lien', () => {
  const m = memoireDeDepart(EN_LIGNE, { lien: LIEN, session: SESSION });
  const revenu = recevoir(m, { genre: 'compte', heure: 1, compte: { email: 'ancien@exemple.fr', parties: 0, victoires: 0 } });
  assert.deepEqual(ecranDuCompte(revenu).touches, ['touche-entrer-compte', 'touche-retour'], 'le lien attend toujours « Entrer »');
  const s = toucher(revenu, { genre: 'entrerParLeLien' }, 2, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'ouvrirLeCompte', lien: LIEN }]);
  const entre = recevoir(s.memoire, {
    genre: 'compte',
    heure: 3,
    compte: { email: 'nouveau@exemple.fr', parties: 0, victoires: 0 },
    session: 'autresessionautresessionautresession1',
  });
  assert.equal(entre.compte?.email, 'nouveau@exemple.fr');
  assert.deepEqual(ecranDuCompte(entre).touches, ['touche-sortir', 'touche-effacer', 'touche-retour']);
});
