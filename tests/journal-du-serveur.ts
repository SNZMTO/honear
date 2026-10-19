/**
 * Ce que le serveur écrit à son journal pendant qu'on fait quelque chose : les lignes de sa sortie d'erreur (ou de sa sortie, où va
 * le diagnostic des pages), gardées au lieu d'être écrites. De quoi vérifier qu'il dit ce qu'il faut, et rien de personnel.
 */
export async function ceQueDitLeJournal(faire: () => Promise<unknown>, sortie: 'error' | 'log' = 'error'): Promise<string[]> {
  const lignes: string[] = [];
  const avant = console[sortie];
  console[sortie] = (...dit: unknown[]) => void lignes.push(dit.map(String).join(' '));
  try {
    await faire();
  } finally {
    console[sortie] = avant;
  }
  return lignes;
}
