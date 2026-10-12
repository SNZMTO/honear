import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle, rectangle } from '../src/lowpoly/contours';
import { azimutDeLaLampe, cransDeLaPente, nuancer, tonAPlat, tonDeFacette, tonDuFlanc, versLaLampeAuSol } from '../src/lowpoly/ombrage';
import { decalagesDOmbre, epaisseurLeLongDeLOmbre } from '../src/lowpoly/ombrePortee';
import { placer } from '../src/lowpoly/polygones';
import { TON_DE_BASE } from '../src/lowpoly/tons';
import { degres, direction, type Vec2 } from '../src/lowpoly/vecteurs';
import { LAMPE } from '../src/ressources/lampe';

test('une face posée à plat prend le ton de base', () => {
  assert.equal(tonDeFacette({ normale: [0, 0, 1] }), TON_DE_BASE);
  assert.equal(tonAPlat(), TON_DE_BASE);
});

test('une face tournée vers la lampe prend le ton le plus clair', () => {
  assert.equal(tonDeFacette({ normale: LAMPE.versLaLampe }), 4);
});

test('le flanc avant d’un objet, dos à la lampe, prend le ton le plus sombre', () => {
  assert.equal(tonDeFacette({ normale: [0, 1, 0] }), 0);
  assert.equal(tonDuFlanc(), 0);
});

test('un chanfrein accroche la lumière du côté de la lampe et s’adoucit de l’autre', () => {
  const versLeFond = tonDeFacette({ normale: [0, -1, 1] });
  const versLaGauche = tonDeFacette({ normale: [-1, 0, 1] });
  const versLeJoueur = tonDeFacette({ normale: [0, 1, 1] });
  assert.ok(versLeFond > 2 && versLaGauche > 2, 'les chanfreins côté lampe sont plus clairs que le dessus');
  assert.equal(versLeJoueur, 1, 'le chanfrein avant fait la marche entre le dessus (2) et le flanc (0)');
});

test('une nuance déplace le ton d’un cran au plus, sans sortir des 5 tons', () => {
  assert.equal(tonAPlat(1), 3);
  assert.equal(tonAPlat(-1), 1);
  assert.equal(tonDeFacette({ normale: LAMPE.versLaLampe, nuance: 1 }), 4);
  assert.equal(tonDuFlanc(-1), 0);
});

test('la lampe est en haut à gauche, et sa lumière file vers le bas à droite', () => {
  const [x, y] = versLaLampeAuSol();
  assert.ok(x < 0 && y < 0, 'la lampe est du côté du fond et de la gauche');
  const [dx, dy] = direction(azimutDeLaLampe());
  assert.ok(dx > 0 && dy > 0, 'l’axe de sa lumière va vers la droite et vers le joueur');
  assert.ok(Math.abs(dx * y - dy * x) < 1e-9, 'c’est la même droite');
});

test('le vinyle a deux secteurs clairs opposés, qui ne dépendent que de la lampe', () => {
  const versLaLampeEnDegres = azimutDeLaLampe() + 180;
  // Le sens des sillons est la tangente au cercle : au point d'angle a, c'est la direction a + 90.
  const tonAuPoint = (angle: number) => tonDeFacette({ normale: [0, 0, 1], fil: direction(angle + 90) }, 'sillons');
  assert.equal(tonAuPoint(versLaLampeEnDegres), 4, 'le secteur du côté de la lampe est le plus clair');
  assert.equal(tonAuPoint(versLaLampeEnDegres + 180), 4, 'le secteur opposé aussi');
  assert.ok(tonAuPoint(versLaLampeEnDegres + 90) < tonAuPoint(versLaLampeEnDegres), 'en travers, le vinyle est plus sombre');
  for (let angle = 0; angle < 360; angle += 5) {
    assert.equal(tonAuPoint(angle), tonAuPoint(angle + 180), 'les deux secteurs sont symétriques');
  }
});

test('les ombres partent vers le bas à droite, en paliers de plus en plus lointains', () => {
  for (const hauteur of [3, 6, 16, 40]) {
    const paliers = decalagesDOmbre(hauteur);
    assert.equal(paliers.length, 3);
    let precedent = 0;
    for (const [dx, dy] of paliers) {
      assert.ok(dx > 0 && dy > 0, 'un palier part vers le bas à droite');
      assert.ok(Math.hypot(dx, dy) > precedent, 'chaque palier va plus loin que le précédent');
      precedent = Math.hypot(dx, dy);
    }
  }
  assert.equal(decalagesDOmbre(6, 2).length, 2);
});

test('plus un objet est haut, plus ses paliers d’ombre s’écartent', () => {
  const ecart = (hauteur: number): number => {
    const [premier, , dernier] = decalagesDOmbre(hauteur);
    return Math.hypot((dernier?.[0] ?? 0) - (premier?.[0] ?? 0), (dernier?.[1] ?? 0) - (premier?.[1] ?? 0));
  };
  assert.ok(ecart(40) > ecart(16) && ecart(16) > ecart(3));
});

test('nuancer déplace un ton d’autant de crans qu’on veut, sans jamais sortir des 5 tons', () => {
  assert.equal(nuancer(2, 1), 3);
  assert.equal(nuancer(2, -1), 1);
  assert.equal(nuancer(1, 0), 1);
  assert.equal(nuancer(4, 2), 4);
  assert.equal(nuancer(0, -3), 0);
});

test('une pente change le ton de ce qui est imprimé dessus : plus clair vers la lampe, plus sombre à l’opposé, rien à plat', () => {
  assert.equal(cransDeLaPente([0, 0, 1]), 0);
  assert.ok(cransDeLaPente([-1, 0, 1]) > 0 && cransDeLaPente([0, -1, 1]) > 0, 'un biseau tourné vers la gauche ou vers le fond s’éclaircit');
  assert.ok(cransDeLaPente([1, 0, 1]) < 0 && cransDeLaPente([0, 1, 1]) < 0, 'un biseau tourné vers la droite ou vers le joueur s’assombrit');
  // C'est la même fonction d'ombrage qui répond : une facette de cette pente prend exactement ce ton.
  assert.equal(tonAPlat() + cransDeLaPente([0, 1, 1]), tonDeFacette({ normale: [0, 1, 1] }));
});

/** Écart entre le premier et le dernier palier d'une ombre, en px. */
const ecartDesPaliers = (paliers: readonly Vec2[]): number => {
  const [premier, dernier] = [paliers[0], paliers.at(-1)];
  return premier !== undefined && dernier !== undefined ? Math.hypot(dernier[0] - premier[0], dernier[1] - premier[1]) : NaN;
};

test('sous un objet fin et haut, les paliers se resserrent : l’ombre garde un cœur au lieu de se défaire en copies', () => {
  const hauteur = 30;
  const libres = decalagesDOmbre(hauteur);
  assert.ok(Math.abs(ecartDesPaliers(libres) - hauteur * LAMPE.ombre.allongement * (1 - LAMPE.ombre.paliers[0])) < 1e-9);
  // Un objet épais de 6 px le long de son ombre : ses paliers ne s'écartent pas de plus de 4 px, il lui reste 2 px de cœur.
  const serres = decalagesDOmbre(hauteur, 3, 6);
  assert.ok(Math.abs(ecartDesPaliers(serres) - 6 * (1 - LAMPE.ombre.coeur)) < 1e-9);
  assert.deepEqual(serres.at(-1), libres.at(-1), 'le palier le plus lointain ne bouge pas : l’ombre dit toujours la hauteur');
  for (const [dx, dy] of serres) assert.ok(dx > 0 && dy > 0);
  assert.deepEqual(decalagesDOmbre(hauteur, 3, 100), libres, 'un objet plus épais que son ombre n’est longue garde ses paliers');
  assert.deepEqual(decalagesDOmbre(0), [
    [0, 0],
    [0, 0],
    [0, 0],
  ]);
});

test('l’épaisseur d’une silhouette se mesure le long de l’ombre, pas en travers', () => {
  // Une baguette de 100 × 4, couchée en travers de l'ombre : elle n'a que 4 px à lui offrir.
  const [dx, dy] = decalagesDOmbre(10)[2] ?? [1, 1];
  const sensDeLOmbre = degres(Math.atan2(dy, dx));
  const baguette = rectangle(-50, -2, 100, 4);
  assert.ok(Math.abs(epaisseurLeLongDeLOmbre(placer(baguette, { angle: sensDeLOmbre + 90 })) - 4) < 1e-6);
  // La même, couchée le long de l'ombre : elle lui offre toute sa longueur.
  assert.ok(Math.abs(epaisseurLeLongDeLOmbre(placer(baguette, { angle: sensDeLOmbre })) - 100) < 1e-6);
  // Un rond de rayon 10 : sa corde moyenne, un peu plus d'une fois et demie son rayon.
  const rond = epaisseurLeLongDeLOmbre(cercle([0, 0], 10, 64));
  assert.ok(rond > 15 && rond < 16, rond.toFixed(2));
});
