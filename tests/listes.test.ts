/**
 * Les listes sur mesure du MCP de Honear : le lien qu'on colle, ce qu'on lit de la réponse du MCP, la liste importée avec ses
 * pistes relues chez Deezer, ses surnoms acceptés par le jugement, et son ordre gardé quand la difficulté monte. Sans réseau : un
 * faux MCP et un faux Deezer qui répondent ce qu'on leur a appris.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasard } from '../src/lowpoly/aleatoire';
import { pochetteDExemple } from '../src/planche/exemples';
import type { Action, Connexion } from '../src/regles/messages';
import { MODES, type PisteDuMode } from '../src/regles/modes';
import { brancherLaMusique } from '../src/reseau/musique';
import { TEXTES } from '../src/ressources/textes.fr';
import { demarrerLeServeur } from '../src/serveur/serveur';
import { lireUnLien } from '../src/serveur/sources/liens';
import { idListe, lienListe, lireLaListe } from '../src/serveur/sources/liste';

const ID = 'iTRYNDDqk3g0zBoA';
const MCP = 'http://honear-mcp:8791';
const MONDE = 1_760_000_000;

/** Ce que le MCP rend pour une liste : trois pistes, dont une que Deezer n'a plus. */
const LISTE = {
  id: ID,
  nom: 'Une couleur dans le titre',
  dans_l_ordre: true,
  pistes: [
    { deezer: 3128096, titre: 'Yellow', artiste: 'Coldplay', rang: 971942, surnoms: { artiste: [], titre: [] }, anecdote: '' },
    { deezer: 404, titre: 'Perdue', artiste: 'Personne', rang: 1, surnoms: { artiste: [], titre: [] }, anecdote: '' },
    { deezer: 72717420, titre: 'Bella', artiste: 'GIMS', rang: 915419, surnoms: { artiste: ['Maître Gims'], titre: [] }, anecdote: 'Vrai.' },
  ],
  jusqua: MONDE + 2_592_000,
};

/** Une fiche de piste comme Deezer la donne, avec un extrait signé. */
const uneFiche = (id: number, titre: string, artiste: string) => ({
  id,
  readable: true,
  title: titre,
  title_short: titre,
  preview: `https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/0/abc${id}.mp3?hdnea=exp=${MONDE + 900}~acl=x~hmac=f00d`,
  artist: { id: 1, name: artiste },
  album: { id: 2, title: 'Album' },
});

/** La musique branchée sur un faux MCP (s'il y en a un) et un faux Deezer ; elle note les adresses demandées. */
function uneMusique(listes: string | undefined) {
  const demandes: string[] = [];
  const musique = brancherLaMusique({
    lire: (adresse) => {
      demandes.push(adresse);
      if (adresse === `${MCP}/listes/${ID}`) return Promise.resolve(LISTE);
      if (adresse.startsWith(MCP)) return Promise.reject(new Error('404'));
      const fiche = /\/track\/(\d+)$/.exec(adresse)?.[1];
      if (fiche === '3128096') return Promise.resolve(uneFiche(3128096, 'Yellow', 'Coldplay'));
      if (fiche === '72717420') return Promise.resolve(uneFiche(72717420, 'Bella', 'GIMS'));
      return Promise.resolve({ error: { type: 'DataException', message: 'no data', code: 800 } });
    },
    suivre: () => Promise.reject(new Error('pas de réseau')),
    maintenant: () => 0,
    monde: () => MONDE,
    attendre: () => Promise.resolve(),
    ...(listes !== undefined ? { listes } : {}),
  });
  return { musique, demandes };
}

test('le lien d’une liste, collé dans le bac : celui que le MCP donne, et rien qui y ressemble seulement', () => {
  for (const colle of [`https://honear.fr/?liste=${ID}`, `honear.fr/?liste=${ID}`, `https://www.honear.fr/?code=AB12&liste=${ID}`])
    assert.deepEqual(lireUnLien(colle), { genre: 'liste', id: ID }, colle);
  for (const colle of [`https://honear.fr/?liste=court`, `https://honear.example/?liste=${ID}`, `https://honear.fr/?liste=${ID}x`])
    assert.deepEqual(lireUnLien(colle), { genre: 'inconnu' }, colle);
  assert.equal(idListe(lienListe(ID)), ID);
  assert.equal(idListe('liste:../../etc'), undefined);
});

test('ce qu’on lit d’une liste : son nom, ses pistes par leur identifiant Deezer, leurs surnoms et anecdotes, revérifiés et bornés', () => {
  assert.deepEqual(lireLaListe(LISTE)?.pistes[2], { deezer: 72717420, surnoms: { artiste: ['Maître Gims'], titre: [] }, anecdote: 'Vrai.' });
  assert.deepEqual(lireLaListe(LISTE)?.pistes[0], { deezer: 3128096, surnoms: { artiste: [], titre: [] } });
  assert.equal(lireLaListe(LISTE)?.dansLOrdre, true);
  const abimee = {
    nom: 'x',
    pistes: [{ deezer: -1 }, { deezer: '12' }, { deezer: 12, surnoms: { artiste: ['a', 'b', 'c', 'd', 'e'.repeat(41)] }, anecdote: 'f'.repeat(161) }],
  };
  assert.deepEqual(lireLaListe(abimee)?.pistes, [{ deezer: 12, surnoms: { artiste: ['a', 'b', 'c'], titre: [] } }]);
  assert.equal(lireLaListe({ pistes: [] }), undefined);
  assert.equal(lireLaListe({ nom: 'x'.repeat(61), pistes: [] }), undefined);
});

test('une liste importée : lue chez le MCP, chaque piste relue chez Deezer, celles qu’il n’a plus passées, son ordre gardé', async () => {
  const { musique, demandes } = uneMusique(MCP);
  assert.deepEqual(await musique.importer(`https://honear.fr/?liste=${ID}`), {
    lien: lienListe(ID),
    titre: 'Une couleur dans le titre',
    total: 3,
    jouables: 2,
  });
  const pistes = musique.pistes(lienListe(ID)) ?? [];
  assert.deepEqual(
    pistes.map((p) => [p.deezer, p.reponse.titre, p.surnoms, p.anecdote]),
    [
      [3128096, 'Yellow', { artiste: [], titre: [] }, undefined],
      [72717420, 'Bella', { artiste: ['Maître Gims'], titre: [] }, 'Vrai.'],
    ],
  );
  assert.equal(musique.gardeSonOrdre(lienListe(ID)), true);
  assert.deepEqual(demandes.slice(0, 1), [`${MCP}/listes/${ID}`]);
});

test('une liste que le MCP ne connaît pas, ou un jeu sans MCP : rien à jouer, et rien de demandé pour rien', async () => {
  const avec = uneMusique(MCP);
  assert.equal(await avec.musique.importer('https://honear.fr/?liste=AAAAAAAAAAAAAAAA'), 'introuvable');
  const sans = uneMusique(undefined);
  assert.equal(await sans.musique.importer(`https://honear.fr/?liste=${ID}`), 'introuvable');
  assert.deepEqual(sans.demandes, []);
});

test('un surnom d’une liste est une réponse juste en saisie libre, le vrai nom aussi ; ailleurs, rien ne change', () => {
  const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;
  const m: PisteDuMode = { reponse: { titre: 'Qui de nous deux', artiste: '-M-', pochette: vignette } };
  const avecSurnoms: PisteDuMode = { ...m, surnoms: { artiste: ['Matthieu Chedid'], titre: ['Le pinson'] } };
  const juger = (texte: string, piste: PisteDuMode) => MODES.libre.juger({ genre: 'saisie', texte }, piste, []);
  assert.deepEqual(juger('mathieu chedid', avecSurnoms).trouve, ['artiste']);
  assert.deepEqual(juger('M', avecSurnoms).trouve, ['artiste']);
  assert.deepEqual(juger('le pinson', avecSurnoms).trouve, ['titre']);
  assert.deepEqual(juger('matthieu chedid', m).trouve, []);
});

test('une room garde l’ordre d’une liste dont la difficulté monte ; une playlist se mélange toujours', () => {
  const vignette = { vignette: { fond: 'lilasFume', motif: 'rayons' } } as const;
  const pistes: PisteDuMode[] = Array.from({ length: 8 }, (_, k) => ({ reponse: { titre: `T${k}`, artiste: `A${k}`, pochette: vignette } }));
  const ordreDeLaRoom = (playlist: string): string[] => {
    const annoncees: (readonly PisteDuMode[])[] = [];
    const serveur = demarrerLeServeur({
      maintenant: () => 0,
      tirage: hasard(37).suivant,
      jeton: () => 'jeton',
      playlist: () => pistes,
      gardeSonOrdre: (lien) => lien === lienListe(ID),
      bientot: (p) => annoncees.push(p),
    });
    const connexion: Connexion = serveur.connecter(() => undefined);
    const creer: Action = { genre: 'creer', mode: 'libre', pistes: 8, extrait: 20, son: 'tous', playlist, pochette: pochetteDExemple(TEXTES) };
    connexion.envoyer(creer);
    return (annoncees[0] ?? []).map((p) => p.reponse.titre);
  };
  assert.deepEqual(ordreDeLaRoom(lienListe(ID)), ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']);
  assert.notDeepEqual(ordreDeLaRoom('deezer:777'), ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']);
});
