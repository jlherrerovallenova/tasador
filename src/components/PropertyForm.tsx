import { useState, type ChangeEvent } from 'react';
import { MOCK_PROPERTIES } from '../data/mockProperties';
import { lookupCatastro, type CatastroData } from '../lib/catastro';
import { CONDITIONS, CONDITION_LABELS, HEATING_LABELS, ORIENTATIONS, ORIENTATION_LABELS, USES } from '../lib/labels';
import type { Property } from '../types';
import { Button, Card, Check, Field, inputCls } from './ui';

type NumericKeys = { [K in keyof Property]: Property[K] extends number ? K : never }[keyof Property];
type BoolKeys = { [K in keyof Property]: Property[K] extends boolean ? K : never }[keyof Property];

interface Props {
  property: Property;
  onChange: (patch: Partial<Property>) => void;
  onCatastroLoad: (reference: string, data: CatastroData) => void;
  onLoadExample: (p: Property) => void;
  onNext: () => void;
}

export function PropertyForm({ property: p, onChange, onCatastroLoad, onLoadExample, onNext }: Props) {
  const [refInput, setRefInput] = useState(p.reference);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const num = (key: NumericKeys) => (e: ChangeEvent<HTMLInputElement>) =>
    onChange({ [key]: Number(e.target.value) } as Partial<Property>);
  const bool = (key: BoolKeys) => (v: boolean) => onChange({ [key]: v } as Partial<Property>);
  const text = (key: keyof Property) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: e.target.value } as Partial<Property>);

  async function consultar() {
    setStatus('loading');
    setMessage('');
    const res = await lookupCatastro(refInput);
    if (!res.ok) {
      setStatus('error');
      setMessage(res.error);
      return;
    }
    onCatastroLoad(res.reference, res.data);
    setStatus('ok');
    setMessage(
      res.simulated
        ? 'Datos cargados desde la simulación de Catastro (datos de demostración, no oficiales).'
        : 'Datos cargados desde Catastro.',
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Búsqueda por referencia catastral"
        subtitle="Introduzca los 20 caracteres de la referencia para cargar los datos oficiales (simulado)."
        actions={
          <select
            className={`${inputCls} w-auto`}
            value=""
            onChange={(e) => {
              const ex = MOCK_PROPERTIES.find((x) => x.reference === e.target.value);
              if (ex) {
                onLoadExample(ex);
                setRefInput(ex.reference);
                setStatus('idle');
                setMessage('');
              }
            }}
          >
            <option value="">Cargar inmueble de ejemplo…</option>
            {MOCK_PROPERTIES.map((x) => (
              <option key={x.reference} value={x.reference}>
                {x.municipality} · {x.address}
              </option>
            ))}
          </select>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Referencia catastral" hint={`${refInput.length}/20 caracteres`} className="flex-1">
            <input
              value={refInput}
              maxLength={20}
              placeholder="Ej.: 1234567VK4813S0001WX"
              onChange={(e) => setRefInput(e.target.value.toUpperCase())}
              className={`${inputCls} font-mono tracking-wider`}
            />
          </Field>
          <Button variant="primary" onClick={consultar} disabled={status === 'loading'} className="sm:mb-5">
            {status === 'loading' ? 'Consultando…' : 'Consultar Catastro'}
          </Button>
        </div>
        {message && (
          <p
            className={`mt-3 rounded-md px-3 py-2 text-sm ${
              status === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </p>
        )}
      </Card>

      <Card title="Ubicación" subtitle="Dirección y coordenadas del inmueble">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Dirección completa" className="lg:col-span-3">
            <input className={inputCls} value={p.address} onChange={text('address')} />
          </Field>
          <Field label="Población / Municipio" className="lg:col-span-2">
            <input className={inputCls} value={p.municipality} onChange={text('municipality')} />
          </Field>
          <Field label="Código postal">
            <input className={inputCls} value={p.postalCode} onChange={text('postalCode')} />
          </Field>
          <Field label="Provincia" className="lg:col-span-2">
            <input className={inputCls} value={p.province} onChange={text('province')} />
          </Field>
          <Field label="Latitud">
            <input type="number" step="0.0001" className={inputCls} value={p.lat} onChange={num('lat')} />
          </Field>
          <Field label="Longitud">
            <input type="number" step="0.0001" className={inputCls} value={p.lng} onChange={num('lng')} />
          </Field>
        </div>
      </Card>

      <Card title="Características físicas" subtitle="Superficies, distribución y calidades">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Superficie construida (m²)">
            <input type="number" min={10} className={inputCls} value={p.builtArea} onChange={num('builtArea')} />
          </Field>
          <Field label="Superficie útil (m²)">
            <input type="number" min={10} className={inputCls} value={p.usefulArea} onChange={num('usefulArea')} />
          </Field>
          <Field label="Superficie de suelo (m²)">
            <input type="number" min={0} className={inputCls} value={p.plotArea} onChange={num('plotArea')} />
          </Field>
          <Field label="Año de construcción">
            <input type="number" min={1800} max={2026} className={inputCls} value={p.yearBuilt} onChange={num('yearBuilt')} />
          </Field>
          <Field label="Habitaciones">
            <input type="number" min={0} className={inputCls} value={p.rooms} onChange={num('rooms')} />
          </Field>
          <Field label="Baños">
            <input type="number" min={0} className={inputCls} value={p.bathrooms} onChange={num('bathrooms')} />
          </Field>
          <Field label="Planta (0 = bajo)">
            <input type="number" min={0} max={40} className={inputCls} value={p.floor} onChange={num('floor')} />
          </Field>
          <Field label="Puerta">
            <input className={inputCls} value={p.door} onChange={text('door')} />
          </Field>
          <Field label="Orientación principal">
            <select className={inputCls} value={p.orientation} onChange={text('orientation')}>
              {ORIENTATIONS.map((o) => (
                <option key={o} value={o}>
                  {o} · {ORIENTATION_LABELS[o]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Uso">
            <select className={inputCls} value={p.use} onChange={text('use')}>
              {USES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5">
          <span className="mb-2 block text-xs font-medium text-slate-600">Estado de conservación / acabados</span>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONDITIONS.map((c) => {
              const active = p.condition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ condition: c })}
                  className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                    active
                      ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium">{CONDITION_LABELS[c]}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {c === 'reformar' && 'Requiere obra integral'}
                    {c === 'bueno' && 'Uso normal, sin deficiencias'}
                    {c === 'excelente' && 'Reformado de calidad alta'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Card title="Dotaciones del edificio y de la vivienda">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Check label="Ascensor" checked={p.elevator} onChange={bool('elevator')} />
          <Check label="Aire acondicionado" checked={p.airConditioning} onChange={bool('airConditioning')} />
          <Check label="Plaza de garaje" checked={p.garage} onChange={bool('garage')} />
          <Check label="Trastero" checked={p.storage} onChange={bool('storage')} />
          <Check label="Piscina comunitaria" checked={p.communityPool} onChange={bool('communityPool')} />
          <Check label="Zonas comunes" checked={p.communityAreas} onChange={bool('communityAreas')} />
          <Field label="Calefacción" className="sm:col-span-2">
            <select className={inputCls} value={p.heating} onChange={text('heating')}>
              {Object.entries(HEATING_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onNext} className="px-5 py-2.5">
          Buscar testigos comparables →
        </Button>
      </div>
    </div>
  );
}
