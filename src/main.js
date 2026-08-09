import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

const BASE = import.meta.env.BASE_URL
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
const coarse = matchMedia('(pointer:coarse)').matches
const stage = document.getElementById('stage')

/* ---------- renderer / scene / camera ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
renderer.outputColorSpace = THREE.SRGBColorSpace
stage.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x05060A)
scene.fog = new THREE.FogExp2(0x05060A, 0.012)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400)
camera.position.set(0, 7, 48)

const core = new THREE.Group()       // holds the model; we spin this
scene.add(core)

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x223055, 0.9))
const key = new THREE.DirectionalLight(0x9fb8ff, 1.1); key.position.set(6, 10, 8); scene.add(key)
const rim = new THREE.DirectionalLight(0xffb066, 0.8); rim.position.set(-8, -4, -6); scene.add(rim)
const corePoint = new THREE.PointLight(0x2E6BFF, 0, 120); scene.add(corePoint)

/* ---------- starfield (cheap Points) ---------- */
let starPoints = null
;(() => {
  const N = 520, pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const r = 90 + Math.random() * 160
    const t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
    pos[i * 3] = r * Math.sin(ph) * Math.cos(t)
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t)
    pos[i * 3 + 2] = r * Math.cos(ph)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const m = new THREE.PointsMaterial({ color: 0x8FB0FF, size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })
  const stars = new THREE.Points(g, m)
  stars.name = 'stars'
  scene.add(stars)
  starPoints = stars
})()

/* ---------- additive glow halo (fake bloom, mobile-cheap) ---------- */
function glowTexture () {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const x = c.getContext('2d')
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.25, 'rgba(160,200,255,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = g; x.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x2E6BFF, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }))
halo.scale.setScalar(46)
scene.add(halo)

/* ---------- load the core model (Draco) ---------- */
const coreMats = []          // emissive materials we animate
let loaded = false
const draco = new DRACOLoader().setDecoderPath(`${BASE}draco/`)
const loader = new GLTFLoader().setDRACOLoader(draco)
loader.load(`${BASE}cube_energy_core.glb`, (gltf) => {
  const model = gltf.scene
  // recenter to origin
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)
  model.traverse((o) => {
    if (!o.isMesh) return
    o.frustumCulled = true
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (m && m.emissive && (m.emissiveIntensity || 0) >= 5) {
        m.toneMapped = false          // let the core read as pure light
        coreMats.push(m)
      }
    }
  })
  core.add(model)
  loaded = true
  document.body.dataset.ready = '1'
}, undefined, (err) => console.error('GLB load failed', err))

/* ---------- story keyframes (camera + core) ---------- */
const KF = [
  { p: 0.00, r: 42, a: -0.60, y: 6, ci: 0.55, col: 0x2E6BFF },  // hero — dormant
  { p: 0.12, r: 40, a: -0.20, y: 3, ci: 0.85, col: 0x2E6BFF },  // 01 messaging
  { p: 0.26, r: 35, a: 0.35, y: -2, ci: 1.25, col: 0x2E6BFF },  // 02 acquisition
  { p: 0.38, r: 32, a: 1.05, y: 4, ci: 1.55, col: 0x38F5E4 },   // 03 visibility
  { p: 0.50, r: 27, a: 1.85, y: 0, ci: 2.10, col: 0xFA9F43 },   // 04 intelligence
  { p: 0.58, r: 20, a: 2.30, y: 0, ci: 2.60, col: 0xFA9F43 },   // approach the core
  { p: 0.65, r: 4, a: 2.75, y: 0, ci: 4.00, col: 0xFFD9A0 },    // INTO the yellow core (burst)
  { p: 0.74, r: 12, a: 3.20, y: 1, ci: 2.30, col: 0xFFB661 },   // inside — pull back (Act 2)
  { p: 0.88, r: 17, a: 3.70, y: 0, ci: 1.90, col: 0xFFB661 },   // Act 2 settle
  { p: 1.00, r: 20, a: 4.00, y: 0, ci: 1.70, col: 0xFFC98A }    // finale — form, calm
]
const cA = new THREE.Color(), cB = new THREE.Color(), cCur = new THREE.Color()
function sample (p) {
  let i = 0; while (i < KF.length - 2 && p > KF[i + 1].p) i++
  const a = KF[i], b = KF[i + 1]
  const t = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1)
  const e = t * t * (3 - 2 * t)             // smoothstep
  cA.setHex(a.col); cB.setHex(b.col); cCur.copy(cA).lerp(cB, e)
  return {
    r: a.r + (b.r - a.r) * e,
    ang: a.a + (b.a - a.a) * e,
    y: a.y + (b.y - a.y) * e,
    ci: a.ci + (b.ci - a.ci) * e,
    col: cCur
  }
}

/* ---------- beats / HUD ---------- */
const beats = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'bForm'].map(id => document.getElementById(id))
const SYS = ['ENTER', 'EXPLORE', 'STORY', 'INTEREST', 'PREMIUM', 'IMAGINE', 'READY']
const bounds = [0.10, 0.24, 0.36, 0.48, 0.60, 0.84]   // -> 7 zones
const fill = document.getElementById('fill'), pct = document.getElementById('pct'), sys = document.getElementById('sys'), cue = document.getElementById('cue')
const flash = document.getElementById('flash'), fab = document.getElementById('fab')
let lastIdx = -1, lastPct = -1
function zone (p) { let i = 0; while (i < bounds.length && p >= bounds[i]) i++; return i }
function ui (p) {
  const idx = zone(p)
  if (idx !== lastIdx) {
    beats.forEach((b, k) => b.classList.toggle('on', k === idx))
    if (sys) sys.textContent = SYS[idx]
    lastIdx = idx
  }
  const pc = Math.round(p * 100)
  if (pc !== lastPct) { pct.textContent = pc + '%'; fill.style.width = pc + '%'; lastPct = pc }
  cue.style.opacity = p > 0.02 ? 0 : 1
  // light-burst as we fly into the core
  let fl = 0
  if (p > 0.58 && p <= 0.65) fl = (p - 0.58) / 0.07
  else if (p > 0.65 && p < 0.73) fl = 1 - (p - 0.65) / 0.08
  flash.style.opacity = fl
  // bottom-right action: present through the journey, gone once the form is here
  fab.classList.toggle('show', p > 0.05 && p < 0.82)
}

// interior (Act 2) environment colours
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x) }
const VOID = new THREE.Color(0x05060A), WARM = new THREE.Color(0x140b04)
const STAR_COOL = new THREE.Color(0x8FB0FF), STAR_WARM = new THREE.Color(0xFFC27A)
const bgTmp = new THREE.Color(), starTmp = new THREE.Color()

/* ---------- scroll progress ---------- */
const scroller = document.getElementById('spacer')
function progress () {
  const max = scroller.offsetHeight - innerHeight
  return THREE.MathUtils.clamp(window.scrollY / (max || 1), 0, 1)
}

/* ---------- pointer / gyro tilt ---------- */
let tX = 0, tY = 0, rx = 0, ry = 0
if (!reduce) {
  addEventListener('mousemove', e => { tY = (e.clientX / innerWidth - 0.5) * 0.4; tX = (e.clientY / innerHeight - 0.5) * 0.3 })
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return
    tY = THREE.MathUtils.clamp(e.gamma / 90, -1, 1) * 0.4
    tX = THREE.MathUtils.clamp((e.beta - 40) / 90, -1, 1) * 0.3
  })
}

/* ---------- render loop ---------- */
const clock = new THREE.Clock()
let spin = 0, pCur = 0
function tick () {
  const dt = Math.min(clock.getDelta(), 0.05)
  // smoothed scroll progress -> buttery motion without hijacking native scroll
  pCur += (progress() - pCur) * (reduce ? 1 : 0.09)
  const p = pCur
  const s = sample(p)

  // camera on an orbit that pushes inward, then opens back up inside the core
  camera.position.set(Math.cos(s.ang) * s.r, s.y, Math.sin(s.ang) * s.r)
  camera.lookAt(0, 0, 0)

  // core spin accelerates with power
  const speed = reduce ? 0 : 0.15 + p * 0.9
  spin += dt * speed
  rx += (tX - rx) * 0.05; ry += (tY - ry) * 0.05
  core.rotation.set(rx, spin + ry, 0)

  // energise the emissive core (+ gentle pulse)
  const pulse = reduce ? 1 : 1 + Math.sin(clock.elapsedTime * 2.2) * 0.12
  const inten = s.ci * pulse
  for (const m of coreMats) { m.emissive.copy(s.col); m.emissiveIntensity = inten }
  corePoint.color.copy(s.col); corePoint.intensity = inten * 2.2
  halo.material.color.copy(s.col)
  halo.material.opacity = 0.28 + s.ci * 0.14
  halo.scale.setScalar(38 + p * 14)

  // Act 2 — warm interior once we've entered the core
  const a2 = smooth((p - 0.60) / 0.14)
  bgTmp.copy(VOID).lerp(WARM, a2)
  scene.background.copy(bgTmp); scene.fog.color.copy(bgTmp)
  scene.fog.density = 0.012 + a2 * 0.007
  if (starPoints) {
    starPoints.material.color.copy(starTmp.copy(STAR_COOL).lerp(STAR_WARM, a2))
    starPoints.rotation.y += dt * (0.01 + a2 * 0.03)
  }

  ui(p)
  renderer.render(scene, camera)
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/* ---------- enquiry form (inline finale) ---------- */
// Backend API base. Leave '' if the API is same-origin; set to your Railway URL
// when the backend is deployed separately, e.g. 'https://skyup-leads-backend-production.up.railway.app'
const API_BASE = 'https://skyupwebsitelandingpageadsbackend-production.up.railway.app'

const f1 = document.getElementById('fstep1'), f2 = document.getElementById('fstep2'), ft = document.getElementById('fthanks')
document.getElementById('toStep2').onclick = () => {
  const budget = document.getElementById('f-budget').value
  const timeline = document.getElementById('f-timeline').value
  if (!budget || !timeline) { alert('Please choose a budget and a timeline so we can plan the right approach.'); return }
  f1.style.display = 'none'; f2.style.display = 'block'
}
document.getElementById('backStep1').onclick = () => { f2.style.display = 'none'; f1.style.display = 'block' }
document.getElementById('submitForm').onclick = async () => {
  const name = document.getElementById('f-name').value.trim()
  const business = document.getElementById('f-business').value.trim()
  const phone = document.getElementById('f-phone').value.trim()
  if (!name || !phone) { alert('Please add your name and phone/WhatsApp number so we can reach you.'); return }
  const budget = document.getElementById('f-budget').value
  const timeline = document.getElementById('f-timeline').value
  const hp = (document.getElementById('f-hp') || {}).value || ''

  const btn = document.getElementById('submitForm')
  const label = btn.textContent
  btn.disabled = true; btn.textContent = 'Sending…'

  // WhatsApp fallback (also a backup capture path if the API ever fails)
  const msg = encodeURIComponent(
    `Hi SkyUp, I'd like an interactive website for my business.\n` +
    `Name: ${name}\nBusiness: ${business || '—'}\nBudget: ${budget}\nStart: ${timeline}`
  )
  document.getElementById('waBtn').href = `https://wa.me/918867867775?text=${msg}`

  try {
    await fetch(API_BASE + '/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, business, phone, budget, timeline, source: 'ads-landing', company_website: hp })
    })
  } catch (_) { /* still show thanks — WhatsApp link is the backup */ }

  btn.disabled = false; btn.textContent = label
  f2.style.display = 'none'; ft.style.display = 'block'
}

/* ---------- bottom-right action: glide straight to the form ---------- */
fab.addEventListener('click', () => {
  window.scrollTo({ top: document.body.scrollHeight - innerHeight, behavior: 'smooth' })
  setTimeout(() => { const el = document.getElementById('f-budget'); if (el) el.focus({ preventScroll: true }) }, 850)
})
