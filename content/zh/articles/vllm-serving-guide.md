---
title: vLLM 在线推理服务实战：从架构原理到 Token 计费，一文搞定生产部署
slug: vllm-serving-guide
date: 2026-04-14
tag: 推理部署
tagClass: tag-green
description: 深入浅出解析 vLLM 核心架构（PagedAttention、连续批处理、APC 前缀缓存、推测解码），面向在线推理服务场景，手把手教你搭建 OpenAI 兼容 API、调优性能参数、搭建 Token 计费体系。附完整 Docker 部署方案与 Prometheus 监控配置。
featured: true
featuredStats:
  - label: 核心技术
    value: 6+
  - label: 调优参数
    value: 10+
  - label: 部署方案
    value: 3
---

## 引言：为什么是 vLLM？

2026 年，如果你要在生产环境中部署一个大模型在线推理服务——不管是搭建公司内部的 AI 助手、还是对外售卖 API 的商业化平台——你几乎绑不开一个名字：**vLLM**。

它诞生于 UC Berkeley 的 Sky Computing Lab，论文发表在操作系统顶会 SOSP 2023 上，如今已经成为拥有 2000+ 贡献者的最活跃开源推理引擎之一。它的口号简单直白：**"Easy, fast, and cheap LLM serving for everyone."**

但 vLLM 到底快在哪里？缓存命中率怎么监控和优化？`--max-num-seqs` 到底设多少才对？Token 计费为什么在自建推理服务里是个深坑？这篇文章将从**架构原理、缓存机制、调度算法、部署实战、性能调优、Token 计费**六个维度，帮你彻底搞定 vLLM 生产部署。

---

## 第一层：五分钟看懂 vLLM 的核心引擎

大模型推理的本质是一个"逐字吐出"的过程。一次完整的推理分为两个截然不同的阶段：

- **Prefill（预填充）**：把用户的全部输入一次性"读进去"，计算所有 Token 的注意力。这一步是**计算密集型**，你的 GPU 核心在疯狂跑矩阵乘法。
- **Decode（解码）**：逐个生成输出 Token，每一步都依赖前面所有 Token 的 KV Cache。这一步是**访存密集型**，瓶颈在 GPU 显存带宽。

理解这两个阶段的本质差异，是理解 vLLM 所有优化技术的钥匙。

传统的推理框架有两个致命问题：
1. **显存浪费严重**：每个请求的 KV Cache 都要预分配一大块连续的显存空间，即使实际只用了 10%，剩下的 90% 也被锁死。
2. **并发能力极差**：一批请求里，有的早就生成完了，有的还在吐字。传统方案要等最慢的那个结束，才能处理下一批。

vLLM 的核心创新正是围绕这两个问题展开的。

### 1. PagedAttention：显存界的虚拟内存

这是 vLLM 最核心的创新。它借鉴了操作系统的**虚拟内存分页**思想：

```text
传统方式：给每个请求预分配一大块连续显存（就像 MS-DOS 的实模式内存管理）
  请求A: [████████████░░░░░░░░] ← 60% 的预留空间浪费了
  请求B: [██████░░░░░░░░░░░░░░] ← 70% 的预留空间浪费了
  请求C: "抱歉，显存不足，请排队。"

PagedAttention：把显存切成固定大小的页（Block），按需动态分配
  物理显存块:    [页1][页2][页3][页4][页5][页6][页7][页8]
  请求A的页表:    页1 → 页3 → 页5（用多少占多少，不连续也没关系）
  请求B的页表:    页2 → 页4（用多少占多少）
  请求C的页表:    页6 → 页7（之前装不下的请求，现在轻松进来了）
  空闲池:         页8（随时可分配给新请求或现有请求的增长）
```

**关键点**：这些"页"不需要在物理显存上连续排列。就像操作系统的虚拟内存一样，vLLM 维护一张**页表（Block Table）**来进行映射。这个设计颠覆性地做到了三件事：

1. **几乎零浪费**：论文数据显示，KV Cache 的显存浪费从 **60%~80%** 降低到了 **<4%**（唯一的浪费是最后一个 Block 的内部碎片）。
2. **并发翻倍**：同一块 GPU 能塞进 **2~4 倍的并发请求**。
3. **共享复用**：多个请求如果共享相同的前缀（比如系统提示词），可以指向**同一组物理页**，进一步节省空间。

### 2. 连续批处理（Continuous Batching）

传统推理是"静态批处理"——凑够一批，一起跑，一起等，全部结束后再接下一批。这就像餐厅要求每桌客人同时到齐、同时点菜、同时结账。

vLLM 引入了**连续批处理**（也叫 iteration-level scheduling）：

```text
时间线：
  t=0  [请求A-解码] [请求B-解码] [请求C-预填充] [        ]
  t=1  [请求A-解码] [请求B-完成✓] [请求C-解码]  [请求D-新到]
  t=2  [请求A-解码] [请求D-预填充] [请求C-解码]  [        ]
  t=3  [请求A-完成✓] [请求D-解码]  [请求C-完成✓] [请求E-新到]
```

- 某个请求生成完毕 → **立刻**踢出队列，腾出资源
- 新请求到来 → **立刻**插入当前正在运行的批次
- 整个 GPU 时刻保持 **"满载运转"**，没有一个时钟周期在空等

### 3. 分块预填充（Chunked Prefill）——在线服务的延迟救星

连续批处理还有一个隐患：如果有人发了一个 **10,000 Token 的超长文档**，预填充阶段会独占 GPU 几百毫秒，期间其他所有正在解码的请求都被迫停下来等。

分块预填充的解法非常优雅：

```text
调度器维护一个"每轮 Token 预算"（比如 max_num_batched_tokens = 8192）

第 1 轮: [请求A前缀的前2048个Token] + [请求B解码1Token] + [请求C解码1Token] + ...
第 2 轮: [请求A前缀的第2049~4096个Token] + [请求B解码1Token] + [请求C解码1Token] + ...
第 3 轮: [请求A前缀的第4097~6144个Token] + [请求B解码1Token] + [请求C解码1Token] + ...
  ...
第 5 轮: [请求A前缀的剩余Token] + [请求B解码1Token] + [请求C解码1Token] + ...
第 6 轮: [请求A开始解码!] + [请求B解码1Token] + [请求C解码1Token] + ...
```

**核心调度策略**：vLLM V1 引擎默认优先调度**正在解码的请求**，再用剩余预算调度新的预填充块。这意味着用户 B 和 C 几乎感受不到用户 A 的超长输入带来的延迟抖动——Token 一直在流畅地蹦出来。

> **在线服务必开**：`--enable-chunked-prefill`。这不是一个可选项，而是生产环境的标配。

---

## 第二层深水区：APC 前缀缓存——理解它的人都赚到了

如果说 PagedAttention 解决了"显存怎么分配"的问题，那**自动前缀缓存（Automatic Prefix Caching, APC）** 解决的就是"已经算过的东西怎么复用"。

### 为什么 APC 对在线服务至关重要？

在真实的在线推理场景里，请求结构通常长这样：

```text
请求1: [系统提示词 (800 Token) | 多轮对话历史 (2000 Token) | 用户新消息 (50 Token)]
请求2: [系统提示词 (800 Token) | 多轮对话历史 (2000 Token) | 用户新消息 (30 Token)]
请求3: [系统提示词 (800 Token) | 不同用户的对话 (500 Token) | 用户新消息 (80 Token)]
```

请求 1 和请求 2 共享了 **2800 个 Token** 的前缀！请求 3 与它们共享了 **800 个 Token** 的系统提示词前缀。如果每次都从头计算，这是巨大的浪费。

### APC 的工作原理：分块哈希 + 全局哈希表 + LRU 淘汰

APC 的实现精巧而高效，分为三步：

**第一步：分块与哈希（Block Hashing）**

vLLM 把所有 Token 序列按固定大小（默认 16 Token 一块）切成 Block。每个 Block 的唯一标识是一个**链式哈希值**：

```text
哈希计算方式: hash(父Block的哈希 + 当前Block的Token内容)

示例：系统提示词 "You are a helpful AI assistant..." (800 Token)
  Block_0: hash(NULL + tokens[0:16])       = 0xA1B2C3...
  Block_1: hash(0xA1B2C3 + tokens[16:32])  = 0xD4E5F6...
  Block_2: hash(0xD4E5F6 + tokens[32:48])  = 0x789ABC...
  ...     (共 50 个 Block)
```

**为什么要链式哈希？** 因为相同的 16 个 Token 出现在不同的上下文位置时，其注意力计算结果是完全不同的。链式哈希保证了只有**完全相同前缀**的 Block 才会匹配。

**第二步：全局哈希表查找**

vLLM 维护一个全局的 `HashMap<BlockHash, PhysicalBlock>` 映射。当新请求到达时：

```text
新请求: [系统提示词 | 用户对话 | 新消息]
1. 调度器从头计算每个 Block 的哈希值
2. 逐个查询全局哈希表：
   Block_0 (0xA1B2C3) → 命中！直接引用物理 Block #42
   Block_1 (0xD4E5F6) → 命中！直接引用物理 Block #43
   ...
   Block_49 (0x789ABC) → 命中！直接引用物理 Block #91
   Block_50 (0xNEW001) → 未命中。这是用户新消息的开头，需要计算
3. 结论：50 个 Block 的 KV Cache 复用，只需计算 Block_50 开始的新内容
   → Prefill 计算量降低了 98%！
```

**第三步：LRU 淘汰策略**

GPU 显存有限，不可能缓存所有历史请求的 KV Cache。vLLM 使用**引用计数 + LRU（最近最少使用）**策略管理缓存：

```text
每个物理 Block 有两个关键属性：
  - ref_count: 当前有多少活跃请求正在引用这个 Block
  - last_access_time: 最后一次被访问的时间戳

淘汰规则：
  1. ref_count > 0 的 Block 绝不淘汰（正在被使用！）
  2. ref_count = 0 的 Block 进入"候选池"
  3. 当显存不足时，从候选池中淘汰 last_access_time 最早的 Block
  4. 被淘汰的 Block 的哈希值从全局表中删除
```

### APC 的四大使用场景

| 场景 | 可复用的前缀 | 性能收益 |
|------|------------|---------|
| **多轮对话** | 系统提示词 + 历史对话 | 越聊越快，后续轮次预填充时间 ≈ 0 |
| **长文档问答** (RAG) | 几千 Token 的文档片段 | 同一文档的多次提问几乎免费 |
| **代码补全** | 当前文件的已有内容 | 用户每打一个字，增量计算极少 |
| **批量处理同模板** | 相同的指令前缀 | 1000 条相同模板的请求，实际只算 1 次前缀 |

### APC 的限制：什么时候没用？

APC 在以下情况下收益递减或几乎无效：

1. **输出远长于输入**：预填充本身只占总延迟的一小部分，省了也体感不大。
2. **每个请求都完全不同**：没有共享前缀，哈希表查不到任何命中。
3. **缓存 Miss 反而有微小开销**：哈希计算和查表本身需要 CPU 时间（但通常可忽略不计）。

> **关键配置**：启动时加 `--enable-prefix-caching`（在 vLLM V1 中默认开启）。

### 在 API 响应中获取缓存命中数据

很多人不知道，vLLM 可以**在每个请求的响应中精确告诉你有多少 Token 命中了缓存**。你只需要启动时加一个参数：

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --enable-prefix-caching \
  --enable-prompt-tokens-details    # ← 关键参数！开启后 usage 中会出现 cached_tokens
```

开启后，API 响应的 `usage` 字段将包含 `prompt_tokens_details`：

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

**这意味着什么？** 3000 个 Prompt Token 中，有 2800 个直接从缓存复用，只有 200 个需要 GPU 实际计算。**你的成本只有标价的 6.7%，但可以按 3000 Token 全额向用户收费。**

> **对计费系统至关重要**：你的计费中间件应该同时记录 `prompt_tokens`（用户付费依据）和 `cached_tokens`（你的真实成本依据），这两个数字的差值就是你的利润。

### 缓存命中率监控：Prometheus 指标

除了单请求级别的 `cached_tokens`，你还需要**全局缓存命中率**来评估系统整体效率。vLLM V1 使用 Counter 类型指标（替代了旧版已废弃的 Gauge 指标 `gpu_prefix_cache_hit_rate`）：

```text
# V1 前缀缓存指标（Counter 类型，精确可靠）
vllm:prefix_cache_hits              # 命中的缓存 Token 总数 (Counter)
vllm:prefix_cache_queries           # 查询的缓存 Token 总数 (Counter)

# 用 PromQL 计算实时命中率（Grafana 面板用这个）
(rate(vllm:prefix_cache_hits[5m]) / rate(vllm:prefix_cache_queries[5m])) * 100
```

**健康的缓存命中率参考值**：

| 场景 | 期望缓存命中率 | 如果低于该值说明 |
|------|-------------|----------------|
| 多轮对话（同 session） | 80%~95% | Prompt 结构可能不合理，动态内容插入了前缀 |
| RAG 文档问答 | 60%~85% | 文档片段多样性太高，或缓存池太小 |
| 批量同模板处理 | 90%+ | 模板没有固定在最前面 |
| 完全随机请求 | <10% | 正常现象，APC 对此场景无效 |

### 优化缓存命中率的最佳实践

1. **系统提示词放最前面**：静态内容（系统指令、文档片段）放在 Prompt 的最前面，动态内容（用户消息）放后面。这样所有请求能共享最长的公共前缀。
2. **避免在前缀中插入动态元素**：比如 `"当前时间是 2026-04-14 10:00"`。一旦时间变化，整个后续的缓存链都会失效。把时间戳放到 Prompt 尾部。
3. **适当增大 `--gpu-memory-utilization`**：更多显存 = 更大的缓存池 = 更低的 LRU 淘汰频率 = 更高的命中率。
4. **多轮对话保持 session 连续性**：不要每轮都重新拼接完整历史，而是让 vLLM 自然地在缓存中积累。
5. **监控 `cached_tokens` 与 `prompt_tokens` 的比值**：这是你的"利润率"。定期按用户/场景分析这个比值，找出低命中率的异常模式。

---

## 第三层：OpenAI 兼容 API 与高级服务能力

vLLM 最让人惊喜的设计决策之一是：**它原生提供 OpenAI 兼容的 API 接口。** 这意味着你的业务代码不用改一行，只需要把 `base_url` 从 `https://api.openai.com` 换成你自己的地址。

### 最简启动

```bash
# 安装
pip install vllm

# 一行命令启动服务
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --dtype auto \
  --api-key your-secret-key \
  --port 8000 \
  --enable-prefix-caching
```

### 支持的 API 端点

| 端点 | 路径 | 用途 |
|------|------|------|
| **Chat Completions** | `/v1/chat/completions` | 对话补全（最常用） |
| **Completions** | `/v1/completions` | 文本补全 |
| **Responses** | `/v1/responses` | OpenAI Responses API |
| **Embeddings** | `/v1/embeddings` | 向量嵌入 |
| **Models** | `/v1/models` | 模型列表 |
| **Tokenizer** | `/tokenize` / `/detokenize` | Token 编解码（计费辅助） |
| **Transcriptions** | `/v1/audio/transcriptions` | 语音转文字 |
| **Realtime** | `/v1/realtime` | 实时语音（WebSocket） |

### 结构化输出与引导解码

在线服务中，你经常需要模型返回**严格格式化的 JSON**（比如函数调用的参数、API 响应结构）。vLLM 内置了强大的**引导解码（Guided Decoding）** 支持：

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="key")

response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "提取文中的人名和地点"}],
    # vLLM 扩展参数：强制输出符合 JSON Schema
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

vLLM 支持四种约束格式：

| 参数 | 约束类型 | 示例 |
|------|---------|------|
| `guided_json` | JSON Schema | `{"type": "object", ...}` |
| `guided_regex` | 正则表达式 | `"\\d{4}-\\d{2}-\\d{2}"` |
| `guided_choice` | 枚举值 | `["positive", "negative", "neutral"]` |
| `guided_grammar` | EBNF 语法 | 自定义上下文无关文法 |

底层使用 **XGrammar** 引擎（基于下推自动机），通过编译和缓存语法规则实现高性能约束解码，对输出延迟的影响 **< 5%**。

### Tool Calling（工具调用）

vLLM 原生支持 OpenAI 风格的函数调用，配合引导解码确保参数格式正确：

```python
response = client.chat.completions.create(
    model="Qwen/Qwen2.5-72B-Instruct",
    messages=[{"role": "user", "content": "北京明天天气怎么样？"}],
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

> **提示**：设置 `parallel_tool_calls=false` 可强制每次只返回 0~1 个工具调用，适合不支持并行调用的模型。

### Multi-LoRA 服务：一个基座服务多个客户

在商业化场景中，不同客户可能需要不同的微调模型。传统做法是为每个客户部署独立实例，显存开销巨大。

vLLM 支持在**同一个基座模型上动态加载多个 LoRA 适配器**：

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --enable-lora \
  --max-loras 8 \
  --lora-modules customer-a=/path/to/lora-a \
                  customer-b=/path/to/lora-b
```

```python
# 不同客户使用不同的 LoRA 适配器
response = client.chat.completions.create(
    model="customer-a",  # 指定使用哪个 LoRA
    messages=[{"role": "user", "content": "帮我写一封邮件"}],
)
```

底层实现：vLLM 使用**批量 GEMM**（batched GEMM）将使用不同 LoRA 适配器的序列动态分组到同一个批次中计算，开销极低。每个 LoRA 适配器通常只有几十 MB，而基座模型可能占用上百 GB。

### Docker 生产部署

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
  --enable-prompt-tokens-details    # 让计费系统获取 cached_tokens
```

> **⚠️ 必须加 `--ipc=host`**：vLLM 使用 PyTorch 的共享内存进行多进程通信，不加这个参数在容器内会直接报错。这是新手最常踩的坑。

---

## 第四层：性能调优——让每一块 GPU 榨出最后一滴算力

### 在线推理服务的核心指标

在讨论调优之前，先明确你到底在优化什么。在线服务有**三个互相拉扯的指标**：

| 指标 | 全称 | 含义 | 优化方向 |
|------|------|------|---------|
| **TTFT** | Time to First Token | 发送请求到收到第一个字的时间 | 越低 → 用户感知"响应快" |
| **ITL** | Inter-Token Latency | 每个 Token 之间的输出间隔 | 越低 → 打字看起来更流畅 |
| **吞吐量** | Throughput (tokens/s) | 单位时间处理的总 Token 数 | 越高 → 每个 Token 的计算成本越低 |

**核心矛盾**：吞吐量和延迟是天然对立的。塞更多请求进批次 → 吞吐量上升 → 但每个请求分到的算力减少 → 延迟上升。线上服务需要在两者之间找到甜区。

### 全参数调优指南

```bash
vllm serve Qwen/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \     # [1] 显存利用率
  --max-model-len 8192 \              # [2] 最大上下文长度
  --max-num-seqs 256 \                # [3] 最大并发请求数
  --max-num-batched-tokens 16384 \    # [4] 每批最大 Token 数
  --enable-chunked-prefill \          # [5] 分块预填充
  --enable-prefix-caching \           # [6] APC 前缀缓存
  --quantization fp8 \                # [7] 量化方案
  --kv-cache-dtype fp8_e5m2 \         # [8] KV Cache 量化
  --tensor-parallel-size 2 \          # [9] 张量并行
  --num-speculative-tokens 5 \        # [10] 推测解码
  --speculative-model Qwen/Qwen2.5-1.5B-Instruct
```

#### [1] `--gpu-memory-utilization` 显存利用率

设为 `0.90` 意味着 vLLM 会使用 90% 的 GPU 显存来存储 KV Cache。剩下 10% 作为安全缓冲——留给 PyTorch 的临时张量、CUDA 的内部分配等。

```text
太低 (0.70)：浪费了 30% 的显存 → APC 缓存池太小 → 缓存命中率暴跌 → 并发能力打折
太高 (0.98)：几乎没有缓冲 → 流量突增时 OOM → 引擎崩溃重启 → 所有在途请求丢失
甜区 (0.90~0.95)：平衡安全与性能。流量稳定后可小心地逐步提高
```

#### [2] `--max-model-len` 最大上下文长度

这是最容易被忽略的**致命参数**。vLLM 会根据这个值预计算 KV Cache 的总空间，进而决定最大并发数。

```text
默认值 = 模型配置文件中的最大值（如 Qwen2.5 的 131,072）
你的业务实际最大对话长度可能只有 4,096

后果：
  使用默认值 131072 → KV Cache 预留空间膨胀 30 倍 → 并发数从 50 降到 2
  设为实际需求 8192  → KV Cache 合理预留 → 并发数翻回来

这可能是你遇到的 #1 性能杀手。
```

> **黄金法则**：如果你的业务对话永远不会超过 8K Token，就设为 `8192`。这一项改动就能让并发量翻好几倍。

#### [3] `--max-num-seqs` 最大并发数

控制调度器同时处理的最大请求数。

```text
在线聊天场景（低延迟优先）：64 ~ 256
  → 每个请求分到足够的算力，延迟有保障

批处理 / 离线推理（高吞吐优先）：2048 ~ 4096
  → GPU 被塞满，吞吐拉满，但单请求延迟会上升

自适应思路：监控 vllm:num_requests_waiting
  → 如果长期 > 0，说明请求在排队，考虑增大 max-num-seqs 或加机器
  → 如果长期 = 0 且 GPU 利用率 < 50%，说明太空闲，可以减小此值节约资源
```

#### [4] `--max-num-batched-tokens` 每批 Token 预算

这是分块预填充的核心参数。控制调度器每次迭代最多处理多少 Token。

- 设大（32768）→ 吞吐高，但长 Prompt 可能独占一轮
- 设小（8192）→ 延迟平稳，预填充被充分分块
- 在线服务推荐 `8192 ~ 16384`

#### [7] 模型量化方案选型

| 你的 GPU | 推荐方案 | 精度损失 | 效果 |
|---------|---------|---------|------|
| **H100/H800** | FP8 (`--quantization fp8`) | <1% | 吞吐提升 ~1.5x，**零校准**开箱即用 |
| **A100/L40S** | INT8 GPTQ/AWQ | ≈0% | 显存减半，速度持平或略快 |
| **Blackwell B200** | NVFP4 | ≤1% | 吞吐是 FP8 的 **3x** |
| **任何卡** | INT4 AWQ | 1~3% | 极限压缩，单卡跑更大模型 |

#### [8] KV Cache 量化——容易被忽视的隐藏加速器

除了模型权重量化，vLLM 还支持对 KV Cache 本身做量化。这意味着每个请求的缓存占用更少显存，同样的 GPU 能服务更多并发：

```bash
--kv-cache-dtype fp8_e5m2  # 将 KV Cache 从 FP16/BF16 压缩为 FP8
```

效果：KV Cache 显存占用**减半**，对输出质量的影响极小（因为注意力值的动态范围通常不大）。这在长上下文场景（8K-128K）中收益尤其明显。

#### [9] 张量并行的正确姿势

当模型太大、单卡装不下时，用多块 GPU 分担。但不是越多越好：

```text
常见错误：有 8 张卡 → 设 TP=8 → 发现吞吐还不如 TP=4 的时候

原因：TP 越大，每轮都要做 AllReduce 通信。
      8 卡间的通信开销可能吃掉你新增算力的 40%

正确策略：
  1. 用最小 TP 让模型装得下（如 70B FP8 在 2 张 H100 上 → TP=2）
  2. 多余的卡用来多开实例
  3. 前面放负载均衡

  结论：2 个 TP=2 实例 通常比 1 个 TP=4 实例 吞吐高 30%~50%
```

> **进阶**：检查 GPU 拓扑 `nvidia-smi topo -m`。TP 的多卡尽量选 NVLink 直连的对，避免走 PCIe 桥接，通信延迟差 5~10 倍。

#### [10] 推测解码：低并发场景的延迟黑科技

用一个小模型快速"猜"后续 Token，然后大模型一次性验证。猜对了跳过，猜错了重来。

```bash
--speculative-model Qwen/Qwen2.5-1.5B-Instruct \
--num-speculative-tokens 5
```

vLLM 支持多种策略：**n-gram（基于已生成文本的模式匹配）、EAGLE（自回归头预测）、DFlash** 等。

```text
在低并发时（< 10 QPS）：延迟提升 2~5 倍
在高并发时（> 100 QPS）：收益递减（GPU 已经被连续批处理填满了）

适用场景：实时对话应用、内部工具、延迟敏感的 Agent 调用
不适用：高并发 API 服务
```

---

## 第五层：分离式推理——超大规模服务的终极架构

当你的服务规模达到**每秒数百甚至数千个请求**时，即使是上述所有优化技术也会遇到瓶颈。因为 Prefill 和 Decode 的资源需求截然不同，它们互相干扰：

```text
Prefill（预填充）: 计算密集型，需要强大的 FLOPs（浮点算力）
Decode（解码）:   访存密集型，需要高内存带宽

在同一个 GPU 上混跑两种任务 → 资源分配永远不是最优的
```

vLLM 支持**分离式推理（Disaggregated Prefill-Decode）**：

```text
                    ┌──────────────────┐
                    │   请求路由器      │
                    │  (Service Proxy)  │
                    └──────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌──────────────────┐     ┌──────────────────┐
    │  Prefill 集群     │     │  Decode 集群      │
    │  (计算型GPU)      │     │  (高带宽GPU)      │
    │  H100 SXM / B200 │     │  L40S / A100      │
    └────────┬─────────┘     └────────▲─────────┘
             │                        │
             └────── KV Cache 传输 ───┘
                   (NIXL / RDMA)
```

**KV Cache 传输**：预填充完成后，生成的 KV Cache 通过 NVIDIA 的 **NIXL**（Inference Xfer Library）以 RDMA/GPUDirect 方式高速跨网络传输到 Decode 节点。延迟通常在**几毫秒**级别。

**核心优势**：
1. **独立扩缩容**：Prefill 和 Decode 按各自的流量瓶颈独立扩缩
2. **硬件异构**：Prefill 用性能型 GPU（H100），Decode 用性价比型 GPU（L40S）
3. **消除干扰**：长 Prompt 的 Prefill 不再阻塞正在 Decode 的请求

> 这是目前头部云厂商（如 Anyscale、AWS、字节跳动）部署超大规模 LLM 推理服务的主流架构。

---

## 第六层：Token 计费与计量——在线推理服务的商业生命线

如果你在做一个类似 OpenAI API 的商业化推理服务，Token 用量的精确计量就是你的**账单系统**。

### vLLM 返回的 Token 用量

vLLM 在每个响应中返回 `usage` 字段。加上 `--enable-prompt-tokens-details` 启动参数后，还会返回缓存命中详情：

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

### 计费系统架构

核心难题：**vLLM 只知道"消耗了多少 Token"，不知道"是谁消耗的"。** 需要在 vLLM 前面搭代理层解决身份归属。

```text
用户请求 → [API 网关] → [vLLM 推理引擎]
              ↓                   ↓
         身份认证 / 限流       生成回答 + usage
              ↓                   ↓
         [计费中间件] ←————————— 提取 usage
              ↓
         写入计费数据库
         (user_id, org_id, prompt_tokens, completion_tokens, model, timestamp)
```

**推荐三层架构：**

| 层级 | 技术选型 | 职责 |
|------|---------|------|
| **网关层** | Nginx / Kong / Traefik | API Key 验证、限流、路由、多实例负载均衡 |
| **计费中间件** | 自研 Python/Go 微服务 | 拦截响应提取 usage、关联用户身份、写入时序数据库 |
| **计费平台** | Stripe Billing / Lago / 自研 | 账单生成、额度管理、用量看板、webhook 告警 |

### Prometheus 指标体系：运营的眼睛

vLLM 内置了丰富的 Prometheus 指标端点（`http://localhost:8000/metrics`）：

```text
# ─── Token 计量 ───
vllm:prompt_tokens_total            # 累计输入 Token 总数 (Counter)
vllm:generation_tokens_total        # 累计输出 Token 总数 (Counter)
vllm:request_prompt_tokens          # 每请求输入 Token 分布 (Histogram)
vllm:request_generation_tokens      # 每请求输出 Token 分布 (Histogram)

# ─── 缓存效率 ───（V1 新指标，替代已废弃的 gpu_prefix_cache_hit_rate）
vllm:prefix_cache_hits              # 缓存命中 Token 总数 (Counter)
vllm:prefix_cache_queries           # 缓存查询 Token 总数 (Counter)
vllm:prompt_tokens_cached           # 已缓存的 Prompt Token 数
vllm:prompt_tokens_recomputed       # 被缓存但仍需重算的 Token 数

# ─── 延迟指标 ───
vllm:time_to_first_token_seconds    # 首 Token 延迟 TTFT (Histogram)
vllm:inter_token_latency_seconds    # Token 间延迟 ITL (Histogram)
vllm:e2e_request_latency_seconds    # 端到端请求延迟 (Histogram)

# ─── 资源饱和度 ───
vllm:gpu_cache_usage_perc           # KV Cache 显存占用比（走向 1.0 就危险了！）
vllm:num_requests_running           # 正在执行的请求数
vllm:num_requests_waiting           # 排队等待的请求数

# ─── 吞吐量 ───
vllm:num_preemptions_total          # 请求被抢占次数（如果频繁 → 显存不够）
```

> **⚠️ 关键配置**：vLLM 的 API 服务使用多进程架构。**必须设置** `PROMETHEUS_MULTIPROC_DIR` 环境变量指向一个共享临时目录，否则 Prometheus 指标数据会丢失或不一致。

**Grafana 看板建议**：

| 面板 | PromQL | 告警阈值 | 含义 |
|------|--------|---------|------|
| **🔥 缓存命中率** | `rate(vllm:prefix_cache_hits[5m]) / rate(vllm:prefix_cache_queries[5m]) * 100` | <50% 持续 10min | 缓存效率低，利润下降 |
| Token 吞吐量 | `rate(vllm:generation_tokens_total[5m])` | 突降 >50% | 引擎可能卡住 |
| KV Cache 使用率 | `vllm:gpu_cache_usage_perc` | >0.95 | 即将 OOM |
| 请求排队长度 | `vllm:num_requests_waiting` | >100 持续 1min | 需要扩容 |
| P99 首Token延迟 | `histogram_quantile(0.99, rate(vllm:time_to_first_token_seconds_bucket[5m]))` | >3s | 用户体验恶化 |
| 抢占次数 | `rate(vllm:num_preemptions_total[5m])` | >0 持续 | 显存严重不足 |

### Token 计费的五大陷阱

**陷阱一：前缀缓存命中的 Token 要不要收费？**

APC 命中后，那些 Prompt Token 几乎不消耗 GPU 计算。但从用户视角看，它们确实占用了上下文窗口，影响了模型的输出。

```text
你的真实计算成本：
  请求总 Prompt = 3000 Token
  APC 命中前缀 = 2800 Token（成本 ≈ 0）
  实际需要计算 = 200 Token

用户应付费用：
  按行业惯例：仍按 3000 prompt_tokens 全额收费

你的利润空间 = 用户支付的 3000 Token 费用 - 你实际 200 Token 的 GPU 成本
这就是自建推理服务相比直接转卖 OpenAI API 的核心利润来源
```

> **结论**：前缀缓存是你的利润引擎。缓存命中率越高，利润越厚。

**陷阱二：流式输出（Streaming）的 Token 统计**

流式输出时 usage 只在**最后一个 chunk**（`finish_reason != null` 的那个）中返回。中间的 chunk 里 usage 字段可能为 null 或缺失。

```python
# ❌ 错误做法：只读第一个 chunk 的 usage
# ✅ 正确做法：
async for chunk in response:
    if chunk.usage is not None:
        final_usage = chunk.usage  # 只有最后一个 chunk 才有完整的 usage
```

**陷阱三：推测解码产生的"废弃 Token"**

推测解码中，小模型会预测多个候选 Token，其中被大模型拒绝的部分实际上浪费了 GPU 计算，但不应该向用户收费（因为它们没有出现在最终输出中）。vLLM 的 `usage.completion_tokens` 已经**自动剔除了这些废弃 Token**，放心使用。

**陷阱四：`/tokenize` 端点的计费盲区**

vLLM 提供了 `/tokenize` 端点用于预先统计 Token 数。但要注意：Chat Template 的特殊 Token（如 `<|im_start|>`, `<|im_end|>`）也会被计入。你的计费系统和 vLLM 使用的 tokenizer 必须完全一致，否则会出现账单争议。

**陷阱五：多模态输入的 Token 计算**

如果使用多模态模型（如 Qwen-VL），图像会被编码为大量的视觉 Token（通常一张图 = 几百到几千 Token）。这些 Token 同样反映在 `prompt_tokens` 中，需要在计费策略中单独考虑（有些平台对图像 Token 单独定价）。

---

## 第七层：成本分析——自建 vs 购买 API

最终的商业问题：自建 vLLM 推理服务，和直接购买 OpenAI / Claude API，到底哪个更划算？

```text
以 Qwen2.5-72B (FP8 量化) 在 2 张 H100 上部署为例：

GPU 成本：
  云厂商 H100 SXM 80GB ≈ $3.5/小时/张
  2 张 = $7/小时 = $168/天 = $5,040/月

vLLM 吞吐能力（FP8 + APC + Chunked Prefill）：
  ≈ 4,000 tokens/s (包含 input + output)
  ≈ 345,600,000 tokens/天

与 OpenAI GPT-4o 对比（$2.50/M input + $10/M output, 假设 3:1 比例）：
  同等 Token 量的 OpenAI 费用 ≈ $1,500/天

  自建成本 $168/天 vs OpenAI $1,500/天
  → 自建便宜约 9 倍

但别忘了额外成本：
  + 运维人力（监控、排障、升级）
  + 网络带宽和存储
  + 模型更新和测试
  + 冗余和高可用

经验法则：
  日均 Token < 1000 万 → 直接买 API，省心
  日均 Token 1000 万 ~ 1 亿 → 根据团队能力评估
  日均 Token > 1 亿 → 自建几乎是必选，成本优势碾压
```

---

## 生产部署终极 Checklist

### 一、GPU 与计算层

| 项目 | 推荐方案 | 说明 |
|------|---------|------|
| GPU 型号 | H100 SXM 80GB / A100 80GB | H100 支持 FP8 零校准量化，性价比最优 |
| GPU 互联 | NVLink 4.0 / NVSwitch | TP 多卡必须用 NVLink，PCIe 桥接性能差 5-10x |
| CPU 配置 | ≥ (2 + N) 物理核 (N=GPU 数) | vLLM 的 Engine Core 进程对 CPU 敏感，不足会导致调度延迟 |
| 内存 | ≥ 模型文件大小 × 2 | 模型加载时需要 CPU 内存暂存 |

```text
✅ 检查 GPU 拓扑: nvidia-smi topo -m（确保 TP 的卡对是 NVLink 直连）
✅ 配置 NVIDIA Container Toolkit（Docker GPU 支持）
✅ NCCL 优化: 多节点时设置 NCCL_IB_HCA=mlx5（InfiniBand）
```

### 二、存储与模型加载层

| 项目 | 推荐方案 | 说明 |
|------|---------|------|
| 模型存储 | 本地 NVMe SSD / 高速 NFS | 冷启动从 HuggingFace 拉取太慢（70B 模型 > 10 分钟） |
| 模型管理 | 预下载 + 版本目录 | `/models/v1/`, `/models/v2/` 支持灰度切换 |
| K8s 场景 | PersistentVolume + InitContainer | 用 Job 预下载到 PV，避免多 Pod 竞争下载 |

```text
✅ 挂载模型文件到容器内 (-v /path/to/models:/models)
✅ 模型文件做校验和检查，避免损坏导致沉默错误
```

### 三、网络与安全层

| 项目 | 推荐方案 | 说明 |
|------|---------|------|
| 多节点互联 | InfiniBand RDMA / RoCE | 分离式推理的 KV Cache 传输必须低延迟 |
| 对外暴露 | 反向代理 (Nginx/Kong/Traefik) | vLLM 内置的 `--api-key` 仅用于基本认证，不够安全 |
| 网络隔离 | 私有 VPC / 专用网段 | vLLM 节点间通信默认不加密 |
| VLLM_HOST_IP | 设为私网 IP | 避免绑定到公网接口 |

```text
✅ 使用 Docker: --ipc=host（PyTorch 共享内存必须）
✅ 配置反向代理处理 TLS、认证和限流
✅ 设置 VLLM_HOST_IP 为私网接口地址
```

### 四、vLLM 引擎参数层

```bash
vllm serve /models/Qwen2.5-72B-Instruct \
  --gpu-memory-utilization 0.90 \           # 甜区 0.90~0.95
  --max-model-len 8192 \                    # ⚠️ 最关键参数！按业务实际设置
  --enable-chunked-prefill \                # 在线服务必开
  --enable-prefix-caching \                 # 利润引擎
  --enable-prompt-tokens-details \          # 让 API 返回 cached_tokens
  --max-num-seqs 256 \                      # 在线: 128~256
  --max-num-batched-tokens 16384 \          # Token 预算
  --quantization fp8 \                      # H100 首选
  --kv-cache-dtype fp8_e5m2 \               # 长上下文场景
  --tensor-parallel-size 2                  # 最小 TP + 多实例
```

```text
✅ --max-model-len 切勿用默认值（一个参数可能让并发翻 10 倍）
✅ 多卡部署: 最小 TP 数 + 多实例 + 前置负载均衡
✅ 低延迟场景按需开启推测解码
✅ 多租户按需开启 Multi-LoRA
✅ 结构化输出按需配置 XGrammar 引导解码
```

### 五、监控与可观测性层

| 组件 | 推荐方案 | 说明 |
|------|---------|------|
| 指标采集 | Prometheus | 采集 vLLM `/metrics` 端点 |
| 可视化 | Grafana | 看板 + 告警规则 |
| 日志 | ELK / Loki | 请求级别的 trace 日志 |
| 分布式追踪 | OpenTelemetry | 端到端延迟分析（网关 → vLLM → 响应） |

```text
✅ 设置 PROMETHEUS_MULTIPROC_DIR（多进程指标聚合必须）
✅ Grafana 看板必看 6 个面板:
   - 缓存命中率: rate(vllm:prefix_cache_hits[5m]) / rate(vllm:prefix_cache_queries[5m])
   - KV Cache 使用率: vllm:gpu_cache_usage_perc（>0.95 告警）
   - Token 吞吐量: rate(vllm:generation_tokens_total[5m])
   - 请求排队长度: vllm:num_requests_waiting（>100 告警）
   - P99 TTFT: histogram_quantile(0.99, ...)（>3s 告警）
   - 抢占次数: rate(vllm:num_preemptions_total[5m])（>0 告警）
```

### 六、计费与业务层

| 组件 | 推荐方案 | 说明 |
|------|---------|------|
| API 网关 | Kong / Nginx / Traefik | API Key 验证、限流、路由 |
| 计费中间件 | 自研 Python/Go 微服务 | 拦截 usage + cached_tokens |
| 计费平台 | Stripe / Lago / 自研 | 账单生成、额度管理 |
| 数据库 | TimescaleDB / ClickHouse | 时序存储计费记录 |

```text
✅ 计费中间件同时记录 prompt_tokens 和 cached_tokens
   → prompt_tokens = 用户账单依据
   → cached_tokens = 你的成本优化依据
   → 差值 = 利润空间
✅ 流式场景正确处理最后一个 chunk 的 usage
✅ 确保 tokenizer 与 vLLM 完全一致（避免账单争议）
```

### 七、高可用层

| 项目 | 推荐方案 | 说明 |
|------|---------|------|
| 负载均衡 | Nginx / Traefik / K8s Service | 多实例流量分发 |
| 健康检查 | 主动推理请求探针 | 不要只检测进程存活 |
| 编排 | Kubernetes + KEDA | 基于队列深度自动扩缩容 |
| 滚动更新 | 先起新实例再停旧实例 | 模型加载需要几十秒到几分钟 |

```text
✅ K8s: 配置 emptyDir medium=Memory 给 /dev/shm（替代 --ipc=host）
✅ Liveness 探针: 检测进程存活
✅ Readiness 探针: 发送实际推理请求验证模型已就绪
✅ 模型文件本地缓存 + 版本管理
```

---

## 总结

```text
                         ┌─────────────────────┐
                         │     API 网关层       │
                         │  认证/限流/负载均衡   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   vLLM 推理引擎      │
                         │                     │
                         │  PagedAttention      │ ← 显存利用率 >96%
                         │  连续批处理          │ ← GPU 时刻满载
                         │  分块预填充          │ ← 消灭延迟毛刺
                         │  APC 前缀缓存        │ ← 计算复用 = 利润
                         │  FP8 量化            │ ← 吞吐再翻 1.5x
                         │  KV Cache FP8        │ ← 并发再翻 2x
                         │  推测解码            │ ← 延迟降 2-5x
                         │  Multi-LoRA          │ ← 一机服务多客户
                         │  结构化输出          │ ← 工具调用不出格式错
                         │                     │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼──────┐ ┌─────▼──────┐ ┌──────▼───────┐
           │ Prometheus     │ │ 计费中间件  │ │ 业务应用     │
           │ + Grafana      │ │ Token 计量  │ │ (OpenAI SDK) │
           └───────────────┘ └────────────┘ └──────────────┘
```

**核心行动建议**：

1. **先跑起来再调优**：用 `vllm serve` 一行命令启动，验证业务逻辑跑通，再逐步开启量化、调参数。
2. **`max-model-len` 是第一优先级**：这一个参数可能比其他所有优化加起来效果都大。
3. **监控先行**：先搭好 Prometheus + Grafana，看着数据调。`gpu_cache_usage_perc` 是单一最重要的指标。
4. **缓存命中率 = 利润率**：持续追踪 APC 命中率，优化 Prompt 结构让静态内容前置。
5. **计费做在网关层**：不要改 vLLM 源码，在网关层拦截 `usage` 字段是最干净的方案。

vLLM 的迭代速度极快（几乎每周都有新版本），建议持续关注其 [官方文档](https://docs.vllm.ai/) 和 [GitHub Releases](https://github.com/vllm-project/vllm/releases)。
