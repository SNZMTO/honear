import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hauteurPour, projeter, surLEcran } from '../src/lowpoly/projection';
import { TON_DE_BASE } from '../src/lowpoly/tons';
import { moins, polaire, type Vec2 } from '../src/lowpoly/vecteurs';
import { CADRAGES } from '../src/ressources/cadrages';
import { DENSITES } from '../src/ressources/densites';
import { AMPLEURS } from '../src/ressources/mouvement';
import { PLATINE } from '../src/ressources/platine';
import { TEXTES } from '../src/ressources/textes.fr';
import { regardSurLaPlatine } from '../src/scene/meuble';
import { angleDuBrasAuRayon, CENTRE_DU_PLATEAU, HAUTEURS, PIVOT_DU_BRAS } from '../src/scene/platine';
import { calquesALEcran, textesALEcran } from './etendues';
import { calque, dessins, image, IMAGES_DE_LA_PISTE } from './planche';

const regard = regardSurLaPlatine();
/** Un point du meuble, à une hauteur donnée, ramené dans l'écran du téléphone. */
const aLEcran = (p: Vec2, h: number): Vec2 => moins(surLEcran(p, h), regard.origine);
const dedans = ([x, y]: Vec2, marge = 8): boolean => x >= marge && x <= regard.largeur - marge && y >= marge && y <= regard.hauteur - marge;

test('les images de la platine au téléphone sont bien vues par ce regard, dans un cadre de 390 × 844', () => {
  assert.deepEqual([regard.largeur, regard.hauteur], [CADRAGES.telephone.largeur, CADRAGES.telephone.hauteur]);
  assert.deepEqual([regard.largeur, regard.hauteur], [390, 844]);
  for (const cle of ['fine', 'sobre']) assert.deepEqual(image(`platine-${cle}`).regard, regard);
});

test('au téléphone, le disque sort du cadre mais l’étiquette reste entière', () => {
  const { rayon, etiquette } = PLATINE.disque;
  const bordGaucheDuDisque = aLEcran([CENTRE_DU_PLATEAU[0] - rayon, CENTRE_DU_PLATEAU[1]], HAUTEURS.disque);
  assert.ok(bordGaucheDuDisque[0] < 0, 'le disque sort par la gauche');
  for (let angle = 0; angle < 360; angle += 15) {
    assert.ok(dedans(aLEcran(polaire(CENTRE_DU_PLATEAU, etiquette, angle), HAUTEURS.disque)), `le bord de l'étiquette sort du cadre à ${angle}°`);
  }
});

test('au téléphone, la course du bras ne sort jamais du cadre', () => {
  const { bourrelet, etiquette } = PLATINE.disque;
  for (let rayon = bourrelet; rayon >= etiquette; rayon -= 4) {
    const pointe = polaire(PIVOT_DU_BRAS, PLATINE.bras.longueur, angleDuBrasAuRayon(rayon));
    // La pointe est bien à ce rayon sur le disque…
    assert.ok(Math.abs(Math.hypot(pointe[0] - CENTRE_DU_PLATEAU[0], pointe[1] - CENTRE_DU_PLATEAU[1]) - rayon) < 0.01);
    // … et elle se voit à l'écran.
    assert.ok(dedans(aLEcran(pointe, HAUTEURS.disque), 24), `la pointe sort du cadre au rayon ${rayon}`);
  }
  assert.ok(dedans(aLEcran(PIVOT_DU_BRAS, HAUTEURS.bras), 24), 'le pivot du bras se voit aussi');
  const auRepos = polaire(PIVOT_DU_BRAS, PLATINE.bras.longueur, PLATINE.bras.repos);
  assert.ok(dedans(aLEcran(auRepos, HAUTEURS.bras), 8), 'et la tête du bras au repos');
});

test('le bras va du bord du disque à l’étiquette en tournant toujours dans le même sens', () => {
  const debut = angleDuBrasAuRayon(PLATINE.disque.bourrelet);
  const fin = angleDuBrasAuRayon(PLATINE.disque.etiquette);
  assert.ok(PLATINE.bras.repos < debut && debut < fin, `repos ${PLATINE.bras.repos}°, bord ${debut.toFixed(1)}°, étiquette ${fin.toFixed(1)}°`);
  // Au repos, la tête est hors du disque.
  const tete = polaire(PIVOT_DU_BRAS, PLATINE.bras.longueur, PLATINE.bras.repos);
  assert.ok(
    Math.hypot(tete[0] - CENTRE_DU_PLATEAU[0], tete[1] - CENTRE_DU_PLATEAU[1]) > PLATINE.plateau.rayon,
    'au repos, la pointe est hors du plateau',
  );
});

test('la platine occupe la moitié haute du téléphone, et rien ne frôle le bord de son socle', () => {
  const [x, y] = PLATINE.position;
  const { largeur, profondeur } = PLATINE.socle;
  const bas = aLEcran([x, y + profondeur], 0)[1];
  assert.ok(bas > regard.hauteur * 0.45 && bas < regard.hauteur * 0.58, `le bas du socle tombe à ${Math.round(bas)} px sur ${regard.hauteur}`);
  // Le plateau, vu avec son épaisseur, laisse au moins 8 px de laque derrière lui et sur ses côtés.
  const { centre, rayon } = PLATINE.plateau;
  const haut = aLEcran([CENTRE_DU_PLATEAU[0], CENTRE_DU_PLATEAU[1] - rayon], HAUTEURS.plateau)[1] - aLEcran([x, y], HAUTEURS.socle)[1];
  assert.ok(haut >= 8, `le plateau passe à ${haut.toFixed(1)} px de l'arête arrière du socle`);
  assert.ok(centre[0] - rayon >= 8 && largeur - centre[0] - rayon >= 8);
});

test('aucune veine du noyer ne longe l’arête arrière du socle : il reste du bois entre elles, dans les deux densités', () => {
  const [x, y] = PLATINE.position;
  const { epaisseur, chanfrein, largeur } = PLATINE.socle;
  // Le haut du socle tel qu'on le voit : le pied de son chanfrein arrière.
  const arete = projeter([x, y, hauteurPour(epaisseur) - chanfrein])[1];
  for (const densite of Object.values(DENSITES)) {
    // Une veine se reconnaît à son ton : un de plus ou de moins que le bois, qui est à plat.
    const veines = dessins(calque(image(`platine-${densite.cle}`).scene, 'noyer'))
      .flatMap((d) => (d.genre === 'peinture' ? d.facettes : []))
      .filter((f) => f.ton !== TON_DE_BASE);
    let auDessus = 0;
    for (const veine of veines) {
      const [xs, ys] = [veine.contour.map((p) => p[0]), veine.contour.map((p) => p[1])];
      const horsDuSocle = Math.max(...xs) < regard.origine[0] || Math.min(...xs) > x + largeur;
      // Une veine qui commence sous l'arête est cachée tout entière par le socle.
      if (horsDuSocle || Math.min(...ys) >= arete) continue;
      auDessus++;
      const bois = arete - Math.max(...ys);
      assert.ok(bois >= 3, `${densite.cle} : une veine passe à ${bois.toFixed(1)} px de l'arête arrière du socle`);
    }
    assert.ok(auDessus >= 2, `${densite.cle} : ${auDessus} veines derrière le socle`);
  }
});

/** Les images de la piste où le regard est arrêté : sur la platine, puis sur la réponse. Dans les deux densités, avec les deux versos. */
const ARRETS = IMAGES_DE_LA_PISTE.filter((i) => /^piste-(repos|brasLeve|extrait|reponse)(-|$)/.test(i.fichier));

test('regard arrêté sur la platine ou sur la réponse, aucun texte n’est coupé par le bord du cadre : on le lit en entier, ou pas du tout', () => {
  assert.equal(ARRETS.length, 8);
  let lus = 0;
  for (const { fichier, scene, regard: vu } of ARRETS) {
    for (const texte of textesALEcran(scene)) {
      const [gauche, haut] = [texte.lettres.x - vu.origine[0], texte.lettres.y - vu.origine[1]];
      const [droite, bas] = [gauche + texte.lettres.largeur, haut + texte.lettres.hauteur];
      const dedans = gauche >= 4 && droite <= vu.largeur - 4 && haut >= 4 && bas <= vu.hauteur - 4;
      const dehors = droite <= -1 || gauche >= vu.largeur + 1 || bas <= -1 || haut >= vu.hauteur + 1;
      lus += dedans ? 1 : 0;
      assert.ok(
        dedans || dehors,
        `${fichier} : « ${texte.contenu} » (${texte.calque}) est coupé par le cadre, de ${gauche.toFixed(1)} à ${droite.toFixed(1)} px sur ${vu.largeur}`,
      );
    }
  }
  assert.ok(lus >= 120, `${lus} textes lus en entier`);
});

test('regard arrêté, aucune petite pièce ne dépasse d’un rien dans le cadre : elle y est en entier, ou n’y est pas', () => {
  // Les pièces qu'on reconnaît d'un coup d'œil. Le plateau, le disque et la pochette kraft, eux, peuvent sortir du cadre.
  const PETITES = [
    /^bras$/,
    /^levier$/,
    /^interrupteur-son$/,
    /^bouton-(pistes|extrait|mode)$/,
    /^pastille-decompte$/,
    /^kraft\/(corps|devant)\/(pastille|tampon)$/,
    /^charniere-\d\/ombre$/,
  ];
  const vues = PETITES.map(() => 0);
  for (const { fichier, scene, regard: vu } of ARRETS) {
    for (const [nom, emprise] of calquesALEcran(scene)) {
      const laquelle = PETITES.findIndex((petite) => petite.test(nom));
      if (laquelle < 0) continue;
      const [gauche, droite] = [emprise.x - vu.origine[0], emprise.x + emprise.largeur - vu.origine[0]];
      const dedans = gauche >= 0 && droite <= vu.largeur;
      const dehors = droite <= -2 || gauche >= vu.largeur + 2;
      vues[laquelle] = (vues[laquelle] ?? 0) + (dedans ? 1 : 0);
      assert.ok(dedans || dehors, `${fichier} : ${nom} est coupé par le cadre, de ${gauche.toFixed(1)} à ${droite.toFixed(1)} px sur ${vu.largeur}`);
    }
  }
  // Chaque sorte de pièce est bien vue en entier quelque part : un nom de calque qui change ne vide pas le contrôle sans bruit.
  PETITES.forEach((petite, i) => assert.ok((vues[i] ?? 0) >= 2, `${petite.source} : ${vues[i]} fois vue en entier`));
  assert.ok(vues.reduce((somme, n) => somme + n, 0) >= 60, `${vues.join(' + ')} pièces vues en entier`);
});

test('arrêté sur la réponse, le regard la montre entière, avec la plaque de marque ; rien ne frôle le cadre : un liseré de noyer à gauche, le disque franchement coupé à droite, le bras parti', () => {
  /** Ce qu'il faut de px pour qu'un bord soit franchement dedans, ou franchement dehors. */
  const FRANC = 10;
  for (const [fichier, pochette] of [
    ['piste-reponse', 'disque/verso/pochette'],
    ['piste-reponse-disque-sobre', 'disque/verso/etiquette'],
  ] as const) {
    const fin = IMAGES_DE_LA_PISTE.find((i) => i.fichier === fichier);
    assert.ok(fin !== undefined);
    const { scene, regard: vu } = fin;
    assert.ok(Math.abs(vu.origine[0] - regard.origine[0] - AMPLEURS.regardSurLaReponse) < 0.05, 'le regard a fini de glisser');
    const calques = calquesALEcran(scene);
    const bords = (nom: string): [number, number] => {
      const emprise = calques.get(nom);
      assert.ok(emprise !== undefined, `${fichier} : pas de calque « ${nom} »`);
      return [emprise.x - vu.origine[0], emprise.x + emprise.largeur - vu.origine[0]];
    };
    // À gauche, le socle montre son bord, un liseré de noyer devant lui.
    const bordDuSocle = PLATINE.position[0] - vu.origine[0];
    assert.ok(bordDuSocle >= FRANC && bordDuSocle <= 2 * FRANC, `${fichier} : le socle commence à ${bordDuSocle.toFixed(1)} px du bord gauche`);
    // À droite, le cadre coupe franchement le disque, et le plateau avec lui ; à gauche, le disque est entier.
    const [gauche, droite] = bords('disque/verso/image');
    assert.ok(gauche >= FRANC && droite >= vu.largeur + FRANC, `${fichier} : le disque va de ${gauche.toFixed(1)} à ${droite.toFixed(1)} px`);
    // Ce qui porte la réponse tient dans le cadre, loin de ses bords : la pochette ou l'étiquette, et chaque ligne écrite au verso.
    const [de, a] = bords(pochette);
    assert.ok(de >= 4 * FRANC && a <= vu.largeur - 4 * FRANC, `${fichier} : ${pochette} va de ${de.toFixed(1)} à ${a.toFixed(1)} px`);
    const auVerso = textesALEcran(scene).filter((texte) => texte.calque.startsWith('disque/verso/'));
    assert.ok(auVerso.length >= 2, `${fichier} : ${auVerso.length} lignes au verso`);
    for (const { contenu, lettres } of auVerso) {
      const [debut, bout] = [lettres.x - vu.origine[0], lettres.x + lettres.largeur - vu.origine[0]];
      assert.ok(
        debut >= 3 * FRANC && bout <= vu.largeur - 3 * FRANC,
        `${fichier} : « ${contenu} » va de ${debut.toFixed(1)} à ${bout.toFixed(1)} px`,
      );
    }
    // Le bras, reposé, et la pochette kraft sont hors du cadre.
    assert.ok(bords('bras')[0] >= vu.largeur + 2, `${fichier} : le bras, reposé, est hors du cadre`);
    assert.ok(bords('kraft/corps')[0] >= vu.largeur + 2, `${fichier} : la pochette kraft est hors du cadre`);
    // On lit la réponse en entier, et la marque de la platine à sa gauche.
    const lus = textesALEcran(scene).filter(({ lettres }) => lettres.x >= vu.origine[0] && lettres.x + lettres.largeur <= vu.origine[0] + vu.largeur);
    const contenus = lus.map((t) => t.contenu);
    const titre = contenus.includes(TEXTES.exemples.titre)
      ? [TEXTES.exemples.titre]
      : TEXTES.exemples.titre.split(' ').length > 2
        ? ['Les Démons', 'de minuit']
        : [];
    for (const attendu of [...titre, TEXTES.exemples.interprete, TEXTES.logo.nom]) {
      assert.ok(contenus.includes(attendu), `${fichier} : on ne lit pas « ${attendu} »`);
    }
    assert.ok(titre.length > 0);
  }
});
