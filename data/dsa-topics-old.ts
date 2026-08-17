import { Topic, Reference } from "./syllabus";

export const dsaTopics: Topic[] = [
  // Arrays & Strings Module
  {
    id: "topic-arrays-frequency-maps",
    moduleId: "mod-arrays-strings",
    title: "Frequency Maps & Counting",
    intuition:
      "Count element occurrences or character frequencies to solve grouping, anagram, and majority problems. Moves from brute-force O(n^2) sorting/comparing to O(n) hash table.",
    methodology: `Build frequency map in one pass â Use map to answer questions (compare, find max, etc.)`,
    cppCode: `
unordered_map<char, int> freq;
for (char c : s) freq[c]++;
// Check: freq[c] exists? freq[c] == target_count?
`,
    workedExample: `
Valid Anagram: "listen" vs "silent"
Step 1: Count each character in "listen"
  lâ1, iâ1, sâ1, tâ1, eâ1, nâ1
Step 2: For each char in "silent", subtract the count
  's'â0, 'i'â0, 'l'â0, 'e'â0, 'n'â0, 't'â0
Step 3: All counts are 0 â Same characters â
`,
    complexity: {
      time: "O(n)",
      space: "O(k) unique elements"
    },
    tips: [
      "Always clarify: case sensitivity, non-ASCII characters, and null/empty input handling.",
      "Use Map or HashMap; decide early if order matters (use LinkedHashMap or array for small alphabet).",
      "For anagram check: sort both strings and compare, OR build character count maps and compare."
    ],
    tricks: [
      "Frequency trick: If asking for 'majority element', store (value, count) in one pass and check >= n/2.",
      "Anagram grouping: Sort each string and use as key in map to group all anagrams.",
      "Character frequency: For small fixed alphabet (26 letters), use array index as key instead of hash map."
    ],
    memoryAids: [
      "Mnemonic: COUNT -> MAP -> CHECK for most frequency problems.",
      "Trigger cue: 'Find all...' or 'Group by...' often means frequency map.",
      "Mental shortcut: Unsorted input + frequency question = use hash first before sorting."
    ],
    interviewPatterns: [
      "Valid Anagram (check if two strings are rearrangements)",
      "Group Anagrams (group strings that are anagrams)",
      "Two Sum (find two numbers that sum to target using map)"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Amazon/Google first-round feedback",
        insight:
          "Interviewers expect you to articulate the tradeoff between sorting O(n log n) and hashing O(n). Explain why you chose one."
      },
      {
        source: "blog",
        attribution: "Blind 75 study guide",
        insight:
          "Frequency maps appear in 40% of phone screens. Master them before moving to advanced patterns."
      },
      {
        source: "book",
        attribution: "Cracking the Coding Interview",
        insight: "Use character count arrays for ASCII/lowercase letters; use hash maps for general case."
      }
    ],
    practiceProblems: ["prob-two-sum", "prob-valid-anagram", "prob-group-anagrams"]
  },

  {
    id: "topic-arrays-prefix-sum",
    moduleId: "mod-arrays-strings",
    title: "Prefix Sums",
    intuition:
      "Precompute cumulative sums to answer range sum queries in O(1). Avoids recalculating sum in loop each time.",
    methodology: `Build 1-indexed prefix array â Query: prefix[j+1] - prefix[i] = sum(arr[i..j])`,
    cppCode: `
vector<int> prefix(nums.size() + 1);
prefix[0] = 0;
for (int i = 0; i < nums.size(); i++) {
    prefix[i + 1] = prefix[i] + nums[i];
}
// Query: sumRange(1, 2) = prefix[3] - prefix[1]
`,
    workedExample: `
arr = [1, 3, 5, 7], query sum from index 1 to 2 (should get 3+5=8)

Building prefix (cumulative sums):
  [1]        â prefix[1] = 1
  [1,3]      â prefix[2] = 1+3 = 4
  [1,3,5]    â prefix[3] = 4+5 = 9
  [1,3,5,7]  â prefix[4] = 9+7 = 16

Answering query: sum(1,2) = ?
  Answer = prefix[3] - prefix[1] = 9 - 1 = 8 â
  (Everything up to index 2 MINUS everything before index 1)
`,
    complexity: {
      time: "O(n) build, O(1) query",
      space: "O(n)"
    },
    tips: [
      "Build prefix array first: prefix[i] = sum(arr[0..i-1]).",
      "Query range sum [i, j] = prefix[j+1] - prefix[i].",
      "Use 1-indexed prefix to simplify boundary handling (no special case for i=0)."
    ],
    tricks: [
      "For 2D prefix sums: prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1] + arr[i][j].",
      "Range sum 2D from (r1, c1) to (r2, c2) = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1].",
      "Edge case: Watch off-by-one in 1-indexed arrays."
    ],
    memoryAids: [
      "Checklist: 1-indexed prefix â range sum formula â test with example.",
      "Mnemonic: BUILD -> INDEX -> QUERY.",
      "Visual: Draw prefix array and trace range query on paper first."
    ],
    interviewPatterns: [
      "Range Sum Query (array immutable vs mutable)",
      "Subarray Sum Equals K (combine prefix sum with hash map)",
      "Maximum Subarray Sum (Kadane's algorithm variant)"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Microsoft technical feedback",
        insight: "Interviewers often ask: 'Can you optimize further if we preprocess?' â Prefix sum is the answer."
      },
      {
        source: "blog",
        attribution: "LeetCode discussions",
        insight: "Prefix sum + hash map is a powerful combo for subarray problems."
      }
    ],
    practiceProblems: ["prob-range-sum-query", "prob-subarray-sum-k", "prob-max-subarray-sum"]
  },

  // Sliding Window Module
  {
    id: "topic-sliding-window-basics",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window Fundamentals",
    intuition:
      "Use two pointers (left, right) to maintain a window. Expand right to include new elements; shrink left when window violates invariant. Avoids recalculating for each position.",
    methodology: `Expand right â Check if valid â Shrink left until valid â Record answer`,
    cppCode: `
unordered_map<char, int> seen;
int left = 0, maxLen = 0;
for (int right = 0; right < s.length(); right++) {
    seen[s[right]]++;
    while (seen[s[right]] > 1) {  // Duplicate found
        seen[s[left]]--;
        left++;
    }
    maxLen = max(maxLen, right - left + 1);
}
`,
    workedExample: `
Longest substring without repeating: "abcabcbb"

[a]bcabcbb â window="a", maxLen=1
[ab]cabcbb â window="ab", maxLen=2
[abc]abcbb â window="abc", maxLen=3
[abc][a]bcbb â 'a' repeats! Move left forward
  ab[c]abcbb â window="ca", continue...
ab[ca]bcbb â window="ca", maxLen=3
abc[ab]cbb â window="ab", then...
abca[bc]bb â window="bc", then...
abcab[cb]b â 'b' repeats! Move left
abcabc[b]b â 'b' repeats! Move left
abcabcb[b] â window="b"

Answer: maxLen = 3 (the substring "abc")
`,
    complexity: {
      time: "O(n)",
      space: "O(min(n, alphabet_size))"
    },
    tips: [
      "State the window invariant clearly before coding (e.g., 'all characters in [left, right] are unique').",
      "Template: while right < n: { add arr[right]; while (invalid): remove arr[left]; update answer; right++ }.",
      "Use hash map or array to track counts inside window."
    ],
    tricks: [
      "For variable-size windows: while loop to shrink. For fixed-size windows: use queue or direct index math.",
      "Two-pointer template: for each right position, find the optimal left position (don't restart from 0).",
      "Save all indices, not just max length, if problem requires actual substring."
    ],
    memoryAids: [
      "Mnemonic: EXPAND-VALIDATE-SHRINK-RECORD.",
      "Trigger cue: 'Longest/shortest substring with constraint' or 'contiguous elements' = sliding window.",
      "Mental model: Imagine you can only move pointers forward; recalculate state incrementally."
    ],
    interviewPatterns: [
      "Longest Substring Without Repeating Characters",
      "Minimum Window Substring (covering all target characters)",
      "Max Consecutive Ones III (at most k flips)"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Google phone screen notes",
        insight:
          "Candidates often restart left=0 each time right moves. Wrong. Update state incrementally and never restart."
      },
      {
        source: "blog",
        attribution: "Medium article on sliding window",
        insight: "Sliding window solves 20%+ of array/string problems. Recognize it first."
      }
    ],
    practiceProblems: [
      "prob-longest-substring-no-repeat",
      "prob-min-window-substring",
      "prob-max-consecutive-ones-iii"
    ]
  },

  // Binary Search Module
  {
    id: "topic-binary-search-basics",
    moduleId: "mod-binary-search-intervals",
    title: "Binary Search & Boundary Conditions",
    intuition:
      "Divide sorted search space in half. Handle boundaries (left, mid, right) carefully to avoid infinite loops and off-by-one errors.",
    methodology: `
**Step 1: Choose Boundary Convention**
- Inclusive: left=0, right=n-1
- Exclusive: left=0, right=n
Pick ONE and be consistent throughout!

**Step 2: Calculate Mid**
- mid = left + (right - left) / 2
- Avoids overflow compared to (left + right) / 2

**Step 3: Compare and Move Pointers**
- If arr[mid] == target: return mid (or move based on finding first/last)
- If arr[mid] < target: left = mid + 1 (or mid for exclusive)
- If arr[mid] > target: right = mid - 1 (or mid for exclusive)

**Step 4: Loop Condition**
- Inclusive: while left <= right
- Exclusive: while left < right

**Step 5: After Loop**
- Return left (insertion position / smallest valid)
`,
    cppCode: `
#include <vector>
using namespace std;

// Find target in sorted array
int binarySearch(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            left = mid + 1;  // Target in right half
        } else {
            right = mid - 1; // Target in left half
        }
    }
    
    return -1; // Not found
}

// Find first occurrence of target
int findFirst(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    int result = -1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            result = mid; // Save result
            right = mid - 1; // Keep searching left
        } else if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    return result;
}

// Binary search on answer: "Can we achieve X?"
int kokoEatingBananas(vector<int>& piles, int h) {
    int left = 1, right = *max_element(piles.begin(), piles.end());
    int answer = right;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        // Check if Koko can finish all piles in h hours at speed mid
        long long hours = 0;
        for (int pile : piles) {
            hours += (pile + mid - 1) / mid; // Ceiling division
        }
        
        if (hours <= h) {
            answer = mid; // Mid works, try slower
            right = mid - 1;
        } else {
            left = mid + 1; // Mid too slow, need faster
        }
    }
    
    return answer;
}
`,
    workedExample: `
**Example 1: Find First Occurrence with [1, 2, 2, 2, 3], target=2**

arr = [1, 2, 2, 2, 3], target = 2

Iteration 1:
- left=0, right=4
- mid = 0 + (4-0)/2 = 2
- arr[2] = 2, equals target
- Save result=2, move right=1 (search left)

Iteration 2:
- left=0, right=1
- mid = 0 + (1-0)/2 = 0
- arr[0] = 1 < target=2
- left = 1 (move right)

Iteration 3:
- left=1, right=1
- mid = 1 + (1-1)/2 = 1
- arr[1] = 2, equals target
- Save result=1, move right=0

Iteration 4:
- left=1, right=0
- left > right, exit loop

Return result = 1 (first occurrence of 2)

**Example 2: Koko Eating Bananas with piles=[3,6,7,11], h=8**

piles = [3, 6, 7, 11], h = 8

Binary search on speed:
- left=1, right=11 (max pile)

mid=6:
- Hours: ceil(3/6) + ceil(6/6) + ceil(7/6) + ceil(11/6)
- Hours: 1 + 1 + 2 + 2 = 6 â¤ 8 â
- answer=6, search slower: right=5

mid=3:
- Hours: ceil(3/3) + ceil(6/3) + ceil(7/3) + ceil(11/3)
- Hours: 1 + 2 + 3 + 4 = 10 > 8 â
- Need faster: left=4

mid=4:
- Hours: ceil(3/4) + ceil(6/4) + ceil(7/4) + ceil(11/4)
- Hours: 1 + 2 + 2 + 3 = 8 â¤ 8 â
- answer=4, search slower: right=3

[left=4, right=3: loop exits]

Return answer = 4
`,
    complexity: {
      time: "O(log n) - halves search space each iteration",
      space: "O(1) - only uses pointers"
    },
    tips: [
      "Template: left=0, right=n-1 (inclusive) vs left=0, right=n (exclusive). Choose one and be consistent.",
      "mid = left + (right - left) / 2 to avoid overflow.",
      "When target found: return mid. When target not found: return left (insertion position)."
    ],
    tricks: [
      "For 'find first occurrence': when arr[mid]==target, move right=mid (don't break). For 'last', move left=mid.",
      "Search on answer: if (canSolve(x)) move towards smaller x, else larger x.",
      "For rotated arrays: identify which half is sorted, then decide which half to search."
    ],
    memoryAids: [
      "Checklist: inclusive/exclusive bounds â mid formula â update rule â post-loop return.",
      "Mnemonic: LEFT-MID-RIGHT-UPDATE.",
      "Draw the search space on paper; mark which values are valid/invalid."
    ],
    interviewPatterns: [
      "Find First/Last Position in Sorted Array",
      "Search in Rotated Sorted Array",
      "Koko Eating Bananas (search on answer)"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Apple interview debrief",
        insight:
          "Most candidates get binary search wrong. Practice boundary conditions on paper before coding. Off-by-one errors cost interviews."
      }
    ],
    practiceProblems: ["prob-first-last-position", "prob-search-rotated-array", "prob-koko-bananas"]
  },

  // Trees Module
  {
    id: "topic-tree-traversals",
    moduleId: "mod-trees-bst",
    title: "Tree Traversals (DFS & BFS)",
    intuition:
      "Visit all nodes in tree using depth-first (preorder, inorder, postorder) or breadth-first (level-order). Choose traversal order based on problem needs.",
    methodology: `
**Depth-First (DFS) - Recursive**

Preorder: Process â Left â Right
- "Process" parent before children
- Use: building tree, copying tree

Inorder: Left â Process â Right
- "Process" in sorted order for BST
- Use: BST validation, sorted traversal

Postorder: Left â Right â Process
- "Process" parent after children
- Use: tree deletion, LCA, calculations from leaves

**Breadth-First (BFS) - Queue-based**
- Process level by level
- Use: next level operations, all nodes at depth k

**Recursive DFS Template**
def dfs(node):
  if not node: return
  [process node]
  dfs(node.left)
  dfs(node.right)

**Iterative DFS Template (Stack)**
stack = [root]
while stack:
  node = stack.pop()
  [process node]
  if node.right: stack.push(node.right)
  if node.left: stack.push(node.left)

**BFS Template (Queue)**
queue = [root]
while queue:
  node = queue.popleft()
  [process node]
  if node.left: queue.push(node.left)
  if node.right: queue.push(node.right)
`,
    cppCode: `
#include <queue>
#include <vector>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

// Inorder Traversal (Recursive)
void inorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    inorder(node->left, result);
    result.push_back(node->val);
    inorder(node->right, result);
}

// Preorder Traversal (Recursive)
void preorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    result.push_back(node->val);
    preorder(node->left, result);
    preorder(node->right, result);
}

// Postorder Traversal (Recursive)
void postorder(TreeNode* node, vector<int>& result) {
    if (!node) return;
    postorder(node->left, result);
    postorder(node->right, result);
    result.push_back(node->val);
}

// Level Order Traversal (BFS)
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (!root) return result;
    
    queue<TreeNode*> q;
    q.push(root);
    
    while (!q.empty()) {
        int levelSize = q.size();
        vector<int> currentLevel;
        
        for (int i = 0; i < levelSize; i++) {
            TreeNode* node = q.front();
            q.pop();
            currentLevel.push_back(node->val);
            
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        
        result.push_back(currentLevel);
    }
    
    return result;
}

// Path Sum (DFS)
bool hasPathSum(TreeNode* node, int targetSum) {
    if (!node) return false;
    
    // Leaf node check
    if (!node->left && !node->right) {
        return targetSum == node->val;
    }
    
    int remaining = targetSum - node->val;
    return hasPathSum(node->left, remaining) || 
           hasPathSum(node->right, remaining);
}
`,
    workedExample: `
**Example 1: Traversals of Tree [1,2,3]**

Tree structure:
      1
     / \\
    2   3

Inorder (Left â Process â Right): 2, 1, 3
- Visit node 1, go left
- Visit node 2 (leaf), process 2
- Back to 1, process 1
- Go right
- Visit node 3 (leaf), process 3

Preorder (Process â Left â Right): 1, 2, 3
- Process 1, go left
- Process 2 (leaf), no children
- Back to 1, go right
- Process 3 (leaf)

Postorder (Left â Right â Process): 2, 3, 1
- Go to node 1, left first
- Process leaf 2
- Back to 1, go right
- Process leaf 3
- Back to 1, process 1

Level Order (BFS):
- Level 0: [1]
- Level 1: [2, 3]
- Result: [[1], [2, 3]]

**Example 2: Path Sum for tree [5,4,8,11,null,13,4,7,2,null,1], targetSum=22**

Tree:
        5
       / \\
      4   8
     /   / \\
    11  13  4
   / \\       \\
  7   2       1

Path: 5 â 4 â 11 â 2 = 22 â

hasPathSum(5, 22):
- targetSum=22, node.val=5, remaining=17
- Go left: hasPathSum(4, 17)
  - targetSum=17, node.val=4, remaining=13
  - Go left: hasPathSum(11, 13)
    - targetSum=13, node.val=11, remaining=2
    - Go left: hasPathSum(7, 2) â 7â 2, false
    - Go right: hasPathSum(2, 2) â 2==2, true! (leaf node)
  - Return true
- Return true

Answer: true (path 5â4â11â2 sums to 22)
`,
    complexity: {
      time: "O(n) - visit each node once",
      space: "O(h) recursive (call stack) or O(w) BFS (queue width)"
    },
    tips: [
      "Inorder of BST gives sorted order. Use inorder for BST validation and comparison.",
      "Preorder for building a tree from preorder + inorder. Postorder for processing children before parent.",
      "BFS for level-order operations; use queue. DFS for subtree operations; use recursion or stack."
    ],
    tricks: [
      "Recursive DFS template: define helper(node) -> returns/updates global state. Don't forget base case.",
      "Iterative DFS with stack: push root, loop while stack not empty, pop and process, push children.",
      "For finding path: pass path list in recursive call. Copy on return if storing multiple paths."
    ],
    memoryAids: [
      "Mnemonic: PRE (print parent, then children), IN (left, parent, right = sorted), POST (children, then parent).",
      "Trigger: 'All paths', 'leaf nodes' = DFS. 'Next level', 'all at level k' = BFS.",
      "Template: def dfs(node): if not node: return; [recursively process]"
    ],
    interviewPatterns: [
      "Binary Tree Path Sum (all paths summing to target)",
      "Lowest Common Ancestor (LCA) in BST/BT",
      "Binary Tree Level Order Traversal (BFS)"
    ],
    references: [
      {
        source: "blog",
        attribution: "GeeksforGeeks tree guide",
        insight:
          "Recursion on trees feels hard at first. Draw the recursion tree on paper for one example before coding."
      }
    ],
    practiceProblems: ["prob-path-sum", "prob-lca", "prob-level-order"]
  },

  // Graphs Module
  {
    id: "topic-graph-bfs-dfs",
    moduleId: "mod-graphs",
    title: "Graph BFS/DFS & Visited State",
    intuition:
      "Explore graph systematically using BFS (queue, level-by-level) or DFS (stack/recursion, depth-first). Track visited nodes to avoid infinite loops.",
    methodology: `
**Step 1: Build Adjacency List**
- For edge (u, v):
  - Undirected: graph[u].push(v), graph[v].push(u)
  - Directed: graph[u].push(v)

**Step 2: Initialize Visited**
- Use Set<int> or vector<bool> to track visited nodes
- Mark visited when PROCESSING, not when ADDING to queue

**Step 3: BFS Template**
queue = [start]
visited = {start}
while queue not empty:
  node = dequeue()
  process(node)
  for each neighbor of node:
    if neighbor not visited:
      visited.add(neighbor)
      queue.push(neighbor)

**Step 4: DFS Template (Recursive)**
visited = {}
dfs(node):
  if node in visited: return
  visited.add(node)
  process(node)
  for each neighbor of node:
    if neighbor not visited:
      dfs(neighbor)

**Critical Point: Mark visited at RIGHT time**
- If marked when dequeuing: O(n+e)
- If marked when adding: avoids duplicates in queue
`,
    cppCode: `
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <vector>
using namespace std;

// Number of Islands (DFS)
int numIslands(vector<vector<char>>& grid) {
    if (grid.empty()) return 0;
    
    int rows = grid.size();
    int cols = grid[0].size();
    int islands = 0;
    vector<vector<bool>> visited(rows, vector<bool>(cols, false));
    
    function<void(int, int)> dfs = [&](int r, int c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || 
            visited[r][c] || grid[r][c] == '0') {
            return;
        }
        
        visited[r][c] = true;
        
        // Explore 4 directions
        dfs(r + 1, c);
        dfs(r - 1, c);
        dfs(r, c + 1);
        dfs(r, c - 1);
    };
    
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == '1' && !visited[i][j]) {
                dfs(i, j);
                islands++;
            }
        }
    }
    
    return islands;
}

// Graph BFS (adjacency list)
vector<int> bfsGraph(unordered_map<int, vector<int>>& graph, int start) {
    vector<int> result;
    unordered_set<int> visited;
    queue<int> q;
    
    q.push(start);
    visited.insert(start);
    
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        result.push_back(node);
        
        for (int neighbor : graph[node]) {
            if (visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                q.push(neighbor);
            }
        }
    }
    
    return result;
}

// Cycle Detection (Undirected Graph)
bool hasCycleDFS(int node, int parent, 
                 unordered_map<int, vector<int>>& graph,
                 unordered_set<int>& visited) {
    visited.insert(node);
    
    for (int neighbor : graph[node]) {
        if (visited.find(neighbor) == visited.end()) {
            if (hasCycleDFS(neighbor, node, graph, visited)) {
                return true;
            }
        } else if (neighbor != parent) {
            // Found a visited node that's not parent = cycle
            return true;
        }
    }
    
    return false;
}
`,
    workedExample: `
**Example 1: Number of Islands with grid:**

grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
]

Iteration 1: Find (0,0) = '1', not visited
- DFS from (0,0)
  - Mark (0,0) visited
  - Go down: (1,0) = '1', mark visited
    - Go down: (2,0) = '0', return
    - Go right: (1,1) = '1', mark visited
      - Go down: (2,1) = '0', return
      - Go right: (1,2) = '0', return
      - Go left: (1,0) already visited, return
  - Go right: (0,1) = '1', mark visited
    - Go down: (1,1) already visited, return
  - islands = 1

Iteration 2: Find (0,2) = '0', skip

Iteration 3: Find (2,2) = '1', not visited
- DFS from (2,2)
  - Mark (2,2) visited
  - No adjacent '1's
  - islands = 2

Iteration 4: Find (3,3) = '1', not visited
- DFS from (3,3)
  - Mark (3,3) visited
  - Go right: (3,4) = '1', mark visited
  - islands = 3

Result: 3 islands

**Example 2: BFS Graph Traversal**

graph = {
  1: [2, 3],
  2: [1, 4],
  3: [1, 5],
  4: [2],
  5: [3]
}

Start: 1

Initial: queue=[1], visited={1}, result=[]

Step 1: Process 1
- result=[1]
- Neighbors: 2, 3
- queue=[2, 3], visited={1, 2, 3}

Step 2: Process 2
- result=[1, 2]
- Neighbors: 1 (visited), 4
- queue=[3, 4], visited={1, 2, 3, 4}

Step 3: Process 3
- result=[1, 2, 3]
- Neighbors: 1 (visited), 5
- queue=[4, 5], visited={1, 2, 3, 4, 5}

Step 4: Process 4
- result=[1, 2, 3, 4]
- Neighbors: 2 (visited)
- queue=[5]

Step 5: Process 5
- result=[1, 2, 3, 4, 5]
- Neighbors: 3 (visited)
- queue=[]

Result: [1, 2, 3, 4, 5]
`,
    complexity: {
      time: "O(V + E) - visit each vertex and edge once",
      space: "O(V) for visited set/queue"
    },
    tips: [
      "Always mark node as visited when dequeuing/visiting, not when adding to queue. Wrong timing causes duplicates/revisits.",
      "For undirected graphs: add edges in both directions. For directed: add only specified direction.",
      "Distinguish: visited vs in-queue. Visited means we've processed it; in-queue means we've enqueued it (to avoid duplicates)."
    ],
    tricks: [
      "Use Set for visited in Python/JavaScript, boolean array if nodes are 0..n-1.",
      "Reconstruct path: store parent of each node during BFS/DFS, then backtrack.",
      "For detecting cycles in undirected graphs: if we reach a visited non-parent node, cycle exists. In directed: use colors (white/gray/black)."
    ],
    memoryAids: [
      "Checklist: adjacency list â visited set â BFS/DFS loop â mark visited at right time.",
      "Mnemonic: BUILD GRAPH -> MARK VISITED -> EXPLORE -> PROCESS.",
      "Red flag: If revisiting nodes or infinite loop, check visited timing."
    ],
    interviewPatterns: [
      "Number of Islands (2D grid connected components)",
      "Course Schedule (topological sort / cycle detection)",
      "Word Ladder (shortest path in graph)"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Meta/Facebook interview notes",
        insight:
          "Most errors: forgetting to mark visited or marking at wrong time. Test on small example. Print visited set."
      }
    ],
    practiceProblems: ["prob-num-islands", "prob-course-schedule", "prob-word-ladder"]
  },

  // DP Module
  {
    id: "topic-dp-state-definition",
    moduleId: "mod-dynamic-programming",
    title: "DP: State Definition & Transitions",
    intuition:
      "Break problem into overlapping subproblems. Define state (what does dp[i] or dp[i][j] represent?), base cases, and transitions. Memoize to avoid recalculation.",
    methodology: `
**Step 1: Define State in PLAIN ENGLISH**
- Not "dp[i]", but "dp[i] = MAX coins robbed from houses 0 to i"
- Write it down explicitly
- Be super specific about what each dimension means

**Step 2: Base Cases**
- What are the simplest inputs?
- For n=0: answer is usually 0, 1, or undefined
- For n=1: often just arr[0] or specific value

**Step 3: Recurrence Relation**
- How does dp[i] depend on previous states?
- List ALL choices/decisions
- dp[i] = max/min(dp[i-1] + choice1, dp[i-2] + choice2, ...)

**Step 4: Direction**
- Top-down (memoization): Start from dp[n], recursively call dp[i-1]
- Bottom-up (tabulation): Fill dp[0], dp[1], ..., dp[n]
- Bottom-up is clearer and avoids stack overflow

**Step 5: Answer Extraction**
- Usually dp[n] or some value in dp array
- Might need to track choices if reconstructing solution

**Step 6: Space Optimization (Optional)**
- If dp[i] only depends on dp[i-1], use 2 variables instead of array
`,
    cppCode: `
#include <vector>
#include <algorithm>
using namespace std;

// Climbing Stairs: dp[i] = ways to reach step i
int climbStairs(int n) {
    if (n <= 2) return n;
    
    vector<int> dp(n + 1);
    dp[0] = 1; // 1 way to stay at ground
    dp[1] = 1; // 1 way to reach step 1
    
    for (int i = 2; i <= n; i++) {
        // Can reach step i from step i-1 (1 step) or i-2 (2 steps)
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    
    return dp[n];
}

// House Robber: dp[i] = max money robbed from houses 0..i
int rob(vector<int>& nums) {
    if (nums.empty()) return 0;
    if (nums.size() == 1) return nums[0];
    
    int n = nums.size();
    vector<int> dp(n);
    dp[0] = nums[0]; // Rob house 0
    dp[1] = max(nums[0], nums[1]); // Rob house 0 or 1 (not both)
    
    for (int i = 2; i < n; i++) {
        // Choice 1: Rob house i + max from 0..i-2
        // Choice 2: Don't rob house i, take max from 0..i-1
        dp[i] = max(nums[i] + dp[i - 2], dp[i - 1]);
    }
    
    return dp[n - 1];
}

// Space-optimized House Robber
int robOptimized(vector<int>& nums) {
    if (nums.empty()) return 0;
    if (nums.size() == 1) return nums[0];
    
    int prev2 = nums[0];
    int prev1 = max(nums[0], nums[1]);
    
    for (int i = 2; i < nums.size(); i++) {
        int current = max(nums[i] + prev2, prev1);
        prev2 = prev1;
        prev1 = current;
    }
    
    return prev1;
}

// Longest Increasing Subsequence: dp[i] = LIS ending at i
int lengthOfLIS(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, 1); // Every element is LIS of length 1
    
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                // Can extend LIS ending at j
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
    }
    
    return *max_element(dp.begin(), dp.end());
}
`,
    workedExample: `
**Example 1: Climbing Stairs with n=5**

State Definition:
- dp[i] = number of ways to reach step i
- Can reach step i from step i-1 (take 1 step) or step i-2 (take 2 steps)
- Recurrence: dp[i] = dp[i-1] + dp[i-2]

Base Cases:
- dp[0] = 1 (1 way to stay at ground)
- dp[1] = 1 (1 way to reach step 1)

Filling table:
- dp[2] = dp[1] + dp[0] = 1 + 1 = 2 (1+1 or 2)
- dp[3] = dp[2] + dp[1] = 2 + 1 = 3 (1+1+1, 1+2, 2+1)
- dp[4] = dp[3] + dp[2] = 3 + 2 = 5
- dp[5] = dp[4] + dp[3] = 5 + 3 = 8

Result: 8 ways to climb 5 stairs

**Example 2: House Robber with nums=[5, 3, 4, 11, 2]**

State Definition:
- dp[i] = maximum money robbed from houses 0..i
- Choice at each house: rob or skip

Base Cases:
- dp[0] = 5 (rob house 0)
- dp[1] = max(5, 3) = 5 (rob house 0, skip house 1)

Filling table:
i=2, nums[2]=4:
- Rob house 2: 4 + dp[0] = 4 + 5 = 9
- Skip house 2: dp[1] = 5
- dp[2] = max(9, 5) = 9

i=3, nums[3]=11:
- Rob house 3: 11 + dp[1] = 11 + 5 = 16
- Skip house 3: dp[2] = 9
- dp[3] = max(16, 9) = 16

i=4, nums[4]=2:
- Rob house 4: 2 + dp[2] = 2 + 9 = 11
- Skip house 4: dp[3] = 16
- dp[4] = max(11, 16) = 16

Result: dp = [5, 5, 9, 16, 16]
Maximum money: 16 (rob houses 0 and 3)

**Example 3: LIS with nums=[10, 9, 2, 5, 3, 7, 101, 18]**

State Definition:
- dp[i] = longest increasing subsequence ENDING at index i

Base: dp = [1, 1, 1, 1, 1, 1, 1, 1]

i=1, nums[1]=9:
- Compare with j=0, nums[0]=10
- 10 is not < 9, skip
- dp[1] = 1

i=2, nums[2]=2:
- Compare with all j < 2
- None are < 2 (10, 9 are both > 2)
- dp[2] = 1

i=3, nums[3]=5:
- j=2: nums[2]=2 < 5, dp[3] = max(1, dp[2]+1) = 2
- dp[3] = 2

i=4, nums[4]=3:
- j=2: nums[2]=2 < 3, dp[4] = max(1, dp[2]+1) = 2
- dp[4] = 2

i=5, nums[5]=7:
- j=2: nums[2]=2 < 7, dp[5] = max(1, dp[2]+1) = 2
- j=3: nums[3]=5 < 7, dp[5] = max(2, dp[3]+1) = 3
- j=4: nums[4]=3 < 7, dp[5] = max(3, dp[4]+1) = 3
- dp[5] = 3

i=6, nums[6]=101:
- j=5: nums[5]=7 < 101, dp[6] = max(1, dp[5]+1) = 4
- Continue... dp[6] = 4

i=7, nums[7]=18:
- j=5: nums[5]=7 < 18, dp[7] = max(1, dp[5]+1) = 4
- j=6: nums[6]=101 is not < 18, skip
- dp[7] = 4

Result: dp = [1, 1, 1, 2, 2, 3, 4, 4]
Max LIS length: 4 (e.g., [2, 3, 7, 101])
`,
    complexity: {
      time: "O(n) to O(n^2) depending on recurrence - O(n) for 1D, O(n^2) for quadratic scan",
      space: "O(n) for DP array, O(1) with space optimization"
    },
    tips: [
      "State definition is 80% of the work. Write it down in plain English: 'dp[i] = maximum sum of subarray ending at i'.",
      "For 2D: 'dp[i][j] = max coins robbed in houses 0..i where house i is/isn't robbed'.",
      "Iterate bottom-up (1D/2D array) once you understand recursion. Clearer and avoids stack overflow."
    ],
    tricks: [
      "Space optimization: if dp[i] depends only on dp[i-1], use two 1D arrays instead of 2D.",
      "Initialize carefully: base cases set to correct values (0, -inf, 1, etc. depending on problem).",
      "Reconstruct solution: store choice (which decision led to optimal) if problem asks for actual sequence."
    ],
    memoryAids: [
      "Checklist: Define state in words â Base cases â Transition formula â Iterate and fill â Extract answer.",
      "Mnemonic: STATE-BASE-TRANSITION-FILL-ANSWER.",
      "Template: dp[i] = max/min( dp[i-1] + choice1, dp[i-2] + choice2, ... )"
    ],
    interviewPatterns: [
      "Climbing Stairs (1D, recurrence)",
      "House Robber (1D with choice constraint)",
      "Longest Increasing Subsequence (1D, quadratic scan)"
    ],
    references: [
      {
        source: "book",
        attribution: "Competitive Programming handbook",
        insight:
          "DP looks scary. Start with small examples (n=3, n=4), compute by hand, write down pattern. Then code."
      },
      {
        source: "interview-experience",
        attribution: "Google/Amazon DP round",
        insight:
          "Interviewers won't let you skip state definition. Explain it clearly or you'll get confused mid-code."
      }
    ],
    practiceProblems: ["prob-climbing-stairs", "prob-house-robber", "prob-lis"]
  }
];
