# DSA Tutor - Research-Based Comprehensive Content Guide
# Based on: TakeUForward, System Design Primer, Blind, LeetCode, AlgoExpert, Interview Experiences

## COMPANY-SPECIFIC PATTERNS (FAANG + Others)

### Google Interview Questions (Most Common)
**DSA:**
- Arrays: Two Sum, 3Sum, Merge Sorted Arrays, Subarray Sum
- Strings: Longest Substring, Palindrome, Group Anagrams, Word Ladder
- Trees: LCA, BST, Path Sum, Serialize/Deserialize
- Graphs: Number of Islands, Topological Sort, Word Ladder II
- DP: Coin Change, House Robber, Longest Palindromic Substring
- Google favors: Graph problems, DP, String manipulation

**LLD:**
- Parking Lot, Elevator, Cache (LRU)
- Google asks design problems with scale considerations

**HLD:**
- Google Maps (routing, caching), YouTube (video streaming), Google Drive (storage)
- Focus: Distributed systems, caching strategies, consistency

### Amazon Interview Questions
**DSA:**
- Arrays: Two Sum, Merge Intervals, Product of Array Except Self
- Stacks/Queues: Largest Rectangle, Sliding Window Maximum
- Trees: Binary Tree Level Order, Diameter, Vertical Order
- Graphs: Number of Islands, Course Schedule, Alien Dictionary
- DP: Best Time to Buy Stock variants, Longest Increasing Subsequence
- Amazon favors: Array problems, Trees, Trees + DP, Sliding Window

**LLD:**
- Parking Lot (most asked), Vending Machine, Rate Limiter, Recommendation Engine

**HLD:**
- Amazon Web Services focus: S3, EC2, Load Balancing, Microservices
- E-commerce (Shopping Cart), Recommendation System, Warehouse Management

### Meta/Facebook Interview Questions
**DSA:**
- Arrays: Intersection, Majority Element, Trapping Rain Water
- Trees: Lowest Common Ancestor, Flatten Binary Tree, Vertical Order
- Graphs: Accounts Merge (Union-Find), Network Delay Time
- Strings: Longest Substring, Minimum Window Substring, Valid Parentheses
- DP: Edit Distance, Regular Expression Matching
- Meta favors: Graph algorithms, Union-Find, String problems

**LLD:**
- Facebook Messenger (Chat System), Feed System, Comment System

**HLD:**
- Social Media Feed (News Feed), Chat System, Photo Sharing, Notification System

### Microsoft Interview Questions
**DSA:**
- Arrays: Median of Two Sorted Arrays, Majority Element II, Container with Most Water
- Recursion/Backtracking: N-Queens, Palindrome Partitioning, Letter Combinations
- Trees: Binary Tree Cameras, Invert Tree, Vertical Order
- Graphs: Number of Provinces, Critical Connections
- DP: Longest Palindromic Subsequence, Interleaving String
- Microsoft favors: Trees, Recursion, Medium-Hard complexity

**LLD:**
- Elevator System, Tic Tac Toe, Movie Ticket Booking System

**HLD:**
- Azure focus: Cloud Services, CDN, Auto-scaling

### Apple Interview Questions
**DSA:**
- Arrays: Remove Duplicates, Best Time to Buy Stock (all variants)
- Linked Lists: Reverse List, Merge Lists, Sort List
- Trees: Kth Smallest, Path Sum variants, Invert Tree
- Graphs: Network Delay Time, Course Schedule
- DP: Jump Game variants, Coin Change
- Apple favors: Array problems, Linked Lists, Trees, Medium difficulty

**LLD:**
- Parking Lot, Cache implementations

**HLD:**
- Apple Siri, iCloud, iTunes Store

### Netflix Interview Questions
**DSA:**
- Focuses on: Optimization, Streaming algorithms
- Bit manipulation, Design algorithms for streaming
- DP: Edit Distance, Longest Common Subsequence

**LLD:**
- Recommendation Engine, Video Streaming, Subscription System

**HLD:**
- Video Streaming Service (Netflix itself), Recommendation Algorithm, Content Delivery

---

## MOST FREQUENTLY ASKED DSA PROBLEMS (By Pattern)

### Top 30 Must-Know Patterns
1. **Two Sum / Multi-Sum** - Arrays, Hash Map
2. **Sliding Window** - Substring, Window problems
3. **Prefix Sum** - Range queries, Subarray problems
4. **Fast & Slow Pointers** - Linked Lists, Cycle detection
5. **Monotonic Stack** - Next Greater, Histogram
6. **Merge Intervals** - Interval scheduling
7. **Merge K Sorted Lists** - Heap, Merge
8. **Top K Elements** - Heap, Quick Select
9. **BFS** - Shortest path (unweighted), Level order
10. **DFS** - Connected components, Cycle detection
11. **Union-Find** - Connected components, Kruskal's
12. **Dijkstra's Algorithm** - Shortest path (weighted)
13. **Topological Sort** - DAG, Dependency
14. **Number of Islands** - Connected components (grid)
15. **LCA (Lowest Common Ancestor)** - Trees
16. **Serialize/Deserialize Tree** - Trees, BFS/DFS
17. **Binary Search on Answer** - Optimization
18. **Longest Substring** - Hash Map, Sliding Window
19. **Longest Subsequence** - DP, Binary Search
20. **LIS (Longest Increasing Subsequence)** - DP, Binary Search
21. **Edit Distance** - String DP
22. **Coin Change** - DP, Unbounded Knapsack
23. **House Robber** - DP variants
24. **Palindrome** - String DP, Expand Around
25. **Rotate/Reverse Array** - In-place, Two Pointers
26. **Partition** - Quick Sort, Dutch Flag
27. **Median of Two Sorted Arrays** - Binary Search
28. **Trapping Rain Water** - Stack or DP
29. **Word Ladder** - BFS, Graph
30. **Regular Expression Matching** - DP, Backtracking

### By Difficulty - Company Trends
**Easy (20% of interviews):**
- Two Sum, Reverse String, Palindrome, Valid Parentheses, Merge Sorted Array

**Medium (60% of interviews):** ← MOST COMMON
- LCA, Serialize Tree, LIS, Edit Distance, Word Ladder, Coin Change, 3Sum

**Hard (20% of interviews):**
- Trapping Rain Water II, Hard String problems, Complex DP, Hard Graph problems

### By Company Focus
| Company | Top 5 Patterns | Difficulty |
|---------|---|---|
| Google | Graphs, Trees, DP, Arrays, String | 60% Medium, 30% Hard |
| Amazon | Arrays, Trees, DP, Sliding Window, Stack | 70% Medium, 20% Easy |
| Meta | Graphs, Union-Find, String, Trees, DP | 65% Medium, 25% Hard |
| Microsoft | Trees, Recursion, Arrays, DP | 60% Medium, 30% Easy |
| Apple | Arrays, Linked Lists, Trees, DP | 70% Medium, 20% Easy |
| Netflix | Arrays, DP, Graphs, Bit Manipulation | 50% Medium, 40% Hard |

---

## RECOMMENDED LLD DESIGN PROBLEMS (By Company)

### Tier 1 - Asked By Everyone
1. **Parking Lot** - 90% of companies ask
   - Core: OOP, State Management, Search, Notification
   - Variants: Multi-level parking, Reserved spots, Different vehicle types

2. **LRU Cache** - 85% of companies ask
   - Core: Hash Map + Doubly Linked List
   - Variants: LFU Cache, Time-based expiration

3. **Rate Limiter** - 80% of FAANG
   - Core: Token Bucket, Sliding Window, Thread Safety
   - Variants: Distributed Rate Limiter, Leaky Bucket

4. **Elevator System** - 75% of companies
   - Core: State Machine, Scheduling, Concurrency
   - Variants: Multiple elevators, Express elevators, SCAN algorithm

5. **Library Management** - 70% of companies
   - Core: CRUD operations, Reservation, Search
   - Variants: Fine system, Reservation queue

### Tier 2 - Frequently Asked
6. **Pub-Sub System** - Messaging, Observer pattern
7. **Task Scheduler** - Cron jobs, Dependency management
8. **Notification System** - Queue, Template, Multi-channel
9. **ATM Machine** - State management, Concurrency, Audit
10. **Hotel Management** - Booking, Check-in/out, Inventory

### Tier 3 - Sometimes Asked
11. **Movie Ticket Booking** - E-commerce
12. **Vending Machine** - State machine, Inventory
13. **Chat System** (LLD) - Message handling, Friend list
14. **URL Shortener** (LLD) - Encoding, Storage, Tracking
15. **Social Network** (LLD) - Graph, Relationships

---

## RECOMMENDED HLD SYSTEM DESIGN PROBLEMS (By Company)

### Tier 1 - Most Popular
1. **URL Shortener (bit.ly, tinyurl)** - 95% ask this
   - Core: Encoding scheme, Database sharding, Caching, Analytics
   - Topics: Short URL generation, Redirect service, Traffic estimation

2. **Social Media Feed (Twitter, Facebook)** - 90% ask this
   - Core: Event-driven, Caching, Message queues, Ranking
   - Topics: Fanout, Activity feed, Real-time updates

3. **Distributed Cache (Redis, Memcached)** - 88% ask
   - Core: Consistency, Eviction policies, Replication
   - Topics: Cache invalidation, TTL, Cluster management

4. **Chat System (WhatsApp, Messenger)** - 85% ask
   - Core: Real-time messaging, Presence, Group chat, Scalability
   - Topics: WebSocket, Message queues, Storage

5. **Video Streaming (YouTube, Netflix)** - 80% ask
   - Core: Video encoding, CDN, Adaptive bitrate, Caching
   - Topics: Upload pipeline, Recommendation, Analytics

### Tier 2 - Commonly Asked
6. **Notification System** - Push, Email, SMS
7. **Ride Sharing (Uber, Lyft)** - Location tracking, Matching
8. **Autocomplete / Typeahead** - Trie, Ranking
9. **Web Crawler / Search Engine** - Indexing, Ranking
10. **Payment System** - Transactions, Security, Ledger

### Tier 3 - Sometimes Asked
11. **E-commerce (Amazon, Flipkart)** - Shopping cart, Inventory, Orders
12. **Real-time Analytics** - Data pipeline, Aggregation
13. **Hotel Booking (Airbnb)** - Inventory, Search, Reservation
14. **Ticketing System** - Seat reservation, Concurrency
15. **Document Collaboration (Google Docs)** - Real-time sync, Conflict resolution

---

## ESSENTIAL LEETCODE PROBLEM LIST (150+ Problems)

### Arrays & Strings (35 problems)
1. Two Sum
2. 3Sum
3. 4Sum
4. Contains Duplicate
5. Valid Anagram
6. Group Anagrams
7. Longest Consecutive
8. Majority Element
9. Product of Array Except Self
10. Prefix Sums variants
11. Merge Sorted Arrays
12. Merge Intervals
13. Insert Interval
14. Rotate Array
15. Remove Duplicates
16. Remove Element
17. Longest Substring Without Repeating Characters
18. Minimum Window Substring
19. Palindromic Substrings
20. Longest Palindromic Substring
21. String Compression
22. Trapping Rain Water
23. Container With Most Water
24. Subarray Sum Equals K
25. Continuous Subarray Sum
26. Maximum Subarray (Kadane)
27. Best Time to Buy and Sell Stock (all 4 variants)
28. Jump Game I & II
29. Candy
30. Gas Station
31. Meeting Rooms I & II
32. Interval List Intersections
33. Rotate Matrix
34. Set Matrix Zeroes
35. Matrix Search Variants

### Linked Lists (15 problems)
1. Reverse Linked List
2. Reverse between M and N
3. Merge Two Sorted Lists
4. Merge K Sorted Lists
5. Remove Nth Node From End
6. Detect Cycle
7. Find Cycle Start
8. Reorder List
9. Partition List
10. Palindrome Linked List
11. Intersection of Two Lists
12. Copy Random Pointer
13. Add Two Numbers
14. LRU Cache Implementation
15. Sort List

### Trees (35 problems)
1. Invert Binary Tree
2. Maximum Depth
3. Balanced Binary Tree
4. Lowest Common Ancestor
5. Serialize/Deserialize Tree
6. Binary Tree Paths
7. Path Sum I, II, III
8. Root to Leaf Path
9. Binary Tree Vertical Order
10. Binary Tree Level Order
11. Zigzag Level Order
12. Right Side View
13. Left Side View
14. Flatten Binary Tree
15. Validate BST
16. BST Closest Value
17. BST Insert/Delete
18. Kth Smallest Element in BST
19. Largest Values in Each Row
20. Sum of Left Leaves
21. Binary Tree Cameras
22. House Robber III
23. Distribute Coins in Binary Tree
24. Number of Nodes in Complete Tree
25. Minimum Subtree
26. Count Complete Tree Nodes
27. Range Sum BST
28. Trim BST
29. Diameter of Binary Tree
30. Number of Leaves
31. Find Leaves of Tree
32. Symmetric Tree
33. Same Tree
34. All Paths from Root to Leaf
35. Binary Tree Maximum Path Sum

### Graphs (35 problems)
1. Number of Islands
2. Number of Provinces
3. Clone Graph
4. Course Schedule I & II
5. Topological Sort
6. Alien Dictionary
7. Network Delay Time
8. Shortest Path in Grid
9. Word Ladder
10. Word Ladder II
11. Knight Minimum Moves
12. Rotting Oranges
13. Walls and Gates
14. Ocean Current (Pacific Atlantic)
15. Evaluate Division
16. Reconstruct Itinerary
17. Critical Connections
18. Accounts Merge (Union-Find)
19. Minimum Spanning Tree
20. Dijkstra Implementation
21. Bellman-Ford Implementation
22. Floyd-Warshall Implementation
23. Detect Cycle in Directed Graph
24. Detect Cycle in Undirected Graph
25. Bipartite Graph
26. Is Graph Bipartite
27. Same Graph
28. Number of Connected Components
29. Vertex Cover
30. Independent Set
31. Strongly Connected Components
32. Union-Find Problems
33. Graph Valid Tree
34. Number of Weakly Connected Components
35. Region Cut By Slashes

### Dynamic Programming (35 problems)
1. Climbing Stairs
2. House Robber I, II
3. Coin Change I & II
4. Perfect Squares
5. Longest Increasing Subsequence
6. Longest Decreasing Subsequence
7. Number of LIS
8. Longest Common Subsequence
9. Edit Distance
10. Distinct Subsequences
11. Interleaving String
12. Word Break I & II
13. Unique Paths I & II
14. Minimum Path Sum
15. Cherry Pickup
16. Dungeon Game
17. Best Time to Buy Stock (with cooldown, k transactions)
18. Paint House I & II
19. Paint Fence
20. Regular Expression Matching
21. Wildcard Matching
22. Longest Palindromic Subsequence
23. Palindrome Partitioning II
24. Burst Balloons
25. Matchsticks to Square
26. Partition Equal Subset Sum
27. Target Sum
28. Maximal Rectangle
29. Largest Divisible Subset
30. Russian Doll Envelopes
31. Decode Ways
32. Unique Binary Search Trees
33. Arithmetic Slices
34. Jump Game III
35. Maximum Product Subarray

### Others (15 problems)
1. Two Sum (Hash Map)
2. Valid Parentheses (Stack)
3. Longest Valid Parentheses (Stack/DP)
4. Trapping Rain Water (Monotonic Stack)
5. Largest Rectangle in Histogram (Monotonic Stack)
6. Next Greater Element
7. Daily Temperatures
8. Implement Stack/Queue
9. Implement Heap
10. Top K Frequent Elements
11. Kth Largest Element
12. Find Median from Data Stream
13. Sliding Window Maximum
14. Median of Two Sorted Arrays
15. Search in Rotated Sorted Array

---

## RESEARCH SOURCES FOR THIS GUIDE

1. **TakeUForward.org** - Most comprehensive DSA & LLD content
2. **System Design Primer** - donnemartin/system-design-primer (GitHub)
3. **Blind.com** - Real interview experiences & company patterns
4. **LeetCode Discuss** - Interview experience threads
5. **Cracking the Coding Interview** - Book: Classic patterns
6. **Designing Data-Intensive Applications** - Book: HLD concepts
7. **AlgoExpert.io** - Video explanations
8. **Educative.io** - Grokking series courses
9. **InterviewBit** - Structured problems by company
10. **GeeksforGeeks** - Algorithm explanations

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core DSA (40+ topics)
- [ ] Arrays & Strings (8 topics)
- [ ] Linked Lists (5 topics)
- [ ] Stacks & Queues (5 topics)
- [ ] Binary Search (5 topics)
- [ ] Trees (8 topics)
- [ ] Graphs (8 topics)
- [ ] DP (8 topics)

### Phase 2: LLD (20 topics)
- [ ] Top 5 Must-Know Patterns (Singleton, Factory, Strategy, Observer, Decorator)
- [ ] Top 10 Must-Design Systems (Parking Lot, Cache, Rate Limiter, Elevator, etc.)

### Phase 3: HLD (15 topics)
- [ ] Top 5 Must-Know Patterns (Sharding, Caching, Queue, Load Balancing, CDN)
- [ ] Top 10 Must-Design Systems (URL Shortener, Feed, Chat, Video Streaming, etc.)

### Phase 4: Company-Specific (Bonus)
- [ ] Google-specific topics (Graphs, DP)
- [ ] Amazon-specific topics (Trees, Arrays)
- [ ] Meta-specific topics (Graphs, Union-Find)
- [ ] Microsoft-specific topics (Trees, Recursion)
- [ ] Apple-specific topics (Arrays, Linked Lists)

---

## CONTENT DEPTH FOR EACH TOPIC

Every topic should include:

1. **Intuition** (1-2 sentences)
   - Plain English explanation
   
2. **Visual Examples** (Diagrams)
   - Before/After state
   
3. **Algorithm Steps** (Methodology)
   - Step-by-step approach
   
4. **Code Implementation** (C++)
   - Clean, commented code
   
5. **Worked Example** (Trace-through)
   - Show algorithm on sample input
   
6. **Complexity Analysis**
   - Time & Space with explanation
   
7. **Common Mistakes**
   - Pitfalls candidates make
   
8. **Interview Tips**
   - What interviewers look for
   
9. **Variations**
   - Problem variants
   
10. **Real Interview Questions**
    - Where this appears in FAANG
    
11. **Practice Problems**
    - 5-10 LeetCode links by difficulty
    
12. **Related Topics**
    - Prerequisites & advanced topics
