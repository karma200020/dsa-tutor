// Aggregate view over every track's topic dataset, used by build-time scripts
// and by anything that legitimately needs all tracks at once.
//
// The per-track datasets now live in data/topics/{dsa,lld,hld,ai,os,cpp}.ts so the app
// can load a single track's content on demand. Importing this module pulls in
// all seven tracks, so client components should import the per-track module they
// need instead (see app/home-view.tsx).
import { Topic, syllabus } from "./syllabus";
import { googleDsaProblems, googleCheatSheetReference } from "./google-cheat-sheet-integration";
import { allDsaTopics } from "./topics/dsa";
import { allLldTopics } from "./topics/lld";
import { allHldTopics } from "./topics/hld";
import { allAiTopics } from "./topics/ai";
import { allOsTopics } from "./topics/os";
import { allCppTopics } from "./topics/cpp";
import { allCnTopics } from "./topics/cn";

export { allDsaTopics, allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics, allCnTopics };

export const allTopics: Topic[] = [
  ...allDsaTopics,
  ...allLldTopics,
  ...allHldTopics,
  ...allAiTopics,
  ...allOsTopics,
  ...allCppTopics,
  ...allCnTopics
];

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
    practiceProblems: [
      {
        variation: "Two Sum when the array is already sorted",
        tip: "Sortedness makes the hash map unnecessary: converging two pointers move the sum monotonically, so one comparison per step suffices. That drops space from O(n) to O(1) while staying O(n) time. The classic phrasing wants 1-indexed positions.",
        snippet: "int l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = a[l] + a[r];\n  if (sum == target) return {l + 1, r + 1};\n  if (sum < target) ++l;\n  else --r;\n}\nreturn {};"
      },
      {
        variation: "Longest Substring Without Repeating Characters — jump the left edge instead of shrinking",
        tip: "Shrinking one character at a time is correct but wasteful. Store each character's last index and move the left edge straight past it on a repeat, taking a max so it never moves backwards. O(n) time and O(k) space in the alphabet size.",
        snippet: "std::unordered_map<char,int> last;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  auto it = last.find(s[r]);\n  if (it != last.end()) l = std::max(l, it->second + 1);\n  last[s[r]] = r;\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Product of Array Except Self, without division and in O(1) extra space",
        tip: "Division is banned precisely because a single zero breaks it. Build the prefix products directly into the output array, then sweep backwards multiplying by a running suffix product. The output does not count toward space, so this is O(n) time and O(1) extra.",
        snippet: "std::vector<int> out(n, 1);\nfor (int i = 1; i < n; ++i) out[i] = out[i-1] * a[i-1];\nint suffix = 1;\nfor (int i = n - 1; i >= 0; --i) {\n  out[i] *= suffix;\n  suffix *= a[i];\n}\nreturn out;"
      },
      {
        variation: "Maximum Subarray when all values are negative",
        tip: "Initialising the answer to 0 is the standard bug: an all-negative array then returns 0 instead of the largest single element. Seed both the running and best sums with the first element and start the loop at index 1. Kadane stays O(n) time and O(1) space.",
        snippet: "int cur = a[0], best = a[0];\nfor (int i = 1; i < n; ++i) {\n  cur = std::max(a[i], cur + a[i]);\n  best = std::max(best, cur);\n}\nreturn best;"
      },
      {
        variation: "Merge Intervals when the input is not sorted and touching intervals must merge",
        tip: "The merge sweep only works on start-sorted input, so sort first — that is the O(n log n) term. Decide explicitly whether [1,2] and [2,3] merge: use >= for touching, > for strictly overlapping. Extend the current end with a max, since one interval may be contained in another.",
        snippet: "std::sort(iv.begin(), iv.end());\nstd::vector<std::vector<int>> out;\nfor (auto& x : iv) {\n  if (!out.empty() && x[0] <= out.back()[1])          // touching counts\n    out.back()[1] = std::max(out.back()[1], x[1]);\n  else out.push_back(x);\n}\nreturn out;"
      },
      {
        variation: "Longest Consecutive Sequence in O(n) without sorting",
        tip: "Sorting gives O(n log n); the follow-up asks for linear. Put everything in a hash set and only start counting from values that have no predecessor in the set, so each run is walked exactly once. Amortised O(n) despite the nested loop.",
        snippet: "std::unordered_set<int> s(a.begin(), a.end());\nint best = 0;\nfor (int x : s) {\n  if (s.count(x - 1)) continue;      // not a run start\n  int len = 1;\n  while (s.count(x + len)) ++len;\n  best = std::max(best, len);\n}\nreturn best;"
      }
    ]
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
    practiceProblems: [
      {
        variation: "Number of Islands — flood fill, and the follow-up bans the recursion stack",
        tip: "DFS is the natural fit but a 1000x1000 grid of all land overflows the call stack. Convert to an explicit BFS queue, and mark cells as visited when you enqueue them, not when you dequeue, or the same cell is queued many times. O(mn) time and O(min(m,n)) queue space.",
        snippet: "std::queue<std::pair<int,int>> q; q.push({r, c}); g[r][c] = '0';\nconst int dr[4]{1,-1,0,0}, dc[4]{0,0,1,-1};\nwhile (!q.empty()) {\n  auto [i, j] = q.front(); q.pop();\n  for (int d = 0; d < 4; ++d) {\n    int ni = i + dr[d], nj = j + dc[d];\n    if (ni<0||nj<0||ni>=m||nj>=n||g[ni][nj]=='0') continue;\n    g[ni][nj] = '0';                    // mark on enqueue\n    q.push({ni, nj});\n  }\n}"
      },
      {
        variation: "Course Schedule II — return a valid order, not just whether one exists",
        tip: "Cycle detection alone answers the boolean version. For an ordering, run Kahn's algorithm: repeatedly take a node of in-degree zero and decrement its neighbours. If the emitted order is shorter than n a cycle exists. O(V + E) time and space.",
        snippet: "std::vector<int> indeg(n, 0);\nfor (auto& e : edges) ++indeg[e[0]];   // e = {course, prereq}\nstd::queue<int> q;\nfor (int i = 0; i < n; ++i) if (!indeg[i]) q.push(i);\nstd::vector<int> order;\nwhile (!q.empty()) {\n  int u = q.front(); q.pop(); order.push_back(u);\n  for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);\n}\nreturn (int)order.size() == n ? order : std::vector<int>{};"
      },
      {
        variation: "Shortest path on an unweighted graph versus a weighted one",
        tip: "BFS is only shortest-path-correct when every edge costs the same, because it relies on visiting nodes in non-decreasing distance order. Add weights and you need Dijkstra with a priority queue, O((V + E) log V). If weights can be negative, even Dijkstra fails and you need Bellman-Ford.",
        snippet: "std::priority_queue<std::pair<long long,int>,\n  std::vector<std::pair<long long,int>>, std::greater<>> pq;\nstd::vector<long long> dist(n, LLONG_MAX);\ndist[src] = 0; pq.push({0, src});\nwhile (!pq.empty()) {\n  auto [d, u] = pq.top(); pq.pop();\n  if (d > dist[u]) continue;                 // stale entry\n  for (auto& [v, w] : adj[u])\n    if (d + w < dist[v]) { dist[v] = d + w; pq.push({dist[v], v}); }\n}"
      },
      {
        variation: "Lowest Common Ancestor in a BST rather than a general binary tree",
        tip: "In a general tree LCA needs a full O(n) post-order search. A BST's ordering lets you decide direction from the values alone: if both targets are smaller go left, if both larger go right, otherwise you are standing on the split point. O(h) time and O(1) space iteratively.",
        snippet: "TreeNode* cur = root;\nwhile (cur) {\n  if (p->val < cur->val && q->val < cur->val) cur = cur->left;\n  else if (p->val > cur->val && q->val > cur->val) cur = cur->right;\n  else return cur;                           // split point\n}\nreturn nullptr;"
      },
      {
        variation: "Binary Tree Maximum Path Sum — the path need not pass through the root",
        tip: "The recursion returns and records two different quantities: what a parent can extend (one downward branch) versus the best path seen anywhere (both branches joined). Clamp negative child contributions to zero so a harmful branch is simply dropped. O(n) time and O(h) space.",
        snippet: "long long best = LLONG_MIN;\nstd::function<long long(TreeNode*)> down = [&](TreeNode* t) -> long long {\n  if (!t) return 0;\n  long long l = std::max(0LL, down(t->left));\n  long long r = std::max(0LL, down(t->right));\n  best = std::max(best, t->val + l + r);     // join both branches here\n  return t->val + std::max(l, r);            // parent can only extend one\n};\ndown(root);\nreturn best;"
      },
      {
        variation: "Word Ladder — return the number of transformations, and the dictionary is large",
        tip: "Comparing every pair of words is O(n^2 * L). Instead generate the wildcard patterns of each word to build the adjacency implicitly, then BFS for the shortest hop count. Bidirectional BFS from both ends roughly square-roots the explored frontier, which is the expected follow-up.",
        snippet: "std::queue<std::string> q{{begin}}; int steps = 1;\nstd::unordered_set<std::string> dict(words.begin(), words.end());\nwhile (!q.empty()) {\n  for (int sz = q.size(); sz > 0; --sz) {\n    std::string w = q.front(); q.pop();\n    if (w == target) return steps;\n    for (size_t i = 0; i < w.size(); ++i) {\n      char old = w[i];\n      for (char c = 'a'; c <= 'z'; ++c) {\n        w[i] = c;\n        if (dict.erase(w)) q.push(w);        // erase == mark visited\n      }\n      w[i] = old;\n    }\n  }\n  ++steps;\n}\nreturn 0;"
      }
    ]
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
    practiceProblems: [
      {
        variation: "House Robber II — the houses are arranged in a circle",
        tip: "The circle makes the first and last houses adjacent, which the linear recurrence cannot express. Split into two independent linear runs — one excluding the last house, one excluding the first — and take the maximum. Still O(n) time and O(1) space, with n = 1 as a special case.",
        snippet: "auto rob1 = [&](int lo, int hi) {\n  int prev = 0, cur = 0;\n  for (int i = lo; i <= hi; ++i) { int t = std::max(cur, prev + a[i]); prev = cur; cur = t; }\n  return cur;\n};\nif (n == 1) return a[0];\nreturn std::max(rob1(0, n - 2), rob1(1, n - 1));"
      },
      {
        variation: "Coin Change — minimise the number of coins, and report -1 when impossible",
        tip: "The greedy 'largest coin first' rule is wrong for denominations like {1,3,4}, so you need the full unbounded-knapsack DP. Iterate the amount in the outer loop so each coin may be reused. Use amount+1 as an infinity sentinel to keep the arithmetic in int. O(amount * coins).",
        snippet: "std::vector<int> dp(amount + 1, amount + 1);\ndp[0] = 0;\nfor (int v = 1; v <= amount; ++v)\n  for (int c : coins)\n    if (c <= v) dp[v] = std::min(dp[v], dp[v - c] + 1);\nreturn dp[amount] > amount ? -1 : dp[amount];"
      },
      {
        variation: "Coin Change II — count the number of combinations instead of the minimum",
        tip: "Same table, but the loop order carries the meaning: coins outer and amount inner counts combinations, while amount outer and coins inner counts permutations. Getting this backwards is the single most common mistake in the problem. O(amount * coins) time, O(amount) space.",
        snippet: "std::vector<long long> dp(amount + 1, 0);\ndp[0] = 1;\nfor (int c : coins)                       // coins OUTER => combinations\n  for (int v = c; v <= amount; ++v)\n    dp[v] += dp[v - c];\nreturn dp[amount];"
      },
      {
        variation: "Longest Increasing Subsequence in O(n log n) rather than O(n^2)",
        tip: "The quadratic DP compares against every earlier index. Instead maintain the smallest possible tail for each length and binary search the insertion point; the tails array is sorted by construction, so its length is the answer. Note the tails array is not itself a valid subsequence.",
        snippet: "std::vector<int> tails;\nfor (int x : a) {\n  auto it = std::lower_bound(tails.begin(), tails.end(), x);\n  if (it == tails.end()) tails.push_back(x);\n  else *it = x;\n}\nreturn (int)tails.size();"
      },
      {
        variation: "Edit Distance with O(min(m,n)) space instead of a full 2D table",
        tip: "Each row of the table depends only on the previous one, so keep two rows and roll them. The catch is the diagonal term: save the pre-overwrite value before assigning the current cell. O(mn) time with O(min(m,n)) space; iterate over the shorter string in the inner loop.",
        snippet: "std::vector<int> prev(n + 1), cur(n + 1);\nfor (int j = 0; j <= n; ++j) prev[j] = j;\nfor (int i = 1; i <= m; ++i) {\n  cur[0] = i;\n  for (int j = 1; j <= n; ++j)\n    cur[j] = (a[i-1] == b[j-1]) ? prev[j-1]\n           : 1 + std::min({prev[j-1], prev[j], cur[j-1]});\n  std::swap(prev, cur);\n}\nreturn prev[n];"
      },
      {
        variation: "0/1 Knapsack — each item may be used at most once",
        tip: "The unbounded version iterates capacity upward so an item can be reused. To forbid reuse, iterate capacity downward, which guarantees each dp entry is read from the previous item's row before being overwritten. One reversed loop is the entire difference. O(n * W) time, O(W) space.",
        snippet: "std::vector<int> dp(W + 1, 0);\nfor (int i = 0; i < n; ++i)\n  for (int w = W; w >= wt[i]; --w)        // DOWNWARD => each item once\n    dp[w] = std::max(dp[w], dp[w - wt[i]] + val[i]);\nreturn dp[W];"
      }
    ]
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
