/**
 * La musique : ce qu'on reconnaît d'un lien collé, ce qu'on lit des réponses de Deezer, et comment le serveur l'appelle, sans
 * réseau : un faux Deezer qui répond ce qu'on lui a appris, et une horloge qu'on avance. On vérifie que les appels restent sous la
 * limite de débit, qu'un « trop vite » se réessaie, que ce qu'on a lu se garde et se relit à temps, avant que les liens expirent,
 * et qu'un lien Spotify est refusé sans qu'on demande rien à personne.
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
  lienDeezer,
  lireDesPistes,
  lireLesInvites,
  avecSesInvites,
  lireDesPlaylists,
  lireUnePiste,
  titreSansEdition,
} from '../src/serveur/sources/deezer';
import { lireUnLien } from '../src/serveur/sources/liens';

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

test('un lien collé : une playlist Deezer, de toutes les façons qu’on la colle ; son lien court ; Spotify ; ou rien qu’on connaisse', () => {
  for (const colle of [
    'https://www.deezer.com/fr/playlist/1306931615',
    'https://deezer.com/playlist/1306931615?utm_source=deezer',
    'www.deezer.com/en-gb/playlist/1306931615',
    '  deezer.com/playlist/1306931615  ',
    'deezer:1306931615',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'deezer', id: '1306931615' }, colle);
  assert.deepEqual(lireUnLien('https://link.deezer.com/s/30ABCdef'), { genre: 'court', adresse: 'https://link.deezer.com/s/30ABCdef' });
  assert.deepEqual(lireUnLien('deezer.page.link/xyz'), { genre: 'court', adresse: 'https://deezer.page.link/xyz' });
  // Spotify, quel que soit le lien, même court : le jeu le reconnaît pour dire qu'il ne le lit pas, et ne le suit pas.
  for (const colle of [
    'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M?si=1a2b3c4d5e6f7g8h',
    'https://open.spotify.com/album/4tDBsfbHRJ9OdcMO9bmnai',
    'https://play.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
    'spotify.link/AbCdEfGh',
    'https://spoti.fi/3xYz',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'spotify' }, colle);
  for (const colle of [
    'https://www.deezer.com/fr/album/302127',
    'https://exemple.fr/playlist/12',
    'ma playlist',
    'https://deezer.com.exemple.fr/playlist/1',
    'https://open.spotify.com.exemple.fr/playlist/37i9dQZF1DXcBWIGoYBM5M',
  ])
    assert.deepEqual(lireUnLien(colle), { genre: 'inconnu' }, colle);
  assert.equal(idDeezer(lienDeezer('42')), '42');
  assert.equal(idDeezer('essai:tubes'), undefined);
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

test('un lien importé : la playlist lue, avec ce qu’on peut en jouer ; un lien court, Spotify, un lien qui ne mène à rien', async () => {
  const deezer = unFauxDeezer({ playlists: { '777': { titre: 'Les grands tubes', pistes: 30 } } });
  const suivis: string[] = [];
  const { musique, appels } = uneMusique(deezer.reponse, {
    suivre: (adresse) => {
      suivis.push(adresse);
      return adresse.endsWith('/bon')
        ? Promise.resolve('https://www.deezer.com/fr/playlist/777?host=0&utm_campaign=x')
        : Promise.resolve('https://www.deezer.com/fr/');
    },
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
  // Spotify : refusé d'office, sans rien demander ni suivre.
  const avant = { appels: appels.length, suivis: suivis.length };
  for (const colle of ['https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', 'https://spotify.link/AbCdEfGh', 'spotify:playlist:x'])
    assert.equal(await musique.importer(colle), 'spotify', colle);
  assert.deepEqual({ appels: appels.length, suivis: suivis.length }, avant);
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
