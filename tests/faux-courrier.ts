/**
 * Un faux serveur d'envoi (SMTP, en clair), sur un port de la machine : il dit oui à tout, garde ce qu'on lui a dit et les lettres
 * qu'on lui a remises, décodées. De quoi essayer le courrier du site sans rien envoyer.
 */

import { createServer, type Socket } from 'node:net';

export interface LettreRecue {
  readonly de: string;
  readonly a: string;
  /** Les en-têtes, et les deux versions du corps, décodées. */
  readonly entetes: Readonly<Record<string, string>>;
  readonly texte: string;
  readonly html: string;
}

/** Les deux versions d'un message en deux parties, en base 64, décodées. */
function corps(message: string): { readonly texte: string; readonly html: string } {
  const parties = message.split(/\r\n--miel-[0-9a-f]+(?:--)?\r\n/).slice(1);
  const lire = (genre: string): string => {
    const partie = parties.find((p) => p.startsWith(`Content-Type: text/${genre}`)) ?? '';
    return Buffer.from(partie.split('\r\n\r\n')[1]?.replace(/\r\n/g, '') ?? '', 'base64').toString('utf8');
  };
  return { texte: lire('plain'), html: lire('html') };
}

/** @param refuser le code que le serveur répond à l'identification, s'il la refuse (535). */
export async function unFauxServeurDEnvoi(refuser?: number) {
  const lettres: LettreRecue[] = [];
  const dialogues: string[][] = [];
  const serveur = createServer((socket: Socket) => {
    const dit: string[] = [];
    dialogues.push(dit);
    let tampon = '';
    let enDonnees = false;
    let de = '';
    let a = '';
    socket.setEncoding('utf8');
    socket.write('220 faux.exemple ESMTP\r\n');
    socket.on('data', (morceau: string) => {
      tampon += morceau;
      for (;;) {
        if (enDonnees) {
          const fin = tampon.indexOf('\r\n.\r\n');
          if (fin < 0) return;
          const message = tampon.slice(0, fin + 2);
          tampon = tampon.slice(fin + 5);
          enDonnees = false;
          const [tete = ''] = message.split('\r\n\r\n');
          const entetes = Object.fromEntries(
            tete.split('\r\n').map((l) => [l.slice(0, l.indexOf(':')).toLowerCase(), l.slice(l.indexOf(':') + 1).trim()]),
          );
          lettres.push({ de, a, entetes, ...corps(message) });
          socket.write('250 2.0.0 Gardée\r\n');
          continue;
        }
        const fin = tampon.indexOf('\r\n');
        if (fin < 0) return;
        const ligne = tampon.slice(0, fin);
        tampon = tampon.slice(fin + 2);
        dit.push(ligne);
        const verbe = ligne.split(' ')[0]?.toUpperCase();
        if (verbe === 'EHLO') socket.write('250-faux.exemple\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n');
        else if (verbe === 'AUTH') socket.write(refuser !== undefined ? `${refuser} 5.7.8 Non\r\n` : '235 2.7.0 Bienvenue\r\n');
        else if (verbe === 'MAIL') {
          de = /<(.*)>/.exec(ligne)?.[1] ?? '';
          socket.write('250 2.1.0 Ok\r\n');
        } else if (verbe === 'RCPT') {
          a = /<(.*)>/.exec(ligne)?.[1] ?? '';
          socket.write('250 2.1.5 Ok\r\n');
        } else if (verbe === 'DATA') {
          enDonnees = true;
          socket.write('354 Vas-y\r\n');
        } else if (verbe === 'QUIT') {
          socket.end('221 2.0.0 Salut\r\n');
          return;
        } else socket.write('502 Connais pas\r\n');
      }
    });
  });
  const port = await new Promise<number>((ecoute) =>
    serveur.listen(0, '127.0.0.1', () => {
      const adresse = serveur.address();
      ecoute(typeof adresse === 'object' && adresse !== null ? adresse.port : 0);
    }),
  );
  return { port, lettres, dialogues, fermer: () => new Promise<void>((fini) => serveur.close(() => fini())) };
}
