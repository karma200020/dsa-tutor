// Complete SWE Interview Syllabus with Module Dependencies
import type { PracticeEntry } from "./practice-variation";
import { cnModules } from "./cn-catalog";
import type { NetworkLesson } from "./cn/schema";
export type { PracticeEntry, PracticeVariation } from "./practice-variation";
export type Track = "DSA" | "LLD" | "HLD" | "AI" | "OS" | "CPP" | "CN";
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
  optional?: boolean; // Specialist extension, never a core interview prerequisite
  // Optional module-scoped cheat sheet shown above the topic list. When present
  // it is used verbatim; otherwise the UI falls back to keyword matching on the
  // module title (see buildModuleCheatsheet in components/module-list.tsx).
  cheatsheet?: string[];
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
  optional?: boolean;
  network?: NetworkLesson;
  
  // Lesson structure for teaching
  lesson?: LessonSection[]; // Full teaching content broken into sections
  examples?: Example[]; // Detailed examples with walkthroughs
  
  // Code & Complexity
  tips?: string[];
  tricks?: string[];
  memoryAids?: string[]; // Mnemonics and recall cues
  interviewPatterns?: string[]; // How interviewers ask this
  references?: Reference[];
  practiceProblems?: PracticeEntry[]; // Problem IDs, or structured problem variations
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
  source: "interview-experience" | "blog" | "book" | "note" | "leetcode" | "paper" | "video";
  attribution: string;
  insight: string;
}

export const syllabus: Module[] = [
  ...cnModules,
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
    estimatedHours: 10,
    dependencies: ["mod-foundations"],
    topicCount: 24
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
    topicCount: 17
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
    topicCount: 12
  },

  {
    id: "mod-binary-search-intervals",
    title: "Binary Search, Sorting, Intervals",
    description:
      "Master boundary conditions, search-on-answer, and merge/overlap reasoning.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 12,
    dependencies: ["mod-arrays-strings"],
    topicCount: 9
  },

  {
    id: "mod-linked-list",
    title: "Linked Lists & Fast/Slow Pointers",
    description:
      "Handle cycle detection, in-place reversals, and merge operations with pointer safety.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 8,
    dependencies: ["mod-two-pointers-sliding"],
    topicCount: 10
  },

  {
    id: "mod-trees-bst",
    title: "Trees & Binary Search Trees",
    description:
      "Explore DFS/BFS traversals, recursion templates, and subtree reasoning patterns.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 12,
    dependencies: ["mod-binary-search-intervals"],
    topicCount: 10
  },

  {
    id: "mod-heaps",
    title: "Heaps & Priority Queues",
    description: "Apply top-k problems, streaming median patterns, and scheduling with heaps.",
    track: "DSA",
    level: "Intermediate",
    estimatedHours: 6,
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
    estimatedHours: 14,
    dependencies: ["mod-trees-bst", "mod-heaps"],
    topicCount: 9
  },

  {
    id: "mod-dynamic-programming",
    title: "Dynamic Programming",
    description:
      "Learn state definition, base cases, transitions, and 1D/2D/subsequence patterns with optimization.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 18,
    dependencies: ["mod-graphs"],
    topicCount: 9
  },

  {
    id: "mod-greedy-backtracking",
    title: "Greedy & Backtracking",
    description:
      "Prove greedy correctness, avoid backtracking explosion via pruning, and recognize when to use each.",
    track: "DSA",
    level: "Advanced",
    estimatedHours: 10,
    dependencies: ["mod-dynamic-programming"],
    topicCount: 6
  },

  {
    id: "mod-range-queries",
    title: "Range Queries & Advanced Data Structures",
    description: "Dynamic sums, composable range updates, static RMQ and ordered coordinate compression.",
    track: "DSA", level: "Advanced", estimatedHours: 9,
    dependencies: ["mod-binary-search-intervals", "mod-bits-math"], topicCount: 3,
    cheatsheet: [
      "Immutable sum: prefix subtraction. Point delta: Fenwick. Associative replacement: segment tree.",
      "All public range APIs use [l,r); Fenwick's internal indices start at one.",
      "Lazy assignment erases older tags; later addition composes after assignment.",
      "Sparse tables require idempotence for overlapping O(1) queries; compression preserves order, not distance."
    ]
  },
  {
    id: "mod-tries-strings",
    title: "Tries & String Algorithms",
    description: "Prefix dictionaries, deterministic linear pattern matching, and verified polynomial hashes.",
    track: "DSA", level: "Advanced", estimatedHours: 7,
    dependencies: ["mod-arrays-strings", "mod-bits-math"], topicCount: 2,
    cheatsheet: [
      "Trie terminal flags distinguish words from prefixes; use pointer/index identity for nodes.",
      "KMP keeps the longest viable border; Z maintains a rightmost prefix-match window.",
      "Hashes propose equality, never prove it without verification; charge verification costs."
    ]
  },
  {
    id: "mod-advanced-graphs",
    title: "Advanced Graphs",
    description: "Spanning forests, weight-aware shortest paths, SCCs, lowlinks and Eulerian edge trails.",
    track: "DSA", level: "Advanced", estimatedHours: 12,
    dependencies: ["mod-graphs", "mod-heaps"], topicCount: 4,
    cheatsheet: [
      "MST minimizes total selected edge cost, not distances from a source.",
      "0/1 weights: deque; nonnegative: Dijkstra; negative: Bellman-Ford; small all-pairs: Floyd.",
      "Undirected bridge: low[child] > tin[parent]; articulation uses >= and a special DFS-root rule.",
      "Euler trails use every edge once; verify degree balance and E+1 output vertices."
    ]
  },
  {
    id: "mod-advanced-trees",
    title: "Advanced Trees",
    description: "Repeated ancestors, path distances, subtree take/skip DP, Morris traversal and AVL insertion.",
    track: "DSA", level: "Advanced", estimatedHours: 10,
    dependencies: ["mod-trees-bst", "mod-dynamic-programming", "mod-bits-math"], topicCount: 2,
    cheatsheet: [
      "Binary lifting stores 2^k ancestors; equalize depths before lifting both vertices.",
      "Tree DP returns the state a parent needs, not just the subtree's single best answer.",
      "Morris threads must be removed; do not early-return or allow concurrent tree readers.",
      "AVL rotations preserve inorder order; recompute lower-node height before upper-node height."
    ]
  },
  {
    id: "mod-advanced-dp",
    title: "Advanced DP",
    description: "Independent interval splits, DAG evaluation order, subset-state DP and exponential half-enumeration.",
    track: "DSA", level: "Advanced", estimatedHours: 9,
    dependencies: ["mod-dynamic-programming", "mod-bits-math"], topicCount: 2,
    cheatsheet: [
      "Interval DP: choose a split making two independent subproblems; evaluate shorter intervals first.",
      "DAG DP follows topological order, including for negative edge weights.",
      "Mask alone may not encode the endpoint; include every fact that changes the future.",
      "Meet-in-the-middle trades O(2^n) for roughly O(2^(n/2)) memory/time, not polynomial complexity."
    ]
  },
  {
    id: "mod-bits-math",
    title: "Bit Manipulation & Number Theory",
    description: "XOR cancellation, unsigned finite-set masks, Euclid, prime sieving and safe modular powers.",
    track: "DSA", level: "Intermediate", estimatedHours: 5,
    dependencies: ["mod-arrays-strings"], topicCount: 1,
    cheatsheet: [
      "XOR cancels pairs; mask & (mask-1) clears the lowest set bit.",
      "Use unsigned shifts below the type width; ctz(0) is undefined.",
      "Euclid preserves common divisors under remainder; modular division requires an inverse.",
      "Start prime marking at p*p and budget numeric overflow explicitly."
    ]
  },
  {
    id: "mod-dsa-specialist",
    title: "Optional Specialist Extensions",
    description: "Bounded, authored extensions: suffix array/LCP, digit DP, HLD, Dinic flow, extended GCD/CRT/totient. Not ordinary interview prerequisites.",
    track: "DSA", level: "Advanced", estimatedHours: 16, optional: true,
    dependencies: ["mod-range-queries", "mod-tries-strings", "mod-advanced-graphs", "mod-advanced-trees", "mod-advanced-dp"],
    topicCount: 5,
    cheatsheet: [
      "Suffix doubling with comparison sort costs O(n log squared n); Kasai LCP is linear.",
      "Digit DP needs tight and started semantics; leading padding is not a real digit.",
      "HLD turns a path into O(log n) chains; direction matters for noncommutative aggregates.",
      "Residual reverse edges enable rerouting; a saturated residual cut certifies maximum flow.",
      "This math extension is bounded to <=10^9 moduli and coprime two-modulus CRT, not exhaustive number theory."
    ]
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
    topicCount: 7
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
    topicCount: 7
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
    topicCount: 11
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
    topicCount: 11
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
    topicCount: 2
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
    topicCount: 11
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
  },

  // AI-first software engineering track
  {
    id: "mod-ai-foundations",
    title: "AI: LLM Foundations",
    description:
      "Build a working mental model of transformers, tokenization, context windows, sampling, embeddings, hallucination, model selection, and prompt engineering.",
    track: "AI",
    level: "Beginner",
    estimatedHours: 7,
    dependencies: [],
    topicCount: 8
  },

  {
    id: "mod-ai-ml-bridge",
    title: "AI: ML Fundamentals for System Design",
    description:
      "Bridge classic system design and ML: vector similarity, precision/recall/F1, nDCG ranking metrics, A/B testing, feature stores, training-serving skew, two-tower retrieval.",
    track: "AI",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: ["mod-ai-foundations"],
    topicCount: 7
  },

  {
    id: "mod-ai-rag",
    title: "AI: Retrieval-Augmented Generation",
    description:
      "The most-asked AI design area: RAG vs fine-tuning, pipeline architecture, chunking, embedding choice, vector DBs and ANN indexes, hybrid search, re-ranking, query rewriting, retrieval evaluation, failure modes.",
    track: "AI",
    level: "Intermediate",
    estimatedHours: 10,
    dependencies: ["mod-ai-ml-bridge"],
    topicCount: 10
  },

  {
    id: "mod-ai-agents-architecture",
    title: "AI: Agents, Tool Use & App Architecture",
    description:
      "Agent spectrum, tool calling, ReAct and planning loops, memory, sandboxing, failure modes, human-in-the-loop, streaming, caching, model routing, rate limits and cost control.",
    track: "AI",
    level: "Intermediate",
    estimatedHours: 9,
    dependencies: ["mod-ai-rag"],
    topicCount: 10
  },

  {
    id: "mod-ai-evaluation",
    title: "AI: Evaluation & Testing",
    description:
      "Testing nondeterministic systems: the eval pyramid, golden datasets, LLM-as-judge, prompt regression testing, tracing and observability, online eval, drift detection.",
    track: "AI",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-ai-agents-architecture"],
    topicCount: 7
  },

  {
    id: "mod-ai-adaptation-safety",
    title: "AI: Fine-tuning, Safety & Governance",
    description:
      "RAG vs fine-tuning decisions, SFT, LoRA/QLoRA, preference tuning, dataset construction, distillation, quantization; plus OWASP LLM risks, prompt injection, PII handling, and guardrails.",
    track: "AI",
    level: "Intermediate",
    estimatedHours: 8,
    dependencies: ["mod-ai-evaluation"],
    topicCount: 9
  },

  {
    id: "mod-ai-llmops",
    title: "AI: LLMOps & Inference Serving",
    description:
      "Serving stacks, GPU basics, KV cache, continuous batching, PagedAttention, speculative decoding, deployment patterns, cost telemetry, and production incident patterns.",
    track: "AI",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-ai-adaptation-safety"],
    topicCount: 6
  },

  {
    id: "mod-ai-estimation-tradeoffs",
    title: "AI: Estimation & Tradeoffs",
    description:
      "Back-of-envelope math for AI systems: token throughput and latency, GPU/KV-cache memory sizing, cost per query, batching curves, context-window cost scaling, vector DB sizing.",
    track: "AI",
    level: "Intermediate",
    estimatedHours: 5,
    dependencies: ["mod-ai-llmops"],
    topicCount: 6
  },

  {
    id: "mod-ai-design-exercises",
    title: "AI: Design Exercises",
    description:
      "End-to-end designs: RAG document Q&A, LLM inference platform, semantic search, AI coding assistant, content moderation, two-tower recommender, conversational agent, LLM observability.",
    track: "AI",
    level: "Advanced",
    estimatedHours: 10,
    dependencies: ["mod-ai-estimation-tradeoffs"],
    topicCount: 8
  },

  {
    id: "mod-ai-mocks",
    title: "AI: Mock Rounds",
    description:
      "Annotated 45-60 minute AI design mocks with interviewer rubric, strong-vs-mediocre signals, red flags, and curveball follow-up drills.",
    track: "AI",
    level: "Advanced",
    estimatedHours: 5,
    dependencies: ["mod-ai-design-exercises"],
    topicCount: 4
  },

  // Operating Systems track: the classic OS core that shows up in FAANG phone
  // screens, systems rounds, and as follow-up depth inside LLD/HLD interviews.
  {
    id: "mod-os-processes-and-threads",
    title: "OS: Processes & Threads",
    description:
      "Process vs thread, the PCB and address space layout, context switching cost, process lifecycle states, and creation via fork/exec/clone.",
    track: "OS",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: [],
    topicCount: 5
  },

  {
    id: "mod-os-cpu-scheduling",
    title: "OS: CPU Scheduling",
    description:
      "FCFS, SJF/SRTF, round robin, priority scheduling, multilevel feedback queues, preemption and starvation, Linux CFS, and real-time scheduling.",
    track: "OS",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: ["mod-os-processes-and-threads"],
    topicCount: 5
  },

  {
    id: "mod-os-synchronization",
    title: "OS: Synchronization",
    description:
      "Race conditions and critical sections, mutexes, semaphores, condition variables, monitors, the classic synchronization problems, and lock-free basics.",
    track: "OS",
    level: "Intermediate",
    estimatedHours: 7,
    dependencies: ["mod-os-cpu-scheduling"],
    topicCount: 5
  },

  {
    id: "mod-os-deadlocks",
    title: "OS: Deadlocks",
    description:
      "The four Coffman conditions, prevention, avoidance with the banker's algorithm, detection and recovery, plus livelock and priority inversion.",
    track: "OS",
    level: "Intermediate",
    estimatedHours: 5,
    dependencies: ["mod-os-synchronization"],
    topicCount: 5
  },

  {
    id: "mod-os-memory-management",
    title: "OS: Memory Management",
    description:
      "Virtual memory and address translation, paging, segmentation, multi-level and inverted page tables, the TLB, and what the MMU actually does.",
    track: "OS",
    level: "Intermediate",
    estimatedHours: 7,
    dependencies: ["mod-os-processes-and-threads"],
    topicCount: 5
  },

  {
    id: "mod-os-virtual-memory-and-paging",
    title: "OS: Virtual Memory & Paging",
    description:
      "Demand paging, page fault handling, replacement algorithms (FIFO/LRU/Clock/Optimal), Belady's anomaly, thrashing, and the working set model.",
    track: "OS",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-os-memory-management"],
    topicCount: 5
  },

  {
    id: "mod-os-file-systems-and-storage",
    title: "OS: File Systems & Storage",
    description:
      "Inodes and directory structure, block allocation strategies, journaling and crash consistency, the page cache and fsync, and disk scheduling.",
    track: "OS",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-os-virtual-memory-and-paging"],
    topicCount: 5
  },

  {
    id: "mod-os-io-and-system-calls",
    title: "OS: I/O & System Calls",
    description:
      "Kernel vs user mode, syscall mechanics and their cost, interrupts and DMA, blocking vs non-blocking I/O, and select/poll/epoll event loops.",
    track: "OS",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-os-file-systems-and-storage"],
    topicCount: 5
  },

  // C++ track: authored in a separate session. The module metadata lives here so
  // both new tracks share one edit to this file and never collide.
  {
    id: "mod-cpp-fundamentals-and-memory-model",
    title: "C++: Fundamentals & Memory Model",
    description:
      "Compilation model, object lifetime and storage duration, the stack/heap/static layout, undefined behaviour, and the C++ object model.",
    track: "CPP",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: [],
    topicCount: 5
  },

  {
    id: "mod-cpp-pointers-and-memory-management",
    title: "C++: Pointers & Memory Management",
    description:
      "Pointers vs references, new/delete and allocation mechanics, dangling pointers, leaks, alignment, and manual resource ownership.",
    track: "CPP",
    level: "Beginner",
    estimatedHours: 6,
    dependencies: ["mod-cpp-fundamentals-and-memory-model"],
    topicCount: 5
  },

  {
    id: "mod-cpp-raii-and-smart-pointers",
    title: "C++: RAII & Smart Pointers",
    description:
      "RAII as the core C++ idiom, unique_ptr/shared_ptr/weak_ptr, the rule of zero/three/five, and exception-safe resource handling.",
    track: "CPP",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-cpp-pointers-and-memory-management"],
    topicCount: 5
  },

  {
    id: "mod-cpp-move-semantics-and-value-categories",
    title: "C++: Move Semantics & Value Categories",
    description:
      "lvalues/rvalues/xvalues, move constructors and assignment, perfect forwarding, reference collapsing, and copy elision.",
    track: "CPP",
    level: "Intermediate",
    estimatedHours: 6,
    dependencies: ["mod-cpp-raii-and-smart-pointers"],
    topicCount: 5
  },

  {
    id: "mod-cpp-templates-and-generic-programming",
    title: "C++: Templates & Generic Programming",
    description:
      "Template instantiation, specialization, SFINAE and concepts, variadic templates, CRTP, and compile-time programming with constexpr.",
    track: "CPP",
    level: "Advanced",
    estimatedHours: 7,
    dependencies: ["mod-cpp-move-semantics-and-value-categories"],
    topicCount: 5
  },

  {
    id: "mod-cpp-stl-containers-and-algorithms",
    title: "C++: STL Containers & Algorithms",
    description:
      "Container internals and complexity, iterator categories and invalidation, the algorithm library, comparators, and allocator basics.",
    track: "CPP",
    level: "Intermediate",
    estimatedHours: 7,
    dependencies: ["mod-cpp-templates-and-generic-programming"],
    topicCount: 5
  },

  {
    id: "mod-cpp-concurrency-and-memory-ordering",
    title: "C++: Concurrency & Memory Ordering",
    description:
      "std::thread and async, mutexes and locks, atomics, the C++ memory model, acquire/release ordering, and data-race-free reasoning.",
    track: "CPP",
    level: "Advanced",
    estimatedHours: 7,
    dependencies: ["mod-cpp-stl-containers-and-algorithms"],
    topicCount: 5
  },

  {
    id: "mod-cpp-modern-cpp-and-interview-patterns",
    title: "C++: Modern C++ & Interview Patterns",
    description:
      "C++11 through C++20 features that interviewers probe, idiomatic modern style, common trick questions, and code-review-style patterns.",
    track: "CPP",
    level: "Advanced",
    estimatedHours: 6,
    dependencies: ["mod-cpp-concurrency-and-memory-ordering"],
    topicCount: 5
  }
];

export const durationByTrack: Record<Track, number> = syllabus.reduce(
  (acc, mod) => {
    acc[mod.track] += mod.estimatedHours;
    return acc;
  },
  { DSA: 0, LLD: 0, HLD: 0, AI: 0, OS: 0, CPP: 0, CN: 0 }
);
