/**
 * Un lien collé dans le bac, et ce qu'il désigne : une playlist Deezer, une playlist Spotify, le lien court de l'une ou de l'autre
 * (qu'il faut suivre jusqu'où il mène), ou rien qu'on sache lire. On le prend avec ou sans « https:// », avec ou sans la langue du
 * site (« deezer.com/fr/playlist/… », « open.spotify.com/intl-fr/playlist/… »), et sous sa forme d'URI (« spotify:playlist:… »).
 */

import { idDeezer } from './deezer';
import { ID_SPOTIFY, idSpotify } from './spotify';

export type LienColle =
  | { readonly genre: 'deezer'; readonly id: string }
  | { readonly genre: 'spotify'; readonly id: string }
  | { readonly genre: 'court'; readonly adresse: string }
  | { readonly genre: 'inconnu' };

/** Les sites des liens courts : ceux de Deezer, ceux de Spotify. */
const LIENS_COURTS = ['link.deezer.com', 'deezer.page.link', 'dzr.page.link', 'spotify.link', 'spoti.fi'];

export function lireUnLien(colle: string): LienColle {
  const texte = colle.trim();
  const deezer = idDeezer(texte);
  if (deezer !== undefined) return { genre: 'deezer', id: deezer };
  const spotify = idSpotify(texte);
  if (spotify !== undefined) return { genre: 'spotify', id: spotify };
  let adresse: URL;
  try {
    adresse = new URL(/^[a-z]+:\/\//i.test(texte) ? texte : `https://${texte}`);
  } catch {
    return { genre: 'inconnu' };
  }
  const hote = adresse.hostname.toLowerCase().replace(/^www\./, '');
  if (hote === 'deezer.com' || hote.endsWith('.deezer.com')) {
    const playlist = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?playlist\/(\d{1,20})(?:\/|$)/i.exec(adresse.pathname);
    if (playlist?.[1] !== undefined) return { genre: 'deezer', id: playlist[1] };
  }
  if (hote === 'open.spotify.com' || hote === 'play.spotify.com') {
    const playlist = /(?:^|\/)playlist\/([A-Za-z0-9]{22})(?:\/|$)/.exec(adresse.pathname);
    if (playlist?.[1] !== undefined && ID_SPOTIFY.test(playlist[1])) return { genre: 'spotify', id: playlist[1] };
  }
  if (LIENS_COURTS.includes(hote) && adresse.pathname.length > 1) return { genre: 'court', adresse: adresse.href };
  return { genre: 'inconnu' };
}
