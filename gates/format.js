#!/usr/bin/env node
/**
 * Format gate: Agent Note header block, lifecycle-specific skeleton, alternatives
 * mandate, and retired-marker ban. Classification and filenames belong to the
 * sibling tree gate. Exact format rules live in `.agents/notes/README.md`.
 * Usage: node gates/format.js [--root <dir>]
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRoot } from '../lib/root.js'
import { exitWith, summarize } from '../lib/report.js'
import { walkAgentNoteTree } from '../lib/tree.js'

/** Notes dated before this may carry the grandfather comment. */
const FORMAT_ADOPTED = '2025-01-01'

/** The exact comment a pre-format note carries in place of `## Alternatives considered`. */
const GRANDFATHER = '<!-- an-format: alternatives-not-recorded (pre-format note) -->'

/** Status-line grammar per lifecycle folder. */
const STATUS = {
  proposed: /^Status: proposed$/,
  implemented: /^Status: implemented$/,
  rejected: /^Status: rejected — .+$/,
}

/** Required `##` headings per lifecycle, beyond the universal `## Problem` opener. */
const REQUIRED = {
  proposed: ['## Proposal', '## Acceptance criteria', '## Risks'],
  implemented: ['## Decision', '## Consequences'],
  rejected: ['## Proposal'],
}

/** Headings banned in `implemented/` — proposal-era spec-speak. */
const BANNED_IMPLEMENTED = /^## (?:Proposal\b|Plan\b|Migration plan\b|Acceptance criteria\b)/i

const args = process.argv.slice(2)
const flagIndex = args.indexOf('--root')
const root = resolveRoot(flagIndex >= 0 ? args[flagIndex + 1] : undefined)
const { notes, errors } = walkAgentNoteTree(root)

for (const note of notes) {
  const fail = (msg) => { errors.push(`format: ${note.rel} — ${msg}`) }
  const lines = readFileSync(join(root, '.agents', 'notes', note.rel), 'utf8').split('\n')
  let inFence = false
  const prose = lines.filter((l) => {
    if (l.startsWith('```')) {
      inFence = !inFence
      return false
    }
    return !inFence
  })

  if (!/^# Agent Note: \S/.test(lines[0] ?? '')) fail('line 1 must be `# Agent Note: <title>`')
  if (lines[1] !== '') fail('line 2 must be blank')
  const status = STATUS[note.lifecycle]
  if (status !== undefined && !status.test(lines[2] ?? '')) {
    fail(`line 3 must match the ${note.lifecycle} status grammar (${String(status)})`)
  }
  if (lines[3] !== '') fail('line 4 must be blank')
  const statusLines = prose.filter(l => l.startsWith('Status:') && l !== lines[2])
  if (statusLines.length > 0 || prose.filter(l => l === lines[2]).length > 1) {
    fail('the line-3 `Status:` line must be the only one in the file')
  }

  const h2s = prose.filter(l => l.startsWith('## ')).map(l => l.trimEnd())
  if (h2s[0] !== '## Problem') fail(`the first section must be \`## Problem\` (got ${JSON.stringify(h2s[0] ?? '<none>')})`)
  for (const required of REQUIRED[note.lifecycle] ?? []) {
    if (!h2s.includes(required)) fail(`missing the required \`${required}\` section`)
  }
  if (note.lifecycle === 'implemented') {
    for (const h2 of h2s.filter(h => BANNED_IMPLEMENTED.test(h))) {
      fail(`\`${h2}\` is a proposal-era heading; an implemented Agent Note states what is (fold it into Decision/Consequences)`)
    }
  }

  const hasSection = h2s.includes('## Alternatives considered')
  const hasGrandfather = prose.includes(GRANDFATHER)
  if (hasSection && hasGrandfather) fail('carries both `## Alternatives considered` and the grandfather comment — drop the comment')
  if (!hasSection && !hasGrandfather) fail('missing `## Alternatives considered` (a pre-format note whose alternatives are not reconstructible carries the grandfather comment instead)')
  if (hasGrandfather && note.date >= FORMAT_ADOPTED) fail(`the grandfather comment is only valid for notes dated before ${FORMAT_ADOPTED}`)
}

exitWith(errors)
if (errors.length === 0) process.stdout.write(`${summarize('format', notes.length)}\n`)
