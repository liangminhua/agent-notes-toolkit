#!/usr/bin/env node
/**
 * Structure gate: closed lifecycles and classes, dated filenames, no index.
 * Usage: node gates/tree.js [--root <dir>]
 * Exit 0 when the tree conforms; exit 1 with one violation per stdout line otherwise.
 */

import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'
import { walkAgentNoteTree } from '../lib/tree.js'

const args = process.argv.slice(2)
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)
const { notes, errors } = walkAgentNoteTree(root)
exitWith(errors)
if (errors.length === 0) process.stdout.write(`${summarize('tree', notes.length)}\n`)
