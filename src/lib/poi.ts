import { distanceMeters } from './geo';

export interface Poi {
  name: string;
  kind: 'transport' | 'park';
  lat: number;
  lng: number;
  distance: number; // metros
}

/** Puntos de interés SIMULADOS, colocados a distancias fijas del inmueble. */
const OFFSETS: { name: string; kind: Poi['kind']; dx: number; dy: number }[] = [
  { name: 'Parada de autobús urbano', kind: 'transport', dx: 260, dy: -150 },
  { name: 'Estación de metro / cercanías', kind: 'transport', dx: -540, dy: 320 },
  { name: 'Parque urbano', kind: 'park', dx: -190, dy: 260 },
  { name: 'Plaza del barrio', kind: 'park', dx: 420, dy: -90 },
];

export function buildPois(lat: number, lng: number): Poi[] {
  return OFFSETS.map((o) => {
    const pLat = lat + o.dy / 110540;
    const pLng = lng + o.dx / (111320 * Math.cos((lat * Math.PI) / 180));
    return {
      name: o.name,
      kind: o.kind,
      lat: pLat,
      lng: pLng,
      distance: Math.round(distanceMeters(lat, lng, pLat, pLng)),
    };
  });
}
