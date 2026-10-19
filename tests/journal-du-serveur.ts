/**
 * Ce que le serveur écrit à son journal (sa sortie d'erreur) pendant qu'on fait quelque chose : ses lignes, gardées au lieu d'être
 * écrites. De quoi vérifier qu'il dit ce qui ne va pas, et rien de personnel.
 */
export async function ceQueDitLeJournal(faire: () => Promise<unknown>): Promise<string[]> {
  const lignes: string[] = [];
  const avant = console.error;
  console.error = (...dit: unknown[]) => void lignes.push(dit.map(String).join(' '));
  try {
    await faire();
  } finally {
    console.error = avant;
  }
  return lignes;
}
