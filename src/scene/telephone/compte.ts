/**
 * L'écran du compte, au téléphone : la platine à l'arrêt, comme à l'accueil, et dessous, sur la colonne, ce qu'on fait de son compte.
 * Dehors : ce qu'un compte garde, l'étiquette où l'on tape son adresse, « Envoie-moi le lien », et « J'ai un mot de passe ». Avec
 * un mot de passe : l'étiquette où on le tape (des points, jamais le mot de passe), « Entrer », et « Mot de passe oublié », qui
 * envoie le lien. Le lien parti : où il est parti. Le lien touché : « Entrer ». Dedans : son adresse et ses scores, choisir (ou
 * changer) son mot de passe, « Me déconnecter », « Effacer mon compte » (qu'on confirme). Le mot de passe qu'on choisit : ce qu'il
 * vaut à mesure qu'on le tape, et « Garder ce mot de passe ». « Retour » ramène d'un cran : à l'accueil, ou à l'étape d'avant.
 */

import type { CompteVu, RaisonDeRefus } from '../../regles/messages';
import type { JugementDuMotDePasse } from '../../regles/mot-de-passe';
import { MOT_DE_PASSE } from '../../ressources/reglages';
import { TABLEE } from '../../ressources/tablee';
import type { Calque } from '../calque';
import { remplir } from '../phrases';
import { platineArretee } from './meuble';
import { papier, SUR_LA_PLATINE, toucheAuMilieu, type Ecritoire, type VueDuTelephone } from './pieces';

const T = TABLEE.telephone.compte;

/** Ce que l'écran du compte peut s'être vu refuser, et dire. */
export type RefusDuCompte = Extract<
  RaisonDeRefus,
  'adresse' | 'tropDeLiens' | 'lienPerime' | 'comptesFermes' | 'motDePasseFaux' | 'tropDEssais' | 'motDePasseFaible'
>;

/** Ce que montre l'écran du compte : où l'on en est, l'adresse tapée, le compte ouvert, ce qu'on vient de se voir refuser. */
export interface CompteOuvertAuTelephone {
  readonly etape: 'adresse' | 'envoye' | 'lien' | 'dedans' | 'effacer' | 'motDePasse' | 'nouveauMotDePasse';
  readonly email: string;
  readonly compte?: CompteVu;
  readonly refus?: RefusDuCompte;
  /** Vrai pendant qu'on attend la réponse du serveur : la touche ne se presse pas deux fois. */
  readonly enAttente?: boolean;
  /** Combien de signes on a tapés du mot de passe : l'étiquette en montre autant de points, jamais le mot de passe. */
  readonly motDePasse?: number;
  /** Ce que vaut le mot de passe qu'on choisit, à mesure qu'on le tape. */
  readonly jugement?: JugementDuMotDePasse;
  /** Vrai quand le mot de passe qu'on a choisi vient d'être gardé : le papier le dit. */
  readonly garde?: boolean;
}

/** Les points qui montrent un mot de passe : un par signe, jusqu'à ce que l'étiquette en tienne. */
const POINT = '•';
const POINTS_AU_PLUS = 22;

/** « 3 parties jouées » : le singulier pour zéro et un, le pluriel au-delà. */
const compter = (formes: readonly [string, string], n: number): string => remplir(n < 2 ? formes[0] : formes[1], { n });

export function vueDuCompte(a: Ecritoire, c: CompteOuvertAuTelephone): VueDuTelephone {
  const r = SUR_LA_PLATINE;
  const C = a.textes.compte;
  const M = C.motDePasse;
  const objets: Calque[] = [platineArretee(a)];
  const ecrire = (lignes: Parameters<typeof papier>[5], en: readonly [number, number] = T.papier.en): void => {
    objets.push(...papier('etiquette-compte', r, en, T.papier.largeur, -1.5, lignes, a.encrier, { ancre: 'milieu' }).calques);
  };
  /** L'étiquette où l'on tape : son nom, et ce qu'on y a tapé (des points, pour un mot de passe). */
  const etiquette = (nom: `etiquette-${string}`, intitule: string, tape: string, en: readonly [number, number]): void => {
    objets.push(
      ...papier(
        nom,
        r,
        en,
        T.adresse.largeur,
        T.adresse.angle,
        [
          { contenu: intitule, role: 'technique', auPlus: 'gravure' },
          { contenu: tape === '' ? ' ' : tape, role: 'titrage', auPlus: 'intertitre' },
        ],
        a.encrier,
        { curseur: c.enAttente !== true, alignement: 'debut', ancre: 'milieu' },
      ).calques,
    );
  };
  const points = POINT.repeat(Math.min(POINTS_AU_PLUS, c.motDePasse ?? 0));
  const action = (nom: `touche-${string}`, libelle: string, y: number = T.action): void => {
    if (c.enAttente !== true) objets.push(toucheAuMilieu(nom, 'principale', libelle, r, y, a.encrier));
  };
  const autre = (nom: `touche-${string}`, libelle: string, y: number): void => {
    objets.push(toucheAuMilieu(nom, 'secondaire', libelle, r, y, a.encrier));
  };
  const deux = (une: readonly [`touche-${string}`, string, 'principale' | 'secondaire'], seconde: readonly [`touche-${string}`, string]): void => {
    objets.push(toucheAuMilieu(une[0], une[2], une[1], r, T.deux[0], a.encrier));
    objets.push(toucheAuMilieu(seconde[0], 'secondaire', seconde[1], r, T.deux[1], a.encrier));
  };
  const [haute, basse] = T.serre.touches;
  switch (c.etape) {
    case 'adresse':
      // Le papier du haut dit pourquoi avoir un compte ; ou, si l'on vient de se le voir refuser, pourquoi.
      ecrire(
        [
          c.refus !== undefined
            ? { contenu: C.refus[c.refus], role: 'titrage', auPlus: 'intertitre' }
            : { contenu: C.pourquoi, role: 'technique', auPlus: 'mention' },
        ],
        T.serre.papier,
      );
      // L'adresse s'écrit telle qu'on la tape : en minuscules, comme une adresse.
      etiquette('etiquette-email', C.adresse, c.email, T.serre.etiquette);
      action('touche-envoyer', C.envoyer, haute);
      if (c.enAttente !== true) autre('touche-avec-mot-de-passe', C.avecUnMotDePasse, basse);
      break;
    case 'motDePasse':
      ecrire(
        [
          { contenu: c.refus !== undefined ? C.refus[c.refus] : M.pour, role: 'titrage', auPlus: 'intertitre' },
          { contenu: c.email, role: 'techniqueFort', auPlus: 'mention' },
        ],
        T.serre.papier,
      );
      etiquette('etiquette-mot-de-passe', M.etiquette, points, T.serre.etiquette);
      action('touche-entrer-mot-de-passe', C.entrer, haute);
      if (c.enAttente !== true) autre('touche-oublie', M.oublie, basse);
      break;
    case 'nouveauMotDePasse':
      // Ce que vaut ce qu'on tape, à mesure ; ce qu'on vient de se voir refuser ; ou, rien tapé, ce qu'on attend de lui.
      ecrire(
        [
          {
            contenu:
              c.refus !== undefined ? C.refus[c.refus] : (c.motDePasse ?? 0) > 0 && c.jugement !== undefined ? M.jugement[c.jugement] : M.choisis,
            role: 'titrage',
            auPlus: 'intertitre',
          },
          { contenu: remplir(M.regle, { n: MOT_DE_PASSE.auMoins }), role: 'technique', auPlus: 'mention' },
        ],
        T.nouveau.papier,
      );
      etiquette('etiquette-mot-de-passe', M.nouveau, points, T.nouveau.etiquette);
      action('touche-garder-mot-de-passe', M.garder, T.nouveau.action);
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
      // Le mot de passe qu'on vient de choisir est gardé : le papier le dit, à la place des scores.
      ecrire(
        [
          { contenu: compte?.email ?? c.email, role: 'titrage', auPlus: 'intertitre' },
          ...(c.garde === true
            ? ([
                { contenu: M.garde, role: 'techniqueFort', auPlus: 'mention' },
                { contenu: M.autres, role: 'technique', auPlus: 'mention' },
              ] as const)
            : ([
                {
                  contenu: `${compter(C.parties, compte?.parties ?? 0)}, ${compter(C.victoires, compte?.victoires ?? 0)}`,
                  role: 'technique',
                  auPlus: 'mention',
                },
                { contenu: compte?.motDePasse === true ? M.avec : M.sans, role: 'technique', auPlus: 'mention' },
              ] as const)),
        ],
        T.dedans.papier,
      );
      const [motDePasse, sortir, effacer] = T.dedans.touches;
      autre('touche-choisir-mot-de-passe', M.touche, motDePasse);
      autre('touche-sortir', C.sortir, sortir);
      autre('touche-effacer', C.effacer, effacer);
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
