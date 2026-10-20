/**
 * La planche du tournoi : chaque écran tient les règles du rendu et celles du téléphone (son cadre, ce qu'on y pose reste dedans,
 * aucune touche n'en chevauche une autre) ; un duel dit qui a voté sans dire pour quoi, montre les deux titres, et la clôture range
 * chacun sous sa face ; l'hôte ne clôt qu'un duel où quelqu'un a voté ; le salon et la kraft disent le tournoi ; le tableau cercle le
 * duel suivant ; le palmarès remet les disques.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEGENDES_DU_TOURNOI as L } from '../src/planche/tournoi/legendes.fr';
import { imagesDuTournoi, toutesLesImagesDuTournoi } from '../src/planche/tournoi/scenes';
import { CADRAGES } from '../src/ressources/cadrages';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque, Texte } from '../src/scene/calque';
import { faceEnHaut } from '../src/scene/duel';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { empriseDe, type Emprise } from '../src/scene/rendu/emprise';
import { dessins, ENCRIER } from './planche';

const PAR_SECTION = imagesDuTournoi(TEXTES, ENCRIER);
const IMAGES = toutesLesImagesDuTournoi(TEXTES, ENCRIER);
const image = (fichier: string) => {
  const trouvee = IMAGES.find((i) => i.fichier === `tournoi-${fichier}`);
  assert.ok(trouvee !== undefined, fichier);
  return trouvee;
};
const posesSur = (fichier: string, motif: RegExp): Calque[] =>
  image(fichier).scene.contenu.flatMap((d) => (d.genre === 'calque' && motif.test(d.nom) ? [d] : []));
const textesDe = (fichier: string): Texte[] => dessins(image(fichier).scene).flatMap((d) => (d.genre === 'texte' ? [d] : []));
const toutCeQuOnLit = (fichier: string): string =>
  textesDe(fichier)
    .map((t) => t.contenu)
    .join(' ');
/** Deux emprises qui se chevauchent de plus d'un px : comme pour les écrans de l'étape 5, un bord commun ne compte pas. */
const seChevauchent = (a: Emprise, b: Emprise): boolean =>
  a.x < b.x + b.largeur - 1 && b.x < a.x + a.largeur - 1 && a.y < b.y + b.hauteur - 1 && b.y < a.y + a.hauteur - 1;

test('les écrans du tournoi tiennent les règles du rendu : aucun défaut, décor et calques mobiles sous leurs limites', () => {
  assert.equal(IMAGES.length, 13);
  for (const i of IMAGES) {
    const c = controler(i.scene);
    assert.deepEqual(c.constats, [], i.fichier);
    assert.ok(c.polygonesDuDecor <= LIMITES.decor, `${i.fichier} : ${c.polygonesDuDecor} polygones de décor`);
    assert.ok(c.plusLourdCalqueMobile.poids < LIMITES.mobile, `${i.fichier} : ${c.plusLourdCalqueMobile.nom}`);
  }
});

test('chaque écran du tournoi est un regard de 390 × 844 ; rien n’est abrégé ; ce qu’on y pose et ce qu’on y touche reste dans le cadre ; aucune touche n’en chevauche une autre', () => {
  const { largeur, hauteur } = CADRAGES.telephone;
  for (const { fichier, regard, scene } of IMAGES) {
    assert.deepEqual([regard.largeur, regard.hauteur], [largeur, hauteur], fichier);
    const nom = fichier.replace(/^tournoi-/, '');
    for (const t of textesDe(nom)) assert.ok(!t.contenu.endsWith('…'), `${fichier} : « ${t.contenu} » est abrégé`);
    const [ox, oy] = regard.origine;
    for (const objet of posesSur(nom, /^(pochette-(joueur|vote|titre)|pastille-|touche-|etiquette-|disque-(diamant|platine|or))[^/]*$/)) {
      const e = empriseDe([objet], ENCRIER.largeur);
      assert.ok(e !== undefined, objet.nom);
      assert.ok(
        e.x >= ox && e.x + e.largeur <= ox + largeur && e.y >= oy && e.y + e.hauteur <= oy + hauteur,
        `${fichier} : ${objet.nom} sort du cadre`,
      );
    }
    const touches = scene.contenu.flatMap((d) => {
      const e = d.genre === 'calque' && d.nom.startsWith('touche-') ? empriseDe([d], ENCRIER.largeur) : undefined;
      return e !== undefined && d.genre === 'calque' ? [{ nom: d.nom, e }] : [];
    });
    for (const [i, a] of touches.entries())
      for (const b of touches.slice(i + 1)) assert.ok(!seChevauchent(a.e, b.e), `${fichier} : « ${a.nom} » chevauche « ${b.nom} »`);
  }
});

test('un duel montre ses deux titres sur leurs étiquettes, A et B ; on y lit qui a voté, jamais pour quoi', () => {
  const premier = toutCeQuOnLit('premier');
  for (const { titre } of L.titres.slice(0, 2)) assert.ok(premier.includes(titre.toUpperCase()) || premier.includes(titre), titre);
  assert.ok(premier.includes('0 SUR 6 ONT VOTÉ') || premier.includes('0 sur 6 ont voté'));
  assert.equal(posesSur('premier', /^etiquette-face-[AB]$/).length, 2);
  // Trois ont voté : trois pastilles sur l'éventail, sans rien d'écrit.
  const pastilles = posesSur('vote', /^pastille-joueur-\d+-1$/);
  assert.equal(pastilles.length, 3);
  for (const p of pastilles)
    assert.deepEqual(
      dessins(p).filter((d) => d.genre === 'texte'),
      [],
      `${p.nom} dit pour quoi on a voté`,
    );
});

test('l’hôte clôt un duel où quelqu’un a voté sans attendre les autres ; personne d’autre, et pas avant le premier vote', () => {
  assert.equal(posesSur('vote', /^touche-clore$/).length, 1);
  assert.equal(posesSur('premier', /^touche-clore$/).length, 0, 'personne n’a voté');
  assert.equal(posesSur('spectateur', /^touche-clore$/).length, 0, 'le retardataire ne tient pas la platine');
});

test('à la clôture, chacun passe sous la face qu’il a votée, et chaque face dit ses voix ; au forfait, pas de voix', () => {
  assert.equal(posesSur('cloture', /^pochette-vote-A-\d+$/).length, 4);
  assert.equal(posesSur('cloture', /^pochette-vote-B-\d+$/).length, 2);
  assert.ok(toutCeQuOnLit('cloture').includes(`4 ${'VOIX'}`) || toutCeQuOnLit('cloture').includes('4 voix'));
  assert.equal(posesSur('egalite', /^pochette-vote-A-\d+$/).length, 3);
  assert.equal(posesSur('egalite', /^pochette-vote-B-\d+$/).length, 3);
  assert.equal(posesSur('forfait', /^pastille-voix-/).length, 0);
  assert.equal(posesSur('forfait', /^pochette-vote-/).length, 0);
});

test('le disque d’un duel se retourne toujours du même côté : la face B à 180°, de nouveau la face A à 360°', () => {
  assert.deepEqual([0, 60, 120, 180, 240, 300, 360].map(faceEnHaut), ['A', 'A', 'B', 'B', 'B', 'A', 'A']);
});

test('le salon du tournoi le dit : la kraft porte « Tournoi » et ses titres, la touche lance le tournoi', () => {
  const salon = toutCeQuOnLit('salon');
  assert.ok(salon.includes(TEXTES.tournoi.kraft.tampon));
  assert.ok(salon.includes(TEXTES.tournoi.touches.lancer));
  assert.ok(!salon.includes(TEXTES.piste.mystere));
});

test('entre deux duels, le tableau cercle le duel suivant, et l’hôte le lance ; le palmarès remet diamant, platine et or', () => {
  assert.equal(posesSur('tableau', /^touche-suivant$/).length, 1);
  assert.equal(posesSur('palmares', /^disque-diamant-1$/).length, 1);
  assert.equal(posesSur('palmares', /^disque-platine-2$/).length, 1);
  assert.equal(posesSur('palmares', /^disque-or-\d$/).length, 2);
  assert.ok(toutCeQuOnLit('palmares').includes(TEXTES.tournoi.oreille));
  assert.equal(PAR_SECTION.choisir.length + PAR_SECTION.duel.length + PAR_SECTION.fin.length, IMAGES.length);
});
