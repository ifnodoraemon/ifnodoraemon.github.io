const fs = require('fs');
const path = require('path');

const zhPath = path.join(__dirname, 'src/content/zh/articles');
const enPath = path.join(__dirname, 'src/content/en/articles');

// Ensure directories exist
if (!fs.existsSync(zhPath)) fs.mkdirSync(zhPath, { recursive: true });
if (!fs.existsSync(enPath)) fs.mkdirSync(enPath, { recursive: true });

const articles = {
  1: {
    slug: 'build-lightweight-agent-framework',
    zh: `---
title: 从零手搓轻量级 Agent 框架：基于状态机与事件流的设计模式
slug: build-lightweight-agent-framework
date: 2026-06-16
tag: Architecture
tagClass: tag-purple
description: 告别不可靠的线性 Prompt 链。本文深入剖析如何使用有限状态机（FSM）和事件流机制（Event Stream）构建极具掌控力的轻量级 Agent 循环，解密 LangGraph 底层设计理念。
extraTags:
  - Agent Framework
  - State Machine
  - Event Stream
  - LangGraph
---

在 2026 年的今天，单纯依赖超大 Prompt 让 LLM "一步到位" 完成复杂任务的时代已经过去。无论是处理海量数据还是多步骤逻辑推理，我们需要的是一个**可控、可恢复、可观测**的 Agent Runtime（智能体运行时）。

本文将带你跳出业务代码，从底层解构如何用**状态机（State Machine）**与**事件流（Event Stream）**手搓一个轻量级 Agent 框架。

## 1. 为什么线性执行不再适用？

早期的 Agent（如 AutoGPT 早期版本或简单的 LangChain 链）大多采用线性的执行逻辑或简单的 `while` 循环。这种架构存在致命缺陷：
* **状态漂移**：经过几次工具调用后，LLM 可能会“忘记”最初的目标。
* **难以调试**：循环内部发生错误时，你无法精确获知是在哪一次 `Observation` 环节出了问题。
* **无法暂停**：如果需要 Human-in-the-loop（人类介入确认），简单的循环代码无法随时挂起并恢复。

## 2. 状态机模式（State Machine Pattern）

为了解决上述问题，业界（以 LangGraph 为代表）全面转向了基于**有限状态机（FSM）**的图架构。

### 状态（State）作为唯一的 Truth Source
在这个架构中，Agent 所有的记忆和上下文不再散落在各个函数的变量里，而是集中存储在一个共享的 `State` 对象中（在 Python 中通常使用 \`TypedDict\` 或 Pydantic Model）。
每次 Node（节点）执行完毕，都必须返回对 State 的更新（State Delta），框架负责合并这些更新。

### 节点（Nodes）与边（Edges）
* **节点**：纯粹的处理单元。例如 `call_llm` 节点负责请求大模型，`execute_tool` 节点负责执行代码。
* **边**：决定下一步去哪里的逻辑。特别是**条件边（Conditional Edges）**，可以通过检查当前 State 中的特定字段（例如 \`tool_calls\` 是否为空），动态决定是返回给用户，还是进入工具执行节点。

这种设计的最大好处是**高度的确定性**：Agent 的行为被严格约束在预设的节点网络中，告别了无限死循环的恐惧。

## 3. 事件流机制（Event Stream）

如果说状态机是 Agent 的骨骼，那么**事件流（Event Stream）**就是它的血液。

现代 Agent 框架本质上是事件驱动的。当 Agent 在图中流转时，每一次状态的变更都会抛出一个事件。这带来了两个巨大的优势：
1. **实时流式反馈（Streaming）**：你可以将每个节点的中间产出（甚至是 LLM 的 Token）直接推送给前端用户，而不是干等几十秒。
2. **时间旅行与错误恢复**：由于每个状态的快照都被记录在流中，当发生错误时，系统可以轻松“回滚”到上一个健康的节点，换个工具重新尝试。

## 总结

基于状态机与事件流的设计，让 AI Agent 从不可控的“黑盒玩具”，变成了真正达到工程级要求的“可靠服务”。自己动手写一个几十行的极简图结构执行器，是深刻理解 2026 现代 Agent 底层原理的最佳实践。
`,
    en: `---
title: "Building a Lightweight Agent Framework: State Machines and Event Streams"
slug: build-lightweight-agent-framework
date: 2026-06-16
tag: Architecture
tagClass: tag-purple
description: Move beyond unreliable linear prompt chains. This article explores how to use Finite State Machines (FSM) and Event Streams to build a highly controllable lightweight Agent loop, inspired by LangGraph.
extraTags:
  - Agent Framework
  - State Machine
  - Event Stream
  - LangGraph
---

In 2026, the era of relying on massive mega-prompts to make LLMs solve complex tasks in a single shot is over. Whether dealing with massive data or multi-step logic, we need an **observable, controllable, and recoverable** Agent Runtime.

This article dissects the underlying principles of modern lightweight agent frameworks, focusing on **State Machines** and **Event Streams**.

## 1. The Death of Linear Execution

Early agents relied heavily on simple \`while\` loops or linear chains. This led to fatal flaws:
* **State Drift:** After a few tool calls, the LLM forgets the original objective.
* **Debugging Nightmare:** It's impossible to track precisely which \`Observation\` step failed in a giant loop.
* **No Pausing:** Implementing Human-in-the-loop is impossible because standard loops cannot suspend and resume their state gracefully.

## 2. The State Machine Pattern

To solve this, frameworks like LangGraph shifted to a graph-based **Finite State Machine (FSM)** architecture.

### State as the Single Source of Truth
Instead of scattering context across variables, all memory is centralized in a shared \`State\` object (often a \`TypedDict\`). 
When a Node finishes executing, it returns a "State Delta", and the framework merges it.

### Nodes and Edges
* **Nodes:** Pure processing units (e.g., \`call_llm\`, \`execute_tool\`).
* **Edges:** Logic that dictates routing. **Conditional Edges** inspect the \`State\` (e.g., checking if \`tool_calls\` exist) to dynamically decide the next node.

This enforces **strict deterministic control**, preventing the agent from spiraling into infinite hallucination loops.

## 3. The Event Stream Mechanism

If the state machine is the skeleton, the **Event Stream** is the blood.

Modern agents are event-driven. As the agent traverses the graph, every state mutation emits an event. This unlocks:
1. **Real-time Streaming:** You can pipe intermediate outputs or LLM tokens directly to the frontend instantly.
2. **Time Travel & Recovery:** Because every state snapshot is recorded in the stream, you can rollback to a previous node upon failure and retry with different tools.

## Conclusion

By leveraging FSMs and event streams, AI agents evolve from unpredictable black boxes to reliable, production-grade services.
`
  },
  2: {
    slug: 'multi-agent-collaboration-and-concurrency',
    zh: `---
title: 多 Agent 协作系统中的通信协议与并发控制实践
slug: multi-agent-collaboration-and-concurrency
date: 2026-06-16
tag: Multi-Agent
tagClass: tag-blue
description: 随着业务复杂度提升，单体 Agent 已经触及天花板。本文探讨基于 Actor 模型的多智能体并发机制，解密 AutoGen 0.4+ 架构的核心通信协议。
extraTags:
  - Actor Model
  - Concurrency
  - AutoGen
  - Distributed
---

在 2026 年，解决极其复杂的企业级任务早已不是单一全能模型的工作。随之而来的是 **Multi-Agent（多智能体）架构**的崛起。但当十几个专注不同领域的 Agent 在同一个任务上下文中工作时，如何防止它们互相干扰、阻塞？

答案藏在计算机科学领域一个古老而优雅的模式中：**Actor 模型**。以最新的 AutoGen 0.4 为例，整个架构已经全面拥抱这一思想。

## 1. 为什么抛弃“共享内存”？

早期的 Multi-Agent 尝试（如通过一个巨大的全局上下文数组来协调多个大模型）存在明显的瓶颈：
* **上下文爆炸**：每个 Agent 都被迫阅读彼此产生的冗长日志。
* **死锁与阻塞**：一个 Agent 正在思考时，其他 Agent 只能排队等待，无法利用 2026 年现代并发 API 极速的吞吐量。

## 2. Actor 模型的引入

为了实现高并发与解耦，现代多 Agent 框架采用了 **Actor 模型**：
* **独立的 Actor**：每个 Agent 就是一个独立的 Actor。它拥有自己私有的内部状态、专属的大模型接口实例和系统提示词。
* **不共享状态，只传递消息**：Agent 之间绝对不共享任何内存。如果 Agent A 需要 Agent B 的数据，它必须发送一条明确的异步消息。

这种设计的直接收益是：**完全解耦与极速并发**。既然没有共享状态，多个 Agent 就可以在同一时刻疯狂地并行处理不同的子任务。

## 3. 异步消息总线与通信协议

在生产环境中，这就需要一条强大的**异步消息总线 (Event Bus)**。

### 动态路由（Dynamic Routing）
基于事件驱动的消息传递，使得路由变得无比灵活。例如，当 "CodeWriter" Agent 发布一条 \`CodeGeneratedEvent\` 时，无需显式调用，"CodeReviewer" 和 "SecurityScanner" 这两个独立的 Agent 会同时订阅并并行处理该事件。

### 并发控制（Concurrency Control）
虽然并发极大地提升了效率，但必须对 API 的请求频次（Rate Limits）进行控制。在 Actor 模型中，可以通过在系统层加入令牌桶（Token Bucket）或者消息队列的背压（Backpressure）机制，确保系统在并发峰值时也不会崩溃。

## 结语

从“排队轮流发言”的简单 Group Chat，进化为基于 Actor 模型的全异步高并发微服务，Multi-Agent 系统在 2026 年已经步入了深水区。理解这套通信协议，是构建企业级智能系统的必修课。
`,
    en: `---
title: "Communication Protocols and Concurrency in Multi-Agent Systems"
slug: multi-agent-collaboration-and-concurrency
date: 2026-06-16
tag: Multi-Agent
tagClass: tag-blue
description: Single-agent systems have limits. This article dives into the Actor Model, concurrency controls, and the asynchronous communication protocols powering modern frameworks like AutoGen 0.4+.
extraTags:
  - Actor Model
  - Concurrency
  - AutoGen
  - Distributed
---

In 2026, solving complex enterprise tasks relies on **Multi-Agent architectures**. But when a dozen specialized agents work on the same problem, how do you prevent them from blocking each other and causing chaos?

The answer lies in a classic computer science pattern: the **Actor Model**. Modern frameworks, particularly AutoGen 0.4 and beyond, have fully embraced this design.

## 1. Abandoning Shared State

Early Multi-Agent systems forced all models to read and write to a giant shared context window. This resulted in:
* **Context Bloat:** Agents wasted tokens reading irrelevant logs from other agents.
* **Synchronous Bottlenecks:** Agent B had to wait idly while Agent A was thinking, wasting the massive throughput capabilities of modern APIs.

## 2. Embracing the Actor Model

To achieve true parallelism, modern frameworks utilize the **Actor Model**:
* **Independent Actors:** Each agent is an autonomous actor with its own private internal state, system prompt, and LLM instance.
* **Message Passing Over Shared Memory:** Agents never directly share state. If Agent A needs Agent B to do something, it sends an asynchronous message.

The immediate benefit is **decoupling and concurrency**. Without shared state, multiple agents can process sub-tasks simultaneously without race conditions.

## 3. Asynchronous Event Buses

This architecture requires a robust **Asynchronous Message Bus**.

### Dynamic Routing
Message passing enables event-driven flexibility. When the "CodeWriter" agent emits a \`CodeGeneratedEvent\`, it doesn't need to manually invoke other agents. Both the "CodeReviewer" and "SecurityScanner" agents can subscribe to that event and analyze the code in parallel.

### Concurrency Control
While parallelism is great, API rate limits are not infinite. Within the Actor framework, backpressure mechanisms and token bucket algorithms are implemented at the message-queue level, ensuring that massive concurrency doesn't lead to system crashes.

## Conclusion

Multi-Agent systems have evolved from synchronous "group chats" into highly parallel, asynchronous microservices based on the Actor Model. Understanding these communication protocols is essential for building 2026-era intelligent systems.
`
  },
  3: {
    slug: 'advanced-agent-tool-use-and-function-calling',
    zh: `---
title: Agent 开发中的 Tool Use 进阶：动态发现、沙箱隔离与错误恢复
slug: advanced-agent-tool-use-and-function-calling
date: 2026-06-16
tag: Tool Use
tagClass: tag-green
description: 让大模型调用 API 只是起步。深入剖析如何在生产环境中实现基于 MCP 协议的动态工具发现，以及保障代码执行安全的虚拟沙箱技术。
extraTags:
  - Function Calling
  - MCP
  - Sandbox
  - Error Recovery
---

大模型支持 Function Calling 已经不再是新鲜事，但这仅仅是 Tool Use（工具使用）的起点。当你的企业级 Agent 拥有超过 500 个可用内部 API 时，把所有的工具 Schema 塞进每一次的请求上下文不仅会爆 Token，还会让模型的智商直线下降。

在 2026 年的生产实践中，**动态工具发现**与**安全沙箱执行**才是 Agent 开发的分水岭。

## 1. 动态工具发现与 MCP 协议

现代 Agent 摒弃了“静态全量注入”的方式，转而采用**按需检索（Retrieval-based Tool Selection）**。

### 语义化的工具仓库（Tool Registry）
开发者会将所有的工具描述存储在一个向量数据库中。当用户发起请求时，Agent 系统会首先执行一次相似度检索，只挑出当前任务最相关的 5-10 个工具 Schema，注入到 LLM 的上下文中。

### Model Context Protocol (MCP)
在这一趋势下，**MCP 协议**成为了业界标准。MCP 像一个万能桥梁，允许大模型在运行时通过统一的协议向各个外部数据源和工具服务动态请求能力。这意味着你可以在不重启 Agent 的情况下，动态增加或下线工具。

## 2. 沙箱隔离：保障执行的绝对安全

随着 Agent 开始具备 \`Computer Use\` 和代码执行能力，安全风险呈指数级上升。如果大模型产生幻觉，执行了一句 \`rm -rf /\`，后果不堪设想。

生产级的 Agent 必须配备**执行沙箱（Sandbox）**：
* **容器级隔离**：所有的 Python/JS 代码执行都必须放置在无状态的 Docker 容器或更底层的 gVisor 隔离层中。
* **最小权限原则**：沙箱内部网络断开（除非特定 API 白名单），文件系统只读或严格限制写入目录。
* **审计与熔断**：监控沙箱内的系统调用，一旦发现越权行为，立即截断并销毁容器。

## 3. 智能的错误恢复机制

工具调用经常会失败（网络超时、API 限流、甚至模型自己传错了参数类型）。传统的做法是直接向用户抛出 Exception，这极度不符合 Agentic 的理念。

现代架构强调**自我恢复（Self-Healing）**：
1. 沙箱拦截到错误日志（如 Python Traceback）。
2. 将报错信息作为 `Observation` 直接原样抛回给大模型。
3. 借助 2026 年顶尖大模型（如 Claude Fable 5 强大的长上下文纠错能力），模型会自己阅读报错信息，修正参数，发起第二次尝试。

## 总结

让 Agent 用工具很简单，但让 Agent **安全、高效、动态**地管理成百上千个工具，是一门硬核架构学问。动态发现与隔离沙箱是通向全自动化 AGI 的必经之路。
`,
    en: `---
title: "Advanced Tool Use: Dynamic Discovery, Sandboxing, and Error Recovery"
slug: advanced-agent-tool-use-and-function-calling
date: 2026-06-16
tag: Tool Use
tagClass: tag-green
description: Function calling is just the beginning. This article explores dynamic tool discovery using the MCP protocol and how to ensure absolute security with execution sandboxes in production.
extraTags:
  - Function Calling
  - MCP
  - Sandbox
  - Error Recovery
---

Basic Function Calling is no longer novel. When an enterprise Agent has access to over 500 internal APIs, stuffing every tool schema into the context window is a recipe for token exhaustion and severe model confusion.

In 2026 production environments, the focus has shifted entirely to **Dynamic Tool Discovery** and **Sandboxed Execution**.

## 1. Dynamic Tool Discovery & The MCP Protocol

Modern agents have abandoned the "static payload" approach in favor of **Retrieval-based Tool Selection**.

### Semantic Tool Registries
Developers now store tool descriptions in vector databases. When a user makes a request, the system performs semantic search to retrieve only the 5-10 most relevant tool schemas, dynamically injecting them into the LLM's context.

### Model Context Protocol (MCP)
The **MCP protocol** has emerged as the industry standard for this. It acts as a universal bridge, allowing LLMs to dynamically query external servers for available capabilities at runtime. You can add or remove tools from the network without ever redeploying the core Agent code.

## 2. Sandboxing: Ensuring Absolute Execution Security

As agents acquire \`Computer Use\` and arbitrary code execution capabilities, security risks skyrocket. A hallucinating agent executing a destructive command could be catastrophic.

Production-grade agents mandate the use of **Execution Sandboxes**:
* **Container Isolation:** All arbitrary code (Python/JS) must execute inside stateless containers or microVMs (like gVisor or Kata Containers).
* **Principle of Least Privilege:** The sandbox typically lacks outbound internet access (except for specific whitelisted APIs) and enforces strict read-only or scoped-write filesystems.
* **Audit and Circuit Breakers:** Any unauthorized system calls instantly trigger a circuit breaker, destroying the container.

## 3. Intelligent Error Recovery

Tool executions fail constantly due to network timeouts, rate limits, or the model providing incorrect argument types. Throwing an exception directly to the user defeats the purpose of an autonomous agent.

Modern architectures prioritize **Self-Healing**:
1. The sandbox intercepts the error (e.g., a Python traceback).
2. The error string is fed directly back to the LLM as an \`Observation\`.
3. Utilizing the reasoning capabilities of 2026 frontier models (like Claude Fable 5), the agent autonomously analyzes the traceback, corrects its parameters, and executes a second attempt.

## Conclusion

Getting an agent to use a tool is easy. Getting it to manage thousands of tools **dynamically, securely, and reliably** is rigorous engineering. Dynamic discovery and sandboxing are foundational to reaching true autonomous reliability.
`
  }
};

for (const id in articles) {
  const data = articles[id];
  fs.writeFileSync(path.join(zhPath, \`\${data.slug}.md\`), data.zh, 'utf8');
  fs.writeFileSync(path.join(enPath, \`\${data.slug}.md\`), data.en, 'utf8');
}

console.log('Successfully created all 6 article markdown files.');
