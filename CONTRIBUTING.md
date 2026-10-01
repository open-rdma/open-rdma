<div align="center">

# 🤝 Contributing to Open-RDMA

**English** | [**简体中文**](CONTRIBUTING_CN.md)

</div>

Thanks for your interest in Open-RDMA! This guide explains where the code lives, how to get a
working development environment, and how to get a change merged. It is written for newcomers as
well as for experienced contributors.

## Where the code lives

`open-rdma/open-rdma` (this repository) is the entry point of the project: it holds the overview,
the project matrix and the learning material. The code itself lives in the sibling repositories:

| Repository | Stack | What you contribute |
| --- | --- | --- |
| [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl) | Bluespec SystemVerilog | RTL design, simulation, verification |
| [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | C (kernel) + Rust (user space) | Kernel driver, user-space driver, `rdma-core` integration |
| [open-rdma-dev-env](https://github.com/open-rdma/open-rdma-dev-env) | Docker + QEMU | Development environment, tooling, onboarding experience |
| [bluespec-lsp](https://github.com/open-rdma/bluespec-lsp) | Rust | Language server for Bluespec SystemVerilog projects |
| [UCAgent](https://github.com/open-rdma/UCAgent) | Python | AI-agent-driven RTL verification, Cocotb integration |
| [cocotbext-pcie](https://github.com/open-rdma/cocotbext-pcie) | Python | PCIe behavioural models for Cocotb |

Changes to **this** repository are almost always documentation changes: correcting inaccurate or
outdated information, keeping the English and Chinese READMEs in sync, adding learning material, or
updating the project matrix when a new repository joins the project.

## 🎓 Student onboarding path

Open-RDMA is explicitly beginner-friendly, and a large part of the community is made up of
university students and graduate researchers. Pick the lane that matches your background — each one
lists a repository to start from and a concrete first step.

| Background | Start here | A good first step |
| --- | --- | --- |
| **Hardware / RTL** (FPGA, ASIC, digital design) | [open-rdma-rtl](https://github.com/open-rdma/open-rdma-rtl) | Read the queue-pair and transport modules, then run the existing simulations before changing anything. |
| **Driver / OS** (kernel modules, user-space libraries) | [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | Bring up the environment with `open-rdma-dev-env` and run `tests/base_test/scripts/test_send_recv_sim.sh` end to end. |
| **Verification** (simulation, formal, CI) | [UCAgent](https://github.com/open-rdma/UCAgent) and [cocotbext-pcie](https://github.com/open-rdma/cocotbext-pcie) | Reproduce an existing test, then extend it with one new corner case. |
| **AI / algorithm** (GPU kernels, inference, communication protocols) | [open-rdma](https://github.com/open-rdma/open-rdma) and [open-rdma-driver](https://github.com/open-rdma/open-rdma-driver) | Try the MRC multi-path transport on a two-node setup and write down what surprised you — that write-up is already a useful contribution. |

If you are not sure where to start, open a
[Discussion](https://github.com/open-rdma/open-rdma/discussions) and describe your background and
interests. Tell us which courses, languages and tools you already know; the maintainers will point
you at an issue that fits.

## Setting up a development environment

The supported path is the `open-rdma-dev-env` container, which bundles the Bluespec compiler, the
Rust toolchain, `rdma-core` and the Open-RDMA sources inside a QEMU virtual machine:

```bash
git clone https://github.com/open-rdma/open-rdma-dev-env.git
cd open-rdma-dev-env
./quick-start.sh
```

It requires a Linux host with Docker and Docker Compose. See the
[`open-rdma-dev-env` README](https://github.com/open-rdma/open-rdma-dev-env) for SSH key setup,
image registries, local builds, proxy configuration and troubleshooting.

## Contribution workflow

1. **Fork** the repository you want to change (for repositories in the `open-rdma` organisation,
   create the fork under your own account).
2. **Branch** off the default branch — `master` for `open-rdma` and `open-rdma-dev-env`, `dev` for
   `open-rdma-rtl` and `open-rdma-driver`. Use a descriptive name, for example
   `docs/fix-quickstart` or `fix/rq-retry-timeout`.
3. **Make a focused change.** Smaller pull requests are reviewed faster. Split unrelated changes
   into separate pull requests or separate commits.
4. **Verify it.** For documentation, render the Markdown and click every link you touched. For
   code, run the existing tests, or explain in the pull request why they cannot be run.
5. **Open a pull request** against the default branch of the upstream repository, and link the
   issue it closes (`Closes #123`).

## Commit messages

Commit messages in this project follow a light conventional-commit style, with a type prefix:

- `docs:` documentation changes
- `fix:` bug fixes
- `feat:` new functionality
- `refactor:` behaviour-preserving restructuring
- `test:` test-only changes
- `rtl:` hardware/RTL changes

Both English and Chinese commit messages are used across the project; pick whichever you write most
clearly, and keep the subject line under roughly 72 characters.

Examples taken from the repository history:

```text
docs: use public Star history chart
docs: add MRC and GPU-friendly overview
fix intercept failure
RQ e2e fatal NAK
```

## Pull request checklist

- [ ] The change is focused and the title describes it in one line.
- [ ] Every link added or modified resolves to a real target.
- [ ] English and Chinese documentation were updated together, when both exist.
- [ ] Screenshots are attached for any visual change.
- [ ] The reasoning is explained in the description, not only in the diff.

## Reporting bugs and requesting features

- 🐛 [Report a bug](https://github.com/open-rdma/open-rdma/issues/new?template=bug_report.md)
- 💡 [Request a feature](https://github.com/open-rdma/open-rdma/issues/new?template=feature_request.md)

Please search the existing issues first, and state which repository or component the report is
about, so it can be routed to the right maintainers.

## Community

- 💬 [GitHub Discussions](https://github.com/open-rdma/open-rdma/discussions) — questions,
  design discussions and announcements.

Please be respectful and constructive: many contributors here are students writing their first
pull request.

## License

By contributing, you agree that your contributions are licensed under the same terms as the
repository you are contributing to.
