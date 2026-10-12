/**
 * Les animations de la tablée, au téléphone : une pochette qui arrive, une bonne réponse, « Presque. », les quatre étiquettes,
 * la vraie pochette, une connexion qui tombe, le hit-parade, la finale. Chacune pose ses pièces une fois, sur la partie d'exemple
 * de l'étape 5, et ne règle ensuite que leurs transformations et leurs opacités. Une pastille qui tombe ne se montre qu'une fois
 * partie : avant, elle attend en haut, à la hauteur d'où elle arrive.
 */

import { hasard } from '../../lowpoly/aleatoire';
import { surLEcran, tourneeSurLeMeuble } from '../../lowpoly/projection';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Ressort } from '../../mouvement/ressort';
import { codeDePartie, hitParade as classement, mouvementsDuClassement, numeroDeLaPiste, partieA, type EtatDeLaPartie } from '../../regles/partie';
import type { NomDExpression } from '../../ressources/avatar';
import { AMPLEURS, GESTES, MATIERES } from '../../ressources/mouvement';
import { PASTILLES } from '../../ressources/pastilles';
import type { Pochette } from '../../ressources/pochettes';
import { RECOMPENSES } from '../../ressources/recompenses';
import { SITE } from '../../ressources/reglages';
import { TABLEE, type Place } from '../../ressources/tablee';
import type { Calque, Mesure } from '../../scene/calque';
import { glissant, immobile, role, vers, type Geste, type RoleDuGeste } from '../../scene/gestes/geste';
import {
  arriveeDUnePochette,
  bonneReponse,
  echelleEnLAir,
  finale,
  hitParade,
  presque,
  quatreEtiquettes,
  seRetourne,
  vraiePochette,
  type GrandeurDArrivee,
} from '../../scene/gestes/tablee';
import { dessinerLaPochetteKraft } from '../../scene/kraft';
import { dessinerLeMeuble, surLeBois } from '../../scene/meuble';
import { dessinerUnePastille, reglerUnePastille, type Pastille } from '../../scene/pastille';
import { remplir } from '../../scene/phrases';
import { kraftDeLaPiste } from '../../scene/piste/pieces';
import { poseDeDepart } from '../../scene/piste/reglages';
import { dessinerLaPochette, reglerLaPochette, type PlaceDePochette, type PochetteDessinee } from '../../scene/pochette';
import { dessinerLaVraiePochette, dessinerLeDosDUnePochette } from '../../scene/pochette/dos';
import { poignee, reglerLaPoignee } from '../../scene/poignee';
import { dessinerUnDisqueDeRecompense, FACETTES_DE_LA_COURONNE, reglerUnDisqueRemis } from '../../scene/recompense';
import { visibilite, type Reglage } from '../../scene/reglage';
import { pastillesDUnePochette, placesEnEventail, type JoueurPose, type PlaceDeLaTablee } from '../../scene/tablee';
import { eventail } from '../../scene/tablee';
import { kraftDuSalon } from '../../scene/telephone/kraft';
import { dansLeRegard, DENSITE, papier, SUR_LA_PLATINE, type Ecritoire } from '../../scene/telephone/pieces';
import { etiquetteEtSonMot, placeDuChoix } from '../../scene/telephone/reponse';
import { LEGENDES_DES_ECRANS as L } from '../etape5/legendes.fr';
import { choixDExemple, journalDExemple, laPiste } from '../etape5/scenes';
import { reponseDExemple } from '../exemples';
import { autourDe, partDe, type Animation, type CleDAnimation, type Valeurs } from './animation';
import { INTERRUPTIONS } from './legendes.fr';

const T = TABLEE.telephone;
const R = SUR_LA_PLATINE;
const ARRIVEE = PASTILLES.decompte.arrivee;

/** Ce que chaque animation reprend de la pellicule de l'étape 5 : son titre, son texte, ses instants marquants. */
const dite = (cle: CleDAnimation) => ({
  cle,
  titre: L.animations[cle].titre,
  texte: L.animations[cle].texte,
  images: L.animations[cle].images,
});

/** Une pochette posée une fois, qu'on fera glisser, tourner, monter : ce qui a été dessiné, et où. */
interface PochetteVivante {
  readonly dessinee: PochetteDessinee;
  readonly depart: PlaceDePochette;
  readonly taille: number;
}

/** Une pochette de la tablée, posée à une place du regard du téléphone. */
function poser(
  nom: `pochette-${string}`,
  pochette: Pochette,
  expression: NomDExpression,
  place: Place,
  taille: number,
  mesurer: Mesure,
  dos = false,
): PochetteVivante {
  const centre = surLeBois(R, place.en[0], place.en[1]);
  const pose = { nom, centre, angle: place.angle, taille, leve: 0 };
  const dessinee = dos ? dessinerLeDosDUnePochette(pose, pochette.artiste) : dessinerLaPochette(pochette, { ...pose, expression }, mesurer);
  return { dessinee, depart: { centre, angle: place.angle, leve: 0 }, taille };
}

const calquesDe = (p: PochetteVivante): Calque[] => [p.dessinee.ombre, p.dessinee.pochette];

/** Où mener une pochette vivante : à une place du regard, de tel angle, soulevée de tant. */
const mener = (p: PochetteVivante, en: Vec2, angle: number, leve = 0): Reglage[] =>
  reglerLaPochette(p.dessinee, p.taille, p.depart, { centre: surLeBois(R, en[0], en[1]), angle, leve });

/** Les pochettes de la tablée d'un état, chacune vivante, à sa place de l'éventail. */
const tableeVivante = (a: Ecritoire, joueurs: readonly JoueurPose[], places: readonly Place[], taille: number): PochetteVivante[] =>
  joueurs.map((j, rang) =>
    poser(
      `pochette-joueur-${rang + 1}`,
      j.pochette,
      j.expression,
      places[rang] ?? { en: [0, 0], angle: 0 },
      taille,
      a.encrier.largeur,
      j.dos === true,
    ),
  );

const dessinees = (pastilles: readonly Pastille[]): Calque[] =>
  pastilles.flatMap((p) => {
    const d = dessinerUnePastille(p);
    return [d.ombre, d.pastille];
  });

/** Une pastille dessinée une fois, réglée : sa place, ce qui la porte, sa hauteur en l'air, ce qu'elle montre. */
const reglerLaPastille = (p: Pastille, change: Partial<Pick<Pastille, 'en' | 'support' | 'enLAir' | 'montre'>>): Reglage[] =>
  reglerUnePastille({ ...p, ...change }, Object.keys(p.faces));

/** Une pastille à tant de px au-dessus de sa place : jamais plus bas que ce qui la reçoit, et un peu plus grande en haut. */
const enLAir = (hauteur: number): { readonly hauteur: number; readonly echelle: number } => ({
  hauteur: Math.max(0, hauteur),
  echelle: echelleEnLAir(hauteur),
});

/** Ce qu'une pastille qui tombe montre : rien tant qu'elle attend en haut, sa face une fois partie. */
const quandElleEstPartie = (hauteur: number): 'ecrite' | undefined => (hauteur < ARRIVEE.hauteur ? 'ecrite' : undefined);

/** Une pastille est collée à un demi-px près. */
const COLLEE = 1 / 2;

/** En deçà, une grandeur au repos est déjà où l'on veut la mener. */
const DEJA_LA = 1 / 100;

/**
 * Une grandeur au repos que l'interruption mène ailleurs, à l'instant t, si elle n'y est pas déjà : sinon elle reste où elle est,
 * et sa frise n'a pas de pas pour rien.
 */
const reprendreVers = (t: number, de: number, a2: number, ressort: Ressort): RoleDuGeste =>
  Math.abs(a2 - de) < DEJA_LA ? immobile(de) : role(de, vers(t, a2, ressort));

// ————— Une pochette arrive —————

type GrandeurDeLArrivee = GrandeurDArrivee | `dx${number}` | `dy${number}` | `angle${number}`;

/** Le joueur qui quitte le salon quand on l'interrompt : le deuxième de l'éventail. */
const QUI_QUITTE_LE_SALON = 1;
/** Ce dont sa pochette glisse vers le bas pour sortir du cadre, en px. */
const SORTIE_DU_SALON = 120;

function arrivee(a: Ecritoire): Animation<GrandeurDeLArrivee> {
  const etat = partieA(journalDExemple(a.textes), -94);
  const joueurs = eventail(etat, a.textes, 'rien');
  const places = placesEnEventail(joueurs.length);
  const rang = joueurs.length - 1;
  const place = places[rang] ?? { en: [0, 0], angle: 0 };
  const lancee = arriveeDUnePochette(place, T.eventail.taille, R.largeur, 0);
  // Les autres pochettes ne bougent pas, mais le moteur les suit déjà : si l'état change, elles repartent d'où elles sont.
  const immobiles = Object.fromEntries(
    places.flatMap((_, i) => (i === rang ? [] : [`dx${i}`, `dy${i}`, `angle${i}`].map((nom): [string, RoleDuGeste] => [nom, immobile(0)]))),
  );
  const geste = { ...lancee, roles: { ...lancee.roles, ...immobiles } as Record<GrandeurDeLArrivee, RoleDuGeste> };
  const pochettes = tableeVivante(a, joueurs, places, T.eventail.taille);
  const voisine = places[rang - 1];
  const touchee = voisine !== undefined && Math.hypot(voisine.en[0] - place.en[0], voisine.en[1] - place.en[1]) < T.eventail.taille;
  const code = codeDePartie(hasard(L.partie.graine).suivant);
  const cadre = partDe(R, 0, T.eventail.y - 62, R.largeur, 150);
  // Interrompue : un joueur quitte le salon ; l'éventail se refait sans lui, et chacune glisse vers sa nouvelle place.
  const refaites = placesEnEventail(joueurs.length - 1);
  return {
    ...dite('arrivee'),
    etendue: cadre,
    scene: dessinerLeMeuble({
      regard: cadre,
      densite: DENSITE,
      objets: [...kraftDuSalon(a, `https://${remplir(a.textes.partie.lien, { site: SITE.adresse, code })}`, etat), ...pochettes.flatMap(calquesDe)],
    }),
    geste,
    regler: (v) =>
      pochettes.flatMap((p, i) => {
        const ici = places[i];
        if (ici === undefined) return [];
        if (i === rang) return mener(p, [v.x, v.y], v.angle);
        const pousse = i === rang - 1 && touchee ? v.pousse : 0;
        const [dx, dy, da] = [v[`dx${i}`] ?? 0, v[`dy${i}`] ?? 0, v[`angle${i}`] ?? 0];
        return mener(p, [ici.en[0] + geste.sens[0] * pousse + dx, ici.en[1] + geste.sens[1] * pousse + dy], ici.angle + da);
      }),
    regard: () => cadre,
    interruption: { a: geste.duree / 2, ceQuiChange: INTERRUPTIONS.arrivee },
    interrompre: (t, v) => {
      const roles: Partial<Record<GrandeurDeLArrivee, RoleDuGeste>> = {};
      const derniere = refaites[refaites.length - 1] ?? place;
      roles.x = role(v.x, vers(t, derniere.en[0], MATIERES.carton));
      roles.y = role(v.y, vers(t, derniere.en[1], MATIERES.carton));
      roles.angle = role(v.angle, vers(t, derniere.angle, MATIERES.carton));
      roles.pousse = role(v.pousse, vers(t, 0, MATIERES.carton));
      for (const [i, ici] of places.entries()) {
        if (i === rang) continue;
        if (i === QUI_QUITTE_LE_SALON) {
          roles[`dy${i}`] = role(0, glissant(t, 0, SORTIE_DU_SALON, GESTES.arrivee.frottement));
          continue;
        }
        const la = refaites[i > QUI_QUITTE_LE_SALON ? i - 1 : i] ?? ici;
        roles[`dx${i}`] = reprendreVers(t, 0, la.en[0] - ici.en[0], MATIERES.carton);
        roles[`dy${i}`] = reprendreVers(t, 0, la.en[1] - ici.en[1], MATIERES.carton);
        roles[`angle${i}`] = reprendreVers(t, 0, la.angle - ici.angle, MATIERES.carton);
      }
      return { roles: roles as Record<GrandeurDeLArrivee, RoleDuGeste> };
    },
    grossissement: 1,
  };
}

/** L'éventail pendant l'extrait de la troisième piste, avant que personne n'ait trouvé. */
function enPiste(
  a: Ecritoire,
  apresLExtrait: number,
): { readonly etat: EtatDeLaPartie; readonly joueurs: JoueurPose[]; readonly places: PlaceDeLaTablee[] } {
  const etat = partieA(journalDExemple(a.textes), laPiste(a.textes).extrait + apresLExtrait);
  const joueurs = eventail(etat, a.textes, 'trouvailles');
  return { etat, joueurs, places: placesEnEventail(joueurs.length) };
}

const rangDans = (etat: EtatDeLaPartie, id: string): number => classement(etat).findIndex(({ joueur }) => joueur.id === id);

// ————— Une bonne réponse —————

type GrandeurDeDeuxReponses = 'pastille' | 'pastilleT' | 'pochette';

/** L'artiste trouvé à l'instant 0, le titre à l'instant `titreA` : deux pastilles, et la pochette qui encaisse deux fois. */
function deuxBonnesReponses(titreA: number): Geste<GrandeurDeDeuxReponses> {
  const [artiste, titre] = [bonneReponse(0), bonneReponse(titreA)];
  return {
    roles: {
      pastille: artiste.roles.pastille,
      pastilleT: titre.roles.pastille,
      pochette: role(0, ...artiste.roles.pochette.pas, ...titre.roles.pochette.pas),
    },
    coups: [...(artiste.coups ?? []), ...(titre.coups ?? []).map((c) => (c.grandeur === 'pastille' ? { ...c, grandeur: 'pastilleT' as const } : c))],
    vibrations: [artiste.impact, titre.impact],
  };
}

/** On l'interrompt pendant que la pochette encaisse encore la première : tant après l'impact. */
const ENCAISSE_ENCORE = 0.05;

function laBonneReponse(a: Ecritoire): Animation<GrandeurDeDeuxReponses> {
  const { etat, joueurs, places } = enPiste(a, 1);
  const rang = rangDans(etat, 'toi');
  const place = places[rang] ?? { en: [0, 0], angle: 0 };
  const toi = joueurs[rang];
  if (toi === undefined) throw new Error('Toi n’est pas à la tablée.');
  const geste = deuxBonnesReponses(GESTES.presque.reste / 2);
  const tablee = tableeVivante(a, joueurs, places, T.eventail.taille);
  // Sa pochette, deux fois : la tête concentrée, puis contente, une fois la première pastille collée.
  const [concentre, content] = (['concentre', 'content'] as const).map((expression) =>
    poser(`pochette-toi-${expression}`, toi.pochette, expression, place, T.eventail.taille, a.encrier.largeur),
  );
  if (concentre === undefined || content === undefined) throw new Error('La pochette de toi n’est pas posée.');
  // Chacune à son rang, la sienne comprise : celles qui viennent après elle passent par-dessus.
  const pochettes = tablee.flatMap((p, i) => (i === rang ? [...calquesDe(concentre), ...calquesDe(content)] : calquesDe(p)));
  const P = a.textes.partie;
  const pastilles = pastillesDUnePochette([P.aTrouveLArtiste, P.aTrouveLeTitre], place, T.eventail.taille, R, T.trouve, a.encrier.largeur, 'toi');
  const cadre = autourDe(R, place.en, 130, 96);
  return {
    ...dite('bonneReponse'),
    etendue: cadre,
    scene: dessinerLeMeuble({
      regard: cadre,
      densite: DENSITE,
      objets: [...pochettes, ...dessinees(pastilles)],
    }),
    geste,
    regler: (v) => {
      const contente = v.pastille < COLLEE;
      return [
        ...[concentre, content].flatMap((p) => {
          const montree = (p === content) === contente;
          return [
            ...mener(p, place.en, place.angle, v.pochette),
            visibilite(p.dessinee.pochette.nom, montree),
            visibilite(p.dessinee.ombre.nom, montree),
          ];
        }),
        // La première part dès l'instant 0 : on la voit arriver. La seconde attend son tour en haut.
        ...pastilles.flatMap((p, i) => {
          const hauteur = i === 0 ? v.pastille : v.pastilleT;
          return reglerLaPastille(p, {
            support: p.support + v.pochette,
            enLAir: enLAir(hauteur),
            montre: i === 0 ? 'ecrite' : quandElleEstPartie(hauteur),
          });
        }),
      ];
    },
    regard: () => cadre,
    interruption: { a: bonneReponse(0).impact + ENCAISSE_ENCORE, ceQuiChange: INTERRUPTIONS.bonneReponse },
    // Le titre tombe tout de suite : la première pastille et son encaisse vont leur train, la seconde part à l'instant de l'interruption.
    interrompre: (t) => deuxBonnesReponses(t),
    grossissement: 2,
  };
}

// ————— « Presque. » —————

function lePresque(a: Ecritoire): Animation<'pastille' | 'fuite'> {
  const geste = presque(0);
  const P = GESTES.presque;
  const cadre = partDe(R, 0, T.reponse.en[1] - 58, R.largeur, 112);
  const { calques, mot } = etiquetteEtSonMot(a, R, L.partie.presque, [], a.textes.pastilles.presque);
  if (mot === undefined) throw new Error('L’étiquette n’a pas de pastille « Presque. ».');
  // Sa place dans le regard : elle file vers la droite, à l'écran, de ce que dit `fuite`.
  const [x, y] = dansLeRegard(R, mot.en);
  return {
    ...dite('presque'),
    etendue: cadre,
    scene: dessinerLeMeuble({ regard: cadre, densite: DENSITE, objets: [...calques, ...dessinees([mot])] }),
    geste,
    regler: (v) => reglerLaPastille(mot, { en: surLeBois(R, x + v.fuite, y), enLAir: enLAir(v.pastille) }),
    regard: () => cadre,
    interruption: { a: presque(0).impact + P.reste / 2, ceQuiChange: INTERRUPTIONS.presque },
    interrompre: (t, v) => ({
      roles: {
        pastille: role(v.pastille, vers(t, P.decollee, MATIERES.pastille.seDecolle)),
        fuite: role(v.fuite, glissant(t + P.seDecolle, v.fuite, P.fuite, P.frottement)),
      },
    }),
    grossissement: 1,
  };
}

// ————— Les quatre étiquettes —————

function lesQuatreEtiquettes(a: Ecritoire): Animation {
  const C = T.choix;
  const G = GESTES.choix;
  const choix = choixDExemple(a.textes);
  const bonne = choix.findIndex((c) => c.titre === reponseDExemple(a.textes).titre);
  const geste = quatreEtiquettes(C.angles, 0, { rang: 0, a: 1 }, { a: 2, bonne });
  const cadre = partDe(R, 0, (C.y[0] ?? 0) - 34, R.largeur, (C.y[3] ?? 0) - (C.y[0] ?? 0) + 68);
  // Chacune posée à sa place, de son angle, dans une poignée qui la glisse et la tourne dans le plan du meuble. Son texte, lui,
  // reste écrit droit (voir le papier) : il glisse avec elle dans une poignée à lui, sans tourner.
  const etiquettes = choix.map((c, rang) => {
    const nom = `etiquette-choix-${rang + 1}` as const;
    const angle = C.angles[rang] ?? 0;
    const p = papier(
      nom,
      R,
      placeDuChoix(rang),
      C.largeur,
      angle,
      [
        { contenu: c.titre, role: 'techniqueFort', auPlus: 'mention' },
        { contenu: c.artiste, role: 'technique', auPlus: 'mention' },
      ],
      a.encrier,
      {
        role: 'mobile',
        auMoins: C.largeur,
      },
    );
    const [ombre, feuille] = p.calques;
    if (ombre === undefined || feuille === undefined) throw new Error(`L’étiquette « ${nom} » n’a pas d’ombre ou pas de papier.`);
    const forme = { ...feuille, contenu: feuille.contenu.filter((d) => d.genre !== 'texte') };
    const texte = { ...feuille, nom: `${nom}/texte` as const, contenu: feuille.contenu.filter((d) => d.genre === 'texte') };
    const pivot = surLEcran(p.milieu);
    const [tourne, glisse] = [`${nom}-poignee`, `${nom}-texte`] as const;
    return { tourne, glisse, pivot, calques: [poignee(tourne, [ombre, forme], pivot, 'mobile'), poignee(glisse, [texte], pivot, 'mobile')], angle };
  });
  return {
    ...dite('choix'),
    etendue: cadre,
    scene: dessinerLeMeuble({ regard: cadre, densite: DENSITE, objets: etiquettes.flatMap((e) => e.calques) }),
    geste,
    regler: (v: Valeurs) =>
      etiquettes.flatMap((e, rang) => {
        const decalage: Vec2 = [v[`x${rang}`] ?? 0, v[`enfonce${rang}`] ?? 0];
        return [
          ...reglerLaPoignee(e.tourne, e.pivot, decalage, tourneeSurLeMeuble((v[`angle${rang}`] ?? e.angle) - e.angle)),
          ...reglerLaPoignee(e.glisse, e.pivot, decalage),
        ];
      }),
    regard: () => cadre,
    interruption: { a: G.ecart * 3, ceQuiChange: INTERRUPTIONS.choix },
    // La révélation tombe pendant qu'elles arrivent : la bonne finit son entrée ; les mauvaises repartent d'où elles sont, à 40 ms d'écart.
    interrompre: (t, v: Valeurs) => {
      const roles: Record<string, RoleDuGeste> = {};
      let sortie = 0;
      for (const [rang, angle] of C.angles.entries()) {
        const x = v[`x${rang}`] ?? 0;
        roles[`x${rang}`] =
          rang === bonne ? (geste.roles[`x${rang}`] ?? immobile(0)) : role(x, glissant(t + sortie++ * G.ecart, x, -G.sortie, G.frottement));
        roles[`angle${rang}`] = reprendreVers(t, v[`angle${rang}`] ?? angle, angle, MATIERES.carton);
        roles[`enfonce${rang}`] = immobile(0);
      }
      return { roles };
    },
    grossissement: 1,
  };
}

// ————— La vraie pochette —————

/** On la remet sous la kraft pendant qu'elle sort : tant après son départ. */
const EN_SORTANT = 0.2;

function laVraiePochette(a: Ecritoire): Animation<'x' | 'y' | 'angle'> {
  const V = T.vraiePochette;
  // Le regard a glissé vers le disque : dans celui de la platine, la vraie pochette se pose d'autant plus à gauche.
  const place: Place = { en: [V.en[0] + AMPLEURS.regardSurLaReponse, V.en[1]], angle: V.angle };
  const geste = vraiePochette(place, 0);
  const sur = reponseDExemple(a.textes).pochette;
  if (!('vignette' in sur)) throw new Error('La réponse d’exemple n’a pas de vignette.');
  const centre = surLeBois(R, place.en[0], place.en[1]);
  const dessinee = dessinerLaVraiePochette(sur.vignette, { nom: 'pochette-vraie', centre, angle: place.angle, taille: V.taille }, 'vraie');
  const vraie: PochetteVivante = { dessinee, depart: { centre, angle: place.angle, leve: 0 }, taille: V.taille };
  // La kraft dit la piste qu'on révèle, comme le journal la donne.
  const journal = journalDExemple(a.textes);
  const piste = numeroDeLaPiste(partieA(journal, laPiste(a.textes).extrait));
  const kraft = dessinerLaPochetteKraft({ ...kraftDeLaPiste(poseDeDepart(false)), piste }, a.textes, a.encrier.largeur);
  const cadre = partDe(R, 60, V.en[1] - 120, 330, 240);
  const { x, y, angle } = geste.roles;
  return {
    ...dite('vraie'),
    etendue: cadre,
    // Elle sort de dessous : la kraft est posée par-dessus elle.
    scene: dessinerLeMeuble({ regard: cadre, densite: DENSITE, objets: [...calquesDe(vraie), kraft.ombre, kraft.corps, kraft.devant] }),
    geste,
    regler: (v) => mener(vraie, [v.x, v.y], v.angle),
    regard: () => cadre,
    interruption: { a: EN_SORTANT, ceQuiChange: INTERRUPTIONS.vraie },
    interrompre: (t, v) => ({
      roles: {
        x: role(v.x, vers(t, x.depart, MATIERES.carton)),
        y: role(v.y, vers(t, y.depart, MATIERES.carton)),
        angle: role(v.angle, vers(t, angle.depart, MATIERES.carton)),
      },
    }),
    grossissement: 1,
  };
}

// ————— Une connexion qui tombe —————

/** En deçà, une pochette vue de profil n'est plus qu'un fil : on la garde un peu plus large que ça. */
const PROFIL = 0.06;
/** Le joueur revient pendant qu'elle se retourne : tant après qu'elle a commencé. */
const EN_SE_RETOURNANT = 0.1;

function laDeconnexion(a: Ecritoire): Animation<'retourne'> {
  const { etat, joueurs, places } = enPiste(a, 2.9);
  const rang = rangDans(etat, 'mc');
  const place = places[rang] ?? { en: [0, 0], angle: 0 };
  const mc = joueurs[rang];
  if (mc === undefined) throw new Error('MC n’est pas à la tablée.');
  const tablee = tableeVivante(a, joueurs, places, T.eventail.taille);
  const face = poser('pochette-mc', mc.pochette, mc.expression, place, T.eventail.taille, a.encrier.largeur);
  const dos = poser('pochette-mc-dos', mc.pochette, mc.expression, place, T.eventail.taille, a.encrier.largeur, true);
  // Elle tourne sur elle-même autour de son centre, sur le bois : face, dos et leur ombre, dans une même poignée, à son rang.
  const pivot = surLEcran(face.depart.centre);
  const retournee = poignee('pochette-mc-retournee', [face.dessinee.ombre, face.dessinee.pochette, dos.dessinee.pochette], pivot, 'image');
  const pochettes = tablee.flatMap((p, i) => (i === rang ? [retournee] : calquesDe(p)));
  const cadre = autourDe(R, place.en, 130, 96);
  return {
    ...dite('deconnexion'),
    etendue: cadre,
    scene: dessinerLeMeuble({
      regard: cadre,
      densite: DENSITE,
      objets: pochettes,
    }),
    geste: seRetourne(0, true),
    regler: (v) => {
      const r = Math.max(0, Math.min(1, v.retourne));
      const leve = Math.sin(Math.PI * r) * GESTES.deconnexion.leve;
      return [
        ...mener(face, place.en, place.angle, leve),
        // Le dos suit la face ; il n'a pas d'ombre à lui, il partage la sienne.
        ...mener(dos, place.en, place.angle, leve).filter((reglage) => !reglage.calque.startsWith(dos.dessinee.ombre.nom)),
        visibilite(face.dessinee.pochette.nom, r < 1 / 2),
        visibilite(dos.dessinee.pochette.nom, r >= 1 / 2),
        ...reglerLaPoignee('pochette-mc-retournee', pivot, [0, 0], [Math.max(PROFIL, Math.abs(Math.cos(Math.PI * r))), 0, 0, 1]),
      ];
    },
    regard: () => cadre,
    interruption: { a: EN_SE_RETOURNANT, ceQuiChange: INTERRUPTIONS.deconnexion },
    interrompre: (t) => seRetourne(t, false),
    grossissement: 2,
  };
}

// ————— Le hit-parade —————

/** Le joueur qui quitte la partie quand on l'interrompt : le deuxième du classement d'après. */
const QUI_QUITTE_LA_PARTIE = 1;

function leHitParade(a: Ecritoire): Animation {
  const journal = journalDExemple(a.textes);
  const { extrait, revelation } = laPiste(a.textes);
  const [avant, apres] = [partieA(journal, extrait - 1 / 100), partieA(journal, revelation + 1)];
  const ids = (etat: EtatDeLaPartie): string[] => classement(etat).map(({ joueur }) => joueur.id);
  const [idsAvant, idsApres] = [ids(avant), ids(apres)];
  const H = T.hitParade;
  const G = GESTES.hitParade;
  const placeDuRang = (rang: number): Place => ({ en: [H.x[rang % 4] ?? 0, H.y[Math.floor(rang / 4)] ?? 0], angle: H.angles[rang % 4] ?? 0 });
  const places = idsApres.map((_, rang) => placeDuRang(rang));
  const mouvements = mouvementsDuClassement(avant, apres);
  const P = a.textes.pastilles;
  const geste = hitParade(idsAvant, idsApres, places, 0, Object.keys(mouvements));
  const parId = new Map(classement(apres).map(({ joueur }) => [joueur.id, joueur]));
  // Celles qui montent passent par-dessus les autres : on les pose en dernier.
  const monte = (id: string): number => Number(idsApres.indexOf(id) < idsAvant.indexOf(id));
  const pochettes = [...idsApres]
    .sort((x, y) => monte(x) - monte(y))
    .flatMap((id) => {
      const joueur = parId.get(id);
      const place = places[idsApres.indexOf(id)];
      if (joueur === undefined || place === undefined) return [];
      const m = mouvements[id];
      const texte = m === undefined ? undefined : m.genre === 'entree' ? P.entree : remplir(P[m.genre], { places: m.places });
      const vivante = poser(`pochette-hit-parade-${id}`, joueur.pochette, joueur.expression, place, H.taille, a.encrier.largeur, !joueur.connecte);
      const pastilles =
        texte !== undefined ? pastillesDUnePochette([texte], place, H.taille, R, T.pastille, a.encrier.largeur, `hit-parade-${id}`) : [];
      return [{ id, place, vivante, pastilles }];
    });
  const cadre = partDe(R, 0, (H.y[0] ?? 0) - 56, R.largeur, 200);
  const quitte = idsApres[QUI_QUITTE_LA_PARTIE] ?? '';
  return {
    ...dite('hitParade'),
    etendue: cadre,
    scene: dessinerLeMeuble({
      regard: cadre,
      densite: DENSITE,
      objets: [...pochettes.flatMap((p) => calquesDe(p.vivante)), ...pochettes.flatMap((p) => dessinees(p.pastilles))],
    }),
    geste,
    regler: (v: Valeurs) =>
      pochettes.flatMap(({ id, place, vivante, pastilles }) => {
        const [x, y, leve] = [v[`x-${id}`] ?? place.en[0], v[`y-${id}`] ?? place.en[1], v[`leve-${id}`] ?? 0];
        // Ses pastilles la suivent : décalées d'autant qu'elle, à l'écran.
        const [dx, dy] = [x - place.en[0], y - place.en[1]];
        return [
          ...mener(vivante, [x, y], place.angle, leve),
          ...pastilles.flatMap((p) => {
            const [px, py] = dansLeRegard(R, p.en);
            const hauteur = v[`pastille-${id}`] ?? 0;
            return reglerLaPastille(p, {
              en: surLeBois(R, px + dx, py + dy),
              support: p.support + leve,
              enLAir: enLAir(hauteur),
              montre: quandElleEstPartie(hauteur),
            });
          }),
        ];
      }),
    regard: () => cadre,
    interruption: { a: G.ecart * 4, ceQuiChange: INTERRUPTIONS.hitParade },
    // Un joueur s'en va : sa pochette file hors du cadre ; les autres repartent vers leurs nouvelles places, du dernier au premier.
    interrompre: (t, v: Valeurs) => {
      const restent = idsApres.filter((id) => id !== quitte);
      const roles: Record<string, RoleDuGeste> = {};
      const garder = (nom: string): RoleDuGeste => geste.roles[nom as keyof typeof geste.roles] ?? immobile(v[nom] ?? 0);
      const x = v[`x-${quitte}`] ?? 0;
      roles[`x-${quitte}`] = role(x, glissant(t, x, R.largeur + H.taille, GESTES.arrivee.frottement));
      roles[`y-${quitte}`] = immobile(v[`y-${quitte}`] ?? 0);
      roles[`leve-${quitte}`] = reprendreVers(t, v[`leve-${quitte}`] ?? 0, 0, G.sePose);
      roles[`pastille-${quitte}`] = garder(`pastille-${quitte}`);
      [...restent].reverse().forEach((id, k) => {
        const la = places[restent.indexOf(id)];
        if (la === undefined) return;
        const part = t + k * G.ecart;
        roles[`x-${id}`] = role(v[`x-${id}`] ?? la.en[0], vers(part, la.en[0], G.passe));
        roles[`y-${id}`] = role(v[`y-${id}`] ?? la.en[1], vers(part, la.en[1], G.passe));
        roles[`leve-${id}`] = reprendreVers(t, v[`leve-${id}`] ?? 0, 0, G.sePose);
        roles[`pastille-${id}`] = garder(`pastille-${id}`);
      });
      return { roles };
    },
    grossissement: 1,
  };
}

// ————— La finale —————

/** On touche « Rejouer la face B » pendant que le diamant descend : tant après qu'il est parti. */
const EN_DESCENDANT = 0.15;

function laFinale(a: Ecritoire): Animation<'or' | 'platine' | 'diamant' | 'eclat'> {
  const F = T.finale;
  const D = GESTES.finale;
  const geste = finale(0);
  const genres = ['or', 'platine', 'diamant'] as const;
  // L'or au troisième, le platine au deuxième, le diamant au premier : à cheval sur le coin de leurs pochettes.
  const places = [F.premiers[2], F.premiers[1], F.premiers[0]];
  const fin = partieA(journalDExemple(a.textes), Infinity);
  const premiers = classement(fin).slice(0, F.premiers.length);
  const pochettes = premiers.map(({ joueur, rang }, i) => {
    const place = F.premiers[i] ?? F.premiers[0];
    return poser(`pochette-finale-${i + 1}`, joueur.pochette, rang === 1 ? 'content' : 'depite', place, place.taille, a.encrier.largeur);
  });
  const points = premiers.flatMap(({ joueur }, i) => {
    const place = F.premiers[i] ?? F.premiers[0];
    return pastillesDUnePochette(
      [remplir(a.textes.partie.points, { points: joueur.points })],
      place,
      place.taille,
      R,
      T.pastille,
      a.encrier.largeur,
      `finale-${i + 1}`,
    );
  });
  const disques = genres.map((genre, rang) => {
    const place = places[rang] ?? F.premiers[0];
    const [dx, dy] = F.disque.decalage;
    const centre: Vec2 = surLeBois(R, place.en[0] + dx * place.taille, place.en[1] + dy * place.taille);
    const rayon = F.disque.rayon * place.taille;
    const nom = `disque-${genre}-${rang + 1}` as const;
    const d = dessinerUnDisqueDeRecompense(genre, nom, centre, rayon, { vivant: true, leve: D.vol, allumees: [] });
    return { genre, nom, centre, rayon, d, part: rang * D.ecart };
  });
  const cadre = partDe(R, 0, F.premiers[0].en[1] - 100, R.largeur, 200);
  return {
    ...dite('finale'),
    etendue: cadre,
    scene: dessinerLeMeuble({
      regard: cadre,
      densite: DENSITE,
      objets: [...pochettes.flatMap(calquesDe), ...dessinees(points), ...disques.flatMap(({ d }) => [d.ombre, d.disque])],
    }),
    geste,
    regler: (v, t) =>
      disques.flatMap(({ genre, nom, centre, rayon, part }) => {
        // Pendant son dernier tour, l'éclat fait deux fois le tour des facettes du diamant ; arrêté, il en garde trois allumées.
        const enTour = genre === 'diamant' && v.eclat > 0 && v.eclat < 1;
        const facette = Math.floor(v.eclat * D.tour.tours * FACETTES_DE_LA_COURONNE) % FACETTES_DE_LA_COURONNE;
        const allumees = genre !== 'diamant' ? [] : enTour ? [facette] : v.eclat >= 1 ? RECOMPENSES.eclats : [];
        const la = t >= part;
        return [...reglerUnDisqueRemis(nom, centre, rayon, { leve: v[genre], allumees }), visibilite(nom, la), visibilite(`${nom}/ombre`, la)];
      }),
    regard: () => cadre,
    interruption: { a: 2 * D.ecart + EN_DESCENDANT, ceQuiChange: INTERRUPTIONS.finale },
    // Les disques remontent d'où ils sont, du dernier posé au premier ; l'éclat n'aura pas lieu.
    interrompre: (t, v) => ({
      roles: {
        diamant: role(v.diamant, vers(t, D.vol, D.descend)),
        platine: role(v.platine, vers(t + D.ecart / 4, D.vol, D.descend)),
        or: role(v.or, vers(t + D.ecart / 2, D.vol, D.descend)),
        eclat: immobile(v.eclat),
      },
    }),
    grossissement: 1,
  };
}

/** Les animations de la tablée, chacune faite à la demande : une page n'en monte une que quand on arrive dessus. */
export const ANIMATIONS_DE_LA_TABLEE = {
  arrivee: (a: Ecritoire) => arrivee(a) as unknown as Animation,
  bonneReponse: (a: Ecritoire) => laBonneReponse(a) as unknown as Animation,
  presque: (a: Ecritoire) => lePresque(a) as unknown as Animation,
  choix: (a: Ecritoire) => lesQuatreEtiquettes(a),
  vraie: (a: Ecritoire) => laVraiePochette(a) as unknown as Animation,
  deconnexion: (a: Ecritoire) => laDeconnexion(a) as unknown as Animation,
  hitParade: (a: Ecritoire) => leHitParade(a),
  finale: (a: Ecritoire) => laFinale(a) as unknown as Animation,
} as const;
