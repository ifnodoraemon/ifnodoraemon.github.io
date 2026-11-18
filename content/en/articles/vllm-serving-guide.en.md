---
title: "vLLM Online Inference: Architecture, Tuning, and Billing"
slug: vllm-serving-guide
date: 2026-04-14
tag: Serving & Deployment
tagClass: tag-cyan
category: Inference Systems
description: "How to serve online with vLLM: PagedAttention, continuous batching, prefix caching, an OpenAI-compatible API, tuning, token billing, and Docker monitoring."
featured: true
featuredStats:
  - label: Core Tech
    value: 6+
  - label: Tuning Params
    value: 10+
  - label: Deploy Plans
    value: 3
updated: 2026-10-20
---

> [!NOTE] Executive Summary (TL;DR)
> - **Production Parameter Tuning**: Deep dive into tuning `gpu-memory-utilization`, `max-model-len`, and concurrency parameters without risking Out-of-Memory (OOM) failures.
> - **Prometheus Metric Standards**: Monitor official `vllm:` prefixed metrics including `vllm:kv_cache_usage_perc` to drive automated Kubernetes Horizontal Pod Autoscaling (HPA).
> - **Throughput Multipliers**: Combine serving tuning with [Speculative Decoding using EAGLE](/en/articles/speculative-decoding-eagle-guide/) and [Quantization Precision Tradeoffs](/en/articles/quantization-precision-guide/).

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

**Core scheduling policy**: vLLM V1 engine (v0.29.0) prioritizes **active decode requests** first, then uses remaining budget for new prefill chunks. Users B and C barely notice User A's massive input.

> **Must-enable for online services**: `--enable-chunked-prefill`.

---

## Layer 2 Deep Dive: APC Prefix Caching — Understanding It Pays Off
> [!TIP]
> **VRAM Sizing & Throughput Estimator**: Unsure about GPU OOM before launching production servers? Use our interactive [LLM VRAM & Throughput Calculator](/en/tools/) to estimate weights, cache sizes, and optimal `gpu_memory_utilization` parameters.


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

| Scenario | Reusable prefix | Required condition |
|----------|-----------------|--------------------|
| Multi-turn chat | System instructions and unchanged history | Prefix remains cached |
| Document QA | Repeated document tokens | Identical token ordering |
| Code completion | Unchanged file beginning | Sufficient shared prefix before edits |
| Template batches | Shared instruction prefix | Completed KV blocks remain resident |

### APC Limitations

1. **Output >> Input**: Prefill is a small fraction of total latency
2. **Every request is unique**: No shared prefixes, no cache hits
3. **Minor miss overhead**: Hash computation costs CPU time (usually negligible)

> **Key config**: `--enable-prefix-caching` (default in vLLM V1 engine / v0.29.0).

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

Of the 3000 input tokens, 2800 can reuse prefix KV, leaving 6.7% uncached input. This is not a total-cost ratio: decoding, cache reads, memory residency, idle capacity, and operations still incur costs.

> Record input tokens, cached tokens, output tokens, and latency separately; apply the pricing terms disclosed to customers.

### Cache Hit Rate Monitoring: Prometheus Metrics

vLLM V1 engine (v0.29.0) uses Counter-based metrics (replacing the deprecated `gpu_prefix_cache_hit_rate` Gauge):

```text
# V1 prefix cache metrics (Counter type, precise and reliable)
vllm:prefix_cache_hits_total              # Cache hit tokens total (Counter)
vllm:prefix_cache_queries_total           # Cache query tokens total (Counter)

# PromQL for real-time hit rate (use this in Grafana)
(rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m])) * 100
```

There is no universal healthy cache-hit threshold. Establish cold/warm baselines for each workload and combine hits with TTFT, output speed, eviction, routing, and tenant isolation.

### Best Practices for Maximizing Cache Hits

1. **Static content first**: Place system instructions and documents at the beginning of prompts, dynamic content (user messages) after.
2. **Avoid dynamic elements in prefixes**: e.g., `"Current time is 2026-04-14 10:00"` — a time change invalidates the entire cache chain. Put timestamps at the end.
3. **Increase `--gpu-memory-utilization`**: More VRAM = larger cache pool = lower LRU eviction rate = higher hit rates.
4. **Maintain session continuity**: Let vLLM naturally accumulate cache across turns.
5. **Track hits by workload**: Compare cached and input token counts alongside GPU time and total cost; cache-hit rate is not profit margin.

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

Online services often require **strictly formatted JSON** output (such as function-call arguments or typed API payloads). vLLM has built-in **Guided Decoding** support:

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="key")

response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "Extract names and locations"}],
    # vLLM extension: enforce output conforming to JSON Schema
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

vLLM supports four constraint formats:

| Parameter | Constraint Type | Example |
|------|---------|------|
| `guided_json` | JSON Schema | `{"type": "object", ...}` |
| `guided_regex` | Regular Expression | `"\\d{4}-\\d{2}-\\d{2}"` |
| `guided_choice` | Enumerated Choices | `["positive", "negative", "neutral"]` |
| `guided_grammar` | EBNF Grammar | Custom context-free grammar |

Under the hood, vLLM uses the **XGrammar** engine (pushdown automata-based), compiling and caching grammar masks with **< 5%** output latency overhead.

### Tool Calling

vLLM natively supports OpenAI-compatible function calling paired with guided decoding to guarantee valid argument schemas:

```python
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "What will the weather in Beijing be tomorrow?"}],
    tools=[{
        "type": "function",
        "function": {
            "name": "get_weather",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "date": {"type": "string"}
                },
                "required": ["city", "date"]
            }
        }
    }],
)
```

> **Tip**: Set `parallel_tool_calls=false` to force 0–1 tool calls per turn for models not trained on parallel tool invocations.

### Multi-LoRA Serving: One Base Model for Multiple Tenants

In commercial multi-tenant deployments, dedicating separate full-model instances per fine-tuned customer checkpoint wastes massive VRAM. vLLM dynamically loads **multiple LoRA adapters atop a single shared base model**:

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --enable-lora \
  --max-loras 8 \
  --lora-modules customer-a=/path/to/lora-a \
                  customer-b=/path/to/lora-b
```

```python
# Route each tenant to its dedicated LoRA adapter via the model field
response = client.chat.completions.create(
    model="customer-a",
    messages=[{"role": "user", "content": "Draft a follow-up email"}],
)
```

Under the hood, vLLM uses **batched GEMM** kernels to group sequences targeting different LoRA adapters within the same continuous batch at minimal overhead. Each LoRA adapter typically consumes tens of MBs compared to over 100 GB for the base model.

### Docker Production Deployment

```bash
docker run -d \
  --name vllm-server \
  --gpus all \
  --ipc=host \
  -p 8000:8000 \
  -v /path/to/models:/models \
  -e VLLM_API_KEY=your-secret-key \
  vllm/vllm-openai:v0.29.0 \
  --model /models/Qwen2.5-72B-Instruct \
  --dtype auto \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --enable-prompt-tokens-details    # Expose cached_tokens for billing
```

> Multi-process tensor-parallel communication requires adequate shared memory: you can either pass `--ipc=host` or keep an isolated IPC namespace with an explicit `--shm-size` (or a memory-backed `/dev/shm` `emptyDir` in Kubernetes), depending on your container security boundaries.

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
# Complete production startup configuration
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \
  --max-num-seqs 256 \
  --max-num-batched-tokens 16384 \
  --enable-chunked-prefill \
  --enable-prefix-caching \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \
  --tensor-parallel-size 2 \
  --speculative-config '{"method":"draft_model","model":"Qwen/Qwen2.5-1.5B-Instruct","num_speculative_tokens":5}'
```

#### [1] `--gpu-memory-utilization`: Total Executor Budget

A value of 0.90 budgets a fraction of total VRAM for weights, activations, graph capture, other runtime overhead, and remaining KV storage. The vLLM 0.29 argument documentation lists 0.92 as the default; check other versions separately. Too little may prevent model loading; too much may conflict with additional allocations. There is no universal sweet spot.

#### [2] `--max-model-len`: Total Input and Output Limit

This constrains request length and participates in KV-capacity checks and some runtime planning. The KV pool is primarily sized from memory budget and startup profiling, rather than reserving a full maximum window per request. Changing 131072 to 8192 does not imply a sixteenfold pool reduction or a fixed concurrency gain. Set business length limits and verify startup logs and long-request measurements.

#### [3] `--max-num-seqs`: Maximum Concurrent Sequences

Controls the maximum number of active sequences scheduled per iteration:

```text
Online chat (latency-first): 64 ~ 256
  → Preserves per-request compute budget for low ITL

Offline / batch inference (throughput-first): 2048 ~ 4096
  → Saturates GPU compute, trading higher per-request latency for throughput

Adaptive tuning via vllm:num_requests_waiting:
  → Sustained > 0: requests are queueing; raise max-num-seqs or scale out replicas
  → Sustained = 0 with low GPU utilization: workload is light; lower cap to bound tail spikes
```

#### [4] `--max-num-batched-tokens`: Per-Iteration Token Budget

Governs the chunked-prefill token budget processed in a single scheduler step:

- Larger (`32768`) → higher prefill throughput, but long prompts occupy longer steps
- Smaller (`8192`) → smoother ITL, splitting long prefills into finer chunks
- Recommended online range: `8192 ~ 16384`

#### [5] `--enable-chunked-prefill`: Chunked Prefill Toggle

Splits long incoming prompts across multiple scheduler iterations bounded by `--max-num-batched-tokens` alongside active decode steps (enabled by default in the vLLM V1 engine; declaring it explicitly prevents configuration drift across upgrades).

#### [6] `--enable-prefix-caching`: Automatic Prefix Caching (APC) Toggle

Enables global chained-hash KV block reuse across shared system prompts, multi-turn histories, and repeated RAG documents (enabled by default in vLLM V1). Pair with `--enable-prompt-tokens-details` so billing middleware can inspect `cached_tokens`.

#### [7-8] `--quantization` & `--kv-cache-dtype`: Validate Weight and KV Quantization Separately

FP8, AWQ, GPTQ, and NVFP4 require compatible hardware, checkpoint layouts, and kernels. GPU names alone cannot guarantee a fixed accuracy loss or twofold throughput. Weight-only quantization can reduce traffic, while dequantization and compute overhead may offset gains at large batch sizes.

`--kv-cache-dtype fp8_e5m2` is one optional cache-format example. It halves numerical storage width relative to BF16/FP16, but scales, cache layouts, and runtime overhead remain. Concurrency does not necessarily double. Verify backend support, scaling, long-context behavior, and task quality. See [quantization precision](/en/articles/quantization-precision-guide/).

#### [9] Tensor Parallelism and Replicas

TP partitions model computation across GPUs and introduces communication. Smaller TP with more replicas may improve throughput; larger TP may reduce single-request latency. Compare at equal GPU count, precision, lengths, and SLO. Fitting the weights is a starting constraint, not a guarantee of a 30–50% gain.

Inspect `nvidia-smi topo -m`. NVLink/NVSwitch, PCIe, and inter-node fabrics have different bandwidth and latency; validate topology and parallel layout together.

#### [10] Speculative Decoding

A draft model or auxiliary head proposes candidates that the target model verifies and accepts or corrects. Benefits depend on acceptance rate, draft cost, batch size, model, and backend; QPS alone does not define a fixed speedup range.

vLLM 0.29 uses JSON configuration, for example:

```bash
--speculative-config '{"method":"draft_model","model":"Qwen/Qwen2.5-1.5B-Instruct","num_speculative_tokens":5}'
```

Add this fragment to a serving command only after checking target/draft tokenizer, architecture, and backend compatibility. It is not a recipe for every target model. Measure ordinary decoding first, then compare latency and throughput under the same SLO.

## Layer 5: Disaggregated Serving — Architecture for Scale

At **hundreds to thousands of QPS**, compute-bound Prefill and memory-bandwidth-bound Decode interfere with each other when co-located on the same GPU:

```text
Prefill: Compute-bound, demands high Tensor Core FLOPs
Decode:  Memory-bandwidth-bound, demands high HBM bandwidth

Co-locating both phases on the same GPU → suboptimal hardware utilization & tail-latency interference
```

vLLM supports **Disaggregated Prefill-Decode Serving**:

```text
                    ┌──────────────────┐
                    │   Request Router  │
                    │  (Service Proxy)  │
                    └──────┬───────────┘
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌──────────────────┐     ┌──────────────────┐
    │  Prefill Cluster  │     │  Decode Cluster   │
    │  (Compute GPUs)   │     │  (Bandwidth GPUs) │
    │  H100 SXM / B200  │     │  L40S / A100      │
    └────────┬─────────┘     └────────▲─────────┘
             │                        │
             └────── KV Cache Transfer ───┘
                   (NIXL / RDMA)
```

**KV Cache Transfer**: Once prefill finishes, the resulting KV blocks stream across the network to Decode instances via NVIDIA **NIXL** (Inference Xfer Library) over GPUDirect RDMA within a few milliseconds.

**Core advantages**:
1. **Independent autoscaling**: Scale Prefill and Decode pools separately according to input/output traffic mix.
2. **Hardware heterogeneity**: Match compute-dense GPUs (H100/B200) to Prefill and cost-effective bandwidth GPUs to Decode.
3. **Zero cross-phase interference**: Long-prompt prefills never stall active decode streams.

> This disaggregated topology is standard across hyperscale LLM serving platforms (such as Anyscale, AWS, and ByteDance).

---

## Layer 6: Token Billing & Metering — The Business Lifeline

If you operate an OpenAI-compatible commercial API, accurate token metering is the backbone of your billing ledger.

### Usage Data Returned by vLLM

vLLM returns `usage` in every response. With `--enable-prompt-tokens-details`, it also exposes prefix-cache hit counts:

```json
{
  "id": "chatcmpl-abc123",
  "choices": [{ "message": { "content": "..." } }],
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

Core challenge: **vLLM knows how many tokens were consumed, not which tenant consumed them.** Place an authentication and metering proxy ahead of vLLM:

```text
User → [API Gateway] → [vLLM Engine]
             ↓                ↓
      Auth / Rate Limit   Generate response + usage
             ↓                ↓
      [Billing Middleware] ←── Extract usage
             ↓
      Write to Time-Series Billing DB
      (user_id, org_id, prompt_tokens, completion_tokens, model, timestamp)
```

**Recommended Three-Tier Stack:**

| Tier | Technology Choices | Responsibility |
|------|---------|------|
| **API Gateway** | Nginx / Kong / Traefik | API key auth, rate limiting, routing, multi-instance load balancing |
| **Billing Middleware** | Custom Python/Go microservice | Intercept responses, extract `usage` + `cached_tokens`, attribute to tenant, persist records |
| **Billing Platform** | Stripe Billing / Lago / Custom | Invoicing, quota enforcement, usage dashboards, webhook alerts |

### Prometheus Metrics (`http://localhost:8000/metrics`)

```text
# ─── Token Metering ───
vllm:prompt_tokens_total            # Cumulative prompt tokens (Counter)
vllm:generation_tokens_total        # Cumulative generated tokens (Counter)
vllm:request_prompt_tokens          # Per-request prompt token distribution (Histogram)
vllm:request_generation_tokens      # Per-request output token distribution (Histogram)

# ─── Prefix Cache Efficiency ─── (V1 counters replacing deprecated gpu_prefix_cache_hit_rate)
vllm:prefix_cache_hits_total        # Cached tokens hit (Counter)
vllm:prefix_cache_queries_total     # Cached tokens queried (Counter)
vllm:prompt_tokens_cached_total     # Total cached prompt tokens

# ─── Latency ───
vllm:time_to_first_token_seconds    # TTFT distribution (Histogram)
vllm:inter_token_latency_seconds    # ITL distribution (Histogram)
vllm:e2e_request_latency_seconds    # End-to-end request latency (Histogram)

# ─── Saturation & Preemption ───
vllm:kv_cache_usage_perc            # KV Cache block utilization (0~1; near 1 signals block pressure, not total GPU VRAM %)
vllm:num_requests_running           # Active running sequences
vllm:num_requests_waiting           # Queued waiting requests
vllm:num_preemptions_total          # Cumulative KV preemptions (frequent > 0 signals KV block exhaustion)
```

> The standard vLLM server initializes multiprocess metric storage automatically; custom process launchers must manage `PROMETHEUS_MULTIPROC_DIR` lifecycle for the installed version to avoid stale process files.

**Recommended Grafana Panels**:

| Panel | PromQL | Alert Reference | Operational Meaning |
|------|--------|---------|------|
| **🔥 Prefix Cache Hit Rate** | `rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m]) * 100` | <50% for 10m (workload-dependent) | Reduced prefix reuse efficiency |
| Token Throughput | `rate(vllm:generation_tokens_total[5m])` | Drop >50% | Potential engine stall or upstream drop |
| KV Cache Usage | `vllm:kv_cache_usage_perc` | >0.95 | High KV block pressure; evaluate alongside queueing & preemptions |
| Waiting Queue Depth | `vllm:num_requests_waiting` | >100 for 1m | Scale out replicas |
| P99 TTFT | `histogram_quantile(0.99, rate(vllm:time_to_first_token_seconds_bucket[5m]))` | >3s | User-perceived responsiveness degradation |
| Preemption Rate | `rate(vllm:num_preemptions_total[5m])` | Sustained >0 | KV block pool exhausted under load |

### Five Token Billing Pitfalls

**Pitfall 1: Treating cache hits as pure profit**

A request with 3000 input tokens and 2800 cache hits has 200 uncached input tokens. Prefix hits avoid redundant prefill FLOPs, but still incur decode steps, KV-memory reads, residency, and fixed cluster costs. Whether cached tokens receive discounted billing is defined by your customer contract—there is no universal industry rule. Evaluate savings using measured GPU time, latency, and total machine cost under identical traffic.

**Pitfall 2: Streaming usage needs explicit handling**

Enable `stream_options={"include_usage": True}` in streaming requests. Before stream termination, vLLM emits an extra summary chunk carrying cumulative `usage` whose `choices` list may be empty. Do not gate metering on `finish_reason`; inspect `chunk.usage` directly, and log prematurely disconnected streams separately:

```python
# ❌ Wrong: reading usage from the first chunk or gating only on finish_reason
# ✅ Right: inspect chunk.usage across the stream
async for chunk in response:
    if chunk.usage is not None:
        final_usage = chunk.usage  # Only the final summary chunk carries complete usage
```

**Pitfall 3: Speculative decoding rejected draft tokens**

During speculative decoding, draft candidates rejected by the target model consume GPU compute but never appear in the final output. vLLM's `usage.completion_tokens` **automatically excludes rejected draft tokens**, so no manual deduction is required.

**Pitfall 4: `/tokenize` endpoint special-token mismatches**

vLLM's `/tokenize` endpoint counts Chat Template control tokens (such as `<|im_start|>` and `<|im_end|>`). Ensure your external billing pre-estimator uses the exact same tokenizer and chat template as vLLM to prevent invoice discrepancies.

**Pitfall 5: Multimodal visual token accounting**

For vision-language models (such as Qwen-VL), each image encodes into hundreds or thousands of visual tokens included inside `prompt_tokens`. Factor multimodal token expansion into your pricing tiers explicitly.

---

## Layer 7: Cost Analysis — Build vs. Buy

First verify both options meet the same acceptance criteria. Equal token volume from models with different capabilities is not an equivalent service.

```text
Daily API cost = input volume × input rate + output volume × output rate
               + cache write/read/storage + tools and platform fees
Daily self-hosted cost = GPU/machine rent or depreciation + operations
                      + network/storage + redundancy + evaluation/updates
```

Keep rates consistently per token or per million tokens. Use measured SLO-compliant throughput, actual utilization, and peak traffic to check capacity. An unsupported 4000 tokens/s figure or a universal 100M-token self-hosting threshold is not a valid decision rule. Include model-quality differences, cold starts, and failure reserves. See the [distributed deployment guide](/en/articles/deepseek-v4-kimi-k3-deployment-guide/).

## Production Checklist

### I. GPU & Compute

| Item | Recommended | Notes |
|------|------------|-------|
| GPU | H100 SXM 80GB / A100 80GB | Validate cost-efficiency against model, precision, SLO, and pricing |
| Interconnect | NVLink 4.0 / NVSwitch | Verify TP interconnect topology and measured bandwidth |
| CPU | ≥ (2 + N) physical cores (N=GPU count) | Engine Core is CPU-sensitive; starvation inflates scheduling latency |
| RAM | ≥ model file size × 2 | Host memory staging during checkpoint loading |

```text
✅ Inspect GPU topology: nvidia-smi topo -m (verify TP ranks share direct NVLink paths)
✅ Configure NVIDIA Container Toolkit (Docker GPU passthrough)
✅ Multi-node NCCL tuning: set NCCL_IB_HCA=mlx5 on InfiniBand/RoCE hosts
```

### II. Storage & Model Loading

| Item | Recommended | Notes |
|------|------------|-------|
| Model storage | Local NVMe SSD / high-throughput NFS | Cold-pulling 70B+ checkpoints from HuggingFace takes >10 min |
| Model versioning | Pre-staged versioned directories | `/models/v1/`, `/models/v2/` for canary rollouts |
| Kubernetes | PersistentVolume + InitContainer | Pre-populate PV via Job to avoid concurrent pod download storms |

```text
✅ Mount pre-downloaded checkpoints into containers (-v /path/to/models:/models)
✅ Verify SHA256 checksums on weight shards to prevent silent corruption
```

### III. Network & Security

| Item | Recommended | Notes |
|------|------------|-------|
| Multi-node fabric | InfiniBand RDMA / RoCEv2 | Low-latency transport required for disaggregated KV transfer |
| External ingress | Reverse proxy (Nginx/Kong/Traefik) | Built-in `--api-key` is basic auth only, not full gateway security |
| Isolation | Private VPC / dedicated subnet | Inter-node vLLM traffic is unencrypted by default |
| `VLLM_HOST_IP` | Bind to private interface IP | Avoid exposing internal RPC sockets on public interfaces |

```text
✅ Provision sufficient shared memory in Docker (--ipc=host or explicit --shm-size)
✅ Terminate TLS, authentication, and rate limiting at the reverse proxy
✅ Set VLLM_HOST_IP to the private network interface address
```

### IV. vLLM Engine Parameters

```bash
vllm serve /models/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \
  --enable-chunked-prefill \
  --enable-prefix-caching \
  --enable-prompt-tokens-details \
  --max-num-seqs 256 \
  --max-num-batched-tokens 16384 \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \
  --tensor-parallel-size 2                  # Minimal TP + multi-replica DP
```

```text
✅ Set --max-model-len according to business SLA bounds and verify startup KV profiling logs (lowering it does not guarantee a fixed 10x concurrency jump)
✅ Multi-GPU serving: minimal TP size + multiple replicas behind a load balancer
✅ Enable speculative decoding selectively for low-latency regimes after SLO benchmarking
✅ Enable Multi-LoRA for multi-tenant fine-tuned adapters
✅ Configure XGrammar guided decoding where strict schema compliance is required
```

### V. Monitoring & Observability

| Component | Recommended | Notes |
|-----------|------------|-------|
| Metrics | Prometheus | Scrape vLLM `/metrics` endpoint |
| Dashboards | Grafana | Operational panels + alert rules |
| Logging | ELK / Loki | Request-level structured trace logs |
| Tracing | OpenTelemetry | End-to-end latency breakdown (Gateway → vLLM → Response) |

```text
✅ Verify multiprocess metric directory lifecycle across restarts
✅ Track the 6 essential Grafana panels:
   - Prefix cache hit rate: rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m])
   - KV Cache usage: vllm:kv_cache_usage_perc (>0.95 alert)
   - Token throughput: rate(vllm:generation_tokens_total[5m])
   - Waiting queue depth: vllm:num_requests_waiting (>100 alert)
   - P99 TTFT: histogram_quantile(0.99, ...) (>3s alert)
   - Preemptions: rate(vllm:num_preemptions_total[5m]) (>0 alert)
```

### VI. Billing & Business

| Component | Recommended | Notes |
|-----------|------------|-------|
| API Gateway | Kong / Nginx / Traefik | API key validation, rate limiting, routing |
| Billing middleware | Custom Python/Go microservice | Intercept `usage` + `cached_tokens` |
| Billing platform | Stripe / Lago / Custom | Invoicing and quota management |
| Database | TimescaleDB / ClickHouse | Time-series usage ledger |

```text
✅ Persist both prompt_tokens and cached_tokens in billing middleware
   → prompt_tokens = contractual customer metering basis
   → cached_tokens = infrastructure cache-efficiency telemetry
   → Combine with GPU-hours and fixed TCO to evaluate true margin
✅ Inspect chunk.usage on the final summary chunk for streaming responses
✅ Keep billing tokenizer and chat template strictly identical to vLLM
```

### VII. High Availability

| Item | Recommended | Notes |
|------|------------|-------|
| Load balancer | Nginx / Traefik / K8s Service | Multi-replica traffic distribution (prefix-aware where applicable) |
| Health checks | Active inference probes | Do not rely solely on TCP/process liveness |
| Orchestration | Kubernetes + KEDA | Autoscale on `vllm:num_requests_waiting` queue depth |
| Rolling updates | Surge new pods before draining old | Checkpoint loading takes tens of seconds to several minutes |

```text
✅ Kubernetes: mount emptyDir with medium: Memory at /dev/shm (isolated alternative to --ipc=host)
✅ Liveness probe: check process responsiveness
✅ Readiness probe: send a lightweight inference request to confirm engine warmup completion
✅ Maintain local pre-staged model caches with explicit version directories
```

---

## Summary

```text
                         ┌─────────────────────┐
                         │   API Gateway Tier   │
                         │ Auth / Limit / Route │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  vLLM Serving Engine │
                         │                     │
                         │  PagedAttention      │ ← Validate gains & limits per workload
                         │  Continuous Batching │ ← Validate gains & limits per workload
                         │  Chunked Prefill     │ ← Validate gains & limits per workload
                         │  APC Prefix Caching  │ ← Validate gains & limits per workload
                         │  FP8 Quantization    │ ← Validate gains & limits per workload
                         │  KV Cache FP8        │ ← Validate gains & limits per workload
                         │  Speculative Decode  │ ← Validate gains & limits per workload
                         │  Multi-LoRA          │ ← One base model for multi-tenant serving
                         │  Guided Decoding     │ ← Validate gains & limits per workload
                         │                     │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
           │ Prometheus     │ │ Billing    │ │ Application  │
           │ + Grafana      │ │ Middleware │ │ (OpenAI SDK) │
           └───────────────┘ └────────────┘ └──────────────┘
```

**Key action items:**

1. **Get running first, tune systematically**: Start with a clean `vllm serve` baseline, verify business behavior, then layer quantization and concurrency tuning.
2. **Size context and concurrency budgets from business SLAs**: Combine `--max-model-len` limits with startup KV profiling logs and long-context stress tests to pinpoint true bottlenecks.
3. **Monitor first**: Stand up Prometheus + Grafana before tuning. Evaluate `vllm:kv_cache_usage_perc` alongside TTFT, queue depth (`vllm:num_requests_waiting`), and preemptions (`vllm:num_preemptions_total`).
4. **Measure cache savings empirically**: Track `cached_tokens` together with GPU time and total serving cost, optimizing static prefix layout and affinity routing.
5. **Bill at the gateway**: Keep vLLM unmodified and intercept `usage` cleanly at the gateway middleware layer.

Stay updated via [official docs](https://docs.vllm.ai/) and [GitHub Releases](https://github.com/vllm-project/vllm/releases).

---

## Frequently Asked Questions (FAQ)

### Q1: How to troubleshoot CUDA out of memory (OOM) when launching vLLM?
Use startup logs to distinguish weight loading, activation/graph capture, and KV allocation failures. A value of 0.90 is an example total executor budget, not a version-independent default or a KV-only reservation. Length, batch, and concurrency affect peaks; lowering `max-model-len` does not necessarily shrink the KV pool proportionally. Reduce load or use a validated quantization path when needed.

### Q2: When should I choose Tensor Parallelism vs Pipeline Parallelism?
On a single machine with multiple GPUs connected via NVLink (such as 4x or 8x A100/H100), Tensor Parallelism (`--tensor-parallel-size`) is preferred because NVLink communication latency is negligible. For multi-node distributed setups, the best practice is multi-instance Data Parallelism with a lightweight load balancer, which prevents inter-node network synchronization bottlenecks.

### Q3: What makes vLLM superior to Ollama or TGI for production serving?
vLLM provides continuous batching, prefix caching, and OpenAI-compatible serving interfaces. Throughput relative to other engines depends on the model, precision, hardware, and workload; there is no universal 3–5x advantage or complete compatibility with every OpenAI product feature.

Metric examples target the vLLM 0.29 Prometheus export format; Counter samples use the `_total` suffix. Verify the actual `/metrics` endpoint before deployment. Preserve the `le` label when aggregating histogram buckets. See [vLLM 0.29 engine arguments](https://docs.vllm.ai/en/v0.29.0/configuration/engine_args/) and [metric design](https://docs.vllm.ai/en/v0.29.0/design/metrics/).
