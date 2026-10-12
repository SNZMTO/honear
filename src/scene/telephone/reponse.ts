/**
 * Ce qu'on a sous le pouce pour répondre : l'étiquette vierge de la saisie libre (ce qu'on y a tapé, le curseur, les pastilles
 * « Artiste », « Titre », « Feat » collées dessus, et le mot qui s'y colle, « Presque. » ou « Rayé. ») ; les quatre étiquettes
 * à toucher du mode 4 choix ; le clavier, quand il est ouvert.
 */

import { rectangle } from '../../lowpoly/contours';
import type { Reponse } from '../../regles/piste';
import { PASTILLES } from '../../ressources/pastilles';
import { TABLEE } from '../../ressources/tablee';
import { aplat, calque, type Calque } from '../calque';
import type { Regard } from '../meuble';
import type { LigneDePapier } from '../papier';
import { dessinerUnePastille, type Pastille } from '../pastille';
import { dansLeRegard, interprete, papier, pastilleCollee, pastilleDeMot, type Ecritoire } from './pieces';

const T = TABLEE.telephone;

/** Où en est le mot, s'il bouge : en l'air avant de claquer, ou glissé vers la droite après s'être décollé. */
export interface MotQuiBouge {
  readonly enLAir: { readonly hauteur: number; readonly echelle: number };
  readonly fuite: number;
}

/** L'étiquette vierge de la saisie libre : ce qu'on y a tapé (ou ce qu'on peut y taper), le curseur, et les pastilles collées dessus. */
export function etiquetteDeReponse(
  a: Ecritoire,
  regard: Regard,
  tape: string,
  trouve: readonly string[],
  mot: string | undefined,
  y: number = T.reponse.en[1],
  motQuiBouge?: MotQuiBouge,
): Calque[] {
  const { calques, mot: pose } = etiquetteEtSonMot(a, regard, tape, trouve, mot, y, motQuiBouge);
  if (pose === undefined) return calques;
  const d = dessinerUnePastille(pose);
  return [...calques, d.ombre, d.pastille];
}

/** L'étiquette de réponse, et à part la pastille de son mot, s'il y en a un : une animation la dessine une fois, puis la fait bouger. */
export function etiquetteEtSonMot(
  a: Ecritoire,
  regard: Regard,
  tape: string,
  trouve: readonly string[],
  mot: string | undefined,
  y: number = T.reponse.en[1],
  motQuiBouge?: MotQuiBouge,
): { readonly calques: Calque[]; readonly mot: Pastille | undefined } {
  const R = T.reponse;
  const ligne: LigneDePapier =
    tape === '' ? { contenu: a.textes.partie.taReponse, role: 'technique', auPlus: 'mention' } : { contenu: tape, role: 'titrage', auPlus: 'titre' };
  // Taillée à ce qu'on tape, assez large pour ses trois pastilles ; elle s'allonge vers la droite.
  const etiquette = papier('etiquette-reponse', regard, [R.en[0], y], R.largeur, R.angle, [ligne], a.encrier, {
    curseur: true,
    alignement: 'debut',
    auMoins: R.auMoins,
  });
  const [mx, my] = dansLeRegard(regard, etiquette.milieu);
  const haut = dansLeRegard(regard, [etiquette.milieu[0], etiquette.haut])[1];
  const P = a.textes.partie;
  const noms = { artiste: P.artiste, titre: P.titre, feat: P.feat } as const;
  const collees = (['artiste', 'titre', 'feat'] as const).flatMap((p, rang) =>
    trouve.includes(p)
      ? pastilleCollee(
          `pastille-${p}`,
          noms[p],
          regard,
          [mx + (R.pastilles.places[rang] ?? 0) * etiquette.largeur, haut + R.pastilles.au],
          R.pastilles.angles[rang] ?? 0,
          a.encrier,
        )
      : [],
  );
  // « Presque. », « Rayé. » : collée à cheval sur le bord droit, sans cacher ce qu'on a tapé.
  const presque =
    mot !== undefined
      ? pastilleDeMot(
          'pastille-mot',
          mot,
          regard,
          [mx + etiquette.largeur / 2 + T.mot.decalage[0] + (motQuiBouge?.fuite ?? 0), my + T.mot.decalage[1]],
          T.mot.angle,
          a.encrier,
          PASTILLES.message.rayon,
          motQuiBouge?.enLAir,
        )
      : undefined;
  return { calques: [...etiquette.calques, ...collees], mot: presque };
}

/** La place d'une étiquette du mode 4 choix, par son rang : deux colonnes de deux. */
export const placeDuChoix = (rang: number): [number, number] => [T.choix.x[rang % T.choix.x.length] ?? 0, T.choix.y[rang] ?? 0];

/**
 * Les quatre étiquettes à toucher du mode 4 choix, « etiquette-choix-1 » à « -4 » ; celle qu'on a touchée est enfoncée ; une fois
 * la réponse révélée, seule la bonne reste.
 */
export function etiquettesAToucher(
  a: Ecritoire,
  regard: Regard,
  choix: readonly Reponse[],
  revelee: Reponse | undefined,
  touchee?: number,
): Calque[] {
  const C = T.choix;
  return choix.flatMap((c, rang) => {
    if (revelee !== undefined && !(c.titre === revelee.titre && c.artiste === revelee.artiste)) return [];
    // Celle qu'on a touchée s'enfonce : plaquée à plat sur la table, sans ombre, dans un papier plus sombre.
    const enfoncee = touchee === rang;
    const [x, y] = placeDuChoix(rang);
    return papier(
      `etiquette-choix-${rang + 1}`,
      regard,
      [x, y + (enfoncee ? C.touchee.enfonce : 0)],
      C.largeur,
      enfoncee ? 0 : (C.angles[rang] ?? 0),
      [
        { contenu: c.titre, role: 'techniqueFort', auPlus: 'mention' },
        { contenu: interprete(a.textes, c), role: 'technique', auPlus: 'mention' },
      ],
      a.encrier,
      // Une colonne d'étiquettes toutes pareilles : on les compare d'un coup d'œil.
      { role: 'mobile', auMoins: C.largeur, ...(enfoncee ? { teinte: C.touchee.teinte, plaque: true } : {}) },
    ).calques;
  });
}

/** Le clavier du téléphone, quand il est ouvert : il prend le bas de l'écran, depuis son dessus (en px depuis le haut du regard). */
export function clavier(regard: Regard, dessus: number = regard.hauteur - T.clavier.hauteur): Calque {
  const { origine, largeur, hauteur } = regard;
  return calque('decor-clavier', [aplat([rectangle(origine[0], origine[1] + dessus, largeur, hauteur - dessus)], 'vinyle', 1)], { role: 'decor' });
}
