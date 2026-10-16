/**
 * Les textes des images de la vitrine : celles du README, sur GitHub. Ils ne sont pas ceux du site : ils présentent le projet à
 * qui le découvre. Les mesures, en px de la scène, disent où chaque chose se pose dans son image.
 */

import type { Pochette } from '../../ressources/pochettes';

export const LEGENDES_DE_LA_VITRINE = {
  banniere: {
    titre: 'Le blind test entre potes, sur un meuble hi-fi en noyer',
    nom: 'Honear',
    accroche: 'LE BLIND TEST ENTRE POTES',
    lignes: ['Un écran pour la tablée, un téléphone chacun,', 'et des extraits de 30 secondes à reconnaître.'],
    enLigne: 'En ligne',
    /** Le cadre autour de la platine, et ce qu'il laisse au texte à sa droite. */
    marge: 36,
    largeurDuTexte: 560,
    ecart: 28,
  },
  bandeaux: {
    hauteur: 132,
    largeur: 1280,
    faceA: { fichier: 'bandeau-face-a', titre: 'Face A, le jeu', lettre: 'A', nom: 'Face A', sous: 'LE JEU' },
    faceB: { fichier: 'bandeau-face-b', titre: 'Face B, les coulisses', lettre: 'B', nom: 'Face B', sous: 'LES COULISSES' },
    cachee: {
      fichier: 'bandeau-piste-cachee',
      titre: 'Piste cachée : comment je l’ai construit',
      lettre: '+1',
      nom: 'Piste cachée',
      sous: 'COMMENT JE L’AI CONSTRUIT',
    },
  },
  joueurs: { fichier: 'pochettes-des-joueurs', titre: 'Chacun sa pochette, son avatar et son nom d’artiste', combien: 6 },
  /** Les trois pochettes des coulisses : ce que le projet montre, chacun son disque. */
  coulisses: [
    {
      fichier: 'pochette-production',
      pochette: {
        artiste: 'Mise en prod',
        album: 'Docker durci, RGPD',
        fond: 'bleuPetrole',
        motif: 'rayons',
        avatar: { tete: 'ronde', dessus: 'casque', peau: 'vieuxRose', cheveux: 'noyerSombre', tenue: 'miel' },
      },
    },
    {
      fichier: 'pochette-code',
      pochette: {
        artiste: 'Tests au vert',
        album: '539 tests, TypeScript strict',
        fond: 'olive',
        motif: 'damier',
        avatar: { tete: 'carree', dessus: 'casquette', peau: 'kraft', cheveux: 'expresso', tenue: 'rougeTomate' },
      },
    },
    {
      fichier: 'pochette-temps-reel',
      pochette: {
        artiste: 'Tous en rythme',
        album: 'WebSocket, une seule horloge',
        fond: 'orangeBrule',
        motif: 'cercles',
        avatar: { tete: 'ovale', dessus: 'chignon', peau: 'alu', cheveux: 'lilasFume', tenue: 'bleuPetrole' },
      },
    },
  ] satisfies readonly { readonly fichier: string; readonly pochette: Pochette }[],
  pastilles: {
    fichier: 'pastilles',
    titre: 'Les chiffres du projet',
    mots: ['539 tests', 'TS strict', 'Zéro any', '196 images', 'RGPD'],
    largeur: 980,
    hauteur: 170,
  },
  touche: { fichier: 'touche-jouer', titre: 'On pose un disque ? Jouer sur honear.fr' },
  fin: { fichier: 'face-b', titre: 'Honear, face B : enregistré entre potes', face: 'Face B' },
} as const;
