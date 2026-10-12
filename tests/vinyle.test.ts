import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle } from '../src/lowpoly/contours';
import { peindre } from '../src/lowpoly/facette';
import { DENSITES } from '../src/ressources/densites';
import { ETIQUETTE } from '../src/ressources/etiquette';
import { PLATINE } from '../src/ressources/platine';
import { contourDuVinyle, vinyle } from '../src/scene/vinyle';

const D = PLATINE.disque;

test('le vinyle se dessine à l’échelle qu’on veut : les mêmes anneaux, tous agrandis d’autant', () => {
  for (const densite of Object.values(DENSITES)) {
    const petit = vinyle({ centre: [0, 0], dessus: D.epaisseur }, densite);
    const grand = vinyle({ centre: [0, 0], dessus: 2 * D.epaisseur, echelle: 2 }, densite);
    assert.equal(grand.length, petit.length, densite.cle);
    petit.forEach((facette, i) => {
      const agrandie = grand[i];
      assert.ok(agrandie !== undefined && agrandie.sommets.length === facette.sommets.length);
      assert.deepEqual([agrandie.teinte, agrandie.fini, agrandie.nuance], [facette.teinte, facette.fini, facette.nuance]);
      facette.sommets.forEach((sommet, j) => {
        const double = agrandie.sommets[j] ?? [NaN, NaN, NaN];
        for (const axe of [0, 1, 2] as const) assert.ok(Math.abs(double[axe] - 2 * sommet[axe]) < 1e-9, `${densite.cle}, facette ${i}`);
      });
    });
    assert.deepEqual(contourDuVinyle({ centre: [0, 0], echelle: 2 }, densite), cercle([0, 0], 2 * D.rayon, densite.pansDeDisque));
  }
});

test('du bord vers le centre : bourrelet, plage d’entrée, plages gravées et entre-plages, plage de sortie, vinyle nu sous le papier', () => {
  for (const densite of Object.values(DENSITES)) {
    const pans = densite.pansDeDisque;
    // Sous le flanc et le chanfrein du bord, le dessus : des anneaux de `pans` facettes, puis le cœur d'un seul polygone.
    const dessus = vinyle({ centre: [0, 0], dessus: D.epaisseur }, densite).slice(2 * pans);
    assert.equal((dessus.length - 1) % pans, 0);
    const anneaux = (dessus.length - 1) / pans;
    // Bourrelet, entrée, puis par plage ses sillons et ses passages serrés, les entre-plages, et la sortie.
    assert.equal(anneaux, 2 + densite.plages * (2 * densite.passagesSerres + 1) + (densite.plages - 1) + 1, densite.cle);
    const rayonDe = (rang: number): number => Math.hypot(dessus[rang * pans]?.sommets[0]?.[0] ?? NaN, dessus[rang * pans]?.sommets[0]?.[1] ?? NaN);
    for (let rang = 1; rang < anneaux; rang++)
      assert.ok(rayonDe(rang) < rayonDe(rang - 1), `${densite.cle} : l'anneau ${rang} n'est pas plus près du centre`);
    assert.ok(Math.abs(rayonDe(1) - D.bourrelet) < 1e-9 && Math.abs(rayonDe(2) - D.entree) < 1e-9);
    assert.ok(Math.abs(rayonDe(anneaux - 1) - D.sortie) < 1e-9, 'le dernier anneau est la plage de sortie');
    // Le cœur, sous l'étiquette : mat, d'un seul polygone, un peu plus petit que le papier qui le recouvre.
    const coeur = dessus.at(-1);
    assert.ok(coeur !== undefined && coeur.sommets.length === pans && coeur.fini === undefined);
    assert.ok(Math.abs(Math.hypot(coeur.sommets[0]?.[0] ?? NaN, coeur.sommets[0]?.[1] ?? NaN) - D.etiquette * ETIQUETTE.recouvrement) < 1e-9);
    // Les sillons : chaque facette gravée porte le sens de ses sillons, tangent au cercle.
    const grave = dessus.filter((f) => f.fini === 'sillons');
    assert.ok(grave.length > 0 && grave.every((f) => f.fil !== undefined));
  }
});

test('le vinyle garde deux secteurs clairs opposés, et aucune facette ne claque avec sa voisine d’anneau', () => {
  const densite = DENSITES.fine;
  const pans = densite.pansDeDisque;
  const peint = peindre(vinyle({ centre: [0, 0], dessus: D.epaisseur }, densite), { genre: 'dessus' });
  // Vu de dessus, il reste le chanfrein du bord, le bourrelet, la plage d'entrée, puis le premier anneau gravé.
  // Sur un anneau gravé, le ton ne dépend que de l'angle : la facette d'en face a le même.
  const sillons = peint.slice(3 * pans, 4 * pans);
  assert.ok(sillons.every((f) => f.contour.length === 4));
  assert.equal(sillons.length, pans);
  sillons.forEach((f, i) => assert.equal(f.ton, sillons[(i + pans / 2) % pans]?.ton, `pan ${i}`));
  const tons = new Set(sillons.map((f) => f.ton));
  assert.ok(tons.has(4) && tons.size >= 3, `tons d'un anneau gravé : ${[...tons].sort().join(', ')}`);
  // D'un pan au suivant, le ton change d'un cran au plus : les secteurs clairs se fondent.
  sillons.forEach((f, i) => assert.ok(Math.abs(f.ton - (sillons[(i + 1) % pans]?.ton ?? NaN)) <= 1, `pans ${i} et ${i + 1}`));
});

test('une densité qui demande plus de plages que le disque n’en a est refusée', () => {
  assert.throws(
    () => vinyle({ centre: [0, 0], dessus: 0 }, { ...DENSITES.fine, plages: D.plages.length + 1 }),
    /n'a que 5 plages : la densité en demande 6/,
  );
});
