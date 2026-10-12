/**
 * La playlist touchée dans le bac, aux « Prêtes à jouer » : sa pochette, à la couleur de son thème, posée sur le bois devant le bac,
 * et son disque qui en sort un peu, vers la droite. On voit d'un coup d'œil ce qu'on a choisi, sans rien chercher dans le bac.
 */

import { cercle } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { disque } from '../../lowpoly/formes/disque';
import { COULEURS_DES_THEMES, type CleDeTheme } from '../../ressources/bac';
import { MOTIFS_DE_POCHETTE } from '../../ressources/pochettes';
import { RECOMPENSES } from '../../ressources/recompenses';
import { TABLEE } from '../../ressources/tablee';
import { calque, peinture, type Calque } from '../calque';
import { surLeBois, type Regard } from '../meuble';
import { ombreAuPied } from '../ombre';
import { dessinerLaVraiePochette } from '../pochette/dos';

const C = TABLEE.telephone.bac.pochetteChoisie;

/** Vrai si cette clé est celle d'un thème du bac. */
export const estUnTheme = (cle: string): cle is CleDeTheme => cle in COULEURS_DES_THEMES;

/**
 * La pochette du thème touché et son disque, sorti d'une part de son côté : le disque d'abord, sous la pochette, avec son ombre.
 * Son étiquette est de la couleur du thème.
 */
export function pochetteChoisie(regard: Regard, theme: CleDeTheme): Calque[] {
  const teinte = COULEURS_DES_THEMES[theme];
  const rang = Object.keys(COULEURS_DES_THEMES).indexOf(theme);
  const motif = MOTIFS_DE_POCHETTE[rang % MOTIFS_DE_POCHETTE.length] ?? 'rayons';
  const centre = surLeBois(regard, C.en[0], C.en[1]);
  const rayon = C.taille * C.disque.rayon;
  const auDisque = surLeBois(regard, C.en[0] + C.taille * C.disque.sortie, C.en[1]);
  const maille = disque({
    centre: auDisque,
    hauteur: RECOMPENSES.epaisseur,
    pans: RECOMPENSES.pans,
    anneaux: [
      { de: rayon, a: rayon * RECOMPENSES.etiquette, teinte: 'vinyle', fini: 'sillons' },
      { de: rayon * RECOMPENSES.etiquette, a: 0, teinte },
    ],
  });
  const pochette = dessinerLaVraiePochette({ fond: teinte, motif }, { nom: 'pochette-choisie', centre, angle: C.angle, taille: C.taille }, 'choisie');
  return [
    ombreAuPied('disque-choisi/ombre', {
      silhouettes: [cercle(auDisque, rayon, RECOMPENSES.pans)],
      hauteur: RECOMPENSES.epaisseur,
      support: 0,
      paliers: 2,
    }),
    calque('disque-choisi', [peinture(peindre(maille))], { role: 'image' }),
    pochette.ombre,
    pochette.pochette,
  ];
}
