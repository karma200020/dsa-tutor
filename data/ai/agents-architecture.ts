import { Topic } from "../syllabus";

// Module: mod-ai-agents-architecture - "AI: Agents, Tool Use & App Architecture"
// (10 topics).
// Coverage: the agent spectrum, tool/function calling, ReAct and planning loops,
// agent memory, sandboxing, why agents fail (loops, drift, context rot),
// human-in-the-loop and approval gates, streaming responses, semantic & prompt
// caching, multi-model routing/fallback, rate limits and cost control.
// Orchestration frameworks and MCP get awareness-level treatment only.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiAgentsTopics: Topic[] = [];
