---
title: "Kimi KDA、DeepSeek MLA 与 V4 CSA/HCA：长上下文缓存原理与显存估算"
slug: kimi-kda-deepseek-mla-architecture
date: 2026-09-07
tag: 架构演进
tagClass: tag-cyan
category: 推理系统
description: "区分 KDA 循环状态、MLA 潜变量缓存与 DeepSeek-V4 CSA/HCA 序列压缩，结合 Kimi K3 混合层结构推导显存估算边界与可比较的测试方法。"
updated: 2026-10-20
---

> [!NOTE] 核心速览 (TL;DR)
> - **新型注意力架构对比**：深入拆解 Kimi K3 采用的 69 层 KDA（Kimi Dynamic Attention）+ 24 层 Gated MLA 混合架构，纠正“全模型状态恒定”的技术误区。
> - **显存增长曲线推演**：KDA 线性状态层与 MLA 注意力层相互配合，既保留了长文本动态检索能力，又大幅压平了长序列 KV Cache 爆炸曲线。
> - **推理工程适配**：与 [DeepSeek MLA 矩阵吸收原理](/articles/mha-gqa-mla-matrix-absorption-inference-engine/) 及 [长思维链推理演进](/articles/reasoning-test-time-compute-inference-future/) 构成现代推理模型演进的核心链条。

## 三种架构解决的不是同一个问题

MLA 压缩每个历史 Token 的缓存表示；KDA 用固定维度的循环状态更新代替完整历史键值；DeepSeek-V4 的 CSA／HCA 还会压缩序列维度。它们需要分别讨论缓存容量、注意力计算与模型质量，不能用一组未经定义的“显存实测”混合比较。

## 一、MHA／GQA 的缓存计算基线

```text
KV_bytes = 2 × batch × sequence_length × layers × kv_heads × head_dim × bytes_per_element
```

例如明确设定 batch=1、KV 隐藏维度=2048、80 层、FP16，每 Token 的缓存为 655,360 字节；4,000 Token 约 2.62GB，一百万 Token 约 655.36GB。这里统一使用十进制 GB；换算 GiB 时需除以 2^30。这只是指定 GQA 配置的算例，不是所有千亿参数模型的通用数值。

## 二、DeepSeek-V2／V3 MLA：缓存潜变量与位置键

MLA 将历史输入投影为低维潜变量，并单独保留解耦的 RoPE 键。Decode 可以通过矩阵吸收避免逐步完整重建多头 K/V，推导见 [MLA 矩阵吸收](/articles/mha-gqa-mla-matrix-absorption-inference-engine/)。

MLA 的缓存仍随上下文长度线性增加，压缩率取决于潜变量、位置维度、层数与数据类型；它是训练好的架构，不是能对任意已训练 GQA 模型无损打开的运行时开关。

## 三、KDA 层的循环状态与 Kimi K3 混合结构

KDA 的状态更新包含门控、衰减与 delta 更新，`S_t = S_(t-1) + ΔS_t` 只能作为示意，不能当成完整算法。固定模型尺寸时，单个循环层的状态不随序列长度增长；每 Token 的更新成本也应与处理整段序列的总成本区分。

[Kimi K3 模型卡](https://huggingface.co/moonshotai/Kimi-K3)列出 69 层 KDA 与 24 层 Gated MLA。因此全模型仍存在随上下文增长的缓存部分，不能描述为“恒定显存”。循环状态保存、前缀复用和并发也会改变服务端实际占用，见 [前缀缓存原理](/articles/prefix-caching-radix-attention-internals/)。

## 四、DeepSeek-V4：CSA 与 HCA

[DeepSeek-V4 模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro)给出的名称是 **Compressed Sparse Attention** 与 **Heavily Compressed Attention**。V4 的序列压缩与稀疏访问不同于只减少每 Token 维度的 V3 MLA，缓存预算必须按实际压缩布局和引擎实现计算。

## 五、如何设计可比较的测量

| 项目 | 必须固定或记录 |
| --- | --- |
| 模型 | 精确 revision、权重及缓存格式、层组成 |
| 并行 | TP／PP／DP、是否存在 KV 复制、状态分片 |
| 负载 | 输入与输出长度、并发、前缀复用与热身 |
| 容量 | 每 Rank 权重、激活、缓存、通信和图捕获占用 |
| 效果 | TTFT、TPOT、满足 SLA 的吞吐、引用与检索正确率 |

没有这些配置就不能将“100K 用 8.6GB、1M 用 42GB、110 Token/s”等数字视作可复现结果。模型规模也不同，架构效果需要受控实验与质量评估；长上下文容量不等于高召回率或低幻觉率。部署条件见 [DeepSeek／Kimi 部署指南](/articles/deepseek-v4-kimi-k3-deployment-guide/)。

## 常见问题 (FAQ)

### Q1: MLA 或 KDA 是否直接消除了全部 KV Cache？
没有。MLA 保留压缩后的历史表示；KDA 循环层状态固定，但 K3 的 Gated MLA 层仍有缓存。

### Q2: 能否叠加低精度缓存？
取决于模型和后端。权重量化、KV 量化和循环状态精度是不同配置，应分别测试质量与算子支持，参见 [量化指南](/articles/quantization-hands-on-guide/)。

### Q3: KDA 是否必然比其他架构检索更准确？
不能从状态更新形式推导质量排名，需要对同一检索任务、上下文长度与推理预算测量。
