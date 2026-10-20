---
title: 从零手搓轻量级 Agent 框架：基于状态机与事件流的设计模式
slug: build-lightweight-agent-framework
date: 2026-06-16
tag: "架构设计"
tagClass: "tag-purple"
description: "从零实现 Python Agent 状态机：通过 SQLite 保存审批检查点，按挂起节点恢复、拒绝重复审批，并用异步事件流暴露执行过程和步数预算。"
extraTags:
  - Agent Framework
  - State Machine
  - Event Stream
  - LangGraph
category: "AI Agent"
series: "ai-agent"
seriesOrder: 12
updated: 2026-10-20
---

## 为什么需要显式的 Agent 状态机？

普通循环也能实现可靠的 Agent；关键在于是否明确记录当前节点、工具参数、恢复位置与终止条件。状态图把这些控制信息集中起来，便于审计和恢复。基础概念见 [Agent 执行循环与状态机设计](/articles/agent-loop-state-machine/)。

本文实现一个可下载运行的 [Python 示例](/examples/agents/state_graph.py)：需要 Python 3.11+ 与 SQLite 3.35+，仅使用标准库。退款节点只记录内存中的模拟结果，不连接支付系统。

## 审批、检查点与恢复位置

状态包含业务数据，检查点还必须记录**下一执行节点、已用步数和运行状态**。若只保存业务字典、恢复时又从 Planner 开始，计划就可能重算，已经确认的参数也可能被覆盖。

这里用 SQLite 保存快照。审批通过后从挂起节点继续；拒绝后直接结束；一次审批通过数据库条件更新只能领取一次。审批仅适用于当前边界，后续高风险节点仍会再次挂起。工作流注册的节点名称与实现需要保持版本兼容。

```mermaid
flowchart LR
    Plan[Planner] --> Pending[SQLite pending checkpoint]
    Pending --> Decision{审批决定}
    Decision -->|通过且领取成功| Tool[模拟退款节点]
    Decision -->|拒绝| Rejected[rejected]
    Tool --> Done[completed]
```

## 完整可运行示例

保存代码后运行 `python3 state_graph.py`。演示会关闭数据库连接，再用同一路径重建工作流，模拟 Worker 重启后的恢复。


```python
"""Small SQLite-backed approval workflow; no external side effects in the demo."""
import asyncio
import copy
import inspect
import json
import sqlite3
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path


class AgentState(dict):
    def apply_delta(self, delta):
        for key, value in delta.items():
            if key == "messages":
                self[key] = self.get(key, []) + copy.deepcopy(value)
            else:
                self[key] = copy.deepcopy(value)


@dataclass
class AgentEvent:
    event_type: str
    node_name: str
    payload: dict
    run_id: str


class SqliteCheckpointer:
    def __init__(self, path):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.execute("""CREATE TABLE IF NOT EXISTS runs (
            run_id TEXT PRIMARY KEY, node TEXT, state TEXT,
            steps INTEGER, status TEXT NOT NULL)""")

    def create(self, run_id, node, state):
        self.db.execute("INSERT INTO runs VALUES (?, ?, ?, 0, 'running')",
                        (run_id, node, json.dumps(state)))

    def save(self, run_id, node, state, steps, status):
        self.db.execute("""UPDATE runs SET node=?, state=?, steps=?, status=?
                           WHERE run_id=?""",
                        (node, json.dumps(state), steps, status, run_id))

    def claim_approval(self, run_id, decision):
        if decision not in {"approved", "rejected"}:
            raise ValueError("decision must be approved or rejected")
        status = "running" if decision == "approved" else "rejected"
        row = self.db.execute("""UPDATE runs SET status=?
            WHERE run_id=? AND status='pending'
            RETURNING node, state, steps""", (status, run_id)).fetchone()
        if row is None:
            raise ValueError("approval missing, already consumed, or not pending")
        return row[0], AgentState(json.loads(row[1])), row[2]

    def close(self):
        self.db.close()


class StateGraph:
    def __init__(self, checkpointer, max_steps=20):
        self.checkpointer = checkpointer
        self.max_steps = max_steps
        self.nodes = {}
        self.edges = {}
        self.conditional_edges = {}
        self.interrupt_nodes = set()
        self.entry_point = None

    def add_node(self, name, function):
        self.nodes[name] = function

    def set_entry_point(self, name):
        self.entry_point = name

    def add_edge(self, source, target):
        self.edges[source] = target

    def add_conditional_edge(self, source, router):
        self.conditional_edges[source] = router

    def add_interrupt_before(self, node):
        self.interrupt_nodes.add(node)

    async def stream(self, state, run_id=None):
        run_id = run_id or str(uuid.uuid4())
        state = AgentState(copy.deepcopy(state))
        self.checkpointer.create(run_id, self.entry_point, state)
        async for event in self._drive(state, run_id, self.entry_point, 0):
            yield event

    async def resume(self, run_id, decision):
        node, state, steps = self.checkpointer.claim_approval(run_id, decision)
        if decision == "rejected":
            yield AgentEvent("rejected", node, {}, run_id)
            return
        # Skip only this approved boundary, never all future approvals.
        async for event in self._drive(state, run_id, node, steps, node):
            yield event

    async def _drive(self, state, run_id, node, steps, approved_node=None):
        try:
            while node and node != "END":
                if steps >= self.max_steps:
                    raise RuntimeError("step budget exhausted")
                if node in self.interrupt_nodes and node != approved_node:
                    self.checkpointer.save(run_id, node, state, steps, "pending")
                    yield AgentEvent("interrupted", node, {"state": copy.deepcopy(state)}, run_id)
                    return
                approved_node = None
                yield AgentEvent("node_start", node, {}, run_id)
                delta = self.nodes[node](AgentState(copy.deepcopy(state)))
                if inspect.isawaitable(delta):
                    delta = await delta
                if delta:
                    state.apply_delta(delta)
                previous_node = node
                router = self.conditional_edges.get(node)
                node = router(state) if router else self.edges.get(node, "END")
                steps += 1
                self.checkpointer.save(run_id, node, state, steps, "running")
                yield AgentEvent("state_update", previous_node, {"delta": delta}, run_id)
            self.checkpointer.save(run_id, "END", state, steps, "completed")
            yield AgentEvent("completed", "END", {"final_state": copy.deepcopy(state)}, run_id)
        except (Exception, asyncio.CancelledError):
            self.checkpointer.save(run_id, node, state, steps, "failed")
            raise


def build_workflow(checkpointer, refund_log):
    graph = StateGraph(checkpointer)
    graph.add_node("planner", lambda state: {"action": "refund", "amount": 1000})
    graph.add_node("human_approval", lambda state: {"approval_recorded": True})

    def refund(state):
        # Simulation only. A real payment API needs a stable business idempotency key.
        refund_log.append(state["amount"])
        return {"status": "success", "messages": [{"role": "tool", "content": "Simulated refund"}]}

    graph.add_node("refund", refund)
    graph.set_entry_point("planner")
    graph.add_conditional_edge("planner", lambda state: "human_approval" if state["amount"] > 500 else "refund")
    graph.add_edge("human_approval", "refund")
    graph.add_edge("refund", "END")
    graph.add_interrupt_before("human_approval")
    return graph


async def main():
    with tempfile.TemporaryDirectory() as directory:
        path = str(Path(directory) / "checkpoints.sqlite3")
        refunds = []
        store = SqliteCheckpointer(path)
        workflow = build_workflow(store, refunds)
        events = [event async for event in workflow.stream(AgentState(messages=[]))]
        run_id = events[-1].run_id
        store.close()
        # Reopen storage and rebuild the graph to simulate a worker restart.
        store = SqliteCheckpointer(path)
        workflow = build_workflow(store, refunds)
        async for event in workflow.resume(run_id, "approved"):
            print(event.event_type, event.node_name)
        store.close()
        print("Simulated refunds:", refunds)


if __name__ == "__main__":
    asyncio.run(main())
```

## 实现保证与生产扩展

此例保证审批记录落盘、恢复位置明确和审批单次消费；它**没有实现支付系统的 Exactly-Once**。如果 Worker 在外部退款成功后、写回检查点前崩溃，恢复策略仍需业务幂等键或事务性 Outbox，详见 [Agent 编排与评估](/articles/agent-orchestration-evals/)。

SQLite 示例采用同步短事务，适合本地学习与有限并发。多进程平台还需审批用户认证、参数摘要绑定、快照版本迁移、审计日志、任务租约与取消传播。手写框架不天然比 LangGraph 更安全；LangGraph 同样支持持久化检查点与自托管观测。

## 常见问题 (FAQ)

### Q1: 拒绝审批后会不会继续执行工具？
不会。`resume(run_id, "rejected")` 消费待审批记录并产生 `rejected` 事件，工具节点不执行。无效决定会报错，而不是默认同意。

### Q2: 重复发送同一个审批回调会不会再次退款？
同一记录只能从 `pending` 更新一次；重复回调会被拒绝。真实退款接口仍必须使用跨重试稳定的业务幂等键。

### Q3: 框架能恢复任意一步的外部副作用吗？
不能自动保证。检查点记录控制流，外部系统的写入需要独立的幂等与事务设计。工具执行和异常恢复见 [Tool Use 进阶](/articles/advanced-agent-tool-use-and-function-calling/)。

依据：[LangGraph 持久化](https://docs.langchain.com/oss/python/langgraph/persistence)、[Temporal Activity 幂等性](https://docs.temporal.io/activity-definition)。
