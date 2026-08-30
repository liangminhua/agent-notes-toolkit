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
npx an ci-setup      # 探测 CI 供应商并生成 workflow(不覆盖现有文件)
npx an migrate       # 骨架随工具包版本升级,不碰 note 内容
npx an preset-install  # 把 AN 模式 preset 写进 $DSH_HOME/.agent-presets/an
```

`an verify` 由六个 gate 组成:`tree`(封闭 lifecycle/class 树)、`classification`(遗留路径)、`format`(头块 + 骨架 + alternatives)、`archive`(归档冻结哈希)、`links`(相对链接与锚点)、`wrap`(一段一行)。

## dsh 集成

```sh
dsh plugin --profile web add @liangminhua/dsh-an   # bundle:捆绑技能
an preset-install                                   # AN 模式出现在模式选择器
```

AN 模式是一个独立的 agent preset,与标准/PTC/创造模式隔离:只有它的会话获得 AN 技能与工具。

## 契约

详见 [SPEC.md](SPEC.md) 与 [.agents/notes/README.md](.agents/notes/README.md)。所有 gate 与 CLI 共享同一引擎;退出码 0/1 是 CI 的强制语言。

## 开发

```sh
npm install
npm test        # node:test 全套件
npm run verify  # 自托管:本仓库跑自己的 gates
```
