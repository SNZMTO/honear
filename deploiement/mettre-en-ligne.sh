#!/bin/sh
# Met Honear en ligne sur le VPS, depuis ce dépôt : construit l'image, étiquetée à son commit, pose compose.yaml dans /srv/honear
# et relance le jeu, puis vérifie qu'il répond par le frontal. Ce qui est en ligne est toujours un commit : il refuse un dépôt qui
# a des changements. Les rooms en cours s'arrêtent (les comptes restent) : il refuse tant qu'un téléphone est branché, sauf avec
# --maintenant. La première fois, il crée l'utilisateur honear et le dossier des comptes. Le frontal (dépôt « vps ») doit suivre.
#
#   sudo sh deploiement/mettre-en-ligne.sh [--maintenant]
#
# Revenir à la version d'avant sans reconstruire : changer VERSION dans /srv/honear/.env (les trois dernières images sont
# gardées : sudo docker image ls honear), puis sudo docker compose --project-directory /srv/honear up -d
set -eu
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
CIBLE=/srv/honear
DOMAINE=honear.fr
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
command -v docker >/dev/null || { echo "Docker n'est pas là : prépare d'abord le VPS (dépôt « vps », sudo sh preparer.sh)."; exit 1; }
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

# L'utilisateur à qui appartiennent les comptes, sans shell ni droits, et leur dossier, que lui seul lit.
id honear >/dev/null 2>&1 || useradd --system --user-group --no-create-home --shell /usr/sbin/nologin honear
install -d -m 0700 -o honear -g honear /var/lib/honear
install -d -m 0750 /etc/honear
# La clé de la page des statistiques : tirée au sort une fois, gardée là où seul root lit (sudo sh deploiement/statistiques.sh la donne).
if [ ! -f /etc/honear/statistiques.env ]; then
  (umask 077 && printf 'STATISTIQUES_CLE=%s\n' "$(head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n')" > /etc/honear/statistiques.env)
fi

printf '== L’image du jeu, version %s\n' "$VERSION"
docker build -t "honear:$VERSION" "$RACINE"

printf '== Le conteneur\n'
install -d -m 0755 "$CIBLE"
install -m 0644 "$RACINE/deploiement/compose.yaml" "$CIBLE/"
printf 'VERSION=%s\nUID_DU_JEU=%s\nGID_DU_JEU=%s\nDOMAINE=%s\n' "$VERSION" "$(id -u honear)" "$(id -g honear)" "$DOMAINE" > "$CIBLE/.env"
docker compose --project-directory "$CIBLE" up -d --wait --remove-orphans

printf '== Le ménage : les trois dernières images restent, de quoi revenir en arrière\n'
docker image ls honear --format '{{.Repository}}:{{.Tag}}' | tail -n +4 | xargs -r docker image rm || true
docker builder prune -f --filter until=168h >/dev/null

printf '== Vérifications\n'
SANTE=''
for _ in 1 2 3 4 5 6; do
  if SANTE="$(curl -fsS --max-time 5 "https://$DOMAINE/sante" 2>/dev/null)"; then break; fi
  SANTE=''
  sleep 5
done
if [ -n "$SANTE" ]; then
  printf 'En ligne : https://%s (version %s)\n%s\n' "$DOMAINE" "$VERSION" "$SANTE"
  echo "Les statistiques, pour toi seul : sudo sh deploiement/statistiques.sh donne leur lien."
else
  echo "Le jeu tourne, mais https://$DOMAINE ne répond pas : le frontal est-il en ligne ? (dépôt « vps », sudo sh frontal/mettre-en-ligne.sh)"
  echo "Ce que dit le jeu : sudo docker compose --project-directory $CIBLE logs --tail 50"
  exit 1
fi
