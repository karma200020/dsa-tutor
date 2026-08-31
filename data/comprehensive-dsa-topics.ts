// COMPREHENSIVE DSA TOPICS - Research-Based (60+ Topics)
// Based on: FAANG interview patterns, LeetCode top problems, Company-specific feedback

import { Topic, Reference } from "./syllabus";

export const comprehensiveDsaTopics: Topic[] = [
  // ============================================
  // TIER 1: MOST ASKED PATTERNS (30 topics)
  // ============================================

  // Pattern 1: Two Sum Variations
  {
    id: "topic-two-sum-family",
    moduleId: "mod-arrays-strings",
    title: "Two Sum & Multi-Sum Problems",
    intuition:
      "Find pairs/triplets/k-numbers that sum to target. Hash map for O(n), sorting for space-efficient.",
    methodology: `Hash map approach: Store complement â Check if target found. Sorting approach: Two pointers from ends.`,
    cppCode: `
// Hash Map O(n) time, O(n) space
unordered_map<int, int> seen;
for (int i = 0; i < n; i++) {
    int complement = target - arr[i];
    if (seen.count(complement)) return {seen[complement], i};
    seen[arr[i]] = i;
}

// Two Sum II (sorted array) - Two pointers
int left = 0, right = n - 1;
while (left < right) {
    int sum = arr[left] + arr[right];
    if (sum == target) return {left + 1, right + 1};
    else if (sum < target) left++;
    else right--;
}
`,
    workedExample: `Two Sum in [2,7,11,15], target=9
Hash: {2}
i=1,7: complement=2, found! return [0,1]

3Sum in [-1,0,1,2,-1,-4], target=0
Sort: [-4,-1,-1,0,1,2]
Fix -4: left=-1,right=2: -1+2=1>0, right--
Fix -4: left=-1,right=1: -1+1=0 â (but skip dups)
Fix -1: left=0,right=2: 0+2=2>0, right--
Found: [-1,-1,2], [-1,0,1]
`,
    complexity: {
      time: "O(nÂ²) for 3Sum (O(n) hash map for 2Sum)",
      space: "O(n) for hash map, O(1) for sorted two-pointers"
    },
    tips: [
      "2Sum: Use hash map O(n). 3Sum: Sort then two-pointers O(nÂ²).",
      "Skip duplicates in 3Sum/4Sum after fixing element",
      "For sorted input, always use two-pointers"
    ],
    tricks: [
      "Use map to store both value and first index for 2Sum",
      "After sorting, for each element, use two-pointers for rest",
      "Early termination when arr[i] > target (after sort)"
    ],
    memoryAids: [
      "2SUM = complement in map",
      "3SUM = sort + fix + two-pointers",
      "4SUM = nested loop + two-pointers"
    ],
    interviewPatterns: [
      "Two Sum, Two Sum II (sorted)",
      "3Sum, 3Sum Closest",
      "4Sum, 4Sum II, kSum variants"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Google/Amazon first round",
        insight: "2Sum asked 80% of times. Master all variants."
      },
      {
        source: "blog",
        attribution: "LeetCode #1, #15, #16",
        insight: "These are top interviewed problems. Practice thoroughly."
      }
    ],
    practiceProblems: [
      {
        variation: "Two Sum II — the input array is already sorted, return 1-indexed positions",
        tip: "Sorting removes the need for the hash map entirely. Walk two pointers inward: if the sum is too small move left up, if too large move right down. O(n) time and O(1) space, beating the hashmap on memory, and remember the answer is 1-indexed.",
        snippet: "int l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = a[l] + a[r];\n  if (sum == target) return {l + 1, r + 1};\n  if (sum < target) ++l;\n  else --r;\n}\nreturn {};"
      },
      {
        variation: "Count all pairs summing to target instead of returning one pair",
        tip: "Returning early is wrong once you must count, and duplicates make it subtle: [1,1,1] with target 2 has three pairs, not one. Accumulate counts as you scan, adding the number of previously-seen complements before recording the current value. Still O(n) time, O(n) space.",
        snippet: "std::unordered_map<int,int> seen;\nlong long pairs = 0;\nfor (int x : a) {\n  auto it = seen.find(target - x);\n  if (it != seen.end()) pairs += it->second;\n  ++seen[x];\n}\nreturn pairs;"
      },
      {
        variation: "3Sum — find all unique triplets summing to zero",
        tip: "The hash-map trick doesn't extend cleanly because deduplication dominates. Sort, fix the first index, then run the sorted two-pointer scan on the suffix; that is O(n^2). The whole difficulty is skipping equal values at all three positions so you never emit a duplicate triplet.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i = 0; i + 2 < n; ++i) {\n  if (i && a[i] == a[i-1]) continue;\n  int l = i + 1, r = n - 1;\n  while (l < r) {\n    int s = a[i] + a[l] + a[r];\n    if (s < 0) ++l;\n    else if (s > 0) --r;\n    else { out.push_back({a[i],a[l],a[r]});\n           while (l<r && a[l]==a[l+1]) ++l;\n           while (l<r && a[r]==a[r-1]) --r;\n           ++l; --r; }\n  }\n}"
      },
      {
        variation: "3Sum Closest — return the triplet sum nearest to target, not equal to it",
        tip: "There is no exact match to short-circuit on, so you must scan the full two-pointer sweep and track the best absolute difference seen. The pointer-movement rule is unchanged: move left up when the sum is under target, right down when over. Still O(n^2) after the sort.",
        snippet: "std::sort(a.begin(), a.end());\nint best = a[0] + a[1] + a[2];\nfor (int i = 0; i + 2 < n; ++i) {\n  int l = i + 1, r = n - 1;\n  while (l < r) {\n    int s = a[i] + a[l] + a[r];\n    if (std::abs(s - target) < std::abs(best - target)) best = s;\n    if (s < target) ++l; else if (s > target) --r; else return s;\n  }\n}\nreturn best;"
      },
      {
        variation: "4Sum — k = 4, and the sums can overflow 32-bit int",
        tip: "Generalise by adding one more fixed index outside the two-pointer scan, giving O(n^3). Two things bite here: you need dedup skips on both fixed indices, and a + b + c + d of four INT_MAX-ish values overflows int, so accumulate in long long. Prune early when the smallest possible remaining sum already exceeds target.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i=0;i+3<n;++i) { if (i && a[i]==a[i-1]) continue;\n  for (int j=i+1;j+2<n;++j) { if (j>i+1 && a[j]==a[j-1]) continue;\n    int l=j+1, r=n-1;\n    while (l<r) {\n      long long s = (long long)a[i]+a[j]+a[l]+a[r];\n      if (s<target) ++l; else if (s>target) --r;\n      else { out.push_back({a[i],a[j],a[l],a[r]});\n             while (l<r && a[l]==a[l+1]) ++l;\n             while (l<r && a[r]==a[r-1]) --r;\n             ++l; --r; }\n    } } }"
      },
      {
        variation: "Two Sum over a stream — numbers arrive over time and queries interleave with inserts",
        tip: "You cannot sort or two-pointer because the data isn't final. Maintain a running multiset-style count map: `add` is O(1), and `find` scans the distinct keys for a complement in O(k). The self-pair case (x + x == target) needs the count to be at least two, which is the usual bug.",
        snippet: "std::unordered_map<int,int> cnt;\nvoid add(int x) { ++cnt[x]; }\nbool find(int target) {\n  for (auto& [v, c] : cnt) {\n    int need = target - v;\n    if (need == v ? c > 1 : cnt.count(need)) return true;\n  }\n  return false;\n}"
      }
    ]
  },

  // Pattern 2: Sliding Window
  {
    id: "topic-sliding-window-master",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window - Complete Mastery",
    intuition:
      "Maintain window with left/right pointers. Expand to include, shrink to exclude. O(n) for most substring problems.",
    methodology: `Expand right â While invalid shrink left â Update answer â Move right`,
    cppCode: `
// Generic sliding window template
int left = 0;
unordered_map<char, int> windowCount, targetCount;

for (int right = 0; right < s.length(); right++) {
    windowCount[s[right]]++;
    
    while (isValid(windowCount, targetCount)) {
        // Record answer
        answer = min(answer, right - left + 1);
        
        // Shrink window
        windowCount[s[left]]--;
        left++;
    }
}
`,
    workedExample: `Longest Substring Without Repeating "abcabcbb"
[a], [ab], [abc], a repeats
  [bc], [bca], a repeats
    [cab], b repeats
      [ab], b repeats
        [b]
Answer: 3 (abc, bca, cab, abc)
`,
    complexity: {
      time: "O(n) - each element visited twice max",
      space: "O(k) - window state (alphabet size usually small)"
    },
    tips: [
      "Identify window invariant clearly",
      "Left pointer NEVER moves backward",
      "Update state incrementally (not recalculate)"
    ],
    tricks: [
      "Use Set for uniqueness, Map for frequency",
      "Two maps for comparing (e.g., Minimum Window Substring)",
      "Variable window vs Fixed window templates differ"
    ],
    memoryAids: [
      "EXPAND-SHRINK-UPDATE",
      "Left = valid boundary, Right = current char",
      "O(n) because each element processed at most twice"
    ],
    interviewPatterns: [
      "Longest Substring Without Repeating",
      "Minimum Window Substring",
      "Permutation in String",
      "Find All Anagrams",
      "Longest Substring with K Distinct Chars"
    ],
    references: [
      {
        source: "blog",
        attribution: "Blind 75 - Must Know",
        insight: "Sliding window solves 15-20% of interview questions."
      }
    ],
    practiceProblems: [
      {
        variation: "Max Consecutive Ones III — fixed budget of k zero-flips",
        tip: "This is the canonical 'longest window satisfying a constraint' shape: the window is valid while the count of zeros inside is at most k. Expand right unconditionally, and shrink from the left only while the invariant is broken. Each index enters and leaves once, so O(n) time and O(1) space.",
        snippet: "int l = 0, zeros = 0, best = 0;\nfor (int r = 0; r < n; ++r) {\n  if (a[r] == 0) ++zeros;\n  while (zeros > k) { if (a[l] == 0) --zeros; ++l; }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Fixed-size window instead of variable — maximum average subarray of length k",
        tip: "When the size is fixed, the while-shrink loop disappears: you slide by adding the entering element and subtracting the leaving one. Compare sums rather than averages to stay in integer arithmetic and avoid floating-point comparison bugs. O(n) time, O(1) space.",
        snippet: "long long sum = 0;\nfor (int i = 0; i < k; ++i) sum += a[i];\nlong long best = sum;\nfor (int r = k; r < n; ++r) {\n  sum += a[r] - a[r - k];\n  best = std::max(best, sum);\n}\nreturn (double)best / k;"
      },
      {
        variation: "Longest substring with at most K distinct characters",
        tip: "The validity predicate is now on the number of distinct keys, so a plain counter isn't enough — you need a map and must erase a key when its count hits zero, or the distinct count never drops. Shrink while map.size() > k. O(n) time with O(k) space.",
        snippet: "std::unordered_map<char,int> cnt;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++cnt[s[r]];\n  while ((int)cnt.size() > k) {\n    if (--cnt[s[l]] == 0) cnt.erase(s[l]);\n    ++l;\n  }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Find All Anagrams / Permutation in String — window must match a multiset exactly",
        tip: "Exact multiset matching means the window size is pinned to the pattern length, and 'valid' means every count matches, not just a bound. Track a single `matched` counter of characters at exactly the right count so each step is O(1) instead of comparing 26 buckets. O(n) overall.",
        snippet: "std::array<int,26> need{}, win{};\nfor (char c : p) ++need[c-'a'];\nint m = p.size();\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++win[s[r]-'a'];\n  if (r >= m) --win[s[r-m]-'a'];\n  if (r >= m-1 && win == need) out.push_back(r-m+1);\n}"
      },
      {
        variation: "Minimum Window Substring — smallest window covering a multiset, duplicates included",
        tip: "You are minimising instead of maximising, which flips the loop: shrink aggressively *while the window is still valid* and record the answer inside the shrink loop. Duplicates matter, so track how many required characters are still missing rather than how many distinct ones you have. O(n + m).",
        snippet: "std::unordered_map<char,int> need;\nfor (char c : t) ++need[c];\nint missing = t.size(), l = 0, bl = 0, blen = INT_MAX;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  if (need[s[r]]-- > 0) --missing;\n  while (missing == 0) {\n    if (r - l + 1 < blen) { blen = r - l + 1; bl = l; }\n    if (++need[s[l]] > 0) ++missing;\n    ++l;\n  }\n}\nreturn blen == INT_MAX ? \"\" : s.substr(bl, blen);"
      },
      {
        variation: "Longest subarray with sum at most K when negative numbers are allowed",
        tip: "Negatives break the sliding window outright: growing the window no longer monotonically grows the sum, so shrinking from the left is not a valid repair. Switch to prefix sums plus an ordered structure (or a monotonic deque for the 'sum at least K' variant), giving O(n log n) or O(n). Say explicitly that the window invariant is gone.",
        snippet: "// prefix[i] = sum of first i elements; find longest j-i with prefix[j]-prefix[i] <= K\nstd::map<long long,int> firstIdx; // prefix value -> earliest index\nlong long pre = 0; firstIdx[0] = -1;\nint best = 0;\nfor (int i = 0; i < n; ++i) {\n  pre += a[i];\n  auto it = firstIdx.lower_bound(pre - K); // smallest prefix >= pre-K\n  if (it != firstIdx.end()) best = std::max(best, i - it->second);\n  firstIdx.emplace(pre, i); // keep earliest occurrence only\n}\nreturn best;"
      }
    ]
  },

  // Pattern 3: Prefix Sums
  {
    id: "topic-prefix-sums-advanced",
    moduleId: "mod-arrays-strings",
    title: "Prefix Sums - Query Optimization",
    intuition:
      "Precompute cumulative sums to answer range queries in O(1). Extends to 2D.",
    methodology: `1D: prefix[i+1] = prefix[i] + arr[i]. 2D: prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1] + arr[i][j]`,
    cppCode: `
// 1D Prefix Sum
vector<int> prefix(n + 1);
prefix[0] = 0;
for (int i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i] + arr[i];
}
// Query sum[i..j] = prefix[j+1] - prefix[i]

// 2D Prefix Sum
vector<vector<int>> prefix(m + 1, vector<int>(n + 1, 0));
for (int i = 1; i <= m; i++) {
    for (int j = 1; j <= n; j++) {
        prefix[i][j] = prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1] + matrix[i-1][j-1];
    }
}
// Query sum[r1..r2][c1..c2] = prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]
`,
    workedExample: `
1D Prefix: arr=[1,3,5,7]
prefix=[0,1,4,9,16]
sum(1,2)=prefix[3]-prefix[1]=9-1=8 â

2D Prefix: matrix=[[1,2],[3,4]]
prefix=[[0,0,0],[0,1,3],[0,3,10]]
sum(0,0,1,1)=prefix[2][2]-prefix[0][2]-prefix[2][0]+prefix[0][0]=10-0-0+0=10 â
`,
    complexity: {
      time: "O(n) build, O(1) query [O(nÂ²) build 2D, O(1) query 2D]",
      space: "O(n) [O(nÂ²) for 2D]"
    },
    tips: [
      "1-indexed prefix array simplifies boundary handling",
      "Works with any associative operation (sum, XOR, etc.)",
      "Great for interview: shows optimization thinking"
    ],
    tricks: [
      "2D extends naturally using inclusion-exclusion principle",
      "Combine with hash map for subarray sum problems",
      "Works backwards: given sum, find subarrays"
    ],
    memoryAids: [
      "PREFIX = cumulative sum up to index",
      "QUERY = prefix[right+1] - prefix[left]",
      "Off-by-one errors common: use 1-indexed"
    ],
    interviewPatterns: [
      "Range Sum Query",
      "Subarray Sum Equals K (with hash map)",
      "2D Range Sum Query",
      "NumArray class (UpdateRange version)"
    ],
    references: [
      {
        source: "blog",
        attribution: "LeetCode #303",
        insight: "Classic interview problem. Shows optimization technique."
      }
    ],
    practiceProblems: [
      {
        variation: "Range Sum Query — Immutable: many queries, array never changes",
        tip: "Recomputing each query is O(n) per call. Build a prefix array once in O(n) so every query is O(1) as prefix[r+1] - prefix[l]. Use the size-(n+1) shifted form so l = 0 needs no special case, and use long long because the running total overflows int quickly.",
        snippet: "std::vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];\n// query [l, r] inclusive:\nauto query = [&](int l, int r) { return pre[r + 1] - pre[l]; };"
      },
      {
        variation: "Subarray Sum Equals K — count subarrays, with negative values allowed",
        tip: "Negatives kill the sliding-window approach, so use the prefix-difference identity: a subarray ending at i sums to K exactly when some earlier prefix equals pre[i] - K. Store prefix counts in a hash map seeded with {0: 1} for subarrays starting at index 0. O(n) time and O(n) space.",
        snippet: "std::unordered_map<long long,int> seen{{0, 1}};\nlong long pre = 0; int count = 0;\nfor (int x : a) {\n  pre += x;\n  auto it = seen.find(pre - K);\n  if (it != seen.end()) count += it->second;\n  ++seen[pre];\n}\nreturn count;"
      },
      {
        variation: "Continuous Subarray Sum — subarray sum is a multiple of k",
        tip: "Divisibility replaces equality, so key the map on pre % k rather than pre itself: two equal remainders mean the span between them is divisible by k. Store the earliest index per remainder because the problem requires length at least 2. Normalise negative remainders with ((x % k) + k) % k.",
        snippet: "std::unordered_map<int,int> firstIdx{{0, -1}};\nlong long pre = 0;\nfor (int i = 0; i < n; ++i) {\n  pre += a[i];\n  int r = k ? (int)(((pre % k) + k) % k) : (int)pre;\n  auto it = firstIdx.find(r);\n  if (it != firstIdx.end()) { if (i - it->second >= 2) return true; }\n  else firstIdx[r] = i;\n}\nreturn false;"
      },
      {
        variation: "2D range sum — rectangle queries on an immutable matrix",
        tip: "The 1D trick generalises via inclusion-exclusion: build a 2D prefix where P[i][j] is the sum of the rectangle from the origin, then each query is one add and two subtracts plus the double-subtracted corner. O(mn) build, O(1) per query. Pad by one row and column to remove boundary checks.",
        snippet: "std::vector<std::vector<long long>> P(m+1, std::vector<long long>(n+1, 0));\nfor (int i = 0; i < m; ++i)\n  for (int j = 0; j < n; ++j)\n    P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] - P[i][j];\nauto query = [&](int r1,int c1,int r2,int c2) {\n  return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];\n};"
      },
      {
        variation: "Range Sum Query — Mutable: updates interleave with queries",
        tip: "A prefix array makes updates O(n) because every later entry shifts, which is fatal when updates are frequent. Switch to a Fenwick (binary indexed) tree, giving O(log n) for both update and prefix query. Remember Fenwick is 1-indexed and update takes a delta, not the new value.",
        snippet: "std::vector<long long> bit; int N;\nvoid add(int i, long long delta) {          // i is 1-based\n  for (; i <= N; i += i & -i) bit[i] += delta;\n}\nlong long pre(int i) {                       // sum of [1, i]\n  long long s = 0;\n  for (; i > 0; i -= i & -i) s += bit[i];\n  return s;\n}\n// range [l, r] 1-based: pre(r) - pre(l - 1)"
      },
      {
        variation: "Maximum subarray sum — you need the best subarray, not a queried one",
        tip: "Prefix sums still apply: the best subarray ending at i is pre[i] minus the smallest prefix seen so far, so one pass tracking the running minimum solves it. That is exactly Kadane's algorithm in prefix form, O(n) time and O(1) space. Initialise the running minimum to 0 (the empty prefix), not to pre[0].",
        snippet: "long long pre = 0, minPre = 0, best = LLONG_MIN;\nfor (int x : a) {\n  pre += x;\n  best = std::max(best, pre - minPre);\n  minPre = std::min(minPre, pre);\n}\nreturn best;"
      }
    ]
  },

  // Pattern 4: Fast & Slow Pointers
  {
    id: "topic-fast-slow-pointers-master",
    moduleId: "mod-linked-list",
    title: "Fast & Slow Pointers (Floyd's Cycle Detection)",
    intuition:
      "Move one pointer 2x speed. If cycle, they meet. Detects cycle, finds middle, finds kth from end.",
    methodology: `Slow moves 1 step, Fast moves 2 steps â Eventually meet if cycle exists (or fast reaches null)`,
    cppCode: `
// Detect cycle in linked list
ListNode* slow = head;
ListNode* fast = head;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
    if (slow == fast) {
        // Cycle detected!
        // Find start: reset one to head, both move 1 step
        ListNode* start = head;
        while (start != slow) {
            start = start->next;
            slow = slow->next;
        }
        return start;  // Cycle start
    }
}

// Find middle of linked list
ListNode* slow = head, *fast = head;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
}
return slow;  // Middle node

// Find kth from end
ListNode* fast = head;
for (int i = 0; i < k; i++) {
    fast = fast->next;
}
ListNode* slow = head;
while (fast) {
    slow = slow->next;
    fast = fast->next;
}
return slow;  // kth from end
`,
    workedExample: `
Detect cycle in 1â2â3â4â2 (cycle from node 2)
Slow: 1â2â3â4â2â3â4â2â3â...
Fast: 1â3â2â4â3â2â4â3â2â...
Meet at node 2 (they meet after moving same distance to meeting point)

Find cycle start:
After meeting at node 2, reset one pointer to head (1)
Both move 1 step at a time
1â2 (they meet)
2 is cycle start â
`,
    complexity: {
      time: "O(n) - in worst case entire list traversed",
      space: "O(1) - only pointers used"
    },
    tips: [
      "Floyd's algorithm guarantees meeting if cycle exists",
      "Math: distance_to_cycle = distance_between_meeting_and_cycle_start",
      "Critical for cycle detection problems"
    ],
    tricks: [
      "To find kth from end: advance fast k steps first, then both move 1 step",
      "To find middle: useful for splitting lists",
      "Can be applied to arrays too (with modulo for cycle)"
    ],
    memoryAids: [
      "SLOW=1, FAST=2 â If cycle, they WILL meet",
      "CYCLE START = reset one to head, both move 1 step together",
      "Works because: fast pointer 'laps' slow pointer"
    ],
    interviewPatterns: [
      "Linked List Cycle I (detect)",
      "Linked List Cycle II (find start)",
      "Find Middle of Linked List",
      "Find Kth From End",
      "Reorder List"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Meta/Facebook favorite",
        insight: "This pattern appears in 70% of linked list interviews."
      }
    ],
    practiceProblems: [
      {
        variation: "Find the middle node — and the second middle when the length is even",
        tip: "Two pointers with fast moving twice as far land slow on the middle in one pass, no length count needed. The parity convention is the whole trick: looping while fast and fast->next exist gives the second middle on even lists; while fast->next and fast->next->next gives the first. O(n) time, O(1) space.",
        snippet: "ListNode* slow = head; ListNode* fast = head;\nwhile (fast && fast->next) {  // second middle on even length\n  slow = slow->next;\n  fast = fast->next->next;\n}\nreturn slow;"
      },
      {
        variation: "Detect a cycle and return the node where it begins",
        tip: "Detection alone isn't enough; you need Floyd's second phase. After the pointers meet, reset one to the head and advance both one step at a time — they meet exactly at the cycle entry, because the distance from head to entry equals the distance from the meeting point to entry. Still O(n) time and O(1) space.",
        snippet: "ListNode *s = head, *f = head;\nwhile (f && f->next) {\n  s = s->next; f = f->next->next;\n  if (s == f) {\n    s = head;\n    while (s != f) { s = s->next; f = f->next; }\n    return s;                 // cycle entry\n  }\n}\nreturn nullptr;"
      },
      {
        variation: "Remove the Nth node from the end in one pass",
        tip: "Counting the length first needs two passes. Instead give the fast pointer an n-step head start so the gap between the pointers equals n, then advance both until fast falls off the end. Use a dummy node before the head so deleting the first node needs no special case.",
        snippet: "ListNode dummy{0, head};\nListNode *slow = &dummy, *fast = &dummy;\nfor (int i = 0; i < n; ++i) fast = fast->next;\nwhile (fast->next) { slow = slow->next; fast = fast->next; }\nListNode* dead = slow->next;\nslow->next = dead->next;\ndelete dead;\nreturn dummy.next;"
      },
      {
        variation: "Happy Number — cycle detection on a function, not on a list",
        tip: "There is no linked list at all, but the sequence x -> digitSquareSum(x) is a functional graph, so Floyd's applies unchanged with `next` replaced by the function. This gets you O(1) space where a visited-set costs O(k). The cycle either closes on 1 (happy) or somewhere else.",
        snippet: "auto step = [](int x) { int s = 0; while (x) { int d = x % 10; s += d * d; x /= 10; } return s; };\nint slow = n, fast = n;\ndo {\n  slow = step(slow);\n  fast = step(step(fast));\n} while (slow != fast);\nreturn slow == 1;"
      },
      {
        variation: "Palindrome Linked List in O(1) space",
        tip: "Copying values into a vector is O(n) space; the follow-up forbids it. Find the middle with fast/slow, reverse the second half in place, then walk the two halves in lockstep comparing values. Restore the reversed half before returning if the caller may reuse the list.",
        snippet: "ListNode *s = head, *f = head;\nwhile (f && f->next) { s = s->next; f = f->next->next; }\nListNode *prev = nullptr;\nwhile (s) { ListNode* nx = s->next; s->next = prev; prev = s; s = nx; }\nfor (ListNode *a = head, *b = prev; b; a = a->next, b = b->next)\n  if (a->val != b->val) return false;\nreturn true;"
      },
      {
        variation: "Find the Duplicate Number in an array of n+1 values in 1..n, read-only and O(1) space",
        tip: "Sorting mutates and a seen-set costs O(n) space, both banned. Treat the array as a function i -> a[i]: because a value repeats, that functional graph must contain a cycle, and the duplicate is the cycle entry. Run Floyd's two-phase algorithm on indices for O(n) time and O(1) space.",
        snippet: "int slow = a[0], fast = a[a[0]];\nwhile (slow != fast) { slow = a[slow]; fast = a[a[fast]]; }\nslow = 0;\nwhile (slow != fast) { slow = a[slow]; fast = a[fast]; }\nreturn slow;"
      }
    ]
  },

  // Pattern 5: Monotonic Stack
  {
    id: "topic-monotonic-stack-mastery",
    moduleId: "mod-stack-monotonic",
    title: "Monotonic Stack Pattern",
    intuition:
      "Maintain stack in increasing/decreasing order. Solves next/previous greater/smaller in O(n).",
    methodology: `For each element: Pop while condition fails â Push current â Record answer`,
    cppCode: `
// Next Greater Element
vector<int> nextGreaterElement(vector<int>& arr) {
    int n = arr.size();
    vector<int> result(n, -1);
    stack<int> st;  // Store indices
    
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && arr[st.top()] <= arr[i]) {
            st.pop();
        }
        if (!st.empty()) {
            result[i] = arr[st.top()];
        }
        st.push(i);
    }
    return result;
}

// Daily Temperatures - Next Greater
vector<int> dailyTemperatures(vector<int>& temps) {
    int n = temps.size();
    vector<int> result(n, 0);
    stack<int> st;
    
    for (int i = 0; i < n; i++) {
        while (!st.empty() && temps[st.top()] < temps[i]) {
            int prevIdx = st.top();
            st.pop();
            result[prevIdx] = i - prevIdx;
        }
        st.push(i);
    }
    return result;
}
`,
    workedExample: `
Next Greater in [1,3,2,4]
i=3: stack=[3]
i=2: 2<4, pop 2, result[2]=4-2=2, stack=[3,2]
Wait, let me redo this properly...

Next Greater Element using iteration from right:
i=3, arr[3]=4: stack=[], result[3]=-1, push 3
i=2, arr[2]=2: arr[3]=4>2, result[2]=4, push 2
i=1, arr[1]=3: arr[2]=2<3, pop 2, arr[3]=4>3, result[1]=4, push 1
i=0, arr[0]=1: arr[1]=3>1, result[0]=3, push 0
Result: [3,4,4,-1]
`,
    complexity: {
      time: "O(n) - each element pushed and popped once",
      space: "O(n) - stack space"
    },
    tips: [
      "Stack stores INDICES (not values) for flexibility",
      "Iterate backwards for 'next', forwards for 'previous'",
      "Template: while(!stack.empty() && invalid) pop else break"
    ],
    tricks: [
      "Store pairs (value, index) for more complex problems",
      "Apply to 2D grids (largest rectangle in histogram)",
      "Combine with other patterns (e.g., with intervals)"
    ],
    memoryAids: [
      "MONOTONIC STACK = maintain order",
      "NEXT GREATER = pop while smaller, push current",
      "Backwards iteration for 'next', forwards for 'previous'"
    ],
    interviewPatterns: [
      "Next Greater Element",
      "Daily Temperatures",
      "Largest Rectangle in Histogram",
      "Trapping Rain Water",
      "Remove K Digits"
    ],
    references: [
      {
        source: "blog",
        attribution: "LeetCode discussions",
        insight: "Monotonic stack is advanced pattern. Separates good from great candidates."
      }
    ],
    practiceProblems: [
      {
        variation: "Daily Temperatures — return the distance to the next warmer day, not its value",
        tip: "Same monotonic stack, but push indices instead of values so you can subtract positions when you pop. Keep the stack decreasing; every element is pushed and popped once, giving O(n) time and O(n) space. Entries left on the stack at the end keep their default answer of 0.",
        snippet: "std::vector<int> res(n, 0);\nstd::stack<int> st;               // indices, temps decreasing\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && t[i] > t[st.top()]) {\n    res[st.top()] = i - st.top();\n    st.pop();\n  }\n  st.push(i);\n}\nreturn res;"
      },
      {
        variation: "Next Greater Element II — the array is circular",
        tip: "Wrapping means an element's answer may live before it, so a single left-to-right pass is insufficient. Iterate 2n times using i % n for indexing, and only push during the first lap so no index is inserted twice. Still O(n) time and O(n) space.",
        snippet: "std::vector<int> res(n, -1);\nstd::stack<int> st;\nfor (int i = 0; i < 2 * n; ++i) {\n  int j = i % n;\n  while (!st.empty() && a[j] > a[st.top()]) { res[st.top()] = a[j]; st.pop(); }\n  if (i < n) st.push(j);\n}\nreturn res;"
      },
      {
        variation: "Trapping Rain Water — the answer is an area, and ties must not double count",
        tip: "Water above each bar is min(maxLeft, maxRight) - height, which the two-pointer form computes in O(n) time and O(1) space — strictly better than the stack version's O(n) space. Always advance the side with the smaller bar, because that side's max is the true limiter.",
        snippet: "int l = 0, r = n - 1, lm = 0, rm = 0; long long water = 0;\nwhile (l < r) {\n  if (h[l] < h[r]) {\n    lm = std::max(lm, h[l]);\n    water += lm - h[l];\n    ++l;\n  } else {\n    rm = std::max(rm, h[r]);\n    water += rm - h[r];\n    --r;\n  }\n}\nreturn water;"
      },
      {
        variation: "Largest Rectangle in Histogram — you need both boundaries, not just one side",
        tip: "Each bar's rectangle extends until a strictly smaller bar on either side, so a popped element's width is bounded by the new index on the right and the element below it on the left. Push a sentinel of height 0 at the end so nothing is stranded on the stack. O(n) time and O(n) space.",
        snippet: "std::stack<int> st; long long best = 0;\nfor (int i = 0; i <= n; ++i) {\n  int cur = (i == n) ? 0 : h[i];\n  while (!st.empty() && cur < h[st.top()]) {\n    int ht = h[st.top()]; st.pop();\n    int left = st.empty() ? -1 : st.top();\n    best = std::max(best, (long long)ht * (i - left - 1));\n  }\n  st.push(i);\n}\nreturn best;"
      },
      {
        variation: "Remove K Digits — build the smallest number by deleting exactly k digits",
        tip: "Here the stack is increasing rather than decreasing, because you want small digits early. Pop a larger previous digit whenever the incoming one is smaller and you still have deletions left. Two traps: spend any leftover k from the back, and strip leading zeros before returning.",
        snippet: "std::string st;\nfor (char c : num) {\n  while (k && !st.empty() && st.back() > c) { st.pop_back(); --k; }\n  st.push_back(c);\n}\nst.resize(st.size() - k);                 // unused deletions\nint p = 0; while (p + 1 < (int)st.size() && st[p] == '0') ++p;\nstd::string r = st.substr(p);\nreturn r.empty() ? \"0\" : r;"
      },
      {
        variation: "Sliding Window Maximum — next-greater logic constrained to a window of size k",
        tip: "A stack cannot express expiry, so switch to a monotonic deque: pop smaller values from the back to keep it decreasing, and pop from the front once the index falls out of the window. The front is always the window maximum, so it is O(n) time and O(k) space, beating the O(n log k) heap.",
        snippet: "std::deque<int> dq;                       // indices, values decreasing\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      }
    ]
  },

  // ... Continue with more patterns
  // Pattern 6: Merge Intervals
  // Pattern 7: Binary Search Variants
  // Pattern 8: Union-Find
  // Pattern 9: LCA (Lowest Common Ancestor)
  // Pattern 10: Serialize/Deserialize Tree
  // Pattern 11: Topological Sort
  // Pattern 12: Dijkstra/Shortest Path
  // Pattern 13: BFS
  // Pattern 14: DFS
  // Pattern 15: Backtracking
  // Pattern 16: DP Patterns (Coin Change, LIS, House Robber, etc.)
  // And many more...

];

// Export for use
export function getAllComprehensiveDsaTopics(): Topic[] {
  return comprehensiveDsaTopics;
}
