# Agent Note: the toolkit mechanism

Status: implemented

## Problem

Maintainers revisit the same design decisions without a record of why the current choice won, and agents cannot reconstruct the rationale behind existing contracts. The repository needed a lightweight decision-record mechanism that survives refactors, is machine-checkable, and stays current with what actually shipped.

## Decision

This repository uses the Agent Notes toolkit (`an`): a path-encoded tree of decision records under `.agents/notes/` with closed lifecycles (`proposed`/`implemented`/`rejected`), closed classes (`feature`/`bug-fix`/`simplification`/`architecture`/`process`/`testing`), a fixed in-file format enforced by `an verify`, cross-links validated by the links gate, and a frozen `archived/` tree sealed by the archive gate.

## Alternatives considered

- **Centralized `INDEX.md`:** rejected — a manual index rots exactly when the tree changes, and the tree itself is the browseable inventory.
- **Free-form docs directory:** rejected — without closed folders and a format gate, records drift into inconsistent shapes and stale states.
- **Vendor a full ADR toolchain:** rejected — a purpose-built gate set is smaller than any general tool and matches the tree's exact rules.

## Consequences

Every non-trivial change must add or update an Agent Note; CI runs `an verify` so violations fail the merge. Archived notes are frozen and their hashes are pinned, so history cannot be rewritten silently.
