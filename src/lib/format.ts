const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

export const formatEUR = (v: number) => eur.format(Math.round(v));
export const formatNum = (v: number) => int.format(Math.round(v));
export const formatM2 = (v: number) => `${formatNum(v)} m²`;

/** Porcentaje a partir de un coeficiente multiplicador (1,05 → "+5,0 %"). */
export const coefToPct = (c: number) => {
  const pct = (c - 1) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')} %`;
};

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2).replace('.', ',')} km`;

/** Normaliza texto para comparar municipios (sin tildes, minúsculas). */
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
