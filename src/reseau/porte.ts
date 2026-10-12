/**
 * La porte du site : la page du jeu, servie à l'adresse du site et à celle d'une room (« /AENV », ce que donne le QR code), l'état du
 * serveur pour qui le surveille, et rien d'autre. La page est servie avec une politique de sécurité stricte : son seul script est
 * celui qu'elle porte, reconnu à son empreinte ; elle ne parle qu'à son propre serveur, et n'écoute que les extraits de Deezer.
 */

import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PARTIE } from '../ressources/reglages';

/** D'où viennent les extraits que le téléphone joue : les serveurs de Deezer qui les diffusent, et le silence qui débloque le son. */
const EXTRAITS = 'https://*.dzcdn.net blob:';
/** Les images : celles de la page, et les vraies pochettes, que Deezer sert de chez lui. */
const IMAGES = 'data: blob: https://*.dzcdn.net';

/** Ce que la porte sert : la page, déjà fabriquée, et ce que le serveur dit de lui-même. */
export interface Contenus {
  readonly page: string;
  readonly sante: () => Readonly<Record<string, number | string | boolean>>;
}

/** L'adresse d'une room : son code, quatre lettres sans ambiguïté. */
const ADRESSE_D_UNE_ROOM = new RegExp(`^/[${PARTIE.code.lettres}]{${PARTIE.code.longueur}}$`, 'i');

/** L'empreinte de chaque script que porte la page : la politique de sécurité n'autorise qu'eux. */
function empreintesDesScripts(page: string): string[] {
  return [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, code = '']) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`);
}

/** Répond à une requête HTTP. La page se sert telle quelle : c'est le relais devant le serveur qui la compresse. */
export function ouvrirLaPorte(contenus: Contenus): (requete: IncomingMessage, reponse: ServerResponse) => void {
  const politique = [
    "default-src 'none'",
    `script-src ${empreintesDesScripts(contenus.page).join(' ')}`,
    "style-src 'unsafe-inline'",
    `img-src ${IMAGES}`,
    `media-src ${EXTRAITS}`,
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  const etiquette = `"${createHash('sha256').update(contenus.page).digest('base64url').slice(0, 27)}"`;
  const enTetes = {
    'Content-Security-Policy': politique,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
  } as const;
  return (requete, reponse) => {
    const chemin = (requete.url ?? '/').split('?')[0] ?? '/';
    const lecture = requete.method === 'GET' || requete.method === 'HEAD';
    if (!lecture) {
      reponse.writeHead(405, { Allow: 'GET, HEAD', ...enTetes }).end();
      return;
    }
    if (chemin === '/sante') {
      reponse.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...enTetes });
      reponse.end(requete.method === 'HEAD' ? undefined : JSON.stringify(contenus.sante()));
      return;
    }
    if (chemin !== '/' && !ADRESSE_D_UNE_ROOM.test(chemin)) {
      reponse
        .writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...enTetes })
        .end(requete.method === 'HEAD' ? undefined : 'Rien à cette adresse.');
      return;
    }
    // La page change à chaque mise en ligne : le navigateur la redemande, et ne la recharge que si elle a changé.
    if (requete.headers['if-none-match'] === etiquette) {
      reponse.writeHead(304, { ETag: etiquette, ...enTetes }).end();
      return;
    }
    reponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etiquette, ...enTetes });
    reponse.end(requete.method === 'HEAD' ? undefined : contenus.page);
  };
}
