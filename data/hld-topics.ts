import { Topic, Reference } from "./syllabus";

export const hldTopics: Topic[] = [
  // ===== FOUNDATIONS (2 Topics) =====
  {
    id: "topic-hld-scale-components",
    moduleId: "mod-hld-foundations",
    title: "Scaling & Core Components",
    intuition: "Build systems for millions of requests: load balancing, caching, databases, queues, CDN.",
    lesson: [
      {
        title: "Core Architecture Components",
        content: "Load Balancer: Distribute traffic (round-robin, least-connections). Cache: In-memory store for frequent data (Redis). Database: Persistent storage (SQL/NoSQL). Queue: Async task processing. CDN: Geographic content replication.",
        codeExample: "Architecture layers:\nClient â CDN (static content) â Load Balancer â [Server Pool]\n       â (cache miss)     â (cache miss)\n      Cache Layer        Database\n       â_________________â\n  Message Queue (async tasks)",
        diagram: undefined
      },
      {
        title: "Caching Strategy",
        content: "Cache hot data (frequently accessed). Use TTL (time-to-live) for stale data or event-driven invalidation. LRU eviction when full. Balance freshness vs efficiency.",
        codeExample: "// Cache invalidation strategies\n1. TTL: Cache expires after 5 minutes. Simple but stale data possible.\n2. Event-driven: User updates, cache invalidated immediately. Complex but fresh.\n3. Hybrid: TTL + manual invalidation on critical updates.",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "URL Shortener Traffic Pattern",
        input: "Millions of redirect requests daily. Few new short URLs created.",
        output: "Cache hot redirects (redirect is read-heavy)",
        explanation: "Step 1: Request comes for redirect. Step 2: Check cache (hot path in cache). Step 3: Cache hit â instant redirect. Step 4: Cache miss â fetch from DB, update cache. Step 5: Write new short URL to DB (cache-aside pattern).",
        diagram: undefined
      }
    ],
    tips: ["Load balancer: Single point of failure. Use multiple LBs", "Database sharding: Distribute by user ID, timestamp, etc.", "Cache invalidation is the hardest problem in CS (Phil Karlton quote)"],
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
        title: "Consistency Models",
        content: "Strong consistency (ACID): All readers see same data immediately. Weak consistency (eventual): Temporary inconsistency, converges. Choose based on use case: banking (strong), social (weak OK).",
        codeExample: "ACID: Write â Commit â All readers see new data\nEventual Consistency: Write â Replicate (async) â Readers might see old data temporarily",
        diagram: undefined
      },
      {
        title: "Reliability & Replication",
        content: "Replicate data across servers/zones for availability. Primary-Secondary: Primary writes, secondaries read (replication lag). Failover: Promote secondary if primary dies.",
        codeExample: "Master-Slave replication:\n1. Write to Master\n2. Master sends change log to Slaves (async)\n3. Slaves apply changes\n4. If Master fails, promote a Slave as new Master\n5. Handle: sync vs async replication tradeoffs",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Social Media Post Consistency",
        input: "User posts. Friends immediately see post? Or eventual?",
        output: "Eventual consistency: Post visible to most friends in seconds",
        explanation: "Primary writes post to master DB. Post queued for replication to replicas across zones. Most friends read from replicas and see post within seconds. Temporary inconsistency acceptable for social features.",
        diagram: undefined
      }
    ],
    tips: ["Banking: Strong consistency (ACID critical)", "Social/Analytics: Eventual consistency OK", "Replication: Sync (slower, safer) vs Async (faster, risky)"],
    references: [{ source: "blog", attribution: "CAP Theorem", insight: "Consistency, Availability, Partition tolerance - pick two." }],
    practiceProblems: []
  },

  // ===== DESIGN EXERCISES (8 Topics) =====
  {
    id: "topic-hld-url-shortener",
    moduleId: "mod-hld-design-exercises",
    title: "URL Shortener (tinyurl.com style)",
    intuition: "Convert long URLs to short codes, redirect on access. Heavy reads (redirects), few writes (new URLs).",
    lesson: [
      {
        title: "Core Requirements",
        content: "Shorten URL: Long URL â short code (6-8 chars). Redirect: Short code â long URL with 301 redirect. Scale: Millions of unique URLs, billions of daily redirects.",
        codeExample: "// Shorten\nPOST /shorten\nBody: { longUrl: \"https://example.com/very/long/path\" }\nResponse: { shortCode: \"abc123\" }\n\n// Redirect\nGET /abc123\nResponse: 301 Moved Permanently â https://example.com/very/long/path",
        diagram: undefined
      },
      {
        title: "Architecture for Scale",
        content: "Cache hot redirects (redirects are 99% of traffic). Use consistent hashing for load balancing across shortener services. Primary-secondary DB for writes (shortening) and reads (redirects).",
        codeExample: "Service design:\n1. Shortener service: Takes long URL, generates unique code\n2. Redirect service: Given code, fetch long URL from cache/DB\n3. Cache (Redis): Stores shortCode â longUrl for hot URLs\n4. Database: Persistent store for all mappings\n5. Analytics: Log redirects (async via queue)",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Generating Unique Short Codes",
        input: "Need 6-character codes for 1 billion URLs",
        output: "Base62 encoding (a-z, A-Z, 0-9) gives ~52^6 = 56 billion possibilities",
        explanation: "Step 1: Assign unique ID (1, 2, 3, ...). Step 2: Convert ID to Base62 (1â'1', 62â'10', 3844â'zz'). Step 3: Store mapping. Step 4: On redirect, convert code back to ID, lookup long URL.",
        diagram: undefined
      }
    ],
    tips: ["Cache is critical (99% hits for popular URLs)", "Use 301 redirects (permanent) or 302 (temporary) based on policy", "Handle collision when generating codes", "Consider custom aliases (vanity URLs)"],
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
        title: "Feed Generation",
        content: "Option 1 (Push): On post, push to all followers' feeds (precomputed). Fast reads, slow writes, storage intense. Option 2 (Pull): On view, fetch posts from all followed users. Fast writes, slow reads. Hybrid: Push for active users, pull for inactive.",
        codeExample: "Push model:\nUser posts â Message queue â Workers push to followers' feed caches\nUser reads â Fetch from their feed cache\n\nPull model:\nUser posts â Store in user timeline\nUser reads â Query all followed users' timelines, merge, sort by time",
        diagram: undefined
      },
      {
        title: "Handling Scale",
        content: "Shard users by ID (consistent hashing). Shard feeds by user. Cache recent posts. Use async queues for notifications and feed updates. Track follower relationships efficiently.",
        codeExample: "Scaling strategies:\n1. Shard users across servers\n2. Cache recent feed items (LRU, TTL)\n3. Async queue for non-critical updates\n4. Graph database or sharded cache for follower graph",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Feed Timeline Generation",
        input: "User follows 500 people. View feed.",
        output: "Top 20 posts from followed users sorted by timestamp",
        explanation: "Pull model: Query last 100 posts from each of 500 followed users. Merge, sort by time, return top 20. Cache this result. If new post from any followed user, invalidate cache.",
        diagram: undefined
      }
    ],
    tips: ["Push good for active users, pull for inactive", "Cache is critical (billions of feed views daily)", "Graph database (Neo4j) for follower relationships", "Async processing for non-critical tasks"],
    references: [{ source: "interview-experience", attribution: "Facebook System Design", insight: "Feed generation at Facebook's scale is massive engineering challenge." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-messaging-chat",
    moduleId: "mod-hld-design-exercises",
    title: "Messaging / Chat System",
    intuition: "Real-time messaging between users. Billions of users, millions concurrent. Ensure messages delivered reliably.",
    lesson: [
      {
        title: "Message Flow",
        content: "Sender â Server â Queue â Receivers' devices. Use WebSocket for real-time connection. Queue ensures delivery even if receiver offline. Store messages in DB for history.",
        codeExample: "Architecture:\n1. WebSocket connection: Persistent TCP connection to server\n2. Sender sends message â Server receives\n3. Message queued + stored in DB\n4. Server sends to receiver's WebSocket (if online)\n5. If offline, message delivered when online\n6. Message history queries fetch from DB",
        diagram: undefined
      },
      {
        title: "Scaling for Concurrency",
        content: "Use multiple message servers with load balancing. Consistent hashing maps users to servers (minimize reconnections on server failure). Message queue (Kafka) ensures ordering and delivery.",
        codeExample: "Scaling:\n1. Load balancer â Multiple message servers\n2. Consistent hashing: user_id â message_server\n3. Kafka queue: ordered, replayable message log\n4. DB (sharded by user_id) stores messages\n5. Cache (Redis) for presence/status",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "User-to-User Message Delivery",
        input: "User A sends message to User B. B is online.",
        output: "Message delivered via WebSocket within milliseconds",
        explanation: "Step 1: A connects to message server via WebSocket. Step 2: A sends message, server validates. Step 3: Message stored in DB. Step 4: Server looks up B's connected server (via consistent hash). Step 5: Message sent to B's WebSocket. Step 6: B receives message.",
        diagram: undefined
      }
    ],
    tips: ["WebSocket for low-latency real-time messaging", "Queue for reliability if receiver offline", "Message ordering is critical (Kafka)", "Presence/typing indicators via cache"],
    references: [{ source: "interview-experience", attribution: "Whatsapp HLD", insight: "Messaging at scale requires reliable queue and presence system." }],
    practiceProblems: []
  },

  {
    id: "topic-hld-notification-system",
    moduleId: "mod-hld-design-exercises",
    title: "Notification System (Email, SMS, Push)",
    intuition: "Send millions of notifications daily. Prioritize (alerts urgent), rate-limit, track delivery.",
    lesson: [
      {
        title: "Multi-Channel Notifications",
        content: "Queue notifications by priority. Workers pick from queue and send via channel (email, SMS, push). Each channel has provider (SendGrid, Twilio, Firebase). Track delivery status (sent, delivered, failed).",
        codeExample: "Flow:\n1. Event triggered (user posts, comment, etc.)\n2. Notification queued with priority\n3. Workers consume queue\n4. Route to channel: email â SendGrid, SMS â Twilio, push â Firebase\n5. Retry failed deliveries\n6. Log delivery status for analytics",
        diagram: undefined
      },
      {
        title: "Reliability & Rate Limiting",
        content: "Use dead-letter queue for failed deliveries. Implement retry with exponential backoff. Rate limit per user (don't spam). Track delivery status for accountability.",
        codeExample: "Error handling:\n1. First attempt fails\n2. Retry after 5 seconds\n3. Second retry after 25 seconds (exponential backoff)\n4. After N retries, move to dead-letter queue\n5. Manual intervention or analysis for dead-letter messages",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "High-Priority Alert Notification",
        input: "Security alert: unusual login detected. Send immediately via email and push.",
        output: "Alert delivered within seconds via multiple channels",
        explanation: "Step 1: Security system detects unusual login. Step 2: Notification created with HIGH priority. Step 3: Workers pick high-priority first. Step 4: Send via email and push simultaneously. Step 5: Track delivery. Step 6: Retry if failed.",
        diagram: undefined
      }
    ],
    tips: ["Priority queue for critical notifications", "Rate limiting per user per hour", "Multi-channel for reliability", "Dead-letter queue for manual intervention"],
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
        title: "Core Components",
        content: "Location service: Track driver locations (geo-spatial DB). Matching engine: Find nearby drivers. Pricing: Calculate fare based on distance, surge. Payments: Process trip charges.",
        codeExample: "Architecture:\n1. Driver app: Periodically updates location (every 5-10 seconds)\n2. Geo-spatial DB (Redis GEO, PostGIS): Stores location indexes\n3. Matching engine: Given rider location, query nearby drivers\n4. WebSocket: Real-time updates (driver location, rider status)\n5. Pricing: distance Ã base_rate Ã surge_multiplier",
        diagram: undefined
      },
      {
        title: "Surge Pricing & Concurrency",
        content: "Monitor supply-demand ratio. Increase price during high demand (more driver incentive). Handle concurrent ride requests (multiple riders, same driver).",
        codeExample: "Surge pricing:\nsurge_multiplier = total_demand / available_supply\nfare = distance Ã base_rate Ã surge_multiplier\n\nConcurrency:\n1. Multiple riders request from same driver\n2. Driver accepts first rider\n3. Other riders get: \"Driver not available\"\n4. System re-matches them to other drivers",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Rider Request Matching",
        input: "Rider in downtown area requests ride. 50 drivers nearby.",
        output: "Match to closest driver with optimal ETA",
        explanation: "Step 1: Rider sends request with location. Step 2: Query geo-DB for drivers within 5 km. Step 3: Filter by driver status (available). Step 4: Sort by distance or ETA. Step 5: Offer to closest driver. Step 6: If accepted, confirm. If rejected, try next driver.",
        diagram: undefined
      }
    ],
    tips: ["Geo-spatial indexing critical for performance", "Eventual consistency for driver location OK", "Queue matching requests to handle surge", "Multi-attempt matching (backup drivers)"],
    references: [{ source: "interview-experience", attribution: "Uber System Design", insight: "Geo-spatial data structure and real-time matching at scale." }],
    practiceProblems: []
  }
];
