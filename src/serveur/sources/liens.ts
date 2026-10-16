/**
 * Un lien collé dans le bac, et ce qu'il désigne : une playlist Deezer, son lien court (qu'il faut suivre jusqu'où il mène), une
 * liste sur mesure du MCP (« honear.fr/?liste=… »), un lien Spotify, ou rien qu'on sache lire. On le prend avec ou sans
 * « https:// », avec ou sans la langue du site (« deezer.com/fr/playlist/… »). Un lien Spotify, le jeu le reconnaît pour dire
 * qu'il ne le lit pas : les conditions de Spotify interdisent qu'un programme lise ses pages, et son API, qu'on en fasse un jeu.
 * Il n'en suit donc aucun, pas même un lien court.
 */

import { idDeezer } from './deezer';
import { ID_LISTE } from './liste';

export type LienColle =
  | { readonly genre: 'deezer'; readonly id: string }
  | { readonly genre: 'spotify' }
  | { readonly genre: 'liste'; readonly id: string }
  | { readonly genre: 'court'; readonly adresse: string }
  | { readonly genre: 'inconnu' };

/** Les sites des liens courts de Deezer. */
const LIENS_COURTS = ['link.deezer.com', 'deezer.page.link', 'dzr.page.link'];

/** Les sites de Spotify, liens courts compris. */
const SITES_DE_SPOTIFY = ['open.spotify.com', 'play.spotify.com', 'spotify.link', 'spoti.fi'];

export function lireUnLien(colle: string): LienColle {
  const texte = colle.trim();
  const deezer = idDeezer(texte);
  if (deezer !== undefined) return { genre: 'deezer', id: deezer };
  if (/^spotify:/i.test(texte)) return { genre: 'spotify' };
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
  if (SITES_DE_SPOTIFY.includes(hote)) return { genre: 'spotify' };
  if (hote === 'honear.fr') {
    const liste = adresse.searchParams.get('liste');
    if (liste !== null && ID_LISTE.test(liste)) return { genre: 'liste', id: liste };
  }
  if (LIENS_COURTS.includes(hote) && adresse.pathname.length > 1) return { genre: 'court', adresse: adresse.href };
  return { genre: 'inconnu' };
}
