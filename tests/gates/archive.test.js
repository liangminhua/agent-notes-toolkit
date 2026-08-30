import { makeProject, runGate, assert, test, writeFileSync, rmSync, join, mkdirSync } from '../helpers.js'

/** Write a sealed-archive fixture and return its project root. */
function archivedProject() {
  const root = makeProject()
  const dir = join(root, '.agents', 'notes', 'archived', 'process')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '2025-01-01-old.md'), '# Agent Note: old\n\nStatus: implemented\n\n## Problem\nOld.\n')
  return root
}

test('archive gate rejects unsealed files', () => {
  const root = archivedProject()
  const { code, out } = runGate('archive', root)
  assert.equal(code, 1)
  assert.match(out, /not sealed/)
  rmSync(root, { recursive: true, force: true })
})

test('archive gate --write seals and re-verifies', () => {
  const root = archivedProject()
  const wrote = runGate('archive', root, ['--write'])
  assert.equal(wrote.code, 0, wrote.out)
  assert.match(wrote.out, /1 file\(s\) sealed/)
  const check = runGate('archive', root)
  assert.equal(check.code, 0, check.out)
  rmSync(root, { recursive: true, force: true })
})

test('archive gate rejects bytes changed after sealing', () => {
  const root = archivedProject()
  runGate('archive', root, ['--write'])
  writeFileSync(join(root, '.agents', 'notes', 'archived', 'process', '2025-01-01-old.md'), '# Agent Note: old\n\nStatus: implemented\n\n## Problem\nTampered.\n')
  const { code, out } = runGate('archive', root)
  assert.equal(code, 1)
  assert.match(out, /bytes changed after sealing/)
  rmSync(root, { recursive: true, force: true })
})

test('archive gate --write refuses when a seal is stale', () => {
  const root = archivedProject()
  runGate('archive', root, ['--write'])
  writeFileSync(join(root, '.agents', 'notes', 'archived', 'process', '2025-01-01-old.md'), '# Agent Note: old\n\nStatus: implemented\n\n## Problem\nTampered.\n')
  const { code, out } = runGate('archive', root, ['--write'])
  assert.equal(code, 1)
  assert.match(out, /bytes changed after sealing/)
  rmSync(root, { recursive: true, force: true })
})

test('archive gate rejects sealed-but-missing files', () => {
  const root = archivedProject()
  runGate('archive', root, ['--write'])
  rmSync(join(root, '.agents', 'notes', 'archived', 'process', '2025-01-01-old.md'))
  const { code, out } = runGate('archive', root)
  assert.equal(code, 1)
  assert.match(out, /sealed but missing/)
  rmSync(root, { recursive: true, force: true })
})
