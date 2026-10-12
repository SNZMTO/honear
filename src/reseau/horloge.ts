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

/**
 * Un instant lu à l'heure d'un fuseau : son jour (« 2026-10-12 »), son heure (de 0 à 23) et sa minute, son jour de la semaine
 * (0 le dimanche).
 */
export interface InstantLocal {
  readonly jour: string;
  readonly heure: number;
  readonly minute: number;
  readonly semaine: number;
}

/** Le jour de la semaine d'un jour du calendrier (0 le dimanche). */
const jourDeLaSemaine = (jour: string): number => new Date(`${jour}T12:00:00Z`).getUTCDay();

/**
 * Les instants du monde (en secondes depuis 1970), lus à l'heure d'un fuseau : c'est ainsi que les statistiques rangent ce qui se
 * passe, à l'heure de ceux qui jouent.
 */
export function aLHeureDe(fuseau: string): (secondes: number) => InstantLocal {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuseau,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return (secondes) => {
    const parties = format.formatToParts(new Date(secondes * 1000));
    const partie = (type: Intl.DateTimeFormatPartTypes): string => parties.find((p) => p.type === type)?.value ?? '';
    const jour = `${partie('year')}-${partie('month')}-${partie('day')}`;
    return { jour, heure: Number(partie('hour')), minute: Number(partie('minute')), semaine: jourDeLaSemaine(jour) };
  };
}

/** Les jours du calendrier, de l'un à l'autre compris (« 2026-10-01 » … « 2026-10-12 »), avec leur jour de la semaine. */
export function joursDu(du: string, au: string): { readonly jour: string; readonly semaine: number }[] {
  const jours: { readonly jour: string; readonly semaine: number }[] = [];
  const fin = new Date(`${au}T12:00:00Z`).getTime();
  for (let t = new Date(`${du}T12:00:00Z`).getTime(); t <= fin && Number.isFinite(t); t += UN_JOUR) {
    const jour = new Date(t).toISOString().slice(0, 10);
    jours.push({ jour, semaine: jourDeLaSemaine(jour) });
  }
  return jours;
}

/** Un jour, en millisecondes. */
const UN_JOUR = 86400000;

/** L'heure du monde, écrite comme le courrier l'écrit dans un message (« Sun, 11 Oct 2026 22:30:00 +0000 »). */
export const dateDuCourrier = (): string => new Date().toUTCString().replace(/GMT$/, '+0000');
