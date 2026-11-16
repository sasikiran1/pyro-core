/*
 * Measured NASA flight findings used by the interpreter. Each entry is a
 * statement printed in the cited NASA source; nothing here is estimated or
 * typed from a chart. Individual BASS-II test runs are in the PSI-25
 * experimental table (130 rows) but were not imported: only five rows were
 * readable through the public page, so no run-level values are shown rather
 * than partial or guessed ones.
 */

export interface FlightFinding {
  id: string
  investigation: string
  psiId?: string
  /** Material id in this app the finding is about */
  material: string
  geometry: string
  pressureKPa: number
  /** O2 mole fraction the finding refers to */
  xO2: number
  kind: 'lowest burning O2' | 'blow-off extrapolation' | 'no upstream spread below' | 'no opposed spread below'
  statement: string
  source: string
  url: string
}

const OLSON_FERKUL = 'Olson & Ferkul, Microgravity Flammability of PMMA Rods in Concurrent Flow, 9th US National Combustion Meeting, 2015 (NTRS 20150008961)'
const NTRS = 'https://ntrs.nasa.gov/citations/20150008961'

export const FLIGHT_FINDINGS: FlightFinding[] = [
  {
    id: 'bass2-pmma-min',
    investigation: 'BASS-II',
    psiId: 'PSI-25',
    material: 'pmma',
    geometry: 'PMMA rods, radius 0.32–0.64 cm, axial (concurrent) flow',
    pressureKPa: 101.3,
    xO2: 0.136,
    kind: 'lowest burning O2',
    statement: 'A PMMA rod held a stable flame at 13.6% O₂, the lowest oxygen tested.',
    source: OLSON_FERKUL,
    url: NTRS,
  },
  {
    id: 'bass2-pmma-blowoff',
    investigation: 'BASS-II',
    psiId: 'PSI-25',
    material: 'pmma',
    geometry: 'PMMA rods, axial flow',
    pressureKPa: 101.3,
    xO2: 0.133,
    kind: 'blow-off extrapolation',
    statement: 'The measured blow-off boundary, extended linearly to zero flow, reaches 13.3% O₂, proposed as a conservative minimum.',
    source: OLSON_FERKUL,
    url: NTRS,
  },
  {
    id: 'bass2-pmma-upstream',
    investigation: 'BASS-II',
    psiId: 'PSI-25',
    material: 'pmma',
    geometry: 'PMMA rods, axial flow',
    pressureKPa: 101.3,
    xO2: 0.161,
    kind: 'no upstream spread below',
    statement: 'At 16.1% O₂ and lower, a flame blown off the rod tip could not spread back upstream.',
    source: OLSON_FERKUL,
    url: NTRS,
  },
  {
    id: 'bass2-pmma-opposed',
    investigation: 'BASS-II',
    psiId: 'PSI-25',
    material: 'pmma',
    geometry: 'PMMA rods, opposed flow',
    pressureKPa: 101.3,
    xO2: 0.164,
    kind: 'no opposed spread below',
    statement: 'In opposed-flow rod tests, flame spread was not observed below 16.4% O₂ (reported in the same paper, citing Link et al. 2014).',
    source: OLSON_FERKUL,
    url: NTRS,
  },
]
