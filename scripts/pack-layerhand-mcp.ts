import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { packFromSource } from '../src/server/mcp-artifacts'

const outdir = join(import.meta.dir, '../dist/mcp-files')
const artifacts = await packFromSource()
await mkdir(outdir, { recursive: true })
await Bun.write(join(outdir, 'layerhand-mcp.tgz'), artifacts.tarball)
await Bun.write(join(outdir, 'layerhand.zip'), artifacts.zip)
await Bun.write(join(outdir, 'layerhand-mcp.js'), artifacts.binary)
