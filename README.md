# Dagflow

[![Npm package version](https://img.shields.io/npm/v/@zimtsui/dagflow?style=flat-square)](https://www.npmjs.com/package/@zimtsui/dagflow)

Dagflow 是一个专用于 Optimizer-Evaluator 设计模式的 AI 工作流编排器。

## Features

-   一个 Optimizer 可以被多个 Evaluator 评审
-   一个 Evaluator 可以评审多个 Optimizer。
-   Optimizer 可以反驳 Evaluator 的评审意见。

## Rationale

一个工作流是一个有向无环图，每个节点代表一个任务。每条边代表一个依赖关系，由前置任务指向后继任务。

后继节点知道前置节点的存在，但前置节点不知道后继节点的存在。

-   前置节点可以多次发布产品供后继节点使用。
-   后继节点可以向前置节点索取最新版本的产品。
-   如果后继节点觉得前置节点的产品不合格，可以打回去让前置节点修改。
-   如果前置节点觉得后继节点的拒绝理由不合理，可以反驳后继节点的拒绝。
-   如果前置节点觉得后继节点的拒绝理由合理，可以发布一个新版本的产品。
-   前置节点发布新版本的产品后，后继节点手上正在使用的旧版本产品都会触发过期事件，此时后继节点应当向前置节点重新索取最新版本的产品。

## Examples

### [Optimizer](./examples/optimize.ts)

### [Evaluator](./examples/evaluate.ts)

### [Workflow](./examples/workflow.ts)
