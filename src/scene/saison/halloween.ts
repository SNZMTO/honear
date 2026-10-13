/**
 * Halloween sur le meuble, en grosses pièces low-poly éclairées par la lampe : une citrouille ronde et côtelée, taillée, où luit une
 * bougie, dans un coin du bas ; une grande toile d'araignée dans un coin du haut, et son araignée pendue à un fil. Sur un grand
 * écran, en plus, une main de squelette agrippée au meuble en haut à gauche, et une chauve-souris qui vole au-dessus de la platine.
 * Chaque pièce est faite à l'origine, puis posée où elle tient (voir placement.ts) : jamais sur un texte ni sur une touche ; au
 * téléphone, la citrouille se glisse dessous. La flamme vacille, la chauve-souris bat des ailes, l'araignée monte et descend (voir
 * `reglerLesBabioles`).
 */

import { cercle, trait } from '../../lowpoly/contours';
import { duFondVersLOeil, peindre, type Facette } from '../../lowpoly/facette';
import { ellipsoide } from '../../lowpoly/formes/ellipsoide';
import { os } from '../../lowpoly/formes/os';
import { tige } from '../../lowpoly/formes/tige';
import { decalagesDOmbre } from '../../lowpoly/ombrePortee';
import { normaleDeNewell, plus, tourner, type Vec2, type Vec3 } from '../../lowpoly/vecteurs';
import { enveloppeConvexe, placer, type Polygone } from '../../lowpoly/polygones';
import { depuisLEcran, estVisible, hauteurPour, projeter, surLEcran } from '../../lowpoly/projection';
import type { NomDeCalque } from '../../lexique';
import { PLATINE } from '../../ressources/platine';
import { HALLOWEEN } from '../../ressources/saison';
import { CENTRE_DU_PLATEAU, HAUTEURS } from '../platine';
import { aplat, calque, peinture, type Calque, type Dessin, type Mesure } from '../calque';
import type { Regard } from '../meuble';
import { ombre, ombreAuPied } from '../ombre';
import { deformation, glissement, opacite, type Reglage } from '../reglage';
import { empriseDe, type Emprise } from '../rendu/emprise';
import { placeLibre, poseeEn, reunir, seChevauchent, unPlan, type Boite } from './placement';

const H = HALLOWEEN;

/** Les tout petits ronds (des yeux) : quelques pans suffisent. */
const PETITS_PANS = 6;
/** Les ombres au sol : assez de pans pour un rond. */
const PANS_D_OMBRE = 12;

/** Ce que fait une hauteur de l'espace, à l'écran, en px visibles. */
const enPxVisibles = (z: number): number => z / hauteurPour(1);

/** Où tombe l'ombre d'une chose haute de tant de px visibles : son palier le plus lointain, à l'écran. */
const portee = (hauteur: number): Vec2 => {
  const decalages = decalagesDOmbre(hauteur);
  return decalages[decalages.length - 1] ?? [0, 0];
};

/** Le rectangle que couvrent des points. */
function bornes(points: readonly Vec2[]): Emprise {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, largeur: Math.max(...xs) - x, hauteur: Math.max(...ys) - y };
}

/** Un point de l'espace, à cette taille. */
const aLaTaille = (p: readonly number[], k: number): Vec3 => [(p[0] ?? 0) * k, (p[1] ?? 0) * k, (p[2] ?? 0) * k];
/** Le même point, de l'autre côté. */
const enMiroir3 = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
const enMiroir = (p: readonly (readonly [number, number])[]): Vec2[] => p.map(([x, y]) => [-x, y]);

/** Une membrane (une aile, une oreille) : chaque triangle se voit, d'un côté ou de l'autre ; il prend son ton du côté qu'on voit. */
const membrane = (triangles: readonly (readonly Vec3[])[], teinte: Facette['teinte']): Facette[] =>
  triangles.map((t) => ({ sommets: estVisible(normaleDeNewell(t)) ? [...t] : [...t].reverse(), teinte }));

/** Des facettes peintes, telles qu'on les voit. */
const peintes = (facettes: readonly Facette[]): Dessin => peinture(peindre(duFondVersLOeil(facettes)));

/**
 * Ce qu'on a déjà fait d'une pièce, gardé par ce qui la fait telle (sa taille, son angle) : chaque écran remonté redemande les
 * mêmes, et il n'en vient qu'une poignée de différentes.
 */
function gardee<R>(faire: (taille: number, angle: number) => R): (taille: number, angle: number) => R {
  const faites = new Map<string, R>();
  return (taille, angle) => {
    const cle = `${taille.toFixed(2)}|${angle}`;
    let faite = faites.get(cle);
    if (faite === undefined) {
      faite = faire(taille, angle);
      faites.set(cle, faite);
    }
    return faite;
  };
}

// ————— La citrouille —————

/** La citrouille faite à l'origine, de ce rayon : ses facettes et sa queue, le milieu de sa face avant à l'écran, sa hauteur. */
function citrouilleALOrigine(r: number): { readonly facettes: Facette[]; readonly face: Vec2; readonly hauteur: number } {
  const C = H.citrouille;
  const [rx, ry, rz] = [C.axes[0] * r, C.axes[1] * r, C.axes[2] * r];
  const corps = ellipsoide({
    centre: [0, 0],
    base: 0,
    rayons: [rx, ry, rz],
    pans: C.pans,
    couronnes: C.couronnes,
    arrondi: true,
    cotes: C.cotes,
    sommetCreuse: C.sommetCreuse,
    teinte: C.teinte,
  });
  const sommet = 2 * rz * (1 - C.sommetCreuse);
  const Q = C.queue;
  const queue = tige({
    pied: [0, 0, sommet - Q.pied * r],
    tete: [Q.penche[0] * r, Q.penche[1] * r, sommet + Q.hauteur * r],
    rayonPied: Q.pied * r,
    rayonTete: Q.tete * r,
    pans: Q.pans,
    teinte: Q.teinte,
  });
  return { facettes: [...corps, ...queue], face: projeter([0, C.visage.face[0] * ry, C.visage.face[1] * rz]), hauteur: 2 * rz };
}

/** La citrouille de ce rayon, faite une fois, et peinte. */
const citrouilleFaite = gardee((r: number) => {
  const c = citrouilleALOrigine(r);
  return { ...c, peinte: peintes(c.facettes) };
});

/** Ce qu'occupe la citrouille de ce rayon autour de son pied, à l'écran, son ombre comprise. */
function boiteDeLaCitrouille(r: number): Boite {
  const { facettes, hauteur } = citrouilleFaite(r, 0);
  const corps = bornes(facettes.flatMap((f) => f.sommets.map(projeter)));
  const v = portee(enPxVisibles(hauteur));
  return reunir(corps, { x: corps.x + v[0], y: v[1] - corps.hauteur / 4, largeur: corps.largeur, hauteur: corps.hauteur / 2 });
}

/** La citrouille, posée par son pied en ce point de l'écran : son ombre, ses côtes et sa queue, son visage taillé et sa flamme. */
function citrouille(en: Vec2, r: number): Calque[] {
  const C = H.citrouille;
  const V = C.visage;
  const { peinte, face, hauteur } = citrouilleFaite(r, 0);
  const k = r / V.surUnRayonDe;
  const trou = (t: readonly (readonly [number, number])[], decalage: Vec2, echelle = 1): Vec2[] => {
    const m = t.reduce<Vec2>((s, p) => [s[0] + p[0] / t.length, s[1] + p[1] / t.length], [0, 0]);
    return t.map(([x, y]) => [face[0] + (m[0] + (x - m[0]) * echelle) * k + decalage[0], face[1] + (m[1] + (y - m[1]) * echelle) * k + decalage[1]]);
  };
  return [
    ombreAuPied('babiole-citrouille/ombre', {
      silhouettes: [cercle(depuisLEcran(en), C.axes[0] * r, PANS_D_OMBRE)],
      hauteur: enPxVisibles(hauteur),
      support: 0,
    }),
    calque(
      'babiole-citrouille',
      [
        peinte,
        // Chaque trou : le bord de la taille, sombre, au-dessus ; puis la lueur de la bougie ; puis sa flamme, qui vacille.
        aplat(
          V.trous.map((t) => trou(t, [0, -V.bord * k])),
          C.teinte,
          0,
        ),
        aplat(
          V.trous.map((t) => trou(t, [0, 0])),
          V.lueur,
          3,
        ),
        calque('babiole-citrouille/flamme', [
          aplat(
            V.trous.map((t) => trou(t, [0, 0], V.flamme)),
            V.lueur,
            4,
          ),
        ]),
      ],
      { role: 'decor', transformations: [{ genre: 'glisser', de: en }] },
    ),
  ];
}

// ————— La toile et son araignée —————

/** Un point de la toile : à tant de degrés du bord du haut, à tant de px de son coin. */
const surLaToile = (coin: Vec2, sens: Vec2, degres: number, r: number): Vec2 => {
  const angle = (degres * Math.PI) / 180;
  return [coin[0] + sens[0] * r * Math.cos(angle), coin[1] + sens[1] * r * Math.sin(angle)];
};

/** La toile, de cette portée, dans ce coin : ses fils qui rayonnent, ses cercles qui ploient vers le coin entre deux fils. */
function toile(coin: Vec2, sens: Vec2, portee: number, k: number): Calque {
  const T = H.toile;
  const rayons = T.rayons.map((degres) => trait([coin, surLaToile(coin, sens, degres, portee)], T.fils.rayon * k));
  const cercles = T.cercles.map((part) => {
    const points = T.rayons.map((degres) => surLaToile(coin, sens, degres, part * portee));
    const ploye = points.flatMap((p, i): Vec2[] => {
      const suivant = points[i + 1];
      if (suivant === undefined) return [p];
      const milieu: Vec2 = [(p[0] + suivant[0]) / 2, (p[1] + suivant[1]) / 2];
      return [p, [milieu[0] + (coin[0] - milieu[0]) * T.ploie, milieu[1] + (coin[1] - milieu[1]) * T.ploie]];
    });
    return trait(ploye, T.fils.cercle * k);
  });
  // Les fils qui rayonnent prennent la lumière ; les cercles, un ton plus bas.
  return calque('babiole-toile', [aplat(cercles, H.teintes.toile, 3), aplat(rayons, H.teintes.toile, 4)], { role: 'decor' });
}

/** L'araignée faite à l'origine (là où sa tête tient à son abdomen), à cette taille : ses facettes, ses pattes, ses yeux, le haut de son abdomen. */
function araigneeALOrigine(k: number): { readonly dessins: Dessin[]; readonly haut: Vec2 } {
  const A = H.araignee;
  const abdomen = ellipsoide({
    centre: [0, 0],
    base: 0,
    rayons: aLaTaille(A.abdomen.rayons, k),
    pans: A.abdomen.pans,
    couronnes: A.abdomen.couronnes,
    teinte: H.teintes.araignee,
  });
  const tete = ellipsoide({
    centre: [A.tete.en[0] * k, A.tete.en[1] * k],
    base: A.tete.base * k,
    rayons: aLaTaille(A.tete.rayons, k),
    pans: A.tete.pans,
    couronnes: A.tete.couronnes,
    teinte: H.teintes.araignee,
  });
  const pattes = A.pattes.flatMap((p) => [trait(placer(p, { echelle: k }), A.patte * k), trait(placer(enMiroir(p), { echelle: k }), A.patte * k)]);
  const yeux = [1, -1].map((cote) => cercle(projeter([cote * A.yeux.en[0] * k, A.yeux.en[1] * k, A.yeux.en[2] * k]), A.yeux.rayon * k, PETITS_PANS));
  return {
    dessins: [aplat(pattes, H.teintes.araignee, 1), peintes([...abdomen, ...tete]), aplat(yeux, H.teintes.yeux, 4)],
    haut: projeter([0, 0, 2 * (A.abdomen.rayons[2] ?? 0) * k]),
  };
}

/** L'araignée, pendue par son fil à ce point de la toile : son fil, puis elle, qui monte et descend (son second glissement). */
function araignee(accroche: Vec2, fil: number, k: number): Calque {
  const { dessins, haut } = araigneeALOrigine(k);
  const en: Vec2 = [accroche[0] - haut[0], accroche[1] + fil - haut[1]];
  return calque('babiole-araignee', [aplat([trait([[haut[0], haut[1] - fil], haut], H.toile.fils.cercle * k)], H.teintes.toile, 3), ...dessins], {
    role: 'mobile',
    transformations: [
      { genre: 'glisser', de: en },
      { genre: 'glisser', de: [0, 0] },
    ],
  });
}

/** Ce qu'occupent la toile et son araignée depuis leur coin, à cette portée. */
function boiteDeLaToile(sens: Vec2, portee: number, k: number): Boite {
  const A = H.araignee;
  const accroche = surLaToile([0, 0], sens, A.angle, (H.toile.cercles[A.cercle] ?? 0) * portee);
  const bete = Math.max(...A.pattes.flat().map(([x]) => Math.abs(x))) * k;
  const bas = accroche[1] + A.fil * portee + 2 * ((A.abdomen.rayons[2] ?? 0) - A.tete.base) * k + H.mouvement.araignee.hauteur;
  return reunir(
    { x: Math.min(0, sens[0] * portee), y: 0, largeur: portee, hauteur: portee },
    { x: accroche[0] - bete, y: accroche[1], largeur: 2 * bete, hauteur: bas - accroche[1] },
  );
}

// ————— La chauve-souris —————

/**
 * La chauve-souris faite à l'origine (le dessous de son corps), à cette taille, ailes ouvertes : son corps, sa tête, ses oreilles et
 * ses yeux ; ses ailes, à part (elles battent), membrane et os ; l'empreinte de ses ailes, vue de dessus, pour son ombre.
 */
function chauveSourisALOrigine(k: number): { readonly corps: Dessin[]; readonly ailes: Dessin[]; readonly empreinte: Vec2[] } {
  const V = H.volante;
  // Penchée vers nous autour du milieu de son corps : sa tête se lève, son ventre et ses yeux se tournent vers l'œil.
  const angle = (V.penche * Math.PI) / 180;
  const milieu = (V.corps.rayons[2] ?? 0) * k;
  const pencher = (p: Vec3): Vec3 => {
    const [y, z] = [p[1], p[2] - milieu];
    return [p[0], y * Math.cos(angle) - z * Math.sin(angle), milieu + y * Math.sin(angle) + z * Math.cos(angle)];
  };
  const penchees = (facettes: readonly Facette[]): Facette[] => facettes.map((f) => ({ ...f, sommets: f.sommets.map(pencher) }));
  const corps = ellipsoide({
    centre: [0, 0],
    base: 0,
    rayons: aLaTaille(V.corps.rayons, k),
    pans: V.corps.pans,
    couronnes: V.corps.couronnes,
    teinte: V.teintes.corps,
  });
  const tete = ellipsoide({
    centre: [V.tete.en[0] * k, V.tete.en[1] * k],
    base: V.tete.base * k,
    rayons: aLaTaille(V.tete.rayons, k),
    pans: V.tete.pans,
    couronnes: V.tete.couronnes,
    teinte: V.teintes.corps,
  });
  const oreille = V.oreille.map((p) => pencher(aLaTaille(p, k)));
  const oreilles = membrane([oreille, oreille.map(enMiroir3)], V.teintes.corps);
  const aile = V.aile.points.map((p) => pencher(aLaTaille(p, k)));
  const triangles = V.aile.triangles.flatMap((t): Vec3[][] => {
    const sommets = t.map((rang) => aile[rang]);
    return sommets.every((p): p is Vec3 => p !== undefined) ? [sommets] : [];
  });
  const membranes = membrane([...triangles, ...triangles.map((t) => t.map(enMiroir3))], V.teintes.ailes);
  const os = V.aile.os.flatMap(([de, a]) => {
    const [p, q] = [aile[de], aile[a]];
    return p !== undefined && q !== undefined
      ? [trait([projeter(p), projeter(q)], V.os * k), trait([projeter(enMiroir3(p)), projeter(enMiroir3(q))], V.os * k)]
      : [];
  });
  const yeux = [1, -1].map((cote) =>
    cercle(projeter(pencher([cote * V.yeux.en[0] * k, V.yeux.en[1] * k, V.yeux.en[2] * k])), V.yeux.rayon * k, PETITS_PANS),
  );
  return {
    corps: [peintes([...penchees(corps), ...penchees(tete), ...oreilles]), aplat(yeux, H.teintes.yeux, 4)],
    ailes: [peintes(membranes), aplat(os, V.teintes.os, 1)],
    empreinte: enveloppeConvexe([...aile, ...aile.map(enMiroir3)].map(([x, y]): Vec2 => [x, y])),
  };
}

/** La chauve-souris de cette taille, faite une fois. */
const chauveSourisFaite = gardee((k: number) => chauveSourisALOrigine(k));

/**
 * La chauve-souris qui vole au-dessus de la platine, vers le milieu de son bord du fond : son ombre, sur la platine ; elle bat des
 * ailes (« …/ailes »), et monte et descend (son second glissement).
 */
function chauveSouris(): Calque[] {
  const V = H.volante;
  const sous: Vec2 = [PLATINE.position[0] + PLATINE.socle.largeur * V.auDessusDeLaPlatine[0], PLATINE.position[1] + V.auDessusDeLaPlatine[1]];
  const { corps, ailes, empreinte } = chauveSourisFaite(V.taille, 0);
  return [
    ombre('babiole-chauve-souris/ombre', { en: sous, silhouettes: [empreinte], hauteur: V.vol, support: HAUTEURS.socle, paliers: 2 }),
    calque(
      'babiole-chauve-souris',
      [calque('babiole-chauve-souris/ailes', ailes, { transformations: [{ genre: 'deformer', par: [1, 0, 0, 1] }] }), ...corps],
      {
        role: 'mobile',
        transformations: [
          { genre: 'glisser', de: surLEcran(sous, HAUTEURS.socle + V.vol) },
          { genre: 'glisser', de: [0, 0] },
        ],
      },
    ),
  ];
}

// ————— La main de squelette —————

/** Un os de la main : ses deux bouts, son rayon ; une articulation : son milieu, son rayon. */
interface OsDeLaMain {
  readonly de: Vec3;
  readonly a: Vec3;
  readonly rayon: number;
}
interface Articulation {
  readonly en: Vec3;
  readonly rayon: number;
}

/**
 * La main de squelette faite à l'origine (la ligne de ses jointures), à cette taille, tournée vers le bas à droite : ses facettes,
 * rangées ensemble ; les silhouettes de ses os sur le bois, dans le plan du meuble ; la hauteur de ses jointures, en px visibles.
 */
function mainALOrigine(k: number, angle: number): { readonly facettes: Facette[]; readonly silhouettes: Polygone[]; readonly hauteur: number } {
  const M = H.main;
  const os3 = (p: readonly number[]): Vec3 => [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
  const lesOs: OsDeLaMain[] = M.avantBras.map((b) => ({ de: os3(b.de), a: os3(b.a), rayon: b.rayon }));
  const articulations: Articulation[] = M.carpe.billes.map((en) => ({ en: os3(en), rayon: M.carpe.rayon }));
  const pointes: Articulation[] = [];
  for (const d of M.doigts) {
    const rayon = (rang: number): number => d.rayon * (M.finesse[rang] ?? 1);
    lesOs.push({ de: os3(d.pied), a: os3(d.jointure), rayon: rayon(0) });
    articulations.push({ en: os3(d.jointure), rayon: rayon(0) * M.articulation.grosseur });
    const longueur = Math.hypot(d.direction[0], d.direction[1]);
    const [dx, dy] = [d.direction[0] / longueur, d.direction[1] / longueur];
    let ici = os3(d.jointure);
    for (const [rang, [l, pente]] of d.phalanges.entries()) {
      const p = (pente * Math.PI) / 180;
      const la: Vec3 = [ici[0] + dx * l * Math.cos(p), ici[1] + dy * l * Math.cos(p), ici[2] + l * Math.sin(p)];
      lesOs.push({ de: ici, a: la, rayon: rayon(rang + 1) });
      const derniere = rang === d.phalanges.length - 1;
      (derniere ? pointes : articulations).push({ en: la, rayon: rayon(rang + 1) * (derniere ? 1 : M.articulation.grosseur) });
      ici = la;
    }
  }
  // Les pointes des doigts s'appuient sur le bois : toute la main descend jusqu'à la plus basse.
  const descente = Math.min(...pointes.map((p) => p.en[2] - p.rayon));
  const poser = (p: Vec3): Vec3 => {
    const [x, y] = tourner([p[0] * k, p[1] * k], angle);
    return [x, y, (p[2] - descente) * k];
  };
  const facettes = [
    ...lesOs.flatMap((o) =>
      os({
        de: poser(o.de),
        a: poser(o.a),
        rayon: o.rayon * k,
        amincit: M.amincit,
        pans: M.pans,
        couronnesAuPlus: M.couronnesAuPlus,
        teinte: M.teinte,
      }),
    ),
    ...[...articulations, ...pointes].flatMap((j) => {
      const [x, y, z] = poser(j.en);
      const r = j.rayon * k;
      return ellipsoide({
        centre: [x, y],
        base: z - r,
        rayons: [r, r, r],
        pans: M.articulation.pans,
        couronnes: M.articulation.couronnes,
        teinte: M.teinte,
      });
    }),
  ];
  const silhouettes = lesOs.map((o) => {
    const [de, a] = [poser(o.de), poser(o.a)];
    return trait(
      [
        [de[0], de[1]],
        [a[0], a[1]],
      ],
      2 * o.rayon * k,
    );
  });
  const jointures = M.doigts.map((d) => poser(os3(d.jointure))[2]);
  return { facettes, silhouettes, hauteur: enPxVisibles(Math.max(...jointures)) };
}

/** La main de cette taille et de cet angle, faite une fois : peinte, et ce qu'elle occupe à l'écran autour de son origine. */
const mainFaite = gardee((k: number, angle: number) => {
  const m = mainALOrigine(k, angle);
  return { ...m, peinte: peintes(m.facettes), bornes: bornes(m.facettes.flatMap((f) => f.sommets.map(projeter))) };
});

/**
 * La main de squelette agrippée au meuble en haut à gauche du regard, venue d'au-delà de lui : à la première de ses places où elle
 * ne couvre ni un texte, ni une touche, ni l'étiquette du disque, la plus grande qui y tient ; ou rien.
 */
function mainDansLeCoin(cadre: Emprise, aEviter: readonly Emprise[]): Calque[] {
  const M = H.main;
  const T = M.taille;
  for (const place of M.places) {
    // Ce qu'elle occupe à la taille 1, de cet angle : à une autre taille, c'est autant de fois plus grand.
    const unite = mainFaite(1, place.angle).bornes;
    for (let pas = 0; T.auPlus - pas * M.taille.pas >= T.auMoins; pas++) {
      const k = T.auPlus - pas * M.taille.pas;
      const en: Vec2 = [
        cadre.x + place.depuisLeBord[0] * cadre.largeur + place.depuis[0] * k,
        cadre.y + place.depuisLeBord[1] * cadre.hauteur + place.depuis[1] * k,
      ];
      const tout: Emprise = { x: en[0] + unite.x * k, y: en[1] + unite.y * k, largeur: unite.largeur * k, hauteur: unite.hauteur * k };
      // Ce qu'on en voit : ce qui tient dans le regard.
      const [x, y] = [Math.max(tout.x, cadre.x), Math.max(tout.y, cadre.y)];
      const vue: Emprise = {
        x,
        y,
        largeur: Math.min(tout.x + tout.largeur, cadre.x + cadre.largeur) - x,
        hauteur: Math.min(tout.y + tout.hauteur, cadre.y + cadre.hauteur) - y,
      };
      if (aEviter.some((o) => seChevauchent(vue, o))) continue;
      const { peinte, silhouettes, hauteur } = mainFaite(k, place.angle);
      const sol = depuisLEcran(en);
      return [
        ombreAuPied('babiole-main/ombre', { silhouettes: silhouettes.map((s) => s.map((p) => plus(p, sol))), hauteur, support: 0, paliers: 2 }),
        // Elle ne bouge pas : figée en image d'un bloc, elle ne pèse pas sur le décor.
        calque('babiole-main', [peinte], { role: 'image', transformations: [{ genre: 'glisser', de: en }] }),
      ];
    }
  }
  return [];
}

/** L'étiquette du disque, sur la platine, telle qu'on la voit : elle porte le code de la room ; rien ne se pose dessus. */
function etiquetteDuDisque(): Emprise {
  const r = PLATINE.disque.etiquette;
  const [haut, bas] = [
    surLEcran([CENTRE_DU_PLATEAU[0], CENTRE_DU_PLATEAU[1] - r], HAUTEURS.disque),
    surLEcran([CENTRE_DU_PLATEAU[0], CENTRE_DU_PLATEAU[1] + r], HAUTEURS.disque),
  ];
  return { x: CENTRE_DU_PLATEAU[0] - r, y: haut[1], largeur: 2 * r, hauteur: bas[1] - haut[1] };
}

// ————— Où tout se pose —————

/** Les meubles qu'une toile peut couvrir, dans son coin : ce n'est ni un texte ni une touche. */
const SOUS_LA_TOILE: ReadonlySet<string> = new Set(['platine', 'ampli']);

/** Les coins du haut où tendre la toile, dans l'ordre où on les essaie : à droite (rien d'écrit n'y est), puis à gauche. */
const COINS: readonly Vec2[] = [
  [-1, 1],
  [1, 1],
];

/** La toile la plus grande qui tient dans un coin du haut sans toucher un texte ni une touche, et son araignée ; ou rien. */
function toileDansUnCoin(cadre: Emprise, aEviter: readonly Emprise[], petit: boolean): Calque[] {
  const T = H.toile;
  const k = petit ? T.taille.petit : T.taille.grand;
  const plusGrande = petit ? T.portee.petit : T.portee.grand;
  for (let portee = plusGrande; portee >= plusGrande * T.auMoins; portee -= T.pas) {
    for (const sens of COINS) {
      const coin: Vec2 = [sens[0] > 0 ? cadre.x : cadre.x + cadre.largeur, cadre.y];
      const ici = poseeEn(boiteDeLaToile(sens, portee, k), coin, H.placement.marge);
      if (aEviter.some((o) => seChevauchent(ici, o))) continue;
      const A = H.araignee;
      const accroche = surLaToile(coin, sens, A.angle, (T.cercles[A.cercle] ?? 0) * portee);
      return [toile(coin, sens, portee, k), araignee(accroche, A.fil * portee, k)];
    }
  }
  return [];
}

/** Sur un grand regard, la plus grosse citrouille qui tient, au plus près de là où elle vise : elle peut sortir un peu du regard. */
function citrouilleQuiTient(cadre: Emprise, objets: readonly Emprise[]): Calque[] {
  const C = H.citrouille.grand;
  const pas = Math.max(H.placement.pas, Math.round(cadre.largeur / H.placement.pointsEnLargeur));
  // Ce qu'elle occupe au rayon 1 : à un autre rayon, c'est autant de fois plus grand.
  const unite = boiteDeLaCitrouille(1);
  for (let r = C.auPlus; r >= C.auMoins; r -= C.pas) {
    const boite: Boite = { x: unite.x * r, y: unite.y * r, largeur: unite.largeur * r, hauteur: unite.hauteur * r };
    // Le plan s'étend de chaque côté du regard, et en bas, d'autant qu'elle peut en sortir : là, rien ne la gêne.
    const [cote, bas] = [boite.largeur * C.deborde[0], boite.hauteur * C.deborde[1]];
    const plan = unPlan({ x: cadre.x - cote, y: cadre.y, largeur: cadre.largeur + 2 * cote, hauteur: cadre.hauteur + bas }, pas, objets);
    const en = placeLibre(boite, [cadre.x + C.vers[0] * cadre.largeur, cadre.y + C.vers[1] * cadre.hauteur], plan, H.placement.marge);
    if (en !== undefined) return citrouille(en, r);
  }
  return [];
}

/**
 * Sur un petit regard, la grosse citrouille d'un coin du bas, qui sort du regard. De ses places (à droite, puis à gauche ; tant de
 * sa largeur hors du regard par le côté, tant de sa hauteur par le bas), la première où son visage est le moins caché par le bord
 * du regard, parmi celles où rien de ce que l'écran montre ne la touche : glissée sous une touche, elle avait l'air d'un oubli.
 * S'il n'y en a pas, l'écran n'a pas de citrouille.
 */
function citrouilleDansUnCoin(cadre: Emprise, objets: readonly Emprise[]): Calque[] {
  const C = H.citrouille.petit;
  const V = H.citrouille.visage;
  const r = C.rayon;
  const unite = boiteDeLaCitrouille(1);
  const boite: Boite = { x: unite.x * r, y: unite.y * r, largeur: unite.largeur * r, hauteur: unite.hauteur * r };
  // Des points répartis sur son visage, autour de son pied : on compte ceux qu'on ne verrait pas.
  const { face } = citrouilleFaite(r, 0);
  const k = r / V.surUnRayonDe;
  const traits = bornes(V.trous.flat());
  const [colonnes, rangees] = C.points;
  const points = Array.from({ length: colonnes * rangees }, (_, i): Vec2 => [
    face[0] + (traits.x + (traits.largeur * (2 * (i % colonnes) + 1)) / (2 * colonnes)) * k,
    face[1] + (traits.y + (traits.hauteur * (2 * Math.floor(i / colonnes) + 1)) / (2 * rangees)) * k,
  ]);
  const dans = (p: Vec2, e: Emprise): boolean => p[0] >= e.x && p[0] <= e.x + e.largeur && p[1] >= e.y && p[1] <= e.y + e.hauteur;
  let meilleure: { readonly en: Vec2; readonly caches: number } | undefined;
  for (const aDroite of [true, false]) {
    for (const cote of C.sort.cote) {
      for (const bas of C.sort.bas) {
        const en: Vec2 = [
          aDroite ? cadre.x + cadre.largeur - boite.x - boite.largeur * (1 - cote) : cadre.x - boite.x - boite.largeur * cote,
          cadre.y + cadre.hauteur - boite.y - boite.hauteur * (1 - bas),
        ];
        if (objets.some((o) => seChevauchent(poseeEn(boite, en), o))) continue;
        const caches = points.filter((p) => !dans(plus(p, en), cadre)).length;
        if (meilleure === undefined || caches < meilleure.caches) meilleure = { en, caches };
      }
    }
  }
  return meilleure !== undefined ? citrouille(meilleure.en, r) : [];
}

/** Le décor d'un écran : ce qui se pose sous ce qu'il montre, et ce qui se pose par-dessus. */
export interface Decor {
  readonly dessous: Calque[];
  readonly dessus: Calque[];
}

/** Les ombres d'abord, puis le reste, dans l'ordre où on l'a posé. */
const ombresDAbord = (calques: readonly Calque[]): Calque[] => [
  ...calques.filter((c) => c.nom.endsWith('/ombre')),
  ...calques.filter((c) => !c.nom.endsWith('/ombre')),
];

/**
 * Le décor d'Halloween d'un écran, posé dans ce regard. La toile, dans un coin du haut ; sur un grand regard, la main de squelette,
 * la chauve-souris au-dessus de la platine, et la plus grosse citrouille qui tient, là où rien de ce que l'écran montre ne se tient ;
 * sur un petit regard (un téléphone), la grosse citrouille d'un coin du bas, sous ce qu'il montre.
 * @param objets ce que l'écran montre déjà, meubles compris : rien ne s'y pose dessus.
 * @param sol faux quand le regard glisse sous ce qu'on pose (une piste) : sur un grand regard, la citrouille, posée sur le bois,
 * n'y est pas.
 */
export function decorDHalloween(regard: Regard, objets: readonly Calque[], mesurer: Mesure, sol = true): Decor {
  const cadre: Emprise = { x: regard.origine[0], y: regard.origine[1], largeur: regard.largeur, hauteur: regard.hauteur };
  const petit = regard.largeur < H.petitRegard;
  const emprises = objets.map((o) => ({ nom: o.nom, emprise: empriseDe([o], mesurer) }));
  const toutes = emprises.flatMap((o) => (o.emprise !== undefined ? [o.emprise] : []));
  const aEviter = emprises.flatMap((o) => (o.emprise !== undefined && !SOUS_LA_TOILE.has(o.nom) ? [o.emprise] : []));
  /** Ce qu'on a déjà posé du décor : rien d'autre ne s'y pose. */
  const prises = (calques: readonly Calque[]): Emprise[] =>
    calques.flatMap((c) => {
      const e = empriseDe([c], mesurer);
      return e !== undefined ? [e] : [];
    });

  const dessus = toileDansUnCoin(cadre, aEviter, petit);
  // Au téléphone, la citrouille tient au coin de l'écran, piste comprise.
  if (petit) return { dessous: ombresDAbord(citrouilleDansUnCoin(cadre, toutes)), dessus: ombresDAbord(dessus) };
  // L'étiquette du disque porte le code de la room : la main ne la couvre pas.
  const platine = emprises.find((o) => o.nom === 'platine')?.emprise;
  dessus.push(...mainDansLeCoin(cadre, [...aEviter, ...(platine !== undefined ? [etiquetteDuDisque()] : []), ...prises(dessus)]));
  // La chauve-souris vole au-dessus de la platine, quand le regard la montre tout entière.
  if (platine !== undefined && platine.x >= cadre.x && platine.x + platine.largeur <= cadre.x + cadre.largeur) dessus.push(...chauveSouris());
  if (sol) dessus.push(...citrouilleQuiTient(cadre, [...toutes, ...prises(dessus)]));
  return { dessous: [], dessus: ombresDAbord(dessus) };
}

/** Ce qui bouge : la flamme de la citrouille, la chauve-souris et ses ailes, l'araignée. */
export const BABIOLE_QUI_BOUGE = /^babiole-(citrouille\/flamme|chauve-souris|chauve-souris\/ailes|araignee)$/;

/**
 * Ce que le mouvement règle sur ce qui bouge du décor, à cet instant : la flamme vacille (deux battements qui se mêlent) ; la
 * chauve-souris bat des ailes, et monte et descend ; l'araignée monte et descend au bout de son fil.
 */
export function reglerLesBabioles(noms: readonly NomDeCalque[], t: number): Reglage[] {
  const M = H.mouvement;
  const onde = (periode: number): number => Math.sin((2 * Math.PI * t) / periode);
  return noms.flatMap((nom): Reglage[] => {
    switch (nom) {
      case 'babiole-citrouille/flamme': {
        const [a, b] = M.flamme.periodes;
        return [opacite(nom, M.flamme.de + ((1 - M.flamme.de) * (2 + onde(a) + onde(b))) / 4)];
      }
      case 'babiole-chauve-souris/ailes':
        return [deformation(nom, 0, [M.ailes.de + ((1 - M.ailes.de) * (1 + onde(M.ailes.periode))) / 2, 0, 0, 1])];
      case 'babiole-chauve-souris':
        return [glissement(nom, 1, [0, M.vol.hauteur * onde(M.vol.periode)])];
      case 'babiole-araignee':
        return [glissement(nom, 1, [0, M.araignee.hauteur * onde(M.araignee.periode)])];
      default:
        return [];
    }
  });
}
