/**
 * Une touche de platine : ce qu'on presse. Un capuchon chanfreiné, logé dans le puits d'un petit socle de laque posé sur
 * le meuble. Au repos, son flanc dépasse du puits ; pressé, il s'y enfonce de 2 px, et son ombre au fond du puits raccourcit.
 * Allumée (un poussoir enclenché, un cran choisi), elle reste enfoncée, face sombre, inscription miel.
 *
 * Le capuchon et son libellé bougent ensemble, d'un bloc ; ce qui passe sous le bord avant du puits ne se voit pas.
 * Ses deux ombres, au repos et enfoncée, sont déjà dessinées : on passe de l'une à l'autre par leur opacité.
 */

import { facetteAPlat, peindre, type Facette } from '../lowpoly/facette';
import { boiteChanfreinee, contourDeBoite, prisme } from '../lowpoly/formes/boite';
import { enveloppeConvexe, type Polygone } from '../lowpoly/polygones';
import { hauteurPour, surLEcran } from '../lowpoly/projection';
import { TON_DE_BASE } from '../lowpoly/tons';
import type { Vec2, Vec3 } from '../lowpoly/vecteurs';
import type { Densite } from '../ressources/densites';
import { TOUCHES } from '../ressources/mouvement';
import type { NomDeTeinte } from '../ressources/palette';
import { FORMES_DES_TOUCHES, TOUCHE, type NomDeGenreDeTouche } from '../ressources/touches';
import { CORPS, HAUTEUR_DE_CAPITALE } from '../ressources/typo';
import { aPlatSurLeMeuble, calque, peinture, soulever, type Calque, type Mesure, type Texte } from './calque';
import { encreLisibleSur } from './encre';
import { ombre, ombreAuPied } from './ombre';
import { faireTenir } from './texte';

export type EtatDeTouche = 'repos' | 'enfoncee' | 'allumee';

export interface Touche {
  readonly nom: `touche-${string}`;
  readonly genre: NomDeGenreDeTouche;
  readonly libelle: string;
  /** Le centre de la touche sur le meuble, et la hauteur de la surface où son socle est posé, en px visibles. */
  readonly centre: Vec2;
  readonly support: number;
  readonly etat: EtatDeTouche;
  /** Vrai pour une touche taillée à son libellé, écrit au plus grand corps de son genre : des crans côte à côte qui ne se chevauchent pas. */
  readonly ajustee?: boolean;
}

/** La largeur du capuchon d'une touche : celle de son genre, ou celle de son libellé et de ses marges si elle est taillée à lui. */
function largeurDuCapuchon(t: Pick<Touche, 'genre' | 'libelle' | 'ajustee'>, mesurer: Mesure): number {
  const forme = FORMES_DES_TOUCHES[t.genre];
  if (t.ajustee !== true) return forme.largeur;
  return Math.ceil(mesurer({ contenu: t.libelle, role: forme.role, corps: CORPS[forme.auPlus] }) + 2 * K.marge);
}

/** La largeur d'une touche entière sur le meuble, socle compris : de quoi en ranger plusieurs côte à côte. */
export const largeurDeLaTouche = (t: Pick<Touche, 'genre' | 'libelle' | 'ajustee'>, mesurer: Mesure): number =>
  largeurDuCapuchon(t, mesurer) + 2 * P.jeu + 2 * S.marge;

const { socle: S, puits: P, capuchon: K } = TOUCHE;

/** Les calques d'une touche que le mouvement règle : son capuchon, et ses deux ombres. */
export const calquesDeLaTouche = (nom: Touche['nom']) =>
  ({ capuchon: `${nom}/capuchon`, ombreAuRepos: `${nom}/capuchon/ombre-repos`, ombreEnfoncee: `${nom}/capuchon/ombre-enfoncee` }) as const;

/** Un rectangle arrondi autour d'un point du meuble. */
const autourDe = (centre: Vec2, largeur: number, profondeur: number, rayon: number, pans: number): Vec2[] =>
  contourDeBoite({ x: centre[0] - largeur / 2, y: centre[1] - profondeur / 2, largeur, profondeur, rayon, pansParCoin: pans });

/** La paroi du fond du puits : debout, tournée vers le joueur, du fond du puits jusqu'au dessus du socle. */
function paroiDuFond(puits: Polygone, fond: number, dessus: number): Facette {
  const yFond = Math.min(...puits.map(([, y]) => y));
  const bord = puits.filter(([, y]) => y < yFond + P.rayon).map(([x]) => x);
  const [gauche, droite] = [Math.min(...bord), Math.max(...bord)];
  const sommets: Vec3[] = [
    [gauche, yFond, hauteurPour(fond)],
    [droite, yFond, hauteurPour(fond)],
    [droite, yFond, hauteurPour(dessus)],
    [gauche, yFond, hauteurPour(dessus)],
  ];
  return { sommets: sommets.reverse(), teinte: S.teinte, nuance: -1 };
}

export function dessinerUneTouche(t: Touche, densite: Densite, mesurer: Mesure): Calque {
  const genre = FORMES_DES_TOUCHES[t.genre];
  const forme = { ...genre, largeur: largeurDuCapuchon(t, mesurer) };
  const pans = Math.max(2, densite.pansDeCoin / 2);
  const noms = calquesDeLaTouche(t.nom);
  const largeurDuPuits = forme.largeur + 2 * P.jeu;
  const profondeurDuPuits = forme.profondeur + 2 * P.jeu;
  const socle = autourDe(t.centre, largeurDuPuits + 2 * S.marge, profondeurDuPuits + 2 * S.marge, S.rayon, S.pansParCoin);
  const puits = autourDe(t.centre, largeurDuPuits, profondeurDuPuits, P.rayon, pans);
  const dessus = t.support + S.epaisseur;
  const fond = dessus - P.profondeur;
  const allumee = t.etat === 'allumee';
  const teinte: NomDeTeinte = allumee ? TOUCHE.allumee.teinte : forme.teinte;
  const enfoncee = t.etat !== 'repos';

  // Ce qu'on voit du puits, depuis le dessus du socle, et tout ce qui monte au-dessus : rien du capuchon ni de son ombre
  // ne passe sous son bord avant.
  const ouverture = puits.map((p) => surLEcran(p, dessus));
  const dansLePuits = [enveloppeConvexe([...ouverture, ...ouverture.map(([x, y]): Vec2 => [x, y - 2 * K.epaisseur])])];

  const capuchon = autourDe([0, 0], forme.largeur, forme.profondeur, K.rayon, pans);
  const libelle = faireTenir(mesurer, { contenu: t.libelle, role: forme.role }, forme.largeur - 2 * K.marge, forme.auPlus);
  const encre: NomDeTeinte = allumee ? TOUCHE.allumee.encre : encreLisibleSur(teinte);
  const texte: Texte = {
    genre: 'texte',
    contenu: libelle.contenu,
    role: forme.role,
    corps: libelle.corps,
    en: [t.centre[0], t.centre[1] + (libelle.corps * HAUTEUR_DE_CAPITALE) / 2],
    ancrage: 'milieu',
    teinte: encre,
    ton: TON_DE_BASE,
    fond: { teinte },
  };
  const ombreDuCapuchon = (nom: string, course: number): Calque =>
    ombre(nom as `touche-${string}`, {
      en: t.centre,
      silhouettes: [capuchon],
      hauteur: K.epaisseur - course,
      support: fond,
      paliers: 2,
    });

  return calque(t.nom, [
    calque(
      `${t.nom}/socle`,
      [
        ombreAuPied(`${t.nom}/socle/ombre`, { silhouettes: [socle], hauteur: S.epaisseur, support: t.support }),
        peinture(peindre(prisme({ contour: socle, base: t.support, epaisseur: S.epaisseur, chanfrein: S.chanfrein, teinte: S.teinte }))),
        peinture(peindre([facetteAPlat(puits, fond, S.teinte, -1), paroiDuFond(puits, fond, dessus)])),
      ],
      { role: 'decor' },
    ),
    calque(
      `${t.nom}/puits`,
      [
        { ...ombreDuCapuchon(noms.ombreAuRepos, 0), opacite: enfoncee ? 0 : 1 },
        { ...ombreDuCapuchon(noms.ombreEnfoncee, TOUCHES.course), opacite: enfoncee ? 1 : 0 },
      ],
      {
        decoupe: dansLePuits,
      },
    ),
    {
      ...calque(
        noms.capuchon,
        [
          peinture(
            peindre(
              boiteChanfreinee({
                x: t.centre[0] - forme.largeur / 2,
                y: t.centre[1] - forme.profondeur / 2,
                largeur: forme.largeur,
                profondeur: forme.profondeur,
                rayon: K.rayon,
                pansParCoin: pans,
                base: fond,
                epaisseur: K.epaisseur,
                chanfrein: K.chanfrein,
                teinte,
              }),
            ),
          ),
          aPlatSurLeMeuble(`${t.nom}/libelle`, fond + K.epaisseur, [texte]),
        ],
        { role: 'mobile', transformations: [soulever(enfoncee ? -TOUCHES.course : 0)] },
      ),
      decoupe: dansLePuits,
    },
  ]);
}
