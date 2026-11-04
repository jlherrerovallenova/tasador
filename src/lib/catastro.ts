import { MOCK_PROPERTIES } from '../data/mockProperties';
import { ZONES } from '../data/mockWitnesses';
import type { Property } from '../types';

/** Campos que devuelve la consulta de Catastro (simulada). */
export type CatastroData = Pick<
  Property,
  'address' | 'municipality' | 'province' | 'postalCode' | 'lat' | 'lng' | 'builtArea' | 'yearBuilt' | 'use' | 'plotArea' | 'floor'
>;

export type CatastroResult =
  | { ok: true; reference: string; data: CatastroData; simulated: boolean }
  | { ok: false; error: string };

const STREETS = ['Calle Roma', 'Calle Londres', 'Calle Atenas', 'Calle Santiago', 'Calle Recoletos'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toCatastroData(p: Property): CatastroData {
  return {
    address: p.address,
    municipality: p.municipality,
    province: p.province,
    postalCode: p.postalCode,
    lat: p.lat,
    lng: p.lng,
    builtArea: p.builtArea,
    yearBuilt: p.yearBuilt,
    use: p.use,
    plotArea: p.plotArea,
    floor: p.floor,
  };
}

/**
 * SIMULACIÓN de consulta a la Sede Electrónica del Catastro.
 * No conecta con ningún servicio real: devuelve datos de ejemplo deterministas a partir de la referencia.
 */
export async function lookupCatastro(raw: string): Promise<CatastroResult> {
  const reference = raw.trim().toUpperCase();
  if (!/^[0-9A-Z]{20}$/.test(reference)) {
    return { ok: false, error: 'La referencia catastral debe tener 20 caracteres alfanuméricos.' };
  }

  await new Promise((resolve) => setTimeout(resolve, 900));

  const known = MOCK_PROPERTIES.find((p) => p.reference === reference);
  if (known) return { ok: true, reference, simulated: true, data: toCatastroData(known) };

  const h = hash(reference);
  const zone = ZONES[h % ZONES.length];
  return {
    ok: true,
    reference,
    simulated: true,
    data: {
      address: `${STREETS[h % STREETS.length]}, ${1 + ((h >> 4) % 120)}`,
      municipality: zone.municipality,
      province: zone.province,
      postalCode: String(47000 + (h % 150)),
      lat: zone.lat + ((h % 100) - 50) / 10000,
      lng: zone.lng + (((h >> 8) % 100) - 50) / 10000,
      builtArea: 55 + ((h >> 3) % 110),
      yearBuilt: 1955 + ((h >> 5) % 70),
      use: h % 7 === 0 ? 'Garaje' : 'Residencial',
      plotArea: 20 + ((h >> 6) % 80),
      floor: 1 + ((h >> 9) % 8),
    },
  };
}
