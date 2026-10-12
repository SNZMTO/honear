import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { compter, LEGENDES } from '../src/planche/legendes.fr';
import { ecrire, ecrireFixe } from '../src/planche/nombres.fr';
import { KRAFT } from '../src/ressources/kraft';
import { REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { APPROCHES, CARACTERES, CORPS, CORPS_LISIBLE, ECHELONS, ROLES_DE_TEXTE, type RoleDeTexte } from '../src/ressources/typo';
import { calque, type Mesure, type Texte } from '../src/scene/calque';
import { remplir } from '../src/scene/phrases';
import { nombre } from '../src/scene/rendu/nombre';
import { enSvg } from '../src/scene/rendu/svg';
import { faireTenir, mettreEnLignes, placeSurUnArc, seLit } from '../src/scene/texte';
import { espacer, INSECABLE } from '../src/scene/typographie';
import { ENCRIER } from './planche';

const ROLES: readonly RoleDeTexte[] = ['titrage', 'technique', 'techniqueFort'];
const CHIFFRES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Une mesure de banc d'essai : chaque signe est large d'un demi-corps. */
const demiCorpsParSigne: Mesure = ({ contenu, corps }) => ([...contenu].length * corps) / 2;
const ecrit = (contenu: string, role: RoleDeTexte, corps: number): Texte => ({
  genre: 'texte',
  contenu,
  role,
  corps,
  en: [0, 0],
  ancrage: 'debut',
  teinte: 'expresso',
  ton: 2,
  fond: { teinte: 'creme' },
});

test('l’échelle typographique a huit échelons, chacun 1,2 fois le précédent, arrondis au demi-pixel', () => {
  const corps = [...ECHELONS].reverse().map((echelon) => CORPS[echelon]);
  assert.equal(corps.length, 8);
  assert.equal(new Set(ECHELONS).size, Object.keys(CORPS).length, 'chaque échelon est dans l’ordre de descente, une fois');
  assert.deepEqual(
    corps,
    corps.map((_, rang) => Math.round(CORPS.gravure * 1.2 ** rang * 2) / 2),
  );
});

test('un texte prend le plus grand échelon qui tient, en descendant l’échelle, et jamais un corps entre deux échelons', () => {
  const dix = { contenu: 'dix signes', role: 'titrage' } as const;
  assert.deepEqual(faireTenir(demiCorpsParSigne, dix, 1000, 'affiche'), { contenu: 'dix signes', corps: CORPS.affiche });
  // 10 signes d'un demi-corps : il faut 5 corps de large. Dans 125 px, c'est le titre (24) qui passe, pas le grand titre (28,5).
  assert.deepEqual(faireTenir(demiCorpsParSigne, dix, 125, 'affiche'), { contenu: 'dix signes', corps: CORPS.titre });
  assert.equal(faireTenir(demiCorpsParSigne, dix, 1000, 'texte').corps, CORPS.texte, 'il ne monte jamais au-dessus de l’échelon demandé');
  // Sur un objet deux fois plus grand, toute l'échelle est deux fois plus grande.
  assert.equal(faireTenir(demiCorpsParSigne, dix, 125, 'affiche', 2).corps, CORPS.gravure * 2);
});

test('un texte qui ne tient à aucun échelon est abrégé et fini par une ellipse, au plus petit corps : il ne déborde jamais', () => {
  const titre = { contenu: 'Live à la salle des fêtes de Trifouilly', role: 'technique' } as const;
  // Au plus petit corps (11,5), un signe fait 5,75 px : 60 px en logent dix, ellipse comprise.
  const abrege = faireTenir(demiCorpsParSigne, titre, 60, 'titre');
  assert.equal(abrege.corps, CORPS.gravure);
  assert.equal(abrege.contenu, 'Live à la…', 'l’espace qui précéderait l’ellipse est retirée');
  assert.ok(demiCorpsParSigne({ ...titre, ...abrege }) <= 60);
  // Même sans place du tout, il reste l'ellipse : jamais une chaîne vide, jamais une erreur.
  assert.deepEqual(faireTenir(demiCorpsParSigne, titre, 0, 'titre'), { contenu: '…', corps: CORPS.gravure });
  // Un pseudo fait d'émojis ou de lettres accentuées se coupe entre deux signes, pas au milieu d'un.
  assert.equal(faireTenir(demiCorpsParSigne, { contenu: '🎸🎸🎸🎸🎸🎸', role: 'titrage' }, 18, 'gravure').contenu, '🎸🎸…');
});

test('un texte se met en lignes aux espaces qui se coupent, jamais au milieu d’un mot ni à une espace insécable, au corps que demande son mot le plus long', () => {
  const phrase = { contenu: 'Disque mystère du soir', role: 'titrage' } as const;
  const corps = CORPS.intertitre;
  // À un demi-corps par signe : « mystère », sept signes, demande 70 px à ce corps.
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, phrase, 1000, 'intertitre'), { lignes: ['Disque mystère du soir'], corps });
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, phrase, 150, 'intertitre'), { lignes: ['Disque mystère', 'du soir'], corps });
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, phrase, 75, 'intertitre'), { lignes: ['Disque', 'mystère', 'du soir'], corps });
  // Si un mot ne tient pas seul, tout le texte descend l'échelle, et les lignes se refont à ce corps.
  const serre = mettreEnLignes(demiCorpsParSigne, phrase, 65, 'intertitre');
  assert.deepEqual(serre, { lignes: ['Disque', 'mystère', 'du soir'], corps: CORPS.texte });
  for (const ligne of serre.lignes) assert.ok(demiCorpsParSigne({ contenu: ligne, role: 'titrage', corps: serre.corps }) <= 65, ligne);
  // Et s'il ne tient à aucun échelon, ce mot-là est abrégé : rien ne déborde, rien n'est perdu d'autre.
  const etroit = mettreEnLignes(demiCorpsParSigne, phrase, 30, 'intertitre');
  assert.equal(etroit.corps, CORPS.gravure);
  assert.deepEqual(etroit.lignes, ['Disq…', 'myst…', 'du', 'soir']);
  // Une espace insécable ne se coupe pas : un signe double reste avec son mot, là où une espace ordinaire l'aurait laissé seul.
  const question = (espace: string) => ({ contenu: `Où es-tu${espace}?`, role: 'titrage' }) as const;
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, question(' '), 80, 'intertitre').lignes, ['Où es-tu', '?']);
  for (const insecable of [INSECABLE, '\u202F', '\u2007'])
    assert.deepEqual(mettreEnLignes(demiCorpsParSigne, question(insecable), 80, 'intertitre').lignes, ['Où', `es-tu${insecable}?`]);
  // Des espaces en trop ne font pas de ligne vide ; un texte vide n'a pas de ligne.
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, { contenu: '  Face   A ', role: 'technique' }, 1000, 'gravure').lignes, ['Face A']);
  assert.deepEqual(mettreEnLignes(demiCorpsParSigne, { contenu: '', role: 'technique' }, 100, 'gravure').lignes, []);
});

test('le tampon de la pochette kraft tient sur deux lignes au corps de l’intertitre, sans rien abréger', () => {
  const tampon = mettreEnLignes(ENCRIER.largeur, { contenu: TEXTES.piste.mystere, role: 'titrage' }, KRAFT.tampon.place, 'intertitre');
  assert.deepEqual(tampon, { lignes: ['Disque', 'mystère'], corps: CORPS.intertitre });
});

test('la place sur un arc se mesure sur la ligne de base, là où les lettres sont posées', () => {
  assert.ok(Math.abs(placeSurUnArc(100, 180) - Math.PI * 100) < 1e-9);
  assert.ok(Math.abs(placeSurUnArc(50, 90) - (Math.PI * 50) / 2) < 1e-9);
  // Le nom du logo y tient entier, mesuré avec ses vraies lettres.
  const nom = { contenu: TEXTES.logo.nom, role: 'titrage' } as const;
  assert.equal(faireTenir(ENCRIER.largeur, nom, placeSurUnArc(100, 170), 'affiche').contenu, TEXTES.logo.nom);
});

test('un texte couché sur le meuble est écrasé comme le reste : c’est sa hauteur vue qui dit s’il se lit', () => {
  assert.ok(seLit(CORPS.gravure, false) && seLit(CORPS.gravure, true), 'le plus petit échelon se lit, même couché');
  assert.ok(seLit(CORPS_LISIBLE, false) && !seLit(CORPS_LISIBLE, true), 'un corps lisible debout ne l’est plus forcément couché');
  assert.ok(!seLit(CORPS.gravure * 0.8, false));
});

test('les chiffres du caractère technique sont tabulaires : un score ne fait pas bouger sa colonne', () => {
  for (const role of ['technique', 'techniqueFort'] as const) {
    const largeur = (contenu: string): number => ENCRIER.largeur({ contenu, role, corps: 100 });
    const chasses = new Set(CHIFFRES.map((chiffre) => largeur(chiffre).toFixed(3)));
    assert.equal(chasses.size, 1, `${role} : ${[...chasses].join(', ')}`);
    // Aucun crénage entre deux chiffres : « 11 », « 47 » et « 70 » ont la même largeur.
    const deux = new Set(['11', '47', '70', '15', '20'].map((n) => largeur(n).toFixed(3)));
    assert.equal(deux.size, 1, `${role} : ${[...deux].join(', ')}`);
    assert.ok(Math.abs(largeur('11') - (2 * largeur('1') + APPROCHES[role] * 100)) < 1e-6);
  }
});

test('le caractère technique s’écrit en capitales espacées, accents compris ; le titrage reste tel qu’on l’a écrit', () => {
  const { largeur } = ENCRIER;
  assert.equal(largeur({ contenu: 'Hôte', role: 'technique', corps: 20 }), largeur({ contenu: 'HÔTE', role: 'technique', corps: 20 }));
  assert.notEqual(largeur({ contenu: 'Hôte', role: 'titrage', corps: 20 }), largeur({ contenu: 'HÔTE', role: 'titrage', corps: 20 }));
  assert.ok(APPROCHES.technique > 0 && APPROCHES.titrage === 0);
});

test('tout ce que le site et ses planches peuvent écrire a ses lettres dans les polices : textes, réglages, légendes, ellipse', () => {
  const feuilles = (valeur: unknown): string[] =>
    typeof valeur === 'string' ? [valeur] : typeof valeur === 'object' && valeur !== null ? Object.values(valeur).flatMap(feuilles) : [];
  const signesDe = (ecrits: readonly string[]): string[] => [...new Set(ecrits.flatMap((contenu) => [...contenu]))].filter((s) => s.trim() !== '');
  // Un texte du site peut être écrit dans l'un ou l'autre caractère, et abrégé par une ellipse. Ses règles de typographie, elles,
  // ne s'affichent pas : ce sont les signes devant lesquels une espace ne se coupe pas.
  const { typographie: _regles, ...affiches } = TEXTES;
  const duSite = [...feuilles(affiches), '…'];
  // Les réglages et les légendes de la planche ne s'écrivent qu'en caractère technique. Dans un modèle de légende,
  // ce qui est entre accolades sera remplacé par un nom ou par un nombre écrit à la française.
  const techniques = [
    ...duSite,
    ...Object.values(REGLAGES).flatMap((reglage) => reglage.choix.map(String)),
    ...feuilles(LEGENDES).map((modele) => modele.replace(/\{\w+\}/g, '1 234')),
  ];
  const signes: Readonly<Record<RoleDeTexte, string[]>> = {
    titrage: signesDe(duSite),
    technique: signesDe(techniques),
    techniqueFort: signesDe(techniques),
  };
  assert.ok(signes.titrage.length > 30 && signes.titrage.includes('’') && signes.titrage.includes('ô'), `${signes.titrage.length} signes de titrage`);
  assert.ok(
    signes.technique.length > 45 && signes.technique.includes('·') && signes.technique.includes('é'),
    `${signes.technique.length} signes techniques`,
  );
  const { tracer, largeur } = ENCRIER;
  for (const role of ROLES) {
    for (const signe of signes[role]) {
      assert.ok(largeur(ecrit(signe, role, 100)) > 5, `${role} : « ${signe} » n'a pas de largeur`);
      assert.ok(tracer(ecrit(signe, role, 100)).length > 20, `${role} : « ${signe} » n'a pas de contour`);
    }
  }
});

test('un signe que la police n’a pas arrête tout, avec son nom : jamais un rectangle vide imprimé sur une pochette', () => {
  for (const role of ROLES) {
    assert.throws(() => ENCRIER.largeur({ contenu: 'DJ 雪', role, corps: 20 }), /n'a pas le signe « 雪 » de « DJ 雪 »/, role);
    assert.throws(() => ENCRIER.tracer(ecrit('DJ 雪', role, 20)), /n'a pas le signe/, role);
  }
});

test('les polices sont auto-hébergées, deux familles et pas une de plus : le dossier polices/ a les fichiers que nomme la typo, et eux seuls', () => {
  const dossier = join(dirname(fileURLToPath(import.meta.url)), '..', 'polices');
  const caracteres = ROLES_DE_TEXTE.map((role) => CARACTERES[role]);
  assert.equal(new Set(caracteres.map((c) => c.famille)).size, 2, 'deux familles, pas plus');
  const nommes = caracteres.flatMap((c) => [c.trace, c.web]);
  for (const fichier of nommes) assert.ok(existsSync(join(dossier, fichier)), `${fichier} manque dans polices/`);
  const presents = readdirSync(dossier).filter((fichier) => !fichier.endsWith('.md'));
  assert.deepEqual(presents.sort(), [...new Set(nommes)].sort(), 'aucune police en trop dans le dossier');
});

test('un nombre s’écrit dans le SVG avec deux décimales au plus, et jamais « -0 »', () => {
  assert.equal(nombre(12.3456), '12.35');
  assert.equal(nombre(-0.001), '0');
  assert.equal(nombre(3), '3');
  assert.equal(nombre(-7.5), '-7.5');
});

test('un texte libre ne casse pas le SVG : un pseudo ou un titre d’album peut contenir « & », « < » ou un guillemet', () => {
  const svg = enSvg(calque('pochette-Tonton "R&B" <3', [], { role: 'image' }), {
    largeur: 10,
    hauteur: 10,
    prefixe: 'planche-',
    tracerLeTexte: () => '',
    titre: 'Rock & <Roll> des potes',
  });
  assert.ok(svg.includes('<title>Rock &amp; &lt;Roll&gt; des potes</title>'));
  assert.ok(svg.includes('data-calque="pochette-Tonton &quot;R&amp;B&quot; &lt;3"'), 'le nom du calque est écrit tel quel, rendu inoffensif');
  assert.ok(svg.includes('id="planche-pochette-Tonton-R-B-3"'), 'et son identifiant n’a que des lettres, des chiffres et des tirets');
});

test('une phrase à trous se remplit avec ses valeurs, et refuse un trou qu’on ne lui donne pas', () => {
  assert.equal(remplir('Piste {numero}', { numero: 3 }), 'Piste 3');
  assert.equal(remplir('{titre} · {polygones}', { titre: 'La platine', polygones: '2 868 polygones' }), 'La platine · 2 868 polygones');
  assert.equal(remplir('sur {total}, {total} en tout', { total: 15 }), 'sur 15, 15 en tout');
  assert.throws(() => remplir('{titre} · {polygones}', { titre: 'La platine' }), /polygones/);
});

test('dans un document de travail, un nombre s’écrit à la française : une virgule, ses milliers séparés par une espace qui ne se coupe pas', () => {
  assert.equal(ecrire(137), '137');
  assert.equal(ecrire(2868), '2\u00a0868');
  assert.equal(ecrire(1234567), '1\u00a0234\u00a0567');
  // Pas de zéros inutiles, et pas de signe à ce qui s'arrondit à zéro.
  assert.deepEqual(
    [ecrire(1.5, 1), ecrire(2, 1), ecrire(0.25, 2), ecrire(1234.56), ecrire(-0.04, 1), ecrire(-3.26, 1)],
    ['1,5', '2', '0,25', '1\u00a0235', '0', '−3,3'],
  );
  // Un compteur qui défile garde toutes ses décimales : sa largeur ne saute pas.
  assert.deepEqual([ecrireFixe(1, 1), ecrireFixe(0.94, 1), ecrireFixe(9.96, 1), ecrireFixe(1234, 2)], ['1,0', '0,9', '10,0', '1\u00a0234,00']);
});

test('la typographie d’une langue pose ses espaces qui ne se coupent pas : avant un signe double, dans des guillemets, entre un nombre et son unité', () => {
  const I = INSECABLE;
  assert.equal(I, '\u00a0');
  const fr = (texte: string): string => espacer(texte, TEXTES.typographie);
  assert.equal(fr('Au « 3 » : le disque glisse ; prêt ?'), `Au «${I}3${I}»${I}: le disque glisse${I}; prêt${I}?`);
  assert.equal(fr('Rayé ! 6 % de plus · ressort'), `Rayé${I}! 6${I}% de plus${I}· ressort`);
  // Un nombre et son unité : les plus longues d'abord, et une unité finit là où un mot finirait.
  assert.equal(
    fr('90 ms, 1,4 s, 7 px, 3,6 Mpx, 4 fois, 22 tours, 90 images, 9 toiles, 162 °/s², 272 px/s'),
    `90${I}ms, 1,4${I}s, 7${I}px, 3,6${I}Mpx, 4${I}fois, 22${I}tours, 90${I}images, 9${I}toiles, 162${I}°/s², 272${I}px/s`,
  );
  // Une barre entourée d'espaces sépare des nombres qui vont ensemble : on ne la coupe d'aucun côté. Collée, elle ne change rien.
  assert.equal(fr('ressort 845 / 26 / 0,2'), `ressort 845${I}/${I}26${I}/${I}0,2`);
  assert.equal(fr('et/ou, 33 tours 1/3'), `et/ou, 33${I}tours 1/3`);
  assert.equal(fr('3 secondes, 2 sons, 1 seul'), '3 secondes, 2 sons, 1 seul', 'un mot qui commence comme une unité n’en est pas une');
  assert.equal(fr('10 s sur 10'), `10${I}s sur 10`);
  // Ce qui est déjà bien espacé ne change pas ; une langue sans règles rend le texte tel quel.
  assert.equal(fr(fr('Au « 3 » : 90 ms')), fr('Au « 3 » : 90 ms'));
  assert.equal(espacer('Now : 90 ms « ok »', { insecableAvant: '', insecableApres: '', unites: [] }), 'Now : 90 ms « ok »');
  // Les règles du français nomment toutes les unités qu'écrivent ses documents de travail.
  assert.deepEqual([...TEXTES.typographie.unites].sort(), ['Mpx', 'fois', 'images', 'ms', 'px', 's', 'toiles', 'tours', '°/s²']);
});

test('un compte s’accorde : en français, le pluriel commence à deux', () => {
  assert.equal(compter(0, LEGENDES.polygones), '0 polygone');
  assert.equal(compter(1, LEGENDES.polygones), '1 polygone');
  assert.equal(compter(2, LEGENDES.polygones), '2 polygones');
  assert.equal(compter(1405, LEGENDES.polygones), '1\u00a0405 polygones', 'les milliers se séparent d’une espace qui ne se coupe pas');
  assert.equal(compter(1, LEGENDES.lettres), '1 lettre');
  assert.equal(compter(46, LEGENDES.lettres), '46 lettres');
});
