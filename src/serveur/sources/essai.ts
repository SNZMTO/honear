/**
 * La source d'essai : une playlist de quarante tubes, sans le son, pour jouer en ligne avant que Deezer n'arrive. Chaque piste a sa
 * réponse (titre, artiste, son invité s'il en a un, son année) et une vignette, jamais la copie d'une vraie pochette. Elle est
 * assez longue pour une face A et une face B de vingt pistes.
 */

import type { PisteDuMode } from '../../regles/modes';
import { FONDS_DE_POCHETTE, MOTIFS_DE_POCHETTE } from '../../ressources/pochettes';

/** Son nom, dans le bac : c'est ce que « Celle-là » choisit, en attendant les playlists de Deezer. */
export { PLAYLIST_D_ESSAI } from '../../ressources/bac';

/** Les tubes : titre, artiste, année, et l'invité quand il y en a un. */
const TUBES: readonly (readonly [string, string, number, string?])[] = [
  ['Les Démons de minuit', 'Images', 1986],
  ['Voyage, voyage', 'Desireless', 1986],
  ['Femme libérée', 'Cookie Dingler', 1984],
  ['Ouragan', 'Stéphanie', 1986],
  ['Joe le taxi', 'Vanessa Paradis', 1987],
  ['Born to Be Alive', 'Patrick Hernandez', 1979],
  ['Tout oublier', 'Angèle', 2018, 'Roméo Elvis'],
  ['Alors on danse', 'Stromae', 2009],
  ['Je veux', 'Zaz', 2010],
  ['Dernière danse', 'Indila', 2013],
  ['La Bohème', 'Charles Aznavour', 1965],
  ['Les Champs-Élysées', 'Joe Dassin', 1969],
  ['L’Aventurier', 'Indochine', 1982],
  ['Femme Like U', 'K-Maro', 2004],
  ['Sous le vent', 'Garou', 2001, 'Céline Dion'],
  ['Pour que tu m’aimes encore', 'Céline Dion', 1995],
  ['Toi + Moi', 'Grégoire', 2008],
  ['Elle me dit', 'Mika', 2011],
  ['Désenchantée', 'Mylène Farmer', 1991],
  ['Foule sentimentale', 'Alain Souchon', 1993],
  ['Le Sud', 'Nino Ferrer', 1975],
  ['Ella, elle l’a', 'France Gall', 1987],
  ['Mistral gagnant', 'Renaud', 1985],
  ['Allumer le feu', 'Johnny Hallyday', 1998],
  ['Les Lacs du Connemara', 'Michel Sardou', 1981],
  ['Bella', 'Maître Gims', 2013],
  ['Djadja', 'Aya Nakamura', 2018],
  ['Andalouse', 'Kendji Girac', 2014],
  ['Balance ton quoi', 'Angèle', 2019],
  ['Ces soirées-là', 'Yannick', 2000],
  ['Moi… Lolita', 'Alizée', 2000],
  ['Casser la voix', 'Patrick Bruel', 1989],
  ['Chanson sur ma drôle de vie', 'Véronique Sanson', 1973],
  ['Maldòn', 'Zouk Machine', 1990],
  ['La Tribu de Dana', 'Manau', 1998],
  ['Ma philosophie', 'Amel Bent', 2004],
  ['Mon fils ma bataille', 'Daniel Balavoine', 1980],
  ['Papaoutai', 'Stromae', 2013],
  ['Résiste', 'France Gall', 1981],
  ['Évidemment', 'Kendji Girac', 2023, 'Vianney'],
];

/** Les fonds des vignettes : ceux des pochettes, sauf le crème, qui se confondrait avec le papier. */
const FONDS = FONDS_DE_POCHETTE.filter((f) => f !== 'creme');

/** La playlist d'essai, dans l'ordre où elle se joue : la face A, puis la face B. */
export const PISTES_D_ESSAI: readonly PisteDuMode[] = TUBES.map(([titre, artiste, annee, feat], rang) => ({
  reponse: {
    titre,
    artiste,
    annee,
    ...(feat !== undefined ? { feat } : {}),
    pochette: {
      vignette: { fond: FONDS[rang % FONDS.length] ?? 'olive', motif: MOTIFS_DE_POCHETTE[(rang * 3) % MOTIFS_DE_POCHETTE.length] ?? 'rayons' },
    },
  },
}));
