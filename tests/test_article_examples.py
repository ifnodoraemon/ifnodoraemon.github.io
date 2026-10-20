"""Exercise the downloadable article examples without Docker or external APIs."""
import asyncio
from contextlib import asynccontextmanager
import importlib.util
from pathlib import Path
import re
import sys
import tempfile
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "public" / "examples" / "agents"


def load_example(name):
    spec = importlib.util.spec_from_file_location(name, EXAMPLES / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


graph = load_example("state_graph")
tools = load_example("tool_runtime")
actors = load_example("actor_runtime")


async def collect(events):
    return [event async for event in events]


class ApprovalTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "checkpoints.sqlite3"
        self.store = graph.SqliteCheckpointer(self.path)
        self.refunds = []
        self.workflow = graph.build_workflow(self.store, self.refunds)

    async def asyncTearDown(self):
        self.store.close()
        self.directory.cleanup()

    async def pending_run(self):
        events = await collect(self.workflow.stream(graph.AgentState(messages=[])))
        self.assertEqual(events[-1].event_type, "interrupted")
        self.assertEqual(self.refunds, [])
        return events[-1].run_id

    async def test_restart_resumes_suspended_node_without_replanning(self):
        run_id = await self.pending_run()
        self.store.close()
        self.store = graph.SqliteCheckpointer(self.path)
        self.workflow = graph.build_workflow(self.store, self.refunds)
        self.workflow.nodes["planner"] = Mock(side_effect=AssertionError("planner replayed"))
        events = await collect(self.workflow.resume(run_id, "approved"))
        self.assertEqual(events[-1].event_type, "completed")
        self.assertTrue(events[-1].payload["final_state"]["approval_recorded"])
        self.assertEqual(self.refunds, [1000])
        with self.assertRaises(ValueError):
            await collect(self.workflow.resume(run_id, "approved"))
        self.assertEqual(self.refunds, [1000])

    async def test_rejection_never_executes_refund(self):
        run_id = await self.pending_run()
        events = await collect(self.workflow.resume(run_id, "rejected"))
        self.assertEqual([event.event_type for event in events], ["rejected"])
        self.assertEqual(self.refunds, [])
        with self.assertRaises(ValueError):
            await collect(self.workflow.resume(run_id, "approved"))

    async def test_invalid_decision_does_not_consume_approval(self):
        run_id = await self.pending_run()
        with self.assertRaises(ValueError):
            await collect(self.workflow.resume(run_id, "yes"))
        await collect(self.workflow.resume(run_id, "approved"))
        self.assertEqual(self.refunds, [1000])

    async def test_separate_workers_cannot_claim_the_same_approval(self):
        run_id = await self.pending_run()
        other_store = graph.SqliteCheckpointer(self.path)
        try:
            self.store.claim_approval(run_id, "approved")
            with self.assertRaises(ValueError):
                other_store.claim_approval(run_id, "approved")
        finally:
            other_store.close()

    async def test_approval_does_not_bypass_future_boundaries(self):
        workflow = graph.StateGraph(self.store)
        executed = []
        for name in ("first", "second"):
            workflow.add_node(name, lambda state, node=name: executed.append(node))
            workflow.add_interrupt_before(name)
        workflow.set_entry_point("first")
        workflow.add_edge("first", "second")
        events = await collect(workflow.stream({}))
        run_id = events[-1].run_id
        events = await collect(workflow.resume(run_id, "approved"))
        self.assertEqual(events[-1].event_type, "interrupted")
        self.assertEqual(events[-1].node_name, "second")
        self.assertEqual(executed, ["first"])
        await collect(workflow.resume(run_id, "approved"))
        self.assertEqual(executed, ["first", "second"])

    async def test_loop_hits_step_budget_and_marks_failure(self):
        workflow = graph.StateGraph(self.store, max_steps=2)
        workflow.add_node("loop", lambda state: {"count": state.get("count", 0) + 1})
        workflow.set_entry_point("loop")
        workflow.add_edge("loop", "loop")
        with self.assertRaisesRegex(RuntimeError, "step budget"):
            await collect(workflow.stream({}, run_id="budget"))
        self.assertEqual(self.store.db.execute(
            "SELECT status, steps FROM runs WHERE run_id='budget'"
        ).fetchone(), ("failed", 2))

    async def test_cancelled_node_is_recorded_as_failed(self):
        started = asyncio.Event()

        async def slow_node(state):
            started.set()
            await asyncio.Event().wait()

        workflow = graph.StateGraph(self.store)
        workflow.add_node("slow", slow_node)
        workflow.set_entry_point("slow")
        task = asyncio.create_task(collect(workflow.stream({}, run_id="cancelled")))
        await asyncio.wait_for(started.wait(), 1)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(self.store.db.execute(
            "SELECT status FROM runs WHERE run_id='cancelled'"
        ).fetchone()[0], "failed")


class SandboxTests(unittest.TestCase):
    def setUp(self):
        self.container = Mock()
        self.container.wait.return_value = {"StatusCode": 0}
        self.container.logs.side_effect = [b"ok\n", b""]
        self.client = Mock()
        self.client.containers.run.return_value = self.container
        self.executor = tools.SandboxedPythonExecutor(client=self.client)

    def test_success_removes_container(self):
        result = self.executor.execute_code("print('ok')")
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["stdout"], "ok\n")
        self.container.remove.assert_called_once_with(force=True)

    def test_wait_timeout_still_force_removes_running_container(self):
        self.container.wait.side_effect = TimeoutError("request timed out")
        result = self.executor.execute_code("while True: pass", timeout_seconds=1)
        self.assertEqual(result["status"], "error")
        self.assertIn("request timed out", result["stderr"])
        self.container.remove.assert_called_once_with(force=True)

    def test_nonzero_exit_remains_an_error(self):
        self.container.wait.return_value = {"StatusCode": 1}
        self.assertEqual(self.executor.execute_code("raise ValueError()")['status'], "error")
        self.container.remove.assert_called_once_with(force=True)

    def test_cleanup_failure_is_not_reported_as_success(self):
        self.container.remove.side_effect = RuntimeError("daemon unavailable")
        with self.assertRaisesRegex(RuntimeError, "daemon unavailable"):
            self.executor.execute_code("print('ok')")


class ToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_unknown_category_does_not_expose_other_tools(self):
        registry = tools.ToolRegistry(SimpleNamespace(get_embedding=lambda text: [1, 0]))
        registry.register_tool("pay", "send a payment", {}, "finance")
        self.assertEqual(registry.retrieve_tools("pay", category="missing"), [])
        self.assertEqual(len(registry.retrieve_tools("pay", category="finance")), 1)

    async def test_retry_budget_has_no_unused_final_generation(self):
        sandbox = Mock()
        sandbox.execute_code.side_effect = [
            {"status": "error", "stderr": str(i)} for i in range(3)
        ]
        llm = SimpleNamespace(generate=AsyncMock(return_value="fixed"))
        runner = tools.SelfHealingToolRunner(llm, sandbox, max_retries=2)
        context = [{"role": "user", "content": "original"}]
        with self.assertRaises(RuntimeError):
            await runner.run_with_recovery("broken", context)
        self.assertEqual(sandbox.execute_code.call_count, 3)
        self.assertEqual(llm.generate.await_count, 2)
        self.assertEqual(context, [{"role": "user", "content": "original"}])

    async def test_repeated_errors_stop_early(self):
        sandbox = Mock()
        sandbox.execute_code.return_value = {"status": "error", "stderr": "same error"}
        llm = SimpleNamespace(generate=AsyncMock(return_value="fixed"))
        with self.assertRaises(RuntimeError):
            await tools.SelfHealingToolRunner(llm, sandbox, 4).run_with_recovery("broken", [])
        self.assertEqual(sandbox.execute_code.call_count, 2)
        self.assertEqual(llm.generate.await_count, 1)

    async def test_recovery_returns_successful_output(self):
        sandbox = Mock()
        sandbox.execute_code.side_effect = [
            {"status": "error", "stderr": "NameError"},
            {"status": "success", "stdout": "fixed output"},
        ]
        llm = SimpleNamespace(generate=AsyncMock(return_value="```python\nprint('fixed output')\n```"))
        result = await tools.SelfHealingToolRunner(llm, sandbox).run_with_recovery("broken", [])
        self.assertEqual(result, "fixed output")
        self.assertEqual(sandbox.execute_code.call_args.args[0], "print('fixed output')")

    async def test_mcp_negotiates_before_consuming_every_page(self):
        session = Mock()
        initialized = False

        async def initialize():
            nonlocal initialized
            initialized = True

        async def list_tools(cursor=None):
            self.assertTrue(initialized)
            tool = SimpleNamespace(name="first" if cursor is None else "second",
                                   description=None, inputSchema={"type": "object"})
            return SimpleNamespace(tools=[tool], nextCursor="page-2" if cursor is None else None)

        session.initialize = AsyncMock(side_effect=initialize)
        session.list_tools = AsyncMock(side_effect=list_tools)

        @asynccontextmanager
        async def stdio_client(parameters):
            yield (object(), object())

        @asynccontextmanager
        async def client_session(reader, writer):
            yield session

        mcp = ModuleType("mcp")
        mcp.ClientSession = client_session
        mcp.StdioServerParameters = SimpleNamespace
        stdio = ModuleType("mcp.client.stdio")
        stdio.stdio_client = stdio_client
        with patch.dict(sys.modules, {"mcp": mcp, "mcp.client.stdio": stdio}):
            found = await tools.discover_mcp_tools("trusted-server", [])
        self.assertEqual([tool["function"]["name"] for tool in found], ["first", "second"])
        self.assertEqual(found[0]["function"]["description"], "")
        self.assertEqual(session.list_tools.await_count, 2)


class ActorTests(unittest.IsolatedAsyncioTestCase):
    async def test_subscribers_and_sender_have_independent_nested_payloads(self):
        bus = actors.MessageBus()
        first, second = bus.register_actor("first"), bus.register_actor("second")
        bus.subscribe("topic", "first")
        bus.subscribe("topic", "second")
        original = actors.MessageEnvelope(payload={"items": []})
        await bus.publish("topic", original)
        one, two = await first.get(), await second.get()
        one.payload["items"].append("changed")
        self.assertEqual(two.payload, {"items": []})
        self.assertEqual(original.payload, {"items": []})
        first.task_done()
        second.task_done()

    async def test_full_mailbox_times_out_instead_of_hanging(self):
        bus = actors.MessageBus(mailbox_size=1, delivery_timeout=0.01)
        mailbox = bus.register_actor("full")
        envelope = actors.MessageEnvelope(target_actor="full")
        await bus.send(envelope)
        with self.assertRaises(actors.BackpressureError):
            await asyncio.wait_for(bus.send(envelope), 1)
        mailbox.get_nowait()
        mailbox.task_done()

    async def test_handler_error_is_visible_and_does_not_block_join(self):
        class BrokenActor(actors.BaseActor):
            async def on_message(self, envelope):
                raise ValueError("handler failed")

        bus = actors.MessageBus()
        actor = BrokenActor("broken", bus)
        await actor.start()
        await bus.send(actors.MessageEnvelope(target_actor="broken"))
        await asyncio.wait_for(actor.mailbox.join(), 1)
        self.assertEqual(len(actor.errors), 1)
        task = actor.task
        await actor.stop()
        self.assertTrue(task.done())

    async def test_shutdown_cancels_stuck_handler_within_budget(self):
        started = asyncio.Event()

        class StuckActor(actors.BaseActor):
            async def on_message(self, envelope):
                started.set()
                await asyncio.Event().wait()

        bus = actors.MessageBus()
        actor = StuckActor("stuck", bus)
        await actor.start()
        await bus.send(actors.MessageEnvelope(target_actor="stuck"))
        await asyncio.wait_for(started.wait(), 1)
        task = actor.task
        with self.assertRaises(asyncio.TimeoutError):
            await actor.stop(timeout=0.01)
        self.assertTrue(task.done())
        await asyncio.wait_for(actor.mailbox.join(), 1)

    async def test_stale_cas_cannot_overwrite_winner(self):
        store = actors.ConcurrentDocumentStore()
        snapshot = await store.get_document()
        results = await asyncio.gather(
            store.update_document("first", snapshot["version"], "one"),
            store.update_document("second", snapshot["version"], "two"),
        )
        self.assertEqual(results.count(True), 1)
        self.assertEqual((await store.get_document())["version"], snapshot["version"] + 1)

    async def test_limiter_rejects_impossible_request_and_refills(self):
        limiter = actors.TokenBucketRateLimiter(1, 100)
        with self.assertRaises(ValueError):
            await limiter.acquire(2)
        await limiter.acquire()
        await asyncio.wait_for(limiter.acquire(), 1)


class PublishedCodeTests(unittest.TestCase):
    def test_bilingual_code_matches_downloadable_examples(self):
        articles = {
            "build-lightweight-agent-framework": "state_graph",
            "advanced-agent-tool-use-and-function-calling": "tool_runtime",
            "multi-agent-collaboration-and-concurrency": "actor_runtime",
        }
        for slug, module in articles.items():
            source = (EXAMPLES / f"{module}.py").read_text().strip()
            for lang in ("zh", "en"):
                filename = f"{slug}{'.en' if lang == 'en' else ''}.md"
                article = (ROOT / "content" / lang / "articles" / filename).read_text()
                blocks = re.findall(r"```python\n(.*?)\n```", article, re.S)
                self.assertIn(source, blocks, f"{lang}/{filename} differs from download")


if __name__ == "__main__":
    unittest.main()
