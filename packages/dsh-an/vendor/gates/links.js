#!/usr/bin/env node
/**
 * Markdown-links gate: relative links, images, and definitions must resolve —
 * the target file exists AND a `#fragment` onto a Markdown target names a real
 * heading slug or explicit `<a id>`. URL and root-absolute targets are
 * excluded. The checker never rewrites.
 * Usage: node gates/links.js [--root <dir>]
 */

import { existsSync, globSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'
import { anchorCache, parseMarkdown, visitMarkdown } from '../lib/markdown.js'

const args = process.argv.slice(2)
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)

/** Repo-authored Markdown checked for relative links. */
const PATTERNS = [
  'README.md',
  '.agents/notes/**/*.md',
  '.agents/skills/**/*.md',
  'AGENTS.md',
  'docs/**/*.md',
  'SPEC.md',
  'CLAUDE.md',
]

/** A broken relative link: missing target path or missing anchor on it. */
function isExternal(url) {
  if (url.startsWith('//') || url.startsWith('/')) return true
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
}

/** Strip fragment/query and percent-decode the path part. */
function pathPart(url) {
  const raw = url.replace(/[#?].*$/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** The percent-decoded `#fragment` of a link target, or null when it has none. */
function fragmentPart(url) {
  const hash = url.indexOf('#')
  if (hash === -1) return null
  const raw = url.slice(hash + 1).replace(/\?.*$/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** Frozen archive history: valid link targets, never checked as sources. */
function isArchived(path) {
  return path.replaceAll('\\', '/').startsWith('.agents/notes/archived/')
}

/** Expand repo-relative globs, deduplicating symlinked files. */
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
      files.push({ abs })
    }
  }
  return files
}

/** Find every broken relative cross-link in one Markdown file via its AST. */
function findViolations(absPath, anchorsOf) {
  const file = relative(root, absPath).split(sep).join('/')
  const dir = dirname(absPath)
  const source = readFileSync(absPath, 'utf8')
  const out = []
  const check = (url, node) => {
    if (isExternal(url)) return
    const target = pathPart(url)
    const resolved = target === '' ? absPath : resolve(dir, target)
    if (!existsSync(resolved)) {
      out.push(`${file}:${node.position?.start.line ?? 0}  ${url}  (target does not exist)`)
      return
    }
    const fragment = fragmentPart(url)
    if (fragment === null || !resolved.endsWith('.md')) return
    if (!anchorsOf(resolved).has(fragment)) {
      out.push(`${file}:${node.position?.start.line ?? 0}  ${url}  (no such anchor in target)`)
    }
  }
  visitMarkdown(parseMarkdown(source), (node) => {
    if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && 'url' in node) {
      check(node.url, node)
    }
  })
  return out
}

const files = uniqueFiles(PATTERNS)
const anchorsOf = anchorCache()
const violations = files.flatMap(file => findViolations(file.abs, anchorsOf))
exitWith(violations)
if (violations.length === 0) process.stdout.write(`${summarize('links', files.length)}\n`)
