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
    methodology: `Define Node → Traverse → Insert/Delete → Handle edge cases (head, null)`,
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
Insert 5 at head: 1→2→3 becomes 5→1→2→3
- Create new node(5)
- Set new->next = head
- Set head = new

Insert 4 between 2 and 3: 1→2→3 becomes 1→2→4→3
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
      {
        variation: "Reverse a singly linked list iteratively in O(1) space",
        tip: "Recursion is O(n) stack; the follow-up asks for constant space. Carry three pointers and re-point each node backwards, saving next before you overwrite it — losing that pointer is the classic bug. O(n) time and O(1) space.",
        snippet: "ListNode* prev = nullptr, *cur = head;\nwhile (cur) {\n  ListNode* nxt = cur->next;   // save before overwriting\n  cur->next = prev;\n  prev = cur;\n  cur = nxt;\n}\nreturn prev;"
      },
      {
        variation: "Merge Two Sorted Lists by splicing nodes rather than copying values",
        tip: "Building a new list allocates; interviewers usually want the nodes relinked in place. A dummy head removes every 'is this the first node' branch, and at the end you attach whichever list still has nodes in one step. O(n + m) time and O(1) extra space.",
        snippet: "ListNode dummy(0); ListNode* tail = &dummy;\nwhile (a && b) {\n  if (a->val <= b->val) { tail->next = a; a = a->next; }\n  else                  { tail->next = b; b = b->next; }\n  tail = tail->next;\n}\ntail->next = a ? a : b;\nreturn dummy.next;"
      },
      {
        variation: "Add Two Numbers — digits stored in reverse order, with carry",
        tip: "Treat it as schoolbook addition with a carry that must survive past both lists, so the loop condition includes the carry itself. Missing that drops the final digit for cases like 5 + 5. O(max(n, m)) time.",
        snippet: "ListNode dummy(0); ListNode* t = &dummy; int carry = 0;\nwhile (a || b || carry) {\n  int s = carry + (a ? a->val : 0) + (b ? b->val : 0);\n  carry = s / 10;\n  t->next = new ListNode(s % 10); t = t->next;\n  if (a) a = a->next;\n  if (b) b = b->next;\n}\nreturn dummy.next;"
      },
      {
        variation: "Add Two Numbers II — digits stored in forward order, and you may not reverse the input",
        tip: "Carry propagates right-to-left, which the forward order gives you last. Without reversal, push both lists onto stacks (or use recursion) to walk them backwards, then build the result by prepending nodes. O(n + m) time and O(n + m) space.",
        snippet: "std::stack<int> sa, sb;\nfor (auto p = a; p; p = p->next) sa.push(p->val);\nfor (auto p = b; p; p = p->next) sb.push(p->val);\nListNode* head = nullptr; int carry = 0;\nwhile (!sa.empty() || !sb.empty() || carry) {\n  int s = carry;\n  if (!sa.empty()) { s += sa.top(); sa.pop(); }\n  if (!sb.empty()) { s += sb.top(); sb.pop(); }\n  carry = s / 10;\n  head = new ListNode(s % 10, head);   // prepend\n}\nreturn head;"
      },
      {
        variation: "Delete a node given only a pointer to it, with no access to the head",
        tip: "You cannot reach the predecessor, so the usual unlink is impossible. Copy the successor's value into the current node and unlink the successor instead — you delete a node's *identity*, not its position. This is O(1) but fails for the tail, which is why the problem guarantees it isn't the last node.",
        snippet: "void deleteNode(ListNode* node) {\n  ListNode* nxt = node->next;\n  node->val = nxt->val;\n  node->next = nxt->next;\n  delete nxt;\n}"
      },
      {
        variation: "Reverse only the sublist between positions m and n, in one pass",
        tip: "You must remember the node before position m so you can reattach, and the node at m becomes the tail of the reversed section. The head-insertion technique moves each subsequent node to the front of the segment without a second traversal. O(n) time, O(1) space; a dummy node handles m = 1.",
        snippet: "ListNode dummy(0, head); ListNode* prev = &dummy;\nfor (int i = 1; i < m; ++i) prev = prev->next;\nListNode* cur = prev->next;\nfor (int i = m; i < n; ++i) {\n  ListNode* mv = cur->next;\n  cur->next = mv->next;\n  mv->next = prev->next;\n  prev->next = mv;\n}\nreturn dummy.next;"
      }
    ]
  },

  {
    id: "topic-fast-slow-pointers",
    moduleId: "mod-linked-list",
    title: "Fast & Slow Pointers (Tortoise & Hare)",
    intuition:
      "Use two pointers at different speeds. Detect cycles, find middle, find kth from end.",
    methodology: `Slow moves 1 step, Fast moves 2 steps → Eventually meet if cycle or reach end`,
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
Detect cycle in 1→2→3→4→2 (cycle)
Slow: 1→2→3→4→2→3→...
Fast: 1→3→2→4→3→...
Eventually fast catches slow at same node → Cycle exists

Find middle of 1→2→3→4→5
Slow: 1→2→3
Fast: 1→3→5→null
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
      "CYCLE → they meet",
      "NO CYCLE → fast reaches null"
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
      {
        variation: "Detect whether a cycle exists at all",
        tip: "A visited set is O(n) space; Floyd's needs none. Advance one pointer by one and the other by two — if a cycle exists the fast pointer laps the slow one and they collide. O(n) time and O(1) space; the loop must guard both fast and fast->next.",
        snippet: "ListNode *s = head, *f = head;\nwhile (f && f->next) {\n  s = s->next;\n  f = f->next->next;\n  if (s == f) return true;\n}\nreturn false;"
      },
      {
        variation: "Return the node where the cycle begins, not just a boolean",
        tip: "Detection stops at the meeting point, which is not the entry. Phase two resets one pointer to the head and advances both one step at a time; the distance from head to entry equals the distance from meeting point to entry, so they meet exactly at the entry. Still O(n) time, O(1) space.",
        snippet: "ListNode *s = head, *f = head;\nwhile (f && f->next) {\n  s = s->next; f = f->next->next;\n  if (s == f) {\n    s = head;\n    while (s != f) { s = s->next; f = f->next; }\n    return s;\n  }\n}\nreturn nullptr;"
      },
      {
        variation: "Report the length of the cycle",
        tip: "Once the pointers meet you are guaranteed to be standing on a cycle node, so hold one still and walk the other until it returns. The number of steps is the cycle length. This adds O(cycle) time and no extra space.",
        snippet: "// s == f here, both on the cycle\nint len = 1;\nfor (ListNode* p = f->next; p != f; p = p->next) ++len;\nreturn len;"
      },
      {
        variation: "Find the Duplicate Number in an array of n+1 values in 1..n, read-only and O(1) space",
        tip: "There is no linked list, but i -> a[i] is a functional graph, and a repeated value forces a cycle whose entry is the duplicate. Run the same two-phase Floyd's algorithm over indices. O(n) time and O(1) space, without sorting or mutating the input.",
        snippet: "int slow = a[0], fast = a[a[0]];\nwhile (slow != fast) { slow = a[slow]; fast = a[a[fast]]; }\nslow = 0;\nwhile (slow != fast) { slow = a[slow]; fast = a[fast]; }\nreturn slow;"
      },
      {
        variation: "Find the intersection node of two lists that may have different lengths",
        tip: "Fast/slow does not apply because there is no cycle. Instead let each pointer traverse its own list then switch to the other: both then cover exactly len(a) + len(b) steps and meet at the junction, or at nullptr if there is none. O(n + m) time, O(1) space.",
        snippet: "ListNode *p = a, *q = b;\nwhile (p != q) {\n  p = p ? p->next : b;\n  q = q ? q->next : a;\n}\nreturn p;   // nullptr if no intersection"
      },
      {
        variation: "Reorder List — interleave the first half with the reversed second half",
        tip: "This composes three primitives you already have: find the middle with fast/slow, reverse the second half in place, then splice the halves alternately. Cut the list at the middle before reversing or you create a cycle. O(n) time and O(1) space.",
        snippet: "ListNode *s = head, *f = head;\nwhile (f->next && f->next->next) { s = s->next; f = f->next->next; }\nListNode* second = s->next; s->next = nullptr;   // cut\nListNode* prev = nullptr;\nwhile (second) { ListNode* n = second->next; second->next = prev; prev = second; second = n; }\nfor (ListNode *p = head, *q = prev; q; ) {\n  ListNode *pn = p->next, *qn = q->next;\n  p->next = q; if (pn) q->next = pn;\n  p = pn; q = qn;\n}"
      }
    ]
  },

  // ===== NEW: STACKS MODULE =====
  {
    id: "topic-stack-basics",
    moduleId: "mod-stack-monotonic",
    title: "Stack Fundamentals & Operations",
    intuition:
      "LIFO data structure. Push adds to top, Pop removes from top. O(1) operations.",
    methodology: `Push → Store → Pop → Retrieve`,
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
Pop → 3
Pop → 2
Pop → 1
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
    practiceProblems: [
      {
        variation: "Valid Parentheses with three bracket types instead of one",
        tip: "A single counter works for one bracket type but cannot enforce correct nesting across types. Push openers and, on a closer, check the top matches the expected partner. Do not forget to reject a non-empty stack at the end. O(n) time and O(n) space.",
        snippet: "std::stack<char> st;\nfor (char c : s) {\n  if (c=='('||c=='['||c=='{') st.push(c);\n  else {\n    if (st.empty()) return false;\n    char t = st.top(); st.pop();\n    if ((c==')'&&t!='(')||(c==']'&&t!='[')||(c=='}'&&t!='{')) return false;\n  }\n}\nreturn st.empty();"
      },
      {
        variation: "Min Stack — support getMin() in O(1) alongside push/pop",
        tip: "Scanning for the minimum is O(n) per call, so the minimum must be part of the stack's state. Push the running minimum in parallel with each value, so every pop restores the previous minimum automatically. All four operations become O(1) at the cost of O(n) extra space.",
        snippet: "std::stack<std::pair<int,int>> st;   // {value, min so far}\nvoid push(int x) {\n  int m = st.empty() ? x : std::min(x, st.top().second);\n  st.push({x, m});\n}\nvoid pop() { st.pop(); }\nint top() const { return st.top().first; }\nint getMin() const { return st.top().second; }"
      },
      {
        variation: "Implement a queue using only stacks, with amortised O(1) dequeue",
        tip: "Moving all elements on every dequeue is O(n) each time. Keep an input stack and an output stack, and only transfer when the output stack runs dry: each element moves at most twice, giving amortised O(1). The bug to avoid is transferring while the output stack still has items, which reorders them.",
        snippet: "std::stack<int> in, out;\nvoid push(int x) { in.push(x); }\nint pop() {\n  if (out.empty())\n    while (!in.empty()) { out.push(in.top()); in.pop(); }\n  int v = out.top(); out.pop();\n  return v;\n}"
      },
      {
        variation: "Evaluate Reverse Polish Notation instead of matching brackets",
        tip: "The stack now holds operands rather than pending openers. On an operator, pop exactly two values and push the result — and mind the order, since a is the deeper element for subtraction and division. O(n) time and O(n) space.",
        snippet: "std::stack<long long> st;\nfor (auto& t : tokens) {\n  if (t==\"+\"||t==\"-\"||t==\"*\"||t==\"/\") {\n    long long b = st.top(); st.pop();\n    long long a = st.top(); st.pop();\n    st.push(t==\"+\"?a+b : t==\"-\"?a-b : t==\"*\"?a*b : a/b);\n  } else st.push(std::stoll(t));\n}\nreturn st.top();"
      },
      {
        variation: "Longest Valid Parentheses substring, not a validity check",
        tip: "A boolean stack of characters is not enough because you need lengths. Push indices instead and seed the stack with -1 as a base, so after each pop the current length is i minus the new top. If the stack empties, push i as the new base. O(n) time and O(n) space.",
        snippet: "std::stack<int> st; st.push(-1);\nint best = 0;\nfor (int i = 0; i < (int)s.size(); ++i) {\n  if (s[i]=='(') st.push(i);\n  else {\n    st.pop();\n    if (st.empty()) st.push(i);\n    else best = std::max(best, i - st.top());\n  }\n}\nreturn best;"
      },
      {
        variation: "Decode String — nested encodings like 3[a2[c]] require two stacks",
        tip: "Nesting means you must remember both the partially built string and the repeat count at each level, so use one stack for counts and one for prefixes. On '[' push and reset the accumulators; on ']' pop and expand. O(total output length) time.",
        snippet: "std::stack<int> nums; std::stack<std::string> strs;\nstd::string cur; int k = 0;\nfor (char c : s) {\n  if (isdigit((unsigned char)c)) k = k * 10 + (c - '0');\n  else if (c == '[') { nums.push(k); strs.push(cur); k = 0; cur.clear(); }\n  else if (c == ']') {\n    std::string rep = cur; cur = strs.top(); strs.pop();\n    for (int i = nums.top(); i > 0; --i) cur += rep;\n    nums.pop();\n  } else cur += c;\n}\nreturn cur;"
      }
    ]
  },

  {
    id: "topic-monotonic-stack",
    moduleId: "mod-stack-monotonic",
    title: "Monotonic Stack Pattern",
    intuition:
      "Stack maintaining increasing or decreasing order. Solves next/previous greater/smaller efficiently.",
    methodology: `Maintain stack in order → Pop while condition fails → Push current → Record answer`,
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
    practiceProblems: [
      {
        variation: "Next Greater Element I — the queries are a subset, given in a separate array",
        tip: "You cannot index answers by position because the query array has its own order. Compute next-greater for the full array into a value-keyed map, then look up each query in O(1). This works only because the values are stated to be unique. O(n + m) overall.",
        snippet: "std::unordered_map<int,int> nge;\nstd::stack<int> st;                 // decreasing values\nfor (int x : nums2) {\n  while (!st.empty() && x > st.top()) { nge[st.top()] = x; st.pop(); }\n  st.push(x);\n}\nfor (int q : nums1) out.push_back(nge.count(q) ? nge[q] : -1);"
      },
      {
        variation: "Daily Temperatures — return the distance to the next warmer day",
        tip: "Push indices rather than values so a pop can compute i minus the popped index. Anything still on the stack at the end never found a warmer day and keeps its default 0. Each index is pushed and popped once, so O(n) time and O(n) space.",
        snippet: "std::vector<int> res(n, 0);\nstd::stack<int> st;\nfor (int i = 0; i < n; ++i) {\n  while (!st.empty() && t[i] > t[st.top()]) { res[st.top()] = i - st.top(); st.pop(); }\n  st.push(i);\n}\nreturn res;"
      },
      {
        variation: "Next Greater Element II — the array wraps around",
        tip: "An element's answer can now lie before it, so one left-to-right pass is not enough. Loop 2n times indexing with i % n, and push only during the first lap so no index enters the stack twice. Still O(n) time and O(n) space.",
        snippet: "std::vector<int> res(n, -1);\nstd::stack<int> st;\nfor (int i = 0; i < 2 * n; ++i) {\n  int j = i % n;\n  while (!st.empty() && a[j] > a[st.top()]) { res[st.top()] = a[j]; st.pop(); }\n  if (i < n) st.push(j);\n}\nreturn res;"
      },
      {
        variation: "Largest Rectangle in Histogram — you need both left and right boundaries",
        tip: "A popped bar's rectangle spans from just after the element beneath it on the stack up to just before the index that evicted it, so read both at pop time. Append a sentinel height of 0 so nothing is stranded on the stack. O(n) time and O(n) space.",
        snippet: "std::stack<int> st; long long best = 0;\nfor (int i = 0; i <= n; ++i) {\n  int cur = (i == n) ? 0 : h[i];\n  while (!st.empty() && cur < h[st.top()]) {\n    int ht = h[st.top()]; st.pop();\n    int left = st.empty() ? -1 : st.top();\n    best = std::max(best, (long long)ht * (i - left - 1));\n  }\n  st.push(i);\n}\nreturn best;"
      },
      {
        variation: "Maximal Rectangle in a binary matrix",
        tip: "Reduce rather than invent: treat each row as the base of a histogram whose bar heights are the runs of consecutive 1s above it, then reuse the histogram routine per row. Building the heights incrementally is O(1) per cell, so the whole thing is O(mn).",
        snippet: "std::vector<int> h(n, 0); long long best = 0;\nfor (int i = 0; i < m; ++i) {\n  for (int j = 0; j < n; ++j)\n    h[j] = (mat[i][j] == '1') ? h[j] + 1 : 0;\n  best = std::max(best, largestRectangleArea(h));  // the histogram routine\n}\nreturn best;"
      },
      {
        variation: "Sliding Window Maximum — next-greater logic bounded by a window of size k",
        tip: "A stack has no way to expire old entries, so switch to a monotonic deque: pop smaller values from the back to keep it decreasing, and pop expired indices from the front. The front is then always the window maximum, giving O(n) time and O(k) space instead of a heap's O(n log k).",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      }
    ]
  },

  // ===== NEW: QUEUE MODULE =====
  {
    id: "topic-queue-basics",
    moduleId: "mod-stack-monotonic",
    title: "Queue Fundamentals & Operations",
    intuition:
      "FIFO data structure. Enqueue adds to back, Dequeue removes from front. O(1) operations.",
    methodology: `Enqueue → Store → Dequeue → Retrieve in order`,
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
Dequeue → 1
Dequeue → 2
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
    practiceProblems: [
      {
        variation: "Design Circular Queue with a fixed capacity array",
        tip: "A plain array queue leaks space as the head advances. Wrap the indices modulo capacity and keep an explicit size counter, because head == tail alone cannot distinguish full from empty. All operations become O(1) with O(k) space.",
        snippet: "std::vector<int> buf; int head = 0, count = 0, cap;\nbool enQueue(int v) {\n  if (count == cap) return false;\n  buf[(head + count) % cap] = v;\n  ++count;\n  return true;\n}\nbool deQueue() {\n  if (!count) return false;\n  head = (head + 1) % cap; --count;\n  return true;\n}"
      },
      {
        variation: "Implement a queue using two stacks with amortised O(1) dequeue",
        tip: "Transferring on every dequeue costs O(n). Use an input stack and an output stack and only refill the output when it is empty: each element moves at most twice, giving amortised O(1). Refilling early would reorder elements, which is the usual bug.",
        snippet: "std::stack<int> in, out;\nvoid push(int x) { in.push(x); }\nint pop() {\n  if (out.empty())\n    while (!in.empty()) { out.push(in.top()); in.pop(); }\n  int v = out.top(); out.pop();\n  return v;\n}"
      },
      {
        variation: "Implement a stack using queues instead",
        tip: "The reversal has to happen somewhere: make push expensive by rotating the queue so the newest element sits at the front. Push becomes O(n) while pop and top stay O(1), which is the right trade when reads dominate. State which operation you chose to make costly.",
        snippet: "std::queue<int> q;\nvoid push(int x) {\n  q.push(x);\n  for (size_t i = 1; i < q.size(); ++i) { q.push(q.front()); q.pop(); }\n}\nint pop() { int v = q.front(); q.pop(); return v; }"
      },
      {
        variation: "Moving Average from Data Stream — averages over the last k values",
        tip: "Recomputing the average is O(k) per call. Keep a running sum and subtract the element leaving the window as you push the new one, so each call is O(1) with O(k) space. Guard the case where fewer than k values have arrived yet.",
        snippet: "std::queue<int> q; double sum = 0; int k;\ndouble next(int x) {\n  q.push(x); sum += x;\n  if ((int)q.size() > k) { sum -= q.front(); q.pop(); }\n  return sum / q.size();\n}"
      },
      {
        variation: "Sliding Window Maximum — a queue that can also report its maximum",
        tip: "A FIFO queue cannot answer max in O(1), and a heap cannot expire the element that left the window. A monotonic deque solves both: keep indices with decreasing values, drop expired ones from the front and dominated ones from the back. O(n) total, O(k) space.",
        snippet: "std::deque<int> dq;\nfor (int i = 0; i < n; ++i) {\n  while (!dq.empty() && dq.front() <= i - k) dq.pop_front();\n  while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();\n  dq.push_back(i);\n  if (i >= k - 1) out.push_back(a[dq.front()]);\n}"
      },
      {
        variation: "Task Scheduler / rate limiting — the queue is ordered by priority, not arrival",
        tip: "FIFO is the wrong discipline once elements carry urgency, so swap the queue for a binary heap: push and pop become O(log n) instead of O(1). If ties must break by arrival order, include a monotonically increasing sequence number in the key, otherwise the ordering is non-deterministic.",
        snippet: "struct Task { int prio; long long seq; int id; };\nauto cmp = [](const Task& a, const Task& b) {\n  return a.prio == b.prio ? a.seq > b.seq : a.prio < b.prio;  // max-heap by prio\n};\nstd::priority_queue<Task, std::vector<Task>, decltype(cmp)> pq(cmp);\nlong long seq = 0;\nvoid submit(int id, int prio) { pq.push({prio, seq++, id}); }"
      }
    ]
  },

  // ===== NEW: HASH TABLES MODULE =====
  {
    id: "topic-hash-map-collision",
    moduleId: "mod-arrays-strings",
    title: "Hash Maps & Collision Handling",
    intuition:
      "Hash maps use hash function to store key-value pairs. Handle collisions via chaining or open addressing.",
    methodology: `Hash function → Index → Store/Retrieve → Handle collisions`,
    cppCode: `
unordered_map<string, int> map;  // Hash map with chaining
map["hello"] = 5;     // O(1) average
int val = map["hello"];  // O(1) average
map.erase("hello");   // O(1) average

// Chaining: arr[idx] stores linked list of collisions
// Open addressing: probe next free slot
`,
    workedExample: `
Store "cat"→3, "dog"→1, "bat"→2
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
    practiceProblems: [
      {
        variation: "Design a hash map with separate chaining and no built-in containers",
        tip: "The whole problem is collision handling: two keys can land in the same bucket, so each bucket is a list you must search linearly. Average lookup is O(1) but degrades to O(n) when every key collides, which is exactly what interviewers probe. Keep the load factor bounded by resizing.",
        snippet: "std::vector<std::list<std::pair<int,int>>> buckets{1024};\nint hash(int k) const { return (k % 1024 + 1024) % 1024; }\nvoid put(int k, int v) {\n  auto& b = buckets[hash(k)];\n  for (auto& kv : b) if (kv.first == k) { kv.second = v; return; }\n  b.emplace_back(k, v);\n}\nint get(int k) {\n  for (auto& kv : buckets[hash(k)]) if (kv.first == k) return kv.second;\n  return -1;\n}"
      },
      {
        variation: "Use open addressing with linear probing instead of chaining",
        tip: "Without per-bucket lists, deletion becomes the hard part: clearing a slot breaks the probe chain for later keys. Use a tombstone marker that probes skip but insertion may reuse. Cache locality is better than chaining, but clustering makes the load factor far more sensitive.",
        snippet: "enum State { EMPTY, FILLED, TOMB };\nstd::vector<State> st; std::vector<int> key, val;\nint find(int k) const {\n  int i = hash(k);\n  while (st[i] != EMPTY) {\n    if (st[i] == FILLED && key[i] == k) return i;\n    i = (i + 1) % st.size();      // linear probe past tombstones\n  }\n  return -1;\n}"
      },
      {
        variation: "Group Anagrams — the key is a multiset, not a scalar",
        tip: "You need a canonical form so that equivalent inputs hash identically. Sorting each word is O(L log L); a 26-slot count signature is O(L) and avoids the sort. Building the key as a delimited string prevents 1,11 and 11,1 from colliding.",
        snippet: "std::unordered_map<std::string, std::vector<std::string>> g;\nfor (auto& w : words) {\n  std::array<int,26> c{};\n  for (char ch : w) ++c[ch - 'a'];\n  std::string key;\n  for (int x : c) { key += '#'; key += std::to_string(x); }\n  g[key].push_back(w);\n}"
      },
      {
        variation: "Hash a custom struct as a key in an unordered_map",
        tip: "The default hasher does not exist for user types, so you must supply one and an equality operator. Never XOR field hashes directly — that makes {a,b} and {b,a} collide; use a mixing constant instead. Equality must be consistent with the hash or lookups silently fail.",
        snippet: "struct Point { int x, y; bool operator==(const Point& o) const { return x==o.x && y==o.y; } };\nstruct PointHash {\n  size_t operator()(const Point& p) const noexcept {\n    size_t h = std::hash<int>{}(p.x);\n    h ^= std::hash<int>{}(p.y) + 0x9e3779b97f4a7c15ULL + (h << 6) + (h >> 2);\n    return h;\n  }\n};\nstd::unordered_map<Point,int,PointHash> m;"
      },
      {
        variation: "LRU Cache — O(1) get and put with eviction",
        tip: "A hash map alone cannot answer 'which key was least recently used'. Pair it with a doubly linked list holding the recency order, and store list iterators as map values so a touch is an O(1) splice. Every operation stays O(1) with O(capacity) space.",
        snippet: "std::list<std::pair<int,int>> lru;                       // front = most recent\nstd::unordered_map<int, std::list<std::pair<int,int>>::iterator> pos;\nint get(int k) {\n  auto it = pos.find(k);\n  if (it == pos.end()) return -1;\n  lru.splice(lru.begin(), lru, it->second);              // O(1) touch\n  return it->second->second;\n}"
      },
      {
        variation: "The keys are adversarial and deliberately collide (hash flooding)",
        tip: "A deterministic hash lets an attacker force every key into one bucket, turning O(1) lookups into O(n) and the whole table into O(n^2). Defend by seeding the hash with a per-process random value, or switch the bucket from a list to a balanced tree so the worst case is O(log n).",
        snippet: "struct SeededHash {\n  size_t seed = std::random_device{}();                  // per-instance seed\n  size_t operator()(int k) const noexcept {\n    size_t h = static_cast<size_t>(k) ^ seed;\n    h *= 0x9e3779b97f4a7c15ULL;\n    return h ^ (h >> 31);\n  }\n};\nstd::unordered_map<int,int,SeededHash> m;"
      }
    ]
  },

  // ===== NEW: BINARY SEARCH EXTENDED =====
  {
    id: "topic-binary-search-advanced",
    moduleId: "mod-binary-search-intervals",
    title: "Binary Search Advanced - Search on Answer",
    intuition:
      "Not just searching value. Can search for an answer using binary search on possible answers.",
    methodology: `Define search space → Check if answer possible → Binary search on answer`,
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
mid=6: hours=1+1+2+2=6 ≤ 8 ✓, try slower
mid=3: hours=1+2+3+4=10 > 8 ✗, need faster
mid=4: hours=1+2+2+3=8 ≤ 8 ✓
mid=2: hours=2+3+4+6=15 > 8 ✗
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
    practiceProblems: [
      {
        variation: "Find the first and last position of a target in a sorted array with duplicates",
        tip: "Plain binary search returns an arbitrary matching index when duplicates exist. Run two biased searches: one that keeps moving left on a match to find the lower bound, one that moves right for the upper. Two O(log n) passes instead of a linear scan outward, which would be O(n) on an all-equal array.",
        snippet: "auto bound = [&](bool lower) {\n  int lo = 0, hi = n - 1, res = -1;\n  while (lo <= hi) {\n    int mid = lo + (hi - lo) / 2;\n    if (a[mid] == target) { res = mid; if (lower) hi = mid - 1; else lo = mid + 1; }\n    else if (a[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return res;\n};\nreturn {bound(true), bound(false)};"
      },
      {
        variation: "Search in a rotated sorted array",
        tip: "The array is no longer globally sorted, so comparing a[mid] to the target alone is meaningless. At each step one half is guaranteed sorted — identify it by comparing a[lo] to a[mid], then test whether the target lies inside that half's range. Still O(log n).",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo <= hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] == target) return mid;\n  if (a[lo] <= a[mid]) {                       // left half sorted\n    if (a[lo] <= target && target < a[mid]) hi = mid - 1; else lo = mid + 1;\n  } else {                                      // right half sorted\n    if (a[mid] < target && target <= a[hi]) lo = mid + 1; else hi = mid - 1;\n  }\n}\nreturn -1;"
      },
      {
        variation: "Koko Eating Bananas — binary search on the answer, not on the array",
        tip: "There is nothing sorted to search; what is monotone is the predicate 'can she finish at speed s', which is false then true. Binary search that boolean over the answer range [1, max(pile)]. Cost is O(n log(max)), and the ceiling division must be integer, not floating point.",
        snippet: "auto ok = [&](long long speed) {\n  long long hours = 0;\n  for (int p : piles) hours += (p + speed - 1) / speed;   // ceil\n  return hours <= H;\n};\nlong long lo = 1, hi = *std::max_element(piles.begin(), piles.end());\nwhile (lo < hi) { long long mid = lo + (hi - lo) / 2; if (ok(mid)) hi = mid; else lo = mid + 1; }\nreturn (int)lo;"
      },
      {
        variation: "Split Array Largest Sum / capacity to ship packages within D days",
        tip: "Same answer-space search, but the lower bound changes: the capacity can never be below the largest single item, or that item never ships. Search [max(a), sum(a)] with a greedy feasibility check that counts groups. O(n log(sum)) time.",
        snippet: "auto groupsNeeded = [&](long long cap) {\n  int g = 1; long long cur = 0;\n  for (int x : a) { if (cur + x > cap) { ++g; cur = 0; } cur += x; }\n  return g;\n};\nlong long lo = *std::max_element(a.begin(), a.end());\nlong long hi = std::accumulate(a.begin(), a.end(), 0LL);\nwhile (lo < hi) { long long mid = lo + (hi - lo) / 2; if (groupsNeeded(mid) <= D) hi = mid; else lo = mid + 1; }\nreturn lo;"
      },
      {
        variation: "Find Peak Element in an unsorted array in O(log n)",
        tip: "Surprisingly, binary search applies without sortedness: if a[mid] < a[mid+1] a peak must exist to the right, because the sequence rises and the boundary is treated as negative infinity. Never compare against a[mid-1] and a[mid+1] both, or you break the invariant at the edges.",
        snippet: "int lo = 0, hi = n - 1;\nwhile (lo < hi) {\n  int mid = lo + (hi - lo) / 2;\n  if (a[mid] < a[mid + 1]) lo = mid + 1;   // ascending: peak on the right\n  else hi = mid;\n}\nreturn lo;"
      },
      {
        variation: "Binary search on a real-valued answer (e.g. minimise a maximum distance)",
        tip: "Integer bisection never terminates on reals, so replace the lo <= hi condition with a fixed iteration count — about 100 halvings exhausts double precision — or an epsilon threshold. Never test equality on doubles. The feasibility predicate is unchanged.",
        snippet: "double lo = 0, hi = 1e9;\nfor (int iter = 0; iter < 100; ++iter) {   // ~1e-30 relative precision\n  double mid = lo + (hi - lo) / 2;\n  if (feasible(mid)) hi = mid; else lo = mid;\n}\nreturn hi;"
      }
    ]
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
