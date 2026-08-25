// Complete SWE Interview Syllabus with Module Dependencies
export type Track = "DSA" | "LLD" | "HLD";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type MasteryStatus = "not-started" | "learning" | "practiced" | "interview-ready";

export interface Module {
  id: string;
  title: string;
  description: string;
  track: Track;
  level: Level;
  estimatedHours: number;
  dependencies: string[]; // Module IDs that must be completed first
  topicCount: number;
}

export interface LessonSection {
  title: string;
  content: string; // Can include markdown-like formatting
  codeExample?: string; // C++ code snippet
  diagram?: string; // SVG diagram or description
}

export interface Example {
  title: string;
  input: string;
  output: string;
  explanation: string; // Step-by-step walkthrough
  diagram?: string; // Visual representation of the example
}

export interface FaqItem {
  question: string;
  answer: string;
  source?: string; // Attribution / citation for the answer
  category?: string; // e.g. "Trade-offs", "Concurrency", "Capacity", "Patterns"
  sourceLinks?: { label: string; url: string }[]; // Optional external references
}

export interface Topic {
  id: string;
  moduleId: string;
  title: string;
  intuition: string;
  
  // Lesson structure for teaching
  lesson?: LessonSection[]; // Full teaching content broken into sections
  examples?: Example[]; // Detailed examples with walkthroughs
  
  // Code & Complexity
  tips?: string[];
  tricks?: string[];
  memoryAids?: string[]; // Mnemonics and recall cues
  interviewPatterns?: string[]; // How interviewers ask this
  references?: Reference[];
  practiceProblems?: string[]; // Problem IDs
  faq?: FaqItem[]; // Frequently asked interview questions with concise answers
  
  // Legacy fields (still supported)
  methodology?: string; // Step-by-step approach/algorithm explanation
  cppCode?: string; // C++ implementation
  workedExample?: string; // Step-by-step traced example
  complexity?: {
    time: string;
    space: string;
  };
}

export interface Reference {
  source: "interview-experience" | "blog" | "book" | "note" | "leetcode";
  attribution: string;
  insight: string;
}

export const syllabus: Module[] = [
  // Foundation
  {
    id: "mod-foundations",
    title: "Interview Foundations",
    description:
      "Understand FAANG interview expectations, coding round workflow, and complexity analysis fluency.",
    track: "DSA",
    level: "Beginner",
    estimatedHours: 2,
    dependencies: [],
    topicCount: 3
  },

  // Core DSA Patterns
  {
    id: "mod-arrays-strings",
    title: "Arrays, Strings, Hashing",
    description:
      "Master frequency maps, prefix sums, two-sum family, and grouping/anagram patterns.",
    track: "DSA",
    level: "Beginner",
    estimatedHours: 8,
    dependencies: ["mod-foundations"],
    topicCount: 12
  },

  {
    id: "mod-two-pointers-sliding",
    title: "Two Pointers & Sliding Window",
    description:
      "Learn fixed/variable windows, expand/contract logic, and invariant-based optimization.",
    track: "DSA",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: ["mod-arrays-strings"],
    topicCount: 11
  },

  {
    id: "mod-stack-monotonic",
    title: "Stack, Queue, Monotonic Patterns",
    description:
      "Recognize next greater/smaller, valid bracket, and monotonic deque use cases.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 5,
    dependencies: ["mod-two-pointers-sliding"],
    topicCount: 9
  },

  {
    id: "mod-binary-search-intervals",
    title: "Binary Search, Sorting, Intervals",
    description:
      "Master boundary conditions, search-on-answer, and merge/overlap reasoning.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 7,
    dependencies: ["mod-arrays-strings"],
    topicCount: 4
  },

  {
    id: "mod-linked-list",
    title: "Linked Lists & Fast/Slow Pointers",
    description:
      "Handle cycle detection, in-place reversals, and merge operations with pointer safety.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 5,
    dependencies: ["mod-two-pointers-sliding"],
    topicCount: 5
  },

  {
    id: "mod-trees-bst",
    title: "Trees & Binary Search Trees",
    description:
      "Explore DFS/BFS traversals, recursion templates, and subtree reasoning patterns.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 8,
    dependencies: ["mod-binary-search-intervals"],
    topicCount: 2
  },

  {
    id: "mod-heaps",
    title: "Heaps & Priority Queues",
    description: "Apply top-k problems, streaming median patterns, and scheduling with heaps.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 4,
    dependencies: ["mod-trees-bst"],
    topicCount: 4
  },

  {
    id: "mod-graphs",
    title: "Graphs (BFS/DFS, Topological, Union-Find)",
    description:
      "Master connectivity, shortest paths, cycles, and component detection with correct visited state.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 10,
    dependencies: ["mod-trees-bst"],
    topicCount: 2
  },

  {
    id: "mod-dynamic-programming",
    title: "Dynamic Programming",
    description:
      "Learn state definition, base cases, transitions, and 1D/2D/subsequence patterns with optimization.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 12,
    dependencies: ["mod-graphs"],
    topicCount: 10
  },

  {
    id: "mod-greedy-backtracking",
    title: "Greedy & Backtracking",
    description:
      "Prove greedy correctness, avoid backtracking explosion via pruning, and recognize when to use each.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-dynamic-programming"],
    topicCount: 7
  },

  // Low-Level Design
  {
    id: "mod-lld-oop-foundations",
    title: "LLD: OOP Foundations in Interviews",
    description:
      "Learn SOLID principles, abstraction, composition, and requirement-to-design translation.",
    track: "LLD",
    level: "Beginner",
    estimatedHours: 4,
    dependencies: [],
    topicCount: 6
  },

  {
    id: "mod-lld-core-patterns",
    title: "LLD: Core Design Patterns",
    description:
      "Master Singleton, Factory, Strategy, Observer, and Decorator in interview contexts.",
    track: "LLD",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-lld-oop-foundations"],
    topicCount: 6
  },

  {
    id: "mod-lld-design-exercises",
    title: "LLD: Design Exercises",
    description:
      "Complete progressive designs: parking lot, elevator, cache, rate limiter, library, movie booking.",
    track: "LLD",
    level: "Intermediate",
    estimatedHours: 12,
    dependencies: ["mod-lld-core-patterns"],
    topicCount: 10
  },

  // High-Level Design
  {
    id: "mod-hld-foundations",
    title: "HLD: System Design Foundations",
    description:
      "Understand scale, load balancing, caching, databases, queues, CDN, consistency basics, CAP theorem, consistent hashing, fault tolerance, networking, and API design.",
    track: "HLD",
    level: "Beginner",
    estimatedHours: 8,
    dependencies: [],
    topicCount: 12
  },

  {
    id: "mod-hld-estimation-tradeoffs",
    title: "HLD: Estimation & Tradeoffs",
    description:
      "Learn capacity estimation, read/write ratio analysis, bottleneck identification workflows, and distributed consensus/leader election.",
    track: "HLD",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-hld-foundations"],
    topicCount: 4
  },

  {
    id: "mod-hld-design-exercises",
    title: "HLD: Design Exercises",
    description:
      "Master designs: URL shortener, news feed, chat, ride sharing, notification system, video processing.",
    track: "HLD",
    level: "Intermediate",
    estimatedHours: 15,
    dependencies: ["mod-hld-estimation-tradeoffs"],
    topicCount: 13
  },

  // Mocks & Integration
  {
    id: "mod-dsa-mocks",
    title: "DSA Mock Rounds",
    description:
      "Simulate realistic 45-minute coding rounds with complexity accuracy scoring and communication grading.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 8,
    dependencies: ["mod-greedy-backtracking"],
    topicCount: 3
  },

  {
    id: "mod-lld-mocks",
    title: "LLD Mock Rounds",
    description:
      "Design systems under interview pressure with whiteboard communication and tradeoff articulation.",
    track: "LLD",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-lld-design-exercises"],
    topicCount: 3
  },

  {
    id: "mod-hld-mocks",
    title: "HLD Mock Rounds",
    description:
      "Full system design interviews with requirement clarification, architecture, and deep-dive scenarios.",
    track: "HLD",
    level: "Advanced",
    estimatedHours: 8,
    dependencies: ["mod-hld-design-exercises"],
    topicCount: 3
  }
];

export const durationByTrack: Record<Track, number> = syllabus.reduce(
  (acc, mod) => {
    acc[mod.track] += mod.estimatedHours;
    return acc;
  },
  { DSA: 0, LLD: 0, HLD: 0 } as Record<Track, number>
);
