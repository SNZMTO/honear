/**
 * Le tableau du tournoi et son palmarès, au téléphone. Le tableau : le dos d'une pochette posé sur le bois nu, comme les titres
 * joués ; les pochettes des titres en rangs, la moitié du tableau en haut, l'autre en bas, qui se rejoignent au milieu, où se pose
 * le vainqueur ; un trait relie deux titres à celui qui passe. Entre deux duels, il tient le rôle du hit-parade : les deux titres du
 * duel suivant y sont cerclés de miel, et l'hôte le lance. Le palmarès, à la fin : les pochettes du vainqueur, du finaliste et des
 * demi-finalistes, leurs disques glissés derrière comme à la finale, le papier du vainqueur, et l'oreille de la room.
 */

import { rectangle, rectangleArrondi } from '../../lowpoly/contours';
import { placer, type Polygone } from '../../lowpoly/polygones';
import { surLEcran } from '../../lowpoly/projection';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import type { Disque, EtatDeLaPartie } from '../../regles/partie';
import type { Reponse } from '../../regles/piste';
import { disqueDOr, oreillesDeLaRoom, placeDuDuel, prochainDuel, tournoiFini, type DuelClos, type EtatDuTournoi } from '../../regles/tournoi';
import { PAPIER, TABLEE } from '../../ressources/tablee';
import { HAUTEUR_DE_CAPITALE, CORPS } from '../../ressources/typo';
import { aplat, aPlatSurLeMeuble, type Calque, type Dessin, type Texte } from '../calque';
import { encreLisibleSur } from '../encre';
import { surLeBois } from '../meuble';
import { ombreAuPied } from '../ombre';
import { remplir } from '../phrases';
import { dessinerUnDisqueDeRecompense } from '../recompense';
import { faireTenir } from '../texte';
import { dessinerUneVignette } from '../vignette';
import { platineArretee } from './meuble';
import { interprete, papier, phrase, SUR_LA_PLATINE, touche, toucheAuBord, type Ecritoire, type VueDuTelephone } from './pieces';
import { REGARD_DE_LA_POCHETTE } from './pochette';

const T = TABLEE.telephone;
const B = T.tableau;
const R = REGARD_DE_LA_POCHETTE;

/**
 * Les titres du tableau, à leur place : le tableau publié au premier lancer, et ce que les duels ont fait connaître (chaque duel
 * porte ses deux titres et leurs places).
 */
export function titresDuTableau(t: Pick<EtatDuTournoi, 'titres' | 'tableau' | 'clos' | 'enCours'>): (Reponse | undefined)[] {
  const titres: (Reponse | undefined)[] = Array.from({ length: t.titres }, (_, place) => t.tableau?.[place]);
  for (const d of [...t.clos, ...(t.enCours !== undefined ? [t.enCours] : [])])
    for (const face of [d.faces.A, d.faces.B]) if (face.place < titres.length) titres[face.place] = face.reponse;
  return titres;
}

/** Le gagnant d'un duel clos, par sa place au tableau. */
const placeDuGagnant = (d: DuelClos): number => d.faces[d.gagnante].place;

/** Le rang du premier duel d'un tour, dans l'ordre de jeu : les duels des tours d'avant. */
function debutDuTour(titres: number, tour: number): number {
  let debut = 0;
  for (let k = 0, duels = titres / 2; k < tour; k++, duels /= 2) debut += duels;
  return debut;
}

/**
 * Qui entre dans chaque tour, par sa place au tableau : au premier, chacun ; ensuite, le gagnant de chaque duel du tour d'avant, ou
 * personne tant qu'il n'est pas joué. Le dernier « tour » est le vainqueur.
 */
function entrantsParTour(t: Pick<EtatDuTournoi, 'titres' | 'clos'>): (number | undefined)[][] {
  const tours = Math.round(Math.log2(t.titres));
  const entrants: (number | undefined)[][] = [Array.from({ length: t.titres }, (_, place) => place)];
  for (let tour = 0; tour < tours; tour++) {
    const duels = t.titres / 2 ** (tour + 1);
    const debut = debutDuTour(t.titres, tour);
    entrants.push(
      Array.from({ length: duels }, (_, m) => {
        const d = t.clos[debut + m];
        return d !== undefined ? placeDuGagnant(d) : undefined;
      }),
    );
  }
  return entrants;
}

/** Une pochette du tableau : où elle se pose (en px dans le regard), son côté, le titre qu'elle porte. */
interface CaseDuTableau {
  readonly en: Vec2;
  readonly cote: number;
  readonly place: number | undefined;
}

/** Le haut du tableau, sous le titre du papier. */
const HAUT_DU_TABLEAU = B.papier.haut + B.papier.marge + CORPS.titre * HAUTEUR_DE_CAPITALE + B.sousLeTitre;

/**
 * Les cases du tableau, rang par rang : en haut, la moitié haute de chaque tour, du premier vers la finale ; au milieu, le vainqueur ;
 * en bas, la moitié basse, de la finale vers le premier tour. Chaque case est au milieu des deux dont elle sort.
 */
function casesDuTableau(t: Pick<EtatDuTournoi, 'titres' | 'clos'>): { readonly rangs: CaseDuTableau[][]; readonly vainqueur: CaseDuTableau } {
  const entrants = entrantsParTour(t);
  const tours = entrants.length - 1;
  const { gauche, largeur, marge, bas } = B.papier;
  const interieur = largeur - 2 * marge;
  const pasY = (bas - marge - HAUT_DU_TABLEAU) / (2 * tours + 1);
  const rang = (places: readonly (number | undefined)[], y: number): CaseDuTableau[] => {
    const pasX = interieur / places.length;
    const cote = Math.min(B.pochetteAuPlus, B.partDuPas * Math.min(pasX, pasY));
    return places.map((place, c) => ({ en: [gauche + marge + (c + 1 / 2) * pasX, y], cote, place }));
  };
  const rangs: CaseDuTableau[][] = [];
  for (let tour = 0; tour < tours; tour++) {
    const ceTour = entrants[tour] ?? [];
    const moitie = ceTour.length / 2;
    rangs.push(rang(ceTour.slice(0, moitie), HAUT_DU_TABLEAU + (tour + 1 / 2) * pasY));
    rangs.push(rang(ceTour.slice(moitie), bas - marge - (tour + 1 / 2) * pasY));
  }
  const gagnant = entrants[tours]?.[0];
  const milieu: Vec2 = [gauche + largeur / 2, HAUT_DU_TABLEAU + (tours + 1 / 2) * pasY];
  return { rangs, vainqueur: { en: milieu, cote: Math.min(B.vainqueur, B.partDuPas * 2 * pasY), place: gagnant } };
}

/** Les traits qui relient deux cases d'un rang à la case du rang suivant où passe leur gagnant : en px dans le regard. */
function traitsEntre(de: readonly CaseDuTableau[], vers: readonly CaseDuTableau[], versLeBas: boolean): Polygone[] {
  const e = B.trait / 2;
  const sens = versLeBas ? 1 : -1;
  return vers.flatMap((enfant, m) => {
    const [haut, bas] = [de[2 * m], de[2 * m + 1]];
    if (haut === undefined || bas === undefined) return [];
    const depart = haut.en[1] + (sens * haut.cote) / 2;
    const arrivee = enfant.en[1] - (sens * enfant.cote) / 2;
    const mi = (depart + arrivee) / 2;
    const vertical = (x: number, y0: number, y1: number): Polygone => rectangle(x - e, Math.min(y0, y1), 2 * e, Math.abs(y1 - y0));
    return [
      vertical(haut.en[0], depart, mi),
      vertical(bas.en[0], depart, mi),
      rectangle(haut.en[0] - e, mi - e, bas.en[0] - haut.en[0] + 2 * e, 2 * e),
      vertical(enfant.en[0], mi, arrivee),
    ];
  });
}

/**
 * Une pochette imprimée sur le papier : la vignette d'un titre, cernée d'un filet (une vignette crème ne se perd pas sur le papier) ;
 * ou une case vide, en creux, tant qu'on ne sait pas qui y passe.
 */
function pochetteImprimee(ici: (x: number, y: number) => Vec2, c: CaseDuTableau, reponse: Reponse | undefined): Dessin[] {
  const centre = ici(c.en[0], c.en[1]);
  const carre = rectangleArrondi(centre[0] - c.cote / 2, centre[1] - c.cote / 2, c.cote, c.cote, PAPIER.coin / 2, 1);
  if (reponse === undefined || !('vignette' in reponse.pochette)) return [aplat([carre], 'creme', 2)];
  const bord = c.cote / 2 + B.trait;
  const filet = rectangleArrondi(centre[0] - bord, centre[1] - bord, 2 * bord, 2 * bord, PAPIER.coin / 2, 1);
  return [aplat([filet], 'kraft', 1), ...dessinerUneVignette(reponse.pochette.vignette, carre, centre, c.cote)];
}

/**
 * Le papier du tableau : son titre, combien de titres sont en lice, les pochettes et leurs traits ; les deux titres du duel suivant
 * cerclés de miel ; le vainqueur au milieu, plus grand, une fois la finale jouée.
 */
export function papierDuTableau(a: Ecritoire, t: EtatDuTournoi): Calque[] {
  const ici = (x: number, y: number): Vec2 => surLeBois(R, x, y);
  const titres = titresDuTableau(t);
  const { rangs, vainqueur } = casesDuTableau(t);
  const { gauche, haut, largeur, bas, angle, marge } = B.papier;
  const coin = ici(gauche, haut);
  const oppose = ici(gauche + largeur, bas);
  const milieu: Vec2 = [(coin[0] + oppose[0]) / 2, (coin[1] + oppose[1]) / 2];
  const [l, h] = [oppose[0] - coin[0], oppose[1] - coin[1]];
  const contour = placer(rectangleArrondi(-l / 2, -h / 2, l, h, PAPIER.coin, 3), { en: milieu, angle });
  const encre = encreLisibleSur('creme');
  const ecrire = (contenu: string, role: Texte['role'], corps: number, en: Vec2, ancrage: Texte['ancrage']): Texte => ({
    genre: 'texte',
    contenu,
    role,
    corps,
    en,
    ancrage,
    teinte: encre,
    ton: TON_DE_BASE,
    fond: { teinte: 'creme' },
  });
  const P = a.textes.tournoi;
  const titre = faireTenir(a.encrier.largeur, { contenu: P.tableau, role: 'titrage' }, largeur / 2, 'titre');
  const enLice = faireTenir(
    a.encrier.largeur,
    { contenu: remplir(P.titresDuTableau, { titres: t.titres }), role: 'technique' },
    largeur / 2,
    'mention',
  );
  const ligneDuTitre = haut + marge + titre.corps * HAUTEUR_DE_CAPITALE;
  // Les traits, du premier tour vers la finale, en haut puis en bas ; puis de chaque finaliste au vainqueur.
  const traits: Polygone[] = [];
  for (let k = 0; k + 2 < rangs.length; k += 2) {
    traits.push(...traitsEntre(rangs[k] ?? [], rangs[k + 2] ?? [], true));
    traits.push(...traitsEntre(rangs[k + 1] ?? [], rangs[k + 3] ?? [], false));
  }
  const [finalisteDuHaut] = rangs[rangs.length - 2] ?? [];
  const [finalisteDuBas] = rangs[rangs.length - 1] ?? [];
  if (finalisteDuHaut !== undefined) traits.push(...traitsVersLeVainqueur(finalisteDuHaut, vainqueur, true));
  if (finalisteDuBas !== undefined) traits.push(...traitsVersLeVainqueur(finalisteDuBas, vainqueur, false));
  // Le duel suivant : ses deux titres, cerclés de miel, dans le tour où ils se rencontrent (pas dans ceux qu'ils ont passés).
  const suivant = prochainDuel(t);
  const tour = suivant !== undefined ? (placeDuDuel(t.titres, suivant.numero)?.tour ?? 0) : 0;
  const cerclees = [...(rangs[2 * tour] ?? []), ...(rangs[2 * tour + 1] ?? [])].filter(
    (c) => c.place !== undefined && t.enCours === undefined && suivant?.places.includes(c.place) === true,
  );
  const cercles = cerclees.map((c) => {
    const centre = ici(c.en[0], c.en[1]);
    const bord = c.cote / 2 + B.trait * 2;
    return rectangleArrondi(centre[0] - bord, centre[1] - bord, 2 * bord, 2 * bord, PAPIER.coin, 2);
  });
  const fini = tournoiFini(t);
  const dessins: Dessin[] = [
    aplat([contour], 'creme', 3),
    ecrire(titre.contenu, 'titrage', titre.corps, ici(gauche + marge, ligneDuTitre), 'debut'),
    ecrire(enLice.contenu, 'technique', enLice.corps, ici(gauche + largeur - marge, ligneDuTitre), 'fin'),
    aplat(
      traits.map((p) => p.map(([x, y]) => ici(x, y))),
      'kraft',
      1,
    ),
    ...(cercles.length > 0 ? [aplat(cercles, 'miel', 3)] : []),
    ...rangs.flat().flatMap((c) => pochetteImprimee(ici, c, c.place !== undefined ? titres[c.place] : undefined)),
    ...(fini ? pochetteImprimee(ici, vainqueur, vainqueur.place !== undefined ? titres[vainqueur.place] : undefined) : []),
  ];
  return [
    ombreAuPied('etiquette-tableau/ombre', { silhouettes: [contour], hauteur: PAPIER.epaisseur, support: 0, paliers: 2 }),
    { ...aPlatSurLeMeuble('etiquette-tableau', PAPIER.epaisseur, dessins), role: 'decor' },
  ];
}

/** Ce que la projection garde de la profondeur du meuble : une image posée à plat y est écrasée d'autant. */
const ecrasement = (): number => surLEcran([0, 1])[1] - surLEcran([0, 0])[1];

/** Une vraie pochette à poser par-dessus ce que la scène a dessiné : son adresse, son centre et son côté en px dans le regard. */
export interface PochetteAPoser {
  readonly adresse: string;
  readonly centre: Vec2;
  readonly cote: number;
  readonly coin?: number;
  readonly angle?: number;
  readonly ecrasement: number;
}

/**
 * Les vraies pochettes du tableau, par-dessus leurs vignettes (le client les pose, comme celles des titres joués) : chaque titre connu,
 * et le vainqueur, au milieu, une fois la finale jouée. Rien pour un titre dont la source ne donne pas d'image.
 */
export function imagesDuTableau(t: EtatDuTournoi): PochetteAPoser[] {
  const titres = titresDuTableau(t);
  const { rangs, vainqueur } = casesDuTableau(t);
  const cases = [...rangs.flat(), ...(tournoiFini(t) ? [vainqueur] : [])];
  return cases.flatMap((c) => {
    const reponse = c.place !== undefined ? titres[c.place] : undefined;
    const adresse = reponse !== undefined && 'vignette' in reponse.pochette ? reponse.pochette.image : undefined;
    return adresse !== undefined
      ? [{ adresse, centre: [c.en[0], c.en[1] - PAPIER.epaisseur] as Vec2, cote: c.cote, coin: PAPIER.coin / 2, ecrasement: ecrasement() }]
      : [];
  });
}

/** Le trait d'un finaliste au vainqueur, au milieu du papier. */
function traitsVersLeVainqueur(finaliste: CaseDuTableau, vainqueur: CaseDuTableau, duHaut: boolean): Polygone[] {
  const e = B.trait / 2;
  const sens = duHaut ? 1 : -1;
  const depart = finaliste.en[1] + (sens * finaliste.cote) / 2;
  const arrivee = vainqueur.en[1] - (sens * vainqueur.cote) / 2;
  return [rectangle(finaliste.en[0] - e, Math.min(depart, arrivee), 2 * e, Math.abs(arrivee - depart))];
}

/**
 * L'écran du tableau : entre deux duels, chez l'hôte, la touche qui lance le suivant ; chez l'invité, qui va le lancer. À la fin, on le
 * revoit en touchant le papier du vainqueur : « Retour » y ramène.
 */
export function vueDuTableau(a: Ecritoire, etat: EtatDeLaPartie, toi: string, revoir = false): VueDuTelephone {
  const t = etat.tournoi;
  if (t === undefined) throw new Error('Pas de tableau : la room ne joue pas un tournoi.');
  const P = a.textes.tournoi;
  const hote = etat.joueurs.find((j) => j.id === etat.hote)?.pochette.artiste ?? '';
  const objets: Calque[] = [...papierDuTableau(a, t)];
  if (revoir) objets.push(touche('touche-fermer-tableau', 'secondaire', a.textes.partie.retour, R, T.titres.retour, a.encrier));
  else if (etat.hote === toi) objets.push(toucheAuBord('touche-suivant', 'principale', P.touches.suivant, R, B.suivant, a.encrier));
  else objets.push(...phrase(remplir(P.attente, { hote }), R, a.encrier, B.attente.en, B.attente.largeur));
  return { regard: R, objets };
}

/** Le podium du palmarès, du vainqueur aux demi-finalistes, chacun avec le disque qu'il reçoit : ses titres, par leur place. */
function podium(t: EtatDuTournoi): { readonly place: number; readonly disque: Disque }[] {
  const finale = t.clos[t.clos.length - 1];
  if (finale === undefined || !tournoiFini(t)) return [];
  const perdant = (d: DuelClos): number => d.faces[d.gagnante === 'A' ? 'B' : 'A'].place;
  const demies = t.clos.filter((_, numero) => placeDuDuel(t.titres, numero)?.duels === 2);
  return [
    { place: placeDuGagnant(finale), disque: 'diamant' as const },
    { place: perdant(finale), disque: 'platine' as const },
    ...demies.map((d) => ({ place: perdant(d), disque: 'or' as const })),
  ];
}

/** Les marches du podium : chacune sa place sur le bois, son titre, son disque, son rang. */
function marchesDuPalmares(t: EtatDuTournoi) {
  const titres = titresDuTableau(t);
  return podium(t).flatMap(({ place, disque }, rang) => {
    const marche = T.palmares.podium[rang];
    const reponse = titres[place];
    return marche !== undefined && reponse !== undefined ? [{ marche, reponse, disque, rang }] : [];
  });
}

/** Les vraies pochettes du podium, par-dessus leurs vignettes, de travers comme elles. */
export function imagesDuPalmares(t: EtatDuTournoi): PochetteAPoser[] {
  return marchesDuPalmares(t).flatMap(({ marche, reponse }) => {
    const adresse = 'vignette' in reponse.pochette ? reponse.pochette.image : undefined;
    if (adresse === undefined) return [];
    const centre: Vec2 = [marche.en[0], marche.en[1] - 2 * PAPIER.epaisseur];
    return [{ adresse, centre, cote: marche.taille, coin: PAPIER.coin, angle: marche.angle, ecrasement: ecrasement() }];
  });
}

/**
 * Le palmarès, à la fin du tournoi : le podium des titres, leurs disques glissés derrière ; le papier du vainqueur, qu'on touche pour
 * revoir le tableau ; l'oreille de la room ; chez l'hôte, la revanche.
 */
export function vueDuPalmares(a: Ecritoire, etat: EtatDeLaPartie, toi: string): VueDuTelephone {
  const t = etat.tournoi;
  if (t === undefined) throw new Error('Pas de palmarès : la room ne joue pas un tournoi.');
  const r = SUR_LA_PLATINE;
  const P = T.palmares;
  const F = T.finale.disque;
  const marches = marchesDuPalmares(t);
  // Les disques, glissés derrière les pochettes, qui en sortent par le coin ; puis les pochettes des titres, leurs vignettes.
  const disques = marches.flatMap(({ marche, disque, rang }) => {
    const centre: Vec2 = [marche.en[0] + F.decalage[0] * marche.taille, marche.en[1] + F.decalage[1] * marche.taille];
    const d = dessinerUnDisqueDeRecompense(disque, `disque-${disque}-${rang + 1}`, surLeBois(r, centre[0], centre[1]), F.rayon * marche.taille);
    return [d.ombre, d.disque];
  });
  const pochettes = marches.flatMap(({ marche, reponse, rang }) => {
    const centre = surLeBois(r, marche.en[0], marche.en[1]);
    const cote = marche.taille;
    const carre = placer(rectangleArrondi(-cote / 2, -cote / 2, cote, cote, PAPIER.coin, 2), { en: centre, angle: marche.angle });
    const image = 'vignette' in reponse.pochette ? dessinerUneVignette(reponse.pochette.vignette, carre, centre, cote) : [aplat([carre], 'creme', 2)];
    return [
      ombreAuPied(`pochette-titre-${rang + 1}/ombre`, { silhouettes: [carre], hauteur: PAPIER.epaisseur * 2, support: 0, paliers: 2 }),
      { ...aPlatSurLeMeuble(`pochette-titre-${rang + 1}`, PAPIER.epaisseur * 2, image), role: 'decor' as const },
    ];
  });
  const vainqueur = disqueDOr(t)?.reponse;
  const V = P.vainqueur;
  const papierDuVainqueur =
    vainqueur !== undefined
      ? papier(
          'etiquette-vainqueur',
          r,
          V.en,
          V.largeur,
          V.angle,
          [
            { contenu: vainqueur.titre, role: 'titrage', auPlus: 'intertitre' },
            { contenu: interprete(a.textes, vainqueur), role: 'technique', auPlus: 'mention' },
            { contenu: a.textes.tournoi.revoir, role: 'technique', auPlus: 'gravure' },
          ],
          a.encrier,
          { role: 'mobile' },
        ).calques
      : [];
  // L'oreille de la room : qui a le plus souvent voté comme la majorité, les premiers. Pour rire : rien ne compte au compte d'un joueur.
  const O = P.oreille;
  // Qui n'a voté à aucun duel tranché aux voix n'y figure pas : « 0 sur 0 » ne dit rien.
  const lignes = oreillesDeLaRoom(
    t.clos,
    etat.joueurs.map((j) => j.id),
  )
    .filter((o) => o.votes > 0)
    .slice(0, O.lignes)
    .map((o) => {
      const nom = etat.joueurs.find((j) => j.id === o.id)?.pochette.artiste ?? '';
      return {
        contenu: remplir(a.textes.tournoi.classeALOreille, { rang: o.rang, nom, justes: o.justes, votes: o.votes }),
        role: 'technique' as const,
        auPlus: 'gravure' as const,
      };
    });
  const oreille = papier(
    'etiquette-oreille',
    r,
    O.en,
    O.largeur,
    O.angle,
    [{ contenu: a.textes.tournoi.oreille, role: 'titrage', auPlus: 'intertitre' }, ...lignes],
    a.encrier,
    { alignement: 'debut' },
  ).calques;
  return {
    regard: r,
    objets: [
      platineArretee(a),
      ...disques,
      ...pochettes,
      ...papierDuVainqueur,
      ...oreille,
      ...(etat.hote === toi ? [touche('touche-revanche', 'principale', a.textes.tournoi.touches.revanche, r, P.revanche, a.encrier)] : []),
    ],
  };
}
