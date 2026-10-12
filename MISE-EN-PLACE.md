# Mettre Miel d'oreilles en ligne, d'un coup

Une page, dans l'ordre. Compte une demi-heure, dont la plupart à attendre qu'OVH livre le VPS et que le DNS se propage.
Les détails, et le pourquoi, sont dans `HEBERGEMENT.md`.

## Avant de commencer : ce qu'il te faut sous la main

- [ ] Un **VPS OVH** (le plus petit suffit), sous **Debian 12 ou 13** (ou Ubuntu 24.04), commandé avec **ta clé SSH**.
      Note son **adresse IPv4** (et son IPv6), dans l'espace client OVH → Bare Metal Cloud → VPS.
- [ ] Ton **nom de domaine**, chez OVH (ici `miel-doreilles.fr` ; remplace-le partout par le tien).
- [ ] Une **adresse e-mail à ce domaine**, par exemple `bonjour@miel-doreilles.fr`, et **son mot de passe** : espace client →
      Web Cloud → E-mails (MX Plan ou Zimbra Starter). C'est elle qui enverra les liens de connexion des comptes. Tu peux la
      créer plus tard : sans elle, le jeu marche, seuls les comptes sont fermés.
- [ ] Le fichier **`miel-doreilles-vps.tar.gz`** (le site déjà construit et ses scripts), sur ton ordinateur.

## 1. Le domaine pointe sur le VPS

Espace client → Noms de domaine → ton domaine → Zone DNS → Ajouter une entrée :

- [ ] `A` : sous-domaine vide → l'IPv4 du VPS (remplace l'`A` qui y est déjà, s'il y en a une).
- [ ] `CNAME` : `www` → `miel-doreilles.fr.` (avec le point au bout).
- [ ] `AAAA` : seulement si tu es sûr de l'IPv6 du VPS ; dans le doute, rien.
- [ ] Ne touche pas aux entrées `MX` et `SPF` : ce sont celles de l'e-mail.

Le DNS met de quelques minutes à une heure à se propager ; tu peux faire l'étape 2 pendant ce temps.

## 2. L'installation

Dans un terminal sur ton ordinateur (macOS : Terminal ; Windows : PowerShell), depuis le dossier où est le fichier :

```
scp miel-doreilles-vps.tar.gz debian@IP_DU_VPS:
ssh debian@IP_DU_VPS
```

Puis, sur le VPS :

```
tar -xzf miel-doreilles-vps.tar.gz
sudo sh miel-doreilles/deploiement/installer.sh miel-doreilles.fr
```

Il te pose trois questions sur le courrier : l'adresse qui enverra les liens (`bonjour@miel-doreilles.fr`), son serveur d'envoi
(Entrée pour `ssl0.ovh.net`, celui d'OVH), son mot de passe (il ne s'affiche pas quand tu le tapes). Puis il installe tout,
vérifie, et te demande où envoyer un **e-mail d'essai** : donne ta propre adresse.

- [ ] Il finit par « **Tout est en place** » : c'est fini.
- [ ] Sinon, il dit ce qui manque. Le plus souvent : le domaine ne pointe pas encore sur le VPS (attends un peu, puis relance la
      même commande : elle ne casse rien), ou le mot de passe de l'e-mail est refusé (« 535 ») : relance-la avec `--courrier`
      au bout (`sudo sh miel-doreilles/deploiement/installer.sh miel-doreilles.fr --courrier`), elle te redemande les réglages.

## 3. Vérifier, avec deux téléphones

- [ ] `https://miel-doreilles.fr/sante` dans un navigateur : `"musique":true` et `"comptes":"ouverts"`.
- [ ] L'e-mail d'essai est arrivé (regarde aussi les indésirables ; s'il y est, active DKIM pour le domaine dans l'espace client,
      Web Cloud → E-mails, si ton offre le propose).
- [ ] Sur un téléphone : « On pose un disque ? », fais ta pochette (touche l'étiquette du nom pour taper ton pseudo), touche un thème
      dans le bac, « Celle-là », « Ouvrir le salon ».
- [ ] Sur un autre téléphone : scanne le QR code de la kraft (ou tape le code), fais ta pochette, « C'est moi ». Au salon, « Ma pochette » :
      change-la, l'autre téléphone la voit changer.
- [ ] Sur les deux : « Allume l'ampli ». L'hôte lance la face A : les deux jouent l'extrait ensemble ; à la révélation, la vraie
      pochette de l'album se pose à côté de la kraft. À la finale, touche le papier des titres : ils y sont tous, avec leurs pochettes.
- [ ] Colle le lien d'une de tes playlists Spotify **publiques** dans « La mienne » : le bac dit combien de titres sont jouables.
- [ ] « Mon compte » à l'accueil : ton adresse, « Envoie-moi le lien », touche le lien reçu, « Entrer ».

Ce qui n'a jamais été essayé avant toi, et mérite ton œil : le son sur iPhone (le premier toucher le débloque), les vrais e-mails
d'OVH, une vraie playlist Spotify, le vrai Deezer et ses vraies pochettes.

## Plus tard : une nouvelle version

Envoie le nouveau `miel-doreilles-vps.tar.gz`, et relance les deux mêmes commandes sur le VPS (le courrier n'est pas redemandé).
Mets en ligne quand personne ne joue : les parties en cours s'arrêtent, les comptes restent.
