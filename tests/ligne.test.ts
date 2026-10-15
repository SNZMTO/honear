/**
 * La ligne du téléphone en ligne, sur une fausse page et un faux WebSocket : elle se rebranche quand elle tombe ; et une ligne qui
 * se tait trop longtemps, ou qui ne répond plus quand la page revient au premier plan (l'iPhone qui revient de veille, ou de
 * WhatsApp, la garde « ouverte » sans plus rien en recevoir), est lâchée et rouverte, sans qu'on la dise tombée deux fois.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brancherEnLigne } from '../src/ecran/telephone/websocket';
import type { Nouvelle } from '../src/regles/messages';
import { installerUneFaussePage } from './fausse-page';

const PAGE = installerUneFaussePage();
const monde = globalThis as unknown as Record<string, unknown>;

/** Un faux WebSocket : il dit ce qu'on lui a envoyé, et s'il a été fermé ; le test l'ouvre, lui fait parler ou se fermer. */
class FauxSocket {
  static readonly OPEN = 1;
  static crees: FauxSocket[] = [];
  readyState = 0;
  fermee = false;
  readonly envoyes: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { readonly data: string }) => void) | null = null;
  onclose: ((e: { readonly code: number }) => void) | null = null;
  constructor(readonly adresse: string) {
    FauxSocket.crees.push(this);
  }
  send(texte: string): void {
    this.envoyes.push(texte);
  }
  close(): void {
    this.fermee = true;
  }
  ouvrir(): void {
    this.readyState = FauxSocket.OPEN;
    this.onopen?.();
  }
  dire(nouvelle: Nouvelle): void {
    this.onmessage?.({ data: JSON.stringify(nouvelle) });
  }
}
monde['WebSocket'] = FauxSocket;

function uneLigne() {
  FauxSocket.crees = [];
  const recues: Nouvelle[] = [];
  const etats: boolean[] = [];
  const connexion = brancherEnLigne('wss://honear.fr/ligne')(
    (n) => recues.push(n),
    (oui) => etats.push(oui),
  );
  return { connexion, recues, etats, socket: (rang: number) => FauxSocket.crees[rang] };
}

test('une ligne qui se tait trop longtemps, la page au premier plan, est lâchée et rouverte : on la dit tombée une fois', () => {
  const { connexion, etats, socket } = uneLigne();
  socket(0)?.ouvrir();
  assert.deepEqual(etats, [true]);
  // Elle parle : le guet repart à chaque nouvelle.
  socket(0)?.dire({ genre: 'heure', depart: 1, heure: 2 });
  assert.equal(FauxSocket.crees.length, 1);
  // Puis plus rien : le guet sonne, la ligne muette est lâchée et une autre s'ouvre aussitôt.
  PAGE.passerLesMinuteries();
  assert.equal(socket(0)?.fermee, true);
  assert.equal(FauxSocket.crees.length, 2, 'une nouvelle ligne, tout de suite');
  assert.deepEqual(etats, [true, false]);
  // L'ancienne qui finit par se dire fermée ne change plus rien.
  socket(0)?.onclose?.({ code: 1006 });
  assert.deepEqual(etats, [true, false]);
  socket(1)?.ouvrir();
  assert.deepEqual(etats, [true, false, true]);
  connexion.couper();
});

test('en arrière-plan, on ne lâche rien ; au retour, une ligne qui ne répond pas vite est rouverte', () => {
  const { connexion, etats, socket } = uneLigne();
  socket(0)?.ouvrir();
  PAGE.document.visibilityState = 'hidden';
  PAGE.passerLesMinuteries();
  assert.equal(FauxSocket.crees.length, 1, 'page cachée : la ligne reste');
  // La page revient : la ligne qui se dit ouverte doit répondre vite.
  PAGE.document.visibilityState = 'visible';
  for (const ecouteur of PAGE.ecouteursDuDocument.get('visibilitychange') ?? []) ecouteur({});
  assert.equal(FauxSocket.crees.length, 1);
  PAGE.passerLesMinuteries();
  assert.equal(socket(0)?.fermee, true, 'muette au retour : lâchée');
  assert.equal(FauxSocket.crees.length, 2);
  assert.deepEqual(etats, [true, false]);
  connexion.couper();
});

test('une ligne qui répond au retour reste ; une ligne coupée se rebranche plus tard ; couper arrête tout', () => {
  const { connexion, socket } = uneLigne();
  socket(0)?.ouvrir();
  for (const ecouteur of PAGE.ecouteursDuDocument.get('visibilitychange') ?? []) ecouteur({});
  socket(0)?.dire({ genre: 'heure', depart: 1, heure: 2 });
  // Le guet du retour a été remplacé par celui du silence : il sonnera, mais seulement s'il ne vient plus rien.
  socket(0)?.onclose?.({ code: 1006 });
  assert.equal(FauxSocket.crees.length, 1, 'tombée : on attend un peu avant de se rebrancher');
  PAGE.passerLesMinuteries();
  assert.equal(FauxSocket.crees.length, 2, 'puis on se rebranche');
  connexion.couper();
  PAGE.passerLesMinuteries();
  assert.equal(FauxSocket.crees.length, 2, 'coupée : plus rien');
});
