import { useRef } from 'react'
import { Fan, Flame, FlameKindling } from 'lucide-react'
import { clsx } from 'clsx'

const MAX = 40

interface Props {
  flowCmS: number
  onChange: (v: number) => void
  lit: boolean
  canIgnite: boolean
  onIgnite: () => void
}

/** A vertical lever: drag the handle (or use arrow keys) to set duct airflow, 0 to 40 cm/s (the BASS-II fan range). */
export function FlowDamper({ flowCmS, onChange, lit, canIgnite, onIgnite }: Props) {
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
              {flowCmS <= 0.2
                ? 'Dead air (fans off) — fire suffocates'
                : flowCmS <= 3.0
                  ? 'Gentle draft (slower than a snail)'
                  : flowCmS <= 15.0
                    ? 'Normal cabin AC breeze'
                    : flowCmS <= 28.0
                      ? 'Fast duct exhaust airflow'
                      : 'High-speed blast — blow-off risk'}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 leading-snug">
              No gravity means no rising hot air: this fan flow is the only oxygen the flame receives.
            </div>
          </div>
          <button
            onClick={onIgnite}
            disabled={lit || !canIgnite}
            className={clsx(
              'mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-colors',
              lit ? 'border-amber-600/50 text-amber-400 bg-amber-500/10' : canIgnite ? 'border-thermal/60 text-thermal hover:bg-thermal/10' : 'border-edge text-slate-600',
            )}
            title={canIgnite ? 'Fire the hot-wire igniter' : 'The model predicts no sustained flame at these conditions'}
          >
            {lit ? <Flame size={14} /> : <FlameKindling size={14} />}
            {lit ? 'Burning' : canIgnite ? 'Fire igniter' : 'Would not sustain'}
          </button>
        </div>
      </div>
    </section>
  )
}
