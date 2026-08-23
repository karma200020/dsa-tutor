// Single source of truth for topic data consumed by the app.
// Aggregates every topic dataset, drops entries whose moduleId is not in the
// syllabus, and de-duplicates by topic id (earlier sources win).
import { Example, LessonSection, Reference, Topic, syllabus } from "./syllabus";
import { dsaTopics } from "./dsa-topics";
import { comprehensiveDsaTopics } from "./comprehensive-dsa-topics";
import { dsaTopicsExtended } from "./dsa-topics-extended";
import { expandedDsaTopics } from "./dsa-topics-expanded";
import { expandedDsaTopics as arrayFoundationTopics } from "./expanded-dsa-topics";
import { coverageTopics } from "./expanded-coverage";
import { lldTopics } from "./lld-topics";
import { hldTopics } from "./hld-topics";
import { googleDsaProblems, googleCheatSheetReference } from "./google-cheat-sheet-integration";

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
  };
}

function ensureModuleCoverage(topics: Topic[], moduleIds: string[]): Topic[] {
  return topics;
}

function buildHldSolution(title: string, intuition: string): { lesson: LessonSection; example: Example } {
  return {
    lesson: {
      title: `${title}: complete system design`,
      content:
        `Requirements: define the user-facing operation, latency target, durability, availability, and consistency boundary for ${title}. ` +
        `Capacity: estimate peak requests/sec from active users, average payload size, read/write ratio, and retention; provision headroom for burst traffic. ` +
        `APIs: expose versioned endpoints for the primary read and write operations, require an idempotency key for retried writes, and return request IDs. ` +
        `Data model: store the durable entity keyed by a stable ID, index the query fields, and retain an event or audit record when replay is needed. ` +
        `Architecture and flow: route clients through DNS/CDN and a load balancer to stateless services; read cache first, then the database; send non-critical work to a durable queue and workers. ` +
        `Scaling: partition by the access key, add read replicas, bound cache entries with TTL/LRU, and apply queue backpressure when consumers lag. ` +
        `Consistency and reliability: choose strong writes for correctness-critical state, eventual reads where acceptable, use timeouts, retries with backoff, circuit breakers, health checks, failover, and a dead-letter queue. ` +
        `Security and observability: authenticate and authorize every API, encrypt data in transit and at rest, rate-limit abuse, and monitor latency, saturation, error rate, queue lag, cache hit rate, replication lag, and audit events. ` +
        `Trade-offs: ${intuition} The design favors horizontal scale and graceful degradation over the lowest operational complexity.`
    },
    example: {
      title: `${title}: capacity and failure walkthrough`,
      input: `1M daily users, 10% active at peak, 20 requests per active user per minute, 2KB payloads, 99.99% availability target`,
      output: `~33,334 peak requests/sec with a cache-first read path, partitioned durable storage, and replayable asynchronous work`,
      explanation:
        `Step 1: Estimate peak traffic as 100,000 active users * 20 / 60 = ~33,334 requests/sec; provision multiple stateless service instances with headroom. ` +
        `Step 2: Keep the primary entity in partitioned storage, route by entity/user ID, and add indexes for the read API. ` +
        `Step 3: Serve hot reads from a regional cache; on a miss, read the database and populate the cache with a bounded TTL. ` +
        `Step 4: Write the durable record before publishing an event to a replicated queue; workers handle notifications, indexing, and analytics with deduplication. ` +
        `Step 5: On cache, replica, or worker failure, use bounded retries, circuit breakers, a dead-letter queue, and a degraded read path; monitor p95/p99 latency, error rate, queue lag, cache hit rate, and replication lag. ` +
        `Step 6: Explain the trade-off: asynchronous secondary work improves availability and throughput, while the primary write remains strongly consistent where the business invariant requires it.`
    }
  };
}

function enrichTopic(topic: Topic): Topic {
  const title = topic.title.trim();
  const module = syllabus.find((entry) => entry.id === topic.moduleId);
  const track = module?.track || (topic.moduleId.includes("hld") ? "HLD" : topic.moduleId.includes("lld") ? "LLD" : "DSA");
  const complexity = topic.complexity || {
    time: track === "HLD" ? "Depends on request path and storage strategy" : "Depends on the selected operation",
    space: track === "HLD" ? "Depends on retained data and replication" : "Depends on the data structure state"
  };
  const lesson = topic.lesson && topic.lesson.length > 0
    ? topic.lesson
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
  const hldSolution = track === "HLD" ? buildHldSolution(title, topic.intuition) : null;
  const completeLesson = hldSolution
    ? [...lesson, hldSolution.lesson]
    : lesson;
  const completeExamples = hldSolution
    ? [...examples, hldSolution.example]
    : examples;
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
  const practiceProblems = topic.practiceProblems && topic.practiceProblems.length > 0
    ? topic.practiceProblems
    : [`practice-${topic.id}-core`, `practice-${topic.id}-edge-case`];

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

// ===== GOOGLE CHEAT SHEET REFERENCE TOPICS =====
// Add Google DSA problems as a reference resource
export const googleCheatSheetTopics: Topic[] = [
  {
    id: "topic-google-cheat-sheet-reference",
    moduleId: "mod-interview-foundations",
    title: "Google DSA Interview C++ Cheat Sheet (100+ Problems)",
    intuition: "Quick reference for Google's curated DSA problems organized by category with C++ implementations, patterns, and interview tips.",
    lesson: [
      {
        title: "What is the Google DSA Cheat Sheet?",
        content: `The Google DSA Interview C++ Cheat Sheet is a comprehensive collection of 100+ medium to hard interview problems organized by algorithmic category. Each problem includes:
- C++ code templates and solutions
- Time and space complexity analysis  
- Key insights and common mistakes
- Pattern classification and LeetCode references

This resource accelerates learning by providing battle-tested implementations and highlighting interview patterns.`,
        codeExample: googleCheatSheetReference.commonPatterns.slice(0, 3).map(p => `// Pattern: ${p}`).join("\n")
      },
      {
        title: "How to Use This Resource",
        content: `1. Study the Quick Reference Code Templates section - master each pattern before solving problems
2. Review problems by category to strengthen weak areas
3. For each problem: read description → understand pattern → compare with template → optimize solution
4. Track which patterns appear across multiple problems (meta-learning)
5. Before interviews: do a quick review of all templates in this cheat sheet`,
        codeExample: `// Interview prep workflow:
// 1. Clarify problem constraints
// 2. Identify the pattern (use this cheat sheet)
// 3. Write template solution
// 4. Test with examples
// 5. Optimize and explain tradeoffs`
      }
    ],
    examples: [
      {
        title: "Using the Cheat Sheet During Problem Solving",
        input: "Problem: Find two numbers that sum to target (LeetCode #1)",
        output: "Use Hash Map template with O(n) time complexity",
        explanation: `Step 1: Recognize this is a "pair" problem
Step 2: Recall Hash Map pattern from cheat sheet
Step 3: Apply template: iterate, check complement in map, store as you go
Step 4: Verify: handles duplicates, negative numbers, edge cases
Step 5: Explain: Why O(n) hash map beats O(n log n) sort for one-pass solution`
      }
    ],
    tips: [
      "Memorize the quick reference templates - they appear in 80% of interview problems",
      "Each template solves an entire family of problems, not just one",
      "Common mistakes are listed for each problem - use them as edge case checklist",
      "Time/space tradeoffs in cheat sheet reflect interviewer expectations",
      "Combine multiple templates for complex problems (e.g., BFS + Topological Sort)"
    ],
    tricks: [
      "When stuck on a problem, scan the 'Pattern' column to find similar solved problems",
      "Use 'Common Mistakes' section as your edge case validation checklist",
      "Before coding in an interview, reference template to ensure clean implementation",
      "Problems are organized by category - review entire category to see pattern variations",
      "C++ templates show optimal complexity - use these as target for your solutions"
    ],
    memoryAids: [
      "Hash Map → Frequency/pair problems | Two Pointers → Sorted/palindrome problems",
      "Sliding Window → Subarray/substring problems | DFS → Tree/path problems",
      "BFS → Shortest path (unweighted) | DP → Optimization/counting problems",
      "Binary Search → Searching in answer space | Union-Find → Connectivity problems",
      "The 11 common patterns in cheat sheet cover ~95% of all interview coding problems"
    ],
    interviewPatterns: [
      "Quickly identify problem category and recall template",
      "Write template first, then customize for specific problem",
      "Explain why chosen pattern is optimal before coding",
      "Test with edge cases from 'Common Mistakes' section",
      "Reference cheat sheet memory aids when explaining to interviewer"
    ],
    references: [
      {
        source: "note",
        attribution: "Google DSA Interview C++ Cheat Sheet",
        insight: `Complete collection of ${googleDsaProblems.length} curated interview problems with templates and patterns.`
      },
      {
        source: "blog",
        attribution: "Google Interview Preparation",
        insight: "These patterns are what Google interviewers expect to see in your approach and code."
      }
    ],
    complexity: { time: "Reference material", space: "N/A" }
  },

  // Topic for each category in the cheat sheet
  {
    id: "topic-google-arrays-strings-problems",
    moduleId: "mod-arrays-strings",
    title: "Google DSA Problems: Arrays & Strings Collection",
    intuition: "Master frequency maps, two pointers, sliding windows, and prefix sums through Google's curated array/string problems.",
    lesson: [
      {
        title: "Google Array & String Problems Overview",
        content: `Google regularly asks array and string problems that test:
1. Hash map fluency (frequency counting, pair finding)
2. Two pointer technique (palindromes, containers, sorted pairs)
3. Sliding window (subarray/substring optimization)
4. Prefix/suffix reasoning (range queries, product arrays)

The cheat sheet includes 10 carefully selected problems (Easy → Hard) that demonstrate each pattern.`,
        codeExample: `// 10 Google Array & String Problems:
// Easy: Two Sum, Valid Palindrome
// Medium: Longest Substring, Container With Most Water
// Hard: Trapping Rain Water, Minimum Window Substring`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Arrays Strings")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "See LeetCode problem page",
        output: "Optimal solution approach",
        explanation: `Pattern: ${p.pattern}\nKey Insight: ${p.keyInsights[0]}\nComplexity: ${p.timeComplexity} time, ${p.spaceComplexity} space`
      })),
    tips: googleDsaProblems
      .filter(p => p.category === "Arrays Strings")
      .flatMap(p => p.keyInsights)
      .slice(0, 5),
    tricks: [
      "Always check if array is sorted (affects pointer strategy)",
      "Frequency map queries are O(1) - use this for optimization",
      "Sliding window pointer movements: expand right, contract left when condition met",
      "Two pointer techniques: same direction, opposite ends, or one fast one slow"
    ],
    memoryAids: [
      "Frequency questions? → Hash Map (One pass O(n))",
      "Sorted array? → Two Pointers (O(1) space)",
      "Subarray/substring? → Sliding Window (Avoid nested loops)",
      "Range queries? → Prefix Sum (Precompute for O(1) queries)"
    ],
    practiceProblems: googleDsaProblems.filter(p => p.category === "Arrays Strings").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  },

  // Trees & Graphs problems from Google cheat sheet
  {
    id: "topic-google-trees-graphs-problems",
    moduleId: "mod-graphs",
    title: "Google DSA Problems: Trees & Graphs Collection",
    intuition: "Master DFS, BFS, topological sort, and tree algorithms through Google's interview problems.",
    lesson: [
      {
        title: "Google Trees & Graphs Problems Overview",
        content: `Google's tree and graph problems test:
1. DFS mastery (trees, graphs, backtracking)
2. BFS correctness (shortest path, level-order)
3. Cycle detection and topological sorting
4. Tree properties (LCA, path sums, serialization)

The cheat sheet includes 15 problems covering these core patterns.`,
        codeExample: `// 15 Google Tree & Graph Problems:
// Medium: Islands, LCA, Course Schedule, Word Ladder
// Hard: Binary Tree Max Path, Serialize/Deserialize, Word Ladder`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Trees Graphs")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "See LeetCode problem page",
        output: "Optimal solution using cheat sheet template",
        explanation: `Pattern: ${p.pattern}\nKey: ${p.keyInsights[0]}\nComplexity: ${p.timeComplexity} time`
      })),
    tips: googleDsaProblems
      .filter(p => p.category === "Trees Graphs")
      .flatMap(p => p.keyInsights)
      .slice(0, 5),
    practiceProblems: googleDsaProblems.filter(p => p.category === "Trees Graphs").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  },

  // DP problems from Google cheat sheet
  {
    id: "topic-google-dp-problems",
    moduleId: "mod-dynamic-programming",
    title: "Google DSA Problems: Dynamic Programming Collection",
    intuition: "Master 1D and 2D DP patterns through Google's optimization and state-transition problems.",
    lesson: [
      {
        title: "Google DP Problems Overview",
        content: `Google's DP problems focus on:
1. State definition and transitions
2. Base cases and recurrence relations
3. Space optimization (1D vs 2D vs O(1))
4. Recognizing DP in disguise (greedy looks like DP)

The cheat sheet includes 10+ DP problems from easy to hard.`,
        codeExample: `// Google DP Problem Categories:
// Classic: House Robber, Coin Change, LCS
// String: Edit Distance, Regex Matching
// Grid: Unique Paths, Minimum Cost Path`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Dynamic Programming")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "DP state problem - see LeetCode",
        output: "Optimal subproblem solution",
        explanation: `Pattern: ${p.pattern}\nRecurrence: See template in cheat sheet\nKey: ${p.keyInsights[0]}`
      })),
    tips: [
      "Always define state clearly before coding: dp[i] = ?",
      "Write base cases first, then recurrence",
      "Test recurrence with small examples on paper",
      "Optimize space only after correctness is verified"
    ],
    practiceProblems: googleDsaProblems.filter(p => p.category === "Dynamic Programming").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  }
];

// Add Google cheat sheet topics to the main export
export const allTopicsWithGoogle: Topic[] = [...allTopics, ...googleCheatSheetTopics];

// Export only google cheat sheet topics for reference
export const topicsByGoogleCategory = {
  "Arrays & Strings": googleCheatSheetTopics.filter(t => t.id === "topic-google-arrays-strings-problems"),
  "Trees & Graphs": googleCheatSheetTopics.filter(t => t.id === "topic-google-trees-graphs-problems"),
  "Dynamic Programming": googleCheatSheetTopics.filter(t => t.id === "topic-google-dp-problems"),
};

// Helper: Get all Google problems for a specific module
export const getGoogleProblemsForModule = (moduleId: string) => {
  return googleDsaProblems.filter(p => {
    const categoryToModule: Record<string, string> = {
      "Arrays Strings": "mod-arrays-strings",
      "Trees Graphs": "mod-graphs",
      "Dynamic Programming": "mod-dynamic-programming",
      "Recent 2024-2025": "mod-interview-foundations",
    };
    return categoryToModule[p.category as keyof typeof categoryToModule] === moduleId;
  });
};

// For backward compatibility, export allTopics with google content merged
export { allTopicsWithGoogle as allTopicsEnhanced };
