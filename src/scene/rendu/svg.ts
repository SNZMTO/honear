/**
 * Écrit un arbre de calques en SVG : rien que des polygones à plat, regroupés par ton.
 * Aucun dégradé, aucun flou, aucun filtre.
 */

import type { FacettePeinte } from '../../lowpoly/facette';
import type { Polygone } from '../../lowpoly/polygones';
import { couleur } from '../../lowpoly/tons';
import type { Aplat, Calque, Dessin, Texte } from '../calque';
import { enXml } from './balisage';
import { nombre } from './nombre';
import { LISERE, parCouleur } from './peinture';
import { enSvg as transformationEnSvg } from './transformation';

/** Ce qu'il faut pour écrire des dessins en SVG, où qu'on les pose ensuite. */
export interface OptionsDeFragment {
  /** Préfixe des identifiants, pour poser plusieurs SVG dans une même page. */
  readonly prefixe?: string;
  /** Tracé d'un texte, dans le repère de son calque. Voir rendu/texte.ts. */
  readonly tracerLeTexte: (texte: Texte) => string;
}

export interface OptionsDeSvg extends OptionsDeFragment {
  readonly largeur: number;
  readonly hauteur: number;
  /** Coin haut-gauche de la vue, en px écran de la scène. */
  readonly origine?: readonly [number, number];
  /** Grossissement de la vue : 1 par défaut. À 3, un détail de 130 px de côté s'affiche sur 390 px. */
  readonly echelle?: number;
  /** Description lue par les lecteurs d'écran. */
  readonly titre: string;
}

function traceDePolygone(contour: Polygone): string {
  let trace = '';
  contour.forEach((p, i) => {
    trace += `${i === 0 ? 'M' : i === 1 ? 'L' : ' '}${nombre(p[0])} ${nombre(p[1])}`;
  });
  return `${trace}Z`;
}

/** Les facettes d'une peinture ne se recouvrent pas : une trace par teinte et par ton suffit. */
function peintureEnSvg(facettes: readonly FacettePeinte[]): string {
  let svg = '';
  for (const [c, groupe] of parCouleur(facettes))
    svg += `<path fill="${c}" stroke="${c}" d="${groupe.map((f) => traceDePolygone(f.contour)).join('')}"/>`;
  return `<g stroke-width="${LISERE}" stroke-linejoin="round">${svg}</g>`;
}

function aplatEnSvg(aplat: Aplat): string {
  const opacite = aplat.opacite !== undefined && aplat.opacite < 1 ? ` fill-opacity="${nombre(aplat.opacite)}"` : '';
  return `<path fill="${couleur(aplat.teinte, aplat.ton)}"${opacite} d="${aplat.contours.map(traceDePolygone).join('')}"/>`;
}

const identifiant = (prefixe: string, nom: string): string => `${prefixe}${nom.replace(/[^a-zA-Z0-9]+/g, '-')}`;

/**
 * Un dessin écrit en SVG, sans la balise qui l'entoure : un calque devient un groupe, à poser dans un SVG qu'on a déjà.
 * C'est ainsi qu'un écran pose les calques qui bougent, puis règle les transformations de leurs groupes.
 */
export function dessinEnSvg(dessin: Dessin, o: OptionsDeFragment): string {
  switch (dessin.genre) {
    case 'peinture':
      return peintureEnSvg(dessin.facettes);
    case 'aplat':
      return aplatEnSvg(dessin);
    case 'texte':
      return `<path fill="${couleur(dessin.teinte, dessin.ton)}" d="${o.tracerLeTexte(dessin)}"/>`;
    case 'calque': {
      const transformations = dessin.transformations ?? [];
      // Une transformation par groupe : le mouvement saura laquelle régler sans toucher aux autres.
      const [premiere, ...suite] = transformations;
      let contenu = dessin.contenu.map((d) => dessinEnSvg(d, o)).join('');
      for (const t of [...suite].reverse()) contenu = `<g transform="${transformationEnSvg(t)}">${contenu}</g>`;
      const role = dessin.role !== undefined ? ` data-role="${dessin.role}"` : '';
      const transform = premiere !== undefined ? ` transform="${transformationEnSvg(premiere)}"` : '';
      const opacite = dessin.opacite !== undefined && dessin.opacite < 1 ? ` opacity="${nombre(dessin.opacite)}"` : '';
      const id = identifiant(o.prefixe ?? '', dessin.nom);
      const groupe = `<g id="${id}" data-calque="${enXml(dessin.nom)}"${role}${transform}${opacite}>${contenu}</g>`;
      if (dessin.decoupe === undefined) return groupe;
      // La découpe reste où elle est : c'est un groupe autour du calque qui la porte, hors de ses transformations.
      const decoupe = `${id}-decoupe`;
      return `<clipPath id="${decoupe}"><path d="${dessin.decoupe.map(traceDePolygone).join('')}"/></clipPath><g clip-path="url(#${decoupe})">${groupe}</g>`;
    }
  }
}

export function enSvg(racine: Calque, o: OptionsDeSvg): string {
  const [x, y] = o.origine ?? [0, 0];
  const echelle = o.echelle ?? 1;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${nombre(x)} ${nombre(y)} ${nombre(o.largeur)} ${nombre(o.hauteur)}" ` +
    `width="${nombre(o.largeur * echelle)}" height="${nombre(o.hauteur * echelle)}" role="img">` +
    `<title>${enXml(o.titre)}</title>${dessinEnSvg(racine, o)}</svg>`
  );
}
