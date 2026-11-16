import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createFlameMaterial, ironbowRGB } from '../../shaders/flameShader'
import type { EngineState, SpectralMode } from '../../types/combustion'
import { T_AMBIENT } from '../../physics/constants'

/** Scene units: 1 unit = 10 cm. Duct interior spans x [-1.6, 1.6], y and z [-0.55, 0.55]. */
const DUCT = { x: 1.6, y: 0.55, z: 0.55 }
const R_ROD = 0.0635 // 6.35 mm
const X_TIP = -0.35 // upstream tip; rod runs along +x (axial flow, as in BASS-II)
const N_PARTICLES = 1400

interface Props {
  state: EngineState
  flowCmS: number
  mode: SpectralMode
  /** Rod surface temperature, K (cools after extinction) */
  rodT: number
  /** Whether a flame is actually present (ignited and sustainable) */
  lit: boolean
  probe: { x: number; y: number } | null
  onProbe: (xMetres: number, yMetres: number) => void
  /** Gravity fraction (0 for microgravity, 0.16 Moon, 0.38 Mars, 1.0 Earth) */
  gravity?: number
}

const REGIME_LED: Record<string, number> = {
  sooty: 0xf59e0b,
  blue: 0x38bdf8,
  quench: 0x64748b,
  blowoff: 0x64748b,
  nonflammable: 0x10b981,
}

export function DuctViewport3D(p: Props) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef(p)
  live.current = p

  useEffect(() => {
    const el = host.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)) // the raymarched flame is per-pixel; cap the cost on high-DPI screens
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x05070b)
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50)
    camera.position.set(0.35, 0.45, 1.75)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0.0, 0, 0)
    controls.enableDamping = true
    controls.minDistance = 0.8
    controls.maxDistance = 4.5

    // ---- lights ----
    const ambient = new THREE.AmbientLight(0x8899aa, 0.25)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xbfd4ff, 0.6)
    key.position.set(2, 3, 4)
    scene.add(key)
    const flameLight = new THREE.PointLight(0xff9a3c, 0, 4, 1.6)
    flameLight.position.set(0.05, 0, 0)
    scene.add(flameLight)

    // ---- duct ----
    const titanium = new THREE.MeshStandardMaterial({ color: 0x8a919c, metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide })
    const walls = new THREE.Group()
    const wall = (w: number, h: number, pos: [number, number, number], rot: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), titanium)
      m.position.set(...pos)
      m.rotation.set(...rot)
      walls.add(m)
    }
    wall(DUCT.x * 2, DUCT.z * 2, [0, DUCT.y, 0], [Math.PI / 2, 0, 0])
    wall(DUCT.x * 2, DUCT.z * 2, [0, -DUCT.y, 0], [-Math.PI / 2, 0, 0])
    wall(DUCT.x * 2, DUCT.y * 2, [0, 0, -DUCT.z], [0, 0, 0])
    scene.add(walls)

    const ribMat = new THREE.MeshStandardMaterial({ color: 0x5b6270, metalness: 0.9, roughness: 0.3 })
    for (let x = -DUCT.x; x <= DUCT.x + 1e-6; x += 0.4) {
      const t = 0.035
      const add = (sx: number, sy: number, sz: number, px: number, py: number, pz: number) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), ribMat)
        b.position.set(px, py, pz)
        scene.add(b)
      }
      add(t, t, DUCT.z * 2 + t, x, DUCT.y, 0)
      add(t, t, DUCT.z * 2 + t, x, -DUCT.y, 0)
      add(t, DUCT.y * 2 + t, t, x, 0, -DUCT.z)
    }
    // window frame only at the two ends, so the quartz window stays clear
    for (const x of [-DUCT.x, DUCT.x]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, DUCT.y * 2 + 0.035, 0.035), ribMat)
      b.position.set(x, 0, DUCT.z)
      scene.add(b)
    }
    // quartz window
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(DUCT.x * 2, DUCT.y * 2),
      new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.06, roughness: 0.05, metalness: 0, depthWrite: false }),
    )
    glass.position.set(0, 0, DUCT.z)
    scene.add(glass)
    // LED status bars
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    for (const y of [DUCT.y - 0.02, -DUCT.y + 0.02]) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(DUCT.x * 2 - 0.1, 0.012, 0.012), ledMat)
      led.position.set(0, y, -DUCT.z + 0.02)
      scene.add(led)
    }

    // ---- fuel rod (axial, tip facing upstream) and holder ----
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.55, metalness: 0.05, emissive: 0x000000 })
    const rodLen = DUCT.x - X_TIP - 0.05
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(R_ROD, R_ROD, rodLen, 40), rodMat)
    rod.rotation.z = Math.PI / 2
    rod.position.set(X_TIP + rodLen / 2, 0, 0)
    scene.add(rod)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(R_ROD, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), rodMat)
    tip.rotation.z = Math.PI / 2
    tip.position.set(X_TIP, 0, 0)
    scene.add(tip)

    // ---- nichrome hot-wire igniter coil (NASA BASS-II glovebox ignition loop) ----
    const coilMat = new THREE.MeshStandardMaterial({ color: 0xb58a55, metalness: 0.85, roughness: 0.3, emissive: 0x000000 })
    const igniterCoil = new THREE.Mesh(new THREE.TorusGeometry(R_ROD + 0.007, 0.0035, 12, 32), coilMat)
    igniterCoil.rotation.y = Math.PI / 2
    igniterCoil.position.set(X_TIP + 0.025, 0, 0)
    scene.add(igniterCoil)
    const igniterLead = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, DUCT.y - R_ROD, 8), ribMat)
    igniterLead.position.set(X_TIP + 0.025, -(DUCT.y + R_ROD) / 2, 0)
    scene.add(igniterLead)

    for (const x of [DUCT.x - 0.5, DUCT.x - 0.15]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, DUCT.y - R_ROD, 0.03), ribMat)
      post.position.set(x, -(DUCT.y + R_ROD) / 2, 0)
      scene.add(post)
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(R_ROD + 0.012, 0.012, 8, 24), ribMat)
      clamp.rotation.y = Math.PI / 2
      clamp.position.set(x, 0, 0)
      scene.add(clamp)
    }

    // ---- flame volume ----
    const boxMin = new THREE.Vector3(X_TIP - 0.32, -0.3, -0.3)
    const boxMax = new THREE.Vector3(X_TIP + 1.3, 0.3, 0.3)
    const flameMat = createFlameMaterial(boxMin, boxMax)
    const size = boxMax.clone().sub(boxMin)
    const flameBox = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), flameMat)
    flameBox.position.copy(boxMin.clone().add(boxMax).multiplyScalar(0.5))
    flameBox.renderOrder = 2
    scene.add(flameBox)

    // ---- flow particles ----
    const pos = new Float32Array(N_PARTICLES * 3)
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    for (let i = 0; i < N_PARTICLES; i++) {
      pos[i * 3] = rand(-DUCT.x, DUCT.x)
      pos[i * 3 + 1] = rand(-DUCT.y + 0.02, DUCT.y - 0.02)
      pos[i * 3 + 2] = rand(-DUCT.z + 0.02, DUCT.z - 0.02)
    }
    const pgeo = new THREE.BufferGeometry()
    pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const pmat = new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.012, transparent: true, opacity: 0.55, depthWrite: false })
    const points = new THREE.Points(pgeo, pmat)
    scene.add(points)

    // ---- probe plane and marker ----
    const probePlane = new THREE.Mesh(new THREE.PlaneGeometry(DUCT.x * 2, DUCT.y * 2), new THREE.MeshBasicMaterial({ visible: false }))
    scene.add(probePlane)
    const marker = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.026, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }))
    marker.visible = false
    scene.add(marker)
    const raycaster = new THREE.Raycaster()
    let downAt: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY })
    const onUp = (e: PointerEvent) => {
      if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return // a drag orbits, a click probes
      const r = renderer.domElement.getBoundingClientRect()
      const half = live.current.mode === 'compare'
      const cw = half ? r.width / 2 : r.width
      const fx = ((e.clientX - r.left) % cw) / cw
      const ndc = new THREE.Vector2(fx * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      if (half) {
        camera.aspect = cw / Math.max(r.height, 1)
        camera.updateProjectionMatrix()
      }
      raycaster.setFromCamera(ndc, camera)
      const hit = raycaster.intersectObject(probePlane)[0]
      if (hit) live.current.onProbe(hit.point.x / 10, hit.point.y / 10)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    const clock = new THREE.Clock()
    let burnSmooth = 0
    let lastTf = T_AMBIENT
    let raf = 0
    const wallCold = new THREE.Color(...ironbowRGB(0.02))
    const titaniumColour = new THREE.Color(0x8a919c)
    /** Set everything that differs between the eye view (0), thermal (1) and CO zone (2). */
    const applyMode = (modeIdx: number, s: Props, t: number) => {
      flameMat.uniforms.uMode.value = modeIdx
      // flame light: only visible soot and blue chemiluminescence light the duct
      const visibleGlow = burnSmooth * (0.15 + 2.6 * s.state.soot) * (1 + 0.12 * Math.sin(t * 17) * Math.sin(t * 5.3))
      flameLight.intensity = modeIdx === 0 ? visibleGlow : 0
      flameLight.color.setHex(s.state.soot > 0.35 ? 0xff9a3c : 0x4f7dff)
      // walls and rod look different through the thermal camera
      const thermal = modeIdx === 1
      titanium.color.copy(thermal ? wallCold : titaniumColour)
      titanium.metalness = thermal ? 0 : 0.85
      ambient.intensity = thermal ? 0.05 : 0.25
      key.intensity = thermal ? 0.05 : 0.6
      if (thermal) {
        const [r, g, b] = ironbowRGB((s.rodT - 300) / 1200)
        rodMat.emissive.setRGB(r, g, b)
        rodMat.color.setRGB(0, 0, 0)
        coilMat.emissive.setHex(s.lit ? 0xffffff : 0x000000)
      } else {
        rodMat.emissive.setRGB(0, 0, 0)
        rodMat.color.setHex(0x9aa3b2)
        coilMat.emissive.setHex(s.lit ? 0xff4500 : 0x000000)
      }
      pmat.opacity = thermal ? 0.15 : 0.55
    }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.elapsedTime
      const s = live.current
      burnSmooth += ((s.lit ? 1 : 0) - burnSmooth) * Math.min(1, dt * 1.8)

      const u = flameMat.uniforms
      u.uTime.value = t
      if (s.lit) lastTf = s.state.tFlame // keep the last flame temperature while the flame fades out
      u.uFlameT.value = Math.max(lastTf, T_AMBIENT)
      u.uStandoff.value = Math.max(s.state.standoffMm, 4) / 100
      u.uFlowFrac.value = Math.min(s.flowCmS / 40, 1)
      u.uSoot.value = s.state.soot
      u.uBurning.value = burnSmooth
      u.uGravity.value = s.gravity ?? 0
      ledMat.color.setHex(s.lit ? REGIME_LED[s.state.regime] : 0x10b981)

      // particles: uniform axial flow, deflected around the rod's rounded tip
      // (potential flow past a sphere) and kept off the rod surface, plus Brownian drift and buoyancy
      const U = s.flowCmS / 10 // scene units per second
      const buoy = (s.gravity ?? 0) * 0.28
      const R3 = R_ROD ** 3
      for (let i = 0; i < N_PARTICLES; i++) {
        let x = pos[i * 3]
        let y = pos[i * 3 + 1]
        let z = pos[i * 3 + 2]
        const dx = x - X_TIP
        let vx = U
        let vy = buoy
        let vz = 0
        if (dx < 0) {
          // potential flow past a sphere of radius R at the tip:
          // v = U ex + (U R^3 / 2) [ ex / r^3 - 3 dx r_vec / r^5 ]
          const r2 = Math.max(dx * dx + y * y + z * z, 1e-9)
          const r3 = r2 * Math.sqrt(r2)
          const c = (U * R3) / 2
          vx = U + c * (1 / r3 - (3 * dx * dx) / (r3 * r2))
          vy = (-c * 3 * dx * y) / (r3 * r2)
          vz = (-c * 3 * dx * z) / (r3 * r2)
        }
        const jit = 0.02 * Math.sqrt(dt)
        x += vx * dt + (Math.random() - 0.5) * jit
        y += vy * dt + (Math.random() - 0.5) * jit
        z += vz * dt + (Math.random() - 0.5) * jit
        const rr = Math.hypot(y, z)
        if (x > X_TIP && rr < R_ROD * 1.02) {
          const k = (R_ROD * 1.03) / Math.max(rr, 1e-6)
          y *= k
          z *= k
        } else if (x <= X_TIP) {
          const d = Math.hypot(x - X_TIP, y, z)
          if (d < R_ROD * 1.02) {
            const k = (R_ROD * 1.03) / Math.max(d, 1e-6)
            x = X_TIP + (x - X_TIP) * k
            y *= k
            z *= k
          }
        }
        if (x > DUCT.x) x = -DUCT.x
        if (x < -DUCT.x) x = DUCT.x
        y = Math.min(DUCT.y - 0.01, Math.max(-DUCT.y + 0.01, y))
        z = Math.min(DUCT.z - 0.01, Math.max(-DUCT.z + 0.01, z))
        pos[i * 3] = x
        pos[i * 3 + 1] = y
        pos[i * 3 + 2] = z
      }
      pgeo.attributes.position.needsUpdate = true

      if (s.probe) {
        marker.visible = true
        marker.position.set(s.probe.x * 10, s.probe.y * 10, 0.001)
      } else marker.visible = false

      controls.update()
      const w = el.clientWidth
      const h = el.clientHeight
      if (s.mode === 'compare') {
        // left half: what the eye sees; right half: the thermal camera, same instant
        renderer.setScissorTest(true)
        camera.aspect = w / 2 / Math.max(h, 1)
        camera.updateProjectionMatrix()
        for (const [i, m] of [[0, 0], [1, 1]] as const) {
          renderer.setViewport(i * (w / 2), 0, w / 2, h)
          renderer.setScissor(i * (w / 2), 0, w / 2, h)
          applyMode(m, s, t)
          renderer.render(scene, camera)
        }
        renderer.setScissorTest(false)
        renderer.setViewport(0, 0, w, h)
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
      } else {
        applyMode(s.mode === 'visible' ? 0 : s.mode === 'mwir' ? 1 : 2, s, t)
        renderer.render(scene, camera)
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointerup', onUp)
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={host} className="relative w-full h-full min-h-[320px]" aria-label="3D flow duct. Drag to orbit, click to probe." role="img" />
  )
}
