---
title: Agent 开发中的 Tool Use 进阶：动态发现、沙箱隔离与错误恢复
slug: advanced-agent-tool-use-and-function-calling
date: 2026-06-16
tag: "工具调用"
tagClass: "tag-cyan"
description: "实现 Agent 动态工具检索、MCP 初始化与分页发现、gVisor 容器执行及有限重试，重点解释超时后清理、错误分类与示例的实际边界。"
extraTags:
  - Function Calling
  - MCP
  - Sandbox
  - Error Recovery
category: "AI Agent"
series: "ai-agent"
seriesOrder: 13
updated: 2026-10-20
---

## 工具数量增长后，先控制发现和执行边界

当工具目录很大时，可以先按业务领域和权限过滤，再检索候选 Schema。Top-K 只负责缩小上下文，不能代替服务端鉴权；未知分类应返回空结果，不能回退为全部工具。整体控制流见 [轻量 Agent 框架](/articles/build-lightweight-agent-framework/)。

## MCP 工具发现与生命周期

MCP 客户端必须先完成 `initialize` 与初始化通知，再进行 `tools/list`。列表可能分页，通信中还可能出现通知和服务端请求；不能把“读取下一行 JSON”当成完整协议客户端。示例使用官方 Python SDK 处理生命周期，遍历所有分页，并允许工具缺省描述。这里只演示可信 stdio 服务器的发现；远程服务还需按其授权要求建立会话。

## 容器执行、超时与清理

先在宿主机安装并注册 gVisor 的 `runsc`，准备本地镜像，然后再运行沙箱执行器。Python Docker SDK 的 `wait(timeout=...)` 是等待 API 请求的超时，超时不会自动杀容器。示例把强制清理放在 `finally` 中，并让清理失败向上传播。

下面是语法可运行的容器参数示例，反斜杠必须位于行尾。镜像需要预先准备；本次文章验证未启动 Docker。

```bash
docker run --rm \
  --runtime=runsc \
  --network=none \
  --memory=256m \
  --cpus=1 \
  --pids-limit=32 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \
  --user=1000:1000 \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  python:3.11-slim python3 -c 'print("sandbox example")'
```

## Python 工具运行时参考实现

[下载完整代码](/examples/agents/tool_runtime.py)。纯检索类只依赖标准库；使用 MCP 与 Docker 时分别需要 `mcp`、`docker` SDK。嵌入客户端和 LLM 客户端为依赖注入接口，需由调用方提供，不能把它们视为已集成的真实 API。


```python
"""Tool discovery and bounded sandbox execution. SDK imports are lazy."""
import asyncio
import math


class ToolRegistry:
    def __init__(self, embedding_client):
        self.embedding_client = embedding_client
        self.tools = {}

    def register_tool(self, name, description, parameters, category):
        vector = list(self.embedding_client.get_embedding(f"{name}: {description}"))
        self.tools[name] = {
            "category": category,
            "vector": vector,
            "schema": {"type": "function", "function": {
                "name": name, "description": description, "parameters": parameters}},
        }

    def retrieve_tools(self, query, top_k=5, category=None):
        if top_k < 1:
            return []
        query_vector = list(self.embedding_client.get_embedding(query))
        scored = []
        for name, tool in self.tools.items():
            if category is not None and tool["category"] != category:
                continue
            vector = tool["vector"]
            if len(vector) != len(query_vector):
                raise ValueError("embedding dimensions differ")
            denominator = math.sqrt(sum(x*x for x in vector) * sum(x*x for x in query_vector))
            score = sum(x*y for x, y in zip(vector, query_vector)) / max(denominator, 1e-9)
            scored.append((score, name))
        scored.sort(reverse=True)
        return [self.tools[name]["schema"] for _, name in scored[:top_k]]


async def discover_mcp_tools(command, args):
    """Start a trusted stdio server, negotiate MCP, and consume all tools pages."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    parameters = StdioServerParameters(command=command, args=args)
    async with stdio_client(parameters) as (reader, writer):
        async with ClientSession(reader, writer) as session:
            await session.initialize()
            tools, cursor = [], None
            while True:
                result = await session.list_tools(cursor=cursor)
                for tool in result.tools:
                    tools.append({"type": "function", "function": {
                        "name": tool.name,
                        "description": tool.description or "",
                        "parameters": tool.inputSchema,
                    }})
                cursor = result.nextCursor
                if not cursor:
                    return tools


class SandboxedPythonExecutor:
    def __init__(self, image="python:3.11-slim", client=None):
        if client is None:
            import docker
            client = docker.from_env()
        self.client = client
        self.image = image

    def execute_code(self, code_snippet, timeout_seconds=5):
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        container = None
        try:
            container = self.client.containers.run(
                image=self.image, command=["python3", "-c", code_snippet],
                runtime="runsc", network_mode="none", mem_limit="256m",
                nano_cpus=1_000_000_000, pids_limit=32, read_only=True,
                tmpfs={"/tmp": "rw,noexec,nosuid,size=32m"},
                user="1000:1000", cap_drop=["ALL"],
                security_opt=["no-new-privileges:true"], detach=True,
            )
            result = container.wait(timeout=timeout_seconds)
            stdout = container.logs(stdout=True, stderr=False, tail=200).decode("utf-8", errors="replace")
            stderr = container.logs(stdout=False, stderr=True, tail=200).decode("utf-8", errors="replace")
            exit_code = result["StatusCode"]
            return {"exit_code": exit_code, "stdout": stdout, "stderr": stderr,
                    "status": "success" if exit_code == 0 else "error"}
        except Exception as error:
            # Docker wait's timeout is an HTTP request timeout, not a kill signal.
            return {"exit_code": -1, "stdout": "", "stderr": str(error), "status": "error"}
        finally:
            if container is not None:
                # Force-removal kills a still-running container, including after wait errors.
                # Let cleanup failures propagate so callers cannot report successful cleanup.
                container.remove(force=True)


class SelfHealingToolRunner:
    def __init__(self, llm_client, sandbox_executor, max_retries=2):
        if max_retries < 0:
            raise ValueError("max_retries cannot be negative")
        self.llm_client = llm_client
        self.sandbox = sandbox_executor
        self.max_retries = max_retries

    async def run_with_recovery(self, initial_code, context_messages):
        code, messages, previous_error = initial_code, list(context_messages), None
        for attempt in range(self.max_retries + 1):
            result = await asyncio.to_thread(self.sandbox.execute_code, code)
            if result["status"] == "success":
                return result["stdout"]
            error = "\n".join(result["stderr"].splitlines()[-5:])
            if attempt == self.max_retries or error == previous_error:
                break
            previous_error = error
            messages.append({"role": "user", "content":
                f"Repair this Python code and return only code.\n{code}\nError:\n{error}"})
            response = await self.llm_client.generate(messages=messages)
            code = self._extract_code(response)
        raise RuntimeError("tool failed or repeated the same error within its retry budget")

    @staticmethod
    def _extract_code(text):
        if "```python" in text:
            return text.split("```python", 1)[1].split("```", 1)[0].strip()
        if "```" in text:
            return text.split("```", 1)[1].split("```", 1)[0].strip()
        return text.strip()
```

## 有限重试与异步边界

`max_retries=2` 表示首次执行加最多两次修复，共至多三次执行。最后一次失败不会再调用模型生成一份永远不执行的代码。连续出现相同错误时提前停止；同步 Docker 调用通过 `asyncio.to_thread` 执行，避免阻塞事件循环。

示例保留固定长度的日志尾部，但没有为无限输出提供磁盘配额。生产系统还需 Docker 日志轮转、外部超时看门狗、可信镜像 digest、工具授权、取消信号和请求预算。`runsc` 不可用时应失败，不应悄悄回退为宿主机执行。更多协议背景见 [MCP 指南](/articles/mcp-guide/)。

## 常见问题 (FAQ)

### Q1: gVisor 能保证代码绝不逃逸吗？
不能保证绝对安全。它减少应用直接接触宿主机内核的接口，但仍需运行时更新、最小权限、宿主机隔离和资源限制。

### Q2: `wait(timeout=5)` 是否等于五秒后容器被自动销毁？
不是。等待请求超时后，执行器必须主动停止或强制删除容器；示例在 `finally` 中进行清理。Docker daemon 不可达时仍需独立的清理看门狗。

### Q3: Top-K 工具检索是否足以约束模型权限？
不足。工具选择影响上下文，权限检查必须在执行端实施。支付、发信等有副作用的操作还需要人工审批或业务幂等策略。

依据：[MCP 生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)、[Python SDK](https://github.com/modelcontextprotocol/python-sdk)、[Docker SDK wait](https://docker-py.readthedocs.io/en/stable/containers.html)、[gVisor 安全模型](https://gvisor.dev/docs/security/)。
