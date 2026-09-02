import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { makeProject, runCli, assert, test, existsSync, rmSync, join, readFileSync, mkdirSync, writeFileSync } from './cli-helpers.js'

const SKILLS_CLI = fileURLToPath(new URL('../../lib/skills-cli.js', import.meta.url))

/** Run the standalone skills bin; returns { code, out, err }. */
function runSkillsBin(args, cwd) {
  const result = spawnSync(process.execPath, [SKILLS_CLI, ...args], { cwd, encoding: 'utf8' })
  return { code: result.status ?? 1, out: result.stdout ?? '', err: result.stderr ?? '' }
}

/** A scratch source directory holding one skill. */
function skillSource() {
  const dir = mkdtempSync(join(tmpdir(), 'an-src-'))
  mkdirSync(join(dir, 'my-skill'), { recursive: true })
  writeFileSync(join(dir, 'my-skill', 'SKILL.md'), '---\nname: my-skill\ndescription: test skill\n---\n\n# Body\n')
  return dir
}

test('skills bin installs from a directory and shares the engine with an skills add', () => {
  const root = makeProject()
  const source = skillSource()
  const { code, out } = runSkillsBin(['add', source, '--root', root], root)
  assert.equal(code, 0, out)
  assert.match(out, /installed 1 skill\(s\)/)
  assert.ok(existsSync(join(root, '.agents', 'skills', 'my-skill', 'SKILL.md')))
  // Same engine, same refusal: a second run without --force must fail.
  const again = runSkillsBin(['add', source, '--root', root], root)
  assert.equal(again.code, 1)
  assert.match(again.out, /kept my-skill/)
  rmSync(root, { recursive: true, force: true })
  rmSync(source, { recursive: true, force: true })
})

test('skills bin rejects a missing subcommand', () => {
  const root = makeProject()
  const { code, err } = runSkillsBin([], root)
  assert.equal(code, 1)
  assert.match(err, /usage: skills add/)
  rmSync(root, { recursive: true, force: true })
})

test('owner/repo shorthand normalizes to a GitHub URL without network', async () => {
  const { normalizeShorthand } = await import('../../lib/skills-add.js')
  assert.equal(normalizeShorthand('liangminhua/agent-notes-toolkit'), 'https://github.com/liangminhua/agent-notes-toolkit.git')
  assert.equal(normalizeShorthand('vercel-labs/agent-skills'), 'https://github.com/vercel-labs/agent-skills.git')
  // A full URL passes through untouched.
  assert.equal(normalizeShorthand('https://github.com/a/b.git'), 'https://github.com/a/b.git')
})
