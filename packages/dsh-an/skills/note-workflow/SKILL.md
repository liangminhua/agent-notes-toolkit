---
name: note-workflow
description: Use when changing code or docs in this repository to route the change through the Agent Notes loop — writing, updating, archiving, or consolidating notes, then verifying and wiring CI evidence.
---

# Agent Note Workflow

Follow this workflow for every non-trivial change so the decision record, verification, and CI evidence land in the same change set.

## 1. Classify the change

A change is non-trivial when it alters behavior, architecture, a contract shared across files or packages, process or tooling, testing strategy, an on-disk, wire, or configuration format, or another decision a maintainer may reasonably revisit. A proposal for substantial future work starts in `proposed/`; a decision already made starts in `implemented/`. Pick one of the six classes (`feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`).

## 2. Check supersession first

Search the active tree for older notes covering the same decision or mechanism. Update the owning note when one exists; do not create a duplicate. A new note that fully supersedes an implemented note triggers the archive workflow; a partial supersession keeps both notes cross-linked.

## 3. Write the note

Follow the in-file format from `.agents/notes/README.md`: the header block, `## Problem`, the lifecycle skeleton, and `## Alternatives considered`. Implemented notes state shipped reality in the present tense; keep paths, names, and defaults current with the change.

## 4. Verify

Run `an verify` in the project root and fix every violation before moving on. Read-only failures name the file, line, and rule.

## 5. Wire evidence

For a first-time project, run `an init` then `an ci-setup` so the same gates run in CI. For an existing project, confirm the CI workflow references `npm exec an verify`.
