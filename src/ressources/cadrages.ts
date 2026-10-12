/**
 * Les cadrages : où le regard s'arrête sur le meuble, pour chaque format d'écran.
 * La scène ne change pas d'échelle : on se déplace dessus.
 */

export const CADRAGES = {
  telephone: {
    largeur: 390,
    hauteur: 844,
    /**
     * Regard posé sur la platine : elle occupe la moitié haute, le disque sort du cadre par la gauche,
     * l'étiquette et la course du bras restent dedans. Marges entre le socle et les bords de l'écran, en px.
     */
    platine: { aDroite: 18, enHaut: 27 },
  },
  /**
   * L'écran de l'hôte, en grand : un portable ou une télé, regardé depuis le canapé. On y voit le meuble entier d'un seul regard,
   * du bac à l'ampli, centré ; la kraft devant la platine, et la tablée devant le bac. Le haut du cadre, en px de la scène.
   */
  hote: { largeur: 1440, hauteur: 900, haut: -40 },
} as const;
