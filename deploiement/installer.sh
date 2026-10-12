#!/bin/sh
# Met Miel d'oreilles en place sur le VPS, d'un coup : Node 24 (LTS), Caddy (le HTTPS), un utilisateur sans droits pour le jeu,
# le courrier des comptes (il te demande l'adresse d'envoi et son mot de passe), le service, le pare-feu, les mises à jour de
# sécurité automatiques ; puis il met le jeu en ligne (le dossier dist/ qui est à côté), vérifie le domaine, le site, et envoie
# un e-mail d'essai. À lancer sur le VPS, depuis le dossier du projet que tu y as envoyé, avec ton domaine :
#
#   sudo sh miel-doreilles/deploiement/installer.sh miel-doreilles.fr
#
# Avec --courrier après le domaine, il redemande les réglages du courrier, même s'ils sont déjà là (un mot de passe changé).
#
# Pour Debian 12 ou 13, ou Ubuntu 24.04. Il se relance sans rien casser : c'est aussi comme ça qu'on met une nouvelle version
# en ligne (on renvoie le dossier, on relance). Le courrier déjà réglé n'est jamais redemandé.
set -eu
DOMAINE="${1:?Donne ton domaine : sudo sh miel-doreilles/deploiement/installer.sh miel-doreilles.fr}"
ICI="$(cd "$(dirname "$0")" && pwd)"
SITE="$ICI/../dist"
COURRIER=/etc/miel-doreilles/courrier.env
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
[ -f "$SITE/serveur.mjs" ] || { echo "Il manque $SITE/serveur.mjs : envoie le dossier du projet entier, dist/ compris."; exit 1; }

etape() { printf '\n== %s\n' "$1"; }

etape "Les paquets du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https ufw unattended-upgrades rsync

etape "Node 24 (LTS)"
if ! node --version 2>/dev/null | grep -q '^v24\.'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y -q nodejs
fi
node --version

etape "Caddy, qui tient le HTTPS"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

etape "L'utilisateur du jeu, sans shell ni droits"
id miel >/dev/null 2>&1 || useradd --system --user-group --no-create-home --shell /usr/sbin/nologin miel
mkdir -p /opt/miel-doreilles

etape "Le courrier des comptes"
# Un fichier que seul root écrit et que le service lit. Les valeurs y sont entre apostrophes : systemd et Node les lisent pareil.
install -d -m 0750 -o root -g miel /etc/miel-doreilles
if [ ! -f "$COURRIER" ]; then
  install -m 0640 -o root -g miel /dev/null "$COURRIER"
  printf "COURRIER_HOTE=''\nCOURRIER_PORT='465'\nCOURRIER_UTILISATEUR=''\nCOURRIER_MOT_DE_PASSE=''\nCOURRIER_DE=''\n" > "$COURRIER"
fi
NOUVEAU_COURRIER=non
REDEMANDER="${2:-}"
if { grep -Eq "^COURRIER_HOTE=(''|\"\")?\$" "$COURRIER" || [ "$REDEMANDER" = --courrier ]; } && [ -t 0 ]; then
  echo "Les comptes envoient leurs liens de connexion par une adresse e-mail à toi (voir HEBERGEMENT.md)."
  printf "Adresse qui enverra les liens (par exemple bonjour@%s ; rien pour plus tard) : " "$DOMAINE"
  read -r ADRESSE
  if [ -n "$ADRESSE" ]; then
    printf "Son serveur d'envoi [ssl0.ovh.net] : "
    read -r HOTE
    HOTE="${HOTE:-ssl0.ovh.net}"
    printf "Son mot de passe (il ne s'affiche pas) : "
    stty -echo
    read -r MOT_DE_PASSE
    stty echo
    echo
    case "$ADRESSE$HOTE$MOT_DE_PASSE" in
      *"'"*) echo "Une apostrophe dans ces réglages : écris-les à la main dans $COURRIER (entre guillemets doubles)." ;;
      *)
        printf "COURRIER_HOTE='%s'\nCOURRIER_PORT='465'\nCOURRIER_UTILISATEUR='%s'\nCOURRIER_MOT_DE_PASSE='%s'\nCOURRIER_DE='Miel d’oreilles <%s>'\n" \
          "$HOTE" "$ADRESSE" "$MOT_DE_PASSE" "$ADRESSE" > "$COURRIER"
        echo "Gardé dans $COURRIER."
        NOUVEAU_COURRIER=oui
        ;;
    esac
  fi
fi

etape "Le jeu, le service et le relais"
rsync -a --delete --exclude 'comptes.json*' --chown=root:root "$SITE/" /opt/miel-doreilles/
sed "s#https://miel-doreilles.fr#https://$DOMAINE#" "$ICI/miel-doreilles.service" > /etc/systemd/system/miel-doreilles.service
sed "s#miel-doreilles.fr#$DOMAINE#g" "$ICI/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable miel-doreilles
systemctl restart miel-doreilles
systemctl reload caddy || systemctl restart caddy

etape "Le pare-feu : SSH, HTTP (pour le certificat) et HTTPS ; rien d'autre n'entre"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

etape "Les mises à jour de sécurité, toutes seules"
dpkg-reconfigure -f noninteractive unattended-upgrades

etape "Vérifications"
OK=oui
# Le serveur du jeu, en local.
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:8080/sante >/dev/null 2>&1; then break; fi
  sleep 1
done
if SANTE="$(curl -fsS http://127.0.0.1:8080/sante 2>/dev/null)"; then
  echo "Le serveur du jeu répond : $SANTE"
else
  OK=non
  echo "Le serveur du jeu ne répond pas. Ce qu'il dit : journalctl -u miel-doreilles -n 50"
fi
# Le domaine : il doit pointer sur ce VPS.
ICI_IP="$(ip -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | tr '\n' ' ')"
LA_IP="$(getent ahosts "$DOMAINE" | awk '{print $1}' | sort -u | tr '\n' ' ')"
echo "Les adresses de ce VPS : $ICI_IP"
echo "Celles où $DOMAINE pointe : ${LA_IP:-aucune}"
POINTE=non
for ip in $LA_IP; do
  case " $ICI_IP " in *" $ip "*) POINTE=oui ;; esac
done
if [ "$POINTE" = non ]; then
  OK=non
  echo "$DOMAINE ne pointe pas encore ici : mets ces adresses dans sa zone DNS (HEBERGEMENT.md, étape 1). Caddy prendra le certificat dès qu'il pointera."
else
  # Le HTTPS, de bout en bout : Caddy prend le certificat à la première visite ; on lui laisse un peu de temps.
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if curl -fsS "https://$DOMAINE/sante" >/dev/null 2>&1; then break; fi
    sleep 5
  done
  if curl -fsS "https://$DOMAINE/sante" >/dev/null 2>&1; then
    echo "Le site répond en HTTPS : https://$DOMAINE"
  else
    OK=non
    echo "Le HTTPS ne répond pas encore. Le certificat peut prendre quelques minutes ; sinon : journalctl -u caddy -n 50"
  fi
fi
# Le courrier : un e-mail d'essai, quand on vient de le régler.
ESSAYER="runuser -u miel -- /usr/bin/node /opt/miel-doreilles/serveur.mjs --essai-courrier"
if grep -Eq "^COURRIER_HOTE=(''|\"\")?\$" "$COURRIER"; then
  echo "Le courrier n'est pas réglé : les comptes sont fermés. Règle-le plus tard en relançant ce script, ou dans $COURRIER."
elif [ "$NOUVEAU_COURRIER" = non ]; then
  echo "Le courrier est réglé. Pour l'essayer : sudo $ESSAYER toi@exemple.fr $COURRIER"
elif [ -t 0 ]; then
  printf "Adresse où envoyer un e-mail d'essai (rien pour ne pas essayer) : "
  read -r ESSAI
  if [ -n "$ESSAI" ]; then
    if $ESSAYER "$ESSAI" "$COURRIER"; then
      echo "Regarde cette boîte (et ses indésirables)."
    else
      OK=non
      echo "Corrige $COURRIER (sudo nano $COURRIER), puis : sudo systemctl restart miel-doreilles"
    fi
  fi
fi

if [ "$OK" = oui ]; then
  printf '\nTout est en place : https://%s\n' "$DOMAINE"
else
  printf '\nPresque : regarde ce qui est dit plus haut, corrige, et relance ce script (il ne casse rien).\n'
fi
