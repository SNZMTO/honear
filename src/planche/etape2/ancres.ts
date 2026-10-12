/**
 * Les ancres de la page de l'atelier : les noms par lesquels le gabarit, qui écrit la page, et le script, qui l'anime,
 * désignent les mêmes éléments. Un seul endroit, pour qu'ils ne puissent pas se manquer.
 */

export const ANCRES = {
  /** L'établi : toute la page de l'atelier. C'est lui qui porte la classe qui dit où en est la scène (voir plus bas). */
  etabli: 'etabli',
  /** La place que la page laisse à la scène, et le cadre de téléphone qui s'y ajuste : c'est dans le cadre que la scène est montée. */
  place: 'place',
  cadre: 'cadre',
  /** La variable de style par laquelle le script donne au cadre sa largeur, en px : la place la porte. */
  largeurDuCadre: '--largeur',
  /** La façade : les touches. */
  facade: 'facade',
  /** Ce que l'atelier dit de la séance, et le temps écoulé de l'extrait. */
  etat: 'etat',
  chrono: 'chrono',
  /** Les touches de ce qui peut arriver en plein extrait : une mauvaise réponse, la révélation avant l'heure. */
  rayer: 'rayer',
  reveler: 'reveler',
  /** Ce que la page dit à qui a demandé moins d'animations, et la touche qui les lui rend. */
  avis: 'avis',
  toutAnimer: 'tout-animer',
  /** Ce que le cadre ajoute à sa phrase quand le navigateur ne sait pas montrer la scène : ce qui lui manque. */
  manques: 'manques',
  /** Les attributs que portent les touches : le moment qu'elles rejouent, le poussoir qu'elles sont, la mesure qu'elles affichent. */
  moment: 'data-moment',
  poussoir: 'data-poussoir',
  mesure: 'data-mesure',
  /** Les groupes de boutons à crans : la vitesse du temps, le verso du disque. */
  ralenti: 'ralenti',
  verso: 'verso',
  /** La classe du cran choisi. */
  choisi: 'choisi',
  /**
   * Les classes de l'établi. « demarre » : le script de la page a été compris et s'est lancé, c'est lui qui dira la suite.
   * « en-marche » : la scène est montée. « en-panne » : elle n'a pas pu l'être, ou le script n'a jamais démarré.
   */
  demarre: 'demarre',
  enMarche: 'en-marche',
  enPanne: 'en-panne',
} as const;

/** Les poussoirs de l'atelier, des touches qui restent enfoncées : la version sobre, le mode léger. */
export const POUSSOIRS = ['sobre', 'leger'] as const;
export type Poussoir = (typeof POUSSOIRS)[number];

/** Les mesures que la page tient à jour. */
export const MESURES_AFFICHEES = ['montage', 'parImage', 'entreDeux', 'toiles'] as const;
export type MesureAffichee = (typeof MESURES_AFFICHEES)[number];

/** L'identifiant de l'aide d'une touche, dans le mode d'emploi : c'est ce qu'entend qui s'arrête sur elle. */
export const aideDe = (cle: string): string => `aide-${cle}`;
