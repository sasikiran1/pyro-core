/*
 * Loader for NASA's BASS-II experimental table (PSI-25, CC0-1.0):
 * "PSI-25_Experimental table_BASS-II.csv", saved by the user as
 * public/data/bass2.csv. The app works without it; panels say so.
 *
 * Columns (as shown on the PSI-25 page): PI, Test #, Date, GMT, Sample #,
 * Fuel Sample Material, Flow restrictor, Fan display, Air display,
 * Radiometer gain, Total Frames Shot, Calibrated initial O2 % by vol,
 * Calibrated final O2 % by vol, Initial/Final CO2 % by vol, Initial/Final CO (ppm).
 *
 * Units: Olson & Ferkul (2015) say the video overlay showed the fan voltage
 * (10×V) and the hot-wire anemometer reading in cm/s, so "Air display" is
 * read as cm/s. The table does not record whether a test burned or went out,
 * so these rows show what NASA tested, not outcomes.
 */

export interface Bass2Test {
  pi: string
  test: string
  date: string
  material: string
  /** app material id this row maps to, or null */
  materialId: string | null
  airCmS: number | null
  o2Initial: number | null
  o2Final: number | null
  coFinalPpm: number | null
}

export const BASS2_CSV_URL = `${import.meta.env?.BASE_URL ?? "/"}data/bass2.csv`

/** Split one CSV line, honouring double-quoted fields. */
function splitCsv(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q
    } else if (ch === ',' && !q) { out.push(cur); cur = '' } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const num = (s: string | undefined) => {
  if (s === undefined || s === '') return null
  const v = Number(s.replace(/[^0-9.+-eE]/g, ''))
  return Number.isFinite(v) ? v : null
}

export function mapMaterial(text: string): string | null {
  const t = text.toLowerCase()
  if (t.includes('pmma') || t.includes('acrylic')) return 'pmma'
  if (t.includes('sibal')) return 'sibal'
  if (t.includes('nomex')) return 'nomex'
  if (t.includes('delrin') || t.includes('pom') || t.includes('acetal')) return 'pom'
  if (t.includes('cotton')) return 'cotton'
  if (t.includes('silicone')) return 'silicone'
  return null
}

export function parseBass2(csv: string): Bass2Test[] {
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const head = splitCsv(lines[0]).map((h) => h.toLowerCase())
  const col = (...keys: string[]) => head.findIndex((h) => keys.every((k) => h.includes(k)))
  const iPi = col('pi')
  const iTest = col('test')
  const iDate = col('date')
  const iMat = col('material')
  const iAir = col('air')
  const iO2i = col('initial', 'o2')
  const iO2f = col('final', 'o2')
  const iCo = head.findIndex((h) => h.includes('final') && h.includes('co') && h.includes('ppm'))
  return lines.slice(1).map((l) => {
    const c = splitCsv(l)
    const material = iMat >= 0 ? c[iMat] ?? '' : ''
    const pctToFrac = (v: number | null) => (v === null ? null : v / 100)
    return {
      pi: iPi >= 0 ? c[iPi] ?? '' : '',
      test: iTest >= 0 ? c[iTest] ?? '' : '',
      date: iDate >= 0 ? c[iDate] ?? '' : '',
      material,
      materialId: mapMaterial(material),
      airCmS: iAir >= 0 ? num(c[iAir]) : null,
      o2Initial: pctToFrac(iO2i >= 0 ? num(c[iO2i]) : null),
      o2Final: pctToFrac(iO2f >= 0 ? num(c[iO2f]) : null),
      coFinalPpm: iCo >= 0 ? num(c[iCo]) : null,
    }
  }).filter((r) => r.material)
}

let cache: Promise<Bass2Test[] | null> | null = null
/** Fetch and parse once; resolves null when the file has not been added. */
export function loadBass2(): Promise<Bass2Test[] | null> {
  if (!cache) {
    cache = fetch(BASS2_CSV_URL)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => (t && t.includes(',') && !t.trimStart().startsWith('<') ? parseBass2(t) : null))
      .catch(() => null)
  }
  return cache
}

/**
 * A post-test O2 reading outside 5-45% cannot describe a test in a ventilated
 * ISS glovebox (row B2 in the published table reads 1.6%). Such rows are
 * excluded from summaries and the map, and the count is shown to the user.
 */
export const plausibleO2 = (r: Bass2Test) => r.o2Final !== null && r.o2Final >= 0.05 && r.o2Final <= 0.45

/** Tests of this material, nearest first by (O2, airflow); O2 uses the post-test reading the paper used for limits. */
export function nearestTests(rows: Bass2Test[], materialId: string, xO2: number, flowCmS: number, n = 5) {
  return rows
    .filter((r) => r.materialId === materialId && plausibleO2(r))
    .map((r) => ({
      r,
      d: Math.hypot((xO2 - (r.o2Final ?? 0)) / 0.02, r.airCmS === null ? 0 : (flowCmS - r.airCmS) / 5),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
}
