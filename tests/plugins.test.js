/**
 * The AN dsh plugins over npm cordis. A fake `tools` registry pins the
 * function-plugin shape (`name`/`inject`/`apply`, no default export) and the
 * registration contract: the tool registers under `notes-verify`, executes
 * through the shared engine, renders the engine lines as model content, and
 * the returned disposer tears the registration down. Bundled-skill
 * registrations are skipped when the composition carries no `skills` service.
 * @module tests/plugins.test
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'

const TOOLS = fileURLToPath(new URL('../dsh-an/lib/tools.js', import.meta.url))
const COMMANDS = fileURLToPath(new URL('../dsh-an/lib/commands.js', import.meta.url))
const SKILLS = fileURLToPath(new URL('../dsh-an/lib/skills.js', import.meta.url))

/** Minimal in-memory tool registry satisfying the plugin's use of ctx.tools. */
class FakeTools {
  definitions = new Map()
  register(definition) {
    this.definitions.set(definition.name, definition)
    return () => { this.definitions.delete(definition.name) }
  }
}

/** Minimal command registry recording registrations and running handlers. */
class FakeCommands {
  definitions = new Map()
  register(definition) {
    this.definitions.set(definition.name, definition)
    return () => { this.definitions.delete(definition.name) }
  }
  async run(name, agent = {}) {
    const definition = this.definitions.get(name)
    if (definition === undefined) throw new Error(`no such command ${name}`)
    return await definition.handler({ agent, rawInput: '', signal: new AbortController().signal })
  }
}

/** Mount a plugin module into a cordis context with fake services. */
async function mountPlugin(path, services) {
  const root = new Context()
  for (const [name, service] of Object.entries(services)) root.provide(name, service)
  const plugin = await import(path)
  await root.plugin(plugin)
  return { ctx: root, plugin, disposer: async () => { await root.fiber.dispose() } }
}

test('tools plugin registers notes-verify and verifies through the engine', async () => {
  const project = mkdtempSync(join(tmpdir(), 'an-tools-'))
  mkdirSync(join(project, '.git'))
  mkdirSync(join(project, '.agents', 'notes', 'implemented', 'process'), { recursive: true })
  writeFileSync(
    join(project, '.agents', 'notes', 'implemented', 'process', '2025-01-01-good.md'),
    '# Agent Note: good\n\nStatus: implemented\n\n## Problem\nP.\n## Decision\nD.\n## Alternatives considered\n**No.**\n## Consequences\nC.\n',
  )
  const tools = new FakeTools()
  const { ctx, disposer } = await mountPlugin(TOOLS, { tools })
  assert.ok(tools.definitions.has('notes-verify'))
  const definition = tools.definitions.get('notes-verify')
  assert.equal(definition.parameters.type, 'object')
  const value = await definition.execute({ root: project }, { signal: new AbortController().signal })
  assert.equal(value.ok, true)
  assert.ok(value.lines.some(line => line.includes('all gates passed')))
  const rendered = definition.output.render({}, value)
  assert.equal(rendered[0].type, 'text')
  assert.match(rendered[0].text, /all gates passed/)
  await disposer()
  rmSync(project, { recursive: true, force: true })
})

test('tools plugin refuses an invalid tree with ok=false and violation lines', async () => {
  const project = mkdtempSync(join(tmpdir(), 'an-tools-bad-'))
  mkdirSync(join(project, '.git'))
  mkdirSync(join(project, '.agents', 'notes', 'implemented', 'process'), { recursive: true })
  writeFileSync(
    join(project, '.agents', 'notes', 'implemented', 'process', '2025-01-01-bad.md'),
    '# Agent Note: bad\n\nStatus: proposed\n\n## Problem\nP.\n## Proposal\nX.\n## Alternatives considered\n**No.**\n## Acceptance criteria\nDone.\n## Risks\nNone.\n',
  )
  const tools = new FakeTools()
  const { ctx, disposer } = await mountPlugin(TOOLS, { tools })
  const definition = tools.definitions.get('notes-verify')
  const value = await definition.execute({ root: project }, { signal: new AbortController().signal })
  assert.equal(value.ok, false)
  assert.ok(value.lines.some(line => line.includes('line 3 must match the implemented status grammar')))
  await disposer()
  rmSync(project, { recursive: true, force: true })
})

test('tools plugin disposes its tool registration', async () => {
  const tools = new FakeTools()
  const { ctx, disposer } = await mountPlugin(TOOLS, { tools })
  assert.ok(tools.definitions.has('notes-verify'))
  await disposer()
  assert.ok(!tools.definitions.has('notes-verify'))
})

test('commands plugin registers the three AN commands and routes to the engine', async () => {
  const project = mkdtempSync(join(tmpdir(), 'an-cmds-'))
  mkdirSync(join(project, '.git'))
  mkdirSync(join(project, '.github'), { recursive: true })
  const commands = new FakeCommands()
  const { ctx, disposer } = await mountPlugin(COMMANDS, { commands })
  assert.deepEqual([...commands.definitions.keys()].sort(), ['ci-setup', 'notes-init', 'notes-verify'])
  const agent = { session: { header: { cwd: project } } }
  const init = await commands.run('notes-init', agent)
  assert.equal(init.kind, 'success')
  assert.match(init.text, /init: wrote/)
  const verify = await commands.run('notes-verify', agent)
  assert.equal(verify.kind, 'success')
  assert.match(verify.text, /all gates passed/)
  const ci = await commands.run('ci-setup', agent)
  assert.equal(ci.kind, 'success')
  assert.match(ci.text, /ci-setup: wrote/)
  await disposer()
  rmSync(project, { recursive: true, force: true })
})

test('commands plugin disposes its three registrations', async () => {
  const commands = new FakeCommands()
  const { ctx, disposer } = await mountPlugin(COMMANDS, { commands })
  assert.equal(commands.definitions.size, 3)
  await disposer()
  assert.equal(commands.definitions.size, 0)
})

test('bundled skill loader parses the shipped SKILL.md files', async () => {
  const { bundledSkills } = await import(SKILLS)
  const skills = bundledSkills()
  assert.deepEqual(skills.map(s => s.name).sort(), ['archive-notes', 'note-workflow', 'prose-standard'])
  for (const skill of skills) {
    assert.ok(skill.description.length > 0)
    assert.ok(skill.content.includes('## '))
  }
})
