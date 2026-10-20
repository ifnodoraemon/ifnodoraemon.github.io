---
title: vLLM 在线推理服务实战：从架构原理到 Token 计费，一文搞定生产部署
slug: vllm-serving-guide
date: 2026-04-14
tag: 服务部署
tagClass: tag-cyan
category: 推理系统
description: 深入浅出解析 vLLM 核心架构（PagedAttention、连续批处理、APC 前缀缓存、推测解码），面向在线推理服务场景，手把手教你搭建 OpenAI 兼容 API、调优性能参数、搭建 Token 计费体系。附完整 Docker 部署方案与 Prometheus 监控配置。
featured: true
featuredStats:
  - label: 核心技术
    value: 6+
  - label: 调优参数
    value: 10+
  - label: 部署方案
    value: 3
updated: 2026-10-20
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

**核心调度策略**：vLLM V1 引擎（v0.29.0）默认优先调度**正在解码的请求**，再用剩余预算调度新的预填充块。这意味着用户 B 和 C 几乎感受不到用户 A 的超长输入带来的延迟抖动——Token 一直在流畅地蹦出来。

> **在线服务必开**：`--enable-chunked-prefill`。这不是一个可选项，而是生产环境的标配。

---

## 第二层：APC 前缀缓存与计算复用
> [!TIP]
> **显存容量与吞吐快速核算**：部署前不确定显卡是否会 OOM？可通过站内交互工具：[LLM 显存占用与吞吐估算器](/tools/) 输入模型权重与预期并发数，快速测算最佳 `gpu_memory_utilization` 与最大并发上限。


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

| 场景 | 可复用的前缀 | 收益条件 |
|------|------------|---------|
| 多轮对话 | 系统提示词与已有历史 | 历史前缀未变且缓存未被淘汰 |
| 文档问答 | 重复使用的文档片段 | 文档排列与 Token 序列一致 |
| 代码补全 | 文件开头的未变部分 | 编辑位置之前有足够长的共同前缀 |
| 批量模板 | 相同的指令开头 | 前缀块已完成计算且仍驻留缓存 |

### APC 的限制：什么时候没用？

APC 在以下情况下收益递减或几乎无效：

1. **输出远长于输入**：预填充本身只占总延迟的一小部分，省了也体感不大。
2. **每个请求都完全不同**：没有共享前缀，哈希表查不到任何命中。
3. **缓存 Miss 反而有微小开销**：哈希计算和查表本身需要 CPU 时间（但通常可忽略不计）。

> **关键配置**：启动时加 `--enable-prefix-caching`（在 vLLM V1 引擎 / v0.29.0 中默认开启）。

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

这表示 2800 个输入 Token 可复用前缀 KV，未缓存输入占 6.7%。这个比例不是总成本比例：解码、缓存读取、显存驻留、空闲算力与运维仍有成本。

> 同时记录 `prompt_tokens`、`cached_tokens`、输出 Token 和请求时延。收费规则应按服务合同明确披露；缓存命中量本身不能换算为利润。

### 缓存命中率监控：Prometheus 指标

除了单请求级别的 `cached_tokens`，你还需要**全局缓存命中率**来评估系统整体效率。vLLM V1 引擎（v0.29.0）使用 Counter 类型指标（替代了旧版已废弃的 Gauge 指标 `gpu_prefix_cache_hit_rate`）：

```text
# V1 前缀缓存指标（Counter 类型，精确可靠）
vllm:prefix_cache_hits_total              # 命中的缓存 Token 总数 (Counter)
vllm:prefix_cache_queries_total           # 查询的缓存 Token 总数 (Counter)

# 用 PromQL 计算实时命中率（Grafana 面板用这个）
(rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m])) * 100
```

命中率没有统一健康阈值。先按工作负载记录冷缓存与热缓存基线，再结合 TTFT、输出速度、缓存淘汰与租户隔离设置告警。

### 优化缓存命中率的最佳实践

1. **系统提示词放最前面**：静态内容（系统指令、文档片段）放在 Prompt 的最前面，动态内容（用户消息）放后面。这样所有请求能共享最长的公共前缀。
2. **避免在前缀中插入动态元素**：比如 `"当前时间是 2026-04-14 10:00"`。一旦时间变化，整个后续的缓存链都会失效。把时间戳放到 Prompt 尾部。
3. **适当增大 `--gpu-memory-utilization`**：更多显存 = 更大的缓存池 = 更低的 LRU 淘汰频率 = 更高的命中率。
4. **多轮对话保持 session 连续性**：不要每轮都重新拼接完整历史，而是让 vLLM 自然地在缓存中积累。
5. **按场景追踪命中率**：比较 `cached_tokens` 与输入量，并结合 GPU 时间和成本核算收益，不把命中率称为利润率。

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
  vllm/vllm-openai:v0.29.0 \
  --model /models/Qwen2.5-72B-Instruct \
  --dtype auto \
  --gpu-memory-utilization 0.90 \
  --max-model-len 8192 \
  --enable-prefix-caching \
  --enable-chunked-prefill \
  --enable-prompt-tokens-details    # 让计费系统获取 cached_tokens
```

> 多进程通信需要足够共享内存；可选 `--ipc=host`，也可以在隔离 IPC 命名空间中配置合适的 `--shm-size`。应按实际进程通信需求与部署边界选择。

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
# 全参数调优生产启动命令
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

#### [1] `--gpu-memory-utilization`：总执行器预算

`0.90` 表示引擎使用整卡显存的预算比例，包含权重、激活、图捕获和其他运行时开销，剩余部分才用于 KV。vLLM 0.29 参数文档默认值为 0.92，其他版本应单独核对。预算过低可能装不下模型，过高可能与额外分配冲突；没有对所有负载通用的“甜区”。

#### [2] `--max-model-len`：输入与输出总长度上限

这是请求长度约束，也会参与可用 KV 容量检查与部分运行时规划。KV 块池主要按显存预算和启动画像确定，不是给每个请求预留完整最大窗口，因此把 131072 改为 8192 不代表 KV 总量自动缩小 16 倍或并发固定增加。仍应按业务限制总长度，并用启动日志和实际长请求压测判断容量。

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

#### [7-8] 权重与 KV 量化应分别验证

FP8、AWQ、GPTQ 与 NVFP4 需要相应 GPU、checkpoint 布局和 kernel 支持。不能按 GPU 型号直接承诺“固定 1% 以内损失”或“固定两倍吞吐”。仅权重量化可减少访存；大 batch 下反量化与计算开销可能抵消收益。

`--kv-cache-dtype fp8_e5m2` 是一种可选的缓存格式示例。相对 BF16/FP16，其数值存储位宽减半，但 scale、缓存布局和运行时开销仍存在，并发不会必然翻倍。验证后端支持、尺度来源、长上下文和业务质量后再上线。详见 [量化精度指南](/articles/quantization-precision-guide/)。

#### [9] 张量并行与副本数

TP 将模型计算切分到多张 GPU，额外引入层间通信。较小 TP 加多副本可能提高吞吐，较大 TP 也可能降低单请求时延；应在相同 GPU 总数、精度、长度和 SLO 下比较。模型装得下只是起点，不能承诺固定 30%～50% 提升。

使用 `nvidia-smi topo -m` 核实互联。NVLink/NVSwitch、PCIe 与跨节点网络的带宽及延迟不同；拓扑和并行布局需要一起验证。

#### [10] 推测解码

小模型或辅助预测头生成候选，目标模型验证后接受或修正。收益取决于接受率、draft 成本、批量、目标模型和后端，不能只按 QPS 划分固定加速区间。

vLLM 0.29 使用 JSON 配置接口，例如：

```bash
--speculative-config '{"method":"draft_model","model":"Qwen/Qwen2.5-1.5B-Instruct","num_speculative_tokens":5}'
```

此片段用于已有启动命令；draft 与目标模型的 tokenizer、架构和后端必须兼容。它不是任意目标模型均可直接使用的通用配方。先测正常解码，再比较相同 SLO 下的延迟和吞吐。

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
vllm:prefix_cache_hits_total              # 缓存命中 Token 总数 (Counter)
vllm:prefix_cache_queries_total           # 缓存查询 Token 总数 (Counter)
vllm:prompt_tokens_cached_total           # 已缓存的 Prompt Token 数

# ─── 延迟指标 ───
vllm:time_to_first_token_seconds    # 首 Token 延迟 TTFT (Histogram)
vllm:inter_token_latency_seconds    # Token 间延迟 ITL (Histogram)
vllm:e2e_request_latency_seconds    # 端到端请求延迟 (Histogram)

# ─── 资源饱和度 ───
vllm:kv_cache_usage_perc            # KV Cache 显存占用比（取值 0~1；接近 1 表示缓存块紧张，非整卡显存比例）
vllm:num_requests_running           # 正在执行的请求数
vllm:num_requests_waiting           # 排队等待的请求数

# ─── 吞吐量 ───
vllm:num_preemptions_total          # 请求被抢占次数（如果频繁 → 显存不够）
```

> vLLM 的标准服务通常会初始化多进程指标目录；自定义进程启动方式时，应按对应版本实现管理 `PROMETHEUS_MULTIPROC_DIR` 的生命周期，避免复用旧进程数据。

**Grafana 看板建议**：

| 面板 | PromQL | 告警阈值 | 含义 |
|------|--------|---------|------|
| **🔥 缓存命中率** | `rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m]) * 100` | <50% 持续 10min | 缓存效率低，利润下降 |
| Token 吞吐量 | `rate(vllm:generation_tokens_total[5m])` | 突降 >50% | 引擎可能卡住 |
| KV Cache 使用率 | `vllm:kv_cache_usage_perc` | >0.95 | 缓存块压力较高，结合抢占与排队判断 |
| 请求排队长度 | `vllm:num_requests_waiting` | >100 持续 1min | 需要扩容 |
| P99 首Token延迟 | `histogram_quantile(0.99, rate(vllm:time_to_first_token_seconds_bucket[5m]))` | >3s | 用户体验恶化 |
| 抢占次数 | `rate(vllm:num_preemptions_total[5m])` | >0 持续 | 显存严重不足 |

### Token 计费的五大陷阱

**陷阱一：把缓存命中量当成利润**

以 3000 输入 Token、2800 缓存命中为例，只能得出未缓存输入为 200 Token。缓存命中减少重复预填充，但不免除后续解码、KV 访存和固定成本。缓存 Token 是否折价由你的定价合同决定，没有“行业统一全价收费”规则。评估收益应使用相同流量下的实际 GPU 时间、延迟与整机成本。

**陷阱二：流式输出（Streaming）的 Token 统计**

请求中开启 `stream_options={"include_usage": True}` 后，流结束前可收到携带总 usage 的额外 chunk，其 `choices` 可能为空。不要依赖 `finish_reason` 判定计量事件；应检查 `chunk.usage`。断连可能收不到最终 usage，需要单独记录未完整结算的请求。

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

先确认两条路线达到相同业务验收要求，再比较成本。不同能力模型处理相同 Token 数，不等于提供了相同服务。

```text
API 每日成本 = 输入量 × 输入单价 + 输出量 × 输出单价
             + 缓存写入/读取/存储 + 工具与平台费用
自建每日成本 = GPU/整机租用或折旧 + 运维 + 网络存储
             + 冗余容量 + 模型评测与更新
```

单价需统一为“每 Token”或“每百万 Token”，不能混算。使用自己压测得到的 SLO 内吞吐、实际利用率及峰谷流量，确认容量是否够用；没有日志支撑的 4000 tokens/s 或“日均一亿 Token 必须自建”不是通用结论。开源模型的质量差异、冷启动和故障备用也需要计入。更完整的容量推导见 [多机部署指南](/articles/deepseek-v4-kimi-k3-deployment-guide/)。

## 生产部署终极 Checklist

### 一、GPU 与计算层

| 项目 | 推荐方案 | 说明 |
|------|---------|------|
| GPU 型号 | H100 SXM 80GB / A100 80GB | 按模型、精度、SLO 与报价验证成本 |
| GPU 互联 | NVLink 4.0 / NVSwitch | TP 通信需核对互联与实测带宽 |
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
✅ 使用 Docker 时提供足够共享内存（host IPC 或 --shm-size）
✅ 配置反向代理处理 TLS、认证和限流
✅ 设置 VLLM_HOST_IP 为私网接口地址
```

### 四、vLLM 引擎参数层

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
✅ 核实多进程指标聚合及临时目录生命周期
✅ Grafana 看板必看 6 个面板:
   - 缓存命中率: rate(vllm:prefix_cache_hits_total[5m]) / rate(vllm:prefix_cache_queries_total[5m])
   - KV Cache 使用率: vllm:kv_cache_usage_perc（>0.95 告警）
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
   → 结合 GPU 时间与固定成本核算利润
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
                         │  PagedAttention      │ ← 按负载验证收益与限制
                         │  连续批处理          │ ← 按负载验证收益与限制
                         │  分块预填充          │ ← 按负载验证收益与限制
                         │  APC 前缀缓存        │ ← 按负载验证收益与限制
                         │  FP8 量化            │ ← 按负载验证收益与限制
                         │  KV Cache FP8        │ ← 按负载验证收益与限制
                         │  推测解码            │ ← 按负载验证收益与限制
                         │  Multi-LoRA          │ ← 一机服务多客户
                         │  结构化输出          │ ← 按负载验证收益与限制
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
2. **按业务设置长度和并发预算**：结合启动画像和压测，定位实际瓶颈。
3. **监控先行**：先搭好 Prometheus + Grafana，看着数据调。将 KV 块占用、TTFT、排队与抢占结合判断。
4. **缓存收益要实测**：持续追踪命中量、GPU 时间与业务成本，优化静态前缀与路由。
5. **计费做在网关层**：不要改 vLLM 源码，在网关层拦截 `usage` 字段是最干净的方案。

vLLM 的迭代速度极快（几乎每周都有新版本），建议持续关注其 [官方文档](https://docs.vllm.ai/) 和 [GitHub Releases](https://github.com/vllm-project/vllm/releases)。

---

## 常见问题 (FAQ)

### Q1: vLLM 启动时报错 CUDA out of memory (OOM) 怎么排查？
按启动日志区分权重加载、激活/图捕获与 KV 分配阶段。`--gpu-memory-utilization 0.90` 是示例预算，默认值随版本核对；它包含权重和运行时开销，不只分配 KV。业务长度、batch 与并发限制也会影响峰值；降低 `max-model-len` 不保证 KV 池按比例缩小。必要时减少负载或使用已验证的量化方案。

### Q2: 张量并行 (Tensor Parallel) 与流水线并行 (Pipeline Parallel) 怎么选？
在单机多卡环境（如 4卡或 8卡 A100/H100 NVLink），优先使用张量并行 `--tensor-parallel-size`，通信延迟极低且切分均匀；对于跨多台机器的分布式推理，建议使用张量并行（单机内）+ 数据并行（多实例多副本），通过前置负载均衡分发，避免跨节点流水线并行带来的通信瓶颈。

### Q3: vLLM 与 Ollama、TGI 相比在生产环境的核心优势是什么？
vLLM 提供连续批处理、前缀缓存与 OpenAI 兼容接口等服务能力。实际吞吐差异取决于模型、精度、硬件与负载，不能承诺相对其他引擎固定 3～5 倍；也不应将兼容接口称为覆盖 OpenAI 全部产品能力。

指标示例针对 vLLM 0.29 的 Prometheus 导出格式，Counter 样本使用 `_total` 后缀；上线前以实际 `/metrics` 为准。按实例/模型聚合 histogram bucket 时要保留 `le` 标签。参考 [vLLM 0.29 引擎参数](https://docs.vllm.ai/en/v0.29.0/configuration/engine_args/)、[监控指标设计](https://docs.vllm.ai/en/v0.29.0/design/metrics/)。
