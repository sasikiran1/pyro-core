import { Gauge } from 'lucide-react'
import { clsx } from 'clsx'
import { ATMOSPHERES } from '../../physics/constants'

interface Props {
  pressureKPa: number
  xO2: number
  onChange: (pressureKPa: number, xO2: number) => void
}

export function AtmosphereModule({ pressureKPa, xO2, onChange }: Props) {
  const active = ATMOSPHERES.find((a) => Math.abs(a.pressureKPa - pressureKPa) < 0.05 && Math.abs(a.xO2 - xO2) < 0.0005)
  return (
    <section className="card space-y-3" aria-label="Cabin atmosphere">
      <h2 className="panel-title"><Gauge size={12} /> Cabin atmosphere</h2>
      <div className="grid gap-1.5">
        {ATMOSPHERES.map((a) => (
          <button
            key={a.id}
            onClick={() => onChange(a.pressureKPa, a.xO2)}
            className={clsx(
              'text-left px-2.5 py-1.5 rounded border transition-colors',
              active?.id === a.id ? 'border-cyan-nasa/60 bg-cyan-nasa/10' : 'border-edge hover:border-slate-500',
            )}
          >
            <div className="flex justify-between text-xs font-medium text-slate-200">
              <span>{a.name}</span>
              <span className="hud text-slate-400">{a.pressureKPa} kPa · {(a.xO2 * 100).toFixed(1)}%</span>
            </div>
            <div className="text-[12px] text-slate-500 leading-snug">{a.note}</div>
          </button>
        ))}
      </div>
      <label className="block">
        <div className="flex justify-between hud text-[12px] text-slate-400"><span>Total pressure</span><span className="text-slate-200">{pressureKPa.toFixed(1)} kPa</span></div>
        <input type="range" className="w-full" min={30} max={110} step={0.1} value={pressureKPa}
          onChange={(e) => onChange(Number(e.target.value), xO2)} aria-label="Total pressure in kPa" />
      </label>
      <label className="block">
        <div className="flex justify-between hud text-[12px] text-slate-400"><span>Oxygen fraction</span><span className="text-slate-200">{(xO2 * 100).toFixed(1)} %</span></div>
        <input type="range" className="w-full" min={0.1} max={0.4} step={0.001} value={xO2}
          onChange={(e) => onChange(pressureKPa, Number(e.target.value))} aria-label="Oxygen mole fraction" />
      </label>
      <div className="hud text-[12px] text-slate-500">
        O₂ partial pressure {(pressureKPa * xO2).toFixed(1)} kPa (sea level 21.3)
      </div>
    </section>
  )
}
