import { Crosshair, X } from 'lucide-react'

export interface ProbeReading {
  x: number // m
  y: number // m
  T: number
  xO2: number
  speedCmS: number
  insideRod: boolean
}

export function RadiometricProbe({ reading, onClear }: { reading: ProbeReading | null; onClear: () => void }) {
  if (!reading) {
    return (
      <div className="hud text-[12px] text-slate-500 flex items-center gap-2">
        <Crosshair size={12} /> Click inside the duct to probe the mid-plane · drag to orbit
      </div>
    )
  }
  return (
    <div className="bg-deck/90 border border-edge rounded-md px-3 py-2 hud text-[11px] backdrop-blur min-w-[220px]">
      <div className="flex items-center justify-between text-slate-400 text-[12px] uppercase tracking-widest mb-1">
        <span className="flex items-center gap-1.5"><Crosshair size={11} /> Probe</span>
        <button onClick={onClear} aria-label="Clear probe" className="hover:text-slate-200"><X size={12} /></button>
      </div>
      <div className="text-slate-500">x {(reading.x * 1000).toFixed(1)} mm · y {(reading.y * 1000).toFixed(1)} mm</div>
      {reading.insideRod ? (
        <div className="text-slate-300">inside the fuel rod</div>
      ) : (
        <>
          <div>T <span className="text-thermal">{reading.T.toFixed(0)} K</span></div>
          <div>O₂ <span className="text-cyan-nasa">{(reading.xO2 * 100).toFixed(1)} %</span></div>
          <div>|u| <span className="text-slate-200">{reading.speedCmS.toFixed(1)} cm/s</span></div>
        </>
      )}
      <div className="text-[11px] text-slate-500 mt-1">analytic field shape, not a CFD solution</div>
    </div>
  )
}
