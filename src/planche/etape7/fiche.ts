/**
 * La fiche d'une animation, telle que la planche l'écrit à côté de sa scène : ses réglages (raideur et amortissement, ou durée
 * et courbe), la liste de ses temps, ses coups et ses vibrations, et sa frise des temps. Tout vient du geste : rien n'est recopié.
 * La frise n'existe qu'ici : nulle part ailleurs le jeu ne montre de ligne du temps.
 */

import { tempsDArrivee } from '../../mouvement/ressort';
import { dureeDuPas, finDuGeste, type Geste, type RegleDuPas } from '../../scene/gestes/geste';
import { remplir } from '../../scene/phrases';
import { enXml } from '../../scene/rendu/balisage';
import type { Animation } from '../animations';
import { valeursA } from '../animations';
import { ecrire } from '../nombres.fr';
import { LEGENDES_DE_LA_PLANCHE as L } from './legendes.fr';

/** Un pas du geste, à plat : la grandeur qu'il mène, quand il part, où il va, ce qui le porte, et le temps qu'il met. */
export interface PasDeLaFiche {
  readonly grandeur: string;
  readonly a: number;
  readonly arrivee: number;
  readonly regle: RegleDuPas | undefined;
  readonly duree: number;
}

/** Tous les pas d'un geste, rangés par instant de départ ; à partir d'un instant, si on le dit. */
export function pasDuGeste(geste: Geste<string>, depuis = -Infinity): PasDeLaFiche[] {
  return Object.entries(geste.roles)
    .flatMap(([grandeur, role]) =>
      role.pas.filter((p) => p.a >= depuis).map((p) => ({ grandeur, a: p.a, arrivee: p.arrivee, regle: p.regle, duree: dureeDuPas(p) })),
    )
    .sort((x, y) => x.a - y.a || x.grandeur.localeCompare(y.grandeur));
}

/** Les réglages distincts d'un geste, et les grandeurs que chacun porte : un ressort n'est écrit qu'une fois. */
export function reglagesDuGeste(geste: Geste<string>): { readonly regle: RegleDuPas; readonly grandeurs: readonly string[] }[] {
  const parRegle = new Map<string, { regle: RegleDuPas; grandeurs: Set<string> }>();
  for (const p of pasDuGeste(geste)) {
    if (p.regle === undefined) continue;
    const cle = JSON.stringify(p.regle);
    const deja = parRegle.get(cle) ?? { regle: p.regle, grandeurs: new Set<string>() };
    deja.grandeurs.add(p.grandeur);
    parRegle.set(cle, deja);
  }
  return [...parRegle.values()].map(({ regle, grandeurs }) => ({ regle, grandeurs: [...grandeurs] }));
}

/** Un instant ou une durée, écrit pour qu'on le lise : en ms jusqu'à la seconde, en s au-delà. */
export const enTemps = (secondes: number): string =>
  Math.abs(secondes) < 1 ? remplir(L.unites.ms, { n: ecrire(secondes * 1000) }) : remplir(L.unites.s, { n: ecrire(secondes, 2) });

/** Un réglage, en une phrase : raideur et amortissement, ou durée et courbe. Un ressort dit en combien de temps il arrive. */
export function direLaRegle(regle: RegleDuPas): string {
  const R = L.regles;
  switch (regle.genre) {
    case 'ressort':
      return remplir(R.ressort, {
        raideur: ecrire(regle.ressort.raideur, 1),
        amortissement: ecrire(regle.ressort.amortissement, 1),
        masse: ecrire(regle.ressort.masse, 2),
        duree: enTemps(tempsDArrivee(regle.ressort)),
      });
    case 'glissade':
      return remplir(R.glissade, { frein: ecrire(regle.frein), duree: enTemps(regle.duree) });
    case 'chute':
      return remplir(R.chute, { duree: enTemps(regle.duree) });
    case 'loi':
      return remplir(R.loi[regle.courbe], { duree: enTemps(regle.duree) });
  }
}

// ————— La frise —————

/** La géométrie de la frise : la place des noms, une ligne par grandeur, la marge sous l'axe. En px de son dessin. */
const FRISE = { largeur: 640, noms: 104, droite: 24, ligne: 14, haut: 8, axe: 22, barre: 8, bout: 2 } as const;

/** Les graduations de l'axe des temps : tous les 100 ms jusqu'à une seconde, toutes les 500 ms au-delà. */
const graduations = (fin: number): number[] => {
  const pas = fin <= 1 ? 0.1 : fin <= 3 ? 0.25 : 0.5;
  return Array.from({ length: Math.floor(fin / pas) + 1 }, (_, i) => i * pas);
};

/**
 * La frise d'un geste : une ligne par grandeur qui bouge, chaque pas de son départ au temps qu'il met, les vibrations, l'instant
 * de l'interruption, et un curseur que la planche fait avancer pendant qu'elle joue.
 * @param fin l'instant où s'arrête l'axe, le même pour les deux frises d'une animation : le curseur s'y lit pareil.
 */
function frise(geste: Geste<string>, fin: number, quoi: 'geste' | 'reprise', interruption: number, depuis = -Infinity): string {
  const pas = pasDuGeste(geste, depuis);
  const grandeurs = [...new Set(pas.map((p) => p.grandeur))];
  const vibrations = (geste.vibrations ?? []).filter((v) => v >= depuis);
  const lignes = [...grandeurs, ...(vibrations.length > 0 ? [L.fiche.vibreur] : [])];
  const hauteur = FRISE.haut + lignes.length * FRISE.ligne + FRISE.axe;
  const piste = FRISE.largeur - FRISE.noms - FRISE.droite;
  const x = (t: number): number => FRISE.noms + (Math.max(0, Math.min(fin, t)) / fin) * piste;
  const y = (rang: number): number => FRISE.haut + rang * FRISE.ligne;
  const barres = pas
    .map((p) => {
      const rang = grandeurs.indexOf(p.grandeur);
      const largeur = Math.max(FRISE.bout, x(p.a + p.duree) - x(p.a));
      const genre = p.regle?.genre ?? 'loi';
      const titre = `${p.grandeur} : ${enTemps(p.a)}${p.regle !== undefined ? `, ${direLaRegle(p.regle)}` : ''}`;
      return `<rect class="pas ${genre}" x="${x(p.a).toFixed(1)}" y="${(y(rang) + (FRISE.ligne - FRISE.barre) / 2).toFixed(1)}" width="${largeur.toFixed(1)}" height="${FRISE.barre}" rx="2"><title>${enXml(titre)}</title></rect>`;
    })
    .join('');
  const noms = lignes.map((nom, rang) => `<text class="nom" x="${FRISE.noms - 8}" y="${y(rang) + FRISE.ligne - 4}">${enXml(nom)}</text>`).join('');
  const rangDuVibreur = grandeurs.length;
  const vibre = vibrations
    .map(
      (v) =>
        `<rect class="vibre" x="${(x(v) - 1).toFixed(1)}" y="${y(rangDuVibreur) + 2}" width="2" height="${FRISE.ligne - 4}"><title>${enXml(enTemps(v))}</title></rect>`,
    )
    .join('');
  const bas = FRISE.haut + lignes.length * FRISE.ligne;
  const axe = graduations(fin)
    .map(
      (t) =>
        `<line class="graduation" x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${FRISE.haut - 4}" y2="${bas + 4}"/><text class="temps" x="${x(t).toFixed(1)}" y="${bas + 16}">${enXml(enTemps(t))}</text>`,
    )
    .join('');
  const coupure = `<line class="interruption" x1="${x(interruption).toFixed(1)}" x2="${x(interruption).toFixed(1)}" y1="${FRISE.haut - 6}" y2="${bas + 4}"/>`;
  const curseur = `<line class="curseur" data-curseur x1="0" x2="0" y1="${FRISE.haut - 6}" y2="${bas + 4}" transform="translate(${x(0).toFixed(1)} 0)"/>`;
  return `<svg class="frise" data-frise="${quoi}" data-fin="${fin}" data-gauche="${FRISE.noms}" data-piste="${piste}" viewBox="0 0 ${FRISE.largeur} ${hauteur}" role="img" aria-label="${enXml(quoi === 'geste' ? L.fiche.frise : remplir(L.fiche.reprise, { instant: enTemps(interruption) }))}">${axe}${coupure}${noms}${barres}${vibre}${curseur}</svg>`;
}

/** Le tableau de tous les pas, un par ligne. */
function tableauDesPas(geste: Geste<string>): string {
  const C = L.fiche.colonnes;
  const lignes = pasDuGeste(geste)
    .map(
      (p) =>
        `<tr><td>${enXml(p.grandeur)}</td><td>${enXml(enTemps(p.a))}</td><td>${enXml(ecrire(p.arrivee, 1))}</td><td>${enXml(p.regle !== undefined ? direLaRegle(p.regle) : '—')}</td><td>${enXml(enTemps(p.a + p.duree))}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>${C.grandeur}</th><th>${C.part}</th><th>${C.va}</th><th>${C.porte}</th><th>${C.arrive}</th></tr></thead><tbody>${lignes}</tbody></table>`;
}

/** Tout ce que la fiche d'une animation écrit : réglages, coups, vibrations, frises, et le tableau des pas. */
export function ficheDeLAnimation(animation: Animation): string {
  const { geste, interruption } = animation;
  const reprise = animation.interrompre(interruption.a, valeursA(animation, interruption.a));
  const fin = Math.max(finDuGeste(geste), finDuGeste(reprise), interruption.a) + FIN_DE_L_AXE;
  const reglages = reglagesDuGeste(geste)
    .map(
      ({ regle, grandeurs }) =>
        `<li><span class="regle ${regle.genre}">${enXml(L.regles.court[regle.genre])}</span> ${enXml(direLaRegle(regle))} <span class="pour">${enXml(remplir(L.regles.pour, { grandeurs: grandeurs.join(', ') }))}</span></li>`,
    )
    .join('');
  const coups = (geste.coups ?? []).map((c) => remplir(L.fiche.coup, { grandeur: c.grandeur, instant: enTemps(c.a), vitesse: ecrire(c.vitesse, 1) }));
  const vibrations = geste.vibrations ?? [];
  return [
    `<h3>${enXml(L.fiche.reglages)}</h3><ul class="reglages">${reglages}</ul>`,
    coups.length > 0 ? `<p class="coups">${enXml(L.fiche.coups)} : ${coups.map(enXml).join(' ; ')}.</p>` : '',
    vibrations.length > 0 ? `<p class="coups">${enXml(remplir(L.fiche.vibre, { instants: vibrations.map(enTemps).join(', ') }))}</p>` : '',
    // Sur un téléphone, la frise garde une taille où ses noms se lisent : elle défile de côté.
    `<h3>${enXml(L.fiche.frise)}</h3><div class="defile">${frise(geste, fin, 'geste', interruption.a)}</div>`,
    `<h3>${enXml(remplir(L.fiche.reprise, { instant: enTemps(interruption.a) }))}</h3><div class="defile">${frise(reprise, fin, 'reprise', interruption.a, interruption.a)}</div>`,
    `<details><summary>${enXml(L.fiche.tous)}</summary>${tableauDesPas(geste)}</details>`,
  ].join('');
}

/** Ce que l'axe des temps garde après le dernier pas : de quoi voir le geste se poser. */
const FIN_DE_L_AXE = 0.1;
