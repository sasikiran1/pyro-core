import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Info, Thermometer } from 'lucide-react'
import { MainLayout } from './components/layout/MainLayout'
import { Header } from './components/layout/Header'
import { AtmosphereModule } from './components/controls/AtmosphereModule'
import { MaterialModule } from './components/controls/MaterialModule'
import { FlowDamper } from './components/controls/FlowDamper'
import { DuctViewport3D } from './components/viewport/DuctViewport3D'
import { SpectralToolbar } from './components/viewport/SpectralToolbar'
import { RadiometricProbe, type ProbeReading } from './components/viewport/RadiometricProbe'
import { PhaseNomogram } from './components/analytics/PhaseNomogram'
import { ThermalRelaxation } from './components/analytics/ThermalRelaxation'
import { TelemetryBars } from './components/analytics/TelemetryBars'
import { EvidencePanel, insideFlightData } from './components/analytics/EvidencePanel'
import { SIIntelligenceCard } from './components/analytics/SIIntelligenceCard'
import { ReportModal, download } from './components/export/ReportModal'
import { ComparisonModal } from './components/export/ComparisonModal'
import { ScenarioBar, type ScenarioId } from './components/controls/ScenarioBar'
import { PlanetaryGravityModule } from './components/controls/PlanetaryGravityModule'
import { FirefightingSandbox } from './components/controls/FirefightingSandbox'
import { cooling as coolingCurve, evaluate, fieldAt, minimumLimit } from './physics/combustionEngine'
import { materialById } from './physics/materialDatabase'
import { ATMOSPHERES, BASS2_PMMA_MIN_O2, T_AMBIENT } from './physics/constants'
import type { SpectralMode } from './types/combustion'

// URL parameters for shareable views: ?atm=eaa&mat=pom&flow=2&mode=mwir&lit=0
// (or p=<kPa>&x=<O2 fraction> for a custom cabin). The "Copy link" button writes them.
const Q = new URLSearchParams(window.location.search)
const START_ATM = ATMOSPHERES.find((a) => a.id === Q.get('atm')) ?? ATMOSPHERES[0]
const num = (k: string, lo: number, hi: number, dflt: number) => {
  const v = Number(Q.get(k))
  return Q.get(k) !== null && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt
}
const START_FLOW = Math.min(40, Math.max(0, Number(Q.get('flow') ?? 1.5) || 0))
const START_MODE: SpectralMode = (['compare', 'visible', 'mwir', 'co'] as const).find((m) => m === Q.get('mode')) ?? 'compare'

/** Model output (shown with "~": the model is not this precise). */
const pct = (x: number) => `${(x * 100).toFixed(1)}%`
/** Published values (NASA flight data, handbook indices): shown exactly as published. */
const pub = (x: number) => `${(x * 100).toFixed(1)}%`

export default function App() {
  const [pressureKPa, setP] = useState(num('p', 30, 110, START_ATM.pressureKPa))
  const [xO2, setX] = useState(num('x', 0.1, 0.4, START_ATM.xO2))
  const [flowCmS, setFlow] = useState(START_FLOW)
  const [materialId, setMaterialId] = useState(Q.get('mat') ?? 'pmma')
  const [mode, setMode] = useState<SpectralMode>(START_MODE)
  const [ignited, setIgnited] = useState(Q.get('lit') !== '0')
  const [outAt, setOutAt] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [safeT, setSafeT] = useState(400)
  const [probeAt, setProbeAt] = useState<{ x: number; y: number } | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [scenario, setScenario] = useState<ScenarioId | null>(null)
  const [copied, setCopied] = useState(false)
  const [gravity, setGravity] = useState(0.0)
  const scenarioTimer = useRef<number | null>(null)

  const material = materialById(materialId)
  const input = useMemo(() => ({ pressureKPa, xO2, flowCmS, material, gravity }), [pressureKPa, xO2, flowCmS, material, gravity])
  const state = useMemo(() => evaluate(input), [input])
  const lit = ignited && state.burning

  // The flame goes out the moment the operating point leaves the flammable region,
  // and stays out until the igniter is fired again (no spontaneous re-ignition is modelled).
  useEffect(() => {
    if (ignited && !state.burning) {
      setIgnited(false)
      setOutAt(Date.now())
    }
  }, [ignited, state.burning])

  // Clock for the cool-down readout. It only runs while a rod is cooling, so the
  // page (charts included) is not re-rendered several times a second for nothing.
  const cooling = outAt !== null && !(ignited && state.burning)
  useEffect(() => {
    if (!cooling) return
    const id = setInterval(() => setNowMs(Date.now()), 500)
    return () => clearInterval(id)
  }, [cooling])

  const cool = useMemo(() => coolingCurve(material, flowCmS, pressureKPa, Math.min(safeT, material.pyrolysisT.value - 10)), [material, flowCmS, pressureKPa, safeT])
  const sinceOut = outAt !== null && !lit ? (nowMs - outAt) / 1000 : null
  const rodT = useMemo(() => {
    if (lit) return material.pyrolysisT.value
    if (sinceOut === null) return T_AMBIENT
    const { t, T } = cool
    if (sinceOut >= t[t.length - 1]) return T[T.length - 1]
    let i = 1
    while (t[i] < sinceOut) i++
    const f = (sinceOut - t[i - 1]) / (t[i] - t[i - 1])
    return T[i - 1] + (T[i] - T[i - 1]) * f
  }, [lit, sinceOut, cool, material])

  const minLimit = useMemo(() => minimumLimit(material, pressureKPa), [material, pressureKPa])
  const inside = insideFlightData(pressureKPa, xO2)

  const probe: ProbeReading | null = useMemo(() => {
    if (!probeAt) return null
    const st = lit ? state : { ...state, burning: false }
    return { ...probeAt, ...fieldAt(st, input, probeAt.x, probeAt.y) }
  }, [probeAt, lit, state, input])

  /** Guided scenarios. Settings verified against the model; see ScenarioBar.tsx. */
  const runScenario = useCallback((id: ScenarioId) => {
    if (scenarioTimer.current) window.clearTimeout(scenarioTimer.current)
    const iss = ATMOSPHERES.find((a) => a.id === 'iss')!
    const eaa = ATMOSPHERES.find((a) => a.id === 'eaa')!
    setScenario(id)
    setOutAt(null)
    setProbeAt(null)
    if (id === 'ghost') {
      setP(iss.pressureKPa); setX(iss.xO2); setMaterialId('pmma'); setFlow(1.5); setMode('compare'); setIgnited(true)
    } else if (id === 'artemis') {
      setP(eaa.pressureKPa); setX(eaa.xO2); setMaterialId('nomex'); setFlow(10); setMode('compare'); setIgnited(true)
    } else {
      // light it at 5 cm/s first, then change the airflow so the extinction happens on screen
      setP(iss.pressureKPa); setX(id === 'quench' ? 0.17 : 0.145); setMaterialId('pmma'); setFlow(5); setMode('compare'); setIgnited(true)
      scenarioTimer.current = window.setTimeout(() => setFlow(id === 'quench' ? 0 : 40), 2500)
    }
  }, [])
  useEffect(() => () => { if (scenarioTimer.current) window.clearTimeout(scenarioTimer.current) }, [])

  const handleVacuumDump = useCallback(() => {
    setP(0.1)
  }, [])

  const handleNitrogenPurge = useCallback(() => {
    setX(0.04)
  }, [])

  const handleCo2Blast = useCallback(() => {
    setFlow(40.0)
    setX((prev) => Math.min(prev, 0.12))
  }, [])

  const handleResetCabin = useCallback(() => {
    setP(START_ATM.pressureKPa)
    setX(START_ATM.xO2)
    setFlow(1.5)
    setGravity(0.0)
    setIgnited(true)
  }, [])

  const shareLink = useCallback(async () => {
    const q = new URLSearchParams()
    const preset = ATMOSPHERES.find((a) => Math.abs(a.pressureKPa - pressureKPa) < 0.05 && Math.abs(a.xO2 - xO2) < 0.0005)
    if (preset) q.set('atm', preset.id)
    else { q.set('p', pressureKPa.toFixed(1)); q.set('x', xO2.toFixed(3)) }
    q.set('mat', materialId)
    q.set('flow', String(flowCmS))
    q.set('mode', mode)
    q.set('lit', lit ? '1' : '0')
    const url = `${window.location.origin}${window.location.pathname}?${q}`
    window.history.replaceState(null, '', `?${q}`)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copy this link:', url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [pressureKPa, xO2, materialId, flowCmS, mode, lit])

  const exportCsv = useCallback(() => {
    const rows = ['flow_cm_s,regime,damkohler,radiative_loss,flame_T_K,limit_O2,burning_rate_g_m2_s']
    for (let u = 0; u <= 40.0001; u += 0.5) {
      const s = evaluate({ ...input, flowCmS: u })
      rows.push([u.toFixed(1), s.regime, s.da.toPrecision(3), s.radiativeLossFraction.toFixed(2), s.burning ? s.tFlame.toFixed(0) : '', Number.isFinite(s.limitO2) ? s.limitO2.toFixed(3) : '', s.massFlux.toFixed(2)].join(','))
    }
    const head =
      `# PYRO-CORE model output, not measured data. ${material.name}, ${pressureKPa} kPa, ${(xO2 * 100).toFixed(1)}% O2.\n` +
      `# Calibrated to one NASA value: PMMA lowest limit 13.6% O2 at ISS pressure (BASS-II, PSI-25, doi:10.60555/4qc4-de67).\n`
    download(`pyro-core-${material.id}-${pressureKPa}kPa-${Math.round(xO2 * 1000) / 10}pct.csv`, head + rows.join('\n'), 'text/csv')
  }, [input, material, pressureKPa, xO2])

  return (
    <>
      <MainLayout
        header={<Header state={state} lit={lit} onReport={() => setReportOpen(true)} onCsv={exportCsv} onCompare={() => setCompareOpen(true)} onShare={shareLink} copied={copied} />}
        left={
          <>
            <AtmosphereModule pressureKPa={pressureKPa} xO2={xO2} onChange={(p, x) => { setP(p); setX(x) }} />
            <PlanetaryGravityModule gravity={gravity} onChange={setGravity} />
            <FlowDamper flowCmS={flowCmS} onChange={setFlow} lit={lit} canIgnite={state.burning}
              onIgnite={() => { setIgnited(true); setOutAt(null) }} />
            <MaterialModule material={material} onChange={(id) => {
              // Light the new rod only if it can burn here, so no cool-down starts from a flame that never existed.
              setMaterialId(id)
              setIgnited(evaluate({ ...input, material: materialById(id) }).burning)
              setOutAt(null)
            }} />
          </>
        }
        centre={
          <>
            <section className="card py-2.5">
              <p className="text-[15px] text-slate-100 leading-snug">
                <strong>{material.short}</strong> in this cabin ({pressureKPa.toFixed(1)} kPa, {(xO2 * 100).toFixed(1)}% O₂):{' '}
                {xO2 > minLimit.x
                  ? <span className="text-thermal font-semibold">can burn in orbit</span>
                  : <span className="text-emerald-400 font-semibold">cannot burn at any airflow</span>}
                <span className="text-slate-400"> · model: needs at least ~{pct(minLimit.x)} O₂ (at {minLimit.uCmS.toFixed(0)} cm/s), vs {pub(material.loi.value)} in the 1 g test</span>
              </p>
              <p className="text-[12px] mt-1 text-slate-500">
                {material.id === 'pmma' && inside
                  ? `Calibrated here: NASA's BASS-II burned PMMA rods on the ISS at ${pub(BASS2_PMMA_MIN_O2)} O₂.`
                  : inside
                    ? 'Inside the conditions NASA flew, but only PMMA is calibrated to flight data; this material is extrapolated from its 1 g oxygen index.'
                    : 'Outside every NASA flight condition listed below: model extrapolation, not measurement.'}
              </p>
            </section>
            <div className="bg-gradient-to-r from-cyan-950/40 via-deck to-void border border-cyan-nasa/30 rounded-lg p-2.5 text-[12px] text-slate-300 leading-snug">
              <strong className="text-cyan-nasa font-semibold">The Space Combustion Paradox: </strong>
              On Earth, blowing on a fire blows it out. In zero gravity, a fire has no rising hot air, so it suffocates in its own smoke unless a ventilation fan feeds it fresh oxygen. Near its limit, it burns as a quiet, invisible blue flame.
            </div>
            <ScenarioBar onRun={runScenario} active={scenario} />
            <div className="card p-0 overflow-hidden relative h-[50vh] min-h-[340px]">
              <DuctViewport3D state={state} flowCmS={flowCmS} mode={mode} rodT={rodT} lit={lit} probe={probeAt}
                onProbe={(x, y) => setProbeAt({ x, y })} gravity={gravity} />
              <div className="absolute top-2 left-2"><SpectralToolbar mode={mode} onChange={setMode} /></div>
              <div className="absolute top-2 right-2 hud text-[11px] text-slate-300 bg-deck/85 border border-edge/80 px-2.5 py-1 rounded backdrop-blur max-w-[270px] pointer-events-none text-right">
                <div className="text-[10px] text-cyan-nasa font-semibold uppercase tracking-wider flex items-center justify-end gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-nasa animate-ping" />
                  NASA BASS-II Specimen Rig
                </div>
                <div className="text-slate-100 font-medium">1.27 cm Solid Polymer Fuel Rod</div>
                <div className="text-[10px] text-slate-400">Simulates spacecraft cable insulation & conduit</div>
              </div>
              {lit && state.regime === 'blue' && mode === 'visible' && (
                <button onClick={() => setMode('mwir')}
                  className="absolute top-14 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded border border-thermal/70 bg-deck/90 text-thermal text-xs font-medium hover:bg-thermal/10 animate-pulse">
                  <Thermometer size={14} /> The rod is burning. Can you see it? Switch to thermal
                </button>
              )}
              {mode === 'compare' && (
                <>
                  <div className="absolute inset-y-0 left-1/2 w-px bg-edge pointer-events-none" />
                  <div className="absolute top-16 left-3 hud text-[12px] text-slate-200 bg-deck/80 px-2 py-0.5 rounded pointer-events-none">What your eyes see</div>
                  <div className="absolute top-16 left-[calc(50%+12px)] hud text-[12px] text-slate-200 bg-deck/80 px-2 py-0.5 rounded pointer-events-none">Thermal camera, 3.8 µm</div>
                </>
              )}
              <div className="absolute bottom-2 left-2"><RadiometricProbe reading={probe} onClear={() => setProbeAt(null)} /></div>
              {(mode === 'mwir' || mode === 'compare') && (
                <div className="absolute bottom-2 right-2 hud text-[11px] text-slate-400 bg-deck/80 px-2 py-1 rounded">
                  <div className="h-1.5 w-32 rounded" style={{ background: 'linear-gradient(90deg,#00000d,#400073,#bf0d73,#fa730d,#ffd933,#fffff2)' }} />
                  <div className="flex justify-between"><span>300 K</span><span>1500 K</span></div>
                </div>
              )}
            </div>
            <FirefightingSandbox
              onVacuumDump={handleVacuumDump}
              onNitrogenPurge={handleNitrogenPurge}
              onCo2Blast={handleCo2Blast}
              onReset={handleResetCabin}
            />
            <SIIntelligenceCard input={input} state={state} />
            <EvidencePanel material={material} pressureKPa={pressureKPa} xO2={xO2} />
            <section className="card text-[13px] text-slate-300 leading-relaxed">
              <h2 className="panel-title mb-1.5"><Info size={13} /> Why fire is different in orbit</h2>
              <p>
                With no gravity there is no rising hot air, so a flame lives on whatever air the fans push past it. Too little flow and it starves
                and radiates its heat away; too much and it blows off. In between, NASA found materials burn at <em>lower</em> oxygen than the
                normal-gravity test allows, and near the limit the flame is dim and blue. Switch to <strong>Thermal</strong> to see what the eye
                misses, then compare the ISS and Exploration atmospheres.
              </p>
            </section>
          </>
        }
        right={
          <>
            <TelemetryBars s={state} xO2={xO2} />
            <PhaseNomogram material={material} pressureKPa={pressureKPa} xO2={xO2} flowCmS={flowCmS} onPick={(u, x) => { setFlow(u); setX(x) }} />
            <ThermalRelaxation material={material} cooling={cool} safeT={safeT} onSafeT={setSafeT} sinceOut={sinceOut} rodT={rodT} />
          </>
        }
        footer={
          <footer className="px-4 py-3 border-t border-edge text-[12px] text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Model calibrated to one NASA measurement.</strong> Reduced-order physics (Huggett oxygen-consumption heat
            release, Olson &amp; Ferkul's stretch-rate Damköhler number, a radiation-loss number, Spalding B, Ranz–Marshall heat transfer). Only PMMA's lowest
            limit at ISS pressure is fitted to flight data (BASS-II, 13.6% O₂); everything else is extrapolation. Cool flames are not modelled: in microgravity
            they have been seen for liquid droplets (FLEX), not solid polymers. Not a NASA product or document. Built with AI assistance (see README).
          </footer>
        }
      />
      <ComparisonModal open={compareOpen} onClose={() => setCompareOpen(false)} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)}
        report={{ material, pressureKPa, xO2, flowCmS, state, cooling: cool, safeT, minLimit: { x: minLimit.x, u: minLimit.uCmS } }} />
    </>
  )
}
