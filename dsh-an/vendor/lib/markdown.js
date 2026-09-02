/**
 * Shared Markdown parsing and traversal for the toolkit gates. Ports the
 * subset of `deepseek-harness/scripts/markdown.ts` the toolkit needs.
 * @module agent-notes-toolkit/markdown
 */

import { readFileSync } from 'node:fs'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'

/** Parse GitHub-flavored Markdown. */
export function parseMarkdown(source) {
  return fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
}

/** Visit a Markdown tree depth-first; returning false prunes a node's children. */
export function visitMarkdown(node, visitor) {
  if (visitor(node) === false) return
  if ('children' in node) {
    for (const child of node.children) visitMarkdown(child, visitor)
  }
}

/** Text a reader sees from one Markdown node; raw HTML itself contributes none. */
function renderedText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value
  if (node.type === 'image' || node.type === 'imageReference') return node.alt ?? ''
  if (node.type === 'break') return ' '
  if ('children' in node) return node.children.map(child => renderedText(child)).join('')
  return ''
}

/** Return every parsed Markdown heading with its rendered text and source line. */
export function markdownHeadingLines(source) {
  const rawLines = source.split('\n')
  const headings = []
  visitMarkdown(parseMarkdown(source), (node) => {
    if (node.type !== 'heading' || node.position === undefined) return
    headings.push({
      depth: node.depth,
      index: node.position.start.line,
      raw: rawLines[node.position.start.line - 1] ?? '',
      text: renderedText(node),
    })
  })
  return headings
}

/**
 * GitHub's heading-slug algorithm (lowercase; drop everything but letters,
 * numbers, underscores, spaces, hyphens; spaces become hyphens).
 * @param {string} heading - the rendered heading text.
 * @returns {string} the anchor GitHub assigns the first occurrence of the heading.
 */
export function githubSlug(heading) {
  return heading.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-')
}

/**
 * Every anchor one Markdown document exposes: heading slugs plus explicit
 * `<a id="…">` anchors, with GitHub's occupied-set `-1`, `-2` suffixes.
 * @param {string} source - the document's full Markdown text.
 * @returns {Set<string>} the valid fragment set.
 */
export function documentAnchors(source) {
  const anchors = new Set()
  const occurrences = new Map()
  for (const heading of markdownHeadingLines(source)) {
    const base = githubSlug(heading.text)
    let result = base
    let bump = occurrences.get(base) ?? 0
    while (anchors.has(result)) {
      bump += 1
      result = `${base}-${bump}`
    }
    occurrences.set(base, bump)
    anchors.add(result)
  }
  visitMarkdown(parseMarkdown(source), (node) => {
    if (node.type !== 'html') return
    const html = node.value.replace(/<!--[\s\S]*?-->/g, '')
    for (const match of html.matchAll(/<a id="([^"]+)"/g)) anchors.add(match[1] ?? '')
  })
  return anchors
}

/** Lazily collect and cache the anchor set of any existing Markdown file. */
export function anchorCache() {
  const cache = new Map()
  return (absPath) => {
    const hit = cache.get(absPath)
    if (hit) return hit
    const anchors = documentAnchors(readFileSync(absPath, 'utf8'))
    cache.set(absPath, anchors)
    return anchors
  }
}
