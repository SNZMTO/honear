/**
 * Les règles de tenue du code, vérifiées sur les sources elles-mêmes :
 * les couches ne se mélangent pas, et chaque valeur n'est écrite qu'à un endroit.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

interface Source {
  /** Chemin depuis src/, avec des barres obliques. */
  readonly chemin: string;
  /** La couche du module : le premier dossier de son chemin, ou son nom s'il est à la racine. */
  readonly couche: string;
  readonly texte: string;
  /** Le même, sans ses commentaires. */
  readonly code: string;
}

const sansCommentaires = (texte: string): string => texte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function lire(dossier: string): Source[] {
  return readdirSync(dossier, { withFileTypes: true }).flatMap((entree): Source[] => {
    const complet = join(dossier, entree.name);
    if (entree.isDirectory()) return lire(complet);
    if (!entree.name.endsWith('.ts')) return [];
    const chemin = relative(SRC, complet).split(sep).join('/');
    const texte = readFileSync(complet, 'utf8');
    return [
      { chemin, couche: chemin.includes('/') ? (chemin.split('/')[0] ?? '') : chemin.replace(/\.ts$/, ''), texte, code: sansCommentaires(texte) },
    ];
  });
}

const SOURCES = lire(SRC);
const imports = (source: Source): string[] => [...source.code.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '');

/** Les morceaux du chemin, depuis src/, que désigne un chemin relatif écrit dans un module : ses dossiers, puis son nom sans extension. */
function morceauxImportes(source: Source, chemin: string): string[] {
  const morceaux = source.chemin.split('/').slice(0, -1);
  for (const pas of chemin.split('/')) {
    if (pas === '..') morceaux.pop();
    else if (pas !== '.') morceaux.push(pas);
  }
  return morceaux;
}

/** La couche d'un module importé par un chemin relatif. */
function coucheImportee(source: Source, chemin: string): string {
  const morceaux = morceauxImportes(source, chemin);
  return morceaux.length > 1 ? (morceaux[0] ?? '') : (morceaux[0] ?? '').replace(/\.ts$/, '');
}

/**
 * Ce que chaque couche a le droit de lire. L'écran pose la scène dans un navigateur : il la lit, elle ne le lit pas ;
 * comme elle, il lit les règles, dont il reçoit l'état d'une piste, le lexique, qui nomme les calques, et les ressources,
 * qui ne sont que des données.
 * Les planches, documents des étapes, assemblent tout ; personne ne les lit.
 */
const LECTURES: Readonly<Record<string, readonly string[]>> = {
  lexique: [],
  ressources: ['ressources'],
  regles: ['regles', 'ressources'],
  mouvement: ['mouvement'],
  lowpoly: ['lowpoly', 'ressources'],
  scene: ['scene', 'lowpoly', 'mouvement', 'regles', 'ressources', 'lexique'],
  ecran: ['ecran', 'scene', 'lowpoly', 'regles', 'ressources', 'lexique'],
  serveur: ['serveur', 'regles', 'ressources'],
  reseau: ['reseau', 'serveur', 'regles', 'ressources'],
  planche: ['planche', 'serveur', 'ecran', 'scene', 'lowpoly', 'mouvement', 'regles', 'ressources', 'lexique'],
};

test('les couches ne se mélangent pas : chacune ne lit que celles du dessous', () => {
  assert.deepEqual([...new Set(SOURCES.map((s) => s.couche))].sort(), Object.keys(LECTURES).sort());
  let lus = 0;
  for (const source of SOURCES) {
    for (const chemin of imports(source).filter((c) => c.startsWith('.'))) {
      lus++;
      const couche = coucheImportee(source, chemin);
      assert.ok(LECTURES[source.couche]?.includes(couche), `${source.chemin} (${source.couche}) lit « ${chemin} » (${couche})`);
    }
  }
  assert.ok(lus > 300, `${lus} imports vérifiés`);
});

test('les ressources, le low-poly et la scène ne touchent ni au disque dur ni au réseau, et seul l’écran touche à la page d’un navigateur', () => {
  let pagesTouchees = 0;
  for (const source of SOURCES) {
    const dehors = imports(source).filter((c) => !c.startsWith('.'));
    if (source.couche === 'planche') continue;
    // Le réseau, lui, est fait pour ça : il ouvre la porte HTTP et les WebSockets, lit sa page et son environnement. Avec Node et `ws` seuls.
    if (source.couche === 'reseau') {
      for (const paquet of dehors) assert.ok(paquet.startsWith('node:') || paquet === 'ws', `${source.chemin} lit « ${paquet} »`);
      continue;
    }
    // Deux modules seulement lisent une bibliothèque : le tracé des textes, celle qui ouvre les polices ; le QR code, celle qui
    // l'encode. Ni l'une ni l'autre ne touche au disque ou au réseau.
    const permises: Readonly<Record<string, readonly string[]>> = { 'scene/rendu/texte.ts': ['opentype.js'], 'scene/qr.ts': ['qrcode-generator'] };
    assert.deepEqual(dehors, permises[source.chemin] ?? [], source.chemin);
    assert.doesNotMatch(source.code, /\b(readFileSync|writeFileSync|fetch|process\.)/, source.chemin);
    // Les règles, le mouvement, le low-poly et la scène ne savent pas ce qu'est une page : ils se testent sans navigateur.
    // Ni par son document, ni par sa fenêtre, de quelque nom qu'on l'appelle, ni par ce qu'elle garde ou sait de l'appareil.
    if (source.couche === 'ecran') pagesTouchees += /\b(document|window)\./.test(source.code) ? 1 : 0;
    else
      assert.doesNotMatch(
        source.code,
        /\b(document\.|window\.|globalThis\b|self\.|navigator\.|location\.|localStorage\b|sessionStorage\b|HTMLElement\b|requestAnimationFrame\()/,
        source.chemin,
      );
  }
  assert.ok(pagesTouchees >= 3, `${pagesTouchees} modules de l'écran touchent à la page`);
});

/** Le chemin, depuis src/, d'un module importé par un chemin relatif. */
function moduleImporte(source: Source, chemin: string): string {
  const base = morceauxImportes(source, chemin).join('/');
  const trouve = [`${base}.ts`, `${base}/index.ts`].find((candidat) => SOURCES.some((s) => s.chemin === candidat));
  assert.ok(trouve !== undefined, `${source.chemin} importe « ${chemin} », qu'on ne trouve pas`);
  return trouve;
}

/**
 * Les modules qu'embarque le script d'une page, depuis son point d'entrée : seuls comptent les imports de valeurs, un type importé
 * ne laissant rien dans le script. Chacun est vérifié en route : ni disque dur ni paquet de Node, et des bibliothèques permises seules.
 */
function modulesEmbarques(entree: string, paquets: readonly string[]): Set<string> {
  const parChemin = new Map(SOURCES.map((s) => [s.chemin, s]));
  const vus = new Set<string>();
  const aVoir = [entree];
  for (let chemin = aVoir.pop(); chemin !== undefined; chemin = aVoir.pop()) {
    if (vus.has(chemin)) continue;
    vus.add(chemin);
    const source = parChemin.get(chemin);
    assert.ok(source !== undefined, chemin);
    assert.doesNotMatch(source.code, /\b(readFileSync|writeFileSync|process\.|__dirname)|import\.meta/, chemin);
    for (const [, deType, importe = ''] of source.code.matchAll(/(?:import|export)\s+(type\s+)?[^;]*?from '([^']+)'/g)) {
      if (deType !== undefined) continue;
      if (importe.startsWith('.')) aVoir.push(moduleImporte(source, importe));
      else assert.ok(paquets.includes(importe), `${chemin} embarque « ${importe} »`);
    }
  }
  return vus;
}

/** Ce qui fabrique les planches ici, et qu'aucune page n'embarque. */
const FABRIQUE_DES_PLANCHES = [
  'planche/polices.ts',
  'planche/etape1.ts',
  'planche/etape2.ts',
  'planche/etape2/gabarit.ts',
  'planche/scenes.ts',
  'planche/script.ts',
];

test('le script que la page embarque ne lit que ce qu’un navigateur a : ni disque dur ni paquet de Node, dans rien de ce qu’il importe', () => {
  const vus = modulesEmbarques('planche/etape2/page.ts', ['opentype.js']);
  assert.ok(vus.size >= 80, `${vus.size} modules embarqués`);
  // Il a la scène, le mouvement et l'écran ; il n'a pas ce qui fabrique les planches ici.
  for (const attendu of ['ecran/montage.ts', 'ecran/piste.ts', 'mouvement/moteur.ts', 'scene/piste/gestes/index.ts', 'ressources/textes.fr.ts'])
    assert.ok(vus.has(attendu), attendu);
  for (const exclu of FABRIQUE_DES_PLANCHES) assert.ok(!vus.has(exclu), `${exclu} est embarqué dans la page`);
});

test('le prototype embarque le vrai client et le serveur simulé, l’un à côté de l’autre : rien d’autre ne les relie que les messages', () => {
  const vus = modulesEmbarques('planche/prototype/page.ts', ['opentype.js', 'qrcode-generator']);
  for (const attendu of [
    'ecran/telephone/client.ts',
    'ecran/piste.ts',
    'serveur/serveur.ts',
    'serveur/room.ts',
    'regles/messages.ts',
    'planche/prototype/potes.ts',
  ])
    assert.ok(vus.has(attendu), attendu);
  for (const exclu of FABRIQUE_DES_PLANCHES) assert.ok(!vus.has(exclu), `${exclu} est embarqué dans le prototype`);
  // Le client ne connaît du serveur que la forme des messages : ni lui, ni rien de ce qu'il importe, ne lit la couche du serveur.
  const duClient = modulesEmbarques('ecran/telephone/client.ts', ['opentype.js', 'qrcode-generator']);
  assert.ok(![...duClient].some((chemin) => chemin.startsWith('serveur/') || chemin.startsWith('planche/')), 'le client lit le serveur');
});

test('aucune couleur n’est écrite hors de la palette : ni en chiffres, ni par son nom là où une page ou une toile en attend une', () => {
  const NOMMEE = 'black|white|red|green|blue|yellow|orange|purple|pink|brown|gr[ae]y|silver|gold|cyan|magenta';
  const DANS_UN_STYLE = new RegExp(
    `\\b(?:color|background(?:-color)?|fill|stroke|outline(?:-color)?|border(?:-[a-z]+)*)\\s*:[^;}'"\`]*\\b(?:${NOMMEE})\\b`,
    'i',
  );
  const SUR_UNE_TOILE = new RegExp(`\\b(?:fillStyle|strokeStyle|color|background)\\s*=\\s*['"\`](?:${NOMMEE})\\b`, 'i');
  // Les règles savent refuser : une couleur nommée dans un style, sur une toile ; pas le nom d'un caractère, ni une variable de style.
  assert.match('a{background:black}', DANS_UN_STYLE);
  assert.match('border-left:2px solid red;', DANS_UN_STYLE);
  assert.match("contexte.fillStyle = 'white';", SUR_UNE_TOILE);
  assert.doesNotMatch("--titrage:'Caprasimo','Cooper Black',Georgia,serif;color:var(--creme)", DANS_UN_STYLE);
  for (const source of SOURCES) {
    if (source.chemin === 'ressources/palette.ts') continue;
    assert.doesNotMatch(source.code, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|\brgba?\(|\bhsla?\(/, source.chemin);
    assert.doesNotMatch(source.code, DANS_UN_STYLE, source.chemin);
    assert.doesNotMatch(source.code, SUR_UNE_TOILE, source.chemin);
  }
});

test('l’écrasement de la projection n’est écrit qu’une fois, dans les ressources, et seuls la projection et l’écriture des transformations le lisent', () => {
  for (const source of SOURCES) {
    if (source.chemin === 'ressources/projection.ts') continue;
    // La table des mouvements compte en secondes : 0,12 s y est une durée, pas la part écrasée de la profondeur.
    const interdit = source.chemin === 'ressources/mouvement.ts' ? /\b0\.88\b/ : /\b0\.88\b|\b0\.12\b/;
    assert.doesNotMatch(source.code, interdit, source.chemin);
  }
  const lecteursDe = (nom: string): string[] =>
    SOURCES.filter((s) => new RegExp(`\\b${nom}\\b`).test(s.code))
      .map((s) => s.chemin)
      .sort();
  assert.deepEqual(lecteursDe('PROJECTION'), ['lowpoly/projection.ts', 'ressources/projection.ts']);
  assert.deepEqual(lecteursDe('ECRASEMENT'), ['lowpoly/projection.ts', 'scene/rendu/transformation.ts']);
});

test('les ressources sont des données, jamais du code : aucune fonction, aucune classe', () => {
  const ressources = SOURCES.filter((s) => s.couche === 'ressources');
  assert.ok(ressources.length >= 20, `${ressources.length} fichiers de ressources`);
  for (const source of ressources) assert.doesNotMatch(source.code, /=>|\bfunction\b|\bclass\b/, source.chemin);
});

test('là où une durée pourrait se glisser, aucune n’est écrite en chiffres : un geste part à son signal ou après un temps lu dans la table, une minuterie n’attend que zéro ou un temps nommé, et dans le moteur, la chorégraphie, l’écran, l’horloge des planches et l’atelier un nombre à virgule est une constante qui dit ce qu’elle est', () => {
  const gestes = SOURCES.filter((s) => s.chemin.startsWith('scene/piste/'));
  // Un geste ou un coup est daté depuis un signal : de zéro s'il part avec lui, sinon d'un temps lu dans la table, jamais d'un nombre écrit là.
  let dates = 0;
  for (const source of gestes)
    for (const [, apres = ''] of source.code.matchAll(/\b(?:au|coupAu)\(\s*'\w+',\s*([^,]+),/g)) {
      dates++;
      assert.ok(apres.trim() === '0' || !/(^|[^\w.])\d/.test(apres), `${source.chemin} : un geste part « ${apres.trim()} » après son signal`);
    }
  assert.ok(dates >= 30, `${dates} gestes datés`);
  // Une minuterie, où qu'elle soit : elle rend la main tout de suite, ou attend un temps qui a un nom.
  let minuteries = 0;
  for (const source of SOURCES) {
    const posees = source.code.match(/\bset(?:Timeout|Interval)\(/g)?.length ?? 0;
    const lues = [...source.code.matchAll(/\bset(?:Timeout|Interval)\([^()]*,\s*([^(),]+)\)/g)];
    assert.equal(lues.length, posees, `${source.chemin} : une minuterie dont on ne lit pas le temps`);
    for (const [, temps = ''] of lues)
      assert.ok(temps.trim() === '0' || !/\d/.test(temps), `${source.chemin} : une minuterie attend « ${temps.trim()} »`);
    minuteries += posees;
  }
  assert.ok(minuteries >= 1, `${minuteries} minuterie(s)`);
  // Et dans le moteur de mouvement, dans ce qui écrit les gestes, dans l'écran qui les montre, dans l'horloge des planches et dans
  // l'atelier qui les rejoue, aucun nombre à virgule ne traîne dans une expression : une durée, un seuil ou une marge y est
  // une constante de module, qui dit ce qu'elle est. Les tables de l'atelier font exception : elles ne sont faites que de cela.
  // Ce que cette règle ne voit pas : une durée écrite en nombre entier (1000), ou en fraction (300 / 1000).
  const TABLES_DE_L_ATELIER = ['planche/etape2/minutage.ts', 'planche/etape2/banc.ts', 'planche/etape2/gabarit/style.ts'];
  for (const table of TABLES_DE_L_ATELIER)
    assert.ok(
      SOURCES.some((s) => s.chemin === table),
      `${table} n’existe plus`,
    );
  const NOMBRE_A_VIRGULE = /(?<![\w.])(\d+\.\d+|\d+e-?\d+)/;
  const CONSTANTE_NOMMEE = /^(export )?const [A-Z][A-Z0-9_]*\b[^=]*= /;
  const surveillees = SOURCES.filter(
    (s) =>
      (s.couche === 'mouvement' ||
        s.chemin.startsWith('scene/piste/') ||
        s.chemin.startsWith('scene/gestes/') ||
        s.couche === 'ecran' ||
        s.chemin === 'planche/horloge.ts' ||
        s.chemin.startsWith('planche/etape2/')) &&
      !TABLES_DE_L_ATELIER.includes(s.chemin),
  );
  assert.ok(surveillees.length >= 63, `${surveillees.length} modules`);
  for (const source of surveillees)
    for (const ligne of source.code.split('\n'))
      if (NOMBRE_A_VIRGULE.test(ligne)) assert.match(ligne, CONSTANTE_NOMMEE, `${source.chemin} : ${ligne.trim()}`);
  // Le minutage de l'atelier, lui, n'est que des données, comme une ressource du site.
  const minutage = SOURCES.find((s) => s.chemin === 'planche/etape2/minutage.ts');
  assert.ok(minutage !== undefined);
  assert.doesNotMatch(minutage.code, /=>|\bfunction\b|\bclass\b|\bimport\b/);
});

test('rien ne tire au sort, et l’heure ne se lit qu’à un endroit : le même état, au même instant, redonne le même meuble', () => {
  const lecteursDeLHeure = SOURCES.filter((s) => /Date\.now|new Date|performance\.now/.test(s.code)).map((s) => s.chemin);
  // Une horloge pour les téléphones, une pour le serveur.
  assert.deepEqual(lecteursDeLHeure, ['ecran/horloge.ts', 'reseau/horloge.ts']);
  for (const source of SOURCES) assert.doesNotMatch(source.code, /Math\.random/, source.chemin);
});

test('ce qui tournera dans un navigateur se passe de ce que ceux d’il y a cinq ans n’avaient pas', () => {
  // Des méthodes arrivées depuis, qu'aucun assemblage ne remplace : un téléphone qui ne les a pas s'arrêterait net.
  // Cette liste n'est qu'un premier filet, sur toutes les sources ; pour le script de la page, c'est le compilateur qui juge.
  for (const source of SOURCES) {
    assert.doesNotMatch(
      source.code,
      /\.at\(|\.replaceAll\(|\.findLast(Index)?\(|\.replaceChildren\(|structuredClone|Object\.hasOwn|\.toSorted\(|\.toReversed\(/,
      source.chemin,
    );
  }
  // Le script de la page et tout ce qu'il importe passent la vérification des types contre la bibliothèque du langage
  // d'il y a cinq ans, sans rien de Node : `npm test` la lance avant les tests, avec la configuration que voici.
  const RACINE = join(SRC, '..');
  const lireJson = (nom: string): unknown => JSON.parse(readFileSync(join(RACINE, nom), 'utf8'));
  assert.deepEqual(lireJson('tsconfig.page.json'), {
    extends: './tsconfig.json',
    compilerOptions: { target: 'ES2019', lib: ['ES2019', 'DOM', 'DOM.Iterable'], types: [] },
    include: [
      'src/planche/etape2/page.ts',
      'src/planche/etape7/page.ts',
      'src/planche/prototype/page.ts',
      'src/ecran/jeu/page.ts',
      'src/ecran/statistiques/page.ts',
    ],
  });
  const paquet = lireJson('package.json');
  assert.ok(typeof paquet === 'object' && paquet !== null && 'scripts' in paquet);
  const { scripts } = paquet;
  assert.ok(typeof scripts === 'object' && scripts !== null && 'test' in scripts && 'types' in scripts);
  assert.equal(scripts.types, 'tsc --noEmit && tsc --noEmit -p tsconfig.page.json');
  assert.match(String(scripts.test), /^npm run types && /);
});

test('le typage reste strict : ni « any », ni vérification coupée', () => {
  for (const source of SOURCES) {
    assert.doesNotMatch(source.code, /:\s*any\b|\bas any\b|<any>/, source.chemin);
    assert.doesNotMatch(source.texte, /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable/, source.chemin);
  }
});

test('la langue n’est nommée que dans son fichier de textes, et la scène ne lit que la forme des textes', () => {
  for (const source of SOURCES) {
    const estUnFichierDeLangue = /\.fr\.ts$/.test(source.chemin);
    if (!estUnFichierDeLangue) assert.doesNotMatch(source.code, /['"`]fr(-FR)?['"`]/, source.chemin);
    if (source.couche !== 'planche') {
      assert.ok(!imports(source).some((c) => /\.fr$/.test(c)), `${source.chemin} lit les textes d'une langue au lieu de les recevoir`);
    }
  }
});

test('chaque module dit son rôle avant sa première ligne exportée', () => {
  for (const source of SOURCES) {
    // Un script, qui n'exporte rien, le dit en tête.
    const premierExport = source.texte.search(/^export /m);
    const avant = premierExport < 0 ? source.texte.slice(0, source.texte.search(/^import /m)) : source.texte.slice(0, premierExport);
    assert.match(avant, /\/\*\*[\s\S]*?\*\//, `${source.chemin} n'a pas de phrase qui dise à quoi il sert`);
  }
});

test('aucun fichier fourre-tout : pas de module « utils », « helpers », « divers » ou « commun »', () => {
  for (const source of SOURCES) assert.doesNotMatch(source.chemin, /(^|\/)(utils?|helpers?|divers|commun|misc|outils)(\.ts$|\/)/i, source.chemin);
});
