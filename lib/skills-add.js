/**
 * `an skills add`: the skill-distribution channel. Copies skills from a
 * source — a local directory or a git repository (cloned shallow into a
 * scratch directory) — into a target skills root (default `.agents/skills`).
 * Only the source's skill-shaped content travels: `SKILL.md` files under a
 * top-level `skills/` directory, or a directory that itself contains
 * `SKILL.md` files. Every write is a copy; nothing is deleted and no
 * existing file is overwritten without `--force`.
 * @module agent-notes-toolkit/skills-add
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

/** Where installed skills land inside a project root. */
export function defaultSkillsRoot(root) {
  return join(root, '.agents', 'skills')
}

/** Whether a directory is a skill (holds a SKILL.md). */
export function isSkillDir(path) {
  return existsSync(join(path, 'SKILL.md'))
}

/** Whether a file is a flat skill file. */
export function isSkillFile(path) {
  return basename(path) === 'SKILL.md' || path.endsWith('.md')
}

/** All skill directories or flat skill files directly under one root. */
export function skillsIn(root) {
  const out = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory() && isSkillDir(path)) out.push({ kind: 'dir', path, name: entry.name })
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push({ kind: 'file', path, name: entry.name })
  }
  return out
}

/** Normalize an owner/repo shorthand into a full git clone URL. */
export function normalizeShorthand(source) {
  // `owner/repo` (skills.sh syntax) → GitHub HTTPS URL; anything with a
  // scheme, a path separator structure, or that exists locally passes through.
  if (/^[\w.-]+\/[\w.-]+$/.test(source) && !existsSync(source)) {
    return `https://github.com/${source}.git`
  }
  return source
}

/** Resolve a source into a local directory holding skills. */
export function resolveSkillSource(source) {
  const normalized = normalizeShorthand(source)
  const direct = resolve(source)
  if (statSync(direct, { throwIfNoEntry: false })?.isDirectory()) {
    // Either the directory itself holds skills, or a `skills/` subdirectory does.
    if (isSkillDir(direct) || skillsIn(direct).length > 0) return direct
    const nested = join(direct, 'skills')
    if (existsSync(nested)) return nested
    throw new Error(`skills add: no skills found under ${direct} (expected SKILL.md files or a skills/ directory)`)
  }
  // Git repository: shallow clone into a scratch directory.
  const scratch = mkdtempScratch()
  const clone = spawnSync('git', ['clone', '--depth', '1', '--quiet', normalized, scratch], { encoding: 'utf8' })
  if (clone.status !== 0) {
    rmSync(scratch, { recursive: true, force: true })
    throw new Error(`skills add: git clone failed: ${clone.stderr.trim().split('\n').slice(-1)[0] ?? 'unknown error'}`)
  }
  const nested = join(scratch, 'skills')
  if (existsSync(nested)) return nested
  if (isSkillDir(scratch) || skillsIn(scratch).length > 0) return scratch
  rmSync(scratch, { recursive: true, force: true })
  throw new Error(`skills add: no skills found in ${normalized} (expected a skills/ directory or SKILL.md files)`)
}

/** Fresh scratch directory for a clone. */
export function mkdtempScratch() {
  return mkdtempSync(join(tmpdir(), 'an-skills-'))
}

/**
 * Copy skills from one source into a target skills root.
 * @param {string} source - local path or git URL.
 * @param {string} targetRoot - destination skills root.
 * @param {{ force?: boolean }} options - overwrite existing targets.
 * @returns {{ ok: boolean, lines: string[] }} per-skill outcome lines.
 */
export function engineSkillsAdd(source, targetRoot, options = {}) {
  const lines = []
  let ok = true
  const scratch = resolveSkillSource(source)
  const isScratch = scratch.startsWith(mkdtempScratchPrefix())
  try {
    mkdirSync(targetRoot, { recursive: true })
    let installed = 0
    for (const skill of skillsIn(scratch)) {
      const target = join(targetRoot, skill.name)
      if (existsSync(target) && !options.force) {
        ok = false
        lines.push(`skills add: kept ${skill.name} (exists — use --force to overwrite)`)
        continue
      }
      if (skill.kind === 'dir') cpSync(skill.path, target, { recursive: true })
      else writeFileSync(target, readFileSync(skill.path))
      installed += 1
      lines.push(`skills add: wrote ${skill.name}`)
    }
    if (installed === 0 && lines.every(line => line.startsWith('skills add: kept'))) {
      ok = false
    } else if (installed === 0) {
      ok = false
      lines.push('skills add: nothing to install — the source holds no SKILL.md files')
    } else {
      lines.push(`skills add: installed ${installed} skill(s) into ${targetRoot}`)
    }
    return { ok, lines }
  } finally {
    if (isScratch) rmSync(scratch, { recursive: true, force: true })
  }
}

/** Prefix marking clone scratch directories for cleanup. */
export function mkdtempScratchPrefix() {
  return join(tmpdir(), 'an-skills-')
}
