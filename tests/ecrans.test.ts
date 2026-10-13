/** L'étape 5 : tous les écrans et tous les états du téléphone, posés sur le meuble. */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEGENDES_DES_ECRANS as L } from '../src/planche/etape5/legendes.fr';
import { imagesDesEcrans, journalDExemple, toutesLesImagesDesEcrans } from '../src/planche/etape5/scenes';
import { partieA } from '../src/regles/partie';
import { CADRAGES } from '../src/ressources/cadrages';
import { PARTIE } from '../src/ressources/reglages';
import { TABLEE } from '../src/ressources/tablee';
import { TEXTES } from '../src/ressources/textes.fr';
import type { Calque, Texte } from '../src/scene/calque';
import { regardSurLaPlatine } from '../src/scene/meuble';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { empriseDe, type Emprise } from '../src/scene/rendu/emprise';
import { vueDeLaFinale, vueDuBac, vueDuHitParade, vueDuSalon } from '../src/scene/telephone/ecrans';
import { vueDeLaPochette } from '../src/scene/telephone/pochette';
import { toucheAutrePlaylist, toucheQuitter } from '../src/scene/telephone/quitter';
import { pochetteDExemple } from '../src/planche/exemples';
import { dessinerLaTablee, placesEnEventail } from '../src/scene/tablee';
import { dessins, ENCRIER } from './planche';

const PAR_SECTION = imagesDesEcrans(TEXTES, ENCRIER);
const IMAGES = toutesLesImagesDesEcrans(TEXTES, ENCRIER);
const image = (fichier: string) => {
  const trouvee = IMAGES.find((i) => i.fichier === fichier);
  assert.ok(trouvee !== undefined, fichier);
  return trouvee;
};
const textesDe = (fichier: string): Texte[] => dessins(image(fichier).scene).flatMap((d) => (d.genre === 'texte' ? [d] : []));
/** Tout ce qu'on lit sur un écran, à la file : une phrase passée à la ligne s'y relit d'un bloc. */
const toutCeQuOnLit = (fichier: string): string =>
  textesDe(fichier)
    .map((t) => t.contenu)
    .join(' ');
const posesSur = (fichier: string, motif: RegExp): Calque[] =>
  image(fichier).scene.contenu.flatMap((d) => (d.genre === 'calque' && motif.test(d.nom) ? [d] : []));
const AU_TELEPHONE = [
  ...PAR_SECTION.hote,
  ...PAR_SECTION.invite,
  ...PAR_SECTION.libre,
  ...PAR_SECTION.quatreChoix,
  ...PAR_SECTION.fin,
  ...PAR_SECTION.etats,
];

test('les écrans du téléphone tiennent les règles du rendu : aucun défaut, décor et calques mobiles sous leurs limites', () => {
  for (const i of IMAGES) {
    const c = controler(i.scene);
    assert.deepEqual(c.constats, [], i.fichier);
    assert.ok(c.polygonesDuDecor <= LIMITES.decor, `${i.fichier} : ${c.polygonesDuDecor} polygones de décor`);
    assert.ok(c.plusLourdCalqueMobile.poids < LIMITES.mobile, `${i.fichier} : ${c.plusLourdCalqueMobile.nom}`);
  }
});

test('chaque écran est un regard de 390 × 844 sur le meuble ; aucun texte n’est abrégé ; ce qu’on y pose et ce qu’on y touche reste entier dans le cadre', () => {
  const { largeur, hauteur } = CADRAGES.telephone;
  for (const { fichier, regard } of AU_TELEPHONE) {
    assert.deepEqual([regard.largeur, regard.hauteur], [largeur, hauteur], fichier);
    for (const t of textesDe(fichier)) assert.ok(!t.contenu.endsWith('…'), `${fichier} : « ${t.contenu} » est abrégé`);
    const [ox, oy] = regard.origine;
    for (const objet of posesSur(
      fichier,
      // Les objets eux-mêmes, pas leurs ombres, qui peuvent déborder ; la pastille du décompte est celle de la piste, sur la platine.
      /^(pochette-(joueur|hit-parade|finale|suivant|vraie)|pastille-(?!decompte)|touche-|etiquette-|disque-(diamant|platine|or))[^/]*$/,
    )) {
      const e = empriseDe([objet], ENCRIER.largeur);
      assert.ok(e !== undefined, objet.nom);
      assert.ok(
        e.x >= ox && e.x + e.largeur <= ox + largeur && e.y >= oy && e.y + e.hauteur <= oy + hauteur,
        `${fichier} : ${objet.nom} sort du cadre`,
      );
    }
  }
});

test('le salon : le code est sur l’étiquette du disque, dans le lien et dans le QR code de la kraft ; on tape le même pour entrer', () => {
  const salon = textesDe('salon').map((t) => t.contenu);
  const code = salon.find((c) => new RegExp(`^[${PARTIE.code.lettres}]{${PARTIE.code.longueur}}$`).test(c));
  assert.ok(code !== undefined, salon.join(' / '));
  assert.ok(toutCeQuOnLit('salon').includes(`/${code}`), 'le lien porte le code');
  for (const fichier of ['salon', 'salon-invite', 'etat-patronSorti']) assert.equal(posesSur(fichier, /^kraft-qr$/).length, 1, fichier);
  // L'invité n'a pas la touche qui lance : c'est l'hôte qui lance la face A.
  assert.equal(posesSur('salon-invite', /^touche-lancer/).length, 0);
  assert.equal(posesSur('salon', /^touche-lancer/).length, 1);
  assert.ok(toutCeQuOnLit('saisie').includes([...code.slice(0, 2)].join(' ')));
  assert.ok(toutCeQuOnLit('etat-complet').includes([...code].join(' ')));
});

test('pendant la piste, chacun fait la tête que la partie lui donne ; le décompte ne montre rien de la réponse ; la révélation colle les points', () => {
  const journal = journalDExemple(TEXTES);
  const tetes = (t: number) => Object.fromEntries(partieA(journal, t).joueurs.map((j) => [j.id, j.expression]));
  assert.deepEqual(tetes(L.instants.rayure), {
    toi: 'depite',
    lady: 'content',
    mc: 'concentre',
    dj: 'content',
    mamie: 'concentre',
    baron: 'concentre',
  });
  assert.deepEqual(tetes(L.instants.reponse), { toi: 'content', lady: 'content', mc: 'endormi', dj: 'content', mamie: 'content', baron: 'endormi' });
  assert.equal(posesSur('libre-decompte', /^pochette-vraie/).length, 0);
  assert.ok(!textesDe('libre-decompte').some((t) => t.contenu.startsWith('+')), 'pas de points avant la révélation');
  // La pochette de la réponse est au milieu du disque retourné : plus rien ne sort de sous la kraft.
  assert.equal(posesSur('libre-reponse', /^pochette-vraie$/).length, 0);
  assert.ok(
    textesDe('libre-reponse').some((t) => t.contenu.startsWith('+')),
    'les points se collent à la révélation',
  );
  // Ce que toi a presque trouvé, et ce qui l'a rayé, se lisent sur l'étiquette vierge.
  assert.ok(toutCeQuOnLit('libre-presque').includes(TEXTES.pastilles.presque));
  assert.ok(toutCeQuOnLit('libre-raye').includes(TEXTES.piste.raye));
});

test('l’hôte choisit le mode au sélecteur : Libre ou 4 choix, chacun son barème écrit dessous', () => {
  for (const [fichier, cle] of [
    ['reglages', 'libre'],
    ['reglages-4choix', 'quatreChoix'],
  ] as const)
    assert.ok(toutCeQuOnLit(fichier).includes(TEXTES.partie.bareme[cle] ?? '?'), fichier);
});

test('une piste avec un feat : l’étiquette porte les trois pastilles, et le classement le F de qui l’a trouvé', () => {
  const lu = textesDe('libre-feat').map((t) => t.contenu);
  for (const nom of [TEXTES.partie.artiste, TEXTES.partie.titre, TEXTES.partie.feat]) assert.ok(lu.includes(nom), nom);
  assert.ok(lu.includes(TEXTES.partie.aTrouveLeFeat));
  assert.ok(!textesDe('libre-trouve').some((t) => t.contenu === TEXTES.partie.feat), 'sans feat, pas de pastille Feat');
});

test('les champs où l’on tape sont assez larges pour qu’on voie où taper, sans dépasser leur place, et les crans du bac ne se chevauchent pas', () => {
  // Le papier du code, vide, a déjà la largeur d'un champ : plus large que « Le code de la partie », moins que sa place.
  const code = posesSur('saisie', /^etiquette-saisie$/)[0];
  assert.ok(code !== undefined);
  const e = empriseDe([code], ENCRIER.largeur);
  const S = TABLEE.telephone.saisie;
  assert.ok(e !== undefined && e.largeur >= S.auMoins && e.largeur <= S.largeur + 20, `${e?.largeur}`);
  for (const fichier of ['bac-pretes', 'bac-chercher', 'bac-laMienne']) {
    const crans = posesSur(fichier, /^touche-bac-[a-zA-Z]+$/).map((c) => empriseDe([c], ENCRIER.largeur));
    assert.equal(crans.length, 3, fichier);
    for (let i = 1; i < crans.length; i++) {
      const [g, d] = [crans[i - 1], crans[i]];
      assert.ok(g !== undefined && d !== undefined && g.x + g.largeur < d.x, `${fichier} : les crans ${i} et ${i + 1} se chevauchent`);
    }
  }
});

/** Vrai si deux emprises se chevauchent, de plus d'un px : deux touches posées l'une contre l'autre ne se chevauchent pas. */
const seChevauchent = (a: Emprise, b: Emprise): boolean =>
  a.x < b.x + b.largeur - 1 && b.x < a.x + a.largeur - 1 && a.y < b.y + b.hauteur - 1 && b.y < a.y + a.hauteur - 1;

test('aucune touche ne chevauche une autre, sur aucun écran du téléphone ; ni celles du coin d’une room (« Quitter », « Autre playlist »)', () => {
  const A = { textes: TEXTES, encrier: ENCRIER };
  const touches = (objets: readonly Calque[]): { readonly nom: string; readonly e: Emprise }[] =>
    objets.flatMap((o) => {
      const e = o.nom.startsWith('touche-') ? empriseDe([o], ENCRIER.largeur) : undefined;
      return e !== undefined ? [{ nom: o.nom, e }] : [];
    });
  const verifier = (ou: string, objets: readonly Calque[]): void => {
    const t = touches(objets);
    for (const [i, a] of t.entries())
      for (const b of t.slice(i + 1)) assert.ok(!seChevauchent(a.e, b.e), `${ou} : « ${a.nom} » chevauche « ${b.nom} »`);
  };
  for (const { fichier } of AU_TELEPHONE)
    verifier(
      fichier,
      image(fichier).scene.contenu.flatMap((d) => (d.genre === 'calque' ? [d] : [])),
    );
  // Sa pochette qu'on refait : « Au hasard », « C'est moi », « Laisser », l'une sous l'autre, toutes dans le cadre.
  const refaite = vueDeLaPochette(A, pochetteDExemple(TEXTES), 'dessus', true);
  verifier('pochette refaite', refaite.objets);
  for (const { nom, e } of touches(refaite.objets))
    assert.ok(e.x >= refaite.regard.origine[0] && e.x + e.largeur <= refaite.regard.origine[0] + refaite.regard.largeur, `${nom} sort du cadre`);
  // Le bac de l'hôte, dans la room : son « Retour » le referme.
  const bac = vueDuBac(A, { cran: 'pretes', retour: 'fermer' });
  verifier('bac de la room', bac.objets);
  assert.ok(bac.objets.some((o) => o.nom === 'touche-fermer-bac'));
  // Les écrans d'une room, avec les touches du coin de l'hôte.
  const etat = partieA(journalDExemple(TEXTES), Infinity);
  const r = regardSurLaPlatine();
  const coin = [toucheQuitter(A, r), toucheAutrePlaylist(A, r)];
  for (const [ou, vue] of [
    ['salon', vueDuSalon(A, etat, 'AENV', 'hote', true)],
    ['salon de l’invité', vueDuSalon(A, etat, 'AENV', 'invite', true)],
    ['hit-parade', vueDuHitParade(A, etat, etat, true, true)],
    ['finale', vueDeLaFinale(A, etat, [], true, true)],
  ] as const)
    verifier(ou, [...vue.objets, ...coin]);
});

test('en 4 choix, quatre étiquettes à toucher ; à la révélation, seule la bonne reste', () => {
  assert.equal(posesSur('choix-extrait', /^etiquette-choix-\d+$/).length, 4);
  const restees = posesSur('choix-reponse', /^etiquette-choix-\d+$/);
  assert.equal(restees.length, 1);
  assert.ok(toutCeQuOnLit('choix-reponse').includes(TEXTES.exemples.titre));
});

test('l’éventail tient jusqu’à douze pochettes entre ses bords ; au-delà de ses places, la tablée le dit', () => {
  const E = TABLEE.telephone.eventail;
  for (const sansKraft of [false, true]) {
    const places = placesEnEventail(PARTIE.joueurs.auPlus, sansKraft);
    const xs = places.map((p) => p.en[0]);
    assert.equal(Math.min(...xs), E.de);
    assert.ok(Math.max(...xs) <= (sansKraft ? E.aSansKraft : E.a) + 1e-9);
  }
  const pochette = journalDExemple(TEXTES).flatMap((e) => (e.genre === 'arrivee' ? [e.pochette] : []))[0];
  assert.ok(pochette !== undefined);
  const places = placesEnEventail(3);
  const trop = Array.from({ length: 4 }, () => ({ pochette, expression: 'content' as const }));
  assert.throws(() => dessinerLaTablee(trop, places, E.taille, regardSurLaPlatine(), TABLEE.telephone.trouve, ENCRIER.largeur), /places/);
});

test('chaque état a son écran et sa phrase', () => {
  const E = TEXTES.etats;
  const phrases: Record<string, string> = {
    'etat-codeInconnu': E.codeInconnu,
    'etat-complet': E.complet,
    'etat-tropCourt': E.tropCourt,
    'etat-connexionPerdue': E.connexionPerdue,
    'etat-patronSorti': E.patronSorti,
    'etat-personne': E.personne,
    'etat-spectateur': TEXTES.partie.spectateur,
  };
  for (const [fichier, phrase] of Object.entries(phrases)) assert.ok(toutCeQuOnLit(fichier).includes(phrase), `${fichier} : « ${phrase} »`);
  for (const fichier of ['etat-spotify', 'etat-sonBloque']) assert.ok(image(fichier));
});

test('la finale remet les trois disques ; à égalité en tête, deux diamants', () => {
  for (const genre of ['diamant', 'platine', 'or']) assert.equal(posesSur('finale', new RegExp(`^disque-${genre}-\\d+$`)).length, 1, genre);
  assert.equal(posesSur('finale-egalite', /^disque-diamant-\d+$/).length, 2);
  assert.ok(toutCeQuOnLit('finale').includes(TEXTES.touches.rejouer));
});
