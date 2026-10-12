/**
 * Le gabarit de la page de l'atelier : la scène dans son cadre de téléphone, sa façade de touches, leur mode d'emploi,
 * la liste des temps et les mesures. Il écrit une page entière, lisible avant même que son script ne démarre ; le script
 * n'y trouve que des éléments à animer. Si le script ne démarre jamais, le cadre dit pourquoi, et ce qui ne sert plus se retire.
 */

import type { Textes } from '../../ressources/textes';
import { enXml } from '../../scene/rendu/balisage';
import { ANCRES } from './ancres';
import type { Banc } from './banc';
import { facade } from './gabarit/facade';
import { sectionDesMesures } from './gabarit/mesures';
import { modeDEmploi } from './gabarit/modeDEmploi';
import { plumeDe, type Plume } from './gabarit/plume';
import { feuilleDeStyle, reglesDePanne } from './gabarit/style';
import { sectionDesTemps } from './gabarit/temps';
import { LEGENDES } from './legendes.fr';
import type { Enchainement } from './temps';

const L = LEGENDES;

/**
 * La garde : un second script, écrit pour le plus vieux des navigateurs, qui passe après celui de la page. Si celui-ci
 * n'a pas démarré (il n'a pas été compris, ou il s'est arrêté avant même de se lancer), elle fait dire au cadre ce qui se passe.
 * Une fois lancé, c'est le script de la page qui dit la suite : la scène en marche, ou en panne.
 */
const GARDE = `(function(e){if(e&&!/(^| )${ANCRES.demarre}( |$)/.test(e.className)){e.className+=' ${ANCRES.enPanne}'}})(document.getElementById('${ANCRES.etabli}'))`;

/**
 * La vitrine : la place de la scène et son cadre de téléphone, avec ce qu'il dit tant que la scène n'y est pas, et, sous lui,
 * ce que l'atelier dit de la séance. Au-dessus, l'avis pour qui a demandé moins d'animations : le script le montre s'il le faut.
 */
function vitrine(h: Plume, N: Textes['navigateur']): string {
  return `<div class="vitrine">
<p class="avis" id="${ANCRES.avis}" hidden><span>${h(L.avis.texte)}</span><button type="button" class="touche" id="${ANCRES.toutAnimer}">${h(L.avis.touche)}</button></p>
<div class="place" id="${ANCRES.place}"><div class="poste">
<div class="cadre" id="${ANCRES.cadre}"><p class="attente">${h(N.enAttendant)}</p><div class="panne du-navigateur"><p class="panne-titre">${h(N.titre)}</p><p>${h(N.conseil)}</p><p id="${ANCRES.manques}" hidden></p></div><noscript><div class="panne sans-script"><p class="panne-titre">${h(N.sansScript.titre)}</p><p>${h(N.sansScript.conseil)}</p></div></noscript></div>
<p class="dit"><span id="${ANCRES.etat}" aria-live="polite">${h(L.etats.avant)}</span><span id="${ANCRES.chrono}" aria-hidden="true"></span></p>
</div></div>
</div>`;
}

/**
 * @param polices les polices de la page (woff2), en base 64, par nom de fichier.
 * @param script le script de la page, déjà assemblé.
 * @returns la page, sans son enveloppe : son titre, son style, son contenu, son script.
 */
export function ecrireLaPage(o: {
  /** Les textes du site : leur langue et sa typographie, et ce que le cadre dit quand la scène ne peut pas s'y montrer. */
  readonly textes: Textes;
  readonly polices: Readonly<Record<string, string>>;
  readonly enchainements: readonly Enchainement[];
  readonly bancs: readonly Banc[];
  readonly script: string;
}): string {
  const h = plumeDe(o.textes);
  return `<title>${h(L.titre)}</title>
<style>
${feuilleDeStyle(o.polices)}
</style>
<div class="etabli" id="${ANCRES.etabli}" lang="${enXml(o.textes.langue)}">
<p class="avis couche">${h(L.couche)}</p>
<header class="entete">
<h1>${h(L.titre)}</h1>
<p class="chapeau">${h(L.chapeau)} <span class="consigne">${h(L.consigne)}</span></p>
</header>
<div class="premier-ecran">
${vitrine(h, o.textes.navigateur)}
${facade(h)}
</div>
${modeDEmploi(h)}
${sectionDesTemps(h, o.enchainements)}
${sectionDesMesures(h, o.bancs)}
</div>
<noscript><style>
${reglesDePanne('.etabli', '.panne.sans-script')}
</style></noscript>
<script>
${o.script}
</script>
<script>
${GARDE}
</script>
`;
}
