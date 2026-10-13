/**
 * L'écran « Fais ta pochette », au téléphone : en haut, la pochette, en grand ; dessous, l'étiquette vierge où s'écrit le nom
 * d'artiste, avec l'album ; dans la zone du pouce, « Au hasard » et « C'est moi ». Une seule action principale, une seule à côté :
 * on tire au sort jusqu'à ce qu'elle plaise. Le regard se pose à côté de la platine, sur le bois nu.
 */

import { rectangleArrondi, trait } from '../../lowpoly/contours';
import { placer } from '../../lowpoly/polygones';
import { TON_DE_BASE } from '../../lowpoly/tons';
import type { Vec2 } from '../../lowpoly/vecteurs';
import { DESSUS, TETES, type Avatar, type ChoixDeLAvatar } from '../../ressources/avatar';
import { CADRAGES } from '../../ressources/cadrages';
import type { Pochette } from '../../ressources/pochettes';
import { TABLEE } from '../../ressources/tablee';
import { CORPS, HAUTEUR_DE_CAPITALE } from '../../ressources/typo';
import { aplat, aPlatSurLeMeuble, type Calque, type Texte } from '../calque';
import { surLeBois, type Regard } from '../meuble';
import { ombreAuPied } from '../ombre';
import { dessinerLaPochette } from '../pochette';
import type { Encrier } from '../rendu/texte';
import { faireTenir } from '../texte';
import { dessinerUneTouche } from '../touche';
import { DENSITE, papier, type Ecritoire, type VueDuTelephone } from './pieces';

const P = TABLEE.telephone.pochette;

/** Les options de chaque choix de l'avatar, dans l'ordre de l'écran. */
export const CLES_DES_CHOIX: Readonly<Record<ChoixDeLAvatar, readonly string[]>> = { tete: Object.keys(TETES), dessus: Object.keys(DESSUS) };

/** Le regard de l'écran : à côté de la platine, à la taille du téléphone. */
export const REGARD_DE_LA_POCHETTE: Regard = { origine: P.origine, largeur: CADRAGES.telephone.largeur, hauteur: CADRAGES.telephone.hauteur };

/**
 * L'étiquette vierge du nom d'artiste : un papier crème posé sur le bois, le nom écrit dessus, le curseur au bout ; l'album dessous.
 * Elle est taillée à ce qu'elle porte, jusqu'à sa largeur au plus : son bord gauche reste en place, elle s'allonge vers la droite.
 */
function etiquetteVierge(regard: Regard, pochette: Pochette, encrier: Encrier, tonNom: string): Calque[] {
  const E = P.etiquette;
  const utile = E.largeur - 2 * E.marge;
  // Tant qu'on n'y a rien tapé, elle dit ce qu'on y tape.
  const nom = faireTenir(
    encrier.largeur,
    { contenu: pochette.artiste.trim() !== '' ? pochette.artiste : tonNom, role: 'titrage' },
    utile - 8,
    'titre',
  );
  const album = faireTenir(encrier.largeur, { contenu: pochette.album, role: 'technique' }, utile, 'mention');
  const largeurDuNom = encrier.largeur({ contenu: nom.contenu, role: 'titrage', corps: nom.corps }) + 4 + 1.8;
  const largeurDeLAlbum = encrier.largeur({ contenu: album.contenu, role: 'technique', corps: album.corps });
  const largeur = Math.min(E.largeur, Math.max(largeurDuNom, largeurDeLAlbum) + 2 * E.marge);
  const hauteur = E.marge + nom.corps * HAUTEUR_DE_CAPITALE + CORPS.mention + album.corps * HAUTEUR_DE_CAPITALE + E.marge;
  const bord = surLeBois(regard, E.centre[0] - E.largeur / 2, E.centre[1]);
  const centre: Vec2 = [bord[0] + largeur / 2, bord[1]];
  const papier = placer(rectangleArrondi(-largeur / 2, -hauteur / 2, largeur, hauteur, 5, 3), { en: centre, angle: E.angle });
  const gauche = centre[0] - largeur / 2 + E.marge;
  const ligne = (contenu: string, role: Texte['role'], corps: number, y: number): Texte => ({
    genre: 'texte',
    contenu,
    role,
    corps,
    en: [gauche, y],
    ancrage: 'debut',
    teinte: 'expresso',
    ton: TON_DE_BASE,
    fond: { teinte: 'creme' },
  });
  const yNom = centre[1] - hauteur / 2 + E.marge + nom.corps * HAUTEUR_DE_CAPITALE;
  const finDuNom = gauche + encrier.largeur({ contenu: nom.contenu, role: 'titrage', corps: nom.corps }) + 4;
  return [
    ombreAuPied('etiquette-vierge/ombre', { silhouettes: [papier], hauteur: 0.6, support: 0, paliers: 2 }),
    // Une étiquette qu'on corrige au clavier : quand son texte change, l'écran est redessiné ; elle est dans le décor.
    {
      ...aPlatSurLeMeuble('etiquette-vierge', 0.6, [
        aplat([papier], 'creme', 3),
        ligne(nom.contenu, 'titrage', nom.corps, yNom),
        // Le curseur, au bout du nom : on peut le corriger.
        aplat(
          [
            trait(
              [
                [finDuNom, yNom + 2],
                [finDuNom, yNom - nom.corps * 0.82],
              ],
              1.8,
            ),
          ],
          'miel',
          1,
        ),
        ligne(album.contenu, 'technique', album.corps, yNom + CORPS.mention + album.corps * HAUTEUR_DE_CAPITALE),
      ]),
      role: 'decor',
    },
  ];
}

/** La pochette qu'on obtient en touchant l'option de ce rang, sur le choix ouvert : la même, ce choix changé. */
export function pochetteAvecLOption(pochette: Pochette, choisi: ChoixDeLAvatar, rang: number): Pochette {
  const cle = CLES_DES_CHOIX[choisi][rang];
  return cle === undefined ? pochette : { ...pochette, avatar: { ...pochette.avatar, [choisi]: cle } as Avatar };
}

/**
 * L'écran, simple : la pochette en grand, l'étiquette où l'on tape son nom d'artiste, « Au hasard » pour en tirer une autre, et
 * « C'est moi ». Au bout, comme à la saisie du code, « Retour » ramène à l'étape d'avant ; quand on la refait (à l'accueil, dans
 * la room), c'est la touche qui la laisse comme elle était.
 * @param _choisi le choix de l'avatar ouvert : l'écran ne montre plus les options, la mémoire le garde.
 * @param sansNom on a touché « C'est moi » sans avoir écrit son nom : un papier le réclame, sous l'étiquette.
 */
export function vueDeLaPochette(a: Ecritoire, pochette: Pochette, _choisi: ChoixDeLAvatar, retouche = false, sansNom = false): VueDuTelephone {
  const regard = REGARD_DE_LA_POCHETTE;
  const ici = (p: readonly [number, number]): Vec2 => surLeBois(regard, p[0], p[1]);
  const T = a.textes.touches;
  const textes = a.textes.pochette;

  const grande = dessinerLaPochette(
    pochette,
    { nom: 'pochette-ecran', centre: ici(P.pochette.en), angle: P.pochette.angle, taille: P.pochette.taille, expression: 'content' },
    a.encrier.largeur,
  );
  const toucher = (nom: `touche-${string}`, genre: 'principale' | 'secondaire' | 'cran', libelle: string, p: readonly [number, number]): Calque =>
    dessinerUneTouche({ nom, genre, libelle, centre: ici(p), support: 0, etat: 'repos' }, DENSITE, a.encrier.largeur);

  return {
    regard,
    objets: [
      grande.ombre,
      grande.pochette,
      ...etiquetteVierge(regard, pochette, a.encrier, textes.tonNom),
      ...(sansNom
        ? papier(
            'etiquette-message',
            regard,
            P.sansNom.en,
            P.sansNom.largeur,
            1.5,
            [{ contenu: textes.nomDAbord, role: 'titrage', auPlus: 'intertitre' }],
            a.encrier,
            {
              ancre: 'milieu',
            },
          ).calques
        : []),
      toucher('touche-hasard', 'secondaire', textes.auHasard, P.auHasard),
      toucher('touche-c-est-moi', 'principale', T.cEstMoi, P.cEstMoi),
      retouche
        ? toucher('touche-laisser', 'secondaire', textes.laisser, P.retour)
        : toucher('touche-revenir', 'secondaire', a.textes.partie.retour, P.retour),
    ],
  };
}
