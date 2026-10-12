/**
 * Les mots de la planche « L'écran de l'hôte » (étape 6), à part des textes du site : c'est un document de travail.
 * Et les instants qu'on y arrête, en secondes sur l'horloge de la séance de l'atelier.
 */

export const LEGENDES_DE_L_HOTE = {
  nom: 'L’écran de l’hôte',
  titre: 'L’écran de l’hôte, en grand',
  sousTitre: 'Étape 6 de Honear : le meuble entier d’un seul regard, en 1440 × 900, lisible depuis le canapé',
  texte:
    'Le portable ou la télé de l’hôte, quand le son ne passe que par lui. Le regard ne glisse jamais : le bac à gauche, la platine au milieu, l’ampli à droite, la kraft devant la platine. La tablée se pose devant le bac : les pochettes de tous, en deux rangs, dans l’ordre du classement ; leurs pastilles sont plus grandes qu’au téléphone. On y lit le code, le lien, la piste, les points et la réponse de loin. C’est la même partie que celle des écrans du téléphone, au même instant.',
  /** Les instants : l'extrait bat son plein (en secondes après son départ) ; la réponse est sur le verso du disque (sur l'horloge de la séance). */
  instants: { apresLExtrait: 2.8, reponse: 17.9 },
  images: {
    salon: 'Le salon d’attente',
    piste: 'La piste en cours, en saisie libre',
    quatreChoix: 'La piste en cours, en 4 choix',
    revelation: 'La révélation',
    hitParade: 'Le hit-parade',
    finale: 'La finale',
  },
} as const;
