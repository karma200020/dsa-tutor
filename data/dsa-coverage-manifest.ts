// This is an explicit curriculum contract, not a title/keyword coverage guess.
// Evidence is searched only in authored lesson prose and implementations, never
// in tips or practice variations. Related concepts share a substantial lesson.
export type CoverageStatus = "dedicated" | "variation-only" | "absent" | "intentionally-optional";
export interface ConceptMapping {
  concept: string;
  moduleId: string;
  topicId: string;
  scope: "core" | "specialist";
  priority: "P0" | "P1" | "P2";
  status: CoverageStatus;
  initialStatus: CoverageStatus;
  prose: string;
  implementation: string;
}

function concepts(
  moduleId: string, topicId: string, scope: "core" | "specialist",
  entries: [concept: string, initialStatus: CoverageStatus, prose: string, implementation: string][]
): ConceptMapping[] {
  return entries.map(([concept, initialStatus, prose, implementation]) => ({
    concept, moduleId, topicId, scope, priority: scope === "specialist" ? "P2" : moduleId === "mod-graphs" || moduleId === "mod-range-queries" ? "P0" : "P1",
    status: "dedicated", initialStatus, prose, implementation
  }));
}

export const dsaConceptManifest: ConceptMapping[] = [
  ...concepts("mod-range-queries", "topic-range-fenwick", "core", [
    ["fenwick", "variation-only", "disjoint blocks", "struct Fenwick"],
    ["fenwick-update-query-variants", "variation-only", "two Fenwicks", "long long sum(int l,int r)"]
  ]),
  ...concepts("mod-range-queries", "topic-range-segment-lazy", "core", [
    ["segment-tree", "variation-only", "associative aggregates", "struct SegmentTree"],
    ["lazy-propagation", "absent", "new assignment discards every older tag", "void push(int v,int l,int r)"]
  ]),
  ...concepts("mod-range-queries", "topic-range-static-compression", "core", [
    ["coordinate-compression", "absent", "strictly order-preserving", "int rankOf"],
    ["sparse-table-rmq", "variation-only", "overlap is harmless", "struct SparseMin"],
    ["range-structure-decision-guide", "variation-only", "Decision guide", "long long query"]
  ]),
  ...concepts("mod-tries-strings", "topic-string-trie", "core", [
    ["trie", "variation-only", "word end is independent", "struct Trie"]
  ]),
  ...concepts("mod-graphs", "topic-graph-dsu", "core", [
    ["dsu-compression-size-rank", "variation-only", "rank can replace size", "p[x]=find(p[x])"]
  ]),
  ...concepts("mod-graphs", "topic-graph-dijkstra", "core", [
    ["dijkstra", "variation-only", "stale entries", "vector<long long> dijkstra"]
  ]),
  ...concepts("mod-graphs", "topic-graph-bfs-models", "core", [
    ["bipartite", "absent", "odd cycle", "bool bipartite"],
    ["multi-source-bfs", "variation-only", "all sources start at distance zero", "vector<int> multiSource"],
    ["graph-cloning", "absent", "allocate and memoize", "Node* cloneGraph"]
  ]),
  ...concepts("mod-trees-bst", "topic-tree-postorder-contracts", "core", [
    ["tree-diameter", "variation-only", "leftHeight+rightHeight", "int diameter"],
    ["tree-path-sums", "variation-only", "Root-to-leaf", "bool rootPathSum"],
    ["height-balance", "variation-only", "balance propagates", "bool balanced"]
  ]),
  ...concepts("mod-trees-bst", "topic-tree-codec-reconstruction", "core", [
    ["tree-serialization", "variation-only", "Null markers preserve shape", "string serialize"],
    ["tree-deserialization", "absent", "rejects malformed", "unique_ptr<Tree> deserialize"],
    ["tree-reconstruction", "absent", "inorder position uniquely splits", "unique_ptr<Tree> reconstruct"]
  ]),
  ...concepts("mod-linked-list", "topic-list-identity-copy", "core", [
    ["list-intersection", "variation-only", "pointer identity", "Node* intersection"],
    ["random-pointer-copy", "absent", "pass one allocates", "Node* copyRandom"]
  ]),
  ...concepts("mod-heaps", "topic-heap-merge-schedule", "core", [
    ["merge-k-sorted-lists", "variation-only", "one candidate per sorted source", "Node* mergeK"],
    ["task-scheduler", "variation-only", "earliest release", "long long schedule"]
  ]),
  ...concepts("mod-binary-search-intervals", "topic-sort-partition-stability", "core", [
    ["merge-sort", "variation-only", "left on ties", "void mergeSort"],
    ["quicksort", "variation-only", "Three-way partition maintains", "void quickSort"],
    ["quickselect", "variation-only", "only the partition containing", "int quickselect"],
    ["counting-sort", "variation-only", "Counting reconstructs", "vector<int> countingSort"],
    ["bucket-sort", "variation-only", "ordered bucket ranges", "vector<int> bucketSort"],
    ["stability-comparators", "variation-only", "strict weak ordering", "a[i]<=a[j]"]
  ]),
  ...concepts("mod-dynamic-programming", "topic-dp-knapsack-subset", "core", [
    ["zero-one-knapsack", "variation-only", "Descending capacity", "long long knapsack"],
    ["subset-sum", "absent", "Boolean reachability", "bool subsetSum"],
    ["equal-partition", "absent", "total is even", "bool equalPartition"]
  ]),
  ...concepts("mod-dynamic-programming", "topic-dp-grid-lcs-palindrome", "core", [
    ["grid-dp", "variation-only", "previous row's count", "long long gridPaths"],
    ["lcs", "variation-only", "matching final characters", "int lcs"],
    ["palindrome-dp", "variation-only", "inner interval", "string palindrome"]
  ]),
  ...concepts("mod-dynamic-programming", "topic-dp-stock-state-machine", "core", [
    ["stock-state-machine-dp", "variation-only", "Buy only from previous rest", "long long cooldownProfit"]
  ]),
  ...concepts("mod-greedy-backtracking", "topic-backtracking-constraint-search", "core", [
    ["combination-sum", "variation-only", "Combination paths are nondecreasing", "combinationSum"],
    ["generate-parentheses", "absent", "0<=close<=open<=n", "vector<string> parentheses"],
    ["word-search", "absent", "cleared even on success", "bool wordSearch"],
    ["n-queens", "absent", "diagonals", "long long queens"],
    ["sound-pruning", "variation-only", "cannot lead to any valid completion", "a[i]<=remain"]
  ]),
  ...concepts("mod-advanced-graphs", "topic-graph-mst", "core", [
    ["kruskal-mst", "absent", "Kruskal accepts only edges joining", "kruskal"],
    ["prim-mst", "absent", "Prim accepts only the first minimum", "prim"]
  ]),
  ...concepts("mod-advanced-graphs", "topic-graph-shortest-path-variants", "core", [
    ["bellman-ford", "absent", "improvement on pass n", "bellman"],
    ["floyd-warshall", "absent", "intermediate vertices", "floyd"],
    ["zero-one-bfs", "variation-only", "deque front", "zeroOne"]
  ]),
  ...concepts("mod-advanced-graphs", "topic-graph-connectivity-lowlink", "core", [
    ["strongly-connected-components", "absent", "Kosaraju", "vector<int> scc"],
    ["bridges", "variation-only", "low[child]>tin[u]", "bridges.push_back(e)"],
    ["articulation-points", "variation-only", "low[child]>=tin[u]", "art[u]=true"]
  ]),
  ...concepts("mod-advanced-graphs", "topic-graph-euler", "core", [
    ["eulerian-paths", "absent", "E+1", "optional<vector<int>> euler"]
  ]),
  ...concepts("mod-advanced-trees", "topic-tree-lifting-dp-morris", "core", [
    ["binary-lifting-repeated-lca", "absent", "Equalize depths", "struct LCA"],
    ["tree-dp", "absent", "skip,take", "independentSet"],
    ["morris-traversal", "variation-only", "temporary predecessor threads", "vector<int> morris"]
  ]),
  ...concepts("mod-advanced-trees", "topic-tree-avl-balance", "core", [
    ["balanced-search-trees", "variation-only", "LL/RR", "Node* rotateRight"]
  ]),
  ...concepts("mod-tries-strings", "topic-string-linear-matching", "core", [
    ["kmp", "variation-only", "longest pattern prefix", "vector<int> kmp"],
    ["rolling-hash-rabin-karp", "variation-only", "verification eliminates collisions", "vector<int> rabinKarp"],
    ["z-algorithm", "absent", "rightmost [l,r)", "vector<int> zFunction"]
  ]),
  ...concepts("mod-bits-math", "topic-bits-number-theory", "core", [
    ["xor", "variation-only", "XOR of equal values is zero", "singleNumber"],
    ["bit-masks", "variation-only", "finite sets", "mask&=mask-1"],
    ["gcd", "variation-only", "gcd(a,b)=gcd(b,a%b)", "gcd64"],
    ["prime-sieve", "absent", "prime factor <=sqrt(n)", "vector<int> sieve"],
    ["modular-arithmetic", "variation-only", "multiplicative inverse", "modPow"]
  ]),
  ...concepts("mod-advanced-dp", "topic-dp-interval-dag", "core", [
    ["interval-dp", "absent", "Increasing interval length", "matrixChain"],
    ["dag-dp", "absent", "Kahn order", "dagLongest"]
  ]),
  ...concepts("mod-advanced-dp", "topic-dp-bitmask-mitm", "core", [
    ["bitmask-dp", "variation-only", "popcount(mask)", "long long assignment"],
    ["meet-in-the-middle", "variation-only", "upper_bound chooses", "long long bestSubset"]
  ]),
  ...concepts("mod-arrays-strings", "topic-matrix-transformations", "core", [
    ["matrix-rotation", "variation-only", "composing to clockwise rotation", "void rotateClockwise"],
    ["spiral-traversal", "variation-only", "guard the return legs", "vector<int> spiral"],
    ["set-matrix-zeroes", "variation-only", "two separate booleans", "void setZeroes"]
  ]),
  ...concepts("mod-dsa-specialist", "topic-specialist-suffix-array", "specialist", [
    ["suffix-array", "variation-only", "doubling length", "suffixArray"],
    ["lcp-kasai", "absent", "Kasai", "lcp[r]=h"]
  ]),
  ...concepts("mod-dsa-specialist", "topic-specialist-digit-dp", "specialist", [
    ["digit-dp", "absent", "last=10", "countNoAdjacent"]
  ]),
  ...concepts("mod-dsa-specialist", "topic-specialist-heavy-light", "specialist", [
    ["heavy-light-decomposition", "absent", "light child has at most half", "struct HLD"]
  ]),
  ...concepts("mod-dsa-specialist", "topic-specialist-max-flow", "specialist", [
    ["maximum-flow", "absent", "blocking-flow", "struct Dinic"]
  ]),
  ...concepts("mod-dsa-specialist", "topic-specialist-number-theory", "specialist", [
    ["extended-gcd-inverse", "absent", "Bézout", "egcd"],
    ["coprime-crt", "absent", "two-modulus CRT only", "crt"],
    ["euler-totient", "absent", "inclusion-exclusion", "phi"]
  ])
];

// Original live DSA inventory after ownership repair and duplicate consolidation.
// These are retained lessons, not a scan of unused catalogs or backups.
export const retainedDsaTopics: Record<string, string[]> = {
  "mod-foundations": ["topic-foundation-coding-workflow", "topic-foundation-pattern-recognition", "topic-foundation-communication"],
  "mod-arrays-strings": [
    "topic-arrays-frequency-maps", "topic-arrays-two-sum", "topic-arrays-prefix-sum", "topic-arrays-rotate-array",
    "topic-hash-group-anagrams", "topic-two-sum-family", "topic-prefix-sums-advanced", "topic-hash-map-collision",
    "topic-hashing-two-sum", "topic-arrays-fundamentals", "topic-2d-arrays-matrix", "topic-string-operations",
    "topic-arrays-valid-palindrome", "topic-arrays-longest-common-prefix", "topic-arrays-product-except-self",
    "topic-arrays-merge-intervals", "topic-arrays-insert-interval", "topic-arrays-maximum-subarray",
    "topic-arrays-best-time-to-buy-sell", "topic-arrays-majority-element", "topic-hash-top-k-frequent",
    "topic-hash-contains-duplicate", "topic-hash-longest-consecutive"
  ],
  "mod-two-pointers-sliding": [
    "topic-arrays-sliding-window", "topic-arrays-longest-substring", "topic-arrays-container-water",
    "topic-arrays-remove-duplicates", "topic-two-pointers-sort-colors", "topic-two-pointers-merge-sorted",
    "topic-two-pointers-partition", "topic-sliding-window-master", "topic-two-pointer-basic",
    "topic-sliding-window-fixed", "topic-sliding-window-variable", "topic-two-pointers-3sum",
    "topic-two-pointers-4sum", "topic-window-longest-substring-k-distinct", "topic-window-minimum-window-substring",
    "topic-window-max-consecutive-ones", "topic-two-pointers-binary-search-sum"
  ],
  "mod-stack-monotonic": [
    "topic-arrays-trapping-rain", "topic-strings-valid-parentheses", "topic-stack-next-greater-element",
    "topic-stack-largest-rectangle", "topic-queue-sliding-window-max", "topic-monotonic-stack-mastery",
    "topic-stack-basics", "topic-queue-basics", "topic-stack-min-stack", "topic-stack-implement-queue",
    "topic-queue-rotating-array", "topic-stack-astroid"
  ],
  "mod-binary-search-intervals": [
    "topic-binary-search-basic", "topic-binary-search-first-last", "topic-binary-search-rotated",
    "topic-binary-search-advanced", "topic-binary-search-search-insert-position",
    "topic-binary-search-koko-eating-bananas", "topic-binary-search-peak-element", "topic-arrays-meeting-rooms"
  ],
  "mod-linked-list": [
    "topic-linked-list-reverse", "topic-linked-list-cycle", "topic-fast-slow-pointers-master",
    "topic-linked-list-basics", "topic-fast-slow-pointers", "topic-linked-list-merge-two-lists",
    "topic-linked-list-remove-nth-node", "topic-linked-list-palindrome", "topic-linked-list-reorder"
  ],
  "mod-trees-bst": [
    "topic-tree-inorder-traversal", "topic-tree-validate-bst", "topic-tree-level-order", "topic-tree-max-depth",
    "topic-tree-same-tree", "topic-tree-subtree-another", "topic-tree-lowest-common-ancestor", "topic-tree-kth-smallest-bst"
  ],
  "mod-heaps": ["topic-heap-k-largest", "topic-heap-top-k-frequent", "topic-heap-median-stream"],
  "mod-graphs": ["topic-graph-bfs", "topic-graph-dfs", "topic-graph-number-of-islands", "topic-graph-course-schedule", "topic-graph-word-ladder", "topic-graph-graph-valid-tree"],
  "mod-dynamic-programming": ["topic-dp-climb-stairs", "topic-dp-house-robber", "topic-dp-coin-change", "topic-dp-longest-increasing-subsequence", "topic-dp-word-break", "topic-dp-edit-distance"],
  "mod-greedy-backtracking": ["topic-greedy-jump-game", "topic-greedy-merge-intervals", "topic-backtracking-subsets", "topic-backtracking-permutations", "topic-backtracking-combinations"],
  "mod-dsa-mocks": ["topic-dsa-mock-array-hash", "topic-dsa-mock-tree-graph-dp", "topic-dsa-mock-mixed"]
};

export const retainedConceptManifest = Object.entries(retainedDsaTopics).flatMap(([moduleId, ids]) =>
  ids.map((topicId) => ({
    concept: topicId.replace(/^topic-/, ""), moduleId, topicId,
    priority: "P1" as const, scope: "core" as const,
    status: "dedicated" as const, initialStatus: "dedicated" as const
  }))
);

export const dsaCoverageManifest = [...retainedConceptManifest, ...dsaConceptManifest];
