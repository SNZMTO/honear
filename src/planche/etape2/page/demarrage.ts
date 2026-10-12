/**
 * Le démarrage de la page de l'atelier : elle dit d'abord que son script a démarré, retrouve tout ce qu'il y anime, ajuste le cadre
 * à la place que la page lui laisse, puis, une fois la page lisible et peinte, y ouvre l'atelier et branche les touches.
 * S'il manque quelque chose au navigateur ou à la page, le cadre garde sa phrase de panne, et l'établi dit de la montrer.
 * Rien ici ne dessine ni ne décide du mouvement.
 */

import { horlogeDuNavigateur } from '../../../ecran/horloge';
import { animationsReduites, ceQuiManqueAuNavigateur, densiteDeLEcran, suivreLesAnimationsReduites, type Manque } from '../../../ecran/navigateur';
import { policesEmbarquees } from '../../../ecran/polices';
import { TEXTES } from '../../../ressources/textes.fr';
import { CARACTERES } from '../../../ressources/typo';
import { encrier as creerLEncrier } from '../../../scene/rendu/texte';
import { pisteDExemple } from '../../exemples';
import { ANCRES } from '../ancres';
import { ouvrirLAtelier, type Atelier } from '../atelier';
import { LEGENDES } from '../legendes.fr';
import { A_L_OUVERTURE, optionsDe, type ChoixDAtelier } from '../options';
import { seanceDExemple } from '../seance';
import { tenirLeCadreAjuste } from './cadre';
import { direLaSeance } from './dire';
import { dire, ecrireDans, element } from './dom';
import { ecrireLesMesures } from './mesures';
import { brancherLaFacade, trouverLaFacade, type Facade, type TouchesDeFacade } from './touches';

/** Les polices du site, en base 64, par nom de fichier : c'est la fabrication de la page qui les y met. */
type Polices = Readonly<Record<string, string>>;

/** Rythme auquel les mesures s'écrivent dans la page, en images : assez lent pour qu'on les lise. */
const RYTHME_DES_MESURES = 30;

/**
 * Fait une chose une fois la page lisible et peinte : ses polices prêtes, puis une image montrée. Ce qui prend du temps
 * ne retarde pas ce qu'on peut déjà lire.
 */
function uneFoisLaPagePeinte(suite: () => void): void {
  const peindrePuisSuivre = (): void => {
    window.requestAnimationFrame(() => window.setTimeout(suite, 0));
  };
  // Les polices sont dans la page : elles sont prêtes en un instant. Un navigateur qui ne sait pas le dire n'attend pas.
  const polices: Promise<unknown> | undefined = 'fonts' in document ? document.fonts.ready : undefined;
  if (polices === undefined) peindrePuisSuivre();
  else polices.then(peindrePuisSuivre, peindrePuisSuivre);
}

/** Dit à qui regarde la scène si on la voit encore, elle ou ses touches : hors de vue, il n'a pas à la tenir à jour. */
function suivreCeQuOnVoit(elements: readonly Element[], voir: (enVue: boolean) => void): void {
  // Un navigateur qui ne sait pas le dire : on fait comme si on la voyait toujours.
  if (typeof IntersectionObserver !== 'function') return;
  const enVue = new Set<Element>();
  const observateur = new IntersectionObserver((entrees) => {
    for (const entree of entrees) {
      if (entree.isIntersecting) enVue.add(entree.target);
      else enVue.delete(entree.target);
    }
    voir(enVue.size > 0);
  });
  for (const unElement of elements) observateur.observe(unElement);
}

/** Le cadre porte déjà la phrase qui dit que le navigateur ne sait pas : on y ajoute ce qui lui manque, pour qui dépanne. */
function direCeQuiManque(manques: readonly Manque[]): void {
  const N = TEXTES.navigateur;
  const detail = element(ANCRES.manques);
  ecrireDans(detail, dire(N.detail, { manques: manques.map((manque) => N.manques[manque]).join(N.entreDeuxManques) }));
  detail.hidden = false;
}

/**
 * Ce que le script anime dans la page, retrouvé d'un coup, avant de rien ouvrir : une page où il manque l'un de ces éléments
 * n'aura pas de scène à moitié branchée, et le cadre garde de quoi le dire.
 */
interface ElementsDeLaPage {
  /** La place que la page laisse à la scène, et le cadre de téléphone qui s'y ajuste. */
  readonly place: HTMLElement;
  readonly cadre: HTMLElement;
  /** La façade : la section où sont les touches, puis chacune d'elles. */
  readonly facade: HTMLElement;
  readonly touches: TouchesDeFacade;
  /** Où l'atelier dit ce qu'il en est de la séance, et le temps écoulé de l'extrait. */
  readonly etat: HTMLElement;
  readonly chrono: HTMLElement;
}

/** @throws si la page n'a pas l'un des éléments que son script anime. */
const trouverLesElements = (): ElementsDeLaPage => ({
  place: element(ANCRES.place),
  cadre: element(ANCRES.cadre),
  facade: element(ANCRES.facade),
  touches: trouverLaFacade(),
  etat: element(ANCRES.etat),
  chrono: element(ANCRES.chrono),
});

/** Ouvre l'atelier dans le cadre, branche ses touches, et tient à jour ce qui s'écrit autour de la scène. */
function ouvrirLaScene({ cadre, touches, etat, chrono }: ElementsDeLaPage, choix: ChoixDAtelier, polices: Polices): Atelier {
  let images = 0;
  // L'atelier montre sa première image après s'être ouvert : la façade est branchée d'ici là.
  let facade: Facade | undefined;
  const atelier: Atelier = ouvrirLAtelier(cadre, {
    decor: pisteDExemple(TEXTES),
    seance: (extraitLent) => seanceDExemple(TEXTES, extraitLent),
    textes: TEXTES,
    encrier: creerLEncrier(CARACTERES, policesEmbarquees(polices), TEXTES.langue),
    horloge: horlogeDuNavigateur(),
    densiteDeLEcran,
    options: optionsDe(choix),
    chaqueImage(lecture) {
      const dit = direLaSeance(lecture);
      ecrireDans(etat, dit.etat);
      ecrireDans(chrono, dit.chrono);
      facade?.suivre(dit.enExtrait);
      // Avant de s'endormir, l'atelier laisse ses dernières mesures à l'écran.
      if (images++ % RYTHME_DES_MESURES === 0 || lecture.auRepos) ecrireLesMesures(atelier.mesures());
    },
    // La scène n'a pas pu être refaite, ou la réponse dessinée : l'atelier garde ce qu'il montrait, et on le note pour qui regarde la console.
    enCasDeRefus: (erreur) => console.error(erreur),
  });
  const branchee = brancherLaFacade(touches, atelier, choix);
  facade = branchee;
  // L'appareil peut changer d'avis pendant que la page est ouverte : la version sobre le suit.
  suivreLesAnimationsReduites((reduites) => branchee.suivreLAppareil(reduites));
  // La scène est là, ses touches aussi : le cadre est désormais une image, qu'on nomme à qui ne la voit pas.
  cadre.setAttribute('role', 'img');
  cadre.setAttribute('aria-label', LEGENDES.cadre);
  return atelier;
}

function demarrer(etabli: HTMLElement, polices: Polices): void {
  const manques = ceQuiManqueAuNavigateur();
  if (manques.length > 0) {
    direCeQuiManque(manques);
    etabli.classList.add(ANCRES.enPanne);
    return;
  }
  // Tout ce que le script anime d'abord : une page où il en manque un morceau n'aura pas de scène non plus, et le cadre garde de quoi le dire.
  const elements = trouverLesElements();
  const { place, cadre, facade, touches } = elements;

  // La version sobre s'enclenche d'elle-même si l'appareil demande de réduire les animations. La page dit alors pourquoi la platine
  // ne bouge presque pas, et offre de tout animer quand même : l'avis prend sa place avant qu'on ne mesure celle du cadre.
  const choix: ChoixDAtelier = { ...A_L_OUVERTURE, sobre: animationsReduites() };
  if (choix.sobre) touches.avis.hidden = false;

  // Le cadre ensuite : la scène se dessinera à la taille qu'il a.
  let atelier: Atelier | undefined;
  const reveiller = (): void => atelier?.reveiller();
  const ajuste = tenirLeCadreAjuste(place, cadre, reveiller);

  uneFoisLaPagePeinte(() => {
    try {
      atelier = ouvrirLaScene(elements, choix, polices);
    } catch (erreur) {
      // La scène n'a pas pu s'ouvrir : le cadre reprend la taille de son message, et dit de changer de navigateur.
      ajuste.lacher();
      etabli.classList.add(ANCRES.enPanne);
      console.error(erreur);
      return;
    }
    const ouvert = atelier;
    suivreCeQuOnVoit([cadre, facade], (enVue) => ouvert.voir(enVue));
    // Un écran qui change de finesse (une fenêtre qu'on passe d'un écran à l'autre, un zoom) ne change pas toujours la place du cadre.
    window.addEventListener('resize', reveiller);
    etabli.classList.add(ANCRES.enMarche);
  });
}

/**
 * Lance la page de l'atelier.
 * @param polices les polices du site, en base 64, par nom de fichier : le script de la page les embarque.
 */
export function lancerLaPage(polices: Polices): void {
  // Dès ici, c'est ce script qui dit où en est la scène : la garde de la page (voir le gabarit) ne dit plus rien.
  const etabli = element(ANCRES.etabli);
  etabli.classList.add(ANCRES.demarre);
  try {
    demarrer(etabli, polices);
  } catch (erreur) {
    etabli.classList.add(ANCRES.enPanne);
    console.error(erreur);
  }
}
