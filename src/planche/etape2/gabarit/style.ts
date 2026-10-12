/**
 * La feuille de style de la page de l'atelier. Deux mises en page. « En colonne », sur un téléphone ou une tablette debout :
 * la scène à gauche dans son cadre, la façade en colonne à sa droite, et le reste dessous. « De bureau », sur un écran large
 * ou un téléphone couché : la scène à gauche dans une coque de téléphone, et tout le reste à sa droite.
 * On n'y anime que des transformations ; ni dégradé, ni flou, ni halo.
 */

import { couleur } from '../../../lowpoly/tons';
import { CADRAGES } from '../../../ressources/cadrages';
import { TOUCHES } from '../../../ressources/mouvement';
import { APPROCHES, CARACTERES, CORPS, ROLES_DE_TEXTE } from '../../../ressources/typo';
import { ANCRES } from '../ancres';

const { largeur: LARGEUR, hauteur: HAUTEUR } = CADRAGES.telephone;
const { titrage, technique, techniqueFort } = CARACTERES;

/** La mise en page, en px. */
export const PAGE = {
  /** Marge entre le texte et les bords de l'écran. */
  gouttiere: 16,
  /** Sur le premier écran, la marge autour du cadre : serrée, pour laisser à la scène toute la place. */
  serre: 8,
  /** La ligne où l'atelier dit où en est la séance, sous le cadre : sa hauteur. */
  dit: 22,
  /**
   * Une petite fenêtre, en colonne : en deçà de cette hauteur, ou de cette largeur, le cadre est trop étroit pour qu'une réponse
   * tienne sur une ligne. La ligne d'état en a alors deux, de cette hauteur chacune.
   */
  petiteFenetre: { hauteur: 600, largeur: 339, ligne: 18 },
  /** Une touche : la hauteur de ce qu'on vise du doigt, et ce que sa tranche dépasse sous elle quand elle est relevée. */
  touche: 44,
  tranche: TOUCHES.course + 1,
  /** Entre deux touches côte à côte, entre deux touches l'une sous l'autre, entre deux groupes de touches. */
  entreTouches: 5,
  entreRangs: 8,
  entreGroupes: 14,
  /** L'inscription gravée au-dessus d'un groupe de touches : sa hauteur, et ce qui la sépare des touches. */
  gravure: { hauteur: 14, dessous: 4 },
  /**
   * La façade en colonne : sa largeur au plus étroit (ce qu'il faut à « Révélation », gravé petit, et à ses marges),
   * et sa marge de chaque côté des touches. Au plus large, elle fait avec le cadre la largeur de la colonne du texte.
   */
  colonne: { auMoins: 82, marge: 6 },
  /** En rangs, une touche ne s'étire pas au-delà : un groupe seul sur son rang garde des touches de touche. */
  toucheAuPlus: 128,
  /** Largeur d'écran à partir de laquelle la colonne est assez large pour graver ses touches au corps des mentions. */
  graverPlusGros: 504,
  /** La marge autour de la scène, en mise en page de bureau, et l'épaisseur de la coque de téléphone qu'on y dessine. */
  marge: 24,
  coque: 8,
  /** Largeur d'écran à partir de laquelle on passe à la mise en page de bureau ; et celle à partir de laquelle les tables tiennent en colonnes. */
  bureau: 940,
  tablesEnColonnes: 1100,
  /** Un écran nettement plus large que haut y passe aussi, dès cette largeur : c'est un téléphone couché, s'il est moins haut que cela. */
  bureauCouche: 560,
  couche: 520,
  /** Hauteur à partir de laquelle la façade reste en vue, en mise en page de bureau, pendant qu'on lit la suite. */
  facadeEnVue: 600,
  /** La largeur que la colonne du texte ne dépasse pas. */
  colonneDeTexte: 620,
  /** Ce qui sépare deux parties de la page, l'une sous l'autre ; et ce qu'on laisse sous la dernière, en colonne. */
  entreParties: 36,
  pied: 56,
  /** Le rayon des coins du cadre, à sa taille de téléphone : il se réduit avec lui. */
  coinDuCadre: 36,
  /** Le contour qui dit où est le clavier : son épaisseur, et ce qui le sépare de la touche. Il tient dans l'écart entre deux touches. */
  clavier: { trait: 2, ecart: 1 },
  /** La colonne où la liste des temps range l'heure de chaque départ, quand elle a la sienne : la plus longue y tient sur une ligne. */
  colonneDesHeures: 136,
} as const;

/**
 * Les couleurs de la page, par le nom de leur variable de style : toutes des tons de la palette du site.
 * La nuit est le fond de la page ; la sourdine, son texte secondaire ; la gravure, les inscriptions de la façade.
 */
export const COULEURS = {
  nuit: couleur('vinyle', 1),
  laque: couleur('laque'),
  'laque-sombre': couleur('laque', 0),
  creme: couleur('creme'),
  sourdine: couleur('alu'),
  gravure: couleur('creme', 1),
  miel: couleur('miel'),
  'miel-tranche': couleur('miel', 0),
  encre: couleur('expresso'),
  touche: couleur('creme', 3),
  'touche-tranche': couleur('alu', 1),
  'touche-eteinte': couleur('alu', 0),
  'touche-eteinte-tranche': couleur('noyerSombre', 1),
  'voyant-tranche': couleur('vinyle', 0),
  filet: couleur('noyerSombre'),
  bois: couleur('noyerSombre'),
  coque: couleur('expresso', 3),
} as const;

const P = PAGE;
/** La largeur du premier écran quand le cadre a toute sa taille et la colonne toute la sienne : celle de la colonne du texte, leurs bords s'alignent. */
const PREMIER_ECRAN_AU_PLUS = P.colonneDeTexte;
/** Ce que le cadre et ses marges prennent du premier écran, à sa taille de téléphone. */
const CADRE_ET_MARGES = LARGEUR + 2 * P.serre;
/** La largeur du cadre par px de sa hauteur. */
const RAPPORT = LARGEUR / HAUTEUR;
/** Ce que la vitrine met autour du cadre, en hauteur, dans chaque mise en page : ses marges et la ligne d'état, et la coque en plus au bureau. */
const AUTOUR = { enColonne: 2 * P.serre + P.dit, auBureau: 2 * P.marge + P.dit + 2 * P.coque } as const;

/**
 * Un écran nettement plus large que haut : à partir de ce rapport, c'est la mise en page de bureau, dès la largeur d'un téléphone
 * couché. Juste en deçà, il ne l'est pas : c'est encore la mise en page en colonne.
 */
const LARGE = '5/4';
const PAS_LARGE = '1249/1000';
/** Les fenêtres de la mise en page de bureau ; et, parmi celles de la mise en page en colonne, les petites. */
const DE_BUREAU_SI = `(min-width:${P.bureau}px),(min-width:${P.bureauCouche}px) and (min-aspect-ratio:${LARGE})`;
const PETITE_EN_COLONNE = [
  `(max-width:${P.petiteFenetre.largeur}px)`,
  `(max-width:${P.bureauCouche - 1}px) and (max-height:${P.petiteFenetre.hauteur}px)`,
  `(max-width:${P.bureau - 1}px) and (max-height:${P.petiteFenetre.hauteur}px) and (max-aspect-ratio:${PAS_LARGE})`,
].join(',');

const ms = (secondes: number): string => `${Math.round(secondes * 1000)}ms`;
/** Un espacement de grille, écrit aussi sous son ancien nom : les navigateurs d'il y a cinq ans ne lisent pas tous le nouveau. */
const entreColonnes = (px: number): string => `grid-column-gap:${px}px;column-gap:${px}px`;
const entreLignes = (px: number): string => `grid-row-gap:${px}px;row-gap:${px}px`;

/** Les polices de la page, embarquées : on ne les demande à personne, et rien ne s'écrit dans une autre en les attendant. */
function polices(enBase64: Readonly<Record<string, string>>): string {
  return ROLES_DE_TEXTE.map((role) => CARACTERES[role])
    .map((caractere) => {
      const code = enBase64[caractere.web];
      if (code === undefined) throw new Error(`La police ${caractere.web} manque à la page.`);
      return `@font-face{font-family:'${caractere.famille}';font-weight:${caractere.graisse};font-display:block;src:url(data:font/woff2;base64,${code}) format('woff2')}`;
    })
    .join('\n');
}

/** Une inscription gravée : en capitales espacées, comme sur le socle de la platine. */
const GRAVE = `font-weight:${techniqueFort.graisse};letter-spacing:${APPROCHES.techniqueFort}em;text-transform:uppercase`;

/** Ce qui ne sert à rien sans la scène : ses touches, ce qu'elle dit, leur mode d'emploi, la consigne du chapeau, les avis, et ce qu'on y mesure sur le vif. */
const SANS_LA_SCENE = ['.facade', '.dit', '.avis', '.mode-d-emploi', '.consigne', '.sur-le-vif'] as const;

/**
 * La page quand la scène ne peut pas se montrer : le cadre se réduit à son message, en tête de la colonne du texte,
 * et ce qui ne sert plus se retire.
 * @param etabli le sélecteur de l'établi en panne : sa classe de panne, ou lui seul quand toute la page l'est (sans script).
 * @param message le message à montrer dans le cadre.
 */
export const reglesDePanne = (etabli: string, message: string): string =>
  `${etabli} ${message}{display:block}
${SANS_LA_SCENE.map((selecteur) => `${etabli} ${selecteur}`).join(',')}{display:none}
${etabli}{display:flex;flex-direction:column;align-items:center;padding:0 var(--gouttiere) ${P.pied}px}
${etabli}>*,${etabli} .premier-ecran{width:100%;max-width:${P.colonneDeTexte}px}
${etabli} .premier-ecran,${etabli} .vitrine,${etabli} .place,${etabli} .poste{display:block}
${etabli} .vitrine,${etabli} .place{position:static;height:auto;min-height:0;max-height:none}
${etabli} .vitrine{padding:${P.gouttiere}px 0 0}
${etabli} .cadre{width:auto;height:auto;aspect-ratio:auto;border:0;border-radius:12px}
${etabli} .entete{margin-top:${P.entreParties}px}`;

/** Une touche de platine, ses états, et son clavier. */
const TOUCHE = `
/* Une touche de platine : ${TOUCHES.course} px de course, ${ms(TOUCHES.enfonce)} pour s'enfoncer, ${ms(TOUCHES.remonte)} pour remonter, arrêt net. Sa tranche part droit vers le bas :
   c'est un second plan sous sa face, qui reste où il est pendant qu'elle descend. On n'anime que des transformations, et rien au survol. */
.touche{--face:var(--touche);--tranche:var(--touche-tranche);position:relative;isolation:isolate;-webkit-appearance:none;appearance:none;display:flex;align-items:center;justify-content:center;min-width:0;min-height:${P.touche}px;margin:0;padding:9px 5px 8px;border:0;border-radius:3px;background:none;color:var(--encre);font-family:var(--technique);font-size:${CORPS.gravure}px;line-height:1.1;${GRAVE};text-align:center;white-space:nowrap;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;scroll-margin:${P.entreRangs}px;transition:transform ${ms(TOUCHES.remonte)} linear}
.touche::before,.touche::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;z-index:-1;border-radius:inherit}
.touche::before{background:var(--tranche);transform:translateY(${P.tranche}px);transition:transform ${ms(TOUCHES.remonte)} linear}
.touche::after{background:var(--face)}
.touche:active,.touche[aria-pressed="true"],.touche[aria-disabled="true"],.touche.${ANCRES.choisi}{transform:translateY(${TOUCHES.course}px);transition-duration:${ms(TOUCHES.enfonce)}}
.touche:active::before,.touche[aria-pressed="true"]::before,.touche[aria-disabled="true"]::before,.touche.${ANCRES.choisi}::before{transform:translateY(${P.tranche - TOUCHES.course}px);transition-duration:${ms(TOUCHES.enfonce)}}
/* La touche maîtresse : celle qui lance la piste. */
.touche.maitresse{--face:var(--miel);--tranche:var(--miel-tranche)}
/* Un poussoir enclenché, un cran choisi : enfoncés, et allumés comme un voyant, sombres et cerclés de miel. */
.touche[aria-pressed="true"],.touche.${ANCRES.choisi}{--face:var(--encre);--tranche:var(--voyant-tranche);color:var(--miel)}
.touche[aria-pressed="true"]::after,.touche.${ANCRES.choisi}::after{border:2px solid var(--miel)}
/* Une touche éteinte : enfoncée, sombre, et sans effet. Elle garde sa place sous le clavier. */
.touche[aria-disabled="true"]{--face:var(--touche-eteinte);--tranche:var(--touche-eteinte-tranche);cursor:default}
.touche:focus{outline:${P.clavier.trait}px solid var(--miel);outline-offset:${P.clavier.ecart}px}
.touche:focus:not(:focus-visible){outline:none}
/* Un cran est un bouton radio sous un libellé : c'est lui la touche, et c'est lui qui montre où est le clavier. Le bouton radio
   le couvre sans se voir : quand le clavier y arrive, c'est toute la touche que le navigateur amène à l'écran. */
.touche input{position:absolute;top:0;left:0;width:100%;height:100%;margin:0;opacity:0;pointer-events:none;scroll-margin:${P.entreRangs}px}
.touche input:focus+span::after{content:"";position:absolute;top:-${P.clavier.trait + P.clavier.ecart}px;right:-${P.clavier.trait + P.clavier.ecart}px;bottom:-${P.clavier.trait + P.clavier.ecart}px;left:-${P.clavier.trait + P.clavier.ecart}px;border:${P.clavier.trait}px solid var(--miel);border-radius:5px}
.touche input:focus:not(:focus-visible)+span::after{display:none}
@media (prefers-reduced-motion:reduce){.touche,.touche::before{transition:none}}
/* Une colonne assez large : ses touches sont gravées au corps des mentions. */
@media (min-width:${P.graverPlusGros}px){.touche{font-size:${CORPS.mention}px}}
/* Quand l'appareil impose ses couleurs, une touche n'a plus ni face ni tranche : son bord dit ce qu'elle est, et où elle en est. */
@media (forced-colors:active){
  .touche::before,.touche::after{display:none}
  .touche{border:1px solid ButtonText}
  .touche[aria-pressed="true"],.touche.${ANCRES.choisi}{border:3px solid Highlight;color:Highlight}
  .touche[aria-disabled="true"]{border:1px dashed GrayText;color:GrayText}
  .cadre{border:1px solid CanvasText}
}`;

/** La mise en page en colonne : celle d'un téléphone, et de tout écran plus haut que large. C'est celle par défaut. */
const EN_COLONNE = `
/* L'établi, en colonne : le premier écran d'abord (la scène et sa façade), puis le titre et le reste, dans une colonne de texte. */
.etabli{display:flex;flex-direction:column;align-items:center;padding:0 var(--gouttiere) ${P.pied}px}
.etabli>*{min-width:0;width:100%;max-width:${P.colonneDeTexte}px}
.entete,.etabli>section{margin-top:${P.entreParties}px}

/* Le premier écran va d'un bord à l'autre : la vitrine à gauche, qui reste en vue tant qu'on fait défiler la façade ; la façade à droite,
   en colonne. La colonne garde sa largeur la plus étroite tant que le cadre n'a pas toute sa taille, puis prend ce qui reste. */
.premier-ecran{order:-1;display:grid;grid-template-columns:minmax(0,1fr) ${P.colonne.auMoins}px;grid-template-columns:minmax(0,1fr) clamp(${P.colonne.auMoins}px,calc(100% - ${CADRE_ET_MARGES}px),${PREMIER_ECRAN_AU_PLUS - CADRE_ET_MARGES}px);align-items:start;width:calc(100% + 2 * var(--gouttiere));max-width:${PREMIER_ECRAN_AU_PLUS}px}

/* La vitrine : la place de la scène, et sous elle ce que l'atelier dit de la séance. Elle tient dans l'écran, jamais plus haute
   que le cadre à sa taille de téléphone. */
.vitrine{position:sticky;top:0;display:flex;flex-direction:column;min-width:0;height:100vh;height:100svh;max-height:${HAUTEUR + AUTOUR.enColonne}px;padding:${P.serre}px}
/* La place, et le cadre de téléphone que le script y ajuste : il lui donne sa largeur, la plus grande qui tienne. Avant lui, le cadre prend celle qu'il trouve. */
.place{flex:1 1 0;min-height:0;display:flex;justify-content:center;align-items:flex-start}
.poste{flex:none;display:flex;flex-direction:column;max-width:100%}
.cadre{position:relative;overflow:hidden;flex:none;width:${LARGEUR}px;width:var(${ANCRES.largeurDuCadre},${LARGEUR}px);max-width:100%;height:calc(var(${ANCRES.largeurDuCadre}) * ${(HAUTEUR / LARGEUR).toFixed(5)});aspect-ratio:${LARGEUR}/${HAUTEUR};background:var(--bois);border-radius:${(100 * P.coinDuCadre) / LARGEUR}% / ${(100 * P.coinDuCadre) / HAUTEUR}%;contain:layout paint}
/* Ce que l'atelier dit de la séance : il a la largeur du cadre, sans jamais l'élargir. */
.dit{flex:none;display:flex;justify-content:space-between;width:0;min-width:100%;height:${P.dit}px;padding:0 4px;line-height:${P.dit}px;font-size:${CORPS.mention}px;white-space:nowrap;font-variant-numeric:tabular-nums}
#${ANCRES.etat}{min-width:0;overflow:hidden;text-overflow:ellipsis;${GRAVE}}
#${ANCRES.chrono}{flex:none;margin-left:12px;color:var(--sourdine)}
/* Une petite fenêtre (un téléphone court, ou très étroit) : le cadre y est trop étroit pour qu'une réponse tienne sur une ligne.
   La ligne d'état en a alors deux, qu'elle les remplisse ou non : le cadre ne change pas de taille quand elle passe à la ligne. */
@media ${PETITE_EN_COLONNE}{
  .dit{align-items:flex-start;height:${2 * P.petiteFenetre.ligne}px;line-height:${P.petiteFenetre.ligne}px;white-space:normal}
  #${ANCRES.etat}{white-space:normal;overflow:visible}
}

/* Ce que le cadre dit pendant que la scène se dessine, puis si elle n'a pas pu s'y monter. Rien ne s'y montre tant qu'on ne sait pas. */
.attente,.panne{display:none;padding:28px 24px;text-align:center}
.attente{position:absolute;top:38%;left:0;right:0;color:var(--sourdine);font-size:${CORPS.mention}px;${GRAVE}}
.${ANCRES.demarre} .attente{display:block}
.${ANCRES.enMarche} .attente,.${ANCRES.enPanne} .attente{display:none}
.panne-titre{font:${titrage.graisse} ${CORPS.intertitre}px/1.2 var(--titrage);text-wrap:balance}
.panne p{text-wrap:balance}
.panne p+p{margin-top:10px;color:var(--sourdine)}
.panne #${ANCRES.manques}{font-size:${CORPS.mention}px}

/* Les avis : ce que la page dit à qui a demandé moins d'animations, et à qui tient son téléphone couché. */
.avis{display:flex;align-items:center;justify-content:space-between;flex:none;margin-bottom:${P.serre}px;font-size:${CORPS.mention}px;line-height:1.3}
.avis span{min-width:0;margin-right:12px}
.avis .touche{flex:none;padding-left:12px;padding-right:12px}
.avis.couche{display:none}

/* La façade, en colonne : ce qu'on a sous le pouce pendant qu'on regarde. Ses groupes de touches, l'un sous l'autre, chacun sous son nom gravé. */
.facade{align-self:stretch;min-width:0;padding:${P.serre}px ${P.colonne.marge}px ${P.entreGroupes + P.tranche}px;background:var(--laque);border-left:2px solid var(--laque-sombre)}
.groupe{min-width:0;margin:0;padding:0;border:0}
.groupe+.groupe{margin-top:${P.entreGroupes}px}
.gravure{height:${P.gravure.hauteur}px;margin-bottom:${P.gravure.dessous}px;overflow:hidden;color:var(--gravure);font-size:${CORPS.gravure}px;line-height:${P.gravure.hauteur}px;${GRAVE};text-align:center;white-space:nowrap}
.touches{display:grid;${entreLignes(P.entreRangs)}}`;

/** Le reste de la page : le mode d'emploi, la liste des temps, les mesures. */
const SUITE = `
/* Le mode d'emploi : chaque touche par son nom, comme il est gravé dessus. */
.mode-d-emploi dt{margin-top:16px;font-size:${CORPS.mention}px;${GRAVE}}
.mode-d-emploi dt span{display:inline-block;margin-right:14px}
.mode-d-emploi dd,.note{color:var(--sourdine)}
.note{margin-top:16px}

/* La liste des temps. Sur un écran étroit, le temps d'un départ ouvre sa ligne ; sur un grand, il a sa colonne. */
.enchainement{margin-top:26px;padding-top:12px;border-top:2px solid var(--filet)}
.lignes li{margin-top:10px}
.quand{margin-right:.6em;font-size:${CORPS.mention}px;${GRAVE};text-transform:none;font-variant-numeric:tabular-nums;white-space:nowrap}
.comment{display:block;color:var(--sourdine);font-size:${CORPS.mention}px;line-height:1.35;font-variant-numeric:tabular-nums}

/* Les mesures : celles qu'on prend sur le vif, puis celles du banc, une fiche par scène tant que la table ne tient pas en colonnes. */
.groupe-de-mesures{margin-top:22px}
.releve dt{margin-top:10px;font-size:${CORPS.mention}px;${GRAVE};color:var(--sourdine)}
.releve dd{font-variant-numeric:tabular-nums}
table{width:100%;margin-top:12px;border-collapse:collapse;font-variant-numeric:tabular-nums}
caption{margin-top:18px;font-size:${CORPS.mention}px;${GRAVE};color:var(--miel);text-align:left}
th,td{font-weight:inherit;text-align:left;vertical-align:top}
thead th{font-size:${CORPS.mention}px;${GRAVE};color:var(--sourdine)}
td{font-size:${CORPS.mention}px}
@media (max-width:${P.tablesEnColonnes - 1}px){
  table,caption,tbody,tr,tbody th,td{display:block}
  thead{display:none}
  tr{margin-top:12px;padding-top:10px;border-top:1px solid var(--filet)}
  td{display:flex;justify-content:space-between;margin-top:2px}
  td::before{content:attr(data-colonne);margin-right:12px;${GRAVE};color:var(--sourdine)}
}
@media (min-width:${P.tablesEnColonnes}px){
  .lignes li{display:grid;grid-template-columns:${P.colonneDesHeures}px minmax(0,1fr);${entreColonnes(14)}}
  .quand{margin-right:0;padding-top:2px;text-align:right}
  .quoi,.comment{grid-column:2}
  .releve{display:grid;grid-template-columns:auto minmax(0,1fr);grid-gap:8px 20px;gap:8px 20px;align-items:baseline;margin-top:12px}
  .releve dt{margin-top:0}
  th,td{padding:8px 12px 8px 0;border-top:1px solid var(--filet)}
  td{white-space:nowrap}
}`;

/** La mise en page de bureau, et ce qu'elle dit à un téléphone couché. */
const DE_BUREAU = `
/* Sur un grand écran, ou un téléphone couché : la scène à gauche, dans la coque d'un téléphone, et tout le reste à côté d'elle. */
@media ${DE_BUREAU_SI}{
  .etabli{display:grid;grid-template-columns:min(${LARGEUR + 2 * P.coque}px,calc((100vh - ${AUTOUR.auBureau}px) * ${RAPPORT.toFixed(5)} + ${2 * P.coque}px)) minmax(0,${P.colonneDeTexte}px);justify-content:center;${entreColonnes(40)};align-items:start;padding:${P.marge}px ${P.marge}px 64px}
  .etabli>*{width:auto;max-width:none}
  .premier-ecran{display:contents}
  /* La vitrine s'efface : la place de la scène tient la première colonne, et l'avis passe dans la seconde, où il ne lui prend rien. */
  .vitrine{display:contents}
  .place{grid-column:1;grid-row:1 / span 9;position:sticky;top:${P.marge}px;height:calc(100vh - ${2 * P.marge}px);min-height:240px;max-height:${HAUTEUR + AUTOUR.auBureau - 2 * P.marge}px}
  .cadre{box-sizing:content-box;border:${P.coque}px solid var(--coque)}
  .avis,.entete,.facade,.etabli>section{grid-column:2}
  .avis{margin:12px 0 0}
  /* Sous un petit cadre, ce que l'atelier dit de la séance passe à la ligne, dans la marge du bas de l'écran, plutôt que d'être coupé. */
  .dit,#${ANCRES.etat}{white-space:normal}
  #${ANCRES.etat}{overflow:visible}
  .entete{margin-top:0}
  h1{font-size:${CORPS.enseigne}px}
  /* La façade, en rangs : ses groupes côte à côte, tant qu'ils tiennent, chacun sous son nom gravé. */
  .facade{align-self:auto;display:flex;flex-wrap:wrap;margin-top:20px;padding:10px 4px 1px 14px;border-left:0;border-bottom:4px solid var(--laque-sombre)}
  /* Un groupe a d'abord la largeur de ses touches au plus juste ; ce qui reste du rang, les groupes se le partagent. */
  .groupe,.groupe+.groupe{flex:1 1 auto;width:-webkit-min-content;width:min-content;margin:0 10px ${10 + P.tranche}px 0}
  .gravure{text-align:left}
  .touches{grid-auto-flow:column;grid-auto-columns:minmax(min-content,${P.toucheAuPlus}px);${entreColonnes(P.entreTouches)};grid-row-gap:0;row-gap:0}
  /* En rangs, une touche garde au moins la largeur de ce qu'on vise du doigt : un groupe qui ne tient plus passe au rang d'après. */
  .touche{min-width:${P.touche}px;padding-left:8px;padding-right:8px;font-size:${CORPS.mention}px}
}
@media (min-width:${P.bureau}px) and (min-height:${P.facadeEnVue}px){
  /* Assez de hauteur : la façade reste en vue pendant qu'on lit la liste des temps. */
  .facade{position:sticky;top:0;z-index:2}
}
@media (min-width:${P.bureauCouche}px) and (max-height:${P.couche}px) and (min-aspect-ratio:${LARGE}){
  /* Une fenêtre basse : on y grave les touches plus petit, pour que la façade tienne en peu de rangs. */
  .touche{padding-left:3px;padding-right:3px;font-size:${CORPS.gravure}px}
}
@media (min-width:${P.bureauCouche}px) and (max-height:${P.couche}px) and (min-aspect-ratio:${LARGE}) and (hover:none) and (pointer:coarse){
  /* Un téléphone couché, qu'on reconnaît à ce qu'on le touche du doigt : la scène y est toute petite, et on le dit. */
  .avis.couche{display:block;margin:0 0 12px;color:var(--miel)}
}`;

/** @param enBase64 les polices de la page (woff2), en base 64, par nom de fichier. */
export function feuilleDeStyle(enBase64: Readonly<Record<string, string>>): string {
  return `${polices(enBase64)}
:root{
  color-scheme:dark;
  /* Quand le clavier arrive sur une touche au ras de l'écran, la page défile de quoi montrer son contour entier. */
  scroll-padding:${P.entreRangs}px 0;
${Object.entries(COULEURS)
  .map(([nom, ton]) => `  --${nom}:${ton};`)
  .join('\n')}
  --titrage:'${titrage.famille}','Cooper Black',Georgia,serif;
  --technique:'${technique.famille}','Arial Narrow','Helvetica Neue',Arial,sans-serif;
  --gouttiere:${P.gouttiere}px;
}
*{box-sizing:border-box}
body{margin:0;padding:0;background:var(--nuit);color:var(--creme);font:${technique.graisse} ${CORPS.texte}px/1.45 var(--technique);-webkit-text-size-adjust:100%;text-size-adjust:100%}
h1,h2,h3,p,dl,dt,dd,ol,li{margin:0;padding:0}
ol{list-style:none}
[hidden]{display:none!important}
h1{font:${titrage.graisse} ${CORPS.grandTitre}px/1.1 var(--titrage);text-wrap:balance}
h2{font:${titrage.graisse} ${CORPS.titre}px/1.15 var(--titrage);text-wrap:balance}
h3{font-size:${CORPS.mention}px;${GRAVE};color:var(--miel)}
.chapeau{margin-top:8px;color:var(--sourdine)}
${EN_COLONNE}
${TOUCHE}
${SUITE}
${DE_BUREAU}
${reglesDePanne(`.etabli.${ANCRES.enPanne}`, '.panne.du-navigateur')}`;
}
