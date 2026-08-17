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
      "Count element occurrences to solve grouping, anagram, and majority problems. Core pattern: build frequency map â answer queries.",
    lesson: [
      {
        title: "Understanding Frequency Maps",
        content: "A frequency map (HashMap) stores count of each element. Instead of comparing arrays element-by-element (O(nÂ²)), we count once (O(n)) then answer queries in O(1). This is a fundamental optimization technique.",
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
  lâ1, iâ1, sâ1, tâ1, eâ1, nâ1

Step 2: Iterate through 't = silent' and decrement
  Process 's': freq['s'] becomes 0
  Process 'i': freq['i'] becomes 0
  Process 'l': freq['l'] becomes 0
  Process 'e': freq['e'] becomes 0
  Process 'n': freq['n'] becomes 0
  Process 't': freq['t'] becomes 0

Step 3: All characters used exactly once
  All counts reached 0 â Return true (valid anagram!)`
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
      "Trigger keywords: 'Find', 'Count', 'Group', 'Majority', 'Valid' â often need frequency map",
      "Core pattern: Count (O(n)) â Query (O(k))",
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
    practiceProblems: ["lc-242-valid-anagram", "lc-347-top-k-elements", "lc-49-group-anagrams"],
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
  Process 's': freq['s']-- = 1â0 â
  Process 'i': freq['i']-- = 1â0 â
  Process 'l': freq['l']-- = 1â0 â
  Process 'e': freq['e']-- = 1â0 â
  Process 'n': freq['n']-- = 1â0 â
  Process 't': freq['t']-- = 1â0 â

Result: All decrements succeeded â Return true`
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
           = 9  â (which is 2+3+4)`
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
    practiceProblems: ["lc-560-subarray-sum", "lc-303-range-sum"]
  },

  {
    id: "topic-two-pointer-basic",
    moduleId: "mod-two-pointers-sliding",
    title: "Two Pointer Technique",
    intuition:
      "Use two pointers moving toward each other on sorted arrays. Avoids O(nÂ²) nested loops.",
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
  sum = 2 + 7 = 9  â FOUND!
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
    practiceProblems: ["lc-167-two-sum-ii", "lc-11-container-water"]
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
  [1, 3, 2] â sum = 6
  [3, 2, 6] â sum = 11
  [2, 6, -1] â sum = 7
  [6, -1, 4] â sum = 9
  [-1, 4, 1] â sum = 4
  [4, 1, 8] â sum = 13  â Maximum!
  [1, 8, 2] â sum = 11`
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
    practiceProblems: ["lc-643-max-average"]
  },

  {
    id: "topic-sliding-window-variable",
    moduleId: "mod-two-pointers-sliding",
    title: "Sliding Window - Variable Size",
    intuition:
      "Expand right to include elements, contract left when constraint violated. Each element enters/exits at most once â O(n).",
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
      "Each element enters window once and exits once â O(n) total",
      "Maintain HashMap/array to track elements in window"
    ],
    interviewPatterns: [
      "Longest substring without repeating characters",
      "Minimum window substring",
      "Longest substring with at most k distinct characters"
    ],
    practiceProblems: ["lc-3-longest-substring", "lc-76-minimum-window"]
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
  Add to map: {2â0}

i=1: num=7
  complement = 9 - 7 = 2
  2 IS in map at index 0!
  Return [0, 1]  â`
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
    practiceProblems: ["lc-1-two-sum", "lc-15-three-sum", "lc-18-four-sum"]
  }
];
