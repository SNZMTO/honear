/**
 * Le lexique du projet, fixé au départ : un seul nom par chose, le même dans le design,
 * le code et les messages. Le nom d'un calque commence toujours par un mot de ce lexique :
 * c'est le compilateur qui le vérifie (voir `NomDeCalque`).
 */

export const LEXIQUE = {
  // Le jeu.
  room: 'Une partie entre potes, ouverte par un hôte et rejointe avec un code de 4 lettres.',
  piste: 'Une manche : un extrait à reconnaître. « Piste 3 sur 15 ».',
  phase: 'L’une des trois parties du déroulé d’une piste : le décompte, l’extrait, la révélation.',
  rayure: 'Ce que fait une mauvaise réponse pendant l’extrait : le disque revient en arrière, comme un scratch, puis reprend sa vitesse.',
  hote: 'Le joueur qui tient la platine : il choisit la playlist, règle et lance la partie.',

  // Le meuble et ce qui s’y pose.
  meuble: 'Le dessus du meuble hi-fi en noyer : tout le jeu s’y passe, on ne change jamais de page.',
  regard: 'La portion du meuble qu’un écran laisse voir. On ne change pas de page, on déplace le regard.',
  noyer: 'Le bois du meuble, veiné de longues facettes.',
  lampe: 'La seule lumière, chaude, hors champ en haut à gauche. Elle ne bouge jamais.',
  nappe: 'La zone plus claire que la lampe pose sur le bois, en deux paliers.',
  platine: 'Au centre du meuble : c’est la manche.',
  bac: 'Le bac à disques, à gauche : ce sont les playlists.',
  ampli: 'À droite : c’est le son. « Allume l’ampli » sert de test du son ; son gros bouton règle le volume.',
  vumetre: 'L’un des deux cadrans de l’ampli, gauche et droite : son aiguille dit le son, sans jamais l’analyser.',
  aiguille: 'L’aiguille d’un vumètre : nerveuse, elle monte vite, retombe moins vite, et passe dans le rouge à la fin d’un extrait.',
  voyant: 'La petite lampe de l’ampli : sombre éteint, miel allumé. Jamais de halo.',
  intercalaire: 'Un carton de couleur du bac, un par thème : son onglet porte le titre de la section.',
  latte: 'Une planche du bac à disques.',
  pochette: 'Un joueur : son avatar imprimé, son nom d’artiste, le titre de son album.',
  miniature: 'Une pochette en petit, comme en jeu (48 px) : plus de texte, l’avatar recadré plus serré.',
  pastille: 'Une pastille de disquaire : un message court, ou un point marqué.',
  kraft: 'La pochette en papier kraft du disque mystère, posée à côté de la platine : le disque en sort au décompte.',
  vignette: 'Ce qui tient lieu de vraie pochette dans les maquettes : une couleur et un motif, jamais la copie d’une vraie.',

  // La platine, pièce par pièce.
  socle: 'La boîte en laque vert bouteille qui porte tout le reste.',
  charniere: 'Les charnières du capot, au fond du socle.',
  plateau: 'Le cylindre d’aluminium qui porte le disque.',
  feutrine: 'Le tapis couleur miel du plateau.',
  reperes: 'Les marques stroboscopiques de la jante du plateau : la seule chose du plateau qui tourne.',
  disque: 'Le disque mystère. Son vinyle garde ses deux reflets fixes sous la lampe.',
  recto: 'Le côté mystère du disque : celui qui tourne pendant l’extrait, étiquette masquée.',
  verso: 'Le côté réponse du disque : il se retourne à la révélation, et montre la pochette, le titre et l’artiste.',
  etiquette: 'L’étiquette au centre du disque : c’est l’information (logo, code de la room, numéro de la piste).',
  arcs: 'Ce qui remplace le texte d’une étiquette tant que le disque tourne : des arcs concentriques de longueurs inégales.',
  axe: 'L’axe du plateau, qui dépasse au centre du disque.',
  bras: 'Le bras de lecture : c’est le chrono. Il va du bord du disque à l’étiquette.',
  levier: 'La manette qui lève et baisse le bras.',
  bouton: 'Un bouton à crans gravés, qu’on tourne : un réglage. Son index dit le cran choisi.',
  cran: 'L’une des positions d’un réglage, dont une seule est choisie : gravée autour d’un bouton de la platine, ou touche d’un groupe de l’atelier.',
  interrupteur: 'Un interrupteur à bascule : un réglage à deux positions.',
  logo: 'L’étiquette de disque couleur miel, « Honear » écrit en arc.',

  // L'avatar.
  avatar: 'Le joueur dessiné, en attendant de vrais personnages : une tête taillée en quelques facettes, un visage, ce qu’il porte sur la tête.',

  // Le dessin.
  facette: 'Un petit polygone à plat, d’une seule teinte.',
  teinte: 'Une couleur de la palette, par sa valeur de base.',
  ton: 'L’un des 5 tons d’une teinte, du plus sombre (0) au plus clair (4). Le ton 2 est la valeur de base.',
  nuance: 'Un ton de plus ou de moins que ce que donne la lampe : une veine, une strie, une surface à l’abri.',
  fini: 'La façon dont une surface répond à la lampe : mate, ou à sillons comme le vinyle.',
  encre: 'La couleur d’un texte ou d’un trait imprimé : son ton est choisi à la main, pas par la lampe.',
  calque: 'Un groupe de dessins qu’on déplace en réglant ses transformations : chaque pièce qui bouge a le sien.',
  decor: 'Tout ce qui ne bouge pas : dessiné une fois, puis figé.',
  image:
    'Une pièce entière figée en image dès qu’elle est prête, puis déplacée telle quelle : le vinyle, une pochette, le corps d’un bouton. ' +
    'Hors de ce rôle de calque, le mot garde son sens courant, toujours précisé : une image de l’animation (soixante par seconde), une image de planche.',
  mobile: 'Un calque qui bouge et reste en polygones : il en compte moins de 150.',
  ombre: 'L’ombre portée d’une pièce, en deux ou trois paliers, toujours vers le bas à droite.',
  palier: 'Une marche d’une ombre ou de la nappe de lumière.',
  pile: 'Un objet posé à plat qui peut tourner sur lui-même, fait d’étages empilés.',
  scene: 'Le meuble et ses objets, tels qu’ils sont dessinés : un arbre de calques.',
  densite: 'La finesse du découpage en facettes : fine, celle du site, ou sobre, celle du mode léger.',
  sobre:
    'Deux emplois, ceux du brief, jamais sans le nom qu’ils qualifient : la densité sobre, le dessin le plus économe ; ' +
    'la version sobre, celle de qui a demandé à son appareil de réduire les animations.',

  // Le mouvement.
  matiere: 'La façon de bouger d’une pièce : un ressort, un volant ou une chute freinée, lus dans la table des réglages de mouvement.',
  ressort: 'Ce qui ramène une pièce à sa place, par sa raideur, son amortissement et sa masse.',
  volant: 'Une masse qui tourne, qu’un moteur lance et que le frottement arrête : le plateau et son disque.',
  grandeur: 'Ce que le moteur de mouvement fait bouger : un angle, une hauteur, une position.',
  consigne: 'La place où une grandeur doit se rendre, ou la course qu’elle doit suivre, à un instant de l’horloge.',
  partition: 'Toutes les consignes d’une chorégraphie, à tout instant de l’horloge du serveur.',
  signal:
    'Un instant de la piste depuis lequel on compte les départs : un chiffre du décompte, l’extrait, une rayure, la révélation, l’arrêt du disque.',
  geste: 'Ce qu’on voit partir, compté depuis un signal : une pièce change de consigne, ou reçoit un coup.',
  coup: 'Un élan donné d’un seul coup à une grandeur : sa vitesse change, pas sa position. Le diamant qui touche, le bras qui tressaute.',
  pose: 'Où est chaque pièce qui bouge à un instant donné : ce que le dessin lit, et ce que le mouvement règle.',

  // L’écran.
  toile: 'Une image figée du décor ou d’une pièce : peinte une fois, puis montrée telle quelle.',
  montage: 'Une scène posée dans la page d’un navigateur : des toiles pour ce qui est figé, du SVG pour ce qui reste en polygones.',
  facture: 'Ce qui fait une scène montée telle qu’elle est : sa densité, ses ombres animées ou figées, la définition de ses toiles.',
  allegement:
    'Ce qu’on retire à la scène pour un appareil qui peine : les réactions, les ombres animées, la moitié de la définition, la densité fine.',
  touche: 'Ce qu’on presse : 2 px de course, et l’action part à l’instant du toucher.',
  poussoir: 'Une touche qui reste enclenchée jusqu’à ce qu’on la presse de nouveau : une option.',
  libelle: 'Le nom écrit sur une touche ; pour un cran, c’est lui qu’on presse.',

  // Les documents de travail.
  planche: 'Un document de travail d’une étape : il montre ce qui est dessiné, ou le rejoue.',
  atelier: 'La planche de l’étape 2 : la piste d’exemple, qu’on rejoue, ralentit et interrompt.',
  seance: 'Une piste écrite d’avance pour l’atelier, action par action, comme un serveur la jouerait.',
  moment: 'L’un des cinq points d’où l’atelier rejoue la piste : le décompte, l’attente, l’extrait, la rayure, la révélation.',
  legende: 'Une annotation d’un document de travail, hors du jeu.',
  facade: 'Les touches de l’atelier, rangées en groupes sous leur nom gravé.',
  ancre: 'Le nom par lequel le script d’une page y retrouve l’un de ses éléments.',
  minutage: 'Les temps d’un document de travail : le déroulé de sa séance, les instants de ses images.',
  banc: 'Le banc d’essai : l’atelier rejoué dans un navigateur au processeur ralenti, pour mesurer ce que coûte une image.',
  releve: 'Ce que le banc a mesuré d’une scène : son premier dessin, puis ce que coûte une image pendant chaque phase de la piste.',
} as const;

export type Terme = keyof typeof LEXIQUE;

/**
 * Le nom d'un calque : un mot du lexique, qu'on peut préciser (« bouton-mode ») et prolonger
 * pour nommer ce qu'il contient (« bouton-mode/index »). L'ombre d'une pièce porte son nom suivi de « /ombre » ;
 * celle qu'elle porte sur une autre surface que la sienne nomme ensuite cette surface (« bras/ombre/plateau »).
 */
export type NomDeCalque = Terme | `${Terme}-${string}` | `${Terme}/${string}`;
