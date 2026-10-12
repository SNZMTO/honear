/**
 * Les commandes de la platine : ce sont les réglages. Deux boutons à crans et la manette du mode, alignés à l'avant du socle, et la
 * plaque de marque. Aucun menu déroulant.
 *
 * Ce module range les commandes ; il ne sait pas ce que leurs positions veulent dire.
 */

import type { Densite } from '../../ressources/densites';
import { PLATINE } from '../../ressources/platine';
import { CORPS } from '../../ressources/typo';
import { aPlatSurLeMeuble, type Calque, type Dessin } from '../calque';
import { dessinerUnBouton, type EtatDeBouton } from './bouton';
import { HAUTEURS, surLeSocle } from './emplacements';
import { graver } from './gravure';
import { dessinerUnInterrupteur, type EtatDInterrupteur } from './interrupteur';

const C = PLATINE.commandes;

type CleDeBouton = keyof typeof C.boutons;
type CleDInterrupteur = keyof typeof C.interrupteurs;

export interface EtatDesCommandes {
  readonly boutons: Readonly<Record<CleDeBouton, EtatDeBouton>>;
  readonly interrupteurs: Readonly<Record<CleDInterrupteur, EtatDInterrupteur>>;
}

export interface CommandesDessinees {
  /** Inscriptions gravées, écrous : dans le décor. */
  readonly decor: Dessin[];
  /** Les calques qui bougent, chacun précédé de son ombre, dans l'ordre où ils se dessinent. */
  readonly mobiles: Calque[];
}

/** @param souleve hauteur ajoutée aux boutons et aux interrupteurs, en px visibles : 0 quand ils sont en place. */
export function dessinerLesCommandes(
  etat: EtatDesCommandes,
  marque: string,
  densite: Densite,
  souleve: { readonly boutons: number; readonly interrupteurs: number } = { boutons: 0, interrupteurs: 0 },
): CommandesDessinees {
  const boutons = (Object.keys(C.boutons) as CleDeBouton[]).map((cle) =>
    dessinerUnBouton(cle, C.boutons[cle], etat.boutons[cle], densite, souleve.boutons),
  );
  const interrupteurs = (Object.keys(C.interrupteurs) as CleDInterrupteur[]).map((cle) =>
    dessinerUnInterrupteur(cle, C.interrupteurs[cle].x, etat.interrupteurs[cle], densite, souleve.interrupteurs),
  );
  // La plaque de marque : le nom, dans le caractère de titrage.
  const plaque = graver(marque, surLeSocle(C.marque), 'debut', 'titrage', CORPS.mention);

  return {
    decor: [
      aPlatSurLeMeuble('platine/gravures', HAUTEURS.socle, [
        ...boutons.flatMap((b) => b.gravures),
        ...interrupteurs.flatMap((i) => i.gravures),
        plaque,
      ]),
      ...interrupteurs.flatMap((i) => [...i.fixe, ...i.positions]),
    ],
    mobiles: [...boutons.flatMap((b) => [b.ombre, b.bouton]), ...interrupteurs.flatMap((i) => [i.ombre, i.bascule])],
  };
}
