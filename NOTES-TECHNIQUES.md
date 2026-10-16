# Honear — notes techniques

Ce qu'il faut savoir pour continuer le code : la pile, les couches, l'arborescence, le contrat d'un mode, les messages, et la marche
à suivre pour ajouter un mode, une source de musique ou une pièce de personnage. À la fin, trois modes ajoutés sans toucher au socle,
et la façon dont les animations se jouent en direct.

## La pile

TypeScript strict partout, sans framework, avec six outils : `tsx` pour lancer, `node:test` pour les tests, esbuild pour assembler
le script d'une page, Prettier, opentype.js pour tracer les textes, qrcode-generator pour le QR code du salon. Le serveur ajoute
`ws`. Trois raisons :

1. **Une seule langue des deux côtés.** Les règles et les messages sont le même code sur le serveur et sur le téléphone : un téléphone rejoue le journal que le serveur publie, et voit ce que le serveur voit.
2. **Un serveur qui tient en un processus Node avec `ws`.** Les rooms vivent en mémoire avec leur horloge, les appels à Deezer passent par un cache. Pas de base, pas de compte, pas de framework web.
3. **Un téléphone sans framework d'interface.** L'écran est une scène dessinée une fois puis réglée (des transformations et des opacités), pas un arbre de composants à réconcilier. esbuild en fait un seul script ES2019, que lit un téléphone d'il y a cinq ans.

## Les couches

Chaque couche ne lit que celles qu'elle a le droit de lire. `tests/sources.test.ts` le vérifie à chaque `npm test`, import par import,
avec la table `LECTURES`.

| Couche | Ce qu'elle est | Elle lit |
| --- | --- | --- |
| `ressources/` | Des données, jamais du code qui décide : palette, typo, textes, réglages, mesures, matières du mouvement, pièces de l'avatar. | `ressources` |
| `regles/` | La machine à états pure : une room, ses joueurs, ses pistes, les modes, le jugement, les messages. Ni écran, ni réseau. | `regles`, `ressources` |
| `mouvement/` | Le moteur : ressorts, glissades, chutes, partitions, rejeu. Il ne sait rien du meuble. | `mouvement` |
| `lowpoly/` | Les formes, la projection, la fonction d'ombrage, les tons. | `lowpoly`, `ressources` |
| `scene/` | Le meuble et ses objets : chaque objet se dessine, se règle et a ses gestes, d'après l'état qu'on lui donne. Il ne touche pas au jeu. | `scene`, `lowpoly`, `mouvement`, `regles`, `ressources`, `lexique` |
| `ecran/` | La page d'un navigateur : le montage d'une scène (toiles et SVG), la boucle d'images, l'horloge, le vibreur. Seule à toucher au document. | `ecran`, `scene`, `lowpoly`, `regles`, `ressources`, `lexique` |
| `planche/` | Les documents de travail, étape par étape : pages, images arrêtées, planche d'animations. | tout |
| `serveur/` | Les rooms en mémoire, leur horloge, les connexions ; ce qu'on lit des sources de musique (`sources/`). Ni écran, ni réseau : on lui donne l'heure, et les pistes déjà lues. | `serveur`, `regles`, `ressources` |
| `reseau/` | Le site en ligne : la page, les WebSockets, la minuterie, les appels à Deezer et à Spotify. Seule, avec les planches, à toucher au réseau. | `reseau`, `serveur`, `regles`, `ressources` ; Node, `ws` |

Les autres règles vérifiées par les tests : un module dit son rôle avant son premier export ; pas de module fourre-tout ; pas de
`Math.random` (le hasard est semé) ; un nom de calque commence par un mot du lexique (`lexique.ts`) ; dans `mouvement/`, `scene/piste/`,
`scene/gestes/` et `ecran/`, un nombre à virgule a un nom ; la projection n'est lue que par `lowpoly/projection` et la transformation
du rendu.

## L'arborescence

```
src/
  lexique.ts                 les mots du jeu, un nom par chose : room, piste, pochette, pastille, platine, bras, bac…
  ressources/                les données
    palette, typo, textes(.fr), reglages, mouvement, densites, cadrages, projection, lampe, finis, vibrations, touches,
    meuble, platine, ampli, bac, kraft, etiquette, verso, pastilles, tablee, recompenses, vignettes, pochettes, avatar, ecran
  regles/                    la machine à états
    partie.ts                la room : le journal rejoué donne l'état ; points, têtes, classement, numéro de la piste, équipes
    piste.ts                 une piste : décompte, extrait, révélation, et ce qu'il faut trouver (la réponse)
    jugement.ts              juger une saisie : accents, « feat. », parenthèses, fautes de frappe, « Presque. »
    pochette.ts              la pochette d'un joueur : son tirage au sort, son nom
    messages.ts              le contrat du transport : actions, nouvelles, journal publié
    modes/                   contrat.ts, index.ts (le registre), libre.ts, quatre-choix.ts
  mouvement/                 moteur, ressort, glissade, chute, choregraphie, parcours, portage, volant, rejeu
  lowpoly/                   vecteurs, polygones, contours, projection, ombrage, ombrePortee, facette, tons, couleur, aleatoire, boucle
    formes/                  boite, bouton, cylindre, disque, dome, drape, galet, nez, plaque, plot, rosace, tete, veine
  scene/                     les objets du meuble ; chacun : son dessin, son régleur, ses gestes
    calque, reglage, ombre, pile, poignee, pastille, papier, touche, texte, encre, typographie, phrases, memoire, retouche,
    kraft, logo, qr, vinyle, vignette, avatar, recompense, tablee
    meuble/                  le noyer, la nappe de lumière, le regard du téléphone
    platine/                 socle, plateau, bras, levier, boutons, interrupteurs, gravures, commandes
    disque/, etiquette/      le disque, son étiquette (logo, code, piste, arcs, réponse), son verso
    ampli/, bac/, pochette/  l'ampli et ses vumètres, le bac et ses playlists, la pochette (carton, motifs, dos)
    piste/                   la chorégraphie d'une piste : partition, pose, régleurs, version sobre ; gestes/ : chutes, retournement…
    gestes/                  les gestes de la tablée et du meuble : geste.ts (le contrat), tablee.ts, meuble.ts
    telephone/               les écrans du téléphone, ceux du jeu et des planches : pieces, meuble, kraft, pochette, ecrans, piste, reponse
    rendu/                   SVG, toile, emprise, inventaire, contrôles du rendu
  ecran/                     montage/ (chantier, figes, vivants, poignees…), boucle, horloge, navigateur, polices, piste, vibreur…
    telephone/               le client : memoire.ts (ce que le serveur a dit, ce qu'on fait), route.ts (l'écran), touchers.ts, client.ts,
                             heure.ts, websocket.ts, son.ts (le haut-parleur)
  reseau/                    le site en ligne : index.ts (entrée, minuterie), porte.ts (HTTP), ligne.ts (WebSocket), horloge.ts,
                             musique.ts (Deezer et Spotify : appels, limites de débit, ce qu'on garde)
  serveur/
    room.ts                  une room : son journal, le déroulé de sa piste, sa playlist, ceux qui y sont branchés ; elle décide de tout
    serveur.ts               les rooms par leur code, les connexions des téléphones, une seule horloge
    sources/                 essai.ts, deezer.ts, spotify.ts, liens.ts : ce qu'on demande aux sources, et ce qu'on lit de leurs réponses
  planche/                   etape1.ts … etape7.ts et leurs dossiers ; animations/ : les animations jouées en direct ;
                             prototype/ : la partie scénarisée (scenario.ts), les cinq potes simulés (potes.ts), la page (demarrage.ts)
tests/                       un fichier par sujet ; modes-d-exemple.ts : les trois modes de la fin de ces notes
outils/                      controler.ts (les contrôles du rendu), assembler, banc, pellicule, captures
```

## Le contrat d'un mode

Un mode est un module qui déclare tout ce qui le distingue (`regles/modes/contrat.ts`) :

```ts
export interface ModeDeJeu {
  readonly cle: string;                          // son nom : les textes le nomment (textes.commandes.modes[cle])
  readonly cran: number;                         // son cran sur le sélecteur rotatif de la platine (cinq crans gravés)
  readonly reglages: Readonly<Record<string, number>>;  // ses réglages propres : { choix: 4 } en 4 choix
  readonly phases: readonly PhaseDePiste[];      // décompte, extrait, révélation
  readonly sousLePouce: 'etiquetteVierge' | 'etiquettesAToucher';  // ce que le joueur a sous le pouce pour répondre
  aTrouver(piste: PisteDuMode): readonly string[];                 // une pastille par partie : artiste, titre, feat…
  juger(proposition: Proposition, piste: PisteDuMode, dejaTrouve: readonly string[]): Jugement;  // ce qu'elle trouve, son verdict
  points(trouve: readonly string[], premierATout: boolean): number; // le barème
  readonly etiquette: 'arcsPuisReponse';         // ce que montre l'étiquette du disque
  readonly bras: 'chrono';                       // ce que fait le bras
  readonly extrait?: number;                     // la durée d'extrait qu'il impose ; sinon, celle du bouton « Extrait »
  departager?(piste: PisteDuMode, propositions: readonly PropositionDeLaPiste[]): Readonly<Record<string, number>>;
                                                 // les points de la révélation, quand une réponse ne vaut qu'au regard des autres
  readonly equipes?: number;                     // en combien d'équipes il range les joueurs
}
```

Le socle (la room, les joueurs, l'horloge, la playlist, le son, le meuble) ne connaît aucun mode par son nom. Il lit le mode de la room
dans le registre (`MODES[etat.mode]`, dans `regles/partie.ts`, et dans `regles/messages.ts` pour publier le départage) et n'en appelle que
le contrat :
`juger` et `points` à chaque réponse, `aTrouver` pour savoir si un joueur a tout trouvé, `departager` à la révélation,
`dureeDeLExtrait(mode, réglée)` au lancement d'une piste, `equipesDeLaPartie(mode, état)` pour le classement et la tablée. Saisie libre
et 4 choix sont écrits avec ce contrat, et rien d'autre.

## Les messages

Une connexion WebSocket par joueur. Les téléphones n'envoient que des actions ; le serveur décide de tout, date tout de son horloge
et publie un événement à la fois. Tout est dans `regles/messages.ts`, typé, partagé par le serveur et les téléphones.

**Ce qu'un téléphone envoie (`Action`)**

| Action | Ce qu'elle porte | Quand |
| --- | --- | --- |
| `creer` | `mode`, `pistes`, `extrait`, `son` (`tous` ou `hote`), `playlist`, `pochette` | l'hôte ouvre la room, ses réglages lus sur la platine, la playlist prise dans le bac |
| `rejoindre` | `code`, `pochette`, et `jeton` s'il revient | un invité arrive par le code ou le QR code ; un joueur revient (page rechargée, réseau retrouvé) et retrouve sa place |
| `quelleHeure` | `depart` (l'heure du téléphone) | en se branchant, puis toutes les 10 s : l'horloge du téléphone se règle sur celle du serveur |
| `chercher` | `recherche` | dans le bac, avant la room : un thème touché, une recherche tapée |
| `importer` | `lien` | dans le bac : le lien d'une playlist Deezer ou Spotify, collé |
| `demanderUnLien` | `email` | l'écran du compte : un lien de connexion, à cette adresse |
| `ouvrirLeCompte` | `lien` (le secret du lien) | « Entrer », sur la page que le lien a ouverte |
| `reprendreLeCompte` | `session` | en se branchant, si le téléphone est entré dans un compte |
| `sortirDuCompte`, `effacerLeCompte` | — | depuis l'écran du compte |
| `pret` | — | son ampli est allumé et l'extrait de la piste est chargé |
| `lancer` | — | l'hôte lance la face A, ou la piste suivante |
| `repondre` | `proposition` : `{ saisie, texte }` ou `{ choix, rang }` | pendant l'extrait |
| `rejouer` | — | « Rejouer la face B » |
| `quitter` | — | il s'en va pour de bon |

**Ce que le serveur envoie (`Nouvelle`, toujours avec son `heure`)**

| Nouvelle | Ce qu'elle porte | Quand |
| --- | --- | --- |
| `etat` | `code`, `toi`, `journal` (le journal publié en entier), `seance` (le déroulé de la piste en cours) | à chaque connexion et reconnexion |
| `evenement` | un événement du journal publié | à chaque fois qu'il se passe quelque chose |
| `piste` | `lancer` (le décompte part, la durée de l'extrait, et son adresse à précharger), `prets` (tous chargés : l'extrait part à cette heure), `reveler` (avec la réponse) | le déroulé d'une piste |
| `etat` (suite) | `jeton` (le secret de ce joueur), `extrait` (l'adresse de celui de la piste en cours) | |
| `heure` | `heure`, `depart` (celui de la question) | la réponse à `quelleHeure` |
| `playlists` | `recherche`, `playlists` (`lien`, `titre`, `total`) | ce que Deezer a trouvé |
| `importee` | `playlist` (`lien`, `titre`, `total`, `jouables`) | la playlist d'un lien collé, lue |
| `lienEnvoye` | `email` | le lien de connexion est parti |
| `compte` | `compte` (`email`, `pochette`, `parties`, `victoires`), et `session` à l'entrée seulement | dans son compte |
| `horsCompte` | — | sorti, effacé, ou sa session a expiré |
| `refus` | `codeInconnu`, `complet`, `tropCourt`, `spotify` (une playlist Spotify privée), `introuvable` ; pour les comptes, `adresse`, `tropDeLiens`, `lienPerime`, `comptesFermes` | une action refusée, dite dans la voix du site |

**Les événements du journal (`EvenementDePartie`)** : `ouverture` (mode, nombre de pistes, qui joue le son), `arrivee` (avec la pochette), `deconnexion`,
`retour`, `depart`, `extrait` (la piste), `reponse` (la proposition), `jugee` (ce qu'elle trouve, son verdict, ses points, et si le joueur
a tout trouvé), `revelation` (la réponse, et le départage s'il y en a un).

**Ce que le serveur garde pour lui.** Il tient le vrai journal ; il n'envoie que `publier(journal)`. Ce journal-là a l'extrait sans la
réponse (`REPONSE_MASQUEE`) ni rien qui y mène (il n'en garde que les étiquettes du 4 choix : ni l'identifiant Deezer, ni les surnoms,
ni l'anecdote), chaque `reponse` remplacée par sa `jugee` (ce qu'elle vaut, jamais ce qui a été tapé), et la révélation avec la réponse,
son anecdote s'il y en a une, et le départage. Rejoué par un téléphone, il donne exactement les mêmes points, les mêmes têtes, le même classement :
`tests/messages.test.ts` le vérifie à chaque instant d'une partie, et vérifie que le titre n'apparaît nulle part avant sa révélation.

**Recharger ne casse rien.** À la connexion, le téléphone reçoit `etat`, rejoue le journal (`partieA`) et le déroulé de la piste
(`jouer`), et retrouve le même écran ; il redonne son jeton (`rejoindre` avec `jeton`, un secret que lui seul a reçu) et retrouve sa place. Le son se cale sur l'heure
du serveur : l'extrait part quand tous les appareils attendus sont prêts, ou trois secondes après la fin du décompte sans les
retardataires, qui le rejoignent au bon endroit (`DEROULE.attente`).

**Le serveur** (`serveur/`). `demarrerLeServeur({ maintenant, tirage, playlist })` tient les rooms ; `connecter(recevoir)` rend une
connexion qui n'envoie que des actions. La room fait arriver ce qui doit arriver quand on lui donne l'heure (`avancer`) : l'extrait qui
part, la révélation à la fin de l'extrait. Le vrai serveur le branchera sur `ws` et sur un minuteur ; le prototype le fait tourner dans la
page, avec les cinq potes simulés, qui lui parlent par les mêmes messages. `tests/serveur.test.ts` et `tests/prototype.test.ts` le jouent
de bout en bout, en libre et en 4 choix.

**Le client** (`ecran/telephone/`). `ouvrirLeTelephone(cadre, { brancher, horloge, ecritoire, preparatifs, … })` : `brancher` est un
`Brancher` (`regles/messages.ts`), la seule chose que le client sait du serveur. Sa mémoire (`memoire.ts`) est pure : `recevoir` y range
chaque nouvelle, `toucher` rend la mémoire d'après et les actions à envoyer, `avancer` fait passer le temps (le clavier qui tape).
`ecranDuTelephone` (`route.ts`) en tire l'écran à l'heure du serveur ; le client le monte (`scene/telephone/` le dessine), ou ouvre la
piste (`ouvrirLEcranDeLaPiste`) et pose autour d'elle, dans sa couche, l'éventail et les étiquettes. Chaque calque qu'on peut toucher a
sa zone, un bouton de la page (`touchers.ts`). En ligne, le `Brancher` est un WebSocket (`websocket.ts`) qui se rebranche tout seul
et dit quand la ligne tombe ; le téléphone redonne alors son jeton. `tests/telephone.test.ts` joue la partie au téléphone, sans
navigateur, contre le serveur et les potes.

**En ligne** (`reseau/`, voir `HEBERGEMENT.md`). `lancerLeSite(configuration())` sert la page (`porte.ts`, politique de sécurité à
l'empreinte du script), branche chaque WebSocket au serveur du jeu (`ligne.ts` : `lireUneAction` avant tout, un débit plafonné, un
battement toutes les 15 s, l'origine vérifiée), et réveille le serveur à son prochain rendez-vous, au plus tard chaque seconde.
L'heure : le téléphone envoie `quelleHeure` (cinq fois en se branchant, puis toutes les 10 s) et garde l'écart de la réponse revenue
le plus vite (`ecran/telephone/heure.ts`). `npm run construire` écrit `dist/index.html` et `dist/serveur.mjs` ; `tests/reseau.test.ts`
ouvre le site sur un port de la machine et y branche de vrais WebSockets.

## Les comptes

Facultatifs, avec ou sans mot de passe (`reseau/comptes.ts`). Le serveur envoie à l'adresse tapée un lien `https://site/#connexion=SECRET` :
le secret est dans l'ancre, qui ne passe dans aucun journal ; la page l'efface de son adresse et attend qu'on touche « Entrer ». Un
lien sert une fois, un quart d'heure ; il ouvre (ou crée) le compte de cette adresse, et donne au téléphone le secret d'une session
de six mois, qu'il garde (`localStorage`) et redonne en se branchant. Les liens vivent en mémoire ; les comptes et les sessions (leur
empreinte SHA-256, jamais le secret) dans un fichier JSON réécrit d'un coup à chaque changement. La ligne garde, pour chaque
téléphone, son compte et sa place dans la room ; à la fin d'une face, `quandUneFaceFinit` (le serveur du jeu) fait compter une partie
à chacun, une victoire au premier. Le courrier (`reseau/courrier.ts`) parle SMTP, chiffré d'emblée sur le port 465, avec `AUTH PLAIN`,
un message en texte et en HTML, en base 64. Les envois sont limités par adresse, par téléphone et par jour (`RESEAU.comptes`).

Le mot de passe, facultatif, se choisit dans le compte (`choisirUnMotDePasse`) ; on entre ensuite avec son adresse et lui
(`entrerAvecUnMotDePasse`), sans que la réponse dise si l'adresse a un compte (un leurre vérifié dans le même temps). Ce qu'il vaut
(`regles/mot-de-passe.ts`, le même au téléphone et au serveur) : huit signes au moins, 50 bits ou trois sortes de signes, pas
l'adresse dedans. Le serveur n'en garde qu'une empreinte scrypt (`reseau/mots-de-passe.ts` : « scrypt$coût$blocs$parallèle$sel$
empreinte », calculée hors du fil du jeu), compte les essais avant de vérifier (par compte, par téléphone), et le changement fait
sortir les autres sessions (la ligne prévient leurs téléphones) et prévient l'adresse. Au téléphone, le mot de passe ne vit que
dans la mémoire de l'étape ; l'écran n'en dessine que des points, et le champ est un vrai `type=password` (le trousseau du
navigateur le reconnaît).

## Les statistiques

Des compteurs, jamais qui (`reseau/statistiques.ts`) : par jour (heure de Paris, treize mois) et au total, plus quelques classements
(titres, playlists, recherches) et records. Trois sources : la porte compte les pages (un visiteur par jour : l'empreinte SHA-256 de
l'IP et du navigateur, salée d'un secret tiré chaque jour, gardée en mémoire), la ligne compte ce qu'elle voit (connexions, comptes,
bac) et ce que dit le téléphone (`statistique`, un mot d'une liste fermée), et les rooms racontent leurs faits (`serveur/faits.ts` :
ouverte, arrivée, lancer, réponse, révélation, face finie, fermée…). Le fichier est réécrit d'un coup, chaque minute s'il a changé.
`/statistiques.json` répond à la clé (`Authorization: Bearer`, comparée en temps constant) ; `/statistiques` est la page, avec sa
propre politique de contenu.

## Ajouter un mode

1. Un fichier `src/regles/modes/<cle>.ts` qui exporte un `ModeDeJeu`.
2. Une ligne dans le registre, `src/regles/modes/index.ts` : `MODES = { libre: LIBRE, quatreChoix: QUATRE_CHOIX, <cle>: <MODE> }`.
   Son `cran` est l'un des crans gravés encore libres (le sélecteur en a cinq ; les deux premiers sont pris).
3. Son nom et son barème dans les textes : `commandes.modes.<cle>` et `partie.bareme.<cle>` de `ressources/textes.fr.ts`.
4. Ses tests : son jugement et son barème, contre le socle (voir `tests/modes.test.ts`).

Rien d'autre : le sélecteur grave son nom sur son cran (`MODES_PAR_CRAN`), la partie le juge par le contrat, le serveur lui demande la
durée de l'extrait.

## Les sources de musique

Deezer donne les playlists et les extraits : son API publique (sans clé) rend des extraits MP3 de 30 secondes, dont les liens sont
signés et expirent. Spotify ne donne plus ni extraits, ni le contenu des playlists des autres (depuis février 2026) : une playlist
Spotify se lit sur sa page publique, et chacun de ses titres se retrouve chez Deezer, par artiste et par nom. Une liste sur mesure,
celle qu'un assistant (Claude, ChatGPT…) a faite avec le MCP de Honear (mcp.honear.fr, dépôt `honear-mcp`), se lit chez le MCP, et
chacune de ses pistes se relit chez Deezer par son identifiant. Le jeu garde une playlist sous un lien à lui : `deezer:1306931615`,
`spotify:37i9dQZF1DXcBWIGoYBM5M`, `liste:iTRYNDDqk3g0zBoA` ; la playlist d'essai est `essai:…`.

- `serveur/sources/deezer.ts`, `spotify.ts`, `liste.ts` : purs. Les adresses à demander, et la lecture de ce qui revient
  (`lireDesPistes`, `laBonnePiste`, `lireLaPage`, `lireLaListe`) ; jamais d'appel. `liens.ts` dit ce que désigne un lien collé.
- Une liste sur mesure se colle dans le bac par son lien (`https://honear.fr/?liste=<id>`, que le MCP donne), ou s'ouvre par
  lui : le bac de l'hôte s'ouvre alors dessus, comme collé (`listeOuverte`, dans la mémoire du téléphone). Le MCP la sert sur
  un réseau interne que seul le jeu rejoint (`honear-listes`, l'adresse est dans `LISTES` : `http://honear-mcp:8791/listes/<id>`) ;
  la lire, pour lui, c'est la jouer : elle vit de nouveau trente jours. Ses pistes portent des surnoms (d'autres réponses justes,
  « Matthieu Chedid » pour « -M- ») : `ciblesDe` les ajoute à ce que la saisie libre accepte, derrière le vrai nom, et ils restent au
  serveur. Une piste peut aussi porter une anecdote, de 160 signes au plus : elle ne part qu'avec la réponse révélée, et se lit sur
  un papier crème sous la platine (`papierDeLAnecdote`), cinq secondes de plus. Une liste dont la difficulté monte (`dans_l_ordre`)
  se joue dans son ordre (`gardeSonOrdre`), sans être mélangée. Plus courte que la face réglée, les réglages la règlent sur la plus
  longue face qu'elle remplit.
- Deezer est partagé : le jeu et le MCP sortent par la même adresse, et Deezer compte 50 appels par 5 secondes pour les deux. Le jeu
  en fait 30, le MCP 10 (`ressources/reseau.ts`, et `ressources/reglages.py` du MCP).
- `reseau/musique.ts` appelle : une limite de débit par service, une file plafonnée, des réponses gardées (une recherche une heure, une
  playlist dix minutes et jamais jusqu'à moins de deux minutes de l'expiration de ses liens), une lecture à la fois par playlist, une
  relecture en coulisses quand elle va expirer. Le serveur du jeu ne voit que `pistes(lien)`, déjà lues ; la ligne (`reseau/ligne.ts`)
  les fait lire avant d'ouvrir une room et avant chaque piste lancée, et répond à `chercher` et `importer`. Les invités d'une piste
  (le feat) ne sont ni dans la liste d'une playlist ni, souvent, dans son titre : chaque fois qu'une room relit ses pistes, elle dit
  celles qui viennent (`bientot`), et la musique lit la fiche (`/track/{id}`, ses `contributors`) des trois prochaines qu'elle ne
  connaît pas (`preciser`), gardée un jour ; `pistes(lien)` les rend avec leur feat.
- Le téléphone joue l'extrait (`ecran/telephone/son.ts`) : `sonVoulu(mémoire)` dit quoi et quand, le haut-parleur le joue à l'heure du
  serveur. La page autorise les extraits de Deezer et ses images de pochettes, rien d’autre (`media-src https://*.dzcdn.net blob:`,
  `img-src data: blob: https://*.dzcdn.net`) : la vraie pochette est une image de la page posée par-dessus la scène, jamais peinte sur une toile.

Pour ajouter une source : un module pur dans `serveur/sources/`, son genre de lien dans `liens.ts`, sa lecture dans `preparer`
(`reseau/musique.ts`), et ses tests contre un faux (voir `tests/musique.test.ts`). Une réponse (`Reponse`, dans `regles/piste.ts`)
ne dépend d'aucune source : titre, artiste, feat, année, et la pochette en image ou en vignette.

## Ajouter une pièce de personnage

L'avatar est une donnée : `ressources/avatar.ts`. Une pièce (ce qu'on porte sur la tête) est une liste de morceaux posés d'après la
forme de la tête, jamais à la main : une `calotte` (cheveux, bonnet), un `bord` (revers, visière), une `boule` (pompon, chignon), un
`casque`.

1. Une entrée dans `DESSUS` : `beret: [{ genre: 'calotte', couleur: 'tenue', frange: -34, cotes: -20, debord: 5, rehausse: 4, relief: 8 }]`.
2. Son nom dans les textes : `pochette.dessus.beret`.

L'écran « Fais ta pochette » la propose aussitôt, « Au hasard » peut la tirer, et `tests/fais-ta-pochette.test.ts` la passe aux
contrôles de rendu avec les autres ; il refuse une pièce sans nom dans les textes. Il faut du code seulement pour une sorte de morceau qui n'existe pas encore (des lunettes) : un
genre de plus dans `Morceau` et son dessin dans `scene/avatar.ts`. Le compilateur montre l'endroit, parce que le `switch` sur les genres
y est exhaustif.

## Trois modes sans toucher au socle

Ils sont écrits dans `tests/modes-d-exemple.ts`, avec le contrat seul, et `tests/modes.test.ts` les fait jouer contre le socle. Pour
en faire de vrais modes, il suffit de suivre « Ajouter un mode » ci-dessus. Leurs écrans ne sont pas dessinés.

**« Année »** : deviner l'année de sortie, le plus proche marque.

```ts
export const ANNEE: ModeDeJeu = {
  cle: 'annee', cran: 2, reglages: {}, phases: ['decompte', 'extrait', 'revelation'],
  sousLePouce: 'etiquetteVierge',                    // on tape une année sur l'étiquette vierge
  aTrouver: () => ['annee'],
  juger(proposition, piste) { … },                   // la bonne : 'juste' ; à deux ans près : 'presque' ; sinon : 'faux'
  points: (trouve) => (trouve.length > 0 ? 2 : 0),   // la bonne année vaut 2 points
  departager(piste, propositions) { … },             // personne ne l'a ? le plus proche marque 1 point (les ex æquo aussi)
  etiquette: 'arcsPuisReponse', bras: 'chrono',
};
```

Le socle garde la dernière proposition de chaque joueur (`PisteEnCours.propositions`) et appelle `departager` à la révélation. Comme
les téléphones ne connaissent pas les propositions des autres, le serveur publie le départage avec la révélation. Il faut que la source
donne l'année (`Reponse.annee`) : Deezer la donne avec l'album.

**« Intro express »** : 3 secondes d'extrait.

```ts
export const INTRO_EXPRESS: ModeDeJeu = { ...LIBRE, cle: 'introExpress', cran: 3, extrait: 3 };
```

La saisie libre, telle quelle. Le serveur lance chaque piste avec `dureeDeLExtrait(mode, réglée)` : 3 secondes, quel que soit le bouton
« Extrait ». Le bras et l'étiquette suivent la durée de la séance, comme pour les 10, 20 ou 30 secondes d'aujourd'hui.

**« Équipes »** : les pochettes se rangent en deux piles.

```ts
export const EQUIPES: ModeDeJeu = { ...LIBRE, cle: 'equipes', cran: 4, equipes: 2 };
```

`equipesDeLaPartie(mode, état)` répartit les joueurs à tour de rôle, dans l'ordre d'arrivée, met leurs points en commun et classe les
équipes (les ex æquo partagent leur rang). Le hit-parade et la finale classent les équipes ; la tablée range les pochettes en autant de
piles que d'équipes. Ces piles sont la seule chose qui reste à dessiner, dans l'objet tablée : rien dans le socle.

## Les animations jouées en direct

Un geste (`scene/gestes/geste.ts`) dit, pour chaque grandeur qu'il fait bouger, sa valeur de départ et ses pas. Chaque pas a son
instant, sa consigne et ce qui le porte : un ressort (raideur, amortissement, masse), une glissade (son frein), une chute qui claque, ou
une loi écrite (régulière, ou propre au geste). Le moteur (`mouvement/moteur.ts`) suit la partition du geste ; la version sobre met chaque
grandeur, d'un coup, à l'arrivée de son dernier pas parti.

Une animation (`planche/animations/animation.ts`) est une part du meuble dessinée une fois, un geste, et un régleur : ce que le geste
règle sur la scène, d'après les valeurs de l'instant. Ce ne sont que des transformations et des opacités. Les régleurs des objets
(`reglerLaPochette`, `reglerUnePastille`, `reglerUnDisqueRemis`, `reglerLaBascule`, `reglerUnePlaylist`, `reglerLAmpli`, la poignée) rendent
exactement ce que le dessin rendrait : `tests/animations.test.ts` compare les SVG. Pour interrompre une animation, on donne au moteur la
partition d'un autre geste (`interrompre`) : chaque grandeur repart d'où elle est, avec sa vitesse. Le test le vérifie pour chaque
animation : rien ne saute.

La même définition sert deux fois :
- les pellicules de l'étape 5, arrêtées aux instants marquants ;
- la planche vivante de l'étape 7, montée par `ecran/montage` et jouée image par image, au ralenti (×0,5, ×0,25), en version sobre, et
  interrompue à mi-course. Sa frise des temps est la seule du projet.

Le décompte, l'extrait, la rayure et la révélation du disque sont joués par l'atelier de l'étape 2, avec la même mécanique.
