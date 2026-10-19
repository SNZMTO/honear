/**
 * Le site en ligne : le point d'entrée du serveur, sur le VPS. Il lit sa configuration dans l'environnement, sert la page du jeu,
 * branche les téléphones par WebSocket au serveur du jeu, et fait avancer celui-ci à ses rendez-vous (l'extrait qui part,
 * la révélation). Il écoute en local : c'est le relais devant lui (Caddy) qui parle HTTPS au monde, et lui dit l'adresse de chaque
 * navigateur (RELAIS=1 ; sans relais, il prend celle de la prise). Il va chercher la musique chez
 * Deezer (DEEZER : une autre adresse, celle d'un faux, pour essayer le site).
 * Il compte ce qui s'y passe pour la page des statistiques (STATISTIQUES, le fichier, sinon à côté des comptes ; STATISTIQUES_CLE,
 * la clé qui l'ouvre : sans elle, la page est fermée).
 * Il garde les comptes dans un fichier (COMPTES, sinon à côté de lui), et envoie leurs liens de connexion par
 * le serveur d'envoi d'une boîte e-mail (COURRIER_HOTE, COURRIER_PORT, COURRIER_UTILISATEUR, COURRIER_MOT_DE_PASSE, COURRIER_DE ;
 * COURRIER=journal les écrit dans le journal au lieu de les envoyer, pour essayer).
 * Le diagnostic des pages (« ?diagnostic ») ne s'écrit dans son journal que si on l'ouvre, le temps d'un essai (DIAGNOSTIC=1).
 *
 *   PORT=8080 ORIGINES=https://honear.fr node serveur.mjs
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hitParade } from '../regles/partie';
import { APPLICATION, META_DE_LA_VERSION, PAGES_LEGALES } from '../ressources/reglages';
import { RESEAU } from '../ressources/reseau';
import { ADRESSES_DES_STATISTIQUES } from '../ressources/statistiques';
import type { Textes } from '../ressources/textes';
import { demarrerLeServeur } from '../serveur/serveur';
import { API_DE_DEEZER } from '../serveur/sources/deezer';
import { PISTES_D_ESSAI, PLAYLIST_D_ESSAI } from '../serveur/sources/essai';
import { adresseEmail, enHtml, lettreDAvertissement, lettreDuLien, lettreDuMotDePasse, ouvrirLesComptes, type Comptes } from './comptes';
import { posterParSmtp, type ConfigurationDuCourrier, type Poster } from './courrier';
import type { FaitDuJeu } from '../serveur/faits';
import { aLHeureDe, dateDuCourrier, heureDuMonde, horlogeDuServeur, joursDu } from './horloge';
import { ouvrirLaLigne } from './ligne';
import { hacherUnMotDePasse, verifierUnMotDePasse } from './mots-de-passe';
import { brancherLaMusique, type Musique } from './musique';
import { ouvrirLaPorte } from './porte';
import { ouvrirLesStatistiques, type Statistiques } from './statistiques';

/** Un tirage de zéro à un, pris au hasard du système : celui des codes de room et des leurres. */
const tirage = (): number => randomBytes(4).readUInt32BE(0) / 2 ** 32;

/** Les textes du compte, pour les lettres : c'est la construction du serveur qui les y met (voir outils/construire.ts). */
declare const TEXTES_DU_COMPTE: Textes['compte'] | undefined;
/** Ce que les pages légales disent quand on ne connaît pas d'adresse où écrire : la construction du serveur l'y met aussi. */
declare const TEXTES_DU_CONTACT: string | undefined;

/** Ce que le site lit dans son environnement. */
export interface ConfigurationDuSite {
  readonly port: number;
  readonly hote: string;
  readonly origines: readonly string[];
  readonly page: string;
  /** L'API de Deezer ; rien : le site ne joue que sa playlist d'essai. */
  readonly deezer: string | undefined;
  /** Le MCP de Honear, qui sert les listes sur mesure sur le réseau du jeu ; rien : pas de listes. */
  readonly listes?: string;
  /** L'adresse où écrire à l'éditeur, que disent les pages légales (CONTACT, sinon celle qui envoie les liens des comptes). */
  readonly contact?: string;
  /**
   * Les comptes : le fichier où ils se gardent, l'adresse publique du site (celle des liens), le serveur d'envoi des lettres (rien :
   * les comptes sont fermés ; « journal » : les liens s'écrivent dans le journal du serveur), et les textes des lettres. Rien : pas de comptes.
   */
  readonly comptes?: {
    readonly fichier: string;
    readonly site: string;
    readonly courrier: ConfigurationDuCourrier | 'journal' | undefined;
    readonly textes: Textes['compte'];
  };
  /** Les statistiques : le fichier où elles se gardent, et la clé qui ouvre leur page (rien : la page est fermée). */
  readonly statistiques?: { readonly fichier: string; readonly cle: string | undefined };
  /** Vrai si le journal accepte le diagnostic des pages (DIAGNOSTIC=1) ; d'ordinaire, il est fermé : une page n'y écrit rien. */
  readonly diagnostic?: boolean;
  /** Vrai si le site est derrière un relais de confiance (RELAIS=1 : le frontal Caddy), qui lui dit l'adresse de chaque navigateur. */
  readonly relais?: boolean;
}

function configuration(): ConfigurationDuSite {
  const ici = dirname(fileURLToPath(import.meta.url));
  const deezer = process.env['DEEZER'] ?? API_DE_DEEZER;
  const listes = process.env['LISTES'];
  const origines = (process.env['ORIGINES'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o !== '');
  const courrier = courrierDeLEnvironnement();
  // L'adresse qui envoie les liens, sans le nom qui la précède.
  const contact = process.env['CONTACT'] ?? (typeof courrier === 'object' && courrier.de !== '' ? adresseEmailDe(courrier.de) : undefined);
  const comptes = process.env['COMPTES'] ?? join(ici, 'comptes.json');
  const cle = process.env['STATISTIQUES_CLE'];
  return {
    ...(contact !== undefined ? { contact } : {}),
    ...(process.env['DIAGNOSTIC'] === '1' ? { diagnostic: true } : {}),
    ...(process.env['RELAIS'] === '1' ? { relais: true } : {}),
    statistiques: {
      fichier: process.env['STATISTIQUES'] ?? join(dirname(comptes), 'statistiques.json'),
      cle: cle !== undefined && /^[A-Za-z0-9_-]{16,128}$/.test(cle) ? cle : undefined,
    },
    port: Number(process.env['PORT'] ?? 8080),
    hote: process.env['HOTE'] ?? '127.0.0.1',
    origines,
    page: process.env['PAGE'] ?? join(ici, 'index.html'),
    deezer: deezer === 'non' ? undefined : deezer.replace(/\/+$/, ''),
    ...(listes !== undefined && /^https?:\/\/[^/?#]+\/?$/.test(listes) ? { listes: listes.replace(/\/+$/, '') } : {}),
    ...(typeof TEXTES_DU_COMPTE !== 'undefined' && TEXTES_DU_COMPTE !== undefined
      ? {
          comptes: {
            fichier: comptes,
            site: process.env['SITE'] ?? origines[0] ?? 'http://localhost:8080',
            courrier,
            textes: TEXTES_DU_COMPTE,
          },
        }
      : {}),
  };
}

/** L'adresse e-mail d'un expéditeur, qu'il s'écrive seul ou avec un nom (« Honear <bonjour@…> »). */
const adresseEmailDe = (de: string): string => /<([^<>]+)>/.exec(de)?.[1] ?? de;

/** Vrai si le navigateur demande à ne pas être suivi : Global Privacy Control (« Sec-GPC: 1 »), ou Do Not Track (« DNT: 1 »). */
const neVeutPasEtreSuivi = (requete: IncomingMessage): boolean => requete.headers['sec-gpc'] === '1' || requete.headers['dnt'] === '1';

/** L'expéditeur des lettres : le nom du site, que les textes donnent, devant l'adresse qui les envoie ; l'adresse seule sans eux. */
function expediteur(de: string): string {
  const nom = typeof TEXTES_DU_COMPTE !== 'undefined' && TEXTES_DU_COMPTE !== undefined ? TEXTES_DU_COMPTE.courrier.signature : undefined;
  return nom !== undefined ? `${nom} <${adresseEmailDe(de)}>` : de;
}

/** Le serveur d'envoi, d'après l'environnement : rien s'il n'est pas dit ; « journal » pour écrire les liens au lieu de les envoyer. */
function courrierDeLEnvironnement(): ConfigurationDuCourrier | 'journal' | undefined {
  const env = process.env;
  if (env['COURRIER'] === 'journal') return 'journal';
  const hote = env['COURRIER_HOTE'];
  if (hote === undefined || hote === '') return undefined;
  const utilisateur = env['COURRIER_UTILISATEUR'] ?? '';
  return {
    hote,
    port: Number(env['COURRIER_PORT'] ?? 465),
    utilisateur,
    motDePasse: env['COURRIER_MOT_DE_PASSE'] ?? '',
    de: expediteur(env['COURRIER_DE'] ?? utilisateur),
    patience: RESEAU.comptes.patience * 1000,
  };
}

/**
 * Ce qu'on avait gardé dans un fichier : son contenu ; rien s'il n'y en a pas encore. Un fichier qui est là mais ne se lit pas (ses
 * droits) fait échouer, comme un fichier qu'on ne sait pas relire : on ne le remplacera pas.
 */
const lireLeFichier = (fichier: string): string | undefined => (existsSync(fichier) ? readFileSync(fichier, 'utf8') : undefined);

/**
 * Ce qu'on garde d'un fichier qu'on n'a pas su lire, ou relire : rien. Le journal le dit, sans rien de ce qu'il contient (l'erreur
 * de lecture, ou ce que le module en a dit), et le fichier reste tel quel, pour qu'on le répare ou qu'on le mette de côté.
 */
function illisible(quoi: string, fichier: string, erreur: unknown): undefined {
  const pourquoi = erreur instanceof Error ? erreur.message : String(erreur);
  console.error(`${pourquoi} (${fichier}) : ${quoi}, et le fichier n’est pas réécrit. Répare-le, ou mets-le de côté, puis relance le jeu.`);
  return undefined;
}

/**
 * Les comptes, gardés dans leur fichier : relu au démarrage, réécrit en entier à chaque changement (dans un fichier à côté, puis mis
 * à sa place d'un coup : un arrêt en pleine écriture ne l'abîme pas). Si on ne peut pas l'écrire, les comptes vivent en mémoire, et
 * on le dit une fois. S'il est là mais qu'on ne sait pas le lire en entier (coupé en route, abîmé, d'une autre version), rien :
 * les comptes restent fermés, et personne ne le réécrit.
 */
function comptesDansUnFichier(c: NonNullable<ConfigurationDuSite['comptes']>): Comptes | undefined {
  let dit = false;
  const poster: Poster | undefined =
    c.courrier === 'journal'
      ? async (lettre) => {
          console.log(`Lien de connexion pour ${lettre.a} : ${/https?:\/\/\S+#connexion=\S+/.exec(lettre.texte)?.[0] ?? ''}`);
        }
      : c.courrier !== undefined
        ? posterParSmtp(c.courrier, dateDuCourrier)
        : undefined;
  try {
    return ouvrirLesComptes({
      monde: heureDuMonde,
      secret: () => randomBytes(32).toString('base64url'),
      identifiant: () => randomBytes(9).toString('base64url'),
      empreinte: (secret) => createHash('sha256').update(secret).digest('hex'),
      hacher: hacherUnMotDePasse,
      verifier: verifierUnMotDePasse,
      lu: lireLeFichier(c.fichier),
      garder(texte) {
        try {
          mkdirSync(dirname(c.fichier), { recursive: true });
          writeFileSync(`${c.fichier}.neuf`, texte, { mode: 0o600 });
          renameSync(`${c.fichier}.neuf`, c.fichier);
        } catch (erreur) {
          if (!dit) console.error(`Les comptes ne s'écrivent pas dans ${c.fichier} : ${String(erreur)}`);
          dit = true;
        }
      },
      poster,
      lettre: lettreDuLien(c.textes.courrier, c.site),
      avertissement: lettreDAvertissement(c.textes.courrier, c.site),
      avisDuMotDePasse: lettreDuMotDePasse(c.textes.courrier, c.site),
    });
  } catch (erreur) {
    return illisible('les comptes restent fermés', c.fichier, erreur);
  }
}

/**
 * Les statistiques, gardées dans leur fichier : relu au démarrage, réécrit en entier de temps en temps (dans un fichier à côté, puis
 * mis à sa place d'un coup). Si on ne peut pas l'écrire, elles vivent en mémoire, et on le dit une fois. S'il est là mais qu'on ne
 * sait pas le lire, rien : la page des statistiques reste fermée, rien n'est compté, et personne ne le réécrit.
 */
function statistiquesDansUnFichier(fichier: string): Statistiques | undefined {
  let dit = false;
  try {
    return ouvrirLesStatistiques({
      lu: lireLeFichier(fichier),
      garder(texte) {
        try {
          mkdirSync(dirname(fichier), { recursive: true });
          writeFileSync(`${fichier}.neuf`, texte, { mode: 0o600 });
          renameSync(`${fichier}.neuf`, fichier);
        } catch (erreur) {
          if (!dit) console.error(`Les statistiques ne s'écrivent pas dans ${fichier} : ${String(erreur)}`);
          dit = true;
        }
      },
      monde: heureDuMonde,
      local: aLHeureDe(RESEAU.statistiques.fuseau),
      joursDu,
      sel: () => randomBytes(32).toString('base64url'),
    });
  } catch (erreur) {
    return illisible('les statistiques restent fermées', fichier, erreur);
  }
}

/** Vrai si la clé donnée est celle des statistiques : comparées par leur empreinte, en un temps qui ne dit rien de l'une ni de l'autre. */
function bonneCle(donnee: string | undefined, attendue: string | undefined): boolean {
  if (donnee === undefined || attendue === undefined) return false;
  const empreinte = (cle: string): Buffer => createHash('sha256').update(cle).digest();
  return timingSafeEqual(empreinte(donnee), empreinte(attendue));
}

/**
 * Les pages légales, lues à côté de la page du jeu (« /confidentialite » dans confidentialite.html), l'adresse du site et celle où
 * écrire à l'éditeur écrites dedans. Celles qui manquent ne sont pas servies.
 */
function pagesLegales(c: ConfigurationDuSite): Record<string, string> {
  const site = (c.comptes?.site ?? c.origines[0] ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const contact = c.contact ?? (typeof TEXTES_DU_CONTACT !== 'undefined' ? TEXTES_DU_CONTACT : undefined) ?? '';
  const pages: Record<string, string> = {};
  for (const chemin of Object.values(PAGES_LEGALES)) {
    const fichier = join(dirname(c.page), `${chemin.slice(1)}.html`);
    if (!existsSync(fichier)) continue;
    pages[chemin] = readFileSync(fichier, 'utf8')
      .replace(/\{site\}/g, enHtml(site))
      .replace(/\{contact\}/g, enHtml(contact));
  }
  return pages;
}

/** La page des statistiques, fabriquée à côté de celle du jeu ; rien si elle n'y est pas. */
function lirePageDesStatistiques(c: ConfigurationDuSite): string | undefined {
  const fichier = join(dirname(c.page), `${ADRESSES_DES_STATISTIQUES.page.slice(1)}.html`);
  return existsSync(fichier) ? readFileSync(fichier, 'utf8') : undefined;
}

/** Le manifeste et l'icône de l'application, fabriqués à côté de la page : par leur adresse, avec leur type. */
function fichiersDeLApplication(c: ConfigurationDuSite): Record<string, { readonly type: string; readonly contenu: string }> {
  const types = { [APPLICATION.manifeste]: 'application/manifest+json; charset=utf-8', [APPLICATION.icone]: 'image/svg+xml' };
  const fichiers: Record<string, { readonly type: string; readonly contenu: string }> = {};
  for (const [chemin, type] of Object.entries(types)) {
    const fichier = join(dirname(c.page), chemin.slice(1));
    if (existsSync(fichier)) fichiers[chemin] = { type, contenu: readFileSync(fichier, 'utf8') };
  }
  return fichiers;
}

/** Entre deux ménages des comptes, en millisecondes ; entre deux oublis de ce qui ne compte plus (liens, essais). */
const MENAGE = RESEAU.comptes.inactif.menage * 1000;
const OUBLI = RESEAU.comptes.oubli * 1000;
/** Entre deux écritures des statistiques, en millisecondes. */
const ECRITURE_DES_STATISTIQUES = RESEAU.statistiques.ecriture * 1000;

/** Ce qu'on laisse à Deezer pour répondre, en millisecondes. */
const PATIENCE = RESEAU.deezer.attente * 1000;

/**
 * La musique, par le réseau : chaque appel à Deezer est une requête HTTPS, abandonnée si elle tarde.
 * @param ailleurs une autre adresse pour l'API de Deezer : celle d'un faux, pour essayer le site sans lui ; et celle du MCP qui
 * sert les listes, s'il y en a un.
 */
function musiqueEnLigne(ailleurs: { readonly deezer: string; readonly listes?: string }, maintenant: () => number): Musique {
  const vers = (adresse: string): string => (adresse.startsWith(API_DE_DEEZER) ? ailleurs.deezer + adresse.slice(API_DE_DEEZER.length) : adresse);
  return brancherLaMusique({
    async lire(adresse) {
      const reponse = await fetch(vers(adresse), { signal: AbortSignal.timeout(PATIENCE), headers: { accept: 'application/json' } });
      return (await reponse.json()) as unknown;
    },
    async suivre(adresse) {
      const reponse = await fetch(adresse, { redirect: 'follow', signal: AbortSignal.timeout(PATIENCE) });
      await reponse.body?.cancel();
      return reponse.url;
    },
    maintenant,
    monde: heureDuMonde,
    ...(ailleurs.listes !== undefined ? { listes: ailleurs.listes } : {}),
    attendre: (secondes) =>
      new Promise<void>((fini) => {
        const duree = Math.max(0, secondes) * 1000;
        setTimeout(fini, duree);
      }),
  });
}

/**
 * L'adresse d'un navigateur : celle d'où vient sa limite par adresse (connexions, rooms, liens, essais, diagnostic). Derrière un
 * relais de confiance, celle qu'il a vue : la dernière de « X-Forwarded-For », qu'il y ajoute lui-même (celles d'avant, le navigateur
 * a pu les écrire). Sans relais, celle de la prise : un en-tête que n'importe qui peut écrire n'est pas cru.
 */
export function adresseDe(requete: IncomingMessage, relais: boolean): string {
  const relayee = relais ? requete.headers['x-forwarded-for'] : undefined;
  const derniere = (Array.isArray(relayee) ? relayee.join(',') : relayee)?.split(',').pop()?.trim();
  return derniere !== undefined && derniere !== '' ? derniere : (requete.socket.remoteAddress ?? '');
}

/** Le site lancé : le port où il écoute, une fois qu'il écoute, et de quoi l'arrêter. */
export interface SiteLance {
  readonly pret: Promise<number>;
  readonly fermer: () => Promise<void>;
}

export function lancerLeSite(c: ConfigurationDuSite): SiteLance {
  const maintenant = horlogeDuServeur();
  const musique =
    c.deezer !== undefined ? musiqueEnLigne({ deezer: c.deezer, ...(c.listes !== undefined ? { listes: c.listes } : {}) }, maintenant) : undefined;
  const comptes = c.comptes !== undefined ? comptesDansUnFichier(c.comptes) : undefined;
  const statistiques = c.statistiques !== undefined ? statistiquesDansUnFichier(c.statistiques.fichier) : undefined;
  // Les statistiques s'écrivent de temps en temps, et une dernière fois quand le site s'arrête.
  const garderLesStatistiques = (): void => statistiques?.garder();
  const ecriture = statistiques !== undefined ? setInterval(garderLesStatistiques, ECRITURE_DES_STATISTIQUES) : undefined;
  ecriture?.unref();
  // Le ménage des comptes qui dorment : au démarrage, puis une fois par jour.
  const faireLeMenage = (): void => void comptes?.entretenir();
  faireLeMenage();
  const menage = comptes !== undefined ? setInterval(faireLeMenage, MENAGE) : undefined;
  menage?.unref();
  // Les liens périmés, les adresses dont les essais ne comptent plus : oubliés au fil de l'heure.
  const oublierLesEssais = (): void => comptes?.oublier();
  const oubli = comptes !== undefined ? setInterval(oublierLesEssais, OUBLI) : undefined;
  oubli?.unref();
  const serveur = demarrerLeServeur({
    maintenant,
    tirage,
    jeton: () => randomBytes(18).toString('base64url'),
    // La playlist d'essai est toujours là ; les autres, la musique les a lues avant que la room en ait besoin.
    playlist: (lien) => (lien === PLAYLIST_D_ESSAI ? PISTES_D_ESSAI : musique?.pistes(lien)),
    // Les pistes qui viennent : la musique lit leurs invités, pour leur feat.
    bientot: (pistes) => musique?.preciser(pistes),
    gardeSonOrdre: (lien) => musique?.gardeSonOrdre(lien) === true,
    // Une face finie : ceux qui jouaient sous un compte y comptent une partie ; le premier (s'il a marqué), une victoire.
    quandUneFaceFinit: (code, etat) =>
      comptes?.faceFinie(
        code,
        hitParade(etat)
          .filter(({ joueur }) => !joueur.spectateur)
          .map(({ joueur, rang }) => ({ joueur: joueur.id, premier: rang === 1 && joueur.points > 0 })),
      ),
    ...(statistiques !== undefined ? { raconter: (fait: FaitDuJeu) => statistiques.jeu(fait) } : {}),
  });

  // La minuterie : le serveur dit l'heure de son prochain rendez-vous ; on dort jusque-là, jamais plus d'une seconde.
  let reveil: NodeJS.Timeout | undefined;
  let ferme = false;
  const avancer = (): void => {
    if (reveil !== undefined) clearTimeout(reveil);
    // Une ligne qui se ferme après l'arrêt du site ne relance pas la minuterie.
    if (ferme) return;
    const prochain = serveur.avancer();
    const attente = Math.max(0, Math.min(RESEAU.minuterieAuPlus, (prochain ?? Infinity) - maintenant())) * 1000;
    reveil = setTimeout(avancer, attente);
  };

  const page = readFileSync(c.page, 'utf8');
  // La version de la page, qu'elle porte dans son en-tête (voir la construction) : la ligne la compare à celle des pages qui se branchent.
  const version = new RegExp(`<meta name="${META_DE_LA_VERSION}" content="([^"]+)">`).exec(page)?.[1];
  const adresseDuNavigateur = (requete: IncomingMessage): string => adresseDe(requete, c.relais === true);
  const ligne = ouvrirLaLigne({
    serveur,
    ...(version !== undefined ? { version } : {}),
    maintenant,
    origines: c.origines,
    aChaqueAction: avancer,
    adresseDe: adresseDuNavigateur,
    ...(musique !== undefined ? { musique } : {}),
    ...(comptes !== undefined ? { comptes } : {}),
    ...(statistiques !== undefined ? { statistiques } : {}),
    ...(c.diagnostic === true ? { diagnostic: true } : {}),
  });
  const demarreA = maintenant();
  const pageDesStatistiques = lirePageDesStatistiques(c);
  const http = createServer(
    ouvrirLaPorte({
      page,
      legales: pagesLegales(c),
      fichiers: fichiersDeLApplication(c),
      // Ce que le site dit de lui-même : de quoi vérifier une mise en place d'un coup d'œil (et voir un fichier des comptes illisible).
      sante: () => ({
        rooms: serveur.rooms,
        telephones: ligne.branches,
        musique: musique !== undefined,
        comptes: c.comptes === undefined ? 'absents' : comptes === undefined ? 'illisibles' : c.comptes.courrier === undefined ? 'fermes' : 'ouverts',
      }),
      ...(statistiques !== undefined && pageDesStatistiques !== undefined
        ? {
            statistiques: {
              page: pageDesStatistiques,
              donnees: (cle: string | undefined) =>
                bonneCle(cle, c.statistiques?.cle)
                  ? JSON.stringify(
                      statistiques.vue({
                        rooms: serveur.apercu(),
                        telephones: ligne.branches,
                        ...(comptes !== undefined ? { comptes: comptes.nombre() } : {}),
                        ...(version !== undefined ? { version } : {}),
                        depuis: maintenant() - demarreA,
                      }),
                    )
                  : undefined,
            },
            quandUnePage: (requete: IncomingMessage, room: boolean) =>
              statistiques.page(adresseDuNavigateur(requete), requete.headers['user-agent'] ?? '', room, neVeutPasEtreSuivi(requete)),
          }
        : {}),
    }),
  );
  http.on('upgrade', (requete, prise, debut) => ligne.accueillir(requete, prise, debut));
  const pret = new Promise<number>((ecoute) =>
    http.listen(c.port, c.hote, () => {
      const adresse = http.address();
      ecoute(typeof adresse === 'object' && adresse !== null ? adresse.port : c.port);
    }),
  );
  avancer();
  return {
    pret,
    fermer: () =>
      new Promise<void>((fini) => {
        ferme = true;
        if (reveil !== undefined) clearTimeout(reveil);
        if (menage !== undefined) clearInterval(menage);
        if (oubli !== undefined) clearInterval(oubli);
        if (ecriture !== undefined) clearInterval(ecriture);
        statistiques?.garder();
        ligne.fermer();
        http.close(() => fini());
        // Les navigateurs gardent leurs connexions ouvertes pour la suite : on ne les attend pas.
        http.closeAllConnections();
      }),
  };
}

/**
 * Envoie un e-mail d'essai par le serveur d'envoi de la configuration : la mise en place s'assure ainsi que les liens partiront.
 * @returns le code de sortie : zéro s'il est parti.
 */
async function essayerLeCourrier(c: ConfigurationDuSite, a: string | undefined): Promise<number> {
  const courrier = c.comptes?.courrier;
  if (c.comptes === undefined || courrier === undefined) {
    console.error('Pas de serveur d’envoi : remplis /etc/honear/courrier.env (COURRIER_HOTE, COURRIER_UTILISATEUR…).');
    return 1;
  }
  if (courrier === 'journal') {
    console.log('COURRIER=journal : les liens s’écrivent dans le journal du serveur, aucun e-mail ne part.');
    return 0;
  }
  const email = adresseEmail(a ?? '');
  if (email === undefined) {
    console.error('Donne une adresse : node serveur.mjs --essai-courrier toi@exemple.fr');
    return 1;
  }
  const T = c.comptes.textes.courrier;
  try {
    await posterParSmtp(
      courrier,
      dateDuCourrier,
    )({
      a: email,
      sujet: T.essaiSujet,
      texte: `${T.essai}\n\n— ${T.signature}\n`,
      html: `<p>${enHtml(T.essai)}</p><p>— ${enHtml(T.signature)}</p>`,
    });
    console.log(`L’e-mail d’essai est parti à ${email}, par ${courrier.hote}.`);
    return 0;
  } catch (erreur) {
    console.error(`L’e-mail d’essai n’est pas parti : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    return 1;
  }
}

// Lancé tel quel (node serveur.mjs), il démarre ; importé (par les tests), il attend qu'on le lance.
// « node serveur.mjs --essai-courrier toi@exemple.fr [courrier.env] » envoie un e-mail d'essai, et s'arrête.
// Un troisième mot, s'il y en a un, est un fichier de réglages du courrier, lu comme Docker lit le sien ; sans lui, l'environnement.
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1] && process.argv[2] === '--essai-courrier') {
  const reglages = process.argv[4];
  if (reglages !== undefined) process.loadEnvFile(reglages);
  void essayerLeCourrier(configuration(), process.argv[3]).then((code) => process.exit(code));
} else if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  const c = configuration();
  const site = lancerLeSite(c);
  void site.pret.then((port) =>
    console.log(`Honear écoute sur http://${c.hote}:${port}${c.origines.length > 0 ? `, pour ${c.origines.join(', ')}` : ''}`),
  );
  // Arrêté par Docker (une mise en ligne, un redémarrage) : il ferme ses lignes proprement.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void site.fermer().then(() => process.exit(0)));
}

export { configuration };
