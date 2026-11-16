import { Eye, Fan as FanIcon, Rocket, Wind } from 'lucide-react'

export type ScenarioId = 'ghost' | 'artemis' | 'quench' | 'blowoff'

/*
 * Each scenario's settings were checked against the model on 2026-11-15
 * (see README). The two extinction scenarios lower the oxygen first: at 21%
 * O2 the model's PMMA flame survives both zero flow and 40 cm/s.
 */
export const SCENARIOS: { id: ScenarioId; label: string; hint: string; Icon: typeof Eye }[] = [
  { id: 'ghost', label: 'Ghost flame (ISS)', hint: 'PMMA at 1.5 cm/s in ISS air: dim to the eye, clear in thermal', Icon: Eye },
  { id: 'artemis', label: 'Artemis shift', hint: 'Nomex cannot burn in ISS air in the model, but can at 56.5 kPa and 34% O₂', Icon: Rocket },
  { id: 'quench', label: 'Fan off: radiative quench', hint: 'PMMA at 17% O₂ burning at 5 cm/s, then the fan stops', Icon: FanIcon },
  { id: 'blowoff', label: 'Too much air: blow-off', hint: 'PMMA at 14.5% O₂ burning at 5 cm/s, then the fan goes to 40 cm/s', Icon: Wind },
]

export function ScenarioBar({ onRun, active }: { onRun: (id: ScenarioId) => void; active: ScenarioId | null }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Guided scenarios">
      {SCENARIOS.map(({ id, label, hint, Icon }) => (
        <button key={id} onClick={() => onRun(id)} title={hint}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
            active === id ? 'border-cyan-nasa bg-cyan-nasa/15 text-cyan-nasa' : 'border-edge text-slate-300 hover:border-slate-400'}`}>
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  )
}
