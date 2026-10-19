/**
 * Le journal du serveur : d'une erreur, il ne dit que sa classe, son code et son motif, et ce qui l'a causée ; jamais une adresse
 * e-mail, un lien ou ce qu'elle cite, sur une ligne, et pas plus long que ce que le réseau lui laisse.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { motifDe } from '../src/reseau/journal';
import { RESEAU } from '../src/ressources/reseau';

test('d’une erreur, le journal dit la classe, le code, le motif et la cause ; jamais une adresse e-mail, un lien ou ce qu’elle cite', () => {
  // Un serveur d'envoi qui refuse un destinataire le cite dans sa réponse.
  const smtp = motifDe(new Error('Le serveur d’envoi refuse (550) : 550 5.1.1 <mateo@example.com>: Recipient address rejected'));
  assert.match(smtp, /^Error : Le serveur d’envoi refuse \(550\) : 550 5\.1\.1 /);
  assert.ok(!smtp.includes('mateo'), smtp);
  assert.ok(!motifDe(new Error('550 mateo@example.com: unknown user')).includes('mateo'));
  // JSON.parse cite un morceau de ce qu'il n'a pas su lire : celui d'un fichier des comptes, d'une réponse.
  let illisible: unknown;
  try {
    JSON.parse('mateo@example.com a écrit ceci');
  } catch (erreur) {
    illisible = erreur;
  }
  const json = motifDe(illisible);
  assert.match(json, /^SyntaxError : /);
  assert.ok(!json.includes('mateo') && !json.includes('écrit'), json);
  // Un lien, où voyage ce qu'on a cherché dans le bac : effacé.
  const lien = motifDe(new TypeError('Failed to parse URL from https://api.deezer.com/search/playlist?q=mes%20ann%C3%A9es%20lyc%C3%A9e'));
  assert.equal(lien, 'TypeError : Failed to parse URL from …');
  // Le code d'une erreur du système, et ce qui l'a causée.
  const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), { code: 'ECONNREFUSED' });
  assert.match(
    motifDe(new TypeError('fetch failed', { cause })),
    /^TypeError : fetch failed \(à cause de Error ECONNREFUSED : connect ECONNREFUSED /,
  );
  // Ce qu'on jette d'autre qu'une erreur : on n'en écrit rien.
  assert.equal(motifDe('mateo@example.com'), 'une erreur sans classe');
  // Une ligne, pas plus longue que ce que le réseau lui laisse.
  const long = motifDe(new Error(`une ligne\nune autre ${'x'.repeat(1000)}`));
  assert.ok(!long.includes('\n') && long.length <= RESEAU.journal.motifAuPlus + 1, `${long.length} signes`);
});
