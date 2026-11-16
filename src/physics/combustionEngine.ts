/*
 * Microgravity flame model for a polymer rod burning at its upstream tip in
 * axial (concurrent) forced flow: the BASS-II rod geometry.
 *
 * What it is: a reduced-order model built from standard combustion
 * relations (Huggett's oxygen-consumption constant, a one-step Arrhenius
 * Damkohler number in Olson & Ferkul's stretch-rate form, a radiation-loss
 * number, the Spalding B number and a Ranz-Marshall heat-transfer
 * correlation at the rod tip). One fitted constant makes PMMA's lowest
 * limiting O2 at ISS pressure equal the BASS-II flight minimum (13.6%); each
 * other material is tied to its normal-gravity oxygen index the same way.
 *
 * What it is not: a CFD solver, or a fit to the full BASS-II data set. Only
 * the PMMA minimum is calibrated; where the low-flow and high-flow branches
 * sit is set by assumptions. Treat other outputs as trends.
 */
import type { CoolingResult, EngineInput, EngineState, Material, Regime } from '../types/combustion'
import {
  ACTIVATION_ENERGY, ALPHA_REF, CP_GAS, DA_CRIT, DILUTION, EPS_FLAME, HUGGETT_J_PER_KG_O2, K_AIR, MU_AIR,
  P_REF_KPA, RHO_REF, R_GAS, ROD_DIAMETER, ROD_RADIUS, SIGMA, T_AMBIENT, U_ANCHOR, U_DIFFUSION,
} from './constants'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** O2 mole fraction to mass fraction in an O2/N2 mixture. */
export const yO2 = (x: number) => (32 * x) / (32 * x + 28 * (1 - x))
export const alphaAt = (pKPa: number) => ALPHA_REF * (P_REF_KPA / pKPa)
export const rhoAt = (pKPa: number) => RHO_REF * (pKPa / P_REF_KPA)
export const uEff = (u: number) => Math.hypot(u, U_DIFFUSION)

/** Ideal flame temperature from the oxygen supply (Huggett), capped for dissociation. */
export const adiabaticT = (x: number) =>
  Math.min(T_AMBIENT + (yO2(x) * HUGGETT_J_PER_KG_O2) / (CP_GAS * DILUTION), 3000)

/** Radiative loss relative to the enthalpy the flow carries through the flame zone. */
export function radiationNumber(tf: number, tad: number, pKPa: number, ue: number) {
  return (EPS_FLAME * SIGMA * (tf ** 4 - T_AMBIENT ** 4)) / (rhoAt(pKPa) * CP_GAS * ue * Math.max(tad - T_AMBIENT, 1))
}

/** Flame temperature after radiative loss: fixed point of Tf = Tad - (Tad - Tinf) R/(1+R). */
export function flameT(tad: number, pKPa: number, ue: number) {
  let tf = tad
  for (let i = 0; i < 60; i++) {
    const r = radiationNumber(tf, tad, pKPa, ue)
    const next = tad - ((tad - T_AMBIENT) * r) / (1 + r)
    const prev = tf
    tf = 0.5 * tf + 0.5 * next
    if (Math.abs(tf - prev) < 0.01) break // converged to 0.01 K
  }
  const r = radiationNumber(tf, tad, pKPa, ue)
  return { tf, r, loss: r / (1 + r) }
}

/** Stretch rate at the rod's stagnation tip, a = 3/2 U/R (Olson & Ferkul 2015), 1/s. */
export const stretchRate = (ue: number) => (1.5 * ue) / ROD_RADIUS

/**
 * Damkohler number without the material's pre-exponential factor, in the
 * form Olson & Ferkul use for BASS-II rods: reaction rate over stretch rate,
 * Da ~ A (rho Y_ox) exp(-E/RT) / a. Second-order kinetics per unit mass give
 * one power of density, so Da scales with pressure.
 */
function daShape(u: number, pKPa: number, x: number) {
  const ue = uEff(u)
  const { tf } = flameT(adiabaticT(x), pKPa, ue)
  return (rhoAt(pKPa) * yO2(x) * Math.exp(-ACTIVATION_ENERGY / (R_GAS * tf))) / stretchRate(ue)
}

const prefactorCache = new Map<string, number>()
/** Pre-exponential factor: the material extinguishes at its 1 g oxygen index at the anchor flow, at sea-level pressure. */
export function prefactor(m: Material, uAnchor = U_ANCHOR) {
  const key = `${m.id}@${uAnchor}`
  let b = prefactorCache.get(key)
  if (b === undefined) {
    b = DA_CRIT / daShape(uAnchor, P_REF_KPA, m.loi.value)
    prefactorCache.set(key, b)
  }
  return b
}

export const damkohler = (m: Material, u: number, pKPa: number, x: number, uAnchor = U_ANCHOR) =>
  prefactor(m, uAnchor) * daShape(u, pKPa, x)

export function spaldingB(m: Material, x: number) {
  return (yO2(x) * HUGGETT_J_PER_KG_O2 - CP_GAS * (m.pyrolysisT.value - T_AMBIENT)) / m.heatOfGasification.value
}

/**
 * Heat-transfer coefficient at the rod's rounded upstream tip, treated as a
 * sphere of the rod's diameter (Ranz-Marshall: Nu = 2 + 0.6 Re^1/2 Pr^1/3).
 */
export function hTip(u: number, pKPa: number, d = ROD_DIAMETER) {
  const re = (rhoAt(pKPa) * Math.max(u, 0) * d) / MU_AIR
  const nu = 2 + 0.6 * Math.sqrt(re) * Math.cbrt(0.71)
  return (nu * K_AIR) / d
}

/** Oxygen fraction at which Da = DA_CRIT for this flow and pressure (bisection; Da rises with O2). */
export function limitO2(m: Material, u: number, pKPa: number, uAnchor = U_ANCHOR) {
  let lo = 0.05
  let hi = 0.8
  if (damkohler(m, u, pKPa, hi, uAnchor) < DA_CRIT) return Number.POSITIVE_INFINITY
  if (damkohler(m, u, pKPa, lo, uAnchor) >= DA_CRIT) return lo
  for (let i = 0; i < 40; i++) {
    const mid = 0.5 * (lo + hi)
    if (damkohler(m, u, pKPa, mid, uAnchor) >= DA_CRIT) hi = mid
    else lo = mid
  }
  return hi
}

const minimumCache = new Map<string, { x: number; uCmS: number }>()
/** Lowest limiting O2 over the flow range, and the flow where it occurs. Cached per material and pressure (0.1 kPa). */
export function minimumLimit(m: Material, pKPa: number, uAnchor = U_ANCHOR, uMaxCmS = 40) {
  const key = `${m.id}@${pKPa.toFixed(1)}@${uAnchor}@${uMaxCmS}`
  const hit = minimumCache.get(key)
  if (hit) return hit
  const best = scanMinimum(m, pKPa, uAnchor, uMaxCmS)
  if (minimumCache.size > 2000) minimumCache.clear()
  minimumCache.set(key, best)
  return best
}

function scanMinimum(m: Material, pKPa: number, uAnchor: number, uMaxCmS: number) {
  let best = { x: Infinity, uCmS: 0 }
  for (let u = 0; u <= uMaxCmS; u += 0.25) {
    const x = limitO2(m, u / 100, pKPa, uAnchor)
    if (x < best.x) best = { x, uCmS: u }
  }
  return best
}

const optimumCache = new Map<string, number>()
/** Flow (cm/s) at which the material's limiting O2 is lowest, for this pressure. Cached. */
function optimumFlowCmS(m: Material, pKPa: number) {
  const key = `${m.id}@${pKPa.toFixed(2)}`
  let u = optimumCache.get(key)
  if (u === undefined) {
    u = minimumLimit(m, pKPa).uCmS
    optimumCache.set(key, u)
  }
  return u
}

export function classify(m: Material, u: number, pKPa: number, x: number): Regime {
  if (spaldingB(m, x) <= 0) return 'nonflammable'
  const { tf } = flameT(adiabaticT(x), pKPa, uEff(u))
  // Out: below the most-flammable flow it is a radiative quench, above it a blow-off.
  if (damkohler(m, u, pKPa, x) < DA_CRIT) return u * 100 < optimumFlowCmS(m, pKPa) ? 'quench' : 'blowoff'
  return sootiness(tf) < 0.35 ? 'blue' : 'sooty'
}

/** Visible soot emission rises steeply with flame temperature; near-limit microgravity flames are dim and blue. */
export const sootiness = (tf: number) => smoothstep(1400, 1750, tf) // thresholds are illustrative

export function evaluate(inp: EngineInput): EngineState {
  const { material: m, pressureKPa: p, xO2: x, flowCmS } = inp
  const u = flowCmS / 100
  const ue = uEff(u)
  const tad = adiabaticT(x)
  const { tf, r, loss } = flameT(tad, p, ue)
  const regime = classify(m, u, p, x)
  const burning = regime === 'sooty' || regime === 'blue'
  const B = spaldingB(m, x)
  const h = hTip(ue, p)
  const massFlux = burning ? (h / CP_GAS) * Math.log(1 + Math.max(B, 0)) * 1000 : 0 // g/(m^2 s)
  const alpha = alphaAt(p)
  return {
    regime,
    burning,
    pe: (u * ROD_DIAMETER) / alpha,
    da: damkohler(m, u, p, x),
    radiationNumber: r,
    radiativeLossFraction: loss,
    tAdiabatic: tad,
    tFlame: burning ? tf : T_AMBIENT,
    spaldingB: B,
    yO2: yO2(x),
    alpha,
    uEffCmS: ue * 100,
    massFlux,
    heatFlux: burning ? (massFlux / 1000) * m.heatOfGasification.value / 1000 : 0, // kW/m^2
    soot: burning ? sootiness(tf) : 0,
    standoffMm: burning ? clamp((alpha / ue) * Math.log(1 + Math.max(B, 0)) * 1000 * 3, 1, 18) : 0,
    limitO2: limitO2(m, u, p),
  }
}

/**
 * Lumped-capacitance cooling of the rod after extinction, starting at the
 * pyrolysis temperature: dT/dt = -(A/V) [h (T - Tinf) + eps sigma (T^4 - Tinf^4)] / (rho c).
 * Conservative: it assumes the whole rod is at the surface temperature,
 * whereas only a thin surface layer is really that hot.
 */
export function cooling(m: Material, flowCmS: number, pKPa: number, safeT: number, horizon = 900): CoolingResult {
  const u = flowCmS / 100
  const h = hTip(u, pKPa)
  const aOverV = 4 / ROD_DIAMETER
  const rc = m.density.value * m.cp.value
  const eps = m.emissivity.value
  let T = m.pyrolysisT.value
  const dt = 0.5
  const t: number[] = [0]
  const Ts: number[] = [T]
  let hold: number | null = T <= safeT ? 0 : null
  for (let s = dt; s <= horizon; s += dt) {
    const dTdt = (-aOverV * (h * (T - T_AMBIENT) + eps * SIGMA * (T ** 4 - T_AMBIENT ** 4))) / rc
    T += dTdt * dt
    if (hold === null && T <= safeT) hold = s
    if (Math.round(s / dt) % 4 === 0) {
      t.push(s)
      Ts.push(T)
    }
  }
  // Biot number with radiation linearised at the start temperature (lumped model is fair for Bi < 0.1)
  const T0 = m.pyrolysisT.value
  const hRad = eps * SIGMA * (T0 + T_AMBIENT) * (T0 ** 2 + T_AMBIENT ** 2)
  const kSolid = 0.2
  return { t, T: Ts, holdTime: hold, biot: ((h + hRad) * (ROD_DIAMETER / 4)) / kSolid }
}

/** Upstream tip of the rod in the scene, metres (the rod runs downstream along +x). Matches X_TIP in the shader. */
export const ROD_TIP_X = -0.035

/**
 * Analytic field used by the click probe, in the mid-plane through the rod
 * axis (metres). The shader draws the same shape plus noise. Illustrative
 * shape, not a CFD solution.
 */
export function fieldAt(s: EngineState, inp: EngineInput, px: number, py: number) {
  const u = inp.flowCmS / 100
  const R = ROD_RADIUS
  const flowFrac = clamp(inp.flowCmS / 40, 0, 1)
  const dx = px - ROD_TIP_X
  const insideRod = dx >= 0 ? Math.abs(py) <= R : Math.hypot(dx, py) <= R
  const rf = R + s.standoffMm / 1000
  let d: number
  let rLocal = rf
  let env = 1
  if (dx < 0) d = Math.hypot(dx * (1 + 1.6 * flowFrac), py)
  else {
    const len = 0.018 + 0.09 * flowFrac
    d = Math.abs(py)
    rLocal = rf + (R + 0.35 * (rf - R) - rf) * smoothstep(0, len, dx)
    env = 1 - smoothstep(len * 0.7, len, dx)
  }
  const w = 0.0025
  let T = T_AMBIENT
  let xO2 = inp.xO2
  if (s.burning && !insideRod) {
    const prof = d < rLocal ? 1 - 0.35 * (1 - d / rLocal) : Math.exp(-(((d - rLocal) / w) ** 2))
    T = T_AMBIENT + (s.tFlame - T_AMBIENT) * prof * env
    xO2 = inp.xO2 * (d < rLocal ? 1 - 0.95 * env : 1 - env * Math.exp(-((d - rLocal) / 0.006)))
  }
  // potential flow past a sphere at the tip, uniform axial flow along the rod
  let vx = u
  let vy = 0
  if (dx < 0 && !insideRod) {
    const r2 = dx * dx + py * py
    const r3 = r2 * Math.sqrt(r2)
    const c = (u * R ** 3) / 2
    vx = u + c * (1 / r3 - (3 * dx * dx) / (r3 * r2))
    vy = (-c * 3 * dx * py) / (r3 * r2)
  }
  return { T, xO2, speedCmS: insideRod ? 0 : Math.hypot(vx, vy) * 100, insideRod }
}
