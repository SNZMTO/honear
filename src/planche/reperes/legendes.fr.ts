/**
 * Les légendes de la planche « Ce qui se touche » : son titre, ce que dit chaque façon de le signaler, le nom de chaque écran. Des
 * données, en français, pour la planche seule : les textes du jeu sont dans ressources/textes.fr.ts.
 */

export const LEGENDES_DES_REPERES = {
  nom: 'Ce qui se touche, dans Honear',
  titre: 'Ce qui se touche',
  sousTitre:
    'Les touches ont l’air de touches ; le reste (les boutons de la platine, les noms autour de la manette, les étiquettes, le disque) ne le dit pas. Trois façons de le signaler, à choisir avant de les poser à chaque étape.',
  variantes: {
    aujourdhui: {
      titre: 'Aujourd’hui',
      texte: 'Rien ne signale ce qui se touche, hors des touches : il faut le savoir, ou essayer.',
    },
    coins: {
      titre: 'A. Les coins de visée',
      texte:
        'Quatre coins miel autour de ce qui se touche, comme un viseur : nets, sans rien cacher, ils se lisent sur la laque comme sur le bois. Ils pourraient respirer doucement tant qu’on n’a rien touché (rien en version sobre).',
    },
    pointilles: {
      titre: 'B. Le pointillé',
      texte:
        'Un pointillé miel tout autour, comme une découpe : très lisible, mais plus chargé quand plusieurs choses se touchent côte à côte (la manette et ses deux noms).',
    },
    pastilles: {
      titre: 'C. La pastille au coin',
      texte:
        'Une petite pastille de disquaire au coin de ce qui se touche, une flèche crème dedans, tournée vers lui : la plus discrète, dans le langage des pastilles du jeu ; elle ne dit pas jusqu’où va la zone.',
    },
  },
  ecrans: { reglages: 'Les réglages', bac: 'Le bac', duel: 'Un duel' },
  note: 'Les touches gardent leur allure : elles ont déjà l’air de touches. Le choix en cours (le cran allumé, la manette couchée vers son nom) se lit comme aujourd’hui.',
} as const;
