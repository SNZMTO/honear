/**
 * Les mots de passe des comptes, au serveur : on n'en garde qu'une empreinte scrypt, salée, lente à calculer exprès (jamais le mot
 * de passe), et on vérifie un mot de passe contre elle en temps constant. L'empreinte dit ses réglages : on pourra les durcir sans
 * perdre celles d'avant. Le calcul se fait hors du fil du jeu (dans la réserve de fils de Node) : les parties ne l'attendent pas.
 */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { motDePasseNormal } from '../regles/mot-de-passe';
import { RESEAU } from '../ressources/reseau';

const S = RESEAU.comptes.motDePasse.scrypt;
const SORTE = 'scrypt';

/** Ce que scrypt demande de mémoire, par bloc et par unité de coût : 128 octets (sa mémoire est 128 × coût × blocs). */
const OCTETS = 128;

/** Une empreinte telle qu'on l'écrit : « scrypt$coût$blocs$parallèle$sel$empreinte », sel et empreinte en base 64 pour les adresses. */
const FORME = /^scrypt\$(\d{1,8})\$(\d{1,3})\$(\d{1,3})\$([A-Za-z0-9_-]{16,128})\$([A-Za-z0-9_-]{16,256})$/;

function deriver(motDePasse: string, sel: Buffer, longueur: number, reglages: ScryptOptions): Promise<Buffer> {
  return new Promise((ok, ko) => {
    scrypt(motDePasseNormal(motDePasse), sel, longueur, reglages, (erreur, cle) => (erreur !== null ? ko(erreur) : ok(cle)));
  });
}

/** L'empreinte d'un mot de passe, avec un sel neuf. */
export async function hacherUnMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(S.sel);
  const cle = await deriver(motDePasse, sel, S.longueur, { N: S.cout, r: S.blocs, p: S.parallele, maxmem: S.memoire });
  return [SORTE, S.cout, S.blocs, S.parallele, sel.toString('base64url'), cle.toString('base64url')].join('$');
}

/** Est-ce une empreinte de mot de passe telle qu'on les écrit (pour relire le fichier des comptes) ? */
export const estUneEmpreinteDeMotDePasse = (x: unknown): x is string => typeof x === 'string' && FORME.test(x);

/**
 * Vrai si ce mot de passe est celui de cette empreinte. Une empreinte mal formée, ou aux réglages hors de ce qu'on sait calculer sans
 * peine, ne laisse entrer personne.
 */
export async function verifierUnMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  const [, cout, blocs, parallele, sel, cle] = FORME.exec(empreinte) ?? [];
  if (cout === undefined || blocs === undefined || parallele === undefined || sel === undefined || cle === undefined) return false;
  const [N, r, p] = [Number(cout), Number(blocs), Number(parallele)];
  // Un coût est une puissance de deux ; on ne calcule pas une empreinte qui demanderait plus de mémoire ou de temps que les nôtres.
  if (N < 2 || (N & (N - 1)) !== 0 || r < 1 || p < 1 || p > S.paralleleAuPlus || OCTETS * N * r > S.memoire) return false;
  const attendue = Buffer.from(cle, 'base64url');
  try {
    const calculee = await deriver(motDePasse, Buffer.from(sel, 'base64url'), attendue.length, { N, r, p, maxmem: S.memoire });
    return calculee.length === attendue.length && timingSafeEqual(calculee, attendue);
  } catch {
    return false;
  }
}
