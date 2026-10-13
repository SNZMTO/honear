/**
 * Le diagnostic du téléphone (« ?diagnostic » dans l'adresse) : ce que font le son, la fenêtre et le champ où l'on tape, noté ligne à
 * ligne, daté depuis l'ouverture, et envoyé au serveur par paquets, quand la ligne est là, sans gêner les actions du jeu. Le serveur
 * l'écrit dans son journal : de quoi comprendre un navigateur qu'on n'a pas sous la main.
 */

import { TELEPHONE } from '../../ressources/ecran';
import type { Horloge } from '../horloge';

/** Les millisecondes d'une seconde : les minuteries de la page comptent en millisecondes, nos tables en secondes. */
const MS_PAR_SECONDE = 1000;

export interface Diagnostic {
  /** Une ligne de plus, datée : elle partira avec le prochain paquet. */
  readonly noter: (texte: string) => void;
  /** La ligne est là (revenue) : ce qui attendait part. */
  readonly envoyer: () => void;
}

/**
 * @param envoyer envoie un paquet de lignes au serveur ; faux si la ligne n'est pas là : le paquet attend qu'elle revienne.
 */
export function ouvrirLeDiagnostic(horloge: Horloge, envoyer: (texte: string) => boolean): Diagnostic {
  const D = TELEPHONE.diagnostic;
  const aEnvoyer: string[] = [];
  const depuisLOuverture = horloge.maintenant();
  let paquetPrevu = false;
  /** Ce qui attend part, par paquets, tant que la ligne est là ; sinon, rien ne se perd : ça attendra qu'elle revienne. */
  function envoyerCeQuiAttend(): void {
    paquetPrevu = false;
    while (aEnvoyer.length > 0) {
      // Un paquet : les lignes qui tiennent ensemble ; une seule, coupée, si elle est trop longue.
      let lignes = 0;
      let texte = '';
      while (lignes < aEnvoyer.length && texte.length + (aEnvoyer[lignes]?.length ?? 0) < D.paquet) texte += `${aEnvoyer[lignes++] ?? ''}\n`;
      if (lignes === 0) {
        texte = (aEnvoyer[0] ?? '').slice(0, D.paquet);
        lignes = 1;
      }
      if (!envoyer(texte)) return;
      aEnvoyer.splice(0, lignes);
    }
  }
  return {
    noter(texte) {
      aEnvoyer.push(`${(horloge.maintenant() - depuisLOuverture).toFixed(2)} ${texte}`);
      if (aEnvoyer.length > D.enAttente) aEnvoyer.shift();
      if (paquetPrevu) return;
      paquetPrevu = true;
      window.setTimeout(envoyerCeQuiAttend, D.envoi * MS_PAR_SECONDE);
    },
    envoyer: envoyerCeQuiAttend,
  };
}
