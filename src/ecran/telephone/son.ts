/**
 * Le son du téléphone : l'extrait de la piste en cours, joué par son haut-parleur à l'heure du serveur, comme sur tous les autres.
 * `sonVoulu` dit, de la mémoire, ce qu'il faut jouer : rien tant que l'ampli n'est pas allumé, ni chez un invité quand c'est l'hôte
 * qui joue le son pour tous. Le haut-parleur, lui, le joue : il précharge l'extrait pendant le décompte, le démarre à l'heure dite
 * (en route, pour qui arrive en retard), le remet à sa place s'il dérive, et le laisse se taire quand l'écran de la piste s'en va.
 * Un navigateur ne laisse partir un son que dans le geste d'une main : on joue un instant de silence au premier toucher, et le
 * même élément audio peut ensuite jouer tous les extraits (c'est ce que veut l'iPhone).
 */

import { partieA } from '../../regles/partie';
import { jouer } from '../../regles/piste';
import { TELEPHONE } from '../../ressources/ecran';
import { instantsDeLaPiste } from '../../scene/piste/instants';
import type { Memoire } from './memoire';

/** Ce que le haut-parleur doit jouer : l'extrait de la piste lancée à cette heure, et quand. Les heures sont celles du serveur. */
export interface SonVoulu {
  readonly adresse: string;
  /** L'heure du lancer de la piste : c'est pour elle qu'on se dit prêt. */
  readonly lanceeA: number;
  /** L'heure où le début de l'extrait s'entend ; inconnue pendant le décompte : on le précharge. */
  readonly depuis: number | undefined;
  /** L'heure où il s'est tu : quand l'écran de la piste s'en va, la réponse vue. Inconnue avant la révélation. */
  readonly jusqua: number | undefined;
}

/** Ce que le téléphone doit jouer, d'après ce qu'il sait : rien si l'ampli est éteint, si la source n'a pas d'extrait, ou si ce n'est pas à lui de jouer. */
export function sonVoulu(m: Memoire): SonVoulu | undefined {
  const room = m.room;
  if (room === undefined || room.extrait === undefined || m.ampliAllumeA === undefined) return undefined;
  const etat = partieA(room.journal, Infinity);
  if (etat.son === 'hote' && etat.hote !== room.toi) return undefined;
  const piste = room.seance.reduce(jouer, undefined);
  const lanceeA = room.seance.find((a) => a.genre === 'lancer')?.a;
  if (piste === undefined || lanceeA === undefined) return undefined;
  const jusqua = piste.revelation !== undefined ? instantsDeLaPiste(piste).retournement + TELEPHONE.apresLaReponse : undefined;
  return { adresse: room.extrait, lanceeA, depuis: piste.extraitA, jusqua };
}

/** Le volume à cette heure : plein, puis il baisse jusqu'au silence pendant le fondu qui finit à `jusqua`. */
export function volumeA(voulu: SonVoulu, heure: number): number {
  if (voulu.jusqua === undefined) return 1;
  return Math.min(1, Math.max(0, (voulu.jusqua - heure) / TELEPHONE.son.fondu));
}

export interface HautParleur {
  /** À appeler dans le geste d'une main (un toucher, une touche du clavier) : le navigateur laisse alors partir le son, et le laissera. */
  debloquer(): void;
  /** À chaque image : joue, à cette heure du serveur, ce qu'il faut jouer. */
  suivre(voulu: SonVoulu | undefined, heure: number): void;
  /**
   * Vrai quand on peut se dire prêt pour l'extrait de cette adresse : il est chargé, ou il ne le sera pas (son lien ne répond pas,
   * le navigateur refuse le son). Dans ces deux cas, on ne fait pas attendre les autres.
   */
  pret(adresse: string): boolean;
  /** Vrai si le navigateur a refusé de jouer : il attend un toucher. */
  readonly bloque: boolean;
  fermer(): void;
}

/** Un dixième de seconde de silence, en WAV : ce qu'on joue dans le premier geste, pour que le navigateur laisse ensuite le son partir. */
function unSilence(): Blob {
  const FREQUENCE = 8000;
  const ECHANTILLONS = 800;
  const octets = new Uint8Array(44 + ECHANTILLONS);
  const v = new DataView(octets.buffer);
  const ecrire = (a: number, mot: string): void => {
    for (let k = 0; k < mot.length; k++) octets[a + k] = mot.charCodeAt(k);
  };
  ecrire(0, 'RIFF');
  v.setUint32(4, 36 + ECHANTILLONS, true);
  ecrire(8, 'WAVE');
  ecrire(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, FREQUENCE, true);
  v.setUint32(28, FREQUENCE, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  ecrire(36, 'data');
  v.setUint32(40, ECHANTILLONS, true);
  // En huit bits, le silence est au milieu.
  octets.fill(128, 44);
  return new Blob([octets], { type: 'audio/wav' });
}

/** Un volume d'essai, et l'écart qu'on tolère en le relisant : l'iPhone ne laisse pas régler le volume d'un élément audio. */
const VOLUME_D_ESSAI = 0.5;
const A_PEU_PRES = 0.01;

/**
 * Le haut-parleur du téléphone : un seul élément audio, posé dans le cadre, qui joue tous les extraits.
 * @param volume le volume de ce téléphone, de 0 à 1, lu à chaque image. Là où l'élément audio ne se règle pas (l'iPhone), le son
 * passe par le moteur audio du navigateur, qui, lui, se règle : les extraits de Deezer le permettent.
 */
export function brancherLeHautParleur(cadre: HTMLElement, volume: () => number): HautParleur {
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.hidden = true;
  audio.setAttribute('playsinline', '');
  audio.volume = VOLUME_D_ESSAI;
  const volumeReglable = Math.abs(audio.volume - VOLUME_D_ESSAI) < A_PEU_PRES;
  audio.volume = 1;
  // Pour passer par le moteur audio, l'élément doit charger ses extraits en demandant la permission de leur serveur.
  if (!volumeReglable) audio.crossOrigin = 'anonymous';
  /** Le gain du moteur audio, une fois branché dans un geste ; sans lui, c'est le volume de l'élément qu'on règle. */
  let gain: GainNode | undefined;
  let moteur: AudioContext | undefined;
  const brancherLeMoteur = (): void => {
    if (volumeReglable || moteur !== undefined || typeof AudioContext !== 'function') return;
    try {
      moteur = new AudioContext();
      gain = moteur.createGain();
      moteur.createMediaElementSource(audio).connect(gain).connect(moteur.destination);
    } catch {
      // Le navigateur ne sait pas : le son garde le volume de l'appareil.
      gain = undefined;
    }
  };
  cadre.append(audio);
  let silence: string | undefined;
  /** L'extrait qu'on a mis dans l'élément, pour la piste de ce lancer ; il n'a pas pu se charger ; on le fait jouer muet un instant pour qu'il charge. */
  let adresse: string | undefined;
  let lancee: number | undefined;
  let rate = false;
  let amorce = false;
  /** Le navigateur a laissé partir un son : il le laissera. Il l'a refusé : on attend un toucher pour réessayer. */
  let debloque = false;
  let bloque = false;
  /** Un `play()` est parti, et l'on attend ce qu'il donne ; chacun a son tour : la réponse d'un ancien ne compte plus. */
  let demande = false;
  let tour = 0;
  /** Ce qu'on vient de vouloir jouer : un toucher le démarre sur-le-champ, si c'est l'heure. */
  let enJeu = false;

  // L'adresse telle qu'on l'a mise (l'élément, lui, la rend normalisée) : un extrait qui ne se charge pas ne retient personne.
  audio.addEventListener('error', () => {
    if (adresse !== undefined && audio.getAttribute('src') === adresse) rate = true;
  });

  /** Fait jouer l'élément ; ce que le navigateur répond dit s'il laisse partir le son. */
  function jouerMaintenant(puis?: (joue: boolean) => void): void {
    const ce = ++tour;
    demande = true;
    audio.play().then(
      () => {
        debloque = true;
        bloque = false;
        if (ce !== tour) return;
        demande = false;
        puis?.(true);
      },
      (erreur: unknown) => {
        // Refusé faute de geste : on attend le prochain toucher. Une autre erreur (un lien mort) se voit à l'élément.
        if (erreur instanceof DOMException && erreur.name === 'NotAllowedError') bloque = true;
        if (ce !== tour) return;
        demande = false;
        puis?.(false);
      },
    );
  }

  /** L'iPhone ne charge un extrait que si on le fait jouer : on le fait jouer muet un instant, dès qu'on en a le droit. */
  function amorcer(): void {
    if (!debloque || amorce) return;
    amorce = true;
    audio.muted = true;
    jouerMaintenant((joue) => {
      // L'heure de l'extrait est venue entre-temps : il joue pour de bon, on n'y touche pas.
      if (!amorce) return;
      amorce = false;
      audio.muted = false;
      if (joue) audio.pause();
    });
  }

  function charger(voulu: SonVoulu): void {
    adresse = voulu.adresse;
    lancee = voulu.lanceeA;
    rate = false;
    amorce = false;
    demande = false;
    tour++;
    audio.pause();
    audio.muted = false;
    audio.src = voulu.adresse;
    audio.load();
    amorcer();
  }

  /** On ne coupe pas un `play()` qui attend sa réponse, ni l'amorce : le navigateur prendrait l'un ou l'autre pour un échec. */
  const taire = (): void => {
    if (!audio.paused && !amorce && !demande) audio.pause();
  };

  return {
    get bloque() {
      return bloque;
    },
    debloquer() {
      brancherLeMoteur();
      if (moteur !== undefined && moteur.state === 'suspended') void moteur.resume();
      if (debloque && !bloque) return;
      bloque = false;
      if (adresse === undefined) {
        // Rien à jouer encore : un instant de silence, joué dans ce geste-ci.
        silence ??= URL.createObjectURL(unSilence());
        if (audio.src !== silence) audio.src = silence;
        jouerMaintenant((joue) => {
          if (joue) audio.pause();
        });
        return;
      }
      // Un extrait est là : s'il doit s'entendre, il part dans ce geste, et il se remettra à sa place ; sinon, il se charge.
      if (enJeu) jouerMaintenant();
      else amorcer();
    },
    suivre(voulu, heure) {
      enJeu = false;
      if (voulu === undefined) return taire();
      if (voulu.adresse !== adresse || voulu.lanceeA !== lancee) charger(voulu);
      const position = voulu.depuis !== undefined ? heure - voulu.depuis : undefined;
      const fini = audio.ended || (Number.isFinite(audio.duration) && position !== undefined && position >= audio.duration);
      if (position === undefined || position < 0 || fini || (voulu.jusqua !== undefined && heure >= voulu.jusqua)) return taire();
      enJeu = true;
      // C'est l'heure : s'il chargeait en sourdine, il s'entend désormais.
      amorce = false;
      audio.muted = false;
      const fort = volume() * volumeA(voulu, heure);
      if (gain !== undefined) gain.gain.value = fort;
      else audio.volume = fort;
      if (audio.paused) {
        if (demande || bloque || rate) return;
        audio.currentTime = position;
        jouerMaintenant();
        return;
      }
      if (!audio.seeking && Math.abs(audio.currentTime - position) > TELEPHONE.son.ecartAdmis) audio.currentTime = position;
    },
    pret(a) {
      return bloque || (adresse === a && (rate || audio.readyState >= audio.HAVE_FUTURE_DATA));
    },
    fermer() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.remove();
      if (silence !== undefined) URL.revokeObjectURL(silence);
      void moteur?.close();
    },
  };
}
