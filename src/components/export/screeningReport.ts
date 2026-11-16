import type { CoolingResult, EngineState, Material } from '../../types/combustion'
import { REGIME_STYLE } from '../analytics/PhaseNomogram'

export interface ReportInput {
  material: Material
  pressureKPa: number
  xO2: number
  flowCmS: number
  state: EngineState
  cooling: CoolingResult
  safeT: number
  minLimit: { x: number; u: number }
}

/**
 * Plain-text screening summary. Deliberately not styled as, or called, a
 * NASA document: NASA-STD-6001B Test 1 is a physical upward-burning test in
 * normal gravity, and no model output can stand in for it.
 */
export function buildScreeningReport(r: ReportInput) {
  const { material: m, state: s } = r
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  return [
    'PYRO-CORE MODEL SCREENING SUMMARY',
    'Simulation output only. Not a NASA document, not a NASA-STD-6001B test result,',
    'not a material certification, and not a flight rule.',
    '='.repeat(72),
    `Generated        ${now}`,
    `Material         ${m.name} (rod, 0.635 cm radius, burning at its tip in axial flow)`,
    `Atmosphere       ${r.pressureKPa.toFixed(1)} kPa, ${pct(r.xO2)} O2 (O2 partial pressure ${(r.pressureKPa * r.xO2).toFixed(1)} kPa)`,
    `Forced flow      ${r.flowCmS.toFixed(1)} cm/s, microgravity (no buoyancy)`,
    '',
    'MODEL RESULT AT THIS OPERATING POINT',
    `Regime           ${REGIME_STYLE[s.regime].label}`,
    `Limiting O2      ${Number.isFinite(s.limitO2) ? pct(s.limitO2) : 'none in range'} at this flow and pressure`,
    `Margin           ${Number.isFinite(s.limitO2) ? `${((r.xO2 - s.limitO2) * 100).toFixed(1)} points` : 'n/a'}`,
    `Lowest limit     ${pct(r.minLimit.x)} O2 at ${r.minLimit.u.toFixed(1)} cm/s (most flammable flow)`,
    `1 g oxygen index ${pct(m.loi.value)} (handbook value; model anchor)`,
    `Damkohler        ${s.da.toPrecision(2)} (needs >= 1)`,
    `Flame temp.      ${s.burning ? `about ${Math.round(s.tFlame / 50) * 50} K` : 'no flame'}`,
    `Burning rate     ${s.burning ? `${s.massFlux.toFixed(2)} g/(m2 s)` : '0'}`,
    '',
    'COOL-DOWN (lumped model, conservative)',
    `Start            ${m.pyrolysisT.value.toFixed(0)} K (pyrolysis temperature)`,
    `Threshold        ${r.safeT} K (user-chosen criterion)`,
    `Hold time        ${r.cooling.holdTime === null ? 'more than 15 min' : `about ${Math.round(r.cooling.holdTime / 30) / 2} min`} at ${r.flowCmS.toFixed(1)} cm/s`,
    `Biot number      ${r.cooling.biot.toFixed(2)}${r.cooling.biot > 0.1 ? ' (lumped model approximate)' : ''}`,
    '',
    'LIMITATIONS',
    '- Reduced-order model: one-step chemistry, a radiation-loss number and',
    '  heat-transfer correlations. Not CFD.',
    '- Calibrated to one NASA flight value: PMMA rods burned down to 13.6% O2',
    '  at ISS pressure in BASS-II (PSI-25, doi:10.60555/4qc4-de67; Olson &',
    '  Ferkul 2015, NTRS 20150008961). Other materials, pressures and O2 levels',
    '  above 21% are extrapolation.',
    '- Material properties are approximate handbook values or estimates',
    '  (marked in the app). Verify against primary sources.',
    '- Use the trends (more O2, less pressure, flow near a few cm/s) as',
    '  questions to test, not as safety limits.',
  ].join('\n')
}
