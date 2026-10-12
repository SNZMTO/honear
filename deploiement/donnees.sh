#!/bin/sh
# Ce que le site garde d'un joueur qui a un compte, pour lui répondre quand il le demande (droit d'accès, de portabilité : RGPD.md) :
# son compte, en JSON, ses dates en clair, sans l'empreinte de son mot de passe ni ses sessions. À lancer toi-même, dans un vrai
# terminal : le fichier des comptes ne se lit qu'avec sudo, et ne se copie nulle part ailleurs que dans ta réponse à ce joueur.
#
#   sudo sh deploiement/donnees.sh adresse@exemple.fr
set -eu
[ "$(id -u)" = 0 ] || { echo "Lance-le avec sudo."; exit 1; }
[ $# -eq 1 ] || { echo "Donne l'adresse e-mail du compte : sudo sh deploiement/donnees.sh adresse@exemple.fr"; exit 1; }
python3 - "$1" /var/lib/honear/comptes.json <<'PY'
import json, sys, datetime
adresse, fichier = sys.argv[1].strip().lower(), sys.argv[2]
try:
    comptes = json.load(open(fichier, encoding="utf-8")).get("comptes", [])
except FileNotFoundError:
    comptes = []
date = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).isoformat() if isinstance(t, (int, float)) else None
trouves = [c for c in comptes if c.get("email") == adresse]
if not trouves:
    print(f"Aucun compte à l'adresse {adresse}.")
for c in trouves:
    print(json.dumps({
        "email": c.get("email"),
        "pochette": c.get("pochette"),
        "parties": c.get("parties", 0),
        "victoires": c.get("victoires", 0),
        "creeLe": date(c.get("creeLe")),
        "vuLe": date(c.get("vuLe", c.get("creeLe"))),
        "prevenuLe": date(c.get("prevenuLe")),
        "motDePasse": "choisi (le site n'en garde qu'une empreinte)" if c.get("motDePasse") else "aucun",
    }, ensure_ascii=False, indent=2))
PY
