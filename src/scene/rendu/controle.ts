/**
 * Les contrôles du rendu : ce qu'on vérifie avant de montrer une scène.
 * Facettes voisines qui claquent, pointes en lame, ombres qui ne partent pas vers le bas à droite,
 * texte trop petit ou trop peu contrasté, calques trop lourds ou sans rôle. Chaque défaut trouvé est un constat ;
 * et ce qui a été mesuré pour en juger est rendu avec eux.
 *
 * Ce que ces contrôles ne voient pas : deux formes de calques différents qui se touchent, et l'allure générale.
 * Pour cela, il faut regarder le rendu.
 */

import { contraste } from '../../lowpoly/couleur';
import type { FacettePeinte } from '../../lowpoly/facette';
import { tonAPlat } from '../../lowpoly/ombrage';
import { aireSignee, plusPetitAngle, type Polygone } from '../../lowpoly/polygones';
import { surLEcran } from '../../lowpoly/projection';
import { couleur } from '../../lowpoly/tons';
import { plus, type Vec2 } from '../../lowpoly/vecteurs';
import { CONTRASTES, CORPS_LISIBLE } from '../../ressources/typo';
import type { Calque, Dessin } from '../calque';
import { estUnPalier } from '../ombre';
import { inventaire } from './inventaire';

export interface Constat {
  readonly regle: 'voisines' | 'pointe' | 'ombre' | 'texte' | 'contraste' | 'poids' | 'role';
  readonly calque: string;
  readonly detail: string;
}

/** Les limites que le rendu doit tenir. */
export const LIMITES = {
  /** Écart de ton maximal entre deux facettes voisines d'une même teinte. */
  ecartDeTon: 2,
  /**
   * Le contraste (rapport WCAG) que deux facettes voisines d'une même teinte n'atteignent jamais : avec cette palette, deux tons d'écart
   * restent juste en dessous. Le contrôle le mesure sans en faire un constat : c'est la palette qui le tient, et un test qui le vérifie
   * sur chaque teinte comme sur chaque image.
   */
  contrasteDeVoisines: 1.45,
  /** Plus petit angle admis dans un polygone, en degrés : en dessous, c'est une lame. */
  angle: 20,
  /** Un polygone plus petit que ça (en px²) ne se voit pas : on ne lui reproche pas ses angles. */
  aireVisible: 3,
  /** Plus petite hauteur de corps lisible, en px tels qu'on les voit. */
  corps: CORPS_LISIBLE,
  /** Polygones du décor d'une scène : 2 500 au plus. */
  decor: 2500,
  /** Ce que pèse un calque mobile, polygones et lettres ensemble : toujours moins que ça. */
  mobile: 150,
} as const;

const cle = (x: number, y: number): string => `${Math.round(x * 20)},${Math.round(y * 20)}`;
const cleDArete = (p: readonly [number, number], q: readonly [number, number]): string => {
  const a = cle(p[0], p[1]);
  const b = cle(q[0], q[1]);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
};

/** Paires de facettes qui partagent une arête, dans une même peinture. */
function voisines(facettes: readonly FacettePeinte[]): [FacettePeinte, FacettePeinte][] {
  const parArete = new Map<string, FacettePeinte[]>();
  for (const f of facettes) {
    f.contour.forEach((p, i) => {
      const q = f.contour[(i + 1) % f.contour.length];
      if (q === undefined) return;
      const k = cleDArete(p, q);
      const liste = parArete.get(k) ?? [];
      liste.push(f);
      parArete.set(k, liste);
    });
  }
  const paires: [FacettePeinte, FacettePeinte][] = [];
  for (const liste of parArete.values()) {
    const [a, b] = liste;
    if (liste.length === 2 && a !== undefined && b !== undefined) paires.push([a, b]);
  }
  return paires;
}

const seVoit = (contour: Polygone): boolean => Math.abs(aireSignee(contour)) > LIMITES.aireVisible;

const versLeBasADroite = (de: Vec2): boolean => de[0] > 0 && de[1] > 0;
/** Vrai pour un retrait : rien, ou vers le haut à gauche, à un arrondi près. */
const enDeca = (de: Vec2): boolean => de[0] <= 1e-9 && de[1] <= 1e-9;

/** Ce que les contrôles ont trouvé à redire, et ce qu'ils ont mesuré pour en juger. */
export interface Controle {
  readonly constats: Constat[];
  /** Nombre de paires de facettes voisines de même teinte, par écart de ton (0, 1, 2…). */
  readonly ecartsDeTon: number[];
  /** Le plus fort contraste (rapport WCAG) entre deux facettes voisines de même teinte. */
  readonly plusFortContraste: number;
  /** Hauteur, telle qu'on la voit, du plus petit texte de la scène. */
  readonly plusPetitCorps: number;
  readonly polygonesDuDecor: number;
  /** Le calque mobile qui pèse le plus, et son poids : ses polygones plus ses lettres. */
  readonly plusLourdCalqueMobile: { nom: string; poids: number };
}

export function controler(racine: Calque): Controle {
  const constats: Constat[] = [];
  const ecartsDeTon = [0, 0, 0, 0, 0];
  let plusFortContraste = 1;
  let plusPetitCorps = Infinity;

  /**
   * @param ecrase vrai sous un calque couché sur le meuble : ce qu'il contient est vu écrasé.
   * @param cache vrai dans un calque caché : ce qu'il contient reste jugé, puisqu'on le montrera, sauf la portée d'une ombre,
   * qui dépend de la hauteur de sa pièce à l'instant où on la voit.
   */
  const visiter = (dessin: Dessin, chemin: string, ecrase: boolean, cache: boolean): void => {
    switch (dessin.genre) {
      case 'peinture':
        for (const [a, b] of voisines(dessin.facettes)) {
          if (a.teinte !== b.teinte) continue;
          const ecart = Math.abs(a.ton - b.ton);
          ecartsDeTon[ecart] = (ecartsDeTon[ecart] ?? 0) + 1;
          plusFortContraste = Math.max(plusFortContraste, contraste(couleur(a.teinte, a.ton), couleur(b.teinte, b.ton)));
          if (ecart > LIMITES.ecartDeTon)
            constats.push({ regle: 'voisines', calque: chemin, detail: `${a.teinte} : tons ${a.ton} et ${b.ton} côte à côte` });
        }
        for (const f of dessin.facettes) {
          // Une facette se juge telle qu'elle est modelée : vue de biais, une face droite paraît toujours étroite.
          if (f.angle < LIMITES.angle && seVoit(f.contour))
            constats.push({ regle: 'pointe', calque: chemin, detail: `${f.teinte} : angle de ${f.angle.toFixed(1)}°` });
        }
        break;
      case 'aplat':
        for (const contour of dessin.contours) {
          const angle = plusPetitAngle(contour);
          if (angle < LIMITES.angle && seVoit(contour))
            constats.push({ regle: 'pointe', calque: chemin, detail: `${dessin.teinte} : angle de ${angle.toFixed(1)}°` });
        }
        break;
      case 'texte': {
        const vu = ecrase ? surLEcran([0, dessin.corps])[1] : dessin.corps;
        plusPetitCorps = Math.min(plusPetitCorps, vu);
        if (vu < LIMITES.corps)
          constats.push({ regle: 'texte', calque: chemin, detail: `« ${dessin.contenu} » : ${vu.toFixed(1)} px de haut à l'écran` });
        // Le contraste de l'encre sur chaque nuance que son fond prend sous elle.
        const seuil = vu >= CONTRASTES.grandCorps ? CONTRASTES.grandTexte : CONTRASTES.texte;
        const tonsDuFond = dessin.fond.ton !== undefined ? [dessin.fond.ton] : (dessin.fond.nuances ?? [0]).map((nuance) => tonAPlat(nuance));
        for (const ton of tonsDuFond) {
          const rapport = contraste(couleur(dessin.teinte, dessin.ton), couleur(dessin.fond.teinte, ton));
          if (rapport < seuil) {
            const detail = `« ${dessin.contenu} » : ${dessin.teinte} sur ${dessin.fond.teinte}, ${rapport.toFixed(2)} pour ${seuil}`;
            constats.push({ regle: 'contraste', calque: chemin, detail });
          }
        }
        break;
      }
      case 'calque': {
        // Une ombre part toujours vers le bas à droite : le calque qui porte ses paliers est posé où est sa pièce, puis finit
        // par sa portée, un glissement dans ce sens ; et chaque palier reste entre sa pièce et cette portée, sans repasser sous la pièce.
        const invisible = cache || (dessin.opacite ?? 1) <= 0;
        const paliers = dessin.contenu.filter((d): d is Calque => d.genre === 'calque' && estUnPalier(d.nom));
        if (paliers.length > 0 && !invisible) {
          const transformations = dessin.transformations ?? [];
          const portee = transformations[transformations.length - 1];
          if (transformations.length < 2 || portee === undefined || portee.genre !== 'glisser' || !versLeBasADroite(portee.de)) {
            constats.push({ regle: 'ombre', calque: dessin.nom, detail: 'ombre qui ne part pas vers le bas à droite' });
          } else {
            for (const palier of paliers) {
              const retrait = (palier.transformations ?? []).find((t) => t.genre === 'glisser');
              const tient =
                retrait !== undefined && retrait.genre === 'glisser' && enDeca(retrait.de) && versLeBasADroite(plus(portee.de, retrait.de));
              if (!tient)
                constats.push({ regle: 'ombre', calque: palier.nom, detail: 'palier qui ne reste pas entre sa pièce et la portée de son ombre' });
            }
          }
        }
        const couche = ecrase || (dessin.transformations ?? []).some((t) => t.genre === 'ecraser');
        for (const d of dessin.contenu) visiter(d, dessin.nom, couche, invisible);
        break;
      }
    }
  };
  visiter(racine, racine.nom, false, false);

  const lignes = inventaire(racine);
  const polygonesDuDecor = lignes.filter((l) => l.role === 'decor').reduce((s, l) => s + l.polygones, 0);
  if (polygonesDuDecor > LIMITES.decor) constats.push({ regle: 'poids', calque: 'decor', detail: `${polygonesDuDecor} polygones` });
  let plusLourd = { nom: '', poids: 0 };
  for (const ligne of lignes) {
    if (ligne.role === null)
      constats.push({ regle: 'role', calque: ligne.nom, detail: `${ligne.polygones} polygones et ${ligne.lettres} lettres sans rôle` });
    if (ligne.role !== 'mobile') continue;
    // Une lettre est un contour comme un autre : elle pèse dans le calque qui la fait bouger.
    const poids = ligne.polygones + ligne.lettres;
    if (poids > plusLourd.poids) plusLourd = { nom: ligne.nom, poids };
    if (poids >= LIMITES.mobile)
      constats.push({ regle: 'poids', calque: ligne.nom, detail: `${ligne.polygones} polygones et ${ligne.lettres} lettres` });
  }
  return { constats, ecartsDeTon, plusFortContraste, plusPetitCorps, polygonesDuDecor, plusLourdCalqueMobile: plusLourd };
}
