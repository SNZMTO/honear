/**
 * L'écran du compte, au téléphone : la platine à l'arrêt, comme à l'accueil, et dessous, sur la colonne, ce qu'on fait de son compte.
 * Dehors : ce qu'un compte garde, l'étiquette où l'on tape son adresse, « Envoie-moi le lien ». Le lien parti : où il est parti.
 * Le lien touché : « Entrer ». Dedans : son adresse et ses scores, « Me déconnecter », « Effacer mon compte » (qu'on confirme).
 * « Retour » ramène à l'accueil.
 */

import type { CompteVu, RaisonDeRefus } from '../../regles/messages';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import { remplir } from '../phrases';
import { platineArretee } from './meuble';
import { papier, SUR_LA_PLATINE, toucheAuMilieu, type Ecritoire, type VueDuTelephone } from './pieces';

const T = TABLEE.telephone.compte;

/** Ce que montre l'écran du compte : où l'on en est, l'adresse tapée, le compte ouvert, ce qu'on vient de se voir refuser. */
export interface CompteOuvertAuTelephone {
  readonly etape: 'adresse' | 'envoye' | 'lien' | 'dedans' | 'effacer';
  readonly email: string;
  readonly compte?: CompteVu;
  readonly refus?: Extract<RaisonDeRefus, 'adresse' | 'tropDeLiens' | 'lienPerime' | 'comptesFermes'>;
  /** Vrai pendant qu'on attend la réponse du serveur : la touche ne se presse pas deux fois. */
  readonly enAttente?: boolean;
}

/** « 3 parties jouées » : le singulier pour zéro et un, le pluriel au-delà. */
const compter = (formes: readonly [string, string], n: number): string => remplir(n < 2 ? formes[0] : formes[1], { n });

export function vueDuCompte(a: Ecritoire, c: CompteOuvertAuTelephone): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const C = a.textes.compte;
  const objets: Calque[] = [platineArretee(a)];
  const ecrire = (lignes: Parameters<typeof papier>[5]): void => {
    objets.push(...papier('etiquette-compte', r, T.papier.en, T.papier.largeur, -1.5, lignes, a.encrier, { ancre: 'milieu' }).calques);
  };
  const action = (nom: `touche-${string}`, libelle: string): void => {
    if (c.enAttente !== true) objets.push(toucheAuMilieu(nom, 'principale', libelle, r, T.action, a.encrier));
  };
  const deux = (une: readonly [`touche-${string}`, string, 'principale' | 'secondaire'], autre: readonly [`touche-${string}`, string]): void => {
    objets.push(toucheAuMilieu(une[0], une[2], une[1], r, T.deux[0], a.encrier));
    objets.push(toucheAuMilieu(autre[0], 'secondaire', autre[1], r, T.deux[1], a.encrier));
  };
  switch (c.etape) {
    case 'adresse':
      // Le papier du haut dit pourquoi avoir un compte ; ou, si l'on vient de se le voir refuser, pourquoi.
      ecrire([
        c.refus !== undefined
          ? { contenu: C.refus[c.refus], role: 'titrage', auPlus: 'intertitre' }
          : { contenu: C.pourquoi, role: 'technique', auPlus: 'mention' },
      ]);
      objets.push(
        ...papier(
          'etiquette-email',
          r,
          T.adresse.en,
          T.adresse.largeur,
          T.adresse.angle,
          [
            { contenu: C.adresse, role: 'technique', auPlus: 'gravure' },
            // L'adresse s'écrit telle qu'on la tape : en minuscules, comme une adresse.
            { contenu: c.email === '' ? ' ' : c.email, role: 'titrage', auPlus: 'intertitre' },
          ],
          a.encrier,
          { curseur: c.enAttente !== true, alignement: 'debut', ancre: 'milieu' },
        ).calques,
      );
      action('touche-envoyer', C.envoyer);
      break;
    case 'envoye':
      // Un papier plus large ; chaque phrase a ses lignes, et l'adresse la sienne : longue, elle ne coupe rien d'autre.
      objets.push(
        ...papier(
          'etiquette-compte',
          r,
          T.envoye.en,
          T.envoye.largeur,
          -1.5,
          [
            { contenu: C.envoye, role: 'titrage', auPlus: 'intertitre' },
            { contenu: C.envoyeA, role: 'technique', auPlus: 'mention' },
            { contenu: c.email, role: 'techniqueFort', auPlus: 'mention' },
            { contenu: C.valable, role: 'technique', auPlus: 'mention' },
            { contenu: C.indesirables, role: 'technique', auPlus: 'mention' },
          ],
          a.encrier,
          { ancre: 'milieu' },
        ).calques,
      );
      objets.push(toucheAuMilieu('touche-autre-adresse', 'secondaire', C.autreAdresse, r, T.action, a.encrier));
      break;
    case 'lien':
      ecrire([{ contenu: c.refus !== undefined ? C.refus[c.refus] : C.lienLa, role: 'titrage', auPlus: 'intertitre' }]);
      if (c.refus === undefined) action('touche-entrer-compte', C.entrer);
      else objets.push(toucheAuMilieu('touche-autre-adresse', 'secondaire', C.autreAdresse, r, T.action, a.encrier));
      break;
    case 'dedans': {
      const compte = c.compte;
      ecrire([
        { contenu: compte?.email ?? c.email, role: 'titrage', auPlus: 'intertitre' },
        { contenu: compter(C.parties, compte?.parties ?? 0), role: 'technique', auPlus: 'mention' },
        { contenu: compter(C.victoires, compte?.victoires ?? 0), role: 'technique', auPlus: 'mention' },
      ]);
      deux(['touche-sortir', C.sortir, 'secondaire'], ['touche-effacer', C.effacer]);
      break;
    }
    case 'effacer':
      ecrire([{ contenu: C.effacerQuestion, role: 'titrage', auPlus: 'intertitre' }]);
      deux(['touche-effacer-vraiment', C.effacerVraiment, 'principale'], ['touche-garder', C.garder]);
      break;
  }
  objets.push(toucheAuMilieu('touche-retour', 'secondaire', C.retour, r, T.retour, a.encrier));
  return { regard: r, objets };
}
