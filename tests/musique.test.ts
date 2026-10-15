/**
 * La musique : ce qu'on reconnaît d'un lien collé, ce qu'on lit des réponses de Deezer et des pages de Spotify, et comment le
 * serveur les appelle, sans réseau : un faux Deezer et un faux Spotify qui répondent ce qu'on leur a appris, et une horloge qu'on
 * avance. On vérifie que les appels restent sous la limite de débit, qu'un « trop vite » se réessaie, que ce qu'on a lu se garde
 * et se relit à temps, avant que les liens expirent, et qu'une playlist Spotify se joue avec les extraits de Deezer.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brancherLaMusique, type OptionsDeLaMusique } from '../src/reseau/musique';
import { PLAYLISTS_EPINGLEES } from '../src/ressources/bac';
import { RESEAU } from '../src/ressources/reseau';
import { TABLEE } from '../src/ressources/tablee';
import {
  API_DE_DEEZER,
  erreurDeDeezer,
  expirationDe,
  idDeezer,
  laBonnePiste,
  lienDeezer,
  lireDesPistes,
  lireLesInvites,
  avecSesInvites,
  lireDesPlaylists,
  lireUnePiste,
  nomNu,
  titreSansEdition,
} from '../src/serveur/sources/deezer';
import { lireUnLien } from '../src/serveur/sources/liens';
import { idSpotify, lienSpotify, lireLaPage } from '../src/serveur/sources/spotify';

const D = RESEAU.deezer;
/** L'heure du monde au début de chaque essai, en secondes depuis 1970. */
const MONDE = 1_760_000_000;

/** Une piste comme Deezer la donne, avec un extrait signé qui expire tant de secondes après `MONDE`. */
function uneTrackDeezer(id: number, expireDans = 900, autre: Record<string, unknown> = {}) {
  return {
    id,
    readable: true,
    title: `Titre ${id}`,
    title_short: `Titre ${id}`,
    preview: `https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/abc${id}.mp3?hdnea=exp=${MONDE + expireDans}~acl=/api/1/1/a/b/c/0/abc${id}.mp3*~data=user_id=0,application_id=42~hmac=f00d`,
    artist: { id: id + 1000, name: `Artiste ${id % 7}` },
    album: { id: id + 2000, title: `Album ${id}` },
    ...autre,
  };
}

/** Un faux Deezer : des playlists, par identifiant, et ce que la recherche trouve ; il compte ce qu'on lui demande. */
function unFauxDeezer(o: {
  readonly playlists?: Record<string, { titre: string; pistes: number; expireDans?: number }>;
  readonly recherche?: unknown;
  /** Les fiches des pistes (`/track/{id}`) : leurs contributeurs, par identifiant. */
  readonly fiches?: Record<string, readonly string[]>;
}) {
  const demandes: string[] = [];
  const reponse = (adresse: string): unknown => {
    const url = new URL(adresse);
    if (url.pathname === '/search/playlist') return o.recherche ?? { data: [] };
    const fiche = /^\/track\/(\d+)$/.exec(url.pathname)?.[1];
    if (fiche !== undefined) {
      const noms = o.fiches?.[fiche];
      if (noms === undefined) return { error: { type: 'DataException', message: 'no data', code: 800 } };
      return { ...uneTrackDeezer(Number(fiche)), contributors: noms.map((name, k) => ({ id: k, name, role: k === 0 ? 'Main' : 'Featured' })) };
    }
    const [, , id, pistes] = url.pathname.split('/');
    const p = id !== undefined ? o.playlists?.[id] : undefined;
    if (p === undefined) return { error: { type: 'DataException', message: 'no data', code: 800 } };
    if (pistes === undefined) return { id: Number(id), title: p.titre, nb_tracks: p.pistes };
    const index = Number(url.searchParams.get('index') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 25);
    const fin = Math.min(p.pistes, index + limit);
    return { data: Array.from({ length: Math.max(0, fin - index) }, (_, k) => uneTrackDeezer(index + k + 1, p.expireDans)), total: p.pistes };
  };
  return { demandes, reponse };
}

/**
 * La musique branchée sur un faux Deezer, avec une horloge qu'on avance : une attente la mène, quand elle finit, à l'heure où elle
 * devait finir ; des attentes prises ensemble finissent ensemble.
 */
function uneMusique(lire: (adresse: string) => unknown, autres: Partial<OptionsDeLaMusique> = {}) {
  const horloge = { t: 0 };
  const appels: { readonly adresse: string; readonly a: number }[] = [];
  const musique = brancherLaMusique({
    lire: (adresse) => {
      appels.push({ adresse, a: horloge.t });
      return Promise.resolve(lire(adresse));
    },
    page: () => Promise.reject(new Error('pas de Spotify')),
    suivre: () => Promise.reject(new Error('pas de réseau')),
    maintenant: () => horloge.t,
    monde: () => MONDE + horloge.t,
    attendre: (s) => {
      const fin = horloge.t + s;
      return new Promise<void>((fini) =>
        setImmediate(() => {
          horloge.t = Math.max(horloge.t, fin);
          fini();
        }),
      );
    },
    ...autres,
  });
  return { musique, appels, horloge };
}

test('un lien collé : une playlist Deezer ou Spotify, de toutes les façons qu’on la colle ; un lien court ; ou rien qu’on connaisse', () => {
  for (const colle of [
    'https://www.deezer.com/fr/playlist/1306931615',
    'https://deezer.com/playlist/1306931615?utm_source=deezer',
    'www.deezer.com/en-gb/playlist/1306931615',
    '  deezer.com/playlist/1306931615  ',
    'deezer:1306931615',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'deezer', id: '1306931615' }, colle);
  for (const colle of [
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=1a2b3c4d5e6f7g8h',
    'open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'https://open.spotify.com/user/spotify/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'spotify', id: '37i9dQZF1DXcBWIGoYBM5M' }, colle);
  assert.deepEqual(lireUnLien('https://link.deezer.com/s/30ABCdef'), { genre: 'court', adresse: 'https://link.deezer.com/s/30ABCdef' });
  assert.deepEqual(lireUnLien('deezer.page.link/xyz'), { genre: 'court', adresse: 'https://deezer.page.link/xyz' });
  assert.deepEqual(lireUnLien('spotify.link/AbCdEfGh'), { genre: 'court', adresse: 'https://spotify.link/AbCdEfGh' });
  for (const colle of [
    'https://www.deezer.com/fr/album/302127',
    'https://open.spotify.com/album/4tDBsfbHRJ9OdcMO9bmnai',
    'https://open.spotify.com/playlist/trop-court',
    'https://exemple.fr/playlist/12',
    'ma playlist',
    'https://deezer.com.exemple.fr/playlist/1',
    'https://spotify.link/',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'inconnu' }, colle);
  assert.equal(idDeezer(lienDeezer('42')), '42');
  assert.equal(idDeezer('essai:tubes'), undefined);
  assert.equal(idSpotify(lienSpotify('37i9dQZF1DXcBWIGoYBM5M')), '37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(idSpotify('spotify:42'), undefined);
});

test('une piste de Deezer : sa réponse, son invité tiré du titre, son extrait ; aucune si Deezer ne la laisse pas lire', () => {
  const piste = lireUnePiste(
    uneTrackDeezer(5, 900, { title: 'Tout oublier (feat. Roméo Elvis)', title_short: 'Tout oublier', artist: { name: 'Angèle' } }),
  );
  assert.equal(piste?.reponse.titre, 'Tout oublier');
  assert.equal(piste?.reponse.artiste, 'Angèle');
  assert.equal(piste?.reponse.feat, 'Roméo Elvis');
  assert.match(piste?.extrait ?? '', /^https:\/\/cdnt-preview\.dzcdn\.net\//);
  assert.ok(piste !== undefined && 'vignette' in piste.reponse.pochette, 'une vignette tirée de son identifiant');
  assert.deepEqual(
    lireUnePiste(uneTrackDeezer(5, 900, { title: 'Dernière danse' })),
    lireUnePiste(uneTrackDeezer(5, 900, { title: 'Dernière danse' })),
  );
  assert.equal(lireUnePiste(uneTrackDeezer(6, 900, { title: 'Bim Bam toi [ft. Vianney]', title_short: undefined }))?.reponse.titre, 'Bim Bam toi');
  // Ce qui dit l'édition ne fait pas partie du titre qu'on montre et qu'on attend ; le reste entre parenthèses, si.
  assert.equal(lireUnePiste(uneTrackDeezer(6, 900, { title_short: 'Runaway Train (2022 Remaster)' }))?.reponse.titre, 'Runaway Train');
  assert.equal(titreSansEdition('Bohemian Rhapsody - Remastered 2011'), 'Bohemian Rhapsody');
  assert.equal(titreSansEdition('One More Time (Radio Edit)'), 'One More Time');
  assert.equal(titreSansEdition('Dancing Queen [Live at Wembley]'), 'Dancing Queen');
  assert.equal(titreSansEdition('I’ll Be There for You (Theme from Friends)'), 'I’ll Be There for You (Theme from Friends)');
  assert.equal(titreSansEdition('Live Is Life'), 'Live Is Life');
  assert.equal(titreSansEdition('(Remastered)'), '(Remastered)', 'rien ne reste : tel quel');
  assert.equal(lireUnePiste(uneTrackDeezer(7, 900, { readable: false })), undefined);
  assert.equal(lireUnePiste(uneTrackDeezer(8, 900, { preview: '' })), undefined);
  assert.equal(lireUnePiste(uneTrackDeezer(9, 900, { preview: 'http://cdnt-preview.dzcdn.net/x.mp3' })), undefined);
  // La vraie pochette : l'image de l'album que Deezer sert de chez lui ; ou celle que son empreinte désigne ; rien d'ailleurs.
  const md5 = '2e018122cb56986277102d2041a592c8';
  const grande = `https://e-cdns-images.dzcdn.net/images/cover/${md5}/500x500-000000-80-0-0.jpg`;
  const imageDe = (album: Record<string, unknown>, plus: Record<string, unknown> = {}) => {
    const p = lireUnePiste(uneTrackDeezer(10, 900, { album: { id: 1, title: 'Album', ...album }, ...plus }))?.reponse.pochette;
    return p !== undefined && 'vignette' in p ? p.image : undefined;
  };
  assert.equal(imageDe({ cover_big: grande, md5_image: md5 }), grande);
  assert.equal(imageDe({ md5_image: md5 }), `https://cdn-images.dzcdn.net/images/cover/${md5}/500x500-000000-80-0-0.jpg`);
  assert.equal(imageDe({}, { md5_image: md5 }), `https://cdn-images.dzcdn.net/images/cover/${md5}/500x500-000000-80-0-0.jpg`);
  assert.equal(imageDe({ cover_big: 'https://exemple.fr/x.jpg' }), undefined);
  assert.equal(imageDe({ cover_big: grande.replace('https', 'http'), md5_image: 'pas-une-empreinte' }), undefined);
  assert.equal(imageDe({}), undefined);
  const page = lireDesPistes({ data: [uneTrackDeezer(1), uneTrackDeezer(2, 900, { readable: false }), 'rien'], total: 120 });
  assert.deepEqual([page.pistes.length, page.lues, page.total], [1, 3, 120]);
});

test('les playlists d’une recherche, les refus de Deezer, et l’heure où expire un extrait', () => {
  const trouvees = lireDesPlaylists({
    data: [
      { id: 11, title: 'Rap FR', nb_tracks: 60 },
      { id: 12, title: 'Vide', nb_tracks: 0 },
      { id: 13, nb_tracks: 10 },
      { id: 14, title: '  Été 2026 ', nb_tracks: 25 },
    ],
  });
  assert.deepEqual(trouvees, [
    { lien: 'deezer:11', titre: 'Rap FR', total: 60 },
    { lien: 'deezer:14', titre: 'Été 2026', total: 25 },
  ]);
  assert.deepEqual(lireDesPlaylists({ error: { code: 4 } }), []);
  assert.equal(erreurDeDeezer({ error: { type: 'Exception', message: 'Quota limit exceeded', code: 4 } }), 'quota');
  assert.equal(erreurDeDeezer({ error: { code: 800 } }), 'introuvable');
  assert.equal(erreurDeDeezer({ error: { code: 300 } }), 'autre');
  assert.equal(erreurDeDeezer({ data: [] }), undefined);
  assert.equal(expirationDe(uneTrackDeezer(1, 900).preview), MONDE + 900);
  assert.equal(expirationDe('https://cdns-preview-d.dzcdn.net/stream/c-deda7fa9316d9e9e880d2c6207e92260-8.mp3'), undefined);
});

test('les appels à Deezer restent sous sa limite de débit, et un « trop vite » se réessaie après une fenêtre', async () => {
  const deezer = unFauxDeezer({ playlists: {} });
  const { musique, appels } = uneMusique(deezer.reponse);
  // Bien plus de recherches qu'une fenêtre n'en admet, toutes d'un coup.
  const recherches = Array.from({ length: D.parFenetre + 15 }, (_, k) => musique.chercher(`recherche ${k}`));
  await Promise.all(recherches);
  assert.equal(appels.length, D.parFenetre + 15);
  for (const appel of appels) {
    const dansLaFenetre = appels.filter((a) => a.a > appel.a - D.fenetre && a.a <= appel.a).length;
    assert.ok(dansLaFenetre <= D.parFenetre, `${dansLaFenetre} appels en ${D.fenetre} s`);
  }

  // Deezer dit qu'on va trop vite, deux fois : on attend, on réessaie, et la troisième passe.
  let refus = 2;
  const presse = uneMusique((adresse) =>
    refus-- > 0
      ? { error: { code: 4, message: 'Quota limit exceeded' } }
      : adresse.includes('/search/')
        ? { data: [{ id: 3, title: 'Trois', nb_tracks: 9 }] }
        : {},
  );
  assert.deepEqual(await presse.musique.chercher('trois'), [{ lien: 'deezer:3', titre: 'Trois', total: 9 }]);
  assert.equal(presse.appels.length, 3);
  assert.ok((presse.appels[2]?.a ?? 0) >= 2 * D.fenetre, 'on a laissé passer deux fenêtres');
  // Toujours trop vite : on abandonne, sans boucler.
  const sature = uneMusique(() => ({ error: { code: 4 } }));
  await assert.rejects(sature.musique.chercher('encore'));
  assert.equal(sature.appels.length, D.essais + 1);
});

test('une recherche se garde une heure ; elle montre au plus le rang du bac, et Deezer ne la reçoit qu’une fois', async () => {
  const recherche = { data: Array.from({ length: D.resultats * 2 }, (_, k) => ({ id: k + 1, title: `Playlist ${k + 1}`, nb_tracks: 30 })) };
  const { musique, appels, horloge } = uneMusique(() => recherche);
  assert.equal(D.resultats, TABLEE.telephone.bac.resultats.x.length, 'autant de playlists que de places dans le bac');
  assert.equal((await musique.chercher('Été 90')).length, D.resultats);
  await musique.chercher('  été 90 ');
  assert.equal(appels.length, 1);
  assert.match(appels[0]?.adresse ?? '', new RegExp(`^${API_DE_DEEZER}/search/playlist\\?q=%C3%A9t%C3%A9%2090&limit=${D.resultats * 2}$`));
  horloge.t += D.rechercheGardee;
  await musique.chercher('été 90');
  assert.equal(appels.length, 2);
});

test('un thème du bac épingle sa playlist avant ce que la recherche trouve ; son titre et ses pistes, sans ce qui ne s’écrit pas en latin', async () => {
  const [epinglee = ''] = PLAYLISTS_EPINGLEES.generiques ?? [];
  const recherche = { data: Array.from({ length: D.resultats * 2 }, (_, k) => ({ id: k + 1, title: `Playlist ${k + 1}`, nb_tracks: 30 })) };
  const deezer = unFauxDeezer({ playlists: { [epinglee]: { titre: 'Anime Essentials 定番アニメ', pistes: 50 } }, recherche });
  const { musique } = uneMusique(deezer.reponse);
  const trouvees = await musique.chercher('Génériques de dessins animés', 'generiques');
  assert.equal(trouvees.length, D.resultats);
  assert.deepEqual(trouvees[0], { lien: `deezer:${epinglee}`, titre: 'Anime Essentials', total: 50 });
  assert.equal((await musique.chercher('Génériques de dessins animés'))[0]?.lien, 'deezer:1', 'sans thème, rien d’épinglé');
  assert.equal(lireUnePiste(uneTrackDeezer(1, 900, { title: '残酷な天使のテーゼ', title_short: '残酷な天使のテーゼ' })), undefined);
  assert.equal(lireUnePiste(uneTrackDeezer(2, 900, { artist: { id: 1, name: '高橋洋子' } })), undefined);
  assert.equal(
    lireUnePiste(uneTrackDeezer(3, 900, { title: 'Gurenge', title_short: 'Gurenge', artist: { id: 2, name: 'LiSA' } }))?.reponse.titre,
    'Gurenge',
  );
});

test('une playlist se lit page par page, une fois même si deux la demandent, et se relit avant que ses liens expirent', async () => {
  const deezer = unFauxDeezer({
    playlists: { '777': { titre: 'Les grands tubes', pistes: 250 }, '888': { titre: 'Court', pistes: 6, expireDans: 300 } },
  });
  const { musique, appels, horloge } = uneMusique(deezer.reponse);
  await Promise.all([musique.preparer('deezer:777'), musique.preparer('deezer:777')]);
  // Son titre, puis trois pages de cent : deux téléphones, une seule lecture.
  assert.equal(appels.length, 4);
  assert.equal(musique.pistes('deezer:777')?.length, 250);
  assert.equal(musique.pistes('deezer:777')?.[0]?.reponse.titre, 'Titre 1');
  await musique.preparer('deezer:777');
  assert.equal(appels.length, 4, 'encore fraîche');
  horloge.t += D.fraicheur;
  await musique.preparer('deezer:777');
  assert.equal(appels.length, 8, 'relue au bout de dix minutes');

  // Des liens qui expirent dans cinq minutes : relue dès qu'il ne reste que la marge.
  const vite = uneMusique(deezer.reponse);
  await vite.musique.preparer('deezer:888');
  assert.equal(vite.appels.length, 2);
  vite.horloge.t += 300 - D.marge - 1;
  await vite.musique.preparer('deezer:888');
  assert.equal(vite.appels.length, 2);
  vite.horloge.t += 1;
  await vite.musique.preparer('deezer:888');
  assert.equal(vite.appels.length, 4);

  // Un lien qui n'est pas de Deezer : rien à lire. Une playlist qui n'existe pas : rien de gardé.
  await musique.preparer('essai:tubes');
  await musique.preparer('deezer:404');
  assert.equal(musique.pistes('deezer:404'), undefined);
});

test('un lien importé : la playlist lue, avec ce qu’on peut en jouer ; Spotify, un lien court, un lien qui ne mène à rien', async () => {
  const deezer = unFauxDeezer({ playlists: { '777': { titre: 'Les grands tubes', pistes: 30 } } });
  const { musique } = uneMusique(deezer.reponse, {
    suivre: (adresse) =>
      adresse.endsWith('/bon')
        ? Promise.resolve('https://www.deezer.com/fr/playlist/777?host=0&utm_campaign=x')
        : Promise.resolve('https://www.deezer.com/fr/'),
  });
  assert.deepEqual(await musique.importer('https://www.deezer.com/fr/playlist/777'), {
    lien: 'deezer:777',
    titre: 'Les grands tubes',
    total: 30,
    jouables: 30,
  });
  assert.deepEqual(await musique.importer('https://link.deezer.com/s/bon'), {
    lien: 'deezer:777',
    titre: 'Les grands tubes',
    total: 30,
    jouables: 30,
  });
  assert.equal(await musique.importer('https://link.deezer.com/s/perdu'), 'introuvable');
  assert.equal(await musique.importer('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'), 'spotify');
  assert.equal(await musique.importer('https://www.deezer.com/fr/playlist/404'), 'introuvable');
  assert.equal(await musique.importer('n’importe quoi'), 'introuvable');
});

test('quand trop d’appels attendent leur tour, la musique n’en prend plus : elle ne s’engorge pas', async () => {
  // La fenêtre est pleine et le temps ne passe pas tant que la porte est fermée : les appels d'au-delà attendent, puis on refuse.
  const horloge = { t: 0 };
  let ouvrir: () => void = () => undefined;
  const porte = new Promise<void>((fini) => (ouvrir = fini));
  const musique = brancherLaMusique({
    lire: () => Promise.resolve({ data: [] }),
    page: () => Promise.reject(new Error('pas de Spotify')),
    suivre: () => Promise.reject(new Error('pas de réseau')),
    maintenant: () => horloge.t,
    monde: () => MONDE,
    attendre: (s) =>
      porte.then(() => {
        horloge.t += s;
      }),
  });
  const issues = Array.from({ length: D.fileAuPlus + 10 }, (_, k) =>
    musique.chercher(`r${k}`).then(
      () => 'lue',
      () => 'refusee',
    ),
  );
  ouvrir();
  const lues = await Promise.all(issues);
  assert.equal(lues.filter((x) => x === 'lue').length, D.fileAuPlus);
  assert.equal(lues.filter((x) => x === 'refusee').length, 10);
});

/** L'identifiant d'une playlist Spotify d'essai. */
const ID = '1a2B3c4D5e6F7g8H9i0JkL';

/** Ce que la page d'une playlist Spotify porte : son titre, ses titres (des chansons, un épisode, un fichier local). */
const ENTITE = {
  type: 'playlist',
  name: 'Ma soirée',
  uri: `spotify:playlist:${ID}`,
  trackList: [
    { uri: 'spotify:track:a1', title: 'Tout oublier (feat. Roméo Elvis)', subtitle: 'Angèle, Roméo Elvis', isPlayable: true },
    { uri: 'spotify:episode:e1', title: 'Le podcast du lundi', subtitle: 'Radio' },
    { uri: 'spotify:track:a2', title: 'Bohemian Rhapsody - Remastered 2011', subtitle: 'Queen', artists: [{ name: 'Queen' }] },
    { uri: 'spotify:local:x', title: 'Ma démo', subtitle: 'Moi' },
    { uri: 'spotify:track:a3', title: 'Chanson rare', subtitle: 'Groupe inconnu' },
    { uri: 'spotify:track:a4', title: 'Voyage, voyage', subtitle: 'Desireless' },
  ],
};
const enBase64 = (x: unknown): string => Buffer.from(JSON.stringify(x)).toString('base64');
/** La page publique d'une playlist, rangée de chacune des façons qu'on a vu Spotify ranger la sienne. */
const PAGES = {
  resource: `<!doctype html><html><body><div id="main"></div><script id="resource" type="text/plain">${enBase64(ENTITE)}</script></body></html>`,
  etatInitial: `<html><body><script id="initial-state" type="text/plain">\n${enBase64({ data: { entity: ENTITE } })}\n</script></body></html>`,
  nextJs: `<html><body><script id="__NEXT_DATA__" type="application/json" nonce="x">${JSON.stringify({ props: { pageProps: { state: { data: { entity: ENTITE } } } } })}</script></body></html>`,
};

test('la page publique d’une playlist Spotify : son titre et ses chansons, de quelque façon que Spotify les range', () => {
  for (const [rangement, html] of Object.entries(PAGES))
    assert.deepEqual(
      lireLaPage(html),
      {
        titre: 'Ma soirée',
        titres: [
          { titre: 'Tout oublier (feat. Roméo Elvis)', artiste: 'Angèle' },
          { titre: 'Bohemian Rhapsody - Remastered 2011', artiste: 'Queen' },
          { titre: 'Chanson rare', artiste: 'Groupe inconnu' },
          { titre: 'Voyage, voyage', artiste: 'Desireless' },
        ],
      },
      rangement,
    );
  // Une playlist privée, une page que Spotify a changée : rien.
  assert.equal(lireLaPage('<html><body><h1>Page not found</h1></body></html>'), undefined);
  assert.equal(lireLaPage('<script id="resource">pas du base64 !</script>'), undefined);
});

test('un titre retrouvé chez Deezer : le même nom et le même artiste, à l’habillage près ; jamais une autre chanson', () => {
  assert.equal(nomNu('Bohemian Rhapsody - Remastered 2011'), 'Bohemian Rhapsody');
  assert.equal(nomNu('Tout oublier (feat. Roméo Elvis)'), 'Tout oublier');
  assert.equal(nomNu('(Don’t Fear) The Reaper'), 'The Reaper');
  assert.equal(nomNu('(Interlude)'), '(Interlude)');
  const trouvees = {
    data: [uneTrackDeezer(1, 900, { title: 'Bohemian Rhapsody (Live Aid)', title_short: 'Bohemian Rhapsody', artist: { name: 'Queen' } })],
  };
  assert.equal(laBonnePiste(trouvees, { titre: 'Bohemian Rhapsody - Remastered 2011', artiste: 'Queen' })?.id, 1);
  assert.equal(laBonnePiste(trouvees, { titre: 'Bohemian Rhapsody', artiste: 'Panic! At The Disco' }), undefined);
  assert.equal(laBonnePiste(trouvees, { titre: 'Another One Bites the Dust', artiste: 'Queen' }), undefined);
  assert.equal(
    laBonnePiste(
      { data: [uneTrackDeezer(2, 900, { title: 'Tout oublier', title_short: 'Tout oublier', artist: { name: 'Angele' } })] },
      { titre: 'Tout oublier (feat. Roméo Elvis)', artiste: 'Angèle' },
    )?.id,
    2,
  );
  assert.equal(
    laBonnePiste(
      { data: [uneTrackDeezer(3, 900, { title: 'Tout oublier', artist: { name: 'Angèle' }, readable: false })] },
      { titre: 'Tout oublier', artiste: 'Angèle' },
    ),
    undefined,
  );
});

/** Un faux Deezer qui retrouve les titres qu'on cherche, sauf ceux qu'il n'a pas ; il relit une piste par son identifiant. */
function unDeezerQuiRetrouve(absents: readonly string[], monde: () => number) {
  const ids = new Map<string, number>();
  const idDe = (nom: string): number => ids.get(nom) ?? (ids.set(nom, 7000 + ids.size), 7000 + ids.size - 1);
  const track = (id: number, titre: string, artiste: string) =>
    uneTrackDeezer(id, 900 + monde() - MONDE, { title: titre, title_short: titre, artist: { name: artiste } });
  return (adresse: string): unknown => {
    const url = new URL(adresse);
    if (url.pathname === '/search/track') {
      const q = url.searchParams.get('q') ?? '';
      const precise = /^artist:"(.*)" track:"(.*)"$/.exec(q);
      // En vrac, Deezer trouve toujours quelque chose : une autre chanson, qu'il ne faut pas prendre.
      if (precise === null) return { data: [track(9999, 'Une autre chanson', 'Quelqu’un')] };
      const [, artiste = '', titre = ''] = precise;
      return absents.includes(titre) ? { data: [] } : { data: [track(idDe(titre), titre, artiste)] };
    }
    const piste = /^\/track\/(\d+)$/.exec(url.pathname);
    if (piste !== null) {
      const id = Number(piste[1]);
      const titre = [...ids].find(([, i]) => i === id)?.[0] ?? '?';
      return track(id, titre, 'Retrouvé');
    }
    return { error: { code: 800 } };
  };
}

test('une playlist Spotify se joue avec les extraits de Deezer : ses chansons retrouvées une à une, celles qu’il n’a pas sautées', async () => {
  const pages: string[] = [];
  const heure = { t: (): number => 0 };
  const deezer = unDeezerQuiRetrouve(['Chanson rare'], () => MONDE + heure.t());
  const { musique, appels, horloge } = uneMusique(deezer, {
    page: (adresse) => {
      pages.push(adresse);
      return Promise.resolve(adresse.endsWith(ID) ? PAGES.resource : '<html>Page not found</html>');
    },
    suivre: () => Promise.resolve(`https://open.spotify.com/intl-fr/playlist/${ID}?si=x`),
  });
  heure.t = () => horloge.t;
  const importee = await musique.importer(`https://open.spotify.com/playlist/${ID}?si=abc`);
  assert.deepEqual(importee, { lien: `spotify:${ID}`, titre: 'Ma soirée', total: 4, jouables: 3 });
  assert.deepEqual(pages, [`https://open.spotify.com/embed/playlist/${ID}`]);
  const pistes = musique.pistes(`spotify:${ID}`) ?? [];
  assert.deepEqual(
    pistes.map((p) => [p.reponse.titre, p.reponse.artiste]),
    [
      ['Tout oublier', 'Angèle'],
      ['Bohemian Rhapsody', 'Queen'],
      ['Voyage, voyage', 'Desireless'],
    ],
  );
  assert.ok(pistes.every((p) => p.extrait?.startsWith('https://cdnt-preview.dzcdn.net/') === true));
  // Le titre que Deezer n'a pas : cherché précisément, puis en vrac (une autre chanson, refusée).
  assert.equal(appels.filter((a) => a.adresse.includes('Chanson%20rare')).length, 2);

  // Un lien court qui mène à la même playlist : déjà lue, rien de plus à demander.
  const avant = appels.length;
  assert.deepEqual(await musique.importer('https://spotify.link/AbCdEfGh'), importee);
  assert.equal(appels.length, avant);
  // Une playlist privée : sa page ne dit rien.
  assert.equal(await musique.importer('https://open.spotify.com/playlist/0000000000000000000000'), 'spotify');
  // Spotify qui ne répond pas : elle ne se laisse pas lire non plus.
  const muet = uneMusique(deezer);
  assert.equal(await muet.musique.importer(`spotify:playlist:${ID}`), 'spotify');

  // Ses extraits expirent : elle se relit, ses chansons connues relues par leur identifiant, sans les rechercher.
  horloge.t += D.fraicheur;
  const relues = appels.length;
  await musique.preparer(`spotify:${ID}`);
  const nouveaux = appels.slice(relues).map((a) => new URL(a.adresse).pathname);
  assert.deepEqual(nouveaux.filter((c) => c.startsWith('/track/')).length, 3);
  assert.ok(!nouveaux.includes('/search/track') || appels.slice(relues).every((a) => !a.adresse.includes('Tout%20oublier')));
  assert.equal(pages.length, 3, 'sa page relue');
});

test('les invités d’une piste : lus sur sa fiche pour les prochaines pistes d’une room, ils lui donnent son feat', async () => {
  // La fiche : les contributeurs, sans l'artiste principal (aux majuscules près), ni ce qui ne s'écrit pas en latin.
  const fiche = { contributors: [{ name: 'Kofs' }, { name: 'Jul' }, { name: 'KOFS' }, { name: '13 Organisé' }, { name: 'ジュル' }, 'rien'] };
  assert.deepEqual(lireLesInvites(fiche, 'Kofs'), ['Jul', '13 Organisé']);
  assert.deepEqual(lireLesInvites({ error: {} }, 'Kofs'), []);
  const piste = lireUnePiste(uneTrackDeezer(5, 900, { title: 'Bande organisée', artist: { name: 'Kofs' } }));
  assert.ok(piste !== undefined);
  assert.equal(piste.deezer, 5, 'la piste garde son identifiant chez Deezer');
  assert.equal(avecSesInvites(piste, ['Jul', '13 Organisé']).reponse.feat, 'Jul & 13 Organisé');
  assert.equal(avecSesInvites(piste, []), piste, 'sans invité, la même piste');
  const sapes = lireUnePiste(uneTrackDeezer(6, 900, { title: 'Sapés comme jamais (feat. Niska)', title_short: 'Sapés comme jamais (feat. Niska)' }));
  assert.ok(sapes !== undefined);
  assert.equal(avecSesInvites(sapes, ['niska', 'Gradur']).reponse.feat, 'Niska & Gradur', 'le feat du titre reste, les autres s’y ajoutent');
  // La room dit ce qu'elle va jouer : on lit les fiches des trois prochaines pistes, une fois, et leurs pistes ont leur feat.
  const deezer = unFauxDeezer({
    playlists: { '777': { titre: 'Rap', pistes: 6 } },
    fiches: { '1': ['Artiste 1', 'Roméo Elvis'], '2': ['Artiste 2'] },
  });
  const { musique, appels } = uneMusique(deezer.reponse);
  await musique.preparer('deezer:777');
  const avant = appels.length;
  const pistes = musique.pistes('deezer:777') ?? [];
  musique.preciser(pistes);
  musique.preciser(pistes);
  await new Promise((fini) => setImmediate(fini));
  await new Promise((fini) => setImmediate(fini));
  assert.equal(appels.length - avant, D.aVenir, 'les fiches des prochaines, une seule fois');
  assert.ok(appels.slice(avant).every(({ adresse }) => /\/track\/[123]$/.test(adresse)));
  const apres = musique.pistes('deezer:777') ?? [];
  assert.equal(apres[0]?.reponse.feat, 'Roméo Elvis');
  assert.equal(apres[1]?.reponse.feat, undefined, 'seul avec lui-même : pas de feat');
  // Une fois lues, on passe aux suivantes ; une fiche qui ne se lit pas (la 3) est redemandée plus tard, pas tout de suite.
  musique.preciser(apres);
  await new Promise((fini) => setImmediate(fini));
  assert.ok(appels.slice(avant + D.aVenir).every(({ adresse }) => /\/track\/[456]$/.test(adresse)));
});

test('une playlist bientôt plus fraîche se relit en coulisses, quand le serveur du jeu en lit les pistes', async () => {
  const deezer = unFauxDeezer({ playlists: { '777': { titre: 'Les grands tubes', pistes: 20 } } });
  const { musique, appels, horloge } = uneMusique(deezer.reponse);
  await musique.preparer('deezer:777');
  assert.equal(appels.length, 2);
  horloge.t += D.fraicheur - D.avance + 1;
  assert.equal(musique.pistes('deezer:777')?.length, 20, 'on rend ce qu’on a, sans attendre');
  await new Promise((fini) => setImmediate(fini));
  assert.equal(appels.length, 4, 'et on la relit en coulisses');
  await musique.preparer('deezer:777');
  assert.equal(appels.length, 4, 'fraîche à nouveau');
});
