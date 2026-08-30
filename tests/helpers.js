/**
 * Gate and CLI tests. The node:test runner executes every `*.test.js` under
 * tests/; run the whole suite with `npm test`.
 */

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const GATES = fileURLToPath(new URL('../gates/', import.meta.url))
const CLI = fileURLToPath(new URL('../lib/cli.js', import.meta.url))

/** Create a temp project with a .git marker and return its path. */
export function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'an-'))
  mkdirSync(join(dir, '.git'))
  mkdirSync(join(dir, '.agents', 'notes'), { recursive: true })
  return dir
}

/** A minimal valid implemented note body. */
export function noteBody(title = 'example', status = 'implemented') {
  const reason = status.startsWith('rejected') ? ' — not worth it' : ''
  return [
    `# Agent Note: ${title}`,
    '',
    `Status: ${status}${reason}`,
    '',
    '## Problem',
    'The problem.',
    '## Decision',
    'The decision.',
    '## Alternatives considered',
    '**Keep it:** why not.',
    '## Consequences',
    'What it cost and bought.',
    '',
  ].join('\n')
}

/** Run one gate script against a project root; returns { code, out }. */
export function runGate(name, root, extra = []) {
  const result = spawnSync(process.execPath, [join(GATES, `${name}.js`), '--root', root, ...extra], { encoding: 'utf8' })
  return { code: result.status ?? 1, out: result.stdout ?? '', err: result.stderr ?? '' }
}

/** Run the CLI against a project root; returns { code, out }. */
export function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' })
  return { code: result.status ?? 1, out: result.stdout ?? '', err: result.stderr ?? '' }
}

export { assert, test, mkdirSync, writeFileSync, existsSync, rmSync, join }
