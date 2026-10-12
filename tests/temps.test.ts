/**
 * La liste des temps de l'atelier : lue dans les gestes mêmes de la piste, elle dit ce qui part, quand, comment, et avec quels réglages.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { consigneDuRole, partitionDe } from '../src/mouvement/choregraphie';
import { creerLeMoteur } from '../src/mouvement/moteur';
import { SEUIL_D_ARRIVEE, tempsDeRetombee, type Ressort } from '../src/mouvement/ressort';
import { PART_DE_CROISIERE } from '../src/mouvement/volant';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { seanceDExemple, seanceEntiere } from '../src/planche/etape2/seance';
import { chapeauDeLaListe, listeDesTemps, type LigneDeTemps } from '../src/planche/etape2/temps';
import { ecrire } from '../src/planche/nombres.fr';
import { AMPLEURS, MATIERES, TEMPS as TEMPS_DE_MOUVEMENT, TOLERANCES } from '../src/ressources/mouvement';
import { TEXTES } from '../src/ressources/textes.fr';
import { remplir } from '../src/scene/phrases';
import { gestesDeLaPiste } from '../src/scene/piste/gestes';
import type { Grandeur, NomDeGeste } from '../src/scene/piste/gestes/vocabulaire';
import { DESCENTE_DU_BRAS } from '../src/scene/piste/instants';
import { estLaPhrase, nombreLu, trousDe } from './phrases';

const SCENE = seanceEntiere(seanceDExemple(TEXTES));
const TEMPS = listeDesTemps(SCENE);
const S = LEGENDES.temps.signaux;
const G = LEGENDES.temps.gestes;
const lignesDe = (titre: string): readonly LigneDeTemps[] => TEMPS.find((e) => e.titre === titre)?.lignes ?? [];
/** La ligne dont la phrase commence ainsi, sous ce signal : une phrase à trous se reconnaît à ce qui précède son premier trou. */
function ligne(titre: string, geste: string): LigneDeTemps {
  const [debut = ''] = geste.split('{');
  const trouvee = lignesDe(titre).find((l) => l.quoi.startsWith(debut));
  if (trouvee === undefined) throw new Error(`Pas de ligne « ${geste} » sous « ${titre} ».`);
  return trouvee;
}
const E = LEGENDES.temps.effets;
const R = LEGENDES.temps.reglages;
const D = LEGENDES.temps.durees;
/** Une durée de la liste, relue en millisecondes : elle s'y écrit en millisecondes sous la seconde, en secondes au-delà. Rien si ce n'en est pas une. */
function enMs(duree: string | undefined): number | undefined {
  if (duree === undefined) return undefined;
  const [ms, s] = [nombreLu(trousDe(D.ms, duree)?.['ms']), nombreLu(trousDe(D.s, duree)?.['s'])];
  return ms ?? (s === undefined ? undefined : Math.round(s * 1000));
}
/** Un départ, en millisecondes comptées depuis son signal : négatif s'il est compté à rebours. Rien pour ce qui n'est pas un départ. */
function departEnMs(quand: string): number | undefined {
  const aRebours = enMs(trousDe(LEGENDES.temps.avant.extrait, quand)?.['duree']);
  return aRebours !== undefined ? -aRebours : enMs(trousDe(LEGENDES.temps.apres, quand)?.['duree']);
}
/** Vrai si ce texte est l'une de ces phrases à trous, remplie. */
const estLUneDe = (modeles: readonly string[], texte: string): boolean => modeles.some((modele) => estLaPhrase(modele, texte));

test('la liste des temps suit la piste, du « 3 » au disque retourné ; chaque ligne dit ce qui bouge, comment, et avec quels réglages', () => {
  assert.deepEqual(
    TEMPS.map((e) => e.titre),
    [S.trois, S.deux, S.un, S.extrait, LEGENDES.temps.pendantLExtrait, S.rayure, S.revelation, S.arret],
  );
  let lignes = 0;
  for (const enchainement of TEMPS) {
    assert.ok(enchainement.lignes.length >= 3, enchainement.titre);
    for (const l of enchainement.lignes) {
      lignes++;
      assert.ok(l.quoi.length > 10 && l.effet.length > 5, `${enchainement.titre} : ${JSON.stringify(l)}`);
      // Un départ a une heure et des réglages ; ce qui n'en est pas un n'a ni l'une ni les autres.
      assert.equal(l.quand === '', l.reglage === '', l.quoi);
      if (l.quand !== '') assert.ok(departEnMs(l.quand) !== undefined, `${l.quoi} : « ${l.quand} »`);
      // Aucune phrase à trous n'est restée à moitié remplie.
      assert.doesNotMatch(`${l.quand}${l.quoi}${l.effet}${l.reglage}`, /[{}]|NaN|undefined|Infinity/, l.quoi);
      // Les réglages sont ceux d'un ressort, d'un volant, d'une chute, ou des deux ressorts d'un portage : jamais une durée ni une courbe.
      if (l.reglage !== '') assert.ok(estLUneDe([R.ressort, R.volant, R.chute, R.main], l.reglage), l.reglage);
    }
  }
  assert.ok(lignes >= 38, `${lignes} lignes`);
  // Dans chaque enchaînement, les départs se suivent : d'abord ce qui précède le signal, du plus tôt au plus tard, puis ce qui le suit.
  for (const enchainement of TEMPS) {
    const departs = enchainement.lignes.flatMap((l) => departEnMs(l.quand) ?? []);
    assert.deepEqual(
      departs,
      [...departs].sort((a, b) => a - b),
      enchainement.titre,
    );
    // Ce qui n'a pas d'heure vient après les départs.
    const premiereNote = enchainement.lignes.findIndex((l) => l.quand === '');
    if (premiereNote >= 0)
      assert.ok(
        enchainement.lignes.slice(premiereNote).every((l) => l.quand === ''),
        `${enchainement.titre} : une note avant un départ`,
      );
  }
});

test('la liste des temps est lue dans les gestes mêmes de la piste : chaque geste qu’on voit partir y a sa ligne, et aucune ligne n’est inventée', () => {
  const { roles, coups } = gestesDeLaPiste(SCENE);
  const nommes = [...Object.values(roles).flatMap((role) => role.etapes), ...coups].filter((geste) => geste.nom !== undefined);
  // Les gestes de la piste, sans leurs doublons : deux grandeurs d'une même pièce partent ensemble, une fois.
  const departs = new Set(nommes.map((geste) => `${geste.signal} ${Math.round(geste.apres * 1000)} ${geste.nom}`));
  const lignes = TEMPS.flatMap((e) => e.lignes).filter((l) => l.quand !== '');
  assert.equal(lignes.length, departs.size, 'autant de lignes que de départs');
  // Tous les gestes qui ont un nom ont leur phrase, et chacune se retrouve dans la liste.
  const phrases = new Set(nommes.map((geste) => G[geste.nom as NomDeGeste]));
  assert.equal(phrases.size, Object.keys(G).length, 'chaque phrase de geste sert, et aucune ne manque');
  for (const phrase of phrases) {
    const [debut = ''] = phrase.split('{');
    assert.ok(
      lignes.some((l) => l.quoi.startsWith(debut)),
      `« ${phrase} » n'est pas dans la liste`,
    );
  }
  // Ce qui se décale de 30 ms s'y lit : à une rayure, la main, puis le bras, puis les repères.
  assert.deepEqual(
    lignesDe(S.rayure)
      .slice(0, 3)
      .map((l) => l.quand),
    [0, 30, 60].map((ms) => remplir(D.ms, { ms })),
  );
  // Ce qui est compté à rebours depuis l'extrait dit depuis quoi : le levier se baisse, puis le bras descend, et touche à zéro.
  const { levier } = TEMPS_DE_MOUVEMENT.descente;
  assert.deepEqual(
    lignesDe(S.extrait)
      .slice(0, 3)
      .map((l) => l.quand),
    [
      ...[DESCENTE_DU_BRAS + levier, DESCENTE_DU_BRAS].map((avant) =>
        remplir(LEGENDES.temps.avant.extrait, { duree: remplir(D.ms, { ms: Math.round(avant * 1000) }) }),
      ),
      remplir(D.ms, { ms: 0 }),
    ],
  );
  // Au-delà de la seconde, un départ se lit en secondes, tel qu'il est dans la table.
  const { brasSeRepose, levierSeBaisse } = TEMPS_DE_MOUVEMENT.revelation;
  assert.ok(brasSeRepose > 1 && levierSeBaisse > 1);
  assert.equal(ligne(S.revelation, G.brasSeRepose).quand, remplir(D.s, { s: ecrire(brasSeRepose, 2) }));
  assert.equal(ligne(S.revelation, G.levierDescend).quand, remplir(D.s, { s: ecrire(levierSeBaisse, 2) }));
  // Une piste sans rayure n'a pas ces lignes-là : la liste ne dit que ce qui se joue.
  const sansRayure = listeDesTemps({ ...SCENE, rayuresA: [] });
  assert.deepEqual(
    sansRayure.find((e) => e.titre === S.rayure)?.lignes.filter((l) => l.quand !== ''),
    [],
  );
});

test('la liste des temps annonce ce que le brief demande : 1,4 s et 2 s pour le vinyle, 620 ms pour le bras, 90 ms pour une pastille', () => {
  // Ce qu'une ligne dit de son effet : les trous de sa phrase, ses durées relues en millisecondes.
  const effet = (modele: string, de: LigneDeTemps) => {
    const trous = trousDe(modele, de.effet);
    assert.ok(trous !== undefined, `« ${de.effet} » n’est pas « ${modele} »`);
    return { trous, duree: enMs(trous['duree']), pointe: enMs(trous['pointe']) };
  };
  const lance = effet(E.lance, ligne(S.deux, G.plateauPart));
  assert.deepEqual([lance.trous['part'], lance.duree], [ecrire(PART_DE_CROISIERE * 100), 1400]);
  assert.equal(effet(E.arrete, ligne(S.revelation, G.moteurCoupe)).duree, 2000);
  assert.equal(trousDe(R.volant, ligne(S.deux, G.plateauPart).reglage)?.['couple'], ecrire(MATIERES.plateau.moteur.couple));
  // Le bras descend de sa levée, en 620 ms (le brief en voulait 700 : le pivot, plus posé, a pris la différence) ; la pastille tombe de sa hauteur en 90 ms, et ce qui la reçoit l'arrête net :
  // la phrase le calcule sur la table, elle ne le recopie pas.
  const brasDescend = effet(E.descend, ligne(S.extrait, G.brasDescend));
  assert.deepEqual([brasDescend.trous['px'], brasDescend.duree], [ecrire(AMPLEURS.brasLeve, 1), 620]);
  const claque = effet(E.descend, ligne(S.trois, G.pastilleClaque));
  assert.ok((nombreLu(claque.trous['px']) ?? 0) > 0 && claque.duree === 90, `la pastille tombe de ${claque.trous['px']} px en ${claque.duree} ms`);
  assert.ok(estLaPhrase(R.chute, ligne(S.trois, G.pastilleClaque).reglage));
  // La mauvaise réponse : 20 degrés en arrière en 80 ms, retour en 120 ms ; puis le disque reprend sa vitesse avec son inertie.
  const [recule, rend, reprend] = [ligne(S.rayure, G.mainRecule), ligne(S.rayure, G.mainRend), ligne(S.rayure, G.disqueReprend)];
  assert.deepEqual(trousDe(G.mainRecule, recule.quoi), { degres: ecrire(AMPLEURS.rayure.recul) });
  assert.deepEqual([departEnMs(recule.quand), effet(E.net, recule).duree], [0, 80]);
  assert.deepEqual([departEnMs(rend.quand), effet(E.net, rend).duree], [80, 120]);
  assert.equal(departEnMs(reprend.quand), 200);
  const repris = effet(E.net, reprend).duree ?? 0;
  assert.ok(repris >= 1000 && repris < 2000, `le disque a repris sa vitesse en ${repris} ms`);
  // Le bras dépasse sa cible une seule fois, à peine.
  const pivote = effet(E.depasse, ligne(S.un, G.brasPivote));
  const depasse = nombreLu(pivote.trous['part']) ?? 0;
  // Il pivote posément, plus vite qu'au ralenti ×0,5 : il lui faut être au bord avant que le levier ne le lâche, 330 ms après le « 1 » d'un décompte à la seconde.
  assert.ok((pivote.duree ?? 0) >= 200 && (pivote.duree ?? 0) <= 240, `le bras pivote en ${pivote.duree} ms`);
  assert.ok(depasse >= 1 && depasse <= 5, `il dépasse de ${depasse} %`);
  // Le disque porté : il part sans à-coup, et la liste dit les deux ressorts qui le mènent.
  const sort = ligne(S.trois, G.disqueSort);
  const porte = effet(E.porte, sort);
  assert.ok((porte.pointe ?? 0) >= 100 && (porte.pointe ?? 0) < 200, `pointe de vitesse à ${porte.pointe} ms`);
  assert.ok((porte.duree ?? 0) >= 300 && (porte.duree ?? 0) < 400, `arrivée en ${porte.duree} ms`);
  const ressort = (r: Ressort): string =>
    remplir(R.ressort, { raideur: ecrire(r.raideur), amortissement: ecrire(r.amortissement), masse: ecrire(r.masse) });
  assert.equal(sort.reglage, remplir(R.main, { main: ressort(MATIERES.main.tire), suit: ressort(MATIERES.vinyle.suit) }));
  // Le disque qu'on retourne : la même main, le même disque ; mais c'est le plateau qui l'arrête, à plat, moins d'une seconde après.
  const aPlat = effet(E.retourne, ligne(S.arret, G.disqueSeRetourne)).duree ?? 0;
  assert.ok(aPlat >= 500 && aPlat <= 900, `à plat en ${aPlat} ms`);
  assert.equal(departEnMs(ligne(S.arret, G.disqueSeTasse).quand), Math.round((TEMPS_DE_MOUVEMENT.retournement.seRetourne * 1000 + aPlat) / 10) * 10);
  // Le regard glisse en 350 à 550 ms, une fois le disque arrêté.
  const regard = ligne(S.arret, G.regardGlisse);
  const glisse = enMs((trousDe(E.net, regard.effet) ?? trousDe(E.depasse, regard.effet))?.['duree']) ?? 0;
  assert.ok(glisse >= 350 && glisse <= 550, `le regard arrive en ${glisse} ms`);
  assert.deepEqual(trousDe(G.regardGlisse, regard.quoi), { px: ecrire(Math.abs(AMPLEURS.regardSurLaReponse)) });
  // Ce qui attend l'ampli le dit, au lieu d'inventer un réglage ; et n'a pas d'heure de départ : rien ne part encore.
  const N = LEGENDES.temps.notes;
  const aVenir = [N.aiguillesSursautent, N.aiguillesDansent, N.aiguillesPic];
  assert.equal(new Set(aVenir.map((note) => note.comment)).size, 1, 'les trois disent la même chose : c’est pour l’ampli');
  for (const note of aVenir) {
    const dites = TEMPS.flatMap((e) => e.lignes).filter((l) => l.quoi === note.quoi);
    assert.deepEqual(
      dites.map((l) => [l.quand, l.effet, l.reglage]),
      [['', note.comment, '']],
      note.quoi,
    );
  }
});

/** Ce qu'un coup fait à sa grandeur, rejoué par le moteur à pas fins : son plus grand écart, et l'instant où il n'en reste plus qu'une part. */
function coupRejoue(nom: NomDeGeste): { readonly sommet: number; readonly retombeEn: number } {
  const { roles, coups } = gestesDeLaPiste(SCENE);
  const coup = coups.find((c) => c.nom === nom);
  if (coup === undefined) throw new Error(`La piste n'a pas de coup « ${nom} ».`);
  const partition = partitionDe(roles, coups);
  const moteur = creerLeMoteur<Grandeur>(TOLERANCES);
  const pas = 0.0005;
  moteur.poser(partition, coup.a - 0.4);
  for (let t = coup.a - 0.4 + pas; t < coup.a; t += pas) moteur.avancer(partition, t);
  moteur.avancer(partition, coup.a);
  const ecarts: number[] = [];
  for (let t = coup.a + pas; t <= coup.a + 0.6; t += pas) {
    moteur.avancer(partition, t);
    ecarts.push(Math.abs(moteur.ecart(coup.grandeur)));
  }
  const sommet = Math.max(...ecarts);
  const dernier = ecarts.reduce((rang, ecart, i) => (ecart > SEUIL_D_ARRIVEE * sommet ? i : rang), 0);
  return { sommet, retombeEn: (dernier + 1) * pas };
}

test('ce que la liste dit d’un coup est ce que le moteur en joue : un px de sursaut, et le temps qu’il met vraiment à retomber', () => {
  for (const [signal, nom] of [
    [S.extrait, 'diamantTouche'],
    [S.rayure, 'brasTressaute'],
    [S.arret, 'disqueSeTasse'],
  ] as const) {
    const joue = coupRejoue(nom);
    const dite = ligne(signal, G[nom]);
    // Le sursaut qu'annonce la phrase est celui qu'on mesure : un px, à un dixième près, sans que personne l'ait écrit.
    const px = nombreLu(trousDe(G[nom], dite.quoi)?.['px']);
    assert.ok(px !== undefined && Math.abs(px - joue.sommet) <= 0.5 && Math.abs(joue.sommet - 1) < 0.1, `${nom} : ${joue.sommet} px, dit « ${px} »`);
    // Le temps de retombée est celui d'un coup (écart nul, vitesse donnée), pas celui d'un ressort lâché : à 10 ms près.
    const ms = enMs(trousDe(E.retombe, dite.effet)?.['duree']);
    assert.ok(ms !== undefined && Math.abs(ms / 1000 - joue.retombeEn) <= 0.011, `${nom} : retombé en ${joue.retombeEn} s, dit ${ms} ms`);
  }
  // Et c'est le temps que donne le ressort que la grandeur suit à cet instant.
  const { roles, coups } = gestesDeLaPiste(SCENE);
  const tressaute = coups.find((c) => c.nom === 'brasTressaute');
  assert.ok(tressaute !== undefined);
  const matiere = consigneDuRole(roles[tressaute.grandeur], tressaute.a).matiere;
  assert.equal(enMs(trousDe(E.retombe, ligne(S.rayure, G.brasTressaute).effet)?.['duree']), Math.round(tempsDeRetombee(matiere) * 100) * 10);
});

test('le chapeau de la liste dit le seuil auquel une pièce est tenue pour arrivée : celui sur lequel ses temps sont comptés', () => {
  const chapeau = chapeauDeLaListe();
  assert.deepEqual(trousDe(LEGENDES.temps.chapeau, chapeau), { seuil: ecrire(SEUIL_D_ARRIVEE * 100) });
  // Il dit aussi, d'une demi-phrase, ce qu'est chaque sorte de réglage que la liste écrit : il la nomme du même mot qu'elle.
  for (const reglage of [R.ressort, R.volant, R.chute]) {
    const [nom = ''] = reglage.split(/ [:{]/);
    assert.ok(nom.length > 3 && chapeau.includes(nom), `le chapeau ne dit pas ce qu’est « ${nom} »`);
  }
});
