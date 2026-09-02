import { makeProject, runCli, assert, test, existsSync, rmSync, join, readFileSync } from './cli-helpers.js'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const PRESET = fileURLToPath(new URL('../../lib/preset.js', import.meta.url))

test('an preset-install writes the preset into a custom DSH_HOME', async () => {
  const home = mkdtempSync(join(tmpdir(), 'an-dsh-'))
  const { runPresetInstall, anPresetDir } = await import(PRESET)
  const original = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const { dir, files } = runPresetInstall()
    assert.equal(dir, join(home, '.agent-presets', 'an'))
    assert.ok(existsSync(join(dir, 'agent.cordis.yml')))
    assert.ok(existsSync(join(dir, 'metadata.yml')))
    const composition = readFileSync(join(dir, 'agent.cordis.yml'), 'utf8')
    assert.match(composition, /AN mode preset/)
    assert.match(composition, /an-tools/)
    assert.match(composition, /dsh-agent-instructions/)
    assert.match(readFileSync(join(dir, 'metadata.yml'), 'utf8'), /AN 模式/)
    assert.deepEqual([...files].sort(), ['agent.cordis.yml', 'metadata.yml'])
  } finally {
    process.env.DSH_HOME = original
  }
  rmSync(home, { recursive: true, force: true })
})

test('preset composition mounts only the tools plugin and no duplicate skills row', async () => {
  const { presetComposition } = await import(PRESET)
  const composition = presetComposition()
  assert.match(composition, /agent-notes-toolkit\/tools|dsh-an\/lib\/tools\.js/, 'tools row must name the tools plugin')
  assert.ok(!composition.includes('an-skills'), 'skills arrive via the tools plugin runtime registrations — one delivery channel')
  assert.ok(!composition.includes('dsh-skill-filesystem'), composition)
})

test('cli preset-install writes into DSH_HOME', () => {
  const home = mkdtempSync(join(tmpdir(), 'an-dsh-cli-'))
  const original = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    const result = runCli(['preset-install'], home)
    assert.equal(result.code, 0, result.out)
    assert.ok(existsSync(join(home, '.agent-presets', 'an', 'agent.cordis.yml')))
  } finally {
    process.env.DSH_HOME = original
  }
  rmSync(home, { recursive: true, force: true })
})
