/**
 * Les statistiques du site, pour son éditeur seul : ce qui s'y passe, compté, jamais qui. Des compteurs, depuis toujours et jour
 * par jour (treize mois), l'heure et le jour de la semaine où l'on vient, quelques classements (les titres joués, les playlists
 * prises, ce qu'on cherche dans le bac) et des records. Aucune donnée personnelle : ni adresse IP, ni nom d'artiste, ni e-mail,
 * ni ce qu'on répond. Pour compter les visiteurs d'un jour sans rien garder d'eux, une empreinte de leur adresse et de leur
 * navigateur, salée d'un sel du jour qui ne s'écrit nulle part, vit en mémoire jusqu'au lendemain, puis s'oublie. Le tout se garde
 * dans un fichier, réécrit de temps en temps (voir index.ts) ; la page des statistiques le lit (voir ecran/statistiques).
 */

import { createHash } from 'node:crypto';
import type { CeQueLeTelephoneCompte } from '../regles/messages';
import type { Compteurs, EnDirect, Exploit, PlaylistComptee, TitreCompte, VueDesStatistiques } from '../regles/statistiques';
import { RESEAU } from '../ressources/reseau';
import type { FaitDuJeu } from '../serveur/faits';
import type { InstantLocal } from './horloge';

const S = RESEAU.statistiques;

/** Ce qui se garde dans le fichier. */
interface Donnees {
  depuis: string | undefined;
  totaux: Compteurs;
  jours: Record<string, Compteurs>;
  heures: number[];
  semaine: number[];
  titres: Record<string, TitreCompte>;
  playlists: Record<string, PlaylistComptee>;
  recherches: Record<string, number>;
  records: Record<string, Exploit>;
}

/** Ce que le réseau compte de lui-même : les comptes, les imports de playlists. */
export type CleDuReseau =
  | 'comptes.lienDemande'
  | 'comptes.lienEnvoye'
  | 'comptes.refus.adresse'
  | 'comptes.refus.tropDeLiens'
  | 'comptes.refus.comptesFermes'
  | 'comptes.entree'
  | 'comptes.cree'
  | 'comptes.lienPerime'
  | 'comptes.reprise'
  | 'comptes.sortie'
  | 'comptes.efface'
  | 'comptes.motDePasse.entree'
  | 'comptes.motDePasse.faux'
  | 'comptes.motDePasse.tropDEssais'
  | 'comptes.motDePasse.comptesFermes'
  | 'comptes.motDePasse.choisi'
  | 'comptes.motDePasse.faible'
  | 'bac.import.deezer'
  | 'bac.import.spotify'
  | 'bac.import.autre'
  | 'bac.import.ok'
  | 'bac.import.tropCourt'
  | 'bac.import.introuvable';

export interface OptionsDesStatistiques {
  /** Ce qu'on avait gardé (le contenu du fichier), et de quoi le garder quand ça change. */
  readonly lu: string | undefined;
  readonly garder: (texte: string) => void;
  /** L'heure du monde, en secondes depuis 1970, et ce qu'elle est à l'heure de ceux qui jouent. */
  readonly monde: () => number;
  readonly local: (secondes: number) => InstantLocal;
  /** Les jours du calendrier, de l'un à l'autre compris. */
  readonly joursDu: (du: string, au: string) => readonly { readonly jour: string; readonly semaine: number }[];
  /** Un sel neuf, impossible à deviner : celui d'un jour, pour reconnaître un visiteur ce jour-là sans rien garder de lui. */
  readonly sel: () => string;
}

export interface Statistiques {
  /**
   * Une page du jeu servie : d'où (une adresse, qu'on ne garde pas), à quel navigateur, à l'accueil ou à l'adresse d'une room. Un
   * navigateur qui demande à ne pas être suivi (Global Privacy Control, Do Not Track) compte une page, jamais un visiteur : on ne
   * calcule pas son empreinte, on ne lit pas son appareil.
   */
  page(adresse: string, navigateur: string, room: boolean, sansSuivi?: boolean): void;
  /** Une ligne s'ouvre (un téléphone se branche) ; ce qu'on rend s'appelle quand elle se ferme. */
  ligne(): () => void;
  /** Le nombre de téléphones branchés, à cet instant : de quoi tenir le record. */
  telephones(combien: number): void;
  /** Ce que raconte le serveur du jeu. */
  jeu(fait: FaitDuJeu): void;
  /** Ce que le réseau compte de lui-même. */
  compter(cle: CleDuReseau): void;
  /** Ce que seul un téléphone voit, et qu'il dit : chaque chose une fois par ligne au plus (voir ligne.ts). */
  telephone(quoi: CeQueLeTelephoneCompte): void;
  /**
   * Une recherche dans le bac : ce qu'on a cherché (ou le thème touché), et combien de playlists elle a trouvées. On ne garde le
   * texte d'une recherche que si elle a trouvé de la musique : tapé pour rien, il pourrait être n'importe quoi.
   */
  recherche(recherche: string, theme: string | undefined, trouvees: number): void;
  /** Des playlists que la source a nommées (une recherche, un lien collé) : on retient leur titre, pour les montrer. */
  playlistsNommees(playlists: readonly { readonly lien: string; readonly titre: string }[]): void;
  /** Ce que la page montre, avec ce qui se passe en ce moment. */
  vue(enDirect: EnDirect): VueDesStatistiques;
  /** Écrit ce qui a changé depuis la dernière fois (rien, si rien n'a changé). */
  garder(): void;
}

/** Une heure, un jour : 24 heures, 7 jours. */
const HEURES = 24;
const JOURS_DE_LA_SEMAINE = 7;
/** Combien on garde d'une empreinte de visiteur : de quoi ne pas se tromper de l'un à l'autre, rien de plus. */
const EMPREINTE = 16;

const DONNEES_VIDES = (): Donnees => ({
  depuis: undefined,
  totaux: {},
  jours: {},
  heures: Array.from({ length: HEURES }, () => 0),
  semaine: Array.from({ length: JOURS_DE_LA_SEMAINE }, () => 0),
  titres: {},
  playlists: {},
  recherches: {},
  records: {},
});

const estUnObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const estUnNombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Des compteurs relus : seulement des nombres. */
const compteursLus = (x: unknown): Compteurs =>
  estUnObjet(x) ? Object.fromEntries(Object.entries(x).filter((e): e is [string, number] => estUnNombre(e[1]))) : {};

/** Ce qu'on a lu du fichier, s'il en est un : ce qu'on y reconnaît, le reste à zéro. */
function relire(texte: string | undefined): Donnees {
  const vide = DONNEES_VIDES();
  let lu: unknown;
  try {
    lu = texte !== undefined ? JSON.parse(texte) : undefined;
  } catch {
    lu = undefined;
  }
  if (!estUnObjet(lu)) return vide;
  const tableau = (x: unknown, longueur: number): number[] =>
    Array.from({ length: longueur }, (_, rang) => (Array.isArray(x) && estUnNombre(x[rang]) ? (x[rang] as number) : 0));
  const parCle = <T>(x: unknown, lire: (v: Record<string, unknown>) => T | undefined): Record<string, T> =>
    estUnObjet(x)
      ? Object.fromEntries(
          Object.entries(x).flatMap(([cle, v]) => {
            const lue = estUnObjet(v) ? lire(v) : undefined;
            return lue !== undefined ? [[cle, lue]] : [];
          }),
        )
      : {};
  return {
    depuis: typeof lu['depuis'] === 'string' ? lu['depuis'] : undefined,
    totaux: compteursLus(lu['totaux']),
    jours: estUnObjet(lu['jours']) ? Object.fromEntries(Object.entries(lu['jours']).map(([jour, c]) => [jour, compteursLus(c)])) : {},
    heures: tableau(lu['heures'], HEURES),
    semaine: tableau(lu['semaine'], JOURS_DE_LA_SEMAINE),
    titres: parCle(lu['titres'], (v) =>
      typeof v['titre'] === 'string' && typeof v['artiste'] === 'string' && estUnNombre(v['joues']) && estUnNombre(v['trouves'])
        ? { titre: v['titre'], artiste: v['artiste'], joues: v['joues'], trouves: v['trouves'] }
        : undefined,
    ),
    playlists: parCle(lu['playlists'], (v) =>
      estUnNombre(v['choisies']) && estUnNombre(v['faces'])
        ? { ...(typeof v['titre'] === 'string' ? { titre: v['titre'] } : {}), choisies: v['choisies'], faces: v['faces'] }
        : undefined,
    ),
    recherches: compteursLus(lu['recherches']),
    records: parCle(lu['records'], (v) =>
      estUnNombre(v['valeur']) && typeof v['le'] === 'string' ? { valeur: v['valeur'], le: v['le'] } : undefined,
    ),
  };
}

/** Le genre d'appareil d'un navigateur, d'après ce qu'il dit de lui. */
function appareilDe(ua: string): string {
  if (/iPhone|iPod/.test(ua)) return 'iphone';
  if (/iPad/.test(ua)) return 'ipad';
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'android' : 'tablette';
  return 'ordinateur';
}

/** Le navigateur : l'application qui ouvre le lien (Instagram, WhatsApp…) avant le navigateur qu'elle emprunte. */
function navigateurDe(ua: string): string {
  if (/Instagram|FBAN|FBAV|FB_IAB|Snapchat|WhatsApp|TikTok|musical_ly|Line\/|Twitter|LinkedInApp|Discord|Messenger/i.test(ua)) return 'appli';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/EdgA?\/|EdgiOS/.test(ua)) return 'edge';
  if (/OPR\/|Opera|OPiOS/.test(ua)) return 'opera';
  if (/Firefox|FxiOS/.test(ua)) return 'firefox';
  if (/CriOS|Chrome|Chromium/.test(ua)) return 'chrome';
  if (/Safari/.test(ua)) return 'safari';
  return 'autre';
}

/** Le système de l'appareil. */
function systemeDe(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macos';
  if (/CrOS/.test(ua)) return 'chromeos';
  if (/Linux/.test(ua)) return 'linux';
  return 'autre';
}

/** Une recherche telle qu'on la range : en minuscules, les espaces resserrées, coupée court. */
const rechercheRangee = (recherche: string): string => [...recherche.trim().toLowerCase().replace(/\s+/g, ' ')].slice(0, S.rechercheAuPlus).join('');

/** La tranche d'un délai, en secondes, où la première bonne réponse d'une piste est arrivée. */
function trancheDuDelai(secondes: number): string {
  const bornes = [3, 6, 10, 15, 20];
  const borne = bornes.find((b) => secondes < b);
  return borne === undefined ? `${bornes[bornes.length - 1] ?? 0}+` : `${bornes[bornes.indexOf(borne) - 1] ?? 0}-${borne}`;
}

/** Ne garde, d'un classement qui déborde, que ce qui compte le plus. */
function elaguer<T>(classement: Record<string, T>, auPlus: number, poids: (t: T) => number): Record<string, T> {
  const entrees = Object.entries(classement);
  if (entrees.length <= auPlus) return classement;
  return Object.fromEntries(entrees.sort((a, b) => poids(b[1]) - poids(a[1])).slice(0, auPlus));
}

export function ouvrirLesStatistiques(o: OptionsDesStatistiques): Statistiques {
  const d = relire(o.lu);
  let change = false;
  /** Le sel du jour, et les empreintes des visiteurs de ce jour : en mémoire seulement. */
  let jourDuSel = '';
  let sel = '';
  const vus = new Set<string>();
  /** Les rooms ouvertes en ce moment, par leur code : de quoi tenir le record des rooms en même temps. */
  const ouvertes = new Set<string>();

  const maintenant = (): InstantLocal => o.local(o.monde());

  /** Ajoute à un compteur, aujourd'hui et depuis toujours. */
  function ajouter(cle: string, combien = 1): void {
    const { jour } = maintenant();
    d.depuis ??= jour;
    d.totaux[cle] = (d.totaux[cle] ?? 0) + combien;
    const duJour = (d.jours[jour] ??= {});
    duJour[cle] = (duJour[cle] ?? 0) + combien;
    change = true;
  }
  /** Bat un record, s'il y a lieu. */
  function record(cle: string, valeur: number): void {
    const avant = d.records[cle];
    if (avant !== undefined && avant.valeur >= valeur) return;
    d.records[cle] = { valeur, le: maintenant().jour };
    change = true;
  }
  /** Les jours trop vieux s'oublient. */
  function oublierLesVieuxJours(): void {
    const jours = Object.keys(d.jours).sort();
    for (const jour of jours.slice(0, Math.max(0, jours.length - S.jours))) delete d.jours[jour];
  }

  function jeu(f: FaitDuJeu): void {
    if (f.genre === 'refus') {
      ajouter(`refus.${f.raison}`);
      return;
    }
    const mode = `mode.${f.mode}`;
    switch (f.genre) {
      case 'ouverte': {
        ajouter('rooms');
        ajouter(`rooms.${mode}`);
        ajouter(`rooms.pistes.${f.pistes}`);
        ajouter(`rooms.extrait.${f.extrait}`);
        ajouter(`rooms.son.${f.son}`);
        const p = d.playlists[f.playlist];
        d.playlists[f.playlist] = { ...p, choisies: (p?.choisies ?? 0) + 1, faces: p?.faces ?? 0 };
        ouvertes.add(f.room);
        record('roomsEnMemeTemps', ouvertes.size);
        return;
      }
      case 'arrivee':
        ajouter('joueurs');
        ajouter(`joueurs.${mode}`);
        if (f.spectateur) ajouter('joueurs.spectateurs');
        record('joueursDansUneRoom', f.joueurs);
        return;
      case 'retour':
        ajouter('retours');
        return;
      case 'deconnexion':
        ajouter('deconnexions');
        return;
      case 'depart':
        ajouter('departs');
        return;
      case 'lancer':
        ajouter('pistes.lancees');
        if (f.numero !== 1) return;
        ajouter('parties');
        ajouter(`parties.${mode}`);
        ajouter(`parties.face.${f.face}`);
        return;
      case 'extrait':
        ajouter('extraits');
        return;
      case 'reponse': {
        ajouter('reponses');
        ajouter(`reponses.${f.verdict}`);
        ajouter(`reponses.${mode}`);
        for (const partie of f.trouve) ajouter(`trouve.${partie}`);
        if (f.complet) ajouter('reponses.complet');
        if (f.points > 0) ajouter('points', f.points);
        if (!f.premiere) return;
        ajouter('premieres');
        ajouter('delai.premieres', f.delai);
        ajouter(`delai.${trancheDuDelai(f.delai)}`);
        return;
      }
      case 'revelation': {
        ajouter('pistes.revelees');
        ajouter(`pistes.revelees.${mode}`);
        ajouter(f.trouvee ? 'pistes.trouvees' : 'pistes.personne');
        ajouter('trouveurs', f.trouveurs);
        ajouter('trouveurs.joueurs', f.joueurs);
        const cle = `${f.artiste}\u0000${f.titre}`.toLowerCase();
        const t = d.titres[cle];
        d.titres[cle] = { titre: f.titre, artiste: f.artiste, joues: (t?.joues ?? 0) + 1, trouves: (t?.trouves ?? 0) + (f.trouvee ? 1 : 0) };
        if (Object.keys(d.titres).length > S.gardes.titres * 2) d.titres = elaguer(d.titres, S.gardes.titres, (x) => x.joues);
        return;
      }
      case 'faceFinie': {
        ajouter('faces');
        ajouter(`faces.${mode}`);
        ajouter(`faces.face.${f.face}`);
        ajouter(`faces.joueurs.${f.joueurs}`);
        ajouter('duree.faces', f.duree);
        ajouter(`duree.faces.${mode}`, f.duree);
        const p = d.playlists[f.playlist];
        d.playlists[f.playlist] = { ...p, choisies: p?.choisies ?? 0, faces: (p?.faces ?? 0) + 1 };
        record('plusLongueFace', Math.round(f.duree));
        record('meilleurScore', f.meilleur);
        record('joueursDansUneFace', f.joueurs);
        return;
      }
      case 'rejouer':
        ajouter('faces.rejouees');
        return;
      case 'autrePlaylist': {
        ajouter('playlists.changees');
        const p = d.playlists[f.playlist];
        d.playlists[f.playlist] = { ...p, choisies: (p?.choisies ?? 0) + 1, faces: p?.faces ?? 0 };
        return;
      }
      case 'fermee':
        ouvertes.delete(f.room);
        ajouter('rooms.fermees');
        ajouter('duree.rooms', f.duree);
        ajouter(`rooms.joueurs.${f.joueursAuPlus}`);
        if (!f.lancee) ajouter('rooms.sansPartie');
        return;
    }
  }

  return {
    page(adresse, navigateur, room, sansSuivi = false) {
      if (S.robots.test(navigateur)) {
        ajouter('robots');
        return;
      }
      const ici = maintenant();
      ajouter('pages');
      ajouter(room ? 'pages.room' : 'pages.accueil');
      d.heures[ici.heure] = (d.heures[ici.heure] ?? 0) + 1;
      d.semaine[ici.semaine] = (d.semaine[ici.semaine] ?? 0) + 1;
      if (sansSuivi) {
        ajouter('pages.sansSuivi');
        return;
      }
      // Un autre jour : un autre sel, et l'on oublie qui on avait vu hier.
      if (ici.jour !== jourDuSel) {
        jourDuSel = ici.jour;
        sel = o.sel();
        vus.clear();
        oublierLesVieuxJours();
      }
      const empreinte = createHash('sha256').update(`${sel}\u0000${adresse}\u0000${navigateur}`).digest('base64url').slice(0, EMPREINTE);
      if (vus.has(empreinte)) return;
      vus.add(empreinte);
      ajouter('visiteurs');
      ajouter(`appareil.${appareilDe(navigateur)}`);
      ajouter(`navigateur.${navigateurDe(navigateur)}`);
      ajouter(`systeme.${systemeDe(navigateur)}`);
    },
    ligne() {
      ajouter('lignes');
      const debut = o.monde();
      return () => {
        ajouter('lignes.finies');
        ajouter('duree.lignes', Math.max(0, o.monde() - debut));
      };
    },
    telephones(combien) {
      record('telephonesEnMemeTemps', combien);
    },
    jeu,
    compter(cle) {
      ajouter(cle);
    },
    telephone(quoi) {
      ajouter(`telephone.${quoi}`);
    },
    recherche(recherche, theme, trouvees) {
      ajouter('bac.recherches');
      if (trouvees === 0) ajouter('bac.recherches.vides');
      if (theme !== undefined) {
        ajouter(`bac.theme.${theme}`);
        return;
      }
      ajouter('bac.recherches.libres');
      const rangee = rechercheRangee(recherche);
      if (rangee === '' || trouvees === 0) return;
      d.recherches[rangee] = (d.recherches[rangee] ?? 0) + 1;
      if (Object.keys(d.recherches).length > S.gardes.recherches * 2) d.recherches = elaguer(d.recherches, S.gardes.recherches, (n) => n);
    },
    playlistsNommees(playlists) {
      for (const { lien, titre } of playlists) {
        const p = d.playlists[lien];
        if (p?.titre === titre) continue;
        d.playlists[lien] = { titre, choisies: p?.choisies ?? 0, faces: p?.faces ?? 0 };
        change = true;
      }
      if (Object.keys(d.playlists).length > S.gardes.playlists * 2) d.playlists = elaguer(d.playlists, S.gardes.playlists, (p) => p.choisies);
    },
    vue(enDirect) {
      const ici = maintenant();
      const debut = Object.keys(d.jours).sort()[0] ?? ici.jour;
      const calendrier = o.joursDu(debut, ici.jour);
      const jours = calendrier
        .slice(Math.max(0, calendrier.length - S.montres))
        .map(({ jour, semaine }) => ({ jour, semaine, compteurs: d.jours[jour] ?? {} }));
      const titres = Object.values(d.titres);
      return {
        aujourdhui: ici.jour,
        heure: `${String(ici.heure).padStart(2, '0')}:${String(ici.minute).padStart(2, '0')}`,
        depuis: d.depuis,
        enDirect,
        totaux: d.totaux,
        jours,
        heures: d.heures,
        semaine: d.semaine,
        titres: {
          joues: [...titres].sort((a, b) => b.joues - a.joues || b.trouves - a.trouves).slice(0, S.classes.titres),
          durs: titres
            .filter((t) => t.joues >= S.durAuMoins)
            .sort((a, b) => a.trouves / a.joues - b.trouves / b.joues || b.joues - a.joues)
            .slice(0, S.classes.durs),
        },
        playlists: Object.entries(d.playlists)
          .filter(([, p]) => p.choisies > 0)
          .sort((a, b) => b[1].choisies - a[1].choisies || b[1].faces - a[1].faces)
          .slice(0, S.classes.playlists)
          .map(([lien, p]) => ({ lien, ...p })),
        recherches: Object.entries(d.recherches)
          .sort((a, b) => b[1] - a[1])
          .slice(0, S.classes.recherches)
          .map(([recherche, fois]) => ({ recherche, fois })),
        records: d.records,
      };
    },
    garder() {
      if (!change) return;
      change = false;
      oublierLesVieuxJours();
      o.garder(JSON.stringify(d));
    },
  };
}
