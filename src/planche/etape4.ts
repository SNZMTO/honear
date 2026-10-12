/**
 * Étape 4 : la planche « Fais ta pochette ». Fabrique ses SVG dans sortie/pochette/, et la page qui les montre :
 * sortie/etape4.html, à publier, et sortie/etape4-local.html, la même dans son enveloppe, à ouvrir ici.
 *
 *   npx tsx src/planche/etape4.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHOIX_DE_L_AVATAR } from '../ressources/avatar';
import { DENSITES } from '../ressources/densites';
import { TEXTES } from '../ressources/textes.fr';
import { surLeBois } from '../scene/meuble';
import { dessinerLeMeuble } from '../scene/meuble';
import { controler } from '../scene/rendu/controle';
import { enSvg } from '../scene/rendu/svg';
import { dessinerUneTouche } from '../scene/touche';
import { pageDeLaPochette } from './etape4/page';
import { imageDeLEcran, imagesDesChoix, imagesDesExemples, imagesDesExpressions, imagesDesMotifs, imagesDuHasard } from './etape4/scenes';
import type { FigureDePlanche } from './feuille';
import type { ImageDePlanche } from './image';
import { chargerLEncrier, policesEnBase64 } from './polices';

const SORTIE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'sortie');
const DOSSIER = join(SORTIE, 'pochette');
mkdirSync(DOSSIER, { recursive: true });
const encrier = chargerLEncrier(TEXTES.langue);
let defauts = 0;

function ecrire(image: ImageDePlanche): FigureDePlanche {
  const controle = controler(image.scene);
  defauts += controle.constats.length;
  for (const c of controle.constats.slice(0, 3)) console.log(`   ✗ ${image.fichier} : ${c.regle} @ ${c.calque} : ${c.detail}`);
  const svg = enSvg(image.scene, {
    ...image.regard,
    prefixe: `${image.fichier}-`,
    tracerLeTexte: encrier.tracer,
    titre: image.titre,
    ...(image.echelle !== undefined ? { echelle: image.echelle } : {}),
  });
  writeFileSync(join(DOSSIER, `${image.fichier}.svg`), svg);
  return { fichier: image.fichier, svg, legende: image.titre, largeur: image.regard.largeur * (image.echelle ?? 1) };
}

/** La touche « Au hasard » de la planche, seule sur un bout de bois : elle se presse. */
function toucheAuHasard(): ImageDePlanche {
  const regard = { origine: [900, 900] as const, largeur: 200, hauteur: 64 };
  const touche = dessinerUneTouche(
    {
      nom: 'touche-au-hasard',
      genre: 'secondaire',
      libelle: TEXTES.pochette.auHasard,
      centre: surLeBois({ ...regard, origine: [900, 900] }, 100, 30),
      support: 0,
      etat: 'repos',
    },
    DENSITES.fine,
    encrier.largeur,
  );
  return {
    fichier: 'touche-au-hasard',
    titre: TEXTES.pochette.auHasard,
    scene: dessinerLeMeuble({ regard: { ...regard, origine: [900, 900] }, densite: DENSITES.fine, objets: [touche] }),
    regard: { ...regard, origine: [900, 900] },
  };
}

const choix = imagesDesChoix(TEXTES, encrier);
const figures = {
  ecran: ecrire(imageDeLEcran(TEXTES, encrier)),
  choix: Object.fromEntries(CHOIX_DE_L_AVATAR.map((c) => [c, choix[c].map(ecrire)])) as Record<(typeof CHOIX_DE_L_AVATAR)[number], FigureDePlanche[]>,
  expressions: imagesDesExpressions(TEXTES, encrier).map((rangee) => rangee.map(ecrire)),
  motifs: imagesDesMotifs(TEXTES, encrier).map(ecrire),
  hasard: imagesDuHasard(TEXTES, encrier).map(ecrire),
  toucheAuHasard: ecrire(toucheAuHasard()),
  exemples: imagesDesExemples(TEXTES, encrier).map(ecrire),
};
const { aPublier, locale } = pageDeLaPochette(figures, TEXTES, policesEnBase64('web'));
writeFileSync(join(SORTIE, 'etape4.html'), aPublier);
writeFileSync(join(SORTIE, 'etape4-local.html'), locale);
console.log(`etape4.html : ${Math.round(aPublier.length / 1024)} Ko ; ${defauts === 0 ? 'aucun défaut' : `${defauts} défaut(s)`}`);
