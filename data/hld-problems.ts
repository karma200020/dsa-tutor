// HLD (High-Level Design / System Design) Interview Problems - Company Specific
// Based on ByteByteGo, Grokking, System Design Primer, real interview experiences

export interface HLDProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  companies: string[];
  estimatedTime: number; // minutes
  keyTopics: string[];
  coreComponents: string[];
  commonFollowUps: string[];
  scalabilityFocus: string[];
  interviewExperience: string;
  frequencyRank: number;
  prerequisites: string[];
  resourceLinks: {
    neetcode?: string;
    bytebytego?: string;
    algomaster?: string;
    systemDesignPrimer?: string;
    grokking?: string;
    educative?: string;
  };
}

export const hldProblems: HLDProblem[] = [
  // ============================================
  // TIER 1 - ASKED BY EVERYONE (95%+)
  // ============================================
  {
    id: "hld-url-shortener",
    title: "URL Shortener (bit.ly, TinyURL)",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Apple",
      "Netflix", "LinkedIn", "Bloomberg", "Uber", "Airbnb"
    ],
    estimatedTime: 45,
    keyTopics: [
      "Database sharding", "Encoding schemes", "Caching",
      "Analytics", "Redirect service", "Scalability",
      "Concurrency", "Availability"
    ],
    coreComponents: [
      "Web service", "Database", "Cache (Redis)",
      "Load balancer", "Analytics service",
      "Encoding/decoding service", "Rate limiter"
    ],
    commonFollowUps: [
      "Support custom short URLs",
      "Add expiration time for URLs",
      "Add analytics (click count, geography, device)",
      "Handle URL deletion",
      "Support bulk URL shortening",
      "Add QR code generation",
      "Handle collision in encoding",
      "Support different base for encoding (base62 vs base36)"
    ],
    scalabilityFocus: [
      "Sharding strategy (by hash or range)",
      "Cache invalidation",
      "Read-heavy optimization",
      "Database indexing strategy"
    ],
    interviewExperience:
      "Google/Amazon: #1 system design problem. Asked 95% of times. Shows end-to-end design thinking.",
    frequencyRank: 1,
    prerequisites: ["Database design", "Caching", "Hash functions"],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=JQDHz72OA3c",
      systemDesignPrimer: "URL shortener section",
      grokking: "Design URL Shortening Service"
    }
  },

  {
    id: "hld-social-media-feed",
    title: "Social Media Feed System (Twitter, Facebook)",
    difficulty: "Hard",
    companies: [
      "Meta", "Google", "Amazon", "Microsoft", "Netflix",
      "LinkedIn", "Twitter", "TikTok", "Snapchat"
    ],
    estimatedTime: 60,
    keyTopics: [
      "Fanout (push vs pull)", "Activity stream", "Caching strategy",
      "Message queues", "Real-time updates", "Feed ranking",
      "Consistency models", "Event-driven architecture"
    ],
    coreComponents: [
      "API Gateway", "User service", "Post service",
      "Feed generation service", "Cache layer",
      "Message queue (Kafka)", "Notification service",
      "Search service", "Analytics"
    ],
    commonFollowUps: [
      "Implement fanout optimization (push for celebrities, pull for regular users)",
      "Add feed ranking/personalization algorithm",
      "Support real-time updates (WebSocket/SSE)",
      "Handle high-volume followers (celebrity effect)",
      "Add mentions and hashtag search",
      "Implement trending topics",
      "Add feed customization (chronological vs algorithm-based)",
      "Handle delete/edit of posts",
      "Add privacy controls"
    ],
    scalabilityFocus: [
      "Push vs Pull trade-off",
      "Cache invalidation for feeds",
      "Message queue for async processing",
      "Database sharding strategy",
      "Real-time notification delivery"
    ],
    interviewExperience:
      "Meta: Core problem asked in 85% of interviews. Tests understanding of scalability, consistency, and real-time systems. Interviewer loves follow-up questions here.",
    frequencyRank: 2,
    prerequisites: [
      "Database design",
      "Caching",
      "Message queues",
      "API design"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=9ulsKAp5P2c",
      systemDesignPrimer: "Designing Facebook's News Feed"
    }
  },

  {
    id: "hld-distributed-cache",
    title: "Distributed Cache (Redis, Memcached)",
    difficulty: "Hard",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Netflix",
      "LinkedIn", "Bloomberg", "Uber"
    ],
    estimatedTime: 60,
    keyTopics: [
      "Eviction policies (LRU, LFU, FIFO)", "Replication",
      "Consistency models", "TTL/Expiration", "Thread safety",
      "Persistence", "Cluster management", "Sharding"
    ],
    coreComponents: [
      "Cache nodes", "Master-slave replication", "Sentinel (monitoring)",
      "Cluster coordinator", "Persistence layer",
      "Eviction policy engine", "TTL manager"
    ],
    commonFollowUps: [
      "Implement consistent hashing for sharding",
      "Add cluster management (node failures, recovery)",
      "Implement different eviction policies (LRU, LFU)",
      "Add persistence (RDB, AOF)",
      "Support replication and failover",
      "Add pub-sub functionality",
      "Implement transactions",
      "Support Lua scripting",
      "Handle hot keys (popular data)"
    ],
    scalabilityFocus: [
      "Consistent hashing",
      "Replication strategy",
      "Failover and recovery",
      "Eviction policy efficiency",
      "Memory management"
    ],
    interviewExperience:
      "Netflix: Deep cache design. Shows understanding of in-memory systems and trade-offs. Hard variant of LRU Cache.",
    frequencyRank: 3,
    prerequisites: ["LRU Cache", "Hash tables", "Linked lists"],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=DUbEgNw-Fr0"
    }
  },

  {
    id: "hld-chat-messaging-system",
    title: "Chat/Messaging System (WhatsApp, Messenger, Slack)",
    difficulty: "Hard",
    companies: [
      "Meta", "Google", "Amazon", "Microsoft", "Apple",
      "Telegram", "Discord", "Slack", "WeChat"
    ],
    estimatedTime: 60,
    keyTopics: [
      "Real-time messaging", "WebSocket/SSE", "Message ordering",
      "Presence/status tracking", "Group chat", "Notifications",
      "Message persistence", "Consistency", "Security/Encryption"
    ],
    coreComponents: [
      "Chat service", "Message service", "User service",
      "Presence service", "Notification service",
      "Message queue", "Database", "Cache",
      "WebSocket servers", "Connection pool"
    ],
    commonFollowUps: [
      "Support group chat with multiple users",
      "Implement message search",
      "Add message reactions (emoji)",
      "Add typing indicators",
      "Add read receipts",
      "Implement message encryption (E2E)",
      "Add voice/video call signaling",
      "Handle message ordering across devices",
      "Implement message delivery retry logic",
      "Add message analytics"
    ],
    scalabilityFocus: [
      "Connection management (millions of concurrent users)",
      "Message ordering guarantees",
      "Presence/status consistency",
      "Real-time push notifications",
      "Database sharding (by user ID or conversation ID)"
    ],
    interviewExperience:
      "Meta: Very complex real-time system. Tests architecture thinking and scalability knowledge. Expect deep dives into consistency and delivery guarantees.",
    frequencyRank: 4,
    prerequisites: [
      "Real-time systems",
      "Message queues",
      "Database design",
      "Networking (WebSocket)"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=uYvzN0iKoU0",
      systemDesignPrimer: "Designing a Messaging App"
    }
  },

  {
    id: "hld-video-streaming-platform",
    title: "Video Streaming Platform (YouTube, Netflix, TikTok)",
    difficulty: "Hard",
    companies: [
      "Netflix", "Google (YouTube)", "Amazon (Prime Video)",
      "Meta", "TikTok", "Apple (Apple TV)", "Disney+"
    ],
    estimatedTime: 75,
    keyTopics: [
      "Video transcoding", "CDN", "Adaptive bitrate streaming (HLS, DASH)",
      "Video upload pipeline", "Storage", "Recommendation engine",
      "Analytics", "DRM/Content protection", "Live streaming"
    ],
    coreComponents: [
      "Upload service", "Transcoding service", "Storage (S3)",
      "CDN (CloudFlare, Akamai)", "Streaming service",
      "Metadata service", "Recommendation engine",
      "Analytics service", "Payment service"
    ],
    commonFollowUps: [
      "Implement adaptive bitrate streaming (different resolutions)",
      "Add live streaming support",
      "Implement recommendation algorithm (collaborative filtering)",
      "Add video analytics (watch time, engagement)",
      "Support multiple video qualities (360p, 480p, 720p, 1080p)",
      "Add DRM/content protection",
      "Implement video search",
      "Add subtitle support (multiple languages)",
      "Handle regional content restrictions",
      "Add video monetization (ads, subscriptions)"
    ],
    scalabilityFocus: [
      "Video transcoding at scale",
      "CDN edge caching",
      "Adaptive streaming based on bandwidth",
      "Storage optimization (format, compression)",
      "Real-time video processing pipeline"
    ],
    interviewExperience:
      "Netflix: Premium design problem. Tests knowledge of video technologies, distributed systems, and scalability at massive scale.",
    frequencyRank: 5,
    prerequisites: [
      "CDN concepts",
      "Video technologies (codecs, formats)",
      "Distributed systems",
      "Data pipeline design"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=lYzOYx03Zcc",
      systemDesignPrimer: "YouTube design section"
    }
  },

  // ============================================
  // TIER 2 - FREQUENTLY ASKED (70-90%)
  // ============================================
  {
    id: "hld-notification-system-hld",
    title: "Notification System (Push, Email, SMS)",
    difficulty: "Medium",
    companies: [
      "Meta", "Google", "Amazon", "Microsoft", "Netflix",
      "Uber", "Airbnb", "LinkedIn", "Twitter"
    ],
    estimatedTime: 50,
    keyTopics: [
      "Multi-channel delivery", "Queue management", "Rate limiting",
      "Retry logic", "Template management", "User preferences",
      "Scheduling", "Analytics"
    ],
    coreComponents: [
      "Notification service", "Queue (SQS, Kafka)",
      "Channel providers (Firebase, SNS, SendGrid)",
      "Template engine", "User preference service",
      "Retry service", "Analytics service"
    ],
    commonFollowUps: [
      "Add user preference management (do not disturb, channel selection)",
      "Implement smart scheduling (best time to send)",
      "Add A/B testing for notification content",
      "Implement rate limiting per user/channel",
      "Add notification delivery tracking",
      "Support rich notifications (images, actions)",
      "Implement unsubscribe/opt-out flow",
      "Add notification priority levels"
    ],
    scalabilityFocus: [
      "Queue throughput",
      "Rate limiting per channel",
      "Batch notification sending",
      "Retry strategy"
    ],
    interviewExperience:
      "Meta/Uber: Practical system design. Tests understanding of asynchronous processing and multi-channel integrations.",
    frequencyRank: 6,
    prerequisites: ["Message queues", "API design"],
    resourceLinks: {
      bytebytego: "Design a notification system"
    }
  },

  {
    id: "hld-ride-sharing",
    title: "Ride Sharing Platform (Uber, Lyft)",
    difficulty: "Hard",
    companies: [
      "Uber", "Google", "Amazon", "Meta", "Airbnb"
    ],
    estimatedTime: 75,
    keyTopics: [
      "Real-time location tracking", "Matching algorithm",
      "Geospatial indexing (QuadTree, R-Tree)", "Notifications",
      "Payment processing", "Ratings/Reviews", "Analytics"
    ],
    coreComponents: [
      "Location service", "Matching service", "Notification service",
      "Payment service", "Rating service", "Map service",
      "Analytics service", "User service", "Ride service"
    ],
    commonFollowUps: [
      "Implement efficient driver matching algorithm",
      "Add surge pricing logic",
      "Support ride pooling/carpooling",
      "Implement driver ratings and quality control",
      "Add dispute resolution",
      "Support multiple payment methods",
      "Implement ETA calculation",
      "Add driver background verification",
      "Support scheduled rides",
      "Implement driver/rider cancellation policies"
    ],
    scalabilityFocus: [
      "Real-time location updates (millions of drivers)",
      "Efficient spatial matching algorithm",
      "Payment processing at scale",
      "Consistent rating/review system"
    ],
    interviewExperience:
      "Uber: Complex real-world system. Tests geospatial algorithms, real-time processing, and payment systems.",
    frequencyRank: 7,
    prerequisites: [
      "Real-time systems",
      "Geospatial data structures",
      "Payment systems"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=J0DY1XPOPuc"
    }
  },

  {
    id: "hld-autocomplete-typeahead",
    title: "Autocomplete / Typeahead Search",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Apple"
    ],
    estimatedTime: 45,
    keyTopics: [
      "Trie data structure", "Frequency-based ranking",
      "Caching", "Prefix matching", "Distributed Trie"
    ],
    coreComponents: [
      "Autocomplete service", "Trie", "Cache",
      "Popularity/frequency counter", "Storage"
    ],
    commonFollowUps: [
      "Support spelling correction/suggestions",
      "Add personalized suggestions (user-specific)",
      "Implement geographic-based suggestions",
      "Add trending searches",
      "Support multiple languages",
      "Optimize for latency (sub-100ms)",
      "Handle massive QPS (Google-scale)",
      "Add analytics (search patterns)"
    ],
    scalabilityFocus: [
      "Trie sharding across servers",
      "Query latency optimization",
      "Cache efficiency",
      "Real-time ranking updates"
    ],
    interviewExperience:
      "Google: Tests Trie knowledge and optimization thinking. Good follow-up for search-related problems.",
    frequencyRank: 8,
    prerequisites: ["Trie data structure"],
    resourceLinks: {
      bytebytego: "Design search autocomplete"
    }
  },

  // ============================================
  // TIER 3 - SOMETIMES ASKED (50-70%)
  // ============================================
  {
    id: "hld-web-crawler",
    title: "Web Crawler / Search Engine Indexer",
    difficulty: "Hard",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft"
    ],
    estimatedTime: 60,
    keyTopics: [
      "BFS/DFS traversal", "URL frontier management", "Robots.txt",
      "Duplicate URL detection", "Content storage", "Indexing",
      "Ranking algorithm (PageRank)"
    ],
    coreComponents: [
      "URL frontier", "Crawler service", "Content repository",
      "Indexer", "Storage", "Duplicate detector",
      "Ranking service"
    ],
    commonFollowUps: [
      "Implement distributed crawling across multiple machines",
      "Handle robots.txt and crawl politeness",
      "Implement efficient duplicate detection (bloom filter, hash)",
      "Add content freshness strategy",
      "Implement PageRank algorithm",
      "Support incremental indexing",
      "Handle different content types (text, images, videos)",
      "Add language detection/translation",
      "Implement web graph analysis"
    ],
    scalabilityFocus: [
      "Distributed crawling coordination",
      "URL frontier efficiency",
      "Duplicate detection at scale",
      "Storage optimization"
    ],
    interviewExperience:
      "Google: Advanced system design. Tests knowledge of graph algorithms and distributed systems.",
    frequencyRank: 9,
    prerequisites: [
      "Graph algorithms",
      "Distributed systems",
      "Storage systems"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=BYR0DklMlO0",
      systemDesignPrimer: "https://github.com/donnemartin/system-design-primer#web-crawler"
    }
  },

  {
    id: "hld-payment-system",
    title: "Payment System (Stripe, PayPal, Square)",
    difficulty: "Hard",
    companies: [
      "Amazon", "Google", "Meta", "Uber", "Airbnb",
      "Microsoft", "Apple"
    ],
    estimatedTime: 60,
    keyTopics: [
      "ACID transactions", "Ledger system", "Reconciliation",
      "Fault tolerance", "Idempotency", "Security",
      "Compliance (PCI-DSS)"
    ],
    coreComponents: [
      "Payment API", "Card processor", "Ledger",
      "Reconciliation service", "Fraud detection",
      "Settlement service", "Webhooks/Notification"
    ],
    commonFollowUps: [
      "Implement refund processing",
      "Add fraud detection system",
      "Support multiple payment methods (cards, wallets, crypto)",
      "Implement PCI compliance",
      "Add idempotent payment requests",
      "Implement payment retries with exponential backoff",
      "Add payment analytics",
      "Support currency conversion",
      "Implement webhook delivery guarantees",
      "Add dispute resolution"
    ],
    scalabilityFocus: [
      "ACID guarantees for transactions",
      "Ledger consistency",
      "Idempotent operations",
      "High availability"
    ],
    interviewExperience:
      "Amazon/Uber: Complex financial system. Tests understanding of transactions, consistency, and compliance. High bar for this problem.",
    frequencyRank: 10,
    prerequisites: [
      "Database transactions",
      "Distributed systems",
      "Security"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=aMBWo9Igu8I",
      educative: "https://www.educative.io/courses/grokking-system-design/QL6BnqPrHWA"
    }
  },

  {
    id: "hld-hotel-booking",
    title: "Hotel Booking System (Booking.com, Airbnb)",
    difficulty: "Medium",
    companies: [
      "Airbnb", "Google", "Amazon", "Uber"
    ],
    estimatedTime: 50,
    keyTopics: [
      "Inventory management", "Booking/Reservation",
      "Search and filtering", "Reviews/Ratings",
      "Dynamic pricing", "Concurrency control"
    ],
    coreComponents: [
      "Search service", "Booking service", "Inventory service",
      "Pricing service", "Review service",
      "Payment service", "Notification service"
    ],
    commonFollowUps: [
      "Implement dynamic pricing based on demand/season",
      "Add cancellation policies",
      "Implement overbooking protection",
      "Add review and rating system",
      "Support multiple currencies",
      "Implement search filters (price, rating, amenities)",
      "Add booking confirmation and itinerary",
      "Support host management interface"
    ],
    scalabilityFocus: [
      "Concurrent booking handling",
      "Inventory consistency",
      "Search performance",
      "Dynamic pricing updates"
    ],
    interviewExperience:
      "Airbnb: Real-world e-commerce system. Tests database design and transaction handling.",
    frequencyRank: 11,
    prerequisites: [
      "Database design",
      "Transactions",
      "Search optimization"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=PZbPqJYgrZM",
      systemDesignPrimer: "https://github.com/donnemartin/system-design-primer#design-airbnb"
    }
  },

  {
    id: "hld-e-commerce-amazon",
    title: "E-Commerce Platform (Amazon, eBay)",
    difficulty: "Hard",
    companies: [
      "Amazon", "Google", "Meta", "Microsoft"
    ],
    estimatedTime: 75,
    keyTopics: [
      "Product catalog", "Shopping cart", "Order management",
      "Inventory", "Payment processing", "Fulfillment",
      "Search and recommendations", "Reviews/Ratings"
    ],
    coreComponents: [
      "Product service", "Cart service", "Order service",
      "Inventory service", "Payment service",
      "Fulfillment service", "Search service",
      "Recommendation engine", "Review service"
    ],
    commonFollowUps: [
      "Implement shopping cart with concurrency control",
      "Add inventory management (stock levels, warehouses)",
      "Implement order tracking",
      "Add returns and refunds process",
      "Implement warehouse fulfillment optimization",
      "Add product recommendation algorithm",
      "Support multiple sellers (marketplace)",
      "Implement surge pricing/flash sales",
      "Add wish list functionality",
      "Implement advanced search (faceted search)"
    ],
    scalabilityFocus: [
      "Product catalog search performance",
      "Cart concurrency",
      "Inventory consistency across warehouses",
      "Order processing throughput"
    ],
    interviewExperience:
      "Amazon: Complex end-to-end system. Tests full architecture thinking from front-end to fulfillment.",
    frequencyRank: 12,
    prerequisites: [
      "Database design",
      "Search systems",
      "Payment systems",
      "Recommendation algorithms"
    ],
    resourceLinks: {
      bytebytego: "https://www.youtube.com/watch?v=gaSdXTqtpO0",
      systemDesignPrimer: "https://github.com/donnemartin/system-design-primer#design-an-e-commerce-site"
    }
  }
];

// ============================================
// COMPANY-TO-HLD-PROBLEMS MAPPING
// ============================================

export const companyHLDMap = {
  Google: [
    "hld-url-shortener",
    "hld-distributed-cache",
    "hld-autocomplete-typeahead",
    "hld-web-crawler",
    "hld-social-media-feed",
    "hld-video-streaming-platform"
  ],
  Amazon: [
    "hld-url-shortener",
    "hld-social-media-feed",
    "hld-notification-system-hld",
    "hld-e-commerce-amazon",
    "hld-hotel-booking"
  ],
  Meta: [
    "hld-social-media-feed",
    "hld-distributed-cache",
    "hld-chat-messaging-system",
    "hld-notification-system-hld",
    "hld-web-crawler"
  ],
  Netflix: [
    "hld-video-streaming-platform",
    "hld-distributed-cache",
    "hld-notification-system-hld"
  ],
  Uber: [
    "hld-ride-sharing",
    "hld-notification-system-hld",
    "hld-payment-system",
    "hld-hotel-booking"
  ],
  Airbnb: [
    "hld-hotel-booking",
    "hld-notification-system-hld",
    "hld-payment-system"
  ],
  Microsoft: [
    "hld-url-shortener",
    "hld-distributed-cache",
    "hld-chat-messaging-system",
    "hld-autocomplete-typeahead",
    "hld-web-crawler"
  ],
  Apple: [
    "hld-distributed-cache",
    "hld-video-streaming-platform",
    "hld-chat-messaging-system",
    "hld-notification-system-hld"
  ]
};

// ============================================
// SYSTEM DESIGN CONCEPTS - MUST KNOW
// ============================================

export const systemDesignConcepts = {
  "Scalability Fundamentals": [
    "Vertical vs Horizontal scaling",
    "Load balancing strategies (Round-robin, Least connections, IP hash, Weighted)",
    "Database scaling (Replication, Sharding, Partitioning)",
    "Caching strategies (Write-through, Write-back, Write-around)",
    "Consistency vs Availability trade-offs"
  ],
  "Database Design": [
    "SQL vs NoSQL (When to use each)",
    "ACID properties",
    "BASE properties",
    "Sharding strategies (By key range, By hash)",
    "Replication (Master-slave, Master-master)",
    "Indexing strategies",
    "Query optimization"
  ],
  "Caching": [
    "Cache invalidation (TTL, LRU, Write-through)",
    "Cache aside (Lazy loading)",
    "Write-through caching",
    "Write-behind caching",
    "Distributed caching (Redis, Memcached)",
    "Cache stampede prevention",
    "Hot key management"
  ],
  "Message Queues": [
    "Pub-Sub vs Message Queue",
    "Message ordering guarantees",
    "At-least-once vs Exactly-once delivery",
    "Dead letter queues",
    "Backpressure handling",
    "Kafka, RabbitMQ, SQS concepts"
  ],
  "Real-Time Systems": [
    "WebSocket vs SSE vs Long polling",
    "Presence/Status tracking",
    "Message ordering",
    "Connection management",
    "Backpressure",
    "Duplicate message handling"
  ],
  "Search and Indexing": [
    "Inverted index",
    "Full-text search",
    "Trie for autocomplete",
    "B-tree for range queries",
    "LSM tree (Log-Structured Merge)",
    "Elasticsearch concepts"
  ],
  "CDN and Edge Computing": [
    "CDN architecture",
    "Edge caching",
    "Content replication",
    "Geo-routing",
    "Cache hit ratio optimization"
  ],
  "Security": [
    "Encryption (at-rest, in-transit)",
    "Authentication vs Authorization",
    "API security (Rate limiting, API keys, OAuth)",
    "Data privacy (PII protection, compliance)",
    "DDoS protection"
  ],
  "Monitoring and Logging": [
    "Metrics collection",
    "Distributed tracing",
    "Log aggregation",
    "Alerting strategies",
    "SLA/SLO definition"
  ]
};

// ============================================
// DESIGN FRAMEWORKS (Multiple Approaches)
// ============================================

export const designFrameworks = {
  "ByteByteGo Framework": {
    step1: "Understand the problem: Clarify requirements, scope, constraints",
    step2: "Design high-level architecture: Components and interactions",
    step3: "Design APIs and data models",
    step4: "Deep dive into core components",
    step5: "Identify and address bottlenecks",
    step6: "Handle edge cases and failures"
  },
  "Grokking Framework": {
    step1: "Requirements clarification: Functional and non-functional",
    step2: "Back-of-the-envelope calculations: Traffic, storage, bandwidth",
    step3: "High-level architecture design",
    step4: "API design",
    step5: "Data storage and retrieval",
    step6: "Scale the design: Caching, load balancing, sharding",
    step7: "Fail-over and replication"
  },
  "System Design Primer Framework": {
    step1: "Define the problem",
    step2: "Outline constraints",
    step3: "High-level overview",
    step4: "Core components design",
    step5: "Scale the design",
    step6: "Tradeoffs and optimization"
  }
};

export default hldProblems;
