/**
 * Étape 2 : l'atelier de la platine en mouvement. Assemble le script de la page, y embarque les polices, et écrit dans sortie/
 * la page à publier (sans enveloppe : c'est celui qui la publie qui la lui donne) et la même, enveloppée, pour l'ouvrir ici.
 * Écrit aussi, dans sortie/piste/, la piste arrêtée à ses dix instants marquants, puis sa dernière image avec l'autre verso :
 * des SVG à regarder sans rien lancer.
 *
 *   npx tsx src/planche/etape2.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DENSITES } from '../ressources/densites';
import { TEXTES } from '../ressources/textes.fr';
import { VERSO_DU_JEU, VERSOS_A_COMPARER } from '../scene/disque/verso';
import { enSvg } from '../scene/rendu/svg';
import { BANCS } from './etape2/banc';
import { ecrireLaPage } from './etape2/gabarit';
import { imagesDeLaPiste } from './etape2/images';
import { seanceDExemple, seanceEntiere } from './etape2/seance';
import { listeDesTemps } from './etape2/temps';
import { chargerLEncrier, policesEnBase64 } from './polices';
import { assemblerUnScript } from './script';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, '..', '..', 'sortie');

const script = await assemblerUnScript(join(ICI, 'etape2', 'page.ts'));

const page = ecrireLaPage({
  textes: TEXTES,
  polices: policesEnBase64('web'),
  enchainements: listeDesTemps(seanceEntiere(seanceDExemple(TEXTES))),
  bancs: BANCS,
  script,
});
mkdirSync(SORTIE, { recursive: true });
writeFileSync(join(SORTIE, 'etape2.html'), page);
// La même enveloppe que celle que reçoit une page publiée : pour la voir ici comme elle sera là-bas.
writeFileSync(
  join(SORTIE, 'etape2-local.html'),
  `<!doctype html><html lang="${TEXTES.langue}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{color-scheme:light;padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${page}</body></html>`,
);
console.log(`etape2.html : ${Math.round(page.length / 1024)} Ko, dont ${Math.round(script.length / 1024)} Ko de script`);

// La pellicule de la piste : en densité fine, avec le verso du jeu ; puis sa dernière image avec l'autre verso.
const PELLICULE = join(SORTIE, 'piste');
mkdirSync(PELLICULE, { recursive: true });
const encrier = chargerLEncrier(TEXTES.langue);
const pellicule = [
  ...imagesDeLaPiste(TEXTES, encrier, DENSITES.fine, VERSO_DU_JEU),
  ...VERSOS_A_COMPARER.flatMap((verso) => imagesDeLaPiste(TEXTES, encrier, DENSITES.fine, verso).slice(-1)),
];
pellicule.forEach((image, rang) => {
  const svg = enSvg(image.scene, { ...image.regard, prefixe: `${image.fichier}-`, tracerLeTexte: encrier.tracer, titre: image.titre });
  writeFileSync(join(PELLICULE, `${String(rang + 1).padStart(2, '0')}-${image.fichier}.svg`), svg);
});
console.log(`piste/ : ${pellicule.length} images`);
