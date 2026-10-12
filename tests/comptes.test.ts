/**
 * Les comptes : une adresse e-mail, un lien qui ne sert qu'une fois, un quart d'heure, une session que le téléphone garde, ce que le
 * fichier garde (jamais un secret, seulement son empreinte), les envois limités, les scores comptés à la fin d'une face (que le
 * serveur du jeu signale). Et le courrier : le message tel qu'il part, et le dialogue avec un faux serveur d'envoi.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import { adresseEmail, lettreDAvertissement, lettreDuLien, ouvrirLesComptes, type OptionsDesComptes } from '../src/reseau/comptes';
import { composer, posterParSmtp, type Lettre } from '../src/reseau/courrier';
import { REGLAGES } from '../src/ressources/reglages';
import { RESEAU } from '../src/ressources/reseau';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { PISTES_D_ESSAI } from '../src/serveur/sources/essai';
import { unFauxServeurDEnvoi } from './faux-courrier';

const C = RESEAU.comptes;
const POCHETTE = pochetteDExemple(TEXTES);
const LETTRE = lettreDuLien(TEXTES.compte.courrier, 'https://honear.fr');

/** Des comptes contre une horloge qu'on avance, des secrets qu'on lit, et un courrier qui garde ses lettres au lieu de les envoyer. */
function desComptes(autres: Partial<OptionsDesComptes> = {}) {
  const horloge = { t: 1_760_000_000 };
  let n = 0;
  const lettres: Lettre[] = [];
  const garde: string[] = [];
  const comptes = ouvrirLesComptes({
    monde: () => horloge.t,
    secret: () => `secret-${String(++n).padStart(4, '0')}-abcdefghijklmnop`,
    identifiant: () => `compte-${++n}`,
    empreinte: (s) => createHash('sha256').update(s).digest('hex'),
    lu: undefined,
    garder: (texte) => garde.push(texte),
    poster: (lettre) => {
      lettres.push(lettre);
      return Promise.resolve();
    },
    lettre: LETTRE,
    ...autres,
  });
  /** Le secret du dernier lien envoyé, lu dans sa lettre. */
  const dernierLien = (): string => /#connexion=([A-Za-z0-9_-]+)/.exec(lettres[lettres.length - 1]?.texte ?? '')?.[1] ?? '';
  return { comptes, horloge, lettres, garde, dernierLien };
}

test('une adresse e-mail : sans espace autour, en minuscules ; rien de ce qui n’en est pas une', () => {
  assert.equal(adresseEmail('  Mateo.Sanchez+miel@Example.COM '), 'mateo.sanchez+miel@example.com');
  for (const pas of [
    'mateo',
    'mateo@',
    '@example.com',
    'mateo@example',
    'ma teo@example.com',
    'mateo@example..com',
    'a..b@example.com',
    'mateo@example.com\r\nBcc: x@y.z',
    `${'a'.repeat(250)}@example.com`,
  ])
    assert.equal(adresseEmail(pas), undefined, pas);
});

test('un compte qui dort deux ans s’efface, avec ses sessions ; un mois avant, une lettre prévient ; y revenir le garde', async () => {
  const { comptes, horloge, lettres, dernierLien, garde } = desComptes({
    avertissement: lettreDAvertissement(TEXTES.compte.courrier, 'https://honear.fr'),
  });
  const I = C.inactif;
  await comptes.demanderUnLien('dort@example.com', '1.2.3.4');
  const dort = comptes.ouvrir(dernierLien());
  await comptes.demanderUnLien('revient@example.com', '1.2.3.5');
  const revient = comptes.ouvrir(dernierLien());
  assert.ok(dort !== undefined && revient !== undefined);
  // Presque deux ans plus tard : les deux sont prévenus, une fois.
  horloge.t += I.efface - I.prevenu + 1;
  lettres.length = 0;
  await comptes.entretenir();
  assert.deepEqual(lettres.map((l) => [l.a, l.sujet]).sort(), [
    ['dort@example.com', TEXTES.compte.courrier.dortSujet],
    ['revient@example.com', TEXTES.compte.courrier.dortSujet],
  ]);
  await comptes.entretenir();
  assert.equal(lettres.length, 2, 'on ne prévient qu’une fois');
  // L'un revient (sa session a expiré depuis longtemps : il redemande un lien) : il est vu, et ne dort plus. L'autre passe les
  // deux ans : il est effacé.
  await comptes.demanderUnLien('revient@example.com', '1.2.3.5');
  assert.equal(comptes.ouvrir(dernierLien())?.id, revient.id);
  horloge.t += I.prevenu;
  await comptes.entretenir();
  assert.equal(comptes.vu(dort.id), undefined, 'le compte qui dort est effacé');
  assert.ok(comptes.vu(revient.id) !== undefined, 'celui qui est revenu reste');
  assert.ok(!(garde[garde.length - 1] ?? '').includes('dort@example.com'), 'le fichier ne garde plus son adresse');
});

test('on entre par un lien envoyé à son adresse : il ne sert qu’une fois, un quart d’heure ; la session, elle, ramène dans le compte', async () => {
  const { comptes, horloge, lettres, dernierLien } = desComptes();
  assert.equal(await comptes.demanderUnLien('Mateo@Example.com', '1.2.3.4'), 'envoye');
  assert.equal(lettres[0]?.a, 'mateo@example.com');
  assert.equal(lettres[0]?.sujet, TEXTES.compte.courrier.sujet);
  assert.match(lettres[0]?.texte ?? '', /^https:\/\/honear\.fr\/#connexion=[A-Za-z0-9_-]+$/m);
  assert.match(lettres[0]?.html ?? '', /href="https:\/\/honear\.fr\/#connexion=/);
  const lien = dernierLien();
  const ouvert = comptes.ouvrir(lien);
  assert.ok(ouvert !== undefined);
  assert.deepEqual(ouvert.compte, { email: 'mateo@example.com', parties: 0, victoires: 0 });
  assert.equal(comptes.ouvrir(lien), undefined, 'un lien ne sert qu’une fois');
  assert.equal(comptes.reprendre(ouvert.session)?.id, ouvert.id);
  // Le même compte, par un autre lien, un autre jour.
  horloge.t += 3 * 3600;
  await comptes.demanderUnLien('mateo@example.com', '5.6.7.8');
  assert.equal(comptes.ouvrir(dernierLien())?.id, ouvert.id);
  // Un lien trop vieux ne marche plus.
  horloge.t += 3600;
  await comptes.demanderUnLien('mateo@example.com', '5.6.7.8');
  horloge.t += C.lien;
  assert.equal(comptes.ouvrir(dernierLien()), undefined);
  // Sortir oublie la session ; une session trop vieille ne ramène plus.
  comptes.sortir(ouvert.session);
  assert.equal(comptes.reprendre(ouvert.session), undefined);
});

test('les envois sont comptés : un par minute et cinq par heure pour une adresse, dix par heure depuis un téléphone ; sans courrier, les comptes sont fermés', async () => {
  const { comptes, horloge } = desComptes();
  assert.equal(await comptes.demanderUnLien('a@exemple.fr', 'ici'), 'envoye');
  assert.equal(await comptes.demanderUnLien('a@exemple.fr', 'ici'), 'tropDeLiens');
  for (let k = 1; k < C.parAdresse.parHeure; k++) {
    horloge.t += C.parAdresse.attente;
    assert.equal(await comptes.demanderUnLien('a@exemple.fr', `ailleurs-${k}`), 'envoye');
  }
  horloge.t += C.parAdresse.attente;
  assert.equal(await comptes.demanderUnLien('a@exemple.fr', 'encore'), 'tropDeLiens', 'cinq par heure');
  const parTelephone = await Promise.all(Array.from({ length: C.parTelephone + 1 }, (_, k) => comptes.demanderUnLien(`b${k}@exemple.fr`, 'le-meme')));
  assert.equal(parTelephone.filter((e) => e === 'envoye').length, C.parTelephone, 'le même téléphone, dix par heure en tout');
  assert.equal(await comptes.demanderUnLien('pas une adresse', 'ici'), 'adresse');
  assert.equal(await desComptes({ poster: undefined }).comptes.demanderUnLien('a@exemple.fr', 'ici'), 'comptesFermes');
  // Le courrier ne part pas : on le dit, et le lien qu'il portait ne marche pas.
  const rate = desComptes({ poster: () => Promise.reject(new Error('panne')) });
  assert.equal(await rate.comptes.demanderUnLien('a@exemple.fr', 'ici'), 'comptesFermes');
});

test('le fichier garde les comptes et les sessions, jamais un secret ; relu, il ramène chacun dans son compte', async () => {
  const { comptes, garde, dernierLien } = desComptes();
  await comptes.demanderUnLien('mateo@example.com', 'ici');
  const ouvert = comptes.ouvrir(dernierLien());
  assert.ok(ouvert !== undefined);
  comptes.garderLaPochette(ouvert.id, POCHETTE);
  const fichier = garde[garde.length - 1] ?? '';
  assert.ok(!fichier.includes(ouvert.session), 'le secret de la session n’est pas dans le fichier');
  assert.ok(!fichier.includes('secret-'), 'aucun secret');
  const relus = desComptes({ lu: fichier });
  assert.deepEqual(relus.comptes.reprendre(ouvert.session)?.compte, { email: 'mateo@example.com', pochette: POCHETTE, parties: 0, victoires: 0 });
  // Un fichier abîmé ne casse rien : on repart sans comptes.
  assert.equal(desComptes({ lu: '{pas du json' }).comptes.reprendre(ouvert.session), undefined);
  // Effacer : le compte, ses sessions, tout part.
  relus.comptes.effacer(ouvert.id);
  assert.equal(relus.comptes.reprendre(ouvert.session), undefined);
  assert.ok(!(relus.garde[relus.garde.length - 1] ?? '').includes('mateo@example.com'));
});

test('une face finie compte une partie à chacun de ceux qui y jouaient sous un compte, et une victoire au premier', async () => {
  const { comptes, dernierLien } = desComptes();
  await comptes.demanderUnLien('un@exemple.fr', 'a');
  const un = comptes.ouvrir(dernierLien());
  await comptes.demanderUnLien('deux@exemple.fr', 'b');
  const deux = comptes.ouvrir(dernierLien());
  assert.ok(un !== undefined && deux !== undefined);
  comptes.attacher('FUNK', 'j1', un.id);
  comptes.attacher('FUNK', 'j2', deux.id);
  comptes.faceFinie('FUNK', [
    { joueur: 'j1', premier: true },
    { joueur: 'j2', premier: false },
    { joueur: 'j3', premier: false },
  ]);
  comptes.faceFinie('SOUL', [{ joueur: 'j1', premier: true }]);
  assert.deepEqual([comptes.vu(un.id)?.parties, comptes.vu(un.id)?.victoires], [1, 1]);
  assert.deepEqual([comptes.vu(deux.id)?.parties, comptes.vu(deux.id)?.victoires], [1, 0]);
});

test('le courrier : le message tel qu’il part, et ce qu’en reçoit un serveur d’envoi', async () => {
  const lettre = LETTRE('mateo@example.com', 'abcdefghijklmnopqrstuvwxyz012345');
  const message = composer('Honear <bonjour@honear.fr>', lettre, 'Sun, 11 Oct 2026 22:30:00 +0000', '0123abcd');
  // Un nom et un sujet en ASCII s'écrivent tels quels ; avec des accents, ils sont encodés.
  assert.match(message, /^From: Honear <bonjour@honear\.fr>\r\n/);
  assert.match(message, /\r\nSubject: Ton lien pour entrer dans Honear\r\n/);
  const accentue = composer(
    'Hônear <bonjour@honear.fr>',
    { ...lettre, sujet: 'Ton compte va être effacé' },
    'Sun, 11 Oct 2026 22:30:00 +0000',
    '0123abcd',
  );
  assert.match(accentue, /^From: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?= <bonjour@honear\.fr>\r\n/);
  assert.match(accentue, /\r\nSubject: =\?UTF-8\?B\?/);
  assert.ok(
    message.split('\r\n').every((ligne) => ligne.length <= 998 && !ligne.startsWith('.')),
    'des lignes que le courrier accepte',
  );

  const faux = await unFauxServeurDEnvoi();
  try {
    const poster = posterParSmtp(
      {
        hote: '127.0.0.1',
        port: faux.port,
        utilisateur: 'bonjour@honear.fr',
        motDePasse: 'mot de passe',
        de: 'Honear <bonjour@honear.fr>',
        chiffre: false,
        patience: 2000,
      },
      () => 'Sun, 11 Oct 2026 22:30:00 +0000',
    );
    await poster(lettre);
    const recue = faux.lettres[0];
    assert.equal(recue?.de, 'bonjour@honear.fr');
    assert.equal(recue?.a, 'mateo@example.com');
    assert.equal(recue?.texte, lettre.texte);
    assert.equal(recue?.html, lettre.html);
    const auth = faux.dialogues[0]?.find((l) => l.startsWith('AUTH PLAIN ')) ?? '';
    assert.equal(Buffer.from(auth.slice('AUTH PLAIN '.length), 'base64').toString('utf8'), '\u0000bonjour@honear.fr\u0000mot de passe');
    await assert.rejects(poster({ ...lettre, a: 'x@y.z\r\nRCPT TO:<autre@y.z>' }), /illisible/);
  } finally {
    await faux.fermer();
  }
  const refuse = await unFauxServeurDEnvoi(535);
  try {
    const poster = posterParSmtp(
      { hote: '127.0.0.1', port: refuse.port, utilisateur: 'u', motDePasse: 'faux', de: 'u@exemple.fr', chiffre: false, patience: 2000 },
      () => 'x',
    );
    await assert.rejects(poster(lettre), /535/);
  } finally {
    await refuse.fermer();
  }
});

test('le serveur dit quand une face est finie, une fois, avec son classement : de quoi compter les scores des comptes', () => {
  const horloge = { t: 0 };
  const finies: { code: string; phase: string; joueurs: number }[] = [];
  const serveur = demarrerLeServeur({
    maintenant: () => horloge.t,
    tirage: hasard(9).suivant,
    jeton: (() => {
      let n = 0;
      return () => `jeton-${++n}`;
    })(),
    playlist: () => PISTES_D_ESSAI,
    quandUneFaceFinit: (code, etat) => finies.push({ code, phase: etat.phase, joueurs: etat.joueurs.length }),
  });
  let code = '';
  const hote = serveur.connecter((n) => {
    if (n.genre === 'etat') code = n.code;
  });
  hote.envoyer({
    genre: 'creer',
    mode: 'libre',
    pistes: 1,
    extrait: REGLAGES.extrait.choix[0] ?? 10,
    son: 'tous',
    playlist: 'essai',
    pochette: POCHETTE,
  });
  const invite = serveur.connecter(() => undefined);
  invite.envoyer({ genre: 'rejoindre', code, pochette: POCHETTE });
  hote.envoyer({ genre: 'lancer' });
  hote.envoyer({ genre: 'pret' });
  invite.envoyer({ genre: 'pret' });
  for (let pas = 0; pas < 200; pas++) {
    horloge.t += 0.5;
    serveur.avancer();
  }
  assert.deepEqual(finies, [{ code, phase: 'fin', joueurs: 2 }]);
});
