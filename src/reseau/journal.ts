/**
 * Le journal du serveur : ce qu'il écrit sur sa sortie d'erreur, que Docker garde (voir HEBERGEMENT.md). D'une erreur, on n'y écrit
 * que sa classe, son code et son motif, sans rien qui soit à quelqu'un : ce qu'elle cite (entre guillemets ou chevrons), les liens et
 * les adresses e-mail en sont effacés, et elle tient sur une ligne. Ni l'adresse d'un joueur, ni ce qu'il a tapé, ni ce qu'un serveur
 * d'envoi ou un fichier en disait n'y entrent.
 */

import { RESEAU } from '../ressources/reseau';

/** Ce qui remplace ce qu'on efface. */
const EFFACE = '…';

/** Un motif d'erreur, tel que le journal peut l'écrire : sans ce qu'il cite, sans lien ni adresse e-mail, sur une ligne. */
const sansRienDePersonnel = (motif: string): string =>
  motif
    .replace(/"[^"]*"|'[^']*'|«[^»]*»|“[^”]*”|<[^>]*>/g, EFFACE)
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, EFFACE)
    .replace(/\S+@\S+/g, EFFACE)
    .replace(/[\u0000-\u001f\u007f]+/g, ' ');

/** Le code d'une erreur du système (« ECONNREFUSED », « UND_ERR_CONNECT_TIMEOUT »), s'il en a un. */
function codeDe(erreur: Error): string {
  const code = 'code' in erreur ? erreur.code : undefined;
  return typeof code === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(code) ? ` ${code}` : '';
}

/** Ce que le journal dit d'une erreur : sa classe et son code, son motif, et ce qui l'a causée ; rien de ce qu'on a jeté d'autre. */
export function motifDe(erreur: unknown): string {
  if (!(erreur instanceof Error)) return 'une erreur sans classe';
  const cause = erreur.cause instanceof Error ? ` (à cause de ${erreur.cause.name}${codeDe(erreur.cause)} : ${erreur.cause.message})` : '';
  const motif = sansRienDePersonnel(`${erreur.name}${codeDe(erreur)} : ${erreur.message}${cause}`);
  const auPlus = RESEAU.journal.motifAuPlus;
  return motif.length > auPlus ? `${motif.slice(0, auPlus)}${EFFACE}` : motif;
}
