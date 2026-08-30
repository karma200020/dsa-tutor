import { Topic } from "./syllabus";

// AI track content (AI-first software engineering, framed for FAANG interview
// prep). The track is large, so each syllabus module lives in its own file under
// data/ai/ and this file is the aggregator: it concatenates them in syllabus
// dependency order and is the only thing all-topics.ts imports.
//
// Topics follow the same conventions as hld-topics.ts: `intuition`, a
// multi-section `lesson`, `examples` with step-numbered `explanation`, `tips`,
// `interviewPatterns`, `faq`, and `references`. The shared `asciiDiagram` helper
// lives in data/ai/_shared.ts so the ten module files use one copy instead of
// each redeclaring it.
//
// The module arrays are intentionally empty for now: the track wiring is in
// place and per-module content lands next, driven by the content specification.
import { aiFoundationsTopics } from "./ai/foundations";
import { aiMlBridgeTopics } from "./ai/ml-bridge";
import { aiRagTopics } from "./ai/rag";
import { aiAgentsTopics } from "./ai/agents-architecture";
import { aiEvaluationTopics } from "./ai/evaluation";
import { aiAdaptationSafetyTopics } from "./ai/adaptation-safety";
import { aiLlmOpsTopics } from "./ai/llmops";
import { aiEstimationTopics } from "./ai/estimation";
import { aiDesignExerciseTopics } from "./ai/design-exercises";
import { aiMockTopics } from "./ai/mocks";

export const aiTopics: Topic[] = [
  ...aiFoundationsTopics,
  ...aiMlBridgeTopics,
  ...aiRagTopics,
  ...aiAgentsTopics,
  ...aiEvaluationTopics,
  ...aiAdaptationSafetyTopics,
  ...aiLlmOpsTopics,
  ...aiEstimationTopics,
  ...aiDesignExerciseTopics,
  ...aiMockTopics
];
