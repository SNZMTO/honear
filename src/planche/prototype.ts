/**
 * Le prototype : une partie cliquable de bout en bout, au téléphone de l'hôte, contre le serveur simulé et cinq potes. Assemble
 * le script de la page, y embarque les polices, et écrit dans sortie/ la page à publier (sans enveloppe : c'est celui qui la publie
 * qui la lui donne) et la même, enveloppée, pour l'ouvrir ici.
 *
 *   npx tsx src/planche/prototype.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { policesEnBase64 } from './polices';
import { pageDuPrototype } from './prototype/gabarit';
import { assemblerUnScript } from './script';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, '..', '..', 'sortie');

const script = await assemblerUnScript(join(ICI, 'prototype', 'page.ts'));
const { aPublier, locale } = pageDuPrototype(TEXTES, policesEnBase64('web'), script);
mkdirSync(SORTIE, { recursive: true });
writeFileSync(join(SORTIE, 'prototype.html'), aPublier);
writeFileSync(join(SORTIE, 'prototype-local.html'), locale);
console.log(`prototype.html : ${Math.round(aPublier.length / 1024)} Ko, dont ${Math.round(script.length / 1024)} Ko de script`);
