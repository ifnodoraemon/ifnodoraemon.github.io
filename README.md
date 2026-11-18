# 智算架构志 (LLM Systems Architecture)

[![Live Site](https://img.shields.io/badge/Live_Site-blog.llmgo.top-6366f1?style=flat-square&logo=google-chrome)](https://blog.llmgo.top/)
[![Bilingual Articles](https://img.shields.io/badge/Bilingual_Articles-78_Pairs_(156_Docs)-8b5cf6?style=flat-square)](https://blog.llmgo.top/articles/)
[![Curated Series](https://img.shields.io/badge/Curated_Series-5_Complete_Tracks-06b6d4?style=flat-square)](https://blog.llmgo.top/articles/)
[![Technical SEO](https://img.shields.io/badge/Google_SEO-100%2F100-10b981?style=flat-square&logo=google)](https://blog.llmgo.top/)
[![Robots.txt](https://img.shields.io/badge/Robots.txt-RFC_9309-blue?style=flat-square)](https://blog.llmgo.top/robots.txt)
[![IndexNow](https://img.shields.io/badge/IndexNow-Enabled-0ea5e9?style=flat-square)](https://blog.llmgo.top/sitemap.xml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Welcome to **LLM Systems Architecture (智算架构志)** — a bilingual (ZH/EN) systems engineering publication organizing **all 78 deep-dive technical articles (156 bilingual Markdown documents, 0 orphan standalone posts)** into **5 textbook-grade, end-to-end engineering series**.

🌐 **Live Blog (Chinese):** [blog.llmgo.top](https://blog.llmgo.top/)  
🌐 **English Portal:** [blog.llmgo.top/en/](https://blog.llmgo.top/en/)  
📊 **Nov 2026 Frontier Models Matrix:** [Frontier Models (`GPT-6.2 Astra`, `Claude Fable 5.2`, `Gemini 4 Carbon`, `Qwen4-Max`, `Kimi K3.1 Pro`)](https://blog.llmgo.top/models/)  
🛠️ **LLM Developer Toolbox:** [Interactive Token, VRAM & RAG Chunking Suite](https://blog.llmgo.top/tools/)

---

## 📚 Five Complete Curated Engineering Series (五大全闭环体系专栏 · 共 78 篇)

### 1. ⚡ 《大模型推理系统全栈：从算子内核、压缩加速到超节点部署》 (`llm-inference` · 20 Chapters)
*GPU Driver Stack → Roofline → PagedAttention → Continuous Batching → RadixAttention → **CUDA/Triton Fused Kernels** → FlashAttention/FlashInfer → MLA & KDA/CSA → Quantization (FP8/INT4) → EAGLE-3 Speculative Decoding → MoE EP → P/D Disaggregation → Engine Internals → vLLM Prod → 32-GPU Debugging → DeepInfer Supernodes → Reasoning Endgame.*

* Start Reading: [Ch 01 · NVIDIA GPU 驱动栈](https://blog.llmgo.top/articles/nvidia-gpu-package-architecture/) · [Ch 02 · Roofline 模型](https://blog.llmgo.top/articles/inference-roofline-prefill-decode/) · [Ch 06 · CUDA & Triton 融合算子实战](https://blog.llmgo.top/articles/gpu-kernel-engineering-cuda-warp-triton-fused-ops/) · [Ch 19 · DeepInfer 超节点推理栈](https://blog.llmgo.top/articles/deepinfer-deepseek-recipe-architecture/)

### 2. 🧬 《大模型分布式训练、强化学习对齐与评估工程手册》 (`llm-post-training` · 12 Chapters)
*Prompting & Multimodal Baselines → Enterprise RAG → LoRA/QLoRA Fine-Tuning → **4D Distributed Training (`ZeRO/FSDP2`, `TP/SP`, `1F1B/DualPipe`, `ZigZag CP`)** → `GRPO` Critic-Free RL → **`verl` Rollout-Training Colocation & Async Rollouts** → Evals → Nov 2026 Frontier Benchmarks.*

* Start Reading: [Ch 04 · 微调全流程](https://blog.llmgo.top/articles/fine-tuning-guide/) · [Ch 05 · 分布式训练 4D 并行第一性原理](https://blog.llmgo.top/articles/distributed-llm-training-4d-parallelism-zero-fsdp2-pp-cp/) · [Ch 07 · 基于 verl 的百卡分布式 RL 训推混部](https://blog.llmgo.top/articles/distributed-rl-post-training-verl-colocation/) · [Ch 09 · 2026.11 模型横评](https://blog.llmgo.top/articles/model-comparison-2026/)

### 3. 🤖 《AI Agent 生产级架构师手册》 (`ai-agent` · 19 Chapters)
*Loop Engineering & FSM Control → MCTS Self-Correction → Context RAM & Hierarchical Memory → MCP & Skills → **Sub-15ms Firecracker MicroVM Sandboxes** → **Indirect Prompt Injection, MCP Poisoning & `CaMeL` Taint Security** → Custom Frameworks & Multi-Agent Concurrency → Observability & Environment Scaling.*

* Start Reading: [Ch 01 · 从零搭建 Agent](https://blog.llmgo.top/articles/build-ai-agent/) · [Ch 10 · Firecracker 微虚机沙箱](https://blog.llmgo.top/articles/agent-sandbox-firecracker-microvm-snapshot-isolation/) · [Ch 11 · Agent 提示注入与 MCP 安全治理](https://blog.llmgo.top/articles/agent-security-prompt-injection-mcp-permission-governance/) · [Ch 19 · Environment Scaling](https://blog.llmgo.top/articles/environment-scaling-agent-guide/)

### 4. ☸️ 《从 Docker 到 Kubernetes：云原生容器与 AI 智算编排指南》 (`container-k8s` · 14 Chapters)
*Linux Namespaces/cgroups v2 → veth/Bridge → SwarmKit Raft → K8s Control Plane → Cilium eBPF → CSI/NVMe Fencing → gRPC Zero-Downtime → Custom Gang Scheduler Plugins → NRI/Kata/gVisor → Aggregated APIServers & Operators → GPU Operator MIG → **`LeaderWorkerSet` & KV-Cache-Aware Inference Gateway**.*

* Start Reading: [Ch 01 · Docker 内核隔离](https://blog.llmgo.top/articles/docker-internals-namespace-cgroups-overlayfs/) · [Ch 09 · Gang 调度插件定制](https://blog.llmgo.top/articles/k8s-scheduling-framework-custom-plugin-gang-scheduling/) · [Ch 14 · K8s LeaderWorkerSet 与 KV 感知推理网关](https://blog.llmgo.top/articles/k8s-ai-inference-gateway-lws-kv-cache-routing/)

### 5. 🌐 《深入浅出计算机网络：从以太网原理到万卡 InfiniBand 与超节点实战》 (`computer-networking` · 13 Chapters)
*Physical Layer & MAC/ARP → Bitwise IP/CIDR → VLAN/NAT → DNS/Sockets → TCP & BBR/QUIC → Linux NAPI/sk_buff/XDP → Leaf-Spine EVPN-VXLAN → Lossless RoCEv2 → InfiniBand NDR/XDR Credit Flow & OpenSM → Rail-Optimized Fat-Tree & SHARP → OFED/NCCL Tuning → **GB200 NVL72 & Optical SuperPoD Collectives**.*

* Start Reading: [Ch 01 · 网络物理基石](https://blog.llmgo.top/articles/network-fundamentals-bits-cables-hubs-switches-mac-arp/) · [Ch 11 · IB 胖树与 SHARP](https://blog.llmgo.top/articles/infiniband-fat-tree-rail-optimized-topology-adaptive-routing-sharp/) · [Ch 13 · GB200 NVL72 超节点与 NCCL NVLS](https://blog.llmgo.top/articles/rack-scale-superpod-nvl72-nccl-collectives/)

---

## 🚀 Build, Verification & Multi-Channel SEO Automation

```bash
# 1. Build full bilingual static site (168 URLs) & 1200x630 OpenGraph cards
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
