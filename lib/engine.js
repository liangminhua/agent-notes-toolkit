/**
 * The shared AN engine: one function per CLI command, callable in-process by
 * the dsh tools/commands plugins. The CLI (`lib/cli.js`) is a thin process
 * shell over these functions, so CI, tools, and commands execute the same
 * code — the SPEC's "tools are shells around the same engine" contract.
 *
 * Every engine function is synchronous and reports violations or created
 * files as plain data; callers decide how to present it (exit code, tool
 * value, command result).
 * @module agent-notes-toolkit/engine
 */

import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveRoot, notesRoot, readPin } from './root.js'
import { runInit, hasSkeleton, toolkitVersion } from './init.js'

/** Absolute path of one gate script inside the installed package. */
export function gatePath(name) {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'gates', `${name}.js`)
}

/**
 * Run every gate against one project root.
 * @param {string | undefined} rootFlag - `--root` value or undefined.
 * @param {{ writeArchive?: boolean }} options - archive re-seal mode.
 * @returns {{ ok: boolean, lines: string[] }} one line per gate summary or violation.
 */
export function engineVerify(rootFlag, options = {}) {
  const root = resolveRoot(rootFlag)
  const lines = []
  let ok = true
  if (!existsSync(notesRoot(root))) {
    return { ok: false, lines: ['verify: .agents/notes/ is missing — run `an init` first.'] }
  }
  const gates = ['tree', 'classification', 'format', 'archive', 'links', 'wrap']
  for (const gate of gates) {
    if (gate === 'archive' && options.writeArchive) continue
    const result = spawnSync(process.execPath, [gatePath(gate), '--root', root], { encoding: 'utf8' })
    const out = (result.stdout ?? '').split('\n').filter(l => l.length > 0)
    lines.push(...out)
    if ((result.status ?? 1) !== 0) ok = false
  }
  if (options.writeArchive) {
    const result = spawnSync(process.execPath, [gatePath('archive'), '--root', root], { encoding: 'utf8' })
    const out = (result.stdout ?? '').split('\n').filter(l => l.length > 0)
    lines.push(...out)
    if ((result.status ?? 1) !== 0) ok = false
  }
  const pin = readPin(root)
  if (pin !== undefined && pin !== toolkitVersion()) {
    ok = false
    lines.push(`verify: toolkit version pinned at ${pin}, installed ${toolkitVersion()} — run \`an migrate\`.`)
  }
  if (ok) lines.push('verify: all gates passed.')
  return { ok, lines }
}

/**
 * Scaffold the skeleton into one project root.
 * @param {string | undefined} rootFlag - `--root` value or undefined.
 * @param {{ force?: boolean }} options - overwrite skeleton files.
 * @returns {{ ok: boolean, lines: string[] }} created/kept file lines.
 */
export function engineInit(rootFlag, options = {}) {
  const root = resolveRoot(rootFlag)
  if (hasSkeleton(root) && !options.force) {
    return { ok: true, lines: ['init: .agents/notes already exists — nothing changed (use --force to re-scaffold, or `an migrate`).'] }
  }
  const { created, skipped } = runInit(root, { force: options.force })
  const lines = [
    ...created.map(file => `init: wrote ${file}`),
    ...skipped.map(file => `init: kept ${file}`),
    'init: done. Run `an verify` to confirm, then `an ci-setup` to wire CI.',
  ]
  return { ok: true, lines }
}

/**
 * Wire CI: detect the vendor and either write a standalone workflow file or
 * return a paste-ready snippet.
 * @param {string | undefined} rootFlag - `--root` value or undefined.
 * @param {{ ci?: string, confirm?: boolean }} options - vendor override and GitLab append consent.
 * @returns {{ ok: boolean, wrote?: string, lines: string[] }} outcome and output lines.
 */
export function engineCiSetup(rootFlag, options = {}) {
  const root = resolveRoot(rootFlag)
  const vendor = options.ci ?? detectCi(root)
  if (vendor === 'github') {
    const target = join(root, '.github', 'workflows', 'agent-notes.yml')
    if (existsSync(target)) {
      return { ok: false, lines: [`ci-setup: ${target} already exists — refusing to overwrite. Review it, or delete it first.`] }
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, githubWorkflow())
    return { ok: true, wrote: target, lines: [`ci-setup: wrote ${target}`] }
  }
  if (vendor === 'gitlab') {
    const target = join(root, '.gitlab-ci.yml')
    if (options.confirm && existsSync(target)) {
      appendFileSync(target, gitlabSnippet())
      return { ok: true, wrote: target, lines: [`ci-setup: appended the include block to ${target}`] }
    }
    return { ok: true, lines: [`ci-setup: append this block to ${target} (re-run with --confirm to append automatically):\n\n${gitlabSnippet()}`] }
  }
  return {
    ok: true,
    lines: ['ci-setup: no CI vendor detected. Wire `npm exec an verify` into your pipeline;',
      'for GitHub Actions the equivalent file is:', '', githubWorkflow(), ''],
  }
}

/** Re-scaffold skeleton files only; note content is never touched. */
export function engineMigrate(rootFlag) {
  const root = resolveRoot(rootFlag)
  if (!hasSkeleton(root)) {
    return { ok: false, lines: ['migrate: no skeleton found — run `an init` first.'] }
  }
  const { created } = runInit(root, { migrate: true })
  return { ok: true, lines: [...created.map(file => `migrate: rewrote ${file}`), `migrate: skeleton now matches toolkit ${toolkitVersion()}.`] }
}

/** Detect the CI vendor from repo markers. */
export function detectCi(root) {
  if (existsSync(join(root, '.github'))) return 'github'
  if (existsSync(join(root, '.gitlab-ci.yml'))) return 'gitlab'
  return 'none'
}

/** The standalone GitHub Actions workflow content. */
export function githubWorkflow() {
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

/** The GitLab include snippet; appended only with explicit consent. */
export function gitlabSnippet() {
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
