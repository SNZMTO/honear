/**
 * Ce que le site demande à un navigateur pour montrer le meuble. S'il lui manque quelque chose, on le dit
 * d'une phrase, à l'ouverture, plutôt que de montrer un écran cassé.
 */

/** Ce qui peut manquer à un navigateur : une toile où figer le décor, les tracés des lettres, les images animées, le SVG. */
export type Manque = 'toile' | 'traces' | 'images' | 'svg';

/** @returns ce qui manque à ce navigateur ; rien s'il sait tout faire. C'est le fichier de textes qui sait le dire. */
export function ceQuiManqueAuNavigateur(): Manque[] {
  const manques: Manque[] = [];
  // Une toile qui ne donne pas de contexte, ou qui ne sait même pas ce que c'est : dans les deux cas, on ne peut pas y peindre.
  const toile = document.createElement('canvas');
  if (typeof toile.getContext !== 'function' || toile.getContext('2d') === null) manques.push('toile');
  try {
    // Un tracé écrit comme dans un SVG : c'est ainsi que les lettres sont figées sur une toile.
    if (typeof Path2D === 'undefined' || !(new Path2D('M0 0L1 1Z') instanceof Path2D)) manques.push('traces');
  } catch {
    manques.push('traces');
  }
  if (typeof window.requestAnimationFrame !== 'function') manques.push('images');
  if (typeof document.createElementNS !== 'function' || !('transform' in document.createElementNS('http://www.w3.org/2000/svg', 'g')))
    manques.push('svg');
  return manques;
}

/** La question qu'on pose à l'appareil, dans les mots de la norme : a-t-on demandé de réduire les animations ? */
const ANIMATIONS_REDUITES = '(prefers-reduced-motion: reduce)';

/** Vrai si la personne a demandé à son appareil de réduire les animations. */
export const animationsReduites = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(ANIMATIONS_REDUITES).matches;

/**
 * Prévient chaque fois que la personne change d'avis en route : elle demande à son appareil de réduire les animations, ou y renonce.
 * Un navigateur qui ne sait pas le dire ne prévient jamais.
 * @returns de quoi cesser d'écouter.
 */
export function suivreLesAnimationsReduites(auChangement: (reduites: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const demande = window.matchMedia(ANIMATIONS_REDUITES);
  const ecouteur = (): void => auChangement(demande.matches);
  // Les navigateurs d'il y a cinq ans n'écoutent pas tous une demande de la façon d'aujourd'hui : l'ancienne leur reste.
  if (typeof demande.addEventListener === 'function') {
    demande.addEventListener('change', ecouteur);
    return () => demande.removeEventListener('change', ecouteur);
  }
  demande.addListener(ecouteur);
  return () => demande.removeListener(ecouteur);
}

/** Px de l'appareil par px de la page. */
export const densiteDeLEcran = (): number => window.devicePixelRatio || 1;
