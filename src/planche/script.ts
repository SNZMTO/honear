/**
 * L'assemblage d'un script de page : un module et tout ce qu'il importe, réunis en un seul script que lisent les navigateurs
 * d'un téléphone vieux de cinq ans, avec les polices dont il trace les textes de la scène.
 */

import { build } from 'esbuild';
import { policesEnBase64 } from './polices';

/** Le langage visé : celui que lisent les navigateurs d'un téléphone vieux de cinq ans, et un peu au-delà. */
export const CIBLE = 'es2019';

/**
 * Un caractère de commande, et les barres obliques qui le précèdent : la minification laisse de tels caractères, tels quels,
 * dans les chaînes des paquets qu'elle embarque.
 */
const COMMANDE = /(\\*)([\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F])/g;

/**
 * Écrit un script pour le poser entre deux balises d'une page. Un script s'y arrête à la première balise qui le ferme, même au milieu
 * d'une chaîne ; et un caractère de commande resté tel quel est un octet que ce qui transporte la page peut refuser, ou retirer.
 * L'une et l'autre sont écrits par leur échappement : le script lit la même chose.
 * @throws si le script échappe lui-même un caractère de commande écrit tel quel : on ne saurait plus l'écrire sans changer ce qu'il lit.
 */
export function pourUnePage(script: string): string {
  return script.replace(/<\/(script)/gi, '<\\/$1').replace(COMMANDE, (_, barres: string, commande: string) => {
    // Des barres en nombre pair s'écrivent elles-mêmes ; une de plus échapperait le caractère qui la suit.
    if (barres.length % 2 === 1) throw new Error('Le script échappe un caractère de commande écrit tel quel : on ne sait pas le récrire.');
    return `${barres}\\x${commande.charCodeAt(0).toString(16).padStart(2, '0')}`;
  });
}

/**
 * @param entree le chemin du module par lequel le script commence. Il y trouve ses polices sous le nom `POLICES` :
 * leurs fichiers en base 64, par nom de fichier.
 * @returns le script, écrit au plus court, prêt à être posé entre deux balises d'une page.
 */
export async function assemblerUnScript(entree: string): Promise<string> {
  const assemble = await build({
    entryPoints: [entree],
    bundle: true,
    format: 'iife',
    target: CIBLE,
    minify: true,
    write: false,
    legalComments: 'none',
    define: { POLICES: JSON.stringify(policesEnBase64('trace')) },
    logLevel: 'warning',
  });
  const [sortie] = assemble.outputFiles;
  if (sortie === undefined) throw new Error(`Le script ${entree} n'a pas été assemblé.`);
  return pourUnePage(sortie.text);
}
