/**
 * Le site en ligne, pour de vrai : la porte HTTP et la ligne WebSocket ouvertes sur un port de la machine, des téléphones branchés
 * comme des navigateurs. On vérifie ce que la porte sert (et sous quelle politique), qu'une partie se crée et se rejoint par la ligne,
 * que l'heure s'y demande, qu'un téléphone qui revient avec son jeton retrouve sa place, et qu'on coupe qui ne respecte pas les règles.
 */

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { pochetteDExemple } from '../src/planche/exemples';
import type { Action, Nouvelle } from '../src/regles/messages';
import { lancerLeSite, type ConfigurationDuSite } from '../src/reseau/index';
import { CHEMIN_DE_LA_LIGNE } from '../src/reseau/ligne';
import { RESEAU } from '../src/ressources/reseau';
import { TEXTES } from '../src/ressources/textes.fr';
import { PLAYLIST_D_ESSAI } from '../src/serveur/sources/essai';
import { unFauxServeurDEnvoi } from './faux-courrier';

const POCHETTE = pochetteDExemple(TEXTES);
const PAGE = '<title>Miel</title><div data-telephone></div><script>console.log("le jeu")</script>';

function unSite(origines: readonly string[] = [], deezer?: string, comptes?: ConfigurationDuSite['comptes']) {
  const dossier = mkdtempSync(join(tmpdir(), 'miel-'));
  const page = join(dossier, 'index.html');
  writeFileSync(page, PAGE);
  // Le faux Deezer sert aussi les pages de Spotify.
  return lancerLeSite({
    port: 0,
    hote: '127.0.0.1',
    origines: [...origines],
    page,
    deezer,
    ...(deezer !== undefined ? { spotify: deezer } : {}),
    ...(comptes !== undefined ? { comptes } : {}),
  });
}

/** Une playlist Spotify d'essai : son identifiant, et sa page publique, qui nomme ses vingt chansons. */
const SPOTIFY = '1a2B3c4D5e6F7g8H9i0JkL';
const PAGE_SPOTIFY = `<html><body><script id="resource" type="text/plain">${Buffer.from(
  JSON.stringify({
    type: 'playlist',
    name: 'Ma playlist Spotify',
    uri: `spotify:playlist:${SPOTIFY}`,
    trackList: Array.from({ length: 20 }, (_, k) => ({ uri: `spotify:track:t${k}`, title: `Chanson ${k + 1}`, subtitle: `Groupe ${k + 1}` })),
  }),
).toString('base64')}</script></body></html>`;

/**
 * Un faux Deezer, sur un port de la machine : une recherche qui trouve une playlist de vingt titres, cette playlist, et chacun de
 * ses titres quand on le cherche par son artiste et son nom. Il sert aussi la page publique d'une playlist Spotify.
 */
async function unFauxDeezer() {
  const demandes: string[] = [];
  const piste = (n: number) => ({
    id: 900 + n,
    readable: true,
    title: `Chanson ${n}`,
    title_short: `Chanson ${n}`,
    preview: `https://cdnt-preview.dzcdn.net/api/1/1/0/0/0/0/${n}.mp3?hdnea=exp=9999999999~acl=*~hmac=0`,
    artist: { name: `Groupe ${n}` },
  });
  const serveur = createServer((requete, reponse) => {
    const url = new URL(requete.url ?? '/', 'http://deezer');
    demandes.push(url.pathname);
    if (url.pathname === `/embed/playlist/${SPOTIFY}`) {
      reponse.writeHead(200, { 'content-type': 'text/html' }).end(PAGE_SPOTIFY);
      return;
    }
    const cherche = /^artist:"Groupe (\d+)" track:"Chanson \1"$/.exec(url.searchParams.get('q') ?? '');
    const corps =
      url.pathname === '/search/track'
        ? { data: cherche !== null ? [piste(Number(cherche[1]))] : [] }
        : url.pathname === '/search/playlist'
          ? { data: [{ id: 4242, title: 'Soirée 2000', nb_tracks: 20 }] }
          : url.pathname === '/playlist/4242'
            ? { id: 4242, title: 'Soirée 2000', nb_tracks: 20 }
            : url.pathname === '/playlist/4242/tracks'
              ? { data: Array.from({ length: 20 }, (_, k) => piste(k + 1)), total: 20 }
              : { error: { type: 'DataException', message: 'no data', code: 800 } };
    reponse.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(corps));
  });
  const port = await new Promise<number>((ecoute) =>
    serveur.listen(0, '127.0.0.1', () => {
      const adresse = serveur.address();
      ecoute(typeof adresse === 'object' && adresse !== null ? adresse.port : 0);
    }),
  );
  return { adresse: `http://127.0.0.1:${port}`, demandes, fermer: () => new Promise<void>((fini) => serveur.close(() => fini())) };
}

/** Un téléphone branché à la ligne : ce qu'il a reçu, et de quoi prendre la prochaine nouvelle d'un genre, arrivée ou à venir. */
async function unTelephone(port: number, origine?: string) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${CHEMIN_DE_LA_LIGNE}`, origine !== undefined ? { origin: origine } : {});
  const boites = new Map<string, Nouvelle[]>();
  const attentes = new Map<string, ((n: Nouvelle) => void)[]>();
  socket.on('message', (donnees) => {
    const n = JSON.parse(String(donnees)) as Nouvelle;
    const qui = attentes.get(n.genre)?.shift();
    if (qui !== undefined) qui(n);
    else boites.set(n.genre, [...(boites.get(n.genre) ?? []), n]);
  });
  await new Promise<void>((ouvert, rate) => {
    socket.once('open', () => ouvert());
    socket.once('error', rate);
  });
  return {
    socket,
    envoyer: (action: Action | Record<string, unknown> | string) => socket.send(typeof action === 'string' ? action : JSON.stringify(action)),
    attendre: <G extends Nouvelle['genre']>(genre: G) =>
      new Promise<Extract<Nouvelle, { genre: G }>>((fini) => {
        const deja = boites.get(genre)?.shift();
        if (deja !== undefined) fini(deja as Extract<Nouvelle, { genre: G }>);
        else attentes.set(genre, [...(attentes.get(genre) ?? []), fini as (n: Nouvelle) => void]);
      }),
  };
}

test('la porte sert la page à l’adresse du site et à celle d’une room, sous une politique stricte ; rien ailleurs', async () => {
  const site = unSite();
  try {
    const base = `http://127.0.0.1:${await site.pret}`;
    for (const chemin of ['/', '/AENV', '/aenv']) {
      const r = await fetch(base + chemin);
      assert.equal(r.status, 200, chemin);
      assert.equal(await r.text(), PAGE);
      const politique = r.headers.get('content-security-policy') ?? '';
      assert.match(politique, /script-src 'sha256-[A-Za-z0-9+/=]+'/);
      assert.doesNotMatch(politique, /script-src[^;]*unsafe-inline/);
      assert.match(politique, /connect-src 'self'/);
      assert.match(politique, /media-src https:\/\/\*\.dzcdn\.net blob:/);
      assert.match(politique, /img-src data: blob: https:\/\/\*\.dzcdn\.net/);
      assert.match(politique, /frame-ancestors 'none'/);
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    }
    const etiquette = (await fetch(base)).headers.get('etag') ?? '';
    assert.equal((await fetch(base, { headers: { 'If-None-Match': etiquette } })).status, 304);
    for (const chemin of ['/AEIO', '/ABCDE', '/../etc/passwd', '/index.html', '/serveur.mjs'])
      assert.equal((await fetch(base + chemin)).status, 404, chemin);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
    assert.deepEqual(await (await fetch(`${base}/sante`)).json(), { rooms: 0, telephones: 0, musique: false, comptes: 'absents' });
  } finally {
    await site.fermer();
  }
});

test('par la ligne, une partie se crée et se rejoint ; l’heure s’y demande ; qui revient avec son jeton retrouve sa place', async () => {
  const site = unSite();
  try {
    const port = await site.pret;
    const hote = await unTelephone(port);
    hote.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: PLAYLIST_D_ESSAI, pochette: POCHETTE });
    const etat = await hote.attendre('etat');
    assert.match(etat.code, /^[A-Z]{4}$/);
    assert.ok(etat.jeton.length >= 20, 'un jeton qu’on ne devine pas');

    const invite = await unTelephone(port);
    invite.envoyer({ genre: 'rejoindre', code: etat.code.toLowerCase(), pochette: POCHETTE });
    const sien = await invite.attendre('etat');
    const arrivee = await hote.attendre('evenement');
    assert.equal(arrivee.evenement.genre, 'arrivee');

    invite.envoyer({ genre: 'quelleHeure', depart: 41.5 });
    const heure = await invite.attendre('heure');
    assert.equal(heure.depart, 41.5);
    assert.ok(heure.heure >= etat.heure);

    // Sa ligne tombe : l'hôte voit sa pochette se retourner. Il revient avec son jeton : même place, même identifiant.
    invite.socket.terminate();
    const tombe = await hote.attendre('evenement');
    assert.deepEqual([tombe.evenement.genre, 'id' in tombe.evenement ? tombe.evenement.id : ''], ['deconnexion', sien.toi]);
    const revenu = await unTelephone(port);
    revenu.envoyer({ genre: 'rejoindre', code: etat.code, pochette: POCHETTE, jeton: sien.jeton });
    assert.equal((await revenu.attendre('etat')).toi, sien.toi);
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/sante`)).json(), { rooms: 1, telephones: 2, musique: false, comptes: 'absents' });
    hote.socket.close();
    revenu.socket.close();
  } finally {
    await site.fermer();
  }
});

test('dans le bac, la ligne cherche chez Deezer et importe un lien ; la room joue la playlist choisie, et chaque lancer porte son extrait', async () => {
  const deezer = await unFauxDeezer();
  const site = unSite([], deezer.adresse);
  try {
    const port = await site.pret;
    const hote = await unTelephone(port);
    hote.envoyer({ genre: 'chercher', recherche: 'soirée 2000' });
    const trouvees = await hote.attendre('playlists');
    assert.equal(trouvees.recherche, 'soirée 2000');
    assert.deepEqual(trouvees.playlists, [{ lien: 'deezer:4242', titre: 'Soirée 2000', total: 20 }]);

    hote.envoyer({ genre: 'importer', lien: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' });
    assert.equal((await hote.attendre('refus')).raison, 'spotify', 'une playlist Spotify privée');
    hote.envoyer({ genre: 'importer', lien: `https://open.spotify.com/intl-fr/playlist/${SPOTIFY}?si=abc` });
    assert.deepEqual((await hote.attendre('importee')).playlist, {
      lien: `spotify:${SPOTIFY}`,
      titre: 'Ma playlist Spotify',
      total: 20,
      jouables: 20,
    });
    hote.envoyer({ genre: 'importer', lien: 'https://www.deezer.com/fr/playlist/4242' });
    assert.deepEqual((await hote.attendre('importee')).playlist, { lien: 'deezer:4242', titre: 'Soirée 2000', total: 20, jouables: 20 });
    hote.envoyer({ genre: 'importer', lien: 'deezer.com/playlist/1' });
    assert.equal((await hote.attendre('refus')).raison, 'introuvable');

    // La room s'ouvre sur cette playlist : elle est déjà lue, Deezer n'est pas rappelé.
    const lectures = deezer.demandes.length;
    hote.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: 'deezer:4242', pochette: POCHETTE });
    const etat = await hote.attendre('etat');
    assert.equal(deezer.demandes.length, lectures);
    const invite = await unTelephone(port);
    invite.envoyer({ genre: 'rejoindre', code: etat.code, pochette: POCHETTE });
    await invite.attendre('etat');
    hote.envoyer({ genre: 'lancer' });
    const lancer = await invite.attendre('piste');
    assert.equal(lancer.action.genre, 'lancer');
    assert.match(lancer.extrait ?? '', /^https:\/\/cdnt-preview\.dzcdn\.net\/api\/1\/1\/0\/0\/0\/0\/1\.mp3\?/);
    // Dans la room, le bac est fermé : la ligne ne cherche plus rien.
    hote.envoyer({ genre: 'chercher', recherche: 'autre chose' });
    hote.envoyer({ genre: 'quelleHeure', depart: 1 });
    await hote.attendre('heure');
    assert.ok(!deezer.demandes.slice(lectures).includes('/search/playlist'));

    // Une room sur la playlist Spotify : ses extraits sont ceux que Deezer a pour ses chansons.
    const autreHote = await unTelephone(port);
    autreHote.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: `spotify:${SPOTIFY}`, pochette: POCHETTE });
    const autre = await autreHote.attendre('etat');
    const autreInvite = await unTelephone(port);
    autreInvite.envoyer({ genre: 'rejoindre', code: autre.code, pochette: POCHETTE });
    await autreInvite.attendre('etat');
    autreHote.envoyer({ genre: 'lancer' });
    assert.match((await autreInvite.attendre('piste')).extrait ?? '', /\/1\.mp3\?/);
    for (const t of [hote, invite, autreHote, autreInvite]) t.socket.close();
  } finally {
    await site.fermer();
    await deezer.fermer();
  }
});

test('sans Deezer qui réponde, le bac ne trouve rien, un lien est introuvable, et la playlist d’essai se joue toujours', async () => {
  const site = unSite([], 'http://127.0.0.1:9');
  try {
    const port = await site.pret;
    const hote = await unTelephone(port);
    hote.envoyer({ genre: 'chercher', recherche: 'rien' });
    assert.deepEqual((await hote.attendre('playlists')).playlists, []);
    hote.envoyer({ genre: 'importer', lien: 'https://www.deezer.com/fr/playlist/4242' });
    assert.equal((await hote.attendre('refus')).raison, 'introuvable');
    hote.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: 'deezer:4242', pochette: POCHETTE });
    assert.equal((await hote.attendre('refus')).raison, 'tropCourt');
    hote.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: PLAYLIST_D_ESSAI, pochette: POCHETTE });
    assert.match((await hote.attendre('etat')).code, /^[A-Z]{4}$/);
    hote.socket.close();
  } finally {
    await site.fermer();
  }
});

test('un compte par la ligne : le lien part par le serveur d’envoi, on entre, on revient avec sa session, on garde sa pochette, on efface', async () => {
  const courrier = await unFauxServeurDEnvoi();
  const fichier = join(mkdtempSync(join(tmpdir(), 'miel-comptes-')), 'comptes.json');
  const comptes = {
    fichier,
    site: 'https://miel-doreilles.fr',
    courrier: {
      hote: '127.0.0.1',
      port: courrier.port,
      utilisateur: 'u',
      motDePasse: 'p',
      de: 'Miel <bonjour@miel-doreilles.fr>',
      chiffre: false,
      patience: 2000,
    },
    textes: TEXTES.compte,
  } as const;
  const site = unSite([], undefined, comptes);
  try {
    const port = await site.pret;
    const telephone = await unTelephone(port);
    telephone.envoyer({ genre: 'demanderUnLien', email: 'pas une adresse' });
    assert.equal((await telephone.attendre('refus')).raison, 'adresse');
    telephone.envoyer({ genre: 'demanderUnLien', email: ' Mateo@Example.com ' });
    assert.equal((await telephone.attendre('lienEnvoye')).email, 'mateo@example.com');
    assert.equal(courrier.lettres[0]?.a, 'mateo@example.com');
    const lien = /#connexion=([A-Za-z0-9_-]+)/.exec(courrier.lettres[0]?.texte ?? '')?.[1] ?? '';
    telephone.envoyer({ genre: 'ouvrirLeCompte', lien });
    const entre = await telephone.attendre('compte');
    assert.equal(entre.compte.email, 'mateo@example.com');
    assert.ok((entre.session ?? '').length >= 40, 'un secret de session');
    // Le lien a servi : il ne resservira pas.
    telephone.envoyer({ genre: 'ouvrirLeCompte', lien });
    assert.equal((await telephone.attendre('refus')).raison, 'lienPerime');
    // Il crée une room : sa pochette est gardée dans son compte.
    telephone.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son: 'tous', playlist: PLAYLIST_D_ESSAI, pochette: POCHETTE });
    await telephone.attendre('etat');
    // Il la refait dans la room : la room la voit changer, le compte la garde.
    const refaite = { ...POCHETTE, artiste: 'DJ Mateo' };
    telephone.envoyer({ genre: 'changerDePochette', pochette: refaite });
    const changee = await telephone.attendre('evenement');
    assert.equal(changee.evenement.genre === 'nouvellePochette' && changee.evenement.pochette.artiste, 'DJ Mateo');
    // Un autre téléphone, avec la session : le même compte, la pochette avec lui ; le fichier ne garde pas le secret.
    const ailleurs = await unTelephone(port);
    ailleurs.envoyer({ genre: 'reprendreLeCompte', session: entre.session ?? '' });
    assert.deepEqual((await ailleurs.attendre('compte')).compte, { email: 'mateo@example.com', pochette: refaite, parties: 0, victoires: 0 });
    assert.ok(!readFileSync(fichier, 'utf8').includes(entre.session ?? '?'));
    ailleurs.envoyer({ genre: 'effacerLeCompte' });
    await ailleurs.attendre('horsCompte');
    const plusRien = await unTelephone(port);
    plusRien.envoyer({ genre: 'reprendreLeCompte', session: entre.session ?? '' });
    await plusRien.attendre('horsCompte');
    for (const t of [telephone, ailleurs, plusRien]) t.socket.close();
  } finally {
    await site.fermer();
    await courrier.fermer();
  }
});

test('un site sans courrier dit que ses comptes sont fermés', async () => {
  const site = unSite();
  try {
    const telephone = await unTelephone(await site.pret);
    telephone.envoyer({ genre: 'demanderUnLien', email: 'mateo@example.com' });
    assert.equal((await telephone.attendre('refus')).raison, 'comptesFermes');
    telephone.envoyer({ genre: 'reprendreLeCompte', session: 'abcdefghijklmnopqrstuvwxyz' });
    await telephone.attendre('horsCompte');
    telephone.socket.close();
  } finally {
    await site.fermer();
  }
});

test('la ligne coupe qui insiste avec des messages mal formés, et refuse une page venue d’ailleurs', async () => {
  const site = unSite(['https://miel-doreilles.fr']);
  try {
    const port = await site.pret;
    const venuDAilleurs = new WebSocket(`ws://127.0.0.1:${port}${CHEMIN_DE_LA_LIGNE}`, { origin: 'https://ailleurs.example' });
    const refus = await new Promise<string>((fini) => {
      venuDAilleurs.once('unexpected-response', (requete, reponse) => {
        // Qui écoute ce refus doit lâcher la requête lui-même.
        requete.destroy();
        fini(String(reponse.statusCode));
      });
      venuDAilleurs.once('open', () => fini('ouvert'));
      venuDAilleurs.once('error', () => fini('erreur'));
    });
    assert.equal(refus, '403');

    const tricheur = await unTelephone(port, 'https://miel-doreilles.fr');
    const fermeture = new Promise<number>((fini) => tricheur.socket.once('close', (code) => fini(code)));
    for (let n = 0; n <= RESEAU.tolerance.malFormes; n++) tricheur.envoyer(n % 2 === 0 ? '{pas du json' : { genre: 'creer', mode: 'triche' });
    assert.equal(await fermeture, 1008);
  } finally {
    await site.fermer();
  }
});
