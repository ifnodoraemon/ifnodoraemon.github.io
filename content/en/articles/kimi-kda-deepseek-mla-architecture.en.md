---
title: "Kimi KDA, DeepSeek MLA and V4 CSA/HCA: Long-Context Cache and GPU Memory"
slug: kimi-kda-deepseek-mla-architecture
date: 2026-09-07
tag: Architecture Evolution
tagClass: tag-cyan
category: Inference Systems
description: "Understand KDA recurrent state, MLA latent caches, and DeepSeek-V4 CSA/HCA sequence compression, with explicit memory formulas and reproducible measurement rules."
updated: 2026-10-20
---

> [!NOTE] Executive Summary (TL;DR)
> - **Novel Attention Breakdown**: Thorough analysis of Kimi K3's hybrid 69-layer KDA (Kimi Dynamic Attention) + 24-layer Gated MLA design, dispelling the myth of universal constant-state caching.
> - **Memory Scaling Profiles**: Blending recurrent linear state updates with gated attention achieves effective long-context recall while flattening linear KV Cache memory trajectories.
> - **System Alignment**: Pairs directly with [DeepSeek MLA Matrix Absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/) and [Test-Time Reasoning Architectures](/en/articles/reasoning-test-time-compute-inference-future/).

## Distinguish cache representations from model-wide behavior

MLA compresses each historical token's representation. KDA replaces a full historical cache in a recurrent layer with fixed-size state. DeepSeek-V4's CSA / HCA also compress the sequence dimension. These mechanisms need separate capacity, compute, and quality analysis.

## 1. A defined MHA / GQA baseline

```text
KV_bytes = 2 × batch × sequence_length × layers × kv_heads × head_dim × bytes_per_element
```

For batch=1, a KV hidden dimension of 2048, 80 layers, and FP16, each token needs 655,360 bytes: about 2.62GB at 4,000 tokens and 655.36GB at one million. These are decimal GB; divide bytes by 2^30 for GiB. The example is not a universal estimate for every large model.

## 2. DeepSeek-V2 / V3 MLA

MLA caches a low-dimensional latent representation and separate positional keys. Matrix absorption can avoid fully reconstructing historical multi-head K/V at every decode step. See [MLA matrix absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/).

Cache still grows linearly with context. Its ratio depends on dimensions, layers, and precision. MLA is a trained architecture, not a lossless runtime switch for an arbitrary GQA checkpoint.

## 3. KDA states and the Kimi K3 hybrid

KDA includes gating, decay, and delta updates. `S_t = S_(t-1) + ΔS_t` is only an illustration. At fixed model dimensions, one recurrent layer has sequence-independent state size; distinguish per-token updates from total sequence processing.

The [Kimi K3 model card](https://huggingface.co/moonshotai/Kimi-K3) specifies 69 KDA layers and 24 Gated MLA layers. The complete model therefore retains a context-dependent cache component. State snapshots, prefix reuse, and concurrency affect serving memory too; see [prefix caching](/en/articles/prefix-caching-radix-attention-internals/).

## 4. DeepSeek-V4 CSA and HCA

The [DeepSeek-V4 model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro) names **Compressed Sparse Attention** and **Heavily Compressed Attention**. Sequence compression and sparse access require different accounting from V3 MLA's per-token latent cache. Use the checkpoint and engine's actual layout.

## 5. Design comparable measurements

| Area | Required controls |
| --- | --- |
| Model | Exact revision, weight / cache formats, layer composition |
| Parallelism | TP / PP / DP, cache replication and state sharding |
| Workload | Input / output lengths, concurrency, shared prefixes, warm-up |
| Capacity | Per-rank weights, activations, cache, communication, graphs |
| Quality and speed | TTFT, TPOT, throughput at SLA, retrieval and citation accuracy |

Without this information, numbers such as 8.6GB at 100K, 42GB at 1M, or 110 tokens/s are not reproducible benchmarks. Architectural claims require controlled workloads and quality checks. See the [deployment guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/).

## Frequently Asked Questions (FAQ)

### Q1: Do MLA or KDA eliminate all KV cache?
No. MLA keeps compressed history; recurrent KDA layers have fixed state, but K3's Gated MLA layers retain caches.

### Q2: Can these architectures use lower precision?
It depends on model and backend. Weight quantization, KV precision, and recurrent-state precision are separate controls; test them separately. See the [quantization guide](/en/articles/quantization-hands-on-guide/).

### Q3: Is KDA necessarily more accurate at retrieval?
No quality ranking follows from the recurrence alone. Measure matching tasks, sequence lengths, and reasoning budgets.
