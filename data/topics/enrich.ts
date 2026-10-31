// Shared aggregation and enrichment pipeline for every track's topic dataset.
// Track-specific enrichment (HLD/LLD solution sections and FAQs) is supplied by
// the caller as a `TrackEnricher` so that each per-track module in this folder
// can be loaded on its own, without dragging in the other tracks' builders.
import { Example, LessonSection, Reference, Topic, syllabus, FaqItem, Track } from "../syllabus";
import { isPracticeVariation } from "../practice-variation";

const validModuleIds = new Set(syllabus.map((m) => m.id));

export type TrackEnricher = {
  buildSolution?: (topic: Topic, title: string) => { lesson: LessonSection[]; example?: Example } | null;
  buildFaq?: (topic: Topic, title: string, complexity: { time: string; space: string }) => FaqItem[];
};

// Enrichment is chosen by the topic's syllabus track.
export type TrackEnrichers = Partial<
  Record<Track, TrackEnricher>
>;

function buildFallbackTopic(moduleId: string, moduleTitle: string): Topic {
  const cleanTitle = moduleTitle.replace(/[:()]/g, "").trim();
  const topicId = `${moduleId}-core-topic`;
  return {
    id: topicId,
    moduleId,
    title: `${cleanTitle} Core Pattern`,
    intuition: `This module is about practicing the fundamental interview patterns behind ${moduleTitle.toLowerCase()}. The goal is to reason clearly, choose the right abstraction, and explain trade-offs under pressure.`,
    lesson: [
      {
        title: "Why this module matters",
        content: `In FAANG interviews, ${moduleTitle.toLowerCase()} is assessed by how you reason about the problem, clarify constraints, and communicate the algorithmic trade-offs. The interviewer is looking for a clear plan, not just a final answer.`,
        codeExample: `// Step 1: clarify\n// Step 2: model the state\n// Step 3: identify the invariant\n// Step 4: implement and validate`
      },
      {
        title: "Interview approach",
        content: `Start with a brute-force version to show that you understand the raw problem. Then refine it by tracking only the necessary state. Explain complexity, edge cases, and why the chosen structure is the right fit before coding.`,
        codeExample: `// brute force -> optimize\n// store only the needed state\n// prune or compress when possible`
      }
    ],
    tips: [
      "Restate the problem in plain English before picking an approach.",
      "State the invariant clearly before writing code.",
      "Handle edge cases before optimizing performance."
    ],
    tricks: [
      "Look for what changes from one step to the next.",
      "Brute force first, then reduce state to the relevant information.",
      "Dry-run with a small example before coding."
    ],
    memoryAids: [
      "Problem -> constraints -> state -> invariant -> code.",
      "If the constraints are large, think in terms of scans, maps, ordering, or pruning.",
      "A clean explanation often earns more credit than an overly clever implementation."
    ],
    interviewPatterns: [
      "Explain the brute force and why it is too slow.",
      "Walk through one worked example step by step.",
      "Discuss edge cases and trade-offs before finalizing the answer."
    ],
    references: [
      { source: "leetcode", attribution: "LeetCode", insight: `Practice the ${cleanTitle} pattern in interview-style questions.` },
      { source: "note", attribution: "NeetCode / TakeUForward", insight: `Use this module as a framework for learning ${cleanTitle.toLowerCase()} with clear interview patterns.` }
    ],
    practiceProblems: [],
  };
}

export function ensureModuleCoverage(topics: Topic[], moduleIds: string[]): Topic[] {
  return topics;
}

function enrichTopic(topic: Topic, enrichers: TrackEnrichers): Topic {
  const title = topic.title.trim();
  const module = syllabus.find((entry) => entry.id === topic.moduleId);
  const track = module?.track || (topic.moduleId.includes("hld") ? "HLD" : topic.moduleId.includes("lld") ? "LLD" : "DSA");
  const enricher = enrichers[track] || null;
  const complexity = topic.complexity || {
    time: track === "HLD" ? "Depends on request path and storage strategy" : "Depends on the selected operation",
    space: track === "HLD" ? "Depends on retained data and replication" : "Depends on the data structure state"
  };
  const lesson = topic.lesson && topic.lesson.length > 0
    ? topic.lesson
    : track === "DSA" ? [
        {
          title: "Core algorithm",
          content: topic.intuition,
          codeExample: `solve(input):\n  apply "${topic.intuition.replace(/"/g, "'")}"\n  preserve the stated invariant\n  return the required result`
        },
        {
          title: "Complexity & follow-up",
          content: `${title} uses ${complexity.time} time and ${complexity.space} auxiliary space. Re-evaluate the representation if the interviewer changes either constraint.`,
          codeExample: `time = ${complexity.time}\nspace = ${complexity.space}\ncheck the dominant operation`
        }
      ]
      : [
        {
          title: `${title}: core model`,
          content: `${topic.intuition} Relate each state change to the ${track} interview requirement before choosing an implementation.`,
          codeExample: `// ${title}\n// identify inputs, state, transitions, and the invariant`
        },
        {
          title: `${title}: interview walkthrough`,
          content: `For ${title}, explain the contract first, trace one concrete case, then discuss the boundary conditions and the trade-off represented by ${complexity.time}.`,
          codeExample: `// contract -> concrete trace -> edge cases -> complexity`
        }
      ];
  const examples = topic.examples && topic.examples.length > 0
    ? topic.examples
    : [
        {
          title: `${title}: concrete trace`,
          input: `A representative ${title} case with its key boundary condition`,
          output: `The ${title} invariant is preserved after each transition`,
          explanation: `${topic.intuition} Start with the initial state, apply the operation one step at a time, and verify the result against the expected ${track} behavior.`
        }
      ];
  // Track-specific solution sections (HLD architecture write-up, LLD mock
  // solution) are injected by the per-track enricher instead of being branched
  // on here, so a track's dataset only pulls in its own builders.
  const solution = enricher && enricher.buildSolution ? enricher.buildSolution(topic, title) : null;
  const completeLesson = solution ? [...lesson, ...solution.lesson] : lesson;
  const completeExamples = solution?.example ? [...examples, solution.example] : examples;
  const tips = topic.tips && topic.tips.length > 0
    ? topic.tips
    : [
        `Name the invariant that makes ${title} correct.`,
        `Trace ${title} with an empty input, the smallest valid input, and a boundary case.`,
        `Choose the representation that supports the operation described by ${topic.intuition.toLowerCase()}.`
      ];
  const tricks = topic.tricks && topic.tricks.length > 0
    ? topic.tricks
    : [
        `For ${title}, challenge the first approach with the constraint that drives ${complexity.time}.`,
        `When explaining ${title}, separate state transitions from the final result.`,
        `Use the worked trace to expose duplicates, ordering, concurrency, or failure behavior before coding.`
      ];
  const memoryAids = topic.memoryAids && topic.memoryAids.length > 0
    ? topic.memoryAids
    : [`${title}: model the state, preserve the invariant, validate the boundary case.`, `${track} cue: requirement -> state -> transition -> trade-off.`];
  const interviewPatterns = topic.interviewPatterns && topic.interviewPatterns.length > 0
    ? topic.interviewPatterns
    : [
        `Explain when ${title} is the right tool and what constraint rules it out.`,
        `Walk through the concrete trace for ${title} before writing code or drawing components.`,
        `Defend ${complexity.time} time and ${complexity.space} space in the interview.`
      ];
  const references: Reference[] = topic.references && topic.references.length > 0
    ? topic.references
    : [
        {
          source: track === "DSA" ? "leetcode" : "interview-experience",
          attribution: track === "DSA" ? `${title} practice set` : `${track} interview design prompt`,
          insight: `Use ${title} to practice the ${track} trade-offs described by the topic intuition.`
        },
        {
          source: "note",
          attribution: `${track} study notes`,
          insight: `Review the state, failure modes, and complexity of ${title} after each practice run.`
        }
      ];
  // A topic with no authored practice content used to be back-filled with fake
  // slug IDs (`practice-<id>-core`), which the UI rendered as literal text. An
  // empty list is honest: TopicViewer already shows an explicit empty state.
  const practiceProblems = topic.practiceProblems && topic.practiceProblems.length > 0
    ? topic.practiceProblems
    : [];
  const trackFaq = enricher && enricher.buildFaq ? enricher.buildFaq(topic, title, complexity) : null;
  const dsaFaq = track === "DSA" ? buildDsaFaq(topic, title, complexity, completeExamples) : null;
  const faq = topic.faq && topic.faq.length > 0
    ? topic.faq
    : trackFaq
      ? trackFaq
      : dsaFaq
        ? dsaFaq
        : [
        {
          question: `When should I reach for ${title} in an interview?`,
          answer: `Pick ${title} when the interviewer's constraints match the trade-off it is built for: ${complexity.time} time and ${complexity.space} space. State the constraint out loud, then justify the choice instead of jumping straight to code.`,
          source: `${track} interview practice notes`
        },
        {
          question: `What is the most common mistake candidates make with ${title}?`,
          answer: `Candidates often skip stating the invariant and jump to implementation. Walk through a concrete trace first, confirm the boundary case, and only then write code so the interviewer can follow your reasoning.`,
          source: `${track} interview practice notes`
        },
        {
          question: `How do I defend the complexity of ${title} if challenged?`,
          answer: `Explain what operation dominates the cost and why no cheaper representation satisfies the same constraints. Reference the concrete trace to show where the ${complexity.time} bound comes from.`,
          source: `${track} interview practice notes`
        }
      ];


  return {
    ...topic,
    lesson: completeLesson,
    examples: completeExamples,
    tips,
    tricks,
    memoryAids,
    interviewPatterns,
    references,
    practiceProblems,
    faq,
    complexity
  };
  /*
  const fallbackTitle = topic.title || "Topic";
  const words = fallbackTitle.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const keyWord = words[0] || "pattern";
  const lowerTitle = fallbackTitle.toLowerCase();
  const defaultLesson = [
    {
      title: "Core idea",
      content:
        lowerTitle.includes("singleton")
          ? `A singleton is only appropriate when the system truly needs a single shared instance, such as a logger or config object. The real interview question is how you protect lifecycle, threading, and global state.`
          : lowerTitle.includes("factory")
            ? `A factory abstracts object creation so the caller depends on an interface instead of concrete classes. The key is to centralize creation logic while keeping the client code simple and extensible.`
            : lowerTitle.includes("observer")
              ? `The observer pattern is about a subject notifying multiple listeners when state changes. The interview focus is on loose coupling, event flow, and clear subscription lifecycle.`
              : lowerTitle.includes("cache") || lowerTitle.includes("rate limiter")
                ? `This design decision is about protecting the system under load. You should talk about access patterns, invalidation, and the cost of stale data versus performance.`
                : lowerTitle.includes("load balancing") || lowerTitle.includes("replication") || lowerTitle.includes("consistency")
                  ? `This design asks where the bottleneck is and which trade-off is worth making. Use traffic estimates and explain how capacity, failure handling, and data freshness interact.`
                  : `For ${fallbackTitle}, the real interview skill is clarifying responsibilities, identifying the core state, and choosing the cleanest abstraction before you optimize or code.`,
      codeExample:
        lowerTitle.includes("singleton")
          ? `class Logger {\n  static instance;\n  private constructor() {}\n  static getInstance() {\n    if (!Logger.instance) Logger.instance = new Logger();\n    return Logger.instance;\n  }\n}`
          : lowerTitle.includes("factory")
            ? `class VehicleFactory {\n  static create(type) {\n    if (type === 'car') return new Car();\n    return new Bike();\n  }\n}`
            : lowerTitle.includes("cache") || lowerTitle.includes("rate limiter")
              ? `// policy -> quota / TTL / invalidation\n// hot path -> cache miss -> fallback -> retry policy`
              : `// clarify requirements\n// define responsibilities\n// choose abstraction\n// validate edge cases`
    },
    {
      title: "Interview execution",
      content: `Walk through ${fallbackTitle} as a design conversation, not as a code dump. State the requirement, mention the key constraints, and explain why the chosen abstraction or architectural decision is the right fit for this problem. In a good FAANG answer, you define the contract before you define the implementation.`,
      codeExample: `// requirements\n// key entities\n// failure behavior\n// trade-offs\n// scale decisions`
    },
    {
      title: "Edge cases & failure modes",
      content: `Test invalid states, concurrency issues, stale data, failure recovery, and scale-out behavior before calling ${fallbackTitle} complete. If your design fails at scale or under partial outage, it is not ready for a FAANG-level interview answer.`,
      codeExample: `// invalid state\n// retry path\n// concurrency\n// stale data or load spike\n// degraded mode`
    }

  ];
  return {
    ...topic,
    lesson: topic.lesson && topic.lesson.length > 0 ? topic.lesson : defaultLesson,
    examples: topic.examples,
    methodology: topic.methodology,
    workedExample: topic.workedExample,
    complexity: topic.complexity,
    tips:
      topic.tips && topic.tips.length > 0
        ? topic.tips
        : [
            `State the problem in your own words before choosing an approach for ${fallbackTitle}.`,
            "Handle edge cases and constraints before optimising the solution.",
            "Explain the time and space trade-off clearly while talking through the interview.",
            "In system design, identify the bottleneck before proposing a cache, queue, or replica."
          ],
    tricks:
      topic.tricks && topic.tricks.length > 0
        ? topic.tricks
        : [
            `Recognise the invariant for ${fallbackTitle}: what stays true after each step?`,
            `Start from a brute-force idea, then optimise once the pattern is obvious.`,
            `Use a small dry run to verify correctness before coding.`,
            `If a strongly consistent answer is required, say so explicitly and name the trade-off.`
          ],
    memoryAids:
      topic.memoryAids && topic.memoryAids.length > 0
        ? topic.memoryAids
        : [
            `Remember: ${fallbackTitle} usually reduces to state tracking, ordering, or boundary checks.`,
            `If the input is large, think in terms of scanning once, using a map, or using a monotonic structure.`,
            `${keyWord.charAt(0).toUpperCase() + keyWord.slice(1)} -> pattern -> prove -> code.`,
            `For system design: requirement -> traffic -> bottleneck -> trade-offs -> decision.`
          ],
    interviewPatterns:
      topic.interviewPatterns && topic.interviewPatterns.length > 0
        ? topic.interviewPatterns
        : [
            `Explain the brute-force solution for ${fallbackTitle} before the optimized one.`,
            "Walk the interviewer through the state changes and the reasoning behind the chosen data structure.",
            "Discuss edge cases, invariants, and complexity trade-offs before coding.",
            "For HLD, explain traffic assumptions, bottlenecks, and failure handling before drawing a final architecture."
          ],
    references:
      topic.references && topic.references.length > 0
        ? topic.references
        : [
            {
              source: "leetcode",
              attribution: "LeetCode",
              insight: `Core FAANG-style practice for ${fallbackTitle}.`
            },
            {
              source: "note",
              attribution: "NeetCode / TakeUForward style notes",
              insight: `Interview drill for understanding the ${fallbackTitle.toLowerCase()} pattern and trade-offs.`
            }
          ],
    practiceProblems:
      topic.practiceProblems && topic.practiceProblems.length > 0
        ? topic.practiceProblems
        : [`lc-${fallbackTitle.toLowerCase().replace(/\s+/g, "-")}`]
  };
  */
}

function buildDsaFaq(
  topic: Topic,
  title: string,
  complexity: { time: string; space: string },
  examples: Example[]
): FaqItem[] {
  const variations = (topic.practiceProblems || []).filter(isPracticeVariation).slice(0, 3);
  const faq: FaqItem[] = variations.map((variation) => ({
    question: `How does ${variation.variation} change the approach for ${title}?`,
    answer: variation.tip,
    source: `${title} authored practice variation`
  }));

  const derived: FaqItem[] = [
    {
      question: `What is the core technique behind ${title}?`,
      answer: topic.intuition,
      source: `${title} authored intuition`
    },
    {
      question: `How should I trace the concrete example for ${title}?`,
      answer: examples[0]
        ? `For input ${examples[0].input}, the expected output is ${examples[0].output}. ${examples[0].explanation}`
        : `Apply the authored technique step by step and verify the invariant after each update: ${topic.intuition}`,
      source: `${title} authored example`
    },
    {
      question: `What constraints determine the complexity of ${title}?`,
      answer: `${title} runs in ${complexity.time} time and uses ${complexity.space} auxiliary space. Tie each bound to the operations required by this technique: ${topic.intuition}`,
      source: `${title} authored complexity`
    }
  ];

  for (const item of derived) {
    if (faq.length === 3) break;
    faq.push(item);
  }
  return faq;
}

export function collect(enrichers: TrackEnrichers, ...sources: Topic[][]): Topic[] {
  const seen = new Set<string>();
  const result: Topic[] = [];
  for (const source of sources) {
    for (const topic of source) {
      if (seen.has(topic.id)) continue;
      // A topic whose moduleId is not in the syllabus is dropped here. That used
      // to be completely silent, which makes a typo look identical to content
      // that was never written, so warn loudly instead. No topic in any current
      // dataset hits this; scripts/audit-ai.ts turns it into a hard failure.
      if (!validModuleIds.has(topic.moduleId)) {
        console.warn(
          `[all-topics] Dropping topic "${topic.id}" (${topic.title}): moduleId "${topic.moduleId}" is not in the syllabus.`
        );
        continue;
      }
      seen.add(topic.id);
      result.push(enrichTopic(topic, enrichers));
    }
  }
  return result;
}
