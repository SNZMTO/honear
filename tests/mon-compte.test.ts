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

const A = { textes: TEXTES, encrier: ENCRIER, site: 'honear.fr' };
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
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-email', 'touche-envoyer', 'touche-avec-mot-de-passe', 'touche-retour']);
  assert.deepEqual(toucher(m, { genre: 'envoyerLeLien' }, 0, EN_LIGNE).actions, [], 'rien de tapé, rien ne part');
  m = saisir(m, ' mateo @example.com');
  let s = valider(m, 0, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'demanderUnLien', email: 'mateo@example.com' }]);
  m = s.memoire;
  assert.deepEqual(toucher(m, { genre: 'envoyerLeLien' }, 0, EN_LIGNE).actions, [], 'on ne demande pas deux fois en attendant');
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-email', 'touche-retour'], 'pas de touches tant qu’on attend');
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
    compte: { email: 'mateo@example.com', pochette: POCHETTE, parties: 3, victoires: 1, motDePasse: false },
    session: SESSION,
  });
  assert.equal(m.session, SESSION);
  assert.deepEqual(m.pochette, POCHETTE, 'la pochette du compte revient sur ce téléphone');
  assert.deepEqual(ecranDuCompte(m).touches, ['touche-choisir-mot-de-passe', 'touche-sortir', 'touche-effacer', 'touche-retour']);
  // Un téléphone qui revient avec sa session : la même mémoire, sans le lien.
  assert.equal(memoireDeDepart(EN_LIGNE, { session: SESSION }).session, SESSION);
});

test('dedans : on sort, ou l’on efface tout, après l’avoir confirmé', () => {
  const dedans = recevoir(toucher(MEMOIRE_VIDE, { genre: 'compte' }, 0, EN_LIGNE).memoire, {
    genre: 'compte',
    heure: 1,
    compte: { email: 'mateo@example.com', parties: 0, victoires: 0, motDePasse: false },
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
  assert.deepEqual(ecranDuCompte(dehors).touches, ['etiquette-email', 'touche-envoyer', 'touche-avec-mot-de-passe', 'touche-retour']);
});

test('chaque étape du compte se dessine avec les signes des polices du site, une adresse longue comprise', () => {
  const compte = { email: 'mateo.sanchez+miel@example.com', pochette: POCHETTE, parties: 12, victoires: 1, motDePasse: false };
  const etapes = ['adresse', 'envoye', 'lien', 'dedans', 'effacer', 'motDePasse', 'nouveauMotDePasse'] as const;
  const refus = [undefined, 'adresse', 'tropDeLiens', 'lienPerime', 'comptesFermes', 'motDePasseFaux', 'tropDEssais', 'motDePasseFaible'] as const;
  for (const etape of etapes)
    for (const r of refus)
      for (const jugement of ['court', 'simple', 'adresse', 'bon'] as const)
        for (const garde of [false, true])
          vueDuCompte(A, { etape, email: compte.email, compte, motDePasse: 30, jugement, garde, ...(r !== undefined ? { refus: r } : {}) });
});

test('un téléphone déjà dans un compte, ouvert par un lien : le retour dans son compte ne fait pas perdre le lien', () => {
  const m = memoireDeDepart(EN_LIGNE, { lien: LIEN, session: SESSION });
  const revenu = recevoir(m, { genre: 'compte', heure: 1, compte: { email: 'ancien@exemple.fr', parties: 0, victoires: 0, motDePasse: false } });
  assert.deepEqual(ecranDuCompte(revenu).touches, ['touche-entrer-compte', 'touche-retour'], 'le lien attend toujours « Entrer »');
  const s = toucher(revenu, { genre: 'entrerParLeLien' }, 2, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'ouvrirLeCompte', lien: LIEN }]);
  const entre = recevoir(s.memoire, {
    genre: 'compte',
    heure: 3,
    compte: { email: 'nouveau@exemple.fr', parties: 0, victoires: 0, motDePasse: false },
    session: 'autresessionautresessionautresession1',
  });
  assert.equal(entre.compte?.email, 'nouveau@exemple.fr');
  assert.deepEqual(ecranDuCompte(entre).touches, ['touche-choisir-mot-de-passe', 'touche-sortir', 'touche-effacer', 'touche-retour']);
});

test('avec un mot de passe : l’adresse d’abord, puis le mot de passe ; faux, il s’efface ; oublié, le lien part ; dedans, on y est', () => {
  let m = toucher(MEMOIRE_VIDE, { genre: 'compte' }, 0, EN_LIGNE).memoire;
  // Sans adresse, l'écran la réclame.
  let s = toucher(m, { genre: 'avecUnMotDePasse' }, 0, EN_LIGNE);
  assert.equal(s.memoire.refus, 'adresse');
  m = saisir(m, 'mateo@example.com');
  m = toucher(m, { genre: 'avecUnMotDePasse' }, 0, EN_LIGNE).memoire;
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-mot-de-passe', 'touche-entrer-mot-de-passe', 'touche-oublie', 'touche-retour']);
  assert.deepEqual(toucher(m, { genre: 'entrerAvecLeMotDePasse' }, 1, EN_LIGNE).actions, [], 'rien de tapé, rien ne part');
  // Ce qu'on tape va au mot de passe ; l'écran n'en voit que la longueur, des points.
  m = saisir(m, 'Vinyle 33 tours !');
  const e = ecranDuCompte(m).e;
  assert.equal(e.genre === 'compte' && e.compte.motDePasse, 17);
  assert.ok(!JSON.stringify(vueDuCompte(A, e.genre === 'compte' ? e.compte : { etape: 'adresse', email: '' })).includes('Vinyle'));
  s = valider(m, 1, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'entrerAvecUnMotDePasse', email: 'mateo@example.com', motDePasse: 'Vinyle 33 tours !' }]);
  // Faux : on le dit, et il s'efface ; on réessaie.
  const faux = recevoir(s.memoire, { genre: 'refus', heure: 2, raison: 'motDePasseFaux' });
  assert.equal(faux.preparation.ecran === 'compte' && faux.preparation.motDePasse, '');
  assert.equal(ecranDuCompte(faux).e.genre === 'compte' && ecranDuCompte(faux).e.compte.refus, 'motDePasseFaux');
  // Oublié : le lien part à l'adresse tapée.
  const oublie = toucher(faux, { genre: 'motDePasseOublie' }, 3, EN_LIGNE);
  assert.deepEqual(oublie.actions, [{ genre: 'demanderUnLien', email: 'mateo@example.com' }]);
  const parti = recevoir(oublie.memoire, { genre: 'lienEnvoye', heure: 4, email: 'mateo@example.com' });
  assert.equal(parti.preparation.ecran === 'compte' && parti.preparation.etape, 'envoye');
  // Retour : à l'adresse, sans le mot de passe.
  const retour = toucher(m, { genre: 'retour' }, 3, EN_LIGNE).memoire;
  assert.equal(retour.preparation.ecran === 'compte' && retour.preparation.etape, 'adresse');
  assert.equal(retour.preparation.ecran === 'compte' && retour.preparation.motDePasse, undefined);
  // Juste : on est dedans, et le mot de passe tapé est oublié.
  const dedans = recevoir(s.memoire, {
    genre: 'compte',
    heure: 2,
    compte: { email: 'mateo@example.com', parties: 0, victoires: 0, motDePasse: true },
    session: SESSION,
  });
  assert.equal(dedans.session, SESSION);
  assert.equal(dedans.preparation.ecran === 'compte' && dedans.preparation.motDePasse, undefined);
  assert.equal(ecranDuCompte(dedans).e.genre === 'compte' && ecranDuCompte(dedans).e.compte.etape, 'dedans');
});

test('dans son compte, on choisit un mot de passe : trop faible, il ne part pas ; gardé, l’écran le dit ; « Retour » ramène au compte', () => {
  const dedans = recevoir(toucher(MEMOIRE_VIDE, { genre: 'compte' }, 0, EN_LIGNE).memoire, {
    genre: 'compte',
    heure: 1,
    compte: { email: 'mateo@example.com', parties: 2, victoires: 1, motDePasse: false },
  });
  let m = toucher(dedans, { genre: 'nouveauMotDePasse' }, 2, EN_LIGNE).memoire;
  assert.deepEqual(ecranDuCompte(m).touches, ['etiquette-mot-de-passe', 'touche-garder-mot-de-passe', 'touche-retour']);
  m = saisir(m, 'mateo123');
  assert.equal(ecranDuCompte(m).e.genre === 'compte' && ecranDuCompte(m).e.compte.jugement, 'adresse');
  const faible = toucher(m, { genre: 'garderLeMotDePasse' }, 3, EN_LIGNE);
  assert.deepEqual([faible.actions, faible.memoire.refus], [[], 'motDePasseFaible'], 'trop faible, il ne part pas');
  m = saisir(m, 'Le 45 tours de Mamie');
  assert.equal(ecranDuCompte(m).e.genre === 'compte' && ecranDuCompte(m).e.compte.jugement, 'bon');
  const s = valider(m, 3, EN_LIGNE);
  assert.deepEqual(s.actions, [{ genre: 'choisirUnMotDePasse', motDePasse: 'Le 45 tours de Mamie' }]);
  const garde = recevoir(s.memoire, {
    genre: 'compte',
    heure: 4,
    compte: { email: 'mateo@example.com', parties: 2, victoires: 1, motDePasse: true },
  });
  const e = ecranDuCompte(garde).e;
  assert.deepEqual(e.genre === 'compte' && [e.compte.etape, e.compte.garde], ['dedans', true]);
  assert.equal(garde.preparation.ecran === 'compte' && garde.preparation.motDePasse, undefined, 'le mot de passe tapé est oublié');
  const retour = toucher(toucher(garde, { genre: 'nouveauMotDePasse' }, 5, EN_LIGNE).memoire, { genre: 'retour' }, 5, EN_LIGNE).memoire;
  assert.equal(ecranDuCompte(retour).e.genre === 'compte' && ecranDuCompte(retour).e.compte.etape, 'dedans');
});
