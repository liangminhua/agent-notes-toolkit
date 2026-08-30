/**
 * Drift guard: the dsh-an package's vendored engine/gates/scaffold copies must
 * byte-match the toolkit sources. A change to a source file requires rerunning
 * `node scripts/sync-vendor.mjs` in the same change; this test fails the suite
 * otherwise, so the published bundle can never carry a stale engine.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MANIFEST } from '../scripts/sync-vendor.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

test('vendored dsh-an copies byte-match their toolkit sources', () => {
  const drift = []
  for (const [source, dest] of MANIFEST) {
    const from = readFileSync(join(ROOT, source))
    const to = readFileSync(join(ROOT, 'packages', 'dsh-an', 'vendor', dest))
    if (!from.equals(to)) drift.push(`${source} -> ${dest}`)
  }
  assert.deepEqual(drift, [], 'run `node scripts/sync-vendor.mjs` after changing a toolkit source')
})

test('vendor version shim tracks the toolkit version', () => {
  const toolkit = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
  const shim = JSON.parse(readFileSync(join(ROOT, 'packages', 'dsh-an', 'vendor', 'package.json'), 'utf8'))
  assert.equal(shim.version, toolkit, 'run `node scripts/sync-vendor.mjs` after a version bump')
})
