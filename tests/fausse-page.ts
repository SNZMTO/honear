/**
 * Une fausse page, juste assez pour faire tourner sans navigateur ce qui touche à la page : l'écran d'une piste, son montage,
 * ses touches, la boucle d'images, l'atelier et son démarrage. Ses éléments gardent leurs enfants, leur texte, leurs attributs,
 * leur style et leurs écouteurs ; ses toiles comptent ce qu'on y peint ; ses images et ses minuteries n'arrivent que lorsqu'un test
 * les fait passer. Comme un navigateur d'aujourd'hui, elle sait peindre hors de la page, figer une image dans une toile qui ne fait
 * que la montrer, et dire si l'on voit un élément ; un test peut lui retirer chacun de ces savoirs, ou ses toiles elles-mêmes.
 *
 * Ce qu'elle ne fait pas : les gestes que le navigateur fait de lui-même (un libellé pressé ne coche pas son bouton radio,
 * un bouton radio coché ne le dit pas) : un test envoie lui-même chaque événement. Et elle ne garde pas la place d'un texte
 * parmi les éléments qui l'entourent : seulement qu'il est là.
 */

import assert from 'node:assert/strict';

type Ecouteur = (evenement: Record<string, unknown>) => void;

/** Le style d'un faux élément : ses propriétés, lues et écrites une à une ou d'un bloc, et le compte de ce qu'on y a écrit. */
interface FauxStyle {
  cssText: string;
  transform: string;
  opacity: string;
  setProperty(nom: string, valeur: string): void;
  removeProperty(nom: string): void;
  getPropertyValue(nom: string): string;
  [propriete: string]: unknown;
}

/** Les balises qui n'ont jamais de contenu, et celles dont le contenu n'est pas du balisage. */
const SANS_CONTENU = new Set(['input', 'br', 'hr', 'img', 'meta', 'link']);
const CONTENU_BRUT = new Set(['style', 'script', 'title']);

/** Le texte d'un balisage, ses signes rendus à eux-mêmes ; rien s'il n'y a que du blanc entre deux balises. */
const enClair = (balisage: string): string =>
  balisage.trim() === ''
    ? ''
    : balisage
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

/** Le nom d'une donnée d'un élément, tel que son attribut l'écrit : « largeurDuCadre » devient « data-largeur-du-cadre ». */
const attributDeDonnee = (cle: string): string => `data-${cle.replace(/[A-Z]/g, (capitale) => `-${capitale.toLowerCase()}`)}`;

/** Une image figée : ce qu'on a peint, tiré d'une toile d'un seul geste. Elle compte ce qu'on y avait peint. */
export class FausseImage {
  fermee = false;
  constructor(
    readonly width: number,
    readonly height: number,
    readonly peints: number,
  ) {}
  close(): void {
    this.fermee = true;
  }
}

/** Un contexte où peindre : il accepte tout ce qu'on lui demande, et dit chaque remplissage et chaque trait à qui le tient. */
const contexteOuPeindre = (auPeint: () => void): Record<string, unknown> =>
  new Proxy({} as Record<string, unknown>, {
    get: (cible, cle: string) =>
      cle in cible
        ? cible[cle]
        : (): void => {
            if (cle === 'fill' || cle === 'stroke') auPeint();
          },
    set: (cible, cle: string, valeur) => {
      cible[cle] = valeur;
      return true;
    },
  });

/** Comment un navigateur fige une image : en la peignant hors de la page, en la tirant après coup d'une toile peinte, ou pas du tout. */
export type Figeage = 'horsPage' | 'apresCoup' | 'jamais';

/** Le texte d'un élément, vu comme l'un de ses enfants : ce que `firstChild` rend quand il n'y a plus que lui. */
export class FauxTexte {
  constructor(readonly de: FauxElement) {}
}

export class FauxElement {
  readonly tagName: string;
  children: FauxElement[] = [];
  parentElement: FauxElement | null = null;
  readonly attributs = new Map<string, string>();
  /** Les données de l'élément : ce sont ses attributs « data- », lus et écrits par leur nom court. */
  readonly dataset: Record<string, string>;
  readonly style: FauxStyle;
  readonly classes = new Set<string>();
  /** Pour un bouton radio. */
  checked = false;
  value = '';
  /** La taille d'une toile, en px ; et les mesures qu'une page donnerait à l'élément, qu'un test fixe à la main. */
  width = 0;
  height = 0;
  clientWidth = 0;
  clientHeight = 0;
  offsetWidth = 0;
  offsetHeight = 0;
  /** La boîte de l'élément dans la page : celle de ses mesures fixées à la main. */
  getBoundingClientRect(): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
    return { x: 0, y: 0, width: this.clientWidth, height: this.clientHeight };
  }
  /** Ce qu'on a peint sur cette toile, ou sur l'image qu'elle montre : le nombre de remplissages et de traits. */
  peints = 0;
  /** L'image figée que cette toile montre, si elle ne fait que montrer : on ne peut plus y peindre. */
  imageMontree: FausseImage | undefined;
  /** Le nombre d'écritures dans son style, ses attributs et son texte : une scène au repos ne doit plus rien y écrire. */
  ecritures = 0;
  /** Les noms de ce qu'on y a écrit, dans l'ordre : une propriété de son style, un attribut, ou « textContent ». Un test les vide pour repartir de zéro. */
  readonly ecrits: string[] = [];
  /** Les fois où on lui a donné le clavier, et comment. */
  readonly focus_recus: (Record<string, unknown> | undefined)[] = [];
  /** Le texte qu'il porte lui-même, hors de ses enfants. */
  private texte = '';
  private readonly sonTexte = new FauxTexte(this);
  private readonly ecouteurs = new Map<string, Ecouteur[]>();
  /** Une toile n'a jamais qu'un contexte : celui qu'on lui a demandé en premier. */
  private contexte: { readonly genre: string; readonly objet: unknown } | undefined;

  constructor(
    tag: string,
    private readonly page: FaussePage,
  ) {
    this.tagName = tag.toLowerCase();
    const proprietes = new Map<string, string>();
    const methodes = {
      setProperty: (nom: string, valeur: string): void => {
        proprietes.set(nom, valeur);
        this.noter(nom);
      },
      removeProperty: (nom: string): void => {
        proprietes.delete(nom);
        this.noter(nom);
      },
      getPropertyValue: (nom: string): string => proprietes.get(nom) ?? '',
    };
    this.style = new Proxy({} as FauxStyle, {
      set: (_, cle: string, valeur: unknown) => {
        this.noter(cle);
        if (cle !== 'cssText') {
          proprietes.set(cle, String(valeur));
          return true;
        }
        proprietes.clear();
        for (const declaration of String(valeur).split(';')) {
          const deuxPoints = declaration.indexOf(':');
          if (deuxPoints > 0) proprietes.set(declaration.slice(0, deuxPoints).trim(), declaration.slice(deuxPoints + 1).trim());
        }
        return true;
      },
      get: (_, cle: string) => {
        if (cle in methodes) return methodes[cle as keyof typeof methodes];
        if (cle === 'cssText') return [...proprietes].map(([nom, valeur]) => `${nom}:${valeur};`).join('');
        return proprietes.get(cle) ?? '';
      },
    });
    this.dataset = new Proxy({} as Record<string, string>, {
      set: (_, cle: string, valeur: unknown) => {
        this.setAttribute(attributDeDonnee(cle), String(valeur));
        return true;
      },
      get: (_, cle: string) => this.attributs.get(attributDeDonnee(cle)),
      has: (_, cle: string) => this.attributs.has(attributDeDonnee(cle)),
    });
  }

  /** Une écriture dans l'élément : elle se compte, et la page la note dans son journal. */
  private noter(nom: string): void {
    this.ecritures++;
    this.ecrits.push(nom);
    this.page.journal.push(`${this.id !== '' ? `#${this.id}` : this.tagName} ${nom}`);
  }

  // L'arbre.
  append(...enfants: FauxElement[]): void {
    for (const enfant of enfants) this.appendChild(enfant);
  }
  appendChild(enfant: FauxElement): FauxElement {
    enfant.remove();
    enfant.parentElement = this;
    this.children.push(enfant);
    return enfant;
  }
  removeChild(enfant: FauxElement | FauxTexte): void {
    if (enfant instanceof FauxTexte) {
      if (enfant === this.sonTexte) this.texte = '';
      return;
    }
    this.children = this.children.filter((c) => c !== enfant);
    enfant.parentElement = null;
  }
  remove(): void {
    this.parentElement?.removeChild(this);
  }
  replaceWith(autre: FauxElement): void {
    const parent = this.parentElement;
    if (parent === null) return;
    parent.children[parent.children.indexOf(this)] = autre;
    autre.parentElement = parent;
    this.parentElement = null;
  }
  /** Son premier enfant : un élément, ou son texte s'il ne lui reste que lui. */
  get firstChild(): FauxElement | FauxTexte | null {
    return this.children[0] ?? (this.texte !== '' ? this.sonTexte : null);
  }
  get firstElementChild(): FauxElement | null {
    return this.children[0] ?? null;
  }
  get lastElementChild(): FauxElement | null {
    return this.children[this.children.length - 1] ?? null;
  }
  get isConnected(): boolean {
    for (let element: FauxElement | null = this; element !== null; element = element.parentElement) if (element === this.page.racine) return true;
    return false;
  }
  get descendants(): FauxElement[] {
    return this.children.flatMap((enfant) => [enfant, ...enfant.descendants]);
  }
  /** Le plus proche parent de cette balise, lui compris. La fausse page ne sait remonter que par un nom de balise. */
  closest(balise: string): FauxElement | null {
    if (!/^[a-z][\w-]*$/.test(balise)) throw new Error(`La fausse page ne sait pas remonter jusqu'à « ${balise} ».`);
    for (let element: FauxElement | null = this; element !== null; element = element.parentElement) if (element.tagName === balise) return element;
    return null;
  }

  // Le texte : le sien, puis celui de ce qu'il contient. L'écrire retire tout ce qu'il contenait, comme dans une page.
  get textContent(): string {
    return this.texte + this.children.map((enfant) => enfant.textContent).join('');
  }
  set textContent(texte: string) {
    for (const enfant of this.children) enfant.parentElement = null;
    this.children = [];
    this.texte = String(texte);
    this.noter('textContent');
  }
  // Les attributs, les classes, le clavier.
  setAttribute(nom: string, valeur: string): void {
    this.attributs.set(nom, valeur);
    this.noter(nom);
  }
  removeAttribute(nom: string): void {
    this.attributs.delete(nom);
    this.noter(nom);
  }
  getAttribute(nom: string): string | null {
    return this.attributs.get(nom) ?? null;
  }
  get id(): string {
    return this.attributs.get('id') ?? '';
  }
  /** Caché ou non : c'est son attribut « hidden ». */
  get hidden(): boolean {
    return this.attributs.has('hidden');
  }
  set hidden(cache: boolean) {
    if (cache) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }
  readonly classList = {
    add: (classe: string): void => void this.classes.add(classe),
    remove: (classe: string): void => void this.classes.delete(classe),
    contains: (classe: string): boolean => this.classes.has(classe),
    toggle: (classe: string, mise?: boolean): void => {
      if (mise ?? !this.classes.has(classe)) this.classes.add(classe);
      else this.classes.delete(classe);
    },
  };
  focus(options?: Record<string, unknown>): void {
    this.focus_recus.push(options);
    this.page.document.activeElement = this;
  }
  /** Vrai si cet élément est celui-là, ou le contient. */
  contains(autre: FauxElement | null): boolean {
    for (let element = autre; element !== null; element = element.parentElement) if (element === this) return true;
    return false;
  }

  /**
   * Chercher : une balise, un attribut, ou les deux (« input[name="ralenti"] », « [data-calque] », « canvas »).
   * @throws pour tout autre sélecteur : mieux vaut un test qui s'arrête qu'un test qui trouve tout.
   */
  querySelectorAll(selecteur: string): FauxElement[] {
    const lu = /^([a-zA-Z][\w-]*)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(selecteur);
    if (lu === null || selecteur === '') throw new Error(`La fausse page ne sait pas lire le sélecteur « ${selecteur} ».`);
    const [, balise, attribut, valeur] = lu;
    return this.descendants.filter(
      (e) =>
        (balise === undefined || e.tagName === balise.toLowerCase()) &&
        (attribut === undefined || (e.attributs.has(attribut) && (valeur === undefined || e.attributs.get(attribut) === valeur))),
    );
  }
  querySelector(selecteur: string): FauxElement | null {
    return this.querySelectorAll(selecteur)[0] ?? null;
  }

  /**
   * Écrit du balisage à la fin de l'élément : ses balises, leurs attributs, leur texte. Assez pour le SVG d'une scène et pour
   * la page qu'écrit un gabarit ; une feuille de style ou un script sont gardés tels quels, sans être lus.
   */
  insertAdjacentHTML(_ou: string, balisage: string): void {
    const pile: FauxElement[] = [this];
    const balise = /<(\/?)([a-zA-Z][\w-]*)((?:\s[^<>]*?)?)(\/?)>/g;
    let lu = 0;
    for (let trouvee = balise.exec(balisage); trouvee !== null; trouvee = balise.exec(balisage)) {
      const [, fermante, nom = '', attributs = '', seule] = trouvee;
      const ouvert = pile[pile.length - 1];
      if (ouvert === undefined) throw new Error('La fausse page a reçu une balise fermée de trop.');
      ouvert.texte += enClair(balisage.slice(lu, trouvee.index));
      lu = balise.lastIndex;
      if (fermante === '/') {
        if (ouvert.tagName !== nom.toLowerCase() || pile.length === 1)
          throw new Error(`La fausse page a reçu </${nom}> là où elle attendait </${ouvert.tagName}>.`);
        pile.pop();
        continue;
      }
      const element = new FauxElement(nom, this.page);
      for (const [, cle = '', valeur] of attributs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) element.recevoir(cle, enClair(valeur ?? ''));
      ouvert.appendChild(element);
      if (CONTENU_BRUT.has(element.tagName)) {
        const fin = balisage.indexOf(`</${nom}>`, lu);
        if (fin < 0) throw new Error(`La fausse page a reçu un <${nom}> jamais refermé.`);
        element.texte = balisage.slice(lu, fin);
        lu = balise.lastIndex = fin + nom.length + 3;
      } else if (seule !== '/' && !SANS_CONTENU.has(element.tagName)) pile.push(element);
    }
    if (pile.length !== 1) throw new Error('La fausse page a reçu des balises mal refermées.');
    this.texte += enClair(balisage.slice(lu));
  }

  /** Un attribut lu dans du balisage : il règle aussi ce que la page en tire (une classe, un état). Ce n'est pas une écriture du script. */
  private recevoir(nom: string, valeur: string): void {
    this.attributs.set(nom, valeur);
    if (nom === 'class') for (const classe of valeur.split(/\s+/).filter(Boolean)) this.classes.add(classe);
    else if (nom === 'checked') this.checked = true;
    else if (nom === 'value') this.value = valeur;
  }

  // Les écouteurs : un test envoie lui-même les événements.
  addEventListener(type: string, ecouteur: Ecouteur): void {
    this.ecouteurs.set(type, [...(this.ecouteurs.get(type) ?? []), ecouteur]);
  }
  removeEventListener(type: string, ecouteur: Ecouteur): void {
    this.ecouteurs.set(
      type,
      (this.ecouteurs.get(type) ?? []).filter((e) => e !== ecouteur),
    );
  }
  /** Envoie un événement à l'élément, puis à ses parents : il remonte, comme dans une page. @returns vrai si quelqu'un a retenu le navigateur. */
  envoyer(type: string, evenement: Record<string, unknown> = {}): boolean {
    let retenu = false;
    const complet = { target: this, ...evenement, preventDefault: () => void (retenu = true) };
    for (let element: FauxElement | null = this; element !== null; element = element.parentElement)
      for (const ecouteur of element.ecouteurs.get(type) ?? []) ecouteur(complet);
    return retenu;
  }

  /**
   * Le contexte d'une toile : de quoi y peindre (« 2d »), ou de quoi lui faire montrer une image figée (« bitmaprenderer »),
   * si le navigateur sait figer. Le premier demandé est le seul qu'elle aura ; un navigateur à court de toiles n'en donne plus.
   */
  getContext(genre: string): unknown {
    if (this.contexte !== undefined) return this.contexte.genre === genre ? this.contexte.objet : null;
    let objet: unknown;
    if (genre === '2d') {
      if (!this.page.donnerUneToile()) return null;
      objet = contexteOuPeindre(() => void this.peints++);
    } else if (genre === 'bitmaprenderer' && this.page.figeage !== 'jamais') {
      objet = {
        transferFromImageBitmap: (image: FausseImage | null): void => {
          this.imageMontree = image ?? undefined;
          this.peints = image?.peints ?? 0;
        },
      };
    } else return null;
    this.contexte = { genre, objet };
    return objet;
  }
}

/**
 * Vérifie qu'un élément est bien celui qu'on attend. On compare des identités, pas des contenus : un élément tient toute la page
 * par ses parents et ses enfants, et `assert.equal` ou `assert.deepEqual`, pour dire en quoi deux éléments diffèrent, la décriraient
 * tout entière, jusqu'à ne plus rendre la main.
 */
export function memeElement(vu: unknown, attendu: unknown, message: string): void {
  assert.ok(vu === attendu, message);
}

/** Vérifie que deux listes tiennent les mêmes éléments, dans le même ordre : des identités, là encore. */
export function memesElements(vus: readonly unknown[], attendus: readonly unknown[], message: string): void {
  assert.ok(
    vus.length === attendus.length && vus.every((vu, rang) => vu === attendus[rang]),
    `${message} (${vus.length} élément(s) vus, ${attendus.length} attendu(s), ou pas les mêmes)`,
  );
}

/** Ce qu'un navigateur dit d'un pointeur qui se pose : une souris, puis un doigt. */
export const SOURIS = { isPrimary: true, button: 0, pointerType: 'mouse' } as const;
export const DOIGT = { isPrimary: true, button: 0, pointerType: 'touch' } as const;

/** Ce qu'un observateur de vue reçoit : un élément, et si on le voit. */
interface EntreeDeVue {
  readonly target: FauxElement;
  readonly isIntersecting: boolean;
}

/** Un observateur de vue de la fausse page : il retient ce qu'on lui fait regarder, et c'est un test qui lui dit ce qu'on en voit. */
export class FauxObservateurDeVue {
  readonly regardes: FauxElement[] = [];
  constructor(readonly prevenir: (entrees: readonly EntreeDeVue[]) => void) {}
  observe(element: FauxElement): void {
    this.regardes.push(element);
  }
  disconnect(): void {
    this.regardes.length = 0;
  }
}

/** Un observateur de taille de la fausse page : il retient ce qu'on lui fait regarder, et c'est un test qui lui dit qu'un élément a changé de taille. */
export class FauxObservateurDeTaille {
  readonly regardes: FauxElement[] = [];
  constructor(readonly prevenir: () => void) {}
  observe(element: FauxElement): void {
    this.regardes.push(element);
  }
  disconnect(): void {
    this.regardes.length = 0;
  }
}

/** Ce que la fausse page met à la place du monde d'un navigateur, et qu'elle retire ou remet selon ce qu'un test lui demande. */
const monde = globalThis as unknown as Record<string, unknown>;

/** Une fausse page : son document, sa fenêtre, et les images et les minuteries qu'un test fait passer. */
export class FaussePage {
  readonly racine: FauxElement;
  /** Vrai pour un navigateur qui ne donne plus de toile : le montage d'une scène y échoue. */
  sansToile = false;
  /** Le nombre de toiles où ce navigateur laisse encore peindre : passé ce compte, il n'en donne plus. Sans limite, d'ordinaire. */
  toilesAvantLaPanne = Infinity;
  /** Toutes les toiles créées dans cette page, dans l'ordre : un test y lit ce qu'un montage interrompu a laissé. */
  readonly toiles: FauxElement[] = [];
  /** Les images qu'un navigateur a tirées après coup d'une toile peinte, dans l'ordre : un test y lit si chacune a trouvé sa toile, ou a été rendue. */
  readonly imagesTirees: FausseImage[] = [];
  /** Vrai pour un appareil à qui l'on a demandé de réduire les animations : voir `demanderMoinsDAnimations` pour le changer en route. */
  animationsReduites = false;
  /** Ceux qui écoutent cette demande, et la façon dont ils s'y sont pris : celle d'aujourd'hui, ou l'ancienne. */
  readonly ecouteursDesAnimations = new Map<() => void, 'addEventListener' | 'addListener'>();
  /** Faux pour un navigateur d'il y a cinq ans, qui n'écoute une demande que de l'ancienne façon. */
  ecouteLesDemandes = true;
  /** Faux pour un navigateur qui ne sait pas le SVG : ses éléments n'ont pas de transformation. */
  saitLeSvg = true;
  /** Tout ce que le script a écrit dans la page, dans l'ordre : l'élément (son nom, ou sa balise), puis ce qu'il y a écrit. */
  readonly journal: string[] = [];
  /** Les observateurs de vue et de taille que le script a créés. */
  readonly observateursDeVue: FauxObservateurDeVue[] = [];
  readonly observateursDeTaille: FauxObservateurDeTaille[] = [];
  private facon: Figeage = 'horsPage';
  /** Ce que la fenêtre a en attente : les images demandées, et les minuteries posées. */
  private readonly imagesDemandees = new Map<number, () => void>();
  private readonly minuteries = new Map<number, () => void>();
  private demandes = 0;
  private readonly ecouteursDeFenetre = new Map<string, Set<() => void>>();
  readonly document: {
    activeElement: FauxElement | null;
    /** Les polices de la page, si le navigateur sait dire quand elles sont prêtes. */
    fonts?: { readonly ready: Promise<unknown> };
    createElement(tag: string): FauxElement;
    createElementNS(espace: string, tag: string): FauxElement;
    getElementById(id: string): FauxElement | null;
    querySelectorAll(selecteur: string): FauxElement[];
    querySelector(selecteur: string): FauxElement | null;
    addEventListener(type: string, ecouteur: Ecouteur): void;
    removeEventListener(type: string, ecouteur: Ecouteur): void;
  };
  /** Ce que le document écoute, par type d'événement : un test y lit ce qu'un module a branché, puis débranché. */
  readonly ecouteursDuDocument = new Map<string, Set<Ecouteur>>();
  readonly fenetre: Record<string, unknown>;

  constructor() {
    this.racine = new FauxElement('body', this);
    this.document = {
      activeElement: null,
      createElement: (tag) => {
        const element = new FauxElement(tag, this);
        if (element.tagName === 'canvas') this.toiles.push(element);
        return element;
      },
      createElementNS: (_espace, tag) => {
        const element = new FauxElement(tag, this);
        // Un élément de SVG a une transformation : c'est à elle qu'on reconnaît un navigateur qui sait le SVG.
        if (this.saitLeSvg) Object.defineProperty(element, 'transform', { value: {} });
        return element;
      },
      getElementById: (id) => this.racine.descendants.find((e) => e.id === id) ?? null,
      querySelectorAll: (selecteur) => this.racine.querySelectorAll(selecteur),
      querySelector: (selecteur) => this.racine.querySelector(selecteur),
      addEventListener: (type, ecouteur) => {
        this.ecouteursDuDocument.set(type, new Set([...(this.ecouteursDuDocument.get(type) ?? []), ecouteur]));
      },
      removeEventListener: (type, ecouteur) => {
        this.ecouteursDuDocument.get(type)?.delete(ecouteur);
      },
    };
    this.fenetre = {
      devicePixelRatio: 3,
      PointerEvent: function PointerEvent() {},
      requestAnimationFrame: (image: () => void): number => {
        this.imagesDemandees.set(++this.demandes, image);
        return this.demandes;
      },
      cancelAnimationFrame: (numero: number): void => {
        this.imagesDemandees.delete(numero);
      },
      setTimeout: (suite: () => void): number => {
        this.minuteries.set(++this.demandes, suite);
        return this.demandes;
      },
      matchMedia: (requete: string) => {
        const page = this;
        const surLesAnimations = requete === '(prefers-reduced-motion: reduce)';
        const ancienne = {
          media: requete,
          get matches(): boolean {
            return surLesAnimations && page.animationsReduites;
          },
          addListener: (ecouteur: () => void): void => void (surLesAnimations && page.ecouteursDesAnimations.set(ecouteur, 'addListener')),
          removeListener: (ecouteur: () => void): void => void page.ecouteursDesAnimations.delete(ecouteur),
        };
        if (!this.ecouteLesDemandes) return ancienne;
        return Object.assign(ancienne, {
          addEventListener: (_type: string, ecouteur: () => void): void =>
            void (surLesAnimations && page.ecouteursDesAnimations.set(ecouteur, 'addEventListener')),
          removeEventListener: (_type: string, ecouteur: () => void): void => void page.ecouteursDesAnimations.delete(ecouteur),
        });
      },
      addEventListener: (type: string, ecouteur: () => void): void => {
        this.ecouteursDeFenetre.set(type, new Set([...(this.ecouteursDeFenetre.get(type) ?? []), ecouteur]));
      },
      removeEventListener: (type: string, ecouteur: () => void): void => {
        this.ecouteursDeFenetre.get(type)?.delete(ecouteur);
      },
    };
  }

  /** Vrai si ce navigateur donne encore de quoi peindre : il en reste alors une de moins à donner. */
  donnerUneToile(): boolean {
    if (this.sansToile || this.toilesAvantLaPanne <= 0) return false;
    this.toilesAvantLaPanne--;
    return true;
  }

  /** La façon dont ce navigateur fige une image. La changer lui donne, ou lui retire, ce qu'il lui faut pour cela. */
  get figeage(): Figeage {
    return this.facon;
  }
  set figeage(facon: Figeage) {
    this.facon = facon;
    delete monde['OffscreenCanvas'];
    delete monde['createImageBitmap'];
    const donner = (): boolean => this.donnerUneToile();
    if (facon === 'horsPage')
      monde['OffscreenCanvas'] = class {
        private peints = 0;
        constructor(
          readonly width: number,
          readonly height: number,
        ) {}
        getContext(genre: string): unknown {
          return genre === '2d' && donner() ? contexteOuPeindre(() => void this.peints++) : null;
        }
        transferToImageBitmap(): FausseImage {
          return new FausseImage(this.width, this.height, this.peints);
        }
      };
    if (facon === 'apresCoup')
      monde['createImageBitmap'] = (toile: FauxElement): Promise<FausseImage> => {
        const tiree = new FausseImage(toile.width, toile.height, toile.peints);
        this.imagesTirees.push(tiree);
        return Promise.resolve(tiree);
      };
  }

  /** Vrai si ce navigateur sait dire si l'on voit un élément. Le changer lui en donne de quoi, ou le lui retire. */
  get observeLaVue(): boolean {
    return 'IntersectionObserver' in monde;
  }
  set observeLaVue(sait: boolean) {
    delete monde['IntersectionObserver'];
    if (!sait) return;
    const crees = this.observateursDeVue;
    monde['IntersectionObserver'] = class extends FauxObservateurDeVue {
      constructor(prevenir: (entrees: readonly EntreeDeVue[]) => void) {
        super(prevenir);
        crees.push(this);
      }
    };
  }

  /**
   * Vrai si ce navigateur sait dire qu'un élément change de taille. Le changer lui en donne de quoi, ou le lui retire :
   * il ne l'a pas d'ordinaire, et c'est alors la fenêtre qu'on écoute.
   */
  get observeLesTailles(): boolean {
    return 'ResizeObserver' in monde;
  }
  set observeLesTailles(sait: boolean) {
    delete monde['ResizeObserver'];
    if (!sait) return;
    const crees = this.observateursDeTaille;
    monde['ResizeObserver'] = class extends FauxObservateurDeTaille {
      constructor(prevenir: () => void) {
        super(prevenir);
        crees.push(this);
      }
    };
  }

  /** Dit à ceux qui le regardent que cet élément a changé de taille. @returns le nombre d'observateurs prévenus. */
  direLaTaille(element: FauxElement): number {
    const prevenus = this.observateursDeTaille.filter((observateur) => observateur.regardes.includes(element));
    for (const observateur of prevenus) observateur.prevenir();
    return prevenus.length;
  }

  /** L'appareil change d'avis en route : on lui demande de réduire les animations, ou l'on y renonce. @returns le nombre d'écouteurs prévenus. */
  demanderMoinsDAnimations(reduites: boolean): number {
    this.animationsReduites = reduites;
    const ecouteurs = [...this.ecouteursDesAnimations.keys()];
    for (const ecouteur of ecouteurs) ecouteur();
    return ecouteurs.length;
  }

  /** Dit à ceux qui le regardent si l'on voit cet élément. @returns le nombre d'observateurs prévenus. */
  direLaVue(element: FauxElement, enVue: boolean): number {
    const prevenus = this.observateursDeVue.filter((observateur) => observateur.regardes.includes(element));
    for (const observateur of prevenus) observateur.prevenir([{ target: element, isIntersecting: enVue }]);
    return prevenus.length;
  }

  /** Envoie un événement à la fenêtre : une fenêtre qu'on étire, par exemple. @returns le nombre d'écouteurs qui l'ont reçu. */
  direALaFenetre(type: string): number {
    const ecouteurs = [...(this.ecouteursDeFenetre.get(type) ?? [])];
    for (const ecouteur of ecouteurs) ecouteur();
    return ecouteurs.length;
  }

  /** Un élément neuf, posé dans la page. */
  poser(tag: string, attributs: Readonly<Record<string, string>> = {}, dans: FauxElement = this.racine): FauxElement {
    const element = new FauxElement(tag, this);
    for (const [nom, valeur] of Object.entries(attributs)) element.attributs.set(nom, valeur);
    return dans.appendChild(element);
  }

  /** Vrai si la page attend une image : une boucle tourne, ou quelque chose attend que la page soit peinte. */
  get attendUneImage(): boolean {
    return this.imagesDemandees.size > 0;
  }

  /** Fait passer ce qui attendait : chacun une fois, même si l'un d'eux échoue ; ce qu'ils demandent à leur tour attendra le tour suivant. */
  private passer(enAttente: Map<number, () => void>): number {
    const suites = [...enAttente.values()];
    enAttente.clear();
    const echecs: unknown[] = [];
    for (const suite of suites) {
      try {
        suite();
      } catch (erreur) {
        echecs.push(erreur);
      }
    }
    if (echecs.length > 0) throw echecs[0];
    return suites.length;
  }

  /** Fait passer une image : tout ce qui l'attendait est appelé. @returns vrai si quelque chose l'attendait. @throws ce qu'une image a levé. */
  passerUneImage(): boolean {
    return this.passer(this.imagesDemandees) > 0;
  }

  /** Fait sonner les minuteries posées. @returns leur nombre. */
  passerLesMinuteries(): number {
    return this.passer(this.minuteries);
  }
}

/**
 * Installe une fausse page à la place du document et de la fenêtre : à faire avant d'appeler ce qui touche à la page.
 * Elle remet le monde comme un navigateur d'aujourd'hui le donne, quoi qu'un test précédent en ait retiré.
 */
export function installerUneFaussePage(): FaussePage {
  const page = new FaussePage();
  monde['document'] = page.document;
  monde['window'] = page.fenetre;
  monde['Path2D'] = class {
    constructor(readonly trace: string) {}
  };
  page.figeage = 'horsPage';
  page.observeLaVue = true;
  page.observeLesTailles = false;
  return page;
}

/** Un faux élément, donné pour un élément de page à ce qui en attend un. */
export const enElement = (faux: FauxElement): HTMLElement => faux as unknown as HTMLElement;
