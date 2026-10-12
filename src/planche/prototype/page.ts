/**
 * Le script que la page du prototype embarque (voir prototype.ts) : son point d'entrée. Il lance le prototype, avec les polices que
 * sa fabrication y a mises.
 */

import { lancerLePrototype } from './demarrage';

/** Les polices du site, en base 64, par nom de fichier : c'est l'assemblage du script qui les y met (voir planche/script.ts). */
declare const POLICES: Readonly<Record<string, string>>;

lancerLePrototype(POLICES);
