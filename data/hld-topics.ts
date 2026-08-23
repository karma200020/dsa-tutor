import { Topic, Reference } from "./syllabus";

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
  }
];
