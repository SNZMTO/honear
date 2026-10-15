/**
 * Le son au téléphone : ce que la mémoire dit de jouer, et quand. Rien tant que l'ampli est éteint ; l'extrait de la piste lancée,
 * préchargé pendant le décompte, qui part à l'heure du serveur et se tait quand l'écran de la piste s'en va ; chez l'hôte seul,
 * s'il joue le son pour tous. Un téléphone qui a un extrait à charger ne se dit prêt qu'une fois qu'il l'a chargé.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aLaNouvelle, MEMOIRE_VIDE, memoireDeDepart, recevoir, toucher, type Memoire, type Preparatifs } from '../src/ecran/telephone/memoire';
import { ecranDuTelephone } from '../src/ecran/telephone/route';
import { aRemettreEnPlace, sonVoulu, volumeA } from '../src/ecran/telephone/son';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import type { Action, Connexion } from '../src/regles/messages';
import type { PisteDuMode } from '../src/regles/modes';
import type { SonDeLaRoom } from '../src/regles/partie';
import { DUREE_DU_DECOMPTE } from '../src/regles/piste';
import { TELEPHONE } from '../src/ressources/ecran';
import { REGLAGES } from '../src/ressources/reglages';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { PISTES_D_ESSAI } from '../src/serveur/sources/essai';
import { lOrdreDeLaPlaylist } from '../src/serveur/ordre';

const POCHETTE = pochetteDExemple(TEXTES);
/** La playlist d'essai, chaque piste avec son extrait, comme Deezer les donne. */
const AVEC_EXTRAITS: PisteDuMode[] = PISTES_D_ESSAI.map((p, k) => ({ ...p, extrait: `https://cdnt-preview.dzcdn.net/api/1/1/${k}.mp3` }));

const PREPARATIFS: Preparatifs = {
  mode: 'libre',
  pistes: REGLAGES.pistes.defaut,
  extrait: REGLAGES.extrait.defaut,
  son: 'tous',
  commandes: true,
  playlist: 'deezer:1',
  chercher: true,
  listes: TEXTES.pochette,
  graine: 7,
};

/** Une room de deux, sur un serveur dont on tient l'heure : l'hôte et un invité, chacun avec sa mémoire et ce qu'il a envoyé. */
function uneRoom(son: SonDeLaRoom, pistes: readonly PisteDuMode[] = AVEC_EXTRAITS) {
  const horloge = { t: 0 };
  const serveur = demarrerLeServeur({
    maintenant: () => horloge.t,
    tirage: hasard(3).suivant,
    ordre: lOrdreDeLaPlaylist,
    jeton: (() => {
      let n = 0;
      return () => `jeton-${++n}`;
    })(),
    playlist: () => pistes,
  });
  const unTelephone = () => {
    const t = { m: MEMOIRE_VIDE as Memoire, envoyees: [] as Action[], connexion: undefined as Connexion | undefined };
    t.connexion = serveur.connecter((n) => {
      const avant = t.m;
      t.m = recevoir(t.m, n);
      for (const action of aLaNouvelle(avant, t.m)) {
        t.envoyees.push(action);
        t.connexion?.envoyer(action);
      }
    });
    return t;
  };
  const hote = unTelephone();
  hote.connexion?.envoyer({ genre: 'creer', mode: 'libre', pistes: 10, extrait: 20, son, playlist: 'deezer:1', pochette: POCHETTE });
  const code = hote.m.room?.code ?? '';
  const invite = unTelephone();
  invite.connexion?.envoyer({ genre: 'rejoindre', code, pochette: POCHETTE });
  return { serveur, horloge, hote, invite };
}

test('dans la room, l’ampli est allumé d’office : l’extrait de la piste lancée se précharge, part à l’heure du serveur, et se tait après la réponse', () => {
  const { serveur, horloge, hote, invite } = uneRoom('tous');
  hote.connexion?.envoyer({ genre: 'lancer' });
  assert.match(hote.m.room?.extrait ?? '', /0\.mp3$/);
  assert.ok(hote.m.ampliAllumeA !== undefined, 'l’ampli s’allume en entrant dans la room');

  // Pendant le décompte, il a un extrait à charger : il le précharge, et ne se dira prêt qu'une fois chargé.
  const prechargement = sonVoulu(hote.m);
  assert.equal(prechargement?.adresse, hote.m.room?.extrait);
  assert.equal(prechargement?.depuis, undefined, 'pendant le décompte, on précharge');
  assert.equal(prechargement?.lanceeA, 0);

  // Les deux se disent prêts (le haut-parleur l'aurait dit, l'extrait chargé) : l'extrait a son heure.
  horloge.t = 1;
  hote.connexion?.envoyer({ genre: 'pret' });
  invite.connexion?.envoyer({ genre: 'pret' });
  const enRoute = sonVoulu(hote.m);
  assert.equal(enRoute?.depuis, DUREE_DU_DECOMPTE);
  assert.equal(enRoute?.jusqua, undefined);
  assert.equal(volumeA(enRoute!, DUREE_DU_DECOMPTE + 1), 1);

  // La fin de l'extrait : la révélation ; le son se tait quand l'écran de la piste s'en va, en baissant d'abord.
  horloge.t = DUREE_DU_DECOMPTE + 21;
  serveur.avancer();
  const revele = sonVoulu(hote.m);
  assert.ok(revele?.jusqua !== undefined && revele.jusqua > horloge.t, 'il joue encore pendant la révélation');
  const jusqua = revele.jusqua;
  assert.equal(volumeA(revele, jusqua - TELEPHONE.son.fondu), 1);
  assert.ok(Math.abs(volumeA(revele, jusqua - TELEPHONE.son.fondu / 2) - 0.5) < 1e-9);
  assert.equal(volumeA(revele, jusqua), 0);
  // C'est l'heure où l'écran de la piste cède la place au hit-parade.
  assert.notEqual(ecranDuTelephone(hote.m, jusqua - TELEPHONE.son.fondu, PREPARATIFS, TEXTES).genre, 'hitParade');
  assert.equal(ecranDuTelephone(hote.m, jusqua, PREPARATIFS, TEXTES).genre, 'hitParade');
});

test('quand l’hôte joue le son pour tous, l’invité ne joue rien et se dit prêt d’emblée ; sans extrait, chacun se dit prêt d’emblée', () => {
  const pourTous = uneRoom('hote');
  pourTous.invite.m = toucher(pourTous.invite.m, { genre: 'allumer' }, 0, PREPARATIFS).memoire;
  pourTous.hote.m = toucher(pourTous.hote.m, { genre: 'allumer' }, 0, PREPARATIFS).memoire;
  pourTous.hote.connexion?.envoyer({ genre: 'lancer' });
  assert.equal(sonVoulu(pourTous.invite.m), undefined);
  assert.ok(sonVoulu(pourTous.hote.m) !== undefined);
  assert.deepEqual(pourTous.invite.envoyees, [{ genre: 'pret' }]);
  assert.deepEqual(pourTous.hote.envoyees, [], 'l’hôte attend d’avoir chargé l’extrait');

  const sansExtrait = uneRoom('tous', PISTES_D_ESSAI);
  sansExtrait.hote.m = toucher(sansExtrait.hote.m, { genre: 'allumer' }, 0, PREPARATIFS).memoire;
  sansExtrait.hote.connexion?.envoyer({ genre: 'lancer' });
  assert.equal(sonVoulu(sansExtrait.hote.m), undefined);
  assert.deepEqual(sansExtrait.hote.envoyees, [{ genre: 'pret' }]);
});

test('un téléphone rechargé l’ampli allumé le retrouve allumé, sans s’y attarder ; il repart sur la piste en cours', () => {
  const { hote, horloge } = uneRoom('tous');
  hote.m = toucher(hote.m, { genre: 'allumer' }, 0, PREPARATIFS).memoire;
  hote.connexion?.envoyer({ genre: 'lancer' });
  const room = hote.m.room;
  assert.ok(room !== undefined);
  const recharge = memoireDeDepart(PREPARATIFS, { reprise: { code: room.code, jeton: room.jeton, pochette: POCHETTE, ampli: true } });
  assert.equal(recharge.ampliAllumeA, -Infinity);
  const revenu = recevoir(recharge, {
    genre: 'etat',
    heure: horloge.t,
    code: room.code,
    toi: room.toi,
    jeton: room.jeton,
    journal: room.journal,
    seance: room.seance,
    extrait: room.extrait ?? '',
  });
  assert.equal(sonVoulu(revenu)?.adresse, room.extrait);
  assert.notEqual(ecranDuTelephone(revenu, horloge.t, PREPARATIFS, TEXTES).genre, 'ampli');
  // Sans l'ampli gardé, il revient éteint.
  assert.equal(memoireDeDepart(PREPARATIFS, { reprise: { code: room.code, jeton: room.jeton, pochette: POCHETTE } }).ampliAllumeA, undefined);
});

test('un extrait qui dérive n’est remis à sa place que s’il le faut : jamais pour un petit écart sur un iPhone, ni quand il attend ses données', () => {
  const S = TELEPHONE.son;
  const joue = { surIOS: false, enRecherche: false, aDeQuoiJouer: true, depuis: undefined };
  assert.equal(aRemettreEnPlace(S.ecartAdmis / 2, joue), false, 'un petit écart reste');
  assert.equal(aRemettreEnPlace(-(S.ecartAdmis + 0.1), joue), true, 'en retard de plus que l’écart admis : remis en place');
  assert.equal(aRemettreEnPlace(S.ecartAdmis + 0.1, { ...joue, depuis: S.entreDeuxSauts / 2 }), false, 'pas coup sur coup');
  assert.equal(aRemettreEnPlace(S.ecartAdmis + 0.1, { ...joue, depuis: S.entreDeuxSauts }), true);
  assert.equal(
    aRemettreEnPlace(S.ecartAdmis + 0.1, { ...joue, aDeQuoiJouer: false }),
    false,
    'il attend ses données : le pousser plus loin le ferait attendre encore',
  );
  assert.equal(aRemettreEnPlace(S.ecartAdmis + 0.1, { ...joue, enRecherche: true }), false);
  // Safari coupe le son à chaque position qu'on lui donne en pleine lecture : sur un iPhone, seulement un grand écart.
  assert.equal(aRemettreEnPlace(-(S.ecartAdmis + 0.1), { ...joue, surIOS: true }), false);
  assert.equal(aRemettreEnPlace(-(S.ecartAdmisSurIOS + 0.1), { ...joue, surIOS: true }), true);
});
