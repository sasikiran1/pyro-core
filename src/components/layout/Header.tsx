import { Check, Download, FileText, Flame, Link2, Scale } from 'lucide-react'
import { clsx } from 'clsx'
import type { EngineState } from '../../types/combustion'
import { REGIME_STYLE } from '../analytics/PhaseNomogram'

interface Props {
  state: EngineState
  lit: boolean
  onReport: () => void
  onCsv: () => void
  onCompare: () => void
  onShare: () => void
  copied: boolean
}

export function Header({ state, lit, onReport, onCsv, onCompare, onShare, copied }: Props) {
  const status = lit ? REGIME_STYLE[state.regime].label : state.burning ? 'Can burn here: no flame lit' : REGIME_STYLE[state.regime].label
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 border-b border-edge bg-deck">
      <div className="flex items-center gap-2">
        <Flame size={18} className="text-thermal" />
        <div>
          <div className="hud text-sm font-bold tracking-[0.25em] text-slate-100">PYRO-CORE</div>
          <div className="text-[12px] text-slate-400">Will it burn in this spacecraft cabin? NASA flight data plus a model to read it.</div>
        </div>
      </div>
      <div className={clsx('hud text-[12px] px-2 py-1 rounded border',
        lit ? (state.regime === 'sooty' ? 'border-warn/60 text-warn' : 'border-sky-400/60 text-sky-300') : 'border-edge text-slate-400')}>
        {status}
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <button onClick={onCompare} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-warn/60 text-xs text-warn hover:bg-warn/10">
          <Scale size={13} /> ISS vs Artemis
        </button>
        <button onClick={onShare} aria-live="polite" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-edge text-xs text-slate-300 hover:border-slate-500">
          {copied ? <><Check size={13} className="text-emerald-400" /> Copied</> : <><Link2 size={13} /> Copy link</>}
        </button>
        <button onClick={onCsv} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-edge text-xs text-slate-300 hover:border-slate-500">
          <Download size={13} /> Flow sweep CSV
        </button>
        <button onClick={onReport} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-cyan-nasa/60 text-xs text-cyan-nasa hover:bg-cyan-nasa/10">
          <FileText size={13} /> Screening summary
        </button>
      </div>
    </header>
  )
}
