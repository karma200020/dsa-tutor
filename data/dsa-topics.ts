import { Topic } from "./syllabus";

export const dsaTopics: Topic[] = [
  // ===== ARRAYS & STRINGS MASTERY (12 Topics) =====
  {
    id: "topic-arrays-frequency-maps",
    moduleId: "mod-arrays-strings",
    title: "Frequency Maps & Counting",
    intuition: "Count element occurrences to solve grouping and comparison problems. O(n) hashing beats O(n log n) sorting when you only need frequencies.",
    lesson: [
      {
        title: "Understanding Frequency Maps",
        content: "A frequency map stores how many times each element appears. Use it when a problem asks to find all, group by, check if same, or involves counting.",
        codeExample: "unordered_map<char, int> freq;\nfor (char c : s) freq[c]++;",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Valid Anagram",
        input: 's1 = \"listen\", s2 = \"silent\"',
        output: "true",
        explanation: "Step 1: Count chars in listen: {l:1, i:1, s:1, t:1, e:1, n:1}\nStep 2: Count chars in silent: {s:1, i:1, l:1, e:1, n:1, t:1}\nStep 3: Maps match ? true",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(k) unique elements" },
    tips: ["Clarify case sensitivity and non-ASCII handling", "Array vs HashMap: small alphabet ? array; general ? HashMap"],
    references: [{ source: "interview-experience", attribution: "Amazon/Google", insight: "Expect to explain hash vs sort tradeoff." }],
    practiceProblems: [
      {
        variation: "Valid Anagram when the input may contain any Unicode character",
        tip: "A fixed int[26] table silently misreads anything outside a-z. Switch to a hash map keyed by code point, incrementing for one string and decrementing for the other, and bail out as soon as a count goes negative. O(n) time and O(k) space in the alphabet size.",
        snippet: "std::unordered_map<char32_t,int> cnt;\nfor (char32_t c : a) ++cnt[c];\nfor (char32_t c : b) {\n  auto it = cnt.find(c);\n  if (it == cnt.end() || --(it->second) < 0) return false;\n}\nreturn a.size() == b.size();"
      },
      {
        variation: "Group Anagrams — bucket words whose character multisets match",
        tip: "Pairwise comparison is O(n^2 * L). Compute a canonical key per word and let the hash map do the grouping: sorting is O(L log L), a 26-slot count signature is O(L). Delimit the counts in the key so 1,11 and 11,1 cannot collide.",
        snippet: "std::unordered_map<std::string, std::vector<std::string>> g;\nfor (auto& w : words) {\n  std::array<int,26> c{};\n  for (char ch : w) ++c[ch - 'a'];\n  std::string key;\n  for (int x : c) { key += '#'; key += std::to_string(x); }\n  g[key].push_back(w);\n}"
      },
      {
        variation: "First non-repeating character, returning its index",
        tip: "This needs two passes, because a map has no notion of position: build counts first, then rescan the original string in order. Trying to fuse them fails, since the first character you meet is not necessarily unique. O(n) time and O(k) space.",
        snippet: "std::array<int,26> cnt{};\nfor (char c : s) ++cnt[c - 'a'];\nfor (int i = 0; i < (int)s.size(); ++i)\n  if (cnt[s[i] - 'a'] == 1) return i;\nreturn -1;"
      },
      {
        variation: "Top K Frequent Elements in O(n) instead of O(n log n)",
        tip: "Sorting the counts is O(n log n) and a size-k heap is O(n log k). Bucket sort beats both: a frequency cannot exceed n, so index buckets by count and sweep down from the top. O(n) time and O(n) space.",
        snippet: "std::unordered_map<int,int> cnt;\nfor (int x : a) ++cnt[x];\nstd::vector<std::vector<int>> bucket(a.size() + 1);\nfor (auto& [v, c] : cnt) bucket[c].push_back(v);\nstd::vector<int> out;\nfor (int c = bucket.size() - 1; c >= 0 && (int)out.size() < k; --c)\n  for (int v : bucket[c]) { out.push_back(v); if ((int)out.size() == k) break; }\nreturn out;"
      },
      {
        variation: "Majority element (more than n/2 occurrences) in O(1) space",
        tip: "A frequency map is O(n) space, which the follow-up forbids. Boyer-Moore voting keeps one candidate and one counter, pairing off differing votes so the true majority survives. Add a verification pass if the problem does not guarantee a majority exists.",
        snippet: "int cand = 0, count = 0;\nfor (int x : a) {\n  if (count == 0) cand = x;\n  count += (x == cand) ? 1 : -1;\n}\nint check = 0;\nfor (int x : a) check += (x == cand);\nreturn check * 2 > (int)a.size() ? cand : -1;"
      },
      {
        variation: "Streaming frequency — report the heavy hitters of an unbounded stream",
        tip: "An exact map grows without bound, which is unacceptable online. Misra-Gries (the k-way generalisation of Boyer-Moore) keeps at most k-1 counters and guarantees every element occurring more than n/k times is retained. You trade exactness for O(k) space and a bounded error of n/k.",
        snippet: "std::unordered_map<int,int> c;   // at most k-1 entries\nvoid offer(int x) {\n  if (c.count(x)) { ++c[x]; return; }\n  if ((int)c.size() < k - 1) { c[x] = 1; return; }\n  for (auto it = c.begin(); it != c.end(); )\n    if (--(it->second) == 0) it = c.erase(it); else ++it;\n}"
      }
    ]
  },

  {
    id: "topic-arrays-two-sum",
    moduleId: "mod-arrays-strings",
    title: "Two Sum & Variants",
    intuition: "Find two numbers summing to target in O(n) using hashmap. Foundation for 3Sum, 4Sum, and range-based problems.",
    lesson: [
      {
        title: "The Two Sum Problem",
        content: "Find two elements adding to target. Brute force O(n^2) with loops. Optimal O(n) with single hashmap pass.",
        codeExample: "unordered_map<int, int> seen;\nfor (int num : nums) {\n  int comp = target - num;\n  if (seen.count(comp)) return {seen[comp], i};\n  seen[num] = i;\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Two Sum",
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Iterate: see 2 (store), see 7 (need 9-7=2, found!). Return indices [0,1].",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: ["Sorted input ? two pointers O(1) space", "Unsorted ? hashmap O(n) space"],
    references: [{ source: "leetcode", attribution: "LeetCode #1", insight: "Most asked array problem. Master all variations." }],
    practiceProblems: [
      {
        variation: "Two Sum II — the input array is already sorted, return 1-indexed positions",
        tip: "Sorting removes the need for extra space. Walk two pointers inward: if the sum is too small move left up, if too large move right down. O(n) time and O(1) space, beating the hashmap on memory.",
        snippet: "int l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = a[l] + a[r];\n  if (sum == target) return {l + 1, r + 1};\n  if (sum < target) ++l;\n  else --r;\n}\nreturn {};"
      },
      {
        variation: "Count every pair summing to target, duplicates included",
        tip: "You can no longer return early, and duplicates make counting subtle: [1,1,1] with target 2 has three pairs. Add the count of previously-seen complements before recording the current value, which handles the self-pair case for free. O(n) time and O(n) space.",
        snippet: "std::unordered_map<int,int> seen;\nlong long pairs = 0;\nfor (int x : a) {\n  auto it = seen.find(target - x);\n  if (it != seen.end()) pairs += it->second;\n  ++seen[x];\n}\nreturn pairs;"
      },
      {
        variation: "3Sum — all unique triplets summing to zero",
        tip: "The hash map does not extend cleanly once deduplication dominates. Sort, fix the first index, and run the sorted two-pointer scan on the suffix for O(n^2). The real work is skipping equal values at all three positions so no triplet is emitted twice.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i = 0; i + 2 < n; ++i) {\n  if (i && a[i] == a[i-1]) continue;\n  int l = i + 1, r = n - 1;\n  while (l < r) {\n    int s = a[i] + a[l] + a[r];\n    if (s < 0) ++l;\n    else if (s > 0) --r;\n    else { out.push_back({a[i],a[l],a[r]});\n           while (l<r && a[l]==a[l+1]) ++l;\n           while (l<r && a[r]==a[r-1]) --r;\n           ++l; --r; }\n  }\n}"
      },
      {
        variation: "3Sum Closest — nearest sum to target rather than an exact match",
        tip: "Without an exact target there is nothing to short-circuit on, so the full sweep runs and you track the smallest absolute difference. The pointer-movement rule is unchanged: move left up when under, right down when over. O(n^2) after the sort.",
        snippet: "std::sort(a.begin(), a.end());\nint best = a[0] + a[1] + a[2];\nfor (int i = 0; i + 2 < n; ++i) {\n  int l = i + 1, r = n - 1;\n  while (l < r) {\n    int s = a[i] + a[l] + a[r];\n    if (std::abs(s - target) < std::abs(best - target)) best = s;\n    if (s < target) ++l; else if (s > target) --r; else return s;\n  }\n}\nreturn best;"
      },
      {
        variation: "4Sum — k = 4, and the sums overflow 32-bit int",
        tip: "Each extra k adds one fixed index outside the two-pointer scan, so this is O(n^3) and k-Sum is O(n^(k-1)). Accumulate in long long, because four near-INT_MAX values wrap around and produce phantom matches. Prune when the minimum achievable remaining sum already exceeds target.",
        snippet: "std::sort(a.begin(), a.end());\nfor (int i=0;i+3<n;++i) { if (i && a[i]==a[i-1]) continue;\n  for (int j=i+1;j+2<n;++j) { if (j>i+1 && a[j]==a[j-1]) continue;\n    int l=j+1, r=n-1;\n    while (l<r) {\n      long long s = (long long)a[i]+a[j]+a[l]+a[r];\n      if (s<target) ++l; else if (s>target) --r;\n      else { out.push_back({a[i],a[j],a[l],a[r]});\n             while (l<r && a[l]==a[l+1]) ++l;\n             while (l<r && a[r]==a[r-1]) --r;\n             ++l; --r; }\n    } } }"
      },
      {
        variation: "Two Sum over a stream — adds and queries interleave",
        tip: "Sorting is impossible because the data is never complete, so keep a count map: add is O(1) and find scans distinct keys for a complement in O(k). The trap is x + x == target, which requires that value's count to be at least two.",
        snippet: "std::unordered_map<int,int> cnt;\nvoid add(int x) { ++cnt[x]; }\nbool find(int target) const {\n  for (auto& [v, c] : cnt) {\n    int need = target - v;\n    if (need == v ? c > 1 : cnt.count(need)) return true;\n  }\n  return false;\n}"
      }
    ]
  },

  {
    id: "topic-arrays-prefix-sum",
    moduleId: "mod-arrays-strings",
    title: "Prefix Sums",
    intuition: "Precompute cumulative sums for O(1) range queries. Transform O(n) sum queries into O(1) lookups.",
    lesson: [
      {
        title: "Building Prefix Array",
        content: "Prefix[i] = sum of all elements from 0 to i-1. Use 1-indexed to avoid off-by-one errors.",
        codeExample: "vector<int> prefix(n + 1, 0);\nfor (int i = 0; i < n; i++)\n  prefix[i + 1] = prefix[i] + nums[i];",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Range Sum Query",
        input: "arr = [1,3,5,7], query(1,2)",
        output: "8",
        explanation: "prefix = [0,1,4,9,16]. Sum(1,2) = prefix[3] - prefix[1] = 9 - 1 = 8 (elements 3+5).",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n) build, O(1) query", space: "O(n)" },
    tips: ["Use 1-indexed to align with array indices", "Always verify query boundaries"],
    references: [{ source: "blog", attribution: "LeetCode", insight: "Foundation for subarray sum problems." }],
    practiceProblems: [
      {
        variation: "Range Sum Query — Immutable, many queries over a fixed array",
        tip: "Looping per query is O(n) each time. Build the prefix array once in O(n) and every query becomes a single subtraction. Use the size-(n+1) shifted layout so l = 0 needs no branch, and accumulate in long long to avoid overflow.",
        snippet: "std::vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];\nauto query = [&](int l, int r) { return pre[r + 1] - pre[l]; };  // inclusive"
      },
      {
        variation: "Subarray Sum Equals K with negative numbers present",
        tip: "Negatives kill any sliding-window argument, because extending the window can lower the sum. Use the prefix-difference identity instead and count earlier prefixes equal to pre - K, with the map seeded {0: 1}. O(n) time and O(n) space.",
        snippet: "std::unordered_map<long long,int> seen{{0, 1}};\nlong long pre = 0; int count = 0;\nfor (int x : a) {\n  pre += x;\n  auto it = seen.find(pre - K);\n  if (it != seen.end()) count += it->second;\n  ++seen[pre];\n}\nreturn count;"
      },
      {
        variation: "Count subarrays whose sum is divisible by K",
        tip: "Equality becomes congruence, so key the counter on pre % K rather than pre itself: two indices with the same remainder bound a divisible span. Normalise negative remainders with ((x % K) + K) % K, since C++ keeps the dividend's sign. O(n) time and O(K) space.",
        snippet: "std::vector<int> cnt(K, 0);\ncnt[0] = 1;\nlong long pre = 0, ans = 0;\nfor (int x : a) {\n  pre += x;\n  int r = (int)(((pre % K) + K) % K);\n  ans += cnt[r]++;\n}\nreturn ans;"
      },
      {
        variation: "Range updates before any query — add a delta over [l, r]",
        tip: "Updating a prefix array costs O(n) per update because every later entry shifts. A difference array flips the cost: record +delta at l and -delta at r+1 for O(1) updates, then one prefix pass materialises the result. Ideal when all updates precede all reads.",
        snippet: "std::vector<long long> diff(n + 1, 0);\nauto update = [&](int l, int r, long long d) { diff[l] += d; diff[r + 1] -= d; };\nlong long run = 0;\nfor (int i = 0; i < n; ++i) { run += diff[i]; a[i] += run; }   // materialise once"
      },
      {
        variation: "2D prefix sums — arbitrary sub-rectangle in O(1)",
        tip: "Extend by inclusion-exclusion: a query adds the far corner, subtracts the two overlapping strips, and adds back the doubly-subtracted corner. O(mn) to build and O(1) per query. Pad with a zero row and column so no boundary check is needed.",
        snippet: "std::vector<std::vector<long long>> P(m+1, std::vector<long long>(n+1, 0));\nfor (int i = 0; i < m; ++i)\n  for (int j = 0; j < n; ++j)\n    P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] - P[i][j];\nauto q = [&](int r1,int c1,int r2,int c2) {\n  return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];\n};"
      },
      {
        variation: "Range Sum Query — Mutable: point updates interleaved with queries",
        tip: "A prefix array cannot absorb updates cheaply. A Fenwick tree stores partial sums over power-of-two spans, giving O(log n) for both update and prefix query. It is 1-indexed and takes a delta, so compute newValue - oldValue yourself.",
        snippet: "std::vector<long long> bit; int N;\nvoid add(int i, long long d) { for (; i <= N; i += i & -i) bit[i] += d; }\nlong long pre(int i) { long long s = 0; for (; i > 0; i -= i & -i) s += bit[i]; return s; }\n// range [l, r] 1-based: pre(r) - pre(l - 1)"
      }
    ]
  },

  {
    id: "topic-arrays-sliding-window",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window",
    intuition: "Maintain a window of elements and slide it to find optimal subarrays. Convert nested loops into two pointers.",
    lesson: [
      {
        title: "Fixed vs Variable Window",
        content: "Fixed size: maintain constant window, slide right. Variable size: expand right for conditions, contract left to find minimum/maximum window.",
        codeExample: "int left = 0;\nfor (int right = 0; right < n; right++) {\n  window_sum += nums[right];\n  while (window_sum > target) window_sum -= nums[left++];\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Maximum Subarray Sum (Fixed Window)",
        input: "nums = [1,2,3,4], k = 2",
        output: "7",
        explanation: "Windows: [1,2]=3, [2,3]=5, [3,4]=7. Max = 7.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: ["Identify if problem needs fixed or variable window", "Use two pointers to avoid nested loops"],
    references: [{ source: "blog", attribution: "NeetCode", insight: "Transforms O(n^2) to O(n)." }],
    practiceProblems: [
      {
        variation: "Fixed-size window — maximum sum of exactly k consecutive elements",
        tip: "When the size is fixed the shrink loop disappears entirely: slide by adding the entering element and subtracting the leaving one. Compare sums rather than averages so everything stays in integer arithmetic. O(n) time and O(1) space.",
        snippet: "long long sum = 0;\nfor (int i = 0; i < k; ++i) sum += a[i];\nlong long best = sum;\nfor (int r = k; r < n; ++r) {\n  sum += a[r] - a[r - k];\n  best = std::max(best, sum);\n}\nreturn best;"
      },
      {
        variation: "Max Consecutive Ones III — variable window with a budget of k zero-flips",
        tip: "The window is valid while it holds at most k zeros. Expand right unconditionally and shrink left only while that invariant is broken; each index enters and leaves once, so it is O(n) despite the nested loop. O(1) space.",
        snippet: "int l = 0, zeros = 0, best = 0;\nfor (int r = 0; r < n; ++r) {\n  if (a[r] == 0) ++zeros;\n  while (zeros > k) { if (a[l] == 0) --zeros; ++l; }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Longest substring with at most K distinct characters",
        tip: "The predicate is on the number of distinct keys, so a scalar counter is not enough — carry a map and erase keys whose count reaches zero, or the distinct count never falls. Shrink while cnt.size() > K. O(n) time and O(K) space.",
        snippet: "std::unordered_map<char,int> cnt;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++cnt[s[r]];\n  while ((int)cnt.size() > K) {\n    if (--cnt[s[l]] == 0) cnt.erase(s[l]);\n    ++l;\n  }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Minimum Window Substring — minimise, and the target has duplicates",
        tip: "Minimising inverts the loop: shrink while the window is still valid and record the answer inside the shrink loop. Because duplicates are required, track how many needed characters are still missing rather than how many distinct ones you hold. O(n + m).",
        snippet: "std::unordered_map<char,int> need;\nfor (char c : t) ++need[c];\nint missing = t.size(), l = 0, bl = 0, blen = INT_MAX;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  if (need[s[r]]-- > 0) --missing;\n  while (missing == 0) {\n    if (r - l + 1 < blen) { blen = r - l + 1; bl = l; }\n    if (++need[s[l]] > 0) ++missing;\n    ++l;\n  }\n}\nreturn blen == INT_MAX ? \"\" : s.substr(bl, blen);"
      },
      {
        variation: "Maximum in every window of size k (not a sum)",
        tip: "A maximum is not invertible, so you cannot subtract the departing element the way you can with a sum. Use a monotonic deque of indices with decreasing values: expire from the front, dominate from the back, and read the front. O(n) time and O(k) space.",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      },
      {
        variation: "Shortest subarray with sum at least S when negatives are allowed",
        tip: "Negatives break monotonicity, so shrinking from the left is no longer a correct repair and the window collapses. Move to prefix sums with a monotonic deque of increasing prefixes: pop the front on a hit, and the back when a smaller prefix arrives. O(n) time.",
        snippet: "std::vector<long long> pre(n + 1, 0);\nfor (int i = 0; i < n; ++i) pre[i + 1] = pre[i] + a[i];\nstd::deque<int> dq; int best = INT_MAX;\nfor (int i = 0; i <= n; ++i) {\n  while (!dq.empty() && pre[i] - pre[dq.front()] >= S) { best = std::min(best, i - dq.front()); dq.pop_front(); }\n  while (!dq.empty() && pre[dq.back()] >= pre[i]) dq.pop_back();\n  dq.push_back(i);\n}\nreturn best == INT_MAX ? -1 : best;"
      }
    ]
  },

  {
    id: "topic-arrays-longest-substring",
    moduleId: "mod-two-pointers-sliding",
    title: "Longest Substring Without Repeating",
    intuition: "Track character frequencies in window and shrink when duplicate appears. Variable sliding window pattern.",
    lesson: [
      {
        title: "Character Frequency Tracking",
        content: "Use hashmap to store last seen index of each character. When duplicate found, move left pointer past previous occurrence.",
        codeExample: "unordered_map<char, int> lastSeen;\nint maxLen = 0, left = 0;\nfor (int right = 0; right < s.size(); right++) {\n  if (lastSeen.count(s[right])) left = max(left, lastSeen[s[right]] + 1);\n  lastSeen[s[right]] = right;\n  maxLen = max(maxLen, right - left + 1);\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Longest Substring",
        input: 's = \"abcabcbb\"',
        output: "3",
        explanation: "Substrings: \"abc\" (length 3), \"bca\" (3), \"cab\" (3), \"abc\" (3). Max = 3.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(min(n, charset))" },
    references: [{ source: "leetcode", attribution: "LeetCode #3", insight: "Classic sliding window with hashmap." }],
    practiceProblems: [
      {
        variation: "Jump the left edge instead of shrinking one character at a time",
        tip: "The set-based version advances the left pointer step by step, which is correct but slower in practice. Store each character's last index and move left directly past it, taking a max so it never regresses. O(n) time with a single pass.",
        snippet: "std::unordered_map<char,int> last;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  auto it = last.find(s[r]);\n  if (it != last.end()) l = std::max(l, it->second + 1);\n  last[s[r]] = r;\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Return the substring itself, not only its length",
        tip: "Tracking only the best length loses position, so record the window start whenever you improve. Capture l at the moment of the update rather than reconstructing it afterwards, since l keeps moving. Bounds and complexity are otherwise unchanged.",
        snippet: "int l = 0, bestLen = 0, bestStart = 0;\nstd::unordered_map<char,int> last;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  auto it = last.find(s[r]);\n  if (it != last.end()) l = std::max(l, it->second + 1);\n  last[s[r]] = r;\n  if (r - l + 1 > bestLen) { bestLen = r - l + 1; bestStart = l; }\n}\nreturn s.substr(bestStart, bestLen);"
      },
      {
        variation: "Allow at most K distinct characters instead of zero repeats",
        tip: "The invariant moves from 'no duplicates' to 'at most K distinct', so a set is no longer sufficient — you need counts, and you must erase a key when its count hits zero. Shrink while the map size exceeds K. O(n) time and O(K) space.",
        snippet: "std::unordered_map<char,int> cnt;\nint l = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++cnt[s[r]];\n  while ((int)cnt.size() > K) {\n    if (--cnt[s[l]] == 0) cnt.erase(s[l]);\n    ++l;\n  }\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Longest Repeating Character Replacement — up to k characters may be rewritten",
        tip: "Validity becomes length minus the most frequent character count being at most k. Recomputing that maximum is O(26) per step, but a stale never-decreasing maxCount still yields the correct answer because the window only needs to grow. O(n) time.",
        snippet: "std::array<int,26> cnt{};\nint l = 0, maxCount = 0, best = 0;\nfor (int r = 0; r < (int)s.size(); ++r) {\n  maxCount = std::max(maxCount, ++cnt[s[r] - 'A']);\n  while (r - l + 1 - maxCount > k) --cnt[s[l++] - 'A'];\n  best = std::max(best, r - l + 1);\n}\nreturn best;"
      },
      {
        variation: "Longest substring with no repeats in a *subsequence* sense, i.e. all distinct characters",
        tip: "Once contiguity is dropped the window argument disappears entirely: the answer is just the number of distinct characters present. Recognising that the sliding window is the wrong tool is the point of this follow-up. O(n) time and O(k) space.",
        snippet: "std::unordered_set<char> seen(s.begin(), s.end());\nreturn (int)seen.size();"
      },
      {
        variation: "Longest substring where every character appears at least k times",
        tip: "This is not a valid window predicate, because adding a character can break a condition that shrinking cannot repair. Use divide and conquer instead: any character occurring fewer than k times overall can never be included, so split on it and recurse. O(n * 26) in practice.",
        snippet: "std::function<int(int,int)> go = [&](int lo, int hi) -> int {\n  if (hi - lo < k) return 0;\n  std::array<int,26> cnt{};\n  for (int i = lo; i < hi; ++i) ++cnt[s[i]-'a'];\n  for (int i = lo; i < hi; ++i)\n    if (cnt[s[i]-'a'] < k)                       // split point\n      return std::max(go(lo, i), go(i + 1, hi));\n  return hi - lo;\n};\nreturn go(0, s.size());"
      }
    ]
  },

  {
    id: "topic-arrays-container-water",
    moduleId: "mod-two-pointers-sliding",
    title: "Container With Most Water",
    intuition: "Two pointers moving inward. Area = width × min(height). Greedy: reduce smaller height.",
    lesson: [
      {
        title: "Two Pointer Greedy",
        content: "Start with widest container. Move the pointer pointing to smaller height inward. Never move taller height pointer (area only shrinks if we do).",
        codeExample: "int left = 0, right = n - 1, maxArea = 0;\nwhile (left < right) {\n  maxArea = max(maxArea, min(height[left], height[right]) * (right - left));\n  if (height[left] < height[right]) left++;\n  else right--;\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Container Water",
        input: "height = [1,8,6,2,5,4,8,3,7]",
        output: "49",
        explanation: "Indices 1 and 8: min(8,7) × (8-1) = 7 × 7 = 49.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    references: [{ source: "leetcode", attribution: "LeetCode #11", insight: "Greedy two pointer optimization." }],
    practiceProblems: [
      {
        variation: "Return the two line indices, not just the area",
        tip: "The greedy pointer walk already visits the optimal pair, so you only need to record the indices at the moment the best area improves. Do not try to recover them afterwards, since both pointers keep moving. Complexity is unchanged at O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1, bl = 0, br = n - 1; long long best = 0;\nwhile (l < r) {\n  long long area = (long long)std::min(h[l], h[r]) * (r - l);\n  if (area > best) { best = area; bl = l; br = r; }\n  if (h[l] < h[r]) ++l; else --r;\n}\nreturn {bl, br};"
      },
      {
        variation: "Trapping Rain Water — total water held, not the single largest container",
        tip: "The greedy 'move the shorter side' rule survives, but the pointers must now carry running maxima, because water above each bar is min(maxLeft, maxRight) minus its height. Accumulate as you advance rather than comparing whole containers. O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1, lm = 0, rm = 0; long long water = 0;\nwhile (l < r) {\n  if (h[l] < h[r]) { lm = std::max(lm, h[l]); water += lm - h[l]; ++l; }\n  else             { rm = std::max(rm, h[r]); water += rm - h[r]; --r; }\n}\nreturn water;"
      },
      {
        variation: "The container's capacity is limited by width, e.g. the lines must be at most W apart",
        tip: "The greedy proof relies on width shrinking monotonically, and a hard width cap invalidates the wide-first ordering. Fall back to a sliding window over allowed widths with a monotonic deque tracking the tallest usable line, giving O(n) instead of O(n^2) brute force.",
        snippet: "std::deque<int> dq;   // indices, heights decreasing\nlong long best = 0;\nfor (int r = 0; r < n; ++r) {\n  while (!dq.empty() && dq.front() < r - W) dq.pop_front();\n  if (!dq.empty()) best = std::max(best,\n      (long long)std::min(h[dq.front()], h[r]) * (r - dq.front()));\n  while (!dq.empty() && h[dq.back()] <= h[r]) dq.pop_back();\n  dq.push_back(r);\n}\nreturn best;"
      },
      {
        variation: "Largest Rectangle in Histogram — the bars are solid, not thin lines",
        tip: "Solid bars mean the rectangle height is limited by the minimum bar inside the span, not by the two endpoints, so the two-pointer greedy is invalid. Use a monotonic increasing stack where each pop yields a bar's maximal span. O(n) time and O(n) space.",
        snippet: "std::stack<int> st; long long best = 0;\nfor (int i = 0; i <= n; ++i) {\n  int cur = (i == n) ? 0 : h[i];\n  while (!st.empty() && cur < h[st.top()]) {\n    int ht = h[st.top()]; st.pop();\n    int left = st.empty() ? -1 : st.top();\n    best = std::max(best, (long long)ht * (i - left - 1));\n  }\n  st.push(i);\n}\nreturn best;"
      },
      {
        variation: "Heights arrive as a stream and you must answer the best container so far",
        tip: "Two pointers require random access to both ends, which a stream denies. Keep a monotonic stack of candidate left walls (strictly decreasing heights are useless, so keep increasing prefixes) and probe it on each arrival. This is O(n) total with O(n) worst-case space.",
        snippet: "std::vector<int> cand;   // indices with strictly increasing heights\nlong long best = 0;\nfor (int r = 0; r < n; ++r) {\n  for (int i : cand) best = std::max(best, (long long)std::min(h[i], h[r]) * (r - i));\n  if (cand.empty() || h[r] > h[cand.back()]) cand.push_back(r);\n}\nreturn best;"
      },
      {
        variation: "Prove why moving the taller line can never help",
        tip: "This is asked verbally and candidates who cannot answer it lose the point. The area is min(h[l], h[r]) * (r - l); moving the taller pointer strictly shrinks the width while the height stays capped by the shorter line, so the area cannot increase. Therefore discarding the shorter line is safe.",
        snippet: "// area(l, r) = min(h[l], h[r]) * (r - l)\n// suppose h[l] < h[r] and we move r inward to r':\n//   width  (r' - l) < (r - l)\n//   height min(h[l], h[r']) <= h[l]\n// => area(l, r') < area(l, r). Hence only moving l can improve."
      }
    ]
  },

  {
    id: "topic-arrays-remove-duplicates",
    moduleId: "mod-two-pointers-sliding",
    title: "Remove Duplicates (Modify In-Place)",
    intuition: "Two pointers in single array. One pointer for next valid position, one for scan. Modify array without extra space.",
    lesson: [
      {
        title: "In-Place Modification",
        content: "Sorted array allows unique detection. One pointer (j) tracks next unique position. Other pointer (i) scans. Copy unique elements to position j.",
        codeExample: "int j = 0;\nfor (int i = 1; i < n; i++) {\n  if (nums[i] != nums[i - 1]) nums[++j] = nums[i];\n}\nreturn j + 1;",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Remove Duplicates",
        input: "nums = [0,0,1,1,1,2,2,3,3,4]",
        output: "5, nums = [0,1,2,3,4,_,_,_,_,_]",
        explanation: "j=0: place 0. j=1: place 1. j=2: place 2. j=3: place 3. j=4: place 4. Return 5.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    references: [{ source: "leetcode", attribution: "LeetCode #26", insight: "Foundation for all in-place array modifications." }],
    practiceProblems: [
      {
        variation: "Remove Duplicates from Sorted Array — keep one copy, return the new length",
        tip: "Both pointers travel in the same direction here: a slow write index and a fast read index. Only advance the writer when the reader finds a value different from the last one kept. O(n) time and O(1) space; the tail past the returned length is ignored.",
        snippet: "if (n == 0) return 0;\nint w = 1;\nfor (int r = 1; r < n; ++r)\n  if (a[r] != a[w - 1]) a[w++] = a[r];\nreturn w;"
      },
      {
        variation: "Allow each value at most twice (and, generally, at most k times)",
        tip: "Compare against the element k positions back in the written prefix instead of the immediately previous one — that single change encodes the 'at most k' rule. Generalising to arbitrary k is a one-character edit, which is exactly what the interviewer is probing. Still O(n)/O(1).",
        snippet: "int k = 2, w = 0;\nfor (int r = 0; r < n; ++r)\n  if (w < k || a[r] != a[w - k]) a[w++] = a[r];\nreturn w;"
      },
      {
        variation: "Remove all elements equal to a given value, order not preserved",
        tip: "Because order is irrelevant you can avoid shifting entirely: swap the offending element with the last live element and shrink the logical size. That does fewer writes than the compaction scan when matches are rare. O(n) time and O(1) space.",
        snippet: "int n2 = n;\nfor (int i = 0; i < n2; ) {\n  if (a[i] == val) a[i] = a[--n2];   // pull the tail element in\n  else ++i;\n}\nreturn n2;"
      },
      {
        variation: "Move Zeroes to the end while keeping the order of the non-zero values",
        tip: "Order preservation rules out the swap-with-tail trick. Compact the non-zeros forward with a write pointer, then fill the remainder with zeros — or swap read and write positions to do it in a single pass. O(n) time and O(1) space.",
        snippet: "int w = 0;\nfor (int r = 0; r < n; ++r)\n  if (a[r] != 0) std::swap(a[w++], a[r]);\n// everything from index w onward is now zero"
      },
      {
        variation: "The array is unsorted — remove duplicates while preserving first-occurrence order",
        tip: "Without sortedness, adjacency no longer implies duplication, so the O(1)-space comparison fails. You need a hash set of seen values, which costs O(n) space for O(n) time; sorting first would be O(n log n) and would destroy the required ordering.",
        snippet: "std::unordered_set<int> seen;\nint w = 0;\nfor (int r = 0; r < n; ++r)\n  if (seen.insert(a[r]).second) a[w++] = a[r];\nreturn w;"
      },
      {
        variation: "Remove duplicates from a sorted linked list, deleting every duplicated value entirely",
        tip: "In a list you cannot overwrite in place with an index, and 'delete all copies' means even the first occurrence goes. Use a dummy head plus a prev pointer, and when a run of equal values is detected, skip the whole run at once. O(n) time and O(1) space.",
        snippet: "ListNode dummy(0, head); ListNode* prev = &dummy;\nListNode* cur = head;\nwhile (cur) {\n  if (cur->next && cur->next->val == cur->val) {\n    int v = cur->val;\n    while (cur && cur->val == v) cur = cur->next;   // skip the whole run\n    prev->next = cur;\n  } else { prev = cur; cur = cur->next; }\n}\nreturn dummy.next;"
      }
    ]
  },

  {
    id: "topic-arrays-trapping-rain",
    moduleId: "mod-stack-monotonic",
    title: "Trapping Rain Water",
    intuition: "For each position, trapped water = min(maxLeft, maxRight) - height. Precompute max heights on both sides.",
    lesson: [
      {
        title: "Precomputation Strategy",
        content: "Water trapped at position i depends on tallest bar to left and right. Precompute these in O(n) time, then calculate trap amount in O(1) per position.",
        codeExample: "vector<int> leftMax(n), rightMax(n);\nleftMax[0] = height[0];\nfor (int i = 1; i < n; i++) leftMax[i] = max(leftMax[i-1], height[i]);\nrightMax[n-1] = height[n-1];\nfor (int i = n-2; i >= 0; i--) rightMax[i] = max(rightMax[i+1], height[i]);\nint water = 0;\nfor (int i = 0; i < n; i++) water += min(leftMax[i], rightMax[i]) - height[i];",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Trap Water",
        input: "height = [0,1,0,2,1,0,1,4,6]",
        output: "6",
        explanation: "At index 2: water = min(1,4) - 0 = 1. At index 4: water = min(2,4) - 1 = 1. Total trapped = 6 units.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: ["Two pass solution: O(n) time, O(n) space. Two pointer: O(n) time, O(1) space."],
    references: [{ source: "leetcode", attribution: "LeetCode #42", insight: "Hard level, requires spatial reasoning." }],
    practiceProblems: [
      {
        variation: "Solve it with prefix and suffix maximum arrays first",
        tip: "Water above index i is min(maxLeft[i], maxRight[i]) minus height[i], which is easiest to see with two precomputed arrays. This is O(n) time but O(n) space, and it is the version you should present before optimising. Getting it right first makes the O(1) version easy to justify.",
        snippet: "std::vector<int> L(n), R(n);\nL[0] = h[0];\nfor (int i = 1; i < n; ++i) L[i] = std::max(L[i-1], h[i]);\nR[n-1] = h[n-1];\nfor (int i = n-2; i >= 0; --i) R[i] = std::max(R[i+1], h[i]);\nlong long water = 0;\nfor (int i = 0; i < n; ++i) water += std::min(L[i], R[i]) - h[i];\nreturn water;"
      },
      {
        variation: "Reduce the space to O(1) with two pointers",
        tip: "You never need both maxima exactly — only the smaller one, which bounds the water level. Advance whichever side has the shorter bar, because that side's running max is guaranteed to be the true limiter there. O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1, lm = 0, rm = 0; long long water = 0;\nwhile (l < r) {\n  if (h[l] < h[r]) { lm = std::max(lm, h[l]); water += lm - h[l]; ++l; }\n  else             { rm = std::max(rm, h[r]); water += rm - h[r]; --r; }\n}\nreturn water;"
      },
      {
        variation: "Solve it with a monotonic stack, filling water layer by layer",
        tip: "Instead of computing per-column water, the stack computes horizontal slabs: each pop identifies a valley bounded by the new bar and the bar beneath it. Water added is the bounded height times the span. O(n) time and O(n) space; useful when the interviewer asks for a third approach.",
        snippet: "std::stack<int> st; long long water = 0;\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && h[i] > h[st.top()]) {\n    int bottom = st.top(); st.pop();\n    if (st.empty()) break;\n    int width = i - st.top() - 1;\n    int bounded = std::min(h[i], h[st.top()]) - h[bottom];\n    water += (long long)width * bounded;\n  }\n  st.push(i);\n}\nreturn water;"
      },
      {
        variation: "Container With Most Water — the bars are thin lines, so only the endpoints matter",
        tip: "Here the interior bars are irrelevant, which makes the greedy simpler: always move the shorter endpoint because keeping it can never raise the height while width only shrinks. Do not carry running maxima; they belong to the trapping variant. O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1; long long best = 0;\nwhile (l < r) {\n  best = std::max(best, (long long)std::min(h[l], h[r]) * (r - l));\n  if (h[l] < h[r]) ++l; else --r;\n}\nreturn best;"
      },
      {
        variation: "Trapping Rain Water II — the heightmap is 2D",
        tip: "Water can escape in any direction, so the left/right maxima argument collapses. Process cells from the border inward using a min-heap keyed by height: the current lowest boundary determines the water level, and every neighbour below it fills up to that level. O(mn log(mn)).",
        snippet: "std::priority_queue<std::tuple<int,int,int>,\n  std::vector<std::tuple<int,int,int>>, std::greater<>> pq;   // {height, r, c}\n// push and mark the whole border first, then:\nwhile (!pq.empty()) {\n  auto [ht, r, c] = pq.top(); pq.pop();\n  for (auto [nr, nc] : neighbours(r, c)) {\n    if (visited[nr][nc]) continue;\n    visited[nr][nc] = true;\n    water += std::max(0, ht - grid[nr][nc]);\n    pq.push({std::max(ht, grid[nr][nc]), nr, nc});\n  }\n}"
      },
      {
        variation: "The heights arrive as a stream and you must report the total so far",
        tip: "Two pointers need both ends up front, which a stream denies. Keep a decreasing monotonic stack and settle water whenever a taller bar arrives, exactly as in the slab method — that method is inherently online. Amortised O(1) per element with O(n) worst-case space.",
        snippet: "std::stack<int> st; long long water = 0;   // st holds indices, heights decreasing\nvoid offer(int i, int height) {\n  while (!st.empty() && height > h[st.top()]) {\n    int bottom = st.top(); st.pop();\n    if (st.empty()) break;\n    water += (long long)(i - st.top() - 1) *\n             (std::min(height, h[st.top()]) - h[bottom]);\n  }\n  st.push(i);\n}"
      }
    ]
  },

  {
    id: "topic-arrays-rotate-array",
    moduleId: "mod-arrays-strings",
    title: "Rotate Array",
    intuition: "Rotate right by k = reverse entire array, reverse first k, reverse rest. Three reverse operations = rotation.",
    lesson: [
      {
        title: "Reverse-Based Rotation",
        content: "Rotating array right by k steps is same as moving last k elements to front. Use reverse tricks: reverse all, reverse first k, reverse remaining.",
        codeExample: "reverse(nums.begin(), nums.end());\nreverse(nums.begin(), nums.begin() + k);\nreverse(nums.begin() + k, nums.end());",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Rotate Array",
        input: "nums = [1,2,3,4,5], k = 2",
        output: "[4,5,1,2,3]",
        explanation: "Reverse all: [5,4,3,2,1]. Reverse first 2: [4,5,3,2,1]. Reverse last 3: [4,5,1,2,3].",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: ["Handle k > n with k = k % n"],
    references: [{ source: "leetcode", attribution: "LeetCode #189", insight: "Tests in-place manipulation and modular arithmetic." }],
    practiceProblems: [
      {
        variation: "Rotate right by k in place with O(1) extra space",
        tip: "Shifting by one k times is O(n*k). The triple-reversal trick is O(n) time and O(1) space: reverse the whole array, then the first k, then the rest. Reduce k modulo n first or the sub-ranges run off the end.",
        snippet: "int n = a.size(); if (n == 0) return;\nk %= n;\nstd::reverse(a.begin(), a.end());\nstd::reverse(a.begin(), a.begin() + k);\nstd::reverse(a.begin() + k, a.end());"
      },
      {
        variation: "Rotate left by k, and k may be negative",
        tip: "A left rotation by k equals a right rotation by n-k, so translate rather than writing a second algorithm. Normalise with ((k % n) + n) % n so negative k is handled, otherwise n-k goes out of range. Same O(n)/O(1) bounds.",
        snippet: "int n = a.size(); if (n == 0) return;\nk = ((k % n) + n) % n;\nint r = (n - k) % n;\nstd::reverse(a.begin(), a.end());\nstd::reverse(a.begin(), a.begin() + r);\nstd::reverse(a.begin() + r, a.end());"
      },
      {
        variation: "Rotate using cyclic replacements instead of reversals",
        tip: "The reversal approach writes every element twice; cyclic replacement writes each exactly once. Follow the permutation cycles, and stop after n moves — the number of cycles is gcd(n, k), which is why a naive single loop misses elements when k and n share a factor.",
        snippet: "int n = a.size(); k %= n;\nfor (int start = 0, moved = 0; moved < n; ++start) {\n  int cur = start, prev = a[start];\n  do {\n    int next = (cur + k) % n;\n    std::swap(prev, a[next]);\n    cur = next;\n    ++moved;\n  } while (cur != start);\n}"
      },
      {
        variation: "Rotate an n x n matrix by 90 degrees in place",
        tip: "The 1D reversal has a 2D analogue: transpose the matrix, then reverse each row for a clockwise turn. Reverse the row order instead of each row to go counter-clockwise. Both are O(n^2) time and O(1) extra space; naming which one you're doing avoids a silent off-by-a-quarter-turn.",
        snippet: "for (int i = 0; i < n; ++i)\n  for (int j = i + 1; j < n; ++j) std::swap(a[i][j], a[j][i]);   // transpose\nfor (auto& row : a) std::reverse(row.begin(), row.end());        // clockwise"
      },
      {
        variation: "Many rotations interleaved with reads — avoid touching the array each time",
        tip: "Physically rotating per call is O(n) each time. Keep a logical offset and translate index i to (i + offset) % n on read, making rotation O(1) and reads still O(1). Materialise the offset before any structural change such as a push_back.",
        snippet: "struct RotView {\n  std::vector<int> a; size_t off = 0;\n  int get(size_t i) const { return a[(i + off) % a.size()]; }\n  void rotateRight(size_t k) { off = (off + a.size() - k % a.size()) % a.size(); }\n  void materialize() { std::rotate(a.begin(), a.begin() + off, a.end()); off = 0; }\n};"
      },
      {
        variation: "Search a rotated sorted array — rotation as an input property, not an operation",
        tip: "The array is no longer globally sorted, so plain binary search is invalid. At each step exactly one half is sorted; identify it by comparing a[lo] to a[mid], then test whether the target falls inside that half's range. O(log n), degrading to O(n) if duplicates are allowed.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] == target) return mid;\n  if (a[lo] <= a[mid]) {\n    if (a[lo] <= target && target < a[mid]) hi = mid - 1; else lo = mid + 1;\n  } else {\n    if (a[mid] < target && target <= a[hi]) lo = mid + 1; else hi = mid - 1;\n  }\n}\nreturn -1;"
      }
    ]
  },

  {
    id: "topic-strings-valid-parentheses",
    moduleId: "mod-stack-monotonic",
    title: "Valid Parentheses",
    intuition: "Use stack to match opening/closing brackets. Push open, pop and verify close. Stack empty at end = valid.",
    lesson: [
      {
        title: "Stack-Based Matching",
        content: "Process each character. Opening bracket: push. Closing bracket: pop from stack and verify match. Empty stack at end means balanced.",
        codeExample: "stack<char> st;\nunordered_map<char, char> match = {')', '(', '}', '{', ']', '['};\nfor (char c : s) {\n  if (match.count(c)) {\n    if (st.empty() || st.top() != match[c]) return false;\n    st.pop();\n  } else st.push(c);\n}\nreturn st.empty();",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Valid Parentheses",
        input: 's = \"()[]{}\"',
        output: "true",
        explanation: "Push (, push [, push {, pop } matches {, pop ] matches [, pop ) matches (. Stack empty ? true.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    references: [{ source: "leetcode", attribution: "LeetCode #20", insight: "Fundamental stack problem, used in parsing." }],
    practiceProblems: [
      {
        variation: "Three bracket types instead of one",
        tip: "A counter suffices for a single bracket type but cannot enforce cross-type nesting: \"([)]\" would pass. Push openers and check the top matches the expected partner on every closer, then reject a non-empty stack at the end. O(n) time and O(n) space.",
        snippet: "std::stack<char> st;\nfor (char c : s) {\n  if (c=='('||c=='['||c=='{') st.push(c);\n  else {\n    if (st.empty()) return false;\n    char t = st.top(); st.pop();\n    if ((c==')'&&t!='(')||(c==']'&&t!='[')||(c=='}'&&t!='{')) return false;\n  }\n}\nreturn st.empty();"
      },
      {
        variation: "Only one bracket type — can you do it in O(1) space?",
        tip: "With a single type the stack degenerates to a depth counter, so the space drops to O(1). Increment on an opener, decrement on a closer, and fail immediately if the depth goes negative. Ending at exactly zero is the acceptance condition.",
        snippet: "int depth = 0;\nfor (char c : s) {\n  depth += (c == '(') ? 1 : -1;\n  if (depth < 0) return false;      // closer with nothing open\n}\nreturn depth == 0;"
      },
      {
        variation: "Minimum Add to Make Parentheses Valid — count the fixes instead of rejecting",
        tip: "Instead of failing on a negative depth, absorb the error: record one required opener and reset the depth to zero. Any leftover positive depth at the end is the number of missing closers. O(n) time and O(1) space.",
        snippet: "int open = 0, need = 0;\nfor (char c : s) {\n  if (c == '(') ++open;\n  else if (open) --open;\n  else ++need;                     // unmatched ')'\n}\nreturn need + open;"
      },
      {
        variation: "Longest Valid Parentheses substring",
        tip: "A boolean answer needs no positions, but a length does, so push indices and seed the stack with -1 as a base. After each pop the current run length is i minus the new top; if the stack empties, push i as a fresh base. O(n) time and O(n) space.",
        snippet: "std::stack<int> st; st.push(-1);\nint best = 0;\nfor (int i = 0; i < (int)s.size(); ++i) {\n  if (s[i]=='(') st.push(i);\n  else {\n    st.pop();\n    if (st.empty()) st.push(i);\n    else best = std::max(best, i - st.top());\n  }\n}\nreturn best;"
      },
      {
        variation: "Valid Parenthesis String — '*' can be an opener, a closer, or empty",
        tip: "The wildcard destroys the single-counter invariant, since the depth is now a range rather than a number. Track the minimum and maximum possible open counts, clamping the minimum at zero, and accept if the minimum can reach zero. O(n) time and O(1) space, far better than backtracking.",
        snippet: "int lo = 0, hi = 0;\nfor (char c : s) {\n  lo += (c == '(') ? 1 : -1;\n  hi += (c == ')') ? -1 : 1;\n  if (hi < 0) return false;        // too many closers even at best\n  lo = std::max(lo, 0);\n}\nreturn lo == 0;"
      },
      {
        variation: "Remove the minimum number of parentheses to make the string valid",
        tip: "Validation alone does not tell you which characters to drop, so record indices as you go: unmatched closers are found on the forward pass, and whatever remains on the stack afterwards is the unmatched openers. Delete from the highest index down so earlier indices stay valid. O(n).",
        snippet: "std::stack<int> st; std::set<int,std::greater<int>> drop;\nfor (int i = 0; i < (int)s.size(); ++i) {\n  if (s[i]=='(') st.push(i);\n  else if (s[i]==')') { if (st.empty()) drop.insert(i); else st.pop(); }\n}\nwhile (!st.empty()) { drop.insert(st.top()); st.pop(); }\nfor (int i : drop) s.erase(i, 1);   // descending order keeps indices valid\nreturn s;"
      }
    ]
  },

  // ===== TWO POINTERS & SLIDING WINDOW (8 Topics) =====
  {
    id: "topic-two-pointers-sort-colors",
    moduleId: "mod-two-pointers-sliding",
    title: "Sort Colors (Dutch Flag Problem)",
    intuition: "Three colors need sorting without extra space. Use three pointers: red=0, white=mid, blue=n-1. Swap to correct positions in one pass.",
    lesson: [
      {
        title: "Three Pointer Technique",
        content: "Maintain three pointers for three regions: reds (0 to red), whites (red+1 to mid), blues (mid+1 to blue-1), unknowns (blue to end). Process unknowns.",
        codeExample: "int red = 0, mid = 0, blue = n - 1;\nwhile (mid <= blue) {\n  if (nums[mid] == 0) swap(nums[red++], nums[mid++]);\n  else if (nums[mid] == 2) swap(nums[mid], nums[blue--]);\n  else mid++;\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Sort Colors",
        input: "nums = [2,0,2,1,1,0]",
        output: "[0,0,1,1,2,2]",
        explanation: "mid=0, nums[0]=2?swap with blue, [0,0,2,1,1,2]. mid=0, nums[0]=0?swap with red, [0,0,2,1,1,2]... Eventually sorted.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    references: [{ source: "leetcode", attribution: "LeetCode #75", insight: "Classic in-place partitioning problem." }],
    practiceProblems: [
      {
        variation: "Two passes with counting sort instead of one pass",
        tip: "Counting the three values then overwriting the array is simpler to get right and still O(n) time with O(1) space. Present it first, then note the interviewer's usual follow-up is to do it in a single pass. It also generalises trivially to more than three values.",
        snippet: "int cnt[3] = {0, 0, 0};\nfor (int x : a) ++cnt[x];\nint w = 0;\nfor (int v = 0; v < 3; ++v)\n  for (int i = 0; i < cnt[v]; ++i) a[w++] = v;"
      },
      {
        variation: "One-pass Dutch national flag partition",
        tip: "Three pointers replace two: a low boundary, a scanning mid, and a high boundary. When you swap with high you pull in an unexamined element, so mid must not advance in that branch — that asymmetry is the classic bug. O(n) time and O(1) space.",
        snippet: "int lo = 0, mid = 0, hi = n - 1;\nwhile (mid <= hi) {\n  if (a[mid] == 0) std::swap(a[lo++], a[mid++]);\n  else if (a[mid] == 2) std::swap(a[mid], a[hi--]);   // mid stays put\n  else ++mid;\n}"
      },
      {
        variation: "Only two distinct values (Move Zeroes style)",
        tip: "With two groups the high pointer disappears and you are back to a single write pointer scanning forward. Swapping rather than assigning preserves the relative order of the non-zero values, which the problem usually requires. O(n) time and O(1) space.",
        snippet: "int w = 0;\nfor (int r = 0; r < n; ++r)\n  if (a[r] != 0) std::swap(a[w++], a[r]);\n// indices >= w are all zero"
      },
      {
        variation: "k distinct categories rather than exactly three",
        tip: "The three-pointer trick does not extend past three groups, so switch to counting sort over k buckets: one pass to count, one to rewrite. That is O(n + k) time and O(k) space. Say explicitly that the Dutch flag is a special case, not the general answer.",
        snippet: "std::vector<int> cnt(k, 0);\nfor (int x : a) ++cnt[x];\nint w = 0;\nfor (int v = 0; v < k; ++v)\n  while (cnt[v]--) a[w++] = v;"
      },
      {
        variation: "Partition around an arbitrary pivot value (Quicksort's inner loop)",
        tip: "The categories are now defined by a comparison rather than by equality, giving the three-way partition used by Quicksort on duplicate-heavy input. Keeping equal elements in the middle band means those elements are never recursed on, which fixes Quicksort's O(n^2) blow-up on many duplicates.",
        snippet: "int lo = 0, mid = 0, hi = n - 1;\nwhile (mid <= hi) {\n  if (a[mid] < pivot) std::swap(a[lo++], a[mid++]);\n  else if (a[mid] > pivot) std::swap(a[mid], a[hi--]);\n  else ++mid;\n}\n// [0,lo) < pivot, [lo,hi] == pivot, (hi,n) > pivot"
      },
      {
        variation: "Sort the colours when the array is read-only and you may only report the counts",
        tip: "Without mutation you cannot partition at all, so the answer becomes a frequency summary rather than a rearrangement. This is O(n) time and O(k) space, and it is worth checking with the interviewer whether the output must be the array or just the distribution.",
        snippet: "std::array<int,3> cnt{};\nfor (int x : a) ++cnt[x];\nreturn cnt;   // {#reds, #whites, #blues} without touching the input"
      }
    ]
  },

  {
    id: "topic-two-pointers-merge-sorted",
    moduleId: "mod-two-pointers-sliding",
    title: "Merge Sorted Arrays",
    intuition: "Two sorted arrays ? one sorted. Use two pointers from start, compare and place smaller element. Fill remaining in one pass.",
    lesson: [
      {
        title: "Two Pointer Merge",
        content: "Start from beginning of both arrays. Compare elements, place smaller in result. Move that pointer. Continue until one array exhausted, then append remaining.",
        codeExample: "int i = 0, j = 0, k = 0;\nwhile (i < m && j < n) {\n  if (nums1[i] <= nums2[j]) result[k++] = nums1[i++];\n  else result[k++] = nums2[j++];\n}\nwhile (i < m) result[k++] = nums1[i++];\nwhile (j < n) result[k++] = nums2[j++];",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Merge Sorted",
        input: "nums1 = [1,3], nums2 = [2]",
        output: "[1,2,3]",
        explanation: "Compare 1 and 2: place 1. Compare 3 and 2: place 2. Place 3. Result: [1,2,3].",
        diagram: undefined
      }
    ],
    complexity: { time: "O(m+n)", space: "O(m+n)" },
    tips: ["Can merge in-place if nums1 has extra space at end, traverse backwards"],
    references: [{ source: "leetcode", attribution: "LeetCode #88", insight: "Foundation for merge sort algorithm." }],
    practiceProblems: [
      {
        variation: "Merge into the first array in place, which has trailing space for both",
        tip: "Merging forward would overwrite unread elements of the first array. Fill from the back instead, comparing the two largest remaining values, so every write lands on a slot you have already consumed. O(m + n) time and O(1) extra space.",
        snippet: "int i = m - 1, j = n - 1, w = m + n - 1;\nwhile (j >= 0) {\n  if (i >= 0 && a[i] > b[j]) a[w--] = a[i--];\n  else a[w--] = b[j--];\n}"
      },
      {
        variation: "Merge k sorted arrays instead of two",
        tip: "Merging pairwise left to right is O(kn) per merge and O(k^2 n) overall. Use a min-heap holding one element per list so each extraction is O(log k), giving O(N log k) total. Divide-and-conquer pairing gets the same bound and is easier to write recursively.",
        snippet: "struct Node { int val, list, idx; };\nauto cmp = [](const Node& x, const Node& y) { return x.val > y.val; };\nstd::priority_queue<Node, std::vector<Node>, decltype(cmp)> pq(cmp);\nfor (int i = 0; i < k; ++i) if (!v[i].empty()) pq.push({v[i][0], i, 0});\nwhile (!pq.empty()) {\n  auto [val, li, idx] = pq.top(); pq.pop();\n  out.push_back(val);\n  if (idx + 1 < (int)v[li].size()) pq.push({v[li][idx+1], li, idx+1});\n}"
      },
      {
        variation: "Merge two sorted linked lists by relinking nodes, not copying values",
        tip: "There is no back-to-front option in a singly linked list, so merge forward and splice nodes. A dummy head removes every 'is this the first node' branch, and at the end you attach the remaining list in one step. O(m + n) time and O(1) extra space.",
        snippet: "ListNode dummy(0); ListNode* tail = &dummy;\nwhile (a && b) {\n  if (a->val <= b->val) { tail->next = a; a = a->next; }\n  else                  { tail->next = b; b = b->next; }\n  tail = tail->next;\n}\ntail->next = a ? a : b;\nreturn dummy.next;"
      },
      {
        variation: "Merge Intervals — the elements are ranges that can overlap",
        tip: "Sortedness by start is what makes a single sweep valid, so sort first if the input is unordered. Extend the current interval's end with a max rather than assigning, because one interval may be fully contained in another. O(n log n) dominated by the sort.",
        snippet: "std::sort(iv.begin(), iv.end());\nstd::vector<std::vector<int>> out;\nfor (auto& x : iv) {\n  if (!out.empty() && x[0] <= out.back()[1])\n    out.back()[1] = std::max(out.back()[1], x[1]);\n  else out.push_back(x);\n}\nreturn out;"
      },
      {
        variation: "Find the median of two sorted arrays in O(log(m+n))",
        tip: "Merging is O(m + n), which the follow-up rejects. Binary search the partition point in the shorter array so that the left halves of both arrays together hold exactly half the elements, then the median comes from the four boundary values. O(log(min(m,n))) time.",
        snippet: "if (A.size() > B.size()) std::swap(A, B);\nint m = A.size(), n = B.size(), half = (m + n + 1) / 2;\nint lo = 0, hi = m;\nwhile (lo <= hi) {\n  int i = (lo + hi) / 2, j = half - i;\n  int Al = i ? A[i-1] : INT_MIN, Ar = i < m ? A[i] : INT_MAX;\n  int Bl = j ? B[j-1] : INT_MIN, Br = j < n ? B[j] : INT_MAX;\n  if (Al <= Br && Bl <= Ar)\n    return (m + n) % 2 ? std::max(Al, Bl)\n                       : (std::max(Al, Bl) + std::min(Ar, Br)) / 2.0;\n  if (Al > Br) hi = i - 1; else lo = i + 1;\n}"
      },
      {
        variation: "The inputs are sorted streams too large to hold in memory",
        tip: "You cannot index either side, so the back-to-front trick is unavailable and the output must also be streamed. Keep one buffered element per stream and emit the smaller, refilling from that stream — this is exactly the external merge used by on-disk sorting. O(m + n) time and O(1) memory.",
        snippet: "std::optional<int> x = next(A), y = next(B);\nwhile (x || y) {\n  if (!y || (x && *x <= *y)) { emit(*x); x = next(A); }\n  else                       { emit(*y); y = next(B); }\n}"
      }
    ]
  },

  {
    id: "topic-two-pointers-partition",
    moduleId: "mod-two-pointers-sliding",
    title: "Partition Array",
    intuition: "Divide array into two parts (even/odd, positive/negative). Two pointers from ends meet in middle, swapping violating elements.",
    lesson: [
      {
        title: "Bidirectional Partitioning",
        content: "One pointer starts left (finds element that should be right), one starts right (finds element that should be left). Swap and continue until they cross.",
        codeExample: "int left = 0, right = n - 1;\nwhile (left < right) {\n  while (left < right && isOdd(nums[left])) left++;\n  while (left < right && isEven(nums[right])) right--;\n  swap(nums[left], nums[right]);\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Partition Even Odd",
        input: "nums = [1,2,3,4]",
        output: "[1,3,2,4] or [3,1,4,2] (any valid even-odd partition)",
        explanation: "left at 1 (odd), right at 4 (even), swap ? continue until partitioned.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    references: [{ source: "blog", attribution: "GeeksforGeeks", insight: "Used in quicksort partitioning." }],
    practiceProblems: [
      {
        variation: "Two-way partition around a pivot, order within each side irrelevant",
        tip: "Because order does not matter you can use converging pointers and swap mismatched pairs, which does the fewest possible writes. The Lomuto single-pointer scan is simpler but writes more. Both are O(n) time and O(1) space.",
        snippet: "int l = 0, r = n - 1;\nwhile (l <= r) {\n  if (a[l] < pivot) ++l;\n  else if (a[r] >= pivot) --r;\n  else std::swap(a[l++], a[r--]);\n}\nreturn l;   // first index of the >= pivot side"
      },
      {
        variation: "Stable partition — the relative order inside each group must be preserved",
        tip: "Swapping destroys order, so the in-place O(1) trick is off the table. The straightforward answer copies into two buffers and concatenates for O(n) time and O(n) space; a rotation-based in-place stable partition exists but costs O(n log n). State the trade explicitly.",
        snippet: "std::vector<int> lo, hi;\nfor (int x : a) (x < pivot ? lo : hi).push_back(x);\nstd::copy(lo.begin(), lo.end(), a.begin());\nstd::copy(hi.begin(), hi.end(), a.begin() + lo.size());"
      },
      {
        variation: "Three-way partition when the array has many values equal to the pivot",
        tip: "Two-way partitioning re-processes the equal block on every recursion, which is what makes Quicksort O(n^2) on duplicate-heavy input. The Dutch flag layout isolates equals into a middle band that is never recursed on. O(n) time and O(1) space.",
        snippet: "int lo = 0, mid = 0, hi = n - 1;\nwhile (mid <= hi) {\n  if (a[mid] < pivot) std::swap(a[lo++], a[mid++]);\n  else if (a[mid] > pivot) std::swap(a[mid], a[hi--]);\n  else ++mid;\n}\n// [0,lo) < pivot, [lo,hi] == pivot, (hi,n) > pivot"
      },
      {
        variation: "Quickselect — find the kth smallest without fully sorting",
        tip: "Sorting is O(n log n), but partitioning tells you which side k lives in, so you recurse into one side only. That gives O(n) expected time by the geometric series, though O(n^2) worst case unless you randomise the pivot. Randomising is the mitigation interviewers want to hear.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (true) {\n  int p = partition(a, lo, hi);        // returns final pivot index\n  if (p == k) return a[p];\n  if (p < k) lo = p + 1; else hi = p - 1;\n}"
      },
      {
        variation: "Partition a linked list around a value, preserving relative order",
        tip: "You cannot swap by index, and stability is required, so build two separate chains with dummy heads and join them at the end. Remember to null-terminate the second chain's tail or you create a cycle. O(n) time and O(1) extra space.",
        snippet: "ListNode ld(0), hd(0); ListNode *lt = &ld, *ht = &hd;\nfor (ListNode* p = head; p; p = p->next)\n  if (p->val < x) { lt->next = p; lt = p; }\n  else            { ht->next = p; ht = p; }\nht->next = nullptr;      // terminate, or you build a cycle\nlt->next = hd.next;\nreturn ld.next;"
      },
      {
        variation: "Partition into k subsets of equal sum, not around a pivot value",
        tip: "This is not a scan at all — it is a search problem, and greedy assignment is provably wrong. Backtrack over bucket assignments with pruning: sort descending, skip empty-bucket duplicates, and fail fast when the total is not divisible by k. Exponential in the worst case, roughly O(k * 2^n).",
        snippet: "std::sort(a.rbegin(), a.rend());\nstd::vector<long long> bucket(k, 0);\nstd::function<bool(int)> place = [&](int i) {\n  if (i == (int)a.size()) return true;\n  for (int b = 0; b < k; ++b) {\n    if (bucket[b] + a[i] > target) continue;\n    if (b && bucket[b] == bucket[b-1]) continue;   // symmetry prune\n    bucket[b] += a[i];\n    if (place(i + 1)) return true;\n    bucket[b] -= a[i];\n  }\n  return false;\n};\nreturn place(0);"
      }
    ]
  },

  // ===== HASHING & HASHMAP (4 Topics) =====
  {
    id: "topic-hash-group-anagrams",
    moduleId: "mod-arrays-strings",
    title: "Group Anagrams",
    intuition: "Anagrams have same characters when sorted. Use sorted string as key in hashmap to group all anagrams together.",
    lesson: [
      {
        title: "Sorted String as Key",
        content: 'Sort each word, use as key in map. All anagrams have same sorted form, so they group under same key.',
        codeExample: 'unordered_map<string, vector<string>> groups;\nfor (string& word : strs) {\n  string sorted = word;\n  sort(sorted.begin(), sorted.end());\n  groups[sorted].push_back(word);\n}\nvector<vector<string>> result;\nfor (auto& pair : groups) result.push_back(pair.second);',
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Group Anagrams",
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["eat","tea","ate"],["tan","nat"],["bat"]]',
        explanation: '"eat" sorted = "aet", "tea" sorted = "aet", "ate" sorted = "aet" ? group together. "tan" and "nat" both sort to "ant" ? group. "bat" sorts to "abt" ? alone.',
        diagram: undefined
      }
    ],
    complexity: { time: "O(n*k*log k) where k=avg word length", space: "O(n*k)" },
    tips: ["Sorted string as key is simplest approach", "For large k, can use character count array as key"],
    references: [{ source: "leetcode", attribution: "LeetCode #49", insight: "Tests hash understanding and sorting." }],
    practiceProblems: [
      {
        variation: "Use a character-count key instead of sorting each word",
        tip: "Sorting each word costs O(L log L). A 26-slot count signature is O(L) and avoids the sort entirely, which matters when the words are long. Delimit the counts inside the key so 1,11 and 11,1 cannot produce the same string.",
        snippet: "std::unordered_map<std::string, std::vector<std::string>> g;\nfor (auto& w : words) {\n  std::array<int,26> c{};\n  for (char ch : w) ++c[ch - 'a'];\n  std::string key;\n  for (int x : c) { key += '#'; key += std::to_string(x); }\n  g[key].push_back(w);\n}"
      },
      {
        variation: "The alphabet is Unicode, not lowercase a-z",
        tip: "A fixed 26-slot array silently misclassifies anything outside a-z. Switch to a map from code point to count and build the key from its sorted entries, which keeps the canonicalisation correct at O(L log k) per word. Confirm with the interviewer whether case and accents matter.",
        snippet: "std::map<char32_t,int> c;          // ordered, so iteration is canonical\nfor (char32_t ch : w) ++c[ch];\nstd::string key;\nfor (auto& [ch, n] : c) { key += std::to_string((uint32_t)ch); key += ':'; key += std::to_string(n); key += ','; }\ng[key].push_back(w);"
      },
      {
        variation: "Group anagrams that differ by at most one character",
        tip: "Near-matching breaks hashing outright, because two strings one edit apart hash differently. Generate wildcard keys (one position blanked at a time) and group on those, which is O(L) keys per word. This is the same trick that makes Word Ladder tractable.",
        snippet: "for (auto& w : words) {\n  for (size_t i = 0; i < w.size(); ++i) {\n    std::string key = w;\n    key[i] = '*';                  // wildcard one position\n    buckets[key].push_back(w);\n  }\n}"
      },
      {
        variation: "Only report the largest anagram group, and the word list does not fit in memory",
        tip: "You cannot hold every bucket, so stream: emit (canonicalKey, word) pairs, sort or shard by key externally, and reduce each key group as it arrives. Memory becomes O(largest group) rather than O(total). This is the map-reduce phrasing of the same grouping.",
        snippet: "// map phase: emit(canonicalKey(w), w) for each word\n// shuffle: records with the same key land on the same reducer\n// reduce phase:\nsize_t best = 0; std::string bestKey;\nfor (auto& [key, count] : perKeyCounts)\n  if (count > best) { best = count; bestKey = key; }"
      },
      {
        variation: "Find All Anagrams of a pattern inside a string",
        tip: "Grouping is replaced by a fixed-size sliding window of length equal to the pattern, since the substring must be contiguous. Maintain a count array and compare against the pattern's counts once per step, dropping the character that leaves the window. O(n) time and O(1) space.",
        snippet: "std::array<int,26> need{}, win{};\nfor (char c : p) ++need[c - 'a'];\nint m = p.size();\nfor (int r = 0; r < (int)s.size(); ++r) {\n  ++win[s[r] - 'a'];\n  if (r >= m) --win[s[r - m] - 'a'];\n  if (r >= m - 1 && win == need) out.push_back(r - m + 1);\n}"
      },
      {
        variation: "Words may repeat and you must return groups sorted by size, then lexicographically",
        tip: "Hash-map iteration order is unspecified, so any expected output ordering must be imposed explicitly after grouping. Sort the groups with a comparator on size then first element, and sort inside each group. That adds O(n log n) on top of the O(nL) grouping.",
        snippet: "std::vector<std::vector<std::string>> out;\nfor (auto& [k, v] : g) { auto grp = v; std::sort(grp.begin(), grp.end()); out.push_back(grp); }\nstd::sort(out.begin(), out.end(), [](auto& x, auto& y) {\n  return x.size() != y.size() ? x.size() > y.size() : x < y;\n});"
      }
    ]
  },

  // ===== STACK & QUEUES (5 Topics) =====
  {
    id: "topic-stack-next-greater-element",
    moduleId: "mod-stack-monotonic",
    title: "Next Greater Element",
    intuition: "For each element, find next larger element to the right. Use monotonic decreasing stack to track candidates.",
    lesson: [
      {
        title: "Monotonic Stack Pattern",
        content: "Iterate right to left. Maintain stack of decreasing elements. For each element, pop smaller elements from stack (they are candidates for smaller elements), then top of stack is next greater. Push current element.",
        codeExample: "stack<int> st;\nvector<int> result(n);\nfor (int i = n - 1; i >= 0; i--) {\n  while (!st.empty() && st.top() <= nums[i]) st.pop();\n  result[i] = st.empty() ? -1 : st.top();\n  st.push(nums[i]);\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Next Greater Element",
        input: "nums = [1,2,1]",
        output: "[2,-1,-1]",
        explanation: "For 1 at index 0, next greater is 2. For 2 at index 1, no greater element. For 1 at index 2, no greater element.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: ["Monotonic stack is key. Recognize pattern: need next/previous element with condition."],
    references: [{ source: "leetcode", attribution: "LeetCode #496", insight: "Gateway to monotonic stack problems." }],
    practiceProblems: [
      {
        variation: "Next Greater Element I — queries are a subset given in a separate array",
        tip: "You cannot index the answers by position, because the query array has its own ordering. Compute next-greater for the full array into a value-keyed map, then answer each query in O(1). This relies on the values being unique, which the problem guarantees. O(n + m) overall.",
        snippet: "std::unordered_map<int,int> nge;\nstd::stack<int> st;                    // values, decreasing\nfor (int x : nums2) {\n  while (!st.empty() && x > st.top()) { nge[st.top()] = x; st.pop(); }\n  st.push(x);\n}\nfor (int q : nums1) out.push_back(nge.count(q) ? nge[q] : -1);"
      },
      {
        variation: "Next Greater Element II — the array is circular",
        tip: "Wrapping means an element's answer may lie before it, so a single left-to-right pass misses it. Iterate 2n times with i % n and push only during the first lap so no index is inserted twice. Still O(n) time and O(n) space.",
        snippet: "std::vector<int> res(n, -1);\nstd::stack<int> st;\nfor (int i = 0; i < 2 * n; ++i) {\n  int j = i % n;\n  while (!st.empty() && a[j] > a[st.top()]) { res[st.top()] = a[j]; st.pop(); }\n  if (i < n) st.push(j);\n}\nreturn res;"
      },
      {
        variation: "Daily Temperatures — report the distance, not the value",
        tip: "Push indices instead of values so a pop can compute i minus the popped index directly. Anything left on the stack never found a warmer day and keeps the default answer of 0. Each index is pushed and popped once, so O(n) time and O(n) space.",
        snippet: "std::vector<int> res(n, 0);\nstd::stack<int> st;\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && t[i] > t[st.top()]) { res[st.top()] = i - st.top(); st.pop(); }\n  st.push(i);\n}\nreturn res;"
      },
      {
        variation: "Next smaller element instead of next greater",
        tip: "Only the comparison flips: keep the stack increasing rather than decreasing and pop while the incoming value is smaller. Everything else — indices, sentinel handling, complexity — is identical. Being able to flip it on demand shows you understand the invariant rather than the template.",
        snippet: "std::vector<int> res(n, -1);\nstd::stack<int> st;                    // indices, values INCREASING\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && a[i] < a[st.top()]) { res[st.top()] = a[i]; st.pop(); }\n  st.push(i);\n}\nreturn res;"
      },
      {
        variation: "Previous greater element — look backwards instead of forwards",
        tip: "Rather than writing a second algorithm, either scan right to left with the same code or read the stack top before pushing: whatever is on top at push time is the previous greater element. The second form is a one-line change and stays O(n).",
        snippet: "std::vector<int> res(n, -1);\nstd::stack<int> st;\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && a[st.top()] <= a[i]) st.pop();\n  res[i] = st.empty() ? -1 : a[st.top()];   // read BEFORE pushing\n  st.push(i);\n}\nreturn res;"
      },
      {
        variation: "Next greater element within a sliding window of size k",
        tip: "A stack cannot expire entries that fall out of the window, so it is the wrong structure. Use a monotonic deque, popping expired indices from the front and dominated values from the back; the front then answers each window in O(1). O(n) time and O(k) space.",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      }
    ]
  },

  {
    id: "topic-stack-largest-rectangle",
    moduleId: "mod-stack-monotonic",
    title: "Largest Rectangle in Histogram",
    intuition: "For each bar, expand left and right to find range where it's shortest. Use monotonic stack to find boundaries in O(n).",
    lesson: [
      {
        title: "Height as Minimum",
        content: "For each position, expand outward while height >= current. That range × current height = area. Use stack to track indices of increasing heights.",
        codeExample: "stack<int> st;\nint maxArea = 0;\nfor (int i = 0; i <= n; i++) {\n  while (!st.empty() && (i == n || heights[st.top()] > heights[i])) {\n    int h = heights[st.top()]; st.pop();\n    int width = st.empty() ? i : i - st.top() - 1;\n    maxArea = max(maxArea, h * width);\n  }\n  if (i < n) st.push(i);\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Largest Rectangle",
        input: "heights = [2,1,5,6,2,3]",
        output: "10",
        explanation: "Heights 5 and 6 are adjacent ? width 2, height 5 ? area 10. This is maximum.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: ["Use sentinel (0) at end to flush stack"],
    references: [{ source: "leetcode", attribution: "LeetCode #84", insight: "Hard level, tests monotonic stack mastery." }],
    practiceProblems: [
      {
        variation: "Use sentinels so no leftover bars need a second draining loop",
        tip: "Appending a height of 0 forces every remaining bar off the stack inside the main loop, removing the duplicated post-loop code that is the usual source of bugs. The width formula is unchanged. O(n) time and O(n) space.",
        snippet: "h.push_back(0);\nstd::stack<int> st;\nlong long best = 0;\nfor (int i = 0; i < (int)h.size(); ++i) {\n  while (!st.empty() && h[i] < h[st.top()]) {\n    int ht = h[st.top()]; st.pop();\n    int left = st.empty() ? -1 : st.top();\n    best = std::max(best, (long long)ht * (i - left - 1));\n  }\n  st.push(i);\n}"
      },
      {
        variation: "Maximal Rectangle in a binary matrix",
        tip: "Each row becomes a histogram whose bar height is the run of consecutive 1s ending at that row, so the 2D problem reduces to running the 1D solver m times. Reset a column's height to 0 whenever the cell is 0. O(m * n) time and O(n) space.",
        snippet: "std::vector<int> h(n, 0);\nint best = 0;\nfor (int r = 0; r < m; ++r) {\n  for (int c = 0; c < n; ++c) h[c] = mat[r][c] == '1' ? h[c] + 1 : 0;\n  best = std::max(best, largestRectangleArea(h));\n}\nreturn best;"
      },
      {
        variation: "Maximal square instead of maximal rectangle",
        tip: "Forcing width to equal height makes the stack unnecessary — a simple DP works. dp[i][j] is the side of the largest square ending at that cell, which is one plus the min of its three neighbours. O(m * n) time, reducible to O(n) space with a rolling row.",
        snippet: "int best = 0;\nfor (int i = 1; i <= m; ++i)\n  for (int j = 1; j <= n; ++j)\n    if (mat[i-1][j-1] == '1') {\n      dp[i][j] = 1 + std::min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});\n      best = std::max(best, dp[i][j]);\n    }\nreturn best * best;"
      },
      {
        variation: "Solve it with explicit left and right boundary arrays instead of one stack",
        tip: "Precompute, for each bar, the index of the first strictly smaller bar on each side; the width is then right minus left minus one. It is two passes rather than one but each boundary is easier to reason about and reuse. Still O(n) time and O(n) space.",
        snippet: "std::stack<int> st;\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && h[st.top()] >= h[i]) st.pop();\n  L[i] = st.empty() ? -1 : st.top();\n  st.push(i);\n}\nwhile (!st.empty()) st.pop();\nfor (int i = n - 1; i >= 0; --i) {\n  while (!st.empty() && h[st.top()] >= h[i]) st.pop();\n  R[i] = st.empty() ? n : st.top();\n  st.push(i);\n}"
      },
      {
        variation: "Bars have individual widths rather than all being width 1",
        tip: "The stack logic survives, but widths must come from a prefix sum of the widths instead of index arithmetic. Replace i minus left minus one with prefix[i] minus prefix[left+1]. Complexity is unchanged at O(n).",
        snippet: "// pre[i] = sum of w[0..i-1]\nwhile (!st.empty() && h[i] < h[st.top()]) {\n  int ht = h[st.top()]; st.pop();\n  int left = st.empty() ? -1 : st.top();\n  long long width = pre[i] - pre[left + 1];\n  best = std::max(best, (long long)ht * width);\n}"
      },
      {
        variation: "Count the number of submatrices that are entirely 1s",
        tip: "This is a counting problem, not a maximisation, so the monotonic stack must accumulate rather than take a max. For each row of the histogram, maintain a running sum of rectangles ending at each column, reusing the previous smaller bar's contribution. O(m * n) time.",
        snippet: "std::vector<int> h(n, 0);\nlong long total = 0;\nfor (int r = 0; r < m; ++r) {\n  for (int c = 0; c < n; ++c) h[c] = mat[r][c] ? h[c] + 1 : 0;\n  std::stack<int> st; std::vector<long long> sum(n, 0);\n  for (int c = 0; c < n; ++c) {\n    while (!st.empty() && h[st.top()] >= h[c]) st.pop();\n    sum[c] = st.empty() ? (long long)h[c] * (c + 1)\n                        : sum[st.top()] + (long long)h[c] * (c - st.top());\n    st.push(c);\n    total += sum[c];\n  }\n}"
      }
    ]
  },

  {
    id: "topic-queue-sliding-window-max",
    moduleId: "mod-stack-monotonic",
    title: "Sliding Window Maximum",
    intuition: "Track maximum in sliding window. Use deque to store indices, evict outdated indices and maintain decreasing order.",
    lesson: [
      {
        title: "Deque Optimization",
        content: "Deque stores indices in decreasing order of values. Remove front if outside window. Remove back while new element is larger (those can never be max). Add new element to back.",
        codeExample: "deque<int> dq;\nfor (int i = 0; i < n; i++) {\n  if (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && nums[dq.back()] < nums[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) result[i - k + 1] = nums[dq.front()];\n}\n", 
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Sliding Max",
        input: "nums = [1,3,-1,-3,5,3,6,7], k = 3",
        output: "[3,3,5,5,6,7]",
        explanation: "Windows: [1,3,-1]?3, [3,-1,-3]?3, [-1,-3,5]?5, [-3,5,3]?5, [5,3,6]?6, [3,6,7]?7.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(k)" },
    tips: ["Deque maintains monotonic decreasing order"],
    references: [{ source: "leetcode", attribution: "LeetCode #239", insight: "Hard level, deque pattern critical." }],
    practiceProblems: [
      {
        variation: "Sliding window minimum instead of maximum",
        tip: "Only the back-popping comparison flips: keep the deque increasing so the front is the smallest. Everything else, including the front expiry check, is identical. O(n) time and O(k) space.",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] >= a[i]) dq.pop_back();   // >= for min\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      },
      {
        variation: "Use a max-heap with lazy deletion instead of a deque",
        tip: "A heap cannot delete an arbitrary expired element, so push (value, index) pairs and discard stale tops only when they surface. It is O(n log n) rather than O(n), but the same pattern generalises when the window is not a contiguous range.",
        snippet: "std::priority_queue<std::pair<int,int>> pq;\nfor (int i = 0; i < n; ++i) {\n  pq.push({a[i], i});\n  while (pq.top().second <= i - k) pq.pop();   // lazy delete\n  if (i >= k - 1) out.push_back(pq.top().first);\n}"
      },
      {
        variation: "The window size varies — report the max over every window of size at most k",
        tip: "A fixed expiry check no longer applies, since the left edge moves under its own rule. Keep the deque but drive the left pointer from the problem's condition and read the front whenever the window is valid. Amortised O(n) as long as the left pointer only advances.",
        snippet: "int l = 0;\nfor (int r = 0; r < n; ++r) {\n  while (!dq.empty() && a[dq.back()] <= a[r]) dq.pop_back();\n  dq.push_back(r);\n  while (r - l + 1 > k) { if (dq.front() == l) dq.pop_front(); ++l; }\n  out.push_back(a[dq.front()]);\n}"
      },
      {
        variation: "Longest subarray where max minus min is at most a limit",
        tip: "One deque is not enough because you need both extremes at once. Run a max-deque and a min-deque in parallel and shrink from the left while their fronts differ by more than the limit, popping whichever front equals the departing index. O(n) time and O(n) space.",
        snippet: "std::deque<int> mx, mn; int l = 0, best = 0;\nfor (int r = 0; r < n; ++r) {\n  while (!mx.empty() && a[mx.back()] <= a[r]) mx.pop_back(); mx.push_back(r);\n  while (!mn.empty() && a[mn.back()] >= a[r]) mn.pop_back(); mn.push_back(r);\n  while (a[mx.front()] - a[mn.front()] > limit) {\n    if (mx.front() == l) mx.pop_front();\n    if (mn.front() == l) mn.pop_front();\n    ++l;\n  }\n  best = std::max(best, r - l + 1);\n}"
      },
      {
        variation: "Sliding window median rather than maximum",
        tip: "A deque only tracks extremes, so it cannot give an order statistic. Use an ordered multiset with an iterator parked at the middle, shifting it by one as elements enter and leave. O(n log k) time; be careful to move the iterator before erasing the element it may point at.",
        snippet: "std::multiset<int> win(a.begin(), a.begin() + k);\nauto mid = std::next(win.begin(), (k - 1) / 2);\nfor (int r = k; ; ++r) {\n  out.push_back(((double)*mid + *std::next(mid, 1 - k % 2)) / 2.0);\n  if (r == n) break;\n  win.insert(a[r]);\n  if (a[r] < *mid) --mid;\n  if (a[r - k] <= *mid) ++mid;\n  win.erase(win.lower_bound(a[r - k]));\n}"
      },
      {
        variation: "Maximum of every k x k submatrix in a 2D grid",
        tip: "Apply the 1D deque twice: first horizontally to reduce each row to row-window maxima, then vertically on that intermediate matrix. Composing separable passes avoids an O(m * n * k^2) brute force. O(m * n) time overall.",
        snippet: "// pass 1: for each row, rowMax[r][c] = max of g[r][c..c+k-1]\nfor (int r = 0; r < m; ++r) slideMax(g[r], k, rowMax[r]);\n// pass 2: for each column of rowMax, slide vertically\nfor (int c = 0; c + k <= n; ++c) {\n  std::vector<int> col(m);\n  for (int r = 0; r < m; ++r) col[r] = rowMax[r][c];\n  slideMax(col, k, outCol);\n}"
      }
    ]
  },

  // ===== BINARY SEARCH (5 Topics) =====
  {
    id: "topic-binary-search-basic",
    moduleId: "mod-binary-search-intervals",
    title: "Binary Search",
    intuition: "Search sorted array in O(log n). Eliminate half of candidates each iteration. Mid = (left + right) / 2.",
    lesson: [
      {
        title: "Core Pattern",
        content: "Compare target with mid. If equal, found. If target < mid, search left half. If target > mid, search right half. Repeat until found or left > right.",
        codeExample: "int left = 0, right = n - 1;\nwhile (left <= right) {\n  int mid = left + (right - left) / 2;\n  if (nums[mid] == target) return mid;\n  if (nums[mid] < target) left = mid + 1;\n  else right = mid - 1;\n}\nreturn -1;",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Binary Search",
        input: "nums = [-1,0,3,5,9,12], target = 9",
        output: "4",
        explanation: "mid=3 ? nums[3]=5 < 9 ? search right. mid=4 ? nums[4]=9 ? found at index 4.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(log n)", space: "O(1)" },
    tips: ["Use left + (right - left) / 2 to avoid overflow", "Know when to use <= vs < in while condition"],
    references: [{ source: "leetcode", attribution: "LeetCode #704", insight: "Foundation for all binary search variants." }],
    practiceProblems: [
      {
        variation: "Return the insertion point when the target is absent",
        tip: "Instead of returning -1 on failure, let the loop run to completion — the low pointer lands exactly on the first index whose value is at least the target. This is lower_bound, and it is the building block for almost every other binary-search variant. O(log n) time.",
        snippet: "int lo = 0, hi = n;                 // note: hi = n, half-open\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] < target) lo = mid + 1;\n  else hi = mid;\n}\nreturn lo;                          // insertion index"
      },
      {
        variation: "The array is infinite or unbounded, so you cannot compute a right end",
        tip: "There is no hi to start from, so first find one by doubling an index until the value exceeds the target. That exponential search costs O(log p) where p is the answer's position, and the binary search over the found range is another O(log p).",
        snippet: "int lo = 0, hi = 1;\nwhile (reader.get(hi) < target) { lo = hi; hi <<= 1; }\nwhile (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  int v = reader.get(mid);\n  if (v == target) return mid;\n  if (v < target) lo = mid + 1; else hi = mid - 1;\n}\nreturn -1;"
      },
      {
        variation: "Binary search on the answer — minimum capacity to ship within D days",
        tip: "The array is not what you search; the answer space is. Define a monotone predicate feasible(x) and binary search the smallest x where it holds, which works because feasibility flips exactly once. O(n log(range)) time.",
        snippet: "auto ok = [&](int cap) {\n  int days = 1, cur = 0;\n  for (int w : wt) { if (cur + w > cap) { ++days; cur = 0; } cur += w; }\n  return days <= D;\n};\nint lo = *std::max_element(wt.begin(), wt.end());\nint hi = std::accumulate(wt.begin(), wt.end(), 0);\nwhile (lo < hi) { int m = lo + (hi - lo) / 2; if (ok(m)) hi = m; else lo = m + 1; }\nreturn lo;"
      },
      {
        variation: "Binary search over real numbers, for example square root to six decimals",
        tip: "Integer midpoint arithmetic and lo <= hi never terminate on doubles. Iterate a fixed number of times, around 100, or until hi minus lo is below an epsilon, and never compare floats for equality. Still O(log(range/eps)).",
        snippet: "double lo = 0, hi = std::max(1.0, x);\nfor (int it = 0; it < 100; ++it) {   // fixed iterations beats epsilon loops\n  double mid = (lo + hi) / 2;\n  if (mid * mid < x) lo = mid; else hi = mid;\n}\nreturn lo;"
      },
      {
        variation: "Find a peak element where neighbours are strictly smaller",
        tip: "The array is not sorted, so ordering cannot guide you — but the slope can. Compare the midpoint with its right neighbour and move toward the ascending side, which is guaranteed to contain a peak. O(log n) time on unsorted input.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] < a[mid + 1]) lo = mid + 1;   // climb right\n  else hi = mid;\n}\nreturn lo;"
      },
      {
        variation: "The collection is a sorted linked list rather than an array",
        tip: "Binary search needs O(1) random access, which a linked list cannot provide, so the midpoint walk makes it O(n log n) — worse than a linear scan. Either convert to an array or use a skip list, which gives O(log n) expected by layering forward pointers. Naming that trade is the point of the question.",
        snippet: "// Skip list search: drop a level whenever the next node overshoots.\nNode* cur = head;\nfor (int lvl = maxLevel; lvl >= 0; --lvl)\n  while (cur->next[lvl] && cur->next[lvl]->val < target) cur = cur->next[lvl];\ncur = cur->next[0];\nreturn cur && cur->val == target;"
      }
    ]
  },

  {
    id: "topic-binary-search-first-last",
    moduleId: "mod-binary-search-intervals",
    title: "First and Last Position",
    intuition: "Find leftmost and rightmost occurrence in sorted array with duplicates. Two binary searches: leftmost and rightmost.",
    lesson: [
      {
        title: "Leftmost and Rightmost Search",
        content: "Leftmost: when found, keep searching left (right = mid - 1). Rightmost: when found, keep searching right (left = mid + 1).",
        codeExample: "// Leftmost\nint left = 0, right = n - 1, result = -1;\nwhile (left <= right) {\n  int mid = left + (right - left) / 2;\n  if (nums[mid] == target) { result = mid; right = mid - 1; }\n  else if (nums[mid] < target) left = mid + 1;\n  else right = mid - 1;\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "First and Last",
        input: "nums = [5,7,7,8,8,10], target = 8",
        output: "[3,4]",
        explanation: "First 8 at index 3, last 8 at index 4.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(log n)", space: "O(1)" },
    tips: ["Two binary searches, one for leftmost (move right when found), one for rightmost (move left when found)"],
    references: [{ source: "leetcode", attribution: "LeetCode #34", insight: "Tests binary search boundary logic." }],
    practiceProblems: [
      {
        variation: "Count occurrences of the target instead of returning the range",
        tip: "Once you have both boundaries, the count is just their difference — no extra scan needed. Use lower_bound and upper_bound rather than writing two hand-rolled searches. O(log n) time and O(1) space.",
        snippet: "auto lo = std::lower_bound(a.begin(), a.end(), target);\nauto hi = std::upper_bound(a.begin(), a.end(), target);\nreturn (int)(hi - lo);"
      },
      {
        variation: "Write both boundaries with a single parameterised search",
        tip: "Duplicating the loop for first and last position is where off-by-one bugs live. Write one half-open search and flip only the comparison: strictly-less finds the first index, less-or-equal finds one past the last. Both are O(log n).",
        snippet: "auto bound = [&](bool upper) {\n  int lo = 0, hi = n;\n  while (lo < hi) {\n    int mid = lo + (hi - lo) / 2;\n    bool go = upper ? a[mid] <= target : a[mid] < target;\n    if (go) lo = mid + 1; else hi = mid;\n  }\n  return lo;\n};\nint first = bound(false), last = bound(true) - 1;"
      },
      {
        variation: "Find the first and last position of a value in a rotated sorted array",
        tip: "Rotation breaks global monotonicity, so lower_bound is invalid. Locate the pivot with a binary search first, then run the boundary search on whichever sorted half can contain the target. Still O(log n), assuming distinct values.",
        snippet: "int lo = 0, hi = n - 1;                 // find index of minimum\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] > a[hi]) lo = mid + 1; else hi = mid;\n}\nint pivot = lo;\n// then binary search in [pivot, n) and [0, pivot) as needed"
      },
      {
        variation: "The array is 2D, sorted row-wise and column-wise",
        tip: "Rows overlap in range, so you cannot flatten and binary search. Start at the top-right corner and walk: move left when the value is too big, down when too small. That is O(m + n), which beats binary searching each row at O(m log n).",
        snippet: "int r = 0, c = n - 1;\nwhile (r < m && c >= 0) {\n  if (mat[r][c] == target) return true;\n  if (mat[r][c] > target) --c; else ++r;\n}\nreturn false;"
      },
      {
        variation: "Find the first and last index satisfying a predicate, not equal to a value",
        tip: "Equality tests generalise to any predicate that is monotone over the array — false then true, or true then false. Substitute the predicate for the comparison and the same two searches locate the transition. O(log n) predicate evaluations.",
        snippet: "int lo = 0, hi = n;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (!pred(a[mid])) lo = mid + 1;   // pred is false...false,true...true\n  else hi = mid;\n}\nreturn lo == n ? -1 : lo;   // first index where pred holds"
      },
      {
        variation: "The array is sorted but contains duplicates and may be rotated",
        tip: "Duplicates make the pivot test ambiguous when the endpoints are equal, so worst case degrades to O(n). Shrink the ambiguous end by one and continue; average stays logarithmic. Say the worst case out loud, because that is the whole point of the follow-up.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] > a[hi]) lo = mid + 1;\n  else if (a[mid] < a[hi]) hi = mid;\n  else --hi;                      // ambiguous: degrade to O(n)\n}\nreturn lo;"
      }
    ]
  },

  {
    id: "topic-binary-search-rotated",
    moduleId: "mod-binary-search-intervals",
    title: "Search in Rotated Sorted Array",
    intuition: "Array rotated once. Identify which half is sorted, then narrow search. Left or right half must be sorted.",
    lesson: [
      {
        title: "Identify Sorted Half",
        content: "Compare nums[left], nums[mid], nums[right]. If nums[left] <= nums[mid], left half is sorted. Check if target is in that range. Otherwise, search right half.",
        codeExample: "int left = 0, right = n - 1;\nwhile (left <= right) {\n  int mid = left + (right - left) / 2;\n  if (nums[mid] == target) return mid;\n  if (nums[left] <= nums[mid]) {\n    if (target >= nums[left] && target < nums[mid]) right = mid - 1;\n    else left = mid + 1;\n  } else {\n    if (target > nums[mid] && target <= nums[right]) left = mid + 1;\n    else right = mid - 1;\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Rotated Search",
        input: "nums = [4,5,6,7,0,1,2], target = 0",
        output: "4",
        explanation: "Left half [4,5,6,7] sorted. 0 not in range ? search right. Found at index 4.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(log n)", space: "O(1)" },
    tips: ["Always identify which half is sorted first"],
    references: [{ source: "leetcode", attribution: "LeetCode #33", insight: "Medium level, tests pattern recognition." }],
    practiceProblems: [
      {
        variation: "Find the minimum element in the rotated array instead of a target",
        tip: "You do not need the target at all — compare the midpoint with the right endpoint to decide which half still contains the wrap. The loop converges on the pivot, which is the minimum. O(log n) time and O(1) space.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] > a[hi]) lo = mid + 1;   // min is right of mid\n  else hi = mid;                      // min is mid or left of it\n}\nreturn a[lo];"
      },
      {
        variation: "Search in a rotated array that contains duplicates",
        tip: "When a[lo], a[mid] and a[hi] are all equal you cannot tell which side is sorted, so the halving guarantee is lost. Trim both ends by one in that case, which keeps correctness at O(n) worst case while staying O(log n) on typical input.",
        snippet: "while (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] == target) return true;\n  if (a[lo] == a[mid] && a[mid] == a[hi]) { ++lo; --hi; }\n  else if (a[lo] <= a[mid]) {\n    if (a[lo] <= target && target < a[mid]) hi = mid - 1; else lo = mid + 1;\n  } else {\n    if (a[mid] < target && target <= a[hi]) lo = mid + 1; else hi = mid - 1;\n  }\n}"
      },
      {
        variation: "Find the rotation count — how many times the array was rotated",
        tip: "The rotation count is exactly the index of the minimum, so it is the same pivot search with a different return value. Recognising the reduction saves you writing new logic. O(log n) time.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] > a[hi]) lo = mid + 1; else hi = mid;\n}\nreturn lo;    // == number of rotations"
      },
      {
        variation: "Two-pass approach — locate the pivot then binary search one half",
        tip: "Rather than the fused one-pass version with its four branches, find the pivot first and then run an ordinary binary search on whichever half brackets the target. It is two O(log n) searches, so the complexity is unchanged and the code is far easier to defend.",
        snippet: "int p = pivotIndex(a);                 // index of minimum\nint lo, hi;\nif (target >= a[p] && target <= a[n-1]) { lo = p; hi = n - 1; }\nelse { lo = 0; hi = p - 1; }\nwhile (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] == target) return mid;\n  if (a[mid] < target) lo = mid + 1; else hi = mid - 1;\n}\nreturn -1;"
      },
      {
        variation: "The array is rotated and sorted in descending order",
        tip: "Every comparison inverts, so blindly reusing the ascending template gives wrong answers. Either flip all comparisons, or detect the direction once and search a reversed view. Complexity stays O(log n); the risk is purely in the sign flips.",
        snippet: "while (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] == target) return mid;\n  if (a[lo] >= a[mid]) {                       // left half descending-sorted\n    if (a[lo] >= target && target > a[mid]) hi = mid - 1; else lo = mid + 1;\n  } else {\n    if (a[mid] > target && target >= a[hi]) lo = mid + 1; else hi = mid - 1;\n  }\n}"
      },
      {
        variation: "Find the kth smallest element in a rotated sorted array",
        tip: "Once you know the pivot, the array is a single sorted sequence read circularly, so the kth smallest is at (pivot + k - 1) mod n. No second search is needed. O(log n) for the pivot and O(1) for the lookup.",
        snippet: "int p = pivotIndex(a);\nreturn a[(p + k - 1) % n];"
      }
    ]
  },

  // ===== LINKED LISTS (6 Topics) =====
  {
    id: "topic-linked-list-reverse",
    moduleId: "mod-linked-list",
    title: "Reverse Linked List",
    intuition: "Iterate through list, reverse pointers one by one. Use prev, curr, next variables to manage pointers safely.",
    lesson: [
      {
        title: "Pointer Reversal",
        content: "For each node: save next pointer, point curr to prev, move prev to curr, move curr to next. Continue until null.",
        codeExample: "ListNode* prev = nullptr, *curr = head;\nwhile (curr) {\n  ListNode* next = curr->next;\n  curr->next = prev;\n  prev = curr;\n  curr = next;\n}\nreturn prev;",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Reverse List",
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: "prev=null, curr=1?next. curr->next=null. prev=1, curr=2?next. curr->next=1. Continue until reversed.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: ["Always save next before modifying curr->next"],
    references: [{ source: "leetcode", attribution: "LeetCode #206", insight: "Must-know linked list fundamental." }],
    practiceProblems: [
      {
        variation: "Reverse Linked List II — reverse only positions left through right",
        tip: "Reversing the whole list is the easy case; a sublist needs you to remember the node before left so you can reattach both ends. Use a dummy head so left equal to 1 needs no special case, then splice nodes one at a time to the front of the reversed region. O(n) time and O(1) space.",
        snippet: "ListNode dummy(0, head); ListNode* prev = &dummy;\nfor (int i = 1; i < left; ++i) prev = prev->next;\nListNode* cur = prev->next;\nfor (int i = 0; i < right - left; ++i) {\n  ListNode* nxt = cur->next;\n  cur->next = nxt->next;\n  nxt->next = prev->next;\n  prev->next = nxt;\n}\nreturn dummy.next;"
      },
      {
        variation: "Reverse Nodes in k-Group, leaving any remainder untouched",
        tip: "You must confirm k nodes exist before reversing, otherwise a short tail gets partially flipped. Count ahead first, reverse the block, then recurse or loop on the rest and stitch the tails. O(n) time and O(1) space if done iteratively.",
        snippet: "ListNode* node = head;\nfor (int i = 0; i < k; ++i) { if (!node) return head; node = node->next; }\nListNode* prev = reverseKGroup(node, k);   // rest, already reversed\nListNode* cur = head;\nfor (int i = 0; i < k; ++i) { ListNode* nxt = cur->next; cur->next = prev; prev = cur; cur = nxt; }\nreturn prev;"
      },
      {
        variation: "Check whether the list is a palindrome using O(1) extra space",
        tip: "Copying values into a vector is O(n) space, which the follow-up forbids. Find the midpoint with slow and fast pointers, reverse the second half in place, compare, and optionally restore. O(n) time and O(1) space.",
        snippet: "ListNode *slow = head, *fast = head;\nwhile (fast && fast->next) { slow = slow->next; fast = fast->next->next; }\nListNode* second = reverseList(slow);\nfor (ListNode *p = head, *q = second; q; p = p->next, q = q->next)\n  if (p->val != q->val) return false;\nreturn true;"
      },
      {
        variation: "Reverse a doubly linked list",
        tip: "Each node has two pointers, so simply swapping next and prev on every node does the whole job — no running previous pointer is needed. Do not forget to reassign the head to the old tail. O(n) time and O(1) space.",
        snippet: "Node* cur = head; Node* last = nullptr;\nwhile (cur) {\n  std::swap(cur->prev, cur->next);\n  last = cur;\n  cur = cur->prev;      // prev now holds the ORIGINAL next\n}\nreturn last;             // new head"
      },
      {
        variation: "Add two numbers stored as linked lists with the most significant digit first",
        tip: "Addition needs least-significant-first traversal, which the input does not give you. Either reverse both lists, add, and reverse the result, or push onto stacks and pop. Both are O(n); the stack version avoids mutating the inputs.",
        snippet: "std::stack<int> s1, s2;\nfor (ListNode* p = l1; p; p = p->next) s1.push(p->val);\nfor (ListNode* p = l2; p; p = p->next) s2.push(p->val);\nint carry = 0; ListNode* head = nullptr;\nwhile (!s1.empty() || !s2.empty() || carry) {\n  int sum = carry;\n  if (!s1.empty()) { sum += s1.top(); s1.pop(); }\n  if (!s2.empty()) { sum += s2.top(); s2.pop(); }\n  head = new ListNode(sum % 10, head);\n  carry = sum / 10;\n}\nreturn head;"
      },
      {
        variation: "Reorder the list as first, last, second, second-last and so on",
        tip: "This composes three primitives you already own: split at the middle, reverse the back half, then interleave. Recognising the decomposition is the whole trick. O(n) time and O(1) space.",
        snippet: "ListNode *slow = head, *fast = head->next;\nwhile (fast && fast->next) { slow = slow->next; fast = fast->next->next; }\nListNode* second = reverseList(slow->next);\nslow->next = nullptr;\nfor (ListNode* first = head; second; ) {\n  ListNode *f = first->next, *s = second->next;\n  first->next = second; second->next = f;\n  first = f; second = s;\n}"
      }
    ]
  },

  {
    id: "topic-linked-list-cycle",
    moduleId: "mod-linked-list",
    title: "Detect Cycle (Floyd's Algorithm)",
    intuition: "Tortoise and hare. Slow pointer moves 1 step, fast moves 2. If cycle exists, they meet. If no cycle, fast reaches null.",
    lesson: [
      {
        title: "Two Pointer Meeting",
        content: "Slow and fast pointers. If cycle exists, they will eventually meet (because fast is faster and catches up in circular path). If no cycle, fast reaches null first.",
        codeExample: "ListNode* slow = head, *fast = head;\nwhile (fast && fast->next) {\n  slow = slow->next;\n  fast = fast->next->next;\n  if (slow == fast) return true;\n}\nreturn false;",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Cycle Detection",
        input: "head = [3,2,0,-4], pos = 1 (tail connects to node at index 1)",
        output: "true",
        explanation: "List has a cycle (1 ? 2 ? 0 ? 1 repeats). Slow and fast pointers will eventually meet.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(1)" },
    tips: ["Floyd's algorithm, fundamental for cycle detection"],
    references: [{ source: "leetcode", attribution: "LeetCode #141", insight: "Classic algorithm, appears in many variations." }],
    practiceProblems: [
      {
        variation: "Return the node where the cycle begins, not just whether one exists",
        tip: "Detection alone is not enough; the meeting point is generally not the entry. After they meet, reset one pointer to the head and advance both one step at a time — they meet again exactly at the cycle start. O(n) time and O(1) space.",
        snippet: "ListNode *slow = head, *fast = head;\ndo {\n  if (!fast || !fast->next) return nullptr;\n  slow = slow->next; fast = fast->next->next;\n} while (slow != fast);\nslow = head;\nwhile (slow != fast) { slow = slow->next; fast = fast->next; }\nreturn slow;"
      },
      {
        variation: "Report the length of the cycle",
        tip: "Once the pointers meet you are guaranteed to be on the cycle, so walk one pointer around until it returns to the meeting node and count the steps. No extra structure is needed. O(n) time and O(1) space.",
        snippet: "int len = 1;\nfor (ListNode* p = meet->next; p != meet; p = p->next) ++len;\nreturn len;"
      },
      {
        variation: "Find the duplicate number in an array where values are indices",
        tip: "Treating a[i] as a next pointer turns the array into a functional graph, and the duplicate is exactly the entry of its cycle. This satisfies the read-only, O(1) space follow-up that forbids sorting or a hash set. O(n) time.",
        snippet: "int slow = a[0], fast = a[a[0]];\nwhile (slow != fast) { slow = a[slow]; fast = a[a[fast]]; }\nslow = 0;\nwhile (slow != fast) { slow = a[slow]; fast = a[fast]; }\nreturn slow;"
      },
      {
        variation: "Happy Number — detect a cycle in a number transformation",
        tip: "There is no list at all, just a function you iterate, but Floyd's algorithm only needs a successor function. Run slow one step and fast two through the digit-square-sum map and check whether the meeting value is 1. O(log n) space-free iterations.",
        snippet: "auto next = [](int x) { int s = 0; while (x) { int d = x % 10; s += d * d; x /= 10; } return s; };\nint slow = n, fast = next(n);\nwhile (fast != 1 && slow != fast) { slow = next(slow); fast = next(next(fast)); }\nreturn fast == 1;"
      },
      {
        variation: "Detect a cycle in a directed graph rather than a linked list",
        tip: "Nodes have many successors, so two pointers do not apply. Use DFS with three colours — unvisited, on the current recursion stack, done — and report a cycle when you reach a node still on the stack. O(V + E) time and O(V) space.",
        snippet: "// 0 = unseen, 1 = on stack, 2 = finished\nbool dfs(int u) {\n  color[u] = 1;\n  for (int v : adj[u]) {\n    if (color[v] == 1) return true;          // back edge -> cycle\n    if (color[v] == 0 && dfs(v)) return true;\n  }\n  color[u] = 2;\n  return false;\n}"
      },
      {
        variation: "Remove the cycle so the list becomes a proper linear list",
        tip: "Finding the entry is only half the job — you must also find the node pointing at it and null its next. Walk from the entry around the cycle until the next pointer equals the entry, then cut. O(n) time and O(1) space.",
        snippet: "ListNode* entry = detectCycle(head);\nif (!entry) return head;\nListNode* p = entry;\nwhile (p->next != entry) p = p->next;\np->next = nullptr;\nreturn head;"
      }
    ]
  },

  // ===== TREES & BSTs (8 Topics) =====
  {
    id: "topic-tree-inorder-traversal",
    moduleId: "mod-trees-bst",
    title: "Binary Tree Inorder Traversal",
    intuition: "Inorder = Left, Root, Right. For BST, this gives sorted order. Use recursion or stack-based iteration.",
    lesson: [
      {
        title: "Recursive vs Iterative",
        content: "Recursive: process left, output root, process right. Iterative: use stack, push nodes going left, pop and output when at bottom, go right.",
        codeExample: "vector<int> inorder(TreeNode* root) {\n  vector<int> result;\n  stack<TreeNode*> st;\n  TreeNode* curr = root;\n  while (curr || !st.empty()) {\n    while (curr) { st.push(curr); curr = curr->left; }\n    curr = st.top(); st.pop();\n    result.push_back(curr->val);\n    curr = curr->right;\n  }\n  return result;\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Inorder Traversal",
        input: "root = [1,null,2]",
        output: "[1,2]",
        explanation: "Go left (null), output 1, go right (2), output 2. Result: [1,2].",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(h) recursion stack" },
    tips: ["For BST, inorder gives sorted array"],
    references: [{ source: "leetcode", attribution: "LeetCode #94", insight: "Foundation for tree traversal patterns." }],
    practiceProblems: [
      {
        variation: "Write it iteratively with an explicit stack instead of recursion",
        tip: "Recursion risks stack overflow on a degenerate, list-shaped tree of depth n. Push left spine nodes, pop and visit, then move right — the stack replaces the call frames exactly. O(n) time and O(h) space.",
        snippet: "std::stack<TreeNode*> st; TreeNode* cur = root;\nwhile (cur || !st.empty()) {\n  while (cur) { st.push(cur); cur = cur->left; }\n  cur = st.top(); st.pop();\n  out.push_back(cur->val);\n  cur = cur->right;\n}"
      },
      {
        variation: "Traverse in O(1) space using Morris traversal",
        tip: "Even the explicit stack is O(h), which the follow-up rules out. Morris threads each node's inorder predecessor to point back at it, visits, then unthreads to restore the tree. O(n) time and true O(1) space, at the cost of temporarily mutating pointers.",
        snippet: "TreeNode* cur = root;\nwhile (cur) {\n  if (!cur->left) { out.push_back(cur->val); cur = cur->right; continue; }\n  TreeNode* pre = cur->left;\n  while (pre->right && pre->right != cur) pre = pre->right;\n  if (!pre->right) { pre->right = cur; cur = cur->left; }\n  else { pre->right = nullptr; out.push_back(cur->val); cur = cur->right; }\n}"
      },
      {
        variation: "Preorder and postorder with the same iterative skeleton",
        tip: "Preorder is the easy one — push right then left and visit on pop. Postorder is preorder with the children order swapped and the whole output reversed, which avoids the fiddly two-stack or last-visited bookkeeping. Both O(n) time and O(h) space.",
        snippet: "std::stack<TreeNode*> st; st.push(root);\nwhile (!st.empty()) {\n  TreeNode* n = st.top(); st.pop();\n  if (!n) continue;\n  out.push_back(n->val);\n  st.push(n->left); st.push(n->right);   // left LAST -> reversed postorder\n}\nstd::reverse(out.begin(), out.end());    // now root-left-right becomes postorder"
      },
      {
        variation: "Build a BST iterator that yields the next value on demand",
        tip: "You cannot materialise the whole traversal because next must be O(1) amortised and memory O(h). Keep the partial left spine on a stack and push the right child's spine after each pop, which is the inorder loop paused mid-flight.",
        snippet: "void pushLeft(TreeNode* n) { for (; n; n = n->left) st.push(n); }\nint next() {\n  TreeNode* n = st.top(); st.pop();\n  pushLeft(n->right);\n  return n->val;\n}\nbool hasNext() { return !st.empty(); }"
      },
      {
        variation: "The tree is n-ary rather than binary",
        tip: "Inorder is undefined without exactly two children, so the interviewer means preorder or postorder. Push children in reverse so the leftmost is processed first, and everything else carries over. O(n) time and O(h * branching) space.",
        snippet: "std::stack<Node*> st; st.push(root);\nwhile (!st.empty()) {\n  Node* n = st.top(); st.pop();\n  out.push_back(n->val);\n  for (auto it = n->children.rbegin(); it != n->children.rend(); ++it)\n    st.push(*it);\n}"
      },
      {
        variation: "Verify a BST or find the kth smallest using the traversal order",
        tip: "Inorder on a BST is sorted, so both questions reduce to a single pass with a running previous value or a counter — no auxiliary array. Stop early once the counter reaches k, which makes it O(h + k) rather than O(n).",
        snippet: "int k, ans; TreeNode* prev = nullptr;\nvoid dfs(TreeNode* n) {\n  if (!n || k == 0) return;\n  dfs(n->left);\n  if (--k == 0) { ans = n->val; return; }\n  dfs(n->right);\n}"
      }
    ]
  },

  {
    id: "topic-tree-validate-bst",
    moduleId: "mod-trees-bst",
    title: "Validate Binary Search Tree",
    intuition: "BST property: left < root < right. But also: all nodes in left subtree < root, all in right > root. Use min/max bounds.",
    lesson: [
      {
        title: "Min-Max Validation",
        content: "Recursively validate each node is within (min, max) range. Left subtree: (min, root). Right subtree: (root, max).",
        codeExample: "bool validate(TreeNode* root, long minVal, long maxVal) {\n  if (!root) return true;\n  if (root->val <= minVal || root->val >= maxVal) return false;\n  return validate(root->left, minVal, root->val) && validate(root->right, root->val, maxVal);\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Validate BST",
        input: "root = [2,1,3]",
        output: "true",
        explanation: "1 < 2 < 3. Valid BST.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(h)" },
    tips: ["Use Long.MIN/MAX for edge cases with Integer.MIN/MAX values"],
    references: [{ source: "leetcode", attribution: "LeetCode #98", insight: "Tests understanding of BST constraints." }],
    practiceProblems: [
      {
        variation: "Validate using an inorder scan instead of min/max bounds",
        tip: "A BST's inorder traversal is strictly increasing, so tracking only the previously visited value is enough. It removes the bounds plumbing entirely and works with the iterative or Morris versions. O(n) time and O(h) space.",
        snippet: "TreeNode* prev = nullptr;\nbool dfs(TreeNode* n) {\n  if (!n) return true;\n  if (!dfs(n->left)) return false;\n  if (prev && prev->val >= n->val) return false;\n  prev = n;\n  return dfs(n->right);\n}"
      },
      {
        variation: "Node values can be INT_MIN or INT_MAX",
        tip: "Seeding the bounds with INT_MIN and INT_MAX silently rejects legitimate trees containing those values. Use nullable pointers for the bounds, or long long, so 'no bound yet' is distinguishable from an extreme value. Complexity is unchanged.",
        snippet: "bool dfs(TreeNode* n, TreeNode* lo, TreeNode* hi) {\n  if (!n) return true;\n  if (lo && n->val <= lo->val) return false;\n  if (hi && n->val >= hi->val) return false;\n  return dfs(n->left, lo, n) && dfs(n->right, n, hi);\n}"
      },
      {
        variation: "Duplicate values are permitted and must live in the left subtree",
        tip: "Strict inequality now rejects valid trees, so the comparison on the duplicate-bearing side must become non-strict. Decide the convention explicitly with the interviewer, because left-duplicates and right-duplicates need opposite relaxations. O(n) time.",
        snippet: "// duplicates allowed on the LEFT: left subtree may equal the parent\nif (lo && n->val <= lo->val) return false;      // right bound stays strict\nif (hi && n->val >  hi->val) return false;      // left bound relaxed\nreturn dfs(n->left, lo, n) && dfs(n->right, n, hi);"
      },
      {
        variation: "Find the largest BST subtree inside an arbitrary binary tree",
        tip: "A top-down validity check cannot tell you subtree sizes, so switch to a bottom-up post-order that returns min, max, size and validity together. Each node then combines its children in O(1). O(n) time overall.",
        snippet: "struct Info { bool bst; int mn, mx, sz; };\nInfo dfs(TreeNode* n) {\n  if (!n) return {true, INT_MAX, INT_MIN, 0};\n  Info l = dfs(n->left), r = dfs(n->right);\n  if (l.bst && r.bst && l.mx < n->val && n->val < r.mn) {\n    int sz = l.sz + r.sz + 1;\n    best = std::max(best, sz);\n    return {true, std::min(l.mn, n->val), std::max(r.mx, n->val), sz};\n  }\n  return {false, INT_MIN, INT_MAX, 0};\n}"
      },
      {
        variation: "Recover a BST where exactly two nodes were swapped",
        tip: "Validation tells you it is broken; recovery needs the two offending nodes. Inorder-scan for descents: the first descent gives the first node, the last descent gives the second, and adjacent swaps produce only one descent. Swap the values in O(n) time.",
        snippet: "TreeNode *first = nullptr, *second = nullptr, *prev = nullptr;\nvoid dfs(TreeNode* n) {\n  if (!n) return;\n  dfs(n->left);\n  if (prev && prev->val > n->val) { if (!first) first = prev; second = n; }\n  prev = n;\n  dfs(n->right);\n}\n// then std::swap(first->val, second->val)"
      },
      {
        variation: "Validate a BST given only its preorder serialisation, without building it",
        tip: "You never have the tree, so recursion on children is impossible. Consume the sequence with an upper-bound stack: pop while the incoming value exceeds the top, and the last popped value becomes the new lower bound. O(n) time and O(h) space.",
        snippet: "std::stack<int> st; int lower = INT_MIN;\nfor (int v : pre) {\n  if (v < lower) return false;\n  while (!st.empty() && st.top() < v) { lower = st.top(); st.pop(); }\n  st.push(v);\n}\nreturn true;"
      }
    ]
  },

  // ===== GRAPHS (6 Topics) =====
  {
    id: "topic-graph-bfs",
    moduleId: "mod-graphs",
    title: "BFS - Breadth First Search",
    intuition: "Explore level by level using queue. All distance-1 neighbors before distance-2. Shortest path in unweighted graphs.",
    lesson: [
      {
        title: "Queue-Based Level Exploration",
        content: "Start from source, add to queue. While queue not empty: process front, add unvisited neighbors. Mark as visited to avoid revisiting.",
        codeExample: "queue<int> q;\nq.push(start);\nvisited[start] = true;\nwhile (!q.empty()) {\n  int node = q.front(); q.pop();\n  for (int neighbor : adj[node]) {\n    if (!visited[neighbor]) {\n      visited[neighbor] = true;\n      q.push(neighbor);\n    }\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "BFS Distance",
        input: "graph, start = 0",
        output: "Distances from start node",
        explanation: "Queue: [0]. Process 0, add neighbors [1,2]. Queue: [1,2]. Process 1, add unvisited. Process 2. Continue until queue empty.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(V + E)", space: "O(V)" },
    tips: ["Use queue for BFS, DFS uses stack/recursion"],
    references: [{ source: "leetcode", attribution: "LeetCode #102", insight: "Shortest path in unweighted graphs." }],
    practiceProblems: [
      {
        variation: "Report the level of each node, not just the visit order",
        tip: "A flat queue loses level boundaries, so snapshot the queue size at the top of each round and drain exactly that many nodes. That is the standard level-order template and costs nothing extra. O(V + E) time and O(V) space.",
        snippet: "while (!q.empty()) {\n  int sz = q.size();                 // freeze this level\n  for (int i = 0; i < sz; ++i) {\n    auto u = q.front(); q.pop();\n    level[u] = depth;\n    for (int v : adj[u]) if (!seen[v]) { seen[v] = true; q.push(v); }\n  }\n  ++depth;\n}"
      },
      {
        variation: "Multi-source BFS — rotting oranges or nearest 0 for every cell",
        tip: "Running BFS from each source is O(sources * V). Seed the queue with every source at distance 0 instead; the wavefronts expand together and each cell is settled by its nearest source. Still O(V + E) in total.",
        snippet: "for (int i = 0; i < m; ++i)\n  for (int j = 0; j < n; ++j)\n    if (grid[i][j] == SOURCE) { dist[i][j] = 0; q.push({i, j}); }\nwhile (!q.empty()) { /* ordinary BFS from all sources at once */ }"
      },
      {
        variation: "The edges have weights of 0 or 1",
        tip: "A plain queue no longer produces non-decreasing distances, so BFS is invalid. Use a deque: push zero-weight moves to the front and unit-weight moves to the back, which keeps the ordering invariant. O(V + E), beating Dijkstra's log factor.",
        snippet: "std::deque<int> dq; dq.push_front(s); dist[s] = 0;\nwhile (!dq.empty()) {\n  int u = dq.front(); dq.pop_front();\n  for (auto [v, w] : adj[u])\n    if (dist[u] + w < dist[v]) {\n      dist[v] = dist[u] + w;\n      if (w == 0) dq.push_front(v); else dq.push_back(v);\n    }\n}"
      },
      {
        variation: "Bidirectional BFS for a shortest path between two known endpoints",
        tip: "A single BFS explores b^d nodes; searching from both ends and meeting in the middle explores roughly 2 * b^(d/2). Always expand the smaller frontier and stop when the frontiers intersect. Same asymptotic class, dramatically smaller constant on large graphs.",
        snippet: "std::unordered_set<std::string> a{begin}, b{end}, seen;\nint steps = 1;\nwhile (!a.empty() && !b.empty()) {\n  if (a.size() > b.size()) std::swap(a, b);      // always expand smaller\n  std::unordered_set<std::string> nxt;\n  for (auto& w : a)\n    for (auto& c : neighbors(w)) {\n      if (b.count(c)) return steps + 1;\n      if (seen.insert(c).second) nxt.insert(c);\n    }\n  a = std::move(nxt); ++steps;\n}"
      },
      {
        variation: "BFS over an implicit graph, such as word ladder or lock combinations",
        tip: "There is no adjacency list, so neighbours must be generated on the fly and deduplicated with a visited set. Cost the neighbour generator carefully — it usually dominates. For word ladder it is O(N * L * 26) with wildcard bucketing.",
        snippet: "for (int i = 0; i < 4; ++i)\n  for (int d : {1, 9}) {                 // +1 and -1 mod 10\n    std::string nx = cur;\n    nx[i] = '0' + (cur[i] - '0' + d) % 10;\n    if (!dead.count(nx) && seen.insert(nx).second) q.push(nx);\n  }"
      },
      {
        variation: "The graph is too large to hold a visited set in memory",
        tip: "Exact deduplication is impossible, so bound the memory instead: iterative-deepening DFS revisits nodes but uses O(d) space, and a Bloom filter gives approximate visited checks with a controllable false-positive rate. Both trade time or exactness for memory — say which you are trading.",
        snippet: "// iterative deepening: BFS-order results with DFS-order memory\nfor (int limit = 0; limit <= maxDepth; ++limit)\n  if (dfsLimited(start, limit)) return limit;   // O(b^d) time, O(d) space"
      }
    ]
  },

  {
    id: "topic-graph-dfs",
    moduleId: "mod-graphs",
    title: "DFS - Depth First Search",
    intuition: "Explore as far as possible along each branch before backtracking. Use stack or recursion. Useful for topological sort, cycle detection.",
    lesson: [
      {
        title: "Recursion-Based Exploration",
        content: "Visit node, mark visited, recursively visit unvisited neighbors. Naturally backtracks via recursion stack.",
        codeExample: "void dfs(int node, vector<bool>& visited, vector<vector<int>>& adj) {\n  visited[node] = true;\n  for (int neighbor : adj[node]) {\n    if (!visited[neighbor]) dfs(neighbor, visited, adj);\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "DFS Traversal",
        input: "graph, start = 0",
        output: "Nodes in DFS order",
        explanation: "Visit 0, go deep to leftmost, backtrack, visit right. Result depends on adj list order.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(V + E)", space: "O(h) recursion depth" },
    tips: ["Use DFS for topological sort, cycle detection, connected components"],
    references: [{ source: "leetcode", attribution: "LeetCode #200", insight: "Connected components via DFS." }],
    practiceProblems: [
      {
        variation: "Convert the recursion into an explicit stack",
        tip: "Deep or adversarial graphs blow the call stack, and some environments have a small default. Push the start node and mark visited at pop time, pushing neighbours in reverse if you need to match the recursive order. O(V + E) time and O(V) space.",
        snippet: "std::stack<int> st; st.push(s);\nwhile (!st.empty()) {\n  int u = st.top(); st.pop();\n  if (seen[u]) continue;\n  seen[u] = true;\n  for (int v : adj[u]) if (!seen[v]) st.push(v);\n}"
      },
      {
        variation: "Count connected components rather than reaching one target",
        tip: "One DFS only covers the component containing the start, so loop over every vertex and start a new traversal from each unvisited one. The number of starts is the component count. Still O(V + E) total, because each vertex is visited once.",
        snippet: "int comps = 0;\nfor (int u = 0; u < n; ++u)\n  if (!seen[u]) { ++comps; dfs(u); }\nreturn comps;"
      },
      {
        variation: "Detect a cycle — the directed case differs from the undirected case",
        tip: "Undirected graphs need you to skip the edge you arrived on, otherwise every edge looks like a cycle. Directed graphs need three colours, because a cross edge to a finished node is fine while an edge to an on-stack node is a real cycle. Both O(V + E).",
        snippet: "// undirected: pass the parent through\nbool dfs(int u, int parent) {\n  seen[u] = true;\n  for (int v : adj[u]) {\n    if (v == parent) continue;              // the edge we came in on\n    if (seen[v] || dfs(v, u)) return true;\n  }\n  return false;\n}"
      },
      {
        variation: "Topological sort of a DAG using DFS finishing times",
        tip: "Reverse finishing order is a valid topological order, so push each node onto the output after its recursion completes and reverse at the end. Combine it with the three-colour cycle check so a cyclic graph is rejected rather than silently mis-ordered. O(V + E).",
        snippet: "void dfs(int u) {\n  color[u] = 1;\n  for (int v : adj[u]) {\n    if (color[v] == 1) { cyclic = true; return; }\n    if (color[v] == 0) dfs(v);\n  }\n  color[u] = 2;\n  order.push_back(u);      // post-order\n}\n// std::reverse(order.begin(), order.end());"
      },
      {
        variation: "Flood fill or island counting on a grid",
        tip: "The graph is implicit, so neighbours are the four or eight adjacent cells and the visited set can be the grid itself, overwritten in place for O(1) extra space. Bounds checks replace the adjacency list. O(m * n) time.",
        snippet: "void fill(int r, int c, char from) {\n  if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] != from) return;\n  grid[r][c] = '0';                      // mark in place\n  fill(r+1, c, from); fill(r-1, c, from);\n  fill(r, c+1, from); fill(r, c-1, from);\n}"
      },
      {
        variation: "Find bridges or articulation points with Tarjan's low-link",
        tip: "Plain reachability cannot tell which edges are critical. Track each node's discovery time and the lowest discovery time reachable from its subtree; an edge is a bridge when the child's low-link exceeds the parent's discovery time. Still a single O(V + E) DFS.",
        snippet: "void dfs(int u, int parent) {\n  disc[u] = low[u] = ++timer;\n  for (int v : adj[u]) {\n    if (v == parent) continue;\n    if (disc[v]) { low[u] = std::min(low[u], disc[v]); continue; }\n    dfs(v, u);\n    low[u] = std::min(low[u], low[v]);\n    if (low[v] > disc[u]) bridges.push_back({u, v});\n  }\n}"
      }
    ]
  },

  // ===== DYNAMIC PROGRAMMING (6 Topics) =====
  {
    id: "topic-dp-climb-stairs",
    moduleId: "mod-dynamic-programming",
    title: "Climbing Stairs",
    intuition: "To reach step n, must come from n-1 or n-2. dp[n] = dp[n-1] + dp[n-2]. Classic DP base case.",
    lesson: [
      {
        title: "State Definition",
        content: "dp[i] = number of ways to reach step i. Base: dp[1]=1, dp[2]=2. Transition: dp[i] = dp[i-1] + dp[i-2].",
        codeExample: "vector<int> dp(n + 1);\ndp[1] = 1; dp[2] = 2;\nfor (int i = 3; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];\nreturn dp[n];",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Climb 3 Stairs",
        input: "n = 3",
        output: "3",
        explanation: "Ways: 1+1+1, 1+2, 2+1. Total = 3. dp[3] = dp[2] + dp[1] = 2 + 1 = 3.",
        diagram: undefined
      }
    ],
    complexity: { time: "O(n)", space: "O(n)" },
    tips: ["Space optimization: only need last two values ? O(1) space"],
    references: [{ source: "leetcode", attribution: "LeetCode #70", insight: "Gateway DP problem." }],
    practiceProblems: [
      {
        variation: "You may climb 1, 2 or 3 steps at a time",
        tip: "The recurrence widens to the sum of the previous three states, so a two-variable rolling window is no longer enough. Keep three variables, or generalise to a window of size k. O(n) time and O(1) space.",
        snippet: "int a = 1, b = 1, c = 2;              // ways to reach 0, 1, 2\nfor (int i = 3; i <= n; ++i) {\n  int d = a + b + c;\n  a = b; b = c; c = d;\n}\nreturn n == 0 ? 1 : (n == 1 ? 1 : c);"
      },
      {
        variation: "Min Cost Climbing Stairs — each step carries a cost",
        tip: "Counting turns into minimising, so the plus becomes a min and each transition adds the step's cost. You may start from index 0 or 1, so the answer is the min of the last two states. O(n) time and O(1) space.",
        snippet: "int a = 0, b = 0;                     // min cost to stand on i-2, i-1\nfor (int i = 2; i <= n; ++i) {\n  int c = std::min(a + cost[i-2], b + cost[i-1]);\n  a = b; b = c;\n}\nreturn b;"
      },
      {
        variation: "Some steps are broken and cannot be used",
        tip: "The recurrence is unchanged, but a broken index must be forced to zero ways rather than inheriting its predecessors. Guard the assignment; forgetting this is the classic bug because the value silently propagates. O(n) time and O(n) space unless you track the skip pattern.",
        snippet: "std::vector<long long> dp(n + 1, 0);\ndp[0] = 1;\nfor (int i = 1; i <= n; ++i) {\n  if (broken[i]) { dp[i] = 0; continue; }   // must be forced to 0\n  dp[i] = dp[i-1] + (i >= 2 ? dp[i-2] : 0);\n}\nreturn dp[n];"
      },
      {
        variation: "Enumerate the actual step sequences, not just count them",
        tip: "Counting collapses paths, so DP cannot recover them — you need backtracking. The output size is exponential, roughly Fibonacci-many sequences, so the algorithm is output-sensitive rather than O(n). Push and pop a shared vector to avoid copying.",
        snippet: "void go(int rem) {\n  if (rem == 0) { out.push_back(path); return; }\n  for (int s : {1, 2}) if (s <= rem) {\n    path.push_back(s);\n    go(rem - s);\n    path.pop_back();\n  }\n}"
      },
      {
        variation: "n is up to 10^18 and the answer is needed modulo 1e9+7",
        tip: "Linear DP is far too slow at that size. Express the recurrence as a 2x2 matrix and exponentiate it by squaring, which gives O(log n) time. Use modular multiplication throughout and 64-bit intermediates to avoid overflow.",
        snippet: "// [[1,1],[1,0]]^n gives Fibonacci; multiply under MOD\nMat mul(const Mat& x, const Mat& y) {\n  Mat r{};\n  for (int i = 0; i < 2; ++i)\n    for (int k = 0; k < 2; ++k)\n      for (int j = 0; j < 2; ++j)\n        r[i][j] = (r[i][j] + (__int128)x[i][k] * y[k][j]) % MOD;\n  return r;\n}"
      },
      {
        variation: "A 2D staircase — count paths in a grid with obstacles",
        tip: "The single-dimension state becomes a cell, and each cell sums the ways from above and from the left. Obstacles are zeroed exactly like broken steps. O(m * n) time, and O(n) space with a rolling row updated in place.",
        snippet: "std::vector<long long> dp(n, 0);\ndp[0] = grid[0][0] ? 0 : 1;\nfor (int i = 0; i < m; ++i)\n  for (int j = 0; j < n; ++j) {\n    if (grid[i][j]) { dp[j] = 0; continue; }\n    if (j) dp[j] += dp[j-1];              // dp[j] already holds the row above\n  }\nreturn dp[n-1];"
      }
    ]
  }
];

