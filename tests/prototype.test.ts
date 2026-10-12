/**
 * La partie scénarisée du prototype, jouée de bout en bout contre le serveur : toi, l'hôte, et les cinq potes simulés, en saisie libre
 * puis en 4 choix. Elle passe par chaque état que demande le brief : une bonne réponse, « Presque. », « Rayé. », une piste où personne
 * ne trouve, une connexion qui tombe et revient, un dépassement au hit-parade, « Rejouer la face B ».
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { joueursDExemple } from '../src/planche/etape5/scenes';
import { inviterLesPotes } from '../src/planche/prototype/potes';
import { PLAYLIST_DU_PROTOTYPE, SCENARIO, type Pote } from '../src/planche/prototype/scenario';
import type { Verdict } from '../src/regles/jugement';
import type { Nouvelle } from '../src/regles/messages';
import { mouvementsDuClassement, partieA, type EvenementDePartie } from '../src/regles/partie';
import { jouer, type ActionDePiste } from '../src/regles/piste';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { lOrdreDeLaPlaylist } from '../src/serveur/ordre';

const PAS = 0.1;
/** Ce que toi met entre deux réponses, et après le départ de l'extrait avant la première ; ce que dure le hit-parade avant la suivante. */
const [AVANT_DE_REPONDRE, ENTRE_DEUX, HIT_PARADE] = [2, 3, 4];

function jouerLaPartie(mode: 'libre' | 'quatreChoix') {
  let heure = 0;
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(1987).suivant,
    ordre: lOrdreDeLaPlaylist,
    jeton: (() => {
      let n = 0;
      return () => `jeton-${++n}`;
    })(),
    playlist: (lien) => (lien === SCENARIO.playlist ? PLAYLIST_DU_PROTOTYPE : undefined),
  });
  const exemple = joueursDExemple(TEXTES);
  const pochetteDe = (id: string) => exemple.find((j) => j.id === id)?.pochette ?? exemple[0]!.pochette;
  const toi = {
    journal: [] as EvenementDePartie[],
    vus: [] as EvenementDePartie[],
    seance: [] as ActionDePiste[],
    code: '',
    id: '',
    verdicts: [] as Verdict[][],
  };
  const connexion = serveur.connecter((n: Nouvelle) => {
    if (n.genre === 'etat') Object.assign(toi, { journal: [...n.journal], seance: [...n.seance], code: n.code, id: n.toi });
    if (n.genre === 'evenement') {
      toi.journal.push(n.evenement);
      toi.vus.push(n.evenement);
      const e = n.evenement;
      if (e.genre === 'jugee' && e.id === toi.id) toi.verdicts[toi.verdicts.length - 1]?.push(e.verdict);
    }
    if (n.genre === 'piste') toi.seance = n.action.genre === 'lancer' ? [n.action] : [...toi.seance, n.action];
  });
  connexion.envoyer({ genre: 'creer', mode, ...SCENARIO.reglages, playlist: SCENARIO.playlist, pochette: pochetteDe('toi') });
  const pochettes = Object.fromEntries(SCENARIO.arrivees.map(({ qui }) => [qui, pochetteDe(qui)])) as Record<Pote, ReturnType<typeof pochetteDe>>;
  const potes = inviterLesPotes(serveur, toi.code, 0, pochettes, mode);

  // Toi : lance la piste quand tout le monde est là, puis chaque suivante après le hit-parade ; répond ce que dit le scénario.
  let numero = -1;
  let lanceeA = 8;
  let repondues = 0;
  const avant: ReturnType<typeof partieA>[] = [];
  const faces: ReturnType<typeof partieA>[] = [];
  for (; heure < 400; heure = Math.round((heure + PAS) * 10) / 10) {
    potes.avancer(heure);
    serveur.avancer();
    const etat = partieA(toi.journal, Infinity);
    const piste = toi.seance.reduce(jouer, undefined);
    if (heure >= lanceeA && (piste === undefined || piste.revelation !== undefined) && etat.phase !== 'fin') {
      connexion.envoyer({ genre: 'lancer' });
      connexion.envoyer({ genre: 'pret' });
      numero++;
      repondues = 0;
      toi.verdicts.push([]);
      lanceeA = Infinity;
      continue;
    }
    if (piste?.extraitA !== undefined && piste.revelation === undefined) {
      if (avant.length <= numero) avant.push(partieA(toi.journal, piste.extraitA - PAS));
      const reponses = SCENARIO.pistes[numero]?.toi ?? [];
      const r = reponses[repondues];
      if (r !== undefined && heure >= piste.extraitA + AVANT_DE_REPONDRE + repondues * ENTRE_DEUX) {
        connexion.envoyer({
          genre: 'repondre',
          proposition: mode === 'libre' ? { genre: 'saisie', texte: r.libre } : { genre: 'choix', rang: r.choix },
        });
        repondues++;
      }
    }
    if (piste?.revelation !== undefined && lanceeA === Infinity) lanceeA = piste.revelation.a + HIT_PARADE;
    if (etat.phase === 'fin' && faces.length === 0) {
      faces.push(etat);
      connexion.envoyer({ genre: 'rejouer' });
      lanceeA = heure + HIT_PARADE;
    }
  }
  return { serveur, toi, avant, room: serveur.room(toi.code), faces };
}

for (const mode of ['libre', 'quatreChoix'] as const) {
  test(`la partie scénarisée, en ${mode === 'libre' ? 'saisie libre' : '4 choix'}, passe par chaque état du brief`, () => {
    const { toi, avant, room, faces } = jouerLaPartie(mode);
    assert.ok(room !== undefined);
    const [a1, a2, a3] = toi.verdicts;
    // Une bonne réponse ; « Presque. » puis « Rayé. » (en 4 choix, une mauvaise étiquette est rayée) ; « Rayé. » encore.
    assert.deepEqual(a1, mode === 'libre' ? ['juste', 'juste'] : ['juste'], 'piste 1');
    assert.deepEqual(a2, mode === 'libre' ? ['presque', 'faux'] : ['faux', 'faux'], 'piste 2');
    assert.deepEqual(a3, ['faux'], 'piste 3');
    // La face A, à sa fin : personne n'a trouvé la troisième piste.
    const [finDeLaFaceA] = faces;
    assert.deepEqual(finDeLaFaceA?.trouvees, [true, true, false], 'une piste où personne ne trouve');
    const faceA = avant[2];
    assert.ok(faceA !== undefined);
    // MC a perdu sa connexion pendant la deuxième piste, et il est revenu pendant le hit-parade.
    const idDe = (qui: Pote) => SCENARIO.arrivees.findIndex((p) => p.qui === qui);
    const ids = partieA(toi.journal, Infinity).joueurs.map((j) => j.id);
    const mc = ids[idDe('mc') + 1];
    const [dj, lady] = [ids[idDe('dj') + 1], ids[idDe('lady') + 1]];
    assert.ok(mc !== undefined && dj !== undefined && lady !== undefined);
    // Le journal de la face B commence après « Rejouer » : on retrouve la face A dans les états d'avant chaque piste.
    const apresLaDeuxieme = faceA;
    const mouvements = mouvementsDuClassement(avant[1]!, apresLaDeuxieme);
    assert.equal(mouvements[dj]?.genre, 'monte', 'DJ double Lady au hit-parade de la deuxième piste');
    assert.equal(mouvements[lady]?.genre, 'descend');
    assert.equal(apresLaDeuxieme.joueurs.find((j) => j.id === mc)?.connecte, true, 'MC est revenu avant la troisième');
    const parti = toi.vus.findIndex((e) => e.genre === 'deconnexion' && e.id === mc);
    const revenu = toi.vus.findIndex((e) => e.genre === 'retour' && e.id === mc);
    assert.ok(parti >= 0 && revenu > parti, 'la connexion de MC tombe, puis revient');
    // « Rejouer la face B » : une nouvelle partie, avec les mêmes, et la face B qui commence.
    const etat = partieA(toi.journal, Infinity);
    assert.deepEqual(
      etat.joueurs.map((j) => j.id),
      ids,
    );
    assert.ok(etat.pistesJouees >= 1, 'la face B se joue');
  });
}
