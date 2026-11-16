/*
 * Prints the model's flammability limits and checks the BASS-II calibration.
 * Exits non-zero if PMMA's lowest limit at ISS pressure drifts from the
 * flight value it was fitted to.
 */
import { classify, cooling, limitO2, minimumLimit, spaldingB } from '../src/physics/combustionEngine'
import { MATERIALS, materialById } from '../src/physics/materialDatabase'
import { ATMOSPHERES, BASS2_PMMA_MIN_O2, P_REF_KPA } from '../src/physics/constants'

const pmmaMin = minimumLimit(materialById('pmma'), P_REF_KPA)
console.log(`PMMA lowest limit at ISS pressure: ${(pmmaMin.x * 100).toFixed(2)}% at ${pmmaMin.uCmS} cm/s (BASS-II flight minimum ${BASS2_PMMA_MIN_O2 * 100}%)`)

for (const m of MATERIALS) {
  console.log(`\n== ${m.name}  LOI ${(m.loi.value * 100).toFixed(1)}%  B(air) ${spaldingB(m, 0.21).toFixed(2)}`)
  console.log('limit O2 % vs flow cm/s @101 kPa:', [0, 0.5, 1, 2, 5, 10, 20, 40].map((u) => `${u}:${(limitO2(m, u / 100, 101.325) * 100).toFixed(1)}`).join('  '))
  for (const a of ATMOSPHERES) {
    const mn = minimumLimit(m, a.pressureKPa)
    const regs = [0, 1, 2, 5, 10, 20, 40].map((u) => `${u}:${classify(m, u / 100, a.pressureKPa, a.xO2)}`)
    console.log(`  ${a.id.padEnd(7)} min ${(mn.x * 100).toFixed(1)}% @${mn.uCmS} | ${regs.join(' ')}`)
  }
  const c = cooling(m, 0, 101.3, 400)
  console.log(`  cooling ${m.pyrolysisT.value}K -> 400K at 0 cm/s: ${c.holdTime}s (Bi ${c.biot.toFixed(2)})`)
}

if (Math.abs(pmmaMin.x - BASS2_PMMA_MIN_O2) > 0.002) {
  console.error(`\nFAIL: PMMA minimum ${(pmmaMin.x * 100).toFixed(2)}% is not within 0.2 pt of the BASS-II value. Refit U_ANCHOR.`)
  ;(globalThis as unknown as { process: { exit(c: number): never } }).process.exit(1)
}
console.log('\nPASS: calibration matches BASS-II within 0.2 pt')
