/**
 * Le balisage : un texte libre (un titre, un nom qui porte celui d'un joueur) rendu inoffensif dans du XML ou du HTML,
 * attributs compris. Tout ce qui s'écrit dans un SVG ou dans une page passe par ici.
 */

export const enXml = (texte: string): string => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
