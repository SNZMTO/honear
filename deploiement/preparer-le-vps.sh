#!/bin/sh
# Prépare le VPS pour le jeu, d'un coup, et se relance sans rien casser : Docker (depuis son dépôt officiel), le durcissement de la
# machine (SSH, noyau, journaux, résolution de noms, mises à jour automatiques), le pare-feu, l'utilisateur à qui appartiennent les
# comptes, et les adresses du site. Il ne met pas le jeu en ligne : c'est deploiement/mettre-en-ligne.sh.
#
#   sudo sh deploiement/preparer-le-vps.sh honear.fr mateosan.fr
#
# Le premier domaine est l'adresse du jeu ; le second, l'autre domaine du VPS, montre une page d'attente et ne mène pas au jeu.
# Pour Debian 13.
set -eu
USAGE="sudo sh deploiement/preparer-le-vps.sh honear.fr mateosan.fr (l'adresse du jeu, puis l'autre domaine du VPS)"
DOMAINE="${1:?$USAGE}"
AUTRE_DOMAINE="${2:?$USAGE}"
SYSTEME="$(cd "$(dirname "$0")" && pwd)/systeme"
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
. /etc/os-release
[ "$ID" = debian ] || { echo "Ce script est fait pour Debian ($ID ici)."; exit 1; }

etape() { printf '\n== %s\n' "$1"; }

etape "Les paquets du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl ufw fail2ban unattended-upgrades apt-listchanges

etape "Docker, depuis son dépôt officiel"
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $VERSION_CODENAME
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update -q
apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
# Le démon : ses journaux dans ceux de la machine (gardés six mois), aucun conteneur qui gagne des droits, pas de dialogue entre
# conteneurs hors de leurs réseaux, et des conteneurs qui tournent pendant qu'il se met à jour.
install -D -m 0644 "$SYSTEME/docker.json" /etc/docker/daemon.json
systemctl enable docker
systemctl restart docker

etape "SSH : par clé, en tant que debian, rien d'autre"
install -m 0644 "$SYSTEME/ssh.conf" /etc/ssh/sshd_config.d/20-miel.conf
sshd -t
systemctl reload ssh

etape "Le noyau, les journaux, la résolution de noms"
install -m 0644 "$SYSTEME/sysctl.conf" /etc/sysctl.d/90-miel.conf
sysctl -q --system
install -D -m 0644 "$SYSTEME/journald.conf" /etc/systemd/journald.conf.d/90-miel.conf
systemctl restart systemd-journald
install -D -m 0644 "$SYSTEME/resolved.conf" /etc/systemd/resolved.conf.d/90-miel.conf
systemctl restart systemd-resolved

etape "Les mises à jour automatiques"
install -m 0644 "$SYSTEME/unattended-upgrades.conf" /etc/apt/apt.conf.d/52miel-unattended-upgrades
printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades
systemctl enable --now unattended-upgrades fail2ban

etape "Le pare-feu : SSH, HTTP et HTTPS ; rien d'autre n'entre"
# Docker ouvre lui-même les ports qu'un conteneur publie, sans passer par ufw : seul Caddy en publie (80 et 443).
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

etape "Les comptes, et les réglages du site"
id miel >/dev/null 2>&1 || useradd --system --user-group --no-create-home --shell /usr/sbin/nologin miel
install -d -m 0700 -o miel -g miel /var/lib/miel-doreilles
install -d -m 0750 -o root -g root /etc/miel-doreilles
printf 'DOMAINE=%s\nAUTRE_DOMAINE=%s\n' "$DOMAINE" "$AUTRE_DOMAINE" > /etc/miel-doreilles/site.env
chmod 0644 /etc/miel-doreilles/site.env
echo "Le jeu sera à https://$DOMAINE ; $AUTRE_DOMAINE montrera une page d'attente."

etape "Vérifications"
docker version --format 'Docker {{.Server.Version}}'
docker compose version
ufw status | head -3
printf '\nLe VPS est prêt. Pour mettre le jeu en ligne : sudo sh deploiement/mettre-en-ligne.sh\n'
