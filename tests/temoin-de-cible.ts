/**
 * Un module témoin, pour le test du script d'une page : il écrit ce que les navigateurs d'il y a cinq ans ne lisent pas
 * (un accès qui s'arrête de lui-même, une valeur de repli). Assemblé, il doit ne plus rien en porter.
 */

declare global {
  /** Ce que la fenêtre peut porter pour ce témoin. */
  var temoin: { readonly nom?: string } | undefined;
}

console.log(globalThis.temoin?.nom ?? 'sans nom');

export {};
