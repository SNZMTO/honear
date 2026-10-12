/** Les nombres tels qu'on les écrit dans le SVG : courts, et jamais « -0 ». */

const arrondir = (n: number, decimales: number): string => {
  const arrondi = Math.round(n * 10 ** decimales) / 10 ** decimales;
  return Object.is(arrondi, -0) ? '0' : String(arrondi);
};

/** Une coordonnée, en px : deux décimales suffisent. */
export const nombre = (n: number): string => arrondir(n, 2);

/** Un coefficient de déformation : il multiplie des centaines de px, il lui faut cinq décimales. */
export const nombreFin = (n: number): string => arrondir(n, 5);
