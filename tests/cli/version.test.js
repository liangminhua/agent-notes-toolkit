import { makeProject, runCli, assert, test, existsSync, rmSync, join, readFileSync, mkdirSync, writeFileSync } from './cli-helpers.js'

test('an --version prints the version and exits 0', () => {
  const root = makeProject()
  const { code, out } = runCli(['--version'], root)
  assert.equal(code, 0)
  assert.match(out, /^\d+\.\d+\.\d+\s*$/)
  rmSync(root, { recursive: true, force: true })
})

test('an --help prints usage and exits 0', () => {
  const root = makeProject()
  const { code, out } = runCli(['--help'], root)
  assert.equal(code, 0)
  assert.match(out, /Usage: an <command>/)
  rmSync(root, { recursive: true, force: true })
})

test('an with no command prints usage and exits 0', () => {
  const root = makeProject()
  const { code, out } = runCli([], root)
  assert.equal(code, 0)
  assert.match(out, /Usage: an <command>/)
  rmSync(root, { recursive: true, force: true })
})

test('an rejects an unknown command with usage on stderr', () => {
  const root = makeProject()
  const { code, err } = runCli(['frobnicate'], root)
  assert.equal(code, 1)
  assert.match(err, /unknown command "frobnicate"/)
  rmSync(root, { recursive: true, force: true })
})
