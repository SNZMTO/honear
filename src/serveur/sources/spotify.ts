/**
 * La source Spotify : les titres d'une playlist Spotify publique. L'API de Spotify ne donne plus le contenu d'une playlist qu'à son
 * propriétaire connecté (depuis février 2026) : on lit la page publique de la playlist, celle de son lecteur intégré, qui porte la
 * liste de ses titres. Spotify ne donne pas d'extraits qu'on puisse jouer ici : chaque titre est retrouvé chez Deezer, par son
 * artiste et son nom (`deezer.ts`), et c'est l'extrait de Deezer qui s'entend. Ce module ne parle pas au réseau : il dit quelle page
 * lire, et ce qu'elle dit. Une page qu'il ne sait pas lire ne donne rien : Spotify l'a changée, ou la playlist est privée.
 */

import type { TitreACherche } from './deezer';

/** Le site des pages publiques de Spotify. */
export const PAGES_DE_SPOTIFY = 'https://open.spotify.com';

/** Le lien d'une playlist Spotify, tel que le jeu le garde et le donne pour créer une room : « spotify:37i9dQZF1DXcBWIGoYBM5M ». */
export const lienSpotify = (id: string): string => `spotify:${id}`;

/** L'identifiant d'une playlist Spotify : vingt-deux lettres et chiffres. Celui d'un lien du jeu, s'il en est un. */
export const ID_SPOTIFY = /^[A-Za-z0-9]{22}$/;
export const idSpotify = (lien: string): string | undefined => {
  const id = /^spotify:(?:playlist:)?([A-Za-z0-9]{22})$/.exec(lien)?.[1];
  return id !== undefined && ID_SPOTIFY.test(id) ? id : undefined;
};

/** La page publique d'une playlist : celle de son lecteur intégré. */
export const adresseDeLaPage = (id: string): string => `${PAGES_DE_SPOTIFY}/embed/playlist/${id}`;

/** Une playlist Spotify, telle que sa page la donne : son titre, et ses titres, dans l'ordre. */
export interface PlaylistSpotify {
  readonly titre: string;
  readonly titres: readonly TitreACherche[];
}

type Objet = Readonly<Record<string, unknown>>;
const objet = (x: unknown): Objet | undefined => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Objet) : undefined);
const texte = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() !== '' ? x.replace(/\s+/g, ' ').trim() : undefined);

/** Le contenu d'un script de la page, par son identifiant. */
function script(html: string, id: string): string | undefined {
  return new RegExp(`<script[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</script>`).exec(html)?.[1]?.trim();
}

/** Du JSON écrit en base 64, comme Spotify range l'état de sa page. */
function base64(code: string): unknown {
  const octets = Uint8Array.from(atob(code), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(octets)) as unknown;
}

/**
 * Ce que la page dit de la playlist, là où Spotify le range : dans un script « resource » ou « initial-state » (du JSON en base 64),
 * ou dans celui de Next.js (« __NEXT_DATA__ »). Ce sont les trois rangements qu'on lui a connus.
 */
function entite(html: string): Objet | undefined {
  const lectures: readonly (() => unknown)[] = [
    () => {
      const code = script(html, 'resource');
      return code !== undefined ? base64(code) : undefined;
    },
    () => {
      const code = script(html, 'initial-state');
      return code !== undefined ? objet(objet(base64(code))?.['data'])?.['entity'] : undefined;
    },
    () => {
      const code = script(html, '__NEXT_DATA__');
      const props = code !== undefined ? objet(objet(JSON.parse(code))?.['props']) : undefined;
      return objet(objet(objet(objet(props?.['pageProps'])?.['state'])?.['data'])?.['entity']);
    },
  ];
  for (const lire of lectures) {
    try {
      const e = objet(lire());
      if (e !== undefined && Array.isArray(e['trackList'])) return e;
    } catch {
      // Ce rangement-là ne se lit pas : on essaie le suivant.
    }
  }
  return undefined;
}

/** Le premier artiste d'un titre : celui que sa liste d'artistes nomme d'abord, ou le début de son sous-titre (« Angèle, Roméo Elvis »). */
function premierArtiste(piste: Objet): string | undefined {
  const artistes = piste['artists'];
  const nomme = Array.isArray(artistes) ? texte(objet(artistes[0])?.['name']) : undefined;
  return nomme ?? texte(texte(piste['subtitle'])?.split(/\s*,\s*|\s+&\s+|\s+(?:feat\.?|ft\.?)\s+/i)[0]);
}

/** Lit la page publique d'une playlist : son titre, et ses titres (les chansons seulement : ni épisodes ni fichiers locaux). */
export function lireLaPage(html: string): PlaylistSpotify | undefined {
  const e = entite(html);
  const titre = texte(e?.['name']) ?? texte(e?.['title']);
  if (e === undefined || titre === undefined) return undefined;
  const titres = (e['trackList'] as readonly unknown[]).flatMap((x): TitreACherche[] => {
    const p = objet(x);
    const uri = texte(p?.['uri']);
    const nom = texte(p?.['title']);
    const artiste = p !== undefined ? premierArtiste(p) : undefined;
    return p !== undefined && uri?.startsWith('spotify:track:') === true && nom !== undefined && artiste !== undefined
      ? [{ titre: nom, artiste }]
      : [];
  });
  return { titre, titres };
}
