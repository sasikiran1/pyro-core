import { Columns2, Eye, Thermometer, Wind } from 'lucide-react'
import { clsx } from 'clsx'
import type { SpectralMode } from '../../types/combustion'

const MODES: { id: SpectralMode; label: string; sub: string; Icon: typeof Eye }[] = [
  { id: 'compare', label: 'Eye vs thermal', sub: 'side by side', Icon: Columns2 },
  { id: 'visible', label: 'Visible', sub: '400–700 nm', Icon: Eye },
  { id: 'mwir', label: 'Thermal', sub: 'MWIR · 3.8 µm', Icon: Thermometer },
  { id: 'co', label: 'CO zone', sub: 'relative, fuel side', Icon: Wind },
]

export function SpectralToolbar({ mode, onChange }: { mode: SpectralMode; onChange: (m: SpectralMode) => void }) {
  return (
    <div className="flex flex-wrap gap-1 p-1 bg-deck/90 border border-edge rounded-md backdrop-blur" role="radiogroup" aria-label="Spectral view">
      {MODES.map(({ id, label, sub, Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={mode === id}
          onClick={() => onChange(id)}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded text-left transition-colors',
            mode === id ? 'bg-cyan-nasa/15 text-cyan-nasa' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <Icon size={14} />
          <span className="leading-tight">
            <span className="block text-xs font-medium">{label}</span>
            <span className="block hud text-[11px] opacity-70">{sub}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
