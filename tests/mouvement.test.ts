import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consigneDuRole, partitionDe, type Role } from '../src/mouvement/choregraphie';
import { descendre, tempsDeDescente, type Amortisseur } from '../src/mouvement/chute';
import { cible, creerLeMoteur, trajectoire, type Consigne, type Partition } from '../src/mouvement/moteur';
import { parcourir } from '../src/mouvement/parcours';
import { porter, tempsDArriveeDuPortage, tempsDePointeDuPortage } from '../src/mouvement/portage';
import {
  depassement,
  detendre,
  estCritique,
  pulsation,
  SEUIL_D_ARRIVEE,
  sommetDuSursaut,
  tauxDAmortissement,
  tempsDArrivee,
  tempsDeRetombee,
  type Elan,
  type Ressort,
} from '../src/mouvement/ressort';
import { entrainer, laisserFiler, tempsDeMiseEnVitesse, tempsPourRalentir, type Volant } from '../src/mouvement/volant';

const ressort = (w: number, z: number, masse = 1): Ressort => ({ raideur: masse * w * w, amortissement: 2 * z * masse * w, masse });
const SOUPLE = ressort(12, 0.5);
const CRITIQUE = ressort(12, 1);
const LOURD = ressort(12, 2.2, 3);
const LACHE: Elan = { ecart: 1, vitesse: 0 };

/** Le même ressort, avancé par tout petits pas d'Euler : la référence lente contre laquelle on juge la solution exacte. */
function parPetitsPas(r: Ressort, elan: Elan, duree: number): Elan {
  const pas = 1e-5;
  let { ecart, vitesse } = elan;
  for (let t = 0; t < duree; t += pas) {
    const acceleration = (-r.raideur * ecart - r.amortissement * vitesse) / r.masse;
    vitesse += acceleration * pas;
    ecart += vitesse * pas;
  }
  return { ecart, vitesse };
}

test('un ressort avance par sa solution exacte, qu’il dépasse sa place, qu’il soit critique ou qu’il traîne', () => {
  assert.ok(tauxDAmortissement(SOUPLE) < 1 && Math.abs(tauxDAmortissement(CRITIQUE) - 1) < 1e-12 && tauxDAmortissement(LOURD) > 1);
  assert.ok(Math.abs(pulsation(LOURD) - 12) < 1e-12, 'la masse ne change pas la pulsation quand la raideur la suit');
  for (const r of [SOUPLE, CRITIQUE, LOURD]) {
    for (const depart of [LACHE, { ecart: -3, vitesse: 40 }, { ecart: 0, vitesse: -25 }]) {
      for (const duree of [0.013, 0.2, 0.9]) {
        const exact = detendre(r, depart, duree);
        const lent = parPetitsPas(r, depart, duree);
        assert.ok(Math.abs(exact.ecart - lent.ecart) < 2e-3, `écart après ${duree} s : ${exact.ecart} contre ${lent.ecart}`);
        assert.ok(Math.abs(exact.vitesse - lent.vitesse) < 2e-2, `vitesse après ${duree} s : ${exact.vitesse} contre ${lent.vitesse}`);
      }
    }
  }
  assert.deepEqual(detendre(SOUPLE, LACHE, 0), LACHE);
});

test('le mouvement est le même à 60 et à 120 images par seconde, et par pas irréguliers', () => {
  const parPas = (r: Ressort, pas: readonly number[]): Elan => pas.reduce((elan, duree) => detendre(r, elan, duree), { ecart: 5, vitesse: -12 });
  for (const r of [SOUPLE, CRITIQUE, LOURD]) {
    const dUnCoup = detendre(r, { ecart: 5, vitesse: -12 }, 0.5);
    const a60 = parPas(
      r,
      Array.from({ length: 30 }, () => 1 / 60),
    );
    const a120 = parPas(
      r,
      Array.from({ length: 60 }, () => 1 / 120),
    );
    const irregulier = parPas(r, [0.07, 0.003, 0.2, 0.027, 0.2]);
    for (const autre of [a60, a120, irregulier]) {
      assert.ok(Math.abs(autre.ecart - dUnCoup.ecart) < 1e-9 && Math.abs(autre.vitesse - dUnCoup.vitesse) < 1e-9);
    }
  }
});

test('un ressort critique ne dépasse jamais sa place ; un ressort souple la dépasse une fois franchement, de ce qu’annonce son amortissement', () => {
  assert.equal(depassement(CRITIQUE), 0);
  assert.equal(depassement(LOURD), 0);
  let plusBas = 0;
  for (let t = 0; t < 3; t += 0.0005) {
    assert.ok(detendre(CRITIQUE, LACHE, t).ecart > -1e-12 && detendre(LOURD, LACHE, t).ecart > -1e-12);
    plusBas = Math.min(plusBas, detendre(SOUPLE, LACHE, t).ecart);
  }
  assert.ok(Math.abs(-plusBas - depassement(SOUPLE)) < 1e-4, `${-plusBas} contre ${depassement(SOUPLE)}`);
  // Le dépassement suivant, de l'autre côté, est le carré du premier : on ne le voit plus.
  assert.ok(depassement(ressort(30, 0.7)) < 0.05 && depassement(ressort(30, 0.7)) ** 2 < 0.003);
});

test('le temps d’arrivée d’un ressort se lit en secondes : après lui, l’écart reste sous le seuil, quel que soit le seuil', () => {
  for (const r of [SOUPLE, CRITIQUE, LOURD, ressort(60, 1), ressort(3.6, 0.9997, 3)]) {
    for (const seuil of [SEUIL_D_ARRIVEE, 0.01, 0.005, 0.001]) {
      const arrivee = tempsDArrivee(r, seuil);
      assert.ok(arrivee > 0);
      for (let t = arrivee; t < arrivee * 3; t += arrivee / 200)
        assert.ok(Math.abs(detendre(r, LACHE, t).ecart) <= seuil * (1 + 1e-6), `seuil ${seuil} : ${detendre(r, LACHE, t).ecart} à ${t} s`);
      // Et pas beaucoup plus tôt : juste avant, il en restait encore plus que le seuil.
      const avant = Math.max(...[0.9, 0.95, 0.99, 0.999].map((part) => Math.abs(detendre(r, LACHE, arrivee * part).ecart)));
      assert.ok(avant > seuil, `seuil ${seuil} : annoncé à ${arrivee} s, mais déjà à ${avant} avant`);
    }
  }
  assert.equal(SEUIL_D_ARRIVEE, 0.02);
  assert.equal(tempsDArrivee(CRITIQUE), tempsDArrivee(CRITIQUE, SEUIL_D_ARRIVEE), 'sans rien dire, c’est le seuil d’arrivée');
  // Un ressort sans raideur, sans amortissement ou sans masse n'arrive jamais : on le dit, plutôt que de le chercher sans fin.
  for (const faux of [
    { ...CRITIQUE, raideur: 0 },
    { ...CRITIQUE, amortissement: 0 },
    { ...CRITIQUE, masse: 0 },
    { ...CRITIQUE, raideur: NaN },
  ]) {
    assert.throws(() => tempsDArrivee(faux), /raideur, un amortissement et une masse positifs/);
    assert.throws(() => sommetDuSursaut(faux), /positifs/);
    assert.throws(() => tempsDeRetombee(faux), /positifs/);
  }
  // Un ressort critique arrive à 2 % en 5,83 fois l'inverse de sa pulsation.
  assert.ok(Math.abs(tempsDArrivee(ressort(10, 1)) - 0.583) < 0.003);
});

test('un ressort réglé au plus juste est tenu pour critique, à l’arrondi de la table près', () => {
  assert.ok(estCritique(CRITIQUE) && estCritique(ressort(12, 1.0009)) && estCritique(ressort(12, 0.9991)));
  assert.ok(!estCritique(SOUPLE) && !estCritique(LOURD) && !estCritique(ressort(12, 1.002)) && !estCritique(ressort(12, 0.998)));
});

test('un coup fait sursauter une pièce d’autant que sa vitesse, puis elle retombe : son sommet et sa retombée se lisent d’avance', () => {
  const COUP: Elan = { ecart: 0, vitesse: 1 };
  for (const r of [SOUPLE, CRITIQUE, LOURD, ressort(40, 0.5)]) {
    const sommet = sommetDuSursaut(r);
    // Le sommet annoncé est bien le plus grand écart qu'un coup d'une unité de vitesse lui donne.
    let vu = 0;
    for (let t = 0; t < 2; t += 0.0001) vu = Math.max(vu, Math.abs(detendre(r, COUP, t).ecart));
    assert.ok(Math.abs(sommet - vu) < 1e-5 * vu, `${sommet} contre ${vu}`);
    // Deux fois plus fort, le coup la fait sursauter deux fois plus haut.
    let double = 0;
    for (let t = 0; t < 2; t += 0.0001) double = Math.max(double, Math.abs(detendre(r, { ecart: 0, vitesse: 2 }, t).ecart));
    assert.ok(Math.abs(double - 2 * vu) < 1e-12);
    // Retombée : il ne lui reste plus que 2 % de son sommet, et moins ensuite ; juste avant, il en restait plus.
    const retombee = tempsDeRetombee(r);
    for (let t = retombee; t < retombee * 3; t += retombee / 200)
      assert.ok(Math.abs(detendre(r, COUP, t).ecart) <= SEUIL_D_ARRIVEE * sommet * (1 + 1e-6), `à ${t} s`);
    assert.ok(Math.max(...[0.9, 0.95, 0.99, 0.999].map((part) => Math.abs(detendre(r, COUP, retombee * part).ecart))) > SEUIL_D_ARRIVEE * sommet);
  }
  // Un ressort critique sursaute au plus haut après l'inverse de sa pulsation : de la vitesse reçue, divisée par e fois sa pulsation.
  assert.ok(Math.abs(sommetDuSursaut(CRITIQUE) - 1 / (12 * Math.E)) < 1e-9);
  // Un coup ne retombe pas dans le temps d'un ressort lâché : la pièce doit d'abord monter.
  assert.ok(tempsDeRetombee(ressort(40, 0.5)) > tempsDArrivee(ressort(40, 0.5)) + 0.02);
});

const PLATEAU: Volant = { croisiere: 200, moteur: { couple: 162, accrochage: 0.12 }, frottement: { sec: 43.1, visqueux: 0.75 } };

test('un volant prend sa vitesse sans jamais la dépasser, et l’angle qu’il parcourt est bien celui de sa vitesse', () => {
  let avant = entrainer(PLATEAU, 0, 0);
  let angle = 0;
  const pas = 0.0005;
  for (let t = pas; t < 3; t += pas) {
    const ici = entrainer(PLATEAU, 0, t);
    assert.ok(ici.vitesse >= avant.vitesse - 1e-9 && ici.vitesse <= PLATEAU.croisiere + 1e-9, `à ${t} s`);
    angle += ((ici.vitesse + avant.vitesse) / 2) * pas;
    avant = ici;
  }
  assert.ok(Math.abs(angle - avant.angle) < 0.01, `${angle} contre ${avant.angle}`);
  // Aucun à-coup au passage du plein couple à l'accrochage : la vitesse et l'accélération s'y raccordent.
  const seuil = (PLATEAU.croisiere - PLATEAU.moteur.couple * PLATEAU.moteur.accrochage) / PLATEAU.moteur.couple;
  const pente = (t: number): number => (entrainer(PLATEAU, 0, t + 1e-5).vitesse - entrainer(PLATEAU, 0, t - 1e-5).vitesse) / 2e-5;
  assert.ok(Math.abs(pente(seuil - 0.001) - pente(seuil + 0.001)) < 2);
  assert.ok(Math.abs(entrainer(PLATEAU, 0, tempsDeMiseEnVitesse(PLATEAU, 0.99)).vitesse - 198) < 1e-6);
});

test('un volant relancé en route repart de sa vitesse du moment : entraîner deux fois de suite, c’est entraîner une fois', () => {
  for (const coupure of [0.3, 1.1, 1.3]) {
    const premier = entrainer(PLATEAU, 0, coupure);
    const second = entrainer(PLATEAU, premier.vitesse, 0.8);
    const dUnTrait = entrainer(PLATEAU, 0, coupure + 0.8);
    assert.ok(Math.abs(second.vitesse - dUnTrait.vitesse) < 1e-9 && Math.abs(premier.angle + second.angle - dUnTrait.angle) < 1e-9);
  }
});

test('moteur coupé, le frottement use la vitesse puis arrête le volant pour de bon : il ne repart jamais en arrière', () => {
  const arret = tempsPourRalentir(PLATEAU, PLATEAU.croisiere);
  assert.ok(Math.abs(arret - 2) < 0.01, `le plateau perd sa vitesse en ${arret.toFixed(3)} s`);
  let avant = laisserFiler(PLATEAU, 200, 0);
  for (let t = 0.001; t < 3; t += 0.001) {
    const ici = laisserFiler(PLATEAU, 200, t);
    assert.ok(ici.vitesse <= avant.vitesse + 1e-9 && ici.vitesse >= 0 && ici.angle >= avant.angle - 1e-9);
    avant = ici;
  }
  assert.deepEqual(laisserFiler(PLATEAU, 200, 5), laisserFiler(PLATEAU, 200, arret), 'une fois arrêté, il ne bouge plus');
  assert.ok(laisserFiler(PLATEAU, 200, arret).vitesse < 1e-9);
  // Deux temps de suite valent un seul : on peut reprendre le calcul de n'importe où.
  const mi = laisserFiler(PLATEAU, 200, 0.7);
  const fin = laisserFiler(PLATEAU, mi.vitesse, 0.6);
  assert.ok(Math.abs(mi.angle + fin.angle - laisserFiler(PLATEAU, 200, 1.3).angle) < 1e-9);
  assert.ok(Math.abs(tempsPourRalentir(PLATEAU, 200, 60) + tempsPourRalentir(PLATEAU, 60) - arret) < 1e-9);
});

type Nom = 'bras' | 'disque';
const MATIERE = ressort(20, 0.6);
/**
 * Ce que le moteur tolère, dans ces tests : de l'horloge, un trou d'une seconde, un recul d'un dixième ; et aucun repos,
 * pour juger ses ressorts au milliardième près. Le repos a son test.
 */
const TOLERANCES = { trou: 1, recul: 0.1, repos: { ecart: 0, vitesse: 0 } };
const consignes =
  (bras: Consigne, disque: Consigne = cible(0, CRITIQUE)) =>
  (): Record<Nom, Consigne> => ({ bras, disque });

test('le moteur ramène une grandeur sur sa cible, et repart de sa position et de sa vitesse du moment quand la cible change', () => {
  const partition: Partition<Nom> = {
    instants: [1, 1.2],
    coups: [],
    consignes: (t) => ({
      bras: t < 1 ? cible(100, MATIERE) : t < 1.2 ? cible(140, MATIERE) : cible(100, MATIERE),
      disque: cible(0, CRITIQUE),
    }),
  };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  moteur.poser(partition, 0);
  assert.equal(moteur.valeur('bras'), 100);
  let [avant, vitesseAvant] = [100, 0];
  for (let t = 0.004; t <= 3; t += 0.004) {
    moteur.avancer(partition, t);
    // Ni la position ni la vitesse ne sautent, même aux deux changements de cible : le chemin fait est celui de la vitesse.
    const chemin = ((moteur.vitesse('bras') + vitesseAvant) / 2) * 0.004;
    assert.ok(Math.abs(moteur.valeur('bras') - avant - chemin) < 0.05, `saut de position à ${t.toFixed(3)} s`);
    assert.ok(Math.abs(moteur.vitesse('bras') - vitesseAvant) < 70, `saut de vitesse à ${t.toFixed(3)} s`);
    [avant, vitesseAvant] = [moteur.valeur('bras'), moteur.vitesse('bras')];
  }
  assert.ok(Math.abs(moteur.valeur('bras') - 100) < 0.01 && Math.abs(moteur.vitesse('bras')) < 0.01);
});

test('une grandeur presque arrivée s’arrête net : sous le seuil du repos, elle est exactement à sa place, jusqu’au prochain coup', () => {
  const REPOS = { ecart: 1e-3, vitesse: 1e-2 };
  const partition: Partition<Nom> = {
    instants: [1],
    coups: [{ a: 6, grandeur: 'bras', vitesse: 30 }],
    consignes: (t) => ({ bras: t < 1 ? cible(0, MATIERE) : cible(100, MATIERE), disque: cible(0, CRITIQUE) }),
  };
  const [moteur, sansRepos] = [creerLeMoteur<Nom>({ ...TOLERANCES, repos: REPOS }), creerLeMoteur<Nom>(TOLERANCES)];
  moteur.poser(partition, 0);
  sansRepos.poser(partition, 0);
  let arrivee: number | undefined;
  for (let t = 1 / 60; t <= 5.99; t += 1 / 60) {
    moteur.avancer(partition, t);
    sansRepos.avancer(partition, t);
    // Le repos ne change rien qui se voie : jamais plus que son seuil d'écart avec le ressort laissé à lui-même.
    assert.ok(Math.abs(moteur.valeur('bras') - sansRepos.valeur('bras')) <= REPOS.ecart, `à ${t.toFixed(3)} s`);
    if (arrivee === undefined && t > 1 && moteur.ecart('bras') === 0) arrivee = t;
    // Une fois arrêtée, elle ne repart pas d'elle-même.
    if (arrivee !== undefined) assert.deepEqual([moteur.valeur('bras'), moteur.vitesse('bras'), moteur.ecart('bras')], [100, 0, 0]);
  }
  assert.ok(arrivee !== undefined && arrivee > 1.3 && arrivee < 3, `arrêtée à ${arrivee} s`);
  assert.notEqual(sansRepos.ecart('bras'), 0, 'un ressort seul n’arrive jamais tout à fait');
  // Un coup la réveille : elle sursaute, puis s'arrête de nouveau.
  moteur.avancer(partition, 6.05);
  assert.ok(Math.abs(moteur.ecart('bras')) > 0.5 && moteur.vitesse('bras') !== 0);
  for (let t = 6.1; t <= 10; t += 1 / 60) moteur.avancer(partition, t);
  assert.deepEqual([moteur.valeur('bras'), moteur.vitesse('bras')], [100, 0]);
  // Ce qui suit une consigne qui bouge s'arrête sur elle, et la suit alors exactement.
  const course: Partition<Nom> = {
    instants: [],
    coups: [],
    consignes: consignes(
      trajectoire(
        (t) => 100 + 4 * t,
        MATIERE,
        () => 4,
      ),
    ),
  };
  for (let t = 10; t <= 14; t += 1 / 60) moteur.avancer(course, t);
  assert.equal(moteur.ecart('bras'), 0);
  assert.equal(moteur.valeur('bras'), 100 + 4 * moteur.instant!);
  assert.equal(moteur.vitesse('bras'), 4);
});

test('le moteur donne le même mouvement quel que soit le rythme des images : il s’arrête à chaque instant de la partition', () => {
  const partition: Partition<Nom> = {
    instants: [0.1037, 0.25, 0.26],
    coups: [{ a: 0.31, grandeur: 'bras', vitesse: -90 }],
    consignes: (t) => ({
      bras: t < 0.1037 ? cible(0, MATIERE) : t < 0.25 ? cible(30, MATIERE) : t < 0.26 ? cible(-10, SOUPLE) : cible(12, MATIERE),
      disque: t < 0.25 ? cible(0, CRITIQUE) : cible(40, LOURD),
    }),
  };
  const jouer = (pas: readonly number[]): [number, number, number] => {
    const moteur = creerLeMoteur<Nom>(TOLERANCES);
    moteur.poser(partition, 0);
    let t = 0;
    for (const duree of pas) moteur.avancer(partition, (t += duree));
    return [moteur.valeur('bras'), moteur.vitesse('bras'), moteur.valeur('disque')];
  };
  const a60 = jouer(Array.from({ length: 36 }, () => 1 / 60));
  const a120 = jouer(Array.from({ length: 72 }, () => 1 / 120));
  const a30 = jouer(Array.from({ length: 18 }, () => 1 / 30));
  const irregulier = jouer([0.05, 0.11, 0.004, 0.19, 0.046, 0.2]);
  for (const autre of [a120, a30, irregulier]) {
    for (const i of [0, 1, 2] as const) assert.ok(Math.abs(autre[i] - a60[i]) < 1e-9, `${autre[i]} contre ${a60[i]}`);
  }
});

test('une grandeur rattrape une consigne qui bouge, puis la suit sans traîner', () => {
  // Le bras-chrono : il avance à vitesse constante. On le lâche à 8 degrés de sa course.
  const chrono: Consigne = { position: (t) => 100 + 4 * t, vitesse: () => 4, matiere: CRITIQUE };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  const depart: Partition<Nom> = { instants: [], coups: [], consignes: consignes(cible(92, CRITIQUE)) };
  const course: Partition<Nom> = { instants: [], coups: [], consignes: consignes(chrono) };
  moteur.poser(depart, 0);
  moteur.avancer(course, 0);
  assert.equal(moteur.valeur('bras'), 92, 'au changement de consigne, il est encore où il était');
  moteur.avancer(course, 1);
  assert.ok(Math.abs(moteur.valeur('bras') - 104) < 0.01 && Math.abs(moteur.vitesse('bras') - 4) < 0.01, 'une seconde plus tard, il suit sa course');
});

test('un coup change la vitesse d’un coup, pas la position ; et le ressort le résorbe', () => {
  const partition: Partition<Nom> = {
    instants: [],
    coups: [{ a: 0.5, grandeur: 'bras', vitesse: 60 }],
    consignes: consignes(cible(0, MATIERE)),
  };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  moteur.poser(partition, 0);
  moteur.avancer(partition, 0.5);
  assert.equal(moteur.valeur('bras'), 0);
  assert.equal(moteur.vitesse('bras'), 60);
  let sommet = 0;
  for (let t = 0.501; t < 2; t += 0.001) {
    moteur.avancer(partition, t);
    sommet = Math.max(sommet, moteur.valeur('bras'));
  }
  assert.ok(sommet > 1 && sommet < 3, `le coup soulève de ${sommet.toFixed(2)}`);
  assert.ok(Math.abs(moteur.valeur('bras')) < 1e-3);
});

test('après un trou de plus d’une seconde, ou si l’horloge recule, le moteur pose les grandeurs au lieu de rejouer ce qu’il a manqué', () => {
  const partition: Partition<Nom> = {
    instants: [1],
    coups: [],
    consignes: (t) => ({ bras: t < 1 ? cible(0, MATIERE) : cible(50, MATIERE), disque: cible(0, CRITIQUE) }),
  };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  assert.equal(moteur.instant, undefined);
  assert.throws(() => moteur.valeur('bras'), /poser/);
  moteur.avancer(partition, 0.9);
  assert.deepEqual([moteur.valeur('bras'), moteur.instant], [0, 0.9], 'la première avancée pose');
  moteur.avancer(partition, 1.01);
  assert.ok(moteur.valeur('bras') > 0 && moteur.valeur('bras') < 5, 'il vient de partir');
  moteur.avancer(partition, 3.5);
  assert.deepEqual([moteur.valeur('bras'), moteur.vitesse('bras')], [50, 0], 'un onglet qui revient se recale sur l’horloge');
  moteur.avancer(partition, 0.2);
  assert.equal(moteur.valeur('bras'), 0, 'et une horloge qu’on remet en arrière aussi');
});

test('une horloge qui hésite, recalée d’un rien en arrière, ne repose rien : le moteur l’attend, puis repart d’où il en était', () => {
  const partition: Partition<Nom> = {
    instants: [1],
    coups: [],
    consignes: (t) => ({ bras: t < 1 ? cible(0, MATIERE) : cible(50, MATIERE), disque: cible(0, CRITIQUE) }),
  };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  moteur.poser(partition, 0.9);
  assert.equal(moteur.avancer(partition, 1.06), 1.06, 'il dit où il en est : là où on l’a amené');
  const [valeur, vitesse] = [moteur.valeur('bras'), moteur.vitesse('bras')];
  assert.ok(valeur > 1 && valeur < 40 && vitesse > 100, 'il est en plein mouvement');
  // L'horloge recule de 30 ms : rien ne bouge, ni en arrière, ni d'un coup jusqu'à sa cible. Il dit qu'il en est resté où il était :
  // ce qui se lit hors de lui (un chiffre, une face d'étiquette) se lit à cet instant-là, pas à celui d'une horloge qui hésite.
  assert.equal(moteur.avancer(partition, 1.03), 1.06);
  assert.deepEqual([moteur.valeur('bras'), moteur.vitesse('bras'), moteur.instant], [valeur, vitesse, 1.06]);
  // Elle repart : le mouvement reprend sans qu'il y paraisse.
  const temoin = creerLeMoteur<Nom>(TOLERANCES);
  temoin.poser(partition, 0.9);
  temoin.avancer(partition, 1.2);
  moteur.avancer(partition, 1.2);
  assert.ok(Math.abs(moteur.valeur('bras') - temoin.valeur('bras')) < 1e-9);
  // Au-delà de ce qu'il tolère, c'est qu'on a remis la piste en arrière : tout est reposé.
  moteur.avancer(partition, 1.2 - TOLERANCES.recul - 0.01);
  assert.deepEqual([moteur.valeur('bras'), moteur.vitesse('bras')], [50, 0]);
});

test('quand la partition change, chaque grandeur passe à sa nouvelle consigne là où elle est, même si rien d’autre ne les distingue', () => {
  // La même course, écrite deux fois : la seconde sait qu'elle s'arrête à 1 s. C'est une piste dont on apprend la fin en route.
  const course = (t: number): number => 100 + 40 * t;
  const sansFin: Partition<Nom> = { instants: [], coups: [], consignes: consignes(trajectoire(course, CRITIQUE)) };
  const arrivee = cible(course(1), CRITIQUE);
  const enCourse = trajectoire(course, CRITIQUE);
  const avecFin: Partition<Nom> = {
    instants: [1],
    coups: [],
    consignes: (t) => ({ bras: t < 1 ? enCourse : arrivee, disque: cible(0, CRITIQUE) }),
  };
  const moteur = creerLeMoteur<Nom>(TOLERANCES);
  moteur.poser(sansFin, 0);
  let avant = moteur.valeur('bras');
  for (let i = 1; i <= 180; i++) {
    const t = i / 60;
    // On apprend la fin à 0,8 s : à partir de là, c'est l'autre partition qu'on suit.
    moteur.avancer(t < 0.8 ? sansFin : avecFin, t);
    assert.ok(Math.abs(moteur.valeur('bras') - avant) < 1, `le bras saute à ${t.toFixed(3)} s`);
    avant = moteur.valeur('bras');
  }
  assert.ok(Math.abs(moteur.valeur('bras') - course(1)) < 1e-3, `il s'est arrêté où la course finit : ${moteur.valeur('bras')}`);
  assert.ok(Math.abs(moteur.vitesse('bras')) < 1e-3);
  // Et si la nouvelle partition contredit ce qu'il a déjà fait, il s'y rend d'où il est, sans rien rejouer ni sauter.
  const ailleurs: Partition<Nom> = { instants: [0.1], coups: [], consignes: consignes(cible(0, CRITIQUE)) };
  moteur.avancer(ailleurs, 3 + 1 / 60);
  const parti = course(1) - moteur.valeur('bras');
  assert.ok(parti > 0.5 && parti < 4, `il part de là où il était : ${parti}`);
  moteur.avancer(ailleurs, 3.9);
  assert.ok(Math.abs(moteur.valeur('bras')) < 0.1);
});

test('une chorégraphie s’écrit par étapes : la partition en donne les consignes mêmes, et s’arrête à chacune', () => {
  const [repos, bord, retour] = [cible(100, MATIERE), cible(140, MATIERE), cible(100, SOUPLE)];
  const roles: Record<Nom, Role> = {
    bras: {
      depart: repos,
      etapes: [
        { a: 1, consigne: bord },
        { a: 2.5, consigne: retour },
        { a: Infinity, consigne: cible(0, MATIERE) },
      ],
    },
    disque: { depart: cible(0, CRITIQUE), etapes: [{ a: 1, consigne: cible(40, LOURD) }] },
  };
  assert.equal(consigneDuRole(roles.bras, 0.99), repos);
  assert.equal(consigneDuRole(roles.bras, 1), bord, 'une étape commence à son instant même');
  assert.equal(consigneDuRole(roles.bras, 2.49), bord);
  assert.equal(consigneDuRole(roles.bras, 1e9), retour, 'une étape dont on ne connaît pas l’heure n’arrive jamais');
  const partition = partitionDe<Nom>(roles, [
    { a: 1.2, grandeur: 'bras', vitesse: 30 },
    { a: Infinity, grandeur: 'bras', vitesse: 30 },
  ]);
  assert.deepEqual(partition.instants, [1, 2.5], 'ses instants : ceux de ses étapes, une fois chacun, dans l’ordre');
  assert.deepEqual(partition.coups, [{ a: 1.2, grandeur: 'bras', vitesse: 30 }]);
  // Les consignes rendues sont celles des étapes, pas des copies : c'est à cela que le moteur voit ce qui a changé.
  assert.equal(partition.consignes(1.7).bras, bord);
  assert.equal(partition.consignes(1.7).bras, partition.consignes(2).bras);
  // Et le moteur la suit comme une autre : même mouvement à 60 et à 144 images par seconde.
  const jouer = (parSeconde: number): number[] => {
    const moteur = creerLeMoteur<Nom>(TOLERANCES);
    moteur.poser(partition, 0);
    for (let i = 1; i <= 3 * parSeconde; i++) moteur.avancer(partition, i / parSeconde);
    return [moteur.valeur('bras'), moteur.vitesse('bras'), moteur.valeur('disque')];
  };
  const [a60, a144] = [jouer(60), jouer(144)];
  a60.forEach((valeur, i) => assert.ok(Math.abs(valeur - (a144[i] ?? NaN)) < 1e-9, `${valeur} contre ${a144[i]}`));
});

test('une trajectoire mesure sa vitesse sur elle-même, si on ne la lui donne pas', () => {
  const mesuree = trajectoire((t) => 3 * t * t, CRITIQUE);
  assert.ok(Math.abs(mesuree.vitesse(2) - 12) < 1e-6);
  assert.equal(
    trajectoire(
      (t) => 3 * t * t,
      CRITIQUE,
      (t) => 6 * t,
    ).vitesse(2),
    12,
  );
});

test('un parcours somme une vitesse une fois pour toutes : on le lit à n’importe quel instant, sans rien rejouer', () => {
  // Une vitesse dont on connaît le chemin : le sinus, et sa somme.
  const chemin = parcourir(Math.sin, 0.3, 4.1, 0.02);
  const attendu = (t: number): number => Math.cos(0.3) - Math.cos(t);
  for (const t of [0.3, 0.31, 0.777, 1, 2.5, 3.33333, 4.09, 4.1])
    assert.ok(Math.abs(chemin(t) - attendu(t)) < 1e-8, `à ${t} s : ${chemin(t)} contre ${attendu(t)}`);
  assert.equal(chemin(0), 0, 'rien avant le départ');
  assert.equal(chemin(9), chemin(4.1), 'tout après l’arrivée');
  // Le lire dans le désordre ou deux fois donne la même chose : il ne garde aucun état.
  const aLaSuite = [0.5, 2.5, 4].map(parcourir(Math.sin, 0.3, 4.1, 0.02));
  const dansLeDesordre = [4, 2.5, 0.5, 2.5].map(chemin);
  assert.deepEqual(dansLeDesordre, [aLaSuite[2], aLaSuite[1], aLaSuite[0], aLaSuite[1]]);
  // Il passe d'une tranche à la suivante sans à-coup : ni sa valeur ni sa pente ne sautent.
  for (let t = 0.31; t < 4.09; t += 0.0137) {
    const pente = (chemin(t + 1e-5) - chemin(t - 1e-5)) / 2e-5;
    assert.ok(Math.abs(pente - Math.sin(t)) < 1e-5, `pente à ${t.toFixed(4)} s : ${pente}`);
  }
  assert.equal(parcourir(Math.sin, 2, 2, 0.02)(5), 0, 'un parcours sans durée ne mène nulle part');
});

test('une chute freinée part sans à-coup, prend sa vitesse et la garde ; son temps de descente se retrouve à l’envers', () => {
  const amortisseur: Amortisseur = { vitesse: 12, elan: 0.2 };
  assert.deepEqual(descendre(amortisseur, 0), { chemin: 0, vitesse: 0 });
  assert.deepEqual(descendre(amortisseur, -1), { chemin: 0, vitesse: 0 }, 'avant de partir, elle n’a pas bougé');
  // Elle ne fait qu'accélérer vers sa vitesse d'équilibre, sans jamais la dépasser.
  let avant = descendre(amortisseur, 0);
  for (let t = 0.01; t <= 3; t += 0.01) {
    const ici = descendre(amortisseur, t);
    assert.ok(ici.vitesse > avant.vitesse && ici.vitesse < amortisseur.vitesse && ici.chemin > avant.chemin);
    // Le chemin est bien la somme de la vitesse.
    assert.ok(Math.abs(ici.chemin - avant.chemin - ((ici.vitesse + avant.vitesse) / 2) * 0.01) < 1e-4);
    avant = ici;
  }
  assert.ok(Math.abs(descendre(amortisseur, 3).vitesse - amortisseur.vitesse) < 1e-4, 'au bout de quinze fois son élan, elle a sa vitesse');
  for (const hauteur of [0.5, 7, 40]) {
    const duree = tempsDeDescente(amortisseur, hauteur);
    assert.ok(Math.abs(descendre(amortisseur, duree).chemin - hauteur) < 1e-9, `descendre de ${hauteur} prend ${duree} s`);
  }
  assert.equal(tempsDeDescente(amortisseur, 0), 0);
});

/** Une pièce portée, avancée par tout petits pas : la main va vers sa place par un ressort, la pièce suit la main par le sien. */
function porteeParPetitsPas(main: Ressort, suit: Ressort, de: number, duree: number): { position: number; vitesse: number } {
  const pas = 1e-5;
  let [m, vm, p, vp] = [0, 0, 0, 0];
  for (let t = 0; t < duree; t += pas) {
    vm += ((-main.raideur * (m - de) - main.amortissement * vm) / main.masse) * pas;
    m += vm * pas;
    vp += ((-suit.raideur * (p - m) - suit.amortissement * vp) / suit.masse) * pas;
    p += vp * pas;
  }
  return { position: p, vitesse: vp };
}

test('une pièce portée suit la main qui la mène : elle part sans à-coup, arrive sans dépasser, et sa formule est celle de deux ressorts à la suite', () => {
  const [main, suit] = [ressort(28, 1), ressort(30, 1, 3)];
  const portage = porter(100, [{ a: 2, de: 350, main }], suit);
  // Avant le départ, elle est à sa place ; longtemps après, à la suivante.
  assert.equal(portage.position(1.9), 100);
  assert.equal(portage.vitesse(2), 0);
  assert.ok(Math.abs(portage.position(4) - 450) < 1e-6 && Math.abs(portage.vitesse(4)) < 1e-6);
  // La formule est exacte : la même pièce, avancée par petits pas, est au même endroit, à la même vitesse.
  for (const duree of [0.01, 0.05, 0.12, 0.3, 0.7]) {
    const exact = { position: portage.position(2 + duree) - 100, vitesse: portage.vitesse(2 + duree) };
    const lent = porteeParPetitsPas(main, suit, 350, duree);
    // Les petits pas traînent d'un rien derrière la formule, d'autant plus que la pièce va vite : un quart de px sur 350.
    assert.ok(Math.abs(exact.position - lent.position) < 0.25, `position après ${duree} s : ${exact.position} contre ${lent.position}`);
    assert.ok(Math.abs(exact.vitesse - lent.vitesse) < 2, `vitesse après ${duree} s : ${exact.vitesse} contre ${lent.vitesse}`);
  }
  // Elle part sans à-coup : un ressort qu'on lâche a déjà fait 4 % du chemin en un soixantième de seconde ; elle, vingt fois moins.
  const lache = 1 - detendre(ressort(19, 1), LACHE, 1 / 60).ecart;
  const partie = (portage.position(2 + 1 / 60) - 100) / 350;
  assert.ok(lache > 0.035 && partie < lache / 15, `en une image : ${(100 * partie).toFixed(2)} % du chemin, contre ${(100 * lache).toFixed(1)} %`);
  // Sa vitesse monte, passe par une pointe, puis retombe : elle n'avance que vers sa place, sans jamais la dépasser.
  let [avant, pointe, quand] = [100, 0, 0];
  for (let t = 2; t <= 3.5; t += 1 / 480) {
    const [ici, v] = [portage.position(t), portage.vitesse(t)];
    assert.ok(ici >= avant - 1e-9 && ici <= 450 + 1e-9 && v >= -1e-9, `à ${t.toFixed(3)} s : ${ici}`);
    if (v > pointe) [pointe, quand] = [v, t - 2];
    avant = ici;
  }
  const temps = { arrivee: tempsDArriveeDuPortage(main, suit), pointe: tempsDePointeDuPortage(main, suit) };
  assert.ok(Math.abs(quand - temps.pointe) < 0.004, `pointe à ${quand} s, annoncée à ${temps.pointe} s`);
  assert.ok(temps.pointe > 0.08 && temps.pointe < temps.arrivee / 2, 'elle met près d’un dixième de seconde à prendre sa vitesse');
  // Arrivée : il ne lui reste plus que 2 % du chemin, et moins ensuite.
  assert.ok(Math.abs((450 - portage.position(2 + temps.arrivee)) / 350 - 0.02) < 1e-6);
  assert.ok(450 - portage.position(2 + temps.arrivee + 0.05) < 0.02 * 350);
  // À un autre seuil, c'est l'instant où il lui reste cette part du chemin : celui où une pièce qui vise plus loin passe par sa place.
  for (const seuil of [0.2, 0.027, 0.001])
    assert.ok(Math.abs((450 - portage.position(2 + tempsDArriveeDuPortage(main, suit, seuil))) / 350 - seuil) < 1e-9, `seuil ${seuil}`);
});

test('les trajets d’une pièce portée s’ajoutent : repartie avant d’être arrivée, elle finit le premier tout en prenant le second, sans s’arrêter', () => {
  const [tire, emporte, suit] = [ressort(28, 1), ressort(24, 1), ressort(30, 1, 3)];
  const deux = porter(
    0,
    [
      { a: 0, de: -350, main: tire },
      { a: 0.3, de: 120, main: emporte },
    ],
    suit,
  );
  const [premier, second] = [porter(0, [{ a: 0, de: -350, main: tire }], suit), porter(0, [{ a: 0.3, de: 120, main: emporte }], suit)];
  for (const t of [0.1, 0.3, 0.35, 0.5, 0.9, 3]) {
    assert.ok(Math.abs(deux.position(t) - (premier.position(t) + second.position(t))) < 1e-9, `à ${t} s`);
    assert.ok(Math.abs(deux.vitesse(t) - (premier.vitesse(t) + second.vitesse(t))) < 1e-9, `à ${t} s`);
  }
  assert.ok(Math.abs(deux.position(3) + 230) < 1e-6);
  // Au second départ, rien ne saute : ni la place, ni la vitesse.
  assert.ok(Math.abs(deux.position(0.3 + 1e-7) - deux.position(0.3 - 1e-7)) < 1e-3);
  assert.ok(Math.abs(deux.vitesse(0.3 + 1e-7) - deux.vitesse(0.3 - 1e-7)) < 1e-2);
  // La vitesse est bien celle de la position.
  for (const t of [0.07, 0.31, 0.6]) {
    const mesuree = (deux.position(t + 1e-5) - deux.position(t - 1e-5)) / 2e-5;
    assert.ok(Math.abs(mesuree - deux.vitesse(t)) < 0.05, `à ${t} s : ${mesuree} contre ${deux.vitesse(t)}`);
  }
  // Deux ressorts de même pulsation, ou presque : la formule ne perd pas pied.
  const [egaux, voisins] = [porter(0, [{ a: 0, de: 1, main: ressort(30, 1) }], suit), porter(0, [{ a: 0, de: 1, main: ressort(30.06, 1) }], suit)];
  for (const t of [0.02, 0.1, 0.3]) assert.ok(Math.abs(egaux.position(t) - voisins.position(t)) < 1e-3, `à ${t} s`);
  // Une main ne dépasse pas, et ne traîne pas : un ressort qui n'est pas amorti au plus juste est refusé.
  assert.throws(() => porter(0, [{ a: 0, de: 1, main: SOUPLE }], suit), /amortis au plus juste/);
  assert.throws(() => porter(0, [], LOURD), /amortis au plus juste/);
});
