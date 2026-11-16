import { useMemo } from 'react'
import { Database, ExternalLink, FileWarning } from 'lucide-react'
import { nearestTests, plausibleO2, type Bass2Test } from '../../data/bass2Tests'
import type { Material } from '../../types/combustion'

interface Props {
  rows: Bass2Test[] | null
  material: Material
  xO2: number
  flowCmS: number
}

const PSI25 = 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25'
const fmtPct = (x: number | null) => (x === null ? '—' : `${(x * 100).toFixed(1)}%`)

/** NASA's BASS-II test log (PSI-25 experimental table): the tests nearest the current setting, summarised. */
export function Bass2TestLog({ rows, material, xO2, flowCmS }: Props) {
  const near = useMemo(() => (rows ? nearestTests(rows, material.id, xO2, flowCmS) : []), [rows, material.id, xO2, flowCmS])
  const summary = useMemo(() => {
    if (!rows) return null
    const counts = new Map<string, number>()
    for (const r of rows) counts.set(r.material, (counts.get(r.material) ?? 0) + 1)
    const allMine = rows.filter((r) => r.materialId === material.id)
    const mine = allMine.filter(plausibleO2)
    const suspect = allMine.length - mine.length
    const o2 = mine.map((r) => r.o2Final!)
    const air = mine.map((r) => r.airCmS).filter((v): v is number => v !== null)
    return {
      total: rows.length,
      materials: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      mine: mine.length,
      suspect,
      o2: o2.length ? [Math.min(...o2), Math.max(...o2)] : null,
      air: air.length ? [Math.min(...air), Math.max(...air)] : null,
    }
  }, [rows, material.id])

  return (
    <section className="card" aria-label="NASA BASS-II test log">
      <h2 className="panel-title mb-2"><Database size={13} /> NASA BASS-II test log (PSI-25)</h2>
      {!rows || !summary ? (
        <div className="text-[12px] text-slate-400 leading-snug flex gap-2">
          <FileWarning size={15} className="shrink-0 text-amber-400 mt-0.5" />
          <span>
            Not loaded. Download <span className="hud">PSI-25_Experimental table_BASS-II.csv</span> from the{' '}
            <a href={PSI25} target="_blank" rel="noreferrer" className="text-cyan-nasa hover:underline">PSI-25 page</a> (Data files → Experimental table)
            and save it as <span className="hud">public/data/bass2.csv</span>.
          </span>
        </div>
      ) : (
        <>
          <p className="text-[12px] text-slate-300 leading-snug">
            {summary.total} ISS tests in NASA's table. {summary.mine > 0
              ? <>{summary.mine} burned {material.short}: post-test O₂ {fmtPct(summary.o2?.[0] ?? null)} to {fmtPct(summary.o2?.[1] ?? null)}
                {summary.air ? <>, air reading {summary.air[0].toFixed(0)} to {summary.air[1].toFixed(0)}</> : null}.</>
              : <>None used {material.short}; the most-tested fuels were {summary.materials.map(([m, n]) => `${m} (${n})`).join(', ')}.</>}
          </p>
          {summary.suspect > 0 && (
            <p className="text-[11px] text-amber-300/90 mt-1">{summary.suspect} {material.short} row(s) excluded: post-test O₂ outside 5–45%, likely a data-entry slip in the published table.</p>
          )}
          {near.length > 0 && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-[12px] hud">
                <thead className="text-slate-500">
                  <tr><th className="text-left font-normal">Test</th><th className="text-left font-normal">Date</th><th className="text-left font-normal">Sample</th>
                    <th className="text-right font-normal">Air</th><th className="text-right font-normal">O₂ start → end</th><th className="text-right font-normal">CO end</th></tr>
                </thead>
                <tbody className="text-slate-300">
                  {near.map(({ r }) => (
                    <tr key={`${r.test}-${r.date}`} className="border-t border-edge/50">
                      <td className="py-0.5">{r.test}</td><td>{r.date}</td>
                      <td className="font-sans max-w-[180px] truncate" title={r.material}>{r.material}</td>
                      <td className="text-right">{r.airCmS ?? '—'}</td>
                      <td className="text-right">{fmtPct(r.o2Initial)} → {fmtPct(r.o2Final)}</td>
                      <td className="text-right">{r.coFinalPpm ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">
            Nearest tests to this O₂ and airflow, from NASA's table as published (CC0). "Air" is the duct anemometer reading, which Olson &amp; Ferkul
            describe as cm/s. The table records conditions, not whether each flame survived, so these are shown as tested conditions, not outcomes.{' '}
            <a href={PSI25} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-cyan-nasa">source <ExternalLink size={9} /></a>
          </p>
        </>
      )}
    </section>
  )
}
