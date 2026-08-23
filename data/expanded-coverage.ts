import { Topic } from "./syllabus";

function buildTopicSpecificLesson(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("singleton")) {
    return [
      {
        title: "Core idea",
        content: "A singleton is used only for a truly unique system resource such as a logger, configuration, or connection manager. The goal is one shared instance, controlled lifecycle, and safe access across threads.",
        codeExample: "class Logger {\n  private static instance;\n  private constructor() {}\n  static getInstance() {\n    if (!Logger.instance) Logger.instance = new Logger();\n    return Logger.instance;\n  }\n}"
      },
      {
        title: "Interview execution",
        content: "State the use case, explain why a global instance is needed, and discuss thread safety, lazy initialization, and testing concerns. If a singleton can be replaced by dependency injection, that is often a better design.",
        codeExample: "// Good: one shared instance\n// Risk: hidden global state and test coupling\n// Better: inject dependencies when possible"
      }
    ];
  }

  if (lower.includes("factory")) {
    return [
      {
        title: "Core idea",
        content: "A factory centralizes object creation. The client asks for a type and the factory returns the correct concrete implementation, which keeps creation logic separate from business logic.",
        codeExample: "class VehicleFactory {\n  static create(type) {\n    if (type === 'car') return new Car();\n    if (type === 'bike') return new Bike();\n  }\n}"
      },
      {
        title: "Interview execution",
        content: "Describe the creation decision tree, the common interface, and why this improves extensibility. A strong answer mentions open-closed behavior and how new types can be added without changing the client code.",
        codeExample: "// Client does not know the concrete class\n// Add new type by extending the factory map only"
      }
    ];
  }

  if (lower.includes("observer")) {
    return [
      {
        title: "Core idea",
        content: "The observer pattern models a subject that notifies interested listeners when state changes. It is useful for notifications, UI updates, and event-driven systems where multiple consumers need the same event.",
        codeExample: "class Subject {\n  observers = [];\n  subscribe(fn) { this.observers.push(fn); }\n  notify(data) { this.observers.forEach(fn => fn(data)); }\n}"
      },
      {
        title: "Interview execution",
        content: "Clarify who is the subject, who are the observers, and what event is broadcast. Then discuss subscription lifecycle, ordering, and whether the system should allow unsubscribe or retries.",
        codeExample: "// Subject emits state change\n// Observers react independently\n// Loose coupling stays intact"
      }
    ];
  }

  if (lower.includes("rate limiter") || lower.includes("cache")) {
    return [
      {
        title: "Core idea",
        content: "A rate limiter or cache protects the system by enforcing access policy or reusing hot data. The design problem is about capacity, invalidation, correctness, and failure behavior under load.",
        codeExample: "// Token bucket\n// limit requests per window\n// cache hot data with TTL + invalidation"
      },
      {
        title: "Interview execution",
        content: "Define the policy, the window, the capacity, and the failure mode. Explain what happens when the limit is exceeded or when the cache becomes stale, and justify the trade-off between freshness and performance.",
        codeExample: "// check quota\n// reject or delay if exhausted\n// refresh stale entries safely"
      }
    ];
  }

  if (lower.includes("elevator") || lower.includes("parking") || lower.includes("library")) {
    return [
      {
        title: "Core idea",
        content: "These design questions are about modeling real-world entities, responsibilities, and state transitions. The focus is on clean object boundaries, APIs, and operational edge cases.",
        codeExample: "class ParkingLot {\n  findSpot(vehicle);\n  park(vehicle);\n  unpark(ticket);\n}\nclass Ticket {\n  entryTime; exitTime; amount;\n}"
      },
      {
        title: "Interview execution",
        content: "Name the core entities, show how they interact, and address edge cases such as full capacity, invalid state changes, and concurrency. A strong answer explains why the API is easy to extend without breaking other components.",
        codeExample: "// Entities -> services -> state transitions\n// Handle invalid transitions and retries"
      }
    ];
  }

  if (lower.includes("load balancing") || lower.includes("cdn") || lower.includes("replication") || lower.includes("consistency")) {
    return [
      {
        title: "Core idea",
        content: "This is a distributed-systems design question. The key is to choose where to place bottlenecks, how to spread traffic, and what consistency guarantees are required for correctness versus latency.",
        codeExample: "Client -> Load Balancer -> App Servers\nApp -> Cache -> Database\nReplica -> Failover + Sync/Async tradeoff"
      },
      {
        title: "Interview execution",
        content: "Start with traffic estimates and bottleneck identification. Then discuss caching, sharding, replication, and the trade-off between consistency, latency, and operational complexity before finalizing the architecture.",
        codeExample: "// estimate QPS\n// identify hotspot\n// choose failure model\n// explain trade-offs"
      }
    ];
  }

  if (lower.includes("chat") || lower.includes("shortener") || lower.includes("feed") || lower.includes("ride") || lower.includes("notification")) {
    return [
      {
        title: "Core idea",
        content: "These system-design problems combine traffic shaping, persistence, and user-facing latency. The goal is to separate read-heavy and write-heavy paths while keeping the design explainable and fault-tolerant.",
        codeExample: "Read path: cache -> DB\nWrite path: queue -> worker -> store\nRealtime: WebSocket or push queue"
      },
      {
        title: "Interview execution",
        content: "Clarify functional requirements, then estimate scale, identify hot paths, and propose read/write separation, queues, caches, and failover. Always explain why each component is necessary and what bottleneck it solves.",
        codeExample: "// requirements -> constraints -> bottlenecks -> components"
      }
    ];
  }

  return [
    {
      title: "Core idea",
      content: `For ${title}, the crucial decision is to model the real responsibility, constraints, and state transitions clearly before choosing the implementation. The interviewer wants to see that you understand the system shape and the trade-offs.`,
      codeExample: `// Define the problem\n// Identify responsibilities\n// Choose the right abstraction\n// Validate edge cases`
    },
    {
      title: "Interview execution",
      content: `Walk through ${title} as if you are teaching the design. Explain assumptions, the key classes or components, the failure model, and how the design handles scale, concurrency, and future changes.`,
      codeExample: `// clarify requirements\n// state assumptions\n// explain trade-offs\n// justify final design`
    }
  ];
}

function makeTopic(
  id: string,
  moduleId: string,
  title: string,
  intuition: string,
  exampleInput: string,
  exampleOutput: string,
  exampleExplanation: string,
  complexity: { time: string; space: string } = { time: "O(n)", space: "O(n)" },
  practiceProblems: string[] = []
): Topic {
  const cleanTitle = title || "Topic";
  const words = cleanTitle.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const keyWord = words[0] || "pattern";
  const topicSpecificLesson = buildTopicSpecificLesson(cleanTitle);

  return {
    id,
    moduleId,
    title: cleanTitle,
    intuition,
    lesson: topicSpecificLesson,
    examples: [
      {
        title: "Worked example",
        input: exampleInput,
        output: exampleOutput,
        explanation: exampleExplanation,
      }
    ],
    complexity,
    tips: [
      `State the core responsibility or invariant for ${cleanTitle} before choosing the design.`,
      "Handle failure modes and edge cases explicitly before finalizing the solution.",
      "Explain the trade-offs clearly: simplicity, extensibility, and operational cost."
    ],
    tricks: [
      `For ${cleanTitle}, ask: what is the core state, who owns it, and where does the system fail?`,
      "Separate the interface from the implementation and explain why the choice is scalable or testable.",
      "Validate the design with one concrete scenario before you claim it is complete."
    ],
    memoryAids: [
      `${cleanTitle} usually reduces to responsibilities, state, and failure handling.`,
      `Think ${keyWord} -> responsibility -> constraints -> trade-offs -> design.`,
      "The best interview answer is the one that is clear, intentional, and easy to extend."
    ],
    interviewPatterns: [
      `Explain the required behavior for ${cleanTitle} before suggesting a class or service structure.`,
      "Walk the interviewer through the key components, dependencies, and failure boundary.",
      "Discuss the model's trade-offs, edge cases, and how it would evolve with change."
    ],
    references: [
      { source: "leetcode", attribution: "LeetCode", insight: `Core FAANG-style practice for ${cleanTitle}.` },
      { source: "note", attribution: "NeetCode / TakeUForward style notes", insight: `Interview drill for understanding the ${cleanTitle.toLowerCase()} pattern.` }
    ],
    practiceProblems
  };
}
export const coverageTopics: Topic[] = [
  // DSA: Arrays & strings
  makeTopic("topic-arrays-valid-palindrome", "mod-arrays-strings", "Valid Palindrome", "Use two pointers from both ends and compare characters while ignoring case and non-alphanumeric characters.", "racecar", "true", "Compare characters from the outside in; if they match, keep moving inward until the pointer crosses.", { time: "O(n)", space: "O(1)" }, ["lc-125-valid-palindrome"]),
  makeTopic("topic-arrays-longest-common-prefix", "mod-arrays-strings", "Longest Common Prefix", "Compare characters column by column, stopping as soon as one string differs.", "[\"flower\", \"flow\", \"flight\"]", "\"fl\"", "Check the first string as the baseline. At each index, if all strings share the same character, extend the prefix.", { time: "O(n * m)", space: "O(1)" }, ["lc-14-longest-common-prefix"]),
  makeTopic("topic-arrays-product-except-self", "mod-arrays-strings", "Product of Array Except Self", "Compute left product and right product, then combine them to answer each index in O(n) without division.", "[1,2,3,4]", "[24,12,8,6]", "Left prefix product and right suffix product avoid division while preserving O(n) runtime.", { time: "O(n)", space: "O(n)" }, ["lc-238-product-except-self"]),
  makeTopic("topic-arrays-merge-intervals", "mod-arrays-strings", "Merge Intervals", "Sort intervals by start, then merge overlapping ranges while maintaining the current merged interval.", "[[1,3],[2,6],[8,10],[15,18]]", "[[1,6],[8,10],[15,18]]", "After sorting, compare the current merge end with the next interval start. If it overlaps, extend the range; otherwise, flush it.", { time: "O(n log n)", space: "O(1)" }, ["lc-56-merge-intervals"]),
  makeTopic("topic-arrays-insert-interval", "mod-arrays-strings", "Insert Interval", "Split the intervals by non-overlap, insert the new one, then merge adjacent intervals.", "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]", "[[1,2],[3,10],[12,16]]", "Take the left part before overlap, insert the merged range, then add the remaining intervals after the merge.", { time: "O(n)", space: "O(n)" }, ["lc-57-insert-interval"]),
  makeTopic("topic-arrays-maximum-subarray", "mod-arrays-strings", "Maximum Subarray", "Kadane's algorithm tracks the best subarray ending at each index and keeps the maximum so far.", "[-2,1,-3,4,-1,2,1,-5,4]", "6", "For each element, decide whether to extend the previous subarray or start fresh. The best run sum is the answer.", { time: "O(n)", space: "O(1)" }, ["lc-53-maximum-subarray"]),
  makeTopic("topic-arrays-best-time-to-buy-sell", "mod-arrays-strings", "Best Time to Buy and Sell Stock", "Track minimum purchase cost and the best profit so far as you scan the array.", "[7,1,5,3,6,4]", "5", "Buy at 1 and sell at 6 for a profit of 5. Keep maximum profit and minimum seen price in a single pass.", { time: "O(n)", space: "O(1)" }, ["lc-121-best-stock"]),
  makeTopic("topic-arrays-majority-element", "mod-arrays-strings", "Majority Element", "Boyer-Moore voting algorithm keeps a candidate and a counter; a second pass confirms identity.", "[2,2,1,2,1,2,2]", "2", "If a value matches the current candidate, increment the count; if not, decrement. A majority element survives cancellation.", { time: "O(n)", space: "O(1)" }, ["lc-169-majority-element"]),
  makeTopic("topic-hash-top-k-frequent", "mod-arrays-strings", "Top K Frequent Elements", "Count occurrence frequencies, then sort by count or use a heap for the top-k subset.", "[1,1,1,2,2,3], k=2", "[1,2]", "Create a frequency map, then choose the k most frequent values by sorting or using a heap of size k.", { time: "O(n log n)", space: "O(n)" }, ["lc-347-top-k-frequent"]),
  makeTopic("topic-hash-contains-duplicate", "mod-arrays-strings", "Contains Duplicate", "A set removes duplicates quickly. If the size of the set differs from the array length, duplicates exist.", "[1,2,3,1]", "true", "Insert each value into a hash set. If we already saw it, the answer is true.", { time: "O(n)", space: "O(n)" }, ["lc-217-contains-duplicate"]),
  makeTopic("topic-hash-longest-consecutive", "mod-arrays-strings", "Longest Consecutive Sequence", "Store each number in a set and check if the current value starts a sequence by looking at value-1.", "[100,4,200,1,3,2]", "4", "When a number is the start of a streak, expand left/right until the sequence breaks; keep the longest length found.", { time: "O(n)", space: "O(n)" }, ["lc-128-longest-consecutive"]),

  // Two pointers & sliding window
  makeTopic("topic-two-pointers-3sum", "mod-two-pointers-sliding", "3Sum", "Sort the array and fix one value, then use two pointers on the remaining range to find pairs summing to -target.", "[-1,0,1,2,-1,-4]", "[[-1,-1,2],[-1,0,1]]", "Fix the first value, then move left/right to find complementary pairs while skipping duplicates.", { time: "O(n^2)", space: "O(1)" }, ["lc-15-3sum"]),
  makeTopic("topic-two-pointers-4sum", "mod-two-pointers-sliding", "4Sum", "Extend the 3Sum pattern by fixing two values and applying two-pointer search on the remaining range.", "[1,0,-1,0,-2,2]", "[[ -2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]", "Fix the first two numbers, then use the standard two-pointer sum logic to find valid pairs.", { time: "O(n^3)", space: "O(1)" }, ["lc-18-4sum"]),
  makeTopic("topic-window-longest-substring-k-distinct", "mod-two-pointers-sliding", "Longest Substring with K Distinct", "Maintain a sliding window with a frequency map; shrink when distinct characters exceed K.", "s = \"eceba\", k = 2", "3", "Window \"ece\" or \"eba\" has exactly 2 distinct characters, giving max length 3.", { time: "O(n)", space: "O(k)" }, ["lc-340-longest-k-distinct"]),
  makeTopic("topic-window-minimum-window-substring", "mod-two-pointers-sliding", "Minimum Window Substring", "Expand the window to include all required characters, then contract it while still valid to minimize length.", "s = \"ADOBECODEBANC\", t = \"ABC\"", "\"BANC\"", "Maintain counts of required characters and shrink from the left as long as the window remains valid.", { time: "O(n)", space: "O(|chars|)" }, ["lc-76-minimum-window-substring"]),
  makeTopic("topic-window-max-consecutive-ones", "mod-two-pointers-sliding", "Max Consecutive Ones", "Use a sliding window that counts the number of zeros; if a window exceeds one zero, shrink it.", "[1,1,1,0,1,1,0,1,1,1]", "5", "The valid window with at most one zero is length 5, using a running zero count.", { time: "O(n)", space: "O(1)" }, ["lc-1004-max-consecutive-ones-iii"]),
  makeTopic("topic-two-pointers-binary-search-sum", "mod-two-pointers-sliding", "Two-Sum II Sorted Array", "Use left and right pointers moving toward each other on a sorted array to find the complement.", "numbers = [2,7,11,15], target = 9", "[1,2]", "Check sum of the endpoints. If too small, move left; if too large, move right.", { time: "O(n)", space: "O(1)" }, ["lc-167-two-sum-ii"]),

  // Stack, queue, monotonic patterns
  makeTopic("topic-stack-valid-parentheses", "mod-stack-monotonic", "Valid Parentheses", "Push opening brackets and pop when a matching closing bracket is encountered; the stack must end empty.", "()[]{}", "true", "Every opening bracket gets matched by the opposite closing bracket in reverse order.", { time: "O(n)", space: "O(n)" }, ["lc-20-valid-parentheses"]),
  makeTopic("topic-stack-min-stack", "mod-stack-monotonic", "Min Stack", "Store the current value and the minimum so far in parallel so min retrieval is O(1) in the worst case.", "push(-2), push(0), push(-3), getMin(), pop(), getMin()", "-3, -2", "Each stack entry can store the minimum value up to that point, allowing O(1) min queries.", { time: "O(1)", space: "O(n)" }, ["lc-155-min-stack"]),
  makeTopic("topic-stack-implement-queue", "mod-stack-monotonic", "Implement Queue Using Stacks", "Use one stack for incoming elements and one for outgoing elements to simulate queue semantics.", "push 1, push 2, pop, peek", "1, 2", "If the output stack is empty, transfer elements from the input stack to preserve FIFO order.", { time: "O(1) amortized", space: "O(n)" }, ["lc-232-implement-queue-using-stacks"]),
  makeTopic("topic-queue-rotating-array", "mod-stack-monotonic", "Design Circular Queue", "Maintain a head, tail, and capacity to wrap around indices instead of reallocating memory with every enqueue.", "enqueue 1,2,3 and dequeue 1 then enqueue 4", "[2,3,4]", "Circular arrays preserve O(1) enqueue/dequeue by wrapping indices around modulo size.", { time: "O(1)", space: "O(n)" }, ["lc-622-design-circular-queue"]),
  makeTopic("topic-stack-astroid", "mod-stack-monotonic", "Asteroid Collision", "Process asteroid directions in order, using a stack to resolve collisions while keeping the survivors.", "[10,2,-5]", "[-5]", "If a moving right asteroid hits a moving left asteroid, the larger magnitude survives; equal magnitudes cancel out.", { time: "O(n)", space: "O(n)" }, ["lc-735-asteroid-collision"]),

  // Binary search & intervals
  makeTopic("topic-binary-search-search-insert-position", "mod-binary-search-intervals", "Search Insert Position", "Binary search for the first index where the target should be inserted, using lower-bound logic.", "[1,3,5,6], 5", "2", "If nums[mid] < target, move left forward; otherwise keep searching to the left.", { time: "O(log n)", space: "O(1)" }, ["lc-35-search-insert-position"]),
  makeTopic("topic-binary-search-koko-eating-bananas", "mod-binary-search-intervals", "Koko Eating Bananas", "Search the minimum speed that allows Koko to finish within H hours using the monotonic feasibility check.", "piles = [3,6,7,11,12], H = 8", "4", "If a speed is feasible, all higher speeds are also feasible; this is a classic search-on-answer problem.", { time: "O(n log maxPile)", space: "O(1)" }, ["lc-875-koko-eating"]),
  makeTopic("topic-binary-search-peak-element", "mod-binary-search-intervals", "Find Peak Element", "Compare the middle element with its neighbor to decide whether a peak exists on the left or right.", "[1,3,20,4,1,0]", "2", "If the middle is smaller than its right neighbor, a peak must be to the right. Otherwise search left.", { time: "O(log n)", space: "O(1)" }, ["lc-162-find-peak-element"]),
  makeTopic("topic-arrays-meeting-rooms", "mod-binary-search-intervals", "Meeting Rooms", "Sort intervals by start time and confirm there is no overlap between adjacent meetings.", "[[0,30],[5,10],[15,20]]", "false", "Compare the end time of the current meeting with the next meeting start time.", { time: "O(n log n)", space: "O(1)" }, ["lc-252-meeting-rooms"]),

  // Linked lists
  makeTopic("topic-linked-list-merge-two-lists", "mod-linked-list", "Merge Two Sorted Lists", "Compare heads from both lists and attach the smaller node, continuing until one list ends.", "List1 = [1,2,4], List2 = [1,3,4]", "[1,1,2,3,4,4]", "At each step, take the smaller node and advance the pointer from that list.", { time: "O(n+m)", space: "O(1)" }, ["lc-21-merge-two-sorted-lists"]),
  makeTopic("topic-linked-list-remove-nth-node", "mod-linked-list", "Remove Nth Node From End", "Use a dummy head and fast/slow pointers to remove the node exactly N from the end.", "1 -> 2 -> 3 -> 4 -> 5, n = 2", "1 -> 2 -> 3 -> 5", "Advance the fast pointer by n steps, then move both pointers together until the fast pointer reaches the end.", { time: "O(n)", space: "O(1)" }, ["lc-19-remove-nth-node"]),
  makeTopic("topic-linked-list-palindrome", "mod-linked-list", "Palindrome Linked List", "Find the middle, reverse the second half, and compare both halves to check palindrome property.", "1 -> 2 -> 2 -> 1", "true", "Reversing only the second half allows O(1) extra space and compares in-place.", { time: "O(n)", space: "O(1)" }, ["lc-234-palindrome-list"]),
  makeTopic("topic-linked-list-reorder", "mod-linked-list", "Reorder List", "Split in half, reverse the second half, then merge the two halves alternately.", "1 -> 2 -> 3 -> 4 -> 5", "1 -> 5 -> 2 -> 4 -> 3", "This is a classic fast/slow pointer + reverse + merge pattern.", { time: "O(n)", space: "O(1)" }, ["lc-143-reorder-list"]),

  // Trees & BST
  makeTopic("topic-tree-level-order", "mod-trees-bst", "Binary Tree Level Order Traversal", "Use a queue to process nodes level by level, appending each level to a result list.", "root = [3,9,20,null,null,15,7]", "[[3],[9,20],[15,7]]", "Queue ensures FIFO order so each depth is processed before moving to the next level.", { time: "O(n)", space: "O(w)" }, ["lc-102-level-order"]),
  makeTopic("topic-tree-max-depth", "mod-trees-bst", "Maximum Depth of Binary Tree", "Depth is the number of edges from the root to the deepest node; use recursion or BFS.", "root = [3,9,20,null,null,15,7]", "3", "Depth = 1 + max(depth(left), depth(right)). Compute recursively across the tree.", { time: "O(n)", space: "O(h)" }, ["lc-104-max-depth"]),
  makeTopic("topic-tree-same-tree", "mod-trees-bst", "Same Tree", "Compare node values and subtrees recursively; if both values match and both subtrees match, the trees are the same.", "Tree A = [1,2,3], Tree B = [1,2,3]", "true", "Recursion works naturally because each subtree is itself a tree.", { time: "O(n)", space: "O(h)" }, ["lc-100-same-tree"]),
  makeTopic("topic-tree-subtree-another", "mod-trees-bst", "Subtree of Another Tree", "Serialize or recursively compare the subtree pattern against the candidate tree.", "root = [3,4,5,1,2], subRoot = [4,1,2]", "true", "The core idea is to look for a node in the larger tree whose subtree matches the candidate tree exactly.", { time: "O(m * n)", space: "O(h)" }, ["lc-572-subtree-of-another"]),
  makeTopic("topic-tree-lowest-common-ancestor", "mod-trees-bst", "Lowest Common Ancestor", "Traverse from the root, recursing left or right depending on whether both nodes are in the same subtree.", "root = [3,5,1,6,2,0,8,null,null,7,4], p=5, q=1", "3", "If both nodes are in the left subtree, recurse left; if both in the right, recurse right; else return current node.", { time: "O(h)", space: "O(h)" }, ["lc-236-lowest-common-ancestor"]),
  makeTopic("topic-tree-kth-smallest-bst", "mod-trees-bst", "Kth Smallest in BST", "In-order traversal of a BST yields ascending order, so the kth visited node is the answer.", "root = [3,1,4,null,2], k = 2", "2", "In-order gives [1,2,3,4], so the second smallest is 2.", { time: "O(h + k)", space: "O(h)" }, ["lc-230-kth-smallest"]),

  // Heaps
  makeTopic("topic-heap-k-largest", "mod-heaps", "Kth Largest Element", "Use a min-heap of size k so the root is the current kth largest element.", "[3,2,1,5,6,4], k=2", "5", "Keep only the k largest seen so far; when a larger number arrives, push and pop the smallest of the heap.", { time: "O(n log k)", space: "O(k)" }, ["lc-215-kth-largest"]),
  makeTopic("topic-heap-top-k-frequent", "mod-heaps", "Top K Frequent Words", "Count frequencies then use a min-heap for the k highest-value buckets.", "[\"i\",\"love\",\"leetcode\",\"i\",\"love\",\"coding\"], k=2", "[\"i\",\"love\"]", "Store counts in a hash map, then use a heap to keep the k most frequent items.", { time: "O(n log k)", space: "O(n)" }, ["lc-692-top-k-frequent-words"]),
  makeTopic("topic-heap-median-stream", "mod-heaps", "Median in a Data Stream", "Maintain a small-half max-heap and large-half min-heap so the median is always near the center.", "[5,15,1,3]", "[5,10,1,3]", "The two heaps ensure the data is always partitioned around the current median.", { time: "O(log n)", space: "O(n)" }, ["lc-295-find-median-from-data-stream"]),

  // Graphs
  makeTopic("topic-graph-number-of-islands", "mod-graphs", "Number of Islands", "DFS or BFS over a grid, marking visited cells to count connected components of land.", "[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]", "3", "Each time you start from an unvisited land cell, increment the island count and flood-fill its connected region.", { time: "O(m*n)", space: "O(m*n)" }, ["lc-200-number-of-islands"]),
  makeTopic("topic-graph-course-schedule", "mod-graphs", "Course Schedule", "Build a graph of prerequisites and run topological sort to detect cycles.", "numCourses = 2, prerequisites = [[1,0]]", "true", "If the graph has a cycle, some course cannot be finished; otherwise, topological order exists.", { time: "O(V+E)", space: "O(V+E)" }, ["lc-207-course-schedule"]),
  makeTopic("topic-graph-word-ladder", "mod-graphs", "Word Ladder", "Use BFS from the start word because each move cost is equal and BFS guarantees the shortest sequence length.", "beginWord = \"hit\", endWord = \"cog\", wordList = [\"hot\",\"dot\",\"dog\",\"lot\",\"log\",\"cog\"]", "5", "Each BFS layer explores one transformation step; the first time endWord is visited is the shortest ladder length.", { time: "O(V*L)", space: "O(V)" }, ["lc-127-word-ladder"]),
  makeTopic("topic-graph-graph-valid-tree", "mod-graphs", "Graph Valid Tree", "A connected undirected graph with V-1 edges is a tree. Check both connectivity and edge count.", "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]", "true", "If the graph is connected and has exactly n-1 edges, it is a valid tree.", { time: "O(V+E)", space: "O(V)" }, ["lc-261-graph-valid-tree"]),

  // Dynamic programming
  makeTopic("topic-dp-house-robber", "mod-dynamic-programming", "House Robber", "Choose whether to rob the current house or skip it; the best answer depends on the previous best without the current house.", "[1,2,3,1]", "4", "dp[i] = max(dp[i-1], dp[i-2] + nums[i]) captures the optimal choice at each step.", { time: "O(n)", space: "O(1)" }, ["lc-198-house-robber"]),
  makeTopic("topic-dp-coin-change", "mod-dynamic-programming", "Coin Change", "Use a DP table where dp[amount] is the minimum number of coins needed for that exact amount.", "coins = [1,2,5], amount = 11", "3", "Try each coin and update the best way for each amount from small to large.", { time: "O(n * amount)", space: "O(amount)" }, ["lc-322-coin-change"]),
  makeTopic("topic-dp-longest-increasing-subsequence", "mod-dynamic-programming", "Longest Increasing Subsequence", "dp[i] is the LIS length ending at index i; each element can extend a previous smaller subsequence.", "[10,9,2,5,3,7,101,18]", "4", "For each value, find the best previous tail that is smaller, and update the LIS length.", { time: "O(n^2)", space: "O(n)" }, ["lc-300-lis"]),
  makeTopic("topic-dp-word-break", "mod-dynamic-programming", "Word Break", "dp[i] = true if the string up to index i can be segmented into dictionary words.", "s = \"leetcode\", wordDict = [\"leet\",\"code\"]", "true", "Try every split point. If the prefix matches a word and the remaining suffix is breakable, the string is segmentable.", { time: "O(n * m * L)", space: "O(n)" }, ["lc-139-word-break"]),
  makeTopic("topic-dp-edit-distance", "mod-dynamic-programming", "Edit Distance", "State describes the minimum edits to transform one prefix into another, with transitions for insert, delete, and replace.", "word1 = \"horse\", word2 = \"ros\"", "3", "Each operation changes the cost at one DP cell, and the minimum cost is chosen across all three operations.", { time: "O(m*n)", space: "O(m*n)" }, ["lc-72-edit-distance"]),

  // Greedy & backtracking
  makeTopic("topic-greedy-jump-game", "mod-greedy-backtracking", "Jump Game", "Greedy: keep the furthest reachable index; if it reaches the end, the answer is true.", "[2,3,1,1,4]", "true", "The key is the max distance you can cover so far. If you can always advance to the end, all jumps are valid.", { time: "O(n)", space: "O(1)" }, ["lc-55-jump-game"]),
  makeTopic("topic-greedy-merge-intervals", "mod-greedy-backtracking", "Interval Greedy", "Sort by end time and always pick the earliest finishing interval to maximize the number of compatible tasks.", "[[1,3],[2,4],[3,5],[5,7],[7,9]]", "3", "A classic scheduling problem: select the task with earliest end time whenever possible.", { time: "O(n log n)", space: "O(1)" }, ["lc-435-non-overlapping-intervals"]),
  makeTopic("topic-backtracking-subsets", "mod-greedy-backtracking", "Subsets", "Backtracking explores every decision: include a value or skip it, and recurse to build the set.", "[1,2,3]", "[[], [1], [2], [3], [1,2], [1,3], [2,3], [1,2,3]]", "Every element can either be chosen or not chosen, creating a decision tree of all subsets.", { time: "O(n * 2^n)", space: "O(n)" }, ["lc-78-subsets"]),
  makeTopic("topic-backtracking-permutations", "mod-greedy-backtracking", "Permutations", "Backtracking builds a partial arrangement, then swaps or appends to produce all valid orderings.", "[1,2,3]", "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", "Each recursion depth picks one remaining element; once the current permutation is complete, record it.", { time: "O(n * n!)", space: "O(n)" }, ["lc-46-permutations"]),
  makeTopic("topic-backtracking-combinations", "mod-greedy-backtracking", "Combinations", "Use recursion to choose elements from left to right while ensuring every candidate set is sorted and unique.", "n = 4, k = 2", "[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]", "At each step, choose the next index and continue until the required length is reached.", { time: "O(C(n,k))", space: "O(k)" }, ["lc-77-combinations"]),

  // LLD
  makeTopic("topic-lld-abstraction", "mod-lld-oop-foundations", "Abstraction & Encapsulation", "Hide implementation details behind clear interfaces and public APIs, exposing only what clients need.", "UserService exposes login() and register() while internally using DatabaseClient and TokenService.", "success", "A clean public interface reduces coupling and makes unit tests easier.", { time: "O(1)", space: "O(1)" }, ["lld-encapsulation"]),
  makeTopic("topic-lld-dependency-inversion", "mod-lld-oop-foundations", "Dependency Inversion", "Depend on abstractions such as interfaces, not concrete classes, so the code remains flexible and testable.", "PaymentProcessor depends on PaymentGateway, not on StripeGateway directly.", "success", "This lets the processor work with Stripe, Razorpay, or PayPal without rewriting core logic.", { time: "O(1)", space: "O(1)" }, ["lld-dependency-inversion"]),
  makeTopic("topic-lld-singleton-usage", "mod-lld-core-patterns", "Singleton in Practice", "Use singletons only for globally shared, truly unique resources like a logger or configuration manager.", "Logger.getInstance() used across services.", "logger is shared", "A singleton is easy to misuse; forcing thread safety and lifecycle control matters in production systems.", { time: "O(1)", space: "O(1)" }, ["lld-singleton"]),
  makeTopic("topic-lld-factory-usage", "mod-lld-core-patterns", "Factory Pattern", "Factories create concrete objects without exposing instantiation logic to clients.", "VehicleFactory.create(\"bike\") returns BikeVehicle; create(\"car\") returns CarVehicle.", "BikeVehicle", "This is ideal when object creation has branching logic or new types may be added frequently.", { time: "O(1)", space: "O(1)" }, ["lld-factory"]),
  makeTopic("topic-lld-observer-pattern", "mod-lld-design-exercises", "Observer Pattern", "Subjects notify all observers when state changes; this is typical for notifications, stocks, or UI updates.", "Order subject notifies EmailObserver and SMSObserver.", "notifications sent", "Observers subscribe to events and react independently, enabling loose coupling.", { time: "O(n)", space: "O(n)" }, ["lld-observer"]),
  makeTopic("topic-lld-cache-design", "mod-lld-design-exercises", "Cache Design", "Use a TTL, LRU eviction, and concurrency protection to keep hot data fast and safe.", "user profile requests hit Redis cache and fallback to DB on misses.", "high hit rate", "A good cache design balances stale data risk, memory footprint, and invalidation complexity.", { time: "O(1)", space: "O(n)" }, ["lld-cache"]),
  makeTopic("topic-lld-rate-limiter", "mod-lld-design-exercises", "Rate Limiter", "Token bucket and leaky bucket designs protect backend stability and prevent abuse.", "API client exceeds 100 requests/minute", "429 Too Many Requests", "A rate limiter enforces a policy at the API boundary before expensive downstream work begins.", { time: "O(1)", space: "O(n)" }, ["lld-rate-limiter"]),
  makeTopic("topic-lld-elevator-system", "mod-lld-design-exercises", "Elevator System", "Model floors, requests, direction, and scheduling policies with a dispatcher and controller.", "requests from floor 2, 8, 5", "sequence 2,5,8", "The system should prioritize direction-aware scheduling and efficient movement to reduce waiting time.", { time: "O(n)", space: "O(n)" }, ["lld-elevator"]),

  // HLD
  makeTopic("topic-hld-load-balancer", "mod-hld-foundations", "Load Balancing", "Distribute user traffic across multiple servers to avoid hotspots and improve latency and resilience.", "10k requests/sec distributed across 5 app servers", "balanced traffic", "Load balancers use health checks, session affinity, and algorithms such as round-robin or least connections.", { time: "O(1)", space: "O(1)" }, ["hld-load-balancer"]),
  makeTopic("topic-hld-cdn", "mod-hld-foundations", "CDN and Edge Caching", "Cache static or hot content closer to users to reduce latency and origin traffic.", "banner images and videos served globally", "low p95 latency", "CDN layers improve reliability by reducing load on the origin and accelerating delivery geographically.", { time: "O(1)", space: "O(n)" }, ["hld-cdn"]),
  makeTopic("topic-hld-replication", "mod-hld-foundations", "Replication and Failover", "Distribute writes and copies of data across nodes to improve fault tolerance and read availability.", "primary DB fails over to replica", "service remains available", "Replication introduces freshness trade-offs; failover must preserve data consistency and minimize downtime.", { time: "O(1)", space: "O(n)" }, ["hld-replication"]),
  makeTopic("topic-hld-estimation-read-write", "mod-hld-estimation-tradeoffs", "Read/Write Estimation", "Estimate throughput, storage, and request rates by modeling read/write ratios and per-request payload size.", "400k reads/sec, 10k writes/sec", "storage and capacity plan", "Good estimates dictate whether a database, cache, or queue is the bottleneck and how many nodes you need.", { time: "O(1)", space: "O(1)" }, ["hld-estimation"]),
  makeTopic("topic-hld-caching-strategy", "mod-hld-design-exercises", "Caching Strategy", "Cache invalidation, cache-aside, read-through, and write-through are all design trade-offs depending on access pattern.", "hot user profile data", "high cache hit ratio", "The right strategy depends on freshness requirements, write frequency, and read volume.", { time: "O(1)", space: "O(n)" }, ["hld-cache-strategy"]),
  makeTopic("topic-hld-db-sharding", "mod-hld-design-exercises", "Sharding", "Split data across multiple databases based on key hash or range so no single server becomes the bottleneck.", "user IDs distributed across 8 shards", "balanced load", "Sharding improves throughput but complicates joins, rebalancing, and cross-shard transactions.", { time: "O(1)", space: "O(n)" }, ["hld-sharding"]),
  makeTopic("topic-hld-message-queue", "mod-hld-design-exercises", "Message Queues", "Queue asynchronous tasks to decouple producers from consumers and smooth traffic spikes.", "email sending jobs queued after a user action", "background processing", "Queues improve resilience and throughput but require retry, deduplication, and ordering logic.", { time: "O(1)", space: "O(n)" }, ["hld-queues"]),
  makeTopic("topic-hld-consistency", "mod-hld-design-exercises", "Consistency Trade-offs", "Choose strong consistency for critical writes or eventual consistency for large-scale read-heavy systems when latency matters more.", "bank transfers vs social feed", "strong or eventual depending on use case", "The right answer depends on the business requirement: correctness, freshness, and latency trade-offs are all in tension.", { time: "O(1)", space: "O(1)" }, ["hld-consistency"]),
  makeTopic("topic-hld-idempotent-design", "mod-hld-design-exercises", "Idempotent APIs", "Design operations so retries do not create duplicate effects, which is critical for payments and notifications.", "payment request retried after timeout", "single charge only", "Client and server both handle retries carefully; dedupe keys or operation IDs are often required.", { time: "O(1)", space: "O(1)" }, ["hld-idempotency"]),
  makeTopic("topic-hld-chat-system", "mod-hld-design-exercises", "Chat System Design", "Combine WebSockets, message queues, and persistent storage to allow real-time delivery with history and replay.", "user sends message to friend", "message delivered in seconds", "This design balances real-time latency, message ordering, offline reachability, and storage scalability.", { time: "O(1)", space: "O(n)" }, ["hld-chat"]),

  // Interview foundations and mock rounds that must not be left empty
  makeTopic("topic-foundation-coding-workflow", "mod-foundations", "Interview Workflow & Complexity", "Start with clarification, brute force, optimize, validate, and communicate trade-offs clearly under time pressure.", "Given a problem with 1e5 inputs and a tight 45-minute timer", "clarify -> brute force -> optimize -> validate", "A strong interview answer is not just code; it is the explanation of constraints, trade-offs, and correctness checks.", { time: "O(n)", space: "O(1)" }, ["foundation-workflow"]),
  makeTopic("topic-foundation-pattern-recognition", "mod-foundations", "Pattern Recognition Framework", "Match the underlying problem to the right template: hash map, two pointers, prefix sums, stack, graph traversal, or DP state.", "Large input with repeated values and order-sensitive constraints", "choose the right pattern quickly", "The best candidate is the one who can explain why a pattern is a fit, not just write the final implementation.", { time: "O(n)", space: "O(1)" }, ["foundation-patterns"]),
  makeTopic("topic-foundation-communication", "mod-foundations", "Communication Under Pressure", "State the goal, constraints, and assumptions, then walk through the solution as if you were teaching a colleague.", "System design prompt with missing requirements", "clear requirements + assumptions + trade-offs", "You need to narrate reasoning, make assumptions explicit, and recover gracefully when the interviewer nudges the problem.", { time: "O(1)", space: "O(1)" }, ["foundation-communication"]),

  makeTopic("topic-dsa-mock-array-hash", "mod-dsa-mocks", "Mock Round: Arrays + Hashing", "Solve a timed array-hash problem with a clear intuition, clean implementation, and correctness checks.", "Two-sum / top-k / product-except-self style prompt", "correct answer under time limit", "The interview goal is to keep the explanation structured: understand the problem, derive the invariant, then code and validate.", { time: "O(n)", space: "O(n)" }, ["mock-dsa-array-hash"]),
  makeTopic("topic-dsa-mock-tree-graph-dp", "mod-dsa-mocks", "Mock Round: Trees + Graphs + DP", "Combine recursion, graph traversal, and state transitions in one realistic 45-minute coding round.", "tree + graph + DP hybrid question", "optimized solution with proof", "This round tests whether you can choose the right abstraction quickly and explain the state transitions cleanly.", { time: "O(V+E)", space: "O(V)" }, ["mock-dsa-tree-graph-dp"]),
  makeTopic("topic-dsa-mock-mixed", "mod-dsa-mocks", "Mock Round: Mixed Interview Simulation", "Tackle a full DSA round covering arrays, strings, sorting, DP, and communication quality across multiple prompts.", "mixed interview problem set", "full pass with reasoning + code + edge cases", "FAANG interviews reward calm execution, not just the final answer; mock rounds are where you practice that under pressure.", { time: "O(n log n)", space: "O(n)" }, ["mock-dsa-mixed"]),

  makeTopic("topic-lld-mock-parking-rate-limiter", "mod-lld-mocks", "LLD Mock: Parking Lot + Rate Limiter", "Design a system with entities, APIs, and constraints while defending your class boundaries and trade-offs.", "parking lot + rate limiter hybrid requirement", "clean class design + trade-off discussion", "The key is clarifying requirements, identifying responsibilities, and showing extensibility through interfaces or strategies.", { time: "O(n)", space: "O(n)" }, ["mock-lld-parking-rate-limiter"]),
  makeTopic("topic-lld-mock-library-elevator", "mod-lld-mocks", "LLD Mock: Library + Elevator", "Explain how you would model concurrency, state, and scheduling in a multi-entity design interview problem.", "library or elevator service with operational edge cases", "resilient class design with testable APIs", "A good LLD answer balances domain modeling with clean separation of responsibilities and predictable interactions.", { time: "O(n)", space: "O(n)" }, ["mock-lld-library-elevator"]),
  makeTopic("topic-lld-mock-caching-payment", "mod-lld-mocks", "LLD Mock: Cache + Payment Design", "Draft an extensible design that handles retries, state changes, and boundary conditions in a production-ready way.", "payment provider with cache and retries", "robust design with failure handling", "In LLD interviews, you are judged on both the class design and your ability to reason about future change without overengineering.", { time: "O(1)", space: "O(n)" }, ["mock-lld-cache-payment"]),

  makeTopic("topic-hld-mock-chat", "mod-hld-mocks", "HLD Mock: Chat System", "Clarify requirements, define capacity estimates, and architect a reliable real-time messaging service under a time budget.", "1M daily active users with chat and offline delivery", "high-scale architecture with trade-offs", "The ideal answer is structured: requirements, throughput, storage, consistency, failover, and bottlenecks.", { time: "O(1)", space: "O(n)" }, ["mock-hld-chat"]),
  makeTopic("topic-hld-mock-url-shortener", "mod-hld-mocks", "HLD Mock: URL Shortener", "Design a service with a high read-to-write ratio, hot cache behavior, and persistent storage for durable mappings.", "tens of millions of redirect requests per day", "read-heavy, scalable redirect flow", "This mock tests whether you can estimate traffic, identify bottlenecks, and defend the choice of cache and storage layers.", { time: "O(1)", space: "O(n)" }, ["mock-hld-url-shortener"]),
  makeTopic("topic-hld-mock-newsfeed", "mod-hld-mocks", "HLD Mock: News Feed & Ride Sharing", "Take a broader system design question and work through data model, feed generation, latency, and scaling trade-offs.", "news feed or ride-sharing system at large scale", "phased architecture and scaling strategy", "Strong HLD answers move from requirements to constraints, then to component-level decisions, then to failure handling and trade-offs.", { time: "O(1)", space: "O(n)" }, ["mock-hld-newsfeed"])
];
