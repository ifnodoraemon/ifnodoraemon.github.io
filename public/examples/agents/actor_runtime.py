"""In-process actors with bounded delivery; not a distributed durable broker."""
import asyncio
import copy
import json
import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum


class MessageType(str, Enum):
    REQUEST = "request"
    RESPONSE = "response"
    EVENT = "event"


@dataclass(frozen=True)
class MessageEnvelope:
    source_actor: str = ""
    target_actor: str = ""
    message_type: MessageType = MessageType.REQUEST
    correlation_id: str = ""
    payload: dict = field(default_factory=dict)
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)

    def to_json(self):
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, value):
        data = json.loads(value)
        data["message_type"] = MessageType(data["message_type"])
        return cls(**data)


class BackpressureError(RuntimeError):
    pass


class MessageBus:
    def __init__(self, mailbox_size=100, delivery_timeout=1):
        if mailbox_size < 1 or delivery_timeout <= 0:
            raise ValueError("mailbox_size and delivery_timeout must be positive")
        self.mailbox_size = mailbox_size
        self.delivery_timeout = delivery_timeout
        self.actor_mailboxes = {}
        self.subscriptions = {}

    def register_actor(self, actor_id):
        if actor_id in self.actor_mailboxes:
            raise ValueError("actor already registered")
        mailbox = asyncio.Queue(maxsize=self.mailbox_size)
        self.actor_mailboxes[actor_id] = mailbox
        return mailbox

    def subscribe(self, topic, actor_id):
        self.subscriptions.setdefault(topic, set()).add(actor_id)

    async def send(self, envelope):
        mailbox = self.actor_mailboxes.get(envelope.target_actor)
        if mailbox is None:
            raise ValueError("unknown actor")
        await self._deliver(mailbox, envelope)

    async def _deliver(self, mailbox, envelope):
        try:
            await asyncio.wait_for(mailbox.put(copy.deepcopy(envelope)), self.delivery_timeout)
        except asyncio.TimeoutError as error:
            raise BackpressureError("mailbox delivery timed out") from error

    async def publish(self, topic, envelope):
        # Each subscriber receives a separate payload; delivery is not an atomic broadcast.
        await asyncio.gather(*(self._deliver(self.actor_mailboxes[actor], envelope)
            for actor in self.subscriptions.get(topic, ()) if actor in self.actor_mailboxes))


class BaseActor:
    def __init__(self, actor_id, bus):
        self.actor_id = actor_id
        self.bus = bus
        self.mailbox = bus.register_actor(actor_id)
        self.task = None
        self.errors = []

    async def start(self):
        if self.task is not None:
            raise RuntimeError("actor already started")
        self.task = asyncio.create_task(self._event_loop())

    async def stop(self, timeout=5):
        if self.task is None:
            return
        try:
            await asyncio.wait_for(self.mailbox.join(), timeout)
        finally:
            self.task.cancel()
            await asyncio.gather(self.task, return_exceptions=True)
            self.task = None

    async def _event_loop(self):
        while True:
            envelope = await self.mailbox.get()
            try:
                await self.on_message(envelope)
            except asyncio.CancelledError:
                raise
            except Exception as error:
                self.errors.append(error)
            finally:
                self.mailbox.task_done()

    async def on_message(self, envelope):
        raise NotImplementedError


class ConcurrentDocumentStore:
    def __init__(self):
        self._content, self._version = "", 1
        self._lock = asyncio.Lock()

    async def get_document(self):
        async with self._lock:
            return {"content": self._content, "version": self._version}

    async def update_document(self, new_content, expected_version, author):
        async with self._lock:
            if self._version != expected_version:
                return False
            self._content = new_content
            self._version += 1
            return True


class TokenBucketRateLimiter:
    def __init__(self, capacity, refill_rate_per_sec):
        if capacity <= 0 or refill_rate_per_sec <= 0:
            raise ValueError("capacity and refill rate must be positive")
        self.capacity, self.refill_rate = capacity, refill_rate_per_sec
        self.tokens, self.last_refill = float(capacity), time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens_needed=1):
        if not 0 < tokens_needed <= self.capacity:
            raise ValueError("requested tokens must fit bucket capacity")
        while True:
            async with self._lock:
                now = time.monotonic()
                self.tokens = min(self.capacity, self.tokens + (now-self.last_refill)*self.refill_rate)
                self.last_refill = now
                if self.tokens >= tokens_needed:
                    self.tokens -= tokens_needed
                    return
                delay = (tokens_needed-self.tokens)/self.refill_rate
            await asyncio.sleep(delay)


async def main():
    bus, store = MessageBus(), ConcurrentDocumentStore()
    limiter = TokenBucketRateLimiter(2, 2)

    class Developer(BaseActor):
        async def on_message(self, envelope):
            await limiter.acquire()
            await self.bus.publish("code", MessageEnvelope(source_actor=self.actor_id,
                message_type=MessageType.EVENT, correlation_id=envelope.correlation_id,
                payload={"code": "def login(): return True"}))

    class Reviewer(BaseActor):
        def __init__(self, actor_id, bus):
            super().__init__(actor_id, bus)
            self.approved = False

        async def on_message(self, envelope):
            self.approved = envelope.payload["code"].startswith("def login")

    developer, reviewer, scanner = Developer("dev", bus), Reviewer("review", bus), Reviewer("scan", bus)
    actors = [developer, reviewer, scanner]
    bus.subscribe("code", "review")
    bus.subscribe("code", "scan")
    for actor in actors:
        await actor.start()
    try:
        await bus.send(MessageEnvelope(target_actor="dev", correlation_id="example-1"))
        await developer.mailbox.join()
        await asyncio.gather(reviewer.mailbox.join(), scanner.mailbox.join())
        # Simulated checks only; the coordinator commits after both completed.
        if not all(actor.errors == [] for actor in actors) or not (reviewer.approved and scanner.approved):
            raise RuntimeError("review failed")
        snapshot = await store.get_document()
        merged = await store.update_document("def login(): return True", snapshot["version"], "coordinator")
        print("Simulated merge:", merged)
    finally:
        for actor in actors:
            await actor.stop()


if __name__ == "__main__":
    asyncio.run(main())
