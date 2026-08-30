import { Topic } from "../syllabus";

// Module: mod-ai-adaptation-safety - "AI: Fine-tuning, Safety & Governance"
// (9 topics).
// Coverage: the RAG-vs-fine-tuning decision framework (a full topic on its own),
// SFT, LoRA/QLoRA at concept level, DPO/RLHF conceptually, dataset construction,
// distillation, quantization for serving; then OWASP Top 10 for LLM
// applications, direct and indirect prompt injection, data exfiltration & PII
// handling, guardrails and moderation. Regulation is awareness-level only.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiAdaptationSafetyTopics: Topic[] = [];
