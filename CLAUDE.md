# Honear, pour Claude

Le blind test entre potes, à meuble hi-fi low-poly : les téléphones jouent, un serveur Node tient les parties. Il est en ligne sur
**https://honear.fr**, dans un conteneur Docker construit depuis ce dépôt. Le VPS est partagé avec d'autres sites : la machine et
le frontal Caddy vivent dans le dépôt `vps` (`~/vps`), qui a ses propres règles. On écrit en français, le code aussi (noms, commentaires, textes).

## Où lire

- `LISEZMOI.md` : tout le projet, étape par étape, l'arborescence, ce qui a été tranché, ce qui attend.
- `NOTES-TECHNIQUES.md` : le serveur, la ligne (WebSocket), Deezer et Spotify, les comptes et le courrier.
- `HEBERGEMENT.md` : la mise en ligne du jeu, son conteneur, le courrier. La machine et le frontal : `~/vps/LISEZMOI.md`.
- `RGPD.md` : le registre des traitements, ce qui protège les données, les droits des joueurs, que faire si quelque chose fuit.

## Commandes

```
npm ci                 # les paquets, d'après package-lock.json
npm test               # les types (page et serveur) puis tous les tests
npm run controle       # les contrôles du rendu sur toutes les planches : « Aucun défaut. » attendu
npm run construire     # dist/index.html (la page) et dist/serveur.mjs (le serveur)
npm run prototype      # sortie/prototype.html : une partie cliquable contre le serveur simulé
npm run ecrans         # sortie/ecrans/*.svg : tous les écrans du téléphone (étape 5)
npm run vitrine        # .github/vitrine/*.svg : les images du README, dessinées par le moteur du site
npm run format         # Prettier
npm run exporter-pour-le-mcp -- ~/honear-mcp   # pour le MCP de Honear : les réglages du jugement, une table de cas jugés
```

`sortie/` et `dist/` ne sont pas suivis : ils se refont.

## Les règles du code

`tests/sources.test.ts` les vérifie : un test rouge là, c'est une règle enfreinte, pas un test à changer.

- TypeScript strict, sans `any`. Les couches ne lisent que celles du dessous. Les ressources (`src/ressources/`) sont des données, jamais du code.
- Les textes du site sont dans `src/ressources/textes.fr.ts`, et la langue n'est nommée que là. Les couleurs sont dans `src/ressources/palette.ts`, nulle part ailleurs.
- Rien ne tire au sort (pas de `Math.random`) : le hasard est une graine. L'heure ne se lit que dans `src/ecran/horloge.ts` et `src/reseau/horloge.ts`.
- Une durée n'est jamais écrite en chiffres : elle se lit dans une table. Une minuterie attend zéro ou un temps nommé. Dans l'écran, le moteur et la chorégraphie, un nombre à virgule est une constante nommée.
- L'écrasement de la projection ne se lit que par `src/lowpoly/projection.ts`.
- Chaque module commence par un commentaire qui dit son rôle. Il n'y a pas de module fourre-tout.

## Mettre en ligne

Depuis ce dossier de travail, jamais dans `/srv/honear` (c'est le script qui le remplit). Ce qui est en ligne est toujours
un commit : le script refuse un dépôt qui a des changements.

```
npm test && npm run controle && git commit … && sudo sh deploiement/mettre-en-ligne.sh
```

- **Quand ?** Quand personne ne joue : les parties en cours s'arrêtent, les comptes restent.
- **Vérifier :** `curl -s https://honear.fr/sante` doit répondre `"musique":true` et `"comptes":"ouverts"`.
- **Les journaux :** `sudo docker compose --project-directory /srv/honear logs --tail 100`.
- **La machine et le frontal :** dans `~/vps` (`sudo sh preparer.sh`, `sudo sh frontal/mettre-en-ligne.sh`). On n'y touche que
  pour le jeu (son bloc dans le Caddyfile du frontal), en suivant ses règles.
- **Le même processeur :** les tests et la construction tournent sur la machine du jeu en ligne. Lance-les aussi quand personne ne joue.

## Ce à quoi on ne touche jamais

- `/etc/honear/courrier.env` : le mot de passe de l'e-mail qui envoie les liens des comptes. C'est Mateo qui le règle lui-même (`sudo sh deploiement/courrier.sh`, dans un vrai terminal). Ne demande jamais de mot de passe.
- `/var/lib/honear/comptes.json` : les comptes des joueurs (adresses, sessions, scores). Ni lu à voix haute, ni copié, ni versionné.
- Aucun secret ne part sur GitHub.

## Comment Mateo veut qu'on travaille

- **Le temps :** un plafond de 4 heures par tour, corrections comprises. Si tu vois que tu vas le dépasser, arrête-toi et dis où tu en es.
- **La vérification :** une seule passe : `npm test`, `npm run controle`, et un regard sur le rendu. Pas de relecteurs ni de sous-agents, sauf s'il les demande.
- **Pas de mesures de performance**, pas de banc d'essai.
- **Les étapes 1 et 2** sont validées : ne les revérifie pas, réutilise leurs modules.
- **Le LISEZMOI :** mets à jour ce qui change, en quelques lignes. Ne le récris pas.
- **Un outil qui bloque :** arrête-toi au premier refus et dis-le, sans chercher à le contourner.
- **Le compte rendu :** court. Ce qui est fait, ce que tu as tranché (une ligne chacun), ce qui reste.

Sur le VPS, il n'y a pas de navigateur. Le regard sur le rendu passe par les planches de `sortie/`, à ouvrir sur un ordinateur, ou par le site lui-même.
