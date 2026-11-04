# Tasador AVM

Aplicación web de valoración inmobiliaria (AVM) y generación de informes de tasación, centrada en la
**provincia de Valladolid**, construida con React + Vite + TypeScript + Tailwind CSS. Todos los datos son
**simulados** con fines demostrativos.

Zonas incluidas: ciudad de Valladolid (Centro, Delicias, Huerta del Rey, Parquesol, Arturo Eyries, Pajarillos),
Laguna de Duero, Zaratán, Tudela de Duero, Simancas y Medina del Campo.

## Puesta en marcha

```bash
npm install
npm run dev      # desarrollo
npm run build    # comprobación de tipos + build de producción
npm run preview  # servir el build
```

## Flujo de la aplicación

1. **Inmueble** – Consulta de referencia catastral (simulada) o formulario manual: ubicación, características,
   estado de conservación y dotaciones.
2. **Testigos** – Propuesta automática de comparables (misma localidad o < 2,5 km). Tabla con precio,
   €/m² original y homogeneizado, distancia y selector para la media. Permite ajustes por testigo, descartar,
   restaurar y añadir testigos manuales.
3. **Valoración** – Valor de mercado (€ y €/m²), horquilla (P25–P75), gráfico y ponderación. Se recalcula en tiempo real.
4. **Informe** – Documento estructurado en 5 apartados (identificación, características, testigos, valoración final,
   observaciones y firma). *Imprimir / Guardar como PDF* usa el diálogo de impresión del navegador.

## Motor de homogeneización (`src/lib/valuation.ts`)

Cada testigo se convierte al €/m² del inmueble objeto multiplicando por coeficientes:

| Factor | Criterio (orientativo) |
|---|---|
| Oferta → cierre | Descuento configurable (por defecto 5 %) sobre precios de oferta |
| Superficie | `(sup. testigo / sup. objeto)^0,1` |
| Planta y ascensor | Plantas altas con ascensor se revalorizan; sin ascensor se penalizan |
| Estado | A reformar 0,85 · Bueno 1,00 · Excelente 1,10 |
| Orientación | Sur +2 %, norte −2 % (escala intermedia) |
| Antigüedad | −0,3 % por año, mínimo 75 % |
| Garaje / trastero / aire | +4 % / +1,5 % / +1,5 % |
| Ubicación | Manual |

Cada coeficiente puede sustituirse por un porcentaje manual en la fila del testigo.

Peso del testigo = peso por fuente (notaría 1, interna 0,9, portal 0,75) × recencia × proximidad (`1 / (1 + d/800 m)`).

Valor recomendado = media ponderada de los €/m² homogeneizados × superficie construida.

## Estructura

```
src/
├─ App.tsx                    Estado global y navegación por pasos
├─ types.ts                   Modelos (Property, Witness, FactorOverrides…)
├─ data/
│  ├─ mockProperties.ts       Inmuebles de ejemplo
│  └─ mockWitnesses.ts        ~112 testigos simulados (generador determinista) en 13 zonas
├─ lib/
│  ├─ valuation.ts            Motor de homogeneización y cálculo de valor
│  ├─ search.ts               Propuesta de testigos por relevancia
│  ├─ catastro.ts             Consulta de Catastro SIMULADA
│  ├─ geo.ts / format.ts / labels.ts
└─ components/
   ├─ PropertyForm.tsx        Entrada de datos (Catastro + formulario)
   ├─ WitnessSelector.tsx     Tabla interactiva de testigos
   ├─ AddWitnessForm.tsx      Alta manual de testigos
   ├─ ValuationCalculator.tsx Valor, horquilla, gráficos y ponderación
   ├─ ReportPreview.tsx       Informe imprimible
   ├─ MapSimulated.tsx        Mapa de situación SVG simulado
   └─ ui.tsx                  Componentes base
```

## Notas

- La consulta de Catastro **no está conectada** a ningún servicio real; devuelve datos deterministas a partir de la referencia.
- Los testigos son **ficticios**. Para uso real, sustituir `mockWitnesses.ts` por una fuente de datos (API o base de datos) de
  portales, notarías o registros.
- Los coeficientes son orientativos y deben calibrarse con datos de mercado reales y con la normativa de valoración vigente.
