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

type ExampleContent = {
  title: string;
  input: string;
  output: string;
  explanation: string;
};

function fallbackContent(moduleId: string, moduleTitle: string): ExampleContent {
  const byModule: Record<string, ExampleContent> = {
    "mod-foundations": {
      title: "Choosing an algorithm from constraints",
      input: "n = 100,000 sorted integers; query: does 42 appear?",
      output: "Binary search finds 42 in at most 17 comparisons",
      explanation: "Step 1: A linear scan may inspect all 100,000 values. Step 2: Because the input is sorted, compare the target with the middle value. Step 3: Discard the half that cannot contain 42 and repeat. Step 4: At most ceil(log2(100000)) = 17 comparisons are needed."
    },
    "mod-arrays-strings": {
      title: "Finding a repeated value",
      input: "nums = [4, 1, 4, 2], target = 4",
      output: "indices [0,2]",
      explanation: "Step 1: Scan from left to right and store each value's first index. Step 2: Store 4 at index 0 and 1 at index 1. Step 3: At index 2, 4 is already present, so report [0,2]. The map avoids a nested scan."
    },
    "mod-two-pointers-sliding": {
      title: "Smallest window reaching a target",
      input: "nums = [2,3,1,2,4,3], target = 7",
      output: "length 2 from [4,3]",
      explanation: "Step 1: Expand to [2,3,1,2] with sum 8. Step 2: Shrink from the left while the sum stays at least 7, leaving [2,4]. Step 3: Continue expanding and shrinking; [4,3] has sum 7 and length 2. Step 4: No valid window is shorter."
    },
    "mod-stack-monotonic": {
      title: "Next greater element",
      input: "nums = [2,1,2,4,3]",
      output: "[4,2,4,-1,-1]",
      explanation: "Step 1: Scan right to left with a decreasing stack. Step 2: For 3, no greater value exists, so output -1. Step 3: For each earlier value, pop values that are not greater; the stack top is the next greater value. Step 4: Values 2,1,2,4 produce 4,2,4,-1."
    },
    "mod-binary-search-intervals": {
      title: "First position at least target",
      input: "nums = [1,3,3,5,8], target = 3",
      output: "index 1",
      explanation: "Step 1: Check the middle value 3 and record index 2 as a candidate. Step 2: Search the left half because an earlier 3 may exist. Step 3: Check index 1, also 3, and continue left. Step 4: Index 1 is the first valid position."
    },
    "mod-linked-list": {
      title: "Reverse a linked list",
      input: "head = 1 -> 2 -> 3",
      output: "3 -> 2 -> 1",
      explanation: "Step 1: Set previous=null and current=1. Step 2: Save 2, point 1 to null, then advance. Step 3: Save 3, point 2 to 1, then advance. Step 4: Point 3 to 2; return 3 as the new head."
    },
    "mod-trees-bst": {
      title: "Validate a binary search tree",
      input: "root = [5,3,7,2,4,6,8]",
      output: "true",
      explanation: "Step 1: Visit 5 with bounds (-infinity,infinity). Step 2: Visit 3 within (-infinity,5) and 7 within (5,infinity). Step 3: Children 2,4,6,8 satisfy their inherited bounds. Step 4: Every node is valid, so the tree is a BST."
    },
    "mod-graphs": {
      title: "Shortest route between vertices",
      input: "edges = A-B, A-C, B-D, C-D; start=A, goal=D",
      output: "distance 2",
      explanation: "Step 1: BFS starts at A with distance 0. Step 2: Visit B and C at distance 1. Step 3: From B, discover D at distance 2. Step 4: Return 2 because BFS explores all shorter paths first."
    },
    "mod-dynamic-programming": {
      title: "Minimum coins for an amount",
      input: "coins = [1,3,4], amount = 6",
      output: "2 coins (3 + 3)",
      explanation: "Step 1: dp[0]=0. Step 2: Build upward: dp[3]=1 and dp[4]=1. Step 3: For amount 6, try each last coin; 3 + dp[3] gives 2. Step 4: No candidate uses fewer than 2 coins."
    },
    "mod-heaps": {
      title: "Scheduling the next highest-priority job",
      input: "jobs = [(backup, 2), (payment, 10), (email, 4)] where the number is priority",
      output: "payment, email, backup",
      explanation: "Step 1: Insert all jobs into a max-heap keyed by priority. Step 2: The root is payment (10), so process it first. Step 3: Remove it; email (4) becomes the root. Step 4: Remove email, then process backup (2). Each removal costs O(log n)."
    },
    "mod-greedy-backtracking": {
      title: "Choosing non-overlapping meetings",
      input: "meetings = [[1,3],[2,4],[3,5],[5,7],[6,8]]",
      output: "[[1,3],[3,5],[5,7]] (3 meetings)",
      explanation: "Step 1: Sort by finish time: [1,3], [2,4], [3,5], [5,7], [6,8]. Step 2: Choose [1,3], the earliest finisher. Step 3: Skip [2,4] because it overlaps, then choose [3,5]. Step 4: Choose [5,7]; no later meeting can increase the count. The earliest-finish choice leaves the most room."
    },
    "mod-dsa-mocks": {
      title: "Mock round: shortest path in a grid",
      input: "grid = [[0,0,1],[0,0,0],[1,0,0]], start = (0,0), goal = (2,2)",
      output: "4 moves",
      explanation: "Step 1: Model open cells as vertices and four-direction moves as edges. Step 2: BFS visits (0,0), then (0,1) and (1,0). Step 3: Continue by distance layers until (2,2) is reached. Step 4: The path (0,0)->(0,1)->(1,1)->(2,1)->(2,2) has 4 moves, and BFS proves it is shortest."
    },
    "mod-lld-mocks": {
      title: "Mock design: extend a parking lot",
      input: "Requirement: add EV charging spots without changing car parking or billing code",
      output: "Vehicle and Spot interfaces plus an injected PricingStrategy",
      explanation: "Step 1: Extract stable abstractions for Vehicle, Spot, and PricingStrategy. Step 2: Implement EVSpot alongside CompactSpot and LargeSpot. Step 3: Inject the pricing strategy into the lot service. Step 4: Existing parking flows remain unchanged while EV charging is added through new implementations."
    },
    "mod-lld-oop-foundations": {
      title: "Separating payment responsibilities",
      input: "PaymentService must validate, charge, and record a card payment",
      output: "Validator, Gateway, and Repository collaborators",
      explanation: "Step 1: Give validation, charging, and persistence separate interfaces. Step 2: Inject those interfaces into PaymentService. Step 3: A fake gateway can now be used in tests. Step 4: Each class has one reason to change."
    },
    "mod-lld-core-patterns": {
      title: "Selecting a payment strategy",
      input: "checkout requests method = \"paypal\", amount = $40",
      output: "PayPalStrategy.process(40) is invoked",
      explanation: "Step 1: The factory selects PayPalStrategy from the method name. Step 2: Checkout receives the strategy through its interface. Step 3: It calls process(40) without branching on provider details. Step 4: Adding Apple Pay requires a new strategy, not checkout changes."
    },
    "mod-lld-design-exercises": {
      title: "Reserving a movie seat safely",
      input: "Seat A7 is requested by users Alice and Bob at the same time",
      output: "Alice gets A7; Bob receives SOLD_OUT",
      explanation: "Step 1: Atomically lock A7 for Alice. Step 2: Bob's transaction sees the lock and cannot reserve it. Step 3: Alice completes payment and the seat becomes CONFIRMED. Step 4: Return SOLD_OUT to Bob rather than creating a duplicate booking."
    },
    "mod-hld-estimation-tradeoffs": {
      title: "Capacity estimate for a photo upload service",
      input: "10 million daily uploads; average photo size = 4 MB; 2x replication",
      output: "40 TB/day raw storage, 80 TB/day with replication",
      explanation: "Step 1: 10,000,000 uploads x 4 MB = 40,000,000 MB, or about 40 TB per day. Step 2: Two replicas double the requirement to 80 TB/day. Step 3: Add metadata storage and headroom, then choose object storage and lifecycle tiers. Step 4: The estimate guides capacity and cost decisions before architecture details."
    },
    "mod-hld-mocks": {
      title: "Mock design: resilient notification delivery",
      input: "Send 100,000 password-reset emails/hour; provider may fail for 5 minutes",
      output: "Durable queue, retry workers with backoff, and a dead-letter queue",
      explanation: "Step 1: Write each notification to a durable queue before acknowledging the request. Step 2: Workers retry transient provider errors with exponential backoff. Step 3: During a five-minute outage, messages remain queued instead of being lost. Step 4: After the retry limit, move failures to a dead-letter queue for inspection."
    }
  };
  return byModule[moduleId] || {
    title: `${moduleTitle}: concrete interview scenario`,
    input: `Scenario from ${moduleTitle}: process 1,000 requests with a 100 ms latency target`,
    output: "A design that meets the stated constraint with measurable trade-offs",
    explanation: `Step 1: Translate the ${moduleTitle.toLowerCase()} requirement into an explicit state or component. Step 2: Process the supplied 1,000-item scenario and record each transition. Step 3: Check the 100 ms constraint and identify the bottleneck. Step 4: Verify the final result and explain what changes when the workload doubles.`
  };
}

function buildFallbackTopic(moduleId: string, moduleTitle: string): Topic {
  const cleanTitle = moduleTitle.replace(/[:()]/g, "").trim();
  const example = fallbackContent(moduleId, cleanTitle);
  const topicId = `${moduleId}-core-topic`;
  return {
    id: topicId,
    moduleId,
    title: example.title,
    intuition: `Use the ${cleanTitle.toLowerCase()} concepts to solve the concrete scenario below. The worked trace shows the state or components to track and the trade-off that determines the result.`,
    lesson: [
      {
        title: "Read the scenario",
        content: `Input: ${example.input}\nExpected result: ${example.output}\nStart by naming the state, data structure, or service boundary that directly represents this scenario.`,
        codeExample: example.input
      },
      {
        title: "Trace and verify",
        content: example.explanation,
        codeExample: `// Result: ${example.output}`
      }
    ],
    examples: [
      {
        ...example
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

function concreteExample(topic: Topic): ExampleContent {
  const fallbackTitle = topic.title || "Topic";
  const title = fallbackTitle.toLowerCase();
  const examples: Array<[string, ExampleContent]> = [
    ["heap", { title: "Priority queue trace", input: "priorities = [3, 1, 5, 2]", output: "5, 3, 2, 1", explanation: "Step 1: Insert each value into a max-heap. Step 2: Remove the root 5, then 3, then 2, then 1. Step 3: The heap invariant keeps the largest remaining value at the root after every removal." }],
    ["linked", { title: "Pointer trace", input: "list = 1 -> 2 -> 3 -> 4, remove the 2nd node from the end", output: "1 -> 2 -> 4", explanation: "Step 1: Advance fast two nodes. Step 2: Move fast and slow together until fast reaches the tail. Step 3: Slow points to 2, so bypass 3. Step 4: The resulting list is 1 -> 2 -> 4." }],
    ["tree", { title: "Tree traversal trace", input: "root = [4,2,6,1,3]", output: "in-order = [1,2,3,4,6]", explanation: "Step 1: Visit the left subtree [2,1,3]. Step 2: Emit 1, then 2, then 3. Step 3: Emit the root 4. Step 4: Visit and emit the right child 6." }],
    ["graph", { title: "BFS traversal trace", input: "edges = [[0,1],[0,2],[1,3]], start = 0", output: "[0,1,2,3]", explanation: "Step 1: Enqueue 0 and mark it visited. Step 2: Visit 0 and enqueue 1 and 2. Step 3: Visit 1 and enqueue 3; 2 adds nothing. Step 4: Visit 3 and finish." }],
    ["dynamic", { title: "Dynamic-programming trace", input: "climb n = 5 with one- or two-step moves", output: "8 ways", explanation: "Step 1: dp[0]=1 and dp[1]=1. Step 2: Compute dp[2]=2, dp[3]=3, dp[4]=5. Step 3: dp[5]=dp[4]+dp[3]=8 because the last move is either one or two steps." }],
    ["parking", { title: "Parking allocation trace", input: "A compact car arrives at level 1; spots 1 and 2 are occupied, spot 3 is free", output: "Ticket(level=1, spot=3)", explanation: "Step 1: The lot asks each level for a compatible free spot. Step 2: Level 1 skips occupied spots 1 and 2 and selects spot 3. Step 3: Mark spot 3 occupied and issue the ticket." }],
    ["cache", { title: "LRU cache trace", input: "capacity = 2; put(A,1), put(B,2), get(A), put(C,3)", output: "B is evicted; cache order is A, C", explanation: "Step 1: Store A then B, with B most recently used. Step 2: get(A) moves A to the most-recent position. Step 3: put(C,3) exceeds capacity, so the least-recent B is evicted." }],
    ["load balanc", { title: "Load-balancer trace", input: "servers S1 and S2 are healthy; requests = 5 using round robin", output: "S1,S2,S1,S2,S1", explanation: "Step 1: Health checks mark both servers eligible. Step 2: Assign requests alternately to S1 and S2. Step 3: The fifth request wraps back to S1, keeping the distribution 3 to 2." }],
    ["shard", { title: "Shard-routing trace", input: "user IDs 10, 11, 12; shard = userId mod 3", output: "10->S1, 11->S2, 12->S0", explanation: "Step 1: Apply the routing function to each ID. Step 2: 10 mod 3 is 1, 11 mod 3 is 2, and 12 mod 3 is 0. Step 3: Route reads and writes to the same shard for locality." }]
  ];
  const match = examples.find(([keyword]) => title.includes(keyword));
  return match ? match[1] : fallbackContent(topic.moduleId, topic.title);
}

function enrichTopic(topic: Topic): Topic {
  const fallbackTitle = topic.title || "Topic";
  const example = concreteExample(topic);
  const keyWord = fallbackTitle.split(/\s+/)[0] || "pattern";
  const defaultLesson = [
    {
      title: "Concrete scenario",
      content: `For ${fallbackTitle}, begin with this concrete scenario. Input: ${example.input}\nExpected result: ${example.output}`,
      codeExample: example.input
    },
    {
      title: "Step-by-step result",
      content: example.explanation,
      codeExample: `// Result: ${example.output}`
    }
  ];

  return {
    ...topic,
    lesson: topic.lesson && topic.lesson.length > 0 ? topic.lesson : defaultLesson,
    examples: topic.examples && topic.examples.length > 0 ? topic.examples : [example],
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
