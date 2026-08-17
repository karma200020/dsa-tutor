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
    practiceProblems: ["prob-valid-anagram", "prob-group-anagrams"]
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
    practiceProblems: ["prob-two-sum", "prob-3sum", "prob-4sum"]
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
    practiceProblems: ["prob-range-sum", "prob-subarray-sum-k"]
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
    practiceProblems: ["prob-max-subarray-sum", "prob-min-window-substring"]
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
    practiceProblems: ["prob-longest-substring"]
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
    practiceProblems: ["prob-container-water"]
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
    practiceProblems: ["prob-remove-duplicates", "prob-remove-k-duplicates"]
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
    practiceProblems: ["prob-trapping-rain"]
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
    practiceProblems: ["prob-rotate-array"]
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
    practiceProblems: ["prob-valid-parentheses"]
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
    practiceProblems: ["prob-sort-colors"]
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
    practiceProblems: ["prob-merge-sorted"]
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
    practiceProblems: ["prob-partition-array"]
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
    practiceProblems: ["prob-group-anagrams"]
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
    practiceProblems: ["prob-next-greater"]
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
    practiceProblems: ["prob-largest-rectangle"]
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
    practiceProblems: ["prob-sliding-window-max"]
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
    practiceProblems: ["prob-binary-search"]
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
    practiceProblems: ["prob-first-last-position"]
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
    practiceProblems: ["prob-rotated-search"]
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
    practiceProblems: ["prob-reverse-list"]
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
    practiceProblems: ["prob-detect-cycle"]
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
    practiceProblems: ["prob-inorder-traversal"]
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
    practiceProblems: ["prob-validate-bst"]
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
    practiceProblems: ["prob-bfs"]
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
    practiceProblems: ["prob-dfs"]
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
    practiceProblems: ["prob-climb-stairs"]
  }
];

