/**
 * Sa pochette, quand on veut : son nom d'artiste qu'on tape sur l'étiquette, « Au hasard » qui le laisse, la pochette qu'on rouvre à
 * l'accueil ou dans la room entre deux pistes, et que tous voient changer ; ce que le serveur en garde, et ce qu'il refuse.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { memoireDeDepart, recevoir, revenir, saisir, toucher, valider, type Memoire, type Preparatifs } from '../src/ecran/telephone/memoire';
import { ecranDuTelephone } from '../src/ecran/telephone/route';
import { pochetteDExemple } from '../src/planche/exemples';
import { lireUneAction, type Action, type Nouvelle } from '../src/regles/messages';
import { partieA } from '../src/regles/partie';
import { nomTape, NOM_AU_PLUS } from '../src/regles/pochette';
import { PARTIE } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';

const POCHETTE = pochetteDExemple(TEXTES);
const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;

const P: Preparatifs = {
  mode: 'libre',
  pistes: 3,
  extrait: 20,
  son: 'tous',
  commandes: false,
  chercher: false,
  playlist: 'bac',
  listes: TEXTES.pochette,
  graine: 7,
};

/** Ce que fait une suite de touchers, depuis cette mémoire : la mémoire d'après, et tout ce qui est parti. */
function suite(m: Memoire, touchers: readonly Parameters<typeof toucher>[1][]): { memoire: Memoire; actions: Action[] } {
  const actions: Action[] = [];
  for (const t of touchers) {
    const s = toucher(m, t, 0, P);
    m = s.memoire;
    actions.push(...s.actions);
  }
  return { memoire: m, actions };
}

const pochetteDe = (m: Memoire) => (m.preparation.ecran === 'pochette' ? m.preparation.pochette : undefined);

test('un nom tapé : sans pictogramme ni caractère de commande, les espaces resserrées, coupé à ce que la grande pochette imprime', () => {
  assert.equal(nomTape('  DJ   Mateo 🎧\u0007'), 'DJ Mateo ');
  assert.equal(nomTape('Zoé & les Ça-va'), 'Zoé & les Ça-va');
  const long = nomTape('é'.repeat(80));
  assert.equal(long.length, NOM_AU_PLUS);
  // Un signe en deux morceaux (hors du plan de base) ne se coupe pas en deux.
  assert.equal(nomTape(`${'a'.repeat(NOM_AU_PLUS - 1)}𝒜`), 'a'.repeat(NOM_AU_PLUS - 1));
});

test('« Fais ta pochette » : on tape son nom, « Au hasard » le laisse ; sans nom, « C’est moi » garde celui du hasard', () => {
  let m = toucher(memoireDeDepart(P, {}), { genre: 'poser' }, 0, P).memoire;
  m = saisir(m, 'MC Mateo');
  assert.equal(pochetteDe(m)?.artiste, 'MC Mateo');
  assert.deepEqual(valider(m, 0, P), { memoire: m, actions: [] }, 'valider le nom ne fait rien partir');
  const avant = pochetteDe(m);
  m = toucher(m, { genre: 'auHasard' }, 0, P).memoire;
  assert.equal(pochetteDe(m)?.artiste, 'MC Mateo');
  assert.notDeepEqual(pochetteDe(m), avant, 'le reste a changé');
  // Un nom tiré au sort, lui, se tire de nouveau.
  const tire = toucher(memoireDeDepart(P, {}), { genre: 'poser' }, 0, P).memoire;
  const retire = toucher(tire, { genre: 'auHasard' }, 0, P).memoire;
  assert.ok(TEXTES.pochette.artistes.includes(pochetteDe(retire)?.artiste ?? ''));
  // Un nom effacé : la pochette garde celui que le hasard avait donné.
  const vide = saisir(tire, '   ');
  const hote = toucher(vide, { genre: 'cEstMoi' }, 0, P).memoire;
  assert.ok(hote.pochette !== undefined && TEXTES.pochette.artistes.includes(hote.pochette.artiste));
  // Le nom part sans ses espaces du bout.
  const mien = toucher(saisir(tire, 'Tata Mateo '), { genre: 'cEstMoi' }, 0, P).memoire;
  assert.equal(mien.pochette?.artiste, 'Tata Mateo');
  // L'étiquette du nom est un champ où l'on tape.
  const e = ecranDuTelephone(m, 0, P, TEXTES);
  assert.equal(e.genre === 'pochette' && e.retouche, false);
});

test('à l’accueil, « Ma pochette » la rouvre ; « Retour » la laisse ; « C’est moi » la garde, et la dit au compte s’il y en a un', () => {
  const depart = memoireDeDepart(P, { pochette: POCHETTE });
  const ouverte = suite(depart, [{ genre: 'maPochette' }]).memoire;
  assert.deepEqual(pochetteDe(ouverte), POCHETTE);
  const e = ecranDuTelephone(ouverte, 0, P, TEXTES);
  assert.equal(e.genre === 'pochette' && e.retouche, true);
  const laissee = suite(ouverte, [{ genre: 'auHasard' }, { genre: 'laisserLaPochette' }]).memoire;
  assert.deepEqual(laissee.preparation, { ecran: 'accueil' });
  assert.deepEqual(laissee.pochette, POCHETTE);
  const gardee = suite(saisir(ouverte, 'Baron Mateo'), [{ genre: 'cEstMoi' }]);
  assert.equal(gardee.memoire.pochette?.artiste, 'Baron Mateo');
  assert.deepEqual(gardee.memoire.preparation, { ecran: 'accueil' });
  assert.deepEqual(gardee.actions, [], 'sans room ni compte, rien ne part');
  const sousUnCompte: Memoire = { ...ouverte, compte: { email: 'a@b.fr', parties: 0, victoires: 0 } };
  assert.deepEqual(suite(sousUnCompte, [{ genre: 'cEstMoi' }]).actions, [{ genre: 'changerDePochette', pochette: POCHETTE }]);
});

test('dans la room, on refait sa pochette entre deux pistes : tous la voient changer, et le téléphone y revient avec elle', () => {
  let heure = 0;
  let jetons = 0;
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(3).suivant,
    jeton: () => `jeton-${++jetons}`,
    playlist: (lien) =>
      lien === 'bac' ? Array.from({ length: 5 }, (_, i) => ({ reponse: { titre: `T${i}`, artiste: 'A', pochette: vignette } })) : undefined,
  });
  /** Un téléphone : sa mémoire, qui rejoue ce que le serveur lui dit. */
  const telephone = () => {
    const t = { memoire: memoireDeDepart(P, {}), connexion: undefined as unknown as ReturnType<typeof serveur.connecter> };
    t.connexion = serveur.connecter((n: Nouvelle) => {
      t.memoire = recevoir(t.memoire, n);
    });
    const agir = (touchers: readonly Parameters<typeof toucher>[1][]): void => {
      const s = suite(t.memoire, touchers);
      t.memoire = s.memoire;
      for (const a of s.actions) t.connexion.envoyer(a);
    };
    return { t, agir };
  };
  const hote = telephone();
  const invite = telephone();
  hote.t.connexion.envoyer({ genre: 'creer', mode: 'libre', pistes: 3, extrait: 20, son: 'tous', playlist: 'bac', pochette: POCHETTE });
  const code = hote.t.memoire.room?.code ?? '';
  invite.t.connexion.envoyer({ genre: 'rejoindre', code, pochette: POCHETTE });
  heure = 2;
  // Au salon, l'invité rouvre sa pochette : c'est celle que la room connaît.
  invite.agir([{ genre: 'maPochette' }]);
  assert.equal(ecranDuTelephone(invite.t.memoire, heure, P, TEXTES).genre, 'pochette');
  invite.t.memoire = saisir(invite.t.memoire, 'Lady Mateo');
  invite.agir([{ genre: 'cEstMoi' }]);
  assert.equal(ecranDuTelephone(invite.t.memoire, heure, P, TEXTES).genre, 'salon');
  const toi = invite.t.memoire.room?.toi;
  const chezLHote = partieA(hote.t.memoire.room?.journal ?? [], Infinity).joueurs.find((j) => j.id === toi);
  assert.equal(chezLHote?.pochette.artiste, 'Lady Mateo', 'l’hôte la voit changer');
  assert.equal(invite.t.memoire.pochette?.artiste, 'Lady Mateo', 'le téléphone la garde');
  // La même pochette, renvoyée, n'ajoute rien au journal ; au-delà de ce qu'on admet, rien non plus.
  const longueur = (): number => serveur.room(code)?.journal.length ?? 0;
  const avant = longueur();
  invite.t.connexion.envoyer({ genre: 'changerDePochette', pochette: invite.t.memoire.pochette ?? POCHETTE });
  assert.equal(longueur(), avant);
  for (let i = 0; i < PARTIE.retouches + 5; i++)
    invite.t.connexion.envoyer({ genre: 'changerDePochette', pochette: { ...POCHETTE, album: `Album ${i}` } });
  assert.equal(longueur(), avant + PARTIE.retouches - 1);
  // Le téléphone qui revient (la ligne tombée) redonne la pochette que la room voit, pas celle de son arrivée.
  const retour = revenir(invite.t.memoire);
  assert.equal(retour?.genre === 'rejoindre' && retour.pochette.album, `Album ${PARTIE.retouches - 2}`);
});

test('le serveur ne lit qu’une pochette bien formée', () => {
  assert.deepEqual(lireUneAction({ genre: 'changerDePochette', pochette: POCHETTE }), { genre: 'changerDePochette', pochette: POCHETTE });
  assert.equal(lireUneAction({ genre: 'changerDePochette', pochette: { ...POCHETTE, artiste: 'x'.repeat(41) } }), undefined);
  assert.equal(lireUneAction({ genre: 'changerDePochette', pochette: { ...POCHETTE, fond: 'fluo' } }), undefined);
  assert.equal(lireUneAction({ genre: 'changerDePochette' }), undefined);
});
