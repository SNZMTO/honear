/**
 * Ce que dit la page du prototype autour du téléphone : son titre, comment on y joue, ses réglages, ce que montre le téléphone
 * à chaque instant (pour qui ne le voit pas). Et ce que le prototype a de plus que le jeu : le code que tape son clavier.
 */

export const LEGENDES_DU_PROTOTYPE = {
  nom: 'Le prototype de Honear',
  titre: 'Une partie, de bout en bout',
  sousTitre: 'Le téléphone de l’hôte, cinq potes simulés, et un serveur qui tourne dans la page',
  intro:
    'Tu es l’hôte : pose un disque, fais ta pochette, choisis la playlist, ouvre le salon. Les potes arrivent. Allume l’ampli, lance la face A. Trois pistes, le hit-parade entre chacune, la finale, puis la face B.',
  clavier:
    'Pendant une piste, touche l’étiquette vierge : le clavier tape ce que le scénario a prévu pour toi, puis l’envoie. En 4 choix, touche l’étiquette de ton choix.',
  sansSon: 'Pas de son : le bras et le disque disent la musique.',
  court: 'Partie courte : trois pistes par face, quel que soit le bouton « Pistes » de la platine.',
  frontieres:
    'Le téléphone ne parle qu’au serveur, par les messages du jeu : le jour où le vrai serveur arrive, on le branche à la place de celui-ci.',
  reglage: { groupe: 'Le jeu', libre: 'Saisie libre', quatreChoix: '4 choix', recommencer: 'Recommencer' },
  telephone: 'Le téléphone de l’hôte',
  /** Ce que montre le téléphone, par écran. */
  ecrans: {
    accueil: 'L’accueil',
    saisie: 'La saisie du code',
    compte: 'Le compte',
    pochette: 'Fais ta pochette',
    bac: 'Le bac des playlists',
    reglages: 'Les réglages de la platine',
    salon: 'Le salon',
    ampli: 'L’ampli, de près',
    piste: 'Une piste',
    hitParade: 'Le hit-parade',
    finale: 'La finale',
    titres: 'Les titres joués',
  },
  /** Ce que tape le clavier du prototype sur l'étiquette du code : une room que personne n'a ouverte. */
  codeTape: 'FUNK',
  /** Le nom d'artiste que le clavier du prototype tape sur « Fais ta pochette ». */
  nomTape: 'MC Prototype',
  /** La graine des pochettes tirées au sort sur le téléphone, et celle des codes de room du serveur. */
  graines: { pochettes: 2026, codes: 1987 },
} as const;
