/**
 * Les densités de facettes : la même scène, dessinée plus ou moins fin.
 * La fine est celle du site. La sobre est celle du mode léger, pour un appareil qui peine :
 * elle tient encore les minimums du rendu (un disque de 48 pans, un bouton de 16).
 */

export interface Densite {
  readonly cle: 'fine' | 'sobre';
  /** Pans d'un grand rond (disque, plateau) : au moins 48. */
  readonly pansDeDisque: number;
  /** Nombre de plages gravées sur le disque (5 au plus), et de passages de sillons serrés dans chacune. */
  readonly plages: number;
  readonly passagesSerres: number;
  /** Repères stroboscopiques sur la jante du plateau. */
  readonly reperes: number;
  /** Pans d'un bouton : au moins 16, toujours pair. */
  readonly pansDeBouton: number;
  /** Pans d'un petit rond (vis, axe, pivot). */
  readonly pansDePetitRond: number;
  /** Pans d'un coin arrondi. */
  readonly pansDeCoin: number;
  /**
   * Écart moyen entre deux rangées de veines du noyer, en px. Les rangées partent d'une grille fixe du meuble :
   * le pas est choisi pour qu'aucune ne longe l'arête arrière du socle de la platine (un test le vérifie).
   */
  readonly pasDesVeines: number;
  /** Bandes en travers d'un cylindre couché (tube du bras, contrepoids). */
  readonly bandesDeCylindre: number;
}

export const DENSITES = {
  fine: {
    cle: 'fine',
    pansDeDisque: 96,
    plages: 5,
    passagesSerres: 2,
    reperes: 120,
    pansDeBouton: 32,
    pansDePetitRond: 16,
    pansDeCoin: 8,
    pasDesVeines: 16,
    bandesDeCylindre: 9,
  },
  sobre: {
    cle: 'sobre',
    pansDeDisque: 48,
    plages: 3,
    passagesSerres: 0,
    reperes: 60,
    pansDeBouton: 16,
    pansDePetitRond: 10,
    pansDeCoin: 4,
    pasDesVeines: 30,
    bandesDeCylindre: 5,
  },
} as const satisfies Record<string, Densite>;
