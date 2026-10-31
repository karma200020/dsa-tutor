import type { Topic } from "../syllabus";

export type TaskKind = "Explain" | "Predict" | "Calculate" | "Diagnose" | "Compare";
export interface RetrievalCard { question: string; answer: string }
export interface NetworkTask {
  kind: TaskKind;
  prompt: string;
  hint: string;
  answer: string;
  reasoning: string;
}
export interface NetworkLesson {
  id: string;
  module: string;
  title: string;
  concepts: string[];
  prerequisites: string[];
  meaning: string;
  why: string;
  model: string;
  steps: string[];
  example: { given: string; result: string; steps: string[] };
  failure: string;
  confusions: string[];
  observe: string;
  interview: { answer: string; followups: string[] };
  recall: RetrievalCard[];
  tasks: NetworkTask[];
  sources: string[];
  advanced: string;
  diagram?: string;
  lab?: string;
}

export interface NetworkTopic extends Topic { network: NetworkLesson }

export function networkTopic(lesson: NetworkLesson): NetworkTopic {
  const optional = ["enterprise", "mobile", "datacenter", "history"].includes(lesson.module);
  return {
    id: `topic-${optional ? "specialist-" : ""}cn-${lesson.id}`,
    moduleId: `mod-cn-${lesson.module}`,
    title: lesson.title,
    optional,
    intuition: lesson.meaning,
    network: lesson,
    lesson: [
      { title: "Why this problem exists", content: lesson.why },
      { title: "Mental model and its limits", content: lesson.model },
      { title: "Mechanism", content: lesson.steps.map((step, i) => `${i + 1}. ${step}`).join("\n") },
      { title: "Failure case", content: lesson.failure },
      { title: "Useful in practice", content: lesson.observe },
      { title: "Advanced boundary", content: lesson.advanced }
    ],
    examples: [{
      title: lesson.title,
      input: lesson.example.given,
      output: lesson.example.result,
      explanation: lesson.example.steps.map((step, i) => `Step ${i + 1}: ${step}`).join("\n")
    }],
    memoryAids: lesson.recall.map((card) => `${card.question} ${card.answer}`),
    tips: lesson.confusions,
    interviewPatterns: lesson.interview.followups,
    faq: [{ question: `Explain ${lesson.title} briefly.`, answer: lesson.interview.answer }],
    references: lesson.sources.map((source) => ({ source: "note", attribution: source, insight: `See the exact reference in this lesson's Sources panel.` }))
  };
}
