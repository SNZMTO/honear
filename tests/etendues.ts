/** Ce que les pièces et les textes d'une scène occupent à l'écran : de quoi vérifier un cadrage sans rien dessiner. */

import type { Calque, Dessin } from '../src/scene/calque';
import { empriseDe, type Emprise } from '../src/scene/rendu/emprise';
import { affineDeToutes, appliquer, composer, SANS_EFFET, type Affine } from '../src/scene/rendu/transformation';
import { ENCRIER } from './planche';

/** Le rectangle qui contient tous les points d'un tracé de texte, points de contrôle compris, sous une transformation. */
export function etendueDUnTrace(trace: string, sous: Affine = SANS_EFFET): Emprise | undefined {
  const n = [...trace.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  if (n.length === 0) return undefined;
  const points = Array.from({ length: n.length / 2 }, (_, i) => appliquer(sous, [n[2 * i] ?? NaN, n[2 * i + 1] ?? NaN]));
  const [xs, ys] = [points.map((p) => p[0]), points.map((p) => p[1])];
  const [x, y] = [Math.min(...xs), Math.min(...ys)];
  return { x, y, largeur: Math.max(...xs) - x, hauteur: Math.max(...ys) - y };
}

export interface TexteALEcran {
  readonly contenu: string;
  /** Le calque qui le porte. */
  readonly calque: string;
  /** Ce que ses lettres occupent, en px de la scène. */
  readonly lettres: Emprise;
}

/** Les textes qu'on voit dans une scène, là où leurs lettres tombent à l'écran. Ceux d'un calque caché n'y sont pas. */
export function textesALEcran(scene: Calque): TexteALEcran[] {
  const trouves: TexteALEcran[] = [];
  const visiter = (dessin: Dessin, sous: Affine, calque: string): void => {
    if (dessin.genre === 'calque') {
      if ((dessin.opacite ?? 1) <= 0) return;
      const dessous = composer(sous, affineDeToutes(dessin.transformations ?? []));
      for (const d of dessin.contenu) visiter(d, dessous, dessin.nom);
    } else if (dessin.genre === 'texte') {
      const lettres = etendueDUnTrace(ENCRIER.tracer(dessin), sous);
      if (lettres !== undefined) trouves.push({ contenu: dessin.contenu, calque, lettres });
    }
  };
  visiter(scene, SANS_EFFET, scene.nom);
  return trouves;
}

/** Ce que chaque calque visible d'une scène occupe à l'écran, par son nom, en px de la scène. */
export function calquesALEcran(scene: Calque): Map<string, Emprise> {
  const trouves = new Map<string, Emprise>();
  const visiter = (calque: Calque, sous: Affine): void => {
    if ((calque.opacite ?? 1) <= 0) return;
    const emprise = empriseDe([calque], ENCRIER.largeur, sous);
    if (emprise !== undefined) trouves.set(calque.nom, emprise);
    const dessous = composer(sous, affineDeToutes(calque.transformations ?? []));
    for (const d of calque.contenu) if (d.genre === 'calque') visiter(d, dessous);
  };
  visiter(scene, SANS_EFFET);
  return trouves;
}
