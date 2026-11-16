import { useMemo, useState } from 'react'
import { BrainCircuit, ExternalLink, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { clsx } from 'clsx'
import { interpret, rankFindings } from '../../physics/siInterpreter'
import type { EngineInput, EngineState } from '../../types/combustion'

const LEVEL_STYLE = {
  'cannot burn': { cls: 'border-emerald-500/60 text-emerald-300 bg-emerald-500/10', Icon: ShieldCheck, text: 'Cannot burn here (model)' },
  'fan-dependent': { cls: 'border-amber-500/60 text-amber-300 bg-amber-500/10', Icon: ShieldQuestion, text: 'Burns only with airflow (model)' },
  'burns without airflow': { cls: 'border-rose-500/60 text-rose-300 bg-rose-500/10', Icon: ShieldAlert, text: 'Burns even with no airflow (model)' },
} as const

/** Every number an AI summary may use: the ones in the facts, plus small counting words. */
function allowedNumbers(facts: Record<string, unknown>) {
  const set = new Set<string>()
  for (const m of JSON.stringify(facts).matchAll(/\d+(?:\.\d+)?/g)) {
    set.add(String(Number(m[0])))
  }
  for (let i = 0; i <= 10; i++) set.add(String(i))
  return set
}

export function SIIntelligenceCard({ input, state }: { input: EngineInput; state: EngineState }) {
  const ranked = useMemo(() => rankFindings(input.material.id, input.pressureKPa, input.xO2), [input.material.id, input.pressureKPa, input.xO2])
  const it = useMemo(() => interpret(input, state, ranked), [input, state, ranked])
  const L = LEVEL_STYLE[it.level]

  // Optional AI summary. The key is kept in memory for this tab only and sent only to the endpoint typed here.
  // Defaults: Gemini's OpenAI-compatible endpoint and a model tested on 2026-11-15 (gemini-2.5-flash is closed to new keys).
  const [base, setBase] = useState('https://generativelanguage.googleapis.com/v1beta/openai')
  const [model, setModel] = useState('gemini-3.1-flash-lite')
  const [key, setKey] = useState('')
  const [ai, setAi] = useState<{ text?: string; note?: string; busy?: boolean } | null>(null)

  async function summarise() {
    if (!key || !model) {
      setAi({ note: 'No API key or model entered, so the rule-based briefing above is the summary.' })
      return
    }
    setAi({ busy: true })
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You write a 3-sentence plain-English fire-safety briefing for a spacecraft engineer. Use ONLY the JSON facts given. ' +
                'Do not add any number, material property or claim that is not in the facts. Say clearly which statements are model output ' +
                'and which are NASA flight measurements. Do not give operating instructions or procedures.',
            },
            { role: 'user', content: JSON.stringify(it.facts) },
          ],
        }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const j = await res.json()
      const text: string = j?.choices?.[0]?.message?.content?.trim() ?? ''
      if (!text) throw new Error('empty reply')
      // Guard: reject a summary that introduces a number not present in the facts.
      const ok = allowedNumbers(it.facts)
      const bad = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => String(Number(m[0]))).filter((n) => !ok.has(n))
      if (bad.length) {
        setAi({ note: `AI summary rejected: it contained number(s) not in the facts (${[...new Set(bad)].join(', ')}). The rule-based briefing above stands.` })
        return
      }
      setAi({ text })
    } catch (e) {
      setAi({ note: `AI summary unavailable (${String((e as Error).message ?? e)}). The rule-based briefing above stands.` })
    }
  }

  return (
    <section className="card" aria-label="Evidence briefing">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="panel-title"><BrainCircuit size={13} /> Evidence briefing</h2>
        <span className={clsx('flex items-center gap-1.5 px-2 py-0.5 rounded border text-[12px] font-medium', L.cls)}>
          <L.Icon size={13} /> {L.text}
        </span>
      </div>
      <ul className="space-y-1.5 text-[13px] text-slate-300 leading-snug list-disc pl-4">
        {it.bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>

      <h3 className="text-[12px] text-slate-400 mt-3 mb-1">Closest NASA flight measurements (ranked by oxygen, pressure and material)</h3>
      <ol className="space-y-1">
        {ranked.slice(0, 3).map(({ finding: f, distance, sameMaterial }) => (
          <li key={f.id} className="text-[12px] text-slate-300 flex gap-2">
            <a href={f.url} target="_blank" rel="noreferrer"
              className="shrink-0 hud text-[11px] px-1.5 py-0.5 rounded border border-cyan-nasa/50 text-cyan-nasa hover:bg-cyan-nasa/10 h-fit flex items-center gap-1">
              {f.investigation} {f.psiId} <ExternalLink size={10} />
            </a>
            <span>
              {f.statement} <span className="text-slate-500">({f.geometry}; distance {distance.toFixed(1)}{sameMaterial ? '' : ', different material'})</span>
            </span>
          </li>
        ))}
      </ol>

      <details className="mt-3">
        <summary className="text-[12px] text-slate-400 cursor-pointer hover:text-slate-200">AI summary (optional, uses your own API key)</summary>
        <div className="mt-2 grid gap-1.5 text-[12px]">
          <label className="grid gap-0.5">
            <span className="text-slate-500">OpenAI-compatible endpoint (OpenAI, or Gemini's OpenAI-compatible URL)</span>
            <input value={base} onChange={(e) => setBase(e.target.value)} className="bg-deck border border-edge rounded px-2 py-1 hud text-[12px]" />
          </label>
          <label className="grid gap-0.5">
            <span className="text-slate-500">Model id</span>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="your provider's model id" className="bg-deck border border-edge rounded px-2 py-1 hud text-[12px]" />
          </label>
          <label className="grid gap-0.5">
            <span className="text-slate-500">API key (kept in this tab's memory only, sent only to the endpoint above)</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} className="bg-deck border border-edge rounded px-2 py-1 hud text-[12px]" autoComplete="off" />
          </label>
          <button onClick={summarise} disabled={ai?.busy}
            className="justify-self-start mt-1 px-3 py-1.5 rounded border border-cyan-nasa/60 text-cyan-nasa hover:bg-cyan-nasa/10">
            {ai?.busy ? 'Writing…' : 'Write AI summary'}
          </button>
          {ai?.text && (
            <div className="rounded border border-edge p-2 text-slate-200">
              <div className="text-[11px] text-amber-300 mb-1">AI-written from the facts above; numbers checked against them.</div>
              {ai.text}
            </div>
          )}
          {ai?.note && <p className="text-slate-400">{ai.note}</p>}
        </div>
      </details>
      <p className="text-[11px] text-slate-500 mt-2">Briefing and ranking are fixed rules over the model and the cited NASA findings, not AI. Information only, not an operating procedure.</p>
    </section>
  )
}
