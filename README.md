# 智算架构志 (LLM Systems Architecture)

[![Live Site](https://img.shields.io/badge/Live_Site-blog.llmgo.top-6366f1?style=flat-square&logo=google-chrome)](https://blog.llmgo.top/)
[![Bilingual Articles](https://img.shields.io/badge/Bilingual_Articles-74_Pairs_(148_Docs)-8b5cf6?style=flat-square)](https://blog.llmgo.top/articles/)
[![Technical SEO](https://img.shields.io/badge/Google_SEO-100%2F100-10b981?style=flat-square&logo=google)](https://blog.llmgo.top/)
[![Robots.txt](https://img.shields.io/badge/Robots.txt-RFC_9309-blue?style=flat-square)](https://blog.llmgo.top/robots.txt)
[![IndexNow](https://img.shields.io/badge/IndexNow-Enabled-0ea5e9?style=flat-square)](https://blog.llmgo.top/sitemap.xml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Welcome to **LLM Systems Architecture (智算架构志)** — a bilingual (ZH/EN) systems engineering publication featuring **74 deep-dive technical articles (148 bilingual Markdown documents)** across **LLM Inference Engines, Distributed RL Post-Training, Autonomous AI Agent Infrastructure, Cloud-Native Kubernetes Scheduling, and RDMA/NVLink Cluster Networking**.

🌐 **Live Blog (Chinese):** [blog.llmgo.top](https://blog.llmgo.top/)  
🌐 **English Portal:** [blog.llmgo.top/en/](https://blog.llmgo.top/en/)  
📊 **Nov 2026 Frontier Models Matrix:** [Frontier Models (`GPT-6.2 Astra`, `Claude Fable 5.2`, `Gemini 4 Carbon`, `Qwen4-Max`, `Kimi K3.1 Pro`)](https://blog.llmgo.top/models/)  
🛠️ **LLM Developer Toolbox:** [Interactive Token, VRAM & RAG Chunking Suite](https://blog.llmgo.top/tools/)

---

## 🔥 Latest Flagship Architecture Deep Dives (2026.11 最新硬核研报)

* **[大模型分布式强化学习后训练架构：基于 verl 的训推混部 (Colocation)、FSDP2 与零冗余权重同步实战](https://blog.llmgo.top/articles/distributed-rl-post-training-verl-colocation/)**  
  👉 English: [Distributed RL Post-Training with verl: Colocation, Weight Resharding & Async Rollouts](https://blog.llmgo.top/en/articles/distributed-rl-post-training-verl-colocation/)
* **[AI Agent 安全执行沙箱架构：基于 Firecracker MicroVM 的毫秒级快照克隆与高并发隔离实战](https://blog.llmgo.top/articles/agent-sandbox-firecracker-microvm-snapshot-isolation/)**  
  👉 English: [Architecting AI Agent Security Sandboxes: Sub-15ms Firecracker MicroVM Snapshots & Zero-Trust Isolation](https://blog.llmgo.top/en/articles/agent-sandbox-firecracker-microvm-snapshot-isolation/)
* **[机柜级超节点与集合通信：GB200 NVL72、NVLink 5 铜缆背板与 NCCL NVLS 架构解析](https://blog.llmgo.top/articles/rack-scale-superpod-nvl72-nccl-collectives/)**  
  👉 English: [Rack-Scale SuperPoD & NCCL Collectives: GB200 NVL72, Optical Fabrics & MoE All-to-All](https://blog.llmgo.top/en/articles/rack-scale-superpod-nvl72-nccl-collectives/)
* **[深度解构 DeepSeek 推理引擎 DeepInfer 与 deepseek-recipe：从稀疏算子到高并发超节点工程落地](https://blog.llmgo.top/articles/deepinfer-deepseek-recipe-architecture/)**  
  👉 English: [Inside DeepSeek's DeepInfer & deepseek-recipe: Sparse Kernels to Wide-EP Supernodes](https://blog.llmgo.top/en/articles/deepinfer-deepseek-recipe-architecture/)
* **[2026.11 模型横评：GPT-6.2 Astra、Claude Fable 5.2 与 Gemini 4](https://blog.llmgo.top/articles/model-comparison-2026/)** & **[国产前沿选型：Qwen4-Max、Kimi K3.1 Pro、DeepSeek-V4 与 MiniMax M3.1](https://blog.llmgo.top/articles/domestic-llm-comparison-2026/)**

---

## 📚 Four Curated Engineering Series (四大体系化技术专栏)

### 1. ⚡ 《大模型推理引擎：从模型演进、内核架构到未来终局》 (10 Chapters)
*First-principles GPU systems series spanning Roofline modeling, PagedAttention, FlashAttention-3/FlashInfer, MLA matrix absorption, Wide-EP MoE, and RDMA Prefill-Decode disaggregation.*

* **[Ch 01 · Roofline 模型与 Prefill/Decode 物理撕裂](https://blog.llmgo.top/articles/inference-roofline-prefill-decode/)** (👉 [EN](https://blog.llmgo.top/en/articles/inference-roofline-prefill-decode/))
* **[Ch 02 · PagedAttention 显存池管理与分页虚拟化](https://blog.llmgo.top/articles/pagedattention-memory-virtualization/)** (👉 [EN](https://blog.llmgo.top/en/articles/pagedattention-memory-virtualization/))
* **[Ch 03 · Continuous Batching 与 Chunked Prefill 消除排头阻塞](https://blog.llmgo.top/articles/continuous-batching-chunked-prefill-guide/)** (👉 [EN](https://blog.llmgo.top/en/articles/continuous-batching-chunked-prefill-guide/))
* **[Ch 04 · 前缀缓存演进：从块哈希寻址到 SGLang RadixAttention 树状缓存](https://blog.llmgo.top/articles/prefix-caching-radix-attention-internals/)** (👉 [EN](https://blog.llmgo.top/en/articles/prefix-caching-radix-attention-internals/))
* **[Ch 05 · Attention 算子加速史：FlashAttention-1/2/3 到 FlashInfer 统一内核](https://blog.llmgo.top/articles/flashattention-flashinfer-kernel-evolution/)** (👉 [EN](https://blog.llmgo.top/en/articles/flashattention-flashinfer-kernel-evolution/))
* **[Ch 06 · MHA/GQA 到 DeepSeek MLA 矩阵吸收](https://blog.llmgo.top/articles/mha-gqa-mla-matrix-absorption-inference-engine/)** (👉 [EN](https://blog.llmgo.top/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/))
* **[Ch 07 · 稀疏大模型 MoE 推理内核：专家并行 (EP) 与 All-to-All 通信重叠](https://blog.llmgo.top/articles/moe-expert-parallelism-inference-engine/)** (👉 [EN](https://blog.llmgo.top/en/articles/moe-expert-parallelism-inference-engine/))
* **[Ch 08 · P/D 分离架构：RDMA 分布式 KV Cache 传输与集群池化](https://blog.llmgo.top/articles/pd-disaggregation-distributed-kv-cache/)** (👉 [EN](https://blog.llmgo.top/en/articles/pd-disaggregation-distributed-kv-cache/))
* **[Ch 09 · 推理引擎对比：vLLM、SGLang、TRT-LLM、llama.cpp](https://blog.llmgo.top/articles/inference-engines-core-architecture-internals/)** (👉 [EN](https://blog.llmgo.top/en/articles/inference-engines-core-architecture-internals/))
* **[Ch 10 · 长思考链与 Test-Time Compute：大模型推理引擎的终局之战](https://blog.llmgo.top/articles/reasoning-test-time-compute-inference-future/)** (👉 [EN](https://blog.llmgo.top/en/articles/reasoning-test-time-compute-inference-future/))

### 2. 🤖 《AI Agent 生产级架构师手册》 (14 Chapters)
*State machines, MCP & Skills, hierarchical memory, sandboxing, Environment Scaling, concurrency control, OpenTelemetry observability, and prompt-injection defense.*

* Representative chapters: [Execution Loop & FSM](https://blog.llmgo.top/articles/agent-loop-state-machine/) · [MCP Guide](https://blog.llmgo.top/articles/mcp-guide/) · [Tool Runtime & Sandboxing](https://blog.llmgo.top/articles/advanced-agent-tool-use-and-function-calling/) · [Lightweight Agent Framework](https://blog.llmgo.top/articles/build-lightweight-agent-framework/) · [Multi-Agent Concurrency](https://blog.llmgo.top/articles/multi-agent-collaboration-and-concurrency/) · [Environment Scaling](https://blog.llmgo.top/articles/environment-scaling-agent-guide/)

### 3. ☸️ 《从 Docker 到 Kubernetes：云原生容器与集群编排架构指南》 (13 Chapters)
*Linux namespaces/cgroups v2, OverlayFS, runc/containerd shimv2, Kubernetes API Server/etcd/Scheduler internals, Volcano/Kueue gang scheduling, K8s 1.32 DRA & CDI GPU topology, Kata/gVisor, and eBPF Cilium.*

* Browse full series: [Container & K8s Architecture Series](https://blog.llmgo.top/articles/#series)

### 4. 🌐 《深入浅出计算机网络：从以太网原理到万卡 InfiniBand 架构实战》 (12 Chapters)
*PCIe/DMA/RingBuffer, Linux sk_buff/NAPI, TCP BBR, BGP Clos ECMP, VXLAN vs Cilium eBPF, Envoy/gRPC/QUIC, RDMA Verbs/GPUDirect, RoCEv2 PFC/ECN/DCQCN, InfiniBand OpenSM/NCCL, and packet-level troubleshooting.*

* Browse full series: [AI Cluster Networking Series](https://blog.llmgo.top/articles/#series)

---

## 🚀 Build, Verification & Multi-Channel SEO Automation

```bash
# 1. Build full bilingual static site & 1200x630 OpenGraph cards
npm run build

# 2. Run end-to-end smoke suite (Python runnable examples, Node tests, Mermaid, KaTeX, SEO)
npm run test:smoke

# 3. Run Google Search Central Technical SEO Audit (100/100 score)
npm run seo:google

# 4. Multi-channel syndication & IndexNow instant push
npm run export:domestic -- --all
npm run publish:devto --top
npm run indexnow
```

---

## 👨‍💻 Author & License

Built and maintained by **ifnodoraemon** ([blog.llmgo.top](https://blog.llmgo.top) · [@ifnodoraemon](https://github.com/ifnodoraemon) · [X](https://x.com/ifnodoraemon)). Licensed under the MIT License.
