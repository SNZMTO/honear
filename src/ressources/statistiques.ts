/**
 * La page des statistiques : le nom sous lequel le navigateur de l'éditeur garde sa clé, le temps entre deux relectures (en
 * secondes), les périodes qu'on y choisit (en jours ; zéro : depuis le début), combien de jours ses courbes montrent au moins, et
 * combien de lignes ses listes montrent.
 */

/** Les adresses de la page des statistiques, et de ce qu'elle montre (en JSON, à qui donne la clé). */
export const ADRESSES_DES_STATISTIQUES = { page: '/statistiques', donnees: '/statistiques.json' } as const;

export const PAGE_DES_STATISTIQUES = {
  cle: 'honear.statistiques',
  rafraichir: 30,
  periodes: { jour: 1, semaine: 7, mois: 30, trimestre: 90, tout: 0 },
  courbes: 30,
  lignes: 12,
} as const;
