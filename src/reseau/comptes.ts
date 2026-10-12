/**
 * Les comptes, facultatifs : ce qu'un joueur garde d'un téléphone à l'autre, sa pochette et ses scores, sous son adresse e-mail,
 * et rien d'autre. Pas de mot de passe : on entre par un lien envoyé à son adresse, qui ne sert qu'une fois, un quart d'heure ;
 * le téléphone reçoit alors le secret d'une session, qu'il garde pour revenir. Le serveur ne garde de ces secrets que leur
 * empreinte : qui lirait son fichier n'entrerait dans aucun compte. Les liens vivent en mémoire ; les comptes et les sessions,
 * dans un fichier, réécrit en entier quand ils changent (ils sont peu). On limite les envois : par adresse, par téléphone, par jour.
 * Un compte dont personne ne se sert pendant deux ans s'efface tout seul ; un mois avant, une lettre prévient son adresse.
 */

import type { CompteVu } from '../regles/messages';
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
  /** Ce qu'on avait gardé (le contenu du fichier), et de quoi le garder quand ça change. */
  readonly lu: string | undefined;
  readonly garder: (texte: string) => void;
  /** De quoi envoyer une lettre ; rien : le site n'envoie pas d'e-mails, ses comptes sont fermés. */
  readonly poster: Poster | undefined;
  /** La lettre qui porte un lien de connexion, à cette adresse. */
  readonly lettre: (email: string, lien: string) => Lettre;
  /** La lettre qui prévient un compte qui dort qu'il va être effacé ; rien : on efface sans prévenir. */
  readonly avertissement?: (email: string) => Lettre;
}

/** Ce qu'on peut répondre à qui demande un lien. */
export type EnvoiDuLien = 'envoye' | 'adresse' | 'tropDeLiens' | 'comptesFermes';

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
  /** Le ménage : efface les comptes qui dorment depuis trop longtemps, et prévient ceux qui vont l'être. */
  entretenir(): Promise<void>;
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

/** Ce qu'on a lu du fichier, si c'en est un : les comptes et les sessions qu'on y reconnaît. */
function relire(texte: string | undefined): { comptes: CompteGarde[]; sessions: SessionGardee[] } {
  let lu: unknown;
  try {
    lu = texte !== undefined ? JSON.parse(texte) : undefined;
  } catch {
    lu = undefined;
  }
  const objet = typeof lu === 'object' && lu !== null ? (lu as Record<string, unknown>) : {};
  const comptes = (Array.isArray(objet['comptes']) ? (objet['comptes'] as unknown[]) : []).flatMap((x): CompteGarde[] => {
    const c = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
    const { id, email, creeLe, pochette, parties, victoires, vuLe, prevenuLe } = c;
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
      },
    ];
  });
  const sessions = (Array.isArray(objet['sessions']) ? (objet['sessions'] as unknown[]) : []).flatMap((x): SessionGardee[] => {
    const s = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
    const { empreinte, compte, jusqua } = s;
    return typeof empreinte === 'string' && typeof compte === 'string' && typeof jusqua === 'number' ? [{ empreinte, compte, jusqua }] : [];
  });
  return { comptes, sessions };
}

/** Une heure, un jour, en secondes. */
const UNE_HEURE = 3600;
const UN_JOUR = 86400;
/** Combien de places de room on se souvient au plus : de quoi compter les scores des parties en cours. */
const PLACES_AU_PLUS = 20000;

export function ouvrirLesComptes(o: OptionsDesComptes): Comptes {
  const C = RESEAU.comptes;
  const lus = relire(o.lu);
  const comptes = new Map(lus.comptes.map((c) => [c.id, c]));
  const sessions = new Map(lus.sessions.map((s) => [s.empreinte, s]));
  /** Les liens envoyés, par leur empreinte : l'adresse où ils sont partis, et jusqu'à quand ils marchent. */
  const liens = new Map<string, { readonly email: string; readonly jusqua: number }>();
  /** Les heures des derniers envois, par adresse e-mail, par téléphone, et en tout aujourd'hui. */
  const envois = { parEmail: new Map<string, number[]>(), parTelephone: new Map<string, number[]>(), jour: -1, duJour: 0 };
  /** Qui joue sous quel compte, par place de room (« CODE/identifiant du joueur »). */
  const places = new Map<string, string>();

  function enregistrer(): void {
    const t = o.monde();
    for (const [e, s] of sessions) if (s.jusqua <= t || !comptes.has(s.compte)) sessions.delete(e);
    o.garder(JSON.stringify({ version: 1, comptes: [...comptes.values()], sessions: [...sessions.values()] }));
  }

  const vu = (c: CompteGarde): CompteVu => ({
    email: c.email,
    ...(c.pochette !== undefined ? { pochette: c.pochette } : {}),
    parties: c.parties,
    victoires: c.victoires,
  });

  /** Les heures de la dernière heure, dans une de ces listes. */
  const recents = (dans: Map<string, number[]>, cle: string, t: number): number[] => (dans.get(cle) ?? []).filter((h) => h > t - UNE_HEURE);

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
      envois.parEmail.set(email, [...parEmail, t]);
      envois.parTelephone.set(depuis, [...parTelephone, t]);
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
      const compte: CompteGarde =
        deja !== undefined ? revu(deja, t) : { id: o.identifiant(), email: envoye.email, creeLe: t, parties: 0, victoires: 0, vuLe: t };
      comptes.set(compte.id, compte);
      const session = o.secret();
      sessions.set(o.empreinte(session), { empreinte: o.empreinte(session), compte: compte.id, jusqua: t + C.session });
      enregistrer();
      return { id: compte.id, compte: vu(compte), session };
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
 * @param site l'adresse publique du site : « https://miel-doreilles.fr ».
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
 * La lettre qui prévient un compte qui dort : dans un mois, il sera effacé ; pour le garder, il suffit d'y revenir.
 * @param site l'adresse publique du site : « https://miel-doreilles.fr ».
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
