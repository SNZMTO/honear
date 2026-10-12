/**
 * Les réglages : ce que le mouvement change à une scène déjà dessinée. Une transformation d'un calque, par son rang,
 * ou son opacité ; jamais un polygone. Régler une scène ou la redessiner dans le même état donnent le même arbre.
 */

import type { NomDeCalque } from '../lexique';
import type { Matrice } from '../lowpoly/projection';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { Calque, Dessin, Transformation } from './calque';

/** Régler une transformation d'un calque : celle de ce rang, dans la liste des siennes. */
export interface ReglageDeTransformation {
  readonly calque: NomDeCalque;
  readonly rang: number;
  readonly transformation: Transformation;
  /**
   * Vrai pour ce qui écarte les paliers d'une ombre les uns des autres : le retrait de chacun, et sa pente sous une pièce penchée.
   * C'est ce dont un appareil qui peine se passe : l'ombre suit encore sa pièce, s'en éloigne quand elle monte, tourne et se déforme
   * avec elle, mais d'un seul bloc ; ses paliers gardent entre eux l'écart qu'on leur a dessiné.
   */
  readonly ecarteLesPaliers?: true;
}

/** Régler l'opacité d'un calque : c'est ainsi qu'on bascule d'un dessin à un autre déjà fait. */
export interface ReglageDOpacite {
  readonly calque: NomDeCalque;
  readonly opacite: number;
}

export type Reglage = ReglageDeTransformation | ReglageDOpacite;

/** Les réglages qu'on écrit le plus : le glissement d'un calque, sa rotation, sa déformation, et s'il se voit. */
export const glissement = (calque: NomDeCalque, rang: number, de: Vec2): Reglage => ({ calque, rang, transformation: { genre: 'glisser', de } });
export const rotation = (calque: NomDeCalque, rang: number, de: number): Reglage => ({ calque, rang, transformation: { genre: 'tourner', de } });
export const deformation = (calque: NomDeCalque, rang: number, par: Matrice): Reglage => ({
  calque,
  rang,
  transformation: { genre: 'deformer', par },
});
export const visibilite = (calque: NomDeCalque, visible: boolean): Reglage => ({ calque, opacite: visible ? 1 : 0 });
/** Une opacité entre les deux : seul le fondu de l'étiquette, entre son texte et ses arcs, en demande. */
export const opacite = (calque: NomDeCalque, part: number): Reglage => ({ calque, opacite: part });

/** Tous les calques d'un arbre, lui compris, par leur nom. */
export function calquesParNom(arbre: Calque): Map<NomDeCalque, Calque> {
  const trouves = new Map<NomDeCalque, Calque>();
  const visiter = (dessin: Dessin): void => {
    if (dessin.genre !== 'calque') return;
    trouves.set(dessin.nom, dessin);
    dessin.contenu.forEach(visiter);
  };
  visiter(arbre);
  return trouves;
}

/** Le même arbre, une fois réglé. Un réglage qui vise un calque ou un rang qui n'existe pas est une erreur : on ne crée rien en route. */
export function regler(arbre: Calque, reglages: readonly Reglage[]): Calque {
  const parCalque = new Map<NomDeCalque, Reglage[]>();
  for (const reglage of reglages) parCalque.set(reglage.calque, [...(parCalque.get(reglage.calque) ?? []), reglage]);
  const restants = new Set(parCalque.keys());

  const reglerUnCalque = (vise: Calque): Calque => {
    let regle: Calque = { ...vise, contenu: vise.contenu.map((dessin) => (dessin.genre === 'calque' ? reglerUnCalque(dessin) : dessin)) };
    for (const reglage of parCalque.get(vise.nom) ?? []) {
      if ('opacite' in reglage) {
        regle = { ...regle, opacite: reglage.opacite };
      } else {
        const transformations = [...(regle.transformations ?? [])];
        const avant = transformations[reglage.rang];
        if (avant === undefined || avant.genre !== reglage.transformation.genre)
          throw new Error(`Le calque « ${vise.nom} » n'a pas, au rang ${reglage.rang}, de quoi « ${reglage.transformation.genre} ».`);
        transformations[reglage.rang] = reglage.transformation;
        regle = { ...regle, transformations };
      }
    }
    restants.delete(vise.nom);
    return regle;
  };
  const regle = reglerUnCalque(arbre);
  if (restants.size > 0) throw new Error(`Réglage d'un calque qui n'est pas dans la scène : ${[...restants].join(', ')}.`);
  return regle;
}
