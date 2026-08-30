import { Topic } from "../syllabus";

// Module: mod-ai-foundations - "AI: LLM Foundations" (8 topics).
// Coverage: transformer/attention mental model, tokenization, context windows,
// sampling & temperature, embeddings, why models hallucinate, model family
// selection, prompt engineering as a discipline.
//
// Authoring rules for every topic in this file:
// - `enrichTopic` (data/all-topics.ts) has no AI branch, so any field left empty
//   silently inherits DSA-flavored boilerplate. Supply `complexity`, `lesson`,
//   `examples`, `tips`, `tricks`, `memoryAids`, `interviewPatterns`,
//   `references`, `practiceProblems`, and `faq` explicitly.
// - `faq` needs at least 5 entries, each with a non-empty question and an answer
//   of 20+ characters (enforced by scripts/audit-faqs.ts).
// - `complexity` is repurposed for AI topics as a latency/cost framing, e.g.
//   time: "p95 latency dominated by decode tokens", space: "KV cache + index memory".
// - Use `asciiDiagram` from "./_shared" for diagrams; no external images.
export const aiFoundationsTopics: Topic[] = [];
