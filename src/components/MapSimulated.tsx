export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  selected?: boolean;
  kind?: 'witness' | 'transport' | 'park';
  label?: string; // número visible en el marcador
}

interface Props {
  lat: number;
  lng: number;
  points: MapPoint[];
  radius?: number; // metros hasta el borde vertical del mapa
}

/** Mapa de situación SIMULADO en SVG (no es cartografía oficial). */
export function MapSimulated({ lat, lng, points, radius = 1500 }: Props) {
  const W = 640;
  const H = 340;
  const cx = W / 2;
  const cy = H / 2;
  const scale = (H / 2 - 24) / radius; // px por metro
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const project = (la: number, lo: number) => ({
    x: cx + (lo - lng) * kx * scale,
    y: cy - (la - lat) * 110540 * scale,
  });

  const visible = points
    .map((p) => ({ ...p, ...project(p.lat, p.lng) }))
    .filter((p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H);

  const streets = Array.from({ length: 8 }, (_, i) => {
    const y = 30 + i * 40;
    return `M0 ${y} Q ${W * 0.5} ${y + (i % 2 ? 18 : -14)} ${W} ${y + ((i % 3) * 12 - 10)}`;
  });
  const avenues = Array.from({ length: 6 }, (_, i) => {
    const x = 50 + i * 105;
    return `M ${x} 0 Q ${x + (i % 2 ? 25 : -20)} ${H / 2} ${x + ((i % 3) * 10 - 10)} ${H}`;
  });

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Mapa de situación simulado">
        <rect width={W} height={H} fill="#eef2f7" />
        <path d={`M0 ${H * 0.8} C ${W * 0.3} ${H * 0.6}, ${W * 0.6} ${H * 0.95}, ${W} ${H * 0.7}`} stroke="#bae6fd" strokeWidth={14} fill="none" />
        <rect x={W * 0.62} y={H * 0.08} width={W * 0.3} height={H * 0.3} rx={6} fill="#dcfce7" opacity={0.7} />
        {streets.map((d, i) => (
          <path key={`s${i}`} d={d} stroke="#ffffff" strokeWidth={3} fill="none" />
        ))}
        {avenues.map((d, i) => (
          <path key={`a${i}`} d={d} stroke="#ffffff" strokeWidth={7} fill="none" />
        ))}
        <circle cx={cx} cy={cy} r={500 * scale} fill="none" stroke="#94a3b8" strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r={1000 * scale} fill="none" stroke="#94a3b8" strokeDasharray="4 4" />
        <text x={cx + 500 * scale + 4} y={cy} fontSize="10" fill="#64748b">500 m</text>
        <text x={cx + 1000 * scale + 4} y={cy} fontSize="10" fill="#64748b">1 km</text>

        {visible.map((p) => {
          if (p.kind === 'transport')
            return <rect key={p.id} x={p.x - 6} y={p.y - 6} width={12} height={12} rx={3} fill="#d97706" stroke="#fff" strokeWidth={1.5} />;
          if (p.kind === 'park')
            return <circle key={p.id} cx={p.x} cy={p.y} r={6} fill="#16a34a" stroke="#fff" strokeWidth={1.5} />;
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={p.label ? 9 : 5} fill={p.selected === false ? '#94a3b8' : '#2563a8'} stroke="#ffffff" strokeWidth={1.5} />
              {p.label && (
                <text x={p.x} y={p.y + 3.5} fontSize="10" fontWeight="700" fill="#ffffff" textAnchor="middle">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        <g>
          <circle cx={cx} cy={cy} r={12} fill="#0ea5e9" fillOpacity={0.2} />
          <circle cx={cx} cy={cy} r={6} fill="#0b2340" stroke="#ffffff" strokeWidth={2} />
          <text x={cx + 12} y={cy - 8} fontSize="11" fontWeight="600" fill="#0b2340">Inmueble objeto</text>
        </g>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[11px] text-slate-500">
        <span>Mapa de situación simulado · no es cartografía oficial</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Testigo</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 bg-amber-600" /> Transporte</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Parque</span>
        </span>
      </div>
    </div>
  );
}
