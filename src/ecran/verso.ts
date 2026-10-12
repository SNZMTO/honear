/**
 * Le verso du disque à l'écran : son fond, qui dépend de la façon de montrer la réponse, et la réponse, qui n'arrive
 * qu'à la révélation. Ce sont les deux seuls calques d'une scène montée dont le contenu change : rien d'autre n'est refait
 * quand on change de verso, ni quand la réponse tombe.
 */

import { memeReponse, type Reponse } from '../regles/piste';
import type { Densite } from '../ressources/densites';
import type { Dessin } from '../scene/calque';
import { CALQUES_DU_VERSO } from '../scene/disque';
import { dessinerLaReponseAuVerso, dessinerLeFondDuVerso, type GenreDeVerso, type VersoRevele } from '../scene/disque/verso';
import type { Encrier } from '../scene/rendu/texte';
import type { Montage } from './montage';

/** Ce que le verso doit montrer à l'instant d'une image. */
export interface VersoVoulu {
  /** La façon de montrer la réponse. */
  readonly genre: GenreDeVerso;
  /** La réponse, si elle est tombée. */
  readonly reponse: Reponse | undefined;
  /** Vrai dès qu'on peut la dessiner sans gêner ce qui bouge : le disque ralentit, il ne se retournera que plus tard. */
  readonly aDessiner: boolean;
  /** Vrai si le disque montre déjà son verso, ou se retourne : il n'y a plus à attendre, tout se fait à cette image. */
  readonly presse: boolean;
}

export interface VersoALEcran {
  /** Met le verso de la scène montée d'accord avec ce qu'il doit montrer : à appeler à chaque image, avant de régler la scène. */
  tenirAJour(voulu: VersoVoulu): void;
}

const memeVerso = (un: VersoRevele, autre: VersoRevele | undefined): boolean =>
  autre !== undefined && un.genre === autre.genre && memeReponse(un.reponse, autre.reponse);

/**
 * @param montage la scène montée : on y remplit les deux calques du verso.
 * @param o.genre la façon de montrer la réponse pour laquelle la scène a été dessinée : son fond est déjà celui-là.
 * @param o.enCasDEchec appelé si le fond n'a pas pu être refait, ou une réponse dessinée ou posée : le verso garde alors
 * ce qu'il montrait, et l'on ne retente pas à chaque image.
 */
export function tenirLeVerso(
  montage: Pick<Montage, 'remplir'>,
  o: { readonly genre: GenreDeVerso; readonly densite: Densite; readonly encrier: Encrier; readonly enCasDEchec: (erreur: unknown) => void },
): VersoALEcran {
  /** La façon dont le fond est dessiné ; et celle qu'on n'a pas su lui donner. */
  let fond = o.genre;
  let fondRefuse: GenreDeVerso | undefined;
  /** La réponse qu'on lit au verso ; celle qui est dessinée et attend d'y être posée ; celle qu'on n'a pas su dessiner, ou poser. */
  let posee: VersoRevele | undefined;
  let prete: (VersoRevele & { readonly dessins: readonly Dessin[] }) | undefined;
  let refusee: VersoRevele | undefined;

  /** Un titre et un artiste viennent d'ailleurs que du fichier de textes : on en écrit ce que les caractères du site savent écrire. */
  const dessiner = ({ genre, reponse }: VersoRevele): Dessin[] =>
    dessinerLaReponseAuVerso(
      { genre, reponse: { ...reponse, titre: o.encrier.ecrivable(reponse.titre), artiste: o.encrier.ecrivable(reponse.artiste) } },
      o.encrier.largeur,
      o.densite,
    );

  /** Donne au verso le fond de cette façon de montrer la réponse, s'il ne l'a pas. S'il ne peut pas être refait, il garde le sien. */
  function tenirLeFond(genre: GenreDeVerso): void {
    if (genre === fond) {
      // On est revenu à la façon qu'il a : celle qu'il a refusée, redemandée plus tard, sera une nouvelle demande.
      fondRefuse = undefined;
      return;
    }
    if (genre === fondRefuse) return;
    try {
      montage.remplir(CALQUES_DU_VERSO.fond, dessinerLeFondDuVerso(genre, o.densite));
      fond = genre;
      fondRefuse = undefined;
    } catch (erreur) {
      fondRefuse = genre;
      o.enCasDEchec(erreur);
    }
  }

  return {
    tenirAJour({ genre, reponse, aDessiner, presse }) {
      tenirLeFond(genre);
      // La réponse se lit sur le fond qu'on a : celui qu'on voulait, ou le précédent s'il n'a pas pu être refait.
      const voulu: VersoRevele | undefined = reponse !== undefined ? { genre: fond, reponse } : undefined;
      // Ce qu'on lit n'est plus la réponse, ou plus de cette façon : on l'efface d'abord. C'est le disque d'après,
      // un téléphone qui a manqué toute une piste, ou la personne qui change de verso.
      if (posee !== undefined && !memeVerso(posee, voulu)) {
        montage.remplir(CALQUES_DU_VERSO.reponse, []);
        posee = undefined;
      }
      if (prete !== undefined && !memeVerso(prete, voulu)) prete = undefined;
      if (voulu === undefined || posee !== undefined || (refusee !== undefined && memeVerso(refusee, voulu))) return;
      try {
        // Tant que rien ne presse, on la dessine à une image et on la pose à la suivante : un appareil lent n'y perd pas deux images d'un coup.
        if (prete === undefined) {
          if (!aDessiner && !presse) return;
          prete = { ...voulu, dessins: dessiner(voulu) };
          if (!presse) return;
        }
        montage.remplir(CALQUES_DU_VERSO.reponse, prete.dessins);
        posee = voulu;
        prete = undefined;
      } catch (erreur) {
        refusee = voulu;
        prete = undefined;
        o.enCasDEchec(erreur);
      }
    },
  };
}
