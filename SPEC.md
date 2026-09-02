# SPEC — Agent Notes Toolkit (AN)

This repository packages the Agent Notes mechanism from `deepseek-harness` as a portable, project-agnostic toolkit. Every implementation decision below is a contract; the tests and gates pin it.

## 1. Product

- `@liangminhua/agent-notes-toolkit` — one npm package: verification gates, two CLIs (`an`, `skills`), scaffold templates, maintenance skills, and the dsh bundle. The dsh plugins ship as subpath exports (`./commands`, `./tools`); the package declares `dsh.bundle.patch` so `dsh plugin --profile <name> add github:owner/repo` installs it directly from GitHub (no npm publish required), and `npx skills add owner/repo` installs its skills the same way.

## 2. Core invariants

1. **Exit-code contract.** Every gate binary exits 0 when its check passes and 1 with `stdout` carrying one violation per line when it fails. The CLI `an verify` aggregates them and reproduces the same contract.
2. **cwd-upward root discovery.** Every gate and CLI command resolves the project root by walking upward from `process.cwd()` to the nearest `.git` (fallback: `process.cwd()` itself). An explicit `--root` overrides it.
3. **Closed taxonomy.** Lifecycles are `proposed | implemented | rejected | archived` and classes are `feature | bug-fix | simplification | architecture | process | testing`. No other folders may hold Agent Notes. Adding a member is a deliberate SPEC + code change.
4. **Lifecycle = Status cross-check.** `Status: proposed`, `Status: implemented`, or `Status: rejected — <one line>` must agree with the folder the file sits in.
5. **Header block.** Lines 1–4 are exactly `# Agent Note: <title>`, blank, the `Status:` line, blank. The line-3 `Status:` must be the only one in the file.
6. **Lifecycle skeleton.** `## Problem` opens the body. `proposed/` requires `## Proposal`, `## Acceptance criteria`, `## Risks`; `implemented/` requires `## Decision`, `## Consequences` and bans proposal-era headings (`Proposal`, `Plan`, `Migration plan`, `Acceptance criteria`); `rejected/` requires `## Proposal`.
7. **Alternatives considered.** Every note carries `## Alternatives considered`, or a `<!-- an-format: alternatives-not-recorded (pre-format note) -->` comment, which is valid only for notes dated before 2025-01-01.
8. **Frozen archive.** Files under `archived/` are append-only; the verifier pins their SHA-256 in `an-archive-manifest.json` and never edits, translates, reformats, or moves a sealed file.
9. **No INDEX.md.** Centralized indexes are forbidden; browse the lifecycle/class tree.
10. **Cross-links resolve.** All relative Markdown links in `.agents/`, root instruction files, and `docs/` must resolve to an existing file, and a `#fragment` onto a Markdown target must name a real heading slug.
11. **One physical line per paragraph.** Prose paragraphs in the checked corpus must not hard-wrap.
12. **Tools are shells around the same engine.** The dsh notes tools and the CLI invoke the identical gate functions; dsh adds no second implementation.

## 3. CLI surface (`an`)

- `an init [--root <dir>] [--force]` — scaffold `.agents/` skeleton (notes dirs, AGENTS.md files, README, seed note, version pin). Idempotent; refuses an existing skeleton without `--force`; never touches existing note content. Returns a structured report of created files.
- `an verify [--root <dir>]` — run tree, classification, format, archive-freeze, markdown-link, and wrap gates. Read-only. Exit 0/1.
- `an ci-setup [--root <dir>] [--ci github|gitlab|none]` — detect the CI vendor (default: detect from repo markers) and write a standalone workflow file. GitHub → `.github/workflows/agent-notes.yml`; GitLab → print an `include:` snippet, append only with `--confirm`; neither → print a paste-ready snippet. Never overwrites an existing file.
- `an migrate [--root <dir>]` — re-scaffold skeleton files from the current package version without touching note content; reports files changed.

## 4. dsh bundle (same package, subpath exports)

- The root package declares `dsh.bundle.patch` and ships `cordis.patch.yml`; `dsh plugin --profile <name> add github:owner/repo` resolves it from the repository root.
- Subpath exports: `@liangminhua/agent-notes-toolkit/commands` (host-plane `/notes-init`, `/notes-verify`, `/ci-setup`), `@liangminhua/agent-notes-toolkit/tools` (model-facing `notes-verify` + bundled skills as runtime registrations).
- Bundled skills: archive-notes, prose-standard, note-workflow. They are model-invocable and user-invocable by default; a dsh host may override.
- The `an` preset is a full, isolated agent composition (persona, tools) written by `an preset-install` into `$DSH_HOME/.agent-presets/an`; it must not alter standard/ptc/cordis presets. The preset's tools row names the installed package's plugin file when resolvable, otherwise the `@liangminhua/agent-notes-toolkit/tools` subpath.
- The `skills` bin normalizes the skills.sh `owner/repo` shorthand into a GitHub URL before the shallow clone, so `npx skills add owner/repo` and `npx skills add <git-url>` behave identically.

## 5. Upstream fidelity

Where a rule has an exact counterpart in `deepseek-harness`, the gate logic, terminology, and skeleton headings match it (source: `scripts/agent-note-tree.ts`, `scripts/verify-agent-note-format.ts`, `scripts/verify-agent-note-classification.ts`, `scripts/verify-md-links.ts`, `scripts/verify-md-wrap.ts`). Deviations are listed in `docs/deviations.md` and must be deliberate.
