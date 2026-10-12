/**
 * La piste en mouvement : sa partition tient ce que le brief demande (le disque se pose sur l'axe, le diamant touche
 * à l'instant où l'extrait part, le disque s'arrête à l'endroit), rien ne saute, et le mouvement est le même
 * quel que soit le rythme des images. Régler la scène ou la redessiner donnent la même image.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { retournement, surLEcran } from '../src/lowpoly/projection';
import { degres, direction, distance, fois, longueur, moins, plus, scalaire, type Vec2 } from '../src/lowpoly/vecteurs';
import { creerLeMoteur } from '../src/mouvement/moteur';
import { tempsDArriveeDuPortage } from '../src/mouvement/portage';
import { pisteDExemple, reponseDExemple } from '../src/planche/exemples';
import { jouer, type Piste } from '../src/regles/piste';
import { DENSITES } from '../src/ressources/densites';
import { KRAFT } from '../src/ressources/kraft';
import { AMPLEURS, MATIERES, TEMPS, TOLERANCES } from '../src/ressources/mouvement';
import { PASTILLES } from '../src/ressources/pastilles';
import { PLATINE } from '../src/ressources/platine';
import { DEROULE } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque } from '../src/scene/calque';
import { VERSO_DU_JEU, type Verso } from '../src/scene/disque/verso';
import { reglerLaPochetteKraft, surLaPochetteKraft } from '../src/scene/kraft';
import { dessinerLeMeuble, regardSurLaPlatine } from '../src/scene/meuble';
import { ANGLE_DU_BRAS_AU_BORD, angleDuChrono } from '../src/scene/piste/chrono';
import { dessinerLaPiste, type DecorDeLaPiste } from '../src/scene/piste/dessin';
import { HALTES_DU_DISQUE, PLACE_DU_KRAFT } from '../src/scene/piste/emplacements';
import type { PisteEnScene } from '../src/scene/piste/etat';
import { gestesDeLaPiste } from '../src/scene/piste/gestes';
import { GRANDEURS, type Geste, type Grandeur } from '../src/scene/piste/gestes/vocabulaire';
import { DESCENTE_DU_BRAS, instantsDeLaPiste, type Signal } from '../src/scene/piste/instants';
import { partitionDeLaPiste } from '../src/scene/piste/partition';
import { kraftDeLaPiste } from '../src/scene/piste/pieces';
import { regimeDuPlateau } from '../src/scene/piste/plateau';
import { POSE_AVANT_LA_PISTE, type PoseDeLaPiste } from '../src/scene/piste/pose';
import { regardDeLaPiste } from '../src/scene/piste/regard';
import { poseDeDepart, regleurDeLaPiste } from '../src/scene/piste/reglages';
import { poseSobre } from '../src/scene/piste/sobre';
import { suivreLaPiste } from '../src/scene/piste/suivi';
import { CENTRE_DU_PLATEAU, HAUTEURS, PIVOT_DU_BRAS } from '../src/scene/platine';
import { calquesParNom, regler, type Reglage } from '../src/scene/reglage';
import { enSvg } from '../src/scene/rendu/svg';
import { ENCRIER } from './planche';

const REPONSE = reponseDExemple(TEXTES);
/** Le verso du jeu, sa réponse tombée : une piste redessinée après la révélation le porte. */
const VERSO_REVELE: Verso = { genre: VERSO_DU_JEU, reponse: REPONSE };

/** Une piste lancée à 1 s : le « 3 » à 1 s, le « 2 » à 2 s, le « 1 » à 3 s. Par défaut l'extrait part à 4 s, pour 10 s, et la réponse tombe à 10 s. */
function pisteJouee(o: { readonly pretsA?: number; readonly reveleeA?: number | null } = {}): Piste {
  let piste = jouer(undefined, { genre: 'lancer', a: 1, duree: 10 });
  piste = jouer(piste, { genre: 'prets', a: o.pretsA ?? 1.5 });
  if (o.reveleeA !== null) piste = jouer(piste, { genre: 'reveler', a: o.reveleeA ?? 10, reponse: REPONSE });
  if (piste === undefined) throw new Error('La piste n’a pas été lancée.');
  return piste;
}

/** La même piste, tout juste lancée : on ne sait pas encore quand l'extrait partira. */
function pisteLancee(): Piste {
  const piste = jouer(undefined, { genre: 'lancer', a: 1, duree: 10 });
  if (piste === undefined) throw new Error('La piste n’a pas été lancée.');
  return piste;
}

type Valeurs = Readonly<Record<Grandeur, number>>;

/** Le moteur déroulé sur une piste, image par image : la valeur de chaque grandeur à chaque instant. */
function derouler(scene: PisteEnScene, de: number, a: number, parSeconde: number): { readonly t: number; readonly valeurs: Valeurs }[] {
  const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
  const partition = partitionDeLaPiste(scene);
  const images: { t: number; valeurs: Valeurs }[] = [];
  const nombre = Math.round((a - de) * parSeconde);
  for (let i = 0; i <= nombre; i++) {
    const t = de + i / parSeconde;
    moteur.avancer(partition, t);
    images.push({ t, valeurs: Object.fromEntries(GRANDEURS.map((g) => [g, moteur.valeur(g)])) as Valeurs });
  }
  return images;
}

/** La valeur des grandeurs à un instant précis, en partant d'avant la piste. */
function a(scene: PisteEnScene, t: number): Valeurs {
  const image = derouler(scene, 0.9, t, 240).at(-1);
  if (image === undefined) throw new Error('Rien n’a été déroulé.');
  return image.valeurs;
}

const entre = (x: number, min: number, max: number, quoi: string): void =>
  assert.ok(x >= min && x <= max, `${quoi} : ${x}, attendu entre ${min} et ${max}`);
const proche = (x: number, attendu: number, marge: number, quoi: string): void => entre(x, attendu - marge, attendu + marge, quoi);

/** Le contour de la pochette kraft, tel qu'on le voit à l'écran. */
const KRAFT_A_L_ECRAN = ([-1, 1] as const).flatMap((y) =>
  (y < 0 ? ([-1, 1] as const) : ([1, -1] as const)).map((x) =>
    surLEcran(surLaPochetteKraft(PLACE_DU_KRAFT, [(x * KRAFT.cote) / 2, (y * KRAFT.cote) / 2]), KRAFT.tranche),
  ),
);

/** Vrai si un point de l'écran tombe sur la pochette kraft. */
function surLeKraft([x, y]: readonly [number, number]): boolean {
  let dedans = false;
  KRAFT_A_L_ECRAN.forEach((p, i) => {
    const q = KRAFT_A_L_ECRAN[(i + 1) % KRAFT_A_L_ECRAN.length];
    if (q !== undefined && p[1] > y !== q[1] > y && x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]) dedans = !dedans;
  });
  return dedans;
}

test('au « 3 », le disque sort de sa pochette avant de se soulever, et il est centré sur l’axe quand il descend dessus', () => {
  const piste = pisteJouee();
  const images = derouler({ piste, rayuresA: [] }, 0.9, 2.2, 240);
  const horsDeLaPochette = KRAFT.cote / 2 + PLATINE.disque.rayon;
  let estSorti = false;
  let estMonte = false;
  for (const { t, valeurs: v } of images) {
    const centre: [number, number] = [v['disque.x'], v['disque.y']];
    const auDessusDuKraft = v['disque.hauteur'] > KRAFT.tranche + 1;
    if (auDessusDuKraft && t < 1.6) {
      estMonte = true;
      assert.ok(
        distance(centre, PLACE_DU_KRAFT.centre) >= horsDeLaPochette - 1,
        `à ${t.toFixed(3)} s le disque se soulève encore pris dans sa pochette`,
      );
      // Soulevé, il passe à côté de sa pochette, sans jamais la survoler.
      for (let angle = 0; angle < 360; angle += 2) {
        const bord = surLEcran(plus(centre, fois(direction(angle), PLATINE.disque.rayon)), v['disque.hauteur']);
        assert.ok(!surLeKraft(bord), `à ${t.toFixed(3)} s le disque soulevé survole sa pochette`);
      }
    }
    if (distance(centre, PLACE_DU_KRAFT.centre) >= horsDeLaPochette) estSorti = true;
    // Passé au-dessus du plateau, son dessous ne descend sous la pointe de l'axe que centré dessus.
    if (t > 1.5 && v['disque.hauteur'] <= HAUTEURS.feutrine + PLATINE.axe.depassement)
      assert.ok(distance(centre, CENTRE_DU_PLATEAU) < 1, `à ${t.toFixed(3)} s le disque descend sur l'axe sans être centré`);
  }
  assert.ok(estSorti && estMonte);
  // Il vole à sa hauteur de vol, se pose en se tassant d'un px, et il est en place quand le plateau démarre.
  entre(Math.max(...images.map((i) => i.valeurs['disque.hauteur'])), AMPLEURS.vol - 0.5, AMPLEURS.vol + 0.5, 'hauteur de vol');
  const tassement = HAUTEURS.feutrine - Math.min(...images.filter((i) => i.t > 1.7).map((i) => i.valeurs['disque.hauteur']));
  entre(tassement, 0.7, 1.3, 'tassement du disque qui se pose');
  const auDeux = a({ piste, rayuresA: [] }, 2);
  proche(auDeux['disque.hauteur'], HAUTEURS.feutrine, 0.7, 'hauteur du disque au « 2 »');
  proche(a({ piste, rayuresA: [] }, 2.2)['disque.hauteur'], HAUTEURS.feutrine, 0.02, 'hauteur du disque posé');
  // Le disque a entraîné sa pochette kraft, la pastille a claqué.
  proche(auDeux['kraft.entrainee'], AMPLEURS.entrainementDuKraft, 0.01, 'ce dont la pochette kraft a été entraînée');
  proche(a({ piste, rayuresA: [] }, 1 + 0.09)['pastille.hauteur'], 0, 0.25, 'la pastille a claqué en 90 ms');
});

test('le disque qui sort entraîne sa pochette kraft dans son sens : vers le côté ouvert, celui de l’encoche, et jamais à reculons', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [] };
  /** Le cosinus de l'angle entre deux déplacements : 1 s'ils vont dans le même sens. */
  const memeSens = (p: Vec2, q: Vec2): number => scalaire(p, q) / (longueur(p) * longueur(q));
  // Le sens où le disque sort, à l'écran : de sa place dans la pochette à celle où il en est sorti.
  const sortie = moins(surLEcran(HALTES_DU_DISQUE.sorti.en), surLEcran(HALTES_DU_DISQUE.dansLaPochette.en));
  // Et le côté ouvert de la pochette : celui de son encoche, au milieu de son bord gauche.
  const versLEncoche = moins(surLEcran(surLaPochetteKraft(PLACE_DU_KRAFT, [-KRAFT.cote / 2, 0])), surLEcran(PLACE_DU_KRAFT.centre));
  assert.ok(memeSens(sortie, versLEncoche) > 0.9999, 'le disque sort par le côté de l’encoche');
  const suivi = suivreLaPiste();
  let auPlus = 0;
  for (let t = 0.9; t <= 3; t += 1 / 120) {
    const pose = suivi.poseA(scene, t);
    assert.ok(pose.kraft.entrainee >= -1e-9, `à ${t.toFixed(3)} s la pochette recule de ${-pose.kraft.entrainee} px`);
    const glissements = reglerLaPochetteKraft(kraftDeLaPiste(pose)).flatMap((reglage) =>
      'transformation' in reglage && reglage.transformation.genre === 'glisser' ? [reglage.transformation.de] : [],
    );
    // Son ombre, son corps et son papier du devant vont ensemble.
    const [de, ...autres] = glissements;
    assert.ok(de !== undefined && autres.length === 2 && autres.every((autre) => autre[0] === de[0] && autre[1] === de[1]));
    auPlus = Math.max(auPlus, longueur(de));
    if (longueur(de) < 1e-6) continue;
    assert.ok(memeSens(de, sortie) > 0.9999, `à ${t.toFixed(3)} s la pochette ne suit pas le disque : ${de.join(', ')}`);
  }
  // Elle le suit de peu : le papier frotte, il ne l'emporte pas.
  entre(auPlus, AMPLEURS.entrainementDuKraft * 0.8, AMPLEURS.entrainementDuKraft * 1.2, 'ce dont la pochette est entraînée, en px à l’écran');
});

test('la pastille du décompte claque : elle tombe de plus en plus vite, touche en 90 ms, et s’arrête net', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [] };
  const images = derouler(scene, 0.9, 1.4, 1000);
  const { hauteur, echelle } = PASTILLES.decompte.arrivee;
  // Jusqu'au dernier millième avant qu'elle touche : le suivant est coupé par le socle.
  const pendant = images.filter((i) => i.t >= 1 && i.t <= 1.089);
  // Elle descend sans jamais ralentir : chaque millième de seconde, un peu plus que le précédent.
  const pas = pendant.slice(1).map((i, rang) => (pendant[rang]?.valeurs['pastille.hauteur'] ?? NaN) - i.valeurs['pastille.hauteur']);
  pas.slice(1).forEach((p, rang) => assert.ok(p >= (pas[rang] ?? 0) - 1e-9, `à ${rang + 2} ms elle ralentit : ${p} px après ${pas[rang]} px`));
  const derniers = pas.slice(-5).reduce((somme, p) => somme + p, 0) * 200;
  entre(derniers, 150, 200, 'sa vitesse quand elle touche, en px par seconde');
  // Sa taille suit sa hauteur : elle arrive un peu plus grande, et se réduit en tombant.
  for (const { t, valeurs: v } of pendant)
    proche(v['pastille.echelle'], 1 + ((echelle - 1) * v['pastille.hauteur']) / hauteur, 1e-9, `taille de la pastille à ${t.toFixed(3)} s`);
  // Arrêt net : une fois collée, elle ne bouge plus d'un millième de px, et ne rebondit pas.
  const collee = images.filter((i) => i.t > 1.0905 && i.t < 1.4);
  assert.ok(collee.length > 300);
  for (const { t, valeurs: v } of collee) {
    assert.ok(Math.abs(v['pastille.hauteur']) < 1e-3, `à ${t.toFixed(3)} s la pastille est encore à ${v['pastille.hauteur']} px`);
    assert.ok(Math.abs(v['pastille.echelle'] - 1) < 1e-4, `à ${t.toFixed(3)} s la pastille n'a pas sa taille : ${v['pastille.echelle']}`);
  }
  proche(images.find((i) => i.t >= 1.0895)?.valeurs['pastille.hauteur'] ?? NaN, 0, 0.1, 'elle touche à 90 ms');
});

test('une main porte le disque : il part sans à-coup, ne dépasse jamais sa place, et son chemin tourne sans s’arrêter', () => {
  const piste = pisteJouee();
  const images = derouler({ piste, rayuresA: [] }, 0.9, 2.2, 240);
  const { dansLaPochette, sorti, surLePlateau } = HALTES_DU_DISQUE;
  const vitesses = images.slice(1).map((image, rang) => {
    const avant = images[rang];
    assert.ok(avant !== undefined);
    // Sa vitesse telle qu'on la voit : à l'écran, où la profondeur du meuble est écrasée.
    const [dx, dy] = surLEcran([image.valeurs['disque.x'] - avant.valeurs['disque.x'], image.valeurs['disque.y'] - avant.valeurs['disque.y']]);
    return { t: image.t, v: Math.hypot(dx, dy) * 240 };
  });
  const depart = 1 + TEMPS.disque.sort;
  const pointe = Math.max(...vitesses.map((i) => i.v));
  // Un ressort qu'on lâche part d'un coup : au bout d'une image, il a déjà le tiers de sa vitesse. Porté, le disque la prend peu à peu.
  const apres = (duree: number): number => vitesses.find((i) => i.t >= depart + duree)?.v ?? NaN;
  assert.ok(apres(1 / 60) < 0.12 * pointe, `une image après son départ, il va déjà à ${Math.round(apres(1 / 60))} px/s`);
  assert.ok(apres(0.05) > 0.4 * pointe && apres(0.05) < 0.8 * pointe, `50 ms après son départ : ${Math.round(apres(0.05))} px/s`);
  // Sa plus grande vitesse : moins de huit fois son diamètre par seconde, pour un chemin de 800 px fait en trois quarts de seconde.
  assert.ok(pointe < 8 * 2 * PLATINE.disque.rayon, `pointe à ${Math.round(pointe)} px/s`);
  // Il ne dépasse ni l'endroit où il sort, ni le centre du plateau : ni plus à gauche que l'un, ni plus au fond que l'autre.
  const [xs, ys] = [images.map((i) => i.valeurs['disque.x']), images.map((i) => i.valeurs['disque.y'])];
  assert.ok(Math.min(...xs) >= sorti.en[0] - 1e-6, `il dépasse sa sortie de ${(sorti.en[0] - Math.min(...xs)).toFixed(2)} px`);
  assert.ok(Math.min(...ys) >= surLePlateau.en[1] - 1e-6, `il dépasse l'axe de ${(surLePlateau.en[1] - Math.min(...ys)).toFixed(2)} px`);
  assert.ok(Math.max(...xs) <= dansLaPochette.en[0] + 1e-6 && Math.max(...ys) <= dansLaPochette.en[1] + 1e-6);
  // Entre la sortie et l'envol, il ne s'arrête pas : il n'est jamais immobile avant d'être au-dessus de l'axe.
  const enChemin = vitesses.filter((i) => i.t > depart + 0.05 && i.t < 1 + TEMPS.disque.sePose - 0.1);
  assert.ok(Math.min(...enChemin.map((i) => i.v)) > 60, `il s'arrête en chemin : ${Math.round(Math.min(...enChemin.map((i) => i.v)))} px/s`);
  // La durée dépend de la distance : le vol, plus long que la sortie, lui prend plus de temps.
  const [tire, emporte] = [MATIERES.main.tire, MATIERES.main.emporte].map((main) => tempsDArriveeDuPortage(main, MATIERES.vinyle.suit));
  assert.ok(tire !== undefined && emporte !== undefined && distance(sorti.en, surLePlateau.en) > distance(dansLaPochette.en, sorti.en));
  assert.ok(emporte > tire + 0.02, `sortie ${Math.round(tire * 1000)} ms, vol ${Math.round(emporte * 1000)} ms`);
});

test('tant que le disque est pris dans sa pochette, le papier du devant le recouvre ; sorti, il ne l’est plus jamais', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [] };
  const suivi = suivreLaPiste();
  const horsDeLaPochette = KRAFT.cote / 2 + PLATINE.disque.rayon;
  let sortiA: number | undefined;
  for (let t = 0.9; t <= 14; t += 1 / 120) {
    const pose = suivi.poseA(scene, t);
    const dedans = kraftDeLaPiste(pose).disqueDedans;
    const loin = distance(pose.disque.en, PLACE_DU_KRAFT.centre) >= horsDeLaPochette;
    if (sortiA === undefined && !dedans) sortiA = t;
    if (sortiA === undefined) assert.ok(!loin || pose.disque.hauteur >= KRAFT.tranche, `à ${t.toFixed(3)} s`);
    else assert.ok(!dedans, `à ${t.toFixed(3)} s, le disque est repris dans sa pochette`);
    // Quand le papier cesse de le recouvrir, il n'en reste rien dessous : rien ne change à l'image.
    if (!dedans && t < 1.6) assert.ok(distance(pose.disque.en, PLACE_DU_KRAFT.centre) >= horsDeLaPochette - 1.5, `à ${t.toFixed(3)} s`);
  }
  assert.ok(sortiA !== undefined && sortiA > 1 + TEMPS.disque.sort + 0.2 && sortiA < 1 + TEMPS.disque.traverse, `sorti à ${sortiA} s`);
  assert.equal(kraftDeLaPiste(POSE_AVANT_LA_PISTE).disqueDedans, true);
});

test('du « 3 » à la réponse, l’étiquette du disque ne sort jamais du cadre : elle y entre en sortant de sa pochette, et n’en ressort plus', () => {
  const marge = 4;
  for (const [rayuresA, reveleeA] of [
    [[7], 10],
    [[], 4.5],
  ] as const) {
    const scene: PisteEnScene = { piste: pisteJouee({ reveleeA }), rayuresA };
    const suivi = suivreLaPiste();
    let vues = 0;
    for (let t = 0.9; t <= reveleeA + 5; t += 1 / 120) {
      const pose = suivi.poseA(scene, t);
      const vu = regardDeLaPiste(pose);
      const [x, y] = surLEcran(pose.disque.en, pose.disque.hauteur + PLATINE.disque.epaisseur);
      const [gauche, droite] = [x - PLATINE.disque.etiquette - vu.origine[0], x + PLATINE.disque.etiquette - vu.origine[0]];
      const demiHauteur = surLEcran([0, PLATINE.disque.etiquette])[1];
      const [haut, bas] = [y - demiHauteur - vu.origine[1], y + demiHauteur - vu.origine[1]];
      // Elle ne touche jamais le bord gauche, ni le haut, ni le bas.
      assert.ok(
        gauche >= marge && haut >= marge && bas <= vu.hauteur - marge,
        `à ${t.toFixed(3)} s : étiquette de ${gauche.toFixed(1)} à ${droite.toFixed(1)} px`,
      );
      // Elle ne dépasse à droite que prise dans sa pochette, qui sort elle-même du cadre.
      if (kraftDeLaPiste(pose).disqueDedans) continue;
      vues++;
      assert.ok(
        droite <= vu.largeur - marge,
        `à ${t.toFixed(3)} s, hors de sa pochette : étiquette de ${gauche.toFixed(1)} à ${droite.toFixed(1)} px`,
      );
    }
    assert.ok(vues > 400);
  }
});

test('au « 2 », les repères du plateau dérivent puis se figent ; à la coupure du moteur, ils repartent en arrière', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const images = derouler({ piste, rayuresA: [] }, 0.9, 12.5, 120);
  const reperes = (de: number, jusqua: number): number[] => images.filter((i) => i.t >= de && i.t <= jusqua).map((i) => i.valeurs.reperes);
  const lancement = reperes(T.deux, T.deux + 2.5);
  assert.ok(Math.max(...lancement) - Math.min(...lancement) > 8, 'les repères dérivent pendant la mise en vitesse');
  const croisiere = reperes(T.deux + 3, T.revelation);
  assert.ok(Math.max(...croisiere) - Math.min(...croisiere) < 0.01, 'les repères sont figés à la bonne vitesse');
  const apres = reperes(T.moteurCoupe, T.moteurCoupe + 0.4);
  assert.ok((apres.at(-1) ?? 0) < (apres[0] ?? 0) - 2, 'les repères décrochent en arrière quand le moteur coupe');
  const arret = reperes(T.arret + 0.8, T.arret + 1.2);
  assert.ok(Math.max(...arret) - Math.min(...arret) < 0.01, 'les repères s’arrêtent avec le plateau');
});

test('au « 1 », le bras se lève, pivote jusqu’au bord, le dépasse à peine, puis descend ; le diamant touche à l’instant où l’extrait part', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const images = derouler(scene, 0.9, 5, 240);
  // La descente dure 620 ms (80 de moins que le brief, pour que le pivot ait fini), et le préavis du serveur la laisse toujours finir.
  proche(DESCENTE_DU_BRAS, 0.62, 0.01, 'durée de la descente du bras');
  assert.ok(DEROULE.preavis >= DESCENTE_DU_BRAS + TEMPS.descente.levier + 0.05, 'le préavis laisse au bras le temps de descendre');
  // Il dépasse le bord une seule fois, de peu.
  const avantLExtrait = images.filter((i) => i.t >= T.un && i.t < T.extrait);
  const versLeBord = avantLExtrait.map((i) => i.valeurs['bras.angle']);
  entre(Math.max(...versLeBord) - ANGLE_DU_BRAS_AU_BORD, 0.2, 0.8, 'dépassement du bras au bord du disque, en degrés');
  // Dans cet ordre, même quand le décompte ne lui laisse qu'une seconde : quand le levier le lâche, il est au bord ; son dépassement
  // culmine avant qu'il n'ait commencé à descendre ; et il est revenu sur le bord avant d'avoir descendu d'un px.
  const UN_PX_A_LA_TETE = degres(1 / PLATINE.bras.longueur);
  proche(a(scene, T.descente - TEMPS.descente.levier)['bras.angle'], ANGLE_DU_BRAS_AU_BORD, 2 * UN_PX_A_LA_TETE, 'le bras quand le levier se baisse');
  const auSommet = avantLExtrait.reduce((plusLoin, i) => (i.valeurs['bras.angle'] > plusLoin.valeurs['bras.angle'] ? i : plusLoin));
  assert.ok(auSommet.t < T.descente, `le dépassement culmine ${Math.round((auSommet.t - T.descente) * 1000)} ms après le début de la descente`);
  proche(auSommet.valeurs['bras.leve'], AMPLEURS.brasLeve, 0.1, 'levée du bras au sommet de son dépassement');
  const unPxPlusBas = avantLExtrait.find((i) => i.t > T.descente && i.valeurs['bras.leve'] <= AMPLEURS.brasLeve - 1);
  assert.ok(unPxPlusBas !== undefined);
  proche(unPxPlusBas.valeurs['bras.angle'], ANGLE_DU_BRAS_AU_BORD, UN_PX_A_LA_TETE / 4, 'le bras, descendu d’un px, est revenu sur le bord');
  // Levé, il ne touche jamais le disque avant l'heure ; à l'heure, il y est.
  for (const { t, valeurs: v } of images) {
    if (t > T.un + 0.2 && t < T.extrait - 0.005) assert.ok(v['bras.leve'] > 0.02, `à ${t.toFixed(3)} s le diamant touche avant l'extrait`);
  }
  proche(a(scene, T.extrait)['bras.leve'], 0, 1e-3, 'hauteur du diamant à l’instant où l’extrait part');
  // Il rebondit d'un px, une fois, sans s'enfoncer dans le disque.
  const apres = images.filter((i) => i.t > T.extrait && i.t < T.extrait + 0.4).map((i) => i.valeurs['bras.leve']);
  entre(Math.max(...apres), 0.9, 1.1, 'rebond du diamant');
  assert.ok(Math.min(...apres) > -0.2, 'le diamant ne s’enfonce pas dans le disque');
  // Le levier a basculé avant que le bras ne se lève, et s'est rebaissé avant qu'il ne descende.
  proche(a(scene, T.un + 0.2).levier, 1, 0.05, 'levier levé');
  proche(a(scene, T.descente + 0.1).levier, 0, 0.05, 'levier baissé pendant la descente');
});

test('si l’extrait tarde à charger, le plateau tourne, la pastille reste sur le « 1 » et le bras attend, levé au-dessus du bord', () => {
  const piste = pisteJouee({ pretsA: 6, reveleeA: null });
  const T = instantsDeLaPiste(piste);
  proche(T.extrait, 6 + DEROULE.preavis, 1e-9, 'l’extrait part après le préavis');
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const suivi = suivreLaPiste();
  for (let t = 0.9; t <= 8; t += 1 / 60) {
    const pose = suivi.poseA(scene, t);
    if (t > 4 && t < T.descente - TEMPS.descente.levier) {
      proche(pose.bras.leve, AMPLEURS.brasLeve, 0.05, `à ${t.toFixed(2)} s, le bras attend levé`);
      proche(pose.bras.angle, ANGLE_DU_BRAS_AU_BORD, 0.05, `à ${t.toFixed(2)} s, le bras attend au-dessus du bord`);
      proche(pose.levier, 1, 0.01, 'le levier le tient en l’air');
      assert.equal(pose.pastille.montre, '1');
      assert.equal(pose.disque.etiquette.montre, 'arcsLongs');
    }
  }
  proche(a(scene, T.extrait)['bras.leve'], 0, 1e-3, 'le diamant touche quand tout le monde est prêt');
  // Tant qu'on ne sait pas quand l'extrait part, une piste sans heure de départ attend de la même façon.
  proche(a({ piste: pisteLancee(), rayuresA: [] }, 9)['bras.leve'], AMPLEURS.brasLeve, 0.01, 'sans heure de départ, le bras reste levé');
});

/** Le rayon où se trouve le diamant pour un angle du bras. */
const rayonDuDiamant = (angle: number): number => distance(plus(PIVOT_DU_BRAS, fois(direction(angle), PLATINE.bras.longueur)), CENTRE_DU_PLATEAU);

test('pendant l’extrait, le bras avance à vitesse constante du bord du disque à l’étiquette, en ondulant à peine', () => {
  const piste = pisteJouee({ reveleeA: null });
  const T = instantsDeLaPiste(piste);
  const images = derouler({ piste, rayuresA: [] }, 0.9, T.extrait + piste.duree + 1, 60);
  const { de, a: fin } = AMPLEURS.course;
  for (const { t, valeurs: v } of images) {
    if (t < T.extrait + 0.5 || t > T.extrait + piste.duree) continue;
    const attendu = de + ((fin - de) * (t - T.extrait)) / piste.duree;
    proche(rayonDuDiamant(v['bras.angle']), attendu, 1.6, `rayon du diamant à ${t.toFixed(2)} s`);
  }
  proche(rayonDuDiamant(images.at(-1)?.valeurs['bras.angle'] ?? 0), fin, 1.2, 'le bras finit sur l’étiquette');
  // Sans l'ondulation, il serait exactement sur sa course.
  const milieu = T.extrait + piste.duree / 2;
  proche(rayonDuDiamant(angleDuChrono(piste, milieu)), (de + fin) / 2, 1e-6, 'le chrono est à mi-course à mi-extrait');
  assert.ok(fin > PLATINE.disque.etiquette, 'la course du bras s’arrête au bord de l’étiquette, pas dessus');
});

test('une mauvaise réponse ramène le disque de 20 degrés en arrière en 80 ms, le rend en 120 ms, puis il reprend sa vitesse sans dépasser celle du plateau', () => {
  const piste = pisteJouee({ reveleeA: null });
  const rate = 7;
  const scene: PisteEnScene = { piste, rayuresA: [rate] };
  const images = derouler(scene, 0.9, 10, 240);
  const valeur = (t: number, g: Grandeur): number => images[Math.round((t - 0.9) * 240)]?.valeurs[g] ?? NaN;
  const prise = valeur(rate, 'disque.angle');
  proche(valeur(rate + TEMPS.rayure.mainRend, 'disque.angle'), prise - AMPLEURS.rayure.recul, 1, 'recul du disque rayé');
  proche(valeur(rate + TEMPS.rayure.mainLache, 'disque.angle'), prise, 1, 'retour du disque rayé');
  const lache = rate + TEMPS.rayure.mainLache;
  let rapide = 0;
  for (let i = 1; i < images.length; i++) {
    const [avant, apres] = [images[i - 1], images[i]];
    if (avant === undefined || apres === undefined) continue;
    // Son étiquette tourne avec lui, sans rien y ajouter : elle ne se recale qu'à la révélation.
    assert.equal(apres.valeurs['etiquette.recalage'], 0);
    if (apres.t <= lache) continue;
    const vitesse = (apres.valeurs['disque.angle'] - avant.valeurs['disque.angle']) * 240;
    assert.ok(vitesse <= MATIERES.plateau.croisiere + 0.01, `à ${apres.t.toFixed(3)} s le disque tourne plus vite que le plateau : ${vitesse}`);
    if (apres.t <= lache + 0.9) rapide = vitesse;
  }
  assert.ok(rapide >= 0.95 * MATIERES.plateau.croisiere, `900 ms après avoir été lâché, le disque a repris sa vitesse : ${rapide}`);
  // Le bras tressaute d'un px, les repères du plateau accusent le coup puis se reprennent.
  const tressaut = images.filter((i) => i.t > rate && i.t < rate + 0.3).map((i) => i.valeurs['bras.leve']);
  entre(Math.max(...tressaut), 0.9, 1.1, 'tressaut du bras');
  const repos = valeur(rate, 'reperes');
  const creux = Math.min(...images.filter((i) => i.t > rate && i.t < rate + 0.6).map((i) => i.valeurs.reperes));
  entre(repos - creux, 0.5, AMPLEURS.rayure.repere, 'ce dont les repères accusent le coup');
  proche(valeur(rate + 2, 'reperes'), repos, 0.05, 'les repères se reprennent');
  // Une réponse donnée avant l'extrait ou après la révélation ne raye rien.
  const revelee = pisteJouee();
  const sans = derouler({ piste: revelee, rayuresA: [] }, 0.9, 13, 60);
  const horsJeu = derouler({ piste: revelee, rayuresA: [2.5, 10.5] }, 0.9, 13, 60);
  assert.deepEqual(horsJeu, sans);
});

test('à la révélation le disque ralentit en 2 s, ses arcs redeviennent du texte par paliers, et il s’arrête exactement à l’endroit', () => {
  for (const [rates, reveleeA] of [
    [[], 10],
    [[7], 10],
    [[5, 5.1, 9.95], 10],
    [[6.2], 8.37],
    [[], 4.02],
  ] as const) {
    const piste = pisteJouee({ reveleeA });
    const T = instantsDeLaPiste(piste);
    const scene: PisteEnScene = { piste, rayuresA: rates };
    proche(T.arret - T.moteurCoupe, 2, reveleeA < 5 ? 0.2 : 0.01, 'durée du ralentissement');
    const suivi = suivreLaPiste();
    const faces: string[] = [];
    let avant: PoseDeLaPiste | undefined;
    let peuApres: PoseDeLaPiste | undefined;
    for (let t = 0.9; t <= T.arret + 3; t += 1 / 120) {
      const pose = suivi.poseA(scene, t);
      if (t <= T.arret + 0.6) peuApres = pose;
      const { angle, angleDesArcs, montre } = pose.disque.etiquette;
      if (t >= T.revelation && faces.at(-1) !== montre) faces.push(montre);
      // Dès qu'on revoit l'étiquette, elle tourne à la vitesse du disque : elle s'est recalée sous ses arcs longs, sans qu'on le voie.
      // Ce qu'on voit ne change donc pas de vitesse en changeant de face, même si une main vient de rayer le disque.
      if (t > T.moteurCoupe && montre !== 'arcsLongs' && avant !== undefined) {
        const quoi = `à ${t.toFixed(3)} s (mauvaises réponses : ${rates.join(', ')})`;
        const duDisque = (angleDesArcs - avant.disque.etiquette.angleDesArcs) * 120;
        if (avant.disque.etiquette.montre !== 'arcsLongs')
          proche((angle - avant.disque.etiquette.angle) * 120, duDisque, 1e-6, `vitesse de l'étiquette ${quoi}`);
        // Et quand ses lettres reviennent, le disque a rejoint le plateau, à l'élan près qui lui reste d'une rayure toute proche.
        const duPlateau = regimeDuPlateau(piste, t - 1 / 240).vitesse;
        if (pose.disque.etiquette.fondu.texte > 0)
          proche(duDisque, duPlateau, rates.some((rate) => reveleeA - rate < 1.5) ? 60 : 1.5, `vitesse du disque ${quoi}`);
      }
      avant = pose;
    }
    assert.deepEqual(faces, ['arcsLongs', 'arcsCourts', 'texte'], 'les arcs redeviennent du texte par paliers');
    // À l'arrêt, l'étiquette est à l'endroit : à un centième de degré près si une main venait de rayer le disque, qui finit
    // de rattraper le plateau ; exactement, une fois tout retombé.
    const auTourPres = (angle: number): number => Math.abs(angle - 360 * Math.round(angle / 360));
    const quoi = `(mauvaises réponses : ${rates.join(', ')})`;
    proche(auTourPres(peuApres?.disque.etiquette.angle ?? NaN), 0, 0.01, `angle de l'étiquette peu après l'arrêt ${quoi}`);
    proche(auTourPres(avant?.disque.etiquette.angle ?? NaN), 0, 1e-6, `angle de l'étiquette une fois tout retombé ${quoi}`);
  }
});

test('au « 2 » et à la révélation, les lettres de l’étiquette se fondent en arcs : rien n’y saute d’une image à l’autre, et leur traînée reste derrière elles', () => {
  for (const reveleeA of [10, 4.02]) {
    const piste = pisteJouee({ reveleeA });
    const T = instantsDeLaPiste(piste);
    const scene: PisteEnScene = { piste, rayuresA: [] };
    const suivi = suivreLaPiste();
    const parts = (f: PoseDeLaPiste['disque']['etiquette']['fondu']): number[] => [f.texte, ...f.trainee, f.arcsCourts, f.arcsLongs];
    let avant: number[] | undefined;
    let enTrainee = 0;
    let lePlusVif = 0;
    for (let t = T.deux - 0.1; t <= T.arret + 0.5; t += 1 / 60) {
      const { fondu } = suivi.poseA(scene, t).disque.etiquette;
      const maintenant = parts(fondu);
      if (avant !== undefined) lePlusVif = Math.max(lePlusVif, ...maintenant.map((part, rang) => Math.abs(part - (avant?.[rang] ?? part))));
      // La traînée tourne en arrière des lettres : le disque tourne dans le sens des angles qui croissent.
      assert.ok(fondu.ecart >= 0, `à ${t.toFixed(3)} s la traînée passe devant les lettres`);
      if (fondu.trainee.some((part) => part > 0.05)) enTrainee++;
      // Sous 10 tours par minute, on lit le texte entier, sans arc.
      if (regimeDuPlateau(piste, t).vitesse < 60)
        assert.deepEqual([fondu.texte, fondu.arcsCourts, fondu.arcsLongs], [1, 0, 0], `à ${t.toFixed(3)} s`);
      avant = maintenant;
    }
    // Aucun dessin ne passe de rien à tout en moins de quatre images, à 60 images par seconde.
    assert.ok(lePlusVif <= 0.25, `un dessin de l’étiquette change de ${lePlusVif.toFixed(2)} d’une image à l’autre (révélée à ${reveleeA} s)`);
    assert.ok(enTrainee > 20, `la traînée ne se voit que pendant ${enTrainee} images`);
  }
});

test('à la révélation le levier relève le bras d’un coup sec, le bras retourne à son repos et s’y pose sans rebond', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const images = derouler(scene, 0.9, 13, 240);
  const pendant = (de: number, jusqua: number, g: Grandeur): number[] => images.filter((i) => i.t >= de && i.t <= jusqua).map((i) => i.valeurs[g]);
  // Relevé en moins de 150 ms, il dépasse à peine.
  entre(
    Math.max(...pendant(T.revelation, T.revelation + 0.15, 'bras.leve')),
    AMPLEURS.brasLeve,
    AMPLEURS.brasLeve * 1.12,
    'le bras relevé d’un coup sec',
  );
  // Il reste levé pendant tout son retour, et ne se pose qu'arrivé.
  const retour = TEMPS.revelation.brasSeRepose;
  assert.ok(Math.min(...pendant(T.revelation + 0.2, T.revelation + retour, 'bras.leve')) > AMPLEURS.brasLeve - 0.3);
  proche(a(scene, T.revelation + retour)['bras.angle'], PLATINE.bras.repos, 0.5, 'le bras est revenu au-dessus de son repos quand il se pose');
  const pose = pendant(T.revelation + retour + DESCENTE_DU_BRAS, 13, 'bras.leve');
  assert.ok(Math.max(...pose.map(Math.abs)) < 1e-3, 'posé sur son repos, le bras ne bouge plus');
  proche(a(scene, 13)['bras.angle'], PLATINE.bras.repos, 0.01, 'angle du bras au repos');
  proche(a(scene, 13).levier, 0, 0.01, 'le levier est rebaissé');
});

test('le disque arrêté se retourne sans toucher le plateau ni la pointe de l’axe, et se repose retourné ; le regard a glissé vers lui', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const images = derouler({ piste, rayuresA: [] }, 0.9, T.arret + 2.2, 240);
  const bordALEcran = surLEcran([0, PLATINE.disque.rayon])[1];
  for (const { t, valeurs: v } of images) {
    if (t < T.arret) {
      assert.equal(v['disque.retourne'], 0, 'le disque ne se retourne pas avant d’être arrêté');
      continue;
    }
    const penche = v['disque.retourne'];
    const bordLePlusBas = v['disque.hauteur'] - Math.abs(retournement(penche).montee) * bordALEcran;
    // Tant qu'il tourne, son bord ne passe jamais sous la feutrine ; retombé à plat, il la tasse d'un px, pas plus.
    const tasse = penche > 180 - 1e-6 ? 1.3 : 1e-6;
    assert.ok(bordLePlusBas > HAUTEURS.feutrine - tasse, `à ${t.toFixed(3)} s le bord du disque passe sous la feutrine : ${bordLePlusBas}`);
    // Penché, il ne peut pas être enfilé sur l'axe : il passe au-dessus de sa pointe.
    if (penche > 10 && penche < 170)
      assert.ok(v['disque.hauteur'] > HAUTEURS.feutrine + PLATINE.axe.depassement, `à ${t.toFixed(3)} s le disque penché touche l'axe`);
    entre(penche, -0.01, 180.01, 'le disque se retourne sans dépasser');
  }
  const fin = images.at(-1)?.valeurs;
  assert.ok(fin !== undefined);
  proche(fin['disque.retourne'], 180, 0.05, 'le disque est retourné');
  proche(fin['disque.hauteur'], HAUTEURS.feutrine, 0.05, 'le disque est reposé');
  proche(fin.regard, AMPLEURS.regardSurLaReponse, 0.05, 'le regard a glissé vers la réponse');
  // Le regard ne quitte la platine qu'une fois le disque arrêté et le bras reposé : on a vu toute la course du bras jusqu'à son repos.
  const R = TEMPS.retournement;
  const auDepart = a({ piste, rayuresA: [] }, T.arret + R.regard);
  proche(auDepart.regard, 0, 1e-9, 'le regard ne part qu’une fois le disque arrêté');
  proche(auDepart['bras.angle'], PLATINE.bras.repos, 0.05, 'le bras est revenu à son repos avant que le regard ne parte');
  proche(auDepart['bras.leve'], 0, 0.01, 'et il s’y est posé');
  proche(auDepart.levier, 0, 0.01, 'levier baissé');
  // Le disque lui répond à son arrivée : il se soulève quand le regard est presque sur lui, et se retourne quand il y est.
  proche(
    a({ piste, rayuresA: [] }, T.arret + R.seSouleve).regard,
    AMPLEURS.regardSurLaReponse,
    0.06 * Math.abs(AMPLEURS.regardSurLaReponse),
    'le regard arrive',
  );
  proche(
    a({ piste, rayuresA: [] }, T.retournement).regard,
    AMPLEURS.regardSurLaReponse,
    0.02 * Math.abs(AMPLEURS.regardSurLaReponse),
    'le regard est arrivé',
  );
  assert.ok(R.regard >= 0.03 && R.seSouleve - R.regard >= 0.3 && R.seRetourne - R.seSouleve >= 0.03);
});

test('retourné, le disque retombe à plat avec de l’élan : le plateau l’arrête net, la feutrine se tasse d’un px, et rien ne traîne', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const scene: PisteEnScene = { piste, rayuresA: [] };
  const images = derouler(scene, T.arret, T.arret + 2.5, 1000);
  const aPlat = images.find((i) => i.valeurs['disque.retourne'] >= 180 - 1e-6);
  assert.ok(aPlat !== undefined);
  const duree = aPlat.t - T.retournement;
  entre(duree, 0.6, 0.75, 'le temps que le disque met à se retourner');
  const rang = images.indexOf(aPlat);
  // Il tourne encore quand il arrive : il ne finit pas sa course en s'attardant.
  const vitesse = ((images[rang - 1]?.valeurs['disque.retourne'] ?? NaN) - (images[rang - 6]?.valeurs['disque.retourne'] ?? NaN)) * 200;
  entre(vitesse, 25, 60, 'sa vitesse quand il arrive à plat, en degrés par seconde');
  // Arrêté net : il ne dépasse pas le plat, et n'en bouge plus.
  for (const { t, valeurs: v } of images.slice(rang)) proche(v['disque.retourne'], 180, 1e-6, `angle du disque à ${t.toFixed(3)} s`);
  // La feutrine se tasse d'un px, comme au « 3 », puis il remonte à sa place et s'y tient.
  const apres = images.slice(rang);
  const tassement = HAUTEURS.feutrine - Math.min(...apres.map((i) => i.valeurs['disque.hauteur']));
  entre(tassement, 0.8, 1.2, 'tassement du disque retombé à plat');
  for (const { t, valeurs: v } of images.filter((i) => i.t > aPlat.t + 0.35))
    proche(v['disque.hauteur'], HAUTEURS.feutrine, 0.02, `hauteur du disque à ${t.toFixed(3)} s`);
  // Et il n'a jamais été sous le plateau avant de s'y poser.
  for (const { t, valeurs: v } of images.slice(0, rang))
    assert.ok(v['disque.hauteur'] >= HAUTEURS.feutrine - 1e-6, `à ${t.toFixed(3)} s le disque est sous sa place : ${v['disque.hauteur']}`);
  // Sans les réactions, il s'arrête net, sans tassement.
  const allege = creerLeMoteur<Grandeur>(TOLERANCES);
  const partition = partitionDeLaPiste(scene, { reactions: false });
  let auPlusBas = Infinity;
  for (let t = T.arret; t <= T.arret + 2.5; t += 1 / 1000) {
    allege.avancer(partition, t);
    auPlusBas = Math.min(auPlusBas, allege.valeur('disque.hauteur'));
  }
  proche(auPlusBas, HAUTEURS.feutrine, 1e-6, 'sans les réactions, le disque ne se tasse pas');
});

test('le retournement n’est pas le geste le plus vif : le bord du disque y va moins vite qu’au « 3 », et part sans à-coup', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const images = derouler({ piste, rayuresA: [] }, 0.9, T.arret + 2.5, 480);
  /** Le bord du disque le plus proche du joueur, à l'écran. */
  const bord = (v: Valeurs): readonly [number, number] => {
    const centre = surLEcran([v['disque.x'], v['disque.y']], v['disque.hauteur']);
    return [centre[0], centre[1] + retournement(v['disque.retourne']).aplatissement * surLEcran([0, PLATINE.disque.rayon])[1]];
  };
  const vitesses = images
    .slice(1)
    .map((image, rang) => ({ t: image.t, v: distance(bord(image.valeurs), bord(images[rang]?.valeurs ?? image.valeurs)) * 480 }));
  const pic = (de: number, a: number): number => Math.max(...vitesses.filter((i) => i.t > de && i.t <= a).map((i) => i.v));
  const [auTrois, enSeRetournant] = [pic(1, 2), pic(T.retournement, T.retournement + 1)];
  assert.ok(
    enSeRetournant < auTrois,
    `le bord du disque va à ${Math.round(enSeRetournant)} px/s en se retournant, ${Math.round(auTrois)} px/s au « 3 »`,
  );
  entre(enSeRetournant, 1500, 2200, 'vitesse du bord du disque qui se retourne, en px par seconde');
  // Il part sans à-coup : en un soixantième de seconde, il n'a pas tourné d'un degré.
  const depart = images.find((i) => i.t >= T.retournement + 1 / 60)?.valeurs['disque.retourne'] ?? NaN;
  entre(depart, 0, 1, 'ce dont il a tourné en une image');
});

test('la réponse se prépare au verso pendant que le disque ralentit : près de deux secondes avant qu’il ne se retourne, hors de tout départ', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const quand = T.reponseADessiner;
  assert.ok(quand > T.revelation + 0.5 && quand < T.retournement - 1.5, `à ${(quand - T.revelation).toFixed(2)} s de la révélation`);
  const pose = a({ piste, rayuresA: [] }, quand);
  proche(pose.regard, 0, 1e-9, 'le regard n’a pas encore bougé');
  proche(pose['disque.retourne'], 0, 1e-9, 'le disque montre encore son recto');
  // Rien d'autre ne démarre à cet instant : le dessin de la réponse ne tombe sur aucun départ.
  for (const instant of partitionDeLaPiste({ piste, rayuresA: [] }).instants) assert.ok(Math.abs(instant - quand) > 0.05, `un départ à ${instant} s`);
});

test('rien ne saute : chaque grandeur repart de sa position et de sa vitesse du moment à chaque changement de consigne', () => {
  const piste = pisteJouee();
  const scene: PisteEnScene = { piste, rayuresA: [7, 7.1, 9.99] };
  const partition = partitionDeLaPiste(scene);
  const coups = new Set(partition.coups.map((c) => `${c.a}/${c.grandeur}`));
  const T = instantsDeLaPiste(piste);
  const ecart = 1e-7;
  assert.ok(partition.instants.length >= 30, `${partition.instants.length} instants`);
  for (const instant of partition.instants) {
    const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
    moteur.poser(partition, 0.9);
    for (let t = 0.9; t < instant - 1 / 240; t += 1 / 240) moteur.avancer(partition, t);
    moteur.avancer(partition, instant - ecart);
    const avant = Object.fromEntries(GRANDEURS.map((g) => [g, { valeur: moteur.valeur(g), vitesse: moteur.vitesse(g) }]));
    moteur.avancer(partition, instant + ecart);
    for (const g of GRANDEURS) {
      const [de, vers] = [avant[g], { valeur: moteur.valeur(g), vitesse: moteur.vitesse(g) }];
      assert.ok(de !== undefined);
      assert.ok(Math.abs(vers.valeur - de.valeur) < 1e-3, `${g} saute à ${instant.toFixed(3)} s : de ${de.valeur} à ${vers.valeur}`);
      // Sa vitesse aussi se garde, sauf sous un coup, et sauf pour ce qui suit une trajectoire qui tourne court (la fin du chrono).
      const tourneCourt = g === 'bras.angle' && Math.abs(instant - T.revelation) < 1e-9;
      if (!coups.has(`${instant}/${g}`) && !tourneCourt)
        assert.ok(
          Math.abs(vers.vitesse - de.vitesse) < 0.05 + 1e-3 * Math.abs(de.vitesse),
          `la vitesse de ${g} saute à ${instant.toFixed(3)} s : de ${de.vitesse} à ${vers.vitesse}`,
        );
    }
  }
});

/** Ce dont chaque grandeur peut changer en 1/240 s au plus fort de son mouvement : au-delà, elle a sauté. */
const PAS_AU_PLUS: Valeurs = {
  'disque.x': 20,
  'disque.y': 20,
  'disque.hauteur': 6,
  'disque.retourne': 4,
  'disque.angle': 4,
  'etiquette.recalage': 4,
  reperes: 0.5,
  'bras.angle': 1,
  'bras.leve': 0.8,
  levier: 0.1,
  'pastille.hauteur': 1.5,
  'pastille.echelle': 0.04,
  'pastille.glisse': 2,
  'kraft.entrainee': 0.3,
  regard: 3,
};

/** Ce dont chaque grandeur a changé d'une pose à la suivante. */
function pasEntre(avant: PoseDeLaPiste, pose: PoseDeLaPiste): Valeurs {
  return {
    'disque.x': pose.disque.en[0] - avant.disque.en[0],
    'disque.y': pose.disque.en[1] - avant.disque.en[1],
    'disque.hauteur': pose.disque.hauteur - avant.disque.hauteur,
    'disque.retourne': pose.disque.retourne - avant.disque.retourne,
    'disque.angle': pose.disque.etiquette.angleDesArcs - avant.disque.etiquette.angleDesArcs,
    // L'étiquette ne se recale que cachée sous ses arcs longs : on ne suit ce dont elle tourne que lorsqu'on la voit.
    'etiquette.recalage': pose.disque.etiquette.montre === 'arcsLongs' ? 0 : pose.disque.etiquette.angle - avant.disque.etiquette.angle,
    reperes: pose.reperes - avant.reperes,
    'bras.angle': pose.bras.angle - avant.bras.angle,
    'bras.leve': pose.bras.leve - avant.bras.leve,
    levier: pose.levier - avant.levier,
    'pastille.hauteur': pose.pastille.hauteur - avant.pastille.hauteur,
    'pastille.echelle': pose.pastille.echelle - avant.pastille.echelle,
    'pastille.glisse': pose.pastille.glisse - avant.pastille.glisse,
    'kraft.entrainee': pose.kraft.entrainee - avant.kraft.entrainee,
    regard: pose.regard - avant.regard,
  };
}

/** Suit une piste qui change en route, image par image, et vérifie qu'aucune grandeur ne saute. Rend la dernière pose. */
function suivreSansSaut(etapes: readonly { readonly de: number; readonly scene: PisteEnScene }[], jusqua: number): PoseDeLaPiste {
  const suivi = suivreLaPiste();
  let avant: PoseDeLaPiste | undefined;
  for (let i = 0; i <= (jusqua - 0.9) * 240; i++) {
    const t = 0.9 + i / 240;
    const etape = etapes.filter((e) => e.de <= t + 1e-9).at(-1);
    assert.ok(etape !== undefined);
    const pose = suivi.poseA(etape.scene, t);
    if (avant !== undefined) {
      const pas = pasEntre(avant, pose);
      for (const g of GRANDEURS) assert.ok(Math.abs(pas[g]) <= PAS_AU_PLUS[g], `${g} saute de ${pas[g]} à ${t.toFixed(3)} s`);
    }
    avant = pose;
  }
  assert.ok(avant !== undefined);
  return avant;
}

test('d’une image à la suivante aucune pièce ne se téléporte, même quand la piste change en route', () => {
  // La piste change sous le moteur comme elle change en jeu : l'heure de l'extrait, deux mauvaises réponses, la révélation.
  suivreSansSaut(
    [
      { de: 0.9, scene: { piste: pisteLancee(), rayuresA: [] } },
      { de: 1.5, scene: { piste: pisteJouee({ reveleeA: null }), rayuresA: [] } },
      { de: 7, scene: { piste: pisteJouee({ reveleeA: null }), rayuresA: [7] } },
      { de: 7.1, scene: { piste: pisteJouee({ reveleeA: null }), rayuresA: [7, 7.1] } },
      { de: 10, scene: { piste: pisteJouee(), rayuresA: [7, 7.1] } },
    ],
    14.5,
  );
});

test('révélée avant l’heure, même en pleine mauvaise réponse, la piste se reprend en route et finit comme les autres : le disque retourné, à l’endroit', () => {
  // Le serveur n'attend pas toujours que le bras arrive à l'étiquette : dès que l'extrait joue, la réponse peut tomber.
  // Et le réseau peut traîner : la révélation n'est alors apprise qu'un moment après son heure.
  const cas: readonly { readonly revelee: number; readonly rayees: readonly number[]; readonly appriseApres?: number }[] = [
    { revelee: 4.02, rayees: [] },
    { revelee: 4.6, rayees: [] },
    { revelee: 6.37, rayees: [5.5] },
    { revelee: 7.03, rayees: [7] },
    { revelee: 7.12, rayees: [7] },
    { revelee: 7.25, rayees: [7, 7.2] },
    { revelee: 9.2, rayees: [7, 8.9] },
    { revelee: 8, rayees: [], appriseApres: 0.04 },
    { revelee: 8, rayees: [7.9], appriseApres: 0.25 },
    { revelee: 6.5, rayees: [], appriseApres: 0.8 },
  ];
  for (const { revelee, rayees, appriseApres = 0 } of cas) {
    const quoi = `révélée à ${revelee} s${appriseApres > 0 ? `, apprise ${appriseApres} s après` : ''}`;
    const piste = pisteJouee({ reveleeA: revelee });
    const fin = suivreSansSaut(
      [
        { de: 0.9, scene: { piste: pisteJouee({ reveleeA: null }), rayuresA: [] } },
        ...rayees.map((a, rang) => ({ de: a, scene: { piste: pisteJouee({ reveleeA: null }), rayuresA: rayees.slice(0, rang + 1) } })),
        { de: revelee + appriseApres, scene: { piste, rayuresA: rayees } },
      ],
      revelee + 5,
    );
    proche(fin.disque.retourne, 180, 0.05, `${quoi} : le disque est retourné`);
    proche(fin.disque.hauteur, HAUTEURS.feutrine, 0.05, `${quoi} : il est reposé`);
    proche(fin.bras.angle, PLATINE.bras.repos, 0.5, `${quoi} : le bras est à son repos`);
    proche(fin.bras.leve, 0, 0.05, `${quoi} : et posé`);
    proche(fin.regard, AMPLEURS.regardSurLaReponse, 0.05, `${quoi} : le regard est sur la réponse`);
    // Arrêté, il est exactement à l'endroit, où que le bras en ait été et quoi que la main lui ait fait.
    const angle = fin.disque.etiquette.angle;
    proche(angle - 360 * Math.round(angle / 360), 0, 0.05, `${quoi} : l'étiquette s'arrête à l'endroit`);
    assert.equal(fin.disque.etiquette.montre, 'texte', `${quoi} : on relit son étiquette`);
    // Le bras s'était arrêté où le chrono en était : il n'a pas fini sa course avant de se relever.
    if (appriseApres === 0) {
      const leve = a({ piste, rayuresA: rayees }, revelee + TEMPS.revelation.brasRetourne);
      proche(leve['bras.angle'], angleDuChrono(piste, revelee), 0.3, `${quoi} : le bras se relève d'où il était`);
    }
  }
});

/** Le moteur déroulé sur une piste à des instants donnés, dans l'ordre : la valeur de chaque grandeur à chacun de ceux qu'on demande. */
function valeursAux(scene: PisteEnScene, instants: readonly number[], demandes: readonly number[]): Valeurs[] {
  const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
  const partition = partitionDeLaPiste(scene);
  const aRendre = new Set(demandes);
  const rendues: Valeurs[] = [];
  for (const t of instants) {
    moteur.avancer(partition, t);
    if (aRendre.has(t)) rendues.push(Object.fromEntries(GRANDEURS.map((g) => [g, moteur.valeur(g)])) as Valeurs);
  }
  return rendues;
}

test('le mouvement est le même quel que soit le rythme des images : à 60, 120, 144 ou 50 par seconde, ou par à-coups', () => {
  // Chaque seconde ronde tombe sur une image à tous ces rythmes : c'est là qu'on compare.
  const secondes = Array.from({ length: 14 }, (_, i) => i + 1);
  const aRythmeRegulier = (parSeconde: number): number[] =>
    Array.from({ length: 14 * parSeconde + 1 }, (_, i) => i / parSeconde).filter((t) => t >= 0.9);
  // Des images qui arrivent par à-coups, de 4 à 45 ms, comme sur un téléphone qui peine : le tirage est toujours le même.
  const tirage = hasard(20261009);
  const parACoups: number[] = [];
  for (let [t, prochaine] = [0.9, 1]; t <= 14; t += tirage.entre(0.004, 0.045)) {
    for (; prochaine < t; prochaine++) parACoups.push(prochaine);
    parACoups.push(t);
  }
  parACoups.push(14);
  // Des rayures à des instants quelconques : l'une d'elles tombe pendant que la main n'a pas fini la précédente.
  for (const rayuresA of [[7, 7.13], [8.4], [5.123456, 5.19, 9.97], [4.004, 6.6666, 6.7]]) {
    const scene: PisteEnScene = { piste: pisteJouee(), rayuresA };
    const reference = valeursAux(scene, aRythmeRegulier(60), secondes);
    assert.equal(reference.length, secondes.length);
    for (const [nom, instants] of [
      ['120 images par seconde', aRythmeRegulier(120)],
      ['144 images par seconde', aRythmeRegulier(144)],
      ['50 images par seconde', aRythmeRegulier(50)],
      ['par à-coups', parACoups],
    ] as const) {
      const autres = valeursAux(scene, instants, secondes);
      assert.equal(autres.length, secondes.length, nom);
      reference.forEach((valeurs, i) => {
        for (const g of GRANDEURS)
          assert.ok(
            Math.abs(valeurs[g] - (autres[i]?.[g] ?? NaN)) < 1e-6,
            `${g} à ${secondes[i]} s, ${nom}, rayé à ${rayuresA.join(', ')} : ${autres[i]?.[g]} contre ${valeurs[g]}`,
          );
      });
    }
  }
});

/** Les scènes d'une piste telle qu'un écran l'apprend, action par action : lancée, prête, rayée, révélée. Chaque état est un autre objet. */
function scenesApprisesEnRoute(o: {
  readonly reveleeA: number;
  readonly rayees: readonly number[];
}): { readonly de: number; readonly scene: PisteEnScene }[] {
  const lancee = pisteLancee();
  const prete = pisteJouee({ reveleeA: null });
  return [
    { de: 0, scene: { rayuresA: [] } },
    { de: 1, scene: { piste: lancee, rayuresA: [] } },
    { de: 1.5, scene: { piste: prete, rayuresA: [] } },
    ...o.rayees.map((a, rang) => ({ de: a, scene: { piste: prete, rayuresA: o.rayees.slice(0, rang + 1) } })),
    { de: o.reveleeA, scene: { piste: pisteJouee({ reveleeA: o.reveleeA }), rayuresA: o.rayees } },
  ];
}

test('une piste apprise en route, action par action, se joue exactement comme une piste connue d’avance', () => {
  // En jeu, l'écran n'apprend la révélation qu'à son heure : c'est ainsi qu'il faut le suivre, pas avec la piste entière sous la main.
  for (const { reveleeA, rayees } of [
    { reveleeA: 14, rayees: [] },
    { reveleeA: 14, rayees: [7] },
    { reveleeA: 9.37, rayees: [6, 6.05, 9.3] },
    { reveleeA: 4.5, rayees: [] },
  ]) {
    const apprises = scenesApprisesEnRoute({ reveleeA, rayees });
    const entiere = apprises[apprises.length - 1]?.scene;
    assert.ok(entiere !== undefined);
    const [enRoute, dAvance] = [suivreLaPiste(), suivreLaPiste()];
    let pire = 0;
    for (let i = 0; i <= (reveleeA + 6) * 60; i++) {
      const t = i / 60;
      const apprise = apprises.filter((e) => e.de <= t).at(-1)?.scene;
      assert.ok(apprise !== undefined);
      const pas = pasEntre(dAvance.poseA(entiere, t), enRoute.poseA(apprise, t));
      for (const g of GRANDEURS) {
        pire = Math.max(pire, Math.abs(pas[g]));
        assert.ok(Math.abs(pas[g]) < 1e-6, `${g} à ${t.toFixed(3)} s, révélée à ${reveleeA} s : la piste apprise en route s'écarte de ${pas[g]}`);
      }
    }
    assert.ok(pire < 1e-6);
  }
});

test('la piste finie, plus rien ne bouge : d’une image à la suivante, chaque pièce reste où elle est', () => {
  for (const sobre of [false, true]) {
    const apprises = scenesApprisesEnRoute({ reveleeA: 9, rayees: [7] });
    const suivi = suivreLaPiste();
    const allure = { sobre, reactions: true };
    const poseA = (t: number): PoseDeLaPiste => {
      const apprise = apprises.filter((e) => e.de <= t).at(-1)?.scene;
      assert.ok(apprise !== undefined);
      return suivi.poseA(apprise, t, allure);
    };
    let avant = poseA(0);
    for (let i = 1; i <= 20 * 60; i++) {
      const pose = poseA(i / 60);
      // Tout est retombé six secondes après la révélation : le disque est retourné, le bras reposé.
      if (i / 60 > 15) {
        const pas = pasEntre(avant, pose);
        for (const g of GRANDEURS)
          assert.ok(Math.abs(pas[g]) < 1e-9, `${g} bouge encore de ${pas[g]} à ${(i / 60).toFixed(2)} s${sobre ? ', version sobre' : ''}`);
        assert.equal(pose.disque.etiquette.montre, avant.disque.etiquette.montre);
        assert.equal(pose.pastille.montre, undefined);
      }
      avant = pose;
    }
    proche(avant.disque.retourne, 180, 1e-6, 'le disque montre sa réponse');
  }
});

/** Deux poses se valent si chaque pièce est au même endroit, à une marge près ; les angles de ce qui tourne se comparent au tour près. */
function memePose(une: PoseDeLaPiste, autre: PoseDeLaPiste, marge: number, quoi: string): void {
  const auTourPres = (x: number): number => x - 360 * Math.round(x / 360);
  proche(distance(une.disque.en, autre.disque.en), 0, marge, `${quoi} : place du disque`);
  proche(une.disque.hauteur, autre.disque.hauteur, marge, `${quoi} : hauteur du disque`);
  proche(une.disque.retourne, autre.disque.retourne, marge, `${quoi} : retournement du disque`);
  proche(auTourPres(une.disque.etiquette.angle - autre.disque.etiquette.angle), 0, marge, `${quoi} : angle de l'étiquette`);
  assert.equal(une.disque.etiquette.montre, autre.disque.etiquette.montre, `${quoi} : face de l'étiquette`);
  proche(une.reperes, autre.reperes, marge, `${quoi} : repères`);
  proche(une.bras.angle, autre.bras.angle, marge, `${quoi} : angle du bras`);
  proche(une.bras.leve, autre.bras.leve, marge, `${quoi} : levée du bras`);
  proche(une.levier, autre.levier, marge, `${quoi} : levier`);
  assert.equal(une.pastille.montre, autre.pastille.montre, `${quoi} : chiffre de la pastille`);
  proche(une.kraft.entrainee, autre.kraft.entrainee, marge, `${quoi} : pochette kraft entraînée`);
  proche(une.regard, autre.regard, marge, `${quoi} : regard`);
}

test('un téléphone en retard se pose où en sont les choses, sans rien rejouer ; un trou de plus d’une seconde fait de même', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [7] };
  const continu = suivreLaPiste();
  const poses = new Map<number, PoseDeLaPiste>();
  for (let i = 0; i <= (15 - 0.9) * 60; i++) poses.set(i, continu.poseA(scene, 0.9 + i / 60));
  // À ces instants plus rien ne se rattrape : ce qui a été suivi depuis le début et ce qui arrive d'un coup se valent.
  for (const t of [0.9, 2.9, 3.9, 6.4, 9.4, 15]) {
    const suivie = poses.get(Math.round((t - 0.9) * 60));
    assert.ok(suivie !== undefined);
    memePose(suivreLaPiste().poseA(scene, t), suivie, 0.06, `arrivée à ${t} s`);
  }
  // Un écran figé plus d'une seconde (un onglet caché) ne rejoue pas ce qu'il a manqué : il se recale.
  const fige = suivreLaPiste();
  fige.poseA(scene, 0.95);
  const recale = fige.poseA(scene, 2.9);
  memePose(recale, suivreLaPiste().poseA(scene, 2.9), 1e-9, 'après un trou');
  // Et l'horloge qu'on remet en arrière (une piste rejouée) repose tout, sans élan.
  memePose(fige.poseA(scene, 0.95), POSE_AVANT_LA_PISTE, 1e-9, 'retour avant la piste');
});

test('sans les réactions, l’action principale ne change pas d’un instant, et rien ne finit ailleurs : seuls manquent le tassement, le rebond, l’ondulation et le coup accusé', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [7, 7.4] };
  const [entiere, allegee] = [gestesDeLaPiste(scene), gestesDeLaPiste(scene, { reactions: false })];
  // Les gestes de l'action principale partent aux mêmes instants : rien n'est retardé ni avancé. Seuls manquent ceux des réactions.
  const departs = (gestes: typeof entiere): string[] =>
    GRANDEURS.flatMap((g) => gestes.roles[g].etapes.map((geste) => `${g} : ${geste.nom ?? 'suite'} à ${geste.a}`)).sort();
  const retires = departs(entiere).filter((depart) => !departs(allegee).includes(depart));
  assert.deepEqual(
    departs(allegee).filter((depart) => !departs(entiere).includes(depart)),
    [],
    'sans les réactions, aucun geste de plus',
  );
  assert.ok(retires.length > 0 && retires.every((depart) => depart.startsWith('reperes ')), `gestes retirés : ${retires.join(' ; ')}`);
  // Ce qu'une réaction ajoute au plus à chaque grandeur ; partout ailleurs, les deux mouvements sont le même.
  // Le disque qui se pose sans se tasser arrive par un autre ressort : sa descente s'en écarte de moins de 3 px, sur un dixième de seconde.
  const reactions: Partial<Record<Grandeur, number>> = {
    'disque.hauteur': 3,
    'bras.leve': 1.2,
    'bras.angle': AMPLEURS.ondulation + 0.05,
    reperes: AMPLEURS.rayure.repere + 0.1,
  };
  const [avec, sans] = [creerLeMoteur<Grandeur>(TOLERANCES), creerLeMoteur<Grandeur>(TOLERANCES)];
  const [partition, partitionAllegee] = [partitionDeLaPiste(scene), partitionDeLaPiste(scene, { reactions: false })];
  const ecarts = Object.fromEntries(GRANDEURS.map((g) => [g, 0])) as Record<Grandeur, number>;
  for (let i = 0; i <= (14.5 - 0.9) * 120; i++) {
    const t = 0.9 + i / 120;
    avec.avancer(partition, t);
    sans.avancer(partitionAllegee, t);
    for (const g of GRANDEURS) ecarts[g] = Math.max(ecarts[g], Math.abs(avec.valeur(g) - sans.valeur(g)));
  }
  for (const g of GRANDEURS) {
    const permis = reactions[g] ?? 1e-9;
    assert.ok(ecarts[g] <= permis, `${g} s'écarte de ${ecarts[g]} sans les réactions`);
    // Et chaque réaction retirée existait bien : elle se voyait.
    if (reactions[g] !== undefined) assert.ok(ecarts[g] > 0.15, `${g} : la réaction ne changeait rien (${ecarts[g]})`);
  }
  // Alléger la scène en route ne déplace rien : la pochette kraft reste où le disque l'a laissée, à l'aller comme au retour.
  const suivi = suivreLaPiste();
  for (let t = 0.9; t <= 5; t += 1 / 60) suivi.poseA(scene, t);
  const laissee = suivi.poseA(scene, 5).kraft.entrainee;
  proche(laissee, AMPLEURS.entrainementDuKraft, 0.01, 'la pochette kraft, entraînée');
  for (const [depuis, allure] of [
    [5, { sobre: false, reactions: false }],
    [5.5, { sobre: false, reactions: true }],
  ] as const)
    for (let image = 1; image <= 30; image++)
      proche(
        suivi.poseA(scene, depuis + image / 60, allure).kraft.entrainee,
        laissee,
        1e-6,
        `la pochette kraft, ${image} images après avoir changé d’allure`,
      );

  // Les coups : il ne reste que ceux qui arrêtent net ce qui arrive avec de l'élan. La pastille sur le socle, le diamant sur le disque,
  // le bras sur son repos, le disque retombé à plat. Aucun ne laisse plus de vitesse à sa pièce.
  assert.deepEqual(
    allegee.coups.map((coup) => `${coup.signal} : ${coup.grandeur}`),
    [
      'trois : pastille.hauteur',
      'trois : pastille.echelle',
      'extrait : bras.leve',
      'revelation : bras.leve',
      'arret : disque.retourne',
      'arret : disque.hauteur',
    ],
  );
  assert.ok(entiere.coups.length === allegee.coups.length + 2, 'chaque rayure faisait tressauter le bras');
  for (const coup of allegee.coups) {
    const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
    moteur.poser(partitionAllegee, coup.a - 0.3);
    for (let t = coup.a - 0.3; t < coup.a; t += 1 / 240) moteur.avancer(partitionAllegee, t);
    moteur.avancer(partitionAllegee, coup.a - 1e-6);
    assert.ok(Math.abs(moteur.vitesse(coup.grandeur)) > 1e-3, `${coup.grandeur} arrive bien avec de l'élan`);
    moteur.avancer(partitionAllegee, coup.a + 1e-6);
    assert.ok(Math.abs(moteur.vitesse(coup.grandeur)) < 1e-6, `${coup.grandeur} n'est pas arrêtée net : ${moteur.vitesse(coup.grandeur)}`);
    assert.ok(Math.abs(moteur.ecart(coup.grandeur)) < 1e-6, `${coup.grandeur} n'est pas à sa place : ${moteur.ecart(coup.grandeur)}`);
  }
});

test('un coup qui arrête net tombe à l’instant même du geste qu’il arrête, à quelque heure que la piste se joue : les deux sont datés de la même façon', () => {
  // Des pistes aux heures quelconques : les appareils prêts tôt ou tard, la révélation en plein extrait ou à son terme.
  const tirage = hasard(20261010);
  let arrets = 0;
  for (let essai = 0; essai < 60; essai++) {
    const pretsA = tirage.entre(1.1, 6.5);
    const lancee = pisteJouee({ pretsA, reveleeA: null });
    assert.ok(lancee.extraitA !== undefined);
    const piste = pisteJouee({ pretsA, reveleeA: lancee.extraitA + tirage.entre(0.4, 10) });
    const scene: PisteEnScene = { piste, rayuresA: [lancee.extraitA + tirage.entre(0, 9)] };
    const { roles, coups } = gestesDeLaPiste(scene, { reactions: false });
    assert.equal(coups.length, 6, 'sans les réactions, il ne reste que les coups qui arrêtent net');
    for (const coup of coups) {
      // Au bit près : un geste daté autrement tomberait une image avant ou après son coup, et la pièce repartirait avec sa vitesse.
      assert.ok(
        roles[coup.grandeur].etapes.some((geste) => geste.a === coup.a),
        `${coup.grandeur} : un coup à ${coup.a} s, des gestes à ${roles[coup.grandeur].etapes.map((geste) => geste.a).join(', ')} s`,
      );
      arrets++;
    }
    // Avec les réactions, les mêmes coups sont aux mêmes instants : elles n'en déplacent aucun.
    const entiers = gestesDeLaPiste(scene).coups.filter((coup) => coup.nom !== 'brasTressaute');
    assert.deepEqual(
      entiers.map((coup) => [coup.grandeur, coup.a]),
      coups.map((coup) => [coup.grandeur, coup.a]),
    );
    // Et la pièce s'arrête bien là, quel que soit l'instant : arrivée avec de l'élan, elle n'en a plus un millionième de seconde après.
    if (essai % 5 !== 0) continue;
    const partition = partitionDeLaPiste(scene, { reactions: false });
    for (const coup of coups) {
      const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
      moteur.poser(partition, coup.a - 0.3);
      for (let t = coup.a - 0.3; t < coup.a; t += 1 / 240) moteur.avancer(partition, t);
      moteur.avancer(partition, coup.a - 1e-6);
      assert.ok(Math.abs(moteur.vitesse(coup.grandeur)) > 1e-3, `${coup.grandeur} arrive avec de l'élan`);
      moteur.avancer(partition, coup.a + 1e-6);
      assert.ok(
        Math.abs(moteur.vitesse(coup.grandeur)) < 1e-6,
        `${coup.grandeur} n'est pas arrêtée net à ${coup.a} s : ${moteur.vitesse(coup.grandeur)}`,
      );
    }
  }
  assert.equal(arrets, 360);
});

test('couper les réactions en pleine piste, ou les rendre, ne fait sauter aucune pièce', () => {
  // C'est ce que fait le mode léger quand on l'enclenche en route : le suivi reste le même, seule sa partition change.
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [7] };
  for (const bascules of [
    [1.2, 1.9],
    [4.05, 7.04],
    [7.1, 10.5],
    [12.3, 12.7],
  ]) {
    const suivi = suivreLaPiste();
    let avant: PoseDeLaPiste | undefined;
    for (let i = 0; i <= (15 - 0.9) * 240; i++) {
      const t = 0.9 + i / 240;
      // Les réactions sont coupées entre les deux instants.
      const reactions = !(t >= (bascules[0] ?? 0) && t < (bascules[1] ?? 0));
      const pose = suivi.poseA(scene, t, { sobre: false, reactions });
      if (avant !== undefined) {
        const pas = pasEntre(avant, pose);
        for (const g of GRANDEURS) assert.ok(Math.abs(pas[g]) <= PAS_AU_PLUS[g], `${g} saute de ${pas[g]} à ${t.toFixed(3)} s`);
      }
      avant = pose;
    }
  }
});

test('la version sobre change les pièces de place d’un coup : le disque ne tourne pas et garde ses arcs, le bras avance quand même', () => {
  const piste = pisteJouee();
  const T = instantsDeLaPiste(piste);
  const scene: PisteEnScene = { piste, rayuresA: [7] };
  const places = new Set<string>();
  let angleDAvant = -Infinity;
  let imagesRayees = 0;
  for (let t = 0.9; t <= 15; t += 1 / 30) {
    const pose = poseSobre(scene, t);
    // Le disque ne tourne pas, ni son étiquette, ni les repères du plateau. Une mauvaise réponse tient en deux images imprimées :
    // ses arcs reculent d'un coup, le temps que la main le tienne, puis reviennent.
    const raye = scene.rayuresA.some((r) => t >= r && t < r + TEMPS.rayure.mainLache);
    imagesRayees += raye ? 1 : 0;
    assert.deepEqual([pose.disque.etiquette.angle, pose.disque.etiquette.angleDesArcs, pose.reperes], [0, raye ? -AMPLEURS.rayure.recul : 0, 0]);
    // Les pièces n'ont que leurs places d'arrivée : aucune pose entre deux.
    assert.ok(pose.disque.retourne === 0 || pose.disque.retourne === 180);
    assert.ok(pose.bras.leve === 0 || pose.bras.leve === AMPLEURS.brasLeve);
    assert.ok(pose.levier === 0 || pose.levier === 1);
    if (t >= T.trois)
      assert.deepEqual([pose.pastille.hauteur, pose.pastille.echelle, pose.pastille.glisse], [0, 1, 0], 'la pastille est collée, ou n’est pas là');
    places.add(pose.disque.en.join(','));
    if (t >= T.extrait && t < T.revelation) {
      assert.ok(pose.bras.angle > angleDAvant, 'le bras avance : c’est le chrono');
      angleDAvant = pose.bras.angle;
    }
    // Il garde ses arcs tant qu'il est censé tourner, et montre sa réponse dès qu'elle tombe.
    if (t >= T.deux && t < T.revelation) assert.equal(pose.disque.etiquette.montre, 'arcsLongs', `à ${t.toFixed(2)} s`);
    if (t >= T.revelation) assert.deepEqual([pose.disque.retourne, pose.regard], [180, AMPLEURS.regardSurLaReponse]);
  }
  assert.deepEqual([...places], [HALTES_DU_DISQUE.dansLaPochette.en.join(','), HALTES_DU_DISQUE.surLePlateau.en.join(',')]);
  assert.ok(imagesRayees >= 5, `la mauvaise réponse se voit pendant ${imagesRayees} images à 30 par seconde`);
  // Hors de l'extrait, une réponse ne raye rien, là non plus.
  assert.equal(poseSobre({ piste, rayuresA: [2.5, 10.5] }, 2.55).disque.etiquette.angleDesArcs, 0);
  assert.equal(poseSobre({ piste, rayuresA: [2.5, 10.5] }, 10.55).disque.etiquette.angleDesArcs, 0);
  // Chaque pose est celle où la version animée finit par s'arrêter : on les compare aux instants où celle-ci est au repos.
  // Le disque animé tourne, le sobre non : on ne compare pas leurs angles.
  const animee = suivreLaPiste();
  const sansTourner = (pose: PoseDeLaPiste): PoseDeLaPiste => ({
    ...pose,
    reperes: 0,
    disque: { ...pose.disque, etiquette: { ...pose.disque.etiquette, angle: 0, angleDesArcs: 0 } },
  });
  const auRepos = [T.trois - 0.02, T.un - 0.02, T.extrait + 2.4, T.revelation - 0.02, 15];
  let prochain = 0;
  for (let i = 0; prochain < auRepos.length; i++) {
    const t = 0.9 + i / 120;
    const pose = animee.poseA(scene, t);
    const instant = auRepos[prochain];
    if (instant === undefined || t < instant) continue;
    // Le bras animé ondule à peine autour de sa course, et finit de se poser : la marge couvre l'un et l'autre.
    memePose(poseSobre(scene, t), sansTourner(pose), AMPLEURS.ondulation + 0.06, `à ${t.toFixed(2)} s, sobre contre animée`);
    prochain++;
  }
  // Si l'extrait tarde, le bras sobre attend levé au-dessus du bord, comme l'animé, et la pastille reste sur le « 1 ».
  const lente: PisteEnScene = { piste: pisteJouee({ pretsA: 6, reveleeA: null }), rayuresA: [] };
  const enAttente = suivreLaPiste();
  let attend = POSE_AVANT_LA_PISTE;
  for (let t = 0.9; t <= 5; t += 1 / 60) attend = enAttente.poseA(lente, t);
  memePose(poseSobre(lente, 5), sansTourner(attend), 0.06, 'extrait lent, sobre contre animée');
  assert.deepEqual([poseSobre(lente, 5).pastille.montre, poseSobre(lente, 5).bras.leve], ['1', AMPLEURS.brasLeve]);
  assert.deepEqual(poseSobre({ rayuresA: [] }, 5), POSE_AVANT_LA_PISTE);
  // La pochette kraft, que le disque a entraînée, l'est dans la version sobre comme dans l'animée, avec ou sans les réactions.
  assert.equal(poseSobre(scene, 5).kraft.entrainee, AMPLEURS.entrainementDuKraft);
  // Passer de la version sobre à la version animée ne rejoue rien : le moteur est resté posé sur l'instant.
  const bascule = suivreLaPiste();
  bascule.poseA(scene, 2.9, { sobre: true, reactions: true });
  memePose(bascule.poseA(scene, 2.9 + 1 / 60), suivreLaPiste().poseA(scene, 2.9 + 1 / 60), 1e-6, 'retour des animations');
});

/** La pièce que fait bouger chaque grandeur : deux grandeurs d'une même pièce ne sont pas deux objets qui partent. */
const PIECE: Readonly<Record<Grandeur, string>> = {
  'disque.x': 'disque',
  'disque.y': 'disque',
  'disque.hauteur': 'disque',
  'disque.retourne': 'disque',
  'disque.angle': 'disque',
  'etiquette.recalage': 'disque',
  reperes: 'plateau',
  'bras.angle': 'bras',
  'bras.leve': 'bras',
  levier: 'levier',
  'pastille.hauteur': 'pastille',
  'pastille.echelle': 'pastille',
  'pastille.glisse': 'pastille',
  'kraft.entrainee': 'kraft',
  regard: 'regard',
};

/** Des pistes de toutes sortes : jouée d'un trait, extrait qui tarde, révélée avant l'heure, rayée coup sur coup, lancée sans heure de départ. */
const PISTES_DE_TOUTES_SORTES: readonly PisteEnScene[] = [
  { piste: pisteJouee(), rayuresA: [7] },
  { piste: pisteJouee({ pretsA: 6 }), rayuresA: [7.5, 9.99] },
  { piste: pisteJouee({ reveleeA: 4.3 }), rayuresA: [4.1, 4.15, 4.29] },
  { piste: pisteJouee({ reveleeA: null }), rayuresA: [5, 5.02, 5.04, 5.5, 5.7, 13] },
  { piste: pisteLancee(), rayuresA: [] },
];

test('les gestes de chaque grandeur sont écrits dans l’ordre où ils arrivent, quelle que soit la piste', () => {
  for (const scene of PISTES_DE_TOUTES_SORTES) {
    for (const options of [{ reactions: true }, { reactions: false }]) {
      const { roles, coups } = gestesDeLaPiste(scene, options);
      for (const g of GRANDEURS) {
        const instants = roles[g].etapes.map((geste) => geste.a);
        instants
          .slice(1)
          .forEach((instant, rang) =>
            assert.ok(instant >= (instants[rang] ?? 0), `${g} : un geste à ${instant} s après un geste à ${instants[rang]} s`),
          );
      }
      // Les coups aussi sont dans l'ordre ; on n'en donne qu'à ce qui touche quelque chose.
      coups.slice(1).forEach((coup, rang) => assert.ok(coup.a >= (coups[rang]?.a ?? 0), `un coup à ${coup.a} s après un coup à ${coups[rang]?.a} s`));
      for (const coup of coups)
        assert.ok(['bras.leve', 'pastille.hauteur', 'pastille.echelle', 'disque.retourne', 'disque.hauteur'].includes(coup.grandeur), coup.grandeur);
    }
  }
  // Et la partition ne s'arrête qu'aux instants de ses gestes : ceux qu'on ne connaît pas encore n'y sont pas.
  const sansHeure = partitionDeLaPiste(PISTES_DE_TOUTES_SORTES[4] ?? { rayuresA: [] });
  assert.ok(
    sansHeure.instants.length >= 8 && sansHeure.instants.every((instant) => Number.isFinite(instant) && instant < 5),
    sansHeure.instants.join(', '),
  );
  assert.deepEqual(partitionDeLaPiste({ rayuresA: [3] }).instants, [], 'avant la piste, rien ne bouge');
});

test('rien ne part en même temps : à chaque signal, deux pièces démarrent à 30 ms d’écart au moins', () => {
  const SIGNAUX: readonly Signal[] = ['trois', 'deux', 'un', 'extrait', 'rayure', 'revelation', 'arret'];
  let departs = 0;
  for (const scene of PISTES_DE_TOUTES_SORTES.slice(0, 3)) {
    const { roles, coups } = gestesDeLaPiste(scene);
    const nommes: (Pick<Geste, 'signal' | 'apres' | 'a'> & { readonly piece: string })[] = [
      ...GRANDEURS.flatMap((g) => roles[g].etapes.filter((geste) => geste.nom !== undefined).map((geste) => ({ ...geste, piece: PIECE[g] }))),
      ...coups.filter((coup) => coup.nom !== undefined).map((coup) => ({ ...coup, piece: PIECE[coup.grandeur] })),
    ];
    for (const signal of SIGNAUX) {
      // Le premier départ de chaque pièce, à ce signal : c'est là qu'elle démarre. Ses gestes suivants ne sont plus des départs.
      const premiers = new Map<string, number>();
      for (const geste of nommes.filter((g) => g.signal === signal))
        premiers.set(geste.piece, Math.min(premiers.get(geste.piece) ?? Infinity, geste.apres));
      assert.ok(premiers.size > 0, `rien ne part au signal « ${signal} »`);
      const ranges = [...premiers].sort((x, y) => x[1] - y[1]);
      ranges.slice(1).forEach(([piece, depart], rang) => {
        departs++;
        const [precedente, avant] = ranges[rang] ?? ['', 0];
        assert.ok(
          depart - avant >= 0.03 - 1e-9,
          `au signal « ${signal} », ${piece} part ${Math.round((depart - avant) * 1000)} ms après ${precedente}`,
        );
      });
    }
  }
  assert.ok(departs >= 30, `${departs} écarts vérifiés`);
});

test('à une rayure, le bras tressaute 30 ms après la main, sauf si la rayure suivante ou la révélation lui coupent court', () => {
  const tressauts = (scene: PisteEnScene): number[] =>
    gestesDeLaPiste(scene)
      .coups.filter((coup) => coup.nom === 'brasTressaute')
      .map((coup) => coup.a);
  const piste = pisteJouee({ reveleeA: 9 });
  assert.deepEqual(tressauts({ piste, rayuresA: [7] }), [7 + TEMPS.rayure.brasTressaute]);
  assert.deepEqual(tressauts({ piste, rayuresA: [7, 7.01] }), [7.01 + TEMPS.rayure.brasTressaute], 'rayé coup sur coup, il ne tressaute qu’une fois');
  assert.deepEqual(tressauts({ piste, rayuresA: [8.99] }), [], 'la révélation relève le bras avant qu’il ne tressaute');
  assert.deepEqual(tressauts({ piste, rayuresA: [3.5, 9.2] }), [], 'hors de l’extrait, on ne raye rien');
});

test('régler une piste déjà dessinée, ou la redessiner dans la même pose, donnent la même image', () => {
  const piste = pisteJouee();
  const scene: PisteEnScene = { piste, rayuresA: [7] };
  const regard = regardSurLaPlatine();
  const decor: DecorDeLaPiste = pisteDExemple(TEXTES);
  for (const [densite, instants] of [
    [DENSITES.sobre, [1.02, 1.2, 1.45, 1.9, 2.5, 3.2, 3.6, 4.02, 7.05, 7.5, 10.2, 11.2, 12.25, 12.4, 12.6, 13.5]],
    [DENSITES.fine, [1.45, 3.2, 12.45]],
  ] as const) {
    const dessiner = (pose: PoseDeLaPiste) =>
      dessinerLeMeuble({ regard, densite, objets: dessinerLaPiste(decor, VERSO_REVELE, pose, TEXTES, ENCRIER.largeur, densite) });
    const enImage = (arbre: ReturnType<typeof dessiner>): string => enSvg(arbre, { ...regard, tracerLeTexte: ENCRIER.tracer, titre: 'piste' });
    const auRepos = dessiner(POSE_AVANT_LA_PISTE);
    const reglages = regleurDeLaPiste(auRepos, densite);
    const suivi = suivreLaPiste();
    let t = 0.9;
    for (const instant of instants) {
      let pose = suivi.poseA(scene, t);
      for (; t <= instant; t += 1 / 60) pose = suivi.poseA(scene, t);
      assert.equal(enImage(regler(auRepos, reglages(pose))), enImage(dessiner(pose)), `pose à ${instant} s, densité ${densite.cle}`);
    }
    // Et l'on revient à la pose de départ comme on en est parti.
    assert.equal(enImage(regler(regler(auRepos, reglages(suivi.poseA(scene, t))), reglages(POSE_AVANT_LA_PISTE))), enImage(auRepos));
  }
  assert.throws(() => regleurDeLaPiste(dessinerLeMeuble({ regard, densite: DENSITES.sobre, objets: [] }), DENSITES.sobre), /pas de bras/);
});

/** Les paliers des ombres d'une scène, trouvés à leur place dans l'arbre : les sous-calques « palier » de chaque calque d'ombre. */
function paliersDesOmbres(arbre: Calque): Calque[] {
  return [...calquesParNom(arbre).values()]
    .filter((calque) => calque.role === 'ombre')
    .flatMap((ombre) => ombre.contenu.filter((d): d is Calque => d.genre === 'calque' && d.nom.startsWith(`${ombre.nom}/palier-`)));
}

test('ombres figées, les pièces bougent comme avant et leurs ombres s’en éloignent encore, d’un bloc : seuls leurs paliers ne s’écartent plus', () => {
  const scene: PisteEnScene = { piste: pisteJouee(), rayuresA: [7] };
  const regard = regardSurLaPlatine();
  const densite = DENSITES.sobre;
  const decor: DecorDeLaPiste = pisteDExemple(TEXTES);
  const dessiner = (pose: PoseDeLaPiste) =>
    dessinerLeMeuble({ regard, densite, objets: dessinerLaPiste(decor, VERSO_REVELE, pose, TEXTES, ENCRIER.largeur, densite) });
  const depart = dessiner(poseDeDepart(true));
  const [figees, animees] = [regleurDeLaPiste(depart, densite, true), regleurDeLaPiste(depart, densite)];
  assert.equal(poseDeDepart(false), POSE_AVANT_LA_PISTE);
  const nomsDesPaliers = new Set(paliersDesOmbres(depart).map((palier) => palier.nom as string));
  assert.ok(nomsDesPaliers.size >= 15, `${nomsDesPaliers.size} paliers d'ombre dans la scène`);
  /** Le retrait de chaque palier : la première de ses transformations. */
  const retraits = (arbre: Calque): unknown[] => paliersDesOmbres(arbre).map((palier) => [palier.nom, palier.transformations?.[0]]);
  const ecarteLesPaliers = (reglage: Reglage): boolean => 'ecarteLesPaliers' in reglage;
  // Au départ, la pastille n'est pas là ; mais son ombre est déjà celle d'une pastille collée.
  const collee = dessiner({ ...POSE_AVANT_LA_PISTE, pastille: { montre: '3', hauteur: 0, echelle: 1, glisse: 0 } });
  for (const nom of ['pastille-decompte/ombre', 'pastille-decompte/ombre/palier-1', 'pastille-decompte/ombre/palier-2'] as const)
    assert.deepEqual(calquesParNom(depart).get(nom)?.transformations, calquesParNom(collee).get(nom)?.transformations, nom);
  const suivi = suivreLaPiste();
  const sansReactions = { sobre: false, reactions: false };
  const T = instantsDeLaPiste(pisteJouee());
  // Le dernier instant tombe en plein retournement : le disque est vu presque par la tranche.
  const enPleinRetournement = T.retournement + 0.2;
  let t = 0.9;
  let reglesEnAnime = 0;
  for (const instant of [1.05, 1.5, 3.4, 7.05, 10.3, 12.45, enPleinRetournement]) {
    let pose = suivi.poseA(scene, t, sansReactions);
    for (; t <= instant; t += 1 / 60) pose = suivi.poseA(scene, t, sansReactions);
    const [sans, avec] = [figees(pose), animees(pose)];
    assert.ok(!sans.some(ecarteLesPaliers), `à ${instant} s, un palier s'écarte encore`);
    reglesEnAnime += avec.filter(ecarteLesPaliers).length;
    // Ce qui écarte les paliers ne se règle que sur eux ; tout le reste se règle comme avant : les pièces, la place, la portée
    // et l'angle de leurs ombres, dont les deux que porte le bras.
    assert.ok(avec.filter(ecarteLesPaliers).every((reglage) => nomsDesPaliers.has(reglage.calque)));
    assert.deepEqual(
      sans,
      avec.filter((reglage) => !ecarteLesPaliers(reglage)),
      `à ${instant} s`,
    );
    for (const ombre of ['bras/ombre', 'bras/ombre/plateau']) {
      assert.ok(nomsDesPaliers.has(`${ombre}/palier-1`), ombre);
      assert.ok(
        sans.some((reglage) => reglage.calque === `${ombre}/palier-1/tourne`),
        `à ${instant} s, l'ombre « ${ombre} » ne tourne plus avec le bras`,
      );
    }
    const [figee, animee] = [regler(depart, sans), regler(depart, avec)];
    assert.deepEqual(retraits(figee), retraits(depart), `à ${instant} s, les paliers ne se sont pas écartés`);
    // L'ombre de chaque pièce tombe au même endroit qu'avec des ombres animées : la place de son calque, puis sa portée.
    for (const ombre of ['disque/ombre', 'pastille-decompte/ombre', 'bras/ombre', 'bras/ombre/plateau', 'levier/ombre'] as const)
      assert.deepEqual(
        calquesParNom(figee).get(ombre)?.transformations,
        calquesParNom(animee).get(ombre)?.transformations,
        `${ombre} à ${instant} s`,
      );
    if (instant === 1.5) {
      // En vol, au « 3 », l'ombre du disque part vers le bas à droite : elle n'est pas restée droit sous lui.
      assert.ok(pose.disque.hauteur > 30, `le disque vole à ${pose.disque.hauteur} px`);
      const portee = calquesParNom(figee).get('disque/ombre')?.transformations?.[1];
      assert.ok(portee?.genre === 'glisser' && portee.de[0] > 10 && portee.de[1] > 10, `la portée de son ombre : ${JSON.stringify(portee)}`);
    }
    // L'ombre du disque garde sa forme du moment : ronde tant qu'il est à plat, écrasée quand il se retourne, et cachée
    // au même instant qu'avec des ombres animées, quand elle ne serait plus qu'une lame.
    const formes = (reglages: readonly Reglage[]): unknown[] =>
      reglages.filter(
        (reglage) => reglage.calque.startsWith('disque/ombre') && ('opacite' in reglage || reglage.transformation.genre === 'deformer'),
      );
    assert.deepEqual(formes(sans), formes(avec), `à ${instant} s`);
    assert.equal(formes(sans).length, 4, 'la forme de chacun de ses trois paliers, et si elle se voit');
    if (instant === enPleinRetournement) {
      const [palier] = sans.filter((reglage) => reglage.calque === 'disque/ombre/palier-1');
      assert.ok(palier !== undefined && 'transformation' in palier && palier.transformation.genre === 'deformer');
      assert.ok(Math.abs(palier.transformation.par[3]) < 0.9, 'en plein retournement, son ombre n’est plus ronde');
    }
  }
  assert.ok(reglesEnAnime > 100, `ombres animées, ces paliers sont bien réglés : ${reglesEnAnime} réglages`);
  // Au « 3 », la pastille a claqué sur le socle : la scène aux ombres figées la montre posée, son ombre serrée contre elle.
  const pose = suivreLaPiste().poseA(scene, 1.6);
  assert.ok(pose.pastille.hauteur < 0.05);
  const reglee = regler(depart, figees(pose));
  const reference = dessiner(pose);
  let compares = 0;
  for (const nom of [
    'pastille-decompte',
    'pastille-decompte/ombre',
    'pastille-decompte/ombre/palier-1',
    'pastille-decompte/ombre/palier-2',
  ] as const) {
    const [vue, attendue] = [calquesParNom(reglee).get(nom), calquesParNom(reference).get(nom)];
    assert.ok(vue?.transformations !== undefined && attendue?.transformations !== undefined, nom);
    assert.deepEqual(
      vue.transformations.map((transformation) => transformation.genre),
      attendue.transformations.map((transformation) => transformation.genre),
      nom,
    );
    vue.transformations.forEach((transformation, rang) => {
      const autre = attendue.transformations?.[rang];
      if (transformation.genre !== 'glisser' || autre?.genre !== 'glisser') return;
      compares++;
      assert.ok(distance(transformation.de, autre.de) < 0.1, `${nom} : à ${distance(transformation.de, autre.de)} px de sa place`);
    });
  }
  assert.ok(compares >= 4, `${compares} glissements comparés`);
});
