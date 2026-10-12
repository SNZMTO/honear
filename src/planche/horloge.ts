/**
 * L'horloge d'une planche : une horloge qu'on remet à l'heure et qu'on ralentit, pour rejouer une animation à volonté.
 * Elle tient la place de l'horloge du serveur : ce qui la lit ne voit pas la différence.
 */

import type { Horloge } from '../ecran/horloge';

export interface HorlogeDePlanche extends Horloge {
  /** Remet l'horloge à un instant donné, et la fait repartir si elle attendait : c'est ainsi qu'on rejoue. */
  mettreA(instant: number): void;
  /** Change la vitesse à laquelle le temps passe : 1, ou moins pour un ralenti. L'instant présent ne bouge pas. */
  ralentir(vitesse: number): void;
  readonly vitesse: number;
}

/**
 * Une horloge arrêtée à zéro : elle attend qu'on la mette à l'heure pour partir.
 * @param source l'horloge qui bat vraiment : celle du navigateur.
 */
export function horlogeDePlanche(source: Horloge): HorlogeDePlanche {
  let [depuis, instant, vitesse, attend] = [source.maintenant(), 0, 1, true];
  const maintenant = (): number => (attend ? instant : instant + (source.maintenant() - depuis) * vitesse);
  const repartirDe = (nouvelInstant: number): void => {
    instant = nouvelInstant;
    depuis = source.maintenant();
  };
  return {
    maintenant,
    mettreA(nouvelInstant) {
      repartirDe(nouvelInstant);
      attend = false;
    },
    ralentir(nouvelle) {
      repartirDe(maintenant());
      vitesse = nouvelle;
    },
    get vitesse() {
      return vitesse;
    },
  };
}
