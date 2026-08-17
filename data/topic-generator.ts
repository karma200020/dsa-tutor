// Topic Generator for DSA Tutor - Allows easy topic creation
import { Topic } from "./syllabus";

interface TopicTemplate {
  id: string;
  moduleId: string;
  title: string;
  intuition: string;
  methodology: string;
  cppCode: string;
  workedExample: string;
  complexity: { time: string; space: string };
  tips: string[];
  tricks: string[];
  memoryAids: string[];
  interviewPatterns: string[];
}

export function createTopic(template: TopicTemplate): Topic {
  return {
    id: template.id,
    moduleId: template.moduleId,
    title: template.title,
    intuition: template.intuition,
    methodology: template.methodology,
    cppCode: template.cppCode,
    workedExample: template.workedExample,
    complexity: template.complexity,
    tips: template.tips,
    tricks: template.tricks,
    memoryAids: template.memoryAids,
    interviewPatterns: template.interviewPatterns,
    references: [
      {
        source: "blog",
        attribution: "LeetCode Discussions",
        insight: "This is a common interview pattern. Practice multiple variations."
      },
      {
        source: "interview-experience",
        attribution: "FAANG Interview Feedback",
        insight: "Interviewers often ask variations of this problem to test understanding."
      }
    ],
    practiceProblems: []
  };
}

// === DSA TOPICS - EXPANDED ===

export const dsaTopicsExpanded: TopicTemplate[] = [
  // ARRAYS & STRINGS MODULE
  {
    id: "topic-array-basics",
    moduleId: "mod-arrays-strings",
    title: "Array Fundamentals",
    intuition: "Arrays store elements in contiguous memory. Fast random access, slow insertions.",
    methodology: "Understand indexing â Access O(1) â Iterate O(n) â Handle bounds",
    cppCode: `vector<int> arr = {1, 2, 3};
arr[0];  // O(1)
arr.push_back(4);  // O(1) amortized
arr.insert(arr.begin() + 1, 10);  // O(n)`,
    workedExample: `Access arr[2] in [1,2,3,4,5]
Memory: [1|2|3|4|5] at indices 0,1,2,3,4
arr[2] returns 3 instantly`,
    complexity: { time: "O(1) access, O(n) insert/delete", space: "O(n)" },
    tips: ["0-indexed", "Bounds check always", "Dynamic array growth is amortized O(1)"],
    tricks: ["Two pointers for reverse", "Prefix sum for range queries"],
    memoryAids: ["INDEX = 0 to n-1"],
    interviewPatterns: ["Find max/min", "Rotate array", "Remove element"]
  },

  {
    id: "topic-string-basics",
    moduleId: "mod-arrays-strings",
    title: "String Fundamentals",
    intuition: "Strings are sequences of characters. Immutable in most languages.",
    methodology: "Access char â Build with StringBuilder â Optimize for immutability",
    cppCode: `string s = "hello";
s[0];  // 'h'
s.substr(1, 3);  // "ell"
s + "world";  // "helloworld"`,
    workedExample: `Access s[2] in "hello"
h(0)e(1)l(2)l(3)o(4)
s[2] = 'l'`,
    complexity: { time: "O(n) operations", space: "O(n) or O(1)" },
    tips: ["Immutable â use StringBuilder", "Char array for in-place", "Substring is O(k)"],
    tricks: ["Compare after sorting for anagrams", "Reverse for palindrome"],
    memoryAids: ["IMMUTABLE in Java, Python"],
    interviewPatterns: ["Reverse string", "Palindrome", "Anagram"]
  },

  {
    id: "topic-freq-maps",
    moduleId: "mod-arrays-strings",
    title: "Frequency Maps & Counting",
    intuition: "Use hash maps to count occurrences. Enables O(n) solutions for grouping.",
    methodology: "Count all â Use map to answer â Compare/find duplicates",
    cppCode: `unordered_map<char, int> freq;
for(char c : s) freq[c]++;
// Check for duplicates: freq[c] > 1
// Find majority: freq[c] > n/2`,
    workedExample: `Count chars in "mississippi"
m:1, i:4, s:4, p:2
Find: most frequent = i or s`,
    complexity: { time: "O(n)", space: "O(k) unique chars" },
    tips: ["Hash map for any alphabet", "Array for 26 letters", "Early exit when found"],
    tricks: ["Sort by frequency then sort values", "Use pairs for sorting"],
    memoryAids: ["COUNT â MAP â COMPARE"],
    interviewPatterns: ["Valid anagram", "Group anagrams", "First unique char"]
  },

  {
    id: "topic-prefix-sums",
    moduleId: "mod-arrays-strings",
    title: "Prefix Sums & Range Queries",
    intuition: "Precompute cumulative sums for O(1) range queries.",
    methodology: "Build prefix array â Query: prefix[j+1] - prefix[i]",
    cppCode: `vector<int> prefix(n+1);
prefix[0] = 0;
for(int i = 0; i < n; i++) prefix[i+1] = prefix[i] + arr[i];
// Range sum [i,j] = prefix[j+1] - prefix[i]`,
    workedExample: `arr = [1,3,5,7]
prefix = [0,1,4,9,16]
sum(1,2) = prefix[3] - prefix[1] = 9 - 1 = 8`,
    complexity: { time: "O(n) build, O(1) query", space: "O(n)" },
    tips: ["1-indexed prefix simpler", "Works for 2D also", "Useful with hash map"],
    tricks: ["Combine with hash map for subarray sum", "Extended to 2D: prefix[i][j]"],
    memoryAids: ["BUILD â INDEX â QUERY"],
    interviewPatterns: ["Range sum query", "Subarray sum equals K", "Max subarray sum"]
  },

  {
    id: "topic-sliding-window-fixed",
    moduleId: "mod-arrays-strings",
    title: "Sliding Window - Fixed Size",
    intuition: "Maintain fixed window, slide right. Fast for contiguous window problems.",
    methodology: "Build first window â Slide right â Remove leftmost â Add rightmost",
    cppCode: `int k = 3;
int sum = 0;
for(int i = 0; i < k; i++) sum += arr[i];
vector<int> result = {sum};
for(int i = k; i < n; i++) {
    sum = sum - arr[i-k] + arr[i];
    result.push_back(sum);
}`,
    workedExample: `Max sum subarray size 3 in [1,3,1,2,7,5]
Window [1,3,1] = 5
Window [3,1,2] = 6
Window [1,2,7] = 10
Window [2,7,5] = 14 â max`,
    complexity: { time: "O(n)", space: "O(1) or O(k) for output" },
    tips: ["Single pass", "Maintain state for window", "Works for any window size"],
    tricks: ["Use queue/deque for max/min", "Extend to variable window"],
    memoryAids: ["SLIDE: Remove left, add right"],
    interviewPatterns: ["Max sum subarray", "Average of subarrays", "Max consecutive ones"]
  },

  {
    id: "topic-sliding-window-variable",
    moduleId: "mod-arrays-strings",
    title: "Sliding Window - Variable Size",
    intuition: "Expand window until invalid, shrink until valid. For substring problems.",
    methodology: "Expand right â Check validity â Shrink left if invalid â Record answer",
    cppCode: `int left = 0;
for(int right = 0; right < n; right++) {
    window.add(arr[right]);
    while(!isValid(window)) {
        window.remove(arr[left]);
        left++;
    }
    result = max(result, right - left + 1);
}`,
    workedExample: `Longest substring without duplicate "abcabcbb"
[a] â [ab] â [abc] â a repeats, shrink â [bc] â [bca] â a repeats, shrink â [cab] â 
answer: 3`,
    complexity: { time: "O(n) two pointer", space: "O(k) window state" },
    tips: ["Left pointer never moves backward", "Maintain invariant clearly", "Use hash map/set"],
    tricks: ["Check validity on right expand, on left shrink", "Restart left pointer"],
    memoryAids: ["EXPAND â VALIDATE â SHRINK â RECORD"],
    interviewPatterns: ["Longest substring no repeat", "Min window substring", "Max ones flips"]
  },

  {
    id: "topic-two-pointers",
    moduleId: "mod-arrays-strings",
    title: "Two Pointers Technique",
    intuition: "Use two pointers from start and end. Reduces nested loops.",
    methodology: "Start from ends â Move towards center â Stop at condition",
    cppCode: `int left = 0, right = n - 1;
while(left < right) {
    if(arr[left] + arr[right] == target) return true;
    else if(arr[left] + arr[right] < target) left++;
    else right--;
}`,
    workedExample: `Two sum in sorted [1,2,3,6], target=9
left=0(1), right=3(6): 1+6=7 < 9, left++
left=1(2), right=3(6): 2+6=8 < 9, left++
left=2(3), right=3(6): 3+6=9 â`,
    complexity: { time: "O(n)", space: "O(1)" },
    tips: ["Works on sorted arrays", "Pointers never move backward", "Reduces to O(n) from O(nÂ²)"],
    tricks: ["Reverse array for different order", "Skip duplicates"],
    memoryAids: ["LEFT+RIGHT â convergence"],
    interviewPatterns: ["Two sum", "Container with most water", "3Sum"]
  },

  // ... Continue with more topics for Arrays & Strings
  // Then add topics for other modules (Linked Lists, Stacks, etc.)
];

// DSA TOPICS FOR OTHER MODULES would follow same pattern
// This gives us a template to quickly expand to 60+ topics

export function generateAllDsaTopics(): Topic[] {
  return dsaTopicsExpanded.map(createTopic);
}
