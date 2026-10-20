/**
 * Les légendes de la planche « Le tournoi » : son titre, ce que dit chaque section, le nom de chaque image ; et la partie
 * d'exemple : seize titres, leurs vignettes, qui gagne chaque duel et comment chacun vote, les deux façons de choisir le tournoi
 * sur la platine. Des données, en français, pour la planche seule : les textes du jeu sont dans ressources/textes.fr.ts.
 */

import type { Vignette } from '../../ressources/vignettes';

/** Un titre de la partie d'exemple : sa réponse, et la vignette qui tient lieu de sa pochette. */
export interface TitreDExemple {
  readonly titre: string;
  readonly artiste: string;
  readonly vignette: Vignette;
}

export const LEGENDES_DU_TOURNOI = {
  nom: 'Le tournoi de Honear',
  titre: 'Le tournoi',
  sousTitre: 'Deux titres par disque, on vote, la majorité passe : à valider avant l’écran',
  sections: {
    choisir: {
      titre: 'Choisir le tournoi',
      texte:
        'La manette a ses quatre places prises. Deux façons de choisir le tournoi étaient sur la table : il prend la place d’un mode (ici 1re note) ; ou deux crans, Blind test et Tournoi, se posent sous la platine, et la manette ne sert plus qu’au blind test. C’est la seconde qui est au jeu (toucher la manette ramène au blind test). Dans les deux, « Titres » se grave 8, 16, 32 : la taille du tableau ; « Secondes » garde son sens : ce qu’on peut écouter de chaque face. Au salon, la kraft dit le tournoi et ses titres, la touche « Lancer le tournoi ».',
    },
    duel: {
      titre: 'Un duel',
      texte:
        'Le regard est celui de la révélation : le disque entier, la tête du bras. Chaque face porte son titre comme le verso d’une piste, pochette au milieu. Chacun écoute à son rythme sur son téléphone : toucher le disque le retourne (le bras se lève, le disque tourne, le bras se repose, chaque face reprend où on l’avait laissée) ; glisser le doigt sur le disque y pose le bras : vers le bord, on revient en arrière. Une face finie lève le bras ; si l’on n’a pas encore entendu l’autre, le disque se retourne de lui-même. On vote en touchant une étiquette, on change d’avis tant que le duel n’est pas clos. L’éventail dit qui a voté, jamais pour quoi. Le duel se clôt quand tout le monde a voté, ou quand l’hôte le clôt : chacun passe alors sous sa face.',
    },
    fin: {
      titre: 'Entre deux duels, et à la fin',
      texte:
        'Entre deux duels, le tableau tient le rôle du hit-parade : les pochettes en rangs, de la moitié du haut à celle du bas, qui se rejoignent au milieu ; l’hôte lance le duel suivant. À la fin, le palmarès reprend les disques de la finale du blind test : diamant pour le vainqueur, platine pour le finaliste, or pour les demi-finalistes. L’oreille de la room classe, pour rire, qui a voté comme la majorité.',
    },
  },
  images: {
    reglagesManette: 'Variante 1 : le tournoi prend la place de 1re note sur la manette',
    reglagesSelecteur: 'Variante 2 : deux crans sous la platine, Blind test et Tournoi',
    salon: 'Le salon du tournoi, chez l’hôte',
    premier: 'Le premier duel : la face A joue, l’aide dit comment écouter l’autre',
    retourne: 'Le disque se retourne : le bras levé, la face B arrive',
    vote: 'Chez l’hôte : la face B joue, son vote enfoncé en kraft, trois ont voté ; il peut clore',
    cloture: 'La clôture : chacun sous sa face, leurs voix ; la face A passe',
    egalite: 'Trois partout : le disque tranche, comme une pièce',
    forfait: 'Une piste qui ne se joue plus : l’autre passe, sans vote',
    spectateur: 'Arrivé pendant un duel : on regarde, on vote au suivant',
    tableau: 'Entre deux duels : le tableau, et chez l’hôte « Duel suivant »',
    palmares: 'Le palmarès : les disques, le vainqueur, l’oreille de la room',
    tableauFini: 'Le tableau fini, qu’on revoit en touchant le papier du vainqueur',
  },
  /** La partie d'exemple : seize titres, dans l'ordre du tableau. */
  titres: [
    { titre: 'Voyage, voyage', artiste: 'Desireless', vignette: { fond: 'bleuFane', motif: 'rayons' } },
    { titre: 'Les Démons de minuit', artiste: 'Images', vignette: { fond: 'lilasFume', motif: 'rayons' } },
    { titre: 'Ouragan', artiste: 'Stéphanie', vignette: { fond: 'rougeTomate', motif: 'cercles' } },
    { titre: 'Femme libérée', artiste: 'Cookie Dingler', vignette: { fond: 'olive', motif: 'rayures' } },
    { titre: 'Toute première fois', artiste: 'Jeanne Mas', vignette: { fond: 'vieuxRose', motif: 'rayures' } },
    { titre: 'Tombé pour la France', artiste: 'Étienne Daho', vignette: { fond: 'bleuPetrole', motif: 'cercles' } },
    { titre: 'Marcia Baïla', artiste: 'Les Rita Mitsouko', vignette: { fond: 'orangeBrule', motif: 'rayures' } },
    { titre: 'Le Jerk', artiste: 'Thierry Hazard', vignette: { fond: 'creme', motif: 'rayures' } },
    { titre: 'Joe le taxi', artiste: 'Vanessa Paradis', vignette: { fond: 'olive', motif: 'rayons' } },
    { titre: 'Nuit de folie', artiste: 'Début de Soirée', vignette: { fond: 'lilasFume', motif: 'rayures' } },
    { titre: 'Les Lacs du Connemara', artiste: 'Michel Sardou', vignette: { fond: 'bleuPetrole', motif: 'rayures' } },
    { titre: 'Résiste', artiste: 'France Gall', vignette: { fond: 'rougeTomate', motif: 'rayons' } },
    { titre: 'Mise au point', artiste: 'Jakie Quartz', vignette: { fond: 'bleuFane', motif: 'cercles' } },
    { titre: 'Cendrillon', artiste: 'Téléphone', vignette: { fond: 'creme', motif: 'cercles' } },
    { titre: 'L’Aventurier', artiste: 'Indochine', vignette: { fond: 'orangeBrule', motif: 'rayures' } },
    { titre: 'Partenaire particulier', artiste: 'Partenaire Particulier', vignette: { fond: 'vieuxRose', motif: 'cercles' } },
  ] satisfies readonly TitreDExemple[],
  /**
   * La face qui passe à chaque duel, dans l'ordre de jeu (huitièmes, quarts, demies, finale), et comment : aux voix (la majorité
   * vote pour elle), à l'égalité (le hasard de la planche en décide), ou par forfait de l'autre.
   */
  duels: 'ABBAABABAABBABA',
  egalite: 10,
  forfait: 11,
  /** La graine du hasard de la partie d'exemple : le disque lancé comme une pièce, les places au tableau. */
  graine: 20261020,
  /** La graine de la pochette du joueur arrivé pendant un duel. */
  retardataire: 4242,
} as const;
