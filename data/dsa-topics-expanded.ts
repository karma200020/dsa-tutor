import { Topic, Reference } from "./syllabus";

// COMPREHENSIVE DSA TOPICS WITH FULL LESSON CONTENT
// This file demonstrates the new lesson structure with detailed teaching material

export const expandedDsaTopics: Topic[] = [
  // ===== ARRAYS & STRINGS & HASHING =====
  {
    id: "topic-arrays-frequency-maps",
    moduleId: "mod-arrays-strings",
    title: "Frequency Maps & Counting Patterns",
    intuition:
      "Count element occurrences to solve grouping, anagram, and majority problems. Core pattern: build frequency map → answer queries.",
    lesson: [
      {
        title: "Understanding Frequency Maps",
        content: "A frequency map (HashMap) stores count of each element. Instead of comparing arrays element-by-element (O(n²)), we count once (O(n)) then answer queries in O(1). This is a fundamental optimization technique.",
        codeExample: `unordered_map<char, int> freq;
for (char c : s) {
  freq[c]++;  // Increment count for this character
}
// Now freq['a']=3, freq['b']=2, etc.`
      },
      {
        title: "Common Pattern: Count & Validate",
        content: "Build frequency map in one pass. Then validate against a target or compare two maps for equality.",
        codeExample: `// Pattern for Valid Anagram
unordered_map<char, int> freq;
for (char c : s) freq[c]++;

for (char c : t) {
  if (freq[c] == 0) return false;
  freq[c]--;
}
return true;  // All chars consumed exactly`
      },
      {
        title: "Optimization: Fixed Alphabet",
        content: "For problems with small fixed alphabet (e.g., 26 lowercase letters), use array instead of HashMap for 10-100x speed improvement."
      }
    ],
    examples: [
      {
        title: "Example 1: Valid Anagram Check",
        input: "s = \"listen\", t = \"silent\"",
        output: "true",
        explanation: `Step 1: Count 's = listen'
  l→1, i→1, s→1, t→1, e→1, n→1

Step 2: Iterate through 't = silent' and decrement
  Process 's': freq['s'] becomes 0
  Process 'i': freq['i'] becomes 0
  Process 'l': freq['l'] becomes 0
  Process 'e': freq['e'] becomes 0
  Process 'n': freq['n'] becomes 0
  Process 't': freq['t'] becomes 0

Step 3: All characters used exactly once
  All counts reached 0 → Return true (valid anagram!)`
      },
      {
        title: "Example 2: Majority Element",
        input: "nums = [3, 2, 3], n = 3",
        output: "3",
        explanation: `Step 1: Count all elements
  3 appears 2 times
  2 appears 1 time

Step 2: Find element with count > n/2
  Need count > 3/2 = 1.5
  3 appears 2 times (satisfies 2 > 1.5)
  Return 3 as majority element`
      }
    ],
    complexity: { time: "O(n)", space: "O(k) where k = unique elements" },
    tips: [
      "For small fixed alphabet (26 lowercase letters), use array[26] instead of HashMap for 10-100x speed",
      "Two-pass technique: build map first, then answer queries",
      "Edge cases: empty input, single element, all same elements"
    ],
    tricks: [
      "Memory optimization: For just checking if two strings are permutations, sort both strings and compare (uses O(1) space if sorting in-place)",
      "If both strings guaranteed lowercase letters, use array of size 26 instead of HashMap",
      "Early exit: If string lengths differ, can't be anagrams - return false immediately"
    ],
    memoryAids: [
      "Trigger keywords: 'Find', 'Count', 'Group', 'Majority', 'Valid' → often need frequency map",
      "Core pattern: Count (O(n)) → Query (O(k))",
      "Checklist before coding: Handle duplicates? Case sensitive? What to return?"
    ],
    interviewPatterns: [
      "Valid Anagram - exact character frequency match",
      "Group Anagrams - group strings by their sorted form as key",
      "First Unique Character - find minimum index with count=1",
      "Majority Element - find element with count > n/2"
    ],
    references: [
      {
        source: "leetcode",
        attribution: "LeetCode 242 (Valid Anagram)",
        insight: "Most basic frequency map problem. Asked 100+ times in FAANG coding interviews."
      },
      {
        source: "interview-experience",
        attribution: "Google, Amazon, Meta interviews",
        insight: "Interviewers expect O(n) solution with HashMap. Sorting solution still acceptable but not optimal."
      }
    ],
    practiceProblems: [
      {
        variation: "Valid Anagram when the strings can contain any Unicode code point",
        tip: "A fixed int[26] table silently misreads anything outside a-z, so swap to a hash map keyed by code point. Increment for the first string and decrement for the second, failing fast the moment a count goes negative. O(n) time and O(k) space in the alphabet size.",
        snippet: "std::unordered_map<char32_t,int> cnt;\nfor (char32_t c : a) ++cnt[c];\nfor (char32_t c : b) {\n  auto it = cnt.find(c);\n  if (it == cnt.end() || --(it->second) < 0) return false;\n}\nreturn a.size() == b.size();"
      },
      {
        variation: "Group Anagrams — bucket words by their character multiset",
        tip: "A pairwise comparison is O(n^2 * L). Instead compute a canonical key per word and use it as a map key: sorting the word is O(L log L), while a 26-slot count signature is O(L) and avoids the sort entirely. Total O(n * L) with the counting key.",
        snippet: "std::unordered_map<std::string, std::vector<std::string>> g;\nfor (auto& w : words) {\n  std::array<int,26> c{};\n  for (char ch : w) ++c[ch - 'a'];\n  std::string key;\n  for (int x : c) { key += '#'; key += std::to_string(x); }\n  g[key].push_back(w);\n}"
      },
      {
        variation: "Top K Frequent Elements in O(n) rather than O(n log n)",
        tip: "Sorting the frequency map is the obvious O(n log n) answer, and a size-k heap is O(n log k). You can do better with bucket sort: a frequency can never exceed n, so index buckets by count and sweep from the high end. That is O(n) time and O(n) space.",
        snippet: "std::unordered_map<int,int> cnt;\nfor (int x : a) ++cnt[x];\nstd::vector<std::vector<int>> bucket(a.size() + 1);\nfor (auto& [v, c] : cnt) bucket[c].push_back(v);\nstd::vector<int> out;\nfor (int c = bucket.size() - 1; c >= 0 && (int)out.size() < k; --c)\n  for (int v : bucket[c]) { out.push_back(v); if ((int)out.size() == k) break; }\nreturn out;"
      },
      {
        variation: "Find the first non-repeating character, and report its index",
        tip: "Two passes are needed: one to build the counts and one to scan in original order, because a map loses positional information. Do not try to fuse them — the first character you see is not necessarily unique. O(n) time and O(k) space.",
        snippet: "std::array<int,26> cnt{};\nfor (char c : s) ++cnt[c - 'a'];\nfor (int i = 0; i < (int)s.size(); ++i)\n  if (cnt[s[i] - 'a'] == 1) return i;\nreturn -1;"
      },
      {
        variation: "Streaming top-k — elements arrive continuously and k is fixed",
        tip: "Bucket sort needs the whole dataset, so it is unavailable online. Maintain a min-heap of size k so the smallest of the current best-k sits at the top and is evicted whenever a bigger element arrives. Each insert is O(log k) and memory stays O(k) regardless of stream length.",
        snippet: "std::priority_queue<int, std::vector<int>, std::greater<int>> pq; // min-heap\nvoid offer(int x) {\n  pq.push(x);\n  if ((int)pq.size() > k) pq.pop();   // drop the smallest\n}\nint kthLargest() const { return pq.top(); }"
      },
      {
        variation: "Majority element appearing more than n/2 times, in O(1) space",
        tip: "A frequency map answers this in O(n) space; the follow-up forbids it. Boyer-Moore voting keeps one candidate and one counter, cancelling every pair of differing votes, which leaves the true majority standing. Add a verification pass if the majority is not guaranteed to exist.",
        snippet: "int cand = 0, count = 0;\nfor (int x : a) {\n  if (count == 0) cand = x;\n  count += (x == cand) ? 1 : -1;\n}\nint check = 0;\nfor (int x : a) check += (x == cand);\nreturn check * 2 > (int)a.size() ? cand : -1;"
      }
    ],
    cppCode: `bool isAnagram(string s, string t) {
  if (s.length() != t.length()) return false;
  
  unordered_map<char, int> freq;
  for (char c : s) freq[c]++;
  
  for (char c : t) {
    if (freq[c]-- == 0) return false;
  }
  return true;
}`,
    workedExample: `Example: isAnagram("listen", "silent")

Initialization:
  freq = {}

Build frequency map from "listen":
  Process 'l': freq['l'] = 1
  Process 'i': freq['i'] = 1
  Process 's': freq['s'] = 1
  Process 't': freq['t'] = 1
  Process 'e': freq['e'] = 1
  Process 'n': freq['n'] = 1
  Final freq = {l:1, i:1, s:1, t:1, e:1, n:1}

Validate with "silent":
  Process 's': freq['s']-- = 1→0 ✓
  Process 'i': freq['i']-- = 1→0 ✓
  Process 'l': freq['l']-- = 1→0 ✓
  Process 'e': freq['e']-- = 1→0 ✓
  Process 'n': freq['n']-- = 1→0 ✓
  Process 't': freq['t']-- = 1→0 ✓

Result: All decrements succeeded → Return true`
  },

  {
    id: "topic-arrays-prefix-sum",
    moduleId: "mod-arrays-strings",
    title: "Prefix Sums & Range Queries",
    intuition:
      "Precompute cumulative sums to answer 'sum from index i to j' in O(1) instead of O(n). Trade space for speed.",
    lesson: [
      {
        title: "Prefix Sum Array Construction",
        content: "Build array where prefix[i] = sum of all elements from index 0 to i-1. Then any range sum can be computed in O(1) using: sum(i,j) = prefix[j+1] - prefix[i]",
        codeExample: `vector<int> buildPrefix(vector<int>& nums) {
  vector<int> prefix(nums.size() + 1, 0);  // 1-indexed
  for (int i = 0; i < nums.size(); i++) {
    prefix[i+1] = prefix[i] + nums[i];
  }
  return prefix;
}
// Now rangeSum(i, j) = prefix[j+1] - prefix[i]`
      },
      {
        title: "Subarray Sum Optimization with HashMap",
        content: "To find subarrays with target sum: for each position, check if (prefixSum - target) existed before. Use HashMap to count occurrences."
      }
    ],
    examples: [
      {
        title: "Range Sum Query",
        input: "nums = [1, 2, 3, 4, 5], query: sum(1, 3)",
        output: "2 + 3 + 4 = 9",
        explanation: `Build prefix array:
  nums = [1, 2, 3, 4, 5]
  prefix = [0, 1, 3, 6, 10, 15]
           (cumulative sums)

Query sum(1, 3):
  sum(1,3) = prefix[4] - prefix[1]
           = 10 - 1
           = 9  ✓ (which is 2+3+4)`
      }
    ],
    complexity: { time: "O(n) build, O(1) per query", space: "O(n)" },
    tips: [
      "Use 1-indexed prefix to avoid off-by-one errors with prefix[i-1]",
      "2D prefix sum for matrices: prefix[i][j] += prefix[i-1][j] + prefix[i][j-1] - prefix[i-1][j-1]"
    ],
    interviewPatterns: [
      "Subarray Sum Equals K",
      "Range Sum Query (both 1D and 2D)",
      "Continuous Subarray Sum"
    ],
    practiceProblems: [
      {
        variation: "Range Sum Query — Immutable, with many queries on a fixed array",
        tip: "Answering each query by looping is O(n) per call. Precompute a prefix array once in O(n) and every query collapses to a single subtraction, O(1). Use the size-(n+1) shifted layout so l = 0 needs no special case, and accumulate in long long to avoid overflow.",
        snippet: "std::vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];\nauto query = [&](int l, int r) { return pre[r + 1] - pre[l]; }; // inclusive"
      },
      {
        variation: "Subarray Sum Equals K with negative numbers in the array",
        tip: "Negatives break any sliding-window argument because extending a window can lower the sum. Use the prefix-difference identity instead: count how many earlier prefixes equal pre - K, stored in a hash map seeded with {0: 1}. O(n) time and O(n) space.",
        snippet: "std::unordered_map<long long,int> seen{{0, 1}};\nlong long pre = 0; int count = 0;\nfor (int x : a) {\n  pre += x;\n  auto it = seen.find(pre - K);\n  if (it != seen.end()) count += it->second;\n  ++seen[pre];\n}\nreturn count;"
      },
      {
        variation: "Range update, range query — add a delta to every element in [l, r]",
        tip: "Updating a prefix array is O(n) per range update. Flip to a difference array: record +delta at l and -delta at r+1, then one prefix pass materialises the final values. Updates become O(1) and the final rebuild is O(n), ideal when all updates precede all reads.",
        snippet: "std::vector<long long> diff(n + 1, 0);\nauto update = [&](int l, int r, long long d) { diff[l] += d; diff[r + 1] -= d; };\n// materialise once, after all updates:\nlong long run = 0;\nfor (int i = 0; i < n; ++i) { run += diff[i]; a[i] += run; }"
      },
      {
        variation: "2D prefix sums — sum an arbitrary sub-rectangle in O(1)",
        tip: "Extend by inclusion-exclusion: P[i][j] holds the sum of the rectangle anchored at the origin, so a query adds the far corner, subtracts the two overlapping strips, and adds back the doubly-subtracted corner. O(mn) build, O(1) per query. Pad with a zero row and column to skip boundary checks.",
        snippet: "std::vector<std::vector<long long>> P(m+1, std::vector<long long>(n+1, 0));\nfor (int i = 0; i < m; ++i)\n  for (int j = 0; j < n; ++j)\n    P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] - P[i][j];\nauto q = [&](int r1,int c1,int r2,int c2) {\n  return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];\n};"
      },
      {
        variation: "Point updates interleaved with range queries (Range Sum Query — Mutable)",
        tip: "A prefix array cannot absorb updates cheaply because every later entry shifts. A Fenwick tree gives O(log n) for both operations by storing partial sums over power-of-two spans. It is 1-indexed and its update takes a delta, so compute delta = newValue - oldValue yourself.",
        snippet: "std::vector<long long> bit; int N;\nvoid add(int i, long long d) { for (; i <= N; i += i & -i) bit[i] += d; }\nlong long pre(int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }\n// range [l, r], 1-based: pre(r) - pre(l - 1)"
      },
      {
        variation: "Count subarrays whose sum is divisible by K",
        tip: "Equality becomes congruence, so key the map on pre % K rather than pre. Every pair of indices sharing a remainder bounds a divisible subarray, so add the running count of that remainder before incrementing it. Normalise with ((x % K) + K) % K because C++ keeps the sign of the dividend.",
        snippet: "std::vector<int> cnt(K, 0);\ncnt[0] = 1;\nlong long pre = 0, ans = 0;\nfor (int x : a) {\n  pre += x;\n  int r = (int)(((pre % K) + K) % K);\n  ans += cnt[r]++;\n}\nreturn ans;"
      }
    ]
  },

  {
    id: "topic-two-pointer-basic",
    moduleId: "mod-two-pointers-sliding",
    title: "Two Pointer Technique",
    intuition:
      "Use two pointers moving toward each other on sorted arrays. Avoids O(n²) nested loops.",
    lesson: [
      {
        title: "Converging Pointers Strategy",
        content: "Start with pointers at opposite ends of sorted array. Move based on comparison of sum vs target: if sum too small, move left pointer right to increase sum; if too large, move right pointer left to decrease sum."
      }
    ],
    examples: [
      {
        title: "Two Sum II (Sorted Array)",
        input: "numbers = [2, 7, 11, 15], target = 9",
        output: "[1, 2] (1-indexed)",
        explanation: `Initialize:
  left = 0 (value 2)
  right = 3 (value 15)

Iteration 1:
  sum = 2 + 15 = 17 > 9
  Move right pointer left (need smaller sum)
  
Iteration 2:
  left = 0 (value 2)
  right = 2 (value 11)
  sum = 2 + 11 = 13 > 9
  Move right pointer left
  
Iteration 3:
  left = 0 (value 2)
  right = 1 (value 7)
  sum = 2 + 7 = 9  ✓ FOUND!
  Return [0+1, 1+1] = [1, 2]`
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: [
      "Only works on sorted arrays or monotonic sequences",
      "Time: O(n) vs HashMap approach O(n) but with O(1) space instead of O(n)"
    ],
    interviewPatterns: [
      "Two Sum (sorted)",
      "Container With Most Water",
      "Trapping Rain Water"
    ],
    practiceProblems: [
      {
        variation: "Two Sum II — the input array is sorted, return 1-indexed positions",
        tip: "Sorted input is exactly what makes converging pointers valid: the sum moves monotonically as either pointer steps. Move left up when the sum is short and right down when it overshoots. O(n) time and O(1) space, beating the hash map on memory; remember the 1-indexed answer.",
        snippet: "int l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = a[l] + a[r];\n  if (sum == target) return {l + 1, r + 1};\n  if (sum < target) ++l;\n  else --r;\n}\nreturn {};"
      },
      {
        variation: "Remove duplicates from a sorted array in place, returning the new length",
        tip: "Here the two pointers move in the same direction, not toward each other: a slow write pointer and a fast read pointer. Only advance the writer when the reader finds a value different from the last kept one. O(n) time and O(1) space, and the tail beyond the returned length is ignored.",
        snippet: "if (n == 0) return 0;\nint w = 1;\nfor (int r = 1; r < n; ++r)\n  if (a[r] != a[w - 1]) a[w++] = a[r];\nreturn w;"
      },
      {
        variation: "Allow each value to appear at most twice instead of once",
        tip: "The comparison target shifts from the previous kept element to the one two slots back, which encodes the 'at most k' rule directly. Generalising to k is a one-character change (w - k), so state that generalisation aloud. Still O(n) time and O(1) space.",
        snippet: "int k = 2, w = 0;\nfor (int r = 0; r < n; ++r)\n  if (w < k || a[r] != a[w - k]) a[w++] = a[r];\nreturn w;"
      },
      {
        variation: "Container With Most Water — maximise area, not match a target",
        tip: "There is no target to compare against, so the movement rule changes: always advance the pointer at the shorter line, because keeping it can never yield a taller container while the width only shrinks. That greedy argument is the whole proof. O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1; long long best = 0;\nwhile (l < r) {\n  best = std::max(best, (long long)std::min(h[l], h[r]) * (r - l));\n  if (h[l] < h[r]) ++l; else --r;\n}\nreturn best;"
      },
      {
        variation: "Sort Colors (Dutch national flag) — partition into three groups in one pass",
        tip: "Two pointers become three: a low boundary, a scanning mid, and a high boundary. Swapping with high brings in an unexamined value, so do not advance mid in that branch — that asymmetry is the classic bug. One pass, O(n) time and O(1) space.",
        snippet: "int lo = 0, mid = 0, hi = n - 1;\nwhile (mid <= hi) {\n  if (a[mid] == 0) std::swap(a[lo++], a[mid++]);\n  else if (a[mid] == 2) std::swap(a[mid], a[hi--]);  // mid not advanced\n  else ++mid;\n}"
      },
      {
        variation: "Trapping Rain Water — two pointers carrying running maxima",
        tip: "The pointers now carry state: the tallest bar seen from each side. Always advance the side whose bar is shorter, because that side's maximum is the binding constraint on the water level there. This replaces the O(n)-space prefix/suffix arrays with O(1) space, still O(n) time.",
        snippet: "int l = 0, r = n - 1, lm = 0, rm = 0; long long water = 0;\nwhile (l < r) {\n  if (h[l] < h[r]) { lm = std::max(lm, h[l]); water += lm - h[l]; ++l; }\n  else             { rm = std::max(rm, h[r]); water += rm - h[r]; --r; }\n}\nreturn water;"
      }
    ]
  },

  {
    id: "topic-sliding-window-fixed",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window - Fixed Size",
    intuition:
      "Maintain a window of fixed size and slide it across array. Calculate aggregate (sum, max, etc.) efficiently.",
    lesson: [
      {
        title: "Fixed Size Sliding Window Pattern",
        content: "Initialize window of size k. Then slide by: removing left element and adding new right element. No need to recalculate from scratch each time.",
        codeExample: `int maxSum = 0;
for (int i = 0; i < k; i++) {
  maxSum += nums[i];  // Initial window
}

int currentSum = maxSum;
for (int i = k; i < n; i++) {
  currentSum = currentSum - nums[i-k] + nums[i];
  maxSum = max(maxSum, currentSum);
}
return maxSum;`
      }
    ],
    examples: [
      {
        title: "Maximum Sum of k Elements",
        input: "nums = [1, 3, 2, 6, -1, 4, 1, 8, 2], k = 3",
        output: "13 (window: 4 + 1 + 8)",
        explanation: `Window positions:
  [1, 3, 2] → sum = 6
  [3, 2, 6] → sum = 11
  [2, 6, -1] → sum = 7
  [6, -1, 4] → sum = 9
  [-1, 4, 1] → sum = 4
  [4, 1, 8] → sum = 13  ← Maximum!
  [1, 8, 2] → sum = 11`
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: [
      "Remove nums[i-k] (left), add nums[i] (right) in each iteration"
    ],
    interviewPatterns: [
      "Maximum sum of k elements",
      "Average of subarrays of size k"
    ],
    practiceProblems: [
      {
        variation: "Maximum Average Subarray I — maximise the average over a window of exactly k",
        tip: "Because k is fixed, the average is maximised exactly where the sum is, so compare sums and divide only once at the end. That keeps the whole computation in integers and avoids floating-point comparison error. O(n) time and O(1) space.",
        snippet: "long long sum = 0;\nfor (int i = 0; i < k; ++i) sum += a[i];\nlong long best = sum;\nfor (int r = k; r < n; ++r) {\n  sum += a[r] - a[r - k];\n  best = std::max(best, sum);\n}\nreturn (double)best / k;"
      },
      {
        variation: "Return the starting index of the best window, not just its value",
        tip: "Tracking only the running best loses position, so record the index whenever you improve. Store the window start (r - k + 1) at the moment of the update rather than reconstructing it afterwards. No change to the O(n)/O(1) bounds.",
        snippet: "long long sum = 0;\nfor (int i = 0; i < k; ++i) sum += a[i];\nlong long best = sum; int bestStart = 0;\nfor (int r = k; r < n; ++r) {\n  sum += a[r] - a[r - k];\n  if (sum > best) { best = sum; bestStart = r - k + 1; }\n}\nreturn bestStart;"
      },
      {
        variation: "Count distinct elements in every window of size k",
        tip: "A sum can be updated with one add and one subtract, but distinctness cannot, so carry a count map alongside the window. Erase a key when its count reaches zero, otherwise map.size() never shrinks and every answer is wrong. O(n) time and O(k) space.",
        snippet: "std::unordered_map<int,int> cnt;\nfor (int r = 0; r < n; ++r) {\n  ++cnt[a[r]];\n  if (r >= k) { if (--cnt[a[r - k]] == 0) cnt.erase(a[r - k]); }\n  if (r >= k - 1) out.push_back(cnt.size());\n}"
      },
      {
        variation: "Maximum in every window of size k (Sliding Window Maximum)",
        tip: "A maximum is not invertible: you cannot 'subtract' the element leaving the window. Use a monotonic deque of indices, popping smaller values from the back and expired indices from the front, so the front is always the window maximum. O(n) total, beating the O(n log k) heap.",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      },
      {
        variation: "Median of every window of size k",
        tip: "Neither a running sum nor a deque works, because the median depends on order inside the window. Keep a balanced multiset with an iterator parked at the median, or two heaps with lazy deletion, rebalancing after each insert and erase. That gives O(n log k) time and O(k) space.",
        snippet: "std::multiset<int> win(a.begin(), a.begin() + k);\nauto mid = std::next(win.begin(), (k - 1) / 2);\nfor (int r = k; ; ++r) {\n  out.push_back(((double)*mid + *std::next(mid, 1 - k % 2)) / 2.0);\n  if (r == n) break;\n  win.insert(a[r]);\n  if (a[r] < *mid) --mid;\n  if (a[r - k] <= *mid) ++mid;\n  win.erase(win.lower_bound(a[r - k]));\n}"
      },
      {
        variation: "The window size is no longer fixed — find the longest window under a constraint",
        tip: "Once k stops being given, the single-step slide is replaced by two independent pointers: expand right always, and shrink left in a while loop only while the invariant is violated. Amortised each index moves at most twice, so it stays O(n) despite the nested loop.",
        snippet: "int l = 0, best = 0; long long sum = 0;\nfor (int r = 0; r < n; ++r) {\n  sum += a[r];\n  while (sum > limit) sum -= a[l++];   // repair the invariant\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      }
    ]
  },

  {
    id: "topic-sliding-window-variable",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window - Variable Size",
    intuition:
      "Expand right to include elements, contract left when constraint violated. Each element enters/exits at most once → O(n).",
    lesson: [
      {
        title: "Variable Window Pattern",
        content: "Expand window by moving right. When constraint is violated, contract by moving left. Key insight: each element processed at most twice (enter, exit).",
        codeExample: `int left = 0;
unordered_map<char, int> charCount;

for (int right = 0; right < n; right++) {
  charCount[s[right]]++;  // Expand
  
  // Contract while constraint violated
  while (charCount[s[right]] > 1) {
    charCount[s[left]]--;
    left++;
  }
  
  // Process current valid window [left, right]
  maxLen = max(maxLen, right - left + 1);
}`
      }
    ],
    examples: [
      {
        title: "Longest Substring Without Repeating",
        input: "s = \"abcabcbb\"",
        output: "3 (substring: \"abc\")",
        explanation: `right=0, char='a': window=[a], valid
right=1, char='b': window=[a,b], valid
right=2, char='c': window=[a,b,c], size=3, valid
right=3, char='a': duplicate! charCount['a']=2
  Contract: left moves right until charCount['a']=1
  After contract: window=[b,c,a], size=3
right=4, char='b': duplicate! charCount['b']=2
  Contract: window=[c,a,b], size=3
...continuing...
Maximum window size = 3`
      }
    ],
    complexity: { time: "O(n)", space: "O(min(m,n)) for character count" },
    tips: [
      "Each element enters window once and exits once → O(n) total",
      "Maintain HashMap/array to track elements in window"
    ],
    interviewPatterns: [
      "Longest substring without repeating characters",
      "Minimum window substring",
      "Longest substring with at most k distinct characters"
    ],
    practiceProblems: [
      {
        variation: "Longest Substring Without Repeating Characters",
        tip: "The invariant is 'no duplicate inside the window', so on seeing a repeat you must jump the left edge past its previous occurrence rather than shrinking one step at a time. Store last-seen indices and take a max so the left edge never moves backwards. O(n) time, O(k) space.",
        snippet: "std::unordered_map<char,int> last;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  auto it = last.find(s[r]);\n  if (it != last.end()) l = std::max(l, it->second + 1);\n  last[s[r]] = r;\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Longest substring with at most K distinct characters",
        tip: "Validity is now a bound on the number of distinct keys, so you need a count map and must erase a key when its count hits zero or the size never falls. Shrink while cnt.size() > K. O(n) time and O(K) space.",
        snippet: "std::unordered_map<char,int> cnt;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++cnt[s[r]];\n  while ((int)cnt.size() > K) {\n    if (--cnt[s[l]] == 0) cnt.erase(s[l]);\n    ++l;\n  }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Longest Repeating Character Replacement — you may rewrite up to k characters",
        tip: "The window is valid when length minus the most frequent character's count is at most k. Recomputing that maximum each step is O(26); the neat trick is that a stale, never-decreasing maxCount still yields the right answer because the window only ever needs to grow. O(n) time.",
        snippet: "std::array<int,26> cnt{};\nint l = 0, maxCount = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  maxCount = std::max(maxCount, ++cnt[s[r] - 'A']);\n  while (r - l + 1 - maxCount > k) --cnt[s[l++] - 'A'];\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Minimum Window Substring — minimise instead of maximise, with duplicates required",
        tip: "Minimising flips the loop structure: shrink while the window is still valid and record the answer inside the shrink loop. Duplicates mean you track how many required characters are still missing, not how many distinct ones you have. O(n + m) time.",
        snippet: "std::unordered_map<char,int> need;\nfor (char c : t) ++need[c];\nint missing = t.size(), l = 0, bl = 0, blen = INT_MAX;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  if (need[s[r]]-- > 0) --missing;\n  while (missing == 0) {\n    if (r - l + 1 < blen) { blen = r - l + 1; bl = l; }\n    if (++need[s[l]] > 0) ++missing;\n    ++l;\n  }\n}\nreturn blen == INT_MAX ? \"\" : s.substr(bl, blen);"
      },
      {
        variation: "Minimum size subarray whose sum is at least S (positive integers only)",
        tip: "Same shrink-while-valid shape as minimum window, but the predicate is numeric. The correctness rests entirely on all values being positive, which makes the sum monotone in the window length. O(n) time and O(1) space.",
        snippet: "int l = 0, best = INT_MAX; long long sum = 0;\nfor (int r = 0; r < n; ++r) {\n  sum += a[r];\n  while (sum >= S) {\n    best = std::min(best, r - l + 1);\n    sum -= a[l++];\n  }\n}\nreturn best == INT_MAX ? 0 : best;"
      },
      {
        variation: "Shortest subarray with sum at least S when negatives are allowed",
        tip: "Negatives destroy monotonicity, so shrinking from the left is no longer a valid repair and the window approach collapses. Switch to prefix sums plus a monotonic deque of increasing prefix indices: pop from the front when a valid answer is found, and from the back when a smaller prefix arrives. O(n) time.",
        snippet: "std::vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];\nstd::deque<int> dq; int best = INT_MAX;\nfor (int i = 0; i <= n; ++i) {\n  while (!dq.empty() && pre[i] - pre[dq.front()] >= S) { best = std::min(best, i - dq.front()); dq.pop_front(); }\n  while (!dq.empty() && pre[dq.back()] >= pre[i]) dq.pop_back();\n  dq.push_back(i);\n}\nreturn best == INT_MAX ? -1 : best;"
      }
    ]
  },

  {
    id: "topic-hashing-two-sum",
    moduleId: "mod-arrays-strings",
    title: "Two Sum with HashMap",
    intuition:
      "For each element, check if (target - element) exists in map. One-pass O(n) solution vs two-pass sort O(n log n).",
    lesson: [
      {
        title: "One-Pass HashMap Approach",
        content: "Iterate through array. For each number, check if its complement (target - number) exists in HashMap. Then add current number to map for future lookups.",
        codeExample: `unordered_map<int, int> seen;
for (int i = 0; i < nums.size(); i++) {
  int complement = target - nums[i];
  
  if (seen.find(complement) != seen.end()) {
    return {seen[complement], i};  // Found!
  }
  
  seen[nums[i]] = i;  // Store for future lookups
}
return {};  // Not found`
      }
    ],
    examples: [
      {
        title: "Find Two Numbers that Sum to Target",
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: `i=0: num=2
  complement = 9 - 2 = 7
  7 not in map yet
  Add to map: {2→0}

i=1: num=7
  complement = 9 - 7 = 2
  2 IS in map at index 0!
  Return [0, 1]  ✓`
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: [
      "Works with unsorted arrays (unlike two-pointer)",
      "Can have negative numbers, duplicates, etc."
    ],
    tricks: [
      "If duplicates matter: store count in map instead of index",
      "For multiple pairs: collect all pairs instead of returning early"
    ],
    interviewPatterns: [
      "Two Sum",
      "3Sum (nested loops with 2Sum)",
      "4Sum and k-Sum variants"
    ],
    references: [
      {
        source: "leetcode",
        attribution: "LeetCode #1 (Two Sum)",
        insight: "Most commonly asked interview question. Know this solution perfectly."
      }
    ],
    practiceProblems: [
      {
        variation: "Return the indices, not the values, and handle duplicate numbers",
        tip: "Storing value -> index means a repeated value overwrites its earlier index, which is fine only if you look up the complement *before* inserting the current element. That single-pass ordering also handles target = 2x correctly. O(n) time and O(n) space.",
        snippet: "std::unordered_map<int,int> seen;   // value -> index\nfor (int i = 0; i < n; ++i) {\n  auto it = seen.find(target - a[i]);\n  if (it != seen.end()) return {it->second, i};\n  seen[a[i]] = i;                    // insert AFTER the lookup\n}\nreturn {};"
      },
      {
        variation: "The array is sorted — is the hash map still the right answer?",
        tip: "No: sortedness makes converging two pointers valid, which drops space from O(n) to O(1) while staying O(n) time. Say this out loud, because interviewers use it to check whether you reach for a memorised solution. The result is 1-indexed in the classic phrasing.",
        snippet: "int l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = a[l] + a[r];\n  if (sum == target) return {l + 1, r + 1};\n  if (sum < target) ++l;\n  else --r;\n}\nreturn {};"
      },
      {
        variation: "Return every unique pair rather than the first match",
        tip: "You can no longer return early, and duplicates would otherwise emit the same pair twice. Sorting plus two pointers makes deduplication natural: after recording a pair, skip forward past equal values on both sides. O(n log n) time dominated by the sort.",
        snippet: "std::sort(a.begin(), a.end());\nint l = 0, r = n - 1;\nwhile (l < r) {\n  int s = a[l] + a[r];\n  if (s < target) ++l;\n  else if (s > target) --r;\n  else {\n    out.push_back({a[l], a[r]});\n    while (l < r && a[l] == a[l+1]) ++l;\n    while (l < r && a[r] == a[r-1]) --r;\n    ++l; --r;\n  }\n}"
      },
      {
        variation: "3Sum — k grows from 2 to 3",
        tip: "The hash-map form does not extend cleanly once deduplication matters. Sort, fix the first index, and run the sorted two-pointer scan over the suffix, giving O(n^2). Skipping equal values at the fixed index is what stops duplicate triplets appearing.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i = 0; i + 2 < n; ++i) {\n  if (i && a[i] == a[i-1]) continue;\n  int l = i + 1, r = n - 1;\n  while (l < r) {\n    int s = a[i] + a[l] + a[r];\n    if (s < 0) ++l;\n    else if (s > 0) --r;\n    else { out.push_back({a[i],a[l],a[r]});\n           while (l<r && a[l]==a[l+1]) ++l;\n           while (l<r && a[r]==a[r-1]) --r;\n           ++l; --r; }\n  }\n}"
      },
      {
        variation: "4Sum — arbitrary k, and the sums overflow 32-bit int",
        tip: "Each extra k adds one fixed index outside the two-pointer scan, so 4Sum is O(n^3) and k-Sum is O(n^(k-1)). Accumulate in long long: four values near INT_MAX overflow int and silently produce false matches. Prune when the smallest achievable remaining sum already exceeds the target.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i=0;i+3<n;++i) { if (i && a[i]==a[i-1]) continue;\n  for (int j=i+1;j+2<n;++j) { if (j>i+1 && a[j]==a[j-1]) continue;\n    int l=j+1, r=n-1;\n    while (l<r) {\n      long long s = (long long)a[i]+a[j]+a[l]+a[r];\n      if (s<target) ++l; else if (s>target) --r;\n      else { out.push_back({a[i],a[j],a[l],a[r]});\n             while (l<r && a[l]==a[l+1]) ++l;\n             while (l<r && a[r]==a[r-1]) --r;\n             ++l; --r; }\n    } } }"
      },
      {
        variation: "Two Sum over a stream — inserts and queries interleave",
        tip: "You cannot sort, because the data is never complete. Keep a count map so add is O(1) and find scans the distinct keys for a complement in O(k). The subtle case is x + x == target, which requires that value's count to be at least two.",
        snippet: "std::unordered_map<int,int> cnt;\nvoid add(int x) { ++cnt[x]; }\nbool find(int target) const {\n  for (auto& [v, c] : cnt) {\n    int need = target - v;\n    if (need == v ? c > 1 : cnt.count(need)) return true;\n  }\n  return false;\n}"
      }
    ]
  }
];
