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
import { couleur } from '../../lowpoly/tons';
import type { Action, Brancher, Connexion, PlaylistTrouvee } from '../../regles/messages';
import { partieA } from '../../regles/partie';
import { avancementDeLExtrait, type Reponse } from '../../regles/piste';
import { TELEPHONE } from '../../ressources/ecran';
import { AMPLEURS, TOUCHES } from '../../ressources/mouvement';
import type { Pochette } from '../../ressources/pochettes';
import { PARTIE } from '../../ressources/reglages';
import { NOM_AU_PLUS } from '../../regles/pochette';
import type { CleDeVibration } from '../../ressources/vibrations';
import { calque, soulever, type Calque } from '../../scene/calque';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import { opacite, regler, rotation, type Reglage } from '../../scene/reglage';
import { empriseDe } from '../../scene/rendu/emprise';
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
  glissementSousLeDisque,
  glisserSousLeDisque,
  meubleAutour,
  rangerSousLeDisque,
  regardPourLaFenetre,
} from '../../scene/telephone/grand';
import { echellesDeLAmpli } from '../../scene/telephone/meuble';
import { decorDeLaSaison, DECOR_QUI_BOUGE, reglerLeDecorDeLaSaison } from '../../scene/saison';
import { kraftAuRepos } from '../../scene/telephone/kraft';
import { toucheDeLHote, toucheQuitter } from '../../scene/telephone/quitter';
import { angleDuVolume, boutonDuVolume, cranDuVolume, INDEX_DU_VOLUME, type PlaceDuVolume } from '../../scene/telephone/volume';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import { lignesDeLaPiste, pochetteSurLeVerso, pouceAuPlusGrand, pouceDeLaPiste, tableeDeLaPiste } from '../../scene/telephone/piste';
import { vueDeLaPochette } from '../../scene/telephone/pochette';
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
  MEMOIRE_VIDE,
  recevoir,
  revenir,
  SAISIE_AU_PLUS,
  saisir,
  toucher,
  valider,
  type ChampDeSaisie,
  type Memoire,
  type Preparatifs,
  type Toucher,
} from './memoire';
import { ecranDuTelephone, type EcranDuTelephone } from './route';
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
   * continue sous la barre, et les petites touches du coin descendent sous l'encoche. Sans eux, aucun bord n'est caché.
   */
  readonly bords?: () => { readonly sur: number; readonly sous: number };
  /**
   * Vrai quand la page a demandé le diagnostic (« ?diagnostic ») : ce que font le son, la fenêtre et le champ où l'on tape part au
   * serveur, qui l'écrit dans son journal. De quoi comprendre un navigateur qu'on n'a pas sous la main.
   */
  readonly diagnostic?: boolean;
}

/**
 * Une image posée par-dessus la scène : son adresse, son centre et son côté en px dans le regard, ses coins, son angle, son écrasement ;
 * et le trou de l'axe, en part de son côté, si elle est posée sur un disque.
 */
interface ImagePosee {
  readonly adresse: string;
  readonly centre: readonly [number, number];
  readonly cote: number;
  readonly coin?: number;
  readonly angle?: number;
  readonly ecrasement: number;
  readonly trou?: number;
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
      return vueDuSalon(a, e.etat, e.code, e.qui, true);
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
};

/** Le clavier qu'un champ demande au téléphone : sa touche de validation, ses capitales, sa sorte. */
const CLAVIERS: Readonly<Record<SorteDeChamp, { readonly touche: string; readonly majuscules: string; readonly sorteDeClavier: string }>> = {
  reponse: { touche: 'send', majuscules: 'none', sorteDeClavier: 'text' },
  code: { touche: 'go', majuscules: 'characters', sorteDeClavier: 'text' },
  recherche: { touche: 'search', majuscules: 'none', sorteDeClavier: 'search' },
  lien: { touche: 'go', majuscules: 'none', sorteDeClavier: 'url' },
  email: { touche: 'send', majuscules: 'none', sorteDeClavier: 'email' },
  nom: { touche: 'done', majuscules: 'words', sorteDeClavier: 'text' },
};

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

/** Les calques d'un arbre qu'on peut toucher sur cet écran, où qu'ils soient : une touche posée sur le bois, un bouton de la platine. */
function calquesATouche(
  objets: readonly Calque[],
  e: EcranDuTelephone,
  a: Ecritoire,
): { readonly calque: Calque; readonly chose: NonNullable<ReturnType<typeof choseATouche>> }[] {
  const trouves: { readonly calque: Calque; readonly chose: NonNullable<ReturnType<typeof choseATouche>> }[] = [];
  const parcourir = (c: Calque): void => {
    const chose = choseATouche(c.nom, e, a.textes);
    if (chose !== undefined) {
      trouves.push({ calque: c, chose });
      return;
    }
    for (const d of c.contenu) if (d.genre === 'calque') parcourir(d);
  };
  for (const objet of objets) parcourir(objet);
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

  let ecranMonte: Montee | undefined;
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

  // Les vraies pochettes : l'image que la source donne d'un titre, posée sur ce qu'on a dessiné à sa place (sa vignette, en attendant),
  // de travers et écrasée comme lui ; à la révélation, et sur le dos des titres joués. Chacune ne se montre qu'une fois chargée ; si
  // elle ne vient pas, la vignette reste.
  couverture.style.pointerEvents = 'none';
  const images: HTMLImageElement[] = [];
  /** Une image de plus, cachée tant qu'elle n'a pas chargé celle qu'on lui demande. */
  function nouvelleImage(): HTMLImageElement {
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.hidden = true;
    image.addEventListener('load', () => {
      image.hidden = image.getAttribute('src') !== image.dataset['pour'];
    });
    image.addEventListener('error', () => {
      image.hidden = true;
    });
    couverture.append(image);
    images.push(image);
    return image;
  }

  /** Pose ces images dans ce regard, à la place des précédentes ; celles qui étaient déjà là ne se rechargent pas. */
  function poserLesImages(posees: readonly ImagePosee[], r: Regard): void {
    const voulues = posees.filter((p) => p.adresse.startsWith('https://'));
    for (const [rang, p] of voulues.entries()) {
      const image = images[rang] ?? nouvelleImage();
      const { centre, cote, coin = 0, angle = 0, ecrasement, trou } = p;
      // Le trou de l'axe : l'axe de la platine passe au travers de l'image, comme au travers du papier.
      const plein = couleur('vinyle');
      const masque = trou !== undefined ? `radial-gradient(circle closest-side,transparent ${trou * 200}%,${plein} ${trou * 200}%)` : undefined;
      const style =
        `position:absolute;left:${part(centre[0] - cote / 2, r.largeur)};top:${part(centre[1] - cote / 2, r.hauteur)};` +
        `width:${part(cote, r.largeur)};height:${part(cote, r.hauteur)};border-radius:${part(coin, cote)};object-fit:cover;` +
        `transform:scaleY(${ecrasement}) rotate(${angle}deg);transform-origin:50% 50%;` +
        (masque !== undefined ? `-webkit-mask-image:${masque};mask-image:${masque};` : '');
      if (image.dataset['pour'] === p.adresse && image.dataset['place'] === style) continue;
      image.dataset['place'] = style;
      image.style.cssText = style;
      if (image.dataset['pour'] === p.adresse) continue;
      image.hidden = true;
      image.dataset['pour'] = p.adresse;
      image.src = p.adresse;
    }
    for (const image of images.slice(voulues.length)) {
      image.hidden = true;
      image.removeAttribute('src');
      delete image.dataset['pour'];
      delete image.dataset['place'];
    }
  }

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
  const aEnvoyer: string[] = [];
  let enLigne = false;
  let paquetPrevu = false;
  const depuisLOuverture = o.horloge.maintenant();
  function envoyerLeDiagnostic(): void {
    paquetPrevu = false;
    if (!enLigne) return;
    while (aEnvoyer.length > 0) {
      let texte = '';
      while (aEnvoyer.length > 0 && texte.length + (aEnvoyer[0]?.length ?? 0) < TELEPHONE.diagnostic.paquet) texte += `${aEnvoyer.shift() ?? ''}\n`;
      if (texte === '') texte = (aEnvoyer.shift() ?? '').slice(0, TELEPHONE.diagnostic.paquet);
      connexion?.envoyer({ genre: 'diagnostic', texte });
    }
  }
  const noter =
    o.diagnostic === true
      ? (texte: string): void => {
          aEnvoyer.push(`${(o.horloge.maintenant() - depuisLOuverture).toFixed(2)} ${texte}`);
          if (aEnvoyer.length > TELEPHONE.diagnostic.enAttente) aEnvoyer.shift();
          if (paquetPrevu) return;
          paquetPrevu = true;
          window.setTimeout(envoyerLeDiagnostic, TELEPHONE.diagnostic.envoi * MS_PAR_SECONDE);
        }
      : undefined;
  noter?.(`page : ${navigator.userAgent} ; fenêtre ${window.innerWidth}×${window.innerHeight}, écran ${window.screen.width}×${window.screen.height}`);

  // Le haut-parleur : il joue l'extrait de la piste à l'heure du serveur, et dit quand il l'a chargé ; on le dit alors prêt.
  // Le volume de ce téléphone : à 30 % en arrivant, pour ne pas agresser les oreilles ; le bouton de l'ampli le règle.
  let volume: number = TELEPHONE.volume.depart;
  const hautParleur = o.son === true ? brancherLeHautParleur(cadre, () => volume, noter) : SANS_SON;
  /** La piste (par son lancer) pour laquelle on s'est dit prêt, l'extrait chargé. */
  let pretPour: number | undefined;

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
    const suite = toucher(memoire, t, heure(), o.preparatifs);
    changer(suite.memoire);
    envoyer(suite.actions);
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
      envoyerLeDiagnostic();
      // La ligne revient : on redemande l'heure, d'affilée ; on rentre dans son compte, et l'on redonne son jeton.
      questions = TELEPHONE.horloge.auDebut;
      prochaineQuestion = 0;
      if (memoire.session !== undefined) envoyer([{ genre: 'reprendreLeCompte', session: memoire.session }]);
      const retour = revenir(memoire);
      if (retour !== undefined) envoyer([retour]);
    },
  );

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
  const largeurDuCadre = (): number => cadre.getBoundingClientRect().width;
  const definition = (regard: Regard): number =>
    factureVoulue(o.options.allegements, largeurDuCadre() > 0 ? largeurDuCadre() / regard.largeur : 1, o.densiteDeLEcran()).definition;

  /** La proportion de la fenêtre, à cette image ; rien : le cadre a celle du téléphone. */
  const proportion = (): number | undefined => o.fenetre?.();
  /** Le regard qui remplit la fenêtre, posé sur ce regard du téléphone. */
  const bords = (): { readonly sur: number; readonly sous: number } => o.bords?.() ?? { sur: 0, sous: 0 };
  /** Le regard qui remplit la fenêtre : celui de la zone où l'on touche, prolongé sous elle jusqu'au bas de l'écran. */
  const dansLaFenetre = (r: Regard, p: number | undefined): Regard => {
    if (p === undefined) return r;
    const regard = regardPourLaFenetre(p, r);
    const sous = bords().sous * regard.largeur;
    return sous > 0 ? { ...regard, hauteur: regard.hauteur + sous } : regard;
  };
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
    if (fondre && fondreSur(dans, plan.element, avant)) return { cle, plan, montage, touches, curseurs, babioles };
    if (dans === scene) finirLeFondu();
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
   * Les touches du coin, telles qu'elles se posent dans ce regard quand on est dans une room (« Quitter », et celle de l'hôte), sous
   * l'encoche s'il y en a une : le décor de saison ne va pas dessous.
   */
  function touchesDuCoin(r: Regard): Calque[] {
    const room = memoire.room;
    if (room === undefined) return [];
    const sur = bords().sur * r.largeur;
    const hote = partieA(room.journal, Infinity).hote === room.toi;
    return [toucheQuitter(a, r, sur), ...(hote ? [toucheDeLHote(a, r, memoire.preparation.ecran === 'bac', sur)] : [])];
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

  /** Le fondu d'un écran à l'autre en cours, et ce qui reste à faire quand il finit : un autre écran qui arrive le termine net. */
  let fondu: { readonly animation: Animation; readonly fin: () => void } | undefined;
  function finirLeFondu(): void {
    const f = fondu;
    fondu = undefined;
    if (f === undefined) return;
    f.animation.cancel();
    f.fin();
  }
  /**
   * D'un écran à l'autre, le nouveau se pose par-dessus l'ancien et s'y fond : le meuble qui ne change pas reste où il est, seul ce qui
   * change apparaît. Rien quand on a demandé moins d'animations, ni dans un navigateur qui ne sait pas animer.
   * @returns faux si l'on n'a pas fondu : c'est alors à l'appelant de poser le nouvel écran.
   */
  function fondreSur(dans: HTMLElement, nouveau: HTMLElement, avant: Montee | undefined): boolean {
    finirLeFondu();
    if (o.options.sobre || typeof nouveau.animate !== 'function') return false;
    for (const enfant of Array.from(dans.children)) if (enfant !== avant?.plan.element) enfant.remove();
    dans.append(nouveau);
    const animation = nouveau.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TELEPHONE.fondu * MS_PAR_SECONDE, easing: 'ease-out' });
    const fin = (): void => {
      avant?.montage.demonter();
      avant?.plan.element.remove();
    };
    fondu = { animation, fin };
    animation.onfinish = () => {
      if (fondu?.animation === animation) finirLeFondu();
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
    for (const { calque: c, chose } of calquesATouche(objets, e, a)) {
      const emprise = empriseDe([c], a.encrier.largeur);
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

  /** Pose le champ du clavier sur une étiquette, avec ce qu'on y a déjà tapé, sans toucher à ce qu'on est en train d'y taper. */
  function poserLeChamp(sorte: SorteDeChamp, cle: string, place: string, libelle: string): void {
    if (champ.dataset['cle'] !== cle) {
      const prep = memoire.preparation;
      champ.dataset['cle'] = cle;
      champ.dataset['pour'] = sorte;
      champ.value =
        sorte === 'code'
          ? prep.ecran === 'saisie'
            ? prep.tape
            : ''
          : sorte === 'reponse'
            ? memoire.pouce.tape
            : sorte === 'email'
              ? prep.ecran === 'compte'
                ? prep.email
                : ''
              : sorte === 'nom'
                ? prep.ecran === 'pochette'
                  ? prep.pochette.artiste
                  : ''
                : prep.ecran === 'bac'
                  ? sorte === 'lien'
                    ? prep.bac.lien
                    : prep.bac.recherche
                  : '';
      champ.maxLength =
        sorte === 'code' ? PARTIE.code.longueur : sorte === 'email' ? ADRESSE_AU_PLUS : sorte === 'nom' ? NOM_AU_PLUS : SAISIE_AU_PLUS;
      // Une adresse e-mail, le téléphone sait la proposer ; le reste, il ne doit rien deviner.
      champ.setAttribute('autocomplete', sorte === 'email' ? 'email' : 'off');
      const { touche, majuscules, sorteDeClavier } = CLAVIERS[sorte];
      champ.setAttribute('enterkeyhint', touche);
      champ.setAttribute('autocapitalize', majuscules);
      champ.setAttribute('inputmode', sorteDeClavier);
    }
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
    const tape = document.activeElement === champ && champ.dataset['pour'] === 'reponse';
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
    if (champ.dataset['pour'] === 'reponse' && vu === null) changer(clavierOuvert(memoire, true));
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
  window.addEventListener('scroll', remettreEnPlace);
  const noterLaFenetre = (): void =>
    noter?.(
      `fenêtre ${window.innerWidth}×${window.innerHeight}, cadre ${cadre.clientWidth}×${cadre.clientHeight}, ` +
        `vue ${Math.round(vu?.width ?? 0)}×${Math.round(vu?.height ?? 0)} +${Math.round(vu?.offsetTop ?? 0)}, défilement ${window.scrollY}, ` +
        `bords ${Math.round(bords().sur * cadre.clientWidth)} en haut, ${Math.round(bords().sous * cadre.clientWidth)} en bas, ` +
        `seul sur l'écran ${String(window.matchMedia('(display-mode: standalone)').matches)}`,
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
    const suite = valider(memoire, heure(), o.preparatifs, champPose());
    changer(suite.memoire);
    envoyer(suite.actions);
    // La réponse est partie ; ce qu'on tape ensuite la remplace : on garde le clavier ouvert, prêt pour un autre essai.
    if (champ.dataset['pour'] === 'reponse') champ.select();
    // Le nom est écrit : le clavier se ferme, la pochette se voit en entier.
    if (champ.dataset['pour'] === 'nom') champ.blur();
  };
  /** Un lien collé part tout seul : on n'a pas à chercher la touche « OK » d'un clavier. */
  let colle = false;
  champ.addEventListener('paste', () => {
    colle = champ.dataset['pour'] === 'lien';
  });
  champ.addEventListener('input', () => {
    changer(saisir(memoire, champ.value, champPose()));
    // Le code s'écrit en capitales, sans les lettres qu'on confond ; un nom, sans ce que les polices n'ont pas : le champ montre ce
    // que la mémoire a gardé.
    if (champ.dataset['pour'] === 'code' && memoire.preparation.ecran === 'saisie') champ.value = memoire.preparation.tape;
    if (champ.dataset['pour'] === 'nom' && memoire.preparation.ecran === 'pochette' && champ.value !== memoire.preparation.pochette.artiste)
      champ.value = memoire.preparation.pochette.artiste;
    if (colle) {
      colle = false;
      validerLeChamp();
    }
  });
  champ.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter') return;
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

  function montrerUnEcran(e: Exclude<EcranDuTelephone, { readonly genre: 'piste' }>): void {
    if (piste !== undefined) fermerLaPiste();
    const p = proportion();
    const cle = cleDe(e, p);
    if (ecranMonte?.cle === cle) {
      ecranMonte.plan.suivreLeCadre();
      return;
    }
    const vue = vueDe(e, a);
    // Dans la fenêtre, l'écran garde sa place sur le meuble ; le reste du meuble, au repos, s'y voit ; sur un grand écran, ce qu'on
    // touche se range sous le vinyle.
    const regard = dansLaFenetre(vue.regard, p);
    const rangees = p !== undefined ? rangerSousLeDisque(vue.objets, vue.regard, p, a.encrier.largeur) : vue.objets;
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
    // Le décor de saison, s'il y en a un : sous ce que l'écran montre, ou par-dessus, là où rien ne se tient (ni les touches du coin).
    const saison = decorDeLaSaison(regard, [...objets, ...touchesDuCoin(regard)], a.encrier.largeur);
    ecranMonte = monterDans(
      scene,
      ecranMonte,
      cle,
      dessinerLeMeuble({ regard, densite: DENSITE, objets: [...saison.dessous, ...objets, ...saison.dessus] }),
      regard,
      definition(regard),
      touches,
      fondre,
    );
    poserLesZones(rangees, regard, e);
  }

  function montrerLaPiste(e: Extract<EcranDuTelephone, { readonly genre: 'piste' }>, t: number): void {
    if (ecranMonte !== undefined) {
      finirLeFondu();
      ecranMonte.montage.demonter();
      ecranMonte = undefined;
    }
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
      const saison = decorDeLaSaison(regard, [...eviter, ...touchesDuCoin(regard)], a.encrier.largeur, false);
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
  // La touche pour quitter la partie : avec le volume, dans le coin d'en face, sur tous les écrans d'une room.
  const zoneQuitter = document.createElement('button');
  zoneQuitter.type = 'button';
  zoneQuitter.className = 'zone';
  zoneQuitter.dataset['volume'] = '';
  zoneQuitter.setAttribute('aria-label', a.textes.partie.quitter);
  zoneQuitter.hidden = true;
  zones.append(zoneQuitter);
  zoneQuitter.addEventListener('click', () => {
    hautParleur.cliquer('touche');
    if (o.confirmer?.(a.textes.partie.quitterVraiment) === false) return;
    agir({ genre: 'quitter' });
  });
  // Celle de l'hôte, à côté : « Autre playlist », qui ouvre le bac ; dans le bac, « Retour ».
  const zoneDeLHote = document.createElement('button');
  zoneDeLHote.type = 'button';
  zoneDeLHote.className = 'zone';
  zoneDeLHote.dataset['volume'] = '';
  zoneDeLHote.hidden = true;
  zones.append(zoneDeLHote);
  zoneDeLHote.addEventListener('click', () => {
    hautParleur.cliquer('touche');
    agir({ genre: memoire.preparation.ecran === 'bac' ? 'fermerLeBac' : 'autrePlaylist' });
  });
  /** Pose la zone d'une touche du coin sur ce qu'on en a dessiné, assez haute pour un pouce ; la cache s'il n'y a rien. */
  function poserLaZoneDuCoin(zone: HTMLElement, touche: Calque | undefined, r: Regard): void {
    const e = touche !== undefined ? empriseDe([touche], a.encrier.largeur) : undefined;
    zone.hidden = e === undefined;
    if (e === undefined) return;
    const h = Math.max(TELEPHONE.zoneAuMoins, e.hauteur);
    const y = e.y + e.hauteur / 2 - h / 2 - r.origine[1];
    zone.style.cssText = `position:absolute;left:${part(e.x - r.origine[0], r.largeur)};top:${part(y, r.hauteur)};width:${part(e.largeur, r.largeur)};height:${part(h, r.hauteur)};`;
  }
  function poserLeVolume(): void {
    const r = regardMonte;
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
    const d = definition(r);
    const enRoom = memoire.room !== undefined;
    const hote = memoire.room !== undefined && partieA(memoire.room.journal, Infinity).hote === memoire.room.toi;
    const bacOuvert = memoire.preparation.ecran === 'bac';
    // Sous l'encoche, rien ne se touche : les petites touches du coin descendent d'autant.
    const sur = bords().sur * r.largeur;
    const cle = JSON.stringify([ou, r, d, enRoom, hote, bacOuvert, sur]);
    zoneDuVolume.setAttribute('aria-valuenow', String(Math.round(volume * POUR_CENT)));
    if (volumeMonte?.cle === cle) {
      volumeMonte.plan.suivreLeCadre();
      tournerLeVolume(volumeMonte.montage);
      return;
    }
    const quitter = enRoom ? toucheQuitter(a, r, sur) : undefined;
    const deLHote = enRoom && hote ? toucheDeLHote(a, r, bacOuvert, sur) : undefined;
    // Là où la page ne règle pas le volume (l'iPhone), pas de bouton : ce sont ceux du téléphone.
    const reglable = hautParleur.volumeReglable;
    zoneDuVolume.hidden = !reglable;
    const objets = [...(reglable ? boutonDuVolume(a, r, volume, ou, sur) : []), ...[quitter, deLHote].filter((c) => c !== undefined)];
    volumeMonte = monterDans(coucheDuVolume, volumeMonte, cle, calque('regard-volume', objets), r, d, new Map());
    tournerLeVolume(volumeMonte.montage);
    poserLaZoneDuCoin(zoneQuitter, quitter, r);
    poserLaZoneDuCoin(zoneDeLHote, deLHote, r);
    zoneDeLHote.setAttribute('aria-label', bacOuvert ? a.textes.partie.retour : a.textes.partie.autrePlaylist);
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
    if (voulu === undefined || voulu.depuis !== undefined || pretPour === voulu.lanceeA || !hautParleur.pret(voulu.adresse)) return;
    pretPour = voulu.lanceeA;
    envoyer([{ genre: 'pret' }]);
  }

  const boucle = lancerLaBoucle(() => {
    demanderLHeure();
    const t = heure();
    const suite = avancer(memoire, t);
    if (suite.memoire !== memoire) changer(suite.memoire);
    envoyer(suite.actions);
    ecouter(t);
    if (document.activeElement === champ || glisse !== 0) suivreLeClavier();
    const e = ecranDuTelephone(memoire, t, o.preparatifs, a.textes);
    if (enfoncer(e.genre === 'piste' ? undefined : cleDe(e, proportion()))) return true;
    if (e.genre === 'piste') montrerLaPiste(e, t);
    else montrerUnEcran(e);
    poserLeVolume();
    tournerLesBoutons();
    clignoter();
    animerLeDecor();
    if (e.genre !== genre) {
      genre = e.genre;
      o.enChangeant?.(genre);
    }
    // L'heure fait tout changer : le décompte, l'extrait, la révélation, le clavier qui tape. Le téléphone ne s'endort pas.
    return true;
  });

  // L'action part dès que le doigt se pose ; le clic qui suit, lui, tomberait sur l'écran d'après : on l'avale.
  let avaler = false;
  const zoneDe = (cible: EventTarget | null): { readonly toucher: Toucher; readonly nom: NomDeCalque } | undefined => {
    const zone = cible instanceof HTMLElement ? cible.closest<HTMLElement>('[data-zone]') : null;
    return zone !== null ? choses[Number(zone.dataset['zone'])] : undefined;
  };
  const presser = (z: { readonly toucher: Toucher; readonly nom: NomDeCalque }): void => {
    if (z.nom.startsWith('touche-')) {
      enfoncee = { nom: z.nom, depuis: o.horloge.maintenant(), montree: 0 };
      o.vibrer?.('touche');
    }
    hautParleur.cliquer(z.nom.startsWith('bouton-') ? 'cran' : 'touche');
    agir(z.toucher);
  };
  /** Vrai si c'est le bouton du volume qu'on touche : il a ses gestes à lui. */
  const surLeVolume = (cible: EventTarget | null): boolean => cible instanceof HTMLElement && cible.closest('[data-volume]') !== null;
  const auToucher = (ev: PointerEvent): void => {
    if (!ev.isPrimary || ev.button !== 0 || surLeVolume(ev.target)) return;
    const z = zoneDe(ev.target);
    avaler = z !== undefined;
    if (z !== undefined) presser(z);
  };
  const auClic = (ev: MouseEvent): void => {
    // Le clavier et les aides à la lecture valident sans pointeur : ce clic-là agit toujours.
    if (ev.detail !== 0 && avaler) {
      avaler = false;
      return;
    }
    if (surLeVolume(ev.target)) return;
    const z = zoneDe(ev.target);
    if (z !== undefined) presser(z);
  };
  zones.addEventListener('pointerdown', auToucher);
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
    fermer() {
      zones.removeEventListener('pointerdown', auToucher);
      zones.removeEventListener('click', auClic);
      for (const geste of GESTES) window.removeEventListener(geste, debloquer, true);
      window.removeEventListener('pointerdown', poser, true);
      for (const fin of FINS_DU_DOIGT) window.removeEventListener(fin, lever, true);
      window.removeEventListener('scroll', remettreEnPlace);
      window.removeEventListener('keydown', taperSansViser, true);
      document.removeEventListener('selectionchange', auBout);
      window.removeEventListener('resize', noterLaFenetre);
      vu?.removeEventListener('resize', suivreLeClavier);
      vu?.removeEventListener('scroll', suivreLeClavier);
      cadre.style.transform = '';
      boucle.arreter();
      connexion?.couper();
      connexion = undefined;
      hautParleur.fermer();
      fermerLaPiste();
      ecranMonte?.montage.demonter();
      volumeMonte?.montage.demonter();
      vider(cadre);
    },
  };
}
