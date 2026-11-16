/*
 * Catalogue of NASA microgravity combustion investigations relevant to fire
 * safety. Every field comes from one of these sources, named in `source`:
 *  - BRIEF: NASA Space Apps 2026 "Flame in Freefall" challenge description
 *  - PSI-25 / PSI-26: NASA Physical Sciences Informatics investigation pages
 *  - GLENN: NASA Glenn Research Center Combustion Science page
 *  - OF2015: Olson & Ferkul 2015, NTRS 20150008961
 * Fields a source does not state are left undefined and shown as "not stated".
 */

export type Goal = 'prevention' | 'detection' | 'suppression' | 'modeling'
export type FuelKind = 'solid' | 'gas' | 'droplet' | 'aerosol'
export type Habitat = 'spacecraft' | 'moon' | 'mars' | 'earth'

export interface Investigation {
  id: string
  name: string
  family?: string
  psiId?: string
  url?: string
  goals: Goal[]
  fuel: FuelKind[]
  fuelDetail?: string
  hardware?: string
  conditions?: string
  measures?: string
  finding?: string
  /** In PSI now, or expected later */
  status: 'in PSI' | 'expected in PSI' | 'not stated'
  highOxygen?: boolean
  partialGravity?: boolean
  source: string
}

const PSI = 'https://psi.nasa.gov/physci/repo/data/investigations/'
const GLENN = 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/'

export const CATALOG: Investigation[] = [
  {
    id: 'bass2', name: 'BASS-II: Burning and Suppression of Solids II', psiId: 'PSI-25', url: PSI + 'PSI-25',
    goals: ['prevention', 'modeling'], fuel: ['solid'],
    fuelDetail: 'PMMA rods (0.32–0.64 cm radius), films, slabs, fabric sheets, spherical sections',
    hardware: 'Microgravity Science Glovebox (MSG), fan-driven flow duct built for SPICE',
    conditions: 'O₂ about 21% down to about 14% (nitrogen added); airflow up to 40 cm/s; ISS pressure',
    measures: 'Video and still cameras, radiometer, anemometer; O₂, CO₂ and CO before and after tests',
    finding: 'PMMA rods held a stable flame down to 13.6% O₂, below the normal-gravity test limit.',
    status: 'in PSI', source: 'PSI-25, OF2015, BRIEF',
  },
  {
    id: 'bass', name: 'BASS: Burning and Suppression of Solids', psiId: 'PSI-26', url: PSI + 'PSI-26',
    goals: ['prevention', 'suppression'], fuel: ['solid'],
    fuelDetail: 'SIBAL cotton/fibreglass fabric, Nomex fabric, Ultem, PMMA spheres and cylinders',
    hardware: 'MSG flow duct, 76 × 76 mm',
    conditions: 'Airflow up to 40 cm/s, concurrent and opposed flow',
    measures: 'Flame size, shape, colour, spread rate, quenching (top and edge views)',
    finding: 'Tested whether ventilated microgravity flames burn as well as or better than in 1 g, and nitrogen as an extinguishing agent.',
    status: 'in PSI', source: 'PSI-26, BRIEF',
  },
  {
    id: 'saffire', name: 'Saffire-I, -II, -III: Spacecraft Fire Safety Demonstration', family: 'Saffire',
    goals: ['prevention'], fuel: ['solid'], fuelDetail: 'Solid materials: fabrics and plastics',
    finding: 'Flammability of solid materials, the basis of material selection.',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'same', name: 'SAME and SAME-R: Smoke and Aerosol Measurement Experiment', family: 'SAME',
    goals: ['detection'], fuel: ['aerosol'],
    measures: 'Smoke and aerosol measurements for spacecraft smoke detectors',
    finding: 'Fire detection tested in microgravity; detectors must sense both soot and recondensed plastic droplets.',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'daft', name: 'DAFT and DAFT-2: Dust and Aerosol Measurement Feasibility Test', family: 'SAME',
    goals: ['detection'], fuel: ['aerosol'],
    measures: 'One of the SAME smoke-detection instruments, used to detect dust',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'flex', name: 'FLEX: Flame Extinguishment Experiment', family: 'MDCA droplets',
    goals: ['suppression'], fuel: ['droplet'], fuelDetail: 'Burning droplets of liquid fuel',
    hardware: 'Multi-user Droplet Combustion Apparatus (MDCA) in the Combustion Integrated Rack (CIR)',
    conditions: 'Chamber atmosphere diluted with carbon dioxide and helium',
    finding: 'Effectiveness of inert-gas suppressants in microgravity, and the most conservative limiting oxygen index for steady combustion.',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'flex2', name: 'FLEX-2', family: 'MDCA droplets',
    goals: ['modeling'], fuel: ['droplet'], fuelDetail: 'Burning droplets of liquid fuel',
    hardware: 'MDCA in the CIR', status: 'not stated', source: 'BRIEF',
  },
  {
    id: 'cfi', name: 'CFI: Cool Flames Investigation', family: 'MDCA droplets',
    goals: ['modeling'], fuel: ['droplet'], fuelDetail: 'Burning droplets of liquid fuel',
    hardware: 'MDCA in the CIR', status: 'not stated', source: 'BRIEF',
  },
  {
    id: 'acme-bre', name: 'ACME BRE: Burning Rate Emulator', family: 'ACME',
    goals: ['prevention', 'modeling'], fuel: ['gas'],
    fuelDetail: 'Gaseous fuels, emulating burning materials',
    hardware: 'Modular ACME hardware in the CIR',
    conditions: 'Still (quiescent) atmospheres',
    finding: 'Materials flammability in still atmospheres as a function of material properties.',
    status: 'not stated', url: GLENN, source: 'BRIEF',
  },
  {
    id: 'acme-cfig', name: 'ACME CFI-G: Cool Flames Investigation with Gases', family: 'ACME',
    goals: ['modeling'], fuel: ['gas'],
    fuelDetail: 'Nitrogen plus a flammable gas (e.g. propane) in the chamber; oxygen-nitrogen flows from a spherical burner',
    hardware: 'Modular ACME hardware in the CIR',
    conditions: 'Up to 85% O₂, the highest oxygen of any microgravity tests (inside-out flames)',
    status: 'not stated', highOxygen: true, url: GLENN, source: 'BRIEF',
  },
  {
    id: 'acme-efield', name: 'ACME E-FIELD Flames: Electric-Field Effects on Laminar Diffusion Flames', family: 'ACME',
    goals: ['modeling'], fuel: ['gas'], hardware: 'Modular ACME hardware in the CIR',
    finding: 'Mimicked partial gravity through the effect of an electric field on the ions in flames.',
    status: 'not stated', partialGravity: true, url: GLENN, source: 'BRIEF',
  },
  {
    id: 'spice', name: 'SPICE: Smoke Point In Co-flow Experiment', family: 'MSG flow duct',
    goals: ['detection', 'modeling'], fuel: ['gas'], hardware: 'MSG; the fan-driven flow duct was built for SPICE',
    finding: 'Stability and extinction of jet diffusion flames, continuing the Laminar Soot Processes study.',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'slice', name: 'SLICE: Structure & Liftoff In Combustion Experiment', family: 'MSG flow duct',
    goals: ['modeling'], fuel: ['gas'], hardware: 'MSG flow duct', fuelDetail: 'Coflow laminar diffusion flames',
    finding: 'A flame configuration that can be modelled accurately, useful for testing combustion models.',
    status: 'not stated', url: GLENN, source: 'BRIEF, GLENN',
  },
  {
    id: 'sofie', name: 'SoFIE: Solid Fuel Ignition and Extinction',
    goals: ['prevention'], fuel: ['solid'],
    finding: 'Fire growth on solids; studies whether the 1 g NASA-STD-6001 test is conservative in low gravity.',
    status: 'not stated', url: GLENN, source: 'GLENN',
  },
  {
    id: 'flare', name: 'FLARE: Flammability Limits at Reduced-g Experiment',
    goals: ['prevention', 'modeling'], fuel: ['solid'],
    finding: 'Aims to predict microgravity flammability limits from ground tests (JAXA, NASA, ESA, CNES, DLR).',
    status: 'not stated', url: GLENN, source: 'GLENN',
  },
  {
    id: 'luci', name: 'LUCI: Lunar-g Combustion Investigation',
    goals: ['prevention'], fuel: [], finding: 'Expected source of partial-gravity (lunar) combustion data.',
    status: 'expected in PSI', partialGravity: true, source: 'BRIEF',
  },
  {
    id: 'fm2', name: 'FM2: Flammability of Materials on the Moon',
    goals: ['prevention'], fuel: ['solid'], fuelDetail: 'Materials such as SIBAL fabric',
    finding: 'First combustion experiment planned on another planetary body, at 1/6 g.',
    status: 'expected in PSI', partialGravity: true, url: GLENN, source: 'BRIEF, GLENN',
  },
]

export const HABITATS: { id: Habitat; label: string; hint: string }[] = [
  { id: 'spacecraft', label: 'Spacecraft / ISS', hint: 'Microgravity, ventilation-driven flows' },
  { id: 'moon', label: 'Moon Base / rover', hint: '≥30% O₂ at ≤10.2 psi, 1/6 g (per the challenge)' },
  { id: 'mars', label: 'Mars habitat', hint: 'Partial gravity (0.38 g)' },
  { id: 'earth', label: 'Earth applications', hint: 'Spin-offs: water mist, smoke detection, firefighter gear' },
]

export const GOALS: { id: Goal; label: string }[] = [
  { id: 'prevention', label: 'Prevention (materials)' },
  { id: 'detection', label: 'Detection (smoke)' },
  { id: 'suppression', label: 'Suppression' },
  { id: 'modeling', label: 'Predictive modelling' },
]

export interface Ranked { inv: Investigation; score: number; reasons: string[] }

/** Transparent rule-based ranking: every point is shown to the user as a reason. */
export function rankCatalog(habitat: Habitat, goal: Goal, materialFuel: FuelKind = 'solid'): Ranked[] {
  return CATALOG.map((inv) => {
    let score = 0
    const reasons: string[] = []
    if (inv.goals.includes(goal)) { score += 3; reasons.push(`addresses ${goal}`) }
    if (inv.fuel.includes(materialFuel) && goal === 'prevention') { score += 2; reasons.push('solid materials, like cabin fabrics and plastics') }
    if (inv.status === 'in PSI') { score += 2; reasons.push('data available in NASA PSI now') }
    if (habitat === 'moon' && inv.highOxygen) { score += 2; reasons.push('highest-oxygen microgravity tests (Moon Base air is ≥30% O₂)') }
    if ((habitat === 'moon' || habitat === 'mars') && inv.partialGravity) { score += 2; reasons.push('partial-gravity relevance') }
    if (habitat === 'spacecraft' && (inv.hardware ?? '').includes('MSG')) { score += 1; reasons.push('ventilated flow duct, like spacecraft airflow') }
    if (habitat === 'earth' && (inv.id === 'flex' || inv.id === 'same')) { score += 2; reasons.push('linked to Earth spin-offs (extinguishers, smoke detection)') }
    return { inv, score, reasons }
  }).sort((a, b) => b.score - a.score || a.inv.name.localeCompare(b.inv.name))
}
