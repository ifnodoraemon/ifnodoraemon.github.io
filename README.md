# 智算架构志 (LLM Systems Architecture)

[![Live Site](https://img.shields.io/badge/Live_Site-blog.llmgo.top-6366f1?style=flat-square&logo=google-chrome)](https://blog.llmgo.top/)
[![Technical SEO](https://img.shields.io/badge/Google_SEO-100%2F100-10b981?style=flat-square&logo=google)](https://blog.llmgo.top/)
[![Robots.txt](https://img.shields.io/badge/Robots.txt-RFC_9309-blue?style=flat-square)](https://blog.llmgo.top/robots.txt)
[![IndexNow](https://img.shields.io/badge/IndexNow-Enabled-0ea5e9?style=flat-square)](https://blog.llmgo.top/sitemap.xml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Welcome to **LLM Systems Architecture**, an engineering research and experimental publication platform tracking the frontier evolution of AI Agents, Inference Engines, and Large Language Model architectures.

🌐 **Live Blog (Chinese):** [blog.llmgo.top](https://blog.llmgo.top/)  
🌐 **English Portal:** [blog.llmgo.top/en/](https://blog.llmgo.top/en/)  
📊 **2026 Frontier Models Benchmark Matrix:** [Frontier Models](https://blog.llmgo.top/models/)  
🛠️ **LLM Developer Toolbox:** [Interactive Tools Suite](https://blog.llmgo.top/tools/)

---

## 📚 Featured Technical Series & Research (精选体系专栏与深度长文)

### ⚡ 旗舰专栏：《大模型推理引擎：从模型演进、内核架构到未来终局》
*以底层硬件第一性原理贯穿现代大模型推理系统：从 Roofline 模型推导、算子加速，到 PagedAttention、MLA、MoE 并行与 P/D 解耦池化。*

* **[Chapter 01 · Roofline 模型与 Prefill/Decode 物理撕裂](https://blog.llmgo.top/articles/inference-roofline-prefill-decode/)**  
  👉 English: [Roofline Modeling of Prefill vs. Decode Disruption](https://blog.llmgo.top/en/articles/inference-roofline-prefill-decode/)
* **[Chapter 02 · PagedAttention 显存池管理与分页虚拟化](https://blog.llmgo.top/articles/pagedattention-memory-virtualization/)**  
  👉 English: [PagedAttention Memory Virtualization & Block Management](https://blog.llmgo.top/en/articles/pagedattention-memory-virtualization/)
* **[Chapter 03 · Continuous Batching 与 Chunked Prefill 消除排头阻塞](https://blog.llmgo.top/articles/continuous-batching-chunked-prefill-guide/)**  
  👉 English: [Continuous Batching & Chunked Prefill Deep Dive](https://blog.llmgo.top/en/articles/continuous-batching-chunked-prefill-guide/)
* **[Chapter 04 · 前缀缓存演进：从 Hash 寻址到 SGLang RadixAttention 树状缓存](https://blog.llmgo.top/articles/prefix-caching-radix-attention-internals/)**  
  👉 English: [Prefix Caching & RadixAttention Internals](https://blog.llmgo.top/en/articles/prefix-caching-radix-attention-internals/)
* **[Chapter 05 · Attention 算子加速史：FlashAttention-1/2/3 到 FlashInfer 统一异构核心](https://blog.llmgo.top/articles/flashattention-flashinfer-kernel-evolution/)**  
  👉 English: [FlashAttention to FlashInfer Kernel Evolution](https://blog.llmgo.top/en/articles/flashattention-flashinfer-kernel-evolution/)
* **[Chapter 06 · 模型架构反哺推理系统：MHA/GQA 到 DeepSeek MLA 矩阵吸收](https://blog.llmgo.top/articles/mha-gqa-mla-matrix-absorption-inference-engine/)**  
  👉 English: [MHA/GQA to DeepSeek MLA Matrix Absorption](https://blog.llmgo.top/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/)
* **[Chapter 07 · 稀疏大模型 MoE 推理内核：专家并行 (EP) 与 All-to-All 通信重叠](https://blog.llmgo.top/articles/moe-expert-parallelism-inference-engine/)**  
  👉 English: [MoE Expert Parallelism & All-to-All Overlap](https://blog.llmgo.top/en/articles/moe-expert-parallelism-inference-engine/)
* **[Chapter 08 · P/D 分离架构：计算与访存解耦、RDMA 分布式 KV Cache 传输与集群池化](https://blog.llmgo.top/articles/pd-disaggregation-distributed-kv-cache/)**  
  👉 English: [Prefill-Decode Disaggregation Architecture & RDMA KV Cache](https://blog.llmgo.top/en/articles/pd-disaggregation-distributed-kv-cache/)
* **[Chapter 09 · 四大主流生产级推理引擎架构横评与调度器源码解密：vLLM v1 vs SGLang vs TRT-LLM vs llama.cpp](https://blog.llmgo.top/articles/inference-engines-core-architecture-internals/)**  
  👉 English: [Production Inference Engines Teardown: vLLM v1 vs SGLang vs TRT-LLM vs llama.cpp](https://blog.llmgo.top/en/articles/inference-engines-core-architecture-internals/)
* **[Chapter 10 (终局) · 长思维链 (Reasoning / Test-Time Compute) 与大集群推理系统的未来终局](https://blog.llmgo.top/articles/reasoning-test-time-compute-inference-future/)**  
  👉 English: [Test-Time Compute, Reasoning Scheduling, and Tiered Cluster Storage](https://blog.llmgo.top/en/articles/reasoning-test-time-compute-inference-future/)

---

### 🤖 旗舰专栏：《AI Agent 生产级架构师手册》
*系统掌握 2026 生产级 AI Agent 核心架构：从执行循环、状态机，到 MCP 协议、Skills 扩展、多智能体协作与全链路可观测性。*

* **[Agent 执行循环与状态机设计：从 ReAct 到确定性控制流](https://blog.llmgo.top/articles/agent-loop-state-machine/)** (👉 [English](https://blog.llmgo.top/en/articles/agent-loop-state-machine/))
* **[MCP 协议完全指南：连接 LLM 与本地世界的统一标准](https://blog.llmgo.top/articles/mcp-guide/)** (👉 [English](https://blog.llmgo.top/en/articles/mcp-guide/))
* **[突破 10 万 Star 的 Browser-use 架构深度剖析](https://blog.llmgo.top/articles/browser-use-agent-architecture/)** (👉 [English](https://blog.llmgo.top/en/articles/browser-use-agent-architecture/))
* **[AI Agent 记忆系统设计：从工作记忆到分层 Graph RAG](https://blog.llmgo.top/articles/agent-memory-architecture/)** (👉 [English](https://blog.llmgo.top/en/articles/agent-memory-architecture/))
* **[对抗复合误差的分布式 Agent 编排与量化 Evals 体系](https://blog.llmgo.top/articles/agent-orchestration-evals/)** (👉 [English](https://blog.llmgo.top/en/articles/agent-orchestration-evals/))
* **[AI 编程驾驭指南：从「帮我写个 XX」到架构编排者](https://blog.llmgo.top/articles/ai-coding-mastery/)** (👉 [English](https://blog.llmgo.top/en/articles/ai-coding-mastery/))
* **[工具调用与 Function Calling 进阶：从 MCP 自动注册到沙箱执行与自愈循环](https://blog.llmgo.top/articles/advanced-agent-tool-use-and-function-calling/)** (👉 [English](https://blog.llmgo.top/en/articles/advanced-agent-tool-use-and-function-calling/))
* **[从零构建轻量级 Agent 框架：有限状态机、事件流与人机协同 (Human-in-the-Loop)](https://blog.llmgo.top/articles/build-lightweight-agent-framework/)** (👉 [English](https://blog.llmgo.top/en/articles/build-lightweight-agent-framework/))
* **[多智能体协作与并发控制：Actor 模型、状态共享与死锁防护](https://blog.llmgo.top/articles/multi-agent-collaboration-and-concurrency/)** (👉 [English](https://blog.llmgo.top/en/articles/multi-agent-collaboration-and-concurrency/))

---

### 🔬 更多前沿硬核研报 (High-Throughput Serving & Alignment)
* **[DeepSeek-V4 与 Kimi K3 生产级部署实战指南：四机 32 卡拓扑与成本推演](https://blog.llmgo.top/articles/deepseek-v4-kimi-k3-deployment-guide/)** (👉 [English](https://blog.llmgo.top/en/articles/deepseek-v4-kimi-k3-deployment-guide/))
* **[Test-Time Compute 与 GRPO 强化学习全景拆解：从自我反思到长思维链落地](https://blog.llmgo.top/articles/test-time-compute-grpo/)** (👉 [English](https://blog.llmgo.top/en/articles/test-time-compute-grpo/))
* **[SGLang vs vLLM 架构全景深度对比：RadixAttention、PageAttention 与吞吐极限评测](https://blog.llmgo.top/articles/sglang-vs-vllm-architecture/)** (👉 [English](https://blog.llmgo.top/en/articles/sglang-vs-vllm-architecture/))
* **[投机解码 (Speculative Decoding) 与 EAGLE 工业级落地实践](https://blog.llmgo.top/articles/speculative-decoding-eagle-guide/)** (👉 [English](https://blog.llmgo.top/en/articles/speculative-decoding-eagle-guide/))
* **[大模型量化选型与精度评测全景：从 INT8/FP8 到 AWQ/GPTQ 与显存数学](https://blog.llmgo.top/articles/quantization-precision-guide/)** (👉 [English](https://blog.llmgo.top/en/articles/quantization-precision-guide/))
* **[2026 主流前沿大模型全景横评：GPT-5.4、Claude 4.6、Gemini 3 与开源双雄](https://blog.llmgo.top/articles/model-comparison-2026/)** (👉 [English](https://blog.llmgo.top/en/articles/model-comparison-2026/))
* **[生产级 RAG 检索增强全景演进：向量数据库、混合检索与重排序优化](https://blog.llmgo.top/articles/rag-in-practice/)** (👉 [English](https://blog.llmgo.top/en/articles/rag-in-practice/))

---

## 🚀 Multi-Channel Syndication & SEO Automation (多渠道分发与外链建设)

本仓库内置高度自动化的多平台内容同步与规范反链属性脚本：

```bash
# 1. 批量导出适合国内平台 (掘金、知乎、微信公众号) 的规范 Markdown (带首发版权与反向内链)
npm run export:domestic -- --all

# 2. 自动化将顶流英文技术专栏发布至 DEV.to (具备官方 canonical_url 权威反链继承)
npm run publish:devto --top

# 3. 运行全站 Technical SEO 审计与 Google Search Central 合规校验 (100/100 满分)
npm run seo:google

# 4. 执行毫秒级搜索引擎 IndexNow 协议主动推流 (Bing / Yandex / Seznam)
npm run indexnow
```

---

## 👨‍💻 About The Author

I am **ifnodoraemon**, a developer and AI researcher passionate about exploring the capabilities and boundaries of modern LLMs.

- 🌐 **Blog:** [blog.llmgo.top](https://blog.llmgo.top)
- 🐙 **GitHub:** [@ifnodoraemon](https://github.com/ifnodoraemon)
- 𝕏 **X (Twitter):** [@ifnodoraemon](https://x.com/ifnodoraemon)
- ✉️ **Email:** ifnodoraemon@gmail.com

---

## 🛠️ Tech Stack

This site is built with a focus on speed, minimalism, and a sci-fi cyber aesthetic:
- **Vite** for ultra-fast generation and bundling.
- **Handlebars** for lightweight static templating.
- **Marked & KaTeX** for high-speed Markdown parsing and LaTeX math formula rendering.
- Native CSS variables for consistent, scalable theming without heavy frameworks.
- Automated **Technical SEO & Sitemap Auditing** with Google Search Console API integration.

## 📄 License

This repository is licensed under the MIT License.
