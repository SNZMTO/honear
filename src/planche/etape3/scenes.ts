/**
 * Les images de la planche du système visuel (étape 3) : le meuble entier, puis chaque objet de près.
 * Ce qui existait (la platine, son bras, le logo, la pochette) est repris tel quel de l'étape 1 ; ce qui manquait (l'ampli,
 * ses vumètres, le bac, les touches, les pastilles qui disent quelque chose) est dessiné ici, avec les mêmes fonctions.
 * Rien n'est écrit sur le disque ici : ces images servent aussi aux contrôles et aux tests.
 */

import { surLEcran } from '../../lowpoly/projection';
import { AMPLI } from '../../ressources/ampli';
import { DENSITES, type Densite } from '../../ressources/densites';
import { PASTILLES } from '../../ressources/pastilles';
import { DEROULE } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import { dessinerLAmpli, DESSUS_DE_L_AMPLI } from '../../scene/ampli';
import { dessinerLeBac } from '../../scene/bac';
import type { Calque, Mesure } from '../../scene/calque';
import { dessinerLeDisque } from '../../scene/disque';
import { dessinerLeMeuble, surLeBois, type Regard } from '../../scene/meuble';
import { dessinerUnePastille, faceEcrite } from '../../scene/pastille';
import { remplir } from '../../scene/phrases';
import { dessinerLaPlatine } from '../../scene/platine';
import { dessinerLaPochette } from '../../scene/pochette';
import { agrandir, empriseDe } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import { ampliDuSalon, bacDesPlaylistsPretes } from '../../scene/telephone/meuble';
import { dessinerUneTouche, type EtatDeTouche } from '../../scene/touche';
import { disqueDeLAccueil, pisteDExemple, platineDeLAccueil, pochetteDExemple } from '../exemples';
import type { ImageDePlanche } from '../image';
import { imagesDeLaPlanche } from '../scenes';
import { LEGENDES_DU_SYSTEME as L } from './legendes.fr';

/** Un regard qui cadre un rectangle de l'écran de la scène, avec une marge. */
const cadrer = (gauche: number, haut: number, largeur: number, hauteur: number): Regard => ({ origine: [gauche, haut], largeur, hauteur });

/** Le regard qui cadre un objet posé sur le meuble, son ombre comprise, avec une marge. */
function regardSur(objet: Calque, mesurer: Mesure): Regard {
  const emprise = empriseDe([objet], mesurer);
  if (emprise === undefined) throw new Error(`Le calque « ${objet.nom} » ne dessine rien à cadrer.`);
  const { x, y, largeur, hauteur } = agrandir(emprise, L.marge);
  return cadrer(x, y, largeur, hauteur);
}

/** Le meuble entier, comme l'écran de l'hôte le montrera : le bac à gauche, la platine au centre, l'ampli à droite. */
function meubleEntier(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard = cadrer(0, 0, 1380, 640);
  const disque = dessinerLeDisque(disqueDeLAccueil(textes, densite, encrier.largeur), densite);
  const pochette = dessinerLaPochette(
    pochetteDExemple(textes),
    { nom: 'pochette-joueur', centre: surLeBois(regard, 1190, 540), angle: 6, taille: 120, expression: 'content' },
    encrier.largeur,
  );
  const touche = dessinerUneTouche(
    {
      nom: 'touche-poser',
      genre: 'principale',
      libelle: textes.touches.poserUnDisque,
      centre: surLeBois(regard, 712, 584),
      support: 0,
      etat: 'repos',
    },
    densite,
    encrier.largeur,
  );
  return {
    fichier: 'systeme-meuble',
    titre: L.images.meuble,
    scene: dessinerLeMeuble({
      regard,
      densite,
      objets: [
        dessinerLeBac(bacDesPlaylistsPretes(textes), densite, encrier.largeur),
        dessinerLaPlatine(platineDeLAccueil(textes), densite, [disque.ombre, disque.disque]),
        dessinerLAmpli(ampliDuSalon(textes, true), densite),
        pochette.ombre,
        pochette.pochette,
        touche,
      ],
    }),
    regard,
  };
}

/** L'ampli seul, éteint ou allumé. */
function ampli(densite: Densite, textes: Textes, encrier: Encrier, allume: boolean): ImageDePlanche {
  const objet = dessinerLAmpli(ampliDuSalon(textes, allume), densite);
  const regard = regardSur(objet, encrier.largeur);
  return {
    fichier: allume ? 'systeme-ampli-allume' : 'systeme-ampli-eteint',
    titre: allume ? L.images.ampliAllume : L.images.ampliEteint,
    scene: dessinerLeMeuble({ regard, densite, objets: [objet] }),
    regard,
  };
}

/** Un vumètre de près, l'aiguille dans le rouge : la fin d'un extrait. */
function vumetreDePres(densite: Densite, textes: Textes): ImageDePlanche {
  const V = AMPLI.vumetres;
  const coin = surLEcran([AMPLI.position[0] + (V.x[0] ?? 0), AMPLI.position[1] + V.y], DESSUS_DE_L_AMPLI);
  const [, bas] = surLEcran([0, AMPLI.position[1] + V.y + V.profondeur], DESSUS_DE_L_AMPLI);
  const regard = cadrer(coin[0] - L.marge / 2, coin[1] - L.marge / 2, V.largeur + L.marge, bas - coin[1] + L.marge * 2);
  return {
    fichier: 'systeme-vumetre',
    titre: L.images.vumetre,
    scene: dessinerLeMeuble({ regard, densite, objets: [dessinerLAmpli(ampliDuSalon(textes, true, L.aiguillesDansLeRouge), densite)] }),
    regard,
    echelle: 3,
  };
}

function bac(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const objet = dessinerLeBac(bacDesPlaylistsPretes(textes), densite, encrier.largeur);
  const regard = regardSur(objet, encrier.largeur);
  return { fichier: 'systeme-bac', titre: L.images.bac, scene: dessinerLeMeuble({ regard, densite, objets: [objet] }), regard };
}

/** Les touches : la principale au repos et enfoncée, une secondaire, un poussoir allumé. */
function touches(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard = cadrer(600, 700, 420, 300);
  const poser = (nom: `touche-${string}`, genre: 'principale' | 'secondaire', libelle: string, x: number, y: number, etat: EtatDeTouche): Calque =>
    dessinerUneTouche({ nom, genre, libelle, centre: surLeBois(regard, x, y), support: 0, etat }, densite, encrier.largeur);
  return {
    fichier: 'systeme-touches',
    titre: L.images.touches,
    scene: dessinerLeMeuble({
      regard,
      densite,
      objets: [
        poser('touche-repos', 'principale', textes.touches.poserUnDisque, 210, 58, 'repos'),
        poser('touche-enfoncee', 'principale', textes.touches.poserUnDisque, 210, 142, 'enfoncee'),
        poser('touche-code', 'secondaire', textes.touches.jAiUnCode, 110, 232, 'repos'),
        poser('touche-allumee', 'secondaire', textes.ampli.allume, 310, 232, 'allumee'),
      ],
    }),
    regard,
  };
}

/** Les pastilles de disquaire : le décompte, des points marqués, des messages courts. Toujours de travers. */
function pastilles(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard = cadrer(560, 760, 420, 200);
  const { point, message } = PASTILLES;
  const T = textes.pastilles;
  const { piste } = pisteDExemple(textes);
  const poses = [
    {
      cle: 'decompte',
      x: 46,
      y: 58,
      angle: PASTILLES.decompte.angle,
      rayon: PASTILLES.decompte.rayon,
      contenu: String(DEROULE.decompte.de),
      role: 'titrage',
      auPlus: 'grandTitre',
    },
    { cle: 'monte', x: 112, y: 54, angle: 6, rayon: point.rayon, contenu: remplir(T.monte, { places: 2 }), role: 'titrage', auPlus: 'titre' },
    { cle: 'descend', x: 176, y: 62, angle: -5, rayon: point.rayon, contenu: remplir(T.descend, { places: 1 }), role: 'titrage', auPlus: 'titre' },
    { cle: 'entree', x: 250, y: 58, angle: 8, rayon: point.rayon + 6, contenu: T.entree, role: 'techniqueFort', auPlus: 'mention' },
    { cle: 'presque', x: 340, y: 70, angle: -4, rayon: message.rayon, contenu: T.presque, role: 'titrage', auPlus: 'texte' },
    { cle: 'raye', x: 120, y: 142, angle: 5, rayon: message.rayon, contenu: textes.piste.raye, role: 'titrage', auPlus: 'texte' },
    {
      cle: 'piste',
      x: 290,
      y: 140,
      angle: -6,
      rayon: message.rayon,
      contenu: `${remplir(textes.piste.numero, { numero: piste.numero })} ${remplir(textes.piste.sur, { total: piste.sur })}`,
      role: 'titrage',
      auPlus: 'texte',
    },
  ] as const;
  const objets = poses.flatMap((p) => {
    const dessinee = dessinerUnePastille({
      nom: `pastille-${p.cle}`,
      en: surLeBois(regard, p.x, p.y),
      support: 0,
      angle: p.angle,
      rayon: p.rayon,
      faces: { ecrite: faceEcrite(p.contenu, p.role, p.rayon, p.auPlus, encrier.largeur) },
      montre: 'ecrite',
    });
    return [dessinee.ombre, dessinee.pastille];
  });
  return { fichier: 'systeme-pastilles', titre: L.images.pastilles, scene: dessinerLeMeuble({ regard, densite, objets }), regard };
}

/** Ce qui était déjà dessiné, repris de l'étape 1 : la platine au téléphone, le bras de près, le logo, la pochette. */
function repris(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const etape1 = imagesDeLaPlanche(textes, encrier);
  const prise = (fichier: string): ImageDePlanche => {
    const image = etape1.find((i) => i.fichier === fichier);
    if (image === undefined) throw new Error(`La planche de l'étape 1 n'a plus d'image « ${fichier} ».`);
    return image;
  };
  const platine = prise('platine-fine');
  const [x, y] = platine.regard.origine;
  return [
    { ...platine, fichier: 'systeme-platine', titre: L.images.platine },
    {
      ...platine,
      fichier: 'systeme-bras',
      titre: L.images.bras,
      regard: cadrer(x + L.bras.coin[0], y + L.bras.coin[1], L.bras.largeur, L.bras.hauteur),
      echelle: 2,
    },
    { ...prise('logo'), fichier: 'systeme-logo', titre: L.images.logo },
    { ...prise('pochette'), fichier: 'systeme-pochette', titre: L.images.pochette },
  ];
}

/** Toutes les images de la planche du système, dans l'ordre où la page les montre. Tout est en densité fine. */
export function imagesDuSysteme(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const densite = DENSITES.fine;
  const [platine, bras, logo, pochette] = repris(textes, encrier);
  return [
    meubleEntier(densite, textes, encrier),
    ...[logo, platine, bras].filter((i): i is ImageDePlanche => i !== undefined),
    ampli(densite, textes, encrier, false),
    ampli(densite, textes, encrier, true),
    vumetreDePres(densite, textes),
    bac(densite, textes, encrier),
    touches(densite, textes, encrier),
    pastilles(densite, textes, encrier),
    ...[pochette].filter((i): i is ImageDePlanche => i !== undefined),
  ];
}
