---
title: "vLLM Online Inference in Production: From Architecture to Token Billing"
slug: vllm-serving-guide
date: 2026-04-14
tag: Inference Deployment
tagClass: tag-green
description: A deep dive into vLLM's core architecture (PagedAttention, continuous batching, APC prefix caching, speculative decoding) for online serving. Covers OpenAI-compatible API setup, performance tuning, token billing systems, and complete Docker deployment with Prometheus monitoring.
featured: true
featuredStats:
  - label: Core Tech
    value: 6+
  - label: Tuning Params
    value: 10+
  - label: Deploy Plans
    value: 3
---

## Introduction: Why vLLM?

In 2026, if you need to deploy an LLM inference service in production — whether it's an internal AI assistant or a commercial API platform — you'll almost certainly encounter **vLLM**.

Born in UC Berkeley's Sky Computing Lab and published at SOSP 2023, vLLM has become one of the most active open-source inference engines with 2,000+ contributors. Its motto is straightforward: **"Easy, fast, and cheap LLM serving for everyone."**

But what exactly makes vLLM fast? How do you monitor and optimize cache hit rates? What should `--max-num-seqs` be set to? Why is token billing such a deep trap in self-hosted inference? This article covers **architecture, caching mechanisms, scheduling algorithms, deployment, performance tuning, and token billing** — everything you need for production-ready vLLM.

---

## Layer 1: Understanding vLLM's Core Engine in 5 Minutes

LLM inference fundamentally splits into two distinct phases:

- **Prefill**: Process the entire user input at once, computing attention for all tokens. This is **compute-bound** — GPU cores are maxing out on matrix multiplications.
- **Decode**: Generate output tokens one by one, each depending on the KV Cache of all preceding tokens. This is **memory-bandwidth-bound**.

Understanding this fundamental difference is the key to understanding every vLLM optimization.

Traditional frameworks have two fatal problems:
1. **Memory waste**: Each request's KV Cache requires pre-allocated contiguous GPU memory, even if only 10% is used.
2. **Poor concurrency**: Static batching waits for the slowest request to finish before processing the next batch.

### 1. PagedAttention: Virtual Memory for GPU

vLLM's most groundbreaking innovation, borrowing the **virtual memory paging** concept from operating systems:

```text
Traditional: Pre-allocate contiguous memory per request (like MS-DOS real mode)
  Request A: [████████████░░░░░░░░] ← 60% wasted
  Request B: [██████░░░░░░░░░░░░░░] ← 70% wasted
  Request C: "Sorry, out of memory. Please queue."

PagedAttention: Slice memory into fixed-size pages (Blocks), allocate on demand
  Physical blocks:     [P1][P2][P3][P4][P5][P6][P7][P8]
  Request A page table: P1 → P3 → P5 (use only what you need, non-contiguous OK)
  Request B page table: P2 → P4
  Request C page table: P6 → P7 (previously couldn't fit, now easily admitted)
  Free pool:           P8 (ready for new requests or existing request growth)
```

**Key insight**: Pages don't need to be physically contiguous. vLLM maintains a **Block Table** for mapping, achieving three breakthroughs:

1. **Near-zero waste**: KV Cache memory waste drops from **60-80%** to **<4%** (only the last block's internal fragmentation).
2. **2-4x concurrency**: Same GPU handles 2-4x more concurrent requests.
3. **Shared reuse**: Requests sharing the same prefix (e.g., system prompt) can point to the **same physical pages**.

### 2. Continuous Batching

Traditional inference is like a restaurant requiring all guests to arrive, order, and leave simultaneously. vLLM introduces **iteration-level scheduling**:

```text
Timeline:
  t=0  [Req A-decode] [Req B-decode] [Req C-prefill] [          ]
  t=1  [Req A-decode] [Req B-done✓]  [Req C-decode]  [Req D-new!]
  t=2  [Req A-decode] [Req D-prefill] [Req C-decode]  [          ]
  t=3  [Req A-done✓]  [Req D-decode]  [Req C-done✓]  [Req E-new!]
```

Request finishes → **immediately** removed. New request arrives → **immediately** inserted. GPU stays **fully utilized** at all times.

### 3. Chunked Prefill — The Latency Lifesaver for Online Serving

A hidden danger in continuous batching: a **10,000-token document** will monopolize the GPU for hundreds of milliseconds during prefill, stalling all other decoding requests.

Chunked prefill divides long prompts into smaller chunks:

```text
Scheduler maintains a "token budget" per iteration (e.g., max_num_batched_tokens = 8192)

Round 1: [Req A prefix tokens 0-2047]  + [Req B decode 1 token] + [Req C decode 1 token]
Round 2: [Req A prefix tokens 2048-4095] + [Req B decode 1 token] + [Req C decode 1 token]
...
Round 5: [Req A remaining prefix tokens] + [Req B decode 1 token] + [Req C decode 1 token]
Round 6: [Req A starts decoding!] + [Req B decode 1 token] + [Req C decode 1 token]
```

**Core scheduling policy**: vLLM V1 prioritizes **active decode requests** first, then uses remaining budget for new prefill chunks. Users B and C barely notice User A's massive input.

> **Must-enable for online services**: `--enable-chunked-prefill`.

---

## Layer 2 Deep Dive: APC Prefix Caching — Understanding It Pays Off

If PagedAttention solves "how to allocate memory," **Automatic Prefix Caching (APC)** solves "how to reuse what's already been computed."

### Why APC Is Critical for Online Services

Real-world online inference requests typically look like:

```text
Req 1: [System Prompt (800T) | Multi-turn History (2000T) | New Message (50T)]
Req 2: [System Prompt (800T) | Multi-turn History (2000T) | New Message (30T)]
Req 3: [System Prompt (800T) | Different User Chat (500T) | New Message (80T)]
```

Requests 1 and 2 share **2,800 tokens** of prefix! Request 3 shares **800 tokens** of system prompt. Recomputing from scratch every time is enormously wasteful.

### How APC Works: Block Hashing + Global Hash Table + LRU Eviction

**Step 1: Block Hashing**

vLLM partitions all token sequences into fixed-size blocks (default: 16 tokens). Each block is uniquely identified by a **chained hash**:

```text
Hash calculation: hash(parent_block_hash + current_block_tokens)

Example: System prompt "You are a helpful AI assistant..." (800 tokens)
  Block_0: hash(NULL + tokens[0:16])       = 0xA1B2C3...
  Block_1: hash(0xA1B2C3 + tokens[16:32])  = 0xD4E5F6...
  Block_2: hash(0xD4E5F6 + tokens[32:48])  = 0x789ABC...
  ...     (50 blocks total)
```

**Why chained hashing?** The same 16 tokens at different context positions produce entirely different attention outputs. Chain hashing ensures only **identical prefixes** match.

**Step 2: Global Hash Table Lookup**

vLLM maintains a global `HashMap<BlockHash, PhysicalBlock>`. When a new request arrives:

```text
New request: [System Prompt | User Chat | New Message]
1. Scheduler computes hash for each block
2. Queries global hash table one by one:
   Block_0 (0xA1B2C3) → HIT! Reference physical Block #42
   Block_1 (0xD4E5F6) → HIT! Reference physical Block #43
   ... (49 more hits)
   Block_50 (0xNEW001) → MISS. New message content, needs computation
3. Result: 50 blocks reused, only compute from Block_50 onwards
   → Prefill computation reduced by 98%!
```

**Step 3: LRU Eviction Policy**

GPU memory is finite. vLLM uses **reference counting + LRU** to manage the cache:

```text
Each physical block has two key attributes:
  - ref_count: how many active requests reference this block
  - last_access_time: timestamp of last access

Eviction rules:
  1. Blocks with ref_count > 0 are NEVER evicted (actively in use!)
  2. Blocks with ref_count = 0 enter the "candidate pool"
  3. When memory runs low, evict the block with the oldest last_access_time
  4. Remove its hash from the global table
```

### Four Key APC Use Cases

| Scenario | Reusable Prefix | Performance Gain |
|---------|----------------|-----------------|
| **Multi-turn chat** | System prompt + chat history | Later turns approach zero prefill time |
| **Document QA (RAG)** | Thousands of document tokens | Multiple queries on same doc = nearly free |
| **Code completion** | Existing file content | Incremental computation per keystroke |
| **Template batch processing** | Identical instruction prefix | 1000 same-template requests compute prefix once |

### APC Limitations

1. **Output >> Input**: Prefill is a small fraction of total latency
2. **Every request is unique**: No shared prefixes, no cache hits
3. **Minor miss overhead**: Hash computation costs CPU time (usually negligible)

> **Key config**: `--enable-prefix-caching` (default in vLLM V1).

### Getting Cache Hit Data in API Responses

vLLM can **tell you exactly how many tokens hit the cache** in each response. Just add one startup parameter:

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --enable-prefix-caching \
  --enable-prompt-tokens-details    # ← Key! Adds cached_tokens to usage
```

The `usage` field will now include `prompt_tokens_details`:

```json
{
  "usage": {
    "prompt_tokens": 3000,
    "completion_tokens": 423,
    "total_tokens": 3423,
    "prompt_tokens_details": {
      "cached_tokens": 2800
    }
  }
}
```

**What this means**: Of 3000 prompt tokens, 2800 were reused from cache, only 200 needed GPU compute. **Your cost is 6.7% of list price, but you bill the user for all 3000 tokens.**

> **Critical for billing**: Your middleware should record both `prompt_tokens` (user billing basis) and `cached_tokens` (your actual cost basis). The gap is your profit.

### Cache Hit Rate Monitoring: Prometheus Metrics

vLLM V1 uses Counter-based metrics (replacing the deprecated `gpu_prefix_cache_hit_rate` Gauge):

```text
# V1 prefix cache metrics (Counter type, precise and reliable)
vllm:prefix_cache_hits              # Cache hit tokens total (Counter)
vllm:prefix_cache_queries           # Cache query tokens total (Counter)

# PromQL for real-time hit rate (use this in Grafana)
(rate(vllm:prefix_cache_hits[5m]) / rate(vllm:prefix_cache_queries[5m])) * 100
```

**Healthy cache hit rate benchmarks**:

| Scenario | Expected Hit Rate | If Lower, Check |
|---------|-------------------|------------------|
| Multi-turn chat (same session) | 80%-95% | Dynamic content inserted in prefix |
| RAG document QA | 60%-85% | Document diversity too high, or cache pool too small |
| Template batch processing | 90%+ | Template not at the front of prompt |
| Completely random requests | <10% | Normal — APC doesn’t help here |

### Best Practices for Maximizing Cache Hits

1. **Static content first**: Place system instructions and documents at the beginning of prompts, dynamic content (user messages) after.
2. **Avoid dynamic elements in prefixes**: e.g., `"Current time is 2026-04-14 10:00"` — a time change invalidates the entire cache chain. Put timestamps at the end.
3. **Increase `--gpu-memory-utilization`**: More VRAM = larger cache pool = lower LRU eviction rate = higher hit rates.
4. **Maintain session continuity**: Let vLLM naturally accumulate cache across turns.
5. **Monitor `cached_tokens` / `prompt_tokens` ratio**: This is your "profit margin". Analyze by user/scenario to identify low-hit-rate patterns.

---

## Layer 3: OpenAI-Compatible API & Advanced Capabilities

vLLM natively provides an OpenAI-compatible API — your application code stays the same, just change the `base_url`.

### Quick Start

```bash
pip install vllm

vllm serve Qwen/Qwen2.5-72B-Instruct \
  --dtype auto \
  --api-key your-secret-key \
  --port 8000 \
  --enable-prefix-caching
```

### Supported Endpoints

| Endpoint | Path | Purpose |
|----------|------|---------|
| **Chat Completions** | `/v1/chat/completions` | Conversational AI |
| **Completions** | `/v1/completions` | Text completion |
| **Responses** | `/v1/responses` | OpenAI Responses API |
| **Embeddings** | `/v1/embeddings` | Vector embeddings |
| **Models** | `/v1/models` | List models |
| **Tokenizer** | `/tokenize` / `/detokenize` | Token encode/decode (billing helper) |
| **Transcriptions** | `/v1/audio/transcriptions` | Speech-to-text |
| **Realtime** | `/v1/realtime` | Real-time voice (WebSocket) |

### Structured Output & Guided Decoding

Online services often require **strictly formatted JSON** output. vLLM has built-in **Guided Decoding** support:

```python
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "Extract names and locations"}],
    extra_body={
        "guided_json": {
            "type": "object",
            "properties": {
                "names": {"type": "array", "items": {"type": "string"}},
                "locations": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["names", "locations"]
        }
    },
)
```

Four constraint formats: `guided_json`, `guided_regex`, `guided_choice`, `guided_grammar`. Powered by **XGrammar** (pushdown automata-based), with **<5% latency impact**.

### Multi-LoRA Serving

Serve multiple fine-tuned adapters on a single base model:

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --enable-lora \
  --max-loras 8 \
  --lora-modules customer-a=/path/to/lora-a customer-b=/path/to/lora-b
```

Uses **batched GEMM** to dynamically group sequences using different adapters. Each LoRA adapter is typically only tens of MB vs. hundreds of GB for the base model.

### Docker Production Deployment

```bash
docker run -d \
  --name vllm-server \
  --gpus all \
  --ipc=host \
  -p 8000:8000 \
  -v /path/to/models:/models \
  -e VLLM_API_KEY=your-secret-key \
  -e PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus \
  vllm/vllm-openai:latest \
  --model /models/Qwen2.5-72B-Instruct \
  --dtype auto \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --enable-prompt-tokens-details    # Expose cached_tokens for billing
```

> **⚠️ Always use `--ipc=host`**: vLLM uses PyTorch shared memory for multi-process communication. Without this flag, you'll get errors inside containers. This is the #1 beginner mistake.

---

## Layer 4: Performance Tuning

### Core Metrics for Online Services

| Metric | Full Name | Meaning | Goal |
|--------|-----------|---------|------|
| **TTFT** | Time to First Token | Time from request to first token | Lower → "responsive" |
| **ITL** | Inter-Token Latency | Gap between consecutive tokens | Lower → "smooth typing" |
| **Throughput** | tokens/s | Total tokens processed per second | Higher → lower cost per token |

**Core tension**: Higher throughput and lower latency are naturally opposed. Online services must find the sweet spot.

### Complete Tuning Guide

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \     # [1]
  --max-model-len 8192 \              # [2] THE MOST CRITICAL PARAMETER
  --max-num-seqs 256 \                # [3]
  --max-num-batched-tokens 16384 \    # [4]
  --enable-chunked-prefill \          # [5]
  --enable-prefix-caching \           # [6]
  --quantization fp8 \                # [7]
  --kv-cache-dtype fp8_e5m2 \         # [8]
  --tensor-parallel-size 2 \          # [9]
  --num-speculative-tokens 5 \        # [10]
  --speculative-model Qwen/Qwen2.5-1.5B-Instruct
```

#### [1] `--gpu-memory-utilization`

```text
0.70: 30% wasted → tiny APC cache pool → hit rate plummets
0.98: almost no buffer → OOM crash during spikes → all in-flight requests lost
0.90~0.95: sweet spot for production
```

#### [2] `--max-model-len` — THE #1 PERFORMANCE KILLER

vLLM pre-calculates KV Cache space based on this value. Many beginners use the model default (e.g., Qwen2.5's 131,072).

```text
Default 131072 → KV Cache reserves 30x more space → concurrency drops from 50 to 2
Set to actual need 8192 → KV Cache right-sized → concurrency restored

This single parameter change can be more impactful than all other optimizations combined.
```

#### [3-4] Concurrency & Token Budget

- **Online chat** (latency-first): `max-num-seqs 64-256`, `max-num-batched-tokens 8192-16384`
- **Batch processing** (throughput-first): `max-num-seqs 2048-4096`, `max-num-batched-tokens 32768`

#### [7-8] Quantization

| GPU | Recommended | Accuracy Loss | Effect |
|-----|------------|---------------|--------|
| **H100/H800** | FP8 (`--quantization fp8`) | <1% | ~1.5x throughput, zero-calibration |
| **A100/L40S** | INT8 GPTQ/AWQ | ≈0% | 2x memory reduction |
| **Blackwell B200** | NVFP4 | ≤1% | 3x throughput vs FP8 |

**KV Cache Quantization** (`--kv-cache-dtype fp8_e5m2`): Halves KV Cache memory with minimal quality impact, especially impactful for long-context (8K-128K) scenarios.

#### [9] Tensor Parallelism

```text
Common mistake: 8 GPUs → TP=8 → worse throughput than TP=4

Reason: AllReduce communication overhead can eat 40% of added compute

Correct strategy:
  1. Use minimum TP to fit the model (70B FP8 on 2x H100 → TP=2)
  2. Use extra GPUs for more replicas + load balancer
  Result: 2 instances × TP=2 often 30-50% higher throughput than 1 instance × TP=4
```

> **Advanced**: Check GPU topology with `nvidia-smi topo -m`. TP GPUs should be NVLink-connected, not PCIe-bridged (5-10x latency difference).

#### [10] Speculative Decoding

```text
Low concurrency (<10 QPS): 2-5x latency improvement
High concurrency (>100 QPS): diminishing returns (GPU already saturated)

Best for: real-time chat, internal tools, latency-sensitive Agent calls
Not for: high-concurrency API services
```

---

## Layer 5: Disaggregated Serving — Architecture for Scale

At **hundreds to thousands of QPS**, Prefill and Decode interfere with each other:

```text
                    ┌──────────────────┐
                    │   Request Router  │
                    └──────┬───────────┘
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌──────────────────┐     ┌──────────────────┐
    │  Prefill Cluster  │     │  Decode Cluster   │
    │  (Compute GPUs)   │     │  (Bandwidth GPUs) │
    │  H100 SXM / B200  │     │  L40S / A100      │
    └────────┬─────────┘     └────────▲─────────┘
             └────── KV Cache Transfer ───┘
                   (NIXL / RDMA)
```

**Core advantages**: Independent scaling, hardware heterogeneity (cost savings), eliminated cross-phase interference.

---

## Layer 6: Token Billing — The Business Lifeline

### Usage Data

vLLM returns `usage` in every response. With `--enable-prompt-tokens-details`, it also includes cache hit details:

```json
{
  "usage": {
    "prompt_tokens": 3000,
    "completion_tokens": 423,
    "total_tokens": 3423,
    "prompt_tokens_details": {
      "cached_tokens": 2800
    }
  }
}
```

### Billing Architecture

```text
User → [API Gateway (auth/rate-limit)] → [vLLM Engine]
                  ↓                              ↓
         [Billing Middleware] ←──── Extract usage from response
                  ↓
         Billing DB (user_id, org_id, prompt_tokens, completion_tokens, timestamp)
```

### Prometheus Metrics

```text
# Token metering
vllm:prompt_tokens_total / vllm:generation_tokens_total

# Cache efficiency (V1, replaces deprecated gpu_prefix_cache_hit_rate)
vllm:prefix_cache_hits / vllm:prefix_cache_queries
# PromQL: (rate(vllm:prefix_cache_hits[5m]) / rate(vllm:prefix_cache_queries[5m])) * 100

# Latency
vllm:time_to_first_token_seconds / vllm:inter_token_latency_seconds

# Saturation
vllm:gpu_cache_usage_perc / vllm:num_requests_waiting / vllm:num_preemptions_total
```

> **⚠️ Must set** `PROMETHEUS_MULTIPROC_DIR` env var for correct multi-process metric collection.

### Five Token Billing Pitfalls

**Pitfall 1: Should cached prefix tokens be billed?**

```text
Your actual compute cost:
  Total prompt = 3000 tokens
  APC prefix hit = 2800 tokens (cost ≈ 0)
  Actually computed = 200 tokens

User pays: Full 3000 prompt_tokens (industry convention)
Your profit = User payment for 3000 tokens - Your GPU cost for 200 tokens
Prefix caching is your profit engine.
```

**Pitfall 2: Streaming usage only in last chunk.** Extract `usage` from the chunk where `finish_reason != null`.

**Pitfall 3: Speculative decoding waste tokens.** vLLM's `completion_tokens` automatically excludes rejected draft tokens.

**Pitfall 4: `/tokenize` endpoint mismatches.** Chat Template special tokens (`<|im_start|>`) are included. Ensure your billing tokenizer matches vLLM's exactly.

**Pitfall 5: Multimodal token counting.** Images encode as hundreds-to-thousands of visual tokens reflected in `prompt_tokens`. Consider separate pricing.

---

## Cost Analysis: Build vs Buy

```text
Qwen2.5-72B (FP8) on 2x H100:
  GPU cost: ~$7/hour = $168/day
  Throughput: ~4,000 tokens/s = ~345M tokens/day

vs. OpenAI GPT-4o ($2.50/M input + $10/M output):
  Same volume: ~$1,500/day

Self-hosted: $168/day vs API: $1,500/day → ~9x cheaper

Rule of thumb:
  < 10M tokens/day → Buy API (simpler)
  10M-100M tokens/day → Evaluate based on team capability
  > 100M tokens/day → Self-host (cost advantage is overwhelming)
```

---

## Production Checklist

### I. GPU & Compute

| Item | Recommended | Notes |
|------|------------|-------|
| GPU | H100 SXM 80GB / A100 80GB | H100 supports FP8 zero-calibration |
| Interconnect | NVLink 4.0 / NVSwitch | TP GPUs must be NVLink (not PCIe) |
| CPU | ≥ (2 + N) physical cores (N=GPU count) | Engine Core is CPU-sensitive |
| RAM | ≥ model file size × 2 | For model loading |

### II. Storage & Model Loading

| Item | Recommended | Notes |
|------|------------|-------|
| Model storage | Local NVMe SSD / fast NFS | Cold start from HuggingFace is too slow |
| K8s | PersistentVolume + InitContainer | Pre-download via Job |

### III. Network & Security

| Item | Recommended | Notes |
|------|------------|-------|
| Multi-node | InfiniBand RDMA / RoCE | Required for disaggregated inference |
| External | Reverse proxy (Nginx/Kong) | vLLM’s `--api-key` isn’t production security |
| Isolation | Private VPC | vLLM inter-node comms are unencrypted by default |

### IV. vLLM Engine Params

```bash
vllm serve /models/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \                    # ⚠️ MOST CRITICAL
  --enable-chunked-prefill \
  --enable-prefix-caching \
  --enable-prompt-tokens-details \          # Expose cached_tokens
  --max-num-seqs 256 \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \
  --tensor-parallel-size 2
```

### V. Monitoring

| Component | Recommended | Key Panels |
|-----------|------------|------------|
| Metrics | Prometheus | Cache hit rate, KV Cache %, queue depth |
| Dashboards | Grafana | 6 panels: cache hits, throughput, latency, queue, preemptions, TTFT P99 |
| Logging | ELK / Loki | Request-level traces |
| Tracing | OpenTelemetry | End-to-end latency |

### VI. Billing & Business

| Component | Recommended | Notes |
|-----------|------------|-------|
| Gateway | Kong / Nginx / Traefik | Auth, rate limiting, routing |
| Billing middleware | Custom Python/Go | Extract `usage` + `cached_tokens` |
| Database | TimescaleDB / ClickHouse | Time-series billing records |

### VII. High Availability

| Item | Recommended | Notes |
|------|------------|-------|
| Load balancer | Nginx / Traefik / K8s Service | Multi-replica traffic |
| Health checks | Active inference probes | Don’t just check process liveness |
| Orchestration | Kubernetes + KEDA | Autoscale on queue depth |
| Rolling updates | Start new before stopping old | Model loading takes 30s+ |

---

## Summary

**Key action items:**

1. **Get running first, tune later**: Start with a simple `vllm serve`, validate business logic, then optimize.
2. **`max-model-len` is priority #1**: This single parameter may outweigh all other optimizations combined.
3. **Monitor first**: Set up Prometheus + Grafana. `gpu_cache_usage_perc` is the single most important metric.
4. **Cache hit rate = profit margin**: Track APC hits, optimize prompt structure to front-load static content.
5. **Bill at the gateway**: Don't modify vLLM source code. Intercept `usage` at the gateway layer.

Stay updated via [official docs](https://docs.vllm.ai/) and [GitHub Releases](https://github.com/vllm-project/vllm/releases).
