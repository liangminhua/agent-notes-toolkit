#!/usr/bin/env node
/**
 * `skills` bin: the skills-add channel. `skills add <source>` copies skills
 * from a local directory or a git repository into `.agents/skills`. This
 * entry exists so the command reads as `skills add <repo>` (and, with the
 * binary on PATH, `npx skills add <repo>` finds it without touching the npm
 * registry); it shares the same engine as `an skills add`.
 * @module agent-notes-toolkit/skills-cli
 */

import { defaultSkillsRoot, engineSkillsAdd } from './skills-add.js'
import { resolveRoot } from './root.js'

const argv = process.argv.slice(2)
if (argv[0] !== 'add' || argv[1] === undefined) {
  process.stderr.write('skills: usage: skills add <directory-or-git-repo> [--root <dir>] [--force]\n')
  process.exit(1)
}

try {
  const rootIndex = argv.indexOf('--root')
  const root = resolveRoot(rootIndex >= 0 ? argv[rootIndex + 1] : undefined)
  const result = engineSkillsAdd(argv[1], defaultSkillsRoot(root), { force: argv.includes('--force') })
  for (const line of result.lines) process.stdout.write(`${line}\n`)
  process.exit(result.ok ? 0 : 1)
} catch (error) {
  process.stdout.write(`skills add: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
