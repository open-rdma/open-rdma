<div align="center">

# 🚀 Open-RDMA

## 一个全栈开源的高性能RDMA硬件和软件实现，专注AI应用，致力于超越商用方案

[**English**](README.md) | 简体中文

**适合科研人员、高校学生与RDMA领域新人**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
[![Platform](https://img.shields.io/badge/Platform-FPGA%20%7C%20Linux-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

<img src="https://img.shields.io/github/stars/open-rdma/open-rdma?style=social" alt="GitHub stars">

---
## 为什么要做这个项目

随着AI大模型技术的迅猛发展，RDMA技术所提供的高性能网络已成为AI基础设施的关键组成部分。然而，诞生于上世纪的RDMA技术难以完全适配当今的AI计算场景：现有商用RDMA方案受限于历史兼容性负担，难以快速迭代以满足AI需求；RDMA网卡作为闭源黑盒产品，与倡导开源的上层AI大模型软件生态形成显著矛盾。在软硬件协同优化日益重要的当下，黑盒RDMA网卡已成为制约AI系统全局优化的关键瓶颈。

针对上述问题，琶洲实验室（黄埔）联合达坦科技共同发起Open-RDMA开源项目。我们深刻认识到，仅凭单一科研机构的力量难以完成全栈系统的开发与调试，更难以改变既有的产业格局。因此，我们选择以全栈开源的路径，首先从学术研究与人才培养维度切入，依托开源社区力量，降低RDMA这一专业领域的技术门槛，培育RDMA技术人才队伍，提升Open-RDMA项目社区的品牌影响力，逐步扩大Open-RDMA项目在整个RDMA领域的行业影响力。

无论您是硬件领域（FPGA、ASIC）、软件信息技术领域（驱动开发、训练推理框架、通信协议）还是算法领域（GPU Kernel）的从业者或在校生，均可在Open-RDMA开源项目中找到与自身领域契合的技术方向。

**打破黑盒，掌控网络** | 从 RTL 到驱动的完整开源 RDMA 技术栈

[🌟 给个 Star](#-给个-star) · [📖 文档](#) · [🚀 快速开始](#-快速开始) · [🤝 参与贡献](#-参与贡献)

</div>

## ⚡ GPU-Friendly 通信与多路径传输

OpenRDMA 是一种 GPU-friendly 的 RDMA 设计：GPU 只提交一条简短指令，由网卡生成完整请求，并通过多路径可靠传输协议（MRC）完成数据传输。下图为 OpenRDMA 与现有 RDMA 方案中通信请求提交方式的对比：

- **GPUDirect RDMA（GDR） 橙色路径：** CPU 构造并提交请求。
- **InfiniBand GPUDirect Async（IBGDA）蓝色路径：** GPU 构造并提交请求。
- **OpenRDMA 深蓝色路径：** GPU 发送一个**极简 8-byte Doorbell** 来选择预配置操作；NIC 解析后生成完整请求。

<div align="center">
<a href="assets/openrdma-control-path-comparison.svg">
  <img src="assets/openrdma-control-path-comparison.svg" width="100%" alt="GDR、IBGDA 与 OpenRDMA 在提交通信请求时的控制路径对比">
</a>

<sub>GDR、IBGDA 与 OpenRDMA 在提交通信请求时的控制路径对比</sub>
</div>

**Multipath Reliable Connection（MRC）** 是由 OpenAI、AMD、Broadcom、Microsoft 和 NVIDIA 联合开发的开放网络协议，能够让同一 QP 的 packet 使用多条 Ethernet 路径，并处理乱序、丢包恢复、拥塞与路径故障。OpenRDMA 借鉴这些机制来实现可靠的多路径传输。

<table align="center">
<tr>
<td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:10px">

<div align="center">

### 🚀 我们正在招募实习生

**如果您对 AI-Infra 感兴趣，无论是 GPU 算子优化、推理框架优化、高性能网络、RTL 验证，都可以投递简历到 `info(at)datenlord.com`**

</div>

</tr>

<tr>
<td>
<div align="center">

## 📢 近期事件

</div>

<div>

* **[2026-08-31] [open-rdma项目Star数量突破350](https://github.com/jzhg6/open-rdma/releases/download/star-history/star.png)**
* **[2026-05-20] [open-rdma项目Star数量突破250](https://emanuelef.github.io/daily-stars-explorer/#/open-rdma/open-rdma)**
* **[2026-05-07] [开源周报第18期发布](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-05-07.md)**
* **[2026-04-09] [开源周报第14期发布](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-04-09.md)**
* **[2026-04-02] [开源周报第13期发布](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-04-02.md)**

</div>
</td>
</tr>
</table>

---

## ✨ 项目亮点

<table>
<tr>
<td width="50%">

### 🔓 完全开源
从 RTL 硬件设计到 Linux 用户态驱动，每一行代码都公开透明

</td>
<td width="50%">

### ⚡ 高性能
受 MRC 协议启发，基于以太网，软硬件协同设计实现极致低延迟

</td>
</tr>
<tr>
<td width="50%">

### 🛠️ 深度可定制
基于FPGA，针对 AI 集群、GPU 通信等场景自由优化，告别厂商锁定

</td>
<td width="50%">

### 🤖 全面拥抱AI
从验证测试到辅助开发工具，通过AI技术加速AI基础设置的迭代

</td>
</tr>
<tr>

<td width="50%">

### 🎓 学术科研友好
研究人员可以基于本项目快速定制实验平台，对新型拥塞控制算法、通信协议等进行测试

</td>
<td width="50%">

### 🌱 初学者友好
公开全部资料，配有入门指导，助力更多小白成为RDMA专家

</td>
</tr>
</table>


---
## 📦 技术栈

<div align="center">

[![Bluespec](https://img.shields.io/badge/Bluespec-硬件%20RTL-0077b6)]()
[![C](https://img.shields.io/badge/C-内核态驱动-555555)]()
[![Rust](https://img.shields.io/badge/Rust-用户态驱动-dea584)]()
[![CUDA](https://img.shields.io/badge/CUDA-通算融合算子-76b900)]()
[![Python](https://img.shields.io/badge/Python-推理%20%7C%20验证-3776ab)]()

</div>

---
## 🧩 项目矩阵

<table>
<tr>
<td width="33%" align="center" valign="top">

### [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-rtl?style=social)](https://github.com/open-rdma/open-rdma-rtl)

open-rdma项目的硬件RTL代码

</td>
<td width="33%" align="center" valign="top">

### [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-driver?style=social)](https://github.com/open-rdma/open-rdma-driver)

open-rdma项目的驱动代码，包含用户态驱动和内核态驱动

</td>
<td width="33%" align="center" valign="top">

### [open-rdma-dev-env](https://github.com/open-rdma/open-rdma-dev-env)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-dev-env?style=social)](https://github.com/open-rdma/open-rdma-dev-env)

搭建从硬件仿真到软件驱动调试再到上层应用开发的环境，这绝非易事，因此我们提供了一个开箱即用的开发环境。

</td>
</tr>
<tr>
<td width="33%" align="center" valign="top">

### [bluespec-lsp](https://github.com/open-rdma/bluespec-lsp)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/bluespec-lsp?style=social)](https://github.com/open-rdma/bluespec-lsp)

Bluespec SystemVerilog的Language Server，为BSV项目开发提供丝滑体验。

</td>
<td width="33%" align="center" valign="top">

### [UCAgent (Fork)](https://github.com/open-rdma/UCAgent)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/UCAgent?style=social)](https://github.com/open-rdma/UCAgent)

由北京开源芯片研究院推出的AI Agent驱动的RTL验证框架，我们为其添加了对Cocotb测试环境的支持。

</td>
<td width="33%" align="center" valign="top">

### [cocotbext-pcie (Fork)](https://github.com/open-rdma/cocotbext-pcie)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/cocotbext-pcie?style=social)](https://github.com/open-rdma/cocotbext-pcie)

基于Cocotb的PCIe行为及仿真模型，我们为其添加了Altera RTile的支持。

</td>
</tr>
</table>

---
## 📚 相关领域学习资源
### Bluespec SystemVerilog
* [MIT 公开课学习指引](https://www.bilibili.com/video/BV1u8411i7Qw)
* [MIT 6.004 公开课](https://www.youtube.com/watch?v=n-YWa8hTdH8)
* [MIT 6.175 公开课及课程实验](https://csg.csail.mit.edu/6.175)
### RDMA
* [RDMA杂谈专栏](https://zhuanlan.zhihu.com/p/164908617)
### PCIe
* [A Practical Tutorial on PCIe for Total Beginners on Windows ](https://ctf.re/windows/kernel/pcie/tutorial/2023/02/14/pcie-part-1/)
    * 虽然以windows为例，但绝大多数内容与平台无关。
* [知乎:可以学习 1W 小时的 PCIe](https://www.zhihu.com/tardis/zm/art/447134701)

---

## 🚀 快速开始

### 一键启动开发环境

我们为新用户准备了开箱即用的 Docker 镜像，包含所有开发工具和依赖：

```bash
# 拉取镜像并启动
docker run -it open-rdma/dev-env:latest

# 或使用 docker-compose
docker-compose up -d
```

<details>
<summary>📖 详细安装步骤</summary>

```bash
# 1. 克隆仓库
git clone https://github.com/open-rdma/open-rdma.git
cd open-rdma

# 2. 安装依赖
make deps

# 3. 编译
make build

# 4. 运行测试
make test
```

</details>


---

## 🤝 参与贡献

我们欢迎所有形式的贡献！

- 🐛 [报告 Bug](../../issues/new?template=bug_report.md)
- 💡 [提出新功能](../../issues/new?template=feature_request.md)
- 📖 改进文档
- 🔧 提交 Pull Request

查看 [贡献指南](CONTRIBUTING.md) 了解更多。

---

## 👥 社区

- 💬 [GitHub Discussions](../../discussions) - 问题和讨论

---

## 📜 许可证

本项目采用 [Apache 2.0 License](LICENSE) 开源协议。

---

<div align="center">

## 🌟 给个 Star

如果 Open-RDMA 对你有帮助，或者你认同开源精神，请给我们一个 ⭐️

**让我们共同构建出世界领先的 开源 RDMA for AI 项目！**

<img alt="Star History Chart" src="https://github.com/jzhg6/open-rdma/releases/download/star-history/star.png" width="657">

---

**Made with ❤️ by the Open-RDMA Community**

</div>
