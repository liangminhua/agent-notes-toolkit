# Agent Note: toolkit initial release

Status: implemented

## Problem

The Agent Notes mechanism lived inside one repository, unreachable by other projects. Teams wanted the decision-record discipline (path-encoded tree, lifecycle folders, machine-checked format, frozen archive) without vendoring an unrelated harness.

## Decision

This repository ships the mechanism as `@liangminhua/agent-notes-toolkit`: six standalone gates (`tree`, `classification`, `format`, `archive`, `links`, `wrap`) sharing one cwd-upward root discovery, an `an` CLI (`init`, `verify`, `ci-setup`, `migrate`, `preset-install`), scaffold templates, three maintenance skills (`archive-notes`, `note-workflow`, `prose-standard`), and a dsh bundle (`@liangminhua/dsh-an`) whose `an` preset is an isolated per-session composition in the dsh mode picker.

## Alternatives considered

- **Copy the upstream scripts verbatim:** rejected — the upstream gates hardcode the repository root and the harness's own globs; porting them through a root parameter and closed taxonomy keeps the rules without the coupling.
- **Full TypeScript build toolchain:** rejected — the gates are plain Node ESM; a build step adds maintenance without changing the exit-code contract.
- **Ship only the dsh bundle:** rejected — CI enforcement must run without a dsh session, so the CLI/gates are the core and the bundle is a channel.
## Consequences

The toolkit is self-hosted: this repository's own `.agents/notes` tree passes `an verify`, and its GitHub workflow runs the same command. Deviations from the upstream mechanism are deliberate and recorded in [docs/deviations.md](../../../../docs/deviations.md).

## Testing

The node:test suite (37 tests) pins every gate's acceptance and rejection paths, the CLI's idempotence and refusal behavior, and the preset generator's output. `an verify` runs green on this repository.
