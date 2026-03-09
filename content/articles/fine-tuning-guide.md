---
title: 大模型微调全流程详解
slug: fine-tuning-guide
date: 2026-02-25
tag: 微调
tagClass: tag-purple
description: LoRA、QLoRA、Full Fine-tuning 三种方案对比，从数据准备到模型部署的完整工作流与最佳实践。
---

## 为什么需要微调？

尽管 GPT-5.4、Claude 4.6 等通用大模型能力强大，但在特定场景下仍存在局限：

- **领域知识不足**：医疗、法律、金融等专业领域的术语和逻辑
- **输出风格不匹配**：需要特定的语言风格、格式或行业规范
- **性能成本权衡**：用小模型 + 微调替代大模型调用，降低 80%+ 成本

> **何时微调 vs 何时用提示工程？**
> 
> 如果你的需求可以通过调整提示词和 Few-Shot 示例解决，优先使用提示工程。
> 当提示工程无法达到要求的精度/一致性时，再考虑微调。

## 三种微调方案对比

| 方案 | 可训练参数 | 显存需求 | 训练速度 | 适用场景 |
|------|-----------|----------|----------|----------|
| Full Fine-tuning | 100% | 极高 (80GB+) | 慢 | 资源充足、需极致性能 |
| LoRA | 0.1%~1% | 中等 (16GB) | 快 | 通用推荐方案 |
| QLoRA | 0.1%~1% | 低 (8GB) | 较快 | 消费级 GPU |

### LoRA 原理

LoRA（Low-Rank Adaptation）的核心思想是将权重更新分解为两个低秩矩阵：

```text
原始权重 W ∈ R^(d×d)

LoRA 分解：
ΔW = A × B
A ∈ R^(d×r)   ← r << d（rank 通常为 8~64）
B ∈ R^(r×d)

更新后：W' = W + α · (A × B)
```

这样只需训练 `A` 和 `B` 两个小矩阵，参数量从 `d²` 降低到 `2dr`。

### QLoRA 增强

QLoRA 在 LoRA 基础上增加了 4-bit 量化：
- 模型权重用 NF4（4 位 NormalFloat）存储
- 计算时反量化为 BF16
- 显存节省约 60%，几乎不损失精度

## 完整微调流程

### Step 1：准备数据集

数据格式示例（JSONL）：

```json
{"messages": [
  {"role": "system", "content": "你是一个专业的医学问答助手"},
  {"role": "user", "content": "什么是高血压？"},
  {"role": "assistant", "content": "高血压是指动脉血压持续升高的慢性疾病..."}
]}
```

数据质量指南：
- **数量**：高质量 1000-5000 条通常足够
- **多样性**：覆盖目标场景的各种情况
- **一致性**：标注风格和格式保持统一
- **清洗**：去除重复、矛盾和低质量样本

### Step 2：配置 LoRA 训练

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

# 加载基础模型
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# LoRA 配置
lora_config = LoraConfig(
    r=16,                    # rank：8~64，越大能力越强但越慢
    lora_alpha=32,           # 缩放系数，通常设为 2 * r
    target_modules=[         # 要注入 LoRA 的层
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

# 应用 LoRA
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# → trainable params: 13.6M || all params: 8.03B || 0.17%
```

### Step 3：训练

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

### Step 4：评估与部署

```python
# 合并 LoRA 权重到基础模型
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./merged_model")

# 使用 vLLM 部署推理服务
# vllm serve ./merged_model --port 8000
```

## 关键参数调优

| 参数 | 建议范围 | 说明 |
|------|----------|------|
| rank (r) | 8~64 | 越大适应能力越强，16 是常用起始值 |
| lora_alpha | 2r | 控制 LoRA 更新的缩放 |
| learning_rate | 1e-4 ~ 5e-4 | 太高易过拟合，太低收敛慢 |
| epochs | 2~5 | 数据量小时 3 epoch，大时 1-2 epoch |
| batch_size | 4~16 | 受显存限制，用梯度累积等效增大 |

## 常见陷阱

1. **过拟合**：数据量少于 500 条时极易过拟合。解决方案：增加 dropout、减少 epoch、加入正则化
2. **灾难性遗忘**：微调后模型丧失通用能力。解决方案：混入 5-10% 的通用数据
3. **数据泄漏**：评估集与训练集有重叠。解决方案：严格划分数据集
4. **格式不一致**：训练数据的 chat template 与推理时不一致。解决方案：使用 tokenizer 的 `apply_chat_template`

## 商业 API 微调

如果不想管理 GPU 基础设施，可以使用商业 API 的微调服务：

| 服务 | 支持模型 | 最低数据量 | 特点 |
|------|----------|-----------|------|
| OpenAI Fine-tuning | GPT-5-mini, GPT-5, GPT-5.4 | 10 条 | 最简单，支持监督微调和 DPO |
| Anthropic Fine-tuning | Claude 3 Haiku（via Bedrock） | 32 条 | 通过 Amazon Bedrock 托管 |
| Google Vertex AI | Gemini 3.x 系列 | 100 条 | 与 Google Cloud 深度集成 |
