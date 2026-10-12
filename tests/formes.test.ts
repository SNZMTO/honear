import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle, ellipse, rayonRentre, rectangle, trait } from '../src/lowpoly/contours';
import { facetteInclinee, peindre, type FacettePeinte } from '../src/lowpoly/facette';
import { bandesDeChanfrein, boiteChanfreinee, prisme } from '../src/lowpoly/formes/boite';
import { boutonMolete } from '../src/lowpoly/formes/bouton';
import { cylindreCouche } from '../src/lowpoly/formes/cylindre';
import { disque } from '../src/lowpoly/formes/disque';
import { dome } from '../src/lowpoly/formes/dome';
import { drape } from '../src/lowpoly/formes/drape';
import { galet } from '../src/lowpoly/formes/galet';
import { nez } from '../src/lowpoly/formes/nez';
import { contourDePlot, plot } from '../src/lowpoly/formes/plot';
import { rosace } from '../src/lowpoly/formes/rosace';
import { teteFacettee } from '../src/lowpoly/formes/tete';
import { veine } from '../src/lowpoly/formes/veine';
import { versLaLampeAuSol } from '../src/lowpoly/ombrage';
import { aireSignee, anglesInterieurs } from '../src/lowpoly/polygones';
import { distance, plusPetitAngleDansLEspace, scalaire, type Vec2, type Vec3 } from '../src/lowpoly/vecteurs';

/** Une tête en dôme de petites facettes, telle que l'étape 1 la dessinait : le dôme reste une forme du moteur. */
const TETE = {
  rayons: [43, 45],
  couronnes: [28, 18, 9],
  retraits: [1, 0.76, 0.48],
  galbe: 2.14,
  relief: 0.56,
  bosses: { amplitude: 0.22, germe: 3 },
} as const;

const DE_DESSUS = { genre: 'dessus' } as const;
const centre = (f: FacettePeinte): Vec2 => [
  f.contour.reduce((somme, p) => somme + p[0], 0) / f.contour.length,
  f.contour.reduce((somme, p) => somme + p[1], 0) / f.contour.length,
];
/** Ton moyen des facettes tournées vers la lampe, et de celles qui lui tournent le dos, autour d'un centre. */
function tonsDesDeuxCotes(facettes: readonly FacettePeinte[], milieu: Vec2): { coteLampe: number; coteOppose: number } {
  const moyenne = (liste: readonly FacettePeinte[]): number => liste.reduce((somme, f) => somme + f.ton, 0) / Math.max(1, liste.length);
  const versLaLampe = (f: FacettePeinte): number => scalaire([centre(f)[0] - milieu[0], centre(f)[1] - milieu[1]], versLaLampeAuSol());
  return { coteLampe: moyenne(facettes.filter((f) => versLaLampe(f) > 2)), coteOppose: moyenne(facettes.filter((f) => versLaLampe(f) < -2)) };
}

test('le disque rayonne depuis le centre, sans éventail de triangles pointus', () => {
  const facettes = disque({
    centre: [0, 0],
    hauteur: 0,
    pans: 48,
    anneaux: [
      { de: 160, a: 90, teinte: 'vinyle', fini: 'sillons' },
      { de: 90, a: 0, teinte: 'miel' },
    ],
  });
  assert.equal(facettes.length, 48 + 1, '48 pans, et un cœur d’un seul polygone');
  for (const f of facettes) assert.ok(plusPetitAngleDansLEspace(f.sommets) > 60, 'aucune pointe');
});

test('la boîte chanfreinée adoucit son arête du haut par une rangée de facettes', () => {
  const b = { x: 0, y: 0, largeur: 100, profondeur: 60, base: 0, epaisseur: 16, rayon: 8, pansParCoin: 4, teinte: 'laque' } as const;
  const vive = peindre(boiteChanfreinee({ ...b, chanfrein: 0 }));
  const douce = peindre(boiteChanfreinee({ ...b, chanfrein: 3 }));
  assert.ok(douce.length > vive.length);
  const tons = new Set(douce.map((f) => f.ton));
  assert.ok(tons.has(0) && tons.has(2) && (tons.has(3) || tons.has(4)), 'flanc sombre, dessus de base, chanfrein clair côté lampe');
});

test('le bouton moleté alterne ses pans, et ses facettes claires sont du côté de la lampe', () => {
  const pans = 16;
  const bouton = boutonMolete({ centre: [0, 0], base: 16, epaisseur: 6, rayon: 15, pans, teinte: 'alu', chanfrein: 1.7 });
  for (const f of bouton) assert.ok(plusPetitAngleDansLEspace(f.sommets) > 20, 'aucune lame');
  assert.ok(peindre(bouton).length >= pans * 4, 'assez de petites facettes pour paraître rond');

  // Le moletage : un flanc et son chanfrein par pan, et d'un pan au suivant la nuance change.
  const corps = bouton.slice(0, 2 * pans);
  corps.forEach((f, i) => assert.equal(f.nuance, Math.floor(i / 2) % 2 === 0 ? 0 : 1, `pan ${Math.floor(i / 2)}`));

  // Le dessus : il n'est jamais plus clair à l'opposé de la lampe que de son côté.
  const dessus = peindre(bouton.slice(2 * pans));
  const milieu: Vec2 = [0, dessus.reduce((somme, f) => somme + centre(f)[1], 0) / dessus.length];
  const { coteLampe, coteOppose } = tonsDesDeuxCotes(dessus, milieu);
  assert.ok(coteLampe > coteOppose, `côté lampe ${coteLampe.toFixed(2)}, côté opposé ${coteOppose.toFixed(2)}`);
});

test('un galet : une facette par côté du contour, toutes tournées vers l’œil, sans lame, et la lampe en éclaire un côté plus que l’autre', () => {
  const contour = ellipse([0, 0], [40, 43], 11);
  const g = peindre(galet({ contour, sommet: [0, -7], relief: 25, teinte: 'vieuxRose' }), DE_DESSUS);
  assert.equal(g.length, 11);
  for (const f of g) assert.ok(f.angle > 25, `angle de ${f.angle.toFixed(1)}°`);
  const { coteLampe, coteOppose } = tonsDesDeuxCotes(g, [0, 0]);
  assert.ok(coteLampe > coteOppose, `côté lampe ${coteLampe.toFixed(2)}, côté opposé ${coteOppose.toFixed(2)}`);
  assert.throws(() => galet({ contour: contour.slice(0, 2), sommet: [0, 0], relief: 1, teinte: 'alu' }), /au moins trois côtés/);
});

test('la tête facettée est ronde : 28 pans au contour, des triangles sans lame, un sommet à trois facettes', () => {
  const { couronnes } = TETE;
  const tete = peindre(teteFacettee({ ...TETE, centre: [0, 0], teinte: 'vieuxRose' }), DE_DESSUS);
  assert.equal(couronnes[0], 28);
  assert.equal(tete.length, 28 + 18 + (18 + 9) + 3);
  for (const f of tete) assert.ok(f.angle > 25, `angle de ${f.angle.toFixed(1)}°`);
  assert.ok(new Set(tete.map((f) => f.ton)).size >= 4, 'le relief prend au moins 4 des 5 tons');
  const { coteLampe, coteOppose } = tonsDesDeuxCotes(tete, [0, 0]);
  assert.ok(coteLampe > coteOppose + 0.8, 'le côté de la lampe est nettement plus clair');
});

test('un dôme fermé par plusieurs facettes refuse une couronne qui ne se partage pas', () => {
  const d = { centre: [0, 0], rayons: [10, 10], relief: 5, teinte: 'alu' } as const;
  assert.equal(dome({ ...d, couronnes: [12, 6], sommet: 3 }).length, 12 + 6 + 3);
  assert.equal(dome({ ...d, couronnes: [12, 6] }).length, 12 + 6 + 1);
  assert.throws(() => dome({ ...d, couronnes: [12, 7], sommet: 3 }));
});

test('un cylindre couché est plus clair du côté de la lampe', () => {
  const bandes = peindre(cylindreCouche({ de: [0, 0], a: [0, 60], rayonDe: 10, rayonA: 10, bandes: 5, teinte: 'alu' }), DE_DESSUS);
  assert.equal(bandes.length, 5);
  const parX = [...bandes].sort((p, q) => centre(p)[0] - centre(q)[0]);
  assert.ok((parX[0]?.ton ?? 0) > (parX[parX.length - 1]?.ton ?? 0), 'la bande de gauche est plus claire que celle de droite');
});

test('un drapé en coupole s’éclaire du côté de la lampe ; en boudin, il a un versant clair et un versant sombre', () => {
  const lignes = {
    haut: [
      [-40, 0],
      [-20, -30],
      [20, -30],
      [40, 0],
    ],
    bas: [
      [-28, 0],
      [-14, -18],
      [14, -18],
      [28, 0],
    ],
  } as const;
  const coupole = peindre(drape({ ...lignes, rangs: 2, relief: 8, profil: 'coupole', teinte: 'noyerSombre' }), DE_DESSUS);
  assert.equal(coupole.length, 3 * 2);
  const { coteLampe, coteOppose } = tonsDesDeuxCotes(coupole, [0, -12]);
  assert.ok(coteLampe > coteOppose, 'la calotte est plus claire du côté de la lampe');

  const boudin = peindre(
    drape({
      haut: [
        [0, 0],
        [0, 40],
      ],
      bas: [
        [12, 0],
        [12, 40],
      ],
      rangs: 2,
      relief: 5,
      profil: 'boudin',
      teinte: 'noyerSombre',
    }),
    DE_DESSUS,
  );
  assert.equal(boudin.length, 2);
  const [gauche, droite] = [...boudin].sort((p, q) => centre(p)[0] - centre(q)[0]);
  assert.ok((gauche?.ton ?? 0) > (droite?.ton ?? 0), 'le versant tourné vers la lampe est le plus clair');
  assert.throws(() =>
    drape({
      haut: [[0, 0]],
      bas: [
        [0, 1],
        [1, 1],
      ],
      rangs: 1,
      relief: 1,
      profil: 'boudin',
      teinte: 'alu',
    }),
  );
});

test('une facette penchée prend le ton de sa pente', () => {
  const carre: Vec2[] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  const [versLaLampe] = peindre([facetteInclinee(carre, [0.5, 0.5], 'vieuxRose')], DE_DESSUS);
  const [dosALaLampe] = peindre([facetteInclinee(carre, [-0.5, -0.5], 'vieuxRose')], DE_DESSUS);
  assert.ok((versLaLampe?.ton ?? 0) > 2 && (dosALaLampe?.ton ?? 4) < 2);
});

test('une veine, un trait, un nez, une rosace : aucun angle vif', () => {
  for (const [longueur, epaisseur] of [
    [300, 6],
    [80, 2.2],
    [24, 5],
  ] as const) {
    for (const angle of anglesInterieurs(veine(longueur, epaisseur)))
      assert.ok(angle > 100, `veine ${longueur} × ${epaisseur} : ${angle.toFixed(0)}°`);
  }
  const sourcil = trait(
    [
      [-9, 1],
      [-3.6, -1],
      [3.6, -1],
      [9, 1],
    ],
    5.2,
  );
  for (const angle of anglesInterieurs(sourcil)) assert.ok(angle > 90, `trait : ${angle.toFixed(0)}°`);
  for (const f of peindre(nez({ haut: [0, 0], longueur: 16, arete: 2.1, base: 6.2, saillie: 5, teinte: 'vieuxRose' }), DE_DESSUS)) {
    assert.ok(f.angle > 20, `nez : ${f.angle.toFixed(0)}°`);
  }
  const fleur = peindre(rosace({ centre: [0, 0], rayon: 10, petales: 5, teinte: 'creme', coeur: 'miel' }), DE_DESSUS);
  assert.equal(fleur.length, 5 + 1);
  for (const f of fleur) assert.ok(f.angle > 50, `rosace : ${f.angle.toFixed(0)}°`);
});

test('le chanfrein d’un contour convexe a un pan par arête : l’arête du dehors, et la même, rentrée de sa largeur', () => {
  const contour = rectangle(0, 0, 40, 20);
  const bandes = bandesDeChanfrein(contour, 3);
  assert.equal(bandes.length, contour.length);
  bandes.forEach(([p0, p1, q1, q0], pan) => {
    assert.deepEqual([p0, p1], [contour[pan], contour[(pan + 1) % contour.length]], 'le bord du dehors est une arête du contour');
    assert.ok(aireSignee([p0, p1, q1, q0]) > 0, 'dans le sens de toutes les facettes dessinées');
    // Les deux arêtes sont parallèles, à 3 px l'une de l'autre.
    const lelong: Vec2 = [(p1[0] - p0[0]) / distance(p0, p1), (p1[1] - p0[1]) / distance(p0, p1)];
    const enTravers = (p: Vec2): number => (p[0] - p0[0]) * -lelong[1] + (p[1] - p0[1]) * lelong[0];
    assert.ok(Math.abs(enTravers(q0) - 3) < 1e-9 && Math.abs(enTravers(q1) - 3) < 1e-9, `pan ${pan}`);
  });
  // Le même contour, donné dans l'autre sens, donne les mêmes pans.
  assert.equal(bandesDeChanfrein([...contour].reverse(), 3).length, 4);
  for (const bande of bandesDeChanfrein([...contour].reverse(), 3)) assert.ok(aireSignee(bande) > 0);
});

test('un prisme monte un contour : un flanc et un chanfrein par arête, un dessus ; ouvert, il laisse le dessus à une autre forme', () => {
  const p = { contour: rectangle(0, 0, 40, 20), base: 2, epaisseur: 8, chanfrein: 2, teinte: 'laque' } as const;
  assert.equal(prisme(p).length, 4 * 2 + 1);
  assert.equal(prisme({ ...p, ouvert: true }).length, 4 * 2);
  assert.equal(prisme({ ...p, chanfrein: 0 }).length, 4 + 1, 'sans chanfrein, l’arête reste vive : un flanc par arête');
  // Le dessus est rentré de la largeur du chanfrein.
  const dessus = prisme(p).at(-1);
  assert.ok(dessus !== undefined);
  assert.equal(Math.round(aireSignee(dessus.sommets.map((s): Vec2 => [s[0], s[1]])) * 1e6) / 1e6, (40 - 4) * (20 - 4));
  // Vu du meuble, on garde le dessus, les chanfreins tournés vers l'œil et le flanc avant.
  assert.ok(peindre(prisme(p)).length < prisme(p).length);
});

test('un plot est fermé : son dessus commence exactement où finit son chanfrein', () => {
  const forme = { centre: [3, 5], base: 4, epaisseur: 6, rayon: 20, pans: 16, chanfrein: 2, teinte: 'alu' } as const;
  let bordDonne = 0;
  const lisse = plot({
    ...forme,
    dessus: (bord) => {
      bordDonne = bord;
      return [{ de: bord, a: 0, teinte: 'alu' }];
    },
  });
  assert.equal(lisse.length, 16 * 2 + 1, 'un flanc et un chanfrein par pan, et un dessus d’un seul polygone');
  assert.equal(bordDonne, rayonRentre(20, 2, 16));
  const dessus = lisse.at(-1);
  assert.ok(dessus !== undefined && dessus.sommets.length === 16);
  const ecart = (s: Vec3, t: Vec3): number => Math.hypot(s[0] - t[0], s[1] - t[1], s[2] - t[2]);
  // Chaque sommet du haut d'un chanfrein est un sommet du dessus : aucun jour entre les deux.
  for (let pan = 0; pan < 16; pan++) {
    const chanfrein = lisse[2 * pan + 1];
    assert.ok(chanfrein !== undefined);
    for (const sommet of chanfrein.sommets.slice(2)) {
      assert.ok(
        dessus.sommets.some((s) => ecart(s, sommet) < 1e-9),
        `pan ${pan}`,
      );
    }
  }
  assert.ok(
    lisse.every((f) => f.nuance === undefined),
    'sans moletage, aucune strie',
  );
  // Son contour au sol, celui de son ombre, est le rond de son pied.
  assert.deepEqual(contourDePlot(forme), cercle([3, 5], 20, 16));
});

test('un moletage alterne ses stries tout autour, et ne se referme que sur un nombre pair de pans', () => {
  const forme = { centre: [0, 0], base: 0, epaisseur: 6, rayon: 20, chanfrein: 2, teinte: 'alu', moletage: true } as const;
  const dessus = (bord: number) => [{ de: bord, a: 0, teinte: 'alu' }] as const;
  for (const pans of [16, 24, 32]) {
    const flancs = plot({ ...forme, pans, dessus }).slice(0, 2 * pans);
    for (let pan = 0; pan < pans; pan++) {
      const [flanc, chanfrein] = [flancs[2 * pan], flancs[2 * pan + 1]];
      assert.equal(flanc?.nuance, chanfrein?.nuance, 'la strie court du pied jusqu’à l’arête');
      assert.notEqual(flanc?.nuance, flancs[(2 * pan + 2) % (2 * pans)]?.nuance, `${pans} pans : les pans ${pan} et ${pan + 1} ont la même strie`);
    }
  }
  assert.throws(() => plot({ ...forme, pans: 15, dessus }), /nombre pair de pans : 15/);
  assert.doesNotThrow(() => plot({ ...forme, pans: 15, moletage: false, dessus }));
});

test('un dôme d’une seule couronne serait plat : il est refusé', () => {
  assert.throws(() => dome({ centre: [0, 0], rayons: [10, 10], relief: 5, couronnes: [12], teinte: 'alu' }), /au moins deux couronnes/);
});

test('une rosace ne donne jamais la même nuance à deux pétales voisins, du dernier au premier compris', () => {
  for (let petales = 3; petales <= 12; petales++) {
    const fleur = rosace({ centre: [0, 0], rayon: 10, petales, teinte: 'creme', coeur: 'miel' });
    assert.equal(fleur.length, petales + 1);
    for (let i = 0; i < petales; i++) {
      assert.notEqual(
        fleur[i]?.nuance,
        fleur[(i + 1) % petales]?.nuance,
        `${petales} pétales : les pétales ${i} et ${(i + 1) % petales} se confondent`,
      );
    }
    // Chaque pétale tient dans sa part de la fleur : il ne mord pas sur son voisin.
    const pas = 360 / petales;
    fleur.slice(0, petales).forEach((petale, i) => {
      const axe = -90 + pas * i;
      for (const [x, y] of petale.sommets) {
        const angle = (Math.atan2(y, x) * 180) / Math.PI;
        const ecart = Math.abs(((angle - axe + 540) % 360) - 180);
        assert.ok(ecart < pas / 2, `${petales} pétales : le pétale ${i} déborde de ${(ecart - pas / 2).toFixed(1)}°`);
      }
    });
  }
  assert.throws(() => rosace({ centre: [0, 0], rayon: 10, petales: 2, teinte: 'creme', coeur: 'miel' }), /au moins trois pétales : 2/);
});

test('le bosselage d’un dôme donne à chaque facette sa pente sans toucher au contour, et se refait à l’identique', () => {
  const d = { centre: [0, 0], rayons: [20, 20], relief: 10, couronnes: [12, 6], teinte: 'alu' } as const;
  const lisse = dome(d);
  const bossele = dome({ ...d, bosses: { amplitude: 0.1, germe: 3 } });
  assert.deepEqual(dome({ ...d, bosses: { amplitude: 0.1, germe: 3 } }), bossele, 'le même germe redonne les mêmes bosses');
  assert.notDeepEqual(dome({ ...d, bosses: { amplitude: 0.1, germe: 4 } }), bossele, 'un autre germe en donne d’autres');
  assert.equal(bossele.length, lisse.length);
  let deplaces = 0;
  bossele.forEach((facette, i) => {
    facette.sommets.forEach((sommet, j) => {
      const avant = lisse[i]?.sommets[j] ?? [NaN, NaN, NaN];
      assert.deepEqual([sommet[0], sommet[1]], [avant[0], avant[1]], 'vu de dessus, aucun sommet ne bouge : le dessin garde sa forme');
      if (avant[2] === 0) assert.equal(sommet[2], 0, 'le contour reste à plat');
      else if (avant[2] < d.relief) assert.ok(Math.abs(sommet[2] / avant[2] - 1) <= 0.1 + 1e-9, 'une bosse ne dépasse pas l’amplitude demandée');
      if (sommet[2] !== avant[2]) deplaces++;
    });
  });
  assert.ok(deplaces > 20, `${deplaces} sommets bosselés`);
  // Sur la tête, c'est ce qui fait voir les petites facettes : bien plus d'arêtes y séparent deux tons, d'un ou deux crans jamais plus.
  const voisinesDeTonsDifferents = (bosses: { amplitude: number; germe: number }): number => {
    const tete = peindre(teteFacettee({ ...TETE, bosses, centre: [0, 0], teinte: 'vieuxRose' }), DE_DESSUS);
    let differentes = 0;
    for (let i = 0; i < tete.length; i++) {
      for (let j = i + 1; j < tete.length; j++) {
        const [a, b] = [tete[i], tete[j]];
        if (a === undefined || b === undefined) continue;
        const communs = a.contour.filter((p) => b.contour.some((q) => distance(p, q) < 1e-6)).length;
        if (communs >= 2) {
          assert.ok(Math.abs(a.ton - b.ton) <= 2, 'deux facettes voisines ne claquent jamais');
          if (a.ton !== b.ton) differentes++;
        }
      }
    }
    return differentes;
  };
  const sansBosses = voisinesDeTonsDifferents({ amplitude: 0, germe: TETE.bosses.germe });
  const avecBosses = voisinesDeTonsDifferents(TETE.bosses);
  assert.ok(avecBosses >= sansBosses * 1.3, `${avecBosses} arêtes visibles avec les bosses, ${sansBosses} sans`);
});
