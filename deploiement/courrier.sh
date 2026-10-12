#!/bin/sh
# Règle le courrier des comptes : l'adresse qui envoie les liens de connexion, son serveur d'envoi et son mot de passe, gardés dans
# /etc/miel-doreilles/courrier.env, que seul root lit. À lancer soi-même, dans un vrai terminal : le mot de passe ne s'affiche
# pas et ne passe que par ce fichier. Puis il relance le jeu, qui relit le fichier, et propose un e-mail d'essai.
#
#   sudo sh deploiement/courrier.sh
set -eu
COURRIER=/etc/miel-doreilles/courrier.env
CIBLE=/srv/miel-doreilles
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
[ -t 0 ] || { echo "Lance-le dans un vrai terminal : il te demande un mot de passe."; exit 1; }

echo "Les comptes envoient leurs liens de connexion par une adresse e-mail à toi (voir HEBERGEMENT.md)."
printf "Adresse qui enverra les liens (par exemple bonjour@ton-domaine.fr) : "
read -r ADRESSE
[ -n "$ADRESSE" ] || { echo "Rien de changé."; exit 0; }
printf "Son serveur d'envoi [ssl0.ovh.net] : "
read -r HOTE
HOTE="${HOTE:-ssl0.ovh.net}"
printf "Son mot de passe (il ne s'affiche pas) : "
stty -echo
read -r MOT_DE_PASSE
stty echo
echo
case "$ADRESSE$HOTE$MOT_DE_PASSE" in
  *"'"*) echo "Une apostrophe dans ces réglages : écris-les à la main dans $COURRIER (entre guillemets doubles)."; exit 1 ;;
esac
install -d -m 0750 /etc/miel-doreilles
umask 077
printf "COURRIER_HOTE='%s'\nCOURRIER_PORT='465'\nCOURRIER_UTILISATEUR='%s'\nCOURRIER_MOT_DE_PASSE='%s'\nCOURRIER_DE='Miel d’oreilles <%s>'\n" \
  "$HOTE" "$ADRESSE" "$MOT_DE_PASSE" "$ADRESSE" > "$COURRIER"
chmod 0600 "$COURRIER"
echo "Gardé dans $COURRIER."

if [ -f "$CIBLE/compose.yaml" ]; then
  docker compose --project-directory "$CIBLE" up -d --wait --force-recreate jeu
  printf "Adresse où envoyer un e-mail d'essai (rien pour ne pas essayer) : "
  read -r ESSAI
  if [ -n "$ESSAI" ]; then
    docker compose --project-directory "$CIBLE" exec -T jeu node /jeu/serveur.mjs --essai-courrier "$ESSAI" && echo "Regarde cette boîte (et ses indésirables)."
  fi
fi
