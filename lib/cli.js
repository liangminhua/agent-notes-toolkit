#!/usr/bin/env node
/**
 * The `an` CLI: init, verify, ci-setup, migrate. Every command resolves the
 * project root by cwd-upward `.git` discovery unless `--root` is given.
 * `verify` reproduces the exit-code contract: 0 when clean, 1 with one
 * violation per stdout line otherwise.
 * @module agent-notes-toolkit/cli
 */

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRoot, notesRoot, readPin } from './root.js'
import { runInit, hasSkeleton, toolkitVersion } from './init.js'
import { runPresetInstall } from './preset.js'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Print usage and exit with the given code. */
function usage(code = 0) {
  process.stdout.write([
    'Usage: an <command> [options]',
    '',
    'Commands:',
    '  an init [--root <dir>] [--force]        scaffold the .agents/notes skeleton',
    '  an verify [--root <dir>] [--write-archive]  run every gate; exit 1 on violations',
    '  an ci-setup [--root <dir>] [--ci github|gitlab|none] [--confirm]',
    '                                         wire the verify gate into CI',
    '  an migrate [--root <dir>]              re-scaffold skeleton files only',
    '  an preset-install                       write the AN preset into the dsh user preset root',
    '  an --version                           print the toolkit version',
    '  an --help                              this text',
    '',
  ].join('\n'))
  process.exit(code)
}

/** Split argv into options and the command, tolerating either order. */
function parseArgs(argv) {
  const command = argv.find(a => !a.startsWith('-')) ?? '--help'
  const rootIndex = argv.indexOf('--root')
  return {
    command,
    root: rootIndex >= 0 ? argv[rootIndex + 1] : undefined,
    force: argv.includes('--force'),
    writeArchive: argv.includes('--write-archive'),
    confirm: argv.includes('--confirm'),
    ci: argv.includes('--ci') ? argv[argv.indexOf('--ci') + 1] : undefined,
  }
}

/** Absolute path of one gate script inside the installed package. */
function gatePath(name) {
  return join(HERE, '..', 'gates', `${name}.js`)
}

/** Run one gate as a subprocess and return its violation lines and code. */
function runGate(name, root) {
  const result = spawnSync(process.execPath, [gatePath(name), '--root', root], { encoding: 'utf8' })
  return { lines: (result.stdout ?? '').split('\n').filter(l => l.length > 0), code: result.status ?? 1 }
}

/** The verify command: every gate in dependency order, one exit code. */
function commandVerify(options) {
  const root = resolveRoot(options.root)
  if (!existsSync(notesRoot(root))) {
    process.stdout.write('verify: .agents/notes/ is missing — run `an init` first.\n')
    process.exit(1)
  }
  const gates = ['tree', 'classification', 'format', 'archive', 'links', 'wrap']
  let failed = false
  for (const gate of gates) {
    if (gate === 'archive' && options.writeArchive) continue
    const { lines, code } = runGate(gate, root)
    if (lines.length > 0) process.stdout.write(`${lines.join('\n')}\n`)
    if (code !== 0) failed = true
  }
  if (options.writeArchive) {
    const { lines, code } = runGate('archive', root)
    process.stdout.write(`${lines.join('\n')}\n`)
    if (code !== 0) failed = true
  }
  const pin = readPin(root)
  if (pin !== undefined && pin !== toolkitVersion()) {
    failed = true
    process.stdout.write(`verify: toolkit version pinned at ${pin}, installed ${toolkitVersion()} — run \`an migrate\`.\n`)
  }
  if (!failed) process.stdout.write(`verify: all gates passed.\n`)
  process.exit(failed ? 1 : 0)
}

/** The init and migrate commands share scaffolding; only the options differ. */
function commandInit(options) {
  const root = resolveRoot(options.root)
  const existing = hasSkeleton(root)
  if (existing && !options.force) {
    process.stdout.write('init: .agents/notes already exists — nothing changed (use --force to re-scaffold, or `an migrate`).\n')
    process.exit(0)
  }
  const { created, skipped } = runInit(root, { force: options.force })
  for (const file of created) process.stdout.write(`init: wrote ${file}\n`)
  for (const file of skipped) process.stdout.write(`init: kept ${file}\n`)
  process.stdout.write(`init: done. Run \`an verify\` to confirm, then \`an ci-setup\` to wire CI.\n`)
}

/** The migrate command: re-scaffold skeleton files, never note content. */
function commandMigrate(options) {
  const root = resolveRoot(options.root)
  if (!hasSkeleton(root)) {
    process.stdout.write('migrate: no skeleton found — run `an init` first.\n')
    process.exit(1)
  }
  const { created } = runInit(root, { migrate: true })
  for (const file of created) process.stdout.write(`migrate: rewrote ${file}\n`)
  process.stdout.write(`migrate: skeleton now matches toolkit ${toolkitVersion()}.\n`)
}

/** Detect the CI vendor from repo markers. */
function detectCi(root) {
  if (existsSync(join(root, '.github'))) return 'github'
  if (existsSync(join(root, '.gitlab-ci.yml'))) return 'gitlab'
  return 'none'
}

/** The workflow file content for GitHub Actions. */
function githubWorkflow() {
  return [
    'name: agent-notes',
    'on: [pull_request, push]',
    'jobs:',
    '  agent-notes:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with: { node-version: 22 }',
    '      - run: npm install',
    '      - run: npm exec an verify',
    '',
  ].join('\n')
}

/** The include snippet for GitLab CI. */
function gitlabSnippet() {
  return [
    'include:',
    "  - local: '.gitlab/agent-notes.yml'  # create this file with:",
    '      # agent-notes:',
    '      #   script:',
    '      #     - npm install',
    '      #     - npm exec an verify',
    '',
  ].join('\n')
}

/** The ci-setup command: detect, write or print, never overwrite. */
function commandCiSetup(options) {
  const root = resolveRoot(options.root)
  const vendor = options.ci ?? detectCi(root)
  if (vendor === 'github') {
    const target = join(root, '.github', 'workflows', 'agent-notes.yml')
    if (existsSync(target)) {
      process.stdout.write(`ci-setup: ${target} already exists — refusing to overwrite. Review it, or delete it first.\n`)
      process.exit(1)
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, githubWorkflow())
    process.stdout.write(`ci-setup: wrote ${target}\n`)
    return
  }
  if (vendor === 'gitlab') {
    const target = join(root, '.gitlab-ci.yml')
    if (options.confirm && existsSync(target)) {
      appendFileSync(target, gitlabSnippet())
      process.stdout.write(`ci-setup: appended the include block to ${target}\n`)
      return
    }
    process.stdout.write(`ci-setup: append this block to ${target} (re-run with --confirm to append automatically):\n\n${gitlabSnippet()}`)
    return
  }
  process.stdout.write([
    'ci-setup: no CI vendor detected. Wire `npm exec an verify` into your pipeline;',
    'for GitHub Actions the equivalent file is:',
    '',
    githubWorkflow(),
    '',
  ].join('\n'))
}

/** Command dispatch. */
export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  switch (options.command) {
    case 'init': commandInit(options); break
    case 'verify': commandVerify(options); break
    case 'ci-setup': commandCiSetup(options); break
    case 'migrate': commandMigrate(options); break
    case 'preset-install': {
      const { dir, files } = runPresetInstall()
      for (const file of files) process.stdout.write(`preset-install: wrote ${join(dir, file)}\n`)
      process.stdout.write('preset-install: the AN mode is now available to dsh sessions (restart the picker if open).\n')
      break
    }
    case '--version': case '-v': process.stdout.write(`${toolkitVersion()}\n`); break
    case '--help': case '-h': usage(0); break
    default:
      process.stderr.write(`an: unknown command "${options.command}"\n`)
      usage(1)
  }
}

// The bin shim is a symlink to this file, so `process.argv[1]` can never be
// compared with `import.meta.url` reliably. This module is an entry point
// only — nothing imports it — so main() runs unconditionally.
main()
