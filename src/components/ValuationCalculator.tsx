import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ValuationResult, WitnessValuation, ValuationSettings } from '../lib/valuation';
import { formatEUR, formatNum, formatM2 } from '../lib/format';
import { Button, Card, Field, Kpi, inputCls } from './ui';
import type { Property } from '../types';

interface Props {
  subject: Property;
  result: ValuationResult;
  rows: WitnessValuation[];
  settings: ValuationSettings;
  onSettingsChange: (patch: Partial<ValuationSettings>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ValuationCalculator({ subject, result, rows, settings, onSettingsChange, onBack, onNext }: Props) {
  const chartData = rows.map((r) => ({
    name: r.witness.id,
    bruto: Math.round(r.unitRaw),
    homog: Math.round(r.unitAdjusted),
    address: r.witness.address,
  }));

  const totalW = result.totalWeight || 1;
  const span = Math.max(result.valueMax - result.valueMin, 1);
  const markerPct = ((result.value - result.valueMin) / span) * 100;

  return (
    <div className="space-y-6">
      <Card title="Parámetros de cálculo" subtitle="Los cambios recalculan la valoración en tiempo real.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Descuento oferta → cierre (%)" hint="Aplicado a testigos con precio de oferta">
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              className={inputCls}
              value={settings.discount}
              onChange={(e) => onSettingsChange({ discount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Fecha de valoración" hint="Se usa para la antigüedad de los testigos">
            <input
              type="date"
              className={inputCls}
              value={settings.valuationDate}
              onChange={(e) => onSettingsChange({ valuationDate: e.target.value })}
            />
          </Field>
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <b className="text-slate-800">Método:</b> media ponderada de €/m² homogeneizados (peso por fuente, recencia y
            distancia). Horquilla: percentiles 25 y 75 de los testigos seleccionados.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Valor de mercado" value={formatEUR(result.value)} sub={`Sobre ${formatM2(result.area)} construidos`} />
        <Kpi label="€/m² recomendado" value={`${formatNum(result.unitRecommended)} €`} sub={`Mediana: ${formatNum(result.unitMedian)} €/m²`} />
        <Kpi label="Horquilla de valor" value={`${formatEUR(result.valueMin)} – ${formatEUR(result.valueMax)}`} sub="Mínimo – máximo" />
        <Kpi label="Testigos utilizados" value={String(result.count)} sub={`Dispersión ${(result.dispersion * 100).toFixed(1).replace('.', ',')} %`} />
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="mb-1 font-semibold">Avisos de calidad</div>
          <ul className="list-disc space-y-1 pl-5">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Horquilla de valor" className="xl:col-span-1">
          <div className="space-y-6 pt-2">
            <div>
              <div className="relative h-4 rounded-full bg-gradient-to-r from-sky-200 via-brand-500 to-brand-900">
                <div
                  className="absolute -top-1.5 h-7 w-1 -translate-x-1/2 rounded bg-amber-500 shadow"
                  style={{ left: `${Math.min(100, Math.max(0, markerPct))}%` }}
                  title="Valor recomendado"
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{formatEUR(result.valueMin)}</span>
                <span className="font-semibold text-amber-700">Recomendado {formatEUR(result.value)}</span>
                <span>{formatEUR(result.valueMax)}</span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-slate-500">Mínimo (P25)</dt>
              <dd className="text-right font-medium tabular-nums">{formatNum(result.unitP25)} €/m²</dd>
              <dt className="text-slate-500">Recomendado</dt>
              <dd className="text-right font-medium tabular-nums">{formatNum(result.unitRecommended)} €/m²</dd>
              <dt className="text-slate-500">Máximo (P75)</dt>
              <dd className="text-right font-medium tabular-nums">{formatNum(result.unitP75)} €/m²</dd>
            </dl>
          </div>
        </Card>

        <Card title="€/m² original vs. homogeneizado" subtitle="Cada barra es un testigo seleccionado" className="xl:col-span-2">
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              Seleccione testigos para ver el gráfico.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNum(v)} width={60} />
                  <Tooltip
                    formatter={(v: unknown) => `${formatNum(Number(v))} €/m²`}
                    labelFormatter={(_, payload) => (payload?.[0]?.payload as { address?: string })?.address ?? ''}
                  />
                  <ReferenceLine
                    y={result.unitRecommended}
                    stroke="#b45309"
                    strokeDasharray="4 4"
                    label={{ value: 'Recomendado', position: 'insideTopRight', fill: '#b45309', fontSize: 11 }}
                  />
                  <Bar dataKey="bruto" name="Original" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="homog" name="Homogeneizado" radius={[3, 3, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={d.homog >= result.unitRecommended ? '#1e5189' : '#2563a8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title="Ponderación de los testigos" subtitle="Peso relativo de cada testigo en la media">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3">Testigo</th>
                <th className="py-2 pr-3 text-right">€/m² original</th>
                <th className="py-2 pr-3 text-right">Coef. global</th>
                <th className="py-2 pr-3 text-right">€/m² homog.</th>
                <th className="py-2 pr-3 text-right">Distancia</th>
                <th className="py-2 pr-3 text-right">Peso</th>
                <th className="py-2 pr-3 text-right">Valor implícito</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.witness.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{r.witness.address}</div>
                    <div className="text-xs text-slate-500">{r.witness.zone} · {r.witness.id}</div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatNum(r.unitRaw)} €</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{(r.coefficient * 100).toFixed(1).replace('.', ',')} %</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">{formatNum(r.unitAdjusted)} €</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{Math.round(r.distance)} m</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {((r.weight / totalW) * 100).toFixed(1).replace('.', ',')} %
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatEUR(r.unitAdjusted * subject.builtArea)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={onBack}>← Testigos</Button>
        <Button variant="primary" className="px-5 py-2.5" onClick={onNext} disabled={result.count === 0}>
          Generar informe →
        </Button>
      </div>
    </div>
  );
}
