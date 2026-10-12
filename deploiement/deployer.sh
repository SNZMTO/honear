#!/bin/sh
# Met une nouvelle version en ligne depuis ton ordinateur (macOS, Linux, ou Windows sous WSL) : construit le site si Node est là
# (sinon envoie le dist/ tel qu'il est), l'envoie sur le VPS avec ses scripts, et y relance installer.sh, qui le met en place,
# relance le service et vérifie tout.
#
#   ./deploiement/deployer.sh debian@IP_DU_VPS miel-doreilles.fr
#
# Les rooms vivent en mémoire : une mise en ligne ferme celles en cours. Mets en ligne quand personne ne joue.
set -eu
CIBLE="${1:?Donne le VPS et ton domaine : ./deploiement/deployer.sh debian@IP_DU_VPS miel-doreilles.fr}"
DOMAINE="${2:?Donne aussi ton domaine : ./deploiement/deployer.sh debian@IP_DU_VPS miel-doreilles.fr}"
cd "$(dirname "$0")/.."

if command -v npm >/dev/null && [ -d node_modules ]; then
  npm run construire
else
  echo "Pas de Node ni de node_modules ici : j'envoie dist/ tel qu'il est."
fi
[ -f dist/serveur.mjs ] || { echo "Il manque dist/serveur.mjs."; exit 1; }

# Le site et ses scripts, sans les comptes d'un essai sur ton ordinateur : ceux du VPS vivent ailleurs (/var/lib/miel-doreilles).
tar --exclude='comptes.json*' -czf - dist deploiement | ssh "$CIBLE" 'rm -rf ~/miel-doreilles && mkdir -p ~/miel-doreilles && tar -xzf - -C ~/miel-doreilles'
ssh -t "$CIBLE" "sudo sh ~/miel-doreilles/deploiement/installer.sh $DOMAINE"
