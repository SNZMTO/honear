/**
 * Les images de la planche « Tous les écrans du téléphone » (étape 5) : une partie d'exemple, de l'accueil à la finale, chaque écran
 * un arrêt du regard sur le meuble ; le chemin de l'invité ; une piste en saisie libre et une en 4 choix ; le hit-parade ; la finale ;
 * et chaque état, avec sa phrase. Les écrans sont ceux du jeu (scene/telephone/) : la planche n'y met que la partie d'exemple.
 * Rien n'est écrit sur le disque ici : ces images servent aussi aux contrôles et aux tests.
 */

import { hasard } from '../../lowpoly/aleatoire';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { MODES } from '../../regles/modes';
import type { ModeDeJeu, PisteDuMode } from '../../regles/modes';
import { codeDePartie, numeroDeLaPiste, partieA, type EtatDeLaPartie, type EvenementDePartie } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { pochetteAuHasard } from '../../regles/pochette';
import type { Pochette } from '../../ressources/pochettes';
import { TABLEE } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import { dessinerLAmpli } from '../../scene/ampli';
import { aiguillesA } from '../../scene/ampli/danse';
import type { Calque } from '../../scene/calque';
import { VERSO_DU_JEU } from '../../scene/disque/verso';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import type { DecorDeLaPiste } from '../../scene/piste/dessin';
import { empriseDe } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import {
  vueDeLAccueil,
  vueDeLaFinale,
  vueDeLAmpli,
  vueDeLaSaisie,
  vueDesReglages,
  vueDuBac,
  vueDuHitParade,
  vueDuSalon,
  type CranDuBac,
  type QuiRegardeLeSalon,
} from '../../scene/telephone/ecrans';
import { ampliDuSalon, decorDeLaPiste } from '../../scene/telephone/meuble';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import { autourDeLaPiste } from '../../scene/telephone/piste';
import { arreterLaSeance } from '../etape2/images';
import { seanceDExemple, seanceEntiere, type Seance } from '../etape2/seance';
import { imageDeLEcran } from '../etape4/scenes';
import { pochetteDExemple, reponseDExemple } from '../exemples';
import type { ImageDePlanche } from '../image';
import { LEGENDES_DES_ECRANS as L } from './legendes.fr';

const T = TABLEE.telephone;

// ————— La partie d'exemple —————

/** Les six joueurs de la partie d'exemple : toi (la pochette des planches), puis cinq potes tirés au sort, chacun son nom. */
export function joueursDExemple(textes: Textes): readonly { readonly id: string; readonly pochette: Pochette }[] {
  const potes = L.partie.potes.map(({ id, graine, artiste }) => ({
    id,
    pochette: { ...pochetteAuHasard(hasard(graine).suivant, textes.pochette), artiste: textes.pochette.artistes[artiste] ?? '' },
  }));
  return [{ id: 'toi', pochette: pochetteDExemple(textes) }, ...potes];
}

/** La séance de l'atelier : la piste qu'on joue au téléphone. Et son extrait, et sa révélation. */
export function laPiste(textes: Textes): { readonly seance: Seance; readonly extrait: number; readonly revelation: number } {
  const seance = seanceDExemple(textes);
  const { piste } = seanceEntiere(seance);
  if (piste?.extraitA === undefined || piste.revelation === undefined) throw new Error("La séance de l'atelier n'a pas de piste entière.");
  return { seance, extrait: piste.extraitA, revelation: piste.revelation.a };
}

const tape = (a: number, id: string, texte: string): EvenementDePartie => ({ genre: 'reponse', a, id, proposition: { genre: 'saisie', texte } });

/** La piste avec un feat de l'exemple, sous la vignette de l'atelier : la réponse ne se voit pas avant la révélation. */
const pisteAvecUnFeat = (textes: Textes): Reponse => {
  const { titre, interprete: artiste, feat } = textes.exemples.avecUnFeat;
  return { ...reponseDExemple(textes), titre, artiste, feat };
};

/**
 * La même partie, où la troisième piste a un feat : chacun prend ce qu'il reconnaît, et toi finit par avoir les trois,
 * le feat en dernier.
 */
function journalAvecUnFeat(textes: Textes): EvenementDePartie[] {
  const { extrait: x } = laPiste(textes);
  const avant = journalDExemple(textes).filter((e) => e.a < x);
  return [
    ...avant,
    { genre: 'extrait', a: x, piste: { reponse: pisteAvecUnFeat(textes) } },
    tape(x + 1.4, 'lady', 'angele'),
    tape(x + 2.2, 'toi', 'tout oublier'),
    tape(x + 3, 'dj', 'tout oublier angele'),
    tape(x + 4.1, 'toi', 'angele'),
    tape(x + 5.2, 'toi', textes.exemples.avecUnFeat.saisie),
  ];
}

/**
 * Le journal de la partie d'exemple, en saisie libre, sur l'horloge de la séance de l'atelier : deux pistes déjà jouées, puis la
 * troisième, celle de l'atelier. Chacun y fait ce que le brief demande de voir : trouver, presque trouver, rayer, perdre sa connexion,
 * ne rien dire.
 */
export function journalDExemple(textes: Textes): EvenementDePartie[] {
  const { seance, extrait: x, revelation } = laPiste(textes);
  const piste: PisteDuMode = { reponse: reponseDExemple(textes) };
  const autre: PisteDuMode = { reponse: { ...reponseDExemple(textes), titre: 'Voyage, voyage', artiste: 'Desireless' } };
  const arrivees = joueursDExemple(textes).map(({ id, pochette }, rang): EvenementDePartie => ({ genre: 'arrivee', a: -100 + rang, id, pochette }));
  return [
    { genre: 'ouverture', a: -110, mode: 'libre', pistes: L.partie.pistes },
    ...arrivees,
    { genre: 'extrait', a: -80, piste: autre },
    tape(-78, 'lady', 'desireless voyage voyage'),
    tape(-76, 'toi', 'voyage voyage'),
    tape(-75, 'baron', 'desireless'),
    { genre: 'revelation', a: -60 },
    { genre: 'extrait', a: -50, piste: autre },
    tape(-48, 'mamie', 'voyage voyage'),
    tape(-47, 'toi', 'desireless'),
    tape(-45, 'lady', 'desireless'),
    { genre: 'revelation', a: -30 },
    { genre: 'extrait', a: x, piste },
    tape(x + 1.2, 'dj', 'images'),
    tape(x + 2.2, 'toi', 'les demons du minou'),
    tape(x + 2.6, 'lady', 'images les demons de minuit'),
    { genre: 'deconnexion', a: x + 3, id: 'mc' },
    tape(x + 4, 'mamie', 'demons de minuit'),
    tape(seance.rayure, 'toi', 'voyage voyage'),
    tape(x + 6.5, 'toi', 'les démons de minuit'),
    { genre: 'revelation', a: revelation },
    { genre: 'retour', a: revelation + 6, id: 'mc' },
  ];
}

/** La même partie, où personne ne trouve la troisième piste : chacun s'y essaie, tous se trompent, sauf un qui ne dit rien. */
function journalOuPersonneNeTrouve(textes: Textes): EvenementDePartie[] {
  const { extrait: x } = laPiste(textes);
  const avant = journalDExemple(textes).filter(
    (e) => e.a < x || e.genre === 'revelation' || e.genre === 'extrait' || e.genre === 'deconnexion' || e.genre === 'retour',
  );
  return [
    ...avant,
    tape(x + 1.5, 'toi', 'voyage voyage'),
    tape(x + 2, 'lady', 'ouragan'),
    tape(x + 3.5, 'dj', 'desireless'),
    tape(x + 5, 'mamie', 'femme liberee'),
  ];
}

// ————— Les écrans —————

/** Un écran du jeu, posé sur le meuble, avec son nom de fichier et son titre de planche. */
const ecran = (fichier: string, titre: string, { regard, objets }: VueDuTelephone): ImageDePlanche => ({
  fichier,
  titre,
  regard,
  scene: dessinerLeMeuble({ regard, densite: DENSITE, objets }),
});

const ecranDAccueil = (a: Ecritoire): ImageDePlanche => ecran('accueil', L.ecrans.accueil, vueDeLAccueil(a));

/** La pochette tirée au hasard à l'arrivée : « C'est moi » suffit. C'est l'écran de l'étape 4. */
const ecranDeLaPochette = (a: Ecritoire, fichier = 'pochette', titre: string = L.ecrans.pochette): ImageDePlanche => ({
  ...imageDeLEcran(a.textes, a.encrier),
  fichier,
  titre,
});

/** Le bac de la partie d'exemple : ce que la recherche y trouve, ce que le lien collé importe, ou ce qui le refuse. */
function ecranDuBac(a: Ecritoire, cran: CranDuBac, etat?: 'tropCourt' | 'spotify'): ImageDePlanche {
  const vue = vueDuBac(a, {
    cran,
    ...(cran === 'chercher' ? { resultats: L.partie.resultats } : {}),
    ...(cran === 'laMienne' && etat === 'spotify' ? { lien: L.partie.lienSpotify } : {}),
    ...(cran === 'laMienne' && etat !== 'spotify' ? { importee: etat === 'tropCourt' ? L.partie.tropCourte : L.partie.importee } : {}),
    ...(etat !== undefined ? { refus: etat } : {}),
    retour: 'revenir',
  });
  const fichier = etat !== undefined ? `etat-${etat}` : `bac-${cran}`;
  const titre = etat === 'tropCourt' ? L.etats.tropCourt : etat === 'spotify' ? L.etats.spotify : L.ecrans.bac[cran];
  return ecran(fichier, titre, vue);
}

function ecranDesReglages(a: Ecritoire, mode: ModeDeJeu = MODES.libre): ImageDePlanche {
  const libre = mode.cle === MODES.libre.cle;
  return ecran(libre ? 'reglages' : 'reglages-4choix', libre ? L.ecrans.reglages : L.ecrans.reglagesQuatreChoix, vueDesReglages(a, mode));
}

function ecranDuSalon(a: Ecritoire, etat: EtatDeLaPartie, code: string, qui: QuiRegardeLeSalon): ImageDePlanche {
  const fichier = qui === 'hote' ? 'salon' : qui === 'invite' ? 'salon-invite' : 'etat-patronSorti';
  const titre = qui === 'hote' ? L.ecrans.salon : qui === 'invite' ? L.ecrans.salonInvite : L.etats.patronSorti;
  return ecran(fichier, titre, vueDuSalon(a, etat, code, qui));
}

const ecranDeLAmpli = (a: Ecritoire, allume: boolean): ImageDePlanche =>
  ecran(allume ? 'ampli' : 'etat-sonBloque', allume ? L.ecrans.ampli : L.etats.sonBloque, vueDeLAmpli(a, allume));

const ecranDeSaisie = (a: Ecritoire, tape: string, etat?: 'codeInconnu' | 'complet'): ImageDePlanche =>
  ecran(etat === undefined ? 'saisie' : `etat-${etat}`, etat === undefined ? L.ecrans.saisie : L.etats[etat], vueDeLaSaisie(a, tape, etat));

// ————— Une piste —————

/**
 * Le décor d'une piste en partie : la platine de l'accueil, le sélecteur de mode sur le cran du mode, et le numéro de la piste tel
 * que le journal le donne à l'instant où part son extrait.
 */
export const decorDuMode = (textes: Textes, cran: number, journal: readonly EvenementDePartie[], extrait: number): DecorDeLaPiste =>
  decorDeLaPiste(textes, cran, numeroDeLaPiste(partieA(journal, extrait)));

/** Les réponses proposées en 4 choix : la bonne en deuxième. */
export function choixDExemple(textes: Textes): Reponse[] {
  const bonne = reponseDExemple(textes);
  const leurres = textes.exemples.leurres.map((l): Reponse => ({ titre: l.titre, artiste: l.interprete, pochette: bonne.pochette }));
  return [leurres[0] ?? bonne, bonne, ...leurres.slice(1)];
}

interface ArretDePiste {
  readonly a: number;
  readonly fichier: string;
  readonly titre: string;
  /** Ce que toi as tapé à cet instant, et le mot collé sur l'étiquette (« Presque. », « Rayé. »). */
  readonly tape?: string;
  readonly mot?: string;
  readonly clavier?: boolean;
  /** Ce qui s'affiche par-dessus, en papier : un état. */
  readonly phrase?: string;
  /** Le joueur qui regarde, s'il n'est pas « toi ». */
  readonly qui?: string;
}

/** La piste en saisie libre, à des instants : la séance de l'atelier, et autour d'elle ce que le téléphone y pose. */
function ecransDeLaPisteLibre(a: Ecritoire, journal: readonly EvenementDePartie[], arrets: readonly ArretDePiste[]): ImageDePlanche[] {
  const { seance, extrait, revelation } = laPiste(a.textes);
  const reponse = reponseDExemple(a.textes);
  return arrets.flatMap((arret) => {
    const autour = (t: number, regard: Regard): Calque[] =>
      autourDeLaPiste(a, regard, {
        etat: partieA(journal, t),
        avantLExtrait: partieA(journal, extrait - 0.01),
        toi: arret.qui ?? 'toi',
        repondre: {
          genre: 'saisie',
          tape: arret.tape ?? '',
          ...(arret.mot !== undefined ? { mot: arret.mot } : {}),
          clavier: arret.clavier === true,
        },
        // Avant l'extrait (le décompte), rien n'est encore révélé : la piste n'a juste pas commencé.
        ...(t >= revelation ? { revelee: reponse } : {}),
        ...(arret.phrase !== undefined ? { phrase: arret.phrase } : {}),
      });
    const regard =
      arret.clavier === true
        ? { ...SUR_LA_PLATINE, origine: [SUR_LA_PLATINE.origine[0], SUR_LA_PLATINE.origine[1] + T.clavier.descente] as Vec2 }
        : undefined;
    return arreterLaSeance(
      {
        textes: a.textes,
        encrier: a.encrier,
        densite: DENSITE,
        verso: VERSO_DU_JEU,
        seance,
        autour,
        decor: decorDuMode(a.textes, MODES.libre.cran, journal, extrait),
        ...(regard !== undefined ? { regard } : {}),
      },
      [{ a: arret.a, fichier: arret.fichier, titre: arret.titre }],
    );
  });
}

/** La même piste en 4 choix : les quatre étiquettes, celle que toi a touchée enfoncée ; à la révélation, seule la bonne reste. */
function ecransDeLaPisteEnQuatreChoix(a: Ecritoire): ImageDePlanche[] {
  const { seance, extrait: x, revelation } = laPiste(a.textes);
  const choix = choixDExemple(a.textes);
  const reponse = reponseDExemple(a.textes);
  const journal: EvenementDePartie[] = [
    { genre: 'ouverture', a: -110, mode: 'quatreChoix', pistes: L.partie.pistes },
    ...joueursDExemple(a.textes).map(({ id, pochette }, rang): EvenementDePartie => ({ genre: 'arrivee', a: -100 + rang, id, pochette })),
    { genre: 'extrait', a: x, piste: { reponse, choix } },
    { genre: 'reponse', a: x + 1.5, id: 'lady', proposition: { genre: 'choix', rang: 1 } },
    { genre: 'reponse', a: seance.rayure, id: 'toi', proposition: { genre: 'choix', rang: 0 } },
    { genre: 'reponse', a: x + 4, id: 'dj', proposition: { genre: 'choix', rang: 1 } },
    { genre: 'revelation', a: revelation },
  ];
  const autour = (t: number, regard: Regard): Calque[] =>
    autourDeLaPiste(a, regard, {
      etat: partieA(journal, t),
      avantLExtrait: partieA(journal, x - 0.01),
      toi: 'toi',
      repondre: { genre: 'choix', proposes: choix, touchee: 0 },
      ...(t >= revelation ? { revelee: reponse } : {}),
    });
  return arreterLaSeance(
    {
      textes: a.textes,
      encrier: a.encrier,
      densite: DENSITE,
      verso: VERSO_DU_JEU,
      seance,
      autour,
      decor: decorDuMode(a.textes, MODES.quatreChoix.cran, journal, x),
    },
    [
      { a: L.instants.rayure, fichier: 'choix-extrait', titre: L.ecrans.choixExtrait },
      { a: L.instants.reponse, fichier: 'choix-reponse', titre: L.ecrans.choixReponse },
    ],
  );
}

// ————— Le hit-parade et la finale —————

const ecranDuHitParade = (a: Ecritoire, avant: EtatDeLaPartie, apres: EtatDeLaPartie): ImageDePlanche =>
  ecran('hit-parade', L.ecrans.hitParade, vueDuHitParade(a, avant, apres));

const ecranDeLaFinale = (
  a: Ecritoire,
  etat: EtatDeLaPartie,
  joues: readonly Reponse[],
  fichier = 'finale',
  titre: string = L.ecrans.finale,
): ImageDePlanche => ecran(fichier, titre, vueDeLaFinale(a, etat, joues));

// ————— Toutes les images —————

export interface ImagesDesEcrans {
  readonly hote: readonly ImageDePlanche[];
  readonly invite: readonly ImageDePlanche[];
  readonly libre: readonly ImageDePlanche[];
  readonly quatreChoix: readonly ImageDePlanche[];
  readonly fin: readonly ImageDePlanche[];
  readonly etats: readonly ImageDePlanche[];
  readonly danse: readonly ImageDePlanche[];
}

/** L'ampli de près, à quelques instants de la danse de ses aiguilles pendant un extrait. */
function imagesDeLaDanse(a: Ecritoire): ImageDePlanche[] {
  const { piste } = seanceEntiere(seanceDExemple(a.textes));
  if (piste?.extraitA === undefined) throw new Error("La séance de l'atelier n'a pas d'extrait.");
  const extrait = piste.extraitA;
  const ampli = (t: number): Calque =>
    dessinerLAmpli({ ...ampliDuSalon(a.textes, true), aiguilles: aiguillesA(piste, t, [laPiste(a.textes).seance.rayure]) }, DENSITE);
  const e = empriseDe([ampli(0)], a.encrier.largeur);
  if (e === undefined) throw new Error("L'ampli ne dessine rien.");
  const regard: Regard = { origine: [e.x - 8, e.y - 8], largeur: e.largeur + 16, hauteur: (e.hauteur + 16) * 0.5 };
  return L.danse.map((instant, rang) => ({
    fichier: `danse-${rang + 1}`,
    titre: instant.nom,
    regard,
    scene: dessinerLeMeuble({ regard, densite: DENSITE, objets: [ampli(extrait + instant.apres)] }),
  }));
}

export function imagesDesEcrans(textes: Textes, encrier: Encrier): ImagesDesEcrans {
  const a: Ecritoire = { textes, encrier };
  const journal = journalDExemple(textes);
  const code = codeDePartie(hasard(L.partie.graine).suivant);
  const { extrait: x, revelation } = laPiste(textes);
  const salon = partieA(journal, -94);
  const E = textes.etats;
  // La fin de la partie : la troisième piste révélée, et la partie close sur elle, comme si elle était la dernière.
  const fin = { ...partieA(journal, Infinity), phase: 'fin' as const };
  const joues: Reponse[] = [...L.partie.dejaJoues.map((j) => ({ ...reponseDExemple(textes), ...j })), reponseDExemple(textes)];
  // Une égalité en tête : deux joueurs, le même nombre de points.
  const egalite = partieA(
    [
      { genre: 'ouverture', a: 0, mode: 'libre', pistes: 1 },
      ...joueursDExemple(textes)
        .slice(0, 3)
        .map(({ id, pochette }, rang): EvenementDePartie => ({ genre: 'arrivee', a: rang + 1, id, pochette })),
      { genre: 'extrait', a: 10, piste: { reponse: reponseDExemple(textes) } },
      tape(11, 'lady', 'images'),
      tape(12, 'toi', 'images'),
      { genre: 'revelation', a: 20 },
    ],
    30,
  );
  return {
    hote: [
      ecranDAccueil(a),
      ecranDeLaPochette(a),
      ecranDuBac(a, 'pretes'),
      ecranDuBac(a, 'chercher'),
      ecranDuBac(a, 'laMienne'),
      ecranDesReglages(a),
      ecranDesReglages(a, MODES.quatreChoix),
      ecranDuSalon(a, salon, code, 'hote'),
      ecranDeLAmpli(a, true),
    ],
    invite: [ecranDeLaPochette(a, 'invite-pochette', L.ecrans.invitePochette), ecranDuSalon(a, salon, code, 'invite')],
    libre: ecransDeLaPisteLibre(a, journal, [
      { a: L.instants.decompte, fichier: 'libre-decompte', titre: L.ecrans.decompte },
      { a: x + 2.4, fichier: 'libre-presque', titre: L.ecrans.presque, tape: 'les demons du minou', mot: textes.pastilles.presque },
      { a: L.instants.rayure, fichier: 'libre-raye', titre: L.ecrans.raye, tape: 'voyage voyage', mot: textes.piste.raye },
      { a: x + 6.7, fichier: 'libre-trouve', titre: L.ecrans.trouve, tape: 'les démons de minuit' },
      { a: x + 5.5, fichier: 'libre-clavier', titre: L.ecrans.clavier, tape: 'les dém', clavier: true },
      { a: L.instants.reponse, fichier: 'libre-reponse', titre: L.ecrans.reponse },
    ]).concat(
      ecransDeLaPisteLibre(a, journalAvecUnFeat(textes), [
        { a: x + 5.6, fichier: 'libre-feat', titre: L.ecrans.feat, tape: textes.exemples.avecUnFeat.saisie },
      ]),
    ),
    quatreChoix: ecransDeLaPisteEnQuatreChoix(a),
    fin: [
      ecranDuHitParade(a, partieA(journal, x - 0.01), partieA(journal, revelation + 1)),
      ecranDeLaFinale(a, fin, joues),
      ecranDeLaFinale(a, egalite, [reponseDExemple(textes)], 'finale-egalite', L.etats.egalite),
    ],
    etats: [
      ecranDeSaisie(a, code.slice(0, 2)),
      ecranDeSaisie(a, L.partie.codeFaux, 'codeInconnu'),
      ecranDeSaisie(a, code, 'complet'),
      ecranDuBac(a, 'laMienne', 'tropCourt'),
      ecranDuBac(a, 'laMienne', 'spotify'),
      ecranDeLAmpli(a, false),
      ...ecransDeLaPisteLibre(a, journal, [
        { a: x + 4.2, fichier: 'etat-connexionPerdue', titre: L.etats.connexionPerdue, phrase: E.connexionPerdue, qui: 'mc' },
      ]),
      ...ecransDeLaPisteLibre(
        a,
        [
          ...journal,
          { genre: 'arrivee', a: x + 3.5, id: 'nouveau', pochette: pochetteAuHasard(hasard(L.partie.retardataire).suivant, textes.pochette) },
        ],
        [{ a: x + 4.2, fichier: 'etat-spectateur', titre: L.etats.spectateur, phrase: textes.partie.spectateur, qui: 'nouveau' }],
      ),
      ...ecransDeLaPisteLibre(a, journalOuPersonneNeTrouve(textes), [
        { a: L.instants.reponse, fichier: 'etat-personne', titre: L.etats.personne, phrase: E.personne },
      ]),
      ecranDuSalon(a, salon, code, 'nouvelHote'),
    ],
    danse: imagesDeLaDanse(a),
  };
}

/** Toutes les images, à la file, pour les contrôles et les tests. */
export const toutesLesImagesDesEcrans = (textes: Textes, encrier: Encrier): ImageDePlanche[] =>
  Object.values(imagesDesEcrans(textes, encrier)).flat();
