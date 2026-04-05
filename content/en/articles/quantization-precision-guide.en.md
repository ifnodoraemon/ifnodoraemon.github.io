---
title: "LLM Quantization Precision Guide: From FP32 to 1-bit, How Much Quality Do You Actually Lose?"
slug: quantization-precision-guide
date: 2026-03-31
tag: Quantization
tagClass: tag-blue
description: A comprehensive comparison of FP32, BF16, FP16, FP8, INT8, INT4, NF4, FP4, 1.58-bit and all major quantization formats — with real benchmark data and an in-depth FP8 vs INT8 technical analysis.
featured: true
featuredStats:
  - label: Precision Formats
    value: 12+
  - label: Quantization Methods
    value: 8
  - label: Data Dimensions
    value: 6
---

## Beginner's Guide: What is Quantization? Will the Model Get "Dumber"?

In 2026, the biggest anxiety when tinkering with Large Language Models isn't raw compute power; it's **VRAM (Video RAM)**. 
Take an extreme example: Even at FP16 precision, Llama 4 Maverick 400B requires about 800GB of VRAM just to store the weights. That means even if you stuff an $300,000 server with eight H100s, you can barely fit it, let alone run inference. Even a 70B model needs ~140GB — far beyond the limit of any single consumer GPU.

This harsh reality forced the adoption of **Quantization**.

**To use a simple analogy:**
If a high-precision model (FP32/FP16) is like an **uncompressed, ultra-HD BMP image** (massive file size), then quantization is like saving that image as a **JPEG or GIF**.
This inevitably loses some color depth (numerical precision drops), but if the compression strategy is smart, the human eye (or the user chatting with the model) barely notices the difference, while the file size is reduced by 4x to 8x.

So, by using fewer bits to store LLM weights, we drastically cut VRAM usage and can also leverage the integer math units in GPUs to speed up calculations.

But here comes the ultimate question: **After compression, how much "dumber" does the model actually get?** Will it start talking nonsense?
Before we hit you with hardcore benchmark numbers, let's look at a quick deployment cheat sheet.

## One-Minute Decision Tree: If You're in a Hurry

For different users and hardware setups, the choice of LLM quantization has become highly standardized. You can just follow this decision tree:

```text
What's your primary scenario?
│
├─ Training (Pre-training / Fine-tuning)
│   ├─ Unlimited Hardware (H100/H800+) → BF16 mixed precision (or enable FP8 for 2x speedup)
│   ├─ Barely Enough (A100/4090)       → BF16 mixed precision
│   └─ VRAM-Starved (< 24GB)           → QLoRA (use NF4 quantized base + high-precision LoRA adapters)
│
├─ Datacenter Inference (Pursuing Max Throughput & Lowest Cost)
│   ├─ Bleeding Edge: Blackwell B200 → NVFP4 (≤1% accuracy loss, 3x throughput of FP8)
│   ├─ Modern: Hopper H100/H800      → FP8 E4M3 (<1% loss, 1.5x throughput, **zero calibration**)
│   └─ Legacy: A100/L40S/T4          → INT8 / INT4 (GPTQ/AWQ) or SmoothQuant W8A8
│
├─ Geek / Personal GPU Inference (VRAM-limited, just want it to run)
│   ├─ Top-tier Consumer: RTX 4090/5090 (24~32GB) → AWQ/GPTQ 4-bit (Can run 70B models!)
│   ├─ Mid-tier: RTX 3090/4080 (16GB)             → GPTQ 4-bit (Choose ≤30B models)
│   └─ Entry-level: RTX 3060/4060 (8GB)           → GGUF Q4_K_M (Choose ≤8B models)
│
└─ CPU Only or Mac (No discrete NVIDIA GPU)
    ├─ RAM ≥ 32GB → GGUF Q4_K_M (Best balance of intelligence and generation speed)
    ├─ RAM ≥ 64GB → GGUF Q5_K_M (Don't care about speed, just want max accuracy)
    └─ RAM < 32GB → GGUF Q2_K / Q3_K_S (Extreme compression, **intelligence will degrade noticeably**)
```

See the pattern? **8-bit is a nearly free lunch, 4-bit is the sweet spot for cost-performance, and anything below 2-bit suffers visible "brain damage".**

---

## Level 1 Cognition: The Illusion of INT8 Quantization

After reading the decision tree, beginners often encounter a massive point of confusion:
> **"Don't technical articles say that INT8 quantization causes the model to crash and output garbage? Why is everyone in the community using INT8 just fine?"**

Understanding this concept is the master key to decoding LLM deployment.
**The answer is: the "INT8 Quantization" frequently talked about by the community is usually NOT full quantization (W8A8), but "Weight-Only" quantization.**

Let's break down what's actually happening:

| "Community Term" | Actual Underlying Operation | What Gets Quantized? | Accuracy Loss |
|----------|---------|----------|---------|
| "I quantized my 70B to **INT8** using GPTQ" | GPTQ **Weight-Only** Quant | **Only the weight matrices are compressed to INT8. During math ops, they are decompressed to multiply with high-precision FP16 activations.** | ≈0% (Lossless) |
| "Loaded INT8 using BitsAndBytes" | BnB nf8/int8 Weight-Only | Same as above | ≈0~1.6% |
| "Deployed INT8 via SmoothQuant" | INT8 **Full Quantization** (W8A8) | Both weights and activations are **pure INT8** (math is pure 8-bit integer multiplication) | ≈0% (But the smoothing engineering is exhausting) |
| "Enabled **FP8** in vLLM" | FP8 **Full Quantization** (W8A8) | Both weights and activations are **FP8** (racing on native float units) | <1% (Out-of-the-box) |

### Two Completely Different Paths

So, in reality, there are two distinct paths in quantization, solving completely different pain points:

1. **Path 1: My GPU is too small, I can't fit the model (Weight-Only INT8/INT4)**
   - **How it works:** Like zipping a large file. You decompress it back to FP16 on the fly during calculation.
   - **Pros:** Massively saves VRAM with **zero risk of model collapse**. The "outlier explosions" that cause models to break only exist in the **activations**. Since activations are never quantized here (staying at FP16), the model remains safe.
   - **Cons:** Because it still uses high-precision math, generation speed **doesn't actually get faster** (sometimes it's even slower due to decompression overhead). It exists purely to save space. This is why it's the go-to for RTX 3090/4090 users (using GPTQ/AWQ).

2. **Path 2: My GPUs fit the model, but traffic is too high, I need maximum throughput (W8A8 Full Quantization)**
   - **How it works:** You compress both the storage weights AND the compute activations, unleashing the blazing-fast INT8 or FP8 Tensor Cores inside the GPU.
   - **The INT8 Pain Point:** If you use the `INT8` structure here, the occasional massive outlier numbers in activations will blow out the integer calculation grid, causing instant gibberish. You must use cumbersome plugins like `SmoothQuant` to painstakingly massage the numbers offline.
   - **Why FP8 is God-Tier:** The `FP8` floating-point structure has built-in exponent bits, acting like a natural shock absorber. It requires zero plugins or calibration datasets. You enable it, and your throughput immediately jumps by 1.5x.

> **Phase Summary:** If you are running on personal consumer cards (3090/4090), stick to downloading INT4 weight-only models via GPTQ or AWQ. If you are handling massive concurrent traffic in a datacenter with H100s, **FP8 (W8A8)** is the undisputed king—don't torture yourself trying to calibrate INT8.

---

## Level 2 Tool Selection: GPTQ vs. AWQ vs. GGUF?

Now that we know 90% of regular users are dealing with weight-only quantization (like 4-bit weights), what's the difference between the mainstream formats?

| Dimension | GPTQ | AWQ | GGUF (llama.cpp) |
|------|------|-----|------|
| **Core Idea** | Uses Hessian matrices to compute error compensation. | Uses heuristics to find and protect the "1% most salient weights". | Group-wise mixed quantization (e.g., mixing precision across layers). |
| **Accuracy Retention** | Excellent | **Best** | Highly flexible (Q2~Q8) |
| **Setup Difficulty** | Needs calibration dataset (but open-source repos usually pre-bake it for you) | Needs calibration dataset | None whatsoever; just run it |
| **Inference Speed (NVIDIA)** | **Fastest** (pairs great with vLLM/TRT-LLM) | Very Fast | Moderate-to-Slow |
| **Runs On** | NVIDIA GPU (Server staple) | NVIDIA GPU (For accuracy purists) | **Anything**: Mac, Windows CPU, even a Raspberry Pi! |

**Quick Selection Guide**:
- If you have OCD and want to **defend the model's absolute baseline intelligence** under strict VRAM limits → Use **AWQ** 
- If you are deploying an API and want to **maximize tokens-per-second** → Get a **GPTQ** model and run it on vLLM.
- If your machine **only has an Apple Silicon Mac or Intel CPU** → Download a **GGUF** format and enjoy it via Ollama / LM Studio. We usually recommend `Q4_K_M`.

---

## Core Data Evidence: Show Me the Numbers

We can't just claim "how much dumber" it gets without proof. Let's look at real Benchmark data.

### The Accuracy Loss Panorama

| Precision Level | Representative Tech | Overall Intelligence Drop | Recommended Scenario | VRAM Compression |
|---------|---------|---------|---------|----------|
| **16-bit Baseline** | BF16 / FP16 | 0% | Standard alignment / R&D | 1x |
| **8-bit Full Quant** | FP8 (E4M3) | **<1%** | Datacenter No.1 Choice (H100/H800) | 2x |
| **8-bit Weight-Only**| INT8 GPTQ | **≈0%** | Standard clusters (A100 and below) | 2x |
| **4-bit Weight-Only**| INT4 AWQ / NF4 QLoRA | **1%~5%** | **Ultimate Value**, Personal PC standard | 4x |
| **4-bit Full Quant** | NVFP4 (Blackwell) | **≤1%** | Next-gen supercomputer necessity | 4x |
| **2~3 bit Compress** | GGUF Q2_K | **5%~15%+** | Mobile playgrounds, high error tolerance | 5~8x |
| **Extreme 1.58-bit**| BitNet b1.58 | **≈0%** | Bleeding edge (**Must be trained from scratch**) | ~8x |

### The Truth Mirror: Llama 2 70B Perplexity Test

Perplexity (PPL) measures the uncertainty of an LLM's text generation. **Lower is better.**

| Evaluation Subject | Precision & Type | Perplexity PPL (Lower=Better) | Degradation vs FP16 | VRAM Needed |
|------|------|-----|---------------|----------|
| **Pure Original** | FP16 (Baseline) | 3.12~3.17 | — | ~140 GB |
| **8-bit Lossless** | INT8 - GPTQ / HQQ | 3.12 | **≈0%** (Virtually identical) | ~70 GB |
| **8-bit Micro-loss**| INT8 - BitsAndBytes| 3.17 | **≈0~1.6%** | ~70 GB |
| **4-bit Mild Pain** | INT4 - AWQ (g64) | 3.20 | **≈1.0~2.6%** | ~35 GB |
| **4-bit Mild Pain** | INT4 - GPTQ (g64) | 3.23 | **≈1.9~3.5%** | ~35 GB |

> **What the data proves:** Because a 70B model is huge, its internal redundancy creates massive tolerance for quantization. INT4 degradation is firmly kept under 3%. While casually chatting with the model, you will never notice a 3% intelligence drop, but your VRAM requirement drops from "Server Only" to "Single RTX Desktop."

### The King of Production: FP8 vs BF16 (Qwen3-32B)

If we go full FP8 on high-end cards like H100, does it really not drop?

| Metric | BF16 (Baseline) | FP8 E4M3 Full Quantization | Gap |
|---------|------------|----------|------|
| **MMLU-Pro (Heavy Knowledge Logic)** | 70.24% | 69.64% | Lost a mere **0.6%** |
| **HumanEval (Heavy Code Generation)** | Passed ✓ | Passed ✓ | **≈0% Drop** |
| **Throughput Speed** | 1x | Flying: **~1.5x** | +50% Efficiency |

### Future Tech: Is 1.58-bit (BitNet) Black Magic?

| Metric | Traditional FP16 Architecture | Microsoft's BitNet b1.58 |
|------|------------------|-------------|
| **Perplexity PPL** | Baseline | **Virtually Matched!** |
| **Extreme Inference Speed**| 1x | Surges **2.71x ~ 8.9x** |
| **VRAM Footprint** | 1x | Incredibly tiny **~0.28x** (-72%) |

> **Severe Warning:** Many influencers claim you can "compress" existing models into 1.58-bit. This is false. 1.58-bit ({ -1, 0, 1 } ternary math) cannot be achieved via post-training compression—it will turn the model braindead. It **must be trained from absolute scratch with special architectures, burning millions of dollars in compute.**

---

## Deep Dive: Why is FP8 So Smooth While INT8 Struggles?

We mentioned repeatedly that for "Full Quantization" (compressing both weights and activations), FP8 is a god, while INT8 needs the painful SmoothQuant tuning. 
This is due to a "genetic defect" inherent to LLMs: the presence of massive, sudden **Activation Outliers**.

When a model surpasses 6.7B parameters, its data streams routinely spike with "monster numbers" that are fifty to a hundred times larger than normal values.

**If we use an INT8 uniform grid to catch them:**
```text
Imagine 99.9% of our values are between [-0.3, 0.3], but suddenly a [60.0] appears.

INT8's structure: It only has uniformly sliced integer slots from [-128 to 127].
The Tragedy: To ensure the [60.0] doesn't crash the system, the global "ruler scaling factor" must be stretched wildly.
Result: The [60.0] is safely stored as the number 127.
BUT! All those normal values like [0.05] and [0.15], under this massive new ruler, get entirely crushed and rounded down to [0].
At this moment, the model loses all its fine-grained texture and starts hallucinating.
```

**If we use the FP8 E4M3 floating-point structure:**
```text
FP8 has 1 sign bit + 4 'spring-loaded' exponent bits + 3 precise mantissa bits.
The Miracle: The exponent bits (E) act as a natural dynamic zoom.
When processing 0.05, it pulls out the (E=-4) microscope, precisely recording the texture as 0.0078.
When processing 60, it automatically switches to the (E=5) macro lens, packing it roughly as 60. The mantissa is rougher, but the system doesn't crash.
Both the big and small numbers coexist peacefully. Extremely smooth.
```
This perfectly explains why NVIDIA went out of its way to forge dedicated native FP8 Tensor Cores in their Hopper architecture.

## Architectural Evolution: Why NF4 and not INT4?

Why did QLoRA—the monument of the fine-tuning world—use a weird format called `NF4 (NormalFloat 4-bit)` instead of the universally common `INT4`?

**Simple explanation: Because we need to use our limited resources where they matter most.**

- `INT4` is a rigid ruler. It rigidly marks 16 equal distances: -8, -7, -6... 0... 6, 7.
- However, an LLM's weight distribution is usually a perfect Gaussian **Normal Distribution (massive bulge in the middle around 0, incredibly thin on the extreme ends)**. The vast majority of weights are squeezed around 0.
- Thus, `NF4` casts a spell on these 16 slots: It heavily concentrates over 10 ultra-fine markers right in the middle near 0, and only sparsely places a few markers at the extreme tail ends.
- **Information-Theoretic Optimality Achieved**: It perfectly hugs the statistical laws, allowing a meager 4-bit capacity to express detail far beyond its weight class.

## The End Game: Blackwell and the OCP MX Microscaling Standard

In recent years, tech giants realized that fighting over software wasn't enough; they needed a unified hardware standard. In 2025, AMD, Nvidia, Meta, Intel, and others unprecedentedly united to forge the `OCP Microscaling (MX)` standard.

Its core idea is highly disruptive:
Stop arguing about FP8 vs INT8. Just use a technique called **"Communal Scaling Factors"** (e.g., MXFP6, MXFP4).
Force 32 neighboring neurons to share the exact same 8-bit dynamic range "exponent ceiling".
By the time NVIDIA applied their ultimate engineering magic in the Blackwell B200, this evolved into `NVFP4`: mandating scale-sharing every 16 neurons.
This magic trick means: **Although it essentially only takes up 4.5 bits of physical space (FP4-level compression), it retains a terrifying accuracy profile comparable to FP8 distributions (<1% loss). It is the true next-generation throughput deity.**

## Final Conclusion

Quantization is not a "lossy, cheap substitute"; it is the very bedrock that keeps LLMs operational in the real world. Remember these three maxims:
1. **For Personal Hacking**: Embrace 4-bit AWQ / GGUF without hesitation. Experience incredibly powerful models for a fraction of the hardware cost.
2. **For Production inference endpoints (with modern hardware)**: Abandon complex SmoothQuant engineering. Mindlessly run FP8 inside vLLM. It is the officially anointed optimal solution.
3. **Always Benchmark the Truth**: Perplexity is a good mirror, but for tasks requiring extreme logical rigor like coding or math, any compression below 4-bit might break your pipeline. Your model is only truly "running" if it survives your actual business tasks.
