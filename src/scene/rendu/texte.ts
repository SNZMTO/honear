/**
 * Le tracé des textes : chaque lettre devient un contour, posé à plat dans le plan de son calque.
 * C'est ce qui permet de figer une étiquette ou une pochette en image sans dépendre d'une police chargée par la page.
 * Ce module ne lit aucun fichier : on lui donne les polices déjà lues.
 */

import opentype from 'opentype.js';
import { radians, type Vec2 } from '../../lowpoly/vecteurs';
import { APPROCHES, SIGNE_DE_REPLI, type Caractere, type PaireDeCaracteres, type RoleDeTexte } from '../../ressources/typo';
import type { Mesure, Texte } from '../calque';
import { INSECABLE, neSeCoupePas } from '../typographie';
import { nombre } from './nombre';

interface Police {
  readonly fonte: opentype.Font;
  /** Chiffres tabulaires : glyphe proportionnel → glyphe de largeur fixe, quand la police les propose à part. */
  readonly tabulaires: ReadonlyMap<number, number>;
}

function charger(caractere: Caractere, lire: (fichier: string) => ArrayBuffer): Police {
  const fonte = opentype.parse(lire(caractere.trace));
  const tabulaires = new Map<number, number>();
  // Les définitions de types d'opentype.js ne décrivent pas cette lecture des substitutions.
  const substitutions = fonte.substitution as unknown as { getSingle(variante: string): { sub: number; by: number }[] | undefined };
  // Une police sans variante tabulaire à part n'en renvoie aucune : ses chiffres sont alors pris tels quels.
  for (const { sub, by } of substitutions.getSingle('tnum') ?? []) tabulaires.set(sub, by);
  return { fonte, tabulaires };
}

/** Ce qu'un texte venu d'ailleurs peut porter sans que rien s'en dessine, les symboles (un soleil, un cœur en image), et les espaces de toutes sortes. */
const SANS_DESSIN = /[\p{Cf}\p{M}]/u;
const SYMBOLE = /\p{So}/u;
const ESPACE = /\s/u;

interface Lettre {
  readonly glyphe: opentype.Glyph;
  /** Position du début de la lettre sur la ligne de base, en px. */
  readonly depart: number;
  readonly chasse: number;
}

const CHIFFRE = /^\d$/;

export interface Encrier {
  /** Tracé SVG du texte, dans le repère de son calque. */
  tracer(texte: Texte): string;
  /** Largeur du texte sur sa ligne de base, en px. */
  readonly largeur: Mesure;
  /**
   * Le même texte, qu'on peut écrire dans n'importe lequel des caractères du site : un signe qu'ils n'ont pas tous est remplacé
   * par sa lettre sans accent s'ils l'ont, sinon par le signe de repli. C'est pour un texte venu d'ailleurs que du fichier de textes,
   * un titre ou un nom d'artiste : celui-là, on ne peut pas le corriger, et il ne doit pas arrêter le dessin.
   */
  ecrivable(texte: string): string;
}

/**
 * @param lire rend le contenu d'un fichier de police, par son nom.
 * @param langue code de la langue des textes : c'est elle qui sait les mettre en capitales.
 * @param indulgent vrai dans une page qu'on joue : un signe qu'une police n'a pas y est remplacé comme le fait `ecrivable`, au lieu
 * d'arrêter le dessin. Ailleurs (les planches, les tests), un signe manquant arrête tout : c'est une faute dans le fichier de textes.
 */
export function encrier(paire: PaireDeCaracteres, lire: (fichier: string) => ArrayBuffer, langue: string, indulgent = false): Encrier {
  const polices: Record<RoleDeTexte, Police> = {
    titrage: charger(paire.titrage, lire),
    technique: charger(paire.technique, lire),
    techniqueFort: charger(paire.techniqueFort, lire),
  };

  function composer(texte: Pick<Texte, 'contenu' | 'role' | 'corps'>): { lettres: Lettre[]; largeur: number } {
    const police = polices[texte.role];
    const technique = texte.role !== 'titrage';
    // Le caractère technique s'écrit tout en capitales, comme une inscription gravée.
    const tel = technique ? texte.contenu.toLocaleUpperCase(langue) : texte.contenu;
    const contenu = indulgent ? [...tel].map((s) => (police.fonte.charToGlyph(s).index === 0 ? unSigne(s) : s)).join('') : tel;
    const echelle = texte.corps / police.fonte.unitsPerEm;
    const approche = APPROCHES[texte.role] * texte.corps;
    const lettres: Lettre[] = [];
    let x = 0;
    let precedent: { glyphe: opentype.Glyph; chiffre: boolean } | undefined;
    for (const signe of contenu) {
      const chiffre = CHIFFRE.test(signe);
      let glyphe = police.fonte.charToGlyph(signe);
      // Le glyphe de rang 0 est le rectangle vide qu'une police met à la place d'un signe qu'elle n'a pas.
      if (glyphe.index === 0) throw new Error(`Le caractère ${paire[texte.role].famille} n'a pas le signe « ${signe} » de « ${texte.contenu} ».`);
      const tabulaire = technique ? police.tabulaires.get(glyphe.index) : undefined;
      if (tabulaire !== undefined) glyphe = police.fonte.glyphs.get(tabulaire);
      // Entre deux chiffres, aucun crénage : ils doivent tomber en colonnes, quel que soit le nombre.
      if (precedent !== undefined && !(technique && chiffre && precedent.chiffre))
        x += police.fonte.getKerningValue(precedent.glyphe, glyphe) * echelle;
      const chasse = (glyphe.advanceWidth ?? 0) * echelle;
      lettres.push({ glyphe, depart: x, chasse });
      x += chasse + approche;
      precedent = { glyphe, chiffre };
    }
    return { lettres, largeur: Math.max(0, x - approche) };
  }

  /** Écrit le contour d'une lettre après l'avoir tournée autour de son origine puis déplacée. */
  function contour(glyphe: opentype.Glyph, corps: number, decalage: number, angle: number, en: Vec2): string {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const pose = (x: number, y: number): string => {
      const lx = x + decalage;
      return `${nombre(en[0] + lx * c - y * s)} ${nombre(en[1] + lx * s + y * c)}`;
    };
    let trace = '';
    for (const commande of glyphe.getPath(0, 0, corps).commands) {
      switch (commande.type) {
        case 'M':
          trace += `M${pose(commande.x, commande.y)}`;
          break;
        case 'L':
          trace += `L${pose(commande.x, commande.y)}`;
          break;
        case 'C':
          trace += `C${pose(commande.x1, commande.y1)} ${pose(commande.x2, commande.y2)} ${pose(commande.x, commande.y)}`;
          break;
        case 'Q':
          trace += `Q${pose(commande.x1, commande.y1)} ${pose(commande.x, commande.y)}`;
          break;
        case 'Z':
          trace += 'Z';
          break;
      }
    }
    return trace;
  }

  function tracer(texte: Texte): string {
    const { lettres, largeur } = composer(texte);
    let trace = '';
    if (texte.arc !== undefined) {
      const { centre, rayon, milieu, lecture } = texte.arc;
      const sens = lecture === 'dessus' ? 1 : -1;
      for (const lettre of lettres) {
        // Chaque lettre est posée par son milieu sur le cercle, puis tournée pour suivre l'arc.
        const abscisse = lettre.depart + lettre.chasse / 2 - largeur / 2;
        const angle = radians(milieu) + (sens * abscisse) / rayon;
        const pied: Vec2 = [centre[0] + rayon * Math.cos(angle), centre[1] + rayon * Math.sin(angle)];
        trace += contour(lettre.glyphe, texte.corps, -lettre.chasse / 2, angle + (sens * Math.PI) / 2, pied);
      }
      return trace;
    }
    const depart = texte.ancrage === 'milieu' ? -largeur / 2 : texte.ancrage === 'fin' ? -largeur : 0;
    for (const lettre of lettres) trace += contour(lettre.glyphe, texte.corps, depart + lettre.depart, 0, texte.en);
    return trace;
  }

  /** Vrai si tous les caractères ont ce signe, tel quel et en capitales : le technique s'écrit en capitales. */
  const sait = (signe: string): boolean =>
    Object.values(polices).every((police) => [...signe, ...signe.toLocaleUpperCase(langue)].every((s) => police.fonte.charToGlyph(s).index !== 0));
  /** Un signe, tel qu'on peut l'écrire : lui-même, sa lettre sans accent, une espace ordinaire, rien, ou le signe de repli. */
  function unSigne(signe: string): string {
    if (sait(signe)) return signe;
    // Un signe qui ne se voit pas (une marque de sens d'écriture, un sélecteur de variante, un accent seul) ne laisse rien ;
    // une espace que les caractères n'ont pas (fine, tabulation, saut de ligne) devient une espace ordinaire, ou l'insécable
    // si elle ne se coupait pas (l'insécable étroite) : ce qu'elle tenait ensemble le reste.
    // Un symbole qu'elles n'ont pas (une image, un dessin) s'efface : un point d'interrogation à sa place se lirait comme une question.
    if (SANS_DESSIN.test(signe) || SYMBOLE.test(signe)) return '';
    if (ESPACE.test(signe)) return neSeCoupePas(signe) && sait(INSECABLE) ? INSECABLE : ' ';
    // Une lettre accentuée se défait en sa lettre, suivie de ses accents : on garde la lettre.
    const [nue] = [...signe.normalize('NFD')];
    return nue !== undefined && nue !== signe && sait(nue) ? nue : SIGNE_DE_REPLI;
  }
  function ecrivable(texte: string): string {
    return (
      [...texte]
        .map(unSigne)
        .join('')
        // Ce qui s'est effacé ne laisse pas deux espaces de suite, ni une espace au bout.
        .replace(/ {2,}/g, ' ')
        .trim()
    );
  }

  return { tracer, largeur: (texte) => composer(texte).largeur, ecrivable };
}
