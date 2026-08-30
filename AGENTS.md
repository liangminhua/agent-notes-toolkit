# AGENTS.md — Agent Notes Toolkit

This repository ships the Agent Notes mechanism as a portable toolkit and is its own reference user: the `.agents/notes` tree here is maintained with the toolkit itself, and CI runs the same gates the toolkit publishes.

## Working in this repository

- Every non-trivial change ships with an Agent Note under `.agents/notes`; follow `.agents/notes/README.md`.
- Implemented notes stay current with what actually shipped; archive them per `skills/archive-notes/SKILL.md` when they stop guiding work.
- Before finishing a change, run `node lib/cli.js verify` and `npm test`; both must be green.
- The gates live in `gates/`, the CLI in `lib/cli.js`, scaffold templates in `scaffold/`, maintenance skills in `skills/`, and the dsh bundle in `packages/dsh-an`. Every deliberate difference from the upstream `deepseek-harness` mechanism is recorded in `docs/deviations.md`.
- Prose follows `skills/prose-standard/SKILL.md`: one physical line per paragraph, complete contracts, no reasoning-transcript residue.
