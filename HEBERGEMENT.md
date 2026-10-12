# Mettre Miel d'oreilles en ligne, sur un VPS, avec Docker

Le jeu tourne dans deux conteneurs. **Caddy**, seul à écouter le monde, tient le HTTPS (il prend et renouvelle seul ses
certificats) ; **le jeu**, une image construite depuis ce dépôt, n'ouvre aucun port et ne se joint que par Caddy.

```
téléphone ──HTTPS / WebSocket (wss)──▶ caddy :443 ──▶ jeu :8080 (réseau des conteneurs)
                                                        └──▶ /var/lib/miel-doreilles (les comptes)
```

| Fichier | Rôle |
| --- | --- |
| `Dockerfile` | L'image du jeu : `npm run construire`, puis Node seul (ni npm ni sources), sans droits. Images figées à leur empreinte. |
| `deploiement/compose.yaml` | Les deux conteneurs : sans capacités, en lecture seule, limités en mémoire et en processus. |
| `deploiement/Caddyfile` | Le HTTPS, les en-têtes de sécurité, le renvoi de l'ancien domaine. Aucune visite n'est journalisée. |
| `deploiement/preparer-le-vps.sh` | Une fois (il se relance sans rien casser) : Docker, le durcissement, le pare-feu, les domaines. |
| `deploiement/mettre-en-ligne.sh` | À chaque version : construit l'image au commit courant et relance les conteneurs. |
| `deploiement/courrier.sh` | Le courrier des comptes : l'adresse d'envoi et son mot de passe, que tu tapes toi-même. |
| `deploiement/systeme/` | Le durcissement de la machine, que `preparer-le-vps.sh` installe. |

## Ce qu'il te faut

- **Un VPS Debian 13** (le plus petit d'OVH suffit largement), commandé avec **ta clé SSH**, sans mot de passe.
- **Un nom de domaine** qui pointe sur lui, pour le HTTPS : un téléphone ne se branche en WebSocket sécurisé qu'à une adresse
  qui a un certificat. Ici : **honear.fr**. Le VPS porte aussi **mateosan.fr**, qui accueillera un autre site : en attendant, il
  montre une page d'attente, et ne mène pas au jeu.
- **Une adresse e-mail** pour envoyer les liens de connexion des comptes (voir « Les comptes »). Sans elle, le jeu marche ; seuls
  les comptes sont fermés.

## 1. Le domaine pointe sur le VPS (une fois)

Dans la zone DNS du domaine, chez ton registrar :

| Sous-domaine | Type | Cible |
| --- | --- | --- |
| *(vide)* | `A` | l'IPv4 du VPS (`IP_DU_VPS`) |
| `www` | `A` | la même |

Supprime les enregistrements `A` et `AAAA` que le registrar a posés d'office (sa page de parking) : le VPS n'a pas d'IPv6 publique,
et une `AAAA` vers ailleurs empêcherait le certificat. Compte quelques minutes, parfois une heure.

## 2. Préparer le VPS (une fois)

Depuis le dépôt cloné sur le VPS :

```
sudo sh deploiement/preparer-le-vps.sh honear.fr mateosan.fr
```

Le premier domaine est l'adresse du jeu, le second l'autre domaine du VPS (une page d'attente, rien du jeu). Il installe Docker depuis son dépôt officiel et le règle (journaux
dans ceux de la machine, aucun conteneur qui gagne des droits) ; il durcit SSH (par clé, en tant que `debian` seulement, trois
essais), le noyau, les journaux (six mois au plus) ; il coupe LLMNR et mDNS ; il met en route les mises à jour automatiques (Debian
et Docker, redémarrage à 5 h si un noyau neuf le demande), fail2ban, et le pare-feu (SSH, HTTP, HTTPS). Pour échanger les rôles
des domaines, on le relance avec les deux noms dans l'autre ordre, puis on remet en ligne.

## 3. Mettre une version en ligne

```
npm test && npm run controle && git commit … && sudo sh deploiement/mettre-en-ligne.sh
```

Le script refuse un dépôt qui a des changements non commités (ce qui est en ligne est toujours un commit), et attend que personne
ne joue (`--maintenant` pour passer outre) : les rooms vivent en mémoire, une mise en ligne ferme les parties en cours. Les comptes,
eux, restent. Il construit `miel-doreilles:<commit>`, pose `compose.yaml` et le `Caddyfile` dans `/srv/miel-doreilles`, relance
les conteneurs, garde les trois dernières images et vérifie que le site répond.

**Revenir en arrière** sans reconstruire : changer `VERSION` dans `/srv/miel-doreilles/.env` pour une des images gardées
(`sudo docker image ls miel-doreilles`), puis `sudo docker compose --project-directory /srv/miel-doreilles up -d`.

## 4. Vérifier, surveiller

- `https://honear.fr/sante` : combien de rooms vivent, combien de téléphones sont branchés, si la musique est là, et si les
  comptes sont ouverts (`"comptes":"ouverts"`) ou fermés (le courrier n'est pas réglé).
- `sudo docker compose --project-directory /srv/miel-doreilles ps` : l'état des conteneurs (le jeu dit s'il est en bonne santé).
- `sudo docker compose --project-directory /srv/miel-doreilles logs --tail 100` : ce qu'ils disent (aussi dans
  `journalctl -t miel-doreilles-jeu-1`).
- Les conteneurs repartent seuls s'ils tombent, et au démarrage de la machine.

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
  le dossier des comptes pour seul endroit où écrire, et aucun port ouvert. Seul Caddy écoute le monde ; le pare-feu ne laisse
  entrer que SSH et le web, fail2ban écarte qui force SSH, et la machine se met à jour toute seule.
- Un compte s'ouvre sans mot de passe, par un lien qui ne sert qu'une fois ; le téléphone garde un secret de session, que le serveur
  ne garde qu'en empreinte.

## La musique : Deezer, et les playlists Spotify

Le serveur va chercher la musique lui-même, depuis le VPS : l'API publique de Deezer (`api.deezer.com`, sans clé ni compte) pour les
playlists et leurs extraits de 30 secondes, et la page publique d'une playlist Spotify (`open.spotify.com`) quand on en colle le lien.
Rien à configurer : il suffit que le VPS sorte sur Internet, ce qu'il fait d'origine. Les téléphones, eux, jouent les extraits
directement depuis les serveurs de Deezer : aucun son ne passe par le VPS, ni n'y est gardé.

- **Deezer** admet 50 appels par 5 secondes : le serveur en fait 40 au plus, attend quand Deezer dit qu'on va trop vite, et garde ce qu'il
  a lu (une recherche une heure, une playlist dix minutes, ses liens d'extraits expirant).
- **Spotify** ne donne plus le contenu d'une playlist par son API qu'à son propriétaire connecté (depuis février 2026, et une appli de
  particulier est limitée à cinq comptes). Le serveur lit donc la page publique de la playlist, celle de son lecteur intégré, puis
  retrouve ses titres chez Deezer. Ce n'est pas un usage que Spotify prévoit : s'il change sa page, l'import Spotify cessera de marcher
  (le bac le dira) jusqu'à ce qu'on adapte `src/serveur/sources/spotify.ts`. Une playlist privée ne se lit pas.
- **Les conditions de Deezer** : les extraits de 30 secondes sont permis à tous par l'API, et il est interdit d'en garder le son ; le bac
  cite Deezer. Pour un jeu public à grande échelle ou payant, lis d'abord ses conditions d'utilisation et ses règles sur le logo
  (developers.deezer.com).

## Les comptes : l'e-mail des liens de connexion

Un compte se crée en tapant son adresse : le serveur y envoie un lien qui fait entrer, une fois, pendant un quart d'heure. Pour
envoyer ces e-mails, il lui faut le serveur d'envoi (SMTP) d'une boîte e-mail. Le plus simple : une adresse à ton domaine chez OVH
(`bonjour@miel-doreilles.fr`), créée dans l'espace client (Web Cloud → E-mails ; l'offre MX Plan ou Zimbra Starter). Tout service
d'envoi qui donne un accès SMTP chiffré sur le port 465 marche aussi.

Règle-les toi-même, dans un vrai terminal (le mot de passe ne s'affiche pas, et ne passe que par le fichier) :

```
sudo sh deploiement/courrier.sh
```

Il demande l'adresse, son serveur d'envoi (proposé : `ssl0.ovh.net`, celui d'OVH) et son mot de passe, les garde dans
`/etc/miel-doreilles/courrier.env` (que seul root lit ; Docker le passe au jeu), relance le jeu et envoie un e-mail d'essai.
Le fichier ressemble à ceci :

```
COURRIER_HOTE='ssl0.ovh.net'
COURRIER_PORT='465'
COURRIER_UTILISATEUR='bonjour@miel-doreilles.fr'
COURRIER_MOT_DE_PASSE='le mot de passe de cette adresse'
COURRIER_DE='Miel d’oreilles <bonjour@miel-doreilles.fr>'
```

(Entre apostrophes droites, une valeur peut porter des espaces et des signes, sauf une apostrophe droite.) Un e-mail d'essai,
qui dit pourquoi s'il ne part pas (un mot de passe refusé : « 535 ») :

```
sudo docker compose --project-directory /srv/miel-doreilles exec jeu node /jeu/serveur.mjs --essai-courrier toi@exemple.fr
```

Tant que `COURRIER_HOTE` est vide, les comptes sont fermés : le jeu marche, et l'écran du compte dit qu'aucun e-mail ne part.
Pour que les liens n'arrivent pas dans les indésirables, vérifie dans la zone DNS l'enregistrement SPF du domaine (OVH le pose pour
ses e-mails : `v=spf1 include:mx.ovh.com ~all`), et active DKIM dans l'espace client si ton offre le propose.

- **Ce qui est gardé** : pour chaque compte, son adresse e-mail, sa pochette, ses parties jouées et gagnées, ses dates de création
  et de dernière visite. Rien d'autre. Le fichier est `/var/lib/miel-doreilles/comptes.json`, que seul l'utilisateur `miel` (celui
  du conteneur) lit ; il ne contient aucun secret (des sessions, seulement l'empreinte).
- **Ce qui s'efface seul** : un compte où personne ne revient depuis deux ans, prévenu un mois avant par e-mail.
- **Effacer** : chacun efface son compte lui-même, depuis l'écran du compte ; tout part avec.
- **Les envois sont limités** : un lien par adresse et par minute, cinq par heure ; dix par heure depuis un même téléphone ; trois cents
  par jour en tout. De quoi ne pas faire de ton adresse un envoyeur de courrier indésirable.

## Ce que ça coûte

Le VPS, et le domaine. Rien d'autre : pas de base de données (les comptes tiennent dans un fichier), et l'e-mail des liens part par
une adresse que tu as déjà.
