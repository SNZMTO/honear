/**
 * Le minutage de l'atelier : les temps de ce document de travail, en secondes. Le déroulé de sa séance d'exemple,
 * les instants où ses images sont prises, ce que sa page laisse lire, et ce qu'il rejoue pour mesurer un départ.
 * Ce ne sont pas des réglages du jeu : ceux du mouvement sont dans ressources/mouvement.ts, ceux d'une partie
 * dans ressources/reglages.ts. Ce que le banc d'essai tient pour une image en retard est avec ses relevés, dans banc.ts.
 */

export const MINUTAGE = {
  /** Le déroulé de la séance : en jeu, c'est le serveur qui donne ces instants. */
  seance: {
    /**
     * Ce qu'on laisse voir de la platine au repos avant le « 3 », quand on la rejoue en route : le temps de la voir remise en place.
     * Si elle était déjà au repos, il ne reste qu'un souffle : la touche répond tout de suite. Ce sont des temps de montre,
     * qu'un ralenti n'allonge pas : on n'attend pas quatre fois plus devant une image fixe.
     */
    avant: 0.6,
    souffle: 0.05,
    /** Les appareils sont prêts tant de temps après le lancement ; ou, si l'extrait tarde, tant de temps après la fin du décompte. */
    prets: 1.5,
    retard: 2.6,
    /** La mauvaise réponse écrite d'avance tombe tant de temps après le début de l'extrait. */
    rayure: 3.2,
    /**
     * Ce qu'on rejoue avant chaque moment, pour le voir venir. L'extrait se reprend au « 1 » : le bras se lève, pivote et descend.
     * L'attente aussi, un peu avant lui : le temps de voir la pastille passer du « 2 » au « 1 ».
     */
    elan: { attente: 0.4, extrait: 1, rayure: 1, revelation: 1.4 },
    /** Ce qu'il faut à la révélation pour finir : le disque ralentit, s'arrête, se retourne et se repose. */
    apres: 4.2,
  },
  /** Les instants marquants de la piste, comptés chacun depuis l'un de ses signaux ou de ses gestes : ceux où la planche prend ses images. */
  images: { sortie: 0.14, vol: 0.52, arcsCourts: 0.55, brasLeve: 0.24, extrait: 2, rayure: 0.07, ralentit: 1.2, tranche: 0.16, reponse: 1.6 },
  /** Le rythme auquel une séance est suivie jusqu'à l'instant d'une image, en images par seconde. */
  rythme: 120,
  /** Le temps pendant lequel la page dit « Rayé. » après une mauvaise réponse. */
  raye: 0.9,
  /** Le temps qu'on rejoue avant un départ, puis après lui, pour mesurer ce qu'il fait à sa pièce, et le pas de cette mesure. */
  mesure: { avant: 0.5, apres: 0.5, pas: 0.001 },
} as const;
