# Agent Notes Toolkit (AN)

Agent Notes 机制的可移植工具包:决策记录树、校验门禁、脚手架 CLI、维护技能,以及 dsh 的 AN 模式 preset。

## 安装

```sh
npm install --save-dev @liangminhua/agent-notes-toolkit
```

## 使用

```sh
npx an init          # 生成 .agents/notes 骨架 + 种子 note + 版本钉扎
npx an verify        # 跑全部 gates;违规时退出码 1,每行一条违规
npx an ci-setup      # 探测 CI 供应商,写独立 workflow 文件(不覆盖现有配置)
npx an migrate       # 骨架随工具包版本升级,不碰 note 内容
npx an skills add <目录或 git 仓库>  # 拷贝技能到 .agents/skills(npx skills add 通道)
npx an preset-install  # 把 AN 模式 preset 写进 $DSH_HOME/.agent-presets/an
```

`an verify` 由六个 gate 组成:`tree`(封闭 lifecycle/class 树)、`classification`(遗留路径)、`format`(头块 + 骨架 + alternatives)、`archive`(归档冻结哈希)、`links`(相对链接与锚点)、`wrap`(一段一行)。GitHub 生成 `.github/workflows/agent-notes.yml`;GitLab 生成独立 `.gitlab/agent-notes.yml` 并在输出中给出 include 行。

## dsh 集成

```sh
dsh plugin --profile web add <仓库地址>   # bundle:AN 命令(/notes-init、/notes-verify、/ci-setup)
an preset-install                          # AN 模式出现在模式选择器
```

AN 模式是一个独立的 agent preset,与标准/PTC/创造模式隔离:只有它的会话获得 `notes-verify` 模型工具与 AN 技能(技能经工具的 runtime 注册单一投递,无第二通道)。模型工具/命令/CLI 共享同一引擎(`lib/engine.js`),会话内工具调用与 CI 执行的是同一套 gate 代码;bundle 自包含(vendor 同步 + 漂移守卫),不依赖工具包安装。

## 发布状态

npm publish 已 dry-run 通过(28 文件、27.1 kB);真实发布被本机 npm 未登录阻塞(`ENEEDAUTH`)。登录 `registry.npmjs.org` 后 `npm publish` 即可;GitHub 仓库本身(含 git 依赖安装路径)已可用。

## 契约

详见 [SPEC.md](SPEC.md) 与 [.agents/notes/README.md](.agents/notes/README.md)。所有 gate 与 CLI 共享同一引擎;退出码 0/1 是 CI 的强制语言。

## 开发

```sh
npm install
npm test        # node:test 全套件
npm run verify  # 自托管:本仓库跑自己的 gates
```
