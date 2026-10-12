/**
 * Couleur : passage par OKLab pour éclaircir et assombrir sans salir, et contraste WCAG.
 */

export interface OkLab {
  l: number;
  a: number;
  b: number;
}

const versLineaire = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const versGamma = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function rvbDepuisHex(hex: string): [number, number, number] {
  const propre = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(propre)) throw new Error(`Couleur illisible : ${hex}`);
  return [0, 2, 4].map((i) => parseInt(propre.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function hexDepuisRvb(rvb: readonly [number, number, number]): string {
  const octet = (c: number): string =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${octet(rvb[0])}${octet(rvb[1])}${octet(rvb[2])}`.toUpperCase();
}

export function okLabDepuisHex(hex: string): OkLab {
  const [r, v, b] = rvbDepuisHex(hex).map(versLineaire) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * v + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * v + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * v + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function rvbLineaireDepuisOkLab(c: OkLab): [number, number, number] {
  const l = (c.l + 0.3963377774 * c.a + 0.2158037573 * c.b) ** 3;
  const m = (c.l - 0.1055613458 * c.a - 0.0638541728 * c.b) ** 3;
  const s = (c.l - 0.0894841775 * c.a - 1.291485548 * c.b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const dansLeGamut = (rvb: readonly number[]): boolean => rvb.every((c) => c >= -0.0005 && c <= 1.0005);

/** Rend la couleur sRVB la plus proche : si elle déborde, on retire de la saturation, pas de la clarté. */
export function hexDepuisOkLab(couleur: OkLab): string {
  let lineaire = rvbLineaireDepuisOkLab(couleur);
  if (!dansLeGamut(lineaire)) {
    let bas = 0;
    let haut = 1;
    for (let i = 0; i < 24; i++) {
      const k = (bas + haut) / 2;
      lineaire = rvbLineaireDepuisOkLab({ l: couleur.l, a: couleur.a * k, b: couleur.b * k });
      if (dansLeGamut(lineaire)) bas = k;
      else haut = k;
    }
    lineaire = rvbLineaireDepuisOkLab({ l: couleur.l, a: couleur.a * bas, b: couleur.b * bas });
  }
  return hexDepuisRvb(lineaire.map(versGamma) as [number, number, number]);
}

/** Luminance relative WCAG d'une couleur. */
function luminance(hex: string): number {
  const [r, v, b] = rvbDepuisHex(hex).map(versLineaire) as [number, number, number];
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs, de 1 à 21. */
export function contraste(hexA: string, hexB: string): number {
  const la = luminance(hexA);
  const lb = luminance(hexB);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
