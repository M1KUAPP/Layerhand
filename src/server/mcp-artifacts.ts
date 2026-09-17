import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import { zipStore } from './zip-store'

export interface McpArtifacts {
  tarball: Uint8Array
  zip: Uint8Array
  binary: Uint8Array
}

const PKG_ROOT = join(import.meta.dir, '../../packages/layerhand-mcp')
const DIST_FILES = join(import.meta.dir, 'mcp-files')
const TARBALL_NAME = 'layerhand-mcp-0.1.0.tgz'

let cache: Promise<McpArtifacts> | undefined

export function mcpArtifacts(): Promise<McpArtifacts> {
  return (cache ??= loadMcpArtifacts())
}

async function loadMcpArtifacts(): Promise<McpArtifacts> {
  const fromDisk = await readPackedFiles()
  if (fromDisk) return fromDisk
  return packFromSource()
}

async function readPackedFiles(): Promise<McpArtifacts | undefined> {
  const tarball = Bun.file(join(DIST_FILES, 'layerhand-mcp.tgz'))
  const zip = Bun.file(join(DIST_FILES, 'layerhand.zip'))
  const binary = Bun.file(join(DIST_FILES, 'layerhand-mcp.js'))
  if (!(await tarball.exists()) || !(await zip.exists()) || !(await binary.exists())) {
    return undefined
  }
  return {
    tarball: new Uint8Array(await tarball.arrayBuffer()),
    zip: new Uint8Array(await zip.arrayBuffer()),
    binary: new Uint8Array(await binary.arrayBuffer())
  }
}

async function run(command: string[], cwd: string, label: string): Promise<void> {
  const child = Bun.spawn(command, { cwd, stderr: 'pipe', stdout: 'pipe' })
  const exit = await child.exited
  if (exit !== 0) {
    const err = await new Response(child.stderr).text()
    throw new Error(`${label} failed: ${err.trim()}`)
  }
}

async function readPackageFile(relative: string): Promise<Uint8Array> {
  const file = Bun.file(join(PKG_ROOT, relative))
  if (!(await file.exists())) throw new Error(`Missing ${relative} in layerhand-mcp`)
  return new Uint8Array(await file.arrayBuffer())
}

export async function packFromSource(): Promise<McpArtifacts> {
  const binaryPath = join(PKG_ROOT, 'dist/layerhand-mcp.js')
  if (!(await Bun.file(binaryPath).exists())) {
    await run(['bun', 'install', '--frozen-lockfile'], PKG_ROOT, 'layerhand-mcp install')
    await run(['bun', 'run', 'build'], PKG_ROOT, 'layerhand-mcp build')
  }

  const binary = new Uint8Array(await Bun.file(binaryPath).arrayBuffer())
  await run(['bun', 'pm', 'pack'], PKG_ROOT, 'layerhand-mcp pack')
  const tarballPath = join(PKG_ROOT, TARBALL_NAME)
  const tarball = new Uint8Array(await Bun.file(tarballPath).arrayBuffer())
  await rm(tarballPath, { force: true })

  const zip = zipStore([
    { name: 'dist/layerhand-mcp.js', data: binary },
    { name: '.claude-plugin/plugin.json', data: await readPackageFile('.claude-plugin/plugin.json') },
    { name: '.mcp.json', data: await readPackageFile('.mcp.json') },
    { name: 'plugin.json', data: await readPackageFile('plugin.json') },
    { name: 'mcp.json', data: await readPackageFile('mcp.json') },
    { name: 'package.json', data: await readPackageFile('package.json') },
    { name: 'README.md', data: await readPackageFile('README.md') },
    { name: 'skills/layerhand/SKILL.md', data: await readPackageFile('skills/layerhand/SKILL.md') }
  ])

  return { tarball, zip, binary }
}
