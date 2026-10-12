/**
 * Les mots de l'atelier de l'étape 2 : ses touches, son mode d'emploi, ce qu'il dit de la séance, sa liste des temps.
 * Ce sont des annotations de document de travail : elles ne sont jamais affichées dans le jeu.
 * Un même mot y désigne toujours la même chose : un « moment » d'où l'on rejoue la piste, une « phase » de son déroulé,
 * une « toile », le « mode léger ».
 */

import type { GenreDeVerso } from '../../scene/disque/verso';
import type { NomDeGeste } from '../../scene/piste/gestes/vocabulaire';
import type { Signal } from '../../scene/piste/instants';
import type { MesureAffichee, Poussoir } from './ancres';
import type { ReleveDeBanc, SceneDeBanc } from './banc';
import type { Moment } from './seance';

/** Une note de la liste des temps : ce qui se voit sans avoir d'heure de départ, et ce qui le fait bouger. */
interface Note {
  readonly quoi: string;
  readonly comment: string;
}

const AVEC_L_AMPLI = 'à venir avec l’ampli, à l’étape 3';

export const LEGENDES = {
  titre: 'La platine en mouvement',
  chapeau: 'Étape 2 de Honear : le décompte, l’extrait, la rayure et la révélation.',
  /** Ce qu'on peut y faire : la phrase se retire quand la scène ne peut pas se montrer. */
  consigne: 'Rejoue la piste depuis l’un de ses moments, ralentis-la, raye le disque, révèle avant l’heure.',

  /** Ce que le cadre dit à un lecteur d'écran, une fois la scène montée. */
  cadre: 'La platine vue de dessus, dans un cadre de téléphone',

  /** Les images de la piste, arrêtée à ses instants marquants ; et le titre d'une image de pellicule, arrêtée où l'on veut. */
  images: {
    repos: 'Avant la piste : le disque dans sa pochette kraft',
    sortie: 'Au « 3 » : le disque glisse hors de sa pochette',
    vol: 'Au « 3 » : il passe au-dessus du plateau, son ombre écartée',
    arcsCourts: 'Au « 2 » : le plateau prend sa vitesse, le texte s’étire en traînée et se fond en arcs',
    brasLeve: 'Au « 1 » : le bras, levé, arrive au bord du disque',
    extrait: 'Pendant l’extrait : les arcs tournent, le bras avance',
    rayure: 'Une mauvaise réponse : le disque revient en arrière',
    ralentit: 'À la révélation : le disque ralentit, on relit son étiquette',
    tranche: 'Le disque se retourne : on voit son verso se lever',
    reponse: 'La réponse : la pochette, le titre et l’artiste',
  },
  arret: 'La séance à {instant} s',

  /**
   * La façade : ce qu'on a sous le pouce pendant qu'on regarde. Chaque groupe de touches porte son nom, gravé au-dessus de lui :
   * c'est aussi ce qu'entend qui écoute la page.
   */
  facade: 'Les touches',
  groupes: {
    rejouer: 'Rejouer',
    enExtrait: 'En extrait',
    ralenti: 'Ralenti',
    verso: 'Verso',
    options: 'Options',
  },
  /** Les touches qui rejouent la piste depuis l'un de ses moments. */
  moments: {
    decompte: 'Décompte',
    attente: 'Attente',
    extrait: 'Extrait',
    rayure: 'Rayure',
    revelation: 'Révélation',
  } satisfies Record<Moment, string>,
  /** Ce qu'on peut faire arriver en plein extrait : hors de lui, ces deux touches sont éteintes. */
  rayer: 'Rayer',
  reveler: 'Révéler',
  /** Un cran du ralenti : la vitesse du temps, 1 pour la vraie. */
  vitesse: '×{vitesse}',
  versos: { etiquette: 'Verso A', disque: 'Verso B' } satisfies Record<GenreDeVerso, string>,
  poussoirs: { sobre: 'Sobre', leger: 'Léger' } satisfies Record<Poussoir, string>,

  /** Ce que la page dit à qui a demandé moins d'animations à son appareil, et la touche qui les lui rend. */
  avis: { texte: 'Ton appareil demande moins d’animations : tu vois la version sobre.', touche: 'Tout animer' },
  /** Ce qu'elle dit à qui tient son téléphone couché : la scène est celle d'un téléphone debout. */
  couche: 'Ton téléphone est couché : la platine y tient en tout petit. Redresse-le.',

  /** Le mode d'emploi : chaque touche, par son nom, et ce qu'elle fait. */
  modeDEmploi: {
    titre: 'Les touches, une par une',
    moments: 'La piste repart d’un peu avant ce moment, et tout s’enchaîne jusqu’au bout.',
    attente: 'Le décompte quand l’extrait tarde à charger : le plateau tourne, le bras attend, levé, et la pastille reste sur « 1 ».',
    rayer: 'En plein extrait : une mauvaise réponse, tout de suite. Deux coup sur coup, et le disque repart d’où il en est.',
    reveler: 'En plein extrait : la révélation, sans attendre que le bras arrive à l’étiquette. Chaque pièce repart d’où elle est, avec sa vitesse.',
    /** Les ralentis : combien de fois moins vite va chacun. */
    ralenti: 'Le ralenti : tout va {lent} fois moins vite, ou {tresLent} fois.',
    verso:
      'À la révélation, le disque se retourne et montre la pochette : c’est ton idée, à la place de la pochette qui glissait de sous la pochette kraft dans le brief. A : elle tient sur l’étiquette, le titre en arc autour. B : elle prend tout le disque. À toi de choisir.',
    sobre:
      'La version sobre, pour qui a demandé moins d’animations à son appareil : les pièces changent de place d’un coup, le disque ne tourne pas. Le bras avance quand même : c’est le chrono.',
    leger:
      'Le mode léger, pour un appareil qui peine : moins de facettes, des toiles jusqu’à moitié moins définies, plus de réactions passagères, et des ombres qui suivent leurs pièces d’un seul bloc, sans plus écarter leurs paliers.',
    note: 'Passer au mode léger, ou en revenir, redessine la scène : elle se fige un instant. Changer de verso ne redessine que le verso.',
  },

  /** Ce que l'atelier dit de la séance, à côté de la scène. Ce qui est entre accolades est remplacé par sa valeur. */
  etats: {
    avant: 'Avant la piste',
    decompte: 'Décompte · {chiffre}',
    attente: 'L’extrait charge',
    extrait: 'Extrait',
    chrono: '{ecoule} s sur {duree}',
    revelation: 'Révélation',
    reponse: '{titre} · {artiste}',
  },

  temps: {
    titre: 'La liste des temps',
    chapeau:
      'Chaque départ est compté depuis son signal. Sous chaque geste : comment la pièce y va, puis ses réglages. Une pièce est arrivée quand il lui reste moins de {seuil} % de sa course. Un ressort se règle par sa raideur, son amortissement et sa masse. Le plateau est un volant : un moteur le lance, le frottement l’arrête. Le bras et les pastilles descendent en chute freinée, retenus par un amortisseur, jusqu’à ce qui les arrête. Le disque est porté par une main qu’on ne voit pas, et la suit avec son inertie.',
    signaux: {
      trois: 'Au « 3 »',
      deux: 'Au « 2 »',
      un: 'Au « 1 »',
      extrait: 'À zéro, quand l’extrait part',
      rayure: 'À une mauvaise réponse : la rayure',
      revelation: 'À la révélation',
      arret: 'Une fois le disque arrêté',
    } satisfies Record<Signal, string>,
    pendantLExtrait: 'Pendant l’extrait',
    /** Quand un geste part : tant après son signal, ou tant avant lui. Seul l'extrait a des gestes comptés à rebours. */
    apres: '{duree}',
    avant: { extrait: '{duree} avant zéro' } satisfies Partial<Record<Signal, string>>,
    /** Une durée : en millisecondes sous la seconde, en secondes au-delà. */
    durees: { ms: '{ms} ms', s: '{s} s' },
    /** Les gestes : ce qu'on voit partir. */
    gestes: {
      pastilleClaque: 'La pastille du décompte tombe et claque sur le socle, arrêt net : « 3 »',
      disqueSort: 'Le disque glisse hors de sa pochette kraft',
      kraftEntrainee: 'La pochette kraft, entraînée, glisse de {px} px avec lui',
      disqueSeSouleve: 'Le disque se soulève, son ombre s’écarte',
      disqueTraverse: 'Il passe au-dessus du plateau',
      disqueSePose: 'Il se pose sur l’axe et se tasse de {px} px',
      plateauPart: 'Le moteur lance le plateau ; le disque tourne avec lui',
      levierMonte: 'Le levier se lève',
      brasSeLeve: 'Le bras se lève de {px} px',
      brasPivote: 'Il pivote jusqu’au bord du disque, le dépasse à peine, revient',
      levierDescend: 'Le levier se baisse',
      brasDescend: 'Le bras descend sur son amortisseur ; le diamant touche à l’instant où l’extrait part',
      diamantTouche: 'Le diamant touche et rebondit de {px} px',
      pastilleSeDecolle: 'La pastille se décolle',
      pastilleFile: 'Elle file hors du cadre',
      mainRecule: 'Le disque recule de {degres}°',
      brasTressaute: 'Le bras tressaute de {px} px',
      reperesAccusent: 'Les repères du plateau accusent le coup',
      mainRend: 'Le disque revient où il était',
      disqueReprend: 'Lâché, il reprend sa vitesse, sans jamais dépasser celle du plateau',
      reperesSeReprennent: 'Les repères se reprennent',
      levierReleve: 'Le levier se relève',
      brasReleve: 'Il relève le bras d’un coup sec',
      moteurCoupe: 'Le moteur coupe : le disque ralentit, les repères décrochent en arrière',
      brasRetourne: 'Le bras retourne lentement à son repos',
      brasSeRepose: 'Le bras se pose sur son repos',
      regardGlisse: 'Le regard glisse de {px} px et s’arrête sur le disque',
      disqueSEleve: 'Le disque se soulève au-dessus de l’axe',
      disqueSeRetourne: 'Il se retourne : on le voit par la tranche, puis par son verso',
      disqueSeTasse: 'Retombé à plat, la réponse au-dessus, il tasse la feutrine de {px} px',
    } satisfies Record<NomDeGeste, string>,
    /** Ce qui se voit sans avoir d'heure de départ : ce qui suit une course, ce qui change d'un coup, ce qui attend l'ampli. */
    notes: {
      reperesDerivent: {
        quoi: 'Les repères du plateau dérivent, puis se figent à la bonne vitesse',
        comment: 'entraînés par le plateau : c’est l’effet stroboscopique',
      },
      texteEnArcs: {
        quoi: 'Dès {trainee} tours par minute, les lettres de l’étiquette laissent une traînée ; de {texte} à {efface}, elles se fondent en arcs courts, que des arcs longs allongent jusqu’à être seuls à {longs}',
        comment:
          'un fondu, réglé sur la vitesse du plateau : les deux copies de la traînée tournent en arrière de ce que le disque parcourt en {ecart} ms',
      },
      attente: {
        quoi: 'Si l’extrait tarde à charger : le plateau tourne, le bras attend, levé, et la pastille reste sur « 1 »',
        comment: 'jusqu’à ce que tous les appareils soient prêts',
      },
      aiguillesSursautent: { quoi: 'Les deux aiguilles de l’ampli sursautent ensemble quand le diamant touche', comment: AVEC_L_AMPLI },
      chrono: {
        quoi: 'Le bras avance du bord du disque à l’étiquette, à vitesse constante : c’est le chrono',
        comment: 'il suit le temps de l’extrait',
      },
      ondulation: { quoi: 'Il ondule de {degres}°, une fois par tour', comment: 'entraîné par le disque' },
      secteurs: {
        quoi: 'Les deux secteurs clairs du disque restent fixes : seuls les arcs de l’étiquette tournent',
        comment: 'la lampe ne bouge pas',
      },
      aiguillesDansent: { quoi: 'Les aiguilles dansent ; dans les 5 dernières secondes, elles passent dans le rouge', comment: AVEC_L_AMPLI },
      aiguillesPic: { quoi: 'Les aiguilles font un pic', comment: AVEC_L_AMPLI },
      arcsEnTexte: {
        quoi: 'Sous {longs} tours par minute, les arcs raccourcissent ; sous {efface}, les lettres reviennent de leur traînée ; sous {texte}, on relit le texte ; le disque s’arrête exactement à l’endroit',
        comment: 'le même fondu, à l’envers',
      },
    } satisfies Record<string, Note>,
    /** Sous un geste : comment la pièce y va, puis ses réglages. */
    comment: '{effet} · {reglage}',
    /** Comment une pièce y va, en clair : des noms, pour convenir à « le bras » comme à « les repères ». */
    effets: {
      net: 'arrivée en {duree}, sans dépassement',
      depasse: 'arrivée en {duree}, dépassement de {part} %',
      lance: '{part} % de sa vitesse en {duree}',
      arrete: 'arrêt en {duree}',
      descend: '{px} px de descente en {duree}',
      porte: 'départ sans à-coup, pointe de vitesse au bout de {pointe}, arrivée en {duree}',
      /** Le disque qu'une main retourne : il retombe à plat, et c'est le plateau qui l'arrête. */
      retourne: 'départ sans à-coup, pointe de vitesse au bout de {pointe}, à plat en {duree} : le plateau l’arrête net',
      /** Un coup donné à une pièce : elle sursaute, puis retombe à sa place. */
      retombe: 'retombée en {duree}',
    },
    /** Ses réglages, lus dans la table des réglages de mouvement. */
    reglages: {
      ressort: 'ressort {raideur} / {amortissement} / {masse}',
      volant: 'volant : moteur {couple} °/s², frottement sec {sec} °/s², frottement visqueux {visqueux} par seconde',
      chute: 'chute freinée : {vitesse} px/s, {elan} s d’élan',
      main: '{main} pour la main qui le porte, {suit} pour le disque qui la suit',
    },
  },

  mesures: {
    titre: 'Ce que coûte une image',
    surLeVif: 'Mesuré ici, sur cet appareil, pendant que la scène tourne.',
    /** Les mesures que la page tient à jour, et ce qu'elle y écrit tant qu'elle n'a rien mesuré. */
    surLeVifDe: {
      montage: 'Dernier montage de la scène',
      parImage: 'Travail du script par image',
      entreDeux: 'Entre deux images',
      toiles: 'Toiles',
    } satisfies Record<MesureAffichee, string>,
    rienEncore: '—',
    ms: '{valeur} ms',
    /** Une mesure prise sur plusieurs images : sa moyenne, son pire cas, et sur combien d'images. Puis la même, quand il n'y en a qu'une. */
    msAuPire: '{valeur} ms ({pire} au pire sur les {images} dernières images)',
    msSurUneImage: '{valeur} ms (sur une seule image)',
    toilesPesees: '{nombre} toiles · {mpx} Mpx',
    banc: {
      titre: 'Au banc, processeur ralenti',
      chapeau:
        'Le banc rejoue toute la séance dans un navigateur sans carte graphique, à {definition} px d’appareil par px, le processeur ralenti. Pour chaque phase de la piste : le temps médian entre deux images, puis la part des images arrivées en retard, à plus de {enRetard} ms de la précédente. À {cadence} images par seconde, il s’en écoule {intervalle} de l’une à l’autre.',
      /** Le titre de la table d'un banc. */
      ralenti: 'Ralenti {ralenti} fois',
      colonnes: {
        scene: 'Scène',
        montage: 'Premier dessin',
        fil: 'Fil principal, par image',
        script: 'Dont script',
        decompte: 'Décompte',
        extrait: 'Extrait',
        revelation: 'Révélation',
      } satisfies Record<keyof ReleveDeBanc, string>,
      scenes: {
        entiere: 'Scène entière',
        sansReactions: 'Sans réactions, ombres d’un seul bloc',
        demiDefinition: 'Toiles moitié moins définies',
        densiteSobre: 'Moins de facettes',
        modeLeger: 'Mode léger (les trois à la fois)',
      } satisfies Record<SceneDeBanc, string>,
      /** La fluidité d'une phase : le temps médian entre deux images, puis la part des images arrivées en retard. */
      fluidite: '{mediane} ms · {longues} %',
    },
    /**
     * Ce qu'il faut lire des relevés : un paragraphe par banc. La scène entière d'abord, puis ce que chaque allègement y gagne,
     * au premier dessin et par image ; les nombres viennent des relevés, et un gain qu'on ne sait pas mesurer est dit tel.
     */
    lecture: {
      entiere:
        'Ralenti {ralenti} fois, la scène entière demande au fil principal {fil} ms par image, dont {script} ms de script, sur les {intervalle} ms qu’elle a ; au pire, {longues} % de ses images arrivent en retard.',
      /**
       * Ce qu'un allègement change à la scène entière : une phrase entière par cas. Son premier dessin est plus court, ou le même
       * à ce qu'on sait mesurer ; son travail par image est moindre, le même à ce qu'on sait mesurer, ou plus lourd.
       */
      allegement: {
        plusCourt: {
          moins: '{scene} : premier dessin {fois} fois plus court, {ms} ms de moins par image.',
          pareil: '{scene} : premier dessin {fois} fois plus court, rien de mesurable par image.',
          plus: '{scene} : premier dessin {fois} fois plus court, {ms} ms de plus par image.',
        },
        inchange: {
          moins: '{scene} : rien de mesurable au premier dessin, {ms} ms de moins par image.',
          pareil: '{scene} : rien de mesurable, ni au premier dessin ni par image.',
          plus: '{scene} : rien de mesurable au premier dessin, {ms} ms de plus par image.',
        },
      },
      entreDeuxPhrases: ' ',
      /** Ce que « rien de mesurable » veut dire : les seuils en deçà desquels le banc ne distingue pas un écart de ce dont ses relevés bougent seuls. */
      seuils:
        'Deux relevés du même code, pris à la suite, ne donnent pas les mêmes nombres : un petit écart que l’un a vu, l’autre ne le retrouve pas toujours. Est dit « rien de mesurable » un premier dessin moins de {fois} fois plus court, et un travail par image qui change de moins de {part} %.',
      limite:
        'Ce que ces bancs ne disent pas : ils ralentissent le fil principal (le script, puis la mise en page et la peinture du navigateur), pas la composition des images, et ne remplacent pas un vrai téléphone. Tout a été essayé dans Chromium seulement : Safari et Firefox restent à voir sur de vrais appareils.',
    },
  },
} as const;
