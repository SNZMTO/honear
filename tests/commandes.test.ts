import assert from 'node:assert/strict';
import { test } from 'node:test';
import { surLEcran } from '../src/lowpoly/projection';
import { DENSITES } from '../src/ressources/densites';
import { PLATINE } from '../src/ressources/platine';
import { CORPS } from '../src/ressources/typo';
import type { Calque, Dessin, Texte } from '../src/scene/calque';
import { regardSurLaPlatine } from '../src/scene/meuble';
import { surLeSocle } from '../src/scene/platine';
import { dessinerUnBouton, type EtatDeBouton } from '../src/scene/platine/bouton';
import { dessinerLesCommandes, type EtatDesCommandes } from '../src/scene/platine/commandes';
import { dessinerUnInterrupteur, type EtatDInterrupteur } from '../src/scene/platine/interrupteur';
import { calque, calques, dessins, ENCRIER } from './planche';

const C = PLATINE.commandes;
const DENSITE = DENSITES.fine;
const MODE: EtatDeBouton = { titre: 'Mode', crans: ['Libre', '4 choix'], choisi: 0 };
const SON: EtatDInterrupteur = { titre: 'Son', positions: ['Tous', 'Hôte'], choisie: 0 };
const bouton = (etat: EtatDeBouton, souleve = 0) => dessinerUnBouton('mode', C.boutons.mode, etat, DENSITE, souleve);
const interrupteur = (etat: EtatDInterrupteur, souleve = 0) => dessinerUnInterrupteur('son', C.interrupteurs.son.x, etat, DENSITE, souleve);
const textes = (liste: readonly Dessin[]): Texte[] => liste.flatMap((d) => (d.genre === 'texte' ? [d] : []));
const sommets = (c: Calque): (readonly [number, number])[] =>
  dessins(c).flatMap((d) => (d.genre === 'peinture' ? d.facettes.flatMap((f) => f.contour) : []));

test('l’index d’un bouton pointe le cran choisi, et le corps du bouton ne change pas : la lampe ne bouge pas', () => {
  const corps = (choisi: number): Calque => calque(bouton({ ...MODE, choisi }).bouton, 'bouton-mode/corps');
  const angle = (choisi: number) => calque(bouton({ ...MODE, choisi }).bouton, 'bouton-mode/index/trait/tourne').transformations;
  assert.deepEqual(angle(0), [{ genre: 'tourner', de: C.boutons.mode.crans[0] }]);
  assert.deepEqual(angle(1), [{ genre: 'tourner', de: C.boutons.mode.crans[1] }]);
  assert.deepEqual(corps(1), corps(0));
  assert.equal(corps(0).role, 'image');
  assert.equal(calque(bouton(MODE).bouton, 'bouton-mode/index').role, 'mobile');
  // D'un cran à l'autre, l'ombre ne change pas non plus : le bouton tourne sur place.
  assert.deepEqual(bouton({ ...MODE, choisi: 1 }).ombre, bouton(MODE).ombre);
});

test('un bouton refuse un cran qui n’existe pas ou qui n’est pas occupé, et plus d’inscriptions qu’il n’a de crans', () => {
  assert.equal(C.boutons.mode.crans.length, 5, 'le bouton de mode a cinq crans gravés, pour les modes à venir');
  assert.throws(
    () => bouton({ ...MODE, choisi: 2 }),
    /« mode » ne peut pas être sur le cran 2 : il n'a que 2 crans occupés/,
    'un cran gravé mais vide',
  );
  assert.throws(() => bouton({ ...MODE, choisi: -1 }), /cran -1/);
  assert.throws(() => bouton({ ...MODE, choisi: 7 }), /cran 7/);
  assert.throws(() => bouton({ ...MODE, crans: ['1', '2', '3', '4', '5', '6'] }), /n'a que 5 crans : 6 inscriptions/);
  assert.doesNotThrow(() => bouton({ ...MODE, crans: ['1', '2', '3', '4', '5'], choisi: 4 }));
});

test('les crans d’un bouton sont tous gravés dans le socle, avec une inscription par cran occupé et son titre', () => {
  const { gravures } = bouton(MODE);
  const [traits] = gravures;
  assert.ok(traits?.genre === 'aplat' && traits.contours.length === 5 && traits.teinte === 'creme');
  const ecrits = textes(gravures);
  assert.deepEqual(
    ecrits.map((t) => t.contenu),
    ['Libre', '4 choix', 'Mode'],
  );
  for (const t of ecrits) assert.deepEqual([t.role, t.corps, t.teinte, t.fond.teinte], ['technique', CORPS.gravure, 'creme', 'laque']);
  // Une inscription de côté s'écarte du bouton : elle finit avant lui à gauche, commence après lui à droite ; au fond, elle est centrée.
  const pistes = dessinerUnBouton('pistes', C.boutons.pistes, { titre: 'Pistes', crans: ['10', '15', '20'], choisi: 1 }, DENSITE);
  assert.deepEqual(
    textes(pistes.gravures).map((t) => t.ancrage),
    ['fin', 'milieu', 'debut', 'milieu'],
  );
  const centreDuBouton = surLeSocle([C.boutons.pistes.x, C.ligne])[0];
  const [dix, quinze, vingt] = textes(pistes.gravures);
  assert.ok(dix !== undefined && quinze !== undefined && vingt !== undefined);
  assert.ok(dix.en[0] < centreDuBouton - C.boutons.pistes.rayon && vingt.en[0] > centreDuBouton + C.boutons.pistes.rayon);
  assert.equal(quinze.en[0], centreDuBouton);
});

test('un bouton soulevé monte d’un bloc, et son ombre s’éloigne de lui : on ne touche qu’à des transformations', () => {
  const [pose, souleve] = [bouton(MODE), bouton(MODE, 12)];
  assert.deepEqual(pose.bouton.transformations, [{ genre: 'glisser', de: [0, 0] }]);
  assert.deepEqual(souleve.bouton.transformations, [{ genre: 'glisser', de: [0, -12] }]);
  assert.deepEqual(souleve.bouton.contenu, pose.bouton.contenu);
  assert.deepEqual(souleve.gravures, pose.gravures);
  // La portée de l'ombre : la dernière transformation de son calque.
  const portee = (ombre: Calque) => ombre.transformations?.at(-1);
  const [avant, apres] = [portee(pose.ombre), portee(souleve.ombre)];
  assert.ok(avant?.genre === 'glisser' && apres?.genre === 'glisser' && apres.de[0] > avant.de[0] * 2);
  assert.equal(calques(pose.ombre).length, 1 + 2, 'un bouton est bas : deux paliers suffisent');
});

test('la bascule d’un interrupteur est couchée vers la position choisie ; l’écrou et les inscriptions ne bougent pas', () => {
  const [aGauche, aDroite] = [interrupteur({ ...SON, choisie: 0 }), interrupteur({ ...SON, choisie: 1 })];
  const axe = surLEcran(surLeSocle([C.interrupteurs.son.x, C.ligne]))[0];
  const etendue = (c: Calque): [number, number] => [Math.min(...sommets(c).map((p) => p[0])), Math.max(...sommets(c).map((p) => p[0]))];
  const [gaucheMin, gaucheMax] = etendue(aGauche.bascule);
  const [droiteMin, droiteMax] = etendue(aDroite.bascule);
  assert.ok(
    gaucheMin < axe - C.interrupteur.bascule.longueur + 1 && gaucheMax < axe + 1,
    `à gauche : de ${gaucheMin.toFixed(1)} à ${gaucheMax.toFixed(1)}, axe ${axe}`,
  );
  assert.ok(
    droiteMax > axe + C.interrupteur.bascule.longueur - 1 && droiteMin > axe - 1,
    `à droite : de ${droiteMin.toFixed(1)} à ${droiteMax.toFixed(1)}`,
  );
  // Les deux positions sont le miroir l'une de l'autre autour de l'axe.
  assert.ok(Math.abs(axe - gaucheMin - (droiteMax - axe)) < 1e-6);
  assert.deepEqual(aDroite.fixe, aGauche.fixe);
  assert.deepEqual(aDroite.gravures, aGauche.gravures);
  assert.equal(aGauche.bascule.role, 'mobile');
  assert.equal(aGauche.ombre.role, 'ombre');

  const [tous, hote, son] = textes(aGauche.gravures);
  assert.deepEqual(
    [tous?.contenu, tous?.ancrage, hote?.contenu, hote?.ancrage, son?.contenu, son?.ancrage],
    ['Tous', 'fin', 'Hôte', 'debut', 'Son', 'milieu'],
  );
  assert.ok((tous?.en[0] ?? 0) < axe && (hote?.en[0] ?? 0) > axe, 'la première position est gravée à gauche, la seconde à droite');
});

test('les commandes sont rangées dans l’ordre où elles se dessinent : chaque pièce mobile juste après son ombre', () => {
  const etat: EtatDesCommandes = {
    boutons: {
      pistes: { titre: 'Pistes', crans: ['10', '15', '20'], choisi: 1 },
      extrait: { titre: 'Extrait', crans: ['10', '20', '30'], choisi: 1 },
      mode: MODE,
    },
    interrupteurs: { son: SON },
  };
  const { decor, mobiles } = dessinerLesCommandes(etat, 'Miel d’oreilles', DENSITE);
  assert.deepEqual(
    mobiles.map((c) => c.nom),
    [
      'bouton-pistes/ombre',
      'bouton-pistes',
      'bouton-extrait/ombre',
      'bouton-extrait',
      'bouton-mode/ombre',
      'bouton-mode',
      'interrupteur-son/ombre',
      'interrupteur-son',
    ],
  );
  // Tout ce qui est gravé tient dans un seul calque à plat sur le socle : crans, inscriptions, titres, et la plaque de marque.
  const [gravures] = decor;
  assert.ok(gravures?.genre === 'calque' && gravures.nom === 'platine/gravures');
  const ecrits = textes(gravures.contenu);
  assert.equal(ecrits.length, 3 + 3 + 2 + 4 + 2 + 1, 'les inscriptions des crans occupés, les quatre titres, les deux positions, la marque');
  const marque = ecrits.at(-1);
  assert.deepEqual([marque?.contenu, marque?.role, marque?.corps], ['Miel d’oreilles', 'titrage', CORPS.mention]);
  // Aucune commande ne chevauche sa voisine : entre deux boutons, il reste de la laque pour leurs inscriptions.
  const places = [
    ...Object.values(C.boutons).map((b) => [b.x - b.rayon, b.x + b.rayon]),
    [C.interrupteurs.son.x - C.interrupteur.bascule.longueur, C.interrupteurs.son.x + C.interrupteur.bascule.longueur],
  ];
  for (let i = 1; i < places.length; i++) assert.ok((places[i]?.[0] ?? 0) - (places[i - 1]?.[1] ?? 0) > 40, `entre les commandes ${i - 1} et ${i}`);
});

/** Ce que chaque commande occupe en largeur sur le socle, inscriptions comprises, de gauche à droite : [bord gauche, bord droit]. */
function emprises(): { cle: string; de: number; a: number }[] {
  const etat: EtatDesCommandes = {
    boutons: {
      pistes: { titre: 'Pistes', crans: ['10', '15', '20'], choisi: 1 },
      extrait: { titre: 'Extrait', crans: ['10', '20', '30'], choisi: 1 },
      mode: MODE,
    },
    interrupteurs: { son: SON },
  };
  const [gravures] = dessinerLesCommandes(etat, 'Miel d’oreilles', DENSITE).decor;
  assert.ok(gravures?.genre === 'calque');
  const centres = [
    ...Object.entries(C.boutons).map(([cle, b]) => ({ cle, x: surLeSocle([b.x, C.ligne])[0], demi: b.rayon + C.trait.a })),
    ...Object.entries(C.interrupteurs).map(([cle, i]) => ({ cle, x: surLeSocle([i.x, C.ligne])[0], demi: C.interrupteur.bascule.longueur })),
  ];
  const zones = centres.map((c) => ({ cle: c.cle, x: c.x, de: c.x - c.demi, a: c.x + c.demi }));
  // Chaque inscription technique appartient à la commande dont le centre est le plus proche de son ancre.
  for (const texte of textes(gravures.contenu).filter((t) => t.role === 'technique')) {
    const largeur = ENCRIER.largeur(texte);
    const de = texte.ancrage === 'debut' ? texte.en[0] : texte.ancrage === 'fin' ? texte.en[0] - largeur : texte.en[0] - largeur / 2;
    const zone = zones.reduce((proche, z) => (Math.abs(z.x - texte.en[0]) < Math.abs(proche.x - texte.en[0]) ? z : proche));
    zone.de = Math.min(zone.de, de);
    zone.a = Math.max(zone.a, de + largeur);
  }
  return zones.sort((p, q) => p.de - q.de);
}

test('entre deux commandes voisines, les inscriptions gardent leurs distances ; et au téléphone, aucune ne touche le bord du cadre', () => {
  const regard = regardSurLaPlatine();
  const zones = emprises();
  assert.deepEqual(
    zones.map((z) => z.cle),
    ['pistes', 'extrait', 'mode', 'son'],
  );
  for (let i = 1; i < zones.length; i++) {
    const [avant, apres] = [zones[i - 1], zones[i]];
    assert.ok(avant !== undefined && apres !== undefined);
    const jour = apres.de - avant.a;
    assert.ok(jour >= 8, `${jour.toFixed(1)} px seulement entre « ${avant.cle} » et « ${apres.cle} »`);
  }
  // Les mots du sélecteur de mode prennent plus de place que des chiffres : d'axe en axe, il se tient plus loin de son voisin que les autres.
  const { pistes, extrait, mode } = PLATINE.commandes.boutons;
  assert.ok(mode.x - extrait.x > extrait.x - pistes.x + 16, 'le sélecteur de mode n’est pas plus loin de son voisin que les autres');
  const [premiere, derniere] = [zones[0], zones.at(-1)];
  assert.ok(premiere !== undefined && derniere !== undefined);
  assert.ok(premiere.de - regard.origine[0] >= 6, `la première inscription est à ${(premiere.de - regard.origine[0]).toFixed(1)} px du bord gauche`);
  assert.ok(surLeSocle([PLATINE.socle.largeur, 0])[0] - derniere.a >= 6, 'la dernière inscription touche le bord du socle');
});
