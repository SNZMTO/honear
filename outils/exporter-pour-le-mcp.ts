/**
 * Ce que le MCP de Honear (dépôt honear-mcp) reprend du jeu, sans jamais le recopier à la main : les réglages du jugement d'une
 * saisie, une table de cas jugés par le jeu (ceux de tests/cas-du-jugement.ts, et des variantes tirées d'une graine), la part
 * de Deezer que le jeu prend, le moins de pistes qu'une playlist doit avoir pour une partie, sa palette et ses polices (pour le mini blind test, qui a son allure). Il écrit dans le dossier du
 * MCP, qui les versionne et ne les retouche pas : src/honear_mcp/ressources/honear.py, src/honear_mcp/ressources/polices/ et
 * tests/jugement-de-honear.json. Si le jeu change de jugement, le portage du MCP rougit.
 *
 *   npm run exporter-pour-le-mcp -- ~/honear-mcp
 */
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasard } from '../src/lowpoly/aleatoire';
import { aLOreille, juger, normaliser } from '../src/regles/jugement';
import { MODES } from '../src/regles/modes';
import { PALETTE } from '../src/ressources/palette';
import { JUGEMENT, REGLAGES } from '../src/ressources/reglages';
import { RESEAU } from '../src/ressources/reseau';
import { CAS_DE_JUGER, CAS_DES_PARTIES } from '../tests/cas-du-jugement';

const mcp = process.argv[2];
if (mcp === undefined) throw new Error('Où est le MCP ? npm run exporter-pour-le-mcp -- ~/honear-mcp');

/** Des façons de mal taper une réponse : une lettre en moins, en trop, deux voisines inversées, un accent, un son voisin. */
const ABIMER: readonly ((x: string, rang: number) => string)[] = [
  (x, r) => x.slice(0, r) + x.slice(r + 1),
  (x, r) => x.slice(0, r) + (x[r] ?? '') + x.slice(r),
  (x, r) => x.slice(0, r) + (x[r + 1] ?? '') + (x[r] ?? '') + x.slice(r + 2),
  (x) => x.replace(/e/, 'é').replace(/a/, 'à'),
  (x) => x.replace(/ph|f/i, 'ph').replace(/qu|k|c(?=[aou])/i, 'qu'),
  (x) => x.replace(/ou|u/i, 'ou').replace(/i/i, 'y'),
  (x) => `les ${x}`,
  (x) => x.toUpperCase(),
  (x) => `${x} (live)`,
  (x) => x.split(' ').slice(0, -1).join(' '),
];

/** Pour chaque réponse attendue des cas, des saisies abîmées, toujours les mêmes : le hasard est une graine. */
function variantes(): { saisie: string; attendu: string }[] {
  const des = hasard(2026);
  const attendus = [...new Set([...CAS_DE_JUGER.map((c) => c.attendu), ...CAS_DES_PARTIES.flatMap((c) => [c.artiste, c.titre])])];
  // Et, pour chacune, une autre réponse : celle d'à côté, qui ne doit pas passer pour elle.
  return attendus.flatMap((attendu, rang) => [
    ...ABIMER.map((abimer) => ({ saisie: abimer(attendu.toLowerCase(), Math.floor(des.suivant() * attendu.length)), attendu })),
    { saisie: attendus[(rang + 1) % attendus.length] ?? '', attendu },
  ]);
}

const pochette = { vignette: { fond: 'olive', motif: 'damier' } } as const;
const table = {
  juger: [...CAS_DE_JUGER.map(({ saisie, attendu }) => ({ saisie, attendu })), ...variantes()].map(({ saisie, attendu }) => ({
    saisie,
    attendu,
    normalise: normaliser(saisie),
    a_l_oreille: aLOreille(normaliser(saisie)),
    verdict: juger(saisie, attendu),
  })),
  parties: CAS_DES_PARTIES.map((c) => {
    const reponse = { titre: c.titre, artiste: c.artiste, ...(c.feat !== undefined ? { feat: c.feat } : {}), pochette };
    const piste = { reponse, ...(c.surnoms !== undefined ? { surnoms: c.surnoms } : {}) };
    const { trouve, verdict } = MODES.libre.juger({ genre: 'saisie', texte: c.texte }, piste, [...c.deja]);
    return { texte: c.texte, artiste: c.artiste, titre: c.titre, feat: c.feat ?? null, surnoms: c.surnoms ?? null, deja: c.deja, trouve, verdict };
  }),
};

const chaines = (xs: readonly string[]): string => `(${xs.map((x) => `"${x}"`).join(', ')})`;
const python = `"""Ce que le MCP reprend de Honear, tel que Honear le dit : écrit par \`npm run exporter-pour-le-mcp\` dans Honear.

Ne pas retoucher : relancer le script, qui écrit aussi tests/jugement-de-honear.json.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class JugementDeHonear:
    """Les réglages du jugement d'une saisie (\`JUGEMENT\`, dans src/ressources/reglages.ts de Honear)."""

    lettres_par_faute: int
    lettres_par_faute_a_l_oreille: int
    presque: float
    morceau: float
    morceau_au_moins: int
    mots_au_plus: int
    saisie_au_plus: int
    articles: tuple[str, ...]
    liaisons: tuple[str, ...]


JUGEMENT = JugementDeHonear(
    lettres_par_faute=${JUGEMENT.lettresParFaute},
    lettres_par_faute_a_l_oreille=${JUGEMENT.lettresParFauteALOreille},
    presque=${JUGEMENT.presque},
    morceau=${JUGEMENT.morceau},
    morceau_au_moins=${JUGEMENT.morceauAuMoins},
    mots_au_plus=${JUGEMENT.motsAuPlus},
    saisie_au_plus=${JUGEMENT.saisieAuPlus},
    articles=${chaines(JUGEMENT.articles)},
    liaisons=${chaines(JUGEMENT.liaisons)},
)


@dataclass(frozen=True)
class DeezerDeHonear:
    """La part de Deezer que le jeu prend (\`RESEAU.deezer\`, dans src/ressources/reseau.ts de Honear)."""

    fenetre: float
    par_fenetre: int


DEEZER_DE_HONEAR = DeezerDeHonear(fenetre=${RESEAU.deezer.fenetre}, par_fenetre=${RESEAU.deezer.parFenetre})


@dataclass(frozen=True)
class PartieDeHonear:
    """Une partie de Honear (\`REGLAGES.pistes\`, dans src/ressources/reglages.ts de Honear)."""

    pistes_au_moins: int
    """Le moins de pistes jouables qu'une playlist doit avoir : la plus courte des faces qu'on peut choisir. En dessous, le
    bac dit « Trop court pour une face. »"""


PARTIE_DE_HONEAR = PartieDeHonear(pistes_au_moins=${Math.min(...REGLAGES.pistes.choix)})

PALETTE: dict[str, str] = {
${Object.entries(PALETTE)
  .map(([nom, couleur]) => `    "${nom}": "${couleur}",`)
  .join('\n')}
}
"""La palette de Honear (src/ressources/palette.ts), couleur par couleur."""
`;

writeFileSync(join(mcp, 'src', 'honear_mcp', 'ressources', 'honear.py'), python);
// Les polices du site (le .woff2 de chacune) et leur licence, que le MCP sert à la fenêtre du mini blind test.
const polices = join(dirname(fileURLToPath(import.meta.url)), '..', 'polices');
const versLeMcp = join(mcp, 'src', 'honear_mcp', 'ressources', 'polices');
mkdirSync(versLeMcp, { recursive: true });
for (const fichier of readdirSync(polices).filter((f) => f.endsWith('.woff2') || f === 'LICENCES.md'))
  copyFileSync(join(polices, fichier), join(versLeMcp, fichier));
writeFileSync(join(mcp, 'tests', 'jugement-de-honear.json'), `${JSON.stringify(table, null, 1)}\n`);
console.log(`${table.juger.length} saisies jugées, ${table.parties.length} saisies libres, écrites dans ${mcp}`);
