/**
 * Les objets du meuble tels que les écrans du téléphone les montrent : la platine à l'arrêt (l'accueil, le salon et son code),
 * ses commandes réglées, le décor d'une piste et son numéro, l'ampli, le bac des playlists prêtes à jouer. Ils se bâtissent
 * à partir des textes, des réglages du site et de l'état de la room. La pochette kraft du salon, avec son QR code, est à part (kraft.ts).
 */

import { AMPLI } from '../../ressources/ampli';
import { MODES_PAR_CRAN } from '../../regles/modes';
import { BAC, COULEURS_DES_THEMES, PLAYLISTS_PAR_THEME, type CleDeTheme } from '../../ressources/bac';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { REGLAGES } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import type { EtatDeLAmpli } from '../ampli';
import type { EtatDuBac, Rangee } from '../bac';
import type { Calque, Mesure } from '../calque';
import { dessinerLeDisque, type Disque } from '../disque';
import { etiquetteDuCode } from '../etiquette/code';
import { etiquetteDuLogo } from '../etiquette/logo';
import type { Etiquette } from '../etiquette/papier';
import type { DecorDeLaPiste } from '../piste/dessin';
import { CENTRE_DU_PLATEAU, dessinerLaPlatine, HAUTEURS, type EtatDeLaPlatine } from '../platine';
import { DIRECTIONS, type EtatDInterrupteur } from '../platine/interrupteur';
import { DENSITE, type Ecritoire } from './pieces';

/** Le nom gravé d'un mode, dans la langue des textes. */
function nomDuMode(textes: Textes, cle: string): string {
  const nom = textes.commandes.modes[cle];
  if (nom === undefined) throw new Error(`Le mode « ${cle} » n'a pas de nom dans les textes (${textes.langue}).`);
  return nom;
}

/**
 * La manette des modes : les quatre modes du registre gravés autour d'elle, chacun du côté où la table le range ; elle se couche
 * vers celui qui est choisi.
 */
export function manetteDuMode(textes: Textes, cran: number): EtatDInterrupteur {
  const { directions } = PLATINE.commandes.interrupteur.manette;
  if (MODES_PAR_CRAN.length !== DIRECTIONS.length) throw new Error(`La manette a quatre positions, pour ${MODES_PAR_CRAN.length} modes.`);
  const [haut = '', gauche = '', droite = '', bas = ''] = DIRECTIONS.map((position) => {
    const mode = MODES_PAR_CRAN[directions.indexOf(position)];
    return mode !== undefined ? nomDuMode(textes, mode.cle) : '';
  });
  return { titre: '', positions: [haut, gauche, droite, bas], choisie: DIRECTIONS.indexOf(directions[cran] ?? 'haut') };
}

/** La platine de l'accueil : à l'arrêt, bras posé sur son repos, levier baissé, réglages par défaut, le logo sur l'étiquette. */
export function platineDeLAccueil(textes: Textes): EtatDeLaPlatine {
  const { pistes, extrait } = REGLAGES;
  return {
    reperes: 0,
    bras: { angle: PLATINE.bras.repos, leve: 0 },
    levier: 0,
    pointeDeLAxe: PLATINE.axe.depassement,
    commandes: {
      boutons: {
        pistes: { titre: textes.commandes.pistes, crans: pistes.choix.map(String), choisi: pistes.choix.indexOf(pistes.defaut) },
        extrait: { titre: textes.commandes.extrait, crans: extrait.choix.map(String), choisi: extrait.choix.indexOf(extrait.defaut) },
      },
      // Les modes gravés autour de la manette sont ceux du registre, dans l'ordre de leurs crans.
      interrupteurs: { mode: manetteDuMode(textes, 0) },
    },
    marque: textes.logo.nom,
  };
}

/** L'étiquette du disque de la platine. */
const etiquetteDeLaPlatine = (densite: Densite): Etiquette => ({ rayon: PLATINE.disque.etiquette, pans: densite.pansDeDisque });

/** Le disque de l'accueil : posé sur le plateau, le logo sur son étiquette. */
export function disqueDeLAccueil(textes: Textes, densite: Densite, mesurer: Mesure): Disque {
  return {
    en: CENTRE_DU_PLATEAU,
    hauteur: HAUTEURS.feutrine,
    support: HAUTEURS.feutrine,
    etiquette: etiquetteDuLogo(etiquetteDeLaPlatine(densite), textes, mesurer),
  };
}

/** Ce qu'on voit sur la platine à l'arrêt : le disque du salon et son code, la manette sur un mode, les boutons réglés. */
export interface PlatineALArret {
  /** Le code de la room et combien de joueurs l'ont rejointe : ils s'écrivent sur l'étiquette du disque. Sans eux, c'est le logo. */
  readonly code?: { readonly code: string; readonly joueurs: number };
  /** Le cran du mode, vers lequel la manette se couche : par défaut, celui du premier mode. */
  readonly mode?: number;
  /** Ce que l'hôte a réglé sur les boutons « Titres » et « Secondes » ; sans eux, les réglages du site. */
  readonly reglages?: { readonly pistes: number; readonly extrait: number };
}

/** Le cran d'un bouton pour une valeur : le sien, ou celui de la valeur par défaut si elle n'est pas gravée sur le bouton. */
const cranDe = (choix: readonly number[], valeur: number, defaut: number): number =>
  choix.includes(valeur) ? choix.indexOf(valeur) : choix.indexOf(defaut);

/** La platine à l'arrêt, avec un disque sur le plateau : celui du logo, ou celui du salon qui porte le code ; son sélecteur sur un mode. */
export function platineArretee(a: Ecritoire, { code, mode = MODES_PAR_CRAN[0]?.cran ?? 0, reglages }: PlatineALArret = {}): Calque {
  const etiquette =
    code === undefined
      ? disqueDeLAccueil(a.textes, DENSITE, a.encrier.largeur).etiquette
      : etiquetteDuCode({ rayon: PLATINE.disque.etiquette, pans: DENSITE.pansDeDisque }, a.textes, code.code, code.joueurs, a.encrier.largeur);
  const disque = dessinerLeDisque({ en: CENTRE_DU_PLATEAU, hauteur: HAUTEURS.feutrine, support: HAUTEURS.feutrine, etiquette }, DENSITE);
  const platine = platineDeLAccueil(a.textes);
  const { boutons } = platine.commandes;
  const { pistes, extrait } = REGLAGES;
  const reglesSurLaPlatine =
    reglages === undefined
      ? boutons
      : {
          ...boutons,
          pistes: { ...boutons.pistes, choisi: cranDe(pistes.choix, reglages.pistes, pistes.defaut) },
          extrait: { ...boutons.extrait, choisi: cranDe(extrait.choix, reglages.extrait, extrait.defaut) },
        };
  const reglee = { ...platine, commandes: { boutons: reglesSurLaPlatine, interrupteurs: { mode: manetteDuMode(a.textes, mode) } } };
  return dessinerLaPlatine(reglee, DENSITE, [disque.ombre, disque.disque]);
}

/** Le décor d'une piste : la platine de l'accueil, la manette sur le mode, et le numéro de la piste, sur combien. */
export function decorDeLaPiste(textes: Textes, cran: number, piste: DecorDeLaPiste['piste']): DecorDeLaPiste {
  const { commandes, marque } = platineDeLAccueil(textes);
  return { piste, commandes: { ...commandes, interrupteurs: { mode: manetteDuMode(textes, cran) } }, marque };
}

/**
 * L'ampli du salon : éteint, aiguilles au repos ; ou allumé, les aiguilles qui dansent à mi-course, le volume aux deux tiers.
 * Ce qui est gravé dessus vient des textes, et sa plaque porte le nom du site, comme la platine.
 */
export function ampliDuSalon(
  textes: Textes,
  allume: boolean,
  aiguilles: readonly [number, number] = allume ? [0.58, 0.5] : [0, 0],
  echelles: readonly [readonly string[], readonly string[]] = echellesDeLAmpli(),
): EtatDeLAmpli {
  return { allume, aiguilles, echelles, volume: 12, inscriptions: { ...textes.ampli, marque: textes.logo.nom } };
}

/**
 * Les nombres des cadrans de l'ampli, pour une face de tant de titres et des extraits de tant de secondes : de zéro au bout, de
 * pas en pas (un extrait court, de cinq en cinq).
 */
export function echellesDeLAmpli(
  titres: number = AMPLI.cadrans.titres.auPlus,
  secondes: number = AMPLI.cadrans.secondes.auPlus,
): [string[], string[]] {
  const C = AMPLI.cadrans;
  const deZeroA = (fin: number, pas: number): string[] => Array.from({ length: Math.floor(fin / pas) + 1 }, (_, k) => String(k * pas));
  return [deZeroA(titres, C.titres.pas), deZeroA(secondes, secondes > C.secondes.pas ? C.secondes.pas : C.secondes.pasCourt)];
}

/**
 * Le bac des playlists « Prêtes à jouer », rangées derrière l'intercalaire de leur thème, de l'avant vers le fond. Chacune n'est ici
 * qu'une vignette : sa couleur, jamais celle de l'intercalaire qui la précède.
 */
export function bacDesPlaylistsPretes(textes: Textes, sortie?: { readonly theme: string; readonly leve: number }, choisi?: string): EtatDuBac {
  let rang = 0;
  const rangees = (Object.keys(PLAYLISTS_PAR_THEME) as CleDeTheme[]).flatMap((cle): Rangee[] => {
    const titre = textes.bac.themes[cle];
    if (titre === undefined) throw new Error(`Le thème « ${cle} » n'a pas de titre dans les textes (${textes.langue}).`);
    const teinte = COULEURS_DES_THEMES[cle];
    // Derrière chaque intercalaire, les disques de ses playlists, vus par la tranche : les pochettes, elles, sont les joueurs.
    const playlists = Array.from({ length: PLAYLISTS_PAR_THEME[cle] }, (_, n): Rangee => {
      // La première playlist du thème qu'on a touché sort du bac.
      const leve = sortie?.theme === cle && n === 0 ? { leve: sortie.leve } : {};
      return { genre: 'pochette', cle: `playlist-${++rang}`, teinte: 'vinyle', ...leve };
    });
    // L'intercalaire du thème choisi sort du bac.
    return [{ genre: 'intercalaire', cle, titre, teinte, ...(choisi === cle ? { leve: BAC.intercalaire.choisi } : {}) }, ...playlists];
  });
  return { rangees };
}
