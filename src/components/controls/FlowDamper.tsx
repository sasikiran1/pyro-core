import { useRef } from 'react'
import { Fan, FlameKindling, PowerOff } from 'lucide-react'
import { clsx } from 'clsx'

const MAX = 40

interface Props {
  flowCmS: number
  onChange: (v: number) => void
  lit: boolean
  canIgnite: boolean
  onToggleFlame: () => void
}

/** A vertical lever: drag the handle (or use arrow keys) to set duct airflow, 0 to 40 cm/s (the BASS-II fan range). */
export function FlowDamper({ flowCmS, onChange, lit, canIgnite, onToggleFlame }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const setFromY = (clientY: number) => {
    const r = track.current!.getBoundingClientRect()
    const f = 1 - (clientY - r.top) / r.height
    onChange(Math.round(Math.min(1, Math.max(0, f)) * MAX * 2) / 2)
  }
  const frac = flowCmS / MAX
  return (
    <section className="card" aria-label="Airflow damper">
      <h2 className="panel-title mb-3"><Fan size={12} /> Duct airflow</h2>
      <div className="flex gap-4 items-stretch">
        <div
          ref={track}
          className="relative w-12 h-48 rounded-md bg-gradient-to-b from-deck to-void border border-edge cursor-ns-resize touch-none select-none"
          onPointerDown={(e) => {
            ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            setFromY(e.clientY)
          }}
          onPointerMove={(e) => e.buttons === 1 && setFromY(e.clientY)}
          role="slider"
          tabIndex={0}
          aria-label="Airflow velocity"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={flowCmS}
          aria-valuetext={`${flowCmS.toFixed(1)} centimetres per second`}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 5 : 0.5
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onChange(Math.min(MAX, flowCmS + step))
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onChange(Math.max(0, flowCmS - step))
            if (e.key === 'Home') onChange(0)
            if (e.key === 'End') onChange(MAX)
          }}
        >
          {[0, 10, 20, 30, 40].map((v) => (
            <div key={v} className="absolute left-0 right-0 border-t border-edge/70" style={{ bottom: `${(v / MAX) * 100}%` }}>
              <span className="absolute -right-6 -translate-y-1/2 hud text-[11px] text-slate-500">{v}</span>
            </div>
          ))}
          <div className="absolute left-1 right-1 bottom-0 rounded-b bg-cyan-nasa/15" style={{ height: `${frac * 100}%` }} />
          <div
            className="absolute left-[-6px] right-[-6px] h-5 rounded bg-gradient-to-b from-slate-300 to-slate-500 border border-slate-200 shadow-[0_0_12px_rgba(0,229,255,0.35)] flex items-center justify-center"
            style={{ bottom: `calc(${frac * 100}% - 10px)` }}
          >
            <div className="w-6 h-0.5 bg-slate-700 rounded" />
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between pl-4">
          <div>
            <div className="hud text-3xl text-cyan-nasa glow-cyan">{flowCmS.toFixed(1)}</div>
            <div className="hud text-[12px] text-slate-400">cm/s forced airflow</div>
            <div className="text-[11px] text-cyan-nasa/90 font-medium mt-1">
              {/* Plain descriptions only: whether the flame survives is shown by the model, not by this label. */}
              {flowCmS <= 0.2
                ? 'Fan off: no forced airflow'
                : flowCmS <= 3.0
                  ? 'Very gentle draft'
                  : flowCmS <= 15.0
                    ? 'Moderate airflow'
                    : flowCmS <= 28.0
                      ? 'Strong airflow'
                      : 'Very strong airflow (top of the BASS-II fan range)'}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 leading-snug">
              No gravity means no rising hot air: this fan flow is the only oxygen the flame receives.
            </div>
          </div>
          <button
            onClick={onToggleFlame}
            disabled={!lit && !canIgnite}
            className={clsx(
              'mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-colors cursor-pointer',
              lit
                ? 'border-amber-500/70 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : canIgnite
                  ? 'border-thermal/60 text-thermal hover:bg-thermal/10'
                  : 'border-edge text-slate-600 cursor-not-allowed',
            )}
            title={
              lit
                ? 'Click to extinguish the flame manually'
                : canIgnite
                  ? 'Fire the NASA hot-wire igniter coil to start combustion'
                  : 'The cabin atmosphere cannot sustain a flame (adjust O2, pressure, or flow)'
            }
          >
            {lit ? (
              <>
                <PowerOff size={14} className="text-amber-400" />
                <span>Extinguish flame</span>
              </>
            ) : (
              <>
                <FlameKindling size={14} />
                <span>{canIgnite ? 'Fire igniter' : 'Would not sustain'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
