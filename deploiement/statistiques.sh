#!/bin/sh
# Donne le lien de la page des statistiques de Honear, pour l'éditeur seul : https://honear.fr/statistiques#cle=…
# La clé est dans /etc/honear/statistiques.env (la mise en ligne la crée). Pour en changer : effacer ce fichier, puis remettre le
# site en ligne (sudo sh deploiement/mettre-en-ligne.sh) ; l'ancien lien ne s'ouvre plus.
#
#   sudo sh deploiement/statistiques.sh
set -eu
DOMAINE=honear.fr
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
CLE="$(sed -n 's/^STATISTIQUES_CLE=//p' /etc/honear/statistiques.env 2>/dev/null || true)"
if [ -z "$CLE" ]; then
  echo "Pas encore de clé : mets le site en ligne une fois (sudo sh deploiement/mettre-en-ligne.sh)."
  exit 1
fi
printf 'Les statistiques, pour toi seul : https://%s/statistiques#cle=%s\n' "$DOMAINE" "$CLE"
echo "Ouvre-le une fois sur chaque appareil : la page garde sa clé, l'adresse s'en défait."
