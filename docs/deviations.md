# Deviations from deepseek-harness

The toolkit ports the Agent Notes mechanism from `deepseek-harness` (sources: `scripts/agent-note-tree.ts`, `scripts/verify-agent-note-format.ts`, `scripts/verify-agent-note-classification.ts`, `scripts/verify-md-links.ts`, `scripts/verify-md-wrap.ts`, `scripts/repo-files.ts`). These differences are deliberate:

## Removed

- **Bilingual triplets (`.zh.md` + `.i18n.yaml`) and the translation-pairing gate.** Single-language projects do not carry the pairing machinery.
- **The `openai.yaml` cross-product invocation alignment gate.** The toolkit targets any SKILL.md-capable host; product-specific metadata stays a per-project concern.
- **Word-count budget gates (`doc-budgets` manifest).** Budget ceilings are project policy, not mechanism.
- **The `agent-note-classification` legacy-home check against `docs/rfc`**: kept, but scoped to the same two paths.

## Changed

- **Root resolution.** Upstream gates hardcode the repository root; every toolkit gate resolves the root from `--root` or cwd-upward `.git` discovery.
- **Unknown-class folders.** Upstream validates classes per discovered file; the toolkit additionally rejects an unknown class folder at the directory level so an empty folder cannot hide.
- **Grandfather date.** The pre-format alternatives exemption is dated 2025-01-01 (toolkit birth) instead of upstream's 2026-07-05.
- **Archive manifest name.** `an-archive-manifest.json` instead of the upstream append-only manifest file; the seal semantics (SHA-256 per file, append-only `--write`) are unchanged.
- **Gate implementation language.** Plain Node ESM instead of TypeScript; the mdast dependency surface (`mdast-util-from-markdown`, `mdast-util-gfm`, `micromark-extension-gfm`) is identical.
- **CI wiring.** `an ci-setup` writes standalone pipeline files (`.github/workflows/agent-notes.yml` / `.gitlab/agent-notes.yml`) and never edits an existing pipeline file; upstream has no equivalent command (its CI config is committed).
- **dsh plugins.** The toolkit is ONE npm package carrying both the CLI and the dsh bundle: the root manifest declares `dsh.bundle.patch` and the plugins ship as subpath exports (`./commands`, `./tools`) with a hand-built JSON-schema ToolDefinition (no `dsh-tools` schema-DSL dependency) and a self-contained vendored engine (`scripts/sync-vendor.mjs` + drift guard); upstream ships TypeScript service plugins inside the workspace. The single-package layout is what makes the publish guide's GitHub install form (`dsh plugin add github:owner/repo`) resolve the bundle from the repository root.
- **Preset tools row.** The generated AN preset names the tools plugin by resolved file path when the toolkit package resolves from the installation, otherwise by the `@liangminhua/agent-notes-toolkit/tools` subpath the harness/profile base resolves.
- **Skills CLI.** A second bin (`skills`) with the skills.sh `owner/repo` shorthand normalized to a GitHub URL; upstream has no equivalent channel.

## Kept

- Closed lifecycles and classes, `INDEX.md` ban, dated filenames.
- The exact header block and lifecycle skeletons, including the banned proposal-era headings in `implemented/`.
- The alternatives mandate and its grandfather comment.
- Frozen archive semantics: sealed files are never edited, translated, or moved; links out of archived notes are never checked.
- GitHub heading-slug anchor matching for link fragments.
