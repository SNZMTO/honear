/**
 * Les images de la planche « Ce qui se touche » : trois écrans du jeu (les réglages du tournoi, le bac, un duel), tels qu'ils sont
 * aujourd'hui, puis avec chacune des trois façons de signaler ce qui se touche. Ce qui se touche, c'est ce que le téléphone y fait
 * toucher (`calquesATouche`, le même que le jeu), hors des touches, qui ont déjà l'air de touches.
 */

import type { EcranDuTelephone } from '../../ecran/telephone/route';
import { calquesATouche } from '../../ecran/telephone/touchers';
import { cercle } from '../../lowpoly/contours';
import type { Polygone } from '../../lowpoly/polygones';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { MODES } from '../../regles/modes';
import { partieA } from '../../regles/partie';
import { REGLAGES, TOURNOI } from '../../ressources/reglages';
import type { Textes } from '../../ressources/textes';
import { aplat, calque, type Calque } from '../../scene/calque';
import { POSE_DU_DUEL } from '../../scene/duel';
import { dessinerLeMeuble } from '../../scene/meuble';
import { empriseDe, type Emprise } from '../../scene/rendu/emprise';
import type { Encrier } from '../../scene/rendu/texte';
import { vueDuDuel } from '../../scene/telephone/duel';
import { vueDesReglages, vueDuBac, type BacOuvert } from '../../scene/telephone/ecrans';
import { DENSITE, type Ecritoire, type VueDuTelephone } from '../../scene/telephone/pieces';
import type { ImageDePlanche } from '../image';
import { journalJusquAuDuel } from '../tournoi/scenes';
import { LEGENDES_DES_REPERES as L } from './legendes.fr';

export type Variante = keyof typeof L.variantes;
export const VARIANTES: readonly Variante[] = ['aujourdhui', 'coins', 'pointilles', 'pastilles'];

/** Les mesures des signes, en px de l'écran : leur écart à ce qu'ils signalent, leur épaisseur, leurs longueurs. */
const S = {
  ecart: 4,
  epaisseur: 2.5,
  coin: { auPlus: 12, part: 0.4 },
  pointille: { trait: 6, blanc: 4 },
  pastille: { rayon: 8, fleche: 4.5 },
} as const;

/** Un rectangle, en polygone : de ce coin, de cette taille. */
const rectangle = (x: number, y: number, l: number, h: number): Polygone => [
  [x, y],
  [x + l, y],
  [x + l, y + h],
  [x, y + h],
];

/** Les quatre coins de visée autour d'une emprise. */
function coins(e: Emprise): Polygone[] {
  const [x0, y0, x1, y1] = [e.x - S.ecart, e.y - S.ecart, e.x + e.largeur + S.ecart, e.y + e.hauteur + S.ecart];
  const l = Math.min(S.coin.auPlus, S.coin.part * (x1 - x0), S.coin.part * (y1 - y0));
  const t = S.epaisseur;
  return [
    rectangle(x0, y0, l, t),
    rectangle(x0, y0, t, l),
    rectangle(x1 - l, y0, l, t),
    rectangle(x1 - t, y0, t, l),
    rectangle(x0, y1 - t, l, t),
    rectangle(x0, y1 - l, t, l),
    rectangle(x1 - l, y1 - t, l, t),
    rectangle(x1 - t, y1 - l, t, l),
  ];
}

/** Un pointillé tout autour d'une emprise : des traits le long de chaque côté. */
function pointille(e: Emprise): Polygone[] {
  const [x0, y0, x1, y1] = [e.x - S.ecart, e.y - S.ecart, e.x + e.largeur + S.ecart, e.y + e.hauteur + S.ecart];
  const t = S.epaisseur;
  const { trait, blanc } = S.pointille;
  const traits: Polygone[] = [];
  const le = (de: number, a: number, poser: (debut: number, longueur: number) => Polygone): void => {
    for (let d = de; d < a; d += trait + blanc) traits.push(poser(d, Math.min(trait, a - d)));
  };
  le(x0, x1, (d, l) => rectangle(d, y0, l, t));
  le(x0, x1, (d, l) => rectangle(d, y1 - t, l, t));
  le(y0 + t, y1 - t, (d, l) => rectangle(x0, d, t, l));
  le(y0 + t, y1 - t, (d, l) => rectangle(x1 - t, d, t, l));
  return traits;
}

/** La pastille au coin haut-droit d'une emprise, et sa flèche tournée vers elle (vers le bas et la gauche). */
function pastille(e: Emprise): { readonly rond: Polygone; readonly fleche: Polygone } {
  const { rayon, fleche } = S.pastille;
  const centre: Vec2 = [e.x + e.largeur, e.y];
  return {
    rond: cercle(centre, rayon, DENSITE.pansDePetitRond),
    fleche: [
      [centre[0] - fleche, centre[1] + fleche],
      [centre[0] - fleche, centre[1] - fleche / 2],
      [centre[0] + fleche / 2, centre[1] + fleche],
    ],
  };
}

/** Les signes d'un écran, dans cette variante : un calque par chose qui se touche (hors des touches). */
function signes(a: Ecritoire, vue: VueDuTelephone, e: EcranDuTelephone, variante: Variante): Calque[] {
  if (variante === 'aujourdhui') return [];
  const aSigner = calquesATouche(vue.objets, e, a.textes).filter(({ calque: c }) => !c.nom.startsWith('touche-'));
  // Ce qui déborde de l'écran (le disque d'un duel, à droite) est signalé dans ce qu'on en voit.
  const [ox, oy] = vue.regard.origine;
  const bord = S.ecart + S.pastille.rayon;
  const dansLEcran = (e: Emprise): Emprise => {
    const [x0, y0] = [Math.max(e.x, ox + bord), Math.max(e.y, oy + bord)];
    const [x1, y1] = [Math.min(e.x + e.largeur, ox + vue.regard.largeur - bord), Math.min(e.y + e.hauteur, oy + vue.regard.hauteur - bord)];
    return { x: x0, y: y0, largeur: x1 - x0, hauteur: y1 - y0 };
  };
  return aSigner.flatMap(({ calque: c, sous }, rang) => {
    const toute = empriseDe([c], a.encrier.largeur, sous);
    if (toute === undefined) return [];
    const emprise = dansLEcran(toute);
    const nom = `signe-${rang + 1}` as const;
    if (variante === 'coins') return [calque(nom, [aplat(coins(emprise), 'miel', 3)], { role: 'mobile' })];
    if (variante === 'pointilles') return [calque(nom, [aplat(pointille(emprise), 'miel', 3)], { role: 'mobile' })];
    const { rond, fleche } = pastille(emprise);
    return [calque(nom, [aplat([rond], 'miel', 2), aplat([fleche], 'creme', 3)], { role: 'mobile' })];
  });
}

/** Un écran du jeu, avec ce qu'on y touche, dans chacune des variantes. */
interface EcranDuJeu {
  readonly cle: keyof typeof L.ecrans;
  readonly vue: VueDuTelephone;
  readonly ecran: EcranDuTelephone;
}

function ecransDuJeu(a: Ecritoire): EcranDuJeu[] {
  const reglages = { pistes: TOURNOI.titres.defaut, extrait: REGLAGES.extrait.defaut, son: 'tous' as const };
  const [theme = ''] = Object.keys(a.textes.bac.themes).filter((t) => t !== 'mesPlaylists');
  const bac: BacOuvert = {
    cran: 'pretes',
    theme,
    proposees: [
      { titre: a.textes.bac.themes[theme] ?? theme, total: 50 },
      { titre: a.textes.bac.themes[theme] ?? theme, total: 32 },
      { titre: a.textes.bac.themes[theme] ?? theme, total: 24 },
    ],
    themeAToucher: true,
    retour: 'revenir',
  };
  const etat = partieA(journalJusquAuDuel(a.textes, 0), Infinity);
  return [
    {
      cle: 'reglages',
      vue: vueDesReglages(a, MODES.libre, reglages, 'tournoi', MODES.tournoi),
      ecran: { genre: 'reglages', jeu: 'tournoi', mode: MODES.libre, tournoi: MODES.tournoi, ...reglages, commandes: true },
    },
    { cle: 'bac', vue: vueDuBac(a, bac), ecran: { genre: 'bac', bac, chercher: true } },
    {
      cle: 'duel',
      vue: vueDuDuel(a, { etat, toi: 'toi', pose: POSE_DU_DUEL }),
      ecran: { genre: 'duel', etat, toi: 'toi', voter: true, aide: false },
    },
  ];
}

/** Les images de la planche, variante par variante : chacune, les trois écrans. */
export function imagesDesReperes(textes: Textes, encrier: Encrier): Readonly<Record<Variante, readonly ImageDePlanche[]>> {
  const a: Ecritoire = { textes, encrier };
  const ecrans = ecransDuJeu(a);
  const pour = (variante: Variante): ImageDePlanche[] =>
    ecrans.map(({ cle, vue, ecran }) => ({
      fichier: `reperes-${variante}-${cle}`,
      titre: L.ecrans[cle],
      regard: vue.regard,
      scene: dessinerLeMeuble({ regard: vue.regard, densite: DENSITE, objets: [...vue.objets, ...signes(a, vue, ecran, variante)] }),
    }));
  return { aujourdhui: pour('aujourdhui'), coins: pour('coins'), pointilles: pour('pointilles'), pastilles: pour('pastilles') };
}

/** Toutes les images, à la file, pour les contrôles. */
export const toutesLesImagesDesReperes = (textes: Textes, encrier: Encrier): ImageDePlanche[] =>
  Object.values(imagesDesReperes(textes, encrier)).flat();
