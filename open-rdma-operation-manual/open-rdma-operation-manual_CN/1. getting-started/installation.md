# Open RDMA Driver 安装指南

本文档提供 Open RDMA Driver 的快速安装步骤。详细技术细节和故障排除请参考 [detail](../../../../open-rdma-driver/docs/zh-CN/detail/) 文件夹中的文档。

如果你当前关注的是 RTL 仿真或 driver 侧一键测试入口，建议同时阅读：

- [RTL 仿真说明](./rtl-simulation.md)
- [base_test 脚本运行指南](../../../../open-rdma-driver/docs/zh-CN/test/base_test_guide.md)

## 环境要求

- Linux 系统（支持 WSL2）
- Rust 工具链
- 内核版本 >= 6.6（WSL 需要自行编译内核模块）

## 安装步骤

### 1. 安装 Rust 工具链

**在任意目录下运行**：

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. 安装系统依赖

**在任意目录下运行**：

```bash
sudo apt install cmake pkg-config libnl-3-dev libnl-route-3-dev libclang-dev libibverbs-dev
```

### 3. 克隆项目并初始化子模块

**在你希望放置项目的目录下运行**（建议使用较短路径如 `/home/user/`）：

```bash
git clone --recursive https://github.com/open-rdma/open-rdma-driver.git
cd open-rdma-driver
git checkout dev

# 如果克隆时未使用 --recursive，可以手动初始化
git submodule update --init --recursive
```

**注意**：项目路径不宜过长，建议使用 `/home/user/open-rdma-driver` 而非深层嵌套路径。详见：[路径长度问题](../../../../open-rdma-driver/docs/zh-CN/detail/path-length-issue.md)

### 4. 编译并加载驱动模块

**WSL2 环境**需要先准备内核头文件，详细步骤请参考：[WSL2 内核头文件准备指南](../../../../open-rdma-driver/docs/zh-CN/detail/wsl-kernel-headers.md)，或者可以使用 `make KBUILD_MODPOST_WARN=1` 跳过使用内核头文件，但有一定风险

**在 open-rdma-driver 项目根目录下运行**：

```bash
# 编译驱动
make

# 如果 BTF 生成失败（常见于 WSL），可使用：
# make KBUILD_MODPOST_WARN=1

# 加载驱动模块，重启后需要执行这条命令以重新加载驱动
sudo make install
```

**在任意目录下运行，验证驱动加载成功**：

```bash
lsmod | grep bluerdma
# 应显示：bluerdma
```

### 5. 配置网络接口

为 Open RDMA 虚拟网络接口分配 IP 地址。

**在任意目录下运行**：

```bash
sudo ip addr add 17.34.51.10/24 dev blue0
sudo ip addr add 17.34.51.11/24 dev blue1
```

**在任意目录下运行，验证配置**：

```bash
ip addr show blue0
ip addr show blue1

# 仿真模式下可能需要关闭网卡来防止配置被清空，目前不清楚原理。Mock模式无需操作这一步。
sudo ip link set dev blue0 down
sudo ip link set dev blue1 down
```

看到 inet 与 inet6 即为成功。

### 6. 分配大页内存

Open RDMA Driver 需要使用大页内存。使用提供的脚本分配 512 MB 大页。

**在 open-rdma-driver 项目根目录下运行**：

```bash
sudo ./scripts/hugepages.sh alloc 512
```

**在任意目录下运行，验证分配成功**：

```bash
cat /proc/meminfo | grep Huge
```

### 7. 编译用户态库（dtld-ibverbs）

根据使用场景选择编译模式：

**Mock 模式（推荐用于开发测试）**：

**在 open-rdma-driver 项目根目录下运行**：

```bash
cd dtld-ibverbs
cargo build --no-default-features --features mock
cd ..
```

- 不依赖真实硬件或仿真器
- 适合快速开发和功能测试
- 性能测试结果不真实

**Sim 模式（用于 RTL 仿真器调试）**：

**在 open-rdma-driver 项目根目录下运行**：

```bash
cd dtld-ibverbs
cargo build --no-default-features --features sim
cd ..
```

- 需要先启动 RTL 仿真器（open-rdma-rtl 项目的仿真器）
- 用于硬件逻辑验证
- 推荐先阅读本仓库的 [RTL 仿真说明](../../../../open-rdma-driver/docs/zh-CN/rtl-simulation.md)，再根据其中链接进入 `open-rdma-rtl` 项目文档
- 如果希望直接使用 driver 侧自动化脚本运行 sim 测试，另请参考 [base_test 脚本运行指南](../../../../open-rdma-driver/docs/zh-CN/test/base_test_guide.md)
- 在运行测试前必须在单独的终端启动仿真器（参见 open-rdma-rtl 项目文档）

**硬件模式（hw）**：

**在 open-rdma-driver 项目根目录下运行**：

```bash
cd dtld-ibverbs
cargo build --no-default-features --features hw
cd ..
```

- ⚠️ **注意**：硬件模式尚未完全测试，可能存在问题
- 仅在有真实硬件设备时使用

### 8. 编译 rdma-core

**在 open-rdma-driver 项目根目录下运行**：

```bash
cd dtld-ibverbs/rdma-core-55.0

# 基本编译
./build.sh

# 如需生成 compile_commands.json 用于调试：
# export EXTRA_CMAKE_FLAGS=-DCMAKE_EXPORT_COMPILE_COMMANDS=1
# ./build.sh

cd ../..
```

**常见问题**：如果编译在 81% 左右失败，提示 "size of unnamed array is negative"，这是路径过长导致的。请参考：[路径长度问题详解](../../../../open-rdma-driver/docs/zh-CN/detail/path-length-issue.md)

### 9. 设置环境变量

**方法一：永久设置（推荐）**

直接将环境变量添加到 `~/.bashrc`，使其在每次打开终端时自动加载。

**在 open-rdma-driver 项目根目录下运行**：

```bash
# 添加到 .bashrc
cat >> ~/.bashrc << EOF

# Open RDMA Driver Environment
if [ -z "\$LD_LIBRARY_PATH" ]; then
    export LD_LIBRARY_PATH="$(pwd)/dtld-ibverbs/target/debug:$(pwd)/dtld-ibverbs/rdma-core-55.0/build/lib"
else
    export LD_LIBRARY_PATH="$(pwd)/dtld-ibverbs/target/debug:$(pwd)/dtld-ibverbs/rdma-core-55.0/build/lib:\$LD_LIBRARY_PATH"
fi
EOF

# 立即生效
source ~/.bashrc
```

**方法二：临时设置（仅当前终端）**

**在 open-rdma-driver 项目根目录下运行**：

```bash
# 使用提供的脚本
source ./scripts/setup-env.sh

# 或手动设置
export LD_LIBRARY_PATH=$PWD/dtld-ibverbs/target/debug:$PWD/dtld-ibverbs/rdma-core-55.0/build/lib
```

### 10. 验证安装

#### 方法一：使用自动化测试框架（推荐用于 Sim 模式）

Open RDMA Driver 提供了自动化测试框架，可以自动启动 RTL 仿真器、编译驱动和测试程序、运行测试并收集日志。测试框架位于 `tests/base_test/` 目录。

**环境准备**：

测试框架需要访问 RTL 仿真器代码（`open-rdma-rtl` 仓库）。有两种方式配置 RTL 路径：

**方式 1：使用默认路径（推荐）**

将 `open-rdma-rtl` 仓库克隆到与 `open-rdma-driver` 同级目录：

**在父目录下运行**（如果已在 `open-rdma-driver` 目录，先 `cd ..`）：

```bash
git clone https://github.com/open-rdma/open-rdma-rtl.git
```

目录结构应该是：

```
parent-directory/
├── open-rdma-driver/
└── open-rdma-rtl/
```

**方式 2：自定义 RTL 路径**

如果 RTL 仓库在其他位置，可以设置 `RTL_DIR` 环境变量：

**在运行测试前设置**：

```bash
export RTL_DIR="/path/to/your/open-rdma-rtl"
```

或在每次运行测试时指定：

```bash
RTL_DIR="/path/to/your/open-rdma-rtl" ./scripts/test_loopback_sim.sh
```

**运行测试**：

**在 open-rdma-driver/tests/base_test 目录下运行**：

```bash
# 进入测试目录
cd tests/base_test

# 运行单个测试
./scripts/test_loopback_sim.sh 4096              # Loopback 测试
./scripts/test_send_recv_sim.sh 4096             # Send/Recv 测试
./scripts/test_rdma_write_sim.sh 4096 5          # RDMA Write 测试（5 轮）
./scripts/test_write_imm_sim.sh 4096             # Write with Immediate 测试

# 运行所有测试
./scripts/run_all_tests.sh

# 可以通过环境变量 BLUERDMA_SIM_BACKEND 指定 cocotb 使用的仿真后端，支持：iverilog 与 verilator
# BLUERDMA_SIM_BACKEND=iverilog ./test_loopback_sim.sh 4096
# 如果未显式设置，默认仿真后端为 verilator。
```



测试日志会自动保存在 `tests/base_test/log/sim/` 目录下，可以查看详细的测试输出和 RTL 仿真器日志。

**查看测试日志**：

```bash
# 查看 loopback 测试日志
cat log/sim/rtl-loopback.log

# 查看 send_recv 测试的 server 日志
cat log/sim/send_recv/server.log

# 查看 send_recv 测试的 client 日志
cat log/sim/send_recv/client.log
```

测试 `test_loopback_sim.sh 4096` 时如遇到 blue 虚拟网卡的 IPv4 地址在测试过程中或环境重置后丢失报错，需要重新执行 `sudo ip addr add 17.34.51.10/24 dev blue0` 和 `sudo ip addr add 17.34.51.11/24 dev blue1` 两条命令重新配置，之后再次执行测试命令。

**注意**：自动化测试框架会：

- 自动编译 Rust 驱动（sim 模式）
- 自动启动和停止 RTL 仿真器
- 自动编译测试程序
- 自动运行 server 和 client
- 收集所有日志到指定目录

#### 方法二：手动运行示例程序

**在 open-rdma-driver 项目根目录下运行，编译示例程序**：

```bash
cd examples
make
```

**运行示例程序**：

根据编译时选择的模式运行：

##### Mock 模式

**单端回环测试（loopback）**：

**在 open-rdma-driver/examples 目录下运行**：

```bash
./loopback 8192
```

**双端测试（send_recv）**：

**终端 1（在 open-rdma-driver/examples 目录下运行）**：

```bash
# 启动服务端
./send_recv 8192
```

**终端 2（在 open-rdma-driver/examples 目录下运行）**：

```bash
# 启动客户端，连接到本地服务端
./send_recv 8192 127.0.0.1
```

##### Sim 模式

**单端回环测试（loopback）**：

```bash
# 1. 先在单独的终端启动仿真器（在 open-rdma-rtl 项目中）
# 具体启动命令请参见 open-rdma-rtl 项目的文档

# 2. 在 open-rdma-driver/examples 目录下运行测试
./loopback 8192
```

**双端测试（send_recv）**：
需要分别启动两个不同的仿真器实例（参见 open-rdma-rtl 项目文档），然后运行：

**终端 3（在 open-rdma-driver/examples 目录下运行）**：

```bash
./send_recv 8192
```

**终端 4（在 open-rdma-driver/examples 目录下运行）**：

```bash
./send_recv 8192 127.0.0.1
```

##### 调试选项

**如需查看详细日志，可添加环境变量**：

```bash
RUST_LOG=debug ./loopback 8192
# 或
RUST_LOG=debug ./send_recv 8192
```

成功运行将显示 RDMA 操作的输出。

## 快速命令总结

**注意**：以下命令需要在特定目录下运行，请注意目录说明。

```bash
# 1. 环境准备（在任意目录下运行）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sudo apt install cmake pkg-config libnl-3-dev libnl-route-3-dev libclang-dev libibverbs-dev

# 2. 克隆项目（在你希望放置项目的目录下运行，建议使用较短路径）
git clone --recursive https://github.com/open-rdma/open-rdma-driver.git
cd open-rdma-driver
git checkout dev

# ========== 以下命令在 open-rdma-driver 项目根目录下运行 ==========

# 3. 编译并加载驱动（WSL2 需要先准备内核头文件）
make && sudo make install

# 4. 配置网络（在任意目录下运行）
sudo ip addr add 17.34.51.10/24 dev blue0
sudo ip addr add 17.34.51.11/24 dev blue1

# 5. 分配大页
sudo ./scripts/hugepages.sh alloc 512

# 6. 编译用户态库（选择模式：mock/sim/hw）
# Mock 模式（推荐）：
cd dtld-ibverbs && cargo build --no-default-features --features mock && cd ..
# Sim 模式（需要先启动仿真器）：
# cd dtld-ibverbs && cargo build --no-default-features --features sim && cd ..
# 硬件模式（未测试）：
# cd dtld-ibverbs && cargo build --no-default-features --features hw && cd ..

# 7. 编译 rdma-core
cd dtld-ibverbs/rdma-core-55.0 && ./build.sh && cd ../..

# 8. 设置环境变量（永久）- 在 open-rdma-driver 项目根目录下运行
cat >> ~/.bashrc << EOF

# Open RDMA Driver Environment
if [ -z "\$LD_LIBRARY_PATH" ]; then
    export LD_LIBRARY_PATH="$(pwd)/dtld-ibverbs/target/debug:$(pwd)/dtld-ibverbs/rdma-core-55.0/build/lib"
else
    export LD_LIBRARY_PATH="$(pwd)/dtld-ibverbs/target/debug:$(pwd)/dtld-ibverbs/rdma-core-55.0/build/lib:\$LD_LIBRARY_PATH"
fi
EOF
source ~/.bashrc

# 9. 运行示例 - 在 open-rdma-driver 项目根目录下运行
cd examples && make && ./loopback 8192

# 10. (可选) 克隆 RTL 仓库用于自动化测试
cd .. && git clone https://github.com/open-rdma/open-rdma-rtl.git
```

## 常见问题

### Q1: rdma-core 编译在 81% 时失败

**原因**：项目路径过长，导致 Unix socket 路径超出限制。
**解决**：将项目移至较短路径（如 `/home/user/open-rdma-driver`）。
**详见**：[路径长度问题](../../../../open-rdma-driver/docs/zh-CN/detail/path-length-issue.md)

### Q2: 找不到 `infiniband/verbs_api.h`

**原因**：缺少 `libibverbs-dev` 包。
**解决**：`sudo apt install libibverbs-dev`

### Q3: WSL 下驱动编译失败，提示找不到内核头文件

**原因**：WSL 默认不提供内核头文件。
**解决**：参考步骤 3，编译 WSL2 内核并链接头文件。
**详见**：[WSL2 内核头文件准备指南](../../../../open-rdma-driver/docs/zh-CN/detail/wsl-kernel-headers.md)

### Q4: 运行示例时没有发现RDMA devices，或者提示找不到共享库

**原因**：可能是未设置 `LD_LIBRARY_PATH`。
**解决**：执行 `source ./scripts/setup-env.sh`

### Q5: OFED 与 vanilla RDMA 冲突

**详见**：[切换到 vanilla RDMA](../../../../open-rdma-driver/docs/zh-CN/detail/switch-to-vanilla-rdma.md)

### Q6: 如何选择编译模式（mock/sim/hw）？

**Mock 模式**：推荐用于开发和功能测试，不需要硬件或仿真器
**Sim 模式**：用于 RTL 仿真验证，需要先启动仿真器
**硬件模式**：仅在有真实硬件设备时使用，⚠️ 目前尚未完全测试

### Q7：blue 虚拟网卡的 IPv4 地址在测试过程中或环境重置后丢失

测试 `test_loopback_sim.sh 4096` 时如遇到 blue 虚拟网卡的 IPv4 地址在测试过程中或环境重置后丢失报错，需要重新执行 `sudo ip addr add 17.34.51.10/24 dev blue0` 和 `sudo ip addr add 17.34.51.11/24 dev blue1` 两条命令重新配置，之后再次执行测试命令。

### Q8: Sim 模式下示例程序无法运行

**原因**：未启动 RTL 仿真器
**解决**：

1. **推荐方式**：使用自动化测试框架（参见步骤 10 方法一），它会自动启动和管理 RTL 仿真器
2. **手动方式**：在单独的终端启动仿真器（参见 open-rdma-driver 项目的安装文档）后再执行测试程序

### Q9: 自动化测试提示 "RTL directory not found"

**原因**：未正确配置 RTL 仓库路径
**解决**：

1. **方式一**：将 `open-rdma-rtl` 仓库克隆到 `open-rdma-driver` 的同级目录：

   ```bash
   cd /path/to/parent-directory
   git clone https://github.com/open-rdma/open-rdma-rtl.git
   ```

2. **方式二**：设置环境变量 `RTL_DIR` 指向你的 RTL 仓库路径：

   ```bash
   export "RTL_DIR=/path/to/your/open-rdma-rtl"
   ```

## 相关文档

- [WSL2 内核头文件准备指南](../../../../open-rdma-driver/docs/zh-CN/detail/wsl-kernel-headers.md)
- [路径长度问题详解](../../../../open-rdma-driver/docs/zh-CN/detail/path-length-issue.md)
- [OFED 符号版本修复](../../../../open-rdma-driver/docs/zh-CN/detail/ofed-symbol-version-fix.md)
- [OFED RoCE 注册问题](../../../../open-rdma-driver/docs/zh-CN/detail/ofed-roce-registration-issue.md)
- [切换到 vanilla RDMA](../../../../open-rdma-driver/docs/zh-CN/detail/switch-to-vanilla-rdma.md)
- [自动化测试框架说明](../../../../open-rdma-driver/docs/zh-CN/test/base_test_guide.md)
- [测试脚本使用指南](../../../../open-rdma-driver/tests/base_test/scripts/README.md)