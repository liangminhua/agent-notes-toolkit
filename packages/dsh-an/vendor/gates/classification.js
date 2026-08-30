#!/usr/bin/env node
/**
 * Classification gate: enforce lifecycle/class paths and forbid legacy homes.
 * Usage: node gates/classification.js [--root <dir>]
 */

import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'
import { walkAgentNoteTree } from '../lib/tree.js'

const args = process.argv.slice(2)
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)
const { notes, errors } = walkAgentNoteTree(root)

for (const legacyRoot of ['docs/rfc', 'docs/rfcs']) {
  if (existsSync(join(root, legacyRoot))) {
    errors.push(`legacy-path: ${legacyRoot}/ is forbidden — put Agent Notes under .agents/notes/`)
  }
}
exitWith(errors)
if (errors.length === 0) process.stdout.write(`${summarize('classification', notes.length)}\n`)
