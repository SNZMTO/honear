/**
 * Les comptes, facultatifs : ce qu'un joueur garde d'un téléphone à l'autre, sa pochette et ses scores, sous son adresse e-mail,
 * et rien d'autre. On entre par un lien envoyé à son adresse, qui ne sert qu'une fois, un quart d'heure (c'est ainsi qu'un compte
 * se crée, et qu'on retrouve le sien sans mot de passe) ; ou, si on en a choisi un, avec son mot de passe. Le téléphone reçoit alors
 * le secret d'une session, qu'il garde pour revenir. Le serveur ne garde de ces secrets que leur empreinte, et du mot de passe
 * qu'une empreinte lente et salée : qui lirait son fichier n'entrerait dans aucun compte. Les liens et les essais vivent en
 * mémoire ; les comptes et les sessions, dans un fichier, réécrit en entier quand ils changent (ils sont peu). On limite les envois
 * (par adresse, par téléphone, par jour) et les essais de mot de passe (par compte, par téléphone). Changer de mot de passe fait
 * sortir les autres sessions, et une lettre prévient l'adresse du compte. Un compte dont personne ne se sert pendant deux ans
 * s'efface tout seul ; un mois avant, une lettre prévient son adresse.
 */

import type { CompteVu } from '../regles/messages';
import { jugerUnMotDePasse } from '../regles/mot-de-passe';
import { estUnePochette } from '../regles/pochette';
import { PALETTE } from '../ressources/palette';
import type { Pochette } from '../ressources/pochettes';
import { RESEAU } from '../ressources/reseau';
import type { Textes } from '../ressources/textes';
import type { Lettre, Poster } from './courrier';

export interface OptionsDesComptes {
  /** L'heure du monde, en secondes depuis 1970 : une session dure d'un démarrage du serveur à l'autre. */
  readonly monde: () => number;
  /** Un secret neuf, impossible à deviner (celui d'un lien, d'une session), et un identifiant de compte neuf. */
  readonly secret: () => string;
  readonly identifiant: () => string;
  /** L'empreinte d'un secret : ce que le serveur en garde. */
  readonly empreinte: (secret: string) => string;
  /** L'empreinte d'un mot de passe (lente, salée), et la vérification d'un mot de passe contre l'une d'elles. */
  readonly hacher: (motDePasse: string) => Promise<string>;
  readonly verifier: (motDePasse: string, empreinte: string) => Promise<boolean>;
  /** Ce qu'on avait gardé (le contenu du fichier : s'il ne se relit pas en entier, rien ne s'ouvre), et de quoi le garder quand ça change. */
  readonly lu: string | undefined;
  readonly garder: (texte: string) => void;
  /** De quoi envoyer une lettre ; rien : le site n'envoie pas d'e-mails, ses comptes sont fermés. */
  readonly poster: Poster | undefined;
  /** La lettre qui porte un lien de connexion, à cette adresse. */
  readonly lettre: (email: string, lien: string) => Lettre;
  /** La lettre qui prévient un compte qui dort qu'il va être effacé ; rien : on efface sans prévenir. */
  readonly avertissement?: (email: string) => Lettre;
  /** La lettre qui dit à l'adresse d'un compte que son mot de passe vient de changer ; rien : on ne prévient pas. */
  readonly avisDuMotDePasse?: (email: string) => Lettre;
}

/** Ce qu'on peut répondre à qui demande un lien. */
export type EnvoiDuLien = 'envoye' | 'adresse' | 'tropDeLiens' | 'comptesFermes';

/** Ce qu'on peut répondre à qui entre avec un mot de passe : son compte et sa session ; ou faux (sans dire quoi), ou trop d'essais. */
export type EntreeParMotDePasse = (CompteOuvert & { readonly session: string }) | 'faux' | 'tropDEssais';

/** Ce qu'on peut répondre à qui choisit un mot de passe : gardé ; trop faible ; trop de changements ; ou il n'y a plus de compte. */
export type ChoixDuMotDePasse = 'garde' | 'faible' | 'tropDEssais' | 'horsCompte';

/** Un compte ouvert sur un téléphone : son identifiant (que le serveur garde pour lui), et ce que le téléphone en voit. */
export interface CompteOuvert {
  readonly id: string;
  readonly compte: CompteVu;
}

export interface Comptes {
  /** Envoie un lien de connexion à cette adresse, demandé depuis ce téléphone (son adresse sur le réseau). */
  demanderUnLien(email: string, depuis: string): Promise<EnvoiDuLien>;
  /** Le lien touché : le compte (créé s'il n'existait pas), et le secret d'une session neuve ; rien si le lien ne marche plus. */
  ouvrir(lien: string): (CompteOuvert & { readonly session: string }) | undefined;
  /**
   * On entre avec son adresse et son mot de passe, depuis ce téléphone (son adresse sur le réseau) : le compte et une session neuve.
   * Une adresse sans compte, ou sans mot de passe, répond « faux », dans le même temps : on n'apprend pas qui a un compte.
   */
  entrer(email: string, motDePasse: string, depuis: string): Promise<EntreeParMotDePasse>;
  /** Le compte choisit un mot de passe, ou en change, depuis cette session : ses autres sessions sont oubliées, son adresse prévenue. */
  choisirUnMotDePasse(id: string, motDePasse: string, session: string): Promise<ChoixDuMotDePasse>;
  /** Un téléphone revient avec sa session : son compte, s'il l'a toujours. */
  reprendre(session: string): CompteOuvert | undefined;
  /** Il sort : sa session est oubliée. */
  sortir(session: string): void;
  /** Le compte est effacé, avec toutes ses sessions. */
  effacer(id: string): void;
  garderLaPochette(id: string, pochette: Pochette): void;
  /** Ce joueur, à cette place d'une room, joue sous ce compte. */
  attacher(code: string, joueur: string, id: string): void;
  /** Une face finie dans cette room : chacun de ceux qui y jouaient sous un compte compte une partie, et une victoire s'il l'a finie premier. */
  faceFinie(code: string, classement: readonly { readonly joueur: string; readonly premier: boolean }[]): void;
  /** Ce que le téléphone voit d'un compte. */
  vu(id: string): CompteVu | undefined;
  /** Combien de comptes existent : pour les statistiques, rien de plus. */
  nombre(): number;
  /** Le ménage : efface les comptes qui dorment depuis trop longtemps, et prévient ceux qui vont l'être. */
  entretenir(): Promise<void>;
  /**
   * Oublie ce qui ne compte plus : les liens périmés, et les adresses (e-mail, IP) des envois et des essais d'il y a plus d'une
   * heure (d'un quart d'heure, pour les essais par compte). La ligne n'en garde rien de plus.
   */
  oublier(): void;
}

interface CompteGarde {
  readonly id: string;
  readonly email: string;
  readonly creeLe: number;
  readonly pochette?: Pochette;
  readonly parties: number;
  readonly victoires: number;
  /** La dernière fois qu'on y est entré ou revenu ; sans elle, sa création. */
  readonly vuLe?: number;
  /** Quand on a prévenu son adresse qu'il allait être effacé, s'il dort depuis. */
  readonly prevenuLe?: number;
  /** L'empreinte de son mot de passe, s'il en a choisi un (voir mots-de-passe.ts) ; jamais le mot de passe. */
  readonly motDePasse?: string;
}

interface SessionGardee {
  readonly empreinte: string;
  readonly compte: string;
  readonly jusqua: number;
}

/**
 * Une adresse e-mail, telle qu'on la garde : sans espace autour, en minuscules ; rien si ce n'en est pas une (une partie locale,
 * une arobase, un domaine à points, rien qui puisse casser une ligne d'en-tête).
 */
export function adresseEmail(tape: string): string | undefined {
  const email = tape.trim().toLowerCase();
  const forme = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
  return email.length <= 254 && forme.test(email) && !email.includes('..') ? email : undefined;
}

/** La version du fichier qu'on écrit : la seule qu'on sache relire. */
const VERSION_DU_FICHIER = 1;

/**
 * Ce qu'on a lu du fichier : les comptes et les sessions ; ou, s'il ne se lit pas en entier, pourquoi, sans rien de ce qu'il contient.
 * Pas du JSON (un fichier coupé en route), pas la forme qu'on écrit, une autre version, une entrée qu'on ne reconnaît pas : le
 * réécrire, ce serait perdre ce qu'on n'a pas su y lire.
 */
function relire(texte: string | undefined): { comptes: CompteGarde[]; sessions: SessionGardee[] } | string {
  if (texte === undefined) return { comptes: [], sessions: [] };
  let lu: unknown;
  try {
    lu = JSON.parse(texte);
  } catch {
    return 'ce n’est pas du JSON';
  }
  const objet = typeof lu === 'object' && lu !== null && !Array.isArray(lu) ? (lu as Record<string, unknown>) : undefined;
  const entrees = { comptes: objet?.['comptes'] ?? [], sessions: objet?.['sessions'] ?? [] };
  if (objet === undefined || !Array.isArray(entrees.comptes) || !Array.isArray(entrees.sessions)) return 'ce n’est pas un fichier de comptes';
  if (objet['version'] !== undefined && objet['version'] !== VERSION_DU_FICHIER) return 'il est d’une autre version';
  const comptes = (entrees.comptes as unknown[]).flatMap((x): CompteGarde[] => {
    const c = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
    const { id, email, creeLe, pochette, parties, victoires, vuLe, prevenuLe, motDePasse } = c;
    if (typeof id !== 'string' || typeof email !== 'string' || typeof creeLe !== 'number') return [];
    return [
      {
        id,
        email,
        creeLe,
        ...(estUnePochette(pochette) ? { pochette } : {}),
        parties: typeof parties === 'number' ? parties : 0,
        victoires: typeof victoires === 'number' ? victoires : 0,
        ...(typeof vuLe === 'number' ? { vuLe } : {}),
        ...(typeof prevenuLe === 'number' ? { prevenuLe } : {}),
        ...(typeof motDePasse === 'string' && motDePasse !== '' ? { motDePasse } : {}),
      },
    ];
  });
  const sessions = (entrees.sessions as unknown[]).flatMap((x): SessionGardee[] => {
    const s = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
    const { empreinte, compte, jusqua } = s;
    return typeof empreinte === 'string' && typeof compte === 'string' && typeof jusqua === 'number' ? [{ empreinte, compte, jusqua }] : [];
  });
  const ecartees = entrees.comptes.length - comptes.length + (entrees.sessions.length - sessions.length);
  return ecartees > 0 ? `${ecartees} entrée${ecartees > 1 ? 's' : ''} qu’on ne reconnaît pas` : { comptes, sessions };
}

/** Une heure, un jour, en secondes. */
const UNE_HEURE = 3600;
const UN_JOUR = 86400;
/** Combien de places de room on se souvient au plus : de quoi compter les scores des parties en cours. */
const PLACES_AU_PLUS = 20000;

/**
 * Ouvre les comptes, d'après ce qu'on avait gardé. Un fichier qu'on ne sait pas lire en entier ne s'ouvre pas : l'erreur dit pourquoi,
 * sans rien de ce qu'il contient, et rien ne le réécrit.
 */
export function ouvrirLesComptes(o: OptionsDesComptes): Comptes {
  const C = RESEAU.comptes;
  const lus = relire(o.lu);
  if (typeof lus === 'string') throw new Error(`Le fichier des comptes est illisible : ${lus}`);
  const comptes = new Map(lus.comptes.map((c) => [c.id, c]));
  const sessions = new Map(lus.sessions.map((s) => [s.empreinte, s]));
  /** Les liens envoyés, par leur empreinte : l'adresse où ils sont partis, et jusqu'à quand ils marchent. */
  const liens = new Map<string, { readonly email: string; readonly jusqua: number }>();
  /** Les heures des derniers envois, par adresse e-mail, par téléphone, et en tout aujourd'hui. */
  const envois = { parEmail: new Map<string, number[]>(), parTelephone: new Map<string, number[]>(), jour: -1, duJour: 0 };
  /** Qui joue sous quel compte, par place de room (« CODE/identifiant du joueur »). */
  const places = new Map<string, string>();
  /** Les heures des derniers essais de mot de passe, par adresse et par téléphone ; celles des changements, par compte. */
  const essais = { parEmail: new Map<string, number[]>(), parTelephone: new Map<string, number[]>(), changements: new Map<string, number[]>() };
  /**
   * L'empreinte d'un mot de passe que personne n'a : on vérifie contre elle quand l'adresse n'a pas de compte, ou pas de mot de passe,
   * pour répondre dans le même temps.
   */
  let leurre: Promise<string> | undefined;

  function enregistrer(): void {
    const t = o.monde();
    for (const [e, s] of sessions) if (s.jusqua <= t || !comptes.has(s.compte)) sessions.delete(e);
    o.garder(JSON.stringify({ version: VERSION_DU_FICHIER, comptes: [...comptes.values()], sessions: [...sessions.values()] }));
  }

  const vu = (c: CompteGarde): CompteVu => ({
    email: c.email,
    ...(c.pochette !== undefined ? { pochette: c.pochette } : {}),
    parties: c.parties,
    victoires: c.victoires,
    motDePasse: c.motDePasse !== undefined,
  });

  /** Les heures de la dernière heure (ou de cette fenêtre, en secondes), dans une de ces listes. */
  const recents = (dans: Map<string, number[]>, cle: string, t: number, fenetre = UNE_HEURE): number[] =>
    (dans.get(cle) ?? []).filter((h) => h > t - fenetre);

  /** Note un envoi, un essai, à cette heure. */
  function noter(dans: Map<string, number[]>, cle: string, t: number, fenetre = UNE_HEURE): void {
    dans.set(cle, [...recents(dans, cle, t, fenetre), t]);
  }

  /** Oublie, dans une de ces listes, ceux dont plus rien ne compte. */
  function elaguer(dans: Map<string, number[]>, t: number, fenetre = UNE_HEURE): void {
    for (const [cle, heures] of dans) if (!heures.some((h) => h > t - fenetre)) dans.delete(cle);
  }

  /** Une session neuve pour ce compte, vu à cette heure : son secret, que le téléphone gardera. */
  function ouvrirUneSession(compte: CompteGarde, t: number): CompteOuvert & { readonly session: string } {
    comptes.set(compte.id, compte);
    const session = o.secret();
    sessions.set(o.empreinte(session), { empreinte: o.empreinte(session), compte: compte.id, jusqua: t + C.session });
    enregistrer();
    return { id: compte.id, compte: vu(compte), session };
  }

  return {
    async demanderUnLien(tape, depuis) {
      if (o.poster === undefined) return 'comptesFermes';
      const email = adresseEmail(tape);
      if (email === undefined) return 'adresse';
      const t = o.monde();
      const jour = Math.floor(t / UN_JOUR);
      if (jour !== envois.jour) {
        envois.jour = jour;
        envois.duJour = 0;
      }
      const parEmail = recents(envois.parEmail, email, t);
      const parTelephone = recents(envois.parTelephone, depuis, t);
      const dernier = parEmail[parEmail.length - 1];
      if (
        (dernier !== undefined && t - dernier < C.parAdresse.attente) ||
        parEmail.length >= C.parAdresse.parHeure ||
        parTelephone.length >= C.parTelephone ||
        envois.duJour >= C.parJour
      )
        return 'tropDeLiens';
      noter(envois.parEmail, email, t);
      noter(envois.parTelephone, depuis, t);
      envois.duJour++;
      for (const [e, l] of liens) if (l.jusqua <= t) liens.delete(e);
      const lien = o.secret();
      liens.set(o.empreinte(lien), { email, jusqua: t + C.lien });
      try {
        await o.poster(o.lettre(email, lien));
      } catch {
        liens.delete(o.empreinte(lien));
        return 'comptesFermes';
      }
      return 'envoye';
    },
    ouvrir(lien) {
      const e = o.empreinte(lien);
      const envoye = liens.get(e);
      // Un lien ne sert qu'une fois.
      liens.delete(e);
      const t = o.monde();
      if (envoye === undefined || envoye.jusqua <= t) return undefined;
      const deja = [...comptes.values()].find((c) => c.email === envoye.email);
      // On y entre : il est vu aujourd'hui, et ne dort plus.
      return ouvrirUneSession(
        deja !== undefined ? revu(deja, t) : { id: o.identifiant(), email: envoye.email, creeLe: t, parties: 0, victoires: 0, vuLe: t },
        t,
      );
    },
    async entrer(tape, motDePasse, depuis) {
      const M = C.motDePasse;
      const t = o.monde();
      const email = adresseEmail(tape) ?? '';
      // L'essai compte avant qu'on le vérifie : cent essais envoyés d'un coup ne passent pas entre les mailles.
      if (recents(essais.parEmail, email, t, M.fenetre).length >= M.essais || recents(essais.parTelephone, depuis, t).length >= M.parTelephone)
        return 'tropDEssais';
      noter(essais.parEmail, email, t, M.fenetre);
      noter(essais.parTelephone, depuis, t);
      const compte = [...comptes.values()].find((c) => c.email === email);
      if (leurre === undefined) leurre = o.hacher(o.secret());
      const juste = await o.verifier(motDePasse, compte?.motDePasse ?? (await leurre));
      // Pendant qu'on vérifiait, le compte a pu être effacé, ou changer de mot de passe.
      const encore = compte !== undefined ? comptes.get(compte.id) : undefined;
      if (!juste || encore?.motDePasse === undefined || encore.motDePasse !== compte?.motDePasse) return 'faux';
      essais.parEmail.delete(email);
      const apres = o.monde();
      return ouvrirUneSession(revu(encore, apres), apres);
    },
    async choisirUnMotDePasse(id, motDePasse, session) {
      const c = comptes.get(id);
      if (c === undefined) return 'horsCompte';
      if (jugerUnMotDePasse(motDePasse, c.email) !== 'bon') return 'faible';
      const t = o.monde();
      if (recents(essais.changements, id, t).length >= C.motDePasse.changements) return 'tropDEssais';
      noter(essais.changements, id, t);
      const empreinte = await o.hacher(motDePasse);
      const encore = comptes.get(id);
      if (encore === undefined) return 'horsCompte';
      comptes.set(id, { ...encore, motDePasse: empreinte });
      // Qui avait ouvert ce compte ailleurs en sort : seule la session d'où l'on a changé le mot de passe reste.
      const gardee = o.empreinte(session);
      for (const [e, s] of sessions) if (s.compte === id && e !== gardee) sessions.delete(e);
      enregistrer();
      // L'adresse du compte est prévenue : si ce n'était pas elle, elle entre par un lien, et le change à son tour.
      if (o.poster !== undefined && o.avisDuMotDePasse !== undefined) o.poster(o.avisDuMotDePasse(encore.email)).catch(() => undefined);
      return 'garde';
    },
    reprendre(session) {
      const e = o.empreinte(session);
      const s = sessions.get(e);
      const t = o.monde();
      const compte = s !== undefined ? comptes.get(s.compte) : undefined;
      if (s === undefined || s.jusqua <= t || compte === undefined) {
        if (s !== undefined) sessions.delete(e);
        return undefined;
      }
      // Elle se prolonge à chaque retour, et le compte est vu : on n'en réécrit le fichier qu'une fois par jour au plus.
      if (s.jusqua - t < C.session - UN_JOUR) {
        sessions.set(e, { ...s, jusqua: t + C.session });
        comptes.set(compte.id, revu(compte, t));
        enregistrer();
      }
      return { id: compte.id, compte: vu(compte) };
    },
    sortir(session) {
      if (sessions.delete(o.empreinte(session))) enregistrer();
    },
    effacer(id) {
      if (!comptes.delete(id)) return;
      for (const [e, s] of sessions) if (s.compte === id) sessions.delete(e);
      for (const [place, qui] of places) if (qui === id) places.delete(place);
      enregistrer();
    },
    garderLaPochette(id, pochette) {
      const c = comptes.get(id);
      if (c === undefined || JSON.stringify(c.pochette) === JSON.stringify(pochette)) return;
      comptes.set(id, { ...c, pochette });
      enregistrer();
    },
    attacher(code, joueur, id) {
      places.delete(`${code}/${joueur}`);
      places.set(`${code}/${joueur}`, id);
      for (const ancienne of places.keys()) {
        if (places.size <= PLACES_AU_PLUS) break;
        places.delete(ancienne);
      }
    },
    faceFinie(code, classement) {
      let change = false;
      for (const { joueur, premier } of classement) {
        const id = places.get(`${code}/${joueur}`);
        const c = id !== undefined ? comptes.get(id) : undefined;
        if (c === undefined) continue;
        comptes.set(c.id, { ...c, parties: c.parties + 1, victoires: c.victoires + (premier ? 1 : 0) });
        change = true;
      }
      if (change) enregistrer();
    },
    vu: (id) => {
      const c = comptes.get(id);
      return c !== undefined ? vu(c) : undefined;
    },
    oublier() {
      const t = o.monde();
      for (const [e, l] of liens) if (l.jusqua <= t) liens.delete(e);
      elaguer(envois.parEmail, t);
      elaguer(envois.parTelephone, t);
      elaguer(essais.parEmail, t, C.motDePasse.fenetre);
      elaguer(essais.parTelephone, t);
      elaguer(essais.changements, t);
    },
    nombre: () => comptes.size,
    async entretenir() {
      const t = o.monde();
      const I = C.inactif;
      let change = false;
      for (const c of [...comptes.values()]) {
        const dort = t - (c.vuLe ?? c.creeLe);
        if (dort >= I.efface) {
          comptes.delete(c.id);
          for (const [e, s] of sessions) if (s.compte === c.id) sessions.delete(e);
          change = true;
          continue;
        }
        if (dort < I.efface - I.prevenu || c.prevenuLe !== undefined || o.poster === undefined || o.avertissement === undefined) continue;
        try {
          await o.poster(o.avertissement(c.email));
          const encore = comptes.get(c.id);
          if (encore !== undefined) comptes.set(c.id, { ...encore, prevenuLe: t });
          change = true;
        } catch {
          // Le courrier ne part pas : on réessaiera au prochain ménage.
        }
      }
      if (change) enregistrer();
    },
  };
}

/** Un compte vu à cette heure : il ne dort plus, l'avertissement qu'on lui a peut-être envoyé ne vaut plus. */
function revu(c: CompteGarde, t: number): CompteGarde {
  const { prevenuLe: _prevenu, ...reste } = c;
  return { ...reste, vuLe: t };
}

/** Un texte qu'on pose dans du HTML : ses signes qui y veulent dire quelque chose, échappés. */
export const enHtml = (texte: string): string => texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * La lettre qui porte un lien de connexion : le lien mène à la page du site, qui garde le secret dans son ancre (`#connexion=…`) :
 * il ne passe dans aucun journal de serveur, et la page attend qu'on touche « Entrer » (un robot qui ouvre les liens d'un e-mail
 * pour les vérifier ne le consomme pas).
 * @param site l'adresse publique du site : « https://honear.fr ».
 */
export function lettreDuLien(textes: Textes['compte']['courrier'], site: string): (email: string, lien: string) => Lettre {
  const T = textes;
  return (email, lien) => {
    const adresse = `${site.replace(/\/+$/, '')}/#connexion=${lien}`;
    const P = PALETTE;
    return {
      a: email,
      sujet: T.sujet,
      texte: [T.bonjour, '', T.corps, '', adresse, '', T.duree, T.rien, '', `— ${T.signature}`, ''].join('\n'),
      html: [
        '<!doctype html><html><head><meta charset="utf-8"></head>',
        `<body style="margin:0;padding:24px;background:${P.creme};color:${P.expresso};font-family:Georgia,serif;font-size:17px;line-height:1.5">`,
        `<p>${enHtml(T.bonjour)}</p><p>${enHtml(T.corps)}</p>`,
        `<p style="margin:28px 0"><a href="${enHtml(adresse)}" style="display:inline-block;padding:14px 22px;border-radius:10px;`,
        `background:${P.miel};color:${P.expresso};text-decoration:none;font-weight:bold">${enHtml(T.bouton)}</a></p>`,
        `<p style="font-size:14px">${enHtml(T.duree)}<br>${enHtml(T.rien)}</p>`,
        `<p>— ${enHtml(T.signature)}</p></body></html>`,
      ].join(''),
    };
  };
}

/**
 * La lettre qui dit à l'adresse d'un compte que son mot de passe vient d'être choisi, ou changé : si ce n'était pas elle, elle entre
 * par un lien envoyé à son adresse, et en choisit un autre ; les autres téléphones sortent du compte.
 * @param site l'adresse publique du site : « https://honear.fr ».
 */
export function lettreDuMotDePasse(textes: Textes['compte']['courrier'], site: string): (email: string) => Lettre {
  const T = textes;
  const P = PALETTE;
  return (email) => ({
    a: email,
    sujet: T.motDePasseSujet,
    texte: [T.bonjour, '', T.motDePasse, '', T.motDePassePasToi, site, '', `— ${T.signature}`, ''].join('\n'),
    html: [
      '<!doctype html><html><head><meta charset="utf-8"></head>',
      `<body style="margin:0;padding:24px;background:${P.creme};color:${P.expresso};font-family:Georgia,serif;font-size:17px;line-height:1.5">`,
      `<p>${enHtml(T.bonjour)}</p><p>${enHtml(T.motDePasse)}</p><p>${enHtml(T.motDePassePasToi)}</p>`,
      `<p><a href="${enHtml(site)}" style="color:${P.expresso}">${enHtml(site.replace(/^https?:\/\//, ''))}</a></p>`,
      `<p>— ${enHtml(T.signature)}</p></body></html>`,
    ].join(''),
  });
}

/**
 * La lettre qui prévient un compte qui dort : dans un mois, il sera effacé ; pour le garder, il suffit d'y revenir.
 * @param site l'adresse publique du site : « https://honear.fr ».
 */
export function lettreDAvertissement(textes: Textes['compte']['courrier'], site: string): (email: string) => Lettre {
  const T = textes;
  const P = PALETTE;
  return (email) => ({
    a: email,
    sujet: T.dortSujet,
    texte: [T.bonjour, '', T.dort, '', T.dortGarder, site, '', `— ${T.signature}`, ''].join('\n'),
    html: [
      '<!doctype html><html><head><meta charset="utf-8"></head>',
      `<body style="margin:0;padding:24px;background:${P.creme};color:${P.expresso};font-family:Georgia,serif;font-size:17px;line-height:1.5">`,
      `<p>${enHtml(T.bonjour)}</p><p>${enHtml(T.dort)}</p><p>${enHtml(T.dortGarder)}</p>`,
      `<p><a href="${enHtml(site)}" style="color:${P.expresso}">${enHtml(site.replace(/^https?:\/\//, ''))}</a></p>`,
      `<p>— ${enHtml(T.signature)}</p></body></html>`,
    ].join(''),
  });
}
