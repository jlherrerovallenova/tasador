import type { Condition, Heating, Orientation, PropertyUse, WitnessSource } from '../types';

export const ORIENTATIONS: Orientation[] = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  N: 'Norte',
  NE: 'Noreste',
  E: 'Este',
  SE: 'Sureste',
  S: 'Sur',
  SO: 'Suroeste',
  O: 'Oeste',
  NO: 'Noroeste',
};

export const CONDITIONS: Condition[] = ['reformar', 'bueno', 'excelente'];
export const CONDITION_LABELS: Record<Condition, string> = {
  reformar: 'A reformar',
  bueno: 'Bueno',
  excelente: 'Excelente / lujoso',
};

export const HEATING_LABELS: Record<Heating, string> = {
  ninguna: 'Sin calefacción',
  gas: 'Gas natural',
  electrica: 'Eléctrica',
  aerotermia: 'Aerotermia',
  suelo_radiante: 'Suelo radiante',
  bomba_calor: 'Bomba de calor',
};

export const USES: PropertyUse[] = ['Residencial', 'Garaje', 'Oficinas', 'Comercial'];

export const SOURCE_LABELS: Record<WitnessSource, string> = {
  notaria: 'Notaría',
  interna: 'Base interna',
  portal: 'Portal',
  manual: 'Manual',
};
