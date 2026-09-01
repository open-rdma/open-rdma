# Open RDMA RTL 硬件仿真项目安装

> **注意**：本文档描述的是独立的 `open-rdma-rtl` 硬件仿真项目，与 `open-rdma-driver` 项目位于不同仓库。

如果你当前是从 `open-rdma-driver` 的安装或测试文档跳转过来的，可以配合阅读：

- Driver 侧安装与使用说明：[installation.md](./installation.md)
- Driver 一键测试说明：[base_test 脚本运行指南](./open-rdma-driver/docs/zh-CN/test/base_test_guide.md)

关于 cocotb、BSV 编译、RTL 仿真器启动方式等更底层的 RTL 仿真细节，应以 `open-rdma-rtl` 仓库中的脚本和文档为准。

## 安装步骤

### 1. 克隆项目

**在你希望放置项目的目录下运行**：

```bash
git clone https://github.com/open-rdma/open-rdma-rtl.git
cd open-rdma-rtl
git checkout dev
```

### 2. 安装 BSC

**在 open-rdma-rtl 项目根目录下运行**：

```bash
./setup.sh  # 安装 bsc 并设置环境变量到 ~/.bashrc 中
```

**注意**：确认 bsc 版本与 Ubuntu 版本匹配（如 Ubuntu 22.04 需要 bsc-2023.01-ubuntu-22.04）。

### 3. 安装仿真依赖

**系统依赖**：

```bash
sudo apt install iverilog zlib1g-dev tcl8.6 libtcl8.6
```

从 GitHub 安装新版 Verilator（stable 分支）：

```bash
sudo apt install -y help2man
git clone https://github.com/verilator/verilator
cd verilator
git checkout stable
autoconf
./configure
make -j $(nproc)
sudo make install
cd ..
```

验证安装：

```bash
verilator --version
```

**Python 依赖**：

安装conda (其他python环境也可以)：

```bash
mkdir -p ~/miniconda3
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda3/miniconda.sh
bash ~/miniconda3/miniconda.sh -b -u -p ~/miniconda3
rm ~/miniconda3/miniconda.sh

source ~/miniconda3/bin/activate
conda init --all
```

推荐创建独立的 Python 环境，避免与系统环境或其他 `cocotb` 版本冲突：

```bash
conda create -n cocotb2 python=3.13
conda activate cocotb2
```

先安装 `cocotb` 的开发版（本文档当前使用 `cocotb` 仓库 `a18883468b7de9d4feca497c67db81faf392bdcf` 这个 commit）：

```bash
python -m pip install "cocotb @ git+https://github.com/cocotb/cocotb@a18883468b7de9d4feca497c67db81faf392bdcf"
```

再安装与当前仿真环境配套的 Python 依赖：

```bash
python -m pip install cocotb-test cocotbext-axi scapy
python -m pip install "cocotbext-pcie @ git+https://github.com/open-rdma/cocotbext-pcie"
```

可以用下面的命令检查安装结果：

```bash
python -m pip show cocotb cocotb-bus cocotbext-pcie cocotbext-axi cocotb-test
python -m pip check
cocotb-config --version
```

或者用如下命令检查安装结果：

```bash
pip list | grep cocotb
```

**说明**：

- 本文档使用 `cocotb` dev 版本，而不是 PyPI 上的稳定版 `1.9.2`
- 当前实测可安装的配套组合包括 `cocotb-bus 0.3.0`、`cocotbext-axi 0.1.28`、`cocotb-test 0.2.6`
- `cocotbext-pcie` 使用 open-rdma 特化版本：`https://github.com/open-rdma/cocotbext-pcie`
- 如果环境里曾安装过 `cocotb==1.9.2` 或其他旧版本，建议先在新环境中重新安装，避免残留依赖影响仿真
- 如果遇到 `VerilatedVpi::*` 编译错误或 `No GPI_USERS specified, exiting...`，请参考：[cocotb dev 环境中 GPI_USERS 与 Verilator 兼容性说明](../../../../open-rdma-driver/docs/zh-CN/detail/cocotb-gpi-users-and-verilator-compat.md)

**说明**：

- 使用 `verilator`（非 `iverilog`）进行仿真
- `tcl8.6` 和 `libtcl8.6` 是 BSC backend 编译所需

### 4. 编译 Backend

**在 open-rdma-rtl 项目根目录下运行**：

```bash
cd test/cocotb && make verilog
```

生成的 Verilog 文件位于 `backend/verilog/` 目录。

### 5. 运行系统级测试

**单卡回环测试**（推荐用于快速验证）：

**在 open-rdma-rtl 项目根目录下运行**：

```bash
cd test/cocotb
make run_system_test_server_loopback
```

**双卡测试**（需要两个终端同时运行）：

**终端 1（在 open-rdma-rtl 项目根目录下运行）**：

```bash
# 启动服务器 1 (INST_ID=1)
cd test/cocotb
make run_system_test_server_1
```

**终端 2（在 open-rdma-rtl 项目根目录下运行）**：

```bash
# 启动服务器 2 (INST_ID=2)
cd test/cocotb
make run_system_test_server_2
```

测试日志保存在 `test/cocotb/log/` 目录（`.loopback`、`.1`、`.2` 后缀）。

## 与 Open RDMA Driver 配合使用

需要先编译 driver 为 sim 模式，同时完成 driver 的其他设置。

**在 open-rdma-driver 项目根目录下运行**：

```bash
cd dtld-ibverbs
cargo build --no-default-features --features sim
cd ..
```

Open RDMA Driver 的 `sim` 模式需要先启动本项目的仿真器：

### 单端测试（loopback）

**终端 1（在 open-rdma-rtl 项目根目录下运行）**：

```bash
# 启动硬件仿真器
cd test/cocotb
make run_system_test_server_loopback
```

**终端 2（在 open-rdma-driver 项目根目录下运行）**：

```bash
# 运行驱动测试
cd examples
make
RUST_LOG=debug ./loopback 8192
```

### 双端测试（send_recv）

**终端 1（在 open-rdma-rtl 项目根目录下运行）**：

```bash
# 启动硬件仿真器1
cd test/cocotb
make run_system_test_server_1
```

**终端 2（在 open-rdma-rtl 项目根目录下运行）**：

```bash
# 启动硬件仿真器2
cd test/cocotb
make run_system_test_server_2
```

**终端 3（在 open-rdma-driver 项目根目录下运行）**：

```bash
# 编译并运行驱动测试 server
cd examples
make
RUST_LOG=debug ./send_recv 8192
```

**终端 4（在 open-rdma-driver 项目根目录下运行）**：

```bash
# 运行驱动测试 client
cd examples
RUST_LOG=debug ./send_recv 8192 127.0.0.1
```