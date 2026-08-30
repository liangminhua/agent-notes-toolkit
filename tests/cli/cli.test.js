import { makeProject, runCli, assert, test, existsSync, rmSync, join, readFileSync, mkdirSync, writeFileSync } from './cli-helpers.js'

test('an init scaffolds the skeleton and is idempotent', () => {
  const root = makeProject()
  const first = runCli(['init'], root)
  assert.equal(first.code, 0, first.out)
  assert.ok(existsSync(join(root, '.agents', 'notes', 'README.md')))
  assert.ok(existsSync(join(root, '.agents', 'an-version')))
  const second = runCli(['init'], root)
  assert.equal(second.code, 0)
  assert.match(second.out, /already exists/)
  rmSync(root, { recursive: true, force: true })
})

test('an init --force rewrites the skeleton but preserves notes', () => {
  const root = makeProject()
  runCli(['init'], root)
  writeFileSync(join(root, '.agents', 'notes', 'implemented', 'process', '2025-01-02-mine.md'), '// custom note\n')
  const again = runCli(['init', '--force'], root)
  assert.equal(again.code, 0)
  assert.ok(existsSync(join(root, '.agents', 'notes', 'implemented', 'process', '2025-01-02-mine.md')))
  rmSync(root, { recursive: true, force: true })
})

test('an verify fails on an unseeded tree and passes after init', () => {
  const root = makeProject()
  const init = runCli(['init'], root)
  assert.equal(init.code, 0, init.out)
  const verify = runCli(['verify'], root)
  assert.equal(verify.code, 0, verify.out)
  assert.match(verify.out, /all gates passed/)
  rmSync(root, { recursive: true, force: true })
})

test('an verify fails loudly on a status mismatch', () => {
  const root = makeProject()
  runCli(['init'], root)
  const dir = join(root, '.agents', 'notes', 'implemented', 'process')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, '2025-01-02-bad.md'),
    '# Agent Note: bad\n\nStatus: proposed\n\n## Problem\nP.\n## Proposal\nX.\n## Alternatives considered\n**No.**\n## Acceptance criteria\nDone.\n## Risks\nNone.\n',
  )
  const verify = runCli(['verify'], root)
  assert.equal(verify.code, 1)
  assert.match(verify.out, /line 3 must match the implemented status grammar/)
  rmSync(root, { recursive: true, force: true })
})

test('an ci-setup detects github, writes once, refuses overwrite', () => {
  const root = makeProject()
  mkdirSync(join(root, '.github'), { recursive: true })
  const first = runCli(['ci-setup'], root)
  assert.equal(first.code, 0, first.out)
  const workflow = join(root, '.github', 'workflows', 'agent-notes.yml')
  assert.ok(existsSync(workflow))
  assert.match(readFileSync(workflow, 'utf8'), /npm exec an verify/)
  const second = runCli(['ci-setup'], root)
  assert.equal(second.code, 1)
  assert.match(second.out, /refusing to overwrite/)
  rmSync(root, { recursive: true, force: true })
})

test('an ci-setup prints a snippet when no CI is detected', () => {
  const root = makeProject()
  const { code, out } = runCli(['ci-setup'], root)
  assert.equal(code, 0)
  assert.match(out, /no CI vendor detected/)
  assert.match(out, /npm exec an verify/)
  rmSync(root, { recursive: true, force: true })
})

test('an ci-setup prints the include block for gitlab and appends with --confirm', () => {
  const root = makeProject()
  writeFileSync(join(root, '.gitlab-ci.yml'), 'stages:\n  - test\n')
  const printed = runCli(['ci-setup'], root)
  assert.equal(printed.code, 0)
  assert.match(printed.out, /append this block/)
  const appended = runCli(['ci-setup', '--confirm'], root)
  assert.equal(appended.code, 0)
  assert.match(readFileSync(join(root, '.gitlab-ci.yml'), 'utf8'), /include:/)
  rmSync(root, { recursive: true, force: true })
})

test('an migrate rewrites skeleton files only', () => {
  const root = makeProject()
  runCli(['init'], root)
  const notePath = join(root, '.agents', 'notes', 'implemented', 'process', '2025-01-02-mine.md')
  writeFileSync(notePath, '// mine\n')
  const { code, out } = runCli(['migrate'], root)
  assert.equal(code, 0, out)
  assert.match(out, /rewrote/)
  assert.equal(readFileSync(notePath, 'utf8'), '// mine\n')
  rmSync(root, { recursive: true, force: true })
})
