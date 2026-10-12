/**
 * La platine entière, calques écartés : chaque pièce mobile est soulevée au-dessus de sa place,
 * son ombre s'écarte d'autant, et une étiquette dit son nom, ce que devient son calque, et ce qu'il pèse.
 * C'est un document de travail de la planche de rendu, pas un écran du jeu.
 */

import { cercle, rectangle, trait } from '../lowpoly/contours';
import { surLEcran } from '../lowpoly/projection';
import { TON_DE_BASE } from '../lowpoly/tons';
import { moins, plus, tourner, type Vec2 } from '../lowpoly/vecteurs';
import type { Densite } from '../ressources/densites';
import { PLATINE } from '../ressources/platine';
import type { Textes } from '../ressources/textes';
import { CORPS, HAUTEUR_DE_CAPITALE } from '../ressources/typo';
import { aplat, calque, type Dessin, type Mesure } from '../scene/calque';
import { dessinerLeDisque } from '../scene/disque';
import { dessinerLeMeuble, type Regard } from '../scene/meuble';
import { remplir } from '../scene/phrases';
import { dessinerLaPlatine, HAUTEURS, PIVOT_DU_BRAS, surLeSocle, surLeTube, type Soulevements } from '../scene/platine';
import { inventaire, poidsTotal, type Inventaire } from '../scene/rendu/inventaire';
import type { Encrier } from '../scene/rendu/texte';
import { disqueDeLAccueil, platineDeLAccueil } from './exemples';
import type { ImageDePlanche } from './image';
import { compter, LEGENDES, type PieceLegendee } from './legendes.fr';

/** De combien chaque pièce de la platine est soulevée, en px visibles ; puis le disque au-dessus du plateau, et l'étiquette au-dessus du disque. */
const ECARTS: Soulevements = { reperes: 7, bras: 20, levier: 24, boutons: 6, interrupteurs: 10 };
const ECARTS_DU_DISQUE = { disque: 58, etiquette: 30 } as const;

/** Le cadre laisse du bois nu autour du socle : c'est là que se rangent les légendes. */
const CADRE = { largeur: 880, hauteur: 760, margeAGauche: 186, margeEnHaut: 200, bord: 16 } as const;

/**
 * Une légende : deux ou trois lignes sur un petit papier. Marges du papier, interligne, épaisseur du trait qui la relie à sa pièce,
 * rayon du point au bout du trait ; et le jour laissé entre ce point et une pièce trop menue pour qu'on le pose dessus sans la cacher.
 */
const PAPIER = { marge: 7, interligne: 4.5, trait: 1.2, point: 2.6, jour: 0.6 } as const;

interface Legende {
  readonly piece: PieceLegendee;
  /** Les calques comptés sous cette légende, et le calque de leur ombre s'ils en ont une. */
  readonly compte: (ligne: Inventaire) => boolean;
  readonly ombre?: string;
  /** Point de la pièce que la légende désigne, dans le cadre. */
  readonly vise: Vec2;
  /** Un coin haut du papier, dans le cadre, et lequel c'est : le papier s'étend de l'autre côté. */
  readonly en: Vec2;
  readonly coin: Cote;
  /** Le bord du papier d'où part le trait vers la pièce : celui qui la regarde. */
  readonly depart: Cote;
}

type Cote = 'gauche' | 'droite';

const LE_CALQUE =
  (nom: string) =>
  (ligne: Inventaire): boolean =>
    ligne.nom === nom;

/** Les lignes d'une légende : le nom de la pièce et ce que devient son calque ; ce qu'il pèse ; et ce que pèse son ombre, si elle en a une. */
function lignesDUneLegende(l: Legende, lignes: readonly Inventaire[]): string[] {
  const comptees = lignes.filter(l.compte);
  const role = comptees[0]?.role;
  if (role === undefined || role === null) throw new Error(`La légende « ${l.piece} » ne désigne aucun calque à rôle.`);
  const poids = poidsTotal(comptees);
  const ombres = lignes.filter((ligne) => ligne.nom === l.ombre);
  return [
    remplir(LEGENDES.pieceEtTraitement, { piece: LEGENDES.pieces[l.piece], traitement: LEGENDES.traitements[role] }),
    remplir(poids.lettres > 0 ? LEGENDES.pesee.avecLettres : LEGENDES.pesee.sansLettres, {
      polygones: compter(poids.polygones, LEGENDES.polygones),
      lettres: compter(poids.lettres, LEGENDES.lettres),
    }),
    ...(ombres.length > 0 ? [remplir(LEGENDES.ombre, { polygones: compter(poidsTotal(ombres).polygones, LEGENDES.polygones) })] : []),
  ];
}

/** Une légende : un petit papier, ses lignes (la première en gras), et le trait qui le relie à sa pièce. */
function dessinerUneLegende(l: Legende, lignes: readonly Inventaire[], origine: Vec2, mesurer: Mesure): Dessin[] {
  const corps = CORPS.gravure;
  const textes = lignesDUneLegende(l, lignes).map((contenu, rang) => ({ contenu, role: rang === 0 ? 'techniqueFort' : 'technique', corps }) as const);

  const capitale = corps * HAUTEUR_DE_CAPITALE;
  const largeur = Math.max(...textes.map(mesurer)) + 2 * PAPIER.marge;
  const hauteur = textes.length * capitale + (textes.length - 1) * PAPIER.interligne + 2 * PAPIER.marge;
  const x = origine[0] + l.en[0] - (l.coin === 'droite' ? largeur : 0);
  const y = origine[1] + l.en[1];
  const depart: Vec2 = [l.depart === 'droite' ? x + largeur : x, y + hauteur / 2];
  const vise = plus(origine, l.vise);
  const encre = { genre: 'texte', ancrage: 'debut', teinte: 'expresso', ton: TON_DE_BASE, fond: { teinte: 'creme' } } as const;
  return [
    aplat([trait([depart, vise], PAPIER.trait), cercle(vise, PAPIER.point, 8)], 'creme'),
    aplat([rectangle(x, y, largeur, hauteur)], 'creme'),
    ...textes.map(
      (texte, rang) => ({ ...encre, ...texte, en: [x + PAPIER.marge, y + PAPIER.marge + capitale + rang * (capitale + PAPIER.interligne)] }) as const,
    ),
  ];
}

export function platineEclatee(densite: Densite, textes: Textes, encrier: Encrier): ImageDePlanche {
  const mesurer = encrier.largeur;
  const { largeur, hauteur, margeAGauche, margeEnHaut, bord } = CADRE;
  const regard: Regard = { origine: moins(surLEcran(PLATINE.position, PLATINE.socle.epaisseur), [margeAGauche, margeEnHaut]), largeur, hauteur };
  // Le disque est tenu au-dessus de l'axe, son étiquette décollée : la pointe de l'axe ne dépasse plus de rien.
  const etat = { ...platineDeLAccueil(textes), pointeDeLAxe: 0 };
  const accueil = disqueDeLAccueil(textes, densite, mesurer);
  const souleve = dessinerLeDisque(
    { ...accueil, hauteur: accueil.hauteur + ECARTS_DU_DISQUE.disque, etiquetteDecollee: ECARTS_DU_DISQUE.etiquette },
    densite,
  );
  const meuble = dessinerLeMeuble({ regard, densite, objets: [dessinerLaPlatine(etat, densite, [souleve.ombre, souleve.disque], ECARTS)] });

  /** Un point du meuble, à une hauteur donnée, ramené dans le cadre. */
  const dansLeCadre = (p: Vec2, h: number): Vec2 => moins(surLEcran(p, h), regard.origine);
  /** Le même, pour un point donné par rapport au coin du socle. */
  const ici = (p: readonly [number, number], h: number): Vec2 => dansLeCadre(surLeSocle(p), h);

  const { plateau, reperes, disque, bras, levier, commandes } = PLATINE;
  const { boutons, interrupteurs, bouton, interrupteur } = commandes;
  const hDisque = HAUTEURS.disque + ECARTS_DU_DISQUE.disque;
  const hBouton = HAUTEURS.socle + bouton.epaisseur + ECARTS.boutons;
  const hManette = HAUTEURS.socle + levier.embase.epaisseur + levier.manette.epaisseur + ECARTS.levier;
  const contrepoids = plus(PIVOT_DU_BRAS, tourner(surLeTube((bras.contrepoids.debut + bras.contrepoids.fin) / 2), etat.bras.angle));
  // La manette du mode, couchée vers le premier mode : en haut, vers le fond du meuble.
  const boule: Vec2 = [interrupteurs.mode.x, commandes.ligne - (interrupteur.bascule.longueur - interrupteur.bascule.boule.rayon)];
  // Ce qu'il faut d'écart pour poser le point d'une légende contre une pièce menue : contre la boule, de biais ; contre l'index, de côté.
  const contreLaBoule = (interrupteur.bascule.boule.rayon + PAPIER.point + PAPIER.jour) * Math.SQRT1_2;
  const contreLIndex = bouton.index.largeur / 2 + PAPIER.point + PAPIER.jour;
  // Les papiers de gauche sont rangés contre le bord gauche du cadre, et leur trait part vers la droite ; ceux de droite, l'inverse.
  const aGauche = { coin: 'gauche', depart: 'droite' } as const;
  const aDroite = { coin: 'droite', depart: 'gauche' } as const;
  const legendes: Legende[] = [
    {
      piece: 'etiquette',
      compte: LE_CALQUE('etiquette'),
      ombre: 'etiquette/ombre',
      // Sur le papier nu, à gauche de l'étiquette, entre le nom et la mention du bas.
      vise: ici([plateau.centre[0] - disque.etiquette * 0.8, plateau.centre[1] + disque.etiquette * 0.1], hDisque + ECARTS_DU_DISQUE.etiquette),
      ...aGauche,
      en: [bord, 262],
    },
    {
      piece: 'vinyle',
      compte: LE_CALQUE('disque/vinyle'),
      ombre: 'disque/ombre',
      vise: ici([plateau.centre[0] - disque.rayon * 0.78, plateau.centre[1] + disque.rayon * 0.34], hDisque),
      ...aGauche,
      en: [bord, 372],
    },
    {
      piece: 'reperes',
      compte: LE_CALQUE('reperes'),
      vise: ici([plateau.centre[0] - reperes.rayon * 0.9, plateau.centre[1] + reperes.rayon * 0.43], HAUTEURS.plateau + ECARTS.reperes),
      ...aGauche,
      en: [bord, 492],
    },
    {
      piece: 'decor',
      compte: (ligne) => ligne.role === 'decor',
      // Sur la laque nue du socle, entre le plateau et la plaque de marque.
      vise: ici([commandes.marque[0] + 8, commandes.marque[1] - 58], HAUTEURS.socle),
      ...aGauche,
      en: [bord, 590],
    },
    {
      piece: 'bras',
      compte: LE_CALQUE('bras'),
      ombre: 'bras/ombre',
      vise: dansLeCadre(contrepoids, HAUTEURS.bras + ECARTS.bras),
      ...aDroite,
      en: [largeur - bord, 60],
    },
    {
      piece: 'levier',
      compte: LE_CALQUE('levier'),
      ombre: 'levier/ombre',
      vise: ici([levier.position[0] + 5, levier.position[1] - 6], hManette),
      ...aDroite,
      en: [largeur - bord, 330],
    },
    {
      piece: 'interrupteur',
      compte: LE_CALQUE('interrupteur-mode'),
      ombre: 'interrupteur-mode/ombre',
      // La bascule est menue : le point se pose contre sa boule, du côté d'où vient le trait, sans la couvrir.
      vise: plus(
        dansLeCadre(surLeSocle(boule), HAUTEURS.socle + interrupteur.ecrou.epaisseur + interrupteur.bascule.hauteur + ECARTS.interrupteurs),
        [contreLaBoule, -contreLaBoule],
      ),
      ...aDroite,
      en: [largeur - bord, 480],
    },
    {
      piece: 'index',
      compte: LE_CALQUE('bouton-extrait/index'),
      // L'index du bouton « Extrait » est un trait fin : le point se pose contre lui, à mi-longueur, du côté d'où vient le trait.
      vise: ici([boutons.extrait.x - contreLIndex, commandes.ligne - (boutons.extrait.rayon * (bouton.index.de + bouton.index.a)) / 2], hBouton),
      // Rangé sous le socle, son bord droit sous le bouton « Pistes » : le trait remonte entre deux titres.
      coin: 'droite',
      depart: 'droite',
      en: [margeAGauche + boutons.extrait.x - 90, 692],
    },
    {
      piece: 'bouton',
      compte: LE_CALQUE('bouton-extrait/corps'),
      ombre: 'bouton-extrait/ombre',
      vise: ici([boutons.extrait.x + boutons.extrait.rayon * 0.72, commandes.ligne + 2], hBouton),
      coin: 'gauche',
      depart: 'gauche',
      en: [margeAGauche + boutons.extrait.x + 232, 692],
    },
  ];

  const lignes = inventaire(meuble);
  const papiers = calque(
    'legende',
    legendes.flatMap((l) => dessinerUneLegende(l, lignes, regard.origine, mesurer)),
    { role: 'decor' },
  );
  return {
    fichier: 'platine-eclatee',
    titre: LEGENDES.images.eclatee,
    scene: calque('meuble', [...meuble.contenu, papiers]),
    regard,
  };
}
