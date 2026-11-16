/** Where a number comes from. Shown next to every material property in the UI. */
export type Provenance =
  | 'literature' // approximate handbook value (flammability tables); verify before engineering use
  | 'model' // an assumption or calibration constant of this model, not a measurement

export interface SourcedValue {
  value: number
  unit: string
  source: Provenance
  note?: string
}

export interface Material {
  id: string
  name: string
  short: string
  commonName?: string
  application?: string
  /** Heat of combustion, J/kg */
  deltaHc: SourcedValue
  /** Heat of gasification (energy to turn solid into fuel vapour), J/kg */
  heatOfGasification: SourcedValue
  /** Limiting oxygen index in normal gravity (ASTM D2863), mole fraction */
  loi: SourcedValue
  /** Surface pyrolysis temperature, K */
  pyrolysisT: SourcedValue
  /** Solid density, kg/m^3 */
  density: SourcedValue
  /** Solid specific heat, J/(kg K) */
  cp: SourcedValue
  /** Surface emissivity */
  emissivity: SourcedValue
  caveat?: string
}

export interface Atmosphere {
  id: string
  name: string
  pressureKPa: number
  xO2: number
  note: string
}

export type Regime =
  | 'sooty' // burning, bright yellow soot
  | 'blue' // burning, dim and nearly soot-free: hard to see by eye
  | 'quench' // too little flow: radiative loss wins
  | 'blowoff' // too much flow: chemistry cannot keep up
  | 'nonflammable' // the flame cannot supply the heat needed to gasify the fuel

export type SpectralMode = 'compare' | 'visible' | 'mwir' | 'co'

export interface EngineInput {
  pressureKPa: number
  xO2: number
  flowCmS: number
  material: Material
  /** Planetary gravity in units of Earth g (0 for microgravity, 0.16 for Moon, 0.38 for Mars, 1.0 for Earth). Defaults to 0. */
  gravity?: number
}

export interface EngineState {
  regime: Regime
  burning: boolean
  /** Peclet number U d / alpha */
  pe: number
  /** Damkohler number (flow time / chemical time); flame needs >= 1 */
  da: number
  /** Radiation-to-convection loss ratio */
  radiationNumber: number
  /** Fraction of flame heat lost to radiation */
  radiativeLossFraction: number
  /** Ideal flame temperature, K */
  tAdiabatic: number
  /** Flame temperature after radiative loss, K */
  tFlame: number
  /** Spalding mass-transfer number */
  spaldingB: number
  yO2: number
  alpha: number
  uEffCmS: number
  /** Fuel burning rate, g/(m^2 s) */
  massFlux: number
  /** Heat flux into the fuel surface, kW/m^2 */
  heatFlux: number
  /** 0..1 how sooty (visible) the flame is */
  soot: number
  /** Flame standoff distance from the rod surface, mm (illustrative) */
  standoffMm: number
  /** Oxygen fraction at which the flame dies at this flow and pressure */
  limitO2: number
}

export interface CoolingResult {
  t: number[]
  T: number[]
  /** Seconds until the surface reaches the chosen safe temperature (null if never within the window) */
  holdTime: number | null
  biot: number
}
