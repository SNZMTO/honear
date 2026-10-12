/**
 * L'atelier ouvert dans sa page, sur une fausse page : sa boucle d'images qui s'endort et se réveille, ce qu'il dit de la séance
 * à côté de la scène, son cadre tenu ajusté, et les touches de la façade du gabarit branchées sur lui.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MODE_LEGER } from '../src/ecran/allegements';
import { ANCRES, MESURES_AFFICHEES, POUSSOIRS, type Poussoir } from '../src/planche/etape2/ancres';
import { ouvrirLAtelier, type Atelier, type Lecture, type Mesures } from '../src/planche/etape2/atelier';
import { BANCS } from '../src/planche/etape2/banc';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { MINUTAGE } from '../src/planche/etape2/minutage';
import { A_L_OUVERTURE, optionsDe, VITESSES, type ChoixDAtelier, type OptionsDAtelier } from '../src/planche/etape2/options';
import { tenirLeCadreAjuste } from '../src/planche/etape2/page/cadre';
import { direLaSeance } from '../src/planche/etape2/page/dire';
import { ecrireLesMesures } from '../src/planche/etape2/page/mesures';
import { brancherLaFacade, trouverLaFacade } from '../src/planche/etape2/page/touches';
import { MOMENTS, seanceDExemple, type Moment } from '../src/planche/etape2/seance';
import { pisteDExemple, reponseDExemple } from '../src/planche/exemples';
import { ecrire } from '../src/planche/nombres.fr';
import { phaseDeLaPiste } from '../src/regles/piste';
import { CADRAGES } from '../src/ressources/cadrages';
import { REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { montreSonVerso } from '../src/scene/disque';
import { GENRES_DE_VERSO, VERSO_DU_JEU, VERSOS_A_COMPARER } from '../src/scene/disque/verso';
import { remplir } from '../src/scene/phrases';
import { INSECABLE } from '../src/scene/typographie';
import { DOIGT, enElement, installerUneFaussePage, memeElement, memesElements, SOURIS, type FauxElement } from './fausse-page';
import { pageDuGabarit } from './gabarit';
import { lisible, nombreLu, trousDe } from './phrases';
import { ENCRIER } from './planche';

/** Le temps d'une image à soixante par seconde, en secondes. */
const IMAGE = 1 / 60;
const SEANCE = seanceDExemple(TEXTES);
const LENTE = seanceDExemple(TEXTES, true);
const REPONSE = reponseDExemple(TEXTES);
const OUVERTURE: ChoixDAtelier = { ...A_L_OUVERTURE, sobre: false };
const [AUTRE_VERSO] = VERSOS_A_COMPARER;

/** Ce que l'atelier dit d'un chiffre du décompte, et d'une réponse, tels qu'on les lit. */
const decompte = (chiffre: number): string => remplir(LEGENDES.etats.decompte, { chiffre });
const REPONSE_DITE = remplir(LEGENDES.etats.reponse, { titre: REPONSE.titre, artiste: REPONSE.artiste });
const derniere = (lectures: readonly Lecture[]): Lecture => {
  const lecture = lectures[lectures.length - 1];
  assert.ok(lecture !== undefined, 'l’atelier n’a encore rien montré');
  return lecture;
};
/** Vrai si deux instants sont le même, au bruit d'une horloge qu'on avance par soixantièmes près. */
const meme = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/**
 * Un atelier ouvert dans un cadre d'une fausse page neuve, son horloge qu'on avance à la main, et ce qu'il a lu à chaque image.
 * Un test peut aussi faire avancer l'horloge chaque fois qu'on la lit (`parLecture`, en secondes) : ce que l'atelier chronomètre
 * se compte alors en lectures.
 */
function atelierOuvert() {
  const page = installerUneFaussePage();
  const cadre = page.poser('div');
  cadre.clientWidth = CADRAGES.telephone.largeur;
  const horloge = { heure: 1000, parLecture: 0 };
  const lectures: Lecture[] = [];
  const atelier = ouvrirLAtelier(enElement(cadre), {
    decor: pisteDExemple(TEXTES),
    textes: TEXTES,
    encrier: ENCRIER,
    seance: (extraitLent) => seanceDExemple(TEXTES, extraitLent),
    horloge: { maintenant: () => (horloge.heure += horloge.parLecture) },
    densiteDeLEcran: () => 3,
    options: optionsDe(OUVERTURE),
    chaqueImage: (lecture) => lectures.push(lecture),
  });
  /** Fait passer des images, une tous les soixantièmes de seconde, tant que la page en attend. @returns le nombre d'images passées. */
  const passer = (auPlus = Infinity): number => {
    let passees = 0;
    while (passees < auPlus && page.attendUneImage) {
      horloge.heure += IMAGE;
      page.passerUneImage();
      passees++;
    }
    return passees;
  };
  return { page, cadre, horloge, lectures, atelier, passer };
}

test('l’atelier ne demande d’images que tant que quelque chose bouge : il dort avant la piste, se réveille quand on la rejoue, se rendort quand tout est retombé', () => {
  const { page, horloge, lectures, atelier, passer } = atelierOuvert();
  // Ouvert, il n'a encore rien montré : sa première image vient avec celle de la page.
  assert.equal(lectures.length, 0);
  assert.ok(page.attendUneImage);
  assert.equal(passer(), 1, 'une image, et il dort');
  const premiere = derniere(lectures);
  assert.ok(premiere.auRepos && premiere.instant === 0 && premiere.scene.piste === undefined, 'la platine au repos, avant la piste');
  assert.deepEqual([atelier.mesures().parImage.sur, atelier.mesures().entreDeuxImages.sur], [1, 0], 'une image mesurée, et rien entre deux images');
  // Une heure passe : rien ne tourne.
  horloge.heure += 3600;
  assert.equal(page.attendUneImage, false);

  atelier.rejouer('decompte');
  assert.ok(page.attendUneImage, 'rejouer le réveille');
  const images = passer();
  const jouees = lectures.slice(1);
  // La platine était au repos : le « 3 » part dans un souffle, et la séance va d'une traite à son terme.
  const [depart] = jouees;
  assert.ok(depart !== undefined && depart.instant > SEANCE.lance - 0.1 && depart.instant < SEANCE.lance);
  // Une image par soixantième, jusqu'à la première où tout est retombé : à une près, selon l'arrondi de l'horloge au dernier instant.
  assert.equal(images, jouees.length);
  assert.ok(Math.abs(images - ((SEANCE.fin - depart.instant) * 60 + 1)) <= 1, `${images} images`);
  jouees.forEach((lecture, rang) => assert.ok(meme(lecture.instant, depart.instant + rang * IMAGE), `image ${rang} à ${lecture.instant} s`));
  const fin = derniere(lectures);
  assert.ok(jouees.slice(0, -1).every((lecture) => !lecture.auRepos && lecture.instant < SEANCE.fin));
  assert.ok(fin.auRepos && fin.instant >= SEANCE.fin, 'la dernière image est celle où il s’endort');
  assert.equal(page.attendUneImage, false);

  // Endormi, tout ce qui a pu changer quelque chose le réveille, le temps d'y regarder : une image.
  const reveils: readonly (readonly [string, () => void])[] = [
    ['rayer', () => atelier.rayer()],
    ['révéler', () => atelier.reveler()],
    ['changer', () => atelier.changer({ vitesse: 0.5 })],
    ['réveiller', () => atelier.reveiller()],
    ['voir', () => atelier.voir(true)],
  ];
  for (const [nom, geste] of reveils) {
    horloge.heure += 10;
    geste();
    assert.equal(passer(), 1, nom);
    assert.ok(derniere(lectures).auRepos, nom);
  }
  // Ses sommeils ne sont pas des images lentes : d'une image à l'autre, il n'a compté que des soixantièmes.
  const mesures = atelier.mesures();
  assert.ok(Math.abs(mesures.entreDeuxImages.moyenne - 1000 * IMAGE) < 0.001, `${mesures.entreDeuxImages.moyenne} ms entre deux images`);
  assert.ok(mesures.entreDeuxImages.auPire < 1000 * IMAGE + 0.001, `${mesures.entreDeuxImages.auPire} ms au pire`);
  assert.ok(mesures.entreDeuxImages.sur >= 60 && mesures.parImage.sur === mesures.entreDeuxImages.sur, 'sur ses dernières images seulement');
  assert.ok(mesures.bilan.toiles > 0 && mesures.montage >= 0);
});

test('hors de vue, l’atelier ne demande plus d’images mais son horloge court ; une image lente se compte, un onglet caché non', () => {
  const { page, horloge, lectures, atelier, passer } = atelierOuvert();
  passer();
  atelier.rejouer('extrait');
  passer(30);
  const avant = derniere(lectures);
  assert.ok(meme(avant.instant, SEANCE.departs.extrait + 30 * IMAGE), `à ${avant.instant} s`);
  assert.equal(avant.auRepos, false);

  atelier.voir(false);
  assert.equal(passer(), 1, 'l’image déjà demandée passe, et c’est la dernière');
  horloge.heure += 0.5;
  assert.equal(page.attendUneImage, false);
  // Une action faite hors de vue est prise à son heure, et ne relance pas la boucle pour autant.
  atelier.rayer();
  assert.equal(passer(), 1);
  atelier.voir(true);
  assert.ok(page.attendUneImage, 'revenu en vue, il reprend');
  passer(1);
  const apres = derniere(lectures);
  assert.ok(meme(apres.instant, avant.instant + 0.5 + 3 * IMAGE), `la séance a continué sans lui : ${apres.instant} s`);
  const [rayee, ...autres] = apres.scene.rayuresA;
  assert.ok(rayee !== undefined && autres.length === 0 && meme(rayee, avant.instant + IMAGE + 0.5), 'la rayure est à l’instant où on l’a faite');
  // La demi-seconde passée hors de vue n'est pas une image lente.
  passer(5);
  assert.ok(atelier.mesures().entreDeuxImages.auPire < 1000 * IMAGE + 0.001);
  // Une image qui met 200 ms à venir, elle, se compte.
  horloge.heure += 0.2 - IMAGE;
  passer(1);
  assert.ok(Math.abs(atelier.mesures().entreDeuxImages.auPire - 200) < 0.001, `${atelier.mesures().entreDeuxImages.auPire} ms au pire`);
  // Trois secondes sans image : l'onglet était caché, le navigateur ne peignait plus. Ce n'est pas une mesure.
  horloge.heure += 3;
  passer(1);
  assert.ok(Math.abs(atelier.mesures().entreDeuxImages.auPire - 200) < 0.001);
  assert.ok(meme(derniere(lectures).instant, apres.instant + 5 * IMAGE + 0.2 + 3 + IMAGE), 'et la séance, elle, a avancé de tout ce temps');
});

test('« Léger » pressé sur une platine au repos refait la scène : l’atelier se réveille, se donne des images tant qu’elle reste à refaire, et ne compte pas ce montage dans le travail d’une image', () => {
  const { page, cadre, horloge, atelier, passer } = atelierOuvert();
  passer();
  assert.equal(page.attendUneImage, false, 'au repos, il dort');
  const entieres = cadre.querySelectorAll('canvas');
  const entiere = atelier.mesures().bilan;
  // Chaque lecture de l'horloge prend désormais une milliseconde : ce que l'atelier chronomètre se compte en lectures.
  horloge.parLecture = 0.001;
  atelier.reveiller();
  assert.equal(passer(), 1);
  const auRepos = atelier.mesures().parImage.auPire;
  assert.ok(auRepos > 0, 'une image au repos coûte ses lectures');

  atelier.changer(optionsDe({ ...OUVERTURE, leger: true }));
  assert.equal(page.attendUneImage, true, 'changer une option le réveille');
  // À la première image il voit qu'il y a à faire, à la suivante la scène est refaite : il ne se rendort qu'ensuite.
  assert.equal(passer(), 2);
  const legere = atelier.mesures();
  assert.ok(legere.bilan.pxDeToile < entiere.pxDeToile / 3, `${entiere.pxDeToile} px de toile, puis ${legere.bilan.pxDeToile}`);
  assert.ok(
    entieres.every((toile) => !toile.isConnected && toile.width === 0),
    'les toiles d’avant sont lâchées',
  );
  assert.ok(cadre.querySelectorAll('canvas').length > 0);
  // Le montage a sa propre mesure ; le travail de l'image où il s'est fait n'en est pas alourdi.
  assert.ok(legere.montage > 0);
  assert.ok(Math.abs(legere.parImage.auPire - auRepos) < 1e-6, `${legere.parImage.auPire} ms au pire, pour ${auRepos} au repos`);
  atelier.fermer();
});

test('en plein extrait, rayer et révéler changent la séance en route ; la rejouer la rend telle qu’elle est écrite, et l’attente se rejoue sur celle dont l’extrait tarde', () => {
  const { page, cadre, lectures, atelier, passer } = atelierOuvert();
  passer();
  atelier.rejouer('extrait');
  passer(90);
  const t = derniere(lectures).instant;
  assert.ok(t > SEANCE.extrait && t < SEANCE.rayure, 'l’extrait joue, la mauvaise réponse écrite n’est pas encore tombée');
  atelier.rayer();
  passer(1);
  assert.deepEqual(derniere(lectures).scene.rayuresA, [t], 'la rayure est à l’instant du toucher, pas à celui de l’image suivante');
  atelier.reveler();
  passer(1);
  const revelee = derniere(lectures).scene.piste?.revelation;
  assert.ok(revelee !== undefined && meme(revelee.a, t + IMAGE), 'la révélation aussi');
  assert.deepEqual(revelee.reponse, REPONSE);
  // La séance finit plus tôt : tout retombe après cette révélation-là, et l'atelier s'endort.
  passer();
  const fin = derniere(lectures);
  assert.ok(fin.auRepos && fin.instant < SEANCE.revelation, `tout est retombé à ${fin.instant} s, avant la révélation écrite`);
  // Une seconde révélation, la piste finie, ne change plus rien.
  atelier.reveler();
  passer();
  assert.equal(derniere(lectures).scene.piste?.revelation?.a, revelee.a);

  // Rejouée, la séance est de nouveau celle qui est écrite : ni la rayure du joueur, ni la révélation avant l'heure.
  atelier.rejouer('revelation');
  passer(1);
  const rejouee = derniere(lectures);
  assert.ok(meme(rejouee.instant, SEANCE.departs.revelation + IMAGE));
  assert.equal(rejouee.scene.piste?.revelation, undefined);
  assert.deepEqual(rejouee.scene.rayuresA, [SEANCE.rayure]);

  // L'attente se rejoue sur l'autre séance : quand la première jouerait déjà son extrait, celle-ci attend encore, le décompte fini.
  atelier.rejouer('attente');
  passer(1);
  assert.ok(meme(derniere(lectures).instant, LENTE.departs.attente + IMAGE));
  passer(Math.round((SEANCE.extrait + 0.5 - LENTE.departs.attente) * 60));
  const enAttente = derniere(lectures);
  assert.ok(enAttente.instant > SEANCE.extrait && enAttente.instant < LENTE.extrait);
  assert.ok(enAttente.scene.piste !== undefined && phaseDeLaPiste(enAttente.scene.piste, enAttente.instant) === 'decompte');
  // Et un autre moment la ramène sur la première.
  atelier.rejouer('rayure');
  passer(1);
  assert.ok(meme(derniere(lectures).instant, SEANCE.departs.rayure + IMAGE));
  assert.equal(derniere(lectures).scene.piste?.extraitA, SEANCE.extrait);

  // Fermé, il ne demande plus rien et ne laisse rien dans le cadre.
  assert.ok(page.attendUneImage && cadre.children.length === 1);
  atelier.fermer();
  assert.equal(page.attendUneImage, false);
  assert.equal(cadre.children.length, 0);
  atelier.rejouer('decompte');
  assert.equal(page.attendUneImage, false, 'fermé, on ne le réveille plus');
});

/** Ce que l'atelier dit d'une séance rejouée d'un moment à sa fin : une ligne par image. */
function ditsDepuis(moment: Moment, enRoute: (o: { lectures: readonly Lecture[]; atelier: Atelier }) => void = () => undefined) {
  const { lectures, atelier, passer } = atelierOuvert();
  passer();
  const avant = lectures.length;
  atelier.rejouer(moment);
  while (passer(1) === 1) enRoute({ lectures, atelier });
  return lectures.slice(avant).map((lecture) => ({ lecture, dit: direLaSeance(lecture) }));
}
/** Les états qui se suivent, chacun une fois. */
const etatsDe = (dits: readonly { readonly dit: { readonly etat: string } }[]): string[] =>
  dits.map(({ dit }) => lisible(dit.etat)).filter((etat, rang, tous) => etat !== tous[rang - 1]);

test('à côté de la scène, l’atelier dit où en est la piste : le décompte, l’extrait et son temps écoulé, « Rayé. » un instant, puis la réponse quand le disque la montre', () => {
  const E = LEGENDES.etats;
  const reponse = REPONSE_DITE;
  const dits = ditsDepuis('decompte');
  assert.deepEqual(etatsDe(dits), [E.avant, decompte(3), decompte(2), decompte(1), E.extrait, TEXTES.piste.raye, E.extrait, E.revelation, reponse]);
  // Ce que la page écrit ne se coupe pas avant un signe double : l'espace qui le précède est insécable, toujours.
  const avantUnSigneDouble = new RegExp(`(.)[${TEXTES.typographie.insecableAvant.replace(/[\]\\^/-]/g, '\\$&')}]`, 'gu');
  const precedes = dits.flatMap(({ dit }) => [...`${dit.etat} ${dit.chrono}`.matchAll(avantUnSigneDouble)].map((trouve) => trouve[1]));
  assert.ok(precedes.includes(INSECABLE) && !precedes.includes(' '), 'une espace ordinaire avant un signe double');

  // Le temps écoulé ne s'écrit que pendant l'extrait : c'est alors seulement qu'on peut rayer ou révéler.
  for (const { lecture, dit } of dits) {
    const { piste } = lecture.scene;
    const enExtrait = piste !== undefined && phaseDeLaPiste(piste, lecture.instant) === 'extrait';
    assert.equal(dit.enExtrait, enExtrait, `à ${lecture.instant} s`);
    assert.equal(dit.chrono !== '', enExtrait, `à ${lecture.instant} s`);
  }
  // Il part de zéro, ne recule pas, et ne dit jamais que l'extrait est fini avant qu'il le soit.
  const ecoules = dits
    .filter(({ dit }) => dit.enExtrait)
    .map(({ dit }) => {
      const chrono = trousDe(E.chrono, dit.chrono);
      const ecoule = nombreLu(chrono?.['ecoule']);
      assert.ok(ecoule !== undefined && chrono?.['duree'] === ecrire(REGLAGES.extrait.choix[0]), `« ${dit.chrono} »`);
      return ecoule;
    });
  assert.equal(ecoules[0], 0);
  assert.equal(ecoules[ecoules.length - 1], 9.9);
  assert.ok(ecoules.every((ecoule, rang) => rang === 0 || ecoule >= (ecoules[rang - 1] ?? 0)));
  assert.equal(new Set(ecoules).size, 100, 'chaque dixième de seconde est dit');

  // « Rayé. » se lit le temps de le lire, à partir de la mauvaise réponse.
  const rayes = dits.filter(({ dit }) => dit.etat === TEXTES.piste.raye).map(({ lecture }) => lecture.instant);
  const [premier] = rayes;
  assert.ok(premier !== undefined && premier >= SEANCE.rayure && premier < SEANCE.rayure + IMAGE);
  assert.ok(Math.abs(rayes.length * IMAGE - MINUTAGE.raye) <= IMAGE, `${rayes.length} images`);

  // La réponse ne s'écrit que lorsque le disque la montre : il se retourne déjà, mais on voit encore son recto.
  const montree = dits.findIndex(({ dit }) => lisible(dit.etat) === reponse);
  const [juste, avant] = [dits[montree], dits[montree - 1]];
  assert.ok(juste !== undefined && avant !== undefined);
  assert.ok(montreSonVerso(juste.lecture.pose.disque.retourne) && !montreSonVerso(avant.lecture.pose.disque.retourne));
  assert.ok(avant.lecture.pose.disque.retourne > 0, 'le disque se retournait déjà');
  assert.equal(lisible(avant.dit.etat), E.revelation);
  assert.ok(juste.lecture.instant > SEANCE.revelation + 2 && juste.lecture.instant < SEANCE.fin - 0.5, `réponse dite à ${juste.lecture.instant} s`);
});

test('si l’extrait tarde à charger, l’atelier le dit entre le « 1 » et l’extrait ; une mauvaise réponse donnée avant l’extrait ne raye rien', () => {
  const E = LEGENDES.etats;
  const reponse = REPONSE_DITE;
  assert.deepEqual(etatsDe(ditsDepuis('attente')), [
    decompte(2),
    decompte(1),
    E.attente,
    E.extrait,
    TEXTES.piste.raye,
    E.extrait,
    E.revelation,
    reponse,
  ]);

  // Une mauvaise réponse pendant le « 1 », trois dixièmes de seconde avant l'extrait : rien n'est rayé, ni alors ni quand il part.
  const rayee: { a?: number } = {};
  const dits = ditsDepuis('extrait', ({ lectures, atelier }) => {
    const { instant } = derniere(lectures);
    if (rayee.a !== undefined || instant < SEANCE.extrait - 0.3) return;
    rayee.a = instant;
    atelier.rayer();
  });
  assert.ok(rayee.a !== undefined && rayee.a < SEANCE.extrait);
  const debut = dits.filter(({ lecture }) => lecture.instant >= SEANCE.extrait && lecture.instant < SEANCE.rayure);
  assert.ok(debut.length > 150 && debut.every(({ lecture }) => lecture.scene.rayuresA.length === 1));
  assert.ok(
    debut.every(({ dit }) => dit.etat === E.extrait),
    'l’extrait part sans « Rayé. »',
  );
  assert.deepEqual(etatsDe(dits), [decompte(1), E.extrait, TEXTES.piste.raye, E.extrait, E.revelation, reponse]);
});

test('le cadre de la page est tenu ajusté à sa place : aussi grand qu’elle le permet, jamais plus qu’un téléphone, à ses proportions, en px entiers', () => {
  const { largeur: LARGEUR, hauteur: HAUTEUR } = CADRAGES.telephone;
  /** Une place, son poste et son cadre : le cadre a 8 px de bord de chaque côté, et le poste une ligne d'état de 22 px sous lui. */
  const monter = (page: ReturnType<typeof installerUneFaussePage>) => {
    const place = page.poser('div');
    const poste = page.poser('div', {}, place);
    const cadre = page.poser('div', {}, poste);
    [cadre.clientWidth, cadre.offsetWidth, cadre.clientHeight, poste.offsetHeight] = [100, 116, 200, 238];
    const largeur = (): string => place.style.getPropertyValue(ANCRES.largeurDuCadre);
    const donner = (enLarge: number, enHaut: number): void => void ([place.clientWidth, place.clientHeight] = [enLarge, enHaut]);
    return { place, cadre, largeur, donner };
  };

  // Un navigateur qui ne sait pas dire qu'un élément change de taille : on écoute la fenêtre.
  const page = installerUneFaussePage();
  const { place, cadre, largeur, donner } = monter(page);
  let changements = 0;
  donner(300, 700);
  const ajuste = tenirLeCadreAjuste(enElement(place), enElement(cadre), () => changements++);
  // Ajusté tout de suite : la largeur de la place, moins les bords du cadre.
  assert.equal(largeur(), '284px');
  assert.equal(changements, 1);
  const cas: readonly (readonly [number, number, number, string])[] = [
    // La hauteur commande : ce qui reste sous la ligne d'état, ramené aux proportions du téléphone, arrondi au px d'en dessous.
    [300, 500, Math.floor(((500 - 38) * LARGEUR) / HAUTEUR), 'une place basse'],
    // Une grande place : le cadre n'est jamais plus grand qu'un téléphone.
    [1200, 2000, LARGEUR, 'une grande place'],
    [LARGEUR + 16, HAUTEUR + 38, LARGEUR, 'juste la place d’un téléphone'],
    [LARGEUR + 15, HAUTEUR + 38, LARGEUR - 1, 'un px de moins en large'],
    // Une place trop petite pour ses bords : le cadre n'a pas de largeur négative.
    [10, 10, 0, 'une place trop petite'],
  ];
  for (const [enLarge, enHaut, attendue, nom] of cas) {
    donner(enLarge, enHaut);
    assert.equal(page.direALaFenetre('resize'), 1, nom);
    assert.equal(largeur(), `${attendue}px`, nom);
  }
  assert.equal(changements, 1 + cas.length, 'chaque changement est dit, une fois le cadre ajusté');
  // Lâché, le cadre reprend la taille que la page lui donne d'elle-même, et n'écoute plus.
  ajuste.lacher();
  assert.equal(largeur(), '');
  assert.equal(page.direALaFenetre('resize'), 0);

  // Un navigateur qui sait le dire : on regarde la place elle-même, qui peut changer sans que la fenêtre change.
  const autre = installerUneFaussePage();
  autre.observeLesTailles = true;
  const suivie = monter(autre);
  suivie.donner(300, 700);
  const tenu = tenirLeCadreAjuste(enElement(suivie.place), enElement(suivie.cadre), () => changements++);
  const [observateur, ...deTrop] = autre.observateursDeTaille;
  assert.ok(observateur !== undefined && deTrop.length === 0);
  memesElements(observateur.regardes, [suivie.place], 'ce dont on suit la taille : la place du cadre');
  assert.equal(autre.direALaFenetre('resize'), 0, 'la fenêtre n’est pas écoutée');
  suivie.donner(200, 700);
  const avant = changements;
  assert.equal(autre.direLaTaille(suivie.place), 1);
  assert.equal(suivie.largeur(), '184px');
  assert.equal(changements, avant + 1);
  tenu.lacher();
  memesElements(observateur.regardes, [], 'lâché, on ne suit plus rien');
  assert.equal(suivie.largeur(), '');
});

const PAGE_DU_GABARIT = pageDuGabarit(BANCS);

/** La page du gabarit sur une fausse page, sa façade branchée sur un atelier témoin, qui note ce qu'on lui demande. */
function facadeBranchee(choix: ChoixDAtelier) {
  const page = installerUneFaussePage();
  page.racine.insertAdjacentHTML('beforeend', PAGE_DU_GABARIT);
  const appels: string[] = [];
  const voulues: Partial<OptionsDAtelier>[] = [];
  const atelier: Atelier = {
    rejouer: (moment) => void appels.push(`rejouer ${moment}`),
    rayer: () => void appels.push('rayer'),
    reveler: () => void appels.push('reveler'),
    changer: (options) => void voulues.push(options),
    voir: () => undefined,
    reveiller: () => undefined,
    mesures: () => {
      throw new Error('La façade ne mesure rien.');
    },
    fermer: () => undefined,
  };
  const parId = (id: string): FauxElement => {
    const trouve = page.document.getElementById(id);
    assert.ok(trouve !== null, `pas d’élément « ${id} »`);
    return trouve;
  };
  const parAttribut = (attribut: string, valeur: string): FauxElement => {
    const [trouve, ...autres] = page.document.querySelectorAll(`[${attribut}="${valeur}"]`);
    assert.ok(trouve !== undefined && autres.length === 0, `${attribut}="${valeur}"`);
    return trouve;
  };
  /** Un cran d'un groupe : son bouton radio, et le libellé qui est sa touche. */
  const cran = (groupe: string, valeur: string): { readonly bouton: FauxElement; readonly touche: FauxElement } => {
    const bouton = page.document.querySelectorAll(`input[name="${groupe}"]`).find((input) => input.value === valeur);
    const touche = bouton?.closest('label') ?? null;
    assert.ok(bouton !== undefined && touche !== null, `${groupe} ${valeur}`);
    return { bouton, touche };
  };
  /** Les crans enfoncés d'un groupe, tels que la page les montre : à l'œil (la classe) et au clavier (le bouton radio). */
  const enfonces = (groupe: string): { readonly coches: string[]; readonly choisis: string[] } => {
    const boutons = page.document.querySelectorAll(`input[name="${groupe}"]`);
    return {
      coches: boutons.filter((bouton) => bouton.checked).map((bouton) => bouton.value),
      choisis: boutons.filter((bouton) => bouton.closest('label')?.classes.has(ANCRES.choisi)).map((bouton) => bouton.value),
    };
  };
  const facade = brancherLaFacade(trouverLaFacade(), atelier, choix);
  /** Presse une touche à la souris : elle se pose, puis le clic suit. */
  const presser = (touche: FauxElement): void => {
    touche.envoyer('pointerdown', SOURIS);
    touche.envoyer('click', { detail: 1 });
  };
  return { page, appels, voulues, facade, parId, parAttribut, cran, enfonces, presser };
}

test('les touches de la façade du gabarit rejouent chacune leur moment ; « Rayer » et « Révéler » ne servent que pendant l’extrait, éteintes hors de lui', () => {
  const { appels, facade, parId, parAttribut, presser } = facadeBranchee(OUVERTURE);
  for (const moment of MOMENTS) presser(parAttribut(ANCRES.moment, moment));
  assert.deepEqual(
    appels,
    MOMENTS.map((moment) => `rejouer ${moment}`),
    'une action par pression',
  );
  // Au doigt, sur cette page qui défile, l'action part quand il se relève sur place.
  appels.length = 0;
  const decompte = parAttribut(ANCRES.moment, 'decompte');
  decompte.envoyer('pointerdown', DOIGT);
  assert.deepEqual(appels, []);
  decompte.envoyer('click', { detail: 1 });
  assert.deepEqual(appels, ['rejouer decompte']);

  // Avant la piste, les deux touches de l'extrait sont éteintes : elles gardent leur place et le clavier, et ne font rien.
  appels.length = 0;
  const [rayer, reveler] = [parId(ANCRES.rayer), parId(ANCRES.reveler)];
  for (const touche of [rayer, reveler]) {
    assert.equal(touche.getAttribute('aria-disabled'), 'true');
    assert.equal(touche.getAttribute('disabled'), null, 'éteinte, pas retirée du clavier');
    presser(touche);
  }
  assert.deepEqual(appels, []);
  facade.suivre(true);
  for (const touche of [rayer, reveler]) assert.equal(touche.getAttribute('aria-disabled'), 'false');
  presser(rayer);
  presser(rayer);
  presser(reveler);
  assert.deepEqual(appels, ['rayer', 'rayer', 'reveler']);
  // Tant que rien ne change, la façade n'écrit rien dans la page.
  const ecritures = rayer.ecritures;
  facade.suivre(true);
  assert.equal(rayer.ecritures, ecritures);
  facade.suivre(false);
  presser(reveler);
  assert.deepEqual(appels, ['rayer', 'rayer', 'reveler']);
  assert.equal(reveler.getAttribute('aria-disabled'), 'true');
});

test('un cran choisi s’enfonce et relâche les autres, à la souris comme au clavier ; l’atelier reçoit à chaque fois tout ce que la façade tient', () => {
  const { voulues, cran, enfonces, presser } = facadeBranchee(OUVERTURE);
  const { ralenti, verso } = ANCRES;
  assert.deepEqual(enfonces(ralenti), { coches: ['1'], choisis: ['1'] });
  assert.deepEqual(enfonces(verso), { coches: [VERSO_DU_JEU], choisis: [VERSO_DU_JEU] });

  // À la souris : la touche est le libellé. Le cran s'enfonce à l'instant où elle se pose, et l'atelier ralentit.
  const demi = cran(ralenti, '0.5');
  demi.touche.envoyer('pointerdown', SOURIS);
  assert.deepEqual(enfonces(ralenti), { coches: ['0.5'], choisis: ['0.5'] });
  assert.deepEqual(voulues, [optionsDe({ ...OUVERTURE, vitesse: 0.5 })]);
  // Le clic qui suit ne choisit pas une seconde fois ; le navigateur est retenu, et le clavier va au bouton radio sans que la page défile.
  assert.equal(demi.touche.envoyer('click', { detail: 1 }), true);
  assert.deepEqual(demi.bouton.focus_recus, [{ preventScroll: true }]);
  assert.equal(voulues.length, 1);
  // Presser le cran déjà enfoncé ne demande rien.
  presser(demi.touche);
  assert.equal(voulues.length, 1);

  // Au clavier : le navigateur coche lui-même le bouton radio, et le dit.
  const quart = cran(ralenti, '0.25');
  quart.bouton.checked = true;
  quart.bouton.envoyer('change');
  assert.deepEqual(enfonces(ralenti), { coches: ['0.25'], choisis: ['0.25'] });
  assert.deepEqual(voulues[1], optionsDe({ ...OUVERTURE, vitesse: 0.25 }));
  // Le clic que le navigateur envoie alors sur le bouton radio n'est pas retenu : c'est lui qui tient le clavier.
  assert.equal(quart.bouton.envoyer('click', { detail: 0 }), false);
  assert.equal(voulues.length, 2);

  // L'autre groupe ne touche pas au premier, et ce qu'on avait choisi est tenu.
  assert.ok(AUTRE_VERSO !== undefined);
  presser(cran(verso, AUTRE_VERSO).touche);
  assert.deepEqual(enfonces(verso), { coches: [AUTRE_VERSO], choisis: [AUTRE_VERSO] });
  assert.deepEqual(enfonces(ralenti), { coches: ['0.25'], choisis: ['0.25'] });
  assert.deepEqual(voulues[2], optionsDe({ ...OUVERTURE, vitesse: 0.25, verso: AUTRE_VERSO }));
  assert.equal(voulues.length, 3);
});

test('un navigateur qui rend à la page un autre cran que celui de l’atelier est corrigé : c’est l’atelier qui dit lequel est enfoncé', () => {
  const page = installerUneFaussePage();
  page.racine.insertAdjacentHTML('beforeend', PAGE_DU_GABARIT);
  // La page rechargée : le navigateur a recoché le cran qu'on avait laissé.
  for (const bouton of page.document.querySelectorAll(`input[name="${ANCRES.ralenti}"]`)) bouton.checked = bouton.value === '0.25';
  const { enfonces } = facadeBrancheeSur(page);
  assert.deepEqual(enfonces, { coches: ['1'], choisis: ['1'] });
});

/** Branche la façade d'une page déjà écrite sur un atelier qui ne fait rien, et dit les crans de vitesse qu'elle montre enfoncés. */
function facadeBrancheeSur(page: ReturnType<typeof installerUneFaussePage>) {
  const rien = (): void => undefined;
  brancherLaFacade(
    trouverLaFacade(),
    { rejouer: rien, rayer: rien, reveler: rien, changer: rien, voir: rien, reveiller: rien, mesures: () => MESURES, fermer: rien },
    OUVERTURE,
  );
  const boutons = page.document.querySelectorAll(`input[name="${ANCRES.ralenti}"]`);
  return {
    enfonces: {
      coches: boutons.filter((bouton) => bouton.checked).map((bouton) => bouton.value),
      choisis: boutons.filter((bouton) => bouton.closest('label')?.classes.has(ANCRES.choisi)).map((bouton) => bouton.value),
    },
  };
}

test('les poussoirs s’enclenchent et se relâchent ; « Tout animer » relâche la version sobre, retire l’avis et rend le clavier à son poussoir', () => {
  // Un appareil qui a demandé moins d'animations : la page s'ouvre en version sobre, son avis montré.
  const { page, voulues, facade, parId, parAttribut, presser } = facadeBranchee({ ...OUVERTURE, sobre: true });
  const avis = parId(ANCRES.avis);
  assert.equal(avis.hidden, true, 'le gabarit écrit l’avis caché : c’est le script qui le montre');
  avis.hidden = false;
  const poussoir = (nom: Poussoir): FauxElement => parAttribut(ANCRES.poussoir, nom);
  const [sobre, leger] = [poussoir('sobre'), poussoir('leger')];
  assert.equal(sobre.getAttribute('aria-pressed'), 'true', 'le poussoir dit ce que l’atelier tient');
  assert.equal(leger.getAttribute('aria-pressed'), 'false');

  presser(leger);
  assert.equal(leger.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(voulues, [optionsDe({ ...OUVERTURE, sobre: true, leger: true })]);
  assert.equal(voulues[0]?.allegements, MODE_LEGER);
  assert.equal(avis.hidden, false, 'le mode léger ne touche pas à l’avis');

  const toutAnimer = parId(ANCRES.toutAnimer);
  toutAnimer.envoyer('pointerdown', SOURIS);
  // À la souris, le navigateur donne ensuite le clavier à ce qu'on presse : la touche vient de disparaître, on l'en retient.
  assert.equal(toutAnimer.envoyer('mousedown'), true);
  toutAnimer.envoyer('click', { detail: 1 });
  assert.equal(sobre.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(voulues[1], optionsDe({ ...OUVERTURE, sobre: false, leger: true }));
  assert.equal(avis.hidden, true);
  // La touche pressée vient de disparaître avec son avis : le clavier est passé à celle qui tient désormais la version sobre.
  memeElement(page.document.activeElement, sobre, 'le clavier est passé au poussoir « Sobre »');
  assert.deepEqual(sobre.focus_recus, [{ preventScroll: true }]);

  // La version sobre se reprend par son poussoir ; l'avis, lui, ne valait que pour ce que l'appareil avait demandé.
  presser(sobre);
  assert.equal(sobre.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(voulues[2], optionsDe({ ...OUVERTURE, sobre: true, leger: true }));
  assert.equal(avis.hidden, true);
  presser(leger);
  assert.equal(leger.getAttribute('aria-pressed'), 'false');
  assert.deepEqual(voulues[3], optionsDe({ ...OUVERTURE, sobre: true }));
  assert.equal(voulues.length, 4);

  // L'appareil qui change d'avis en route : la version sobre le suit, et l'avis avec elle. S'il redit ce qui est déjà, rien ne change.
  facade.suivreLAppareil(true);
  assert.equal(voulues.length, 4, 'la version sobre était déjà enclenchée : l’atelier n’en entend pas parler');
  assert.equal(avis.hidden, false, 'mais l’avis revient : c’est de nouveau l’appareil qui la demande');
  facade.suivreLAppareil(false);
  assert.deepEqual([sobre.getAttribute('aria-pressed'), avis.hidden], ['false', true]);
  assert.deepEqual(voulues[4], optionsDe({ ...OUVERTURE, sobre: false }));
  facade.suivreLAppareil(true);
  assert.deepEqual([sobre.getAttribute('aria-pressed'), avis.hidden], ['true', false]);
  assert.deepEqual(voulues[5], optionsDe({ ...OUVERTURE, sobre: true }));
  assert.equal(voulues.length, 6);

  // Le clavier posé sur « Tout animer » quand l'appareil y renonce : l'avis se retire sous lui, et le clavier passe au poussoir
  // au lieu de retomber sur la page.
  toutAnimer.focus();
  facade.suivreLAppareil(false);
  assert.deepEqual([sobre.getAttribute('aria-pressed'), avis.hidden], ['false', true]);
  memeElement(page.document.activeElement, sobre, 'le clavier n’est pas resté sur une touche disparue');
  assert.equal(sobre.focus_recus.length, 2);
  // Clavier ailleurs, on n'y touche pas.
  facade.suivreLAppareil(true);
  leger.focus();
  facade.suivreLAppareil(false);
  memeElement(page.document.activeElement, leger, 'le clavier reste où il était');
  assert.equal(sobre.focus_recus.length, 2);
});

test('une page où une touche manque, est en double, ou porte une valeur que le script ne connaît pas, est refusée avant qu’on y branche rien', () => {
  /** Ce qu'on retouche dans la page du gabarit, et ce que le script en dit. */
  const RETOUCHES: readonly (readonly [nom: string, avant: string, apres: string, attendu: RegExp])[] = [
    ['un moment inconnu', `${ANCRES.moment}="rayure"`, `${ANCRES.moment}="inconnue"`, /touche « data-moment » qu'on ne sait pas brancher : inconnue/],
    [
      'un poussoir inconnu',
      `${ANCRES.poussoir}="leger"`,
      `${ANCRES.poussoir}="inconnue"`,
      /touche « data-poussoir » qu'on ne sait pas brancher : inconnue/,
    ],
    ['une vitesse inconnue', 'value="0.25"', 'value="0.3"', /touche « ralenti » qu'on ne sait pas brancher : 0\.3/],
    ['une vitesse en double', 'value="0.25"', 'value="0.5"', /2 touches « ralenti » pour « 0\.5 »/],
    ['« Rayer » sans son nom', ` id="${ANCRES.rayer}"`, '', new RegExp(`pas d'élément « ${ANCRES.rayer} »`)],
    ['« Révéler » sans son nom', ` id="${ANCRES.reveler}"`, '', new RegExp(`pas d'élément « ${ANCRES.reveler} »`)],
    ['l’avis sans son nom', ` id="${ANCRES.avis}"`, '', new RegExp(`pas d'élément « ${ANCRES.avis} »`)],
  ];
  /** Ce qu'on retire de la page du gabarit : une touche entière, de son ouverture à sa fermeture. */
  const RETRAITS: readonly (readonly [nom: string, touche: RegExp, attendu: RegExp])[] = [
    [
      'le moment de la rayure',
      new RegExp(`<button[^>]*${ANCRES.moment}="rayure"[^>]*>.*?</button>`),
      /pas de touche « data-moment » pour « rayure »/,
    ],
    ['le poussoir sobre', new RegExp(`<button[^>]*${ANCRES.poussoir}="sobre"[^>]*>.*?</button>`), /pas de touche « data-poussoir » pour « sobre »/],
    [
      'le cran du verso B',
      new RegExp(`<label[^>]*><input[^>]*name="${ANCRES.verso}" value="${AUTRE_VERSO}"[^>]*>.*?</label>`),
      new RegExp(`pas de touche « verso » pour « ${AUTRE_VERSO} »`),
    ],
  ];
  const refusee = (nom: string, retouchee: string, attendu: RegExp): void => {
    assert.notEqual(retouchee, PAGE_DU_GABARIT, `${nom} : la retouche n’a rien changé`);
    const page = installerUneFaussePage();
    page.racine.insertAdjacentHTML('beforeend', retouchee);
    assert.throws(trouverLaFacade, attendu, nom);
  };
  for (const [nom, avant, apres, attendu] of RETOUCHES) refusee(nom, PAGE_DU_GABARIT.replace(avant, apres), attendu);
  for (const [nom, touche, attendu] of RETRAITS) refusee(nom, PAGE_DU_GABARIT.replace(touche, ''), attendu);

  // La page telle que le gabarit l'écrit, elle, a toutes ses touches, chacune une fois.
  const page = installerUneFaussePage();
  page.racine.insertAdjacentHTML('beforeend', PAGE_DU_GABARIT);
  const { moments, vitesses, versos, poussoirs } = trouverLaFacade();
  assert.deepEqual(
    [moments.length, vitesses.length, versos.length, poussoirs.length],
    [MOMENTS.length, VITESSES.length, GENRES_DE_VERSO.length, POUSSOIRS.length],
  );
});

const MESURES: Mesures = {
  montage: 170.4,
  parImage: { sur: 90, moyenne: 2.34, auPire: 12.3 },
  entreDeuxImages: { sur: 89, moyenne: 16.72, auPire: 33.4 },
  bilan: { toiles: 9, pxDeToile: 9_310_000, svg: 7, reglables: 90 },
};

test('la page tient à jour ce que l’atelier a mesuré : chaque mesure à sa place, un temps court au dixième, un nombre et son unité jamais séparés', () => {
  const page = installerUneFaussePage();
  page.racine.insertAdjacentHTML('beforeend', PAGE_DU_GABARIT);
  const cases = (): string[] => MESURES_AFFICHEES.map((nom) => page.document.querySelector(`[${ANCRES.mesure}="${nom}"]`)?.textContent ?? '');
  assert.deepEqual(
    cases(),
    MESURES_AFFICHEES.map(() => LEGENDES.mesures.rienEncore),
    'tant que rien n’est mesuré',
  );
  ecrireLesMesures(MESURES);
  const M = LEGENDES.mesures;
  assert.deepEqual(cases().map(lisible), [
    remplir(M.ms, { valeur: '170' }),
    remplir(M.msAuPire, { valeur: '2,3', pire: '12', images: 90 }),
    remplir(M.msAuPire, { valeur: '17', pire: '33', images: 89 }),
    remplir(M.toilesPesees, { nombre: 9, mpx: '9,3' }),
  ]);
  // Un nombre et ce qu'il compte ne se séparent pas, ni un signe double de ce qui le précède : aucune espace ordinaire n'y est.
  const { unites, insecableAvant } = TEXTES.typographie;
  const echapper = (texte: string): string => texte.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  const coupable = new RegExp(`\\d (${unites.map(echapper).join('|')})(?![\\wÀ-ÿ])| [${echapper(insecableAvant)}]`, 'u');
  for (const ecrit of cases()) {
    assert.doesNotMatch(ecrit, coupable, ecrit);
    assert.ok(ecrit.includes(INSECABLE), ecrit);
  }
  // À l'ouverture, la scène n'a montré qu'une image avant de s'endormir : la page ne prétend pas en avoir mesuré quatre-vingt-dix,
  // et ne dit rien d'un temps entre deux images qu'elle n'a pas vu.
  ecrireLesMesures({ ...MESURES, parImage: { sur: 1, moyenne: 2.84, auPire: 2.84 }, entreDeuxImages: { sur: 0, moyenne: 0, auPire: 0 } });
  assert.deepEqual(cases().map(lisible).slice(1, 3), [remplir(M.msSurUneImage, { valeur: '2,8' }), M.rienEncore]);
});
