/**
 * Init and migrate scaffolding: write the `.agents/` skeleton into a project
 * without ever touching existing note content.
 * @module agent-notes-toolkit/init
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLASSES, LIFECYCLES, ARCHIVE } from './tree.js'
import { notesRoot, pinPath } from './root.js'

/** Scaffold template root inside the installed package. */
export function scaffoldRoot() {
  return fileURLToPath(new URL('../scaffold/', import.meta.url))
}

/** Toolkit version string, read from the package manifest. */
export function toolkitVersion() {
  const manifest = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
  return manifest.version
}

/** The set of files `an init` creates, relative to the project root. */
export function skeletonFiles() {
  return [
    '.agents/notes/README.md',
    '.agents/notes/AGENTS.md',
    '.agents/notes/implemented/AGENTS.md',
    '.agents/notes/archived/AGENTS.md',
    '.agents/notes/implemented/process/2025-01-01-toolkit-mechanism.md',
    '.agents/an-version',
  ]
}

/** Whether the target project already carries a toolkit skeleton. */
export function hasSkeleton(root) {
  return existsSync(join(root, '.agents', 'notes', 'README.md'))
}

/**
 * Write the skeleton directory tree and seed files into a project.
 * @param {string} root - absolute project root.
 * @param {{ force?: boolean, migrate?: boolean }} options - `force` overwrites
 *   skeleton files; `migrate` re-writes skeleton files from the current
 *   package version (same effect for now) while preserving note content.
 * @returns {{ created: string[], skipped: string[] }} the created/skipped files.
 */
export function runInit(root, options = {}) {
  const created = []
  const skipped = []
  const notesRootAbs = notesRoot(root)
  mkdirSync(notesRootAbs, { recursive: true })
  mkdirSync(join(notesRootAbs, ARCHIVE), { recursive: true })
  for (const lifecycle of LIFECYCLES) {
    for (const cls of CLASSES) mkdirSync(join(notesRootAbs, lifecycle, cls), { recursive: true })
  }
  const scaffold = scaffoldRoot()
  for (const file of skeletonFiles()) {
    const target = join(root, file)
    if (existsSync(target) && !(options.force || options.migrate)) {
      skipped.push(file)
      continue
    }
    mkdirSync(join(target, '..'), { recursive: true })
    if (file === '.agents/an-version') {
      writeFileSync(target, `${toolkitVersion()}\n`)
    } else {
      writeFileSync(target, readFileSync(join(scaffold, file), 'utf8'))
    }
    created.push(file)
  }
  return { created, skipped }
}
