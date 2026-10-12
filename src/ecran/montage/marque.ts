/**
 * La marque d'une scène montée : ce qui distingue les identifiants de ses SVG de ceux d'une autre scène de la même page.
 * Une page peut en porter plusieurs (deux cadres, ou une scène qu'on monte pendant que l'ancienne se montre encore) ;
 * chacune reçoit la sienne, et c'est la page entière qui les compte : ce module en est le seul registre.
 */

let montees = 0;

/** Une marque que n'a aucune autre scène montée dans cette page. */
export const marqueSuivante = (): string => `m${++montees}-`;
