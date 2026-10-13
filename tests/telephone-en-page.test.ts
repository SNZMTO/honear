/**
 * Le client du téléphone, ouvert pour de bon sur la fausse page, contre le serveur et les cinq potes du prototype : on touche ses
 * zones, on tape dans son champ, et l'on regarde ses couches. Le meuble (la platine) ne se repeint pas d'une lettre à l'autre, ni
 * d'un écran à l'autre quand il ne change pas ; sur une page qu'on fait glisser, une touche n'agit qu'au doigt levé sans avoir
 * glissé ; « Retour » ramène à l'étape d'avant ; « Quitter » agit au doigt levé, sans attendre de clic ; au téléphone, pas de
 * bouton du volume ; la partie va jusqu'au hit-parade ; fermé, le téléphone ne laisse rien.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SCENE_ENTIERE } from '../src/ecran/allegements';
import { ouvrirLeTelephone, type OptionsDuTelephone } from '../src/ecran/telephone/client';
import { hasard } from '../src/lowpoly/aleatoire';
import { chargerLEncrier } from '../src/planche/polices';
import { joueursDExemple } from '../src/planche/etape5/scenes';
import { inviterLesPotes, type Potes } from '../src/planche/prototype/potes';
import { PLAYLIST_DU_PROTOTYPE, SCENARIO, type Pote } from '../src/planche/prototype/scenario';
import type { Brancher } from '../src/regles/messages';
import type { Pochette } from '../src/ressources/pochettes';
import { TEXTES } from '../src/ressources/textes.fr';
import { VERSO_DU_JEU } from '../src/scene/disque/verso';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { DOIGT, enElement, FauxElement, installerUneFaussePage } from './fausse-page';

const PAGE = installerUneFaussePage();

// Ce que la fausse page n'a pas, et dont le client du téléphone se sert : des éléments qu'on reconnaît, une fenêtre qui ne défile
// pas, un champ qu'on quitte, des fondus (qui ne finissent jamais : l'écran d'après les termine), et l'ancêtre par son attribut.
const monde = globalThis as unknown as Record<string, unknown>;
monde['HTMLElement'] = FauxElement;
monde['HTMLButtonElement'] = FauxElement;
monde['Element'] = FauxElement;
Object.assign(PAGE.fenetre, { scrollX: 0, scrollY: 0, scrollTo: () => undefined, innerWidth: 393, innerHeight: 695 });
const document = PAGE.document as { activeElement: FauxElement | null };
const prototype = FauxElement.prototype as unknown as Record<string, unknown>;
prototype['blur'] = (): void => {
  document.activeElement = null;
};
prototype['select'] = (): void => undefined;
prototype['setSelectionRange'] = (): void => undefined;
let fondus = 0;
prototype['animate'] = (): { cancel: () => void; onfinish: unknown } => {
  fondus++;
  return { cancel: () => undefined, onfinish: undefined };
};
const parBalise = FauxElement.prototype.closest;
prototype['closest'] = function (this: FauxElement, selecteur: string): FauxElement | null {
  const attribut = /^\[data-([a-z]+)\]$/.exec(selecteur)?.[1];
  if (attribut === undefined) return parBalise.call(this, selecteur);
  for (let e: FauxElement | null = this; e !== null; e = e.parentElement) if (e.dataset[attribut] !== undefined) return e;
  return null;
};

/** Un téléphone ouvert dans un cadre d'iPhone, branché à un serveur neuf ; les potes arrivent quand la room s'ouvre. */
function unTelephone() {
  let t = 0;
  const serveur = demarrerLeServeur({
    maintenant: () => t,
    tirage: hasard(3).suivant,
    jeton: (() => {
      let n = 0;
      return () => `jeton-${++n}`;
    })(),
    playlist: (lien) => (lien === SCENARIO.playlist ? PLAYLIST_DU_PROTOTYPE : undefined),
  });
  const exemple = joueursDExemple(TEXTES);
  const pochettes = Object.fromEntries(
    SCENARIO.arrivees.map(({ qui }) => [qui, exemple.find((j) => j.id === qui)?.pochette ?? exemple[0]?.pochette]),
  ) as Record<Pote, Pochette>;
  let potes: Potes | undefined;
  const brancher: Brancher = (recevoir, enLigne) => {
    const connexion = serveur.connecter((n) => {
      if (n.genre === 'etat' && potes === undefined) potes = inviterLesPotes(serveur, n.code, n.heure, pochettes, 'libre');
      recevoir(n);
    });
    // La ligne arrive comme celle d'un WebSocket : après coup.
    (PAGE.fenetre['setTimeout'] as (suite: () => void) => number)(() => enLigne?.(true));
    return connexion;
  };
  const cadre = PAGE.poser('main');
  cadre.clientWidth = 393;
  cadre.clientHeight = 735;
  const genres: string[] = [];
  let defile = false;
  const options: OptionsDuTelephone = {
    brancher,
    horloge: { maintenant: () => t },
    ecritoire: { textes: TEXTES, encrier: chargerLEncrier(TEXTES.langue), site: 'honear.fr' },
    preparatifs: {
      mode: 'libre',
      ...SCENARIO.reglages,
      commandes: true,
      chercher: false,
      playlist: SCENARIO.playlist,
      listes: TEXTES.pochette,
      graine: 7,
      comptes: true,
    },
    densiteDeLEcran: () => 3,
    options: { allegements: SCENE_ENTIERE, verso: VERSO_DU_JEU, sobre: false },
    fenetre: () => 0.57,
    bords: () => ({ sur: 0, sous: 0.1 }),
    defile: () => defile,
    enChangeant: (genre) => {
      genres.push(genre);
      defile = genre === 'accueil' || genre === 'compte';
    },
  };
  const telephone = ouvrirLeTelephone(enElement(cadre), options);
  for (const c of cadre.children) [c.clientWidth, c.clientHeight] = [cadre.clientWidth, cadre.clientHeight];
  const couche = (nom: string): FauxElement => {
    // Le client nomme ses couches par leur classe, qu'il écrit d'un bloc.
    const trouvee = cadre.children.find((c) => (c as unknown as { readonly className?: string }).className === nom);
    assert.ok(trouvee !== undefined, nom);
    return trouvee;
  };
  /** Le temps passe, image après image. */
  const images = (n: number): void => {
    for (let i = 0; i < n; i++) {
      t += 0.05;
      serveur.avancer();
      potes?.avancer(t);
      PAGE.passerUneImage();
      PAGE.passerLesMinuteries();
    }
  };
  const zone = (libelle: string): FauxElement => {
    const z = couche('zones').children.find((e) => e.dataset['zone'] !== undefined && e.getAttribute('aria-label') === libelle);
    assert.ok(z !== undefined, `pas de zone « ${libelle} »`);
    return z;
  };
  /** Un doigt touche une zone : il se pose, il se lève sans avoir glissé, et le navigateur clique. */
  const toucher = (libelle: string): void => {
    const z = zone(libelle);
    z.envoyer('pointerdown', { ...DOIGT });
    z.envoyer('pointerup', { ...DOIGT });
    z.envoyer('click', { detail: 1 });
  };
  const champ = (): FauxElement => {
    const c = couche('zones').children.find((e) => e.tagName === 'input');
    assert.ok(c !== undefined);
    return c;
  };
  /** On tape dans le champ posé : il a le clavier, sa valeur change. */
  const taper = (texte: string): void => {
    const c = champ();
    document.activeElement = c;
    c.envoyer('focus');
    c.value = texte;
    c.envoyer('input');
  };
  /** Le meuble monté, tel qu'il est dans sa couche : le même élément, c'est qu'il n'a pas été repeint. */
  const meuble = (): FauxElement | undefined => couche('meuble').children.at(-1);
  /** Les zones des touches du coin (« Quitter », « Autre playlist »). */
  const coins = (): FauxElement[] => couche('zones').children.filter((e) => e.dataset['coin'] !== undefined);
  return { telephone, cadre, genres, images, zone, toucher, champ, taper, meuble, couche, coins };
}

test('la platine ne se repeint ni d’une lettre tapée à l’autre, ni de l’accueil à la saisie du code, où elle ne change pas', () => {
  const tel = unTelephone();
  tel.images(3);
  const deLAccueil = tel.meuble();
  assert.ok(deLAccueil !== undefined);
  tel.toucher(TEXTES.touches.jAiUnCode);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'saisie');
  assert.equal(tel.meuble(), deLAccueil, 'le même meuble qu’à l’accueil');
  const toiles = PAGE.toiles.length;
  tel.taper('A');
  tel.images(2);
  tel.taper('AB');
  tel.images(2);
  assert.equal(tel.meuble(), deLAccueil, 'le même meuble d’une lettre à l’autre');
  assert.ok(PAGE.toiles.length - toiles < 20, `${PAGE.toiles.length - toiles} toiles pour deux lettres`);
  tel.telephone.fermer();
});

test('le code entre de lui-même à sa quatrième lettre', () => {
  const tel = unTelephone();
  tel.images(3);
  tel.toucher(TEXTES.touches.jAiUnCode);
  tel.images(6);
  tel.taper('ABCD');
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'pochette');
  tel.telephone.fermer();
});

test('à l’accueil, qu’on fait glisser, une touche s’enfonce au doigt posé mais n’agit qu’au doigt levé : un doigt qui glisse ne lance rien', () => {
  const tel = unTelephone();
  tel.images(3);
  const poser = tel.zone(TEXTES.touches.poserUnDisque);
  // Le navigateur reprend le doigt : rien.
  poser.envoyer('pointerdown', { ...DOIGT });
  tel.images(10);
  poser.envoyer('pointercancel', { ...DOIGT });
  tel.images(10);
  // Le doigt glisse vers le haut (la page monte vers son pied), puis se lève : rien, et pas de clic non plus.
  poser.envoyer('pointerdown', { ...DOIGT, pointerId: 2, clientX: 200, clientY: 600 });
  poser.envoyer('pointermove', { ...DOIGT, pointerId: 2, clientX: 202, clientY: 560 });
  poser.envoyer('pointerup', { ...DOIGT, pointerId: 2, clientX: 202, clientY: 560 });
  poser.envoyer('click', { detail: 1 });
  tel.images(10);
  assert.deepEqual(tel.genres, ['accueil']);
  // Un toucher, le doigt levé là où il s'est posé, sans clic (l'iPhone ne le donne pas toujours) : on pose un disque.
  poser.envoyer('pointerdown', { ...DOIGT, pointerId: 3, clientX: 200, clientY: 600 });
  poser.envoyer('pointerup', { ...DOIGT, pointerId: 3, clientX: 203, clientY: 598 });
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'pochette');
  tel.telephone.fermer();
});

test('« Retour », au bout de chaque étape avant la room (sa pochette, le bac, les réglages), ramène à l’étape d’avant', () => {
  const tel = unTelephone();
  tel.images(3);
  tel.toucher(TEXTES.touches.poserUnDisque);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'pochette');
  tel.toucher(TEXTES.partie.retour);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'accueil');
  tel.toucher(TEXTES.touches.poserUnDisque);
  tel.images(6);
  tel.taper('Mateo');
  tel.images(3);
  tel.toucher(TEXTES.touches.cEstMoi);
  tel.images(6);
  tel.toucher(TEXTES.playlists.choisir);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'reglages');
  tel.toucher(TEXTES.partie.retour);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'bac');
  tel.toucher(TEXTES.partie.retour);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'pochette');
  // Avant la room, rien au coin : chaque « Retour » est sur l'écran, au bout.
  assert.ok(tel.coins().every((z) => z.hidden === true));
  tel.telephone.fermer();
});

test('dans une room, « Quitter », au coin, agit au doigt levé dessus, sans attendre de clic ; « Autre playlist » ouvre le bac, qui a son « Retour »', () => {
  const tel = unTelephone();
  tel.images(3);
  tel.toucher(TEXTES.touches.poserUnDisque);
  tel.images(6);
  tel.taper('Mateo');
  tel.images(3);
  tel.toucher(TEXTES.touches.cEstMoi);
  tel.images(6);
  tel.toucher(TEXTES.playlists.choisir);
  tel.images(6);
  tel.toucher(TEXTES.partie.ouvrirLeSalon);
  tel.images(20);
  assert.equal(tel.genres.at(-1), 'salon');
  const coin = (libelle: string): FauxElement => {
    const z = tel.coins().find((e) => e.getAttribute('aria-label') === libelle);
    assert.ok(z !== undefined && z.hidden !== true, `pas de « ${libelle} » au coin`);
    return z;
  };
  const leverDessus = (z: FauxElement): void => {
    z.envoyer('pointerdown', { ...DOIGT, pointerId: 5, clientX: 40, clientY: 30 });
    z.envoyer('pointerup', { ...DOIGT, pointerId: 5, clientX: 41, clientY: 31 });
  };
  leverDessus(coin(TEXTES.partie.autrePlaylist));
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'bac');
  assert.ok(
    tel.coins().every((z) => z.hidden === true),
    'le bac ouvert, rien au coin',
  );
  tel.toucher(TEXTES.partie.retour);
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'salon');
  leverDessus(coin(TEXTES.partie.quitter));
  tel.images(6);
  assert.equal(tel.genres.at(-1), 'accueil');
  tel.telephone.fermer();
});

test('au téléphone, pas de bouton du volume : ce sont ceux du téléphone qui règlent le son ; sur un ordinateur, il est là', () => {
  const volume = (tel: ReturnType<typeof unTelephone>): FauxElement | undefined =>
    tel.couche('zones').children.find((e) => e.dataset['volume'] !== undefined);
  for (const telephone of [false, true]) {
    const tel = auDoigt(telephone, unTelephone);
    tel.images(3);
    assert.equal(volume(tel)?.hidden, telephone);
    // Sans bouton, l'image va jusqu'au bout : la page sait quel écran elle montre (et l'accueil a son pied).
    assert.deepEqual(tel.genres, ['accueil']);
    tel.telephone.fermer();
  }
});

/** Ouvre un téléphone, ou un ordinateur : au téléphone (un pointeur grossier, le doigt), le jeu ne pose pas de bouton du volume. */
function auDoigt<T>(oui: boolean, faire: () => T): T {
  const requete = PAGE.fenetre['matchMedia'] as (q: string) => { readonly matches: boolean };
  if (oui) PAGE.fenetre['matchMedia'] = (q: string) => (q === '(pointer: coarse)' ? { ...requete(q), matches: true } : requete(q));
  try {
    return faire();
  } finally {
    PAGE.fenetre['matchMedia'] = requete;
  }
}

for (const telephone of [false, true])
  test(`une partie au doigt${telephone ? ', au téléphone (sans bouton du volume)' : ''}, de l’accueil au hit-parade : chaque écran se dit à la page ; pendant la piste, le meuble n’a plus de couche à lui ; fermé, rien ne reste`, () => {
    const tel = auDoigt(telephone, unTelephone);
    tel.images(3);
    tel.toucher(TEXTES.touches.poserUnDisque);
    tel.images(6);
    tel.taper('Mateo');
    tel.images(3);
    tel.toucher(TEXTES.touches.cEstMoi);
    tel.images(6);
    tel.toucher(TEXTES.playlists.choisir);
    tel.images(6);
    // Aux réglages, le bouton des secondes tourne d'un cran à chaque toucher, et le dit ; trois crans, et il revient où il était.
    const secondes = (): string | null | undefined =>
      tel
        .couche('zones')
        .children.find((e) => e.getAttribute('aria-label')?.startsWith(`${TEXTES.commandes.extrait} : `) === true)
        ?.getAttribute('aria-label');
    const vus = [secondes()];
    for (let cran = 0; cran < 3; cran++) {
      tel.toucher(vus.at(-1) ?? '');
      tel.images(20);
      vus.push(secondes());
    }
    assert.equal(new Set(vus).size, 3, `le bouton des secondes n’a pas tourné : ${vus.join(', ')}`);
    assert.equal(vus.at(-1), vus[0]);
    tel.toucher(TEXTES.partie.ouvrirLeSalon);
    tel.images(150);
    tel.toucher(TEXTES.touches.lancer);
    tel.images(100);
    assert.equal(tel.genres.at(-1), 'piste');
    assert.equal(tel.couche('meuble').children.length, 0);
    const reponse = tel.champ();
    assert.equal(reponse.dataset['pour'], 'reponse');
    tel.taper('images');
    reponse.envoyer('keydown', { key: 'Enter' });
    tel.images(600);
    assert.deepEqual(tel.genres, ['accueil', 'pochette', 'bac', 'reglages', 'salon', 'piste', 'hitParade']);
    assert.ok(tel.meuble() !== undefined, 'le hit-parade a de nouveau son meuble');
    assert.ok(fondus > 0, 'd’un écran à l’autre, un fondu');
    tel.telephone.fermer();
    assert.equal(tel.cadre.children.length, 0);
  });
