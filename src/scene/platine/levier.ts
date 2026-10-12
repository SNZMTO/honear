/**
 * Le levier du bras : une manette qui coulisse dans son embase. Levé, il tient le bras en l'air ;
 * baissé, il le laisse descendre. La manette est un calque à part, son ombre aussi.
 */

import { rectangleArrondi } from '../../lowpoly/contours';
import { facetteAPlat, peindre } from '../../lowpoly/facette';
import { boiteChanfreinee, contourDeBoite } from '../../lowpoly/formes/boite';
import type { Polygone } from '../../lowpoly/polygones';
import { surLEcran } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { calque, peinture, type Calque, type Dessin } from '../calque';
import { ombre, ombreAuPied, reglerUneOmbre, type OmbreMobile } from '../ombre';
import { glissement, type Reglage } from '../reglage';
import { HAUTEURS, surLeSocle } from './emplacements';

const L = PLATINE.levier;

/**
 * Où est la manette dans sa glissière, sur le meuble : vers le fond quand le levier est levé, vers le joueur quand il est baissé.
 * @param leve de 0 (baissé : le bras est posé) à 1 (levé : il tient le bras en l'air).
 */
function placeDeLaManette(leve: number): Vec2 {
  const centre = surLeSocle(L.position);
  return [centre[0], centre[1] + (0.5 - leve) * L.course];
}

/** Hauteur du dessus de l'embase, où coulisse la manette, au-dessus du bois. */
const DESSUS_DE_L_EMBASE: number = HAUTEURS.socle + L.embase.epaisseur;

/** La manette, dessinée autour de sa propre place : son calque la fait coulisser, et son ombre la suit. */
const boiteDeLaManette = () =>
  ({
    x: -L.manette.largeur / 2,
    y: -L.manette.profondeur / 2,
    largeur: L.manette.largeur,
    profondeur: L.manette.profondeur,
    rayon: L.manette.rayon,
    pansParCoin: 3,
  }) as const;

/** Le contour de la manette, dans le plan du meuble : c'est lui qui fait son ombre. Le même à chaque image. */
const SILHOUETTES_DE_LA_MANETTE: readonly Polygone[] = [contourDeBoite(boiteDeLaManette())];

/** L'ombre de la manette sur le dessus de l'embase, pour une position du levier. */
const ombreDeLaManette = (leve: number, souleve: number): OmbreMobile => ({
  en: placeDeLaManette(leve),
  silhouettes: SILHOUETTES_DE_LA_MANETTE,
  hauteur: L.manette.epaisseur + souleve,
  support: DESSUS_DE_L_EMBASE,
  paliers: 2,
});

export interface LevierDessine {
  /** L'embase et sa glissière : dans le décor. */
  readonly embase: Dessin[];
  readonly ombre: Calque;
  readonly levier: Calque;
}

/**
 * @param leve de 0 (baissé) à 1 (levé).
 * @param souleve hauteur ajoutée à la manette, en px visibles : 0 quand elle est dans sa glissière.
 */
export function dessinerLeLevier(leve: number, densite: Densite, souleve = 0): LevierDessine {
  const { embase, manette, glissiere } = L;
  const centre = surLeSocle(L.position);
  const boiteDEmbase = {
    x: centre[0] - embase.largeur / 2,
    y: centre[1] - embase.profondeur / 2,
    largeur: embase.largeur,
    profondeur: embase.profondeur,
    rayon: embase.rayon,
    pansParCoin: Math.max(2, densite.pansDeCoin - 2),
  };
  const dessusDeLEmbase = DESSUS_DE_L_EMBASE;
  // La glissière : une fente en creux le long de l'embase, sombre comme le vinyle, un ton en dessous.
  const fente = rectangleArrondi(
    centre[0] - glissiere.largeur / 2,
    centre[1] - L.course / 2 - glissiere.depassement,
    glissiere.largeur,
    L.course + 2 * glissiere.depassement,
    glissiere.largeur / 2,
    2,
  );

  const boiteDeManette = boiteDeLaManette();

  return {
    embase: [
      ombreAuPied('platine/embase-du-levier/ombre', {
        silhouettes: [contourDeBoite(boiteDEmbase)],
        hauteur: embase.epaisseur,
        support: HAUTEURS.socle,
        paliers: 2,
      }),
      peinture(
        peindre(
          boiteChanfreinee({ ...boiteDEmbase, base: HAUTEURS.socle, epaisseur: embase.epaisseur, chanfrein: embase.chanfrein, teinte: 'expresso' }),
        ),
      ),
      peinture(peindre([facetteAPlat(fente, dessusDeLEmbase, 'vinyle', -1)])),
    ],
    ombre: ombre('levier/ombre', ombreDeLaManette(leve, souleve)),
    levier: calque(
      'levier',
      [
        peinture(
          peindre(boiteChanfreinee({ ...boiteDeManette, base: 0, epaisseur: manette.epaisseur, chanfrein: manette.chanfrein, teinte: 'alu' })),
        ),
      ],
      { role: 'mobile', transformations: [{ genre: 'glisser', de: surLEcran(placeDeLaManette(leve), dessusDeLEmbase + souleve) }] },
    ),
  };
}

/** Ce que le mouvement règle sur le levier déjà dessiné : la place de sa manette dans la glissière, et son ombre avec elle. */
export function reglerLeLevier(leve: number): Reglage[] {
  return [
    ...reglerUneOmbre('levier/ombre', ombreDeLaManette(leve, 0)),
    glissement('levier', 0, surLEcran(placeDeLaManette(leve), DESSUS_DE_L_EMBASE)),
  ];
}
