/**
 * Ce qui bouge en restant en polygones (une étiquette, le bras, une ombre), écrit dans un SVG : des calques dont on réglera
 * les groupes, sans jamais redessiner un polygone.
 */

import type { NomDeCalque } from '../../lexique';
import { calquesParNom } from '../../scene/reglage';
import { agrandir, empriseDe, reunir, type Emprise } from '../../scene/rendu/emprise';
import { dessinEnSvg } from '../../scene/rendu/svg';
import { SANS_EFFET } from '../../scene/rendu/transformation';
import { POSE, type APoser, type Lettrage } from './couche';
import { aLUnite } from './grille';
import { poigneeDUnGroupe, type Groupe } from './poignees';

/** Part de sa taille qu'on ajoute autour d'un SVG posé dans un bloc : ce qu'il contient y tourne et s'y penche sans en sortir. */
const AISANCE = 0.25;

/** La boîte d'un SVG taillé sur ce qu'il contient, cachés compris, avec de l'aisance autour. Rien s'il ne contient rien. */
function boiteAuPlusJuste(vivants: readonly APoser[], lettrage: Lettrage): Emprise | undefined {
  const contenu = vivants.reduce(
    (cumul: Emprise | undefined, { dessin, sous }) => reunir(cumul, empriseDe([dessin], lettrage.mesurer, sous, true)),
    undefined,
  );
  return contenu === undefined ? undefined : aLUnite(agrandir(contenu, AISANCE * Math.max(contenu.largeur, contenu.hauteur)));
}

/**
 * Écrit des dessins dans un SVG, posé à la fin du conteneur.
 * @param o.etendue la boîte du SVG : donnée, il la couvre ; sinon il est taillé sur ce qu'il contient.
 * @param o.reglables les calques qu'on réglera : chacun de ceux qui sont écrits ici reçoit sa poignée.
 * @param o.marque ce qui distingue les identifiants de cette scène de ceux d'une autre, montée dans la même page.
 * @returns les poignées des calques réglables écrits dans ce SVG, par leur nom.
 */
export function ecrireEnSvg(
  conteneur: HTMLElement,
  vivants: readonly APoser[],
  o: { readonly etendue?: Emprise; readonly reglables: ReadonlySet<NomDeCalque>; readonly marque: string; readonly lettrage: Lettrage },
): Map<NomDeCalque, Groupe> {
  const poignees = new Map<NomDeCalque, Groupe>();
  const boite = o.etendue !== undefined ? aLUnite(o.etendue) : boiteAuPlusJuste(vivants, o.lettrage);
  if (vivants.length === 0 || boite === undefined) return poignees;
  const groupes = vivants
    .map(({ dessin, sous }) => {
      const ecrit = dessinEnSvg(dessin, { tracerLeTexte: o.lettrage.tracerLeTexte, prefixe: o.marque });
      return sous === SANS_EFFET ? ecrit : `<g transform="matrix(${sous.join(' ')})">${ecrit}</g>`;
    })
    .join('');
  conteneur.insertAdjacentHTML(
    'beforeend',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${boite.x} ${boite.y} ${boite.largeur} ${boite.hauteur}" ` +
      `width="${boite.largeur}" height="${boite.hauteur}" aria-hidden="true" ` +
      `style="${POSE}transform:translate(${boite.x}px,${boite.y}px);overflow:visible;pointer-events:none">${groupes}</svg>`,
  );
  const pose = conteneur.lastElementChild;
  if (pose === null) return poignees;
  // Dans le SVG, chaque calque se retrouve par l'attribut qui le nomme : ceux qu'on réglera reçoivent leur poignée.
  const parNom = new Map(Array.from(pose.querySelectorAll('[data-calque]'), (groupe) => [groupe.getAttribute('data-calque'), groupe]));
  for (const { dessin } of vivants) {
    if (dessin.genre !== 'calque') continue;
    for (const [nom, calque] of calquesParNom(dessin)) {
      const groupe = parNom.get(nom);
      if (groupe !== undefined && o.reglables.has(nom)) poignees.set(nom, poigneeDUnGroupe(calque, groupe));
    }
  }
  return poignees;
}
