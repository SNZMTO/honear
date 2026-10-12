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
import type { Action, Brancher, Connexion } from '../../regles/messages';
import type { Reponse } from '../../regles/piste';
import { TELEPHONE } from '../../ressources/ecran';
import { TOUCHES } from '../../ressources/mouvement';
import type { Pochette } from '../../ressources/pochettes';
import { PARTIE } from '../../ressources/reglages';
import { NOM_AU_PLUS } from '../../regles/pochette';
import type { CleDeVibration } from '../../ressources/vibrations';
import { calque, soulever, type Calque } from '../../scene/calque';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import { opacite, regler, type Reglage } from '../../scene/reglage';
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
import { regardDeLaPiste } from '../../scene/piste/regard';
import { decorDeLaPiste } from '../../scene/telephone/meuble';
import { meubleAutour, regardDuGrandEcran } from '../../scene/telephone/grand';
import { DENSITE, SUR_LA_PLATINE, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import { autourDeLaPiste, pochetteSurLeVerso } from '../../scene/telephone/piste';
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
  clavierOuvert,
  horsLigne,
  MEMOIRE_VIDE,
  recevoir,
  revenir,
  SAISIE_AU_PLUS,
  saisir,
  toucher,
  valider,
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
  /** Vrai si le téléphone joue les extraits que le serveur lui donne (le jeu en ligne) ; sans cela, il reste muet. */
  readonly son?: boolean;
  /**
   * Sur un grand écran (un ordinateur), la largeur du regard, en px de la scène : il montre le meuble entier, et les écrans du
   * téléphone y gardent leur place. Lue à chaque image ; rien, c'est un téléphone.
   */
  readonly grandEcran?: () => number | undefined;
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
const SANS_SON: HautParleur = { debloquer: () => undefined, suivre: () => undefined, pret: () => true, bloque: false, fermer: () => undefined };

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
      return vueDeLaPochette(a, e.pochette, e.choisi, e.retouche);
    case 'bac':
      return vueDuBac(a, e.bac);
    case 'reglages':
      return vueDesReglages(a, e.mode, { pistes: e.pistes, extrait: e.extrait, son: e.son });
    case 'salon':
      return vueDuSalon(a, e.etat, e.code, e.qui, e.ampli, true);
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
type SorteDeChamp = 'reponse' | 'code' | 'recherche' | 'lien' | 'email' | 'nom';
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
  const autour = couche(cadre, 'autour');
  const couverture = couche(cadre, 'couverture');
  const zones = couche(cadre, 'zones');

  let memoire: Memoire = o.depart ?? MEMOIRE_VIDE;
  const horloge = heureDuServeur();
  /** L'heure du serveur, lue à l'horloge du téléphone. */
  const heure = (): number => o.horloge.maintenant() + horloge.ecart;
  /** Combien de questions il reste à poser d'affilée sur l'heure, et quand poser la prochaine, à l'horloge du téléphone. */
  let questions: number = TELEPHONE.horloge.auDebut;
  let prochaineQuestion = 0;

  let ecranMonte: Montee | undefined;
  let piste: { readonly lanceeA: number; readonly ecran: EcranDeLaPiste; readonly grand: number | undefined } | undefined;
  let posees: Montee | undefined;
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

  // Le haut-parleur : il joue l'extrait de la piste à l'heure du serveur, et dit quand il l'a chargé ; on le dit alors prêt.
  const hautParleur = o.son === true ? brancherLeHautParleur(cadre) : SANS_SON;
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
      if (!oui) return;
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
  const definition = (regard: Regard): number =>
    factureVoulue(o.options.allegements, cadre.clientWidth > 0 ? cadre.clientWidth / regard.largeur : 1, o.densiteDeLEcran()).definition;

  /** Le regard du grand écran, à cette image ; rien sur un téléphone. */
  const grand = (): Regard | undefined => {
    const l = o.grandEcran?.();
    return l !== undefined ? regardDuGrandEcran(l) : undefined;
  };
  /** Le regard où l'on monte la scène : celui du grand écran, s'il y en a un, ou celui de l'écran. */
  let regardMonte: Regard = SUR_LA_PLATINE;
  /** Des images placées dans un regard, replacées dans un autre. */
  const replacer = (images: readonly ImagePosee[], de: Regard, dans: Regard): ImagePosee[] =>
    images.map((i) => ({ ...i, centre: [i.centre[0] + de.origine[0] - dans.origine[0], i.centre[1] + de.origine[1] - dans.origine[1]] as const }));
  /** Ce qui fait un écran posé tel qu'il est : l'écran, la définition de ses toiles, et le regard du grand écran. */
  const cleDe = (e: EcranDuTelephone, g: Regard | undefined): string => {
    const r = g ?? SUR_LA_PLATINE;
    return JSON.stringify([e, definition(r), g?.largeur]);
  };

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
    const montage = monter(arbre, {
      etendue: regard,
      reglables: new Set(),
      remplacables: new Set(touches.keys()),
      definition: d,
      mesurer: a.encrier.largeur,
      tracerLeTexte: a.encrier.tracer,
    });
    plan.element.append(montage.element);
    montage.regarder(regard.origine);
    if (fondre && fondreSur(dans, plan.element, avant)) return { cle, plan, montage, touches };
    if (dans === scene) finirLeFondu();
    avant?.montage.demonter();
    vider(dans).append(plan.element);
    return { cle, plan, montage, touches };
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

  /** Les zones à toucher de ce qu'on a posé dans ce regard : une par calque qu'on peut toucher sur cet écran, assez grande pour un pouce. */
  function poserLesZones(objets: readonly Calque[], regard: Regard, e: EcranDuTelephone): void {
    for (const zone of Array.from(zones.querySelectorAll('[data-zone]'))) zone.remove();
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
    const echelle = cadre.clientWidth / regardMonte.largeur;
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
    if (champ.dataset['pour'] === 'reponse') changer(clavierOuvert(memoire, false));
    suivreLeClavier();
  });
  /** Ce qu'on a tapé part : la réponse, le code, la recherche, le lien. */
  const validerLeChamp = (): void => {
    const suite = valider(memoire, heure(), o.preparatifs);
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
    changer(saisir(memoire, champ.value));
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

  function fermerLaPiste(): void {
    poserLesImages([], SUR_LA_PLATINE);
    piste?.ecran.fermer();
    piste = undefined;
    posees?.montage.demonter();
    posees = undefined;
    vider(autour);
  }

  function montrerUnEcran(e: Exclude<EcranDuTelephone, { readonly genre: 'piste' }>): void {
    if (piste !== undefined) fermerLaPiste();
    const g = grand();
    const cle = cleDe(e, g);
    if (ecranMonte?.cle === cle) {
      ecranMonte.plan.suivreLeCadre();
      return;
    }
    const vue = vueDe(e, a);
    // Sur un grand écran, l'écran garde sa place sur le meuble, et le reste du meuble est là, au repos.
    const regard = g !== undefined ? regardDuGrandEcran(g.largeur, vue.regard) : vue.regard;
    const objets = g !== undefined ? [...meubleAutour(a, vue.objets), ...vue.objets] : vue.objets;
    regardMonte = regard;
    poserLesImages(replacer(e.genre === 'titres' ? imagesDesTitres(e.joues) : [], vue.regard, regard), regard);
    const touches = new Map(vue.objets.filter((objet) => objet.nom.startsWith('touche-')).map((objet) => [objet.nom, objet] as const));
    // Un autre écran se fond sur l'ancien ; le même, qui change (une lettre tapée, un cran tourné), se repose tel quel.
    const fondre = e.genre !== genre;
    ecranMonte = monterDans(scene, ecranMonte, cle, dessinerLeMeuble({ regard, densite: DENSITE, objets }), regard, definition(regard), touches, fondre);
    poserLesZones(vue.objets, regard, e);
  }

  function montrerLaPiste(e: Extract<EcranDuTelephone, { readonly genre: 'piste' }>, t: number): void {
    if (ecranMonte !== undefined) {
      finirLeFondu();
      ecranMonte.montage.demonter();
      ecranMonte = undefined;
    }
    const g = grand();
    // Une autre piste, ou un grand écran qui change de largeur : la scène se remonte.
    if (piste?.lanceeA !== e.lanceeA || piste.grand !== g?.largeur) {
      const nouvelle = piste?.lanceeA !== e.lanceeA;
      fermerLaPiste();
      const decor = decorDeLaPiste(a.textes, e.cran, e.numero);
      const ecran = ouvrirLEcranDeLaPiste(scene, {
        decor,
        textes: a.textes,
        encrier: a.encrier,
        horloge: o.horloge,
        densiteDeLEcran: o.densiteDeLEcran,
        options: o.options,
        ...(g !== undefined ? { grand: { regard: g, meuble: meubleAutour(a, [], { platine: false }) } } : {}),
      });
      // La piste commence : sa scène apparaît, fondue sur le noir ; d'une piste à la suivante aussi.
      if (nouvelle) for (const couche of [scene, autour]) apparaitre(couche);
      piste = { lanceeA: e.lanceeA, ecran, grand: g?.largeur };
    }
    piste.ecran.tenirLaFacture();
    const pose = piste.ecran.montrer(e.scene, t);
    const regard = g ?? SUR_LA_PLATINE;
    regardMonte = regard;
    poserLesImages(g !== undefined ? replacer(laVraiePochette(e.autour.revelee, pose), regardDeLaPiste(pose), g) : laVraiePochette(e.autour.revelee, pose), regard);
    // Ce qu'on pose autour reste à l'écran pendant que le regard suit la piste : il a sa couche, au-dessus d'elle. Sur un grand
    // écran, il garde sa place sur le meuble, devant la platine.
    const d = definition(regard);
    const cle = JSON.stringify([e.autour, e.pouce, d, g?.largeur]);
    if (posees?.cle === cle) {
      posees.plan.suivreLeCadre();
      return;
    }
    const objets = autourDeLaPiste(a, SUR_LA_PLATINE, e.autour);
    posees = monterDans(autour, posees, cle, calque('regard-autour', objets), regard, d, new Map());
    poserLesZones(objets, regard, e);
  }

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
    if (enfoncer(e.genre === 'piste' ? undefined : cleDe(e, grand()))) return true;
    if (e.genre === 'piste') montrerLaPiste(e, t);
    else montrerUnEcran(e);
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
    agir(z.toucher);
  };
  const auToucher = (ev: PointerEvent): void => {
    if (!ev.isPrimary || ev.button !== 0) return;
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
    const z = zoneDe(ev.target);
    if (z !== undefined) presser(z);
  };
  zones.addEventListener('pointerdown', auToucher);
  zones.addEventListener('click', auClic);
  // Le navigateur ne laisse partir le son que dans un geste qui compte : un doigt qui se lève, un clic, une touche du clavier.
  // Le premier débloque le haut-parleur ; un son refusé attend le suivant.
  const GESTES = ['pointerup', 'touchend', 'click', 'keydown'] as const;
  const debloquer = (): void => hautParleur.debloquer();
  for (const geste of GESTES) zones.addEventListener(geste, debloquer);
  boucle.reveiller();

  return {
    fermer() {
      zones.removeEventListener('pointerdown', auToucher);
      zones.removeEventListener('click', auClic);
      for (const geste of GESTES) zones.removeEventListener(geste, debloquer);
      vu?.removeEventListener('resize', suivreLeClavier);
      vu?.removeEventListener('scroll', suivreLeClavier);
      cadre.style.transform = '';
      boucle.arreter();
      connexion?.couper();
      connexion = undefined;
      hautParleur.fermer();
      fermerLaPiste();
      ecranMonte?.montage.demonter();
      vider(cadre);
    },
  };
}
