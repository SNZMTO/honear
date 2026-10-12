/**
 * L'inventaire d'une scène : ce que pèse chaque calque qui a un rôle, en polygones et en lettres.
 * C'est lui qu'on confronte aux budgets (décor, calques mobiles), et que la planche de rendu affiche.
 */

import type { Calque, Dessin, RoleDeCalque } from '../calque';

/** Ce que pèse un calque : ses polygones, et les lettres de ses textes, tracées elles aussi en contours. */
export interface Poids {
  readonly polygones: number;
  readonly lettres: number;
}

export interface Inventaire extends Poids {
  readonly nom: string;
  /** `null` : des dessins qui ne sont dans aucun calque à rôle. Une scène finie n'en a pas. */
  readonly role: RoleDeCalque | null;
}

/** Le nombre de lettres d'un texte : tous ses signes, sauf les espaces. */
const lettresDe = (contenu: string): number => [...contenu].filter((signe) => signe.trim() !== '').length;

/**
 * Pèse chaque calque qui a un rôle, sans ce que pèsent les calques à rôle qu'il contient.
 * Ce qui n'est sous aucun rôle est compté à part, sous le nom de la racine.
 */
export function inventaire(racine: Calque): Inventaire[] {
  const lignes: Inventaire[] = [];
  const peser = (dessin: Dessin, courant: { polygones: number; lettres: number }): void => {
    switch (dessin.genre) {
      case 'peinture':
        courant.polygones += dessin.facettes.length;
        break;
      case 'aplat':
        courant.polygones += dessin.contours.length;
        break;
      case 'texte':
        courant.lettres += lettresDe(dessin.contenu);
        break;
      case 'calque': {
        if (dessin.role === undefined) {
          for (const d of dessin.contenu) peser(d, courant);
          break;
        }
        const propre = { polygones: 0, lettres: 0 };
        const rang = lignes.push({ nom: dessin.nom, role: dessin.role, ...propre }) - 1;
        for (const d of dessin.contenu) peser(d, propre);
        lignes[rang] = { nom: dessin.nom, role: dessin.role, ...propre };
        break;
      }
    }
  };
  const sansRole = { polygones: 0, lettres: 0 };
  peser(racine, sansRole);
  if (sansRole.polygones + sansRole.lettres > 0) lignes.push({ nom: racine.nom, role: null, ...sansRole });
  return lignes;
}

/** Tous les polygones de plusieurs calques, et toutes leurs lettres. */
export const poidsTotal = (lignes: readonly Poids[]): Poids => ({
  polygones: lignes.reduce((somme, ligne) => somme + ligne.polygones, 0),
  lettres: lignes.reduce((somme, ligne) => somme + ligne.lettres, 0),
});
