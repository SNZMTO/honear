/**
 * Les écrans du téléphone hors des pistes, chacun un arrêt du regard sur le meuble et ce qu'on y pose : l'accueil, le bac de l'hôte,
 * les réglages, le salon, l'ampli de près, la saisie du code, le hit-parade, la finale. Chacun se bâtit de l'état de la room
 * et de ce qu'on fait au téléphone : le client du jeu les monte, les planches les montrent.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import { enDuels, MODES, type ModeDuRegistre } from '../../regles/modes';
import { disquesDeLaFinale, hitParade, mouvementsDuClassement, type EtatDeLaPartie, type SonDeLaRoom } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { PARTIE, SITE } from '../../ressources/reglages';
import { TABLEE, type Place } from '../../ressources/tablee';
import type { Vignette } from '../../ressources/vignettes';
import { dessinerLAmpli } from '../ampli';
import { aiguillesA } from '../ampli/danse';
import type { Calque } from '../calque';
import { surLeBois, type Regard } from '../meuble';
import { pointsEcrits, remplir } from '../phrases';
import { dessinerUnDisqueDeRecompense } from '../recompense';
import { empriseDe } from '../rendu/emprise';
import { dessinerLeClassement, type LigneDuClassement } from '../classement';
import { dessinerLaTablee, eventail, placesEnEventail, type JoueurPose } from '../tablee';
import { largeurDeLaTouche } from '../touche';
import { kraftDuSalon } from './kraft';
import { ampliDuSalon, bacDessine, platineArretee } from './meuble';
import { disqueDePlaylist, estUnTheme, playlistsDuGenre, type PlaylistProposee, mesPlaylists } from './choisie';
import {
  DENSITE,
  interprete,
  papier,
  phrase,
  regardSur,
  SUR_LA_PLATINE,
  touche,
  toucheAuBord,
  toucheAuMilieu,
  type Ecritoire,
  type VueDuTelephone,
} from './pieces';

const T = TABLEE.telephone;

/**
 * L'accueil : la platine à l'arrêt, le logo sur le disque ; deux grandes touches, poser un disque (créer une room) ou entrer un
 * code ; dessous, deux petits onglets : refaire sa pochette, à gauche, et son compte, à droite.
 */
export function vueDeLAccueil(a: Ecritoire, avecLeCompte = false, maPochette = false): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const O = T.accueil.onglets;
  /** Un onglet, petit, taillé à son libellé, posé par son bord gauche ou par son bord droit. */
  const onglet = (nom: `touche-${string}`, libelle: string, bord: 'gauche' | 'droite'): Calque => {
    const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
    const x = bord === 'gauche' ? O.gauche + largeur / 2 : O.droite - largeur / 2;
    return touche(nom, 'cran', libelle, r, [x, O.y], a.encrier, 'repos', true);
  };
  // Le titre du jeu, en grand, sur un papier posé sous la platine : on sait tout de suite à quoi l'on joue.
  const titre = papier(
    'etiquette-titre',
    r,
    T.accueil.titre.en,
    r.largeur,
    T.accueil.titre.angle,
    [{ contenu: a.textes.accueil.titre, role: 'titrage', auPlus: 'affiche' }],
    a.encrier,
    { ancre: 'milieu' },
  ).calques;
  return {
    regard: r,
    objets: [
      platineArretee(a),
      ...titre,
      toucheAuMilieu('touche-poser', 'principale', a.textes.touches.poserUnDisque, r, T.accueil.poser, a.encrier),
      toucheAuMilieu('touche-code', 'secondaire', a.textes.touches.jAiUnCode, r, T.accueil.code, a.encrier),
      ...(maPochette ? [onglet('touche-ma-pochette', a.textes.pochette.maPochette, 'gauche')] : []),
      // Le compte n'est que dans le jeu en ligne : le prototype et les planches n'en ont pas.
      ...(avecLeCompte ? [onglet('touche-compte', a.textes.compte.touche, 'droite')] : []),
    ],
  };
}

/**
 * Les trois façons de choisir sa playlist dans le bac : un thème touché dans le bac, la recherche, ou « Mes playlists » (sa pochette
 * personnalisée, dans le bac elle aussi).
 */
export const CRANS_DU_BAC = ['pretes', 'chercher', 'laMienne'] as const;
export type CranDuBac = (typeof CRANS_DU_BAC)[number];

/** Le seul cran qui a sa touche, sous le bac : « Chercher ». Les thèmes et « Mes playlists » se touchent dans le bac lui-même. */
export const TOUCHES_DU_BAC = ['chercher'] as const satisfies readonly CranDuBac[];

/** Ce que montre le bac de l'hôte : le cran choisi, et ce qu'on y a trouvé. */
export interface BacOuvert {
  readonly cran: CranDuBac;
  /** Ce que la recherche a trouvé : une vignette par playlist publique. */
  readonly resultats?: readonly Vignette[];
  /** Le lien collé ; tant qu'il n'y en a pas, l'étiquette dit ce qu'on peut y coller. */
  readonly lien?: string;
  /** Ce que l'import du lien a donné : combien de titres on peut jouer, sur combien. */
  readonly importee?: { readonly jouables: number; readonly total: number };
  /** Ce qui empêche de la choisir : trop peu de titres jouables, un lien que le site ne sait pas lire, un lien qui ne mène à rien. */
  readonly refus?: 'tropCourt' | 'spotify' | 'introuvable';
  /** « Mes playlists » : celles qu'on a importées et gardées, en disques ; celle qu'on a touchée est `touche`. */
  readonly miennes?: readonly PlaylistProposee[];
  /** Aux « Prêtes à jouer », le thème touché, et ses playlists, en disques ; celle qu'on a touchée est `touche`. */
  readonly theme?: string;
  readonly proposees?: readonly PlaylistProposee[];
  /** Ce qu'on a tapé pour chercher ; tant qu'il n'y a rien, l'étiquette dit ce qu'on peut y chercher. */
  readonly recherche?: string;
  /** La recherche fouille encore, ou n'a rien trouvé. */
  readonly etat?: 'fouille' | 'rien';
  /** La playlist choisie : son titre et combien de titres elle a, écrits sur un papier. */
  readonly choisie?: { readonly titre: string; readonly total: number };
  /** Le résultat de la recherche qu'on a touché : il sort du rang. */
  readonly touche?: number;
  /** D'où viennent les extraits, écrit sous le bac quand une source en donne. */
  readonly source?: string;
  /**
   * Vrai quand il faut toucher un thème avant de prendre une playlist « Prête à jouer » : le serveur a une vraie source, et la
   * playlist d'essai, sans le son, n'est pas une partie. Sans source (le prototype), « Celle-là » prend la playlist d'essai.
   */
  readonly themeAToucher?: boolean;
  /** Ce que fait « Retour » : rouvrir sa pochette, avant la room ; refermer le bac, quand l'hôte y change de playlist. */
  readonly retour?: 'revenir' | 'fermer';
}

/**
 * Le bac, chez l'hôte : en haut, le bac, dont on touche un thème ou « Mes playlists » ; dessous, « Chercher » (« touche-bac-chercher ») ;
 * ce qu'on y voit, selon ce qu'on a touché ; en bas, la touche qui choisit, quand il y a de quoi choisir, et « Retour », petit, à sa
 * gauche.
 */
export function vueDuBac(a: Ecritoire, bac: BacOuvert): VueDuTelephone {
  const P = a.textes.playlists;
  const B = T.bac;
  // Le bac reste rangé : le thème touché se montre devant lui, sa pochette sur le bois et son disque qui en sort.
  const auRepos = bacDessine(a);
  // L'intercalaire du thème touché sort du bac ; le regard, lui, reste celui du bac au repos.
  // « Mes playlists » ouvertes : c'est la pochette personnalisée qui sort.
  const sorti = bac.cran === 'laMienne' ? 'mesPlaylists' : bac.theme;
  const meuble = sorti !== undefined ? bacDessine(a, sorti) : auRepos;
  // Le regard monte sur le bac s'il le faut, assez pour qu'on lise l'onglet de chaque intercalaire.
  const surLeBac = regardSur(auRepos, a.encrier);
  const haut = empriseDe([auRepos], a.encrier.largeur)?.y ?? surLeBac.origine[1];
  const r: Regard = { ...surLeBac, origine: [surLeBac.origine[0], Math.min(surLeBac.origine[1], haut - B.auDessus)] };
  // Sous le bac, « Chercher », taillé à son libellé et centré (les crans qui ont une touche, côte à côte, un écart entre eux).
  const largeurs = TOUCHES_DU_BAC.map((c) => largeurDeLaTouche({ genre: 'cran', libelle: P[c], ajustee: true }, a.encrier.largeur));
  const enTout = largeurs.reduce((somme, l) => somme + l, 0) + B.crans.ecart * (largeurs.length - 1);
  const crans = TOUCHES_DU_BAC.map((c, rang) => {
    const avant = largeurs.slice(0, rang).reduce((somme, l) => somme + l + B.crans.ecart, 0);
    const x = (r.largeur - enTout) / 2 + avant + (largeurs[rang] ?? 0) / 2;
    return touche(`touche-bac-${c}`, 'cran', P[c], r, [x, B.crans.y], a.encrier, c === bac.cran ? 'allumee' : 'repos', true);
  });
  const objets: Calque[] = [meuble, ...crans];
  if (bac.retour !== undefined) {
    const libelle = a.textes.partie.retour;
    const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
    const nom = bac.retour === 'fermer' ? 'touche-fermer-bac' : 'touche-revenir';
    objets.push(touche(nom, 'cran', libelle, r, [B.bas.retour + largeur / 2, B.bas.y], a.encrier, 'repos', true));
  }
  const resultats = bac.resultats ?? [];
  if (bac.source !== undefined)
    objets.push(
      ...papier(
        'etiquette-source',
        r,
        B.source.en,
        B.source.largeur,
        -1,
        [{ contenu: bac.source, role: 'technique', auPlus: 'gravure' }],
        a.encrier,
        { ancre: 'milieu' },
      ).calques,
    );
  /** Un papier qui dit ce qui se passe, ou ce qu'on a choisi : à cette place, ces lignes. */
  const ecrire = (nom: `etiquette-${string}`, en: readonly [number, number], largeur: number, lignes: Parameters<typeof papier>[5]): void => {
    objets.push(...papier(nom, r, en, largeur, 1.5, lignes, a.encrier).calques);
  };
  const choisie = bac.choisie !== undefined ? remplir(P.titres, { pistes: bac.choisie.total }) : undefined;
  if (bac.cran === 'chercher') {
    objets.push(
      ...papier(
        'etiquette-recherche',
        r,
        B.saisie.en,
        B.saisie.largeur,
        -1,
        [{ contenu: bac.recherche !== undefined && bac.recherche !== '' ? bac.recherche : P.recherche, role: 'titrage', auPlus: 'titre' }],
        a.encrier,
        {
          // Rien de tapé : le curseur attend devant ce qu'on peut y chercher.
          curseur: bac.recherche !== undefined && bac.recherche !== '' ? true : 'debut',
          alignement: 'debut',
        },
      ).calques,
    );
    // Ce que la recherche trouve : des playlists publiques, chacune un disque, son étiquette à sa couleur ; la touchée se soulève.
    for (const [rang, x] of B.resultats.x.entries()) {
      const vignette = resultats[rang];
      if (vignette === undefined) continue;
      objets.push(
        ...disqueDePlaylist(
          `disque-resultat-${rang + 1}`,
          r,
          [x, B.resultats.y],
          vignette.fond,
          bac.touche === rang ? B.playlists.leve : 0,
          B.resultats.rayon,
        ),
      );
    }
    if (bac.etat !== undefined)
      ecrire('etiquette-message', B.message.en, B.message.largeur, [
        { contenu: bac.etat === 'fouille' ? P.fouille : P.rien, role: 'titrage', auPlus: 'intertitre' },
      ]);
    else if (bac.choisie !== undefined && choisie !== undefined)
      ecrire('etiquette-choisie', B.choisie.en, B.choisie.largeur, [
        { contenu: `${bac.choisie.titre} · ${choisie}`, role: 'techniqueFort', auPlus: 'mention' },
      ]);
  }
  if (bac.cran === 'pretes') {
    const theme = bac.theme !== undefined && estUnTheme(bac.theme) ? bac.theme : undefined;
    const proposees = bac.proposees ?? [];
    if (bac.etat === 'fouille' || bac.etat === 'rien')
      ecrire('etiquette-message', B.saisie.en, B.saisie.largeur, [
        { contenu: bac.etat === 'fouille' ? P.fouille : P.rien, role: 'titrage', auPlus: 'intertitre' },
      ]);
    else if (theme !== undefined && proposees.length > 0) {
      // Les playlists du genre, en disques ; « Au hasard » en tire une.
      objets.push(...playlistsDuGenre(a, r, theme, proposees, bac.touche));
      objets.push(toucheAuMilieu('touche-hasard-bac', 'secondaire', P.auHasard, r, B.playlists.auHasard, a.encrier));
    } else if (bac.themeAToucher === true)
      // Rien de touché encore : on dit quoi faire.
      ecrire('etiquette-message', B.saisie.en, B.saisie.largeur, [{ contenu: P.toucheUnGenre, role: 'titrage', auPlus: 'intertitre' }]);
  }
  if (bac.cran === 'laMienne') {
    objets.push(
      ...papier(
        'etiquette-lien',
        r,
        B.saisie.en,
        B.saisie.largeur,
        -1,
        [{ contenu: bac.lien ?? P.coller, role: 'technique', auPlus: 'mention' }],
        a.encrier,
        { curseur: bac.lien !== undefined && bac.lien !== '' ? true : 'debut', alignement: 'debut' },
      ).calques,
    );
    const lue = bac.importee !== undefined ? remplir(P.jouables, bac.importee) : undefined;
    const refus =
      bac.refus === 'spotify'
        ? P.spotify
        : bac.refus === 'introuvable'
          ? a.textes.etats.introuvable
          : bac.refus === 'tropCourt' && lue !== undefined
            ? `${lue}. ${a.textes.etats.tropCourt}`
            : undefined;
    const technique = bac.refus === 'spotify' || bac.refus === 'introuvable';
    // Le lien part : on fouille (une longue playlist prend quelques secondes) ; puis la playlist importée, son titre et ce qu'on peut en jouer.
    const lignes: Parameters<typeof papier>[5] | undefined =
      bac.etat === 'fouille'
        ? [{ contenu: P.fouille, role: 'titrage', auPlus: 'intertitre' }]
        : refus !== undefined
          ? [{ contenu: refus, role: technique ? 'technique' : 'titrage', auPlus: technique ? 'mention' : 'intertitre' }]
          : bac.choisie !== undefined && lue !== undefined
            ? [
                { contenu: bac.choisie.titre, role: 'titrage', auPlus: 'intertitre' },
                { contenu: lue, role: 'technique', auPlus: 'mention' },
              ]
            : lue !== undefined
              ? [{ contenu: lue, role: 'titrage', auPlus: 'intertitre' }]
              : undefined;
    if (lignes !== undefined) objets.push(...papier('etiquette-message', r, B.message.en, B.message.largeur, 1.5, lignes, a.encrier).calques);
    // Sinon, « Mes playlists » : celles qu'on a déjà importées, à reprendre d'un toucher.
    else if (bac.miennes !== undefined) objets.push(...mesPlaylists(a, r, bac.miennes, bac.touche));
  }
  // On choisit ce qu'on a sous les yeux : une playlist prête, ce que la recherche a trouvé, ou ce que le lien a importé.
  const aChoisir =
    bac.etat !== 'fouille' &&
    (bac.cran === 'pretes'
      ? bac.themeAToucher !== true || bac.choisie !== undefined
      : bac.cran === 'chercher'
        ? resultats.length > 0
        : bac.importee !== undefined || bac.choisie !== undefined);
  // Avec « Retour » à sa gauche, elle se pose à côté ; seule, au milieu.
  if (aChoisir && bac.refus === undefined)
    objets.push(
      bac.retour !== undefined
        ? toucheAuBord('touche-choisir', 'principale', P.choisir, r, [B.bas.choisir, B.bas.y], a.encrier)
        : toucheAuMilieu('touche-choisir', 'principale', P.choisir, r, B.bas.y, a.encrier),
    );
  return { regard: r, objets };
}

/**
 * Les réglages : les commandes de la platine, puis la touche qui ouvre le salon, et « Retour », au bout, qui rouvre le bac. Le
 * sélecteur de mode choisit le jeu ; un papier dit ce que rapporte une piste dans ce mode.
 */
export function vueDesReglages(
  a: Ecritoire,
  mode: ModeDuRegistre,
  reglages?: { readonly pistes: number; readonly extrait: number; readonly son: SonDeLaRoom },
  jeu?: JeuDesReglages,
  modeDuTournoi: ModeDuRegistre = MODES.tournoi,
): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const tournoi = jeu === 'tournoi';
  // Au tournoi, c'est le cran « Tournoi » qui dit le jeu ; la manette n'a plus que Solo et Multi, et « Titres » dit le tableau.
  const platine = platineArretee(a, {
    mode: mode.cran,
    ...(tournoi ? { tournoi: modeDuTournoi.cle } : {}),
    ...(reglages !== undefined ? { reglages: { ...reglages, tableau: tournoi } } : {}),
  });
  return {
    regard: r,
    objets: [
      platine,
      ...(jeu !== undefined ? cransDuJeu(a, jeu) : []),
      ...phrase(a.textes.partie.bareme[tournoi ? modeDuTournoi.cle : mode.cle] ?? '', r, a.encrier),
      toucheAuMilieu('touche-ouvrir', 'principale', a.textes.partie.ouvrirLeSalon, r, T.reglages.ouvrir, a.encrier),
      toucheAuMilieu('touche-revenir', 'secondaire', a.textes.partie.retour, r, T.reglages.retour, a.encrier),
    ],
  };
}

/** Le jeu qu'on ouvre : un blind test (la manette dit son mode), ou un tournoi. */
export type JeuDesReglages = 'blindTest' | 'tournoi';
export const JEUX: readonly JeuDesReglages[] = ['blindTest', 'tournoi'];

/** Les deux crans du jeu, sous la platine, côte à côte au milieu : celui du jeu choisi allumé. */
function cransDuJeu(a: Ecritoire, jeu: JeuDesReglages): Calque[] {
  const r = SUR_LA_PLATINE;
  const J = T.reglages.jeux;
  const libelles = JEUX.map((j) => a.textes.tournoi.jeux[j]);
  const largeurs = libelles.map((libelle) => largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur));
  const enTout = largeurs.reduce((somme, l) => somme + l, 0) + J.ecart * (largeurs.length - 1);
  return JEUX.map((j, rang) => {
    const avant = largeurs.slice(0, rang).reduce((somme, l) => somme + l + J.ecart, 0);
    const x = r.largeur / 2 - enTout / 2 + avant + (largeurs[rang] ?? 0) / 2;
    return touche(`touche-jeu-${j}`, 'cran', libelles[rang] ?? '', r, [x, J.y], a.encrier, j === jeu ? 'allumee' : 'repos', true);
  });
}

/** Qui regarde le salon : l'hôte, un invité, ou celui à qui la platine vient de passer parce que l'hôte est parti. */
export type QuiRegardeLeSalon = 'hote' | 'invite' | 'nouvelHote';

/**
 * Le salon : le code en énorme sur l'étiquette, le QR code sur la kraft, le lien à copier, les pochettes, et la touche de l'hôte,
 * qui lance la face A. L'ampli s'allume tout seul : le son part au premier toucher.
 */
export function vueDuSalon(
  a: Ecritoire,
  etat: EtatDeLaPartie,
  code: string,
  qui: QuiRegardeLeSalon,
  maPochette = false,
  copie = false,
): VueDuTelephone {
  const tournoi = enDuels(etat.mode);
  const lancer = tournoi ? a.textes.tournoi.touches.lancer : etat.face === 'B' ? a.textes.touches.lancerLaFaceB : a.textes.touches.lancer;
  const r = SUR_LA_PLATINE;
  const S = T.salon;
  const lien = remplir(a.textes.partie.lien, { site: a.site ?? SITE.adresse, code });
  const joueurs = eventail(etat, a.textes, 'rien');
  // En solo, personne à inviter : ni le code sur le disque, ni le QR code sur la kraft, ni le lien.
  const seul = (MODES[etat.mode].joueurs ?? PARTIE.joueurs).auPlus === 1;
  const objets: Calque[] = [
    seul ? platineArretee(a) : platineArretee(a, { code: { code, joueurs: etat.joueurs.length } }),
    // Le QR code mène à la room, et dit qu'on vient de lui (« #qr ») : on le compte, à l'arrivée.
    ...kraftDuSalon(a, `https://${lien}#qr`, etat).filter((c) => !seul || c.nom !== 'kraft-qr'),
    ...dessinerLaTablee(joueurs, placesEnEventail(joueurs.length), T.eventail.taille, r, T.trouve, a.encrier.largeur),
  ];
  // Le nouvel hôte lit, à la place du lien, que c'est lui qui tient la platine.
  if (qui === 'nouvelHote') objets.push(...phrase(a.textes.etats.patronSorti, r, a.encrier, S.lien.en, S.lien.largeur));
  else if (!seul)
    objets.push(
      ...papier(
        'etiquette-lien',
        r,
        S.lien.en,
        S.lien.largeur,
        -1.5,
        [
          { contenu: lien, role: 'techniqueFort', auPlus: 'texte' },
          // Copié, il le dit un instant.
          { contenu: copie ? a.textes.partie.copie : a.textes.partie.copier, role: 'technique', auPlus: 'gravure' },
        ],
        a.encrier,
        { role: 'mobile', ancre: 'debut' },
      ).calques,
    );
  // Sa pochette, à refaire en attendant : un petit cran, entre l'éventail et le lien.
  if (maPochette) {
    const libelle = a.textes.pochette.maPochette;
    const largeur = largeurDeLaTouche({ genre: 'cran', libelle, ajustee: true }, a.encrier.largeur);
    objets.push(touche('touche-ma-pochette', 'cran', libelle, r, [S.pochette[0] + largeur / 2, S.pochette[1]], a.encrier, 'repos', true));
  }
  // La touche qui lance la face, taillée à son libellé : au bord, à côté de la pochette kraft, sans mordre dessus.
  if (qui !== 'invite') {
    const largeur = largeurDeLaTouche({ genre: 'principale', libelle: lancer, ajustee: true }, a.encrier.largeur);
    objets.push(touche('touche-lancer', 'principale', lancer, r, [S.lancer[0] + largeur / 2, S.lancer[1]], a.encrier, 'repos', true));
  } else {
    // L'invité n'a rien à lancer : on lui dit qui le fera, plutôt que de le laisser devant un salon muet.
    const hote = etat.joueurs.find((j) => j.id === etat.hote)?.pochette.artiste;
    const attente = tournoi
      ? remplir(a.textes.tournoi.attenteDuSalon, { hote: hote ?? '' })
      : remplir(a.textes.partie.onAttend, { hote: hote ?? '', face: etat.face });
    if (hote !== undefined && hote !== '') objets.push(...phrase(attente, r, a.encrier, S.attente.en, S.attente.largeur));
  }
  return { regard: r, objets };
}

/** L'ampli, de près : le regard a glissé vers lui. Allumé, ses aiguilles respirent ; éteint (le son est bloqué), il reste noir. */
export function vueDeLAmpli(a: Ecritoire, allume: boolean): VueDuTelephone {
  const ampli = dessinerLAmpli(
    { ...ampliDuSalon(a.textes, allume), aiguilles: allume ? aiguillesA({ duree: 1, decompteA: 0 }, 1.8) : [0, 0] },
    DENSITE,
  );
  return { regard: regardSur(ampli, a.encrier), objets: [ampli] };
}

/**
 * Ce que la saisie du code dit que le serveur a refusé : un code que personne n'a, une room pleine, une room en solo ; et, pour l'hôte
 * qui en ouvrait une, une room de plus que le serveur n'ouvre pas (il le dit là, d'où l'on peut encore rejoindre celle d'un autre).
 */
export type RefusDeLaSaisie = 'codeInconnu' | 'complet' | 'solo' | 'tropDeRooms';

/**
 * La saisie du code d'une room : le papier où il s'écrit, lettre après lettre ; ce que le serveur a refusé ; la touche qui entre, et
 * « Retour », qui ramène à l'accueil.
 */
export function vueDeLaSaisie(a: Ecritoire, tape: string, refus?: RefusDeLaSaisie): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const S = T.saisie;
  const lettres = [...tape].join('  ');
  const objets: Calque[] = [
    platineArretee(a),
    ...papier(
      'etiquette-saisie',
      r,
      S.en,
      S.largeur,
      S.angle,
      [
        { contenu: a.textes.partie.saisie, role: 'technique', auPlus: 'mention' },
        { contenu: lettres === '' ? ' ' : lettres, role: 'titrage', auPlus: 'grandTitre' },
      ],
      a.encrier,
      // Sur la colonne, comme le reste : son papier garde son bord gauche pendant qu'on tape.
      { curseur: refus === undefined, alignement: 'debut', ancre: 'milieu', auMoins: S.auMoins },
    ).calques,
  ];
  if (refus !== undefined) objets.push(...phrase(a.textes.etats[refus], r, a.encrier, S.message));
  objets.push(toucheAuMilieu('touche-rejoindre', 'principale', a.textes.partie.rejoindre, r, S.entrer, a.encrier));
  objets.push(toucheAuMilieu('touche-laisser-code', 'secondaire', a.textes.partie.retour, r, S.retour, a.encrier));
  return { regard: r, objets };
}

/**
 * Le hit-parade entre deux pistes : le classement, du premier au dernier, chacun avec son nom et ses points, et ce qui a bougé
 * (« Entrée », « +2 », « –1 »). L'hôte y a la touche qui lance la piste suivante.
 */
export function vueDuHitParade(a: Ecritoire, avant: EtatDeLaPartie, apres: EtatDeLaPartie, hote = false, maPochette = false): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const H = T.hitParade;
  const mouvements = mouvementsDuClassement(avant, apres);
  const P = a.textes.pastilles;
  const lignes = hitParade(apres).map(({ joueur, rang }): LigneDuClassement => {
    const m = mouvements[joueur.id];
    const marque = m === undefined ? undefined : m.genre === 'entree' ? P.entree : remplir(P[m.genre], { places: m.places });
    return {
      id: joueur.id,
      pose: { pochette: joueur.pochette, expression: joueur.expression, dos: !joueur.connecte },
      rang,
      nom: joueur.pochette.artiste,
      points: joueur.points,
      marques: marque !== undefined ? [marque] : [],
    };
  });
  const objets = [platineArretee(a), ...dessinerLeClassement(lignes, T.classement.hitParade, r, a.textes, a.encrier.largeur, 'hit-parade')];
  if (hote) objets.push(toucheAuBord('touche-lancer', 'principale', a.textes.touches.suivante, r, H.suivante, a.encrier));
  // L'invité, qui attend la suivante, peut refaire sa pochette ; l'hôte touche la sienne, sur la tablée.
  else if (maPochette) objets.push(toucheAuBord('touche-ma-pochette', 'secondaire', a.textes.pochette.maPochette, r, H.pochette, a.encrier));
  return { regard: r, objets };
}

/** La finale : les disques remis aux trois premiers, le dos de pochette des titres joués ; chez l'hôte, « Rejouer la face B ». */
export function vueDeLaFinale(
  a: Ecritoire,
  etat: EtatDeLaPartie,
  joues: readonly Reponse[],
  hote = true,
  maPochette = false,
  revoirLesTitres = false,
): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const F = T.finale;
  const disques = disquesDeLaFinale(etat);
  const classes = hitParade(etat);
  // Les ex aequo en tête ont la même taille de pochette : personne n'est plus premier que l'autre.
  const premiers = F.premiers
    .slice(0, classes.length)
    .map((place, i): Place & { readonly taille: number } => ({ ...place, taille: classes[i]?.rang === 1 ? F.premiers[0].taille : place.taille }));
  const suivants = F.suivants.x.map((x) => ({ en: [x, F.suivants.y] as const, angle: 4, taille: F.suivants.taille }));
  const poseDe = ({ joueur, rang }: (typeof classes)[number], pastille: string): JoueurPose => ({
    pochette: joueur.pochette,
    expression: rang === 1 ? 'content' : joueur.expression === 'endormi' ? 'endormi' : 'depite',
    pastilles: [pastille],
  });
  // Les trois premiers ont leurs points en toutes lettres ; les suivants, sur une petite pastille, le nombre seul.
  const enTete = classes.slice(0, premiers.length).map((c) => poseDe(c, pointsEcrits(a.textes, c.joueur.points)));
  const derriere = classes.slice(premiers.length).map((c) => poseDe(c, String(c.joueur.points)));
  const remis = classes.slice(0, F.premiers.length).flatMap(({ joueur }, rang) => {
    const genre = disques[joueur.id];
    const place = premiers[rang];
    if (genre === undefined || place === undefined) return [];
    const [dx, dy] = F.disque.decalage;
    const centre: Vec2 = [place.en[0] + dx * place.taille, place.en[1] + dy * place.taille];
    const d = dessinerUnDisqueDeRecompense(genre, `disque-${genre}-${rang + 1}`, surLeBois(r, centre[0], centre[1]), F.disque.rayon * place.taille);
    return [d.ombre, d.disque];
  });
  const P = a.textes.partie;
  // Peu de titres, écrits en entier ; plus, combien il y en a : on les revoit tous, avec leurs pochettes, en touchant le papier.
  const titres =
    joues.length <= F.titresEnEntier
      ? joues.map((j, rang) => ({
          contenu: remplir(P.titreJoue, { numero: rang + 1, titre: j.titre, artiste: interprete(a.textes, j) }),
          role: 'technique' as const,
          auPlus: 'gravure' as const,
        }))
      : [{ contenu: remplir(P.titresDeLaFace, { titres: joues.length }), role: 'techniqueFort' as const, auPlus: 'mention' as const }];
  // Quand ils n'y tiennent pas tous, le papier dit qu'on les revoit en le touchant (il se touche toujours, dans le jeu).
  const revoir =
    joues.length > F.titresEnEntier && revoirLesTitres ? [{ contenu: P.revoir, role: 'technique' as const, auPlus: 'gravure' as const }] : [];
  return {
    regard: r,
    objets: [
      platineArretee(a),
      // Les disques remis, glissés derrière la pochette de chacun, qui en sortent par le coin : ils ne cachent plus les visages.
      ...remis,
      ...dessinerLaTablee(enTete, premiers, F.suivants.taille, r, T.pastille, a.encrier.largeur, 'finale'),
      ...dessinerLaTablee(derriere, suivants, F.suivants.taille, r, T.trouve, a.encrier.largeur, 'suivant'),
      ...papier(
        'etiquette-titres',
        r,
        F.titres.en,
        F.titres.largeur,
        F.titres.angle,
        [{ contenu: P.titresJoues, role: 'titrage', auPlus: 'intertitre' }, ...titres, ...revoir],
        a.encrier,
        { alignement: 'debut', ancre: 'milieu' },
      ).calques,
      ...(hote
        ? [touche('touche-rejouer', 'principale', a.textes.touches.rejouer, r, F.rejouer, a.encrier)]
        : maPochette
          ? [touche('touche-ma-pochette', 'secondaire', a.textes.pochette.maPochette, r, F.pochette, a.encrier)]
          : []),
    ],
  };
}
