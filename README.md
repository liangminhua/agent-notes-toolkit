# Agent Notes Toolkit (AN)

English | [中文](README.zh.md)

The portable Agent Notes mechanism: a decision-record tree, verification gates, a scaffolding CLI, maintenance skills, and the AN preset for dsh.

## Install

```sh
npm install --save-dev @liangminhua/agent-notes-toolkit
```

## Use

```sh
npx an init          # scaffold the .agents/notes skeleton + seed note + version pin
npx an verify        # run every gate; exit 1 with one violation per line on failure
npx an ci-setup      # detect the CI vendor and write a standalone workflow file (never overwrites)
npx an migrate       # re-scaffold skeleton files to match the toolkit version; note content untouched
npx an skills add <directory or git repo>  # copy skills into .agents/skills (the npx skills add channel)
npx an preset-install  # write the AN preset into $DSH_HOME/.agent-presets/an
```

`an verify` runs six gates: `tree` (closed lifecycle/class tree), `classification` (legacy paths), `format` (header block + skeleton + alternatives), `archive` (frozen archive seals), `links` (relative links and anchors), and `wrap` (one physical line per paragraph). GitHub gets `.github/workflows/agent-notes.yml`; GitLab gets a standalone `.gitlab/agent-notes.yml` include file with the include line printed.

## dsh integration

```sh
dsh plugin --profile web add <repo>   # bundle: AN commands (/notes-init, /notes-verify, /ci-setup)
an preset-install                      # the AN mode appears in the preset picker
```

AN mode is an isolated agent preset, separate from standard/ptc/cordis: only its sessions get the `notes-verify` model tool and the AN skills (skills arrive through the tool plugin's runtime registrations — one delivery channel, no second one). The model tool, the commands, and the CLI share one engine (`lib/engine.js`): in-session tool calls and CI execute the same gate code. The bundle is self-contained (vendor sync + drift guard) and does not depend on the toolkit being installed.

## Release status

npm publish passes dry-run (28 files, 27.1 kB); the real publish is blocked by missing npm auth on this machine (`ENEEDAUTH`). After logging in to `registry.npmjs.org`, `npm publish` is all that remains. The GitHub repository itself (including the git-dependency install path) is usable today.

## Contract

See [SPEC.md](SPEC.md) and the [Agent Note rules](scaffold/.agents/notes/README.md) (scaffolded into your project by `an init`). Every gate and CLI shares one engine; exit code 0/1 is the CI enforcement language.

## Development

```sh
npm install
npm test        # node:test full suite
npm run verify  # self-hosted: this repository runs its own gates
```
