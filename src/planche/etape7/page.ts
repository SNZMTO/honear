/**
 * Le script que la page de la planche d'animations embarque (voir etape7.ts) : son point d'entrée. Il lance la planche vivante,
 * avec les polices que sa fabrication y a mises.
 */

import { lancerLaPlanche } from './vivante';

/** Les polices du site, en base 64, par nom de fichier : c'est l'assemblage du script qui les y met (voir planche/script.ts). */
declare const POLICES: Readonly<Record<string, string>>;

lancerLaPlanche(POLICES);
