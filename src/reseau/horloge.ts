/**
 * L'horloge du serveur : le seul endroit, côté serveur, qui lit l'heure. Elle est régulière (elle ne recule jamais, même si
 * la machine se remet à l'heure) et compte en secondes depuis le démarrage : c'est l'heure de la partie, pour tous les téléphones.
 */

export const horlogeDuServeur = (): (() => number) => {
  const depart = performance.now();
  return () => (performance.now() - depart) / 1000;
};

/** L'heure du monde, en secondes depuis 1970 : celle que portent les liens signés des extraits, pour savoir quand ils expirent. */
export const heureDuMonde = (): number => Date.now() / 1000;

/** L'heure du monde, écrite comme le courrier l'écrit dans un message (« Sun, 11 Oct 2026 22:30:00 +0000 »). */
export const dateDuCourrier = (): string => new Date().toUTCString().replace(/GMT$/, '+0000');
