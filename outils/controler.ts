/**
 * Passe les contrôles du rendu sur les images de la planche, sur celles de la piste, dans les deux densités et avec
 * les deux versos, sur celles du système visuel, de « Fais ta pochette », des écrans du jeu et de leurs animations, de l'écran de l'hôte,
 * du tournoi ; et affiche ce qu'ils trouvent.
 *   npx tsx outils/controler.ts
 */
import { imagesDeLaPisteAControler } from '../src/planche/etape2/images';
import { imagesDuSysteme } from '../src/planche/etape3/scenes';
import { imagesDeLaPochette } from '../src/planche/etape4/scenes';
import { pelliculesDesAnimations } from '../src/planche/etape5/animations';
import { toutesLesImagesDesEcrans } from '../src/planche/etape5/scenes';
import { imagesDeLHote } from '../src/planche/etape6/scenes';
import { toutesLesImagesDuTournoi } from '../src/planche/tournoi/scenes';
import { chargerLEncrier } from '../src/planche/polices';
import { imagesDeLaPlanche } from '../src/planche/scenes';
import { TEXTES } from '../src/ressources/textes.fr';
import { controler, LIMITES } from '../src/scene/rendu/controle';

const encrier = chargerLEncrier(TEXTES.langue);
const images = [
  ...imagesDeLaPlanche(TEXTES, encrier),
  ...imagesDeLaPisteAControler(TEXTES, encrier),
  ...imagesDuSysteme(TEXTES, encrier),
  ...imagesDeLaPochette(TEXTES, encrier),
  ...toutesLesImagesDesEcrans(TEXTES, encrier),
  ...pelliculesDesAnimations(TEXTES, encrier).flatMap((p) => p.images),
  ...imagesDeLHote(TEXTES, encrier),
  ...toutesLesImagesDuTournoi(TEXTES, encrier),
];
let defauts = 0;
for (const image of images) {
  const c = controler(image.scene);
  defauts += c.constats.length;
  console.log(
    `${image.fichier.padEnd(28)} décor ${String(c.polygonesDuDecor).padStart(4)}/${LIMITES.decor}  mobile le plus lourd : ${c.plusLourdCalqueMobile.nom || '—'} ${c.plusLourdCalqueMobile.poids}/${LIMITES.mobile}` +
      `  écarts de ton ${c.ecartsDeTon.join('·')}  contraste entre voisines ${c.plusFortContraste.toFixed(2)} au plus, pour une limite de ${LIMITES.contrasteDeVoisines}` +
      `  plus petit texte ${Number.isFinite(c.plusPetitCorps) ? `${c.plusPetitCorps.toFixed(1)} px` : '—'}`,
  );
  const groupes = new Map<string, number>();
  for (const constat of c.constats) {
    const ligne = `${constat.regle} @ ${constat.calque} : ${constat.detail}`;
    groupes.set(ligne, (groupes.get(ligne) ?? 0) + 1);
  }
  for (const [ligne, fois] of groupes) console.log(`   ✗ ${ligne}${fois > 1 ? ` (×${fois})` : ''}`);
}
console.log(defauts === 0 ? '\nAucun défaut.' : `\n${defauts} défaut(s).`);
process.exitCode = defauts === 0 ? 0 : 1;
