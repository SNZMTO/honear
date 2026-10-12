/** L'étape 3 : l'ampli, le bac, les touches, les pastilles qui disent quelque chose, et les images de la planche du système. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { imagesDuSysteme } from '../src/planche/etape3/scenes';
import { AMPLI } from '../src/ressources/ampli';
import { BAC, COULEURS_DES_THEMES } from '../src/ressources/bac';
import { DENSITES } from '../src/ressources/densites';
import { TOUCHES } from '../src/ressources/mouvement';
import { PASTILLES } from '../src/ressources/pastilles';
import { TEXTES } from '../src/ressources/textes.fr';
import { CORPS_LISIBLE } from '../src/ressources/typo';
import { CRANS_DU_VOLUME, dessinerLAmpli, reglerLAmpli } from '../src/scene/ampli';
import { angleDeLAiguille } from '../src/scene/ampli/vumetre';
import { dessinerLeBac } from '../src/scene/bac';
import type { Calque, Texte } from '../src/scene/calque';
import { surLeBois } from '../src/scene/meuble';
import { faceEcrite } from '../src/scene/pastille';
import { regler } from '../src/scene/reglage';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { ampliDuSalon, bacDesPlaylistsPretes } from '../src/scene/telephone/meuble';
import { calquesDeLaTouche, dessinerUneTouche, type EtatDeTouche } from '../src/scene/touche';
import { calque, calques, dessins, ENCRIER } from './planche';

const FINE = DENSITES.fine;
const textesDe = (c: Calque): Texte[] => dessins(c).flatMap((d) => (d.genre === 'texte' ? [d] : []));

test('l’ampli : chaque pièce qui bouge est un calque à part, avec son ombre ; le coffre et ce qu’il porte sont figés', () => {
  for (const densite of Object.values(DENSITES)) {
    const ampli = dessinerLAmpli(ampliDuSalon(TEXTES, true), densite);
    for (const piece of ['vumetre-gauche/aiguille', 'vumetre-droite/aiguille', 'bouton-volume/index', 'interrupteur-ampli', 'voyant'])
      assert.equal(calque(ampli, piece).role, 'mobile', piece);
    for (const ombre of ['vumetre-gauche/aiguille/ombre', 'vumetre-droite/aiguille/ombre', 'bouton-volume/ombre', 'interrupteur-ampli/ombre'])
      assert.equal(calque(ampli, ombre).role, 'ombre', ombre);
    assert.equal(calque(ampli, 'ampli/decor').role, 'decor');
    // Le gros bouton : moleté, au moins 16 pans, figé en image ; un cran tous les 15 degrés.
    assert.ok(densite.pansDeBouton >= 16);
    assert.equal(calque(ampli, 'bouton-volume/corps').role, 'image');
  }
  assert.ok(
    CRANS_DU_VOLUME.slice(1).every((angle, rang) => angle - (CRANS_DU_VOLUME[rang] ?? 0) === AMPLI.volume.pas),
    'un cran tous les 15°',
  );
});

test('les aiguilles : au repos à gauche, en butée à droite, et dans le rouge avant la butée', () => {
  const { aiguille, echelle } = AMPLI.vumetres;
  assert.equal(angleDeLAiguille(0), aiguille.repos);
  assert.equal(angleDeLAiguille(1), aiguille.butee);
  assert.ok(
    angleDeLAiguille(0.93) > echelle.rouge.de && angleDeLAiguille(0.93) < echelle.rouge.a,
    'à la fin d’un extrait, elles passent dans le rouge',
  );
  assert.ok(aiguille.repos < (echelle.angles[0] ?? 0) && aiguille.butee >= (echelle.angles.at(-1) ?? 0), 'au repos et en butée, hors de l’échelle');
});

test('l’ampli se règle sans être redessiné : aiguilles, volume et voyant donnent le même arbre que si on le redessinait', () => {
  const avant = { ...ampliDuSalon(TEXTES, true), aiguilles: [0.1, 0.3] as const, volume: 2 };
  const apres = { ...avant, aiguilles: [0.9, 0.76] as const, volume: 15 };
  assert.deepEqual(regler(dessinerLAmpli(avant, FINE), reglerLAmpli(apres)), dessinerLAmpli(apres, FINE));
  // Le voyant passe d'un dessin à l'autre par son opacité.
  const eteint = dessinerLAmpli(ampliDuSalon(TEXTES, false), FINE);
  const allume = regler(eteint, reglerLAmpli({ ...ampliDuSalon(TEXTES, true), aiguilles: [0, 0] }));
  assert.equal(calque(allume, 'voyant/allume').opacite, 1);
  assert.equal(calque(allume, 'voyant/eteint').opacite, 0);
});

test('le bac : un intercalaire par thème, chacun son titre et sa couleur ; trois onglets de suite ne tombent jamais au même endroit', () => {
  const themes = Object.keys(COULEURS_DES_THEMES).sort();
  assert.deepEqual(Object.keys(TEXTES.bac.themes).sort(), themes, 'chaque thème a son titre dans les textes, et seulement eux');
  const bac = dessinerLeBac(bacDesPlaylistsPretes(TEXTES), FINE, ENCRIER.largeur);
  const intercalaires = calques(bac).filter((c) => c.nom.startsWith('intercalaire-'));
  const pochettes = calques(bac).filter((c) => c.nom.startsWith('pochette-'));
  assert.equal(intercalaires.length, themes.length);
  assert.ok(pochettes.length >= 10 && pochettes.length <= 14, `une douzaine de playlists : ${pochettes.length}`);
  for (const rangee of [...intercalaires, ...pochettes]) assert.equal(rangee.role, 'image', `${rangee.nom} est figé en image et bouge d'un bloc`);
  const { places } = BAC.intercalaire.onglet;
  assert.equal(new Set(places).size, places.length);
  assert.ok(
    places.every((place, rang) => rang === 0 || place - (places[rang - 1] ?? 0) >= BAC.intercalaire.onglet.largeur),
    'les onglets ne se chevauchent pas',
  );
  // Chaque titre se lit, entier, sur son onglet.
  for (const t of textesDe(bac)) {
    assert.ok(t.corps >= CORPS_LISIBLE, `« ${t.contenu} » : ${t.corps} px`);
    assert.ok(!t.contenu.endsWith('…'), `« ${t.contenu} » est abrégé`);
  }
});

test('une touche enfoncée est 2 px plus bas, son ombre plus courte ; au repos, c’est l’autre ombre qu’on voit', () => {
  const touche = (etat: EtatDeTouche): Calque =>
    dessinerUneTouche(
      {
        nom: 'touche-essai',
        genre: 'principale',
        libelle: TEXTES.touches.poserUnDisque,
        centre: surLeBois({ origine: [0, 0], largeur: 1, hauteur: 1 }, 200, 200),
        support: 0,
        etat,
      },
      FINE,
      ENCRIER.largeur,
    );
  const noms = calquesDeLaTouche('touche-essai');
  const glisse = (c: Calque): number => {
    const t = calque(c, noms.capuchon).transformations?.[0];
    return t?.genre === 'glisser' ? t.de[1] : NaN;
  };
  assert.equal(glisse(touche('enfoncee')) - glisse(touche('repos')), TOUCHES.course);
  assert.equal(calque(touche('repos'), noms.capuchon).role, 'mobile');
  assert.equal(calque(touche('repos'), noms.ombreAuRepos).opacite, 1);
  assert.equal(calque(touche('repos'), noms.ombreEnfoncee).opacite, 0);
  assert.equal(calque(touche('enfoncee'), noms.ombreEnfoncee).opacite, 1);
  const portee = (c: Calque, nom: typeof noms.ombreAuRepos | typeof noms.ombreEnfoncee): number => {
    const t = calque(c, nom).transformations?.at(-1);
    return t?.genre === 'glisser' ? Math.hypot(t.de[0], t.de[1]) : NaN;
  };
  assert.ok(portee(touche('repos'), noms.ombreEnfoncee) < portee(touche('repos'), noms.ombreAuRepos), 'enfoncée, son ombre raccourcit');
});

test('une pastille écrit ses messages en entier, sur deux lignes au plus', () => {
  for (const contenu of [TEXTES.pastilles.presque, TEXTES.piste.raye, TEXTES.pastilles.entree, 'Piste 12 sur 20']) {
    const face = faceEcrite(contenu, 'titrage', PASTILLES.message.rayon, 'texte', ENCRIER.largeur);
    assert.ok(face.length >= 1 && face.length <= PASTILLES.lignes, contenu);
    for (const ligne of face) assert.ok(ligne.genre === 'texte' && !ligne.contenu.endsWith('…'), `« ${contenu} » est abrégé`);
  }
});

test('les images du système tiennent les règles du rendu : aucun défaut, décor et calques mobiles sous leurs limites', () => {
  for (const image of imagesDuSysteme(TEXTES, ENCRIER)) {
    const c = controler(image.scene);
    assert.deepEqual(c.constats, [], image.fichier);
    assert.ok(c.polygonesDuDecor <= LIMITES.decor, `${image.fichier} : ${c.polygonesDuDecor} polygones de décor`);
    assert.ok(c.plusLourdCalqueMobile.poids < LIMITES.mobile, `${image.fichier} : ${c.plusLourdCalqueMobile.nom}`);
  }
});
