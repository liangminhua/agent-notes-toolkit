/**
 * The AN human commands: `/notes-init`, `/notes-verify`, `/ci-setup` as a
 * plain-ESM dsh function plugin. Each command is a thin shell around the
 * shared toolkit engine; `notes-verify` additionally flags a failed run as an
 * error result so the UI surfaces it. Mounted by the AN bundle patch layer,
 * the commands are global to the profile like any host-plane command.
 * @module @liangminhua/dsh-an/commands
 */

import { engineCiSetup, engineInit, engineVerify } from '../vendor/lib/engine.js'

export const name = 'dsh-an-commands'
export const inject = ['commands']

/** Cwd of the receiving agent's session, when one exists. */
function sessionCwd(agent) {
  const cwd = agent?.session?.header?.cwd
  return typeof cwd === 'string' && cwd.length > 0 ? cwd : undefined
}

/**
 * Mount the three AN commands.
 * @param {import('@deepseek-ai/cordis').Context} ctx - context carrying `commands`.
 */
export function apply(ctx) {
  const disposers = [
    ctx.commands.register({
      name: 'notes-init',
      description: 'Scaffold the Agent Notes tree (.agents/notes) in this project',
      input: { hint: '[--force]' },
      handler(invocation) {
        const result = engineInit(sessionCwd(invocation.agent), { force: invocation.rawInput.includes('--force') })
        return { kind: result.ok ? 'success' : 'error', text: result.lines.join('\n') }
      },
    }),
    ctx.commands.register({
      name: 'notes-verify',
      description: 'Run every Agent Notes gate against this project',
      handler(invocation) {
        const result = engineVerify(sessionCwd(invocation.agent))
        return { kind: result.ok ? 'success' : 'error', text: result.lines.join('\n') }
      },
    }),
    ctx.commands.register({
      name: 'ci-setup',
      description: 'Wire the Agent Notes verify gate into this project\'s CI',
      input: { hint: '[--ci github|gitlab|none] [--confirm]' },
      handler(invocation) {
        const raw = invocation.rawInput
        const ciMatch = /--ci\s+([a-z]+)/.exec(raw)
        const result = engineCiSetup(sessionCwd(invocation.agent), {
          ci: ciMatch?.[1],
          confirm: raw.includes('--confirm'),
        })
        return { kind: result.ok ? 'success' : 'error', text: result.lines.join('\n') }
      },
    }),
  ]

  ctx.effect(() => () => {
    for (const dispose of disposers.reverse()) dispose()
  }, 'dsh-an-commands registrations')
}
