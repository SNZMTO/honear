/**
 * La page de la planche d'animations : pour chaque animation, sa vitre (où le script de la page la monte et la joue), ses commandes,
 * ce qui change quand on l'interrompt, et sa fiche (réglages, temps, frises). Le script est posé à la fin, avec ses polices.
 * Sans script, la page garde ses fiches : elles se lisent sans rien lancer.
 */

import type { Textes } from '../../ressources/textes';
import { remplir } from '../../scene/phrases';
import { enXml } from '../../scene/rendu/balisage';
import { valeursA, type Animation } from '../animations';
import { deuxEcritures, feuilleDeBase } from '../feuille';
import { enTemps, ficheDeLAnimation } from './fiche';
import { LEGENDES_DE_LA_PLANCHE as L } from './legendes.fr';

const STYLE = `
.sommaire{columns:2 240px;padding:0;list-style:none;margin:0 0 48px}
.sommaire li{margin:0 0 6px}
.sommaire a{color:var(--miel);text-decoration:none}
.avis{max-width:68ch;margin:0 0 32px;padding:10px 14px;border:1px solid var(--miel);border-radius:8px}
.animation{margin:0 0 80px;scroll-margin-top:16px}
.etabli{display:flex;flex-wrap:wrap;gap:24px 40px;align-items:flex-start}
.scene{flex:0 1 auto;min-width:0;max-width:100%}
.vitre{position:relative;overflow:hidden;border-radius:8px;outline:1px solid var(--trait);background:var(--papier);max-width:100%}
.vitre .plan{position:absolute;left:0;top:0;transform-origin:0 0}
.vitre .attente{margin:0;padding:12px 14px;color:var(--doux)}
.commandes{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 8px;align-items:center}
.commandes button,.commandes label{font:inherit;text-transform:uppercase;color:var(--encre);background:var(--papier);border:1px solid var(--trait);border-radius:4px;padding:6px 12px;cursor:pointer;min-height:36px;display:inline-flex;gap:8px;align-items:center}
.commandes button[aria-pressed="true"]{background:var(--miel);color:var(--fond);border-color:var(--miel)}
.commandes button:focus-visible,.commandes label:focus-within{outline:2px solid var(--miel);outline-offset:2px}
.vitesses{display:inline-flex;gap:4px}
.etat{margin:4px 0;color:var(--doux);min-height:1.45em}
.interruption{max-width:46ch;color:var(--doux);margin:6px 0 0}
.fiche{flex:1 1 440px;min-width:0;max-width:720px}
.fiche h3{margin-top:0}
.fiche ul+h3,.fiche p+h3,.fiche .defile+h3{margin-top:18px}
.reglages{list-style:none;padding:0;margin:0 0 10px}
.reglages li{margin:0 0 8px}
.regle{display:inline-block;min-width:68px;text-align:center;text-transform:uppercase;font-size:11px;padding:1px 6px;border-radius:4px;margin-right:6px}
.regle.ressort{background:var(--miel);color:var(--fond)}
.regle.glissade{background:var(--encre);color:var(--fond)}
.regle.chute{background:var(--doux);color:var(--fond)}
.regle.loi{box-shadow:inset 0 0 0 1px var(--miel);color:var(--miel)}
.pour,.coups{color:var(--doux)}
.defile{overflow-x:auto;max-width:640px}
.frise{display:block;width:100%;min-width:540px;height:auto}
.frise .nom{fill:var(--doux);font-size:10px;text-anchor:end}
.frise .temps{fill:var(--doux);font-size:9px;text-anchor:middle}
.frise .graduation{stroke:var(--trait);stroke-width:1}
.frise .pas.ressort{fill:var(--miel)}
.frise .pas.glissade{fill:var(--encre)}
.frise .pas.chute{fill:var(--doux)}
.frise .pas.loi{fill:none;stroke:var(--miel);stroke-width:1.5}
.frise .vibre{fill:var(--encre)}
.frise .interruption{stroke:var(--encre);stroke-width:1;stroke-dasharray:3 3}
.frise .curseur{stroke:var(--miel);stroke-width:2}
.frise[data-frise="reprise"] .curseur{opacity:0}
.frise[data-frise="reprise"].suivie .curseur{opacity:1}
details{margin:14px 0 0}
summary{cursor:pointer;text-transform:uppercase;color:var(--doux)}
table{border-collapse:collapse;font-size:12px;margin-top:8px;display:block;overflow-x:auto;max-width:100%}
th,td{text-align:left;padding:3px 12px 3px 0;border-bottom:1px solid var(--trait);white-space:nowrap}
th{color:var(--doux);font-weight:inherit;text-transform:uppercase}
`;

/** La vitre d'une animation, ses commandes, et sa fiche. */
function vitrine(animation: Animation): string {
  const regard = animation.regard(valeursA(animation, 0));
  const [largeur, hauteur] = [Math.round(regard.largeur * animation.grossissement), Math.round(regard.hauteur * animation.grossissement)];
  const C = L.commandes;
  const vitesses = C.vitesses
    .map((v) => `<button type="button" data-vitesse="${v.vitesse}" aria-pressed="${v.vitesse === 1}">${enXml(v.libelle)}</button>`)
    .join('');
  return `<section class="animation" id="animation-${animation.cle}" data-animation="${animation.cle}">
<h2>${enXml(animation.titre)}</h2><p class="note">${enXml(animation.texte)}</p>
<div class="etabli"><div class="scene">
<div class="vitre" data-vitre data-largeur="${largeur}" data-hauteur="${hauteur}" style="width:${largeur}px;aspect-ratio:${largeur}/${hauteur}" role="img" aria-label="${enXml(animation.titre)}"><p class="attente">${enXml(L.attente)}</p></div>
<div class="commandes" role="group" aria-label="${enXml(C.groupe)}">
<button type="button" data-rejouer>${enXml(C.rejouer)}</button>
<span class="vitesses" role="group" aria-label="${enXml(C.vitesse)}">${vitesses}</span>
<label><input type="checkbox" data-sobre>${enXml(C.sobre)}</label>
<button type="button" data-interrompre>${enXml(remplir(C.interrompre, { instant: enTemps(animation.interruption.a) }))}</button>
</div>
<p class="etat" data-etat aria-live="polite">${enXml(L.etats.repos)}</p>
<p class="interruption">${enXml(animation.interruption.ceQuiChange)}</p>
</div>
<div class="fiche">${ficheDeLAnimation(animation)}</div>
</div></section>`;
}

/**
 * @param polices les polices woff2 de la page, en base 64, par nom de fichier.
 * @param script le script de la page, assemblé, avec ses polices à tracer.
 */
export function pageDeLaPlanche(
  animations: readonly Animation[],
  textes: Textes,
  polices: Readonly<Record<string, string>>,
  script: string,
): { readonly aPublier: string; readonly locale: string } {
  const sommaire = animations.map((a) => `<li><a href="#animation-${a.cle}">${enXml(a.titre)}</a></li>`).join('');
  const page = `<title>${enXml(L.nom)}</title>
<style>
${feuilleDeBase(polices)}
${STYLE}
</style>
<main id="planche-vivante">
<header><h1>${enXml(L.titre)}</h1><p>${enXml(L.sousTitre)}</p></header>
<p class="note">${enXml(L.intro)}</p>
<p class="note">${enXml(L.ailleurs)}</p>
<p class="avis" data-reduites hidden>${enXml(L.reduites)}</p>
<ul class="sommaire">${sommaire}</ul>
${animations.map(vitrine).join('\n')}
</main>
<script>${script}</script>`;
  return deuxEcritures(page, textes.langue);
}
