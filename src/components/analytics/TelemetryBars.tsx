import { Activity, Eye, EyeOff, Flame, FlameKindling } from 'lucide-react'
import type { EngineState } from '../../types/combustion'

/** Round to the nearest half point: the model is not more precise than that. */
const halfPt = (x: number) => Math.round(x * 200) / 2

export function TelemetryBars({ s, xO2 }: { s: EngineState; xO2: number }) {
  const margin = Number.isFinite(s.limitO2) ? halfPt(xO2 - s.limitO2) : null
  const visible = s.burning && s.soot >= 0.35
  return (
    <section className="card" aria-label="Result">
      <h2 className="panel-title mb-2"><Activity size={13} /> Result at this setting</h2>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-edge p-2">
          <dt className="text-[11px] text-slate-400">Can it burn?</dt>
          <dd className={`mt-1 flex items-center justify-center gap-1 text-sm font-semibold ${s.burning ? 'text-thermal' : 'text-emerald-400'}`}>
            {s.burning ? <Flame size={15} /> : <FlameKindling size={15} />} {s.burning ? 'Yes' : 'No'}
          </dd>
        </div>
        <div className="rounded border border-edge p-2">
          <dt className="text-[11px] text-slate-400">Easy to see?</dt>
          <dd className={`mt-1 flex items-center justify-center gap-1 text-sm font-semibold ${!s.burning ? 'text-slate-500' : visible ? 'text-warn' : 'text-sky-300'}`}>
            {!s.burning ? '—' : visible ? <><Eye size={15} /> Yes</> : <><EyeOff size={15} /> Dim</>}
          </dd>
        </div>
        <div className="rounded border border-edge p-2">
          <dt className="text-[11px] text-slate-400">O₂ above limit</dt>
          <dd className={`mt-1 hud text-sm font-semibold ${margin === null ? 'text-slate-500' : margin >= 0 ? 'text-thermal' : 'text-emerald-400'}`}>
            {margin === null ? 'no limit' : `${margin >= 0 ? '+' : ''}${margin.toFixed(1)} pt`}
          </dd>
        </div>
      </dl>
      <details className="mt-2">
        <summary className="text-[12px] text-slate-400 cursor-pointer hover:text-slate-200">Model internals</summary>
        <table className="w-full hud text-[12px] mt-1">
          <tbody className="[&_td]:py-0.5">
            <tr><td className="text-slate-400">Damköhler number (≥ 1 to burn)</td><td className="text-right">{s.da.toPrecision(2)}</td></tr>
            <tr><td className="text-slate-400">Heat lost to radiation</td><td className="text-right">{Math.round(s.radiativeLossFraction * 10) * 10}%</td></tr>
            <tr><td className="text-slate-400">Flame temperature</td><td className="text-right">{s.burning ? `~${Math.round(s.tFlame / 50) * 50} K` : '—'}</td></tr>
            <tr><td className="text-slate-400">Spalding B</td><td className="text-right">{s.spaldingB.toFixed(1)}</td></tr>
            <tr><td className="text-slate-400">Burning rate</td><td className="text-right">{s.burning ? `~${s.massFlux.toPrecision(2)} g/m²s` : '—'}</td></tr>
          </tbody>
        </table>
      </details>
    </section>
  )
}
