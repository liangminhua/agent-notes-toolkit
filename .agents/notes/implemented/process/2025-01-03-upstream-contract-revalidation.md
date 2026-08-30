# Agent Note: upstream contract revalidation

Status: implemented

## Problem

The upstream deepseek-harness repository advanced (release 0.1.2-alpha.2; cordis 4.0.2; prerelease channels routed through npm dist-tags). The toolkit pins npm versions of harness packages and ports gate rules from upstream sources, so an upstream change can silently desynchronize the published bundle or the ported rule set.

## Decision

The revalidation found the toolkit structurally unaffected and one dependency question resolved as moot. The dsh plugins consume only the wire-stable registry contracts: `ctx.tools.register` (output/render/timeoutMs validation, reserved `run_code` name, JSON-schema assertion), `ctx.commands.register` (name/description/input/recordInput/handler), and `ctx.skills.register` (SkillRegistration with defaulted invocation/provider). All three signatures are unchanged at upstream HEAD. `dsh-tools`/`dsh-commands` were already removed from the dependency graph in the self-containment change, so the npm alpha.2 peer-chain conflict (dsh-commands → dsh-agent → dsh-llm) no longer applies. The devDependencies now pin only `@deepseek-ai/cordis@^4.0.2`, which is a registry-published range and does not lag. The ported gate rules (status grammar, required/banned headings, closed classes, GitHub slug algorithm, archive triplet sealing) byte-match upstream HEAD with the deviations already recorded. Real-composition revalidation against the rebuilt upstream passed: bundle boot, web profile dump with the an-commands row, a live headless session calling `notes-verify` through a real key, and `dsh-agent-presets` discovery reporting the installed AN preset healthy.

## Alternatives considered

- **Pin `@deepseek-ai/dsh-commands` via npm git dependency (`git+…#&path:packages/interaction/commands`):** rejected — the package is no longer imported anywhere (the commands plugin registers against the injected `commands` service; tests use a fake registry), so the dependency would pin an unused package and the git install path timed out in this environment.
- **Track upstream versions via npm dist-tags instead of ranges:** deferred — cordis `^4.0.2` resolves promptly from the registry; a dist-tag policy becomes worth its own note only when the toolkit ships dsh-facing types.

## Consequences

The single real adjustment is the cordis dev/peer bump to `^4.0.2`. Every other upstream change is either wire-invisible to the toolkit's plugin contracts or already covered by the deviations list. Future upstream releases only need the same three-point revalidation: dependency ranges, the three register contracts, and the ported gate rules.
