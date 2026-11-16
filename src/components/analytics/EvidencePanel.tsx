import { useMemo } from 'react'
import { BookOpen, ExternalLink, TriangleAlert } from 'lucide-react'
import { rankInvestigations } from '../../data/nasaEvidence'
import { BASS2_COVERAGE } from '../../physics/constants'
import type { Material } from '../../types/combustion'

interface Props {
  material: Material
  pressureKPa: number
  xO2: number
}

/** Is the cabin inside the conditions BASS-II actually flew? */
export function insideFlightData(pressureKPa: number, xO2: number) {
  const c = BASS2_COVERAGE
  return pressureKPa >= c.pressureKPa[0] && pressureKPa <= c.pressureKPa[1] && xO2 >= c.xO2[0] && xO2 <= c.xO2[1]
}

export function EvidencePanel({ material, pressureKPa, xO2 }: Props) {
  const ranked = useMemo(() => rankInvestigations(material.id, pressureKPa, xO2), [material.id, pressureKPa, xO2])
  const inside = insideFlightData(pressureKPa, xO2)
  return (
    <section className="card" aria-label="NASA evidence">
      <h2 className="panel-title mb-2"><BookOpen size={13} /> NASA investigations closest to this case</h2>
      {inside ? (
        <p className="text-[12px] text-emerald-300 leading-snug mb-2">
          This cabin is inside the conditions BASS-II flew (ISS pressure, about 14–21% O₂).
        </p>
      ) : (
        <p className="text-[12px] text-amber-300 leading-snug mb-2 flex gap-1.5">
          <TriangleAlert size={14} className="shrink-0 mt-0.5" />
          <span>
            No flight data in this list covers {pressureKPa.toFixed(1)} kPa at {(xO2 * 100).toFixed(1)}% O₂. BASS-II flew at ISS pressure and 21% O₂ or less,
            so the model is extrapolating here.
          </span>
        </p>
      )}
      <ol className="space-y-2">
        {ranked.slice(0, 3).map(({ inv, reasons }, i) => (
          <li key={inv.id} className="border-t border-edge/60 pt-2 first:border-0 first:pt-0">
            <div className="flex items-start justify-between gap-2">
              <a href={inv.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-slate-100 hover:text-cyan-nasa flex items-center gap-1">
                <span className="hud text-slate-500">{i + 1}.</span> {inv.name} <ExternalLink size={11} className="opacity-60" />
              </a>
              {inv.psiId && <span className="hud text-[11px] text-slate-400 shrink-0">{inv.psiId}</span>}
            </div>
            <p className="text-[12px] text-slate-300 leading-snug mt-0.5">{inv.finding}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {[inv.platform, inv.flow && `flow ${inv.flow}`, inv.oxygen && `O₂ ${inv.oxygen}`].filter(Boolean).join(' · ')}
            </p>
            {reasons.length > 0 && <p className="text-[11px] text-cyan-nasa/80 mt-0.5">ranked for: {reasons.join(', ')}</p>}
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-slate-500 mt-2 leading-snug">
        Facts read from NASA's PSI data repository and NASA Glenn's combustion pages; ranking is a fixed rule shown above, not AI.
      </p>
    </section>
  )
}
