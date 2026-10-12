/**
 * Le banc d'essai du montage : la piste d'exemple montée dans une page nue, avec de quoi la poser à un instant,
 * la comparer à son SVG de référence ; et l'atelier de la page lui-même, pour mesurer ce que coûte une image.
 * C'est un outil de vérification, pas une page du site.
 * On le construit et on le pilote avec outils/banc.py.
 */

import { horlogeDuNavigateur } from '../src/ecran/horloge';
import type { BilanDeMontage } from '../src/ecran/montage';
import { densiteDeLEcran } from '../src/ecran/navigateur';
import { monterLaPiste, type PisteADessiner, type PisteMontee } from '../src/ecran/piste';
import { policesEmbarquees } from '../src/ecran/polices';
import { vider } from '../src/ecran/vider';
import { FENETRE_DES_MESURES, ouvrirLAtelier, type Atelier } from '../src/planche/etape2/atelier';
import { FLUIDITE, fluiditeDe, SCENES_DE_BANC, type Fluidite, type SceneDeBanc } from '../src/planche/etape2/banc';
import { A_L_OUVERTURE, optionsDe } from '../src/planche/etape2/options';
import { seanceDExemple } from '../src/planche/etape2/seance';
import { pisteDExemple, reponseDExemple } from '../src/planche/exemples';
import { jouer, phaseDeLaPiste, type PhaseDePiste, type Piste } from '../src/regles/piste';
import { CADRAGES } from '../src/ressources/cadrages';
import { DENSITES, type Densite } from '../src/ressources/densites';
import { TEXTES } from '../src/ressources/textes.fr';
import { CARACTERES } from '../src/ressources/typo';
import type { Calque } from '../src/scene/calque';
import { CALQUES_DU_VERSO } from '../src/scene/disque';
import { dessinerLaReponseAuVerso, VERSO_DU_JEU, type Verso } from '../src/scene/disque/verso';
import { dessinerLeMeuble } from '../src/scene/meuble';
import { dessinerLaPiste } from '../src/scene/piste/dessin';
import type { PisteEnScene } from '../src/scene/piste/etat';
import type { PoseDeLaPiste } from '../src/scene/piste/pose';
import { ETENDUE_DE_LA_PISTE, regardDeLaPiste } from '../src/scene/piste/regard';
import { poseDeDepart } from '../src/scene/piste/reglages';
import { suivreLaPiste } from '../src/scene/piste/suivi';
import { regler } from '../src/scene/reglage';
import { enSvg } from '../src/scene/rendu/svg';
import { encrier as creerLEncrier } from '../src/scene/rendu/texte';

declare const POLICES: Readonly<Record<string, string>>;

const debutDuScript = performance.now();
const encrier = creerLEncrier(CARACTERES, policesEmbarquees(POLICES), TEXTES.langue);
const tempsDeLEncrier = performance.now() - debutDuScript;
const reponse = reponseDExemple(TEXTES);
const aDessiner: PisteADessiner = { decor: pisteDExemple(TEXTES), textes: TEXTES, encrier };

/** L'instant où la réponse de la piste du banc tombe. */
const REVELEE_A = 14;
let piste: Piste | undefined = jouer(undefined, { genre: 'lancer', a: 1, duree: 10 });
piste = jouer(piste, { genre: 'prets', a: 1.5 });
piste = jouer(piste, { genre: 'reveler', a: REVELEE_A, reponse });
if (piste === undefined) throw new Error('pas de piste');
const scene: PisteEnScene = { piste, rayuresA: [7] };

/** Le verso avec lequel le banc monte la scène : celui du jeu. */
const VERSO = VERSO_DU_JEU;
/** La scène montée, et la pose dans laquelle elle a été dessinée. */
let montee: (PisteMontee & { readonly depart: PoseDeLaPiste }) | undefined;

/** Un élément de la page du banc, à la taille du cadre de téléphone : la scène montée s'y montre, ou sa référence. */
function auCadrage(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`La page du banc n'a pas d'élément « ${id} ».`);
  element.style.cssText = `position:relative;overflow:hidden;flex:none;width:${CADRAGES.telephone.largeur}px;height:${CADRAGES.telephone.hauteur}px`;
  return element;
}
const cadre = auCadrage('cadre');
const reference = auCadrage('reference');

/** La scène de référence : dessinée comme l'écran la dessine avant de la monter, avec ce verso. */
const arbreDeReference = (densite: Densite, depart: PoseDeLaPiste, verso: Verso): Calque =>
  dessinerLeMeuble({
    regard: ETENDUE_DE_LA_PISTE,
    densite,
    objets: dessinerLaPiste(aDessiner.decor, verso, depart, TEXTES, encrier.largeur, densite),
  });

/**
 * Ce qu'une séance rejouée a coûté : le premier dessin, en ms, le nombre d'images, ce que le script a travaillé par image, en ms,
 * et la fluidité de chaque phase de la piste.
 */
interface Mesure {
  readonly montage: number;
  readonly images: number;
  readonly script: number;
  readonly phases: Readonly<Record<PhaseDePiste, Fluidite & { readonly pire: number }>>;
}

const banc = {
  tempsDeLEncrier,
  /** La taille du cadre, en px : celle des deux images que le banc met côte à côte. */
  cadrage: CADRAGES.telephone,
  /** Les scènes que le banc sait mesurer, et le temps entre deux images, en ms, au-delà duquel l'une d'elles est en retard. */
  scenes: Object.keys(SCENES_DE_BANC),
  enRetard: FLUIDITE.enRetard,
  /** L'instant où la réponse tombe : à partir de lui, une image du banc porte le verso du disque. */
  reveleeA: REVELEE_A,
  /** Monte la scène au repos, par le même geste que l'écran d'une piste. Rend le temps que cela prend, en ms, et ce qui a été fabriqué. */
  monter(cle: Densite['cle'], definition: number, ombresFigees = false): { montage: number; bilan: BilanDeMontage } {
    montee?.montage.demonter();
    const debut = performance.now();
    const depart = poseDeDepart(ombresFigees);
    montee = { ...monterLaPiste(aDessiner, { densite: DENSITES[cle], ombresFigees, definition }, VERSO), depart };
    vider(cadre).appendChild(montee.montage.element);
    montee.montage.regarder(regardDeLaPiste(depart).origine);
    return { montage: performance.now() - debut, bilan: montee.montage.bilan() };
  },
  /** Dessine la réponse et la pose au verso du disque. Rend les temps du dessin et de la pose, en ms. */
  remplirLeVerso(): { dessin: number; pose: number } {
    if (montee === undefined) throw new Error('rien de monté');
    const t0 = performance.now();
    const dessins = dessinerLaReponseAuVerso({ genre: VERSO, reponse }, encrier.largeur, montee.densite);
    const t1 = performance.now();
    montee.montage.remplir(CALQUES_DU_VERSO.reponse, dessins);
    return { dessin: t1 - t0, pose: performance.now() - t1 };
  },
  /** La pose à un instant, suivie depuis le début à 120 images par seconde. */
  poseA(t: number, reactions = true): PoseDeLaPiste {
    const suivi = suivreLaPiste();
    const allure = { sobre: false, reactions };
    let pose = suivi.poseA(scene, 0.9, allure);
    for (let i = 0; 0.9 + i / 120 <= t + 1e-9; i++) pose = suivi.poseA(scene, 0.9 + i / 120, allure);
    return pose;
  },
  /** Pose la scène montée dans la pose d'un instant, et son SVG de référence à côté. */
  poser(t: number, avecReference = true): void {
    if (montee === undefined) throw new Error('rien de monté');
    const pose = banc.poseA(t);
    const reglages = montee.reglages(pose);
    montee.montage.regler(reglages);
    const regard = regardDeLaPiste(pose);
    montee.montage.regarder(regard.origine);
    if (!avecReference) return;
    // Une fois la réponse tombée, la référence la porte au verso de son disque, comme la scène montée après « remplirLeVerso ».
    const verso: Verso = t >= REVELEE_A ? { genre: VERSO, reponse } : { genre: VERSO };
    const arbre = regler(arbreDeReference(montee.densite, montee.depart, verso), reglages);
    // Le montage pose le regard sur la grille des px de l'appareil : la référence aussi, pour qu'on compare les mêmes px.
    const D = window.devicePixelRatio;
    const surLaGrille: [number, number] = [Math.round(regard.origine[0] * D) / D, Math.round(regard.origine[1] * D) / D];
    reference.innerHTML = enSvg(arbre, { ...regard, origine: surLaGrille, tracerLeTexte: encrier.tracer, titre: 'référence' });
  },
  /**
   * Ouvre l'atelier de la page dans le cadre, pour l'une des scènes du banc, et y rejoue toute la séance, en temps réel :
   * c'est le code de la page qu'on mesure, pas une copie.
   */
  mesurer(nom: SceneDeBanc): Promise<Mesure> {
    montee?.montage.demonter();
    montee = undefined;
    return new Promise((fini) => {
      const intervalles: Record<PhaseDePiste, number[]> = { decompte: [], extrait: [], revelation: [] };
      let avant: { readonly a: number; readonly phase: PhaseDePiste | undefined } | undefined;
      /** Le travail du script, que l'atelier moyenne sur ses dernières images : on le relève par tranches qui ne se recouvrent pas. */
      const tranches: number[] = [];
      let montrees = 0;
      const atelier: Atelier = ouvrirLAtelier(cadre, {
        ...aDessiner,
        seance: (extraitLent) => seanceDExemple(TEXTES, extraitLent),
        horloge: horlogeDuNavigateur(),
        densiteDeLEcran,
        options: { ...optionsDe({ ...A_L_OUVERTURE, sobre: false }), allegements: SCENES_DE_BANC[nom] },
        chaqueImage(lecture) {
          const a = performance.now();
          const phase = lecture.scene.piste === undefined ? undefined : phaseDeLaPiste(lecture.scene.piste, lecture.instant);
          if (avant !== undefined && phase !== undefined && avant.phase === phase) intervalles[phase].push(a - avant.a);
          avant = { a, phase };
          if (++montrees % FENETRE_DES_MESURES === 0) tranches.push(atelier.mesures().parImage.moyenne);
          // Tout est retombé : la séance est finie.
          if (!lecture.auRepos) return;
          const montage = atelier.mesures().montage;
          atelier.fermer();
          vider(cadre);
          fini({
            montage,
            images: intervalles.decompte.length + intervalles.extrait.length + intervalles.revelation.length,
            script: tranches.reduce((somme, tranche) => somme + tranche, 0) / Math.max(1, tranches.length),
            phases: {
              decompte: fluiditeDe(intervalles.decompte),
              extrait: fluiditeDe(intervalles.extrait),
              revelation: fluiditeDe(intervalles.revelation),
            },
          });
        },
      });
      // La séance part avant la première image : l'atelier ne s'endort pas sur une platine au repos.
      atelier.rejouer('decompte');
    });
  },
};

declare global {
  interface Window {
    /** Le banc, tel qu'outils/banc.py le pilote depuis le navigateur. */
    banc: typeof banc;
  }
}
window.banc = banc;
