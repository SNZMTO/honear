/**
 * Ce que l'atelier dit de la séance, à côté de la scène : où en est la piste, et le temps écoulé de l'extrait s'il joue.
 * Il le lit dans l'état de la piste et dans la pose du disque : il ne décide rien.
 */

import { avancementDeLExtrait, chiffreDuDecompte, phaseDeLaPiste, rayeLeDisque } from '../../../regles/piste';
import { TEXTES } from '../../../ressources/textes.fr';
import { montreSonVerso } from '../../../scene/disque';
import { ecrire, ecrireFixe } from '../../nombres.fr';
import type { Lecture } from '../atelier';
import { LEGENDES } from '../legendes.fr';
import { MINUTAGE } from '../minutage';
import { dire } from './dom';

export interface DitDeLaSeance {
  readonly etat: string;
  /** Le temps écoulé de l'extrait ; rien hors de lui. */
  readonly chrono: string;
  /** Vrai pendant l'extrait : c'est alors seulement qu'on peut rayer le disque, ou révéler avant l'heure. */
  readonly enExtrait: boolean;
}

const HORS_DE_L_EXTRAIT = { chrono: '', enExtrait: false } as const;

export function direLaSeance({ scene, instant: t, pose }: Pick<Lecture, 'scene' | 'instant' | 'pose'>): DitDeLaSeance {
  const E = LEGENDES.etats;
  const { piste, rayuresA } = scene;
  if (piste === undefined) return { etat: E.avant, ...HORS_DE_L_EXTRAIT };
  switch (phaseDeLaPiste(piste, t)) {
    case 'decompte': {
      // Le décompte fini, si l'extrait n'est pas parti, c'est qu'il charge encore.
      const chiffre = chiffreDuDecompte(piste, t);
      return { etat: chiffre !== undefined ? dire(E.decompte, { chiffre }) : dire(E.attente), ...HORS_DE_L_EXTRAIT };
    }
    case 'extrait': {
      const raye = rayuresA.some((a) => rayeLeDisque(piste, a) && t >= a && t - a < MINUTAGE.raye);
      // Le compteur ne s'arrondit pas vers le haut : il ne dit jamais que l'extrait est fini avant qu'il le soit.
      const ecoule = Math.floor(avancementDeLExtrait(piste, t) * piste.duree * 10) / 10;
      const chrono = dire(E.chrono, { ecoule: ecrireFixe(ecoule, 1), duree: ecrire(piste.duree) });
      return { etat: raye ? TEXTES.piste.raye : E.extrait, chrono, enExtrait: true };
    }
    case 'revelation': {
      const reponse = piste.revelation?.reponse;
      // La réponse ne s'écrit ici que lorsque le disque la montre : dès qu'on voit son verso.
      return reponse !== undefined && montreSonVerso(pose.disque.retourne)
        ? { etat: dire(E.reponse, { titre: reponse.titre, artiste: reponse.artiste }), ...HORS_DE_L_EXTRAIT }
        : { etat: dire(E.revelation), ...HORS_DE_L_EXTRAIT };
    }
  }
}
