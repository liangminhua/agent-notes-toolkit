#!/usr/bin/env node
/**
 * Self-containment sync for @liangminhua/dsh-an: copy the engine, gates, and
 * scaffold templates from the toolkit package into the bundle's `vendor/`
 * tree so the published bundle resolves every runtime module from its own
 * files — no file: link to the toolkit package. The vendored layout mirrors
 * the toolkit's own layout (`lib/`, `gates/`, `scaffold/.agents/…`), so the
 * byte-identical modules resolve their relative imports unchanged; a
 * generated `vendor/package.json` shim carries the toolkit version the
 * vendored `init.js` reads. Rerun after changing any source; the drift-guard
 * test (tests/vendor-sync.test.js) fails when the committed copies differ
 * from the sources, so the two cannot drift.
 * @module scripts/sync-vendor
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEST = join(ROOT, 'dsh-an', 'vendor')

/** Toolkit files the bundle vendors, as [source, destination] pairs. */
export const MANIFEST = [
  ['lib/engine.js', 'lib/engine.js'],
  ['lib/root.js', 'lib/root.js'],
  ['lib/tree.js', 'lib/tree.js'],
  ['lib/init.js', 'lib/init.js'],
  ['lib/report.js', 'lib/report.js'],
  ['lib/markdown.js', 'lib/markdown.js'],
  ['gates/tree.js', 'gates/tree.js'],
  ['gates/classification.js', 'gates/classification.js'],
  ['gates/format.js', 'gates/format.js'],
  ['gates/archive.js', 'gates/archive.js'],
  ['gates/links.js', 'gates/links.js'],
  ['gates/wrap.js', 'gates/wrap.js'],
  ['scaffold/.agents/notes/README.md', 'scaffold/.agents/notes/README.md'],
  ['scaffold/.agents/notes/AGENTS.md', 'scaffold/.agents/notes/AGENTS.md'],
  ['scaffold/.agents/notes/implemented/AGENTS.md', 'scaffold/.agents/notes/implemented/AGENTS.md'],
  ['scaffold/.agents/notes/archived/AGENTS.md', 'scaffold/.agents/notes/archived/AGENTS.md'],
  ['scaffold/.agents/notes/implemented/process/2025-01-01-toolkit-mechanism.md', 'scaffold/.agents/notes/implemented/process/2025-01-01-toolkit-mechanism.md'],
]

/** The toolkit version the vendored `init.js` reads from its sibling package.json. */
function toolkitVersion() {
  return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
}

let written = 0
for (const [source, dest] of MANIFEST) {
  const from = join(ROOT, source)
  const to = join(DEST, dest)
  mkdirSync(dirname(to), { recursive: true })
  const before = existsSync(to) ? readFileSync(to, 'utf8') : undefined
  const bytes = readFileSync(from)
  writeFileSync(to, bytes)
  if (before === undefined || before !== bytes.toString('utf8')) {
    written += 1
    process.stdout.write(`sync-vendor: wrote ${dest}\n`)
  }
}
// Generated shim, not a drifted copy: the vendored init.js reads its sibling
// package.json for the version, and the real package.json lives one level up.
const shim = join(DEST, 'package.json')
const shimContent = `${JSON.stringify({ name: '@liangminhua/dsh-an-vendor', version: toolkitVersion(), type: 'module', private: true }, null, 2)}\n`
const shimBefore = existsSync(shim) ? readFileSync(shim, 'utf8') : undefined
if (shimBefore !== shimContent) {
  writeFileSync(shim, shimContent)
  written += 1
  process.stdout.write('sync-vendor: wrote package.json (version shim)\n')
}
process.stdout.write(`sync-vendor: ${written}/${MANIFEST.length + 1} file(s) written, ${MANIFEST.length + 1 - written} unchanged.\n`)
