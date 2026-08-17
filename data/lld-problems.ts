// LLD (Low-Level Design) Interview Problems - Company Specific
// Based on real interview experiences from Blind, company archives

export interface LLDProblem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  companies: string[];
  keywords: string[];
  estimatedTime: number; // minutes
  commonFollowUps: string[];
  designPatterns: string[];
  interviewExperience: string;
  requiredClasses: string[];
  frequencyRank: number; // 1 = most asked
}

export const lldProblems: LLDProblem[] = [
  // ============================================
  // TIER 1 - ASKED BY EVERYONE (90%+)
  // ============================================
  {
    id: "lld-parking-lot",
    title: "Parking Lot System",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix",
      "LinkedIn", "Bloomberg", "Oracle", "Uber", "Airbnb", "Shopify"
    ],
    keywords: [
      "OOAD", "State Management", "Search", "Notifications",
      "Multi-level parking", "Different vehicle types", "Reservation",
      "Charging stations (for EVs)"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add EV charging capability with pricing",
      "Add reservation system with cancellation",
      "Add multiple parking spots per vehicle",
      "Add handicap reserved spots",
      "Implement payment processing",
      "Add maintenance schedules"
    ],
    designPatterns: [
      "Strategy (pricing algorithms)",
      "Observer (slot availability)",
      "Factory (vehicle types)"
    ],
    interviewExperience:
      "Google/Amazon: Parking lot is #1 LLD problem. Asked 90% of design interviews. Shows OOAD mastery.",
    requiredClasses: [
      "ParkingLot",
      "Level",
      "ParkingSpot",
      "Vehicle",
      "Ticket",
      "ParkingRate"
    ],
    frequencyRank: 1
  },

  {
    id: "lld-lru-cache",
    title: "LRU Cache Implementation",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Apple", "Netflix"
    ],
    keywords: [
      "Hash Map", "Doubly Linked List", "Eviction", "Access tracking",
      "LFU Cache (hard version)", "Time-based expiration",
      "Distributed cache"
    ],
    estimatedTime: 40,
    commonFollowUps: [
      "Implement LFU Cache (Least Frequently Used)",
      "Add TTL (time to live) for keys",
      "Make it thread-safe",
      "Add statistics (hit rate, miss rate)",
      "Implement distributed LRU across nodes",
      "Add persistence to disk"
    ],
    designPatterns: ["Strategy (eviction policy)", "Observer (capacity changes)"],
    interviewExperience:
      "Google: LRU is classic. Shows deep understanding of data structures and optimization.",
    requiredClasses: ["LRUCache", "Node"],
    frequencyRank: 2
  },

  {
    id: "lld-rate-limiter",
    title: "Rate Limiter System",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Meta", "Microsoft", "Netflix", "Uber"
    ],
    keywords: [
      "Token Bucket", "Sliding Window", "Thread-safety", "Distributed",
      "Leaky Bucket", "Fixed Window", "Rolling Window",
      "Multiple rate limits (per user, per IP, per endpoint)"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Support multiple rate limit tiers (free, premium, enterprise)",
      "Make it distributed (Redis-based)",
      "Add different rate limits for different endpoints",
      "Implement backpressure/queuing",
      "Add metrics and alerting",
      "Support rate limit reset schedules"
    ],
    designPatterns: ["Strategy (rate limit algorithms)", "Observer (alerts)"],
    interviewExperience:
      "Netflix: Real production problem. Shows backend thinking. Distributed version is hard.",
    requiredClasses: ["RateLimiter", "Token", "UserRateLimit"],
    frequencyRank: 3
  },

  {
    id: "lld-elevator-system",
    title: "Elevator System Design",
    difficulty: "Medium",
    companies: [
      "Amazon", "Google", "Microsoft", "Apple", "Meta"
    ],
    keywords: [
      "State Machine", "Scheduling", "Concurrency", "SCAN algorithm",
      "Multiple elevators", "Express elevators", "Maintenance mode",
      "Emergency scenarios", "Load balancing across elevators"
    ],
    estimatedTime: 50,
    commonFollowUps: [
      "Add multiple elevators with load balancing",
      "Add express elevators (skip floors)",
      "Add maintenance mode",
      "Add emergency scenarios (power loss, stuck)",
      "Add priority levels (VIP, emergency)",
      "Optimize for energy efficiency"
    ],
    designPatterns: ["State Pattern", "Command Pattern", "Observer"],
    interviewExperience:
      "Amazon: Complex state machine. Tests concurrency and edge case thinking.",
    requiredClasses: [
      "Elevator",
      "Floor",
      "ElevatorButton",
      "ElevatorController"
    ],
    frequencyRank: 4
  },

  {
    id: "lld-library-management",
    title: "Library Management System",
    difficulty: "Medium",
    companies: [
      "Google", "Amazon", "Microsoft", "Apple", "Meta"
    ],
    keywords: [
      "CRUD operations", "Reservation", "Search", "Notifications",
      "Fine system", "Member management", "Book catalog",
      "Digital library", "Renewals", "Holds"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add fine calculation system",
      "Add reservation queue",
      "Add renewal system",
      "Add book recommendations",
      "Add digital library feature",
      "Add audit trail for books"
    ],
    designPatterns: ["Observer", "Strategy (search algorithms)"],
    interviewExperience:
      "Google: Good balance of features and complexity. Tests CRUD and relationships.",
    requiredClasses: [
      "Book",
      "Member",
      "BookIssue",
      "Fine",
      "Reservation"
    ],
    frequencyRank: 5
  },

  // ============================================
  // TIER 2 - FREQUENTLY ASKED (60-80%)
  // ============================================
  {
    id: "lld-pub-sub-system",
    title: "Pub-Sub (Event Bus) System",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Meta", "Netflix", "LinkedIn"],
    keywords: [
      "Observer Pattern", "Event handling", "Threading", "Topic management",
      "Subscriber groups", "Message ordering", "Dead letter queue"
    ],
    estimatedTime: 50,
    commonFollowUps: [
      "Add subscriber groups",
      "Add message ordering guarantees",
      "Add dead letter queue for failed messages",
      "Add retention policy",
      "Make it persistent",
      "Support filtering by message type"
    ],
    designPatterns: ["Observer", "Mediator"],
    interviewExperience:
      "Meta: Real messaging pattern. Tests understanding of async communication.",
    requiredClasses: ["EventBus", "Subscriber", "Event", "Topic"],
    frequencyRank: 6
  },

  {
    id: "lld-task-scheduler",
    title: "Task Scheduler / Cron System",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Microsoft", "Meta", "Netflix"],
    keywords: [
      "Scheduling", "Execution", "Retry logic", "Dependencies",
      "Cron expressions", "Distributed execution", "Task queues"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add task dependencies",
      "Add retry with exponential backoff",
      "Add distributed task execution",
      "Add task prioritization",
      "Add monitoring and alerts",
      "Support both periodic and one-time tasks"
    ],
    designPatterns: ["Strategy (scheduling algorithms)", "Command"],
    interviewExperience:
      "Google: Shows understanding of concurrency and scheduling patterns.",
    requiredClasses: ["Task", "TaskScheduler", "ExecutionResult"],
    frequencyRank: 7
  },

  {
    id: "lld-notification-system",
    title: "Notification System",
    difficulty: "Medium",
    companies: [
      "Meta", "Amazon", "Google", "Netflix", "Uber", "Airbnb"
    ],
    keywords: [
      "Multi-channel (email, SMS, push)", "Templates", "Queueing",
      "User preferences", "Rate limiting", "Retry logic",
      "A/B testing"
    ],
    estimatedTime: 50,
    commonFollowUps: [
      "Add user preferences (opt-in/out)",
      "Add A/B testing for content",
      "Add analytics tracking",
      "Add scheduling (send at best time)",
      "Add template versioning",
      "Make it distributed"
    ],
    designPatterns: ["Strategy (notification channels)", "Template Method"],
    interviewExperience:
      "Meta: Real-world feature. Tests multi-channel design and scalability.",
    requiredClasses: [
      "Notification",
      "NotificationService",
      "Channel",
      "Template"
    ],
    frequencyRank: 8
  },

  {
    id: "lld-atm-machine",
    title: "ATM Machine System",
    difficulty: "Medium",
    companies: [
      "Microsoft", "Google", "Amazon", "Apple"
    ],
    keywords: [
      "State Machine", "Concurrency", "Audit trail", "Transaction logs",
      "Security", "Error handling", "Cash management"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add transaction history",
      "Add multi-account support",
      "Add transfer between accounts",
      "Add fraud detection",
      "Add network failures handling",
      "Add card blocking after N wrong attempts"
    ],
    designPatterns: ["State Pattern", "Singleton (ATM Machine)"],
    interviewExperience:
      "Microsoft: Tests state machine and concurrency. Requires security thinking.",
    requiredClasses: [
      "ATM",
      "Card",
      "Account",
      "Transaction",
      "CashDispenser"
    ],
    frequencyRank: 9
  },

  {
    id: "lld-hotel-management",
    title: "Hotel Management System",
    difficulty: "Medium",
    companies: ["Uber", "Airbnb", "Google", "Amazon"],
    keywords: [
      "Room booking", "Check-in/out", "Inventory management",
      "Multi-hotel support", "Cancellation", "Refund policies",
      "Housekeeping workflow"
    ],
    estimatedTime: 50,
    commonFollowUps: [
      "Add cancellation with penalties",
      "Add loyalty points",
      "Add housekeeping tasks",
      "Add multi-property support",
      "Add reviews and ratings",
      "Add surge pricing"
    ],
    designPatterns: ["Observer", "Strategy"],
    interviewExperience:
      "Airbnb: Real-world e-commerce. Tests inventory and state management.",
    requiredClasses: [
      "Hotel",
      "Room",
      "Booking",
      "Guest",
      "Payment"
    ],
    frequencyRank: 10
  },

  // ============================================
  // TIER 3 - SOMETIMES ASKED (30-60%)
  // ============================================
  {
    id: "lld-movie-ticket-booking",
    title: "Movie Ticket Booking System",
    difficulty: "Medium",
    companies: ["Amazon", "Google", "Uber", "Airbnb"],
    keywords: [
      "Seat selection", "Concurrency", "Payment processing",
      "Show management", "Cinema chains", "Seat reservations"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add dynamic pricing based on seat location/time",
      "Add group bookings",
      "Add cancellations and refunds",
      "Add promotional codes",
      "Add waiting list for full shows",
      "Add seat analytics"
    ],
    designPatterns: ["Observer", "Strategy"],
    interviewExperience:
      "Amazon: E-commerce flow. Tests concurrency for seat selection.",
    requiredClasses: ["Cinema", "Show", "Seat", "Booking", "Payment"],
    frequencyRank: 11
  },

  {
    id: "lld-chat-system",
    title: "Chat/Messaging System (LLD)",
    difficulty: "Medium",
    companies: ["Meta", "Google", "Amazon", "Microsoft"],
    keywords: [
      "Message handling", "User relationships", "Group chats",
      "Message history", "Notifications", "Typing indicators"
    ],
    estimatedTime: 50,
    commonFollowUps: [
      "Add group chat support",
      "Add message reactions/emojis",
      "Add file sharing",
      "Add read receipts",
      "Add message encryption",
      "Add message persistence"
    ],
    designPatterns: ["Observer", "Mediator"],
    interviewExperience:
      "Meta: Core feature of Facebook/Messenger. Tests real-time features.",
    requiredClasses: ["User", "Message", "Chat", "Group", "Notification"],
    frequencyRank: 12
  },

  {
    id: "lld-vending-machine",
    title: "Vending Machine System",
    difficulty: "Easy",
    companies: ["Google", "Amazon", "Microsoft"],
    keywords: [
      "State Machine", "Inventory", "Payment processing",
      "Transaction handling", "Change calculation"
    ],
    estimatedTime: 40,
    commonFollowUps: [
      "Add different payment methods",
      "Add inventory management",
      "Add maintenance notifications",
      "Add price changes",
      "Add restocking workflow",
      "Add multiple currency support"
    ],
    designPatterns: ["State Pattern", "Strategy"],
    interviewExperience:
      "Google: Simple state machine. Good for beginners. Quick interview.",
    requiredClasses: ["VendingMachine", "Item", "Inventory"],
    frequencyRank: 13
  },

  {
    id: "lld-url-shortener-lld",
    title: "URL Shortener (LLD Focus)",
    difficulty: "Medium",
    companies: ["Google", "Amazon", "Meta"],
    keywords: [
      "Encoding schemes", "Storage", "Tracking", "Analytics",
      "Expiration", "Custom shorts"
    ],
    estimatedTime: 45,
    commonFollowUps: [
      "Add analytics (click tracking, geography)",
      "Add custom short URLs",
      "Add QR code generation",
      "Add expiration dates",
      "Add bulk URL shortening",
      "Add API for programmatic access"
    ],
    designPatterns: ["Factory", "Strategy"],
    interviewExperience:
      "Google: Good LLD + HLD mix. Tests encoding and API design.",
    requiredClasses: ["URL", "ShortURL", "Analytics"],
    frequencyRank: 14
  },

  {
    id: "lld-social-network",
    title: "Social Network (LLD)",
    difficulty: "Hard",
    companies: ["Meta", "Google", "Amazon"],
    keywords: [
      "User relationships", "Graph modeling", "Posts", "Feed generation",
      "Notifications", "Search", "Recommendations"
    ],
    estimatedTime: 60,
    commonFollowUps: [
      "Add feed ranking algorithm",
      "Add search functionality",
      "Add post recommendations",
      "Add privacy settings",
      "Add post analytics",
      "Add content moderation"
    ],
    designPatterns: ["Observer", "Strategy", "Composite"],
    interviewExperience:
      "Meta: Complex system design. Tests relationship modeling and algorithms.",
    requiredClasses: [
      "User",
      "Post",
      "Comment",
      "Like",
      "Feed"
    ],
    frequencyRank: 15
  }
];

// ============================================
// COMPANY-TO-LLD-PROBLEMS MAPPING
// ============================================

export const companyLLDMap = {
  Google: [
    "lld-parking-lot",
    "lld-lru-cache",
    "lld-library-management",
    "lld-pub-sub-system",
    "lld-task-scheduler",
    "lld-vending-machine",
    "lld-url-shortener-lld",
    "lld-social-network"
  ],
  Amazon: [
    "lld-parking-lot",
    "lld-lru-cache",
    "lld-elevator-system",
    "lld-notification-system",
    "lld-hotel-management",
    "lld-movie-ticket-booking",
    "lld-chat-system"
  ],
  Meta: [
    "lld-parking-lot",
    "lld-lru-cache",
    "lld-rate-limiter",
    "lld-pub-sub-system",
    "lld-notification-system",
    "lld-chat-system",
    "lld-url-shortener-lld",
    "lld-social-network"
  ],
  Microsoft: [
    "lld-parking-lot",
    "lld-lru-cache",
    "lld-elevator-system",
    "lld-atm-machine",
    "lld-vending-machine"
  ],
  Apple: [
    "lld-parking-lot",
    "lld-lru-cache",
    "lld-library-management",
    "lld-atm-machine"
  ],
  Netflix: [
    "lld-lru-cache",
    "lld-rate-limiter",
    "lld-pub-sub-system",
    "lld-task-scheduler",
    "lld-notification-system"
  ]
};

// ============================================
// DESIGN PATTERNS PRACTICE
// ============================================

export const designPatternProblems = {
  "Singleton": [
    "lld-atm-machine",
    "lld-parking-lot"
  ],
  "Factory": [
    "lld-notification-system",
    "lld-url-shortener-lld"
  ],
  "Strategy": [
    "lld-rate-limiter",
    "lld-notification-system",
    "lld-parking-lot"
  ],
  "Observer": [
    "lld-pub-sub-system",
    "lld-notification-system",
    "lld-parking-lot",
    "lld-hotel-management"
  ],
  "State": [
    "lld-elevator-system",
    "lld-atm-machine",
    "lld-vending-machine"
  ],
  "Command": [
    "lld-task-scheduler",
    "lld-pub-sub-system"
  ],
  "Adapter": [
    "lld-notification-system",
    "lld-payment-system"
  ],
  "Decorator": [
    "lld-notification-system",
    "lld-hotel-management"
  ],
  "Template Method": [
    "lld-notification-system"
  ],
  "Mediator": [
    "lld-pub-sub-system",
    "lld-chat-system"
  ]
};

export default lldProblems;
