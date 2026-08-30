/**
 * Project-root discovery and toolkit version pin.
 *
 * Every entry point resolves the repository root by walking upward from
 * `process.cwd()` to the nearest directory containing `.git`, falling back to
 * the cwd itself. An explicit `--root` flag overrides discovery everywhere,
 * which keeps the CLI, the gates, and CI invocations on one contract.
 * @module agent-notes-toolkit/root
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** Directory name marking a project root during upward discovery. */
const ROOT_MARKER = '.git'

/**
 * Discover the project root from a starting directory.
 * @param {string} start - absolute directory to walk up from.
 * @returns {string} the nearest ancestor containing `.git`, or `start` itself.
 */
export function discoverRoot(start) {
  let current = resolve(start)
  for (;;) {
    if (existsSync(join(current, ROOT_MARKER))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(start)
    current = parent
  }
}

/**
 * Resolve the effective project root: `--root` wins, then cwd discovery.
 * @param {string | undefined} flag - value of the `--root` option, if any.
 * @param {string} cwd - starting directory (defaults to `process.cwd()`).
 * @returns {string} absolute project root.
 */
export function resolveRoot(flag, cwd = process.cwd()) {
  return flag === undefined ? discoverRoot(cwd) : resolve(flag)
}

/** Absolute path of the Agent Notes tree under a project root. */
export function notesRoot(root) {
  return join(root, '.agents', 'notes')
}

/** Toolkit version pin file written by `an init`. */
export function pinPath(root) {
  return join(root, '.agents', 'an-version')
}

/**
 * Read the pinned toolkit version, or undefined when the pin is missing.
 * @param {string} root - project root.
 * @returns {string | undefined} the pinned version string.
 */
export function readPin(root) {
  try {
    return readFileSync(pinPath(root), 'utf8').trim()
  } catch {
    return undefined
  }
}
