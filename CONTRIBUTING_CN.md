<div align="center">

# 🤝 参与 Open-RDMA 贡献

[**English**](CONTRIBUTING.md) | 简体中文

</div>

感谢你对 Open-RDMA 的关注！本文档说明代码分布在哪里、如何搭建可用的开发环境，以及如何让你的改动被合入。无论你是刚接触本项目的新人，还是有经验的开源贡献者，都可以从这里开始。

## 代码在哪里

`open-rdma/open-rdma`（即本仓库）是整个项目的入口：它承载项目介绍、项目矩阵与学习资料。真正的代码位于兄弟仓库中：

| 仓库 | 技术栈 | 你可以贡献什么 |
| --- | --- | --- |
| [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl) | Bluespec SystemVerilog | RTL 设计、仿真与验证 |
| [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | C（内核态）+ Rust（用户态） | 内核态驱动、用户态驱动、`rdma-core` 对接 |
| [open-rdma-dev-env](https://github.com/open-rdma/open-rdma-dev-env) | Docker + QEMU | 开发环境、工具链与上手体验 |
| [bluespec-lsp](https://github.com/open-rdma/bluespec-lsp) | Rust | Bluespec SystemVerilog 的 Language Server |
| [UCAgent](https://github.com/open-rdma/UCAgent) | Python | AI Agent 驱动的 RTL 验证、Cocotb 集成 |
| [cocotbext-pcie](https://github.com/open-rdma/cocotbext-pcie) | Python | 基于 Cocotb 的 PCIe 行为模型 |

对**本仓库**的改动绝大多数是文档性质的：修正不准确或过时的信息、保持中英文 README 同步、补充学习资料，或在有新仓库加入项目时更新项目矩阵。

## 🎓 学生上手路径

Open-RDMA 对初学者友好，社区中有大量高校学生与研究生。请根据你的背景选择对应方向，每个方向都给出了起始仓库和具体的第一步。

| 背景方向 | 从这里开始 | 建议的第一步 |
| --- | --- | --- |
| **硬件 / RTL**（FPGA、ASIC、数字电路设计） | [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl) | 先读懂 queue pair 与传输层模块，跑通已有仿真，再动手修改。 |
| **驱动 / 操作系统**（内核模块、用户态库） | [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | 用 `open-rdma-dev-env` 把环境跑起来，完整跑一遍 `tests/base_test/scripts/test_send_recv_sim.sh`。 |
| **验证**（仿真、形式化、CI） | [UCAgent](https://github.com/open-rdma/UCAgent) 与 [cocotbext-pcie](https://github.com/open-rdma/cocotbext-pcie) | 先复现一个已有测试，再补一个新的边界用例。 |
| **AI / 算法**（GPU 算子、推理框架、通信协议） | [open-rdma](https://github.com/open-rdma/open-rdma) 与 [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | 搭一个双端环境，体验 MRC 多路径传输，并把你踩到的坑记录下来——这份记录本身就是有价值的贡献。 |

如果还不确定从哪里入手，欢迎到
[Discussions](https://github.com/open-rdma/open-rdma/discussions) 发帖，介绍你的背景与兴趣。
说明你已经掌握的语言、工具与课程，维护者会为你推荐合适的 issue。

## 搭建开发环境

推荐使用 `open-rdma-dev-env` 容器，它把 Bluespec 编译器、Rust 工具链、`rdma-core` 以及 Open-RDMA 源码一并封装在 QEMU 虚拟机中：

```bash
git clone https://github.com/open-rdma/open-rdma-dev-env.git
cd open-rdma-dev-env
./quick-start.sh
```

前置条件是安装了 Docker 与 Docker Compose 的 Linux 主机。SSH 公钥配置、镜像源切换、本地构建镜像、代理配置与常见问题，请见
[`open-rdma-dev-env` README](https://github.com/open-rdma/open-rdma-dev-env)。

## 贡献流程

1. **Fork** 你要修改的仓库（`open-rdma` 组织下的仓库请 fork 到你自己的账号）。
2. **切分支**，从默认分支拉出——`open-rdma` 与 `open-rdma-dev-env` 使用 `master`，`open-rdma-rtl` 与 `open-rdma-driver` 使用 `dev`。分支名要有描述性，例如 `docs/fix-quickstart` 或 `fix/rq-retry-timeout`。
3. **保持改动聚焦**。小而聚焦的 PR 更容易被 review；无关改动请拆成多个 PR 或多个 commit。
4. **自行验证**。文档改动请渲染 Markdown 并逐个点开你改过的链接；代码改动请跑通既有测试，若确实无法运行，请在 PR 中说明原因。
5. **发起 Pull Request**，指向上游仓库的默认分支，并关联对应 issue（例如 `Closes #123`）。

## 提交信息规范

本项目的提交信息采用轻量的 conventional commit 风格，以类型前缀开头：

- `docs:` 文档改动
- `fix:` 缺陷修复
- `feat:` 新功能
- `refactor:` 不改变行为的结构调整
- `test:` 仅涉及测试
- `rtl:` 硬件 / RTL 改动

项目中中英文提交信息都有使用，选择你表达更清楚的一种即可，标题尽量控制在 72 个字符以内。

仓库历史中的真实示例：

```text
docs: use public Star history chart
docs: add MRC and GPU-friendly overview
fix intercept failure
RQ e2e fatal NAK
```

## Pull Request 自查清单

- [ ] 改动聚焦，标题能一句话说明白。
- [ ] 新增或修改的每个链接都能打开。
- [ ] 中英文文档同时更新（两者都存在时）。
- [ ] 涉及界面/视觉变化的，附上截图。
- [ ] 在描述里说明动机，而不只是让 reviewer 读 diff。

## 反馈缺陷与需求

- 🐛 [报告 Bug](https://github.com/open-rdma/open-rdma/issues/new?template=bug_report.md)
- 💡 [提出新功能](https://github.com/open-rdma/open-rdma/issues/new?template=feature_request.md)

请先搜索已有 issue，并说明问题属于哪个仓库或组件，以便我们转交给对应的维护者。

## 社区

- 💬 [GitHub Discussions](https://github.com/open-rdma/open-rdma/discussions) —— 提问、方案讨论与公告。

请保持尊重与建设性：社区中很多贡献者是在提交人生第一个 PR 的学生。

## 许可证

你提交的贡献将与所在仓库遵循同一开源许可协议。
