/**
 * Le pied du bras : une embase sombre, la colonne du pivot, et le repose-bras là où le tube se pose.
 * Rien n'y bouge : tout part dans le décor.
 */

import { cercle } from '../../lowpoly/contours';
import { peindre } from '../../lowpoly/facette';
import { boiteChanfreinee, contourDeBoite, prisme } from '../../lowpoly/formes/boite';
import { contourDePlot, plot } from '../../lowpoly/formes/plot';
import { plus, tourner } from '../../lowpoly/vecteurs';
import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { peinture, type Dessin } from '../calque';
import { ombreAuPied } from '../ombre';
import { HAUTEURS, PIVOT_DU_BRAS, surLeTube } from './emplacements';

const B = PLATINE.bras;

export function dessinerLePiedDuBras(densite: Densite): Dessin[] {
  const petitsPans = densite.pansDePetitRond;
  const { embase, colonne, repose } = B;
  const formeDEmbase = { centre: PIVOT_DU_BRAS, rayon: embase.rayon, pans: densite.pansDeBouton };
  const contourDeColonne = cercle(PIVOT_DU_BRAS, colonne.rayon, petitsPans + 4);
  // Le repose-bras est sous le tube quand le bras est au repos, son berceau en travers.
  const appui = plus(PIVOT_DU_BRAS, tourner(surLeTube(B.reposeBras), B.repos));
  const poteau = cercle(appui, repose.poteau, petitsPans);
  const { largeur, profondeur, epaisseur, rayon, chanfrein } = repose.berceau;
  const berceau = { x: appui[0] - largeur / 2, y: appui[1] - profondeur / 2, largeur, profondeur, rayon, pansParCoin: 2, angle: B.repos - 90 };
  // Le berceau s'arrête juste sous le flanc du tube.
  const dessousDuTube = HAUTEURS.bras - B.tube.epaisseur - repose.jeu;
  const dessusDeLEmbase = HAUTEURS.socle + embase.epaisseur;
  const hauteurDeLaColonne = B.hauteur - embase.epaisseur - colonne.retrait;

  return [
    ombreAuPied('platine/pied-du-bras/ombre', {
      silhouettes: [contourDePlot(formeDEmbase)],
      hauteur: embase.epaisseur,
      support: HAUTEURS.socle,
      paliers: 2,
    }),
    peinture(
      peindre(
        plot({
          ...formeDEmbase,
          base: HAUTEURS.socle,
          epaisseur: embase.epaisseur,
          chanfrein: embase.chanfrein,
          teinte: 'expresso',
          // Une embase sombre, à peine bombée : le bras clair s'en détache.
          dessus: (bord) => [
            { de: bord, a: embase.rayon * embase.plat, teinte: 'expresso', monte: embase.monte },
            { de: embase.rayon * embase.plat, a: 0, teinte: 'expresso' },
          ],
        }),
      ),
    ),
    ombreAuPied('platine/colonne-du-bras/ombre', {
      silhouettes: [contourDeColonne],
      hauteur: hauteurDeLaColonne,
      support: dessusDeLEmbase,
      paliers: 2,
    }),
    // Le repose-bras : son poteau, et le berceau qu'il porte.
    ombreAuPied('platine/repose-bras/ombre', {
      silhouettes: [poteau, contourDeBoite(berceau)],
      hauteur: dessousDuTube - HAUTEURS.socle,
      support: HAUTEURS.socle,
      paliers: 2,
    }),
    peinture(
      peindre(
        prisme({
          contour: contourDeColonne,
          base: dessusDeLEmbase,
          epaisseur: hauteurDeLaColonne,
          chanfrein: colonne.chanfrein,
          teinte: 'alu',
        }),
      ),
    ),
    peinture(
      peindre(prisme({ contour: poteau, base: HAUTEURS.socle, epaisseur: dessousDuTube - epaisseur - HAUTEURS.socle, chanfrein: 0, teinte: 'alu' })),
    ),
    peinture(peindre(boiteChanfreinee({ ...berceau, base: dessousDuTube - epaisseur, epaisseur, chanfrein, teinte: 'expresso' }))),
  ];
}
