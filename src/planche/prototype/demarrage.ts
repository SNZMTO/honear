/**
 * Le prototype, dans la page : le serveur simulé, les cinq potes qui lui parlent, et le téléphone de l'hôte, branché à ce serveur
 * par la même connexion qu'un WebSocket. Le réglage du prototype rejoue la même partie en saisie libre ou en 4 choix, ou ouvre un
 * tournoi de seize titres, où les potes votent ; « Recommencer »
 * la reprend de l'accueil. Rien ici ne dessine ni ne décide : le téléphone montre ce que le serveur lui dit.
 */

import { SCENE_ENTIERE } from '../../ecran/allegements';
import { lancerLaBoucle } from '../../ecran/boucle';
import { horlogeDuNavigateur, type Horloge } from '../../ecran/horloge';
import { animationsReduites, ceQuiManqueAuNavigateur, densiteDeLEcran } from '../../ecran/navigateur';
import { policesEmbarquees } from '../../ecran/polices';
import { ouvrirLeTelephone } from '../../ecran/telephone/client';
import type { Preparatifs } from '../../ecran/telephone/memoire';
import type { EcranDuTelephone } from '../../ecran/telephone/route';
import { hasard } from '../../lowpoly/aleatoire';
import type { Brancher } from '../../regles/messages';
import type { Pochette } from '../../ressources/pochettes';
import { TEXTES } from '../../ressources/textes.fr';
import { CARACTERES } from '../../ressources/typo';
import { VERSO_DU_JEU } from '../../scene/disque/verso';
import { remplir } from '../../scene/phrases';
import { encrier as creerLEncrier, type Encrier } from '../../scene/rendu/texte';
import { demarrerLeServeur } from '../../serveur/serveur';
import { joueursDExemple } from '../etape5/scenes';
import { LEGENDES_DU_PROTOTYPE as L } from './legendes.fr';
import { inviterLesPotes, type Potes } from './potes';
import { PLAYLIST_DU_PROTOTYPE, SCENARIO, type Pote } from './scenario';
import { lOrdreDeLaPlaylist } from '../../serveur/ordre';
import type { PisteDuMode } from '../../regles/modes';
import { LEGENDES_DU_TOURNOI } from '../tournoi/legendes.fr';

/** Les polices du site, en base 64, par nom de fichier. */
type Polices = Readonly<Record<string, string>>;
type Mode = 'libre' | 'quatreChoix' | 'tournoi';

/** Les pochettes des cinq potes : celles de la partie d'exemple des planches. */
function pochettesDesPotes(): Readonly<Record<Pote, Pochette>> {
  const exemple = joueursDExemple(TEXTES);
  const de = (qui: Pote): Pochette => {
    const trouve = exemple.find((j) => j.id === qui);
    if (trouve === undefined) throw new Error(`Le pote « ${qui} » n'a pas de pochette dans la partie d'exemple.`);
    return trouve.pochette;
  };
  return { lady: de('lady'), mc: de('mc'), dj: de('dj'), mamie: de('mamie'), baron: de('baron') };
}

/** Ce que l'hôte règle avant d'ouvrir sa room : la partie du scénario, dans le mode choisi ; et ce que tape le clavier du prototype. */
const preparatifs = (mode: Mode): Preparatifs => ({
  mode,
  ...SCENARIO.reglages,
  // Au tournoi, un tableau de seize titres : ceux de la planche du tournoi.
  ...(mode === 'tournoi' ? { pistes: PLAYLIST_DU_TOURNOI.length } : {}),
  // La partie du scénario est réglée d'avance : le réglage du prototype choisit le mode, les commandes de la platine ne tournent pas.
  commandes: false,
  // Le serveur de la page n'a pas de source où chercher : le bac du prototype ne sert que sa playlist.
  chercher: false,
  playlist: SCENARIO.playlist,
  listes: TEXTES.pochette,
  graine: L.graines.pochettes,
  clavier: {
    code: () => L.codeTape,
    nom: () => L.nomTape,
    // La face B reprend la playlist où la face A l'a laissée : ses pistes suivent celles de la A dans le scénario.
    reponse: ({ face, numero }, deja) => SCENARIO.pistes[(face === 'B' ? SCENARIO.reglages.pistes : 0) + numero - 1]?.toi[deja]?.libre,
  },
});

/** La playlist du tournoi du prototype : les seize titres de la planche du tournoi, chacun sa vignette. */
const PLAYLIST_DU_TOURNOI: readonly PisteDuMode[] = LEGENDES_DU_TOURNOI.titres.map((t) => ({
  reponse: { titre: t.titre, artiste: t.artiste, pochette: { vignette: t.vignette } },
}));

/** Une partie : un serveur neuf, les potes qui le rejoindront, et le téléphone. */
function unePartie(
  cadre: HTMLElement,
  mode: Mode,
  encrier: Encrier,
  horloge: Horloge,
  enChangeant: (ecran: EcranDuTelephone['genre']) => void,
): () => void {
  let jetons = 0;
  const serveur = demarrerLeServeur({
    maintenant: horloge.maintenant,
    tirage: hasard(L.graines.codes).suivant,
    ordre: lOrdreDeLaPlaylist,
    // Dans la page, personne d'autre ne peut se brancher : un jeton n'a pas besoin d'y être secret.
    jeton: () => `jeton-${++jetons}`,
    playlist: (lien) => (lien === SCENARIO.playlist ? (mode === 'tournoi' ? PLAYLIST_DU_TOURNOI : PLAYLIST_DU_PROTOTYPE) : undefined),
  });
  const pochettes = pochettesDesPotes();
  let potes: Potes | undefined;
  // Le transport du prototype : le serveur de la page. Il ne fait que porter les messages ; il voit passer l'ouverture de la room,
  // et y envoie les potes.
  const brancher: Brancher = (recevoir) =>
    serveur.connecter((nouvelle) => {
      if (nouvelle.genre === 'etat' && potes === undefined) potes = inviterLesPotes(serveur, nouvelle.code, nouvelle.heure, pochettes, mode);
      recevoir(nouvelle);
    });
  const telephone = ouvrirLeTelephone(cadre, {
    brancher,
    horloge,
    ecritoire: { textes: TEXTES, encrier },
    preparatifs: preparatifs(mode),
    densiteDeLEcran,
    options: { allegements: SCENE_ENTIERE, verso: VERSO_DU_JEU, sobre: animationsReduites() },
    enChangeant,
  });
  const boucle = lancerLaBoucle(() => {
    serveur.avancer();
    potes?.avancer(horloge.maintenant());
    return true;
  });
  return () => {
    boucle.arreter();
    telephone.fermer();
  };
}

function element<T extends Element>(selecteur: string, genre: { new (): T }): T {
  const trouve = document.querySelector(selecteur);
  if (!(trouve instanceof genre)) throw new Error(`La page n'a pas « ${selecteur} ».`);
  return trouve;
}

export function lancerLePrototype(polices: Polices): void {
  const cadre = element('[data-telephone]', HTMLElement);
  const etat = element('[data-ecran]', HTMLElement);
  const modes = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  const recommencer = element('[data-recommencer]', HTMLButtonElement);
  const manques = ceQuiManqueAuNavigateur();
  if (manques.length > 0) {
    const N = TEXTES.navigateur;
    cadre.textContent = `${N.titre} ${N.conseil} ${remplir(N.detail, { manques: manques.map((m) => N.manques[m]).join(N.entreDeuxManques) })}`;
    return;
  }
  // Ce qu'on tape au clavier : un signe que les polices n'ont pas se remplace, il n'arrête pas le prototype.
  const encrier = creerLEncrier(CARACTERES, policesEmbarquees(polices), TEXTES.langue, true);
  const horloge = horlogeDuNavigateur();
  let mode: Mode = 'libre';
  let fermer: (() => void) | undefined;
  const commencer = (): void => {
    fermer?.();
    for (const bouton of modes) bouton.setAttribute('aria-pressed', String(bouton.dataset['mode'] === mode));
    fermer = unePartie(cadre, mode, encrier, horloge, (ecran) => {
      etat.textContent = L.ecrans[ecran];
    });
  };
  for (const bouton of modes)
    bouton.addEventListener('click', () => {
      const voulu = bouton.dataset['mode'];
      mode = voulu === 'quatreChoix' || voulu === 'tournoi' ? voulu : 'libre';
      commencer();
    });
  recommencer.addEventListener('click', commencer);
  commencer();
}
