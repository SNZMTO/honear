/**
 * La source des listes sur mesure : celles que le MCP de Honear (mcp.honear.fr) enregistre, à la demande du modèle d'un
 * assistant (Claude, ChatGPT…) : « des chansons avec une couleur dans le titre », « les 30 ans de Léa ». Le MCP les range et
 * les sert sur un réseau que seul le jeu voit ; chacune nomme ses pistes par leur identifiant Deezer, et chaque piste se relit
 * chez Deezer (`deezer.ts`), pour son extrait. Une piste porte aussi ses surnoms : d'autres réponses justes, que le jugement
 * accepte en plus des siennes. Ce module ne parle pas au réseau : il dit quelle adresse lire, et ce qu'elle dit.
 */

import type { PisteDuMode } from '../../regles/modes';

/** Le lien d'une liste, tel que le jeu le garde et le donne pour créer une room : « liste:iTRYNDDqk3g0zBoA ». */
export const lienListe = (id: string): string => `liste:${id}`;

/** L'identifiant d'une liste : seize lettres, chiffres, « - » ou « _ ». Celui d'un lien du jeu, s'il en est un. */
export const ID_LISTE = /^[A-Za-z0-9_-]{16}$/;
export const idListe = (lien: string): string | undefined => {
  const id = /^liste:(.+)$/.exec(lien)?.[1];
  return id !== undefined && ID_LISTE.test(id) ? id : undefined;
};

/** L'adresse d'une liste chez le MCP, depuis son adresse interne (« http://honear-mcp:8791 »). */
export const adresseDeLaListe = (mcp: string, id: string): string => `${mcp}/listes/${id}`;

/** Ce qu'une piste d'une liste dit en plus de ce que Deezer en sait : d'autres façons justes de dire son artiste et son titre. */
type Surnoms = NonNullable<PisteDuMode['surnoms']>;

/** Une liste, telle que le MCP la donne : son nom, ses pistes par leur identifiant Deezer, et l'ordre où les jouer. */
export interface ListeLue {
  readonly titre: string;
  /** Vrai quand la difficulté monte : la room la joue dans cet ordre, sans la mélanger. */
  readonly dansLOrdre: boolean;
  readonly pistes: readonly { readonly deezer: number; readonly surnoms: Surnoms }[];
}

/** Ce qu'une liste porte au plus : ce que le MCP borne déjà, revérifié ici, d'où que vienne la réponse. */
const BORNES = { pistes: 50, titre: 60, surnoms: 3, surnom: 40 } as const;

type Objet = Readonly<Record<string, unknown>>;
const objet = (x: unknown): Objet | undefined => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Objet) : undefined);
const texte = (x: unknown, auPlus: number): string | undefined =>
  typeof x === 'string' && x.trim() !== '' && x.length <= auPlus ? x.replace(/\s+/g, ' ').trim() : undefined;
const textes = (x: unknown): string[] => (Array.isArray(x) ? x : []).flatMap((s) => texte(s, BORNES.surnom) ?? []).slice(0, BORNES.surnoms);

/** La liste qu'une réponse du MCP décrit ; rien si elle n'en décrit pas une (une liste oubliée, une réponse d'autre chose). */
export function lireLaListe(reponse: unknown): ListeLue | undefined {
  const liste = objet(reponse);
  const titre = texte(liste?.['nom'], BORNES.titre);
  const pistes = liste?.['pistes'];
  if (titre === undefined || !Array.isArray(pistes)) return undefined;
  return {
    titre,
    dansLOrdre: liste?.['dans_l_ordre'] === true,
    pistes: pistes.slice(0, BORNES.pistes).flatMap((x) => {
      const p = objet(x);
      const deezer = p?.['deezer'];
      if (typeof deezer !== 'number' || !Number.isSafeInteger(deezer) || deezer <= 0) return [];
      const surnoms = objet(p?.['surnoms']);
      return [{ deezer, surnoms: { artiste: textes(surnoms?.['artiste']), titre: textes(surnoms?.['titre']) } }];
    }),
  };
}
