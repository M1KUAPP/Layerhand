# GPT-6 Astra: Leverage primitives, limits, cost

Released September 3, 2026. Model ID `gpt-6-astra` via the Responses API.

## Capability primitives

Ideate from these. Each is a thing that was not practical before Astra.

### 1. Computer use on real desktop software

The headline capability. Astra operates software the way a person does — browsers, spreadsheets, desktop apps, terminals — via screenshots and background control, and finishes multi-step jobs instead of describing them. Reported working targets include Blender, Fusion 360, and Unreal Engine 5.

- OSWorld V2-Offline: **72.6%** (GPT-5.6 Sol: 65.7%)
- ScreenSpot Pro and AutomationBench also cited as headline evals
- Average task time dropped from ~75 min to ~40 min

**Ideation angle:** any professional workflow locked inside a GUI with no usable API. Legacy enterprise software, CAD, DAWs, video editors, scientific instruments, ERP systems, government portals.

### 2. Million-token single-pass context

1,050,000-token context, 128,000 max output, knowledge cutoff April 30, 2026.

**Ideation angle:** whole-corpus reasoning with no RAG and no chunking. An entire codebase, a full case file, a company's complete document history, a legislative session, a year of logs — reasoned over at once, where retrieval would have destroyed the cross-references that matter.

### 3. Async tool calling

Set `async: true` on a function or custom tool; Astra keeps reasoning, calls other tools, or answers independent parts of the request while your tool runs, returning the result later via the original `call_id`.

**Ideation angle:** products built around genuinely slow tools — renders, simulations, builds, test suites, lab instruments, physical devices. The agent stays productive across the wait instead of blocking.

### 4. Mid-turn steering

Send additional user instructions while Astra is working — a correction, a changed requirement. Over a WebSocket connection the Responses API preserves completed work.

**Ideation angle:** a new interaction model. An agent you interrupt and redirect mid-task, like a colleague, rather than one you re-prompt from scratch. Strongest in creative and design tools where intent only becomes clear once you see partial output.

### 5. Persisted reasoning and notes

In Codex, Astra records detailed notes that persist as a conversation nears its context limit, rather than compacting the session into a single lossy summary. Notes remain searchable, preserving failure details and requirements. Experimental, off by default.

**Ideation angle:** work sessions measured in hours or days that do not lose the thread. Long-running research, incident response, migrations, audits.

### 6. Programmatic tool calling and multi-agent orchestration

Astra writes and runs code that calls your tools in a loop, and coordinates subagents.

**Ideation angle:** many-item batch work where per-item LLM calls would be too slow or too expensive — the model writes the loop instead of being the loop.

### 7. Hosted shell, apply patch, skills, MCP, tool search

Real file and command execution, structured patching, skill loading, MCP servers, and tool search for large tool sets.

### 8. WebMCP

A page exposes typed tools that agents call directly instead of guessing at the UI. Supported in the ChatGPT desktop browser and ChatGPT Sites. OpenAI is actively pushing this — it is a filter category on the developer showcase and had its own challenge in August 2026.

**Ideation angle:** shared human-agent surfaces, where a person and their agent use the same app together. Well-aligned with what OpenAI wants to promote, but see the crowding note in `prior-art.md`.

### 9. Mid-run reasoning effort control

Reasoning effort is `low` or `high` — **`none` is not supported**; migrate from `none`/`minimal` to `low`. A `configuration_update` input item raises effort for hard work or lowers it for routine follow-ups.

**Ideation angle:** cost-adaptive products that spend heavily only on the hard step.

Also available: Structured Outputs, streaming, prompt caching, pro mode.

## Hard limits

Check an idea against these before committing.

| Limit | Consequence |
|---|---|
| **Text output only** (accepts text + image input) | No native image, audio, or video generation. Anything visual needs a separate tool. |
| **Latency** | Unsuitable for real-time reaction loops. Reported failures on games needing simultaneous inputs or fast responses. |
| **No fine-tuning, no open weights** | No self-hosting, no domain-tuned variant. |
| **Cyber gated "Critical"** | First model rated Critical for cybersecurity under the Preparedness Framework. Standard access refuses exploit discovery; advanced security work requires Trusted Access or Daybreak. Unrelated tasks may be slowed or blocked. |
| **Coding lead is marginal** | DeepSWE v1.1: 74.1% vs 72.7%. "Better coding assistant" is a weak pitch — competitors are within noise. |
| **No cross-conversation memory** | Persistence is your job, not the model's. |

## Cost math

| Item | Price per 1M tokens |
|---|---|
| Input | $10.00 |
| Cached input | $1.00 |
| Cache write | $12.50 |
| Output | $50.00 |

Modifiers: overage past 272K input tokens costs 2x input / 1.5x output. Fast mode 2x. Batch and Flex 50% off.

**Run this before committing.** A computer-use agent taking 40 minutes of screenshot-driven steps consumes a large multiple of a chat turn. Estimate tokens for one complete user session, multiply out, then answer: who pays, and what stops a single user from costing $50 on launch day? Prompt caching and Batch/Flex are the main levers; a hard step budget is the other.

## Other benchmark figures

ARC-AGI-3: 99.9% · FrontierMath Tier 4: 97.6% · ExploitBench: 100% · also evaluated on Agents' Last Exam, TerminalBench-4.0, Terminal-Bench Science 0.1, HealthBench Pro.

## Prompting Astra differently

From OpenAI's "Rethinking skills and prompts for GPT-6 Astra":

- **Stop over-scaffolding.** Remove guardrails that force permission-asking or full-doc reads before every task.
- **Stop bloated skill descriptions.** "Use when working with databases" loads irrelevant context. Prefer "Use when adding or changing a migration, or reviewing its rollout."
- **Stop mandatory pre-work.** Astra self-directs to the resources it needs.
- **Stop over-constraining.** Astra reads restrictive language literally and will halt productive work.
- **Define completion explicitly.** Astra stops tentatively. Say whether the task includes testing and iteration.
- **Grant conditional permissions.** "Run them, fix failures, and rerun affected tests without asking for approval at each step."
- **Use progressive disclosure** — a minimal routing document pointing to supporting material.

Model guidance also flags four tuning areas: initiative, instruction sensitivity (user instructions override skill files), writing style (prose vs. lists), and delegation/test scope.
