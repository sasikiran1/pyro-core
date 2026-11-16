/*
 * Ranking and interpretation for the evidence briefing.
 *
 * Everything here is deterministic: a distance rule ranks NASA flight
 * findings against the current cabin, and fixed rules turn model output into
 * plain-language bullets. No AI is involved in this file. The optional AI
 * summary (see SIIntelligenceCard) may only rephrase the facts built here.
 */
import { FLIGHT_FINDINGS, type FlightFinding } from '../data/nasaInvestigations'
import { evaluate, minimumLimit } from './combustionEngine'
import type { EngineInput, EngineState } from '../types/combustion'

export interface RankedFinding {
  finding: FlightFinding
  distance: number
  sameMaterial: boolean
}

/**
 * Normalised distance between the current case and a flight finding:
 * oxygen difference in units of 5 points, pressure in units of 30 kPa, and a
 * fixed penalty of 1 for a different material. Flow is not compared: the
 * findings above are stated for the whole tested flow range.
 */
export function rankFindings(materialId: string, pressureKPa: number, xO2: number): RankedFinding[] {
  return FLIGHT_FINDINGS.map((f) => {
    const sameMaterial = f.material === materialId
    const d = Math.hypot((xO2 - f.xO2) / 0.05, (pressureKPa - f.pressureKPa) / 30, sameMaterial ? 0 : 1)
    return { finding: f, distance: d, sameMaterial }
  }).sort((a, b) => a.distance - b.distance)
}

export type RiskLevel = 'cannot burn' | 'fan-dependent' | 'burns without airflow'

export interface Interpretation {
  level: RiskLevel
  bullets: string[]
  /** The complete fact list; an AI summary may use these and nothing else. */
  facts: Record<string, string | number | boolean>
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`

export function interpret(inp: EngineInput, s: EngineState, ranked: RankedFinding[]): Interpretation {
  const m = inp.material
  const min = minimumLimit(m, inp.pressureKPa)
  const still = evaluate({ ...inp, flowCmS: 0 })
  const canBurnSomewhere = inp.xO2 > min.x
  const level: RiskLevel = !canBurnSomewhere ? 'cannot burn' : still.burning ? 'burns without airflow' : 'fan-dependent'
  const atIss = inp.pressureKPa > 97 && inp.pressureKPa < 104
  const nearest = ranked[0]
  const bullets: string[] = []

  // 1. model vs flight
  if (m.id === 'pmma' && atIss) {
    bullets.push(`Model vs flight: the model's lowest burning O₂ for PMMA here is ${pct(min.x)}; BASS-II measured a stable flame at 13.6% on the ISS. The model is fitted to that point, so agreement is by construction.`)
  } else if (nearest?.sameMaterial) {
    bullets.push(`Closest flight evidence is for ${m.short}, but at different conditions (${nearest.finding.statement}). Here the model is extrapolating.`)
  } else {
    bullets.push(`No NASA flight measurement in this app covers ${m.short} at ${inp.pressureKPa.toFixed(1)} kPa and ${pct(inp.xO2)} O₂. The model's ${pct(min.x)} limit is extrapolated from the 1 g oxygen index (${pct(m.loi.value)}).`)
  }
  // 2. visibility
  if (s.burning) {
    bullets.push(s.soot < 0.35
      ? 'Visibility: a flame at this airflow would be dim and blue in the model; a thermal camera shows it where the eye may miss it.'
      : 'Visibility: a flame at this airflow would be bright and sooty in the model, easy to see.')
  } else {
    bullets.push('Visibility: no flame survives at this airflow in the model.')
  }
  // 3. airflow behaviour (information, not an operating procedure)
  if (level === 'burns without airflow') {
    bullets.push(`Airflow: in the model this material keeps burning even with no airflow (limit at zero flow ${pct(limitAtZero(still, inp))}). Stopping the fan alone would not put it out.`)
  } else if (level === 'fan-dependent') {
    bullets.push(`Airflow: in the model the flame needs forced air here; with no airflow it quenches. It burns most easily near ${min.uCmS.toFixed(0)} cm/s.`)
  } else {
    bullets.push(`Airflow: in the model no airflow lets it burn at ${pct(inp.xO2)} O₂ (it needs at least ${pct(min.x)}).`)
  }

  const facts: Interpretation['facts'] = {
    material: m.name,
    cabin_pressure_kPa: Number(inp.pressureKPa.toFixed(1)),
    cabin_O2_percent: Number((inp.xO2 * 100).toFixed(1)),
    airflow_cm_s: Number(inp.flowCmS.toFixed(1)),
    model_can_burn_at_this_airflow: s.burning,
    model_flame_dim: s.burning && s.soot < 0.35,
    model_lowest_burning_O2_percent: Number((min.x * 100).toFixed(1)),
    model_most_flammable_airflow_cm_s: Number(min.uCmS.toFixed(0)),
    model_burns_with_no_airflow: still.burning,
    one_g_oxygen_index_percent: Number((m.loi.value * 100).toFixed(1)),
    model_risk_level: level,
    nasa_flight_finding_nearest: nearest ? nearest.finding.statement : 'none',
    nasa_flight_finding_source: nearest ? nearest.finding.source : 'none',
    nasa_flight_data_covers_this_cabin: m.id === 'pmma' && atIss && inp.xO2 <= 0.215,
  }
  return { level, bullets, facts }
}

function limitAtZero(still: EngineState, inp: EngineInput) {
  return Number.isFinite(still.limitO2) ? still.limitO2 : inp.xO2
}
