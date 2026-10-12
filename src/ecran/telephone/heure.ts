/**
 * L'heure du serveur, vue d'un téléphone. À chaque question (« quelle heure ? »), le serveur répond l'heure qu'il est chez lui ; le
 * téléphone en déduit l'écart entre son horloge et celle du serveur, en comptant que l'aller dure autant que le retour. Parmi les
 * derniers échantillons, il garde celui dont l'aller-retour a été le plus court : celui que le réseau a le moins retardé. C'est sur
 * cette heure que le décompte, l'extrait et la révélation se jouent, à la même seconde sur tous les téléphones.
 */

import { TELEPHONE } from '../../ressources/ecran';

/** Une question et sa réponse : quand elle est partie et revenue, à l'horloge du téléphone, et l'heure que le serveur a donnée. */
export interface Echantillon {
  readonly depart: number;
  readonly retour: number;
  readonly serveur: number;
}

export interface HeureDuServeur {
  noter(echantillon: Echantillon): void;
  /** Ce qu'il faut ajouter à l'horloge du téléphone pour lire celle du serveur ; zéro tant qu'on ne sait rien. */
  readonly ecart: number;
  /** L'aller-retour de l'échantillon gardé, en secondes : ce que vaut l'écart, à sa moitié près. */
  readonly aPres: number;
}

export function heureDuServeur(): HeureDuServeur {
  const derniers: Echantillon[] = [];
  let garde: Echantillon | undefined;
  return {
    noter(echantillon) {
      // Une réponse qui revient avant d'être partie ne vient pas de cette horloge : on l'oublie.
      if (echantillon.retour < echantillon.depart) return;
      derniers.push(echantillon);
      if (derniers.length > TELEPHONE.horloge.echantillons) derniers.shift();
      garde = derniers.reduce((meilleur, e) => (e.retour - e.depart < meilleur.retour - meilleur.depart ? e : meilleur));
    },
    get ecart() {
      return garde === undefined ? 0 : garde.serveur - (garde.depart + garde.retour) / 2;
    },
    get aPres() {
      return garde === undefined ? Infinity : garde.retour - garde.depart;
    },
  };
}
