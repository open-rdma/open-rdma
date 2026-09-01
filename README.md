<div align="center">

# 🚀 Open-RDMA

### A Full-Stack Open-Source High-Performance RDMA Hardware and Software Implementation, Focused on AI Applications, Committed to Surpassing Commercial Solutions

English | [**简体中文**](README_CN.md)

**Ideal for Researchers, University Students, and RDMA Beginners**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)]()
[![Platform](https://img.shields.io/badge/Platform-FPGA%20%7C%20Linux-orange.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

<img src="https://img.shields.io/github/stars/open-rdma/open-rdma?style=social" alt="GitHub stars">

---
## Why This Project

With the rapid development of AI large model technology, the high-performance networking provided by RDMA has become a critical component of AI infrastructure. However, RDMA technology born in the last century is difficult to fully adapt to today's AI computing scenarios: existing commercial RDMA solutions are constrained by legacy compatibility burdens and struggle to iterate quickly to meet AI demands; RDMA network cards as closed-source black-box products form a significant contradiction with the open-source AI large model software ecosystem. At a time when hardware-software co-optimization is increasingly important, black-box RDMA network cards have become a key bottleneck restricting global optimization of AI systems.

To address these issues, Pazhou Laboratory (Huangpu) and Datanlord jointly initiated the Open-RDMA open-source project. We deeply recognize that relying solely on a single research institution's strength is insufficient to complete the development and debugging of a full-stack system, let alone change the existing industry landscape. Therefore, we chose a full-stack open-source approach, starting from the dimensions of academic research and talent cultivation, leveraging open-source community power to lower the technical barrier of this specialized RDMA field, cultivate RDMA technical talent, enhance the brand influence of the Open-RDMA project community, and gradually expand Open-RDMA's industry influence in the entire RDMA field.

Whether you are a practitioner or student in hardware (FPGA, ASIC), software information technology (driver development, training/inference frameworks, communication protocols), or algorithms (GPU Kernel), you can find a technical direction aligned with your field in the Open-RDMA open-source project.

**Break the Black Box, Master the Network** | Complete Open-Source RDMA Technology Stack from RTL to Drivers

[🌟 Star Us](#-star-us) · [📖 Documentation](#) · [🚀 Quick Start](#-quick-start) · [🤝 Contributing](#-contributing)

</div>

## ⚡ GPU-Friendly Communication and Multipath Transport

OpenRDMA is a GPU-friendly RDMA design: the GPU submits only a short instruction, the NIC builds the full request, and data is transferred through the Multipath Reliable Connection (MRC) protocol. The figure below compares how OpenRDMA and existing RDMA solutions submit communication requests:

- **GPUDirect RDMA (GDR), orange path:** The CPU builds and submits the request.
- **InfiniBand GPUDirect Async (IBGDA), blue path:** The GPU builds and submits the request.
- **OpenRDMA, dark-blue path:** The GPU sends only a **minimal 8-byte Doorbell** to select a preconfigured operation; the NIC parses it and builds the full request.

<div align="center">
<a href="assets/openrdma-control-path-comparison.svg">
  <img src="assets/openrdma-control-path-comparison.svg" width="100%" alt="GDR, IBGDA, and OpenRDMA control paths for submitting a communication request">
</a>

<sub>GDR, IBGDA, and OpenRDMA control paths for submitting communication requests</sub>
</div>

**Multipath Reliable Connection (MRC)** is an open network protocol jointly developed by OpenAI, AMD, Broadcom, Microsoft, and NVIDIA. It allows packets from the same QP to use multiple Ethernet paths and handles out-of-order delivery, loss recovery, congestion, and path failures. OpenRDMA draws on these mechanisms to provide reliable multipath transport.

<table align="center">
<tr>
<td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:10px">

<div align="center">

### 🚀 We are hiring interns

**If you are interested in AI-Infra, whether GPU kernel optimization, inference framework optimization, high-performance networking, or RTL verification, feel free to send your resume to `info(at)datenlord.com`**

</div>

</td>
</tr>

<tr>
<td>
<div align="center">

## 📢 Recent Events

</div>

<div>

* **[2026-08-31] [Open-RDMA Project Surpasses 350 Stars](https://emanuelef.github.io/daily-stars-explorer/#/open-rdma/open-rdma)**
* **[2026-05-20] [Open-RDMA Project Surpasses 250 Stars](https://emanuelef.github.io/daily-stars-explorer/#/open-rdma/open-rdma)**
* **[2026-05-07] [Weekly Report #18 Released](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-05-07.md)**
* **[2026-04-09] [Weekly Report #14 Released](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-04-09.md)**
* **[2026-04-02] [Weekly Report #13 Released](https://github.com/open-rdma/open-rdma-driver/blob/dev/docs/zh-CN/records/weekly-report/2026-04-02.md)**

</div>
</td>
</tr>
</table>

---

## ✨ Highlights

<table>
<tr>
<td width="50%">

### 🔓 Fully Open Source
From RTL hardware design to Linux user-space drivers, every line of code is transparent and public

</td>
<td width="50%">

### ⚡ High Performance
Inspired by the MRC protocol, Ethernet-based with hardware-software co-design for ultra-low latency

</td>
</tr>
<tr>
<td width="50%">

### 🛠️ Deeply Customizable
FPGA-based, freely optimized for AI clusters, GPU communication, and other scenarios—no vendor lock-in

</td>
<td width="50%">

### 🤖 AI-First
From verification testing to AI-assisted development tools, accelerating AI infrastructure iteration through AI technology

</td>
</tr>
<tr>

<td width="50%">

### 🎓 Research-Friendly
Researchers can quickly customize experimental platforms based on this project to test novel congestion control algorithms and communication protocols

</td>
<td width="50%">

### 🌱 Beginner-Friendly
All materials publicly available with introductory guides, helping more newcomers become RDMA experts

</td>
</tr>
</table>


---
## 📦 Tech Stack

<div align="center">

[![Bluespec](https://img.shields.io/badge/Bluespec-Hardware%20RTL-0077b6)]()
[![C](https://img.shields.io/badge/C-Kernel%20Driver-555555)]()
[![Rust](https://img.shields.io/badge/Rust-User%20Driver-dea584)]()
[![CUDA](https://img.shields.io/badge/CUDA-GPU%20Kernel-76b900)]()
[![Python](https://img.shields.io/badge/Python-Inference%20%7C%20Verification-3776ab)]()

</div>

---
## 🧩 Project Matrix

<table>
<tr>
<td width="33%" align="center" valign="top">

### [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-rtl?style=social)](https://github.com/open-rdma/open-rdma-rtl)

Hardware RTL code for the open-rdma project

</td>
<td width="33%" align="center" valign="top">

### [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-driver?style=social)](https://github.com/open-rdma/open-rdma-driver)

Driver code including user-space and kernel-space drivers

</td>
<td width="33%" align="center" valign="top">

### [open-rdma-dev-env](https://github.com/open-rdma/open-rdma-dev-env)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/open-rdma-dev-env?style=social)](https://github.com/open-rdma/open-rdma-dev-env)

Setting up an environment from hardware simulation to software driver debugging and application development is no easy task, so we provide an out-of-the-box development environment.

</td>
</tr>
<tr>
<td width="33%" align="center" valign="top">

### [bluespec-lsp](https://github.com/open-rdma/bluespec-lsp)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/bluespec-lsp?style=social)](https://github.com/open-rdma/bluespec-lsp)

Language Server for Bluespec SystemVerilog, providing a smooth development experience for BSV projects.

</td>
<td width="33%" align="center" valign="top">

### [UCAgent (Fork)](https://github.com/open-rdma/UCAgent)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/UCAgent?style=social)](https://github.com/open-rdma/UCAgent)

An AI Agent-driven RTL verification framework launched by Beijing Institute of Open Source Chip, we added support for Cocotb test environment.

</td>
<td width="33%" align="center" valign="top">

### [cocotbext-pcie (Fork)](https://github.com/open-rdma/cocotbext-pcie)

[![GitHub stars](https://img.shields.io/github/stars/open-rdma/cocotbext-pcie?style=social)](https://github.com/open-rdma/cocotbext-pcie)

PCIe behavioral and simulation models based on Cocotb, we added Altera RTile support.

</td>
</tr>
</table>

---
## 📚 Learning Resources
### Bluespec SystemVerilog
* [MIT Course Study Guide (Chinese)](https://www.bilibili.com/video/BV1u8411i7Qw)
* [MIT 6.004 Lecture Videos](https://www.youtube.com/watch?v=n-YWa8hTdH8)
* [MIT 6.175 Course and Labs](https://csg.csail.mit.edu/6.175)
### RDMA
* [RDMA Overview (Chinese)](https://zhuanlan.zhihu.com/p/164908617)
### PCIe
* [A Practical Tutorial on PCIe for Total Beginners on Windows](https://ctf.re/windows/kernel/pcie/tutorial/2023/02/14/pcie-part-1/)
    * Although using Windows as an example, most content is platform-agnostic.
* [PCIe Deep Dive (Chinese)](https://www.zhihu.com/tardis/zm/art/447134701)

---

## 🚀 Quick Start

### One-Click Development Environment

We provide a ready-to-use Docker image for new users, containing all development tools and dependencies:

```bash
# Pull and start the image
docker run -it open-rdma/dev-env:latest

# Or use docker-compose
docker-compose up -d
```

<details>
<summary>📖 Detailed Installation Steps</summary>

```bash
# 1. Clone the repository
git clone https://github.com/open-rdma/open-rdma.git
cd open-rdma

# 2. Install dependencies
make deps

# 3. Build
make build

# 4. Run tests
make test
```

</details>


---

## 🤝 Contributing

We welcome all forms of contributions!

- 🐛 [Report a Bug](../../issues/new?template=bug_report.md)
- 💡 [Request a Feature](../../issues/new?template=feature_request.md)
- 📖 Improve documentation
- 🔧 Submit a Pull Request

See [Contributing Guide](CONTRIBUTING.md) for more details.

---

## 👥 Community

- 💬 [GitHub Discussions](../../discussions) - Questions and discussions

---

## 📜 License

This project is licensed under the [Apache 2.0 License](LICENSE).

---

<div align="center">

## 🌟 Star Us

If Open-RDMA helps you, or you believe in open-source spirit, please give us a ⭐️

**Let's build the world's leading open-source RDMA for AI project together!**

<img alt="Star History Chart" src="https://github.com/jzhg6/open-rdma/releases/download/star-history/star.png" width="657">

---

**Made with ❤️ by the Open-RDMA Community**

</div>
