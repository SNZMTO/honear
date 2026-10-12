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
const TITRES: EtatDeBouton = { titre: 'Titres', crans: ['10', '15'], choisi: 0 };
const SON: EtatDInterrupteur = { titre: 'Son', positions: ['Tous', 'Hôte'], choisie: 0 };
// Comme sur la platine : le plus long en haut, le plus court à droite, près du bord du socle.
const MODES: EtatDInterrupteur = { titre: '', positions: ['First one', '4 choix', 'Libre', '1re note'], choisie: 0 };
const bouton = (etat: EtatDeBouton, souleve = 0) => dessinerUnBouton('pistes', C.boutons.pistes, etat, DENSITE, souleve);
const interrupteur = (etat: EtatDInterrupteur, souleve = 0) => dessinerUnInterrupteur('son', C.interrupteurs.mode.x, etat, DENSITE, souleve);
const textes = (liste: readonly Dessin[]): Texte[] => liste.flatMap((d) => (d.genre === 'texte' ? [d] : []));
const sommets = (c: Calque): (readonly [number, number])[] =>
  dessins(c).flatMap((d) => (d.genre === 'peinture' ? d.facettes.flatMap((f) => f.contour) : []));

test('l’index d’un bouton pointe le cran choisi, et le corps du bouton ne change pas : la lampe ne bouge pas', () => {
  const corps = (choisi: number): Calque => calque(bouton({ ...TITRES, choisi }).bouton, 'bouton-pistes/corps');
  const angle = (choisi: number) => calque(bouton({ ...TITRES, choisi }).bouton, 'bouton-pistes/index/trait/tourne').transformations;
  assert.deepEqual(angle(0), [{ genre: 'tourner', de: C.boutons.pistes.crans[0] }]);
  assert.deepEqual(angle(1), [{ genre: 'tourner', de: C.boutons.pistes.crans[1] }]);
  assert.deepEqual(corps(1), corps(0));
  assert.equal(corps(0).role, 'image');
  assert.equal(calque(bouton(TITRES).bouton, 'bouton-pistes/index').role, 'mobile');
  // D'un cran à l'autre, l'ombre ne change pas non plus : le bouton tourne sur place.
  assert.deepEqual(bouton({ ...TITRES, choisi: 1 }).ombre, bouton(TITRES).ombre);
});

test('un bouton refuse un cran qui n’existe pas ou qui n’est pas occupé, et plus d’inscriptions qu’il n’a de crans', () => {
  assert.equal(C.boutons.pistes.crans.length, 3);
  assert.throws(
    () => bouton({ ...TITRES, choisi: 2 }),
    /« pistes » ne peut pas être sur le cran 2 : il n'a que 2 crans occupés/,
    'un cran gravé mais vide',
  );
  assert.throws(() => bouton({ ...TITRES, choisi: -1 }), /cran -1/);
  assert.throws(() => bouton({ ...TITRES, choisi: 3 }), /cran 3/);
  assert.throws(() => bouton({ ...TITRES, crans: ['1', '2', '3', '4'] }), /n'a que 3 crans : 4 inscriptions/);
  assert.doesNotThrow(() => bouton({ ...TITRES, crans: ['1', '2', '3'], choisi: 2 }));
});

test('les crans d’un bouton sont tous gravés dans le socle, avec une inscription par cran occupé et son titre', () => {
  const { gravures } = bouton(TITRES);
  const [traits] = gravures;
  assert.ok(traits?.genre === 'aplat' && traits.contours.length === 3 && traits.teinte === 'creme');
  const ecrits = textes(gravures);
  assert.deepEqual(
    ecrits.map((t) => t.contenu),
    ['10', '15', 'Titres'],
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
  const [pose, souleve] = [bouton(TITRES), bouton(TITRES, 12)];
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
  const axe = surLEcran(surLeSocle([C.interrupteurs.mode.x, C.ligne]))[0];
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

test('la manette du mode se couche vers l’un des quatre modes, gravés en haut, à gauche, à droite et en bas', () => {
  const manette = (choisie: number) => dessinerUnInterrupteur('mode', C.interrupteurs.mode.x, { ...MODES, choisie }, DENSITE);
  const [axeX, axeY] = surLEcran(surLeSocle([C.interrupteurs.mode.x, C.ligne]));
  const milieu = (c: Calque): [number, number] => {
    const p = sommets(c);
    return [
      (Math.min(...p.map((q) => q[0])) + Math.max(...p.map((q) => q[0]))) / 2,
      (Math.min(...p.map((q) => q[1])) + Math.max(...p.map((q) => q[1]))) / 2,
    ];
  };
  const [haut, gauche, droite, bas] = [0, 1, 2, 3].map((choisie) => milieu(manette(choisie).bascule));
  assert.ok(haut !== undefined && gauche !== undefined && droite !== undefined && bas !== undefined);
  assert.ok(haut[1] < axeY && bas[1] > haut[1] + 5, 'en haut vers le fond, en bas vers le joueur');
  assert.ok(gauche[0] < axeX && droite[0] > axeX, 'à gauche, à droite');
  assert.deepEqual(manette(2).positions, manette(0).positions, 'les inscriptions ne bougent pas');
  // Chaque nom est son calque : on touche celui du mode qu'on veut.
  assert.deepEqual(
    manette(0).positions.map((c) => c.nom),
    ['interrupteur-mode/haut', 'interrupteur-mode/gauche', 'interrupteur-mode/droite', 'interrupteur-mode/bas'],
  );
  const ecrits = manette(0).positions.flatMap((c) => textes(c.contenu));
  assert.deepEqual(
    ecrits.map((t) => [t.contenu, t.ancrage]),
    [
      ['First one', 'milieu'],
      ['4 choix', 'fin'],
      ['Libre', 'debut'],
      ['1re note', 'milieu'],
    ],
  );
});

test('les commandes sont rangées dans l’ordre où elles se dessinent : chaque pièce mobile juste après son ombre', () => {
  const etat: EtatDesCommandes = {
    boutons: {
      pistes: { titre: 'Pistes', crans: ['10', '15', '20'], choisi: 1 },
      extrait: { titre: 'Extrait', crans: ['10', '20', '30'], choisi: 1 },
    },
    interrupteurs: { mode: MODES },
  };
  const { decor, mobiles } = dessinerLesCommandes(etat, 'Honear', DENSITE);
  assert.deepEqual(
    mobiles.map((c) => c.nom),
    ['bouton-pistes/ombre', 'bouton-pistes', 'bouton-extrait/ombre', 'bouton-extrait', 'interrupteur-mode/ombre', 'interrupteur-mode'],
  );
  // Tout ce qui est gravé tient dans un seul calque à plat sur le socle : crans, inscriptions, titres, et la plaque de marque.
  const [gravures] = decor;
  assert.ok(gravures?.genre === 'calque' && gravures.nom === 'platine/gravures');
  const ecrits = textes(gravures.contenu);
  assert.equal(ecrits.length, 3 + 3 + 2 + 1, 'les inscriptions des crans occupés, les deux titres, la marque (les modes de la manette sont à part)');
  const marque = ecrits.at(-1);
  assert.deepEqual([marque?.contenu, marque?.role, marque?.corps], ['Honear', 'titrage', CORPS.mention]);
  // Aucune commande ne chevauche sa voisine : entre deux boutons, il reste de la laque pour leurs inscriptions.
  const places = [
    ...Object.values(C.boutons).map((b) => [b.x - b.rayon, b.x + b.rayon]),
    [C.interrupteurs.mode.x - C.interrupteur.bascule.longueur, C.interrupteurs.mode.x + C.interrupteur.bascule.longueur],
  ];
  for (let i = 1; i < places.length; i++) assert.ok((places[i]?.[0] ?? 0) - (places[i - 1]?.[1] ?? 0) > 40, `entre les commandes ${i - 1} et ${i}`);
});

/** Ce que chaque commande occupe en largeur sur le socle, inscriptions comprises, de gauche à droite : [bord gauche, bord droit]. */
function emprises(): { cle: string; de: number; a: number }[] {
  const etat: EtatDesCommandes = {
    boutons: {
      pistes: { titre: 'Pistes', crans: ['10', '15', '20'], choisi: 1 },
      extrait: { titre: 'Extrait', crans: ['10', '20', '30'], choisi: 1 },
    },
    interrupteurs: { mode: MODES },
  };
  // Ce qui est gravé : dans le calque des gravures, et les noms de la manette, chacun le sien.
  const gravees = dessinerLesCommandes(etat, 'Honear', DENSITE).decor.flatMap((d) => (d.genre === 'calque' ? textes(dessins(d)) : []));
  const centres = [
    ...Object.entries(C.boutons).map(([cle, b]) => ({ cle, x: surLeSocle([b.x, C.ligne])[0], demi: b.rayon + C.trait.a })),
    ...Object.entries(C.interrupteurs).map(([cle, i]) => ({ cle, x: surLeSocle([i.x, C.ligne])[0], demi: C.interrupteur.bascule.longueur })),
  ];
  const zones = centres.map((c) => ({ cle: c.cle, x: c.x, de: c.x - c.demi, a: c.x + c.demi }));
  // Chaque inscription technique appartient à la commande dont le centre est le plus proche de son ancre.
  for (const texte of gravees.filter((t) => t.role === 'technique')) {
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
    ['pistes', 'extrait', 'mode'],
  );
  for (let i = 1; i < zones.length; i++) {
    const [avant, apres] = [zones[i - 1], zones[i]];
    assert.ok(avant !== undefined && apres !== undefined);
    const jour = apres.de - avant.a;
    assert.ok(jour >= 8, `${jour.toFixed(1)} px seulement entre « ${avant.cle} » et « ${apres.cle} »`);
  }
  const [premiere, derniere] = [zones[0], zones.at(-1)];
  assert.ok(premiere !== undefined && derniere !== undefined);
  assert.ok(premiere.de - regard.origine[0] >= 6, `la première inscription est à ${(premiere.de - regard.origine[0]).toFixed(1)} px du bord gauche`);
  assert.ok(surLeSocle([PLATINE.socle.largeur, 0])[0] - derniere.a >= 6, 'la dernière inscription touche le bord du socle');
});
