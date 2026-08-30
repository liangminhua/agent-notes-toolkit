import { makeProject, noteBody, runGate, assert, test, mkdirSync, writeFileSync, rmSync, join } from '../helpers.js'

/** Write a note into the given lifecycle/class with an optional name. */
function writeNote(root, lifecycle, cls, name, body) {
  const dir = join(root, '.agents', 'notes', lifecycle, cls)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), body)
}

function writeNoteFile(root, lifecycle, cls, date, title, body) {
  writeNote(root, lifecycle, cls, `${date}-${title}.md`, body)
}

test('tree gate passes an empty scaffolded tree', () => {
  const root = makeProject()
  const { code, out } = runGate('tree', root)
  assert.equal(code, 0, out)
  assert.match(out, /tree: \d+ checked, no violations\./)
  rmSync(root, { recursive: true, force: true })
})

test('tree gate rejects an unknown lifecycle folder', () => {
  const root = makeProject()
  mkdirSync(join(root, '.agents', 'notes', 'draft'), { recursive: true })
  const { code, out } = runGate('tree', root)
  assert.equal(code, 1)
  assert.match(out, /unknown lifecycle folder/)
  rmSync(root, { recursive: true, force: true })
})

test('tree gate rejects an unknown class folder', () => {
  const root = makeProject()
  mkdirSync(join(root, '.agents', 'notes', 'implemented', 'blog'), { recursive: true })
  const { code, out } = runGate('tree', root)
  assert.equal(code, 1)
  assert.match(out, /unknown class folder/)
  rmSync(root, { recursive: true, force: true })
})

test('tree gate rejects INDEX.md', () => {
  const root = makeProject()
  writeFileSync(join(root, '.agents', 'notes', 'INDEX.md'), '# Index\n')
  const { code, out } = runGate('tree', root)
  assert.equal(code, 1)
  assert.match(out, /INDEX\.md/)
  rmSync(root, { recursive: true, force: true })
})

test('tree gate rejects a bad filename and bad depth', () => {
  const root = makeProject()
  writeNote(root, 'implemented', 'process', 'no-date.md', noteBody())
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'nested', '')
  mkdirSync(join(root, '.agents', 'notes', 'implemented', 'process', '2025-01-01-extra'), { recursive: true })
  writeFileSync(join(root, '.agents', 'notes', 'implemented', 'process', '2025-01-01-extra', 'inner.md'), '# x\n')
  const { code, out } = runGate('tree', root)
  assert.equal(code, 1)
  assert.match(out, /filename must be yyyy-mm-dd-topic\.md/)
  assert.match(out, /expected \{lifecycle\}\/\{class\}\/file\.md/)
  rmSync(root, { recursive: true, force: true })
})

test('tree gate accepts valid notes in every lifecycle', () => {
  const root = makeProject()
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'shipped', noteBody())
  writeNoteFile(root, 'proposed', 'feature', '2025-02-02', 'idea', noteBody('idea', 'proposed'))
  writeNoteFile(root, 'rejected', 'simplification', '2025-03-03', 'drop', noteBody('drop', 'rejected — not worth it'))
  const { code, out } = runGate('tree', root)
  assert.equal(code, 0, out)
  assert.match(out, /3 checked/)
  rmSync(root, { recursive: true, force: true })
})

test('classification gate forbids legacy homes', () => {
  const root = makeProject()
  mkdirSync(join(root, 'docs', 'rfc'), { recursive: true })
  writeFileSync(join(root, 'docs', 'rfc', 'x.md'), '# x\n')
  const { code, out } = runGate('classification', root)
  assert.equal(code, 1)
  assert.match(out, /legacy-path/)
  rmSync(root, { recursive: true, force: true })
})

test('format gate passes a valid implemented note', () => {
  const root = makeProject()
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'ok', noteBody())
  const { code, out } = runGate('format', root)
  assert.equal(code, 0, out)
  assert.match(out, /1 checked/)
  rmSync(root, { recursive: true, force: true })
})

test('format gate rejects a status/folder mismatch', () => {
  const root = makeProject()
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'mismatch', noteBody('mismatch', 'proposed'))
  const { code, out } = runGate('format', root)
  assert.equal(code, 1)
  assert.match(out, /line 3 must match the implemented status grammar/)
  rmSync(root, { recursive: true, force: true })
})

test('format gate rejects a missing alternatives section', () => {
  const root = makeProject()
  const body = noteBody().replace('## Alternatives considered\n**Keep it:** why not.\n', '')
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'no-alt', body)
  const { code, out } = runGate('format', root)
  assert.equal(code, 1)
  assert.match(out, /missing `## Alternatives considered`/)
  rmSync(root, { recursive: true, force: true })
})

test('format gate rejects proposal-era headings in implemented notes', () => {
  const root = makeProject()
  const body = noteBody().replace('## Decision\n', '## Proposal\n')
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'spec-speak', body)
  const { code, out } = runGate('format', root)
  assert.equal(code, 1)
  assert.match(out, /is a proposal-era heading/)
  rmSync(root, { recursive: true, force: true })
})

test('format gate rejects a duplicate Status line', () => {
  const root = makeProject()
  const body = noteBody().replace('## Problem', 'Status: implemented\n\n## Problem')
  writeNoteFile(root, 'implemented', 'process', '2025-01-01', 'dup-status', body)
  const { code, out } = runGate('format', root)
  assert.equal(code, 1)
  assert.match(out, /line-3 `Status:` line must be the only one/)
  rmSync(root, { recursive: true, force: true })
})
