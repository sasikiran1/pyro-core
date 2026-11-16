import { useEffect, useMemo } from 'react'
import { ArrowRight, Scale, X } from 'lucide-react'
import { MATERIALS } from '../../physics/materialDatabase'
import { ATMOSPHERES } from '../../physics/constants'
import { minimumLimit } from '../../physics/combustionEngine'

const ISS = ATMOSPHERES.find((a) => a.id === 'iss')!
const EAA = ATMOSPHERES.find((a) => a.id === 'eaa')!
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

function Verdict({ burns }: { burns: boolean }) {
  return burns
    ? <span className="px-1.5 py-0.5 rounded border border-rose-500/60 text-rose-300 bg-rose-500/10">can burn</span>
    : <span className="px-1.5 py-0.5 rounded border border-emerald-500/60 text-emerald-300 bg-emerald-500/10">cannot burn</span>
}

/** ISS vs exploration atmosphere, every material: lowest burning O2 from the model, and the margin to the cabin's O2. */
export function ComparisonModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  const rows = useMemo(() => (open ? MATERIALS.map((m) => ({ m, iss: minimumLimit(m, ISS.pressureKPa).x, eaa: minimumLimit(m, EAA.pressureKPa).x })) : []), [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="ISS versus exploration atmosphere"
        className="bg-deck border border-edge rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
          <h2 className="panel-title"><Scale size={13} /> ISS air vs the exploration atmosphere</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-100"><X size={16} /></button>
        </div>
        <div className="p-4">
          <p className="text-[13px] text-slate-300 mb-3">
            Lowest O₂ at which each material can burn at any airflow, from the model, compared with the cabin's O₂.
            ISS: {ISS.pressureKPa} kPa, {pct(ISS.xO2)} O₂. Exploration: {EAA.pressureKPa} kPa, {pct(EAA.xO2)} O₂.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-slate-400 text-[12px]">
                <tr className="border-b border-edge">
                  <th className="text-left py-1.5 pr-2">Material</th>
                  <th className="text-right pr-2">1 g oxygen index</th>
                  <th className="text-right pr-2">ISS limit (margin)</th>
                  <th className="text-right pr-2">Exploration limit (margin)</th>
                  <th className="text-left pl-3">ISS → exploration</th>
                </tr>
              </thead>
              <tbody className="hud text-[12px]">
                {rows.map(({ m, iss, eaa }) => {
                  const mi = ISS.xO2 - iss
                  const me = EAA.xO2 - eaa
                  return (
                    <tr key={m.id} className="border-b border-edge/50">
                      <td className="py-1.5 pr-2 font-sans text-slate-100">{m.name}</td>
                      <td className="text-right pr-2">{pct(m.loi.value)}</td>
                      <td className="text-right pr-2">{pct(iss)} ({mi >= 0 ? '+' : ''}{(mi * 100).toFixed(1)})</td>
                      <td className="text-right pr-2">{pct(eaa)} ({me >= 0 ? '+' : ''}{(me * 100).toFixed(1)})</td>
                      <td className="pl-3"><span className="inline-flex items-center gap-1.5"><Verdict burns={mi > 0} /><ArrowRight size={12} /><Verdict burns={me > 0} /></span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-slate-500 mt-3 leading-snug">
            Margin = cabin O₂ minus the limit, in percentage points; positive means some airflow lets it burn. Lower pressure raises every limit,
            but 34% O₂ outweighs it. Only PMMA in ISS air is calibrated to flight data (BASS-II, 13.6%); every exploration-atmosphere value, and every
            other material, is model extrapolation. This is a screening comparison, not a material qualification.
          </p>
        </div>
      </div>
    </div>
  )
}
