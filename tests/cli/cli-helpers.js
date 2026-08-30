/** CLI test helpers: the same fixtures as helpers.js with fs re-exports. */

import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const CLI = fileURLToPath(new URL('../../lib/cli.js', import.meta.url))

/** Create a temp project with a .git marker and return its path. */
export function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'an-cli-'))
  mkdirSync(join(dir, '.git'))
  return dir
}

/** Run the CLI against a project root; returns { code, out, err }. */
export function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' })
  return { code: result.status ?? 1, out: result.stdout ?? '', err: result.stderr ?? '' }
}

export { assert, test, existsSync, rmSync, join, readFileSync, mkdirSync, writeFileSync }
