import { useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { classify, limitO2 } from '../../physics/combustionEngine'
import { BASS2_COVERAGE, BASS2_PMMA_MIN_O2 } from '../../physics/constants'
import type { Material, Regime } from '../../types/combustion'

const U_MAX = 40
const X_MIN = 0.1
const X_MAX = 0.4
const NX = 50
const NY = 60

export const REGIME_STYLE: Record<Regime, { fill: string; label: string }> = {
  sooty: { fill: '#b45309', label: 'Burns: bright, sooty' },
  blue: { fill: '#0e7490', label: 'Burns: dim blue, hard to see' },
  quench: { fill: '#1e293b', label: 'Out: too little flow (radiative quench)' },
  blowoff: { fill: '#3b2a5a', label: 'Out: too much flow (blow-off)' },
  nonflammable: { fill: '#0f172a', label: 'Out: not enough heat to gasify fuel' },
}

interface Props {
  material: Material
  pressureKPa: number
  xO2: number
  flowCmS: number
  onPick: (flowCmS: number, xO2: number) => void
  /** NASA BASS-II test conditions for this material (airflow cm/s, post-test O2 fraction); no outcomes recorded */
  tests?: { u: number; x: number }[]
}

export function PhaseNomogram({ material, pressureKPa, xO2, flowCmS, onPick, tests = [] }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // The 3000-cell grid is the slowest thing on the page; let slider drags render first and the map catch up.
  const pDeferred = useDeferredValue(pressureKPa)
  const grid = useMemo(() => {
    const pressureKPa = pDeferred
    const cells: Regime[] = []
    for (let j = 0; j < NY; j++) {
      const x = X_MIN + ((j + 0.5) / NY) * (X_MAX - X_MIN)
      for (let i = 0; i < NX; i++) cells.push(classify(material, (((i + 0.5) / NX) * U_MAX) / 100, pressureKPa, x))
    }
    const curve: [number, number][] = []
    for (let i = 0; i <= 100; i++) {
      const u = (i / 100) * U_MAX
      curve.push([u, limitO2(material, u / 100, pressureKPa)])
    }
    return { cells, curve }
  }, [material, pDeferred])

  useEffect(() => {
    const c = canvas.current!
    const dpr = window.devicePixelRatio || 1
    const W = c.clientWidth
    const H = c.clientHeight
    c.width = W * dpr
    c.height = H * dpr
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    const pad = { l: 34, r: 8, t: 14, b: 26 }
    const pw = W - pad.l - pad.r
    const ph = H - pad.t - pad.b
    const sx = (u: number) => pad.l + (u / U_MAX) * pw
    const sy = (x: number) => pad.t + (1 - (x - X_MIN) / (X_MAX - X_MIN)) * ph
    g.fillStyle = '#0B0F19'
    g.fillRect(0, 0, W, H)
    const cw = pw / NX
    const chh = ph / NY
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        g.fillStyle = REGIME_STYLE[grid.cells[j * NX + i]].fill
        g.fillRect(pad.l + i * cw, pad.t + (NY - 1 - j) * chh, cw + 0.5, chh + 0.5)
      }
    // gridlines
    g.strokeStyle = 'rgba(148,163,184,0.12)'
    g.lineWidth = 1
    g.fillStyle = '#64748b'
    g.font = '11px JetBrains Mono, monospace'
    for (let u = 0; u <= U_MAX; u += 10) {
      g.beginPath(); g.moveTo(sx(u), pad.t); g.lineTo(sx(u), pad.t + ph); g.stroke()
      g.textAlign = 'center'; g.fillText(String(u), sx(u), H - 10)
    }
    for (let x = 0.1; x <= 0.4001; x += 0.05) {
      g.beginPath(); g.moveTo(pad.l, sy(x)); g.lineTo(pad.l + pw, sy(x)); g.stroke()
      g.textAlign = 'right'; g.fillText(`${Math.round(x * 100)}`, pad.l - 4, sy(x) + 3)
    }
    g.textAlign = 'center'
    g.fillText('airflow, cm/s', pad.l + pw / 2, H - 1)
    g.save(); g.translate(9, pad.t + ph / 2); g.rotate(-Math.PI / 2); g.fillText('O₂ %', 0, 0); g.restore()
    // 1 g oxygen index (dashed)
    g.setLineDash([4, 3])
    g.strokeStyle = 'rgba(203,213,225,0.55)'
    g.beginPath(); g.moveTo(pad.l, sy(material.loi.value)); g.lineTo(pad.l + pw, sy(material.loi.value)); g.stroke()
    g.setLineDash([])
    g.fillStyle = 'rgba(203,213,225,0.75)'
    g.textAlign = 'left'
    g.fillText('1 g oxygen index', pad.l + 4, sy(material.loi.value) - 3)
    // region NASA flew in BASS-II (ISS pressure only)
    const cov = BASS2_COVERAGE
    if (pressureKPa >= cov.pressureKPa[0] && pressureKPa <= cov.pressureKPa[1]) {
      g.setLineDash([2, 3])
      g.strokeStyle = 'rgba(52,211,153,0.8)'
      g.lineWidth = 1
      g.strokeRect(sx(cov.flowCmS[0]) + 1, sy(cov.xO2[1]), sx(cov.flowCmS[1]) - sx(cov.flowCmS[0]) - 2, sy(cov.xO2[0]) - sy(cov.xO2[1]))
      g.setLineDash([])
      g.fillStyle = 'rgba(52,211,153,0.95)'
      g.textAlign = 'right'
      g.fillText('BASS-II flight range', pad.l + pw - 4, sy(cov.xO2[1]) - 3)
    }
    // BASS-II measured minimum for PMMA rods
    g.strokeStyle = '#34d399'
    g.lineWidth = 1.5
    g.beginPath(); g.moveTo(pad.l, sy(BASS2_PMMA_MIN_O2)); g.lineTo(pad.l + pw, sy(BASS2_PMMA_MIN_O2)); g.stroke()
    g.fillStyle = '#34d399'
    g.textAlign = 'left'
    g.fillText('ISS flight: PMMA burned at 13.6%', pad.l + 4, sy(BASS2_PMMA_MIN_O2) + 11)
    // model flammability limit
    g.strokeStyle = '#e2e8f0'
    g.lineWidth = 2
    g.beginPath()
    let started = false
    for (const [u, x] of grid.curve) {
      if (!Number.isFinite(x) || x > X_MAX) { started = false; continue }
      if (!started) { g.moveTo(sx(u), sy(Math.max(x, X_MIN))); started = true } else g.lineTo(sx(u), sy(Math.max(x, X_MIN)))
    }
    g.stroke()
    // NASA BASS-II test conditions (hollow green diamonds): what was tested, not whether it burned
    if (tests.length && pressureKPa > 95 && pressureKPa < 106) {
      g.strokeStyle = '#34d399'
      g.lineWidth = 1.5
      for (const t of tests) {
        if (t.u < 0 || t.u > U_MAX || t.x < X_MIN || t.x > X_MAX) continue
        const px = sx(t.u)
        const py = sy(t.x)
        g.beginPath(); g.moveTo(px, py - 4); g.lineTo(px + 4, py); g.lineTo(px, py + 4); g.lineTo(px - 4, py); g.closePath(); g.stroke()
      }
    }
    // operating point
    const ox = sx(Math.min(flowCmS, U_MAX))
    const oy = sy(Math.min(Math.max(xO2, X_MIN), X_MAX))
    g.strokeStyle = '#0B0F19'
    g.lineWidth = 3
    g.beginPath(); g.arc(ox, oy, 6, 0, Math.PI * 2); g.stroke()
    g.strokeStyle = '#00E5FF'
    g.lineWidth = 2
    g.beginPath(); g.arc(ox, oy, 6, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.moveTo(ox - 11, oy); g.lineTo(ox - 7, oy); g.moveTo(ox + 7, oy); g.lineTo(ox + 11, oy)
    g.moveTo(ox, oy - 11); g.lineTo(ox, oy - 7); g.moveTo(ox, oy + 7); g.lineTo(ox, oy + 11); g.stroke()
  }, [grid, xO2, flowCmS, material, tests, pressureKPa])

  const pick = (e: React.PointerEvent) => {
    const c = canvas.current!
    const r = c.getBoundingClientRect()
    const u = ((e.clientX - r.left - 34) / (r.width - 42)) * U_MAX
    const x = X_MIN + (1 - (e.clientY - r.top - 14) / (r.height - 40)) * (X_MAX - X_MIN)
    onPick(Math.round(Math.min(U_MAX, Math.max(0, u)) * 10) / 10, Math.round(Math.min(X_MAX, Math.max(X_MIN, x)) * 1000) / 1000)
  }

  return (
    <section className="card" aria-label="Flammability map">
      <h2 className="panel-title mb-2"><MapIcon size={13} /> Where it can burn · {material.short} at {pressureKPa.toFixed(1)} kPa</h2>
      <canvas
        ref={canvas}
        className="w-full h-64 rounded cursor-crosshair touch-none"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={(e) => e.buttons === 1 && pick(e)}
        role="img"
        aria-label="Map of airflow against oxygen fraction showing where the flame survives. Drag to move the operating point."
      />
      <ul className="mt-2 grid grid-cols-1 gap-0.5 text-[12px] text-slate-400">
        {(['sooty', 'blue', 'quench', 'blowoff'] as Regime[]).map((r) => (
          <li key={r} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm border border-slate-600" style={{ background: REGIME_STYLE[r].fill }} />
            {REGIME_STYLE[r].label}
          </li>
        ))}
        <li className="flex items-center gap-2"><span className="w-2.5 h-0.5 bg-slate-200" /> model limit (flame needs O₂ above this line)</li>
        {tests.length > 0 && <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rotate-45 border border-emerald-400" /> NASA BASS-II test conditions for this material ({tests.length}; table does not record outcomes)</li>}
        <li className="flex items-center gap-2"><span className="w-2.5 h-0.5 bg-emerald-400" /> NASA BASS-II: lowest O₂ a PMMA rod burned at on the ISS</li>
      </ul>
      <p className="text-[11px] text-slate-500 mt-2 leading-snug">
        The model is fitted to one NASA number: PMMA's lowest limit at ISS pressure equals the 13.6% BASS-II measured (Olson &amp; Ferkul 2015).
        Other materials and other cabins are extrapolation. BASS-II varied flow by stretch rate on rods of 0.32–0.64 cm radius; this map uses a 0.64 cm rod.
      </p>
    </section>
  )
}
