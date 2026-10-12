import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectangle } from '../src/lowpoly/contours';
import type { FacettePeinte } from '../src/lowpoly/facette';
import { tonAPlat } from '../src/lowpoly/ombrage';
import { aireSignee, plusPetitAngle, type Polygone } from '../src/lowpoly/polygones';
import { pochetteDExemple } from '../src/planche/exemples';
import { DESSUS, TETES, type CleDeDessus, type CleDeTete } from '../src/ressources/avatar';
import { MESURES_DE_POCHETTE as M, type Pochette } from '../src/ressources/pochettes';
import { TEXTES } from '../src/ressources/textes.fr';
import { CORPS, ECHELONS, HAUTEUR_DE_CAPITALE } from '../src/ressources/typo';
import { dessinerLAvatar } from '../src/scene/avatar';
import { aplat, calque as groupe, peinture, type Dessin, type Texte } from '../src/scene/calque';
import { dessinerLaPochette } from '../src/scene/pochette';
import { chanfreinDuCarton, coinsUses, contourDuCarton } from '../src/scene/pochette/carton';
import { deplacerLesTons, rogner } from '../src/scene/retouche';
import { calque, calques, dessins, ENCRIER } from './planche';

const EXEMPLE = pochetteDExemple(TEXTES);
const UTILE = M.cote - 2 * M.marge;
/** Le plus long des titres d'album que le brief donne en exemple. */
const LONG_TITRE = 'Reprises que personne n’a demandées';

const poser = (pochette: Pochette, taille = 240) =>
  dessinerLaPochette(pochette, { nom: 'pochette-essai', centre: [300, 200], angle: -4, taille, expression: 'content' }, ENCRIER.largeur);
const textesDe = (pochette: Pochette, taille = 240): Texte[] =>
  dessins(poser(pochette, taille).pochette).flatMap((d) => (d.genre === 'texte' ? [d] : []));
const centre = (contour: Polygone): [number, number] => [
  contour.reduce((somme, p) => somme + p[0], 0) / contour.length,
  contour.reduce((somme, p) => somme + p[1], 0) / contour.length,
];

test('un nom d’artiste descend l’échelle typographique tant qu’il est trop long, puis est abrégé : il ne sort jamais du carton', () => {
  const noms = ['Jo', 'Tonton Reverb', 'DJ Saucisson Sec', 'Les Démons de Minuit', 'Mademoiselle Chantilly et son grand orchestre de bal musette'];
  const corps = noms.map((artiste) => {
    const [nom] = textesDe({ ...EXEMPLE, artiste });
    assert.ok(nom?.role === 'titrage', artiste);
    assert.ok(ENCRIER.largeur(nom) <= UTILE, `« ${nom.contenu} » fait ${ENCRIER.largeur(nom).toFixed(0)} px pour ${UTILE}`);
    assert.ok(
      ECHELONS.some((echelon) => CORPS[echelon] === nom.corps),
      `corps ${nom.corps}`,
    );
    // Abrégé, il l'est au plus petit corps seulement, et il le dit par une ellipse.
    if (nom.contenu !== artiste)
      assert.ok(nom.contenu.endsWith('…') && artiste.startsWith(nom.contenu.slice(0, -1).trimEnd()) && nom.corps === CORPS.gravure);
    return nom.corps;
  });
  assert.equal(corps[0], CORPS.grandTitre, 'un nom court prend le plus grand corps prévu, pas plus');
  assert.equal(corps[1], CORPS.grandTitre);
  assert.ok((corps[2] ?? 0) < CORPS.grandTitre && (corps[3] ?? 0) < (corps[2] ?? 0), `les corps descendent : ${corps.join(', ')}`);
  assert.equal(corps[4], CORPS.gravure);
  assert.ok(textesDe({ ...EXEMPLE, artiste: noms[4] ?? '' })[0]?.contenu.endsWith('…'));
});

test('les huit titres d’album du brief tiennent entiers sur une pochette de 240 px, le plus long compris', () => {
  const duBrief = [
    'Live à la salle des fêtes',
    'Best of des fausses notes',
    'Unplugged dans la cuisine',
    'Le refrain seulement',
    'Volume 2 (il n’y a pas de volume 1)',
    LONG_TITRE,
    'Enregistré chez mamie',
    'Sans autotune (hélas)',
  ];
  for (const album of duBrief) assert.equal(textesDe({ ...EXEMPLE, album })[1]?.contenu, album);
});

test('une ligne trop petite pour être lue n’est pas imprimée : sur une pochette réduite, le titre s’efface avant le nom', () => {
  const lignes = (taille: number): string[] => textesDe(EXEMPLE, taille).map((t) => t.contenu);
  assert.deepEqual(lignes(240), [EXEMPLE.artiste, EXEMPLE.album]);
  assert.deepEqual(lignes(200), [EXEMPLE.artiste], 'à 200 px, le titre ferait moins de 10 px de haut à l’écran');
  assert.deepEqual(lignes(M.miniature.jusqua), [], 'une miniature n’a plus de texte du tout');
  assert.deepEqual(lignes(48), []);
  // Les textes sont à l'échelle de la pochette : un échelon, multiplié par sa taille, rien d'autre.
  const [nom] = textesDe(EXEMPLE, 200);
  assert.ok(
    ECHELONS.some((echelon) => Math.abs(CORPS[echelon] * (200 / M.cote) - (nom?.corps ?? 0)) < 1e-9),
    `corps ${nom?.corps}`,
  );
});

test('une pochette est une pile figée en image : une tranche de 3 px, l’imprimé dessus, son ombre à part qui tourne avec elle', () => {
  for (const taille of [240, 48]) {
    const { pochette, ombre } = poser(EXEMPLE, taille);
    assert.equal(pochette.role, 'image');
    const etages = pochette.contenu.flatMap((d) => (d.genre === 'calque' ? [d.nom] : []));
    assert.deepEqual(etages, [
      'pochette-essai/niveau-1',
      'pochette-essai/niveau-2',
      // Le disque glissé dedans, qui dépasse du haut, entre les étages de la tranche.
      'pochette-essai/disque',
      'pochette-essai/niveau-3',
      'pochette-essai/niveau-4',
      'pochette-essai/imprime',
    ]);
    assert.equal(M.tranche, 3, 'la tranche fait 3 px, quelle que soit la taille de la pochette');
    assert.equal(ombre.role, 'ombre');
    assert.equal(ombre.nom, 'pochette-essai/ombre');
    const angles = [...calques(pochette), ...calques(ombre)].flatMap((c) =>
      (c.transformations ?? []).flatMap((t) => (t.genre === 'tourner' ? [t.de] : [])),
    );
    assert.ok(
      angles.length === 6 + 3 && angles.every((angle) => angle === -4),
      `la pochette et son ombre tournent du même angle : ${angles.join(', ')}`,
    );
  }
  // Rien d'imprimé ne dépasse du carton : ni le motif, ni les épaules du personnage.
  const { pochette } = poser(EXEMPLE);
  const demi = M.cote / 2 + 1e-6;
  for (const d of dessins(calque(pochette, 'pochette-essai/imprime'))) {
    const contours = d.genre === 'peinture' ? d.facettes.map((f) => f.contour) : d.genre === 'aplat' ? d.contours : [];
    for (const contour of contours)
      for (const [x, y] of contour) assert.ok(Math.abs(x) <= demi && Math.abs(y) <= demi, `un point imprimé en (${x.toFixed(1)}, ${y.toFixed(1)})`);
  }
});

test('le chanfrein du carton donne à l’image imprimée le ton de la pente : plus clair en haut et à gauche, plus sombre en bas et à droite', () => {
  const carton = contourDuCarton(240);
  const imprime = [aplat([carton], 'bleuPetrole', tonAPlat())];
  const bandes = chanfreinDuCarton(imprime, carton, M.chanfrein);
  assert.equal(bandes.length, carton.length, 'une bande par bord du carton, coins compris');
  let [claires, sombres] = [0, 0];
  for (const bande of bandes) {
    assert.ok(bande.genre === 'aplat' && bande.teinte === 'bleuPetrole' && bande.contours.length === 1);
    const [x, y] = centre(bande.contours[0] ?? []);
    // Les quatre grands bords : celui du haut et celui de gauche regardent la lampe, les deux autres lui tournent le dos.
    if (Math.abs(x) < 100 && y < -100) assert.ok(bande.ton > tonAPlat(), 'bord du haut');
    if (Math.abs(y) < 100 && x < -100) assert.ok(bande.ton > tonAPlat(), 'bord de gauche');
    if (Math.abs(x) < 100 && y > 100) assert.ok(bande.ton < tonAPlat(), 'bord du bas');
    if (Math.abs(y) < 100 && x > 100) assert.ok(bande.ton < tonAPlat(), 'bord de droite');
    if (bande.ton > tonAPlat()) claires++;
    if (bande.ton < tonAPlat()) sombres++;
    assert.ok(Math.abs(bande.ton - tonAPlat()) <= 2);
  }
  assert.ok(claires >= 2 && sombres >= 2, `${claires} bandes claires, ${sombres} sombres`);
  // À la taille d'une miniature, le chanfrein ferait un quart de pixel : il n'est pas dessiné.
  const nombreDAplats = (taille: number): number =>
    dessins(calque(poser(EXEMPLE, taille).pochette, 'pochette-essai/imprime')).filter((d) => d.genre === 'aplat').length;
  assert.ok(nombreDAplats(240) > nombreDAplats(48) + carton.length / 2);
});

test('rogner ne garde que ce qui tombe dans la fenêtre, et mesure à nouveau les angles de ce qui reste', () => {
  const carre: FacettePeinte = { contour: rectangle(0, 0, 10, 10), teinte: 'miel', ton: 2, angle: 90 };
  const texte: Texte = {
    genre: 'texte',
    contenu: 'Face A',
    role: 'technique',
    corps: 12,
    en: [50, 50],
    ancrage: 'milieu',
    teinte: 'expresso',
    ton: 2,
    fond: { teinte: 'miel' },
  };
  const coin: Polygone = [
    [0, 0],
    [10, 0],
    [10, 2],
  ];
  const [rogne, reste] = rogner([peinture([carre]), texte], coin);
  assert.ok(rogne?.genre === 'peinture' && rogne.facettes.length === 1);
  const [facette] = rogne.facettes;
  assert.ok(facette !== undefined && Math.abs(Math.abs(aireSignee(facette.contour)) - 10) < 1e-9);
  assert.ok(
    Math.abs(facette.angle - plusPetitAngle(coin)) < 1e-6 && facette.angle < 12,
    `la facette rognée a un angle de ${facette.angle.toFixed(1)}°, plus 90°`,
  );
  assert.deepEqual(reste, texte, 'un texte passe tel quel : on ne coupe pas une lettre en deux');
  // Ce qui tombe tout entier dehors disparaît, peinture ou aplat ; un calque passe tel quel.
  const dehors = rectangle(50, 50, 5, 5);
  assert.deepEqual(rogner([peinture([carre]), aplat([rectangle(0, 0, 10, 10)], 'miel')], dehors), []);
  const sousCalque = groupe('legende', [peinture([carre])]);
  assert.deepEqual(rogner([sousCalque], dehors), [sousCalque]);
});

test('déplacer les tons ne sort jamais des 5 tons, et ne garde que ce qui a un ton : facettes et aplats', () => {
  const carre: FacettePeinte = { contour: rectangle(0, 0, 10, 10), teinte: 'miel', ton: 3, angle: 90 };
  const texte: Texte = {
    genre: 'texte',
    contenu: 'Face A',
    role: 'technique',
    corps: 12,
    en: [0, 0],
    ancrage: 'milieu',
    teinte: 'expresso',
    ton: 2,
    fond: { teinte: 'miel' },
  };
  const tons = (dessins: readonly Dessin[]): number[] =>
    dessins.flatMap((d) => (d.genre === 'peinture' ? d.facettes.map((f) => f.ton) : d.genre === 'aplat' ? [d.ton] : []));
  const depart = [peinture([carre]), aplat([rectangle(0, 0, 1, 1)], 'creme', 1), texte];
  assert.deepEqual(tons(deplacerLesTons(depart, 1)), [4, 2]);
  assert.deepEqual(tons(deplacerLesTons(depart, -2)), [1, 0]);
  assert.deepEqual(tons(deplacerLesTons(depart, 3)), [4, 4]);
  assert.equal(deplacerLesTons(depart, 1).length, 2, 'le texte n’est pas redessiné sur le chanfrein');
});

test('l’usure des coins : les quatre coins de chaque pochette, du même rond, en rond, jamais en éclat', () => {
  const carton = contourDuCarton(240);
  assert.deepEqual(coinsUses('Tonton Reverb', 240, carton), coinsUses('Tonton Reverb', 240, carton));
  const usures = ['Tonton Reverb', 'DJ Saucisson Sec', 'Mamie Techno', 'Jo', 'Les Démons de Minuit', 'Kévin 2000'].map((artiste) =>
    coinsUses(artiste, 240, carton),
  );
  for (const usure of usures) {
    assert.ok(usure.genre === 'peinture' && usure.facettes.length === 4, 'une usure à chaque coin');
    for (const rond of usure.facettes) {
      assert.deepEqual([rond.teinte, rond.ton], ['creme', tonAPlat(-1)], 'le carton, un ton plus sombre que le papier neuf');
      // Un rond centré sur le coin rejoint les deux bords à angle droit, à un demi-pan près : aucune pointe, aucun éclat.
      assert.ok(plusPetitAngle(rond.contour) > 90 - 180 / M.usure.pans - 1, `une usure a un angle de ${plusPetitAngle(rond.contour).toFixed(0)}°`);
      const taille = Math.max(...rond.contour.map(([x, y]) => Math.hypot(120 - Math.abs(x), 120 - Math.abs(y))));
      assert.ok(taille <= M.usure.taille + 1e-9 && taille >= M.usure.taille * M.usure.auMoins - 1e-9, `une usure de ${taille.toFixed(1)} px`);
      for (const [x, y] of rond.contour) assert.ok(Math.abs(x) <= 120 + 1e-9 && Math.abs(y) <= 120 + 1e-9);
    }
  }
});

test('le nom et le titre gardent leurs distances : entre eux, avec le bord du carton, et avec le plus haut des avatars', () => {
  const [nom, album] = textesDe(EXEMPLE);
  assert.ok(nom !== undefined && album !== undefined);
  const capitale = (corps: number): number => corps * HAUTEUR_DE_CAPITALE;
  // Le haut du nom est à une marge au moins du bord du carton.
  assert.ok(M.nom - capitale(CORPS.grandTitre) >= -M.cote / 2 + M.marge, 'le nom touche le haut de la pochette');
  // Le titre passe sous le nom, à plus d'une demi-ligne.
  assert.ok(M.album - capitale(CORPS.gravure) - M.nom >= capitale(CORPS.gravure), 'le titre colle au nom');
  // Et le plus haut des avatars, toutes têtes et tout ce qu'on porte dessus, reste à une hauteur de capitale, au moins, sous le titre.
  const ys = (d: Dessin): number[] =>
    d.genre === 'peinture' ? d.facettes.flatMap((f) => f.contour.map((p) => p[1])) : d.genre === 'aplat' ? d.contours.flat().map((p) => p[1]) : [];
  const hauts = (Object.keys(TETES) as CleDeTete[]).flatMap((tete) =>
    (Object.keys(DESSUS) as CleDeDessus[]).flatMap((dessus) =>
      dessinerLAvatar({ ...EXEMPLE.avatar, tete, dessus }, 'content', { tete: [M.tete[0], M.tete[1]], echelle: 1 }).flatMap(ys),
    ),
  );
  const leHaut = Math.min(...hauts);
  assert.ok(leHaut - M.album >= capitale(CORPS.gravure), `l’avatar monte à ${(leHaut - M.album).toFixed(1)} px du titre`);
});
