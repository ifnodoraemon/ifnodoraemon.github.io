---
title: "Kimi K3 vs GLM-5.3 vs DeepSeek-V4: Architecture, Benchmarks and Deployment"
slug: domestic-llm-comparison-2026
date: 2026-09-07
tag: Chinese LLMs
tagClass: tag-amber
category: Evaluation & Trends
description: "Compare Kimi K3, GLM-5.3, and DeepSeek-V4-Pro with sourced architecture facts, matching benchmark versions, checkpoint formats, and workload evaluation plans."
updated: 2026-10-20
---

> [!NOTE] Executive Summary (TL;DR)
> - **Domestic LLM Engineering Teardown**: Rigorously analyzes DeepSeek-V4, Moonshot Kimi K3, Zhipu GLM-5.3 (~753B parameter class), and MiniMax across real coding, reasoning, and production deployments.
> - **Architectural Breakthroughs**: DeepSeek-V4 features CSA+HCA hybrid attention while Kimi K3 deploys 69 KDA + 24 Gated MLA layers, redesigning traditional Transformer economics.
> - **Infrastructure Blueprint**: For multi-node hardware planning, see the [DeepSeek-V4 and Kimi K3 Production Deployment Guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/).

## Scope: public evidence and workload evaluation

This guide compares Kimi K3, GLM-5.3, and DeepSeek-V4-Pro using model cards. Reported benchmarks are not this site's controlled measurements. Workload sections describe evaluation plans rather than completed experiments. See the [GPT / Claude / Gemini comparison](/en/articles/model-comparison-2026/) for commercial model considerations.

## 1. Architecture and checkpoint requirements

| Property | Kimi K3 | GLM-5.3 | DeepSeek-V4-Pro |
| --- | --- | --- | --- |
| Total parameters | 2.8T | Approximately 753B | 1.6T |
| Active parameters | 104B | Consult the architecture configuration | 49B |
| Long context | 1M class | 1M class | 1M class |
| Engineering focus | Hybrid KDA / Gated MLA, native vision | Long-horizon post-training and terminal evaluations | CSA / HCA attention and compressed caches |
| Weights | Open; check the license | Open; check the license | Open; check the license |

Sources: [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3), [GLM-5.3](https://huggingface.co/zai-org/GLM-5.3), [DeepSeek-V4-Pro](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro).

K3 combines 69 KDA layers with 24 Gated MLA layers. Constant recurrent state in KDA does not make the complete model's cache constant. DeepSeek-V4 uses **Compressed Sparse Attention (CSA)** and **Heavily Compressed Attention (HCA)**, and its configuration includes shared experts. See the [attention architecture guide](/en/articles/kimi-kda-deepseek-mla-architecture/).

GLM-5.3 reuses the GLM-5.2 base model and attributes its gains to post-training. This does not establish an exact sandbox count, training interaction count, or universal troubleshooting success rate.

## 2. Compare matching benchmark versions

The following values come from the comparison in GLM-5.3's model card. They describe that report, not an independent reproduction or universal ranking.

| Benchmark | Kimi K3 | GLM-5.3 | DeepSeek-V4 Pro-0813 |
| --- | --- | --- | --- |
| Terminal-Bench 2.1 | 88.3 | 88.2 | 87.9 |
| Terminal-Bench 3.0 | 17.4 | 28.3 | Not reported in this table |
| DeepSWE v1.1 | 67.5 | 66.9 | 62.7 |

Read the [official table and footnotes](https://huggingface.co/zai-org/GLM-5.3#benchmark) for harness, reasoning, context, and time budgets. Its Terminal-Bench 3.0 result uses a specified Claude Code harness and avg@3. An absent result is neither zero nor evidence that a model has never been evaluated. Pass@1, Pass@k, and different harness results cannot be merged into one 80.6%–96.4% score range. See [LLM evaluation](/en/articles/llm-evaluation-guide/).

## 3. Workload evaluation plans

### Long documents and charts

Freeze authorized source files and token budgets. Request field values, page references, and supporting excerpts. Measure numeric accuracy, citation accuracy, unsupported claims, latency, and cost. Needle retrieval alone does not establish financial-audit reliability.

### Terminal troubleshooting agents

Reset identical faulty images before each run. Fix tool permissions, turns, and deadlines. Use deterministic probes to verify DNS, Service, and gRPC recovery; record unnecessary changes, unsafe actions, and rollback behavior.

### Repository modifications

Pin the repository commit, issue, and hidden tests. Record patches, commands, pass rates, and repeated runs under equal tool and compute budgets. Passing tests written by the model itself does not prove task completion.

## 4. Deployment and cost selection

Filter candidates by input modality and available kernels, then measure quality and SLA. Total weights still determine MoE capacity. DeepSeek's native FP4 / FP8 mix and K3's MXFP4 format require different deployment checks; see the [deployment guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/).

Record API input, output, cached-input, tool, provider, and time-based charges separately. Throughput depends on request lengths, concurrency, and reasoning budgets; one unqualified TPS number per model is not comparable evidence. Compare useful cost at matched quality, then design retries, circuit breakers, and fallback routing.

## Frequently Asked Questions (FAQ)

### Q1: Does a lower Terminal-Bench 3.0 score imply regression from 2.1?
No. They are different task versions. Compare matching versions and execution settings.

### Q2: Is Kimi K3 necessarily best for every long-document task?
Its vision and context capabilities make it a candidate. Validate parsing, citations, and numeric extraction on the actual material rather than assuming no hallucinations.

### Q3: When is self-hosting worthwhile?
After validating format support, capacity, sustained traffic, quality, and SLA, compare measured costs. The [token calculator](/en/tools/) can assist with arithmetic.
