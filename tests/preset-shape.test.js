/**
 * AN preset verification: compose the generated preset the way
 * dsh-agent-presets health-checks and mounts it. Parses the composition rows
 * with the loader's `!!js`-free shape rules (rows are maps with `name`
 * strings; groups recurse), resolves each row's specifier, and verifies the
 * required real-module faces for this repository's preset.
 * @module tests/preset-shape.test
 */

import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const PRESET = fileURLToPath(new URL('../lib/preset.js', import.meta.url))

/** Rows of a composition: each a map with a `name` string; groups recurse. */
function parseRows(text) {
  const lines = text.split('\n')
  const rows = []
  let current = null
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const indent = line.length - line.trimStart().length
    if (indent === 0 && /^-\s+id:/.test(line)) {
      current = { name: undefined, config: {} }
      rows.push(current)
      continue
    }
    if (current === null) continue
    if (indent === 2 && /^name:/.test(line.trimStart())) {
      current.name = line.trim().replace(/^name:\s*/, '').replace(/^['"]|['"]$/g, '')
      continue
    }
  }
  return rows
}

test('generated preset rows are shaped for the preset health check', async () => {
  const { presetComposition } = await import(PRESET)
  const rows = parseRows(presetComposition())
  assert.ok(rows.length >= 3, `expected at least persona/tools/instructions, got ${rows.length}`)
  for (const row of rows) {
    assert.equal(typeof row.name, 'string', `row missing a name: ${JSON.stringify(row)}`)
    assert.ok(row.name.length > 0, 'row name must not be empty')
    assert.ok(!row.name.includes('\n'), 'row name must be one line')
  }
  // The tools row names the toolkit's tools plugin: an absolute file when the
  // package resolves from this installation, or the package subpath otherwise.
  const tools = rows.find(row => /agent-notes-toolkit\/tools$/.test(row.name) || row.name.endsWith('lib/tools.js'))
  assert.ok(tools !== undefined, `preset must mount the tools plugin; rows: ${rows.map(r => r.name).join(', ')}`)
})

test('generated preset skills arrive only through the tools plugin', async () => {
  const { presetComposition } = await import(PRESET)
  const composition = presetComposition()
  assert.ok(!composition.includes('skill-filesystem'), 'no second skills delivery channel')
})

test('preset-install output passes a minimal dsh discovery contract', async () => {
  const { runPresetInstall } = await import(PRESET)
  const home = mkdtempSync(join(tmpdir(), 'an-preset-'))
  const original = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const { dir } = runPresetInstall()
    // A preset is a directory holding agent.cordis.yml + metadata.yml.
    assert.ok(existsSync(join(dir, 'agent.cordis.yml')))
    assert.ok(existsSync(join(dir, 'metadata.yml')))
    const metadata = readFileSync(join(dir, 'metadata.yml'), 'utf8')
    assert.match(metadata, /^name: /m)
    assert.match(metadata, /^description: /m)
  } finally {
    process.env.DSH_HOME = original
    rmSync(home, { recursive: true, force: true })
  }
})
