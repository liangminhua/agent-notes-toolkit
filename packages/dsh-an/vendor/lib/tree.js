/**
 * The Agent Note tree walker: closed lifecycles and classes, dated filenames,
 * no centralized index. This module is the structural source of truth for
 * every gate. It is deliberately dependency-free.
 * @module agent-notes-toolkit/tree
 */

import { globSync, readdirSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'

/** The closed set of active Agent Note lifecycles (top-level folders). */
export const LIFECYCLES = ['proposed', 'implemented', 'rejected']

/** The closed set of Agent Note classes (nested folder under each lifecycle). */
export const CLASSES = ['feature', 'bug-fix', 'simplification', 'architecture', 'process', 'testing']

/** Historical implemented notes live outside the active lifecycle tree. */
export const ARCHIVE = 'archived'

/** Non-Agent Note Markdown allowed to sit directly at a lifecycle root. */
const ROOT_ALLOWLIST = new Set(['AGENTS.md', 'CLAUDE.md'])

/** One Agent Note file, as discovered by the walker. */
export class AgentNote {
  /** @param {{lifecycle: string, rel: string, date: string}} init - note facts. */
  constructor({ lifecycle, rel, date }) {
    this.lifecycle = lifecycle
    /** Path relative to `.agents/notes`. */
    this.rel = rel
    /** `yyyy-mm-dd` from the filename. */
    this.date = date
  }
}

/**
 * Walk the Agent Note tree under one project root, enforcing the structure
 * rules. Returns every valid Agent Note plus one error string per violation
 * (unknown lifecycle or class folder, bad depth, or bad filename). Callers
 * treat a non-empty error list as fatal.
 * @param {string} root - absolute project root containing `.agents/notes`.
 * @returns {{ notes: AgentNote[], errors: string[] }} the walk result.
 */
export function walkAgentNoteTree(root) {
  const notesRoot = resolve(root, '.agents', 'notes')
  const notes = []
  const errors = []
  let entries
  try {
    entries = readdirSync(notesRoot, { withFileTypes: true })
  } catch {
    errors.push(`structure: .agents/notes/ is missing — run \`an init\` to scaffold it`)
    return { notes, errors }
  }
  for (const entry of entries) {
    if (entry.name === 'INDEX.md') {
      errors.push('structure: INDEX.md — centralized Agent Note indexes are forbidden; browse the lifecycle/class tree')
      continue
    }
    if (entry.isDirectory() && entry.name !== ARCHIVE && !LIFECYCLES.includes(entry.name)) {
      errors.push(`structure: ${entry.name}/ — unknown lifecycle folder (allowed: ${LIFECYCLES.join(', ')}, plus ${ARCHIVE}/)`)
    }
  }
  for (const lifecycle of LIFECYCLES) {
    let lifecycleEntries = []
    try {
      lifecycleEntries = readdirSync(join(notesRoot, lifecycle), { withFileTypes: true })
    } catch {
      continue // absent lifecycle folder is not an error; an init fills it
    }
    for (const child of lifecycleEntries) {
      // Stricter than upstream: validate class folders at the directory level,
      // so an empty unknown-class folder is rejected rather than invisible.
      if (child.isDirectory() && !CLASSES.includes(child.name)) {
        errors.push(`structure: ${lifecycle}/${child.name}/ — unknown class folder (allowed: ${CLASSES.join(', ')})`)
      }
    }
    for (const match of globSync(`${lifecycle}/**/*.md`, { cwd: notesRoot }).map(p => p.split(sep).join('/')).sort()) {
      const segs = match.split('/')
      if (segs.length === 2 && ROOT_ALLOWLIST.has(segs[1] ?? '')) continue
      if (match.endsWith('.zh.md')) continue
      const cls = segs[1]
      const base = segs[2]
      if (segs.length !== 3 || cls === undefined || base === undefined) {
        errors.push(`structure: ${match} — expected {lifecycle}/{class}/file.md (got depth ${segs.length})`)
        continue
      }
      if (!CLASSES.includes(cls)) {
        errors.push(`structure: ${match} — unknown class folder "${cls}" (allowed: ${CLASSES.join(', ')})`)
        continue
      }
      if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(base)) {
        errors.push(`structure: ${match} — filename must be yyyy-mm-dd-topic.md`)
        continue
      }
      notes.push(new AgentNote({ lifecycle, rel: match, date: base.slice(0, 10) }))
    }
  }
  return { notes, errors }
}
