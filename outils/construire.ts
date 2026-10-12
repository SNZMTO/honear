/**
 * Construit le site à mettre en ligne, dans dist/ : la page du jeu (son script, ses polices à tracer et ses textes embarqués, servie
 * telle quelle) et le serveur, en un seul fichier que Node lance sans rien installer à côté.
 *
 *   npm run construire      puis      node dist/serveur.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { pageDuJeu } from '../src/ecran/jeu/gabarit';
import { policesEnBase64 } from '../src/planche/polices';
import { CIBLE, pourUnePage } from '../src/planche/script';
import { TEXTES } from '../src/ressources/textes.fr';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RACINE, 'dist');
mkdirSync(DIST, { recursive: true });

// La page : un script pour les navigateurs d'il y a cinq ans, ses polices et ses textes dedans.
const script = await build({
  entryPoints: [join(RACINE, 'src/ecran/jeu/page.ts')],
  bundle: true,
  format: 'iife',
  target: CIBLE,
  minify: true,
  write: false,
  legalComments: 'none',
  define: { POLICES: JSON.stringify(policesEnBase64('trace')), TEXTES: JSON.stringify(TEXTES) },
  logLevel: 'warning',
});
const [sortie] = script.outputFiles;
if (sortie === undefined) throw new Error("Le script de la page n'a pas été assemblé.");
const page = pageDuJeu(TEXTES, pourUnePage(sortie.text));
writeFileSync(join(DIST, 'index.html'), page);

// Le serveur : un module pour Node, `ws` compris, avec les textes de ses lettres. Ce que `ws` charge de lui-même en CommonJS a
// besoin de `require`.
await build({
  entryPoints: [join(RACINE, 'src/reseau/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: join(DIST, 'serveur.mjs'),
  external: ['bufferutil', 'utf-8-validate'],
  define: { TEXTES_DU_COMPTE: JSON.stringify(TEXTES.compte) },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  legalComments: 'none',
  logLevel: 'warning',
});
console.log(`dist/index.html : ${Math.round(page.length / 1024)} Ko ; dist/serveur.mjs : prêt pour Node 22 ou plus récent`);
