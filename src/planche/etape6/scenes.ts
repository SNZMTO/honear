/**
 * Les images de la planche « L'écran de l'hôte » (étape 6) : la partie d'exemple de l'étape 5, vue sur le grand écran de l'hôte.
 * Le meuble entier d'un seul regard, qui ne glisse jamais : le bac, la platine et sa piste, l'ampli et ses aiguilles, la kraft ;
 * et devant, la tablée de tous les joueurs. Rien n'est écrit sur le disque ici : ces images servent aussi aux contrôles et aux tests.
 */

import { hasard } from '../../lowpoly/aleatoire';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { MODES } from '../../regles/modes';
import {
  codeDePartie,
  disquesDeLaFinale,
  hitParade,
  mouvementsDuClassement,
  partieA,
  type EtatDeLaPartie,
  type EvenementDePartie,
} from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { SITE } from '../../ressources/reglages';
import { TABLEE } from '../../ressources/tablee';
import type { Textes } from '../../ressources/textes';
import { dessinerLAmpli } from '../../scene/ampli';
import { aiguillesA } from '../../scene/ampli/danse';
import { dessinerLeBac } from '../../scene/bac';
import type { Calque } from '../../scene/calque';
import { VERSO_DU_JEU } from '../../scene/disque/verso';
import { dessinerLeMeuble, regardSurLeMeuble, surLeBois, type Regard } from '../../scene/meuble';
import { pointsEcrits, remplir } from '../../scene/phrases';
import { dessinerLaVraiePochette } from '../../scene/pochette/dos';
import { dessinerUnDisqueDeRecompense } from '../../scene/recompense';
import type { Encrier } from '../../scene/rendu/texte';
import { dessinerLaTablee, type JoueurPose, type PlaceDeLaTablee } from '../../scene/tablee';
import { eventail } from '../../scene/tablee';
import { kraftDuSalon } from '../../scene/telephone/kraft';
import { ampliDuSalon, bacDesPlaylistsPretes, platineArretee } from '../../scene/telephone/meuble';
import { DENSITE, papier, touche, type Ecritoire } from '../../scene/telephone/pieces';
import { arreterLaSeance } from '../etape2/images';
import { seanceEntiere } from '../etape2/seance';
import { LEGENDES_DES_ECRANS as L5 } from '../etape5/legendes.fr';
import { choixDExemple, decorDuMode, joueursDExemple, journalDExemple, laPiste } from '../etape5/scenes';
import { reponseDExemple } from '../exemples';
import type { ImageDePlanche } from '../image';
import { LEGENDES_DE_L_HOTE as L } from './legendes.fr';

const H = TABLEE.hote;
export const SUR_LE_MEUBLE: Regard = regardSurLeMeuble();

/** Les places de la tablée, du premier au dernier du classement : deux rangs de six. */
export const placesDeLaTablee = (n: number): PlaceDeLaTablee[] =>
  Array.from({ length: n }, (_, rang) => ({
    en: [H.tablee.x[rang % H.tablee.x.length] ?? 0, H.tablee.y[Math.floor(rang / H.tablee.x.length)] ?? 0] as const,
    angle: H.tablee.angles[rang % H.tablee.angles.length] ?? 0,
  }));

/** La tablée d'un état : chacun à sa place du classement, ce qu'il a trouvé ou gagné collé sur sa pochette. */
function tablee(a: Ecritoire, joueurs: readonly JoueurPose[], collage: 'trouve' | 'pastille' = 'trouve'): Calque[] {
  return dessinerLaTablee(joueurs, placesDeLaTablee(joueurs.length), H.tablee.taille, SUR_LE_MEUBLE, H[collage], a.encrier.largeur, 'hote');
}

/** Le bac, et l'ampli : allumé, ses aiguilles où on les demande ; éteint, au repos. */
function bacEtAmpli(a: Ecritoire, aiguilles?: readonly [number, number]): Calque[] {
  return [
    dessinerLeBac(bacDesPlaylistsPretes(a.textes), DENSITE, a.encrier.largeur),
    dessinerLAmpli(ampliDuSalon(a.textes, aiguilles !== undefined, aiguilles ?? [0, 0]), DENSITE),
  ];
}

const image = (fichier: string, titre: string, objets: readonly Calque[]): ImageDePlanche => ({
  fichier,
  titre,
  regard: SUR_LE_MEUBLE,
  scene: dessinerLeMeuble({ regard: SUR_LE_MEUBLE, densite: DENSITE, objets }),
});

function salon(a: Ecritoire): ImageDePlanche {
  const etat = partieA(journalDExemple(a.textes), -94);
  const code = codeDePartie(hasard(L5.partie.graine).suivant);
  const lien = remplir(a.textes.partie.lien, { site: SITE.adresse, code });
  return image('hote-salon', L.images.salon, [
    ...bacEtAmpli(a),
    platineArretee(a, { code: { code, joueurs: etat.joueurs.length } }),
    ...kraftDuSalon(a, `https://${lien}`, etat),
    ...tablee(a, eventail(etat, a.textes, 'rien')),
    ...papier(
      'etiquette-lien',
      SUR_LE_MEUBLE,
      H.lien.en,
      H.lien.largeur,
      -1.5,
      [
        { contenu: lien, role: 'techniqueFort', auPlus: 'titre' },
        { contenu: a.textes.partie.copier, role: 'technique', auPlus: 'gravure' },
      ],
      a.encrier,
      { role: 'mobile' },
    ).calques,
    touche('touche-allume', 'secondaire', a.textes.ampli.allume, SUR_LE_MEUBLE, H.allume, a.encrier),
    touche('touche-lancer', 'principale', a.textes.touches.lancer, SUR_LE_MEUBLE, H.lancer, a.encrier),
  ]);
}

/** Les aiguilles de l'ampli à un instant de la séance : elles dansent sur l'extrait. */
function aiguillesDeLaSeance(a: Ecritoire, t: number): readonly [number, number] {
  const { seance } = laPiste(a.textes);
  const { piste } = seanceEntiere(seance);
  if (piste === undefined) throw new Error("La séance de l'atelier n'a pas de piste.");
  return aiguillesA(piste, t, [seance.rayure]);
}

/** La piste, sur le grand écran : la séance de l'atelier arrêtée, et autour d'elle le bac, l'ampli, la tablée, ce qu'on y pose. */
function piste(
  a: Ecritoire,
  journal: readonly EvenementDePartie[],
  t: number,
  cran: number,
  fichier: string,
  titre: string,
  enPlus: (etat: EtatDeLaPartie) => Calque[],
  montrer: 'trouvailles' | 'points',
): ImageDePlanche {
  const { seance, extrait } = laPiste(a.textes);
  return arreterLaSeance(
    {
      textes: a.textes,
      encrier: a.encrier,
      densite: DENSITE,
      verso: VERSO_DU_JEU,
      seance,
      regard: SUR_LE_MEUBLE,
      decor: decorDuMode(a.textes, cran, journal, extrait),
      autour: (instant) => {
        const etat = partieA(journal, instant);
        const avant = partieA(journal, extrait - 1 / 100);
        return [
          ...bacEtAmpli(a, aiguillesDeLaSeance(a, instant)),
          ...tablee(a, eventail(etat, a.textes, montrer, montrer === 'points' ? avant : undefined), montrer === 'points' ? 'pastille' : 'trouve'),
          ...enPlus(etat),
        ];
      },
    },
    [{ a: t, fichier, titre }],
  )[0] as ImageDePlanche;
}

/** Les quatre étiquettes à toucher, en rang devant la tablée ; à la révélation, seule la bonne reste. */
function etiquettes(a: Ecritoire, choix: readonly Reponse[], bonne: Reponse, revelee: boolean): Calque[] {
  const C = H.choix;
  return choix.flatMap((c, rang) =>
    revelee && c.titre !== bonne.titre
      ? []
      : papier(
          `etiquette-choix-${rang + 1}`,
          SUR_LE_MEUBLE,
          [C.x[rang] ?? 0, C.y],
          C.largeur,
          C.angles[rang] ?? 0,
          [
            { contenu: c.titre, role: 'titrage', auPlus: 'texte' },
            { contenu: c.artiste, role: 'techniqueFort', auPlus: 'mention' },
          ],
          a.encrier,
          { role: 'mobile', auMoins: C.largeur },
        ).calques,
  );
}

/** La vraie pochette, sortie de sous la kraft. */
function laVraie(a: Ecritoire): Calque[] {
  const sur = reponseDExemple(a.textes).pochette;
  if (!('vignette' in sur)) return [];
  const V = H.vraiePochette;
  const p = dessinerLaVraiePochette(
    sur.vignette,
    { nom: 'pochette-vraie', centre: surLeBois(SUR_LE_MEUBLE, V.en[0], V.en[1]), angle: V.angle, taille: V.taille },
    'vraie',
  );
  return [p.ombre, p.pochette];
}

function enQuatreChoix(a: Ecritoire): ImageDePlanche {
  const { extrait: x, seance } = laPiste(a.textes);
  const choix = choixDExemple(a.textes);
  const bonne = reponseDExemple(a.textes);
  const journal: EvenementDePartie[] = [
    { genre: 'ouverture', a: -110, mode: 'quatreChoix', pistes: L5.partie.pistes },
    ...joueursDExemple(a.textes).map(({ id, pochette }, rang): EvenementDePartie => ({ genre: 'arrivee', a: -100 + rang, id, pochette })),
    { genre: 'extrait', a: x, piste: { reponse: bonne, choix } },
    { genre: 'reponse', a: x + 1.5, id: 'lady', proposition: { genre: 'choix', rang: 1 } },
    { genre: 'reponse', a: seance.rayure, id: 'toi', proposition: { genre: 'choix', rang: 0 } },
    { genre: 'reponse', a: x + 4, id: 'dj', proposition: { genre: 'choix', rang: 1 } },
  ];
  return piste(
    a,
    journal,
    x + L.instants.apresLExtrait,
    MODES.quatreChoix.cran,
    'hote-quatre-choix',
    L.images.quatreChoix,
    () => etiquettes(a, choix, bonne, false),
    'trouvailles',
  );
}

function hitParadeEnGrand(a: Ecritoire): ImageDePlanche {
  const journal = journalDExemple(a.textes);
  const { extrait, revelation } = laPiste(a.textes);
  const [avant, apres] = [partieA(journal, extrait - 1 / 100), partieA(journal, revelation + 1)];
  const mouvements = mouvementsDuClassement(avant, apres);
  const P = a.textes.pastilles;
  const joueurs = hitParade(apres).map(({ joueur }): JoueurPose => {
    const m = mouvements[joueur.id];
    const texte = m === undefined ? undefined : m.genre === 'entree' ? P.entree : remplir(P[m.genre], { places: m.places });
    return { pochette: joueur.pochette, expression: joueur.expression, pastilles: texte !== undefined ? [texte] : [], dos: !joueur.connecte };
  });
  return image('hote-hit-parade', L.images.hitParade, [...bacEtAmpli(a, [0, 0]), platineArretee(a), ...tablee(a, joueurs, 'pastille')]);
}

function finaleEnGrand(a: Ecritoire): ImageDePlanche {
  const F = H.finale;
  const etat = { ...partieA(journalDExemple(a.textes), Infinity), phase: 'fin' as const };
  const classes = hitParade(etat);
  const disques = disquesDeLaFinale(etat);
  const premiers: PlaceDeLaTablee[] = F.premiers
    .slice(0, classes.length)
    .map((place, i) => ({ ...place, taille: classes[i]?.rang === 1 ? F.premiers[0].taille : place.taille }));
  const suivants: PlaceDeLaTablee[] = F.suivants.x.map((x) => ({ en: [x, F.suivants.y] as const, angle: 4, taille: F.suivants.taille }));
  const pose = ({ joueur, rang }: (typeof classes)[number], pastille: string): JoueurPose => ({
    pochette: joueur.pochette,
    expression: rang === 1 ? 'content' : joueur.expression === 'endormi' ? 'endormi' : 'depite',
    pastilles: [pastille],
  });
  const enTete = classes.slice(0, premiers.length).map((c) => pose(c, pointsEcrits(a.textes, c.joueur.points)));
  const derriere = classes.slice(premiers.length).map((c) => pose(c, String(c.joueur.points)));
  const remis = classes.slice(0, premiers.length).flatMap(({ joueur }, rang) => {
    const genre = disques[joueur.id];
    const place = premiers[rang];
    if (genre === undefined || place === undefined) return [];
    const cote = place.taille ?? F.suivants.taille;
    const centre: Vec2 = surLeBois(
      SUR_LE_MEUBLE,
      place.en[0] + TABLEE.telephone.finale.disque.decalage[0] * cote,
      place.en[1] + TABLEE.telephone.finale.disque.decalage[1] * cote,
    );
    const d = dessinerUnDisqueDeRecompense(genre, `disque-${genre}-${rang + 1}`, centre, TABLEE.telephone.finale.disque.rayon * cote);
    return [d.ombre, d.disque];
  });
  const P = a.textes.partie;
  const joues: Reponse[] = [...L5.partie.dejaJoues.map((j) => ({ ...reponseDExemple(a.textes), ...j })), reponseDExemple(a.textes)];
  return image('hote-finale', L.images.finale, [
    ...bacEtAmpli(a, [0, 0]),
    platineArretee(a),
    ...remis,
    ...dessinerLaTablee(enTete, premiers, F.suivants.taille, SUR_LE_MEUBLE, H.pastille, a.encrier.largeur, 'finale'),
    ...dessinerLaTablee(derriere, suivants, F.suivants.taille, SUR_LE_MEUBLE, H.trouve, a.encrier.largeur, 'suivant'),
    ...papier(
      'etiquette-titres',
      SUR_LE_MEUBLE,
      F.titres.en,
      F.titres.largeur,
      F.titres.angle,
      [
        { contenu: P.titresJoues, role: 'titrage', auPlus: 'titre' },
        ...joues.map((j, rang) => ({
          contenu: remplir(P.titreJoue, { numero: rang + 1, titre: j.titre, artiste: j.artiste }),
          role: 'technique' as const,
          auPlus: 'texte' as const,
        })),
      ],
      a.encrier,
      { alignement: 'debut', ancre: 'milieu' },
    ).calques,
    touche('touche-rejouer', 'principale', a.textes.touches.rejouer, SUR_LE_MEUBLE, F.rejouer, a.encrier),
  ]);
}

/** Les six images de l'écran de l'hôte, dans l'ordre d'une partie. */
export function imagesDeLHote(textes: Textes, encrier: Encrier): ImageDePlanche[] {
  const a: Ecritoire = { textes, encrier };
  const journal = journalDExemple(textes);
  const { extrait } = laPiste(textes);
  return [
    salon(a),
    piste(a, journal, extrait + L.instants.apresLExtrait, MODES.libre.cran, 'hote-piste', L.images.piste, () => [], 'trouvailles'),
    enQuatreChoix(a),
    piste(a, journal, L.instants.reponse, MODES.libre.cran, 'hote-revelation', L.images.revelation, () => laVraie(a), 'points'),
    hitParadeEnGrand(a),
    finaleEnGrand(a),
  ];
}
