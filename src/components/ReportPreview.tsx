import type { ReactNode } from 'react';
import type { Property, Tasador, ValuationSettings, Witness } from '../types';
import type { ValuationResult, WitnessValuation } from '../lib/valuation';
import { formatDate, formatEUR, formatM2, formatNum } from '../lib/format';
import { CONDITION_LABELS, HEATING_LABELS, ORIENTATION_LABELS } from '../lib/labels';
import { BAND_LABELS, bandIndex, getMarket } from '../data/mockMarket';
import { buildPois } from '../lib/poi';
import { Button, Card, Field, inputCls } from './ui';
import { MapSimulated, type MapPoint } from './MapSimulated';

interface Props {
  subject: Property;
  result: ValuationResult;
  rows: WitnessValuation[];
  marketWitnesses: Witness[];
  settings: ValuationSettings;
  tasador: Tasador;
  onTasadorChange: (patch: Partial<Tasador>) => void;
  rentMonthly: number;
  onRentChange: (value: number) => void;
  onBack: () => void;
}

const REF_YEAR = 2026;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;
const dec = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

/* ---------- Piezas de maquetación del informe ---------- */

function SectionHead({ kicker, title, tasador }: { kicker: string; title: string; tasador: Tasador }) {
  return (
    <>
      <div className="mb-6 flex items-end justify-between border-b border-slate-300 pb-3 text-[11px] leading-snug text-slate-600">
        <div>
          <div className="text-sm font-semibold text-brand-900">{tasador.valuer}</div>
          <div>{tasador.collegiate}</div>
        </div>
        <div className="text-right">
          <div>{tasador.agency}</div>
          <div>{[tasador.phone, tasador.email].filter(Boolean).join(' · ') || '—'}</div>
        </div>
      </div>
      <div className="mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">{kicker}</div>
        <h2 className="text-2xl font-bold text-brand-900">{title}</h2>
      </div>
    </>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wide text-sky-600">{children}</h3>;
}

function PageFoot({ date, code }: { date: string; code: string }) {
  return (
    <div className="mt-10 flex justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
      <span>Fecha de emisión {date}</span>
      <span className="font-mono">{code}</span>
    </div>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ThumbPlaceholder({ n }: { n: number }) {
  return (
    <div className="relative flex h-16 w-24 shrink-0 items-center justify-center rounded bg-gradient-to-br from-slate-200 to-slate-300 text-[10px] text-slate-500">
      Sin foto
      <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-900 text-[10px] font-bold text-white">
        {n}
      </span>
    </div>
  );
}

/* ---------- Informe ---------- */

export function ReportPreview({
  subject: s,
  result,
  rows,
  marketWitnesses,
  settings,
  tasador,
  onTasadorChange,
  rentMonthly,
  onRentChange,
  onBack,
}: Props) {
  const market = getMarket(s.municipality);
  const pois = buildPois(s.lat, s.lng);
  const totalW = result.totalWeight || 1;
  const dateLong = new Date(`${settings.valuationDate}T12:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const code = `INF-${s.reference.slice(-6)}-${settings.valuationDate.replace(/-/g, '')}`;

  const portalRows = rows.filter((r) => r.witness.source === 'portal');
  const registryRows = rows.filter((r) => r.witness.source !== 'portal');
  const avg = (rs: WitnessValuation[]) => (rs.length ? rs.reduce((a, r) => a + r.unitAdjusted, 0) / rs.length : 0);

  const scenarios = [
    { label: 'Precio de venta', value: result.value, cls: 'border-emerald-500 bg-emerald-50', txt: 'text-emerald-700' },
    { label: 'Venta poco probable', value: roundTo(result.valueMax, 1000), cls: 'border-amber-400 bg-slate-100', txt: 'text-amber-700' },
    { label: 'Fuera de mercado', value: roundTo(result.valueMax * 1.03, 1000), cls: 'border-red-500 bg-slate-100', txt: 'text-red-700' },
  ];

  const offerCounts = BAND_LABELS.map((_, i) => marketWitnesses.filter((w) => bandIndex(w.area) === i).length);
  const offerTotal = offerCounts.reduce((a, b) => a + b, 0) || 1;
  const offerPct = offerCounts.map((c) => (c / offerTotal) * 100);
  const demandPct = market.demanda;
  const maxBar = Math.max(...offerPct, ...demandPct, 1);
  const topDemand = BAND_LABELS[demandPct.indexOf(Math.max(...demandPct))];
  const avgYear =
    marketWitnesses.length > 0 ? marketWitnesses.reduce((a, w) => a + w.yearBuilt, 0) / marketWitnesses.length : s.yearBuilt;
  const avgBuildAge = Math.round(REF_YEAR - avgYear);

  const rentabilidadInmueble = (rentMonthly * 12) / result.value * 100;
  const rentable = result.value > 0 && rentMonthly > 0;

  const portalPoints: MapPoint[] = portalRows.map((r, i) => ({
    id: r.witness.id, lat: r.witness.lat, lng: r.witness.lng, label: String(i + 1),
  }));
  const registryPoints: MapPoint[] = registryRows.map((r, i) => ({
    id: r.witness.id, lat: r.witness.lat, lng: r.witness.lng, label: String(i + 1),
  }));
  const poiPoints: MapPoint[] = pois.map((p, i) => ({
    id: `poi-${i}`, lat: p.lat, lng: p.lng, kind: p.kind,
  }));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onBack}>← Volver a valoración</Button>
        <Button variant="primary" onClick={() => window.print()}>
          Imprimir / Guardar como PDF
        </Button>
      </div>

      <div className="no-print">
        <Card title="Datos del informe" subtitle="Aparecen en la portada, cabeceras, firma y observaciones del informe.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Agencia / entidad">
              <input className={inputCls} value={tasador.agency} onChange={(e) => onTasadorChange({ agency: e.target.value })} />
            </Field>
            <Field label="Nombre del tasador">
              <input className={inputCls} value={tasador.valuer} onChange={(e) => onTasadorChange({ valuer: e.target.value })} />
            </Field>
            <Field label="Nº de colegiado / registro">
              <input className={inputCls} value={tasador.collegiate} onChange={(e) => onTasadorChange({ collegiate: e.target.value })} />
            </Field>
            <Field label="Alquiler mensual estimado (€)" hint="Para calcular la rentabilidad bruta">
              <input type="number" className={inputCls} value={rentMonthly} onChange={(e) => onRentChange(Number(e.target.value))} />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={tasador.email} onChange={(e) => onTasadorChange({ email: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <input className={inputCls} value={tasador.phone} onChange={(e) => onTasadorChange({ phone: e.target.value })} />
            </Field>
            <Field label="Observaciones del tasador" className="sm:col-span-2 lg:col-span-4">
              <textarea
                rows={3}
                className={inputCls}
                value={tasador.notes}
                placeholder="Estado del inmueble, zona, limitaciones de la valoración…"
                onChange={(e) => onTasadorChange({ notes: e.target.value })}
              />
            </Field>
          </div>
        </Card>
      </div>

      <article
        id="informe"
        className="mx-auto max-w-4xl rounded-xl bg-white p-8 text-[13px] leading-relaxed text-slate-800 shadow-md print:max-w-none print:rounded-none print:p-0 print:shadow-none"
      >
        {/* ===== PORTADA ===== */}
        <section className="relative flex min-h-[560px] flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-brand-700 to-sky-600 p-10 text-white print:min-h-[265mm] print:rounded-none">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-300/10" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 text-lg font-bold ring-1 ring-white/30">
                {tasador.agency.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em]">{tasador.agency}</div>
                <div className="text-[11px] text-sky-100/80">Servicios de valoración inmobiliaria</div>
              </div>
            </div>
            <div className="rounded-full border border-white/30 px-3 py-1 text-[11px] uppercase tracking-widest text-sky-100">
              Confidencial
            </div>
          </div>

          <div className="relative my-10">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">Informe de valoración</div>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{s.address}</h1>
            <p className="mt-2 text-lg text-sky-100">
              {s.municipality} · {s.province} {s.postalCode}
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-black/20 px-4 py-3 text-sm">
              <span>
                <span className="text-sky-200">Ref. catastral </span>
                <span className="font-mono font-semibold">{s.reference}</span>
              </span>
              <span>
                <span className="text-sky-200">Superficie </span>
                <span className="font-semibold">{formatM2(s.builtArea)}</span>
              </span>
              <span>
                <span className="text-sky-200">Código </span>
                <span className="font-mono">{code}</span>
              </span>
            </div>
          </div>

          <div className="relative grid items-end gap-6 sm:grid-cols-5">
            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-xl sm:col-span-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-600">Valor de mercado estimado</div>
              <div className="mt-1 text-4xl font-bold text-brand-900">{formatEUR(result.value)}</div>
              <div className="mt-1 text-sm text-slate-600">
                {formatNum(result.unitRecommended)} €/m² · horquilla {formatEUR(result.valueMin)} – {formatEUR(result.valueMax)}
              </div>
            </div>
            <div className="sm:col-span-2 sm:text-right">
              <div className="text-xs uppercase tracking-widest text-sky-200">Fecha de emisión</div>
              <div className="text-lg font-semibold">{dateLong}</div>
              <div className="mt-3 text-xs text-sky-100/80">Preparado por {tasador.valuer}</div>
              <div className="text-xs text-sky-100/80">{tasador.collegiate}</div>
            </div>
          </div>
        </section>

        {/* ===== 1. INMUEBLE ===== */}
        <section className="page-break mt-4 pt-6">
          <SectionHead kicker="Sección 1" title="Inmueble" tasador={tasador} />

          <SubTitle>Datos del inmueble</SubTitle>
          <div className="grid gap-6 md:grid-cols-2">
            <dl className="space-y-2 text-sm">
              {[
                ['Dirección', s.address],
                ['Municipio', `${s.municipality} (${s.province})`],
                ['Superficie construida', formatM2(s.builtArea)],
                ['Superficie útil', formatM2(s.usefulArea)],
                ['Ref. catastral', s.reference],
                ['Tipo', s.use],
                ['Año de construcción', String(s.yearBuilt)],
                ['Distribución', `Hab.: ${s.rooms} | Baños: ${s.bathrooms}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-slate-400">Fuente: datos de Catastro (simulados en esta demostración)</p>
            </dl>
            <div>
              <div className="mb-1 text-xs text-slate-500">Ubicación</div>
              <MapSimulated lat={s.lat} lng={s.lng} points={[]} radius={800} />
            </div>
          </div>

          <SubTitle>Precio estimado de la vivienda</SubTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {scenarios.map((sc) => (
              <div key={sc.label}>
                <div className="mb-1.5 text-xs font-medium text-slate-600">{sc.label}</div>
                <div className={`border-l-4 px-4 py-3 ${sc.cls}`}>
                  <div className="text-2xl font-semibold text-slate-900">{formatEUR(sc.value)}</div>
                  <div className={`text-sm font-medium ${sc.txt}`}>{formatNum(sc.value / s.builtArea)} €/m²</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="border-l-4 border-slate-300 pl-4">
              <div className="text-xs text-slate-500">Tiempo en mercado</div>
              <div className="mt-1 text-lg font-semibold">{market.tiempoMercado}</div>
            </div>
            <div className="border-l-4 border-slate-300 pl-4">
              <div className="text-xs text-slate-500">Total de oferta con bajada de precio</div>
              <div className="mt-1 text-lg font-semibold">{dec(market.bajadaPrecio, 2)} % <span className="text-xs font-normal text-slate-500">inmuebles</span></div>
            </div>
            <div className="border-l-4 border-slate-300 pl-4">
              <div className="text-xs text-slate-500">Rentabilidad bruta anual de alquiler</div>
              <div className="mt-1 text-lg font-semibold">
                {rentable ? `${dec(rentabilidadInmueble, 2)} %` : 'Sin dato'}{' '}
                <span className="text-xs font-normal text-slate-500">inmueble</span>
              </div>
              <div className="text-base font-semibold">
                {dec(market.rentabilidadMunicipio, 2)} % <span className="text-xs font-normal text-slate-500">municipio</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">* Área de estudio: radio de 1,5 km alrededor del inmueble.</p>

          <SubTitle>Evolución del precio de venta del municipio</SubTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Último trimestre', market.tendencia.trimestre],
              ['Último semestre', market.tendencia.semestre],
              ['Último año', market.tendencia.anio],
            ].map(([label, v]) => {
              const up = Number(v) >= 0;
              return (
                <div key={String(label)} className="border-l-4 border-slate-300 pl-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className={`mt-1 text-xl font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
                    {up ? '↑' : '↓'} {dec(Math.abs(Number(v)), 2)} %
                  </div>
                </div>
              );
            })}
          </div>

          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 2. ENTORNO ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Sección 2" title="Entorno" tasador={tasador} />

          <SubTitle>Oferta y demanda por tipo de vivienda</SubTitle>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex h-56 items-end gap-3">
              {BAND_LABELS.map((b, i) => (
                <div key={b} className="flex h-full flex-1 flex-col items-center justify-end">
                  <div className="flex h-full w-full items-end justify-center gap-1">
                    <div className="flex w-1/2 flex-col items-center justify-end">
                      <span className="mb-0.5 text-[9px] text-sky-700">{dec(offerPct[i], 1)}%</span>
                      <div className="w-full rounded-t bg-sky-500" style={{ height: `${(offerPct[i] / maxBar) * 85}%` }} />
                    </div>
                    <div className="flex w-1/2 flex-col items-center justify-end">
                      <span className="mb-0.5 text-[9px] text-slate-700">{dec(demandPct[i], 1)}%</span>
                      <div className="w-full rounded-t bg-slate-800" style={{ height: `${(demandPct[i] / maxBar) * 85}%` }} />
                    </div>
                  </div>
                  <div className="mt-2 text-center text-[10px] leading-tight text-slate-500">{b}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-center gap-6 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Oferta (base de testigos)</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-800" /> Demanda</span>
            </div>
          </div>
          <p className="mt-4 text-sm">
            El <b>{dec(Math.max(...offerPct), 0)} %</b> de la oferta corresponde al tramo de mayor peso de la base de datos y el{' '}
            <b>{dec(Math.max(...demandPct), 0)} %</b> de la demanda se concentra en viviendas de <b>{topDemand}</b>.
          </p>

          <SubTitle>Características de la zona</SubTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Vivienda más demandada</div>
              <div className="mt-1 text-xl font-semibold text-sky-700">{topDemand}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Edad media de la edificación</div>
              <div className="mt-1 text-xl font-semibold text-sky-700">{avgBuildAge} años</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Calidad constructiva</div>
              <div className="mt-1 text-xl font-semibold text-sky-700">{market.calidad}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Edad media</div>
              <div className="mt-1 text-lg font-semibold">{market.edadMedia} años</div>
              <Meter value={market.edadMedia} max={70} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Poder adquisitivo por hogar</div>
              <div className="mt-1 text-lg font-semibold">{formatNum(market.poderAdquisitivo)} €/mes</div>
              <Meter value={market.poderAdquisitivo} max={2500} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Hogares</div>
              <div className="mt-1 text-lg font-semibold">{formatNum(market.hogares)} hogares</div>
              <Meter value={market.hogares} max={1500} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Nacionalidades</div>
              <div className="mt-1 text-lg font-semibold">{market.nacionalidades} extranjeros</div>
              <Meter value={market.nacionalidades} max={30} />
            </div>
          </div>
          <p className="mt-3 text-right text-[11px] text-slate-400">Área de estudio: 1,5 km · datos orientativos</p>

          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 3. PUNTOS DE INTERÉS ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Sección 3" title="Puntos de interés" tasador={tasador} />
          <p className="mb-4 text-sm">El inmueble se encuentra en una zona con buena conectividad y servicios cercanos.</p>
          <MapSimulated lat={s.lat} lng={s.lng} points={poiPoints} radius={1200} />
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-3 w-3 rounded-sm bg-amber-600" /> Transporte público
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {pois.filter((p) => p.kind === 'transport').map((p) => (
                  <li key={p.name} className="flex justify-between py-1.5"><span>{p.name}</span><span className="font-medium">{p.distance} m</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="h-3 w-3 rounded-full bg-green-600" /> Parques y plazas
              </div>
              <ul className="divide-y divide-slate-100 text-sm">
                {pois.filter((p) => p.kind === 'park').map((p) => (
                  <li key={p.name} className="flex justify-between py-1.5"><span>{p.name}</span><span className="font-medium">{p.distance} m</span></li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">Fuente: datos simulados para la demostración.</p>
          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 4. TESTIGOS DE PORTALES ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Sección 4" title="Testigos de portales inmobiliarios" tasador={tasador} />
          {portalRows.length === 0 ? (
            <p className="text-sm text-slate-500">No hay testigos de portales seleccionados.</p>
          ) : (
            <>
              <MapSimulated lat={s.lat} lng={s.lng} points={portalPoints} radius={1500} />
              <TestigosTable rows={portalRows} mode="portal" totalW={totalW} />
              <p className="mt-3 text-sm text-slate-600">
                Media de los <b>{portalRows.length}</b> testigos seleccionados: <b>{formatNum(avg(portalRows))} €/m²</b> homogeneizados.
              </p>
            </>
          )}
          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 5. TESTIGOS DE VENTAS REALES ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Sección 5" title="Testigos de ventas reales" tasador={tasador} />
          {registryRows.length === 0 ? (
            <p className="text-sm text-slate-500">No hay testigos de compraventa seleccionados.</p>
          ) : (
            <>
              <MapSimulated lat={s.lat} lng={s.lng} points={registryPoints} radius={1500} />
              <TestigosTable rows={registryRows} mode="registro" totalW={totalW} />
              <p className="mt-3 text-sm text-slate-600">
                Media de los <b>{registryRows.length}</b> testigos de compraventa: <b>{formatNum(avg(registryRows))} €/m²</b> homogeneizados.
              </p>
            </>
          )}
          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 6. FICHA CATASTRAL ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Sección 6" title="Ficha catastral" tasador={tasador} />
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ['Localización', `${s.address}, ${s.postalCode} ${s.municipality} (${s.province})`],
              ['Referencia catastral', s.reference],
              ['Clase', 'Urbano'],
              ['Uso principal', s.use],
              ['Superficie construida', formatM2(s.builtArea)],
              ['Superficie de suelo', s.plotArea ? formatM2(s.plotArea) : 'No consta'],
              ['Año de construcción', String(s.yearBuilt)],
              ['Planta / puerta', `${s.floor === 0 ? 'Bajo' : `${s.floor}ª`} ${s.door ? `· ${s.door}` : ''}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <SubTitle>Características técnicas</SubTitle>
          <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
            {[
              ['Estado de conservación', CONDITION_LABELS[s.condition]],
              ['Orientación', ORIENTATION_LABELS[s.orientation]],
              ['Ascensor', s.elevator ? 'Sí' : 'No'],
              ['Calefacción', HEATING_LABELS[s.heating]],
              ['Aire acondicionado', s.airConditioning ? 'Sí' : 'No'],
              ['Garaje / trastero', `${s.garage ? 'Sí' : 'No'} / ${s.storage ? 'Sí' : 'No'}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-slate-400">
            Esta demostración no incluye la gráfica catastral oficial. Los datos deben verificarse con la Sede Electrónica del Catastro.
          </p>
          <PageFoot date={dateLong} code={code} />
        </section>

        {/* ===== 7. VALORACIÓN FINAL, OBSERVACIONES Y FIRMA ===== */}
        <section className="page-break pt-6">
          <SectionHead kicker="Conclusión" title="Valoración final" tasador={tasador} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">Valor de mercado estimado</div>
              <div className="mt-1 text-2xl font-bold text-brand-900">{formatEUR(result.value)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatNum(result.unitRecommended)} €/m² × {formatM2(result.area)}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">Horquilla de valor</div>
              <div className="mt-1 text-lg font-semibold">{formatEUR(result.valueMin)} – {formatEUR(result.valueMax)}</div>
              <div className="mt-1 text-xs text-slate-500">Percentiles 25 y 75 de los testigos</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs uppercase text-slate-500">Valor por m²</div>
              <div className="mt-1 text-lg font-semibold">{formatNum(result.unitRecommended)} €/m²</div>
              <div className="mt-1 text-xs text-slate-500">Mediana: {formatNum(result.unitMedian)} €/m²</div>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500">
            Método: comparación de mercado con testigos homogeneizados y media ponderada (fuente, recencia y distancia). Estimación
            automatizada de demostración basada en datos simulados; no constituye una tasación oficial.
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-xs text-amber-700">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <SubTitle>Observaciones del tasador</SubTitle>
          <div className="min-h-[72px] whitespace-pre-line rounded-md border border-dashed border-slate-300 p-3 text-sm">
            {tasador.notes || 'Sin observaciones.'}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-10">
            <div>
              <div className="h-16 border-b border-slate-400" />
              <div className="mt-2 text-sm font-medium">{tasador.valuer}</div>
              <div className="text-xs text-slate-500">{tasador.collegiate}</div>
              <div className="text-xs text-slate-500">{tasador.agency}</div>
            </div>
            <div>
              <div className="h-16 border-b border-slate-400" />
              <div className="mt-2 text-xs text-slate-500">Firma y sello (o firma digital)</div>
            </div>
          </div>
          <PageFoot date={dateLong} code={code} />
        </section>
      </article>
    </div>
  );
}

/* ---------- Tabla de testigos ---------- */

function TestigosTable({
  rows,
  mode,
  totalW,
}: {
  rows: WitnessValuation[];
  mode: 'portal' | 'registro';
  totalW: number;
}) {
  return (
    <div className="mt-5 space-y-4">
      {rows.map((r, i) => {
        const w = r.witness;
        const chars = [
          w.elevator ? 'Ascensor' : 'Sin ascensor',
          w.garage ? 'Garaje' : null,
          w.storage ? 'Trastero' : null,
          w.airConditioning ? 'Aire acond.' : null,
          w.orientation ? `Orientación ${ORIENTATION_LABELS[w.orientation]}` : null,
        ].filter(Boolean) as string[];
        return (
          <div key={w.id} className="avoid-break grid grid-cols-[auto_1fr] gap-4 border-b border-slate-100 pb-4 sm:grid-cols-[auto_1fr_1fr]">
            <ThumbPlaceholder n={i + 1} />
            <div>
              <div className="text-base font-semibold text-sky-600">{formatEUR(w.price)}</div>
              <div className="text-xs text-slate-600">
                {formatNum(r.unitRaw)} €/m² original · <b className="text-brand-900">{formatNum(r.unitAdjusted)} €/m² homog.</b>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {w.area} m² · {w.rooms} hab. · {w.floor === 0 ? 'Planta baja' : `Planta ${w.floor}`}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Peso {((r.weight / totalW) * 100).toFixed(1).replace('.', ',')} % · Coef. {((r.coefficient - 1) * 100).toFixed(1).replace('.', ',')} %
              </div>
            </div>
            <div className="col-span-2 text-xs sm:col-span-1">
              <div className="font-medium text-slate-800">{w.address}</div>
              <div className="text-slate-500">{w.zone} · {w.municipality} · {Math.round(r.distance)} m</div>
              <div className="mt-1 text-slate-600">{chars.join(' · ')}</div>
              <div className="text-slate-600">{CONDITION_LABELS[w.condition]} · Año {w.yearBuilt}</div>
              <div className="mt-1 text-slate-500">
                {mode === 'portal'
                  ? `${w.priceType === 'oferta' ? 'Oferta' : 'Precio de cierre'} · Fecha de baja: ${formatDate(w.date)}`
                  : `Fecha de venta: ${formatDate(w.date)} · ${w.reference ?? ''}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
