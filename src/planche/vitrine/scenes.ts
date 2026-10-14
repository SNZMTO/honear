/**
 * Les images de la vitrine, celles du README sur GitHub : dessinées par les mêmes fonctions que le site, sur le même noyer.
 * La bannière (la platine de l'accueil et le nom du jeu), les bandeaux des deux faces et de la piste cachée, les pochettes
 * des joueurs, les trois pochettes des coulisses, les pastilles des chiffres, la touche qui mène au site, et le logo en face B.
 * Rien n'est écrit sur le disque ici.
 */

import { TON_DE_BASE } from '../../lowpoly/tons';
import { DENSITES } from '../../ressources/densites';
import { PASTILLES } from '../../ressources/pastilles';
import type { Textes } from '../../ressources/textes';
import { CORPS, type Echelon } from '../../ressources/typo';
import { calque, type Calque, type Mesure, type Texte } from '../../scene/calque';
import { dessinerLeDisque } from '../../scene/disque';
import { dessinerLeLogo } from '../../scene/logo';
import { dessinerLeMeuble, surLeBois, type Regard } from '../../scene/meuble';
import { dessinerUnePastille, faceEcrite } from '../../scene/pastille';
import { dessinerLaPlatine } from '../../scene/platine';
import { dessinerLaPochette } from '../../scene/pochette';
import { agrandir, empriseDe } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import { dessinerUneTouche } from '../../scene/touche';
import { pochettesDExemple } from '../etape4/scenes';
import { disqueDeLAccueil, platineDeLAccueil } from '../exemples';
import type { ImageDePlanche } from '../image';
import { LEGENDES_DE_LA_VITRINE as L } from './legendes.fr';

const DENSITE = DENSITES.fine;

/** Un texte posé à plat sur le noyer, dans le repère de l'écran. */
function surLeNoyer(
  contenu: string,
  role: Texte['role'],
  echelon: Echelon,
  fois: number,
  en: readonly [number, number],
  teinte: Texte['teinte'],
): Texte {
  return {
    genre: 'texte',
    contenu,
    role,
    corps: CORPS[echelon] * fois,
    en: [en[0], en[1]],
    ancrage: 'debut',
    teinte,
    ton: TON_DE_BASE,
    fond: { teinte: 'noyer', nuances: [-1, 0, 1] },
  };
}

/** Une pastille de disquaire collée sur le noyer, qui dit un mot. */
function pastille(
  cle: string,
  mot: string,
  regard: Regard,
  place: { readonly x: number; readonly y: number; readonly angle: number; readonly rayon: number; readonly auPlus: Echelon },
  mesurer: Mesure,
): Calque[] {
  const { x, y, angle, rayon, auPlus } = place;
  const d = dessinerUnePastille({
    nom: `pastille-${cle}`,
    en: surLeBois(regard, x, y),
    support: 0,
    angle,
    rayon,
    faces: { ecrite: faceEcrite(mot, 'titrage', rayon, auPlus, mesurer) },
    montre: 'ecrite',
  });
  return [d.ombre, d.pastille];
}

/**
 * La bannière : la platine de l'accueil à gauche, son disque prêt, et à sa droite le nom du jeu, ce qu'il est, et la touche
 * qui le lance. La hauteur est celle de la platine, la largeur celle d'une bannière.
 */
function banniere(textes: Textes, encrier: Encrier): ImageDePlanche {
  const B = L.banniere;
  const disque = dessinerLeDisque(disqueDeLAccueil(textes, DENSITE, encrier.largeur), DENSITE);
  const platine = dessinerLaPlatine(platineDeLAccueil(textes), DENSITE, [disque.ombre, disque.disque]);
  const emprise = empriseDe([platine], encrier.largeur);
  if (emprise === undefined) throw new Error('La platine ne dessine rien à cadrer.');
  const cadre = agrandir(emprise, B.marge);
  const largeur = cadre.largeur + B.ecart + B.largeurDuTexte + B.marge;
  const regard: Regard = { origine: [cadre.x, cadre.y], largeur, hauteur: cadre.hauteur };
  const gauche = cadre.x + cadre.largeur + B.ecart;
  const haut = cadre.y + cadre.hauteur * 0.3;
  const nom = surLeNoyer(B.nom, 'titrage', 'affiche', 2.2, [gauche, haut], 'creme');
  const accroche = surLeNoyer(B.accroche, 'techniqueFort', 'titre', 1.25, [gauche + 4, haut + 54], 'miel');
  const lignes = B.lignes.map((ligne, rang) => surLeNoyer(ligne, 'technique', 'intertitre', 1.15, [gauche + 4, haut + 104 + rang * 30], 'creme'));
  const touche = dessinerUneTouche(
    {
      nom: 'touche-vitrine',
      genre: 'principale',
      libelle: textes.touches.poserUnDisque,
      centre: surLeBois(regard, gauche - cadre.x + 150, haut - cadre.y + 214),
      support: 0,
      etat: 'repos',
    },
    DENSITE,
    encrier.largeur,
  );
  const enLigne = pastille(
    'en-ligne',
    B.enLigne,
    regard,
    { x: largeur - 70, y: 66, angle: 9, rayon: PASTILLES.message.rayon * 1.25, auPlus: 'titre' },
    encrier.largeur,
  );
  return {
    fichier: 'banniere',
    titre: B.titre,
    scene: dessinerLeMeuble({
      regard,
      densite: DENSITE,
      objets: [platine, calque('meuble-titre', [nom, accroche, ...lignes], { role: 'decor' }), touche, ...enLigne],
    }),
    regard,
  };
}

/** Un bandeau de section : une pastille qui dit la face, son nom en grand, et ce qu'elle contient. */
function bandeau(b: (typeof L.bandeaux)['faceA' | 'faceB' | 'cachee'], encrier: Encrier): ImageDePlanche {
  const { hauteur, largeur } = L.bandeaux;
  const regard: Regard = { origine: [0, 1000], largeur, hauteur };
  const [x, y] = regard.origine;
  const lettre = pastille(
    'face',
    b.lettre,
    regard,
    { x: 66, y: hauteur / 2, angle: -7, rayon: PASTILLES.message.rayon * 1.15, auPlus: 'affiche' },
    encrier.largeur,
  );
  const nom = surLeNoyer(b.nom, 'titrage', 'affiche', 1.25, [x + 128, y + hauteur / 2 + 16], 'creme');
  const largeurDuNom = encrier.largeur({ contenu: b.nom, role: 'titrage', corps: CORPS.affiche * 1.25 });
  const sous = surLeNoyer(b.sous, 'techniqueFort', 'titre', 1, [x + 128 + largeurDuNom + 24, y + hauteur / 2 + 14], 'miel');
  return {
    fichier: b.fichier,
    titre: b.titre,
    scene: dessinerLeMeuble({ regard, densite: DENSITE, objets: [...lettre, calque('meuble-bandeau', [nom, sous], { role: 'decor' })] }),
    regard,
  };
}

/** Les pochettes des joueurs, de travers sur le noyer, comme devant l'écran de l'hôte. */
function pochettesDesJoueurs(textes: Textes, encrier: Encrier): ImageDePlanche {
  const pas = 196;
  const regard: Regard = { origine: [0, 1300], largeur: L.joueurs.combien * pas + 40, hauteur: 250 };
  const angles = [-6, 4, -3, 7, -5, 5];
  const expressions = ['content', 'concentre', 'content', 'depite', 'content', 'endormi'] as const;
  const objets = pochettesDExemple(textes)
    .slice(0, L.joueurs.combien)
    .flatMap((pochette, rang) => {
      const d = dessinerLaPochette(
        pochette,
        {
          nom: `pochette-joueur-${rang + 1}`,
          centre: surLeBois(regard, 20 + pas / 2 + rang * pas, 122),
          angle: angles[rang] ?? 4,
          taille: 170,
          expression: expressions[rang] ?? 'content',
        },
        encrier.largeur,
      );
      return [d.ombre, d.pochette];
    });
  return { fichier: L.joueurs.fichier, titre: L.joueurs.titre, scene: dessinerLeMeuble({ regard, densite: DENSITE, objets }), regard };
}

/** Une pochette des coulisses, seule et en grand. */
function pochetteDesCoulisses(c: (typeof L.coulisses)[number], rang: number, encrier: Encrier): ImageDePlanche {
  const regard: Regard = { origine: [rang * 400, 1600], largeur: 340, hauteur: 340 };
  const d = dessinerLaPochette(
    c.pochette,
    { nom: `pochette-${c.fichier}`, centre: surLeBois(regard, 170, 176), angle: [-5, 4, -3][rang] ?? 4, taille: 250, expression: 'content' },
    encrier.largeur,
  );
  return {
    fichier: c.fichier,
    titre: `${c.pochette.artiste} : ${c.pochette.album}`,
    scene: dessinerLeMeuble({ regard, densite: DENSITE, objets: [d.ombre, d.pochette] }),
    regard,
  };
}

/** Les chiffres du projet, en pastilles collées de travers. */
function pastillesDesChiffres(encrier: Encrier): ImageDePlanche {
  const P = L.pastilles;
  const regard: Regard = { origine: [0, 2000], largeur: P.largeur, hauteur: P.hauteur };
  const pas = P.largeur / P.mots.length;
  const angles = [-8, 6, -4, 7, -6];
  const objets = P.mots.flatMap((mot, rang) =>
    pastille(
      `chiffre-${rang + 1}`,
      mot,
      regard,
      { x: pas / 2 + rang * pas, y: P.hauteur / 2 + (rang % 2 === 0 ? -6 : 8), angle: angles[rang] ?? 5, rayon: 62, auPlus: 'titre' },
      encrier.largeur,
    ),
  );
  return { fichier: P.fichier, titre: P.titre, scene: dessinerLeMeuble({ regard, densite: DENSITE, objets }), regard };
}

/** La touche de l'accueil, seule : dans le README, elle mène au site. */
function toucheDuSite(textes: Textes, encrier: Encrier): ImageDePlanche {
  const touche = dessinerUneTouche(
    {
      nom: 'touche-site',
      genre: 'principale',
      libelle: textes.touches.poserUnDisque,
      centre: surLeBois({ origine: [0, 2300], largeur: 380, hauteur: 120 }, 190, 56),
      support: 0,
      etat: 'repos',
    },
    DENSITE,
    encrier.largeur,
  );
  const emprise = empriseDe([touche], encrier.largeur);
  if (emprise === undefined) throw new Error('La touche ne dessine rien à cadrer.');
  const cadre = agrandir(emprise, 14);
  const regard: Regard = { origine: [cadre.x, cadre.y], largeur: cadre.largeur, hauteur: cadre.hauteur };
  return { fichier: L.touche.fichier, titre: L.touche.titre, scene: dessinerLeMeuble({ regard, densite: DENSITE, objets: [touche] }), regard };
}

/** Le logo, en face B : la fin du disque. */
function logoFaceB(textes: Textes, encrier: Encrier): ImageDePlanche {
  const regard: Regard = { origine: [0, 0], largeur: 440, hauteur: 400 };
  const versoB: Textes = { ...textes, logo: { ...textes.logo, face: L.fin.face } };
  const logo = { centre: surLeBois(regard, regard.largeur / 2, regard.hauteur / 2), rayon: 150, pans: DENSITE.pansDeDisque };
  return { fichier: L.fin.fichier, titre: L.fin.titre, scene: dessinerLeLogo(logo, versoB, encrier.largeur, DENSITE), regard };
}

/** Toutes les images de la vitrine. */
export function imagesDeLaVitrine(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  return [
    banniere(textes, encrier),
    bandeau(L.bandeaux.faceA, encrier),
    bandeau(L.bandeaux.faceB, encrier),
    bandeau(L.bandeaux.cachee, encrier),
    pochettesDesJoueurs(textes, encrier),
    ...L.coulisses.map((c, rang) => pochetteDesCoulisses(c, rang, encrier)),
    pastillesDesChiffres(encrier),
    toucheDuSite(textes, encrier),
    logoFaceB(textes, encrier),
  ];
}
