import { mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"

import { parseFacilityPointCloudNpy } from "../lib/facility-point-cloud/load-npy"
import { buildGlassStructureMeshes } from "../lib/facility-mesh/build-glass-structure"

const dataId = process.argv[2] ?? "1"
const npyPath = path.join(process.cwd(), "app", "api", `data${dataId}.npy`)
const outDir = path.join(process.cwd(), "app", "api", "glass-mesh")
const outPath = path.join(outDir, `data${dataId}.json`)

const buf = readFileSync(npyPath)
const cloud = parseFacilityPointCloudNpy(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
  meta: { fileName: `data${dataId}.npy` },
})

console.log(`Building glass meshes from ${npyPath} (${cloud.pointCount.toLocaleString()} points)…`)
const doc = buildGlassStructureMeshes(cloud, dataId)

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(doc), "utf8")
console.log(`Wrote ${outPath} (${doc.meshes.length} panels)`)
