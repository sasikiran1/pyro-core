import type { Atmosphere } from '../types/combustion'

// ---- physical constants -------------------------------------------------------
export const SIGMA = 5.670374419e-8 // Stefan-Boltzmann, W/(m^2 K^4)
export const R_GAS = 8.314462618 // J/(mol K)
/** Heat released per kg of O2 consumed, nearly the same for all organic fuels (Huggett 1980). */
export const HUGGETT_J_PER_KG_O2 = 13.1e6
export const T_AMBIENT = 295 // K

// ---- air properties at 101.325 kPa, 295 K --------------------------------------
export const P_REF_KPA = 101.325
export const ALPHA_REF = 2.2e-5 // thermal diffusivity, m^2/s (scales as 1/P)
export const RHO_REF = 1.2 // kg/m^3 (scales as P)
export const MU_AIR = 1.8e-5 // dynamic viscosity, Pa s (independent of P)
export const K_AIR = 0.026 // conductivity, W/(m K) (independent of P)
export const CP_GAS = 1100 // J/(kg K), mean over flame temperatures

// ---- geometry ---------------------------------------------------------------------
/**
 * Rod in axial (concurrent) flow, burning at its upstream tip, as in the
 * BASS-II PMMA rod tests (Olson & Ferkul 2015). Radius 0.635 cm is the largest
 * BASS-II rod (1/2 inch diameter).
 */
export const ROD_RADIUS = 0.00635 // m
export const ROD_DIAMETER = 2 * ROD_RADIUS

// ---- NASA flight data used for calibration ----------------------------------------
/**
 * BASS-II (ISS, PSI-25): lowest O2 at which a PMMA rod held a stable flame,
 * 13.6% by volume, at ISS pressure. Olson & Ferkul, "Microgravity Flammability
 * of PMMA Rods in Concurrent Flow", 9th US National Combustion Meeting, 2015,
 * NTRS 20150008961.
 */
export const BASS2_PMMA_MIN_O2 = 0.136
/** Same paper: linear blow-off fit extrapolated to zero stretch, 13.3% O2. */
export const BASS2_PMMA_BLOWOFF_INTERCEPT_O2 = 0.133
/** Conditions BASS-II actually covered: ISS pressure, O2 from about 14% to 21%, flow up to 40 cm/s (PSI-25 description). */
export const BASS2_COVERAGE = { pressureKPa: [97, 104] as const, xO2: [0.135, 0.215] as const, flowCmS: [0, 40] as const }

// ---- model constants (assumptions and calibration, not measurements) -------------
/**
 * Gas-phase dilution factor in the flame-temperature estimate. Chosen so a
 * flame in air comes out near 2000 K, a typical adiabatic value for polymers.
 */
export const DILUTION = 1.5
/** Global activation energy of the one-step gas-phase reaction, J/mol (typical value used in flame-spread models). */
export const ACTIVATION_ENERGY = 1.25e5
/** Flow-like velocity that remains at zero forced flow (thermal expansion, Stefan flow), m/s. */
export const U_DIFFUSION = 0.002
/**
 * Radiation-loss coefficient in the radiation number (it lumps emissivity and
 * the ratio of radiating volume to convective area, so it is not a true
 * emissivity). Assumption, not fitted: it sets where the low-flow quench
 * branch sits, which the one BASS-II number used here does not constrain.
 */
export const EPS_FLAME = 0.1
/** Critical Damkohler number; the flame needs Da >= this. */
export const DA_CRIT = 1
/**
 * Fitted constant, m/s. Each material's reaction-rate prefactor is set so its
 * limit at this flow, at sea-level pressure, equals its normal-gravity oxygen
 * index. The value was fitted (scripts/checkPhysics.ts) so that PMMA's lowest
 * limiting O2 at ISS pressure equals the BASS-II flight minimum, 13.6%. It is
 * a fitting parameter, not a physical flow: one number fitted to one NASA
 * measurement and applied to every material. The other materials therefore
 * carry PMMA's microgravity/1 g relation by assumption.
 */
export const U_ANCHOR = 0.00194

export const ATMOSPHERES: Atmosphere[] = [
  { id: 'iss', name: 'ISS baseline', pressureKPa: 101.3, xO2: 0.21, note: '14.7 psi, 21% O2: sea-level air' },
  {
    id: 'eaa',
    name: 'Exploration atmosphere',
    pressureKPa: 56.5,
    xO2: 0.34,
    note: '8.2 psi, 34% O2: proposed for Artemis-era vehicles to shorten spacesuit pre-breathe',
  },
  { id: 'staged', name: 'Shuttle staged', pressureKPa: 70.3, xO2: 0.265, note: '10.2 psi, 26.5% O2: used on Shuttle before spacewalks' },
]

export interface PlanetaryGravity {
  id: string
  name: string
  short: string
  g: number // fraction of 1g
  buoyantDraftCmS: number
  note: string
}

export const U_BUOYANT_1G = 0.20 // m/s, buoyant plume velocity in normal gravity

export const PLANETARY_GRAVITIES: PlanetaryGravity[] = [
  { id: 'orbit', name: 'Microgravity (Orbit)', short: '0.00g Space', g: 0.0, buoyantDraftCmS: 0, note: 'Zero buoyant draft. Flame lives only on ventilation fan airflow.' },
  { id: 'moon', name: 'Moon Surface Base', short: '0.16g Moon', g: 0.16, buoyantDraftCmS: 8.0, note: 'Weak buoyant draft (~8 cm/s). Flame forms an upright hemispherical dome.' },
  { id: 'mars', name: 'Mars Surface Habitat', short: '0.38g Mars', g: 0.38, buoyantDraftCmS: 12.3, note: 'Moderate buoyant draft (~12 cm/s). Bulbous, soft flame with slow flicker.' },
  { id: 'earth', name: 'Earth 1g Terrestrial', short: '1.00g Earth', g: 1.0, buoyantDraftCmS: 20.0, note: 'Strong buoyant chimney draft (~20 cm/s). Classic tall flickering teardrop.' },
]
