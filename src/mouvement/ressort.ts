/**
 * Le ressort amorti : la loi qui porte presque tous les mouvements du site.
 * Il se calcule par sa solution exacte, jamais par petits pas : le mouvement est le même à 60 et à 120 images
 * par seconde, et après un trou d'une seconde comme après un trou d'un millième.
 */

/** Une matière, vue par un ressort : sa raideur, son amortissement, sa masse. Le temps est en secondes. */
export interface Ressort {
  readonly raideur: number;
  readonly amortissement: number;
  readonly masse: number;
}

/** Où en est ce qu'un ressort ramène à sa place : son écart à cette place, et sa vitesse. */
export interface Elan {
  readonly ecart: number;
  readonly vitesse: number;
}

export const SANS_ELAN: Elan = { ecart: 0, vitesse: 0 };

/** Pulsation propre d'un ressort, en radians par seconde : plus elle est grande, plus il est vif. */
export const pulsation = (r: Ressort): number => Math.sqrt(r.raideur / r.masse);

/** Taux d'amortissement : à 1, le ressort rejoint sa place au plus vite sans la dépasser ; en dessous, il la dépasse. */
export const tauxDAmortissement = (r: Ressort): number => r.amortissement / (2 * Math.sqrt(r.raideur * r.masse));

/** En deçà de cet écart à 1, on prend la formule du régime critique : les deux autres y perdent leur précision. */
const FORMULE_CRITIQUE = 1e-6;
/** Un ressort qu'on a voulu critique l'est à cela près : ses nombres sont arrondis dans la table. */
const REGLE_AU_PLUS_JUSTE = 1e-3;

/** Vrai pour un ressort amorti au plus juste : il rejoint sa place au plus vite, sans la dépasser ni traîner. */
export const estCritique = (r: Ressort): boolean => Math.abs(tauxDAmortissement(r) - 1) <= REGLE_AU_PLUS_JUSTE;

/** L'élan après `duree` secondes : la solution exacte de m·x″ + c·x′ + k·x = 0, où x est l'écart. */
export function detendre(r: Ressort, elan: Elan, duree: number): Elan {
  if (duree <= 0) return elan;
  const w = pulsation(r);
  const z = tauxDAmortissement(r);
  const { ecart: x0, vitesse: v0 } = elan;

  if (Math.abs(z - 1) < FORMULE_CRITIQUE) {
    const fonte = Math.exp(-w * duree);
    const pente = v0 + w * x0;
    return { ecart: fonte * (x0 + pente * duree), vitesse: fonte * (v0 - w * pente * duree) };
  }
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const fonte = Math.exp(-z * w * duree);
    const b = (v0 + z * w * x0) / wd;
    const [c, s] = [Math.cos(wd * duree), Math.sin(wd * duree)];
    return {
      ecart: fonte * (x0 * c + b * s),
      vitesse: fonte * ((b * wd - z * w * x0) * c - (x0 * wd + z * w * b) * s),
    };
  }
  const racine = w * Math.sqrt(z * z - 1);
  const [r1, r2] = [-z * w + racine, -z * w - racine];
  const c1 = (v0 - r2 * x0) / (r1 - r2);
  const c2 = x0 - c1;
  const [e1, e2] = [Math.exp(r1 * duree), Math.exp(r2 * duree)];
  return { ecart: c1 * e1 + c2 * e2, vitesse: c1 * r1 * e1 + c2 * r2 * e2 };
}

/**
 * Ce dont un ressort lâché sans vitesse dépasse sa place, en part de son écart de départ : 0 s'il ne la dépasse pas.
 * Il ne la dépasse franchement qu'une fois : le dépassement suivant est le carré de celui-ci.
 */
export function depassement(r: Ressort): number {
  const z = tauxDAmortissement(r);
  return z >= 1 ? 0 : Math.exp((-Math.PI * z) / Math.sqrt(1 - z * z));
}

/** Une pièce est dite arrivée quand il lui reste moins que cette part de sa course : c'est ce qui permet de lire une matière en millisecondes. */
export const SEUIL_D_ARRIVEE = 0.02;

/** Le plus fin des pas sur lesquels on cherche un instant, en part de la durée fouillée. */
export const FINESSE = 1 / 4000;

/** Ce par quoi on recule l'instant où l'on tient un mouvement pour éteint, tant qu'il ne l'est pas : la recherche part de là. */
const PLUS_TARD = 1.5;

/**
 * Un ressort sans raideur, sans amortissement ou sans masse ne ramène rien à sa place : on y chercherait un instant sans fin.
 * @throws si l'un des trois n'est pas positif : c'est une ligne de la table des mouvements qui est fausse.
 */
function exigerUnVraiRessort(r: Ressort): void {
  if (!(r.raideur > 0 && r.amortissement > 0 && r.masse > 0))
    throw new Error(`Un ressort demande une raideur, un amortissement et une masse positifs, pas ${r.raideur} / ${r.amortissement} / ${r.masse}.`);
}

/**
 * Le dernier instant où ce qu'un ressort ramène à sa place s'en écarte encore de plus que `seuil` : après lui, c'est arrivé.
 * On remonte le temps depuis un instant où l'on sait le mouvement éteint.
 */
function dernierEcart(r: Ressort, depart: Elan, seuil: number): number {
  exigerUnVraiRessort(r);
  const w = pulsation(r);
  const z = tauxDAmortissement(r);
  // Le mouvement fond au moins aussi vite que sa racine la plus lente : son écart ne dépasse jamais cette enveloppe,
  // qui vaut pour les trois régimes, et jusqu'au bord du critique.
  const lente = z <= 1 ? z * w : w * (z - Math.sqrt(z * z - 1));
  const enveloppe = (t: number): number => Math.exp(-lente * t) * (Math.abs(depart.ecart) + Math.abs(depart.vitesse + lente * depart.ecart) * t);
  let eteint = 1 / lente;
  while (enveloppe(eteint) > seuil) eteint *= PLUS_TARD;
  const pas = eteint * FINESSE;
  for (let t = eteint; t > 0; t -= pas) {
    if (Math.abs(detendre(r, depart, t).ecart) > seuil) return t + pas;
  }
  return 0;
}

/**
 * Le temps qu'il faut à un ressort lâché sans vitesse pour arriver : après lui, son écart reste sous `seuil`,
 * en part de son écart de départ.
 */
export const tempsDArrivee = (r: Ressort, seuil = SEUIL_D_ARRIVEE): number => dernierEcart(r, { ecart: 1, vitesse: 0 }, seuil);

/** Un coup d'une unité de vitesse : il ne déplace rien sur l'instant. */
const COUP: Elan = { ecart: 0, vitesse: 1 };

/**
 * Ce dont un coup écarte une pièce de sa place, au plus fort de son sursaut, par unité de vitesse donnée : des secondes.
 * Un coup de 73 px par seconde la fait sursauter de 73 fois cela, en px.
 */
export function sommetDuSursaut(r: Ressort): number {
  exigerUnVraiRessort(r);
  // Le sommet vient avant que la racine la plus vive ait fait son temps : on le cherche jusque-là, et un peu au-delà.
  const jusqua = 4 / pulsation(r);
  let sommet = 0;
  for (let t = 0; t <= jusqua; t += jusqua * FINESSE) sommet = Math.max(sommet, Math.abs(detendre(r, COUP, t).ecart));
  return sommet;
}

/**
 * Le temps qu'il faut à une pièce qu'un coup a fait sursauter pour retomber : après lui, elle reste à moins de `seuil` de sa place,
 * en part du sommet de son sursaut.
 */
export const tempsDeRetombee = (r: Ressort, seuil = SEUIL_D_ARRIVEE): number => dernierEcart(r, COUP, seuil * sommetDuSursaut(r));
