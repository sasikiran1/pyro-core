import { Timer } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CoolingResult, Material } from '../../types/combustion'

interface Props {
  material: Material
  cooling: CoolingResult
  safeT: number
  onSafeT: (v: number) => void
  /** seconds since extinction, or null if the rod has not been burning */
  sinceOut: number | null
  rodT: number
}

export function ThermalRelaxation({ material, cooling, safeT, onSafeT, sinceOut, rodT }: Props) {
  const data = cooling.t.map((t, i) => ({ t, T: Math.round(cooling.T[i]) }))
  const remaining = cooling.holdTime !== null && sinceOut !== null ? Math.max(0, cooling.holdTime - sinceOut) : null
  return (
    <section className="card" aria-label="Rod cool-down after extinction">
      <h2 className="panel-title mb-2"><Timer size={12} /> Cool-down after extinction</h2>
      <div className="flex items-baseline justify-between hud">
        <div>
          <div className="text-[12px] text-slate-400">hold time to {safeT} K</div>
          <div className="text-2xl text-warn">{cooling.holdTime === null ? '> 15 min' : `~${Math.round(cooling.holdTime / 30) / 2} min`}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-slate-400">rod surface now</div>
          <div className="text-lg text-thermal">{Math.round(rodT)} K</div>
          {remaining !== null && <div className="text-[12px] text-slate-400">{remaining > 0 ? `${Math.ceil(remaining)} s to go` : 'below threshold'}</div>}
        </div>
      </div>
      <div className="h-36 mt-2">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${Math.round(v)}s`} />
            <YAxis domain={[280, Math.ceil(material.pyrolysisT.value / 50) * 50]} tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip contentStyle={{ background: '#111726', border: '1px solid #1E2638', fontSize: 11 }} labelFormatter={(v) => `${Math.round(Number(v))} s`} formatter={(v) => [`${v} K`, 'surface']} />
            <ReferenceLine y={safeT} stroke="#F59E0B" strokeDasharray="4 3" />
            {sinceOut !== null && <ReferenceLine x={Math.min(sinceOut, data[data.length - 1].t)} stroke="#00E5FF" />}
            <Line type="monotone" dataKey="T" stroke="#F43F5E" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <label className="block mt-2">
        <div className="flex justify-between hud text-[12px] text-slate-400"><span>Safe surface temperature (your criterion)</span><span className="text-slate-200">{safeT} K</span></div>
        <input type="range" className="w-full" min={310} max={material.pyrolysisT.value - 10} step={5} value={Math.min(safeT, material.pyrolysisT.value - 10)}
          onChange={(e) => onSafeT(Number(e.target.value))} aria-label="Safe surface temperature in kelvin" />
      </label>
      <p className="text-[12px] text-slate-500 leading-snug">
        Lumped cooling from the pyrolysis temperature by convection at the current airflow plus radiation. Conservative: it treats the whole rod as hot,
        though only a thin surface layer is. Biot number {cooling.biot.toFixed(2)}{cooling.biot > 0.1 ? ' (above 0.1, so the lumped model is approximate)' : ''}.
      </p>
    </section>
  )
}
