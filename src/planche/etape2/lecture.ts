/**
 * Ce qu'il faut lire des relevés du banc : pour chaque ralenti, ce que la scène entière demande par image, puis ce que
 * chaque allègement y gagne, au premier dessin et par image. Les phrases sont tirées des relevés eux-mêmes : quand un allègement
 * n'apporte rien qu'on sache mesurer, elles le disent.
 */

import { PHASES_DE_PISTE } from '../../regles/piste';
import { remplir } from '../../scene/phrases';
import { ecrire } from '../nombres.fr';
import { FLUIDITE, type Banc, type ReleveDeBanc } from './banc';
import { LEGENDES } from './legendes.fr';

const L = LEGENDES.mesures.lecture;

/**
 * En deçà, un écart avec la scène entière ne se mesure pas sur ce banc : deux relevés du même code, pris à la suite, ne le retrouvent
 * pas tous les deux. Pour le premier dessin, combien de fois plus court : d'un relevé à l'autre, le même rapport a bougé
 * de 1,18 fois. Pour le travail par image, quelle part de celui de la scène entière : le même gain a bougé de 9 points, et celui
 * de 10 % que l'un des relevés donnait au mode léger, l'autre ne l'a pas vu. On ne tient pour mesuré qu'un gain une fois et demie
 * plus grand.
 */
export const MESURABLE = { dessin: 1.3, travail: 0.15 } as const;

/** Ce qu'un allègement change à la scène entière, au premier dessin puis par image : la phrase du cas où il tombe. */
function gainDe(allegee: ReleveDeBanc, entiere: ReleveDeBanc): string {
  const fois = entiere.montage / allegee.montage;
  const ms = entiere.fil - allegee.fil;
  const dessin = fois >= MESURABLE.dessin ? 'plusCourt' : 'inchange';
  const travail = Math.abs(ms) < MESURABLE.travail * entiere.fil ? 'pareil' : ms > 0 ? 'moins' : 'plus';
  return remplir(L.allegement[dessin][travail], {
    scene: LEGENDES.mesures.banc.scenes[allegee.scene],
    fois: ecrire(fois, 1),
    ms: ecrire(Math.abs(ms), 1),
  });
}

/** Le paragraphe d'un banc : la scène entière, puis chaque allègement. */
function lectureDUnBanc(banc: Banc): string {
  const entiere = banc.releves.find((releve) => releve.scene === 'entiere');
  if (entiere === undefined) throw new Error(`Le banc ralenti ${banc.ralenti} fois n'a pas mesuré la scène entière.`);
  const pourLaSceneEntiere = remplir(L.entiere, {
    ralenti: ecrire(banc.ralenti),
    fil: ecrire(entiere.fil, 1),
    script: ecrire(entiere.script, 1),
    intervalle: ecrire(1000 / FLUIDITE.cadence, 1),
    longues: ecrire(Math.max(...PHASES_DE_PISTE.map((phase) => entiere[phase].longues)), 1),
  });
  return [pourLaSceneEntiere, ...banc.releves.filter((releve) => releve !== entiere).map((releve) => gainDe(releve, entiere))].join(
    L.entreDeuxPhrases,
  );
}

/** Ce que « rien de mesurable » veut dire sur ce banc. */
const seuils = (): string => remplir(L.seuils, { fois: ecrire(MESURABLE.dessin, 2), part: ecrire(MESURABLE.travail * 100) });

/** @returns un paragraphe par banc, puis ce qu'on y tient pour mesurable, et ce que ces bancs ne disent pas. Rien s'il n'y a pas de relevé. */
export const lectureDesBancs = (bancs: readonly Banc[]): string[] => (bancs.length === 0 ? [] : [...bancs.map(lectureDUnBanc), seuils(), L.limite]);
