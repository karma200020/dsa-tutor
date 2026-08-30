// Single source of truth for topic data consumed by the app.
// Aggregates every topic dataset, drops entries whose moduleId is not in the
// syllabus, and de-duplicates by topic id (earlier sources win).
import { Example, LessonSection, Reference, Topic, syllabus, FaqItem } from "./syllabus";
import { dsaTopics } from "./dsa-topics";
import { comprehensiveDsaTopics } from "./comprehensive-dsa-topics";
import { dsaTopicsExtended } from "./dsa-topics-extended";
import { expandedDsaTopics } from "./dsa-topics-expanded";
import { expandedDsaTopics as arrayFoundationTopics } from "./expanded-dsa-topics";
import { coverageTopics } from "./expanded-coverage";
import { lldTopics } from "./lld-topics";
import { hldTopics } from "./hld-topics";
import { aiTopics } from "./ai-topics";
import { googleDsaProblems, googleCheatSheetReference } from "./google-cheat-sheet-integration";

const validModuleIds = new Set(syllabus.map((m) => m.id));

function buildFallbackTopic(moduleId: string, moduleTitle: string): Topic {
  const cleanTitle = moduleTitle.replace(/[:()]/g, "").trim();
  const topicId = `${moduleId}-core-topic`;
  return {
    id: topicId,
    moduleId,
    title: `${cleanTitle} Core Pattern`,
    intuition: `This module is about practicing the fundamental interview patterns behind ${moduleTitle.toLowerCase()}. The goal is to reason clearly, choose the right abstraction, and explain trade-offs under pressure.`,
    lesson: [
      {
        title: "Why this module matters",
        content: `In FAANG interviews, ${moduleTitle.toLowerCase()} is assessed by how you reason about the problem, clarify constraints, and communicate the algorithmic trade-offs. The interviewer is looking for a clear plan, not just a final answer.`,
        codeExample: `// Step 1: clarify\n// Step 2: model the state\n// Step 3: identify the invariant\n// Step 4: implement and validate`
      },
      {
        title: "Interview approach",
        content: `Start with a brute-force version to show that you understand the raw problem. Then refine it by tracking only the necessary state. Explain complexity, edge cases, and why the chosen structure is the right fit before coding.`,
        codeExample: `// brute force -> optimize\n// store only the needed state\n// prune or compress when possible`
      }
    ],
    tips: [
      "Restate the problem in plain English before picking an approach.",
      "State the invariant clearly before writing code.",
      "Handle edge cases before optimizing performance."
    ],
    tricks: [
      "Look for what changes from one step to the next.",
      "Brute force first, then reduce state to the relevant information.",
      "Dry-run with a small example before coding."
    ],
    memoryAids: [
      "Problem -> constraints -> state -> invariant -> code.",
      "If the constraints are large, think in terms of scans, maps, ordering, or pruning.",
      "A clean explanation often earns more credit than an overly clever implementation."
    ],
    interviewPatterns: [
      "Explain the brute force and why it is too slow.",
      "Walk through one worked example step by step.",
      "Discuss edge cases and trade-offs before finalizing the answer."
    ],
    references: [
      { source: "leetcode", attribution: "LeetCode", insight: `Practice the ${cleanTitle} pattern in interview-style questions.` },
      { source: "note", attribution: "NeetCode / TakeUForward", insight: `Use this module as a framework for learning ${cleanTitle.toLowerCase()} with clear interview patterns.` }
    ],
    practiceProblems: [`${moduleId}-practice-1`, `${moduleId}-practice-2`],
  };
}

function ensureModuleCoverage(topics: Topic[], moduleIds: string[]): Topic[] {
  return topics;
}

function diagramBlock(ascii: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${ascii}</pre>`;
}

// Native SVG diagram for the generic HLD fallback (applies to every non-mock
// HLD topic). Renders labeled boxes with arrows for the standard
// client -> gateway/LB -> services -> cache/queue -> DB flow, with the topic
// name in the title so each diagram is visibly tied to its topic. Static,
// authored markup only (no user input interpolated unescaped) so it is safe
// to render via dangerouslySetInnerHTML.
function escapeSvgText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHldArchitectureDiagram(title: string): string {
  const label = escapeSvgText(title.length > 40 ? `${title.slice(0, 37)}...` : title);
  const box = (x: number, y: number, w: number, h: number, text: string, fill: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#38bdf8" stroke-width="1.5" />` +
    `<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12" fill="#e2e8f0">${text}</text>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#67e8f9" stroke-width="2" marker-end="url(#hldArrow)" />`;
  return (
    `<svg viewBox="0 0 760 260" width="100%" height="auto" role="img" aria-label="Architecture diagram for ${label}: client through gateway, services, cache and queue, to database">` +
    `<title>${label}: request and data flow architecture</title>` +
    `<defs><marker id="hldArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#67e8f9" /></marker></defs>` +
    `<rect x="0" y="0" width="760" height="260" fill="transparent" />` +
    box(20, 110, 100, 44, "Client", "#0f172a") +
    box(160, 110, 120, 44, "CDN / DNS", "#111827") +
    box(320, 110, 130, 44, "Load Balancer", "#111827") +
    box(490, 30, 130, 44, `${label.length > 18 ? "Service" : label} Service`, "#0e2a3f") +
    box(490, 110, 130, 44, "Cache", "#0e2a3f") +
    box(490, 190, 130, 44, "Queue / Workers", "#0e2a3f") +
    box(660, 110, 90, 44, "Database", "#1e1b4b") +
    arrow(120, 132, 158, 132) +
    arrow(280, 132, 318, 132) +
    arrow(450, 122, 488, 60) +
    arrow(450, 132, 488, 132) +
    arrow(450, 142, 488, 205) +
    arrow(620, 60, 658, 130) +
    arrow(620, 132, 658, 132) +
    arrow(620, 205, 658, 145) +
    `<text x="20" y="250" font-family="Segoe UI, sans-serif" font-size="11" fill="#94a3b8">Drawing order: 1) client 2) CDN/DNS 3) load balancer 4) service 5) cache 6) queue/workers 7) database</text>` +
    `</svg>`
  );
}

function buildHldSolution(title: string, intuition: string): { lesson: LessonSection; example: Example } {
  return {
    lesson: {
      title: `${title}: complete system design`,
      content:
        `Requirements: define the user-facing operation, latency target, durability, availability, and consistency boundary for ${title}.\n\n` +
        `Capacity: estimate peak requests/sec from active users, average payload size, read/write ratio, and retention; provision headroom for burst traffic.\n\n` +
        `APIs: expose versioned endpoints for the primary read and write operations, require an idempotency key for retried writes, and return request IDs.\n\n` +
        `Data model: store the durable entity keyed by a stable ID, index the query fields, and retain an event or audit record when replay is needed.\n\n` +
        `Architecture and flow: route clients through DNS/CDN and a load balancer to stateless services; read cache first, then the database; send non-critical work to a durable queue and workers.\n\n` +
        `Scaling: partition by the access key, add read replicas, bound cache entries with TTL/LRU, and apply queue backpressure when consumers lag.\n\n` +
        `Consistency and reliability: choose strong writes for correctness-critical state, eventual reads where acceptable, use timeouts, retries with backoff, circuit breakers, health checks, failover, and a dead-letter queue.\n\n` +
        `Security and observability: authenticate and authorize every API, encrypt data in transit and at rest, rate-limit abuse, and monitor latency, saturation, error rate, queue lag, cache hit rate, replication lag, and audit events.\n\n` +
        `Trade-offs: ${intuition} The design favors horizontal scale and graceful degradation over the lowest operational complexity.`,
      diagram: buildHldArchitectureDiagram(title)
    },
    example: {
      title: `${title}: capacity and failure walkthrough`,
      input: `1M daily users, 10% active at peak, 20 requests per active user per minute, 2KB payloads, 99.99% availability target`,
      output: `~33,334 peak requests/sec with a cache-first read path, partitioned durable storage, and replayable asynchronous work`,
      explanation:
        `Step 1: Estimate peak traffic as 100,000 active users * 20 / 60 = ~33,334 requests/sec; provision multiple stateless service instances with headroom.\n` +
        `Step 2: Keep the primary entity in partitioned storage, route by entity/user ID, and add indexes for the read API.\n` +
        `Step 3: Serve hot reads from a regional cache; on a miss, read the database and populate the cache with a bounded TTL.\n` +
        `Step 4: Write the durable record before publishing an event to a replicated queue; workers handle notifications, indexing, and analytics with deduplication.\n` +
        `Step 5: On cache, replica, or worker failure, use bounded retries, circuit breakers, a dead-letter queue, and a degraded read path; monitor p95/p99 latency, error rate, queue lag, cache hit rate, and replication lag.\n` +
        `Step 6: Explain the trade-off: asynchronous secondary work improves availability and throughput, while the primary write remains strongly consistent where the business invariant requires it.`
    }
  };
}

type HldMockSpec = {
  requirements: string;
  capacity: string;
  apis: string;
  dataModel: string;
  architecture: string;
  flowSteps: string;
  scaling: string;
  consistency: string;
  reliability: string;
  security: string;
  observability: string;
  tradeoffs: string;
  drawingOrder: string;
  diagram: string;
  example: { input: string; output: string; steps: string };
};

const hldMockSolutions: Record<string, HldMockSpec> = {
  "topic-hld-mock-chat": {
    requirements:
      "1:1 and group messaging, delivery/read receipts, offline delivery when a user reconnects, message ordering per conversation, and end-to-end acceptable latency under ~200ms for online delivery.",
    capacity:
      "1M DAU, 10% concurrently online (~100K), each user sends ~20 messages/day -> ~20M messages/day (~230 msgs/sec average, ~2,300 msgs/sec at 10x peak). Each message ~1KB -> ~20GB/day raw message storage before replication.",
    apis:
      "POST /messages {conversationId, senderId, body, clientMsgId} -> {messageId, serverTimestamp}; GET /conversations/{id}/messages?cursor= -> paginated history; WebSocket channel /ws/{userId} for push delivery and receipts; POST /conversations for group creation.",
    dataModel:
      "Message{id, conversationId, senderId, body, sentAt, deliveredTo[], readBy[]} partitioned by conversationId; Conversation{id, memberIds[], lastMessageId}; per-user offline inbox keyed by userId for messages pending delivery.",
    architecture:
      "Client -> CDN/API Gateway -> Load Balancer -> stateless Chat Service (WebSocket gateway + REST) -> Message Store (partitioned DB) and Redis presence cache -> Kafka-style queue -> fan-out workers -> push notification service for offline users.",
    flowSteps:
      "Step 1: sender's client opens a persistent WebSocket to the gateway, authenticated once via token. Step 2: on send, the Chat Service writes the message durably (partitioned by conversationId) and assigns a monotonic per-conversation sequence number. Step 3: the service publishes the message to a fan-out queue keyed by conversation. Step 4: fan-out workers push to each online member's WebSocket connection immediately; offline members' messages sit in their per-user inbox. Step 5: on reconnect, the client fetches missed messages via GET /conversations/{id}/messages using the last-seen cursor.",
    scaling:
      "Partition conversations by conversationId hash across message-store shards; use consistent hashing so gateway nodes can locate a user's active WebSocket via a presence registry (Redis); scale WebSocket gateways horizontally behind a connection-aware load balancer (sticky routing by userId).",
    consistency:
      "Per-conversation message ordering is strongly consistent (single writer per partition, monotonic sequence numbers); read receipts and presence are eventually consistent and safe to lose/replay.",
    reliability:
      "Client retries sends with the clientMsgId as an idempotency key to survive dropped acks; queue consumers use at-least-once delivery with dedup by messageId; dead-letter queue captures fan-out failures for replay; gateway failure triggers client auto-reconnect with exponential backoff.",
    security:
      "TLS for all connections, per-conversation authorization checks on every read/write, rate limiting per user to prevent spam, end-to-end or at-rest encryption of message bodies, audit logging of admin/moderation actions.",
    observability:
      "Track message send-to-delivery latency (p50/p95/p99), WebSocket connection churn, queue lag, delivery failure rate, and per-shard write throughput; alert on delivery latency regressions and queue backlog growth.",
    tradeoffs:
      "Strong per-conversation ordering (single-writer partition) trades some write parallelism for correctness; push-based fan-out lowers latency but adds fan-out cost for very large groups, which can be mitigated by treating huge groups as pull-based/broadcast channels instead.",
    drawingOrder:
      "1) Client and API Gateway/LB, 2) Chat Service + WebSocket gateway, 3) Message Store partitions, 4) Presence cache, 5) Fan-out queue and workers, 6) Push notification service for offline delivery.",
    diagram: diagramBlock(
`Client(s) --WS/HTTPS--> API GW / LB --> Chat Service (stateless)
                                   |          |
                                   v          v
                        Presence Cache   Message Store (sharded by conversationId)
                                   |          |
                                   v          v
                             Fan-out Queue --> Workers --> Online: push via WS
                                                        \\-> Offline: Push Notif Service`
    ),
    example: {
      input: "User A sends a message to a 3-person group where B is online and C is offline",
      output: "B receives the message over WebSocket in <200ms; C receives it via push notification and fetches full history on reconnect",
      steps:
        "Step 1: Chat Service durably writes the message with sequence number 42 for the conversation. Step 2: The message is published to the fan-out queue. Step 3: A worker looks up presence for B (online) and C (offline) in Redis. Step 4: B's connection receives the message immediately over its WebSocket. Step 5: C's message is stored in their offline inbox and a push notification is sent; on reconnect C fetches messages after cursor=41."
    }
  },
  "topic-hld-mock-url-shortener": {
    requirements:
      "Shorten a long URL to a compact code, redirect short codes to the original URL with low latency, support custom aliases, and handle very high read (redirect) to write (create) ratio.",
    capacity:
      "100M new URLs/month (~40 writes/sec average) and a 100:1 read:write ratio -> ~4,000 redirects/sec average, higher at peak. Each mapping record is small (<1KB) -> ~100GB/year of raw mapping data, trivially cacheable.",
    apis:
      "POST /shorten {longUrl, customAlias?} -> {shortCode, shortUrl}; GET /{shortCode} -> 301/302 redirect to longUrl; DELETE /{shortCode} for owner-initiated removal.",
    dataModel:
      "UrlMapping{shortCode (PK), longUrl, createdAt, expiresAt?, ownerId?, clickCount}; shortCode generated via base62 encoding of an auto-increment ID or a hash+collision-check scheme.",
    architecture:
      "Client -> CDN (caches redirect responses where possible) -> Load Balancer -> stateless Redirect Service -> Cache (Redis, shortCode -> longUrl) -> Database (partitioned key-value or relational store) with an async write path for click analytics.",
    flowSteps:
      "Step 1: POST /shorten generates a unique shortCode (base62 of a distributed ID generator) and writes {shortCode, longUrl} to the database. Step 2: The mapping is also written into the cache proactively for hot new links. Step 3: GET /{shortCode} first checks the cache; on a hit it redirects immediately. Step 4: On a cache miss, the Redirect Service reads the database, redirects, and repopulates the cache with a TTL. Step 5: Click events are pushed asynchronously to a queue for analytics rather than blocking the redirect.",
    scaling:
      "Partition the mapping store by shortCode hash across shards; keep the cache hit rate very high (>95%) since reads dominate; use a distributed ID generator (e.g., Snowflake-style) to avoid a single point of contention for code generation.",
    consistency:
      "Writes (shorten) are strongly consistent - once created, a shortCode must never be reassigned; reads can be served from a slightly stale cache since long URLs rarely change after creation.",
    reliability:
      "Idempotent creation (same longUrl + custom alias returns the same code if retried); collision handling on custom aliases returns a clear conflict error; database replica failover keeps redirects available even if a primary write node is down.",
    security:
      "Validate and sanitize submitted URLs to block malicious redirect targets, rate-limit creation per client/IP to prevent abuse, support link expiration/revocation, and log redirect access for abuse investigation.",
    observability:
      "Monitor cache hit rate, redirect latency (p95/p99), database read/write throughput, and shortCode collision rate; alert if cache hit rate drops (indicating cache sizing or TTL issues).",
    tradeoffs:
      "Auto-increment/Snowflake IDs are simpler and collision-free but reveal creation order; hash-based codes hide order but need collision detection - the design favors ID-based generation for simplicity and guaranteed uniqueness at this read-heavy scale.",
    drawingOrder:
      "1) Client and CDN/LB, 2) Redirect Service, 3) Cache layer, 4) Partitioned database, 5) Async click-analytics queue.",
    diagram: diagramBlock(
`Client --HTTPS--> CDN/LB --> Redirect Service --> Cache (shortCode->longUrl)
                                     |                  |
                                     |  (miss)          | (hit: redirect now)
                                     v
                              DB (sharded by shortCode) --async--> Click Analytics Queue

Interview drawing order: 1) client/CDN/LB 2) redirect service 3) cache 4) sharded DB 5) async analytics queue`
    ),
    example: {
      input: "A user requests GET /abc123 for a link created 2 minutes ago",
      output: "302 redirect to the original long URL served from cache in <10ms",
      steps:
        "Step 1: Redirect Service checks Redis for key 'abc123'; it is present because the write path proactively cached it at creation time. Step 2: The service issues a 302 redirect to the cached longUrl immediately. Step 3: A click event {shortCode, timestamp, referrer} is pushed to the analytics queue asynchronously without adding latency to the redirect response."
    }
  },
  "topic-hld-mock-newsfeed": {
    requirements:
      "Generate a personalized, roughly-recency-ordered feed of posts from followed users (or nearby drivers for ride-sharing), support high write fan-out for popular accounts, and keep feed load latency low even for users following thousands of accounts.",
    capacity:
      "10M DAU, each posting ~2 times/day and following ~200 accounts -> ~20M posts/day (~230 writes/sec average); feed reads are far more frequent, ~5 feed loads/user/day -> ~50M reads/day (~580 reads/sec average, bursty at peak).",
    apis:
      "POST /posts {userId, content} -> {postId}; GET /feed?userId=&cursor= -> ranked/paginated feed items; for ride-sharing: POST /ride-requests {riderId, location} -> matched driver, GET /drivers/nearby?lat=&lng=.",
    dataModel:
      "Post{id, authorId, content, createdAt}; FeedEntry{userId, postId, score/createdAt} materialized per follower for fast reads (fan-out-on-write); Follow{followerId, followeeId} graph; for ride-sharing, Driver{id, location, status} indexed geospatially.",
    architecture:
      "Client -> LB -> stateless Feed Service -> precomputed Feed Store (per-user timeline, fan-out-on-write) backed by cache -> fallback fan-out-on-read for very high-follower accounts -> async workers handle fan-out via a queue.",
    flowSteps:
      "Step 1: a user posts; the Post Service durably stores the post. Step 2: a fan-out worker reads the author's follower list and writes a FeedEntry into each follower's precomputed timeline (fan-out-on-write) for normal accounts. Step 3: for celebrity accounts with huge follower counts, fan-out-on-write is skipped and the post is merged in at read time (fan-out-on-read) to avoid a write storm. Step 4: GET /feed reads the user's precomputed timeline, merges in any fan-out-on-read celebrity posts, ranks/paginates, and returns the result, using the cache to avoid a database hit on every load.",
    scaling:
      "Partition the feed store by userId; use a hybrid fan-out (write for normal users, read-time merge for high-follower accounts) to bound worst-case write amplification; cache hot timelines and paginate with cursors instead of offsets.",
    consistency:
      "Feed content is eventually consistent - a brief delay before a new post appears in followers' feeds is acceptable; the follow graph itself needs stronger consistency to avoid duplicate or missing fan-out targets.",
    reliability:
      "Fan-out workers process via an idempotent, retryable queue so a crashed worker can resume without duplicating entries (dedup by postId+userId); ride-sharing matching uses timeouts and reassignment if a driver doesn't confirm within a bounded window.",
    security:
      "Enforce per-post visibility/privacy rules before fan-out, authenticate all API calls, rate-limit posting to prevent spam, and geofence/anonymize location data appropriately for ride-sharing.",
    observability:
      "Track fan-out lag (post creation to appearing in follower feeds), feed load latency, queue backlog size, and (for ride-sharing) driver-match latency and match success rate; alert on fan-out lag or match latency regressions.",
    tradeoffs:
      "Pure fan-out-on-write is simple to read but explodes in write cost for celebrity accounts; pure fan-out-on-read keeps writes cheap but makes every read expensive - the hybrid approach trades implementation complexity for balanced read/write cost at scale.",
    drawingOrder:
      "1) Client and LB, 2) Feed/Post Service, 3) Follow graph store, 4) Precomputed Feed Store + cache, 5) Fan-out queue and workers, 6) Read-time merge path for high-follower accounts.",
    diagram: diagramBlock(
`Client --> LB --> Feed Service --> Feed Store (per-user, cached)
                        |                 ^
                        v                 | fan-out-on-write
                  Post Service --> Fan-out Queue --> Workers
                        |
                        \\--(celebrity posts merged at read time)--> Feed Service`
    ),
    example: {
      input: "A normal user with 300 followers posts, and a celebrity account with 5M followers posts at the same time",
      output: "The normal user's post is fanned out to all 300 follower timelines within seconds; the celebrity post is not fanned out but is merged into each follower's feed at read time",
      steps:
        "Step 1: both posts are durably stored by the Post Service. Step 2: for the normal user, a fan-out worker writes a FeedEntry to each of the 300 followers' precomputed timelines. Step 3: for the celebrity account, fan-out is skipped because the follower count exceeds the fan-out threshold. Step 4: when any follower loads their feed, the Feed Service merges in recent celebrity posts by querying the celebrity's post list directly alongside the precomputed timeline."
    }
  }
};

function buildHldMockSolution(topicId: string, title: string): { lesson: LessonSection[]; example: Example } | null {
  const spec = hldMockSolutions[topicId];
  if (!spec) return null;
  const section = (heading: string, content: string): LessonSection => ({ title: `${title}: ${heading}`, content });
  return {
    lesson: [
      section("Requirements", spec.requirements),
      section("Capacity Estimates", spec.capacity),
      section("APIs", spec.apis),
      section("Data Model", spec.dataModel),
      { title: `${title}: High-Level Architecture`, content: spec.architecture, diagram: spec.diagram },
      section("Request/Data Flow", spec.flowSteps),
      section("Scaling", spec.scaling),
      section("Consistency", spec.consistency),
      section("Reliability/Failure Handling", spec.reliability),
      section("Security", spec.security),
      section("Observability", spec.observability),
      section("Trade-offs", spec.tradeoffs),
      section("Interview Drawing Order", spec.drawingOrder)
    ],
    example: {
      title: `${title}: concrete flow walkthrough`,
      input: spec.example.input,
      output: spec.example.output,
      explanation: spec.example.steps
    }
  };
}

type LldSolutionSpec = {
  requirements: string;
  useCases: string;
  entities: string;
  apis: string;
  relationships: string;
  patterns: string;
  flow: { input: string; output: string; steps: string };
  concurrencyErrors: string;
  extensibility: string;
  tests: string;
  tradeoffs: string;
  diagram?: string;
};

const lldMockSolutions: Record<string, LldSolutionSpec> = {
  "topic-lld-mock-parking-rate-limiter": {
    requirements:
      "Support multi-level parking with distinct spot sizes (compact, large, handicap, EV), ticket-based entry/exit with computed fees, and an API-level rate limiter that caps requests per client to protect the booking service from abuse.",
    useCases:
      "A vehicle enters and is assigned the closest compatible free spot; a vehicle exits and pays based on duration; a client hammering the reservation API beyond its quota is throttled with a 429 instead of degrading the whole system.",
    entities:
      "ParkingLot (owns Levels), Level (owns ParkingSpots), ParkingSpot (size, occupied state), Vehicle (type: compact/large/motorcycle/EV), Ticket (entryTime, spotId), ParkingRate (pricing strategy), RateLimiter (per-client token state), Client (identity used as the rate-limit key).",
    apis:
      "ParkingLot.parkVehicle(vehicle) -> Ticket; ParkingLot.unparkVehicle(ticket) -> amountDue; ParkingLot.findAvailableSpot(vehicleType) -> ParkingSpot; RateLimiter.allowRequest(clientId) -> boolean; RateLimiter.getRemainingQuota(clientId) -> number.",
    relationships:
      "ParkingLot has-a list of Level (composition); Level has-a list of ParkingSpot (composition); Vehicle is parked in exactly one ParkingSpot via a Ticket (association); ParkingRate is injected into ParkingLot as a Strategy so pricing can change without touching parking logic; RateLimiter wraps the parking API entry points as a decorator/middleware, not a subclass.",
    patterns:
      "Strategy for pluggable pricing (hourly, flat, EV surcharge) and pluggable limiter algorithms (token bucket vs sliding window); Factory for creating the right ParkingSpot/Vehicle subtype; Observer so displays or apps are notified when a level becomes full or has free spots again.",
    flow: {
      input: "A compact car arrives at a lot where level 1 has spots 1-2 occupied and spot 3 free, and the requesting client has 2 of 5 requests left this window",
      output: "Ticket(level=1, spot=3, entryTime=now) is issued; the client's rate limiter quota drops to 1",
      steps:
        "Step 1: RateLimiter.allowRequest(clientId) checks the token bucket; since quota remains, the request proceeds. Step 2: ParkingLot.findAvailableSpot(\"compact\") scans levels top-down and skips occupied spots 1 and 2. Step 3: Spot 3 is selected, marked occupied, and a Ticket is created with the entry timestamp. Step 4: On exit, ParkingRate computes the fee from entryTime to exitTime and the spot is freed, notifying any Observer of the level's new availability."
    },
    concurrencyErrors:
      "Two cars racing for the same last spot must be serialized with a per-spot lock or compare-and-swap on spot state so only one Ticket is issued; a full lot must return a clear 'no spot available' error rather than issuing an invalid ticket; the rate limiter's counter update must be atomic (e.g., Redis INCR + TTL) across distributed instances to avoid two servers both admitting a request that should have been throttled.",
    extensibility:
      "Adding EV charging only requires a new ParkingSpot subtype and a pricing rule in the Strategy, not a change to the core parking algorithm; swapping the rate limiter from token bucket to sliding-window log only requires a new RateLimiter implementation behind the same interface.",
    tests:
      "Unit test: lot with only one free compact spot admits exactly one compact vehicle and rejects the next. Unit test: rate limiter allows exactly N requests per window and rejects the N+1th. Integration test: concurrent park requests for the last spot result in exactly one success and one clear rejection.",
    tradeoffs:
      "A token bucket rate limiter is simpler and bursts slightly more than a strict sliding window, but is cheaper to run at scale; a nearest-spot search is O(spots) worst case but keeps the model simple, trading a small amount of lookup time for much simpler code than a full spatial index.",
    diagram: diagramBlock(
`Class relationships (drawing order: ParkingLot -> Level -> Spot, then Strategy/limiter):

  ParkingLot --*-- Level --*-- ParkingSpot        RateLimiter (middleware, wraps API)
       |                                                   |
       + uses PricingStrategy (injected)          Client --> [RateLimiter] --> ParkingLot API

Sequence (park a vehicle):
Client -> RateLimiter.allowRequest -> ParkingLot.findAvailableSpot -> Spot(occupied=true) -> Ticket`
    )
  },
  "topic-lld-mock-library-elevator": {
    requirements:
      "Model a library that supports book checkout, return, reservation queues, and fines, alongside an elevator system that must schedule multiple cars across floors while respecting direction, capacity, and emergency overrides.",
    useCases:
      "A member checks out an available book or joins a reservation queue if it is out; an overdue return triggers a fine; a rider requests a floor and the closest compatible elevator car is dispatched using directional (SCAN-style) scheduling.",
    entities:
      "Book, Member, BookIssue (loan record), Reservation (queue entry), Fine; Elevator, Floor, ElevatorRequest, ElevatorController (dispatcher).",
    apis:
      "Library.checkout(memberId, bookId) -> BookIssue; Library.returnBook(issueId) -> Fine|null; Library.reserve(memberId, bookId) -> Reservation; ElevatorController.requestElevator(floor, direction) -> Elevator; Elevator.moveTo(floor) -> void.",
    relationships:
      "Library has-a catalog of Book and a list of Member (composition/association); a BookIssue associates one Member with one Book and carries due-date state; a Reservation queue is owned per Book (composition); ElevatorController has-a list of Elevator and assigns requests to the best candidate car; each Elevator owns its own request queue and current state.",
    patterns:
      "State pattern for Elevator (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance) so invalid transitions are impossible by construction; Strategy for the dispatch algorithm (nearest-car vs SCAN vs zone-based); Observer so the reservation queue is notified and the next member is alerted when a held book becomes available.",
    flow: {
      input: "Elevator requests arrive from floor 2 (up), floor 8 (down), and floor 5 (up) while car A is idle at floor 1 and car B is idle at floor 9",
      output: "Car A is dispatched to floor 2 then floor 5 (both up-requests on its path); car B is dispatched to floor 8",
      steps:
        "Step 1: ElevatorController receives each ElevatorRequest and scores every idle/compatible car by direction and distance. Step 2: Floor 2 and floor 5 are both 'up' requests near car A's position, so they are batched onto car A's path in floor order. Step 3: Floor 8 is closer to car B and moving down, so it is assigned to car B. Step 4: Each Elevator transitions state (Idle -> MovingUp/MovingDown -> DoorsOpen) and services its queue in floor order, never reversing direction until the queue in the current direction is empty."
    },
    concurrencyErrors:
      "Two members reserving the last copy simultaneously must be serialized so only one reservation wins the queue position; an elevator request arriving mid-dispatch must not corrupt another car's in-flight queue, so each Elevator's queue is mutated behind its own lock; a book returned while a reservation exists must atomically transition the copy from 'available' to 'held' for the next member in the queue rather than racing with a walk-in checkout.",
    extensibility:
      "Adding express elevators or a maintenance mode only requires a new State and a filter in the dispatch Strategy, not a rewrite of the controller; adding e-book holds to the library only requires a new Reservable type behind the same reservation queue interface.",
    tests:
      "Unit test: reserving an unavailable book enqueues the member in FIFO order and grants the copy in that order on return. Unit test: elevator in MovingUp state ignores a new down-request until its up-queue is empty. Integration test: two concurrent checkouts for the last copy result in exactly one success.",
    tradeoffs:
      "SCAN-style elevator dispatch reduces total wait time under load but can starve a lone far-away request briefly, versus nearest-car dispatch which is fairer per-request but less throughput-efficient; a per-book reservation queue is simple and fair but does not optimize for which waiting member is physically closest to pick up the book.",
    diagram: diagramBlock(
`Elevator state diagram (drawing order: states, then transitions):

[Idle] --request(floor,dir)--> [MovingUp/MovingDown] --arrived--> [DoorsOpen] --closed--> [Idle]
                                                                        |
                                                                  (emergency) --> [Maintenance]

Library sequence (reservation):
Member -> Library.reserve(book) -> Reservation queue (FIFO) -> notified when copy returned`
    )
  },
  "topic-lld-mock-caching-payment": {
    requirements:
      "Design an in-memory cache with bounded size and TTL sitting in front of a payment provider integration that must be idempotent, retry-safe, and resilient to downstream timeouts.",
    useCases:
      "A repeated read for the same account balance is served from cache instead of hitting the payment provider; a client retries a timed-out charge request and must not be double-charged; a provider outage should degrade gracefully rather than corrupt payment state.",
    entities:
      "Cache (bounded map with TTL/LRU eviction), CacheEntry (value + expiry), PaymentRequest (idempotencyKey, amount, account), PaymentResult, PaymentGateway (interface over the real provider), PaymentProcessor (orchestrates cache + gateway + retries).",
    apis:
      "Cache.get(key) -> value|miss; Cache.put(key, value, ttl) -> void; PaymentProcessor.charge(PaymentRequest) -> PaymentResult; PaymentGateway.submit(PaymentRequest) -> PaymentResult (implemented per provider, e.g., StripeGateway, RazorpayGateway).",
    relationships:
      "PaymentProcessor has-a Cache and has-a PaymentGateway (composition, injected as a Strategy so the concrete provider can be swapped); Cache owns a bounded set of CacheEntry objects and evicts by LRU when full or by TTL expiry; PaymentRequest and PaymentResult are immutable value objects passed between layers.",
    patterns:
      "Strategy for the PaymentGateway so Stripe, Razorpay, or PayPal implementations are interchangeable; Decorator/middleware for retry-with-backoff wrapping the gateway call; the idempotency key acts as a de-duplication token stored alongside cached results so a retried request returns the original result instead of re-charging.",
    flow: {
      input: "A client charges $50 with idempotencyKey=\"txn-42\"; the first attempt times out after the provider actually processed it, and the client retries with the same key",
      output: "The retry returns the original successful PaymentResult without submitting a second charge",
      steps:
        "Step 1: PaymentProcessor.charge checks the cache for idempotencyKey \"txn-42\"; on the first attempt it is a miss, so the request proceeds. Step 2: The gateway call times out client-side, but the provider actually completed the charge. Step 3: On retry, before calling the gateway again, PaymentProcessor first calls PaymentGateway.checkStatus(idempotencyKey) or relies on the provider's own idempotency support; the completed result is fetched and cached. Step 4: The cached PaymentResult is returned to the retrying client, guaranteeing exactly-once effect despite the earlier timeout."
    },
    concurrencyErrors:
      "Two threads processing the same idempotencyKey concurrently must be serialized (e.g., a short-lived lock keyed by idempotencyKey) so only one actually calls the gateway while the other waits and reuses the result; cache eviction under memory pressure must never evict an in-flight request's placeholder before the gateway responds, or a retry could double-submit; gateway timeouts must be treated as 'unknown outcome' and reconciled via a status check, never blindly retried as a fresh charge.",
    extensibility:
      "Swapping payment providers only requires a new PaymentGateway implementation behind the same interface; adding a second cache tier (e.g., local + distributed Redis) only requires a new Cache implementation without changing PaymentProcessor.",
    tests:
      "Unit test: a repeated charge with the same idempotency key never invokes the gateway twice. Unit test: cache entries expire after their TTL and force a fresh gateway call. Integration test: simulated gateway timeout followed by retry yields exactly one successful charge and one cached result.",
    tradeoffs:
      "Caching payment results speeds up repeated reads but introduces a staleness window that must be bounded by a short TTL for anything balance-related; idempotency keys add client complexity but are the only safe way to make retries non-destructive across an unreliable network.",
    diagram: diagramBlock(
`Sequence (retry-safe charge, drawing order: client, processor, cache, gateway):

Client --charge(idempotencyKey)--> PaymentProcessor --check cache--> [Cache]
                                          |  (miss/expired)
                                          v
                                   PaymentGateway.submit() --timeout--> (unknown outcome)
                                          |
                                 checkStatus(idempotencyKey) --completed--> cache result --> return to client`
    )
  }
};

function buildLldMockSolution(topicId: string, title: string): { lesson: LessonSection[]; example: Example } | null {
  const spec = lldMockSolutions[topicId];
  if (!spec) return null;
  const section = (heading: string, content: string): LessonSection => ({ title: `${title}: ${heading}`, content });
  return {
    lesson: [
      section("Requirements & Clarifications", spec.requirements),
      section("Use Cases", spec.useCases),
      section("Entities & Responsibilities", spec.entities),
      { title: `${title}: Interfaces/APIs`, content: spec.apis, codeExample: spec.apis },
      { title: `${title}: Class Relationships & Diagram`, content: spec.relationships, diagram: spec.diagram },
      section("Key Design Patterns", spec.patterns),
      section("Concurrency & Error Handling", spec.concurrencyErrors),
      section("Extensibility", spec.extensibility),
      section("Tests", spec.tests),
      section("Trade-offs", spec.tradeoffs)
    ],
    example: {
      title: `${title}: concrete flow walkthrough`,
      input: spec.flow.input,
      output: spec.flow.output,
      explanation: spec.flow.steps,
      diagram: spec.diagram
    }
  };
}

// Build a rich, topic-specific FAQ set instead of the generic 3-question
// fallback. HLD FAQs cover requirements changes, capacity math, bottlenecks,
// API/data model, cache/queue/partitioning, consistency/availability, failure
// recovery, security/observability, and trade-offs. LLD FAQs cover
// why/when to use the pattern, alternatives/trade-offs, SOLID/OOP
// implications, UML/class relationships, concurrency/thread safety,
// extensibility, and testing. Content is derived from each topic's own
// authored spec (mock solution, generic HLD solution, or lesson/intuition)
// so answers stay topic-specific rather than generic filler.
const primerSourceLinks = {
  hld: { label: "ashishps1/awesome-system-design-resources", url: "https://github.com/ashishps1/awesome-system-design-resources" },
  lld: { label: "ashishps1/awesome-low-level-design", url: "https://github.com/ashishps1/awesome-low-level-design" },
  algomasterUrlShortener: {
    label: "AlgoMaster: Design a URL Shortener",
    url: "https://algomaster.io/learn/system-design/url-shortener"
  }
};

function buildHldFaq(
  title: string,
  intuition: string,
  complexity: { time: string; space: string },
  mock: HldMockSpec | null
): FaqItem[] {
  const track = "HLD interview practice notes";
  if (mock) {
    return [
      {
        question: `What happens to the ${title} design if the traffic assumptions in the capacity estimate turn out to be 10x higher?`,
        answer: `Re-derive the numbers rather than hand-waving: ${mock.capacity} At 10x, re-check whether the cache hit rate, shard count, and queue throughput in the plan still hold, and call out which layer (cache, database shard, or queue) would saturate first.`,
        source: track,
        category: "Capacity",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `What are the core API contracts for ${title} and what should the error responses look like?`,
        answer: `${mock.apis} Beyond the happy path, the interviewer expects explicit error handling: validation errors (4xx), conflict/duplicate errors, and rate-limit responses (429) so the API is safe to retry.`,
        source: track,
        category: "APIs",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `Where is the first bottleneck likely to appear in the ${title} architecture, and how do you relieve it?`,
        answer: `${mock.scaling} Identify the bottleneck by tracing the request path in the architecture (${mock.architecture}) and naming the first component that cannot be scaled horizontally without a design change.`,
        source: track,
        category: "Bottlenecks",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `What consistency model does ${title} need, and where can you get away with eventual consistency?`,
        answer: mock.consistency,
        source: track,
        category: "Consistency",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `How does ${title} recover when a downstream dependency (cache, database replica, or queue) fails?`,
        answer: mock.reliability,
        source: track,
        category: "Reliability",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `What security and observability concerns are specific to ${title}?`,
        answer: `${mock.security} Operationally: ${mock.observability}`,
        source: track,
        category: "Security & Observability",
        sourceLinks: [primerSourceLinks.hld]
      },
      {
        question: `What is the key trade-off in the ${title} design, and what would you change it to under different constraints?`,
        answer: mock.tradeoffs,
        source: track,
        category: "Trade-offs",
        sourceLinks: [primerSourceLinks.hld, primerSourceLinks.algomasterUrlShortener]
      },
      {
        question: `How would you explain the requirement-by-requirement build-up for ${title} to an interviewer?`,
        answer: `${mock.requirements} Walk through each requirement and the component it drives, in the drawing order: ${mock.drawingOrder}`,
        source: track,
        category: "Requirements",
        sourceLinks: [primerSourceLinks.hld]
      }
    ];
  }
  return [
    {
      question: `What clarifying questions should you ask before designing ${title}?`,
      answer: `Confirm scale (daily/peak active users), the read/write ratio, latency and availability targets, and which invariant must never be violated. For ${title}, this framing changes whether ${intuition.toLowerCase()}`,
      source: track,
      category: "Requirements",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `How would you estimate capacity for ${title} from a rough DAU number?`,
      answer: `Start from daily/peak active users, multiply by an assumed action rate per user, and convert to requests/sec; then multiply average payload size by write volume to size storage. State the assumption out loud so the interviewer can push back on it, then relate it to the ${complexity.space} space profile of this design.`,
      source: track,
      category: "Capacity",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `Where is the most likely bottleneck in a ${title} system at scale?`,
      answer: `The layer that cannot be trivially horizontally scaled (a single-writer database, a hot shard, or an unbounded fan-out) is the first bottleneck. Name it explicitly and propose the mitigation (partitioning, caching, or async processing) before the interviewer asks.`,
      source: track,
      category: "Bottlenecks",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `What should the API and data model look like for ${title}?`,
      answer: `Expose versioned endpoints for the primary read/write operations, require an idempotency key on writes, and model the durable entity with a stable key plus the fields the read path needs indexed. Keep the schema minimal; add fields only when a stated requirement needs them.`,
      source: track,
      category: "APIs",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `When should ${title} use a cache, a queue, or partitioning - and how do you decide?`,
      answer: `Cache when reads vastly outnumber writes and slight staleness is acceptable; queue when work can be done asynchronously without blocking the caller; partition when a single node's storage or throughput would otherwise exceed capacity. Justify each choice against the specific read/write ratio for ${title}.`,
      source: track,
      category: "Scaling",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `Does ${title} need strong consistency, and where can eventual consistency be safe?`,
      answer: `Anything tied to money, uniqueness, or a user-visible invariant (e.g., a code or slot being assigned twice) needs strong consistency on the write path. Derived or denormalized views (feeds, counters, analytics) can be eventually consistent since a brief staleness window rarely breaks the product.`,
      source: track,
      category: "Consistency",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `How should ${title} degrade gracefully during a partial outage?`,
      answer: `Apply timeouts, bounded retries with backoff, and circuit breakers so a slow dependency does not cascade; keep a degraded read path (e.g., serve stale cache) rather than failing the whole request; and route failed async work to a dead-letter queue for replay instead of dropping it.`,
      source: track,
      category: "Reliability",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `What is the central trade-off an interviewer expects you to articulate for ${title}?`,
      answer: `${intuition} State explicitly what you are giving up (e.g., some write latency, some storage cost, or some consistency) in exchange for the property the design optimizes for (${complexity.time}), rather than presenting the design as if it had no downside.`,
      source: track,
      category: "Trade-offs",
      sourceLinks: [primerSourceLinks.hld, primerSourceLinks.algomasterUrlShortener]
    }
  ];
}

function buildLldFaq(
  title: string,
  intuition: string,
  mock: LldSolutionSpec | null
): FaqItem[] {
  const track = "LLD interview practice notes";
  if (mock) {
    return [
      {
        question: `Why choose the design patterns used in ${title}, and what did you reject?`,
        answer: mock.patterns,
        source: track,
        category: "Patterns",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `What are the core class relationships in ${title} and how would you diagram them in an interview?`,
        answer: mock.relationships,
        source: track,
        category: "UML & Relationships",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `What entities and responsibilities make up ${title}?`,
        answer: mock.entities,
        source: track,
        category: "Responsibilities",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `What are the key API/interface signatures for ${title}?`,
        answer: mock.apis,
        source: track,
        category: "Interfaces",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `What concurrency or thread-safety issues does ${title} need to handle?`,
        answer: mock.concurrencyErrors,
        source: track,
        category: "Concurrency",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `How would you extend ${title} with a new requirement without breaking existing code?`,
        answer: mock.extensibility,
        source: track,
        category: "Extensibility",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `How would you test ${title} to prove the design is correct?`,
        answer: mock.tests,
        source: track,
        category: "Testing",
        sourceLinks: [primerSourceLinks.lld]
      },
      {
        question: `What is the main design trade-off in ${title}?`,
        answer: mock.tradeoffs,
        source: track,
        category: "Trade-offs",
        sourceLinks: [primerSourceLinks.lld]
      }
    ];
  }
  return [
    {
      question: `When should you reach for the approach behind ${title}, and when is it overkill?`,
      answer: `${intuition} Apply it when the requirement explicitly needs the flexibility or invariant it provides; if the system is small and unlikely to change along that axis, a simpler direct implementation (YAGNI) is the better interview answer.`,
      source: track,
      category: "Patterns",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What alternative designs exist for ${title}, and why prefer this one?`,
      answer: `Name at least one simpler alternative (e.g., a conditional/if-else chain instead of a Strategy, or a single class instead of a hierarchy) and explain the specific extensibility or testability requirement that tips the balance toward the ${title} approach instead.`,
      source: track,
      category: "Trade-offs",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `Which SOLID principle is most relevant to ${title}, and how does the design honor it?`,
      answer: `Identify the responsibility boundary the design protects (e.g., Open-Closed if new variants should not require editing existing classes, or Dependency Inversion if a concrete implementation is injected behind an interface) and point to the specific class relationship that enforces it.`,
      source: track,
      category: "SOLID & OOP",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `How would you draw the UML class or sequence diagram for ${title} on a whiteboard?`,
      answer: `Start with the core entities and their composition/association relationships, then add the interface(s) that decouple the parts likely to vary. Follow with a short sequence diagram for the primary flow so the interviewer can see the runtime interaction, not just the static structure.`,
      source: track,
      category: "UML & Relationships",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What concurrency issues should you flag for ${title} even if the interviewer doesn't ask?`,
      answer: `Identify any shared mutable state (a counter, a queue, a shared resource pool) that two threads could touch at once, and state how it is protected (a lock, an atomic operation, or an immutable value object) - this shows you think past the single-threaded happy path.`,
      source: track,
      category: "Concurrency",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `How would you extend ${title} to support a new variant without editing existing classes?`,
      answer: `Point to the exact interface or abstract class new variants would implement, and confirm no existing class needs modification - only a new implementation registered behind the existing seam (factory, strategy, or similar).`,
      source: track,
      category: "Extensibility",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What tests would prove ${title} is implemented correctly?`,
      answer: `Write a unit test for the core invariant in isolation, a test for the boundary/edge case (empty, full, or concurrent conflict), and one integration-style test that exercises the primary flow end-to-end through the public API.`,
      source: track,
      category: "Testing",
      sourceLinks: [primerSourceLinks.lld]
    }
  ];
}

function enrichTopic(topic: Topic): Topic {
  const title = topic.title.trim();
  const module = syllabus.find((entry) => entry.id === topic.moduleId);
  const track = module?.track || (topic.moduleId.includes("hld") ? "HLD" : topic.moduleId.includes("lld") ? "LLD" : "DSA");
  const complexity = topic.complexity || {
    time: track === "HLD" ? "Depends on request path and storage strategy" : "Depends on the selected operation",
    space: track === "HLD" ? "Depends on retained data and replication" : "Depends on the data structure state"
  };
  const lesson = topic.lesson && topic.lesson.length > 0
    ? topic.lesson
    : [
        {
          title: `${title}: core model`,
          content: `${topic.intuition} Relate each state change to the ${track} interview requirement before choosing an implementation.`,
          codeExample: `// ${title}\n// identify inputs, state, transitions, and the invariant`
        },
        {
          title: `${title}: interview walkthrough`,
          content: `For ${title}, explain the contract first, trace one concrete case, then discuss the boundary conditions and the trade-off represented by ${complexity.time}.`,
          codeExample: `// contract -> concrete trace -> edge cases -> complexity`
        }
      ];
  const examples = topic.examples && topic.examples.length > 0
    ? topic.examples
    : [
        {
          title: `${title}: concrete trace`,
          input: `A representative ${title} case with its key boundary condition`,
          output: `The ${title} invariant is preserved after each transition`,
          explanation: `${topic.intuition} Start with the initial state, apply the operation one step at a time, and verify the result against the expected ${track} behavior.`
        }
      ];
  const hldMockSolution = track === "HLD" ? buildHldMockSolution(topic.id, title) : null;
  const hldSolution = track === "HLD" && !hldMockSolution ? buildHldSolution(title, topic.intuition) : null;
  const lldMockSolution = track === "LLD" ? buildLldMockSolution(topic.id, title) : null;
  const completeLesson = hldMockSolution
    ? [...lesson, ...hldMockSolution.lesson]
    : hldSolution
      ? [...lesson, hldSolution.lesson]
      : lldMockSolution
        ? [...lesson, ...lldMockSolution.lesson]
        : lesson;
  const completeExamples = hldMockSolution
    ? [...examples, hldMockSolution.example]
    : hldSolution
      ? [...examples, hldSolution.example]
      : lldMockSolution
        ? [...examples, lldMockSolution.example]
        : examples;
  const tips = topic.tips && topic.tips.length > 0
    ? topic.tips
    : [
        `Name the invariant that makes ${title} correct.`,
        `Trace ${title} with an empty input, the smallest valid input, and a boundary case.`,
        `Choose the representation that supports the operation described by ${topic.intuition.toLowerCase()}.`
      ];
  const tricks = topic.tricks && topic.tricks.length > 0
    ? topic.tricks
    : [
        `For ${title}, challenge the first approach with the constraint that drives ${complexity.time}.`,
        `When explaining ${title}, separate state transitions from the final result.`,
        `Use the worked trace to expose duplicates, ordering, concurrency, or failure behavior before coding.`
      ];
  const memoryAids = topic.memoryAids && topic.memoryAids.length > 0
    ? topic.memoryAids
    : [`${title}: model the state, preserve the invariant, validate the boundary case.`, `${track} cue: requirement -> state -> transition -> trade-off.`];
  const interviewPatterns = topic.interviewPatterns && topic.interviewPatterns.length > 0
    ? topic.interviewPatterns
    : [
        `Explain when ${title} is the right tool and what constraint rules it out.`,
        `Walk through the concrete trace for ${title} before writing code or drawing components.`,
        `Defend ${complexity.time} time and ${complexity.space} space in the interview.`
      ];
  const references: Reference[] = topic.references && topic.references.length > 0
    ? topic.references
    : [
        {
          source: track === "DSA" ? "leetcode" : "interview-experience",
          attribution: track === "DSA" ? `${title} practice set` : `${track} interview design prompt`,
          insight: `Use ${title} to practice the ${track} trade-offs described by the topic intuition.`
        },
        {
          source: "note",
          attribution: `${track} study notes`,
          insight: `Review the state, failure modes, and complexity of ${title} after each practice run.`
        }
      ];
  const practiceProblems = topic.practiceProblems && topic.practiceProblems.length > 0
    ? topic.practiceProblems
    : [`practice-${topic.id}-core`, `practice-${topic.id}-edge-case`];
  const faq = topic.faq && topic.faq.length > 0
    ? topic.faq
    : track === "HLD"
      ? buildHldFaq(title, topic.intuition, complexity, hldMockSolution ? hldMockSolutions[topic.id] : null)
      : track === "LLD"
        ? buildLldFaq(title, topic.intuition, lldMockSolution ? lldMockSolutions[topic.id] : null)
        : [
        {
          question: `When should I reach for ${title} in an interview?`,
          answer: `Pick ${title} when the interviewer's constraints match the trade-off it is built for: ${complexity.time} time and ${complexity.space} space. State the constraint out loud, then justify the choice instead of jumping straight to code.`,
          source: `${track} interview practice notes`
        },
        {
          question: `What is the most common mistake candidates make with ${title}?`,
          answer: `Candidates often skip stating the invariant and jump to implementation. Walk through a concrete trace first, confirm the boundary case, and only then write code so the interviewer can follow your reasoning.`,
          source: `${track} interview practice notes`
        },
        {
          question: `How do I defend the complexity of ${title} if challenged?`,
          answer: `Explain what operation dominates the cost and why no cheaper representation satisfies the same constraints. Reference the concrete trace to show where the ${complexity.time} bound comes from.`,
          source: `${track} interview practice notes`
        }
      ];

  return {
    ...topic,
    lesson: completeLesson,
    examples: completeExamples,
    tips,
    tricks,
    memoryAids,
    interviewPatterns,
    references,
    practiceProblems,
    faq,
    complexity
  };
  /*
  const fallbackTitle = topic.title || "Topic";
  const words = fallbackTitle.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  const keyWord = words[0] || "pattern";
  const lowerTitle = fallbackTitle.toLowerCase();
  const defaultLesson = [
    {
      title: "Core idea",
      content:
        lowerTitle.includes("singleton")
          ? `A singleton is only appropriate when the system truly needs a single shared instance, such as a logger or config object. The real interview question is how you protect lifecycle, threading, and global state.`
          : lowerTitle.includes("factory")
            ? `A factory abstracts object creation so the caller depends on an interface instead of concrete classes. The key is to centralize creation logic while keeping the client code simple and extensible.`
            : lowerTitle.includes("observer")
              ? `The observer pattern is about a subject notifying multiple listeners when state changes. The interview focus is on loose coupling, event flow, and clear subscription lifecycle.`
              : lowerTitle.includes("cache") || lowerTitle.includes("rate limiter")
                ? `This design decision is about protecting the system under load. You should talk about access patterns, invalidation, and the cost of stale data versus performance.`
                : lowerTitle.includes("load balancing") || lowerTitle.includes("replication") || lowerTitle.includes("consistency")
                  ? `This design asks where the bottleneck is and which trade-off is worth making. Use traffic estimates and explain how capacity, failure handling, and data freshness interact.`
                  : `For ${fallbackTitle}, the real interview skill is clarifying responsibilities, identifying the core state, and choosing the cleanest abstraction before you optimize or code.`,
      codeExample:
        lowerTitle.includes("singleton")
          ? `class Logger {\n  static instance;\n  private constructor() {}\n  static getInstance() {\n    if (!Logger.instance) Logger.instance = new Logger();\n    return Logger.instance;\n  }\n}`
          : lowerTitle.includes("factory")
            ? `class VehicleFactory {\n  static create(type) {\n    if (type === 'car') return new Car();\n    return new Bike();\n  }\n}`
            : lowerTitle.includes("cache") || lowerTitle.includes("rate limiter")
              ? `// policy -> quota / TTL / invalidation\n// hot path -> cache miss -> fallback -> retry policy`
              : `// clarify requirements\n// define responsibilities\n// choose abstraction\n// validate edge cases`
    },
    {
      title: "Interview execution",
      content: `Walk through ${fallbackTitle} as a design conversation, not as a code dump. State the requirement, mention the key constraints, and explain why the chosen abstraction or architectural decision is the right fit for this problem. In a good FAANG answer, you define the contract before you define the implementation.`,
      codeExample: `// requirements\n// key entities\n// failure behavior\n// trade-offs\n// scale decisions`
    },
    {
      title: "Edge cases & failure modes",
      content: `Test invalid states, concurrency issues, stale data, failure recovery, and scale-out behavior before calling ${fallbackTitle} complete. If your design fails at scale or under partial outage, it is not ready for a FAANG-level interview answer.`,
      codeExample: `// invalid state\n// retry path\n// concurrency\n// stale data or load spike\n// degraded mode`
    }
  ];
  return {
    ...topic,
    lesson: topic.lesson && topic.lesson.length > 0 ? topic.lesson : defaultLesson,
    examples: topic.examples,
    methodology: topic.methodology,
    workedExample: topic.workedExample,
    complexity: topic.complexity,
    tips:
      topic.tips && topic.tips.length > 0
        ? topic.tips
        : [
            `State the problem in your own words before choosing an approach for ${fallbackTitle}.`,
            "Handle edge cases and constraints before optimising the solution.",
            "Explain the time and space trade-off clearly while talking through the interview.",
            "In system design, identify the bottleneck before proposing a cache, queue, or replica."
          ],
    tricks:
      topic.tricks && topic.tricks.length > 0
        ? topic.tricks
        : [
            `Recognise the invariant for ${fallbackTitle}: what stays true after each step?`,
            `Start from a brute-force idea, then optimise once the pattern is obvious.`,
            `Use a small dry run to verify correctness before coding.`,
            `If a strongly consistent answer is required, say so explicitly and name the trade-off.`
          ],
    memoryAids:
      topic.memoryAids && topic.memoryAids.length > 0
        ? topic.memoryAids
        : [
            `Remember: ${fallbackTitle} usually reduces to state tracking, ordering, or boundary checks.`,
            `If the input is large, think in terms of scanning once, using a map, or using a monotonic structure.`,
            `${keyWord.charAt(0).toUpperCase() + keyWord.slice(1)} -> pattern -> prove -> code.`,
            `For system design: requirement -> traffic -> bottleneck -> trade-offs -> decision.`
          ],
    interviewPatterns:
      topic.interviewPatterns && topic.interviewPatterns.length > 0
        ? topic.interviewPatterns
        : [
            `Explain the brute-force solution for ${fallbackTitle} before the optimized one.`,
            "Walk the interviewer through the state changes and the reasoning behind the chosen data structure.",
            "Discuss edge cases, invariants, and complexity trade-offs before coding.",
            "For HLD, explain traffic assumptions, bottlenecks, and failure handling before drawing a final architecture."
          ],
    references:
      topic.references && topic.references.length > 0
        ? topic.references
        : [
            {
              source: "leetcode",
              attribution: "LeetCode",
              insight: `Core FAANG-style practice for ${fallbackTitle}.`
            },
            {
              source: "note",
              attribution: "NeetCode / TakeUForward style notes",
              insight: `Interview drill for understanding the ${fallbackTitle.toLowerCase()} pattern and trade-offs.`
            }
          ],
    practiceProblems:
      topic.practiceProblems && topic.practiceProblems.length > 0
        ? topic.practiceProblems
        : [`lc-${fallbackTitle.toLowerCase().replace(/\s+/g, "-")}`]
  };
  */
}

function collect(...sources: Topic[][]): Topic[] {
  const seen = new Set<string>();
  const result: Topic[] = [];
  for (const source of sources) {
    for (const topic of source) {
      if (seen.has(topic.id)) continue;
      if (!validModuleIds.has(topic.moduleId)) continue;
      seen.add(topic.id);
      result.push(enrichTopic(topic));
    }
  }
  return result;
}

export const allDsaTopics = ensureModuleCoverage(
  collect(
    dsaTopics,
    comprehensiveDsaTopics,
    dsaTopicsExtended,
    expandedDsaTopics,
    arrayFoundationTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-") && syllabus.some((m) => m.id === t.moduleId))
  ),
  syllabus.filter((m) => m.track === "DSA").map((m) => m.id)
);

export const allLldTopics = ensureModuleCoverage(
  collect(
    lldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-lld"))
  ),
  syllabus.filter((m) => m.track === "LLD").map((m) => m.id)
);
export const allHldTopics = ensureModuleCoverage(
  collect(
    hldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-hld"))
  ),
  syllabus.filter((m) => m.track === "HLD").map((m) => m.id)
);
export const allAiTopics = ensureModuleCoverage(
  collect(aiTopics),
  syllabus.filter((m) => m.track === "AI").map((m) => m.id)
);
export const allTopics: Topic[] = [...allDsaTopics, ...allLldTopics, ...allHldTopics, ...allAiTopics];

export const topicsByModule: Record<string, Topic[]> = syllabus.reduce(
  (acc, mod) => {
    acc[mod.id] = allTopics.filter((t) => t.moduleId === mod.id);
    return acc;
  },
  {} as Record<string, Topic[]>
);

// ===== GOOGLE CHEAT SHEET REFERENCE TOPICS =====
// Add Google DSA problems as a reference resource
export const googleCheatSheetTopics: Topic[] = [
  {
    id: "topic-google-cheat-sheet-reference",
    moduleId: "mod-interview-foundations",
    title: "Google DSA Interview C++ Cheat Sheet (100+ Problems)",
    intuition: "Quick reference for Google's curated DSA problems organized by category with C++ implementations, patterns, and interview tips.",
    lesson: [
      {
        title: "What is the Google DSA Cheat Sheet?",
        content: `The Google DSA Interview C++ Cheat Sheet is a comprehensive collection of 100+ medium to hard interview problems organized by algorithmic category. Each problem includes:
- C++ code templates and solutions
- Time and space complexity analysis  
- Key insights and common mistakes
- Pattern classification and LeetCode references

This resource accelerates learning by providing battle-tested implementations and highlighting interview patterns.`,
        codeExample: googleCheatSheetReference.commonPatterns.slice(0, 3).map(p => `// Pattern: ${p}`).join("\n")
      },
      {
        title: "How to Use This Resource",
        content: `1. Study the Quick Reference Code Templates section - master each pattern before solving problems
2. Review problems by category to strengthen weak areas
3. For each problem: read description → understand pattern → compare with template → optimize solution
4. Track which patterns appear across multiple problems (meta-learning)
5. Before interviews: do a quick review of all templates in this cheat sheet`,
        codeExample: `// Interview prep workflow:
// 1. Clarify problem constraints
// 2. Identify the pattern (use this cheat sheet)
// 3. Write template solution
// 4. Test with examples
// 5. Optimize and explain tradeoffs`
      }
    ],
    examples: [
      {
        title: "Using the Cheat Sheet During Problem Solving",
        input: "Problem: Find two numbers that sum to target (LeetCode #1)",
        output: "Use Hash Map template with O(n) time complexity",
        explanation: `Step 1: Recognize this is a "pair" problem
Step 2: Recall Hash Map pattern from cheat sheet
Step 3: Apply template: iterate, check complement in map, store as you go
Step 4: Verify: handles duplicates, negative numbers, edge cases
Step 5: Explain: Why O(n) hash map beats O(n log n) sort for one-pass solution`
      }
    ],
    tips: [
      "Memorize the quick reference templates - they appear in 80% of interview problems",
      "Each template solves an entire family of problems, not just one",
      "Common mistakes are listed for each problem - use them as edge case checklist",
      "Time/space tradeoffs in cheat sheet reflect interviewer expectations",
      "Combine multiple templates for complex problems (e.g., BFS + Topological Sort)"
    ],
    tricks: [
      "When stuck on a problem, scan the 'Pattern' column to find similar solved problems",
      "Use 'Common Mistakes' section as your edge case validation checklist",
      "Before coding in an interview, reference template to ensure clean implementation",
      "Problems are organized by category - review entire category to see pattern variations",
      "C++ templates show optimal complexity - use these as target for your solutions"
    ],
    memoryAids: [
      "Hash Map → Frequency/pair problems | Two Pointers → Sorted/palindrome problems",
      "Sliding Window → Subarray/substring problems | DFS → Tree/path problems",
      "BFS → Shortest path (unweighted) | DP → Optimization/counting problems",
      "Binary Search → Searching in answer space | Union-Find → Connectivity problems",
      "The 11 common patterns in cheat sheet cover ~95% of all interview coding problems"
    ],
    interviewPatterns: [
      "Quickly identify problem category and recall template",
      "Write template first, then customize for specific problem",
      "Explain why chosen pattern is optimal before coding",
      "Test with edge cases from 'Common Mistakes' section",
      "Reference cheat sheet memory aids when explaining to interviewer"
    ],
    references: [
      {
        source: "note",
        attribution: "Google DSA Interview C++ Cheat Sheet",
        insight: `Complete collection of ${googleDsaProblems.length} curated interview problems with templates and patterns.`
      },
      {
        source: "blog",
        attribution: "Google Interview Preparation",
        insight: "These patterns are what Google interviewers expect to see in your approach and code."
      }
    ],
    complexity: { time: "Reference material", space: "N/A" }
  },

  // Topic for each category in the cheat sheet
  {
    id: "topic-google-arrays-strings-problems",
    moduleId: "mod-arrays-strings",
    title: "Google DSA Problems: Arrays & Strings Collection",
    intuition: "Master frequency maps, two pointers, sliding windows, and prefix sums through Google's curated array/string problems.",
    lesson: [
      {
        title: "Google Array & String Problems Overview",
        content: `Google regularly asks array and string problems that test:
1. Hash map fluency (frequency counting, pair finding)
2. Two pointer technique (palindromes, containers, sorted pairs)
3. Sliding window (subarray/substring optimization)
4. Prefix/suffix reasoning (range queries, product arrays)

The cheat sheet includes 10 carefully selected problems (Easy → Hard) that demonstrate each pattern.`,
        codeExample: `// 10 Google Array & String Problems:
// Easy: Two Sum, Valid Palindrome
// Medium: Longest Substring, Container With Most Water
// Hard: Trapping Rain Water, Minimum Window Substring`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Arrays Strings")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "See LeetCode problem page",
        output: "Optimal solution approach",
        explanation: `Pattern: ${p.pattern}\nKey Insight: ${p.keyInsights[0]}\nComplexity: ${p.timeComplexity} time, ${p.spaceComplexity} space`
      })),
    tips: googleDsaProblems
      .filter(p => p.category === "Arrays Strings")
      .flatMap(p => p.keyInsights)
      .slice(0, 5),
    tricks: [
      "Always check if array is sorted (affects pointer strategy)",
      "Frequency map queries are O(1) - use this for optimization",
      "Sliding window pointer movements: expand right, contract left when condition met",
      "Two pointer techniques: same direction, opposite ends, or one fast one slow"
    ],
    memoryAids: [
      "Frequency questions? → Hash Map (One pass O(n))",
      "Sorted array? → Two Pointers (O(1) space)",
      "Subarray/substring? → Sliding Window (Avoid nested loops)",
      "Range queries? → Prefix Sum (Precompute for O(1) queries)"
    ],
    practiceProblems: googleDsaProblems.filter(p => p.category === "Arrays Strings").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  },

  // Trees & Graphs problems from Google cheat sheet
  {
    id: "topic-google-trees-graphs-problems",
    moduleId: "mod-graphs",
    title: "Google DSA Problems: Trees & Graphs Collection",
    intuition: "Master DFS, BFS, topological sort, and tree algorithms through Google's interview problems.",
    lesson: [
      {
        title: "Google Trees & Graphs Problems Overview",
        content: `Google's tree and graph problems test:
1. DFS mastery (trees, graphs, backtracking)
2. BFS correctness (shortest path, level-order)
3. Cycle detection and topological sorting
4. Tree properties (LCA, path sums, serialization)

The cheat sheet includes 15 problems covering these core patterns.`,
        codeExample: `// 15 Google Tree & Graph Problems:
// Medium: Islands, LCA, Course Schedule, Word Ladder
// Hard: Binary Tree Max Path, Serialize/Deserialize, Word Ladder`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Trees Graphs")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "See LeetCode problem page",
        output: "Optimal solution using cheat sheet template",
        explanation: `Pattern: ${p.pattern}\nKey: ${p.keyInsights[0]}\nComplexity: ${p.timeComplexity} time`
      })),
    tips: googleDsaProblems
      .filter(p => p.category === "Trees Graphs")
      .flatMap(p => p.keyInsights)
      .slice(0, 5),
    practiceProblems: googleDsaProblems.filter(p => p.category === "Trees Graphs").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  },

  // DP problems from Google cheat sheet
  {
    id: "topic-google-dp-problems",
    moduleId: "mod-dynamic-programming",
    title: "Google DSA Problems: Dynamic Programming Collection",
    intuition: "Master 1D and 2D DP patterns through Google's optimization and state-transition problems.",
    lesson: [
      {
        title: "Google DP Problems Overview",
        content: `Google's DP problems focus on:
1. State definition and transitions
2. Base cases and recurrence relations
3. Space optimization (1D vs 2D vs O(1))
4. Recognizing DP in disguise (greedy looks like DP)

The cheat sheet includes 10+ DP problems from easy to hard.`,
        codeExample: `// Google DP Problem Categories:
// Classic: House Robber, Coin Change, LCS
// String: Edit Distance, Regex Matching
// Grid: Unique Paths, Minimum Cost Path`
      }
    ],
    examples: googleDsaProblems
      .filter(p => p.category === "Dynamic Programming")
      .slice(0, 2)
      .map(p => ({
        title: `${p.title} (${p.difficulty})`,
        input: "DP state problem - see LeetCode",
        output: "Optimal subproblem solution",
        explanation: `Pattern: ${p.pattern}\nRecurrence: See template in cheat sheet\nKey: ${p.keyInsights[0]}`
      })),
    tips: [
      "Always define state clearly before coding: dp[i] = ?",
      "Write base cases first, then recurrence",
      "Test recurrence with small examples on paper",
      "Optimize space only after correctness is verified"
    ],
    practiceProblems: googleDsaProblems.filter(p => p.category === "Dynamic Programming").map(p => `google-${p.leetcodeId.toLowerCase()}`)
  }
];

// Add Google cheat sheet topics to the main export
export const allTopicsWithGoogle: Topic[] = [...allTopics, ...googleCheatSheetTopics];

// Export only google cheat sheet topics for reference
export const topicsByGoogleCategory = {
  "Arrays & Strings": googleCheatSheetTopics.filter(t => t.id === "topic-google-arrays-strings-problems"),
  "Trees & Graphs": googleCheatSheetTopics.filter(t => t.id === "topic-google-trees-graphs-problems"),
  "Dynamic Programming": googleCheatSheetTopics.filter(t => t.id === "topic-google-dp-problems"),
};

// Helper: Get all Google problems for a specific module
export const getGoogleProblemsForModule = (moduleId: string) => {
  return googleDsaProblems.filter(p => {
    const categoryToModule: Record<string, string> = {
      "Arrays Strings": "mod-arrays-strings",
      "Trees Graphs": "mod-graphs",
      "Dynamic Programming": "mod-dynamic-programming",
      "Recent 2024-2025": "mod-interview-foundations",
    };
    return categoryToModule[p.category as keyof typeof categoryToModule] === moduleId;
  });
};

// For backward compatibility, export allTopics with google content merged
export { allTopicsWithGoogle as allTopicsEnhanced };
