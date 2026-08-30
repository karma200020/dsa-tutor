import { Topic } from "../syllabus";

// Module: mod-ai-estimation-tradeoffs - "AI: Estimation & Tradeoffs" (6 topics).
// Coverage: token throughput & latency arithmetic, GPU memory and KV-cache
// sizing formulas, cost-per-query modeling, batching effects on latency vs
// throughput, context-window cost scaling, vector DB sizing. Mirrors the HLD
// "Estimation & Tradeoffs" module in style: back-of-envelope worked math, with
// prices framed as worked variables ("assume $X per million tokens") so the
// method outlives the numbers.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiEstimationTopics: Topic[] = [];
