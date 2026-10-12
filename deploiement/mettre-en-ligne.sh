#!/bin/sh
# Met le jeu en ligne sur ce VPS, depuis ce dépôt : construit l'image, étiquetée à son commit, pose compose.yaml et le Caddyfile
# dans /srv/miel-doreilles, relance les conteneurs, et vérifie que le site répond. Ce qui est en ligne est toujours un commit : il
# refuse un dépôt qui a des changements. Les rooms en cours s'arrêtent (les comptes restent) : il refuse tant qu'un téléphone est
# branché, sauf avec --maintenant.
#
#   sudo sh deploiement/mettre-en-ligne.sh [--maintenant]
#
# Revenir à la version d'avant : sudo sh deploiement/mettre-en-ligne.sh, depuis le commit d'avant (git checkout), ou, sans
# reconstruire, changer VERSION dans /srv/miel-doreilles/.env (les trois dernières images sont gardées), puis
# sudo docker compose --project-directory /srv/miel-doreilles up -d
set -eu
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
CIBLE=/srv/miel-doreilles
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
[ -f /etc/miel-doreilles/site.env ] || { echo "Le VPS n'est pas prêt : sudo sh deploiement/preparer-le-vps.sh honear.fr mateosan.fr"; exit 1; }
. /etc/miel-doreilles/site.env
git() { command git -c safe.directory="$RACINE" -C "$RACINE" "$@"; }

if [ -n "$(git status --porcelain)" ]; then
  echo "Le dépôt a des changements qui ne sont pas commités : commite-les d'abord."
  git status --short
  exit 1
fi
VERSION="$(git rev-parse --short=12 HEAD)"

if [ "${1:-}" != --maintenant ]; then
  TELEPHONES="$(curl -fsS --max-time 5 "https://$DOMAINE/sante" 2>/dev/null | sed -n 's/.*"telephones":\([0-9]*\).*/\1/p')"
  if [ -n "$TELEPHONES" ] && [ "$TELEPHONES" != 0 ]; then
    echo "$TELEPHONES téléphone(s) en train de jouer : réessaie quand personne ne joue (ou avec --maintenant)."
    exit 1
  fi
fi

printf '== L’image du jeu, version %s\n' "$VERSION"
docker build -t "miel-doreilles:$VERSION" "$RACINE"

printf '== Les conteneurs\n'
install -d -m 0755 "$CIBLE"
install -m 0644 "$RACINE/deploiement/compose.yaml" "$RACINE/deploiement/Caddyfile" "$CIBLE/"
printf 'VERSION=%s\nUID_DU_JEU=%s\nGID_DU_JEU=%s\nDOMAINE=%s\nANCIEN_DOMAINE=%s\n' \
  "$VERSION" "$(id -u miel)" "$(id -g miel)" "$DOMAINE" "$ANCIEN_DOMAINE" > "$CIBLE/.env"
docker compose --project-directory "$CIBLE" up -d --wait --remove-orphans
# Caddy relit son Caddyfile s'il a changé, sans couper une connexion.
docker compose --project-directory "$CIBLE" exec -T caddy caddy reload --config /etc/caddy/Caddyfile

printf '== Le ménage : les trois dernières images du jeu restent, de quoi revenir en arrière\n'
docker image ls miel-doreilles --format '{{.Repository}}:{{.Tag}}' | tail -n +4 | xargs -r docker image rm || true
docker builder prune -f --filter until=168h >/dev/null

printf '== Vérifications\n'
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if SANTE="$(curl -fsS --max-time 5 "https://$DOMAINE/sante" 2>/dev/null)"; then break; fi
  SANTE=''
  sleep 5
done
if [ -n "$SANTE" ]; then
  printf 'En ligne : https://%s (version %s)\n%s\n' "$DOMAINE" "$VERSION" "$SANTE"
else
  echo "https://$DOMAINE ne répond pas encore. Le certificat peut prendre quelques minutes, ou le domaine ne pointe pas encore ici."
  echo "Ce qu'ils disent : sudo docker compose --project-directory $CIBLE logs --tail 50"
  exit 1
fi
