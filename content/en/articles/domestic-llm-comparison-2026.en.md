---
title: "November 2026 Chinese Frontier LLMs: Qwen4-Max, Kimi K3.1 Pro, DeepSeek-V4, MiniMax M3.1 & GLM-5.3"
slug: domestic-llm-comparison-2026
date: 2026-09-07
tag: Chinese LLMs
tagClass: tag-amber
category: Evaluation & Trends
description: "Engineering comparison of China's November 18, 2026 frontier LLMs—Qwen4-Max, Kimi K3.1 Pro, DeepSeek-V4-Pro / V4.1-Flash, MiniMax M3.1 Flash, and GLM-5.3—covering sparse architectures, matching benchmarks, checkpoint formats, and evaluation plans."
updated: 2026-11-18
---

> [!NOTE] Executive Summary (TL;DR)
> - **November 2026 Five-Lab Lineup**: Between mid-October and November 18, 2026, China's frontier ecosystem shipped major upgrades—Alibaba unveiled **`Qwen4-Max`** (Nov 16, `~2.4T` total / `~71B` active native multimodal sparse MoE with up to `~262K` thinking output), Moonshot launched **`Kimi K3.1 Pro`** (fusing **Gated DSA + KDA** across `1.04M` context), DeepSeek paired **`DeepSeek-V4-Pro`** (`1.6T` open-weights) with **`DeepSeek-V4.1-Flash-1017`** (`552B` asymmetric `8B/16B` multimodal MoE), MiniMax released **`MiniMax M3.1 Flash`** (`428B/23B` open-weights, sunsetting legacy M2.5/M2.7 on Nov 18), and Zhipu **`GLM-5.3`** (`~753B`) anchored environment-scaled terminal engineering.
> - **Architectural Divergence**: Chinese frontier labs have moved decisively beyond dense MHA toward **hybrid Gated-DSA + KDA linear states** (Kimi), **CSA + HCA / DSA sequence-sparse latents** (DeepSeek), and **asymmetric Prefill/Decode expert routing** (`V4.1-Flash`).
> - **Ecosystem Cross-Links**: Compare against Western commercial APIs in our [GPT-6.2 / Claude Fable 5.2 / Gemini 4 Benchmark Guide](/en/articles/model-comparison-2026/), explore the interactive [Frontier Model Matrix](/en/models/), and size private clusters with the [DeepSeek-V4 & Kimi K3 Deployment Guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/).

## Scope: Separating Sourced Model-Card Facts from Workload Acceptance

Updated through **November 18, 2026**, this guide examines China's five flagship LLM families across sparse attention topologies, open-weight checkpoint requirements, matching public benchmark versions, and API unit economics. Following strict fact-checking discipline, public benchmark figures are compared only across identical benchmark versions and documented harnesses, while workload sections provide deterministic acceptance protocols rather than unverified synthetic rankings.

---

## 1. November 2026 Chinese Frontier Architecture & Pricing Matrix

| Property | Qwen4-Max *(Alibaba)* | Kimi K3.1 Pro *(+ Kimi K3)* | DeepSeek-V4-Pro & V4.1-Flash-1017 | MiniMax M3.1 Flash | GLM-5.3 *(Zhipu AI)* |
| --- | --- | --- | --- | --- | --- |
| **Release Milestone** | `2026-11-16` | `K3.1 Pro`: 2026-10/11<br>`K3`: 2026-09 | `V4.1-Flash`: 2026-10-17<br>`V4-Pro`: 2026-08/11 *(SageMaker Nov)* | `2026-10/11`<br>*(legacy M2.5/M2.7 sunset 2026-11-18)* | `2026-09`<br>*(dual-track toward 1T+ series)* |
| **Total / Active Params** | `~2.4T` total / **`~71B`** active sparse MoE | `~2.8T` total / **`104B`** active MoE | • `V4-Pro`: `1.6T` / **`49B`**<br>• `V4.1-Flash`: `552B` / **`8B(prefill)·16B(decode)`** | `~428B` total / **`23B`** ultra-lean active MoE | `~753B` total (with shared & routed experts per model card) |
| **Context / Max Output** | `1M` context / up to **`~262K`** thinking output | `1.04M` (`1,048,576`) tokens | `1M`-class context | `1M`-class context | `1M`-class context |
| **Core Architectural Focus** | Native text/image/video; extreme-horizon AI4Science reasoning (validated on semiconductor coolant discovery) | Evolves K3 (`69 KDA + 24 Gated MLA`) into **Gated DSA + KDA** hybrid attention with native vision | `V4-Pro`: **CSA + HCA** compressed sparse attention; `V4.1-Flash`: asymmetric expert activation + native doc/chart vision | Multimodal MoE co-designed for high-throughput SWE coding & GUI computer use | **Environment Scaling** RL across verifiable terminal and software sandboxes |
| **Weights & Licensing** | Commercial flagship API (backed by open Qwen ecosystem) | **Open weights** + managed API (incl. `K3.1 Pro Highspeed`) | **Open weights** (verify official Model License) + low-cost API | **Open weights** + ultra-low-cost cloud API | **Open weights** (verify official license) + managed API |
| **Reference API Pricing**<br>*(per 1M tokens, In / Out)* | **`$1.50 / $4.50`**<br>*(`$0.075` cache hit)* | **`$2.00 / $10.00`**<br>*(`$0.20` cache hit)* | **`$0.30 / $1.20`**<br>*(`$0.15 / $0.60` off-peak)* | **`$0.15 / $0.60`**<br>*(`$0.015` cache hit)* | **`$0.50 / $2.00`** |

### Key Architectural Mechanics Explained

1. **Kimi `K3` → `K3.1 Pro` (KDA Recurrent States + Gated DSA)**: In [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3), 69 **KDA (Kimi Delta Attention)** layers maintain fixed-size channel-gated recurrent matrices while 24 Gated MLA layers preserve exact global retrieval. `Kimi K3.1 Pro` upgrades the global attention layers to **Gated DeepSeek Sparse Attention (Gated DSA)** across a `1,048,576`-token window, cutting both long-prefill FLOPs and linear KV cache growth (see exact memory derivations in [Kimi KDA, DeepSeek MLA & V4 CSA/HCA](/en/articles/kimi-kda-deepseek-mla-architecture/)).
2. **DeepSeek `V4-Pro` vs. `V4.1-Flash-1017` (Apex Depth vs. Asymmetric Serving Efficiency)**: [DeepSeek-V4-Pro](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro) (`1.6T / 49B`) targets maximum reasoning depth via **CSA (Compressed Sparse Attention) + HCA (Heavily Compressed Attention)** (kernel teardown in [DeepInfer Architecture](/en/articles/deepinfer-deepseek-recipe-architecture/)). Released October 17, 2026, `DeepSeek-V4.1-Flash-1017` (`552B`) introduces **asymmetric expert routing—activating just `8B` parameters during compute-bound Prefill and `16B` during memory-bound Decode**—while adding native 1M-token chart and document multimodality.
3. **Alibaba `Qwen4-Max` vs. MiniMax `M3.1 Flash` (262K Scientific CoT vs. 23B-Active Execution)**: Launched November 16, 2026, `Qwen4-Max` supports up to **`~262K` thinking tokens per completion** for deep R&D synthesis and repository-scale planning; conversely, `MiniMax M3.1 Flash` activates only **`23B` parameters** per forward pass (`428B` total) at `$0.15 / $0.60`, serving as the high-speed drop-in successor to legacy M2.5/M2.7 endpoints retired on November 18, 2026.

---

## 2. Benchmark Discipline: Only Compare Matching Versions & Harnesses

A frequent mistake in procurement decks is mixing scores across incompatible benchmark revisions (e.g., `Terminal-Bench 2.1` vs. the substantially harder `Terminal-Bench 3.0`) or distinct agent scaffolds. The table below preserves the matched comparison reported in the [official GLM-5.3 model card](https://huggingface.co/zai-org/GLM-5.3#benchmark) to illustrate strict version control:

| Matched Benchmark | Kimi K3 | GLM-5.3 | DeepSeek-V4 Pro-0813 | Engineering Interpretation |
| --- | --- | --- | --- | --- |
| **Terminal-Bench 2.1** | `88.3` | `88.2` | `87.9` | Saturating near `88%` across all three; differences sit within harness variance |
| **Terminal-Bench 3.0** | `17.4` | `28.3` | *Not reported in table* | Rebuilt harder suite (evaluated under a specified Claude Code harness at `avg@3`); omitted != zero |
| **DeepSWE v1.1** | `67.5` | `66.9` | `62.7` | Sensitive to turn limits, context compaction rules, and test-runner feedback formatting |

Apply this exact control discipline when benchmarking November's `Qwen4-Max`, `Kimi K3.1 Pro`, `DeepSeek-V4.1-Flash`, and `MiniMax M3.1 Flash` internally (see our [LLM Evaluation Guide](/en/articles/llm-evaluation-guide/)): never compare one vendor's unconstrained `Pass@8` score against another's single-shot `Pass@1`.

---

## 3. Reproducible Workload Evaluation Plans

### Scenario 1: Million-Token Multimodal Financial Filings & Technical Schematics
- **Primary Candidates**: `Qwen4-Max`, `Kimi K3.1 Pro`, `DeepSeek-V4.1-Flash-1017` (all featuring native chart/document vision across `1M` context).
- **Controlled Protocol**: Freeze authorized PDFs containing complex merged tables and scanned diagrams under fixed visual-token budgets. Require structured JSON outputs citing exact `numeric_value`, `page_number`, `table_id`, and `cross_sheet_reconciliation_delta`. Grade exact numeric accuracy and unsupported-claim rates—synthetic needle-in-a-haystack scores do not prove financial-audit fidelity.

### Scenario 2: Autonomous Terminal Troubleshooting & GUI Computer Use
- **Primary Candidates**: `GLM-5.3`, `Kimi K3.1 Pro`, `MiniMax M3.1 Flash` (for post-training background, see our [Environment Scaling Agent Guide](/en/articles/environment-scaling-agent-guide/)).
- **Controlled Protocol**: Reset identical broken VM snapshots in milliseconds before every episode (see [Firecracker MicroVM Agent Sandbox & Snapshot Architecture](/en/articles/agent-sandbox-firecracker-microvm-snapshot-isolation/)), fixing Bash/GUI permissions, a `30`-turn ceiling, and `300s` wall-clock timeout. Grade recovery via deterministic external probes (DNS resolution, systemd health, Kubernetes Endpoints, zero collateral config corruption).

### Scenario 3: Multi-File Repository Refactoring (SWE Agents)
- **Primary Candidates**: `Qwen4-Max` / `DeepSeek-V4-Pro` / `Kimi K3.1 Pro` as Planners; `MiniMax M3.1 Flash` / `DeepSeek-V4.1-Flash` as parallel test-fix Workers.
- **Controlled Protocol**: Pin repository commits and hidden holdout test suites. Compare end-to-end resolved rate under **equal dollar caps per issue** (e.g., $\le \$0.05$ / issue) to measure whether iterative multi-sample retries on `$0.15–$0.30` fast MoEs outperform single-pass premium calls on your codebase.

---

## 4. Self-Hosting VRAM Sizing & Native Checkpoint Formats

Open-weight MoE memory capacity is dictated by **total parameters**, never active parameters alone:
1. **Multi-Node Trillion-Parameter Class (`Kimi K3 / K3.1 Pro` `2.8T`, `DeepSeek-V4-Pro` `1.6T`)**: Requires multi-node RDMA / NVLink fabrics and native low-bit formats—such as Kimi's native `MXFP4` (~`1.4 TB+` static weights) or DeepSeek's native `FP4 / FP8` mix (~`0.9–1.6 TB` static weights, plus paged KV pools and Expert Parallelism All-to-All workspaces). Review exact topology sizing in the [DeepSeek-V4 & Kimi K3 Deployment Guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/) and [GB200 NVL72 SuperPoD & NCCL Collectives](/en/articles/rack-scale-superpod-nvl72-nccl-collectives/).
2. **Single-Node 8-GPU Viable Class (`DeepSeek-V4.1-Flash` `552B`, `MiniMax M3.1 Flash` `428B`, `GLM-5.3` `753B`)**: Checkpoints in the `428B–552B` range quantized to `FP8` or `FP4/AWQ` (~`230 GB–560 GB` weights) fit inside a **single 8×H200 (`1,128 GB` HBM3e)** or **8×B200 (`1,440 GB` HBM3e)** node within one intra-node NVSwitch domain, avoiding cross-node Expert Parallelism operational overhead.

## Frequently Asked Questions (FAQ)

### Q1: How should teams running legacy `MiniMax M2.5` or `M2.7` handle the November 18, 2026 sunset?
MiniMax officially retired its legacy M2 endpoints on **November 18, 2026** in favor of **`MiniMax M3.1 Flash`** (`428B` total / `23B` active, `1M` context, `$0.15 / $0.60`). Beyond updating the model identifier, verify prefix-cache alignment (`$0.015/1M` cache reads) and re-run regression tests covering tool-call JSON escaping and stop-sequence behavior.

### Q2: When should we pick `DeepSeek-V4-Pro` vs. `DeepSeek-V4.1-Flash-1017`?
Choose **`DeepSeek-V4-Pro`** (`1.6T / 49B`) for deep single-pass mathematical proofs, C++/CUDA kernel synthesis, and hard architectural planning. Choose **`DeepSeek-V4.1-Flash-1017`** (`552B` total, asymmetric `8B` prefill / `16B` decode) when workloads require native multimodal chart/document ingestion, ultra-low TTFT streaming, or single-node 8×H200 private hosting.

### Q3: Should production endpoints leave `Qwen4-Max`'s `~262K` thinking output uncapped by default?
No. The `~262K` reasoning horizon is engineered for AI4Science discovery, formal verification, and massive repository synthesis. Leaving `max_tokens` uncapped on routine online endpoints risks multi-minute tail latencies and runaway output billing if a prompt triggers overthinking loops; enforce tiered token budgets per route.

### Q4: What is the most common TCO mistake when comparing self-hosted open weights against Chinese cloud APIs?
With managed rates as low as `$0.15 / $0.60` (`MiniMax M3.1 Flash` and off-peak `DeepSeek`) and `$0.075` cached reads (`Qwen4-Max`), the biggest self-hosting blind spot is **off-peak GPU idle depreciation** and multi-node EP SRE overhead. Self-hosting wins primarily under strict data-sovereignty mandates or sustained high-utilization 24/7 traffic verified via our [Token & VRAM Calculators](/en/tools/).
