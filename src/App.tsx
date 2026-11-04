import { useMemo, useState } from 'react';
import { MOCK_PROPERTIES } from './data/mockProperties';
import { MOCK_WITNESSES } from './data/mockWitnesses';
import type { CatastroData } from './lib/catastro';
import { formatEUR, formatNum } from './lib/format';
import { searchWitnesses } from './lib/search';
import { computeValuation, valuateWitness } from './lib/valuation';
import type { FactorKey, FactorOverrides, Property, Tasador, ValuationSettings, Witness } from './types';
import { PropertyForm } from './components/PropertyForm';
import { WitnessSelector } from './components/WitnessSelector';
import { ValuationCalculator } from './components/ValuationCalculator';
import { ReportPreview } from './components/ReportPreview';
import { AddWitnessForm } from './components/AddWitnessForm';
import { Button, Card, Kpi } from './components/ui';
import { formatM2, normalize } from './lib/format';

type Step = 'inmueble' | 'testigos' | 'valoracion' | 'informe';

const STEPS: { id: Step; label: string }[] = [
  { id: 'inmueble', label: '1. Inmueble' },
  { id: 'testigos', label: '2. Testigos' },
  { id: 'valoracion', label: '3. Valoración' },
  { id: 'informe', label: '4. Informe' },
];

const DEFAULT_SETTINGS: ValuationSettings = { discount: 5, valuationDate: '2026-11-04' };
const DEFAULT_TASADOR: Tasador = {
  agency: 'Mi Agencia de Tasación',
  valuer: 'Nombre del tasador',
  collegiate: 'Nº de colegiado',
  email: '',
  phone: '',
  notes: '',
};
const AUTO_SELECT = 8;

/** Propuesta inicial: los testigos más relevantes para el inmueble. */
function proposal(p: Property, pool: Witness[]): Set<string> {
  return new Set(searchWitnesses(p, pool, 30).slice(0, AUTO_SELECT).map((w) => w.id));
}

export default function App() {
  const [property, setProperty] = useState<Property>(MOCK_PROPERTIES[0]);
  const [manual, setManual] = useState<Witness[]>([]);
  const [discardedIds, setDiscardedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => proposal(MOCK_PROPERTIES[0], MOCK_WITNESSES));
  const [overrides, setOverrides] = useState<Record<string, FactorOverrides>>({});
  const [settings, setSettings] = useState<ValuationSettings>(DEFAULT_SETTINGS);
  const [tasador, setTasador] = useState<Tasador>(DEFAULT_TASADOR);
  const [step, setStep] = useState<Step>('inmueble');
  const [showAdd, setShowAdd] = useState(false);
  const [rentMonthly, setRentMonthly] = useState(1100);

  const allWitnesses = useMemo(() => [...MOCK_WITNESSES, ...manual], [manual]);
  const pool = useMemo(() => allWitnesses.filter((w) => !discardedIds.has(w.id)), [allWitnesses, discardedIds]);
  const candidates = useMemo(() => searchWitnesses(property, pool, 30), [property, pool]);
  const discarded = useMemo(() => allWitnesses.filter((w) => discardedIds.has(w.id)), [allWitnesses, discardedIds]);

  const rows = useMemo(
    () =>
      candidates
        .filter((c) => selectedIds.has(c.id))
        .map((c) => valuateWitness(property, c, c.distance, settings, overrides[c.id])),
    [candidates, selectedIds, property, settings, overrides],
  );
  const result = useMemo(() => computeValuation(property, rows), [property, rows]);

  // ---- Acciones ----
  const patchProperty = (patch: Partial<Property>) => setProperty((prev) => ({ ...prev, ...patch }));

  const loadExample = (p: Property) => {
    setProperty(p);
    setDiscardedIds(new Set());
    setOverrides({});
  };

  const catastroLoad = (reference: string, data: CatastroData) =>
    setProperty((prev) => ({ ...prev, ...data, reference }));

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const discard = (id: string) => {
    setDiscardedIds((prev) => new Set(prev).add(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const restore = (id: string) =>
    setDiscardedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const setOverride = (id: string, key: FactorKey, value: number | undefined) =>
    setOverrides((prev) => {
      const current: FactorOverrides = { ...(prev[id] ?? {}) };
      if (value === undefined || Number.isNaN(value)) delete current[key];
      else current[key] = value;
      return { ...prev, [id]: current };
    });

  const goToWitnesses = () => {
    setSelectedIds(proposal(property, pool));
    setStep('testigos');
  };

  const addManual = (w: Witness) => {
    setManual((prev) => [...prev, w]);
    setSelectedIds((prev) => new Set(prev).add(w.id));
    setShowAdd(false);
  };

  const marketWitnesses = useMemo(
    () => pool.filter((w) => normalize(w.municipality) === normalize(property.municipality)),
    [pool, property.municipality],
  );

  return (
    <div className="min-h-screen">
      <header className="no-print bg-brand-900 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div>
            <div className="text-lg font-semibold tracking-tight">Tasador AVM</div>
            <div className="text-xs text-brand-100/80">Valoración automatizada de inmuebles · Provincia de Valladolid · Demo</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-brand-100/70">Valor estimado en vivo</div>
            <div className="text-base font-semibold">
              {formatEUR(result.value)} <span className="text-brand-100/80">· {formatNum(result.unitRecommended)} €/m²</span>
            </div>
            <div className="text-xs text-brand-100/70">
              {result.count} testigos seleccionados · {property.municipality}
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 lg:px-6">
          {STEPS.map((s) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => (s.id === 'testigos' ? goToWitnesses() : setStep(s.id))}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                  active ? 'border-white text-white' : 'border-transparent text-brand-100/70 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {step === 'inmueble' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PropertyForm
                property={property}
                onChange={patchProperty}
                onCatastroLoad={catastroLoad}
                onLoadExample={loadExample}
                onNext={goToWitnesses}
              />
            </div>
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              <Card title="Resumen del inmueble">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Referencia</dt><dd className="font-mono text-xs">{property.reference}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Dirección</dt><dd className="text-right">{property.address}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Municipio</dt><dd>{property.municipality}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Superficie</dt><dd>{formatM2(property.builtArea)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Habitaciones / baños</dt><dd>{property.rooms} / {property.bathrooms}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Año</dt><dd>{property.yearBuilt}</dd></div>
                </dl>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Kpi label="Valor estimado" value={formatEUR(result.value)} />
                <Kpi label="€/m²" value={`${formatNum(result.unitRecommended)} €`} />
              </div>
              <p className="text-xs text-slate-500">
                Los valores se recalculan al seleccionar o deseleccionar testigos y al modificar ajustes.
              </p>
            </aside>
          </div>
        )}

        {step === 'testigos' && (
          <WitnessSelector
            subject={property}
            settings={settings}
            candidates={candidates}
            selectedIds={selectedIds}
            discarded={discarded}
            overrides={overrides}
            onToggle={toggle}
            onSetSelection={(ids) => setSelectedIds(new Set(ids))}
            onDiscard={discard}
            onRestore={restore}
            onOverride={setOverride}
            onAddManual={() => setShowAdd(true)}
            onBack={() => setStep('inmueble')}
            onNext={() => setStep('valoracion')}
          />
        )}

        {step === 'valoracion' && (
          <ValuationCalculator
            subject={property}
            result={result}
            rows={rows}
            settings={settings}
            onSettingsChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
            onBack={() => setStep('testigos')}
            onNext={() => setStep('informe')}
          />
        )}

        {step === 'informe' && (
          <ReportPreview
            subject={property}
            result={result}
            rows={rows}
            marketWitnesses={marketWitnesses}
            settings={settings}
            tasador={tasador}
            onTasadorChange={(patch) => setTasador((prev) => ({ ...prev, ...patch }))}
            rentMonthly={rentMonthly}
            onRentChange={setRentMonthly}
            onBack={() => setStep('valoracion')}
          />
        )}
      </main>

      {showAdd && (
        <AddWitnessForm subject={property} onSubmit={addManual} onClose={() => setShowAdd(false)} />
      )}

      <footer className="no-print pb-8 pt-2 text-center text-xs text-slate-400">
        Datos simulados con fines demostrativos. No constituye una tasación oficial.
      </footer>
    </div>
  );
}
