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
import { jugerUnMotDePasse } from '../src/regles/mot-de-passe';
import { lireUneAction } from '../src/regles/messages';
import {
  adresseEmail,
  lettreDAvertissement,
  lettreDuLien,
  lettreDuMotDePasse,
  ouvrirLesComptes,
  type OptionsDesComptes,
} from '../src/reseau/comptes';
import { estUneEmpreinteDeMotDePasse, hacherUnMotDePasse, verifierUnMotDePasse } from '../src/reseau/mots-de-passe';
import { composer, posterParSmtp, type Lettre } from '../src/reseau/courrier';
import { REGLAGES } from '../src/ressources/reglages';
import { RESEAU } from '../src/ressources/reseau';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { PISTES_D_ESSAI } from '../src/serveur/sources/essai';
import { unFauxServeurDEnvoi } from './faux-courrier';
import { ceQueDitLeJournal } from './journal-du-serveur';

const C = RESEAU.comptes;
const POCHETTE = pochetteDExemple(TEXTES);
const LETTRE = lettreDuLien(TEXTES.compte.courrier, 'https://honear.fr');
/** Une empreinte de mot de passe vite faite, pour ces essais : le vrai scrypt a son test. */
const vite = (motDePasse: string): string => `vite$${createHash('sha256').update(motDePasse).digest('hex')}`;

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
    hacher: (m) => Promise.resolve(vite(m)),
    verifier: (m, e) => Promise.resolve(e === vite(m)),
    avisDuMotDePasse: lettreDuMotDePasse(TEXTES.compte.courrier, 'https://honear.fr'),
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
  assert.deepEqual(ouvert.compte, { email: 'mateo@example.com', parties: 0, victoires: 0, motDePasse: false });
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
  // Le courrier ne part pas : on le dit, et le lien qu'il portait ne marche pas. Le journal dit pourquoi, sans l'adresse, que la
  // réponse du serveur d'envoi citait.
  const rate = desComptes({ poster: () => Promise.reject(new Error('Le serveur d’envoi refuse (550) : 550 <a@exemple.fr>: rejected')) });
  const journal = await ceQueDitLeJournal(async () => assert.equal(await rate.comptes.demanderUnLien('a@exemple.fr', 'ici'), 'comptesFermes'));
  assert.equal(journal.length, 1);
  assert.match(journal[0] ?? '', /^Un lien de connexion n’est pas parti : Error : Le serveur d’envoi refuse \(550\)/);
  assert.ok(!(journal[0] ?? '').includes('a@exemple.fr'));
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
  assert.deepEqual(relus.comptes.reprendre(ouvert.session)?.compte, {
    email: 'mateo@example.com',
    pochette: POCHETTE,
    parties: 0,
    victoires: 0,
    motDePasse: false,
  });
  // Un fichier abîmé ne s'ouvre pas : repartir sans comptes, ce serait les effacer à la première écriture.
  assert.throws(() => desComptes({ lu: '{pas du json' }), /illisible/);
  // Effacer : le compte, ses sessions, tout part.
  relus.comptes.effacer(ouvert.id);
  assert.equal(relus.comptes.reprendre(ouvert.session), undefined);
  assert.ok(!(relus.garde[relus.garde.length - 1] ?? '').includes('mateo@example.com'));
});

test('un fichier qu’on ne sait pas relire en entier ne s’ouvre pas, et l’erreur n’en cite rien : coupé en route, abîmé, d’une autre version', async () => {
  const { comptes, garde, dernierLien } = desComptes();
  await comptes.demanderUnLien('mateo@example.com', 'ici');
  const ouvert = comptes.ouvrir(dernierLien());
  assert.ok(ouvert !== undefined);
  const fichier = garde[garde.length - 1] ?? '';
  const lu = JSON.parse(fichier) as { comptes: Record<string, unknown>[]; sessions: unknown[] };
  const abimes = [
    fichier.slice(0, Math.floor(fichier.length / 2)),
    '',
    'null',
    '[]',
    JSON.stringify({ ...lu, comptes: 'mateo@example.com' }),
    JSON.stringify({ ...lu, version: 2 }),
    JSON.stringify({ ...lu, comptes: [...lu.comptes, { email: 'sans-identifiant@example.com', creeLe: 0 }] }),
    JSON.stringify({ ...lu, sessions: [...lu.sessions, { compte: ouvert.id }] }),
  ];
  for (const texte of abimes) {
    const gardes: string[] = [];
    assert.throws(
      () => desComptes({ lu: texte, garder: (t) => gardes.push(t) }),
      (erreur: unknown) => erreur instanceof Error && /illisible/.test(erreur.message) && !/@/.test(erreur.message),
      texte,
    );
    assert.deepEqual(gardes, [], texte);
  }
  // Ce qu'il sait lire s'ouvre ; une pochette que le jeu ne connaît plus s'oublie, son compte reste.
  const sansPochette = desComptes({ lu: JSON.stringify({ ...lu, comptes: lu.comptes.map((c) => ({ ...c, pochette: { motif: 'disparu' } })) }) });
  assert.equal(sansPochette.comptes.reprendre(ouvert.session)?.compte.email, 'mateo@example.com');
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

test('ce que vaut un mot de passe : huit signes au moins, cinquante bits ou trois sortes de signes, et pas l’adresse dedans', () => {
  assert.equal(jugerUnMotDePasse('Ab1!xyz'), 'court');
  assert.equal(jugerUnMotDePasse('12345678'), 'simple');
  assert.equal(jugerUnMotDePasse('motdepasse'), 'simple', 'dix minuscules : 47 bits');
  assert.equal(jugerUnMotDePasse('motdepassee'), 'bon', 'onze minuscules : 52 bits');
  assert.equal(jugerUnMotDePasse('Vinyle33'), 'bon', 'huit signes de trois sortes');
  assert.equal(jugerUnMotDePasse('mateo-2048!', 'mateo@example.com'), 'adresse');
  assert.equal(jugerUnMotDePasse('Le 45 tours de Mamie', 'mateo@example.com'), 'bon');
});

test('un mot de passe ne se garde qu’en empreinte scrypt, salée ; il se vérifie, accents composés ou non ; une empreinte abîmée ne laisse entrer personne', async () => {
  const empreinte = await hacherUnMotDePasse('Café crème 33');
  assert.ok(estUneEmpreinteDeMotDePasse(empreinte));
  assert.match(empreinte, /^scrypt\$32768\$8\$3\$/);
  assert.ok(!empreinte.includes('Café'));
  assert.notEqual(await hacherUnMotDePasse('Café crème 33'), empreinte, 'un sel neuf à chaque fois');
  assert.equal(await verifierUnMotDePasse('Café crème 33', empreinte), true);
  assert.equal(await verifierUnMotDePasse('Cafe\u0301 crème 33', empreinte), true, 'le même, tapé autrement');
  assert.equal(await verifierUnMotDePasse('café crème 33', empreinte), false);
  assert.equal(await verifierUnMotDePasse('Café crème 33', 'pas une empreinte'), false);
  // Des réglages qu'on ne calculerait pas sans peine : refusés sans calcul.
  assert.equal(await verifierUnMotDePasse('x', empreinte.replace('$32768$', '$1048576$')), false);
  assert.equal(await verifierUnMotDePasse('x', empreinte.replace('$32768$', '$1000$')), false);
});

test('avec un mot de passe : choisi dans le compte, il fait entrer ; faux, rien ne dit si l’adresse a un compte ; changé, les autres sessions sortent', async () => {
  const { comptes, horloge, lettres, garde, dernierLien } = desComptes();
  await comptes.demanderUnLien('mateo@example.com', 'ici');
  const ouvert = comptes.ouvrir(dernierLien());
  assert.ok(ouvert !== undefined);
  // Pas encore de mot de passe : « faux », comme pour une adresse sans compte.
  assert.equal(await comptes.entrer('mateo@example.com', 'Le 45 tours de Mamie', 'ici'), 'faux');
  assert.equal(await comptes.entrer('personne@exemple.fr', 'Le 45 tours de Mamie', 'ici'), 'faux');
  assert.equal(await comptes.choisirUnMotDePasse(ouvert.id, 'court', ouvert.session), 'faible');
  assert.equal(await comptes.choisirUnMotDePasse(ouvert.id, 'mateo2048!', ouvert.session), 'faible', 'l’adresse dedans');
  // Une autre session du même compte, ouverte par un autre lien.
  horloge.t += C.parAdresse.attente;
  await comptes.demanderUnLien('mateo@example.com', 'ailleurs');
  const autre = comptes.ouvrir(dernierLien());
  assert.ok(autre !== undefined);
  assert.equal(await comptes.choisirUnMotDePasse(ouvert.id, 'Le 45 tours de Mamie', ouvert.session), 'garde');
  assert.equal(comptes.vu(ouvert.id)?.motDePasse, true);
  assert.equal(comptes.reprendre(autre.session), undefined, 'l’autre session est sortie');
  assert.equal(comptes.reprendre(ouvert.session)?.id, ouvert.id, 'celle d’où il a changé reste');
  assert.ok(
    lettres.some((l) => l.a === 'mateo@example.com' && l.sujet === TEXTES.compte.courrier.motDePasseSujet),
    'l’adresse est prévenue',
  );
  const fichier = garde[garde.length - 1] ?? '';
  assert.ok(!fichier.includes('Mamie') && fichier.includes(vite('Le 45 tours de Mamie')), 'le fichier ne garde que l’empreinte');
  // Il entre avec, d'où il veut, l'adresse tapée comme il veut : un compte, une session neuve.
  const entre = await comptes.entrer(' Mateo@Example.com ', 'Le 45 tours de Mamie', 'la-bas');
  assert.ok(typeof entre !== 'string' && entre.id === ouvert.id && entre.session !== ouvert.session);
  // Relu du fichier, le mot de passe marche toujours.
  const relus = desComptes({ lu: fichier });
  const relu = await relus.comptes.entrer('mateo@example.com', 'Le 45 tours de Mamie', 'ici');
  assert.ok(typeof relu !== 'string' && relu.compte.motDePasse);
});

test('les essais de mot de passe sont comptés : cinq par compte et par quart d’heure, vingt par heure depuis un téléphone ; et les changements', async () => {
  const M = C.motDePasse;
  const { comptes, horloge, dernierLien } = desComptes();
  await comptes.demanderUnLien('mateo@example.com', 'ici');
  const ouvert = comptes.ouvrir(dernierLien());
  assert.ok(ouvert !== undefined);
  await comptes.choisirUnMotDePasse(ouvert.id, 'Le 45 tours de Mamie', ouvert.session);
  // Cinq essais faux, envoyés d'un coup : le sixième, même juste, attend.
  const faux = await Promise.all(Array.from({ length: M.essais }, (_, k) => comptes.entrer('mateo@example.com', `faux ${k}`, `tel-${k}`)));
  assert.deepEqual(
    faux,
    Array.from({ length: M.essais }, () => 'faux'),
  );
  assert.equal(await comptes.entrer('mateo@example.com', 'Le 45 tours de Mamie', 'encore'), 'tropDEssais');
  horloge.t += M.fenetre;
  // Ce qui ne compte plus s'oublie (la minuterie du site le fait chaque minute) : ça ne change rien à qui peut entrer.
  comptes.oublier();
  assert.equal(typeof (await comptes.entrer('mateo@example.com', 'Le 45 tours de Mamie', 'encore')), 'object', 'un quart d’heure après, il entre');
  // D'un même téléphone, vingt essais par heure, toutes adresses confondues.
  const parTelephone = await Promise.all(Array.from({ length: M.parTelephone + 1 }, (_, k) => comptes.entrer(`x${k}@exemple.fr`, 'faux', 'le-meme')));
  assert.equal(parTelephone.filter((r) => r === 'tropDEssais').length, 1);
  // On change de mot de passe cinq fois par heure au plus.
  const changements = [];
  for (let k = 0; k < M.changements; k++) changements.push(await comptes.choisirUnMotDePasse(ouvert.id, `Un autre encore, le ${k}e`, ouvert.session));
  assert.equal(changements.length, M.changements);
  assert.equal(await comptes.choisirUnMotDePasse(ouvert.id, 'Et encore un de plus', ouvert.session), 'tropDEssais');
});

test('par le réseau, un mot de passe ne passe que borné : non vide, 128 signes au plus', () => {
  assert.deepEqual(lireUneAction({ genre: 'entrerAvecUnMotDePasse', email: 'a@b.fr', motDePasse: 'x' }), {
    genre: 'entrerAvecUnMotDePasse',
    email: 'a@b.fr',
    motDePasse: 'x',
  });
  assert.equal(lireUneAction({ genre: 'entrerAvecUnMotDePasse', email: 'a@b.fr', motDePasse: '' }), undefined);
  assert.equal(lireUneAction({ genre: 'choisirUnMotDePasse', motDePasse: 'x'.repeat(129) }), undefined);
  assert.equal(lireUneAction({ genre: 'choisirUnMotDePasse', motDePasse: 42 }), undefined);
});
