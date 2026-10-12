/**
 * Le dessin d'une piste : la platine, le disque mystère, sa pochette kraft et la pastille du décompte, dans une pose donnée.
 * Ce module assemble des objets qui se dessinent eux-mêmes ; il ne sait d'eux que leur ordre.
 */

import type { Densite } from '../../ressources/densites';
import { PASTILLES } from '../../ressources/pastilles';
import { PLATINE } from '../../ressources/platine';
import type { Textes } from '../../ressources/textes';
import { CORPS } from '../../ressources/typo';
import type { Calque, Dessin, Mesure } from '../calque';
import { dessinerLeDisque } from '../disque';
import { dessinerLeVerso, type Verso } from '../disque/verso';
import { ligneDeBaseSous, ligneSurMiel } from '../encre';
import { etiquetteDeLaPiste } from '../etiquette/piste';
import { dessinerLaPochetteKraft } from '../kraft';
import { dessinerUnePastille } from '../pastille';
import { dessinerLaPlatine, type EtatDesCommandes } from '../platine';
import { CHIFFRES_DU_DECOMPTE, disqueDeLaPiste, kraftDeLaPiste, pastilleDuDecompte, platineDeLaPiste } from './pieces';
import type { PoseDeLaPiste } from './pose';

/** Ce qui ne bouge pas pendant une piste : ce qu'il faut savoir une fois pour la dessiner. */
export interface DecorDeLaPiste {
  readonly piste: { readonly numero: number; readonly sur: number };
  readonly commandes: EtatDesCommandes;
  /** Nom gravé sur la plaque de marque de la platine. */
  readonly marque: string;
}

/** Les chiffres du décompte, un par face de la pastille : centrés, en titrage. */
function facesDuDecompte(): Record<string, Dessin[]> {
  const corps = CORPS.grandTitre;
  // Un chiffre a la hauteur d'une capitale : centré, il a la moitié au-dessus du centre de la pastille.
  const pied = ligneDeBaseSous(0, corps) / 2;
  return Object.fromEntries(CHIFFRES_DU_DECOMPTE.map((chiffre) => [chiffre, [ligneSurMiel(chiffre, 'titrage', corps, pied)]]));
}

/**
 * @param verso la façon dont le verso du disque montre la réponse, et la réponse si elle est tombée.
 * @returns les objets de la piste, du fond vers l'avant, à confier au meuble.
 */
export function dessinerLaPiste(
  decor: DecorDeLaPiste,
  verso: Verso,
  pose: PoseDeLaPiste,
  textes: Textes,
  mesurer: Mesure,
  densite: Densite,
): Calque[] {
  const etiquette = { rayon: PLATINE.disque.etiquette, pans: densite.pansDeDisque };
  const { etiquette: poseDeLEtiquette, ...poseDuDisque } = disqueDeLaPiste(pose);
  const disque = dessinerLeDisque(
    {
      ...poseDuDisque,
      etiquette: { ...etiquetteDeLaPiste(etiquette, textes, decor.piste, mesurer), ...poseDeLEtiquette },
      // Le disque a toujours ses deux faces : tant qu'on ne sait rien, son verso n'a que son fond, et la révélation y pose la réponse.
      verso: dessinerLeVerso(verso, mesurer, densite),
    },
    densite,
  );
  const kraft = dessinerLaPochetteKraft({ ...kraftDeLaPiste(pose), piste: decor.piste }, textes, mesurer);
  const pastille = dessinerUnePastille({ ...pastilleDuDecompte(pose), angle: PASTILLES.decompte.angle, faces: facesDuDecompte() });
  const platine = dessinerLaPlatine(
    { ...platineDeLaPiste(pose), commandes: decor.commandes, marque: decor.marque },
    densite,
    // Le disque passe au-dessus de tout, sauf du bras ; tant qu'il est pris dans sa pochette, le papier du devant le recouvre.
    [kraft.ombre, kraft.corps, disque.ombre, disque.disque, kraft.devant],
  );
  return [platine, pastille.ombre, pastille.pastille];
}
