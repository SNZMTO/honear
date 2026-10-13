/**
 * Ce qu'on peut toucher sur un écran du téléphone, et ce que cela fait : chaque touche, chaque étiquette à toucher, chaque petite
 * pochette de « Fais ta pochette » se reconnaît au nom de son calque. Et ce que dit sa zone à qui ne la voit pas : ce qui est écrit
 * dessus, dans les textes du site.
 */

import type { NomDeCalque } from '../../lexique';
import { hitParade } from '../../regles/partie';
import { MODES_PAR_CRAN, type CleDeMode } from '../../regles/modes';
import { PLATINE } from '../../ressources/platine';
import { TABLEE } from '../../ressources/tablee';
import { DIRECTIONS } from '../../scene/platine/interrupteur';
import type { Textes } from '../../ressources/textes';
import { CRANS_DU_BAC } from '../../scene/telephone/ecrans';
import { interprete } from '../../scene/telephone/pieces';
import { CLES_DES_CHOIX } from '../../scene/telephone/pochette';
import type { Toucher } from './memoire';
import type { EcranDuTelephone } from './route';

/** Une chose à toucher : ce qu'elle fait, et ce qu'elle dit. */
export interface ChoseATouche {
  readonly toucher: Toucher;
  readonly libelle: string;
}

/** Le rang d'un calque numéroté de un à n (« pochette-choix-3 ») : de zéro à n - 1. */
function rangDans(nom: string, prefixe: string): number | undefined {
  if (!nom.startsWith(prefixe)) return undefined;
  const n = Number(nom.slice(prefixe.length));
  return Number.isInteger(n) && n >= 1 ? n - 1 : undefined;
}

/** Ce que fait un calque qu'on touche sur cet écran ; rien s'il n'est pas à toucher, ou pas maintenant. */
export function choseATouche(nom: NomDeCalque, ecran: EcranDuTelephone, textes: Textes): ChoseATouche | undefined {
  const T = textes.touches;
  const P = textes.pochette;
  const de = (toucher: Toucher, libelle: string): ChoseATouche => ({ toucher, libelle });
  if (ecran.genre === 'piste') {
    const { repondre } = ecran.autour;
    if (nom === 'etiquette-reponse' && ecran.pouce === 'saisie') return de({ genre: 'taper' }, textes.partie.taReponse);
    const rang = rangDans(nom, 'etiquette-choix-');
    const choix = rang !== undefined && repondre.genre === 'choix' ? repondre.proposes[rang] : undefined;
    if (rang !== undefined && choix !== undefined && ecran.pouce === 'choix')
      return de({ genre: 'toucherLEtiquette', rang }, `${choix.titre} · ${interprete(textes, choix)}`);
    return undefined;
  }
  if (ecran.genre === 'pochette') {
    const rang = rangDans(nom, 'pochette-choix-');
    const cle = rang !== undefined ? CLES_DES_CHOIX[ecran.choisi][rang] : undefined;
    if (rang !== undefined && cle !== undefined) return de({ genre: 'porter', rang }, (ecran.choisi === 'tete' ? P.tetes : P.dessus)[cle] ?? cle);
    if (nom === 'etiquette-vierge') return de({ genre: 'taperLeNom' }, P.tonNom);
  }
  // Au salon, le papier du lien se touche : on le partage, ou on le copie.
  if (ecran.genre === 'salon' && nom === 'etiquette-lien') return de({ genre: 'partagerLeLien' }, textes.partie.copier);
  // Dans la room, entre deux pistes : sa propre pochette, sur la tablée, se touche pour la refaire.
  if (ecran.genre === 'salon' || ecran.genre === 'hitParade' || ecran.genre === 'finale') {
    const etat = ecran.genre === 'hitParade' ? ecran.apres : ecran.etat;
    const rang = hitParade(etat).findIndex(({ joueur }) => joueur.id === ecran.toi);
    const premiers = TABLEE.telephone.finale.premiers.length;
    const sienne =
      rang < 0
        ? undefined
        : ecran.genre === 'salon'
          ? `pochette-joueur-${rang + 1}`
          : ecran.genre === 'hitParade'
            ? `pochette-hit-parade-${rang + 1}`
            : rang < premiers
              ? `pochette-finale-${rang + 1}`
              : `pochette-suivant-${rang - premiers + 1}`;
    if (nom === sienne) return de({ genre: 'maPochette' }, P.maPochette);
  }
  for (const cran of CRANS_DU_BAC) if (nom === `touche-bac-${cran}`) return de({ genre: 'cranDuBac', cran }, textes.playlists[cran]);
  // Dans le bac, quand le serveur a où chercher : un thème se touche, la recherche et le lien se tapent, un résultat se prend.
  if (ecran.genre === 'bac' && ecran.chercher) {
    const { cran } = ecran.bac;
    // Un intercalaire se touche à son onglet : son carton, que ceux de devant cachent, prenait le doigt destiné à un autre.
    const cle = /^intercalaire-(.+)\/onglet$/.exec(nom)?.[1];
    const theme = cle !== undefined ? textes.bac.themes[cle] : undefined;
    // La pochette personnalisée ouvre « Mes playlists » : celles qu'on a importées, et le lien à coller.
    if (cle === 'mesPlaylists' && theme !== undefined) return de({ genre: 'cranDuBac', cran: 'laMienne' }, theme);
    if (cran === 'pretes' && cle !== undefined && theme !== undefined) return de({ genre: 'theme', cle, recherche: theme }, theme);
    // Les playlists du genre : un disque, ou son papier ; et « Au hasard ».
    const playlist = rangDans(nom, 'disque-playlist-') ?? rangDans(nom, 'etiquette-playlist-');
    const proposee = playlist !== undefined ? ecran.bac.proposees?.[playlist] : undefined;
    if (cran === 'pretes' && playlist !== undefined && proposee !== undefined) return de({ genre: 'resultat', rang: playlist }, proposee.titre);
    if (cran === 'pretes' && nom === 'touche-hasard-bac') return de({ genre: 'playlistAuHasard' }, textes.playlists.auHasard);
    if (cran === 'chercher' && nom === 'etiquette-recherche') return de({ genre: 'taperLaRecherche' }, textes.playlists.chercher);
    const rang = rangDans(nom, 'disque-resultat-');
    if (cran === 'chercher' && rang !== undefined) return de({ genre: 'resultat', rang }, `${textes.playlists.chercher} ${rang + 1}`);
    if (cran === 'laMienne' && nom === 'etiquette-lien') return de({ genre: 'collerLeLien' }, textes.playlists.laMienne);
    const mienne = /^(?:disque|etiquette)-mienne-(\d+)$/.exec(nom)?.[1];
    if (cran === 'laMienne' && mienne !== undefined)
      return de({ genre: 'maPlaylist', rang: Number(mienne) - 1 }, `${textes.playlists.laMienne} ${mienne}`);
  }
  // Aux réglages, les commandes de la platine se tournent, quand l'hôte peut les régler.
  if (ecran.genre === 'reglages' && ecran.commandes) {
    const C = textes.commandes;
    if (nom === 'bouton-pistes') return de({ genre: 'tournerLeBouton', bouton: 'pistes' }, `${C.pistes} : ${ecran.pistes}`);
    if (nom === 'bouton-extrait') return de({ genre: 'tournerLeBouton', bouton: 'extrait' }, `${C.extrait} : ${ecran.extrait}`);
    // La manette du mode : la toucher la couche vers le mode suivant ; toucher un nom gravé autour d'elle prend ce mode-là.
    if (nom === 'interrupteur-mode')
      return de({ genre: 'tournerLeBouton', bouton: 'mode' }, `${C.mode} : ${C.modes[ecran.mode.cle] ?? ecran.mode.cle}`);
    const direction = DIRECTIONS.find((d) => nom === `interrupteur-mode/${d}`);
    const mode = direction !== undefined ? MODES_PAR_CRAN[PLATINE.commandes.interrupteur.manette.directions.indexOf(direction)] : undefined;
    if (mode !== undefined) return de({ genre: 'choisirLeMode', mode: mode.cle as CleDeMode }, `${C.mode} : ${C.modes[mode.cle] ?? mode.cle}`);
  }
  switch (nom) {
    case 'touche-poser':
      return de({ genre: 'poser' }, T.poserUnDisque);
    case 'touche-compte':
      return de({ genre: 'compte' }, textes.compte.touche);
    case 'etiquette-email':
      return de({ genre: 'taperLAdresse' }, textes.compte.adresse);
    case 'etiquette-mot-de-passe':
      return de(
        { genre: 'taperLeMotDePasse' },
        ecran.genre === 'compte' && ecran.compte.etape === 'nouveauMotDePasse'
          ? textes.compte.motDePasse.nouveau
          : textes.compte.motDePasse.etiquette,
      );
    case 'touche-avec-mot-de-passe':
      return de({ genre: 'avecUnMotDePasse' }, textes.compte.avecUnMotDePasse);
    case 'touche-entrer-mot-de-passe':
      return de({ genre: 'entrerAvecLeMotDePasse' }, textes.compte.entrer);
    case 'touche-oublie':
      return de({ genre: 'motDePasseOublie' }, textes.compte.motDePasse.oublie);
    case 'touche-choisir-mot-de-passe':
      return de({ genre: 'nouveauMotDePasse' }, textes.compte.motDePasse.touche);
    case 'touche-garder-mot-de-passe':
      return de({ genre: 'garderLeMotDePasse' }, textes.compte.motDePasse.garder);
    case 'touche-envoyer':
      return de({ genre: 'envoyerLeLien' }, textes.compte.envoyer);
    case 'touche-autre-adresse':
      return de({ genre: 'autreAdresse' }, textes.compte.autreAdresse);
    case 'touche-entrer-compte':
      return de({ genre: 'entrerParLeLien' }, textes.compte.entrer);
    case 'touche-sortir':
      return de({ genre: 'sortirDuCompte' }, textes.compte.sortir);
    case 'touche-effacer':
      return de({ genre: 'effacerLeCompte' }, textes.compte.effacer);
    case 'touche-effacer-vraiment':
      return de({ genre: 'effacerVraiment' }, textes.compte.effacerVraiment);
    case 'touche-garder':
      return de({ genre: 'garderLeCompte' }, textes.compte.garder);
    case 'touche-retour':
      return de({ genre: 'retour' }, textes.compte.retour);
    case 'touche-code':
      return de({ genre: 'code' }, T.jAiUnCode);
    case 'etiquette-saisie':
      return de({ genre: 'taperLeCode' }, textes.partie.saisie);
    case 'touche-rejoindre':
      return de({ genre: 'entrer' }, textes.partie.rejoindre);
    case 'touche-laisser-code':
      return de({ genre: 'laisserLeCode' }, textes.partie.retour);
    case 'touche-revenir':
      return de({ genre: 'revenir' }, textes.partie.retour);
    case 'touche-fermer-bac':
      return de({ genre: 'fermerLeBac' }, textes.partie.retour);
    case 'touche-choix-tete':
      return de({ genre: 'ouvrirLeChoix', choix: 'tete' }, P.choix.tete);
    case 'touche-choix-dessus':
      return de({ genre: 'ouvrirLeChoix', choix: 'dessus' }, P.choix.dessus);
    case 'touche-hasard':
      return de({ genre: 'auHasard' }, P.auHasard);
    case 'touche-ma-pochette':
      return de({ genre: 'maPochette' }, P.maPochette);
    case 'touche-laisser':
      return de({ genre: 'laisserLaPochette' }, P.laisser);
    case 'etiquette-titres':
      return ecran.genre === 'finale' && ecran.joues.length > 0 ? de({ genre: 'revoirLesTitres' }, textes.partie.revoir) : undefined;
    case 'touche-fermer-titres':
      return de({ genre: 'fermerLesTitres' }, textes.partie.retour);
    case 'touche-autre-album':
      return de({ genre: 'autreAlbum' }, P.autreAlbum);
    case 'touche-c-est-moi':
      return de({ genre: 'cEstMoi' }, T.cEstMoi);
    case 'touche-choisir':
      return de({ genre: 'choisir' }, textes.playlists.choisir);
    case 'touche-ouvrir':
      return de({ genre: 'ouvrir' }, textes.partie.ouvrirLeSalon);
    case 'touche-allume':
      return de({ genre: 'allumer' }, textes.ampli.allume);
    case 'touche-lancer':
      return de(
        { genre: 'lancer' },
        ecran.genre === 'hitParade' ? T.suivante : ecran.genre === 'salon' && ecran.etat.face === 'B' ? T.lancerLaFaceB : T.lancer,
      );
    case 'touche-rejouer':
      return de({ genre: 'rejouer' }, T.rejouer);
    default:
      return undefined;
  }
}
