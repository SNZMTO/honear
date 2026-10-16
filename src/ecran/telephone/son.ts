/**
 * Le son du téléphone : l'extrait de la piste en cours, joué par son haut-parleur à l'heure du serveur, comme sur tous les autres.
 * `sonVoulu` dit, de la mémoire, ce qu'il faut jouer : rien tant que l'ampli n'est pas allumé, ni chez un invité quand c'est l'hôte
 * qui joue le son pour tous. Le haut-parleur, lui, le joue : il précharge l'extrait pendant le décompte, le démarre à l'heure dite
 * (en route, pour qui arrive en retard), le remet à sa place s'il dérive, et le laisse se taire quand l'écran de la piste s'en va.
 * Un navigateur ne laisse partir un son que dans le geste d'une main : on joue un instant de silence au premier toucher, et le
 * même élément audio peut ensuite jouer tous les extraits (c'est ce que veut l'iPhone). L'extrait passe par l'élément seul, ce que
 * l'iPhone joue le plus sûrement, même en silencieux ; mais il n'en laisse pas régler le volume : ce sont alors les boutons du
 * téléphone. Le haut-parleur fait aussi le petit bruit des touches et des crans, par le moteur audio du navigateur.
 */

import { MODES } from '../../regles/modes';
import { partieA, type EvenementDePartie } from '../../regles/partie';
import { jouer, type Piste } from '../../regles/piste';
import { BRUITS, TELEPHONE, type NomDeBruit } from '../../ressources/ecran';
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

/**
 * L'heure où l'écran de la piste s'en va, la réponse vue : un moment après que le disque s'est retourné, plus long quand une
 * anecdote se lit sous la platine. Inconnue avant la révélation.
 */
export function finDeLaReponse(piste: Piste, journal: readonly EvenementDePartie[], lanceeA: number): number | undefined {
  if (piste.revelation === undefined) return undefined;
  const revelation = journal.find((e) => e.genre === 'revelation' && e.a >= lanceeA);
  const anecdote = revelation?.genre === 'revelation' && revelation.reponse?.anecdote !== undefined;
  return instantsDeLaPiste(piste).retournement + (anecdote ? TELEPHONE.apresLAnecdote : TELEPHONE.apresLaReponse);
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
  const aLaReponse = finDeLaReponse(piste, room.journal, lanceeA);
  // Un mode qui ne fait entendre que le début (la première note) : le son se tait passé ces secondes, le temps d'un fondu.
  const entendu = MODES[etat.mode].son;
  const auBout = entendu !== undefined && piste.extraitA !== undefined ? piste.extraitA + entendu + TELEPHONE.son.fondu : undefined;
  const jusqua = aLaReponse !== undefined && auBout !== undefined ? Math.min(aLaReponse, auBout) : (aLaReponse ?? auBout);
  return { adresse: room.extrait, lanceeA, depuis: piste.extraitA, jusqua };
}

/** Le volume à cette heure : plein, puis il baisse jusqu'au silence pendant le fondu qui finit à `jusqua`. */
export function volumeA(voulu: SonVoulu, heure: number): number {
  if (voulu.jusqua === undefined) return 1;
  return Math.min(1, Math.max(0, (voulu.jusqua - heure) / TELEPHONE.son.fondu));
}

export interface HautParleur {
  /**
   * À appeler dans le geste d'une main (un toucher, une touche du clavier) : le navigateur laisse alors partir le son, et le laissera.
   * @param geste le nom de l'événement, pour le diagnostic.
   */
  debloquer(geste?: string): void;
  /** À chaque image : joue, à cette heure du serveur, ce qu'il faut jouer. */
  suivre(voulu: SonVoulu | undefined, heure: number): void;
  /**
   * Vrai quand on peut se dire prêt pour l'extrait de cette adresse : il est chargé, ou il ne le sera pas (son lien ne répond pas,
   * le navigateur refuse le son). Dans ces deux cas, on ne fait pas attendre les autres.
   */
  pret(adresse: string): boolean;
  /** Vrai si le navigateur a refusé de jouer : il attend un toucher. */
  readonly bloque: boolean;
  /** Faux là où la page ne peut pas régler le volume (l'iPhone) : ce sont les boutons du téléphone qui le règlent. */
  readonly volumeReglable: boolean;
  /** Le petit bruit d'une touche qu'on enfonce, ou d'un bouton qui passe un cran : au volume du téléphone, s'il a déjà le droit de sonner. */
  cliquer(bruit: NomDeBruit): void;
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

/**
 * Vrai s'il faut remettre l'extrait à sa place : il s'écarte de plus qu'on n'admet de là où il devrait en être, à l'heure du serveur.
 * Pas coup sur coup, le temps qu'il reparte et que sa position suive. Jamais en changeant sa vitesse : l'iPhone saccade à chaque
 * vitesse qu'on lui donne. Ni quand il attend ses données (le pousser plus loin le ferait attendre encore), ni pour un petit écart
 * sur un iPhone, où chaque saut fait taire le son un instant.
 * @param ecart sa position moins celle où il devrait être, en secondes.
 * @param depuis le temps passé depuis qu'on l'a remis à sa place, la dernière fois ; rien s'il ne l'a jamais été.
 */
export function aRemettreEnPlace(
  ecart: number,
  o: { readonly surIOS: boolean; readonly enRecherche: boolean; readonly aDeQuoiJouer: boolean; readonly depuis: number | undefined },
): boolean {
  const admis = o.surIOS ? TELEPHONE.son.ecartAdmisSurIOS : TELEPHONE.son.ecartAdmis;
  if (o.enRecherche || !o.aDeQuoiJouer || Math.abs(ecart) <= admis) return false;
  return o.depuis === undefined || o.depuis >= TELEPHONE.son.entreDeuxSauts;
}

/** Vrai sur un iPhone, un iPad ou un iPod (un iPad récent se dit Mac, mais il est tactile). */
const estUnAppareilApple = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Un volume d'essai, et l'écart qu'on tolère en le relisant : l'iPhone ne laisse pas régler le volume d'un élément audio. */
const VOLUME_D_ESSAI = 0.5;
const A_PEU_PRES = 0.01;

/** Ce que l'oreille entend du volume du bouton : elle entend en puissances ; à 30 %, le son est encore doux, et il monte peu à peu. */
export const gainDuVolume = (volume: number): number => volume ** TELEPHONE.volume.courbe;

/** La séance audio de la page, là où le navigateur la donne (Safari, depuis l'iOS 16.4). */
interface SeanceAudio {
  type: string;
}
const seanceAudio = (): SeanceAudio | undefined => (navigator as Navigator & { readonly audioSession?: SeanceAudio }).audioSession;

/** Le moteur audio du navigateur, sous son nom d'aujourd'hui ou sous celui des vieux Safari : il fait les petits bruits. */
const MoteurAudio = (): typeof AudioContext | undefined =>
  typeof AudioContext === 'function' ? AudioContext : (window as Window & { readonly webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

/** Ce que l'élément audio dit de lui, et qu'on note au diagnostic. */
const EVENEMENTS_NOTES = ['loadedmetadata', 'canplay', 'playing', 'pause', 'waiting', 'stalled', 'ended', 'error'] as const;

/** Les millisecondes d'une seconde : les minuteries comptent en millisecondes, nos tables en secondes. */
const MS_PAR_SECONDE = 1000;
/** Ce qu'on laisse à un `play()` pour répondre (voir `TELEPHONE.son`). */
const ATTENTE_DU_PLAY = TELEPHONE.son.attenteDuPlay * MS_PAR_SECONDE;

/**
 * Le haut-parleur du téléphone : un seul élément audio, posé dans le cadre, qui joue tous les extraits.
 * @param volume le volume du bouton, de 0 à 1, lu à chaque image ; rien quand il n'y a pas de bouton (un téléphone, où ce sont
 * ses boutons à lui qui règlent le son) : l'extrait joue alors en plein, et les petits bruits, doucement. Là où l'élément ne se
 * règle pas (l'iPhone), l'extrait joue au volume du téléphone.
 * @param noter le diagnostic, quand la page l'a demandé : chaque essai de jouer, ce qu'il a donné, ce que l'élément dit de lui.
 */
export function brancherLeHautParleur(cadre: HTMLElement, volume: () => number | undefined, noter?: (texte: string) => void): HautParleur {
  /** L'élément audio, tel qu'on le pose : un élément coincé (voir `coince`) est remplacé par un neuf, dans le geste d'une main. */
  const creerLElement = (): HTMLAudioElement => {
    const element = document.createElement('audio');
    element.preload = 'auto';
    element.hidden = true;
    element.setAttribute('playsinline', '');
    // L'adresse telle qu'on l'a mise (l'élément, lui, la rend normalisée) : un extrait qui ne se charge pas ne retient personne.
    element.addEventListener('error', () => {
      if (adresse !== undefined && element.getAttribute('src') === adresse) rate = true;
    });
    if (noter !== undefined)
      for (const nom of EVENEMENTS_NOTES)
        element.addEventListener(nom, () =>
          noter(
            `audio ${nom} : ${element.currentSrc.startsWith('blob:') ? 'silence' : (element.currentSrc.split('/')[2] ?? '')} prêt ${element.readyState} ` +
              `muet ${element.muted} à ${element.currentTime.toFixed(1)}${element.error !== null ? ` erreur ${element.error.code}` : ''}`,
          ),
        );
    return element;
  };
  let audio = creerLElement();
  // L'iPhone et l'iPad : le son ne se règle qu'avec les boutons de l'appareil. La page n'y touche pas, et n'y ouvre pas le moteur
  // audio des petits bruits, qui pourrait prendre la main sur le son de l'extrait.
  const surIOS = estUnAppareilApple();
  audio.volume = VOLUME_D_ESSAI;
  const volumeReglable = !surIOS && Math.abs(audio.volume - VOLUME_D_ESSAI) < A_PEU_PRES;
  audio.volume = 1;
  // La page joue de la musique : elle s'entend, même l'iPhone en silencieux.
  const seance = seanceAudio();
  if (seance !== undefined) seance.type = 'playback';
  /** Le moteur des petits bruits : né endormi, le premier toucher le réveille. */
  let moteur: AudioContext | undefined;
  try {
    const Moteur = MoteurAudio();
    moteur = Moteur !== undefined && !surIOS ? new Moteur() : undefined;
  } catch {
    moteur = undefined;
  }
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
  /** L'heure du serveur où l'on a remis l'extrait à sa place, la dernière fois. */
  let sauteA: number | undefined;
  /**
   * L'élément ne répond plus comme il devrait : un `play()` resté sans réponse, refusé pour autre chose qu'un geste, ou un
   * extrait figé en pleine lecture. L'iPhone fait cela après une interruption (un appel, une notification, des écouteurs qu'on
   * retire) : la page restait muette jusqu'à ce qu'on la recharge. Le toucher suivant pose un élément neuf, et le fait jouer.
   */
  let coince = false;
  /** Où devrait en être l'extrait, à la dernière image : un élément neuf y part. */
  let derniereposition: number | undefined;
  /** La position de l'extrait la dernière fois qu'elle a bougé, et l'heure du serveur à ce moment : de quoi le voir figé. */
  let bouge: { readonly position: number; readonly a: number } | undefined;
  /** Combien de fois on a relancé l'extrait, à l'arrêt, sans qu'il avance : l'iPhone qui le remet aussitôt en pause. */
  let relances = 0;

  noter?.(`haut-parleur : iOS ${surIOS}, volume réglable ${volumeReglable}, séance audio ${seance !== undefined}, moteur ${moteur !== undefined}`);

  /** Met l'extrait à cette position ; un élément qui ne sait pas encore où il en est (un vieux Safari) refuse : il part du début. */
  const placer = (position: number): void => {
    try {
      audio.currentTime = position;
    } catch {
      noter?.(`position ${position.toFixed(1)} refusée`);
    }
  };

  /** Le son ne part plus de lui-même : l'écran demande un toucher (« Pas de son ? Touche l'écran. »), qui le relancera. */
  const tenirPourBloque = (pourquoi: string, coincer: boolean): void => {
    noter?.(`son bloqué : ${pourquoi}`);
    bloque = true;
    if (coincer) coince = true;
  };

  /** Fait jouer l'élément ; ce que le navigateur répond dit s'il laisse partir le son. */
  function jouerMaintenant(puis?: (joue: boolean) => void, pourquoi = 'extrait'): void {
    const ce = ++tour;
    const element = audio;
    demande = true;
    let repondu = false;
    noter?.(`play (${pourquoi}) muet ${element.muted}`);
    // Sans réponse au bout d'un moment, il est tenu pour refusé : il ne retient plus le son, et un toucher le relancera. Pas
    // l'amorce, muette, qui charge : sur un réseau lent, elle peut tarder sans que rien ne soit coincé.
    const sansReponse = (): void => {
      if (repondu || ce !== tour) return;
      tour++;
      demande = false;
      tenirPourBloque(`play (${pourquoi}) sans réponse`, true);
      puis?.(false);
    };
    if (pourquoi !== 'amorce') window.setTimeout(sansReponse, ATTENTE_DU_PLAY);
    element.play().then(
      () => {
        repondu = true;
        noter?.(`play (${pourquoi}) : accepté`);
        if (element !== audio) return;
        debloque = true;
        bloque = false;
        if (ce !== tour) return;
        demande = false;
        puis?.(true);
      },
      (erreur: unknown) => {
        repondu = true;
        noter?.(`play (${pourquoi}) : refusé, ${erreur instanceof Error ? `${erreur.name} ${erreur.message}` : String(erreur)}`);
        // Une réponse d'un ancien essai (l'extrait a changé entre-temps, qui l'a interrompu) ne compte plus.
        if (ce !== tour || element !== audio) return;
        demande = false;
        // Refusé faute de geste : on attend le prochain toucher ; pour autre chose, aussi, avec un élément neuf. Un lien mort, lui,
        // se voit à l'élément (`rate`), et ne retient personne.
        if (!rate) tenirPourBloque(`play (${pourquoi}) refusé`, !(erreur instanceof DOMException && erreur.name === 'NotAllowedError'));
        puis?.(false);
      },
    );
  }

  /** Un élément neuf à la place de celui qui est coincé, avec l'extrait, à la position où il devrait être. */
  function remplacerLElement(): void {
    const vieux = audio;
    audio = creerLElement();
    vieux.pause();
    vieux.removeAttribute('src');
    vieux.load();
    vieux.replaceWith(audio);
    if (!cadre.contains(audio)) cadre.append(audio);
    if (adresse !== undefined) audio.src = adresse;
    if (enJeu && derniereposition !== undefined) placer(derniereposition);
    noter?.('élément audio neuf');
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
    }, 'amorce');
  }

  function charger(voulu: SonVoulu): void {
    noter?.(`extrait : ${voulu.adresse.split('/')[2] ?? ''}, débloqué ${debloque}, bloqué ${bloque}`);
    adresse = voulu.adresse;
    lancee = voulu.lanceeA;
    rate = false;
    amorce = false;
    demande = false;
    bouge = undefined;
    relances = 0;
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
    volumeReglable,
    debloquer(geste) {
      if (moteur !== undefined && moteur.state !== 'running') void moteur.resume().catch(() => undefined);
      if (debloque && !bloque) return;
      noter?.(`geste ${geste ?? ''} : on débloque (${adresse === undefined ? 'silence' : enJeu ? 'extrait' : 'amorce'})`);
      bloque = false;
      // Coincé : un élément neuf, que ce geste-ci laisse jouer.
      if (coince) {
        coince = false;
        amorce = false;
        demande = false;
        bouge = undefined;
        relances = 0;
        remplacerLElement();
      }
      if (adresse === undefined) {
        // Rien à jouer encore : un instant de silence, joué dans ce geste-ci.
        silence ??= URL.createObjectURL(unSilence());
        if (audio.src !== silence) audio.src = silence;
        jouerMaintenant((joue) => {
          if (joue) audio.pause();
        }, 'silence');
        return;
      }
      // Un extrait est là : s'il doit s'entendre, il part dans ce geste, et il se remettra à sa place ; sinon, il se charge.
      if (enJeu) jouerMaintenant(undefined, 'geste');
      else amorcer();
    },
    suivre(voulu, heure) {
      enJeu = false;
      if (voulu === undefined) return taire();
      if (voulu.adresse !== adresse || voulu.lanceeA !== lancee) charger(voulu);
      const position = voulu.depuis !== undefined ? heure - voulu.depuis : undefined;
      // Fini quand l'heure a passé sa durée : l'iPhone dit parfois l'extrait « fini » juste après l'avoir amorcé, à 0 s ; s'y fier
      // le laissait muet toute la piste.
      const fini = Number.isFinite(audio.duration) && position !== undefined && position >= audio.duration;
      if (position === undefined || position < 0 || fini || (voulu.jusqua !== undefined && heure >= voulu.jusqua)) return taire();
      enJeu = true;
      derniereposition = position;
      // C'est l'heure : s'il chargeait en sourdine, il s'entend désormais.
      amorce = false;
      audio.muted = false;
      if (volumeReglable) audio.volume = gainDuVolume(volume() ?? 1) * volumeA(voulu, heure);
      if (audio.paused) {
        bouge = undefined;
        if (demande || bloque || rate) return;
        // Relancé coup sur coup sans jamais avancer (le système le remet en pause aussitôt) : il est coincé.
        if (relances >= TELEPHONE.son.relancesAuPlus) {
          relances = 0;
          tenirPourBloque('extrait remis en pause sans cesse', true);
          return;
        }
        relances++;
        placer(position);
        sauteA = heure;
        jouerMaintenant();
        return;
      }
      // Il joue, ou croit jouer : figé trop longtemps (rien n'avance, sans qu'on le cherche), il est coincé.
      if (bouge === undefined || audio.currentTime !== bouge.position) {
        if (bouge !== undefined) relances = 0;
        bouge = { position: audio.currentTime, a: heure };
      } else if (!audio.seeking && !bloque && heure - bouge.a > TELEPHONE.son.figeAuPlus) {
        bouge = undefined;
        tenirPourBloque('extrait figé', true);
        return;
      }
      // Il a dérivé : on le remet à sa place, s'il le faut (voir `aRemettreEnPlace`).
      const ecart = audio.currentTime - position;
      const depuis = sauteA !== undefined ? heure - sauteA : undefined;
      if (!aRemettreEnPlace(ecart, { surIOS, enRecherche: audio.seeking, aDeQuoiJouer: audio.readyState >= audio.HAVE_FUTURE_DATA, depuis })) return;
      noter?.(`remis à sa place : écart ${ecart.toFixed(2)} s`);
      sauteA = heure;
      placer(position);
    },
    pret(a) {
      return bloque || (adresse === a && (rate || audio.readyState >= audio.HAVE_FUTURE_DATA));
    },
    cliquer(nom) {
      if (moteur === undefined || moteur.state !== 'running') return;
      const b = BRUITS[nom];
      const t = moteur.currentTime;
      const note = moteur.createOscillator();
      const enveloppe = moteur.createGain();
      note.type = 'triangle';
      note.frequency.setValueAtTime(b.de, t);
      note.frequency.exponentialRampToValueAtTime(b.a, t + b.duree);
      enveloppe.gain.setValueAtTime(b.fort * gainDuVolume(Math.max(volume() ?? TELEPHONE.volume.bruitsAuMoins, TELEPHONE.volume.bruitsAuMoins)), t);
      enveloppe.gain.exponentialRampToValueAtTime(BRUITS.silence, t + b.duree);
      note.connect(enveloppe).connect(moteur.destination);
      note.start(t);
      note.stop(t + b.duree);
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
