import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle, rectangle } from '../src/lowpoly/contours';
import { decalagesDOmbre } from '../src/lowpoly/ombrePortee';
import { aireSignee, anglesInterieurs, type Polygone } from '../src/lowpoly/polygones';
import { depuisLEcran, surLEcran } from '../src/lowpoly/projection';
import { distance, moins, tourner, type Vec2 } from '../src/lowpoly/vecteurs';
import { platineDeLAccueil } from '../src/planche/exemples';
import { AVATAR } from '../src/ressources/avatar';
import { DENSITES } from '../src/ressources/densites';
import { LAMPE } from '../src/ressources/lampe';
import { AMPLEURS } from '../src/ressources/mouvement';
import { PLATINE } from '../src/ressources/platine';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Aplat, Calque, Dessin } from '../src/scene/calque';
import { ombre, ombreAuPied, ombreDePile, reglerUneOmbre, reglerUneOmbreDePile } from '../src/scene/ombre';
import { HALTES_DU_DISQUE, supportSousLeDisque } from '../src/scene/piste/emplacements';
import {
  angleDuBrasAuRayon,
  CENTRE_DU_PLATEAU,
  dessinerLaPlatine,
  HAUTEURS,
  ombresDuBras,
  PIVOT_DU_BRAS,
  pointeQuiDepasse,
  reglerLaPlatine,
  type EtatDeLaPlatine,
} from '../src/scene/platine';
import { regler } from '../src/scene/reglage';
import { dessinEnSvg } from '../src/scene/rendu/svg';
import { calque, calques, dessins, IMAGES_DE_LA_PISTE, TOUTES_LES_IMAGES } from './planche';

const etendue = (contour: Polygone): { gauche: number; droite: number; haut: number; bas: number } => ({
  gauche: Math.min(...contour.map((p) => p[0])),
  droite: Math.max(...contour.map((p) => p[0])),
  haut: Math.min(...contour.map((p) => p[1])),
  bas: Math.max(...contour.map((p) => p[1])),
});
const estDeLEncreDesOmbres = (aplat: Aplat): boolean =>
  aplat.teinte === LAMPE.ombre.teinte && aplat.ton === LAMPE.ombre.ton && aplat.opacite === LAMPE.ombre.opacite;
const sousCalques = (c: Calque): Calque[] => c.contenu.flatMap((d) => (d.genre === 'calque' ? [d] : []));
const seul = (c: Calque | undefined): Dessin | undefined => (c?.contenu.length === 1 ? c.contenu[0] : undefined);

test('l’ombre d’une pièce du décor part de son pied et s’éclaircit par paliers, vers le bas à droite seulement', () => {
  const pied = rectangle(100, 100, 40, 20);
  const portee = ombreAuPied('platine/ombre', { silhouettes: [pied], hauteur: 16, support: 0 });
  assert.equal(portee.role, 'decor', 'elle ne bouge jamais : elle est figée avec le décor');
  assert.equal(portee.contenu.length, 3);
  const auSol = etendue(pied.map((p) => surLEcran(p)));
  let precedente = Math.abs(aireSignee(pied.map((p) => surLEcran(p))));
  for (const palier of portee.contenu) {
    assert.ok(palier.genre === 'aplat' && estDeLEncreDesOmbres(palier));
    const [trace] = palier.contours;
    assert.ok(trace !== undefined && palier.contours.length === 1);
    // Elle tient au pied de l'objet : elle ne dépasse ni en haut ni à gauche, et s'étire en bas et à droite.
    const e = etendue(trace);
    assert.ok(Math.abs(e.gauche - auSol.gauche) < 1e-9 && Math.abs(e.haut - auSol.haut) < 1e-9);
    assert.ok(e.droite > auSol.droite && e.bas > auSol.bas);
    // Elle part des coins en biais : un hexagone convexe, pas une copie décalée du rectangle.
    assert.equal(trace.length, 6);
    for (const angle of anglesInterieurs(trace)) assert.ok(angle > 90 - 1e-6 && angle < 180);
    // Chaque palier va plus loin que le précédent : là où ils se recouvrent, l'ombre fonce.
    assert.ok(Math.abs(aireSignee(trace)) > precedente);
    precedente = Math.abs(aireSignee(trace));
  }
  // Posée sur une surface plus haute que le bois, elle monte avec elle.
  const surLeSocle = ombreAuPied('platine/ombre', { silhouettes: [pied], hauteur: 16, support: 16, paliers: 2 });
  assert.equal(surLeSocle.contenu.length, 2);
  const [premier] = surLeSocle.contenu;
  assert.ok(premier?.genre === 'aplat' && premier.contours[0] !== undefined);
  assert.ok(Math.abs(etendue(premier.contours[0]).haut - (auSol.haut - 16)) < 1e-9);
});

/** La portée d'une ombre, et le retrait de chacun de ses paliers : ce que donnent leurs décalages, comptés depuis la pièce. */
function porteeEtRetraits(decalages: readonly Vec2[]): { portee: Vec2; retraits: Vec2[] } {
  const portee = decalages[decalages.length - 1];
  assert.ok(portee !== undefined);
  return { portee, retraits: decalages.map((de) => moins(de, portee)) };
}

test('l’ombre d’une pièce mobile s’éloigne de sa portée, et ses paliers s’écartent : on ne règle que des transformations, jamais leurs polygones', () => {
  const silhouettes = [cercle([0, 0], 8, 12)];
  const posee = ombre('levier/ombre', { en: [200, 300], silhouettes, hauteur: 10, support: 16, paliers: 2 });
  const { portee, retraits } = porteeEtRetraits(decalagesDOmbre(10, 2));
  assert.equal(posee.role, 'ombre');
  assert.deepEqual(
    posee.transformations,
    [
      { genre: 'glisser', de: surLEcran([200, 300], 16) },
      { genre: 'glisser', de: portee },
    ],
    'elle est posée là où est sa pièce, sur son support, puis s’en éloigne de sa portée',
  );
  const paliers = sousCalques(posee);
  assert.deepEqual(
    paliers.map((p) => p.nom),
    ['levier/ombre/palier-1', 'levier/ombre/palier-2'],
  );
  assert.deepEqual(
    paliers.map((p) => p.transformations),
    retraits.map((de) => [{ genre: 'glisser', de }]),
  );
  assert.deepEqual(retraits[1], [0, 0], 'le palier le plus lointain est à la portée même');
  assert.ok((retraits[0]?.[0] ?? 0) < 0 && (retraits[0]?.[1] ?? 0) < 0, 'le plus proche est en retrait, vers la pièce');
  for (const palier of paliers) {
    const forme = seul(palier);
    assert.ok(forme?.genre === 'aplat' && estDeLEncreDesOmbres(forme));
    assert.deepEqual(forme.contours, [silhouettes[0]?.map((p) => surLEcran(p))], 'chaque palier est la silhouette de la pièce, vue à l’écran');
  }

  // Soulevée, la pièce garde la même ombre : sa portée grandit, et son premier palier reste plus loin en retrait.
  const soulevee = ombre('levier/ombre', { en: [200, 300], silhouettes, hauteur: 30, support: 16, paliers: 2 });
  const sansTransformations = (c: Calque): Dessin[][] => sousCalques(c).map((p) => [...p.contenu]);
  assert.deepEqual(sansTransformations(soulevee), sansTransformations(posee));
  const [avant, apres] = [posee.transformations?.[1], soulevee.transformations?.[1]];
  assert.ok(avant?.genre === 'glisser' && apres?.genre === 'glisser' && apres.de[0] > avant.de[0] && apres.de[1] > avant.de[1]);
  const [serre, ecarte] = [sousCalques(posee)[0]?.transformations?.[0], sousCalques(soulevee)[0]?.transformations?.[0]];
  assert.ok(serre?.genre === 'glisser' && ecarte?.genre === 'glisser' && ecarte.de[0] < serre.de[0] && ecarte.de[1] < serre.de[1]);
  assert.equal(sousCalques(ombre('levier/ombre', { en: [0, 0], silhouettes, hauteur: 10, support: 0 })).length, 3, 'trois paliers par défaut');
  // Ce que le mouvement règle : les mêmes transformations, chacune à son rang ; seuls les retraits écartent les paliers.
  const reglages = reglerUneOmbre('levier/ombre', { en: [200, 300], silhouettes, hauteur: 30, support: 16, paliers: 2 });
  assert.deepEqual(regler(posee, reglages), soulevee);
  assert.deepEqual(
    reglages.map((reglage) => [reglage.calque, 'ecarteLesPaliers' in reglage]),
    [
      ['levier/ombre', false],
      ['levier/ombre', false],
      ['levier/ombre/palier-1', true],
      ['levier/ombre/palier-2', true],
    ],
  );
});

test('l’ombre d’une pile tourne avec elle, sous le même écrasement : glisser, puis écraser, puis tourner', () => {
  const carton = rectangle(-120, -120, 240, 240);
  const portee = ombreDePile('pochette-240/ombre', { en: [300, 200], angle: 6, silhouettes: [carton], hauteur: 3, support: 0 });
  const attendue = porteeEtRetraits(decalagesDOmbre(3));
  assert.equal(portee.role, 'ombre');
  assert.deepEqual(portee.transformations, [
    { genre: 'glisser', de: surLEcran([300, 200]) },
    { genre: 'glisser', de: attendue.portee },
  ]);
  const paliers = sousCalques(portee);
  assert.equal(paliers.length, 3);
  paliers.forEach((palier, i) => {
    assert.deepEqual(palier.transformations, [{ genre: 'glisser', de: attendue.retraits[i] }]);
    const plan = seul(palier);
    assert.ok(plan?.genre === 'calque');
    assert.deepEqual(plan.transformations, [{ genre: 'ecraser' }]);
    const tourne = seul(plan);
    assert.ok(tourne?.genre === 'calque' && tourne.nom === `pochette-240/ombre/palier-${i + 1}/tourne`);
    assert.deepEqual(tourne.transformations, [{ genre: 'tourner', de: 6 }]);
    const forme = seul(tourne);
    assert.ok(forme?.genre === 'aplat' && estDeLEncreDesOmbres(forme));
    assert.deepEqual(forme.contours, [carton], 'la silhouette est celle de la pile, à plat et sans angle : c’est son calque qui la tourne');
  });
});

test('une ombre qui tombe sur une surface dont elle peut déborder s’arrête à son bord : sa découpe ne bouge pas avec elle', () => {
  const pile = { en: [300, 200], angle: 30, silhouettes: [rectangle(-10, -5, 120, 10)], hauteur: 11.5, support: 28.5 } as const;
  const bord = [cercle([250, 180], 60, 24)];
  assert.equal(ombreDePile('bras/ombre', pile).decoupe, undefined, 'sans surface donnée, l’ombre tombe où elle veut');
  const decoupee = ombreDePile('bras/ombre/plateau', { ...pile, surface: bord });
  assert.equal(decoupee.decoupe, bord);
  assert.deepEqual(
    sousCalques(decoupee).map((c) => c.nom),
    ['bras/ombre/plateau/palier-1', 'bras/ombre/plateau/palier-2', 'bras/ombre/plateau/palier-3'],
  );
  // La découpe est hors des transformations du calque : dans le SVG, c'est un groupe autour de lui qui la porte.
  const svg = dessinEnSvg(decoupee, { tracerLeTexte: () => '' });
  assert.match(
    svg,
    /^<clipPath id="bras-ombre-plateau-decoupe"><path d="M[^"]+Z"\/><\/clipPath><g clip-path="url\(#bras-ombre-plateau-decoupe\)"><g id="bras-ombre-plateau" data-calque="bras\/ombre\/plateau" data-role="ombre" transform="translate\(/,
  );
  assert.equal([...svg.matchAll(/clip-path=/g)].length, 1);
  // Le mouvement ne règle que des transformations : l'ombre tourne et glisse derrière sa découpe, qui reste où elle est.
  const regles = reglerUneOmbreDePile('bras/ombre/plateau', { ...pile, angle: 75, surface: bord });
  assert.ok(regles.length >= 7 && regles.every((reglage) => 'transformation' in reglage));
  const tournee = regler(decoupee, regles);
  assert.equal(tournee.decoupe, bord);
});

test('le bras porte deux ombres : l’une sur le socle, qui passe sous le plateau ; l’autre sur le plateau, plus près de lui, qui s’arrête à son bord', () => {
  const { bourrelet, etiquette } = PLATINE.disque;
  const densite = DENSITES.fine;
  const aMiCourse = angleDuBrasAuRayon((bourrelet + etiquette) / 2);
  const { surLeSocle, surLePlateau } = ombresDuBras({ angle: aMiCourse, leve: 0 }, densite, 0, HAUTEURS.disque);
  // Sur le socle, c'est l'ombre d'une pièce à 24 px ; sur le disque, celle d'une pièce qui n'en est plus qu'à 11,5 px.
  assert.deepEqual([surLeSocle.support, surLeSocle.hauteur], [HAUTEURS.socle, PLATINE.bras.hauteur]);
  assert.deepEqual([surLePlateau.support, surLePlateau.hauteur], [HAUTEURS.disque, HAUTEURS.bras - HAUTEURS.disque]);
  assert.ok(surLePlateau.hauteur < surLeSocle.hauteur / 2, 'plus près de lui : au bord du plateau, l’ombre fait une marche');
  // Sans disque, c'est la feutrine qui la reçoit.
  assert.equal(ombresDuBras({ angle: aMiCourse, leve: 0 }, densite).surLePlateau.support, HAUTEURS.feutrine);
  // Chacune s'arrête au bord de ce qui la reçoit. Celle du socle, au bord de son dessus plat, en deçà de son chanfrein : au-delà,
  // c'est le bois, plus bas, et déjà dans l'ombre du socle.
  const [dessus, ...deTrop] = surLeSocle.surface ?? [];
  assert.ok(dessus !== undefined && deTrop.length === 0);
  const [x0, y0] = PLATINE.position;
  const { largeur, profondeur, chanfrein } = PLATINE.socle;
  const auSol = dessus.map((p) => depuisLEcran(p, HAUTEURS.socle));
  assert.ok(
    Math.abs(Math.min(...auSol.map((p) => p[0])) - (x0 + chanfrein)) < 1e-9 &&
      Math.abs(Math.max(...auSol.map((p) => p[0])) - (x0 + largeur - chanfrein)) < 1e-9,
  );
  assert.ok(
    Math.abs(Math.min(...auSol.map((p) => p[1])) - (y0 + chanfrein)) < 1e-9 &&
      Math.abs(Math.max(...auSol.map((p) => p[1])) - (y0 + profondeur - chanfrein)) < 1e-9,
  );
  // Sans ce bord, elle en déborderait : quand le bras arrive à l'étiquette, son contrepoids passe au-dessus du bord droit du socle,
  // et son ombre, portée plus loin encore, tomberait sur le noyer. Au repos, elle tient tout entière sur le socle.
  const bordDroit = Math.max(...dessus.map((p) => p[0]));
  const ombreAuPlusLoin = (angle: number): number => {
    const sur = ombresDuBras({ angle, leve: 0 }, densite).surLeSocle;
    const portee = ombreDePile('bras/ombre', sur).transformations?.find((t, rang, toutes) => t.genre === 'glisser' && rang === toutes.length - 1);
    assert.ok(portee !== undefined && portee.genre === 'glisser');
    return (
      Math.max(
        ...sur.silhouettes.flat().map((p) => surLEcran([PIVOT_DU_BRAS[0] + tourner(p, angle)[0], PIVOT_DU_BRAS[1] + tourner(p, angle)[1]])[0]),
      ) + portee.de[0]
    );
  };
  assert.ok(ombreAuPlusLoin(PLATINE.bras.repos) < bordDroit, 'au repos, elle tient sur le socle');
  const deborde = ombreAuPlusLoin(angleDuBrasAuRayon(etiquette)) - bordDroit;
  assert.ok(deborde > 5 && deborde < 20, `à l’étiquette, elle déborderait de ${deborde} px`);
  // Sa découpe est ce dessus, troué de ce que le plateau cache déjà à la lampe : elle ne bouge pas avec le bras.
  const decoupe = ombreDePile('bras/ombre', surLeSocle).decoupe ?? [];
  assert.deepEqual([...(decoupe[0] ?? [])].sort(), [...dessus].sort());
  assert.ok(
    decoupe.length > 1 && decoupe.slice(1).every((trou) => aireSignee(trou) * aireSignee(decoupe[0] ?? []) < 0),
    'ses trous tournent à l’envers',
  );
  // Celle du plateau, par son bord : un rond de son rayon, vu à la hauteur de sa lèvre.
  const [bord, ...autres] = surLePlateau.surface ?? [];
  assert.ok(bord !== undefined && autres.length === 0 && bord.length === densite.pansDeDisque);
  for (const p of bord) {
    const auSol = depuisLEcran(p, HAUTEURS.plateau - PLATINE.plateau.monte);
    assert.ok(Math.abs(distance(auSol, CENTRE_DU_PLATEAU) - PLATINE.plateau.rayon) < 1e-9);
  }
  // Le bras entier fait l'ombre du socle ; ce qui peut avancer au-dessus du plateau (le tube, la bague, le joint, la tête, son doigt) fait l'autre.
  assert.equal(surLeSocle.silhouettes.length, 10);
  assert.equal(surLePlateau.silhouettes.length, 5);
  for (const silhouette of surLePlateau.silhouettes) assert.ok(surLeSocle.silhouettes.includes(silhouette));
  // Le joint de la tête comble le jour entre la bague et le col de la coquille : il est à cheval sur les deux.
  const joint = surLePlateau.silhouettes[2];
  assert.ok(joint !== undefined && joint.length === 8);
  const [gauche, droite] = [Math.min(...joint.map((p) => p[0])), Math.max(...joint.map((p) => p[0]))];
  const [bague, tete] = [surLePlateau.silhouettes[1], surLePlateau.silhouettes[3]];
  assert.ok(bague !== undefined && tete !== undefined);
  assert.ok(Math.max(...bague.map((p) => p[0])) > gauche && Math.min(...tete.map((p) => p[0])) < droite);
  // Ces silhouettes ne dépendent que de la densité : d'une pose à l'autre ce sont les mêmes, on ne les refait pas à chaque image.
  const ailleurs = ombresDuBras({ angle: PLATINE.bras.repos, leve: 3 }, densite);
  assert.equal(ailleurs.surLeSocle.silhouettes, surLeSocle.silhouettes);
  assert.equal(ailleurs.surLePlateau.silhouettes, surLePlateau.silhouettes);
  assert.equal(ailleurs.surLePlateau.surface, surLePlateau.surface);
  // Dans la scène : l'ombre du socle est sous le plateau, celle du plateau sur le disque, toutes deux sous le bras.
  const extrait = IMAGES_DE_LA_PISTE.find((i) => i.fichier === 'piste-extrait');
  assert.ok(extrait !== undefined);
  const noms = calques(extrait.scene).map((c) => c.nom as string);
  const rangs = ['platine/decor', 'bras/ombre', 'plateau', 'disque', 'axe/pointe', 'bras/ombre/plateau', 'bras'].map((nom) => noms.indexOf(nom));
  assert.ok(rangs.every((rang) => rang >= 0));
  assert.deepEqual(
    rangs,
    [...rangs].sort((a, b) => a - b),
    'du fond vers l’avant',
  );
});

test('dans la platine, l’ombre que le bras porte sur le plateau tombe sur ce que le plateau lui présente : son disque dès qu’il y est enfilé, sa feutrine tant qu’il est vide', () => {
  const densite = DENSITES.fine;
  const { bourrelet, etiquette } = PLATINE.disque;
  const bras = { angle: angleDuBrasAuRayon((bourrelet + etiquette) / 2), leve: 0 };
  const NOM = 'bras/ombre/plateau';
  const platine = (pointeDeLAxe: number): EtatDeLaPlatine => ({ ...platineDeLAccueil(TEXTES), bras, pointeDeLAxe });
  /** L'ombre telle qu'elle tombe sur une surface à cette hauteur. */
  const sur = (support: number) => ombresDuBras(bras, densite, 0, support).surLePlateau;
  const [vide, garni] = [dessinerLaPlatine(platine(0), densite), dessinerLaPlatine(platine(pointeQuiDepasse(0)), densite)];
  assert.deepEqual(calque(vide, NOM), ombreDePile(NOM, sur(HAUTEURS.feutrine)), 'plateau vide : sur la feutrine');
  assert.deepEqual(calque(garni, NOM), ombreDePile(NOM, sur(HAUTEURS.disque)), 'disque enfilé : sur le disque');
  // Ce n'est pas la même ombre : plus près du bras, elle s'en écarte moins.
  assert.notDeepEqual(calque(vide, NOM).transformations, calque(garni, NOM).transformations);
  // Un disque qui passe plus haut que la pointe de l'axe n'est pas enfilé : le plateau est encore vide.
  const survole = dessinerLaPlatine(platine(pointeQuiDepasse(PLATINE.axe.depassement + 1)), densite);
  assert.deepEqual(calque(survole, NOM), calque(vide, NOM));
  // Et le mouvement la règle de même, sur la platine déjà dessinée : au disque qui se pose, elle remonte d'un coup avec lui.
  const reglee = (pointeDeLAxe: number) =>
    reglerLaPlatine({ reperes: 0, bras, levier: 0, pointeDeLAxe }, densite, calque(vide, 'bras')).filter((reglage) => reglage.calque.startsWith(NOM));
  assert.deepEqual(reglee(0), reglerUneOmbreDePile(NOM, sur(HAUTEURS.feutrine)));
  assert.deepEqual(reglee(pointeQuiDepasse(0)), reglerUneOmbreDePile(NOM, sur(HAUTEURS.disque)));
  assert.ok(reglee(0).length >= 4);
});

test('ce qui reçoit l’ombre du disque change de hauteur sans jamais sauter : du bois au socle, du socle au plateau, par où que le disque passe', () => {
  const { socle, disque, position } = PLATINE;
  // Aux trois haltes : le bois sous la pochette kraft, puis la feutrine.
  assert.equal(supportSousLeDisque(HALTES_DU_DISQUE.surLePlateau.en), HAUTEURS.feutrine);
  assert.ok(supportSousLeDisque(HALTES_DU_DISQUE.dansLaPochette.en) < HAUTEURS.socle, 'la pochette kraft n’est pas sur le socle');
  // La plus forte pente possible : le disque passe un bord du socle pendant que son centre s'éloigne de celui du plateau.
  const PAS = 0.25;
  const penteAuPlus = (HAUTEURS.socle + (HAUTEURS.feutrine - HAUTEURS.socle)) / (2 * disque.rayon);
  const tolere = 2 * penteAuPlus * PAS + 1e-9;
  let mesures = 0;
  let auPlus = 0;
  const hauteurs = new Set<number>();
  // Tout autour de la platine, et dessus : d'un quart de px en long, puis en large, la hauteur ne change que d'un rien.
  for (let x = position[0] - 2 * disque.rayon; x <= position[0] + socle.largeur + 2 * disque.rayon; x += 7)
    for (let y = position[1] - 2 * disque.rayon; y <= position[1] + socle.profondeur + 2 * disque.rayon; y += 7) {
      const ici = supportSousLeDisque([x, y]);
      hauteurs.add(Math.round(ici * 100));
      assert.ok(ici >= 0 && ici <= HAUTEURS.feutrine + 1e-9, `${ici} px de haut en ${x}, ${y}`);
      for (const voisin of [supportSousLeDisque([x + PAS, y]), supportSousLeDisque([x, y + PAS])]) {
        mesures++;
        auPlus = Math.max(auPlus, Math.abs(voisin - ici));
        assert.ok(Math.abs(voisin - ici) <= tolere, `en ${x}, ${y} : de ${ici} à ${voisin} px en un quart de px`);
      }
    }
  assert.ok(mesures > 5000 && auPlus > 0, `${mesures} mesures, ${auPlus} px au plus`);
  // Ce n'est pas un escalier : entre le bois et la feutrine, il passe par bien des hauteurs.
  assert.ok(hauteurs.size > 200, `${hauteurs.size} hauteurs différentes`);
  // Et le long du chemin du disque, de sa pochette au plateau : il monte sans à-coup.
  const [de, a] = [HALTES_DU_DISQUE.sorti.en, HALTES_DU_DISQUE.surLePlateau.en];
  const longueur = distance(de, a);
  let avant = supportSousLeDisque(de);
  for (let fait = PAS; fait <= longueur; fait += PAS) {
    const ici = supportSousLeDisque([de[0] + ((a[0] - de[0]) * fait) / longueur, de[1] + ((a[1] - de[1]) * fait) / longueur]);
    assert.ok(Math.abs(ici - avant) <= tolere, `à ${fait} px de la pochette : de ${avant} à ${ici} px`);
    avant = ici;
  }
});

/** Vrai si un point est dans un contour : on compte les côtés que croise une demi-droite partie de lui. */
function dedans(p: Vec2, contour: Polygone): boolean {
  let croises = 0;
  contour.forEach((a, i) => {
    const b = contour[(i + 1) % contour.length] ?? a;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) croises++;
  });
  return croises % 2 === 1;
}
const milieu = (contour: Polygone): Vec2 => [
  contour.reduce((somme, p) => somme + p[0], 0) / contour.length,
  contour.reduce((somme, p) => somme + p[1], 0) / contour.length,
];

test('ce qui survole le plateau n’a qu’une ombre : la tête n’en porte plus sur le socle, et le bras n’ajoute rien à l’ombre du plateau', () => {
  const densite = DENSITES.fine;
  const auBord = angleDuBrasAuRayon(AMPLEURS.course.de);
  const { surLeSocle } = ombresDuBras({ angle: auBord, leve: 0 }, densite, 0, HAUTEURS.disque);
  const dessinee = ombreDePile('bras/ombre', surLeSocle);
  // À l'écran, l'ombre du socle se voit partout autour du bras, sauf dans un trou : ce que le plateau cache déjà du socle à la lampe.
  const [cadre, trou, ...autres] = dessinee.decoupe ?? [];
  assert.ok(cadre !== undefined && trou !== undefined && autres.length === 0);
  assert.ok(aireSignee(cadre) > 0 && aireSignee(trou) < 0, 'le trou tourne à l’envers du cadre : c’est ce qui en fait un trou');
  // Ce trou est l'ombre du plateau, telle qu'elle est dessinée : son palier le plus lointain. Il contient le pied du plateau, et le déborde vers le bas à droite.
  const duPlateau = ombreAuPied('plateau/ombre', {
    silhouettes: [cercle(CENTRE_DU_PLATEAU, PLATINE.plateau.rayon, densite.pansDeDisque)],
    hauteur: PLATINE.plateau.epaisseur,
    support: HAUTEURS.socle,
  });
  const lointain = duPlateau.contenu[duPlateau.contenu.length - 1];
  assert.ok(lointain?.genre === 'aplat');
  const [trace] = lointain.contours;
  assert.ok(trace !== undefined);
  assert.ok(Math.abs(Math.abs(aireSignee(trou)) - Math.abs(aireSignee(trace))) < 1, 'la même étendue');
  const pied = surLEcran(CENTRE_DU_PLATEAU, HAUTEURS.socle);
  const [portee] = decalagesDOmbre(PLATINE.plateau.epaisseur).slice(-1);
  assert.ok(
    portee !== undefined &&
      dedans(pied, trou) &&
      dedans([pied[0] + PLATINE.plateau.rayon * 0.7 + portee[0] * 0.9, pied[1] + PLATINE.plateau.rayon * 0.7 * 0.5 + portee[1] * 0.9], cadre),
  );
  // Le cadre est assez grand pour que l'ombre n'en sorte à aucun angle, sans être démesuré : ses coordonnées s'écrivent sans perdre un dixième de px.
  const coteDuCadre = Math.max(...cadre.map((p) => p[0])) - Math.min(...cadre.map((p) => p[0]));
  assert.ok(coteDuCadre > 2 * PLATINE.bras.longueur && coteDuCadre < 2000, `un cadre de ${coteDuCadre} px`);
  // Chaque palier a la même découpe, donnée autour du pied du bras, là où est la pièce et non là où tombe son ombre :
  // tout, sauf ce qui est au-dessus du plateau. Le palier l'emporte en s'écartant.
  const plans = sousCalques(dessinee).map((palier) => seul(palier));
  assert.equal(plans.length, 3);
  const [tete, contrepoids] = [surLeSocle.silhouettes[8], surLeSocle.silhouettes[0]];
  assert.ok(tete !== undefined && contrepoids !== undefined);
  /** Un point du bras, donné le long de son axe, là où il est autour du pivot dans cette pose, vu à l'écran. */
  const aLEcran = (p: Vec2): Vec2 => surLEcran(tourner(p, auBord));
  for (const plan of plans) {
    assert.ok(plan?.genre === 'calque' && plan.nom.endsWith('/plan'));
    const [autour, auDessusDuPlateau, ...reste] = plan.decoupe ?? [];
    assert.ok(autour !== undefined && auDessusDuPlateau !== undefined && reste.length === 0);
    assert.ok(aireSignee(autour) > 0 && aireSignee(auDessusDuPlateau) < 0);
    // Le trou est l'emprise du plateau, vue du pied du bras.
    for (const p of auDessusDuPlateau) {
      const auSol = depuisLEcran(p, 0);
      assert.ok(Math.abs(distance([auSol[0] + PIVOT_DU_BRAS[0], auSol[1] + PIVOT_DU_BRAS[1]], CENTRE_DU_PLATEAU) - PLATINE.plateau.rayon) < 1e-6);
    }
    // La pointe au bord du disque, la tête est au-dessus du plateau : son ombre du socle ne se voit pas. Le contrepoids garde la sienne.
    assert.ok(dedans(aLEcran(milieu(tete)), auDessusDuPlateau), 'la tête est dans le trou');
    for (const p of tete) assert.ok(dedans(aLEcran(p), auDessusDuPlateau));
    assert.ok(!dedans(aLEcran(milieu(contrepoids)), auDessusDuPlateau) && dedans(aLEcran(milieu(contrepoids)), autour));
  }
  // Au repos, le bras est à côté du plateau : rien de lui n'est au-dessus, toute son ombre se voit.
  const [, auDessus] = (plans[0]?.genre === 'calque' ? plans[0].decoupe : undefined) ?? [];
  assert.ok(auDessus !== undefined);
  for (const silhouette of surLeSocle.silhouettes)
    assert.ok(!dedans(surLEcran(tourner(milieu(silhouette), PLATINE.bras.repos)), auDessus), 'au repos, aucune pièce du bras ne survole le plateau');
  // L'ombre que le bras porte sur le plateau, elle, n'a pas ces trous : elle s'arrête au bord du plateau, c'est tout.
  const surLePlateau = ombreDePile('bras/ombre/plateau', ombresDuBras({ angle: auBord, leve: 0 }, densite, 0, HAUTEURS.disque).surLePlateau);
  assert.equal(surLePlateau.decoupe?.length, 1);
  for (const palier of sousCalques(surLePlateau)) {
    const plan = seul(palier);
    assert.ok(plan?.genre === 'calque' && plan.decoupe === undefined);
  }
  // Le mouvement ne règle que des transformations : les découpes restent où elles sont, quoi que fasse le bras.
  const regles = regler(
    dessinee,
    reglerUneOmbreDePile('bras/ombre', ombresDuBras({ angle: PLATINE.bras.repos, leve: 7 }, densite, 0, HAUTEURS.disque).surLeSocle),
  );
  assert.deepEqual(regles.decoupe, dessinee.decoupe);
  assert.deepEqual(
    sousCalques(regles).map((palier) => {
      const plan = seul(palier);
      return plan?.genre === 'calque' ? plan.decoupe : undefined;
    }),
    plans.map((plan) => (plan?.genre === 'calque' ? plan.decoupe : undefined)),
  );
});

test('sur la planche, toute ombre est de la même encre, en deux ou trois paliers ; rien d’autre n’est translucide, sauf le rose des joues', () => {
  let ombres = 0;
  for (const image of TOUTES_LES_IMAGES) {
    for (const portee of calques(image.scene).filter((c) => c.role === 'ombre' || c.nom.endsWith('/ombre'))) {
      ombres++;
      assert.ok(portee.role === 'ombre' || portee.role === 'decor', `${image.fichier} : ${portee.nom}`);
      const aplats = dessins(portee);
      assert.ok(aplats.length === 2 || aplats.length === 3, `${image.fichier} : ${portee.nom} a ${aplats.length} paliers`);
      for (const aplat of aplats) assert.ok(aplat.genre === 'aplat' && estDeLEncreDesOmbres(aplat), `${image.fichier} : ${portee.nom}`);
      // Une ombre mobile n'a que des paliers, chacun dans son calque.
      if (portee.role === 'ombre') assert.equal(sousCalques(portee).length, portee.contenu.length, portee.nom);
    }
    // Hors des ombres, pas de voile ni de fondu : le seul aplat translucide est le rose posé sur les joues, quelle que soit la peau.
    const { teinte, ton, opacite } = AVATAR.joue;
    for (const c of calques(image.scene).filter((c) => !/\/ombre(\/|$)/.test(c.nom))) {
      for (const d of c.contenu) {
        if (d.genre === 'aplat' && d.opacite !== undefined)
          assert.deepEqual([d.teinte, d.ton, d.opacite], [teinte, ton, opacite], `${image.fichier} : ${c.nom}`);
      }
    }
  }
  assert.ok(ombres >= 50, `${ombres} ombres vérifiées`);
});
