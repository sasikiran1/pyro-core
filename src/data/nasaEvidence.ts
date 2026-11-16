/*
 * NASA combustion investigations relevant to spacecraft material
 * flammability. Every field below was read from the cited NASA page on
 * 2026-11-15; nothing is inferred. Fields a page did not state are left
 * undefined rather than guessed.
 */

export interface Investigation {
  id: string
  name: string
  psiId?: string
  doi?: string
  url: string
  platform: string
  fuels: string[]
  /** Material ids in this app that the investigation burned */
  materials: string[]
  geometry: string
  oxygen?: string
  flow?: string
  pressure?: string
  finding: string
  /** Flame spread / flammability limits of solids in forced flow: the question this app models */
  limitsOfSolids: boolean
  source: string
}

export const INVESTIGATIONS: Investigation[] = [
  {
    id: 'bass2',
    name: 'Burning and Suppression of Solids II (BASS-II)',
    psiId: 'PSI-25',
    doi: '10.60555/4qc4-de67',
    url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25',
    platform: 'ISS, Microgravity Science Glovebox, 2010–2022',
    fuels: ['PMMA rods (0.32–0.64 cm radius)', 'PMMA films and slabs', 'fabric sheets', 'spherical sections'],
    materials: ['pmma', 'sibal'],
    geometry: 'Small flow duct; rods in axial (concurrent) flow, also opposed flow',
    oxygen: 'About 21% down to about 14% (nitrogen added)',
    flow: 'Up to 40 cm/s (fan)',
    pressure: 'ISS cabin pressure',
    finding:
      'PMMA rods held a stable flame down to 13.6% O₂; the blow-off line extrapolates to 13.3% at zero flow. Below 16.1% O₂ a blown-off flame could not spread back upstream.',
    limitsOfSolids: true,
    source: 'PSI-25 record; Olson & Ferkul, 9th US National Combustion Meeting, 2015 (NTRS 20150008961)',
  },
  {
    id: 'bass',
    name: 'Burning and Suppression of Solids (BASS)',
    psiId: 'PSI-26',
    doi: '10.60555/58h4-dy80',
    url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-26',
    platform: 'ISS, Microgravity Science Glovebox, 2009–2013',
    fuels: ['SIBAL fabric (75% cotton, 25% fibreglass)', 'Nomex fabric', 'Ultem', 'PMMA spheres and cylinders'],
    materials: ['sibal', 'nomex', 'pmma'],
    geometry: 'Flow duct 76 × 76 mm; concurrent and opposed flow',
    flow: 'Up to 40 cm/s (fan)',
    finding:
      'Tested whether materials burn as well or better in ventilated microgravity than in normal gravity, and how well nitrogen puts the flames out.',
    limitsOfSolids: true,
    source: 'PSI-26 record',
  },
  {
    id: 'sofie',
    name: 'Solid Fuel Ignition and Extinction (SoFIE)',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    platform: 'ISS',
    fuels: [],
    materials: [],
    geometry: 'Not stated on the source page',
    finding:
      'Studies fire growth on solids because the 1 g NASA-STD-6001 flame test may not be conservative in low gravity.',
    limitsOfSolids: true,
    source: 'NASA Glenn Combustion Science page',
  },
  {
    id: 'flare',
    name: 'Flammability Limits at Reduced-g Experiment (FLARE)',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    platform: 'International (JAXA, NASA, ESA, CNES, DLR)',
    fuels: [],
    materials: [],
    geometry: 'Not stated on the source page',
    finding: 'Aims to predict a material’s microgravity flammability limit from ground tests: the 1 g ↔ 0 g link this app approximates.',
    limitsOfSolids: true,
    source: 'NASA Glenn Combustion Science page',
  },
  {
    id: 'fm2',
    name: 'Flammability of Materials on the Moon (FM2)',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    platform: 'Lunar surface (1/6 g)',
    fuels: ['SIBAL fabric (shown in drop-tower tests)'],
    materials: ['sibal'],
    geometry: 'Not stated on the source page',
    finding: 'First combustion experiment planned on another planetary body; partial gravity, which this app does not model.',
    limitsOfSolids: true,
    source: 'NASA Glenn Combustion Science page',
  },
  {
    id: 'flex',
    name: 'Flame Extinguishment Experiment (FLEX)',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    platform: 'ISS, Combustion Integrated Rack',
    fuels: ['Liquid fuel droplets'],
    materials: [],
    geometry: 'Droplets',
    finding: 'Measured how well inert gases suppress flames and sought the most conservative limiting oxygen index for steady combustion.',
    limitsOfSolids: false,
    source: 'NASA Glenn Combustion Science page',
  },
  {
    id: 'same',
    name: 'Smoke Aerosol Measurement Experiment (SAME)',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    platform: 'ISS',
    fuels: ['Spacecraft materials (smoke)'],
    materials: [],
    geometry: 'Smoke detection',
    finding: 'Spacecraft smoke detectors must detect different smoke types: soot from hydrocarbons, recondensed droplets from plastics.',
    limitsOfSolids: false,
    source: 'NASA Glenn Combustion Science page',
  },
]

export interface RankedInvestigation {
  inv: Investigation
  score: number
  reasons: string[]
}

/**
 * Deterministic relevance ranking for the selected material and cabin. The
 * weights are simple and shown to the user as reasons; no model is involved.
 */
export function rankInvestigations(materialId: string, pressureKPa: number, xO2: number): RankedInvestigation[] {
  const atIss = pressureKPa > 95 && pressureKPa < 106
  return INVESTIGATIONS.map((inv) => {
    const reasons: string[] = []
    let score = 0
    if (inv.materials.includes(materialId)) {
      score += 3
      reasons.push('burned this material')
    }
    if (inv.limitsOfSolids) {
      score += 2
      reasons.push('solid-fuel flammability')
    }
    if (inv.id === 'bass2' && materialId === 'pmma') {
      score += 2
      reasons.push('same rod geometry; calibrates this model')
    }
    if ((inv.id === 'bass' || inv.id === 'bass2') && atIss && xO2 <= 0.215) {
      score += 1
      reasons.push('covers this cabin')
    }
    return { inv, score, reasons }
  }).sort((a, b) => b.score - a.score)
}
