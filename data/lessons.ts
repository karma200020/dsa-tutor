export type Track = "DSA" | "LLD" | "HLD" | "AI" | "OS" | "CPP";

export type Lesson = {
  id: string;
  title: string;
  track: Track;
  level: "Easy" | "Medium" | "Hard";
  intuition: string;
  tips: string[];
  tricks: string[];
  memoryAids: string[];
  interviewPatterns: string[];
  references: string[];
};

export const lessons: Lesson[] = [
  {
    id: "dsa-sliding-window",
    title: "Sliding Window Fundamentals",
    track: "DSA",
    level: "Easy",
    intuition:
      "Use a moving range to avoid recalculating work for every subarray; grow when valid, shrink when invalid.",
    tips: [
      "State your window invariant before coding.",
      "Track counts in a map for variable windows."
    ],
    tricks: [
      "When stuck, write while (invalid) shrink++ before expand.",
      "Use left/right pointers and update answer after each valid state."
    ],
    memoryAids: [
      "Trigger cue: contiguous segment + optimize from O(n^2) to O(n).",
      "Mnemonic: Expand -> Validate -> Shrink -> Record."
    ],
    interviewPatterns: [
      "Longest substring with constraints",
      "Minimum window covering target"
    ],
    references: [
      "Interview experience trend: frequent medium question in first coding round",
      "Popular prep blog note: focus on invariant articulation"
    ]
  },
  {
    id: "lld-rate-limiter",
    title: "LLD: Rate Limiter",
    track: "LLD",
    level: "Medium",
    intuition:
      "Model policy, storage, and decision flow first; class design follows requirement boundaries.",
    tips: [
      "Clarify burst allowance and per-user vs global limits.",
      "Separate algorithm from persistence adapter."
    ],
    tricks: [
      "Design interface: allow(requestContext): Decision.",
      "Keep time provider injectable for testing."
    ],
    memoryAids: [
      "Checklist: requirement, policy, state, API, extension points.",
      "Mnemonic: R-P-S-A-E."
    ],
    interviewPatterns: [
      "Extensible policy strategy pattern",
      "In-memory vs distributed limiter tradeoff"
    ],
    references: [
      "Engineering blog pattern: token bucket + sliding window hybrid",
      "Interview notes: interviewer pushes for testability and extensibility"
    ]
  },
  {
    id: "hld-url-shortener",
    title: "HLD: URL Shortener",
    track: "HLD",
    level: "Medium",
    intuition:
      "Start with traffic estimates and read/write ratio, then pick storage, cache, and ID strategy around scale constraints.",
    tips: [
      "Ask for latency and availability targets early.",
      "Call out hot-key and abuse handling."
    ],
    tricks: [
      "Use base62 for compact IDs and discuss collision strategy.",
      "Add cache for read-heavy redirect path first."
    ],
    memoryAids: [
      "Framework: Requirements -> Estimation -> API -> Data -> Scale -> Reliability.",
      "Mnemonic: R-E-A-D-S-R."
    ],
    interviewPatterns: [
      "Read-heavy optimization",
      "Partitioning and cache invalidation tradeoffs"
    ],
    references: [
      "System design handbook pattern: API-first decomposition",
      "Interview debrief trend: deep dive on data model and bottlenecks"
    ]
  }
];
