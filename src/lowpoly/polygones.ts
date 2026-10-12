/**
 * Les polygones à plat : les mesurer, les orienter, les rentrer, les découper, les poser.
 * Un polygone tracé avec une aire signée positive dans le plan (x, y) regarde vers le haut.
 */

import { auRang } from './boucle';
import { degres, distance, fois, moins, plus, scalaire, tourner, unitaire, type Vec2 } from './vecteurs';

export type Polygone = readonly Vec2[];

/** Aire signée (formule du lacet). Positive : le polygone tourne dans le sens horaire à l'écran. */
export function aireSignee(p: Polygone): number {
  let somme = 0;
  for (let i = 0; i < p.length; i++) {
    const u = auRang(p, i);
    const v = auRang(p, i + 1);
    somme += u[0] * v[1] - v[0] * u[1];
  }
  return somme / 2;
}

/** Remet un polygone dans le sens positif (celui de toutes les facettes dessinées). */
export function orienter(p: Polygone): Vec2[] {
  return aireSignee(p) < 0 ? [...p].reverse() : [...p];
}

/** Angles intérieurs d'un polygone, en degrés. Sert à traquer les pointes en lame. */
export function anglesInterieurs(p: Polygone): number[] {
  const sens = Math.sign(aireSignee(p)) || 1;
  return p.map((s, i) => {
    const avant = moins(auRang(p, i - 1), s);
    const apres = moins(auRang(p, i + 1), s);
    const croix = (avant[0] * apres[1] - avant[1] * apres[0]) * sens;
    const angle = degres(Math.atan2(Math.abs(croix), scalaire(avant, apres)));
    return croix > 0 ? 360 - angle : angle;
  });
}

/** Plus petit angle d'un polygone, en degrés : sous une vingtaine de degrés, c'est une lame. */
export const plusPetitAngle = (p: Polygone): number => Math.min(...anglesInterieurs(p));

/** Retire les sommets confondus avec leur voisin : ils feraient des arêtes de longueur nulle. */
export function sansDoublons(p: Polygone): Vec2[] {
  return p.filter((s, i) => distance(s, auRang(p, i - 1)) > 1e-6);
}

/** Rentre un polygone convexe vers l'intérieur d'une distance donnée, sommet par sommet. */
export function rentrer(p: Polygone, retrait: number): Vec2[] {
  const sens = Math.sign(aireSignee(p)) || 1;
  return p.map((s, i) => {
    const avant = unitaire(moins(s, auRang(p, i - 1)));
    const apres = unitaire(moins(auRang(p, i + 1), s));
    // Normales rentrantes des deux arêtes voisines.
    const n1: Vec2 = [-avant[1] * sens, avant[0] * sens];
    const n2: Vec2 = [-apres[1] * sens, apres[0] * sens];
    const bissectrice = unitaire(plus(n1, n2));
    const cosDemi = Math.max(0.35, scalaire(bissectrice, n1));
    return plus(s, fois(bissectrice, retrait / cosDemi));
  });
}

/** Découpe un polygone par une fenêtre convexe (Sutherland-Hodgman). Rend [] s'il ne reste rien. */
export function decouper(sujet: Polygone, fenetre: Polygone): Vec2[] {
  const sens = Math.sign(aireSignee(fenetre)) || 1;
  let sortie: Vec2[] = [...sujet];
  for (let i = 0; i < fenetre.length && sortie.length > 0; i++) {
    const c1 = auRang(fenetre, i);
    const c2 = auRang(fenetre, i + 1);
    const dedans = (p: Vec2): boolean => ((c2[0] - c1[0]) * (p[1] - c1[1]) - (c2[1] - c1[1]) * (p[0] - c1[0])) * sens >= -1e-9;
    const croisement = (p: Vec2, q: Vec2): Vec2 => {
      const d1 = moins(c2, c1);
      const d2 = moins(q, p);
      const denominateur = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(denominateur) < 1e-12) return q;
      const t = ((p[0] - c1[0]) * d1[1] - (p[1] - c1[1]) * d1[0]) / denominateur;
      return [p[0] + d2[0] * t, p[1] + d2[1] * t];
    };
    const entree = sortie;
    sortie = [];
    for (let j = 0; j < entree.length; j++) {
      const courant = auRang(entree, j);
      const precedent = auRang(entree, j - 1);
      if (dedans(courant)) {
        if (!dedans(precedent)) sortie.push(croisement(precedent, courant));
        sortie.push(courant);
      } else if (dedans(precedent)) {
        sortie.push(croisement(precedent, courant));
      }
    }
  }
  // Une découpe peut poser deux sommets au même endroit : on n'en garde qu'un.
  const propre = sansDoublons(sortie);
  return Math.abs(aireSignee(propre)) < 1e-6 ? [] : propre;
}

/** Déplace, tourne et agrandit un polygone autour de l'origine (dans cet ordre : échelle, rotation, déplacement). */
export function placer(p: Polygone, pose: { en?: Vec2; angle?: number; echelle?: number | Vec2 }): Vec2[] {
  const e = pose.echelle ?? 1;
  const [ex, ey] = typeof e === 'number' ? [e, e] : e;
  const en = pose.en ?? [0, 0];
  return p.map((s) => plus(tourner([s[0] * ex, s[1] * ey], pose.angle ?? 0), en));
}

/**
 * Le plus petit polygone convexe qui contient des points (chaîne monotone d'Andrew), dans le sens de toutes les facettes dessinées.
 * C'est la trace d'une forme convexe qu'on fait glisser : on lui donne ses sommets au départ et à l'arrivée.
 */
export function enveloppeConvexe(points: Polygone): Vec2[] {
  const tries = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (tries.length < 3) return tries;
  const tourne = (o: Vec2, a: Vec2, b: Vec2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chaine = (suite: readonly Vec2[]): Vec2[] => {
    const garde: Vec2[] = [];
    for (const point of suite) {
      while (garde.length >= 2 && tourne(auRang(garde, -2), auRang(garde, -1), point) <= 1e-9) garde.pop();
      garde.push(point);
    }
    garde.pop();
    return garde;
  };
  return orienter(sansDoublons([...chaine(tries), ...chaine([...tries].reverse())]));
}
