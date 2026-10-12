/**
 * Le parcours : le chemin que fait ce dont on connaît la vitesse à chaque instant, sans savoir écrire sa position
 * d'une formule (les repères du plateau, dont la vitesse apparente suit celle du volant). On le somme une fois, par tranches,
 * puis on le lit à n'importe quel instant : comme le ressort et le volant, il ne dépend que de l'heure, jamais du rythme des images.
 */

const en = (valeurs: readonly number[], rang: number): number => valeurs[rang] ?? 0;

/**
 * @param vitesse la vitesse à chaque instant, entre le départ et l'arrivée.
 * @param tranche la durée d'une tranche de la somme, au plus, en secondes.
 * @returns le chemin fait à l'instant t : rien avant le départ, tout après l'arrivée.
 */
export function parcourir(vitesse: (t: number) => number, de: number, a: number, tranche: number): (t: number) => number {
  if (!(a > de)) return () => 0;
  const nombre = Math.max(1, Math.ceil((a - de) / tranche));
  const pas = (a - de) / nombre;
  // À chaque borne de tranche : la vitesse, et le chemin fait jusque-là, sommé par la méthode de Simpson.
  const vitesses = Array.from({ length: nombre + 1 }, (_, rang) => vitesse(de + rang * pas));
  const chemins = [0];
  for (let rang = 0; rang < nombre; rang++) {
    const aMiTranche = vitesse(de + (rang + 1 / 2) * pas);
    chemins.push(en(chemins, rang) + (pas / 6) * (en(vitesses, rang) + 4 * aMiTranche + en(vitesses, rang + 1)));
  }
  return (t) => {
    if (t <= de) return 0;
    if (t >= a) return en(chemins, nombre);
    const rang = Math.min(nombre - 1, Math.floor((t - de) / pas));
    // Dans la tranche : la courbe qui part d'une borne et arrive à l'autre avec les bonnes vitesses.
    const u = (t - de) / pas - rang;
    const [u2, u3] = [u * u, u * u * u];
    return (
      (2 * u3 - 3 * u2 + 1) * en(chemins, rang) +
      (u3 - 2 * u2 + u) * pas * en(vitesses, rang) +
      (3 * u2 - 2 * u3) * en(chemins, rang + 1) +
      (u3 - u2) * pas * en(vitesses, rang + 1)
    );
  };
}
