/**
 * Les poignées d'une scène montée : ce par quoi on règle un calque sans rien redessiner. Un calque monté en bloc se règle
 * par sa transformation CSS et son opacité ; un calque resté en SVG, par les attributs de ses groupes. On n'y écrit
 * que ce qui change : une pose déjà montrée ne coûte plus rien.
 */

import type { NomDeCalque } from '../../lexique';
import type { Calque, Transformation } from '../../scene/calque';
import type { Reglage } from '../../scene/reglage';
import { affineEnCss, enCss, enSvg, SANS_EFFET, type Affine } from '../../scene/rendu/transformation';
import { POSE } from './couche';
import type { Grille } from './grille';

/** Un calque monté en bloc : un élément de la page, qu'on déplace par sa transformation CSS. */
export interface Bloc {
  readonly genre: 'bloc';
  readonly element: HTMLElement;
  /** Ce que ses parents figés lui imposent, avant ses propres transformations. */
  readonly avant: string;
  /** Ses transformations, telles qu'elles sont écrites dans la page, de la plus en dehors à la plus en dedans. */
  readonly rangs: string[];
  opacite: number;
}

/** Un calque monté en SVG : un groupe par transformation, du plus en dehors au plus en dedans. */
export interface Groupe {
  readonly genre: 'groupe';
  readonly rangs: readonly Element[];
  readonly ecrits: string[];
  opacite: number;
}

export type Poignee = Bloc | Groupe;

/**
 * La transformation d'un bloc, telle qu'on l'écrit. Un bloc porte des toiles : s'il glisse, on le pose sur la grille des px
 * de l'appareil, pour qu'à l'arrêt elles restent nettes, et l'on écrit cette place sans l'arrondir : deux décimales la sortiraient
 * de la grille. Au montage comme à chaque réglage : la même écriture.
 */
const ecrireUnRang = (t: Transformation, grille: Grille): string =>
  t.genre === 'glisser' ? `translate(${grille.auPlusPres(t.de[0])}px,${grille.auPlusPres(t.de[1])}px)` : enCss(t);

const transformationDuBloc = (bloc: Bloc): string => `${bloc.avant}${bloc.rangs.join(' ')}` || 'none';

/** Le bloc d'un calque, prêt à être posé dans son conteneur : vide, à sa place, avec son opacité. */
export function creerUnBloc(calque: Calque, sous: Affine, grille: Grille): Bloc {
  const element = document.createElement('div');
  const bloc: Bloc = {
    genre: 'bloc',
    element,
    avant: sous === SANS_EFFET ? '' : `${affineEnCss(sous)} `,
    rangs: (calque.transformations ?? []).map((t) => ecrireUnRang(t, grille)),
    opacite: calque.opacite ?? 1,
  };
  element.style.cssText = `${POSE}transform:${transformationDuBloc(bloc)};opacity:${bloc.opacite};`;
  element.dataset['calque'] = calque.nom;
  return bloc;
}

/**
 * La poignée d'un calque écrit en SVG : son groupe, celui qui porte son nom, puis un groupe par transformation, emboîtés.
 * @throws si le SVG n'a pas un groupe par transformation du calque.
 */
export function poigneeDUnGroupe(calque: Calque, element: Element): Groupe {
  const transformations = calque.transformations ?? [];
  const rangs: Element[] = [element];
  for (let rang = 1; rang < transformations.length; rang++) {
    const dedans = rangs[rang - 1]?.firstElementChild;
    if (dedans === null || dedans === undefined)
      throw new Error(`Le calque « ${calque.nom} » n'a pas, dans son SVG, de groupe pour sa transformation de rang ${rang}.`);
    rangs.push(dedans);
  }
  return { genre: 'groupe', rangs, ecrits: transformations.map(enSvg), opacite: calque.opacite ?? 1 };
}

/** Règle l'opacité d'une poignée, si elle change. */
function reglerLOpacite(poignee: Poignee, opacite: number): void {
  if (poignee.opacite === opacite) return;
  poignee.opacite = opacite;
  if (poignee.genre === 'bloc') poignee.element.style.opacity = String(opacite);
  else poignee.rangs[0]?.setAttribute('opacity', String(opacite));
}

/**
 * Applique des réglages aux poignées d'une scène montée.
 * @throws si un réglage vise un calque qui n'a pas de poignée, ou une transformation qu'il n'a pas.
 */
export function reglerLesPoignees(poignees: ReadonlyMap<NomDeCalque, Poignee>, reglages: readonly Reglage[], grille: Grille): void {
  /** Les blocs dont un rang au moins a changé : chacun n'est récrit qu'une fois. */
  const aRecrire = new Set<Bloc>();
  for (const reglage of reglages) {
    const poignee = poignees.get(reglage.calque);
    if (poignee === undefined) throw new Error(`Le calque « ${reglage.calque} » n'a pas été monté pour être réglé.`);
    if ('opacite' in reglage) {
      reglerLOpacite(poignee, reglage.opacite);
      continue;
    }
    const { rang, transformation } = reglage;
    const sansCeRang = (): Error => new Error(`Le calque « ${reglage.calque} » n'a pas de transformation de rang ${rang}.`);
    if (poignee.genre === 'groupe') {
      const ecrit = enSvg(transformation);
      if (poignee.ecrits[rang] === ecrit) continue;
      const groupe = poignee.rangs[rang];
      if (groupe === undefined) throw sansCeRang();
      poignee.ecrits[rang] = ecrit;
      groupe.setAttribute('transform', ecrit);
      continue;
    }
    if (rang >= poignee.rangs.length) throw sansCeRang();
    const ecrit = ecrireUnRang(transformation, grille);
    if (poignee.rangs[rang] === ecrit) continue;
    poignee.rangs[rang] = ecrit;
    aRecrire.add(poignee);
  }
  for (const bloc of aRecrire) bloc.element.style.transform = transformationDuBloc(bloc);
}
