# Honear et le RGPD : le registre

Le registre des activités de traitement du site (article 30 du RGPD), ce qui protège les données, comment répondre à qui exerce
ses droits, et que faire si quelque chose fuit. Chaque traitement renvoie au module qui le fait : on met ce registre à jour quand
le code change ce qu'il garde. Ce que lisent les joueurs est dans `src/ressources/textes.fr.ts` (`legal`), servi à
`/confidentialite` et à `/mentions-legales`.

## Le responsable

L'éditeur du site, un particulier, qui édite à titre non professionnel (son identité est connue de l'hébergeur). On le joint à
l'adresse `CONTACT` du serveur, écrite sur les pages légales. Pas de délégué à la protection des données : rien ne l'impose ici.

## Les traitements

| Traitement | Données | Base légale | Combien de temps | Où, qui y accède | Module |
| --- | --- | --- | --- | --- | --- |
| Jouer (sans compte) | nom d'artiste, pochette, réponses, points | le service demandé (6.1.b) | tant que la room existe, en mémoire | le serveur ; les joueurs de la room voient noms et pochettes | `src/serveur/` |
| Les comptes | adresse e-mail, pochette, parties et victoires, dates de création, de dernière visite, d'avertissement ; empreinte scrypt du mot de passe (facultatif) ; empreintes des sessions | le service demandé (6.1.b) | jusqu'à l'effacement par le joueur, ou deux ans sans visite (prévenu un mois avant) ; une session, six mois ; un lien, un quart d'heure, en mémoire | `/var/lib/honear/comptes.json` (0600, utilisateur `honear`) | `src/reseau/comptes.ts`, `mots-de-passe.ts` |
| Les e-mails | adresse e-mail ; lien de connexion, avis de mot de passe changé, avertissement avant effacement | le service demandé (6.1.b) | le temps de l'envoi | OVHcloud (SMTP) | `src/reseau/courrier.ts` |
| Les abus | adresse IP : connexions par adresse, liens demandés, essais de mot de passe | intérêt légitime (6.1.f) | la connexion ; une heure au plus, en mémoire | le serveur | `src/reseau/ligne.ts`, `comptes.ts` |
| Les statistiques | des compteurs ; en mémoire seulement, l'empreinte du jour (IP et navigateur, salés d'un secret tiré chaque jour, jamais écrit) | intérêt légitime (6.1.f), exemption de la CNIL pour la mesure d'audience (article 82) | treize mois jour par jour, puis des totaux anonymes | `/var/lib/honear/statistiques.json` ; l'éditeur seul, par sa clé | `src/reseau/statistiques.ts` |
| Les journaux | erreurs, redémarrages ; à la demande (`?diagnostic`), le son et la fenêtre d'un navigateur, sans IP ni saisie | intérêt légitime (6.1.f) | six mois au plus (journald) | l'éditeur | `src/reseau/ligne.ts` |

Le stockage local du téléphone (pochette, room, session, tutoriel vu, « Mes playlists ») est strictement nécessaire au jeu : pas de
consentement à demander (article 82 de la loi Informatique et Libertés). Ni cookie, ni traceur, ni outil tiers ; les polices sont
dans la page. Les statistiques respectent Global Privacy Control et Do Not Track : une page comptée, ni empreinte ni appareil. Le
texte d'une recherche du bac ne se garde que si elle a trouvé de la musique ; d'une playlist collée, on ne garde pas le nom.

Deezer est un responsable à part : le téléphone y lit les extraits et les pochettes (il reçoit son adresse IP). Spotify ne reçoit
rien : le jeu ne lit pas ses playlists.

Une liste sur mesure vient du MCP de Honear (mcp.honear.fr), du même éditeur, sur la même machine, qui a son propre registre
(`RGPD.md` du dépôt `honear-mcp`). Le jeu la lit sur un réseau interne, sans rien envoyer de qui joue ; comme d'une playlist
collée, il n'en garde pas le nom.

## Les sous-traitants, et où sont les données

- **OVH SAS (OVHcloud)**, 2 rue Kellermann, 59100 Roubaix : le serveur (un VPS, à Strasbourg) et l'envoi des e-mails. Ses
  conditions comprennent l'accord de traitement des données que demande l'article 28.
- Aucun autre. Aucune donnée ne sort de l'Union européenne.

## Ce qui protège les données (article 32)

- HTTPS seulement (le frontal Caddy, dépôt `vps`). Le jeu tourne dans un conteneur sans droits : système de fichiers en lecture
  seule, aucune capacité, rien à gagner en route ; ses deux fichiers ne sont lisibles que par l'utilisateur `honear`.
- Aucun secret en clair : des liens et des sessions, l'empreinte SHA-256 (des secrets de 256 bits) ; des mots de passe, une
  empreinte scrypt (2^15, 8, 3, sel de 16 octets), vérifiée en temps constant. Une adresse sans compte, ou sans mot de passe,
  répond dans le même temps et de la même façon : on n'apprend pas qui a un compte.
- Les mots de passe suivent la recommandation de la CNIL de 2022 (cas d'une limite des essais) : 50 bits au moins, ou huit signes
  de trois sortes, pas l'adresse dedans ; cinq essais par compte et par quart d'heure, vingt par heure depuis une adresse IP. Un
  mot de passe choisi ou changé prévient l'adresse du compte par e-mail et fait sortir ses autres sessions. On l'a oublié : le lien
  par e-mail marche toujours.
- Les liens de connexion ne servent qu'une fois, un quart d'heure ; ils voyagent dans l'ancre de l'adresse, qui ne passe dans
  aucun journal. Les envois sont limités (par adresse, par téléphone, par jour).
- La page des statistiques ne s'ouvre qu'avec une clé tirée au sort, gardée dans `/etc/honear/statistiques.env` (root seul).
- Aucun secret dans le dépôt.

## Répondre à qui exerce ses droits

On répond sous un mois, à l'adresse de contact.

- **Effacer** : le joueur le fait lui-même (« Mon compte », « Effacer mon compte ») ; tout part sur-le-champ. S'il écrit, on lui
  dit comment, ou l'on efface pour lui.
- **Accéder, récupérer ses données (portabilité)** : `sudo sh deploiement/donnees.sh son@adresse.fr`, lancé toi-même, donne son
  compte en JSON (sans l'empreinte du mot de passe) ; on le lui envoie, à cette adresse seulement.
- **Corriger** : son adresse e-mail change ? Il ouvre un compte à la nouvelle, et efface l'ancien. Sa pochette, il la refait.
- **S'opposer aux statistiques** : Global Privacy Control ou Do Not Track dans son navigateur. Rien à effacer : elles ne gardent
  rien qui le désigne.
- Il peut aussi s'adresser à la CNIL.

## Si quelque chose fuit (articles 33 et 34)

1. Arrêter la fuite : couper le jeu s'il le faut (`sudo docker compose --project-directory /srv/honear stop`).
2. Mesurer : quelles données (le fichier des comptes : des adresses e-mail, des empreintes), combien de personnes, depuis quand.
3. Si un risque est possible pour les personnes : le dire à la CNIL dans les 72 heures (notifications.cnil.fr).
4. Si le risque est élevé : prévenir chaque personne, par e-mail, avec ce qu'elle peut faire.
5. Couper ce qui servirait à entrer : effacer les sessions et les empreintes des mots de passe du fichier (chacun rentre par un
   lien), changer la clé des statistiques et le mot de passe du courrier.
6. Noter l'incident ci-dessous (date, faits, effets, mesures), même sans notification (article 33, 5).

## Ce qui n'est pas demandé ici

- Une analyse d'impact (AIPD) : ni données sensibles, ni profilage, ni surveillance, ni grande échelle.
- Une bannière de cookies : aucun cookie, aucun traceur soumis au consentement.

## Le journal des incidents

Aucun incident.
