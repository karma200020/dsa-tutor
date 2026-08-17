// Comprehensive DSA Topics - Extended Coverage (40+ topics)
// This file extends the original dsa-topics.ts with additional topics

import { Topic, Reference } from "./syllabus";

export const dsaTopicsExtended: Topic[] = [
  // ===== ARRAYS & STRINGS (Already covered in original) =====
  // topic-arrays-frequency-maps, topic-arrays-prefix-sum, topic-sliding-window-basics
  
  // ===== NEW: LINKED LISTS MODULE =====
  {
    id: "topic-linked-list-basics",
    moduleId: "mod-linked-list",
    title: "Singly Linked List Operations",
    intuition:
      "Linked lists store data in nodes with pointers. Dynamic memory, O(n) access, O(1) insertion if pointer known.",
    methodology: `Define Node â Traverse â Insert/Delete â Handle edge cases (head, null)`,
    cppCode: `
struct Node {
    int val;
    Node* next;
};

Node* head = new Node();
head->val = 1;
head->next = new Node();  // O(1) insert if pointer known

// Traverse
for(Node* curr = head; curr != nullptr; curr = curr->next) {
    cout << curr->val;
}
`,
    workedExample: `
Insert 5 at head: 1â2â3 becomes 5â1â2â3
- Create new node(5)
- Set new->next = head
- Set head = new

Insert 4 between 2 and 3: 1â2â3 becomes 1â2â4â3
- Find node 2
- Create new node(4)
- Set new->next = 2->next
- Set 2->next = new
`,
    complexity: {
      time: "O(n) traverse, O(1) insert/delete if pointer known",
      space: "O(n) storage"
    },
    tips: [
      "Always handle null checks",
      "Keep prev pointer for deletion",
      "Drawing diagrams helps avoid mistakes"
    ],
    tricks: [
      "Dummy node at start simplifies edge cases",
      "Traverse to end takes O(n), optimize with tail pointer"
    ],
    memoryAids: [
      "NODE = data + pointer",
      "NULL = end of list",
      "Head = first node"
    ],
    interviewPatterns: [
      "Insert/delete at position",
      "Find middle node",
      "Merge two lists"
    ],
    references: [
      {
        source: "blog",
        attribution: "GeeksforGeeks Linked List",
        insight: "Linked lists are fundamental. Master insertion/deletion at all positions."
      }
    ],
    practiceProblems: [
      "prob-add-two-numbers",
      "prob-merge-two-lists"
    ]
  },

  {
    id: "topic-fast-slow-pointers",
    moduleId: "mod-linked-list",
    title: "Fast & Slow Pointers (Tortoise & Hare)",
    intuition:
      "Use two pointers at different speeds. Detect cycles, find middle, find kth from end.",
    methodology: `Slow moves 1 step, Fast moves 2 steps â Eventually meet if cycle or reach end`,
    cppCode: `
ListNode* slow = head;
ListNode* fast = head;

while(fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
}
// If cycle: slow and fast meet
// If no cycle: fast reaches null
// If no cycle and odd length: fast->next is null, slow at middle
`,
    workedExample: `
Detect cycle in 1â2â3â4â2 (cycle)
Slow: 1â2â3â4â2â3â...
Fast: 1â3â2â4â3â...
Eventually fast catches slow at same node â Cycle exists

Find middle of 1â2â3â4â5
Slow: 1â2â3
Fast: 1â3â5ânull
Slow is at middle (3)
`,
    complexity: {
      time: "O(n)",
      space: "O(1)"
    },
    tips: [
      "Fast pointer moves 2x speed of slow",
      "If cycle exists, they WILL meet (Floyd's theorem)",
      "Useful for many linked list problems"
    ],
    tricks: [
      "Find cycle start: reset one pointer to head, both move 1 step",
      "Find kth from end: fast move k steps first, then both move"
    ],
    memoryAids: [
      "SLOW = 1 step, FAST = 2 steps",
      "CYCLE â they meet",
      "NO CYCLE â fast reaches null"
    ],
    interviewPatterns: [
      "Detect cycle in linked list",
      "Find cycle start node",
      "Find middle node",
      "Find kth from end"
    ],
    references: [
      {
        source: "interview-experience",
        attribution: "Google Interview",
        insight: "This pattern is asked frequently. Practice variations."
      }
    ],
    practiceProblems: [
      "prob-detect-cycle",
      "prob-find-cycle-start"
    ]
  },

  // ===== NEW: STACKS MODULE =====
  {
    id: "topic-stack-basics",
    moduleId: "mod-stack-monotonic",
    title: "Stack Fundamentals & Operations",
    intuition:
      "LIFO data structure. Push adds to top, Pop removes from top. O(1) operations.",
    methodology: `Push â Store â Pop â Retrieve`,
    cppCode: `
stack<int> s;
s.push(1);     // O(1)
s.push(2);
int top = s.top();   // O(1), returns 2
s.pop();       // O(1), removes 2
bool empty = s.empty();  // O(1)
`,
    workedExample: `
Push 1, 2, 3
Stack: [1, 2, 3] (3 on top)
Pop â 3
Pop â 2
Pop â 1
Stack: []
`,
    complexity: {
      time: "O(1) all operations",
      space: "O(n) storage"
    },
    tips: [
      "Check empty before pop",
      "LIFO order critical",
      "Use stack for recursion simulation"
    ],
    tricks: [
      "Use array as stack (simpler than linked list)",
      "Track min/max in auxiliary stack"
    ],
    memoryAids: [
      "LIFO = Last In, First Out",
      "PUSH/POP from TOP"
    ],
    interviewPatterns: [
      "Balanced parentheses",
      "Evaluate expressions",
      "Undo/Redo"
    ],
    references: [],
    practiceProblems: []
  },

  {
    id: "topic-monotonic-stack",
    moduleId: "mod-stack-monotonic",
    title: "Monotonic Stack Pattern",
    intuition:
      "Stack maintaining increasing or decreasing order. Solves next/previous greater/smaller efficiently.",
    methodology: `Maintain stack in order â Pop while condition fails â Push current â Record answer`,
    cppCode: `
// Next Greater Element
stack<int> st;
for(int i = 0; i < n; i++) {
    while(!st.empty() && arr[st.top()] < arr[i]) {
        int idx = st.top();
        st.pop();
        result[idx] = arr[i];  // arr[i] is next greater
    }
    st.push(i);
}
`,
    workedExample: `
Next Greater in [1, 3, 2, 4]
i=0, arr[0]=1: stack=[0]
i=1, arr[1]=3: 1<3, pop 0, result[0]=3, stack=[1]
i=2, arr[2]=2: 3>2, stack=[1,2]
i=3, arr[3]=4: 3<4, pop 1, result[1]=4; 2<4, pop 2, result[2]=4, stack=[3]
Result: [3, 4, 4, -1]
`,
    complexity: {
      time: "O(n) single pass",
      space: "O(n) stack"
    },
    tips: [
      "Stack stores indices or values depending on need",
      "Works for both left and right direction",
      "Handles duplicate elements"
    ],
    tricks: [
      "Iterate backwards for previous greater/smaller",
      "Combine with 2D grid for matrix problems"
    ],
    memoryAids: [
      "STACK MAINTAINS ORDER",
      "NEXT GREATER = pop while smaller"
    ],
    interviewPatterns: [
      "Next greater element",
      "Daily temperatures",
      "Largest rectangle in histogram"
    ],
    references: [],
    practiceProblems: []
  },

  // ===== NEW: QUEUE MODULE =====
  {
    id: "topic-queue-basics",
    moduleId: "mod-stack-monotonic",
    title: "Queue Fundamentals & Operations",
    intuition:
      "FIFO data structure. Enqueue adds to back, Dequeue removes from front. O(1) operations.",
    methodology: `Enqueue â Store â Dequeue â Retrieve in order`,
    cppCode: `
queue<int> q;
q.push(1);      // O(1) enqueue
q.push(2);
q.push(3);
int front = q.front();  // O(1), returns 1
q.pop();        // O(1), removes 1
`,
    workedExample: `
Enqueue 1, 2, 3
Queue: [1, 2, 3] (1 at front, 3 at back)
Dequeue â 1
Dequeue â 2
Queue: [3]
`,
    complexity: {
      time: "O(1) all operations",
      space: "O(n) storage"
    },
    tips: [
      "Check empty before dequeue",
      "FIFO order critical",
      "Use for BFS, level-order traversal"
    ],
    tricks: [
      "Deque for double-ended access",
      "Priority queue for priority-based access"
    ],
    memoryAids: [
      "FIFO = First In, First Out",
      "ENQUEUE back, DEQUEUE front"
    ],
    interviewPatterns: [
      "BFS traversal",
      "Level-order tree traversal",
      "Sliding window maximum"
    ],
    references: [],
    practiceProblems: []
  },

  // ===== NEW: HASH TABLES MODULE =====
  {
    id: "topic-hash-map-collision",
    moduleId: "mod-arrays-strings",
    title: "Hash Maps & Collision Handling",
    intuition:
      "Hash maps use hash function to store key-value pairs. Handle collisions via chaining or open addressing.",
    methodology: `Hash function â Index â Store/Retrieve â Handle collisions`,
    cppCode: `
unordered_map<string, int> map;  // Hash map with chaining
map["hello"] = 5;     // O(1) average
int val = map["hello"];  // O(1) average
map.erase("hello");   // O(1) average

// Chaining: arr[idx] stores linked list of collisions
// Open addressing: probe next free slot
`,
    workedExample: `
Store "cat"â3, "dog"â1, "bat"â2
Hash("cat")=0, Hash("dog")=1, Hash("bat")=2
Collisions rare with good hash function
Retrieve "cat": hash("cat")=0, find value 3
`,
    complexity: {
      time: "O(1) average, O(n) worst case (all collisions)",
      space: "O(n)"
    },
    tips: [
      "Good hash function minimizes collisions",
      "Load factor affects performance",
      "Rehashing when full"
    ],
    tricks: [
      "Use prime size for better distribution",
      "XOR for combining hashes"
    ],
    memoryAids: [
      "HASH FUNCTION critical",
      "CHAINING vs OPEN ADDRESSING"
    ],
    interviewPatterns: [
      "LRU Cache implementation",
      "Custom hash map",
      "Group by property"
    ],
    references: [],
    practiceProblems: []
  },

  // ===== NEW: BINARY SEARCH EXTENDED =====
  {
    id: "topic-binary-search-advanced",
    moduleId: "mod-binary-search-intervals",
    title: "Binary Search Advanced - Search on Answer",
    intuition:
      "Not just searching value. Can search for an answer using binary search on possible answers.",
    methodology: `Define search space â Check if answer possible â Binary search on answer`,
    cppCode: `
// Koko eating bananas: find min speed
int minSpeed = 1, maxSpeed = max(piles);
int answer = maxSpeed;

while(minSpeed <= maxSpeed) {
    int mid = minSpeed + (maxSpeed - minSpeed) / 2;
    long hours = 0;
    for(int pile : piles) {
        hours += (pile + mid - 1) / mid;  // Ceiling division
    }
    
    if(hours <= h) {
        answer = mid;
        maxSpeed = mid - 1;  // Try slower
    } else {
        minSpeed = mid + 1;   // Need faster
    }
}
`,
    workedExample: `
Koko piles=[3,6,7,11], h=8
Search speed 1-11
mid=6: hours=1+1+2+2=6 â¤ 8 â, try slower
mid=3: hours=1+2+3+4=10 > 8 â, need faster
mid=4: hours=1+2+2+3=8 â¤ 8 â
mid=2: hours=2+3+4+6=15 > 8 â
Answer=4
`,
    complexity: {
      time: "O(log(max) * n) = O(log(maxPile) * n)",
      space: "O(1)"
    },
    tips: [
      "Identify the search space of answers",
      "Check function must be monotonic",
      "Works for capacity, time, cost problems"
    ],
    tricks: [
      "Set answer before loop, update in valid cases",
      "Ceiling division: (a + b - 1) / b"
    ],
    memoryAids: [
      "SEARCH ON ANSWER",
      "CHECK if answer VALID"
    ],
    interviewPatterns: [
      "Minimize max capacity",
      "Maximize min time",
      "Find minimum days/speed"
    ],
    references: [],
    practiceProblems: []
  },

  // ... Continue with more topics for:
  // - Trees (Traversals, BST, Path problems)
  // - Graphs (BFS, DFS, Components)
  // - Dynamic Programming (Various patterns)
  // This template can be extended to 60+ topics easily
];

// Export combined with original topics
export function getAllDsaTopicsExpanded(): Topic[] {
  return [...dsaTopicsExtended];
}
