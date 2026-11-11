# Blue RDMA Rust 驱动 - 项目介绍

## 概述

rust-driver 是用 Rust 编写的核心 RDMA（远程直接内存访问）驱动实现。它作为高性能库通过 FFI（外部函数接口）与标准 libibverbs 框架集成，为 Blue RDMA 硬件提供基于 Rust 的 RDMA verbs 实现。

该驱动支持三种运行模式以适应不同的开发场景：

- **硬件模式** (`--features hw`)：使用物理 PCIe RDMA 设备
- **仿真模式** (`--features sim`)：通过 UDP 和 TCP 通信使用 RTL 仿真器进行硬件仿真测试
- **Mock 模式** (`--features mock`)：无需外部依赖的纯软件测试

## 项目结构

### 核心模块

#### `verbs/` - RDMA Verbs API 层

实现与 libibverbs 兼容的 RDMA verbs 接口：

- `ffi.rs`：C ABI 导出函数，供 libibverbs 动态加载
- `ctx.rs`：`HwDeviceCtx` - 核心设备上下文，管理 RDMA 操作
- `dev.rs`：设备初始化（硬件模式使用 `PciHwDevice`，仿真模式使用 `EmulatedHwDevice`）
- `mock.rs`：`MockDeviceCtx` - Mock 模式的设备上下文实现（与 `HwDeviceCtx` 同级）

#### `csr/` - 控制与状态寄存器访问

提供跨不同模式统一 CSR 访问的硬件抽象层：

- `device_adaptor.rs`：核心 `DeviceAdaptor` trait，定义 CSR 读写接口
- `ring_specs.rs`：各个硬件环形队列的规格定义（SendRing、CmdReqRing、MetaReportRing 等）
- `hardware.rs`：硬件模式 CSR 访问实现，通过 `/dev/mem` 或 VFIO 进行 PCIe MMIO 访问
- `emulated.rs`：仿真模式 CSR 访问实现，基于 UDP RPC 与 RTL 仿真器通信（端口 7701/7702）
- `mode.rs`：设备运行模式配置（100G/200G/400G）

泛型 `Ring<Dev, Spec>` 模式提供类型安全的环形缓冲区操作，具有编译时方向检查。

#### `mem/` - 内存管理 （目前较为混乱）

DMA 缓冲区分配和虚拟到物理地址转换：

- `virt_to_phy.rs`：地址转换实现
  - `PhysAddrResolverLinuxX86`：硬件和仿真模式都使用 `/proc/self/pagemap` 来获取 MR（Memory Region）的物理地址
  - 注：仿真模式下，ringbuf 的"物理地址"直接使用虚拟地址假装，传递给仿真器
- `pa_va_map.rs`：双向物理-虚拟地址映射，用于 sim 模式下仿真器访问主机内存

支持 4KB 和 2MB 大页（默认：2MB 以获得最佳性能），但页面大小在编译时通过 features 固定，未来可能需要支持运行时配置

#### `workers/` - 后台处理线程（核心业务逻辑）

RDMA 操作的异步处理工作线程：

- `completion.rs`：完成队列（CQ）事件处理，向应用层报告操作完成状态
- `send/`：发送工作请求处理流水线，将 Send WR 转换为硬件描述符
- `rdma.rs`：RDMA Read/Write/Atomic 操作的工作线程
- `retransmit.rs`：数据包重传逻辑和超时处理
- `ack_responder.rs`：ACK 数据包生成和响应处理
- `qp_timeout.rs`：队列对（QP）超时管理
- `meta_report/`：元数据报告处理，从硬件提取 BTH/RETH 包头信息
- `spawner.rs`：工作线程生命周期管理

#### `ringbuf/` - 环形缓冲区抽象

通用描述符环形缓冲区管理（注：抽象设计可能需要改进）：

- `desc.rs`：描述符序列化/反序列化 trait 定义
- `dma_rb.rs`：基于 DMA 的环形缓冲区实现，使用头尾指针进行生产者-消费者同步

#### 支持模块

- `config.rs`：设备配置加载器（从 `/etc/bluerdma/config.toml` 读取）
- `constants.rs`：全局常量和硬件地址定义
- `memory_proxy_simple.rs`：仿真模式 DMA 访问的内存代理 TCP 服务器

## 运行模式

### 硬件模式 (`--features hw`)

生产环境使用物理 RDMA 硬件：

- **CSR 访问**：通过 `/dev/mem`（SysfsPci）或 VFIO 进行直接 PCIe MMIO 访问
- **设备类型**：`PciHwDevice`（使用 `pci-driver` crate）
- **地址转换**：通过 `/proc/self/pagemap` 读取 Linux 页表获取物理地址
- **网络接口**：通过 TAP 设备集成真实网络栈
- **内存管理**：使用 `mlock()` 锁定 DMA 缓冲区防止换页

### 仿真模式 (`--features sim`)

与 RTL 仿真器协同进行硬件验证：

- **CSR 访问**：通过 UDP RPC 与仿真器通信（端口 7701/7702）
- **设备类型**：`EmulatedHwDevice`（基于 UDP 通信）
- **地址转换**：
  - MR（Memory Region）：使用 `/proc/self/pagemap` 获取真实物理地址
  - Ringbuf：直接使用虚拟地址作为"物理地址"传递给仿真器
  - PA↔VA 映射表：用于仿真器通过内存代理访问主机内存
- **网络接口**：通过 UDP 与仿真器交换数据包
- **内存代理**：TCP 服务器（端口 7003/7004），使仿真器能直接访问主机 DMA 内存

### Mock 模式 (`--features mock`)

纯软件模拟，用于单元测试和 CI/CD：

- **设备类型**：`MockDeviceCtx`（内存模拟实现）
- **地址转换**：软件模拟，无需真实物理地址
- **特点**：无需物理硬件或仿真器，启动快速，适合自动化测试

## 关键架构

### 环形缓冲区系统

驱动采用类型安全的环形缓冲区架构，在编译时保证方向正确性：

- **类型安全方向**：`RingSpecToCard`（驱动写入）提供 WriterOps，`RingSpecToHost`（硬件写入）提供 ReaderOps
- **环形队列类型**：SendRing、MetaReportRing、CmdReqRing、CmdRespRing、SimpleNicTxRing、SimpleNicRxRing
- **同步机制**：通过硬件 CSR 寄存器管理 head/tail 指针，实现无锁生产者-消费者模式
- **泛型抽象**：`Ring<Dev, Spec>` 为所有环形队列提供统一的类型安全接口

### 内存管理

不同模式采用不同的内存管理策略：

**硬件模式**：

- 使用 `/proc/self/pagemap` 读取 Linux 页表获取物理地址
- 使用 `mlock()` 锁定 DMA 缓冲区防止换页
- 注：对于 GPU 内存以及 GPU 驱动管理的主机内存，物理地址获取和锁定机制可能不适用

**仿真模式**：

- MR（Memory Region）：使用 `/proc/self/pagemap` 获取真实物理地址
- Ringbuf：直接使用虚拟地址假装为物理地址，简化仿真器实现
- PA↔VA 映射表：维护双向映射，供内存代理服务器使用，使仿真器能通过物理地址访问主机内存

**通用特性**：

- DMA 缓冲区需要物理连续内存，并且物理地址已知
- 支持 4KB 和 2MB 大页（通过 features 在编译时选择，默认 2MB，但只能选择一种，之后可能需要修改）

### FFI 集成

驱动通过 FFI 与 libibverbs C 框架集成：

**导出函数示例**：

```rust
#[unsafe(export_name = "bluerdma_init")]
pub unsafe extern "C" fn init() // 全局初始化

#[unsafe(export_name = "bluerdma_new")]
pub unsafe extern "C" fn new(sysfs_name: *const c_char) -> *mut c_void // 设备创建
```

**集成机制**：

- C 提供者层（provider）通过 `dlopen()` 动态加载 Rust 驱动的共享库
- 实现标准的 libibverbs 提供者接口，对上层应用透明
- 所有导出函数使用 `extern "C"` ABI 保证 C 兼容性

## 组件架构与集成

Blue RDMA 驱动采用分层架构设计，由内核模块、用户态 Rust 驱动、C Provider 层和标准 libibverbs 库协同工作。

### 架构概述

整个系统采用用户态-内核态混合架构：

```
用户态                                           内核态
────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────┐
│   应用程序 (perftest, MPI, etc.)     │
│   - 使用标准 libibverbs API         │
└─────────────────────────────────────┘
            │ ibv_*() 调用
            ▼
┌─────────────────────────────────────┐       ┌─────────────────────────┐
│ libibverbs + C Provider             │       │ Kernel Driver           │
│ (libibverbs.so + 静态链接 provider) │       │ (bluerdma.ko)           │
│                                     │       │ + ib_uverbs.ko          │
│ ├─ libibverbs 核心  ────────────[1]────────>├─────────────────────────┤
│ │  - 标准 IB Verbs API              │ sysfs │ - 注册 IB 设备          │
│ │  - 设备发现和管理 <────────────[2]────────│ - 处理 ioctl/write      │
│ │                                   │ ioctl │ - GID 管理              │
│ └─ Blue RDMA Provider               │       └─────────────────────────┘
│    (providers/bluerdma/)            │
│    - 编译时静态链接                  │
│    - bluerdma_device_alloc()        │
└─────────────────────────────────────┘
            │ dlopen("libbluerdma_rust.so")
            │ (唯一的动态加载)
            ▼
┌─────────────────────────────────────┐
│ Rust Driver (rust-driver)           │
│ - 核心业务逻辑实现                   │
│ - 硬件资源管理                       │
│ - 后台工作线程                       │
└─────────────────────────────────────┘
            │ PCIe MMIO / UDP / Mock
            ▼
┌─────────────────────────────────────┐
│ Hardware / Simulator / Mock         │
│ - Blue RDMA 网卡                     │
│ - RTL 仿真器                         │
│ - 软件模拟                           │
└─────────────────────────────────────┘

通信通道说明：
[1] 设备发现：/sys/class/infiniband_verbs/uverbs*
    - libibverbs 扫描此目录发现设备
    - 读取 dev 属性获取设备号

[2] 设备通信：/dev/infiniband/uverbs*
    - ibv_open_device() 时打开字符设备
    - ioctl/write 系统调用与内核通信
```

### 各组件职责

#### 1. kernel-driver (bluerdma.ko)

**位置**: `blue-rdma-driver/kernel-driver/`
**编译产物**: `bluerdma.ko`

**主要职责**：

- 注册 IB 设备到内核 RDMA 子系统（`ib_register_device`）
- 创建字符设备 `/dev/infiniband/uverbs*`（用于 ioctl 通信）
- 创建 sysfs 接口：
  - `/sys/class/infiniband/bluerdma*`（IB 设备信息）
  - `/sys/class/infiniband_verbs/uverbs*`（设备发现入口，被 libibverbs 扫描）
- 创建和管理网络设备（blue0、blue1）
- 处理 GID（Global Identifier）表管理

**注意**：当前内核驱动的 verbs 方法多为桩函数（仅打印日志），实际业务逻辑在用户态 Rust 驱动中实现。

**设备发现与访问流程**：

1. libibverbs 扫描 `/sys/class/infiniband_verbs/` 发现设备（如 `uverbs0`）
2. 读取 `/sys/class/infiniband_verbs/uverbs0/dev` 获取设备号（如 `231:0`）
3. 打开字符设备 `/dev/infiniband/uverbs0` 进行 ioctl 通信（在仿真中目前用不到）

**关键代码**（`main.c`）：

```c
static int bluerdma_ib_device_add(struct pci_dev *pdev)
{
    // 分配 IB 设备结构
    dev = ib_alloc_device(bluerdma_dev, ibdev);

    // 设置设备操作表
    ib_set_device_ops(ibdev, &bluerdma_device_ops);

    // 注册到内核 RDMA 子系统
    ret = ib_register_device(ibdev, "bluerdma%d", NULL);

    // 关联网络设备
    ib_device_set_netdev(ibdev, dev->netdev, 1);
}
```

#### 2. libibverbs + C Provider (rdma-core-55.0)

**位置**: `blue-rdma-driver/dtld-ibverbs/rdma-core-55.0/`
**编译产物**: `libibverbs.so` 及相关库

**组成部分**：

- **libibverbs 核心**：标准 RDMA verbs API 实现
- **Blue RDMA Provider**：`providers/bluerdma/` 目录，编译时静态链接到 rdma-core

**主要职责**：

- 提供标准的 libibverbs API 给应用程序
- 扫描 `/sys/class/infiniband_verbs/` 发现 RDMA 设备
- 打开 `/dev/infiniband/uverbs*` 字符设备进行通信
- Blue RDMA Provider 负责动态加载 Rust 驱动库

**注意**：这是上游 rdma-core 的修改版本，Blue RDMA 的 provider 代码已集成到源码树中，编译时一起构建，**不是**运行时动态加载的插件。

**关键函数调用**（`init.c` 和 `device.c`）：

```c
// device.c:73 - 获取设备列表
struct ibv_device **ibverbs_get_device_list(int *num_devices) {
    return ibverbs_init(&drivers_list, num_devices);
}

// init.c:204-238 - 扫描 sysfs 发现设备
static int find_sysfs_devs(struct list_head *tmp_sysfs_dev_list) {
    // 构造路径: /sys/class/infiniband_verbs
    if (!check_snprintf(class_path, sizeof(class_path),
                        "%s/class/infiniband_verbs", ibv_get_sysfs_path()))
        return ENOMEM;

    class_dir = opendir(class_path);
    // 遍历 uverbs0, uverbs1 等设备
    while ((dent = readdir(class_dir))) {
        setup_sysfs_dev(dirfd(class_dir), dent->d_name, ...);
    }
}

// device.c:335 - 打开字符设备
cmd_fd = open_cdev(verbs_device->sysfs->sysfs_name,  // "uverbs0"
                   verbs_device->sysfs->sysfs_cdev);   // 设备号

// open_cdev.c:134-146 - 实际打开 /dev/infiniband/uverbs*
int open_cdev(const char *devname_hint, dev_t cdev) {
    // 构造路径: /dev/infiniband/uverbs0
    if (asprintf(&devpath, RDMA_CDEV_DIR "/%s", devname_hint) < 0)
        return -1;
    fd = open_cdev_internal(devpath, cdev);  // open("/dev/infiniband/uverbs0", ...)
    return fd;
}
```

#### 3. Blue RDMA Provider (C 层桥接)

**位置**: `blue-rdma-driver/dtld-ibverbs/rdma-core-55.0/providers/bluerdma/`
**核心文件**: `bluerdma.c`
**编译方式**: 编译时静态链接到 libibverbs

**主要职责**：

- 实现 provider 接口，响应设备分配请求
- **动态加载 Rust 驱动库**（`libbluerdma_rust.so`）—— 系统中唯一的 `dlopen` 调用
- 提供 C ABI 接口桥接，将 libibverbs 调用转发给 Rust 驱动
- 处理设备初始化和上下文分配

**关键代码**（`bluerdma.c:393-467`）：

```c
static struct verbs_device *
bluerdma_device_alloc(struct verbs_sysfs_dev *sysfs_dev)
{
    struct bluerdma_device *dev;
    void *dl_handler;
    void *(*driver_new)(char *);
    void (*driver_init)(void);

    // 动态加载 Rust 驱动库（系统唯一的 dlopen 调用）
    dl_handler = dlopen("libbluerdma_rust.so", RTLD_NOW);
    if (!dl_handler) {
        printf("dlopen failed: %s\n", dlerror());
        goto err_dev;
    }

    // 获取 Rust 导出的函数指针
    driver_init = dlsym(dl_handler, "bluerdma_init");
    driver_new = dlsym(dl_handler, "bluerdma_new");

    // 调用 Rust 的初始化函数
    driver_init();

    // 动态加载所有 verbs 操作
    bluerdma_set_ops(dl_handler, ops);

    return &dev->ibv_dev;
}

// 动态设置所有 verbs 操作
static void bluerdma_set_ops(void *dl_handler, struct verbs_context_ops *ops)
{
    void *fn = NULL;

    // 从 Rust 库加载每个操作的函数指针
    fn = dlsym(dl_handler, "bluerdma_alloc_pd");
    if (fn) ops->alloc_pd = fn;

    fn = dlsym(dl_handler, "bluerdma_reg_mr");
    if (fn) ops->reg_mr = fn;

    fn = dlsym(dl_handler, "bluerdma_create_qp");
    if (fn) ops->create_qp = fn;

    fn = dlsym(dl_handler, "bluerdma_post_send");
    if (fn) ops->post_send = fn;

    fn = dlsym(dl_handler, "bluerdma_poll_cq");
    if (fn) ops->poll_cq = fn;

    // ... 其他 verbs 操作
}
```

**Provider 注册**：

```c
static const struct verbs_device_ops bluerdma_dev_ops = {
    .name = "bluerdma",
    .match_min_abi_version = 1,
    .match_max_abi_version = 1,
    .alloc_device = bluerdma_device_alloc,
    .alloc_context = bluerdma_alloc_context,
};

// 使用宏自动注册 provider（在 dlopen 时执行）
PROVIDER_DRIVER(bluerdma, bluerdma_dev_ops);
```

#### 4. rust-driver (核心驱动)

**位置**: `blue-rdma-driver/rust-driver/`
**编译产物**: `libbluerdma_rust.so`

**主要职责**：

- 实现所有 RDMA verbs 操作的核心业务逻辑
- 管理硬件资源（QP、CQ、MR、PD 等）
- 处理内存注册和地址转换
- 管理 DMA 缓冲区和环形队列
- 运行后台工作线程（发送、重传、完成处理等）
- 通过 CSR 与硬件通信（或通过 UDP 与仿真器通信）

**FFI 导出**（`src/rxe/ctx_ops.rs`）：

```rust
// 全局初始化
#[unsafe(export_name = "bluerdma_init")]
pub unsafe extern "C" fn init() {
    let _ = env_logger::builder()
        .format_timestamp(Some(env_logger::TimestampPrecision::Nanos))
        .try_init();
}

// 创建设备上下文
#[unsafe(export_name = "bluerdma_new")]
pub unsafe extern "C" fn new(sysfs_name: *const c_char) -> *mut c_void {
    BlueRdmaCore::new(sysfs_name)
}

// 分配 Protection Domain
#[unsafe(export_name = "bluerdma_alloc_pd")]
pub unsafe extern "C" fn alloc_pd(ctx: *mut ffi::ibv_context) -> *mut ffi::ibv_pd {
    BlueRdmaCore::alloc_pd(ctx)
}

// 注册 Memory Region
#[unsafe(export_name = "bluerdma_reg_mr")]
pub unsafe extern "C" fn reg_mr(
    pd: *mut ffi::ibv_pd,
    addr: *mut c_void,
    length: usize,
    access: i32,
) -> *mut ffi::ibv_mr {
    BlueRdmaCore::reg_mr(pd, addr, length, access)
}

// 创建 Queue Pair
#[unsafe(export_name = "bluerdma_create_qp")]
pub unsafe extern "C" fn create_qp(
    pd: *mut ffi::ibv_pd,
    init_attr: *mut ffi::ibv_qp_init_attr,
) -> *mut ffi::ibv_qp {
    BlueRdmaCore::create_qp(pd, init_attr)
}

// 投递发送请求
#[unsafe(export_name = "bluerdma_post_send")]
pub unsafe extern "C" fn post_send(
    qp: *mut ffi::ibv_qp,
    wr: *mut ffi::ibv_send_wr,
    bad_wr: *mut *mut ffi::ibv_send_wr,
) -> c_int {
    BlueRdmaCore::post_send(qp, wr, bad_wr)
}

// 轮询完成队列
#[unsafe(export_name = "bluerdma_poll_cq")]
pub unsafe extern "C" fn poll_cq(
    cq: *mut ffi::ibv_cq,
    num_entries: i32,
    wc: *mut ffi::ibv_wc,
) -> i32 {
    BlueRdmaCore::poll_cq(cq, num_entries, wc)
}
```

### 完整调用链路

以 `ibv_post_send()` 为例，展示从应用到硬件的完整调用链：

```
应用程序
    │
    ├─ ibv_post_send(qp, wr, bad_wr)
    │
    ▼
┌─────────────────────────────────────────┐
│ libibverbs                              │
│   verbs_post_send()                     │
│     └─> ctx->ops->post_send()           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ C Provider (bluerdma.c)                 │
│   ops->post_send = bluerdma_post_send   │
│     └─> 直接转发到 Rust                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Rust Driver                             │
│   bluerdma_post_send()                  │
│     └─> BlueRdmaCore::post_send()       │
│           └─> HwDeviceCtx::post_send()  │
│                 ├─ 解析 SendWr           │
│                 ├─ 生成硬件描述符        │
│                 ├─ 写入 Send Ring        │
│                 └─ 通知 SendWorker       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ SendWorker (后台线程)                    │
│   ├─ 从 Ring Buffer 读取描述符           │
│   ├─ DMA 读取用户数据                    │
│   ├─ 更新硬件 CSR (tail pointer)         │
│   └─ 注册超时检测                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Hardware / Simulator                    │
│   ├─ 读取描述符                          │
│   ├─ DMA 读取数据                        │
│   ├─ 封装网络包                          │
│   └─ 通过以太网发送                      │
└─────────────────────────────────────────┘
```

### 初始化流程

**阶段 1：内核模块加载**

```bash
insmod bluerdma.ko
```

1. `bluerdma_init_module()` 执行
2. `bluerdma_probe()` 创建测试设备
3. `bluerdma_ib_device_add()` 注册 IB 设备
4. 创建 sysfs 接口：
   - `/sys/class/infiniband/bluerdma0`（IB 设备信息）
   - `/sys/class/infiniband_verbs/uverbs0`（libibverbs 扫描此目录）
5. 创建字符设备 `/dev/infiniband/uverbs0`
6. 创建网络设备 `blue0`、`blue1`

**阶段 2：应用打开设备**

```c
struct ibv_device **dev_list = ibv_get_device_list(NULL);
struct ibv_context *ctx = ibv_open_device(dev_list[0]);
```

详细调用链：

1. **应用层**：`ibv_get_device_list()`
2. **libibverbs** (`device.c:73`)：`ibverbs_get_device_list()`
3. **libibverbs** (`init.c:560`)：`find_sysfs_devs()`
   - 扫描 `/sys/class/infiniband_verbs/uverbs*`
   - 注意：扫描的是 `infiniband_verbs` 而不是 `infiniband`
4. **libibverbs** (`init.c:541`)：`try_drivers()` 匹配 provider
5. **C Provider** (`bluerdma.c:393`)：`bluerdma_device_alloc()`
   - 动态加载 Rust 驱动库
6. **C Provider** (`bluerdma.c:407`)：`dlopen("libbluerdma_rust.so")`
7. **C Provider** (`bluerdma.c:422`)：调用 `bluerdma_init()` [Rust FFI]
8. **C Provider** (`bluerdma.c:359`)：调用 `bluerdma_new("uverbs0")` [Rust FFI]
9. **Rust Driver** (`core.rs:81`)：`BlueRdmaCore::new()`
   - 初始化硬件适配器（PCIe/UDP/Mock）
   - 例如 sim 模式：连接 UDP `127.0.0.1:7701`
10. **Rust Driver**：`HwDeviceCtx::initialize()`
    - 分配 DMA 缓冲区和环形队列
    - 启动后台工作线程
    - 初始化资源管理器（QP/CQ/MR/PD）

**阶段 3：运行时后台线程**
以下工作线程在后台持续运行：

- `SendWorker`: 处理发送队列
- `RdmaWriteWorker`: 处理 RDMA Write 操作
- `CompletionWorker`: 处理完成事件
- `PacketRetransmitWorker`: 超时重传
- `AckResponder`: 生成和发送 ACK
- `QpAckTimeoutWorker`: 检测 ACK 超时
- `MetaReportWorker`: 从硬件读取元数据报告

### 关键设计特点

**1. 混合架构**

- 内核层：提供设备框架和字符设备接口
- 用户态层：实现核心业务逻辑，性能更高，开发更灵活

**2. 单次动态加载**

- Blue RDMA Provider 在编译时静态链接到 libibverbs
- 运行时仅有一次 `dlopen`：Provider 加载 Rust 驱动（`libbluerdma_rust.so`）

**3. 零拷贝数据路径**

- 应用数据直接通过 DMA 传输到硬件
- 使用环形缓冲区（Ring Buffer）实现无锁通信
- 后台线程异步处理，不阻塞应用

**4. 多模式支持**

- 硬件模式：PCIe MMIO 访问真实网卡
- 仿真模式：UDP 与 RTL 仿真器通信（端口 7701/7702）
- Mock 模式：纯软件模拟，用于 CI/CD

**5. TCP 辅助通道**
对于 Send/Recv 语义，使用 TCP 连接在 QP 对之间传递 `post_recv` 信息，使发送端能匹配接收缓冲区。

