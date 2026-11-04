export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';
export type Condition = 'reformar' | 'bueno' | 'excelente';
export type Heating = 'ninguna' | 'gas' | 'electrica' | 'aerotermia' | 'suelo_radiante' | 'bomba_calor';
export type PropertyUse = 'Residencial' | 'Garaje' | 'Oficinas' | 'Comercial';
export type WitnessSource = 'notaria' | 'interna' | 'portal' | 'manual';
export type PriceType = 'cerrado' | 'oferta';

/** Factores de homogeneización. */
export type FactorKey =
  | 'descuento'
  | 'superficie'
  | 'planta'
  | 'estado'
  | 'orientacion'
  | 'antiguedad'
  | 'garaje'
  | 'trastero'
  | 'aire'
  | 'ubicacion';

/** Ajustes manuales por testigo, en porcentaje (-3 = -3 %). */
export type FactorOverrides = Partial<Record<FactorKey, number>>;

/** Inmueble objeto de la valoración. */
export interface Property {
  reference: string; // Referencia catastral (20 caracteres)
  address: string;
  municipality: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  builtArea: number; // m² construidos
  usefulArea: number; // m² útiles
  rooms: number;
  bathrooms: number;
  floor: number; // 0 = bajo
  door: string;
  orientation: Orientation;
  condition: Condition;
  yearBuilt: number;
  use: PropertyUse;
  plotArea: number; // m² de suelo (cuota de participación)
  elevator: boolean;
  heating: Heating;
  airConditioning: boolean;
  garage: boolean;
  storage: boolean;
  communityPool: boolean;
  communityAreas: boolean;
}

/** Testigo comparable (oferta en portal, cierre notarial o base interna). */
export interface Witness {
  id: string;
  source: WitnessSource;
  reference?: string;
  address: string;
  zone: string;
  municipality: string;
  lat: number;
  lng: number;
  area: number; // m² construidos
  rooms: number;
  floor: number;
  elevator: boolean;
  condition: Condition;
  yearBuilt: number;
  orientation?: Orientation;
  garage: boolean;
  storage: boolean;
  airConditioning: boolean;
  price: number; // €
  priceType: PriceType;
  date: string; // ISO yyyy-mm-dd
}

export interface ValuationSettings {
  discount: number; // % de descuento oferta → cierre
  valuationDate: string; // ISO yyyy-mm-dd
}

export interface Tasador {
  agency: string;
  valuer: string;
  collegiate: string;
  email: string;
  phone: string;
  notes: string;
}
