/**
 * Les disques de la finale : leur matière (sa teinte), leur épaisseur, leurs pans, la part de leur rayon que prend l'étiquette,
 * et les rangs des facettes que le disque de diamant garde allumées au ton le plus clair, du côté de la lampe.
 */

export const RECOMPENSES = {
  matieres: { diamant: { teinte: 'creme' }, platine: { teinte: 'alu' }, or: { teinte: 'miel' } },
  epaisseur: 1.2,
  pans: 48,
  etiquette: 0.36,
  eclats: [27, 29, 31],
} as const;
