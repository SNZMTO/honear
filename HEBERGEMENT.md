# Mettre Honear en ligne

Honear tourne sur un VPS OVH (Debian 13), dans un conteneur Docker construit depuis ce dépôt. Le VPS est partagé avec d'autres
sites : ce qui leur est commun, la machine durcie et le **frontal** (Caddy, seul à écouter le monde, qui tient le HTTPS de tous
les domaines), vit dans son propre dépôt, **`vps`** (`~/vps` sur le VPS). Ce dépôt-ci ne tient que le jeu.

```
téléphone ──HTTPS / WebSocket (wss)──▶ frontal (Caddy, dépôt vps) ──réseau « honear »──▶ honear:8080 (ce dépôt)
                                                                                           ├──▶ /var/lib/honear (les comptes)
                                                          réseau interne « honear-listes » ◀──┘
                                                          honear-mcp:8791 (le MCP, dépôt honear-mcp) : les listes sur mesure
```

Le réseau `honear-listes` naît avec le jeu (`internal: true` : on n'en sort pas) ; le MCP de Honear le rejoint, et le jeu y lit
les listes à l'adresse que donne `LISTES`. Tant que le MCP n'y est pas, une liste collée est introuvable, et rien d'autre ne change.

| Fichier | Rôle |
| --- | --- |
| `Dockerfile` | L'image du jeu : `npm run construire`, puis Node seul (ni npm ni sources), sans droits. Images figées à leur empreinte. |
| `deploiement/compose.yaml` | Le conteneur : aucun port ouvert, aucune capacité, lecture seule, mémoire et processus comptés. |
| `deploiement/mettre-en-ligne.sh` | À chaque version : construit l'image au commit courant, relance le jeu, vérifie qu'il répond. |
| `deploiement/courrier.sh` | Le courrier des comptes : l'adresse d'envoi et son mot de passe, que tu tapes toi-même. |

## Ce qu'il te faut

- **Le VPS préparé** par le dépôt `vps` (`sudo sh preparer.sh` : Docker, durcissement, pare-feu), et son frontal en ligne.
- **Le domaine honear.fr** qui pointe sur le VPS (zone DNS chez OVH : `A` pour `honear.fr` et `www` vers `IP_DU_VPS`).
- **Une adresse e-mail** pour envoyer les liens de connexion des comptes (`bonjour@honear.fr`, voir « Les comptes »). Sans elle,
  le jeu marche ; seuls les comptes sont fermés.

## Mettre une version en ligne

```
npm test && npm run controle && git commit … && sudo sh deploiement/mettre-en-ligne.sh
```

Le script refuse un dépôt qui a des changements non commités (ce qui est en ligne est toujours un commit), et attend que personne
ne joue (`--maintenant` pour passer outre) : les rooms vivent en mémoire, une mise en ligne ferme les parties en cours. Les comptes,
eux, restent. La première fois, il crée l'utilisateur `honear` (à qui appartiennent les comptes) et leur dossier. Il construit
`honear:<commit>`, pose `compose.yaml` dans `/srv/honear`, relance le jeu, garde les trois dernières images et vérifie que le site
répond par le frontal.

**Revenir en arrière** sans reconstruire : changer `VERSION` dans `/srv/honear/.env` pour une des images gardées
(`sudo docker image ls honear`), puis `sudo docker compose --project-directory /srv/honear up -d`.

## Vérifier, surveiller

- `https://honear.fr/sante` : combien de rooms vivent, combien de téléphones sont branchés, si la musique est là, et si les
  comptes sont ouverts (`"comptes":"ouverts"`), fermés (le courrier n'est pas réglé) ou illisibles (`comptes.json` ne se relit
  pas : le jeu ne le réécrit jamais, le journal dit pourquoi ; répare-le, ou mets-le de côté, puis relance le jeu).
- `sudo docker compose --project-directory /srv/honear ps` : l'état du jeu (il dit s'il est en bonne santé).
- `sudo docker compose --project-directory /srv/honear logs --tail 100` : ce qu'il dit (aussi dans `journalctl -t honear-jeu-1`).
- Un navigateur qu'on n'a pas sous la main (l'iPhone) : l'ouvrir sur `https://honear.fr/?diagnostic`, jouer, puis lire
  `sudo docker compose --project-directory /srv/honear logs | grep Diagnostic`. Chaque connexion a son numéro : le navigateur, la
  fenêtre et ses changements, le champ où l'on tape, chaque essai de jouer le son et ce que le navigateur en a dit. Rien d'autre :
  ni adresse IP, ni ce qu'on tape.
- Il repart seul s'il tombe, et au démarrage de la machine.

## Pourquoi ça ne traîne pas

- **Le serveur décide de tout, avec une seule horloge.** Chaque téléphone lui demande l'heure plusieurs fois en se branchant, puis
  toutes les dix secondes, et garde la réponse que le réseau a le moins retardée : tous les téléphones jouent le décompte, l'extrait
  et la révélation à la même heure, celle du serveur.
- **On prévient avant d'agir.** L'extrait part un instant après que tous les téléphones se sont dits prêts (le temps que le bras
  descende) : chacun le sait à l'avance et le joue à l'heure dite, quel que soit son retard sur le réseau. Un téléphone en retard
  saute des étapes, il ne décale jamais la partie.
- **Les messages sont petits** : un événement à la fois, en JSON. La page arrive une fois, compressée par Caddy, puis plus rien
  que ces messages.
- **Le VPS est en France** (Strasbourg) : près des joueurs.
- **Une ligne qui tombe se rebranche toute seule**, tout de suite quand le téléphone revient au premier plan ou retrouve le réseau ;
  il redonne son jeton et retrouve sa place. Recharger la page ne casse rien.

## Ce qui protège le jeu

- HTTPS partout ; le certificat se renouvelle seul.
- La page n'exécute que son propre script, reconnu à son empreinte (politique de sécurité stricte), et ne parle qu'à son serveur.
- Le serveur ne croit rien sur parole : chaque message est vérifié (forme, taille, valeurs), un téléphone ne peut pas inonder le
  serveur, ni essayer des codes au hasard sans être coupé ; une page venue d'un autre site ne peut pas s'y brancher.
- Chaque joueur a un jeton secret pour revenir à sa place : connaître l'identifiant d'un autre ne permet pas de la lui prendre.
- Le jeu tourne dans un conteneur sans droits : aucune capacité, rien à gagner en route, un système de fichiers en lecture seule,
  le dossier des comptes pour seul endroit où écrire, et aucun port ouvert ; seul le frontal le joint, par son réseau. La machine
  elle-même (SSH par clé, pare-feu, fail2ban, mises à jour automatiques) est décrite dans le dépôt `vps`.
- Un compte s'ouvre sans mot de passe, par un lien qui ne sert qu'une fois ; le téléphone garde un secret de session, que le serveur
  ne garde qu'en empreinte.

## La musique : Deezer

Le serveur va chercher la musique lui-même, depuis le VPS : l'API publique de Deezer (`api.deezer.com`, sans clé ni compte) pour les
playlists et leurs extraits de 30 secondes. Rien à configurer : il suffit que le VPS sorte sur Internet, ce qu'il fait d'origine. Les téléphones, eux, jouent les extraits
directement depuis les serveurs de Deezer : aucun son ne passe par le VPS, ni n'y est gardé.

- **Deezer** admet 50 appels par 5 secondes : le serveur en fait 40 au plus, attend quand Deezer dit qu'on va trop vite, et garde ce qu'il
  a lu (une recherche une heure, une playlist dix minutes, ses liens d'extraits expirant).
- **Spotify** : le jeu n'en lit rien. Son API ne donne plus le contenu d'une playlist qu'à son propriétaire connecté (depuis février
  2026), ses règles pour les développeurs interdisent d'en faire un jeu, quiz compris, et ses conditions interdisent qu'un programme
  lise ses pages. Un lien Spotify collé dans le bac est donc refusé, sans qu'aucune requête parte vers Spotify : le bac propose un lien
  Deezer, ou une playlist sur mesure faite avec le MCP de Honear.
- **Les conditions de Deezer** : les extraits de 30 secondes sont permis à tous par l'API, et il est interdit d'en garder le son ; le bac
  cite Deezer. Pour un jeu public à grande échelle ou payant, lis d'abord ses conditions d'utilisation et ses règles sur le logo
  (developers.deezer.com).

## Les comptes : l'e-mail des liens de connexion

Un compte se crée en tapant son adresse : le serveur y envoie un lien qui fait entrer, une fois, pendant un quart d'heure. Pour
envoyer ces e-mails, il lui faut le serveur d'envoi (SMTP) d'une boîte e-mail. Le plus simple : une adresse à ton domaine chez OVH
(`bonjour@honear.fr`), créée dans l'espace client (Web Cloud → E-mails ; l'offre MX Plan ou Zimbra Starter). Tout service
d'envoi qui donne un accès SMTP chiffré sur le port 465 marche aussi.

Règle-les toi-même, dans un vrai terminal (le mot de passe ne s'affiche pas, et ne passe que par le fichier) :

```
sudo sh deploiement/courrier.sh
```

Il demande l'adresse, son serveur d'envoi (proposé : `ssl0.ovh.net`, celui d'OVH) et son mot de passe, les garde dans
`/etc/honear/courrier.env` (que seul root lit ; Docker le passe au jeu), relance le jeu et envoie un e-mail d'essai.
Le fichier ressemble à ceci :

```
COURRIER_HOTE='ssl0.ovh.net'
COURRIER_PORT='465'
COURRIER_UTILISATEUR='bonjour@honear.fr'
COURRIER_MOT_DE_PASSE='le mot de passe de cette adresse'
COURRIER_DE='bonjour@honear.fr'
```

(Entre apostrophes droites, une valeur peut porter des espaces et des signes, sauf une apostrophe droite.) Un e-mail d'essai,
qui dit pourquoi s'il ne part pas (un mot de passe refusé : « 535 ») :

```
sudo docker compose --project-directory /srv/honear exec jeu node /jeu/serveur.mjs --essai-courrier toi@exemple.fr
```

Tant que `COURRIER_HOTE` est vide, les comptes sont fermés : le jeu marche, et l'écran du compte dit qu'aucun e-mail ne part.
Pour que les liens n'arrivent pas dans les indésirables, vérifie dans la zone DNS l'enregistrement SPF du domaine (OVH le pose pour
ses e-mails : `v=spf1 include:mx.ovh.com ~all`), et active DKIM dans l'espace client si ton offre le propose.

- **Ce qui est gardé** : pour chaque compte, son adresse e-mail, sa pochette, ses parties jouées et gagnées, ses dates de création
  et de dernière visite, et l'empreinte scrypt de son mot de passe s'il en a choisi un. Rien d'autre. Le fichier est
  `/var/lib/honear/comptes.json`, que seul l'utilisateur `honear` (celui du conteneur) lit ; il ne contient aucun secret (des
  sessions et des mots de passe, seulement l'empreinte).
- **Les mots de passe** : facultatifs ; le lien par e-mail marche toujours. Cinq essais par compte et par quart d'heure, vingt par
  heure depuis une adresse ; un mot de passe changé prévient l'adresse du compte et fait sortir ses autres téléphones.
- **Un joueur demande ses données** : `sudo sh deploiement/donnees.sh son@adresse.fr`, à lancer toi-même (voir `RGPD.md`).
- **Ce qui s'efface seul** : un compte où personne ne revient depuis deux ans, prévenu un mois avant par e-mail.
- **Effacer** : chacun efface son compte lui-même, depuis l'écran du compte ; tout part avec.
- **Les envois sont limités** : un lien par adresse et par minute, cinq par heure ; dix par heure depuis un même téléphone ; trois cents
  par jour en tout. De quoi ne pas faire de ton adresse un envoyeur de courrier indésirable.

## Les statistiques : la page de l'éditeur

`https://honear.fr/statistiques` ne montre rien sans sa clé. Le lien qui la porte, à ouvrir une fois sur chaque appareil (la page
garde la clé dans le navigateur et l'efface de son adresse) :

```
sudo sh deploiement/statistiques.sh
```

La clé est dans `/etc/honear/statistiques.env`, que seul root lit, tirée au sort à la première mise en ligne. Pour en changer :
`sudo rm /etc/honear/statistiques.env`, puis remettre le site en ligne ; l'ancien lien ne s'ouvre plus.

- **Ce qui est gardé** : des compteurs, dans `/var/lib/honear/statistiques.json`, jour par jour pendant treize mois, puis en
  totaux. Ni adresse IP, ni nom, ni e-mail, ni ce que les joueurs répondent. Les visiteurs se comptent par une empreinte de l'IP et
  du navigateur, mêlée à un sel tiré chaque jour, qui ne vit qu'en mémoire.
- **Ce que la page montre** : en ce moment (les rooms ouvertes), l'essentiel, jour après jour, les modes et les réglages, les
  joueurs, les réponses, la musique, le partage, les appareils, les premiers pas, les heures, les comptes, les records ; sur un
  jour, 7, 30 ou 90 jours, ou depuis le début, avec l'écart à la période d'avant.

## Ce que ça coûte

Le VPS, et le domaine. Rien d'autre : pas de base de données (les comptes tiennent dans un fichier), et l'e-mail des liens part par
une adresse que tu as déjà.
