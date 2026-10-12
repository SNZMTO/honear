/**
 * Le papier : une étiquette posée sur le bois, un peu de travers, et ce qu'on y écrit. C'est l'étiquette vierge où l'on tape
 * (un pseudo, un code, une réponse, un lien de playlist), l'étiquette qu'on touche en mode 4 choix, et le bout de papier qui dit
 * ce qui se passe quand c'est trop long pour une pastille (« Connais pas ce disque. Vérifie le code. »).
 * Le texte est écrit à plat, droit : le papier n'est penché que d'un ou deux degrés.
 * Le papier est taillé à son texte : sa hauteur à ses lignes, sa largeur à la plus longue (et au curseur), jusqu'à sa largeur
 * au plus, où le texte passe à la ligne. Celui où l'on tape s'allonge vers la droite à mesure qu'on tape ; celui qu'on lit garde son milieu.
 */

import type { NomDeCalque } from '../lexique';
import { rectangleArrondi, trait } from '../lowpoly/contours';
import { placer } from '../lowpoly/polygones';
import { TON_DE_BASE } from '../lowpoly/tons';
import type { Vec2 } from '../lowpoly/vecteurs';
import type { NomDeTeinte } from '../ressources/palette';
import { PAPIER } from '../ressources/tablee';
import { HAUTEUR_DE_CAPITALE, type Echelon, type RoleDeTexte } from '../ressources/typo';
import { aplat, aPlatSurLeMeuble, calque, type Calque, type Dessin, type Mesure, type RoleDeCalque, type Texte } from './calque';
import { encreLisibleSur } from './encre';
import { ombreAuPied } from './ombre';
import { mettreEnLignes } from './texte';

export interface LigneDePapier {
  readonly contenu: string;
  readonly role: RoleDeTexte;
  readonly auPlus: Echelon;
}

export interface Papier {
  readonly nom: NomDeCalque;
  /** Son centre sur le meuble s'il avait toute sa largeur, sa largeur au plus, et son angle en degrés. */
  readonly centre: Vec2;
  readonly largeur: number;
  readonly angle: number;
  /** Sa largeur au moins : la place des pastilles qu'on y colle, ou une colonne d'étiquettes toutes pareilles. */
  readonly auMoins?: number;
  /** Ce qui reste en place quand il se taille à son texte : son bord gauche (par défaut, pour ce qu'on aligne au début), ou son milieu. */
  readonly ancre?: 'debut' | 'milieu';
  /** Ce qu'on y lit, de haut en bas ; une ligne trop longue passe à la ligne suivante, deux fois au plus. */
  readonly lignes: readonly LigneDePapier[];
  /** Le texte, aligné à gauche (ce qu'on tape) ou centré (ce qu'on lit). */
  readonly alignement: 'debut' | 'milieu';
  /**
   * Vrai pour l'étiquette où l'on tape : le curseur clignote au bout de la dernière ligne (« debut » : devant elle, quand elle ne
   * dit que ce qu'on peut taper). Il a son calque, « …/curseur », que l'écran fait clignoter.
   */
  readonly curseur?: boolean | 'debut';
  readonly teinte?: NomDeTeinte;
  /** Décor par défaut ; mobile pour une étiquette qu'on touche, et qui s'enfonce. */
  readonly role?: RoleDeCalque;
}

export interface PapierDessine {
  readonly ombre: Calque;
  readonly papier: Calque;
  /** Le haut du papier, sur le meuble : c'est là qu'on colle une pastille. Son milieu et sa largeur, une fois taillé. */
  readonly haut: number;
  readonly milieu: Vec2;
  readonly largeur: number;
}

export function dessinerUnPapier(p: Papier, mesurer: Mesure): PapierDessine {
  const teinte = p.teinte ?? 'creme';
  const encre = encreLisibleSur(teinte);
  const utile = p.largeur - 2 * PAPIER.marge;
  const blocs = p.lignes.map((l) => ({
    l,
    ...mettreEnLignes(mesurer, { contenu: l.contenu, role: l.role }, utile, l.auPlus, 1, PAPIER.lignesAuPlus),
  }));
  const hauteurDesLignes = blocs.reduce(
    (somme, b, rang) =>
      somme + b.lignes.length * b.corps * HAUTEUR_DE_CAPITALE + (b.lignes.length - 1) * b.corps * PAPIER.interligne + (rang > 0 ? PAPIER.entre : 0),
    0,
  );
  const hauteur = hauteurDesLignes + 2 * PAPIER.marge;
  // Taillé à son texte : la plus longue ligne, le curseur au bout de la dernière s'il y en a un.
  const largeurs = blocs.map((b) => b.lignes.map((contenu) => mesurer({ contenu, role: b.l.role, corps: b.corps })));
  const toutes = largeurs.flat();
  const derniere = toutes[toutes.length - 1] ?? 0;
  const auCurseur = p.curseur === true ? derniere + PAPIER.avantLeCurseur + PAPIER.epaisseurDuCurseur : 0;
  const texte = Math.max(auCurseur, ...toutes);
  const largeur = Math.min(p.largeur, Math.max(p.auMoins ?? 0, texte + 2 * PAPIER.marge));
  const ancre = p.ancre ?? (p.alignement === 'debut' ? 'debut' : 'milieu');
  const cx = ancre === 'debut' ? p.centre[0] - p.largeur / 2 + largeur / 2 : p.centre[0];
  const cy = p.centre[1];
  const milieu: Vec2 = [cx, cy];
  const contour = placer(rectangleArrondi(-largeur / 2, -hauteur / 2, largeur, hauteur, PAPIER.coin, 3), { en: milieu, angle: p.angle });
  const gauche = cx - largeur / 2 + PAPIER.marge;
  let y = cy - hauteur / 2 + PAPIER.marge;
  const textes: Texte[] = [];
  let finDeLaDerniere: Vec2 = [gauche, y];
  let debutDeLaDerniere: Vec2 = [gauche, y];
  for (const [rang, b] of blocs.entries()) {
    if (rang > 0) y += PAPIER.entre;
    for (const [i, contenu] of b.lignes.entries()) {
      if (i > 0) y += b.corps * PAPIER.interligne;
      y += b.corps * HAUTEUR_DE_CAPITALE;
      const x = p.alignement === 'debut' ? gauche : cx;
      textes.push({
        genre: 'texte',
        contenu,
        role: b.l.role,
        corps: b.corps,
        en: [x, y],
        ancrage: p.alignement,
        teinte: encre,
        ton: TON_DE_BASE,
        fond: { teinte },
      });
      const largeur = mesurer({ contenu, role: b.l.role, corps: b.corps });
      finDeLaDerniere = [p.alignement === 'debut' ? gauche + largeur : cx + largeur / 2, y];
      debutDeLaDerniere = [p.alignement === 'debut' ? gauche : cx - largeur / 2, y];
    }
  }
  const dernier = blocs[blocs.length - 1]?.corps ?? 0;
  const nom = p.nom;
  const xDuCurseur = p.curseur === 'debut' ? debutDeLaDerniere[0] - PAPIER.avantLeCurseur : finDeLaDerniere[0] + PAPIER.avantLeCurseur;
  const curseur: Dessin[] =
    p.curseur !== undefined && p.curseur !== false
      ? [
          calque(`${nom}/curseur`, [
            aplat(
              [
                trait(
                  [
                    [xDuCurseur, finDeLaDerniere[1] + PAPIER.curseurDepasse],
                    [xDuCurseur, finDeLaDerniere[1] - dernier * PAPIER.hauteurDuCurseur],
                  ],
                  PAPIER.epaisseurDuCurseur,
                ),
              ],
              'miel',
              1,
            ),
          ]),
        ]
      : [];
  return {
    ombre: ombreAuPied(`${nom}/ombre`, { silhouettes: [contour], hauteur: PAPIER.epaisseur, support: 0, paliers: 2 }),
    papier: { ...aPlatSurLeMeuble(nom, PAPIER.epaisseur, [aplat([contour], teinte, 3), ...textes, ...curseur]), role: p.role ?? 'decor' },
    haut: cy - hauteur / 2,
    milieu,
    largeur,
  };
}
