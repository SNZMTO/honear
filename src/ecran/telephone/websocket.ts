/**
 * Le transport du téléphone en ligne : un WebSocket vers le serveur, qui donne la même connexion que le serveur simulé du prototype.
 * Il se rebranche tout seul quand la ligne tombe, de plus en plus patiemment, et tout de suite quand la page revient au premier plan
 * ou que le réseau revient ; il dit au téléphone quand il est hors ligne, et quand il est revenu. Ce qu'on envoie pendant que la ligne
 * est tombée est perdu : à son retour, le téléphone redonne son jeton et reçoit l'état complet.
 */

import type { Brancher, Nouvelle } from '../../regles/messages';
import { TELEPHONE } from '../../ressources/ecran';

/** Le code d'une ligne que le serveur a coupée parce qu'on n'a pas respecté ses règles : on ne se rebranche pas. */
const HORS_DES_REGLES = 1008;
/** Le code d'une ligne que le serveur a coupée parce que la page n'est pas de sa version : elle se recharge. */
const AUTRE_VERSION = 4001;
/** Les millisecondes d'une seconde : les minuteries comptent en millisecondes, nos tables en secondes. */
const MS_PAR_SECONDE = 1000;
/** Ce qu'une ligne a le droit de se taire, la page au premier plan, puis quand elle y revient (voir `TELEPHONE.reconnexion`). */
const SILENCE = TELEPHONE.reconnexion.silence * MS_PAR_SECONDE;
const AU_RETOUR = TELEPHONE.reconnexion.auRetour * MS_PAR_SECONDE;

/**
 * @param adresse celle de la ligne : « wss://honear.fr/ligne?v=… », avec la version de la page.
 * @param recharger ce qu'on fait quand le serveur dit que la page est d'une autre version que la sienne.
 */
export function brancherEnLigne(adresse: string, recharger?: () => void): Brancher {
  return (recevoir, enLigne) => {
    let socket: WebSocket | undefined;
    let attente: number | undefined;
    let essais = 0;
    let coupee = false;
    /** La minuterie qui guette le silence de la ligne : chaque nouvelle la repousse. */
    let guet: number | undefined;

    /** Une ligne restée muette trop longtemps : on la lâche sans attendre qu'elle se dise fermée, et on en rouvre une. */
    function ligneMuette(): void {
      guet = undefined;
      const s = socket;
      if (s === undefined || coupee || document.visibilityState !== 'visible') return;
      s.onclose = null;
      s.onmessage = null;
      s.close();
      socket = undefined;
      enLigne?.(false);
      ouvrir();
    }
    const guetter = (delai: number): void => {
      if (guet !== undefined) window.clearTimeout(guet);
      guet = window.setTimeout(ligneMuette, delai);
    };

    function ouvrir(): void {
      attente = undefined;
      if (coupee || socket !== undefined) return;
      const s = new WebSocket(adresse);
      socket = s;
      s.onopen = () => {
        essais = 0;
        enLigne?.(true);
        guetter(SILENCE);
      };
      s.onmessage = (evenement) => {
        guetter(SILENCE);
        if (typeof evenement.data !== 'string') return;
        let nouvelle: Nouvelle;
        try {
          nouvelle = JSON.parse(evenement.data) as Nouvelle;
        } catch {
          return;
        }
        recevoir(nouvelle);
      };
      s.onclose = (evenement) => {
        if (socket === s) socket = undefined;
        if (coupee) return;
        if (evenement.code === AUTRE_VERSION && recharger !== undefined) {
          coupee = true;
          recharger();
          return;
        }
        enLigne?.(false);
        if (evenement.code !== HORS_DES_REGLES) plusTard();
      };
    }

    /** Se rebrancher après un temps qui double à chaque essai, jusqu'à son plafond. */
    function plusTard(): void {
      if (attente !== undefined) return;
      const { debut, auPlus } = TELEPHONE.reconnexion;
      const delai = Math.min(auPlus, debut * 2 ** essais++) * 1000;
      attente = window.setTimeout(ouvrir, delai);
    }

    /**
     * La page revient au premier plan, le réseau revient : on n'attend pas la fin du délai pour se rebrancher. Une ligne qui se dit
     * encore ouverte doit répondre vite (le téléphone redemande l'heure) : sinon, elle est morte pendant qu'on était ailleurs.
     */
    const maintenant = (): void => {
      if (document.visibilityState !== 'visible' || coupee) return;
      if (socket !== undefined) return guetter(AU_RETOUR);
      if (attente !== undefined) window.clearTimeout(attente);
      ouvrir();
    };
    document.addEventListener('visibilitychange', maintenant);
    window.addEventListener('online', maintenant);
    ouvrir();

    return {
      envoyer(action) {
        if (socket !== undefined && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(action));
      },
      couper() {
        coupee = true;
        if (attente !== undefined) window.clearTimeout(attente);
        if (guet !== undefined) window.clearTimeout(guet);
        document.removeEventListener('visibilitychange', maintenant);
        window.removeEventListener('online', maintenant);
        socket?.close();
        socket = undefined;
      },
    };
  };
}
