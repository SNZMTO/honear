/**
 * Le courrier : les e-mails que le site envoie, les liens qui font entrer dans un compte. Ils partent par le serveur d'envoi
 * (SMTP) d'une boîte qu'on a déjà : celle qui vient avec le domaine chez OVH, ou un service d'envoi. La connexion est chiffrée
 * d'emblée (le port 465) ; le message porte un texte et sa version HTML, en UTF-8. `composer` écrit le message sans réseau ;
 * `posterParSmtp` le remet au serveur d'envoi, et rien d'autre ici ne parle au réseau.
 */

import { randomBytes } from 'node:crypto';
import { connect as brancherEnClair, isIP, type Socket } from 'node:net';
import { connect as brancherChiffre } from 'node:tls';

/** Une lettre à envoyer : à qui, son sujet, son texte et sa version HTML. */
export interface Lettre {
  readonly a: string;
  readonly sujet: string;
  readonly texte: string;
  readonly html: string;
}

/** De quoi envoyer une lettre ; échoue si elle n'est pas partie. */
export type Poster = (lettre: Lettre) => Promise<void>;

export interface ConfigurationDuCourrier {
  /** Le serveur d'envoi, et son port chiffré : « ssl0.ovh.net », 465. */
  readonly hote: string;
  readonly port: number;
  readonly utilisateur: string;
  readonly motDePasse: string;
  /** L'expéditeur, tel que le destinataire le lit : « Honear <bonjour@honear.fr> », ou l'adresse seule. */
  readonly de: string;
  /** Faux seulement pour les tests, contre un faux serveur d'envoi en clair. */
  readonly chiffre?: boolean;
  /** Ce qu'on laisse au serveur d'envoi pour répondre, en millisecondes. */
  readonly patience: number;
}

/** L'adresse d'un expéditeur écrit « Nom <adresse> », ou l'adresse seule. */
export function adresseDe(expediteur: string): string {
  return (/<([^<>\s]+@[^<>\s]+)>\s*$/.exec(expediteur)?.[1] ?? expediteur).trim();
}

/** Un texte d'en-tête en UTF-8, écrit comme le courrier le veut quand il n'est pas en ASCII simple. */
const enTete = (texte: string): string => (/^[\x20-\x7e]*$/.test(texte) ? texte : `=?UTF-8?B?${Buffer.from(texte, 'utf8').toString('base64')}?=`);

/** Un corps en base 64, en lignes de 76 signes : aucune ne commence par un point, aucune n'est trop longue. */
const enBase64 = (texte: string): string =>
  (
    Buffer.from(texte, 'utf8')
      .toString('base64')
      .match(/.{1,76}/g) ?? []
  ).join('\r\n');

/**
 * Le message tel qu'il part, en-têtes et corps, ses lignes finies par CRLF.
 * @param date l'heure de l'envoi, écrite comme le courrier l'écrit (« Sun, 11 Oct 2026 22:30:00 +0000 »).
 * @param marque un identifiant neuf : celui du message, et la frontière entre ses deux versions.
 */
export function composer(de: string, lettre: Lettre, date: string, marque: string): string {
  const nom = /^(.*?)\s*<[^<>]+>\s*$/.exec(de)?.[1]?.replace(/^"|"$/g, '').trim();
  const expediteur = nom !== undefined && nom !== '' ? `${enTete(nom)} <${adresseDe(de)}>` : adresseDe(de);
  const domaine = adresseDe(de).split('@')[1] ?? 'localhost';
  const frontiere = `honear-${marque}`;
  return [
    `From: ${expediteur}`,
    `To: <${lettre.a}>`,
    `Subject: ${enTete(lettre.sujet)}`,
    `Date: ${date}`,
    `Message-ID: <${marque}@${domaine}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${frontiere}"`,
    '',
    `--${frontiere}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enBase64(lettre.texte),
    `--${frontiere}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enBase64(lettre.html),
    `--${frontiere}--`,
    '',
  ].join('\r\n');
}

/** Ce que le serveur d'envoi répond : son code, et ses lignes. */
interface Reponse {
  readonly code: number;
  readonly lignes: readonly string[];
}

/** Lit les réponses du serveur d'envoi, une à une : une réponse finit à la ligne dont le code est suivi d'une espace. */
function lecteur(socket: Socket): () => Promise<Reponse> {
  let tampon = '';
  let lignes: string[] = [];
  const pretes: Reponse[] = [];
  const attentes: { readonly fini: (r: Reponse) => void; readonly rate: (e: Error) => void }[] = [];
  let erreur: Error | undefined;
  socket.setEncoding('utf8');
  socket.on('data', (morceau: string) => {
    tampon += morceau;
    for (let fin = tampon.indexOf('\r\n'); fin >= 0; fin = tampon.indexOf('\r\n')) {
      const ligne = tampon.slice(0, fin);
      tampon = tampon.slice(fin + 2);
      lignes.push(ligne);
      if (/^\d{3}(?: |$)/.test(ligne)) {
        const reponse = { code: Number(ligne.slice(0, 3)), lignes };
        lignes = [];
        const qui = attentes.shift();
        if (qui !== undefined) qui.fini(reponse);
        else pretes.push(reponse);
      }
    }
  });
  const echouer = (e: Error): void => {
    erreur ??= e;
    for (const qui of attentes.splice(0)) qui.rate(e);
  };
  socket.on('error', echouer);
  socket.on('close', () => echouer(new Error('Le serveur d’envoi a fermé la ligne')));
  return () =>
    new Promise<Reponse>((fini, rate) => {
      const deja = pretes.shift();
      if (deja !== undefined) fini(deja);
      else if (erreur !== undefined) rate(erreur);
      else attentes.push({ fini, rate });
    });
}

/** Remet les lettres au serveur d'envoi : une connexion par lettre (elles sont rares), chiffrée d'emblée. */
export function posterParSmtp(c: ConfigurationDuCourrier, date: () => string): Poster {
  return async (lettre) => {
    if (/[\r\n<>]/.test(lettre.a)) throw new Error('Adresse illisible');
    const socket =
      c.chiffre === false
        ? brancherEnClair({ host: c.hote, port: c.port })
        : brancherChiffre({ host: c.hote, port: c.port, ...(isIP(c.hote) === 0 ? { servername: c.hote } : {}) });
    const muet = (): void => {
      socket.destroy(new Error('Le serveur d’envoi ne répond pas'));
    };
    socket.setTimeout(c.patience, muet);
    const lire = lecteur(socket);
    /** Envoie une commande (rien : on attend le bonjour), et vérifie que la réponse dit oui. */
    const dire = async (commande: string | undefined, attendus: readonly number[]): Promise<void> => {
      if (commande !== undefined) socket.write(`${commande}\r\n`);
      const r = await lire();
      if (!attendus.includes(r.code)) throw new Error(`Le serveur d’envoi refuse (${r.code}) : ${r.lignes.join(' ').slice(0, 200)}`);
    };
    try {
      await dire(undefined, [220]);
      await dire(`EHLO ${adresseDe(c.de).split('@')[1] ?? 'localhost'}`, [250]);
      const identite = Buffer.from(`\u0000${c.utilisateur}\u0000${c.motDePasse}`, 'utf8').toString('base64');
      await dire(`AUTH PLAIN ${identite}`, [235]);
      await dire(`MAIL FROM:<${adresseDe(c.de)}>`, [250]);
      await dire(`RCPT TO:<${lettre.a}>`, [250, 251]);
      await dire('DATA', [354]);
      // Le corps est en base 64 : aucune de ses lignes ne commence par un point, rien n'est à doubler.
      await dire(`${composer(c.de, lettre, date(), randomBytes(12).toString('hex'))}.`, [250]);
      await dire('QUIT', [221]).catch(() => undefined);
    } finally {
      socket.end();
    }
  };
}
