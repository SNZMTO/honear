# Honear — étapes 1 à 7, et le jeu en ligne

Un blind test musical entre potes, qui se joue sur le dessus d'un meuble hi-fi en noyer, sous une lampe couleur miel.
Ce dossier contient ce que les sept premières étapes demandent, prototype compris, et rien d'autre :

1. **La planche de rendu** : le socle du dessin low-poly, la platine complète, une pochette et son avatar, le logo.
   Tout y est immobile, mais chaque pièce mobile est déjà un calque à part, et son ombre aussi.
2. **La platine en mouvement** : le décompte, l'extrait, la mauvaise réponse et la révélation, rejouables, avec un ralenti.
   C'est l'atelier : une page où la piste d'exemple se rejoue, se ralentit et s'interrompt en route.
3. **Le système visuel** : la palette et ses 5 tons, les encres, les caractères, le logo, le meuble entier, la platine et son bras,
   et ce qui manquait : l'ampli et ses vumètres, le bac à disques, les touches, les pastilles qui disent quelque chose.
4. **Fais ta pochette** : l'avatar, en attendant de vrais personnages (une tête taillée, ce qu'on porte dessus, trois couleurs),
   les quatre expressions, les motifs, la touche « Au hasard », les vingt noms d'artiste et les quarante albums, douze pochettes d'exemple.
5. **Tous les écrans du téléphone**, et tous leurs états, en images arrêtées : l'accueil, la pochette, le bac (trois façons de choisir),
   les réglages, le salon (code sur l'étiquette, QR code sur la kraft), une piste en libre et en 4 choix, le hit-parade, la finale ;
   les règles d'une partie (modes, jugement, barème), la danse des aiguilles et la vibration ; et leurs animations, en pellicules.
6. **L'écran de l'hôte, en grand** (1440 × 900) : le meuble entier d'un seul regard, la tablée devant ; le salon, la piste en libre
   et en 4 choix, la révélation, le hit-parade, la finale, de la même partie que les écrans du téléphone.
7. **La planche d'animations et les notes techniques** : les treize animations de la tablée et du meuble, jouées en direct, chacune seule,
   au ralenti, en version sobre et interrompue à mi-course, avec ses réglages et sa frise ; le contrat des messages (`regles/messages.ts`) ;
   `NOTES-TECHNIQUES.md` ; et **le prototype** : une partie cliquable de bout en bout, au téléphone de l'hôte, contre le serveur simulé
   et cinq potes, en saisie libre ou en 4 choix (`sortie/prototype.html`).

Pour le mettre en ligne : `HEBERGEMENT.md` (un conteneur Docker sur un VPS Debian, derrière le frontal du dépôt `vps`).
Pour continuer à travailler avec Claude Code (sur le VPS ou ailleurs) : `CLAUDE.md`, ses règles, ses commandes, et la mise en ligne
depuis un clone du dépôt.
Pour qui découvre le projet sur GitHub : `README.md`, la vitrine, ses captures dans `.github/captures/`, et ses images dans
`.github/vitrine/`, dessinées par le moteur du site (`npm run vitrine`, `src/planche/vitrine.ts`). Les tests et les
contrôles du rendu tournent aussi sur GitHub à chaque envoi sur `main` (`.github/workflows/tests.yml`).

Et le jeu en ligne : le serveur sur un VPS (`HEBERGEMENT.md`), les téléphones branchés par WebSocket, le son, les extraits de
30 secondes de Deezer, et les comptes, facultatifs, ouverts par un lien envoyé par e-mail.

## Lancer

```
npm install
npm run planche     # étape 1 : écrit sortie/*.svg (cinq images et deux détails grossis), sortie/apercu.html et sortie/rapport.json
npm run atelier     # étape 2 : écrit sortie/etape2.html (la page à publier), sortie/etape2-local.html (la même, à ouvrir ici) et sortie/piste/*.svg
npm run systeme     # étape 3 : écrit sortie/etape3.html (la page à publier, sans script, polices embarquées), sortie/etape3-local.html (la même, à ouvrir ici) et sortie/systeme/*.svg
npm run pochette    # étape 4 : écrit sortie/etape4.html (la page à publier ; son seul script fait défiler les tirages), sortie/etape4-local.html et sortie/pochette/*.svg
npm run ecrans      # étape 5 : écrit sortie/etape5.html (la page à publier, sans script ; ses images sont à côté, dans sortie/ecrans/), sortie/etape5-local.html et sortie/ecrans/*.svg
npm run hote        # étape 6 : écrit sortie/etape6.html (la page à publier, sans script ; ses images sont dans sortie/hote/), sortie/etape6-local.html et sortie/hote/*.svg
npm run animations  # étape 7 : écrit sortie/etape7.html (la page à publier ; son script monte et joue les animations) et sortie/etape7-local.html
npm run prototype   # étape 7 : écrit sortie/prototype.html (la page à publier ; son script fait tourner le serveur, les potes et le téléphone) et sortie/prototype-local.html
npm run construire  # le jeu en ligne : écrit dist/index.html (la page) et dist/serveur.mjs (le serveur, à lancer avec Node 22 ou plus récent)
npm run site        # lance dist/serveur.mjs sur http://127.0.0.1:8080 ; HOTE=0.0.0.0 pour y brancher les téléphones du réseau local
docker build -t honear .   # l'image du jeu, celle que deploiement/mettre-en-ligne.sh met en ligne
npm run controle    # passe les contrôles du rendu sur toutes les images, et dit ce qu'ils ont mesuré
npm test            # vérifie les types (ceux du projet, puis ceux des scripts des pages), puis lance tous les tests
npm run format      # Prettier
```

Il faut Node 20 ou plus récent (écrit et vérifié avec Node 22). `npm run controle` lance `outils/controler.ts`.
`tsconfig.page.json` vérifie le script de la page, et tout ce qu'il importe, contre la bibliothèque du langage d'il y a cinq ans
(ES2019), sans rien de Node : `npm test` le passe avant les tests.
Sept outils, à côté, sont en Python ; deux d'entre eux pilotent des modules écrits en TypeScript : `pellicule.py` tire
`outils/pellicule.ts` ; `banc.py` fait assembler `outils/banc.ts` par `outils/assembler.ts`, comme la page de l'atelier est assemblée :

| Outil | Ce qu'il fait | Ce qu'il lui faut |
| --- | --- | --- |
| `outils/voir.py` | Regarde un SVG de `sortie/` de près : `python3 outils/voir.py sortie/piste/06-piste-extrait.svg zoom.png 120 150 220 220 4` (x, y, largeur, hauteur, grossissement). | Playwright et son Chromium |
| `outils/pellicule.py` | Tire la pellicule de la séance : une image par instant demandé, assemblées en planche-contact. `python3 outils/pellicule.py dossier 0.6 0.7 0.8 0.9 1.0` ; options dans l'en-tête de `outils/pellicule.ts` (densité, verso, version sobre, ombres figées, extrait qui tarde, rayures de plus, révélation avant l'heure). | idem, et Pillow |
| `outils/capture.py` | Capture une page entière, par exemple `sortie/apercu.html`. | Playwright et son Chromium |
| `outils/atelier.py` | Ouvre la page de l'atelier dans un navigateur sans tête, y fait des gestes (cliquer, toucher, clavier, attendre, défiler) et capture ce qu'on voit. Sait aussi priver le navigateur d'une capacité, couper les scripts, ou demander des animations réduites. | idem |
| `outils/banc.py` | Le banc d'essai. `image dossier fine d2 4 7 16.5` pose la scène montée à des instants, à côté de son SVG de référence, et compte les pixels qui diffèrent. `mesure d3 ecrire 4 8` ralentit le processeur quatre fois, puis huit, rejoue la séance dans l'atelier, dit ce que coûte une image, et recopie les relevés dans `src/planche/etape2/banc.ts`. À lancer seul sur la machine. | idem, et Pillow |
| `outils/ranger-les-imports.py` | Range les imports de chaque fichier ; à faire suivre de `npm run format`. | rien |
| `outils/preparer-polices.py` (`npm run polices`) | Refabrique `polices/` à partir des paquets Fontsource. Les polices sont déjà là : inutile pour lancer. | rien |

## Ce que les étapes montrent

| Image | Ce qu'on y voit | Polygones | Dont décor (2 500 au plus) | Calque mobile le plus lourd (moins de 150) |
| --- | --- | ---: | ---: | --- |
| `platine-fine.svg` | La platine au téléphone (390 × 844), densité fine : celle du site | 5 166 | 1 069 | bras, 145 |
| `platine-sobre.svg` | La même, densité sobre : celle du mode léger | 1 670 | 641 | bras, 137 |
| `platine-eclatee.svg` | La platine entière, calques écartés, chacun avec son rôle et son poids | 5 289 | 1 192 | bras, 145 |
| `pochette.svg` | La pochette de Tonton Reverb, en 240 px et en 48 px | 287 | 98 | — |
| `logo.svg` | Le logo sur son étiquette et son vinyle | 3 223 | — | étiquette, 52 |
| `detail-fine.svg`, `detail-sobre.svg` | Le même détail de chaque platine, grossi trois fois | — | — | — |
| `piste/01` à `piste/10` | La piste d'exemple arrêtée à dix instants : au repos, le disque qui sort, qui vole, les arcs, le bras levé, l'extrait, la rayure, le ralentissement, le retournement, la réponse | — | 1 069, puis 1 053 à partir du retournement | bras, 145 |
| `piste/11` | La réponse avec l'autre verso : tout le disque est la pochette | — | 1 053 | bras, 145 |
| `systeme/*.svg` | La planche du système (étape 3) : le meuble entier, l'ampli éteint et allumé, un vumètre de près, le bac, les touches, les pastilles, et ce qui est repris de l'étape 1 | — | 1 713 au plus (le meuble entier) | bras, 145 ; à l'ampli, le voyant, 114 |
| `pochette/*.svg` | « Fais ta pochette » (étape 4) : l'écran au téléphone, chaque tête et chaque dessus de tête sur une pochette, les expressions, les motifs, douze tirages au sort, douze pochettes sur le noyer | — | 354 au plus (l'écran) | une touche, 42 |
| `ecrans/*.svg` | Les écrans du téléphone (étape 5) : 36 écrans et états d’une partie, l'ampli à cinq instants de la danse, 13 pellicules d'animations (75 images, tirées des animations de l'étape 7 : réglées, pas redessinées) | — | 2 500 au plus | bras, 145 |
| `hote/*.svg` | L'écran de l'hôte (étape 6) : six moments d'une partie, le meuble entier en 1440 × 900 | — | 2 500 au plus | bras, 145 |

Un calque mobile pèse ses polygones et les lettres de ses textes : une lettre est tracée en contour, comme le reste.
Le vinyle, la pochette et le corps des boutons sont figés en image dès qu'ils sont dessinés : ils n'entrent ni dans le décor
ni dans les calques mobiles. Hors la comparaison des densités, tout est dessiné en densité fine.

### L'atelier (`sortie/etape2.html`)

La scène est dans un cadre de téléphone de 390 × 844, que la page ajuste à la place qu'elle a. Deux mises en page :

- **En colonne**, sur un téléphone ou une tablette debout : la scène à gauche, entière dans son cadre, et la façade en colonne à sa droite.
  Rien n'y est caché par les touches ; la scène y est donc plus petite qu'en jeu (aux trois quarts sur un téléphone de 390 px de large).
  Le reste de la page est dessous.
- **De bureau**, à partir de 940 px de large, ou de 560 px sur un écran nettement plus large que haut : le cadre à gauche, dans une coque
  de téléphone, qui reste en vue pendant qu'on lit ; à droite, la façade en rangs, puis le reste. Un avis s'y écrit dans la colonne
  de droite : il ne prend rien à la scène. Un téléphone couché, qu'on reconnaît à ce qu'on le touche du doigt, y lit en plus une phrase
  qui lui dit de se redresser : la platine y tient en tout petit. Une fenêtre basse qu'on tient à la souris ne la lit pas.

La page tient à partir de 320 × 400 px en colonne, et de 320 px de haut couchée : c'est moins que le plus petit des téléphones
dont le navigateur montre ses barres. En dessous, la ligne d'état peut déborder de sa place. Sur un téléphone court, les dernières
touches de la colonne sont sous le premier écran : la scène reste en vue, entière, pendant qu'on fait défiler la colonne jusqu'à elles.

Sous le cadre, une ligne dit où en est la piste (« Avant la piste », « Décompte · 2 », « L'extrait charge », « Extrait » et son temps
écoulé, « Rayé. » un instant après une mauvaise réponse, « Révélation », puis la réponse une fois que le disque la montre).
Dans une petite fenêtre en colonne (600 px de haut au plus, ou moins de 340 de large), où le cadre est trop étroit pour une réponse,
elle a deux lignes, qu'elle les remplisse ou non : le cadre ne change pas de taille quand la réponse arrive.
La façade range ses touches en cinq groupes, chacun sous son nom gravé :

- **Rejouer** — Décompte, Attente, Extrait, Rayure, Révélation : la piste repart d'un peu avant ce moment, et tout s'enchaîne jusqu'au bout.
  « Attente » la rejoue quand l'extrait tarde à charger : le plateau tourne, le bras attend, levé, la pastille reste sur « 1 ».
- **En extrait** — Rayer, Révéler, allumées pendant l'extrait seulement : une mauvaise réponse tout de suite (deux coup sur coup :
  le disque repart d'où il en est) ; la révélation avant l'heure (chaque pièce repart de sa position et de sa vitesse du moment).
  Ce sont les touches qui interrompent à mi-course.
- **Ralenti** — ×1, ×0,5, ×0,25.
- **Verso** — Verso A, Verso B : les deux façons de montrer la réponse au dos du disque, à comparer. Changer de verso ne refait que le verso.
- **Options** — Sobre : ce que voit quelqu'un qui a demandé moins d'animations à son appareil. Elle s'enclenche d'elle-même si l'appareil
  le demande, à l'ouverture comme en route ; la page le dit alors d'un avis, et une touche rend les animations. Si l'appareil y renonce,
  elle se relâche. Léger : le mode léger (voir plus bas).

Rien ne joue tout seul à l'ouverture : l'action part au toucher. Sous le premier écran : le mode d'emploi de chaque touche,
**la liste des temps** (pour chaque signal, ce qui part, quand, comment la pièce y va, et ses réglages : elle est lue dans les gestes
de la piste et calculée sur la table des réglages, jamais recopiée), et **ce que coûte une image** (mesuré sur l'appareil qui regarde,
puis les relevés du banc d'essai et ce qu'il faut en lire).

La page se publie telle quelle : pas d'enveloppe, polices embarquées, rien à aller chercher. Son script n'y laisse ni balise
qui le fermerait ni caractère de commande : la minification en laissait deux, tels quels (le même U+0001, dans les deux écritures
d'une chaîne d'opentype.js), et ce qui transporte une page peut les retirer (`planche/script.ts`, `tests/script.test.ts`).
Elle se lit avant que son script ne démarre ; tant que la scène se monte, le cadre dit « On sort le disque de sa pochette. » ;
si elle ne peut pas se monter, il dit qu'il ne sait pas, et ce qui lui manque quand il le sait. Quand plus rien ne bouge,
ou qu'on ne voit plus ni la scène ni ses touches, l'atelier ne demande plus d'images.
À la souris, une touche agit dès qu'on appuie ; au doigt, quand il se relève : la page défile, et un doigt qui se pose veut peut-être
la faire glisser. Les touches du jeu, dont les écrans ne défilent pas, agiront au toucher (`ecran/touche.ts` sait les deux).

## Les couches

Le site a six couches qui ne se mélangent jamais. Le réseau, à part, est le seul à toucher aux sockets et au disque côté serveur.
À côté d'elles, l'écran pose la scène dans un navigateur, et les planches sont les documents de travail des étapes.

| Couche | Dossier | Rôle | Ce qu'elle a le droit de lire |
| --- | --- | --- | --- |
| Les ressources | `src/ressources/` | Des données, jamais du code : palette, lampe, projection, typo, textes, mesures, table des réglages de mouvement. | Rien d'autre qu'elles-mêmes |
| Les règles | `src/regles/` | Une machine à états pure : un état et une action donnent un nouvel état. Ni écran ni réseau. | Les ressources |
| Le mouvement | `src/mouvement/` | Le moteur : ressorts, volant, chute freinée, portage. Il ne connaît ni la platine ni le jeu. | Rien d'autre que lui-même |
| Le low-poly | `src/lowpoly/` | Les fonctions de formes, la fonction d'ombrage, la projection. | Les ressources |
| La scène | `src/scene/` | Le meuble et ses objets. Chaque objet lit l'état qu'on lui donne et rend des calques ; il ne modifie jamais le jeu. | Le low-poly, le mouvement, les règles, les ressources, le lexique |
| Le serveur | `src/serveur/` | Les rooms en mémoire, leur horloge, les connexions des téléphones. Il décide de tout et ne publie que ce que chacun peut savoir. | Les règles, les ressources |
| Le réseau | `src/reseau/` | Le site en ligne : la page servie sous une politique stricte, un WebSocket par téléphone, ce qui arrive vérifié, l'horloge du serveur. | Le serveur, les règles, les ressources ; Node et `ws` |
| L'écran | `src/ecran/` | Pose une scène dans la page d'un navigateur, lit l'heure, branche les touches ; le client du téléphone (`ecran/telephone/`). Le seul endroit, avec les planches, qui sache ce qu'est une page. | La scène, le low-poly, les règles (il en reçoit l'état d'une piste), les ressources, le lexique |
| Les planches | `src/planche/` | Les documents de travail : la planche de rendu, l'atelier, la planche du système. Seules à toucher au disque dur. | Tout le reste ; personne ne les lit |

`src/lexique.ts` fixe les mots du projet. Ces frontières sont vérifiées par `tests/sources.test.ts`, import par import ;
le même test vérifie que le script embarqué dans la page n'importe rien de Node.

## Le mouvement, de l'horloge à l'écran

```
l'horloge  →  les règles  →  les gestes  →  la partition  →  le moteur  →  la pose  →  les réglages  →  le montage
 (serveur)     (Piste)        (qui part       (consignes)      (ressorts)    (où est      (transformations   (toiles, blocs,
                               quand)                                         chaque pièce) et opacités)       SVG)
```

1. **L'horloge.** Tout se lit sur une seule horloge, en secondes : celle du serveur en jeu, une horloge qu'on remet à l'heure dans l'atelier.
   `ecran/horloge.ts` est le seul module du site qui lise l'heure (le banc d'essai, un outil de mesure, la lit aussi).
2. **Les règles** (`regles/piste.ts`). Une piste est un état : l'heure du décompte, celle de l'extrait quand tous les appareils sont prêts,
   celle de la révélation. Trois actions : lancer, prêts, révéler. Elles disent aussi quand une mauvaise réponse raye le disque : pendant l'extrait.
3. **Les gestes** (`scene/piste/gestes/`). La chorégraphie n'est écrite qu'ici : pour chacune des quinze grandeurs qui bougent (la place
   du disque, l'angle du bras, le regard…), la suite de ses gestes, chacun compté depuis un signal (un chiffre du décompte, l'extrait,
   une rayure, la révélation, l'arrêt du plateau). Seuls ceux de la main qui raye le disque sont écrits à côté, avec ce qu'elle lui fait
   (`scene/piste/rayures.ts`). Un geste et le coup qui l'arrête sont datés de la même façon : ils tombent au même instant, au bit près.
   La partition, la liste des temps de l'atelier et les tests lisent tous ces gestes.
4. **La partition** (`mouvement/choregraphie.ts`, `scene/piste/partition.ts`). Ce que le moteur suit : la consigne de chaque grandeur à tout
   instant (une cible, ou une course à suivre, et la matière qui l'y ramène). C'est une fonction pure de la piste et de l'heure :
   un téléphone en retard y lit où en sont les choses, il ne rejoue pas ce qu'il a manqué.
5. **Le moteur** (`mouvement/moteur.ts`). Il ramène chaque grandeur sur sa consigne par la solution exacte d'un ressort amorti, sur le temps
   réel : le mouvement est le même à 60 et à 120 images par seconde. Quand la consigne change, la grandeur repart de sa position
   et de sa vitesse du moment. Après un trou de plus d'une seconde (un onglet caché), il pose les grandeurs au lieu de rejouer.
   Une grandeur presque arrivée s'arrête net : son élan éteint, plus rien ne s'écrit pour elle dans la page.
6. **La pose** (`scene/piste/pose.ts`). Où est chaque pièce à cet instant. Le dessin la lit pour dessiner ; le mouvement la lit pour régler.
7. **Les réglages** (`scene/reglage.ts`). Ce que le mouvement change à une scène déjà dessinée : une transformation d'un calque, par son rang,
   ou son opacité. Jamais un polygone. Chaque objet dit lui-même ce qui se règle chez lui (`reglerLeDisque`, `reglerLeBras`…).
8. **Le montage** (`ecran/montage.ts`). La scène posée dans la page : voir plus bas.

Aucun mouvement n'est réglé ailleurs que dans `ressources/mouvement.ts` : les matières (un ressort par geste, le volant du plateau,
la chute freinée du bras et des pastilles), les temps (ce qui part quand, depuis chaque signal) et les ampleurs (de combien).
Les autres temps ne règlent pas un mouvement, et chacun a sa table : ceux d'une partie (le décompte, la durée d'un extrait) dans
`ressources/reglages.ts`, l'attente avant de refaire les toiles dans `ressources/ecran.ts`, et ceux de l'atelier (le déroulé de sa séance,
les instants de ses images) dans `planche/etape2/minutage.ts`. `tests/sources.test.ts` vérifie ce qu'un test de sources peut vérifier :
un geste part à son signal ou après un temps lu dans la table, jamais après un nombre écrit là ; une minuterie n'attend que zéro
ou un temps qui a un nom ; et dans la chorégraphie, à l'écran et dans l'atelier, un nombre à virgule n'apparaît que dans une constante
nommée. Il ne sait pas dire qu'un nombre entier est une durée : cela, c'est la relecture qui le tient.

Quatre lois de mouvement, toutes en forme close (aucune n'avance par petits pas) : le **ressort** amorti ; le **volant**, qu'un moteur lance
et que le frottement arrête (le plateau) ; la **chute freinée** (le bras sur son amortisseur, une pastille qui claque : ce qui les reçoit
les arrête net, d'un coup) ; le **portage** (le disque qu'une main mène de sa pochette au plateau, ou retourne : la main va vers chaque place
comme un ressort, le disque la suit par le sien, il part donc sans à-coup, et ses deux trajets s'ajoutent, ce qui arrondit son chemin).

### Ce que le mouvement garantit, et ce qui le vérifie

| Règle du brief | Où elle vit | Ce qui la vérifie |
| --- | --- | --- |
| De la physique, pas des durées : un ressort, un volant, une chute ou un portage par mouvement | `mouvement/`, `ressources/mouvement.ts` | `tests/mouvement.test.ts`, `tests/sources.test.ts` (aucun geste daté d'un nombre écrit hors de la table) |
| Le vinyle prend sa vitesse en 1,4 s, la perd en 2 s, ne rebondit jamais | `mouvement/volant.ts`, `MATIERES.plateau`, `MATIERES.vinyle` | `tests/mouvement.test.ts`, `tests/piste.test.ts`, `tests/temps.test.ts` |
| Porté de sa pochette au plateau, le disque part sans à-coup, ne s'arrête pas en route, ne dépasse jamais | `mouvement/portage.ts`, `MATIERES.main`, `MATIERES.vinyle.suit` | `tests/mouvement.test.ts`, `tests/piste.test.ts` |
| Le bras se lève vite, descend en 620 ms (le brief en voulait 700, voir plus bas), dépasse sa cible une fois, à peine ; au « 1 », il pivote en 210 ms, il est au bord quand le levier se baisse, son dépassement culmine avant que sa descente ne parte, et il est revenu sur le bord avant d'avoir descendu d'un px | `mouvement/chute.ts`, `MATIERES.bras`, `scene/piste/gestes/` | `tests/piste.test.ts`, `tests/temps.test.ts` |
| Une pastille claque en 90 ms, arrêt net | `MATIERES.pastille`, `scene/piste/gestes/chutes.ts` | `tests/piste.test.ts`, `tests/temps.test.ts` |
| Le diamant touche à l'instant précis où l'extrait part, et rebondit d'un px | `scene/piste/gestes/` | `tests/piste.test.ts` |
| Si l'extrait tarde, le plateau tourne et le bras attend levé | `regles/piste.ts`, `scene/piste/gestes/` | `tests/regles.test.ts`, `tests/piste.test.ts`, `tests/atelier-en-page.test.ts` |
| Mauvaise réponse : 20° en arrière en 80 ms, retour en 120 ms, puis le disque reprend sa vitesse sans dépasser celle du plateau | `scene/piste/rayures.ts`, `scene/piste/gestes/` | `tests/piste.test.ts` |
| Le texte de l'étiquette se fond en arcs, et les arcs en texte, sans rien qui saute : les lettres s'étirent en traînée ; sous 10 tours par minute on relit le texte entier ; le disque s'arrête exactement à l'endroit | `scene/etiquette/fondu.ts`, `scene/piste/plateau.ts`, `scene/etiquette/arcs.ts`, `AMPLEURS.etiquette` | `tests/piste.test.ts` |
| Trois niveaux : l'action, la réaction d'un voisin, l'ombre | `scene/piste/gestes/`, `scene/ombre.ts` | `tests/piste.test.ts`, `tests/ombres.test.ts` |
| Les ombres disent la hauteur ; une pièce n'a qu'une ombre par surface qu'elle survole, le socle ou le plateau ; celle du bras sur le socle s'arrête au bord du socle, et là où commence celle du plateau | `scene/ombre.ts`, `scene/platine/bras.ts`, `scene/platine/socle.ts` | `tests/ombres.test.ts` |
| Rien ne part en même temps : 30 ms d'écart au moins | `ressources/mouvement.ts` (`TEMPS`) | `tests/piste.test.ts` |
| Tout se reprend en route, sans saut, même révélé en pleine mauvaise réponse | `mouvement/moteur.ts`, `scene/piste/suivi.ts` | `tests/piste.test.ts`, `tests/mouvement.test.ts`, `tests/atelier-en-page.test.ts` |
| Le même mouvement à 60 et à 120 images par seconde | `mouvement/ressort.ts`, `mouvement/moteur.ts` | `tests/mouvement.test.ts`, `tests/piste.test.ts` |
| Un téléphone en retard saute des étapes ; un onglet caché se recale au retour | `mouvement/moteur.ts`, `ecran/boucle.ts`, `planche/etape2/atelier.ts` | `tests/piste.test.ts`, `tests/mouvement.test.ts`, `tests/ecran.test.ts`, `tests/atelier-en-page.test.ts` |
| On n'anime que des transformations et des opacités, jamais un polygone | `scene/reglage.ts`, `ecran/montage/poignees.ts` | `tests/piste.test.ts` (régler ou redessiner donnent la même image), `tests/ecran.test.ts`, `tests/page.test.ts` (le style de la page) |
| Version sobre : les pièces changent de place d'un coup, le disque garde ses arcs, le bras avance ; elle suit ce que l'appareil demande, à l'ouverture comme en route | `scene/piste/sobre.ts`, `ecran/navigateur.ts`, `planche/etape2/page/touches.ts` | `tests/piste.test.ts`, `tests/ecran.test.ts`, `tests/demarrage.test.ts`, `tests/atelier-en-page.test.ts` |
| S'il peine, on coupe les réactions passagères et les ombres animées, jamais l'action principale | `ecran/allegements.ts`, `OptionsDeGestes`, `regleurDeLaPiste` | `tests/piste.test.ts`, `tests/ecran.test.ts` |
| Du « 3 » à la réponse, l'étiquette du disque ne sort jamais du cadre ; regard arrêté, aucun texte n'est coupé, aucune petite pièce ne dépasse d'un rien | `ressources/cadrages.ts`, `ressources/kraft.ts`, `AMPLEURS.regardSurLaReponse` | `tests/piste.test.ts`, `tests/cadrage.test.ts` |
| L'action part à l'instant du toucher ; les touches ont 2 px de course, 60 ms pour s'enfoncer, 80 ms pour remonter ; rien au survol | `ecran/touche.ts`, `TOUCHES`, `planche/etape2/gabarit/style.ts` | `tests/ecran.test.ts`, `tests/atelier-en-page.test.ts`, `tests/page.test.ts` |
| Un navigateur qui ne sait pas, une page où il manque un élément que son script anime, une scène qui ne se monte pas : le cadre le dit, et rien ne reste à moitié branché | `ecran/navigateur.ts`, `planche/etape2/page/demarrage.ts`, `planche/etape2/gabarit.ts` | `tests/navigateur.test.ts`, `tests/demarrage.test.ts`, `tests/page.test.ts` |
| Le script de la page se lit sur un téléphone vieux de cinq ans : assemblé pour ES2019, sans rien que ces navigateurs n'aient | `planche/script.ts`, `tsconfig.page.json` | `npm test` (les types du script de la page), `tests/script.test.ts`, `tests/sources.test.ts` |
| Rejouable, avec un ralenti à ×0,5 et à ×0,25, sa version sobre, la liste de ses temps et de leurs réglages, et de quoi l'interrompre à mi-course | `planche/etape2/` | `tests/atelier.test.ts`, `tests/temps.test.ts`, `tests/atelier-en-page.test.ts`, `tests/page.test.ts` |

## Comment la scène est posée dans un navigateur

Une scène est un arbre de calques. Le montage (`ecran/montage.ts`, et un module par geste dans `ecran/montage/`) la découpe selon ce qui changera :

- **Ce qui ne changera pas** est peint une fois sur des toiles, puis figé en image : le décor, par tranches entre les pièces qui bougent
  (huit toiles pour la piste). Le brief demande un seul calque de décor mis en cache ; l'empilement en demande une par tranche.
- **Une pièce qu'on déplace d'un bloc** (le disque, la pochette kraft) devient un conteneur à elle, avec ses toiles, déplacé par sa transformation.
- **Ce qui bouge en restant en polygones** (l'étiquette, le bras, les repères, les ombres) reste en SVG, un groupe par transformation.
  Un calque peut porter une découpe fixe : l'ombre du bras sur le plateau s'arrête au bord du plateau, où qu'elle tourne ; son ombre
  sur le socle s'arrête au bord du socle, et là où commence celle du plateau.

Après quoi une image ne coûte que des transformations et des opacités, et l'on n'écrit dans la page que celles qui changent.
Cinq choses, trouvées en mesurant, tiennent dans le code :

- Une toile posée entre deux px de l'appareil est rééchantillonnée, donc floue : chaque toile a pour taille le nombre de ses px,
  et c'est sa transformation qui la pose sur la grille et la ramène à l'échelle (`ecran/montage/grille.ts`). Le regard et les blocs
  sont posés sur la même grille, dès le montage.
- Une toile où l'on peut encore peindre est recopiée par le navigateur à chaque image qu'il compose : une fois peinte, chaque image
  est confiée à une toile qui ne sait que la montrer (`ecran/toile.ts`). Sans cela, le décor coûtait plus que tout ce qui bouge.
- Le verso du disque est le seul endroit dont le contenu change (`ecran/verso.ts`) : son fond quand on change de façon de montrer la réponse,
  la réponse à la révélation. Elle est dessinée pendant que le disque ralentit, à une image, puis posée à la suivante, bien avant
  qu'il ne se retourne. Rien d'autre n'est refait. Un contenu qui ne peut pas être posé en entier ne laisse rien : le calque garde
  ce qu'il portait, et l'on règle toujours ce qu'on voit (`ecran/montage/chantier.ts`).
- La scène n'est remontée que si sa facture change (`ecran/facture.ts`) : sa densité, ses ombres figées ou non, la définition de ses toiles.
  Un autre dessin (le mode léger) est monté à l'image d'après le toucher, le temps que la touche s'enfonce ; une autre taille de cadre,
  une fois qu'elle se tient depuis 0,3 s. L'ancienne scène ne s'en va que la nouvelle prête, et une scène refusée n'est pas retentée à chaque image.
  Qui tient l'écran lui demande d'abord de tenir sa facture (`tenirLaFacture`), puis de montrer l'instant (`montrer`) : remonter la scène
  n'entre pas dans ce qu'on compte comme le travail d'une image.
- Une toile où l'on a peint rend sa mémoire dès qu'on lui retire sa taille ; une toile qui ne fait que montrer une image figée ne la rend
  qu'au passage du ramasse-miettes. Mesuré dans Chromium, sur la page, à 3 px d'appareil par px : 395 Mo la scène montée, 489 Mo après
  vingt remontages coup sur coup, 403 Mo après un ramasse-miettes. En jeu, la scène n'est remontée que si l'on passe au mode léger
  ou si le cadre change de taille ; cela reste à mesurer sur Safari, qui compte la mémoire des toiles autrement.

`outils/banc.py image` compare la scène montée à son SVG de référence : à 2 px d'appareil par px, moins de 0,3 % des pixels diffèrent,
tous sur des bords.

### Le mode léger, la version sobre, et un navigateur qui ne sait pas

- **Le mode léger** (« Léger », à la main seulement) : la densité sobre ; des toiles jusqu'à moitié moins définies (jamais moins d'un px
  de toile par px de scène : en dessous, tout devient flou) ; plus de réactions passagères des pièces voisines (le disque qui tasse
  la feutrine, le diamant qui rebondit, le bras qui tressaute et ondule, les repères qui accusent le coup) ; des ombres dont les paliers
  ne s'écartent plus (elles suivent encore leurs pièces, et s'en éloignent quand elles montent). L'action principale ne change pas
  d'un instant. La pochette kraft, elle, reste entraînée de 2 px dans tous les modes : c'est une réaction qui laisse la pièce ailleurs,
  et la retirer la ferait changer de place chaque fois qu'on allège la scène en route.
- **La version sobre** : pour qui a demandé de réduire les animations. Ce n'est pas un allègement, c'est une autre lecture du même état.
- **Un navigateur qui ne sait pas** : le cadre dit « Ce navigateur ne sait pas lire ce disque. », et ce qui lui manque. La phrase est dans la page
  dès le départ, cachée ; un second script, écrit pour le plus vieux des navigateurs, la montre si celui de la page n'a jamais démarré.
  Sans script du tout, c'est une autre phrase : « Sans ses scripts, la platine ne tourne pas. »

Ce que le banc a mesuré (`python3 outils/banc.py mesure d3 ecrire 4 8`), dans un navigateur sans carte graphique, à 3 px d'appareil
par px. Il rejoue la séance entière dans l'atelier lui-même, cinq fois pour chaque scène, et garde la médiane. Les scènes passent
tour à tour à chaque passe, et chaque mesure part d'une mémoire rangée : une machine qui ralentit un moment touche alors une passe
de plusieurs scènes, que la médiane écarte, au lieu de toutes les passes d'une seule. Ces relevés sont ceux
de `src/planche/etape2/banc.ts` : la page les affiche, phase par phase, et en tire elle-même ce qu'il faut en lire.

| Scène | Premier dessin (×4) | Fil principal, par image (×4) | Dont script (×4) | Images en retard, pire phase (×4) | Premier dessin (×8) | Fil principal, par image (×8) | Dont script (×8) | Images en retard, pire phase (×8) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Entière | 1 410 ms | 8,7 ms | 2,0 ms | 3,0 % | 2 880 ms | 16,3 ms | 3,8 ms | 27,6 % |
| Sans réactions, ombres d'un seul bloc | 1 368 ms | 8,0 ms | 1,8 ms | 3,2 % | 2 930 ms | 16,2 ms | 4,0 ms | 21,9 % |
| Toiles moitié moins définies | 668 ms | 8,5 ms | 1,9 ms | 2,4 % | 1 293 ms | 16,6 ms | 4,0 ms | 23,0 % |
| Moins de facettes | 727 ms | 8,7 ms | 1,8 ms | 2,8 % | 1 580 ms | 16,2 ms | 3,8 ms | 24,8 % |
| Mode léger : les trois à la fois | 301 ms | 7,8 ms | 1,7 ms | 2,0 % | 702 ms | 15,4 ms | 3,6 ms | 19,8 % |

Une image est en retard quand elle arrive à plus de 25 ms de la précédente. Le temps médian entre deux images est de 16,6 à 16,7 ms
partout à ×4 ; de 18,0 à 20,4 ms à ×8. « Dont script » est ce que l'atelier mesure lui-même autour de la pose, des réglages
et de leur écriture dans la page, en moyenne sur les tranches pleines de 90 images de la séance ; le reste du fil principal est
au navigateur (le style, la mise en page, la peinture).

Ce qu'il faut en lire, sans l'embellir. Le banc a été relancé une seconde fois, à la suite, seul sur la machine et sur le même code :
ce qui suit ne retient que ce que les deux relevés disent tous les deux, et donne les deux nombres quand ils s'écartent
(le premier est celui de la table).

- **Ralenti quatre fois, la scène entière tient 60 images par seconde avec de la marge** : la moitié de chaque image part en travail
  (8,7 puis 8,5 ms sur 16,7), trois images sur cent arrivent en retard dans la pire phase.
- **Ralenti huit fois, elle ne les tient plus** : 16,3 puis 16,9 ms de travail sur 16,7, une image sur quatre en retard
  dans la pire phase (27,6 puis 25,6 %).
- **Ce que le mode léger apporte, c'est l'ouverture** : quatre à cinq fois plus courte (de 4,1 à 4,9 fois, selon le banc et le relevé).
  La demi-définition la divise par 2 environ (de 1,9 à 2,2) ; la densité sobre, par un peu moins (de 1,7 à 1,9). Couper les réactions
  n'y change rien : c'est le même dessin.
- **Par image, aucun allègement ne change rien que ce banc sache mesurer, pas même le mode léger, qui les réunit.**
  Le mode léger a pris 0,9 puis 0,1 ms de moins que la scène entière au banc ×4 (10 puis 1 %), 0,9 puis 1,0 ms au banc ×8
  (5,5 puis 6 %). Couper les réactions et les ombres animées : 0,7 puis 0,3 ms à ×4, 0,1 puis 1,5 ms à ×8. La demi-définition
  et la densité sobre : de 0,3 ms de moins à 0,3 ms de plus. Seul l'écart du mode léger au banc ×8 se retrouve tel quel
  aux deux relevés, et il est petit ; les autres vont de presque rien à 1,5 ms selon le relevé. S'il y a un gain par image,
  il est de l'ordre de 5 % : sous ce que ce banc sépare.
- **Les images en retard ne départagent pas mieux les scènes** : au banc ×8, de 20 à 28 % dans la pire phase pour toutes
  (le mode léger : 19,8 puis 26,2 %).
- **Ce dont deux relevés du même code diffèrent.** Pour une même scène : le premier dessin, jusqu'à 1,19 fois (le mode léger au banc ×8 :
  702 puis 588 ms) ; le travail par image, jusqu'à 8 % (le mode léger au banc ×4 : 7,8 puis 8,4 ms). Pour ce que la page compare,
  l'écart d'une scène allégée à la scène entière : jusqu'à 1,18 fois au premier dessin, et 9 points sur le travail par image
  (le mode léger au banc ×4 : 10 % de moins, puis 1 %). D'où les seuils de la page, qui dit « rien de mesurable » d'un premier dessin
  moins de 1,3 fois plus court et d'un travail par image qui change de moins de 15 % : une fois et demie le gain qu'un relevé a vu
  et que l'autre n'a pas retrouvé. `tests/page.test.ts` vérifie que les relevés publiés ne contredisent pas le premier seuil
  (deux scènes au même dessin : 1 410 et 1 368 ms) ; le second vient de l'écart entre les deux relevés, dont un seul est publié.
- **L'ordre des mesures compte.** Une première façon de mesurer passait les scènes l'une après l'autre (trois passes de la scène
  entière, puis trois de la suivante), sans ranger la mémoire entre deux. Quatre relevés pris ainsi donnaient au mode léger 8 à 16 %
  de travail en moins par image au banc ×8 ; passées tour à tour, il n'en reste que 5,5 à 6 %. C'est pourquoi le banc entrelace
  ses passes. Les nombres bougent aussi d'une heure à l'autre, de 10 % environ, avec la machine qui porte le banc : ce qui s'y compare,
  ce sont les scènes d'un même relevé.

Où part le temps d'une image : pour un peu moins d'un quart dans le script (2,0 ms sur 8,7 ; 3,8 sur 16,3), pour le reste dans
le navigateur, qui repeint les SVG dont un groupe a bougé. Garder le bras, l'étiquette et les ombres en polygones nets a ce prix.
C'est aussi pourquoi les allègements ne gagnent presque rien par image : aucun ne retire ces SVG.

Ce que ce banc ne dit pas : il ralentit le fil principal, pas la composition des images ; il ne remplace pas un vrai téléphone.
Et tout a été vérifié dans Chromium seulement : Safari et Firefox restent à essayer sur de vrais appareils.

## Les modules, un rôle chacun

```
src/
  lexique.ts                    Un seul nom par chose ; le nom d'un calque commence par un mot du lexique, et le compilateur le vérifie.

  ressources/
    palette.ts                  Une valeur de base par couleur, et le réglage qui en tire ses 5 tons.
    lampe.ts                    La lampe : sa direction, les seuils des 5 tons, l'encre et la longueur des ombres, la nappe sur le bois.
    projection.ts               L'écrasement de la vue : 0,88, écrit une seule fois.
    finis.ts                    Comment une surface répond à la lampe : mate, ou à sillons comme le vinyle.
    densites.ts                 Les deux densités de facettes : la fine, celle du site ; la sobre, celle du mode léger.
    typo.ts                     Les deux caractères, l'échelle des corps, les contrastes demandés, le signe de repli.
    textes.ts                   La forme des textes, la même pour toutes les langues ; les espaces qu'une langue ne coupe pas.
    textes.fr.ts                Les textes en français, dans la voix du projet.
    reglages.ts                 Les valeurs proposées sur les commandes (pistes, extrait), et le déroulé d'une piste.
    mouvement.ts                La table des réglages de mouvement : matières, temps, ampleurs, touches, tolérances du moteur.
    ecran.ts                    La définition des toiles d'une scène montée, et quand on les refait.
    cadrages.ts                 Où le regard s'arrête sur le meuble, par format d'écran.
    meuble.ts                   Le noyer : ses trois teintes selon la lumière, et le réglage de son veinage.
    platine.ts                  Les mesures de la platine, pièce par pièce.
    etiquette.ts                Les mesures d'une étiquette de disque, en parts de son rayon.
    kraft.ts                    La pochette kraft du disque mystère : ses mesures, sa place, le chemin du disque qui en sort.
    pastilles.ts                Les pastilles de disquaire, et celle du décompte.
    verso.ts                    Le côté réponse du disque : les mesures de ses deux versions.
    vignettes.ts                Ce qui tient lieu de vraie pochette dans les maquettes : une couleur, un motif.
    ampli.ts                    Les mesures de l'ampli : son coffre, ses vumètres et leur échelle, son volume, son interrupteur, son voyant.
    bac.ts                      Les mesures du bac et de ce qui s'y tient debout ; la couleur de l'intercalaire de chaque thème.
    touches.ts                  Le dessin des touches : leurs deux genres, le socle, le puits, le capuchon, l'état allumé.
    pochettes.ts                Ce qu'est une pochette, ses mesures, ses motifs et ses fonds ; les peaux que le hasard ne donne pas.
    avatar.ts                   L'avatar : ses formes de tête, ce qu'on porte dessus (en morceaux posés d'après la tête), ses bouches, ses expressions.
    tablee.ts                   Où se pose, sur chaque écran du téléphone, ce qui vient sur le bois : l'éventail, les papiers, les touches, la finale.
    reglages.ts recompenses.ts  La room (2 à 12 joueurs, le code) et le jugement ; les trois disques de la finale.
    vibrations.ts               Les seules vibrations du jeu (le prototype n'a pas de son).

  regles/
    piste.ts                    Le déroulé d'une piste : décompte, extrait, révélation. Un état, une action, un nouvel état.
    pochette.ts                 « Au hasard », « Un autre album » : le tirage au sort est passé en argument.
    partie.ts                   Une partie rejouée depuis son journal : les joueurs, leurs points, leurs têtes, le hit-parade, la finale, le code.
    jugement.ts                 Juste, presque ou faux : la saisie normalisée, comparée à l'attendu à quelques fautes près.
    modes/                      Le contrat d'un mode et le registre ; « Libre », « Solo », « First one », « 1re note », chacun son barème
                                (« 4 choix », au registre, n'est plus sur la manette ; « Tournoi » se choisit par son cran, sous la platine).
    tournoi.ts                  Le tournoi : le tableau, le duel qui vient, les votes, la clôture (majorité, pile ou face, forfait),
                                le disque d'or, l'oreille de la room.
    messages.ts                 Le contrat du transport : actions, nouvelles, et le journal tel que le serveur le publie.
    mot-de-passe.ts             Ce que vaut un mot de passe de compte (au téléphone comme au serveur), et sa forme normale.
    statistiques.ts             Ce que la page des statistiques reçoit du serveur.

  mouvement/
    ressort.ts                  Le ressort amorti, par sa solution exacte ; son dépassement, son temps d'arrivée, sa retombée après un coup.
    volant.ts                   Une masse qui tourne : un moteur la lance, le frottement l'arrête.
    glissade.ts rejeu.ts        Ce qu'on lance sur le bois et que le frottement sec arrête net ; une chorégraphie rejouée jusqu'à un instant.
    chute.ts                    La chute freinée : ce qui descend sur un amortisseur.
    portage.ts                  Une pièce lourde qu'une main mène de place en place : deux ressorts à la suite, des trajets qui s'ajoutent.
    parcours.ts                 Le chemin de ce dont on ne connaît que la vitesse (les repères du plateau).
    choregraphie.ts             Pour chaque grandeur, la suite de ses étapes ; la partition s'en déduit.
    moteur.ts                   LE moteur : des grandeurs, leurs consignes, les coups qu'on leur donne, le repos.

  lowpoly/
    vecteurs.ts boucle.ts polygones.ts contours.ts aleatoire.ts couleur.ts tons.ts
    ombrage.ts                  LA fonction d'ombrage : le ton d'une facette selon son orientation face à la lampe.
    projection.ts               LA projection, en gestes ; ce que devient un disque qu'on retourne.
    ombrePortee.ts              Le décalage des paliers d'une ombre selon la hauteur de l'objet ; l'ombre d'un disque retourné.
    facette.ts                  Une facette, et `peindre` qui lui donne son ton et la couche à l'écran.
    formes/                     Une fonction par forme : boîte chanfreinée, disque, plot, bouton moleté, cylindre, dôme, tête, nez, drapé, rosace, veine,
                                plaque debout (un carton tenu droit, un peu penché en arrière : ce qui se range dans le bac).

  scene/
    calque.ts                   L'arbre de calques : rôles, transformations, opacité, découpe, facettes peintes, aplats, textes.
    reglage.ts                  Ce que le mouvement change à une scène déjà dessinée ; régler ou redessiner donnent le même arbre.
    pile.ts                     Un objet à plat qui tourne : des étages, la rotation sur l'enfant, l'écrasement sur le parent.
    poignee.ts                  Un objet dessiné une fois, qu'on glisse et qu'on déforme autour d'un pivot sans le redessiner.
    ombre.ts                    L'ombre d'un objet, en calque à part : elle s'éloigne d'un bloc quand il monte, ses paliers s'écartent ; rognée à la surface qui la reçoit, trouée là où une autre la reçoit à sa place.
    memoire.ts                  Ce qui ne dépend que de ce qu'on lui donne se calcule une fois.
    typographie.ts              Les espaces qu'une langue ne coupe pas en fin de ligne, et là où une ligne peut passer à la suivante.
    encre.ts                    L'encre qui se lit sur une surface ; une ligne centrée à l'encre sur miel.
    retouche.ts texte.ts phrases.ts vinyle.ts vignette.ts logo.ts
    pastille.ts                 Une pastille de disquaire : elle arrive plus grande et d'un peu plus haut, puis claque ; une face qui écrit un message court.
    touche.ts                   Une touche : son socle, son puits, son capuchon qui s'y enfonce de 2 px, ses deux ombres.
    ampli/                      L'ampli (index.ts) et ses vumètres (vumetre.ts) : ce qui bouge, ce qui s'y règle.
    bac/                        Le bac : la caisse, ses intercalaires et ses pochettes debout, chacun un calque.
    kraft.ts                    La pochette kraft : son corps sous le disque, son devant par-dessus tant qu'il est dedans, son tampon, sa pastille.
    disque/
      index.ts                  Le disque : ses deux faces, sa tranche, son ombre ; ce qui s'y règle.
      centre.ts                 Le centre d'un disque, dans son propre dessin.
      verso.ts                  Le côté réponse : son fond, puis la réponse qu'on y pose à la révélation.
    etiquette/
      papier.ts logo.ts         Le papier miel d'une étiquette ; sa face à l'accueil.
      lignes.ts                 Ce qu'une étiquette écrit, toujours aux mêmes places.
      piste.ts                  L'étiquette du disque mystère.
      arcs.ts                   Les arcs qui remplacent son texte tant que le disque tourne.
      fondu.ts                  Ce que la vitesse fait de l'étiquette : la traînée de ses lettres, puis ses arcs, en fondu.
      reponse.ts                Ce qu'elle écrit quand c'est elle qui dit la réponse : le titre sur deux lignes droites, l'artiste dessous.
    meuble/                     Le noyer, la nappe de lumière, le regard et l'étendue qu'il parcourt ; le regard de l'hôte, sur le meuble entier.
    platine/                    Une pièce par fichier ; chacune sait se dessiner et dire ce qui se règle chez elle.
    pochette/ avatar.ts         La pochette d'un joueur et son avatar ; ses motifs (`motifs.ts`).
    tablee.ts                   Les pochettes des joueurs posées sur le bois (en éventail jusqu'à douze), leur tête, leur dos, leurs pastilles.
    papier.ts qr.ts             Le papier posé de travers où l'on tape et lit ; le QR code de la room (`qrcode-generator`, la seule bibliothèque ajoutée).
    recompense.ts               Les disques diamant, platine et or de la finale : en l'air, et l'éclat qui fait le tour du diamant.
    gestes/                     Les gestes de l'étape 5, écrits une fois : `geste.ts` (pas, rôles, version sobre), `tablee.ts` (arrivée, pastille,
                                « Presque. », 4 choix, vraie pochette, déconnexion, hit-parade, finale), `meuble.ts` (regard, ampli, volume, sélecteur, bac).
    ampli/danse.ts              La danse des aiguilles pendant un extrait, écrite une fois et suivie par le moteur.
    telephone/                  Les écrans du téléphone, ceux du jeu comme des planches : leurs pièces (`pieces.ts`), le meuble qu'ils montrent
                                (`meuble.ts`, `kraft.ts`), « Fais ta pochette » (`pochette.ts`), les écrans hors des pistes (`ecrans.ts`),
                                ce qu'on pose autour d'une piste (`piste.ts`, `reponse.ts`), les titres joués (`titres.ts`) ; au tournoi,
                                ce qu'on pose autour d'un duel (`duel.ts`), le tableau et le palmarès (`tableau.ts`).
    duel.ts                     Un duel du tournoi sur la platine : le disque à deux faces, chacune dessinée comme un verso, le bras qui la lit.
    etiquette/code.ts           L'étiquette du disque du salon, qui porte le code de la partie.
    piste/
      etat.ts                   Ce qu'un écran sait d'une piste : son déroulé, et les rayures de ce joueur.
      instants.ts               Les signaux d'une piste sur l'horloge, et ce qui s'en déduit.
      gestes/
        index.ts                LA chorégraphie : ce que fait chaque grandeur, du « 3 » à la réponse, geste par geste, une pièce à la fois.
        vocabulaire.ts          Les grandeurs qui bougent, les gestes qu'on voit partir, ce qui les porte.
        trame.ts                Ce que chaque pièce a besoin de savoir d'une piste pour écrire ses gestes, et de quoi les dater depuis un signal.
        chutes.ts               Ce qui descend sur un amortisseur et que ce qui le reçoit arrête net : le bras, la pastille.
        retournement.ts         Le disque qu'une main retourne : son angle, sa hauteur pendant ce temps, l'élan qu'il garde en retombant.
      partition.ts              Ce que suit le moteur : elle se déduit des gestes.
      plateau.ts                La vitesse et l'angle du plateau à chaque instant ; ce que l'étiquette montre selon cette vitesse ; la dérive des repères.
      rayures.ts                Les rayures, vues du disque : la main le prend, le ramène, le rend, le lâche.
      chrono.ts decompte.ts     L'angle du bras qui lit l'extrait ; le chiffre que montre la pastille.
      regard.ts                 Le regard d'une piste, et l'étendue qu'il parcourt.
      emplacements.ts           Où sont la pochette kraft, les haltes du disque, la pastille du décompte ; sur quoi tombent leurs ombres.
      pose.ts                   Où est chaque pièce qui bouge à un instant donné.
      pieces.ts                 Ce que chaque objet doit savoir d'une pose, pour se dessiner comme pour se régler.
      dessin.ts                 Assemble la piste dans une pose.
      reglages.ts               Réunit ce que chaque objet règle ; les ombres figées du mode léger.
      suivi.ts                  Tient le moteur et la partition de la piste en cours, pour un écran.
      sobre.ts                  La version sobre : la pose où la version animée finit par s'arrêter.
    rendu/
      svg.ts                    Écrit un arbre de calques en SVG, une trace par teinte et par ton.
      toile.ts                  Peint le même arbre sur une toile : les deux écritures donnent la même image.
      transformation.ts         Les transformations d'un calque, pour le SVG, le CSS et une toile.
      emprise.ts                Le rectangle de l'écran qu'un dessin occupe.
      peinture.ts               Ce que partagent le SVG et la toile : le liseré, l'ordre des tons.
      balisage.ts               Un texte libre rendu inoffensif dans du XML ou du HTML.
      texte.ts                  L'encrier : le tracé des lettres, leur largeur, et un texte venu d'ailleurs rendu écrivable.
      nombre.ts inventaire.ts controle.ts

  ecran/
    horloge.ts                  Le seul endroit qui lit l'heure.
    boucle.ts                   Une fois par image que le navigateur s'apprête à peindre ; elle s'endort au repos, on la réveille.
    navigateur.ts               Ce qu'il faut à un navigateur pour montrer le meuble, et ce qui lui manque ; si l'appareil demande moins d'animations, et quand il change d'avis.
    polices.ts                  Les polices embarquées dans le script d'une page.
    toile.ts                    Peindre une image et la figer.
    plan.ts                     La scène à sa taille, montrée à l'échelle de la largeur de son cadre.
    facture.ts                  Ce qui fait une scène montée telle, et qu'on ne change pas sans la remonter.
    allegements.ts              Ce qu'on retire à une scène quand l'appareil peine ; le mode léger les réunit.
    montage.ts                  Une scène posée dans une page : toiles, blocs, SVG ; régler, regarder, remplir.
    montage/
      chantier.ts               La scène parcourue du fond vers l'avant, chaque dessin mis où il doit vivre ; un bloc regarni tout ou rien.
      figes.ts vivants.ts       Ce qui ne bougera pas, figé sur une toile ; ce qui bouge en polygones, écrit en SVG.
      poignees.ts               Ce par quoi on règle un calque monté ; on n'y écrit que ce qui change.
      grille.ts couche.ts marque.ts   La grille des px de l'appareil ; une couche posée ; ce qui distingue deux scènes d'une même page.
      lacher.ts                 Lâcher ce qu'on retire d'une scène montée : ses éléments quittent la page, leurs toiles rendent ce qu'elles peuvent.
    verso.ts                    Le verso du disque à l'écran : son fond, la réponse ; les seuls calques dont le contenu change.
    piste.ts                    L'écran d'une piste : la scène montée dans un cadre, sa facture tenue, puis l'instant montré, d'image en image.
    touche.ts                   Brancher une touche ou un cran : au toucher, ou au toucher pour la souris seulement.
    vibreur.ts                  Faire vibrer le téléphone, quand il sait.
    vider.ts                    Vider un élément de la page.
    jeu/                        La page du jeu en ligne : son gabarit, son démarrage (l'adresse d'une room, la reprise après un rechargement),
                                son pied, qu'on fait glisser au doigt (`pied.ts`).
    statistiques/               La page des statistiques, pour l'éditeur seul : son gabarit, son tableau.
    telephone/                  Le client du téléphone : sa mémoire (`memoire.ts` : ce que le serveur lui a dit, ce qu'on y fait), l'écran
                                qu'elle donne (`route.ts`), ce qu'on y touche (`touchers.ts`), et la page (`client.ts`) ; l'heure du
                                serveur (`heure.ts`), la ligne qui se rebranche (`websocket.ts`), le haut-parleur (`son.ts`), les vraies
                                pochettes posées par-dessus la scène (`images.ts`), le diagnostic envoyé au journal (`diagnostic.ts`) ; au
                                tournoi, la platine de chaque duel, que chacun tient à son rythme (`duel.ts`).

  reseau/                       Le site en ligne : `index.ts` (l'entrée, la minuterie), `porte.ts` (HTTP), `ligne.ts` (WebSocket), `horloge.ts` ;
                                `musique.ts` (les appels à Deezer, sous sa limite de débit, et ce qu'on en garde) ;
                                `comptes.ts` (les comptes, leurs liens de connexion, leurs sessions, leur fichier), `mots-de-passe.ts` (leur
                                empreinte scrypt) et `courrier.ts` (l'envoi des liens, par le serveur SMTP d'une boîte e-mail) ;
                                `statistiques.ts` (ce qui se passe, compté, jamais qui).
  serveur/
    room.ts                     Une room : son journal, le déroulé de sa piste, sa playlist, ceux qui y sont branchés ; elle décide de tout.
    tournoi.ts                  Le tournoi d'une room : le tableau tiré au premier lancer, le duel et ses extraits relus, les votes, la clôture.
    serveur.ts                  Les rooms par leur code, les connexions des téléphones et leurs jetons, une seule horloge, l'expiration.
    choix.ts sources/essai.ts   Les leurres du 4 choix, pris dans la playlist ; la source d'essai (quarante tubes, sans le son).
    sources/deezer.ts liens.ts  Ce qu'on demande à Deezer et ce qu'on lit de ses réponses ; ce que désigne un lien collé (un lien Spotify
                                y est reconnu, pour être refusé). Sans réseau : c'est `reseau/musique.ts` qui appelle.

  planche/
    scenes.ts eclate.ts legendes.fr.ts image.ts etape1.ts     La planche de rendu.
    exemples.ts                 Les données d'exemple : la platine de l'accueil, une pochette, une piste et sa réponse.
    polices.ts                  Lit les polices dans polices/.
    nombres.fr.ts               Les nombres des documents de travail, écrits à la française.
    horloge.ts                  Une horloge qu'on remet à l'heure et qu'on ralentit.
    script.ts                   L'assemblage d'un script de page : un module et ce qu'il importe, pour les navigateurs d'il y a cinq ans, avec ses polices.
    etape2.ts                   Fabrique la page de l'atelier, et écrit la piste arrêtée à ses instants marquants.
    etape3.ts                   Fabrique la planche du système visuel : sortie/etape3.html, sa version locale, et sortie/systeme/*.svg.
    etape3/                     Ses images (scenes.ts), sa page (page.ts), ses mots (legendes.fr.ts).
    etape4.ts etape4/           La planche « Fais ta pochette », de la même façon ; son écran est celui du jeu (`scene/telephone/pochette.ts`).
    etape5.ts etape5/           La planche des écrans du téléphone ; la partie d'exemple est dans `etape5/scenes.ts`, ses écrans sont ceux du jeu,
                                les pellicules des animations dans `etape5/animations.ts` (tirées de `planche/animations/`).
    etape6.ts etape6/           La planche de l'écran de l'hôte : ses images (`etape6/scenes.ts`), sa page, ses mots.
    animations/                 Les treize animations jouées en direct : une scène, un geste, un régleur, une interruption ; et leur lecture.
    etape7.ts etape7/           La planche d'animations : sa page, ses fiches (réglages, temps, frises), et son script (`etape7/vivante.ts`).
    tournoi.ts tournoi/         La planche du tournoi : deux façons de le choisir, son salon, un duel à ses moments, le tableau, le palmarès.
    prototype.ts prototype/     Le prototype : la partie scénarisée (`scenario.ts`), les cinq potes simulés qui la jouent (`potes.ts`), et sa page
                                (`gabarit.ts`, `demarrage.ts` : le serveur, les potes et le téléphone, branchés par la même connexion qu'un WebSocket).
    feuille.ts                  Ce que les pages des étapes 3 à 6 partagent : la feuille de style, les figures, les deux écritures.
    etape2/
      minutage.ts               Les temps de l'atelier : le déroulé de sa séance, les instants de ses images, ce que sa page laisse lire.
      seance.ts                 Une piste écrite d'avance, action par action, comme un serveur la jouerait ; ses moments.
      options.ts                Ce qu'on peut choisir dans l'atelier, et ce qu'il montre à l'ouverture.
      atelier.ts                La séance, son horloge et la boucle d'images ; il dort quand rien ne bouge, et mesure ce que coûte une image.
      compteur.ts               La moyenne et le pire cas des dernières valeurs.
      temps.ts                  La liste des temps, lue dans les gestes et mise en phrases.
      images.ts                 Une séance arrêtée à des instants : pour les contrôles, les tests et la pellicule.
      banc.ts                   Les scènes du banc d'essai et ses relevés, écrits par `outils/banc.py`.
      lecture.ts                Ce qu'il faut lire des relevés, tiré des relevés eux-mêmes.
      legendes.fr.ts            Les mots de l'atelier, à part des textes du site.
      ancres.ts                 Les noms par lesquels le gabarit et le script désignent les mêmes éléments.
      gabarit.ts                La page elle-même : lisible avant que son script ne démarre.
      gabarit/                  Une section par fichier : la façade, le mode d'emploi, la liste des temps, les mesures ; la feuille de style ; la plume.
      page.ts                   Le script que la page embarque : son point d'entrée.
      page/
        demarrage.ts            Dit que le script a démarré, retrouve les touches, ajuste le cadre, puis ouvre l'atelier ; ou laisse au cadre sa phrase de panne.
        cadre.ts                Le cadre de téléphone tenu ajusté à sa place.
        dire.ts                 Ce que l'atelier dit de la séance, à côté de la scène.
        touches.ts              Les touches de la façade, branchées sur l'atelier ; ce qu'elles ont choisi.
        mesures.ts              Les mesures que la page tient à jour.
        dom.ts                  Retrouver dans la page ce que le gabarit y a écrit, par ses ancres.
```

## Ce que le rendu garantit, et ce qui le vérifie

Ces règles valent pour les 25 images : celles de la planche, et la piste à ses dix instants, dans les deux densités et avec les deux versos.

| Règle du brief | Où elle vit | Ce qui la vérifie |
| --- | --- | --- |
| 5 tons par couleur, proches, calculés depuis la valeur de base ; ni noir pur ni blanc pur | `lowpoly/tons.ts`, `ressources/palette.ts` | `tests/tons.test.ts` |
| Une seule fonction d'ombrage | `lowpoly/ombrage.ts` | `tests/ombrage.test.ts` |
| Une seule projection, 1 × 0,88, sans point de fuite | `ressources/projection.ts`, `lowpoly/projection.ts` | `tests/projection.test.ts`, `tests/sources.test.ts` |
| Un disque a au moins 48 pans, un bouton au moins 16 | `ressources/densites.ts` | `tests/planche.test.ts` |
| Rien de pointu : aucun angle sous 20°, chaque arête adoucie par un chanfrein | `lowpoly/formes/` | `npm run controle`, `tests/formes.test.ts`, `tests/controle.test.ts` |
| Deux facettes voisines ne claquent jamais : deux tons d'écart au plus, contraste sous 1,45 | `scene/rendu/controle.ts` (`LIMITES`), `ressources/palette.ts` | `npm run controle` (l'écart de ton est un défaut ; le contraste, il le mesure et l'affiche), `tests/contrastes.test.ts` (sur chaque teinte de la palette et sur chaque image) |
| Les ombres partent vers le bas à droite, en 2 ou 3 paliers, sans flou | `lowpoly/ombrePortee.ts`, `scene/ombre.ts` | `npm run controle`, `tests/ombres.test.ts`, `tests/ombrage.test.ts` |
| La lampe ne bouge pas : sur ce qui tourne, seuls les repères tournent | `scene/platine/`, `scene/pile.ts` | `tests/planche.test.ts`, `tests/commandes.test.ts` |
| La rotation dans un calque à elle, l'écrasement au-dessus, une seule fois | `scene/pile.ts` | `tests/pile.test.ts`, `tests/planche.test.ts` |
| Chaque pièce mobile est un calque à part, son ombre aussi | `scene/platine/index.ts` | `tests/planche.test.ts`, `tests/lexique.test.ts` |
| Décor sous 2 500 polygones, calque mobile sous 150, lettres comprises | `scene/rendu/controle.ts` | `npm run controle`, `tests/controle.test.ts` |
| Le disque peut sortir du cadre ; l'étiquette et la course du bras, jamais | `ressources/cadrages.ts`, `scene/meuble/regard.ts` | `tests/cadrage.test.ts`, `tests/piste.test.ts` |
| Deux secteurs clairs opposés sur le vinyle, fixes sous la lampe ; les mêmes au verso quand tout le disque est la pochette | `ressources/finis.ts`, `scene/vinyle.ts`, `scene/disque/verso.ts` | `tests/vinyle.test.ts`, `tests/ombrage.test.ts`, `tests/verso.test.ts` |
| Rien que des polygones à plat : ni dégradé, ni flou, ni filtre, ni image, ni police à charger | `scene/rendu/svg.ts` | `tests/planche.test.ts`, `tests/page.test.ts` |
| Peinte sur une toile ou écrite en SVG, une scène est la même image, découpes comprises | `scene/rendu/toile.ts`, `scene/rendu/transformation.ts` | `tests/rendu.test.ts` |
| Aucun texte sous 10 px tel qu'on le voit ; contraste de chaque paire texte et fond | `scene/rendu/controle.ts`, `ressources/typo.ts` | `tests/contrastes.test.ts`, `tests/texte.test.ts`, `tests/page.test.ts` |
| Une échelle typographique ; un texte trop long passe à la ligne, descend d'échelon, puis s'abrège | `ressources/typo.ts`, `scene/texte.ts` | `tests/texte.test.ts`, `tests/pochette.test.ts` |
| Aucune couleur ni phrase écrite ailleurs que dans sa ressource ; tout ce qui s'écrit a ses lettres dans les deux polices | `ressources/` | `tests/sources.test.ts`, `tests/planche.test.ts`, `tests/texte.test.ts`, `tests/page.test.ts` |
| Recharger la page redonne le même meuble | `lowpoly/aleatoire.ts` | `tests/aleatoire.test.ts`, `tests/planche.test.ts`, `tests/atelier.test.ts` |
| L'avatar tient en 25 à 60 polygones ; quatre expressions ; rien de ce qu'on porte sur la tête ne descend sur les sourcils | `ressources/avatar.ts` | `tests/planche.test.ts`, `tests/fais-ta-pochette.test.ts` |
| Les têtes changent d'elles-mêmes, selon ce qui arrive dans la partie ; le journal se rejoue pareil sur tous les écrans | `regles/partie.ts` | `tests/partie.test.ts`, `tests/ecrans.test.ts` |
| Des sons courts et bas, sans fichier ; la vibration ne double que ce qui compte ; rien n'est tiré au sort | `ressources/ecran.ts` (`BRUITS`), `ecran/telephone/son.ts` | `tests/son.test.ts`, `tests/sources.test.ts` |

Ce que les contrôles ne voient pas : deux formes de calques différents qui se touchent, l'allure générale, et le mouvement lui-même.
Pour cela, il faut regarder : `outils/voir.py` pour une image, `outils/pellicule.py` pour un geste image par image,
`outils/atelier.py` pour la page, et l'atelier au ralenti.

## Les calques

Chaque calque dit comment il sera traité à l'écran (`data-role` dans le SVG) :

- `decor` : dessiné une fois, puis figé et mis en cache avec le reste du décor ;
- `image` : une pièce entière figée en image dès qu'elle est prête, puis déplacée d'un bloc (le vinyle, une pochette, le corps d'un bouton) ;
- `mobile` : un calque qui bouge et reste en polygones (étiquette, repères, bras, levier, index des boutons, bascule, pastille, réponse au verso) ;
- `ombre` : l'ombre d'une pièce mobile. Le calque glisse d'un bloc quand la pièce monte ; ses paliers sont des sous-calques, qui s'écartent alors
  les uns des autres.

Un calque sans rôle est un simple groupe. Chaque transformation a son propre groupe dans le SVG (glisser, écraser, tourner, déformer) :
le mouvement sait laquelle régler, par son rang, sans toucher aux autres. Une pièce qui bougera porte dès l'arrêt toutes les siennes,
même sans effet : on n'en ajoute jamais en route. On passe d'un dessin à un autre déjà fait (le texte d'une étiquette et ses arcs,
les deux faces du disque, les chiffres de la pastille, le devant de la pochette kraft) par leur opacité, à 0 ou à 1 : il n'y a pas de fondu,
sauf un, depuis l'étape 3 : l'étiquette entre son texte et ses arcs (voir « Ce qui a été tranché à l'étape 3 »). Ses calques à demi
transparents sont dans l'étiquette, un calque mobile, qui reste en SVG : une toile ne fige jamais rien de transparent.

Pendant une piste, du fond vers l'avant : `noyer`, `platine/decor` (le socle et ce qu'il porte), `bras/ombre` (sur le socle : arrêtée
à son bord, trouée là où le plateau la reçoit), `plateau`, `axe`, `reperes`, les commandes et leurs ombres, `levier/ombre`, `levier`, `kraft/ombre`, `kraft/corps`,
`disque/ombre`, `disque` (dont `disque/tranche`, `disque/recto` avec son vinyle et son étiquette, `disque/verso` avec son fond et sa réponse),
`kraft/devant`, `axe/pointe`, `bras/ombre/plateau` (rognée au bord du plateau), `bras`, puis `pastille-decompte/ombre` et `pastille-decompte`.
Une ombre qui tombe sur une autre surface que celle où son objet est posé porte le nom de cette surface.

## Ajouter quelque chose

- **Une couleur** : une ligne dans `ressources/palette.ts`. Ses 5 tons se calculent seuls.
- **Une matière, un temps** : une ligne dans `ressources/mouvement.ts`. La liste des temps de l'atelier la lit d'elle-même.
- **Un geste dans une chorégraphie** : une ligne dans le rôle de sa grandeur, chez la pièce qui l'écrit, dans `scene/piste/gestes/index.ts`,
  comptée depuis un signal ; son nom dans `gestes/vocabulaire.ts` et sa phrase dans `planche/etape2/legendes.fr.ts` s'il doit se lire
  dans la liste des temps. Les tests de `tests/piste.test.ts` diront s'il saute, s'il part en même temps qu'un autre, et s'il tient
  à 60 comme à 120 images par seconde.
- **Une grandeur qui bouge** : son nom dans `GRANDEURS` (`gestes/vocabulaire.ts`). Le compilateur réclame alors sa consigne d'avant la piste
  et la pièce qui écrit ses gestes ; il reste à la lire dans la pose (`scene/piste/suivi.ts`) et à dire où elle s'arrête en version sobre
  (`scene/piste/sobre.ts`).
- **Un objet qui bouge** : un module dans `scene/` qui sait se dessiner dans une pose et dire ce qui se règle chez lui ; ses mesures dans `ressources/`.
  Le meuble ne sait rien de ses objets, sinon leur ordre ; le montage ne sait rien d'eux, sinon leurs rôles.
- **Une forme de tête, un dessus de tête** : une entrée dans `ressources/avatar.ts` (un dessus est fait de morceaux : calotte, bord, boule, casque), son nom dans les textes.
- **Un son** : une entrée dans `BRUITS` (`ressources/ecran.ts`), son nom dans les légendes de l'étape 5.
- **Un motif de pochette** : une entrée dans `scene/pochette/motifs.ts`, son nom dans `ressources/pochettes.ts`.
- **Un cran sur un bouton, une commande de plus** : une ligne dans `ressources/platine.ts` ; son inscription dans les textes.
- **Une langue** : un fichier `ressources/textes.<langue>.ts` de la même forme que `textes.fr.ts`, avec ses règles de typographie.
- **Une touche dans l'atelier** : son ancre dans `planche/etape2/ancres.ts`, son nom et son mode d'emploi dans les légendes, sa place dans
  `gabarit/facade.ts`, son branchement dans `page/touches.ts`. `tests/page.test.ts` dira si le gabarit et le script se manquent.
- **Un temps de la séance de l'atelier** : une ligne dans `planche/etape2/minutage.ts`.
- **Une image de plus dans `sortie/piste/`** : son instant dans `minutage.ts`, son nom et le signal dont on le compte dans `images.ts`,
  sa légende dans `legendes.fr.ts`.

## Ce qui a été tranché à l'étape 2

- **Le disque se retourne tout seul à la révélation, et son verso est la réponse.** Deux versions sont à comparer dans l'atelier :
  A, l'étiquette est la pochette (le titre en arc sur le vinyle, l'artiste dessous) ; B, tout le disque est la pochette (le titre et l'artiste
  sur l'étiquette miel). Dans le brief, la vraie pochette glissait de sous la pochette kraft : le verso la remplace.
- **Le regard ne quitte la platine qu'une fois le disque arrêté et le bras reposé** : on voit donc le bras retourner à son repos, et le disque
  s'arrêter à l'endroit. Il glisse alors de 142 px et s'arrête sur le disque, qui lui répond en se retournant. À cet arrêt, il reste un liseré
  de noyer à gauche du socle, et le cadre coupe franchement le bord du disque à droite (12 px de vinyle), entre deux commandes.
  Pour cela le bouton de mode est 8 px plus à gauche qu'à l'étape 1 ; le bras et les charnières ont gardé leurs places.
- **Le levier dit ce que fait le bras** : baissé quand le bras est posé, levé quand il le tient en l'air. Sur la planche de l'étape 1,
  il était dessiné levé, bras posé : il est baissé désormais.
- **La pochette kraft sort du cadre par la droite** : le disque en sort vers l'intérieur du cadre, et son étiquette n'en sort jamais.
  Ce qu'on voit de la pochette porte son tampon, son encoche et sa pastille « Piste 3 sur 15 ». Le disque qui sort l'entraîne de 2 px
  avec lui, vers son côté ouvert : c'est sa réaction. Elle l'est dans tous les modes, léger et sobre compris : c'est la seule réaction
  qui laisse sa pièce ailleurs, et la retirer la ferait sauter de 2 px chaque fois qu'on change de mode en route.
- **Au « 1 », le bras pivote en 210 ms, et sa descente en prend 620** (repris à l'étape 3 : il pivotait en 160 ms, c'était trop vif).
  Le brief veut qu'il pivote jusqu'au bord, le dépasse à peine, revienne, puis descende, et que le diamant touche à zéro, le tout
  dans la seconde du « 1 ». Pour garder cet ordre, la descente a perdu 80 ms sur les 700 du brief. Le bras est au bord 280 ms après
  le « 1 » ; le levier se baisse à 330 ms ; son dépassement (1,5 %, un tiers de degré) culmine à 363 ms ; la descente part à 380 ms, sans à-coup,
  et il est revenu sur le bord avant d'avoir descendu d'un px. `tests/piste.test.ts` tient cet ordre. Quand l'extrait tarde (« Attente »),
  il attend levé, revenu sur le bord.
- **Une main qu'on ne voit pas porte le disque**, de sa pochette au plateau, puis le retourne : il part sans à-coup. Les 800 px de son chemin
  tiennent dans la seconde du « 3 » : il passe par une pointe d'environ 2 300 px par seconde en sortant, 2 500 en vol. C'est vif ;
  c'est ce que la seconde permet.
- **Retourné, le disque retombe à plat avec de l'élan** : le plateau l'arrête net, la feutrine se tasse d'un px. Pendant qu'il tourne,
  sa face change de ton par marches, comme tout ce qui penche sous la lampe.
- **Une pièce n'a qu'une ombre par surface.** Le bras en a deux : une sur le socle, trouée là où le plateau la reçoit, et arrêtée au bord
  du socle (le contrepoids, quand le bras avance vers l'étiquette, passe au-dessus de ce bord : son ombre ne déborde pas sur le bois,
  plus bas, et déjà dans l'ombre du socle) ; une sur le plateau et son disque, rognée au bord du plateau. À l'étape 1, elle tombait partout
  comme sur le socle ; au-dessus du disque, sa tête paraissait flotter. L'ombre du disque, elle, reste d'une seule pièce quand il passe
  du bois au socle.
- **« Sobre » garde les deux emplois du brief**, et ne va jamais sans le nom qu'il qualifie : la densité sobre (le dessin le plus économe,
  celui du mode léger) et la version sobre (celle de qui a demandé moins d'animations). La touche « Sobre » de l'atelier est la version sobre.
- **La pochette kraft prend une teinte de plus dans la palette**, `kraft`, avec ses 5 tons.
- **Si l'extrait tarde, la pastille reste sur « 1 »** : elle ne passe pas à zéro tant que le bras attend.
- **En version sobre, une mauvaise réponse se voit quand même** : les arcs de l'étiquette sautent de 20° en arrière, d'un coup, puis reviennent.
- **La version sobre et la version animée sont deux lectures du même instant.** En version sobre, la réponse se montre dès la révélation ;
  en version animée, une fois le disque arrêté et retourné, 2,8 s plus tard. Rendre les animations entre les deux efface donc la réponse,
  le temps que le disque la montre à sa façon : c'est la pose de l'instant, pas un retour en arrière.
- **Le mode léger ne s'enclenche qu'à la main.** Il n'y a pas de détection d'un appareil qui peine.
- **Un titre ou un artiste dont les polices n'ont pas un signe s'écrit quand même** : le signe est remplacé par sa lettre sans accent
  si elles l'ont ; une espace qu'elles n'ont pas devient une espace ordinaire, ou l'insécable si elle ne se coupait pas ; un signe
  qui ne se voit pas disparaît ; tout autre devient « ? ». Une réponse qu'on ne sait pas dessiner est refusée une fois, sans arrêter
  la scène. Mis en lignes, un titre ne se coupe jamais à une espace insécable.
- **L'atelier montre la scène entière à côté de ses touches**, donc plus petite qu'en jeu sur un téléphone : c'est un document de travail.
  Rien n'y joue tout seul. « Attente » est un moment qu'on rejoue, pas une option.
- **Les touches de l'atelier** sont déjà des touches de platine (2 px de course, 60 et 80 ms, arrêt net) ; leur dessin définitif vient à l'étape 3.
  Un cran choisi, un poussoir enclenché s'allument comme un voyant : face sombre, inscription miel. À la souris elles agissent
  quand on appuie ; au doigt, quand il se relève, parce que cette page défile. Sous le doigt, c'est le navigateur qui les enfonce
  (`:active`) : le script ne s'en mêle pas, pour qu'elles ne s'enfoncent pas deux fois.

## Ce qui a été tranché à l'étape 3

- **Le texte de l'étiquette se fond en arcs** (au « 2 »), et revient (à la révélation), au lieu de basculer d'un coup : c'est le seul fondu
  du site. Il ne dépend que de la vitesse du plateau (`scene/etiquette/fondu.ts`, `AMPLEURS.etiquette`) : dès 20°/s les lettres laissent
  une traînée, deux copies d'elles-mêmes tournées en arrière de ce que le disque parcourt en 30 ms ; de 60 à 100°/s elles s'effacent sous
  les arcs courts, que les arcs longs allongent jusqu'à être seuls à 150°/s. Pour que l'étiquette ait fini de se recaler, cachée, avant
  que le fondu ne la montre, elle s'y tient désormais en 220 ms (`MATIERES.etiquetteSeRecale`). La version sobre n'a pas de fondu.
- **L'ampli est de la famille de la platine** : laque vert bouteille, commandes d'aluminium, gravures crème. Son gros bouton et son
  interrupteur sont ceux de la platine (`dessinerUnBouton`, `dessinerUnInterrupteur` prennent une place), ses vis aussi. Les aiguilles
  ne montrent que ce qui passe sur le cadran ; leur zone rouge commence à 0 VU.
- **Le bac est une caisse vue d'en haut et de face** : ce qui s'y tient debout (`lowpoly/formes/plaque.ts`) montre sa face au joueur,
  qui n'est pas écrasée ; les titres des onglets y sont donc écrits droit, sur une étiquette de papier crème. Une douzaine de playlists,
  derrière huit intercalaires ; « Hits du moment » prend la laque, faute d'une huitième couleur de pochette.
- **Une touche est un capuchon dans le puits d'un petit socle de laque** : la principale est miel, son libellé en titrage ; la secondaire
  est crème, son libellé gravé ; allumée, elle reste enfoncée, face sombre, inscription miel. Ses deux ombres sont dessinées d'avance.
  Sur la planche, elles se pressent (CSS, réglé sur `TOUCHES`).
- **Le signe moins** s'écrit avec un tiret demi-cadratin (« –1 », « –20 ») : Caprasimo n'a pas le vrai signe moins.
- **Quatre teintes n'ont que 3 de contraste avec leur meilleure encre** (orange brûlé, rouge tomate, olive, lilas fumé) : on n'y écrit
  qu'en grand, ou sur une étiquette de papier. La planche le dit, teinte par teinte.

## Ce qui a été tranché à l'étape 4

- **Les personnages sont remplacés par un avatar très simple**, en attendant de vrais personnages : une tête en galet (un contour de onze
  sommets, un sommet d'où partent onze facettes), un visage, des épaules ; deux choix (la tête, et ce qu'on porte dessus) et trois couleurs.
  Ce qu'on porte sur la tête est fait de morceaux posés d'après la forme de la tête : rien n'est ajusté à la main, rien ne descend sur les sourcils.
  Les anciennes pièces sont dans l'archive de l'étape 4 d'avant, si on veut y revenir.
- **Le hasard ne tire jamais une peau presque noire** (vinyle, expresso, laque) : les traits ne s'y lisent plus et il ne reste que des yeux
  et une bouche rouge, une caricature. Le joueur peut tout choisir ; les peaux brunes de la palette sont tirées comme les autres.
- **Sur les quatre teintes à 3 de contraste**, quand le nom n'y tient qu'en petit, il s'écrit sur une étiquette de papier crème, comme au bac.
- **Les motifs restent sages pour le contrôle** : des rayures droites, des anneaux seulement entiers dans le carton ; rien ne fait d'éclat au bord.
- **L'écran tient au téléphone sans défiler** : la pochette en grand, l'étiquette vierge du nom, « Un autre album », deux crans
  (« Tête », « Sur la tête »), leurs options en vignettes, « Au hasard », « C'est moi ».

## Ce qui a été tranché à l'étape 5

- **Les animations en pellicules** : chaque geste est écrit une fois (`scene/gestes/`), suivi par le moteur, testé sur les chiffres du brief
  (`tests/gestes.test.ts`), et montré arrêté à quelques instants. Les rejouer en direct, au ralenti, en sobre, c'est la planche de l'étape 7.
- **Ce qu'on lance glisse sur un frottement sec** : parti vite, il ralentit à rythme constant et s'arrête net ; une pochette lancée de 200 px
  s'arrête en 600 ms, de plus loin un peu plus. Ce qui suit la glissade (l'angle, la voisine poussée) va à son rythme.
- **Les disques de la finale se posent à cheval sur le coin de la pochette** (et non plus dessous) : un disque qui descend ne peut pas finir dedans.
  Les angles de l'éventail restent entre 3 et 9 degrés.
- **Les intercalaires du bac ne basculent pas encore** : vue d'ici, une plaque debout qu'on penche grandit au lieu de se coucher. Seule la playlist sort.

- **Le brief retrouvé, l'étape 5 a été remise d'accord avec lui** : modes en registre (`regles/modes/`), jugement « Presque. », barème
  du brief (libre : 1 l'artiste, 1 le titre, 1 au premier qui a les deux ; 4 choix : 1, et 1 au plus rapide), room de 2 à 12, aiguilles
  à 80 ms / 300 ms, rouges dans les 5 dernières secondes. L'écran de l'hôte passe à l'étape 6. Les sons fabriqués sont retirés : vibrations seules.
- **Ce qu'on pose sur le bois suit le regard** du téléphone pendant la piste : l'éventail, l'étiquette vierge et la vraie pochette restent à l'écran.
- **L'éventail** est le mini hit-parade : les pochettes en 48 px dans l'ordre du classement ; une pastille A ou T sans dire la réponse.
- **On ne change pas de page** : au téléphone, le regard reste sur la platine ; les touches, le papier du code et les pochettes des joueurs
  se posent sur le bois dessous. À la réponse, le regard glisse vers le disque comme à l'étape 2, et tout reste entier dans le cadre.
- **Le code de la partie est écrit sur l'étiquette du disque du salon** (le lexique le voulait), en quatre lettres sans I, L, O ni Q.
- **Les points** : une bonne réponse en vaut un, le premier à trouver en gagne un de plus. **Se faire doubler**, c'est voir passer devant soi
  quelqu'un qui était derrière ; être rejoint ne compte pas. À la révélation, qui n'a rien répondu de la piste s'endort, avant d'être dépité.
- **Le hit-parade** : à la révélation, une pastille se colle en bas à droite de la pochette de qui entre au classement (« Entrée »),
  y monte (« +1 ») ou y descend (« –1 ») ; au podium, chacun a ses points.
- **En mode 4 choix**, les réponses sont quatre étiquettes à toucher, en colonne dans la zone du pouce ; à la révélation, seule la bonne reste.
  Les trois leurres de l'exemple sont de vrais titres des années 80.
- **Deux modes au sélecteur, choisis par l'hôte dans les réglages** : Libre (1 point l'artiste, 1 le titre, 1 le feat quand la piste
  en a un, 1 de plus au premier qui a tout) ou 4 choix. Le feat n'est pas annoncé ; il se tape seul ou avec le reste, « feat », « ft », « x »
  ou « avec » entre les deux, dans l'ordre qu'on veut (`Reponse.feat`, `regles/modes/libre.ts`).
- **Les papiers où l'on tape et les crans sont taillés à leur texte** : un champ s'allonge vers la droite à mesure qu'on tape ; les 4 choix
  gardent une colonne d'étiquettes pareilles ; les crans du bac se rangent côte à côte sans se chevaucher (`ajustee`, `largeurDeLaTouche`).
- **La finale** : diamant, platine, or ; à égalité en tête, même taille de pochette et un diamant chacun. Les titres joués, sur un papier.

## Ce qui a été tranché à l'étape 6

- **1440 × 900, et non 1440 × 810** : en 16:9, la kraft, posée devant la platine, sortait du cadre par le bas. Le meuble est centré, du bac à l'ampli.
- **La tablée devant le bac** : deux rangs de six pochettes en 96 px, dans l'ordre du classement, qui ne mordent ni sur la platine ni sur la kraft ;
  c'est aussi le hit-parade. Pastilles plus grandes qu'au téléphone ; le lien de la room en grand, sous l'ampli ; les 4 choix en rang devant la tablée.
- **Le regard de l'hôte ne glisse jamais** : la séance de l'atelier s'y arrête comme au téléphone, mais tout le meuble reste en vue.

## Ce qui a été tranché à l'étape 7

- **Une animation, une définition** (`planche/animations/`) : une scène dessinée une fois, un geste, un régleur. La planche vivante la joue
  avec le moteur du site ; les pellicules de l'étape 5 l'arrêtent à ses instants. Les régleurs rendent ce que le dessin rendrait (testé en SVG).
- **Interrompre, c'est donner au moteur un autre geste**, avec les mêmes grandeurs : chacune repart d'où elle est, avec sa vitesse.
- **La bascule d'un interrupteur a trois poses** (couchée, debout, couchée), chacune son calque mobile ; on montre la plus proche de la course.
- **Une pastille qui tombe ne se montre qu'une fois partie** : au hit-parade, elles claquent chacune à son tour, et non toutes à 500 ms.
- **Le texte d'une étiquette reste droit** quand elle tourne : sa poignée la glisse sans la tourner.
- **« Piste N sur M » suit la partie** (`numeroDeLaPiste`) : les écrans 4 choix, dont la partie n'a qu'une piste, disent désormais « Piste 1 ».
- **Le contrat d'un mode gagne trois membres facultatifs** (`extrait`, `departager`, `equipes`) : « Année », « Intro express » et « Équipes »
  s'écrivent alors sans toucher au socle (`tests/modes-d-exemple.ts`). Le serveur publie le départage avec la révélation.
- **Les écrans du téléphone se rangent sur une colonne à gauche** (`TABLEE.telephone.colonne`) : l'éventail, les papiers, les étiquettes et
  les touches (posées par leur bord gauche) ; l'éventail penche d'une même main ; la finale reste un podium centré. La platine et la kraft,
  qui sont celles de l'atelier, ne bougent pas.
- **Le serveur existe** (`serveur/`), sans réseau : les rooms, leur horloge, les connexions ; la partie scénarisée du prototype et ses cinq
  potes simulés (`planche/prototype/`) le jouent de bout en bout. L'état complet donne aussi le déroulé de la piste, pour reprendre
  l'extrait au bon endroit ; un joueur qui revient redonne son identifiant.
- **Les écrans du téléphone sont ceux du jeu** (`scene/telephone/`) : le client et les planches dessinent avec le même code ; les images
  des étapes 4 à 6 sont restées les mêmes, octet pour octet.
- **Le téléphone ne sait que ce que le serveur lui dit** (`ecran/telephone/`) : sa mémoire rejoue le journal publié, ses touchers n'envoient
  que des actions. `Connexion` est dans le contrat des messages : le serveur simulé la donne comme un WebSocket la donnera.
- **La face** : « Rejouer la face B » rouvre la room sur la B (`face`, dans l'ouverture) ; le salon dit alors « Lancer la face B ».
  L'hôte a « Piste suivante » au hit-parade ; « Rejouer la face B » n'est que chez lui, comme le serveur ne l'accepte que de lui.
- **Le clavier du prototype tape tout seul** : toucher l'étiquette vierge tape, lettre après lettre, la réponse prévue par le scénario,
  puis l'envoie. En 4 choix, on touche l'étiquette qu'on veut.

## Ce qui a été tranché pour le jeu en ligne

- **Une couche de plus, le réseau** (`src/reseau/`), seule à toucher aux sockets côté serveur ; le serveur du jeu reste pur.
  `npm run construire` en fait un seul fichier pour Node ; Caddy, devant, tient le HTTPS (`HEBERGEMENT.md`, `deploiement/`).
- **L'heure se demande** (`quelleHeure`, `heure`) : le téléphone garde l'écart de la réponse la plus rapide (`ecran/telephone/heure.ts`).
- **Un jeton secret par joueur** : l'identifiant, que tous voient, ne rouvre plus une place.
- **Rien n'est cru sur parole** (`lireUneAction`, `estUnePochette`) ; la ligne coupe qui insiste, la page ne lance que son script.
- **Une room s'en va** trente minutes après le départ du dernier, ou au bout de six heures.
- **Le son vient de Deezer** (son API publique, sans clé) : le serveur cherche les playlists, lit leurs pistes et leurs extraits de 30 s,
  sous la limite de débit de Deezer, et relit les pistes avant que leurs liens n'expirent. Les leurres du 4 choix se tirent dans la playlist.
- **Spotify ne se lit plus** (16/10/2026) : le serveur lisait la page publique d'une playlist Spotify et retrouvait ses titres chez
  Deezer, mais les conditions de Spotify interdisent qu'un programme lise ses pages, et ses règles pour les développeurs, qu'on en
  fasse un jeu. Un lien Spotify collé est refusé d'office, sans requête : le bac propose un lien Deezer, ou une liste sur mesure.
- **Chaque téléphone joue l'extrait lui-même**, à l'heure du serveur (`ecran/telephone/son.ts`) : il le précharge pendant le décompte,
  ne se dit prêt qu'une fois chargé, le démarre à l'heure dite, le recale s'il dérive de plus de 0,15 s, et le laisse se taire quand la
  réponse s'en va. Le premier toucher débloque le son (un instant de silence) ; rechargé, le téléphone garde son ampli allumé et le son
  repart au premier toucher. Quand l'hôte joue le son pour tous, seul son téléphone le joue.
- **Les comptes sont facultatifs, et sans mot de passe** : on tape son adresse, un lien part (une fois, un quart d'heure) ; touché, il
  ouvre la page, qui attend « Entrer » (un robot qui vérifie les liens d'un e-mail ne le consomme pas). Le téléphone garde le secret de
  sa session ; le serveur n'en garde que l'empreinte, dans un fichier (`/var/lib/honear/comptes.json`), avec l'adresse, la
  pochette et les scores, rien d'autre. Les e-mails partent par le serveur d'envoi d'une boîte qu'on a déjà (celle du domaine chez OVH).
  Une face finie compte une partie à chacun, une victoire au premier. On sort, ou l'on efface tout, depuis l'écran du compte.
- **Sa pochette, quand on veut** : on tape son nom d'artiste sur l'étiquette (24 signes au plus, ce que la grande pochette imprime
  encore lisiblement ; « Au hasard » le garde) ; « Ma pochette » la rouvre à l'accueil, au salon, au hit-parade et à la finale (l'hôte,
  qui y a ses touches, touche sa pochette sur la tablée, comme tout le monde peut le faire). Refaite, tous la voient changer
  (`changerDePochette`, l'événement `nouvellePochette`, quarante fois au plus par face), et le compte la garde.
- **Les vraies pochettes** : Deezer donne l'image de chaque album ; le téléphone la pose sur le carton dessiné à la révélation, et sur
  le dos des titres joués, qu'on revoit en touchant leur papier à la finale (`scene/telephone/titres.ts`). C'est une image de la page
  par-dessus la scène, pas un dessin : elle ne se montre qu'une fois chargée, et sans elle la vignette reste. À la finale, au-delà de
  trois titres, le papier dit combien il y en a (il débordait de l'écran dès dix).
- **Dans la page du jeu, un signe que les polices n'ont pas ne l'arrête plus** (`encrier(…, indulgent)`) : un titre venu de Deezer s'écrit
  sans lui ; un symbole s'efface. Les planches et les tests, eux, s'arrêtent toujours à la première faute du fichier de textes.
- **Aux réglages, les commandes de la platine tournent** ; le vrai clavier tape dans un champ posé sur l'étiquette, qui reste le même
  d'une lettre à l'autre. Le lien d'une room écrit l'adresse de la page (`{site}`).
- **Une touche s'enfonce** de sa course en 60 ms et l'écran d'après attend qu'on l'y ait vue ; elle est repeinte, d'un bloc, parce
  que son puits la découpe. Le téléphone vibre un rien, là où il sait.

## Ce qui a été tranché en octobre 2026

- **Le vrai clavier du téléphone** : pendant qu'on tape sa réponse, le client lit ce que le navigateur montre (`visualViewport`),
  remet le haut du téléphone en haut de l'écran si la page a glissé, et pose l'étiquette juste au-dessus du vrai clavier, quelle que
  soit sa hauteur (`dessusDuClavier`, `TABLEE.telephone.clavier.auPlusHaut`). Sur un ordinateur, rien ne bouge.
- **La vraie pochette est au milieu du disque** retourné, ronde, percée de l'axe (`pochetteSurLeVerso`) ; plus rien ne sort de sous la kraft.
- **La fenêtre, quelle qu'elle soit** : le jeu la remplit toujours, sans changer d'échelle (`regardPourLaFenetre`). Une fenêtre de
  téléphone montre l'écran du téléphone ; plus elle s'élargit, plus le regard s'ouvre sur le meuble, jusqu'au meuble entier sur un
  ordinateur, où ce qu'on touche se range sous le vinyle (`rangerSousLeDisque`). Le meuble que le regard voit est posé au repos.
- **D'un écran à l'autre, un fondu** (`TELEPHONE.fondu`) ; la piste apparaît sur le noir. Rien en version sobre.
- **Les pochettes sont les joueurs, les disques la musique** : dans le bac (peint en crème), des disques derrière les intercalaires ;
  un genre touché étale ses playlists Deezer en disques, avec leur nom, et « Au hasard » (`scene/telephone/choisie.ts`) ; la
  choisie se soulève. La recherche montre aussi des disques. Chaque pochette de joueur a son disque qui dépasse, et ses quatre coins
  usés pareil.
- **« Fais ta pochette » se réduit** à la pochette en grand, son nom, « Au hasard » et « C'est moi ». L'accueil : « BLIND TEST » en
  grand, deux grandes touches, et deux petits onglets dessous, « Ma pochette » et « Mon compte ». Les touches et les papiers des
  écrans sans kraft se centrent.
- **Le son** : l'ampli s'allume tout seul dans une room, le son part au premier toucher. Le volume part de 30 % ; le bouton de
  l'ampli le règle (sa moitié gauche baisse, la droite monte), sur l'ampli même sur un grand écran, en petit sur le coin de la
  platine au téléphone (`scene/telephone/volume.ts`). Là où l'élément audio ne se règle pas (l'iPhone), le son passe par le moteur
  audio du navigateur : les extraits de Deezer le permettent.
- **Le bac** : un thème peut épingler ses playlists avant la recherche (`PLAYLISTS_EPINGLEES`) ; les génériques proposent
  « Anime Essentials », les vrais génériques d'animés. Une piste hors de l'alphabet latin n'est pas jouable.
- **Les modes** : « First one » (`premier.ts`, le premier qui trouve l'artiste et le titre gagne 3 points, la piste s'arrête :
  `finitAuPremier`) et « 1re note » (`premiere-note.ts`, une seconde de son : `son`, `DEROULE.premiereNote`). Le sélecteur a sept
  crans numérotés ; le nom du mode choisi s'écrit dessous.
- **Les playlists** : jouées dans un ordre tiré au hasard à l'ouverture de la room (`serveur/ordre.ts`). « Mes playlists » (une pochette personnalisée en kraft, au premier rang du bac, et le cran
  « La mienne ») garde sur l'appareil les trois dernières importées. L'intercalaire du genre choisi sort du bac ; le fond de la
  caisse est vert. Intercalaires et disques dépassent moins de la caisse (78 et 72 px) ; au téléphone, le regard sur le bac
  ne bouge pas (`auDessus`).
- **La saisie du code** a sa touche « Retour », sous « On rejoint », qui ramène à l'accueil (`laisserLeCode`).
- **Le classement** (`scene/classement.ts`) : une feuille crème, une ligne par joueur (rang, pochette en petit, nom, pastilles de ce
  que la piste lui vaut, points). Au téléphone, pendant la piste, sous la platine (les six premiers, ou les cinq premiers et soi) ;
  le clavier ouvert garde l'éventail. Le hit-parade est ce classement, sur toute la largeur. Sur un grand écran, en colonne sous le
  bac, en piste et au salon (`classementSousLeBac`). L'étiquette de réponse et les 4 choix sont descendus d'autant.
- **Le nom d'artiste est obligatoire** : le hasard n'en donne plus (et un nom tiré au sort gardé d'avant s'efface) ; « C'est moi »
  sans nom le réclame (`sansNom`).
- **L'hôte change de playlist en pleine partie** : « Autre playlist », à côté de « Quitter », ouvre le bac (même en pleine piste) ;
  « Celle-là » envoie `changerDePlaylist`, et la room repart sur la face A de la nouvelle, avec les mêmes, points à zéro (trop
  courte : refusée, retour au bac). Dans le bac, la même touche dit « Retour ». Le bac répond à l'hôte dans la room.
- **L'iPhone, le son et la page qui bouge** : les zones touchées restent dans la page (inertes) jusqu'au doigt suivant, et le geste
  qui débloque le son s'écoute sur toute la page : l'écran changeait sous le doigt, le doigt levé n'arrivait nulle part, et Safari
  n'avait jamais de geste pour laisser partir le son. Hors d'un champ, la page qui a défilé (Safari la laisse glissée après le
  clavier) est remise en place ; plus de rebond. `?diagnostic` envoie au journal du serveur ce que font le son et la fenêtre
  (voir HEBERGEMENT.md). Le son saccadait sur iPhone : l'extrait n'est plus remis à sa place qu'au-delà de 0,6 s d'écart, et
  au plus une fois toutes les 5 s (`TELEPHONE.son`).
- **Les commandes de la platine** : deux boutons, Titres et Secondes ; le bouton du mode et l'interrupteur du son s'en vont. À leur
  place, en bas à droite, la manette du mode : elle se couche vers l'un des quatre modes gravés autour d'elle (First one en haut,
  4 choix à gauche, Libre à droite, 1re note en bas ; `PLATINE.commandes.interrupteur.manette.directions`). On touche un nom pour
  le prendre, ou la manette pour passer au suivant. Le son est joué par tous les téléphones.
- **Bord à bord au téléphone** : le cadre prend tout l'écran (`100lvh`), sous l'encoche, la Dynamic Island et la barre de Safari ;
  ce que les bords cachent (marges de sûreté, barre de Safari) est mesuré (`bords`) : le jeu y dessine (la platine en haut, la table
  en bas) sans rien y poser à toucher, et les petites touches du coin descendent sous l'encoche. Le haut du regard reste le bord de
  la platine (plus de bande de bois que Safari reprenait pour teinter sa barre). Posé sur l'écran d'accueil, la barre d'état est
  transparente (`black-translucent`). Puis la table continue au-dessus de la platine, entière (`TELEPHONE.boisAuDessus` à 0), et sous l'encoche sur l'écran
  d'accueil (le regard monte d'autant, `dansLaFenetre`). Dans Safari, la barre d'état n'est pas à la page : Safari la peint du fond de la
  page, le noyer de la table. Le cadre du jeu est dans la page (le client le pose en `relative`), haut de `100lvh` ; à l'accueil et
  au compte d'un téléphone, un pied le suit (« Comment on joue ? », Confidentialité, Mentions légales), qu'on atteint en faisant
  glisser la page au doigt : c'est elle qui suit le doigt (`ecran/jeu/pied.ts`), la page ne défile jamais. Sur un grand écran, les
  liens flottent en bas à droite. `?diagnostic` note la hauteur de la page, ses classes et ses défilements.
- **« Retour » à chaque étape** : avant la room, au bout de l'écran comme à la saisie du code, sur la pochette (vers l'accueil, ou
  vers le code tapé), les réglages (vers le bac tel qu'on l'a laissé) et, petit, à gauche de « Celle-là », le bac (vers la
  pochette ; dans la room, il le referme) : `etapeDAvant`, `touche-revenir`. Au coin, seulement dans une room : « Quitter », et
  chez l'hôte « Autre playlist » ; leurs zones passent par-dessus celles de l'écran. Un intercalaire se touche à son onglet (`intercalaire-…/onglet`), pas à son carton, que
  ceux de devant cachent : le doigt n'allait pas toujours au bon thème.
- **Ce qu'on tape** : revenir dans l'étiquette de la réponse la vide quand elle montre la réponse qu'on vient d'envoyer (un brouillon
  reste) ; « Entrée » l'enfonce un instant, à plat et droite, en kraft (`TELEPHONE.reponseEnfoncee`). Ce qu'on tape va au champ
  que l'écran a posé (`saisir(m, texte, champ)`) : une piste passe avant la pochette qu'on refaisait, et le bac de l'hôte cherche
  dans la room. Le curseur du champ reste au bout de ce qu'on a tapé, comme celui qu'on voit (un clic le
  posait n'importe où, et Ctrl + Retour arrière effaçait depuis le début). Sur un ordinateur, une lettre tapée va dans le champ posé,
  même si l'on a cliqué à côté. Autour de la piste, deux couches : la tablée (classement, décor de saison) ne se redessine plus à
  chaque lettre, et tout ce qu'on pose glisse sous le vinyle d'un seul bloc (`glissementSousLeDisque`, ce qu'on touche pris à sa
  plus grande place) ; `partieA` et `partieAvant` gardent leur dernier état, tant que le journal a les mêmes événements : la fin de
  partie ne rame plus.
- **Le plein écran au premier toucher** (Android) ne part plus que d'une touche, jamais d'une étiquette où l'on tape : la page qui
  changeait de taille fermait le clavier, et le champ ne tapait plus.
- **L'ampli et la saisie** : les cadrans comptent les titres de la face et les secondes de l'extrait ; le volume va de 0 à 10. Le
  curseur de ce qu'on tape clignote, et attend au début d'une étiquette vide. Les touches sont un peu plus grandes.
- **Les saisons** : un thème de quelques jours, tant que `SAISON` le dit (`src/ressources/saison.ts`). Halloween, en grosses pièces
  low-poly éclairées par la lampe (`src/scene/saison/`, et trois formes : `ellipsoide.ts`, arrondi pour la citrouille, `tige.ts`,
  `os.ts`) : une grande toile dans un coin du haut et son araignée ; une citrouille ronde et taillée. Sur ordinateur, la plus grosse
  qui tient, là où rien n'est écrit, plus une main de squelette agrippée en haut à gauche et une chauve-souris qui vole au-dessus de
  la platine. Au téléphone, seulement la toile, et la citrouille dans un coin du bas, sous les touches, là où son visage se voit le
  mieux. Rien ne se pose sur un texte ni sur une touche (`placement.ts`) ; la flamme vacille, la chauve-souris bat des ailes,
  l'araignée monte et descend. Pour l'enlever : `SAISON = undefined`.
- **Les versions** : la page porte sa version (l'empreinte de son contenu, `META_DE_LA_VERSION`) et la donne en se branchant ;
  une page restée ouverte quand le site a changé est priée de se recharger (code 4001), une fois par version. La largeur du
  cadre se mesure exacte, pas arrondie, pour que les toiles tombent sur les px de l'écran.
- **La platine** : ses commandes s'appellent Titres (combien de chansons) et Secondes (la durée de l'extrait).
- **La table** : d'une seule teinte (`noyer`), sans nappe de lumière ; seules les veines la nuancent.
- **Les couleurs** : un crème plus chaud ; la caisse du bac en vert sapin, comme la platine et l'ampli, sa fente sur le premier rang ;
  l'intercalaire « Hits du moment » en miel.
- **Plein écran** : le cadre prend toute la fenêtre, bord à bord ; au téléphone, l'écran commence au bord de la platine
  (`TELEPHONE.boisAuDessus`), et un téléphone plus long voit plus de table en bas. Le premier toucher passe en plein écran là où
  le navigateur le permet (Android) ; posé sur l'écran d'accueil (manifeste et icône, `src/ecran/jeu/application.ts`), il s'ouvre
  en plein écran, iPhone compris. Les liens du bas tiennent dans un petit flotteur, en bas à droite.
- **Le son** : l'extrait passe par l'élément audio seul (le plus sûr sur iPhone, même en silencieux) ; le volume suit une courbe
  cubique (`TELEPHONE.volume.courbe`), à 30 % au départ. On tourne le bouton librement (glisser, molette, flèches). L'iPhone ne
  laisse pas une page régler le volume : là, pas de bouton, ce sont ceux du téléphone. De petits bruits de touche et de cran, par le
  moteur audio (`BRUITS`).
- **En jeu** : « Quitter », en haut à gauche, sur tous les écrans d'une room (le serveur détache la ligne, qui peut rouvrir une
  room) ; les points de chacun sous sa pochette ; en 4 choix, deux colonnes de deux étiquettes, la choisie enfoncée en kraft ; sur
  un grand écran, l'aiguille gauche de l'ampli dit où en est la face, la droite, l'extrait.
- **Ce qui bouge** : un bouton rond tourne d'un cran à l'autre (`TELEPHONE.tourne`) ; rien en version sobre. La touche principale
  ne respire plus, et l'étiquette où l'on tape n'a plus de contour au focus : seul son curseur clignote.
- **Le tutoriel** : cinq diapositives à la première visite sur un appareil, et « Comment on joue ? » en bas de l'accueil pour les
  revoir (`brancherLeTuto`, `textes.tuto`).
- **Le RGPD** : `/confidentialite` et `/mentions-legales`, fabriquées par `npm run construire` (`ecran/jeu/legal.ts`), servies sans
  script ; le serveur y écrit l'adresse du site et celle où écrire (`CONTACT`, sinon celle qui envoie les liens). Leurs liens sont en
  bas de l'accueil et du compte. Un compte où personne ne revient depuis deux ans s'efface, prévenu un mois avant (`entretenir`).
- **Les statistiques** : `/statistiques`, pour l'éditeur seul. La page ne montre rien sans sa clé : le lien la porte dans son ancre
  (`#cle=…`), la page la garde dans le navigateur, l'efface de son adresse et la donne en `Authorization` ; tirée au sort à la
  première mise en ligne (`/etc/honear/statistiques.env`), `sudo sh deploiement/statistiques.sh` donne le lien. Le serveur compte
  sans savoir qui (`reseau/statistiques.ts`) : pages et visiteurs du jour (une empreinte de l'IP et du navigateur, salée chaque
  jour, en mémoire seulement), appareils, rooms et réglages, parties lancées et finies par mode, réponses et délais, titres,
  playlists et recherches du bac, partage et arrivées (QR, lien, code), tutoriel, comptes, records. Les rooms racontent ce qui
  s'y passe (`serveur/faits.ts`) ; le téléphone dit ce que lui seul voit (`statistique`). Jour par jour sur treize mois, puis en
  totaux, dans `/var/lib/honear/statistiques.json`, réécrit chaque minute. La page (`ecran/statistiques/`) se relit toutes les 30 s.
- **Les mots de passe** : facultatifs, dans « Mon compte » (le lien par e-mail marche toujours, et sert quand on l'a oublié). Dehors,
  « J'ai un mot de passe » sous l'adresse, puis « Entrer », ou « Mot de passe oublié » (le lien part) ; dedans, « Mot de passe »
  (ce qu'il vaut s'écrit à mesure qu'on le tape). Empreinte scrypt, essais comptés, autres sessions sorties et adresse prévenue
  quand il change (`reseau/mots-de-passe.ts`, `regles/mot-de-passe.ts`, voir NOTES-TECHNIQUES.md). L'écran du compte remonte d'un
  cran pour ses trois touches (`TABLEE.telephone.compte.serre`, `dedans`, `nouveau`).
- **Le RGPD, revu** : la confidentialité dit les mots de passe, les statistiques (et comment s'y opposer : Global Privacy Control,
  Do Not Track, que le serveur respecte), les journaux et `?diagnostic`, la sécurité, les fuites, les directives après la mort ;
  les mentions légales, comment signaler un contenu. Les statistiques ne gardent ni le texte d'une recherche qui ne trouve rien,
  ni le nom d'une playlist collée. `RGPD.md` tient le registre des traitements et la marche à suivre ; `deploiement/donnees.sh`
  donne à l'éditeur ce que le site garde d'un compte, pour répondre à qui le demande.
- **Docker** : le jeu dans un conteneur sans droits (`Dockerfile`, `deploiement/compose.yaml`), deux scripts (mettre en ligne,
  régler le courrier) à la place de l'installateur et du service systemd. La machine durcie et le frontal Caddy, partagés avec
  les autres sites du VPS, sont dans le dépôt `vps`.
- **Honear** : le jeu ne s'appelle plus « Miel d'oreilles » (honey + ear) ; l'expéditeur des e-mails prend le nom des textes.
- **honear.fr** est l'adresse du jeu ; mateosan.fr, sur le même VPS, montre une page d'attente et ne mène pas au jeu : il
  accueillera un autre site.

- **L'audit de la version mobile** (le 13) :
  - *Réactif* : un écran posé sur le meuble a deux couches, le meuble (la platine, le bac, la kraft, gardés tout faits pour les
    mêmes réglages : `lesDerniers`, `platineArretee`, `bacDessine`) et ce qu'on pose devant ; une lettre tapée, un écran qui reste
    sur la platine ne repeignent plus que le devant. Fondu de 0,18 s, touche tenue 0,05 s. Sur une page qui défile (l'accueil, le
    compte), la touche s'enfonce au doigt posé et agit au doigt levé sans avoir glissé : faire glisser la page ne lance plus rien.
  - *Le son* : les téléphones d'une room se rattrapent sans saut, en pressant ou ralentissant un rien l'extrait (8 % au plus,
    `TELEPHONE.son`) ; ils ne font plus écho. Un son que le navigateur refuse se dit (« Pas de son ? Touche l'écran. »). Un extrait
    n'est « fini » que lorsque l'heure a passé sa durée (l'iPhone le dit parfois fini juste après l'avoir amorcé).
  - *Le clavier* : le vrai clavier ne se dessine plus (on voyait sa place, moins large que l'écran, le temps qu'il monte) ; le code
    entre de lui-même à sa quatrième lettre ; une touche pressée, une recherche ou un lien envoyés ferment le clavier (il cachait
    ce qu'ils trouvaient) ; les étiquettes du code et de l'adresse ont, vides, la largeur d'un champ.
  - *Ce qu'on voit* : la citrouille ne se glisse plus sous une touche, ni sous la barre de Safari (elle se pose dans ce qu'on voit,
    ou pas du tout) ; les disques de la finale sortent de derrière les pochettes, sans cacher les visages ; « 0 pt », « 1 pt » ;
    qui reste à zéro ne « descend » pas au premier hit-parade ; dans le bac, la playlist choisie est miel, « Au hasard » et
    « Celle-là » ne se touchent plus, « Retour » ne couvre plus « Extraits de 30 secondes » ; le tutoriel et les liens du bas
    s'écrivent dans les caractères du jeu (les polices embarquées, `font-src data:`). Au salon, l'invité lit qui va lancer la face ;
    les titres revus à la finale ne passent plus sous « Quitter ».
  - *Le code* : les vraies pochettes et le diagnostic ont leur module (`ecran/telephone/images.ts`, `diagnostic.ts`) ; le client
    ne lit plus la taille du cadre qu'une fois par image, ni ne cherche la place du volume à chaque image ; trois fonctions que
    personne n'appelait s'en vont. Au téléphone, un meuble voisin dont on ne verrait qu'un bord ne se dessine pas (la platine
    coupée à côté du bac, une lisière de l'ampli) : la table continue. Le client du téléphone a enfin ses tests dans la fausse
    page (`tests/telephone-en-page.test.ts`) : une partie au doigt, de l'accueil au hit-parade.
- **Ce que l'iPhone a montré ensuite** (le 13, au soir) :
  - *Une erreur à chaque image* : sans bouton du volume (l'iPhone), le client tournait l'index d'un bouton qu'il n'avait pas posé.
    L'erreur coupait chaque image en deux : les touches du coin n'avaient pas de zone (« Retour », « Quitter » ne répondaient pas),
    les boutons de la platine ne tournaient plus, et la page ne savait pas quel écran elle montrait (pas de pied à l'accueil, donc
    rien à faire glisser). Le client ne tourne plus que le bouton qu'il a posé ; ce qui se pose par-dessus l'écran (le volume, les
    boutons, les curseurs, le décor) se fait chacun pour soi, après que la page a appris l'écran. Les tests jouent la partie aussi
    au téléphone, sans bouton.
  - *Au doigt, pas au clic* : ce qui agit au doigt levé (une page qu'on fait glisser, le partage du lien, « Quitter ») agit sur
    `pointerup`, là où le doigt s'est posé, à 10 px près (`TELEPHONE.doigt`) ; le clic, que l'iPhone donne parfois à la zone
    voisine, ou pas du tout, ne sert plus qu'au clavier et aux aides à la lecture.
  - *Le son* : plus de vitesse changée pour rattraper les autres téléphones, l'iPhone en saccadait ; on revient aux sauts rares
    (au-delà de 0,6 s, une fois en 5 s). Au téléphone, pas de bouton du volume : ce sont ceux du téléphone, et l'extrait joue en
    plein (à 30 % d'un volume cubique, un Android ne s'entendait presque pas). Sur un ordinateur, le bouton part aux deux tiers.
  - *Les touches* : aucune n'en chevauche une autre, sur aucun écran (un test les passe toutes, avec celles du coin) ; sa pochette
    refaite, « Au hasard » et « Retour » se chevauchaient : elles se posent l'une sous l'autre.
- **Les bugs, essayés dans de vrais navigateurs** (le 15) : un banc Playwright (Chromium et WebKit, dans un conteneur, hors du dépôt)
  joue des parties entières contre `dist/`, un PC, un iPhone et un Android à la fois. La version alors en ligne y lève, sur
  iPhone, l'erreur de chaque image (le volume), que la correction suivante règle : touches du coin sans zone, boutons figés, pas de pied.
  - *Les feats* : ni la liste d'une playlist Deezer ni, souvent, le titre ne les donnent (« Tout oublier » n'a pas Roméo Elvis) :
    la musique lit la fiche (`/track/{id}`) des trois prochaines pistes d'une room (`bientot`, `preciser`, `lireLesInvites`).
    Un invité suffit pour le point du feat ; ce qu'on tape se lit aussi mot à mot (« kofs jul ») ; en First one, un invité vaut
    l'artiste. Un titre perd ce qui dit son édition (« (2022 Remaster) », « - Radio Edit » : `titreSansEdition`).
  - *Le son sur iPhone* : Safari coupe le son à chaque position qu'on donne à l'extrait en pleine lecture (bug WebKit 306350) ; il
    n'y est plus remis qu'au-delà de 2,5 s d'écart, et jamais pendant qu'il attend ses données (`aRemettreEnPlace`).
  - *La ligne* : l'iPhone qui revient de veille, ou de WhatsApp, garde parfois une ligne « ouverte » qui ne reçoit plus rien.
    Muette 25 s, ou 5 s après le retour au premier plan (le téléphone redemande alors l'heure), elle est rouverte (`ligneMuette`).
  - *PC et téléphone, deux dispositions* (`dispositionDe`, `GRAND_ECRAN.ordinateur`), plus de regard à demi ouvert qui coupait
    le meuble aux bords : sous 0,8 de proportion, l'écran du téléphone ; au-dessus, le meuble entier, le même cadre d'un écran à
    l'autre (le bac ne le fait plus glisser ; seules sa pochette et les titres joués se voient de près, sur la table), et une
    fenêtre étroite le voit en entier, avec plus de table. Un meuble coupé au bord ne se dessine plus. Un téléphone couché lit
    « Redresse ton téléphone ». Sur un ordinateur, plus de suivi du clavier virtuel (l'étiquette remontait parfois en tapant).
  - *Ce qu'on voit* : plus de fondu sur la table nue après une piste (l'écran clignotait) ; la citrouille reste dans son coin
    (`cherche`) ; « Lancer la face A », taillée à son libellé, ne mord plus sur la kraft ; dans le bac, la choisie ne passe plus
    sur les crans. Un clavier qui compose un mot (Android) ne le voit plus récrit sous lui.
- **Le solo, et les fautes d'orthographe** (le 15, au soir) :
  - *Solo* prend le cran des 4 choix sur la manette (`regles/modes/solo.ts`) : la saisie libre et son barème, une room qui
    n'accueille que son hôte (`joueurs` dans le contrat d'un mode : il lance seul ; qui tente d'entrer lit « Partie en solo : ouvre
    la tienne. »), et la piste qui passe dès qu'il a tout trouvé (`finitAuPremier`). Son salon n'a ni code, ni lien, ni QR code.
    Les 4 choix restent au registre, rangés au-delà de la manette (cran 4) : ils ne s'y choisissent plus ; leurs écrans et leurs
    leurres restent, que les planches montrent (`MODES_PAR_CRAN` ne garde que les modes de la manette).
  - *Les fautes d'orthographe* passent dans tous les modes où l'on tape : une faute toutes les 4 lettres (au lieu de 5), et une
    comparaison à l'oreille (`aLOreille` : ph et f, c dur et k, c doux et s, y et i, z et s, w et ou, ou et u, au et o, ai et é,
    g doux et j, h muet, lettres doublées, e, s et x muets en fin de mot). « bionsé », « angel », « neckfeu », « johny halliday »
    sont justes ; « les démons du minou » reste « Presque. ».
- **Le son coupé pour toutes les pistes d'après, sur iPhone** (le 15, au soir) :
  - *Le serveur débranchait la nouvelle ligne* : un téléphone qui revient (de veille, d'une autre app, d'un réseau qui change)
    rouvre une ligne et redonne son jeton, mais le serveur ne voit la vieille ligne morte qu'au battement d'après (15 s) ; quand
    elle tombait enfin, il débranchait le joueur, revenu entre-temps : plus aucune piste ni aucun extrait ne lui arrivait, plus
    rien de ce qu'il répondait ne comptait. Une ligne qui tombe ne débranche plus que si elle est encore celle du joueur
    (`debrancher(id, heure, envoyer)`).
  - *Un élément audio coincé* : après une interruption (un appel, une notification, des écouteurs qu'on retire), l'iPhone peut
    laisser un `play()` sans réponse, le refuser pour autre chose qu'un geste, ou remettre l'extrait en pause aussitôt ; la page
    restait muette sans rien dire. Passé `attenteDuPlay`, `figeAuPlus` ou `relancesAuPlus` (`TELEPHONE.son`), l'écran dit
    « Pas de son ? Touche l'écran. » ; le toucher pose un élément neuf, à la bonne position, et le fait jouer dans ce geste.
- **Les listes sur mesure du MCP de Honear** (le 16) : un assistant (Claude, ChatGPT…) branché à mcp.honear.fr choisit les titres
  d'une playlist qui n'existe nulle part ; le MCP les vérifie chez Deezer, les range, et donne un lien `honear.fr/?liste=<id>`.
  Collé dans le bac, il se lit comme une playlist : la source `liste` (`serveur/sources/liste.ts`) lit la liste chez le MCP, sur
  le réseau interne `honear-listes`, et chaque piste se relit chez Deezer par son identifiant, pour un extrait frais. Ses surnoms
  (« Matthieu Chedid » pour « -M- ») s'ajoutent à ce que la saisie libre accepte ; une liste dont la difficulté monte se joue dans
  son ordre. Le jeu passe de 40 à 30 appels Deezer par 5 secondes : le MCP, qui sort par la même adresse, en prend 10.
- **Le lien d'une liste ouvert directement** (le 16) : la page lit `?liste=<id>` au démarrage (`ecran/jeu/demarrage.ts`) ; quand
  l'hôte pose un disque et finit sa pochette, son bac s'ouvre sur « Mes playlists » et la liste part comme un lien collé : il
  n'y a plus qu'à la prendre (« Celle-là »). Une fois : la room d'après choisit comme d'habitude. Aucun écran neuf.
- **Le jugement, une seule vérité pour deux** : le MCP porte en Python le jugement d'une saisie et la saisie libre (pour ses
  surnoms, et le mini blind test qu'il montrera dans la conversation). `npm run exporter-pour-le-mcp -- ~/honear-mcp` lui écrit
  les réglages du jugement, la part de Deezer du jeu, et une table de saisies jugées ici : les cas de `tests/cas-du-jugement.ts`,
  que `tests/jugement.test.ts` vérifie aussi, et des variantes tirées d'une graine. `morceauAuMoins` rejoint `JUGEMENT`. Il lui
  écrit aussi le moins de pistes qu'une playlist doit avoir pour une partie (la plus courte face) : une liste sur mesure plus
  courte, le MCP la refuse, au lieu d'un lien que le bac dirait « Trop court pour une face ».
- **L'anecdote d'une liste sur mesure, à la révélation** (le 16) : un papier crème sous le classement, posé de la colonne vers la
  droite, à la place de ce qu'on touchait (sous la phrase d'un état, s'il y en a une), en cinq lignes au plus ; au téléphone comme
  sur un grand écran, où il glisse sous le vinyle avec le reste (`papierDeLAnecdote`). En 4 choix, il prend la place de la bonne
  étiquette : la réponse est déjà au verso du disque. La réponse reste alors 9 secondes au lieu de 4 (`TELEPHONE.apresLAnecdote`),
  le son aussi ; le décor de saison l'évite. Trois écrans de l'étape 5 la montrent (`libre-anecdote`, `choix-anecdote`,
  `etat-personne-anecdote`).
- **Ce que l'extrait publie** (le 16) : seulement la réponse masquée et les étiquettes du 4 choix. Il publiait la piste entière,
  sauf son extrait : l'identifiant Deezer (de quoi trouver la réponse avant tout le monde) et les surnoms partaient aux téléphones.
- **Une playlist plus courte que la face réglée** (le 16) : choisie, elle règle « Titres » sur la plus longue face qu'elle remplit
  (une liste de douze titres, quand la face en veut quinze : dix). Le salon la refusait, et l'on revenait au bac.
- **Une saisie ne fige plus le serveur** (le 16) : la saisie libre découpait toute la réponse en suites de mots, et chaque « & »
  devient un mot ; cent soixante « & » demandaient près d'une minute de calcul, pendant laquelle aucune room ne répondait, et le
  serveur rejugeait chaque réponse à chaque message (il rejoue le journal). Désormais :
  - seuls les huit premiers mots se découpent (`JUGEMENT.motsAuPlus`) ;
  - le serveur refuse une saisie plus longue que ce que le téléphone laisse taper (`JUGEMENT.saisieAuPlus`, 120 au lieu de 160) ;
  - deux longueurs trop éloignées ne comptent plus leurs fautes (`fautesAuPlus`, sans changer aucun verdict) ;
  - une saisie déjà jugée ne se rejuge pas (`JUGEMENT.memoire`).

  La pire saisie coûte quelques millisecondes. Deux cas de `tests/cas-du-jugement.ts` le tiennent, et le MCP, qui porte ce
  jugement, reçoit les réglages par l'export.
- **Le bac, sans crans** (le 16) : « Prêtes à jouer » et « Mes playlists » n'ont plus de touche. Le bac est en haut, on y touche
  un thème ou « Mes playlists » (sa pochette personnalisée) ; dessous, une seule touche, « Chercher » (`TOUCHES_DU_BAC`). Un thème
  touché ramène aux thèmes d'où qu'on vienne : depuis « Mes playlists », on restait coincé, les intercalaires ne répondaient plus
  avant qu'on retouche « Prêtes à jouer ».
- **Le serveur tient bon** (le 19), d'après un audit :
  - *Un fichier qu'on ne sait pas relire* (coupé en route, abîmé, d'une autre version, une entrée qu'on ne reconnaît pas) passait
    pour un fichier vide : la première écriture effaçait tous les comptes. Il ne s'ouvre plus et n'est jamais réécrit ; les comptes
    restent fermés (`/sante` dit `illisibles`), les statistiques aussi, et le journal dit pourquoi, sans rien citer du fichier.
  - *Des rooms sans fin* : la playlist d'essai ne coûte rien, et « Quitter » puis rouvrir en ouvrait une autre, qui vivait une
    demi-heure. Le serveur en tient 2 000 au plus ; une même adresse en a trois ouvertes à la fois, dix ouvertes par minute au plus
    (`SERVEUR.rooms`) ; une room jamais lancée, laissée vide, s'en va en cinq minutes. Au-delà, l'hôte revient à la saisie du code :
    « Toutes les platines tournent. Réessaie dans un moment. » (`tropDeRooms`). Le code se tire en cinquante essais au plus, et
    les jetons d'une room s'en vont avec elle, sans parcourir ceux des autres.
  - *Des erreurs avalées* : un courrier qui ne partait pas (le téléphone lisait « comptes fermés »), Deezer ou le MCP qui ne
    répondaient pas ne laissaient aucune trace. Le journal le dit désormais, en une ligne (`reseau/journal.ts`) : la classe et le
    motif de l'erreur, sans adresse e-mail, ni lien, ni rien de ce qu'elle cite (une réponse SMTP cite le destinataire).
  - *Le diagnostic, ouvert à tous* : n'importe quelle page écrivait au journal du serveur (600 paquets par connexion). Il est fermé
    d'ordinaire ; on l'ouvre le temps d'un essai (`DIAGNOSTIC=1`, voir HEBERGEMENT.md), et une même adresse n'y écrit alors que
    600 paquets par heure.
  - *Une adresse qu'on s'invente* : le serveur croyait la première valeur de `X-Forwarded-For`, que le navigateur écrit à sa
    guise ; les limites par adresse s'en contournaient. Il ne lit cet en-tête que derrière un relais de confiance (`RELAIS=1`, dans
    `compose.yaml`), et n'en prend que la dernière valeur, celle que Caddy ajoute ; sinon, l'adresse de la prise.

- **Le tournoi, ses règles et son serveur** (le 20) : un mode en duels (`deroule: 'duels'`, `regles/modes/tournoi.ts`), à part du blind
  test : rien à deviner, deux titres par disque, chacun écoute ses deux faces à son rythme et vote pour celle qu'il garde (`voter`).
  - *Le tableau* : 8, 16 ou 32 titres (`TOURNOI.titres`, sur le bouton Titres), tirés au premier lancer, chacun une fois (un live, un
    remaster, un feat de plus ne font pas un titre de plus : `memeTitre`) ; une playlist qui n'en remplit pas assez prend le plus grand
    tableau qu'elle remplit, sous huit titres elle est refusée (`tropCourt`). Une revanche prend d'abord les titres pas encore joués.
  - *Le vote* : publié sans sa face, une fois par joueur ; on change d'avis tant que le duel n'est pas clos. Il se clôt dès que tous
    les joueurs branchés ont voté (qui arrive en cours regarde, qui part ne compte plus), ou quand l'hôte le clôt (`clore`, un vote au
    moins). La clôture révèle chaque vote ; à égalité, le disque est lancé comme une pièce, du hasard du serveur. Content si sa face
    passe, dépité sinon, endormi sans avoir voté. Pas de points : une partie au compte, jamais de victoire.
  - *Les extraits* voyagent hors du journal (`extraits`, et dans `etat`) ; un duel qui dure les relit toutes les minutes
    (`TOURNOI.relecture`). Une piste que la playlist ne donne plus perd par forfait.
  - *L'oreille de la room* : qui a le plus souvent voté comme la majorité (les égalités et les forfaits ne comptent pas), pour la fin.

- **La planche du tournoi** (le 20, `npm run tournoi`) : ses écrans sont ceux du jeu (`scene/duel.ts`, `scene/telephone/duel.ts`,
  `tableau.ts`), à valider avant le client.
  - *Le disque d'un duel* porte un titre sur chaque face, dessinée comme le verso d'une piste révélée (`DisqueADeuxFaces`) ; le regard
    est celui de la révélation : le disque entier, et la tête du bras, qu'on tire vers le bord pour revenir en arrière. Une main le
    retourne toujours du même côté : la face B à 180°, de nouveau la face A à 360° (`faceEnHaut`).
  - *Sous la platine* : le papier du tour (« Quarts, duel 2 sur 4 », et qui a voté) ; l'éventail, un rond miel sans rien d'écrit sur
    qui a voté ; les étiquettes des faces, A et B, celle qu'on a votée enfoncée en kraft ; « Clore le duel » chez l'hôte, dès un vote.
    À la clôture, chacun passe sous sa face, ses voix collées sous l'étiquette ; au forfait, ni voix ni pochettes.
  - *Le palmarès reprend les disques de la finale* : au blind test, l'or est la troisième place ; le vainqueur du tournoi prend donc le
    diamant, le finaliste le platine, les demi-finalistes l'or. L'oreille de la room tient sur un papier, les trois premiers.
  - *La kraft du salon* dit « Tournoi » et ses titres en lice (`Kraft.ecrit`), la touche « Lancer le tournoi ».
  - *Deux variantes pour le choisir* : le tournoi prend la place de 1re note sur la manette, ou deux crans sous la platine (Blind test,
    Tournoi). Sur la platine même, entre « Secondes » et la manette, un sélecteur à deux crans n'a pas la place de ses deux noms.

- **Le tournoi au téléphone** (le 20) : c'est la variante 2 qui est au jeu ; le prototype a son tournoi (`npm run prototype`, « Tournoi »).
  - *Les réglages* : deux crans sous la platine, Blind test et Tournoi ; au tournoi, « Titres » se grave 8, 16, 32 (16 d'abord, ou le plus
    grand tableau que la playlist remplit) ; toucher la manette ramène au blind test, sur son mode.
  - *Le tableau entier* part au premier lancer (`tableau`, au journal) : on le voit avant le premier duel et entre deux ; seul le duel
    suivant y est cerclé, au tour où il se joue ; chaque titre connu est cerné d'un filet (une vignette crème ne se perd pas sur le papier).
  - *La platine d'un duel* (`ecran/telephone/duel.ts`) est à chacun : la face A part ; toucher le disque le retourne (comme à la
    révélation), l'autre face part où on l'avait laissée (du début, si elle était finie) ; glisser le doigt sur le disque y pose le bras,
    levé tant qu'on le tient, le son coupé ; une face finie lève le bras, et si l'on n'a pas entendu l'autre, le disque se retourne de
    lui-même. Le téléphone règle la platine montée d'image en image (`regleurDuDuel`) : un vote qui arrive ne la redessine pas.
  - *Le son* : chaque téléphone joue sa face du haut, même quand l'hôte joue le son des pistes pour tous ; ce qu'on entend d'une face,
    c'est le bouton « Secondes » (`extraits.duree`). Le duel clos reste six secondes à l'écran (`TELEPHONE.duel`), le son s'y éteint.
  - *Corrigé en route* : la clôture d'un duel oubliait le tableau publié ; l'oreille de la room ne liste plus qui n'a voté à aucun
    duel tranché aux voix (« 0 sur 0 »).
  - *Solo ou Multi* : au tournoi, la manette n'a plus que ces deux noms (le blind test garde ses quatre modes) ; en solo
    (`tournoiSolo`), la room n'accueille que son hôte, ni QR code ni lien au salon, et chaque duel se clôt à son vote.
  - *Les vraies pochettes* (celles de Deezer) se posent par-dessus les vignettes : au milieu du disque d'un duel posé à plat (pas pendant
    qu'il se retourne), sur chaque titre connu du tableau, sur le podium du palmarès (`imagesDuTableau`, `imagesDuPalmares`,
    `pochetteDuDuel`) ; sans image, la vignette reste.
  - *Les listes du MCP faites pour un tournoi* (`creer_tournoi`) disent la taille de leur tableau : importées, elles se prennent
    dès huit titres, et les réglages s'ouvrent sur le tournoi. L'export pour le MCP donne les tailles du tableau.

- **La planche « Ce qui se touche »** (le 20, `npm run reperes`) : hors des touches, rien ne disait ce qui se touche (les boutons de
  la platine, les noms autour de la manette, les étiquettes, le disque). Trois façons de le signaler, sur trois écrans du jeu (les
  réglages, le bac, un duel) : des coins de visée miel, un pointillé, une pastille au coin. Ce qui se touche, c'est ce que le jeu fait
  toucher (`calquesATouche`, sorti du client vers `touchers.ts`). À choisir avant de les poser à chaque étape.

## Ce qui attend les étapes suivantes

- **Le tournoi en ligne** : le site lit déjà `tournoi` dans une liste du MCP (les réglages s'ouvrent sur le tournoi, à son tableau) ;
  `creer_tournoi` est prêt dans l'atelier du MCP. Le site se met en ligne avant le MCP. À essayer sur de vrais téléphones : le son de
  chaque face sur l'iPhone, le doigt qui glisse sur le disque.

- **Les comptes, la suite** : les clés d'accès (passkeys), pour entrer sans e-mail sur un téléphone déjà connu.
- **Au téléphone, le regard saute d'un écran à l'autre** : les glissades de la planche d'animations ne sont pas encore jouées par le client,
  et les vumètres ne se voient qu'à l'ampli de près. L'écran de l'hôte n'a pas encore ses animations en direct ; la liste des temps de
  l'atelier ne connaît pas encore la danse des aiguilles.
- **Le bouton « Pistes » ne connaît que 10, 15 et 20** : la partie courte du prototype (trois pistes par face) le laisse sur 15.
- **La suite du rangement**, si on la veut : cacher les commandes de la platine pendant la partie, réduire la kraft à sa pastille.
  L'une et l'autre touchent à l'atelier de l'étape 2.
- **Les intercalaires qui basculent quand on feuillette le bac** : il leur faut une plaque qui sache se coucher vers l'avant.
- **De vrais personnages**, à la place de l'avatar : trois pistes ont été proposées à part (des trognes, des bestioles, des objets qui chantent).
- **Un écran plus court que 390 × 844** : en jeu, la scène ne change pas d'échelle, on se déplace dessus. Sur un téléphone dont l'écran utile
  est plus court, la pochette kraft passe sous le bas du cadre : il faudra dire où le regard se pose alors, avec le meuble complet.
  L'atelier, lui, montre le cadre entier, réduit.
- **Le disque d'après** : la piste suivante devra ranger celui-ci. Rien ne le fait encore ; la séance de l'atelier repart d'une platine vide.
- **Le serveur** : la séance de l'atelier tient sa place. Elle parle déjà en actions datées (`lancer`, `prets`, `reveler`).
- **Les vraies pochettes** : une réponse peut porter l'adresse d'une image au lieu d'une vignette ; rien ne sait encore la montrer,
  et le verso lui garde sa place en papier nu. Elle arrivera avec la source de musique.
- **Le sélecteur de mode** : ses cinq crans sont gravés, deux sont inscrits. Les crans libres n'ont pas tous la même place : le registre des modes
  devra donner à chaque mode un nom gravé court, et le bouton refuser une inscription qui déborde de la place de son cran.
- **Les pseudos** : l'écran « Fais ta pochette » devra refuser ou remplacer à la saisie ce que les polices ne savent pas écrire.
  Les polices embarquées couvrent le français, sauf « Ÿ » : « ÿ » et « Ÿ » s'écrivent « y » et « Y ». Le titrage n'a pas le point médian :
  dans un titre, il devient « ? ».
- **De vrais téléphones** : Safari sur iPhone et Chrome sur un Android de milieu de gamme. Rien n'y a été essayé : tout ce dossier a été
  vu dans Chromium, sur un ordinateur. À y regarder d'abord : la netteté des toiles ; la fluidité, que le banc n'approche qu'en ralentissant
  un processeur ; la mémoire des toiles figées, que Chromium ne rend qu'au ramasse-miettes et que Safari plafonne ; et l'enfoncement
  d'une touche sous le doigt, que le navigateur tient lui-même (`:active`) le temps du toucher : s'il le montre trop tard ou trop peu,
  c'est le script qui devra poser l'enfoncement au toucher ; et le flanc du contrepoids, dont les tranches font des dents de 0,75 px
  (les resserrer porterait le bras au-delà de ses 150 polygones). Et surtout le son : Deezer n'a été joué que par de faux
  serveurs, et Chromium seul a joué les extraits ; l'iPhone ne charge un extrait qu'une fois qu'on l'a fait jouer (il l'est, muet, un instant).
- **Un navigateur qui cesse de donner des toiles en route** : la scène garde ce qu'elle montrait et le dit une fois à la console,
  mais la façade garde enfoncé le cran ou le poussoir qu'on vient de presser (« Verso B », « Léger »), et il faut en presser un autre
  avant de le redemander. À reprendre avec les écrans du jeu : c'est l'état qui devra revenir à ce qu'on voit.
  Passer au mode léger remonte toute la scène : elle se fige le temps d'un premier dessin (0,3 s pour y passer, 1,4 s pour en revenir,
  au banc ralenti quatre fois). En jeu, on n'y passe qu'à la main, et rarement.

## Polices

Voir `polices/LICENCES.md` : deux familles sous licence OFL, auto-hébergées, et le texte de leur licence avec leur copyright.
Caprasimo pour le titrage, Barlow Condensed pour le technique.
