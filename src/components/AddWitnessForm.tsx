import { useState, type FormEvent } from 'react';
import type { Condition, Orientation, PriceType, Property, Witness } from '../types';
import { CONDITIONS, CONDITION_LABELS, ORIENTATIONS, ORIENTATION_LABELS } from '../lib/labels';
import { Button, Card, Check, Field, inputCls } from './ui';

interface Props {
  subject: Property;
  onSubmit: (w: Witness) => void;
  onClose: () => void;
}

export function AddWitnessForm({ subject, onSubmit, onClose }: Props) {
  const today = '2026-11-04';
  const [error, setError] = useState('');
  const [f, setF] = useState({
    address: '',
    reference: '',
    area: 80,
    rooms: 2,
    floor: 2,
    yearBuilt: 2000,
    price: 300000,
    priceType: 'cerrado' as PriceType,
    date: today,
    elevator: true,
    condition: 'bueno' as Condition,
    orientation: '' as '' | Orientation,
    garage: false,
    storage: false,
    airConditioning: false,
    lat: subject.lat,
    lng: subject.lng,
  });

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((prev) => ({ ...prev, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.address.trim()) return setError('Indique la dirección del testigo.');
    if (f.area <= 0 || f.price <= 0) return setError('La superficie y el precio deben ser mayores que 0.');
    setError('');
    onSubmit({
      id: `M-${Date.now().toString(36).toUpperCase()}`,
      source: 'manual',
      reference: f.reference || 'Introducido manualmente',
      address: f.address.trim(),
      zone: 'Aportado manualmente',
      municipality: subject.municipality,
      lat: f.lat,
      lng: f.lng,
      area: f.area,
      rooms: f.rooms,
      floor: f.floor,
      elevator: f.elevator,
      condition: f.condition,
      yearBuilt: f.yearBuilt,
      orientation: f.orientation || undefined,
      garage: f.garage,
      storage: f.storage,
      airConditioning: f.airConditioning,
      price: f.price,
      priceType: f.priceType,
      date: f.date,
    });
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-3xl">
        <Card
          title="Añadir testigo manual"
          subtitle="Introduzca los datos de una compraventa o un anuncio. Se seleccionará automáticamente."
          actions={
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Dirección" className="sm:col-span-2 lg:col-span-2">
              <input className={inputCls} value={f.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Referencia (anuncio / escritura)">
              <input className={inputCls} value={f.reference} onChange={(e) => set('reference', e.target.value)} />
            </Field>
            <Field label="Fecha">
              <input type="date" className={inputCls} value={f.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Superficie construida (m²)">
              <input type="number" className={inputCls} value={f.area} onChange={(e) => set('area', Number(e.target.value))} />
            </Field>
            <Field label="Precio (€)">
              <input type="number" className={inputCls} value={f.price} onChange={(e) => set('price', Number(e.target.value))} />
            </Field>
            <Field label="Tipo de precio">
              <select className={inputCls} value={f.priceType} onChange={(e) => set('priceType', e.target.value as PriceType)}>
                <option value="cerrado">Precio de cierre</option>
                <option value="oferta">Precio de oferta</option>
              </select>
            </Field>
            <Field label="Habitaciones">
              <input type="number" className={inputCls} value={f.rooms} onChange={(e) => set('rooms', Number(e.target.value))} />
            </Field>
            <Field label="Planta">
              <input type="number" className={inputCls} value={f.floor} onChange={(e) => set('floor', Number(e.target.value))} />
            </Field>
            <Field label="Año de construcción">
              <input type="number" className={inputCls} value={f.yearBuilt} onChange={(e) => set('yearBuilt', Number(e.target.value))} />
            </Field>
            <Field label="Estado">
              <select className={inputCls} value={f.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orientación">
              <select className={inputCls} value={f.orientation} onChange={(e) => set('orientation', e.target.value as '' | Orientation)}>
                <option value="">No consta</option>
                {ORIENTATIONS.map((o) => (
                  <option key={o} value={o}>
                    {ORIENTATION_LABELS[o]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Latitud">
              <input type="number" step="0.0001" className={inputCls} value={f.lat} onChange={(e) => set('lat', Number(e.target.value))} />
            </Field>
            <Field label="Longitud">
              <input type="number" step="0.0001" className={inputCls} value={f.lng} onChange={(e) => set('lng', Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <Check label="Ascensor" checked={f.elevator} onChange={(v) => set('elevator', v)} />
            <Check label="Garaje" checked={f.garage} onChange={(v) => set('garage', v)} />
            <Check label="Trastero" checked={f.storage} onChange={(v) => set('storage', v)} />
            <Check label="Aire acondicionado" checked={f.airConditioning} onChange={(v) => set('airConditioning', v)} />
          </div>
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Añadir testigo
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
