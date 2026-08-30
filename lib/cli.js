#!/usr/bin/env node
/**
 * The `an` CLI: init, verify, ci-setup, migrate, preset-install. Every command
 * resolves the project root by cwd-upward `.git` discovery unless `--root` is
 * given. `verify` reproduces the exit-code contract: 0 when clean, 1 with one
 * violation per stdout line otherwise. This file is a thin process shell over
 * the shared engine (`lib/engine.js`): the dsh tools and commands plugins call
 * the same functions in-process.
 * @module agent-notes-toolkit/cli
 */

import { resolve } from 'node:path'
import { engineCiSetup, engineInit, engineMigrate, engineVerify } from './engine.js'
import { toolkitVersion } from './init.js'
import { runPresetInstall } from './preset.js'

/** Print usage and exit with the given code. */
function usage(code = 0) {
  process.stdout.write([
    'Usage: an <command> [options]',
    '',
    'Commands:',
    '  an init [--root <dir>] [--force]        scaffold the .agents/notes skeleton',
    '  an verify [--root <dir>] [--write-archive]  run every gate; exit 1 on violations',
    '  an ci-setup [--root <dir>] [--ci github|gitlab|none] [--confirm]',
    '                                         wire the verify gate into CI',
    '  an migrate [--root <dir>]              re-scaffold skeleton files only',
    '  an preset-install                       write the AN preset into the dsh user preset root',
    '  an --version                           print the toolkit version',
    '  an --help                              this text',
    '',
  ].join('\n'))
  process.exit(code)
}

/** Split argv into options and the command, tolerating either order. */
function parseArgs(argv) {
  const command = argv.find(a => !a.startsWith('-')) ?? '--help'
  const rootIndex = argv.indexOf('--root')
  return {
    command,
    root: rootIndex >= 0 ? argv[rootIndex + 1] : undefined,
    force: argv.includes('--force'),
    writeArchive: argv.includes('--write-archive'),
    confirm: argv.includes('--confirm'),
    ci: argv.includes('--ci') ? argv[argv.indexOf('--ci') + 1] : undefined,
  }
}

/** Print engine result lines and map `ok` onto the process exit code. */
function finish(result) {
  for (const line of result.lines) process.stdout.write(`${line}\n`)
  process.exit(result.ok ? 0 : 1)
}

/** Command dispatch. */
export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  switch (options.command) {
    case 'init': finish(engineInit(options.root, { force: options.force })); break
    case 'verify': finish(engineVerify(options.root, { writeArchive: options.writeArchive })); break
    case 'ci-setup': finish(engineCiSetup(options.root, { ci: options.ci, confirm: options.confirm })); break
    case 'migrate': finish(engineMigrate(options.root)); break
    case 'preset-install': {
      const { dir, files } = runPresetInstall()
      for (const file of files) process.stdout.write(`preset-install: wrote ${resolve(dir, file)}\n`)
      process.stdout.write('preset-install: the AN mode is now available to dsh sessions (restart the picker if open).\n')
      break
    }
    case '--version': case '-v': process.stdout.write(`${toolkitVersion()}\n`); break
    case '--help': case '-h': usage(0); break
    default:
      process.stderr.write(`an: unknown command "${options.command}"\n`)
      usage(1)
  }
}

// The bin shim is a symlink to this file, so `process.argv[1]` cannot be
// compared with `import.meta.url` reliably. This module is an entry point
// only — nothing imports it — so main() runs unconditionally.
main()
