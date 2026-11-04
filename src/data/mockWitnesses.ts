import type { Condition, Orientation, PriceType, Witness, WitnessSource } from '../types';

/**
 * Datos SIMULADOS con fines demostrativos. No son registros reales de compraventas.
 * Zonas y precios de referencia orientativos.
 */
export interface ZoneDef {
  municipality: string;
  province: string;
  zone: string;
  lat: number;
  lng: number;
  baseUnit: number; // €/m² de referencia (orientativo)
  spread: number; // dispersión geográfica en grados
}

export const ZONES: ZoneDef[] = [
  // Ciudad de Valladolid
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Centro', lat: 41.6523, lng: -4.7245, baseUnit: 2300, spread: 0.005 },
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Delicias', lat: 41.6417, lng: -4.7275, baseUnit: 1900, spread: 0.005 },
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Huerta del Rey', lat: 41.6497, lng: -4.7008, baseUnit: 2200, spread: 0.005 },
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Parquesol', lat: 41.6333, lng: -4.7669, baseUnit: 1950, spread: 0.006 },
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Arturo Eyries', lat: 41.6610, lng: -4.7050, baseUnit: 1850, spread: 0.005 },
  { municipality: 'Valladolid', province: 'Valladolid', zone: 'Pajarillos', lat: 41.6280, lng: -4.7000, baseUnit: 1600, spread: 0.005 },
  // Área metropolitana y municipios de la provincia
  { municipality: 'Laguna de Duero', province: 'Valladolid', zone: 'Casco', lat: 41.5410, lng: -4.7530, baseUnit: 1650, spread: 0.007 },
  { municipality: 'Zaratán', province: 'Valladolid', zone: 'Residencial', lat: 41.6710, lng: -4.7880, baseUnit: 2050, spread: 0.007 },
  { municipality: 'Tudela de Duero', province: 'Valladolid', zone: 'Centro', lat: 41.5878, lng: -4.6557, baseUnit: 1500, spread: 0.006 },
  { municipality: 'Simancas', province: 'Valladolid', zone: 'Centro', lat: 41.5893, lng: -4.8924, baseUnit: 1400, spread: 0.005 },
  { municipality: 'Medina del Campo', province: 'Valladolid', zone: 'Centro', lat: 41.3157, lng: -4.9134, baseUnit: 950, spread: 0.007 },
];

const STREETS = [
  'Calle Roma',
  'Calle Londres',
  'Calle Atenas',
  'Calle Berlín',
  'Calle Ámsterdam',
  'Calle Santiago',
  'Calle Recoletos',
  'Calle Ancha',
  'Calle Doctrinos',
  'Paseo de Zorrilla',
  'Calle Nicolás Salmerón',
  'Calle Libertad',
];

/** PRNG determinista (mulberry32) para que los datos mock sean siempre iguales. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261104);
const between = (min: number, max: number) => min + rnd() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const TODAY_UTC = Date.UTC(2026, 10, 4);
const PER_ZONE = 10;

function generateWitnesses(): Witness[] {
  const out: Witness[] = [];
  let n = 0;

  for (const z of ZONES) {
    for (let i = 0; i < PER_ZONE; i++) {
      n++;
      const id = `T-${String(n).padStart(3, '0')}`;

      const roll = rnd();
      const source: WitnessSource = roll < 0.35 ? 'notaria' : roll < 0.65 ? 'interna' : 'portal';

      const area = Math.round(between(45, 135));
      const rooms = area < 60 ? 1 : area < 85 ? 2 : area < 110 ? 3 : 4;
      const floor = Math.floor(between(0, 8));
      const elevator = floor >= 3 ? rnd() < 0.92 : rnd() < 0.3;

      const cr = rnd();
      const condition: Condition = cr < 0.15 ? 'reformar' : cr < 0.75 ? 'bueno' : 'excelente';
      const yearBuilt = Math.round(between(1950, 2024));
      const orientation = rnd() < 0.8 ? pick(ORIENTATIONS) : undefined;

      const garage = rnd() < 0.3;
      const storage = rnd() < 0.4;
      const airConditioning = rnd() < 0.5;

      const condFactor = condition === 'reformar' ? 0.85 : condition === 'bueno' ? 1 : 1.1;
      const elevFactor = elevator || floor < 3 ? 1 : 0.97;
      const unit = z.baseUnit * condFactor * elevFactor * (1 + between(-0.12, 0.12));
      const closed = Math.round((unit * area) / 1000) * 1000;

      let priceType: PriceType = 'cerrado';
      if (source === 'portal' && rnd() < 0.85) priceType = 'oferta';
      if (source === 'interna' && rnd() < 0.3) priceType = 'oferta';
      const price = priceType === 'oferta' ? Math.round((closed * 1.05) / 1000) * 1000 : closed;

      const daysAgo = Math.floor(between(3, 540));
      const date = new Date(TODAY_UTC - daysAgo * 86400000).toISOString().slice(0, 10);

      const lat = z.lat + between(-z.spread, z.spread);
      const lng = z.lng + between(-z.spread * 1.4, z.spread * 1.4);

      const streetNo = Math.floor(between(1, 150));
      const address = `${pick(STREETS)}, ${streetNo}, ${floor === 0 ? 'Bajo' : `${floor}º`}`;

      const reference =
        source === 'portal'
          ? `Anuncio ${Math.floor(between(10000000, 99999999))}`
          : source === 'notaria'
            ? `Escritura ${Math.floor(between(100, 999))}/${2025 + (daysAgo > 365 ? 0 : 1)}`
            : `CRM-${id}`;

      out.push({
        id,
        source,
        reference,
        address,
        zone: z.zone,
        municipality: z.municipality,
        lat,
        lng,
        area,
        rooms,
        floor,
        elevator,
        condition,
        yearBuilt,
        orientation,
        garage,
        storage,
        airConditioning,
        price,
        priceType,
        date,
      });
    }
  }
  return out;
}

export const MOCK_WITNESSES: Witness[] = generateWitnesses();
