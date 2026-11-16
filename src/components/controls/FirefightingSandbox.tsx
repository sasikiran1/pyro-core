import { useState } from 'react'
import { CheckCircle2, ExternalLink, RotateCcw, ShieldAlert, Wind } from 'lucide-react'

interface Props {
  materialShort: string
  /** Current cabin O2 mole fraction */
  xO2: number
  /** Model: lowest O2 at which this material burns at any airflow, at this pressure */
  minLimitX: number
  onFlood: (targetX: number) => void
  onReset: (previousX: number) => void
}

/** Nitrogen flood target: 10% O2, below every material's lowest model limit at ISS pressure. */
const FLOOD_X = 0.1

/**
 * Nitrogen suppression, the one suppression method this app can show honestly:
 * BASS (PSI-26) set out to test how well an inert gas puts out flames on the
 * ISS, and BASS-II lowered O2 with nitrogen. The result shown is model output.
 */
export function FirefightingSandbox({ materialShort, xO2, minLimitX, onFlood, onReset }: Props) {
  const [before, setBefore] = useState<number | null>(null)
  const flooded = before !== null
  return (
    <section className="card space-y-2.5" aria-label="Nitrogen suppression">
      <div className="flex items-center justify-between">
        <h2 className="panel-title flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-warn" /> Put it out with nitrogen
        </h2>
        {flooded && (
          <button onClick={() => { onReset(before!); setBefore(null) }}
            className="hud text-[11px] text-slate-400 hover:text-cyan-nasa flex items-center gap-1">
            <RotateCcw size={11} /> Restore {(before! * 100).toFixed(1)}% O₂
          </button>
        )}
      </div>
      <p className="text-[12px] text-slate-400 leading-snug">
        Spacecraft can fight a fire by adding inert gas until there is too little oxygen to burn. NASA's BASS experiment set out to test
        how well an inert gas puts flames out on the ISS, and BASS-II lowered the oxygen with nitrogen.
      </p>
      <button onClick={() => { if (!flooded) setBefore(xO2); onFlood(FLOOD_X) }} disabled={flooded}
        className="flex items-center gap-2 px-3 py-2 rounded border border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-200 text-xs font-medium disabled:opacity-60">
        <Wind size={14} /> Flood the duct with nitrogen (O₂ → {(FLOOD_X * 100).toFixed(0)}%)
      </button>
      {flooded && (
        <div className="rounded border border-emerald-500/60 bg-emerald-950/30 p-2.5 text-[12px] leading-snug text-emerald-100">
          <div className="font-semibold flex items-center gap-1.5 mb-1"><CheckCircle2 size={13} className="text-emerald-400" /> Oxygen now {(xO2 * 100).toFixed(1)}%</div>
          {xO2 < minLimitX
            ? <>In the model, {materialShort} needs at least {(minLimitX * 100).toFixed(1)}% O₂ to burn at any airflow here, so the flame goes out. The rod stays hot: see the cool-down panel.</>
            : <>In the model, {materialShort} can still burn here (limit {(minLimitX * 100).toFixed(1)}%).</>}
          <div className="text-[11px] text-emerald-300/70 mt-1">Model output, not a suppression procedure.</div>
        </div>
      )}
      <a href="https://psi.nasa.gov/physci/repo/data/investigations/PSI-26" target="_blank" rel="noreferrer"
        className="text-[11px] text-slate-500 hover:text-cyan-nasa inline-flex items-center gap-1">
        BASS, PSI-26: objectives include inert-gas suppression <ExternalLink size={10} />
      </a>
    </section>
  )
}
