/**
 * Le téléphone, sans navigateur : sa mémoire et ses écrans, contre le serveur et les cinq potes du prototype. Toi fais ce qu'un
 * joueur ferait en touchant ce que montre l'écran ; le téléphone ne sait que ce que le serveur lui dit. On vérifie qu'il passe par
 * chaque écran, dans l'ordre, qu'il montre « Presque. », « Rayé. », la piste où personne ne trouve et la face B, qu'il ne connaît
 * jamais la réponse avant sa révélation, et qu'il finit sur le même classement que le serveur.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  aLaNouvelle,
  avancer,
  BAC_VIDE,
  laReponseEstPartie,
  MEMOIRE_VIDE,
  memoireDeDepart,
  recevoir,
  revenir,
  saisir,
  toucher,
  valider,
  type Memoire,
  type Preparatifs,
  type Toucher,
} from '../src/ecran/telephone/memoire';
import { ecranDuTelephone, type EcranDuTelephone } from '../src/ecran/telephone/route';
import { choseATouche } from '../src/ecran/telephone/touchers';
import { hasard } from '../src/lowpoly/aleatoire';
import { joueursDExemple } from '../src/planche/etape5/scenes';
import { inviterLesPotes, type Potes } from '../src/planche/prototype/potes';
import { PLAYLIST_DU_PROTOTYPE, SCENARIO, type Pote } from '../src/planche/prototype/scenario';
import { REPONSE_MASQUEE, type Action, type Nouvelle } from '../src/regles/messages';
import { hitParade } from '../src/regles/partie';
import type { Pochette } from '../src/ressources/pochettes';
import { TEXTES } from '../src/ressources/textes.fr';
import { vueDeLAccueil, vueDeLaSaisie, vueDuHitParade, vueDuSalon } from '../src/scene/telephone/ecrans';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { ENCRIER } from './planche';
import { lOrdreDeLaPlaylist } from '../src/serveur/ordre';

const PAS = 0.05;
const A = { textes: TEXTES, encrier: ENCRIER };

/** Le classement d'un état : chacun, et ses points, du premier au dernier. */
const classement = (etat: Parameters<typeof hitParade>[0]): [string, number][] => hitParade(etat).map(({ joueur }) => [joueur.id, joueur.points]);

function preparatifs(mode: 'libre' | 'quatreChoix'): Preparatifs {
  return {
    mode,
    ...SCENARIO.reglages,
    commandes: false,
    chercher: false,
    playlist: SCENARIO.playlist,
    listes: TEXTES.pochette,
    graine: 2026,
    clavier: {
      code: () => 'FUNK',
      nom: () => 'MC Test',
      reponse: ({ face, numero }, deja) => SCENARIO.pistes[(face === 'B' ? SCENARIO.reglages.pistes : 0) + numero - 1]?.toi[deja]?.libre,
    },
  };
}

/** Une partie jouée au téléphone : ce que toi touche à chaque écran, jusqu'à la face B. Rend tout ce que le téléphone a montré. */
function jouerAuTelephone(mode: 'libre' | 'quatreChoix') {
  let heure = 0;
  const serveur = demarrerLeServeur({
    maintenant: () => heure,
    tirage: hasard(1987).suivant,
    // Les pistes dans l'ordre de la playlist : les tests savent laquelle vient.
    ordre: lOrdreDeLaPlaylist,
    jeton: (() => {
      let n = 0;
      return () => `jeton-${++n}`;
    })(),
    playlist: (lien) => (lien === SCENARIO.playlist ? PLAYLIST_DU_PROTOTYPE : undefined),
  });
  const exemple = joueursDExemple(TEXTES);
  const pochettes = Object.fromEntries(
    SCENARIO.arrivees.map(({ qui }) => [qui, exemple.find((j) => j.id === qui)?.pochette ?? exemple[0]!.pochette]),
  ) as Record<Pote, Pochette>;
  const p = preparatifs(mode);
  let m: Memoire = MEMOIRE_VIDE;
  let potes: Potes | undefined;
  const recues: Nouvelle[] = [];
  const connexion = serveur.connecter((n) => {
    recues.push(n);
    if (n.genre === 'etat' && potes === undefined) potes = inviterLesPotes(serveur, n.code, n.heure, pochettes, mode);
    const avant = m;
    m = recevoir(m, n);
    for (const action of aLaNouvelle(avant, m)) connexion.envoyer(action);
  });
  const faire = (t: Toucher): void => {
    const suite = toucher(m, t, heure, p);
    m = suite.memoire;
    for (const action of suite.actions) connexion.envoyer(action as Action);
  };

  const ecrans: EcranDuTelephone[] = [];
  const genres: string[] = [];
  let derniereAction = -Infinity;
  /** Toi touche une chose à la fois, et laisse passer un peu de temps entre deux. */
  const quand = (attente: number, t: Toucher): void => {
    if (heure - derniereAction < attente) return;
    derniereAction = heure;
    faire(t);
  };
  let faceB = false;
  /** Le classement que le serveur tenait quand le téléphone a montré la finale. */
  let classementDuServeur: [string, number][] | undefined;
  for (let pas = 0; pas < 6000 && !(faceB && genres[genres.length - 1] === 'salon'); pas++) {
    heure = pas * PAS;
    serveur.avancer();
    potes?.avancer(heure);
    const suite = avancer(m, heure);
    m = suite.memoire;
    for (const action of suite.actions) connexion.envoyer(action);
    const e = ecranDuTelephone(m, heure, p, TEXTES);
    ecrans.push(e);
    if (genres[genres.length - 1] !== e.genre) genres.push(e.genre);
    switch (e.genre) {
      case 'accueil':
        quand(0.5, { genre: 'poser' });
        break;
      case 'pochette':
        quand(
          0.5,
          e.choisi === 'dessus'
            ? { genre: 'ouvrirLeChoix', choix: 'tete' }
            : e.pochette.artiste === ''
              ? { genre: 'taperLeNom' }
              : { genre: 'cEstMoi' },
        );
        break;
      case 'bac':
        quand(0.5, { genre: 'choisir' });
        break;
      case 'reglages':
        quand(0.5, { genre: 'ouvrir' });
        break;
      case 'salon':
        if (e.etat.face === 'B') faceB = true;
        else if (e.etat.joueurs.length === 6) quand(1, { genre: 'lancer' });
        break;
      case 'piste':
        if (e.pouce === 'saisie') quand(2, { genre: 'taper' });
        if (e.pouce === 'choix') quand(2, { genre: 'toucherLEtiquette', rang: SCENARIO.pistes[e.numero.numero - 1]?.toi[0]?.choix ?? 0 });
        break;
      case 'hitParade':
        quand(3, { genre: 'lancer' });
        break;
      case 'finale': {
        const room = m.room !== undefined ? serveur.room(m.room.code) : undefined;
        if (classementDuServeur === undefined && room !== undefined) classementDuServeur = classement(room.etat);
        quand(3, { genre: 'rejouer' });
        break;
      }
      default:
        break;
    }
  }
  return { ecrans, genres, recues, classementDuServeur };
}

test('au téléphone, la partie passe par chaque écran, dans l’ordre, jusqu’à la face B', () => {
  const { genres } = jouerAuTelephone('libre');
  assert.deepEqual(genres, [
    'accueil',
    'pochette',
    'bac',
    'reglages',
    'salon',
    'piste',
    'hitParade',
    'piste',
    'hitParade',
    'piste',
    'finale',
    'salon',
  ]);
});

test('le téléphone montre ce que le serveur juge : « Presque. », « Rayé. », la piste où personne ne trouve, puis la vraie pochette', () => {
  const { ecrans } = jouerAuTelephone('libre');
  const pistes = ecrans.filter((e): e is Extract<EcranDuTelephone, { genre: 'piste' }> => e.genre === 'piste');
  const mots = new Set(
    pistes.flatMap((e) => (e.autour.repondre.genre === 'saisie' && e.autour.repondre.mot !== undefined ? [e.autour.repondre.mot] : [])),
  );
  assert.deepEqual([...mots].sort(), [TEXTES.pastilles.presque, TEXTES.piste.raye].sort());
  // Une mauvaise réponse raye le disque de toi, et de toi seul : la scène le sait par le journal.
  assert.ok(pistes.some((e) => e.scene.rayuresA.length > 0));
  assert.ok(pistes.some((e) => e.autour.phrase === TEXTES.etats.personne && e.autour.revelee !== undefined));
  assert.deepEqual(
    new Set(pistes.flatMap((e) => (e.autour.revelee !== undefined ? [e.autour.revelee.titre] : []))),
    new Set(SCENARIO.pistes.slice(0, 3).map((p) => p.attendue.reponse.titre)),
  );
  // Le clavier tape, lettre après lettre, avant que la réponse ne parte.
  assert.ok(pistes.some((e) => e.autour.repondre.genre === 'saisie' && e.autour.repondre.clavier && e.autour.repondre.tape.length > 0));
  // Le clavier qui tape tout seul envoie sa réponse comme le pouce : l'étiquette s'enfonce un instant.
  assert.ok(pistes.some((e) => e.autour.repondre.genre === 'saisie' && e.autour.repondre.enfoncee === true));
});

test('le téléphone ne sait jamais la réponse avant sa révélation, et finit sur le classement du serveur', () => {
  for (const mode of ['libre', 'quatreChoix'] as const) {
    const { ecrans, recues, classementDuServeur } = jouerAuTelephone(mode);
    for (const n of recues) {
      const evenements = n.genre === 'etat' ? n.journal : n.genre === 'evenement' ? [n.evenement] : [];
      for (const e of evenements) if (e.genre === 'extrait') assert.deepEqual(e.piste.reponse, REPONSE_MASQUEE, mode);
      for (const e of evenements) assert.notEqual(e.genre, 'reponse', `${mode} : une réponse tapée a été publiée`);
    }
    for (const e of ecrans) if (e.genre === 'piste' && e.scene.piste?.revelation === undefined) assert.equal(e.autour.revelee, undefined, mode);
    // La finale du téléphone a le classement que le serveur tenait au même instant : il l'a rejoué de son journal publié.
    const finale = ecrans.find((e): e is Extract<EcranDuTelephone, { genre: 'finale' }> => e.genre === 'finale');
    assert.ok(finale !== undefined && classementDuServeur !== undefined, mode);
    assert.deepEqual(classement(finale.etat), classementDuServeur, mode);
    assert.ok(
      classementDuServeur.some(([, points]) => points > 0),
      mode,
    );
  }
});

test('en 4 choix, toi touche une étiquette tendue ; ensuite, plus rien n’est à toucher jusqu’à la piste suivante', () => {
  const { ecrans } = jouerAuTelephone('quatreChoix');
  const pistes = ecrans.filter((e): e is Extract<EcranDuTelephone, { genre: 'piste' }> => e.genre === 'piste');
  assert.ok(pistes.some((e) => e.pouce === 'choix'));
  assert.ok(pistes.some((e) => e.autour.repondre.genre === 'choix' && e.autour.repondre.touchee !== undefined && e.pouce === undefined));
  assert.ok(pistes.every((e) => e.pouce !== 'saisie'));
});

test('ce qu’on touche sur un écran est une touche qu’il montre, et chaque zone dit ce qu’elle fait', () => {
  const { ecrans } = jouerAuTelephone('libre');
  const premier = <G extends EcranDuTelephone['genre']>(genre: G) =>
    ecrans.find((e): e is Extract<EcranDuTelephone, { genre: G }> => e.genre === genre);
  const accueil = premier('accueil');
  const salon = ecrans.find((e): e is Extract<EcranDuTelephone, { genre: 'salon' }> => e.genre === 'salon' && e.qui === 'hote');
  const hit = premier('hitParade');
  assert.ok(accueil !== undefined && salon !== undefined && hit !== undefined);
  const touchers = (objets: readonly { readonly nom: string }[], e: EcranDuTelephone) =>
    objets.flatMap((o) => {
      const chose = choseATouche(o.nom as Parameters<typeof choseATouche>[0], e, TEXTES);
      return chose !== undefined ? [`${chose.toucher.genre}:${chose.libelle}`] : [];
    });
  const maPochette = `maPochette:${TEXTES.pochette.maPochette}`;
  assert.deepEqual(touchers(vueDeLAccueil(A).objets, accueil), [`poser:${TEXTES.touches.poserUnDisque}`, `code:${TEXTES.touches.jAiUnCode}`]);
  // Les deux grandes touches d'abord, puis les petits onglets dessous : sa pochette, son compte.
  assert.deepEqual(touchers(vueDeLAccueil(A, false, true).objets, accueil), [
    `poser:${TEXTES.touches.poserUnDisque}`,
    `code:${TEXTES.touches.jAiUnCode}`,
    maPochette,
  ]);
  // Dans la room, sa propre pochette se touche, sur la tablée (et pas celle des autres) ; au salon, un cran le dit aussi ; et le papier
  // du lien se touche pour le partager.
  const partager = `partagerLeLien:${TEXTES.partie.copier}`;
  assert.deepEqual(touchers(vueDuSalon(A, salon.etat, salon.code, 'hote').objets, salon), [maPochette, partager, `lancer:${TEXTES.touches.lancer}`]);
  // L'ampli s'allume tout seul dans la room : le salon n'a plus de touche pour lui.
  assert.deepEqual(touchers(vueDuSalon(A, salon.etat, salon.code, 'hote', true).objets, salon), [
    maPochette,
    partager,
    maPochette,
    `lancer:${TEXTES.touches.lancer}`,
  ]);
  // Au hit-parade, seul l'hôte a de quoi lancer la piste suivante ; l'invité a, à sa place, sa pochette à refaire.
  assert.deepEqual(touchers(vueDuHitParade(A, hit.avant, hit.apres, true, true).objets, hit), [maPochette, `lancer:${TEXTES.touches.suivante}`]);
  assert.deepEqual(touchers(vueDuHitParade(A, hit.avant, hit.apres, false, true).objets, hit), [maPochette, maPochette]);
});

test('aux réglages, les commandes de la platine tournent : le bouton « Titres » passe de cran en cran, la manette de mode aussi, et la room s’ouvre réglée ainsi', () => {
  const p = { ...preparatifs('libre'), commandes: true, pistes: 15 };
  let m = memoireDeDepart(p, {});
  for (const t of [{ genre: 'poser' }, { genre: 'taperLeNom' }, { genre: 'cEstMoi' }, { genre: 'choisir' }] as const) m = toucher(m, t, 0, p).memoire;
  const reglages = () => (m.preparation.ecran === 'reglages' ? m.preparation : undefined);
  assert.equal(reglages()?.pistes, 15);
  m = toucher(m, { genre: 'tournerLeBouton', bouton: 'pistes' }, 0, p).memoire;
  assert.equal(reglages()?.pistes, 20);
  m = toucher(m, { genre: 'tournerLeBouton', bouton: 'pistes' }, 0, p).memoire;
  assert.equal(reglages()?.pistes, 10, 'après le dernier cran, le premier');
  m = toucher(m, { genre: 'tournerLeBouton', bouton: 'mode' }, 0, p).memoire;
  assert.equal(reglages()?.mode, 'quatreChoix');
  // Un nom gravé autour de la manette se touche : ce mode-là, d'un coup (« First one » est en haut).
  const ecran = ecranDuTelephone(m, 0, p, TEXTES);
  assert.deepEqual(choseATouche('interrupteur-mode/haut', ecran, TEXTES)?.toucher, { genre: 'choisirLeMode', mode: 'premierArrive' });
  m = toucher(m, { genre: 'choisirLeMode', mode: 'premiereNote' }, 0, p).memoire;
  assert.equal(reglages()?.mode, 'premiereNote');
  m = toucher(m, { genre: 'choisirLeMode', mode: 'quatreChoix' }, 0, p).memoire;
  const { actions } = toucher(m, { genre: 'ouvrir' }, 0, p);
  // Plus d'interrupteur du son : tous les téléphones jouent le son.
  assert.deepEqual(
    actions.map((a) => (a.genre === 'creer' ? [a.mode, a.pistes, a.son] : a.genre)),
    [['quatreChoix', 10, 'tous']],
  );
  // Réglées d'avance (la partie du prototype), elles ne tournent pas.
  const fige = toucher(m, { genre: 'tournerLeBouton', bouton: 'pistes' }, 0, { ...p, commandes: false });
  assert.equal(fige.memoire, m);
});

test('au clavier du téléphone : le code s’écrit en capitales sans les lettres qu’on confond ; une réponse part à « Envoyer » et reste écrite', () => {
  // Sans clavier qui tape tout seul : celui du téléphone.
  const { clavier: _scripte, ...p } = preparatifs('libre');
  let m = toucher(memoireDeDepart(p, {}), { genre: 'code' }, 0, p).memoire;
  m = saisir(m, 'f u n k lo');
  assert.deepEqual(m.preparation, { ecran: 'saisie', tape: 'FUNK' });
  const entree = valider(m, 0, p);
  assert.equal(entree.memoire.preparation.ecran, 'pochette');
  // Arrivé par l'adresse d'une room : droit à sa pochette, celle qu'on avait faite (avec son nom à soi).
  const exemple = joueursDExemple(TEXTES)[1]?.pochette;
  assert.ok(exemple !== undefined);
  const pochette = { ...exemple, artiste: 'Lady Mateo' };
  const venu = memoireDeDepart(p, { code: 'AENV', pochette });
  assert.deepEqual(venu.preparation.ecran === 'pochette' ? [venu.preparation.venue, venu.preparation.pochette] : [], [
    { genre: 'rejoindre', code: 'AENV' },
    pochette,
  ]);
  // Rechargé en pleine partie : il revient avec son jeton.
  const reprise = { code: 'AENV', jeton: 'secret', pochette };
  assert.deepEqual(revenir(memoireDeDepart(p, { reprise, pochette })), { genre: 'rejoindre', code: 'AENV', pochette, jeton: 'secret' });
});

test('à la saisie du code, « Retour » ramène à l’accueil, même après un code refusé', () => {
  const p = preparatifs('libre');
  const m = toucher(memoireDeDepart(p, {}), { genre: 'code' }, 0, p).memoire;
  const ecran = ecranDuTelephone(m, 0, p, TEXTES);
  const touches = vueDeLaSaisie(A, '').objets.flatMap((o) => {
    const chose = choseATouche(o.nom as Parameters<typeof choseATouche>[0], ecran, TEXTES);
    return chose !== undefined ? [chose.toucher.genre] : [];
  });
  assert.deepEqual(touches, ['taperLeCode', 'entrer', 'laisserLeCode']);
  const refuse = recevoir(m, { genre: 'refus', heure: 0, raison: 'codeInconnu' });
  assert.equal(refuse.preparation.ecran, 'saisie');
  const revenu = toucher(refuse, { genre: 'laisserLeCode' }, 0, p);
  assert.deepEqual([revenu.memoire.preparation, revenu.memoire.refus, revenu.actions], [{ ecran: 'accueil' }, undefined, []]);
});

test('dans la room, l’hôte ouvre le bac et en prend une autre : la room en change ; « Retour » le referme ; l’invité ne l’ouvre pas', () => {
  const p = preparatifs('libre');
  const pochette = joueursDExemple(TEXTES)[0]?.pochette;
  assert.ok(pochette !== undefined);
  const journal = [
    { genre: 'ouverture', a: 0, mode: 'libre', pistes: 3 },
    { genre: 'arrivee', a: 0, id: 'h', pochette },
    { genre: 'arrivee', a: 1, id: 'i', pochette },
  ] as const;
  const dans = (toi: string): Memoire =>
    recevoir(memoireDeDepart(p, {}), { genre: 'etat', heure: 1, code: 'AENV', toi, jeton: 'j', journal: [...journal], seance: [] });
  assert.equal(toucher(dans('i'), { genre: 'autrePlaylist' }, 2, p).memoire.preparation.ecran, 'accueil', 'l’invité ne l’ouvre pas');
  const ouvert = toucher(dans('h'), { genre: 'autrePlaylist' }, 2, p).memoire;
  assert.equal(ecranDuTelephone(ouvert, 2, p, TEXTES).genre, 'bac');
  assert.equal(toucher(ouvert, { genre: 'fermerLeBac' }, 2, p).memoire.preparation.ecran, 'accueil');
  const prise = toucher(ouvert, { genre: 'choisir' }, 2, p);
  assert.deepEqual(prise.actions, [{ genre: 'changerDePlaylist', playlist: SCENARIO.playlist }]);
  assert.equal(ecranDuTelephone(prise.memoire, 2, p, TEXTES).genre, 'salon');
  // Trop courte pour la face : l'hôte revient au bac, qui le dit.
  const refusee = recevoir(prise.memoire, { genre: 'refus', heure: 3, raison: 'tropCourt' });
  assert.equal(refusee.preparation.ecran === 'bac' && refusee.preparation.bac.refus, 'tropCourt');
});

test('la réponse validée part : son étiquette s’enfonce un instant, puis remonte, ce qu’on a tapé toujours écrit', () => {
  const { clavier: _scripte, ...p } = preparatifs('libre');
  const pochette = joueursDExemple(TEXTES)[0]?.pochette;
  assert.ok(pochette !== undefined);
  const piste = {
    reponse: { titre: 'Les Démons de minuit', artiste: 'Images', pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } },
  } as const;
  const journal = [
    { genre: 'ouverture', a: 0, mode: 'libre', pistes: 3 },
    { genre: 'arrivee', a: 0, id: 'toi', pochette },
    { genre: 'arrivee', a: 0, id: 'lui', pochette },
    { genre: 'extrait', a: 5, piste },
  ] as const;
  const seance = [
    { genre: 'lancer', a: 1, duree: 20 },
    { genre: 'prets', a: 2 },
  ] as const;
  let m = recevoir(memoireDeDepart(p, {}), {
    genre: 'etat',
    heure: 6,
    code: 'AENV',
    toi: 'toi',
    jeton: 'j',
    journal: [...journal],
    seance: [...seance],
  });
  m = saisir(m, 'images');
  const validee = valider(m, 6, p);
  assert.deepEqual(validee.actions, [{ genre: 'repondre', proposition: { genre: 'saisie', texte: 'images' } }]);
  const etiquette = (heure: number) => {
    const e = ecranDuTelephone(validee.memoire, heure, p, TEXTES);
    return e.genre === 'piste' && e.autour.repondre.genre === 'saisie' ? e.autour.repondre : undefined;
  };
  assert.equal(etiquette(6.05)?.enfoncee, true);
  assert.equal(etiquette(7)?.enfoncee, undefined);
  assert.equal(etiquette(7)?.tape, 'images');
});

test('ce qu’on tape va au champ que l’écran a posé : la réponse quand une piste passe avant la pochette qu’on refaisait, la recherche dans le bac de l’hôte', () => {
  const { clavier: _scripte, ...p } = { ...preparatifs('libre'), chercher: true };
  const exemple = joueursDExemple(TEXTES)[0]?.pochette;
  assert.ok(exemple !== undefined);
  const pochette = { ...exemple, artiste: 'Tata Mateo' };
  const piste = {
    reponse: { titre: 'Les Démons de minuit', artiste: 'Images', pochette: { vignette: { fond: 'lilasFume', motif: 'rayons' } } },
  } as const;
  const journal = [
    { genre: 'ouverture', a: 0, mode: 'libre', pistes: 3 },
    { genre: 'arrivee', a: 0, id: 'toi', pochette },
    { genre: 'arrivee', a: 0, id: 'lui', pochette },
    { genre: 'extrait', a: 5, piste },
  ] as const;
  const seance = [
    { genre: 'lancer', a: 1, duree: 20 },
    { genre: 'prets', a: 2 },
  ] as const;
  let m = recevoir(memoireDeDepart(p, {}), {
    genre: 'etat',
    heure: 6,
    code: 'AENV',
    toi: 'toi',
    jeton: 'j',
    journal: [...journal],
    seance: [...seance],
  });
  // Toi refaisait sa pochette entre deux pistes ; la suivante est lancée, et passe avant.
  m = { ...m, preparation: { ecran: 'pochette', venue: { genre: 'retoucher' }, pochette, choisi: 'dessus', tirages: 0 } };
  assert.equal(ecranDuTelephone(m, 6, p, TEXTES).genre, 'piste');
  m = saisir(m, 'images', 'reponse');
  assert.equal(m.preparation.ecran === 'pochette' ? m.preparation.pochette.artiste : '', 'Tata Mateo', 'son nom ne bouge pas');
  const partie = valider(m, 6, p, 'reponse');
  assert.deepEqual(partie.actions, [{ genre: 'repondre', proposition: { genre: 'saisie', texte: 'images' } }]);
  // La réponse partie : y revenir la vide ; un brouillon, lui, reste.
  assert.equal(laReponseEstPartie(partie.memoire), true);
  assert.equal(laReponseEstPartie(saisir(partie.memoire, 'imag', 'reponse')), false);
  // Dans la room, l'hôte a ouvert le bac : ce qu'il tape cherche une playlist, ce n'est pas une réponse.
  let bac: Memoire = { ...m, preparation: { ecran: 'bac', pochette, cran: 'chercher', bac: BAC_VIDE } };
  bac = saisir(bac, 'abba', 'recherche');
  assert.equal(bac.preparation.ecran === 'bac' ? bac.preparation.bac.recherche : '', 'abba');
  assert.deepEqual(valider(bac, 7, p, 'recherche').actions, [{ genre: 'chercher', recherche: 'abba' }]);
});
