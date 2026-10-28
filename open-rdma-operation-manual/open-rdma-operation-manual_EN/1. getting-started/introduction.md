# Blue RDMA Rust Driver - Project Introduction

## Overview

`rust-driver` is a core RDMA (Remote Direct Memory Access) driver implementation written in Rust. It integrates with the standard libibverbs framework via FFI (Foreign Function Interface) as a high-performance library, providing a Rust-based RDMA verbs implementation for Blue RDMA hardware.

The driver supports three operation modes to accommodate different development scenarios:

- **Hardware mode** (`--features hw`): uses physical PCIe RDMA devices
- **Simulation mode** (`--features sim`): uses RTL simulator for hardware simulation testing, communicating via UDP and TCP
- **Mock mode** (`--features mock`): pure software testing without external dependencies

## Project Structure

### Core Modules

#### `verbs/` - RDMA Verbs API Layer

Implements RDMA verbs interfaces compatible with libibverbs:

- `ffi.rs`: C ABI exported functions for dynamic loading by libibverbs
- `ctx.rs`: `HwDeviceCtx` - core device context managing RDMA operations
- `dev.rs`: device initialization (`PciHwDevice` for hardware mode, `EmulatedHwDevice` for simulation mode)
- `mock.rs`: `MockDeviceCtx` - device context implementation for mock mode (peer to `HwDeviceCtx`)

#### `csr/` - Control and Status Register Access

Provides a hardware abstraction layer that unifies CSR access across different modes:

- `device_adaptor.rs`: core `DeviceAdaptor` trait defining CSR read/write interfaces
- `ring_specs.rs`: specifications for each hardware ring queue (SendRing, CmdReqRing, MetaReportRing, etc.)
- `hardware.rs`: hardware mode CSR access implementation via `/dev/mem` or VFIO for PCIe MMIO
- `emulated.rs`: simulation mode CSR access implementation based on UDP RPC communicating with the RTL simulator (ports 7701/7702)
- `mode.rs`: device operation mode configuration (100G/200G/400G)

The generic `Ring<Dev, Spec>` pattern provides type-safe ring buffer operations with compile-time direction checking.

#### `mem/` - Memory Management (currently somewhat messy)

DMA buffer allocation and virtual-to-physical address translation:

- `virt_to_phy.rs`: address translation implementation
  - `PhysAddrResolverLinuxX86`: for both hardware and simulation modes, uses `/proc/self/pagemap` to obtain physical addresses for MRs (Memory Regions)
  - Note: in simulation mode, the "physical address" of ring buffers directly uses the virtual address as a fake value passed to the simulator
- `pa_va_map.rs`: bidirectional physical-virtual address mapping for simulator to access host memory in sim mode

Supports 4KB and 2MB huge pages (default: 2MB for best performance), but the page size is fixed at compile time via features; runtime configuration may be needed in the future.

#### `workers/` - Background Processing Threads (Core Business Logic)

Asynchronous processing worker threads for RDMA operations:

- `completion.rs`: completion queue (CQ) event handling, reports operation completion status to applications
- `send/`: send work request processing pipeline, converting Send WRs to hardware descriptors
- `rdma.rs`: worker threads for RDMA Read/Write/Atomic operations
- `retransmit.rs`: packet retransmission logic and timeout handling
- `ack_responder.rs`: ACK packet generation and response processing
- `qp_timeout.rs`: queue pair (QP) timeout management
- `meta_report/`: metadata report processing, extracting BTH/RETH header information from hardware
- `spawner.rs`: worker thread lifecycle management

#### `ringbuf/` - Ring Buffer Abstraction

Generic descriptor ring buffer management (note: the abstraction design may need improvement):

- `desc.rs`: descriptor serialization/deserialization trait definitions
- `dma_rb.rs`: DMA-based ring buffer implementation using head/tail pointers for producer-consumer synchronization

#### Supporting Modules

- `config.rs`: device configuration loader (reads from `/etc/bluerdma/config.toml`)
- `constants.rs`: global constants and hardware address definitions
- `memory_proxy_simple.rs`: memory proxy TCP server for simulation mode DMA access

## Operation Modes

### Hardware Mode (`--features hw`)

Production use with physical RDMA hardware:

- **CSR access**: direct PCIe MMIO via `/dev/mem` (SysfsPci) or VFIO
- **Device type**: `PciHwDevice` (uses `pci-driver` crate)
- **Address translation**: obtains physical addresses by reading Linux page tables via `/proc/self/pagemap`
- **Network interface**: integrates with the real network stack via TAP devices
- **Memory management**: uses `mlock()` to lock DMA buffers to prevent swapping

### Simulation Mode (`--features sim`)

Hardware verification in conjunction with the RTL simulator:

- **CSR access**: communicates with the simulator via UDP RPC (ports 7701/7702)
- **Device type**: `EmulatedHwDevice` (UDP‑based communication)
- **Address translation**:
  - MR (Memory Region): uses `/proc/self/pagemap` to obtain real physical addresses
  - Ring buffers: directly uses virtual addresses as "physical addresses" passed to the simulator
  - PA↔VA mapping table: used by the simulator to access host memory through the memory proxy
- **Network interface**: exchanges packets with the simulator via UDP
- **Memory proxy**: TCP server (ports 7003/7004), enabling the simulator to directly access host DMA memory

### Mock Mode (`--features mock`)

Pure software simulation for unit testing and CI/CD:

- **Device type**: `MockDeviceCtx` (in‑memory simulation)
- **Address translation**: software emulation, no real physical addresses required
- **Features**: no physical hardware or simulator needed, fast startup, suitable for automated testing

## Key Architecture

### Ring Buffer System

The driver employs a type‑safe ring buffer architecture that guarantees direction correctness at compile time:

- **Type‑safe direction**: `RingSpecToCard` (driver writes) provides `WriterOps`, `RingSpecToHost` (hardware writes) provides `ReaderOps`
- **Ring types**: SendRing, MetaReportRing, CmdReqRing, CmdRespRing, SimpleNicTxRing, SimpleNicRxRing
- **Synchronisation**: head/tail pointers managed via hardware CSR registers, lock‑free producer‑consumer pattern
- **Generic abstraction**: `Ring<Dev, Spec>` provides a uniform, type‑safe interface for all ring queues

### Memory Management

Different modes employ different memory management strategies:

**Hardware mode**:

- Uses `/proc/self/pagemap` to read Linux page tables for physical addresses
- Uses `mlock()` to lock DMA buffers to prevent swapping
- Note: for GPU memory as well as host memory managed by GPU drivers, the physical address retrieval and locking mechanisms may not apply

**Simulation mode**:

- MR (Memory Region): uses `/proc/self/pagemap` to obtain real physical addresses
- Ring buffers: directly uses virtual addresses as fake physical addresses, simplifying simulator implementation
- PA↔VA mapping table: maintains bidirectional mapping for use by the memory proxy server, allowing the simulator to access host memory via physical addresses

**Common features**:

- DMA buffers require physically contiguous memory and the physical address must be known
- Supports 4KB and 2MB huge pages (selected at compile time via features, default 2MB, but only one can be chosen; may need modification later)

### FFI Integration

The driver integrates with the libibverbs C framework via FFI:

**Example exported functions**:

```rust
#[unsafe(export_name = "bluerdma_init")]
pub unsafe extern "C" fn init() // global initialisation

#[unsafe(export_name = "bluerdma_new")]
pub unsafe extern "C" fn new(sysfs_name: *const c_char) -> *mut c_void // device creation
```

**Integration mechanism**:

- The C provider layer dynamically loads the Rust driver shared library via `dlopen()`
- Implements the standard libibverbs provider interface, transparent to upper‑layer applications
- All exported functions use `extern "C"` ABI to guarantee C compatibility

## Component Architecture and Integration

The Blue RDMA driver adopts a layered architecture consisting of a kernel module, a userspace Rust driver, a C provider layer, and the standard libibverbs library working together.

### Architecture Overview

The entire system uses a hybrid userspace‑kernelspace architecture:

```
Userspace                                         Kernelspace
────────────────────────────────────────────────────────────────────────

┌─────────────────────────────────────┐
│   Application (perftest, MPI, etc.)  │
│   - uses standard libibverbs API    │
└─────────────────────────────────────┘
            │ ibv_*() calls
            ▼
┌─────────────────────────────────────┐       ┌─────────────────────────┐
│ libibverbs + C Provider             │       │ Kernel Driver           │
│ (libibverbs.so + statically linked  │       │ (bluerdma.ko)           │
│  provider)                          │       │ + ib_uverbs.ko          │
│                                     │       │                         │
│ ├─ libibverbs core  ────────────[1]────────>├─────────────────────────┤
│ │  - standard IB Verbs API         │ sysfs │ - registers IB device    │
│ │  - device discovery & management<────[2]────────│ - handles ioctl/write│
│ │                                   │ ioctl │ - GID management        │
│ └─ Blue RDMA Provider               │       └─────────────────────────┘
│    (providers/bluerdma/)            │
│    - statically linked at compile   │
│    - bluerdma_device_alloc()        │
└─────────────────────────────────────┘
            │ dlopen("libbluerdma_rust.so")
            │ (the only dynamic load)
            ▼
┌─────────────────────────────────────┐
│ Rust Driver (rust-driver)           │
│ - core business logic implementation│
│ - hardware resource management      │
│ - background worker threads         │
└─────────────────────────────────────┘
            │ PCIe MMIO / UDP / Mock
            ▼
┌─────────────────────────────────────┐
│ Hardware / Simulator / Mock         │
│ - Blue RDMA NIC                     │
│ - RTL simulator                     │
│ - software simulation               │
└─────────────────────────────────────┘

Communication channel notes:
[1] device discovery: /sys/class/infiniband_verbs/uverbs*
    - libibverbs scans this directory to discover devices
    - reads the "dev" attribute to obtain the device number

[2] device communication: /dev/infiniband/uverbs*
    - opens the character device upon ibv_open_device()
    - uses ioctl/write syscalls to communicate with the kernel
```

### Component Responsibilities

#### 1. kernel-driver (bluerdma.ko)

**Location**: `blue-rdma-driver/kernel-driver/`
**Build artifact**: `bluerdma.ko`

**Main responsibilities**:

- Registers an IB device with the kernel RDMA subsystem (`ib_register_device`)
- Creates the character device `/dev/infiniband/uverbs*` (for ioctl communication)
- Creates sysfs interfaces:
  - `/sys/class/infiniband/bluerdma*` (IB device information)
  - `/sys/class/infiniband_verbs/uverbs*` (device discovery entry point, scanned by libibverbs)
- Creates and manages network devices (`blue0`, `blue1`)
- Handles GID (Global Identifier) table management

**Note**: Currently the kernel driver's verbs methods are mostly stubs (only print logs); actual business logic is implemented in the userspace Rust driver.

**Device discovery and access flow**:

1. libibverbs scans `/sys/class/infiniband_verbs/` to discover devices (e.g., `uverbs0`)
2. Reads `/sys/class/infiniband_verbs/uverbs0/dev` to get the device number (e.g., `231:0`)
3. Opens the character device `/dev/infiniband/uverbs0` for ioctl communication (not used in simulation at present)

**Key code** (`main.c`):

```c
static int bluerdma_ib_device_add(struct pci_dev *pdev)
{
    // allocate IB device structure
    dev = ib_alloc_device(bluerdma_dev, ibdev);

    // set device operation table
    ib_set_device_ops(ibdev, &bluerdma_device_ops);

    // register with the kernel RDMA subsystem
    ret = ib_register_device(ibdev, "bluerdma%d", NULL);

    // associate network device
    ib_device_set_netdev(ibdev, dev->netdev, 1);
}
```

#### 2. libibverbs + C Provider (rdma-core-55.0)

**Location**: `blue-rdma-driver/dtld-ibverbs/rdma-core-55.0/`
**Build artifacts**: `libibverbs.so` and related libraries

**Components**:

- **libibverbs core**: standard RDMA verbs API implementation
- **Blue RDMA Provider**: `providers/bluerdma/` directory, statically linked into rdma-core at build time

**Main responsibilities**:

- Provides the standard libibverbs API to applications
- Scans `/sys/class/infiniband_verbs/` to discover RDMA devices
- Opens `/dev/infiniband/uverbs*` character devices for communication
- The Blue RDMA Provider is responsible for dynamically loading the Rust driver library

**Note**: This is a modified version of upstream rdma-core. The Blue RDMA provider code is integrated into the source tree and built together; it is **not** a runtime dynamically loaded plugin.

**Key function calls** (`init.c` and `device.c`):

```c
// device.c:73 - get device list
struct ibv_device **ibverbs_get_device_list(int *num_devices) {
    return ibverbs_init(&drivers_list, num_devices);
}

// init.c:204-238 - scan sysfs to discover devices
static int find_sysfs_devs(struct list_head *tmp_sysfs_dev_list) {
    // construct path: /sys/class/infiniband_verbs
    if (!check_snprintf(class_path, sizeof(class_path),
                        "%s/class/infiniband_verbs", ibv_get_sysfs_path()))
        return ENOMEM;

    class_dir = opendir(class_path);
    // iterate over uverbs0, uverbs1, etc.
    while ((dent = readdir(class_dir))) {
        setup_sysfs_dev(dirfd(class_dir), dent->d_name, ...);
    }
}

// device.c:335 - open the character device
cmd_fd = open_cdev(verbs_device->sysfs->sysfs_name,  // "uverbs0"
                   verbs_device->sysfs->sysfs_cdev);   // device number

// open_cdev.c:134-146 - actually open /dev/infiniband/uverbs*
int open_cdev(const char *devname_hint, dev_t cdev) {
    // construct path: /dev/infiniband/uverbs0
    if (asprintf(&devpath, RDMA_CDEV_DIR "/%s", devname_hint) < 0)
        return -1;
    fd = open_cdev_internal(devpath, cdev);  // open("/dev/infiniband/uverbs0", ...)
    return fd;
}
```

#### 3. Blue RDMA Provider (C bridge layer)

**Location**: `blue-rdma-driver/dtld-ibverbs/rdma-core-55.0/providers/bluerdma/`
**Core file**: `bluerdma.c`
**Build method**: statically linked into libibverbs at compile time

**Main responsibilities**:

- Implements the provider interface, responding to device allocation requests
- **Dynamically loads the Rust driver library** (`libbluerdma_rust.so`) — the only `dlopen` call in the system
- Provides a C ABI bridging layer, forwarding libibverbs calls to the Rust driver
- Handles device initialisation and context allocation

**Key code** (`bluerdma.c:393-467`):

```c
static struct verbs_device *
bluerdma_device_alloc(struct verbs_sysfs_dev *sysfs_dev)
{
    struct bluerdma_device *dev;
    void *dl_handler;
    void *(*driver_new)(char *);
    void (*driver_init)(void);

    // dynamically load the Rust driver library (the only dlopen in the system)
    dl_handler = dlopen("libbluerdma_rust.so", RTLD_NOW);
    if (!dl_handler) {
        printf("dlopen failed: %s\n", dlerror());
        goto err_dev;
    }

    // obtain function pointers exported by Rust
    driver_init = dlsym(dl_handler, "bluerdma_init");
    driver_new = dlsym(dl_handler, "bluerdma_new");

    // call Rust initialisation function
    driver_init();

    // dynamically load all verbs operations
    bluerdma_set_ops(dl_handler, ops);

    return &dev->ibv_dev;
}

// dynamically set all verbs operations
static void bluerdma_set_ops(void *dl_handler, struct verbs_context_ops *ops)
{
    void *fn = NULL;

    // load a pointer to each operation from the Rust library
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

    // ... other verbs operations
}
```

**Provider registration**:

```c
static const struct verbs_device_ops bluerdma_dev_ops = {
    .name = "bluerdma",
    .match_min_abi_version = 1,
    .match_max_abi_version = 1,
    .alloc_device = bluerdma_device_alloc,
    .alloc_context = bluerdma_alloc_context,
};

// macro automatically registers the provider (executed at dlopen time)
PROVIDER_DRIVER(bluerdma, bluerdma_dev_ops);
```

#### 4. rust-driver (core driver)

**Location**: `blue-rdma-driver/rust-driver/`
**Build artifact**: `libbluerdma_rust.so`

**Main responsibilities**:

- Implements the core business logic for all RDMA verbs operations
- Manages hardware resources (QP, CQ, MR, PD, etc.)
- Handles memory registration and address translation
- Manages DMA buffers and ring queues
- Runs background worker threads (send, retransmission, completion handling, etc.)
- Communicates with hardware via CSR (or with the simulator via UDP)

**FFI exports** (`src/rxe/ctx_ops.rs`):

```rust
// global initialisation
#[unsafe(export_name = "bluerdma_init")]
pub unsafe extern "C" fn init() {
    let _ = env_logger::builder()
        .format_timestamp(Some(env_logger::TimestampPrecision::Nanos))
        .try_init();
}

// create device context
#[unsafe(export_name = "bluerdma_new")]
pub unsafe extern "C" fn new(sysfs_name: *const c_char) -> *mut c_void {
    BlueRdmaCore::new(sysfs_name)
}

// allocate Protection Domain
#[unsafe(export_name = "bluerdma_alloc_pd")]
pub unsafe extern "C" fn alloc_pd(ctx: *mut ffi::ibv_context) -> *mut ffi::ibv_pd {
    BlueRdmaCore::alloc_pd(ctx)
}

// register Memory Region
#[unsafe(export_name = "bluerdma_reg_mr")]
pub unsafe extern "C" fn reg_mr(
    pd: *mut ffi::ibv_pd,
    addr: *mut c_void,
    length: usize,
    access: i32,
) -> *mut ffi::ibv_mr {
    BlueRdmaCore::reg_mr(pd, addr, length, access)
}

// create Queue Pair
#[unsafe(export_name = "bluerdma_create_qp")]
pub unsafe extern "C" fn create_qp(
    pd: *mut ffi::ibv_pd,
    init_attr: *mut ffi::ibv_qp_init_attr,
) -> *mut ffi::ibv_qp {
    BlueRdmaCore::create_qp(pd, init_attr)
}

// post send request
#[unsafe(export_name = "bluerdma_post_send")]
pub unsafe extern "C" fn post_send(
    qp: *mut ffi::ibv_qp,
    wr: *mut ffi::ibv_send_wr,
    bad_wr: *mut *mut ffi::ibv_send_wr,
) -> c_int {
    BlueRdmaCore::post_send(qp, wr, bad_wr)
}

// poll completion queue
#[unsafe(export_name = "bluerdma_poll_cq")]
pub unsafe extern "C" fn poll_cq(
    cq: *mut ffi::ibv_cq,
    num_entries: i32,
    wc: *mut ffi::ibv_wc,
) -> i32 {
    BlueRdmaCore::poll_cq(cq, num_entries, wc)
}
```

### Complete Call Chain

Taking `ibv_post_send()` as an example, the complete call chain from application to hardware is:

```
Application
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
│     └─> forward directly to Rust        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Rust Driver                             │
│   bluerdma_post_send()                  │
│     └─> BlueRdmaCore::post_send()       │
│           └─> HwDeviceCtx::post_send()  │
│                 ├─ parse SendWr         │
│                 ├─ generate hardware descriptor│
│                 ├─ write to Send Ring   │
│                 └─ notify SendWorker    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ SendWorker (background thread)          │
│   ├─ read descriptor from Ring Buffer   │
│   ├─ DMA read user data                 │
│   ├─ update hardware CSR (tail pointer) │
│   └─ register timeout detection         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Hardware / Simulator                    │
│   ├─ read descriptor                    │
│   ├─ DMA read data                      │
│   ├─ encapsulate network packet         │
│   └─ send via Ethernet                  │
└─────────────────────────────────────────┘
```

### Initialisation Flow

**Phase 1: Kernel module loading**

```bash
insmod bluerdma.ko
```

1. `bluerdma_init_module()` executes
2. `bluerdma_probe()` creates a test device
3. `bluerdma_ib_device_add()` registers the IB device
4. Creates sysfs interfaces:
   - `/sys/class/infiniband/bluerdma0` (IB device info)
   - `/sys/class/infiniband_verbs/uverbs0` (scanned by libibverbs)
5. Creates character device `/dev/infiniband/uverbs0`
6. Creates network devices `blue0`, `blue1`

**Phase 2: Application opens a device**

```c
struct ibv_device **dev_list = ibv_get_device_list(NULL);
struct ibv_context *ctx = ibv_open_device(dev_list[0]);
```

Detailed call chain:

1. **Application**: `ibv_get_device_list()`
2. **libibverbs** (`device.c:73`): `ibverbs_get_device_list()`
3. **libibverbs** (`init.c:560`): `find_sysfs_devs()`
   - Scans `/sys/class/infiniband_verbs/uverbs*`
   - Note: scans `infiniband_verbs` not `infiniband`
4. **libibverbs** (`init.c:541`): `try_drivers()` matches a provider
5. **C Provider** (`bluerdma.c:393`): `bluerdma_device_alloc()`
   - Dynamically loads the Rust driver library
6. **C Provider** (`bluerdma.c:407`): `dlopen("libbluerdma_rust.so")`
7. **C Provider** (`bluerdma.c:422`): calls `bluerdma_init()` [Rust FFI]
8. **C Provider** (`bluerdma.c:359`): calls `bluerdma_new("uverbs0")` [Rust FFI]
9. **Rust Driver** (`core.rs:81`): `BlueRdmaCore::new()`
   - Initialises the hardware adapter (PCIe/UDP/Mock)
   - For sim mode: connects to UDP `127.0.0.1:7701`
10. **Rust Driver**: `HwDeviceCtx::initialize()`
    - Allocates DMA buffers and ring queues
    - Starts background worker threads
    - Initialises resource managers (QP/CQ/MR/PD)

**Phase 3: Runtime background threads**
The following worker threads run continuously in the background:

- `SendWorker`: processes send queues
- `RdmaWriteWorker`: processes RDMA Write operations
- `CompletionWorker`: processes completion events
- `PacketRetransmitWorker`: handles timeout retransmission
- `AckResponder`: generates and sends ACKs
- `QpAckTimeoutWorker`: detects ACK timeouts
- `MetaReportWorker`: reads metadata reports from hardware

### Key Design Features

**1. Hybrid architecture**

- Kernel layer: provides device framework and character device interface
- Userspace layer: implements core business logic for higher performance and development flexibility

**2. Single dynamic load**

- The Blue RDMA Provider is statically linked into libibverbs at compile time
- Only one `dlopen` at runtime: the Provider loads the Rust driver (`libbluerdma_rust.so`)

**3. Zero‑copy data path**

- Application data is transferred directly to hardware via DMA
- Ring buffers enable lock‑free communication
- Background threads process asynchronously without blocking the application

**4. Multi‑mode support**

- Hardware mode: PCIe MMIO access to real NICs
- Simulation mode: UDP communication with the RTL simulator (ports 7701/7702)
- Mock mode: pure software simulation for CI/CD

**5. TCP auxiliary channel**

For Send/Recv semantics, a TCP connection is used to pass `post_recv` information between QP peers, allowing the sender to match receive buffers.