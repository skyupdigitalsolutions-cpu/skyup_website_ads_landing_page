// Optimize a GLB for the web: merge meshes (fewer draw calls) + Draco compress.
// This is what took the original core from 1006 meshes / 4.4 MB -> 4 meshes / 189 KB.
//
// Usage:
//   npm i -D @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf
//   node tools/optimize-glb.mjs input.glb public/cube_energy_core.glb
//
import { NodeIO } from '@gltf-transform/core'
import { KHRONOS_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { dedup, flatten, join, weld, prune } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'

const [, , inPath, outPath = 'public/cube_energy_core.glb'] = process.argv
if (!inPath) { console.error('Usage: node tools/optimize-glb.mjs <input.glb> [output.glb]'); process.exit(1) }

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})

const doc = await io.read(inPath)
const beforeMeshes = doc.getRoot().listMeshes().length

await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld(), prune())

doc.createExtension(KHRDracoMeshCompression).setRequired(true)
  .setEncoderOptions({ method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER })

await io.write(outPath, doc)
console.log(`meshes ${beforeMeshes} -> ${doc.getRoot().listMeshes().length}  ->  ${outPath}`)
