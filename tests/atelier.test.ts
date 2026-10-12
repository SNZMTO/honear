/**
 * L'atelier de l'étape 2, sans navigateur : la séance écrite d'avance, l'horloge qu'on remet à l'heure, ce qu'on y choisit,
 * ce qu'il mesure, et les images de la piste arrêtée.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODE_LEGER, SCENE_ENTIERE } from '../src/ecran/allegements';
import { compteur } from '../src/planche/etape2/compteur';
import { imagesDeLaPiste } from '../src/planche/etape2/images';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { A_L_OUVERTURE, optionsDe, VITESSES } from '../src/planche/etape2/options';
import {
  etatDeLaSeance,
  instantDeDepart,
  lecteurDeSeance,
  MOMENTS,
  preparerLaSeance,
  revelerDes,
  seanceDExemple,
  seanceEntiere,
  tardeACharger,
  type Seance,
} from '../src/planche/etape2/seance';
import { reponseDExemple } from '../src/planche/exemples';
import { horlogeDePlanche } from '../src/planche/horloge';
import { DUREE_DU_DECOMPTE, instantDuChiffre, phaseDeLaPiste } from '../src/regles/piste';
import { AMPLEURS } from '../src/ressources/mouvement';
import { DEROULE, REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { VERSO_DU_JEU } from '../src/scene/disque/verso';
import { regardSurLaPlatine } from '../src/scene/meuble';
import { suivreLaPiste } from '../src/scene/piste/suivi';
import { calque, ENCRIER, IMAGES_DE_LA_PISTE } from './planche';

const REPONSE = reponseDExemple(TEXTES);
const preparer = (extraitLent: boolean) => preparerLaSeance({ duree: 10, reponse: REPONSE, extraitLent });
const SEANCE = preparer(false);
const LENTE = preparer(true);
const [LANCER] = SEANCE.actions;

test('la séance est une piste écrite d’avance, comme un serveur la jouerait : lancer, appareils prêts, révéler', () => {
  assert.deepEqual(
    SEANCE.actions.map((action) => action.genre),
    ['lancer', 'prets', 'reveler'],
  );
  assert.ok(LANCER !== undefined);
  // Les appareils sont prêts à temps : l'extrait part à zéro, puis dure ce qu'on a demandé.
  assert.equal(SEANCE.extrait, LANCER.a + DUREE_DU_DECOMPTE);
  assert.equal(SEANCE.revelation, SEANCE.extrait + 10);
  assert.ok(SEANCE.rayure > SEANCE.extrait + 1 && SEANCE.rayure < SEANCE.revelation - 1, 'la mauvaise réponse tombe en plein extrait');
  // Chaque moment prend son élan : on le voit venir. Et l'on voit la platine au repos avant le « 3 ».
  const { decompte, extrait, rayure, revelation } = SEANCE.departs;
  assert.equal(decompte, 0);
  assert.deepEqual(Object.keys(SEANCE.departs).sort(), [...MOMENTS].sort());
  assert.ok(LANCER.a >= 0.5, 'la platine au repos se voit une demi-seconde au moins');
  // L'extrait se reprend au « 1 », pas avant : ce qu'on voit d'abord, c'est le bras qui se lève, pivote et descend.
  assert.ok(Math.abs(SEANCE.extrait - extrait - 1) < 1e-9 && extrait > LANCER.a);
  assert.ok(rayure < SEANCE.rayure && SEANCE.rayure - rayure >= 0.5);
  assert.ok(revelation < SEANCE.revelation && SEANCE.revelation - revelation >= 1);
  assert.ok(SEANCE.fin > SEANCE.revelation + 4, 'la séance laisse au disque le temps de s’arrêter, de se retourner et de se reposer');
});

test('en « extrait lent », les appareils ne sont prêts qu’après le décompte : l’extrait attend, puis part avec son préavis', () => {
  const [lancer, prets] = LENTE.actions;
  assert.ok(lancer !== undefined && prets !== undefined);
  assert.ok(prets.a > lancer.a + DUREE_DU_DECOMPTE, 'les appareils sont prêts après la fin du décompte');
  assert.equal(LENTE.extrait, prets.a + DEROULE.preavis);
  assert.ok(LENTE.extrait - lancer.a > DUREE_DU_DECOMPTE + 2, 'on a le temps de voir le bras attendre');
  assert.equal(LENTE.revelation - LENTE.extrait, SEANCE.revelation - SEANCE.extrait, 'l’extrait dure autant');
  // Un seul moment se rejoue sur cette piste-là : l'attente. Les autres se rejouent sur celle qui part à l'heure.
  assert.deepEqual(MOMENTS.filter(tardeACharger), ['attente']);
  assert.equal(LENTE.lance, SEANCE.lance, 'les deux pistes sont lancées au même instant');
  // L'attente se reprend un peu avant le « 1 » : on voit la pastille y passer, puis le bras se lever et attendre. Pas depuis le « 3 ».
  const piste = etatDeLaSeance(LENTE, LENTE.lance, []).piste;
  assert.ok(piste !== undefined);
  const un = instantDuChiffre(piste, 1);
  assert.ok(LENTE.departs.attente < un && un - LENTE.departs.attente <= 0.5, `${un - LENTE.departs.attente} s avant le « 1 »`);
  assert.ok(LENTE.extrait - un > 2, 'et l’attente dure assez pour se voir');
});

test('les moments de la piste se suivent dans l’ordre où ils arrivent, et la page les nomme tous', () => {
  assert.deepEqual([...MOMENTS], ['decompte', 'attente', 'extrait', 'rayure', 'revelation']);
  assert.deepEqual(Object.keys(LEGENDES.moments), [...MOMENTS]);
  const departs = MOMENTS.map((moment) => (tardeACharger(moment) ? LENTE : SEANCE).departs[moment]);
  // Dans l'ordre de leurs départs : l'attente avant l'extrait, la rayure avant la révélation.
  assert.deepEqual(
    departs,
    [...departs].sort((a, b) => a - b),
  );
});

test('un moment se rejoue d’un peu avant lui ; avant le « 3 », la platine au repos se voit un instant, compté en temps de montre', () => {
  for (const moment of MOMENTS.filter((m) => m !== 'decompte')) {
    const seance = tardeACharger(moment) ? LENTE : SEANCE;
    // Loin du repos, un moment part toujours de son instant, à toute vitesse, d'où qu'on vienne.
    for (const maintenant of [0, seance.lance, seance.extrait + 2, seance.fin + 5]) {
      for (const vitesse of VITESSES) assert.equal(instantDeDepart(seance, moment, maintenant, vitesse), seance.departs[moment], moment);
    }
  }
  // Le décompte, rejoué en route ou la piste finie : la platine se voit d'abord remise au repos.
  for (const maintenant of [SEANCE.lance, SEANCE.extrait + 2, SEANCE.fin + 5]) {
    assert.equal(instantDeDepart(SEANCE, 'decompte', maintenant, 1), SEANCE.departs.decompte);
    // Au ralenti, on n'attend pas plus longtemps devant une image fixe : le même temps de montre sépare le toucher du « 3 ».
    for (const vitesse of VITESSES) {
      const depart = instantDeDepart(SEANCE, 'decompte', maintenant, vitesse);
      assert.ok(Math.abs((SEANCE.lance - depart) / vitesse - SEANCE.lance) < 1e-9, `×${vitesse} : ${(SEANCE.lance - depart) / vitesse} s de montre`);
    }
  }
  // Au repos, rien à remettre en place : le « 3 » tombe un souffle après le toucher.
  for (const vitesse of VITESSES) {
    const attente = (SEANCE.lance - instantDeDepart(SEANCE, 'decompte', 0, vitesse)) / vitesse;
    assert.ok(attente > 0 && attente <= 0.1, `×${vitesse} : ${attente} s d’attente`);
  }
});

test('l’état de la séance à un instant est ce que donnent les règles une fois jouées les actions dont l’heure est passée', () => {
  assert.deepEqual(etatDeLaSeance(SEANCE, 0, []), { rayuresA: [] });
  const pendant = etatDeLaSeance(SEANCE, SEANCE.extrait + 0.5, []);
  assert.ok(pendant.piste !== undefined && pendant.piste.revelation === undefined);
  assert.equal(phaseDeLaPiste(pendant.piste, SEANCE.extrait + 0.5), 'extrait');
  assert.deepEqual(pendant.rayuresA, []);
  const apres = etatDeLaSeance(SEANCE, SEANCE.fin, []);
  assert.deepEqual(apres.piste?.revelation, { a: SEANCE.revelation, reponse: REPONSE });
  assert.deepEqual(apres.rayuresA, [SEANCE.rayure]);
  assert.deepEqual(seanceEntiere(SEANCE), apres, 'la séance entière : la piste telle qu’on la connaît à la fin');
  // Les mauvaises réponses données à la main s'ajoutent à celle qui est écrite, dans l'ordre, et pas avant leur heure.
  const t = SEANCE.rayure + 1;
  assert.deepEqual(etatDeLaSeance(SEANCE, t, [t - 0.5, SEANCE.extrait + 0.2, t + 3]).rayuresA, [SEANCE.extrait + 0.2, SEANCE.rayure, t - 0.5]);
  // La séance de l'atelier est celle de la piste d'exemple, avec l'extrait le plus court des réglages.
  const exemple = seanceDExemple(TEXTES);
  assert.deepEqual(exemple.actions[0], { genre: 'lancer', a: LANCER?.a, duree: REGLAGES.extrait.choix[0] });
  assert.ok(seanceDExemple(TEXTES, true).extrait > exemple.extrait + 2, 'et l’extrait lent y tarde');
});

test('le lecteur de séance rend le même objet tant que rien n’a changé : l’écran sait qu’il n’a pas à relire la partition', () => {
  const lire = lecteurDeSeance();
  const avant = lire(SEANCE, 0, []);
  assert.equal(lire(SEANCE, 0.3, []), avant);
  assert.deepEqual(avant, { rayuresA: [] });
  const lancee = lire(SEANCE, SEANCE.extrait - 2.5, []);
  assert.notEqual(lancee, avant);
  assert.equal(lire(SEANCE, SEANCE.extrait - 2.4, []), lancee);
  const jouee = lire(SEANCE, SEANCE.extrait + 1, []);
  assert.equal(lire(SEANCE, SEANCE.extrait + 2, []), jouee);
  // Une mauvaise réponse de plus, et c'est une autre piste à suivre.
  assert.notEqual(lire(SEANCE, SEANCE.extrait + 2, [SEANCE.extrait + 1.5]), jouee);
});

test('révéler avant l’heure, c’est avancer la révélation à l’instant présent ; hors de l’extrait, rien ne change', () => {
  const t = SEANCE.extrait + 2;
  const coupee = revelerDes(SEANCE, t);
  assert.equal(coupee.revelation, t);
  assert.deepEqual(etatDeLaSeance(coupee, t, []).piste?.revelation, { a: t, reponse: REPONSE });
  assert.equal(coupee.fin - coupee.revelation, SEANCE.fin - SEANCE.revelation, 'la révélation prend le même temps');
  assert.deepEqual(coupee.actions.slice(0, 2), SEANCE.actions.slice(0, 2), 'le début de la piste ne change pas');
  // Avant l'extrait, la règle refuserait la révélation ; après elle, c'est fait.
  for (const hors of [0, SEANCE.extrait - 0.01, SEANCE.revelation, SEANCE.fin]) assert.equal(revelerDes(SEANCE, hors), SEANCE);
  assert.equal(revelerDes(coupee, t + 1), coupee, 'on ne révèle qu’une fois');
});

/** La pose d'une séance à un instant, suivie image par image depuis un peu plus tôt, comme un écran la suit. */
function poseApres(seance: Seance, rayuresDuJoueur: readonly number[], depuis: number, jusqua: number): unknown {
  const suivi = suivreLaPiste();
  const lire = lecteurDeSeance();
  let pose = suivi.poseA(lire(seance, depuis, rayuresDuJoueur), depuis);
  for (let t = depuis; t <= jusqua; t += 1 / 60) pose = suivi.poseA(lire(seance, t, rayuresDuJoueur), t);
  return pose;
}

test('à la fin de la séance, tout est retombé : plus rien ne bouge, et l’atelier peut s’endormir', () => {
  // La séance écrite, celle dont l'extrait tarde, et des révélations avant l'heure : au plus tôt, en plein extrait, juste après une rayure.
  const revelees = [0.02, 1, 3.3, 7].map((apres) => revelerDes(SEANCE, SEANCE.extrait + apres));
  for (const seance of [SEANCE, LENTE, ...revelees]) {
    const rayures = [seance.revelation - 0.05];
    const aLaFin = poseApres(seance, rayures, seance.revelation - 2, seance.fin);
    const bienApres = poseApres(seance, rayures, seance.revelation - 2, seance.fin + 6);
    assert.deepEqual(aLaFin, bienApres, `révélée à ${seance.revelation} s : la pose à la fin est celle qui reste`);
  }
});

test('l’horloge de planche attend qu’on la mette à l’heure, se ralentit sans sauter, et se remet à zéro pour rejouer', () => {
  let heure = 100;
  const source = { maintenant: () => heure };
  const horloge = horlogeDePlanche(source);
  heure += 5;
  assert.equal(horloge.maintenant(), 0, 'arrêtée à zéro tant qu’on ne l’a pas lancée');
  horloge.ralentir(0.5);
  heure += 3;
  assert.equal(horloge.maintenant(), 0, 'la ralentir ne la fait pas partir');
  horloge.ralentir(1);
  horloge.mettreA(2);
  heure += 1.5;
  assert.equal(horloge.maintenant(), 3.5);
  // Ralentie au quart, l'instant présent ne bouge pas : seul le temps qui vient passe moins vite.
  horloge.ralentir(0.25);
  assert.equal(horloge.maintenant(), 3.5);
  assert.equal(horloge.vitesse, 0.25);
  heure += 4;
  assert.equal(horloge.maintenant(), 4.5);
  horloge.ralentir(1);
  heure += 1;
  assert.equal(horloge.maintenant(), 5.5);
  horloge.mettreA(0);
  assert.equal(horloge.maintenant(), 0, 'rejouer, c’est remettre l’horloge');
});

test('ce que les touches de l’atelier tiennent donne ses options : la vraie vitesse d’abord, puis les ralentis du brief ; le mode léger réunit tous les allègements', () => {
  assert.deepEqual([...VITESSES], [1, 0.5, 0.25], 'la vraie vitesse, puis ×0,5 et ×0,25');
  assert.deepEqual(A_L_OUVERTURE, { vitesse: 1, verso: VERSO_DU_JEU, leger: false });
  const entiere = optionsDe({ ...A_L_OUVERTURE, sobre: false });
  assert.deepEqual(entiere, { vitesse: 1, verso: VERSO_DU_JEU, sobre: false, allegements: SCENE_ENTIERE });
  assert.equal(optionsDe({ ...A_L_OUVERTURE, sobre: true, leger: true }).allegements, MODE_LEGER);
  assert.ok(Object.values(MODE_LEGER).every(Boolean) && !Object.values(SCENE_ENTIERE).some(Boolean));
  // La version sobre n'est pas un allègement : c'est une autre lecture du même état, et elle se choisit à part.
  assert.equal(optionsDe({ ...A_L_OUVERTURE, sobre: true }).allegements, SCENE_ENTIERE);
});

test('un compteur dit la moyenne et le pire cas de ses dernières valeurs, sur combien il les compte, et oublie les plus anciennes', () => {
  const mesure = compteur(3);
  assert.deepEqual(mesure.compte(), { sur: 0, moyenne: 0, auPire: 0 }, 'rien de noté : rien à dire');
  mesure.noter(10);
  assert.deepEqual(mesure.compte(), { sur: 1, moyenne: 10, auPire: 10 });
  mesure.noter(20);
  assert.deepEqual(mesure.compte(), { sur: 2, moyenne: 15, auPire: 20 });
  mesure.noter(60);
  assert.deepEqual(mesure.compte(), { sur: 3, moyenne: 30, auPire: 60 });
  // La quatrième valeur chasse la première ; puis le pire cas d'il y a trois images s'oublie à son tour.
  mesure.noter(1);
  assert.deepEqual(mesure.compte(), { sur: 3, moyenne: 27, auPire: 60 });
  mesure.noter(2);
  mesure.noter(3);
  assert.deepEqual(mesure.compte(), { sur: 3, moyenne: 2, auPire: 3 });
});

test('les images de la piste la montrent à dix instants, dans l’ordre, toujours les mêmes ; la réponse n’y est qu’une fois révélée', () => {
  const images = imagesDeLaPiste(TEXTES, ENCRIER);
  assert.deepEqual(
    images.map((i) => i.fichier),
    Object.keys(LEGENDES.images).map((nom) => `piste-${nom}`),
  );
  assert.deepEqual(images, IMAGES_DE_LA_PISTE.slice(0, images.length), 'la même piste, redessinée, est la même au polygone près');
  const base = regardSurLaPlatine();
  const revelees = ['piste-ralentit', 'piste-tranche', 'piste-reponse'];
  for (const image of images) {
    const reponse = calque(image.scene, 'disque/verso/reponse').contenu.length > 0;
    assert.equal(reponse, revelees.includes(image.fichier), `${image.fichier} : la réponse au verso`);
    // Le regard ne quitte la platine qu'une fois le disque arrêté, et s'arrête sur lui.
    const glisse = image.regard.origine[0] - base.origine[0];
    if (!['piste-tranche', 'piste-reponse'].includes(image.fichier)) assert.equal(glisse, 0, image.fichier);
    assert.deepEqual([image.regard.largeur, image.regard.hauteur], [base.largeur, base.hauteur]);
  }
  const fin = images[images.length - 1];
  assert.ok(fin !== undefined && Math.abs(fin.regard.origine[0] - base.origine[0] - AMPLEURS.regardSurLaReponse) < 0.05);
  assert.equal(calque(fin.scene, 'disque/verso').opacite, 1, 'à la fin, le disque montre son verso');
  assert.equal(calque(fin.scene, 'disque/recto').opacite, 0);
});
