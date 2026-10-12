/**
 * Les textes de la planche d'animations : ce qu'elle dit d'elle-même, ses commandes, et la façon dont elle écrit les réglages et les
 * temps de chaque geste. Les titres et les textes des animations sont ceux des pellicules de l'étape 5.
 */

export const LEGENDES_DE_LA_PLANCHE = {
  nom: 'La planche d’animations',
  titre: 'La planche d’animations',
  sousTitre: 'Étape 7 de Miel d’oreilles : chaque animation, seule, jouée en direct',
  intro:
    'Chaque animation se rejoue seule, au ralenti si l’on veut, en version sobre, et s’interrompt à mi-course. Pendant qu’elle joue, rien n’est redessiné : la scène est montée une fois, puis le moteur du site ne règle plus que des transformations et des opacités, image après image. C’est ce qui tourne sur le téléphone. Interrompue, elle reprend d’où elle est, avec sa vitesse : l’état a changé, rien ne saute.',
  ailleurs:
    'Le décompte, l’extrait, la rayure et la révélation du disque sont joués par l’atelier de l’étape 2, avec leurs propres réglages : ils n’ont pas de fiche ici.',
  reduites: 'Cet appareil demande de réduire les animations : la version sobre est cochée partout. Décochez-la pour voir le mouvement.',
  attente: 'La scène se monte quand on arrive dessus.',
  panne: 'Cette animation n’a pas pu être montée dans ce navigateur.',
  commandes: {
    groupe: 'Commandes de l’animation',
    rejouer: 'Rejouer',
    vitesse: 'Vitesse',
    vitesses: [
      { vitesse: 1, libelle: '×1' },
      { vitesse: 0.5, libelle: '×0,5' },
      { vitesse: 0.25, libelle: '×0,25' },
    ],
    sobre: 'Version sobre',
    interrompre: 'Interrompre à {instant}',
  },
  etats: {
    repos: 'Au repos, à son départ.',
    joue: 'Elle joue.',
    interrompue: 'Interrompue à {instant} : elle reprend d’où elle est.',
    finie: 'Arrivée.',
  },
  fiche: {
    reglages: 'Ses réglages',
    coups: 'Coups donnés en route',
    coup: '{grandeur} à {instant} : {vitesse} par seconde',
    vibre: 'Le téléphone vibre à {instants}.',
    frise: 'Ses temps',
    reprise: 'Interrompue à {instant}, le geste qui reprend',
    tous: 'Tous ses pas, un par un',
    colonnes: { grandeur: 'Grandeur', part: 'Part à', va: 'Va à', porte: 'Porté par', arrive: 'Arrivé à' },
    vibreur: 'vibreur',
  },
  regles: {
    ressort: 'Ressort : raideur {raideur}, amortissement {amortissement}, masse {masse} ; arrivé en {duree}',
    glissade: 'Glissade : frein {frein} px/s², de moins en moins vite, arrêtée net en {duree}',
    chute: 'Chute qui claque : en {duree}',
    loi: {
      reguliere: 'D’un mouvement régulier, en {duree}',
      ecrite: 'Loi écrite du geste, en {duree}',
    },
    pour: '— {grandeurs}',
    court: { ressort: 'ressort', glissade: 'glissade', chute: 'chute', loi: 'loi' },
  },
  unites: { ms: '{n} ms', s: '{n} s' },
} as const;
