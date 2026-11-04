import { Fragment, useMemo, useState } from 'react';
import type { WitnessWithDistance } from '../lib/search';
import { formatDate, formatDistance, formatEUR, formatNum, coefToPct } from '../lib/format';
import { CONDITION_LABELS, SOURCE_LABELS } from '../lib/labels';
import { FACTOR_LABELS, FACTOR_ORDER, valuateWitness, type ValuationSettings } from '../lib/valuation';
import type { FactorKey, FactorOverrides, Property, Witness } from '../types';
import { Badge, Button, Card, Field, inputCls } from './ui';

interface Props {
  subject: Property;
  settings: ValuationSettings;
  candidates: WitnessWithDistance[];
  selectedIds: Set<string>;
  discarded: Witness[];
  overrides: Record<string, FactorOverrides>;
  onToggle: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onDiscard: (id: string) => void;
  onRestore: (id: string) => void;
  onOverride: (id: string, key: FactorKey, value: number | undefined) => void;
  onAddManual: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function WitnessSelector(props: Props) {
  const { subject, settings, candidates, selectedIds, discarded, overrides } = props;
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'todos' | Witness['source']>('todos');
  const [maxDistance, setMaxDistance] = useState(0);
  const [onlySelected, setOnlySelected] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Valoración individual de cada candidato (coeficientes y €/m² homogeneizado)
  const valuations = useMemo(
    () =>
      new Map(
        candidates.map((c) => [c.id, valuateWitness(subject, c, c.distance, settings, overrides[c.id])] as const),
      ),
    [candidates, subject, settings, overrides],
  );

  const filtered = candidates.filter((c) => {
    if (onlySelected && !selectedIds.has(c.id)) return false;
    if (source !== 'todos' && c.source !== source) return false;
    if (maxDistance > 0 && c.distance > maxDistance) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${c.address} ${c.zone} ${c.municipality} ${c.id}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pct = (v: number) => coefToPct(v);

  return (
    <div className="space-y-6">
      <Card
        title="Testigos comparables"
        subtitle={`${candidates.length} testigos propuestos · ${selectedIds.size} seleccionados para la media`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => props.onSetSelection(candidates.map((c) => c.id))}>Seleccionar todos</Button>
            <Button onClick={() => props.onSetSelection([])}>Ninguno</Button>
            <Button variant="primary" onClick={props.onAddManual}>
              + Añadir testigo
            </Button>
          </div>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Field label="Buscar">
            <input
              className={inputCls}
              placeholder="Dirección, zona, ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Field>
          <Field label="Fuente">
            <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
              <option value="todos">Todas</option>
              {(Object.keys(SOURCE_LABELS) as Witness['source'][]).map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Distancia máxima">
            <select className={inputCls} value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value))}>
              <option value={0}>Sin límite</option>
              <option value={500}>500 m</option>
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
            </select>
          </Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(e) => setOnlySelected(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              Mostrar solo seleccionados
            </label>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Sel.</th>
                <th className="px-3 py-2.5">Testigo / Dirección</th>
                <th className="px-3 py-2.5">Fuente</th>
                <th className="px-3 py-2.5 text-right">Superficie</th>
                <th className="px-3 py-2.5 text-right">Precio</th>
                <th className="px-3 py-2.5 text-right">€/m² original</th>
                <th className="px-3 py-2.5 text-right">€/m² homog.</th>
                <th className="px-3 py-2.5 text-right">Distancia</th>
                <th className="px-3 py-2.5">Estado · Año</th>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                    No hay testigos con los filtros actuales.
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const v = valuations.get(c.id);
                const isSel = selectedIds.has(c.id);
                const isOpen = expanded.has(c.id);
                const unitRaw = c.price / c.area;
                return (
                  <Fragment key={c.id}>
                    <tr className={isSel ? 'bg-brand-50/50' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${c.id} para la media`}
                          checked={isSel}
                          onChange={() => props.onToggle(c.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{c.address}</div>
                        <div className="text-xs text-slate-500">
                          {c.zone} · {c.municipality} · {c.id}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={c.source === 'manual' ? 'violet' : c.source === 'portal' ? 'amber' : 'blue'}>
                          {SOURCE_LABELS[c.source]}
                        </Badge>
                        <div className="mt-1 text-[11px] text-slate-400">{c.reference}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{c.area} m²</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <div className="font-medium">{formatEUR(c.price)}</div>
                        <div className="text-[11px] text-slate-400">{c.priceType === 'oferta' ? 'Oferta' : 'Cierre'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatNum(unitRaw)} €</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-brand-900">
                        {v ? `${formatNum(v.unitAdjusted)} €` : '—'}
                        {v && <div className="text-[11px] font-normal text-slate-400">coef. {pct(v.coefficient)}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatDistance(c.distance)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {CONDITION_LABELS[c.condition]} · {c.yearBuilt}
                        <div className="text-slate-400">
                          {c.elevator ? 'Ascensor' : 'Sin ascensor'} · Planta {c.floor}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{formatDate(c.date)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => toggleExpanded(c.id)}>
                            {isOpen ? 'Cerrar' : 'Ajustar'}
                          </Button>
                          <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => props.onDiscard(c.id)}>
                            Descartar
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && v && (
                      <tr className="bg-slate-50">
                        <td colSpan={11} className="px-4 py-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-slate-600">
                              Coeficientes automáticos según diferencias con el inmueble. Introduzca un % para sustituir
                              el automático (p. ej. <b>-3</b> para -3 %). Deje vacío para usar el automático.
                            </div>
                            <Button className="px-2 py-1 text-xs" onClick={() => {
                              FACTOR_ORDER.forEach((k) => props.onOverride(c.id, k, undefined));
                            }}>
                              Restablecer ajustes
                            </Button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            {v.factors.map((f) => (
                              <div key={f.key} className="rounded-md border border-slate-200 bg-white p-3">
                                <div className="text-xs font-medium text-slate-700">{FACTOR_LABELS[f.key]}</div>
                                <div className="mt-0.5 text-[11px] text-slate-400">Automático: {pct(f.auto)}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.5"
                                    placeholder={((f.auto - 1) * 100).toFixed(1)}
                                    value={overrides[c.id]?.[f.key] ?? ''}
                                    onChange={(e) =>
                                      props.onOverride(
                                        c.id,
                                        f.key,
                                        e.target.value === '' ? undefined : Number(e.target.value),
                                      )
                                    }
                                    className={`${inputCls} py-1.5`}
                                  />
                                  <span className="text-xs text-slate-500">%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          €/m² homog. = precio por m² corregido por superficie, planta/ascensor, estado, orientación, antigüedad, garaje,
          trastero, aire acondicionado y, en ofertas, descuento de cierre.
        </p>
      </Card>

      {discarded.length > 0 && (
        <Card title="Testigos descartados" subtitle="No se utilizan en el cálculo. Puede restaurarlos.">
          <ul className="divide-y divide-slate-100">
            {discarded.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {d.address} · <span className="text-slate-500">{d.zone} · {d.id}</span>
                </span>
                <Button className="px-2 py-1 text-xs" onClick={() => props.onRestore(d.id)}>
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button onClick={props.onBack}>← Datos del inmueble</Button>
        <Button variant="primary" className="px-5 py-2.5" onClick={props.onNext} disabled={selectedIds.size === 0}>
          Calcular valoración →
        </Button>
      </div>
    </div>
  );
}
