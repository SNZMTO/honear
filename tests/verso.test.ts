/**
 * Le verso du disque : les deux façons d'y montrer la réponse. Son fond se dessine d'avance, la réponse à la révélation ;
 * et sous la lampe, la pochette qui prend tout le disque brille là où un vinyle brille.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { peindre } from '../src/lowpoly/facette';
import { azimutDeLaLampe, tonAPlat } from '../src/lowpoly/ombrage';
import type { Polygone } from '../src/lowpoly/polygones';
import { degres, direction, fois, longueur, type Vec2 } from '../src/lowpoly/vecteurs';
import { reponseDExemple } from '../src/planche/exemples';
import type { Reponse } from '../src/regles/piste';
import { DENSITES } from '../src/ressources/densites';
import { PLATINE } from '../src/ressources/platine';
import { TEXTES } from '../src/ressources/textes.fr';
import { VERSO } from '../src/ressources/verso';
import type { Aplat, Calque, Dessin, Peinture, Texte } from '../src/scene/calque';
import { dessinerLaReponseAuVerso, dessinerLeVerso, GENRES_DE_VERSO } from '../src/scene/disque/verso';
import { vinyle } from '../src/scene/vinyle';
import { ENCRIER } from './planche';

const D = PLATINE.disque;
const REPONSE = reponseDExemple(TEXTES);
/** La teinte de la vignette qui tient lieu de pochette à la réponse d'exemple. */
const FOND_DE_LA_VIGNETTE = 'vignette' in REPONSE.pochette ? REPONSE.pochette.vignette.fond : undefined;

/** L'angle d'un point autour du centre du disque, en degrés. */
const angleDe = (p: Vec2): number => degres(Math.atan2(p[1], p[0]));
/** De combien un angle s'écarte d'une direction, en degrés, de -180 à 180. */
const ecartDe = (angle: number, direction: number): number => ((((angle - direction + 180) % 360) + 360) % 360) - 180;
/** De combien un angle s'écarte d'un axe, sans compter son sens : 0 dans l'axe, 90 en travers. */
const ecartDAxe = (angle: number, axe: number): number => Math.min(Math.abs(ecartDe(angle, axe)), Math.abs(ecartDe(angle, axe + 180)));
const milieu = (contour: Polygone): Vec2 => [
  contour.reduce((somme, p) => somme + p[0], 0) / contour.length,
  contour.reduce((somme, p) => somme + p[1], 0) / contour.length,
];

/** Le nombre de tours que des contours font autour d'un point : zéro s'il est dehors, ou dans un trou (un contour tracé dans l'autre sens). */
function toursAutour(contours: readonly Polygone[], [x, y]: Vec2): number {
  let tours = 0;
  for (const contour of contours)
    contour.forEach((p, i) => {
      const q = contour[(i + 1) % contour.length];
      if (q === undefined || p[1] > y === q[1] > y || x >= ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]) return;
      tours += q[1] > p[1] ? 1 : -1;
    });
  return tours;
}
/** Vrai si un point tombe dans une forme faite de ces contours. */
const contient = (contours: readonly Polygone[], p: Vec2): boolean => toursAutour(contours, p) !== 0;

/** Ce qu'on voit en un point de dessins posés les uns sur les autres : la teinte et le ton du dernier qui le couvre. */
function vuEn(dessins: readonly Dessin[], p: Vec2): { readonly teinte: string; readonly ton: number } | undefined {
  let vu: { teinte: string; ton: number } | undefined;
  for (const dessin of dessins) {
    if (dessin.genre === 'aplat' && contient(dessin.contours, p)) vu = dessin;
    if (dessin.genre === 'peinture') vu = dessin.facettes.filter((facette) => contient([facette.contour], p)).pop() ?? vu;
  }
  return vu;
}

/** Un calque de la réponse au verso, par son nom. */
function calqueDe(dessins: readonly Dessin[], nom: string): Calque {
  const trouve = dessins.find((dessin): dessin is Calque => dessin.genre === 'calque' && dessin.nom === nom);
  assert.ok(trouve !== undefined, `pas de calque « ${nom} » au verso : ${dessins.map((d) => (d.genre === 'calque' ? d.nom : d.genre)).join(', ')}`);
  return trouve;
}

test('au recto, un vinyle brille dans l’axe de la lampe et s’éteint en travers ; quand tout le disque est la pochette, elle prend un ton de plus dans le même axe', () => {
  const lampe = azimutDeLaLampe();
  const P = VERSO.disque;
  for (const densite of Object.values(DENSITES)) {
    // Le recto : un anneau gravé du vinyle, vu de dessus. Ses pans les plus clairs sont dans l'axe de la lampe, les plus sombres en travers.
    const pans = densite.pansDeDisque;
    const anneau = peindre(vinyle({ centre: [0, 0], dessus: D.epaisseur }, densite), { genre: 'dessus' }).slice(3 * pans, 4 * pans);
    const tons = anneau.map((pan) => pan.ton);
    const [clair, sombre] = [Math.max(...tons), Math.min(...tons)];
    assert.ok(clair - sombre >= 2, `${densite.cle} : un anneau gravé va du ton ${sombre} au ton ${clair}`);
    for (const pan of anneau) {
      const ecart = ecartDAxe(angleDe(milieu(pan.contour)), lampe);
      if (pan.ton === clair) assert.ok(ecart < P.secteur, `${densite.cle} : un pan clair à ${ecart.toFixed(1)}° de l'axe de la lampe`);
      if (pan.ton > tonAPlat())
        assert.ok(ecart < P.secteur, `${densite.cle} : un pan plus clair que le vinyle à plat à ${ecart.toFixed(1)}° de l'axe`);
      if (ecart < 360 / pans) assert.equal(pan.ton, clair, `${densite.cle} : dans l'axe de la lampe`);
      if (ecart > 90 - 360 / pans) assert.equal(pan.ton, sombre, `${densite.cle} : en travers de la lampe`);
    }

    // Le verso : l'image, puis ce qui brille (un aplat et son motif par secteur), puis les sillons.
    const pochette = calqueDe(dessinerLaReponseAuVerso({ genre: 'disque', reponse: REPONSE }, ENCRIER.largeur, densite), 'disque/verso/pochette');
    const [fond, motif, ...suite] = pochette.contenu;
    const sillons = suite.pop();
    assert.ok(fond?.genre === 'aplat' && motif?.genre === 'peinture' && sillons?.genre === 'aplat');
    const image: readonly Dessin[] = [fond, motif];
    const brillants = {
      aplats: suite.filter((dessin): dessin is Aplat => dessin.genre === 'aplat'),
      motifs: suite.filter((dessin): dessin is Peinture => dessin.genre === 'peinture'),
    };
    assert.equal(brillants.aplats.length, 2, 'deux secteurs');
    assert.equal(brillants.aplats.length + brillants.motifs.length, suite.length);
    // Chaque secteur est une part du disque, d'un bord à l'autre de l'image, de part et d'autre de la lampe ou de son opposé.
    const cotes = brillants.aplats.map((secteur) => {
      assert.deepEqual([secteur.teinte, secteur.ton], [fond.teinte, fond.ton + 1], 'la même teinte, un ton plus clair');
      const bord = secteur.contours.flat().filter((p) => longueur(p) > 1);
      const cote = Math.abs(ecartDe(angleDe(milieu(bord)), lampe)) < 90 ? 0 : 180;
      const ecarts = bord.map((p) => ecartDe(angleDe(p), lampe + cote));
      assert.ok(
        Math.abs(Math.max(...ecarts) - P.secteur) < 0.01 && Math.abs(Math.min(...ecarts) + P.secteur) < 0.01,
        `de ${Math.min(...ecarts)}° à ${Math.max(...ecarts)}°`,
      );
      assert.ok(Math.abs(Math.max(...bord.map(longueur)) - P.image) < 0.01, 'jusqu’au bord de l’image');
      return cote;
    });
    assert.deepEqual([...cotes].sort(), [0, 180], 'un du côté de la lampe, un à l’opposé');
    // Le motif y est le même, un ton plus clair, et ne déborde pas du secteur.
    for (const facette of brillants.motifs.flatMap((peinture) => peinture.facettes)) {
      const dessous = vuEn([motif], milieu(facette.contour));
      assert.ok(dessous !== undefined && facette.teinte === dessous.teinte && facette.ton === Math.min(4, dessous.ton + 1));
      for (const p of facette.contour.filter((point) => longueur(point) > 1))
        assert.ok(ecartDAxe(angleDe(p), lampe) < P.secteur + 0.01, `un motif clair à ${ecartDAxe(angleDe(p), lampe).toFixed(2)}° de l'axe`);
    }

    // Ce qu'on en voit, tout autour du disque, entre les sillons : un ton de plus dans les deux secteurs, le même ailleurs.
    let clairs = 0;
    for (const rayon of [40, 70, 105, 122, 139, 152]) {
      assert.ok(P.sillons.every((sillon) => Math.abs(sillon - rayon) > 2 * P.largeurDeSillon) && rayon < P.image);
      for (let angle = 0.5; angle < 360; angle++) {
        const p = fois(direction(angle), rayon);
        const [vu, imprime] = [vuEn(pochette.contenu, p), vuEn(image, p)];
        assert.ok(vu !== undefined && imprime !== undefined && vu.teinte === imprime.teinte);
        const ecart = ecartDAxe(angle, lampe);
        if (Math.abs(ecart - P.secteur) < 0.6) continue;
        const brille = ecart < P.secteur;
        clairs += brille ? 1 : 0;
        assert.equal(vu.ton, brille ? Math.min(4, imprime.ton + 1) : imprime.ton, `${densite.cle}, à ${angle}° et ${rayon} px du centre`);
      }
    }
    assert.ok(clairs > 6 * 4 * (P.secteur - 1), `${clairs} points vus dans les secteurs clairs`);
    // Les sillons, eux, sont deux tons plus sombres que l'image à plat.
    assert.deepEqual([sillons.teinte, sillons.ton], [fond.teinte, Math.max(0, fond.ton - 2)]);
  }
});

test('quand l’étiquette est la pochette, elle tient au centre sous son liseré, et le vinyle lisse qui l’entoure porte le titre en arc et l’artiste droit', () => {
  const E = VERSO.etiquette;
  for (const densite of Object.values(DENSITES)) {
    const reponse = dessinerLaReponseAuVerso({ genre: 'etiquette', reponse: REPONSE }, ENCRIER.largeur, densite);
    const pochette = calqueDe(reponse, 'disque/verso/pochette');
    const [lisere] = pochette.contenu;
    assert.ok(lisere?.genre === 'aplat' && lisere.teinte === 'creme');
    const points = pochette.contenu.flatMap((dessin) =>
      dessin.genre === 'aplat' ? dessin.contours.flat() : dessin.genre === 'peinture' ? dessin.facettes.flatMap((f) => f.contour) : [],
    );
    assert.ok(Math.abs(Math.max(...points.map(longueur)) - E.pochette) < 1e-6, 'la pochette a le rayon de l’étiquette, liseré compris');
    // Juste sous le liseré, on voit l'image ; sur lui, le crème du papier.
    assert.equal(vuEn(pochette.contenu, [E.pochette - E.lisere / 2, 0])?.teinte, 'creme');
    assert.ok(FOND_DE_LA_VIGNETTE !== undefined);
    assert.equal(vuEn(pochette.contenu, [E.pochette - 2 * E.lisere, 0])?.teinte, FOND_DE_LA_VIGNETTE);

    const titres = calqueDe(reponse, 'disque/verso/titres').contenu.filter((dessin): dessin is Texte => dessin.genre === 'texte');
    const [titre, artiste, ...autres] = titres;
    assert.ok(titre !== undefined && artiste !== undefined && autres.length === 0);
    // Le titre en arc, en haut, dans le caractère de titrage ; l'artiste droit, en bas. Tous deux entre la pochette et les sillons.
    assert.deepEqual([titre.contenu, titre.role, titre.arc?.milieu, titre.arc?.lecture], [REPONSE.titre, 'titrage', -90, 'dessus']);
    assert.deepEqual([artiste.contenu, artiste.role, artiste.arc], [REPONSE.artiste, 'technique', undefined]);
    assert.ok(titre.arc !== undefined && titre.arc.rayon > E.pochette && titre.arc.rayon + titre.corps < E.lisse);
    assert.ok(artiste.en[1] - artiste.corps > E.pochette && artiste.en[1] < E.lisse, 'l’artiste s’écrit sous la pochette, sur le vinyle lisse');
    // Leur encre est le crème, sur le vinyle : le contrôle du rendu vérifie qu'on la lit sur tous ses tons.
    for (const texte of titres) assert.deepEqual([texte.teinte, texte.fond.teinte], ['creme', 'vinyle']);
  }
});

test('le fond du verso se dessine d’avance, la réponse seulement une fois tombée ; une vraie pochette, qu’on ne sait pas encore montrer, garde sa place en papier nu', () => {
  const densite = DENSITES.fine;
  const vraie: Reponse = { titre: REPONSE.titre, artiste: REPONSE.artiste, pochette: { adresse: 'https://exemple.test/pochette.jpg' } };
  const fonds = GENRES_DE_VERSO.map((genre) => {
    const avant = dessinerLeVerso({ genre }, ENCRIER.largeur, densite);
    const apres = dessinerLeVerso({ genre, reponse: REPONSE }, ENCRIER.largeur, densite);
    assert.ok(avant.fond.length > 0 && avant.reponse.length === 0, `${genre} : avant la révélation, le verso n'a que son vinyle`);
    assert.deepEqual(apres.fond, avant.fond, `${genre} : la réponse ne change pas le fond`);
    assert.ok(apres.reponse.length > 0);
    // La vraie pochette : la même place, d'un seul papier, sans motif.
    const pochette = calqueDe(dessinerLeVerso({ genre, reponse: vraie }, ENCRIER.largeur, densite).reponse, 'disque/verso/pochette');
    const rayon = genre === 'etiquette' ? VERSO.etiquette.pochette - 2 * VERSO.etiquette.lisere : VERSO.disque.image - 2;
    for (const angle of [10, 100, 190, 280])
      assert.equal(vuEn(pochette.contenu, fois(direction(angle), rayon * 0.8))?.teinte, 'creme', `${genre}, à ${angle}°`);
    return avant.fond;
  });
  // Les deux façons n'ont pas le même vinyle : l'une garde une plage lisse autour de sa pochette, l'autre non.
  assert.notDeepEqual(fonds[0], fonds[1]);
});
