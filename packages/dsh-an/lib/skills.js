/**
 * Bundled-skills loader for the AN dsh plugins. Reads every `SKILL.md` under
 * this package's `skills/` directory at plugin mount time and hands back
 * `dsh-skill` runtime registrations. The frontmatter grammar is the stable
 * one this package authors (leading `---` fence, `name:`/`description:` keys,
 * body after the closing fence); no YAML dependency is needed for it.
 * @module @liangminhua/dsh-an/skills
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Directory of bundled SKILL.md files, relative to this module. */
export function skillsDir() {
  return fileURLToPath(new URL('../skills/', import.meta.url))
}

/**
 * Parse one SKILL.md file into a runtime skill registration.
 * @param {string} path - absolute path of the SKILL.md file.
 * @returns {{ name: string, description: string, content: string } | undefined}
 *   the parsed skill, or undefined when the frontmatter is malformed.
 */
export function parseSkillFile(path) {
  const raw = readFileSync(path, 'utf8')
  const lines = raw.split('\n')
  if (lines[0] !== '---') return undefined
  const closing = lines.indexOf('---', 1)
  if (closing < 0) return undefined
  const data = {}
  for (const line of lines.slice(1, closing)) {
    const match = /^([a-z-]+):\s*(.*)$/.exec(line)
    if (match === null) continue
    data[match[1]] = match[2].trim()
  }
  const name = data['name']
  const description = data['description']
  if (typeof name !== 'string' || name.length === 0) return undefined
  if (typeof description !== 'string' || description.length === 0) return undefined
  return { name, description, content: lines.slice(closing + 1).join('\n').trim() }
}

/**
 * Every bundled skill as runtime registrations, in lexical order.
 * @returns {Array<{ name: string, description: string, content: string }>}
 */
export function bundledSkills() {
  const dir = skillsDir()
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = entry.isDirectory() ? join(dir, entry.name, 'SKILL.md') : entry.isFile() && entry.name.endsWith('.md') ? join(dir, entry.name) : undefined
    if (path === undefined) continue
    const skill = parseSkillFile(path)
    if (skill !== undefined) out.push(skill)
  }
  return out
}
