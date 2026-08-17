// Visual Learning Components - Diagrams, Animations, and Illustrations
// Makes complex DSA and System Design concepts easy to understand and remember

export interface VisualComponent {
  id: string;
  type: "diagram" | "animation" | "illustration" | "flowchart" | "comparison" | "timeline";
  title: string;
  description: string;
  // SVG/Canvas content or reference to external illustration
  svgContent?: string;
  animationScript?: string;
  keyPoints: string[];
  interactiveElements?: InteractiveElement[];
}

export interface InteractiveElement {
  id: string;
  type: "clickable" | "draggable" | "slider" | "toggle";
  label: string;
  explanation: string;
  highlightArea?: { x: number; y: number; width: number; height: number };
}

// ============================================
// ARRAYS & STRINGS VISUAL COMPONENTS
// ============================================

export const twoSumVisuals: VisualComponent[] = [
  {
    id: "two-sum-hash-map-flow",
    type: "flowchart",
    title: "Two Sum - Hash Map Approach",
    description: "Step-by-step visualization of how hash map finds complement",
    keyPoints: [
      "For each number, check if complement exists in map",
      "Store number before moving to next",
      "O(1) lookup makes it efficient",
      "Perfect for finding pairs"
    ],
    animationScript: `
      // Animation: Show array elements one by one
      // For each element: Check map â Show complement lookup â Add to map
      const steps = [
        { element: 2, complement: 7, found: false, map: {} },
        { element: 7, complement: 2, found: true, map: { 2: 0 }, solution: [0, 1] },
      ];
    `
  },
  {
    id: "two-sum-two-pointers-flow",
    type: "diagram",
    title: "Two Sum II - Two Pointers on Sorted Array",
    description: "Visual: left and right pointers converging towards target sum",
    keyPoints: [
      "Start: left at start, right at end",
      "Too small â move left right",
      "Too large â move right left",
      "O(n) time, O(1) space (better than hash map for sorted input)"
    ],
    interactiveElements: [
      {
        id: "pointer-movement",
        type: "draggable",
        label: "Move pointers to find sum",
        explanation: "Drag left/right pointers. Watch sum change.",
        highlightArea: { x: 50, y: 100, width: 400, height: 150 }
      }
    ]
  },
  {
    id: "3sum-visualization",
    type: "animation",
    title: "3Sum - Sort + Two Pointers",
    description: "After sorting, fix one element and use two pointers for rest",
    keyPoints: [
      "Sort array: -4, -1, -1, 0, 1, 2",
      "For each element (fixed), find 2Sum with rest",
      "Skip duplicates to avoid duplicate triplets",
      "O(nÂ²) time (n iterations Ã n for two-pointers)"
    ],
    animationScript: `
      // Show: Sort animation â Fix element -4 â Two pointers on [-1,-1,0,1,2]
      // Highlight valid triplets found
      const triplets = [[-1, -1, 2], [-1, 0, 1]];
    `
  }
];

export const slidingWindowVisuals: VisualComponent[] = [
  {
    id: "sliding-window-template",
    type: "diagram",
    title: "Sliding Window Template - Expand & Shrink",
    description: "Generic sliding window pattern used across many substring problems",
    keyPoints: [
      "Expand right pointer to include new elements",
      "While window invalid, shrink from left",
      "Update answer while shrinking",
      "Left pointer never moves backward (crucial!)"
    ],
    interactiveElements: [
      {
        id: "window-expander",
        type: "slider",
        label: "Drag to expand/shrink window",
        explanation: "See how expanding right and shrinking left changes the window",
        highlightArea: { x: 50, y: 100, width: 500, height: 100 }
      }
    ]
  },
  {
    id: "longest-substring-trace",
    type: "animation",
    title: "Longest Substring Without Repeating - Trace Through",
    description: "Step-by-step trace of algorithm on 'abcabcbb'",
    keyPoints: [
      "Start: left=0, right=0, window='a'",
      "Expand: 'ab', 'abc' â length 3",
      "At 'a' repeat: shrink until first 'a' removed",
      "Continue expanding and shrinking",
      "Answer: 3 (abc, bca, cab, bac)"
    ],
    animationScript: `
      // Show character-by-character movement
      // Highlight when duplicate found
      // Show window shrinking
    `
  }
];

// ============================================
// LINKED LIST & POINTER VISUALS
// ============================================

export const fastSlowPointerVisuals: VisualComponent[] = [
  {
    id: "floyd-cycle-detection",
    type: "animation",
    title: "Floyd's Cycle Detection - Fast & Slow Pointers",
    description: "Two pointers at different speeds will meet if cycle exists",
    keyPoints: [
      "Slow moves 1 step, Fast moves 2 steps",
      "If cycle: they eventually meet (math guaranteed)",
      "If no cycle: fast reaches null first",
      "Visual: Two runners on track, fast laps slow"
    ],
    animationScript: `
      // Animation frames showing:
      // Frame 1: Both start at head
      // Frame 2-10: Slow=1 step, Fast=2 steps each frame
      // Meet at cycle node
      const frames = [
        { slow: 'node1', fast: 'node1' },
        { slow: 'node2', fast: 'node3' },
        { slow: 'node3', fast: 'node5' },
        { slow: 'node4', fast: 'node7' },
        { slow: 'node5', fast: 'node2' }, // cycle!
      ];
    `
  },
  {
    id: "find-cycle-start",
    type: "diagram",
    title: "Find Cycle Start - Two Pointer Reset",
    description: "After detecting cycle, reset one pointer to find start",
    keyPoints: [
      "After meeting point, reset one pointer to head",
      "Move both pointers 1 step at a time",
      "They meet at cycle start (math: same distance to start)",
      "Key insight: cycle detection + finding start position"
    ]
  },
  {
    id: "find-middle-linked-list",
    type: "animation",
    title: "Find Middle of Linked List",
    description: "Slow pointer reaches middle when fast reaches end",
    keyPoints: [
      "Fast reaches end in n/2 iterations",
      "Slow reaches middle in same time",
      "For odd/even length handling shown"
    ]
  }
];

// ============================================
// TREE VISUALS
// ============================================

export const treeVisuals: VisualComponent[] = [
  {
    id: "binary-tree-structure",
    type: "diagram",
    title: "Binary Tree Structure & Properties",
    description: "Visual representation of tree terms and relationships",
    keyPoints: [
      "Height: longest path from node to leaf",
      "Depth: distance from root to node",
      "Balanced: |height_left - height_right| â¤ 1",
      "Complete: all levels full except possibly last"
    ]
  },
  {
    id: "tree-traversal-comparison",
    type: "comparison",
    title: "DFS vs BFS Traversals",
    description: "Visual comparison of different tree traversal orders",
    keyPoints: [
      "DFS: Depth-first (Stack-based or Recursion)",
      "  â Preorder: Root, Left, Right",
      "  â Inorder: Left, Root, Right (gives sorted for BST)",
      "  â Postorder: Left, Right, Root",
      "BFS: Level-by-level (Queue-based)",
      "DFS: O(h) space, BFS: O(w) space (h=height, w=width)"
    ],
    interactiveElements: [
      {
        id: "traversal-selector",
        type: "toggle",
        label: "Switch between DFS/BFS",
        explanation: "Watch the traversal order change as you toggle",
        highlightArea: { x: 50, y: 50, width: 300, height: 400 }
      }
    ]
  },
  {
    id: "lca-lowest-common-ancestor",
    type: "animation",
    title: "Lowest Common Ancestor (LCA) - Visual",
    description: "Finding the lowest common ancestor of two nodes",
    keyPoints: [
      "Find paths from root to both nodes",
      "LCA = last node in both paths",
      "BST optimization: compare node.val with p,q values",
      "Recursive: check left and right subtrees"
    ],
    animationScript: `
      // Animation showing:
      // 1. Highlighting path to first node
      // 2. Highlighting path to second node
      // 3. Common part highlighted
      // 4. LCA node highlighted
    `
  },
  {
    id: "serialize-deserialize-tree",
    type: "flowchart",
    title: "Serialize & Deserialize Binary Tree",
    description: "Converting tree to string and back",
    keyPoints: [
      "Pre-order traversal with null markers",
      "Example: [1,2,3,null,null,4,5]",
      "Deserialization: reconstruct from string",
      "Use queue for efficient reconstruction"
    ]
  }
];

// ============================================
// GRAPH VISUALS
// ============================================

export const graphVisuals: VisualComponent[] = [
  {
    id: "dfs-graph-animation",
    type: "animation",
    title: "DFS Graph Traversal - Step by Step",
    description: "Depth-first search animation on graph",
    keyPoints: [
      "Explore as far as possible along each branch",
      "Use stack (explicitly or recursion)",
      "Visit marking prevents revisiting",
      "O(V + E) time complexity"
    ],
    animationScript: `
      // Show stack state at each step
      // Highlight current node
      // Show visited nodes
      // Show backtracking when dead-end
    `
  },
  {
    id: "bfs-graph-animation",
    type: "animation",
    title: "BFS Graph Traversal - Level Order",
    description: "Breadth-first search animation on graph",
    keyPoints: [
      "Explore neighbors before distant nodes",
      "Use queue",
      "Shortest path in unweighted graphs",
      "O(V + E) time complexity"
    ]
  },
  {
    id: "union-find-visualization",
    type: "animation",
    title: "Union-Find (Disjoint Set) - Visual",
    description: "How union-find detects connected components",
    keyPoints: [
      "Each element points to parent",
      "Find: traverse to root (with path compression)",
      "Union: merge two trees by connecting roots",
      "Path compression + union by rank = nearly O(1) operations"
    ],
    interactiveElements: [
      {
        id: "union-button",
        type: "clickable",
        label: "Click to Union two sets",
        explanation: "Watch trees merge and paths compress",
        highlightArea: { x: 50, y: 200, width: 300, height: 300 }
      }
    ]
  },
  {
    id: "topological-sort-flow",
    type: "flowchart",
    title: "Topological Sort - DAG Ordering",
    description: "Ordering vertices in DAG respecting dependencies",
    keyPoints: [
      "Valid only for DAGs (Directed Acyclic Graphs)",
      "Kahn's algorithm: remove nodes with in-degree 0",
      "DFS approach: reverse post-order traversal",
      "Use case: Course prerequisites, Build dependencies"
    ]
  }
];

// ============================================
// DYNAMIC PROGRAMMING VISUALS
// ============================================

export const dpVisuals: VisualComponent[] = [
  {
    id: "coin-change-dp-table",
    type: "diagram",
    title: "Coin Change - DP Table Visualization",
    description: "Building up DP table to find min coins",
    keyPoints: [
      "Rows = coins, Columns = amounts",
      "Fill bottom-up: dp[amount] = min coins needed",
      "Transition: try each coin, take min result",
      "Base case: dp[0] = 0"
    ],
    interactiveElements: [
      {
        id: "dp-step-through",
        type: "slider",
        label: "Step through DP table construction",
        explanation: "See table fill up step by step",
        highlightArea: { x: 100, y: 100, width: 400, height: 300 }
      }
    ]
  },
  {
    id: "lis-dp-animation",
    type: "animation",
    title: "Longest Increasing Subsequence - DP & Binary Search",
    description: "Two approaches: O(nÂ²) DP and O(n log n) optimized",
    keyPoints: [
      "DP approach: dp[i] = LIS ending at i",
      "Optimized: maintain sorted tail array",
      "Binary search finds insertion position",
      "Visual: both approaches side-by-side"
    ]
  },
  {
    id: "edit-distance-table",
    type: "diagram",
    title: "Edit Distance (Levenshtein) - 2D DP",
    description: "DP table for string transformation",
    keyPoints: [
      "dp[i][j] = edit distance between s1[0..i], s2[0..j]",
      "Transitions: match, replace, insert, delete",
      "Reconstruct path to see actual edits",
      "Use case: Spell check, DNA sequencing"
    ]
  }
];

// ============================================
// SYSTEM DESIGN VISUALS
// ============================================

export const systemDesignVisuals: VisualComponent[] = [
  {
    id: "url-shortener-architecture",
    type: "diagram",
    title: "URL Shortener - System Architecture",
    description: "Full architecture: API, Database, Cache, Redirect Service",
    keyPoints: [
      "Encode service: Create short URL from long URL",
      "Database: Store mapping (short â long)",
      "Cache: Redis for hot URLs",
      "Redirect: Fast lookup and HTTP 301 redirect"
    ],
    interactiveElements: [
      {
        id: "sharding-strategy",
        type: "toggle",
        label: "Show Sharding Strategy",
        explanation: "Database sharding by hash vs range",
        highlightArea: { x: 100, y: 200, width: 400, height: 200 }
      }
    ]
  },
  {
    id: "social-feed-architecture",
    type: "diagram",
    title: "Social Media Feed - Push vs Pull Model",
    description: "Fanout service: pushing updates to followers",
    keyPoints: [
      "Push model: Actively push to followers (for normal users)",
      "Pull model: Followers query (for celebrity users)",
      "Hybrid: Smart fanout decides per case",
      "Cache: Redis for fast feed retrieval"
    ]
  },
  {
    id: "distributed-cache-consistent-hashing",
    type: "animation",
    title: "Consistent Hashing - Cache Node Distribution",
    description: "How consistent hashing minimizes cache misses on node failure",
    keyPoints: [
      "Hash ring: Cache nodes and keys mapped to ring",
      "Key lookup: clockwise until node found",
      "Node failure: only ~1/n keys rehashed",
      "Node addition: similar rehashing benefit"
    ],
    animationScript: `
      // Show ring, nodes, keys
      // Animate: Remove a node
      // Show which keys need rehashing (only nearby ones)
      // Compare to modulo hash (all keys rehash)
    `
  },
  {
    id: "load-balancer-strategies",
    type: "comparison",
    title: "Load Balancing Strategies Comparison",
    description: "Round-robin vs Least Connections vs Hash-based",
    keyPoints: [
      "Round-robin: Simple, equal distribution",
      "Least connections: Good for long-lived connections",
      "Hash-based: Session persistence (client IP hash)",
      "Weighted: Different server capacities"
    ]
  },
  {
    id: "message-queue-flow",
    type: "flowchart",
    title: "Message Queue System - Producer/Consumer",
    description: "Asynchronous processing with message queues",
    keyPoints: [
      "Producer: Write message to queue",
      "Broker: Store and deliver messages",
      "Consumer: Process message async",
      "Acknowledgment: Message processing confirmation"
    ]
  }
];

// ============================================
// COMPARISON VISUALS (Side-by-Side)
// ============================================

export const comparisonVisuals: VisualComponent[] = [
  {
    id: "sql-vs-nosql-comparison",
    type: "comparison",
    title: "SQL vs NoSQL Trade-offs",
    description: "When to use Relational vs Document vs Key-Value databases",
    keyPoints: [
      "SQL: Strong consistency, complex queries, schema",
      "NoSQL Key-Value: Speed, scalability, simplicity",
      "NoSQL Document: Flexibility, nested data, scalability",
      "NoSQL Graph: Relationships, pattern matching"
    ]
  },
  {
    id: "cache-patterns-comparison",
    type: "comparison",
    title: "Caching Patterns Trade-offs",
    description: "Cache-aside vs Write-through vs Write-behind",
    keyPoints: [
      "Cache-aside: Lazy loading, miss penalty, complex",
      "Write-through: Consistent, slower writes",
      "Write-behind: Fast writes, consistency risk"
    ]
  },
  {
    id: "consistency-models-chart",
    type: "comparison",
    title: "Consistency Models on Spectrum",
    description: "From Strong to Weak Consistency",
    keyPoints: [
      "Strong: Every read sees latest (High latency)",
      "Eventual: Reads eventually consistent (Low latency)",
      "Weak: No guarantee (Lowest latency)",
      "Choose based on use case: Banking vs Social Media"
    ]
  }
];

// ============================================
// TIMELINE VISUALS
// ============================================

export const timelineVisuals: VisualComponent[] = [
  {
    id: "interview-prep-timeline",
    type: "timeline",
    title: "16-Week Interview Prep Timeline",
    description: "Structured preparation schedule from fundamentals to mock interviews",
    keyPoints: [
      "Week 1-2: Array & String fundamentals",
      "Week 3-4: Linked Lists & Pointers",
      "Week 5-6: Stacks/Queues & Monotonic patterns",
      "Week 7-8: Trees & Recursion",
      "Week 9-10: Graphs & Union-Find",
      "Week 11-12: Dynamic Programming",
      "Week 13-14: Hard problems & Optimization",
      "Week 15-16: System Design & Mock Interviews"
    ]
  }
];

// ============================================
// EXPORT ALL VISUALS
// ============================================

export const allVisualComponents: VisualComponent[] = [
  ...twoSumVisuals,
  ...slidingWindowVisuals,
  ...fastSlowPointerVisuals,
  ...treeVisuals,
  ...graphVisuals,
  ...dpVisuals,
  ...systemDesignVisuals,
  ...comparisonVisuals,
  ...timelineVisuals
];

export function getVisualsByTopic(topicId: string): VisualComponent[] {
  // Map topicId to relevant visuals
  const visualMap: Record<string, VisualComponent[]> = {
    "topic-two-sum-family": twoSumVisuals,
    "topic-sliding-window-master": slidingWindowVisuals,
    "topic-fast-slow-pointers-master": fastSlowPointerVisuals,
    // ... add more mappings
  };
  return visualMap[topicId] || [];
}

export default allVisualComponents;
