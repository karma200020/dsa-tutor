/**
 * Google DSA Interview C++ Cheat Sheet Integration
 * 
 * This file integrates the Google DSA Interview C++ Code Snippets (100+ Medium/Hard problems)
 * into the DSA Tutor curriculum. It provides:
 * 1. Quick reference code templates from Google's cheat sheet
 * 2. Mapping of Google's problems to syllabus topics
 * 3. Common patterns and C++ implementations
 * 4. Interview-ready problem solutions
 * 
 * Source: google-dsa-cpp-cheat-sheet.pdf
 */

import { Topic } from "./syllabus";

// ===== GOOGLE DSA QUESTIONS REFERENCE =====
export interface GoogleDsaProblem {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  pattern: string;
  description: string;
  leetcodeId: string;
  cppSolution?: string;
  keyInsights: string[];
  timeComplexity: string;
  spaceComplexity: string;
  commonMistakes: string[];
}

// ===== QUICK REFERENCE CODE TEMPLATES FROM GOOGLE CHEAT SHEET =====
export const googleCodeTemplates = {
  // Arrays & Strings
  hashMapFrequency: `
unordered_map<char, int> freq;
for (char c : s) freq[c]++;
// Use: frequency counting, anagram checks, grouping
`,
  
  twoSum: `
unordered_map<int, int> seen;
for (int i = 0; i < nums.size(); i++) {
  int comp = target - nums[i];
  if (seen.count(comp)) return {seen[comp], i};
  seen[nums[i]] = i;
}
// Time: O(n), Space: O(n)
`,

  slidingWindow: `
int left = 0;
for (int right = 0; right < n; right++) {
  window_sum += nums[right];
  while (window_sum > target) {
    window_sum -= nums[left++];
  }
  // Process window
}
// Use: subarray problems, min/max windows
`,

  twoPointers: `
int left = 0, right = n - 1;
while (left < right) {
  if (condition(left, right)) {
    // Process
    left++; right--;
  } else if (need_move_left) {
    left++;
  } else {
    right--;
  }
}
// Use: palindromes, containers, sorted arrays
`,

  prefixSum: `
vector<int> prefix(n + 1, 0);
for (int i = 0; i < n; i++) {
  prefix[i + 1] = prefix[i] + nums[i];
}
// Query range sum: prefix[right+1] - prefix[left]
// Time: O(n) build, O(1) query
`,

  // Trees & Graphs
  dfsTraversal: `
void dfs(TreeNode* root) {
  if (!root) return;
  // Process node
  dfs(root->left);
  dfs(root->right);
}
// Variants: pre-order, in-order, post-order
`,

  bfsTraversal: `
queue<TreeNode*> q;
q.push(root);
while (!q.empty()) {
  TreeNode* curr = q.front();
  q.pop();
  // Process curr
  if (curr->left) q.push(curr->left);
  if (curr->right) q.push(curr->right);
}
// Use: level-order, shortest path in unweighted graph
`,

  graphDfs: `
vector<bool> visited(n, false);
void dfs(int node) {
  visited[node] = true;
  for (int neighbor : adj[node]) {
    if (!visited[neighbor]) dfs(neighbor);
  }
}
// Use: connectivity, components, cycle detection
`,

  unionFind: `
class UnionFind {
  vector<int> parent, rank;
public:
  int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);
    return parent[x];
  }
  void unite(int x, int y) {
    x = find(x); y = find(y);
    if (rank[x] < rank[y]) swap(x, y);
    parent[y] = x;
    if (rank[x] == rank[y]) rank[x]++;
  }
};
// Use: dynamic connectivity, cycle detection, component counting
`,

  // Dynamic Programming
  dp1D: `
vector<int> dp(n);
dp[0] = base_case;
for (int i = 1; i < n; i++) {
  dp[i] = f(dp[i-1], dp[i-2], ...);
}
// Use: linear recurrence, house robber variants
`,

  dp2D: `
vector<vector<int>> dp(m, vector<int>(n));
for (int i = 0; i < m; i++) {
  for (int j = 0; j < n; j++) {
    dp[i][j] = f(dp[i-1][j], dp[i][j-1], ...);
  }
}
// Use: grid problems, LCS, edit distance
`,

  knapsack: `
vector<int> dp(capacity + 1, 0);
for (int i = 0; i < n; i++) {
  for (int w = capacity; w >= weight[i]; w--) {
    dp[w] = max(dp[w], dp[w - weight[i]] + value[i]);
  }
}
// 0-1 Knapsack: O(n*capacity) time, O(capacity) space
`,

  // Heaps & Priority Queues
  heapTemplate: `
priority_queue<int> maxHeap; // max-heap by default
priority_queue<int, vector<int>, greater<int>> minHeap; // min-heap
maxHeap.push(x);
int top = maxHeap.top();
maxHeap.pop();
// Use: top-k, median, scheduling
`,

  // Binary Search
  binarySearch: `
int left = 0, right = n - 1;
while (left <= right) {
  int mid = left + (right - left) / 2;
  if (check(mid)) {
    // Found or search right
    left = mid + 1;
  } else {
    // Search left
    right = mid - 1;
  }
}
// Always use mid = left + (right - left) / 2 to avoid overflow
`,

  // String Algorithms
  kmpAlgorithm: `
vector<int> computeLPS(string pattern) {
  int n = pattern.size();
  vector<int> lps(n, 0);
  for (int i = 1; i < n; i++) {
    int j = lps[i - 1];
    while (j > 0 && pattern[i] != pattern[j]) j = lps[j - 1];
    if (pattern[i] == pattern[j]) j++;
    lps[i] = j;
  }
  return lps;
}
// Use: pattern matching, prefix-suffix overlap
`,

  // Greedy & Backtracking
  backtrack: `
void backtrack(vector<int>& path, vector<bool>& used) {
  if (path.size() == target) {
    // Record solution
    return;
  }
  for (int i = 0; i < n; i++) {
    if (used[i]) continue;
    path.push_back(i);
    used[i] = true;
    backtrack(path, used);
    path.pop_back();
    used[i] = false;
  }
}
// Use: permutations, combinations, sudoku, N-queens
`,
};

// ===== GOOGLE DSA PROBLEMS (FROM CSV) =====
export const googleDsaProblems: GoogleDsaProblem[] = [
  // Arrays & Strings (Easy)
  {
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays Strings",
    pattern: "Hash Map",
    description: "Find two numbers that add up to target",
    leetcodeId: "LC 1",
    keyInsights: [
      "Hash map provides O(n) solution vs O(n log n) sort",
      "Store complement (target - current) in map",
      "Handle edge cases: duplicates, negative numbers"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    commonMistakes: ["Using sorted array then two pointers (works but miss single pass)", "Not checking if same element used twice"]
  },

  {
    title: "Valid Palindrome",
    difficulty: "Easy",
    category: "Arrays Strings",
    pattern: "Two Pointers",
    description: "Check if string is palindrome (alphanumeric only)",
    leetcodeId: "LC 125",
    keyInsights: [
      "Skip non-alphanumeric characters",
      "Convert to lowercase for comparison",
      "Two pointers from ends"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    commonMistakes: ["Forgetting to skip non-alphanumeric", "Case sensitivity issues"]
  },

  // Arrays & Strings (Medium)
  {
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    category: "Arrays Strings",
    pattern: "Sliding Window",
    description: "Find longest substring without repeating chars",
    leetcodeId: "LC 3",
    keyInsights: [
      "Use sliding window with frequency map",
      "When duplicate found, move left to past previous occurrence",
      "Track max length during expansion"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(min(n, charset))",
    commonMistakes: ["Not tracking last seen index properly", "Shrinking too much"]
  },

  {
    title: "Container With Most Water",
    difficulty: "Medium",
    category: "Arrays Strings",
    pattern: "Two Pointers",
    description: "Find container that holds most water",
    leetcodeId: "LC 11",
    keyInsights: [
      "Area = width × min(height)",
      "Greedy: always move pointer with smaller height",
      "Proof: moving taller pointer can't improve area"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    commonMistakes: ["Thinking we need to check all pairs", "Not understanding greedy proof"]
  },

  // Arrays & Strings (Hard)
  {
    title: "Trapping Rain Water",
    difficulty: "Hard",
    category: "Arrays Strings",
    pattern: "Two Pointers/DP",
    description: "Calculate trapped rainwater between elevations",
    leetcodeId: "LC 42",
    keyInsights: [
      "Water at position i = min(maxLeft, maxRight) - height[i]",
      "Two pointer approach: maintain left/right max as you move",
      "Alternative: precompute maxLeft and maxRight arrays"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    commonMistakes: ["Off-by-one errors", "Not handling edge cases at boundaries"]
  },

  {
    title: "Minimum Window Substring",
    difficulty: "Hard",
    category: "Arrays Strings",
    pattern: "Sliding Window",
    description: "Find minimum window containing all required chars",
    leetcodeId: "LC 76",
    keyInsights: [
      "Use frequency maps for required and current window",
      "Expand right to find valid window, contract left to minimize",
      "Track when valid window found"
    ],
    timeComplexity: "O(s + t) where s is haystack, t is needle",
    spaceComplexity: "O(1) if fixed charset",
    commonMistakes: ["Not properly checking valid window", "Inefficient re-checking"]
  },

  // Trees & Graphs (Medium)
  {
    title: "Number of Islands",
    difficulty: "Medium",
    category: "Trees Graphs",
    pattern: "DFS/BFS",
    description: "Count connected components in 2D grid",
    leetcodeId: "LC 200",
    keyInsights: [
      "Flood fill algorithm with DFS or BFS",
      "Mark visited cells to avoid re-exploring",
      "Each new island triggers a new DFS"
    ],
    timeComplexity: "O(m × n)",
    spaceComplexity: "O(m × n) for visited array",
    commonMistakes: ["Not marking cells as visited", "Double-counting islands"]
  },

  {
    title: "Lowest Common Ancestor",
    difficulty: "Medium",
    category: "Trees Graphs",
    pattern: "DFS",
    description: "Find LCA in binary tree",
    leetcodeId: "LC 236",
    keyInsights: [
      "Use recursion to check left and right subtrees",
      "If both p and q found in different subtrees, current is LCA",
      "If found in one subtree, recurse on that side"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(h) for recursion stack",
    commonMistakes: ["Assuming BST properties", "Not handling case where node equals p or q"]
  },

  {
    title: "Course Schedule",
    difficulty: "Medium",
    category: "Trees Graphs",
    pattern: "Topological Sort",
    description: "Determine if courses can be completed (cycle detection)",
    leetcodeId: "LC 207",
    keyInsights: [
      "Model as directed graph: prerequisite → course",
      "Use DFS with states: visiting, visited, unvisited",
      "Cycle means impossible to complete all courses"
    ],
    timeComplexity: "O(n + edges)",
    spaceComplexity: "O(n)",
    commonMistakes: ["Not properly tracking states during DFS", "Using only boolean visited"]
  },

  // Trees & Graphs (Hard)
  {
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Hard",
    category: "Trees Graphs",
    pattern: "DFS",
    description: "Find maximum path sum in binary tree",
    leetcodeId: "LC 124",
    keyInsights: [
      "Post-order traversal: calculate max path through node",
      "At each node: max(left) + val + max(right)",
      "Track global max as we traverse"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(h) for recursion",
    commonMistakes: ["Including negative paths", "Not updating global max properly"]
  },

  {
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "Hard",
    category: "Trees Graphs",
    pattern: "DFS/BFS",
    description: "Convert tree to string and reconstruct",
    leetcodeId: "LC 297",
    keyInsights: [
      "Use pre-order traversal with null markers",
      "Serialize: depth-first, include nulls as markers",
      "Deserialize: reconstruct by following same order"
    ],
    timeComplexity: "O(n) for both serialize and deserialize",
    spaceComplexity: "O(n)",
    commonMistakes: ["Not handling null nodes properly", "Off-by-one in reconstruction"]
  },

  {
    title: "Word Ladder",
    difficulty: "Hard",
    category: "Trees Graphs",
    pattern: "BFS",
    description: "Find shortest transformation sequence",
    leetcodeId: "LC 127",
    keyInsights: [
      "BFS finds shortest path in unweighted graph",
      "Build adjacency by checking one-char differences",
      "Use queue and visited set"
    ],
    timeComplexity: "O(L × N²) where L is word length, N is number of words",
    spaceComplexity: "O(N × L)",
    commonMistakes: ["Using DFS instead of BFS", "Not checking one-char difference correctly"]
  },

  // Dynamic Programming (Easy)
  {
    title: "Maximum Subarray",
    difficulty: "Easy",
    category: "Dynamic Programming",
    pattern: "Kadane's Algorithm",
    description: "Find contiguous subarray with maximum sum",
    leetcodeId: "LC 53",
    keyInsights: [
      "dp[i] = max sum ending at position i",
      "At each position: extend previous or start fresh",
      "Reset when cumulative becomes negative"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    commonMistakes: ["Not resetting when sum goes negative", "Confusing global vs local max"]
  },

  // Dynamic Programming (Medium)
  {
    title: "Coin Change",
    difficulty: "Medium",
    category: "Dynamic Programming",
    pattern: "1D DP",
    description: "Minimum number of coins to make amount",
    leetcodeId: "LC 322",
    keyInsights: [
      "dp[i] = minimum coins to make amount i",
      "For each coin, update all reachable amounts",
      "Iterate coins in outer loop for 1D space"
    ],
    timeComplexity: "O(n × m) where n is amount, m is coin types",
    spaceComplexity: "O(n)",
    commonMistakes: ["Iterating coins inner vs outer", "Not handling impossible amounts"]
  },

  {
    title: "House Robber",
    difficulty: "Medium",
    category: "Dynamic Programming",
    pattern: "1D DP",
    description: "Maximum money robbing non-adjacent houses",
    leetcodeId: "LC 198",
    keyInsights: [
      "dp[i] = max money up to house i",
      "Either rob current (skip previous) or skip current",
      "Recurrence: dp[i] = max(dp[i-1], nums[i] + dp[i-2])"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1) with two variables",
    commonMistakes: ["Not handling the choice properly", "Index off-by-one"]
  },

  {
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    category: "Dynamic Programming",
    pattern: "2D DP",
    description: "Find longest common subsequence of two strings",
    leetcodeId: "LC 1143",
    keyInsights: [
      "dp[i][j] = LCS length of first i and j chars",
      "If match: dp[i][j] = dp[i-1][j-1] + 1",
      "Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])"
    ],
    timeComplexity: "O(m × n)",
    spaceComplexity: "O(m × n)",
    commonMistakes: ["Confusing with substring", "Not building table correctly"]
  },

  // Dynamic Programming (Hard)
  {
    title: "Edit Distance",
    difficulty: "Hard",
    category: "Dynamic Programming",
    pattern: "2D DP",
    description: "Minimum operations to transform one string to another",
    leetcodeId: "LC 72",
    keyInsights: [
      "dp[i][j] = min edits from first i to j chars",
      "Operations: insert, delete, replace (3 choices)",
      "Recurrence considers all three operations"
    ],
    timeComplexity: "O(m × n)",
    spaceComplexity: "O(m × n)",
    commonMistakes: ["Missing one operation type", "Base case handling"]
  },

  // Recent 2024-2025 Problems
  {
    title: "Multi-source BFS Problem",
    difficulty: "Medium",
    category: "Recent 2024-2025",
    pattern: "BFS",
    description: "BFS from multiple starting points simultaneously",
    leetcodeId: "N/A",
    keyInsights: [
      "Add all source nodes to queue initially",
      "Process layer by layer for level-based distance",
      "Common in matrix distance/connectivity problems"
    ],
    timeComplexity: "O(m × n)",
    spaceComplexity: "O(m × n)",
    commonMistakes: ["Adding sources one by one", "Not tracking distance properly"]
  },

  {
    title: "Grid Islands with Merging",
    difficulty: "Medium",
    category: "Recent 2024-2025",
    pattern: "DFS/Union-Find",
    description: "Islands problem with custom merging rules",
    leetcodeId: "N/A",
    keyInsights: [
      "Union-Find for dynamic connectivity",
      "Path compression and union by rank for efficiency",
      "Merge islands based on custom conditions"
    ],
    timeComplexity: "O(m × n × α(n)) where α is inverse Ackermann",
    spaceComplexity: "O(m × n)",
    commonMistakes: ["Not implementing path compression", "Incorrect merging logic"]
  },

  {
    title: "Rectangle Area Division",
    difficulty: "Hard",
    category: "Recent 2024-2025",
    pattern: "Geometry/Sweep Line",
    description: "Find vertical line dividing rectangle area equally",
    leetcodeId: "N/A",
    keyInsights: [
      "Coordinate compression for efficiency",
      "Sweep line algorithm",
      "Binary search on vertical line positions"
    ],
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(n)",
    commonMistakes: ["Integer overflow on area calculations", "Incorrect binary search"]
  },

  {
    title: "Arithmetic Subarrays with ±1 Difference",
    difficulty: "Medium",
    category: "Recent 2024-2025",
    pattern: "Array Processing",
    description: "Find subarrays forming arithmetic sequences (difference ±1)",
    leetcodeId: "N/A",
    keyInsights: [
      "Check consecutive element differences",
      "All differences must be exactly ±1",
      "Sliding window or two-pass approach"
    ],
    timeComplexity: "O(n)",
    spaceComplexity: "O(1)",
    commonMistakes: ["Incorrect difference checking", "Off-by-one in boundaries"]
  },

  {
    title: "Job Scheduler with Blocking APIs",
    difficulty: "Hard",
    category: "Recent 2024-2025",
    pattern: "Concurrency/System Design",
    description: "Design scheduler handling concurrent blocking API calls",
    leetcodeId: "N/A",
    keyInsights: [
      "Thread-safe queue for job management",
      "Handle blocking calls with proper synchronization",
      "Prevent deadlocks and race conditions",
      "Consider backpressure and timeouts"
    ],
    timeComplexity: "O(1) per operation with proper locking",
    spaceComplexity: "O(n) for queue",
    commonMistakes: ["Race conditions", "Not handling timeouts", "Deadlock scenarios"]
  },
];

// ===== ENHANCED TOPICS WITH GOOGLE CHEAT SHEET REFERENCES =====
export const googleEnhancedTopicReferences = {
  // Map problem titles to module IDs
  "Two Sum": "mod-arrays-strings",
  "Longest Substring Without Repeating Characters": "mod-two-pointers-sliding",
  "Container With Most Water": "mod-two-pointers-sliding",
  "Trapping Rain Water": "mod-two-pointers-sliding",
  "Minimum Window Substring": "mod-two-pointers-sliding",
  "Valid Palindrome": "mod-two-pointers-sliding",
  "Binary Tree Maximum Path Sum": "mod-trees-bst",
  "Number of Islands": "mod-graphs",
  "Lowest Common Ancestor": "mod-trees-bst",
  "Course Schedule": "mod-graphs",
  "Serialize and Deserialize Binary Tree": "mod-trees-bst",
  "Word Ladder": "mod-graphs",
  "Longest Common Subsequence": "mod-dynamic-programming",
  "Coin Change": "mod-dynamic-programming",
  "House Robber": "mod-dynamic-programming",
  "Edit Distance": "mod-dynamic-programming",
  "Maximum Subarray": "mod-dynamic-programming",
};

// ===== GOOGLE CHEAT SHEET REFERENCE =====
export const googleCheatSheetReference = {
  title: "Google DSA Interview C++ Cheat Sheet",
  description: "100+ Medium/Hard interview problems with C++ code snippets and patterns",
  categories: [
    { name: "Arrays & Strings", problems: 10 },
    { name: "Trees & Graphs", problems: 15 },
    { name: "Dynamic Programming", problems: 15 },
    { name: "Heaps & Priority Queues", problems: 5 },
    { name: "Binary Search", problems: 5 },
    { name: "Advanced Graph Algorithms", problems: 8 },
    { name: "Advanced String Algorithms", problems: 5 },
    { name: "Advanced Dynamic Programming", problems: 5 },
    { name: "Advanced Data Structures", problems: 8 },
    { name: "System Design Implementations", problems: 3 },
    { name: "Advanced Algorithms & Optimization", problems: 5 },
  ],
  commonPatterns: [
    "Hash Maps & Frequency Counting",
    "Two Pointers & Sliding Windows",
    "DFS & Backtracking",
    "BFS & Level-order Traversal",
    "Binary Search on Answer",
    "Dynamic Programming (1D & 2D)",
    "Union-Find & Disjoint Sets",
    "Priority Queues & Heaps",
    "Graph Algorithms (Topological Sort, Dijkstra)",
    "String Matching (KMP, Rabin-Karp)",
  ],
  keyTemplates: Object.keys(googleCodeTemplates),
  interviewTips: [
    "Master the quick reference templates before interview",
    "Practice writing these patterns without looking at reference",
    "Understand time/space tradeoffs for each pattern",
    "Be ready to explain why each pattern is optimal",
    "Test with edge cases from the problems provided",
    "Combine multiple patterns for complex problems",
  ],
};

// ===== EXPORT FOR APP INTEGRATION =====
export interface GoogleDsaTopicEnhancement extends Topic {
  googleProblems?: string[]; // LeetCode IDs of associated problems
  googleCodeTemplate?: keyof typeof googleCodeTemplates;
  googleReference?: string; // Link or reference to cheat sheet
}

export const getGoogleProblemsForTopic = (moduleId: string): GoogleDsaProblem[] => {
  return googleDsaProblems.filter(
    (p) =>
      googleEnhancedTopicReferences[p.title as keyof typeof googleEnhancedTopicReferences] === moduleId
  );
};

export const getCodeTemplate = (patternName: string): string => {
  const templateKey = patternName
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/&/g, "")
    .replace(/\//g, "") as keyof typeof googleCodeTemplates;
  return googleCodeTemplates[templateKey] || "";
};
