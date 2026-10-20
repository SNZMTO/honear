/**
 * Les potes simulés du prototype : cinq téléphones qui parlent au serveur comme les vrais, par les mêmes messages. Chacun rejoint
 * la room au salon, se dit prêt quand une piste est lancée, et fait ce que le scénario lui dit, tant de secondes après le départ
 * de l'extrait : répondre, perdre sa connexion, revenir. Ils ne savent de la partie que ce que le serveur leur envoie.
 */

import type { Action, Connexion, Nouvelle } from '../../regles/messages';
import { jouer, type ActionDePiste } from '../../regles/piste';
import type { Pochette } from '../../ressources/pochettes';
import type { Serveur } from '../../serveur/serveur';
import { SCENARIO, VOTES_DES_POTES, type PasDUnPote, type Pote } from './scenario';

export interface Potes {
  /** L'heure passe : chacun fait ce qu'il a à faire. Rend l'heure de son prochain geste, s'il en a un. */
  avancer(heure: number): number | undefined;
}

/** Un pote : sa connexion s'il en a une, l'identifiant que le serveur lui a donné, et ce qu'il sait de la piste en cours. */
interface Telephone {
  readonly qui: Pote;
  readonly pochette: Pochette;
  connexion: Connexion | undefined;
  toi: string | undefined;
  jeton: string | undefined;
  /** Les pistes lancées qu'il a vues, par l'instant de leur lancer : la dernière est celle qu'on joue. */
  readonly lancees: number[];
  seance: ActionDePiste[];
  pretPour: number | undefined;
  /** Au tournoi, les duels ouverts qu'il a vus, par l'heure de leur ouverture : le dernier est celui où il vote. */
  readonly duels: number[];
  /** Les gestes qu'il a faits, par piste. */
  readonly faits: Set<string>;
}

/**
 * Invite les cinq potes dans une room.
 * @param ouverteA l'heure où la room s'est ouverte : ils arrivent après elle, chacun à son heure.
 * @param mode ce qu'ils ont sous le pouce : ils tapent en saisie libre, ils touchent une étiquette en 4 choix ; au tournoi, ils votent.
 */
export function inviterLesPotes(
  serveur: Serveur,
  code: string,
  ouverteA: number,
  pochettes: Readonly<Record<Pote, Pochette>>,
  mode: 'libre' | 'quatreChoix' | 'tournoi',
): Potes {
  const telephones: Telephone[] = SCENARIO.arrivees.map(({ qui }) => ({
    qui,
    pochette: pochettes[qui],
    connexion: undefined,
    toi: undefined,
    jeton: undefined,
    lancees: [],
    seance: [],
    pretPour: undefined,
    duels: [],
    faits: new Set(),
  }));

  const brancher = (t: Telephone): void => {
    t.connexion = serveur.connecter((n: Nouvelle) => {
      if (n.genre === 'etat') {
        t.toi = n.toi;
        t.jeton = n.jeton;
        t.seance = [...n.seance];
      }
      // Au tournoi, un duel s'ouvre : il votera.
      const duel = n.genre === 'evenement' && n.evenement.genre === 'duel' ? n.evenement.a : undefined;
      if (duel !== undefined && !t.duels.includes(duel)) t.duels.push(duel);
      if (n.genre !== 'piste' && n.genre !== 'etat') return;
      const lancers = (n.genre === 'piste' ? [n.action] : n.seance).filter((a) => a.genre === 'lancer');
      for (const lancer of lancers) if (!t.lancees.includes(lancer.a)) t.lancees.push(lancer.a);
      if (n.genre === 'piste') t.seance = n.action.genre === 'lancer' ? [n.action] : [...t.seance, n.action];
    });
    t.connexion.envoyer({ genre: 'rejoindre', code, pochette: t.pochette, ...(t.jeton !== undefined ? { jeton: t.jeton } : {}) });
  };

  const envoyer = (t: Telephone, action: Action): void => t.connexion?.envoyer(action);

  function faire(t: Telephone, pas: PasDUnPote): void {
    switch (pas.fait.genre) {
      case 'repondre':
        envoyer(t, {
          genre: 'repondre',
          proposition: mode === 'libre' ? { genre: 'saisie', texte: pas.fait.libre } : { genre: 'choix', rang: pas.fait.choix },
        });
        return;
      case 'couper':
        t.connexion?.couper();
        t.connexion = undefined;
        return;
      case 'revenir':
        brancher(t);
        return;
    }
  }

  return {
    avancer(heure) {
      const prochains: number[] = [];
      for (const [rang, t] of telephones.entries()) {
        const arrivee = ouverteA + (SCENARIO.arrivees[rang]?.apres ?? 0);
        if (t.connexion === undefined && t.toi === undefined) {
          if (heure >= arrivee) brancher(t);
          else prochains.push(arrivee);
          continue;
        }
        // Au tournoi : un vote par duel, à son heure.
        const rangDuDuel = t.duels.length - 1;
        const duel = t.duels[rangDuDuel];
        if (mode === 'tournoi' && duel !== undefined && t.connexion !== undefined && !t.faits.has(`duel-${duel}`)) {
          const vote = duel + VOTES_DES_POTES.apres[t.qui];
          if (heure >= vote) {
            t.faits.add(`duel-${duel}`);
            envoyer(t, { genre: 'voter', face: (rangDuDuel + rang) % VOTES_DES_POTES.faceBTousLes === 0 ? 'B' : 'A' });
          } else prochains.push(vote);
        }
        const numero = t.lancees.length - 1;
        const lancer = t.lancees[numero];
        if (lancer === undefined) continue;
        // Prêt un peu après le lancer : l'ampli est allumé, l'extrait se charge.
        if (t.pretPour !== lancer && t.connexion !== undefined) {
          if (heure >= lancer + SCENARIO.pret) {
            t.pretPour = lancer;
            envoyer(t, { genre: 'pret' });
          } else prochains.push(lancer + SCENARIO.pret);
        }
        const extraitA = t.seance.reduce(jouer, undefined)?.extraitA;
        if (extraitA === undefined) continue;
        for (const [k, pas] of (SCENARIO.pistes[numero]?.potes ?? []).entries()) {
          const cle = `${numero}-${k}`;
          if (pas.qui !== t.qui || t.faits.has(cle)) continue;
          if (t.connexion === undefined && pas.fait.genre !== 'revenir') continue;
          if (heure < extraitA + pas.apres) {
            prochains.push(extraitA + pas.apres);
            continue;
          }
          t.faits.add(cle);
          faire(t, pas);
        }
      }
      return prochains.length > 0 ? Math.min(...prochains) : undefined;
    },
  };
}
