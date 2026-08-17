// Single source of truth for topic data consumed by the app.
// Aggregates every topic dataset, drops entries whose moduleId is not in the
// syllabus, and de-duplicates by topic id (earlier sources win).
import { Topic, syllabus } from "./syllabus";
import { dsaTopics } from "./dsa-topics";
import { comprehensiveDsaTopics } from "./comprehensive-dsa-topics";
import { dsaTopicsExtended } from "./dsa-topics-extended";
import { expandedDsaTopics } from "./dsa-topics-expanded";
import { expandedDsaTopics as arrayFoundationTopics } from "./expanded-dsa-topics";
import { coverageTopics } from "./expanded-coverage";
import { lldTopics } from "./lld-topics";
import { hldTopics } from "./hld-topics";

const validModuleIds = new Set(syllabus.map((m) => m.id));

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
    examples: [
      {
        title: `Worked example for ${moduleTitle}`,
        input: "Problem constraints and sample input",
        output: "Correct final result",
        explanation: `Work through the sample using the smallest possible state, check the transitions, and confirm that the result remains valid across edge cases like empty input, duplicates, and boundary values.`
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
    practiceProblems: [`${moduleId}-practice-1`, `${moduleId}-practice-2`],
    complexity: { time: "O(n)", space: "O(1)" }
  };
}

function ensureModuleCoverage(topics: Topic[], moduleIds: string[]): Topic[] {
  const existing = new Set(topics.map((topic) => topic.moduleId));
  const fallbackTopics: Topic[] = moduleIds
    .filter((moduleId) => !existing.has(moduleId))
    .map((moduleId) => {
      const mod = syllabus.find((entry) => entry.id === moduleId);
      return mod ? buildFallbackTopic(mod.id, mod.title) : null;
    })
    .filter((topic): topic is Topic => !!topic);
  return [...topics, ...fallbackTopics];
}

function enrichTopic(topic: Topic): Topic {
  const fallbackTitle = topic.title || "Topic";
  const words = fallbackTitle.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const keyWord = words[0] || "pattern";
  const defaultLesson = [
    {
      title: "Core idea",
      content: `This is a high-frequency interview pattern. For ${fallbackTitle}, first explain the problem in plain English, identify what changes over time, and decide which state must be tracked.`,
      codeExample: `// Understand behavior\n// 1. Recognize the pattern\n// 2. Track the required state\n// 3. Ensure the update rule is correct\n// 4. Validate edge cases`
    },
    {
      title: "Interview execution",
      content: `Walk through ${fallbackTitle} step by step. State the brute-force idea, explain why it is too slow, and then show the optimized invariant that makes the solution work.`,
      codeExample: `// Talk-through\n// - What is the state?\n// - What changes per iteration?\n// - Why is the chosen data structure valid?`
    },
    {
      title: "Edge cases",
      content: `Check empty input, single-element input, duplicates, sorted vs unsorted data, and maximum-size constraints before finalizing the algorithm for ${fallbackTitle}.`,
      codeExample: `// Edge cases\n// - empty input\n// - duplicates\n// - all same values\n// - boundary conditions`
    }
  ];
  const defaultExample = {
    title: `Worked example: ${fallbackTitle}`,
    input: "Example input scenario",
    output: "Expected result",
    explanation: `Start from the simplest valid interpretation of ${fallbackTitle}. Track the invariant, update the state one step at a time, and verify the final answer against the example.`
  };

  return {
    ...topic,
    lesson: topic.lesson && topic.lesson.length > 0 ? topic.lesson : defaultLesson,
    examples: topic.examples && topic.examples.length > 0 ? topic.examples : [defaultExample],
    complexity: topic.complexity || { time: "O(n)", space: "O(1)" },
    tips:
      topic.tips && topic.tips.length > 0
        ? topic.tips
        : [
            `State the problem in your own words before choosing an approach for ${fallbackTitle}.`,
            "Handle edge cases and constraints before optimising the solution.",
            "Explain the time and space trade-off clearly while talking through the interview."
          ],
    tricks:
      topic.tricks && topic.tricks.length > 0
        ? topic.tricks
        : [
            `Recognise the invariant for ${fallbackTitle}: what stays true after each step?`,
            `Start from a brute-force idea, then optimise once the pattern is obvious.`,
            `Use a small dry run to verify correctness before coding.`
          ],
    memoryAids:
      topic.memoryAids && topic.memoryAids.length > 0
        ? topic.memoryAids
        : [
            `Remember: ${fallbackTitle} usually reduces to state tracking, ordering, or boundary checks.`,
            `If the input is large, think in terms of scanning once, using a map, or using a monotonic structure.`,
            `${keyWord.charAt(0).toUpperCase() + keyWord.slice(1)} -> pattern -> prove -> code.`
          ],
    interviewPatterns:
      topic.interviewPatterns && topic.interviewPatterns.length > 0
        ? topic.interviewPatterns
        : [
            `Explain the brute-force solution for ${fallbackTitle} before the optimized one.`,
            "Walk the interviewer through the state changes and the reasoning behind the chosen data structure.",
            "Discuss edge cases, invariants, and complexity trade-offs before coding."
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
}

function collect(...sources: Topic[][]): Topic[] {
  const seen = new Set<string>();
  const result: Topic[] = [];
  for (const source of sources) {
    for (const topic of source) {
      if (seen.has(topic.id)) continue;
      if (!validModuleIds.has(topic.moduleId)) continue;
      seen.add(topic.id);
      result.push(enrichTopic(topic));
    }
  }
  return result;
}

export const allDsaTopics = ensureModuleCoverage(
  collect(
    dsaTopics,
    comprehensiveDsaTopics,
    dsaTopicsExtended,
    expandedDsaTopics,
    arrayFoundationTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-") && syllabus.some((m) => m.id === t.moduleId))
  ),
  syllabus.filter((m) => m.track === "DSA").map((m) => m.id)
);

export const allLldTopics = ensureModuleCoverage(
  collect(
    lldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-lld"))
  ),
  syllabus.filter((m) => m.track === "LLD").map((m) => m.id)
);
export const allHldTopics = ensureModuleCoverage(
  collect(
    hldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-hld"))
  ),
  syllabus.filter((m) => m.track === "HLD").map((m) => m.id)
);
export const allTopics: Topic[] = [...allDsaTopics, ...allLldTopics, ...allHldTopics];

export const topicsByModule: Record<string, Topic[]> = syllabus.reduce(
  (acc, mod) => {
    acc[mod.id] = allTopics.filter((t) => t.moduleId === mod.id);
    return acc;
  },
  {} as Record<string, Topic[]>
);
