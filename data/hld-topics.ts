import { Topic, Reference } from "./syllabus";

// Text/monospace diagram helper, matching the ASCII-flow convention used across
// this dataset and all-topics.ts. Keeps diagrams native to the app (no external
// images), readable, and easy to redraw on a whiteboard in the stated order.
function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

// Shared citation for the benchmark HLD interview-prep repo used as inspiration
// for gap-filling topics below. Explanations here are original; only the
// category checklist and general topic framing were informed by the source.
const systemDesignPrimerRef: Reference = {
  source: "note",
  attribution: "ashishps1/awesome-system-design-resources (GitHub: https://github.com/ashishps1/awesome-system-design-resources) - used as an inspiration/category checklist only",
  insight: "The repo's curriculum structure (core concepts, networking, APIs, databases, caching, async messaging, distributed systems, trade-offs, tiered practice problems) guided which topics to add here; all explanations below are original."
};

export const hldTopics: Topic[] = [
  {
    id: "topic-hld-scale-components",
    moduleId: "mod-hld-foundations",
    title: "Scaling & Core Components",
    intuition: "Build systems for millions of requests: load balancing, caching, databases, queues, CDN.",
    lesson: [
      {
        title: "Core architecture components",
        content: "Think of a high-scale system as layered responsibilities: edge caching, traffic distribution, application servers, durable storage, and asynchronous workers. Each component exists to remove pressure from the next bottleneck.",
        codeExample: "Client -> CDN -> Load Balancer -> App Servers -> Cache -> Database\\n                                  ^                 |\\n                                  |__ queue _______|"
      },
      {
        title: "Where the bottleneck really is",
        content: "A lot of interview answers fail because candidates name components without explaining the bottleneck. Real designs are about read-heavy paths, write-heavy paths, failure handling, and which component is the limiting factor under peak load.",
        codeExample: "Read-heavy path: cache first\\nWrite-heavy path: queue + DB commit\\nHot key path: partition/shard + TTL\\nMulti-region path: local read, async replication"
      },
      {
        title: "Decision checklist",
        content: "When you explain an architecture, talk through QPS, payload size, write/read ratio, durability requirements, and how retries or cache misses behave under load. A good answer is not just a diagram, it is a clear reasoned trade-off.",
        codeExample: "Traffic assumption -> read/write split -> cache hit ratio -> failover plan -> DB sharding -> observability"
      }
    ],
    examples: [
      {
        title: "URL shortener read-heavy example",
        input: "10M short links, 5B redirects/month, 1% writes",
        output: "A cache-first redirect service with a write path that stores only the mapping and a durable database behind it",
        explanation: "Step 1: Clarify the ratio: redirects are read-heavy, short-link creation is rare. Step 2: Put the redirect flow behind a cache like Redis. Step 3: On miss, fetch from the database once, then cache the result. Step 4: Separate the write path from the read path so creation does not affect redirect latency. Step 5: Add a queue if analytics or invalidation jobs are asynchronous. This is the classic pattern: optimize the hottest path first."
      },
      {
        title: "When the cache is full",
        input: "A hot URL gets 10x traffic and the cache is near capacity",
        output: "A fallback policy that prefers TTLs, LRU eviction, and selective invalidation instead of invalidating everything",
        explanation: "Step 1: Identify that the bottleneck is not the database alone but the cache hit ratio. Step 2: Use LRU/TTL to evict cold entries. Step 3: Keep the hottest redirects pinned. Step 4: For critical updates, invalidate just the affected keys instead of clearing the entire cache. Step 5: Explain that this is a trade-off between inconsistency and performance."
      }
    ],
    tips: ["Load balancer: single point of failure unless you run multiple", "Database sharding: split by user, region, or key range", "Cache invalidation is the hardest problem in systems design"],
    references: [{ source: "blog", attribution: "High Scalability", insight: "Cache invalidation strategy is critical to system design." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-consistency-reliability",
    moduleId: "mod-hld-foundations",
    title: "Consistency & Reliability",
    intuition: "Understand trade-offs: ACID vs eventual consistency, replication, failover, monitoring.",
    lesson: [
      {
        title: "Consistency models",
        content: "Strong consistency means each read sees the latest committed write. Eventual consistency means reads may briefly hit stale data but the system converges. The right choice depends on correctness requirements and latency tolerance.",
        codeExample: "Banking: strong consistency required\\nSocial feed: eventual consistency often acceptable\\nOrders: strong for stock; eventually consistent for analytics"
      },
      {
        title: "Replication and failover",
        content: "Replication protects availability. Synchronous replication is safer but slower; asynchronous replication is faster but risks stale reads after a failover. Real systems use a mix and explain the consequences clearly.",
        codeExample: "Primary -> replica(s)\\nSync: write blocks until replica confirms\\nAsync: write returns quickly, replicas catch up later\\nFailover: promote a replica, re-elect leader, rebuild read quorum"
      },
      {
        title: "Reliability in interviews",
        content: "Do not say 'it will be reliable' without naming failure modes. Talk about retries, idempotent writes, dead-letter queues, leader election, monitoring, and fallback behavior when a dependency fails.",
        codeExample: "retry with backoff -> idempotency keys -> DLQ -> circuit breaker -> alerts -> watchdog"
      }
    ],
    examples: [
      {
        title: "Social media post consistency",
        input: "A user posts, and 20 friends read immediately from different regions",
        output: "Most users see the post within seconds, but a few replicas may briefly lag",
        explanation: "Step 1: Write to the primary database and commit the post. Step 2: Replicate to followers asynchronously. Step 3: Users in the same region may read from local replicas and see the post quickly; users in a lagging region may see stale data temporarily. Step 4: For a social network, this trade-off is acceptable. For payments or inventory, it is not."
      },
      {
        title: "Payment system consistency",
        input: "A user transfers 1000 USD while a second read happens at the same time",
        output: "The system must not show a stale balance or double-spend the money",
        explanation: "Step 1: A transaction must lock or serialize against the account. Step 2: Use strong consistency for the critical money transfer path. Step 3: Expose writes only after the transaction is committed. Step 4: Reads should come from the primary or a consistent quorum. This example shows why eventual consistency is never acceptable for money."
      }
    ],
    tips: ["Banking: strong consistency critical", "Social/analytics: eventual consistency often okay", "Replication: sync is slower but safer; async is faster but riskier"],
    references: [{ source: "blog", attribution: "CAP Theorem", insight: "Consistency, availability, and partition tolerance require trade-offs." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-url-shortener",
    moduleId: "mod-hld-design-exercises",
    title: "URL Shortener (tinyurl.com style)",
    intuition: "Convert long URLs to short codes, redirect on access. Heavy reads (redirects), few writes (new URLs).",
    lesson: [
      {
        title: "Core requirements",
        content: "The essential requirement is a short code that maps to a long URL, and a redirect path that resolves it quickly. The real design challenge is not just generating codes; it is handling billions of redirect requests with low latency and enough durability.",
        codeExample: "POST /shorten -> { longUrl }\\nGET /abc123 -> 301 redirect to target url\\nDB stores: shortCode -> longUrl\\nCache stores hot shortCode -> longUrl"
      },
      {
        title: "Architecture choice",
        content: "Use a hash or base62 encoding service for code generation. Since reads dominate, put the hot redirect path behind Redis or CDN caching. Keep writes in the database and enable a queue for analytics or invalidation jobs.",
        codeExample: "Shorten service -> assign unique ID -> base62 encode -> persist mapping\\nRedirect service -> cache lookup -> DB fallback -> return 301"
      },
      {
        title: "Interview framing",
        content: "A strong answer starts by saying: 'This is a read-heavy system with few writes, so I will optimize the redirect path and accept more complexity in the write path.' That is exactly the kind of signal FAANG interviewers want.",
        codeExample: "Read-heavy optimization -> caching + shallow query path\\nWrite-heavy complexity -> unique ID generation + dedupe + TTL"
      }
    ],
    examples: [
      {
        title: "Generating unique short codes",
        input: "Need 6-character short links for 1B URLs",
        output: "Base62 encoding provides enough space and keeps IDs compact while preserving a simple mapping layer",
        explanation: "Step 1: Allocate a numeric ID like 1, 2, 3. Step 2: Convert it to a base-62 string using digits + lowercase + uppercase. Step 3: Store the mapping shortCode -> longUrl in the database. Step 4: Redirect service looks up the code in cache; if missing, hits the database and then refreshes the cache. This keeps the path fast while still storing a durable mapping."
      },
      {
        title: "Popular URL spike",
        input: "One URL becomes trending and receives 10x traffic in a few minutes",
        output: "The URL is pinned in cache and handled by the read path rather than the database",
        explanation: "Step 1: Detect the spike in redirect traffic. Step 2: Keep the hot mapping in Redis with a longer TTL or a pinned entry. Step 3: Prevent cache churn by evicting cold links first. Step 4: Explain the trade-off: a small amount of stale data is acceptable for redirect URLs but not for a critical financial or access-control system."
      }
    ],
    tips: ["Read-heavy design = cache aggressively", "Use 301 for permanent redirects or 302 for temporary redirects", "Handle code collisions and deduplication", "Consider vanity URLs only if the business case requires it"],
    references: [{ source: "interview-experience", attribution: "System Design Interview", insight: "Cache strategy and QPS estimation are key." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-news-feed",
    moduleId: "mod-hld-design-exercises",
    title: "News Feed / Social Network",
    intuition: "Each user has followers, posts to feed, followers see posts. Billions of users, trillions of posts.",
    lesson: [
      {
        title: "Feed generation models",
        content: "The big decision is push versus pull. A push system precomputes a user's feed, which gives fast reads but expensive writes. A pull system composes feed items on demand, which is better for sparse or inactive users. Many real systems use a hybrid: push for active users, pull for cold users.",
        codeExample: "Push model: post -> fanout -> feed cache\\nPull model: read -> query follow list -> fetch recent posts\\nHybrid: active user feed cached, inactive user feed pulled"
      },
      {
        title: "Scaling the follower graph",
        content: "The follower graph is effectively a graph problem. You need efficient storage, traversal, and timely updates. Whether you store the graph in a relational table, a key-value store, or a dedicated graph store, the key is to keep the access pattern close to the query pattern.",
        codeExample: "User A follows 1000 people\\nQuery feed = select recent posts from those users\\nNeed: efficient follower list + sorted merge + cache"
      },
      {
        title: "Interview trade-off",
        content: "A simple answer is 'we use caches and a fan-out service.' A better one is 'for active users we fan out to a feed cache because read latency matters more; for inactive users we fall back to pull because write cost is too high to fan out for everyone.' That level of nuance is what makes the answer feel mature.",
        codeExample: "active user -> push fanout to feed cache\\ninactive user -> pull on view\\nhot feed -> LRU cache + truncation"
      }
    ],
    examples: [
      {
        title: "Feed timeline generation",
        input: "User follows 500 people; they view the feed when they log in",
        output: "Top 20 recent posts are merged and sorted without reading every post in the system",
        explanation: "Step 1: Get the set of followed accounts. Step 2: Read the latest posts for each account from the timeline store or cache. Step 3: Merge and sort by time, keeping only the top 20. Step 4: Cache the result for a short TTL. Step 5: Invalidate or refresh the cache when new content arrives. This balances freshness and performance."
      },
      {
        title: "High-activity celebrity scenario",
        input: "A celebrity with 100M followers posts one update",
        output: "The system fans out to a queued fan-out worker rather than doing a synchronous DB write for every follower",
        explanation: "Step 1: The post is written once to the global timeline. Step 2: A worker asynchronously creates feed items for followers or relevant caches. Step 3: The system keeps the hot path fast and tolerates eventual consistency for the feed view. Step 4: It explains why write amplification is not acceptable for a giant social graph."
      }
    ],
    tips: ["Push for active users, pull for inactive users", "Cache the feed and recent timeline", "Graph relationships are expensive to traverse; keep them sharded", "Async processing is critical for giant fan-out events"],
    references: [{ source: "interview-experience", attribution: "Facebook System Design", insight: "Feed generation at Facebook's scale is a massive engineering challenge." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-messaging-chat",
    moduleId: "mod-hld-design-exercises",
    title: "Messaging / Chat System",
    intuition: "Real-time messaging between users. Billions of users, millions concurrent. Ensure messages delivered reliably.",
    lesson: [
      {
        title: "Message flow",
        content: "The critical path is sender -> server -> storage -> receiver. Real-time delivery needs WebSockets or long-polling, but the architecture also needs durability and offline support. Without durable storage and retries, 'real-time' is not enough.",
        codeExample: "Sender sends a message -> server validates -> store in DB -> enqueue to recipient -> deliver via WebSocket or push when connected"
      },
      {
        title: "Ordering and delivery guarantees",
        content: "In chat, ordering matters. Users usually expect messages in send order. A message queue or event log ensures this, even when the recipient reconnects later. If the design ignores ordering and offline delivery, it is incomplete.",
        codeExample: "message log -> consumer -> online delivery -> pending queue -> delivery receipt"
      },
      {
        title: "Scaling under concurrency",
        content: "A chat system needs multiple message servers, user-to-server mapping, and presence tracking. You want to minimize reconnect churn when a node fails and keep message state consistent across read replicas or local caches.",
        codeExample: "consistent hashing for user -> server mapping\\nWebSocket fan-out per connection\\nRedis presence cache + DB history"
      }
    ],
    examples: [
      {
        title: "User A sends to user B while B is online",
        input: "A and B are both connected to different message servers",
        output: "The server routes the message to B's active connection and writes the message to the durable log",
        explanation: "Step 1: A sends to the message service. Step 2: Server validates authentication and rate limits. Step 3: It writes the event to the durable message log. Step 4: It finds B's server via the user-to-server mapping. Step 5: It pushes the event to B's WebSocket. Step 6: It updates presence and caches. This shows the difference between a messaging system and a generic queue."
      },
      {
        title: "B is offline",
        input: "User B is not connected, and the app receives 20 pending messages",
        output: "Messages are stored and delivered once B reconnects without losing order or duplicates",
        explanation: "Step 1: The server keeps the messages in an outbox or pending queue. Step 2: It maintains a sequence number or delivery state. Step 3: When B reconnects, the app fetches pending messages in order. Step 4: It acknowledges delivery. Step 5: A duplicate-safe client or idempotent design prevents the same message from being delivered twice."
      }
    ],
    tips: ["WebSocket for low-latency delivery", "Queue for reliability when receiver is offline", "Message ordering is critical for UX", "Presence and typing indicators belong in a fast cache"],
    references: [{ source: "interview-experience", attribution: "WhatsApp HLD", insight: "Messaging at scale requires reliable queues and presence tracking." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-notification-system",
    moduleId: "mod-hld-design-exercises",
    title: "Notification System (Email, SMS, Push)",
    intuition: "Send millions of notifications daily. Prioritize (alerts urgent), rate-limit, track delivery.",
    lesson: [
      {
        title: "Priority and channel routing",
        content: "Notifications are not all equal. A security alert should be immediate through multiple channels; a marketing push can be queued and delayed. The key is not just sending messages but doing it in a way that preserves trust and avoids spam.",
        codeExample: "security alert -> HIGH priority -> SMS + push + email\\nmarketing update -> LOW priority -> batch queue + schedule"
      },
      {
        title: "Failure handling",
        content: "A real notification system protects against the provider failing or rate-limiting you. Use retries with exponential backoff, idempotent message keys, and a dead-letter queue for messages that keep failing.",
        codeExample: "retry 1m -> 5m -> 30m -> dead-letter queue\\nprovider-specific throttling: backoff + queue"
      },
      {
        title: "Scale trade-off",
        content: "The bigger your platform, the more important it becomes to track deliverability and deduplicate notifications. The system must guard against users receiving the same alert multiple times while still being resilient enough to retry messages under load.",
        codeExample: "message dedupe key -> user_id + event_id + channel\\nstatus table -> sent / delivered / failed / suppressed"
      }
    ],
    examples: [
      {
        title: "Security alert notification",
        input: "An unusual login from a new device triggers a high-priority alert for 1M users",
        output: "The notification is routed through multiple channels with retries and suppression logic to prevent duplicates",
        explanation: "Step 1: Create the alert with a high-priority flag. Step 2: Put it in the priority queue. Step 3: Workers route the alert through the channel that is most likely to be seen quickly while still using a backup channel if needed. Step 4: The system records the message ID and status so retries and duplicate suppression are explicit."
      },
      {
        title: "Rate-limit check",
        input: "A user receives 100 notifications in 10 minutes",
        output: "The system suppresses the lower-priority messages and preserves the most relevant ones",
        explanation: "Step 1: Evaluate the user's notification policy. Step 2: Drop or batch low-priority messages when the user is over a daily quota. Step 3: Keep the security or transaction text. Step 4: Explain that rate limiting is not just a product feature; it is a reliability and trust issue."
      }
    ],
    tips: ["Priority queue is essential", "rate limiting protects trust and system health", "multi-channel improves reliability", "dead-letter queues help operational debugging"],
    references: [{ source: "blog", attribution: "Uber Notification System", insight: "Scalability and reliability at trillions of notifications." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-ride-sharing",
    moduleId: "mod-hld-design-exercises",
    title: "Ride Sharing (Uber/Lyft)",
    intuition: "Match riders with drivers in real-time. Track locations, calculate fares, ensure safety.",
    lesson: [
      {
        title: "Core components",
        content: "At scale, ride sharing is a real-time location and match problem. It depends on a geo-index for driver locations, a matching engine for nearby drivers, a pricing service for surge, and a transaction flow for booking and payment.",
        codeExample: "driver app -> location stream -> geo-index -> match engine -> rider offer -> accept -> trip lifecycle"
      },
      {
        title: "Matching quality",
        content: "The matching engine must handle supply and demand under pressure. It must prefer a nearby driver with a good ETA, but also account for surge pricing, driver cancellations, and rider timeouts. In a real answer, the matching algorithm is more than 'nearest driver wins'.",
        codeExample: "candidate drivers -> filter by availability -> sort by ETA + surge + acceptance probability -> offer -> retry"
      },
      {
        title: "Availability and failure handling",
        content: "When a driver accepts and then cancels, the system must re-match quickly. Under high demand, surge pricing and queueing are critical. If your answer ignores cancellations and ETA estimation, it is incomplete.",
        codeExample: "request -> match -> accept -> trip state -> cancel -> re-match -> ETA update -> payment"
      }
    ],
    examples: [
      {
        title: "Rider request matching",
        input: "A rider in downtown requests a ride; 50 drivers are nearby but several are already on trip or unavailable",
        output: "The system filters by availability, ranks candidates by ETA, and returns the best suitable driver or retries quickly",
        explanation: "Step 1: Query the geo-index for drivers within a radius. Step 2: Exclude drivers who are not available or have low acceptance probability. Step 3: Estimate ETA and sort by best match. Step 4: Offer the rider the top result. Step 5: If declined or if the driver cancels, the system retries with the next candidate. This is the actual operational complexity hidden behind a simple 'match a nearby driver' summary."
      },
      {
        title: "Surge pricing under heavy demand",
        input: "A large event ends and 4x demand hits the market instantly",
        output: "Price increases and the system prioritizes driver incentives while keeping a stable waiting experience",
        explanation: "Step 1: A demand-and-supply monitor detects a spike. Step 2: Surge pricing raises the price to attract idle drivers. Step 3: The engine keeps offering rides to the nearest drivers while filtering out those who are too far. Step 4: Riders can accept or reject the surge price. This shows that matching and pricing are coupled in real systems."
      }
    ],
    tips: ["Geo-spatial indexes are critical for performance", "driver locations change frequently, so eventual consistency is acceptable", "Queue matching requests to handle spikes", "Multi-attempt matching is essential when drivers reject offers"],
    references: [{ source: "interview-experience", attribution: "Uber System Design", insight: "Geo-spatial matching and real-time availability is the heart of the system." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-cap-theorem",
    moduleId: "mod-hld-foundations",
    title: "CAP Theorem & Consistency Spectrum",
    intuition: "During a network partition you must pick availability or consistency; the CAP theorem forces that choice, and most real systems live on a spectrum, not at an extreme.",
    lesson: [
      {
        title: "What CAP actually claims",
        content: "CAP says a distributed system can offer at most two of Consistency (every read sees the latest write), Availability (every request gets a non-error response), and Partition tolerance (the system keeps working when nodes cannot talk to each other). Because network partitions are unavoidable in a distributed system, partition tolerance is not optional in practice, so the real interview decision is CP versus AP when a partition happens.",
        codeExample: "Partition happens -> choose:\\n  CP: reject/queue requests until quorum is reachable (correctness first)\\n  AP: serve possibly-stale data from any reachable replica (uptime first)"
      },
      {
        title: "Where systems actually sit",
        content: "Few systems are purely CP or AP everywhere; they choose per operation. A bank ledger write is CP (better to fail than post the wrong balance). A social feed read is AP (better to show a slightly stale post than an error page). Most production systems mix strategies: strongly consistent metadata store plus an eventually consistent cache or search index.",
        codeExample: "Payments write -> CP: quorum write, reject minority partition\\nProfile/feed read -> AP: serve from nearest replica, reconcile later"
      },
      {
        title: "PACELC, the practical extension",
        content: "PACELC extends CAP: even without a Partition, you still trade Latency for Consistency (the 'ELC' part). A system that replicates synchronously gets strong consistency but pays latency on every write; one that replicates asynchronously is fast but can serve stale reads. State this trade-off explicitly in interviews, it signals deeper understanding than reciting CAP alone.",
        codeExample: "No partition, but still choose:\\n  sync replication -> higher write latency, strong reads\\n  async replication -> lower write latency, eventual reads"
      }
    ],
    examples: [
      {
        title: "Partition during a flash sale",
        input: "Two data center regions lose their link for 90 seconds while an inventory service is under a flash-sale spike",
        output: "The team picks CP for the inventory decrement (avoid overselling) and AP for the product catalog page (avoid a full outage)",
        explanation: "Step 1: Classify each operation by business risk: overselling stock is costly, so writes to inventory count require a quorum and reject requests from the minority partition. Step 2: Catalog/browse reads are low risk if stale for a few seconds, so they stay available from any replica during the partition. Step 3: When the partition heals, the minority side reconciles state (compares vector clocks or version numbers) and resolves conflicts. Step 4: The interview answer explicitly names which operations are CP and which are AP, rather than declaring the whole system one or the other."
      },
      {
        title: "Cross-region write latency trade-off",
        input: "A team must choose between synchronous multi-region replication (50ms extra latency per write) or asynchronous replication (5ms) for a checkout service",
        output: "They choose synchronous replication only for the order-commit step, and asynchronous replication for everything else (shipping status, recommendations)",
        explanation: "Step 1: Identify the single write where correctness matters most (the order commit) and accept its latency cost for durability and consistency across regions. Step 2: Downstream writes (analytics, recommendation refresh) tolerate eventual consistency and stay asynchronous to protect overall latency. Step 3: This is a PACELC decision made per write path, not a single global choice, and demonstrates the nuance interviewers look for."
      }
    ],
    tips: ["Partition tolerance is not optional in a real distributed system, so the live choice is CP vs AP", "Decide per operation, not per system", "PACELC: even without a partition, consistency still costs latency", "Name the concrete failure mode you are protecting against, not just the acronym"],
    tricks: ["When asked 'is your system CP or AP', answer per critical write path instead of the whole system", "Use vector clocks/version numbers as the concrete mechanism for reconciling conflicts after a partition heals"],
    memoryAids: ["CAP: pick 2 of 3, but partitions are guaranteed, so really it's C vs A under partition", "PACELC: partition -> A or C; else -> Latency or Consistency"],
    interviewPatterns: ["Interviewers probe with 'what happens if the network partitions here?' - answer with the specific CP/AP choice and why", "Follow up by naming the reconciliation mechanism (quorum, vector clock, last-write-wins) used once the partition heals"],
    references: [
      { source: "blog", attribution: "CAP Theorem (Eric Brewer)", insight: "The original formulation: consistency, availability, and partition tolerance cannot all be guaranteed simultaneously." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-cap-inventory-partition", "hld-cap-cross-region-checkout"]
  },

  {
    id: "topic-hld-consistent-hashing",
    moduleId: "mod-hld-foundations",
    title: "Consistent Hashing",
    intuition: "Naive modulo sharding (key % N) reshuffles almost every key when N changes; consistent hashing keeps most keys in place when nodes are added or removed.",
    lesson: [
      {
        title: "The problem with modulo sharding",
        content: "With plain hash(key) % N sharding, adding or removing a single node changes N and remaps nearly every key to a different node, causing a massive cache-miss storm or data-migration spike. This is unacceptable for a live cache or database cluster that must scale elastically.",
        codeExample: "N=4 -> N=5: hash(key) % 4 vs hash(key) % 5\\nnearly every key maps to a different node -> cache stampede"
      },
      {
        title: "How consistent hashing fixes it",
        content: "Consistent hashing places both nodes and keys on a logical ring (hash space 0..2^32-1). A key belongs to the first node found walking clockwise from the key's hash position. Adding or removing one node only affects the keys between it and its neighbor on the ring, not the whole keyspace.",
        codeExample: "ring: [Node A]---[Node B]---[Node C]---(wrap to A)\\nkey.hash() -> walk clockwise -> first node encountered owns the key\\nremove Node B -> only B's keys move to C, A and C's other keys unaffected",
        diagram: asciiDiagram(
`Interview drawing order:
1) draw a circle (the ring, hash space 0..2^32-1)
2) place nodes A, B, C clockwise around it
3) hash a key -> drop it on the ring -> arrow clockwise to nearest node

            0
        ,--------.
      /            \\
    A                C
     \\              /
      \`----B-------'
           |
     key.hash() lands here -> walks CW -> owned by B

remove B: only the arc between A and C (previously B's) remaps to C`
        )
      },
      {
        title: "Virtual nodes fix hot spots",
        content: "With only a few physical nodes on the ring, load can be uneven (one node might own a disproportionate arc). The fix is virtual nodes: each physical node is hashed to many points on the ring (e.g. 100-200 virtual nodes per physical node), spreading load evenly and making rebalancing smoother when capacity changes.",
        codeExample: "Physical Node A -> vnodes A#1..A#150 scattered around ring\\nmore vnodes = smoother load distribution + smaller rebalance impact per physical node change"
      }
    ],
    examples: [
      {
        title: "Adding a cache node without a stampede",
        input: "A 4-node Redis cluster serving 10M keys needs a 5th node added for capacity",
        output: "Only ~20% of keys (the ones between the new node and its ring neighbor) are remapped; the rest stay put and stay warm",
        explanation: "Step 1: Hash the new node's identifier onto the ring at one or more virtual positions. Step 2: Any key whose clockwise-nearest node used to be the neighbor, but is now the new node, migrates; all other keys are unaffected because their nearest-node lookup is unchanged. Step 3: This is why consistent hashing is the standard answer for elastic caches, sharded databases (Cassandra, DynamoDB), and CDNs. Step 4: Contrast explicitly with modulo sharding, which would have remapped close to 100% of keys."
      },
      {
        title: "Uneven load with too few virtual nodes",
        input: "A 3-node ring with only 1 point per node ends up with Node A owning 60% of the keyspace",
        output: "Increasing to ~150 virtual nodes per physical node rebalances ownership to roughly 33% each",
        explanation: "Step 1: With only one ring position per node, arc sizes are random and can be very uneven. Step 2: Adding many virtual nodes per physical node averages out the arc sizes across the ring, because the law of large numbers smooths the distribution. Step 3: This also means when one physical node fails, its load spreads across many other nodes instead of dumping entirely onto one neighbor."
      }
    ],
    tips: ["Consistent hashing minimizes reshuffling when nodes join/leave (only ~1/N of keys move)", "Virtual nodes solve uneven load distribution from a small number of physical nodes", "Used in Cassandra, DynamoDB, memcached client-side sharding, and CDN request routing"],
    tricks: ["If asked to shard a cache/db and scale elastically, default answer is consistent hashing with virtual nodes, not modulo", "State the concrete fraction of keys that move (~1/N) to show quantitative understanding"],
    memoryAids: ["Ring + walk clockwise + first node wins", "Virtual nodes = many points per node = even load"],
    interviewPatterns: ["Comes up whenever you scale a stateful/sharded layer (cache, DB shard, CDN edge routing)", "Interviewer follow-up: 'what happens to hot keys / hot nodes?' -> virtual nodes + monitoring per-node load"],
    references: [
      { source: "note", attribution: "Consistent Hashing (Karger et al. concept)", insight: "Ring-based hashing bounds key remapping to roughly 1/N of the keyspace on membership change." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-consistent-hashing-cache-scaleout", "hld-consistent-hashing-hot-node"]
  },

  {
    id: "topic-hld-spof-fault-tolerance",
    moduleId: "mod-hld-foundations",
    title: "Single Points of Failure & Fault Tolerance",
    intuition: "Any component that exists only once, and whose failure takes down the whole system, is a single point of failure (SPOF); resilient design means finding and eliminating every one of them.",
    lesson: [
      {
        title: "Finding SPOFs systematically",
        content: "Walk every request path end to end and ask, for each hop, 'if this one instance died right now, does the request still succeed?' Common SPOFs: a single load balancer, a single database primary with no standby, a single message broker, a single DNS entry with no fallback, a single region deployment, and a single on-call engineer's tribal knowledge.",
        codeExample: "Client -> [1 LB] -> [1 App] -> [1 DB] -> done\\nEvery bracket with count=1 is a SPOF candidate"
      },
      {
        title: "Redundancy patterns",
        content: "Remove a SPOF by adding redundancy plus a failover mechanism: multiple load balancers behind a floating/virtual IP or DNS with health checks, multiple stateless app instances behind the LB, a database with synchronous or semi-synchronous standby replicas plus automated leader election, and multi-AZ or multi-region deployment for the whole stack.",
        codeExample: "LB: active-active pair + health check\\nApp: N stateless replicas, autoscaled\\nDB: primary + 1-2 standby replicas + automated failover (e.g. Raft-based leader election)\\nRegion: primary region + warm/cold standby region"
      },
      {
        title: "Fault tolerance beyond hardware",
        content: "Fault tolerance also covers software failure modes: cascading failures from a slow dependency (fixed with timeouts, circuit breakers, and bulkheads), retry storms (fixed with exponential backoff and jitter), and operational failures (fixed with gradual rollouts, canary deploys, and automated rollback). A mature answer names the blast radius of a failure and how it is contained.",
        codeExample: "call dependency -> timeout(200ms) -> on repeated failure -> circuit breaker opens -> fallback/cached response\\nbulkhead: isolate thread/connection pools per dependency so one slow dependency can't starve all requests"
      }
    ],
    examples: [
      {
        title: "Eliminating a single-database SPOF",
        input: "An e-commerce checkout service has one Postgres primary with no replica; the primary's disk fails",
        output: "Checkout is completely down until a new primary is provisioned and restored from backup, likely 30+ minutes of downtime and potential data loss",
        explanation: "Step 1: Identify that a single primary with no standby is a textbook SPOF. Step 2: Add at least one synchronous or semi-synchronous standby replica in a different availability zone. Step 3: Use an automated failover controller (or managed service like RDS Multi-AZ / Aurora) that detects primary failure via health checks and promotes a standby within seconds. Step 4: Applications must handle a brief connection blip during failover with retries and idempotent writes. Step 5: This converts a 30-minute outage into a sub-minute blip, which is the concrete, quantified improvement an interviewer wants to hear."
      },
      {
        title: "Cascading failure from a slow downstream service",
        input: "A recommendation service starts responding slowly (2s instead of 20ms); the product page service calls it synchronously with no timeout",
        output: "Thread pools in the product page service fill up waiting on the slow calls, and the entire product page becomes unavailable even though only recommendations were slow",
        explanation: "Step 1: Diagnose that the lack of a timeout let one slow dependency exhaust a shared resource (threads/connections), turning a partial failure into a total outage. Step 2: Add an aggressive timeout (e.g. 200ms) on the recommendation call. Step 3: Add a circuit breaker that stops calling the dependency once its error/latency rate crosses a threshold, failing fast instead of queuing. Step 4: Serve a fallback (empty or cached recommendations) so the page still renders. Step 5: This demonstrates containing blast radius rather than letting one weak link sink the whole page."
      }
    ],
    tips: ["Ask 'what happens if this exact component dies right now' for every hop in the request path", "Redundancy without automated failover is not fault tolerance, someone still has to notice and act", "Timeouts + circuit breakers + bulkheads prevent partial failures from becoming total outages", "Multi-AZ protects against hardware/AZ failure; multi-region protects against regional disasters"],
    tricks: ["When asked to 'make this reliable', walk the request diagram hop by hop naming the SPOF and the fix at each hop", "Always pair 'redundancy' with 'automated detection and failover', interviewers probe for the second half"],
    memoryAids: ["SPOF hunt: any box you could only draw once is suspect", "Contain, don't just avoid: timeouts + circuit breaker + bulkhead stop one failure from becoming everyone's failure"],
    interviewPatterns: ["'How would you make this system more reliable?' -> systematically list SPOFs and redundancy/failover fixes", "'What happens if X goes down?' -> trace the blast radius and the specific mitigation"],
    references: [
      { source: "note", attribution: "Fault tolerance & redundancy patterns", insight: "Redundancy plus automated failover, not redundancy alone, is what removes a single point of failure." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-spof-single-db-primary", "hld-spof-cascading-timeout"]
  },

  {
    id: "topic-hld-networking-fundamentals",
    moduleId: "mod-hld-foundations",
    title: "Networking Fundamentals for System Design",
    intuition: "DNS resolves names to IPs, TCP gives reliable ordered delivery, HTTP/HTTPS carries the application request, and WebSockets keep a connection open for push; knowing which layer to change is how you fix latency or scaling problems.",
    lesson: [
      {
        title: "DNS and connection setup cost",
        content: "Before any request reaches your service, the client resolves a domain name via DNS (often cached at the OS/browser/resolver level, with a TTL controlling how long that cache is valid), then opens a TCP connection (a 3-way handshake: SYN, SYN-ACK, ACK), then, for HTTPS, performs a TLS handshake to negotiate encryption. Each of these adds round trips before the first byte of your response, so connection reuse (keep-alive, HTTP/2 multiplexing) matters as much as server-side speed.",
        codeExample: "DNS lookup (cached after TTL) -> TCP handshake (SYN/SYN-ACK/ACK) -> TLS handshake -> HTTP request/response\\nkeep-alive / HTTP2 multiplexing -> reuse the connection, skip handshakes on subsequent requests"
      },
      {
        title: "HTTP versions and WebSockets",
        content: "HTTP/1.1 opens multiple connections per host to parallelize requests, which is wasteful; HTTP/2 multiplexes many requests over one TCP connection, removing head-of-line blocking at the request level; HTTP/3 moves to UDP-based QUIC to also remove TCP-level head-of-line blocking. WebSockets upgrade an HTTP connection into a persistent full-duplex channel, ideal for chat, live notifications, or collaborative editing where the server must push data without the client polling.",
        codeExample: "HTTP/1.1: N connections per host, request queueing\\nHTTP/2: 1 connection, multiplexed streams\\nWebSocket: HTTP upgrade -> persistent bidirectional socket -> server can push anytime"
      },
      {
        title: "Choosing the right transport for the job",
        content: "Use plain HTTP request/response for typical CRUD APIs. Use long polling or Server-Sent Events for simple one-way server push when infrastructure (proxies/load balancers) may not support WebSockets well. Use WebSockets for low-latency bidirectional traffic like chat or multiplayer state. Use gRPC (HTTP/2-based) for efficient internal service-to-service calls with strict schemas and streaming.",
        codeExample: "one-way server push, simple infra -> Server-Sent Events\\nbidirectional, low-latency -> WebSocket\\ninternal service-to-service, typed, streaming -> gRPC over HTTP/2"
      }
    ],
    examples: [
      {
        title: "Diagnosing slow first requests globally",
        input: "Users in Asia report the first request to a US-hosted API takes 800ms, but subsequent requests take 60ms",
        output: "The 800ms is dominated by DNS lookup, TCP handshake, and TLS handshake round trips across a long physical distance; the 60ms is the reused, already-established connection",
        explanation: "Step 1: Separate connection setup cost (DNS + TCP + TLS, each a round trip over ~150ms+ transoceanic latency) from application response time. Step 2: Fix connection setup by using a CDN/edge network with points of presence near users, terminating TLS at the edge and reusing a warm connection to the origin. Step 3: Ensure clients use keep-alive/HTTP2 so the expensive handshake happens once per session, not per request. Step 4: This reframes the 'slow API' complaint as a networking/latency problem, not an application code problem."
      },
      {
        title: "Choosing WebSockets over polling for a chat feature",
        input: "A chat feature currently polls GET /messages every 2 seconds per user, and the load balancer is overwhelmed at 50K concurrent users",
        output: "Switching to a WebSocket-based push model cuts request volume by roughly 30x (only new messages trigger traffic) and reduces perceived latency from up to 2s to near-instant",
        explanation: "Step 1: Quantify polling cost: 50K users * 1 request/2s = 25,000 req/sec of mostly-empty responses. Step 2: Replace with a persistent WebSocket per online user; the server pushes a message only when one actually arrives, eliminating wasted polling traffic. Step 3: Size the connection layer for concurrent open sockets (memory per connection) rather than request throughput, which is a different scaling dimension the team must plan for. Step 4: Add a fallback (long polling or SSE) for clients/proxies that cannot maintain WebSockets."
      }
    ],
    tips: ["DNS TTL controls how quickly clients pick up an IP/infra change, not just naming", "Connection reuse (keep-alive, HTTP/2) removes repeated handshake latency", "WebSockets trade per-message overhead for per-connection memory cost at scale", "Terminate TLS close to the user (CDN/edge) to cut handshake round-trip distance"],
    tricks: ["When latency complaints are about 'the first request', suspect DNS/TCP/TLS setup cost before suspecting app code", "When asked to design real-time push, default to WebSocket but name SSE/long-polling as the fallback for restrictive networks"],
    memoryAids: ["DNS -> TCP -> TLS -> HTTP, in that order, each a round trip", "HTTP/1.1 many connections, HTTP/2 one connection many streams, WebSocket one connection many pushes"],
    interviewPatterns: ["'Why is the first request slow but not the rest?' -> DNS/TCP/TLS handshake cost, fixed by edge termination and keep-alive", "'How would you support real-time updates?' -> WebSocket with SSE/long-poll fallback, and the connection-memory scaling implication"],
    references: [
      { source: "note", attribution: "HTTP/1.1, HTTP/2, HTTP/3 (QUIC), and WebSocket protocol fundamentals", insight: "Transport choice changes the scaling bottleneck from request throughput to concurrent connection memory, or vice versa." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-networking-global-latency", "hld-networking-chat-polling-to-websocket"]
  },

  {
    id: "topic-hld-api-design-patterns",
    moduleId: "mod-hld-foundations",
    title: "API Design Patterns (REST, GraphQL, gRPC, Rate Limiting)",
    intuition: "The API is the contract between client and system; choosing REST vs GraphQL vs gRPC, and adding pagination/rate limiting/versioning, determines how the system evolves and survives abuse.",
    lesson: [
      {
        title: "REST, GraphQL, and gRPC trade-offs",
        content: "REST models resources with URLs and HTTP verbs; it is simple, cacheable, and universally supported, but can cause over-fetching (extra fields) or under-fetching (multiple round trips for related data). GraphQL lets the client specify exactly the fields and nested relations it needs in one request, fixing over/under-fetching, at the cost of harder caching and more complex query-cost control on the server. gRPC uses HTTP/2 and protocol buffers for compact, strongly-typed, fast internal service-to-service calls with native streaming, but is less browser-friendly and harder to debug ad hoc than REST/JSON.",
        codeExample: "REST: GET /users/42/posts -> fixed shape, cache-friendly\\nGraphQL: query { user(id:42){ name posts{ title } } } -> client picks exact shape, one round trip\\ngRPC: rpc GetUser(UserRequest) returns (UserReply) -> typed, binary, HTTP/2, ideal service-to-service"
      },
      {
        title: "Pagination, versioning, and idempotency",
        content: "Public list endpoints need cursor-based pagination (opaque cursor pointing to the last seen item) rather than offset-based pagination, because offsets shift and duplicate/skip rows when the underlying data changes concurrently. APIs need an explicit versioning strategy (URL path /v2/, header, or field) so breaking changes do not silently break existing clients. Any retried write (POST that creates a resource) should accept an idempotency key so a network retry does not create a duplicate side effect.",
        codeExample: "GET /posts?cursor=abc123&limit=20 -> stable under concurrent inserts\\nPOST /payments  Idempotency-Key: <uuid> -> retry-safe, same key = same result, no double charge"
      },
      {
        title: "Rate limiting and abuse protection",
        content: "Rate limiting protects the system from a single client (or bug, or bot) overwhelming shared capacity. Token bucket allows bursts up to a bucket size while enforcing a steady average rate; sliding window log/counter is more precise but more memory-heavy; fixed window is simplest but allows a burst at window boundaries. Rate limit state is typically kept in a fast shared store (Redis) so limits apply consistently across many stateless API servers.",
        codeExample: "Token bucket: capacity=100, refill=10/sec -> allows short bursts, then throttles to steady rate\\n429 Too Many Requests + Retry-After header on limit exceeded\\nlimiter state in Redis, keyed by API key/user/IP, shared across all app instances"
      }
    ],
    examples: [
      {
        title: "Fixing a mobile app's over-fetching problem",
        input: "A mobile app calls GET /users/42 (returns 40 fields) just to show a name and avatar, then calls GET /users/42/posts separately, then GET /posts/{id}/comments for each post - 3+ round trips and excess payload on a slow mobile network",
        output: "Switching the mobile client's read path to a GraphQL query that requests exactly {name, avatarUrl, posts{title, commentCount}} cuts it to one round trip and a payload close to what is actually rendered",
        explanation: "Step 1: Diagnose the two REST problems separately: over-fetching (40 fields returned, 2 used) and under-fetching (needing follow-up calls for nested data). Step 2: Introduce a GraphQL layer (can sit in front of the same REST/service backend) so the client declares the exact shape it needs in a single request. Step 3: Add query complexity limits and persisted queries on the server so a malicious or buggy client cannot request unbounded nested data. Step 4: Keep REST for simple, cacheable, public endpoints where its simplicity is an asset, and use GraphQL specifically where the client's data shape varies a lot."
      },
      {
        title: "Rate limiting a public API against a scraping bot",
        input: "A public search API is getting 50x normal traffic from a single API key scraping results",
        output: "A Redis-backed token bucket limiter throttles that key to its configured rate, returning 429 with a Retry-After header, while other clients are unaffected",
        explanation: "Step 1: Identify the correct limiter key (per API key, not per IP, since one key could rotate IPs). Step 2: Use a token bucket in Redis shared across all API server instances so the limit is enforced consistently regardless of which server handles a given request. Step 3: Return 429 with a Retry-After header so well-behaved clients back off automatically. Step 4: Log and alert on repeated 429s from the same key to catch abuse patterns early, and consider a stricter tier or manual review for that key."
      }
    ],
    tips: ["Use cursor-based pagination for anything with concurrent writes, offsets silently corrupt under churn", "Idempotency keys are mandatory for retried write endpoints (payments, order creation)", "GraphQL solves over/under-fetching but needs query-cost limits to stay safe", "Rate limit state must live in a shared store (Redis) across stateless API servers, not in-process memory"],
    tricks: ["When asked 'REST or GraphQL', answer with the concrete over/under-fetching trade-off and when each wins, not a preference", "Mention token bucket specifically when asked to design rate limiting, and justify it over fixed window with the burst-at-boundary flaw"],
    memoryAids: ["REST = fixed shape, cacheable; GraphQL = client-picked shape, one round trip; gRPC = fast typed internal calls", "Cursor > offset for pagination under concurrent writes", "Idempotency key = safe retries, no duplicate side effects"],
    interviewPatterns: ["'How do you protect this API from abuse?' -> rate limiting algorithm choice + where the limiter state lives", "'How would this endpoint handle a network retry?' -> idempotency key design"],
    references: [
      { source: "note", attribution: "REST, GraphQL, gRPC, and API rate-limiting patterns", insight: "The right API style and safeguards depend on client data-shape variability and abuse risk, not a single universal best choice." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-api-graphql-overfetching", "hld-api-rate-limit-scraper"]
  },

  {
    id: "topic-hld-database-deep-dive",
    moduleId: "mod-hld-foundations",
    title: "Databases Deep Dive: SQL vs NoSQL, Indexing, Replication",
    intuition: "The database choice and its indexing/replication strategy usually decide whether a design survives scale, not the application code on top of it.",
    lesson: [
      {
        title: "SQL vs NoSQL, the real decision criteria",
        content: "Choose based on data shape and access pattern, not popularity. Relational (SQL) databases give strong schema guarantees, joins, and ACID transactions, and fit data with complex relationships and multi-row invariants (orders, payments, inventory). Document/key-value/wide-column NoSQL stores trade some of that for horizontal write scalability and flexible schema, and fit data accessed mostly by a single key with high write volume (session state, event logs, user activity feeds). Many real systems use both: SQL for the transactional core, NoSQL for high-volume derived or denormalized data.",
        codeExample: "Orders + inventory + payments -> relational (ACID, joins, invariants)\\nSession state, activity feed, IoT events -> NoSQL (key-based access, high write throughput, flexible schema)"
      },
      {
        title: "Indexing trade-offs",
        content: "An index (typically a B-tree, or a hash index for pure equality lookups) speeds up reads on the indexed columns but slows down writes (every insert/update must also update the index) and costs storage. Composite indexes must match the query's leading columns to be used. Over-indexing a write-heavy table is a common real-world mistake that silently degrades write throughput.",
        codeExample: "CREATE INDEX idx_user_created ON orders(user_id, created_at)\\nquery WHERE user_id=? ORDER BY created_at -> uses index directly\\nquery WHERE created_at=? alone -> index not used (created_at is not the leading column)"
      },
      {
        title: "Replication types and their trade-offs",
        content: "Leader-follower (primary-replica) replication sends all writes to one primary and fans them out to read replicas, which scales reads but the primary remains a write bottleneck and a failover point. Multi-leader replication allows writes to multiple nodes (useful for multi-region write locality) but requires conflict resolution when the same record is edited concurrently in two places. Leaderless/quorum replication (e.g. Dynamo-style) tolerates node failure gracefully by requiring a read/write quorum instead of a single leader.",
        codeExample: "Leader-follower: 1 writer, N read replicas -> simple, but write bound to one node\\nMulti-leader: writes accepted in multiple regions -> needs conflict resolution (LWW, CRDTs, app-level merge)\\nQuorum (Dynamo-style): write to W nodes, read from R nodes, W+R>N guarantees overlap"
      }
    ],
    examples: [
      {
        title: "Choosing a store for a write-heavy activity feed",
        input: "A social app needs to store 500K activity events/sec (likes, follows, views) with simple per-user timeline reads, and the relational primary is falling behind on writes",
        output: "Activity events move to a wide-column/NoSQL store partitioned by user ID, keeping the relational database only for account and payment data",
        explanation: "Step 1: Recognize that activity events are high-volume, single-key-access, and do not need cross-row transactional guarantees, which is exactly the profile NoSQL is built for. Step 2: Partition the NoSQL store by user ID so a user's timeline reads hit one partition. Step 3: Keep account/payment data in the relational database because those need ACID invariants (e.g. balance never goes negative). Step 4: This polyglot-persistence approach is the concrete, defensible answer instead of picking one database for everything."
      },
      {
        title: "An index that silently hurt write throughput",
        input: "A team added 6 indexes to a frequently-written orders table to speed up 6 different report queries, then write latency doubled",
        output: "The team keeps only the 1-2 indexes that serve hot, latency-sensitive queries and moves the reporting queries to a read replica or a separate analytics store instead",
        explanation: "Step 1: Diagnose that every index adds write amplification (each insert/update touches every index), which explains the doubled write latency. Step 2: Rank indexes by how latency-sensitive their queries are; drop or replace low-value indexes. Step 3: Route infrequent, latency-tolerant reporting queries to a read replica or a dedicated analytics/warehouse copy so they never compete with the hot write path. Step 4: This shows the trade-off explicitly: indexes are not free, they are a read/write latency trade you must budget deliberately."
      }
    ],
    tips: ["Pick SQL vs NoSQL by data shape and access pattern, not by trend", "Every index speeds a matching read but slows every write; budget indexes deliberately", "Leader-follower is the default; reach for multi-leader/quorum only when you truly need multi-region writes or extreme availability", "Polyglot persistence (multiple databases for different data shapes) is normal at scale, not a smell"],
    tricks: ["When asked 'SQL or NoSQL', ask about the access pattern and invariants first, then justify the pick with those specifics", "Mention write amplification explicitly whenever indexing comes up, it is the detail that separates a strong answer"],
    memoryAids: ["SQL: relationships + invariants. NoSQL: single-key + write scale.", "Index = faster read, slower write, more storage - always a trade, never free", "W + R > N = quorum guarantees an overlapping node between any write and read set"],
    interviewPatterns: ["'Would you use SQL or NoSQL here?' -> justify with access pattern and invariants, not a blanket preference", "'How would you speed up this query?' -> propose an index, but immediately name its write-side cost"],
    references: [
      { source: "book", attribution: "Designing Data-Intensive Applications (Kleppmann)", insight: "Database choice and replication strategy should follow from data shape, access pattern, and required guarantees." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-db-polyglot-activity-feed", "hld-db-index-write-amplification"]
  },

  {
    id: "topic-hld-distributed-coordination",
    moduleId: "mod-hld-estimation-tradeoffs",
    title: "Distributed Systems Coordination: Consensus & Leader Election",
    intuition: "When multiple nodes must agree on one truth (who is the leader, what is the next committed value) despite crashes and network delay, you need a consensus protocol, not ad hoc locking.",
    lesson: [
      {
        title: "Why naive coordination fails",
        content: "A naive 'whoever grabs the lock first is the leader' scheme breaks under network partitions: a node can believe it still holds leadership (its lease has not expired locally) while another node has already been elected, producing two active leaders (split brain) that both accept writes and corrupt data. Consensus protocols like Raft and Paxos exist specifically to guarantee only one value/leader is agreed upon even when messages are delayed or nodes crash.",
        codeExample: "naive: node holds local lock -> assumes leadership until told otherwise -> partition -> TWO nodes think they're leader -> split brain, conflicting writes"
      },
      {
        title: "How Raft-style consensus works, at a practical level",
        content: "Raft nodes are Follower, Candidate, or Leader. A follower that stops hearing from a leader (election timeout) becomes a candidate and requests votes; it becomes leader only after receiving a majority (quorum) of votes. The leader replicates every write to a majority of followers before acknowledging it as committed. Because a majority is required both to elect a leader and to commit a write, two disjoint majorities can never both exist at once, which is exactly what prevents split brain.",
        codeExample: "Follower -> (election timeout) -> Candidate -> requests votes -> majority granted -> Leader\\nLeader: client write -> replicate to majority -> commit -> ack client\\nmajority-based: any two majorities out of N nodes must overlap by at least 1 node -> no two independent leaders"
      },
      {
        title: "Where this shows up in real systems",
        content: "You rarely implement Raft/Paxos yourself; you use a coordination service that already implements it, like ZooKeeper, etcd, or Consul, for leader election, distributed locks, configuration, and service discovery. In an interview, name the coordination service and what it is used for (e.g. 'etcd holds the leader lease for the primary database controller') rather than describing the consensus algorithm internals unless asked to go deeper.",
        codeExample: "etcd/ZooKeeper/Consul -> leader election, distributed lock, service registry, config store\\nKafka partition leader election, Kubernetes control-plane leader election both rely on this pattern"
      }
    ],
    examples: [
      {
        title: "Preventing split-brain in a database failover controller",
        input: "A database cluster's failover controller must ensure exactly one node is ever the writable primary, even during a network partition between data centers",
        output: "The controller uses a consensus-backed lease (via etcd/ZooKeeper) so only the node holding a quorum-granted lease can accept writes; a partitioned minority node cannot renew its lease and steps down",
        explanation: "Step 1: Recognize that a purely local health check ('I think I'm healthy, so I'll keep writing') cannot detect a network partition from the isolated node's own point of view. Step 2: Use a consensus store where the lease/leadership token can only be renewed by contacting a quorum of nodes. Step 3: A node isolated in the minority side of a partition cannot reach quorum, so its lease expires and it must stop accepting writes, even though it feels healthy locally. Step 4: This is the concrete mechanism (quorum-based lease) that prevents two primaries from accepting conflicting writes."
      },
      {
        title: "Leader election for a job scheduler",
        input: "Three scheduler instances run for redundancy, but only one should actually dispatch jobs at a time to avoid duplicate execution",
        output: "The instances use etcd's leader-election recipe: each attempts to acquire a lease-backed key, the winner dispatches jobs and periodically renews its lease, and if it crashes, its lease expires and another instance wins",
        explanation: "Step 1: All three instances are always running (for fast failover) but only the lease holder is active, avoiding both a SPOF and duplicate job dispatch. Step 2: The lease has a short TTL and must be renewed via heartbeats; if the leader crashes or is partitioned, it stops renewing and the lease expires. Step 3: A remaining instance acquires the now-free lease and becomes the new active leader within one TTL window. Step 4: This gives sub-second to few-second failover without any manual intervention, and without risking two schedulers dispatching the same job twice."
      }
    ],
    tips: ["Split brain happens when local health checks are trusted instead of quorum-based agreement", "You almost never implement Raft/Paxos yourself, use etcd/ZooKeeper/Consul", "Any two majorities out of N nodes always overlap by at least one node, that overlap is what prevents split brain", "Leases need a TTL and heartbeat renewal; the TTL is your failover time bound"],
    tricks: ["When 'how do you guarantee only one leader?' comes up, answer with quorum-based lease + coordination service, and explain why local self-health-checks cannot solve it alone", "Name a concrete coordination service (etcd/ZooKeeper/Consul) rather than only the abstract algorithm name"],
    memoryAids: ["Majority in, majority out: elections and commits both need quorum, so two disjoint quorums can't both exist", "Lease TTL = your failover time bound"],
    interviewPatterns: ["'How do you avoid two masters/leaders at once?' -> quorum-based leader election via a coordination service", "'What is your failover time?' -> tie it explicitly to the lease TTL and heartbeat interval"],
    references: [
      { source: "note", attribution: "Raft Consensus Algorithm (Ongaro & Ousterhout) and ZooKeeper/etcd leader-election patterns", insight: "Quorum-based agreement, not local health checks, is what prevents split-brain leadership in a distributed system." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-consensus-db-failover-splitbrain", "hld-consensus-scheduler-leader-election"]
  }
];
