// CURATED SYSTEM DESIGN CONTENT - From Top Resources
// Combines insights from: System Design Primer, Grokking, ByteByteGo, DesignGurus, AlgoMaster, NeetCode

export interface CuratedSystemDesignTopic {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  estimatedTime: number; // minutes
  concepts: string[];
  dataFromSources: {
    systemDesignPrimer?: string;
    grokking?: string;
    bytebytego?: string;
    designgurus?: string;
    algomaster?: string;
    neetcode?: string;
  };
  keyTakeaways: string[];
  commonMistakes: string[];
  companyFrequency: Record<string, "Very High" | "High" | "Medium" | "Low">;
  practiceProblems: string[];
  videoResources?: string[];
  readingMaterials?: string[];
}

export const curatedSystemDesignTopics: CuratedSystemDesignTopic[] = [
  // ============================================
  // TIER 1: FOUNDATIONAL CONCEPTS
  // ============================================
  {
    id: "concept-scalability-101",
    title: "Scalability Fundamentals - Vertical vs Horizontal",
    difficulty: "Beginner",
    estimatedTime: 30,
    concepts: [
      "Vertical scaling: More power to single machine",
      "Horizontal scaling: More machines",
      "Trade-offs: Cost, Complexity, Limits",
      "Approach selection based on problem"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Foundational concept. Vertical scaling has hardware limits. Horizontal scales to infinity but complexity increases.",
      bytebytego:
        "Visual comparison of scaling strategies. Key insight: Choose based on bottleneck (CPU, memory, I/O)",
      grokking:
        "Discusses when to use each. Vertical for simplicity initially, horizontal for massive scale."
    },
    keyTakeaways: [
      "Vertical: Simple, fast to implement, hardware ceiling",
      "Horizontal: Complex, scales infinitely, latency/consistency challenges",
      "Hybrid: Often best (cache layer, read replicas, CDN)"
    ],
    commonMistakes: [
      "Assuming vertical scaling can solve everything (hardware limits)",
      "Over-engineering horizontal scaling for small systems",
      "Not considering network latency in distributed systems"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "High",
      Microsoft: "High",
      Netflix: "Very High"
    },
    practiceProblems: [
      "Design URL Shortener",
      "Design Twitter",
      "Design Instagram Feed"
    ],
    readingMaterials: [
      "System Design Primer - Scalability Section",
      "ByteByteGo - Scaling Fundamentals"
    ]
  },

  {
    id: "concept-load-balancing",
    title: "Load Balancing Strategies & Algorithms",
    difficulty: "Intermediate",
    estimatedTime: 45,
    concepts: [
      "Round Robin",
      "Least Connections",
      "IP Hash / Consistent Hashing",
      "Weighted Round Robin",
      "Random",
      "Least Response Time",
      "Layer 4 vs Layer 7 Load Balancing"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Detailed comparison of each strategy with trade-offs. Health checks, sticky sessions crucial.",
      bytebytego:
        "Visual animations showing how each algorithm distributes traffic. Common mistakes highlighted.",
      grokking: "Discusses when to use each based on use case (stateless vs stateful services)"
    },
    keyTakeaways: [
      "Round Robin: Simple but poor with varying load",
      "Least Connections: Better for long-lived connections",
      "Consistent Hash: Best for cache/sharding (minimize rehashing)",
      "Layer 7 better for content-based routing but higher latency"
    ],
    commonMistakes: [
      "Using sticky sessions everywhere (breaks scalability)",
      "Not handling server failures (health checks critical)",
      "Not considering connection types (TCP vs UDP implications)"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "High",
      Netflix: "High",
      Microsoft: "High"
    },
    practiceProblems: [
      "Design Load Balancer",
      "Design Consistent Hashing System",
      "Handle Server Failures in Distributed System"
    ]
  },

  {
    id: "concept-caching-strategies",
    title: "Caching Patterns - Cache Aside vs Write-Through vs Write-Behind",
    difficulty: "Intermediate",
    estimatedTime: 50,
    concepts: [
      "Cache-Aside (Lazy Loading)",
      "Write-Through",
      "Write-Behind (Write-Back)",
      "Refresh-Ahead",
      "CDN Caching",
      "Cache Invalidation",
      "Cache Eviction Policies (LRU, LFU, FIFO)"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Phil Karlton quote: 'Two hard things in computer science: cache invalidation and naming things'",
      bytebytego:
        "Comprehensive comparison with diagrams. Shows real-world examples for each pattern.",
      designgurus:
        "Practical guide with trade-offs. Cache stampede, thundering herd prevention techniques."
    },
    keyTakeaways: [
      "Cache-Aside: Most common. Load on miss, but consistency on write.",
      "Write-Through: Slow but consistent. Good for critical data.",
      "Write-Behind: Fast writes but consistency risk. Best for non-critical data.",
      "Cache invalidation is hard - TTL, event-based, or manual invalidation"
    ],
    commonMistakes: [
      "Not handling cache misses (stampede = multiple DB hits)",
      "Wrong cache key design",
      "Over-caching (stale data problems)",
      "Not considering cache eviction policy for use case"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "Very High",
      Netflix: "Very High",
      Microsoft: "High"
    },
    practiceProblems: [
      "Design Distributed Cache (Redis)",
      "Design LRU Cache",
      "Handle Cache Invalidation in Feed System"
    ],
    videoResources: ["ByteByteGo Caching Patterns video"]
  },

  {
    id: "concept-database-design",
    title: "SQL vs NoSQL - When to Use Each?",
    difficulty: "Intermediate",
    estimatedTime: 60,
    concepts: [
      "ACID properties",
      "BASE properties",
      "Relational databases",
      "Key-Value stores",
      "Document databases",
      "Wide-column databases",
      "Graph databases",
      "Consistency models (Strong, Eventual, Weak)"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Decision matrix: Structured data, complex queries â SQL. Horizontal scale, flexible schema â NoSQL",
      grokking:
        "Practical examples: Users table â SQL, Session cache â Key-Value, User documents â Document DB",
      bytebytego:
        "Myths and reality of SQL vs NoSQL. Shows when SQL shines (joins, transactions) vs NoSQL (scale, flexibility)"
    },
    keyTakeaways: [
      "SQL: Strong consistency, ACID, complex queries, joins. Scales vertically.",
      "NoSQL KV: Speed, horizontal scale, simple queries. Eventual consistency.",
      "NoSQL Document: Flexible schema, JSON-like, moderate complexity.",
      "NoSQL Graph: Relationship queries, social networks, recommendations.",
      "NoSQL Wide-column: Time-series, analytics, sparse data."
    ],
    commonMistakes: [
      "Forcing all data into one database type",
      "Not considering consistency requirements",
      "Over-normalizing (SQL) leading to slow queries",
      "Under-normalizing (NoSQL) leading to duplication and update problems"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "Very High",
      Microsoft: "Very High",
      Netflix: "Very High"
    },
    practiceProblems: [
      "Design Database Schema for URL Shortener",
      "Design Database for Social Media (SQL/NoSQL combo)",
      "Design Time-Series Database"
    ]
  },

  {
    id: "concept-sharding-partitioning",
    title: "Database Sharding & Partitioning Strategies",
    difficulty: "Advanced",
    estimatedTime: 60,
    concepts: [
      "Range-based sharding",
      "Hash-based sharding",
      "Directory-based sharding",
      "Consistent hashing",
      "Rebalancing strategies",
      "Shard key selection",
      "Query routing",
      "Joins across shards"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Details of three sharding approaches with trade-offs. Key insight: Poor shard key choice ruins system.",
      grokking:
        "Real examples: User ID hashing, Twitter's approach, challenges with hotspots",
      designgurus:
        "Advanced: handling shard key changes, migrating data, dealing with celebrity users (hotspots)"
    },
    keyTakeaways: [
      "Range sharding: Simple, but leads to hotspots (e.g., recent timestamps)",
      "Hash sharding: Even distribution but makes range queries hard",
      "Consistent hashing: Minimal reshuffling on shard addition/removal",
      "Shard key is critical: Wrong choice ruins scalability"
    ],
    commonMistakes: [
      "Choosing bad shard key (causes data skew/hotspots)",
      "Not having rebalancing strategy",
      "Cross-shard joins (performance nightmare)",
      "Not testing redistribution logic"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "Very High",
      Netflix: "High",
      Microsoft: "High"
    },
    practiceProblems: [
      "Design Sharding Strategy for User Data",
      "Handle Resharding with Consistent Hashing",
      "Deal with Hotspots in Distributed System"
    ]
  },

  {
    id: "concept-consistency-models",
    title: "Consistency Models: Strong vs Eventual vs Weak",
    difficulty: "Advanced",
    estimatedTime: 45,
    concepts: [
      "Strong Consistency",
      "Eventual Consistency",
      "Weak Consistency",
      "Consistency hashing",
      "Quorum-based consistency",
      "CAP theorem",
      "Availability vs Consistency trade-off"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "CAP Theorem explained. You can have 2 of 3: Consistency, Availability, Partition tolerance.",
      bytebytego:
        "Real examples: Banking (strong), Social media (eventual), Gaming (weak). Trade-off reasoning critical.",
      grokking: "Distributed systems techniques for consistency: Vector clocks, Lamport clocks, Quorum"
    },
    keyTakeaways: [
      "Strong: Every read sees latest write. High latency. Good for financial systems.",
      "Eventual: Reads eventually see writes. Low latency. Good for social systems.",
      "Weak: No guarantee. Lowest latency. Good for real-time comms.",
      "CAP: Pick 2 of 3. Usually Consistency + Partition (choose Availability too when possible)"
    ],
    commonMistakes: [
      "Not explaining why you chose consistency model",
      "Assuming strong consistency is always better",
      "Not considering partition failures in design"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "High",
      Netflix: "High"
    },
    practiceProblems: [
      "Design Feed System - Consistency Trade-off",
      "Handle Network Partition in Payment System"
    ]
  },

  // ============================================
  // TIER 2: SPECIFIC SYSTEMS
  // ============================================
  {
    id: "system-url-shortener-master",
    title: "URL Shortener System - Complete Design",
    difficulty: "Intermediate",
    estimatedTime: 75,
    concepts: [
      "Requirements clarity",
      "URL encoding/decoding (Base62, MD5 hashing)",
      "Database design and sharding",
      "Caching strategy",
      "Redirect service (301 vs 302)",
      "Analytics tracking",
      "Custom URLs"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Detailed step-by-step. Covers generation strategies, sharding by hash, redirect optimization.",
      grokking:
        "45-minute structured approach. Includes back-of-envelope calculations (450GB in 3 years)",
      bytebytego:
        "Visual encoding strategies comparison. Shows Base62 vs Base58 vs MD5 hashing approaches."
    },
    keyTakeaways: [
      "Encode: Generate unique short code. Strategies: Incrementing ID, Hash, Base conversion",
      "Decode: Fast lookup. Cache hot URLs in Redis.",
      "Sharding: By first few characters of short URL or by hash",
      "Use 301 (permanent) redirect - saves bandwidth on repeat requests",
      "Analytics: Track clicks, geography, device type in separate service"
    ],
    commonMistakes: [
      "Using MD5 hash directly (collisions, lengthy)",
      "Not caching hot URLs (celebrity effect)",
      "Bad sharding strategy (hotspots)",
      "Using 302 (temporary) when 301 better (more caching)",
      "Not handling expiration/cleanup"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "High",
      Meta: "High",
      Microsoft: "High"
    },
    practiceProblems: [
      "Implement URL Shortener with Scaling",
      "Add Custom Short URLs",
      "Handle Analytics and Expiration"
    ],
    videoResources: [
      "ByteByteGo URL Shortener video",
      "Grokking course section"
    ]
  },

  {
    id: "system-social-media-feed-master",
    title: "Social Media Feed System - Push vs Pull Model",
    difficulty: "Advanced",
    estimatedTime: 90,
    concepts: [
      "Push model (fanout)",
      "Pull model (timeline query)",
      "Hybrid approach",
      "Feed ranking and personalization",
      "Real-time notifications",
      "Hot user handling (celebrities)",
      "Consistency models for feed"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Discusses push vs pull with pros/cons. Push scales reads better. Pull saves writes.",
      grokking:
        "Real Twitter/Facebook design. Shows how to combine push (regular users) + pull (celebrities)",
      bytebytego:
        "Detailed trade-off analysis. When to use push vs pull. Hybrid optimization for millions of users.",
      designgurus: "Advanced: Feed ranking algorithms, cache warming, dealing with hot users"
    },
    keyTakeaways: [
      "Push: Post immediately to followers' feeds. O(followers) write cost. Fast reads. Problem: celebrities",
      "Pull: Followers query at read time. O(followees) read cost. Slower but handles scale.",
      "Hybrid: Push for normal users, Pull for celebrities. Smart fanout service decides.",
      "Cache: Redis for hot feeds. Invalidate on new posts.",
      "Ranking: Collaborative filtering, recency, engagement, diversity"
    ],
    commonMistakes: [
      "Pure push (celebrity with 10M followers kills system)",
      "Pure pull (slow feed generation at read time)",
      "Bad cache invalidation (stale feeds)",
      "Not handling feed gap (user hasn't checked in days)",
      "Not considering consistency (followers see different order)"
    ],
    companyFrequency: {
      Meta: "Very High",
      Google: "Very High",
      Amazon: "High",
      Netflix: "High"
    },
    practiceProblems: [
      "Design Twitter Feed",
      "Optimize Celebrity User Problem",
      "Implement Feed Ranking Algorithm",
      "Handle Real-time Updates"
    ],
    videoResources: ["ByteByteGo Social Feed video"]
  },

  {
    id: "system-distributed-cache-master",
    title: "Distributed Cache System (Redis/Memcached) - Deep Dive",
    difficulty: "Advanced",
    estimatedTime: 90,
    concepts: [
      "Consistent hashing",
      "Eviction policies (LRU, LFU, FIFO)",
      "Replication and failover",
      "TTL and expiration",
      "Persistence (RDB, AOF)",
      "Pub-Sub and streams",
      "Cluster management"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Deep dive into cache architecture. Master-slave setup, failover strategies",
      bytebytego:
        "Redis data structures explained. When to use String, List, Set, SortedSet, Hash",
      designgurus:
        "Advanced: Hot keys problem, cache penetration, cache stampede solutions"
    },
    keyTakeaways: [
      "Consistent hashing: Minimize remapping on node failure",
      "LRU eviction: Most common. Keep recent data. Problem: cache eviction thrashing",
      "Replication: Master handles writes. Slaves handle reads. Async â eventual consistency",
      "TTL: Auto-expire keys. Balance between freshness and DB load",
      "Persistence: RDB (snapshots) fast, AOF (log) safer",
      "Cluster: Horizontal scale. Sharding across nodes with consistent hashing"
    ],
    commonMistakes: [
      "Not handling hot keys (single node bottleneck)",
      "Cache stampede (many requests on miss)",
      "Not setting appropriate TTL",
      "Memory eviction without considering data importance",
      "Weak replication strategy (losing data on failure)"
    ],
    companyFrequency: {
      Google: "Very High",
      Amazon: "Very High",
      Meta: "Very High",
      Netflix: "Very High"
    },
    practiceProblems: [
      "Design Distributed Cache from Scratch",
      "Implement Consistent Hashing",
      "Handle Cache Stampede",
      "Design Eviction Policy",
      "Add Replication and Failover"
    ]
  },

  {
    id: "system-messaging-queue-master",
    title: "Message Queues - Async Processing at Scale",
    difficulty: "Advanced",
    estimatedTime: 75,
    concepts: [
      "Message ordering",
      "Delivery guarantees (at-least-once, exactly-once)",
      "Dead letter queues",
      "Backpressure handling",
      "Consumer groups",
      "Partitioning",
      "Replication and durability"
    ],
    dataFromSources: {
      systemDesignPrimer:
        "Async patterns: Message queues decouple services. Kafka, RabbitMQ, SQS explained.",
      grokking:
        "Real use cases: Email sending, notifications, data pipelines. Consumer-producer patterns.",
      bytebytego:
        "Kafka deep dive. Partitions, offsets, consumer groups. Why Kafka for high-throughput systems."
    },
    keyTakeaways: [
      "At-least-once: Message delivered one or more times. Requires idempotent processing.",
      "Exactly-once: Hardest guarantee. Often not needed (at-least-once + idempotency sufficient)",
      "Dead letter queue: Failed messages â separate queue for debugging",
      "Backpressure: Slow consumer â broker buffers or rejects messages. Rate limit upstream.",
      "Partitioning: Distribute by key for ordering within partition",
      "Replication: Durability. Broker failure doesn't lose messages"
    ],
    commonMistakes: [
      "Assuming message delivery without fault handling",
      "Not making consumers idempotent (duplicate processing)",
      "Not handling dead letter queue",
      "Poor consumer group management (slow system)",
      "Not monitoring message lag"
    ],
    companyFrequency: {
      Amazon: "Very High",
      Meta: "Very High",
      Google: "Very High",
      Netflix: "Very High"
    },
    practiceProblems: [
      "Design Notification System with Queues",
      "Handle Message Ordering and Delivery Guarantees",
      "Design Consumer Groups for Scalability"
    ]
  }
];

// ============================================
// DESIGN FRAMEWORKS - MULTIPLE APPROACHES
// ============================================

export const designFrameworksDetailed = {
  "System Design Primer - 4 Step Approach": {
    overview:
      "donnemartin's proven 4-step process. Widely used. Simple and effective.",
    steps: [
      {
        step: 1,
        title: "Outline Use Cases, Constraints, and Assumptions",
        details: [
          "Who uses the system? How many?",
          "Read/write ratio? (e.g., 10:1 read-heavy)",
          "Peak QPS (queries per second)?",
          "Data size? (e.g., 1TB in 5 years)",
          "Availability requirement? (99.9% = 45 min downtime/month)"
        ]
      },
      {
        step: 2,
        title: "Create High-Level Design",
        details: [
          "Sketch components: clients, API server, database, cache, message queue",
          "Draw main data flows",
          "Discuss trade-offs of each component",
          "Identify potential bottlenecks"
        ]
      },
      {
        step: 3,
        title: "Design Core Components",
        details: [
          "Deep dive: How to generate unique IDs?",
          "Database schema design",
          "API endpoint design (REST vs GraphQL)",
          "Handle edge cases (duplicates, race conditions)"
        ]
      },
      {
        step: 4,
        title: "Scale the Design",
        details: [
          "Identify bottlenecks: CPU, memory, network, disk I/O",
          "Add load balancers for horizontal scale",
          "Add caching layer (Redis, Memcached)",
          "Database replicas (read-only slaves)",
          "Database sharding (horizontal partitioning)",
          "CDN for static content",
          "Message queues for async processing"
        ]
      }
    ]
  },

  "Grokking - RESHADED Framework": {
    overview:
      "Educative.io's comprehensive 8-step approach. Focuses on communication and trade-offs.",
    steps: [
      {
        step: 1,
        title: "Requirements",
        details: [
          "Functional: What should system do?",
          "Non-functional: Scale, availability, latency, consistency"
        ]
      },
      {
        step: 2,
        title: "Estimation",
        details: [
          "Back-of-envelope calculations",
          "Users: 100M, Daily Active: 10M",
          "QPS: 10M DAU / 86400 sec = ~115 QPS avg, 10x = 1150 peak",
          "Storage: 1KB per user = 100GB, photos 1MB = 10TB"
        ]
      },
      {
        step: 3,
        title: "Storage",
        details: [
          "Database choice: SQL vs NoSQL?",
          "Data models and schemas",
          "Indexing strategy"
        ]
      },
      {
        step: 4,
        title: "Handling",
        details: [
          "High-level architecture",
          "API design",
          "Communication protocols"
        ]
      },
      {
        step: 5,
        title: "Analysis",
        details: [
          "Bottleneck identification",
          "Trade-off analysis",
          "Optimization strategies"
        ]
      },
      {
        step: 6,
        title: "Database",
        details: [
          "Replication strategy",
          "Sharding approach",
          "Consistency model"
        ]
      },
      {
        step: 7,
        title: "Evolution",
        details: [
          "How to scale further?",
          "Handling new requirements",
          "Optimization iterations"
        ]
      },
      {
        step: 8,
        title: "Discussion",
        details: [
          "Deep dive based on interview time",
          "Answer follow-up questions",
          "Show problem-solving ability"
        ]
      }
    ]
  },

  "ByteByteGo - Trade-off Focused": {
    overview: "Emphasizes decision-making and trade-off reasoning at every step",
    keyPrinciples: [
      "Every technical decision has pros and cons",
      "Choose based on requirements",
      "Communicate trade-offs clearly",
      "Show you understand why, not just what"
    ],
    structure: [
      "Clarify requirements (What are we solving?)",
      "Propose simple solution (MVP)",
      "Identify bottlenecks (Where would it fail?)",
      "Optimize each component (Caching? Sharding? etc)",
      "Discuss trade-offs (Why this choice over that?)",
      "Handle follow-ups (Be flexible, show critical thinking)"
    ]
  }
};

export default curatedSystemDesignTopics;
