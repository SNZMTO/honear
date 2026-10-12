/**
 * Étape 7 : la planche d'animations. Assemble le script de la page, y embarque les polices, et écrit dans sortie/ la page à publier
 * (sans enveloppe : c'est celui qui la publie qui la lui donne) et la même, enveloppée, pour l'ouvrir ici.
 *
 *   npx tsx src/planche/etape7.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTES } from '../ressources/textes.fr';
import { lesAnimations } from './animations';
import { pageDeLaPlanche } from './etape7/gabarit';
import { chargerLEncrier, policesEnBase64 } from './polices';
import { assemblerUnScript } from './script';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, '..', '..', 'sortie');

const script = await assemblerUnScript(join(ICI, 'etape7', 'page.ts'));
const animations = lesAnimations({ textes: TEXTES, encrier: chargerLEncrier(TEXTES.langue) });
const { aPublier, locale } = pageDeLaPlanche(animations, TEXTES, policesEnBase64('web'), script);
mkdirSync(SORTIE, { recursive: true });
writeFileSync(join(SORTIE, 'etape7.html'), aPublier);
writeFileSync(join(SORTIE, 'etape7-local.html'), locale);
console.log(
  `etape7.html : ${animations.length} animations, ${Math.round(aPublier.length / 1024)} Ko, dont ${Math.round(script.length / 1024)} Ko de script`,
);
