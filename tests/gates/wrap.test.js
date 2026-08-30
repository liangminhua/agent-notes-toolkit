import { makeProject, runGate, assert, test, writeFileSync, rmSync, join, mkdirSync } from '../helpers.js'

test('wrap gate rejects hard-wrapped prose paragraphs', () => {
  const root = makeProject()
  writeFileSync(join(root, 'README.md'), '# Home\n\nThis paragraph spans\ntwo physical lines.\n')
  const { code, out } = runGate('wrap', root)
  assert.equal(code, 1)
  assert.match(out, /This paragraph spans/)
  rmSync(root, { recursive: true, force: true })
})

test('wrap gate passes one-line-per-paragraph prose', () => {
  const root = makeProject()
  writeFileSync(join(root, 'README.md'), '# Home\n\nOne line per paragraph.\n\nAnother paragraph.\n')
  const { code, out } = runGate('wrap', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})

test('wrap gate ignores fenced code and frontmatter', () => {
  const root = makeProject()
  writeFileSync(
    join(root, 'README.md'),
    '---\ndescription: "x"\n---\n\n# Home\n\n```\ncode line one\ncode line two\n```\n\nParagraph.\n',
  )
  const { code, out } = runGate('wrap', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})

test('wrap gate skips archived notes', () => {
  const root = makeProject()
  mkdirSync(join(root, '.agents', 'notes', 'archived', 'process'), { recursive: true })
  writeFileSync(
    join(root, '.agents', 'notes', 'archived', 'process', '2025-01-01-old.md'),
    '# Old\n\nWrapped\nparagraph stays unchecked.\n',
  )
  const { code, out } = runGate('wrap', root)
  assert.equal(code, 0, out)
  rmSync(root, { recursive: true, force: true })
})
