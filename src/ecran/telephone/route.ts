/**
 * Quel écran le téléphone montre, d'après ce qu'il sait et l'heure du serveur : avant la room, celui où l'on prépare sa venue ; dans
 * la room, celui que l'état de la partie donne (le salon, la piste, le hit-parade, la finale), avec ce qu'on y fait au pouce.
 * Pur : la même mémoire, à la même heure, montre le même écran.
 */

import { MODES, type ModeDeJeu } from '../../regles/modes';
import { numeroDeLaPiste, partieA, type EtatDeLaPartie, type EvenementDePartie, type SonDeLaRoom } from '../../regles/partie';
import { jouer, type Reponse } from '../../regles/piste';
import type { ChoixDeLAvatar } from '../../ressources/avatar';
import { TELEPHONE } from '../../ressources/ecran';
import { FONDS_DE_POCHETTE, MOTIFS_DE_POCHETTE, type Pochette } from '../../ressources/pochettes';
import type { Textes } from '../../ressources/textes';
import type { Vignette } from '../../ressources/vignettes';
import type { PisteEnScene } from '../../scene/piste/etat';
import { instantsDeLaPiste } from '../../scene/piste/instants';
import type { BacOuvert, QuiRegardeLeSalon } from '../../scene/telephone/ecrans';
import type { CompteOuvertAuTelephone } from '../../scene/telephone/compte';
import type { AutourDeLaPiste } from '../../scene/telephone/piste';
import { tapeA, type Memoire, type Preparatifs, type RoomConnue } from './memoire';

export type EcranDuTelephone =
  /** L'accueil ; sa touche « Mon compte » quand le serveur tient des comptes. */
  | { readonly genre: 'accueil'; readonly compte: boolean }
  | { readonly genre: 'compte'; readonly compte: CompteOuvertAuTelephone }
  | { readonly genre: 'saisie'; readonly tape: string; readonly refus: 'codeInconnu' | 'complet' | undefined }
  /**
   * « Fais ta pochette » ; quand on la refait (à l'accueil, dans la room), on peut la laisser comme elle était. `sansNom` : on a touché
   * « C'est moi » sans avoir écrit son nom, l'écran le réclame.
   */
  | {
      readonly genre: 'pochette';
      readonly pochette: Pochette;
      readonly choisi: ChoixDeLAvatar;
      readonly retouche: boolean;
      readonly sansNom: boolean;
    }
  | {
      readonly genre: 'bac';
      readonly bac: BacOuvert;
      /** Vrai si les thèmes, la recherche et le lien collé marchent : le serveur a une source où chercher. */
      readonly chercher: boolean;
    }
  | {
      readonly genre: 'reglages';
      readonly mode: ModeDeJeu;
      readonly pistes: number;
      readonly extrait: number;
      readonly son: SonDeLaRoom;
      /** Vrai si l'hôte peut tourner les commandes de la platine. */
      readonly commandes: boolean;
    }
  /** Dans la room, le joueur de ce téléphone (`toi`) touche sa propre pochette pour la refaire. */
  | {
      readonly genre: 'salon';
      readonly etat: EtatDeLaPartie;
      readonly code: string;
      readonly qui: QuiRegardeLeSalon;
      readonly ampli: boolean;
      readonly toi: string;
    }
  | { readonly genre: 'ampli' }
  | {
      readonly genre: 'piste';
      /** L'instant où la piste a été lancée : une autre piste, c'est un autre décor. */
      readonly lanceeA: number;
      readonly cran: number;
      readonly numero: { readonly numero: number; readonly sur: number };
      readonly scene: PisteEnScene;
      readonly autour: AutourDeLaPiste;
      /** Ce qu'on peut toucher à cet instant : l'étiquette vierge, les étiquettes tendues, ou rien. */
      readonly pouce: 'saisie' | 'choix' | undefined;
    }
  | { readonly genre: 'hitParade'; readonly avant: EtatDeLaPartie; readonly apres: EtatDeLaPartie; readonly hote: boolean; readonly toi: string }
  | { readonly genre: 'finale'; readonly etat: EtatDeLaPartie; readonly joues: readonly Reponse[]; readonly hote: boolean; readonly toi: string }
  /** Les titres joués, revus depuis la finale, avec leurs pochettes. */
  | { readonly genre: 'titres'; readonly joues: readonly Reponse[] };

/** La vignette d'une playlist trouvée : une couleur et un motif tirés de son lien, toujours les mêmes pour elle. */
function vignetteDe(lien: string): Vignette {
  let h = 0;
  for (const c of lien) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fonds = FONDS_DE_POCHETTE.filter((f) => f !== 'creme');
  return { fond: fonds[h % fonds.length] ?? 'olive', motif: MOTIFS_DE_POCHETTE[(h >>> 8) % MOTIFS_DE_POCHETTE.length] ?? 'rayons' };
}

type Evenement<G extends EvenementDePartie['genre']> = Extract<EvenementDePartie, { readonly genre: G }>;
const estUn =
  <G extends EvenementDePartie['genre']>(genre: G) =>
  (e: EvenementDePartie): e is Evenement<G> =>
    e.genre === genre;

/** Les écrans d'avant la room. */
function ecranDeLaPreparation(m: Memoire, p: Preparatifs): EcranDuTelephone {
  const prep = m.preparation;
  switch (prep.ecran) {
    case 'accueil':
    case 'titres':
      return { genre: 'accueil', compte: p.comptes === true };
    case 'compte': {
      const refus =
        m.refus === 'adresse' || m.refus === 'tropDeLiens' || m.refus === 'lienPerime' || m.refus === 'comptesFermes' ? m.refus : undefined;
      return {
        genre: 'compte',
        compte: {
          // Dans son compte, l'écran le montre ; sinon, il en est à son étape.
          etape: m.compte !== undefined && prep.etape === 'adresse' ? 'dedans' : prep.etape,
          email: prep.email,
          ...(m.compte !== undefined ? { compte: m.compte } : {}),
          ...(refus !== undefined ? { refus } : {}),
          enAttente: prep.enAttente,
        },
      };
    }
    case 'saisie':
      return { genre: 'saisie', tape: prep.tape, refus: m.refus === 'codeInconnu' || m.refus === 'complet' ? m.refus : undefined };
    case 'pochette':
      return {
        genre: 'pochette',
        pochette: prep.pochette,
        choisi: prep.choisi,
        retouche: prep.venue.genre === 'retoucher',
        sansNom: prep.sansNom === true,
      };
    case 'bac': {
      const b = prep.bac;
      const etat = b.enAttente !== undefined ? 'fouille' : b.resultats !== undefined && b.resultats.length === 0 ? 'rien' : undefined;
      const bac: BacOuvert = {
        cran: prep.cran,
        ...(b.theme !== undefined ? { theme: b.theme } : {}),
        ...(prep.cran === 'pretes' && b.resultats !== undefined
          ? { proposees: b.resultats.map((r) => ({ titre: r.titre, total: r.jouables ?? r.total })) }
          : {}),
        ...(b.recherche !== '' ? { recherche: b.recherche } : {}),
        ...(b.resultats !== undefined ? { resultats: b.resultats.map((r) => vignetteDe(r.lien)) } : {}),
        ...(b.touche !== undefined ? { touche: b.touche } : {}),
        ...(b.lien !== '' ? { lien: b.lien } : {}),
        ...(b.importee !== undefined ? { importee: { jouables: b.importee.jouables ?? b.importee.total, total: b.importee.total } } : {}),
        ...(b.refus !== undefined ? { refus: b.refus } : {}),
        ...(prep.cran === 'laMienne' && m.mesPlaylists.length > 0
          ? { miennes: m.mesPlaylists.map((r) => ({ titre: r.titre, total: r.jouables ?? r.total })) }
          : {}),
        ...(etat !== undefined ? { etat } : {}),
        ...(b.choisie !== undefined ? { choisie: { titre: b.choisie.titre, total: b.choisie.jouables ?? b.choisie.total } } : {}),
        ...(p.chercher && p.source !== undefined ? { source: p.source } : {}),
        ...(p.chercher ? { themeAToucher: true } : {}),
      };
      return { genre: 'bac', bac, chercher: p.chercher };
    }
    case 'reglages':
      return { genre: 'reglages', mode: MODES[prep.mode], pistes: prep.pistes, extrait: prep.extrait, son: prep.son, commandes: p.commandes };
  }
}

/** La piste en cours, et tout ce qui se pose autour : ce que le journal en dit depuis son lancer, et ce qu'on y fait au pouce. */
function ecranDeLaPiste(m: Memoire, room: RoomConnue, etat: EtatDeLaPartie, heure: number, textes: Textes): EcranDuTelephone | undefined {
  const piste = room.seance.reduce(jouer, undefined);
  const lanceeA = room.seance.find((a) => a.genre === 'lancer')?.a;
  if (piste === undefined || lanceeA === undefined) return undefined;
  // La réponse reste à l'écran un moment après que le disque s'est retourné ; puis le hit-parade, ou la finale.
  if (piste.revelation !== undefined && heure >= instantsDeLaPiste(piste).retournement + TELEPHONE.apresLaReponse) return undefined;
  const depuis = room.journal.filter((e) => e.a >= lanceeA);
  const extrait = depuis.filter(estUn('extrait'))[0];
  const revelation = depuis.filter(estUn('revelation'))[0];
  const avantLExtrait =
    extrait !== undefined
      ? partieA(
          room.journal.filter((e) => e.a < extrait.a),
          Infinity,
        )
      : etat;
  const miennes = depuis.filter(estUn('jugee')).filter((j) => j.id === room.toi);
  const derniere = miennes[miennes.length - 1];
  const moi = etat.joueurs.find((j) => j.id === room.toi);
  const revelee = revelation?.reponse;
  const pouce = m.pouce.lanceeA === lanceeA ? m.pouce : undefined;
  const mode = MODES[etat.mode];
  const ouverte =
    extrait !== undefined && revelee === undefined && moi !== undefined && !moi.spectateur && !(etat.piste?.complets.includes(room.toi) ?? false);
  const frappe = pouce?.frappe;
  const mot =
    frappe !== undefined || derniere === undefined
      ? undefined
      : derniere.verdict === 'presque'
        ? textes.pastilles.presque
        : derniere.verdict === 'faux'
          ? textes.piste.raye
          : undefined;
  const personne = revelee !== undefined && etat.trouvees[etat.trouvees.length - 1] === false;
  const phrase = m.horsLigne
    ? textes.etats.connexionPerdue
    : moi?.spectateur === true
      ? textes.partie.spectateur
      : personne
        ? textes.etats.personne
        : undefined;
  const repondre: AutourDeLaPiste['repondre'] =
    mode.sousLePouce === 'etiquettesAToucher'
      ? { genre: 'choix', proposes: extrait?.piste.choix ?? [], ...(pouce?.touchee !== undefined ? { touchee: pouce.touchee } : {}) }
      : {
          genre: 'saisie',
          tape: frappe !== undefined ? tapeA(frappe, heure) : (pouce?.tape ?? ''),
          ...(mot !== undefined ? { mot } : {}),
          clavier: frappe !== undefined || (pouce?.clavier ?? false),
          ...(pouce?.dessusDuClavier !== undefined ? { dessus: pouce.dessusDuClavier } : {}),
        };
  return {
    genre: 'piste',
    lanceeA,
    cran: mode.cran,
    numero: numeroDeLaPiste(etat, piste.revelation === undefined),
    scene: { piste, rayuresA: miennes.filter((j) => j.verdict === 'faux').map((j) => j.a) },
    autour: {
      etat,
      avantLExtrait,
      toi: room.toi,
      repondre,
      ...(revelee !== undefined ? { revelee } : {}),
      ...(phrase !== undefined ? { phrase } : {}),
    },
    pouce:
      !ouverte || m.horsLigne
        ? undefined
        : mode.sousLePouce === 'etiquettesAToucher'
          ? pouce?.touchee === undefined
            ? 'choix'
            : undefined
          : frappe === undefined
            ? 'saisie'
            : undefined,
  };
}

/** L'écran du téléphone, à cette heure du serveur. */
export function ecranDuTelephone(m: Memoire, heure: number, p: Preparatifs, textes: Textes): EcranDuTelephone {
  const room = m.room;
  if (room === undefined) return ecranDeLaPreparation(m, p);
  const etat = partieA(room.journal, Infinity);
  // L'hôte a ouvert le bac pour changer de playlist, même en pleine piste : il y choisit la suivante.
  if (m.preparation.ecran === 'bac' && etat.hote === room.toi) return ecranDeLaPreparation(m, p);
  const piste = ecranDeLaPiste(m, room, etat, heure, textes);
  if (piste !== undefined) return piste;
  // Entre deux pistes, on refait sa pochette ; la piste suivante passe avant, et l'on y revient après.
  const prep = m.preparation;
  if (prep.ecran === 'pochette' && prep.venue.genre === 'retoucher')
    return { genre: 'pochette', pochette: prep.pochette, choisi: prep.choisi, retouche: true, sansNom: prep.sansNom === true };
  const hote = etat.hote === room.toi;
  const toi = room.toi;
  if (etat.phase === 'fin') {
    const joues = room.journal.filter(estUn('revelation')).flatMap((r) => (r.reponse !== undefined ? [r.reponse] : []));
    if (prep.ecran === 'titres') return { genre: 'titres', joues };
    return { genre: 'finale', etat, joues, hote, toi };
  }
  const extraits = room.journal.filter(estUn('extrait'));
  const dernier = extraits[extraits.length - 1];
  if (etat.phase === 'pistes' && dernier !== undefined)
    return {
      genre: 'hitParade',
      avant: partieA(
        room.journal.filter((e) => e.a < dernier.a),
        Infinity,
      ),
      apres: etat,
      hote,
      toi,
    };
  if (m.ampliAllumeA !== undefined && heure < m.ampliAllumeA + TELEPHONE.ampliDePres) return { genre: 'ampli' };
  // L'hôte est le premier arrivé ; s'il est parti, la platine est passée au suivant, qui le lit au salon.
  const premier = room.journal.find(estUn('arrivee'))?.id;
  const qui: QuiRegardeLeSalon = !hote ? 'invite' : premier === room.toi ? 'hote' : 'nouvelHote';
  return { genre: 'salon', etat, code: room.code, qui, ampli: m.ampliAllumeA !== undefined, toi };
}
