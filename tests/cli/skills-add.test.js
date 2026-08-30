import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { makeProject, runCli, assert, test, existsSync, rmSync, join, readFileSync, mkdirSync, writeFileSync } from './cli-helpers.js'

/** A scratch source directory holding one skill. */
function skillSource() {
  const dir = mkdtempSync(join(tmpdir(), 'an-src-'))
  mkdirSync(join(dir, 'my-skill'), { recursive: true })
  writeFileSync(join(dir, 'my-skill', 'SKILL.md'), '---\nname: my-skill\ndescription: test skill\n---\n\n# Body\n')
  return dir
}

test('an skills add copies a local skill directory into .agents/skills', () => {
  const root = makeProject()
  const source = skillSource()
  const { code, out } = runCli(['skills', 'add', source, '--root', root], root)
  assert.equal(code, 0, out)
  assert.match(out, /installed 1 skill\(s\)/)
  assert.ok(existsSync(join(root, '.agents', 'skills', 'my-skill', 'SKILL.md')))
  rmSync(root, { recursive: true, force: true })
  rmSync(source, { recursive: true, force: true })
})

test('an skills add keeps existing skills without --force', () => {
  const root = makeProject()
  const source = skillSource()
  runCli(['skills', 'add', source, '--root', root], root)
  const again = runCli(['skills', 'add', source, '--root', root], root)
  assert.equal(again.code, 1)
  assert.match(again.out, /kept my-skill/)
  rmSync(root, { recursive: true, force: true })
  rmSync(source, { recursive: true, force: true })
})

test('an skills add --force overwrites an existing skill', () => {
  const root = makeProject()
  const source = skillSource()
  runCli(['skills', 'add', source, '--root', root], root)
  writeFileSync(join(root, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'tampered\n')
  const again = runCli(['skills', 'add', source, '--root', root, '--force'], root)
  assert.equal(again.code, 0, again.out)
  assert.match(readFileSync(join(root, '.agents', 'skills', 'my-skill', 'SKILL.md'), 'utf8'), /my-skill/)
  rmSync(root, { recursive: true, force: true })
  rmSync(source, { recursive: true, force: true })
})

test('an skills add rejects a source without skills', () => {
  const root = makeProject()
  const empty = skillSource()
  rmSync(join(empty, 'my-skill'), { recursive: true, force: true })
  const { code, out } = runCli(['skills', 'add', empty, '--root', root], root)
  assert.equal(code, 1)
  assert.match(out, /no skills found/)
  rmSync(root, { recursive: true, force: true })
  rmSync(empty, { recursive: true, force: true })
})
