import type { Condition, Orientation, PriceType, Witness, WitnessSource } from '../types';
import { normalize } from './format';

export interface ImportDefaults {
  municipality: string;
  lat: number;
  lng: number;
}

export interface ImportResult {
  witnesses: Witness[];
  errors: string[];
}

const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const SOURCES: WitnessSource[] = ['notaria', 'interna', 'portal', 'manual'];

/** Divide una línea CSV respetando campos entre comillas. */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const isYes = (v: string) => ['si', 's', '1', 'true', 'yes'].includes(normalize(v));

/**
 * Lee un CSV de testigos (separador ";" o ","). Cabeceras: ver plantillas/plantilla_testigos.csv.
 * Las filas con errores se descartan y se explican en `errors`.
 */
export function parseWitnessCsv(text: string, defaults: ImportDefaults): ImportResult {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return { witnesses: [], errors: ['El archivo no tiene filas de datos.'] };

  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = splitLine(lines[0], delim).map((h) => normalize(h).replace(/\s+/g, '_'));
  const stamp = Date.now().toString(36);
  const witnesses: Witness[] = [];
  const errors: string[] = [];

  for (let n = 1; n < lines.length; n++) {
    const row = splitLine(lines[n], delim);
    const line = n + 1;
    const get = (name: string) => {
      const i = headers.indexOf(name);
      return i >= 0 ? (row[i] ?? '') : '';
    };
    const num = (name: string) => Number(get(name).replace(',', '.'));

    const address = get('direccion');
    if (!address) {
      errors.push(`Línea ${line}: falta la dirección.`);
      continue;
    }
    const area = num('superficie_m2');
    const price = num('precio_eur');
    if (!(area > 0) || !(price > 0)) {
      errors.push(`Línea ${line}: la superficie y el precio deben ser mayores que 0.`);
      continue;
    }
    const date = get('fecha');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Línea ${line}: la fecha debe tener formato AAAA-MM-DD.`);
      continue;
    }

    const sourceRaw = normalize(get('fuente')) as WitnessSource;
    const source: WitnessSource = SOURCES.includes(sourceRaw) ? sourceRaw : 'manual';

    const condRaw = normalize(get('estado'));
    const condition: Condition = condRaw.startsWith('reform')
      ? 'reformar'
      : condRaw.startsWith('exc') || condRaw.startsWith('lujo')
        ? 'excelente'
        : 'bueno';

    const priceType: PriceType = normalize(get('tipo_precio')).startsWith('of') ? 'oferta' : 'cerrado';

    const orientRaw = get('orientacion').toUpperCase() as Orientation;
    const orientation = ORIENTATIONS.includes(orientRaw) ? orientRaw : undefined;

    const lat = num('latitud');
    const lng = num('longitud');

    witnesses.push({
      id: `CSV-${stamp}-${n}`,
      source,
      reference: get('referencia') || 'Importado desde CSV',
      address,
      zone: get('zona') || 'Sin zona',
      municipality: get('municipio') || defaults.municipality,
      lat: Number.isFinite(lat) ? lat : defaults.lat,
      lng: Number.isFinite(lng) ? lng : defaults.lng,
      area,
      rooms: num('habitaciones') || 0,
      floor: num('planta') || 0,
      elevator: isYes(get('ascensor')),
      condition,
      yearBuilt: num('anio_construccion') || 2000,
      orientation,
      garage: isYes(get('garaje')),
      storage: isYes(get('trastero')),
      airConditioning: isYes(get('aire_acondicionado')),
      price,
      priceType,
      date,
    });
  }

  return { witnesses, errors };
}
