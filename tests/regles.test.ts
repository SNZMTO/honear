import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  avancementDeLExtrait,
  chiffreDuDecompte,
  DUREE_DU_DECOMPTE,
  finDeLExtrait,
  instantDuChiffre,
  jouer,
  phaseDeLaPiste,
  type ActionDePiste,
  type Piste,
  type Reponse,
} from '../src/regles/piste';
import { DEROULE } from '../src/ressources/reglages';

const LANCER: ActionDePiste = { genre: 'lancer', a: 100, duree: 20 };
const REPONSE: Reponse = { titre: 'Les Démons de minuit', artiste: 'Images', pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } };
const derouler = (...actions: ActionDePiste[]): Piste => {
  const piste = actions.reduce<Piste | undefined>(jouer, undefined);
  assert.ok(piste !== undefined);
  return piste;
};

test('une piste se lance par un décompte de trois secondes, un chiffre par seconde', () => {
  const piste = derouler(LANCER);
  assert.deepEqual(piste, { duree: 20, decompteA: 100 });
  assert.equal(DUREE_DU_DECOMPTE, 3);
  assert.deepEqual(
    [99.9, 100, 100.99, 101, 102, 102.999, 103, 110].map((t) => chiffreDuDecompte(piste, t)),
    [undefined, 3, 3, 2, 1, 1, undefined, undefined],
  );
  assert.deepEqual(
    [3, 2, 1, 0].map((chiffre) => instantDuChiffre(piste, chiffre)),
    [100, 101, 102, 103],
  );
});

test('l’extrait part à zéro si tous les appareils sont prêts à temps ; sinon il attend, et ne part jamais sans préavis', () => {
  const aTemps = derouler(LANCER, { genre: 'prets', a: 101.2 });
  assert.equal(aTemps.extraitA, 103);
  const juste = derouler(LANCER, { genre: 'prets', a: 103 - DEROULE.preavis });
  assert.equal(juste.extraitA, 103);
  const enRetard = derouler(LANCER, { genre: 'prets', a: 104.5 });
  assert.equal(enRetard.extraitA, 104.5 + DEROULE.preavis);
  // Tant que l'extrait n'a pas d'heure, la piste reste au décompte, même après zéro : le plateau tourne, le bras attend.
  const sansNouvelles = derouler(LANCER);
  assert.equal(phaseDeLaPiste(sansNouvelles, 140), 'decompte');
  assert.equal(finDeLExtrait(sansNouvelles), undefined);
  assert.equal(avancementDeLExtrait(sansNouvelles, 140), 0);
  // Le serveur ne se répète pas : une fois l'heure fixée, elle ne bouge plus.
  assert.equal(jouer(aTemps, { genre: 'prets', a: 120 }), aTemps);
});

test('le chrono va de 0 à 1 pendant l’extrait, à vitesse constante, et s’arrête à la révélation', () => {
  const piste = derouler(LANCER, { genre: 'prets', a: 101 });
  assert.equal(finDeLExtrait(piste), 123);
  assert.deepEqual(
    [100, 103, 108, 113, 123, 130].map((t) => avancementDeLExtrait(piste, t)),
    [0, 0, 0.25, 0.5, 1, 1],
  );
  assert.deepEqual(
    [102.9, 103, 122.9].map((t) => phaseDeLaPiste(piste, t)),
    ['decompte', 'extrait', 'extrait'],
  );
  const revelee = derouler(LANCER, { genre: 'prets', a: 101 }, { genre: 'reveler', a: 113, reponse: REPONSE });
  assert.deepEqual(
    [112.9, 113, 140].map((t) => phaseDeLaPiste(revelee, t)),
    ['extrait', 'revelation', 'revelation'],
  );
  assert.deepEqual(
    [110, 113, 140].map((t) => avancementDeLExtrait(revelee, t)),
    [0.35, 0.5, 0.5],
  );
  assert.deepEqual(revelee.revelation, { a: 113, reponse: REPONSE });
});

test('une action qui n’a pas de sens à ce moment ne change rien', () => {
  assert.equal(jouer(undefined, { genre: 'prets', a: 5 }), undefined);
  assert.equal(jouer(undefined, { genre: 'reveler', a: 5, reponse: REPONSE }), undefined);
  const auDecompte = derouler(LANCER);
  assert.equal(jouer(auDecompte, { genre: 'reveler', a: 104, reponse: REPONSE }), auDecompte, 'pas de révélation avant que l’extrait ait une heure');
  const enCours = derouler(LANCER, { genre: 'prets', a: 101 });
  assert.equal(jouer(enCours, { genre: 'reveler', a: 102, reponse: REPONSE }), enCours, 'ni avant qu’il soit parti');
  const revelee = derouler(LANCER, { genre: 'prets', a: 101 }, { genre: 'reveler', a: 123, reponse: REPONSE });
  assert.equal(jouer(revelee, { genre: 'reveler', a: 125, reponse: { ...REPONSE, titre: 'Autre' } }), revelee, 'ni deux fois');
  // Lancer une piste repart de zéro, quoi qu'il y ait eu avant.
  assert.deepEqual(jouer(revelee, { ...LANCER, a: 200, duree: 30 }), { duree: 30, decompteA: 200 });
});

test('les règles sont pures : la même action sur le même état rend le même état, et ne touche pas à l’ancien', () => {
  const avant = derouler(LANCER);
  const copie = structuredClone(avant);
  const apres = jouer(avant, { genre: 'prets', a: 101 });
  assert.deepEqual(avant, copie);
  assert.deepEqual(jouer(avant, { genre: 'prets', a: 101 }), apres);
  assert.notEqual(apres, avant);
});
