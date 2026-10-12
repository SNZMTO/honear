/**
 * Les images de la planche de rendu (étape 1), telles que les choix les ont laissées : la platine dans ses deux densités,
 * ce qu'on montre, et par quel regard. Rien n'est écrit sur le disque ici : ces images servent aussi aux contrôles et aux tests.
 */

import { depuisLEcran } from '../lowpoly/projection';
import { DENSITES, type Densite } from '../ressources/densites';
import type { Textes } from '../ressources/textes';
import { dessinerLeDisque } from '../scene/disque';
import { dessinerLeLogo } from '../scene/logo';
import { dessinerLeMeuble, regardSurLaPlatine, surLeBois, type Regard } from '../scene/meuble';
import { remplir } from '../scene/phrases';
import { dessinerLaPlatine } from '../scene/platine';
import { dessinerLaPochette } from '../scene/pochette';
import type { Encrier } from '../scene/rendu/texte';
import { platineEclatee } from './eclate';
import { disqueDeLAccueil, platineDeLAccueil, pochetteDExemple } from './exemples';
import type { ImageDePlanche } from './image';
import { LEGENDES } from './legendes.fr';

/** Rayon de l'étiquette quand le logo est montré seul, en px : environ deux fois celle de la platine. */
export const RAYON_DU_LOGO = 160;

/** La platine complète sur le noyer, dans le cadre d'un téléphone, regard posé sur elle. */
function platineAuTelephone(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const disque = dessinerLeDisque(disqueDeLAccueil(textes, densite, encrier.largeur), densite);
  const regard = regardSurLaPlatine();
  return {
    fichier: `platine-${densite.cle}`,
    titre: remplir(LEGENDES.images.platine, { densite: LEGENDES.densites[densite.cle].toLowerCase() }),
    scene: dessinerLeMeuble({ regard, densite, objets: [dessinerLaPlatine(platineDeLAccueil(textes), densite, [disque.ombre, disque.disque])] }),
    regard,
  };
}

/**
 * Une pochette avec son personnage, en 240 px et en 48 px, posée sur le noyer sous la lampe :
 * le regard est choisi pour que le bord de la nappe passe dans le coin bas droit, loin des pochettes.
 */
function pochetteEnDeuxTailles(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard: Regard = { origine: [480, 250], largeur: 520, hauteur: 360 };
  const exemple = pochetteDExemple(textes);
  const grande = dessinerLaPochette(
    exemple,
    { nom: 'pochette-240', centre: surLeBois(regard, 180, 180), angle: -4, taille: 240, expression: 'content' },
    encrier.largeur,
  );
  const petite = dessinerLaPochette(
    exemple,
    { nom: 'pochette-48', centre: surLeBois(regard, 416, 226), angle: 6, taille: 48, expression: 'content' },
    encrier.largeur,
  );
  return {
    fichier: 'pochette',
    titre: remplir(LEGENDES.images.pochette, { artiste: exemple.artiste }),
    scene: dessinerLeMeuble({ regard, densite, objets: [grande.ombre, grande.pochette, petite.ombre, petite.pochette] }),
    regard,
  };
}

/** Le logo sur son étiquette, en grand. Le vinyle déborde du cadre de tous les côtés. */
function logoEnGrand(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard: Regard = { origine: [0, 0], largeur: 440, hauteur: 400 };
  const logo = { centre: depuisLEcran([regard.largeur / 2, regard.hauteur / 2]), rayon: RAYON_DU_LOGO, pans: densite.pansDeDisque };
  return { fichier: 'logo', titre: LEGENDES.images.logo, scene: dessinerLeLogo(logo, textes, encrier.largeur, densite), regard };
}

/**
 * Le détail montré sous chaque densité : où il est pris dans le cadre du téléphone, sa taille, et son grossissement.
 * On y voit le bord de l'étiquette, les sillons dans un secteur clair, la feutrine, la jante et ses repères.
 */
const DETAIL = { coin: [145, 225], cote: 130, echelle: 3 } as const;

/** Le même détail de chaque platine au téléphone, grossi : c'est là que les deux densités se comparent le mieux. */
export function detailsDesDensites(images: readonly ImageDePlanche[]): ImageDePlanche[] {
  return Object.values(DENSITES).map((densite) => {
    const platine = images.find((image) => image.fichier === `platine-${densite.cle}`);
    if (platine === undefined) throw new Error(`La planche n'a pas d'image de la platine en densité ${densite.cle}.`);
    return {
      ...platine,
      fichier: `detail-${densite.cle}`,
      titre: remplir(LEGENDES.images.detail, { densite: LEGENDES.densites[densite.cle].toLowerCase(), fois: DETAIL.echelle }),
      regard: {
        origine: [platine.regard.origine[0] + DETAIL.coin[0], platine.regard.origine[1] + DETAIL.coin[1]],
        largeur: DETAIL.cote,
        hauteur: DETAIL.cote,
      },
      echelle: DETAIL.echelle,
    };
  });
}

/** Toutes les images de la planche, dans l'ordre où elles se lisent. Hors la comparaison des densités, tout est en densité fine. */
export function imagesDeLaPlanche(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  return [
    ...Object.values(DENSITES).map((densite) => platineAuTelephone(densite, textes, encrier)),
    platineEclatee(DENSITES.fine, textes, encrier),
    pochetteEnDeuxTailles(DENSITES.fine, textes, encrier),
    logoEnGrand(DENSITES.fine, textes, encrier),
  ];
}
