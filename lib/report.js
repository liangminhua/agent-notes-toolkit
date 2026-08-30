/**
 * Gate runner helpers: shared reporting, failure aggregation, and the exit-code
 * contract. A gate prints violations to stdout as one-per-line records and
 * exits 1 on any violation; success prints a summary and exits 0.
 * @module agent-notes-toolkit/report
 */

/** Exit with the aggregate gate result. */
export function exitWith(violations) {
  if (violations.length === 0) return
  for (const line of violations) process.stdout.write(`${line}\n`)
  process.exitCode = 1
}

/** Build the standard success summary line for a gate. */
export function summarize(gate, count) {
  return `${gate}: ${count} checked, no violations.`
}
