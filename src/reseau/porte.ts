/**
 * La porte du site : la page du jeu, servie à l'adresse du site et à celle d'une room (« /AENV », ce que donne le QR code), les pages
 * légales, l'état du serveur pour qui le surveille, la page des statistiques et ce qu'elle montre à qui en a la clé, et rien
 * d'autre. Chaque page est servie avec une politique de sécurité stricte : ses seuls scripts sont ceux qu'elle porte, reconnus à
 * leur empreinte ; elle ne parle qu'à son propre serveur, et la page du jeu n'écoute que les extraits de Deezer.
 */

import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PARTIE } from '../ressources/reglages';
import { ADRESSES_DES_STATISTIQUES } from '../ressources/statistiques';

/** D'où viennent les extraits que le téléphone joue : les serveurs de Deezer qui les diffusent, et le silence qui débloque le son. */
const EXTRAITS = 'https://*.dzcdn.net blob:';
/** Les images : celles de la page, et les vraies pochettes, que Deezer sert de chez lui. */
const IMAGES = "'self' data: blob: https://*.dzcdn.net";

/** Ce que la porte sert : la page, déjà fabriquée, les pages légales par leur adresse, et ce que le serveur dit de lui-même. */
export interface Contenus {
  readonly page: string;
  readonly legales?: Readonly<Record<string, string>>;
  /** Les fichiers de l'application (son manifeste, son icône), par leur adresse : leur type, et ce qu'ils contiennent. */
  readonly fichiers?: Readonly<Record<string, { readonly type: string; readonly contenu: string }>>;
  readonly sante: () => Readonly<Record<string, number | string | boolean>>;
  /**
   * La page des statistiques, et ce qu'elle montre (en JSON) à qui donne la clé : rien, à qui ne la donne pas, ou si le site n'en a
   * pas. Sans elles, l'adresse ne mène à rien.
   */
  readonly statistiques?: { readonly page: string; readonly donnees: (cle: string | undefined) => string | undefined };
  /** Une page du jeu servie à un navigateur : à l'accueil, ou à l'adresse d'une room (le QR code, un lien). Pour les statistiques. */
  readonly quandUnePage?: (requete: IncomingMessage, room: boolean) => void;
}

/** La clé qu'une requête donne, comme on donne un jeton : « Authorization: Bearer … ». */
function cleDe(requete: IncomingMessage): string | undefined {
  const autorisation = requete.headers.authorization;
  return /^Bearer ([A-Za-z0-9_-]{16,128})$/.exec(autorisation ?? '')?.[1];
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
    // Les polices embarquées dans le script, données à la feuille de la page (le tutoriel, les liens du bas).
    'font-src data:',
    `img-src ${IMAGES}`,
    `media-src ${EXTRAITS}`,
    "connect-src 'self'",
    "manifest-src 'self'",
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
  // La page des statistiques : ses scripts à elle, ses polices embarquées, et ce qu'elle demande à son serveur. Hors des moteurs.
  const S = contenus.statistiques;
  const enTetesDesStatistiques = {
    ...enTetes,
    'Content-Security-Policy': [
      "default-src 'none'",
      `script-src ${S !== undefined ? empreintesDesScripts(S.page).join(' ') : "'none'"}`,
      "style-src 'unsafe-inline'",
      'font-src data:',
      'img-src data:',
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'no-store',
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
    if (S !== undefined && chemin === ADRESSES_DES_STATISTIQUES.page) {
      reponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...enTetesDesStatistiques });
      reponse.end(requete.method === 'HEAD' ? undefined : S.page);
      return;
    }
    if (S !== undefined && chemin === ADRESSES_DES_STATISTIQUES.donnees) {
      const donnees = S.donnees(cleDe(requete));
      if (donnees === undefined) {
        reponse.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8', 'WWW-Authenticate': 'Bearer', ...enTetesDesStatistiques });
        reponse.end(requete.method === 'HEAD' ? undefined : 'Clé manquante, ou ce n’est pas la bonne.');
        return;
      }
      reponse.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...enTetesDesStatistiques });
      reponse.end(requete.method === 'HEAD' ? undefined : donnees);
      return;
    }
    const legale = contenus.legales?.[chemin];
    if (legale !== undefined) {
      reponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ...enTetes });
      reponse.end(requete.method === 'HEAD' ? undefined : legale);
      return;
    }
    const fichier = contenus.fichiers?.[chemin];
    if (fichier !== undefined) {
      reponse.writeHead(200, { 'Content-Type': fichier.type, 'Cache-Control': 'no-cache', ...enTetes });
      reponse.end(requete.method === 'HEAD' ? undefined : fichier.contenu);
      return;
    }
    if (chemin !== '/' && !ADRESSE_D_UNE_ROOM.test(chemin)) {
      reponse
        .writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...enTetes })
        .end(requete.method === 'HEAD' ? undefined : 'Rien à cette adresse.');
      return;
    }
    // Une page du jeu ouverte (ou rechargée) : à l'accueil, ou à l'adresse d'une room.
    if (requete.method === 'GET') contenus.quandUnePage?.(requete, chemin !== '/');
    // La page change à chaque mise en ligne : le navigateur la redemande, et ne la recharge que si elle a changé.
    if (requete.headers['if-none-match'] === etiquette) {
      reponse.writeHead(304, { ETag: etiquette, ...enTetes }).end();
      return;
    }
    reponse.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ETag: etiquette, ...enTetes });
    reponse.end(requete.method === 'HEAD' ? undefined : contenus.page);
  };
}
