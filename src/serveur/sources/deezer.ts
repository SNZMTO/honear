/**
 * La source Deezer : les playlists publiques de Deezer et leurs extraits de 30 secondes, et les titres qu'on y retrouve par leur
 * artiste et leur nom (ceux d'une playlist Spotify). Ce module ne parle pas au réseau : il dit quelles adresses demander, et lit
 * ce que Deezer répond. C'est le réseau (`reseau/musique.ts`) qui demande, étale les appels sous la limite de débit, et garde les
 * réponses un moment. Une piste n'est jouable que si Deezer la laisse lire et lui donne un extrait.
 */

import type { PlaylistTrouvee } from '../../regles/messages';
import type { PisteDuMode } from '../../regles/modes';
import { FONDS_DE_POCHETTE, MOTIFS_DE_POCHETTE } from '../../ressources/pochettes';

/** L'adresse de l'API publique de Deezer. */
export const API_DE_DEEZER = 'https://api.deezer.com';

/** Combien de pistes une page de playlist donne au plus, et combien de pages on lit au plus : une face B de vingt pistes y tient largement. */
export const PAGE_DE_PISTES = 100;
export const PAGES_AU_PLUS = 3;

/** Le lien d'une playlist Deezer, tel que le jeu le garde et le donne pour créer une room : « deezer:1306931615 ». */
export const lienDeezer = (id: string): string => `deezer:${id}`;

/** L'identifiant Deezer d'un lien du jeu, s'il en est un. */
export const idDeezer = (lien: string): string | undefined => /^deezer:(\d{1,20})$/.exec(lien)?.[1];

/** L'adresse où chercher des playlists. */
export const adresseDeRecherche = (recherche: string, combien: number): string =>
  `${API_DE_DEEZER}/search/playlist?q=${encodeURIComponent(recherche.trim())}&limit=${combien}`;

/** L'adresse d'une playlist (son titre, son nombre de titres), et celle d'une page de ses pistes. */
export const adresseDeLaPlaylist = (id: string): string => `${API_DE_DEEZER}/playlist/${id}`;
export const adresseDesPistes = (id: string, page: number): string =>
  `${API_DE_DEEZER}/playlist/${id}/tracks?index=${page * PAGE_DE_PISTES}&limit=${PAGE_DE_PISTES}`;

type Objet = Readonly<Record<string, unknown>>;
const objet = (x: unknown): Objet | undefined => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Objet) : undefined);
const texte = (x: unknown): string | undefined => (typeof x === 'string' && x.trim() !== '' ? x.trim() : undefined);
const nombre = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
const liste = (x: unknown): readonly unknown[] => (Array.isArray(objet(x)?.['data']) ? (objet(x)?.['data'] as unknown[]) : []);

/** Ce que Deezer dit quand il refuse : trop d'appels (il faut ralentir), rien à cette adresse, ou autre chose. */
export function erreurDeDeezer(reponse: unknown): 'quota' | 'introuvable' | 'autre' | undefined {
  const erreur = objet(objet(reponse)?.['error']);
  if (erreur === undefined) return undefined;
  const code = nombre(erreur['code']);
  // 4 : « Quota limit exceeded » ; 800 : « no data » ; 801 et 802 : un paramètre qui ne va pas.
  return code === 4 ? 'quota' : code === 800 || code === 801 || code === 802 ? 'introuvable' : 'autre';
}

/** Une lettre qui n'est pas de l'alphabet latin : un titre qui en a ne s'écrit pas avec nos caractères, ni ne se tape au clavier. */
const HORS_DE_L_ALPHABET = /(?=\p{L})\P{Script=Latin}/u;
const HORS_DE_L_ALPHABET_PARTOUT = new RegExp(HORS_DE_L_ALPHABET.source, 'gu');

/** Le titre d'une playlist, sans ce qu'il a hors de l'alphabet latin (« Anime Essentials 定番アニメ ») ; tel quel s'il n'avait que ça. */
const titreLisible = (titre: string): string => titre.replace(HORS_DE_L_ALPHABET_PARTOUT, '').replace(/\s+/g, ' ').trim() || titre;

/** Les playlists qu'une recherche a trouvées, dans l'ordre de Deezer. */
export function lireDesPlaylists(reponse: unknown): PlaylistTrouvee[] {
  return liste(reponse).flatMap((x) => {
    const p = objet(x);
    const id = nombre(p?.['id']);
    const titre = texte(p?.['title']);
    const total = nombre(p?.['nb_tracks']);
    return id !== undefined && titre !== undefined && total !== undefined && total > 0
      ? [{ lien: lienDeezer(String(id)), titre: titreLisible(titre), total }]
      : [];
  });
}

/** Le titre d'une playlist et son nombre de titres. */
export function lireLaPlaylist(reponse: unknown): { readonly titre: string; readonly total: number } | undefined {
  const p = objet(reponse);
  const titre = texte(p?.['title']);
  const total = nombre(p?.['nb_tracks']);
  return titre !== undefined && total !== undefined ? { titre: titreLisible(titre), total } : undefined;
}

/** Ce qui annonce un invité dans un titre : « (feat. Roméo Elvis) », « [ft. Vianney] », « (avec Vianney) ». */
const INVITE = /\s*[([](?:feat\.?|ft\.?|featuring|avec)\s+([^)\]]+)[)\]]/i;

/** La vignette d'une piste : une couleur et un motif tirés de son identifiant, toujours les mêmes pour elle. */
function vignetteDe(id: number): { readonly fond: (typeof FONDS_DE_POCHETTE)[number]; readonly motif: (typeof MOTIFS_DE_POCHETTE)[number] } {
  const fonds = FONDS_DE_POCHETTE.filter((f) => f !== 'creme');
  return {
    fond: fonds[id % fonds.length] ?? 'olive',
    motif: MOTIFS_DE_POCHETTE[Math.floor(id / fonds.length) % MOTIFS_DE_POCHETTE.length] ?? 'rayons',
  };
}

/** L'image d'une pochette chez Deezer, telle qu'il la sert : de chez lui, en JPEG, à sa taille. */
const IMAGE_DE_DEEZER = /^https:\/\/[a-z0-9-]+\.dzcdn\.net\/images\/cover\/[0-9a-f]{32}\/\d{2,4}x\d{2,4}-[0-9a-z-]+\.jpg$/;
/** Une empreinte d'image chez Deezer, d'où l'on tire son adresse quand il ne la donne pas. */
const EMPREINTE = /^[0-9a-f]{32}$/;

/**
 * La vraie pochette d'une piste : l'image de son album, en 500 × 500, celle que Deezer donne (« cover_big »), ou celle que son
 * empreinte désigne. Rien qui ne vienne de chez lui.
 */
function imageDe(p: Objet | undefined): string | undefined {
  const album = objet(p?.['album']);
  const grande = texte(album?.['cover_big']);
  if (grande !== undefined && IMAGE_DE_DEEZER.test(grande)) return grande;
  const empreinte = texte(album?.['md5_image']) ?? texte(p?.['md5_image']);
  return empreinte !== undefined && EMPREINTE.test(empreinte)
    ? `https://cdn-images.dzcdn.net/images/cover/${empreinte}/500x500-000000-80-0-0.jpg`
    : undefined;
}

/**
 * Une piste de Deezer, telle que le jeu la joue : sa réponse (titre, artiste, invité), sa vignette et sa vraie pochette, son extrait.
 * Rien si elle n'en a pas.
 */
export function lireUnePiste(x: unknown): PisteDuMode | undefined {
  const p = objet(x);
  const id = nombre(p?.['id']);
  const complet = texte(p?.['title']);
  const court = texte(p?.['title_short']) ?? complet;
  const artiste = texte(objet(p?.['artist'])?.['name']);
  const extrait = texte(p?.['preview']);
  if (id === undefined || court === undefined || artiste === undefined || extrait === undefined || p?.['readable'] === false) return undefined;
  if (!extrait.startsWith('https://')) return undefined;
  // Une réponse qu'on ne saurait ni montrer ni taper : la piste n'est pas jouable au blind test.
  if (HORS_DE_L_ALPHABET.test(court) || HORS_DE_L_ALPHABET.test(artiste)) return undefined;
  const feat = INVITE.exec(complet ?? '')?.[1]?.trim();
  const titre = court.replace(INVITE, '').trim();
  const image = imageDe(p);
  return {
    reponse: {
      titre,
      artiste,
      ...(feat !== undefined && feat !== '' ? { feat } : {}),
      pochette: { vignette: vignetteDe(id), ...(image !== undefined ? { image } : {}) },
    },
    extrait,
  };
}

/**
 * L'heure où expire le lien d'un extrait, en secondes depuis 1970, s'il la porte : Deezer signe ses liens
 * (« …mp3?hdnea=exp=1760000000~acl=…~hmac=… ») pour un temps.
 */
export function expirationDe(extrait: string): number | undefined {
  const exp = /[?&~=]exp=(\d{9,12})(?!\d)/.exec(extrait)?.[1];
  return exp !== undefined ? Number(exp) : undefined;
}

/** Un titre qu'on cherche chez Deezer : son nom et son premier artiste, tels qu'une autre source les donne. */
export interface TitreACherche {
  readonly titre: string;
  readonly artiste: string;
}

/** Combien de pistes on demande quand on cherche un titre : la bonne est presque toujours dans les premières. */
export const PISTES_PAR_RECHERCHE = 5;

/**
 * L'adresse où chercher un titre : par son artiste et son nom (la recherche avancée de Deezer, `artist:"…" track:"…"`), ou en vrac,
 * quand la première n'a rien trouvé. Le nom est cherché sans ce qui l'habille (« - Remastered 2011 », « (feat. …) »).
 */
export function adresseDeRechercheDeTitre(cherche: TitreACherche, precise: boolean): string {
  const nom = nomNu(cherche.titre);
  const q = precise ? `artist:"${cherche.artiste.replace(/"/g, '')}" track:"${nom.replace(/"/g, '')}"` : `${cherche.artiste} ${nom}`;
  return `${API_DE_DEEZER}/search/track?q=${encodeURIComponent(q)}&limit=${PISTES_PAR_RECHERCHE}`;
}

/** L'adresse d'une piste de Deezer : de quoi relire son extrait quand son lien a expiré. */
export const adresseDeLaPiste = (id: number): string => `${API_DE_DEEZER}/track/${id}`;

/** Le nom d'un titre, sans ce qui l'habille : ce qui suit un tiret (« - Remastered 2011 », « - Radio Edit »), ce qui est entre parenthèses ou crochets. */
export function nomNu(titre: string): string {
  const nu = titre
    .replace(/\s+[-–—]\s+.*$/, '')
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .trim();
  return nu !== '' ? nu : titre.trim();
}

/** Une chaîne qu'on compare : en minuscules, sans accents, sans rien d'autre que ses lettres et ses chiffres. */
const comparable = (x: string): string =>
  x
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}]/gu, '');

/** Vrai si deux noms disent la même chose, ou si l'un contient l'autre (« Bim Bam toi » et « Bim Bam toi (Radio Edit) »). */
function proches(un: string, autre: string): boolean {
  const [a, b] = [comparable(un), comparable(autre)];
  return a !== '' && b !== '' && (a === b || a.includes(b) || b.includes(a));
}

/**
 * Parmi les pistes qu'une recherche a trouvées, celle qui est ce titre : même nom et même artiste, aux accents et à l'habillage
 * près, et qu'on peut jouer. Rien si aucune ne l'est : mieux vaut sauter un titre que faire deviner une autre chanson.
 */
export function laBonnePiste(reponse: unknown, cherche: TitreACherche): { readonly id: number; readonly piste: PisteDuMode } | undefined {
  for (const x of liste(reponse)) {
    const p = objet(x);
    const id = nombre(p?.['id']);
    const nom = texte(p?.['title_short']) ?? texte(p?.['title']);
    const artiste = texte(objet(p?.['artist'])?.['name']);
    if (id === undefined || nom === undefined || artiste === undefined) continue;
    if (!proches(nomNu(nom), nomNu(cherche.titre)) || !proches(artiste, cherche.artiste)) continue;
    const piste = lireUnePiste(x);
    if (piste !== undefined) return { id, piste };
  }
  return undefined;
}

/** Une page des pistes d'une playlist : celles qu'on peut jouer, combien elle en compte en tout, et s'il reste des pages. */
export function lireDesPistes(reponse: unknown): { readonly pistes: PisteDuMode[]; readonly lues: number; readonly total: number | undefined } {
  const donnees = liste(reponse);
  return {
    pistes: donnees.flatMap((x) => {
      const piste = lireUnePiste(x);
      return piste !== undefined ? [piste] : [];
    }),
    lues: donnees.length,
    total: nombre(objet(reponse)?.['total']),
  };
}
