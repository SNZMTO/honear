/**
 * Les cas du jugement d'une saisie : ce qu'on tape, ce qu'on attend, et le verdict. Une seule liste, pour deux lecteurs :
 * `tests/jugement.test.ts`, qui vérifie le jugement du jeu, et `outils/exporter-pour-le-mcp.ts`, qui en fait la table contre
 * laquelle le MCP de Honear vérifie son portage. Un cas ajouté ici vaut pour les deux.
 */

import type { Verdict } from '../src/regles/jugement';
import type { Partie } from '../src/regles/modes/libre';

/** Une saisie comparée à une réponse attendue, et ce que le jeu en dit. */
export interface CasDeJuger {
  readonly saisie: string;
  readonly attendu: string;
  readonly verdict: Verdict;
}

const cas = (verdict: Verdict, attendu: string, ...saisies: string[]): CasDeJuger[] => saisies.map((saisie) => ({ saisie, attendu, verdict }));

export const CAS_DE_JUGER: readonly CasDeJuger[] = [
  // Ce qui s'écrit autrement mais se dit pareil.
  ...cas('juste', 'Beyoncé', 'bionsé'),
  ...cas('juste', 'Angèle', 'angel'),
  ...cas('juste', 'Nekfeu', 'neckfeu'),
  ...cas('juste', 'Ninho', 'nino'),
  ...cas('juste', 'Dadju', 'dadjou'),
  ...cas('juste', 'Wejdene', 'ouejdene'),
  ...cas('juste', 'Stromae', 'stromai'),
  ...cas('juste', 'Johnny Hallyday', 'johny halliday'),
  ...cas('juste', 'Michael Jackson', 'mikael jackson'),
  ...cas('juste', 'Dernière danse', 'dernière dance'),
  ...cas('juste', 'Jul', 'jull'),
  // Sans qu'une autre chanson, ou un autre artiste, le soit.
  ...cas('faux', 'SCH', 'jul'),
  ...cas('faux', 'Dadju', 'damso'),
  ...cas('faux', 'Ninho', 'niska'),
  ...cas('faux', 'Mika', 'muse'),
  // Les fautes de frappe, les petits mots du début, les parenthèses, les espaces.
  ...cas(
    'juste',
    'Les Démons de minuit',
    'les demons de minuit',
    'Démons de minuit',
    'les demosn de minuit',
    'LES DÉMONS DE MINUIT (version longue)',
    'lesdemonsdeminuit',
  ),
  ...cas('presque', 'Les Démons de minuit', 'les demons du minou', 'démons de minuit et demi', 'les demons de'),
  ...cas('faux', 'Les Démons de minuit', '', 'voyage voyage', 'minuit', 'demons'),
  ...cas('juste', 'Images', 'imajes', 'Images feat. personne'),
];

/** Une saisie libre, la piste qu'elle vise (et ses surnoms), ce qu'on avait déjà trouvé, et ce qu'elle trouve. */
export interface CasDesParties {
  readonly texte: string;
  readonly artiste: string;
  readonly titre: string;
  readonly feat?: string;
  readonly surnoms?: { readonly artiste: readonly string[]; readonly titre: readonly string[] };
  readonly deja: readonly Partie[];
  readonly trouve: readonly Partie[];
  readonly verdict: Verdict;
}

const DEMONS = { artiste: 'Images', titre: 'Les Démons de minuit' } as const;
const TOUT_OUBLIER = { artiste: 'Angèle', titre: 'Tout oublier', feat: 'Roméo Elvis' } as const;
const BANDE = { artiste: 'Kofs', titre: 'Bande organisée', feat: 'Soso Maness, Elams, Jul, SCH, Naps & 13 Organisé' } as const;
const M = { artiste: '-M-', titre: 'Je dis aime' } as const;
const juste = (
  piste: Omit<CasDesParties, 'texte' | 'deja' | 'trouve' | 'verdict'>,
  texte: string,
  trouve: readonly Partie[],
  deja: readonly Partie[] = [],
): CasDesParties => ({
  ...piste,
  texte,
  deja,
  trouve,
  verdict: trouve.length > 0 ? 'juste' : 'faux',
});

export const CAS_DES_PARTIES: readonly CasDesParties[] = [
  juste(DEMONS, 'images', ['artiste']),
  juste(DEMONS, 'les démons de minuit', ['titre'], ['artiste']),
  juste(DEMONS, 'Images - Les Démons de minuit', ['artiste', 'titre']),
  { ...DEMONS, texte: 'images', deja: ['artiste'], trouve: [], verdict: 'faux' },
  { ...DEMONS, texte: 'les demons du minou', deja: [], trouve: [], verdict: 'presque' },
  juste(TOUT_OUBLIER, 'romeo elvis', ['feat']),
  juste(TOUT_OUBLIER, 'Angèle feat. Roméo Elvis', ['artiste', 'feat']),
  juste(TOUT_OUBLIER, 'angele ft romeo elvis', ['artiste', 'feat']),
  juste(TOUT_OUBLIER, 'angele romeo elvis', ['artiste', 'feat']),
  juste(TOUT_OUBLIER, 'tout oublier angele romeo elvis', ['artiste', 'titre', 'feat']),
  juste(TOUT_OUBLIER, 'Roméo Elvis x Angèle - Tout oublier', ['artiste', 'titre', 'feat']),
  juste(TOUT_OUBLIER, 'tout oublier', ['titre'], ['artiste', 'feat']),
  juste(TOUT_OUBLIER, 'romeo elvi', ['feat']),
  { ...TOUT_OUBLIER, texte: 'romeo', deja: [], trouve: [], verdict: 'presque' },
  juste({ artiste: 'Léo Ferré', titre: 'Avec le temps' }, 'avec le temps', ['titre']),
  juste({ artiste: 'Léo Ferré', titre: 'Avec le temps' }, 'léo ferré avec le temps', ['artiste', 'titre']),
  juste(BANDE, 'jul', ['feat']),
  juste(BANDE, 'SCH', ['feat']),
  juste(BANDE, 'kofs jul', ['artiste', 'feat']),
  juste(BANDE, 'bande organisée 13 organisé', ['titre', 'feat']),
  juste({ artiste: 'GIMS', titre: 'Sapés comme jamais', feat: 'Alonzo, Gradur, KeBlack & Awa Imani' }, 'gradur', ['feat']),
  juste({ artiste: 'Daft Punk', titre: 'Around the World' }, 'daft punk around the world', ['artiste', 'titre']),
  { ...M, texte: 'm pokora', deja: [], trouve: [], verdict: 'presque' },
  juste(M, 'm', ['artiste']),
  { artiste: 'Stromae', titre: 'Alors on danse', texte: 'on danse', deja: [], trouve: [], verdict: 'presque' },
  // Les surnoms d'une liste sur mesure, et ce que le jeu accepte déjà sans eux.
  juste({ ...M, surnoms: { artiste: ['Matthieu Chedid'], titre: [] } }, 'mathieu chedid', ['artiste']),
  { ...M, texte: 'matthieu chedid', deja: [], trouve: [], verdict: 'presque' },
  juste({ artiste: 'GIMS', titre: 'Bella' }, 'maître gims', ['artiste']),
  juste({ artiste: 'Diddy', titre: "I'll Be Missing You" }, 'puff daddy', ['artiste']),
  // Une saisie ne se découpe que sur ses premiers mots (`JUGEMENT.motsAuPlus`) : au neuvième, la réponse n'est plus lue seule,
  // seulement dans toute la saisie (« Presque. ») ; et cent vingt « & » (cent vingt « et ») se jugent comme une saisie courte.
  { ...DEMONS, texte: `${'oui '.repeat(8)}images`, deja: [], trouve: [], verdict: 'presque' },
  { ...DEMONS, texte: '&'.repeat(120), deja: [], trouve: [], verdict: 'faux' },
];
