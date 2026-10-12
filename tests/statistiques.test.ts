/**
 * Les statistiques du site : ce que le serveur compte (jamais qui), comment il reconnaît un visiteur le temps d'un jour sans rien
 * garder de lui, ce qu'il garde dans son fichier et le relit, et ce que la page reçoit ; ce que racontent les rooms d'une partie,
 * de son ouverture à sa fermeture ; et la page, qui ne s'ouvre qu'avec sa clé.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import { lireUneAction, type Nouvelle } from '../src/regles/messages';
import type { PisteDuMode } from '../src/regles/modes';
import { joursDu } from '../src/reseau/horloge';
import { lancerLeSite } from '../src/reseau/index';
import { ouvrirLesStatistiques, type OptionsDesStatistiques } from '../src/reseau/statistiques';
import { TEXTES } from '../src/ressources/textes.fr';
import type { FaitDuJeu } from '../src/serveur/faits';
import { lOrdreDeLaPlaylist } from '../src/serveur/ordre';
import { demarrerLeServeur } from '../src/serveur/serveur';

const POCHETTE = pochetteDExemple(TEXTES);
const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1';
const ORDINATEUR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

/** Des statistiques à une horloge qu'on avance à la main : le jour est celui de l'heure, à raison d'un jour par 86 400 secondes. */
function desStatistiques(lu?: string) {
  let monde = 0;
  let gardees: string | undefined;
  let sels = 0;
  const jour = (t: number): string => `2026-10-${String(12 + Math.floor(t / 86400)).padStart(2, '0')}`;
  const o: OptionsDesStatistiques = {
    lu,
    garder: (texte) => {
      gardees = texte;
    },
    monde: () => monde,
    local: (t) => ({ jour: jour(t), heure: Math.floor((t % 86400) / 3600), minute: 0, semaine: 1 }),
    joursDu,
    sel: () => `sel-${++sels}`,
  };
  return {
    s: ouvrirLesStatistiques(o),
    avancer: (secondes: number) => {
      monde += secondes;
    },
    gardees: () => gardees,
  };
}

const enDirect = { rooms: [], telephones: 0, depuis: 0 } as const;

test('un visiteur compte une fois par jour, quel que soit le nombre de pages qu’il ouvre ; un robot, jamais ; et l’on ne garde rien de lui', () => {
  const { s, avancer, gardees } = desStatistiques();
  s.page('1.2.3.4', IPHONE, false);
  s.page('1.2.3.4', IPHONE, true);
  s.page('5.6.7.8', ORDINATEUR, false);
  s.page('9.9.9.9', 'Googlebot/2.1 (+http://www.google.com/bot.html)', false);
  let v = s.vue(enDirect);
  assert.deepEqual(
    [
      v.totaux['pages'],
      v.totaux['pages.room'],
      v.totaux['visiteurs'],
      v.totaux['robots'],
      v.totaux['appareil.iphone'],
      v.totaux['navigateur.chrome'],
    ],
    [3, 1, 2, 1, 1, 1],
  );
  // Le lendemain, le même revient : c'est un visiteur de ce jour-là.
  avancer(86400);
  s.page('1.2.3.4', IPHONE, false);
  v = s.vue(enDirect);
  assert.equal(v.totaux['visiteurs'], 3);
  assert.deepEqual(
    v.jours.map((j) => [j.jour, j.compteurs['visiteurs']]),
    [
      ['2026-10-12', 2],
      ['2026-10-13', 1],
    ],
  );
  s.garder();
  const fichier = gardees() ?? '';
  for (const rien of ['1.2.3.4', '5.6.7.8', 'iPhone OS', 'sel-']) assert.ok(!fichier.includes(rien), `le fichier garde « ${rien} »`);
});

test('ce que racontent les rooms se compte : modes, réglages, parties, réponses, titres, playlists et records ; et tout se relit du fichier', () => {
  const { s, gardees } = desStatistiques();
  const room = { room: 'AENV', mode: 'quatreChoix', playlist: 'deezer:123' } as const;
  const faits: FaitDuJeu[] = [
    { ...room, genre: 'ouverte', pistes: 10, extrait: 20, son: 'tous' },
    { ...room, genre: 'arrivee', joueurs: 1, spectateur: false },
    { ...room, genre: 'arrivee', joueurs: 2, spectateur: false },
    { ...room, genre: 'lancer', numero: 1, face: 'A' },
    { ...room, genre: 'extrait' },
    { ...room, genre: 'reponse', verdict: 'juste', trouve: ['artiste', 'titre'], points: 2, complet: true, delai: 4.5, premiere: true },
    { ...room, genre: 'reponse', verdict: 'faux', trouve: [], points: 0, complet: false, delai: 7, premiere: false },
    { ...room, genre: 'revelation', titre: 'Ouragan', artiste: 'Stéphanie', trouvee: true, trouveurs: 1, joueurs: 2 },
    { ...room, genre: 'faceFinie', face: 'A', joueurs: 2, duree: 600, meilleur: 12 },
    { genre: 'refus', raison: 'codeInconnu' },
    { ...room, genre: 'fermee', duree: 900, pistes: 10, joueursAuPlus: 2, lancee: true },
  ];
  for (const f of faits) s.jeu(f);
  s.playlistsNommees([{ lien: 'deezer:123', titre: 'Années 80' }]);
  s.recherche('  Années   90 ', undefined, 4);
  s.recherche('Rock', 'rock', 0);
  s.telephone('lienPartage');
  const v = s.vue(enDirect);
  const t = v.totaux;
  assert.deepEqual(
    [
      t['rooms.mode.quatreChoix'],
      t['rooms.pistes.10'],
      t['parties'],
      t['faces.mode.quatreChoix'],
      t['reponses.juste'],
      t['trouve.titre'],
      t['delai.3-6'],
    ],
    [1, 1, 1, 1, 1, 1, 1],
  );
  assert.deepEqual([t['refus.codeInconnu'], t['bac.theme.rock'], t['bac.recherches.vides'], t['telephone.lienPartage']], [1, 1, 1, 1]);
  assert.deepEqual(v.titres.joues, [{ titre: 'Ouragan', artiste: 'Stéphanie', joues: 1, trouves: 1 }]);
  assert.deepEqual(v.playlists, [{ lien: 'deezer:123', titre: 'Années 80', choisies: 1, faces: 1 }]);
  assert.deepEqual(v.recherches, [{ recherche: 'années 90', fois: 1 }]);
  assert.deepEqual([v.records['joueursDansUneRoom']?.valeur, v.records['plusLongueFace']?.valeur, v.records['meilleurScore']?.valeur], [2, 600, 12]);
  // Gardées, puis relues : les mêmes.
  s.garder();
  const relues = desStatistiques(gardees()).s.vue(enDirect);
  assert.deepEqual(relues.totaux, v.totaux);
  assert.deepEqual(relues.records, v.records);
  assert.deepEqual(relues.playlists, v.playlists);
});

test('les rooms racontent une partie de bout en bout, de leur ouverture à leur fermeture', () => {
  let heure = 0;
  const faits: FaitDuJeu[] = [];
  const PISTES: PisteDuMode[] = [{ reponse: { titre: 'Ouragan', artiste: 'Stéphanie', pochette: vignette } }];
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(5).suivant,
    ordre: lOrdreDeLaPlaylist,
    jeton: () => 'jeton',
    playlist: (lien) => (lien === 'bac' ? PISTES : undefined),
    raconter: (f) => faits.push(f),
  });
  const recus: Nouvelle[] = [];
  const hote = serveur.connecter((n) => recus.push(n));
  const invite = serveur.connecter(() => undefined);
  hote.envoyer({ genre: 'creer', mode: 'libre', pistes: 1, extrait: 10, son: 'tous', playlist: 'bac', pochette: POCHETTE });
  const code = (recus.find((n) => n.genre === 'etat') as Extract<Nouvelle, { genre: 'etat' }> | undefined)?.code ?? '';
  invite.envoyer({ genre: 'rejoindre', code, pochette: POCHETTE });
  serveur.connecter(() => undefined).envoyer({ genre: 'rejoindre', code: 'ZZZZ', pochette: POCHETTE });
  hote.envoyer({ genre: 'lancer' });
  hote.envoyer({ genre: 'pret' });
  invite.envoyer({ genre: 'pret' });
  heure = 6;
  serveur.avancer();
  invite.envoyer({ genre: 'repondre', proposition: { genre: 'saisie', texte: 'stéphanie' } });
  heure = 60;
  serveur.avancer();
  hote.couper();
  invite.couper();
  heure = 100000;
  serveur.avancer();
  assert.deepEqual(
    faits.map((f) => f.genre),
    ['ouverte', 'arrivee', 'arrivee', 'refus', 'lancer', 'extrait', 'reponse', 'revelation', 'faceFinie', 'deconnexion', 'deconnexion', 'fermee'],
  );
  const reponse = faits.find((f) => f.genre === 'reponse');
  assert.ok(
    reponse?.genre === 'reponse' && reponse.premiere && reponse.trouve.includes('artiste') && reponse.mode === 'libre' && reponse.playlist === 'bac',
  );
  const fermee = faits.find((f) => f.genre === 'fermee');
  assert.ok(fermee?.genre === 'fermee' && fermee.lancee && fermee.pistes === 1 && fermee.joueursAuPlus === 2);
});

test('un téléphone ne dit aux statistiques qu’un mot de sa liste', () => {
  assert.deepEqual(lireUneAction({ genre: 'statistique', quoi: 'lienPartage' }), { genre: 'statistique', quoi: 'lienPartage' });
  assert.equal(lireUneAction({ genre: 'statistique', quoi: 'nimportequoi' }), undefined);
  assert.equal(lireUneAction({ genre: 'statistique' }), undefined);
});

test('la page des statistiques se sert à son adresse ; ce qu’elle montre ne s’ouvre qu’avec sa clé ; elles s’écrivent quand le site s’arrête', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'miel-'));
  const page = join(dossier, 'index.html');
  writeFileSync(page, '<title>Le jeu</title><script>console.log("jeu")</script>');
  writeFileSync(join(dossier, 'statistiques.html'), '<title>Stats</title><script>console.log("stats")</script>');
  const fichier = join(dossier, 'statistiques.json');
  const cle = 'essaiessaiessaiessai';
  const site = lancerLeSite({ port: 0, hote: '127.0.0.1', origines: [], page, deezer: undefined, statistiques: { fichier, cle } });
  try {
    const base = `http://127.0.0.1:${await site.pret}`;
    const html = await fetch(`${base}/statistiques`);
    assert.equal(html.status, 200);
    assert.match(html.headers.get('content-security-policy') ?? '', /script-src 'sha256-/);
    assert.equal(html.headers.get('x-robots-tag'), 'noindex, nofollow');
    await fetch(`${base}/`, { headers: { 'user-agent': IPHONE } });
    assert.equal((await fetch(`${base}/statistiques.json`)).status, 401);
    assert.equal((await fetch(`${base}/statistiques.json`, { headers: { authorization: 'Bearer pasLaBonneCleDuTout' } })).status, 401);
    const ouverte = await fetch(`${base}/statistiques.json`, { headers: { authorization: `Bearer ${cle}` } });
    assert.equal(ouverte.status, 200);
    const vue = (await ouverte.json()) as { totaux: Record<string, number> };
    assert.equal(vue.totaux['visiteurs'], 1);
  } finally {
    await site.fermer();
  }
  const garde = JSON.parse(readFileSync(fichier, 'utf8')) as { totaux: Record<string, number> };
  assert.equal(garde.totaux['pages'], 1);
});

test('qui demande à ne pas être suivi (GPC, DNT) compte une page, jamais un visiteur ; une recherche qui ne trouve rien ne se garde pas', async () => {
  const { s } = desStatistiques();
  s.page('1.2.3.4', IPHONE, false, true);
  s.recherche('mon voisin Jean Dupont', undefined, 0);
  const v = s.vue(enDirect);
  assert.deepEqual(
    [v.totaux['pages'], v.totaux['pages.sansSuivi'], v.totaux['visiteurs'], v.totaux['appareil.iphone']],
    [1, 1, undefined, undefined],
  );
  assert.deepEqual([v.totaux['bac.recherches.vides'], v.recherches], [1, []]);
  // Par la porte : l'en-tête du navigateur suffit.
  const dossier = mkdtempSync(join(tmpdir(), 'miel-'));
  const page = join(dossier, 'index.html');
  writeFileSync(page, '<title>Le jeu</title>');
  writeFileSync(join(dossier, 'statistiques.html'), '<title>Stats</title>');
  const fichier = join(dossier, 'statistiques.json');
  const site = lancerLeSite({
    port: 0,
    hote: '127.0.0.1',
    origines: [],
    page,
    deezer: undefined,
    statistiques: { fichier, cle: 'essaiessaiessaiessai' },
  });
  try {
    const base = `http://127.0.0.1:${await site.pret}`;
    await fetch(`${base}/`, { headers: { 'user-agent': IPHONE, 'sec-gpc': '1' } });
    await fetch(`${base}/`, { headers: { 'user-agent': ORDINATEUR, dnt: '1' } });
    const vue = (await (await fetch(`${base}/statistiques.json`, { headers: { authorization: 'Bearer essaiessaiessaiessai' } })).json()) as {
      totaux: Record<string, number>;
    };
    assert.deepEqual([vue.totaux['pages'], vue.totaux['pages.sansSuivi'], vue.totaux['visiteurs']], [2, 2, undefined]);
  } finally {
    await site.fermer();
  }
});
