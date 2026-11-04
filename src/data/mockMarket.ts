/** Datos de mercado SIMULADOS para la provincia de Valladolid (orientativos, para la demostración). */

export const BAND_LABELS = ['0-40 m²', '40-70 m²', '70-90 m²', '90-120 m²', '120-150 m²', '150-180 m²', '> 180 m²'];
const BAND_LIMITS = [40, 70, 90, 120, 150, 180];

/** Índice de tramo de superficie (0..6). */
export function bandIndex(area: number): number {
  const i = BAND_LIMITS.findIndex((limit) => area < limit);
  return i === -1 ? BAND_LIMITS.length : i;
}

export interface MarketProfile {
  tiempoMercado: string;
  bajadaPrecio: number; // % de ofertas con bajada de precio
  rentabilidadMunicipio: number; // % bruta anual de alquiler
  tendencia: { trimestre: number; semestre: number; anio: number }; // % variación del precio
  edadMedia: number; // años de la población
  poderAdquisitivo: number; // €/mes por hogar
  hogares: number;
  nacionalidades: number; // población extranjera (nº)
  calidad: string;
  demanda: number[]; // % de demanda por tramo de superficie (suma 100)
}

/** Perfil de mercado de la ciudad de Valladolid. */
const VALLADOLID: MarketProfile = {
  tiempoMercado: '6 a 8 meses',
  bajadaPrecio: 7.7,
  rentabilidadMunicipio: 5.2,
  tendencia: { trimestre: 4.3, semestre: 1.6, anio: 14.4 },
  edadMedia: 45,
  poderAdquisitivo: 1546,
  hogares: 649,
  nacionalidades: 34,
  calidad: 'Muy alta',
  demanda: [28.6, 5.7, 11.1, 9.7, 12.6, 13.8, 18.4],
};

/** Perfil orientativo para el resto de municipios de la provincia. */
const PROVINCE_DEFAULT: MarketProfile = {
  tiempoMercado: '8 a 12 meses',
  bajadaPrecio: 9.5,
  rentabilidadMunicipio: 4.6,
  tendencia: { trimestre: 1.2, semestre: 0.4, anio: 5.1 },
  edadMedia: 47,
  poderAdquisitivo: 1380,
  hogares: 320,
  nacionalidades: 12,
  calidad: 'Media',
  demanda: [22, 24, 20, 14, 10, 6, 4],
};

/** Devuelve el perfil de mercado del municipio (Valladolid capital o resto de la provincia). */
export function getMarket(municipality: string): MarketProfile {
  return municipality.trim().toLowerCase().startsWith('valladolid') ? VALLADOLID : PROVINCE_DEFAULT;
}
