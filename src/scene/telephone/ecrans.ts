/**
 * Les écrans du téléphone hors des pistes, chacun un arrêt du regard sur le meuble et ce qu'on y pose : l'accueil, le bac de l'hôte,
 * les réglages, le salon, l'ampli de près, la saisie du code, le hit-parade, la finale. Chacun se bâtit de l'état de la room
 * et de ce qu'on fait au téléphone : le client du jeu les monte, les planches les montrent.
 */

import type { Vec2 } from '../../lowpoly/vecteurs';
import type { ModeDeJeu } from '../../regles/modes';
import { disquesDeLaFinale, hitParade, mouvementsDuClassement, type EtatDeLaPartie, type SonDeLaRoom } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { SITE } from '../../ressources/reglages';
import { TABLEE, type Place } from '../../ressources/tablee';
import type { Vignette } from '../../ressources/vignettes';
import { dessinerLAmpli } from '../ampli';
import { aiguillesA } from '../ampli/danse';
import { dessinerLeBac } from '../bac';
import type { Calque } from '../calque';
import { surLeBois } from '../meuble';
import { remplir } from '../phrases';
import { dessinerLaVraiePochette } from '../pochette/dos';
import { dessinerUnDisqueDeRecompense } from '../recompense';
import { dessinerLaTablee, eventail, placesEnEventail, type JoueurPose } from '../tablee';
import { largeurDeLaTouche } from '../touche';
import { kraftDuSalon } from './kraft';
import { ampliDuSalon, bacDesPlaylistsPretes, platineArretee } from './meuble';
import { DENSITE, interprete, papier, phrase, regardSur, SUR_LA_PLATINE, touche, toucheAuBord, type Ecritoire, type VueDuTelephone } from './pieces';

const T = TABLEE.telephone;

/**
 * L'accueil : la platine à l'arrêt, le logo sur le disque ; refaire sa pochette, poser un disque (créer une room), entrer un code,
 * ou ouvrir son compte.
 */
export function vueDeLAccueil(a: Ecritoire, avecLeCompte = false, maPochette = false): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  return {
    regard: r,
    objets: [
      platineArretee(a),
      ...(maPochette ? [toucheAuBord('touche-ma-pochette', 'secondaire', a.textes.pochette.maPochette, r, T.accueil.pochette, a.encrier)] : []),
      toucheAuBord('touche-poser', 'principale', a.textes.touches.poserUnDisque, r, T.accueil.poser, a.encrier),
      toucheAuBord('touche-code', 'secondaire', a.textes.touches.jAiUnCode, r, T.accueil.code, a.encrier),
      // Le compte n'est que dans le jeu en ligne : le prototype et les planches n'en ont pas.
      ...(avecLeCompte ? [toucheAuBord('touche-compte', 'secondaire', a.textes.compte.touche, r, T.accueil.compte, a.encrier)] : []),
    ],
  };
}

/** Les trois façons de choisir sa playlist dans le bac, dans l'ordre de leurs crans. */
export const CRANS_DU_BAC = ['pretes', 'chercher', 'laMienne'] as const;
export type CranDuBac = (typeof CRANS_DU_BAC)[number];

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
  /** Aux « Prêtes à jouer », le thème touché : sa première playlist sort du bac. */
  readonly theme?: string;
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
}

/**
 * Le bac, chez l'hôte : trois façons de choisir sa playlist, en crans ; ce qu'on y voit, selon le cran choisi ; la touche qui
 * choisit, quand il y a de quoi choisir. Chaque cran s'appelle « touche-bac-… ».
 */
export function vueDuBac(a: Ecritoire, bac: BacOuvert): VueDuTelephone {
  const P = a.textes.playlists;
  const B = T.bac;
  const sortie = bac.cran === 'pretes' && bac.theme !== undefined ? { theme: bac.theme, leve: B.leve } : undefined;
  const meuble = dessinerLeBac(bacDesPlaylistsPretes(a.textes, sortie), DENSITE, a.encrier.largeur);
  const r = regardSur(meuble, a.encrier);
  // Les trois crans, chacun taillé à son libellé, côte à côte depuis la colonne, un écart entre eux : aucun ne mord sur l'autre.
  const largeurs = CRANS_DU_BAC.map((c) => largeurDeLaTouche({ genre: 'cran', libelle: P[c], ajustee: true }, a.encrier.largeur));
  const crans = CRANS_DU_BAC.map((c, rang) => {
    const avant = largeurs.slice(0, rang).reduce((somme, l) => somme + l + B.crans.ecart, 0);
    const x = T.colonne.gauche + avant + (largeurs[rang] ?? 0) / 2;
    return touche(`touche-bac-${c}`, 'cran', P[c], r, [x, B.crans.y], a.encrier, c === bac.cran ? 'allumee' : 'repos', true);
  });
  const objets: Calque[] = [meuble, ...crans];
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
        {
          ancre: 'debut',
        },
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
          curseur: true,
          alignement: 'debut',
        },
      ).calques,
    );
    // Ce que la recherche trouve : des playlists publiques, chacune sa vignette.
    for (const [rang, x] of B.resultats.x.entries()) {
      const vignette = resultats[rang];
      if (vignette === undefined) continue;
      const p = dessinerLaVraiePochette(
        vignette,
        {
          nom: `pochette-resultat-${rang + 1}`,
          centre: surLeBois(r, x, B.resultats.y),
          angle: B.resultats.angles[rang] ?? 0,
          taille: B.resultats.taille,
          ...(bac.touche === rang ? { leve: B.leve / 2 } : {}),
        },
        `resultat-${rang}`,
      );
      objets.push(p.ombre, p.pochette);
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
    if (bac.etat === 'fouille' || bac.etat === 'rien')
      ecrire('etiquette-message', B.saisie.en, B.saisie.largeur, [
        { contenu: bac.etat === 'fouille' ? P.fouille : P.rien, role: 'titrage', auPlus: 'intertitre' },
      ]);
    else if (bac.choisie !== undefined && choisie !== undefined)
      ecrire('etiquette-choisie', B.saisie.en, B.saisie.largeur, [
        { contenu: bac.choisie.titre, role: 'titrage', auPlus: 'intertitre' },
        { contenu: choisie, role: 'technique', auPlus: 'mention' },
      ]);
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
        { curseur: true, alignement: 'debut' },
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
    // Le lien part : on fouille (une playlist Spotify prend quelques secondes) ; puis la playlist importée, son titre et ce qu'on peut en jouer.
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
  }
  // On choisit ce qu'on a sous les yeux : une playlist prête, ce que la recherche a trouvé, ou ce que le lien a importé.
  const aChoisir =
    bac.etat !== 'fouille' &&
    (bac.cran === 'pretes'
      ? bac.themeAToucher !== true || bac.choisie !== undefined
      : bac.cran === 'chercher'
        ? resultats.length > 0
        : bac.importee !== undefined);
  if (aChoisir && bac.refus === undefined) objets.push(toucheAuBord('touche-choisir', 'principale', P.choisir, r, B.choisir, a.encrier));
  return { regard: r, objets };
}

/**
 * Les réglages : les commandes de la platine, puis la touche qui ouvre le salon. Le sélecteur de mode choisit le jeu ; un papier
 * dit ce que rapporte une piste dans ce mode.
 */
export function vueDesReglages(
  a: Ecritoire,
  mode: ModeDeJeu,
  reglages?: { readonly pistes: number; readonly extrait: number; readonly son: SonDeLaRoom },
): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  return {
    regard: r,
    objets: [
      platineArretee(a, { mode: mode.cran, ...(reglages !== undefined ? { reglages } : {}) }),
      ...phrase(a.textes.partie.bareme[mode.cle] ?? '', r, a.encrier),
      toucheAuBord('touche-ouvrir', 'principale', a.textes.partie.ouvrirLeSalon, r, T.reglages.ouvrir, a.encrier),
    ],
  };
}

/** Qui regarde le salon : l'hôte, un invité, ou celui à qui la platine vient de passer parce que l'hôte est parti. */
export type QuiRegardeLeSalon = 'hote' | 'invite' | 'nouvelHote';

/**
 * Le salon : le code en énorme sur l'étiquette, le QR code sur la kraft, le lien à copier, les pochettes, la touche qui allume
 * l'ampli (allumée une fois qu'il l'est), et celle de l'hôte, qui lance la face A.
 */
export function vueDuSalon(
  a: Ecritoire,
  etat: EtatDeLaPartie,
  code: string,
  qui: QuiRegardeLeSalon,
  ampliAllume = false,
  maPochette = false,
): VueDuTelephone {
  const lancer = etat.face === 'B' ? a.textes.touches.lancerLaFaceB : a.textes.touches.lancer;
  const r = SUR_LA_PLATINE;
  const S = T.salon;
  const lien = remplir(a.textes.partie.lien, { site: a.site ?? SITE.adresse, code });
  const joueurs = eventail(etat, a.textes, 'rien');
  const objets: Calque[] = [
    platineArretee(a, { code: { code, joueurs: etat.joueurs.length } }),
    ...kraftDuSalon(a, `https://${lien}`, etat),
    ...dessinerLaTablee(joueurs, placesEnEventail(joueurs.length), T.eventail.taille, r, T.trouve, a.encrier.largeur),
  ];
  // Le nouvel hôte lit, à la place du lien, que c'est lui qui tient la platine.
  if (qui === 'nouvelHote') objets.push(...phrase(a.textes.etats.patronSorti, r, a.encrier, S.lien.en, S.lien.largeur));
  else
    objets.push(
      ...papier(
        'etiquette-lien',
        r,
        S.lien.en,
        S.lien.largeur,
        -1.5,
        [
          { contenu: lien, role: 'techniqueFort', auPlus: 'texte' },
          { contenu: a.textes.partie.copier, role: 'technique', auPlus: 'gravure' },
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
  objets.push(toucheAuBord('touche-allume', 'secondaire', a.textes.ampli.allume, r, S.allume, a.encrier, ampliAllume ? 'allumee' : 'repos'));
  if (qui !== 'invite') objets.push(toucheAuBord('touche-lancer', 'principale', lancer, r, S.lancer, a.encrier));
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

/** La saisie du code d'une room : le papier où il s'écrit, lettre après lettre ; ce que le serveur a refusé ; la touche qui entre. */
export function vueDeLaSaisie(a: Ecritoire, tape: string, refus?: 'codeInconnu' | 'complet'): VueDuTelephone {
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
      { curseur: refus === undefined, alignement: 'debut', ancre: 'debut' },
    ).calques,
  ];
  if (refus !== undefined) objets.push(...phrase(a.textes.etats[refus], r, a.encrier, S.message));
  objets.push(toucheAuBord('touche-rejoindre', 'principale', a.textes.partie.rejoindre, r, S.entrer, a.encrier));
  return { regard: r, objets };
}

/**
 * Le hit-parade entre deux pistes : les pochettes du premier au dernier, et une pastille sur chacune qui a bougé. L'hôte y a la touche
 * qui lance la piste suivante.
 */
export function vueDuHitParade(a: Ecritoire, avant: EtatDeLaPartie, apres: EtatDeLaPartie, hote = false, maPochette = false): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const H = T.hitParade;
  const mouvements = mouvementsDuClassement(avant, apres);
  const P = a.textes.pastilles;
  const joueurs = hitParade(apres).map(({ joueur }): JoueurPose => {
    const m = mouvements[joueur.id];
    const texte = m === undefined ? undefined : m.genre === 'entree' ? P.entree : remplir(P[m.genre], { places: m.places });
    return { pochette: joueur.pochette, expression: joueur.expression, pastilles: texte !== undefined ? [texte] : [], dos: !joueur.connecte };
  });
  const places = joueurs.map((_, rang) => ({ en: [H.x[rang % 4] ?? 0, H.y[Math.floor(rang / 4)] ?? 0] as const, angle: H.angles[rang % 4] ?? 0 }));
  const objets = [platineArretee(a), ...dessinerLaTablee(joueurs, places, H.taille, r, T.pastille, a.encrier.largeur, 'hit-parade')];
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
  const enTete = classes.slice(0, premiers.length).map((c) => poseDe(c, remplir(a.textes.partie.points, { points: c.joueur.points })));
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
      ...dessinerLaTablee(enTete, premiers, F.suivants.taille, r, T.pastille, a.encrier.largeur, 'finale'),
      ...dessinerLaTablee(derriere, suivants, F.suivants.taille, r, T.trouve, a.encrier.largeur, 'suivant'),
      // Les disques remis, posés à cheval sur le coin de la pochette de chacun.
      ...remis,
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
