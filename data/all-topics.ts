// Aggregate view over every track's topic dataset, used by build-time scripts
// and by anything that legitimately needs all tracks at once.
//
// The per-track datasets now live in data/topics/{dsa,lld,hld,ai}.ts so the app
// can load a single track's content on demand. Importing this module pulls in
// all four tracks, so client components should import the per-track module they
// need instead (see app/home-view.tsx).
import { Topic, syllabus } from "./syllabus";
import { googleDsaProblems, googleCheatSheetReference } from "./google-cheat-sheet-integration";
import { allDsaTopics } from "./topics/dsa";
import { allLldTopics } from "./topics/lld";
import { allHldTopics } from "./topics/hld";
import { allAiTopics } from "./topics/ai";
import { allOsTopics } from "./topics/os";
import { allCppTopics } from "./topics/cpp";

export { allDsaTopics, allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics };

export const allTopics: Topic[] = [
  ...allDsaTopics,
  ...allLldTopics,
  ...allHldTopics,
  ...allAiTopics,
  ...allOsTopics,
  ...allCppTopics
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
    practiceProblems: googleDsaProblems.filter(p => p.category === "Arrays Strings").map(p => `google-${p.leetcodeId.toLowerCase()}`)
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
    practiceProblems: googleDsaProblems.filter(p => p.category === "Trees Graphs").map(p => `google-${p.leetcodeId.toLowerCase()}`)
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
    practiceProblems: googleDsaProblems.filter(p => p.category === "Dynamic Programming").map(p => `google-${p.leetcodeId.toLowerCase()}`)
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
