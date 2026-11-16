import { useState } from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react'

interface Props {
  onVacuumDump: () => void
  onNitrogenPurge: () => void
  onCo2Blast: () => void
  onReset: () => void
}

export function FirefightingSandbox({
  onVacuumDump,
  onNitrogenPurge,
  onCo2Blast,
  onReset,
}: Props) {
  const [feedback, setFeedback] = useState<{
    type: 'warn' | 'success' | 'vacuum'
    title: string
    msg: string
  } | null>(null)

  const handleVacuum = () => {
    onVacuumDump()
    setFeedback({
      type: 'vacuum',
      title: 'Duct Depressurized to Vacuum (0 kPa)',
      msg: 'Flame vanished as pressure dropped below molecular reaction limit. Spacecraft module must be isolated.',
    })
  }

  const handleNitrogen = () => {
    onNitrogenPurge()
    setFeedback({
      type: 'success',
      title: 'Inert N₂ Gas Flood Active (4% O₂)',
      msg: 'Flame starved safely without aerodynamic blast or ember dispersion. Clean ECLSS inerting.',
    })
  }

  const handleCo2 = () => {
    onCo2Blast()
    setFeedback({
      type: 'warn',
      title: 'CO₂ Blast Blow-Off Achieved — Operational Hazard!',
      msg: '40 cm/s extinguisher jet displaced the flame, but high gas velocity detached hot embers into downstream air ducts and pushed the astronaut backward with ~85 N reactive thrust.',
    })
  }

  const handleReset = () => {
    onReset()
    setFeedback(null)
  }

  return (
    <section className="card space-y-2.5" aria-label="Astronaut firefighting sandbox">
      <div className="flex items-center justify-between">
        <h2 className="panel-title flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-warn" /> Astronaut Firefighting Sandbox
        </h2>
        {feedback && (
          <button
            onClick={handleReset}
            className="hud text-[11px] text-slate-400 hover:text-cyan-nasa flex items-center gap-1"
          >
            <RotateCcw size={11} /> Reset Cabin
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-snug">
        On Earth, firefighters spray water or foam. In zero-g, water destroys electronics and extinguisher kick pushes astronauts backward. Test 3 microgravity suppression techniques:
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={handleVacuum}
          className="px-2 py-2 rounded border border-purple-500/50 bg-purple-950/20 hover:bg-purple-900/30 text-purple-200 text-left text-xs transition-colors"
          title="Open vent valve directly to space vacuum"
        >
          <div className="font-medium flex items-center gap-1">🌌 Vacuum Dump</div>
          <div className="text-[10px] text-purple-300/70 mt-0.5">Vents P to 0 kPa</div>
        </button>

        <button
          onClick={handleNitrogen}
          className="px-2 py-2 rounded border border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-200 text-left text-xs transition-colors"
          title="Flood the duct with pure inert nitrogen gas"
        >
          <div className="font-medium flex items-center gap-1">🧪 N₂ Flood</div>
          <div className="text-[10px] text-emerald-300/70 mt-0.5">Starves O₂ to 4%</div>
        </button>

        <button
          onClick={handleCo2}
          className="px-2 py-2 rounded border border-amber-500/50 bg-amber-950/20 hover:bg-amber-900/30 text-amber-200 text-left text-xs transition-colors"
          title="Discharge a portable CO2 fire extinguisher"
        >
          <div className="font-medium flex items-center gap-1">💨 CO₂ Blast</div>
          <div className="text-[10px] text-amber-300/70 mt-0.5">40 cm/s jet blow-off</div>
        </button>
      </div>

      {feedback && (
        <div
          className={`rounded border p-2.5 text-[11px] leading-snug transition-all ${
            feedback.type === 'warn'
              ? 'border-amber-500/70 bg-amber-950/30 text-amber-200'
              : feedback.type === 'vacuum'
                ? 'border-purple-500/70 bg-purple-950/30 text-purple-200'
                : 'border-emerald-500/70 bg-emerald-950/30 text-emerald-200'
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            {feedback.type === 'warn' ? (
              <AlertTriangle size={13} className="text-amber-400" />
            ) : feedback.type === 'vacuum' ? (
              <Sparkles size={13} className="text-purple-400" />
            ) : (
              <CheckCircle2 size={13} className="text-emerald-400" />
            )}
            {feedback.title}
          </div>
          <p className="text-slate-300">{feedback.msg}</p>
        </div>
      )}
    </section>
  )
}
