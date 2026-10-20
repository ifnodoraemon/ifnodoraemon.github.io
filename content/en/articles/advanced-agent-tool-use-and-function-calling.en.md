---
title: "Advanced Tool Use in Agent Architecture: Dynamic Discovery, Sandboxing, and Self-Healing Recovery"
slug: advanced-agent-tool-use-and-function-calling
date: 2026-06-16
tag: "Tool Use"
tagClass: "tag-cyan"
description: "Implement dynamic tool retrieval, MCP initialization and pagination, gVisor container execution, cleanup after timeouts, and bounded recovery with Python examples."
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

## Bound discovery and execution as tool catalogs grow

Filter tools by domain and authorization before selecting candidate schemas. Top-K retrieval reduces context; it does not authorize an operation. An unknown category should produce no candidates, not expose the whole catalog. See the [lightweight agent framework](/en/articles/build-lightweight-agent-framework/) for control flow.

## MCP discovery and lifecycle

MCP clients initialize the session before listing tools. Tool lists may be paginated, and the channel can carry notifications and server requests. Reading the next JSON line is not a complete protocol implementation. This example uses the official Python SDK, traverses every tools page, and handles optional descriptions. It discovers tools from a trusted stdio server; remote authorization is a separate integration.

## Container execution and timeout cleanup

Install and register gVisor's `runsc` and prepare the image before running the executor. Docker SDK `wait(timeout=...)` limits the waiting API request; it does not kill the container. Cleanup therefore belongs in `finally`, and cleanup failures must be visible to the caller.

The shell example keeps each continuation backslash at the end of its line. Docker was not started during this article's verification.

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

## Python runtime reference

[Download the code](/examples/agents/tool_runtime.py). Retrieval uses the standard library; MCP and Docker operations require their respective SDKs. The embedding and LLM clients are injected interfaces, not already configured API integrations.


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

## Bounded recovery and async execution

`max_retries=2` allows the initial attempt plus two repairs. The final failed attempt does not request an unused repair. Repeated identical errors stop early. Blocking Docker calls run through `asyncio.to_thread` rather than blocking the event loop.

Returning a fixed log tail does not limit Docker's on-disk logs. Production deployments also need log rotation, external watchdogs, pinned image digests, execution authorization, cancellation, and budgets. Missing `runsc` should fail rather than silently fall back to host execution. See the [MCP guide](/en/articles/mcp-guide/).

## Frequently Asked Questions (FAQ)

### Q1: Does gVisor guarantee that escape is impossible?
No. It reduces direct exposure to the host kernel, but still requires runtime updates, least privilege, host isolation, and resource limits.

### Q2: Does a five-second wait automatically destroy the container?
No. The executor must stop or force-remove it after a waiting error. The example cleans up in `finally`; daemon failures still require a separate watchdog.

### Q3: Does Top-K retrieval enforce permissions?
No. Authorization belongs at the execution boundary. Side effects also need approval or business idempotency controls.

References: [MCP lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle), [Python SDK](https://github.com/modelcontextprotocol/python-sdk), [Docker SDK wait](https://docker-py.readthedocs.io/en/stable/containers.html), [gVisor security model](https://gvisor.dev/docs/security/).
