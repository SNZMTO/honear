/**
 * Les touches de la façade : retrouvées dans la page, puis branchées sur l'atelier. Ce module tient ce qu'elles ont choisi
 * (un cran de vitesse, un cran de verso, deux poussoirs) et si l'extrait joue : c'est lui qui le sait, et la page ne fait que le montrer.
 */

import { brancherUnCran, brancherUneTouche, montrerLesTouchesEnfoncees, type DepartDeTouche } from '../../../ecran/touche';
import { GENRES_DE_VERSO, type GenreDeVerso } from '../../../scene/disque/verso';
import { ANCRES, POUSSOIRS, type Poussoir } from '../ancres';
import type { Atelier } from '../atelier';
import { optionsDe, VITESSES, type ChoixDAtelier, type Vitesse } from '../options';
import { MOMENTS, type Moment } from '../seance';
import { cransDuGroupe, element, touchesQuiPortent, type Cran, type ToucheDeValeur } from './dom';

/** La page de l'atelier défile : une touche y agit dès que la souris se pose, et quand le doigt se relève. */
const DEPART: DepartDeTouche = 'toucherALaSouris';

/** La façade telle que le gabarit l'a écrite : chacune des touches que l'atelier sait brancher, et l'avis de la version sobre. */
export interface TouchesDeFacade {
  readonly moments: readonly ToucheDeValeur<Moment>[];
  /** Ce qui n'arrive qu'en plein extrait : une mauvaise réponse, la révélation avant l'heure. */
  readonly rayer: HTMLElement;
  readonly reveler: HTMLElement;
  readonly vitesses: readonly Cran<Vitesse>[];
  readonly versos: readonly Cran<GenreDeVerso>[];
  readonly poussoirs: readonly ToucheDeValeur<Poussoir>[];
  readonly avis: HTMLElement;
  readonly toutAnimer: HTMLElement;
}

/**
 * Retrouve dans la page toutes les touches de la façade. À faire avant d'ouvrir l'atelier : une page où il en manque une
 * n'aura pas de scène non plus.
 * @throws si une touche manque, est en double, ou porte une valeur qu'on ne sait pas brancher.
 */
export function trouverLaFacade(): TouchesDeFacade {
  return {
    moments: touchesQuiPortent(ANCRES.moment, MOMENTS),
    rayer: element(ANCRES.rayer),
    reveler: element(ANCRES.reveler),
    vitesses: cransDuGroupe(ANCRES.ralenti, VITESSES),
    versos: cransDuGroupe(ANCRES.verso, GENRES_DE_VERSO),
    poussoirs: touchesQuiPortent(ANCRES.poussoir, POUSSOIRS),
    avis: element(ANCRES.avis),
    toutAnimer: element(ANCRES.toutAnimer),
  };
}

/** Montre un poussoir enfoncé ou relâché : son attribut le dit à l'œil comme à l'oreille. */
const montrerEnfonce = (touche: HTMLElement, enfonce: boolean): void => touche.setAttribute('aria-pressed', String(enfonce));
/** Montre une touche allumée ou éteinte, sans lui retirer le clavier : éteinte, elle garde sa place dans la page, et ne fait rien. */
const montrerAllumee = (touche: HTMLElement, allumee: boolean): void => touche.setAttribute('aria-disabled', String(!allumee));

/**
 * Branche les crans d'un groupe : celui qu'on choisit s'enfonce, les autres remontent.
 * @param choisi la valeur du cran enfoncé à l'ouverture. Un navigateur qui recharge la page peut lui en rendre un autre :
 * c'est l'atelier qui dit lequel est choisi, et la page le montre.
 * @param auChoix ce que fait le choix d'un cran, par sa valeur.
 */
function brancherDesCrans<V>(crans: readonly Cran<V>[], choisi: V, auChoix: (valeur: V) => void): void {
  let enfonce: V = choisi;
  const montrer = (): void => {
    for (const { bouton, touche, valeur } of crans) {
      bouton.checked = valeur === enfonce;
      touche.classList.toggle(ANCRES.choisi, bouton.checked);
    }
  };
  for (const { bouton, touche, valeur } of crans) {
    const choisir = (): void => {
      // Un même geste peut choisir deux fois le même cran : la souris qui se pose, puis le clic qui la suit.
      if (valeur === enfonce) return;
      enfonce = valeur;
      montrer();
      auChoix(valeur);
    };
    brancherUnCran(touche, bouton, choisir, DEPART);
  }
  montrer();
}

export interface Facade {
  /** À chaque image : dit à la façade si l'extrait joue. Hors de lui, « Rayer » et « Révéler » sont éteintes. */
  suivre(enExtrait: boolean): void;
  /**
   * L'appareil vient de demander moins d'animations, ou d'y renoncer : la version sobre le suit, et l'avis avec elle,
   * quoi qu'on ait pressé avant.
   */
  suivreLAppareil(animationsReduites: boolean): void;
}

/** @param choix ce que les touches tiennent à l'ouverture : l'atelier a été ouvert avec. */
export function brancherLaFacade(touches: TouchesDeFacade, atelier: Atelier, choix: ChoixDAtelier): Facade {
  let tenu = choix;
  const changer = (nouveau: Partial<ChoixDAtelier>): void => {
    tenu = { ...tenu, ...nouveau };
    atelier.changer(optionsDe(tenu));
  };

  for (const { touche, valeur } of touches.moments) brancherUneTouche(touche, () => atelier.rejouer(valeur), DEPART);

  // Une mauvaise réponse et une révélation avant l'heure n'ont de sens que pendant l'extrait.
  let enExtrait = false;
  const pendantLExtrait: readonly (readonly [HTMLElement, () => void])[] = [
    [touches.rayer, () => atelier.rayer()],
    [touches.reveler, () => atelier.reveler()],
  ];
  for (const [touche, agir] of pendantLExtrait) {
    montrerAllumee(touche, enExtrait);
    brancherUneTouche(
      touche,
      () => {
        if (enExtrait) agir();
      },
      DEPART,
    );
  }

  brancherDesCrans(touches.vitesses, tenu.vitesse, (vitesse) => changer({ vitesse }));
  brancherDesCrans(touches.versos, tenu.verso, (verso) => changer({ verso }));

  /** Passe le clavier à la touche qui tient la version sobre, sans que la page défile pour la montrer. */
  const donnerLeClavierAuPoussoirSobre = (): void =>
    touches.poussoirs.find(({ valeur }) => valeur === 'sobre')?.touche.focus({ preventScroll: true });
  /**
   * Retire l'avis. Si le clavier était sur sa touche, il passe d'abord à celle qui tient désormais la version sobre :
   * une touche qui disparaît sous lui le rendrait à la page.
   */
  const retirerLAvis = (): void => {
    if (touches.avis.contains(document.activeElement)) donnerLeClavierAuPoussoirSobre();
    touches.avis.hidden = true;
  };
  const enclencher = (nom: Poussoir, enclenche: boolean): void => {
    // L'avis ne vaut que tant que la version sobre est celle que l'appareil a demandée.
    if (nom === 'sobre' && !enclenche) retirerLAvis();
    if (tenu[nom] === enclenche) return;
    for (const { touche, valeur } of touches.poussoirs) if (valeur === nom) montrerEnfonce(touche, enclenche);
    changer(nom === 'sobre' ? { sobre: enclenche } : { leger: enclenche });
  };
  for (const { touche, valeur } of touches.poussoirs) {
    montrerEnfonce(touche, tenu[valeur]);
    brancherUneTouche(touche, () => enclencher(valeur, !tenu[valeur]), DEPART);
  }
  brancherUneTouche(
    touches.toutAnimer,
    () => {
      // La touche s'en va avec son avis : qu'on l'ait pressée du doigt, de la souris ou du clavier, celui-ci passe à la touche
      // qui tient désormais la version sobre.
      donnerLeClavierAuPoussoirSobre();
      enclencher('sobre', false);
    },
    DEPART,
  );
  // À la souris, l'action est déjà partie quand le navigateur veut donner le clavier à la touche pressée : elle vient de disparaître,
  // et il le perdrait. On l'en retient : le clavier reste où on vient de le mettre.
  touches.toutAnimer.addEventListener('mousedown', (appui) => appui.preventDefault());

  montrerLesTouchesEnfoncees();
  return {
    suivre(joue) {
      if (joue === enExtrait) return;
      enExtrait = joue;
      for (const [touche] of pendantLExtrait) montrerAllumee(touche, joue);
    },
    suivreLAppareil(animationsReduites) {
      enclencher('sobre', animationsReduites);
      if (animationsReduites) touches.avis.hidden = false;
    },
  };
}
