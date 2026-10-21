#!/usr/bin/env python3
"""
Automated SEO & GEO Enrichment Script
- Injects structured Direct-Answer TL;DR cards (> [!NOTE] 核心速览 (TL;DR))
- Establishes in-content contextual internal linking across topic clusters
- Strictly complies with .agents/rules/seo-and-routing.md and .agents/rules/safe-markdown-editing.md
"""

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZH_DIR = os.path.join(ROOT, "content", "zh", "articles")
EN_DIR = os.path.join(ROOT, "content", "en", "articles")

# -------------------------------------------------------------
# Topic Cluster 1: LLM Inference Engines & GPU Systems
# -------------------------------------------------------------
CLUSTER_INFERENCE = {
    "inference-roofline-prefill-decode": {
        "zh": [
            "**双阶段物理撕裂**：大模型自回归推理在 Prefill（计算密集型，高算力强度）与 Decode（访存密集型，低算力强度）阶段存在本质矛盾，单个 Token 的自回归生成严重受限于 GPU HBM 带宽墙。",
            "**硬件利用率落差**：Decode 阶段运算强度往往低于 1 FLOP/Byte，Tensor Core 大部分周期都在等待显存搬运，利用率经常跌破 5%。",
            "**核心工程解法**：通过 [Continuous Batching](/articles/continuous-batching-chunked-prefill-guide/) 提升有效 Batch 并发、利用 [PagedAttention](/articles/pagedattention-memory-virtualization/) 消除碎片化显存浪费，并在超大集群落地 [P/D 分离架构](/articles/pd-disaggregation-distributed-kv-cache/) 彻底解耦异构负载。"
        ],
        "en": [
            "**Physical Two-Phase Split**: Autoregressive LLM inference bifurcates into compute-bound Prefill (high arithmetic intensity) and memory-bound Decode (low arithmetic intensity), heavily bottlenecked by GPU HBM bandwidth.",
            "**Compute Utilization Penalty**: Single-token Decode arithmetic intensity drops below 1 FLOP/Byte, idling Tensor Cores during memory fetch cycles and suppressing utilization below 5%.",
            "**Engineering Solutions**: Production engines mitigate this via [Continuous Batching](/en/articles/continuous-batching-chunked-prefill-guide/) for dynamic batching, [PagedAttention](/en/articles/pagedattention-memory-virtualization/) for memory virtualization, and [P/D Disaggregation](/en/articles/pd-disaggregation-distributed-kv-cache/) for decoupled cluster scheduling."
        ]
    },
    "pagedattention-memory-virtualization": {
        "zh": [
            "**显存虚拟化突破**：传统连续内存分配造成高达 60%~80% 的内部与外部显存碎片；PagedAttention 借鉴操作系统分页原理，将 KV Cache 切分为固定尺寸 Block，实现非连续物理显存的高效离散映射。",
            "**核心性能收益**：显存浪费率从传统方案的 60%+ 骤降至 4% 以下，同等 GPU 显存容量下服务吞吐并发直接提升 2~4 倍。",
            "**延伸演进**：分页机制后续被进一步拓展为 [RadixAttention 树状前缀复用](/articles/prefix-caching-radix-attention-internals/)，并与 [Chunked Prefill](/articles/continuous-batching-chunked-prefill-guide/) 以及 [vLLM 生产级调度](/articles/vllm-serving-guide/) 深度融合。"
        ],
        "en": [
            "**Memory Virtualization Breakthrough**: Traditional contiguous allocation wastes 60%~80% of VRAM in internal/external fragmentation. PagedAttention borrows OS paging principles to partition KV Cache into fixed-size physical blocks.",
            "**Core Metric Gains**: Memory waste drops from >60% to below 4%, enabling a 2x-4x increase in concurrent request serving capacity on identical GPU footprints.",
            "**Architectural Evolution**: Paging forms the foundation for [RadixAttention Prefix Caching](/en/articles/prefix-caching-radix-attention-internals/), seamless [Chunked Prefill](/en/articles/continuous-batching-chunked-prefill-guide/), and modern [vLLM Production Serving](/en/articles/vllm-serving-guide/)."
        ]
    },
    "continuous-batching-chunked-prefill-guide": {
        "zh": [
            "**动态调度重构**：传统静态批处理受制于最长请求产生严重气泡（Padding Waste）；Continuous Batching 以 Iteration（迭代步）为粒度动态插入新请求并剔除已完成请求。",
            "**消除排头阻塞**：通过 Chunked Prefill 将超长 Prompt 分片为固定预算（如 512 tokens），与正在运行的 Decode 步混合调度，彻底消除了超长 Prompt 导致的系统假死与 TPOT 剧烈抖动。",
            "**体系融合**：在工程落地中必须紧密结合 [PagedAttention 块生命周期](/articles/pagedattention-memory-virtualization/) 与 [SGLang / vLLM 架构实现](/articles/sglang-vs-vllm-architecture/)，防止显存超卖导致驱逐卡顿。"
        ],
        "en": [
            "**Dynamic Scheduling Revolution**: Static batching suffers massive padding bubbles due to variable sequence lengths. Iteration-level Continuous Batching dynamically ingests arriving requests and retires finished tokens per step.",
            "**Head-of-Line Blocking Mitigation**: Chunked Prefill slices long input prompts into budget chunks (e.g., 512 tokens), co-scheduling them alongside Decode steps to stabilize TPOT variance and prevent service freezes.",
            "**Engine Integration**: Production adoption requires synchronization with [PagedAttention block lifecycles](/en/articles/pagedattention-memory-virtualization/) and [SGLang vs vLLM scheduling architectures](/en/articles/sglang-vs-vllm-architecture/)."
        ]
    },
    "prefix-caching-radix-attention-internals": {
        "zh": [
            "**树状前缀复用**：多轮对话、Few-Shot 提示与 Agent 循环存在大量的重复 System Prompt 与上下文前缀；SGLang 提出的 RadixAttention 将传统 Hash 匹配升级为基数树（Radix Tree）动态维护。",
            "**零拷贝与动态驱逐**：利用引用计数与 LRU 策略管理活跃与待回收 Block，实现长前缀上下文的高达 70%+ 命中率与毫秒级首字延迟 (TTFT)。",
            "**系统联动**：前缀缓存与 [FlashInfer 异构内核加速](/articles/flashattention-flashinfer-kernel-evolution/) 以及 [投机解码 EAGLE](/articles/speculative-decoding-eagle-guide/) 组合时能释放极致推理能效。"
        ],
        "en": [
            "**Radix Tree Prefix Reuse**: Multi-turn dialogue, few-shot prompts, and agent workflows exhibit massive prefix redundancy. RadixAttention dynamically indexes tokens in a radix tree rather than naive linear hash tables.",
            "**Zero-Copy & LRU Eviction**: Reference counting paired with LRU caches achieves >70% prefix hit rates in structured workloads, drastically slashing Time-To-First-Token (TTFT).",
            "**Ecosystem Synergy**: Radix caching pairs synergistically with [FlashInfer unified kernels](/en/articles/flashattention-flashinfer-kernel-evolution/) and [Speculative Decoding with EAGLE](/en/articles/speculative-decoding-eagle-guide/)."
        ]
    },
    "flashattention-flashinfer-kernel-evolution": {
        "zh": [
            "**IO 感知与访存优化**：从 FlashAttention-1 的 Tiling 与重计算，到 FA-2 的 Warp 线程划分优化（各 Warp 分割 Q、共享 K/V），再到 FA-3 的 FP8 支持与 TMA 异步管线，注意力算子始终围绕 SRAM/HBM 数据搬运极限制定。",
            "**统一异构内核**：FlashInfer 进一步抽象了 PageKV、变长 Batch 与混合精度的异构解码算子库，成为现代推理引擎（如 SGLang）的标准计算后端。",
            "**模型架构反哺**：底层算子演进与上层 [DeepSeek MLA 矩阵吸收](/articles/mha-gqa-mla-matrix-absorption-inference-engine/) 和 [Roofline 算力建模](/articles/inference-roofline-prefill-decode/) 紧密互为因果。"
        ],
        "en": [
            "**IO-Aware Architecture**: From FlashAttention-1 tiling and recomputation to FA-2 warp partitioning (Q-partitioning with shared K/V) and FA-3 asynchronous TMA pipelines, attention kernels focus on minimizing HBM memory traffic.",
            "**Unified Heterogeneous Kernels**: FlashInfer provides unified PageKV, ragged batching, and mixed-precision kernels, serving as the high-performance backend for modern inference engines.",
            "**Architecture Feedback**: Kernel optimizations directly underpin [DeepSeek MLA Matrix Absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/) and [Roofline Prefill/Decode scaling](/en/articles/inference-roofline-prefill-decode/)."
        ]
    },
    "mha-gqa-mla-matrix-absorption-inference-engine": {
        "zh": [
            "**KV Cache 压缩革命**：从 MHA（全量头，KV 显存膨胀）到 GQA（分组共享，8:1 压缩），再到 DeepSeek 提出的 MLA（多头潜在注意力），通过低秩投影将 KV Cache 压缩为单一潜在向量 $c_t^{KV}$ 与解耦 RoPE 向量。",
            "**矩阵吸收机制**：在自回归生成阶段，将投影权重矩阵与 Query 投影提前进行矩阵乘法吸收，在 Decode 阶段完全无需解压还原庞大的 Keys/Values，显存占用降低至 MHA 的 1/5 甚至更低。",
            "**硬件拓扑约束**：MLA 的极致访存收益要求推理引擎必须匹配专门设计的计算图与 [MoE 专家并行方案](/articles/moe-expert-parallelism-inference-engine/)，并在 [DeepSeek-V4 与 Kimi K3 部署实践](/articles/deepseek-v4-kimi-k3-deployment-guide/) 中发挥核心支柱作用。"
        ],
        "en": [
            "**KV Cache Compression Evolution**: Progressing from MHA (full heads, memory explosion) to GQA (grouped sharing) and DeepSeek MLA (Multi-Head Latent Attention), latent low-rank projections condense KV representations into compact vectors.",
            "**Matrix Absorption Mechanism**: During autoregressive decoding, projection matrices are mathematically absorbed into query projections, eliminating the need to materialize uncompressed key-value matrices in HBM.",
            "**System Synergy**: MLA's memory efficiency requires tightly coupled execution kernels alongside [MoE Expert Parallelism](/en/articles/moe-expert-parallelism-inference-engine/) and [DeepSeek-V4/Kimi K3 cluster topologies](/en/articles/deepseek-v4-kimi-k3-deployment-guide/)."
        ]
    },
    "moe-expert-parallelism-inference-engine": {
        "zh": [
            "**稀疏路由与专家并行**：MoE 模型通过 Router 门控动态选择少量 Top-K 专家激活，在将模型参数拉升至数百甚至数千亿的同时，单 Token 激活算力保持常数级。",
            "**All-to-All 通信瓶颈**：跨节点专家并行 (EP) 的核心性能死穴在于 All-to-All 集合通信；生产级引擎必须利用跨机 InfiniBand/RoCE 网卡建立通信与计算重叠（Overlap）流水线。",
            "**部署最佳实践**：在实践中需与 [TP/PP 混合切分](/articles/deepseek-v4-kimi-k3-deployment-guide/) 以及底层 [InfiniBand 高性能拓扑配置](/articles/infiniband-fat-tree-rail-optimized-topology-adaptive-routing-sharp/) 形成系统级软硬件协同。"
        ],
        "en": [
            "**Sparse Routing & Expert Parallelism**: Mixture-of-Experts activates only top-K routed experts per token, scaling parameter capacity to hundreds of billions while maintaining bounded FLOPs per step.",
            "**All-to-All Communication Bottleneck**: Cross-node Expert Parallelism (EP) is throttled by All-to-All collective exchanges, necessitating overlapping communication with compute pipelines across high-bandwidth RDMA fabrics.",
            "**Production Setup**: Real-world deployments demand unified orchestration across [TP/PP/EP hybrid topologies](/en/articles/deepseek-v4-kimi-k3-deployment-guide/) and [InfiniBand Rail-Optimized Fabrics](/en/articles/infiniband-fat-tree-rail-optimized-topology-adaptive-routing-sharp/)."
        ]
    },
    "pd-disaggregation-distributed-kv-cache": {
        "zh": [
            "**异构解耦与物理隔离**：Prefill（高吞吐、显存峰值）与 Decode（低延迟、长期驻留）混跑在同一张卡上会导致不可调和的资源争抢；P/D 分离将两者拆分为独立的物理计算池。",
            "**高速 KV 迁移**：Prefill 节点完成上下文编码后，利用 RDMA 零拷贝技术将 KV Cache 毫秒级直推到指定的 Decode 节点，彻底消除本地 Prefill 对解码时延的扰动。",
            "**技术图谱支撑**：P/D 架构的工业化部署深度依赖 [RDMA Queue Pair 通信](/articles/rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless/) 与云原生 [K8s GPU 拓扑调度](/articles/k8s-gpu-operator-ai-inference-scheduling/)。"
        ],
        "en": [
            "**Heterogeneous Decoupling**: Colocating compute-heavy Prefill and memory-latency-sensitive Decode on identical GPUs causes severe interference. Prefill-Decode (P/D) disaggregation physically isolates both workloads into dedicated pools.",
            "**Sub-Millisecond KV Transfers**: Finished prompt KV states are pushed to Decode nodes across high-speed RDMA fabrics via kernel-bypass memory copies without CPU intermediary serialization.",
            "**Infrastructure Foundation**: Enterprise P/D systems depend directly on [RDMA Queue Pair networking](/en/articles/rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless/) and [Kubernetes GPU Operator scheduling](/en/articles/k8s-gpu-operator-ai-inference-scheduling/)."
        ]
    },
    "inference-engines-core-architecture-internals": {
        "zh": [
            "**主流推理引擎架构解密**：全景剖析 vLLM (v1 引擎重构)、SGLang (RadixAttention 极致吞吐)、TensorRT-LLM (英伟达硬件极限调优) 与 llama.cpp (边缘端全量量化) 的核心调度器设计与源码实现差异。",
            "**关键维度选型**：多轮对话与复杂前缀场景首选 SGLang；标准化微服务生态与丰富模型覆盖首选 vLLM；单卡边缘端轻量部署首选 llama.cpp。",
            "**技术关联推荐**：进阶实战可参阅 [SGLang vs vLLM 架构对决](/articles/sglang-vs-vllm-architecture/) 与 [生产级 vLLM 部署调优指南](/articles/vllm-serving-guide/)。"
        ],
        "en": [
            "**Engine Architecture Teardown**: In-depth disassembly of scheduler internals across vLLM (v1 pipeline overhaul), SGLang (RadixAttention maximum throughput), TRT-LLM (NVIDIA hardware-bound tuning), and llama.cpp (edge quantization).",
            "**Architectural Selection**: SGLang excels in structured prompts and multi-turn prefix workloads; vLLM offers the most robust ecosystem integrations; llama.cpp leads local edge execution.",
            "**Recommended Reading**: Compare real-world benchmarks in [SGLang vs vLLM Architecture Comparison](/en/articles/sglang-vs-vllm-architecture/) and follow the [vLLM Serving Production Guide](/en/articles/vllm-serving-guide/)."
        ]
    },
    "reasoning-test-time-compute-inference-future": {
        "zh": [
            "**推理计算扩展律 (Scaling Law)**：从单纯依赖预训练参数量的预先扩展，转向依赖长思维链 (Thinking Process) 与 MCTS/自我反思的推理期计算扩展 (Test-Time Compute)。",
            "**系统级工程冲击**：动态长思维链使序列长度激增至 32k~128k，导致 KV Cache 呈爆炸式增长，对调度器的分级存储、动态显存换入换出提出极限挑战。",
            "**算法与架构协同**：需紧密结合 [GRPO 强化学习训练全景](/articles/test-time-compute-grpo/) 与 [P/D 分离集群池化](/articles/pd-disaggregation-distributed-kv-cache/) 探索万卡集群推理终局。"
        ],
        "en": [
            "**Test-Time Compute Scaling Law**: Moving beyond pre-training parameter scaling toward dynamic runtime computation via extended chains-of-thought, self-correction, and tree search.",
            "**Infrastructure Strain**: Extended reasoning balloons sequence lengths into 32k-128k windows, demanding robust tiered KV memory management and dynamic swapping.",
            "**Algorithmic Synergy**: Explore the training counterpart in [GRPO Reinforcement Learning Deep Dive](/en/articles/test-time-compute-grpo/) and cluster-scale serving via [P/D Disaggregation](/en/articles/pd-disaggregation-distributed-kv-cache/)."
        ]
    }
}

# -------------------------------------------------------------
# Topic Cluster 2: Serving, Deployment & Quantization
# -------------------------------------------------------------
CLUSTER_SERVING = {
    "sglang-vs-vllm-architecture": {
        "zh": [
            "**架构流派抉择**：SGLang 以 RadixAttention 树状前缀缓存与端到端编译为核心，在多轮对话与 Agent 场景具备极高的 Cache 命中率与吞吐；vLLM 则以广泛的生态适配与模块化插件见长。",
            "**选型指标实测**：在固定系统提示词（System Prompt 占比 >50%）的高并发负载下，SGLang 表现出更优异的 TTFT 与吞吐指标；在快速多硬件平台（AMD/Ascend/NVIDIA）迁移中 vLLM 兼容性更广。",
            "**落地关联**：建议结合 [RadixAttention 源码解密](/articles/prefix-caching-radix-attention-internals/) 与 [vLLM 生产级落地部署指南](/articles/vllm-serving-guide/) 综合规划技术栈。"
        ],
        "en": [
            "**Architectural Duel**: SGLang leverages native RadixAttention prefix tree reuse and runtime compilation for outstanding agent throughput; vLLM offers unmatched production ecosystem stability and multi-hardware support.",
            "**Benchmark Realities**: Workloads with substantial shared system prompts benefit significantly from SGLang's cache hit rates; broad multi-accelerator production clusters often deploy vLLM.",
            "**Further Exploration**: Explore [RadixAttention Internals](/en/articles/prefix-caching-radix-attention-internals/) and operational practices in [vLLM Production Serving Guide](/en/articles/vllm-serving-guide/)."
        ]
    },
    "vllm-serving-guide": {
        "zh": [
            "**生产级配置调优**：详解 `gpu-memory-utilization`（整体显存预算）、`max-model-len` 与 `max-num-seqs` 等核心参数调优逻辑，规避显存溢出 (OOM) 与 KV Cache 剧烈抖动。",
            "**Prometheus 监控落地**：规范使用官方 `vllm:` 指标命名空间，监控 `vllm:kv_cache_usage_perc` 与请求排队水位，搭建企业级弹性扩缩容体系。",
            "**协同加速**：配合 [投机解码 EAGLE](/articles/speculative-decoding-eagle-guide/) 与 [量化选型指南](/articles/quantization-precision-guide/) 可在有限显存下实现吞吐翻倍。"
        ],
        "en": [
            "**Production Parameter Tuning**: Deep dive into tuning `gpu-memory-utilization`, `max-model-len`, and concurrency parameters without risking Out-of-Memory (OOM) failures.",
            "**Prometheus Metric Standards**: Monitor official `vllm:` prefixed metrics including `vllm:kv_cache_usage_perc` to drive automated Kubernetes Horizontal Pod Autoscaling (HPA).",
            "**Throughput Multipliers**: Combine serving tuning with [Speculative Decoding using EAGLE](/en/articles/speculative-decoding-eagle-guide/) and [Quantization Precision Tradeoffs](/en/articles/quantization-precision-guide/)."
        ]
    },
    "speculative-decoding-eagle-guide": {
        "zh": [
            "**投机解码数学原理**：利用轻量级 Draft 模型以低时延快速生成 $K$ 个候选 Token，Target 大模型单次前向完成并行验证，利用拒绝采样保证输出概率分布与单模型严格数学等价。",
            "**EAGLE 架构演进**：EAGLE 在特征层进行下一轮预测，利用树状注意力 (Tree Attention) 同时验证多条生成分支，实际平均接受长度提升至 2.5~3.5 tokens，实现 2x~3x 推理加速。",
            "**落地支撑**：投机解码在超大参数场景下与 [DeepSeek / Kimi 部署方案](/articles/deepseek-v4-kimi-k3-deployment-guide/) 和 [推理引擎架构对比](/articles/sglang-vs-vllm-architecture/) 紧密契合。"
        ],
        "en": [
            "**Mathematical Underpinnings**: A lightweight draft model generates $K$ candidate tokens, verified in parallel by the target model in a single forward pass under rejection sampling to preserve exact output distribution equivalence.",
            "**EAGLE Tree Attention**: EAGLE operates across hidden feature representations with tree attention verification, achieving acceptance lengths of 2.5-3.5 tokens for real-world 2x-3x speedups.",
            "**Production Integration**: Speculative decoding is pivotal when hosting massive models like [DeepSeek-V4 and Kimi K3](/en/articles/deepseek-v4-kimi-k3-deployment-guide/) on [vLLM and SGLang](/en/articles/sglang-vs-vllm-architecture/)."
        ]
    },
    "quantization-precision-guide": {
        "zh": [
            "**精度与显存数学**：从纯权重（Weight-Only）量化（AWQ, GPTQ）到全量矩阵与激活值量化（FP8, SmoothQuant），精确推导每种量化模式下的显存占用与访存带宽节省。",
            "**显卡档位实测红线**：70B 模型 4-bit 纯权重已占用 35GB，必须预留 KV Cache 与上下文空间，单卡无法在 24GB~32GB 上裸跑；RTX 3090/4090 真实物理显存为 24GB。",
            "**实战指南**：配合 [量化实战动手实验](/articles/quantization-hands-on-guide/) 与 [DeepSeek MLA 权重体积核算](/articles/mha-gqa-mla-matrix-absorption-inference-engine/)，实现精度无损的低成本落地。"
        ],
        "en": [
            "**Precision Math & Memory Bounds**: Exhaustive breakdown of Weight-Only (AWQ, GPTQ) versus Weight-Activation (FP8, SmoothQuant) quantization schemes and their real HBM bandwidth savings.",
            "**Hardware Realities**: 70B 4-bit weights consume ~35GB before KV Cache buffers, making 24GB-32GB single-card serving physically unfeasible; RTX 3090/4090 cards provide exactly 24GB VRAM.",
            "**Hands-On Guidance**: Follow up with [Hands-On Quantization Labs](/en/articles/quantization-hands-on-guide/) and calculate memory profiles with [MLA Matrix Absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/)."
        ]
    },
    "deepseek-v4-kimi-k3-deployment-guide": {
        "zh": [
            "**超大模型拓扑规划**：针对 600B+ 超大 MoE 架构，严密推导四机 32 卡与八机 64 卡的 TP8×PP2×EP2 分布式切分策略与通信 Buffer 显存占用。",
            "**版本与参数避坑**：官方标准模型标识月之暗面 Kimi K3 为 `moonshotai/Kimi-K3`，且启动参数需严格核对 vLLM 对应版本支持的量化与专家并行配置。",
            "**集群网络强依赖**：多节点 MoE 推理极致依赖无拥塞网络，建议配套查阅 [InfiniBand 高性能组网](/articles/infiniband-production-deployment-opensm-ofed-nccl-tuning/) 与 [RoCEv2 拥塞控制](/articles/rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless/)。"
        ],
        "en": [
            "**Ultra-Large Cluster Topology**: Mathematically validates TP8xPP2xEP2 distributed topologies across 4-node/32-GPU and 8-node/64-GPU clusters for 600B+ MoE architectures.",
            "**Operational Accuracy**: Identifies exact official model identifiers (`moonshotai/Kimi-K3`) and confirms valid vLLM serving parameters to avoid configuration crashes.",
            "**Fabric Dependency**: Multi-node MoE performance hinges on non-blocking fabrics; review [InfiniBand Production Tuning](/en/articles/infiniband-production-deployment-opensm-ofed-nccl-tuning/) and [Lossless RoCEv2 Deployments](/en/articles/rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless/)."
        ]
    },
    "kimi-kda-deepseek-mla-architecture": {
        "zh": [
            "**新型注意力架构对比**：深入拆解 Kimi K3 采用的 69 层 KDA（Kimi Dynamic Attention）+ 24 层 Gated MLA 混合架构，纠正“全模型状态恒定”的技术误区。",
            "**显存增长曲线推演**：KDA 线性状态层与 MLA 注意力层相互配合，既保留了长文本动态检索能力，又大幅压平了长序列 KV Cache 爆炸曲线。",
            "**推理工程适配**：与 [DeepSeek MLA 矩阵吸收原理](/articles/mha-gqa-mla-matrix-absorption-inference-engine/) 及 [长思维链推理演进](/articles/reasoning-test-time-compute-inference-future/) 构成现代推理模型演进的核心链条。"
        ],
        "en": [
            "**Novel Attention Breakdown**: Thorough analysis of Kimi K3's hybrid 69-layer KDA (Kimi Dynamic Attention) + 24-layer Gated MLA design, dispelling the myth of universal constant-state caching.",
            "**Memory Scaling Profiles**: Blending recurrent linear state updates with gated attention achieves effective long-context recall while flattening linear KV Cache memory trajectories.",
            "**System Alignment**: Pairs directly with [DeepSeek MLA Matrix Absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/) and [Test-Time Reasoning Architectures](/en/articles/reasoning-test-time-compute-inference-future/)."
        ]
    }
}

# -------------------------------------------------------------
# Topic Cluster 3: AI Agent Architectures
# -------------------------------------------------------------
CLUSTER_AGENT = {
    "agent-loop-state-machine": {
        "zh": [
            "**控制流确定性**：从不可控的自发 ReAct 循环，升级为基于有限状态机 (FSM) 的确定性控制流，明确区分规划、工具调用、反思与人工介入状态。",
            "**防止死循环与雪崩**：通过最大步数防御、重复动作幂等检测与自愈回退，杜绝 Agent 在复杂环境陷入死循环消耗无限 Token。",
            "**框架与落地扩展**：核心概念已在 [轻量级 Agent 框架自研](/articles/build-lightweight-agent-framework/) 与 [多智能体并发协作](/articles/multi-agent-collaboration-and-concurrency/) 中提供完整 Python 生产级实现。"
        ],
        "en": [
            "**Deterministic Control Flow**: Transitioning unpredictable ReAct loops into deterministic Finite State Machines (FSM) with explicit states for planning, tool execution, reflection, and human approval.",
            "**Deadlock & Infinite Loop Prevention**: Implements step budget ceilings, action idempotency checks, and self-healing transitions to halt runaway agent token consumption.",
            "**Framework Implementations**: Code implementations are expanded in [Building Lightweight Agent Frameworks](/en/articles/build-lightweight-agent-framework/) and [Multi-Agent Concurrency & Actor Models](/en/articles/multi-agent-collaboration-and-concurrency/)."
        ]
    },
    "mcp-guide": {
        "zh": [
            "**统一上下文协议**：Model Context Protocol (MCP) 建立了大模型与外部数据源及工具生态互联的标准协议层，消除每个工具写专属适配器的碎片化问题。",
            "**协议核心边界**：规范澄清只读查询（如天气、检索）推荐使用 Resource 或只读 Tool，OAuth 与用户授权按规范属于可选扩展实现，并非全协议强制统一托管。",
            "**工程实战落地**：建议深入参考 [工具调用与 Function Calling 进阶](/articles/advanced-agent-tool-use-and-function-calling/) 实现动态 MCP 工具注册与 gVisor 安全沙箱隔离。"
        ],
        "en": [
            "**Universal Context Standard**: The Model Context Protocol (MCP) defines an open standard connecting foundation models with enterprise data sources and runtime tools without proprietary glue code.",
            "**Specification Clarifications**: Read-only workflows may be modeled as Resources or read-only Tools; authorization mechanisms like OAuth represent optional protocol layers rather than monolithic requirements.",
            "**Production Integration**: See [Advanced Function Calling & Tool Execution](/en/articles/advanced-agent-tool-use-and-function-calling/) for dynamic MCP auto-discovery and gVisor sandbox containerization."
        ]
    },
    "skills-guide": {
        "zh": [
            "**渐进式能力注入**：Agent Skills 规范（基于 `SKILL.md`）通过将大型说明文档拆分为渐进式元数据加载，避免在每次调用时全量注入几万字 Prompt 挤爆上下文窗口。",
            "**多平台标准化**：不仅适用于 Claude，最新 OpenAI Codex 等平台同样支持基于 `SKILL.md` 的脚本资源与按需加载规范。",
            "**智能体结合**：与 [MCP 协议完全指南](/articles/mcp-guide/) 及 [AI 编程架构师实战](/articles/ai-coding-mastery/) 形成完整的 Agent 外脑扩展生态。"
        ],
        "en": [
            "**Progressive Capability Injection**: The Agent Skills specification (`SKILL.md`) implements progressive disclosure, preventing massive prompt bloat in the system context window by loading resources on demand.",
            "**Cross-Platform Standard**: Supported across modern AI developer tooling including Claude and OpenAI Codex runtime specifications.",
            "**Ecosystem Fit**: Pairs directly with [The Complete MCP Guide](/en/articles/mcp-guide/) and [AI Coding Mastery](/en/articles/ai-coding-mastery/) to build robust agent toolkits."
        ]
    },
    "browser-use-agent-architecture": {
        "zh": [
            "**DOM 树轻量化修剪**：解析 Web 界面时剔除 90% 以上与用户交互无关的冗余标签，将可见交互元素编码为高亮数字标签（Set-of-Marks），大幅压缩视觉与文本 Token 消耗。",
            "**多模态闭环执行**：结合截图与 DOM 拓扑进行双重校验，杜绝因网页弹窗或异步渲染引起的幻觉点击与误操作。",
            "**安全性扩展**：在生产环境中运行浏览器智能体时，必须配套 [安全沙箱隔离](/articles/advanced-agent-tool-use-and-function-calling/) 与 [环境扩展指南](/articles/environment-scaling-agent-guide/)。"
        ],
        "en": [
            "**DOM Pruning & Set-of-Marks**: Strips >90% of redundant DOM elements, indexing interactive elements into visual bounding boxes (Set-of-Marks) to minimize multimodal token consumption.",
            "**Closed-Loop Action Verification**: Cross-references rendered browser screenshots with DOM trees to prevent hallucinated clicks during asynchronous frontend loading.",
            "**Security Hardening**: Enterprise browser agents require [Sandbox Container Isolation](/en/articles/advanced-agent-tool-use-and-function-calling/) and [Environment Scaling Practices](/en/articles/environment-scaling-agent-guide/)."
        ]
    },
    "agent-memory-architecture": {
        "zh": [
            "**分层记忆体系**：剖析工作记忆（Working Memory，上下文窗口）、短时记忆（会话历史与当前状态机）与长时记忆（Vector DB + Graph RAG 实体知识图谱）的协同流转机制。",
            "**记忆治理关键**：生产级记忆系统不仅要“能存”，更要具备记忆来源追踪、用户空间物理隔离、遗忘/删除级联传播以及错误记忆事实矫正能力。",
            "**系统联动**：与 [Agent 状态机设计](/articles/agent-loop-state-machine/) 及 [生产级 RAG 检索增强实践](/articles/rag-in-practice/) 共同构成可自主进化的智能体基座。"
        ],
        "en": [
            "**Hierarchical Memory Stack**: Deconstructs Working Memory (context window), Short-Term Memory (session FSM states), and Long-Term Memory (vector stores + Graph RAG entity graphs).",
            "**Memory Governance**: Production systems require strict provenance tracking, tenant isolation, cascading deletion propagation, and factual self-correction mechanisms.",
            "**Architecture Coupling**: Integrates seamlessly with [Agent FSM State Machines](/en/articles/agent-loop-state-machine/) and [Production Enterprise RAG](/en/articles/rag-in-practice/)."
        ]
    },
    "advanced-agent-tool-use-and-function-calling": {
        "zh": [
            "**动态注册与沙箱隔离**：从写死代码的函数调用，升级为支持 MCP 动态工具发现、参数模式严谨校验与 gVisor/Docker 微秒级安全容器隔离的工具执行中枢。",
            "**闭环自愈机制**：捕获代码执行异常与语法错误，将错误栈格式化后自动送回 LLM 进行最多 3 次针对性反思自愈，工具调用成功率提升 40% 以上。",
            "**系列延伸**：本篇提供完整生产级 Python 代码示例，可配合 [轻量级 Agent 框架自研](/articles/build-lightweight-agent-framework/) 形成完整的独立 Agent 引擎。"
        ],
        "en": [
            "**Dynamic Discovery & Container Sandboxing**: Advances beyond hardcoded function calling toward MCP-based runtime discovery, strict JSON Schema validation, and gVisor container isolation.",
            "**Closed-Loop Self-Healing**: Captures execution tracebacks and feeds structured errors back to the model for reflection, raising tool execution success rates by over 40%.",
            "**Runnable Codebases**: Includes verified production Python examples; pairs with [Building a Lightweight Agent Framework](/en/articles/build-lightweight-agent-framework/)."
        ]
    },
    "build-lightweight-agent-framework": {
        "zh": [
            "**轻量生产级架构**：不依赖臃肿的重型框架，用纯 Python 异步有限状态机（FSM）构建具备规划、工具分发、反思与流式事件派发能力的极简 Agent 核心。",
            "**人机协同与持久化恢复**：实现高危工具调用的人工审批（Human-in-the-Loop）中断机制，支持状态序列化落盘与跨进程无损重启恢复。",
            "**体系演进**：单智能体架构成型后，可进一步探索 [多智能体协作与并发控制](/articles/multi-agent-collaboration-and-concurrency/) 实现分布式多角色协同。"
        ],
        "en": [
            "**Lightweight Production Core**: Avoids bloated generic frameworks by implementing an asynchronous Python FSM with planning, tool dispatching, reflection, and streaming events.",
            "**Human-in-the-Loop & State Recovery**: Implements native interruption workflows for high-risk actions, coupled with checkpoint persistence for seamless process restart recovery.",
            "**Next Step**: Extend this foundational runtime into [Multi-Agent Collaboration & Concurrency](/en/articles/multi-agent-collaboration-and-concurrency/) for multi-actor swarms."
        ]
    },
    "multi-agent-collaboration-and-concurrency": {
        "zh": [
            "**Actor 模型与并发通信**：基于 Actor 消息信封机制设计多智能体协同网络，各 Agent 独占自身状态并通过异步消息队列交互，彻底消除裸锁与死锁风险。",
            "**数据一致性与背压保护**：采用乐观并发控制（OCC 版本号校验）维护共享任务黑板，内嵌令牌桶（Token Bucket）算法进行系统级 LLM API 速率限制与背压防御。",
            "**生态协同**：多智能体系统的单体节点实现基于 [轻量级 Agent 框架](/articles/build-lightweight-agent-framework/) 与 [安全工具调用内核](/articles/advanced-agent-tool-use-and-function-calling/)。"
        ],
        "en": [
            "**Actor Model & Mailbox Concurrency**: Coordinates multi-agent swarms using Actor message envelopes and isolated state machines, eliminating deadlock hazards and raw mutexes.",
            "**Optimistic Concurrency & Backpressure**: Leverages OCC versioning on shared task boards alongside Token Bucket rate limiters to buffer LLM API bursts smoothly.",
            "**Ecosystem Stacking**: Individual actors run on top of [Building Lightweight Agent Frameworks](/en/articles/build-lightweight-agent-framework/) and [Advanced Function Calling Engines](/en/articles/advanced-agent-tool-use-and-function-calling/)."
        ]
    }
}

# -------------------------------------------------------------
# Topic Cluster 4: Alignment, RAG & Frontier Models
# -------------------------------------------------------------
CLUSTER_ALIGNMENT = {
    "test-time-compute-grpo": {
        "zh": [
            "**GRPO 算法精髓**：Group Relative Policy Optimization (GRPO) 彻底摒弃了传统 PPO 庞大耗显存的 Critic 价值模型，通过对同一个 Prompt 采样分组输出并基于组内相对胜率进行归一化优势计算。",
            "**显存节省与长思维链**：消除 Critic 模型为训练节省了近 50% 显存开销，使得强化学习能够在有限显存下容纳更长的思维链探索 (Thinking Process) 与复杂数学代码自验证。",
            "**推理集群联动**：GRPO 训练出的长思考模型直接推动了 [推理计算扩展律](/articles/reasoning-test-time-compute-inference-future/)，并对底层的 [P/D 分离架构](/articles/pd-disaggregation-distributed-kv-cache/) 提出前所未有的超长 KV 管理需求。"
        ],
        "en": [
            "**GRPO Algorithmic Innovation**: Group Relative Policy Optimization (GRPO) eliminates the memory-heavy Critic value model by sampling candidate groups and computing relative advantages normalized against group baselines.",
            "**Memory Savings for Extended CoT**: Reclaiming memory previously reserved for Critic parameters enables training on vastly longer reasoning traces and complex verifiable tasks within fixed GPU budgets.",
            "**Serving Ramifications**: Models trained with GRPO stimulate the [Test-Time Compute Scaling Law](/en/articles/reasoning-test-time-compute-inference-future/) and stress-test [Prefill-Decode Disaggregated Serving](/en/articles/pd-disaggregation-distributed-kv-cache/)."
        ]
    },
    "rag-in-practice": {
        "zh": [
            "**混合检索与重排序**：生产级 RAG 架构必须超越单一的密集向量（Dense Vector）检索，采用 BM25 稀疏检索与 Dense 向量检索融合，并在前级召回后接入 Cross-Encoder 重排序（Rerank）。",
            "**分块与元数据治理**：语义分块（Semantic Chunking）结合 Parent-Child 父子文档分块，保留长上下文连贯性的同时提供精确检索切片。",
            "**智能体记忆演进**：RAG 模式是 [AI Agent 记忆系统设计](/articles/agent-memory-architecture/) 的长时记忆基础，亦与 [提示工程实战](/articles/prompt-engineering-guide/) 紧密交织。"
        ],
        "en": [
            "**Hybrid Retrieval & Reranking**: Enterprise RAG surpasses naive dense embedding search by fusing BM25 keyword search with dense vectors, followed by high-precision Cross-Encoder neural rerankers.",
            "**Chunking & Context Preservation**: Semantic Chunking and Parent-Child block indexing preserve macro-document semantics while retrieving pinpoint micro-passages.",
            "**Agent Integration**: Production RAG serves as the long-term knowledge tier in [AI Agent Memory Architectures](/en/articles/agent-memory-architecture/) and connects with [Context Engineering](/en/articles/context-engineering-guide/)."
        ]
    },
    "fine-tuning-guide": {
        "zh": [
            "**微调范式全景**：系统对比 Full Fine-Tuning、LoRA、QLoRA 与 DoRA 的显存占用公式、可训练参数比例与下游任务泛化保持度。",
            "**避免灾难性遗忘**：利用数据配比回放、梯度裁剪与针对特定领域的对齐优化，确保垂类能力增强的同时基础逻辑能力不退化。",
            "**下游推理衔接**：微调权重合并与导出后，可直接结合 [量化精度调优](/articles/quantization-precision-guide/) 与 [生产级 vLLM 部署](/articles/vllm-serving-guide/) 投产上线。"
        ],
        "en": [
            "**Fine-Tuning Spectrum**: Mathematical and practical comparisons across Full Parameter Tuning, LoRA, QLoRA, and DoRA in VRAM footprint and generalization retention.",
            "**Mitigating Catastrophic Forgetting**: Employs domain replay datasets, disciplined learning rate warmup, and gradient clipping to protect general intelligence while acquiring domain expertise.",
            "**Downstream Pipeline**: Merged weights seamlessly pipeline into [Quantization Precision Tuning](/en/articles/quantization-precision-guide/) and [High-Throughput vLLM Serving](/en/articles/vllm-serving-guide/)."
        ]
    },
    "llm-evaluation-guide": {
        "zh": [
            "**科学评测统计学**：剖析 LLM-as-a-Judge 的位置偏差、长度偏见与自爱偏见；引入非劣效检验与置信区间，杜绝无统计学意义的跑分浮夸。",
            "**RAG 与 Agent 评估指标**：深入 Ragas 框架真实数学公式，澄清 Context Precision 采用位置相关性加权求和，精准测量忠实度与答案相关性。",
            "**进阶治理**：体系化指标可配合 [对抗复合误差的分布式 Agent 编排与量化 Evals](/articles/agent-orchestration-evals/) 建立自动化 CI 评估流水线。"
        ],
        "en": [
            "**Statistical Rigor in Evals**: Audits LLM-as-a-Judge vulnerabilities including position bias, verbosity bias, and self-preference, establishing non-inferiority margins and confidence intervals.",
            "**Metric Formulations**: Demystifies Ragas evaluation mathematics, applying weighted Context Precision to accurately evaluate faithfulness and retrieval relevance.",
            "**Production Pipelines**: Connects with [Distributed Agent Orchestration & Evals](/en/articles/agent-orchestration-evals/) to enforce automated regression testing."
        ]
    },
    "model-comparison-2026": {
        "zh": [
            "**2026 前沿闭源三强与开源双雄**：深度横评 GPT-5.4、Claude 4.6、Gemini 3 与开源旗舰 DeepSeek-V4、Kimi K3 的基准评测、价格梯度与工程适用场景。",
            "**准确规格核查**：Claude Opus 4.6 官方标准定价为 $5 / $25 每百万 Token；GPT-5.4 支持文本与视觉输入，官方文档明确标示 API 模型暂不支持 Fine-tuning。",
            "**国内开源对比**：针对国产自研模型细化对比，可继续参阅 [2026 国产自研大模型综合横评研报](/articles/domestic-llm-comparison-2026/)。"
        ],
        "en": [
            "**2026 Frontier Landscape**: Comprehensive comparison across frontier closed models (GPT-5.4, Claude 4.6, Gemini 3) and open-weights leaders (DeepSeek-V4, Kimi K3) across pricing and benchmarks.",
            "**Rigorous Fact Checks**: Confirms official Claude Opus 4.6 pricing at $5/$25 per million tokens, and verifies GPT-5.4 modalities (text and vision inputs without direct fine-tuning support).",
            "**Specialized Deep Dive**: For national open-source model ecosystems, consult the [2026 Domestic LLM Comprehensive Benchmark Report](/en/articles/domestic-llm-comparison-2026/)."
        ]
    },
    "domestic-llm-comparison-2026": {
        "zh": [
            "**国产大模型真实战力拆解**：严密对比 DeepSeek-V4、月之暗面 Kimi K3、智谱 GLM-5.3（官方权重标示约 753B）与 MiniMax 在真实代码推理与生产落地表现。",
            "**架构创新透视**：DeepSeek-V4 采用 CSA＋HCA 混合注意力设计，Kimi K3 采用 69 层 KDA + 24 层 Gated MLA，展现出国产架构对传统 Transformer 的深度重塑。",
            "**算力与自建指南**：详细集群落地配置请参阅 [DeepSeek-V4 与 Kimi K3 生产级部署实战指南](/articles/deepseek-v4-kimi-k3-deployment-guide/)。"
        ],
        "en": [
            "**Domestic LLM Engineering Teardown**: Rigorously analyzes DeepSeek-V4, Moonshot Kimi K3, Zhipu GLM-5.3 (~753B parameter class), and MiniMax across real coding, reasoning, and production deployments.",
            "**Architectural Breakthroughs**: DeepSeek-V4 features CSA+HCA hybrid attention while Kimi K3 deploys 69 KDA + 24 Gated MLA layers, redesigning traditional Transformer economics.",
            "**Infrastructure Blueprint**: For multi-node hardware planning, see the [DeepSeek-V4 and Kimi K3 Production Deployment Guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/)."
        ]
    }
}

# -------------------------------------------------------------
# Topic Cluster 5: Kubernetes & Cloud Native Infrastructure
# -------------------------------------------------------------
CLUSTER_K8S = {
    "k8s-gpu-operator-ai-inference-scheduling": {
        "zh": [
            "**GPU 拓扑感知调度**：深度剖析 NUMA 节点、PCIe 交换机与 NVLink 域拓扑对大模型推理的影响，利用 Node Feature Discovery (NFD) 与 GPU Operator 实现硬件亲和准入。",
            "**拓扑准入失败机制**：Kubernetes Topology Manager 在准入失败进入终止状态后，调度器不会自动将同一个 Pod 漂移至其他节点，必须依赖上层控制器重建机制。",
            "**推理集群调度**：结合 [vLLM 生产级监控指标](/articles/vllm-serving-guide/) 与 [K8s 调度框架 Gang Scheduling 自定义插件](/articles/k8s-scheduling-framework-custom-plugin-gang-scheduling/) 实现高效并行调度。"
        ],
        "en": [
            "**Topology-Aware GPU Scheduling**: Analyzes NUMA, PCIe switch, and NVLink domain affinity in multi-GPU inference, leveraging Node Feature Discovery and the NVIDIA GPU Operator.",
            "**Admission Failure Realities**: Clarifies that when a Pod fails Topology Manager admission, the scheduler does not automatically relocate the exact same Pod; reconciliation relies on higher-level controller reconstruction.",
            "**Inference Alignment**: Connects directly with [vLLM Production Serving Metrics](/en/articles/vllm-serving-guide/) and [Custom Gang Scheduling Plugins](/en/articles/k8s-scheduling-framework-custom-plugin-gang-scheduling/)."
        ]
    },
    "k8s-control-plane-hacking-aggregated-apiserver-apf-etcd": {
        "zh": [
            "**API Server 深度内幕**：揭秘 API Priority and Fairness (APF) 流控队列、Aggregated API Server 扩展机制以及 etcd Raft 事务提交的底层执行链路。",
            "**一致性读取演进**：Kubernetes 从 v1.31 起支持通过 WatchCache 提供一致性读取，空 `resourceVersion` 在特定版本与功能门控开启下不再必然绕过缓存直打 etcd。",
            "**控制面最佳实践**：与 [声明式对齐控制器原理](/articles/k8s-control-plane-declarative-reconciliation/) 及 [高可用本地 NVMe 存储选型](/articles/k8s-database-storage-local-nvme-tuning-fencing/) 构成高可靠集群底座。"
        ],
        "en": [
            "**API Server Internals**: Demystifies API Priority and Fairness (APF) flow queues, Aggregated API Server extension mechanisms, and etcd Raft log commits.",
            "**Consistent Read Evolution**: Kubernetes v1.31+ supports consistent reads served directly from WatchCache, evolving beyond the legacy assumption that empty `resourceVersion` universally bypasses caches.",
            "**Control Plane Blueprint**: Pairs with [Declarative Reconciliation Controllers](/en/articles/k8s-control-plane-declarative-reconciliation/) and [Local NVMe Storage & Fencing](/en/articles/k8s-database-storage-local-nvme-tuning-fencing/)."
        ]
    },
    "k8s-runtime-nri-kata-gvisor-kernel-tuning": {
        "zh": [
            "**容器运行时安全与演进**：深度对比 runc、Kata Containers（轻量虚拟化）与 gVisor（进程级内核拦截），以及 Node Resource Interface (NRI) 动态拦截注入机制。",
            "**内核与特性状态澄清**：Evented PLEG 截至当前版本仍处于特性门控（Feature Gate）阶段，不能作为已稳定 GA 且默认开启的能力盲目依赖。",
            "**Agent 沙箱落地**：为 [工具调用与安全沙箱执行](/articles/advanced-agent-tool-use-and-function-calling/) 提供了底层宿主机安全边界保障。"
        ],
        "en": [
            "**Runtime Isolation & Extension**: Compares standard runc against Kata micro-VMs and gVisor syscall-interception sandboxes, leveraging the Node Resource Interface (NRI) for dynamic container hooks.",
            "**Feature Gate Realities**: Confirms that Evented PLEG remains guarded behind Kubernetes feature gates rather than treated as an unconditionally GA capability.",
            "**Sandbox Implementation**: Directly underpins isolation infrastructure for [Safe Agent Tool Execution & Function Calling](/en/articles/advanced-agent-tool-use-and-function-calling/)."
        ]
    },
    "k8s-networking-cni-cilium-ebpf-gateway-api": {
        "zh": [
            "**eBPF 云原生网络革命**：从传统 iptables / IPVS 的 $O(N)$ 链表膨胀与 conntrack 瓶颈，转向 Cilium eBPF 在 Linux tc / XDP 层的直接短路转发与透明加密。",
            "**隧道与 MTU 规约**：澄清在 Underlay 物理网络 MTU 为 1500 时，必须在隧道内网卡 / Pod MTU 上做减法（降至 1450），而非随意修改宿主机底层物理网卡。",
            "**数据中心网络衔接**：与底层 [数据中心 Leaf-Spine BGP EVPN 架构](/articles/datacenter-network-clos-leaf-spine-bgp-evpn-vxlan/) 形成紧密的上下层协议栈联动。"
        ],
        "en": [
            "**eBPF Networking Revolution**: Replaces linear $O(N)$ iptables / IPVS rule chains and conntrack table exhaustion with Cilium eBPF socket and tc/XDP shortcut routing.",
            "**Tunneling & MTU Realities**: Clarifies that standard 1500 Underlay networks require clamping overlay/Pod interface MTUs (to ~1450), preserving host physical interfaces.",
            "**Network Infrastructure**: Bridges directly with physical underlay designs in [Datacenter Clos Leaf-Spine BGP EVPN VXLAN](/en/articles/datacenter-network-clos-leaf-spine-bgp-evpn-vxlan/)."
        ]
    }
}

# -------------------------------------------------------------
# Topic Cluster 6: InfiniBand, RDMA & Datacenter Networking
# -------------------------------------------------------------
CLUSTER_NETWORKING = {
    "infiniband-production-deployment-opensm-ofed-nccl-tuning": {
        "zh": [
            "**万卡智算互联基石**：详解 InfiniBand 子网管理器 (OpenSM) 路由算法配置（Up/Down 与 Fat-Tree 拓扑路由）、OFED 驱动栈加载与 NCCL 环境变量实战调优。",
            "**NCCL 通信提速**：调优 `NCCL_ALGO=Tree/Ring`、`NCCL_PROTO=Simple` 以及缓冲区尺寸，杜绝超大模型分布式训练与推理中的隐蔽死锁与微秒级掉速。",
            "**模型部署配套**：直接服务于 [DeepSeek-V4 与 Kimi K3 多机部署](/articles/deepseek-v4-kimi-k3-deployment-guide/) 以及 [MoE 专家并行 All-to-All 吞吐](/articles/moe-expert-parallelism-inference-engine/)。"
        ],
        "en": [
            "**Ultra-Scale AI Fabric Core**: Details InfiniBand Subnet Manager (OpenSM) routing algorithms (Up/Down and Fat-Tree), OFED kernel-bypass driver stacks, and production NCCL tuning.",
            "**NCCL Optimization**: Fine-tunes `NCCL_ALGO`, `NCCL_PROTO`, and buffer sizing to prevent silent micro-drops and deadlocks during distributed training and serving.",
            "**Deployment Target**: Foundational to hosting [DeepSeek-V4 and Kimi K3 Multi-Node Clusters](/en/articles/deepseek-v4-kimi-k3-deployment-guide/) and speeding up [MoE Expert All-to-All Collectives](/en/articles/moe-expert-parallelism-inference-engine/)."
        ]
    },
    "infiniband-fat-tree-rail-optimized-topology-adaptive-routing-sharp": {
        "zh": [
            "**无收敛 Fat-Tree 拓扑**：剖析 1:1 无收敛胖树架构的设计与 Rail-Optimized（轨道优化）组网，保证同卡跨机 NCCL All-Reduce 流量完全限制在单一子树内。",
            "**自适应路由与 SHARP 卸载**：利用 Adaptive Routing 消除跨链路拥塞热点，开启 SHARP（可扩展分层聚合与归约协议）将向量归约计算直接卸载至网络交换机芯片。",
            "**网络硬件全景**：配合参阅 [InfiniBand 架构速率与信用流控](/articles/infiniband-architecture-hardware-rates-credit-flow-subnet-manager/) 建立软硬件完整心智模型。"
        ],
        "en": [
            "**Non-Blocking Fat-Tree & Rail Optimization**: Designs 1:1 non-blocking topologies and rail-aligned cabling to constrain GPU peer-to-peer collective traffic within dedicated fabric rails.",
            "**Adaptive Routing & SHARP**: Eliminates static routing hot spots via dynamic packet-level multi-pathing and offloads mathematical reductions into switch ASICs via SHARP.",
            "**Hardware Deep Dive**: Read alongside [InfiniBand Architecture & Credit-Based Flow Control](/en/articles/infiniband-architecture-hardware-rates-credit-flow-subnet-manager/)."
        ]
    },
    "rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless": {
        "zh": [
            "**RDMA 内核旁路与零拷贝**：剖析 Send/Receive、RDMA Read/Write 四大动词与 Queue Pair (QP) 内存映射机制，绕过操作系统内核协议栈实现亚微秒级单边数据直传。",
            "**RoCEv2 真实部署模式**：澄清 RoCEv2 存在无损 (Lossless)、半无损与有损 (Lossy) 多种工业落地模式；PFC 优先级流控属于网络性能调优选项，并非协议绝对强制要求。",
            "**系统级加速实践**：广泛应用于 [P/D 分离的分布式 KV Cache 传输](/articles/pd-disaggregation-distributed-kv-cache/) 与企业级大模型分布式推理系统。"
        ],
        "en": [
            "**Kernel Bypass & Memory Semantics**: Disassembles RDMA verbs (Send/Receive, RDMA Read/Write) and Queue Pair (QP) architectures, achieving sub-microsecond one-sided memory transfers.",
            "**RoCEv2 Deployment Realities**: Corrects the myth of mandatory lossless networks—RoCEv2 operates in lossless, semi-lossless, and lossy configurations, with PFC representing a deployment choice rather than an intrinsic protocol requirement.",
            "**Enterprise Applications**: Underpins high-speed KV transfers in [P/D Disaggregated KV Cache Clusters](/en/articles/pd-disaggregation-distributed-kv-cache/)."
        ]
    },
    "datacenter-network-clos-leaf-spine-bgp-evpn-vxlan": {
        "zh": [
            "**现代数据中心网络演进**：从传统的二层 STP 阻塞网络演进为大规模三层 Clos Leaf-Spine 扁平拓扑，通过 BGP-EVPN 控制平面与 VXLAN 数据平面构建全网等价多路径 (ECMP)。",
            "**规范与 MTU 规约**：澄清 RFC 7348 并没有将 9000/9216 巨型帧作为 VXLAN 的强制条件；在通用 1500 Underlay 环境下，通常是降低内部虚拟网络 MTU 以规避分片。",
            "**云原生结合**：与 Kubernetes 云原生网络 [Cilium eBPF 与 CNI 架构](/articles/k8s-networking-cni-cilium-ebpf-gateway-api/) 紧密无缝衔接。"
        ],
        "en": [
            "**Datacenter Network Evolution**: Evolves from traditional STP bridging to modern Layer-3 Clos Leaf-Spine topologies, leveraging BGP-EVPN control planes and VXLAN overlays with equal-cost multi-pathing (ECMP).",
            "**Specification Realities**: RFC 7348 does not strictly enforce 9000/9216 jumbo frames; standard 1500 underlay environments handle encapsulation overhead by clamping inner overlay MTUs.",
            "**Cloud-Native Integration**: Harmonizes directly with container fabrics in [Kubernetes CNI & Cilium eBPF](/en/articles/k8s-networking-cni-cilium-ebpf-gateway-api/)."
        ]
    },
    "tcp-congestion-control-reno-cubic-bbr-quic-http3": {
        "zh": [
            "**拥塞控制算法演进**：对比基于丢包反馈的传统 Reno、基于三次函数增长的 CUBIC（规范乘法递减因子为 0.7）以及基于带宽延迟积 (BDP) 测量的 Google BBR 算法本质差异。",
            "**内核实现细节**：澄清现代 Linux 内核实现中 BBR 并不强制绑定 fq 排队规则，内核内部支持内置 pacing 机制。",
            "**协议终局**：剖析 QUIC 协议在 UDP 之上的用户态重构与 HTTP/3 零 RTT 连接迁移，为跨机大模型 API 调用提供抗网络抖动底座。"
        ],
        "en": [
            "**Congestion Control Progression**: Compares loss-based Reno against cubic-growth CUBIC (standard multiplicative decrease factor beta=0.7) and Google's BDP-model BBR.",
            "**Kernel Implementation Truths**: Clarifies that modern Linux kernel BBR implementations do not strictly mandate the external `fq` qdisc, utilizing internal pacing engines.",
            "**Modern Transport**: Explores UDP-based QUIC and HTTP/3 0-RTT migrations, safeguarding distributed LLM API pipelines against volatile network degradation."
        ]
    }
}

ALL_CLUSTERS = [
    CLUSTER_INFERENCE,
    CLUSTER_SERVING,
    CLUSTER_AGENT,
    CLUSTER_ALIGNMENT,
    CLUSTER_K8S,
    CLUSTER_NETWORKING
]

def enrich_file(file_path, slug, lang):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the data
    cluster_data = None
    for c in ALL_CLUSTERS:
        if slug in c:
            cluster_data = c[slug]
            break
    
    if not cluster_data:
        return False, "No enrichment defined"

    # Check if already enriched
    if "核心速览 (TL;DR)" in content or "Executive Summary (TL;DR)" in content:
        return False, "Already enriched"

    bullets = cluster_data[lang]
    if lang == "zh":
        card = "> [!NOTE] 核心速览 (TL;DR)\n"
        for b in bullets:
            card += f"> - {b}\n"
    else:
        card = "> [!NOTE] Executive Summary (TL;DR)\n"
        for b in bullets:
            card += f"> - {b}\n"

    # Match frontmatter
    # Pattern: ^---\n(.*?)\n---\n
    match = re.search(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        return False, "Frontmatter not found"

    frontmatter_end = match.end()
    rest = content[frontmatter_end:].lstrip()

    new_content = content[:frontmatter_end] + "\n" + card + "\n" + rest
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    return True, "Enriched successfully"

def main():
    print("🚀 Starting Automated SEO & GEO Cluster Enrichment...")
    enriched_count = 0
    for c in ALL_CLUSTERS:
        for slug in c.keys():
            zh_path = os.path.join(ZH_DIR, f"{slug}.md")
            en_path = os.path.join(EN_DIR, f"{slug}.en.md")
            
            if os.path.exists(zh_path):
                ok, msg = enrich_file(zh_path, slug, "zh")
                if ok:
                    print(f"  ✓ [ZH] Enriched: {slug}")
                    enriched_count += 1
            if os.path.exists(en_path):
                ok, msg = enrich_file(en_path, slug, "en")
                if ok:
                    print(f"  ✓ [EN] Enriched: {slug}")
                    enriched_count += 1

    print(f"\n✨ Enrichment complete! Updated {enriched_count} articles across topic clusters.")

if __name__ == "__main__":
    main()
