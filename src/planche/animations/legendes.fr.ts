/**
 * Ce que la planche d'animations dit de chacune quand on l'interrompt : l'état qui change en route, en une phrase. Ce qui bouge
 * repart alors d'où il est, avec sa vitesse ; rien ne saute.
 */

export const INTERRUPTIONS = {
  arrivee:
    'Un joueur quitte le salon pendant qu’elle arrive : sa pochette s’en va, l’éventail se refait, et elle file vers sa nouvelle place sans repartir du bord.',
  bonneReponse: 'Le titre est trouvé tout de suite : la seconde pastille tombe pendant que la pochette encaisse encore la première.',
  presque: 'On se remet à taper pendant qu’elle reste : elle se décolle tout de suite, et file d’où elle est.',
  choix: 'La révélation tombe pendant qu’elles arrivent : les trois mauvaises repartent d’où elles sont, sans finir leur entrée.',
  vraie: 'La piste est remise en arrière pendant qu’elle sort : elle retourne sous la kraft, d’où elle est.',
  deconnexion: 'Le joueur revient pendant qu’elle se retourne : elle repart côté face, d’où elle est, avec son élan.',
  hitParade: 'Un joueur quitte la partie pendant qu’elles se rangent : sa pochette s’en va, celles d’en dessous remontent d’une place.',
  finale: 'On touche « Rejouer la face B » pendant que le diamant descend : les trois disques remontent, d’où ils sont.',
  ampli: 'On l’éteint pendant que les aiguilles montent : l’interrupteur revient en deux temps, les aiguilles retombent d’où elles sont.',
  volume: 'Le doigt repart en arrière : le bouton le suit, de cran en cran, jusqu’au premier.',
  commandes: 'On revient sur Libre avant qu’il ne se pose : il repart d’où il est, et l’interrupteur du son revient sur « Tous ».',
  regard: 'On touche la platine pendant qu’il glisse vers l’ampli : il repart vers elle d’où il est, avec sa vitesse.',
  bac: 'On change d’avis pendant qu’elle monte : elle redescend dans le bac, d’où elle est.',
} as const;
