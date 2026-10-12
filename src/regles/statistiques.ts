/**
 * Ce que la page des statistiques reçoit de son serveur : la forme des données, que le serveur tient (voir reseau/statistiques.ts)
 * et que la page montre (voir ecran/statistiques). Des compteurs par clé, depuis toujours et jour par jour, quelques classements,
 * des records, et ce qui se passe en ce moment. Rien de personnel.
 */

/** Des compteurs : un nombre par clé (« rooms », « rooms.mode.libre », « reponses.juste »…). */
export type Compteurs = Record<string, number>;

/** Un titre joué : combien de fois, et combien de fois quelqu'un a trouvé quelque chose. */
export interface TitreCompte {
  readonly titre: string;
  readonly artiste: string;
  readonly joues: number;
  readonly trouves: number;
}

/** Une playlist : son titre quand on le connaît, combien de rooms l'ont prise, combien de faces y ont été jouées jusqu'au bout. */
export interface PlaylistComptee {
  readonly titre?: string;
  readonly choisies: number;
  readonly faces: number;
}

/** Un record : sa valeur, et le jour où il a été battu. */
export interface Exploit {
  readonly valeur: number;
  readonly le: string;
}

/** Une room vue d'un coup d'œil, sans rien de ceux qui y jouent. */
export interface RoomEnDirect {
  readonly mode: string;
  readonly phase: 'salon' | 'pistes' | 'fin';
  readonly face: 'A' | 'B';
  readonly joueurs: number;
  /** Ceux dont le téléphone est branché. */
  readonly branches: number;
  readonly pistesJouees: number;
  readonly pistes: number;
  /** Depuis combien de secondes elle est ouverte. */
  readonly age: number;
}

/** Ce qui se passe en ce moment, que le serveur sait sans rien garder. */
export interface EnDirect {
  readonly rooms: readonly RoomEnDirect[];
  readonly telephones: number;
  /** Combien de comptes existent ; rien, si le site n'en a pas. */
  readonly comptes?: number;
  /** La version de la page en ligne, et depuis combien de secondes le serveur tourne. */
  readonly version?: string;
  readonly depuis: number;
}

/** Ce que la page des statistiques montre. */
export interface VueDesStatistiques {
  /** Le jour qu'il est, à l'heure de ceux qui jouent, et l'heure qu'il est (« 21:04 »). */
  readonly aujourdhui: string;
  readonly heure: string;
  /** Le premier jour compté. */
  readonly depuis: string | undefined;
  readonly enDirect: EnDirect;
  readonly totaux: Compteurs;
  /** Les derniers jours, du plus ancien à aujourd'hui, sans trou : leur jour de la semaine (0 le dimanche), et leurs compteurs. */
  readonly jours: readonly { readonly jour: string; readonly semaine: number; readonly compteurs: Compteurs }[];
  /** Les pages ouvertes, par heure de la journée (de 0 à 23) et par jour de la semaine (0 le dimanche), depuis toujours. */
  readonly heures: readonly number[];
  readonly semaine: readonly number[];
  readonly titres: { readonly joues: readonly TitreCompte[]; readonly durs: readonly TitreCompte[] };
  readonly playlists: readonly (PlaylistComptee & { readonly lien: string })[];
  readonly recherches: readonly { readonly recherche: string; readonly fois: number }[];
  readonly records: Readonly<Record<string, Exploit>>;
}
