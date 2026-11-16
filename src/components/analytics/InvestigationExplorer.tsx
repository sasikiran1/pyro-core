import { useMemo, useState } from 'react'
import { ExternalLink, Library, Scale } from 'lucide-react'
import { clsx } from 'clsx'
import { GOALS, HABITATS, rankCatalog, type Goal, type Habitat, type Investigation } from '../../data/investigationCatalog'

const NS = <span className="text-slate-600">not stated</span>
const FIELDS: [string, (i: Investigation) => React.ReactNode][] = [
  ['Fuel', (i) => i.fuelDetail ?? (i.fuel.length ? i.fuel.join(', ') : NS)],
  ['Hardware', (i) => i.hardware ?? NS],
  ['Conditions', (i) => i.conditions ?? NS],
  ['Measurements', (i) => i.measures ?? NS],
  ['Key point', (i) => i.finding ?? NS],
  ['Data', (i) => i.status],
  ['Source', (i) => i.source],
]

/**
 * The challenge's core ask: summarise, rank and interpret NASA combustion
 * investigations for a habitat and a fire-safety goal, and compare them.
 */
export function InvestigationExplorer() {
  const [habitat, setHabitat] = useState<Habitat>('moon')
  const [goal, setGoal] = useState<Goal>('prevention')
  const [picked, setPicked] = useState<string[]>([])
  const ranked = useMemo(() => rankCatalog(habitat, goal), [habitat, goal])
  const compare = ranked.filter((r) => picked.includes(r.inv.id)).map((r) => r.inv)
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-3)))

  return (
    <section className="card" aria-label="NASA investigation explorer">
      <h2 className="panel-title mb-1"><Library size={13} /> NASA investigation explorer</h2>
      <p className="text-[12px] text-slate-400 mb-2 leading-snug">
        {ranked.length} NASA microgravity combustion investigations, ranked for your habitat and safety goal. Tick up to 3 to compare side by side.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-1.5" role="radiogroup" aria-label="Habitat">
        {HABITATS.map((h) => (
          <button key={h.id} role="radio" aria-checked={habitat === h.id} title={h.hint} onClick={() => setHabitat(h.id)}
            className={clsx('px-2.5 py-1 rounded-full border text-[12px]', habitat === h.id ? 'border-cyan-nasa bg-cyan-nasa/15 text-cyan-nasa' : 'border-edge text-slate-300 hover:border-slate-400')}>
            {h.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup" aria-label="Fire-safety goal">
        {GOALS.map((g) => (
          <button key={g.id} role="radio" aria-checked={goal === g.id} onClick={() => setGoal(g.id)}
            className={clsx('px-2.5 py-1 rounded-full border text-[12px]', goal === g.id ? 'border-warn bg-warn/15 text-warn' : 'border-edge text-slate-300 hover:border-slate-400')}>
            {g.label}
          </button>
        ))}
      </div>

      <ol className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
        {ranked.map(({ inv, score, reasons }, i) => (
          <li key={inv.id} className={clsx('rounded border px-2.5 py-1.5', i < 3 ? 'border-cyan-nasa/40 bg-cyan-nasa/5' : 'border-edge/70')}>
            <div className="flex items-start gap-2">
              <input type="checkbox" checked={picked.includes(inv.id)} onChange={() => toggle(inv.id)} aria-label={`Compare ${inv.name}`} className="mt-1 accent-cyan-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-100">
                    <span className="hud text-slate-500 mr-1">{i + 1}.</span>
                    {inv.url ? <a href={inv.url} target="_blank" rel="noreferrer" className="hover:text-cyan-nasa">{inv.name} <ExternalLink size={10} className="inline opacity-60" /></a> : inv.name}
                  </span>
                  <span className="hud text-[11px] text-slate-400 shrink-0">{inv.psiId ?? inv.status} · score {score}</span>
                </div>
                {inv.finding && <p className="text-[12px] text-slate-300 leading-snug">{inv.finding}</p>}
                {reasons.length > 0 && <p className="text-[11px] text-cyan-nasa/80">ranked for: {reasons.join(' · ')}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {compare.length >= 2 && (
        <div className="mt-3 overflow-x-auto">
          <h3 className="text-[12px] text-slate-300 mb-1 flex items-center gap-1.5"><Scale size={12} /> Side-by-side comparison</h3>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr><th className="text-left text-slate-500 font-normal p-1 w-24"></th>
                {compare.map((c) => <th key={c.id} className="text-left text-slate-100 font-medium p-1 align-top">{c.name}</th>)}</tr>
            </thead>
            <tbody>
              {FIELDS.map(([label, get]) => (
                <tr key={label} className="border-t border-edge/60">
                  <td className="text-slate-500 p-1 align-top">{label}</td>
                  {compare.map((c) => <td key={c.id} className="text-slate-300 p-1 align-top">{get(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {habitat === 'moon' && (
        <p className="text-[11px] text-amber-300/90 mt-2 leading-snug">
          No partial-gravity combustion data is in PSI yet; LUCI and FM2 are expected to add it. Microgravity and normal-gravity results can bound what happens at lunar gravity.
        </p>
      )}
      {habitat === 'earth' && (
        <p className="text-[11px] text-emerald-300/90 mt-2 leading-snug">
          Earth spin-offs named by NASA: fine-water-mist extinguishers developed for the ISS, improved smoke detection, and firefighter gear including protective clothing and air tanks.
        </p>
      )}
      <p className="text-[11px] text-slate-500 mt-2">Facts from NASA's challenge description, PSI records (PSI-25, PSI-26) and NASA Glenn's combustion pages; "not stated" means no source we used gives it. Ranking is a fixed rule shown above.</p>
    </section>
  )
}
