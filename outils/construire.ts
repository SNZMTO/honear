/**
 * Construit le site à mettre en ligne, dans dist/ : la page du jeu (son script, ses polices à tracer et ses textes embarqués, servie
 * telle quelle), les pages légales, et le serveur, en un seul fichier que Node lance sans rien installer à côté.
 *
 *   npm run construire      puis      node dist/serveur.mjs
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { pageDuJeu } from '../src/ecran/jeu/gabarit';
import { iconeDeLApplication, manifesteDeLApplication } from '../src/ecran/jeu/application';
import { pageLegale, type CleDePageLegale } from '../src/ecran/jeu/legal';
import { APPLICATION, PAGES_LEGALES } from '../src/ressources/reglages';
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
// La version de la page : l'empreinte de son contenu. Une page restée ouverte d'une version plus ancienne se recharge.
const sansVersion = pageDuJeu(TEXTES, pourUnePage(sortie.text));
const page = pageDuJeu(TEXTES, pourUnePage(sortie.text), createHash('sha256').update(sansVersion).digest('base64url').slice(0, 12));
writeFileSync(join(DIST, 'index.html'), page);

// Le jeu comme une application : son manifeste et son icône, que le serveur sert à leur adresse.
writeFileSync(join(DIST, APPLICATION.manifeste.slice(1)), manifesteDeLApplication(TEXTES));
writeFileSync(join(DIST, APPLICATION.icone.slice(1)), iconeDeLApplication());

// Les pages légales, sans script : le serveur les sert à leur adresse (« /confidentialite » dans confidentialite.html).
for (const cle of Object.keys(PAGES_LEGALES) as CleDePageLegale[])
  writeFileSync(join(DIST, `${PAGES_LEGALES[cle].slice(1)}.html`), pageLegale(TEXTES, cle));

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
  define: { TEXTES_DU_COMPTE: JSON.stringify(TEXTES.compte), TEXTES_DU_CONTACT: JSON.stringify(TEXTES.legal.sansContact) },
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  legalComments: 'none',
  logLevel: 'warning',
});
console.log(`dist/index.html : ${Math.round(page.length / 1024)} Ko ; dist/serveur.mjs : prêt pour Node 22 ou plus récent`);
