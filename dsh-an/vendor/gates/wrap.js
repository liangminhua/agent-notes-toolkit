#!/usr/bin/env node
/**
 * Markdown-wrap gate: reject prose paragraphs spanning multiple physical
 * lines. The GFM AST distinguishes paragraphs—including those in lists and
 * blockquotes—from multiline structural nodes. The checker never rewrites.
 * Usage: node gates/wrap.js [--root <dir>]
 */

import { globSync, readFileSync, realpathSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'
import { parseMarkdown, visitMarkdown } from '../lib/markdown.js'

const args = process.argv.slice(2)
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)

const PATTERNS = [
  'README.md',
  '.agents/notes/**/*.md',
  '.agents/skills/**/*.md',
  'AGENTS.md',
  'docs/**/*.md',
  'SPEC.md',
  'CLAUDE.md',
]

/** Mask YAML frontmatter before parsing, so prose checks skip metadata. */
function maskFrontmatter(source) {
  const lines = source.split('\n')
  if (lines[0] === '---') {
    const closing = lines.indexOf('---', 1)
    if (closing !== -1) {
      for (let index = 0; index <= closing; index += 1) lines[index] = ''
    }
  }
  return lines.join('\n')
}

/** Find every hard-wrapped prose paragraph in one Markdown file. */
function findViolations(absPath) {
  const file = relative(root, absPath).split(sep).join('/')
  const source = readFileSync(absPath, 'utf8')
  const parsed = maskFrontmatter(source)
  const out = []
  visitMarkdown(parseMarkdown(parsed), (node) => {
    if (node.type === 'paragraph' && node.position) {
      const { start, end } = node.position
      if (end.line > start.line) {
        const firstLine = source.split('\n')[start.line - 1] ?? ''
        out.push(`${file}:${start.line}  ${firstLine.trim().slice(0, 80)}`)
      }
      return false
    }
  })
  return out
}

/** Frozen archive history is never checked for wrap violations. */
function isArchived(path) {
  return path.replaceAll('\\', '/').startsWith('.agents/notes/archived/')
}

function uniqueFiles(patterns) {
  const seen = new Set()
  const files = []
  for (const pattern of patterns) {
    for (const match of globSync(pattern, { cwd: root })) {
      const repoPath = match.split(sep).join('/')
      if (isArchived(repoPath)) continue
      const abs = resolve(root, repoPath)
      const real = realpathSync(abs)
      if (seen.has(real)) continue
      seen.add(real)
      files.push(abs)
    }
  }
  return files
}

const files = uniqueFiles(PATTERNS)
const violations = files.flatMap(findViolations)
exitWith(violations)
if (violations.length === 0) process.stdout.write(`${summarize('wrap', files.length)}\n`)
