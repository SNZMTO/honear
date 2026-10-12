/**
 * La planche vivante : chaque animation montée dans sa vitre quand on arrive dessus, puis jouée par le moteur du site, image après
 * image, sur une horloge qu'on ralentit. On la rejoue, on la passe en version sobre, on l'interrompt à mi-course : elle reprend
 * d'où elle est. Rien ne se redessine pendant qu'elle joue : on ne règle que des transformations et des opacités. Le curseur de
 * ses frises suit l'instant. Rien ici ne dessine ni ne décide du mouvement : tout vient de l'animation.
 */

import { lancerLaBoucle, type Boucle } from '../../ecran/boucle';
import { horlogeDuNavigateur } from '../../ecran/horloge';
import { monter, type Montage } from '../../ecran/montage';
import { animationsReduites, ceQuiManqueAuNavigateur, densiteDeLEcran, suivreLesAnimationsReduites } from '../../ecran/navigateur';
import { policesEmbarquees } from '../../ecran/polices';
import type { NomDeCalque } from '../../lexique';
import { TEXTES } from '../../ressources/textes.fr';
import { CARACTERES } from '../../ressources/typo';
import { finDuGeste } from '../../scene/gestes/geste';
import { remplir } from '../../scene/phrases';
import { encrier as creerLEncrier, type Encrier } from '../../scene/rendu/texte';
import { lireUneAnimation, uneAnimation, valeursA, type Animation, type CleDAnimation, type Lecture } from '../animations';
import { horlogeDePlanche, type HorlogeDePlanche } from '../horloge';
import { enTemps } from './fiche';
import { LEGENDES_DE_LA_PLANCHE as L } from './legendes.fr';

/** Les polices du site, en base 64, par nom de fichier. */
type Polices = Readonly<Record<string, string>>;

/** Ce qu'elle joue encore après son dernier pas : de quoi voir chaque grandeur se poser. */
const APRES_LA_FIN = 0.3;
/** On monte une scène un peu avant qu'elle n'arrive à l'écran. */
const AVANT_D_ARRIVER = '200px';

/** Une animation de la page : ses éléments, sa scène montée, et où elle en est. */
interface Vitrine {
  readonly cle: CleDAnimation;
  readonly vitre: HTMLElement;
  readonly etat: HTMLElement;
  readonly sobre: HTMLInputElement;
  readonly vitesses: readonly HTMLButtonElement[];
  readonly frises: readonly SVGSVGElement[];
  readonly horloge: HorlogeDePlanche;
  animation?: Animation;
  montage?: Montage;
  /** Ce qui porte la scène montée dans la vitre, et la largeur de son regard : la vitre suit la place que la page lui laisse. */
  plan?: { readonly element: HTMLElement; readonly largeur: number };
  lecture?: Lecture;
  joue: boolean;
  /** L'instant où l'interrompre, si on l'a demandé et qu'elle n'y est pas encore. */
  interrompreA: number | undefined;
  fin: number;
}

function element<T extends Element>(dans: ParentNode, selecteur: string, genre: { new (): T }): T {
  const trouve = dans.querySelector(selecteur);
  if (!(trouve instanceof genre)) throw new Error(`La page n'a pas « ${selecteur} ».`);
  return trouve;
}

function trouverLesVitrines(): Vitrine[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-animation]')).map((section) => ({
    cle: section.dataset['animation'] as CleDAnimation,
    vitre: element(section, '[data-vitre]', HTMLElement),
    etat: element(section, '[data-etat]', HTMLElement),
    sobre: element(section, '[data-sobre]', HTMLInputElement),
    vitesses: Array.from(section.querySelectorAll<HTMLButtonElement>('[data-vitesse]')),
    frises: Array.from(section.querySelectorAll<SVGSVGElement>('svg[data-frise]')),
    horloge: horlogeDePlanche(horlogeDuNavigateur()),
    joue: false,
    interrompreA: undefined,
    fin: 0,
  }));
}

/** Le curseur des frises à l'instant t : sur celle du geste, puis, une fois interrompue, sur celle qui reprend. */
function placerLesCurseurs(v: Vitrine, t: number): void {
  const interrompue = v.lecture?.interrompue === true;
  const suivie = interrompue ? 'reprise' : 'geste';
  for (const frise of v.frises) {
    frise.classList.toggle('suivie', frise.dataset['frise'] === 'reprise' && interrompue);
    // Celle qu'on ne suit plus garde son curseur où il en était : à l'interruption.
    if (frise.dataset['frise'] !== suivie) continue;
    const [gauche, piste, fin] = ['gauche', 'piste', 'fin'].map((cle) => Number(frise.dataset[cle]));
    const x = (gauche ?? 0) + Math.max(0, Math.min(1, t / (fin ?? 1))) * (piste ?? 0);
    frise.querySelector('[data-curseur]')?.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
  }
}

/** Montre l'animation à l'instant t : la scène réglée, le regard posé, les curseurs à leur place. */
function montrer(v: Vitrine, valeurs: Readonly<Record<string, number>>, t: number): void {
  const { animation, montage } = v;
  if (animation === undefined || montage === undefined) return;
  montage.regler(animation.regler(valeurs, t));
  montage.regarder(animation.regard(valeurs).origine);
  placerLesCurseurs(v, t);
}

function dire(v: Vitrine, phrase: string): void {
  if (v.etat.textContent !== phrase) v.etat.textContent = phrase;
}

/** Monte la scène d'une animation dans sa vitre, à la taille que la page lui laisse, et la pose à son départ. */
function monterLaVitrine(v: Vitrine, encrier: Encrier): void {
  const animation = uneAnimation({ textes: TEXTES, encrier }, v.cle);
  const depart = valeursA(animation, 0);
  const regard = animation.regard(depart);
  const echelle = v.vitre.clientWidth / regard.largeur;
  const montage = monter(animation.scene, {
    etendue: animation.etendue,
    reglables: new Set<NomDeCalque>(animation.regler(depart, 0).map((reglage) => reglage.calque)),
    definition: densiteDeLEcran() * echelle,
    mesurer: encrier.largeur,
    tracerLeTexte: encrier.tracer,
  });
  const plan = document.createElement('div');
  plan.className = 'plan';
  plan.style.cssText = `width:${regard.largeur}px;height:${regard.hauteur}px;transform:scale(${echelle})`;
  plan.append(montage.element);
  v.vitre.textContent = '';
  v.vitre.append(plan);
  Object.assign(v, { animation, montage, plan: { element: plan, largeur: regard.largeur } });
  montrer(v, depart, 0);
}

/** La page a changé de largeur : chaque scène montée reprend la taille de sa vitre. Ses toiles, elles, gardent leur finesse. */
function suivreLaLargeur(vitrines: readonly Vitrine[]): void {
  window.addEventListener('resize', () => {
    for (const { vitre, plan } of vitrines) if (plan !== undefined) plan.element.style.transform = `scale(${vitre.clientWidth / plan.largeur})`;
  });
}

/** Rejoue l'animation depuis son départ, à la vitesse choisie ; l'interrompt en route si on le demande. */
function rejouer(v: Vitrine, interrompre: boolean, boucle: Boucle): void {
  const { animation } = v;
  if (animation === undefined) return;
  v.lecture = lireUneAnimation(animation, v.sobre.checked);
  v.interrompreA = interrompre ? animation.interruption.a : undefined;
  v.fin = finDuGeste(animation.geste) + APRES_LA_FIN;
  v.joue = true;
  v.horloge.mettreA(0);
  dire(v, L.etats.joue);
  boucle.reveiller();
}

/** Une image d'une animation qui joue : rend vrai tant qu'elle n'est pas arrivée. */
function avancer(v: Vitrine): boolean {
  const { animation, lecture } = v;
  if (!v.joue || animation === undefined || lecture === undefined) return false;
  const t = v.horloge.maintenant();
  if (v.interrompreA !== undefined && t >= v.interrompreA) {
    // L'état change à son instant, pas à l'image d'après : le moteur y va, puis prend le nouveau geste.
    lecture.avancer(v.interrompreA);
    lecture.interrompre();
    dire(v, remplir(L.etats.interrompue, { instant: enTemps(v.interrompreA) }));
    v.interrompreA = undefined;
    v.fin = Math.max(v.fin, finDuGeste(lecture.geste) + APRES_LA_FIN);
  }
  montrer(v, lecture.avancer(t), t);
  if (t < v.fin) return true;
  v.joue = false;
  if (!lecture.interrompue) dire(v, L.etats.finie);
  return false;
}

function brancher(v: Vitrine, boucle: Boucle): void {
  const section = v.vitre.closest('[data-animation]');
  if (section === null) return;
  element(section, '[data-rejouer]', HTMLButtonElement).addEventListener('click', () => rejouer(v, false, boucle));
  element(section, '[data-interrompre]', HTMLButtonElement).addEventListener('click', () => rejouer(v, true, boucle));
  v.sobre.addEventListener('change', () => rejouer(v, false, boucle));
  for (const bouton of v.vitesses)
    bouton.addEventListener('click', () => {
      v.horloge.ralentir(Number(bouton.dataset['vitesse']));
      for (const autre of v.vitesses) autre.setAttribute('aria-pressed', String(autre === bouton));
    });
}

/** Monte chaque vitre quand on arrive dessus ; un navigateur qui ne sait pas le dire les monte toutes. */
function quandOnYArrive(vitrines: readonly Vitrine[], monterUne: (v: Vitrine) => void): void {
  if (typeof IntersectionObserver !== 'function') {
    vitrines.forEach(monterUne);
    return;
  }
  const observateur = new IntersectionObserver(
    (entrees) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        observateur.unobserve(entree.target);
        const v = vitrines.find((x) => x.vitre === entree.target);
        if (v !== undefined) monterUne(v);
      }
    },
    { rootMargin: AVANT_D_ARRIVER },
  );
  for (const v of vitrines) observateur.observe(v.vitre);
}

/**
 * Lance la planche vivante.
 * @param polices les polices du site, en base 64, par nom de fichier : le script de la page les embarque.
 */
export function lancerLaPlanche(polices: Polices): void {
  const vitrines = trouverLesVitrines();
  const manques = ceQuiManqueAuNavigateur();
  if (manques.length > 0) {
    const N = TEXTES.navigateur;
    for (const v of vitrines)
      v.vitre.textContent = `${N.titre} ${remplir(N.detail, { manques: manques.map((m) => N.manques[m]).join(N.entreDeuxManques) })}`;
    return;
  }
  const encrier = creerLEncrier(CARACTERES, policesEmbarquees(polices), TEXTES.langue);
  const boucle = lancerLaBoucle(() => vitrines.map(avancer).some(Boolean));
  // La version sobre est cochée d'elle-même si l'appareil demande de réduire les animations ; la page dit pourquoi.
  const reduites = (oui: boolean): void => {
    for (const v of vitrines) v.sobre.checked = oui;
    document.querySelector<HTMLElement>('[data-reduites]')?.toggleAttribute('hidden', !oui);
  };
  reduites(animationsReduites());
  suivreLesAnimationsReduites(reduites);
  for (const v of vitrines) brancher(v, boucle);
  suivreLaLargeur(vitrines);
  quandOnYArrive(vitrines, (v) => {
    try {
      monterLaVitrine(v, encrier);
    } catch (erreur) {
      // Celle-là n'a pas pu être montée : sa vitre le dit, les autres vivent leur vie.
      v.vitre.textContent = L.panne;
      console.error(erreur);
    }
  });
}
