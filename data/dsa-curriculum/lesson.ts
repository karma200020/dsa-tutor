import type { Topic, PracticeVariation, FaqItem } from "../syllabus";

export interface AuthoredAlgorithm {
  id: string;
  moduleId: string;
  title: string;
  optional?: boolean;
  intuition: string;
  contract: string;
  prerequisites: string;
  cues: string;
  invariant: string;
  walkthrough: { input: string; output: string; explanation: string };
  code: string;
  time: string;
  space: string;
  boundaries: string;
  alternatives: string;
  practice: [PracticeVariation, PracticeVariation, PracticeVariation, ...PracticeVariation[]];
  faq: [FaqItem, FaqItem, ...FaqItem[]];
}

// Only presentation structure is shared. Every explanation, program and exercise
// is authored below its algorithm; this never manufactures missing coverage.
export function algorithmTopic(a: AuthoredAlgorithm): Topic {
  return {
    id: a.id, moduleId: a.moduleId, title: a.title, optional: a.optional,
    intuition: a.intuition,
    lesson: [
      { title: "Contract and recognition", content: `${a.contract}\nRecognition cues: ${a.cues}\nPrerequisites: ${a.prerequisites}` },
      { title: "Invariant and correctness", content: a.invariant },
      { title: "C++ implementation", content: a.contract, codeExample: a.code },
      { title: "Edge cases and limitations", content: a.boundaries },
      { title: "Alternatives and trade-offs", content: a.alternatives }
    ],
    examples: [{ title: "Traced execution", ...a.walkthrough }],
    complexity: { time: a.time, space: a.space },
    tips: [a.cues, a.boundaries],
    tricks: [a.alternatives],
    memoryAids: [a.invariant],
    interviewPatterns: [a.contract],
    practiceProblems: a.practice, faq: a.faq
  };
}
