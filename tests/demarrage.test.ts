/**
 * Le démarrage de la page de l'atelier, sur une fausse page : le script dit qu'il a démarré, ajuste le cadre, ouvre la scène
 * une fois la page peinte et branche ses touches ; et quand quelque chose manque au navigateur ou à la page, le cadre garde
 * de quoi le dire.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANCRES } from '../src/planche/etape2/ancres';
import { BANCS } from '../src/planche/etape2/banc';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { lancerLaPage } from '../src/planche/etape2/page/demarrage';
import { dire } from '../src/planche/etape2/page/dom';
import { policesEnBase64 } from '../src/planche/polices';
import { CADRAGES } from '../src/ressources/cadrages';
import { TEXTES } from '../src/ressources/textes.fr';
import { installerUneFaussePage, memesElements, SOURIS, type FaussePage, type FauxElement } from './fausse-page';
import { pageDuGabarit } from './gabarit';

const PAGE = pageDuGabarit(BANCS);
/** Les polices dont le script tire le tracé des textes de la scène : les vraies, comme la page les embarque. */
const POLICES = policesEnBase64('trace');
const { largeur: LARGEUR, hauteur: HAUTEUR } = CADRAGES.telephone;
const monde = globalThis as unknown as Record<string, unknown>;

/**
 * La page du gabarit posée sur une fausse page, à la taille d'un téléphone, puis son script lancé.
 * @param o.page la page à poser, si ce n'est pas celle du gabarit telle quelle.
 * @param o.navigateur ce qu'on change au navigateur avant de lancer le script.
 */
function lancer(o: { readonly page?: string; readonly navigateur?: (page: FaussePage) => void } = {}) {
  const page = installerUneFaussePage();
  page.racine.insertAdjacentHTML('beforeend', o.page ?? PAGE);
  const parId = (id: string): FauxElement => {
    const trouve = page.document.getElementById(id);
    assert.ok(trouve !== null, `pas d’élément « ${id} »`);
    return trouve;
  };
  const [etabli, place, cadre] = [parId(ANCRES.etabli), parId(ANCRES.place), parId(ANCRES.cadre)];
  // La place que la page laisse au cadre : celle d'un téléphone, avec la ligne d'état sous lui.
  [place.clientWidth, place.clientHeight] = [LARGEUR, HAUTEUR + 22];
  [cadre.clientWidth, cadre.offsetWidth, cadre.clientHeight] = [LARGEUR, LARGEUR, HAUTEUR];
  if (cadre.parentElement !== null) cadre.parentElement.offsetHeight = HAUTEUR + 22;
  o.navigateur?.(page);
  // Ce que le script dit à la console : rien, tant que tout va bien.
  const erreurs: unknown[] = [];
  const console_ = console.error;
  console.error = (erreur: unknown) => void erreurs.push(erreur);
  const sansBruit = <R>(geste: () => R): R => {
    console.error = (erreur: unknown) => void erreurs.push(erreur);
    try {
      return geste();
    } finally {
      console.error = console_;
    }
  };
  sansBruit(() => lancerLaPage(POLICES));
  return {
    page,
    etabli,
    place,
    cadre,
    parId,
    erreurs,
    /** Fait peindre la page, puis laisse passer ce qui attendait qu'elle le soit. @returns ce qui attendait : une image, une minuterie. */
    peindre: (): [boolean, number] => sansBruit(() => [page.passerUneImage(), page.passerLesMinuteries()]),
    /** Les classes de l'établi qui disent où en est la scène. */
    dit: (): string[] => [ANCRES.demarre, ANCRES.enMarche, ANCRES.enPanne].filter((classe) => etabli.classes.has(classe)),
    /** La largeur que le script a donnée au cadre, telle qu'elle est écrite sur sa place. */
    largeurDuCadre: (): string => place.style.getPropertyValue(ANCRES.largeurDuCadre),
    /** Les messages que le gabarit a écrits dans le cadre : ils y sont tant que la scène n'a pas pris leur place. */
    messagesDuCadre: (): string[] => cadre.children.map((message) => [...message.classes].join('.') || message.tagName),
  };
}

/** Ce que le cadre contient tel que le gabarit l'écrit : ce qu'il dit en attendant, puis s'il ne peut pas, puis sans script. */
const MESSAGES = ['attente', 'panne.du-navigateur', 'noscript'];

test('le script dit qu’il a démarré, ajuste le cadre, puis attend que la page soit peinte pour y ouvrir la scène et brancher ses touches', () => {
  const { page, place, cadre, parId, erreurs, peindre, dit, largeurDuCadre, messagesDuCadre } = lancer({
    navigateur: (navigateur) => void (navigateur.observeLesTailles = true),
  });
  // Tout de suite : la garde de la page sait que le script a démarré, et le cadre a sa taille. La scène, elle, n'est pas encore là.
  assert.deepEqual(dit(), [ANCRES.demarre]);
  assert.equal(largeurDuCadre(), `${LARGEUR}px`);
  assert.deepEqual(messagesDuCadre(), MESSAGES);
  assert.equal(page.toiles.length, 1, 'une seule toile jusqu’ici : celle de l’essai du navigateur');
  assert.equal(parId(ANCRES.avis).hidden, true);
  assert.equal(cadre.getAttribute('role'), null);

  // Une image, pour que ce qu'on peut déjà lire soit peint ; puis la scène.
  assert.deepEqual(peindre(), [true, 1]);
  assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enMarche]);
  assert.deepEqual(erreurs, []);
  assert.equal(cadre.children.length, 1, 'le cadre ne contient plus que la scène');
  assert.ok(cadre.querySelectorAll('canvas').length >= 6, 'ses toiles sont là');
  // Le cadre est désormais une image, nommée à qui ne la voit pas.
  assert.equal(cadre.getAttribute('role'), 'img');
  assert.equal(cadre.getAttribute('aria-label'), LEGENDES.cadre);

  // L'atelier montre sa première image, écrit ce qu'il a mesuré, et s'endort : rien ne bouge avant qu'on ne touche.
  const mesure = (nom: string): string => page.document.querySelector(`[${ANCRES.mesure}="${nom}"]`)?.textContent ?? '';
  assert.equal(mesure('toiles'), LEGENDES.mesures.rienEncore);
  assert.deepEqual(peindre(), [true, 0]);
  assert.equal(page.attendUneImage, false, 'au repos, il dort');
  assert.equal(parId(ANCRES.etat).textContent, LEGENDES.etats.avant);
  assert.notEqual(mesure('toiles'), LEGENDES.mesures.rienEncore);
  assert.match(mesure('montage'), /\d/);

  // Une place qui change (un téléphone qu'on tourne) le réveille, et le cadre s'y ajuste ; une fenêtre qui change sans que la place
  // change (un écran d'une autre finesse, un zoom) le réveille aussi.
  place.clientWidth = 300;
  assert.equal(page.direLaTaille(place), 1);
  assert.equal(largeurDuCadre(), '300px');
  assert.equal(page.attendUneImage, true, 'la place a changé : il y regarde');
  peindre();
  assert.equal(page.attendUneImage, false);
  assert.equal(page.direALaFenetre('resize'), 1, 'la fenêtre n’a qu’un écouteur : celui qui réveille l’atelier');
  assert.equal(page.attendUneImage, true, 'la fenêtre a changé : il y regarde');
  peindre();
  assert.equal(page.attendUneImage, false);

  // Ses touches sont branchées : « Décompte » lance la piste, et la page dit où elle en est.
  const decompte = page.document.querySelector(`[${ANCRES.moment}="decompte"]`);
  assert.ok(decompte !== null);
  decompte.envoyer('pointerdown', SOURIS);
  assert.equal(page.attendUneImage, true, 'la touche réveille l’atelier');
  peindre();
  assert.equal(page.attendUneImage, true, 'la piste joue : il se donne des images');
  assert.equal(parId(ANCRES.rayer).getAttribute('aria-disabled'), 'true');

  // Hors de vue, la scène et ses touches : il ne demande plus d'images. De retour, il reprend.
  const facade = parId(ANCRES.facade);
  const [observateur, ...autres] = page.observateursDeVue;
  assert.ok(observateur !== undefined && autres.length === 0);
  memesElements(observateur.regardes, [cadre, facade], 'ce dont on regarde s’il se voit : le cadre et la façade');
  page.direLaVue(cadre, true);
  page.direLaVue(facade, true);
  page.direLaVue(cadre, false);
  peindre();
  assert.equal(page.attendUneImage, true, 'on voit encore ses touches');
  page.direLaVue(facade, false);
  peindre();
  assert.equal(page.attendUneImage, false, 'hors de vue, il s’arrête');
  page.direLaVue(facade, true);
  assert.equal(page.attendUneImage, true, 'de retour, il reprend');
  peindre();

  assert.deepEqual(erreurs, []);
});

test('un navigateur à qui il manque de quoi montrer la scène : le cadre garde sa phrase, y ajoute ce qui manque, et rien n’est ouvert ni branché', () => {
  const N = TEXTES.navigateur;
  const { page, parId, erreurs, peindre, dit, largeurDuCadre, messagesDuCadre } = lancer({
    navigateur: (navigateur) => {
      navigateur.sansToile = true;
      navigateur.saitLeSvg = false;
    },
  });
  assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enPanne]);
  assert.deepEqual(messagesDuCadre(), MESSAGES, 'le cadre garde ce qu’il disait');
  const manques = parId(ANCRES.manques);
  assert.equal(manques.hidden, false);
  assert.equal(manques.textContent, dire(N.detail, { manques: [N.manques.toile, N.manques.svg].join(N.entreDeuxManques) }));
  // Le cadre n'est pas ajusté : il n'aura pas de scène, la page lui donne la taille de son message.
  assert.equal(largeurDuCadre(), '');
  // Rien n'attend, rien n'est branché : la touche maîtresse ne fait rien.
  assert.deepEqual(peindre(), [false, 0]);
  page.document.querySelector(`[${ANCRES.moment}="decompte"]`)?.envoyer('pointerdown', SOURIS);
  assert.equal(page.attendUneImage, false);
  assert.equal(page.observateursDeVue.length, 0);
  // Ce n'est pas une erreur du script : il a fait ce qu'il fallait, et n'a rien à dire à la console.
  assert.deepEqual(erreurs, []);
});

test('l’appareil qui a demandé moins d’animations ouvre la page en version sobre : son avis est montré avant qu’on ne mesure la place du cadre', () => {
  const { page, parId, erreurs, peindre, dit } = lancer({ navigateur: (navigateur) => void (navigateur.animationsReduites = true) });
  const avis = parId(ANCRES.avis);
  assert.equal(avis.hidden, false);
  // L'avis prend sa place dans la page : le cadre n'est ajusté qu'ensuite, à la place qui reste.
  const [montre, ajuste] = [page.journal.indexOf(`#${ANCRES.avis} hidden`), page.journal.indexOf(`#${ANCRES.place} ${ANCRES.largeurDuCadre}`)];
  assert.ok(montre >= 0 && ajuste > montre, `l’avis montré à l’écriture ${montre}, le cadre ajusté à l’écriture ${ajuste}`);
  peindre();
  assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enMarche]);
  const sobre = page.document.querySelector(`[${ANCRES.poussoir}="sobre"]`);
  assert.equal(sobre?.getAttribute('aria-pressed'), 'true', 'le poussoir dit ce que l’appareil a demandé');
  // « Tout animer » rend les animations, et retire l'avis.
  const toutAnimer = parId(ANCRES.toutAnimer);
  toutAnimer.envoyer('pointerdown', SOURIS);
  assert.equal(avis.hidden, true);
  assert.equal(sobre?.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(erreurs, []);

  // Sans cette demande, l'avis reste caché, et le poussoir relâché.
  const ordinaire = lancer();
  ordinaire.peindre();
  const [sonAvis, sonPoussoir] = [ordinaire.parId(ANCRES.avis), ordinaire.page.document.querySelector(`[${ANCRES.poussoir}="sobre"]`)];
  assert.equal(sonAvis.hidden, true);
  assert.equal(sonPoussoir?.getAttribute('aria-pressed'), 'false');
  // L'appareil peut changer d'avis pendant que la page est ouverte : la version sobre le suit, à l'aller comme au retour.
  assert.equal(ordinaire.page.demanderMoinsDAnimations(true), 1);
  assert.deepEqual([sonAvis.hidden, sonPoussoir?.getAttribute('aria-pressed')], [false, 'true']);
  assert.equal(ordinaire.page.attendUneImage, true, 'la scène suit : il lui faut une image');
  ordinaire.page.demanderMoinsDAnimations(false);
  assert.deepEqual([sonAvis.hidden, sonPoussoir?.getAttribute('aria-pressed')], [true, 'false']);
  // Et il a le dernier mot : après « Tout animer », s'il renonce à sa demande puis la refait, l'avis revient.
  // (Un navigateur ne prévient que lorsque la demande change.)
  ordinaire.page.demanderMoinsDAnimations(true);
  ordinaire.parId(ANCRES.toutAnimer).envoyer('pointerdown', SOURIS);
  assert.deepEqual([sonAvis.hidden, sonPoussoir?.getAttribute('aria-pressed')], [true, 'false']);
  ordinaire.page.demanderMoinsDAnimations(false);
  assert.deepEqual([sonAvis.hidden, sonPoussoir?.getAttribute('aria-pressed')], [true, 'false']);
  ordinaire.page.demanderMoinsDAnimations(true);
  assert.deepEqual([sonAvis.hidden, sonPoussoir?.getAttribute('aria-pressed')], [false, 'true']);
  assert.deepEqual(ordinaire.erreurs, []);
});

test('une scène qui ne peut pas se monter, bien que rien ne semble manquer : le cadre garde sa phrase, reprend la taille de son message, et la raison va à la console', () => {
  // Le navigateur donne une toile à l'essai, puis deux, et plus aucune : le montage s'arrête en route.
  const { page, cadre, erreurs, peindre, dit, largeurDuCadre, messagesDuCadre } = lancer({
    navigateur: (navigateur) => void (navigateur.toilesAvantLaPanne = 3),
  });
  assert.deepEqual(dit(), [ANCRES.demarre]);
  assert.equal(largeurDuCadre(), `${LARGEUR}px`);
  assert.deepEqual(peindre(), [true, 1]);
  assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enPanne]);
  assert.deepEqual(messagesDuCadre(), MESSAGES, 'le cadre garde ce qu’il disait');
  assert.equal(largeurDuCadre(), '', 'le cadre est lâché : il a la taille de son message');
  assert.equal(erreurs.length, 1);
  assert.match(String(erreurs[0]), /toile/);
  // Ce qui avait été peint avant la panne est lâché, et rien n'en reste dans la page.
  assert.ok(page.toiles.length > 1);
  assert.ok(
    page.toiles.every((toile) => !toile.isConnected),
    'aucune toile dans la page',
  );
  assert.equal(cadre.getAttribute('role'), null);
  // Rien ne tourne, et les touches ne sont pas branchées.
  assert.equal(page.attendUneImage, false);
  page.document.querySelector(`[${ANCRES.moment}="decompte"]`)?.envoyer('pointerdown', SOURIS);
  assert.equal(page.attendUneImage, false);
  assert.equal(page.observateursDeVue.length, 0);
});

test('une page à qui il manque un élément que son script anime n’a pas de scène non plus : le cadre garde sa phrase de panne, intacte, et le script le dit à la console', () => {
  // Une touche, la section des touches, la ligne d'état, son chrono, l'avis ou sa touche : quel que soit l'élément qui manque.
  for (const manque of [ANCRES.reveler, ANCRES.rayer, ANCRES.facade, ANCRES.etat, ANCRES.chrono, ANCRES.avis, ANCRES.toutAnimer]) {
    const sonNom = ` id="${manque}"`;
    assert.equal(PAGE.split(sonNom).length, 2, `le gabarit nomme « ${manque} » une fois`);
    const { page, erreurs, peindre, dit, largeurDuCadre, messagesDuCadre } = lancer({ page: PAGE.replace(sonNom, '') });
    assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enPanne], manque);
    assert.deepEqual(messagesDuCadre(), MESSAGES, `sans « ${manque} », le cadre garde de quoi dire la panne`);
    assert.equal(largeurDuCadre(), '', `sans « ${manque} », le cadre n’a pas été ajusté`);
    assert.equal(erreurs.length, 1, manque);
    assert.match(String(erreurs[0]), new RegExp(`pas d'élément « ${manque} »`));
    // On s'en aperçoit avant de rien ouvrir : aucune scène n'a été dessinée pour être jetée, rien n'écoute, rien ne tourne.
    assert.deepEqual(peindre(), [false, 0], manque);
    assert.equal(page.toiles.length, 1, `sans « ${manque} », la seule toile est celle de l’essai du navigateur`);
    assert.equal(page.observateursDeVue.length, 0, manque);
    page.document.querySelector(`[${ANCRES.moment}="decompte"]`)?.envoyer('pointerdown', SOURIS);
    assert.equal(page.attendUneImage, false, `sans « ${manque} », aucune touche n’est branchée`);
  }
});

test('un navigateur qui sait dire quand ses polices sont prêtes est attendu, qu’elles le soient ou qu’il y renonce ; celui qui ne sait pas dire si l’on voit la scène la tient pour visible', async () => {
  for (const pretes of [Promise.resolve(), Promise.reject(new Error('polices refusées'))]) {
    const { page, peindre, dit, erreurs } = lancer({ navigateur: (navigateur) => void (navigateur.document.fonts = { ready: pretes }) });
    // Tant que les polices ne sont pas prêtes, rien n'est demandé : ni image, ni minuterie.
    assert.equal(page.attendUneImage, false);
    await pretes.catch(() => undefined);
    await Promise.resolve();
    assert.deepEqual(peindre(), [true, 1]);
    assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enMarche]);
    assert.deepEqual(erreurs, []);
  }

  const { page, peindre, dit, erreurs } = lancer({ navigateur: (navigateur) => void (navigateur.observeLaVue = false) });
  assert.equal('IntersectionObserver' in monde, false);
  peindre();
  assert.deepEqual(dit(), [ANCRES.demarre, ANCRES.enMarche]);
  // Il la tient pour visible : la piste lancée, les images se suivent.
  page.document.querySelector(`[${ANCRES.moment}="decompte"]`)?.envoyer('pointerdown', SOURIS);
  peindre();
  peindre();
  assert.equal(page.attendUneImage, true);
  assert.deepEqual(erreurs, []);
});
