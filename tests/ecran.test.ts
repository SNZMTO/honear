/**
 * L'écran, sur une fausse page : les touches, la boucle d'images, le plan, le montage d'une scène, le verso du disque,
 * et l'écran d'une piste qui tient tout cela à jour d'image en image.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODE_LEGER, SCENE_ENTIERE, type Allegements } from '../src/ecran/allegements';
import { lancerLaBoucle } from '../src/ecran/boucle';
import { factureVoulue, memeDessin, memeFacture } from '../src/ecran/facture';
import { monter } from '../src/ecran/montage';
import { monterLaPiste, ouvrirLEcranDeLaPiste, type OptionsDEcran, type PisteADessiner } from '../src/ecran/piste';
import { poserUnPlan } from '../src/ecran/plan';
import { policesEmbarquees } from '../src/ecran/polices';
import { figer } from '../src/ecran/toile';
import { brancherUnCran, brancherUneTouche, montrerLesTouchesEnfoncees, type DepartDeTouche } from '../src/ecran/touche';
import { tenirLeVerso, type VersoVoulu } from '../src/ecran/verso';
import { pisteDExemple, reponseDExemple } from '../src/planche/exemples';
import { jouer, type Piste, type Reponse } from '../src/regles/piste';
import { DENSITES } from '../src/ressources/densites';
import { MONTAGE } from '../src/ressources/ecran';
import { TEXTES } from '../src/ressources/textes.fr';
import { SIGNE_DE_REPLI } from '../src/ressources/typo';
import { aplat, type Calque, type Dessin } from '../src/scene/calque';
import { CALQUES_DU_VERSO } from '../src/scene/disque';
import { VERSO_DU_JEU, VERSOS_A_COMPARER } from '../src/scene/disque/verso';
import type { PisteEnScene } from '../src/scene/piste/etat';
import { instantsDeLaPiste } from '../src/scene/piste/instants';
import type { PoseDeLaPiste } from '../src/scene/piste/pose';
import { POSE_AVANT_LA_PISTE } from '../src/scene/piste/pose';
import { regardDeLaPiste } from '../src/scene/piste/regard';
import { glissement, type Reglage } from '../src/scene/reglage';
import { enSvg } from '../src/scene/rendu/transformation';
import { INSECABLE } from '../src/scene/typographie';
import { DOIGT, enElement, installerUneFaussePage, memeElement, memesElements, SOURIS, type FauxElement } from './fausse-page';
import { ENCRIER } from './planche';

const PAGE = installerUneFaussePage();
const REPONSE = reponseDExemple(TEXTES);
const A_DESSINER: PisteADessiner = { decor: pisteDExemple(TEXTES), textes: TEXTES, encrier: ENCRIER };
const [AUTRE_VERSO = VERSO_DU_JEU] = VERSOS_A_COMPARER;
assert.notEqual(AUTRE_VERSO, VERSO_DU_JEU, 'il y a un autre verso à comparer à celui du jeu');

/** Une piste lancée à cet instant, son extrait de 10 s parti à l'heure, et révélée si on donne une réponse. */
function pisteJouee(lanceeA: number, reponse?: Reponse): Piste {
  let piste = jouer(undefined, { genre: 'lancer', a: lanceeA, duree: 10 });
  piste = jouer(piste, { genre: 'prets', a: lanceeA + 0.5 });
  if (reponse !== undefined && piste?.extraitA !== undefined) piste = jouer(piste, { genre: 'reveler', a: piste.extraitA + 10, reponse });
  if (piste === undefined) throw new Error('La piste du test ne se lance pas.');
  return piste;
}

/** Une touche neuve, branchée, le compte de ses actions, et de quoi la débrancher. */
function toucheBranchee(depart: DepartDeTouche): { readonly touche: FauxElement; readonly actions: () => number; readonly debrancher: () => void } {
  const touche = PAGE.poser('button');
  let actions = 0;
  const debrancher = brancherUneTouche(enElement(touche), () => actions++, depart);
  return { touche, actions: () => actions, debrancher };
}

test('une touche agit à l’instant du toucher : dès que la souris se pose, et, sur une page qui défile, quand le doigt se relève', () => {
  // La règle du jeu : l'action part dès que le doigt ou la souris se pose, et le clic qui suit n'agit pas une seconde fois.
  for (const pointeur of [SOURIS, DOIGT]) {
    const { touche, actions } = toucheBranchee('toucher');
    touche.envoyer('pointerdown', pointeur);
    assert.equal(actions(), 1, `${pointeur.pointerType} : l'action part au toucher`);
    touche.envoyer('click', { detail: 1 });
    assert.equal(actions(), 1, `${pointeur.pointerType} : le clic qui suit n'agit pas une seconde fois`);
  }
  // Sur une page qui défile : la souris agit en se posant ; le doigt, qui veut peut-être faire glisser la page, en se relevant sur place.
  const aLaSouris = toucheBranchee('toucherALaSouris');
  aLaSouris.touche.envoyer('pointerdown', SOURIS);
  assert.equal(aLaSouris.actions(), 1);
  aLaSouris.touche.envoyer('click', { detail: 1 });
  assert.equal(aLaSouris.actions(), 1);
  const auDoigt = toucheBranchee('toucherALaSouris');
  auDoigt.touche.envoyer('pointerdown', DOIGT);
  assert.equal(auDoigt.actions(), 0, 'le doigt se pose : rien encore');
  auDoigt.touche.envoyer('click', { detail: 1 });
  assert.equal(auDoigt.actions(), 1, 'il se relève sur place : l’action part');
  // Un doigt qui fait glisser la page ne donne pas de clic : rien ne part.
  const glisse = toucheBranchee('toucherALaSouris');
  glisse.touche.envoyer('pointerdown', DOIGT);
  assert.equal(glisse.actions(), 0);
});

test('au clavier, une touche agit quand on valide ; un bouton droit, un second doigt ne font rien ; deux pressions font deux actions', () => {
  for (const depart of ['toucher', 'toucherALaSouris'] as const) {
    // Le clavier et les aides à la lecture valident sans pointeur : un clic sans détail, qui agit toujours.
    const clavier = toucheBranchee(depart);
    clavier.touche.envoyer('click', { detail: 0 });
    clavier.touche.envoyer('click', { detail: 0 });
    assert.equal(clavier.actions(), 2, depart);
    // La souris s'est posée puis relâchée ailleurs (pas de clic) : le clavier qui suit agit quand même.
    const puisClavier = toucheBranchee(depart);
    puisClavier.touche.envoyer('pointerdown', SOURIS);
    puisClavier.touche.envoyer('click', { detail: 0 });
    assert.equal(puisClavier.actions(), 2, depart);
    // Le bouton droit, un second doigt : pas une pression.
    const autres = toucheBranchee(depart);
    autres.touche.envoyer('pointerdown', { ...SOURIS, button: 2 });
    autres.touche.envoyer('pointerdown', { ...DOIGT, isPrimary: false });
    assert.equal(autres.actions(), 0, depart);
    // Et un second doigt qui se pose pendant que le premier appuie ne fait pas agir deux fois ce premier.
    const aDeuxDoigts = toucheBranchee(depart);
    aDeuxDoigts.touche.envoyer('pointerdown', SOURIS);
    aDeuxDoigts.touche.envoyer('pointerdown', { ...DOIGT, isPrimary: false });
    aDeuxDoigts.touche.envoyer('click', { detail: 1 });
    assert.equal(aDeuxDoigts.actions(), 1, depart);
    // Deux pressions de suite : deux actions, pas une de plus pour les clics.
    const deuxFois = toucheBranchee(depart);
    for (let fois = 0; fois < 2; fois++) {
      deuxFois.touche.envoyer('pointerdown', SOURIS);
      deuxFois.touche.envoyer('click', { detail: fois + 1 });
    }
    assert.equal(deuxFois.actions(), 2, depart);
  }
  // Débranchée, une touche ne fait plus rien : un écran qui s'en va n'agit plus.
  for (const depart of ['toucher', 'toucherALaSouris'] as const) {
    const quiSEnVa = toucheBranchee(depart);
    quiSEnVa.debrancher();
    quiSEnVa.touche.envoyer('pointerdown', SOURIS);
    quiSEnVa.touche.envoyer('click', { detail: 1 });
    quiSEnVa.touche.envoyer('click', { detail: 0 });
    assert.equal(quiSEnVa.actions(), 0, depart);
  }
  // Ce qui fait voir les touches enfoncées sur un téléphone s'écoute sur le document, et se retire de même.
  const ecoutes = (): number => PAGE.ecouteursDuDocument.get('touchstart')?.size ?? 0;
  const neMontrePlus = montrerLesTouchesEnfoncees();
  assert.equal(ecoutes(), 1);
  neMontrePlus();
  assert.equal(ecoutes(), 0);
  // Un navigateur qui ne dit pas quand un doigt se pose : l'action part au clic, une fois.
  const fenetre = PAGE.fenetre;
  const connu = fenetre['PointerEvent'];
  fenetre['PointerEvent'] = undefined;
  try {
    const ancien = toucheBranchee('toucher');
    ancien.touche.envoyer('pointerdown', SOURIS);
    assert.equal(ancien.actions(), 0);
    ancien.touche.envoyer('click', { detail: 1 });
    assert.equal(ancien.actions(), 1);
  } finally {
    fenetre['PointerEvent'] = connu;
  }
});

test('un cran se presse comme une touche, sans que le navigateur fasse défiler la page pour lui ; le clavier passe par son bouton radio', () => {
  const libelle = PAGE.poser('label');
  const cran = PAGE.poser('input', { type: 'radio' }, libelle);
  let choisi = 0;
  const debrancher = brancherUnCran(enElement(libelle), cran as unknown as HTMLInputElement, () => choisi++, 'toucherALaSouris');
  // À la souris : le cran est choisi dès qu'elle se pose. Le clic qui suit, né sur le libellé, est retenu : le navigateur ne donne pas
  // le clavier au bouton radio à sa façon, en faisant défiler la page ; on le lui donne sans défiler.
  libelle.envoyer('pointerdown', SOURIS);
  assert.equal(choisi, 1);
  assert.equal(libelle.envoyer('click', { detail: 1 }), true, 'le navigateur est retenu');
  assert.equal(choisi, 1);
  assert.deepEqual(cran.focus_recus, [{ preventScroll: true }]);
  // Au doigt : au relâcher, de la même façon.
  libelle.envoyer('pointerdown', DOIGT);
  assert.equal(choisi, 1);
  assert.equal(libelle.envoyer('click', { detail: 1 }), true);
  assert.equal(choisi, 2);
  assert.equal(cran.focus_recus.length, 2);
  // Au clavier : le clic naît sur le bouton radio. On laisse faire le navigateur, et le bouton radio dit lui-même qu'il a changé.
  cran.checked = true;
  assert.equal(cran.envoyer('click', { detail: 0 }), false, 'le navigateur n’est pas retenu');
  cran.envoyer('change');
  assert.ok(choisi >= 3, 'le cran est choisi, peut-être deux fois pour un seul geste : à qui l’écoute de n’agir qu’une fois');
  assert.equal(cran.focus_recus.length, 2, 'et l’on ne touche pas au clavier, qui y est déjà');
  // Un bouton radio qu'on décoche pour un autre ne choisit rien.
  const avant = choisi;
  cran.checked = false;
  cran.envoyer('change');
  assert.equal(choisi, avant);
  // Débranché, le cran ne choisit plus rien, et ne retient plus le navigateur.
  debrancher();
  cran.checked = true;
  libelle.envoyer('pointerdown', SOURIS);
  cran.envoyer('change');
  assert.equal(libelle.envoyer('click', { detail: 1 }), false);
  assert.equal(choisi, avant);
});

test('la boucle d’images appelle ce qu’on lui confie une fois par image, s’endort quand tout est au repos, et se réveille à la demande', () => {
  let images = 0;
  let encore = true;
  const boucle = lancerLaBoucle(() => {
    images++;
    return encore;
  });
  assert.equal(images, 0, 'rien ne se fait avant la première image');
  for (let i = 0; i < 3; i++) assert.ok(PAGE.passerUneImage());
  assert.equal(images, 3);
  // Plus rien à montrer : après cette image, elle ne demande plus rien au navigateur.
  encore = false;
  assert.ok(PAGE.passerUneImage());
  assert.equal(images, 4);
  assert.equal(PAGE.attendUneImage, false, 'elle dort');
  assert.equal(PAGE.passerUneImage(), false);
  // On la réveille : une image, et une seule, même réveillée deux fois.
  boucle.reveiller();
  boucle.reveiller();
  assert.ok(PAGE.passerUneImage());
  assert.equal(images, 5);
  assert.equal(PAGE.attendUneImage, false);
  // Réveillée pendant qu'elle tourne : sans effet.
  encore = true;
  boucle.reveiller();
  assert.ok(PAGE.passerUneImage());
  boucle.reveiller();
  assert.ok(PAGE.passerUneImage());
  assert.equal(images, 7);
  // Arrêtée, elle ne repart plus, même réveillée.
  boucle.arreter();
  assert.equal(PAGE.attendUneImage, false);
  boucle.reveiller();
  assert.equal(PAGE.attendUneImage, false);
  assert.equal(images, 7);
});

test('une image qui échoue ne fige pas la boucle : la suivante est tentée', () => {
  let images = 0;
  const boucle = lancerLaBoucle(() => {
    if (++images === 2) throw new Error('une image qui échoue');
    return true;
  });
  assert.ok(PAGE.passerUneImage());
  assert.throws(() => PAGE.passerUneImage(), /une image qui échoue/);
  assert.ok(PAGE.attendUneImage, 'elle a redemandé une image');
  assert.ok(PAGE.passerUneImage());
  assert.equal(images, 3);
  boucle.arreter();
});

test('le plan montre la scène à l’échelle de la largeur de son cadre, et la suit quand elle change', () => {
  const cadre = PAGE.poser('div');
  const plan = poserUnPlan(enElement(cadre), { largeur: 390, hauteur: 844 });
  const element = plan.element as unknown as FauxElement;
  // Ses toiles et ses tracés n'ont rien à dire à qui ne voit pas la scène : c'est le cadre qui la nomme.
  assert.equal(element.getAttribute('aria-hidden'), 'true');
  assert.equal(element.style.getPropertyValue('width'), '390px');
  // Un cadre qui n'est pas encore dans la page n'a pas de largeur : la scène s'y montre à sa taille.
  assert.equal(plan.suivreLeCadre(), 1);
  cadre.clientWidth = 292;
  assert.equal(plan.suivreLeCadre(), 292 / 390);
  assert.equal(element.style.transform, `scale(${292 / 390})`);
  // Tant que la largeur ne change pas, rien ne s'écrit.
  const ecrit = element.ecritures;
  plan.suivreLeCadre();
  plan.suivreLeCadre();
  assert.equal(element.ecritures, ecrit);
  cadre.clientWidth = 390;
  assert.equal(plan.suivreLeCadre(), 1);
});

test('la facture d’une scène suit ses allègements, l’échelle où on la montre et la finesse de l’écran, sans dépasser ce qui se voit', () => {
  const { auPlus, auMoinsEnLeger } = MONTAGE.definition;
  const entiere = factureVoulue(SCENE_ENTIERE, 1, 3);
  assert.deepEqual(entiere, { densite: DENSITES.fine, ombresFigees: false, definition: 3 });
  // Montrée aux trois quarts sur un écran à 3 px par px : 2,25 px de toile par px de scène. Jamais plus que ce qu'on fige au plus.
  assert.equal(factureVoulue(SCENE_ENTIERE, 0.75, 3).definition, 2.25);
  assert.equal(factureVoulue(SCENE_ENTIERE, 1, 4).definition, auPlus);
  // Le mode léger : la densité sobre, des ombres figées, des toiles moitié moins définies, sans descendre sous ce qui devient flou.
  const legere = factureVoulue(MODE_LEGER, 1, 3);
  assert.deepEqual(legere, { densite: DENSITES.sobre, ombresFigees: true, definition: 1.5 });
  assert.equal(factureVoulue(MODE_LEGER, 0.5, 3).definition, auMoinsEnLeger);
  assert.equal(factureVoulue(MODE_LEGER, 0.5, 1).definition, 0.5, 'un écran déjà grossier n’est pas grossi');
  // Le même dessin, à une définition si proche qu'on ne refait pas les toiles pour elle ; une autre définition, une autre facture.
  assert.ok(memeDessin(entiere, factureVoulue(SCENE_ENTIERE, 0.5, 3)) && !memeDessin(entiere, legere));
  assert.ok(memeFacture(entiere, { ...entiere, definition: 3 * (1 + MONTAGE.tolerance / 2) }));
  assert.ok(!memeFacture(entiere, { ...entiere, definition: 3 * (1 + 2 * MONTAGE.tolerance) }));
  assert.ok(!memeFacture(entiere, { ...legere, definition: 3 }));
});

test('les polices embarquées dans une page se lisent par leur nom, sans rien demander au réseau', () => {
  const lire = policesEmbarquees({ 'une.woff': Buffer.from([0, 1, 2, 250, 255]).toString('base64') });
  assert.deepEqual([...new Uint8Array(lire('une.woff'))], [0, 1, 2, 250, 255]);
  assert.throws(() => lire('autre.woff'), /autre\.woff n'a pas été embarquée/);
});

/** Un montage qui note ce qu'on y remplit, à la place d'une scène montée. */
function fauxMontage(): { readonly remplir: (calque: string, contenu: readonly Dessin[]) => void; readonly remplis: [string, number][] } {
  const remplis: [string, number][] = [];
  return { remplir: (calque, contenu) => void remplis.push([calque, contenu.length]), remplis };
}

test('le verso du disque ne se remplit que lorsqu’il change : son fond quand on change de façon, la réponse à la révélation, en deux images', () => {
  const montage = fauxMontage();
  const refus: unknown[] = [];
  const verso = tenirLeVerso(montage, { genre: VERSO_DU_JEU, densite: DENSITES.sobre, encrier: ENCRIER, enCasDEchec: (e) => refus.push(e) });
  const voulu = (o: Partial<VersoVoulu>): VersoVoulu => ({ genre: VERSO_DU_JEU, reponse: undefined, aDessiner: false, presse: false, ...o });
  // Avant la révélation : rien à faire, image après image.
  for (let i = 0; i < 3; i++) verso.tenirAJour(voulu({}));
  assert.equal(montage.remplis.length, 0);
  // La réponse tombe, mais le disque tourne encore vite : on attend l'instant où la dessiner ne gêne rien.
  verso.tenirAJour(voulu({ reponse: REPONSE }));
  assert.equal(montage.remplis.length, 0);
  // À cet instant, elle est dessinée ; elle n'est posée qu'à l'image suivante, et plus jamais ensuite.
  verso.tenirAJour(voulu({ reponse: REPONSE, aDessiner: true }));
  assert.equal(montage.remplis.length, 0, 'dessinée, pas encore posée');
  verso.tenirAJour(voulu({ reponse: REPONSE, aDessiner: true }));
  assert.equal(montage.remplis.length, 1);
  assert.equal(montage.remplis[0]?.[0], CALQUES_DU_VERSO.reponse);
  assert.ok((montage.remplis[0]?.[1] ?? 0) > 0);
  for (let i = 0; i < 5; i++) verso.tenirAJour(voulu({ reponse: REPONSE, aDessiner: true, presse: true }));
  assert.equal(montage.remplis.length, 1);
  // On change de verso, le disque déjà retourné : le fond est refait, l'ancienne réponse effacée et la nouvelle posée, à la même image.
  verso.tenirAJour(voulu({ genre: AUTRE_VERSO, reponse: REPONSE, aDessiner: true, presse: true }));
  assert.deepEqual(
    montage.remplis.slice(1).map(([calque, dessins]) => [calque, dessins > 0]),
    [
      [CALQUES_DU_VERSO.fond, true],
      [CALQUES_DU_VERSO.reponse, false],
      [CALQUES_DU_VERSO.reponse, true],
    ],
  );
  // La piste d'après est lancée : le verso n'a plus de réponse. Rien d'autre ne bouge.
  verso.tenirAJour(voulu({ genre: AUTRE_VERSO }));
  assert.deepEqual(montage.remplis.slice(4), [[CALQUES_DU_VERSO.reponse, 0]]);
  verso.tenirAJour(voulu({ genre: AUTRE_VERSO }));
  assert.equal(montage.remplis.length, 5);
  assert.equal(refus.length, 0);
});

test('un téléphone qui a manqué toute une piste montre la réponse de la suivante, pas celle d’avant', () => {
  const montage = fauxMontage();
  const verso = tenirLeVerso(montage, { genre: VERSO_DU_JEU, densite: DENSITES.sobre, encrier: ENCRIER, enCasDEchec: () => undefined });
  const presse = { genre: VERSO_DU_JEU, aDessiner: true, presse: true } as const;
  verso.tenirAJour({ ...presse, reponse: REPONSE });
  assert.equal(montage.remplis.length, 1);
  // La même réponse, redite par un autre objet (l'état vient d'être relu) : rien à refaire.
  verso.tenirAJour({ ...presse, reponse: { ...REPONSE, pochette: { ...REPONSE.pochette } } });
  assert.equal(montage.remplis.length, 1);
  // Une autre réponse, sans être repassé par « pas de réponse » : l'ancienne est effacée, la nouvelle posée.
  const autre: Reponse = { titre: 'Voyage voyage', artiste: 'Desireless', pochette: { vignette: { fond: 'bleuPetrole', motif: 'rayons' } } };
  verso.tenirAJour({ ...presse, reponse: autre });
  assert.deepEqual(
    montage.remplis.slice(1).map(([calque, dessins]) => [calque, dessins > 0]),
    [
      [CALQUES_DU_VERSO.reponse, false],
      [CALQUES_DU_VERSO.reponse, true],
    ],
  );
});

test('un titre qui a un signe que les polices n’ont pas s’écrit quand même ; une réponse qu’on ne sait pas dessiner est refusée une fois, pas à chaque image', () => {
  // Un signe sans glyphe : sa lettre sans accent si on l'a, sinon le signe de repli. Le tracé ne s'arrête jamais sur un titre venu d'ailleurs.
  // « ÿ » n'a pas sa capitale dans le caractère technique, qui s'écrit en capitales : on garde le « y ».
  assert.equal(ENCRIER.ecrivable('Queensrÿche'), 'Queensryche');
  assert.equal(ENCRIER.ecrivable('Les Démons de minuit'), 'Les Démons de minuit', 'ce que les caractères savent écrire ne change pas');
  assert.equal(ENCRIER.ecrivable('Ǆ 한'), `${SIGNE_DE_REPLI} ${SIGNE_DE_REPLI}`);
  // Une espace rare devient une espace ; un signe qui ne se voit pas ne laisse rien, surtout pas un « ? ».
  // Une espace qui ne se coupait pas reste insécable, même si les caractères n'ont pas la sienne : son signe double ne finira pas seul sur une ligne.
  assert.equal(ENCRIER.ecrivable('Où es-tu\u202F?'), `Où es-tu${INSECABLE}?`);
  assert.equal(ENCRIER.ecrivable(`Où es-tu${INSECABLE}?`), `Où es-tu${INSECABLE}?`);
  assert.equal(ENCRIER.ecrivable('Un\tdeux\ntrois\u2009quatre'), 'Un deux trois quatre');
  assert.equal(ENCRIER.ecrivable('Remix\u200B (Radio\u200E Edit)\uFEFF'), 'Remix (Radio Edit)');
  // Un symbole que les polices n'ont pas s'efface, avec l'espace qu'il laisserait au bout.
  assert.equal(ENCRIER.ecrivable('Love ❤\uFE0F'), 'Love');
  assert.equal(ENCRIER.ecrivable('Été ☀️ 2026'), 'Été 2026');
  // Une lettre et son accent écrits à part se lisent comme la lettre accentuée, ou au moins comme la lettre.
  assert.match(ENCRIER.ecrivable('Cafe\u0301'), /^Caf(e\u0301|e|é)$/);
  const montage = fauxMontage();
  const refus: unknown[] = [];
  const verso = tenirLeVerso(montage, { genre: VERSO_DU_JEU, densite: DENSITES.sobre, encrier: ENCRIER, enCasDEchec: (e) => refus.push(e) });
  const exotique: Reponse = { ...REPONSE, titre: 'Привет 한국', artiste: 'Ǆ' };
  for (let i = 0; i < 3; i++) verso.tenirAJour({ genre: VERSO_DU_JEU, reponse: exotique, aDessiner: true, presse: true });
  assert.equal(refus.length, 0, 'elle se dessine, avec des signes de repli');
  assert.equal(montage.remplis.length, 1);
  // Un dessin qui échoue pour une autre raison : on le dit une fois, le verso reste sans réponse, et l'image suivante ne retente pas.
  const casse = tenirLeVerso(
    {
      remplir: () => {
        throw new Error('ne doit pas être rempli');
      },
    },
    {
      genre: VERSO_DU_JEU,
      densite: DENSITES.sobre,
      encrier: {
        ...ENCRIER,
        largeur: () => {
          throw new Error('la mesure échoue');
        },
      },
      enCasDEchec: (e) => refus.push(e),
    },
  );
  for (let i = 0; i < 4; i++) casse.tenirAJour({ genre: VERSO_DU_JEU, reponse: REPONSE, aDessiner: true, presse: false });
  assert.equal(refus.length, 1);
  assert.match(String(refus[0]), /la mesure échoue/);
});

const compter = (dans: FauxElement, tag: string): number => dans.querySelectorAll(tag).length;
const pxDeToile = (toiles: readonly FauxElement[]): number => toiles.reduce((somme, toile) => somme + toile.width * toile.height, 0);

test('le montage fige le décor sur des toiles, garde en SVG ce qui bouge en polygones, et lâche ses toiles à la fin', () => {
  for (const facture of [factureVoulue(SCENE_ENTIERE, 1, 3), factureVoulue(MODE_LEGER, 0.75, 2)]) {
    const montee = monterLaPiste(A_DESSINER, facture, VERSO_DU_JEU);
    const racine = montee.montage.element as unknown as FauxElement;
    const bilan = montee.montage.bilan();
    const toiles = racine.querySelectorAll('canvas');
    assert.deepEqual([bilan.toiles, bilan.svg], [toiles.length, compter(racine, 'svg')]);
    assert.equal(bilan.pxDeToile, pxDeToile(toiles));
    // Peu de toiles, toutes peintes ; quelques SVG pour le bras, les ombres, l'étiquette ; et de quoi régler chaque pièce qui bouge.
    assert.ok(bilan.toiles >= 6 && bilan.toiles <= 14, `${bilan.toiles} toiles`);
    assert.ok(bilan.svg >= 4 && bilan.svg <= 12, `${bilan.svg} SVG`);
    assert.ok(bilan.reglables >= 60, `${bilan.reglables} calques à régler`);
    for (const toile of toiles) assert.ok(toile.peints > 0 && toile.width > 0 && toile.height > 0, 'une toile vide ne sert à rien');
    // Une toile a la taille de ses px, et c'est sa transformation qui la ramène à l'échelle : rien n'y est rééchantillonné.
    for (const toile of toiles) {
      assert.equal(toile.style.getPropertyValue('width'), `${toile.width}px`);
      assert.ok(toile.style.transform.endsWith(`scale(${1 / facture.definition})`), toile.style.transform);
    }
    // Plus fine est la définition, plus les toiles pèsent : c'est ce que le mode léger allège.
    assert.ok(bilan.pxDeToile > 100_000 * facture.definition ** 2, `${bilan.pxDeToile} px à ${facture.definition} px par px`);
    // Rien de la scène n'est exposé à qui ne la voit pas : ses SVG se taisent.
    for (const svg of racine.querySelectorAll('svg')) assert.equal(svg.getAttribute('aria-hidden'), 'true');
    // Chaque toile ne fait que montrer une image figée : on n'y peint plus.
    for (const toile of toiles) assert.ok(toile.imageMontree !== undefined && toile.getContext('2d') === null);
    // Démontée, elle lâche ses toiles : aucune ne garde de taille. (Ce qu'un navigateur en rend aussitôt est dit dans montage.ts.)
    montee.montage.demonter();
    assert.equal(pxDeToile(toiles), 0);
    memeElement(racine.parentElement, null, 'démontée, la scène n’est plus dans la page');
  }
});

test('régler une scène montée n’écrit dans la page que ce qui change : une pose déjà montrée ne coûte plus rien', () => {
  const facture = factureVoulue(SCENE_ENTIERE, 1, 3);
  const montee = monterLaPiste(A_DESSINER, facture, VERSO_DU_JEU);
  const racine = montee.montage.element as unknown as FauxElement;
  const ecritures = (): number => [racine, ...racine.descendants].reduce((somme, e) => somme + e.ecritures, 0);
  // La pose de départ est celle dans laquelle la scène a été dessinée : la régler n'écrit rien.
  const auDepart = ecritures();
  montee.montage.regler(montee.reglages(POSE_AVANT_LA_PISTE));
  assert.equal(ecritures(), auDepart);
  // Une autre pose : quelques écritures. La même, redemandée : plus aucune.
  const leve = { ...POSE_AVANT_LA_PISTE, bras: { ...POSE_AVANT_LA_PISTE.bras, leve: 5 }, levier: 1 };
  montee.montage.regler(montee.reglages(leve));
  const apres = ecritures();
  assert.ok(apres > auDepart && apres - auDepart < 60, `${apres - auDepart} écritures pour lever le bras`);
  montee.montage.regler(montee.reglages(leve));
  assert.equal(ecritures(), apres);
  // Le regard : posé sur la grille des px de l'appareil, et récrit seulement s'il bouge.
  montee.montage.regarder([10.1234, 0]);
  assert.equal(racine.style.transform, `translate(${-Math.round(10.1234 * 3) / 3}px,0px)`);
  const regarde = ecritures();
  montee.montage.regarder([10.1234, 0]);
  assert.equal(ecritures(), regarde);
  // On ne règle, et on ne remplit, que ce qui a été monté pour cela.
  assert.throws(() => montee.montage.regler([{ calque: 'socle', opacite: 0 }]), /« socle » n'a pas été monté pour être réglé/);
  assert.throws(() => montee.montage.remplir('bras', []), /« bras » n'a pas été monté pour qu'on en change le contenu/);
  montee.montage.demonter();
});

test('remplir un calque du verso remplace ce qu’il portait et rien d’autre ; s’il ne peut pas l’être, il garde ce qu’il portait', () => {
  const montee = monterLaPiste(A_DESSINER, factureVoulue(SCENE_ENTIERE, 1, 2), VERSO_DU_JEU);
  const racine = montee.montage.element as unknown as FauxElement;
  const bloc = (calque: string): FauxElement => {
    const trouve = racine.descendants.find((e) => e.dataset['calque'] === calque);
    if (trouve === undefined) throw new Error(`Pas de bloc « ${calque} ».`);
    return trouve;
  };
  const [fond, reponse] = [bloc(CALQUES_DU_VERSO.fond), bloc(CALQUES_DU_VERSO.reponse)];
  // Le fond est là dès le montage ; la réponse n'y est pas.
  assert.ok(fond.descendants.length > 0);
  assert.equal(reponse.descendants.length, 0);
  const ailleurs = (): FauxElement[] => racine.querySelectorAll('canvas').filter((toile) => !fond.descendants.includes(toile));
  const [avant, autour] = [fond.querySelectorAll('canvas'), ailleurs()];
  const tailles = autour.map((toile) => toile.width * toile.height);
  const triangle: Dessin = {
    genre: 'aplat',
    contours: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    ],
    teinte: 'miel',
    ton: 2,
  };
  // Un contenu qu'on ne peut pas poser (le navigateur ne donne plus de toile) laisse le calque comme il était.
  PAGE.sansToile = true;
  try {
    assert.throws(() => montee.montage.remplir(CALQUES_DU_VERSO.fond, [triangle]), /toile/);
  } finally {
    PAGE.sansToile = false;
  }
  memesElements(fond.querySelectorAll('canvas'), avant, 'le fond d’avant est toujours là');
  assert.ok(avant.every((toile) => toile.width > 0));
  montee.montage.remplir(CALQUES_DU_VERSO.fond, [triangle]);
  assert.equal(pxDeToile(avant), 0, 'les toiles d’avant sont lâchées');
  assert.ok(fond.descendants.length > 0 && fond.descendants.every((e) => !avant.includes(e)));
  // Le reste de la scène n'est pas touché : les mêmes toiles, à la même taille.
  memesElements(ailleurs(), autour, 'les toiles du reste de la scène sont les mêmes');
  assert.deepEqual(
    autour.map((toile) => toile.width * toile.height),
    tailles,
  );
  // Vidé, il ne porte plus rien.
  montee.montage.remplir(CALQUES_DU_VERSO.fond, []);
  assert.equal(fond.descendants.length, 0);
  montee.montage.demonter();
});

test('un contenu qui ne peut être posé qu’à moitié ne laisse rien : ni dans le calque, ni parmi ce qu’on y règle', () => {
  const triangle = (x: number): Dessin =>
    aplat(
      [
        [
          [x, 0],
          [x + 10, 0],
          [x + 10, 10],
        ],
      ],
      'miel',
    );
  // Un calque dont on change le contenu ; dans ce contenu, une pièce qu'on règle entre deux dessins figés : une toile, un SVG, une toile.
  const piece = (x: number): Calque => ({
    genre: 'calque',
    nom: 'pastille-temoin/face',
    role: 'mobile',
    transformations: [{ genre: 'glisser', de: [0, 0] }],
    contenu: [triangle(x)],
  });
  const contenu = (x: number): Dessin[] => [triangle(x), piece(x + 20), triangle(x + 40)];
  const scene: Calque = {
    genre: 'calque',
    nom: 'meuble',
    contenu: [{ genre: 'calque', nom: 'pastille-temoin', role: 'image', contenu: contenu(0) }],
  };
  const montage = monter(scene, {
    etendue: { origine: [0, 0], largeur: 100, hauteur: 100 },
    reglables: new Set(['pastille-temoin/face']),
    remplacables: new Set(['pastille-temoin']),
    definition: 1,
    mesurer: ENCRIER.largeur,
    tracerLeTexte: ENCRIER.tracer,
  });
  const racine = montage.element as unknown as FauxElement;
  const [bloc, ...autres] = racine.querySelectorAll('[data-calque="pastille-temoin"]');
  assert.ok(bloc !== undefined && autres.length === 0);
  const avant = [...bloc.children];
  assert.deepEqual(
    avant.map((pose) => pose.tagName),
    ['canvas', 'svg', 'canvas'],
  );
  const groupe = (): FauxElement | null => bloc.querySelector('[data-calque="pastille-temoin/face"]');
  const laPiece = groupe();
  assert.ok(laPiece !== null);

  // Le navigateur donne une toile, puis plus aucune : le nouveau contenu s'arrête après sa première toile et son SVG.
  const toilesAvant = PAGE.toiles.length;
  PAGE.toilesAvantLaPanne = 1;
  try {
    assert.throws(() => montage.remplir('pastille-temoin', contenu(5)), /toile/);
  } finally {
    PAGE.toilesAvantLaPanne = Infinity;
  }
  memesElements(bloc.children, avant, 'le calque porte ce qu’il portait, et rien de plus');
  assert.ok(
    avant.every((pose) => pose.tagName !== 'canvas' || pose.width > 0),
    'ses toiles sont intactes',
  );
  const commencees = PAGE.toiles.slice(toilesAvant).filter((toile) => toile.imageMontree !== undefined);
  assert.equal(commencees.length, 1, 'une toile du nouveau contenu avait été peinte');
  assert.ok(commencees.every((toile) => !toile.isConnected) && pxDeToile(commencees) === 0, 'elle est lâchée');
  // Et ce qu'on règle est toujours la pièce qu'on voit, pas celle du contenu refusé.
  montage.regler([glissement('pastille-temoin/face', 0, [7, 0])]);
  assert.equal(laPiece.getAttribute('transform'), enSvg({ genre: 'glisser', de: [7, 0] }));

  // Le navigateur de nouveau en état : le contenu passe, l'ancien s'en va, et l'on règle la nouvelle pièce.
  montage.remplir('pastille-temoin', contenu(5));
  assert.ok(bloc.children.length === 3 && bloc.children.every((pose: FauxElement) => !avant.includes(pose)));
  const nouvelle = groupe();
  assert.ok(nouvelle !== null && nouvelle !== laPiece);
  montage.regler([glissement('pastille-temoin/face', 0, [9, 0])]);
  assert.equal(nouvelle.getAttribute('transform'), enSvg({ genre: 'glisser', de: [9, 0] }));
  montage.demonter();
});

test('un montage qui s’arrête en route ne garde rien : les toiles déjà peintes sont lâchées', () => {
  const avant = PAGE.toiles.length;
  // Le navigateur donne cinq toiles, puis plus aucune.
  PAGE.toilesAvantLaPanne = 5;
  try {
    assert.throws(() => monterLaPiste(A_DESSINER, factureVoulue(SCENE_ENTIERE, 1, 2), VERSO_DU_JEU), /toile/);
  } finally {
    PAGE.toilesAvantLaPanne = Infinity;
  }
  const peintes = PAGE.toiles.slice(avant).filter((toile) => toile.imageMontree !== undefined);
  assert.equal(peintes.length, 5);
  assert.equal(pxDeToile(peintes), 0);
});

test('figer une image : peinte hors de la page si le navigateur le sait, sinon tirée après coup de la toile peinte, sinon laissée sur sa toile', async () => {
  const peindre = (contexte: { fill(): void }): void => {
    contexte.fill();
    contexte.fill();
  };
  const figee = (): FauxElement => figer(30, 20, peindre) as unknown as FauxElement;
  /** Laisse au navigateur le temps de tirer une image d'une toile. */
  const unInstant = (): Promise<void> => new Promise((suite) => setImmediate(suite));
  try {
    // Un navigateur d'aujourd'hui : l'image est peinte hors de la page, et la toile qu'on rend ne fait que la montrer.
    PAGE.figeage = 'horsPage';
    const montree = figee();
    assert.deepEqual([montree.width, montree.height, montree.imageMontree?.peints], [30, 20, 2]);
    assert.equal(montree.getContext('2d'), null, 'on ne peut plus y peindre');

    // Un navigateur qui ne sait que tirer une image d'une toile : on rend la toile peinte, et elle se remplace d'elle-même, dans la page.
    PAGE.figeage = 'apresCoup';
    const tireesAvant = PAGE.imagesTirees.length;
    const conteneur = PAGE.poser('div');
    const peinte = figee();
    peinte.style.cssText = 'transform:translate(3px,4px)';
    conteneur.appendChild(peinte);
    assert.deepEqual([peinte.peints, peinte.imageMontree], [2, undefined]);
    await unInstant();
    const [remplacante, ...autres] = conteneur.children;
    assert.ok(remplacante !== undefined && remplacante !== peinte && autres.length === 0, 'la toile peinte a laissé sa place');
    assert.deepEqual([remplacante.width, remplacante.height, remplacante.imageMontree?.peints], [30, 20, 2]);
    assert.equal(remplacante.style.transform, 'translate(3px,4px)', 'à la même place');
    assert.equal(peinte.width * peinte.height, 0, 'et elle est lâchée');
    const [pourLaPremiere, ...deTrop] = PAGE.imagesTirees.slice(tireesAvant);
    assert.ok(pourLaPremiere !== undefined && deTrop.length === 0 && !pourLaPremiere.fermee, 'son image est celle qu’on montre : elle reste ouverte');
    // Retirée de la page avant que l'image soit prête, elle n'est remplacée par rien : son image est rendue, aucune toile n'est faite pour elle.
    const retiree = figee();
    conteneur.appendChild(retiree);
    retiree.remove();
    const toilesAvant = PAGE.toiles.length;
    await unInstant();
    memesElements(conteneur.children, [remplacante], 'rien n’a pris la place de la toile retirée');
    assert.equal(retiree.imageMontree, undefined);
    assert.equal(PAGE.imagesTirees.length, tireesAvant + 2);
    assert.equal(PAGE.imagesTirees[tireesAvant + 1]?.fermee, true, 'l’image tirée pour rien est rendue');
    assert.equal(PAGE.toiles.length, toilesAvant, 'aucune toile n’est créée pour la montrer');

    // Un navigateur qui ne sait ni l'un ni l'autre : la toile peinte reste en place.
    PAGE.figeage = 'jamais';
    const restee = figee();
    conteneur.appendChild(restee);
    await unInstant();
    assert.ok(conteneur.children.includes(restee) && restee.peints === 2 && restee.width === 30);

    // Et s'il ne donne plus de toile du tout, on le dit.
    PAGE.sansToile = true;
    for (const facon of ['horsPage', 'apresCoup', 'jamais'] as const) {
      PAGE.figeage = facon;
      assert.throws(figee, /toile où figer le décor/, facon);
    }
  } finally {
    PAGE.sansToile = false;
    PAGE.figeage = 'horsPage';
  }
});

/** Un écran ouvert dans un cadre de la fausse page, son horloge, et ce qu'il a refusé. */
function ecranOuvert(options: Partial<OptionsDEcran> = {}, largeur = 390) {
  const cadre = PAGE.poser('div');
  cadre.clientWidth = largeur;
  const horloge = { heure: 0 };
  const refus: unknown[] = [];
  const ecran = ouvrirLEcranDeLaPiste(enElement(cadre), {
    ...A_DESSINER,
    horloge: { maintenant: () => horloge.heure },
    densiteDeLEcran: () => 3,
    options: { allegements: SCENE_ENTIERE, verso: VERSO_DU_JEU, sobre: false, ...options },
    enCasDeRefus: (e) => refus.push(e),
  });
  /**
   * Une image à l'instant t, comme une boucle la fait passer : la facture tenue, puis la piste montrée. L'horloge qui bat
   * et celle de la piste vont ici du même pas.
   */
  const montrer = (scene: PisteEnScene, t: number) => {
    horloge.heure = t;
    ecran.tenirLaFacture();
    return ecran.montrer(scene, t);
  };
  const blocDe = (calque: string): FauxElement | undefined => cadre.descendants.find((e) => e.dataset['calque'] === calque);
  return { cadre, ecran, refus, montrer, blocDe, toiles: () => cadre.querySelectorAll('canvas') };
}

/** Les réglages qu'une pose demande à une scène de cette facture : ceux d'une scène témoin, montée à part puis rendue. */
function reglagesAttendus(allegements: Allegements, echelle: number): (pose: PoseDeLaPiste) => Reglage[] {
  const temoin = monterLaPiste(A_DESSINER, factureVoulue(allegements, echelle, 3), VERSO_DU_JEU);
  temoin.montage.demonter();
  return temoin.reglages;
}

/** Les nombres d'une transformation écrite dans la page : ceux de ses « translate », en px. */
const glissements = (transform: string): number[] =>
  [...transform.matchAll(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]);
/** Vrai si une longueur tombe sur la grille des px de l'appareil, à cette définition. */
const surLaGrille = (px: number, definition: number): boolean => Math.abs(px * definition - Math.round(px * definition)) < 1e-6;

/**
 * Confronte ce que la page porte aux réglages d'une pose. Un calque resté en SVG porte chaque transformation sur le groupe de son rang,
 * telle quelle ; un calque monté en bloc porte les siennes dans son style, ses glissements posés sur la grille.
 * @returns le nombre de réglages retrouvés dans la page, et ceux qui n'y sont pas tels quels.
 */
function confronter(cadre: FauxElement, reglages: readonly Reglage[], definition: number): { readonly lus: number; readonly ecarts: string[] } {
  const ecarts: string[] = [];
  let lus = 0;
  for (const reglage of reglages) {
    const porteur = cadre.descendants.find((e) => e.dataset['calque'] === reglage.calque);
    assert.ok(porteur !== undefined, `le calque « ${reglage.calque} » n’est pas dans la page`);
    const enBloc = porteur.tagName === 'div';
    if ('opacite' in reglage) {
      const ecrite = enBloc ? porteur.style.opacity : (porteur.getAttribute('opacity') ?? '1');
      if (Number(ecrite) !== reglage.opacite) ecarts.push(`${reglage.calque} : opacité ${ecrite}, attendue ${reglage.opacite}`);
    } else if (enBloc) {
      const ecrits = glissements(porteur.style.transform);
      if (!ecrits.every((px) => surLaGrille(px, definition))) ecarts.push(`${reglage.calque} : ${porteur.style.transform} n’est pas sur la grille`);
      const { transformation } = reglage;
      if (
        transformation.genre === 'glisser' &&
        !transformation.de.every((voulu) => ecrits.some((ecrit) => Math.abs(ecrit - voulu) <= 0.5 / definition + 1e-9))
      )
        ecarts.push(`${reglage.calque} : ${porteur.style.transform}, attendu un glissement de ${transformation.de.join(', ')}`);
    } else {
      let groupe: FauxElement | undefined = porteur;
      for (let rang = 0; rang < reglage.rang; rang++) groupe = groupe?.children[0];
      const ecrite = groupe?.getAttribute('transform');
      if (ecrite !== enSvg(reglage.transformation))
        ecarts.push(`${reglage.calque}, rang ${reglage.rang} : ${ecrite}, attendu ${enSvg(reglage.transformation)}`);
    }
    lus++;
  }
  return { lus, ecarts };
}

test('à chaque image, l’écran écrit dans la page les réglages de la pose et le regard : des transformations et des opacités, rien d’autre, sur la grille des px', () => {
  const largeur = 292;
  const { cadre, ecran, montrer } = ecranOuvert({}, largeur);
  const definition = (3 * largeur) / 390;
  const attendus = reglagesAttendus(SCENE_ENTIERE, largeur / 390);
  const piste = pisteJouee(1, REPONSE);
  const scene: PisteEnScene = { piste, rayuresA: [7] };
  const racine = cadre.children[0]?.children[0];
  assert.ok(racine !== undefined);
  // Ce qui est monté ne recevra plus que des réglages : on note, à partir d'ici, tout ce qu'on y écrit.
  const montes = cadre.descendants;
  for (const element of montes) element.ecrits.length = 0;
  // Les toiles sont posées sur la grille dès le montage.
  for (const toile of cadre.querySelectorAll('canvas')) {
    assert.ok(
      glissements(toile.style.transform).length === 2 && glissements(toile.style.transform).every((px) => surLaGrille(px, definition)),
      toile.style.transform,
    );
  }
  const T = instantsDeLaPiste(piste);
  // Le disque en vol, l'extrait, la rayure, le bras qui se repose, le regard qui glisse, le disque retourné.
  const arrets = [1.2, 1.9, 5, 7.05, T.revelation + 0.6, T.arret + 0.3, T.retournement + 0.3, T.retournement + 2];
  let lus = 0;
  let avant = '';
  for (let image = 0; image <= (T.retournement + 2 - 0.9) * 60; image++) {
    const t = 0.9 + image / 60;
    const pose = montrer(scene, t);
    if (!arrets.some((arret) => Math.abs(arret - t) < 1 / 120)) continue;
    const { lus: retrouves, ecarts } = confronter(cadre, attendus(pose), definition);
    assert.deepEqual(ecarts, [], `à ${t.toFixed(2)} s`);
    lus += retrouves;
    // Le regard : le coin haut-gauche de ce qu'on voit, posé sur la grille.
    const [x, y] = glissements(racine.style.transform);
    const origine = regardDeLaPiste(pose).origine;
    assert.ok(x !== undefined && y !== undefined && surLaGrille(x, definition) && surLaGrille(y, definition), racine.style.transform);
    assert.ok(
      Math.abs(x + origine[0]) <= 0.5 / definition + 1e-9 && Math.abs(y + origine[1]) <= 0.5 / definition + 1e-9,
      `${racine.style.transform} pour un regard en ${origine.join(', ')}`,
    );
    // D'un arrêt à l'autre, la page a changé : la scène bouge pour de bon.
    const maintenant = montes.map((e) => `${e.getAttribute('transform') ?? ''}${e.style.transform}`).join('|');
    assert.notEqual(maintenant, avant, `à ${t.toFixed(2)} s, rien n’a bougé dans la page`);
    avant = maintenant;
  }
  assert.ok(lus >= arrets.length * 100, `${lus} réglages retrouvés dans la page`);
  // Le regard a glissé vers la réponse.
  assert.ok(Math.abs((glissements(racine.style.transform)[0] ?? 0) + regardDeLaPiste(POSE_AVANT_LA_PISTE).origine[0]) > 100);
  // Sur ce qui était monté, on n'a écrit que des transformations et des opacités.
  const ecrits = new Set(montes.flatMap((element) => element.ecrits));
  assert.deepEqual([...ecrits].sort(), ['opacity', 'transform']);
  ecran.fermer();
});

test('en mode léger, l’écran coupe pour de bon les réactions et les ombres animées : les paliers d’ombre gardent leur écart, le disque se pose sans tasser la feutrine', () => {
  const largeur = 390;
  const scene: PisteEnScene = { piste: pisteJouee(1), rayuresA: [] };
  /** L'écran ouvert avec ces allègements, mené jusqu'au disque en vol : sa pose, et ce que la page porte. */
  const enVol = (allegements: Allegements) => {
    const ouvert = ecranOuvert({ allegements }, largeur);
    let pose = ouvert.montrer(scene, 0.9);
    for (let t = 0.9; t <= 1.5; t += 1 / 60) pose = ouvert.montrer(scene, t);
    assert.ok(pose.disque.hauteur > 5, `le disque vole à ${pose.disque.hauteur} px`);
    return { ...ouvert, pose };
  };
  const entier = enVol(SCENE_ENTIERE);
  const leger = enVol(MODE_LEGER);
  // L'action principale est la même : le disque est au même endroit, et il a entraîné sa pochette kraft d'autant.
  assert.deepEqual(leger.pose.disque.en, entier.pose.disque.en);
  assert.ok(entier.pose.kraft.entrainee > 1 && leger.pose.kraft.entrainee === entier.pose.kraft.entrainee);
  // La page porte les réglages d'une scène aux ombres figées…
  const definition = factureVoulue(MODE_LEGER, 1, 3).definition;
  assert.deepEqual(confronter(leger.cadre, reglagesAttendus(MODE_LEGER, 1)(leger.pose), definition).ecarts, []);
  // … et ceux qui écartent les paliers d'une ombre n'y sont pas : la scène entière les écrit, le mode léger les laisse où ils étaient.
  const quiEcartent = reglagesAttendus(SCENE_ENTIERE, 1)(leger.pose).filter((reglage) => 'ecarteLesPaliers' in reglage);
  assert.ok(quiEcartent.length >= 15, `${quiEcartent.length} réglages écartent des paliers`);
  assert.deepEqual(confronter(entier.cadre, reglagesAttendus(SCENE_ENTIERE, 1)(entier.pose), 3).ecarts, []);
  // Le disque vole : dans la scène entière, les deux premiers paliers de son ombre s'écartent du troisième ; ici ils n'ont pas bougé.
  const laisses = confronter(leger.cadre, quiEcartent, definition).ecarts;
  assert.deepEqual(
    laisses.map((ecart) => ecart.split(',')[0]),
    ['disque/ombre/palier-1', 'disque/ombre/palier-2'],
    laisses.join(' ; '),
  );
  // Les réactions : en se posant, le disque de la scène entière tasse la feutrine d'un px, puis remonte ; celui du mode léger s'y arrête.
  const auPlusBas = (ouvert: typeof entier): number => {
    let bas = Infinity;
    for (let t = 1.5; t <= 2.4; t += 1 / 60) bas = Math.min(bas, ouvert.montrer(scene, t).disque.hauteur);
    return bas;
  };
  const [tasse, net] = [auPlusBas(entier), auPlusBas(leger)];
  assert.ok(net - tasse > 0.8 && net - tasse < 1.2, `au plus bas : ${tasse} px dans la scène entière, ${net} px en mode léger`);
  entier.ecran.fermer();
  leger.ecran.fermer();
});

test('un verso qui ne peut pas être refait garde celui qu’on voyait : l’écran le dit une fois, et la scène continue de bouger', () => {
  const { cadre, ecran, refus, montrer, blocDe } = ecranOuvert();
  const piste = pisteJouee(1, REPONSE);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const etat = (): string => cadre.descendants.map((e) => `${e.getAttribute('transform') ?? ''}${e.style.transform}`).join('|');
  // En plein extrait : le disque tourne.
  montrer(scene, 6);
  const fond = blocDe(CALQUES_DU_VERSO.fond);
  assert.ok(fond !== undefined);
  const duFond = fond.querySelectorAll('canvas');
  assert.ok(duFond.length > 0);
  PAGE.sansToile = true;
  try {
    ecran.changer({ verso: AUTRE_VERSO });
    let avant = etat();
    for (let image = 1; image <= 30; image++) {
      montrer(scene, 6 + image / 60);
      assert.notEqual(etat(), avant, `image ${image} : la scène s’est figée`);
      avant = etat();
    }
    assert.equal(refus.length, 1, 'dit une fois, pas à chaque image');
    assert.match(String(refus[0]), /toile/);
    memesElements(fond.querySelectorAll('canvas'), duFond, 'le fond d’avant est toujours là');
    assert.ok(duFond.every((toile) => toile.width > 0));
    // La réponse, à la révélation, se lit sur le fond qu'on a : de la façon d'avant, pas à moitié de l'une et de l'autre.
    const fin = instantsDeLaPiste(piste).retournement + 2;
    montrer(scene, fin);
    montrer(scene, fin + 0.02);
    const posee = (blocDe(CALQUES_DU_VERSO.reponse)?.descendants ?? []).map((e) => e.dataset['calque']);
    assert.ok(posee.includes('disque/verso/titres') && !posee.includes('disque/verso/etiquette'), `posée : ${posee.filter(Boolean).join(', ')}`);
    assert.equal(refus.length, 1);
  } finally {
    PAGE.sansToile = false;
  }
  // On revient au verso qu'il a, puis on redemande l'autre : c'est une nouvelle demande, et cette fois elle aboutit.
  const fin = instantsDeLaPiste(piste).retournement + 3;
  ecran.changer({ verso: VERSO_DU_JEU });
  montrer(scene, fin);
  ecran.changer({ verso: AUTRE_VERSO });
  montrer(scene, fin + 0.02);
  assert.equal(pxDeToile(duFond), 0, 'le fond est refait');
  const reposee = (blocDe(CALQUES_DU_VERSO.reponse)?.descendants ?? []).map((e) => e.dataset['calque']);
  assert.ok(reposee.includes('disque/verso/etiquette'), 'et la réponse posée de l’autre façon');
  assert.equal(refus.length, 1);
  ecran.fermer();
});

test('l’écran d’une piste la monte dans son cadre, à son échelle ; la réponse arrive au verso pendant que le disque ralentit ; fermé, il ne laisse rien', () => {
  const { cadre, ecran, refus, montrer, blocDe } = ecranOuvert({}, 292);
  // Le cadre ne contient que le plan, à l'échelle de sa largeur.
  assert.equal(cadre.children.length, 1);
  assert.equal(cadre.children[0]?.style.transform, `scale(${292 / 390})`);
  // Ses toiles ont la définition de ce que l'écran montre vraiment : 3 px d'appareil par px, aux trois quarts.
  const bilan = ecran.mesures().bilan;
  assert.ok(bilan.toiles >= 6 && bilan.pxDeToile > 0);
  assert.ok(ecran.mesures().montage >= 0);
  assert.equal(ecran.aFaire(), false);
  const piste = pisteJouee(1, REPONSE);
  const sansReponse = pisteJouee(1);
  const { reponseADessiner, retournement } = instantsDeLaPiste(piste);
  const scenes: readonly (readonly [number, PisteEnScene])[] = [
    [0, { rayuresA: [] }],
    [1, { piste: sansReponse, rayuresA: [] }],
    [7, { piste: sansReponse, rayuresA: [7] }],
    [piste.revelation?.a ?? 0, { piste, rayuresA: [7] }],
  ];
  let poseeA: number | undefined;
  for (let image = 0; image <= 20 * 60; image++) {
    const t = image / 60;
    const [, scene] = [...scenes].reverse().find(([de]) => de <= t) ?? [0, { rayuresA: [] }];
    montrer(scene, t);
    const posee = (blocDe(CALQUES_DU_VERSO.reponse)?.descendants.length ?? 0) > 0;
    if (posee && poseeA === undefined) poseeA = t;
  }
  // Posée une image après l'instant où on peut la dessiner sans gêner : bien avant que le disque ne se retourne.
  assert.ok(
    poseeA !== undefined && poseeA >= reponseADessiner && poseeA <= reponseADessiner + 3 / 60,
    `posée à ${poseeA} s, à dessiner dès ${reponseADessiner} s`,
  );
  assert.ok(poseeA < retournement - 1, 'plus d’une seconde avant le retournement');
  assert.equal(refus.length, 0);
  // Fermé, l'écran ne laisse rien dans le cadre, et lâche ses toiles.
  const toiles = cadre.querySelectorAll('canvas');
  ecran.fermer();
  assert.equal(cadre.children.length, 0);
  assert.equal(pxDeToile(toiles), 0);
});

test('changer de verso ne refait pas la scène : seuls les deux calques du verso sont remplis, à l’image d’après', () => {
  const { ecran, refus, montrer, blocDe, toiles } = ecranOuvert();
  const piste = pisteJouee(1, REPONSE);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const fin = instantsDeLaPiste(piste).retournement + 3;
  montrer(scene, fin);
  montrer(scene, fin + 0.02);
  const fond = blocDe(CALQUES_DU_VERSO.fond);
  assert.ok(fond !== undefined && (blocDe(CALQUES_DU_VERSO.reponse)?.descendants.length ?? 0) > 0);
  const duFond = fond.querySelectorAll('canvas');
  const lesAutres = toiles().filter((toile) => !duFond.includes(toile));
  const montage = ecran.mesures().montage;
  ecran.changer({ verso: AUTRE_VERSO });
  assert.equal(ecran.aFaire(), false, 'ce n’est pas une scène à remonter');
  // Rien ne se fait à l'instant du toucher : c'est l'image suivante qui montre l'autre verso.
  assert.ok(duFond.every((toile) => toile.width > 0));
  montrer(scene, fin + 0.04);
  assert.equal(pxDeToile(duFond), 0, 'le fond d’avant est lâché');
  assert.ok(fond.querySelectorAll('canvas').length > 0 && (blocDe(CALQUES_DU_VERSO.reponse)?.descendants.length ?? 0) > 0);
  // Tout le reste de la scène est resté en place : les mêmes toiles, le même montage.
  assert.ok(lesAutres.every((toile) => toile.isConnected && toile.width > 0));
  assert.equal(ecran.mesures().montage, montage);
  assert.equal(refus.length, 0);
  ecran.fermer();
});

test('passer au mode léger refait la scène à l’image d’après le toucher, d’où en sont les pièces ; l’ancienne ne s’en va que la nouvelle prête', () => {
  const { cadre, ecran, refus, montrer, toiles } = ecranOuvert();
  const piste = pisteJouee(1);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  for (let t = 0.9; t < 5; t += 1 / 60) montrer(scene, t);
  const anciennes = toiles();
  const avant = ecran.mesures().bilan;
  ecran.changer({ allegements: MODE_LEGER });
  // À l'image du toucher, on voit seulement qu'il y a à faire : la touche a le temps de s'enfoncer à l'écran.
  const pose = montrer(scene, 5);
  assert.equal(ecran.aFaire(), true);
  assert.ok(anciennes.every((toile) => toile.isConnected && toile.width > 0));
  // À la suivante, la scène est refaite, et les pièces n'ont pas sauté : le disque tourne toujours, là où il en était.
  const apres = montrer(scene, 5 + 1 / 60);
  assert.equal(ecran.aFaire(), false);
  assert.equal(pxDeToile(anciennes), 0, 'les toiles d’avant sont lâchées');
  assert.ok(Math.abs(apres.disque.etiquette.angleDesArcs - pose.disque.etiquette.angleDesArcs - 200 / 60) < 0.5, 'le disque a tourné d’une image');
  const allege = ecran.mesures().bilan;
  assert.ok(allege.pxDeToile < avant.pxDeToile / 3, `${avant.pxDeToile} px de toile, puis ${allege.pxDeToile}`);
  assert.equal(cadre.children.length, 1);
  assert.equal(refus.length, 0);
  // Revenir à la scène entière : de même. Montrer la piste, seul, ne refait rien : c'est tenir la facture qui remonte la scène,
  // et une boucle peut ainsi chronométrer l'un sans l'autre.
  const legeres = toiles();
  ecran.changer({ allegements: SCENE_ENTIERE });
  for (let image = 2; image <= 6; image++) ecran.montrer(scene, 5 + image / 60);
  assert.ok(legeres.every((toile) => toile.isConnected && toile.width > 0) && !ecran.aFaire(), 'montrer la piste n’a pas refait la scène');
  ecran.tenirLaFacture();
  assert.equal(ecran.aFaire(), true);
  ecran.tenirLaFacture();
  assert.equal(ecran.aFaire(), false);
  assert.equal(pxDeToile(legeres), 0);
  assert.ok(ecran.mesures().bilan.pxDeToile > allege.pxDeToile * 3);
  ecran.fermer();
});

test('un cadre qui change de taille ne fait refaire les toiles qu’une fois sa taille tenue, pas à chaque image du geste', () => {
  const { cadre, ecran, montrer, toiles } = ecranOuvert();
  const scene: PisteEnScene = { rayuresA: [] };
  montrer(scene, 0);
  const avant = toiles();
  const definition = (): number => 1 / Number(/scale\(([\d.]+)\)$/.exec(toiles()[0]?.style.transform ?? '')?.[1] ?? NaN);
  assert.equal(definition(), 3);
  // Le cadre rétrécit, image après image : le plan suit tout de suite, les toiles attendent.
  let t = 0;
  for (let largeur = 380; largeur >= 300; largeur -= 10) {
    cadre.clientWidth = largeur;
    montrer(scene, (t += 1 / 60));
    assert.ok(
      avant.every((toile) => toile.width > 0),
      `à ${largeur} px, les toiles sont encore celles d’avant`,
    );
    assert.equal(cadre.children[0]?.style.transform, `scale(${largeur / 390})`);
    assert.equal(ecran.aFaire(), true, 'il reste à faire : il faut lui donner des images');
  }
  // Sa taille se tient : passé le temps d'attente, les toiles sont refaites à la définition de ce qu'on voit.
  const tenueDepuis = t;
  while (ecran.aFaire() && t < tenueDepuis + 2) montrer(scene, (t += 1 / 60));
  assert.ok(t - tenueDepuis >= MONTAGE.attente && t - tenueDepuis < MONTAGE.attente + 0.1, `refaites ${t - tenueDepuis} s après`);
  assert.equal(pxDeToile(avant), 0);
  assert.ok(Math.abs(definition() - (3 * 300) / 390) < 1e-9, `${definition()} px de toile par px de scène`);
  // Un écart infime ne vaut pas qu'on les refasse.
  const refaites = toiles();
  cadre.clientWidth = 301;
  for (let i = 0; i < 40; i++) montrer(scene, (t += 1 / 60));
  assert.ok(refaites.every((toile) => toile.width > 0) && !ecran.aFaire());
  // Un cadre qu'on étire lentement, d'un px tous les dixièmes de seconde : tant qu'il bouge, les toiles attendent ; elles ne sont
  // refaites qu'une fois, quand il se tient.
  for (let largeur = 302; largeur <= 330; largeur++) {
    cadre.clientWidth = largeur;
    for (let image = 0; image < 6; image++) montrer(scene, (t += 1 / 60));
    assert.ok(
      refaites.every((toile) => toile.width > 0),
      `à ${largeur} px, les toiles sont refaites en plein geste`,
    );
  }
  assert.equal(ecran.aFaire(), true);
  while (ecran.aFaire()) montrer(scene, (t += 1 / 60));
  assert.equal(pxDeToile(refaites), 0);
  assert.ok(Math.abs(definition() - (3 * 330) / 390) < 1e-9, `${definition()} px de toile par px de scène`);
  ecran.fermer();
});

test('une scène qui ne peut pas être refaite est refusée une fois : l’écran garde celle qu’il montrait, et ne retente pas à chaque image', () => {
  const { ecran, refus, montrer, toiles } = ecranOuvert();
  const scene: PisteEnScene = { rayuresA: [] };
  montrer(scene, 0);
  const gardees = toiles();
  PAGE.sansToile = true;
  try {
    ecran.changer({ allegements: MODE_LEGER });
    for (let image = 1; image <= 30; image++) montrer(scene, image / 60);
    assert.equal(refus.length, 1);
    assert.match(String(refus[0]), /toile/);
    assert.ok(
      gardees.every((toile) => toile.isConnected && toile.width > 0),
      'la scène d’avant est toujours là',
    );
    assert.equal(ecran.aFaire(), false, 'il n’attend plus rien');
  } finally {
    PAGE.sansToile = false;
  }
  // On y renonce, puis on le redemande : c'est une nouvelle demande, tentée à son tour.
  ecran.changer({ allegements: SCENE_ENTIERE });
  montrer(scene, 0.9);
  ecran.changer({ allegements: MODE_LEGER });
  montrer(scene, 1);
  montrer(scene, 1.02);
  assert.equal(refus.length, 1);
  assert.equal(pxDeToile(gardees), 0, 'cette fois, la scène est refaite');
  ecran.fermer();
  // À l'ouverture, une scène qui ne peut pas se monter laisse le cadre comme il était, et le dit.
  const cadre = PAGE.poser('div');
  const message = PAGE.poser('p', {}, cadre);
  PAGE.sansToile = true;
  try {
    assert.throws(
      () =>
        ouvrirLEcranDeLaPiste(enElement(cadre), {
          ...A_DESSINER,
          horloge: { maintenant: () => 0 },
          densiteDeLEcran: () => 3,
          options: { allegements: SCENE_ENTIERE, verso: VERSO_DU_JEU, sobre: false },
        }),
      /toile/,
    );
  } finally {
    PAGE.sansToile = false;
  }
  memesElements(cadre.children, [message], 'le cadre garde son message, et lui seul');
});

test('en version sobre, l’écran montre la même piste sans la faire bouger ; les animations rendues, rien ne se rejoue', () => {
  const { ecran, montrer } = ecranOuvert({ sobre: true });
  const piste = pisteJouee(1);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const sobre = montrer(scene, 6);
  const plusTard = montrer(scene, 6.5);
  // Le disque ne tourne pas ; le bras avance quand même : c'est le chrono.
  assert.equal(sobre.disque.etiquette.angleDesArcs, plusTard.disque.etiquette.angleDesArcs);
  assert.ok(plusTard.bras.angle !== sobre.bras.angle);
  ecran.changer({ sobre: false });
  const anime = montrer(scene, 6.52);
  // Les pièces sont où elles doivent être à cet instant : le disque posé sur le plateau, le bras sur le disque. Rien ne repart du repos.
  assert.deepEqual(anime.disque.en, plusTard.disque.en);
  assert.ok(Math.abs(anime.bras.angle - plusTard.bras.angle) < 0.5);
  ecran.fermer();
});
