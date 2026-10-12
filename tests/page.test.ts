/**
 * La page de l'atelier, sans navigateur : ce que le gabarit écrit, sa feuille de style, et le contrat entre lui
 * et le script qui l'anime.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import opentype from 'opentype.js';
import { contraste } from '../src/lowpoly/couleur';
import { TEINTES } from '../src/lowpoly/tons';
import { aideDe, ANCRES, MESURES_AFFICHEES, POUSSOIRS } from '../src/planche/etape2/ancres';
import { BANCS, FLUIDITE, fluiditeDe, SCENES_DE_BANC, type Banc, type ReleveDeBanc } from '../src/planche/etape2/banc';
import { ecrireLaPage } from '../src/planche/etape2/gabarit';
import { COULEURS, PAGE as MISE_EN_PAGE } from '../src/planche/etape2/gabarit/style';
import { lectureDesBancs, MESURABLE } from '../src/planche/etape2/lecture';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { A_L_OUVERTURE, VITESSES } from '../src/planche/etape2/options';
import { MOMENTS } from '../src/planche/etape2/seance';
import { ecrire } from '../src/planche/nombres.fr';
import { lireUnePolice } from '../src/planche/polices';
import { PHASES_DE_PISTE } from '../src/regles/piste';
import { CADRAGES } from '../src/ressources/cadrages';
import { MATIERES, TOUCHES } from '../src/ressources/mouvement';
import { TEXTES } from '../src/ressources/textes.fr';
import { CARACTERES, CONTRASTES, CORPS } from '../src/ressources/typo';
import { GENRES_DE_VERSO } from '../src/scene/disque/verso';
import { remplir } from '../src/scene/phrases';
import { enXml } from '../src/scene/rendu/balisage';
import { espacer, INSECABLE } from '../src/scene/typographie';
import { pageDuGabarit, POLICES_FACTICES, TEMPS_DE_LA_SEANCE } from './gabarit';
import { trousDe } from './phrases';

const TEMPS = TEMPS_DE_LA_SEANCE;
const RELEVE: ReleveDeBanc = {
  scene: 'modeLeger',
  montage: 1294,
  fil: 6.2,
  script: 1.4,
  decompte: { mediane: 16.7, longues: 0 },
  extrait: { mediane: 16.6, longues: 1 },
  revelation: { mediane: 16.7, longues: 2.5 },
};
const ENTIERE: ReleveDeBanc = { ...RELEVE, scene: 'entiere', montage: 2588, fil: 8.2, script: 1.9 };
const POLICES = POLICES_FACTICES;
const BANC_D_ESSAI: Banc = { ralenti: 4, definition: 3, releves: [ENTIERE, RELEVE] };
const PAGE = pageDuGabarit([BANC_D_ESSAI]);
/** La feuille de style, sans ses commentaires : ce que le navigateur en lit. */
const [, STYLE = ''] = /<style>([\s\S]*?)<\/style>/.exec(PAGE.replace(/\/\*[\s\S]*?\*\//g, '')) ?? [];
const CORPS_DE_PAGE = PAGE.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
/** Ce qu'on lit dans la page : son contenu sans ses balises, les signes rendus à eux-mêmes. */
const TEXTE_DE_PAGE = CORPS_DE_PAGE.replace(/<[^>]*>/g, '\n')
  .replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');
const fois = (motif: RegExp): number => [...PAGE.matchAll(motif)].length;
/** Le texte d'une légende tel que le gabarit l'écrit dans la page : avec ses espaces insécables, et rendu inoffensif. */
const ecrit = (texte: string): string => enXml(espacer(texte, TEXTES.typographie));
const [, FACADE = ''] = /<section class="facade"[^>]*>([\s\S]*?)<\/section>/.exec(CORPS_DE_PAGE) ?? [];

test('la page de l’atelier est un fragment à publier tel quel : un titre, un style, son contenu, son script, et rien à aller chercher', () => {
  assert.match(PAGE, /^<title>[^<]+<\/title>\n<style>/);
  assert.doesNotMatch(PAGE, /<!doctype|<(html|head|body)[\s>]/i);
  assert.match(STYLE, /color-scheme:dark/);
  assert.match(STYLE, /body\{[^}]*background:var\(--nuit\)/, 'le fond de la page est dit');
  // Rien ne vient d'ailleurs : les polices sont dans la page, et aucune adresse n'y est écrite.
  assert.doesNotMatch(PAGE, /https?:\/\/|@import|<link|<img|<iframe/);
  assert.equal([...STYLE.matchAll(/@font-face\{[^}]*src:url\(data:font\/woff2;base64,AAAA\)[^}]*\}/g)].length, 3);
  assert.deepEqual(
    [...STYLE.matchAll(/url\(([^)]{0,12})/g)].map((m) => m[1]),
    ['data:font/wo', 'data:font/wo', 'data:font/wo'],
  );
  // Les polices sont dans la page : on les attend plutôt que d'écrire un instant dans une autre.
  assert.equal([...STYLE.matchAll(/font-display:block/g)].length, 3);
  assert.ok(PAGE.includes(`lang="${TEXTES.langue}"`));
  // Un seul titre de page, puis ses parties : le mode d'emploi, la liste des temps et ses enchaînements, les mesures et leur banc.
  assert.equal(
    [...CORPS_DE_PAGE.matchAll(/<h([123])[ >]/g)]
      .map((m) => m[1])
      .join('')
      .replace(/3+/g, '3'),
    '122323',
  );
});

test('le script de la page dit lui-même où en est la scène ; s’il ne démarre jamais, une garde écrite pour le plus vieux des navigateurs le dit à sa place', () => {
  const scripts = [...PAGE.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)].map((m) => m[1] ?? '');
  assert.equal(scripts.length, 2);
  const [script, garde = ''] = scripts;
  assert.equal(script, 'void 0');
  assert.doesNotMatch(garde, /=>|\bconst\b|\blet\b|`|\?\.|classList/, 'la garde ne parle que le plus vieux des JavaScript');
  assert.ok(garde.includes(`getElementById('${ANCRES.etabli}')`));
  // La garde ne regarde que si le script a démarré : la suite (la scène en marche, ou en panne), c'est lui qui la dit, plus tard.
  assert.ok(garde.includes(ANCRES.demarre) && garde.includes(ANCRES.enPanne) && !garde.includes(ANCRES.enMarche));
  // Jouée sur un établi qui n'a pas démarré, elle le met en panne ; sur un établi qui a démarré, elle ne touche à rien.
  const jouer = (classes: string): string => {
    const etabli = { className: classes };
    new Function('document', garde)({ getElementById: () => etabli });
    return etabli.className;
  };
  assert.equal(jouer('etabli'), `etabli ${ANCRES.enPanne}`);
  assert.equal(jouer(`etabli ${ANCRES.demarre}`), `etabli ${ANCRES.demarre}`);
  assert.equal(jouer(`etabli ${ANCRES.demarre} ${ANCRES.enPanne}`), `etabli ${ANCRES.demarre} ${ANCRES.enPanne}`);
  // Une classe qui commence comme « demarre » n'en est pas une.
  assert.equal(jouer(`etabli ${ANCRES.demarre}-pas`), `etabli ${ANCRES.demarre}-pas ${ANCRES.enPanne}`);
});

test('le gabarit et le script désignent les mêmes éléments : chaque ancre est dans la page, une fois', () => {
  const noms = Object.values(ANCRES);
  assert.equal(new Set(noms).size, noms.length, 'deux ancres ne portent pas le même nom');
  const { etabli, place, cadre, facade, etat, chrono, rayer, reveler, avis, toutAnimer, manques } = ANCRES;
  for (const id of [etabli, place, cadre, facade, etat, chrono, rayer, reveler, avis, toutAnimer, manques])
    assert.equal(fois(new RegExp(` id="${id}"`, 'g')), 1, id);
  for (const moment of MOMENTS) assert.equal(fois(new RegExp(` ${ANCRES.moment}="${moment}"`, 'g')), 1, moment);
  assert.deepEqual(Object.keys(LEGENDES.poussoirs).sort(), [...POUSSOIRS].sort());
  for (const poussoir of POUSSOIRS) assert.equal(fois(new RegExp(` ${ANCRES.poussoir}="${poussoir}" aria-pressed="false"`, 'g')), 1, poussoir);
  for (const mesure of MESURES_AFFICHEES) assert.equal(fois(new RegExp(`<dd ${ANCRES.mesure}="${mesure}">`, 'g')), 1, mesure);
  assert.deepEqual(Object.keys(LEGENDES.mesures.surLeVifDe).sort(), [...MESURES_AFFICHEES].sort());
  assert.equal(fois(/ id="/g), new Set([...PAGE.matchAll(/ id="([^"]*)"/g)].map((m) => m[1])).size, 'aucun identifiant ne sert deux fois');
  // Tout ce qui renvoie à un autre élément le trouve.
  const ids = new Set([...PAGE.matchAll(/ id="([^"]*)"/g)].map((m) => m[1]));
  const renvois = [...PAGE.matchAll(/ aria-(?:labelledby|describedby)="([^"]*)"/g)].map((m) => m[1] ?? '');
  assert.ok(renvois.length >= 16, `${renvois.length} renvois`);
  for (const renvoi of renvois) assert.ok(ids.has(renvoi), `« ${renvoi} » ne désigne rien`);
  // La variable par laquelle le script donne sa largeur au cadre est celle que lit la feuille de style, pour sa largeur et sa hauteur.
  assert.ok(STYLE.includes(`width:var(${ANCRES.largeurDuCadre},`) && STYLE.includes(`height:calc(var(${ANCRES.largeurDuCadre}) * `));
  // Le cadre est dans sa place, avec la ligne d'état qui l'accompagne : c'est ensemble que le script les ajuste.
  assert.match(
    CORPS_DE_PAGE,
    new RegExp(
      `<div class="place" id="${place}"><div class="poste">\\s*<div class="cadre" id="${cadre}">[\\s\\S]*?</div>\\s*<p class="dit">[\\s\\S]*?</p>\\s*</div></div>`,
    ),
  );
  // Tant que la scène n'y est pas, le cadre n'est pas une image : c'est le script qui le dit, une fois qu'elle est montée.
  assert.doesNotMatch(CORPS_DE_PAGE, /role="img"/);
});

test('la façade range ses touches en cinq groupes, chacun sous son nom gravé, dans l’ordre de la piste puis de ses variantes', () => {
  const groupes = [
    ...FACADE.matchAll(/<div class="groupe" role="(group|radiogroup)"[^>]*aria-labelledby="([\w-]+)"><p class="gravure" id="([\w-]+)">([^<]+)<\/p>/g),
  ];
  assert.deepEqual(
    groupes.map((m) => [m[4], m[1]]),
    [
      [LEGENDES.groupes.rejouer, 'group'],
      [LEGENDES.groupes.enExtrait, 'group'],
      [LEGENDES.groupes.ralenti, 'radiogroup'],
      [LEGENDES.groupes.verso, 'radiogroup'],
      [LEGENDES.groupes.options, 'group'],
    ],
  );
  for (const m of groupes) {
    assert.equal(m[2], m[3], 'le nom gravé est celui qu’entend qui écoute la page');
    assert.match(m[3] ?? '', /^groupe-[a-z-]+$/);
  }
  // Les cinq moments de la piste d'abord, dans l'ordre où ils arrivent, le décompte en tête : c'est la touche maîtresse, et la seule.
  const moments = [...FACADE.matchAll(new RegExp(`<button type="button" class="touche( maitresse)?" ${ANCRES.moment}="(\\w+)"`, 'g'))];
  assert.deepEqual(
    moments.map((m) => [m[2], m[1] !== undefined]),
    MOMENTS.map((moment, rang) => [moment, rang === 0]),
  );
  const touches = [...FACADE.matchAll(/<(button|label) [^>]*class="touche[^>]*>/g)].map((m) => m[0]);
  assert.equal(touches.length, 14, 'cinq moments, deux touches de l’extrait, trois vitesses, deux versos, deux poussoirs');
  // L'avis n'est plus dans la façade : il est au-dessus de la scène, caché, avec la touche qui rend les animations.
  assert.ok(!FACADE.includes(ANCRES.avis) && !FACADE.includes(ANCRES.toutAnimer));
  const avis = `<p class="avis" id="${ANCRES.avis}" hidden><span>${ecrit(LEGENDES.avis.texte)}</span><button type="button" class="touche" id="${ANCRES.toutAnimer}">${ecrit(LEGENDES.avis.touche)}</button></p>`;
  assert.ok(
    CORPS_DE_PAGE.indexOf(avis) > 0 && CORPS_DE_PAGE.indexOf(avis) < CORPS_DE_PAGE.indexOf(`id="${ANCRES.place}"`),
    'l’avis précède la place de la scène',
  );
  // Ce que l'atelier dit de la séance s'annonce à qui écoute ; le compteur, lui, défile sans être lu.
  assert.ok(
    CORPS_DE_PAGE.includes(
      `<p class="dit"><span id="${ANCRES.etat}" aria-live="polite">${ecrit(LEGENDES.etats.avant)}</span><span id="${ANCRES.chrono}" aria-hidden="true"></span></p>`,
    ),
  );
});

test('chaque touche a son mode d’emploi, sous le nom gravé sur elle ; l’entrée du verso dit que c’est l’idée du client, à la place de la pochette du brief', () => {
  // Tout ce qui se touche renvoie à une entrée du mode d'emploi, qui existe.
  const aides = new Set([...FACADE.matchAll(/ aria-describedby="([\w-]+)"/g)].map((m) => m[1] ?? ''));
  assert.deepEqual(
    [...aides].sort(),
    ['attente', 'leger', 'moments', ANCRES.ralenti, ANCRES.rayer, ANCRES.reveler, 'sobre', ANCRES.verso].map(aideDe).sort(),
  );
  for (const aide of aides) assert.equal(fois(new RegExp(`<dd id="${aide}">[^<]{20,}</dd>`, 'g')), 1, aide);
  for (const touche of [...FACADE.matchAll(/<button [^>]*>/g)].map((m) => m[0])) assert.ok(touche.includes(' aria-describedby="aide-'), touche);
  // Les groupes de crans portent leur mode d'emploi pour qui écoute la page.
  for (const groupe of [ANCRES.ralenti, ANCRES.verso]) assert.ok(FACADE.includes(`role="radiogroup" aria-describedby="${aideDe(groupe)}"`), groupe);
  // Le mode d'emploi nomme chaque touche comme elle est gravée : les mêmes mots, lus au même endroit.
  const [, modeDEmploi = ''] = /<section class="mode-d-emploi">([\s\S]*?)<\/section>/.exec(CORPS_DE_PAGE) ?? [];
  const nommees = [...modeDEmploi.matchAll(/<dt>(.*?)<\/dt>/g)].flatMap((m) =>
    [...(m[1] ?? '').matchAll(/<span>([^<]*)<\/span>/g)].map((n) => n[1] ?? ''),
  );
  const gravees = [...FACADE.matchAll(/<button [^>]*>([^<]+)<\/button>|<span>([^<]+)<\/span><\/label>/g)].map((m) => m[1] ?? m[2] ?? '');
  assert.deepEqual([...nommees].sort(), [...gravees].sort());
  assert.equal(gravees.length, 14);
  // Le ralenti dit de combien : ce sont les vitesses de l'atelier, pas des nombres recopiés.
  const [, lent, tresLent] = VITESSES;
  /** L'aide d'une touche, telle que la page l'écrit. */
  const aide = (cle: string): string => new RegExp(`<dd id="${aideDe(cle)}">([^<]*)</dd>`).exec(modeDEmploi)?.[1] ?? '';
  assert.deepEqual(trousDe(ecrit(LEGENDES.modeDEmploi.ralenti), aide(ANCRES.ralenti)), { lent: String(1 / lent), tresLent: String(1 / tresLent) });
  // L'écart au brief se lit sur la page : l'aide du verso est celle des légendes, et elle nomme le brief. C'est le seul mot qu'on en exige ici.
  assert.equal(aide(ANCRES.verso), ecrit(LEGENDES.modeDEmploi.verso));
  assert.match(LEGENDES.modeDEmploi.verso, /\bbrief\b/);
});

test('les crans de la page proposent ce que l’atelier sait faire : trois vitesses, deux versos, et celui de l’ouverture déjà enfoncé', () => {
  const crans = (nom: string): { valeur: string; nomGrave: string; choisi: boolean }[] =>
    [
      ...PAGE.matchAll(
        new RegExp(
          `<label class="touche( ${ANCRES.choisi})?"><input type="radio" name="${nom}" value="([^"]*)" autocomplete="off"( checked)?><span>([^<]*)</span></label>`,
          'g',
        ),
      ),
    ].map((m) => {
      assert.equal(m[1] !== undefined, m[3] !== undefined, 'le cran coché est le cran enfoncé');
      return { valeur: m[2] ?? '', nomGrave: m[4] ?? '', choisi: m[3] !== undefined };
    });
  const vitesses = crans(ANCRES.ralenti);
  assert.deepEqual(
    vitesses.map((c) => Number(c.valeur)),
    [...VITESSES],
  );
  assert.deepEqual(
    vitesses.map((c) => c.nomGrave),
    ['×1', '×0,5', '×0,25'],
    'le ralenti à ×0,5 et à ×0,25',
  );
  assert.deepEqual(
    vitesses.filter((c) => c.choisi).map((c) => Number(c.valeur)),
    [A_L_OUVERTURE.vitesse],
  );
  const versos = crans(ANCRES.verso);
  assert.deepEqual(
    versos.map((c) => c.valeur),
    [...GENRES_DE_VERSO],
  );
  assert.deepEqual(Object.keys(LEGENDES.versos).sort(), [...GENRES_DE_VERSO].sort());
  assert.deepEqual(
    versos.filter((c) => c.choisi).map((c) => c.valeur),
    [A_L_OUVERTURE.verso],
  );
  // Un bouton radio n'a pas d'identifiant : rien ne le désigne, c'est son libellé qu'on touche.
  assert.doesNotMatch(PAGE, /<input [^>]*\bid=/);
});

test('la page se lit avant que son script ne démarre, et dit ce qui se passe pendant qu’il travaille, ou s’il ne démarre jamais', () => {
  // Les deux touches de l'extrait sont éteintes tant que la piste n'y est pas, sans quitter le clavier : c'est le script qui les allume.
  for (const id of [ANCRES.rayer, ANCRES.reveler])
    assert.ok(PAGE.includes(`<button type="button" class="touche" id="${id}" aria-disabled="true" aria-describedby="${aideDe(id)}">`), id);
  assert.doesNotMatch(CORPS_DE_PAGE, / disabled[ >=]/, 'une touche éteinte garde sa place sous le clavier');
  // Dans le cadre : la phrase d'attente, puis la phrase de panne et la place de ce qui manque, puis celle d'un navigateur sans scripts.
  const N = TEXTES.navigateur;
  assert.ok(
    CORPS_DE_PAGE.includes(
      `<div class="cadre" id="${ANCRES.cadre}"><p class="attente">${ecrit(N.enAttendant)}</p>` +
        `<div class="panne du-navigateur"><p class="panne-titre">${ecrit(N.titre)}</p><p>${ecrit(N.conseil)}</p><p id="${ANCRES.manques}" hidden></p></div>` +
        `<noscript><div class="panne sans-script"><p class="panne-titre">${ecrit(N.sansScript.titre)}</p><p>${ecrit(N.sansScript.conseil)}</p></div></noscript></div>`,
    ),
  );
  // Rien de tout cela ne se montre tant qu'on ne sait pas : la phrase d'attente dès que le script a démarré, jusqu'à ce qu'il ait fini.
  assert.match(STYLE, /\.attente,\.panne\{display:none/);
  assert.ok(STYLE.includes(`.${ANCRES.demarre} .attente{display:block}\n.${ANCRES.enMarche} .attente,.${ANCRES.enPanne} .attente{display:none}`));
  // En panne, le cadre montre sa phrase, et ce qui ne sert plus sans la scène se retire. Sans script, c'est une autre phrase, et la même page.
  const sansLaScene = ['.facade', '.dit', '.avis', '.mode-d-emploi', '.consigne', '.sur-le-vif'];
  const [, sansScript = ''] = /<noscript><style>\n([\s\S]*?)\n<\/style><\/noscript>/.exec(PAGE) ?? [];
  for (const [regles, etabli, message] of [
    [STYLE, `.etabli.${ANCRES.enPanne}`, '.panne.du-navigateur'],
    [sansScript, '.etabli', '.panne.sans-script'],
  ] as const) {
    assert.ok(regles.includes(`${etabli} ${message}{display:block}\n${sansLaScene.map((s) => `${etabli} ${s}`).join(',')}{display:none}`), etabli);
    // Le cadre n'y garde ni la hauteur de l'écran, ni sa forme de téléphone : il se réduit à son message.
    assert.ok(
      regles.includes(`${etabli} .vitrine,${etabli} .place{position:static;height:auto;`) &&
        regles.includes(`${etabli} .cadre{width:auto;height:auto;aspect-ratio:auto;`),
    );
  }
  assert.ok(sansScript.startsWith('.etabli .panne.sans-script{display:block}'));
  for (const classe of ['facade', 'dit', 'avis', 'mode-d-emploi', 'consigne', 'sur-le-vif', 'vitrine', 'premier-ecran', 'poste'])
    assert.match(CORPS_DE_PAGE, new RegExp(`class="[^"]*\\b${classe}\\b`), classe);
  // Tout ce qui est écrit dans la page est rempli, et rendu inoffensif.
  assert.doesNotMatch(CORPS_DE_PAGE, /\{\w+\}|undefined|NaN/);
  assert.doesNotMatch(
    ecrireLaPage({
      textes: TEXTES,
      polices: POLICES,
      enchainements: [{ titre: 'Au « <3 » & "après"', lignes: [{ quand: '<1 ms', quoi: 'a < b', effet: '"vite" & bien', reglage: '' }] }],
      bancs: [BANC_D_ESSAI],
      script: '',
    }),
    /<3|& "|<1 ms|a < b|"vite"/,
    'un texte libre est rendu inoffensif',
  );
});

test('les relevés du banc sont une table par ralenti, qui se lit aussi en fiches : chaque case redit sa colonne, chaque ligne a son en-tête', () => {
  const M = LEGENDES.mesures;
  const B = M.banc;
  const C = B.colonnes;
  const tables = [...CORPS_DE_PAGE.matchAll(/<table role="table"><caption>([^<]*)<\/caption>([\s\S]*?)<\/table>/g)];
  assert.equal(tables.length, 1);
  const [[, titre = '', table = ''] = []] = tables;
  assert.equal(titre, ecrit(remplir(B.ralenti, { ralenti: 4 })));
  assert.equal([...table.matchAll(/<tr role="row">/g)].length, 3, 'ses colonnes, et deux relevés');
  assert.deepEqual(
    [...table.matchAll(/<th role="columnheader" scope="col">([^<]*)<\/th>/g)].map((m) => m[1]),
    [C.scene, C.montage, C.fil, C.script, ...PHASES_DE_PISTE.map((phase) => C[phase])].map(ecrit),
  );
  assert.ok(
    table.includes(
      `<th role="rowheader" scope="row">${ecrit(B.scenes.modeLeger)}</th>` +
        `<td role="cell" data-colonne="${ecrit(C.montage)}">${ecrit(remplir(M.ms, { valeur: ecrire(1294) }))}</td>` +
        `<td role="cell" data-colonne="${ecrit(C.fil)}">${ecrit(remplir(M.ms, { valeur: '6,2' }))}</td>` +
        `<td role="cell" data-colonne="${ecrit(C.script)}">${ecrit(remplir(M.ms, { valeur: '1,4' }))}</td>` +
        `<td role="cell" data-colonne="${ecrit(C.decompte)}">${ecrit(remplir(B.fluidite, { mediane: '16,7', longues: '0' }))}</td>` +
        `<td role="cell" data-colonne="${ecrit(C.extrait)}">${ecrit(remplir(B.fluidite, { mediane: '16,6', longues: '1' }))}</td>` +
        `<td role="cell" data-colonne="${ecrit(C.revelation)}">${ecrit(remplir(B.fluidite, { mediane: '16,7', longues: '2,5' }))}</td>`,
    ),
    table,
  );
  // En fiches, c'est la feuille de style qui écrit le nom de la colonne devant chaque valeur.
  assert.match(STYLE, /td::before\{content:attr\(data-colonne\)/);
  // Le chapeau dit dans quelles conditions on a mesuré, ce qu'est une image en retard, et ce que vaut une image à la cadence visée.
  const chapeaux = TEXTE_DE_PAGE.split('\n').flatMap((ligne) => {
    const trous = trousDe(B.chapeau, ligne);
    return trous === undefined ? [] : [trous];
  });
  assert.deepEqual(chapeaux, [
    { definition: '3', enRetard: ecrire(FLUIDITE.enRetard), cadence: ecrire(FLUIDITE.cadence), intervalle: remplir(M.ms, { valeur: '16,7' }) },
  ]);
  // Deux bancs : deux tables, sous le même chapeau. Sans relevé, ni table ni chapeau.
  const pageDe = (bancs: readonly Banc[]): string => ecrireLaPage({ textes: TEXTES, polices: POLICES, enchainements: TEMPS, bancs, script: '' });
  const deux = pageDe([BANC_D_ESSAI, { ...BANC_D_ESSAI, ralenti: 8 }]);
  assert.deepEqual(
    [...deux.matchAll(/<caption>([^<]*)<\/caption>/g)].map((m) => m[1]),
    [4, 8].map((ralenti) => ecrit(remplir(B.ralenti, { ralenti }))),
  );
  // Un seul chapeau pour les deux : il commence par les mêmes mots, une fois.
  const [debutDuChapeau = ''] = B.chapeau.split('{');
  assert.ok(debutDuChapeau.length > 20 && deux.split(ecrit(debutDuChapeau)).length === 2);
  assert.doesNotMatch(pageDe([]), /<table|<caption/);
  assert.ok(!pageDe([]).includes(ecrit(B.titre)));
  // Des bancs mesurés à des définitions d'écran différentes ne se disent pas sous un même chapeau.
  assert.throws(() => pageDe([BANC_D_ESSAI, { ...BANC_D_ESSAI, ralenti: 8, definition: 2 }]), /même définition/);
});

test('ce que la page lit des relevés du banc en est tiré : un gain qu’on ne sait pas mesurer est dit tel, un gain mesuré est chiffré', () => {
  const releve = (scene: ReleveDeBanc['scene'], montage: number, fil: number, longues: number): ReleveDeBanc => ({
    scene,
    montage,
    fil,
    script: fil / 4,
    decompte: { mediane: 16.7, longues: longues / 2 },
    extrait: { mediane: 16.7, longues },
    revelation: { mediane: 16.7, longues: 0 },
  });
  const banc: Banc = {
    ralenti: 8,
    definition: 3,
    releves: [
      releve('entiere', 2600, 13, 7),
      releve('sansReactions', 2100, 10.4, 5),
      releve('demiDefinition', 1000, 12.8, 6),
      releve('densiteSobre', 1300, 13.4, 7),
      releve('modeLeger', 500, 15.6, 5),
    ],
  };
  const [paragraphe = '', seuils = '', limite = ''] = lectureDesBancs([banc]);
  const L = LEGENDES.mesures.lecture;
  const S = LEGENDES.mesures.banc.scenes;
  assert.equal(
    paragraphe,
    [
      // La scène entière : ce que le fil principal travaille par image, sur ce qu'une image a ; et la pire de ses phases.
      remplir(L.entiere, { ralenti: '8', fil: '13', script: '3,3', intervalle: '16,7', longues: '7' }),
      // Un premier dessin 1,24 fois plus court : d'un relevé à l'autre il bouge presque d'autant, ce n'est rien. 2,6 ms de moins sur 13 : mesuré.
      remplir(L.allegement.inchange.moins, { scene: S.sansReactions, ms: '2,6' }),
      // 2,6 fois plus court ; 0,2 ms sur 13, bien moins que ce dont deux relevés diffèrent : rien de mesurable. 0,4 ms de plus : pas davantage.
      remplir(L.allegement.plusCourt.pareil, { scene: S.demiDefinition, fois: '2,6' }),
      remplir(L.allegement.plusCourt.pareil, { scene: S.densiteSobre, fois: '2' }),
      // Un allègement qui coûterait par image serait dit aussi.
      remplir(L.allegement.plusCourt.plus, { scene: S.modeLeger, fois: '5,2', ms: '2,6' }),
    ].join(L.entreDeuxPhrases),
  );
  assert.ok(MESURABLE.travail * 13 > 0.4 && MESURABLE.travail * 13 < 2.6, 'le seuil de ce qui se mesure sépare bien ces cas');
  assert.ok(MESURABLE.dessin > 2600 / 2100 && MESURABLE.dessin < 2, 'celui du premier dessin aussi');
  // Ce qui est dit « rien de mesurable » l'est par des seuils, et la page les donne ; puis ce que ces bancs ne disent pas.
  assert.deepEqual(trousDe(L.seuils, seuils), { fois: ecrire(MESURABLE.dessin, 2), part: ecrire(MESURABLE.travail * 100) });
  assert.equal(limite, L.limite);
  assert.deepEqual(lectureDesBancs([]), [], 'sans relevé, rien à lire');
  assert.throws(() => lectureDesBancs([{ ...banc, releves: banc.releves.slice(1) }]), /scène entière/);
  // La page l'écrit sous les tables, un paragraphe par banc.
  assert.ok(PAGE.includes(`</table>\n<p class="note">${ecrit(lectureDesBancs([BANC_D_ESSAI])[0] ?? '')}</p>`));
});

test('les relevés du banc sont ceux de ses cinq scènes, mesurées de la même façon ; une image en retard est une image arrivée une fois et demie trop tard', () => {
  assert.deepEqual(Object.keys(SCENES_DE_BANC), ['entiere', 'sansReactions', 'demiDefinition', 'densiteSobre', 'modeLeger']);
  assert.deepEqual(Object.keys(LEGENDES.mesures.banc.scenes), Object.keys(SCENES_DE_BANC));
  // La scène entière ne retire rien ; le mode léger retire tout ; chaque allègement seul retire ce que son nom dit, et rien d'autre.
  assert.ok(!Object.values(SCENES_DE_BANC.entiere).some(Boolean) && Object.values(SCENES_DE_BANC.modeLeger).every(Boolean));
  assert.deepEqual(SCENES_DE_BANC.sansReactions, { ...SCENES_DE_BANC.entiere, sansReactions: true, ombresFigees: true });
  assert.deepEqual(SCENES_DE_BANC.demiDefinition, { ...SCENES_DE_BANC.entiere, demiDefinition: true });
  assert.deepEqual(SCENES_DE_BANC.densiteSobre, { ...SCENES_DE_BANC.entiere, densiteSobre: true });
  assert.ok(Math.abs(FLUIDITE.enRetard - 1.5 * (1000 / FLUIDITE.cadence)) < 1e-9);
  assert.deepEqual(fluiditeDe([16, 17, 16, 30, 17, 16, 26, 16]), { mediane: 17, longues: 25, pire: 30 });
  assert.deepEqual(fluiditeDe([25]), { mediane: 25, longues: 0, pire: 25 }, 'pile au seuil, une image n’est pas en retard');
  assert.deepEqual(fluiditeDe([]), { mediane: 0, longues: 0, pire: 0 });
  // Les relevés publiés : chaque banc a mesuré les cinq scènes, à la même définition, et la page sait les lire.
  assert.ok(BANCS.length >= 1);
  for (const banc of BANCS) {
    assert.deepEqual(
      banc.releves.map((r) => r.scene),
      Object.keys(SCENES_DE_BANC),
      `banc ralenti ${banc.ralenti} fois`,
    );
    for (const r of banc.releves) {
      assert.ok(r.montage > 0 && r.fil > 0, `${r.scene}`);
      for (const phase of PHASES_DE_PISTE)
        assert.ok(r[phase].mediane > 10 && r[phase].longues >= 0 && r[phase].longues <= 100, `${r.scene}, ${phase}`);
    }
  }
  assert.equal(new Set(BANCS.map((banc) => banc.ralenti)).size, BANCS.length, 'un banc par ralenti');
  assert.equal(lectureDesBancs(BANCS).length, BANCS.length + 2);
  // Sans ses réactions, la scène a le même dessin que l'entière : ce dont leurs premiers dessins s'écartent n'est que le bruit du banc.
  // S'il passait le seuil de ce qu'on dit mesurable, c'est le seuil qu'il faudrait relever, pas la phrase qu'il faudrait croire.
  assert.equal(SCENES_DE_BANC.sansReactions.densiteSobre, SCENES_DE_BANC.entiere.densiteSobre);
  assert.equal(SCENES_DE_BANC.sansReactions.demiDefinition, SCENES_DE_BANC.entiere.demiDefinition);
  for (const banc of BANCS) {
    const premierDessin = (scene: ReleveDeBanc['scene']): number => banc.releves.find((r) => r.scene === scene)?.montage ?? NaN;
    const [entiere, sansReactions] = [premierDessin('entiere'), premierDessin('sansReactions')];
    assert.ok(
      Math.max(entiere / sansReactions, sansReactions / entiere) < MESURABLE.dessin,
      `banc ralenti ${banc.ralenti} fois : deux scènes au même dessin, ${entiere} et ${sansReactions} ms`,
    );
  }
});

test('la page ne coupe pas une ligne où le français ne la coupe pas : avant un signe double, dans des guillemets, entre un nombre et son unité, autour d’une barre', () => {
  assert.doesNotMatch(TEXTE_DE_PAGE, / [:;?!%»·/]/u, 'une espace ordinaire avant un signe double ou une barre');
  assert.doesNotMatch(TEXTE_DE_PAGE, /[«/] /u, 'une espace ordinaire après un guillemet ouvrant ou une barre');
  const unites = TEXTES.typographie.unites.map((unite) => unite.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')).join('|');
  assert.doesNotMatch(TEXTE_DE_PAGE, new RegExp(`\\d (${unites})(?![\\wÀ-ÿ])`, 'u'), 'une espace ordinaire entre un nombre et son unité');
  // Et elle en a bien, de ces espaces-là : la liste des temps en est pleine, jusque dans ses réglages.
  assert.ok([...TEXTE_DE_PAGE.matchAll(new RegExp(`\\d${INSECABLE}ms`, 'g'))].length > 40);
  assert.ok(TEXTE_DE_PAGE.includes(`Au «${INSECABLE}3${INSECABLE}»`));
  assert.match(TEXTE_DE_PAGE, new RegExp(`\\d${INSECABLE}°/s²`), 'un nombre et « °/s² » ne se séparent pas');
  // Les trois réglages d'un ressort tiennent d'un seul tenant : ses nombres et ses barres ne laissent aucune espace où couper.
  const { raideur, amortissement, masse } = MATIERES.vinyle.suit;
  const ressort = espacer(
    remplir(LEGENDES.temps.reglages.ressort, { raideur: ecrire(raideur), amortissement: ecrire(amortissement), masse: ecrire(masse) }),
    TEXTES.typographie,
  );
  assert.ok(TEXTE_DE_PAGE.includes(ressort), ressort);
  assert.doesNotMatch(ressort.slice(ressort.search(/\d/)), / /, 'une espace ordinaire entre les réglages d’un ressort');
  // Ce qu'on lit dans la liste : le temps d'un départ, ce qui part, puis comment et avec quels réglages, d'un seul tenant.
  const G = LEGENDES.temps.gestes;
  const sort = TEMPS.flatMap((e) => e.lignes).find((l) => l.quoi === G.disqueSort);
  assert.ok(sort !== undefined);
  assert.ok(
    CORPS_DE_PAGE.includes(
      `<li><span class="quand">${ecrit(sort.quand)}</span><span class="quoi">${ecrit(G.disqueSort)}</span><span class="comment">${ecrit(remplir(LEGENDES.temps.comment, { effet: sort.effet, reglage: sort.reglage }))}</span></li>`,
    ),
  );
  // Ce qui n'est pas un départ n'a pas de temps, et pas de réglages : sa ligne ne garde que ce qui le fait bouger.
  const { secteurs } = LEGENDES.temps.notes;
  assert.ok(
    CORPS_DE_PAGE.includes(`<li><span class="quoi">${ecrit(secteurs.quoi)}</span><span class="comment">${ecrit(secteurs.comment)}</span></li>`),
  );
  assert.equal([...CORPS_DE_PAGE.matchAll(/<ol class="lignes">/g)].length, TEMPS.length);
  assert.equal(
    [...CORPS_DE_PAGE.matchAll(/<li>/g)].length,
    TEMPS.reduce((somme, e) => somme + e.lignes.length, 0),
  );
});

/** Toutes les chaînes d'un arbre de textes : celles du gabarit, et celles que le script écrira plus tard dans la page. */
function chainesDe(arbre: unknown): string[] {
  if (typeof arbre === 'string') return [arbre];
  return arbre !== null && typeof arbre === 'object' ? Object.values(arbre).flatMap(chainesDe) : [];
}

test('tout ce que la page écrit, et tout ce que son script y écrira, a ses lettres dans ses deux polices, en capitales aussi', () => {
  // Les fichiers servis par la page et ceux du tracé portent les mêmes signes : on lit les seconds, qu'on sait ouvrir ici.
  const signesDe = (fichier: string): ((signe: string) => boolean) => {
    const fonte = opentype.parse(lireUnePolice(fichier));
    return (signe) => fonte.charToGlyph(signe).index !== 0;
  };
  const visibles = (texte: string): string[] => [...new Set(texte)].filter((signe) => signe.trim() !== '' || signe === INSECABLE);
  // Les titres sont en caractère de titrage ; tout le reste en caractère technique, dans ses deux graisses.
  const titres = [...CORPS_DE_PAGE.matchAll(/<(h1|h2|p class="panne-titre")>([^<]*)</g)].map((m) => m[2] ?? '');
  assert.equal(titres.length, 6, 'le titre de la page, ses trois parties, et les deux phrases de panne');
  const aDuTitrage = signesDe(CARACTERES.titrage.trace);
  for (const signe of visibles(titres.join(''))) assert.ok(aDuTitrage(signe), `${CARACTERES.titrage.famille} n'a pas « ${signe} »`);
  // Ce que le script écrit n'est pas dans la page d'avance : les états de la séance, le chrono, les mesures, ce qui manque au navigateur.
  // Les accolades de ses phrases à trous seront remplies par des nombres et par les textes d'exemple.
  const duScript = [...chainesDe(LEGENDES), ...chainesDe(TEXTES.navigateur), ...chainesDe(TEXTES.exemples), TEXTES.piste.raye, '0123456789,−']
    .join('')
    .replace(/[{}]/g, '');
  // La feuille de style grave en capitales : les signes doivent y être aussi.
  const tout = espacer(`${TEXTE_DE_PAGE}${duScript}`, TEXTES.typographie);
  const signes = visibles(`${tout}${tout.toLocaleUpperCase(TEXTES.langue)}`);
  assert.ok(signes.length > 90, `${signes.length} signes`);
  for (const signe of ['×', '°', '²', '·', '«', '’', '—', 'É', 'À', INSECABLE]) assert.ok(signes.includes(signe), `« ${signe} » n'est pas lu`);
  for (const caractere of [CARACTERES.technique, CARACTERES.techniqueFort]) {
    const a = signesDe(caractere.trace);
    for (const signe of signes) assert.ok(a(signe), `${caractere.famille} ${caractere.graisse} n'a pas « ${signe} »`);
  }
});

test('le style de la page tient les interdits : la palette et rien d’autre, ni dégradé, ni flou, ni halo, ni ombre, et seules des transformations s’animent', () => {
  const tons = new Set(Object.values(TEINTES).flat());
  const couleurs = [...STYLE.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  assert.ok(couleurs.length >= 12, `${couleurs.length} couleurs`);
  for (const c of couleurs) assert.ok(tons.has(c), `${c} n'est pas un ton de la palette`);
  // Les couleurs ne s'écrivent qu'une fois, en tête, sous leur nom : partout ailleurs, la feuille les appelle par lui.
  assert.equal(couleurs.length, Object.keys(COULEURS).length);
  const autresVariables = ['titrage', 'technique', 'gouttiere', ANCRES.largeurDuCadre.slice(2), 'face', 'tranche'];
  for (const [, nom = ''] of STYLE.matchAll(/var\(--([\w-]+)[,)]/g)) assert.ok(nom in COULEURS || autresVariables.includes(nom), `--${nom}`);
  assert.doesNotMatch(STYLE, /gradient|blur\(|backdrop|text-shadow|box-shadow|filter:|rgba?\(|hsla?\(|#000\b|#000000|#fff\b|#ffffff/i);
  // On n'anime que des transformations, sans courbe : une touche s'arrête net. Ses temps et sa course sont ceux de la table de mouvement.
  const [enfonce, remonte] = [`${TOUCHES.enfonce * 1000}ms`, `${TOUCHES.remonte * 1000}ms`];
  const transitions = [...STYLE.matchAll(/transition:([^;}]*)/g)].map((m) => m[1] ?? '');
  assert.ok(transitions.length >= 2);
  for (const transition of transitions) assert.ok(transition === 'none' || transition === `transform ${remonte} linear`, transition);
  assert.deepEqual([...new Set([...STYLE.matchAll(/transition-duration:([^;}]*)/g)].map((m) => m[1]))], [enfonce]);
  assert.deepEqual([enfonce, remonte], ['60ms', '80ms']);
  assert.doesNotMatch(STYLE, /animation|@keyframes/);
  assert.match(STYLE, /@media \(prefers-reduced-motion:reduce\)\{\.touche,\.touche::before\{transition:none\}\}/);
  // Enfoncée, enclenchée ou éteinte, une touche descend de sa course, et sa tranche se raccourcit d'autant : jamais plus.
  const enfoncees = `.touche:active,.touche[aria-pressed="true"],.touche[aria-disabled="true"],.touche.${ANCRES.choisi}`;
  assert.ok(STYLE.includes(`${enfoncees}{transform:translateY(${TOUCHES.course}px);`));
  assert.ok(STYLE.includes(`.touche::before{background:var(--tranche);transform:translateY(${TOUCHES.course + 1}px);`));
  assert.ok(STYLE.includes(`${enfoncees.replace(/,/g, '::before,')}::before{transform:translateY(1px);`));
  assert.doesNotMatch(STYLE, /:hover/, 'rien au survol');
  // Les deux familles du site, et aucune de celles qu'on voit partout.
  assert.doesNotMatch(STYLE, /Inter\b|Roboto|Poppins|Montserrat|Space Grotesk|DM Sans/);
  const familles = new Set([...STYLE.matchAll(/@font-face\{font-family:'([^']+)'/g)].map((m) => m[1]));
  assert.deepEqual([...familles].sort(), [CARACTERES.technique.famille, CARACTERES.titrage.famille].sort());
});

test('chaque texte de la page se lit sur son fond : le contraste d’un texte courant, partout', () => {
  const C = COULEURS;
  // L'encre, puis le fond sur lequel la feuille de style l'écrit.
  const lectures: readonly (readonly [keyof typeof C, keyof typeof C, string])[] = [
    ['creme', 'nuit', 'le texte'],
    ['sourdine', 'nuit', 'le texte secondaire : chapeaux, notes, réglages'],
    ['miel', 'nuit', 'les intertitres'],
    ['gravure', 'laque', 'les noms gravés des groupes'],
    ['encre', 'touche', 'une touche'],
    ['encre', 'miel', 'la touche maîtresse'],
    ['miel', 'encre', 'une touche enclenchée'],
    ['encre', 'touche-eteinte', 'une touche éteinte'],
    ['creme', 'bois', 'la phrase de panne'],
    ['sourdine', 'bois', 'la phrase d’attente'],
  ];
  for (const [encre, fond, quoi] of lectures) {
    assert.ok(STYLE.includes(`var(--${encre})`) && STYLE.includes(`var(--${fond})`), quoi);
    assert.ok(contraste(C[encre], C[fond]) >= CONTRASTES.texte, `${quoi} : ${contraste(C[encre], C[fond]).toFixed(2)}`);
  }
  // Une touche enclenchée se voit sur la laque autrement que par son texte : son cercle de miel s'y détache comme un texte.
  assert.ok(STYLE.includes(`.touche[aria-pressed="true"]::after,.touche.${ANCRES.choisi}::after{border:2px solid var(--miel)}`));
  assert.ok(contraste(C.miel, C.laque) >= CONTRASTES.grandTexte);
  // Et quand l'appareil impose ses couleurs, les états d'une touche se disent par son bord.
  const [, forcees = ''] = /@media \(forced-colors:active\)\{([\s\S]*?)\n\}/.exec(STYLE) ?? [];
  assert.match(forcees, /\.touche\{border:1px solid ButtonText\}/);
  assert.match(forcees, /aria-pressed="true"\][^{]*\{border:3px solid Highlight/);
  assert.match(forcees, /aria-disabled="true"\]\{border:1px dashed GrayText/);
});

test('la page se met en colonne sur un téléphone, la scène à gauche et ses touches à droite, et passe en mise en page de bureau sur un écran large', () => {
  const { largeur, hauteur } = CADRAGES.telephone;
  const P = MISE_EN_PAGE;
  // En colonne, la façade garde sa largeur la plus étroite tant que le cadre n'a pas toute sa taille : sur un téléphone, la scène a tout le reste.
  const [, colonnes = ''] = /\.premier-ecran\{[^}]*grid-template-columns:minmax\(0,1fr\) (clamp\([^;]*\));/.exec(STYLE) ?? [];
  assert.equal(colonnes, `clamp(${P.colonne.auMoins}px,calc(100% - ${largeur + 2 * P.serre}px),${P.colonneDeTexte - largeur - 2 * P.serre}px)`);
  // À 390 px de large, la scène est montrée aux trois quarts de sa taille ; à 320, à plus de la moitié.
  const echelle = (ecran: number): number => (ecran - P.colonne.auMoins - 2 * P.serre) / largeur;
  assert.ok(echelle(390) > 0.74 && echelle(320) > 0.56, `${echelle(390)} à 390 px, ${echelle(320)} à 320 px`);
  // La vitrine tient dans l'écran et reste en vue pendant qu'on fait défiler la façade ; elle n'est jamais plus haute que le cadre à sa taille.
  const [, vitrine = ''] = /\.vitrine\{([^}]*)\}/.exec(STYLE) ?? [];
  assert.match(vitrine, /position:sticky;top:0;/);
  assert.ok(vitrine.includes(`max-height:${hauteur + 2 * P.serre + P.dit}px`), vitrine);
  // Une touche se vise du doigt : 44 px de haut au moins, partout.
  assert.ok(P.touche >= 44 && STYLE.includes(`min-height:${P.touche}px`));
  // Gravée petit, en colonne ; au corps des mentions dès que la colonne s'élargit, et au bureau.
  assert.ok(STYLE.includes(`font-size:${CORPS.gravure}px;line-height:1.1;`));
  // La règle qui grave plus gros vient après celle qui grave petit : écrite avant elle, elle n'aurait aucun effet.
  const [gravePetit, gravePlusGros] = [
    STYLE.indexOf(`font-size:${CORPS.gravure}px;line-height:1.1;`),
    STYLE.indexOf(`@media (min-width:${P.graverPlusGros}px){.touche{font-size:${CORPS.mention}px}}`),
  ];
  assert.ok(gravePetit >= 0 && gravePlusGros > gravePetit, `gravé petit à ${gravePetit}, plus gros à ${gravePlusGros}`);
  // La mise en page de bureau : un écran large, ou une fenêtre basse et large.
  const debutDuBureau = `@media (min-width:${P.bureau}px),(min-width:${P.bureauCouche}px) and (min-aspect-ratio:5/4){`;
  const [, bureau = ''] = STYLE.split(debutDuBureau);
  const auBureau = bureau.slice(0, bureau.indexOf('\n}\n'));
  assert.ok(auBureau.length > 500, 'la mise en page de bureau a ses règles');
  // La vitrine s'y efface : la place de la scène tient la première colonne, et l'avis passe dans la seconde, où il ne lui prend rien.
  assert.ok(auBureau.includes('.vitrine{display:contents}') && auBureau.includes('.avis,.entete,.facade,.etabli>section{grid-column:2}'));
  assert.match(auBureau, /\.place\{grid-column:1;[^}]*position:sticky;/);
  // En rangs, une touche garde la largeur de ce qu'on vise du doigt : un groupe qui ne tient plus passe au rang d'après.
  assert.ok(auBureau.includes(`.touche{min-width:${P.touche}px;`) && auBureau.includes('flex-wrap:wrap'));
  // Sous un petit cadre, ce que l'atelier dit de la séance passe à la ligne plutôt que d'être coupé.
  assert.ok(auBureau.includes(`.dit,#${ANCRES.etat}{white-space:normal}`) && auBureau.includes(`#${ANCRES.etat}{overflow:visible}`));
  // Une fenêtre basse grave ses touches plus petit ; et seul un téléphone, qu'on touche du doigt, s'entend dire de se redresser.
  assert.ok(STYLE.includes('.avis.couche{display:none}'));
  const basse = `(min-width:${P.bureauCouche}px) and (max-height:${P.couche}px) and (min-aspect-ratio:5/4)`;
  /** Ce qu'une condition de la feuille de style commande : ses règles, sans les blancs qui les entourent. */
  const sous = (condition: string): string => (STYLE.split(`@media ${condition}{`)[1] ?? '').split('\n}')[0]?.trim() ?? '';
  assert.match(sous(basse), /^\.touche\{[^}]*font-size:[\d.]+px\}$/);
  assert.match(sous(`${basse} and (hover:none) and (pointer:coarse)`), /^\.avis\.couche\{display:block;[^}]*\}$/);
  assert.equal([...STYLE.matchAll(/\.avis\.couche\{display:block/g)].length, 1, 'l’avis du téléphone couché ne se montre qu’à cette condition');
  assert.ok(CORPS_DE_PAGE.includes(`<p class="avis couche">${ecrit(LEGENDES.couche)}</p>`));
  // Le contour du clavier tient dans l'écart entre deux touches : il ne touche pas la voisine.
  assert.ok(P.clavier.trait + P.clavier.ecart < Math.min(P.entreTouches, P.entreRangs));
  assert.ok(STYLE.includes(`.touche:focus{outline:${P.clavier.trait}px solid var(--miel);outline-offset:${P.clavier.ecart}px}`));
  // Et quand le clavier arrive sur une touche au ras de l'écran, la page défile de quoi montrer ce contour entier.
  assert.ok(STYLE.includes(`scroll-padding:${P.entreRangs}px 0;`) && P.entreRangs > P.clavier.trait + P.clavier.ecart);
  // Une petite fenêtre en colonne (un téléphone court, ou très étroit) : la ligne d'état y a deux lignes, qu'elle les remplisse
  // ou non, pour qu'une réponse y tienne sans que le cadre change de taille en cours de piste.
  const PAS_LARGE = '1249/1000';
  const petite = [
    `(max-width:${P.petiteFenetre.largeur}px)`,
    `(max-width:${P.bureauCouche - 1}px) and (max-height:${P.petiteFenetre.hauteur}px)`,
    `(max-width:${P.bureau - 1}px) and (max-height:${P.petiteFenetre.hauteur}px) and (max-aspect-ratio:${PAS_LARGE})`,
  ].join(',');
  assert.equal(
    sous(petite),
    `.dit{align-items:flex-start;height:${2 * P.petiteFenetre.ligne}px;line-height:${P.petiteFenetre.ligne}px;white-space:normal}\n  #${ANCRES.etat}{white-space:normal;overflow:visible}`,
  );
  // Aucune de ces fenêtres n'est de celles de la mise en page de bureau : trop étroite pour elle, ou pas assez large pour sa hauteur.
  const [numerateur = 0, denominateur = 1] = PAS_LARGE.split('/').map(Number);
  assert.ok(P.petiteFenetre.largeur < P.bureauCouche && numerateur / denominateur < 5 / 4);
  // Deux lignes y coûtent moins au cadre qu'une ligne de plus : la scène n'y perd presque rien.
  assert.ok(2 * P.petiteFenetre.ligne - P.dit < P.dit);
  // La liste des temps, quand l'heure d'un départ a sa colonne : elle y tient sur une ligne.
  assert.ok(STYLE.includes(`.lignes li{display:grid;grid-template-columns:${P.colonneDesHeures}px minmax(0,1fr);`));
  assert.match(STYLE, /\.quand\{[^}]*white-space:nowrap/);
  // Au bureau, la façade reste en vue dès qu'il y a la hauteur de lire dessous.
  assert.ok(STYLE.includes(`@media (min-width:${P.bureau}px) and (min-height:${P.facadeEnVue}px){`) && P.facadeEnVue <= 600);
});

test('la feuille de style se passe de ce que les navigateurs d’il y a cinq ans ne lisaient pas tous, ou leur donne un repli', () => {
  assert.doesNotMatch(STYLE, /\binset:|(padding|margin|border)-(inline|block)/, 'pas de raccourcis logiques');
  // Un écart entre deux boîtes ne se demande qu'à une grille : une boîte flexible ne le connaît pas partout. Et il s'écrit sous ses deux noms.
  for (const [regle] of STYLE.matchAll(/[^{}]+\{[^{}]*\}/g)) {
    if (/display:(inline-)?flex/.test(regle)) assert.doesNotMatch(regle, /gap:/, regle);
    for (const [, sens = ''] of regle.matchAll(/(?:^|[;{])(row|column)-gap:/g)) assert.ok(regle.includes(`grid-${sens}-gap:`), regle);
  }
  // La hauteur de l'écran : celle de la fenêtre d'abord, pour qui ne connaît pas celle que l'écran garde quand ses barres sont là.
  assert.match(STYLE, /\.vitrine\{[^}]*height:100vh;height:100svh;/);
  // Les colonnes du premier écran : une largeur fixe d'abord, pour qui ne sait pas borner une valeur.
  assert.match(STYLE, /\.premier-ecran\{[^}]*grid-template-columns:minmax\(0,1fr\) \d+px;grid-template-columns:minmax\(0,1fr\) clamp\(/);
  // La largeur au plus juste d'un groupe : sous son ancien nom d'abord.
  assert.match(STYLE, /width:-webkit-min-content;width:min-content/);
  // Le cadre a une largeur même sans variable de style, et sa forme même sans hauteur calculée.
  assert.match(STYLE, /\.cadre\{[^}]*width:\d+px;width:var\(--[\w-]+,\d+px\);[^}]*aspect-ratio:\d+\/\d+/);
  assert.doesNotMatch(STYLE, /:has\(|@container|\bdvh\b|\blvh\b|color-mix|:is\(|:where\(/);
  // Le clavier se voit sur chaque touche, et sur un cran, qui est un libellé autour d'un bouton radio.
  assert.match(STYLE, /\.touche:focus\{outline:\d+px solid var\(--miel\)/);
  assert.match(STYLE, /\.touche input:focus\+span::after\{[^}]*border:\d+px solid var\(--miel\)/);
  // Le bouton radio couvre sa touche : quand le clavier y arrive, c'est elle tout entière que le navigateur amène à l'écran, avec de la marge.
  assert.match(STYLE, /\.touche input\{position:absolute;top:0;left:0;width:100%;height:100%;[^}]*scroll-margin:\d+px\}/);
});
