# Mettre Miel d'oreilles en ligne, sur un VPS OVH

Le jeu tient dans deux fichiers que fabrique `npm run construire` : `dist/index.html`, la page, et `dist/serveur.mjs`, le serveur.
Sur le VPS, Node lance le serveur ; Caddy, devant lui, parle HTTPS au monde et prend le certificat tout seul.

```
téléphone ──HTTPS / WebSocket (wss)──▶ Caddy :443 ──▶ node serveur.mjs (127.0.0.1:8080)
```

## Ce qu'il te faut

- **Le VPS.** Le plus petit d'OVH (VPS-1 : 4 vCore, 8 Go) est bien plus qu'assez : le serveur est un seul processus, les rooms
  vivent en mémoire, les messages font quelques centaines d'octets. Prends un système **Debian 12 ou 13**, ou **Ubuntu 24.04**,
  et à la commande, ta **clé SSH** (pas de mot de passe).
- **Un nom de domaine**, par exemple `miel-doreilles.fr` (quelques euros par an chez OVH). Il le faut pour le HTTPS : un téléphone
  ne se branche en WebSocket sécurisé qu'à une adresse qui a un certificat.
- **Une adresse e-mail à ce domaine** (`bonjour@miel-doreilles.fr`), pour envoyer les liens de connexion des comptes : voir
  « Les comptes » plus bas. Sans elle, le jeu marche ; seuls les comptes sont fermés.
- Sur ton ordinateur : `ssh` et `scp` (macOS, Linux et Windows 10 ou 11 les ont). Rien à construire : le site est déjà construit
  dans `dist/`.

`MISE-EN-PLACE.md` reprend tout ça en une page, dans l'ordre.

## 1. Le domaine pointe sur le VPS (une fois)

Dans la zone DNS du domaine (espace client OVH → Noms de domaine → Zone DNS), ajoute :

| Sous-domaine | Type | Cible |
| --- | --- | --- |
| *(vide)* | `A` | l'IPv4 du VPS |
| *(vide)* | `AAAA` | l'IPv6 du VPS, seulement s'il en a une qui marche (l'installation te montre ses adresses) |
| `www` | `CNAME` | `miel-doreilles.fr.` |

Compte quelques minutes, parfois une heure, avant qu'il réponde partout. Une AAAA vers une IPv6 que le VPS n'a pas empêcherait
le certificat : dans le doute, ne mets que l'A.

## 2. Tout mettre en place (une fois, d'un coup)

Envoie le dossier du site sur le VPS, puis lance l'installation (`debian` est l'utilisateur des images Debian d'OVH ; `ubuntu`
sur Ubuntu) :

```
scp miel-doreilles-vps.tar.gz debian@IP_DU_VPS:
ssh debian@IP_DU_VPS
tar -xzf miel-doreilles-vps.tar.gz
sudo sh miel-doreilles/deploiement/installer.sh miel-doreilles.fr
```

`installer.sh` installe Node 24 (la version LTS) et Caddy, crée un utilisateur `miel` sans droits, **te demande l'adresse qui
enverra les liens des comptes et son mot de passe** (laisse vide pour plus tard), met le jeu en ligne (le `dist/` du dossier), pose
le service et le relais à ton domaine, ouvre le pare-feu à SSH, HTTP et HTTPS seulement, met en route les mises à jour de sécurité
automatiques ; puis il vérifie que le serveur répond, que le domaine pointe sur le VPS, que le HTTPS marche, et t'envoie un e-mail
d'essai. Il finit par « Tout est en place », ou dit ce qui manque. Il se relance sans rien casser. Si ton SSH n'écoute pas sur le
port 22, ouvre son port dans `ufw` avant de le lancer.

## 3. Mettre une nouvelle version en ligne

Même chose avec le nouveau dossier : envoie-le, décompresse-le, relance `installer.sh` (le courrier déjà réglé n'est pas
redemandé). Ou, depuis ton ordinateur, dans le dossier du projet (macOS, Linux, ou Windows sous WSL ; il construit le site si Node
y est) :

```
./deploiement/deployer.sh debian@IP_DU_VPS miel-doreilles.fr
```

Les rooms vivent en mémoire : une mise en ligne ferme les parties en cours (les téléphones se rebranchent, mais la room n'existe
plus). Mets en ligne quand personne ne joue. Les comptes, eux, restent.

## 4. Vérifier, surveiller

- `https://miel-doreilles.fr/sante` : combien de rooms vivent, combien de téléphones sont branchés, si la musique est là, et si les
  comptes sont ouverts (`"comptes":"ouverts"`) ou fermés (le courrier n'est pas réglé).
- `ssh debian@IP_DU_VPS 'journalctl -u miel-doreilles -f'` : ce que dit le serveur.
- `sudo systemctl restart miel-doreilles` : le relancer à la main. Il repart tout seul s'il tombe, et au démarrage de la machine.

## Pourquoi ça ne traîne pas

- **Le serveur décide de tout, avec une seule horloge.** Chaque téléphone lui demande l'heure plusieurs fois en se branchant, puis
  toutes les dix secondes, et garde la réponse que le réseau a le moins retardée : tous les téléphones jouent le décompte, l'extrait
  et la révélation à la même heure, celle du serveur.
- **On prévient avant d'agir.** L'extrait part un instant après que tous les téléphones se sont dits prêts (le temps que le bras
  descende) : chacun le sait à l'avance et le joue à l'heure dite, quel que soit son retard sur le réseau. Un téléphone en retard
  saute des étapes, il ne décale jamais la partie.
- **Les messages sont petits** : un événement à la fois, en JSON. La page arrive une fois, compressée par Caddy, puis plus rien
  que ces messages.
- **Le VPS est en France** (Gravelines, Roubaix ou Strasbourg) : près des joueurs.
- **Une ligne qui tombe se rebranche toute seule**, tout de suite quand le téléphone revient au premier plan ou retrouve le réseau ;
  il redonne son jeton et retrouve sa place. Recharger la page ne casse rien.

## Ce qui protège le jeu

- HTTPS partout ; le certificat se renouvelle seul.
- La page n'exécute que son propre script, reconnu à son empreinte (politique de sécurité stricte), et ne parle qu'à son serveur.
- Le serveur ne croit rien sur parole : chaque message est vérifié (forme, taille, valeurs), un téléphone ne peut pas inonder le
  serveur, ni essayer des codes au hasard sans être coupé ; une page venue d'un autre site ne peut pas s'y brancher.
- Chaque joueur a un jeton secret pour revenir à sa place : connaître l'identifiant d'un autre ne permet pas de la lui prendre.
- Le service tourne sous un utilisateur sans droits, n'écrit que dans le dossier des comptes, et le pare-feu ne laisse entrer que
  SSH et le web.
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

`installer.sh` te demande cette adresse et son mot de passe (serveur d'envoi proposé : `ssl0.ovh.net`, celui d'OVH), les garde
dans `/etc/miel-doreilles/courrier.env` (seul root peut l'écrire ; le service le lit), et envoie un e-mail d'essai. Pour les
changer plus tard, à la main :

```
sudo nano /etc/miel-doreilles/courrier.env
```

```
COURRIER_HOTE='ssl0.ovh.net'
COURRIER_PORT='465'
COURRIER_UTILISATEUR='bonjour@miel-doreilles.fr'
COURRIER_MOT_DE_PASSE='le mot de passe de cette adresse'
COURRIER_DE='Miel d’oreilles <bonjour@miel-doreilles.fr>'
```

(Entre apostrophes droites, une valeur peut porter des espaces et des signes, sauf une apostrophe droite.) Puis :

```
sudo systemctl restart miel-doreilles
sudo runuser -u miel -- node /opt/miel-doreilles/serveur.mjs --essai-courrier toi@exemple.fr /etc/miel-doreilles/courrier.env
```

La seconde ligne envoie un e-mail d'essai, et dit pourquoi s'il ne part pas (un mot de passe refusé : « 535 »).

Tant que `COURRIER_HOTE` est vide, les comptes sont fermés : le jeu marche, et l'écran du compte dit qu'aucun e-mail ne part.
Pour que les liens n'arrivent pas dans les indésirables, vérifie dans la zone DNS l'enregistrement SPF du domaine (OVH le pose pour
ses e-mails : `v=spf1 include:mx.ovh.com ~all`), et active DKIM dans l'espace client si ton offre le propose.

- **Ce qui est gardé** : pour chaque compte, son adresse e-mail, sa pochette, ses parties jouées et gagnées. Rien d'autre. Le fichier
  est `/var/lib/miel-doreilles/comptes.json`, que seul le service lit ; il ne contient aucun secret (des sessions, seulement
  l'empreinte). Sauvegarde-le de temps en temps : `sudo cp /var/lib/miel-doreilles/comptes.json ~/`.
- **Effacer** : chacun efface son compte lui-même, depuis l'écran du compte ; tout part avec.
- **Les envois sont limités** : un lien par adresse et par minute, cinq par heure ; dix par heure depuis un même téléphone ; trois cents
  par jour en tout. De quoi ne pas faire de ton adresse un envoyeur de courrier indésirable.

## Ce que ça coûte

Le VPS, et le domaine. Rien d'autre : pas de base de données (les comptes tiennent dans un fichier), et l'e-mail des liens part par
une adresse que tu as déjà.
