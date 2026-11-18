---
title: "LLM Quantization: FP32 to FP8, INT4, and NF4"
slug: quantization-precision-guide
date: 2026-03-31
tag: Quantization Precision
tagClass: tag-cyan
category: Inference Systems
series: llm-inference
seriesOrder: 10
description: "How FP8, INT8, INT4, and NF4 apply to weights, activations, or the KV cache, and which measurements separate memory use, speed, and output quality in practice."
featured: true
featuredStats:
  - label: Precision Formats
    value: 4
  - label: Quantization Methods
    value: 3
  - label: Data Dimensions
    value: 4
updated: 2026-10-20
---

> [!NOTE] Executive Summary (TL;DR)
> - **Precision Math & Memory Bounds**: Exhaustive breakdown of Weight-Only (AWQ, GPTQ) versus Weight-Activation (FP8, SmoothQuant) quantization schemes and their real HBM bandwidth savings.
> - **Hardware Realities**: 70B 4-bit weights consume ~35GB before KV Cache buffers, making 24GB-32GB single-card serving physically unfeasible; RTX 3090/4090 cards provide exactly 24GB VRAM.
> - **Hands-On Guidance**: Follow up with [Hands-On Quantization Labs](/en/articles/quantization-hands-on-guide/) and calculate memory profiles with [MLA Matrix Absorption](/en/articles/mha-gqa-mla-matrix-absorption-inference-engine/).

## Separate weights, activations, and cache

Quantization maps selected values to lower-bit representations to reduce capacity, traffic, or compute cost. It does not promise a fixed intelligence-loss percentage. See the [hands-on guide](/en/articles/quantization-hands-on-guide/).

| Label | Meaning | Benefit and condition |
| --- | --- | --- |
| W4A16 / W8A16 | Low-bit weights, higher-precision activations | Less weight traffic; speed depends on fused dequantization and workload |
| W8A8 | Eight-bit weight and activation paths | Compatible hardware and kernels can accelerate matrix multiplication |
| FP8 KV | Low-precision historical keys / values | Smaller cache; separate scales and quality validation |
| NF4 + LoRA | Quantized frozen base, higher-precision adapters | Lower training resources, not all-NF4 computation |

Even W8A8 implementations often retain higher-precision normalization, routing, accumulation, or output operations. Inspect the actual checkpoint and kernels.

### Bit-Layout Reference Across Precision Formats (FP32 → INT4 / NF4)

Understanding overflow sensitivity and quantization noise starts with how each format partitions **Sign (`S`), Exponent (`E`, governing dynamic range), and Mantissa (`M`, governing significand precision)** bits:

| Format | Total Bits | Bit Layout (`S / E / M`) | Representable Range / Quantization Grid | Primary Engineering Role & Footprint |
| --- | --- | --- | --- | --- |
| **FP32** | 32-bit | `1S + 8E + 23M` | $\approx \pm 3.4 \times 10^{38}$ | Master training weights, AdamW optimizer states, and Tensor Core accumulators (4 Bytes/elem) |
| **BF16** | 16-bit | `1S + 8E + 7M` | $\approx \pm 3.39 \times 10^{38}$ | Matches FP32 dynamic range to resist activation overflow; modern training/serving baseline (2 Bytes/elem) |
| **FP16** | 16-bit | `1S + 5E + 10M` | Max finite normal $\pm 65,504$ | Finer mantissa precision than BF16, but narrow exponent range risks `Inf` overflow on spiky activations (2 Bytes/elem) |
| **FP8 E4M3** | 8-bit | `1S + 4E + 3M` | Max finite value $\pm 448$ (OCP `e4m3fn`) | 3-bit mantissa preserves accuracy for forward weights & activations on Hopper/Ada/Blackwell (1 Byte + scale) |
| **FP8 E5M2** | 8-bit | `1S + 5E + 2M` | Max finite normal $\pm 57,344$ | 5-bit exponent provides wider range for backward gradients or optional KV Cache storage (1 Byte + scale) |
| **INT8** | 8-bit | `8-bit integer` (0 exponent) | Signed `[-128, 127]` or unsigned `[0, 255]` | Uniform linear grid requiring per-tensor/channel/token scale $s$ (and optional zero-point $z$) |
| **INT4 / NF4** | 4-bit | `4-bit int or LUT index` | Uniform `[-8, 7]` grid (INT4) or 16-level normal-quantile LUT (NF4) | Requires groupwise scales/zero-points (e.g., `group_size=128`), yielding ~`4.15–4.5 effective bits/param` |

### Roofline Mechanics: Weight-Only (AWQ/GPTQ) vs. Weight-Activation (SmoothQuant/FP8)

Why do two quantized checkpoints behave completely differently across batch sizes? The answer lies in whether the workload is **HBM Memory-Bandwidth-Bound** or **Tensor-Core Compute-Bound** on the hardware Roofline:

1. **Weight-Only Quantization (`W4A16` / `W8A16`, e.g., AWQ, GPTQ, GGUF)**:
   * **Hardware Execution Path**: Weights reside in HBM as 4-bit/8-bit values, slashing **HBM-to-SRAM weight read traffic by ~2×–4×**. Fused kernels (such as Marlin) dequantize weights in registers/SRAM on the fly, executing the actual matrix multiplication on **FP16/BF16 Tensor Cores**.
   * **Roofline Regime**: During small-batch autoregressive **Decode** (low arithmetic intensity, strictly **HBM bandwidth-bound**), moving fewer weight bytes directly reduces step latency. At large batch sizes or during long-prompt **Prefill** (high arithmetic intensity, **compute-bound**), peak FP16 Tensor Core TFLOPS remain unchanged and dequantization instructions can erode or negate speedups.
2. **Weight-Activation Quantization (`W8A8` INT8 SmoothQuant / FP8)**:
   * **Hardware Execution Path**: Both weights and activations enter native **INT8 or FP8 Tensor Cores** (delivering **2× peak Tensor Core TOPS/TFLOPS** over FP16/BF16 on Hopper/Ada/Blackwell). **SmoothQuant** migrates severe activation-channel outliers into weights via an equivalent diagonal scaling $\mathbf{Y} = (\mathbf{X}\operatorname{diag}(\mathbf{s})^{-1}) \cdot (\operatorname{diag}(\mathbf{s})\mathbf{W})$ so static INT8 grids do not clip spikes; **FP8 (`E4M3`)** uses floating-point exponents paired with per-tensor, per-channel, or blockwise (`1×128`, `128×128`) scales.
   * **Roofline Regime**: Simultaneously halves HBM weight traffic **and** doubles the compute-bound Tensor Core ceiling, making it the preferred path for **high-concurrency serving and compute-heavy Prefill**.

## 1. INT8, FP8, and BitsAndBytes

INT8 uses scales to map values into an integer range. FP8 has an exponent but still needs numerical range management. Dynamic scaling can avoid offline calibration; static schemes may need representative data. Universal calibration-free FP8 with less than 1% degradation is not guaranteed.

BitsAndBytes **LLM.int8()** uses INT8 for the main path and higher precision for outliers. The threshold and input determine outlier dimensions; they are not fixed at 0.1%. See the [official documentation](https://huggingface.co/docs/bitsandbytes/reference/nn/linear8bit). This is distinct from weight-only W8A16.

## 2. GPTQ, AWQ, and GGUF

GPTQ and AWQ are quantization methods. GGUF is a file format carrying multiple quantization types. Record the method, group size, mixed-precision layout, and backend rather than assigning a hardware-independent speed or accuracy ranking.

Weight-only quantization can accelerate small-batch, memory-bound decode by reducing weight reads. Larger batches may lose that advantage to dequantization and compute costs. The [AWQ paper](https://arxiv.org/abs/2306.00978) combines a method with optimized inference implementations; compression ratio is not a universal speedup.

## 3. Estimate complete memory requirements

```text
Raw weight lower bound = parameter_count × bits / 8
Device memory = weights + scales / metadata + KV / recurrent state
              + activations / communication / graphs / runtime allocations
```

Pure 4-bit 70B weights need about 35GB before overhead, so 24–32GB cards do not generally hold the full model plus workspace. Multi-GPU sharding and CPU offload are different configurations. A 4-bit 32B model on a 24GB card also needs real checkpoint, context, and runtime accounting. The RTX 3090 has 24GB; common RTX 4080 configurations have 16GB; 3060 / 4060 variants must be checked individually.

| Resources | Starting point |
| --- | --- |
| Roughly 8–12GB usable VRAM | Start with a smaller model and short context, then measure |
| Roughly 16–32GB | Check actual 4-bit 7B / 14B / 32B checkpoint and cache requirements |
| Multiple GPUs | Include communication, uneven sharding, and replicated caches |
| CPU / unified memory | Check capacity, bandwidth, backend support, and latency |

Hardware formats and efficient engine kernels are separate requirements. Verify the deployed version's support matrix; see [vLLM serving](/en/articles/vllm-serving-guide/).

## 4. Report quality with defined metrics

Hold revision, tokenizer, dataset, and inference settings constant. PPL is exp(mean negative log likelihood), dependent on corpus, tokenization, and evaluation window. Relative PPL change is not an intelligence-loss percentage.

An accuracy change from 70.24% to 69.64% is **0.60 percentage points**, or roughly 0.85% relative decline. Business acceptance thresholds must be explicit; there is no universal PPL increase of 0.1–0.2 or one-percentage-point deployment standard.

| Record | Required information |
| --- | --- |
| Method | Revision, W / A / KV precision, group size, calibration set |
| Quality | Task success, numeric / citation / format errors, repeated-run intervals |
| Speed | TTFT, TPOT, useful throughput at fixed SLA, lengths, and concurrency |
| Capacity | Per-rank weights, cache, and peak allocations |

See [evaluation methodology](/en/articles/llm-evaluation-guide/). Publish raw results rather than labels such as perfectly passed.

## 5. NF4, low-bit training, and hardware formats

NF4 is designed around approximately normally distributed values; real weights need not be perfectly Gaussian. QLoRA still uses scales and higher-precision adapters; see the [QLoRA paper](https://arxiv.org/abs/2305.14314).

Ternary BitNet-style models require suitable training or adaptation, not an arbitrary lossless conversion of any FP16 checkpoint. MXFP4 and NVFP4 also have different scaling and execution paths. Matching bit counts do not make checkpoints interchangeable.

## Frequently Asked Questions (FAQ)

### Q1: Is eight-bit always lossless and four-bit always 1–5% worse?
No. Model, method, data, and task matter; evaluate coding, mathematics, and long context separately.

### Q2: Why can weight-only quantization be faster?
It reduces memory traffic when that is the bottleneck. Kernel fusion, batch, and hardware determine actual gains.

### Q3: Should FP8 weights and KV be enabled together?
Validate each before combining them. KV scales and backend support are separate concerns.

### Q4: Which precision should fine-tuning use?
Choose BF16 / FP16 or QLoRA based on the base model, memory, and training stack, then validate stability. BF16's larger range does not make overflow impossible. See [fine-tuning](/en/articles/fine-tuning-guide/).
