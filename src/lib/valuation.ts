import type { Condition, FactorKey, FactorOverrides, Orientation, Property, Witness } from '../types';

/**
 * Motor de homogeneización.
 * Cada coeficiente convierte el €/m² de un testigo en el €/m² equivalente del inmueble objeto:
 *   coeficiente = valor(inmueble) / valor(testigo)
 * Los valores son orientativos y pueden ajustarse manualmente por testigo.
 */

export const CURRENT_YEAR = 2026;

export const FACTOR_ORDER: FactorKey[] = [
  'descuento',
  'superficie',
  'planta',
  'estado',
  'orientacion',
  'antiguedad',
  'garaje',
  'trastero',
  'aire',
  'ubicacion',
];

export const FACTOR_LABELS: Record<FactorKey, string> = {
  descuento: 'Oferta → cierre',
  superficie: 'Superficie',
  planta: 'Planta y ascensor',
  estado: 'Estado de conservación',
  orientacion: 'Orientación',
  antiguedad: 'Antigüedad',
  garaje: 'Plaza de garaje',
  trastero: 'Trastero',
  aire: 'Aire acondicionado',
  ubicacion: 'Ubicación (manual)',
};

const CONDITION_VALUE: Record<Condition, number> = { reformar: 0.85, bueno: 1, excelente: 1.1 };

const ORIENTATION_VALUE: Record<Orientation, number> = {
  N: 0.98,
  NE: 0.99,
  NO: 0.99,
  E: 1,
  O: 1,
  SE: 1.01,
  SO: 1.01,
  S: 1.02,
};

/** Valor relativo por planta; con ascensor las plantas altas se revalorizan. */
export function floorValue(floor: number, elevator: boolean): number {
  if (floor <= 0) return 0.96;
  if (floor === 1) return 0.99;
  if (floor === 2) return 1;
  if (elevator) return 1 + Math.min(floor - 2, 6) * 0.01;
  return Math.max(0.8, 1 - (floor - 2) * 0.03);
}

/** Depreciación por antigüedad (mínimo 75 %). */
export function ageValue(year: number): number {
  return Math.max(0.75, 1 - 0.003 * (CURRENT_YEAR - year));
}

export interface ValuationSettings {
  discount: number; // % descuento oferta → cierre
  valuationDate: string; // ISO yyyy-mm-dd
}

export interface FactorValue {
  key: FactorKey;
  auto: number; // coeficiente calculado automáticamente
  applied: number; // coeficiente aplicado (automático o manual)
  overridden: boolean;
}

export interface WitnessValuation {
  witness: Witness;
  distance: number;
  weight: number;
  unitRaw: number; // €/m² del precio original
  factors: FactorValue[];
  coefficient: number; // producto de coeficientes aplicados
  unitAdjusted: number; // €/m² homogeneizado
}

export interface ValuationResult {
  count: number;
  area: number;
  unitRecommended: number; // media ponderada homogeneizada
  unitMedian: number;
  unitP25: number;
  unitP75: number;
  value: number; // valor de mercado (€)
  valueMin: number;
  valueMax: number;
  dispersion: number; // (P75 - P25) / mediana
  totalWeight: number;
  warnings: string[];
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;

function monthsBetween(from: string, to: string): number {
  const ms = Date.parse(to) - Date.parse(from);
  return Math.max(0, ms / (30.44 * 86400000));
}

/** Peso del testigo: fuente fiable, reciente y cercano pesan más. */
export function witnessWeight(w: Witness, distance: number, valuationDate: string): number {
  const sourceWeight = { notaria: 1, interna: 0.9, portal: 0.75, manual: 0.8 }[w.source];
  const months = monthsBetween(w.date, valuationDate);
  const recency = months <= 6 ? 1 : Math.max(0.5, 1 - (months - 6) * 0.02);
  const proximity = 1 / (1 + distance / 800);
  return sourceWeight * recency * proximity;
}

/** Coeficientes automáticos de homogeneización (testigo → inmueble objeto). */
export function autoFactors(subject: Property, w: Witness, discount: number): Record<FactorKey, number> {
  const bonus = (on: boolean, pct: number) => (on ? 1 + pct : 1);
  return {
    descuento: w.priceType === 'oferta' ? 1 - discount / 100 : 1,
    superficie: Math.pow(w.area / subject.builtArea, 0.1),
    planta: floorValue(subject.floor, subject.elevator) / floorValue(w.floor, w.elevator),
    estado: CONDITION_VALUE[subject.condition] / CONDITION_VALUE[w.condition],
    orientacion: w.orientation ? ORIENTATION_VALUE[subject.orientation] / ORIENTATION_VALUE[w.orientation] : 1,
    antiguedad: ageValue(subject.yearBuilt) / ageValue(w.yearBuilt),
    garaje: bonus(subject.garage, 0.04) / bonus(w.garage, 0.04),
    trastero: bonus(subject.storage, 0.015) / bonus(w.storage, 0.015),
    aire: bonus(subject.airConditioning, 0.015) / bonus(w.airConditioning, 0.015),
    ubicacion: 1,
  };
}

/** Valora un testigo aplicando coeficientes automáticos y ajustes manuales (en %). */
export function valuateWitness(
  subject: Property,
  w: Witness,
  distance: number,
  settings: ValuationSettings,
  overrides: FactorOverrides = {},
): WitnessValuation {
  const auto = autoFactors(subject, w, settings.discount);
  const factors: FactorValue[] = FACTOR_ORDER.map((key) => {
    const manual = overrides[key];
    return {
      key,
      auto: auto[key],
      applied: manual !== undefined ? 1 + manual / 100 : auto[key],
      overridden: manual !== undefined,
    };
  });
  const coefficient = factors.reduce((acc, f) => acc * f.applied, 1);
  const unitRaw = w.price / w.area;
  return {
    witness: w,
    distance,
    weight: witnessWeight(w, distance, settings.valuationDate),
    unitRaw,
    factors,
    coefficient,
    unitAdjusted: unitRaw * coefficient,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = p * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

/** Calcula valor de mercado, €/m² y horquilla a partir de los testigos seleccionados. */
export function computeValuation(subject: Property, rows: WitnessValuation[]): ValuationResult {
  const area = subject.builtArea;
  const count = rows.length;
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  const units = rows.map((r) => r.unitAdjusted);

  const weightedMean =
    totalWeight > 0 ? rows.reduce((s, r) => s + r.unitAdjusted * r.weight, 0) / totalWeight : 0;
  const median = percentile(units, 0.5);
  const p25 = percentile(units, 0.25);
  const p75 = percentile(units, 0.75);

  const unitRecommended = roundTo(weightedMean, 10);
  const value = roundTo(unitRecommended * area, 1000);
  const valueMin = Math.min(roundTo(p25 * area, 1000), value);
  const valueMax = Math.max(roundTo(p75 * area, 1000), value);
  const dispersion = median > 0 ? (p75 - p25) / median : 0;

  const warnings: string[] = [];
  if (count === 0) warnings.push('No hay testigos seleccionados. Seleccione al menos 3 para obtener una valoración fiable.');
  else if (count < 3) warnings.push(`Solo ${count} testigo(s) seleccionado(s). Se recomiendan al menos 3.`);
  if (count >= 3 && dispersion > 0.25)
    warnings.push('Alta dispersión de precios homogeneizados (>25 %). Revise los testigos más alejados de la media.');
  rows
    .filter((r) => r.coefficient < 0.8 || r.coefficient > 1.2)
    .forEach((r) =>
      warnings.push(`El testigo ${r.witness.id} tiene un coeficiente global fuera del rango ±20 %. Revise sus ajustes.`),
    );

  return {
    count,
    area,
    unitRecommended,
    unitMedian: roundTo(median, 10),
    unitP25: roundTo(p25, 10),
    unitP75: roundTo(p75, 10),
    value,
    valueMin,
    valueMax,
    dispersion,
    totalWeight,
    warnings,
  };
}
