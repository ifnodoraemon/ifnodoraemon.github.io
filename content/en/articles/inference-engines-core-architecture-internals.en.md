---
title: "Production LLM Inference Engines Teardown: vLLM v1 vs. SGLang vs. TensorRT-LLM vs. llama.cpp Internals"
slug: inference-engines-core-architecture-internals
date: 2026-09-24
tag: Inference Engines
tagClass: tag-emerald
category: Inference Systems
series: llm-inference
seriesOrder: 9
description: "Codebase teardown of top LLM inference engines: vLLM v1 multiprocess EngineCore & unified scheduler, SGLang RadixAttention, TensorRT-LLM in-flight batching, and llama.cpp quantization."
extraTags:
  - vLLM
  - SGLang
  - TensorRT-LLM
  - llama.cpp
  - Scheduler
  - Kernel Fusion
---

> [!NOTE] Executive Summary (TL;DR)
> - **Engine Architecture Teardown**: In-depth disassembly of scheduler internals across vLLM (v1 pipeline overhaul), SGLang (RadixAttention maximum throughput), TRT-LLM (NVIDIA hardware-bound tuning), and llama.cpp (edge quantization).
> - **Architectural Selection**: SGLang excels in structured prompts and multi-turn prefix workloads; vLLM offers the most robust ecosystem integrations; llama.cpp leads local edge execution.
> - **Recommended Reading**: Compare real-world benchmarks in [SGLang vs vLLM Architecture Comparison](/en/articles/sglang-vs-vllm-architecture/) and follow the [vLLM Serving Production Guide](/en/articles/vllm-serving-guide/).

## Introduction: From Toy Scripts to Enterprise-Grade Serving Runtimes

In the early days of the generative AI boom in 2023, most developers initiated LLM inference on a single GPU using a simple Python loop:

```python
# The Naive PyTorch Autoregressive Loop
for _ in range(max_new_tokens):
    outputs = model(input_ids)
    next_token = torch.argmax(outputs.logits[:, -1, :], dim=-1)
    input_ids = torch.cat([input_ids, next_token.unsqueeze(-1)], dim=-1)
```

While clean and educational, running raw PyTorch loops in high-concurrency production deployments proves disastrous:
1. **Static Memory Allocations Waste $60\% \sim 80\%$ of GPU Memory**: Memory fragmentation prevents handling concurrent user requests;
2. **Padding Inefficiencies**: Uneven request lengths waste substantial compute cycles processing meaningless padding tokens;
3. **Severe Python GIL and Scheduling Latency**: In autoregressive generation where single-step GPU kernel execution completes in milliseconds, Python interpretation overhead starves the GPU, leaving Tensor Cores idle;
4. **Memory Bandwidth Choke**: Independent kernel invocations bounce tensors between High Bandwidth Memory (HBM) and SRAM, plunging Model FLOPs Utilization (MFU) below $15\%$.

To extract maximum performance from modern accelerators, open-source communities and hardware vendors engineered four industry-standard inference engines:
- **vLLM (UC Berkeley / LMSYS / vLLM Community)**: The pioneer that standardized modern inference via PagedAttention memory virtualization, now fundamentally re-architected in **vLLM v1** around an isolated multiprocess `EngineCore`, unified token-budget scheduler, and persistent `InputBatch` state;
- **SGLang (LMSYS / Stanford)**: Tailored for multi-turn agentic interactions, pioneering **RadixAttention tree-based caching** with low-overhead execution loops;
- **TensorRT-LLM (NVIDIA)**: NVIDIA's high-performance powerhouse, deeply fusing CUTLASS and FlashAttention kernels with static engine graphs for peak hardware throughput;
- **llama.cpp (Georgi Gerganov)**: The minimalist Swiss Army knife built in pure zero-dependency C/C++, introducing the GGUF container standard and dominating edge and on-device computing.

In this ninth chapter of the **Production LLM Inference Engines** series, we bypass public benchmarks to dissect the architectural internals, scheduler execution loops, and underlying design philosophies of these four runtimes, concluding with an enterprise decision matrix.

---

## 1. Architectural Philosophy and Top-Level Topology

To evaluate these runtimes fairly, one must first recognize their contrasting **first-principle objectives**:

```mermaid
flowchart TD
    subgraph ArchComparison["Core Topological Comparison of Leading Inference Engines"]
        subgraph VLLM["vLLM v1 Architecture"]
            V_IN["HTTP / Tokenizer Process"] -->|"ZeroMQ IPC"| V_ENG["EngineCore Process (Python)"]
            V_ENG --> V_SCHED["Unified Token-Budget Scheduler"]
            V_SCHED --> V_RUN["Persistent InputBatch + torch.compile / CUDA Graph"]
        end

        subgraph SGL["SGLang Architecture"]
            S_IN["Complex Multi-Turn Prompts / Agents"] --> S_ROUTER["RadixTree Global Router"]
            S_ROUTER --> S_TREE["RadixAttention LRU Tree State Machine"]
            S_TREE --> S_RUN["SGL-Kernel + FlashInfer Backend"]
        end

        subgraph TRT["TensorRT-LLM Architecture"]
            T_IN["High-Concurrency Enterprise Workloads"] --> T_MGR["C++ GptManager (In-Flight Batching)"]
            T_MGR --> T_FUSED["CUTLASS / FMHA Fully Fused Graphs"]
            T_FUSED --> T_GPU["NVIDIA Tensor Core Bare-Metal Execution"]
        end

        subgraph LLAMA["llama.cpp Architecture"]
            L_IN["Edge / CPU / Personal Devices"] --> L_CORE["ggml-backend Abstraction Layer"]
            L_CORE --> L_QUANT["GGUF On-the-Fly Dequantization (Q4_K, Q2_K)"]
            L_CORE --> L_METAL["Metal / Vulkan / AVX-512 SIMD Execution"]
        end
    end
```

| Dimension | vLLM v1 | SGLang | TensorRT-LLM | llama.cpp |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Goal** | High-throughput, universally extensible standard ecosystem | Multi-turn agent loops, structured decoding, and prefix reuse | Peak hardware throughput and energy efficiency on NVIDIA silicon | Zero-dependency, ultra-quantized portability across edge devices |
| **Language Stack** | Multiprocess Python `EngineCore` (ZeroMQ IPC) + C++/CUDA/Triton kernels | Python scheduler + C++/CUDA kernels (SGL-Kernel) | Pure C++ engine runtime + Python build-time declarations | Pure C/C++ (Zero external library dependencies) |
| **Memory Architecture**| PagedAttention virtual block memory pool | RadixAttention tree-structured prefix caching pool | Static pre-allocated flat memory + In-Flight Paged KV | Memory-mapped (`mmap`) unified memory with split tensors |
| **Target Hardware** | NVIDIA GPU, AMD ROCm, Intel Gaudi, Ascend NPU | NVIDIA GPU, AMD ROCm | NVIDIA Silicon Exclusively (Hopper, Blackwell, Ada) | Apple Silicon, x86 CPU, ARM Mobile, embedded SoCs |

---

## 2. vLLM v1: Multiprocess EngineCore Isolation and the Unified Zero-Overhead Scheduler

### 2.1 The Control-Plane Bottleneck of the v0 Architecture

In early vLLM v0 releases, despite revolutionary memory efficiency via PagedAttention, the control plane suffered severe Python overhead as GPU execution speeds accelerated.

On modern accelerators (e.g., H100/H200), a single autoregressive decoding step executes on the GPU in **$1.5 \sim 3 \text{ ms}$**. However, v0 colocated HTTP handling, tokenization, detokenization, heavy `SequenceGroup` Python objects, separate prefill/decode queues, and from-scratch CPU batch tensor construction within shared Python GIL paths—consuming **$2 \sim 4 \text{ ms}$** of CPU time per step (even v0's transitional multi-step scheduling workaround introduced brittle state complexity). The GPU continually stalled waiting for CPU input preparation, capping Model FLOPs Utilization (MFU).

### 2.2 Inside vLLM v1: EngineCore, Unified Token-Budget Scheduling, and Persistent InputBatch

Rather than rewriting the scheduler in rigid C++ and sacrificing Python's rapid model-onboarding velocity, **vLLM v1** eliminated CPU overhead through three foundational systems redesigns:

1. **Multiprocess `EngineCore` Isolation over ZeroMQ IPC**:
   HTTP ingress, prompt tokenization, and incremental detokenization are decoupled into dedicated front-end processes communicating asynchronously over **ZeroMQ IPC** with an isolated Python `EngineCore` process, completely shielding the scheduling and GPU execution loop from GIL contention;
2. **Unified Token-Budget Scheduler (`vllm/v1/core/sched/scheduler.py`)**:
   vLLM v1 completely removes v0's heavyweight `SequenceGroup` hierarchy and separate prefill/decode scheduling branches. Every request tracks `num_computed_tokens` against its total tokens, and each step outputs a single unified dictionary `num_scheduled_tokens: dict[str, int]`. Decode naturally schedules `1` token (or `1 + k` tokens under speculative decoding), chunked prefill schedules `min(remaining_tokens, token_budget)`, and zero-overhead Automatic Prefix Caching (`get_computed_blocks`) is integrated natively by default;
3. **Persistent `InputBatch` Diffs, Piecewise `torch.compile` + CUDA Graphs, and Async Overlap**:
   Instead of rebuilding batch tensors from scratch every iteration, `GPUModelRunner` maintains a **persistent `InputBatch`** CPU tensor state and applies only incremental per-step diffs (added/removed requests and newly sampled tokens). Forward execution combines **piecewise `torch.compile`** with **CUDA Graphs**, while asynchronous scheduling and output processing overlap step $t+1$ CPU preparation directly behind step $t$ GPU execution.

```text
vLLM v1 Asynchronous Overlapped Pipeline:
CPU EngineCore : [Schedule Step t] -> [Schedule & Diff InputBatch Step t+1] -> [Schedule Step t+2]
GPU ModelRunner:                      [Execute Piecewise Compiled + CUDA Graph Step t] -> [Execute Step t+1]
```

Below is an accurate Python breakdown of vLLM v1's unified `Scheduler.schedule()` loop (`vllm/v1/core/sched/scheduler.py`):

```python
# Simplified from vllm/v1/core/sched/scheduler.py (Unified Token-Budget Scheduler)
class Scheduler:
    def schedule(self) -> SchedulerOutput:
        scheduled_running: list[Request] = []
        scheduled_new: list[Request] = []
        preempted_reqs: list[Request] = []
        # Unified scheduling map: req_id -> tokens scheduled in this iteration (prefill & decode alike)
        num_scheduled_tokens: dict[str, int] = {}
        token_budget = self.max_num_scheduled_tokens

        # 1. Schedule active requests in `running` queue first (decode or continuation of chunked prefill)
        req_idx = 0
        while req_idx < len(self.running) and token_budget > 0:
            request = self.running[req_idx]
            num_new_tokens = request.num_tokens_with_spec - request.num_computed_tokens
            num_new_tokens = min(num_new_tokens, token_budget)

            # Allocate KV blocks incrementally; preempt lowest-priority tail requests on memory pressure
            while True:
                new_blocks = self.kv_cache_manager.allocate_slots(request, num_new_tokens)
                if new_blocks is not None:
                    break
                preempted = self.running.pop()
                self.kv_cache_manager.free(preempted)
                preempted.num_computed_tokens = 0
                self.waiting.appendleft(preempted)
                preempted_reqs.append(preempted)
                if preempted is request:
                    break

            if new_blocks is None:
                break  # Current request itself was preempted

            scheduled_running.append(request)
            num_scheduled_tokens[request.request_id] = num_new_tokens
            token_budget -= num_new_tokens
            req_idx += 1

        # 2. If no preemption occurred, admit requests from `waiting` queue with remaining token budget
        if not preempted_reqs:
            while self.waiting and token_budget > 0 and len(self.running) < self.max_num_running_reqs:
                request = self.waiting[0]
                # Native zero-overhead prefix cache block lookup
                computed_blocks, num_cached_tokens = self.kv_cache_manager.get_computed_blocks(request)
                num_new_tokens = request.num_prompt_tokens - num_cached_tokens
                num_new_tokens = min(num_new_tokens, token_budget)

                new_blocks = self.kv_cache_manager.allocate_slots(
                    request, num_new_tokens, new_computed_blocks=computed_blocks
                )
                if new_blocks is None:
                    break  # Insufficient free KV blocks; keep waiting

                self.waiting.popleft()
                self.running.append(request)
                request.num_computed_tokens = num_cached_tokens
                scheduled_new.append(request)
                num_scheduled_tokens[request.request_id] = num_new_tokens
                token_budget -= num_new_tokens

        return SchedulerOutput(
            scheduled_new_reqs=scheduled_new,
            scheduled_cached_reqs=scheduled_running,
            num_scheduled_tokens=num_scheduled_tokens,
            preempted_reqs=preempted_reqs,
        )
```

By combining ZeroMQ multiprocess isolation, a unified token-budget scheduler, persistent `InputBatch` state diffs, and async CPU/GPU overlap, vLLM v1 hides virtually all Python control-plane latency and achieves **up to $1.7\times+$ higher end-to-end throughput** on high-concurrency and long-context workloads.

---

## 3. SGLang: Tree-Structured Prefix State Machines for Fast Agent Loops

Where vLLM excels as a general-purpose serving platform, **SGLang** specializes in multi-turn agent workflows, extensive few-shot prompts, and structured output generation.

### 3.1 RadixAttention Codebase Internals

As explored conceptually in [Chapter 04 on Prefix Caching and RadixAttention](/en/articles/prefix-caching-radix-attention-internals/), SGLang models KV Cache memory as a dynamic Radix Tree:

```python
# SGLang RadixTree Core Matching and Eviction Logic
class RadixTree:
    def __init__(self):
        self.root = TreeNode(key_tokens=[])
        self.eviction_lru = DoublyLinkedList()

    def match_prefix(self, token_ids: List[int]) -> Tuple[List[int], TreeNode]:
        """
        Locates the longest shared prefix in O(K) time complexity, where K is prefix depth
        """
        curr = self.root
        matched_blocks = []
        idx = 0
        while idx < len(token_ids):
            child = curr.find_child(token_ids[idx])
            if child is None:
                break
            matched_len = child.match_prefix(token_ids[idx:])
            matched_blocks.extend(child.get_block_ids(matched_len))
            idx += matched_len
            if matched_len < len(child.key_tokens):
                # Partial match identified: split tree node
                break
            curr = child
            
        # Update LRU cache recency
        self.eviction_lru.touch(curr)
        return matched_blocks, curr
```

### 3.2 Tight Integration with SGL-Kernel and FlashInfer

SGLang pairs this tree data structure directly with optimized custom kernels:
- **In-Kernel Constrained Sampling**: For structured JSON generation, SGLang tracks grammar state machines directly within C++ logit processors, avoiding costly host-device transfers of full vocabulary tensors;
- **Zero-Copy Branching**: In tree search applications (MCTS or multi-agent voting), child branches share memory block references with ancestors using reference counting, performing Copy-on-Write only when tokens diverge.

---

## 4. TensorRT-LLM: Extreme Kernel Fusion on NVIDIA Silicon

For deployments exclusively targeting modern NVIDIA data center hardware (e.g., 8x H100/H800/B300 servers with NVSwitch fabrics), **TensorRT-LLM** provides unparalleled compute efficiency.

### 4.1 In-Flight Batching (IFB) and Pre-Compiled Computation Graphs

Rather than relying on dynamic graph generation, TensorRT-LLM compiles model architectures into static `.engine` binaries tailored to specific GPU models and tensor-parallel widths:
- A pure C++ `GptManager` controls **In-Flight Batching (IFB)**, decoupling layer execution into concurrent CUDA streams to hide inter-GPU communication latency;
- Memory allocation maps onto pre-computed flat arenas, virtually eliminating runtime allocation jitter.

### 4.2 Extreme Kernel Fusion Pipelines

TensorRT-LLM achieves peak throughput by eliminating intermediate memory reads and writes:

```text
Standard Transformer Layer Execution:
[RMSNorm] --(Write HBM)--> [QKV GEMM] --(Write HBM)--> [RoPE] --(Write HBM)--> [FlashAttention] ...

TensorRT-LLM Deeply Fused Pipeline:
┌────────────────────────────────────────────────────────────────────────┐
│ Fused RMSNorm + QKV Projection + RoPE (Executed in L1/SRAM registers)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Fused Paged-KV Attention + Output Projection Linear Kernel             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Fused SwiGLU MLP (Gate + Up Projection + Activation fully integrated)  │
└────────────────────────────────────────────────────────────────────────┘
```

By leveraging NVIDIA CUTLASS, **RMSNorm, QKV GEMM, and RoPE positional encoding** execute within a single fused kernel. Intermediate activations remain entirely within streaming multiprocessor (SM) register files and shared memory, bypassing HBM entirely.

*Trade-off*: Modifying non-standard architectures requires authoring custom C++ TensorRT plugins and re-running extended compilation pipelines.

---

## 5. llama.cpp: The Minimalist Swiss Army Knife for Edge Runtimes

While enterprise engines focus on multi-GPU server clusters, **llama.cpp** takes a completely different path: **enabling large language models to run efficiently on commodity CPUs, mobile devices, and consumer laptops.**

### 5.1 Pure C/C++ Architecture with Zero External Dependencies

Authored by Georgi Gerganov, llama.cpp requires no PyTorch, no CUDA runtime, and no external package managers:
- The core tensor library, `ggml`, maps computations directly to hardware SIMD vector intrinsics;
- It utilizes AVX-512 and AVX2 on x86 CPUs;
- On Apple Silicon, it invokes Metal Performance Shaders (MPS), achieving direct zero-copy memory reads via unified memory architectures (UMA);
- On mobile and embedded platforms, it supports Vulkan, OpenCL, and ARM NEON.

### 5.2 The GGUF Format and Non-Uniform k-Quants

llama.cpp standardized the universal **GGUF container format**, packaging model weights, tokenizers, hyperparameter configs, and quantization metadata into a single self-contained binary.

Furthermore, its custom **k-quants block-quantization algorithms** enable aggressive compression:

```text
llama.cpp k-quants Precision Hierarchy:
┌───────────────────────────────────────────────────────────────┐
│ Q4_K_M: 4.5-bit attention layers with 4-bit feed-forward grids│
│ Q3_K_S: 3-bit compression reducing memory footprint by ~75%   │
│ Q2_K  : 2-bit quantization running 70B models on 24GB GPUs    │
└───────────────────────────────────────────────────────────────┘
```

Weights are dequantized on-the-fly during matrix-vector multiplications using fast lookup tables, enabling multi-billion parameter models to execute smoothly on personal workstations.

---

## 6. Enterprise Production Decision Matrix: Which Engine to Choose?

When deploying production infrastructure, system architects must select runtimes aligned with operational realities:

```mermaid
flowchart TD
    START{"What is your deployment target and workload profile?"}
    
    START --> C1["Personal devices / Edge hardware / Mac Studio / On-device apps"]
    C1 ==> R_LLAMA["Select: llama.cpp (GGUF quantization, zero dependencies)"]
    
    START --> C2["Homogeneous NVIDIA clusters (8x H100/H800/B300), maximizing pure throughput"]
    C2 ==> R_TRT["Select: TensorRT-LLM (Fused kernels, peak hardware MFU)"]
    
    START --> C3["Complex multi-turn agents / Structured JSON outputs / High prefix sharing"]
    C3 ==> R_SGL["Select: SGLang (RadixTree caching, lightweight execution)"]
    
    START --> C4["General-purpose Model-as-a-Service (MaaS) / Multi-hardware (AMD, Ascend)"]
    C4 ==> R_VLLM["Select: vLLM v1 (Isolated EngineCore, unified scheduler, broadest ecosystem)"]
```

### Comprehensive Technical Evaluation Matrix (1 to 5 Stars)

| Evaluation Criterion | vLLM v1 | SGLang | TensorRT-LLM | llama.cpp |
| :--- | :---: | :---: | :---: | :---: |
| **Peak Throughput Capacity** | ⭐️⭐️⭐️⭐️☆ | ⭐️⭐️⭐️⭐️☆ | ⭐️⭐️⭐️⭐️⭐️ (Industry Peak) | ⭐️⭐️☆☆☆ |
| **Time to First Token (TTFT)** | ⭐️⭐️⭐️⭐️☆ | ⭐️⭐️⭐️⭐️⭐️ (Superb Prefix Reuse) | ⭐️⭐️⭐️⭐️☆ | ⭐️⭐️⭐️☆☆ |
| **Agent / Multi-Turn Suitability** | ⭐️⭐️⭐️☆☆ | ⭐️⭐️⭐️⭐️⭐️ (Optimal Choice) | ⭐️⭐️☆☆☆ | ⭐️⭐️⭐️☆☆ |
| **Model Ecosystem Coverage** | ⭐️⭐️⭐️⭐️⭐️ (Fastest Community Adoption) | ⭐️⭐️⭐️⭐️☆ | ⭐️⭐️☆☆☆ (Official Ports Only) | ⭐️⭐️⭐️⭐️☆ |
| **Heterogeneous Silicon (AMD/Intel/ARM)** | ⭐️⭐️⭐️⭐️⭐️ (Widest Accelerator Support) | ⭐️⭐️⭐️☆☆ | ⭐️☆☆☆☆ (Strictly NVIDIA) | ⭐️⭐️⭐️⭐️⭐️ (Runs Anywhere) |
| **Custom Extensibility & DevOps Overhead** | ⭐️⭐️⭐️⭐️☆ (Well Documented) | ⭐️⭐️⭐️⭐️☆ (Lightweight Codebase) | ⭐️☆☆☆☆ (Steep Compilation Curve) | ⭐️⭐️⭐️⭐️⭐️ (Clone & Compile) |

---

## Summary and Series Finale Outlook

From vLLM v1's multiprocess `EngineCore` and unified zero-overhead scheduler to SGLang's dynamic Radix Trees, TensorRT-LLM's fused kernel pipelines, and llama.cpp's edge minimalism, modern inference runtimes represent specialized trade-offs across the compute landscape.

With our examination of kernel architectures, batching schedulers, and runtime engines complete, we arrive at the frontier of serving systems. In the **tenth and final chapter of this series**, we investigate: **The Future of LLM Inference: Test-Time Compute, Reasoning Scheduling, and Tiered Cluster Storage**, exploring how long reasoning chains (16k~128k generated thinking tokens) will redefine memory hierarchies and speculative decoding schedulers.

---

## Frequently Asked Questions (FAQ)

### Q1: Why do enterprise Model-as-a-Service (MaaS) platforms often deploy both vLLM and SGLang concurrently?
Deploying both represents a practical division of labor based on workload characteristics:
- **vLLM v1 serves as the universal gateway**: It powers general single-turn Q&A, document summarization, code generation, and long-tail open-source models, leveraging its extensive community model support and cross-hardware compatibility (e.g., AMD ROCm, Ascend NPUs);
- **SGLang powers multi-turn agent platforms**: For agentic workflows sharing massive system prompts (frequently thousands of tokens containing tool definitions and rules), RadixAttention achieves $90\%+$ prefix cache hits, significantly reducing latency and compute costs.

### Q2: If TensorRT-LLM delivers such high throughput, why has it not completely eclipsed alternative runtimes?
TensorRT-LLM achieves peak performance through significant operational trade-offs:
1. **Prolonged Compilation Overhead**: Building optimized engines requires compiling ahead of time for specific GPU architectures, tensor-parallel widths, and maximum batch sizes. Recompiling across varied hardware topologies can take hours;
2. **Debugging Complexity**: The core runtime is embedded within low-level C++ drivers, making runtime debugging challenging when non-standard inputs cause failures;
3. **Lagging Support for Novel Architectures**: When academic or open-source labs introduce novel attention mechanisms (e.g., DeepSeek MLA or KDA), community engines like vLLM and SGLang frequently ship Triton implementations within days, whereas TensorRT-LLM requires engineering custom C++ plugins.

### Q3: How does llama.cpp's Unified Memory zero-copy differ from discrete data center GPU HBM?
On Apple Silicon devices (e.g., Mac Studio with M-series chips), the CPU and GPU share a unified pool of high-bandwidth LPDDR memory (achieving 400~800 GB/s bandwidth).
In standard PC or data center servers, model weights must be copied from host system RAM across the PCIe bus into discrete GPU HBM before computation can begin. Under unified memory architectures, llama.cpp uses operating system `mmap()` calls to allow the GPU to read weights directly from memory in place. This eliminates weight transfer overhead and allows running models whose parameter sizes exceed traditional single-GPU VRAM limits (e.g., running 70B models in 128GB unified RAM), though raw double-precision and half-precision compute density remains lower than dedicated data center Tensor Cores.
