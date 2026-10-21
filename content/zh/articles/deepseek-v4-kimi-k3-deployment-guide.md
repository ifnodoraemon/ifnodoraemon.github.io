---
title: "2026 DeepSeek-V4 与 Kimi K3 部署指南：权重精度、显存预算与集群验证"
slug: deepseek-v4-kimi-k3-deployment-guide
date: 2026-09-07
tag: 集群部署
tagClass: tag-cyan
category: 推理系统
description: "核对 DeepSeek-V4-Pro 与 Kimi K3 原生权重格式、逐卡显存预算、vLLM 分布式参数和官方启动配方，并用可持续吞吐约束私有化成本估算。"
updated: 2026-10-20
---

> [!NOTE] 核心速览 (TL;DR)
> - **超大模型拓扑规划**：针对 600B+ 超大 MoE 架构，严密推导四机 32 卡与八机 64 卡的 TP8×PP2×EP2 分布式切分策略与通信 Buffer 显存占用。
> - **版本与参数避坑**：官方标准模型标识月之暗面 Kimi K3 为 `moonshotai/Kimi-K3`，且启动参数需严格核对 vLLM 对应版本支持的量化与专家并行配置。
> - **集群网络强依赖**：多节点 MoE 推理极致依赖无拥塞网络，建议配套查阅 [InfiniBand 高性能组网](/articles/infiniband-production-deployment-opensm-ofed-nccl-tuning/) 与 [RoCEv2 拥塞控制](/articles/rdma-kernel-bypass-zero-copy-queue-pair-rocev2-lossless/)。

## 部署范围与资料版本

本文基于公开模型卡与推理引擎配方，说明 DeepSeek-V4-Pro、Kimi K3 的部署决策。这里的容量计算是估算，命令是配置起点；没有可公开复现的集群压测记录，因此不承诺固定卡数、吞吐或成本优势。通用服务参数见 [vLLM 部署指南](/articles/vllm-serving-guide/)。

## 一、先核对原生权重精度

| 模型 | 总参数／激活参数 | 官方发布精度 | 预算时首先核对 |
| --- | --- | --- | --- |
| DeepSeek-V4-Pro | 1.6T／49B | 专家 FP4，其他主要参数 FP8 | 具体 revision、专家格式、引擎对应算子 |
| Kimi K3 | 2.8T／104B | MXFP4 权重、MXFP8 激活，采用量化感知训练 | 原生格式支持、KDA 与 Gated MLA 后端 |

依据：[DeepSeek 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro)、[Kimi 模型卡](https://huggingface.co/moonshotai/Kimi-K3)。激活参数决定部分计算量，不能据此只加载 49B 或 104B 权重；所有可能被路由的专家仍需可访问。

`参数量 × 每参数字节数` 是**假设统一精度时**的权重下界。例如将 2.8T 参数全部保存为 FP8，原始权重约 2.8TB，已经超过 32×80GB 的名义 2.56TB 显存，尚未计缓存与工作区。因此四机 32 卡不能被标为“全 FP8 K3 通用方案”。原生 MXFP4 的容量、内核兼容性与吞吐要分别验证。

DeepSeek-V4-Pro 的官方配置为 61 层，采用 Compressed Sparse Attention（CSA）与 Heavily Compressed Attention（HCA）。不能将 DeepSeek-V3 的潜变量缓存维度乘以假设的 64 层，作为 V4 的真实缓存占用。详见 [官方配置](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/config.json)及 [注意力架构比较](/articles/kimi-kda-deepseek-mla-architecture/)。

## 二、逐卡显存预算，而非只看集群总和

```text
单卡执行器预算 = 实际可见显存 × gpu_memory_utilization
可用 KV／循环状态预算 = 执行器预算 - 本卡权重 - 激活峰值
                       - 通信与非 PyTorch 分配 - 图捕获等运行时开销
```

需要记录各 Rank 的权重、激活峰值和 KV 块数。TP 可能复制部分 KV／循环状态，PP 各阶段也未必均衡；总量能装下不代表最繁忙的一张卡能装下。通信缓冲受并行组、后端、Token 批量和实现影响，没有适用于所有 32 卡集群的固定 120GB 下限。

作为单独的数学例子，普通 GQA 的缓存可按 `2 × 并发数 × 序列长度 × 层数 × KV头数 × head_dim × 字节数` 估算。MLA、稀疏压缩注意力、循环状态和量化 scale 需要使用各自布局，不能共用同一公式。

## 三、使用与硬件一致的官方启动配方

分别选择 [DeepSeek-V4-Pro 配方](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Pro)与 [Kimi K3 配方](https://recipes.vllm.ai/moonshotai/Kimi-K3)，固定镜像 digest、模型 revision、GPU 型号、驱动及 CUDA 版本。K3 配方包含特定的 Blackwell／AMD 路径，不能当成对全部 H100 集群的支持声明。

先检查所安装版本的参数入口，避免把旧版命令粘贴到 vLLM 0.29：

```bash
vllm --version
vllm serve --help
nvidia-smi
```

| 配置项 | 含义与边界 |
| --- | --- |
| `--dtype auto` | 计算数据类型配置；FP8 不是此参数的合法取值 |
| 原生权重加载 | 依据 checkpoint 的量化配置；额外的量化覆盖不能自动将任意打包权重转成 FP8 |
| `--distributed-executor-backend ray` | 使用 Ray 时的后端入口；还需先建立各节点加入的 Ray 集群 |
| `--enable-expert-parallel` | 启用专家并行；EP 的组布局由 TP／DP 等配置共同决定，不能再把 EP 当独立卡数乘数 |
| `--kda-prefill-backend` | 当前版本列出 auto、triton、flashkda；选择还受对应硬件与内核支持约束 |

没有已验证来源的动态库不应通过 `LD_PRELOAD` 注入。KDA 是另一类算子，不能仅修改全局 Attention 后端名称就让标准 FlashAttention 变为 KDA。

机内 TP、跨机 PP 仅是一种布局。纯 TP＋PP 且未启用 EP 时，不能画出跨节点专家 All-to-All 并据此估算通信开销。跨机网络速率应通过实际集合通信与模型负载测量确定；400Gbps 是常见配置，不是协议规定的最低速度。

## 四、最小验证与压测记录

先启动短上下文、单并发请求，确认 tokenizer、推理模式和输出格式正确；再逐步增加输入长度、输出预算与并发。每轮保存：

1. 镜像／权重版本、完整命令和 `nvidia-smi topo -m` 拓扑；
2. 各 Rank 显存分解、KV 容量、NCCL 日志和失败请求；
3. 输入／输出长度分布、TTFT、TPOT、P95／P99 延迟与满足 SLA 的吞吐；
4. FP8 KV 与基线输出的任务评估，不能以“用户不可感知”替代验证。

Chunked Prefill 能减少长输入独占计算造成的等待，但不会保证每个负载都提升固定倍数。指标配置见 [vLLM 监控](/articles/vllm-serving-guide/)。

## 五、成本比较必须受容量约束

```text
API 日成本 = 输入 Token / 1e6 × 输入单价
           + 输出 Token / 1e6 × 输出单价（另计缓存与工具）
自建单位成本 = 实际月总成本 / 满足 SLA 的有效月 Token 量
```

示例：如果平均单价假设为 $2.5／百万 Token，日均 20 亿 Token 对应每日 $5,000，200 亿则是 $50,000。这只是算术，不证明同一套 32 卡集群能承受十倍流量。200 亿 Token／日约等于持续 231,481 Token／秒，输入与输出的系统开销还不同。必须先测可持续吞吐，超过容量时把扩容成本计入。站内 [Token 成本换算器](/tools/) 可辅助计算，不能替代负载验证。

## 常见问题 (FAQ)

### Q1: 32 张 H100 能否部署这两个模型？
要分别核对原生权重、引擎算子、并行布局和目标并发。2.8T 全 FP8 K3 的权重已超过其名义总显存；原生 MXFP4 是不同部署条件，不能混为一谈。

### Q2: 开启 FP8 KV 是否一定不掉精度？
不是。scale、模型、后端与上下文长度都会影响结果，应使用业务评测集对照基线。

### Q3: 自建是否一定比 API 便宜？
不是。需比较相近任务质量和 SLA 下的有效吞吐、利用率、运维与扩容成本。公开模型间的选型背景见 [国产模型比较](/articles/domestic-llm-comparison-2026/)。
