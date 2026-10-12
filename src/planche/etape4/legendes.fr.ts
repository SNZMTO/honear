/**
 * Les mots de la planche « Fais ta pochette » (étape 4), à part des textes du site : c'est un document de travail.
 * Et les réglages de ses images : leurs tailles, les graines de ses tirages au sort.
 */

export const LEGENDES_DE_LA_POCHETTE = {
  nom: 'Fais ta pochette',
  titre: 'Fais ta pochette',
  sousTitre: 'Étape 4 de Honear : l’avatar en attendant les personnages, ses choix, ses expressions, les motifs, le hasard',

  /** Les tailles des pochettes de la planche, en px : celles des choix, des expressions, des tirages au sort, des exemples. */
  tailles: { calque: 150, expression: 132, ecran: 228, exemple: 210 },
  /** La graine des douze tirages de la touche « Au hasard », et celle des douze exemples tirés au sort. */
  graines: { auHasard: 2026, exemples: 1986 },
  /** Combien de pochettes la touche « Au hasard » de la planche fait défiler. */
  tirages: 12,
  /** La marge autour d'une pochette cadrée seule, en px. */
  marge: 6,
  /**
   * Les douze pochettes sur le noyer : quatre par rang, le pas d'une pochette à l'autre (la profondeur écrasée par la vue
   * de biais, et l'écart), le centre de la première, la marge du bois autour ; et le pas de l'éventail en 48 px.
   */
  grille: { colonnes: 4, pas: [244, 225], premier: [131, 120], marge: 20, pasEnPetit: 56 },

  sections: {
    ecran: {
      titre: 'L’écran',
      texte:
        'À l’arrivée, une pochette tirée au hasard et un nom d’artiste sont déjà prêts : « C’est moi » suffit. Le nom se corrige sur l’étiquette vierge, l’album se relance, la tête et ce qu’on porte dessus se choisissent d’un geste.',
    },
    choix: {
      titre: 'L’avatar, et ses deux choix',
      texte:
        'En attendant de vrais personnages, un avatar très simple : une tête taillée en une dizaine de facettes, un visage, des épaules. On choisit la forme de la tête et ce qu’on porte dessus ; la peau, les cheveux et la tenue prennent les couleurs de la palette. Tout se pose d’après la forme de la tête, et rien ne descend sur les sourcils.',
    },
    expressions: {
      titre: 'Les quatre expressions',
      texte:
        'Concentré, content, dépité, endormi : elles changent d’un coup et se lisent sur les sourcils, les paupières et la bouche, à 48 px comme en grand.',
      noms: { concentre: 'Concentré', content: 'Content', depite: 'Dépité', endormi: 'Endormi' },
    },
    motifs: { titre: 'Les motifs', texte: 'Une couleur de fond et un motif, en deux tons voisins : le nom et l’album s’y lisent toujours.' },
    hasard: {
      titre: 'Au hasard',
      texte:
        'Une pochette complète en un geste : fond, motif, tête, ce qu’il y a dessus, peau, cheveux, tenue, un nom d’artiste et un album. Le fond n’est jamais la couleur de la peau, des cheveux ni de la tenue. Presse la touche : voici douze tirages, dans l’ordre.',
    },
    exemples: {
      titre: 'Douze pochettes',
      texte: 'Douze pochettes tirées au sort, posées sur le noyer comme en jeu, et les mêmes en 48 px.',
    },
    listes: {
      titre: 'Les noms d’artiste et les albums',
      artistes: 'Vingt noms d’artiste, proposés d’office',
      albums: 'Quarante titres d’album, tirés au sort',
    },
  },
} as const;
