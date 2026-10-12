/**
 * Le script de la page du jeu, en ligne (voir outils/construire.ts) : son point d'entrée. Il lance le jeu avec les polices et les
 * textes que sa fabrication y a mis : la langue se choisit en construisant la page, pas en la lisant.
 */

import type { Textes } from '../../ressources/textes';
import { lancerLeJeu } from './demarrage';

/** Les polices à tracer, en base 64, par nom de fichier, et les textes du site : c'est la construction de la page qui les y met. */
declare const POLICES: Readonly<Record<string, string>>;
declare const TEXTES: Textes;

lancerLeJeu(POLICES, TEXTES);
