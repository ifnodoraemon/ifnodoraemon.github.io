---
title: "Skills Deep Dive: Give Your AI Coding Assistant a Professional Brain"
slug: skills-guide
date: 2026-03-12
tag: Agent Skills
tagClass: tag-purple
category: AI Agent
series: ai-agent
seriesOrder: 5
description: From core principles to cross-platform practice, a complete guide to the AI coding assistant Skills system. Covers SKILL.md mechanics, six-platform comparison, hands-on writing guide, and best practices.
extraTags:
  - Claude Code
  - Cursor
  - GitHub Copilot
  - OpenAI Codex
updated: 2026-10-20
---

## What Are Skills?

Imagine you hired a brilliant new team member — incredibly smart, learns fast, but **knows nothing about your project**. They don't know your coding standards, aren't familiar with your tech stack, and have no idea about your team's Code Review checklist. Every time you assign a task, you have to explain everything from scratch.

**Skills are the employee handbook you prepare for this "AI new hire."**

```mermaid
graph LR
    subgraph WithoutSkills["Without Skills"]
        U1["Developer"] -- "Repeat standards every time" --> A1["AI Assistant"]
        A1 -- "Inconsistent output" --> R1["Uneven code quality"]
    end
```

```mermaid
graph LR
    subgraph WithSkills["With Skills"]
        U2["Developer"] -- "Normal conversation" --> A2["AI Assistant"]
        S["Skills Handbook"] -- "Auto-inject expertise" --> A2
        A2 -- "Standardized output" --> R2["Consistently high quality"]
    end
```

Skills are **modular capability extensions for AI coding assistants** — structured Markdown files that inject your team's coding standards, best practices, and workflows into the AI's working context with a "write once, apply forever" approach. They don't change the AI's "IQ," but dramatically boost its "professionalism."

## Why Do You Need Skills?

| Pain Point | Without Skills | With Skills |
|------------|---------------|-------------|
| **Repetitive instructions** | Repeat "use 4-space indentation" and "functions under 50 lines" every conversation | Write Skills once, automatically enforced forever |
| **Inconsistent output** | Same Code Review task yields different review dimensions each time | Strictly follows Skills-defined checklists |
| **Context amnesia** | AI doesn't remember your project uses FastAPI + PostgreSQL | Skills auto-inject project tech stack context |
| **Team collaboration** | Each team member must individually train their AI | Skills ship with the repo, entire team stays aligned |
| **Limited capabilities** | AI only has generic abilities | Skills can include scripts and templates, extending execution capabilities |

## Core Mechanism: Three-Layer Progressive Loading

Using Claude Code's SKILL.md as the representative example, Anthropic designed an elegant "load-on-demand" architecture. The core design philosophy is **"Tokens are money"** — maximizing capability richness while minimizing context window consumption.

```mermaid
graph TB
    subgraph ThreeLayerLoading["Three-Layer Loading"]
        L1["Level 1: YAML Frontmatter"]
        L2["Level 2: SKILL.md Body"]
        L3["Level 3: Associated Files"]
        L1 -- "Matches user request?" --> L2
        L2 -- "Needs script execution?" --> L3
    end
    style L1 fill:#4ade80,color:#000
    style L2 fill:#60a5fa,color:#000
    style L3 fill:#f472b6,color:#000
```

### Level 1: YAML Frontmatter (Always Resident)

On startup, the AI reads the `name` and `description` from all Skills, consuming minimal tokens. This layer's purpose is to **quickly determine "is this Skill relevant to the current task?"**

```yaml
---
name: code-review-assistant
description: Code review assistant that reviews code across security, performance, type safety, and test coverage dimensions
---
```

### Level 2: SKILL.md Body (Loaded On-Demand)

When a user's request matches a Skill's `description`, the AI loads that Skill's full instructions. For example, when a user says "review this code," it triggers the full `code-review-assistant` rules.

### Level 3: Associated Files (Deep On-Demand)

Skills can include scripts, reference docs, and templates as supporting files — **only read when referenced in SKILL.md and actually needed**.

```text
skills/
└── code-review/
    ├── SKILL.md           # Required: core instructions
    ├── scripts/           # Optional: executable scripts
    │   └── lint-check.sh
    ├── references/        # Optional: reference docs
    │   └── security-checklist.md
    └── assets/            # Optional: templates and resources
        └── report-template.md
```

> Skills can reduce context overhead through on-demand loading. Rules may also be conditional or path-scoped, so they are not uniformly loaded in full. Use tests and checkers for deterministic quality requirements.

## SKILL.md Hands-On

### Standard Structure

```markdown
---
name: skill-name
description: One-line description of what this Skill does and when it triggers
---

# Skill Title

Explanation of when to use this Skill.

## Core Rules

### 1. Rule One
- Specific checklist items or action steps

### 2. Rule Two
- ...

## Output Format

Define the AI's standardized output template.

## Examples

Provide at least one high-quality input → output example.
```

### Example 1: Code Review Assistant

A "checklist-style" Skill that systematizes team Code Review standards:

```markdown
---
name: code-review-assistant
description: Code review assistant that reviews code across security, performance, type safety, and test coverage dimensions
---

# Code Review Assistant

Use this skill when the user asks for code review or PR review.

## Review Dimensions

Check in the following order, output structured review feedback:

### 1. 🔴 Security (Critical)
- SQL Injection: Are parameterized queries used?
- XSS: Is user input properly escaped?
- Auth: Do API endpoints have proper permission checks?
- Secrets: Are keys or passwords hardcoded?

### 2. 🟠 Performance (High)
- N+1 Queries: Are joinedload/selectinload used to avoid them?
- Caching: Are frequent queries leveraging Redis cache?
- Async: Are IO-heavy operations using async/await?

### 3. 🟡 Type Safety (Medium)
- Are there `any` types that could be replaced with more specific types?
- Do functions have type annotations?

### 4. 🟢 Code Quality (Low)
- Naming: Do variable and function names clearly express intent?
- Function length: Is any single function over 50 lines?
- DRY: Is there duplicate code that could be reused?

## Output Format

## Code Review Summary

### 🔴 Critical
- [file:line] Describe the issue and fix suggestion

### 🟠 Suggestions
- [file:line] Describe the optimization suggestion

### 🟢 Good Practices
- Noteworthy good practices

### 📊 Overall
- Score: X/10
- Recommendation: Approve / Approve with changes / Needs redesign
```

The brilliance of this Skill lies in: **priority ordering** (Security > Performance > Types > Quality > Tests) ensures the AI focuses on the most critical issues first; **enforced output format** makes every Code Review result comparable and trackable.

### Example 2: Git Commit Formatter

A "format-standard" Skill that enforces Conventional Commits:

```markdown
---
name: git-commit-formatter
description: Format Git commit messages following the Conventional Commits specification
---

# Git Commit Formatter

Use this skill when the user asks to commit code or generate a commit message.

## Commit Format

<type>(<scope>): <subject>

<body>

<footer>

## Type Reference

| Type | Description | Example |
|------|-------------|---------|
| feat | New feature | feat(auth): add JWT refresh tokens |
| fix | Bug fix | fix(api): fix pagination parameter parsing |
| docs | Documentation update | docs(readme): update deployment guide |
| refactor | Refactoring | refactor(ai-service): split model selection logic |
| perf | Performance optimization | perf(cache): optimize Redis cache hit rate |
| test | Test-related | test(api): add user registration integration tests |
| chore | Build/tooling changes | chore(deps): upgrade FastAPI to 0.115 |

## Rules

1. Subject must not exceed 50 characters, use imperative mood
2. Body explains **why** the change was made, not **what** was changed
3. Each commit does one thing only
```

### Example 3: Docker Deploy Assistant

A "knowledge-capture" Skill that codifies project containerization architecture:

```markdown
---
name: docker-deploy-assistant
description: Docker deployment assistant for Dockerfile writing, docker-compose orchestration, and deployment workflows
---

# Docker Deploy Assistant

Use this skill for Docker containerization, deployment, and environment orchestration tasks.

## Project Container Architecture

docker-compose.yml
├── backend    (FastAPI, Python 3.12, port 8001)
├── frontend   (Nginx + React build, port 5174)
├── db         (PostgreSQL, port 5432)
├── redis      (Redis, port 6379)
└── monitoring (Prometheus + Grafana, optional)

## Key Rules

1. **Multi-stage builds** — Reduce image size, separate build and runtime environments
2. **Non-root user** — Production images should run as non-root user
3. **Health checks** — Add HEALTHCHECK instructions to monitor container status
4. **Environment variables** — Inject sensitive info via .env or Docker secrets
5. **Network isolation** — Database and Redis only exposed to internal network
```

The value of this Skill: when a new team member joins, the AI automatically gains **complete deployment knowledge** for the project — no manual onboarding needed.

## Six Platforms: Compare Skills Separately from Rules

Checked on 2026-10-20. A `SKILL.md` package provides task-specific procedures and resources. Rules and repository instructions provide persistent background or path-specific guidance. A platform's rule format is not its only extension mechanism and cannot establish that it lacks scripts or on-demand loading.

| Platform | Native skills and common project directories | Repository instructions or rules |
|----------|-----------------------------------------------|----------------------------------|
| Claude Code | `.claude/skills/<name>/SKILL.md` | `CLAUDE.md` |
| Cursor | `.cursor/skills/`, `.agents/skills/` | `.cursor/rules/*.mdc`, alongside skills |
| GitHub Copilot | `.github/skills/`; client support varies | `.github/copilot-instructions.md`, path instructions, and `AGENTS.md` in supported clients |
| OpenAI Codex | `.agents/skills/<name>/SKILL.md`, plus user and system locations | Directory-scoped `AGENTS.md` |
| Gemini CLI | `.gemini/skills/` or `.agents/skills/` | `GEMINI.md` |
| Windsurf / Cascade | Verify discovery directories and support in the installed version | Existing `.windsurf/rules/` configuration does not describe every skill capability |

Cursor, Copilot, and Gemini CLI skills can bundle scripts and reference resources. Execution still depends on tools, dependencies, and permissions. A common format does not make every extension field, trigger, or approval behavior portable.

See [Claude Code Skills](https://code.claude.com/docs/en/skills), [Cursor Skills](https://cursor.com/docs/skills), [Copilot Skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills), [Codex Skills](https://developers.openai.com/codex/skills), and [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/). Current Windsurf skill documentation could not be reliably retrieved during this review, so its script and loading capabilities are not marked unsupported.

### AGENTS.md Is Not a Custom Agent Profile

`AGENTS.md` usually describes repository structure, build steps, and local conventions. Copilot custom agent profiles use `.github/agents/*.agent.md`. Claude Code primarily uses `CLAUDE.md` for project instructions and supports explicit imports; do not assume every client automatically reads the same instruction files.

### Verify Portability

Share the standard skill body, scripts, and references first. Then check discovery paths, supported fields, resource resolution, command environments, and permissions in each client. Keep persistent project conventions in the client's repository-instruction entry point; one skill invocation does not permanently govern every future session.

## Where Skills Fit in the AI Customization Stack

To understand Skills' positioning, you need to see the **complete customization hierarchy** of AI coding assistants. In a comprehensive workflow for [AI coding mastery](/en/articles/ai-coding-mastery/), clear separation between these customization layers prevents prompt drift and token bloat:

```mermaid
graph TB
    subgraph CustomizationLayers["Customization Layers"]
        L1["System Prompt — Built-in by platform, not developer-modifiable"]
        L2["Custom Instructions — User global preferences (e.g., always reply in English)"]
        L3["Project Rules — Project-level conventions (e.g., use 4-space indentation)"]
        L4["Skills — Task-domain expertise (e.g., Code Review standards)"]
        L5["MCP Tools — External system interaction (e.g., database, GitHub API)"]
        L6["Conversation Context — Current session content"]
    end
    L1 --> L2 --> L3 --> L4 --> L5 --> L6
```

### Skills vs MCP: Complementary, Not Competing

Many people confuse Skills and [MCP (Model Context Protocol)](/en/articles/mcp-guide/). They operate at **entirely different levels**:

| Dimension | Skills | MCP |
|-----------|--------|-----|
| **Nature** | "Knowing how to do it" (knowledge and process) | "Being able to do it" (tools and capabilities) |
| **Analogy** | Employee handbook / SOP docs | Toolbox / Equipment |
| **Content** | Instructions, standards, templates, best practices | API endpoints, databases, filesystems |
| **Execution** | Guides AI behavior patterns | Lets AI call external tools |
| **Synergy** | Skills guide AI on **how to use** MCP tools | MCP provides the **actual capabilities** referenced in Skills |

> **In one sentence**: Skills are "knowledge in the AI's brain," MCP is "tools in the AI's hands." A complete AI coding workflow needs both — Skills tell the AI "check for N+1 queries during code review," MCP lets the AI "actually connect to the database to verify query performance."

### Skills vs Prompt Engineering

Skills also differ fundamentally from Prompt Engineering:

| Dimension | Prompt Engineering | Skills |
|-----------|-------------------|--------|
| **Duration** | Single conversation | Persistent, cross-session |
| **Granularity** | Entire prompt text | Modular, composable on-demand |
| **Maintenance** | Embedded in code or manually typed | Version controlled, team-shared |
| **Expertise needed** | Deep LLM understanding required | Just write Markdown |

## Best Practices for Writing Skills

### Six Core Principles

**1. Single Responsibility**

Each Skill solves one domain's problems. Don't combine Code Review, Git Commit, and deployment workflows in a single file.

**2. Clear Trigger Conditions**

State explicitly at the top of your SKILL.md when to use the Skill:

```markdown
Use this skill when the user asks for code review, PR review, or code quality checks.
```

**3. Specific, Not Abstract**

❌ "Write high-quality code"

✅ "Functions must not exceed 50 lines, use 4-space indentation, all public methods must have docstrings"

**4. Provide Output Templates**

Define structured output formats to ensure predictable, comparable outputs every time.

**5. At Least One Complete Example**

Humans need examples to understand docs; AI does too. One high-quality input→output example beats ten paragraphs of rules.

**6. Version Control and Iteration**

Skills should be managed via Git. Continuously refine based on usage feedback — if the AI frequently ignores a rule, the rule isn't written clearly enough.

### Four Skill Design Patterns

```mermaid
graph LR
    A["Checklist Pattern"] --> A1["Code Review\nSecurity Audit\nPR Review"]
    B["Knowledge Capture"] --> B1["Project Architecture\nDeploy Workflows\nTech Stack Docs"]
    C["Format Standard"] --> C1["Commit Messages\nDoc Templates\nAPI Specs"]
    D["Workflow Pattern"] --> D1["CI/CD Pipelines\nRelease Process\nMigration Steps"]
```

| Pattern | Use Cases | Key Characteristics |
|---------|-----------|-------------------|
| **Checklist** | Code Review, security audits | Priority-ordered check items |
| **Knowledge Capture** | Project architecture, deploy docs | Codify team knowledge, reduce onboarding cost |
| **Format Standard** | Commit messages, API design | Table-driven, strict formatting |
| **Workflow** | CI/CD, release processes | Multi-step ordered operations |

### Anti-Patterns (Avoid These)

- ❌ **Mega-Skill**: One file covering all scenarios, causing token waste and instruction conflicts
- ❌ **Vague description**: Writing `description` as "helps with programming" — AI can't determine when to trigger
- ❌ **No examples**: Rules-only without examples leads to AI misinterpretation
- ❌ **No output format**: AI outputs different formats each time, blocking standardization
- ❌ **Overlapping responsibilities**: Multiple Skills covering the same domain causes instruction conflicts

## Enterprise Skills Architecture

As team size grows, Skills management needs to be elevated to an architectural concern:

### 1. Layered Organization Strategy

```text
project-root/
├── AGENTS.md              # Cross-platform universal project context
├── CLAUDE.md              # Claude Code global config
├── .github/
│   └── copilot-instructions.md  # GitHub Copilot config
├── .cursor/
│   └── rules/             # Cursor rules directory
│       ├── python.mdc
│       └── typescript.mdc
└── .claude/
    └── skills/            # Claude Skills directory
        ├── code-review/
        │   └── SKILL.md
        ├── git-commit/
        │   └── SKILL.md
        └── deploy/
            ├── SKILL.md
            └── scripts/
                └── deploy.sh
```

### 2. Multi-Platform Compatibility Strategy

If team members use different AI tools, adopt an **AGENTS.md as common layer + platform-specific configs** strategy:

- `AGENTS.md` defines project context and coding standards universal to all tools (OpenAI Codex, GitHub Copilot, Gemini, etc.)
- Platform-specific config files define tool-exclusive advanced features
- Git version control ensures team-wide synchronization

### 3. Team Skills Governance

- **Regular audits**: Quarterly review of Skills effectiveness, remove outdated rules
- **Usage metrics**: Track Skills trigger frequency and output quality
- **Tiered management**: Core rules (security-related) require Tech Lead approval; general rules are self-maintained by team members

## Trends and Outlook

### 2025-2026 Key Evolution

```mermaid
timeline
    title Skills System Evolution Timeline
    2023.08 / 11 : ChatGPT Custom Instructions & GPTs launch : OpenAI establishes early prompt customization
    2024 : .cursorrules single file : Earliest editor-level custom instructions implementation
    2024.10 : copilot-instructions.md : GitHub Copilot supports repo-level custom instructions
    2025.02 : CLAUDE.md specification : Claude Code launches project-level memory and rules
    2025-05-16 : AGENTS.md standard published : Driving cross-platform open agent standards
    2025-10-16 : SKILL.md launches : Anthropic introduces modular Agent Skills system
    2026 Q1 : Agent Skills 2.0 : Multi-agent orchestration, dynamic injection, and cross-platform compatibility
```

### Future Shape

1. **Standard convergence**: `AGENTS.md` is becoming the cross-platform de facto standard; a unified Skills protocol (similar to MCP) may emerge
2. **From instructions to execution**: Skills evolving from plain-text instructions to complete execution packages with scripts, MCP tool references, and automation workflows
3. **AI-generated Skills**: AI can auto-distill and generate Skills from developer work patterns, creating a "gets smarter the more you use it" positive feedback loop
4. **Skills marketplace**: Similar to the VS Code extension marketplace and OpenAI's GPT Store, community-driven Skills sharing platforms are emerging
5. **Deep MCP integration**: Skills serving as "user manuals" for MCP tools, both collaboratively building the complete AI development ecosystem

```mermaid
graph LR
    subgraph FutureWorkbench["Future AI Developer Workbench"]
        Brain["AI Model (Brain)"]
        MCP["MCP Tools (Hands)"]
        Skills["Skills (Expertise)"]
        Context["Conversation Context (Current Task)"]
        Brain --- Skills
        Brain --- MCP
        Brain --- Context
        Skills --- S1["Team Shared"]
        Skills --- S2["Personal Preferences"]
        Skills --- S3["Community Best Practices"]
    end
```

## Frequently Asked Questions (FAQ)

### Q1: What is the fundamental difference between Skills and System Prompts?
System Prompts are immutable foundational instructions embedded by model providers and platform engines to enforce security baselines and core behavioral traits. Skills are developer-defined, domain-specific modular knowledge packages governed by on-demand activation. Rather than bloating the system prompt, Skills are dynamically compiled into context only when specific tasks (such as refactoring, test generation, or API security review) require specialized workflows.

### Q2: Can a large skill catalog consume substantial context?
Yes. Progressive loading usually exposes names and descriptions before activating bodies and resources, but catalog metadata also costs context. Savings depend on catalog size, instruction length, and activation scope; remove redundant or irrelevant skills rather than assuming a fixed 90% saving.

### Q3: How should software architects decide between implementing Skills versus MCP?
Skills and MCP are complementary layers of the AI developer stack: Skills define **how the agent reasons and executes** (standards, decision heuristics, lint constraints, and style templates), while [MCP (Model Context Protocol)](/en/articles/mcp-guide/) provides **the physical hands to interact with systems** (database connections, git APIs, cloud execution sandboxes). Skills guide the model on how to compose and parameterize MCP tools safely.

### Q4: Are modern Skills formats portable across different IDEs and platforms?
Yes. Open standards such as `AGENTS.md`, `CLAUDE.md`, and modular `SKILL.md` specifications rely on platform-agnostic Markdown conventions. They are natively supported across industry tools including GitHub Copilot, Cursor, Claude Code, and emerging agent workbenches. By committing Skills directly into version control, engineering teams guarantee unified AI code generation practices across heterogeneous developer environments.
