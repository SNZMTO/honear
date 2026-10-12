/**
 * Le script que la page de l'atelier embarque (voir etape2.ts) : son point d'entrée. Il lance la page, avec les polices
 * que sa fabrication y a mises.
 */

import { lancerLaPage } from './page/demarrage';

/** Les polices du site, en base 64, par nom de fichier : c'est l'assemblage du script qui les y met (voir planche/script.ts). */
declare const POLICES: Readonly<Record<string, string>>;

lancerLaPage(POLICES);
