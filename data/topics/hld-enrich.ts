// HLD-specific enrichment: mock-interview solution specs and source-derived
// enrichment for non-mock topics. Only imported by data/topics/hld.ts.
import { Example, FaqItem, LessonSection, Topic } from "../syllabus";
import { diagramBlock, primerSourceLinks } from "./shared";
import { TrackEnricher } from "./enrich";

function escapeSvgText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function diagramLabel(text: string, limit = 30): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return escapeSvgText(normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized);
}

function buildHldEvidenceDiagram(topic: Topic, title: string): string {
  const lessonTitle = topic.lesson?.[0]?.title || "Authored design decision";
  const outcome = topic.examples?.[0]?.output || topic.intuition;
  const box = (x: number, y: number, w: number, h: number, text: string, fill: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="#38bdf8" stroke-width="1.5" />` +
    `<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="12" fill="#e2e8f0">${text}</text>`;
  const arrow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#67e8f9" stroke-width="2" marker-end="url(#hldArrow)" />`;
  return (
    `<svg viewBox="0 0 760 190" width="100%" height="auto" role="img" aria-label="Authored design evidence map for ${escapeSvgText(title)}">` +
    `<title>${escapeSvgText(title)}: authored requirement, design evidence, and outcome</title>` +
    `<defs><marker id="hldArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#67e8f9" /></marker></defs>` +
    `<rect x="0" y="0" width="760" height="190" fill="transparent" />` +
    box(25, 70, 190, 52, diagramLabel(title), "#0f172a") +
    box(285, 70, 190, 52, diagramLabel(lessonTitle), "#0e2a3f") +
    box(545, 70, 190, 52, diagramLabel(outcome), "#1e1b4b") +
    arrow(215, 96, 283, 96) +
    arrow(475, 96, 543, 96) +
    `<text x="25" y="155" font-family="Segoe UI, sans-serif" font-size="11" fill="#94a3b8">Authored focus -> authored design evidence -> authored expected result</text>` +
    `</svg>`
  );
}

function hasAuthoredDiagram(topic: Topic): boolean {
  return (topic.lesson || []).some((section) => section.diagram?.trim()) ||
    (topic.examples || []).some((example) => example.diagram?.trim());
}

function buildHldTopicSupplement(topic: Topic, title: string): { lesson: LessonSection[] } | null {
  if (hasAuthoredDiagram(topic)) return null;
  const lesson = topic.lesson?.[0];
  const example = topic.examples?.[0];
  const evidence = lesson ? `${lesson.title}: ${lesson.content}` : topic.intuition;
  const flow = example
    ? `Authored scenario: ${example.input}. Expected result: ${example.output}. Walkthrough: ${example.explanation}`
    : `Authored design focus: ${topic.intuition}`;
  return {
    lesson: [{
      title: `${title}: authored design evidence`,
      content:
        `Requirement and scope: ${topic.intuition}\n\n` +
        `Primary design evidence: ${evidence}\n\n` +
        `Concrete data flow: ${flow}\n\n` +
        `Stated cost or capacity boundary: ${topic.complexity?.time || "not separately quantified"} time/throughput and ${topic.complexity?.space || "not separately quantified"} retained state.`,
      diagram: buildHldEvidenceDiagram(topic, title)
    }]
  };
}

export type HldMockSpec = {
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

function compact(text: string, limit = 1400): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function hldLessonEvidence(topic: Topic, keywords: string[], fallbackIndex: number): string {
  const lessons = topic.lesson || [];
  const match = lessons.find((section) => {
    const text = `${section.title} ${section.content}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
  const section = match || lessons[Math.min(fallbackIndex, Math.max(lessons.length - 1, 0))];
  if (!section) return topic.intuition;
  const code = section.codeExample ? ` Concrete contract/example: ${section.codeExample}` : "";
  return compact(`${section.title}: ${section.content}${code}`);
}

function hldExampleEvidence(topic: Topic): string {
  const example = topic.examples?.[0];
  if (!example) return topic.intuition;
  return compact(`Scenario: ${example.input}. Expected result: ${example.output}. Flow: ${example.explanation}`);
}

function buildHldFaq(
  topic: Topic,
  title: string,
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
  const requirements = hldLessonEvidence(topic, ["requirement", "goal", "use case"], 0);
  const dataFlow = hldExampleEvidence(topic);
  const storage = hldLessonEvidence(topic, ["data", "storage", "database", "cache", "index"], 1);
  const scaling = hldLessonEvidence(topic, ["scale", "capacity", "throughput", "partition", "shard", "load"], 1);
  const consistency = hldLessonEvidence(topic, ["consisten", "reliab", "failure", "failover", "replica"], 1);
  const tradeoff = hldLessonEvidence(topic, ["trade-off", "tradeoff", "latency", "availability", "cost"], 0);
  return [
    {
      question: `What requirement and scope are actually authored for ${title}?`,
      answer: `${topic.intuition} Supporting evidence: ${requirements}`,
      source: track,
      category: "Requirements",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `What concrete request or data flow demonstrates ${title}?`,
      answer: `${topic.intuition} ${dataFlow}`,
      source: track,
      category: "Data Flow",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `Which storage or data-model decision is relevant to ${title}?`,
      answer: `${topic.intuition} Authored storage/data evidence: ${storage}`,
      source: track,
      category: "Data & Storage",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `Which authored constraint drives scale or capacity decisions for ${title}?`,
      answer: `${scaling} The source records the cost boundary as ${topic.complexity?.time || "not separately quantified"} time/throughput and ${topic.complexity?.space || "not separately quantified"} retained state.`,
      source: track,
      category: "Capacity & Scaling",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `What consistency or reliability evidence is present for ${title}?`,
      answer: `${topic.intuition} Authored consistency/reliability evidence: ${consistency}`,
      source: track,
      category: "Consistency & Reliability",
      sourceLinks: [primerSourceLinks.hld]
    },
    {
      question: `What trade-off does the authored material expose for ${title}?`,
      answer: `${topic.intuition} Authored trade-off evidence: ${tradeoff}`,
      source: track,
      category: "Trade-offs",
      sourceLinks: [primerSourceLinks.hld, primerSourceLinks.algomasterUrlShortener]
    }
  ];
}

export const hldEnricher: TrackEnricher = {
  buildSolution: (topic, title) => {
    const mock = buildHldMockSolution(topic.id, title);
    if (mock) return mock;
    return buildHldTopicSupplement(topic, title);
  },
  buildFaq: (topic, title) =>
    buildHldFaq(topic, title, hldMockSolutions[topic.id] || null)
};
