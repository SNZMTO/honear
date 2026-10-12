import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cercle } from '../src/lowpoly/contours';
import { peindre } from '../src/lowpoly/facette';
import { prisme } from '../src/lowpoly/formes/boite';
import { surLEcran } from '../src/lowpoly/projection';
import { TEINTES } from '../src/lowpoly/tons';
import { disqueDeLAccueil, platineDeLAccueil, pochetteDExemple } from '../src/planche/exemples';
import type { ImageDePlanche } from '../src/planche/image';
import { LEGENDES } from '../src/planche/legendes.fr';
import { detailsDesDensites, imagesDeLaPlanche, RAYON_DU_LOGO } from '../src/planche/scenes';
import { DESSUS, EXPRESSIONS, TETES, type CleDeDessus, type CleDeTete, type NomDExpression } from '../src/ressources/avatar';
import { DENSITES } from '../src/ressources/densites';
import { PLATINE } from '../src/ressources/platine';
import { REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { CORPS, HAUTEUR_DE_CAPITALE } from '../src/ressources/typo';
import { dessinerLAvatar } from '../src/scene/avatar';
import { peinture, type Calque, type Dessin } from '../src/scene/calque';
import { dessinerLeDisque, type Disque } from '../src/scene/disque';
import { CHIFFRES_DU_DECOMPTE } from '../src/scene/piste/pieces';
import { angleDuBrasAuRayon, CENTRE_DU_PLATEAU, dessinerLaPlatine, HAUTEURS, pointeQuiDepasse, type EtatDeLaPlatine } from '../src/scene/platine';
import { dessinerLAxe, reglerLAxe } from '../src/scene/platine/axe';
import { regler } from '../src/scene/reglage';
import { controler, LIMITES } from '../src/scene/rendu/controle';
import { empriseDe } from '../src/scene/rendu/emprise';
import { inventaire, poidsTotal } from '../src/scene/rendu/inventaire';
import { enSvg } from '../src/scene/rendu/svg';
import { calque, calques, dessins, ENCRIER, image, IMAGES, TOUTES_LES_IMAGES } from './planche';

const AU_TELEPHONE = ['platine-fine', 'platine-sobre'] as const;
const PLATINES = [...AU_TELEPHONE, 'platine-eclatee'] as const;
const polygones = (liste: readonly Dessin[]): number =>
  poidsTotal(inventaire({ genre: 'calque', nom: 'decor', role: 'decor', contenu: liste })).polygones;
const enSvgDe = ({ fichier, scene, regard, titre }: ImageDePlanche): string =>
  enSvg(scene, { ...regard, prefixe: `${fichier}-`, tracerLeTexte: ENCRIER.tracer, titre });

test('la planche montre ce que les choix ont laissé de l’étape 1, dans l’ordre où elle se lit', () => {
  assert.deepEqual(
    IMAGES.map((i) => i.fichier),
    ['platine-fine', 'platine-sobre', 'platine-eclatee', 'pochette', 'logo'],
  );
});

test('le même état redonne le même dessin, au polygone près : recharger la page ne change rien au meuble', () => {
  assert.deepEqual(imagesDeLaPlanche(TEXTES, ENCRIER), IMAGES);
});

test('aucun défaut de rendu sur aucune image : ni facettes qui claquent, ni lame, ni ombre à contresens, ni texte illisible', () => {
  for (const i of TOUTES_LES_IMAGES) assert.deepEqual(controler(i.scene).constats, [], i.fichier);
});

test('les budgets tiennent : 2 500 polygones de décor au plus, et moins de 150 par calque mobile, lettres comprises', () => {
  for (const i of TOUTES_LES_IMAGES) {
    const controle = controler(i.scene);
    assert.ok(controle.polygonesDuDecor <= LIMITES.decor, `${i.fichier} : ${controle.polygonesDuDecor} polygones de décor`);
    const { nom, poids } = controle.plusLourdCalqueMobile;
    assert.ok(poids < LIMITES.mobile, `${i.fichier} : ${nom} pèse ${poids}`);
  }
  // L'étiquette, qui tourne, pèse ses polygones et les lettres de son texte (« Honear », ses mentions) : bien plus de lettres que de polygones.
  const etiquette = inventaire(image('platine-fine').scene).find((ligne) => ligne.nom === 'etiquette');
  assert.ok(etiquette !== undefined && etiquette.lettres > 30 && etiquette.polygones < 10, JSON.stringify(etiquette));
});

test('chaque dessin est sous un calque qui a un rôle : rien n’échappe aux budgets', () => {
  for (const i of TOUTES_LES_IMAGES) {
    assert.deepEqual(
      inventaire(i.scene).filter((ligne) => ligne.role === null),
      [],
      i.fichier,
    );
  }
});

test('la densité sobre pèse moins de la moitié de la fine ; dans l’une comme dans l’autre, un disque a au moins 48 pans, un bouton au moins 16', () => {
  const poids = AU_TELEPHONE.map((fichier) => poidsTotal(inventaire(image(fichier).scene)).polygones);
  const [fine, sobre] = poids;
  assert.ok(fine !== undefined && sobre !== undefined);
  assert.ok(sobre * 2 < fine, `polygones : ${poids.join(', ')}`);
  for (const densite of Object.values(DENSITES)) {
    assert.ok(densite.pansDeDisque >= 48, `${densite.cle} : un disque a au moins 48 pans`);
    assert.ok(densite.pansDeBouton >= 16 && densite.pansDeBouton % 2 === 0, `${densite.cle} : un bouton a au moins 16 pans, en nombre pair`);
    assert.ok(densite.plages <= PLATINE.disque.plages.length);
  }
  assert.ok(PLATINE.bras.cardan.pans >= 16, 'le pivot du bras, de la taille d’un bouton, est rond lui aussi');
});

test('chaque pièce mobile de la platine est un calque à part, et son ombre aussi, dessinée sous elle', () => {
  const mobiles = ['etiquette', 'interrupteur-son', 'levier', 'bras'] as const;
  for (const fichier of PLATINES) {
    const { scene } = image(fichier);
    const tous = calques(scene);
    const rang = (nom: string): number => tous.findIndex((c) => c.nom === nom);
    for (const piece of mobiles) {
      assert.equal(calque(scene, piece).role, 'mobile', `${fichier} : ${piece}`);
      assert.equal(calque(scene, `${piece}/ombre`).role, 'ombre', `${fichier} : ${piece}/ombre`);
      assert.ok(rang(`${piece}/ombre`) < rang(piece), `${fichier} : l'ombre de ${piece} passe sous sa pièce`);
    }
    // Le disque se déplace comme une seule pièce : un groupe, dont le vinyle est figé en image et dont l'étiquette seule tourne.
    assert.equal(calque(scene, 'disque').role, undefined);
    assert.equal(calque(scene, 'disque/vinyle').role, 'image');
    assert.equal(calque(scene, 'disque/ombre').role, 'ombre');
    assert.ok(rang('disque/ombre') < rang('disque'));
    // Un bouton, de même : son corps moleté ne change jamais de facettes, seul son index tourne.
    for (const cle of Object.keys(PLATINE.commandes.boutons)) {
      assert.equal(calque(scene, `bouton-${cle}`).role, undefined);
      assert.equal(calque(scene, `bouton-${cle}/corps`).role, 'image');
      assert.equal(calque(scene, `bouton-${cle}/index`).role, 'mobile');
      assert.equal(calque(scene, `bouton-${cle}/ombre`).role, 'ombre');
      assert.ok(rang(`bouton-${cle}/ombre`) < rang(`bouton-${cle}`));
    }
    // Les repères sont gravés dans la jante : ils tournent, mais n'ont pas d'épaisseur, donc pas d'ombre.
    assert.equal(calque(scene, 'reperes').role, 'mobile');
  }
});

test('l’axe sort de la feutrine sous le disque ; sa pointe dépasse d’un disque posé, et s’efface quand le disque est tenu plus haut qu’elle', () => {
  const rang = (fichier: string, nom: string): number => calques(image(fichier).scene).findIndex((c) => c.nom === nom);
  for (const fichier of PLATINES) {
    assert.ok(rang(fichier, 'axe') < rang(fichier, 'disque/ombre'), `${fichier} : l'axe entier passe sous le disque`);
    assert.ok(rang(fichier, 'axe/pointe') > rang(fichier, 'etiquette'), `${fichier} : sa pointe passe sur l'étiquette`);
  }
  for (const fichier of AU_TELEPHONE) assert.equal(calque(image(fichier).scene, 'axe/pointe').opacite, 1, fichier);
  assert.equal(calque(image('platine-eclatee').scene, 'axe/pointe').opacite, 0, 'soulevé, le disque ne laisse plus rien dépasser');
});

test('la pointe de l’axe sort du disque à mesure qu’il descend sur elle : son dessus ne bouge pas, son flanc et son ombre s’allongent', () => {
  const D = PLATINE.axe.depassement;
  assert.deepEqual([pointeQuiDepasse(0), pointeQuiDepasse(D / 3), pointeQuiDepasse(D), pointeQuiDepasse(D + 40)], [D, (2 * D) / 3, 0, 0]);
  assert.equal(pointeQuiDepasse(-1), D + 1, 'un disque qui tasse la feutrine d’un px en fait dépasser un de plus : aucun jour sous la pointe');
  for (const densite of Object.values(DENSITES)) {
    const pointe = (depasse: number): Calque => dessinerLAxe(densite, depasse).pointe;
    const entiere = pointe(D);
    assert.equal(entiere.role, 'mobile');
    // La régler ou la redessiner donnent la même pointe, à toute hauteur.
    for (const depasse of [0, 0.2, 1, D / 2, D, D + 1])
      assert.deepEqual(regler(entiere, reglerLAxe(depasse, densite)), pointe(depasse), `${depasse} px`);
    assert.equal(pointe(0).opacite, 0);
    assert.equal(pointe(0.2).opacite, 1, 'dès qu’elle dépasse, on la voit');
    // Entière, elle occupe à l'écran ce qu'occupe le même axe monté d'un bloc depuis le dessus du disque.
    const contour = cercle(CENTRE_DU_PLATEAU, PLATINE.axe.rayon, densite.pansDePetitRond);
    const bloc = peinture(peindre(prisme({ contour, base: HAUTEURS.disque, epaisseur: D, chanfrein: PLATINE.axe.chanfrein, teinte: 'alu' })));
    const corps = (c: Calque): Calque => ({ ...c, contenu: c.contenu.filter((d) => d.genre !== 'calque' || d.role !== 'ombre') });
    const [vue, attendue] = [empriseDe([corps(entiere)], ENCRIER.largeur), empriseDe([bloc], ENCRIER.largeur)];
    assert.ok(vue !== undefined && attendue !== undefined);
    for (const cote of ['x', 'y', 'largeur', 'hauteur'] as const) assert.ok(Math.abs(vue[cote] - attendue[cote]) < 1e-6, `${densite.cle} : ${cote}`);
    // À mi-course, son flanc est plus court d'autant, et son pied est remonté avec lui ; son dessus est au même endroit.
    const hauteurDe = (depasse: number): number => empriseDe([corps(pointe(depasse))], ENCRIER.largeur)?.hauteur ?? NaN;
    const hautDe = (depasse: number): number => empriseDe([corps(pointe(depasse))], ENCRIER.largeur)?.y ?? NaN;
    assert.ok(Math.abs(hauteurDe(D) - hauteurDe(D / 2) - D / 2) < 1e-6, `${densite.cle} : ${hauteurDe(D)} puis ${hauteurDe(D / 2)}`);
    assert.ok(Math.abs(hautDe(D) - hautDe(D / 2)) < 1e-6);
    // Son ombre : celle de ce qui dépasse, posée sur le dessus du disque, là où il est.
    const portee = (depasse: number): number => {
      const glisse = calque(pointe(depasse), 'axe/pointe/ombre').transformations?.[1];
      return glisse?.genre === 'glisser' ? Math.hypot(...glisse.de) : NaN;
    };
    assert.ok(portee(D) > 2 * portee(D / 2) - 1e-9 && portee(D / 2) > 0 && portee(0) === 0, `${portee(D)}, ${portee(D / 2)}, ${portee(0)}`);
  }
});

test('les deux pochettes de la planche sont des images, leur ombre à part, et elles sont posées de travers, entre 3 et 9 degrés', () => {
  const { scene } = image('pochette');
  for (const nom of ['pochette-240', 'pochette-48'] as const) {
    assert.equal(calque(scene, nom).role, 'image');
    assert.equal(calque(scene, `${nom}/ombre`).role, 'ombre');
    const [tourne] = calque(scene, `${nom}/imprime/tourne`).transformations ?? [];
    assert.ok(tourne?.genre === 'tourner' && Math.abs(tourne.de) >= 3 && Math.abs(tourne.de) <= 9, nom);
  }
});

test('une pièce qui tourne tourne rond avant d’être écrasée : la rotation dans un calque à elle, l’écrasement au-dessus, une seule fois', () => {
  let tournants = 0;
  let piles = 0;
  const visiter = (c: Calque, ancetres: readonly Calque[], fichier: string): void => {
    const transformations = c.transformations ?? [];
    if (transformations.some((t) => t.genre === 'tourner')) {
      tournants++;
      assert.equal(transformations.length, 1, `${fichier} : ${c.nom} ne fait que tourner`);
      // Au-dessus de lui, un seul calque écrase, et il le fait en dernier : tout ce qu'il contient est dessiné vu de dessus.
      const plans = ancetres.filter((a) => a.transformations?.some((t) => t.genre === 'ecraser'));
      const [plan] = plans;
      assert.ok(plan !== undefined && plans.length === 1, `${fichier} : ${c.nom} tourne dans ${plans.length} plans écrasés`);
      assert.equal(plan.transformations?.at(-1)?.genre, 'ecraser', `${fichier} : ${plan.nom} écrase en dernier`);
      // L'étage d'une pile est écrasé par son parent direct ; ce qui est collé dessus de travers (un tampon, une pastille) tourne plus bas.
      if (ancetres.at(-1) === plan) piles++;
    }
    for (const d of c.contenu) if (d.genre === 'calque') visiter(d, [...ancetres, c], fichier);
  };
  for (const i of TOUTES_LES_IMAGES) visiter(i.scene, [], i.fichier);
  // Les autres tournent dans un étage : un tampon ou une pastille collés de travers, les copies de la traînée d'une étiquette.
  assert.ok(tournants > 1000 && piles > tournants * 0.85, `${tournants} calques tournants vérifiés, dont ${piles} étages de pile`);
  // Et c'est bien ce qui est écrit dans le SVG : glisser, puis écraser, puis tourner.
  assert.match(
    enSvgDe(image('platine-fine')),
    /<g id="platine-fine-etiquette-papier"[^>]* transform="translate\([^)]+\)"><g transform="scale\(1 0\.88\)"><g id="platine-fine-etiquette-papier-tourne"[^>]* transform="rotate\(0\)">/,
  );
});

test('la platine de l’accueil est à l’arrêt : l’étiquette est à l’endroit, le nom en haut', () => {
  for (const fichier of PLATINES)
    assert.deepEqual(calque(image(fichier).scene, 'etiquette/papier/tourne').transformations, [{ genre: 'tourner', de: 0 }]);
  assert.deepEqual(calque(image('logo').scene, 'logo/etiquette/papier/tourne').transformations, [{ genre: 'tourner', de: 0 }]);
});

/** La même scène, toutes ses rotations ramenées à zéro. */
const sansRotation = (dessin: Dessin): Dessin => {
  if (dessin.genre !== 'calque') return dessin;
  const { transformations, ...reste } = dessin;
  return {
    ...reste,
    contenu: dessin.contenu.map(sansRotation),
    ...(transformations !== undefined
      ? { transformations: transformations.map((t) => (t.genre === 'tourner' ? { genre: 'tourner', de: 0 } : t)) }
      : {}),
  };
};
/** La même scène, sans aucune de ses transformations : ce qui est dessiné, où que ce soit posé. */
const sansTransformations = (dessin: Dessin): Dessin => {
  if (dessin.genre !== 'calque') return dessin;
  const { transformations: _, ...reste } = dessin;
  return { ...reste, contenu: dessin.contenu.map(sansTransformations) };
};
const rotations = (scene: Calque): Map<string, number> =>
  new Map(
    calques(scene).flatMap((c) => (c.transformations ?? []).flatMap((t): [string, number][] => (t.genre === 'tourner' ? [[c.nom, t.de]] : []))),
  );

test('la lampe ne bouge pas : quand le disque, le plateau, le bras ou un bouton tournent, aucune facette ne change de ton', () => {
  const densite = DENSITES.fine;
  const accueil = platineDeLAccueil(TEXTES);
  const disqueAuRepos = disqueDeLAccueil(TEXTES, densite, ENCRIER.largeur);
  const platine = (etat: EtatDeLaPlatine, disque: Disque): Calque => {
    const dessine = dessinerLeDisque(disque, densite);
    return dessinerLaPlatine(etat, densite, [dessine.ombre, dessine.disque]);
  };
  const enJeu: EtatDeLaPlatine = {
    ...accueil,
    reperes: 41,
    bras: { angle: angleDuBrasAuRayon(120), leve: 0 },
    commandes: {
      ...accueil.commandes,
      boutons: {
        ...accueil.commandes.boutons,
        pistes: { ...accueil.commandes.boutons.pistes, choisi: 2 },
        mode: { ...accueil.commandes.boutons.mode, choisi: 1 },
      },
    },
  };
  const auRepos = platine(accueil, disqueAuRepos);
  const enMarche = platine(enJeu, { ...disqueAuRepos, etiquette: { ...disqueAuRepos.etiquette, angle: 137 } });

  // Le vinyle garde ses deux secteurs clairs où ils sont, les corps des boutons leurs facettes claires, le décor ne bouge pas.
  for (const nom of ['disque/vinyle', 'bouton-pistes/corps', 'bouton-mode/corps', 'platine/decor', 'reperes/gravure']) {
    assert.deepEqual(sansRotation(calque(enMarche, nom)), sansRotation(calque(auRepos, nom)), nom);
  }
  // Le bras prend sa lumière une fois pour toutes : à un autre angle, ses facettes ont les mêmes tons. Seules ses transformations changent.
  assert.deepEqual(sansTransformations(calque(enMarche, 'bras')), sansTransformations(calque(auRepos, 'bras')));

  // Seules des rotations de calques diffèrent, et seulement celles des pièces qui ont tourné.
  const avant = rotations(auRepos);
  const changees = [...rotations(enMarche)].filter(([nom, angle]) => avant.get(nom) !== angle).map(([nom]) => nom.split('/')[0]);
  assert.deepEqual([...new Set(changees)].sort(), ['bouton-mode', 'bouton-pistes', 'bras', 'etiquette', 'reperes']);
});

test('tout est en SVG fait de polygones à plat : ni dégradé, ni flou, ni filtre, ni image, ni police à charger', () => {
  const tons = new Set(Object.values(TEINTES).flat());
  let decoupes = 0;
  for (const i of TOUTES_LES_IMAGES) {
    const svg = enSvgDe(i);
    const balises = new Set([...svg.matchAll(/<([a-zA-Z][\w:-]*)/g)].map((m) => m[1]));
    // Des groupes et des polygones ; et, là où une ombre s'arrête au bord de ce qui la reçoit, une découpe, faite d'un polygone elle aussi.
    assert.deepEqual([...balises].filter((balise) => balise !== 'clipPath').sort(), ['g', 'path', 'svg', 'title'], i.fichier);
    const references = [...svg.matchAll(/ clip-path="url\(#([^")]+)\)"/g)].map((m) => m[1]);
    const decoupesEcrites = [...svg.matchAll(/<clipPath id="([^"]+)"><path d="[MLZ\d\s.-]+"\/><\/clipPath>/g)].map((m) => m[1]);
    assert.deepEqual(references, decoupesEcrites, `${i.fichier} : chaque découpe sert, une fois, à ce qui la suit`);
    assert.equal(new Set(decoupesEcrites).size, decoupesEcrites.length, i.fichier);
    decoupes += decoupesEcrites.length;
    const attributs = new Set([...svg.matchAll(/\s([a-zA-Z][\w:-]*)="/g)].map((m) => m[1]));
    const admis = [
      'd',
      'data-calque',
      'data-role',
      'fill',
      'fill-opacity',
      'height',
      'id',
      'opacity',
      'role',
      'stroke',
      'stroke-linejoin',
      'stroke-width',
      'transform',
      'viewBox',
      'width',
      'xmlns',
      'clip-path',
    ];
    assert.deepEqual(
      [...attributs].filter((a) => !admis.includes(a ?? '')),
      [],
      i.fichier,
    );
    // La seule référence d'un SVG est celle d'un groupe à sa découpe.
    assert.doesNotMatch(svg.replace(/ clip-path="url\(#[^")]+\)"/g, ''), /url\(|style=|class=|href=/, i.fichier);
    // Aucune couleur hors des 5 tons de la palette, et le liseré d'une facette a toujours sa propre couleur.
    for (const [, attribut, valeur] of svg.matchAll(/\s(fill|stroke)="([^"]*)"/g)) {
      assert.ok(tons.has(valeur ?? ''), `${i.fichier} : ${attribut}="${valeur}" n'est pas un ton de la palette`);
    }
    for (const [, fond, lisere] of svg.matchAll(/<path fill="([^"]*)" stroke="([^"]*)"/g)) assert.equal(lisere, fond);
    // Les polygones sont des segments de droite : seules les lettres, tracées en contours, ont des courbes.
    const traces = [...svg.matchAll(/<path fill="[^"]*" stroke="[^"]*" d="([^"]*)"/g)].map((m) => m[1] ?? '');
    assert.ok(traces.length > 0 && traces.every((d) => /^[MLZ\d\s.-]+$/.test(d)), `${i.fichier} : une facette n'est pas un polygone`);
    // Un identifiant ne sert qu'une fois.
    const identifiants = [...svg.matchAll(/ id="([^"]*)"/g)].map((m) => m[1]);
    assert.equal(new Set(identifiants).size, identifiants.length, `${i.fichier} : un identifiant sert deux fois`);
  }
  assert.ok(decoupes >= 10, `${decoupes} découpes vérifiées`);
});

test('l’avatar tient en 25 à 60 polygones, quelles que soient sa tête et ce qu’il porte dessus, pour chacune des quatre expressions', () => {
  const pose = { tete: [0, 0], echelle: 1 } as const;
  const base = { peau: 'vieuxRose', cheveux: 'noyerSombre', tenue: 'rougeTomate' } as const;
  for (const tete of Object.keys(TETES) as CleDeTete[])
    for (const dessus of Object.keys(DESSUS) as CleDeDessus[])
      for (const nom of Object.keys(EXPRESSIONS) as NomDExpression[]) {
        const poids = polygones(dessinerLAvatar({ ...base, tete, dessus }, nom, pose));
        assert.ok(poids >= 25 && poids <= 60, `${tete}, ${dessus}, ${nom} : ${poids} polygones`);
      }
  // Les épaules, le cou, les oreilles, la tête, les joues et le nez ne changent pas, ni ce qu'il porte sur la tête :
  // une expression ne touche que la bouche, les yeux et les sourcils.
  const avatars = (Object.keys(EXPRESSIONS) as NomDExpression[]).map((nom) => ({
    nom,
    dessins: dessinerLAvatar({ ...base, tete: 'ronde', dessus: 'courts' }, nom, pose),
  }));
  const commun = 7;
  const [reference, ...autres] = avatars;
  assert.ok(reference !== undefined);
  for (const autre of autres) {
    assert.deepEqual(autre.dessins.slice(0, commun), reference.dessins.slice(0, commun), autre.nom);
    assert.deepEqual(autre.dessins.at(-1), reference.dessins.at(-1), `${autre.nom} : les cheveux ne bougent pas`);
    assert.notDeepEqual(autre.dessins.slice(commun, -1), reference.dessins.slice(commun, -1), `${autre.nom} ne se distingue pas de ${reference.nom}`);
  }
});

test('la pochette de 240 px porte son nom d’artiste et son titre ; la miniature de 48 px n’a que son avatar', () => {
  const { scene } = image('pochette');
  const exemple = pochetteDExemple(TEXTES);
  const textesDe = (nom: string): string[] => dessins(calque(scene, nom)).flatMap((d) => (d.genre === 'texte' ? [d.contenu] : []));
  assert.deepEqual(textesDe('pochette-240'), [exemple.artiste, exemple.album]);
  assert.deepEqual(textesDe('pochette-48'), []);
});

test('tout texte prend un échelon de l’échelle typographique, à l’échelle de l’objet qui le porte', () => {
  const echelons = Object.values(CORPS) as number[];
  const echelles: Record<string, number> = { logo: RAYON_DU_LOGO / PLATINE.disque.etiquette };
  for (const i of TOUTES_LES_IMAGES) {
    const echelle = echelles[i.fichier] ?? 1;
    for (const d of dessins(i.scene)) {
      if (d.genre !== 'texte') continue;
      assert.ok(
        echelons.some((e) => Math.abs(e * echelle - d.corps) < 1e-9),
        `${i.fichier} : « ${d.contenu} » est en corps ${d.corps}`,
      );
    }
  }
});

test('rien n’est écrit sur le meuble qui ne vienne du fichier de textes ou des réglages', () => {
  const feuilles = (valeur: unknown): string[] =>
    typeof valeur === 'string' ? [valeur] : typeof valeur === 'object' && valeur !== null ? Object.values(valeur).flatMap(feuilles) : [];
  const duSite = new Set([...feuilles(TEXTES), ...Object.values(REGLAGES).flatMap((reglage) => reglage.choix.map(String))]);
  // Une phrase à trous du fichier de textes, ses trous remplis par des nombres : « Piste {numero} » donne « Piste 3 ».
  const modeles = feuilles(TEXTES)
    .filter((modele) => /\{\w+\}/.test(modele))
    .map((modele) => new RegExp(`^${modele.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '\\d+')}$`));
  // La pastille du décompte ne montre qu'un chiffre.
  const duDecompte = new Set(CHIFFRES_DU_DECOMPTE.map(String));
  // La vue éclatée, document de travail, porte en plus des légendes : un nom de pièce et son traitement, puis des comptes.
  const deLaPlanche = (contenu: string): boolean =>
    (Object.values(LEGENDES.pieces) as string[]).some((piece) => contenu.startsWith(`${piece} · `)) ||
    /^(ombre · )?\d[\d\u00a0]* polygones?(, \d+ lettres?)?$/.test(contenu);
  let [remplis, enLignes] = [0, 0];
  for (const i of TOUTES_LES_IMAGES) {
    for (const c of calques(i.scene)) {
      const ecrits = c.contenu.flatMap((d) => (d.genre === 'texte' ? [d.contenu] : []));
      // Un texte mis en lignes : des lignes qui se suivent dans un même calque et qui, mises bout à bout, redonnent la phrase du fichier de textes.
      const misEnLignes = new Set<number>();
      for (let de = 0; de < ecrits.length; de++) {
        for (let a = ecrits.length; a > de + 1; a--) {
          if (!duSite.has(ecrits.slice(de, a).join(' '))) continue;
          for (let rang = de; rang < a; rang++) misEnLignes.add(rang);
          enLignes++;
          break;
        }
      }
      ecrits.forEach((contenu, rang) => {
        const rempli = !duSite.has(contenu) && modeles.some((modele) => modele.test(contenu));
        remplis += rempli ? 1 : 0;
        const admis =
          duSite.has(contenu) ||
          rempli ||
          misEnLignes.has(rang) ||
          duDecompte.has(contenu) ||
          (i.fichier === 'platine-eclatee' && deLaPlanche(contenu));
        assert.ok(admis, `${i.fichier} : « ${contenu} » n'est dans aucun fichier de textes`);
      });
    }
  }
  assert.ok(remplis >= 20 && enLignes >= 20, `${remplis} phrases à trous remplies, ${enLignes} textes mis en lignes`);
  assert.ok(!modeles.some((modele) => modele.test('Piste trois')), 'un trou ne se remplit que d’un nombre');
});

test('le logo est une étiquette couleur miel, « Honear » écrit en arc, à l’endroit en haut, entier sur la platine comme en grand', () => {
  for (const fichier of ['logo', 'platine-fine', 'platine-sobre']) {
    const { scene } = image(fichier);
    const etiquette = calque(scene, fichier.startsWith('logo') ? 'logo/etiquette' : 'etiquette');
    const [papier] = dessins(etiquette);
    assert.ok(papier?.genre === 'aplat' && papier.teinte === 'miel', `${fichier} : le papier est couleur miel`);
    const ecrits = dessins(etiquette).flatMap((d) => (d.genre === 'texte' ? [d] : []));
    // Aucun texte de l'étiquette n'a dû être abrégé pour tenir.
    assert.deepEqual(ecrits.map((d) => d.contenu).sort(), Object.values(TEXTES.logo).sort(), fichier);
    const nom = ecrits.find((d) => d.contenu === TEXTES.logo.nom);
    assert.ok(nom?.role === 'titrage', fichier);
    assert.deepEqual([nom.arc?.milieu, nom.arc?.lecture], [-90, 'dessus'], fichier);
  }
});

test('les deux mentions du centre de l’étiquette se tiennent à égale distance du trou, et laissent à l’axe la place de dépasser', () => {
  const capitale = (corps: number): number => corps * HAUTEUR_DE_CAPITALE;
  /** Dans le plan de l'étiquette : du bas de la mention du dessus au centre, et du centre au haut de celle du dessous. */
  const autourDuTrou = (fichier: string): [number, number] => {
    const ecrits = dessins(calque(image(fichier).scene, fichier.startsWith('logo') ? 'logo/etiquette' : 'etiquette')).flatMap((d) =>
      d.genre === 'texte' ? [d] : [],
    );
    const [vitesse, face] = [ecrits.find((d) => d.contenu === TEXTES.logo.vitesse), ecrits.find((d) => d.contenu === TEXTES.logo.face)];
    assert.ok(vitesse !== undefined && face !== undefined, fichier);
    return [-vitesse.en[1], face.en[1] - capitale(face.corps)];
  };
  // La même étiquette partout : sur la platine, soulevée dans la vue éclatée, et en grand sur les logos.
  for (const { fichier } of IMAGES.filter((i) => i.fichier !== 'pochette')) {
    const [dessus, dessous] = autourDuTrou(fichier);
    assert.ok(Math.abs(dessus - dessous) < 1e-9 && dessus > 0, `${fichier} : ${dessus.toFixed(2)} au-dessus, ${dessous.toFixed(2)} au-dessous`);
  }
  // Sur la platine, l'axe dépasse vers le haut de l'écran : il reste au moins 6 px, tels qu'on les voit, entre lui et la mention du dessus.
  const [dessus] = autourDuTrou('platine-fine');
  const sommetDeLAxe = PLATINE.axe.depassement + surLEcran([0, PLATINE.axe.rayon])[1];
  const libre = surLEcran([0, dessus])[1] - sommetDeLAxe;
  assert.ok(libre >= 6, `${libre.toFixed(1)} px entre l'axe et « ${TEXTES.logo.vitesse} »`);
});

test('sous chaque densité, le même détail grossi trois fois : la même scène, regardée de plus près, sans rien redessiner', () => {
  const details = detailsDesDensites(IMAGES);
  assert.deepEqual(
    details.map((d) => d.fichier),
    ['detail-fine', 'detail-sobre'],
  );
  const [premier] = details;
  assert.ok(premier !== undefined);
  for (const detail of details) {
    const platine = image(detail.fichier.replace('detail', 'platine'));
    assert.equal(detail.scene, platine.scene, 'c’est la scène de la platine, pas une copie');
    assert.deepEqual([detail.regard.largeur, detail.regard.hauteur, detail.echelle], [premier.regard.largeur, premier.regard.hauteur, 3]);
    assert.deepEqual(detail.regard.origine, premier.regard.origine, 'les trois détails montrent le même endroit');
    // Le détail est pris dans le cadre du téléphone, et s'affiche à la largeur de ce cadre.
    const [x, y] = [detail.regard.origine[0] - platine.regard.origine[0], detail.regard.origine[1] - platine.regard.origine[1]];
    assert.ok(x >= 0 && y >= 0 && x + detail.regard.largeur <= platine.regard.largeur && y + detail.regard.hauteur <= platine.regard.hauteur);
    assert.equal(detail.regard.largeur * 3, platine.regard.largeur);
    const svg = enSvg(detail.scene, { ...detail.regard, echelle: 3, tracerLeTexte: ENCRIER.tracer, titre: detail.titre });
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d.-]+ [\d.-]+ 130 130" width="390" height="390" role="img">/);
  }
});
