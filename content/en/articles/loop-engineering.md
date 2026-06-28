---
title: "Deep Dive into AI Agent Architecture Evolution: From Prompt to Loop Engineering"
slug: loop-engineering
date: 2026-06-28
tag: AI Agent
tagClass: tag-emerald
description: A deep dive into the evolution of AI Agent architectures, exploring the 4-layer control plane extrapolation from Prompt, Context, Harness to Loop Engineering, and the 4 diseases of the ReAct architecture.
---

# Deep Dive into AI Agent Architecture Evolution: From Prompt to Loop Engineering

In today's AI Agent development circle, you must have been bombarded by a sea of jargon: ReAct, Plan-and-Execute, RAG, MCP, Doom-loop, Maker-checker, LangGraph, State Machines... 
These concepts are often scattered, leading us to blindly tweak Prompts based on intuition when encountering "poor AI performance".

This article combines the latest industry engineering practices with deep thinking to outline a clear causal chain for you. You will see that AI Agent development has undergone four paradigm shifts: **Prompt Engineering -> Context Engineering -> Harness Engineering -> Loop Engineering**.

These are not four completely different technologies, but **four nested levels of "control plane extrapolation"**. Each layer attempts to address the structural blind spots left by the previous one.

---

## 0. The Origin and Dilemma: The 4 Chronic Diseases of ReAct Architecture

It all started with the **ReAct (Reasoning + Acting)** architecture proposed in 2022. It gave large models the ability to interact with the environment using a minimalist three-step logic (Thought -> Action -> Observation).

However, when deploying ReAct into real, long-horizon production environments, it exposed four structural diseases that could not be solved simply by "making the model smarter":

1. **Error Compounding**: The iron law of probability. With a 95% accuracy rate per step, the overall success rate drops to about 36% after 20 steps. Long-term tasks must have error correction mechanisms rather than unidirectional accumulation.
2. **Doom-loop**: After a model encounters a failure, because the context is filled with "failed" records, it paradoxically reinforces its tendency to blindly retry. Without external interruption mechanisms, an Agent can fall into an infinite reboot or repeat tool-call death spiral.
3. **Context Explosion and Pollution**: The intermediate products of every attempt are appended to the history, making the context increasingly dirty. The model's attention is severely diluted, and performance experiences a measurable cliff-like drop.
4. **Lack of Independent Verification**: In the ReAct architecture, the model acts as both the "athlete" and the "referee". A successful tool call doesn't mean the task is advancing in the right direction, and the model easily falls into "blind confidence".

To solve these four chronic diseases, the Agent engineering system began its outward four-stage evolution.

---

## Layer 1: Prompt Engineering (Controlling "How to Say")

*   **Core Action**: Adjusting the conditional probability distribution of the large model and narrowing the variance of the sampling space through techniques like Few-shot, Chain of Thought (CoT), and Role-playing.
*   **Control Plane**: **Message Layer**. You control how instructions are precisely expressed in this round of conversation.
*   **Fatal Blind Spot**: A prompt is a static manual. When the system needs to process real-time data sources or updated codebases, even the best-written Prompt cannot cope with dynamic information changes. You cannot deal with a dynamic world using static instructions.

---

## Layer 2: Context Engineering (Controlling "What to See")

To solve information obsolescence and absence, engineers began building RAG (Retrieval-Augmented Generation), memory management systems, and progressive disclosure mechanisms.
*   **Core Action**: Filling the context window with exactly the right amount of valid information. Filtering out noisy Context that distracts attention through Recall and Rerank.
*   **Control Plane**: **Session Layer**. You control the data sources the model can access before reasoning.
*   **Fatal Blind Spot**: **Seeing the right information ≠ Making the right decision**. Even if the Context is fed extremely accurately, the model might still make unauthorized, dangerous, or redundant operations based on the correct knowledge (e.g., understanding the architecture diagram and taking the initiative to delete the database). What it lacks is not information input, but action constraints.

---

## Layer 3: Harness Engineering (Controlling "How to Do")

*"Agent = Model + Harness"*

At this layer, development focus shifted to the **Harness/scaffolding** built around the model. For example, using frameworks like LangGraph to design strict state machine boundaries.
*   **Core Action**: Introducing permission controls, tool standardization (like the MCP protocol), and crucially, **Maker-Checker separation (separation of execution and acceptance)**.
*   **Operation Mechanism**: The model (Maker) is only responsible for generating artifacts (like a piece of code). The Harness is responsible for executing real verification in a sandbox (like running `npm run test`). The test suite (Checker) gives an objective physical judgment, rather than letting the model say "I think it's done well".
*   **Control Plane**: **System Layer**. The Agent can only operate within a whitelist, and all actions are anchored by physical facts (like Exit code 0).
*   **Fatal Blind Spot**: Harness is a perfect quality inspection line, but it is not a production scheduling system. It can prevent the Agent from making mistakes at every step, but it doesn't know **when to stop the task**. As long as it is not called to stop, the Agent might burn thousands of dollars wildly within a compliant boundary.

---

## Layer 4: Loop Engineering (Controlling "When to Stop")

**"You are no longer writing prompts for the Agent; you are designing a loop that prompts the Agent."**

True Loop Engineering is absolutely not simply writing a `while(true)`. It is a **Convergence Control System**. A production-grade Loop must strictly consist of the following five components:

1. **Goal and Termination Conditions (GOAL)**:
   It must be metrics that can be objectively judged by machines and code (e.g., all tests pass and coverage > 90%). This is the soul of the Loop. If you can't write termination conditions, absolutely do not start the loop.
2. **Drive (DRIVE)**:
   Automatically assembles the Prompt based on the current state to drive the next action.
3. **Execution Constraints (HARNESS)**:
   Inherits all security protections, tool calls, and sandbox execution mechanisms from the third layer.
4. **Independent Referee (CHECKER)**:
   An independent verification node with an **isolated context**. The evaluator cannot see the Agent's original reasoning path, only the final artifact and scoring rubric. This eliminates the model's cognitive bias (preventing the model from being "convinced" by its own previous faulty reasoning).
5. **Safety Gates (GATES)**:
   The ultimate weapon to terminate Doom-loops. You must set a Max Iterations limit, a Max Budget, and No-Progress Detection (forcefully blocking and requesting human intervention / Human-in-the-loop when continuous cyclic calls are detected).

*   **Control Plane**: **Lifecycle Layer**. You design the entire process of a task from startup to convergence and completion.

---

## Endgame: Four-Layer Nesting and Troubleshooting Guide

Understanding the evolution of these four layers, you will find they are **nested**:
`The Loop runs the Harness internally -> Every step of the Harness assembles Context -> The assembled Context finally forms the Prompt.`

Mastering this causal chain, the next time your Agent crashes, you won't need to blindly modify the System Prompt. Please refer to the following quick reference table for dimensionality reduction strikes:

| The Symptom You Encounter | The Layer the Problem is Likely In | Recommended Solution |
| :--- | :--- | :--- |
| Agent gives irrelevant answers, chaotic format, or wrong roleplay | **Prompt Layer** | Modify instruction wording, add high-quality Few-shot examples, force JSON mode. |
| Agent confidently hallucinates facts, cites expired docs/APIs | **Context Layer** | Optimize RAG recall and rerank strategies, clean dirty data in vector DB, crop irrelevant context. |
| Agent oversteps authority, ignores errors, verifies itself | **Harness Layer** | Build a clear Maker-Checker separation verification chain; tighten tool permission whitelist (MCP auth). |
| Agent loops repeating the same error, burns Token budget | **Loop Layer** | Perfect the termination condition (Goal); add hard max iterations limit, state deduplication, and HitL breakpoints. |

## Conclusion

From "how to say" to "when to stop", AI engineering is rapidly converging with traditional software engineering. Future excellent Agent developers must be **Loop Engineers** who are proficient in state management, convergence judgment, and system architecture.
