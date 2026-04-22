---
title: "LLM Quantization Hands-On Guide: Four Routes from Zero to Production"
slug: quantization-hands-on-guide
date: 2026-04-22
tag: Quantization
tagClass: tag-blue
description: "Stop theorizing, start quantizing. From downloading pre-quantized models, to hands-on weight compression with AWQ/GPTQ/GGUF, to vLLM FP8 zero-calibration production deployment and QLoRA fine-tuning—four routes, each with complete copy-paste code."
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

If you've read my other article [Quantization Precision Guide](/articles/quantization-precision-guide), you already know how much "intelligence" quantization costs (spoiler: 8-bit is nearly free, 4-bit is the sweet spot).

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
    → BitsAndBytes NF4 quantized base + LoRA adapter, fine-tune 70B on 24GB
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
# Download GGUF from HuggingFace
huggingface-cli download bartowski/Qwen3-32B-GGUF \
  --include "Qwen3-32B-Q4_K_M.gguf" \
  --local-dir ./models

# Start an OpenAI-compatible API server
llama-server \
  -m ./models/Qwen3-32B-Q4_K_M.gguf \
  --port 8080 \
  -ngl 99    # offload as many layers to GPU as possible
```

> **Route 1 summary**: If you're a personal user, downloading GGUF Q4_K_M and running Ollama is the optimal solution.

---

## Route 2: Quantizing Weights Yourself (Geek Essential)

You need to do this yourself when:
- You've fine-tuned a private model with no community-quantized version
- You need domain-specific calibration for maximum accuracy
- You want to fully understand what quantization actually does

### 2.1 AWQ Quantization (Recommended First Choice)

AWQ (Activation-Aware Weight Quantization) analyzes activation statistics to protect the most critical 1% of weights—currently the best precision-preserving weight-only quantization method.

```bash
pip install autoawq
```

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer
from datasets import load_dataset

# ====== Configuration ======
model_path = "Qwen/Qwen3-8B"
quant_path = "./Qwen3-8B-AWQ"
quant_config = {
    "zero_point": True,       # Enable zero-point quantization (higher precision)
    "q_group_size": 128,      # 128 weights share one scaling factor
    "w_bit": 4,               # Quantize to 4-bit
    "version": "GEMM",        # GEMM kernel (best compatibility)
}

# ====== Load model and tokenizer ======
model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)

# ====== Prepare calibration data ======
# AWQ is very efficient—128-256 samples are enough!
def get_calibration_data():
    data = load_dataset(
        "databricks/databricks-dolly-15k",
        split="train[:128]"
    )
    return [
        f"{x['instruction']}\n{x['context']}\n{x['response']}"
        for x in data
    ]

calib_data = get_calibration_data()

# ====== Quantize ======
model.quantize(
    tokenizer=tokenizer,
    quant_config=quant_config,
    calib_data=calib_data,
)

# ====== Save ======
model.save_quantized(quant_path)
tokenizer.save_pretrained(quant_path)
print(f"✅ AWQ quantization complete, saved to {quant_path}")
```

**Calibration data tips**:
- **Quantity**: 128-256 samples are sufficient. AWQ only needs activation distribution statistics
- **Representativeness**: Calibration data should match your actual use case. Chinese model → Chinese data
- **OOM fallback**: Add `max_calib_seq_len=512` to `model.quantize()` if you run out of memory

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
vllm serve Qwen/Qwen3-32B-Instruct \
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

model_id = "Qwen/Qwen3-32B-Instruct"
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
vllm serve Qwen/Qwen3-32B-Instruct \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \
  --enable-prefix-caching
```

Effect: KV Cache memory usage **halved**. Particularly impactful for long-context scenarios (8K-128K), enabling more concurrent requests on the same GPU.

---

## Route 4: Quantization for Fine-Tuning (QLoRA)

When you want to fine-tune a 70B model on a consumer GPU (e.g., RTX 4090 with 24GB VRAM), QLoRA is the only viable option.

### Core Concept

```text
QLoRA's genius:
  1. Quantize base model with NF4 → 70B shrinks from 140GB to ~35GB
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
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
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

# ====== Train ======
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    tokenizer=tokenizer,
    args=TrainingArguments(
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
  --model_args pretrained=./Qwen3-8B-AWQ \
  --tasks mmlu,hellaswag,arc_challenge \
  --batch_size auto \
  --output_path ./eval_results/
```

### Level 3: Business Data Testing (Most Critical)

High benchmark scores don't guarantee performance on your specific use case. Always test with 50-100 real business questions.

> **Rule of thumb**: If your workload involves code generation or mathematical reasoning, anything below 4-bit may have perceptible degradation. Always validate with real data.

---

## Troubleshooting Guide

### Pitfall 1: Model collapses after quantization
**Causes**: Mismatched calibration data, bit-width too low for small models (<7B), unsupported architecture.

### Pitfall 2: Memory usage didn't decrease
**Cause**: Weight-only quantization (GPTQ/AWQ) still uses FP16 activations + KV Cache. Enable `--kv-cache-dtype fp8_e5m2` and reduce `--max-model-len`.

### Pitfall 3: Inference isn't faster
**Cause**: Weight-only quantization saves memory, not compute. For actual speedup, use FP8 full quantization with high concurrency.

### Pitfall 4: AutoGPTQ errors
AutoGPTQ is unmaintained. Migrate to **GPTQModel**:
```bash
pip uninstall auto-gptq
pip install -U gptqmodel --no-build-isolation
```

---

## 2026 Quantization Tool Landscape

| Tool | Type | Precision | Status | Best Paired With |
|------|------|-----------|--------|-----------------|
| **AutoAWQ** | Weight-only | INT4 | ✅ Active | vLLM / Transformers |
| **GPTQModel** | Weight-only | INT4, INT8 | ✅ Active | vLLM / Transformers |
| **llama.cpp** | Weight-only | Q2-Q8 | ✅ Very active | Ollama / LM Studio |
| **BitsAndBytes** | Weight-only | NF4, INT8 | ✅ Active | QLoRA fine-tuning |
| **llm-compressor** | Full quant | FP8, INT8 | ✅ Active | vLLM production |
| **torchao** | Full quant | INT4, INT8, FP8 | ✅ Active | PyTorch native |
| **HQQ** | Weight-only | INT2-INT8 | ✅ Active | Ultra-low-bit research |
| **AQLM** | Weight-only | 2-bit | ⚡ Frontier | Extreme compression |
| ~~AutoGPTQ~~ | ~~Weight-only~~ | ~~INT4, INT8~~ | ❌ **Deprecated** | ~~Replaced by GPTQModel~~ |

---

## Final Takeaways

1. **Download before you quantize**: Community pre-quantized models are excellent unless you have special needs
2. **AWQ for precision, GPTQ for speed, GGUF for universality**: They're not interchangeable—pick by scenario
3. **FP8 is the endgame for production**: If you have H100s, `--quantization fp8` is the optimal answer
4. **Always validate after quantization**: Perplexity takes 30 seconds, benchmarks take 30 minutes, business testing may take 3 days—but those 3 days prevent 3 months of nightmares
