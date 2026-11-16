import { Layers } from 'lucide-react'
import { clsx } from 'clsx'
import { MATERIALS } from '../../physics/materialDatabase'
import type { Material, SourcedValue } from '../../types/combustion'

function Row({ label, v, fmt }: { label: string; v: SourcedValue; fmt: (x: number) => string }) {
  return (
    <tr className="border-t border-edge/60">
      <td className="py-1 pr-2 text-slate-400">{label}</td>
      <td className="py-1 pr-2 text-right text-slate-200">{fmt(v.value)} <span className="text-slate-500">{v.unit}</span></td>
      <td className="py-1 text-right" title={v.note ?? (v.source === 'literature' ? 'Approximate handbook value; verify before use' : 'Model estimate, not a measurement')}>
        <span className={clsx('src-tag', v.source === 'literature' ? 'src-literature' : 'src-model')}>{v.source === 'literature' ? 'lit.' : 'est.'}</span>
      </td>
    </tr>
  )
}

export function MaterialModule({ material, onChange }: { material: Material; onChange: (id: string) => void }) {
  const m = material
  return (
    <section className="card space-y-3" aria-label="Fuel material">
      <h2 className="panel-title"><Layers size={13} /> Fuel specimen (BASS-II rod)</h2>
      <div className="grid grid-cols-2 gap-1.5">
        {MATERIALS.map((x) => (
          <button key={x.id} onClick={() => onChange(x.id)}
            className={clsx('px-2.5 py-1.5 rounded border text-xs text-left transition-colors', x.id === m.id ? 'border-cyan-nasa/60 bg-cyan-nasa/10 text-slate-100 font-medium' : 'border-edge text-slate-400 hover:border-slate-500')}>
            <span className="block font-medium truncate">{x.commonName ? x.short : x.name}</span>
            <span className="block hud text-[10px] text-slate-500 truncate">{x.commonName ?? x.name}</span>
          </button>
        ))}
      </div>
      <div className="bg-void/40 border border-edge/60 rounded p-2 text-[11px]">
        <div className="text-slate-200 font-medium">{m.commonName ?? m.name}</div>
        <div className="text-slate-400 text-[10px] mt-0.5">{m.application ?? 'Spacecraft test polymer'}</div>
      </div>
      <table className="w-full hud text-[12px]">
        <tbody>
          <Row label="Heat of combustion" v={m.deltaHc} fmt={(x) => (x / 1e6).toFixed(1)} />
          <Row label="Heat of gasification" v={m.heatOfGasification} fmt={(x) => (x / 1e6).toFixed(2)} />
          <Row label="Oxygen index (1 g)" v={m.loi} fmt={(x) => (x * 100).toFixed(1)} />
          <Row label="Pyrolysis temp." v={m.pyrolysisT} fmt={(x) => x.toFixed(0)} />
          <Row label="Density" v={m.density} fmt={(x) => x.toFixed(0)} />
        </tbody>
      </table>
      <p className="text-[12px] text-slate-500 leading-snug">
        <span className="src-tag src-literature">lit.</span> approximate handbook value ·{' '}
        <span className="src-tag src-model">est.</span> model estimate. None of these are NASA flight measurements.
      </p>
      {m.caveat && <p className="text-[12px] text-amber-400/90 leading-snug">{m.caveat}</p>}
    </section>
  )
}
