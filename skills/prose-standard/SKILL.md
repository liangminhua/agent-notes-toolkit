---
name: prose-standard
description: Use when writing, reviewing, restoring, trimming, or auditing prose — deciding where documentation or comments are required, preserving every factual clause, and deleting reasoning-transcript residue.
---

# Prose Standard

Write enough to preserve the contract, then remove reasoning transcripts, repetition, and decoration. A contract is an obligation, invariant, precondition, postcondition, or compatibility promise that a caller, callee, implementer, producer, or consumer relies on.

## Preserve the complete proposition

Before editing, identify every proposition in the passage. Preserve each relevant: actor and action; condition, timing, and ordering; modality such as must, may, or never; negative guarantee and exception; ownership, side effect, failure mode, and consequence. Remove adjectives, repetition, and narration only when every factual clause survives and the result is clearer. A smaller word count alone is not an improvement.

## Required coverage by prose location

- **Public JSDoc:** document caller-visible return distinctions, throws or rejections, side effects, ownership, timing, cancellation, and durability.
- **Internal comments:** orient non-local structure and obviously complicated local structure — invariants, race ordering, ownership, security boundaries, surprising failure behavior. Delete control-flow narration and code restatement.
- **Module comments:** state the module's role, dependencies, responsibilities, and non-obvious architecture choices.
- **Tests:** explain only non-obvious test design — why a fixture, assertion, platform accommodation, or indirect observation is necessary. Delete walkthroughs and inventories.
- **READMEs:** include the consumer contract: configuration, semantics, failures, limitations, extension points. Keep durable gaps, not ordinary cleanup inventories.
- **Agent Notes:** retain unique rationale, mechanisms, alternatives, consequences, shipped verification evidence, and named coverage gaps. Implemented notes state shipped reality in the present tense.
- **Skills and agent instructions:** state behavioral guardrails and explicit scope limitations. Keep the workflow concise.

Keep a complete local contract at the point of use: behavior, failure, ownership, and consequence that a caller or maintainer needs there. Link to the owning document for architecture, rationale, algorithms, history, or extended examples. One explanation has one home; essential contract facts may repeat locally.

## Borderline decisions

A case is borderline only when at least two versions satisfy the complete-proposition rule but trade accepted principles. Do not weaken a proposition to make progress; report genuinely borderline cases without asking questions in automatic mode.
