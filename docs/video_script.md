# 30-second demo video

Every on-screen state below was checked against the current model (`npm run check-physics` plus a direct evaluation on 2026-11-15). If the model is re-calibrated, re-check the states before recording.

Screen: the app at 1280×800 or larger. Open `/` (it starts with PMMA in ISS air at 1.5 cm/s, burning, in the side-by-side **Eye vs thermal** view).

| Time | On screen | Caption / voice-over |
|---|---|---|
| 0–3 s | Title card | "[Team name], [Local event]. Flame in Freefall." (The submission guide asks for names and event.) |
| 3–10 s | Default view. Left half: the rod looks almost dark. Right half: a bright thermal glow at the tip. | "This plastic rod is burning, in ISS air with a gentle fan. Your eyes barely see it. A thermal camera does." |
| 10–17 s | Drag the **Oxygen fraction** slider to 17%. Then drag the airflow lever to 0. Header changes to "Out: too little flow (radiative quench)"; the cool-down panel starts counting. | "In orbit nothing rises, so the fan is the flame's only air. Turn it off and, at 17% oxygen, it starves. The rod stays hot for minutes." |
| 17–23 s | Point at the map: the green line "ISS flight: PMMA burned at 13.6%" below the dashed 1 g line. | "NASA's BASS-II burned these rods on the station down to 13.6% oxygen, below the 17.3% the ground test allows. Our model is calibrated to that." |
| 23–30 s | Click **Exploration atmosphere**, then **Nomex**. It burns; the evidence panel shows the amber "no flight data covers this cabin" warning. | "In the 34% oxygen planned for Artemis-era cabins, even Nomex can burn, and no flight data covers that yet. That is the gap PYRO-CORE shows." |

## Words to avoid

- "Invisible": the model makes the flame dim, not invisible. Say "barely see".
- "Validated" or "predicts": only one NASA number is calibrated. Say "calibrated to".
- "Turning off the fan puts the fire out": false at 21% O₂ in this model (PMMA keeps burning dimly at zero flow). It holds at about 17% O₂ and below, which is why the video lowers the oxygen first.
- "Flight rule", "certified", "NASA-approved", "AI-powered": none is true.
- Any temperature or hold time to the second: read them off the screen on recording day and round them.
