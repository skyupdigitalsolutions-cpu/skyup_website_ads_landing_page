# SkyUp — Energy Core

A single-page hero experience built around one animated 3D "energy core," told in two acts:

**Act 1 — The pitch.** As you scroll, the core charges and the camera orbits it while
six sections build one continuous argument: *your business deserves something different
→ great sites make people explore → every scroll tells your story → turn attention into
interest → a site that matches your growth (₹50,000–₹3,00,000) → imagine it built for you.*

**Act 2 — Inside the core.** The camera flies *into* the glowing centre through a
light-burst, the world turns warm, the final line lands, and the story ends with the
**enquiry form inline** (budget · timeline · name · business · phone), plus a
**bottom-right "Plan my website" button** that glides you straight to it from anywhere.

Scroll is eased in the render loop for a smooth feel (no native-scroll hijack). Built
with three.js + WebGL, tuned to stay smooth on mid-range mobile.

## Run it

```bash
npm install
npm run dev        # local dev
npm run build      # -> dist/  (deploy this)
npm run preview    # serve the built dist/
```

Deploy `dist/` to any static host. Build command `npm run build`, publish dir `dist`.

## BEFORE GOING LIVE — 2 things (both in `src/main.js`)

1. **WhatsApp number** — replace `91XXXXXXXXXX` with the SkyUp WhatsApp Business number
   (country code + number, no `+`/spaces, e.g. `919812345678`).
2. **CRM webhook** — there's a `// TODO: POST ... to CRM webhook` in the submit handler.
   Drop your existing `CRM_WEBHOOK_URL` fetch there so enquiries land in the CRM.

## Why it's fast (and how it stays that way)

The model you supplied was **1,006 meshes / 4.4 MB** — that's ~1,000 draw calls, which
is what actually chokes phones (far more than polygon count). It was baked down to:

- **4 meshes (~4 draw calls)** via mesh-merge, and
- **189 KB** via Draco compression (from 4.4 MB), with **no textures**.

On top of that the runtime keeps it light: capped pixel ratio (1.5 on touch devices),
just 3 lights, **no post-processing** — the "glow" is a cheap additive halo sprite +
the model's own emissive material, not an expensive bloom pass.

Runtime payload is three.js (~146 KB gzip) + the core (189 KB) + Draco decoder
(~250 KB, fetched once and cached).

## Swapping / re-baking the 3D model

Always run any new model through the optimizer before shipping it:

```bash
npm i -D @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf
node tools/optimize-glb.mjs path/to/new-model.glb public/cube_energy_core.glb
```

Then check it frames well and retune the camera (see below). The loader auto-recenters
the model to the origin, so off-center exports are fine. It picks the brightest
emissive material(s) as "the core" and animates their colour/intensity — if a new model
doesn't glow, give its core material some emissive in the source (Blender: Emission
strength) so the power-up has something to light up.

> The uploaded `Cube_Energy_Core.usdz` is the iOS-AR version of the same asset and
> isn't used on the web — the GLB is the web format. Keep the USDZ if you ever want an
> "View in AR" button on iPhone.

## Tuning (all in `src/main.js` unless noted)

- **Story camera + core states** — the `KF` keyframe array (10 rows). Each: `p` (scroll
  progress 0–1), `r` (camera distance — small `r` around `p≈0.65` is the fly-*into*-the-core
  moment), `a` (orbit angle), `y` (height), `ci` (core emissive intensity), `col` (colour).
  Drives the whole flight path and the blue→amber→warm journey.
- **Story length / pace** — `#spacer{height:600vh}` in `src/style.css`. Taller = slower.
- **Scroll smoothing** — the `0.09` lerp factor in the render loop (`pCur += (target-pCur)*0.09`).
  Higher = snappier/tighter to scroll, lower = floatier.
- **Where each beat/copy appears** — the `bounds` array (6 thresholds → 7 beats: hero,
  4 services, Act 2, form).
- **The light-burst** — the `flash` opacity window inside `ui()` (currently ramps
  `0.58→0.65`, fades by `0.73`). Move it if you retime the zoom-in.
- **Warm interior** — the `a2` factor + `VOID`/`WARM`/`STAR_*` colours (Act 2 environment).
- **Bottom-right button** — `#fab`; shown while `p` is `0.05–0.82`, and it smooth-scrolls
  to the finale form. Copy/behaviour in the `fab` handler in `main.js`.
- **Copy** — edit the `.beat` blocks directly in `index.html` (the finale `#bForm` holds
  the inline enquiry form).
- **Spin / pulse** — `speed` and `pulse` in the render loop.
- **Performance dial** — the `setPixelRatio(...)` cap. Lower it (e.g. `1.25`) for more
  headroom on very cheap devices.

## Accessibility

Respects `prefers-reduced-motion`: the core stops auto-spinning and the pulse is
disabled; the story still advances on scroll. Keyboard focus is visible; the enquiry
form is fully operable.

## Model licence

If the core model came from a marketplace (e.g. Sketchfab), check its licence — most
free ones are CC-Attribution and need a credit line (footer or code comment). If you
generated it (Meshy/Luma/Spline/etc.), you're clear.

## Brand

Palette + type tokens live at the top of `src/style.css` (blue `#0037CA`/`#2E6BFF`,
amber `#FA9F43`, core cyan `#38F5E4`; Space Grotesk + Poppins + Geist Mono).
