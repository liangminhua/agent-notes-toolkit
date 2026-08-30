import { makeProject, runGate, assert, test, writeFileSync, rmSync, join, mkdirSync } from '../helpers.js'

/** Create a doc with a link and return its project root. */
function linkedProject(docRel, docContent, targetRel = null, targetContent = '# Target\n\n## Real Heading\n') {
  const root = makeProject()
  writeFileSync(join(root, docRel), docContent)
  if (targetRel !== null) {
    mkdirSync(join(root, targetRel, '..'), { recursive: true })
    writeFileSync(join(root, targetRel), targetContent)
  }
  return root
}

test('links gate passes resolvable links and fragments', () => {
  const root = linkedProject(
    'README.md',
    '# Home\n\nSee [the target](docs/target.md#real-heading).\n',
    'docs/target.md',
  )
  const { code, out } = runGate('links', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})

test('links gate rejects a missing target', () => {
  const root = linkedProject('README.md', '# Home\n\nSee [gone](docs/nope.md).\n')
  const { code, out } = runGate('links', root)
  assert.equal(code, 1)
  assert.match(out, /target does not exist/)
  rmSync(root, { recursive: true, force: true })
})

test('links gate rejects a missing anchor', () => {
  const root = linkedProject(
    'README.md',
    '# Home\n\nSee [target](docs/target.md#not-there).\n',
    'docs/target.md',
  )
  const { code, out } = runGate('links', root)
  assert.equal(code, 1)
  assert.match(out, /no such anchor/)
  rmSync(root, { recursive: true, force: true })
})

test('links gate skips external and root-absolute urls', () => {
  const root = linkedProject(
    'README.md',
    '# Home\n\n[ext](https://example.com) [root](/abs) [frag](#home).\n',
  )
  const { code, out } = runGate('links', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})

test('links gate skips archived notes as sources', () => {
  const root = makeProject()
  const dir = join(root, '.agents', 'notes', 'archived', 'process')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '2025-01-01-old.md'), '# Old\n\n[broken](gone.md)\n')
  const { code, out } = runGate('links', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})
