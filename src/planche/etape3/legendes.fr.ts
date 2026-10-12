/**
 * Les mots de la planche du système visuel (étape 3), à part des textes du site : c'est un document de travail.
 * Et les quelques réglages de ses images : leurs marges, le détail du bras, l'instant où l'on montre les aiguilles.
 */

export const LEGENDES_DU_SYSTEME = {
  /** Le nom de la page, dans un onglet ou une galerie ; puis son titre, en tête. */
  nom: 'Système visuel Miel d’oreilles',
  titre: 'Miel d’oreilles, le système visuel',
  sousTitre: 'Étape 3 : chaque pièce du meuble, ses couleurs, ses caractères',

  /** Marge autour d'un objet cadré seul, son ombre comprise, en px. */
  marge: 20,
  /** Le bras de près : où on le prend dans le cadre du téléphone, sa taille. */
  bras: { coin: [206, 24], largeur: 176, hauteur: 362 },
  /** Les aiguilles du vumètre de près : dans le rouge, à la fin d'un extrait, proches mais pas identiques. */
  aiguillesDansLeRouge: [0.93, 0.87] as const,

  images: {
    meuble: 'Le meuble entier, comme l’écran de l’hôte le montrera : le bac à gauche, la platine au centre, l’ampli à droite',
    logo: 'Le logo : une étiquette miel, « Miel d’oreilles » en arc (étape 1)',
    platine: 'La platine au téléphone, densité fine (étape 1)',
    bras: 'Le bras de près, deux fois : la tête et son diamant, le contrepoids, le levier',
    ampliEteint: 'L’ampli éteint : aiguilles au repos, voyant sombre, bascule à gauche',
    ampliAllume: 'L’ampli allumé : voyant miel, aiguilles qui dansent, bascule à droite',
    vumetre: 'Un vumètre de près, trois fois : l’aiguille dans le rouge, à la fin d’un extrait',
    bac: 'Le bac à disques : un intercalaire par thème, une douzaine de playlists derrière',
    touches: 'Les touches : au repos, enfoncée de 2 px, une secondaire, un poussoir allumé',
    pastilles: 'Les pastilles : le décompte, une place gagnée, une perdue, une entrée, des messages courts',
    pochette: 'Une pochette de joueur, en 240 et en 48 px (étape 1)',
  },

  sections: {
    palette: {
      titre: 'La palette',
      texte:
        'Une valeur de base par couleur ; ses cinq tons se calculent, du plus sombre (0) au plus clair (4), le ton 2 étant la base. Deux tons voisins sont proches : deux facettes voisines ne claquent jamais.',
    },
    contrastes: {
      titre: 'Les encres',
      texte:
        'Sur chaque teinte, l’encre qui s’y lit le mieux, et son contraste avec le ton à plat de la teinte : 4,5 pour un texte, 3 pour un grand texte. Sur les teintes qui n’ont que 3, on n’écrit qu’en grand, ou sur une étiquette de papier crème, comme les onglets du bac.',
      colonnes: ['Teinte', 'Encre', 'Contraste', 'Pour'],
      texteCourant: 'texte',
      grandTexte: 'grand texte seulement',
      illisible: 'ni l’un ni l’autre',
    },
    typo: {
      titre: 'Les caractères',
      texte:
        'Caprasimo pour le titrage, gras et rond comme une pochette des années 70 ; Barlow Condensed pour le technique, étroit, en capitales espacées comme une façade d’ampli, à chiffres tabulaires.',
      titrage: 'Titrage · Caprasimo',
      technique: 'Technique · Barlow Condensed, 500 et 600',
      echantillons: {
        titrage: ['Miel d’oreilles', 'On pose un disque ?', 'Personne. Même pas honte ?'],
        technique: ['Piste 3 sur 15', 'Code KZRT', '0123456789', '1 111 · 4 444 · 7 070'],
      },
      echelle: 'L’échelle : huit échelons, chacun 1,2 fois le précédent',
    },
    meuble: { titre: 'Le meuble', texte: 'Le noyer sous la lampe, sa nappe de lumière en deux paliers, et ce qui s’y pose.' },
    logo: { titre: 'Le logo', texte: '' },
    platine: {
      titre: 'La platine et son bras',
      texte:
        'Telles qu’aux étapes 1 et 2 : le socle vert bouteille et ses vis, le plateau et ses repères, les commandes, le bras, sa tête, son contrepoids et son levier.',
    },
    ampli: {
      titre: 'L’ampli',
      texte:
        'De la même famille que la platine : laque vert bouteille, commandes d’aluminium, gravures crème. Deux vumètres, le gros bouton du volume (un cran tous les 15°), l’interrupteur « Allume l’ampli » et son voyant. Les aiguilles, l’index, la bascule et le voyant sont des calques à part, avec leurs ombres.',
    },
    bac: {
      titre: 'Le bac',
      texte:
        'Une caisse de lattes, sa poignée ; les pochettes des playlists debout, un peu penchées en arrière, derrière un intercalaire de couleur par thème. Les onglets de trois intercalaires qui se suivent ne tombent jamais au même endroit. Chaque intercalaire et chaque pochette est un calque à part.',
    },
    touches: {
      titre: 'Les touches',
      texte:
        'Un capuchon chanfreiné dans le puits d’un socle de laque. Pressé, il s’enfonce de 2 px et son ombre au fond du puits raccourcit : 60 ms pour descendre, 80 pour remonter, arrêt net, rien au survol. Celles-ci se pressent.',
    },
    pastilles: { titre: 'Les pastilles', texte: 'Un rond de papier miel, toujours de travers, qui dit une chose courte.' },
    pochette: { titre: 'La pochette', texte: '' },
  },
} as const;
