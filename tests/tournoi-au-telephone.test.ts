/**
 * Le tournoi au téléphone, sans navigateur : sa mémoire, ses écrans et son son, contre le vrai serveur. Les réglages ouvrent un
 * tournoi par le cran « Tournoi », « Titres » y dit la taille du tableau ; chaque téléphone tient sa platine (le disque qu'on
 * retourne, le bras qu'on pose, la face qui s'enchaîne), joue la face du haut, vote ; le duel clos reste un moment, puis le
 * tableau, puis le duel suivant, jusqu'au palmarès.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avancerLaPlatine,
  faceDuHaut,
  platineNeuve,
  poseDeLaPlatine,
  poserLeBras,
  retourner,
  tenirLeBras,
  type PlatineDuDuel,
} from '../src/ecran/telephone/duel';
import type { NomDeCalque } from '../src/lexique';
import {
  aLaNouvelle,
  avancer,
  BAC_VIDE,
  MEMOIRE_VIDE,
  recevoir,
  toucher,
  type Memoire,
  type Preparatifs,
  type Toucher,
} from '../src/ecran/telephone/memoire';
import { ecranDuTelephone, type EcranDuTelephone } from '../src/ecran/telephone/route';
import { sonVoulu } from '../src/ecran/telephone/son';
import { choseATouche } from '../src/ecran/telephone/touchers';
import { hasard } from '../src/lowpoly/aleatoire';
import { joueursDExemple } from '../src/planche/etape5/scenes';
import type { Action, Connexion } from '../src/regles/messages';
import type { PisteDuMode } from '../src/regles/modes';
import { partieA } from '../src/regles/partie';
import { TELEPHONE } from '../src/ressources/ecran';
import { TEXTES } from '../src/ressources/textes.fr';
import { DUREE_DU_RETOURNEMENT } from '../src/scene/duel';
import { vueDuSalon } from '../src/scene/telephone/ecrans';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { ENCRIER } from './planche';

const DUREE = 20;
const POCHETTE = joueursDExemple(TEXTES)[0]!.pochette;

test('la platine d’un duel : la face A joue ; le disque retourné, la B part une fois retombé ; chaque face reprend où on l’avait laissée', () => {
  let p: PlatineDuDuel = platineNeuve(100, 100);
  assert.equal(faceDuHaut(p), 'A');
  assert.equal(poseDeLaPlatine(p, 105, DUREE).avancement, 5 / DUREE);
  assert.equal(poseDeLaPlatine(p, 105, DUREE).brasLeve, false);
  p = retourner(p, 105, DUREE);
  assert.equal(faceDuHaut(p), 'B');
  const enLAir = poseDeLaPlatine(p, 105 + DUREE_DU_RETOURNEMENT / 2, DUREE);
  assert.ok(enLAir.enLAir && enLAir.brasLeve, 'le bras se lève pendant que le disque se retourne');
  assert.ok(enLAir.retourne > 0 && enLAir.retourne < 180);
  // Retourné, encore : rien, il tourne déjà.
  assert.equal(retourner(p, 105 + DUREE_DU_RETOURNEMENT / 2, DUREE), p);
  const apres = 105 + DUREE_DU_RETOURNEMENT + 3;
  assert.deepEqual(
    [poseDeLaPlatine(p, apres, DUREE).retourne, poseDeLaPlatine(p, apres, DUREE).avancement, poseDeLaPlatine(p, apres, DUREE).brasLeve],
    [180, 3 / DUREE, false],
  );
  // De nouveau la A : du même côté (de 180 à 360), et elle reprend à cinq secondes.
  p = retourner(p, apres, DUREE);
  assert.ok(poseDeLaPlatine(p, apres + DUREE_DU_RETOURNEMENT / 2, DUREE).retourne > 180);
  assert.equal(faceDuHaut(p), 'A');
  assert.equal(poseDeLaPlatine(p, apres + DUREE_DU_RETOURNEMENT + 1, DUREE).avancement, 6 / DUREE);
});

test('le bras : tenu au doigt, il se lève et le son se tait ; lâché, la face joue de là ; une face finie s’enchaîne sur l’autre, pas deux fois', () => {
  let p = platineNeuve(0, 0);
  p = tenirLeBras(p, 1 / 2, 4);
  assert.equal(poseDeLaPlatine(p, 4, DUREE).brasLeve, true);
  assert.equal(poseDeLaPlatine(p, 4, DUREE).avancement, 1 / 2);
  p = poserLeBras(p, 1 / 4, 6, DUREE);
  assert.equal(poseDeLaPlatine(p, 8, DUREE).avancement, (DUREE / 4 + 2) / DUREE);
  assert.equal(poseDeLaPlatine(p, 8, DUREE).brasLeve, false);
  // Au bout de la A, la B, jamais entendue, part d'elle-même.
  const finA = 6 - DUREE / 4 + DUREE;
  p = avancerLaPlatine(p, finA, DUREE);
  assert.equal(faceDuHaut(p), 'B');
  // Au bout de la B, la A a déjà été entendue : le bras reste levé, au bout.
  const finB = finA + DUREE_DU_RETOURNEMENT + DUREE;
  p = avancerLaPlatine(p, finB, DUREE);
  assert.equal(faceDuHaut(p), 'B');
  assert.deepEqual([poseDeLaPlatine(p, finB + 1, DUREE).avancement, poseDeLaPlatine(p, finB + 1, DUREE).brasLeve], [1, true]);
  // Retournée, la A finie repart de son début.
  p = retourner(p, finB + 2, DUREE);
  assert.equal(poseDeLaPlatine(p, finB + 2 + DUREE_DU_RETOURNEMENT + 1, DUREE).avancement, 1 / DUREE);
});

/** Seize titres, chacun son extrait. */
const SEIZE: readonly PisteDuMode[] = Array.from({ length: 16 }, (_, n) => ({
  reponse: { titre: `Titre ${n + 1}`, artiste: `Artiste ${n + 1}`, pochette: { vignette: { fond: 'olive', motif: 'rayons' } } },
  extrait: `https://extraits.test/${n + 1}.mp3`,
}));

const PREPARATIFS: Preparatifs = {
  mode: 'libre',
  pistes: 15,
  extrait: DUREE,
  son: 'tous',
  commandes: true,
  chercher: false,
  playlist: 'tournoi',
  listes: TEXTES.pochette,
  graine: 7,
};

/** Un téléphone contre le vrai serveur, et deux invités qui ne font que voter. */
function uneTablee() {
  let heure = 0;
  let jetons = 0;
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(5).suivant,
    jeton: () => `jeton-${++jetons}`,
    playlist: (lien) => (lien === 'tournoi' ? SEIZE : undefined),
  });
  let m: Memoire = { ...MEMOIRE_VIDE, preparation: { ecran: 'bac', pochette: POCHETTE, cran: 'pretes', bac: BAC_VIDE } };
  const connexion: Connexion = serveur.connecter((n) => {
    const avant = m;
    m = recevoir(m, n);
    for (const a of aLaNouvelle(avant, m)) connexion.envoyer(a);
  });
  const envoyer = (actions: readonly Action[]): void => {
    for (const a of actions) connexion.envoyer(a);
  };
  const ecran = (): EcranDuTelephone => ecranDuTelephone(m, heure, PREPARATIFS, TEXTES);
  /** Ce qu'on touche, par le nom de son calque, tel que l'écran le fait faire. */
  const toucherLe = (nom: NomDeCalque): void => {
    const chose = choseATouche(nom, ecran(), TEXTES);
    assert.ok(chose !== undefined, `« ${nom} » ne se touche pas sur l’écran ${ecran().genre}`);
    agir(chose.toucher);
  };
  const agir = (t: Toucher): void => {
    const s = toucher(m, t, heure, PREPARATIFS);
    m = s.memoire;
    envoyer(s.actions);
  };
  const passer = (secondes: number): void => {
    heure += secondes;
    serveur.avancer();
    const s = avancer(m, heure);
    m = s.memoire;
    envoyer(s.actions);
  };
  const invites: Connexion[] = [];
  const inviter = (): void => {
    const room = m.room;
    assert.ok(room !== undefined);
    for (let k = 0; k < 2; k++) {
      const c = serveur.connecter(() => undefined);
      c.envoyer({ genre: 'rejoindre', code: room.code, pochette: joueursDExemple(TEXTES)[k + 1]!.pochette });
      invites.push(c);
    }
  };
  return { ecran, toucherLe, agir, passer, inviter, invites, memoire: () => m, heure: () => heure };
}

test('aux réglages, le cran « Tournoi » ouvre un tournoi : « Titres » passe de 16 à 32 puis 8 ; la manette n’a plus que Solo et Multi', () => {
  const t = uneTablee();
  t.agir({ genre: 'choisir' });
  let e = t.ecran();
  assert.ok(e.genre === 'reglages' && e.jeu === 'blindTest' && e.pistes === 15);
  t.toucherLe('touche-jeu-tournoi');
  e = t.ecran();
  assert.ok(e.genre === 'reglages' && e.jeu === 'tournoi' && e.pistes === 16 && e.tournoi.cle === 'tournoi');
  const tailles: number[] = [];
  for (let k = 0; k < 3; k++) {
    t.toucherLe('bouton-pistes');
    const r = t.ecran();
    if (r.genre === 'reglages') tailles.push(r.pistes);
  }
  assert.deepEqual(tailles, [32, 8, 16]);
  // La manette se couche de Multi vers Solo, et revient ; ses deux noms se touchent ; ceux du blind test n'y sont plus.
  t.toucherLe('interrupteur-mode');
  e = t.ecran();
  assert.ok(e.genre === 'reglages' && e.jeu === 'tournoi' && e.tournoi.cle === 'tournoiSolo');
  t.toucherLe('interrupteur-mode/droite');
  e = t.ecran();
  assert.ok(e.genre === 'reglages' && e.tournoi.cle === 'tournoi');
  assert.equal(choseATouche('interrupteur-mode/haut', e, TEXTES), undefined);
  t.toucherLe('interrupteur-mode/gauche');
  // Le blind test garde son mode : on y revient par son cran.
  t.toucherLe('touche-jeu-blindTest');
  e = t.ecran();
  assert.ok(e.genre === 'reglages' && e.jeu === 'blindTest' && e.mode.cle === 'libre' && e.pistes === 15);
  t.toucherLe('touche-jeu-tournoi');
  t.toucherLe('touche-ouvrir');
  const room = t.memoire().room;
  assert.ok(room !== undefined);
  assert.equal(partieA(room.journal, Infinity).mode, 'tournoiSolo');
  assert.equal(partieA(room.journal, Infinity).tournoi?.titres, 16);
  // En solo, la room n'accueille que son hôte : le salon ne montre ni QR code ni lien à partager.
  t.passer(1);
  e = t.ecran();
  assert.ok(e.genre === 'salon');
  const noms = vueDuSalon({ textes: TEXTES, encrier: ENCRIER }, e.etat, e.code, e.qui).objets.map((o) => o.nom);
  assert.ok(!noms.includes('etiquette-lien') && !noms.includes('kraft-qr'), noms.join(' '));
  assert.ok(noms.includes('touche-lancer'));
});

test('un tournoi au téléphone : le duel, sa platine et son son ; le vote ; la clôture un moment, le tableau, le duel suivant ; le palmarès', () => {
  const t = uneTablee();
  t.agir({ genre: 'choisir' });
  t.toucherLe('touche-jeu-tournoi');
  t.toucherLe('bouton-pistes');
  t.toucherLe('bouton-pistes');
  t.toucherLe('touche-ouvrir');
  t.agir({ genre: 'allumer' });
  t.inviter();
  t.passer(2);
  assert.equal(t.ecran().genre, 'salon');
  t.toucherLe('touche-lancer');
  t.passer(1);
  let e = t.ecran();
  assert.ok(e.genre === 'duel' && e.voter && e.aide, 'le premier duel dit comment écouter l’autre face');
  // La face A joue, depuis l'ouverture du duel vue par ce téléphone.
  const enCours = partieA(t.memoire().room?.journal ?? [], Infinity).tournoi?.enCours;
  assert.ok(enCours !== undefined);
  const A = SEIZE.find((p) => p.reponse.titre === enCours.faces.A.reponse.titre)?.extrait;
  const B = SEIZE.find((p) => p.reponse.titre === enCours.faces.B.reponse.titre)?.extrait;
  assert.equal(sonVoulu(t.memoire())?.adresse, A);
  // Le disque retourné : la B joue, l'aide s'en va.
  t.toucherLe('disque');
  t.passer(DUREE_DU_RETOURNEMENT + 1);
  assert.equal(sonVoulu(t.memoire())?.adresse, B);
  e = t.ecran();
  assert.ok(e.genre === 'duel' && !e.aide);
  // On vote B : l'étiquette s'enfonce ici ; le serveur ne dit à personne pour quoi.
  t.toucherLe('etiquette-face-B');
  e = t.ecran();
  assert.ok(e.genre === 'duel' && e.monVote === 'B');
  assert.ok(t.memoire().room?.journal.every((ev) => ev.genre !== 'vote' || ev.face === undefined));
  // L'hôte clôt sans attendre les invités.
  t.toucherLe('touche-clore');
  t.passer(1);
  e = t.ecran();
  assert.ok(e.genre === 'duel' && !e.voter, 'le duel clos reste à l’écran un moment');
  assert.equal(choseATouche('etiquette-face-A', e, TEXTES), undefined, 'on ne vote plus');
  t.passer(TELEPHONE.duel.apresLaCloture);
  assert.equal(t.ecran().genre, 'tableau');
  const apres = sonVoulu(t.memoire());
  assert.ok(apres === undefined || (apres.jusqua ?? Infinity) <= t.heure(), 'le son se tait avec le duel');
  // Les sept duels d'un tableau de huit : à chaque fois, l'hôte lance, vote et clôt.
  for (let n = 1; n < 7; n++) {
    t.toucherLe('touche-suivant');
    t.passer(1);
    assert.equal(t.ecran().genre, 'duel', `duel ${n + 1}`);
    t.toucherLe('etiquette-face-A');
    t.toucherLe('touche-clore');
    t.passer(TELEPHONE.duel.apresLaCloture + 1);
  }
  e = t.ecran();
  assert.equal(e.genre, 'palmares');
  t.toucherLe('etiquette-vainqueur');
  e = t.ecran();
  assert.ok(e.genre === 'tableau' && e.revoir);
  t.toucherLe('touche-fermer-tableau');
  assert.equal(t.ecran().genre, 'palmares');
  t.toucherLe('touche-revanche');
  t.passer(1);
  assert.equal(t.ecran().genre, 'salon');
});
