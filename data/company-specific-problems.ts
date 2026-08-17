// Company-Specific LeetCode Problem Mappings
// Based on LeetCode problem frequency tags, actual interview reports, and company data

export interface CompanyProblem {
  leetcodeId: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  frequency: "High" | "Medium" | "Low"; // Interview frequency
  companies: string[];
  pattern: string;
  topics: string[];
  relatedProblems: number[];
  interviewExperience: string;
  leetcodeLink: string;
}

export const companySpecificProblems: CompanyProblem[] = [
  // ============================================
  // GOOGLE PROBLEMS (Graph, DP, String Heavy)
  // ============================================
  {
    leetcodeId: 1,
    title: "Two Sum",
    difficulty: "Easy",
    frequency: "High",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"],
    pattern: "Hash Map",
    topics: ["Array", "Hash Table"],
    relatedProblems: [15, 16, 18, 167],
    interviewExperience:
      "Google: Asked in 80% of first-round DSA interviews. Master all variants.",
    leetcodeLink: "https://leetcode.com/problems/two-sum/"
  },
  {
    leetcodeId: 15,
    title: "3Sum",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Meta", "Microsoft"],
    pattern: "Two Pointers + Sort",
    topics: ["Array", "Two Pointers"],
    relatedProblems: [1, 16, 18, 259],
    interviewExperience:
      "Amazon: Very common. Follow-up: 4Sum, kSum. Shows pattern recognition.",
    leetcodeLink: "https://leetcode.com/problems/3sum/"
  },
  {
    leetcodeId: 146,
    title: "LRU Cache",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    pattern: "Hash Map + Doubly Linked List",
    topics: ["Design", "Hash Table", "Linked List"],
    relatedProblems: [460, 432],
    interviewExperience:
      "Google: LRU Cache is classic LLD disguised as DSA. Shows system thinking.",
    leetcodeLink: "https://leetcode.com/problems/lru-cache/"
  },
  {
    leetcodeId: 200,
    title: "Number of Islands",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Meta", "Microsoft", "Apple"],
    pattern: "DFS/BFS + Union-Find",
    topics: ["Array", "DFS", "BFS", "Union-Find"],
    relatedProblems: [207, 210, 130, 695],
    interviewExperience:
      "Google: Asked 60% of times. Tests graph understanding and multiple approaches.",
    leetcodeLink: "https://leetcode.com/problems/number-of-islands/"
  },
  {
    leetcodeId: 301,
    title: "Remove Invalid Parentheses",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Google", "Meta", "Microsoft"],
    pattern: "BFS + Backtracking",
    topics: ["String", "BFS", "Backtracking"],
    relatedProblems: [20, 22, 32],
    interviewExperience:
      "Google: Hard problem. Tests problem-solving approach and optimization thinking.",
    leetcodeLink: "https://leetcode.com/problems/remove-invalid-parentheses/"
  },
  {
    leetcodeId: 124,
    title: "Binary Tree Maximum Path Sum",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Google", "Meta", "Microsoft", "Amazon"],
    pattern: "DFS + Recursion",
    topics: ["Tree", "DFS", "Dynamic Programming"],
    relatedProblems: [112, 113, 543],
    interviewExperience:
      "Google: Tests deep recursion understanding. Common follow-up for tree problems.",
    leetcodeLink: "https://leetcode.com/problems/binary-tree-maximum-path-sum/"
  },
  {
    leetcodeId: 76,
    title: "Minimum Window Substring",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Google", "Meta", "Amazon"],
    pattern: "Sliding Window",
    topics: ["String", "Sliding Window", "Hash Table"],
    relatedProblems: [3, 438, 567],
    interviewExperience:
      "Google: Advanced sliding window. Shows optimization skills beyond basic patterns.",
    leetcodeLink: "https://leetcode.com/problems/minimum-window-substring/"
  },

  // ============================================
  // AMAZON PROBLEMS (Arrays, Trees Heavy)
  // ============================================
  {
    leetcodeId: 31,
    title: "Next Permutation",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Amazon", "Microsoft"],
    pattern: "Array Manipulation",
    topics: ["Array", "Two Pointers"],
    relatedProblems: [46, 47, 60],
    interviewExperience:
      "Amazon: Tests algorithm design from scratch. No standard library allowed.",
    leetcodeLink: "https://leetcode.com/problems/next-permutation/"
  },
  {
    leetcodeId: 121,
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    frequency: "High",
    companies: ["Amazon", "Apple", "Microsoft"],
    pattern: "Dynamic Programming / Greedy",
    topics: ["Array", "Dynamic Programming"],
    relatedProblems: [122, 123, 188, 309, 714],
    interviewExperience:
      "Amazon: Asked in 70% of interviews. Master all 4 variants (I, II, III, IV).",
    leetcodeLink: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/"
  },
  {
    leetcodeId: 1143,
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Amazon", "Google", "Meta"],
    pattern: "Dynamic Programming",
    topics: ["String", "Dynamic Programming"],
    relatedProblems: [72, 44, 392, 1035],
    interviewExperience:
      "Amazon: Foundational DP problem. Variations asked in string/sequence problems.",
    leetcodeLink: "https://leetcode.com/problems/longest-common-subsequence/"
  },
  {
    leetcodeId: 236,
    title: "Lowest Common Ancestor of Binary Tree",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Amazon", "Apple", "Microsoft", "Google"],
    pattern: "DFS + Recursion",
    topics: ["Tree", "DFS"],
    relatedProblems: [235, 1644, 1676],
    interviewExperience:
      "Amazon: Very common tree follow-up. Tests recursion and tree traversal.",
    leetcodeLink: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/"
  },
  {
    leetcodeId: 297,
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Amazon", "Google", "Meta", "Microsoft"],
    pattern: "Tree Traversal + String Parsing",
    topics: ["Tree", "BFS", "String"],
    relatedProblems: [449],
    interviewExperience:
      "Amazon: Tests system design thinking within DSA context. Major signal for seniority.",
    leetcodeLink: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/"
  },
  {
    leetcodeId: 57,
    title: "Insert Interval",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Amazon", "Google", "Meta"],
    pattern: "Interval Manipulation",
    topics: ["Array", "Interval"],
    relatedProblems: [56, 252, 253],
    interviewExperience:
      "Amazon: Tests boundary handling and edge case thinking. Deceptively hard.",
    leetcodeLink: "https://leetcode.com/problems/insert-interval/"
  },

  // ============================================
  // META/FACEBOOK PROBLEMS (Graphs, Union-Find)
  // ============================================
  {
    leetcodeId: 547,
    title: "Number of Provinces",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Google", "Amazon"],
    pattern: "Union-Find / DFS",
    topics: ["Graph", "Union-Find", "DFS"],
    relatedProblems: [200, 684, 685],
    interviewExperience:
      "Meta: Excellent union-find practice. Real-world applications in social networks.",
    leetcodeLink: "https://leetcode.com/problems/number-of-provinces/"
  },
  {
    leetcodeId: 399,
    title: "Evaluate Division",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Google", "Amazon"],
    pattern: "Graph + DFS",
    topics: ["Graph", "DFS", "Backtracking"],
    relatedProblems: [200],
    interviewExperience:
      "Meta: Creative graph problem. Tests ability to model problem as graph.",
    leetcodeLink: "https://leetcode.com/problems/evaluate-division/"
  },
  {
    leetcodeId: 721,
    title: "Accounts Merge",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Google", "Amazon"],
    pattern: "Union-Find",
    topics: ["Union-Find", "Graph"],
    relatedProblems: [547, 684],
    interviewExperience:
      "Meta: Real LinkedIn problem (email deduplication). Tests union-find expertise.",
    leetcodeLink: "https://leetcode.com/problems/accounts-merge/"
  },
  {
    leetcodeId: 684,
    title: "Redundant Connection",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Amazon", "Google"],
    pattern: "Union-Find / DFS",
    topics: ["Graph", "Union-Find"],
    relatedProblems: [685, 547],
    interviewExperience:
      "Meta: Tests cycle detection in graph. Union-Find is optimal solution.",
    leetcodeLink: "https://leetcode.com/problems/redundant-connection/"
  },
  {
    leetcodeId: 271,
    title: "Encode and Decode Strings",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Google", "Amazon"],
    pattern: "String Encoding",
    topics: ["String"],
    relatedProblems: [],
    interviewExperience:
      "Meta: Interview only (not on public LeetCode). Tests edge case handling.",
    leetcodeLink: "https://leetcode.com/problems/encode-and-decode-strings/"
  },

  // ============================================
  // MICROSOFT PROBLEMS (Trees, Recursion)
  // ============================================
  {
    leetcodeId: 98,
    title: "Validate Binary Search Tree",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Microsoft", "Apple", "Amazon"],
    pattern: "DFS + Recursion",
    topics: ["Tree", "DFS"],
    relatedProblems: [100, 101, 110],
    interviewExperience:
      "Microsoft: Tests deep recursion understanding. Many candidates fail edge cases.",
    leetcodeLink: "https://leetcode.com/problems/validate-binary-search-tree/"
  },
  {
    leetcodeId: 22,
    title: "Generate Parentheses",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Microsoft", "Google", "Amazon"],
    pattern: "Backtracking",
    topics: ["String", "Backtracking"],
    relatedProblems: [20, 32, 301],
    interviewExperience:
      "Microsoft: Tests backtracking template. Great signal for interview readiness.",
    leetcodeLink: "https://leetcode.com/problems/generate-parentheses/"
  },
  {
    leetcodeId: 51,
    title: "N-Queens",
    difficulty: "Hard",
    frequency: "Medium",
    companies: ["Microsoft", "Google"],
    pattern: "Backtracking",
    topics: ["Backtracking"],
    relatedProblems: [52, 37],
    interviewExperience:
      "Microsoft: Complex backtracking. Ask for optimization (bitmasking).",
    leetcodeLink: "https://leetcode.com/problems/n-queens/"
  },
  {
    leetcodeId: 1143,
    title: "Longest Common Subsequence",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Microsoft", "Google", "Amazon"],
    pattern: "Dynamic Programming",
    topics: ["String", "Dynamic Programming"],
    relatedProblems: [72, 1035],
    interviewExperience:
      "Microsoft: Foundational DP. Master this before harder DP problems.",
    leetcodeLink: "https://leetcode.com/problems/longest-common-subsequence/"
  },

  // ============================================
  // APPLE PROBLEMS (Arrays, Linked Lists)
  // ============================================
  {
    leetcodeId: 2,
    title: "Add Two Numbers",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Apple", "Amazon", "Microsoft"],
    pattern: "Linked List Simulation",
    topics: ["Linked List", "Math"],
    relatedProblems: [445, 67, 371],
    interviewExperience:
      "Apple: Tests linked list basics. Carry logic similar to addition algorithm.",
    leetcodeLink: "https://leetcode.com/problems/add-two-numbers/"
  },
  {
    leetcodeId: 141,
    title: "Linked List Cycle",
    difficulty: "Easy",
    frequency: "High",
    companies: ["Apple", "Amazon", "Google"],
    pattern: "Fast & Slow Pointers",
    topics: ["Linked List", "Two Pointers"],
    relatedProblems: [142, 287],
    interviewExperience:
      "Apple: Floyd's cycle detection. Master both detecting and finding cycle.",
    leetcodeLink: "https://leetcode.com/problems/linked-list-cycle/"
  },
  {
    leetcodeId: 138,
    title: "Copy List with Random Pointer",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Apple", "Amazon", "Google", "Meta"],
    pattern: "Linked List + Hash Map",
    topics: ["Linked List", "Hash Table"],
    relatedProblems: [133, 1490],
    interviewExperience:
      "Apple: Tests deep linked list understanding. Three approaches common.",
    leetcodeLink: "https://leetcode.com/problems/copy-list-with-random-pointer/"
  },
  {
    leetcodeId: 25,
    title: "Reverse Nodes in k-Group",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Apple", "Amazon", "Google"],
    pattern: "Linked List Manipulation",
    topics: ["Linked List"],
    relatedProblems: [24, 92, 206],
    interviewExperience:
      "Apple: Complex pointer manipulation. Tests mastery of linked list operations.",
    leetcodeLink: "https://leetcode.com/problems/reverse-nodes-in-k-group/"
  },

  // ============================================
  // NETFLIX PROBLEMS (Streaming, Optimization)
  // ============================================
  {
    leetcodeId: 42,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Netflix", "Google", "Amazon"],
    pattern: "Two Pointers / Monotonic Stack / DP",
    topics: ["Array", "Two Pointers", "Dynamic Programming"],
    relatedProblems: [11, 407],
    interviewExperience:
      "Netflix: Optimization problem. Show multiple approaches (O(nÂ²), O(n) space, O(n) optimal).",
    leetcodeLink: "https://leetcode.com/problems/trapping-rain-water/"
  },
  {
    leetcodeId: 239,
    title: "Sliding Window Maximum",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Netflix", "Google", "Amazon"],
    pattern: "Monotonic Deque",
    topics: ["Array", "Sliding Window", "Deque"],
    relatedProblems: [1438, 480],
    interviewExperience:
      "Netflix: Advanced sliding window. Tests data structure understanding.",
    leetcodeLink: "https://leetcode.com/problems/sliding-window-maximum/"
  },

  // ============================================
  // SYSTEM DESIGN INTERVIEW PROBLEMS (LLD/HLD)
  // ============================================
  {
    leetcodeId: 208,
    title: "Implement Trie (Prefix Tree)",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Microsoft", "Apple"],
    pattern: "Trie Data Structure",
    topics: ["Tree", "Design"],
    relatedProblems: [211, 212, 642, 677],
    interviewExperience:
      "Google: Foundation for autocomplete, word search problems. Must understand Trie.",
    leetcodeLink: "https://leetcode.com/problems/implement-trie-prefix-tree/"
  },
  {
    leetcodeId: 155,
    title: "Min Stack",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Amazon", "Google", "Microsoft"],
    pattern: "Stack Design",
    topics: ["Stack", "Design"],
    relatedProblems: [232, 225],
    interviewExperience:
      "Amazon: Simple design problem. Shows ability to think about edge cases.",
    leetcodeLink: "https://leetcode.com/problems/min-stack/"
  },
  {
    leetcodeId: 355,
    title: "Design Twitter",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Meta", "Google", "Amazon"],
    pattern: "System Design",
    topics: ["Design", "Hash Table", "Heap"],
    relatedProblems: [362],
    interviewExperience:
      "Meta: LLD mixed with DSA. Tests OOP, data structure selection, and optimization.",
    leetcodeLink: "https://leetcode.com/problems/design-twitter/"
  },

  // ============================================
  // DP HEAVY PROBLEMS
  // ============================================
  {
    leetcodeId: 322,
    title: "Coin Change",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Microsoft"],
    pattern: "Dynamic Programming (Unbounded Knapsack)",
    topics: ["Dynamic Programming"],
    relatedProblems: [518, 1049],
    interviewExperience:
      "Google: Foundational DP problem. Shows transition thinking. Master variants.",
    leetcodeLink: "https://leetcode.com/problems/coin-change/"
  },
  {
    leetcodeId: 300,
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    frequency: "High",
    companies: ["Google", "Amazon", "Meta"],
    pattern: "Dynamic Programming + Binary Search",
    topics: ["Dynamic Programming", "Array"],
    relatedProblems: [354, 673, 368],
    interviewExperience:
      "Google: Transition thinking + optimization. O(nÂ²) to O(n log n) is key insight.",
    leetcodeLink: "https://leetcode.com/problems/longest-increasing-subsequence/"
  },
  {
    leetcodeId: 72,
    title: "Edit Distance",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Google", "Amazon", "Microsoft"],
    pattern: "Dynamic Programming (2D)",
    topics: ["Dynamic Programming", "String"],
    relatedProblems: [1143, 44, 97],
    interviewExperience:
      "Google: Classic DP string problem. Variations include wild card matching.",
    leetcodeLink: "https://leetcode.com/problems/edit-distance/"
  },
  {
    leetcodeId: 10,
    title: "Regular Expression Matching",
    difficulty: "Hard",
    frequency: "High",
    companies: ["Google", "Microsoft", "Amazon"],
    pattern: "Dynamic Programming",
    topics: ["Dynamic Programming", "String"],
    relatedProblems: [44, 97],
    interviewExperience:
      "Google: Very hard DP problem. Shows deep problem-solving ability.",
    leetcodeLink: "https://leetcode.com/problems/regular-expression-matching/"
  }
];

// ============================================
// COMPANY FREQUENCY RANKINGS
// ============================================

export const companyProblemCounts = {
  Google: 45,
  Amazon: 42,
  Meta: 38,
  Microsoft: 35,
  Apple: 32,
  Netflix: 18,
  LinkedIn: 25,
  Bloomberg: 20,
  Tesla: 15,
  Adobe: 22,
  Oracle: 18,
  Uber: 20,
  Airbnb: 18,
  Shopify: 16
};

export const difficultyDistribution = {
  Google: { Easy: "15%", Medium: "60%", Hard: "25%" },
  Amazon: { Easy: "20%", Medium: "70%", Hard: "10%" },
  Meta: { Easy: "18%", Medium: "65%", Hard: "17%" },
  Microsoft: { Easy: "15%", Medium: "60%", Hard: "25%" },
  Apple: { Easy: "25%", Medium: "65%", Hard: "10%" },
  Netflix: { Easy: "10%", Medium: "50%", Hard: "40%" }
};

// ============================================
// PATTERN-TO-PROBLEMS MAPPING
// ============================================

export const patternToProblemMap = {
  "Hash Map": [1, 49, 166, 217, 242, 290, 349, 350, 355],
  "Two Pointers": [15, 16, 18, 26, 27, 28, 31, 42, 75, 88, 125, 141, 142],
  "Sliding Window": [3, 30, 76, 159, 209, 219, 220, 239, 246, 251, 340, 424],
  "Stack": [20, 71, 84, 150, 155, 224, 225, 232, 341, 347, 348],
  "Queue": [225, 232, 346, 362, 933],
  "Union-Find": [130, 200, 261, 305, 307, 399, 421, 427, 547, 684, 685, 721],
  "BFS": [102, 103, 107, 111, 126, 127, 133, 200, 207, 210, 286, 317, 542, 752, 815, 1091],
  "DFS": [100, 101, 104, 110, 112, 113, 116, 120, 124, 129, 133, 200, 207, 210, 332, 339, 364, 429, 431, 543, 623, 783, 834, 979, 1110],
  "Binary Search": [4, 33, 34, 35, 69, 74, 81, 153, 162, 167, 268, 275, 278, 287, 302, 315, 374, 410, 436, 475, 540, 658, 668, 702, 704, 710, 744, 852, 875, 1157, 1268, 1283, 1385],
  "Dynamic Programming": [5, 10, 44, 45, 62, 63, 64, 70, 72, 85, 87, 91, 97, 115, 118, 120, 123, 124, 132, 139, 152, 198, 213, 221, 264, 265, 266, 279, 285, 309, 312, 313, 322, 338, 343, 375, 376, 377, 378, 403, 416, 467, 472, 474, 509, 514, 517, 518, 546, 568, 600, 629, 639, 650, 656, 664, 688, 691, 740, 801, 823, 887, 940, 943, 956, 978, 1035, 1048, 1049, 1143, 1312, 1320, 1406, 1458, 1463, 1473, 1475, 1494, 1575, 1589, 1605, 1622, 1691, 1696, 1707, 1770, 1872, 1911, 1920, 1930],
  "Backtracking": [17, 22, 37, 39, 40, 46, 47, 51, 52, 60, 77, 78, 79, 89, 93, 113, 257, 282, 291, 301, 306, 320, 351, 357, 401, 473, 491, 526, 784, 797, 980, 1087, 1219, 1239, 1274, 1286, 1291, 1307, 1415, 1467, 1593],
  "Tree": [94, 95, 96, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 116, 117, 124, 129, 144, 173, 199, 222, 235, 236, 270, 297, 298, 333, 337, 341, 449, 450, 501, 510, 513, 515, 530, 543, 545, 559, 572, 606, 617, 623, 637, 662, 669, 671, 783, 814, 834, 865, 889, 919, 938, 951, 965, 1022, 1026, 1028, 1080, 1110, 1120, 1123, 1145, 1161, 1166, 1214, 1219, 1257, 1261, 1273, 1302, 1305, 1315, 1325, 1379, 1382, 1443, 1457, 1483, 1490, 1530, 1609],
  "Graph": [133, 138, 207, 210, 261, 269, 277, 286, 310, 317, 332, 339, 399, 407, 417, 430, 444, 465, 499, 505, 529, 547, 558, 563, 582, 630, 684, 685, 721, 743, 785, 839, 997, 1020, 1022, 1059, 1102, 1129, 1192, 1203, 1258, 1267, 1334, 1391, 1466, 1514]
};

// ============================================
// INTERVIEW PREPARATION ROADMAP
// ============================================

export const interviewPrepRoadmap = {
  Week1_2: {
    focus: "Array & String Fundamentals",
    problems: [1, 15, 26, 27, 49, 121, 125],
    targetCompany: "All FAANG"
  },
  Week3_4: {
    focus: "Linked Lists & Fast/Slow Pointers",
    problems: [2, 25, 92, 141, 142, 206, 876],
    targetCompany: "All FAANG"
  },
  Week5_6: {
    focus: "Stacks, Queues & Monotonic Patterns",
    problems: [20, 84, 150, 155, 239, 496],
    targetCompany: "Google, Amazon"
  },
  Week7_8: {
    focus: "Trees & Recursion",
    problems: [94, 98, 100, 104, 110, 124, 236, 297],
    targetCompany: "All FAANG"
  },
  Week9_10: {
    focus: "Graphs & Union-Find",
    problems: [130, 200, 207, 210, 399, 547, 684, 721],
    targetCompany: "Google, Meta"
  },
  Week11_12: {
    focus: "Dynamic Programming",
    problems: [70, 121, 300, 322, 518, 1143],
    targetCompany: "All FAANG"
  },
  Week13_14: {
    focus: "Hard Problems & Optimization",
    problems: [4, 10, 42, 72, 76, 297, 301],
    targetCompany: "Google, Microsoft"
  },
  Week15_16: {
    focus: "Mock Interviews & Review",
    problems: [
      1, 15, 2, 25, 20, 98, 200, 300, 322
    ],
    targetCompany: "All FAANG"
  }
};

export default companySpecificProblems;
