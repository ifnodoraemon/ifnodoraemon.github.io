---
title: 大模型量化实战手册：从零开始，四条路线全覆盖
slug: quantization-hands-on-guide
date: 2026-04-22
tag: 量化部署
tagClass: tag-blue
description: 告别理论焦虑，手把手教你量化大模型。从直接下载预量化模型，到自己用 AWQ/GPTQ/GGUF 动手压缩权重，再到 vLLM FP8 零校准生产部署和 QLoRA 微调——四条路线，每条都有可直接复制的完整代码和命令。
featured: true
featuredStats:
  - label: 实战路线
    value: 4
  - label: 代码示例
    value: 12+
  - label: 工具覆盖
    value: 8
---

## 前言：这篇文章解决什么问题？

如果你读过我的另一篇文章[《大模型量化精度全景图》](/articles/quantization-precision-guide)，你应该已经知道了"量化会让模型变笨多少"的答案（剧透：8-bit 几乎免费，4-bit 是甜蜜点）。

但"知道该量化"和"真正动手量化"之间，还隔着一条巨大的鸿沟：
- AutoGPTQ 的 GitHub 首页赫然写着 **"🚨 Unmaintained"**，该用什么替代？
- AWQ 和 GPTQ 的校准数据集到底怎么准备？128 条够不够？
- vLLM 的 `--quantization fp8` 背后到底做了什么？要不要提前校准？
- 量化完了怎么验证模型没有变傻？

这篇文章就是来填这条鸿沟的。**四条实战路线，每条都附完整代码，直接复制就能跑。**

```text
你想做什么？
│
├─ 路线一：我就想拉一个模型来玩玩（零门槛）
│   → 直接下载社区预量化模型，用 Ollama / LM Studio 一键跑起来
│
├─ 路线二：我要自己量化一个模型（极客必修课）
│   → 用 AWQ / GPTQ / GGUF 工具手动量化，完全掌控精度和体积
│
├─ 路线三：我要在服务端部署高吞吐推理服务（生产级）
│   → vLLM + FP8 全量化，零校准或静态校准，极限压榨 H100
│
└─ 路线四：我要在有限显存下微调大模型（QLoRA）
    → BitsAndBytes NF4 量化基座 + LoRA 适配器，24GB 显卡微调 70B
```

---

## 路线一：直接使用社区预量化模型（零门槛）

对于 90% 的个人用户来说，你根本不需要自己量化。社区里已经有人帮你做好了。

### 在 HuggingFace 上找到靠谱的量化模型

打开 [HuggingFace Models](https://huggingface.co/models)，搜索你想要的模型名字（如 `Qwen3-32B`），然后在左侧筛选器里勾选你想要的量化格式。

**靠谱的量化贡献者**——看到这些名字就可以放心下载：

| 贡献者 | 擅长格式 | 特点 |
|--------|---------|------|
| **Unsloth** | GGUF, AWQ | 量化质量极高，附带完整的 Benchmark 对比数据 |
| **bartowski** | GGUF | 几乎覆盖所有热门模型，速度最快的搬运工 |
| **ModelCloud** | GPTQ | GPTQModel 官方团队，质量有保障 |
| **neuralmagic** | FP8, INT8 | Neural Magic 官方，专注服务端高性能量化 |

### 命名规范速读：看一眼就知道模型是什么精度

```text
模型名字里的密码：

Qwen3-32B-AWQ              → AWQ 格式，默认 4-bit 权重量化
Qwen3-32B-GPTQ-Int4        → GPTQ 格式，4-bit 整数权重量化
Qwen3-32B-GGUF             → GGUF 格式（文件内会有多个精度版本）
Qwen3-32B-FP8              → FP8 全量化（权重+激活值都是 FP8）

GGUF 文件名里的密码：
  Q2_K    → 2-bit （极限压缩，智商有明显退化）
  Q3_K_S  → 3-bit small（空间优先）
  Q4_K_M  → 4-bit medium（⭐ 最推荐的平衡点）
  Q5_K_M  → 5-bit medium（追求更高精度）
  Q6_K    → 6-bit （接近无损）
  Q8_0    → 8-bit （几乎无损，但体积较大）
```

### 一键跑起来

**方案 A：Ollama（最简单）**

```bash
# 安装 Ollama（如果还没装）
curl -fsSL https://ollama.com/install.sh | sh

# 一行命令拉取并运行量化模型
ollama run qwen3:32b

# 想用特定精度？搜索 Ollama 库里的 tag
ollama run qwen3:32b-q4_K_M
```

**方案 B：LM Studio（有图形界面）**

下载 [LM Studio](https://lmstudio.ai/)，在搜索栏搜索模型名，选择你的显存能承受的量化版本，点击下载→加载→开聊。

**方案 C：llama.cpp（命令行极客）**

```bash
# 直接从 HuggingFace 下载 GGUF 文件
huggingface-cli download bartowski/Qwen3-32B-GGUF \
  --include "Qwen3-32B-Q4_K_M.gguf" \
  --local-dir ./models

# 用 llama.cpp 的 server 模式启动 OpenAI 兼容 API
llama-server \
  -m ./models/Qwen3-32B-Q4_K_M.gguf \
  --port 8080 \
  -ngl 99    # 尽可能多地把层放到 GPU 上
```

> **路线一小结**：如果你是个人用户，直接下载 GGUF Q4_K_M 跑 Ollama 就是最优解。省下的时间够你多喝两杯咖啡。

---

## 路线二：自己动手量化权重（极客必修课）

但如果你遇到了以下情况，就必须自己动手了：
- 你微调了一个私有模型，社区没有现成的量化版本
- 你需要针对特定业务数据做校准，榨出最高精度
- 你就是想彻底搞懂量化到底在干什么

### 2.1 AWQ 量化实战（推荐首选）

AWQ（Activation-Aware Weight Quantization）通过分析激活值统计信息来保护最关键的 1% 权重，是目前精度保持最优的仅权重量化方案。

```bash
# 安装 AutoAWQ
pip install autoawq
```

```python
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer
from datasets import load_dataset

# ====== 配置 ======
model_path = "Qwen/Qwen3-8B"           # HuggingFace 模型 ID 或本地路径
quant_path = "./Qwen3-8B-AWQ"           # 量化后的输出目录
quant_config = {
    "zero_point": True,                  # 启用零点量化（精度更高）
    "q_group_size": 128,                 # 每 128 个权重共享一个缩放因子
    "w_bit": 4,                          # 量化到 4-bit
    "version": "GEMM",                   # 使用 GEMM 内核（兼容性最好）
}

# ====== 加载模型和分词器 ======
model = AutoAWQForCausalLM.from_pretrained(model_path)
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)

# ====== 准备校准数据 ======
# AWQ 非常高效，128~256 条样本就够了！
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

# ====== 执行量化 ======
model.quantize(
    tokenizer=tokenizer,
    quant_config=quant_config,
    calib_data=calib_data,
)

# ====== 保存结果 ======
model.save_quantized(quant_path)
tokenizer.save_pretrained(quant_path)
print(f"✅ AWQ 量化完成，已保存到 {quant_path}")
```

**校准数据要点**：
- **数量**：128~256 条足够。AWQ 只需要统计激活值的分布特征，不需要海量数据
- **代表性**：校准数据应该尽量接近你的实际使用场景。如果你的模型主要跑中文对话，就用中文对话数据校准
- **OOM 兜底**：如果校准时爆显存，可以在 `model.quantize()` 中加 `max_calib_seq_len=512` 限制序列长度

### 2.2 GPTQ 量化实战（GPTQModel）

> ⚠️ **重要提醒**：AutoGPTQ 已停止维护！2025 年起，官方推荐使用 **GPTQModel**（由 ModelCloud 团队维护）作为替代。它是 AutoGPTQ 的 drop-in 替代品，接口几乎一样。

```bash
# 安装 GPTQModel
pip install -U gptqmodel --no-build-isolation
```

```python
from datasets import load_dataset
from gptqmodel import GPTQModel, QuantizeConfig

# ====== 配置 ======
model_id = "Qwen/Qwen3-8B"
quant_path = "./Qwen3-8B-GPTQ-Int4"

# ====== 准备校准数据 ======
# GPTQ 通常需要更多数据（512~1024 条）来计算 Hessian 矩阵
calibration_dataset = load_dataset(
    "allenai/c4",
    data_files="en/c4-train.00001-of-01024.json.gz",
    split="train"
).select(range(1024))["text"]

# ====== 量化配置 ======
quant_config = QuantizeConfig(
    bits=4,                # 量化位数
    group_size=128,        # 分组大小
)

# ====== 加载并量化 ======
model = GPTQModel.load(model_id, quant_config)
model.quantize(calibration_dataset, batch_size=2)

# ====== 保存 ======
model.save(quant_path)
print(f"✅ GPTQ 量化完成，已保存到 {quant_path}")
```

### AWQ vs GPTQ 实操差异

| 维度 | AWQ | GPTQ |
|------|-----|------|
| **校准数据量** | 128~256 条即可 | 512~1024 条效果更好 |
| **量化速度** | 较快（只分析激活值分布） | 较慢（需要计算 Hessian 矩阵逐层优化） |
| **精度保持** | **最优**（保护显著权重） | 优秀 |
| **推理速度** | 快 | **更快**（Marlin 内核加速） |
| **适用场景** | 追求精度的场景 | 追求推理速度的服务端 |
| **vLLM 支持** | ✅ | ✅ |

**一句话选型**：追求精度选 AWQ，追求服务端出词速度选 GPTQ。

### 2.3 GGUF 量化实战（llama.cpp）

GGUF 是跨平台之王——Mac、Windows、Linux、CPU、GPU 都能跑。适合个人消费级硬件。

**第一步：准备环境**

```bash
# 克隆 llama.cpp
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

# 编译（开启 CUDA 加速转换速度）
mkdir build && cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release -j$(nproc)

# 安装 Python 依赖（用于格式转换）
pip install -r ../requirements.txt
```

**第二步：将 HuggingFace 模型转为 GGUF（FP16 基线）**

```bash
# 假设你的模型在 ./models/Qwen3-8B/
python convert_hf_to_gguf.py ../models/Qwen3-8B/ \
  --outtype f16 \
  --outfile ../models/Qwen3-8B-f16.gguf
```

**第三步：量化**

```bash
# 量化为 Q4_K_M（最推荐的平衡点）
./bin/llama-quantize \
  ../models/Qwen3-8B-f16.gguf \
  ../models/Qwen3-8B-Q4_K_M.gguf \
  Q4_K_M

# 其他常用量化级别
# Q8_0    → 几乎无损，体积约为 FP16 的 50%
# Q6_K    → 接近无损，适合显存有余裕时使用
# Q5_K_M  → 高精度，略大于 Q4
# Q4_K_M  → ⭐ 性价比之王
# Q3_K_M  → 显存紧张时的妥协
# Q2_K    → 极限压缩，智商有明显退化
```

**进阶：用 imatrix 提升低比特量化精度**

当你要做 Q3 或 Q2 级别的极限压缩时，imatrix（重要性矩阵）是救命稻草。它会统计每个权重对输出的影响程度，让量化过程优先保护重要权重。

```bash
# 先生成重要性矩阵（需要一些代表性文本）
./bin/llama-imatrix \
  -m ../models/Qwen3-8B-f16.gguf \
  -f ../calibration_data.txt \
  -o ../models/imatrix.dat

# 用 imatrix 辅助量化
./bin/llama-quantize \
  --imatrix ../models/imatrix.dat \
  ../models/Qwen3-8B-f16.gguf \
  ../models/Qwen3-8B-Q3_K_M-imat.gguf \
  Q3_K_M
```

> **关键提醒**：imatrix 对 Q4_K_M 及以上的量化级别提升不大，但对 Q3 和 Q2 级别的提升可以达到**感知级别**的差异。

---

## 路线三：服务端全量化部署（生产级 FP8）

如果你在数据中心用 H100/H800 跑高并发推理服务，不要再纠结 GPTQ/AWQ 了。**FP8 全量化才是唯一真神。**

### 3.1 vLLM FP8 零校准（最快上手）

```bash
# 一行参数搞定 FP8 量化
vllm serve Qwen/Qwen3-32B-Instruct \
  --quantization fp8 \
  --dtype auto \
  --gpu-memory-utilization 0.90 \
  --enable-prefix-caching
```

**这行命令背后发生了什么？**
1. vLLM 加载 BF16 原始权重
2. 在第一次推理时，动态计算每个 Tensor 的 min/max 范围
3. 将权重和激活值实时转为 FP8 E4M3 格式
4. 利用 H100 的 FP8 Tensor Core 加速矩阵乘法

**优势**：零校准、零数据、零等待。**劣势**：每次推理都要动态计算缩放因子，有微小的运行时开销。

### 3.2 离线静态校准（极致性能）

如果你追求极致吞吐，可以提前用 `llm-compressor` 做静态校准，把缩放因子固定到 checkpoint 里：

```bash
# 安装
pip install llmcompressor
```

```python
from llmcompressor.modifiers.quantization import QuantizationModifier
from llmcompressor import oneshot
from datasets import load_dataset
from transformers import AutoTokenizer

model_id = "Qwen/Qwen3-32B-Instruct"
output_dir = "./Qwen3-32B-FP8-Static"

# 准备少量校准数据（512 条即可）
tokenizer = AutoTokenizer.from_pretrained(model_id)
ds = load_dataset("HuggingFaceFW/fineweb-edu", split="train", streaming=True)
calibration_data = [tokenizer.apply_chat_template(
    [{"role": "user", "content": x["text"][:2000]}],
    tokenize=False
) for x in list(ds.take(512))]

# 执行 FP8 静态量化
recipe = QuantizationModifier(
    targets="Linear",
    scheme="FP8",
    ignore=["lm_head"],  # 输出层保持高精度
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

量化完成后，直接用 vLLM 加载：

```bash
vllm serve ./Qwen3-32B-FP8-Static \
  --dtype auto \
  --gpu-memory-utilization 0.90
# 不需要加 --quantization fp8，vLLM 会自动检测 checkpoint 中的 FP8 配置
```

### 3.3 FP8 三种模式对比

| 模式 | 校准数据 | 运行时开销 | 精度 | 适用场景 |
|------|---------|-----------|------|---------|
| **在线动态** (`--quantization fp8`) | 不需要 | 最高（每次计算缩放因子） | 好 | 快速测试、开发环境 |
| **离线动态激活** | 不需要 | 中等 | 好 | 节省显存、保持精度 |
| **离线静态** (llm-compressor) | 需要 512 条 | **最低** | **最优** | **生产部署首选** |

### 3.4 KV Cache 量化——隐藏的加速器

除了模型权重，KV Cache 也是显存大户。vLLM 支持对 KV Cache 做 FP8 压缩：

```bash
vllm serve Qwen/Qwen3-32B-Instruct \
  --quantization fp8 \
  --kv-cache-dtype fp8_e5m2 \   # KV Cache 从 BF16 压缩为 FP8
  --enable-prefix-caching
```

效果：KV Cache 显存占用**减半**。在长上下文场景（8K-128K）中收益尤其明显，同样的 GPU 能服务更多并发请求。

---

## 路线四：微调场景的量化（QLoRA）

当你想在消费级 GPU（如 RTX 4090 的 24GB 显存）上微调 70B 级别的大模型时，QLoRA 是唯一可行的方案。

### 核心思路

```text
QLoRA 的天才设计：
  1. 用 NF4（NormalFloat 4-bit）量化基座模型 → 70B 模型从 140GB 压缩到 ~35GB
  2. 冻结量化后的基座权重（不训练！）
  3. 在旁边附加微小的 LoRA 适配器（通常只有几十 MB）
  4. 只训练 LoRA 适配器，显存开销极低
  5. 训练过程中，量化的权重会临时解压回 BF16 参与计算（保持精度）
```

### 完整代码

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

# ====== 4-bit 量化配置 ======
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,                  # 启用 4-bit 加载
    bnb_4bit_quant_type="nf4",          # 使用 NF4（信息论最优）
    bnb_4bit_compute_dtype="bfloat16",  # 计算时反量化到 BF16
    bnb_4bit_use_double_quant=True,     # 双重量化（进一步省 ~0.4 bit/参数）
)

# ====== 加载量化后的基座模型 ======
model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3-8B",
    quantization_config=bnb_config,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3-8B")

# ====== 准备模型用于训练 ======
model = prepare_model_for_kbit_training(model)

# ====== LoRA 配置 ======
lora_config = LoraConfig(
    r=16,                    # LoRA 秩（常用 8~64）
    lora_alpha=32,           # 缩放因子（通常设为 r 的 2 倍）
    target_modules=[         # 要附加 LoRA 的层
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
# → trainable%: 0.1695%   ← 只训练 0.17% 的参数！

# ====== 加载训练数据 ======
dataset = load_dataset("your-dataset-here", split="train")

# ====== 开始训练 ======
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

> **性能提示**：如果你追求更快的微调速度，推荐使用 [Unsloth](https://github.com/unslothai/unsloth)，它通过 Triton 内核优化，可以将 QLoRA 训练速度提升 **2~5 倍**，且显存占用进一步降低 60%。

---

## 量化后的质量评估：你的模型变笨了吗？

量化完了不验证就上线，等于赌命。以下是三个层次的验证手段：

### 层次一：困惑度快速测试（30 秒出结果）

困惑度（Perplexity, PPL）是最快的健康检查。数值越低越好。

**用 llama.cpp 测试 GGUF 模型**：

```bash
./bin/llama-perplexity \
  -m ./models/Qwen3-8B-Q4_K_M.gguf \
  -f ./test_data.txt \
  --chunks 32
```

**参考基线**：

| 量化级别 | 典型 PPL 劣化 | 判断 |
|---------|-------------|------|
| Q8_0 | < 0.5% | ✅ 几乎无损 |
| Q6_K | < 1% | ✅ 非常安全 |
| Q4_K_M | 1~3% | ✅ 甜蜜点 |
| Q3_K_M | 3~8% | ⚠️ 需要关注 |
| Q2_K | 8~20%+ | ❌ 仅限实验 |

### 层次二：基准跑分（lm-evaluation-harness）

```bash
# 安装
pip install lm-eval

# 对量化后的 GPTQ/AWQ 模型跑基准
lm_eval --model hf \
  --model_args pretrained=./Qwen3-8B-AWQ \
  --tasks mmlu,hellaswag,arc_challenge \
  --batch_size auto \
  --output_path ./eval_results/

# 对 GGUF 模型跑基准（通过 llama.cpp server）
# 先启动 server，再对 API 做评估
```

### 层次三：业务数据自测（最关键）

通用基准分数再高，也不能保证在你的业务场景里表现正常。

```python
# 最简单粗暴但最有效的方法：
# 准备 50~100 条你的真实业务问题 + 标准答案
# 分别用原始模型和量化模型跑一遍
# 人工或用 LLM-as-a-Judge 对比评分

import json

test_cases = json.load(open("business_test_cases.json"))
# [{"question": "...", "expected_answer": "..."}, ...]

for case in test_cases:
    original_answer = call_model(original_model, case["question"])
    quantized_answer = call_model(quantized_model, case["question"])
    # 比较两者的差异
```

> **经验法则**：如果你的业务涉及代码生成、数学推理等逻辑密集型任务，4-bit 以下的量化可能会有感知级别的退化。务必用业务数据实测。

---

## 必踩的坑：量化排错指南

### 坑 1：量化后模型崩溃 / 胡说八道

**症状**：生成内容变成乱码、无限重复、或完全跑题。

**原因与解法**：
- **校准数据太少或不匹配**：如果用英文数据校准一个中文模型，关键的中文激活模式可能被忽略。换成匹配语言和领域的校准数据重新量化
- **量化位数过低**：小模型（<7B）的冗余度低，INT4 就可能出问题。尝试提升到 Q5 或 Q6
- **模型不支持**：某些新架构可能与量化工具不兼容。检查工具的 supported models 列表

### 坑 2：量化后显存占用没有减少

**症状**：明明用了 4-bit 量化，GPU 显存占用和原来差不多。

**原因**：
- 你用的是**仅权重量化**（GPTQ/AWQ），激活值仍然是 FP16。模型推理时需要反量化权重 + 存储 FP16 激活值 + KV Cache，这些加起来可能抵消了权重节省的空间
- **解法**：同时开启 KV Cache 量化（`--kv-cache-dtype fp8_e5m2`），或减小 `--max-model-len`

### 坑 3：量化后推理速度没有变快

**症状**：花了半天量化，出词速度和 FP16 差不多甚至更慢。

**原因**：
- **仅权重量化不加速计算**：GPTQ/AWQ 的 4-bit 权重在计算前需要反量化回 FP16。节省的是显存，不是计算速度
- **瓶颈不在计算**：如果你只跑单条请求（无并发），GPU 本来就没跑满，量化不会让它变快
- **真正能加速的**：FP8 全量化（`--quantization fp8`）+ 高并发场景 → 利用 FP8 Tensor Core 做原生低精度计算

### 坑 4：AutoGPTQ 报错 / 加载失败

```text
ModuleNotFoundError: No module named 'auto_gptq'
```

AutoGPTQ 已停止维护。请迁移到 **GPTQModel**：

```bash
pip uninstall auto-gptq
pip install -U gptqmodel --no-build-isolation
```

GPTQModel 兼容 AutoGPTQ 格式的模型文件，老模型可以直接加载。

---

## 2026 量化工具全景图

| 工具 | 类型 | 支持精度 | 维护状态 | 最佳搭配 |
|------|------|---------|---------|---------|
| **AutoAWQ** | 仅权重量化 | INT4 | ✅ 活跃 | vLLM / Transformers |
| **GPTQModel** | 仅权重量化 | INT4, INT8 | ✅ 活跃 | vLLM / Transformers |
| **llama.cpp** | 仅权重量化 | Q2~Q8 | ✅ 极活跃 | Ollama / LM Studio |
| **BitsAndBytes** | 仅权重量化 | NF4, INT8 | ✅ 活跃 | QLoRA 微调 |
| **llm-compressor** | 全量化 | FP8, INT8 | ✅ 活跃 | vLLM 生产部署 |
| **torchao** | 全量化 | INT4, INT8, FP8 | ✅ 活跃 | PyTorch 原生生态 |
| **HQQ** | 仅权重量化 | INT2~INT8 | ✅ 活跃 | 超低比特研究 |
| **AQLM** | 仅权重量化 | 2-bit | ⚡ 前沿 | 极限压缩研究 |
| ~~AutoGPTQ~~ | ~~仅权重量化~~ | ~~INT4, INT8~~ | ❌ **已弃用** | ~~已被 GPTQModel 替代~~ |

---

## 最终总结

量化不是黑魔法，而是一套有章可循的工程实践。记住这四条箴言：

1. **能下载就别自己量化**：社区预量化模型的质量已经非常可靠，除非有特殊需求
2. **AWQ 是精度之王，GPTQ 是速度之王，GGUF 是通吃之王**：三者互不替代，按场景选型
3. **FP8 是生产部署的终局答案**：如果你有 H100，一行 `--quantization fp8` 就是最优解
4. **量化完了必须验证**：困惑度测试 30 秒，基准跑分 30 分钟，业务自测可能需要 3 天——但这 3 天能让你避免上线后的 3 个月噩梦
