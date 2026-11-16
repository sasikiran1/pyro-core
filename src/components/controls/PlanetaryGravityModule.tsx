import { Globe2 } from 'lucide-react'
import { clsx } from 'clsx'
import { PLANETARY_GRAVITIES } from '../../physics/constants'

interface Props {
  gravity: number
  onChange: (g: number) => void
}

export function PlanetaryGravityModule({ gravity, onChange }: Props) {
  const activePreset = PLANETARY_GRAVITIES.find((p) => Math.abs(p.g - gravity) < 0.03)
  const buoyantDraft = (20.0 * Math.sqrt(Math.max(0, gravity))).toFixed(1)

  return (
    <section className="card space-y-2.5" aria-label="Planetary gravity">
      <div className="flex items-center justify-between">
        <h2 className="panel-title flex items-center gap-1.5"><Globe2 size={13} /> Planetary gravity</h2>
        <span className="hud text-[11px] text-cyan-nasa font-medium">
          {gravity.toFixed(2)}g ({buoyantDraft} cm/s draft)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PLANETARY_GRAVITIES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.g)}
            className={clsx(
              'px-2 py-1.5 rounded border text-left text-xs transition-colors',
              activePreset?.id === p.id
                ? 'border-cyan-nasa/60 bg-cyan-nasa/10 text-slate-100 font-medium'
                : 'border-edge text-slate-400 hover:border-slate-500',
            )}
          >
            <div className="font-medium text-slate-200">{p.short}</div>
            <div className="text-[10px] text-slate-500">{p.name}</div>
          </button>
        ))}
      </div>

      <label className="block pt-1">
        <div className="flex justify-between hud text-[11px] text-slate-400 mb-1">
          <span>Continuous gravity</span>
          <span className="text-slate-200">{gravity === 0 ? '0g (Zero-g)' : `${gravity.toFixed(2)}g`}</span>
        </div>
        <input
          type="range"
          className="w-full"
          min={0}
          max={1}
          step={0.01}
          value={gravity}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Gravity in g units"
        />
      </label>

      <div className="text-[11px] text-slate-400 bg-void/50 border border-edge/60 rounded p-2 leading-snug">
        {activePreset?.note ??
          (gravity > 0
            ? `Partial gravity produces a natural chimney draft of ~${buoyantDraft} cm/s upward, stretching the flame.`
            : 'Zero gravity eliminates natural buoyant draft. The flame relies strictly on fan airflow.')}
      </div>
    </section>
  )
}
