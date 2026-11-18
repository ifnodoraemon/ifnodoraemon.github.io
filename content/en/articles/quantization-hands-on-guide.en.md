---
title: "LLM Quantization Hands-On Guide: Four Routes from Zero to Production"
slug: quantization-hands-on-guide
date: 2026-04-22
tag: Quantization Hands-on
tagClass: tag-cyan
category: Inference Systems
series: llm-inference
seriesOrder: 11
description: "Hands-on LLM quantization guide: download and run GGUF models (Qwen3-8B-Q4_K_M.gguf, llama.cpp, Ollama), quantize with AWQ/GPTQ, and deploy vLLM FP8 in production with copy-paste code."
featured: true
featuredStats:
  - label: Routes
    value: 4
  - label: Code Examples
    value: 12+
  - label: Tools
    value: 8
---

## Introduction: What Problem Does This Article Solve?

If you've read my other article [Quantization Precision Guide](/en/articles/quantization-precision-guide/), you already know how much "intelligence" quantization costs (spoiler: 8-bit is nearly free, 4-bit is the sweet spot).

But there's a huge gap between "knowing you should quantize" and "actually doing it":
- AutoGPTQ's GitHub page screams **"🚨 Unmaintained"**—what do you use instead?
- How do you prepare calibration datasets for AWQ and GPTQ? Are 128 samples enough?
- What exactly does vLLM's `--quantization fp8` do behind the scenes? Do you need pre-calibration?
- How do you verify the model hasn't gone stupid after quantization?

This article fills that gap. **Four practical routes, each with complete code you can copy and run.**

```text
What do you want to do?
│
├─ Route 1: I just want to pull a model and play (Zero barrier)
│   → Download a community pre-quantized model, run it with Ollama / LM Studio
│
├─ Route 2: I want to quantize a model myself (Geek essential)
│   → Use AWQ / GPTQ / GGUF tools for hands-on quantization
│
├─ Route 3: I need high-throughput inference serving (Production grade)
│   → vLLM + FP8 full quantization, squeeze every drop from H100
│
└─ Route 4: I need to fine-tune a large model on limited VRAM (QLoRA)
    → BitsAndBytes NF4 quantized base + LoRA adapter, fine-tune 32B on 24GB
```

---

## Route 1: Using Community Pre-Quantized Models (Zero Barrier)

For 90% of individual users, you don't need to quantize anything yourself. The community has already done it for you.

### Finding Reliable Quantized Models on HuggingFace

Go to [HuggingFace Models](https://huggingface.co/models), search for your desired model (e.g., `Qwen3-32B`), then filter by quantization format in the left sidebar.

**Trusted quantization contributors**—these names mean quality:

| Contributor | Specialty | Notes |
|------------|-----------|-------|
| **Unsloth** | GGUF, AWQ | Excellent quality with complete benchmark comparisons |
| **bartowski** | GGUF | Covers almost every popular model, fastest turnaround |
| **ModelCloud** | GPTQ | Official GPTQModel team |
| **neuralmagic** | FP8, INT8 | Neural Magic official, focused on server-side quantization |

### Decoding Naming Conventions

```text
Secrets hidden in model names:

Qwen3-32B-AWQ              → AWQ format, default 4-bit weight quantization
Qwen3-32B-GPTQ-Int4        → GPTQ format, 4-bit integer weight quantization
Qwen3-32B-GGUF             → GGUF format (multiple precision versions inside)
Qwen3-32B-FP8              → FP8 full quantization (weights + activations)

Secrets in GGUF filenames:
  Q2_K    → 2-bit (extreme compression, noticeable quality loss)
  Q3_K_S  → 3-bit small (space-optimized)
  Q4_K_M  → 4-bit medium (⭐ most recommended balance)
  Q5_K_M  → 5-bit medium (higher precision)
  Q6_K    → 6-bit (near lossless)
  Q8_0    → 8-bit (virtually lossless, but larger)
```

### Quick Start

**Option A: Ollama (Simplest)**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull and run a quantized model in one command
ollama run qwen3:32b

# Want a specific precision? Search for tags
ollama run qwen3:32b-q4_K_M
```

**Option B: LM Studio (GUI)**

Download [LM Studio](https://lmstudio.ai/), search for your model, pick a quantization level your VRAM can handle, download → load → chat.

**Option C: llama.cpp (CLI geek)**

```bash
# Download GGUF from HuggingFace (e.g., Qwen3-8B-Q4_K_M for lightweight edge deployment)
huggingface-cli download bartowski/Qwen3-8B-GGUF \
  --include "Qwen3-8B-Q4_K_M.gguf" \
  --local-dir ./models

# Run local CLI inference with Qwen3-8B-Q4_K_M.gguf
./llama-cli \
  -m ./models/Qwen3-8B-Q4_K_M.gguf \
  -p "System: You are an expert AI assistant.\nUser: Explain 4-bit quantization in two sentences.\nAssistant:" \
  -n 256 -ngl 99

# Or launch high-performance OpenAI-compatible API server (port 8080)
llama-server \
  -m ./models/Qwen3-8B-Q4_K_M.gguf \
  --port 8080 \
  -ngl 99    # offload all layers to GPU VRAM
```

> **Route 1 summary**: If you're a personal user, downloading GGUF Q4_K_M and running Ollama is the optimal solution.

---

## Route 2: Quantizing Weights Yourself (Geek Essential)

You need to do this yourself when:
- You've fine-tuned a private model with no community-quantized version
- You need domain-specific calibration for maximum accuracy
- You want to fully understand what quantization actually does

### 2.1 AWQ Quantization (Recommended First Choice via `llm-compressor`)

AWQ (Activation-Aware Weight Quantization) analyzes activation statistics to protect the most critical ~1% of salient weight channels—remaining one of the strongest precision-preserving weight-only (`W4A16`) quantization methods.

> ⚠️ **2025–2026 Ecosystem Update**: The standalone **`AutoAWQ` repository was officially deprecated in 2025** and no longer adds support for new model architectures (though existing pre-quantized `AutoAWQ` checkpoints continue to run natively in vLLM and Transformers). Official AWQ quantization maintenance moved into vLLM's unified quantization toolkit, **[llm-compressor](https://github.com/vllm-project/llm-compressor)**, via `AWQModifier` + `oneshot()`.

```bash
# Install vLLM's official quantization toolkit
pip install llmcompressor
```

```python
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from llmcompressor import oneshot
from llmcompressor.modifiers.awq import AWQModifier

# ====== Configuration ======
model_id = "Qwen/Qwen3-8B"              # HuggingFace model ID or local path
quant_path = "./Qwen3-8B-AWQ-W4A16"     # Output directory for quantized checkpoint

# ====== Load model and tokenizer ======
model = AutoModelForCausalLM.from_pretrained(
    model_id, torch_dtype=torch.bfloat16, device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_id)

# ====== Prepare calibration data (128-256 samples are sufficient for AWQ) ======
ds = load_dataset("databricks/databricks-dolly-15k", split="train[:256]")
ds = ds.map(
    lambda x: {
        "text": tokenizer.apply_chat_template(
            [{"role": "user", "content": f"{x['instruction']}\n{x['context']}"},
             {"role": "assistant", "content": x["response"]}],
            tokenize=False,
        )
    }
)

# ====== Define W4A16 AWQ Recipe (group_size=128 asymmetric weights, keep lm_head unquantized) ======
recipe = [
    AWQModifier(
        ignore=["lm_head"],
        scheme="W4A16_ASYM",            # 4-bit asymmetric weights with zero-point (group_size=128)
        targets=["Linear"],
    )
]

# ====== Run one-shot calibration & quantization ======
oneshot(
    model=model,
    dataset=ds,
    recipe=recipe,
    output_dir=quant_path,
    max_seq_length=2048,
    num_calibration_samples=256,
)
tokenizer.save_pretrained(quant_path)
print(f"✅ AWQ quantization via llm-compressor complete, saved to {quant_path}")
```

**Calibration data tips**:
- **Quantity**: 128–256 samples are sufficient. AWQ only needs channel-wise activation distribution statistics
- **Representativeness**: Match your production language and domain distribution (e.g., Chinese dialogue prompts for a Chinese chat service)
- **OOM fallback**: Lower `max_seq_length` to `512` or `1024` inside `oneshot()` if calibration runs out of VRAM

### 2.2 GPTQ Quantization (GPTQModel)

> ⚠️ **Important**: AutoGPTQ is unmaintained! Since 2025, the official recommendation is **GPTQModel** (maintained by ModelCloud), a drop-in replacement.

```bash
pip install -U gptqmodel --no-build-isolation
```

```python
from datasets import load_dataset
from gptqmodel import GPTQModel, QuantizeConfig

# ====== Configuration ======
model_id = "Qwen/Qwen3-8B"
quant_path = "./Qwen3-8B-GPTQ-Int4"

# ====== Calibration data ======
# GPTQ typically needs more data (512-1024) for Hessian matrix computation
calibration_dataset = load_dataset(
    "allenai/c4",
    data_files="en/c4-train.00001-of-01024.json.gz",
    split="train"
).select(range(1024))["text"]

# ====== Quantization config ======
quant_config = QuantizeConfig(
    bits=4,
    group_size=128,
)

# ====== Load and quantize ======
model = GPTQModel.load(model_id, quant_config)
model.quantize(calibration_dataset, batch_size=2)

# ====== Save ======
model.save(quant_path)
print(f"✅ GPTQ quantization complete, saved to {quant_path}")
```

### AWQ vs GPTQ: Practical Differences

| Dimension | AWQ | GPTQ |
|-----------|-----|------|
| **Calibration data** | 128-256 samples | 512-1024 for best results |
| **Quantization speed** | Faster (only analyzes activation distributions) | Slower (per-layer Hessian optimization) |
| **Precision retention** | **Best** (protects salient weights) | Excellent |
| **Inference speed** | Fast | **Faster** (Marlin kernel acceleration) |
| **Best for** | Precision-critical scenarios | Server-side throughput |
| **vLLM support** | ✅ | ✅ |

**One-liner**: Pick AWQ for precision, GPTQ for serving speed.

### 2.3 GGUF Quantization (llama.cpp)

GGUF is the cross-platform king—Mac, Windows, Linux, CPU, GPU, everything works.

**Step 1: Setup**

```bash
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

# Build with CUDA for faster conversion
mkdir build && cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release -j$(nproc)

# Install Python dependencies for conversion
pip install -r ../requirements.txt
```

**Step 2: Convert HuggingFace model to GGUF (FP16 baseline)**

```bash
python convert_hf_to_gguf.py ../models/Qwen3-8B/ \
  --outtype f16 \
  --outfile ../models/Qwen3-8B-f16.gguf
```

**Step 3: Quantize**

```bash
# Quantize to Q4_K_M (recommended sweet spot)
./bin/llama-quantize \
  ../models/Qwen3-8B-f16.gguf \
  ../models/Qwen3-8B-Q4_K_M.gguf \
  Q4_K_M

# Common GGUF quantization tiers:
# Q8_0    → Virtually lossless, ~50% the size of FP16
# Q6_K    → Near lossless when VRAM headroom permits
# Q5_K_M  → High precision, slightly larger than Q4
# Q4_K_M  → ⭐ Best accuracy-to-size sweet spot
# Q3_K_M  → Tight-VRAM compromise (pair with imatrix)
# Q2_K    → Extreme compression, noticeable quality degradation
```

**Advanced: Using imatrix for better low-bit quality**

When doing Q3 or Q2 extreme compression, imatrix (importance matrix) is a lifesaver:

```bash
# Generate importance matrix
./bin/llama-imatrix \
  -m ../models/Qwen3-8B-f16.gguf \
  -f ../calibration_data.txt \
  -o ../models/imatrix.dat

# Quantize with imatrix guidance
./bin/llama-quantize \
  --imatrix ../models/imatrix.dat \
  ../models/Qwen3-8B-f16.gguf \
  ../models/Qwen3-8B-Q3_K_M-imat.gguf \
  Q3_K_M
```

> **Key tip**: imatrix has minimal impact on Q4_K_M and above, but provides **perceptible** improvements for Q3 and Q2 levels.

---

## Route 3: Server-Side Full Quantization (Production FP8)

If you're running high-concurrency inference on H100/H800 in a data center, stop worrying about GPTQ/AWQ. **FP8 full quantization is the only way.**

### 3.1 vLLM FP8 Zero-Calibration (Fastest Setup)

```bash
# Single flag for FP8 dynamic quantization (official Qwen3 repo is Qwen/Qwen3-32B, unifying instruct & thinking modes)
vllm serve Qwen/Qwen3-32B \
  --quantization fp8 \
  --dtype auto \
  --gpu-memory-utilization 0.90 \
  --enable-prefix-caching
```

**What happens behind the scenes:**
1. vLLM loads BF16 original weights
2. Dynamically computes min/max range for each tensor on first inference
3. Converts weights and activations to FP8 E4M3 in real-time
4. Leverages H100's native FP8 Tensor Cores for acceleration

**Advantage**: Zero calibration, zero data, zero wait. **Disadvantage**: Minor runtime overhead from dynamic scaling factor computation.

### 3.2 Offline Static Calibration (Maximum Performance)

For ultimate throughput, use `llm-compressor` to pre-compute static scaling factors:

```bash
pip install llmcompressor
```

```python
from llmcompressor.modifiers.quantization import QuantizationModifier
from llmcompressor import oneshot
from datasets import load_dataset
from transformers import AutoTokenizer

model_id = "Qwen/Qwen3-32B"
output_dir = "./Qwen3-32B-FP8-Static"

tokenizer = AutoTokenizer.from_pretrained(model_id)
ds = load_dataset("HuggingFaceFW/fineweb-edu", split="train", streaming=True)
calibration_data = [tokenizer.apply_chat_template(
    [{"role": "user", "content": x["text"][:2000]}],
    tokenize=False
) for x in list(ds.take(512))]

recipe = QuantizationModifier(
    targets="Linear",
    scheme="FP8",
    ignore=["lm_head"],
)

oneshot(
    model=model_id,
    dataset=calibration_data,
    recipe=recipe,
    output_dir=output_dir,
    max_seq_length=4096,
    num_calibration_samples=512,
)
```

Then serve with vLLM:

```bash
vllm serve ./Qwen3-32B-FP8-Static \
  --dtype auto \
  --gpu-memory-utilization 0.90
# No --quantization fp8 needed—vLLM auto-detects FP8 config in the checkpoint
```

### 3.3 FP8 Mode Comparison

| Mode | Calibration | Runtime Overhead | Accuracy | Best For |
|------|------------|-----------------|----------|----------|
| **Online Dynamic** (`--quantization fp8`) | None | Highest | Good | Quick testing |
| **Offline Dynamic Activations** | None | Moderate | Good | Memory savings |
| **Offline Static** (llm-compressor) | 512 samples | **Lowest** | **Best** | **Production** |

### 3.4 KV Cache Quantization—The Hidden Accelerator

```bash
vllm serve Qwen/Qwen3-32B \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \
  --enable-prefix-caching
```

Effect: KV Cache memory usage **halved**. Particularly impactful for long-context scenarios (8K-128K), enabling more concurrent requests on the same GPU.

---

## Route 4: Quantization for Fine-Tuning (QLoRA)

When you want to fine-tune a 32B model on a consumer GPU (e.g., RTX 4090 with 24GB VRAM), QLoRA is the only viable option.

### Core Concept

```text
QLoRA's genius:
  1. Quantize base model with NF4 → 32B shrinks from 64GB to ~16GB
  2. Freeze quantized base weights (don't train!)
  3. Attach tiny LoRA adapters (typically just tens of MB)
  4. Only train the LoRA adapters
  5. During training, quantized weights are temporarily dequantized to BF16
```

### Complete Code

```python
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTConfig, SFTTrainer
from datasets import load_dataset

# ====== 4-bit quantization config ======
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",          # NF4 (information-theoretically optimal)
    bnb_4bit_compute_dtype="bfloat16",  # Dequantize to BF16 for computation
    bnb_4bit_use_double_quant=True,     # Double quantization (saves ~0.4 bit/param)
)

# ====== Load quantized base model ======
model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3-8B",
    quantization_config=bnb_config,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3-8B")

# ====== Prepare for training ======
model = prepare_model_for_kbit_training(model)

# ====== LoRA config ======
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=[
        "q_proj", "k_proj",
        "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# → trainable params: 13,631,488 || all params: 8,043,235,328
# → trainable%: 0.1695%   ← Only 0.17% of parameters are trained!

# ====== Load training data ======
dataset = load_dataset("your-dataset-here", split="train")

# ====== Train (using modern TRL SFTConfig + processing_class API) ======
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    processing_class=tokenizer,
    args=SFTConfig(
        output_dir="./qlora-output",
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        bf16=True,
        logging_steps=10,
        save_strategy="epoch",
    ),
)
trainer.train()
```

> **Performance tip**: [Unsloth](https://github.com/unslothai/unsloth) can boost QLoRA training speed by **2-5x** with 60% less memory through Triton kernel optimizations.

---

## Post-Quantization Quality Validation

Deploying without validation is gambling. Three levels of verification:

### Level 1: Quick Perplexity Test (30 seconds)

```bash
./bin/llama-perplexity \
  -m ./models/Qwen3-8B-Q4_K_M.gguf \
  -f ./test_data.txt \
  --chunks 32
```

| Quant Level | Typical PPL Degradation | Verdict |
|-------------|------------------------|---------|
| Q8_0 | < 0.5% | ✅ Near lossless |
| Q6_K | < 1% | ✅ Very safe |
| Q4_K_M | 1-3% | ✅ Sweet spot |
| Q3_K_M | 3-8% | ⚠️ Monitor closely |
| Q2_K | 8-20%+ | ❌ Experimental only |

### Level 2: Benchmark Scoring (lm-evaluation-harness)

```bash
pip install lm-eval

lm_eval --model hf \
  --model_args pretrained=./Qwen3-8B-AWQ-W4A16 \
  --tasks mmlu,hellaswag,arc_challenge \
  --batch_size auto \
  --output_path ./eval_results/

# For GGUF models: launch llama-server first, then evaluate via the local-completions / openai-chat API
```

### Level 3: Business Data Testing (Most Critical)

High generic benchmark scores never guarantee reliability on your domain-specific edge cases:

```python
# Prepare 50-100 representative production queries + reference answers,
# run both the unquantized baseline and quantized candidate, and compare via human review or LLM-as-a-Judge:

import json

with open("business_test_cases.json", encoding="utf-8") as f:
    test_cases = json.load(f)
# [{"question": "...", "expected_answer": "..."}, ...]

for case in test_cases:
    original_answer = call_model(original_model, case["question"])
    quantized_answer = call_model(quantized_model, case["question"])
    # Compare schema compliance, numeric accuracy, and factual recall
```

> **Rule of thumb**: If your workload involves code generation or mathematical reasoning, anything below 4-bit may have perceptible degradation. Always validate with real data.

---

## Troubleshooting Guide: Four Common Pitfalls

### Pitfall 1: Model Collapses or Outputs Gibberish After Quantization

**Symptoms**: Garbled characters, infinite repetition loops, or severe topic drift.

**Causes & Fixes**:
- **Insufficient or mismatched calibration data**: Calibrating a Chinese or code-heavy model purely on English prose misses salient activation channels. Re-quantize using 128–512 samples matching your target language and domain.
- **Bit-width too aggressive for small models**: Sub-7B models have less parameter redundancy and degrade faster at 4-bit or below; step up to `Q5_K_M` / `Q6_K` or FP8.
- **Architecture incompatibility**: Verify that your model family is explicitly supported by the installed `llm-compressor` / `GPTQModel` / `llama.cpp` release.

### Pitfall 2: GPU Memory Usage Barely Decreased

**Symptoms**: You switched to 4-bit weights, yet `nvidia-smi` reports nearly the same total VRAM allocation.

**Causes & Fixes**:
- **Weight-only quantization (`W4A16`) leaves activations and KV Cache in FP16/BF16**—and serving engines like vLLM pre-allocate the remaining budget up to `gpu_memory_utilization` for the KV block pool!
- **Fix**: Inspect startup logs to confirm weight footprint dropped as expected, enable KV Cache quantization (`--kv-cache-dtype fp8_e5m2` where validated), or tighten `--max-model-len` / `--gpu-memory-utilization`.

### Pitfall 3: Inference Speed Didn't Improve

**Symptoms**: Token throughput looks similar to—or slightly slower than—FP16.

**Causes & Fixes**:
- **Weight-only quantization reduces memory traffic, not Tensor Core math**: `W4A16` weights are dequantized back to FP16/BF16 on-chip before matrix multiplication, so compute-bound large-batch workloads see little or no speedup (and non-fused fallback kernels can even regress).
- **Underutilized single-stream runs**: Ensure Marlin / fused `W4A16` kernels are active for low-batch decode, or switch to **full `FP8` quantization (`--quantization fp8`)** on Hopper/Ada/Blackwell GPUs to unlock native 2× FP8 Tensor Core throughput at high concurrency.

### Pitfall 4: `AutoGPTQ` Import or Build Failures

```text
ModuleNotFoundError: No module named 'auto_gptq'
```

`AutoGPTQ` is unmaintained. Migrate to **GPTQModel** (which remains backward-compatible with existing GPTQ checkpoints):

```bash
pip uninstall auto-gptq
pip install -U gptqmodel --no-build-isolation
```

---

## 2026 Quantization Tool Landscape

| Tool | Type | Precision | Status | Best Paired With |
|------|------|-----------|--------|-----------------|
| **llm-compressor** | Full + Weight-only | W4A16 (AWQ/GPTQ), FP8, INT8 | ✅ Very active | Official vLLM production toolkit (succeeds AutoAWQ) |
| **GPTQModel** | Weight-only | INT4, INT8 | ✅ Active | vLLM / Transformers |
| **llama.cpp** | Weight-only | Q2-Q8 | ✅ Very active | Ollama / LM Studio |
| **BitsAndBytes** | Weight-only | NF4, INT8 | ✅ Active | QLoRA fine-tuning |
| **torchao** | Full + Weight-only | INT4, INT8, FP8 | ✅ Active | PyTorch native |
| **HQQ** | Weight-only | INT2-INT8 | ✅ Active | Ultra-low-bit research |
| **AQLM** | Weight-only | 2-bit | ⚡ Frontier | Extreme compression |
| ~~AutoAWQ~~ | ~~Weight-only~~ | ~~INT4~~ | ⚠️ **Deprecated (2025)** | ~~Adopted into `llm-compressor` (legacy checkpoints still load)~~ |
| ~~AutoGPTQ~~ | ~~Weight-only~~ | ~~INT4, INT8~~ | ❌ **Deprecated** | ~~Replaced by GPTQModel~~ |

---

## Final Takeaways

1. **Download before you quantize**: Community pre-quantized models are excellent unless you have special needs
2. **AWQ for precision, GPTQ for speed, GGUF for universality**: They're not interchangeable—pick by scenario
3. **FP8 is the endgame for production**: If you have H100s, `--quantization fp8` is the optimal answer
4. **Always validate after quantization**: Perplexity takes 30 seconds, benchmarks take 30 minutes, business testing may take 3 days—but those 3 days prevent 3 months of nightmares

---

## Frequently Asked Questions (FAQ)

### Q1: How should I choose between AWQ, GPTQ, and GGUF in production?
For Linux inference servers running high-throughput engines, choose **AWQ** (best perplexity retention by protecting salient weights) or **GPTQ**; for local workstations, Macs, or edge inference, choose **GGUF** paired with llama.cpp or Ollama. In modern cloud data centers with Hopper or Ada GPUs, native **FP8** is the definitive choice. Check our [vLLM Production Serving Guide](/en/articles/vllm-serving-guide/) for deployment recipes.

### Q2: Why did my 4-bit quantized model save memory but fail to run faster?
Weight-only quantization (W4A16) dequantizes weights back to FP16/BF16 in SRAM/registers during matrix multiplication, so compute latency is not reduced. The speedup from weight-only quantization comes primarily from overcoming memory-bandwidth bottlenecks in single-batch or small-batch regimes. For multi-batch acceleration, use full FP8 or W8A8 quantization to exploit specialized Tensor Cores.

### Q3: How can I verify that my quantized model hasn't suffered accuracy collapse?
Follow a three-stage validation pipeline: first, measure PPL (Perplexity, e.g. on WikiText-2) under identical tokenizer and sliding-window settings against the unquantized baseline as a rapid smoke test—note that PPL scales with corpus and tokenization so **there is no universal `0.1–0.2` delta deployment rule**, though sharp spikes immediately expose catastrophic collapse; second, run standard capability suites (e.g., MMLU, GSM8K); third, enforce explicit business acceptance thresholds on domain-specific regression prompts covering math, code, long-context recall, and JSON formatting. See our [LLM Evaluation Guide](/en/articles/llm-evaluation-guide/) for test harnesses.

### Q4: How do I download and run Qwen3-8B-Q4_K_M.gguf locally?
To download and run `Qwen3-8B-Q4_K_M.gguf`, use `huggingface-cli download bartowski/Qwen3-8B-GGUF --include "Qwen3-8B-Q4_K_M.gguf" --local-dir ./models`. You can then launch it with llama.cpp using `./llama-cli -m ./models/Qwen3-8B-Q4_K_M.gguf -p "Hello" -n 256` or import it directly into Ollama via a custom `Modelfile` (`FROM ./models/Qwen3-8B-Q4_K_M.gguf`). With an active VRAM footprint around 5.2GB, the Q4_K_M quantization level retains over 99% of dense FP16 perplexity while fitting comfortably on modern 8GB GPUs and Apple Silicon.
