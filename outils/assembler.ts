/**
 * Assemble un script de page dans un fichier : un module qui tourne dans un navigateur, et tout ce qu'il importe,
 * par le même geste et pour les mêmes navigateurs que la page de l'atelier. C'est ainsi que le banc d'essai est construit.
 *
 *   npx tsx outils/assembler.ts outils/banc.ts sortie/banc/banc.js
 */

import { writeFileSync } from 'node:fs';
import { assemblerUnScript } from '../src/planche/script';

const [entree, sortie] = process.argv.slice(2);
if (entree === undefined || sortie === undefined) throw new Error('Il faut le module à assembler, puis le fichier où écrire le script.');
writeFileSync(sortie, await assemblerUnScript(entree));
