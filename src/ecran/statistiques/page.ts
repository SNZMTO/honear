/**
 * Le script de la page des statistiques (voir outils/construire.ts) : son point d'entrée. Il ouvre les statistiques dans la page,
 * avec les textes que sa fabrication y a mis.
 */

import type { Textes } from '../../ressources/textes';
import { ouvrirLesStatistiques } from './tableau';

/** Les textes du site : c'est la construction de la page qui les y met. */
declare const TEXTES: Textes;

const cadre = document.querySelector('[data-statistiques]');
if (cadre instanceof HTMLElement) ouvrirLesStatistiques(cadre, TEXTES);
