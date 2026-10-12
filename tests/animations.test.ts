/**
 * Les animations jouées en direct : on ne redessine rien, on règle. Chaque régleur rend ce que le dessin rendrait ; chaque animation
 * se règle à tout instant, sobre ou non, interrompue ou non, et toujours sur les mêmes calques ; interrompue, rien ne saute.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lesAnimations, lireUneAnimation, valeursA, type Animation } from '../src/planche/animations';
import { pochetteDExemple } from '../src/planche/exemples';
import { GESTES } from '../src/ressources/mouvement';
import { TEXTES } from '../src/ressources/textes.fr';
import { dessinerLAmpli, reglerLAmpli } from '../src/scene/ampli';
import { dessinerLeBac, reglerUnePlaylist } from '../src/scene/bac';
import { calque, type Calque } from '../src/scene/calque';
import { finDuGeste } from '../src/scene/gestes/geste';
import { reglerLaBascule } from '../src/scene/platine/interrupteur';
import { dessinerLaPochette, reglerLaPochette } from '../src/scene/pochette';
import { dessinerUnDisqueDeRecompense, reglerUnDisqueRemis } from '../src/scene/recompense';
import { regler, type Reglage } from '../src/scene/reglage';
import { enSvg } from '../src/scene/rendu/svg';
import { ampliDuSalon, bacDesPlaylistsPretes } from '../src/scene/telephone/meuble';
import { DENSITE } from '../src/scene/telephone/pieces';
import { ENCRIER } from './planche';

const enImage = (scene: Calque): string =>
  enSvg(scene, { origine: [0, 0], largeur: 1200, hauteur: 1200, prefixe: 'x-', tracerLeTexte: ENCRIER.tracer, titre: 'x' });
const ANIMATIONS = lesAnimations({ textes: TEXTES, encrier: ENCRIER });
const calquesReglesPar = (reglages: readonly Reglage[]): string[] => [...new Set(reglages.map((r) => r.calque))].sort();

test('une pochette réglée ailleurs, de travers et soulevée, est celle qu’on aurait dessinée là', () => {
  const pochette = pochetteDExemple(TEXTES);
  const pose = { nom: 'pochette-essai' as const, taille: 48, expression: 'content' as const };
  const de = { centre: [200, 300] as const, angle: 6, leve: 0 };
  const a = { centre: [262, 341] as const, angle: -4, leve: 7 };
  const dessinee = dessinerLaPochette(pochette, { ...pose, ...de }, ENCRIER.largeur);
  const la = dessinerLaPochette(pochette, { ...pose, ...a }, ENCRIER.largeur);
  const scene = (p: typeof dessinee): Calque => calque('scene', [p.ombre, p.pochette]);
  assert.equal(enImage(regler(scene(dessinee), reglerLaPochette(dessinee, pose.taille, de, a))), enImage(scene(la)));
});

test('un disque remis réglé plus bas, une facette allumée, est celui qu’on aurait dessiné ainsi', () => {
  const dessin = (leve: number, allumees: readonly number[]): Calque => {
    const d = dessinerUnDisqueDeRecompense('diamant', 'disque-essai', [300, 300], 30, { vivant: true, leve, allumees });
    return calque('scene', [d.ombre, d.disque]);
  };
  assert.equal(
    enImage(regler(dessin(26, []), reglerUnDisqueRemis('disque-essai', [300, 300], 30, { leve: 4, allumees: [7] }))),
    enImage(dessin(4, [7])),
  );
});

test('une playlist réglée hors du bac est celle qu’on aurait dessinée soulevée', () => {
  const bac = bacDesPlaylistsPretes(TEXTES);
  const rang = bac.rangees.findIndex((r) => r.genre === 'pochette');
  const cle = bac.rangees[rang]?.cle ?? '';
  const dessin = (leve: number): Calque =>
    dessinerLeBac({ rangees: bac.rangees.map((r, i) => (i === rang ? { ...r, leve } : r)) }, DENSITE, ENCRIER.largeur);
  assert.equal(enImage(regler(dessin(0), reglerUnePlaylist(cle, 31))), enImage(dessin(31)));
});

test('l’ampli allumé par réglages, sa bascule dans l’une de ses trois poses, est celui qu’on aurait dessiné allumé', () => {
  const etat = ampliDuSalon(TEXTES, false, [0, 0]);
  const eteint = dessinerLAmpli({ ...etat, interrupteur: 0, interrupteurEnTroisPoses: true }, DENSITE);
  for (const course of [1 / 2, 1]) {
    const allume = course === 1;
    const reglages = [...reglerLAmpli({ allume, aiguilles: [0.3, 0.6], volume: etat.volume }), ...reglerLaBascule('ampli', course)];
    const dessine = dessinerLAmpli({ ...etat, allume, aiguilles: [0.3, 0.6], interrupteur: course, interrupteurEnTroisPoses: true }, DENSITE);
    assert.equal(enImage(regler(eteint, reglages)), enImage(dessine), `course ${course}`);
  }
});

/** Les instants où l'on regarde une animation : ses images, son interruption, juste avant et juste après, et bien après sa fin. */
const instantsDe = (animation: Animation): number[] => {
  const a = animation.interruption.a;
  return [...animation.images.map((i) => i.apres), 0, a - 1 / 100, a, a + 1 / 100, finDuGeste(animation.geste) + 1];
};

test('chaque animation se règle à tout instant, sobre ou non, interrompue ou non, et toujours sur les mêmes calques', () => {
  assert.equal(ANIMATIONS.length, 13);
  for (const animation of ANIMATIONS) {
    const calques = calquesReglesPar(animation.regler(valeursA(animation, 0), 0));
    assert.ok(calques.length > 0, animation.cle);
    for (const sobre of [false, true])
      for (const interrompue of [false, true])
        for (const t of instantsDe(animation)) {
          const v = valeursA(animation, t, { sobre, interrompue });
          const reglages = animation.regler(v, t);
          const quoi = `${animation.cle} à ${t.toFixed(3)} s${sobre ? ', sobre' : ''}${interrompue ? ', interrompue' : ''}`;
          assert.deepEqual(calquesReglesPar(reglages), calques, quoi);
          assert.doesNotThrow(() => regler(animation.scene, reglages), quoi);
          for (const [nom, valeur] of Object.entries(v)) assert.ok(Number.isFinite(valeur), `${quoi} : ${nom} = ${valeur}`);
        }
  }
});

/** Le pas auquel on compare, après l'interruption, le chemin interrompu et celui qu'elle aurait suivi. */
const APRES = 0.05;

test('interrompue, chaque grandeur repart d’où elle est : rien ne saute, et le geste change bien de chemin', () => {
  const { pas } = GESTES.rejeu;
  for (const animation of ANIMATIONS) {
    const { a } = animation.interruption;
    const lecture = lireUneAnimation(animation, false);
    let avant = lecture.avancer(0);
    for (let t = 0; t < a; t = Math.min(a, t + pas)) avant = lecture.avancer(Math.min(a, t + pas));
    lecture.interrompre();
    assert.ok(lecture.interrompue, animation.cle);
    const juste = lecture.avancer(a + 1e-4);
    for (const [nom, valeur] of Object.entries(juste))
      assert.ok(Math.abs(valeur - (avant[nom] ?? 0)) < 1 / 2, `${animation.cle} : ${nom} saute de ${avant[nom] ?? 0} à ${valeur}`);
    // Ensuite, elle ne passe plus par où elle serait passée sans interruption.
    const ecart = Math.max(
      ...Array.from({ length: 20 }, (_, k) => {
        const t = a + (k + 1) * APRES;
        const [suivie, interrompue] = [valeursA(animation, t), valeursA(animation, t, { interrompue: true })];
        return Math.max(...Object.keys(interrompue).map((nom) => Math.abs((interrompue[nom] ?? 0) - (suivie[nom] ?? 0))));
      }),
    );
    assert.ok(ecart > 1 / 2, `${animation.cle} : interrompue, elle passe par où elle serait passée (${ecart})`);
  }
});

test('en version sobre, chaque animation finit où elle finit animée, et ne passe par aucun entre-deux', () => {
  for (const animation of ANIMATIONS) {
    const fin = finDuGeste(animation.geste) + 1;
    const [sobre, animee] = [valeursA(animation, fin, { sobre: true }), valeursA(animation, fin)];
    for (const [nom, valeur] of Object.entries(animee))
      assert.ok(Math.abs(valeur - (sobre[nom] ?? NaN)) < 1 / 2, `${animation.cle} : ${nom} finit à ${valeur} animée, à ${sobre[nom]} sobre`);
    // Une grandeur sobre ne prend que ses valeurs d'arrivée : celle du départ, puis celles de ses pas.
    for (const [nom, role] of Object.entries(animation.geste.roles)) {
      const permises = [role.depart, ...role.pas.map((p) => p.arrivee)];
      for (const t of instantsDe(animation)) {
        const v = valeursA(animation, t, { sobre: true })[nom] ?? NaN;
        assert.ok(permises.includes(v), `${animation.cle} : ${nom} vaut ${v} en sobre à ${t} s`);
      }
    }
  }
});
