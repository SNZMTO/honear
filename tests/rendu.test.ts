/**
 * Les écritures d'une scène : le SVG, la toile où un écran fige le décor, et l'emprise qui dit quelle taille lui donner.
 * Elles doivent dire la même chose, au dixième de px : c'est ce qui permet de figer une pièce en image sans qu'on le voie.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rectangle } from '../src/lowpoly/contours';
import { ECRASEMENT } from '../src/lowpoly/projection';
import { couleur } from '../src/lowpoly/tons';
import type { Vec2 } from '../src/lowpoly/vecteurs';
import { aplat, calque, type Calque, type Dessin, type Texte, type Transformation } from '../src/scene/calque';
import { agrandir, croiser, empriseDe, reunir, type Emprise } from '../src/scene/rendu/emprise';
import { LISERE } from '../src/scene/rendu/peinture';
import { enSvg as sceneEnSvg } from '../src/scene/rendu/svg';
import { peindreSurUneToile, type Toile } from '../src/scene/rendu/toile';
import { affineDe, affineDeToutes, affineEnCss, appliquer, composer, enCss, enSvg, SANS_EFFET, type Affine } from '../src/scene/rendu/transformation';
import { etendueDUnTrace } from './etendues';
import { calques, ENCRIER, TOUTES_LES_IMAGES } from './planche';

const proches = (a: readonly number[], b: readonly number[], marge: number, quoi: string): void => {
  assert.equal(a.length, b.length, quoi);
  a.forEach((x, i) => assert.ok(Math.abs(x - (b[i] ?? NaN)) <= marge, `${quoi} : ${a.join(' ')} au lieu de ${b.join(' ')}`));
};

const TRANSFORMATIONS: readonly Transformation[] = [
  { genre: 'glisser', de: [12.5, -40.25] },
  { genre: 'ecraser' },
  { genre: 'tourner', de: 37 },
  { genre: 'tourner', de: -212.4 },
  { genre: 'deformer', par: [1, 0, 0, -1] },
  { genre: 'deformer', par: [1.04, -0.31, 0.2, 0.62] },
];

/** Une transformation relue dans son écriture, pour le SVG (séparée par des espaces) ou pour le CSS (par des virgules, avec ses unités). */
function relire(ecrite: string): Affine {
  const [, nom = '', dedans = ''] = /^(\w+)\((.*)\)$/.exec(ecrite) ?? [];
  const n = dedans
    .split(/[ ,]+/)
    .filter((v) => v !== '')
    .map((v) => Number(v.replace(/px$|deg$/, '')));
  const [a = NaN, b = NaN, c = NaN, d = NaN, e = NaN, f = NaN] = n;
  switch (nom) {
    case 'translate':
      return [1, 0, 0, 1, a, b];
    case 'scale':
      return [a, 0, 0, b, 0, 0];
    case 'rotate': {
      const angle = (a * Math.PI) / 180;
      return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
    }
    case 'matrix':
      return [a, b, c, d, e, f];
    default:
      throw new Error(`Transformation inconnue : ${ecrite}`);
  }
}

test('une transformation se compose comme des groupes emboîtés : la plus en dedans s’applique d’abord aux points', () => {
  const p: Vec2 = [10, 0];
  // Tourner d'un quart de tour, écraser, puis glisser : le point part vers le joueur, perd 12 % de sa profondeur, et se déplace.
  const toutes = affineDeToutes([{ genre: 'glisser', de: [5, 7] }, { genre: 'ecraser' }, { genre: 'tourner', de: 90 }]);
  proches(appliquer(toutes, p), [5, 7 + 10 * ECRASEMENT], 1e-12, 'glisser, écraser, tourner');
  // Composer, c'est appliquer l'une après l'autre ; et rien ne change à composer avec ce qui est sans effet.
  for (const dehors of TRANSFORMATIONS) {
    for (const dedans of TRANSFORMATIONS) {
      const [m, n] = [affineDe(dehors), affineDe(dedans)];
      proches(appliquer(composer(m, n), [3, -8]), appliquer(m, appliquer(n, [3, -8])), 1e-9, `${dehors.genre} sur ${dedans.genre}`);
    }
    proches(composer(SANS_EFFET, affineDe(dehors)), affineDe(dehors), 0, 'sans effet, dehors');
    proches(composer(affineDe(dehors), SANS_EFFET), affineDe(dehors), 0, 'sans effet, dedans');
  }
  assert.deepEqual(affineDeToutes([]), SANS_EFFET);
});

test('les trois écritures d’une transformation disent la même chose : la matrice d’une toile, le SVG et le CSS', () => {
  for (const t of TRANSFORMATIONS) {
    const matrice = affineDe(t);
    // Le SVG et le CSS arrondissent : deux décimales pour un déplacement ou un angle, cinq pour un coefficient.
    proches(relire(enSvg(t)), matrice, 1e-4, `SVG de ${t.genre}`);
    proches(relire(enCss(t)), matrice, 1e-4, `CSS de ${t.genre}`);
  }
  assert.equal(enSvg({ genre: 'ecraser' }), `scale(1 ${ECRASEMENT})`);
  assert.equal(enCss({ genre: 'glisser', de: [3, -0.004] }), 'translate(3px,0px)', 'jamais de « -0 »');
  const quelconque = composer(affineDe({ genre: 'glisser', de: [140.25, -3.5] }), affineDe({ genre: 'tourner', de: 4 }));
  proches(relire(affineEnCss(quelconque)), quelconque, 1e-4, 'une matrice quelconque, pour le CSS');
});

/**
 * Ce qu'une toile a reçu : des polygones remplis, à leur place sur l'écran ; le tracé d'un texte, sous sa transformation ;
 * ou une découpe, à sa place elle aussi, posée avant ce qu'elle rogne.
 */
type Geste =
  | { readonly genre: 'polygones'; readonly couleur: string; readonly opacite: number; readonly lisere: number; readonly contours: Vec2[][] }
  | { readonly genre: 'trace'; readonly couleur: string; readonly trace: string; readonly sous: Affine }
  | { readonly genre: 'decoupe'; readonly couleur: ''; readonly contours: Vec2[][] };

/** Une toile qui note ce qu'on y peint au lieu de le peindre. */
function toileQuiNote(): { readonly toile: Toile; readonly gestes: Geste[] } {
  const gestes: Geste[] = [];
  let sous: Affine = SANS_EFFET;
  const toile: Toile = {
    sous(m, peindre) {
      const avant = sous;
      sous = composer(sous, m);
      peindre();
      sous = avant;
    },
    remplir(contours, teinte, plus = {}) {
      const m = sous;
      gestes.push({
        genre: 'polygones',
        couleur: teinte,
        opacite: plus.opacite ?? 1,
        lisere: plus.lisere ?? 0,
        contours: contours.map((contour) => contour.map((p) => appliquer(m, p))),
      });
    },
    remplirUnTrace(trace, teinte) {
      gestes.push({ genre: 'trace', couleur: teinte, trace, sous });
    },
    decouper(contours, peindre) {
      const m = sous;
      gestes.push({ genre: 'decoupe', couleur: '', contours: contours.map((contour) => contour.map((p) => appliquer(m, p))) });
      peindre();
    },
  };
  return { toile, gestes };
}

/** Les mêmes gestes, relus dans un SVG : on suit ses groupes et leurs transformations, et l'on saute ceux qui sont cachés. */
function gestesDuSvg(svg: string): Geste[] {
  const gestes: Geste[] = [];
  const pile: { sous: Affine; cache: boolean; lisere: number }[] = [{ sous: SANS_EFFET, cache: false, lisere: 0 }];
  let dansUneDecoupe = false;
  for (const [balise, nom = '', attributs = ''] of svg.matchAll(/<(\/?[a-zA-Z]+)((?:\s[^<>]*?)?)\/?>/g)) {
    const lire = (attribut: string): string | undefined => new RegExp(`\\s${attribut}="([^"]*)"`).exec(attributs)?.[1];
    const haut = pile[pile.length - 1];
    assert.ok(haut !== undefined, balise);
    const contoursDe = (d: string): Vec2[][] =>
      d
        .split('Z')
        .filter((contour) => contour !== '')
        .map((contour) => {
          const n = contour.replace(/[ML]/g, ' ').trim().split(/\s+/).map(Number);
          return Array.from({ length: n.length / 2 }, (_, i): Vec2 => appliquer(haut.sous, [n[2 * i] ?? NaN, n[2 * i + 1] ?? NaN]));
        });
    if (nom === 'clipPath' || nom === '/clipPath') {
      dansUneDecoupe = nom === 'clipPath';
    } else if (nom === 'path' && dansUneDecoupe) {
      // Le contour d'une découpe ne peint rien : il rogne le groupe qui le suit.
      if (!haut.cache) gestes.push({ genre: 'decoupe', couleur: '', contours: contoursDe(lire('d') ?? '') });
    } else if (nom === 'g') {
      const transformation = lire('transform');
      pile.push({
        sous: transformation === undefined ? haut.sous : composer(haut.sous, relire(transformation)),
        cache: haut.cache || lire('opacity') === '0',
        lisere: Number(lire('stroke-width') ?? haut.lisere),
      });
    } else if (nom === '/g') {
      pile.pop();
    } else if (nom === 'path' && !haut.cache) {
      const [d, teinte] = [lire('d') ?? '', lire('fill') ?? ''];
      if (/^[MLZ\d\s.-]+$/.test(d)) {
        const lisere = lire('stroke') !== undefined ? haut.lisere : 0;
        gestes.push({ genre: 'polygones', couleur: teinte, opacite: Number(lire('fill-opacity') ?? 1), lisere, contours: contoursDe(d) });
      } else {
        gestes.push({ genre: 'trace', couleur: teinte, trace: d, sous: haut.sous });
      }
    }
  }
  assert.equal(pile.length, 1, 'tous les groupes du SVG sont refermés');
  return gestes;
}

/**
 * Le fondu de l'étiquette est le seul endroit où un calque est à demi transparent : l'étiquette reste en SVG, elle n'est jamais figée
 * sur une toile. Pour comparer les deux écritures d'une scène prise en plein fondu, on montre ses calques à demi transparents en entier.
 */
const sansFondu = (c: Calque): Calque => ({
  ...c,
  ...(c.opacite !== undefined && c.opacite > 0 && c.opacite < 1 ? { opacite: 1 } : {}),
  contenu: c.contenu.map((d) => (d.genre === 'calque' ? sansFondu(d) : d)),
});

test('peinte sur une toile ou écrite en SVG, une scène est la même image : mêmes polygones, mêmes tons, même ordre, au dixième de px', () => {
  let [polygones, traces, decoupes] = [0, 0, 0];
  for (const image of TOUTES_LES_IMAGES) {
    const { toile, gestes } = toileQuiNote();
    const scene = sansFondu(image.scene);
    peindreSurUneToile(toile, scene, ENCRIER.tracer);
    const ecrits = gestesDuSvg(sceneEnSvg(scene, { ...image.regard, tracerLeTexte: ENCRIER.tracer, titre: image.titre }));
    assert.equal(gestes.length, ecrits.length, `${image.fichier} : ${gestes.length} gestes sur la toile, ${ecrits.length} dans le SVG`);
    gestes.forEach((geste, rang) => {
      const ecrit = ecrits[rang];
      assert.ok(ecrit !== undefined);
      const ou = `${image.fichier}, geste ${rang}`;
      assert.deepEqual([geste.genre, geste.couleur], [ecrit.genre, ecrit.couleur], ou);
      if (geste.genre === 'trace' && ecrit.genre === 'trace') {
        traces++;
        assert.equal(geste.trace, ecrit.trace, ou);
        // Un texte est tracé dans le repère de son calque : c'est la transformation qui le pose, et elle déplace des centaines de px.
        proches(appliquer(geste.sous, [300, 300]), appliquer(ecrit.sous, [300, 300]), 0.1, ou);
        proches(appliquer(geste.sous, [-300, 300]), appliquer(ecrit.sous, [-300, 300]), 0.1, ou);
      } else if (geste.genre !== 'trace' && ecrit.genre !== 'trace') {
        if (geste.genre === 'polygones' && ecrit.genre === 'polygones')
          assert.deepEqual([geste.opacite, geste.lisere], [ecrit.opacite, ecrit.lisere], ou);
        else decoupes++;
        assert.equal(geste.contours.length, ecrit.contours.length, ou);
        geste.contours.forEach((contour, i) => {
          polygones++;
          proches(contour.flat(), ecrit.contours[i]?.flat() ?? [], 0.1, ou);
        });
      }
    });
  }
  assert.ok(polygones > 40000 && traces > 300, `${polygones} polygones et ${traces} textes comparés`);
  // L'ombre que le bras porte sur le plateau est découpée par son bord, de la même façon des deux côtés.
  assert.ok(decoupes >= TOUTES_LES_IMAGES.filter((i) => /^piste-/.test(i.fichier)).length, `${decoupes} découpes comparées`);
});

test('une découpe rogne ce qu’un calque contient, sans bouger avec lui : la toile la pose avant ses transformations, et son emprise s’y arrête', () => {
  const forme = aplat([rectangle(-50, -5, 100, 10)], 'expresso');
  const fenetre = [rectangle(0, -20, 30, 40)];
  const rogne = calque('bras/ombre', [forme], { role: 'ombre', transformations: [{ genre: 'glisser', de: [10, 0] }], decoupe: fenetre });
  const { toile, gestes } = toileQuiNote();
  toile.sous(affineDe({ genre: 'glisser', de: [100, 100] }), () => peindreSurUneToile(toile, rogne, ENCRIER.tracer));
  assert.deepEqual(
    gestes.map((g) => g.genre),
    ['decoupe', 'polygones'],
  );
  const [decoupe, peint] = gestes;
  assert.ok(decoupe?.genre === 'decoupe' && peint?.genre === 'polygones');
  // La fenêtre est posée par ce qui contient le calque, pas par le glissement du calque ; ce qu'il contient, par les deux.
  proches(decoupe.contours.flat(2), rectangle(100, 80, 30, 40).flat(), 1e-9, 'la découpe');
  proches(peint.contours.flat(2), rectangle(60, 95, 100, 10).flat(), 1e-9, 'ce qu’elle rogne');
  // Son emprise est ce qu'on en voit : la part de son contenu qui tombe dans la fenêtre.
  assert.deepEqual(empriseDe([rogne], ENCRIER.largeur), { x: 0, y: -5, largeur: 30, hauteur: 10 });
  // Tout à fait hors de sa fenêtre, il n'occupe rien.
  const dehors = calque('bras/ombre', [forme], { transformations: [{ genre: 'glisser', de: [500, 0] }], decoupe: fenetre });
  assert.equal(empriseDe([dehors], ENCRIER.largeur), undefined);
});

test('le liseré qui recouvre les joints est le même sur la toile et dans le SVG ; un aplat n’en a pas', () => {
  const image = TOUTES_LES_IMAGES.find((i) => i.fichier === 'platine-fine');
  assert.ok(image !== undefined);
  const { toile, gestes } = toileQuiNote();
  peindreSurUneToile(toile, image.scene, ENCRIER.tracer);
  const lises = new Set(gestes.flatMap((g) => (g.genre === 'polygones' ? [g.lisere] : [])));
  assert.deepEqual([...lises].sort(), [0, LISERE]);
});

test('un calque caché ne laisse rien sur une toile ; à demi transparent, il ne peut pas y être figé', () => {
  const forme = aplat([rectangle(-5, -5, 10, 10)], 'miel');
  const { toile, gestes } = toileQuiNote();
  peindreSurUneToile(
    toile,
    calque('pastille', [calque('pastille/face-1', [forme], { opacite: 0 }), calque('pastille/face-2', [forme])]),
    ENCRIER.tracer,
  );
  assert.equal(gestes.length, 1, 'une seule des deux faces est peinte');
  assert.equal(gestes[0]?.couleur, couleur('miel'));
  assert.throws(() => peindreSurUneToile(toileQuiNote().toile, calque('pastille', [forme], { opacite: 0.5 }), ENCRIER.tracer), /à demi transparent/);
  // Dans les scènes dessinées jusqu'ici, un calque est tout à fait là ou tout à fait caché, sauf pendant le fondu de l'étiquette,
  // entre son texte et ses arcs : ses calques sont dans l'étiquette, un calque mobile, qui n'est jamais figé.
  let enFondu = 0;
  for (const image of TOUTES_LES_IMAGES) {
    const mobiles = calques(image.scene).filter((c) => c.role === 'mobile');
    for (const c of calques(image.scene)) {
      if (c.opacite === undefined || c.opacite === 0 || c.opacite === 1) continue;
      enFondu++;
      assert.ok(
        c.nom.startsWith('etiquette/') && mobiles.some((m) => m.nom === 'etiquette' && calques(m).includes(c)),
        `${image.fichier} : ${c.nom}`,
      );
    }
  }
  assert.ok(enFondu > 0, 'une image au moins montre le fondu de l’étiquette');
});

const contient = (grand: Emprise, petit: Emprise, marge = 1e-9): boolean =>
  petit.x >= grand.x - marge &&
  petit.y >= grand.y - marge &&
  petit.x + petit.largeur <= grand.x + grand.largeur + marge &&
  petit.y + petit.hauteur <= grand.y + grand.hauteur + marge;

test('l’emprise d’un dessin est le rectangle qu’il occupe à l’écran, sous les transformations de ses calques', () => {
  const forme = aplat([rectangle(-10, -10, 20, 20)], 'miel');
  assert.deepEqual(empriseDe([forme], ENCRIER.largeur), { x: -10, y: -10, largeur: 20, hauteur: 20 });
  const pose = calque('pastille', [forme], { transformations: [{ genre: 'glisser', de: [100, 50] }, { genre: 'ecraser' }] });
  const emprise = empriseDe([pose], ENCRIER.largeur);
  assert.ok(emprise !== undefined);
  proches([emprise.x, emprise.y, emprise.largeur, emprise.hauteur], [90, 50 - 10 * ECRASEMENT, 20, 20 * ECRASEMENT], 1e-9, 'glissé puis écrasé');
  // Sous une transformation de plus, celle d'un conteneur : elle s'applique en dernier.
  const sous = empriseDe([pose], ENCRIER.largeur, affineDe({ genre: 'glisser', de: [-100, 0] }));
  assert.ok(sous !== undefined && Math.abs(sous.x + 10) < 1e-9);
  // Un calque caché n'occupe rien, sauf si l'on demande la place qu'il prendra en se montrant.
  const cache = calque('pastille', [forme], { opacite: 0 });
  assert.equal(empriseDe([cache], ENCRIER.largeur), undefined);
  assert.deepEqual(empriseDe([cache], ENCRIER.largeur, SANS_EFFET, true), { x: -10, y: -10, largeur: 20, hauteur: 20 });
  assert.equal(empriseDe([], ENCRIER.largeur), undefined);
});

test('réunir, croiser et agrandir des emprises', () => {
  const [a, b]: [Emprise, Emprise] = [
    { x: 0, y: 0, largeur: 10, hauteur: 10 },
    { x: 6, y: -4, largeur: 10, hauteur: 8 },
  ];
  assert.deepEqual(reunir(a, b), { x: 0, y: -4, largeur: 16, hauteur: 14 });
  assert.deepEqual(reunir(undefined, b), b);
  assert.deepEqual(reunir(a, undefined), a);
  assert.equal(reunir(undefined, undefined), undefined);
  assert.deepEqual(croiser(a, b), { x: 6, y: 0, largeur: 4, hauteur: 4 });
  assert.equal(croiser(a, { x: 10, y: 0, largeur: 5, hauteur: 5 }), undefined, 'deux rectangles qui se touchent par un bord n’ont rien en commun');
  assert.deepEqual(agrandir(a, 2), { x: -2, y: -2, largeur: 14, hauteur: 14 });
});

test('l’emprise d’un texte contient toutes ses lettres, droit ou en arc : figé sur une toile à sa taille, aucun n’est rogné', () => {
  let textes = 0;
  const vus = new Set<string>();
  const visiter = (dessin: Dessin, fichier: string): void => {
    if (dessin.genre === 'calque') return dessin.contenu.forEach((d) => visiter(d, fichier));
    if (dessin.genre !== 'texte') return;
    const cle = JSON.stringify(dessin);
    if (vus.has(cle)) return;
    vus.add(cle);
    const lettres = etendueDUnTrace(ENCRIER.tracer(dessin));
    const emprise = empriseDe([dessin], ENCRIER.largeur);
    assert.ok(emprise !== undefined);
    // Une espace seule ne trace rien.
    if (lettres === undefined) return;
    textes++;
    assert.ok(contient(emprise, lettres), `${fichier} : « ${dessin.contenu} » dépasse de son emprise`);
  };
  for (const image of TOUTES_LES_IMAGES) visiter(image.scene, image.fichier);
  assert.ok(textes >= 60, `${textes} textes différents vérifiés`);
  // Et l'emprise n'est pas démesurée : pour une ligne droite, guère plus haute que son corps.
  const droit: Texte = {
    genre: 'texte',
    contenu: 'Piste 3',
    role: 'techniqueFort',
    corps: 14,
    en: [0, 0],
    ancrage: 'milieu',
    teinte: 'expresso',
    ton: 2,
    fond: { teinte: 'miel' },
  };
  const emprise = empriseDe([droit], ENCRIER.largeur);
  assert.ok(emprise !== undefined && emprise.hauteur < 14 * 1.5 && Math.abs(emprise.x + emprise.largeur / 2) < 1e-9, 'centrée sur son ancrage');
});

test('l’emprise d’une scène contient celle de chacun de ses calques visibles', () => {
  const sousLes = (scene: Calque): Map<string, Affine> => {
    const trouves = new Map<string, Affine>();
    const visiter = (c: Calque, sous: Affine, cache: boolean): void => {
      if (!cache) trouves.set(c.nom, sous);
      const dessous = composer(sous, affineDeToutes(c.transformations ?? []));
      for (const d of c.contenu) if (d.genre === 'calque') visiter(d, dessous, cache || (c.opacite ?? 1) <= 0);
    };
    visiter(scene, SANS_EFFET, false);
    return trouves;
  };
  let compares = 0;
  for (const image of TOUTES_LES_IMAGES) {
    const entiere = empriseDe([image.scene], ENCRIER.largeur);
    assert.ok(entiere !== undefined);
    const sous = sousLes(image.scene);
    for (const c of calques(image.scene)) {
      const m = sous.get(c.nom);
      if (m === undefined) continue;
      const emprise = empriseDe([c], ENCRIER.largeur, m);
      if (emprise === undefined) continue;
      compares++;
      assert.ok(contient(entiere, emprise, 1e-6), `${image.fichier} : ${c.nom} sort de l'emprise de la scène`);
    }
  }
  assert.ok(compares > 3000, `${compares} calques comparés`);
});
