---
title: "DeepSeek-V4 and Kimi K3 Deployment: Precision, GPU Memory and Cluster Validation"
slug: deepseek-v4-kimi-k3-deployment-guide
date: 2026-09-07
tag: Cluster Deployment
tagClass: tag-cyan
category: Inference Systems
description: "Plan DeepSeek-V4-Pro and Kimi K3 deployments using native checkpoint formats, per-rank GPU memory, official vLLM recipes, and throughput-based cost estimates."
updated: 2026-10-20
---

## Scope and source versions

This guide uses public model cards and engine recipes to explain deployment decisions for DeepSeek-V4-Pro and Kimi K3. Capacity calculations are estimates, not published cluster measurements or guarantees of throughput. See the [vLLM serving guide](/en/articles/vllm-serving-guide/) for general configuration.

## 1. Identify the native checkpoint format

| Model | Total / active parameters | Published format | First checks |
| --- | --- | --- | --- |
| DeepSeek-V4-Pro | 1.6T / 49B | FP4 experts and mostly FP8 elsewhere | Revision, expert format, matching engine kernels |
| Kimi K3 | 2.8T / 104B | MXFP4 weights, MXFP8 activations, quantization-aware training | Native-format support and KDA / Gated MLA backends |

Sources: [DeepSeek model card](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro), [Kimi model card](https://huggingface.co/moonshotai/Kimi-K3). Active parameters describe part of the compute; they do not mean only those weights must be accessible.

For a hypothetical uniform FP8 conversion, 2.8T parameters require roughly 2.8TB before metadata and runtime memory. That exceeds the nominal 2.56TB of 32x80GB GPUs. A 32-card deployment therefore cannot be advertised as a general all-FP8 K3 configuration. Native MXFP4 changes both capacity and kernel requirements.

DeepSeek-V4-Pro has 61 layers and uses Compressed Sparse Attention (CSA) plus Heavily Compressed Attention (HCA). Multiplying V3 latent-cache dimensions by an assumed 64 layers is not a valid V4 estimate. See the [official configuration](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/config.json) and [attention architecture guide](/en/articles/kimi-kda-deepseek-mla-architecture/).

## 2. Budget memory per rank

```text
Executor budget = visible device memory × gpu_memory_utilization
KV / recurrent-state budget = executor budget - local weights - peak activations
                            - communication / non-PyTorch memory - graph overhead
```

Record the busiest rank rather than only cluster totals. TP may replicate state and PP stages may be uneven. Communication buffers depend on groups, kernels, token batches, and backend; there is no universal 120GB minimum for every 32-GPU cluster.

For an ordinary GQA example, cache bytes are approximately `2 × batch × sequence_length × layers × kv_heads × head_dim × bytes_per_element`. MLA, sequence-compressed attention, recurrent states, and quantization scales require their own accounting.

## 3. Use a hardware-matched engine recipe

Select the [DeepSeek-V4-Pro recipe](https://recipes.vllm.ai/deepseek-ai/DeepSeek-V4-Pro) or [Kimi K3 recipe](https://recipes.vllm.ai/moonshotai/Kimi-K3), then pin the image digest, weight revision, GPU, driver, and CUDA versions. K3's documented Blackwell / AMD paths do not establish support for an arbitrary H100 layout.

```bash
vllm --version
vllm serve --help
nvidia-smi
```

| Setting | Meaning and boundary |
| --- | --- |
| `--dtype auto` | Compute dtype selection; FP8 is not a valid dtype value |
| Native checkpoint loading | Follow its quantization configuration; an override does not convert arbitrary packed weights |
| `--distributed-executor-backend ray` | Ray backend selection, after the workers have joined a Ray cluster |
| `--enable-expert-parallel` | EP layout is derived with TP / DP configuration, not an extra independent GPU-count multiplier |
| `--kda-prefill-backend` | The documented choices include auto, triton, and flashkda; hardware support still applies |

Do not inject an undocumented library through LD_PRELOAD. KDA requires appropriate kernels; renaming an attention backend does not turn FlashAttention into KDA.

Intra-node TP and inter-node PP are one possible layout. Without EP enabled, that layout does not imply cross-node expert All-to-All traffic. Network sizing should follow collective and application measurements rather than a universal 400Gbps minimum.

## 4. Validate before scaling

Start with short, single-request inference, checking tokenizer, reasoning mode, and output format. Increase sequence length and concurrency gradually. Record image and weight versions, complete commands, GPU / NIC topology, per-rank memory, NCCL logs, input and output distributions, TTFT, TPOT, tail latency, and throughput that meets the SLA.

Compare FP8 KV task quality with a baseline. Chunked prefill can reduce blocking but does not guarantee a fixed speedup. See [vLLM monitoring](/en/articles/vllm-serving-guide/).

## 5. Cost models must respect capacity

```text
Daily API cost = input_tokens / 1e6 × input_price
               + output_tokens / 1e6 × output_price
Self-hosted unit cost = measured monthly total cost / useful monthly tokens at SLA
```

At an assumed blended $2.5 per million tokens, 2 billion tokens daily cost $5,000 and 20 billion cost $50,000. This arithmetic does not show that one fixed cluster can serve ten times the traffic. Twenty billion tokens daily imply a sustained 231,481 tokens per second; input and output also have different compute costs. Include extra capacity when measured demand exceeds the cluster's sustainable throughput. The [token calculator](/en/tools/) helps with arithmetic, not capacity validation.

## Frequently Asked Questions (FAQ)

### Q1: Can 32 H100 GPUs serve both models?
Check the exact native weights, kernels, layout, and concurrency. All-FP8 K3 weights alone exceed their nominal combined memory; native MXFP4 is a different deployment condition.

### Q2: Is FP8 KV always lossless?
No. Scales, model, backend, and context length matter. Evaluate task quality against a baseline.

### Q3: Is self-hosting necessarily cheaper?
No. Compare equivalent quality and SLA, measured utilization, operations, and capacity expansion. See the [Chinese model comparison](/en/articles/domestic-llm-comparison-2026/).
