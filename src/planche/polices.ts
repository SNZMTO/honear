/**
 * Les polices du site, lues dans le dossier polices/ : pour l'encrier des planches, qui en trace les lettres, et pour les pages
 * qui les embarquent. C'est le seul module du projet qui ouvre ces fichiers.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARACTERES, ROLES_DE_TEXTE, type Caractere } from '../ressources/typo';
import { encrier, type Encrier } from '../scene/rendu/texte';

const DOSSIER_DES_POLICES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'polices');

/** Le contenu d'un fichier de police, par son nom. */
export function lireUnePolice(fichier: string): ArrayBuffer {
  const octets = readFileSync(join(DOSSIER_DES_POLICES, fichier));
  return octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength);
}

/** @param langue code de la langue des textes à tracer. */
export const chargerLEncrier = (langue: string): Encrier => encrier(CARACTERES, lireUnePolice, langue);

/** Les caractères du site, un par rôle de la typo : le titrage, le technique et le technique fort. */
const LES_CARACTERES: readonly Caractere[] = ROLES_DE_TEXTE.map((role) => CARACTERES[role]);

/**
 * Les polices du site en base 64, par nom de fichier, telles qu'une page les embarque.
 * @param usage « trace » : les fichiers dont le script d'une page tire le tracé des textes de la scène ; « web » : ceux, plus légers,
 * dans lesquels le navigateur écrit les textes de la page.
 */
export const policesEnBase64 = (usage: 'trace' | 'web'): Record<string, string> =>
  Object.fromEntries(
    LES_CARACTERES.map((caractere) => [caractere[usage], readFileSync(join(DOSSIER_DES_POLICES, caractere[usage])).toString('base64')]),
  );
