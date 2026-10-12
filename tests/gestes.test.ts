/** Les gestes de l'étape 5 : la tablée et le meuble, tenus aux temps et aux ampleurs du brief. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { glisser } from '../src/mouvement/glissade';
import { GESTES, MATIERES, TOUCHES } from '../src/ressources/mouvement';
import { PASTILLES } from '../src/ressources/pastilles';
import { TABLEE } from '../src/ressources/tablee';
import { CRANS_DU_VOLUME } from '../src/scene/ampli';
import { aLInstant, type Geste } from '../src/scene/gestes/geste';
import { allumerLAmpli, deCranEnCran, dureeDuRegard, regardQuiGlisse, sortirUnePlaylist, volumeAuDoigt } from '../src/scene/gestes/meuble';
import {
  arriveeDUnePochette,
  bonneReponse,
  CLAQUE,
  finale,
  hitParade,
  presque,
  quatreEtiquettes,
  seRetourne,
  vraiePochette,
} from '../src/scene/gestes/tablee';
import { placesEnEventail } from '../src/scene/tablee';

const T = TABLEE.telephone;
const LARGEUR = 390;
/** Les valeurs d'un geste, de pas en pas, entre deux instants. */
const suivre = <N extends string>(geste: Geste<N>, de: number, a: number, pas = 1 / 200): Readonly<Record<N, number>>[] =>
  Array.from({ length: Math.round((a - de) / pas) + 1 }, (_, i) => aLInstant(geste, de + i * pas));
const proche = (x: number, y: number, ecart = 0.02): boolean => Math.abs(x - y) <= ecart;

test('une glissade perd sa vitesse à un rythme constant et s’arrête net : le carton lancé de 200 px s’arrête en 600 ms', () => {
  const g = glisser(GESTES.arrivee.frottement, 200);
  assert.ok(proche(g.duree, 0.6, 0.005), `${g.duree}`);
  assert.equal(g.vitesse(g.duree + 1e-3), 0);
  assert.equal(g.chemin(g.duree + 1), 200);
  // Plus loin, plus long, mais moins que le double.
  const loin = glisser(GESTES.arrivee.frottement, 400);
  assert.ok(loin.duree > g.duree && loin.duree < 2 * g.duree);
});

test('une pochette arrive d’un bord du cadre, glisse en tournant de moins en moins vite, s’arrête net de travers, entre 3 et 9 degrés, et pousse sa voisine de 2 px', () => {
  for (const angle of T.eventail.angles) assert.ok(Math.abs(angle) >= 3 && Math.abs(angle) <= 9, `angle ${angle}`);
  for (const place of placesEnEventail(12)) {
    const g = arriveeDUnePochette(place, T.eventail.taille, LARGEUR, 0);
    const [depart] = suivre(g, 0, 0);
    assert.ok(depart !== undefined && (depart.x < -T.eventail.taille / 2 || depart.x > LARGEUR + T.eventail.taille / 2), 'elle part hors du cadre');
    const fin = aLInstant(g, g.duree + 0.2);
    assert.ok(proche(fin.x, place.en[0]) && proche(fin.y, place.en[1]) && proche(fin.angle, place.angle));
    assert.ok(proche(fin.pousse, GESTES.arrivee.pousse));
    // Elle ralentit tout du long, sa rotation avec elle ; arrêtée, plus rien ne bouge.
    const vues = suivre(g, 0, g.duree + 0.1, 1 / 50);
    const pas = vues.slice(1).map((v, i) => Math.hypot(v.x - (vues[i]?.x ?? 0), v.y - (vues[i]?.y ?? 0)));
    for (let i = 2; i < pas.length; i++) assert.ok((pas[i] ?? 0) <= (pas[i - 1] ?? 0) + 0.05, `elle accélère à ${i}`);
    assert.deepEqual(aLInstant(g, g.duree + 0.2), aLInstant(g, g.duree + 0.5));
    // La voisine ne bouge qu'à la fin : pendant les deux derniers px.
    assert.equal(aLInstant(g, g.duree / 2).pousse, 0);
  }
});

test('une bonne réponse : la pastille arrive plus grande, d’un peu plus haut, claque en 90 ms ; la pochette s’enfonce d’un px et revient ; le téléphone vibre à l’impact', () => {
  const g = bonneReponse(0);
  assert.ok(proche(CLAQUE, 0.09, 0.002), `${CLAQUE}`);
  assert.equal(aLInstant(g, 0).pastille, PASTILLES.decompte.arrivee.hauteur);
  assert.ok(Math.abs(aLInstant(g, g.impact).pastille) < 0.05);
  assert.ok(Math.abs(aLInstant(g, g.impact + 0.1).pastille) < 0.05, 'collée, elle ne rebondit pas');
  const pochette = suivre(g, 0, 0.5).map((v) => v.pochette);
  assert.ok(proche(Math.min(...pochette), -1, 0.05), `${Math.min(...pochette)}`);
  assert.ok(Math.abs(aLInstant(g, g.impact + 0.25).pochette) < 0.05, 'elle est revenue');
  assert.deepEqual(g.vibrations, [g.impact]);
});

test('« Presque. » reste collée 1,2 s, se décolle, et glisse hors du cadre', () => {
  const g = presque(0);
  for (const t of [g.impact + 0.05, g.impact + 0.6, g.impact + GESTES.presque.reste - 0.01]) {
    const v = aLInstant(g, t);
    assert.ok(Math.abs(v.pastille) < 0.05 && v.fuite === 0, `${t}`);
  }
  const fin = aLInstant(g, g.impact + GESTES.presque.reste + 1);
  // Collée au bord droit de l'étiquette, au plus large, elle file assez loin pour quitter le cadre.
  const bord = T.reponse.en[0] + T.reponse.largeur / 2 - (T.reponse.largeur - T.reponse.auMoins) / 2 + T.mot.decalage[0];
  assert.ok(bord + fin.fuite - PASTILLES.message.rayon > LARGEUR, `${bord + fin.fuite}`);
});

test('les quatre étiquettes arrivent à 40 ms d’écart ; celle qu’on touche s’enfonce de 2 px en 60 ms ; à la révélation, les trois mauvaises quittent le cadre et la bonne reste', () => {
  const g = quatreEtiquettes(T.choix.angles, 0, { rang: 0, a: 1 }, { a: 2, bonne: 1 });
  const departs = [0, 1, 2, 3].map((rang) => g.roles[`x${rang}`]?.pas[0]?.a ?? NaN);
  departs.slice(1).forEach((a, i) => assert.ok(proche(a - (departs[i] ?? 0), GESTES.choix.ecart, 1e-9)));
  const arrivees = aLInstant(g, 0.9) as Record<string, number>;
  for (const rang of [0, 1, 2, 3])
    assert.ok(proche(arrivees[`x${rang}`] ?? NaN, 0) && proche(arrivees[`angle${rang}`] ?? NaN, T.choix.angles[rang] ?? 0));
  assert.ok(proche((aLInstant(g, 1 + TOUCHES.enfonce) as Record<string, number>).enfonce0 ?? 0, TOUCHES.course));
  const apres = aLInstant(g, 3) as Record<string, number>;
  assert.equal(apres.x1, 0, 'la bonne reste');
  for (const rang of [0, 2, 3]) assert.ok(T.choix.x + T.choix.largeur / 2 + (apres[`x${rang}`] ?? 0) < 0, `l’étiquette ${rang + 1} est sortie`);
});

test('la vraie pochette sort de sous la kraft et s’arrête de travers ; une pochette qui se retourne se soulève, puis montre son dos', () => {
  const place = { en: [150, 704] as const, angle: T.vraiePochette.angle };
  const g = vraiePochette(place, 0);
  const fin = aLInstant(g, 1);
  assert.ok(proche(fin.x, 150) && proche(fin.y, 704) && proche(fin.angle, T.vraiePochette.angle));
  assert.notEqual(aLInstant(g, 0).x, 150);
  const r = seRetourne(0, true);
  const vues = suivre(r, 0, 0.8).map((v) => v.retourne);
  assert.ok(vues.some((v) => proche(v, 0.5, 0.1)) && proche(vues[vues.length - 1] ?? 0, 1, 0.01));
  assert.ok(Math.max(...vues) <= 1.01, 'elle ne dépasse pas : retombée côté dos, elle y reste');
});

test('le hit-parade se range du dernier au premier, à 70 ms d’écart ; celle qui double se soulève, passe, se pose ; la doublée part après elle ; tout tient en moins de 2 s, même à douze', () => {
  const places = Array.from({ length: 12 }, (_, rang) => ({ en: [(rang % 4) * 80, Math.floor(rang / 4) * 80] as const, angle: 3 }));
  const avant = Array.from({ length: 12 }, (_, i) => `j${i}`);
  // La dernière passe première, d'un coup : elle double tout le monde.
  const apres = ['j11', ...avant.slice(0, 11)];
  const g = hitParade(avant, apres, places, 0, apres);
  assert.ok(g.fin < 2, `${g.fin}`);
  const leve = g.roles['leve-j11'];
  assert.ok(
    leve !== undefined && leve.pas.length === 2 && (leve.pas[0]?.arrivee ?? 0) > 0 && leve.pas[1]?.arrivee === 0,
    'elle se soulève, puis se pose',
  );
  const roles = g.roles as Readonly<Record<string, { readonly pas: readonly { readonly a: number }[] }>>;
  const departDe = (id: string): number => Math.min(...['x', 'y', 'leve'].flatMap((genre) => roles[`${genre}-${id}`]?.pas.map((p) => p.a) ?? []));
  assert.ok(departDe('j0') > departDe('j11'), 'la doublée part après celle qui la double');
  const vues = suivre(g, 0, g.fin + 0.3, 1 / 100) as Record<string, number>[];
  assert.ok(Math.max(...vues.map((v) => v['leve-j11'] ?? 0)) > GESTES.hitParade.leve * 0.9);
  const fin = vues[vues.length - 1] ?? {};
  apres.forEach((id, rang) => assert.ok(proche(fin[`x-${id}`] ?? NaN, places[rang]?.en[0] ?? 0, 0.1), id));
  // Sans dépassement : celles qui ne font que glisser partent du dernier au premier, à 70 ms d'écart.
  const sansDoubler = hitParade(avant, avant, places, 0, []);
  assert.deepEqual(
    Object.values(sansDoubler.roles).flatMap((r) => r.pas),
    [],
    'personne ne bouge, rien ne part',
  );
});

test('la finale pose l’or, le platine, puis le diamant ; chacun descend jusqu’au bois ; l’éclat du diamant fait deux fois le tour de ses facettes', () => {
  const g = finale(0);
  const partDe = (genre: 'or' | 'platine' | 'diamant'): number => g.roles[genre].pas[0]?.a ?? NaN;
  assert.ok(partDe('or') < partDe('platine') && partDe('platine') < partDe('diamant'));
  for (const genre of ['or', 'platine', 'diamant'] as const) {
    assert.equal(aLInstant(g, partDe(genre)).or >= 0, true);
    assert.ok(Math.abs(aLInstant(g, partDe(genre) + 0.6)[genre]) < 0.3, `${genre} posé`);
  }
  assert.ok(g.eclatA - g.eclatDe === GESTES.finale.tour.duree);
  assert.ok(proche(aLInstant(g, g.eclatA).eclat, 1, 1e-9) && aLInstant(g, g.eclatDe).eclat === 0);
});

test('« Allume l’ampli » : l’interrupteur bascule en deux temps, le voyant passe au clic, le téléphone vibre, et les aiguilles partent en butée puis retombent', () => {
  const g = allumerLAmpli(0);
  assert.ok(proche(aLInstant(g, g.clic - 0.005).interrupteur, GESTES.ampli.course.part, 0.03), 'la course : jusqu’au milieu');
  assert.ok(proche(aLInstant(g, g.clic + 0.06).interrupteur, 1, 0.02), 'le clic');
  assert.deepEqual(g.vibrations, [g.clic]);
  const gauche = suivre(g, 0, 1).map((v) => v.gauche);
  assert.ok(Math.max(...gauche) > 0.95, 'en butée');
  assert.ok(Math.abs(aLInstant(g, 1).gauche) < 0.02, 'retombée');
  const depart = (role: 'gauche' | 'droite'): number => g.roles[role].pas[0]?.a ?? NaN;
  assert.ok(depart('droite') - depart('gauche') >= 0.03 - 1e-9, 'rien ne part en même temps');
});

test('le gros bouton suit le doigt de cran en cran, un tous les 15 degrés, une vibration à chaque cran ; un sélecteur dépasse de 2 degrés et revient', () => {
  const de = CRANS_DU_VOLUME[3] ?? 0;
  const doigt = Array.from({ length: 31 }, (_, i) => ({ a: i / 60, angle: de + i * 1.5 }));
  const g = volumeAuDoigt(doigt, CRANS_DU_VOLUME);
  assert.equal(g.vibrations?.length, 3);
  const fin = aLInstant(g, 2).volume;
  assert.ok(CRANS_DU_VOLUME.some((c) => proche(c, fin, 0.01)) && proche(fin - de, 45, 0.01), `${fin}`);
  const crans = [-72, -36, 0, 36, 72];
  const s = deCranEnCran(crans, 0, 2, 0);
  const angles = suivre(s, 0, 1).map((v) => v.angle);
  assert.ok(proche(Math.max(...angles), 0 + GESTES.selecteur.depasse, 0.1), `${Math.max(...angles)}`);
  assert.ok(proche(aLInstant(s, 1).angle, 0, 0.02));
  assert.ok(
    angles.some((a) => proche(a, -36 + GESTES.selecteur.depasse, 0.3)),
    'il marque chaque cran',
  );
});

test('le regard glisse en 350 à 550 ms selon la distance, sans dépasser, et l’objet visé fait un signe à son arrivée ; la playlist sort du bac de 6 px, puis par le haut', () => {
  assert.ok(proche(dureeDuRegard(50), 0.35, 1e-9) && proche(dureeDuRegard(2000), 0.55, 1e-9));
  const g = regardQuiGlisse([0, 0], [480, 0], 0);
  const xs = suivre(g, 0, 1).map((v) => v.x);
  xs.slice(1).forEach((x, i) => assert.ok(x >= (xs[i] ?? 0) - 1e-6 && x <= 480 + 1e-6, 'il ne dépasse ni ne revient'));
  assert.ok(proche(aLInstant(g, g.arrivee).x, 480, 480 * 0.02 + 0.5));
  assert.ok(Math.max(...suivre(g, g.arrivee, g.arrivee + 0.3).map((v) => v.signe)) > GESTES.regard.signe.place * 0.8);
  assert.equal(aLInstant(g, g.arrivee - 0.01).signe, 0);
  const b = sortirUnePlaylist(0);
  assert.ok(proche(aLInstant(b, GESTES.bac.sortA - 0.01).leve, GESTES.bac.leve, 0.05));
  assert.ok(proche(aLInstant(b, 2).leve, GESTES.bac.sort, 0.1));
});

test('en version sobre, chaque objet est d’un coup à sa place d’arrivée dès que son geste part', () => {
  const place = placesEnEventail(6)[5];
  assert.ok(place !== undefined);
  const g = arriveeDUnePochette(place, T.eventail.taille, LARGEUR, 1);
  const avant = aLInstant(g, 0.99, true);
  const pendant = aLInstant(g, 1.01, true);
  assert.ok(avant.x !== place.en[0]);
  assert.deepEqual([pendant.x, pendant.y, pendant.angle], [place.en[0], place.en[1], place.angle]);
  const b = bonneReponse(0);
  assert.equal(aLInstant(b, 0.01, true).pastille, 0, 'la pastille est collée d’un coup');
  assert.equal(MATIERES.pastille.tombe.elan > 0, true);
});
