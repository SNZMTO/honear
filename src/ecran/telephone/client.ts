/**
 * Le téléphone : le client du jeu, dans un cadre de la page. Il se branche au serveur par une connexion (un WebSocket, ou le serveur
 * simulé du prototype : la même), ne sait de la partie que ce qu'on lui en dit, et n'envoie que des actions. Il règle son horloge sur
 * celle du serveur, et c'est sur elle que tout se joue. À chaque image, il montre l'écran que sa mémoire donne à cette heure : un écran
 * posé sur le meuble, monté une fois et remonté quand il change ; ou la piste, tenue à jour d'image en image, avec ce que le téléphone
 * pose autour d'elle. Par-dessus, une zone à toucher par touche ou par étiquette : un bouton de la page, sans rien de dessiné, qui dit
 * ce qu'il fait ; sur l'étiquette vierge, un champ où tape le clavier du téléphone. Une touche touchée s'enfonce, et l'écran d'après
 * attend qu'on l'ait vue au fond de sa course.
 */

import type { NomDeCalque } from '../../lexique';
import type { Action, Brancher, CeQueLeTelephoneCompte, Connexion, PlaylistTrouvee } from '../../regles/messages';
import { partieA } from '../../regles/partie';
import { avancementDeLExtrait, type Reponse } from '../../regles/piste';
import { TELEPHONE } from '../../ressources/ecran';
import { AMPLEURS, TOUCHES } from '../../ressources/mouvement';
import type { Pochette } from '../../ressources/pochettes';
import { MOT_DE_PASSE, PARTIE } from '../../ressources/reglages';
import { NOM_AU_PLUS } from '../../regles/pochette';
import type { CleDeVibration } from '../../ressources/vibrations';
import { calque, soulever, type Calque } from '../../scene/calque';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import { opacite, regler, rotation, type Reglage } from '../../scene/reglage';
import { empriseDe } from '../../scene/rendu/emprise';
import { affineDeToutes, composer, SANS_EFFET, type Affine } from '../../scene/rendu/transformation';
import {
  vueDeLAccueil,
  vueDeLaFinale,
  vueDeLAmpli,
  vueDeLaSaisie,
  vueDesReglages,
  vueDuBac,
  vueDuHitParade,
  vueDuSalon,
} from '../../scene/telephone/ecrans';
import { vueDuCompte } from '../../scene/telephone/compte';
import type { PoseDeLaPiste } from '../../scene/piste/pose';
import type { PisteEnScene } from '../../scene/piste/etat';
import { regardDeLaPiste } from '../../scene/piste/regard';
import { decorDeLaPiste } from '../../scene/telephone/meuble';
import { dessinerLeClassement, lignesDuClassement } from '../../scene/classement';
import {
  classementSousLeBac,
  dispositionDe,
  estDuMeuble,
  glissementSousLeDisque,
  glisserSousLeDisque,
  meubleAutour,
  rangerSousLeDisque,
  regardPourLaFenetre,
} from '../../scene/telephone/grand';
import { echellesDeLAmpli } from '../../scene/telephone/meuble';
import { decorDeLaSaison, DECOR_QUI_BOUGE, reglerLeDecorDeLaSaison } from '../../scene/saison';
import { kraftAuRepos } from '../../scene/telephone/kraft';
import { toucheAutrePlaylist, toucheQuitter } from '../../scene/telephone/quitter';
import { angleDuVolume, boutonDuVolume, cranDuVolume, INDEX_DU_VOLUME, type PlaceDuVolume } from '../../scene/telephone/volume';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import { lignesDeLaPiste, pochetteSurLeVerso, pouceAuPlusGrand, pouceDeLaPiste, tableeDeLaPiste } from '../../scene/telephone/piste';
import { REGARD_DE_LA_POCHETTE, vueDeLaPochette } from '../../scene/telephone/pochette';
import { imagesDesTitres, vueDesTitres } from '../../scene/telephone/titres';
import { calquesDeLaTouche } from '../../scene/touche';
import { lancerLaBoucle } from '../boucle';
import { factureVoulue } from '../facture';
import type { Horloge } from '../horloge';
import { monter, type Montage } from '../montage';
import { ouvrirLEcranDeLaPiste, type EcranDeLaPiste, type OptionsDEcran } from '../piste';
import { poserUnPlan, type Plan } from '../plan';
import { vider } from '../vider';
import { heureDuServeur } from './heure';
import {
  ADRESSE_AU_PLUS,
  aLaNouvelle,
  avancer,
  CHAMPS_DE_SAISIE,
  clavierOuvert,
  horsLigne,
  laReponseEstPartie,
  lienCopie,
  MEMOIRE_VIDE,
  recevoir,
  revenir,
  SAISIE_AU_PLUS,
  saisir,
  sonBloque,
  toucher,
  valider,
  type ChampDeSaisie,
  type Memoire,
  type Preparatifs,
  type Toucher,
} from './memoire';
import { ecranDuTelephone, type EcranDuTelephone } from './route';
import { ouvrirLeDiagnostic } from './diagnostic';
import { poserDesImages, type ImagePosee } from './images';
import { brancherLeHautParleur, sonVoulu, type HautParleur } from './son';
import { choseATouche } from './touchers';

/**
 * Ce qu'un téléphone garde d'une visite à l'autre : la room où il joue (pour y revenir s'il est rechargé, l'ampli allumé s'il
 * l'était), et la pochette qu'il a faite.
 */
export interface AGarder {
  readonly room: { readonly code: string; readonly jeton: string; readonly ampli: boolean } | undefined;
  readonly pochette: Pochette | undefined;
  /** Le secret de la session du compte où joue ce téléphone, s'il y est entré. */
  readonly session: string | undefined;
  /** « Mes playlists », importées sur cet appareil. */
  readonly mesPlaylists: readonly PlaylistTrouvee[];
}

export interface OptionsDuTelephone {
  /** La connexion au serveur : chaque nouvelle arrivera au téléphone, qui y enverra ses actions. */
  readonly brancher: Brancher;
  /** Une horloge qui bat pour de bon. L'heure du serveur s'en déduit, de question en question. */
  readonly horloge: Horloge;
  readonly ecritoire: Ecritoire;
  readonly preparatifs: Preparatifs;
  readonly densiteDeLEcran: () => number;
  readonly options: OptionsDEcran;
  /** La mémoire d'où partir : celle d'un téléphone ouvert à l'adresse d'une room, ou rechargé (voir `memoireDeDepart`). */
  readonly depart?: Memoire;
  /** Appelé chaque fois que le téléphone change d'écran : pour la page qui l'entoure. */
  readonly enChangeant?: (ecran: EcranDuTelephone['genre']) => void;
  /**
   * Vrai quand on fait glisser la page au doigt (son pied, sous le jeu, s'y montre) : une touche n'y agit qu'au doigt levé sans
   * avoir glissé, et l'on ne remet pas la page en place.
   */
  readonly defile?: () => boolean;
  /** Appelé chaque fois que ce qu'il y a à garder change. */
  readonly retenir?: (aGarder: AGarder) => void;
  /** Le vibreur du téléphone, s'il en a un. */
  readonly vibrer?: (cle: CleDeVibration) => void;
  /** Demande oui ou non (quitter la partie) ; sans elle, c'est oui. */
  readonly confirmer?: (question: string) => boolean;
  /** Vrai si le téléphone joue les extraits que le serveur lui donne (le jeu en ligne) ; sans cela, il reste muet. */
  readonly son?: boolean;
  /**
   * La proportion de la fenêtre (sa largeur sur sa hauteur), lue à chaque image : le regard la remplit, du téléphone au meuble entier
   * (voir `regardPourLaFenetre`). Sans elle, le cadre a la proportion du téléphone.
   */
  readonly fenetre?: () => number;
  /**
   * Ce que l'écran cache sur ses bords, en part de la largeur du cadre : en haut, l'encoche ou la Dynamic Island (`sur`) ; en bas,
   * la barre de Safari ou le trait de l'iPhone (`sous`). Le jeu dessine jusqu'aux bords, mais n'y pose rien à toucher : la table
   * continue sous l'encoche et sous la barre, la platine entière dessous, et les petites touches du coin descendent sous l'encoche.
   * Sans eux, aucun bord n'est caché.
   */
  readonly bords?: () => { readonly sur: number; readonly sous: number };
  /**
   * Vrai quand la page a demandé le diagnostic (« ?diagnostic ») : ce que font le son, la fenêtre et le champ où l'on tape part au
   * serveur, qui l'écrit dans son journal. De quoi comprendre un navigateur qu'on n'a pas sous la main.
   */
  readonly diagnostic?: boolean;
}

/** Un téléphone muet : rien à jouer, toujours prêt. */
const SANS_SON: HautParleur = {
  debloquer: () => undefined,
  suivre: () => undefined,
  pret: () => true,
  bloque: false,
  volumeReglable: true,
  cliquer: () => undefined,
  fermer: () => undefined,
};

export interface Telephone {
  /** Ce que seule la page voit (le tutoriel, l'écran d'accueil…), pour les statistiques : le téléphone le dit au serveur. */
  signaler(quoi: CeQueLeTelephoneCompte): void;
  fermer(): void;
}

/** Ce qu'on a monté dans une couche du cadre : son plan, sa scène, ce qui la fait telle, et les touches qu'on y enfonce. */
interface Montee {
  readonly cle: string;
  readonly plan: Plan;
  readonly montage: Montage;
  /** Les touches qu'on y enfonce, telles qu'on les a dessinées : chacune est un bloc qu'on repeint. */
  readonly touches: ReadonlyMap<NomDeCalque, Calque>;
  /** Les curseurs de ce qu'on y tape : ils clignotent. */
  readonly curseurs: readonly NomDeCalque[];
  /** Ce qui bouge du décor de saison qu'on y a posé : des chauves-souris qui battent des ailes, un fantôme qui flotte. */
  readonly babioles: readonly NomDeCalque[];
}

/** La vue d'un écran posé sur le meuble. */
function vueDe(e: Exclude<EcranDuTelephone, { readonly genre: 'piste' }>, a: Ecritoire): VueDuTelephone {
  switch (e.genre) {
    case 'accueil':
      return vueDeLAccueil(a, e.compte, true);
    case 'compte':
      return vueDuCompte(a, e.compte);
    case 'saisie':
      return vueDeLaSaisie(a, e.tape, e.refus);
    case 'pochette':
      return vueDeLaPochette(a, e.pochette, e.choisi, e.retouche, e.sansNom);
    case 'bac':
      return vueDuBac(a, e.bac);
    case 'reglages':
      return vueDesReglages(a, e.mode, { pistes: e.pistes, extrait: e.extrait, son: e.son });
    case 'salon':
      return vueDuSalon(a, e.etat, e.code, e.qui, true, e.copie);
    case 'ampli':
      return vueDeLAmpli(a, true);
    case 'hitParade':
      return vueDuHitParade(a, e.avant, e.apres, e.hote, true);
    case 'finale':
      return vueDeLaFinale(a, e.etat, e.joues, e.hote, true, true);
    case 'titres':
      return vueDesTitres(a, e.joues);
  }
}

/** Une couche du cadre, posée sur toute sa surface : la scène, ce qu'on pose autour de la piste, les zones à toucher. */
function couche(cadre: HTMLElement, nom: string): HTMLElement {
  const element = document.createElement('div');
  element.className = nom;
  element.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;';
  cadre.append(element);
  return element;
}

/** Les étiquettes où tape le clavier du téléphone, par ce qu'on y touche : la réponse, le code, la recherche, le lien, l'adresse e-mail. */
type SorteDeChamp = ChampDeSaisie;
const SORTES_DE_CHAMP: Partial<Readonly<Record<Toucher['genre'], SorteDeChamp>>> = {
  taper: 'reponse',
  taperLeCode: 'code',
  taperLaRecherche: 'recherche',
  collerLeLien: 'lien',
  taperLAdresse: 'email',
  taperLeNom: 'nom',
  taperLeMotDePasse: 'motDePasse',
};

/** Le clavier qu'un champ demande au téléphone : sa touche de validation, ses capitales, sa sorte. */
const CLAVIERS: Readonly<Record<SorteDeChamp, { readonly touche: string; readonly majuscules: string; readonly sorteDeClavier: string }>> = {
  reponse: { touche: 'send', majuscules: 'none', sorteDeClavier: 'text' },
  code: { touche: 'go', majuscules: 'characters', sorteDeClavier: 'text' },
  recherche: { touche: 'search', majuscules: 'none', sorteDeClavier: 'search' },
  lien: { touche: 'go', majuscules: 'none', sorteDeClavier: 'url' },
  email: { touche: 'send', majuscules: 'none', sorteDeClavier: 'email' },
  nom: { touche: 'done', majuscules: 'words', sorteDeClavier: 'text' },
  motDePasse: { touche: 'go', majuscules: 'none', sorteDeClavier: 'text' },
};

/** Ce qu'un champ laisse taper, au plus : quatre lettres pour un code, une adresse entière, un nom qui tient sur sa pochette… */
const LONGUEURS_AU_PLUS: Readonly<Record<SorteDeChamp, number>> = {
  reponse: SAISIE_AU_PLUS,
  code: PARTIE.code.longueur,
  recherche: SAISIE_AU_PLUS,
  lien: SAISIE_AU_PLUS,
  email: ADRESSE_AU_PLUS,
  nom: NOM_AU_PLUS,
  motDePasse: MOT_DE_PASSE.auPlus,
};

/** Combien de défilements de la page le diagnostic note, au plus. */
const DEFILEMENTS_NOTES = 30;

/** Les millisecondes d'une seconde : les animations de la page comptent en millisecondes, nos tables en secondes. */
const MS_PAR_SECONDE = 1000;

/** Les touches qui déplacent le curseur dans un champ : il revient au bout de ce qu'on a tapé, où on le voit. */
const DEPLACEMENTS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/** Ce qui dit qu'un doigt (ou la souris) s'est levé, ou que le navigateur l'a pris pour lui. */
const FINS_DU_DOIGT = ['pointerup', 'pointercancel'] as const;

/** Le volume, en pour cent, pour les aides à la lecture. */
const POUR_CENT = 100;
/** L'index du volume rejoint son angle en ce temps-là, à peu près : il en a fait l'essentiel en tant de « temps de rapprochement ». */
const RAPPROCHEMENTS = 3;
/** La molette tourne le bouton tant de fois moins qu'un doigt qui glisse d'autant. */
const MOLETTE = 4;
/** Plus près que ça de son angle, l'index y est. */
const DEMI_DEGRE = 0.5;

/** Le curseur d'un papier où l'on tape (« etiquette-reponse/curseur ») : il clignote. */
const CURSEUR = /\/curseur$/;

/** Les calques d'un arbre dont le nom répond à ce motif. */
function calquesNommes(arbre: Calque, motif: RegExp): NomDeCalque[] {
  const trouves: NomDeCalque[] = [];
  const parcourir = (c: Calque): void => {
    if (motif.test(c.nom)) trouves.push(c.nom);
    for (const d of c.contenu) if (d.genre === 'calque') parcourir(d);
  };
  parcourir(arbre);
  return trouves;
}

/** L'index d'un bouton rond (« bouton-pistes/index/trait/tourne ») : c'est lui qui tourne. */
const INDEX_D_UN_BOUTON = /^bouton-[^/]+\/index\/trait\/tourne$/;

/** Les index des boutons ronds d'un arbre, et l'angle où chacun est dessiné. */
function indexDesBoutons(arbre: Calque): { readonly nom: NomDeCalque; readonly angle: number }[] {
  const trouves: { readonly nom: NomDeCalque; readonly angle: number }[] = [];
  const parcourir = (c: Calque): void => {
    if (INDEX_D_UN_BOUTON.test(c.nom)) {
      const tourne = (c.transformations ?? []).find((t) => t.genre === 'tourner');
      if (tourne !== undefined && tourne.genre === 'tourner') trouves.push({ nom: c.nom, angle: tourne.de });
      return;
    }
    for (const d of c.contenu) if (d.genre === 'calque') parcourir(d);
  };
  parcourir(arbre);
  return trouves;
}

/** Une part d'une longueur, en pourcentage, pour poser une zone dans le cadre quelle que soit sa taille. */
const part = (longueur: number, totale: number): string => `${(longueur / totale) * 100}%`;

/**
 * Les calques d'un arbre qu'on peut toucher sur cet écran, où qu'ils soient : une touche posée sur le bois, un bouton de la platine,
 * l'onglet d'un intercalaire ; avec ce que leurs parents leur font (l'intercalaire choisi sort du bac, son onglet avec lui).
 */
function calquesATouche(
  objets: readonly Calque[],
  e: EcranDuTelephone,
  a: Ecritoire,
): { readonly calque: Calque; readonly sous: Affine; readonly chose: NonNullable<ReturnType<typeof choseATouche>> }[] {
  const trouves: { readonly calque: Calque; readonly sous: Affine; readonly chose: NonNullable<ReturnType<typeof choseATouche>> }[] = [];
  const parcourir = (c: Calque, sous: Affine): void => {
    const chose = choseATouche(c.nom, e, a.textes);
    if (chose !== undefined) {
      trouves.push({ calque: c, sous, chose });
      return;
    }
    const dedans = composer(sous, affineDeToutes(c.transformations ?? []));
    for (const d of c.contenu) if (d.genre === 'calque') parcourir(d, dedans);
  };
  for (const objet of objets) parcourir(objet, SANS_EFFET);
  return trouves;
}

/** L'enfoncement d'une touche, de 0 (au repos) à 1 (au fond de sa course) : son capuchon descend, ses ombres s'échangent. */
function enfoncement(nom: NomDeCalque, part: number): Reglage[] {
  const t = calquesDeLaTouche(nom as `touche-${string}`);
  return [
    { calque: t.capuchon, rang: 0, transformation: soulever(-part * TOUCHES.course) },
    opacite(t.ombreAuRepos, 1 - part),
    opacite(t.ombreEnfoncee, part),
  ];
}

/**
 * Ouvre le téléphone dans un cadre de la page, et le branche au serveur.
 * @param cadre un élément à la proportion du téléphone : on y pose la scène, et les zones à toucher par-dessus.
 */
export function ouvrirLeTelephone(cadre: HTMLElement, o: OptionsDuTelephone): Telephone {
  const a = o.ecritoire;
  vider(cadre);
  cadre.style.position = 'relative';
  // Un écran posé sur le meuble a deux couches : le meuble (la table, la platine, le bac…), qui ne change pas d'une lettre tapée à
  // l'autre, ni souvent d'un écran à l'autre ; et ce qu'on y pose devant (les papiers, les touches), dans la couche de la scène.
  const coucheDuMeuble = couche(cadre, 'meuble');
  const scene = couche(cadre, 'scene');
  // Autour de la piste, deux couches : la tablée (le classement, le décor de saison), qui ne change qu'avec les points ; et ce qu'on
  // touche, qui change à chaque lettre tapée. Une lettre ne redessine plus le classement.
  const coucheDeLaTablee = couche(cadre, 'tablee');
  const autour = couche(cadre, 'autour');
  const couverture = couche(cadre, 'couverture');
  const coucheDuVolume = couche(cadre, 'volume');
  const zones = couche(cadre, 'zones');

  let memoire: Memoire = o.depart ?? MEMOIRE_VIDE;
  const horloge = heureDuServeur();
  /** L'heure du serveur, lue à l'horloge du téléphone. */
  const heure = (): number => o.horloge.maintenant() + horloge.ecart;
  /** Combien de questions il reste à poser d'affilée sur l'heure, et quand poser la prochaine, à l'horloge du téléphone. */
  let questions: number = TELEPHONE.horloge.auDebut;
  let prochaineQuestion = 0;

  /** Ce qu'on a posé devant le meuble, sur l'écran montré (ses touches, ses papiers) ; et le meuble dessous. */
  let ecranMonte: Montee | undefined;
  let meubleMonte: Montee | undefined;
  let piste: { readonly lanceeA: number; readonly ecran: EcranDeLaPiste; readonly fenetre: string } | undefined;
  let posees: Montee | undefined;
  let tablee: Montee | undefined;
  /** Sur un grand écran, ce dont glisse sous le vinyle tout ce qu'on pose autour de la piste, d'un bloc (voir `montrerLaPiste`). */
  let glissementDeLaPiste = 0;
  let genre: EcranDuTelephone['genre'] | undefined;
  /** Ce que fait chaque zone posée, par son rang, et le calque qu'elle touche. */
  let choses: { readonly toucher: Toucher; readonly nom: NomDeCalque }[] = [];
  /** La touche qu'on vient d'enfoncer, et quand, à l'horloge du téléphone : l'écran d'après l'attend. */
  let enfoncee: { readonly nom: NomDeCalque; readonly depuis: number; readonly montree: number } | undefined;
  let garde = '';

  // Le champ où tape le clavier du téléphone : posé sur l'étiquette vierge ou sur celle du code, il est le même d'un écran à l'autre,
  // pour que le clavier ne se referme pas à chaque lettre.
  const champ = document.createElement('input');
  champ.className = 'champ';
  champ.type = 'text';
  champ.autocomplete = 'off';
  champ.spellcheck = false;
  champ.hidden = true;
  champ.setAttribute('autocorrect', 'off');
  zones.append(champ);

  const poserLesImages = poserDesImages(couverture);

  /**
   * La vraie pochette révélée, s'il y en a une, au milieu du disque retourné : rien avant que le disque ne soit à plat, son verso
   * en haut, ni quand la source n'en a pas, ni quand le verso montre la pochette sur tout le disque.
   */
  function laVraiePochette(revelee: Reponse | undefined, pose: PoseDeLaPiste): ImagePosee[] {
    const adresse = revelee !== undefined && 'vignette' in revelee.pochette ? revelee.pochette.image : undefined;
    const place = o.options.verso === 'etiquette' ? pochetteSurLeVerso(pose) : undefined;
    return adresse !== undefined && place !== undefined ? [{ adresse, ...place }] : [];
  }

  // Le diagnostic : les lignes s'amassent, et partent par paquets, quand la ligne est là, sans gêner les actions du jeu.
  let enLigne = false;
  const diagnostic =
    o.diagnostic === true
      ? ouvrirLeDiagnostic(o.horloge, (texte) => {
          if (!enLigne || connexion === undefined) return false;
          connexion.envoyer({ genre: 'diagnostic', texte });
          return true;
        })
      : undefined;
  const noter = diagnostic?.noter;
  noter?.(`page : ${navigator.userAgent} ; fenêtre ${window.innerWidth}×${window.innerHeight}, écran ${window.screen.width}×${window.screen.height}`);

  // Le haut-parleur : il joue l'extrait de la piste à l'heure du serveur, et dit quand il l'a chargé ; on le dit alors prêt.
  // Le volume du bouton de l'ampli, là où il y en a un. Un téléphone n'en a pas : ce sont ses boutons à lui qui règlent le son (sur
  // l'iPhone, la page ne le peut même pas), et l'extrait y joue en plein.
  const auDoigt = window.matchMedia('(pointer: coarse)').matches;
  let volume: number = TELEPHONE.volume.depart;
  const hautParleur = o.son === true ? brancherLeHautParleur(cadre, () => (auDoigt ? undefined : volume), noter) : SANS_SON;
  /** La piste (par son lancer) pour laquelle on s'est dit prêt, l'extrait chargé. */
  let pretPour: number | undefined;
  /** Vrai une fois qu'on a dit aux statistiques que le navigateur bloquait le son. */
  let sonBloqueDit = false;

  function envoyer(actions: readonly Action[]): void {
    for (const action of actions) connexion?.envoyer(action);
  }
  /** La mémoire change : on garde ce qu'il y a à garder, et la boucle repart. */
  function changer(suivante: Memoire): void {
    memoire = suivante;
    const aGarder: AGarder = {
      room:
        memoire.room !== undefined ? { code: memoire.room.code, jeton: memoire.room.jeton, ampli: memoire.ampliAllumeA !== undefined } : undefined,
      pochette: memoire.pochette,
      session: memoire.session,
      mesPlaylists: memoire.mesPlaylists,
    };
    const ecrit = JSON.stringify(aGarder);
    if (ecrit !== garde) {
      garde = ecrit;
      o.retenir?.(aGarder);
    }
    boucle.reveiller();
  }
  function agir(t: Toucher): void {
    compterLeToucher(t);
    const suite = toucher(memoire, t, heure(), o.preparatifs);
    changer(suite.memoire);
    envoyer(suite.actions);
  }
  /** Ce qu'un toucher dit aux statistiques : un code tapé pour entrer, une playlist tirée au hasard. */
  function compterLeToucher(t: Toucher): void {
    const prep = memoire.preparation;
    if (t.genre === 'entrer' && prep.ecran === 'saisie' && prep.tape.length === PARTIE.code.longueur) signaler('codeTape');
    if (t.genre === 'playlistAuHasard') signaler('playlistAuHasard');
  }
  /** Ce qu'on dit aux statistiques, qui attend la ligne si elle n'est pas là. */
  const aSignaler: CeQueLeTelephoneCompte[] = [];
  function signaler(quoi: CeQueLeTelephoneCompte): void {
    if (enLigne && connexion !== undefined) connexion.envoyer({ genre: 'statistique', quoi });
    else if (!aSignaler.includes(quoi)) aSignaler.push(quoi);
  }

  // Les nouvelles changent la mémoire, puis le téléphone envoie ce qu'elles appellent : « prêt » quand une piste est lancée.
  // On l'écrit avant d'envoyer quoi que ce soit : un serveur dans la page répond sur-le-champ.
  let connexion: Connexion | undefined;
  connexion = o.brancher(
    (nouvelle) => {
      if (nouvelle.genre === 'heure') {
        horloge.noter({ depart: nouvelle.depart, retour: o.horloge.maintenant(), serveur: nouvelle.heure });
        return;
      }
      const avant = memoire;
      changer(recevoir(memoire, nouvelle));
      const e = nouvelle.genre === 'evenement' ? nouvelle.evenement : undefined;
      if (e?.genre === 'jugee' && e.id === memoire.room?.toi && e.verdict === 'juste') o.vibrer?.('bonneReponse');
      envoyer(aLaNouvelle(avant, memoire));
    },
    (oui) => {
      changer(horsLigne(memoire, !oui));
      enLigne = oui;
      if (!oui) return;
      diagnostic?.envoyer();
      for (const quoi of aSignaler.splice(0)) signaler(quoi);
      // La ligne revient : on redemande l'heure, d'affilée ; on rentre dans son compte, et l'on redonne son jeton.
      questions = TELEPHONE.horloge.auDebut;
      prochaineQuestion = 0;
      if (memoire.session !== undefined) envoyer([{ genre: 'reprendreLeCompte', session: memoire.session }]);
      const retour = revenir(memoire);
      if (retour !== undefined) envoyer([retour]);
    },
  );

  // La page revient au premier plan : on redemande l'heure tout de suite. L'horloge du téléphone a pu dériver pendant la veille,
  // et la réponse dit que la ligne vit encore (sinon, elle se rouvre : voir `brancherEnLigne`).
  const auPremierPlan = (): void => {
    if (document.visibilityState !== 'visible') return;
    prochaineQuestion = 0;
    boucle.reveiller();
  };
  document.addEventListener('visibilitychange', auPremierPlan);

  /** On demande l'heure au serveur : souvent en se branchant, puis de temps en temps, pour suivre la dérive des horloges. */
  function demanderLHeure(): void {
    const local = o.horloge.maintenant();
    if (local < prochaineQuestion) return;
    const H = TELEPHONE.horloge;
    prochaineQuestion = local + (questions > 0 ? H.entreDeux : H.toutesLes);
    questions = Math.max(0, questions - 1);
    envoyer([{ genre: 'quelleHeure', depart: local }]);
  }

  /** La définition des toiles, à l'échelle où le cadre montre la scène. */
  /** La largeur exacte du cadre, en px de la page (pas arrondie : voir le plan). */
  // Lue une fois par image (la boucle l'oublie à chacune) : la lire force la page à se recalculer, après ce qu'on y a écrit.
  let largeurLue: number | undefined;
  const largeurDuCadre = (): number => (largeurLue ??= cadre.getBoundingClientRect().width);
  const definition = (regard: Regard): number =>
    factureVoulue(o.options.allegements, largeurDuCadre() > 0 ? largeurDuCadre() / regard.largeur : 1, o.densiteDeLEcran()).definition;

  /** La proportion de la fenêtre, à cette image ; rien : le cadre a celle du téléphone. */
  const proportion = (): number | undefined => o.fenetre?.();
  /** Le regard qui remplit la fenêtre, posé sur ce regard du téléphone. */
  const bords = (): { readonly sur: number; readonly sous: number } => o.bords?.() ?? { sur: 0, sous: 0 };
  /**
   * Le regard qui remplit la fenêtre : celui de la zone où l'on touche, prolongé au-dessus jusqu'au haut de l'écran (sous l'encoche,
   * la table continue) et dessous jusqu'à son bas.
   */
  const dansLaFenetre = (r: Regard, p: number | undefined): Regard => {
    if (p === undefined) return r;
    const regard = regardPourLaFenetre(p, r);
    const { sur, sous } = bords();
    const [dessus, dessous] = [sur * regard.largeur, sous * regard.largeur];
    return dessus > 0 || dessous > 0
      ? { origine: [regard.origine[0], regard.origine[1] - dessus], largeur: regard.largeur, hauteur: regard.hauteur + dessus + dessous }
      : regard;
  };
  /** Ce qu'on voit de ce regard du téléphone dans la fenêtre, sans ce que cachent ses bords (l'encoche, la barre de Safari). */
  const enVue = (r: Regard, p: number | undefined): Regard => (p === undefined ? r : regardPourLaFenetre(p, r));
  /** Tout ce que le regard parcourt pendant une piste, dans la fenêtre : du regard sur la platine à celui arrêté sur le disque. */
  const parcouru = (p: number): Regard => {
    const [debut, fin] = [0, AMPLEURS.regardSurLaReponse].map((glisse) => dansLaFenetre(regardDeLaPiste({ regard: glisse }), p));
    if (debut === undefined || fin === undefined) return dansLaFenetre(SUR_LA_PLATINE, p);
    const x0 = Math.min(debut.origine[0], fin.origine[0]);
    return {
      origine: [x0, debut.origine[1]],
      largeur: Math.max(debut.origine[0] + debut.largeur, fin.origine[0] + fin.largeur) - x0,
      hauteur: debut.hauteur,
    };
  };
  /** Le regard où l'on a monté la scène, dans la fenêtre. */
  let regardMonte: Regard = SUR_LA_PLATINE;
  /** Des images placées dans un regard, replacées dans un autre. */
  const replacer = (images: readonly ImagePosee[], de: Regard, dans: Regard): ImagePosee[] =>
    images.map((i) => ({ ...i, centre: [i.centre[0] + de.origine[0] - dans.origine[0], i.centre[1] + de.origine[1] - dans.origine[1]] as const }));
  /** Ce qui fait un écran posé tel qu'il est : l'écran, la définition de ses toiles, et la proportion de la fenêtre. */
  const cleDe = (e: EcranDuTelephone, p: number | undefined): string => JSON.stringify([e, definition(dansLaFenetre(SUR_LA_PLATINE, p)), p, bords()]);

  /**
   * Monte une scène dans une couche, à la place de ce qu'elle montrait. Chaque touche y est un bloc à elle, qu'on repeint enfoncée :
   * son capuchon est logé dans un puits qui le découpe, et ce qui est découpé ne se déplace pas d'un bloc.
   */
  function monterDans(
    dans: HTMLElement,
    avant: Montee | undefined,
    cle: string,
    arbre: Calque,
    regard: Regard,
    d: number,
    touches: ReadonlyMap<NomDeCalque, Calque>,
    fondre = false,
    croiser = false,
  ): Montee {
    const plan = poserUnPlan(dans, regard);
    plan.suivreLeCadre();
    const boutons = indexDesBoutons(arbre);
    const curseurs = calquesNommes(arbre, CURSEUR);
    const babioles = calquesNommes(arbre, DECOR_QUI_BOUGE);
    const montage = monter(arbre, {
      etendue: regard,
      reglables: new Set([...boutons.map((b) => b.nom), ...curseurs, ...babioles]),
      remplacables: new Set(touches.keys()),
      definition: d,
      mesurer: a.encrier.largeur,
      tracerLeTexte: a.encrier.tracer,
    });
    plan.element.append(montage.element);
    montage.regarder(regard.origine);
    faireTourner(montage, boutons);
    if (fondre && fondreSur(dans, plan.element, avant, croiser)) return { cle, plan, montage, touches, curseurs, babioles };
    finirLeFondu(dans);
    avant?.montage.demonter();
    vider(dans).append(plan.element);
    return { cle, plan, montage, touches, curseurs, babioles };
  }

  /**
   * Les boutons ronds qui tournent : l'angle que chacun montre, et ceux qui vont, en ce moment, de leur angle d'avant vers leur
   * nouveau cran. Un bouton redessiné sur un autre cran ne saute pas : il y tourne, en ralentissant (rien en version sobre).
   */
  const anglesMontres = new Map<NomDeCalque, number>();
  let tournants: { readonly montage: Montage; readonly nom: NomDeCalque; readonly de: number; readonly a: number; readonly depuis: number }[] = [];
  function faireTourner(montage: Montage, boutons: readonly { readonly nom: NomDeCalque; readonly angle: number }[]): void {
    for (const { nom, angle } of boutons) {
      // Le volume se tourne librement, à part (poserLeVolume).
      if (nom === INDEX_DU_VOLUME) continue;
      const avant = anglesMontres.get(nom);
      tournants = tournants.filter((t) => t.nom !== nom);
      if (avant === undefined || avant === angle || o.options.sobre) {
        anglesMontres.set(nom, angle);
        continue;
      }
      montage.regler([rotation(nom, 0, avant)]);
      tournants.push({ montage, nom, de: avant, a: angle, depuis: o.horloge.maintenant() });
    }
  }
  function tournerLesBoutons(): void {
    if (tournants.length === 0) return;
    const maintenant = o.horloge.maintenant();
    tournants = tournants.filter((t) => {
      const x = Math.min(1, (maintenant - t.depuis) / TELEPHONE.tourne);
      const angle = t.de + (t.a - t.de) * (1 - (1 - x) ** 3);
      try {
        t.montage.regler([rotation(t.nom, 0, angle)]);
      } catch {
        // Un montage démonté entre-temps : le bouton n'est plus à l'écran.
        return false;
      }
      anglesMontres.set(t.nom, angle);
      return x < 1;
    });
  }

  /**
   * Les curseurs clignotent : allumés une demi-période, éteints la suivante (toujours allumés en version sobre). On ne règle que
   * quand ils changent.
   */
  const curseursMontres = new WeakMap<Montage, boolean>();
  function clignoter(): void {
    const allume = o.options.sobre || Math.floor(o.horloge.maintenant() / TELEPHONE.curseur.demiPeriode) % 2 === 0;
    for (const m of [ecranMonte, posees]) {
      if (m === undefined || m.curseurs.length === 0 || curseursMontres.get(m.montage) === allume) continue;
      curseursMontres.set(m.montage, allume);
      try {
        m.montage.regler(m.curseurs.map((nom) => opacite(nom, allume ? 1 : 0)));
      } catch {
        // Un montage qui s'en va : rien à faire clignoter.
      }
    }
  }

  /**
   * Les touches du coin, telles qu'elles se posent dans ce regard quand on est dans une room (« Quitter », et « Autre playlist » chez
   * l'hôte), sous l'encoche s'il y en a une : le décor de saison ne va pas dessous. Le bac ouvert, aucune : il a son « Retour ».
   */
  function touchesDuCoin(r: Regard): Calque[] {
    const room = memoire.room;
    if (room === undefined || memoire.preparation.ecran === 'bac') return [];
    const sur = bords().sur * r.largeur;
    const hote = partieA(room.journal, Infinity).hote === room.toi;
    return [toucheQuitter(a, r, sur), ...(hote ? [toucheAutrePlaylist(a, r, sur)] : [])];
  }

  /** Ce qui bouge du décor de saison bouge, à chaque image (rien en version sobre). */
  function animerLeDecor(): void {
    if (o.options.sobre) return;
    const t = o.horloge.maintenant();
    for (const m of [ecranMonte, tablee, posees]) {
      if (m === undefined || m.babioles.length === 0) continue;
      try {
        m.montage.regler(reglerLeDecorDeLaSaison(m.babioles, t));
      } catch {
        // Un montage qui s'en va : rien à faire bouger.
      }
    }
  }

  /**
   * Les fondus d'un écran à l'autre en cours, un par couche, et ce qui reste à faire quand chacun finit : un autre écran qui arrive
   * dans la même couche le termine net.
   */
  const fondus = new Map<HTMLElement, { readonly animations: readonly Animation[]; readonly fin: () => void }>();
  /** Termine net le fondu de cette couche ; sans couche, ceux de toutes. */
  function finirLeFondu(dans?: HTMLElement): void {
    for (const [couche, f] of [...fondus]) {
      if (dans !== undefined && couche !== dans) continue;
      fondus.delete(couche);
      for (const animation of f.animations) animation.cancel();
      f.fin();
    }
  }
  /**
   * D'un écran à l'autre, le nouveau se pose par-dessus l'ancien et s'y fond : le meuble qui ne change pas reste où il est, seul ce qui
   * change apparaît. Rien quand on a demandé moins d'animations, ni dans un navigateur qui ne sait pas animer.
   * @param croiser vrai pour ce qui se pose devant le meuble : l'ancien s'efface pendant que le nouveau vient, sans quoi ce qu'il
   * montrait là où le nouveau ne montre rien resterait jusqu'au bout du fondu, puis disparaîtrait d'un coup.
   * @returns faux si l'on n'a pas fondu : c'est alors à l'appelant de poser le nouvel écran.
   */
  function fondreSur(dans: HTMLElement, nouveau: HTMLElement, avant: Montee | undefined, croiser = false): boolean {
    finirLeFondu(dans);
    // Rien dessous (la piste vient de s'en aller) : fondu sur la table nue, l'écran clignotait. Il se pose d'un coup.
    if (o.options.sobre || typeof nouveau.animate !== 'function' || avant === undefined) return false;
    for (const enfant of Array.from(dans.children)) if (enfant !== avant?.plan.element) enfant.remove();
    dans.append(nouveau);
    const duree = { duration: TELEPHONE.fondu * MS_PAR_SECONDE, easing: 'ease-out' };
    const animation = nouveau.animate([{ opacity: 0 }, { opacity: 1 }], duree);
    const ancien = croiser ? avant?.plan.element : undefined;
    const effacement =
      ancien !== undefined && typeof ancien.animate === 'function'
        ? ancien.animate([{ opacity: 1 }, { opacity: 0 }], { ...duree, fill: 'forwards' })
        : undefined;
    const fin = (): void => {
      avant?.montage.demonter();
      avant?.plan.element.remove();
    };
    fondus.set(dans, { animations: [animation, ...(effacement !== undefined ? [effacement] : [])], fin });
    animation.onfinish = () => {
      if (fondus.get(dans)?.animations[0] === animation) finirLeFondu(dans);
    };
    return true;
  }
  /** Une couche qui apparaît, fondue sur le noir : la scène d'une piste qui commence. Rien quand on a demandé moins d'animations. */
  function apparaitre(couche: HTMLElement): void {
    if (o.options.sobre || typeof couche.animate !== 'function') return;
    couche.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TELEPHONE.fondu * MS_PAR_SECONDE, easing: 'ease-out' });
  }

  /**
   * Le doigt posé, pas encore levé ; et les zones de l'écran d'avant qu'il touchait. L'action part dès qu'il se pose, et l'écran
   * change sous lui : ses zones restent dans la page, inertes et transparentes au toucher, jusqu'au doigt suivant. Sans elles, le
   * geste qui laisse partir le son (le doigt qui se lève, le clic) n'arrivait nulle part : c'est ce que l'iPhone attend pour jouer.
   */
  let doigtPose = false;
  const retirees: Element[] = [];
  const retirer = (zone: Element): void => {
    if (!doigtPose) {
      zone.remove();
      return;
    }
    zone.removeAttribute('data-zone');
    zone.setAttribute('aria-hidden', 'true');
    if (zone instanceof HTMLElement) zone.style.pointerEvents = 'none';
    retirees.push(zone);
  };

  /** Les zones à toucher de ce qu'on a posé dans ce regard : une par calque qu'on peut toucher sur cet écran, assez grande pour un pouce. */
  function poserLesZones(objets: readonly Calque[], regard: Regard, e: EcranDuTelephone): void {
    for (const zone of Array.from(zones.querySelectorAll('[data-zone]'))) retirer(zone);
    choses = [];
    let champPose = false;
    for (const { calque: c, sous, chose } of calquesATouche(objets, e, a)) {
      const emprise = empriseDe([c], a.encrier.largeur, sous);
      if (emprise === undefined) continue;
      const cote = TELEPHONE.zoneAuMoins;
      const [l, h] = [Math.max(cote, emprise.largeur), Math.max(cote, emprise.hauteur)];
      const [x, y] = [emprise.x + emprise.largeur / 2 - l / 2 - regard.origine[0], emprise.y + emprise.hauteur / 2 - h / 2 - regard.origine[1]];
      const place = `position:absolute;left:${part(x, regard.largeur)};top:${part(y, regard.hauteur)};width:${part(l, regard.largeur)};height:${part(h, regard.hauteur)};`;
      // Sans clavier qui tape tout seul, l'étiquette vierge et celle du code sont un champ : c'est le clavier du téléphone qui y tape.
      const sorte = o.preparatifs.clavier === undefined ? SORTES_DE_CHAMP[chose.toucher.genre] : undefined;
      if (sorte !== undefined) {
        // Une autre piste, c'est une autre réponse : le champ repart vide.
        poserLeChamp(sorte, sorte === 'reponse' && e.genre === 'piste' ? `reponse-${e.lanceeA}` : sorte, place, chose.libelle);
        champPose = true;
        continue;
      }
      const zone = document.createElement('button');
      zone.type = 'button';
      zone.className = 'zone';
      zone.dataset['zone'] = String(choses.length);
      zone.setAttribute('aria-label', chose.libelle);
      zone.style.cssText = place;
      zones.append(zone);
      choses.push({ toucher: chose.toucher, nom: c.nom });
    }
    if (!champPose) {
      if (document.activeElement === champ) champ.blur();
      champ.hidden = true;
      // Posé de nouveau, il reprendra ce que la mémoire a gardé (une adresse effacée, un code refusé), pas ce qu'il montrait.
      delete champ.dataset['cle'];
    }
  }

  /** Ce que la mémoire a gardé de ce qu'on a tapé dans ce champ : le champ, posé de nouveau, le reprend. */
  function dejaTape(sorte: SorteDeChamp): string {
    const prep = memoire.preparation;
    switch (sorte) {
      case 'reponse':
        return memoire.pouce.tape;
      case 'code':
        return prep.ecran === 'saisie' ? prep.tape : '';
      case 'email':
        return prep.ecran === 'compte' ? prep.email : '';
      case 'motDePasse':
        return prep.ecran === 'compte' ? (prep.motDePasse ?? '') : '';
      case 'nom':
        return prep.ecran === 'pochette' ? prep.pochette.artiste : '';
      case 'lien':
        return prep.ecran === 'bac' ? prep.bac.lien : '';
      case 'recherche':
        return prep.ecran === 'bac' ? prep.bac.recherche : '';
    }
  }

  /** Pose le champ du clavier sur une étiquette, avec ce qu'on y a déjà tapé, sans toucher à ce qu'on est en train d'y taper. */
  function poserLeChamp(sorte: SorteDeChamp, cle: string, place: string, libelle: string): void {
    const prep = memoire.preparation;
    if (champ.dataset['cle'] !== cle) {
      champ.dataset['cle'] = cle;
      champ.dataset['pour'] = sorte;
      champ.value = dejaTape(sorte);
      champ.maxLength = LONGUEURS_AU_PLUS[sorte];
      // Une adresse e-mail, le téléphone sait la proposer, et un mot de passe, son trousseau : celui avec lequel on entre, ou un
      // nouveau, qu'il peut proposer et garder. Le reste, il ne doit rien deviner. Un mot de passe ne s'affiche pas, même invisible.
      const nouveau = prep.ecran === 'compte' && prep.etape === 'nouveauMotDePasse';
      champ.type = sorte === 'motDePasse' ? 'password' : 'text';
      champ.setAttribute(
        'autocomplete',
        sorte === 'email' ? 'email' : sorte === 'motDePasse' ? (nouveau ? 'new-password' : 'current-password') : 'off',
      );
      const { touche, majuscules, sorteDeClavier } = CLAVIERS[sorte];
      champ.setAttribute('enterkeyhint', touche);
      champ.setAttribute('autocapitalize', majuscules);
      champ.setAttribute('inputmode', sorteDeClavier);
    }
    // Un mot de passe que la mémoire a effacé (il était faux) s'efface aussi du champ.
    if (sorte === 'motDePasse' && prep.ecran === 'compte' && champ.value !== (prep.motDePasse ?? '')) champ.value = prep.motDePasse ?? '';
    champ.setAttribute('aria-label', libelle);
    champ.style.cssText = place;
    champ.hidden = false;
  }

  /**
   * Le vrai clavier du téléphone, pendant qu'on tape sa réponse. Il couvre le bas de l'écran, et le navigateur fait glisser la page
   * vers le haut pour montrer le champ : on remet le haut du téléphone en haut de ce qu'on voit, et l'on dit à l'écran où commence
   * le clavier, pour que l'étiquette se pose au-dessus de lui. Un navigateur qui ne dit pas ce qu'on voit garde le clavier ordinaire.
   */
  let glisse = 0;
  function suivreLeClavier(): void {
    const vu = window.visualViewport;
    // Un ordinateur a son clavier à lui : rien à suivre (au pixel près, un regard d'ordinateur se croyait parfois sous un clavier,
    // et l'étiquette remontait pendant qu'on tapait).
    const tape = auDoigt && document.activeElement === champ && champ.dataset['pour'] === 'reponse';
    if (vu === null || vu === undefined || !tape) {
      if (glisse !== 0) cadre.style.transform = '';
      glisse = 0;
      return;
    }
    // Le haut du téléphone, depuis le haut de ce qu'on voit : au-dessus, c'est que le navigateur l'a fait glisser ; on le redescend
    // d'autant, jamais plus bas que sa place.
    const haut = (): number => cadre.getBoundingClientRect().top - vu.offsetTop;
    const avant = haut();
    if (Math.round(avant) !== 0) {
      glisse = Math.max(0, glisse - avant);
      cadre.style.transform = glisse !== 0 ? `translateY(${glisse}px)` : '';
    }
    // Le dessus du clavier, en px depuis le haut du regard du téléphone (celui du grand écran commence plus haut). S'il est sous le
    // bas du regard, il n'y a pas de clavier à l'écran (un ordinateur, son clavier à lui) : rien ne bouge.
    const echelle = largeurDuCadre() / regardMonte.largeur;
    if (echelle <= 0) return;
    const dessus = Math.round((vu.height - haut()) / echelle - (SUR_LA_PLATINE.origine[1] - regardMonte.origine[1]));
    const ouvert = dessus < SUR_LA_PLATINE.hauteur;
    if (ouvert !== memoire.pouce.clavier || (ouvert && dessus !== memoire.pouce.dessusDuClavier)) changer(clavierOuvert(memoire, ouvert, dessus));
  }
  const vu = typeof window.visualViewport === 'object' ? window.visualViewport : null;
  vu?.addEventListener('resize', suivreLeClavier);
  vu?.addEventListener('scroll', suivreLeClavier);

  champ.addEventListener('focus', () => {
    // Sans rien qui dise ce qu'on voit, on fait place à un clavier ordinaire ; sinon, c'est le vrai clavier qui le dira.
    if (auDoigt && champ.dataset['pour'] === 'reponse' && vu === null) changer(clavierOuvert(memoire, true));
    suivreLeClavier();
  });
  champ.addEventListener('blur', () => {
    noter?.(`champ ${champ.dataset['pour'] ?? ''} lâché ; défilement ${window.scrollY}`);
    if (champ.dataset['pour'] === 'reponse') changer(clavierOuvert(memoire, false));
    suivreLeClavier();
    window.setTimeout(remettreEnPlace, 0);
  });
  champ.addEventListener('focus', () => noter?.(`champ ${champ.dataset['pour'] ?? ''} pris`));
  /**
   * La page ne défile jamais : l'iPhone la fait glisser pour montrer le champ où l'on tape, et l'y laisse parfois, le clavier fermé ;
   * tout l'écran paraît alors décalé. Hors d'un champ, on la remet en place.
   */
  function remettreEnPlace(): void {
    if (document.activeElement === champ || (window.scrollX === 0 && window.scrollY === 0)) return;
    noter?.(`défilement ${window.scrollX},${window.scrollY} : remis en place`);
    window.scrollTo(0, 0);
  }
  /** Combien de défilements le diagnostic a notés : les premiers suffisent. */
  let defilementsNotes = 0;
  const quandLaPageDefile = (): void => {
    if (defilementsNotes < DEFILEMENTS_NOTES) {
      defilementsNotes++;
      noter?.(`la page défile : ${window.scrollY}`);
    }
    if (o.defile?.() !== true) remettreEnPlace();
  };
  window.addEventListener('scroll', quandLaPageDefile);
  const noterLaFenetre = (): void =>
    noter?.(
      `fenêtre ${window.innerWidth}×${window.innerHeight}, cadre ${cadre.clientWidth}×${cadre.clientHeight}, ` +
        `vue ${Math.round(vu?.width ?? 0)}×${Math.round(vu?.height ?? 0)} +${Math.round(vu?.offsetTop ?? 0)}, défilement ${window.scrollY}, ` +
        `bords ${Math.round(bords().sur * cadre.clientWidth)} en haut, ${Math.round(bords().sous * cadre.clientWidth)} en bas, ` +
        `seul sur l'écran ${String(window.matchMedia('(display-mode: standalone)').matches)}, ` +
        `page ${document.documentElement.scrollHeight} de haut, classes « ${document.body.className} », défile ${String(o.defile?.() === true)}`,
    );
  window.addEventListener('resize', noterLaFenetre);
  noterLaFenetre();
  /** Le champ où l'on tape, tel que l'écran l'a posé : c'est lui qui dit où va ce qu'on tape (voir `saisir`). */
  const champPose = (): SorteDeChamp | undefined => {
    const pour = champ.dataset['pour'];
    return champ.hidden ? undefined : CHAMPS_DE_SAISIE.find((c) => c === pour);
  };
  /** Ce qu'on a tapé part : la réponse, le code, la recherche, le lien. */
  const validerLeChamp = (): void => {
    if (champPose() === 'code') compterLeToucher({ genre: 'entrer' });
    const suite = valider(memoire, heure(), o.preparatifs, champPose());
    changer(suite.memoire);
    envoyer(suite.actions);
    // La réponse est partie ; ce qu'on tape ensuite la remplace : on garde le clavier ouvert, prêt pour un autre essai.
    if (champ.dataset['pour'] === 'reponse') champ.select();
    // Le nom est écrit : le clavier se ferme, la pochette se voit en entier. La recherche part, ou le lien : le clavier se ferme
    // sur ce qu'ils trouvent, qu'il cachait.
    const pour = champ.dataset['pour'];
    if (pour === 'nom' || pour === 'recherche' || pour === 'lien') champ.blur();
  };
  /** Un lien collé part tout seul : on n'a pas à chercher la touche « OK » d'un clavier. */
  let colle = false;
  champ.addEventListener('paste', () => {
    colle = champ.dataset['pour'] === 'lien';
  });
  /**
   * Ce qu'on tape. Le code s'écrit en capitales, sans les lettres qu'on confond ; un nom, sans ce que les polices n'ont pas : le champ
   * montre ce que la mémoire a gardé. Pas pendant qu'un clavier compose un mot (Android, les claviers qui devinent) : récrire le
   * champ sous lui le faisait doubler des lettres ; on le récrit quand il a fini.
   */
  const quandOnTape = (enComposant: boolean): void => {
    changer(saisir(memoire, champ.value, champPose()));
    if (champ.dataset['pour'] === 'code' && memoire.preparation.ecran === 'saisie') {
      if (!enComposant && champ.value !== memoire.preparation.tape) champ.value = memoire.preparation.tape;
      // Les quatre lettres sont là : on entre, sans chercher la touche « OK » du clavier.
      if (memoire.preparation.tape.length === PARTIE.code.longueur) {
        validerLeChamp();
        return;
      }
    }
    if (
      !enComposant &&
      champ.dataset['pour'] === 'nom' &&
      memoire.preparation.ecran === 'pochette' &&
      champ.value !== memoire.preparation.pochette.artiste
    )
      champ.value = memoire.preparation.pochette.artiste;
    if (colle) {
      colle = false;
      validerLeChamp();
    }
  };
  champ.addEventListener('input', (ev) => quandOnTape((ev as InputEvent).isComposing === true));
  champ.addEventListener('compositionend', () => quandOnTape(false));
  champ.addEventListener('keydown', (ev) => {
    // « Entrée » qui finit un mot qu'on compose (un clavier chinois, japonais…) ne valide rien.
    if (ev.key !== 'Enter' || ev.isComposing) return;
    ev.preventDefault();
    validerLeChamp();
  });

  /**
   * On revient dans l'étiquette de la réponse (on la touche, on y clique, on y retape) quand elle montre la réponse qu'on vient
   * d'envoyer : elle se vide, on voit qu'on y est, et l'on en tape une autre. Un brouillon pas encore envoyé, lui, reste. Une fois le
   * toucher fini, pas avant : rétrécie sous le doigt, l'étiquette laissait le toucher tomber à côté, et le clavier ne s'ouvrait pas.
   */
  const viderLaReponse = (): void => {
    if (champPose() !== 'reponse' || champ.value === '' || !laReponseEstPartie(memoire)) return;
    champ.value = '';
    changer(saisir(memoire, '', 'reponse'));
  };
  champ.addEventListener('focus', viderLaReponse);
  champ.addEventListener('click', viderLaReponse);
  /**
   * Le curseur qu'on voit est toujours au bout de ce qu'on a tapé : celui du champ, qu'on ne voit pas, y reste aussi, quoi qui le
   * déplace (un clic, une flèche, le pavé tactile de l'iPhone, un retour en arrière). Sans cela, ce qu'on tapait ensuite (un mot
   * effacé d'un coup, Ctrl + Retour arrière) partait de là où il était, souvent du début. Tout choisi (la réponse qu'on vient
   * d'envoyer, que ce qu'on tape remplace), il reste choisi.
   */
  const auBout = (): void => {
    if (document.activeElement !== champ) return;
    const fin = champ.value.length;
    if (fin > 0 && champ.selectionStart === 0 && champ.selectionEnd === fin) return;
    if (champ.selectionStart !== fin || champ.selectionEnd !== fin) champ.setSelectionRange(fin, fin);
  };
  document.addEventListener('selectionchange', auBout);
  champ.addEventListener('focus', auBout);
  champ.addEventListener('click', auBout);
  champ.addEventListener('keyup', (ev) => {
    if (DEPLACEMENTS.has(ev.key)) auBout();
  });
  champ.addEventListener('keydown', (ev) => {
    // Un mot effacé d'un coup, ou une lettre effacée : depuis le bout.
    if (ev.key === 'Backspace' || ev.key === 'Delete') auBout();
  });

  /**
   * Sur un ordinateur, on tape sans viser : une lettre tapée quand le champ est posé (l'étiquette de la réponse, le code, le nom…)
   * mais que la page a le regard ailleurs (on a cliqué à côté, on est revenu d'un autre onglet) y va tout droit. Seulement quand
   * rien d'autre n'a le clavier : ni une fenêtre posée par-dessus le jeu, ni ce qui se touche hors de lui.
   */
  const taperSansViser = (ev: KeyboardEvent): void => {
    if (champ.hidden || document.activeElement === champ || ev.key.length !== 1) return;
    // Un raccourci (Ctrl, Cmd) n'écrit rien ; AltGr (Ctrl + Alt sous Windows) et Option (sur un Mac) écrivent : @, €, œ…
    if ((ev.ctrlKey || ev.metaKey) && !ev.getModifierState('AltGraph')) return;
    const actif = document.activeElement;
    if (actif !== null && actif !== document.body && actif !== document.documentElement && !cadre.contains(actif)) return;
    if (document.querySelector('[aria-modal="true"]:not([hidden])') !== null) return;
    // L'espace sur une touche qu'on a choisie au clavier l'enfonce : on ne la lui prend pas.
    if (ev.key === ' ' && actif instanceof HTMLButtonElement) return;
    champ.focus({ preventScroll: true });
  };
  window.addEventListener('keydown', taperSansViser, true);

  function fermerLaPiste(): void {
    poserLesImages([], SUR_LA_PLATINE);
    piste?.ecran.fermer();
    piste = undefined;
    posees?.montage.demonter();
    posees = undefined;
    vider(autour);
    tablee?.montage.demonter();
    tablee = undefined;
    vider(coucheDeLaTablee);
  }

  /** @param cle celle de l'écran à cette proportion de la fenêtre (voir `cleDe`) : le même écran ne se remonte pas. */
  function montrerUnEcran(e: Exclude<EcranDuTelephone, { readonly genre: 'piste' }>, p: number | undefined, cle: string): void {
    if (piste !== undefined) fermerLaPiste();
    if (ecranMonte?.cle === cle) {
      ecranMonte.plan.suivreLeCadre();
      return;
    }
    const vue = vueDe(e, a);
    // Dans la fenêtre, l'écran garde sa place sur le meuble ; le reste du meuble, au repos, s'y voit. Sur un ordinateur, le regard
    // est le même d'un écran à l'autre, sur le meuble entier (le bac et l'ampli ne le font plus glisser), et ce qu'on touche d'un
    // écran posé sur la platine se range sous le vinyle (celui du bac reste sous le bac) ; seuls sa pochette et les titres joués,
    // posés sur la table, s'y montrent de près.
    const surLaTable = vue.regard === REGARD_DE_LA_POCHETTE;
    const surOrdinateur = p !== undefined && dispositionDe(p) === 'ordinateur';
    const base = surOrdinateur && !surLaTable ? SUR_LA_PLATINE : vue.regard;
    const regard = dansLaFenetre(base, p);
    const rangees =
      p !== undefined && vue.regard === SUR_LA_PLATINE ? rangerSousLeDisque(vue.objets, SUR_LA_PLATINE, p, a.encrier.largeur) : vue.objets;
    // Au salon, sur un grand écran, le classement dit déjà qui est là, sous le bac.
    const sousLeBac = p !== undefined && e.genre === 'salon' ? classementSousLeBac(regard) : undefined;
    const classement =
      sousLeBac !== undefined && e.genre === 'salon'
        ? dessinerLeClassement(lignesDuClassement(e.etat, a.textes, 'rien'), sousLeBac, regard, a.textes, a.encrier.largeur)
        : [];
    const objets = p !== undefined ? [...meubleAutour(a, vue.objets, regard), ...rangees, ...classement] : rangees;
    regardMonte = regard;
    poserLesImages(replacer(e.genre === 'titres' ? imagesDesTitres(e.joues) : [], vue.regard, regard), regard);
    const touches = new Map(vue.objets.filter((objet) => objet.nom.startsWith('touche-')).map((objet) => [objet.nom, objet] as const));
    // Un autre écran se fond sur l'ancien ; le même, qui change (une lettre tapée, un cran tourné), se repose tel quel.
    const fondre = e.genre !== genre;
    // Le décor de saison, s'il y en a un : sous ce que l'écran montre, ou par-dessus, là où rien ne se tient (ni les touches du coin),
    // dans ce qu'on voit (ni sous l'encoche, ni sous la barre de Safari).
    const saison = decorDeLaSaison(enVue(base, p), [...objets, ...touchesDuCoin(regard)], a.encrier.largeur);
    // Le meuble (ce qui vient d'abord : la platine, le bac, la kraft…) dans sa couche, sous tout le reste ; il n'est repeint que s'il
    // a changé. Les écrans le redonnent tel quel quand rien ne le change (voir `platineArretee`) : une lettre tapée, un écran qui
    // reste sur la platine ne le font plus repeindre.
    const auMeuble = objets.findIndex((objet) => !estDuMeuble(objet));
    const [meuble, devant] = auMeuble < 0 ? [objets, []] : [objets.slice(0, auMeuble), objets.slice(auMeuble)];
    const d = definition(regard);
    const cleDuMeuble = JSON.stringify([meuble.map(numeroDe), regard, d]);
    if (meubleMonte?.cle !== cleDuMeuble)
      meubleMonte = monterDans(
        coucheDuMeuble,
        meubleMonte,
        cleDuMeuble,
        dessinerLeMeuble({ regard, densite: DENSITE, objets: meuble }),
        regard,
        d,
        new Map(),
        fondre,
      );
    else meubleMonte.plan.suivreLeCadre();
    ecranMonte = monterDans(
      scene,
      ecranMonte,
      cle,
      calque('regard-devant', [...saison.dessous, ...devant, ...saison.dessus]),
      regard,
      d,
      touches,
      fondre,
      true,
    );
    poserLesZones(rangees, regard, e);
  }

  /** Un numéro par calque, tant qu'il existe : deux écrans qui ont le même meuble (le même objet) ont les mêmes numéros. */
  const numeros = new WeakMap<Calque, number>();
  let dernierNumero = 0;
  const numeroDe = (c: Calque): number => {
    let n = numeros.get(c);
    if (n === undefined) {
      n = ++dernierNumero;
      numeros.set(c, n);
    }
    return n;
  };

  /** Ce qu'on a monté d'un écran posé sur le meuble s'en va : une piste arrive, ou le téléphone se ferme. */
  function fermerLEcran(): void {
    finirLeFondu();
    ecranMonte?.montage.demonter();
    ecranMonte = undefined;
    meubleMonte?.montage.demonter();
    meubleMonte = undefined;
    vider(coucheDuMeuble);
  }

  function montrerLaPiste(e: Extract<EcranDuTelephone, { readonly genre: 'piste' }>, t: number): void {
    if (ecranMonte !== undefined || meubleMonte !== undefined) fermerLEcran();
    const p = proportion();
    const fenetre = JSON.stringify([p, bords()]);
    // Une autre piste, ou une fenêtre qui change de proportion : la scène se remonte.
    if (piste?.lanceeA !== e.lanceeA || piste.fenetre !== fenetre) {
      const nouvelle = piste?.lanceeA !== e.lanceeA;
      fermerLaPiste();
      const decor = decorDeLaPiste(a.textes, e.cran, e.numero);
      const aiguilleDesPistes = e.numero.sur > 0 ? e.numero.numero / e.numero.sur : 0;
      const ecran = ouvrirLEcranDeLaPiste(scene, {
        decor,
        textes: a.textes,
        encrier: a.encrier,
        horloge: o.horloge,
        densiteDeLEcran: o.densiteDeLEcran,
        options: o.options,
        ...(p !== undefined
          ? {
              fenetre: {
                regardPour: (r: Regard) => dansLaFenetre(r, p),
                meuble: meubleAutour(a, [], parcouru(p), false, [aiguilleDesPistes, 0], echellesDeLAmpli(e.numero.sur, e.scene.piste?.duree)),
                // L'aiguille de gauche dit où en est la face, celle de droite, l'extrait.
                aiguilles: (s: PisteEnScene, t: number): readonly [number, number] => [
                  aiguilleDesPistes,
                  s.piste !== undefined ? avancementDeLExtrait(s.piste, t) : 0,
                ],
              },
            }
          : {}),
      });
      // La piste commence : sa scène apparaît, fondue sur le noir ; d'une piste à la suivante aussi, et tout ce qu'on pose autour.
      if (nouvelle) for (const couche of [scene, coucheDeLaTablee, autour]) apparaitre(couche);
      piste = { lanceeA: e.lanceeA, ecran, fenetre };
    }
    piste.ecran.tenirLaFacture();
    const pose = piste.ecran.montrer(e.scene, t);
    const regard = dansLaFenetre(SUR_LA_PLATINE, p);
    regardMonte = regard;
    // La vraie pochette suit le disque, dans le regard de la scène à cet instant (qui glisse encore, sur une fenêtre étroite).
    const regardDeLaScene = dansLaFenetre(regardDeLaPiste(pose), p);
    poserLesImages(replacer(laVraiePochette(e.autour.revelee, pose), regardDeLaPiste(pose), regardDeLaScene), regardDeLaScene);
    // Ce qu'on pose autour reste à l'écran pendant que le regard suit la piste : il a sa couche, au-dessus d'elle. Sur un grand
    // écran, il se range sous le vinyle.
    const d = definition(regard);
    const laFenetre = [d, p, bords()];
    const sousLeBac = p !== undefined ? classementSousLeBac(regard) : undefined;
    const { repondre } = e.autour;
    const clavierOuvert = repondre.genre === 'saisie' && repondre.clavier ? (repondre.dessus ?? true) : false;
    // La tablée : elle ne change qu'avec les points, les trouvailles, les têtes, le clavier qui s'ouvre, ce qu'on répond (taper, ou
    // toucher une étiquette) et la phrase d'un état, que le décor de saison évite.
    const lignes = lignesDeLaPiste(a.textes, e.autour);
    const proposes = repondre.genre === 'choix' ? repondre.proposes : undefined;
    const cleDeLaTablee = JSON.stringify([lignes, clavierOuvert, sousLeBac !== undefined, repondre.genre, proposes, e.autour.phrase, ...laFenetre]);
    if (tablee?.cle !== cleDeLaTablee) {
      const tableeDuTelephone = tableeDeLaPiste(a, SUR_LA_PLATINE, e.autour, sousLeBac !== undefined);
      // Ce qu'on touche, à sa plus grande place : le décor de saison s'en tient à l'écart, et, sur un grand écran, tout ce qu'on pose
      // glisse sous le vinyle d'un seul bloc, de ce qu'il faut pour la tablée et pour lui. Une lettre tapée ne le fait plus bouger.
      const pouceLePlusGrand = pouceAuPlusGrand(a, SUR_LA_PLATINE, e.autour);
      glissementDeLaPiste =
        p !== undefined ? glissementSousLeDisque([...tableeDuTelephone, ...pouceLePlusGrand], SUR_LA_PLATINE, p, a.encrier.largeur) : 0;
      const objets = [
        ...glisserSousLeDisque(tableeDuTelephone, glissementDeLaPiste),
        // Sur un grand écran, le classement se lit en colonne sous le bac.
        ...(sousLeBac !== undefined ? dessinerLeClassement(lignes, sousLeBac, regard, a.textes, a.encrier.largeur) : []),
      ];
      // Le décor de saison : pendant la piste, le regard glisse sous ce qu'on pose ; rien de posé sur le bois, loin du meuble et de la
      // kraft, ni de ce qu'on touche.
      const eviter = [...objets, ...glisserSousLeDisque(pouceLePlusGrand, glissementDeLaPiste), ...meubleAutour(a, [], regard), ...kraftAuRepos(a)];
      const saison = decorDeLaSaison(enVue(SUR_LA_PLATINE, p), [...eviter, ...touchesDuCoin(regard)], a.encrier.largeur, false);
      const arbre = calque('regard-tablee', [...saison.dessous, ...objets, ...saison.dessus]);
      tablee = monterDans(coucheDeLaTablee, tablee, cleDeLaTablee, arbre, regard, d, new Map());
    } else tablee.plan.suivreLeCadre();
    // Ce qu'on touche : l'étiquette où l'on tape (et ce que la piste y a collé), les étiquettes du 4 choix, la phrase d'un état.
    const trouve = e.autour.etat.piste?.trouve[e.autour.toi];
    const cle = JSON.stringify([repondre, e.autour.revelee, e.autour.phrase, trouve, e.pouce, glissementDeLaPiste, ...laFenetre]);
    if (posees?.cle === cle) {
      posees.plan.suivreLeCadre();
      return;
    }
    const objets = glisserSousLeDisque(pouceDeLaPiste(a, SUR_LA_PLATINE, e.autour), glissementDeLaPiste);
    posees = monterDans(autour, posees, cle, calque('regard-autour', objets), regard, d, new Map());
    poserLesZones(objets, regard, e);
  }

  /**
   * Le bouton du volume, toujours là : sur l'ampli, quand le regard le montre (un grand écran), sinon dans le coin du téléphone.
   * Il a sa couche à lui, et son index tourne sans le remonter : on le tourne librement, en glissant le doigt dessus (vers la
   * droite ou le haut, il monte), à la molette, aux flèches du clavier ; un toucher sans glisser le change d'un pas, de son côté.
   */
  let volumeMonte: Montee | undefined;
  /**
   * Vrai si le bouton est dans ce qu'on a monté. Sans lui (un téléphone, l'iPhone), on ne tourne pas un index qui n'y est pas : le
   * tourner levait une erreur à chaque image, qui coupait l'image en deux. Les touches du coin n'avaient pas de zone, les boutons
   * de la platine ne tournaient plus, et la page ne savait jamais quel écran elle montrait (pas de pied à l'accueil).
   */
  let avecLeBouton = false;
  /** L'angle où l'on montre son index, qui rejoint celui du volume en tournant ; le montage où on l'a posé, et quand. */
  let angleDuVolumeMontre: { readonly angle: number; readonly sur: Montage; readonly a: number } | undefined;
  const zoneDuVolume = document.createElement('button');
  zoneDuVolume.type = 'button';
  zoneDuVolume.className = 'zone';
  zoneDuVolume.dataset['volume'] = '';
  zoneDuVolume.setAttribute('role', 'slider');
  zoneDuVolume.setAttribute('aria-label', a.textes.ampli.volume);
  zoneDuVolume.setAttribute('aria-valuemin', '0');
  zoneDuVolume.setAttribute('aria-valuemax', String(POUR_CENT));
  zones.append(zoneDuVolume);
  /**
   * Une touche du coin, posée avec le volume dans le coin d'en face, sur les écrans d'une room : « Quitter », et chez l'hôte
   * « Autre playlist ». Elle agit au doigt levé dessus, comme les autres sur une page qui défile (voir `auToucher`).
   */
  const zoneDuCoin = (libelle: string, action: () => void): { readonly zone: HTMLButtonElement; readonly action: () => void } => {
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = 'zone';
    zone.dataset['coin'] = '';
    zone.setAttribute('aria-label', libelle);
    zone.hidden = true;
    zones.append(zone);
    return {
      zone,
      action: () => {
        hautParleur.cliquer('touche');
        action();
      },
    };
  };
  const coinQuitter = zoneDuCoin(a.textes.partie.quitter, () => {
    if (o.confirmer?.(a.textes.partie.quitterVraiment) === false) return;
    agir({ genre: 'quitter' });
  });
  const coinDeLHote = zoneDuCoin(a.textes.partie.autrePlaylist, () => agir({ genre: 'autrePlaylist' }));
  /** Ce que fait la touche du coin sous ce doigt, s'il en touche une. */
  const actionDuCoin = (cible: EventTarget | null): (() => void) | undefined => {
    const zone = cible instanceof HTMLElement ? cible.closest('[data-coin]') : null;
    return zone === coinQuitter.zone ? coinQuitter.action : zone === coinDeLHote.zone ? coinDeLHote.action : undefined;
  };
  /** Pose la zone d'une touche du coin sur ce qu'on en a dessiné, assez haute pour un pouce ; la cache s'il n'y a rien. */
  function poserLaZoneDuCoin(zone: HTMLElement, touche: Calque | undefined, r: Regard): void {
    const e = touche !== undefined ? empriseDe([touche], a.encrier.largeur) : undefined;
    zone.hidden = e === undefined;
    if (e === undefined) return;
    const h = Math.max(TELEPHONE.zoneAuMoins, e.hauteur);
    const y = e.y + e.hauteur / 2 - h / 2 - r.origine[1];
    // Par-dessus les zones de l'écran : ce qui serait dessous (un intercalaire du bac) ne lui prend pas le doigt.
    zone.style.cssText = `position:absolute;z-index:1;left:${part(e.x - r.origine[0], r.largeur)};top:${part(y, r.hauteur)};width:${part(e.largeur, r.largeur)};height:${part(h, r.hauteur)};`;
  }
  /** Où se pose le bouton du volume dans un regard : on ne le cherche qu'une fois par regard, pas à chaque image. */
  let placeDuVolume: { readonly regard: Regard; readonly ou: PlaceDuVolume } | undefined;
  function ouPoserLeVolume(r: Regard): PlaceDuVolume {
    const avant = placeDuVolume?.regard;
    if (
      placeDuVolume !== undefined &&
      avant !== undefined &&
      avant.origine[0] === r.origine[0] &&
      avant.origine[1] === r.origine[1] &&
      avant.largeur === r.largeur &&
      avant.hauteur === r.hauteur
    )
      return placeDuVolume.ou;
    // Sur l'ampli s'il est en vue ; sinon sur le coin de la platine, s'il l'est ; sinon dans le coin du cadre.
    const enVue = (objets: readonly Calque[]): boolean => {
      const e = empriseDe(objets, a.encrier.largeur);
      return (
        e !== undefined &&
        e.x >= r.origine[0] &&
        e.y >= r.origine[1] &&
        e.x + e.largeur <= r.origine[0] + r.largeur &&
        e.y + e.hauteur <= r.origine[1] + r.hauteur
      );
    };
    const ou: PlaceDuVolume = enVue(boutonDuVolume(a, r, volume, 'ampli'))
      ? 'ampli'
      : enVue(boutonDuVolume(a, r, volume, 'platine'))
        ? 'platine'
        : 'coin';
    placeDuVolume = { regard: r, ou };
    return ou;
  }
  function poserLeVolume(): void {
    const r = regardMonte;
    const ou = ouPoserLeVolume(r);
    const d = definition(r);
    // Les touches du coin, dans une room, hors du bac ; sous l'encoche, rien ne se touche : elles descendent d'autant.
    const room = memoire.room;
    const auCoin = room !== undefined && memoire.preparation.ecran !== 'bac';
    const hote = room !== undefined && partieA(room.journal, Infinity).hote === room.toi;
    const sur = bords().sur * r.largeur;
    const cle = JSON.stringify([ou, r, d, auCoin, hote, sur]);
    const pourCent = String(Math.round(volume * POUR_CENT));
    if (zoneDuVolume.getAttribute('aria-valuenow') !== pourCent) zoneDuVolume.setAttribute('aria-valuenow', pourCent);
    if (volumeMonte?.cle === cle) {
      volumeMonte.plan.suivreLeCadre();
      if (avecLeBouton) tournerLeVolume(volumeMonte.montage);
      return;
    }
    const coin = touchesDuCoin(r);
    // Au téléphone, et là où la page ne règle pas le volume (l'iPhone), pas de bouton : ce sont ceux du téléphone.
    const reglable = hautParleur.volumeReglable && !auDoigt;
    zoneDuVolume.hidden = !reglable;
    const objets = [...(reglable ? boutonDuVolume(a, r, volume, ou, sur) : []), ...coin];
    volumeMonte = monterDans(coucheDuVolume, volumeMonte, cle, calque('regard-volume', objets), r, d, new Map());
    avecLeBouton = reglable;
    if (avecLeBouton) tournerLeVolume(volumeMonte.montage);
    poserLaZoneDuCoin(
      coinQuitter.zone,
      coin.find((c) => c.nom === 'touche-quitter'),
      r,
    );
    poserLaZoneDuCoin(
      coinDeLHote.zone,
      coin.find((c) => c.nom === 'touche-autre-playlist'),
      r,
    );
    const bouton = objets.find((c) => c.nom === 'bouton-volume');
    const e = bouton !== undefined ? empriseDe([bouton], a.encrier.largeur) : undefined;
    if (e === undefined) return;
    // Assez grande pour un pouce : elle déborde du bouton.
    const cote = Math.max(TELEPHONE.zoneAuMoins, e.largeur, e.hauteur);
    const x = e.x + e.largeur / 2 - cote / 2 - r.origine[0];
    const y = e.y + e.hauteur / 2 - cote / 2 - r.origine[1];
    zoneDuVolume.style.cssText = `position:absolute;touch-action:none;left:${part(x, r.largeur)};top:${part(y, r.hauteur)};width:${part(cote, r.largeur)};height:${part(cote, r.hauteur)};`;
  }
  /** Tourne l'index du volume vers l'angle de son volume : il le suit de près quand on glisse, et y va en douceur après un pas. */
  function tournerLeVolume(montage: Montage): void {
    const cible = angleDuVolume(volume);
    const maintenant = o.horloge.maintenant();
    const avant = angleDuVolumeMontre;
    const angle =
      avant === undefined || avant.sur !== montage || o.options.sobre
        ? cible
        : cible + (avant.angle - cible) * Math.exp((-RAPPROCHEMENTS * (maintenant - avant.a)) / TELEPHONE.tourne);
    const proche = Math.abs(angle - cible) < DEMI_DEGRE ? cible : angle;
    if (avant?.sur === montage && avant.angle === proche) return;
    montage.regler([rotation(INDEX_DU_VOLUME, 0, proche)]);
    angleDuVolumeMontre = { angle: proche, sur: montage, a: maintenant };
  }
  /** Règle le volume ; quand l'index passe un cran gravé, le bouton fait son petit bruit. */
  function reglerLeVolume(nouveau: number): void {
    const avant = cranDuVolume(volume);
    volume = Math.min(1, Math.max(0, nouveau));
    if (cranDuVolume(volume) !== avant) {
      hautParleur.cliquer('cran');
      o.vibrer?.('touche');
    }
    boucle.reveiller();
  }
  const changerLeVolume = (sens: number): void => {
    const P = TELEPHONE.volume.pas;
    reglerLeVolume(Math.round((volume + sens * P) / P) * P);
  };
  /** Le doigt qui tourne le bouton du volume : d'où il est parti, à quel volume, et s'il a glissé. */
  let doigtSurLeVolume: { readonly id: number; readonly x: number; readonly y: number; readonly volume: number; glisse: boolean } | undefined;
  zoneDuVolume.addEventListener('pointerdown', (ev) => {
    if (!ev.isPrimary || ev.button !== 0) return;
    zoneDuVolume.setPointerCapture(ev.pointerId);
    doigtSurLeVolume = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, volume, glisse: false };
  });
  zoneDuVolume.addEventListener('pointermove', (ev) => {
    const d = doigtSurLeVolume;
    if (d === undefined || ev.pointerId !== d.id) return;
    const parcours = ev.clientX - d.x - (ev.clientY - d.y);
    if (!d.glisse && Math.abs(parcours) < TELEPHONE.volume.course * TELEPHONE.volume.pas) return;
    d.glisse = true;
    reglerLeVolume(d.volume + parcours / TELEPHONE.volume.course);
  });
  const lacherLeVolume = (ev: PointerEvent): void => {
    const d = doigtSurLeVolume;
    if (d === undefined || ev.pointerId !== d.id) return;
    doigtSurLeVolume = undefined;
    if (d.glisse || ev.type === 'pointercancel') return;
    // Un toucher sans glisser : un pas, du côté touché.
    const boite = zoneDuVolume.getBoundingClientRect();
    changerLeVolume(ev.clientX < boite.left + boite.width / 2 ? -1 : 1);
  };
  zoneDuVolume.addEventListener('pointerup', lacherLeVolume);
  zoneDuVolume.addEventListener('pointercancel', lacherLeVolume);
  zoneDuVolume.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    reglerLeVolume(volume - ev.deltaY / (TELEPHONE.volume.course * MOLETTE));
  });
  zoneDuVolume.addEventListener('keydown', (ev) => {
    const sens = ev.key === 'ArrowUp' || ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' ? -1 : 0;
    if (sens === 0) return;
    ev.preventDefault();
    changerLeVolume(sens);
  });

  /** Repeint une touche à cette part de sa course, de 0 (au repos) à 1 (au fond). */
  function peindreLaTouche(nom: NomDeCalque, course: number): void {
    const touche = ecranMonte?.touches.get(nom);
    if (touche === undefined || ecranMonte === undefined) return;
    try {
      ecranMonte.montage.remplir(nom, regler(touche, enfoncement(nom, course)).contenu);
    } catch {
      // Une toile refusée : la touche reste comme elle est ; l'action, elle, est partie.
    }
  }

  /**
   * La touche enfoncée descend au fond de sa course, repeinte à chaque image, et y reste un instant : tant qu'on ne l'y a pas vue,
   * l'écran d'après attend. S'il n'y a pas d'écran d'après (la touche ne change rien à ce qu'on voit), elle remonte.
   * @param cle celle de l'écran que la mémoire donne maintenant.
   * @returns vrai tant que l'écran d'après doit attendre.
   */
  function enfoncer(cle: string | undefined): boolean {
    if (enfoncee === undefined || ecranMonte === undefined || !ecranMonte.touches.has(enfoncee.nom)) {
      enfoncee = undefined;
      return false;
    }
    const ecoule = o.horloge.maintenant() - enfoncee.depuis;
    const auFond = TOUCHES.enfonce + TELEPHONE.tenue;
    if (ecoule < auFond) {
      const course = Math.min(1, ecoule / TOUCHES.enfonce);
      if (course > enfoncee.montree) peindreLaTouche(enfoncee.nom, course);
      enfoncee = { ...enfoncee, montree: course };
      return true;
    }
    if (cle !== ecranMonte.cle) {
      enfoncee = undefined;
      return false;
    }
    const course = Math.max(0, 1 - (ecoule - auFond) / TOUCHES.remonte);
    peindreLaTouche(enfoncee.nom, course);
    enfoncee = course > 0 ? { ...enfoncee, montree: course } : undefined;
    return false;
  }

  /** Le son, à cette heure : ce qu'il faut jouer ; et pendant le décompte, « prêt » dès que l'extrait est chargé. */
  function ecouter(t: number): void {
    const voulu = sonVoulu(memoire);
    hautParleur.suivre(voulu, t);
    // Le navigateur a bloqué le son : on le compte, une fois ; et l'écran demande qu'on le touche, tant qu'il le bloque.
    if (hautParleur.bloque && !sonBloqueDit) {
      sonBloqueDit = true;
      signaler('sonBloque');
    }
    if (hautParleur.bloque !== (memoire.sonBloque === true)) changer(sonBloque(memoire, hautParleur.bloque));
    if (voulu === undefined || voulu.depuis !== undefined || pretPour === voulu.lanceeA || !hautParleur.pret(voulu.adresse)) return;
    pretPour = voulu.lanceeA;
    envoyer([{ genre: 'pret' }]);
  }

  const boucle = lancerLaBoucle(() => {
    largeurLue = undefined;
    demanderLHeure();
    const t = heure();
    const suite = avancer(memoire, t);
    if (suite.memoire !== memoire) changer(suite.memoire);
    envoyer(suite.actions);
    ecouter(t);
    if (document.activeElement === champ || glisse !== 0) suivreLeClavier();
    const e = ecranDuTelephone(memoire, t, o.preparatifs, a.textes);
    if (e.genre === 'piste') {
      if (enfoncer(undefined)) return true;
      montrerLaPiste(e, t);
    } else {
      const p = proportion();
      const cle = cleDe(e, p);
      if (enfoncer(cle)) return true;
      montrerUnEcran(e, p, cle);
    }
    // La page apprend d'abord quel écran on montre : son pied, ses liens en dépendent.
    if (e.genre !== genre) {
      genre = e.genre;
      o.enChangeant?.(genre);
      noterLaFenetre();
    }
    // Puis ce qui se pose par-dessus et ce qui bouge, chacun pour soi : une erreur dans l'un ne prive pas les autres de leur image
    // (le volume en levait une à chaque image, sur l'iPhone, et les touches du coin n'avaient plus de zone). Elle se dit ensuite.
    let erreur: unknown;
    for (const etape of [poserLeVolume, tournerLesBoutons, clignoter, animerLeDecor])
      try {
        etape();
      } catch (raison) {
        erreur ??= raison;
      }
    if (erreur !== undefined) throw erreur;
    // L'heure fait tout changer : le décompte, l'extrait, la révélation, le clavier qui tape. Le téléphone ne s'endort pas.
    return true;
  });

  /**
   * Le clic qui suit un doigt posé sur les zones (ou la souris) : la zone a fait, au doigt posé ou levé, ce qu'elle avait à faire,
   * et ce clic tomberait sur l'écran d'après. On l'avale. Le clavier et les aides à la lecture valident par un clic sans pointeur :
   * celui-là agit toujours.
   */
  let avaler = false;
  const zoneDe = (cible: EventTarget | null): { readonly toucher: Toucher; readonly nom: NomDeCalque } | undefined => {
    const zone = cible instanceof HTMLElement ? cible.closest<HTMLElement>('[data-zone]') : null;
    return zone !== null ? choses[Number(zone.dataset['zone'])] : undefined;
  };
  /** La touche touchée s'enfonce ; l'écran d'après attendra qu'on l'ait vue au fond de sa course. */
  const enfoncerLaTouche = (z: { readonly nom: NomDeCalque }): void => {
    if (z.nom.startsWith('touche-')) enfoncee = { nom: z.nom, depuis: o.horloge.maintenant(), montree: 0 };
  };
  /**
   * Une zone pressée : sa touche s'enfonce (sauf si elle l'est déjà, enfoncée au doigt posé), le téléphone vibre un rien, le bouton
   * fait son petit bruit, et l'action part.
   */
  const presser = (z: { readonly toucher: Toucher; readonly nom: NomDeCalque }, dejaEnfoncee = false): void => {
    // Une touche ne prend pas le clavier : on le ferme nous-mêmes, pour voir ce qu'elle fait (un disque choisi, la pochette tirée).
    if (document.activeElement === champ) champ.blur();
    if (!dejaEnfoncee || enfoncee?.nom !== z.nom) enfoncerLaTouche(z);
    if (z.nom.startsWith('touche-')) o.vibrer?.('touche');
    hautParleur.cliquer(z.nom.startsWith('bouton-') ? 'cran' : 'touche');
    if (z.toucher.genre === 'partagerLeLien') partagerLeLien();
    agir(z.toucher);
  };
  /**
   * Le doigt posé sur une zone qui n'agit qu'au doigt levé : d'où il est parti, et ce qu'elle fera. Ce sont les touches d'une page
   * qu'on fait glisser (un doigt qui se pose sur une touche de l'accueil veut peut-être aller voir son pied), le partage du lien (le
   * navigateur ne le permet qu'au geste fini) et les touches du coin (« Quitter » demande qu'on confirme). Un doigt qui glisse ne
   * touche plus rien. Au doigt levé, pas au clic : l'iPhone donne parfois son clic à la zone voisine, ou ne le donne pas du tout.
   */
  let enAttente: { readonly id: number; readonly x: number; readonly y: number; readonly agir: () => void } | undefined;
  /** Vrai si le doigt a glissé, depuis là où il s'est posé, plus loin qu'un toucher. */
  const aGlisse = (ev: PointerEvent, depart: { readonly x: number; readonly y: number }): boolean =>
    Math.hypot(ev.clientX - depart.x, ev.clientY - depart.y) > TELEPHONE.doigt.glisse;
  /**
   * Le lien de la room : au téléphone, son partage (WhatsApp, Messages…) ; sur un ordinateur, ou sans partage, copié, et le papier le
   * dit un instant. Il faut le geste fini pour cela : il part au doigt levé, pas au doigt posé.
   */
  function partagerLeLien(): void {
    const room = memoire.room;
    if (room === undefined) return;
    const lien = `${window.location.origin}/${room.code}`;
    if (auDoigt && typeof navigator.share === 'function') {
      navigator.share({ title: a.textes.logo.nom, text: a.textes.partie.viensJouer, url: lien }).then(
        () => signaler('lienPartage'),
        () => undefined,
      );
      return;
    }
    navigator.clipboard?.writeText(lien).then(
      () => {
        signaler('lienCopie');
        changer(lienCopie(memoire, heure()));
      },
      () => undefined,
    );
  }
  /** Vrai si c'est le bouton du volume qu'on touche : il a ses gestes à lui. */
  const surLeVolume = (cible: EventTarget | null): boolean => cible instanceof HTMLElement && cible.closest('[data-volume]') !== null;
  const auToucher = (ev: PointerEvent): void => {
    if (!ev.isPrimary || ev.button !== 0 || surLeVolume(ev.target)) return;
    avaler = true;
    enAttente = undefined;
    const attendre = (agir: () => void): void => {
      enAttente = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, agir };
    };
    const coin = actionDuCoin(ev.target);
    if (coin !== undefined) return attendre(coin);
    const z = zoneDe(ev.target);
    if (z === undefined) return;
    // Elle s'enfonce tout de suite, et agit au doigt levé (elle vibre alors).
    if (z.toucher.genre === 'partagerLeLien' || o.defile?.() === true) {
      enfoncerLaTouche(z);
      return attendre(() => presser(z, true));
    }
    presser(z);
  };
  const auGlisser = (ev: PointerEvent): void => {
    if (enAttente !== undefined && ev.pointerId === enAttente.id && aGlisse(ev, enAttente)) enAttente = undefined;
  };
  const auLever = (ev: PointerEvent): void => {
    const attente = enAttente;
    if (attente === undefined || ev.pointerId !== attente.id) return;
    enAttente = undefined;
    if (ev.type === 'pointerup' && !aGlisse(ev, attente)) attente.agir();
  };
  const auClic = (ev: MouseEvent): void => {
    if (ev.detail !== 0 && avaler) {
      avaler = false;
      return;
    }
    if (surLeVolume(ev.target)) return;
    const coin = actionDuCoin(ev.target);
    if (coin !== undefined) return coin();
    const z = zoneDe(ev.target);
    if (z !== undefined) presser(z);
  };
  zones.addEventListener('pointerdown', auToucher);
  zones.addEventListener('pointermove', auGlisser);
  for (const fin of FINS_DU_DOIGT) zones.addEventListener(fin, auLever);
  zones.addEventListener('click', auClic);
  // Le navigateur ne laisse partir le son que dans un geste qui compte : un doigt qui se lève, un clic, une touche du clavier.
  // Le premier débloque le haut-parleur ; un son refusé attend le suivant. On les écoute sur toute la page, avant tout le reste.
  const GESTES = ['pointerup', 'touchend', 'click', 'keydown'] as const;
  const debloquer = (ev: Event): void => hautParleur.debloquer(ev.type);
  for (const geste of GESTES) window.addEventListener(geste, debloquer, true);
  // Un nouveau doigt : le geste d'avant est passé (le clic suit le doigt qui se lève), ses zones s'en vont.
  const poser = (): void => {
    doigtPose = true;
    for (const zone of retirees.splice(0)) zone.remove();
  };
  const lever = (): void => {
    doigtPose = false;
  };
  window.addEventListener('pointerdown', poser, true);
  for (const fin of FINS_DU_DOIGT) window.addEventListener(fin, lever, true);
  boucle.reveiller();

  return {
    signaler,
    fermer() {
      zones.removeEventListener('pointerdown', auToucher);
      zones.removeEventListener('pointermove', auGlisser);
      for (const fin of FINS_DU_DOIGT) zones.removeEventListener(fin, auLever);
      zones.removeEventListener('click', auClic);
      for (const geste of GESTES) window.removeEventListener(geste, debloquer, true);
      window.removeEventListener('pointerdown', poser, true);
      for (const fin of FINS_DU_DOIGT) window.removeEventListener(fin, lever, true);
      window.removeEventListener('scroll', quandLaPageDefile);
      window.removeEventListener('keydown', taperSansViser, true);
      document.removeEventListener('selectionchange', auBout);
      document.removeEventListener('visibilitychange', auPremierPlan);
      window.removeEventListener('resize', noterLaFenetre);
      vu?.removeEventListener('resize', suivreLeClavier);
      vu?.removeEventListener('scroll', suivreLeClavier);
      cadre.style.transform = '';
      boucle.arreter();
      connexion?.couper();
      connexion = undefined;
      hautParleur.fermer();
      fermerLaPiste();
      fermerLEcran();
      volumeMonte?.montage.demonter();
      vider(cadre);
    },
  };
}
