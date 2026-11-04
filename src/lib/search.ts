import type { Property, Witness } from '../types';
import { distanceMeters } from './geo';
import { normalize } from './format';

export type WitnessWithDistance = Witness & { distance: number };

/**
 * Propone testigos comparables para un inmueble: misma localidad o a menos de 2,5 km,
 * ordenados por relevancia (distancia, superficie, habitaciones, estado, planta y antigüedad).
 * Los testigos manuales siempre se incluyen.
 */
export function searchWitnesses(subject: Property, pool: Witness[], limit = 30): WitnessWithDistance[] {
  const sameTown = normalize(subject.municipality);

  const scored = pool
    .map((w) => {
      const distance = distanceMeters(subject.lat, subject.lng, w.lat, w.lng);
      const sameMunicipality = normalize(w.municipality) === sameTown;
      const score =
        distance / 500 +
        Math.abs(w.area - subject.builtArea) / 15 +
        Math.abs(w.rooms - subject.rooms) * 0.7 +
        (w.condition !== subject.condition ? 0.5 : 0) +
        (subject.floor >= 3 && w.elevator !== subject.elevator ? 0.6 : 0) +
        (Math.abs(w.yearBuilt - subject.yearBuilt) / 25) * 0.5 +
        (sameMunicipality ? 0 : 2);
      return { w: { ...w, distance }, score, keep: w.source === 'manual' || sameMunicipality || distance <= 2500 };
    })
    .filter((x) => x.keep)
    .sort((a, b) => a.score - b.score);

  const manual = scored.filter((x) => x.w.source === 'manual').map((x) => x.w);
  const rest = scored.filter((x) => x.w.source !== 'manual').slice(0, limit).map((x) => x.w);
  return [...rest, ...manual].sort((a, b) => a.distance - b.distance);
}
