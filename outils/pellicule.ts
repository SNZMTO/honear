/**
 * La pellicule : la séance de l'atelier arrêtée aux instants qu'on demande, une image par instant, en SVG. C'est l'outil de qui
 * touche au mouvement : ce que les tests ne voient pas (une ombre qui claque, une pièce qui passe sous une autre) se voit là.
 * On la tire, et on l'assemble en planche-contact, avec outils/pellicule.py.
 *
 *   npx tsx outils/pellicule.ts DOSSIER [option=valeur ...] t1 t2 ...
 *
 * Les instants sont ceux de l'horloge de la séance, en secondes, dans l'ordre : le « 3 » y tombe à 0,6 s, l'extrait part à 3,6 s,
 * la mauvaise réponse écrite tombe à 6,8 s et la révélation à 13,6 s (voir src/planche/etape2/minutage.ts et seance.ts).
 * Options : densite=fine|sobre   verso=etiquette|disque   rayures=7.2,7.25 (des mauvaises réponses de plus)
 *           reveler=9 (la révélation avant l'heure)   allure=sobre|sansReactions   seance=lente (l'extrait tarde à charger)
 *           ombres=figees (la scène dessinée une fois puis réglée, ses ombres figées : comme en mode léger)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arreterLaSeance, type Arret } from '../src/planche/etape2/images';
import { LEGENDES } from '../src/planche/etape2/legendes.fr';
import { revelerDes, seanceDExemple } from '../src/planche/etape2/seance';
import { ecrire } from '../src/planche/nombres.fr';
import { chargerLEncrier } from '../src/planche/polices';
import { DENSITES } from '../src/ressources/densites';
import { TEXTES } from '../src/ressources/textes.fr';
import { GENRES_DE_VERSO } from '../src/scene/disque/verso';
import { remplir } from '../src/scene/phrases';
import type { Allure } from '../src/scene/piste/suivi';
import { controler } from '../src/scene/rendu/controle';
import { enSvg } from '../src/scene/rendu/svg';

const [dossier, ...demandes] = process.argv.slice(2);
if (dossier === undefined) throw new Error('Il manque le dossier où écrire les images.');
/** Une option se donne par son nom, un signe égal, puis sa valeur. */
const options = new Map(
  demandes.filter((d) => d.includes('=')).map((d): [string, string] => [d.slice(0, d.indexOf('=')), d.slice(d.indexOf('=') + 1)]),
);
const instants = demandes.filter((d) => !d.includes('=')).map(Number);
if (instants.length === 0 || instants.some((t) => !Number.isFinite(t))) throw new Error('Il faut au moins un instant, en secondes.');

/** Une option, parmi les valeurs qu'on lui connaît ; la première si on ne la donne pas. */
function option<V extends string>(nom: string, connues: readonly V[]): V {
  const donnee = options.get(nom) ?? connues[0];
  const trouvee = connues.find((connue) => connue === donnee);
  if (trouvee === undefined) throw new Error(`L'option « ${nom} » vaut ${connues.join(' ou ')}, pas « ${donnee} ».`);
  return trouvee;
}
const nombres = (nom: string): number[] =>
  (options.get(nom) ?? '')
    .split(',')
    .filter((v) => v !== '')
    .map(Number);

const ALLURES: Readonly<Record<'entiere' | 'sobre' | 'sansReactions', Allure>> = {
  entiere: { sobre: false, reactions: true },
  sobre: { sobre: true, reactions: true },
  sansReactions: { sobre: false, reactions: false },
};
const encrier = chargerLEncrier(TEXTES.langue);
const ecrite = seanceDExemple(TEXTES, option('seance', ['aLHeure', 'lente']) === 'lente');
const [revelee] = nombres('reveler');
const arrets = instants.map((a): Arret => ({
  a,
  fichier: `t${a.toFixed(3).padStart(7, '0')}`,
  titre: remplir(LEGENDES.arret, { instant: ecrire(a, 3) }),
}));
const images = arreterLaSeance(
  {
    textes: TEXTES,
    encrier,
    densite: DENSITES[option('densite', ['fine', 'sobre'])],
    verso: option('verso', GENRES_DE_VERSO),
    seance: revelee === undefined ? ecrite : revelerDes(ecrite, revelee),
    rayuresDuJoueur: nombres('rayures'),
    allure: ALLURES[option('allure', ['entiere', 'sobre', 'sansReactions'])],
    ombresFigees: option('ombres', ['animees', 'figees']) === 'figees',
  },
  arrets,
);

mkdirSync(dossier, { recursive: true });
for (const image of images) {
  writeFileSync(
    join(dossier, `${image.fichier}.svg`),
    enSvg(image.scene, { ...image.regard, prefixe: `${image.fichier}-`, tracerLeTexte: encrier.tracer, titre: image.titre }),
  );
  // Les contrôles du rendu valent pour chaque image de la pellicule : on dit ce qu'ils trouvent.
  const constats = controler(image.scene).constats;
  if (constats.length > 0) console.log(`${image.fichier} : ${[...new Set(constats.map((c) => `${c.regle} @ ${c.calque}`))].join(', ')}`);
}
console.log(`${images.length} images dans ${dossier}`);
