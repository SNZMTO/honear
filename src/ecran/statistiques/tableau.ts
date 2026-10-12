/**
 * La page des statistiques, dans le navigateur de l'éditeur : elle lit sa clé (dans l'adresse la première fois, puis dans le
 * navigateur), demande les statistiques à son serveur, et les montre : ce qui se passe en ce moment, l'essentiel de la période
 * choisie et son évolution, jour après jour, les modes, les réglages, les joueurs, les réponses, la musique, le partage, les
 * appareils, les premiers pas, les heures où l'on vient, les comptes, les records. Elle se relit toute seule.
 */

import type { Compteurs, VueDesStatistiques } from '../../regles/statistiques';
import { ADRESSES_DES_STATISTIQUES, PAGE_DES_STATISTIQUES as P } from '../../ressources/statistiques';
import type { Noms, Textes } from '../../ressources/textes';
import { remplir } from '../../scene/phrases';

type Periode = keyof typeof P.periodes;
const PERIODES = Object.keys(P.periodes) as Periode[];

/** Les millisecondes d'une seconde, les secondes d'une minute et d'une heure, cent pour cent. */
const MS_PAR_SECONDE = 1000;
const SECONDES_PAR_MINUTE = 60;
const SECONDES_PAR_HEURE = 3600;
const CENT = 100;
/** Entre deux relectures, en millisecondes. */
const RELIRE = P.rafraichir * MS_PAR_SECONDE;
/** Une courbe : sa largeur et sa hauteur dans son dessin, la place de ses dates dessous, l'écart entre deux barres (en part du pas). */
const COURBE = { largeur: 600, hauteur: 120, dates: 18, ecart: 0.22 } as const;
/** Les barres des heures et des jours : leur hauteur, et la place de leurs noms dessous. */
const HISTOGRAMME = { largeur: 600, hauteur: 110, noms: 18 } as const;
/** Une barre qui n'est pas nulle se voit, même toute petite : au moins tant de px. */
const BARRE_AU_MOINS = 2;
/** Le rayon des coins des barres. */
const COIN = 3;

/** Les couleurs des séries, dans l'ordre : celles de la feuille de la page (voir gabarit.ts). */
const SERIES = ['var(--miel)', 'var(--bleu)', 'var(--rose)', 'var(--olive)', 'var(--lilas)', 'var(--orange)', 'var(--petrole)', 'var(--kraft)'];

/** Un élément de la page, avec sa classe et son texte. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe !== undefined) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** Un élément de dessin (SVG), avec ses attributs. */
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributs: Readonly<Record<string, string | number>> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [nom, valeur] of Object.entries(attributs)) e.setAttribute(nom, String(valeur));
  return e;
}

/** Ajoute des enfants, et rend le parent. */
function avec<E extends Element>(parent: E, ...enfants: (Node | undefined | false)[]): E {
  for (const enfant of enfants) if (enfant !== undefined && enfant !== false) parent.append(enfant);
  return parent;
}

/** Ce que la page écrit, dans la langue du site. */
function ecritoire(textes: Textes) {
  const T = textes.statistiques;
  const U = T.unites;
  const format = new Intl.NumberFormat(textes.langue);
  const nombre = (n: number): string => format.format(Math.round(n));
  const pourcent = (a: number, b: number): string => remplir(U.pourcent, { n: b > 0 ? Math.round((CENT * a) / b) : 0 });
  /** Une durée, en secondes : « 42 s », « 3 min 20 s », « 1 h 05 ». */
  function duree(secondes: number): string {
    const s = Math.max(0, Math.round(secondes));
    if (s < SECONDES_PAR_MINUTE) return remplir(U.secondes, { n: s });
    if (s < SECONDES_PAR_HEURE) {
      const reste = s % SECONDES_PAR_MINUTE;
      return `${remplir(U.minutes, { n: Math.floor(s / SECONDES_PAR_MINUTE) })}${reste > 0 ? ` ${remplir(U.secondes, { n: reste })}` : ''}`;
    }
    const minutes = Math.floor((s % SECONDES_PAR_HEURE) / SECONDES_PAR_MINUTE);
    return `${remplir(U.heures, { n: Math.floor(s / SECONDES_PAR_HEURE) })}${minutes > 0 ? ` ${remplir(U.minutes, { n: minutes })}` : ''}`;
  }
  /** Un jour du calendrier, comme on l'écrit : « 12/10 », ou « 12/10/2026 ». */
  const jour = (j: string, annee = false): string => {
    const [a = '', m = '', d = ''] = j.split('-');
    return annee ? `${d}/${m}/${a}` : `${d}/${m}`;
  };
  return { T, nombre, pourcent, duree, jour };
}

type Ecritoire = ReturnType<typeof ecritoire>;

/** Ce que la page a sous la main : les statistiques, la période choisie, et de quoi écrire. */
interface Lecture {
  readonly v: VueDesStatistiques;
  readonly periode: Periode;
  readonly e: Ecritoire;
  readonly textes: Textes;
}

/** Les jours de la période : les derniers, autant qu'elle en compte ; rien pour « depuis le début » (on prend alors les totaux). */
const joursDe = (l: Lecture): VueDesStatistiques['jours'] | undefined =>
  l.periode === 'tout' ? undefined : l.v.jours.slice(Math.max(0, l.v.jours.length - P.periodes[l.periode]));

/** Un compteur sur la période. */
function somme(l: Lecture, cle: string): number {
  const jours = joursDe(l);
  if (jours === undefined) return l.v.totaux[cle] ?? 0;
  return jours.reduce((s, j) => s + (j.compteurs[cle] ?? 0), 0);
}

/** Le même compteur, sur la période d'avant, de même longueur, si on l'a en entier. */
function avant(l: Lecture, cle: string): number | undefined {
  if (l.periode === 'tout') return undefined;
  const n = P.periodes[l.periode];
  const fin = l.v.jours.length - n;
  if (fin - n < 0) return undefined;
  return l.v.jours.slice(fin - n, fin).reduce((s, j) => s + (j.compteurs[cle] ?? 0), 0);
}

/** Les compteurs d'une famille (« rooms.mode. »…), sur la période : leur nom (ce qui suit le préfixe), et leur nombre. */
function famille(l: Lecture, prefixe: string): [string, number][] {
  const jours = joursDe(l);
  const sources: Compteurs[] = jours === undefined ? [l.v.totaux] : jours.map((j) => j.compteurs);
  const total = new Map<string, number>();
  for (const c of sources)
    for (const [cle, n] of Object.entries(c)) {
      if (!cle.startsWith(prefixe)) continue;
      const nom = cle.slice(prefixe.length);
      if (nom === '' || nom.includes('.')) continue;
      total.set(nom, (total.get(nom) ?? 0) + n);
    }
  return [...total.entries()].sort((a, b) => b[1] - a[1]);
}

/** Une tuile : un grand nombre, ce qu'il compte, un détail, et son évolution sur la période d'avant. */
function tuile(l: Lecture, valeur: string, libelle: string, options: { detail?: string; cle?: string; classe?: string } = {}): HTMLElement {
  const t = avec(
    el('div', `tuile${options.classe !== undefined ? ` ${options.classe}` : ''}`),
    el('div', 'nombre', valeur),
    el('div', 'libelle', libelle),
  );
  if (options.detail !== undefined) t.append(el('div', 'detail', options.detail));
  if (options.cle === undefined) return t;
  const precedent = avant(l, options.cle);
  if (precedent === undefined || precedent === 0) return t;
  const maintenant = somme(l, options.cle);
  const ecart = Math.round((CENT * (maintenant - precedent)) / precedent);
  const E = l.e.T.evolution;
  const evolution = el(
    'span',
    `evolution ${ecart > 0 ? 'hausse' : ecart < 0 ? 'baisse' : ''}`,
    ecart > 0 ? remplir(E.hausse, { n: ecart }) : ecart < 0 ? remplir(E.baisse, { n: -ecart }) : E.egal,
  );
  evolution.append(el('span', 'avant', remplir(E.avant, { jours: P.periodes[l.periode] })));
  t.append(evolution);
  return t;
}

/** Une tuile qui compte un compteur sur la période. */
const compte = (l: Lecture, cle: string, libelle: string, detail?: string): HTMLElement =>
  tuile(l, l.e.nombre(somme(l, cle)), libelle, { cle, ...(detail !== undefined ? { detail } : {}) });

/** Une partie de la page : son titre, et ce qu'elle montre. */
const partie = (titre: string, ...contenu: (Node | undefined | false)[]): HTMLElement => avec(el('section'), el('h2', undefined, titre), ...contenu);

/** Une carte : un petit titre, et ce qu'elle montre. */
const carte = (titre: string | undefined, ...contenu: (Node | undefined | false)[]): HTMLElement =>
  avec(el('div', 'carte'), titre !== undefined ? el('h3', undefined, titre) : undefined, ...contenu);

/** Des barres, une par nom, à la mesure de la plus grande, avec leur part du tout. */
function barres(l: Lecture, valeurs: readonly (readonly [string, number])[], noms: Noms = {}, sansPart = false): HTMLElement {
  const total = valeurs.reduce((s, [, n]) => s + n, 0);
  const plus = Math.max(1, ...valeurs.map(([, n]) => n));
  if (valeurs.length === 0 || total === 0) return el('p', 'vide', '—');
  return avec(
    el('div', 'barres'),
    ...valeurs.map(([nom, n], rang) => {
      const jauge = el('span');
      jauge.style.width = `${(CENT * n) / plus}%`;
      jauge.style.background = SERIES[rang % SERIES.length] ?? '';
      const valeur = el('span', 'valeur', l.e.nombre(n));
      if (!sansPart) valeur.append(el('small', undefined, l.e.pourcent(n, total)));
      return avec(el('div', 'barre'), el('span', 'nom', noms[nom] ?? nom), avec(el('span', 'jauge'), jauge), valeur);
    }),
  );
}

/** Une barre faite de plusieurs parts, et sa légende. */
function empile(l: Lecture, parts: readonly (readonly [string, number])[]): HTMLElement {
  const total = parts.reduce((s, [, n]) => s + n, 0);
  const barre = el('div', 'empile');
  const legende = el('div', 'legende');
  for (const [rang, [nom, n]] of parts.entries()) {
    const couleur = SERIES[rang % SERIES.length] ?? '';
    const part = el('span');
    part.style.width = `${total > 0 ? (CENT * n) / total : 0}%`;
    part.style.background = couleur;
    barre.append(part);
    const pastille = el('i');
    pastille.style.background = couleur;
    legende.append(avec(el('span'), pastille, document.createTextNode(`${nom} · ${l.e.nombre(n)} (${l.e.pourcent(n, total)})`)));
  }
  return avec(el('div'), barre, legende);
}

/** Une courbe en barres, jour par jour : le total de la période, puis une barre par jour (le week-end en kraft). */
function courbe(l: Lecture, titre: string, cle: string): HTMLElement {
  const n = Math.min(l.v.jours.length, Math.max(P.courbes, l.periode === 'tout' ? l.v.jours.length : P.periodes[l.periode]));
  const jours = l.v.jours.slice(l.v.jours.length - n);
  const valeurs = jours.map((j) => j.compteurs[cle] ?? 0);
  const plus = Math.max(1, ...valeurs);
  const { largeur, hauteur, dates, ecart } = COURBE;
  const pas = largeur / Math.max(1, jours.length);
  const dessin = svg('svg', { viewBox: `0 0 ${largeur} ${hauteur + dates}`, role: 'img', 'aria-label': titre });
  for (const [rang, j] of jours.entries()) {
    const v = valeurs[rang] ?? 0;
    const h = v > 0 ? Math.max(BARRE_AU_MOINS, (hauteur * v) / plus) : 0;
    const finDeSemaine = j.semaine === 0 || j.semaine === SAMEDI;
    const barre = svg('rect', {
      x: rang * pas + (pas * ecart) / 2,
      y: hauteur - h,
      width: Math.max(1, pas * (1 - ecart)),
      height: h,
      rx: Math.min(COIN, (pas * (1 - ecart)) / 2),
      fill: finDeSemaine ? 'var(--kraft)' : 'var(--miel)',
    });
    barre.append(avec(svg('title'), document.createTextNode(`${l.e.jour(j.jour)} : ${l.e.nombre(v)}`)));
    dessin.append(barre);
  }
  // Les dates : la première, celle du milieu, la dernière.
  for (const rang of [...new Set([0, Math.floor((jours.length - 1) / 2), jours.length - 1])]) {
    const j = jours[rang];
    if (j === undefined) continue;
    const ancre = rang === 0 ? 'start' : rang === jours.length - 1 ? 'end' : 'middle';
    const x = rang === 0 ? 0 : rang === jours.length - 1 ? largeur : rang * pas + pas / 2;
    dessin.append(avec(svg('text', { x, y: hauteur + dates - BARRE_AU_MOINS, 'text-anchor': ancre }), document.createTextNode(l.e.jour(j.jour))));
  }
  const total = el('div', 'total', l.e.nombre(somme(l, cle)));
  total.append(el('small', undefined, l.e.T.periodes[l.periode] ?? ''));
  return avec(el('div', 'carte courbe'), el('h3', undefined, titre), total, dessin);
}

/** Un histogramme : une barre par case (les heures, les jours de la semaine), son nom dessous. */
function histogramme(l: Lecture, titre: string, valeurs: readonly number[], noms: readonly string[]): HTMLElement {
  const { largeur, hauteur, noms: place } = HISTOGRAMME;
  const plus = Math.max(1, ...valeurs);
  const pas = largeur / Math.max(1, valeurs.length);
  const dessin = svg('svg', { viewBox: `0 0 ${largeur} ${hauteur + place}`, role: 'img', 'aria-label': titre });
  for (const [rang, v] of valeurs.entries()) {
    const h = v > 0 ? Math.max(BARRE_AU_MOINS, (hauteur * v) / plus) : 0;
    const barre = svg('rect', {
      x: rang * pas + (pas * COURBE.ecart) / 2,
      y: hauteur - h,
      width: pas * (1 - COURBE.ecart),
      height: h,
      rx: COIN,
      fill: v === plus ? 'var(--miel)' : 'var(--bleu)',
    });
    barre.append(avec(svg('title'), document.createTextNode(`${noms[rang] ?? ''} : ${l.e.nombre(v)}`)));
    dessin.append(barre);
    dessin.append(
      avec(
        svg('text', { x: rang * pas + pas / 2, y: hauteur + place - BARRE_AU_MOINS, 'text-anchor': 'middle' }),
        document.createTextNode(noms[rang] ?? ''),
      ),
    );
  }
  return avec(el('div', 'carte courbe'), el('h3', undefined, titre), dessin);
}

/** Un tableau : ses colonnes, et ses lignes (la première colonne à gauche, les autres en chiffres). */
function tableau(colonnes: readonly string[], lignes: readonly (readonly (string | Node)[])[]): HTMLElement {
  if (lignes.length === 0) return el('p', 'vide', '—');
  const t = el('table');
  t.append(avec(el('thead'), avec(el('tr'), ...colonnes.map((c) => el('th', undefined, c)))));
  t.append(
    avec(
      el('tbody'),
      ...lignes.map((ligne) =>
        avec(
          el('tr'),
          ...ligne.map((cellule) => {
            const td = el('td');
            td.append(typeof cellule === 'string' ? document.createTextNode(cellule) : cellule);
            return td;
          }),
        ),
      ),
    ),
  );
  return t;
}

/** Le samedi, dans la semaine qui commence le dimanche. */
const SAMEDI = 6;

/** Les parties de la page, dans l'ordre. */
function parties(l: Lecture): HTMLElement[] {
  const { T, nombre, pourcent, duree, jour } = l.e;
  const C = l.textes.commandes;
  const s = (cle: string): number => somme(l, cle);
  const v = l.v;

  // En ce moment.
  const D = T.enDirect;
  const rooms = v.enDirect.rooms;
  // Ceux qui jouent en ce moment : dont le téléphone est branché à une room.
  const joueursEnRoom = rooms.reduce((n, r) => n + r.branches, 0);
  const enDirect = partie(
    D.titre,
    avec(
      el('div', 'grille'),
      tuile(l, nombre(rooms.length), D.rooms, { classe: 'miel' }),
      tuile(l, nombre(v.enDirect.telephones), D.telephones),
      tuile(l, nombre(joueursEnRoom), D.joueurs),
      tuile(l, nombre(rooms.filter((r) => r.phase === 'pistes').length), D.enJeu),
      v.enDirect.comptes !== undefined && tuile(l, nombre(v.enDirect.comptes), D.comptes),
    ),
    rooms.length === 0
      ? el('p', 'vide', D.aucune)
      : avec(
          el('ul', 'rooms'),
          ...rooms.map((r) =>
            avec(
              el('li'),
              el('b', undefined, C.modes[r.mode] ?? r.mode),
              document.createTextNode(
                ` · ${remplir(D.room, {
                  phase: D.phases[r.phase] ?? r.phase,
                  joueurs: r.joueurs,
                  branches: r.branches,
                  piste: Math.min(r.pistes, r.pistesJouees + 1),
                  sur: r.pistes,
                  duree: duree(r.age),
                })}`,
              ),
            ),
          ),
        ),
    el('p', 'vide', remplir(D.serveur, { duree: duree(v.enDirect.depuis), version: v.enDirect.version ?? '—' })),
  );

  // L'essentiel.
  const Es = T.essentiel;
  const essentiel = partie(
    Es.titre,
    avec(
      el('div', 'grille'),
      compte(l, 'visiteurs', Es['visiteurs'] ?? ''),
      compte(l, 'pages', Es['pages'] ?? ''),
      compte(l, 'joueurs', Es['joueurs'] ?? ''),
      compte(l, 'rooms', Es['rooms'] ?? ''),
      compte(l, 'parties', Es['parties'] ?? ''),
      compte(l, 'faces', Es['faces'] ?? '', remplir(Es.completion, { n: pourcent(s('faces'), s('parties')) })),
      compte(l, 'pistes.revelees', Es['pistes'] ?? ''),
      compte(l, 'reponses', Es['reponses'] ?? ''),
      tuile(l, nombre(s('telephone.lienPartage') + s('telephone.lienCopie')), Es['partages'] ?? ''),
      tuile(l, nombre(s('telephone.arriveeParQr') + s('telephone.arriveeParLien')), Es['arrivees'] ?? ''),
      compte(l, 'comptes.cree', Es['comptes'] ?? ''),
    ),
  );

  // Jour après jour.
  const J = T.jourParJour;
  const jourParJour = partie(
    J.titre,
    avec(
      el('div', 'grille large'),
      courbe(l, J['visiteurs'] ?? '', 'visiteurs'),
      courbe(l, J['joueurs'] ?? '', 'joueurs'),
      courbe(l, J['parties'] ?? '', 'parties'),
      courbe(l, J['faces'] ?? '', 'faces'),
    ),
  );

  // Les modes.
  const M = T.modes.colonnes;
  const modes = Object.keys(C.modes);
  const lesModes = partie(
    T.modes.titre,
    avec(
      el('div', 'carte'),
      tableau(
        [M['mode'] ?? '', M['rooms'] ?? '', M['parties'] ?? '', M['faces'] ?? '', M['completion'] ?? '', M['duree'] ?? ''],
        modes.map((m) => {
          const faces = s(`faces.mode.${m}`);
          return [
            C.modes[m] ?? m,
            nombre(s(`rooms.mode.${m}`)),
            nombre(s(`parties.mode.${m}`)),
            nombre(faces),
            pourcent(faces, s(`parties.mode.${m}`)),
            faces > 0 ? duree(s(`duree.faces.mode.${m}`) / faces) : '—',
          ];
        }),
      ),
    ),
  );

  // Les réglages.
  const R = T.reglages;
  const enOrdre = (valeurs: [string, number][]): [string, number][] => [...valeurs].sort((a, b) => Number(a[0]) - Number(b[0]));
  const reglages = partie(
    R.titre,
    avec(
      el('div', 'grille large'),
      carte(R.titres, barres(l, enOrdre(famille(l, 'rooms.pistes.')))),
      carte(R.secondes, barres(l, enOrdre(famille(l, 'rooms.extrait.')))),
      carte(R.son, barres(l, famille(l, 'rooms.son.'), R.sons)),
    ),
  );

  // Les joueurs.
  const Jo = T.joueurs;
  const faces = s('faces');
  const joueursParFace = famille(l, 'faces.joueurs.');
  const totalDesJoueurs = joueursParFace.reduce((n, [nb, fois]) => n + Number(nb) * fois, 0);
  const joueurs = partie(
    Jo.titre,
    avec(
      el('div', 'grille'),
      tuile(l, faces > 0 ? nombre(totalDesJoueurs / faces) : '—', Jo['parFace'] ?? '', {}),
      compte(l, 'joueurs.spectateurs', Jo['spectateurs'] ?? ''),
      compte(l, 'deconnexions', Jo['deconnexions'] ?? ''),
      compte(l, 'retours', Jo['retours'] ?? ''),
      compte(l, 'departs', Jo['departs'] ?? ''),
      tuile(l, s('lignes.finies') > 0 ? duree(s('duree.lignes') / s('lignes.finies')) : '—', Jo['connexion'] ?? ''),
      compte(l, 'rooms.sansPartie', Jo['sansPartie'] ?? ''),
      tuile(l, s('rooms.fermees') > 0 ? duree(s('duree.rooms') / s('rooms.fermees')) : '—', Jo['dureeRoom'] ?? ''),
    ),
    avec(
      el('div', 'grille large'),
      carte(Jo['parFace'], barres(l, enOrdre(joueursParFace))),
      carte(Jo['parRoom'], barres(l, enOrdre(famille(l, 'rooms.joueurs.')))),
    ),
  );

  // Les réponses.
  const Re = T.reponses;
  const delais = famille(l, 'delai.').filter(([nom]) => nom !== 'premieres');
  const premieres = s('premieres');
  const reponses = partie(
    Re.titre,
    avec(
      el('div', 'grille'),
      compte(l, 'reponses', Es['reponses'] ?? ''),
      compte(l, 'pistes.trouvees', Re['trouvees'] ?? '', pourcent(s('pistes.trouvees'), s('pistes.revelees'))),
      compte(l, 'pistes.personne', Re['personne'] ?? '', pourcent(s('pistes.personne'), s('pistes.revelees'))),
      tuile(l, pourcent(s('trouveurs'), s('trouveurs.joueurs')), Re['taux'] ?? ''),
      tuile(l, premieres > 0 ? duree(s('delai.premieres') / premieres) : '—', Re['delai'] ?? ''),
      compte(l, 'reponses.complet', Re['complets'] ?? ''),
      compte(l, 'points', Re['points'] ?? ''),
    ),
    avec(
      el('div', 'grille large'),
      carte(
        Re.verdicts,
        empile(l, [
          [Re['juste'] ?? '', s('reponses.juste')],
          [Re['presque'] ?? '', s('reponses.presque')],
          [Re['faux'] ?? '', s('reponses.faux')],
        ]),
      ),
      carte(
        Re.trouvailles,
        barres(l, [
          [Re['artiste'] ?? '', s('trouve.artiste')],
          [Re['titre_'] ?? '', s('trouve.titre')],
          [Re['feat'] ?? '', s('trouve.feat')],
        ]),
      ),
      carte(
        Re.delais,
        barres(
          l,
          [...delais].sort((a, b) => Number.parseInt(a[0], 10) - Number.parseInt(b[0], 10)),
        ),
      ),
    ),
  );

  // La musique.
  const Mu = T.musique;
  const MC = Mu.colonnes;
  const imports: [string, number][] = (['deezer', 'spotify', 'autre', 'ok', 'prive', 'introuvable'] as const).map((cle) => [
    Mu.imports[cle] ?? cle,
    s(`bac.import.${cle}`),
  ]);
  const musique = partie(
    Mu.titre,
    avec(
      el('div', 'grille large'),
      carte(
        Mu.titres,
        tableau(
          [MC['titre'] ?? '', MC['joues'] ?? '', MC['trouves'] ?? ''],
          v.titres.joues
            .slice(0, P.lignes)
            .map((t) => [
              avec(el('span'), document.createTextNode(`${t.titre} `), el('span', 'second', t.artiste)),
              nombre(t.joues),
              pourcent(t.trouves, t.joues),
            ]),
        ),
      ),
      carte(
        Mu.durs,
        tableau(
          [MC['titre'] ?? '', MC['joues'] ?? '', MC['trouves'] ?? ''],
          v.titres.durs
            .slice(0, P.lignes)
            .map((t) => [
              avec(el('span'), document.createTextNode(`${t.titre} `), el('span', 'second', t.artiste)),
              nombre(t.joues),
              pourcent(t.trouves, t.joues),
            ]),
        ),
      ),
      carte(
        Mu.playlists,
        tableau(
          [MC['playlist'] ?? '', MC['choisies'] ?? '', MC['faces'] ?? ''],
          v.playlists.slice(0, P.lignes).map((p) => [p.titre ?? remplir(Mu.sansTitre, { lien: p.lien }), nombre(p.choisies), nombre(p.faces)]),
        ),
      ),
      carte(Mu.themes, barres(l, famille(l, 'bac.theme.'), l.textes.bac.themes)),
      carte(
        Mu.recherches,
        tableau(
          [MC['recherche'] ?? '', MC['fois'] ?? ''],
          v.recherches.slice(0, P.lignes).map((r) => [r.recherche, nombre(r.fois)]),
        ),
      ),
      carte(Mu.collees, barres(l, imports, {}, true)),
    ),
    avec(
      el('div', 'grille'),
      compte(l, 'bac.recherches', Mu.recherches),
      compte(l, 'bac.recherches.vides', Mu.vides),
      compte(l, 'playlists.changees', Mu.changees),
      compte(l, 'faces.rejouees', Mu.rejouees),
    ),
  );

  // Le partage et les arrivées.
  const Pa = T.partage;
  const partage = partie(
    Pa.titre,
    avec(
      el('div', 'grille'),
      compte(l, 'telephone.lienPartage', Pa['partages'] ?? ''),
      compte(l, 'telephone.lienCopie', Pa['copies'] ?? ''),
      compte(l, 'telephone.arriveeParQr', Pa['qr'] ?? ''),
      compte(l, 'telephone.arriveeParLien', Pa['lien'] ?? ''),
      compte(l, 'telephone.codeTape', Pa['code'] ?? ''),
      compte(l, 'refus.codeInconnu', Pa['codeInconnu'] ?? ''),
      compte(l, 'refus.complet', Pa['complet'] ?? ''),
      compte(l, 'refus.tropCourt', Pa['tropCourt'] ?? ''),
      compte(l, 'pages.room', Pa['pagesRoom'] ?? ''),
    ),
  );

  // Les appareils.
  const A = T.appareils;
  const appareils = partie(
    A.titre,
    avec(
      el('div', 'grille large'),
      carte(A.appareils, barres(l, famille(l, 'appareil.'), A.noms)),
      carte(A.navigateurs, barres(l, famille(l, 'navigateur.'), A.noms)),
      carte(A.systemes, barres(l, famille(l, 'systeme.'), A.noms)),
    ),
    avec(
      el('div', 'grille'),
      compte(l, 'telephone.ecranDAccueil', A.ecranDAccueil),
      compte(l, 'telephone.pleinEcran', A.pleinEcran),
      compte(l, 'telephone.sonBloque', A.sonBloque),
      compte(l, 'robots', A.robots),
    ),
  );

  // Les premiers pas.
  const Pp = T.premiersPas;
  const premiersPas = partie(
    Pp.titre,
    avec(
      el('div', 'grille'),
      compte(l, 'telephone.tutoVu', Pp['vu'] ?? ''),
      compte(l, 'telephone.tutoFini', Pp['fini'] ?? ''),
      compte(l, 'telephone.tutoPasse', Pp['passe'] ?? ''),
      compte(l, 'telephone.tutoRevu', Pp['revu'] ?? ''),
      compte(l, 'telephone.playlistAuHasard', Pp['hasard'] ?? ''),
    ),
  );

  // Quand on vient.
  const Q = T.quand;
  const heures = v.heures.map((_, h) => String(h));
  const quand = partie(
    Q.titre,
    avec(el('div', 'grille large'), histogramme(l, Q.heures, v.heures, heures), histogramme(l, Q.jours, v.semaine, Q.semaine)),
  );

  // Les comptes.
  const Co = T.comptes;
  const refuses = s('comptes.refus.adresse') + s('comptes.refus.tropDeLiens') + s('comptes.refus.comptesFermes');
  const comptes = partie(
    Co.titre,
    avec(
      el('div', 'grille'),
      v.enDirect.comptes !== undefined && tuile(l, nombre(v.enDirect.comptes), Co['existants'] ?? '', { classe: 'miel' }),
      compte(l, 'comptes.cree', Co['crees'] ?? ''),
      compte(l, 'comptes.entree', Co['entrees'] ?? ''),
      compte(l, 'comptes.reprise', Co['reprises'] ?? ''),
      compte(l, 'comptes.lienDemande', Co['demandes'] ?? ''),
      compte(l, 'comptes.lienEnvoye', Co['envoyes'] ?? ''),
      tuile(l, nombre(refuses), Co['refuses'] ?? ''),
      compte(l, 'comptes.lienPerime', Co['perimes'] ?? ''),
      compte(l, 'comptes.sortie', Co['sorties'] ?? ''),
      compte(l, 'comptes.efface', Co['effaces'] ?? ''),
    ),
  );

  // Les records.
  const Rc = T.records;
  const lesRecords = Object.entries(v.records);
  const enDuree: ReadonlySet<string> = new Set(['plusLongueFace']);
  const records = partie(
    Rc.titre,
    lesRecords.length === 0
      ? el('p', 'vide', Rc.aucun)
      : avec(
          el('div', 'grille'),
          ...lesRecords.map(([cle, r]) =>
            tuile(l, enDuree.has(cle) ? duree(r.valeur) : nombre(r.valeur), Rc[cle] ?? cle, { detail: remplir(Rc.le, { jour: jour(r.le, true) }) }),
          ),
        ),
  );

  return [enDirect, essentiel, jourParJour, lesModes, reglages, joueurs, reponses, musique, partage, appareils, premiersPas, quand, comptes, records];
}

/** La clé : dans l'adresse (« #cle=… ») la première fois, qu'on garde et qu'on efface de l'adresse ; sinon celle qu'on a gardée. */
function laCle(): string | undefined {
  const dansLAdresse = /^#cle=([A-Za-z0-9_-]{16,128})$/.exec(window.location.hash)?.[1];
  if (dansLAdresse !== undefined) {
    try {
      window.localStorage.setItem(P.cle, dansLAdresse);
    } catch {
      // Un navigateur qui ne garde rien : la clé servira le temps de la page.
    }
    window.history.replaceState(null, '', window.location.pathname);
    return dansLAdresse;
  }
  try {
    return window.localStorage.getItem(P.cle) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Oublie la clé gardée : elle n'est plus la bonne. */
function oublierLaCle(): void {
  try {
    window.localStorage.removeItem(P.cle);
  } catch {
    // Rien à oublier.
  }
}

/** Ouvre la page des statistiques dans ce cadre. */
export function ouvrirLesStatistiques(cadre: HTMLElement, textes: Textes): void {
  const T = textes.statistiques;
  const e = ecritoire(textes);
  const cle = laCle();
  let periode: Periode = 'semaine';
  let v: VueDesStatistiques | undefined;

  function fermee(): void {
    oublierLaCle();
    while (cadre.firstChild !== null) cadre.firstChild.remove();
    cadre.append(avec(el('div', 'fermee'), el('h1', undefined, T.fermee.titre), el('p', undefined, T.fermee.texte)));
  }

  function montrer(): void {
    if (v === undefined) return;
    const l: Lecture = { v, periode, e, textes };
    const choix = el('div', 'periodes');
    choix.setAttribute('role', 'group');
    for (const p of PERIODES) {
      const bouton = el('button', undefined, T.periodes[p] ?? p);
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', String(p === periode));
      bouton.addEventListener('click', () => {
        periode = p;
        montrer();
      });
      choix.append(bouton);
    }
    const entete = avec(el('header'), avec(el('div'), el('h1', undefined, T.titre), el('p', undefined, remplir(T.aJour, { heure: v.heure }))), choix);
    const pied = avec(
      el('footer'),
      v.depuis !== undefined ? el('p', undefined, remplir(T.depuis, { jour: e.jour(v.depuis, true) })) : undefined,
      el('p', undefined, T.rienDePersonnel),
    );
    while (cadre.firstChild !== null) cadre.firstChild.remove();
    avec(cadre, entete, ...parties(l), pied);
  }

  /** Demande les statistiques à son serveur, avec la clé : un refus ferme la page ; un serveur qui ne répond pas, on réessaiera. */
  function relire(): void {
    if (cle === undefined) return fermee();
    const requete = new XMLHttpRequest();
    requete.open('GET', ADRESSES_DES_STATISTIQUES.donnees);
    requete.setRequestHeader('Authorization', `Bearer ${cle}`);
    requete.responseType = 'json';
    requete.addEventListener('load', () => {
      if (requete.status === STATUT_REFUSE) return fermee();
      if (requete.status !== STATUT_OK || requete.response === null) return;
      v = requete.response as VueDesStatistiques;
      montrer();
    });
    requete.send();
  }

  relire();
  window.setInterval(relire, RELIRE);
}

/** Ce que répond le serveur quand il donne les statistiques. */
const STATUT_OK = 200;

/** Ce que répond le serveur à qui n'a pas la bonne clé. */
const STATUT_REFUSE = 401;
