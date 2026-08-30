#!/usr/bin/env node
/**
 * Archive-freeze gate: every file under `.agents/notes/archived/` is sealed.
 * The manifest (`.agents/notes/an-archive-manifest.json`) pins one SHA-256 per
 * archived file; the normal run rejects changed, missing, or unsealed files.
 * `--write` is append-only: it proves every existing seal still matches, then
 * adds hashes for files not yet sealed, then rewrites the manifest.
 * Usage: node gates/archive.js [--root <dir>] [--write]
 */

import { createHash } from 'node:crypto'
import { globSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'

const args = process.argv.slice(2)
const write = args.includes('--write')
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)
const archiveRoot = join(root, '.agents', 'notes', 'archived')
const manifestPath = join(root, '.agents', 'notes', 'an-archive-manifest.json')
const violations = []

/** SHA-256 of one file's bytes, in hex. */
function hashOf(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** All archived FILES as repo-relative slash paths, in sorted order. */
function archivedFiles() {
  return globSync('**/*', { cwd: archiveRoot })
    .map(p => p.split(sep).join('/'))
    .filter(p => statSync(join(archiveRoot, p)).isFile())
    .filter(p => !/^(AGENTS|CLAUDE)\.md$/.test(p)) // instruction files at the archive root are not sealed notes
    .sort()
}

/** Parse the existing manifest, or an empty record. */
function readManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch {
    return {}
  }
}

if (write) {
  const manifest = readManifest()
  const files = archivedFiles()
  const stale = []
  for (const [path, pinned] of Object.entries(manifest)) {
    if (!files.includes(path)) {
      stale.push(`${path} — sealed but missing on disk`)
      continue
    }
    if (pinned !== hashOf(join(archiveRoot, path))) stale.push(`${path} — bytes changed after sealing`)
  }
  if (stale.length > 0) {
    exitWith(stale.map(s => `archive: ${s}`))
    process.exit(1)
  }
  const sealed = Object.keys(manifest).length
  for (const path of files) manifest[path] = hashOf(join(archiveRoot, path))
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`archive: ${files.length} file(s) sealed (${files.length - sealed} newly recorded).\n`)
  process.exit(0)
}

const manifest = readManifest()
const files = archivedFiles()
const seen = new Set()
for (const [path, pinned] of Object.entries(manifest)) {
  seen.add(path)
  if (!files.includes(path)) violations.push(`archive: ${path} — sealed but missing on disk`)
  else if (pinned !== hashOf(join(archiveRoot, path))) violations.push(`archive: ${path} — bytes changed after sealing`)
}
for (const path of files) {
  if (!seen.has(path)) violations.push(`archive: ${path} — not sealed; run the archive gate with --write after archival`)
}
exitWith(violations)
if (violations.length === 0) process.stdout.write(`${summarize('archive', files.length)}\n`)
