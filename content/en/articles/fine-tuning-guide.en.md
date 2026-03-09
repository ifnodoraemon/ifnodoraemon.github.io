---
title: A Comprehensive Guide to LLM Fine-Tuning Workflows
slug: fine-tuning-guide
date: 2026-02-25
tag: Fine-Tuning
tagClass: tag-purple
description: A comparison of LoRA, QLoRA, and Full Fine-tuning. A complete workflow and best practices from data preparation to model deployment.
---

## Why Do We Need Fine-Tuning?

Although general-purpose large language models like GPT-5.4 and Claude 4.6 are incredibly capable, they still have limitations in specific scenarios:

- **Lack of domain knowledge**: Specialized terminology and logic in medical, legal, or financial fields.
- **Mismatched output styles**: Requiring specific language styles, formatting, or industry standards.
- **Performance-cost trade-offs**: Replacing large model API calls with smaller, fine-tuned models to reduce costs by 80%+.

> **When to fine-tune vs. when to use prompt engineering?**
> 
> If your requirements can be solved by adjusting prompts and providing Few-Shot examples, prioritize prompt engineering.
> Only consider fine-tuning when prompt engineering fails to achieve the required accuracy or consistency.

## Comparison of Three Fine-Tuning Approaches

| Approach | Trainable Parameters | VRAM Requirement | Training Speed | Suitable Scenarios |
|------|-----------|----------|----------|----------|
| Full Fine-tuning | 100% | Extremely High (80GB+) | Slow | Sufficient resources, extreme performance needed |
| LoRA | 0.1%~1% | Medium (16GB) | Fast | General recommended approach |
| QLoRA | 0.1%~1% | Low (8GB) | Relatively Fast | Consumer-grade GPUs |

### LoRA Principle

The core idea of LoRA (Low-Rank Adaptation) is to decompose weight updates into two low-rank matrices:

```text
Original weight W ∈ R^(d×d)

LoRA decomposition:
ΔW = A × B
A ∈ R^(d×r)   ← r << d (rank is usually 8~64)
B ∈ R^(r×d)

After update: W' = W + α · (A × B)
```

This way, only the two small matrices `A` and `B` need to be trained, reducing the number of parameters from `d²` to `2dr`.

### QLoRA Enhancement

QLoRA adds 4-bit quantization on top of LoRA:
- Model weights are stored in NF4 (4-bit NormalFloat).
- Dequantized back to BF16 during computation.
- Saves about 60% of VRAM with almost no loss in precision.

## Complete Fine-Tuning Workflow

### Step 1: Prepare the Dataset

Example data format (JSONL):

```json
{"messages": [
  {"role": "system", "content": "You are a professional medical Q&A assistant."},
  {"role": "user", "content": "What is hypertension?"},
  {"role": "assistant", "content": "Hypertension is a chronic medical condition in which the blood pressure in the arteries is persistently elevated..."}
]}
```

Data Quality Guidelines:
- **Quantity**: 1000-5000 high-quality examples are usually sufficient.
- **Diversity**: Cover various situations within the target scenario.
- **Consistency**: Maintain a unified annotation style and format.
- **Cleaning**: Remove duplicates, contradictions, and low-quality samples.

### Step 2: Configure LoRA Training

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load the base model
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# LoRA configuration
lora_config = LoraConfig(
    r=16,                    # rank: 8~64, larger means stronger but slower
    lora_alpha=32,           # scaling factor, usually set to 2 * r
    target_modules=[         # layers to inject LoRA into
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

# Apply LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# → trainable params: 13.6M || all params: 8.03B || 0.17%
```

### Step 3: Training

```python
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="./output",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    bf16=True,
    logging_steps=10,
    save_strategy="epoch",
    evaluation_strategy="epoch",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)
trainer.train()
```

### Step 4: Evaluation and Deployment

```python
# Merge LoRA weights into the base model
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./merged_model")

# Use vLLM to deploy inference service
# vllm serve ./merged_model --port 8000
```

## Key Parameter Tuning

| Parameter | Recommended Range | Description |
|------|----------|------|
| rank (r) | 8~64 | Larger rank adapts better. 16 is a good starting point. |
| lora_alpha | 2r | Controls the scaling of the LoRA update. |
| learning_rate | 1e-4 ~ 5e-4 | Too high leads to overfitting, too low converges slowly. |
| epochs | 2~5 | 3 epochs for small datasets, 1-2 epochs for large ones. |
| batch_size | 4~16 | Limited by VRAM; use gradient accumulation to effectively increase it. |

## Common Pitfalls

1. **Overfitting**: Extremely easy to overfit with less than 500 samples. Solution: add dropout, reduce epochs, add regularization.
2. **Catastrophic Forgetting**: The model loses its general capabilities after fine-tuning. Solution: mix in 5-10% general data.
3. **Data Leakage**: Overlap between evaluation and training sets. Solution: strictly partition datasets.
4. **Format Inconsistency**: Training chat template differs from inference. Solution: use the tokenizer's `apply_chat_template`.

## Commercial API Fine-Tuning

If you don't want to manage GPU infrastructure, you can use commercial API fine-tuning services:

| Service | Supported Models | Min Samples | Features |
|------|----------|-----------|------|
| OpenAI Fine-tuning | GPT-5-mini, GPT-5, GPT-5.4 | 10 | Easiest; supports SFT and DPO |
| Anthropic Fine-tuning | Claude 3 Haiku (via Bedrock) | 32 | Managed through Amazon Bedrock |
| Google Vertex AI | Gemini 3.x series | 100 | Deeply integrated with Google Cloud |
