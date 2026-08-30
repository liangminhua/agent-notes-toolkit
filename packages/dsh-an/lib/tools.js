/**
 * The AN model tool: `notes-verify` plus the bundled AN skills as runtime
 * registrations. This module is a plain-ESM dsh plugin (function-plugin shape:
 * named `name`/`inject`/`apply`, no default export) so the AN preset can mount
 * it as a file-path row and any host composition can mount it as a bare
 * package subpath row. The tool is a shell around the shared toolkit engine:
 * same code the `an` CLI and CI execute.
 * @module @liangminhua/dsh-an/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { engineVerify } from '../../../lib/engine.js'
import { bundledSkills } from './skills.js'

export const name = 'dsh-an-tools'
export const inject = ['tools']

/** Cwd of the calling agent's session, when one exists. */
function sessionCwd(agent) {
  const cwd = agent?.session?.header?.cwd
  return typeof cwd === 'string' && cwd.length > 0 ? cwd : undefined
}

/**
 * Mount the `notes-verify` tool and the bundled AN skills.
 * @param {import('@deepseek-ai/cordis').Context} ctx - context carrying `tools`.
 */
export function apply(ctx) {
  const notesVerify = defineTool({
    name: 'notes-verify',
    description: 'Verify this project\'s Agent Notes tree against the AN rules (structure, lifecycle/class folders, file format, frozen archive, cross-links, paragraph wrap). Returns one line per violation; fix them and call again until ok is true.',
    parameters: {
      root: { type: 'string', description: 'Project root to verify. Omit to use the session workspace.' },    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          lines: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render(_args, value) {
        return [{ type: 'text', text: value.lines.join('\n') }]
      },
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      return engineVerify(args.root ?? sessionCwd(exec.agent))
    },
    isConcurrencySafe() {
      return true
    },
    presentCall(args) {
      return { card: 'generic', title: 'Verify Agent Notes', kind: 'read', rawInput: args.root }
    },
    presentResult(_args, result) {
      if (result.isError) return undefined
      return { card: 'generic', title: 'Agent Notes verified' }
    },
  })
  const disposer = ctx.tools.register(notesVerify)

  // Bundled skills: runtime provider registrations, available only in
  // compositions that mount this plugin (the AN preset). Omission of the
  // invocation policy permits both model and user surfaces.
  const skills = ctx.get('skills')
  const skillDisposers = skills === undefined ? [] : bundledSkills().map(skill => skills.register(skill))

  ctx.effect(() => () => {
    for (const dispose of skillDisposers.reverse()) dispose()
    disposer()
  }, 'dsh-an-tools registrations')
}
