/**
 * Les animations du meuble : l'ampli qu'on allume, le gros bouton du volume, les commandes de la platine, le regard qui glisse
 * de la platine à l'ampli, la playlist qui sort du bac. Chacune dessine sa part du meuble une fois, sur les objets d'exemple de
 * l'étape 5, et ne règle ensuite que des transformations et des opacités.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { codeDePartie, partieA } from '../../regles/partie';
import { AMPLI } from '../../ressources/ampli';
import { GESTES, MATIERES } from '../../ressources/mouvement';
import { PLATINE } from '../../ressources/platine';
import { SITE } from '../../ressources/reglages';
import { CRANS_DU_VOLUME, dessinerLAmpli, reglerLAmpli } from '../../scene/ampli';
import { dessinerLeBac, reglerUnePlaylist } from '../../scene/bac';
import { role, vers, type Geste } from '../../scene/gestes/geste';
import {
  allumerLAmpli,
  basculer,
  deCranEnCran,
  regardQuiGlisse,
  sortirUnePlaylist,
  volumeAuDoigt,
  type GrandeurDeLAmpli,
  type GrandeurDuRegard,
} from '../../scene/gestes/meuble';
import { dessinerLeMeuble, type Regard } from '../../scene/meuble';
import { remplir } from '../../scene/phrases';
import { reglerLaBascule } from '../../scene/platine/interrupteur';
import { rotation } from '../../scene/reglage';
import { kraftDuSalon } from '../../scene/telephone/kraft';
import { platineArretee } from '../../scene/telephone/meuble';
import { ampliDuSalon, bacDesPlaylistsPretes } from '../../scene/telephone/meuble';
import { DENSITE, regardSur, SUR_LA_PLATINE, type Ecritoire } from '../../scene/telephone/pieces';
import { LEGENDES_DES_ECRANS as L } from '../etape5/legendes.fr';
import { journalDExemple } from '../etape5/scenes';
import { autourDeLObjet, partDe, type Animation, type CleDAnimation } from './animation';
import { INTERRUPTIONS } from './legendes.fr';

const R = SUR_LA_PLATINE;

/** Ce que chaque animation reprend de la pellicule de l'étape 5 : son titre, son texte, ses instants marquants. */
const dite = (cle: CleDAnimation) => ({
  cle,
  titre: L.animations[cle].titre,
  texte: L.animations[cle].texte,
  images: L.animations[cle].images,
});

/** Une part du meuble, dessinée pour qu'on la regarde de près : le bois sous elle, sur tout ce cadre. */
const surSonBois = (cadre: Regard, ...objets: Parameters<typeof dessinerLeMeuble>[0]['objets']) =>
  dessinerLeMeuble({ regard: cadre, densite: DENSITE, objets });

// ————— L'ampli —————

type GrandeurDeLAmpliAllume = GrandeurDeLAmpli | 'voyant';

/** Ce qui porte le clic de l'interrupteur : le voyant change avec lui. */
const CLIC = GESTES.ampli.clic.ressort;
/** On l'éteint pendant que les aiguilles sont en butée : tant après qu'elles sont parties. */
const EN_BUTEE = 0.08;

function lAmpli(a: Ecritoire): Animation<GrandeurDeLAmpliAllume> {
  const allumage = allumerLAmpli(0);
  // Le voyant passe au miel au clic : une grandeur de plus, qui va de 0 à 1 aussi vite que le clic lui-même.
  const geste: Geste<GrandeurDeLAmpliAllume> = { ...allumage, roles: { ...allumage.roles, voyant: role(0, vers(allumage.clic, 1, CLIC)) } };
  const etat = ampliDuSalon(a.textes, false, [0, 0]);
  const ampli = dessinerLAmpli({ ...etat, interrupteur: 0, interrupteurEnTroisPoses: true }, DENSITE);
  const cadre = autourDeLObjet(ampli, a.encrier);
  return {
    ...dite('ampli'),
    etendue: cadre,
    scene: surSonBois(cadre, ampli),
    geste,
    regler: (v) => [
      ...reglerLAmpli({ allume: v.voyant > 1 / 2, aiguilles: [v.gauche, v.droite], volume: etat.volume }),
      ...reglerLaBascule('ampli', v.interrupteur),
    ],
    regard: () => cadre,
    interruption: { a: allumage.clic + GESTES.ampli.aiguilles.a + EN_BUTEE, ceQuiChange: INTERRUPTIONS.ampli },
    interrompre: (t, v) => {
      const eteint = basculer(t, false);
      return {
        roles: {
          interrupteur: eteint,
          voyant: role(v.voyant, vers(eteint.clic, 0, CLIC)),
          gauche: role(v.gauche, vers(t, 0, MATIERES.aiguille.retombe)),
          droite: role(v.droite, vers(t, 0, MATIERES.aiguille.retombe)),
        },
        vibrations: [eteint.clic],
      };
    },
    grossissement: 1,
  };
}

// ————— Le gros bouton du volume —————

/** Le doigt tourne d'un peu plus de trois crans en 600 ms, d'un mouvement régulier : 36 images à 60 par seconde. */
const IMAGES_DU_DOIGT = 36;
const CADENCE = 60;
const CRANS_PARCOURUS = 3.4;
/** Le doigt repart en arrière à mi-chemin. */
const A_MI_CHEMIN = 0.3;

/** Le doigt autour du bouton, d'un angle à un autre, d'un mouvement régulier, à partir d'un instant. */
const doigt = (depuis: number, de: number, a2: number): { readonly a: number; readonly angle: number }[] =>
  Array.from({ length: IMAGES_DU_DOIGT + 1 }, (_, i) => ({ a: depuis + i / CADENCE, angle: de + (i / IMAGES_DU_DOIGT) * (a2 - de) }));

function leVolume(a: Ecritoire): Animation<'volume'> {
  const etat = ampliDuSalon(a.textes, true);
  const de = CRANS_DU_VOLUME[etat.volume] ?? 0;
  const ampli = dessinerLAmpli(etat, DENSITE);
  const cadre = autourDeLObjet(ampli, a.encrier);
  return {
    ...dite('volume'),
    etendue: cadre,
    scene: surSonBois(cadre, ampli),
    geste: volumeAuDoigt(doigt(0, de, de + CRANS_PARCOURUS * AMPLI.volume.pas), CRANS_DU_VOLUME),
    regler: (v) => [rotation('bouton-volume/index/trait/tourne', 0, v.volume)],
    regard: () => cadre,
    interruption: { a: A_MI_CHEMIN, ceQuiChange: INTERRUPTIONS.volume },
    interrompre: (t, v) => volumeAuDoigt(doigt(t, v.volume, de), CRANS_DU_VOLUME),
    grossissement: 1,
  };
}

// ————— Les commandes de la platine —————

/** On se ravise pendant que le son bascule : tant après qu'il est parti. */
const EN_BASCULANT = 0.06;

function lesCommandes(a: Ecritoire): Animation<'angle' | 'son'> {
  const crans = PLATINE.commandes.boutons.mode.crans;
  const son = basculer(GESTES.selecteur.cran * 2, true);
  const geste: Geste<'angle' | 'son'> = { roles: { angle: deCranEnCran(crans, 0, 1, 0).roles.angle, son } };
  const cadre = partDe(R, 150, PLATINE.commandes.ligne - 80, 240, 110);
  return {
    ...dite('commandes'),
    etendue: cadre,
    scene: surSonBois(cadre, platineArretee(a, { mode: 0, son: 0 })),
    geste,
    regler: (v) => [rotation('bouton-mode/index/trait/tourne', 0, v.angle), ...reglerLaBascule('son', v.son)],
    regard: () => cadre,
    interruption: { a: GESTES.selecteur.cran * 2 + EN_BASCULANT, ceQuiChange: INTERRUPTIONS.commandes },
    interrompre: (t) => ({ roles: { angle: deCranEnCran(crans, 1, 0, t).roles.angle, son: basculer(t, false) } }),
    grossissement: 2,
  };
}

// ————— Le regard —————

/** Ce qu'on garde du cadre pour suivre le regard : le haut, où sont la platine et l'ampli. */
const HAUT_DU_MEUBLE = 520;

function leRegard(a: Ecritoire): Animation<GrandeurDuRegard> {
  const code = codeDePartie(hasard(L.partie.graine).suivant);
  const salon = partieA(journalDExemple(a.textes), -94);
  const etat = ampliDuSalon(a.textes, false, [0, 0]);
  const ampli = dessinerLAmpli(etat, DENSITE);
  const versLAmpli = regardSur(ampli, a.encrier);
  const geste = regardQuiGlisse(R.origine, versLAmpli.origine, 0);
  const [de, a2] = [R.origine, versLAmpli.origine];
  // Toute la part du meuble que le regard parcourt, de la platine à l'ampli.
  const etendue: Regard = {
    origine: [Math.min(de[0], a2[0]), Math.min(de[1], a2[1])],
    largeur: Math.abs(a2[0] - de[0]) + R.largeur,
    hauteur: Math.abs(a2[1] - de[1]) + HAUT_DU_MEUBLE,
  };
  return {
    ...dite('regard'),
    etendue,
    scene: surSonBois(
      etendue,
      platineArretee(a, { code: { code, joueurs: salon.joueurs.length } }),
      ...kraftDuSalon(a, `https://${remplir(a.textes.partie.lien, { site: SITE.adresse, code })}`, salon),
      ampli,
    ),
    geste,
    regler: (v) => reglerLAmpli({ allume: false, aiguilles: [v.signe, 0], volume: etat.volume }),
    regard: (v) => ({ origine: [v.x, v.y], largeur: R.largeur, hauteur: HAUT_DU_MEUBLE }),
    interruption: { a: geste.arrivee / 2, ceQuiChange: INTERRUPTIONS.regard },
    interrompre: (t, v) => regardQuiGlisse([v.x, v.y], R.origine, t),
    grossissement: 1,
  };
}

// ————— La playlist qui sort du bac —————

/** Le haut du cadre qu'occupe le bac, au téléphone. */
const BAC_A_L_ECRAN = 330;
/** On change d'avis pendant qu'elle monte : tant après qu'elle a commencé à sortir. */
const EN_MONTANT = 0.1;

function leBac(a: Ecritoire): Animation<'leve'> {
  const bac = bacDesPlaylistsPretes(a.textes);
  // La première playlist du troisième thème : on s'est arrêté sur son intercalaire.
  const choisie = (bac.rangees.flatMap((r, rang) => (r.genre === 'intercalaire' ? [rang] : []))[2] ?? 0) + 1;
  const cle = bac.rangees[choisie]?.cle ?? '';
  const dessin = dessinerLeBac({ rangees: bac.rangees.map((r, rang) => (rang === choisie ? { ...r, leve: 0 } : r)) }, DENSITE, a.encrier.largeur);
  const r = regardSur(dessin, a.encrier);
  const cadre = partDe(r, 0, 0, r.largeur, BAC_A_L_ECRAN);
  return {
    ...dite('bac'),
    etendue: cadre,
    scene: surSonBois(cadre, dessin),
    geste: sortirUnePlaylist(0),
    regler: (v) => reglerUnePlaylist(cle, v.leve),
    regard: () => cadre,
    interruption: { a: GESTES.bac.sortA + EN_MONTANT, ceQuiChange: INTERRUPTIONS.bac },
    interrompre: (t, v) => ({ roles: { leve: role(v.leve, vers(t, 0, GESTES.bac.sortie)) } }),
    grossissement: 1,
  };
}

/** Les animations du meuble, chacune faite à la demande. */
export const ANIMATIONS_DU_MEUBLE = {
  ampli: (a: Ecritoire) => lAmpli(a) as unknown as Animation,
  volume: (a: Ecritoire) => leVolume(a) as unknown as Animation,
  commandes: (a: Ecritoire) => lesCommandes(a) as unknown as Animation,
  regard: (a: Ecritoire) => leRegard(a) as unknown as Animation,
  bac: (a: Ecritoire) => leBac(a) as unknown as Animation,
} as const;
