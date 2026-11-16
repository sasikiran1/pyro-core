# PYRO-CORE

**Will this material burn in this spacecraft cabin?** PYRO-CORE puts NASA's microgravity flame data next to a small physics model that reads between the data points. Pick a cabin atmosphere, a material and the fan airflow. You see whether a flame can survive, how bright it looks to the eye compared with a thermal camera, which NASA investigations are closest to your case, and whether the answer is backed by flight data or is extrapolation.

Built for the NASA Space Apps Challenge 2026, *Flame in Freefall*.

```
npm install
npm run dev            # http://localhost:5173
npm run check-physics  # prints limits for every material and cabin; fails if the BASS-II calibration drifts
```

Shareable views: `/?flow=1.5` (default: a dim, nearly invisible flame), `/?flow=1.5&mode=mwir` (the same flame in thermal), `/?atm=eaa&mat=nomex&flow=10` (Nomex burning in the exploration atmosphere).

## NASA data used

| Source | What the app uses |
|---|---|
| **BASS-II**, PSI-25, NASA Physical Sciences Informatics, [doi:10.60555/4qc4-de67](https://doi.org/10.60555/4qc4-de67), CC0-1.0 | Rod geometry and flow range (rods of 0.32–0.64 cm radius in axial flow, fan up to 40 cm/s, O₂ about 14–21% at ISS pressure). Shown on the map as the "BASS-II flight range". |
| Olson & Ferkul, *Microgravity Flammability of PMMA Rods in Concurrent Flow*, 9th US National Combustion Meeting, 2015, [NTRS 20150008961](https://ntrs.nasa.gov/citations/20150008961) | The calibration value: PMMA rods held a stable flame down to **13.6% O₂** on the ISS. Also the stretch-rate Damköhler form and a = 3/2·U/R used in the model. |
| **BASS**, PSI-26, [doi:10.60555/58h4-dy80](https://doi.org/10.60555/58h4-dy80), CC0-1.0 | Evidence panel: fuels (SIBAL, Nomex, Ultem, PMMA), duct size, flow range. |
| NASA Glenn [Combustion Science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/) page | One-line descriptions of SoFIE, FLARE, FM2, FLEX and SAME in the evidence panel. |

The individual BASS-II limit points (Figure 4 of the paper) are not plotted: they did not extract reliably from the PDF and were not typed in by hand. Only values stated in the paper's text are used.

## What the model does

| Piece | Relation |
|---|---|
| Geometry | Rod of 0.635 cm radius burning at its rounded upstream tip in axial flow, as in BASS-II. Stretch rate a = 3/2·U/R (Olson & Ferkul). |
| Flame temperature | Heat release per kg of O₂ is nearly fuel-independent (Huggett 1980, 13.1 MJ/kg O₂). The flame temperature therefore depends on oxygen, pressure and flow, not on the material. |
| Radiative loss | Radiation number R = ε σ (T_f⁴ − T∞⁴) / (ρ c_p U (T_ad − T∞)); flame temperature is the fixed point T_f = T_ad − (T_ad − T∞) R/(1+R). |
| Chemistry | Da = B ρ Y_O₂ exp(−E/RT_f) / a, which scales with pressure through ρ. The flame needs Da ≥ 1. |
| Calibration | One fitted constant makes PMMA's lowest limiting O₂ at ISS pressure equal 13.6%. Each other material is tied to its normal-gravity oxygen index the same way. |
| Burning rate | Spalding B number with a Ranz–Marshall heat-transfer coefficient at the tip. |
| Cool-down | Lumped-capacitance cooling by convection plus radiation, starting at the pyrolysis temperature. |

## Limitations

- **One calibration point.** Only PMMA's minimum at ISS pressure is fitted to flight data. The low-flow and high-flow branches of the boundary are set by two assumed constants (`EPS_FLAME`, `U_DIFFUSION`). POM, Nomex and SIBAL have no microgravity calibration: they carry PMMA's relation between the normal-gravity and microgravity limits by assumption.
- **Exploration atmospheres are extrapolation.** BASS-II flew at ISS pressure and 21% O₂ or less. Every result at 56.5 kPa / 34% O₂ is outside the flight data, and the app says so on screen.
- **Material properties are approximate handbook values or estimates** (marked "lit." or "est." in the app). Verify them before any engineering use.
- **The 3D flame and the probe field are an analytic shape**, not a CFD solution. The soot/brightness threshold is illustrative.
- **Cool-down times are conservative and approximate** (Biot number 0.2–0.5, above the 0.1 where the lumped model is accurate), so they are shown rounded to half a minute.
- **SIBAL is a thin fabric**; treating it as a rod makes its results qualitative.

## What the original brief asked for and why it is not here

- **Cool-flame regime on a solid rod.** Microgravity cool flames have been seen for liquid droplets (FLEX), not for solid polymers.
- **LOC(P) = LOC_ref · (101.325/P)^0.65.** No source was given; pressure enters through the Damköhler and radiation numbers instead.
- **Surge overpressure ΔP = P₀ · V·ΔH / (c_v·m·T₀).** Not dimensionless as written.
- **"Certified NASA-STD-6001B assessment" and "official JSC flight rule amendment".** A model cannot certify a material (6001B Test 1 is a physical test). The app exports a plainly labelled *model screening summary* and a CSV flow sweep instead.

## Use of AI

The application code, the physics implementation and this README were written with an AI coding assistant (Claude, by Anthropic), directed and reviewed by the team. The AI was also used to locate and read the NASA sources listed above. Every NASA number in the app was checked against the cited page or paper; nothing was generated as data. At runtime the app's briefing and rankings are fixed rules (`src/physics/siInterpreter.ts`), not AI. There is one optional AI feature: **AI summary** in the Evidence briefing card. If the user enters their own API key and model for an OpenAI-compatible endpoint (OpenAI, or Gemini's OpenAI-compatible URL), the app sends the briefing's fact list (no other data) and asks for a 3-sentence summary. The reply is shown labelled as AI-written, and it is rejected automatically if it contains any number not in the fact list. Without a key, nothing is sent and the rule-based briefing is the summary. The key stays in the browser tab's memory and goes only to the endpoint entered.

## References

1. Olson, S. L., Ferkul, P. V. *Microgravity Flammability of PMMA Rods in Concurrent Flow.* 9th US National Combustion Meeting, 2015. NTRS 20150008961.
2. Olson, S. L., Ferkul, P. V. *Microgravity flammability boundary for PMMA rods in axial stagnation flow: Experimental results and energy balance analyses.* Combustion and Flame 180 (2017). doi:10.1016/j.combustflame.2017.03.001.
3. NASA PSI-25, Burning and Suppression of Solids II (BASS-II). doi:10.60555/4qc4-de67.
4. NASA PSI-26, Burning and Suppression of Solids (BASS). doi:10.60555/58h4-dy80.
5. Huggett, C. *Estimation of rate of heat release by means of oxygen consumption measurements.* Fire and Materials 4 (1980) 61–65.
6. T'ien, J. S. *Diffusion flame extinction at small stretch rates: the mechanism of radiative loss.* Combustion and Flame 65 (1986) 31–34.
7. Ranz, W. E., Marshall, W. R. *Evaporation from drops.* Chemical Engineering Progress 48 (1952).
8. Spalding, D. B. *Some Fundamentals of Combustion.* Butterworths, 1955 (mass-transfer number B).
9. NASA-STD-6001B, *Flammability, Offgassing, and Compatibility Requirements and Test Procedures*, 2011.

## Software and assets

React (MIT), Three.js (MIT), Recharts (MIT), Tailwind CSS (MIT), Lucide icons (ISC), clsx (MIT), tailwind-merge (MIT), Vite (MIT), TypeScript (Apache-2.0). Fonts: Inter and JetBrains Mono via Google Fonts (SIL Open Font License). The simplex-noise GLSL is by Ashima Arts / Stefan Gustavson (MIT). No NASA logos or insignia are used.

## Layout

| Path | Contents |
|---|---|
| `src/physics/` | Constants (including the BASS-II calibration values), material table, combustion engine |
| `src/data/nasaEvidence.ts` | NASA investigations with sources, and the relevance-ranking rule |
| `src/data/nasaInvestigations.ts` | Measured BASS-II flight findings (text statements from Olson & Ferkul 2015) |
| `src/physics/siInterpreter.ts` | Ranks flight findings by distance to the current cabin; rule-based briefing and risk level |
| `src/shaders/flameShader.ts` | Raymarched flame volume: visible, thermal (ironbow) and CO-zone views |
| `src/components/viewport/` | Three.js duct, spectral toolbar, click probe |
| `src/components/analytics/` | Result card, flammability map with BASS-II overlay, evidence panel, cool-down chart |
| `src/components/controls/` | Atmosphere, damper lever and igniter, material table |
| `src/components/export/` | Screening summary and text export |
| `scripts/checkPhysics.ts` | Prints limits per material and cabin; exits non-zero if the calibration drifts |

## Licence

MIT, see `LICENSE`. Not a NASA product or document.
