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

/** @param adresse celle de la ligne : « wss://miel-doreilles.fr/ligne ». */
export function brancherEnLigne(adresse: string): Brancher {
  return (recevoir, enLigne) => {
    let socket: WebSocket | undefined;
    let attente: number | undefined;
    let essais = 0;
    let coupee = false;

    function ouvrir(): void {
      attente = undefined;
      if (coupee || socket !== undefined) return;
      const s = new WebSocket(adresse);
      socket = s;
      s.onopen = () => {
        essais = 0;
        enLigne?.(true);
      };
      s.onmessage = (evenement) => {
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

    /** La page revient au premier plan, le réseau revient : on n'attend pas la fin du délai pour se rebrancher. */
    const maintenant = (): void => {
      if (document.visibilityState !== 'visible' || socket !== undefined || coupee) return;
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
        document.removeEventListener('visibilitychange', maintenant);
        window.removeEventListener('online', maintenant);
        socket?.close();
        socket = undefined;
      },
    };
  };
}
