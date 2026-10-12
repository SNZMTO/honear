/**
 * Les gestes d'une piste : ce que font la platine, le disque mystère, sa pochette kraft et la pastille du décompte,
 * du « 3 » à la révélation. La chorégraphie est écrite ici : pour chaque grandeur, la suite de ses gestes, chacun compté depuis
 * un signal. Seuls ceux de la main qui raye le disque sont écrits ailleurs, avec ce qu'elle lui fait (voir rayures.ts).
 * La partition que suit le moteur, la liste des temps de l'atelier et les tests la lisent tous ici.
 */

import { radians } from '../../../lowpoly/vecteurs';
import type { Role } from '../../../mouvement/choregraphie';
import { tempsDeDescente } from '../../../mouvement/chute';
import { cible, trajectoire, type Consigne } from '../../../mouvement/moteur';
import { porter } from '../../../mouvement/portage';
import { AMPLEURS, MATIERES, TEMPS } from '../../../ressources/mouvement';
import { PASTILLES } from '../../../ressources/pastilles';
import { PLATINE } from '../../../ressources/platine';
import { ANGLE_DU_BRAS_AU_BORD, angleDuChrono } from '../chrono';
import { HALTES_DU_DISQUE } from '../emplacements';
import type { PisteEnScene } from '../etat';
import { DESCENTE_DU_BRAS } from '../instants';
import { deriveDesReperes } from '../plateau';
import { GESTES_DE_LA_MAIN, LACHER } from '../rayures';
import { porteParSaChute, pourLArreterNet, quiTombe, type Chute } from './chutes';
import { A_PLAT, angleDuDisqueRetourne, DISQUE_RETOURNE, ELAN_A_PLAT, envolDuDisque, penteDeLEnvol } from './retournement';
import { aChaqueRayure, tramer, type Trame } from './trame';
import {
  AVEC_TOUT,
  GRANDEURS,
  type CoupDeLaPiste,
  type Geste,
  type GestesDe,
  type GestesDeLaPiste,
  type Grandeur,
  type OptionsDeGestes,
} from './vocabulaire';

const M = MATIERES;
const V = MATIERES.plateau;
const { dansLaPochette, sorti, surLePlateau } = HALTES_DU_DISQUE;

/** Avant la piste : le disque dans sa pochette, le plateau à l'arrêt, le bras sur son repos, la pastille pas encore là. */
const AVANT: Readonly<Record<Grandeur, Consigne>> = {
  'disque.x': cible(dansLaPochette.en[0], M.vinyle.suit),
  'disque.y': cible(dansLaPochette.en[1], M.vinyle.suit),
  'disque.hauteur': cible(dansLaPochette.hauteur, M.vinyle.leve),
  'disque.retourne': cible(0, M.vinyle.suit),
  'disque.angle': cible(0, M.recalage),
  'etiquette.recalage': cible(0, M.recalage),
  reperes: cible(0, M.reperes),
  'bras.angle': cible(PLATINE.bras.repos, M.bras.retour),
  'bras.leve': cible(0, M.bras.suit),
  levier: cible(0, M.levier),
  'pastille.hauteur': cible(PASTILLES.decompte.arrivee.hauteur, M.pastille.seDecolle),
  'pastille.echelle': cible(PASTILLES.decompte.arrivee.echelle, M.pastille.seDecolle),
  'pastille.glisse': cible(0, M.pastille.file),
  'kraft.entrainee': cible(0, M.carton),
  regard: cible(0, M.regard),
};

/** Une valeur par grandeur. Le compilateur ne sait pas que toutes y sont : on le lui dit ici, une fois. */
const parGrandeur = <V>(valeur: (grandeur: Grandeur) => V): Readonly<Record<Grandeur, V>> =>
  Object.fromEntries(GRANDEURS.map((grandeur) => [grandeur, valeur(grandeur)])) as Record<Grandeur, V>;

/** Le rôle de chaque grandeur : sa consigne d'avant la piste, puis ses gestes. */
const rolesDe = (etapes: Readonly<Record<Grandeur, readonly Geste[]>>): Readonly<Record<Grandeur, Role<Geste>>> =>
  parGrandeur((grandeur) => ({ depart: AVANT[grandeur], etapes: etapes[grandeur] }));

const SANS_ETAPE: readonly Geste[] = [];
const SANS_GESTE: GestesDeLaPiste = { roles: rolesDe(parGrandeur(() => SANS_ETAPE)), coups: [] };

/**
 * Le disque : une main le tire hors de sa pochette, puis l'emporte au-dessus du plateau, où il se pose ; arrêté, il se soulève,
 * se retourne, et retombe à plat. Il suit la main avec son inertie, et ses deux trajets s'ajoutent : son chemin tourne sans s'arrêter.
 */
function gestesDuDisque({ T, au, coupAu, reactions }: Trame): GestesDe<'disque.x' | 'disque.y' | 'disque.hauteur' | 'disque.retourne'> {
  const D = TEMPS.disque;
  const R = TEMPS.retournement;
  const trajets = [
    { apres: D.sort, de: dansLaPochette.en, vers: sorti.en, main: M.main.tire, nom: 'disqueSort' },
    { apres: D.traverse, de: sorti.en, vers: surLePlateau.en, main: M.main.emporte, nom: 'disqueTraverse' },
  ] as const;
  const place = (axe: 0 | 1): Geste[] => {
    const portage = porter(
      dansLaPochette.en[axe],
      trajets.map(({ apres, de, vers, main }) => ({ a: T.trois + apres, de: vers[axe] - de[axe], main })),
      M.vinyle.suit,
    );
    // Chaque trajet a sa consigne, pour qu'on le voie partir ; toutes suivent le même portage : passer de l'une à l'autre ne change rien.
    return trajets.map(({ apres, main, nom }) =>
      au('trois', apres, trajectoire(portage.position, M.vinyle.suit, portage.vitesse), nom, { genre: 'main', main, suit: M.vinyle.suit }),
    );
  };
  const sePose = reactions ? M.vinyle.pose : M.vinyle.leve;
  // Il n'est pas arrêté à plat : c'est le plateau qui l'arrête, d'un coup, et sa vitesse d'arrivée se lit ainsi jusqu'au dernier instant.
  const seRetourne = trajectoire(
    (t) => DISQUE_RETOURNE.position(t - T.retournement),
    M.vinyle.suit,
    (t) => DISQUE_RETOURNE.vitesse(t - T.retournement),
  );
  // Sa hauteur suit son angle : il se soulève, monte et redescend avec son bord, et touche le plateau à l'instant où il arrive à plat.
  const seSouleve = trajectoire(
    (t) => surLePlateau.hauteur + envolDuDisque(angleDuDisqueRetourne(t - T.retournement)),
    M.vinyle.leve,
    (t) => penteDeLEnvol(angleDuDisqueRetourne(t - T.retournement)) * DISQUE_RETOURNE.vitesse(t - T.retournement),
  );
  const aPlat = R.seRetourne + A_PLAT;
  return {
    etapes: {
      'disque.x': place(0),
      'disque.y': place(1),
      'disque.hauteur': [
        au('trois', D.seSouleve, cible(AMPLEURS.vol, M.vinyle.leve), 'disqueSeSouleve'),
        au('trois', D.sePose, cible(surLePlateau.hauteur, sePose), 'disqueSePose'),
        au('arret', R.seSouleve, seSouleve, 'disqueSEleve'),
        au('arret', aPlat, cible(surLePlateau.hauteur, sePose)),
      ],
      'disque.retourne': [
        au('arret', R.seRetourne, seRetourne, 'disqueSeRetourne', {
          genre: 'retournement',
          main: M.main.retourne,
          suit: M.vinyle.suit,
          duree: A_PLAT,
        }),
        au('arret', aPlat, cible(180, M.vinyle.suit)),
      ],
    },
    // Retombé à plat, le plateau l'arrête net ; de l'élan qu'il avait, il reste de quoi tasser la feutrine, comme quand il s'est posé au « 3 ».
    coups: [
      coupAu('arret', aPlat, 'disque.retourne', -ELAN_A_PLAT.tourne),
      coupAu('arret', aPlat, 'disque.hauteur', ELAN_A_PLAT.descend - (reactions ? AMPLEURS.retournement.tassement : 0), 'disqueSeTasse'),
    ],
  };
}

/**
 * Ce qui tourne : le disque, avec le plateau, sauf quand une main le raye ; son étiquette, qui se recale en cachette pour qu'il
 * s'arrête à l'endroit ; et les repères du plateau, tels qu'on les voit dériver.
 */
function gestesDeCeQuiTourne({ piste, T, au, rayures, reactions, plateau }: Trame): GestesDe<'disque.angle' | 'etiquette.recalage' | 'reperes'> {
  const vitesseDuPlateau = (t: number): number => plateau(t).vitesse;
  const tourne = trajectoire((t) => plateau(t).angle, M.recalage, vitesseDuPlateau);
  const disque: Geste[] = [
    au('deux', 0, tourne, 'plateauPart', { genre: 'lancement', volant: V }),
    ...aChaqueRayure(rayures, (rayure) => [
      ...GESTES_DE_LA_MAIN.map(({ apres, ecart, matiere, nom }) => [apres, cible(rayure.prise + ecart, matiere), nom] as const),
      [LACHER.apres, trajectoire((t) => plateau(t).angle - rayure.retard, LACHER.matiere, vitesseDuPlateau), LACHER.nom],
    ]),
  ];
  // L'étiquette tourne avec le disque : rayé ou pas, c'est le même objet. Dès que le moteur coupe, elle se décale sous ses arcs longs,
  // qui la cachent encore, de moins d'un demi-tour : ainsi le disque s'arrête exactement à l'endroit.
  const recalage: Geste[] = [];
  if (Number.isFinite(T.arret)) {
    const arrivee = plateau(T.arret).angle - (rayures[rayures.length - 1]?.retard ?? 0);
    const aRendre = arrivee - 360 * Math.round(arrivee / 360);
    recalage.push(
      au('revelation', TEMPS.revelation.moteurCoupe, cible(-aRendre, M.etiquetteSeRecale), 'moteurCoupe', { genre: 'frottement', volant: V }),
    );
  }
  // Les repères du plateau : leur dérive apparente ; rayé, le disque freine un instant le plateau.
  const derive = deriveDesReperes(piste);
  const derivent = trajectoire(derive.angle, M.reperes, derive.vitesse);
  const accusent = trajectoire((t) => derive.angle(t) - AMPLEURS.rayure.repere, M.reperes, derive.vitesse);
  const reperes: Geste[] = [
    au('deux', 0, derivent),
    ...(reactions
      ? aChaqueRayure(rayures, () => [
          [TEMPS.rayure.repereAccuse, accusent, 'reperesAccusent'],
          [TEMPS.rayure.repereSeReprend, derivent, 'reperesSeReprennent'],
        ])
      : []),
  ];
  return { etapes: { 'disque.angle': disque, 'etiquette.recalage': recalage, reperes } };
}

const CHUTE_DU_BRAS: Chute = { amortisseur: M.bras.descend, hauteur: AMPLEURS.brasLeve };

/**
 * Le bras : levé, il pivote vers le bord ; puis il descend, suit l'extrait, et retourne à son repos à la révélation.
 * Le diamant qui touche le disque repart d'un px vers le haut ; à chaque rayure, un temps après que la main a pris le disque,
 * le bras tressaute d'autant, sauf si la rayure suivante ou la révélation lui coupent court ; reposé sur son support, il s'arrête net.
 */
function gestesDuBras({ piste, T, au, coupAu, rayures, reactions, plateau }: Trame): GestesDe<'bras.angle' | 'bras.leve' | 'levier'> {
  const ondulation = reactions ? AMPLEURS.ondulation : 0;
  const chrono = trajectoire((t) => angleDuChrono(piste, t) + ondulation * Math.sin(radians(plateau(t).angle)), M.bras.suit);
  const seRepose = TEMPS.revelation.brasSeRepose;
  const descend = (depuis: number): Consigne => quiTombe(CHUTE_DU_BRAS, depuis, AMPLEURS.brasLeve, 0, M.bras.suit);
  const arretNet = pourLArreterNet(CHUTE_DU_BRAS, AMPLEURS.brasLeve, 0);
  const tressaute = TEMPS.rayure.brasTressaute;
  const tressauts = rayures
    .filter(({ a, jusqua }) => a + tressaute < Math.min(jusqua, T.revelation))
    .map(({ a }): CoupDeLaPiste => ({
      a: a + tressaute,
      grandeur: 'bras.leve',
      vitesse: AMPLEURS.rebond,
      signal: 'rayure',
      apres: tressaute,
      nom: 'brasTressaute',
    }));
  return {
    etapes: {
      'bras.angle': [
        au('un', TEMPS.bras.pivote, cible(ANGLE_DU_BRAS_AU_BORD, M.bras.pivote), 'brasPivote'),
        au('extrait', 0, chrono),
        au('revelation', TEMPS.revelation.brasRetourne, cible(PLATINE.bras.repos, M.bras.retour), 'brasRetourne'),
      ],
      'bras.leve': [
        au('un', TEMPS.bras.seLeve, cible(AMPLEURS.brasLeve, M.bras.leve), 'brasSeLeve'),
        au('extrait', -DESCENTE_DU_BRAS, descend(T.descente), 'brasDescend', porteParSaChute(CHUTE_DU_BRAS)),
        au('extrait', 0, cible(0, M.bras.touche)),
        au('revelation', TEMPS.revelation.brasSeLeve, cible(AMPLEURS.brasLeve, M.bras.sec), 'brasReleve'),
        au('revelation', seRepose, descend(T.revelation + seRepose), 'brasSeRepose', porteParSaChute(CHUTE_DU_BRAS)),
        au('revelation', seRepose + DESCENTE_DU_BRAS, cible(0, M.bras.suit)),
      ],
      levier: [
        au('un', TEMPS.bras.levier, cible(1, M.levier), 'levierMonte'),
        au('extrait', -(DESCENTE_DU_BRAS + TEMPS.descente.levier), cible(0, M.levier), 'levierDescend'),
        au('revelation', 0, cible(1, M.levier), 'levierReleve'),
        au('revelation', TEMPS.revelation.levierSeBaisse, cible(0, M.levier), 'levierDescend'),
      ],
    },
    coups: [
      coupAu('extrait', 0, 'bras.leve', (reactions ? AMPLEURS.rebond : 0) + arretNet, 'diamantTouche'),
      ...(reactions ? tressauts : []),
      coupAu('revelation', seRepose + DESCENTE_DU_BRAS, 'bras.leve', arretNet),
    ],
  };
}

/** La pastille du décompte arrive d'un peu plus haut, un peu plus grande : elle tombe de cette hauteur, et le socle l'arrête net. */
const CHUTE_DE_LA_PASTILLE: Chute = { amortisseur: M.pastille.tombe, hauteur: PASTILLES.decompte.arrivee.hauteur };

/** La pastille du décompte : elle claque au « 3 », se décolle quand l'extrait part, et file. */
function gestesDeLaPastille({ T, au, coupAu }: Trame): GestesDe<'pastille.hauteur' | 'pastille.echelle' | 'pastille.glisse'> {
  const { hauteur, echelle } = PASTILLES.decompte.arrivee;
  const collee = tempsDeDescente(CHUTE_DE_LA_PASTILLE.amortisseur, CHUTE_DE_LA_PASTILLE.hauteur);
  /** Sa hauteur et sa taille suivent la même chute, puis se décollent ensemble. */
  const claque = (grandeur: 'pastille.hauteur' | 'pastille.echelle', de: number, a: number): Geste[] => [
    au('trois', 0, quiTombe(CHUTE_DE_LA_PASTILLE, T.trois, de, a, M.pastille.seDecolle), 'pastilleClaque', porteParSaChute(CHUTE_DE_LA_PASTILLE)),
    au('trois', collee, cible(a, M.pastille.seDecolle)),
    au('extrait', TEMPS.pastille.seDecolle, AVANT[grandeur], 'pastilleSeDecolle'),
  ];
  return {
    etapes: {
      'pastille.hauteur': claque('pastille.hauteur', hauteur, 0),
      'pastille.echelle': claque('pastille.echelle', echelle, 1),
      'pastille.glisse': [au('extrait', TEMPS.pastille.file, cible(AMPLEURS.fuiteDeLaPastille, M.pastille.file), 'pastilleFile')],
    },
    coups: [
      coupAu('trois', collee, 'pastille.hauteur', pourLArreterNet(CHUTE_DE_LA_PASTILLE, hauteur, 0)),
      coupAu('trois', collee, 'pastille.echelle', pourLArreterNet(CHUTE_DE_LA_PASTILLE, echelle, 1)),
    ],
  };
}

/**
 * Autour de la platine : le disque qui sort de sa pochette kraft l'entraîne un instant ; et le regard, qui ne quitte la platine
 * qu'une fois le disque arrêté et le bras reposé, s'arrête sur le disque, qui lui répond en se retournant.
 */
function gestesAlentour({ au }: Trame): GestesDe<'kraft.entrainee' | 'regard'> {
  return {
    etapes: {
      // La pochette entraînée reste où le disque l'a laissée : ce n'est pas une réaction qu'on retire à un appareil qui peine,
      // sinon elle changerait de place chaque fois qu'on allège la scène en route.
      'kraft.entrainee': [au('trois', TEMPS.kraft.entrainee, cible(AMPLEURS.entrainementDuKraft, M.carton), 'kraftEntrainee')],
      regard: [au('arret', TEMPS.retournement.regard, cible(AMPLEURS.regardSurLaReponse, M.regard), 'regardGlisse')],
    },
  };
}

export function gestesDeLaPiste(scene: PisteEnScene, o: OptionsDeGestes = AVEC_TOUT): GestesDeLaPiste {
  const { piste } = scene;
  if (piste === undefined) return SANS_GESTE;
  const trame = tramer(scene, piste, o);
  const [disque, tourne, bras, pastille, alentour] = [
    gestesDuDisque(trame),
    gestesDeCeQuiTourne(trame),
    gestesDuBras(trame),
    gestesDeLaPastille(trame),
    gestesAlentour(trame),
  ];
  return {
    // Chaque grandeur a ses gestes, écrits par une pièce et une seule : le compilateur vérifie qu'il n'en manque aucune.
    roles: rolesDe({ ...disque.etapes, ...tourne.etapes, ...bras.etapes, ...pastille.etapes, ...alentour.etapes }),
    // Les coups, dans l'ordre où ils tombent ; ceux d'un même instant gardent celui de leurs pièces.
    coups: [disque, tourne, bras, pastille, alentour]
      .flatMap((piece: Pick<GestesDe<never>, 'coups'>) => piece.coups ?? [])
      .map((coup, rang) => ({ coup, rang }))
      .sort((un, autre) => un.coup.a - autre.coup.a || un.rang - autre.rang)
      .map(({ coup }) => coup),
  };
}
