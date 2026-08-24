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
        title: "Definition & clarifying questions",
        content: "A URL shortener takes a long URL and returns a short alias that redirects to it when visited. Before designing, clarify the ambiguous requirements out loud: Can a user pick a custom alias? Do links expire? Do we need click analytics? Is there an authenticated owner per link, or are links anonymous? These answers change the data model and the write path, so an interviewer expects you to ask before assuming.",
        codeExample: "Clarify: custom alias allowed? expiration/TTL? analytics needed? auth required? max URL length?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: given a long URL, generate a unique short code and store the mapping; given a short code, redirect to the original URL; optionally support custom aliases, expiration, and click analytics. Non-functional: the redirect path must be very low latency (well under 100ms) and highly available, since it sits on the read-hot path; the system must be able to generate unique codes without collisions at high write volume; storage must scale to billions of mappings; the service should degrade gracefully rather than fail outright under load.",
        codeExample: "Functional: shorten(url) -> code; redirect(code) -> url; optional custom alias, TTL, analytics\\nNon-functional: low redirect latency, high availability, no collisions at scale, horizontal scalability"
      },
      {
        title: "Back-of-envelope estimates",
        content: "Assume 100M new URLs shortened per month and a 100:1 read/write ratio typical of link-sharing products. Writes: 100M / (30 * 24 * 3600) is about 39 URLs/sec average; provision for 5-10x burst, so roughly 200-400 writes/sec at peak. Reads: 100:1 ratio gives about 3,900 redirects/sec average, with peak bursts into the tens of thousands/sec for viral links. Storage: 100M new rows/month * 500 bytes/row (URL text + metadata + indexes) is about 50GB/month, or roughly 3TB over 5 years, which comfortably fits on standard relational or NoSQL storage with room to spare. These numbers justify a cache-first, read-optimized design rather than a write-optimized one.",
        codeExample: "Writes: 100M/mo -> ~39/sec avg -> ~200-400/sec peak\\nReads: 100:1 ratio -> ~3,900/sec avg -> tens of thousands/sec peak (viral link)\\nStorage: ~50GB/month -> ~3TB over 5 years"
      },
      {
        title: "APIs",
        content: "Two primary endpoints cover the core functionality, with clear request/response contracts and explicit error cases so a client knows exactly how to behave on failure.",
        codeExample:
          "POST /api/v1/urls\\nRequest: { \"longUrl\": \"https://example.com/very/long/path\", \"customAlias\": \"optional\", \"expiresAt\": \"optional-ISO8601\" }\\nResponse 201: { \"shortUrl\": \"https://short.ly/abc123\", \"longUrl\": \"...\", \"expiresAt\": null }\\nErrors: 400 invalid URL, 409 alias already taken, 422 URL exceeds max length\\n\\nGET /{code}\\nResponse: 301/302 redirect with Location header set to the long URL\\nErrors: 404 code not found or expired, 410 Gone if explicitly deactivated"
      },
      {
        title: "Requirement-driven architecture",
        content: "Because reads dominate by roughly 100:1, the architecture optimizes the redirect path first: a CDN/edge layer and an in-memory cache absorb the vast majority of redirect traffic before it ever reaches the database. The write path (shortening a URL) is comparatively rare, so it can afford slightly more work per request: unique ID generation, collision checking for custom aliases, and a durable write. A message queue decouples non-critical side effects (click analytics, link-preview generation) from the hot redirect path so they never add latency to a user's redirect.",
        codeExample: "Client -> CDN/Edge cache -> Load Balancer -> Redirect Service -> Cache (Redis) -> DB (on miss)\\n                                              |\\n                                        Shorten Service -> ID Generator -> DB (write)\\n                                              |\\n                                        Queue -> Analytics/Link-preview workers (async)"
      },
      {
        title: "Component responsibilities",
        content: "Load balancer: distributes traffic across stateless service instances and performs health checks. Shorten service: validates the input URL, generates or accepts a custom code, checks for collisions, and persists the mapping. ID/code generator: produces a unique numeric ID (via a counter service, a range allocator, or a distributed ID scheme) that is base62-encoded into a short, URL-safe code. Redirect service: looks up a code, preferring cache, and issues the HTTP redirect. Cache (Redis): stores hot code -> URL mappings with a bounded TTL/LRU policy. Database: the durable system of record for all mappings, indexed by code for O(1) lookups. Queue and workers: process analytics events and any expensive post-processing without blocking the redirect response.",
        codeExample: "LB -> health checks + routing\\nShorten service -> validate + generate code + persist\\nID generator -> unique ID -> base62 encode\\nRedirect service -> cache lookup -> DB fallback -> redirect\\nCache -> hot code->URL, TTL/LRU\\nDB -> durable mapping, indexed by code\\nQueue/workers -> async analytics, link previews"
      },
      {
        title: "Database choice and schema",
        content: "A relational database (e.g. Postgres/MySQL) is a reasonable default: the data model is simple (one row per mapping), the volume is moderate (a few TB over years, not petabytes), and a unique index on the short code gives fast point lookups. If write volume or storage need to scale far beyond what a single relational primary can hold, a key-value or wide-column NoSQL store (e.g. DynamoDB, Cassandra) partitioned by short code is a natural alternative, since the access pattern is single-key lookups with no joins. Either way, the code column needs a unique index, and expiration can be enforced with a TTL column plus either background cleanup or a native TTL feature.",
        codeExample: "Table urls (or partitioned key-value store):\\n  code        VARCHAR(10) PRIMARY KEY / partition key\\n  long_url    TEXT\\n  created_at  TIMESTAMP\\n  expires_at  TIMESTAMP NULL\\n  owner_id    BIGINT NULL\\n  click_count BIGINT DEFAULT 0  -- updated async via queue, not on the hot path"
      },
      {
        title: "Bottlenecks and how they are resolved",
        content: "The two realistic bottlenecks are: (1) a single hot short code receiving a disproportionate share of traffic (a viral link), which is resolved by keeping hot entries pinned in cache with a longer TTL and letting cold entries fall out under LRU pressure; and (2) ID generation becoming a serialization point under high write concurrency, which is resolved by using a distributed ID scheme (pre-allocated ID ranges per service instance, or a Snowflake-style generator) instead of a single global auto-increment counter, so no single component has to serialize every write.",
        codeExample: "Hot link -> pin in cache with longer TTL, evict cold entries first\\nID generation contention -> pre-allocate ID ranges per instance or use a Snowflake-style generator, not one global counter"
      },
      {
        title: "Reliability, security, and analytics",
        content: "Reliability: the redirect service should serve a degraded but correct response (e.g. from a stale cache entry) rather than a hard failure if the database is briefly unavailable, since redirects tolerate a little staleness far better than an outage. Security: validate and sanitize submitted URLs to prevent open-redirect abuse or malicious link injection, rate-limit the shorten endpoint per user/IP to prevent spam, and consider a malicious-URL blocklist check before accepting a new mapping. Analytics: click counts and referrer data are updated asynchronously via the queue so they never add latency to the redirect itself; an eventually-consistent counter is an acceptable trade-off here.",
        codeExample: "Reliability: cache-stale-ok on DB miss > hard failure\\nSecurity: validate/sanitize URL, rate-limit shorten endpoint, blocklist check\\nAnalytics: click events -> queue -> async counter update (eventual consistency is fine)"
      },
      {
        title: "Trade-offs",
        content: "301 (permanent) redirects let browsers cache the redirect, reducing repeat load on the service, but they make it impossible to change the destination or track every click; 302 (temporary) redirects always hit the server, costing more load but preserving full click tracking and the ability to change the destination later. Base62 encoding of a sequential ID is simple and compact but leaks the creation order and total link count; a randomized code (with a collision check) hides that information at the cost of an extra lookup on write. The interview answer should name the choice explicitly and justify it against the stated requirements rather than picking one silently.",
        codeExample: "301 -> browser-cached, less server load, no click tracking\\n302 -> always hits server, full click tracking, easy to repoint\\nSequential+base62 -> simple, but leaks volume/order\\nRandom code+collision check -> hides volume, small extra write cost"
      }
    ],
    examples: [
      {
        title: "Create flow: shortening a new URL",
        input: "POST /api/v1/urls with { longUrl: \"https://example.com/a/very/long/path?x=1\" }",
        output: "201 Created with { shortUrl: \"https://short.ly/8kQ2p1\" }, mapping persisted durably",
        explanation: "Step 1: The shorten service validates the URL format and length. Step 2: It requests a unique ID from the ID generator (a pre-allocated range or Snowflake-style generator, not a single global counter). Step 3: The ID is base62-encoded into a short code (or a custom alias is checked for uniqueness instead). Step 4: The mapping (code -> longUrl) is written durably to the database. Step 5: The response returns the short URL to the client; a link-preview/analytics event is optionally published to the queue for async processing, but the client does not wait on that.",
        diagram: asciiDiagram(
`Interview drawing order: 1) client 2) shorten service 3) ID generator 4) DB 5) queue (async, dotted)

Client --POST /urls--> [Shorten Service] --alloc ID--> [ID Generator]
                              |                              |
                              |<---- unique ID (base62) ------
                              |
                              +--write code->longUrl-------> [Database]
                              |
                              +- - (async) - -> [Queue] -> [Analytics/Preview Workers]
                              |
Client <--201 {shortUrl}-----+`
        )
      },
      {
        title: "Redirect flow: cache hit vs cache miss",
        input: "GET /8kQ2p1 arrives at the redirect service twice: once when the entry is not yet cached, once after it is",
        output: "First request costs one DB read plus a cache write (~10-20ms); every subsequent request is served from cache (~1-2ms) until the TTL expires",
        explanation: "Step 1 (cache miss, first request): the redirect service checks Redis for the code, finds nothing, and reads the mapping from the database. Step 2: it writes the mapping into Redis with a bounded TTL before responding, so the next lookup is fast. Step 3: it returns a 301/302 redirect to the long URL. Step 4 (cache hit, subsequent requests): the redirect service finds the code in Redis directly and responds immediately without touching the database at all. Step 5: this is why the system's read-heavy 100:1 ratio is handled almost entirely by the cache layer, and the database only sees a small fraction of total redirect traffic.",
        diagram: asciiDiagram(
`Interview drawing order: 1) client 2) redirect service 3) cache 4) DB (only on miss)

CACHE MISS (first time):                       CACHE HIT (subsequent):
Client -> [Redirect Svc] -> [Cache] MISS       Client -> [Redirect Svc] -> [Cache] HIT
                 |               |                            |               |
                 |<--- miss -----+                             |<-- longUrl ---+
                 v                                             v
             [Database] --longUrl-->                    301/302 redirect
                 |                                       (DB never touched)
                 +--populate cache (TTL)-->[Cache]
                 v
          301/302 redirect`
        )
      }
    ],
    tips: ["Read-heavy design = cache aggressively", "Use 301 for permanent redirects or 302 for temporary redirects, and state the trade-off explicitly", "Handle code collisions and deduplication with a distributed ID scheme, not one global counter", "Consider vanity/custom aliases only if the business case requires the extra uniqueness check"],
    references: [
      { source: "interview-experience", attribution: "System Design Interview", insight: "Cache strategy and QPS estimation are key." },
      { source: "note", attribution: "AlgoMaster - System Design: URL Shortener (https://algomaster.io/practice/system-design-url-shortener)", insight: "Used as the structural reference for the requirements -> estimates -> APIs -> architecture -> flows -> trade-offs framing; prose and diagrams here are original." }
    ],
    practiceProblems: []
  },

  {
    id: "topic-hld-news-feed",
    moduleId: "mod-hld-design-exercises",
    title: "News Feed / Social Network",
    intuition: "Each user has followers, posts to feed, followers see posts. Billions of users, trillions of posts.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A news feed shows each user a reverse-chronological or ranked stream of posts from accounts they follow. Before designing, clarify: is the feed strictly chronological or ranked by an algorithm? Can users have millions of followers (celebrity case)? Do we need to support media attachments and comments in-line? Is there a read-receipt or 'seen' requirement? These answers decide whether push fan-out is even viable for every user.",
        codeExample: "Clarify: chronological or ranked? celebrity accounts (millions of followers)? media in feed? real-time or eventually-consistent ok?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: a user can post content; a user can follow/unfollow other users; a user can view a feed composed of recent posts from followed accounts, ordered by time or rank. Non-functional: feed reads must be fast (under ~200ms) since they are the most frequent action in the product; the system must tolerate a small amount of staleness (a post appearing a few seconds late is acceptable); it must handle extreme fan-out skew (a celebrity with 100M followers posting once) without falling over; storage and compute must scale horizontally with user growth.",
        codeExample: "Functional: post(content), follow(userId), getFeed(userId) -> ranked/chronological posts\\nNon-functional: <200ms feed reads, eventual consistency acceptable, handle extreme fan-out skew, horizontal scale"
      },
      {
        title: "Back-of-envelope estimates",
        content: "Assume 500M daily active users, each posting on average 0.5 times/day and reading their feed 10 times/day. Writes: 500M * 0.5 / 86,400 is about 2,900 posts/sec average, bursting higher during peak hours. Reads: 500M * 10 / 86,400 is about 57,900 feed reads/sec average, confirming a read:write ratio of roughly 20:1, which justifies caching feeds rather than recomputing them per request. Fan-out cost: an average user has, say, 300 followers, so a push model generates 2,900 posts/sec * 300 = ~870,000 feed-cache writes/sec on average - manageable - but a single celebrity post to 100M followers would instantly generate 100M fan-out writes, which must be handled differently (see hybrid model below).",
        codeExample: "Writes: 500M DAU * 0.5 posts/day -> ~2,900 posts/sec avg\\nReads: 500M * 10 views/day -> ~57,900 feed reads/sec avg (20:1 read:write)\\nAvg fan-out: 2,900/sec * 300 followers -> ~870K feed-cache writes/sec\\nCelebrity fan-out: 1 post * 100M followers -> needs pull, not push"
      },
      {
        title: "APIs",
        content: "The core contract separates posting, following, and reading, with explicit pagination and error handling so clients can page through a feed reliably.",
        codeExample:
          "POST /api/v1/posts\\nRequest: { \"authorId\": \"u1\", \"text\": \"...\", \"mediaUrls\": [] }\\nResponse 201: { \"postId\": \"p123\", \"createdAt\": \"...\" }\\nErrors: 400 empty/invalid content, 413 media too large\\n\\nPOST /api/v1/follow { \"followerId\": \"u1\", \"followeeId\": \"u2\" } -> 204\\nErrors: 404 user not found, 409 already following\\n\\nGET /api/v1/feed?userId=u1&cursor=abc&limit=20\\nResponse 200: { \"posts\": [...], \"nextCursor\": \"def\" }\\nErrors: 401 unauthenticated"
      },
      {
        title: "Requirement-driven architecture",
        content: "Because reads dominate 20:1 and users expect a fast feed, the architecture precomputes feeds for most users (push/fan-out-on-write) and stores them in a feed cache, so a read is a cheap lookup rather than an expensive query across every followed account. Because a small number of celebrity accounts would make push fan-out prohibitively expensive, those accounts are excluded from push and instead merged in at read time (fan-out-on-read/pull), giving a hybrid model that handles both the common case and the extreme outlier gracefully.",
        codeExample: "Post Service -> writes post to DB -> publishes fan-out event to Queue\\nQueue -> Fan-out Workers -> write postId into each follower's Feed Cache (for normal accounts)\\nCelebrity accounts -> skip push -> merged at read time by Feed Service\\nFeed Service -> read from Feed Cache + pull celebrity posts -> merge, sort, return"
      },
      {
        title: "Component responsibilities",
        content: "Post service: validates and persists new posts, then emits a fan-out event. Follow graph store: stores follower/followee edges, queried both to fan out a new post and to pull celebrity posts at read time. Queue and fan-out workers: consume post events and write the post reference into every normal follower's feed cache entry, spreading the write cost over time instead of blocking the post call. Feed cache: a per-user sorted list of recent post references (typically the last few hundred), read on every feed view. Feed service: on a read, merges the cached feed with any pulled celebrity posts, sorts, paginates, and returns the result.",
        codeExample: "Post Service -> validate + persist + emit fan-out event\\nFollow Graph Store -> follower/followee edges\\nQueue + Fan-out Workers -> async write postId into follower feed caches\\nFeed Cache -> per-user sorted recent post refs\\nFeed Service -> merge cache + celebrity pulls -> sort -> paginate"
      },
      {
        title: "Data model and schema",
        content: "Posts are stored once in a durable store keyed by post ID, with the author ID and timestamp indexed for celebrity pull queries. The follow graph is stored as an edge list, indexed both by follower (to fan out) and by followee (to pull). The feed cache is a separate, ephemeral store optimized for fast per-user reads, holding only post references, not full post content, so a post edit does not require rewriting every follower's cache entry.",
        codeExample: "Post{id, authorId, text, mediaUrls, createdAt}  -- indexed by (authorId, createdAt)\\nFollowEdge{followerId, followeeId, createdAt}  -- indexed both directions\\nFeedCache[userId] -> sorted list of {postId, createdAt}  -- references only, TTL-bounded, capped length"
      },
      {
        title: "Bottlenecks and scaling",
        content: "The primary bottleneck is celebrity fan-out, solved by the hybrid push/pull split described above. A secondary bottleneck is the follow graph itself becoming hot for very popular accounts; this is mitigated by sharding the graph store by user ID and caching follower-count-heavy lookups. Feed cache size is bounded (e.g. last 500 post references per user) to keep memory predictable, with older entries falling back to a database query if a user scrolls further than the cached window.",
        codeExample: "Celebrity fan-out -> hybrid push/pull, not pure push\\nFollow graph hot spots -> shard by user ID, cache heavy lookups\\nFeed cache size -> bounded window (e.g. 500 posts), older history falls back to DB query"
      },
      {
        title: "Consistency, reliability, security, and observability",
        content: "Consistency: feed visibility is eventually consistent by design - a follower may see a new post a few seconds after it is created, which is an acceptable trade-off for availability and throughput. Reliability: if a fan-out worker crashes mid-batch, the queue's at-least-once delivery combined with an idempotent fan-out write (checking if the postId is already in the follower's cache) prevents duplicate or lost fan-out. Security: enforce that only followers (or public visibility) can see a post, and rate-limit posting to prevent spam. Observability: monitor fan-out queue lag (a leading indicator of feed staleness), feed cache hit rate, and p95/p99 feed read latency.",
        codeExample: "Consistency: eventual, feed lag measured in seconds, acceptable trade-off\\nReliability: idempotent fan-out write + at-least-once queue delivery\\nSecurity: visibility check per post, rate-limit posting\\nObservability: fan-out queue lag, feed cache hit rate, p95/p99 read latency"
      },
      {
        title: "Trade-offs",
        content: "Pure push (fan-out-on-write) gives the fastest possible reads but fails catastrophically for celebrity accounts and wastes writes on inactive followers who may never view their feed. Pure pull (fan-out-on-read) avoids wasted writes and handles celebrities trivially, but every feed read becomes an expensive multi-account query, which is too slow for the common case. The hybrid model accepts the added complexity of two code paths in exchange for good performance in both the common case and the extreme outlier, which is why nearly every large-scale feed system converges on it.",
        codeExample: "Pure push -> fastest reads, fails on celebrity fan-out, wastes writes on inactive followers\\nPure pull -> no wasted writes, celebrity-safe, slow reads at scale\\nHybrid -> extra complexity, but fast reads + celebrity-safe + no wasted writes"
      }
    ],
    examples: [
      {
        title: "Normal user posts: push fan-out",
        input: "A user with 300 followers creates a new post",
        output: "The post is persisted once, then asynchronously written into 300 followers' feed caches within a second or two",
        explanation: "Step 1: The post service validates and persists the post, returning success to the author immediately. Step 2: A fan-out event is published to the queue rather than fanning out synchronously. Step 3: Fan-out workers read the follower list and write the post reference into each follower's feed cache. Step 4: Any follower who opens their feed after this point sees the new post from cache with no extra query cost. Step 5: The author's own post-creation latency was not affected by the fan-out work at all, since it happens asynchronously.",
        diagram: asciiDiagram(
`Interview drawing order: 1) client 2) post service 3) DB 4) queue 5) fan-out workers 6) feed caches

Client --POST /posts--> [Post Service] --persist--> [Post DB]
                              |
                              +--publish fan-out event--> [Queue]
                                                              |
                                                              v
                                                     [Fan-out Workers]
                                                              |
                                        writes postId into each follower's cache
                                                              v
                                              [Follower A Cache] [Follower B Cache] ...`
        )
      },
      {
        title: "Celebrity posts: hybrid pull at read time",
        input: "A celebrity with 100M followers posts once; a follower opens their feed a minute later",
        output: "The celebrity's post is never pushed to 100M caches; instead it is merged into each follower's feed on demand when they read it",
        explanation: "Step 1: The post service persists the celebrity's post but the fan-out step explicitly skips push for accounts above a follower-count threshold. Step 2: When a follower requests their feed, the feed service reads their normal cached feed and separately queries the small set of celebrity accounts they follow for recent posts. Step 3: The two result sets are merged and sorted before returning to the client. Step 4: This bounds the read-time cost to 'a handful of celebrity lookups' rather than causing a 100M-write fan-out storm, which is the concrete mechanism that makes the hybrid model viable at this scale.",
        diagram: asciiDiagram(
`Interview drawing order: 1) client 2) feed service 3) feed cache (normal) 4) celebrity pull path 5) merge

Client --GET /feed--> [Feed Service] --read--> [Feed Cache: cached normal-account posts]
                             |
                             +--query recent posts for followed celebrity accounts--> [Post DB / Celebrity Post Cache]
                             |
                             +--merge + sort + paginate--> Client`
        )
      }
    ],
    tips: ["Push for active/normal users, pull for celebrity accounts - name the hybrid explicitly", "Cache post references, not full post content, so edits don't require rewriting every cache entry", "Bound the feed cache window; fall back to a DB query for deep scroll history", "Feed staleness of a few seconds is an acceptable, explicit trade-off for availability and throughput"],
    references: [
      { source: "interview-experience", attribution: "Facebook System Design", insight: "Feed generation at Facebook's scale is a massive engineering challenge." },
      { source: "note", attribution: "AlgoMaster - System Design: News Feed structural framing (requirements -> estimates -> architecture -> flows -> trade-offs)", insight: "Used only as a structural template; all prose and diagrams here are original." }
    ],
    practiceProblems: []
  },

  {
    id: "topic-hld-messaging-chat",
    moduleId: "mod-hld-design-exercises",
    title: "Messaging / Chat System",
    intuition: "Real-time messaging between users. Billions of users, millions concurrent. Ensure messages delivered reliably.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A chat system lets users exchange messages in real time, with delivery even when the recipient is temporarily offline. Clarify up front: 1:1 only, or also group chat? Is message ordering per-conversation strictly required? Do we need read receipts and typing indicators? What is the acceptable delivery latency for an online recipient? These answers decide whether a simple queue-per-user suffices or a more elaborate presence and fan-out system is needed.",
        codeExample: "Clarify: 1:1 and/or group? strict per-conversation ordering? read receipts/typing indicators? target online delivery latency?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: send a message to a conversation (1:1 or group); receive messages in real time while online; retrieve message history with pagination; deliver missed messages on reconnect. Non-functional: online delivery latency under ~200ms; messages must not be lost even if a server crashes mid-delivery; message order within a conversation must be preserved; the system must scale to millions of concurrent open connections, which is a different scaling axis than request throughput.",
        codeExample: "Functional: sendMessage(conversationId, body), receive in real time, getHistory(cursor), deliver-on-reconnect\\nNon-functional: <200ms online delivery, no message loss, per-conversation order, millions of concurrent connections"
      },
      {
        title: "Back-of-envelope estimates",
        content: "Assume 200M daily active users, 20% concurrently online at peak (~40M concurrent WebSocket connections), each sending an average of 20 messages/day. Message volume: 200M * 20 / 86,400 is about 46,300 messages/sec average, with peak bursts several times higher. Storage: each message averages ~200 bytes (text + metadata); 200M * 20 messages/day * 200 bytes is about 800GB/day, or roughly 290TB/year, which needs a horizontally partitioned store rather than a single database instance. Connection memory: 40M concurrent WebSocket connections at roughly 10KB of server-side state each is about 400GB of connection state, which must be spread across many connection-handling servers, not run on a single box.",
        codeExample: "DAU 200M, 20% online -> ~40M concurrent connections\\nMessages: 200M*20/86,400 -> ~46,300 msgs/sec avg\\nStorage: ~800GB/day, ~290TB/year -> partitioned store required\\nConnection memory: 40M * ~10KB -> ~400GB spread across many connection servers"
      },
      {
        title: "APIs",
        content: "A WebSocket channel handles real-time send/receive, while REST endpoints handle history retrieval and conversation setup, each with explicit error handling for offline/duplicate cases.",
        codeExample:
          "WebSocket /ws/{userId}\\nClient -> Server: { \"type\": \"send\", \"conversationId\": \"c1\", \"body\": \"hi\", \"clientMsgId\": \"uuid\" }\\nServer -> Client: { \"type\": \"ack\", \"messageId\": \"m123\", \"serverTimestamp\": \"...\" } or delivered push to recipient\\n\\nGET /api/v1/conversations/{id}/messages?cursor=abc&limit=50\\nResponse 200: { \"messages\": [...], \"nextCursor\": \"def\" }\\nErrors: 403 not a conversation member, 404 conversation not found"
      },
      {
        title: "Requirement-driven architecture",
        content: "Because delivery must work whether the recipient is online or not, every message is first written to a durable, ordered message log, and only then delivered - either pushed immediately via an open WebSocket if the recipient is online, or left for retrieval when they reconnect. Because the system must scale to tens of millions of concurrent connections, dedicated connection-gateway servers hold the WebSocket state and are looked up via a user-to-server routing table, decoupling connection management from message processing.",
        codeExample: "Client --WebSocket--> [Connection Gateway] --route lookup--> [User->Gateway Registry (Redis)]\\n[Connection Gateway] --publish--> [Message Service] --write--> [Message Log/DB]\\n[Message Service] --if recipient online--> push via recipient's Connection Gateway\\n[Message Service] --if recipient offline--> mark pending, deliver on reconnect"
      },
      {
        title: "Component responsibilities",
        content: "Connection gateway: holds the long-lived WebSocket per online user and forwards inbound/outbound frames; stateless in the sense that any gateway instance can serve any user, as long as the registry tracks which instance currently holds that user's connection. User-to-gateway registry (Redis): maps userId to the specific gateway instance and connection ID currently serving them, updated on connect/disconnect. Message service: validates, assigns a server timestamp and sequence position, writes to the durable log, and decides whether to push immediately or queue for later delivery. Message log/database: the durable, ordered system of record per conversation, partitioned by conversation ID. Presence service: tracks online/offline/typing state, backed by the same fast cache used for routing.",
        codeExample: "Connection Gateway -> holds WebSocket, forwards frames\\nUser->Gateway Registry (Redis) -> userId -> gateway instance + connection id\\nMessage Service -> validate + timestamp + persist + route (push or queue)\\nMessage Log/DB -> durable, ordered, partitioned by conversationId\\nPresence Service -> online/offline/typing state"
      },
      {
        title: "Data model and schema",
        content: "Messages are stored per conversation with a monotonically increasing sequence number so ordering is well-defined even if server timestamps have clock skew. A per-user pending-delivery marker (or a per-conversation read cursor) tracks how far each participant has consumed the log, which drives both the offline-delivery-on-reconnect flow and read receipts.",
        codeExample: "Message{id, conversationId, senderId, body, seq, sentAt}  -- partitioned by conversationId, ordered by seq\\nConversation{id, memberIds[], lastSeq}\\nReadCursor{userId, conversationId, lastReadSeq}  -- drives offline delivery + read receipts"
      },
      {
        title: "Bottlenecks and scaling",
        content: "The primary bottleneck is connection state at scale (tens of millions of open sockets), addressed by horizontally scaling connection-gateway instances and keeping the user-to-gateway mapping in a fast, shared registry rather than in memory on a single node. A secondary bottleneck is hot conversations (large group chats), addressed by partitioning the message log by conversation ID and, for very large groups, treating fan-out similarly to the news feed's push/pull hybrid.",
        codeExample: "Connection scale -> horizontally scaled gateways + shared registry (Redis), not one big server\\nHot/large group conversations -> partition log by conversationId; very large groups mirror push/pull hybrid fan-out"
      },
      {
        title: "Consistency, reliability, security, and observability",
        content: "Consistency: message order within a conversation is strongly guaranteed via the sequence number; cross-conversation ordering is not guaranteed and does not need to be. Reliability: a client-provided idempotency key (clientMsgId) prevents duplicate sends on retry; if a gateway crashes, the registry entry expires and the client reconnects to a new gateway, resuming from its last acknowledged sequence number. Security: authenticate the WebSocket connection at handshake time, authorize that the sender is a member of the conversation before accepting a message, and encrypt messages in transit (and optionally end-to-end). Observability: monitor message delivery latency (send-to-ack), gateway connection counts per instance, queue/log lag for offline delivery, and reconnect churn rate.",
        codeExample: "Consistency: strict per-conversation order via seq number, no cross-conversation guarantee\\nReliability: clientMsgId idempotency + resume-from-lastSeq on reconnect\\nSecurity: authenticated handshake, per-conversation membership check, transport encryption\\nObservability: send-to-ack latency, connections per gateway, offline-delivery lag, reconnect churn"
      },
      {
        title: "Trade-offs",
        content: "WebSockets give the lowest latency and most efficient real-time delivery but require holding significant per-connection server memory and more complex infrastructure (sticky routing, presence tracking) than plain HTTP polling. Storing every message in a durable log before delivery adds a small amount of write latency compared to a fire-and-forget push, but it is what makes offline delivery and message history possible at all, so the design accepts that cost.",
        codeExample: "WebSocket -> lowest latency, higher connection-memory + infra cost, vs polling -> simpler infra, higher latency/waste\\nDurable log before push -> small extra write latency, but enables offline delivery + history"
      }
    ],
    examples: [
      {
        title: "User A sends to user B while B is online",
        input: "A and B are both connected to different connection-gateway instances",
        output: "The server routes the message to B's active connection and writes the message to the durable log",
        explanation: "Step 1: A sends to its connection gateway. Step 2: The message service validates authentication and rate limits, then assigns a sequence number and writes the event to the durable message log. Step 3: It looks up B's current gateway via the registry. Step 4: It pushes the event to B's WebSocket through that gateway. Step 5: It updates presence and sends a delivery ack back to A. This shows the difference between a messaging system and a generic queue: durability first, then real-time push.",
        diagram: asciiDiagram(
`Interview drawing order: 1) sender 2) sender's gateway 3) message service 4) log 5) registry 6) recipient's gateway 7) recipient

A --send--> [Gateway A] --forward--> [Message Service] --persist(seq)--> [Message Log]
                                              |
                                              +--lookup B's gateway--> [Registry: userId->gateway]
                                              |
                                              +--push--> [Gateway B] --deliver--> B
                                              |
A <--ack------------------------------------+`
        )
      },
      {
        title: "B is offline, then reconnects",
        input: "User B is not connected, and the app has 20 pending messages when B comes back online",
        output: "Messages are delivered once B reconnects, in order, without duplicates",
        explanation: "Step 1: While B is offline, the message service still writes every incoming message to B's conversation log; there is no separate 'offline queue' data structure, just the same durable log. Step 2: B's read cursor tracks the last sequence number they have consumed. Step 3: When B reconnects, the client requests all messages with seq greater than its last known cursor. Step 4: The server returns them in order and B's client updates its cursor as it acknowledges each one. Step 5: Because delivery is driven by comparing sequence numbers rather than a fragile in-memory queue, no messages are lost or duplicated across a reconnect.",
        diagram: asciiDiagram(
`Interview drawing order: 1) B reconnects 2) gateway 3) message service 4) read cursor 5) log 6) ordered replay

B --reconnect--> [Gateway] --auth--> [Message Service]
                                          |
                                          +--read B's cursor (lastReadSeq)--> [Read Cursor Store]
                                          |
                                          +--fetch seq > lastReadSeq--> [Message Log]
                                          |
                                          +--deliver in order-------------> B
                                          |
                                    B acks -> cursor advances`
        )
      }
    ],
    tips: ["WebSocket for low-latency delivery, but always persist to a durable log first", "Queue/log-based delivery for reliability when the receiver is offline", "Per-conversation sequence numbers guarantee order without relying on clock sync", "Presence and typing indicators belong in a fast cache, not the durable log"],
    references: [
      { source: "interview-experience", attribution: "WhatsApp HLD", insight: "Messaging at scale requires reliable queues and presence tracking." },
      { source: "note", attribution: "AlgoMaster - System Design: Chat/Messaging structural framing (requirements -> estimates -> architecture -> flows -> trade-offs)", insight: "Used only as a structural template; all prose and diagrams here are original." }
    ],
    practiceProblems: []
  },

  {
    id: "topic-hld-notification-system",
    moduleId: "mod-hld-design-exercises",
    title: "Notification System (Email, SMS, Push)",
    intuition: "Send millions of notifications daily. Prioritize (alerts urgent), rate-limit, track delivery.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A notification system delivers messages to users across channels (push, email, SMS) triggered by application events. Clarify: which channels must be supported, and does the user choose a preferred channel? Are there different urgency tiers (security alert vs marketing)? Is exact delivery guaranteed, or is best-effort acceptable for low-priority notifications? Do we need a user-facing notification center (in-app list) in addition to push/email/SMS?",
        codeExample: "Clarify: channels supported? per-user channel preference? urgency tiers? exactly-once or best-effort? in-app notification center needed?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: accept a notification request from an internal service or event stream; route it to the correct channel(s) based on priority and user preference; retry on transient provider failure; deduplicate repeated triggers for the same logical event. Non-functional: high-priority notifications (security alerts) must be attempted within seconds; the system must not overwhelm a user with duplicate or excessive notifications (rate limiting is a trust/UX requirement, not just a technical one); it must tolerate third-party provider outages without losing notifications; throughput must scale to tens of millions of notifications per day.",
        codeExample: "Functional: submit(event) -> route by priority/preference -> multi-channel send -> retry -> dedupe\\nNon-functional: seconds-level delivery for high priority, per-user rate limiting, provider-outage tolerance, tens of millions/day throughput"
      },
      {
        title: "Back-of-envelope estimates",
        content: "Assume 50M daily active users, averaging 4 notifications/day each (mix of transactional and marketing): 50M * 4 / 86,400 is about 2,300 notifications/sec average, with large bursts around scheduled campaigns (e.g. a marketing blast could push tens of thousands/sec for a short window). Storage: each notification record (recipient, channel, status, timestamps) is roughly 300 bytes; 200M notifications/day * 300 bytes is about 60GB/day, or roughly 22TB/year, well within reach of a partitioned relational or NoSQL store. Provider throughput: SMS/push providers often cap requests/sec per account, so a burst of 50,000/sec must be smoothed by a queue to stay under the provider's rate limit rather than sent all at once.",
        codeExample: "50M DAU * 4 notifications/day -> ~2,300/sec avg, tens of thousands/sec burst\\nStorage: ~60GB/day, ~22TB/year\\nProvider rate caps -> queue smooths bursts to stay under per-provider limits"
      },
      {
        title: "APIs",
        content: "An internal submission API accepts notification requests from other services; a status API lets callers check delivery outcome; explicit error responses cover invalid channel/recipient and provider rejection.",
        codeExample:
          "POST /internal/v1/notifications\\nRequest: { \"userId\": \"u1\", \"eventId\": \"evt-42\", \"priority\": \"high|low\", \"channels\": [\"push\",\"sms\",\"email\"], \"template\": \"security_alert\", \"data\": {...} }\\nResponse 202: { \"notificationId\": \"n1\", \"status\": \"queued\" }\\nErrors: 400 unknown template/channel, 409 duplicate eventId+userId (dedupe)\\n\\nGET /internal/v1/notifications/{id} -> { \"status\": \"sent|delivered|failed|suppressed\", \"attempts\": [...] }"
      },
      {
        title: "Requirement-driven architecture",
        content: "Because delivery must survive provider outages and must not overwhelm users, every request is first written to a durable store and placed on a priority queue rather than sent synchronously; high-priority notifications use a separate, higher-throughput queue/partition so a marketing blast can never delay a security alert. Channel-specific workers pull from the queue and call the relevant provider (push gateway, SMS gateway, email service), applying per-user rate limiting and per-provider backoff before dispatch.",
        codeExample: "Event Source -> Notification Service -> persist + dedupe check -> Priority Queue (high) / Queue (low)\\nPriority Queue -> High-Priority Workers -> Push/SMS/Email Providers\\nQueue (low) -> Standard Workers -> Push/SMS/Email Providers (rate-limited)\\nDelivery status --> Status Store (for GET /notifications/{id})"
      },
      {
        title: "Component responsibilities",
        content: "Notification service: validates the request, checks the dedupe key (userId+eventId+channel), persists the notification, and enqueues it on the priority-appropriate queue. Priority queues: separate lanes so high-priority traffic is never starved by bulk/marketing volume. Channel workers: consume from a queue, apply per-user rate limiting (checking a shared counter in Redis), call the channel-specific provider API, and record the outcome. Provider adapters: normalize the different push/SMS/email provider APIs behind one interface, including their distinct retry/backoff semantics. Status store: tracks per-notification attempt history and final status for the status API and for operational debugging.",
        codeExample: "Notification Service -> validate + dedupe + persist + enqueue\\nPriority Queues -> separate high vs low lanes\\nChannel Workers -> rate-limit check + provider call + record outcome\\nProvider Adapters -> normalize push/SMS/email provider APIs\\nStatus Store -> per-notification attempt history + final status"
      },
      {
        title: "Data model and schema",
        content: "Each notification is keyed by a dedupe key so repeated triggers of the same event (e.g. a retried upstream call) do not produce duplicate sends. Attempt history is stored separately from the notification itself so retries do not require rewriting the original record, and so the status API can show a full timeline.",
        codeExample: "Notification{id, userId, eventId, dedupeKey (userId+eventId+channel), priority, channel, template, status, createdAt}\\nAttempt{notificationId, channel, providerResponse, attemptedAt, outcome}\\nUserPreference{userId, channel, optIn, quietHours}"
      },
      {
        title: "Bottlenecks and scaling",
        content: "The primary bottleneck is provider-side rate limits, which are addressed by queue-based smoothing and per-provider backoff rather than trying to send everything immediately. A secondary bottleneck is a single user receiving an unreasonable volume of notifications in a short window (either a bug or abuse), addressed by a per-user rate limit enforced before dispatch, independent of overall system throughput.",
        codeExample: "Provider rate limits -> queue smoothing + per-provider backoff, not immediate send-all\\nPer-user overload -> per-user rate limit checked before dispatch, independent of total system load"
      },
      {
        title: "Consistency, reliability, security, and observability",
        content: "Consistency: notification status is eventually consistent - there is normally a short delay between 'sent to provider' and 'confirmed delivered' via a provider webhook. Reliability: retries use exponential backoff (e.g. 1m, 5m, 30m) with a bounded attempt count, after which the notification moves to a dead-letter queue for manual or automated investigation instead of retrying forever. Security: validate that the requesting internal service is authorized to notify the given user, and never include sensitive data in a push/SMS payload that could be seen in a lock-screen preview. Observability: monitor per-channel delivery success rate, queue depth per priority lane, dead-letter queue size, and provider-reported latency, alerting when the high-priority lane's delivery time exceeds its SLA.",
        codeExample: "Consistency: eventual, status confirmed via provider webhook\\nReliability: backoff 1m->5m->30m, bounded attempts, then dead-letter queue\\nSecurity: authorize requesting service, avoid sensitive data in lock-screen-visible payloads\\nObservability: per-channel success rate, queue depth per lane, DLQ size, high-priority SLA alerting"
      },
      {
        title: "Trade-offs",
        content: "Sending synchronously (call the provider directly in the request path) is simpler and has lower latency for a single notification, but it couples the caller to provider availability and cannot smooth bursts, so it fails under load or provider outages; the queue-based design adds a small amount of latency and operational complexity in exchange for durability and burst tolerance. Separating high and low priority queues costs some infrastructure complexity but is the only way to guarantee a marketing blast cannot delay a security alert, which is a hard product requirement.",
        codeExample: "Synchronous send -> simpler, lower single-request latency, fails under load/provider outage\\nQueue-based -> small added latency, durable + burst-tolerant\\nSeparate priority lanes -> more infra, but guarantees high-priority is never starved by bulk traffic"
      }
    ],
    examples: [
      {
        title: "Security alert notification",
        input: "An unusual login from a new device triggers a high-priority alert for 1 user across push, SMS, and email",
        output: "The notification is routed through the high-priority lane and delivered within a couple of seconds via at least one channel, with attempts recorded for all three",
        explanation: "Step 1: The auth service submits a notification request with priority=high and channels=[push,sms,email]. Step 2: The notification service checks the dedupe key, persists the record, and enqueues it on the high-priority lane, bypassing the bulk/marketing queue entirely. Step 3: High-priority workers immediately pick it up, apply per-user rate limiting (which allows security alerts to bypass normal caps), and call each provider adapter in parallel. Step 4: Each attempt's outcome is recorded in the status store, giving the caller a full multi-channel delivery picture within seconds.",
        diagram: asciiDiagram(
`Interview drawing order: 1) event source 2) notification service 3) high-priority queue 4) workers 5) providers 6) status store

Auth Service --submit(high)--> [Notification Service] --persist+dedupe--> [DB]
                                        |
                                        +--enqueue--> [High-Priority Queue]
                                                              |
                                                              v
                                                     [High-Priority Workers]
                                                        /       |        \\
                                                [Push Provider][SMS Provider][Email Provider]
                                                        \\       |        /
                                                              v
                                                       [Status Store]`
        )
      },
      {
        title: "Rate-limit check on bulk/marketing traffic",
        input: "A marketing campaign tries to send 100 notifications to a user in 10 minutes, exceeding their daily quota",
        output: "The system suppresses the excess low-priority messages after the quota is reached, while any concurrent high-priority alert for that user is unaffected",
        explanation: "Step 1: Each marketing notification passes through the standard (low-priority) queue and workers. Step 2: Before dispatch, a worker checks the user's rolling notification count in a shared rate-limit counter (Redis). Step 3: Once the user's quota for that channel/priority tier is exceeded, further low-priority sends in the window are marked 'suppressed' rather than dispatched, and this is recorded in the status store for transparency. Step 4: Because high-priority traffic uses a separate lane and a separate (much higher) quota, a security alert sent to the same user in the same window is unaffected by the marketing suppression - this separation is exactly what protects user trust.",
        diagram: asciiDiagram(
`Interview drawing order: 1) low-priority queue 2) worker 3) rate-limit check 4) suppress or send

[Low-Priority Queue] --> [Standard Worker] --check quota--> [Rate Limit Counter (Redis)]
                                  |                                  |
                                  |<---- over quota? ----------------+
                                  |
                          yes -> mark "suppressed" in Status Store
                          no  -> dispatch to Provider Adapter`
        )
      }
    ],
    tips: ["Priority queue lanes are essential so bulk traffic can never delay a security alert", "rate limiting protects trust and system health, not just infrastructure", "multi-channel with provider adapters improves reliability against a single provider outage", "dead-letter queues after bounded retries help operational debugging without infinite retry loops"],
    references: [
      { source: "blog", attribution: "Uber Notification System", insight: "Scalability and reliability at trillions of notifications." },
      { source: "note", attribution: "AlgoMaster - System Design: Notification System structural framing (requirements -> estimates -> architecture -> flows -> trade-offs)", insight: "Used only as a structural template; all prose and diagrams here are original." }
    ],
    practiceProblems: []
  },

  {
    id: "topic-hld-ride-sharing",
    moduleId: "mod-hld-design-exercises",
    title: "Ride Sharing (Uber/Lyft)",
    intuition: "Match riders with drivers in real-time. Track locations, calculate fares, ensure safety.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A ride-sharing system matches a rider requesting a trip with a nearby available driver, tracks the trip in real time, and settles payment at the end. Clarify: is matching purely nearest-driver, or does it need to account for driver rating/vehicle type/surge? What is the acceptable matching latency? Do we need real-time ETA updates during the trip? Is fare calculated up front (fixed quote) or metered live? These decisions shape the matching engine and the location-tracking pipeline.",
        codeExample: "Clarify: matching criteria beyond distance? acceptable match latency? live ETA updates mid-trip? upfront quote vs live metering?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: drivers continuously report location; a rider requests a ride and is matched to a nearby available driver; the trip is tracked from pickup to drop-off; fare is calculated and payment is settled at the end. Non-functional: matching latency should be a few seconds at most; location updates must be processed at very high frequency (every few seconds per active driver) without overwhelming the system; the system must degrade gracefully during demand spikes (e.g. a large event ending) rather than failing to match anyone; driver location data can be eventually consistent since it changes constantly anyway.",
        codeExample: "Functional: reportLocation(driverId, lat, lng), requestRide(riderId, pickup, dropoff), track trip, calculate + settle fare\\nNon-functional: few-second matching latency, high-frequency location ingestion, graceful demand-spike degradation, eventual consistency ok for location"
      },
      {
        title: "Back-of-envelope estimates",
        content: "Assume 5M active drivers globally, each reporting location every 4 seconds while online: 5M / 4 is about 1.25M location updates/sec at global peak (regionally partitioned, so any single region sees a fraction of this). Ride requests: 20M rides/day -> 20M / 86,400 is about 230 requests/sec average, with strong regional and time-of-day peaks (e.g. 5-10x average at rush hour in a major city). Matching computation: each match considers drivers within a few kilometers, typically a few hundred candidates per request after a geo-index query, which is cheap compared to the location-ingestion volume - meaning location ingestion, not matching, is usually the harder scaling problem.",
        codeExample: "5M drivers reporting every 4s -> ~1.25M location updates/sec globally (regionally partitioned)\\nRide requests: 20M/day -> ~230/sec avg, 5-10x at rush hour in a city\\nMatching: ~100s of candidates per request from geo-index - cheap vs. location ingestion volume"
      },
      {
        title: "APIs",
        content: "Drivers stream location over a lightweight, high-frequency channel; riders request a match through a request/response API that returns a matched driver or a retry signal.",
        codeExample:
          "POST /api/v1/drivers/{id}/location (or WebSocket stream)\\nRequest: { \"lat\": 37.77, \"lng\": -122.41, \"timestamp\": \"...\" } -> 204\\n\\nPOST /api/v1/rides\\nRequest: { \"riderId\": \"r1\", \"pickup\": {lat,lng}, \"dropoff\": {lat,lng} }\\nResponse 200: { \"rideId\": \"ride1\", \"driverId\": \"d1\", \"etaSeconds\": 240, \"fareEstimate\": 18.50 }\\nErrors: 409 no drivers available (retry), 422 invalid pickup/dropoff"
      },
      {
        title: "Requirement-driven architecture",
        content: "Because location ingestion is the dominant load, driver locations are written to a fast, in-memory geo-index (not the primary durable database) on every update, since only the latest position matters for matching. Because matching must happen in a few seconds, the matching engine queries the geo-index directly rather than the database, filters by availability and constraints, and ranks candidates by ETA. The trip lifecycle (accept, start, complete, payment) is handled by a separate, durable service since correctness matters more than speed for that part.",
        codeExample: "Driver App --location every 4s--> [Location Ingestion Service] --write--> [Geo-Index (in-memory, e.g. geohash/quad-tree in Redis)]\\nRider App --request ride--> [Matching Service] --query nearby--> [Geo-Index] --candidates--> rank by ETA/availability --> offer\\nAccepted match --> [Trip Service] --persist trip state + fare--> [Trip DB]"
      },
      {
        title: "Component responsibilities",
        content: "Location ingestion service: receives frequent driver location pings and writes them into the geo-index, discarding stale entries after a short TTL if a driver goes offline unexpectedly. Geo-index: an in-memory structure (geohash buckets or a quad-tree) supporting fast 'drivers within radius X' queries. Matching service: queries the geo-index, filters by availability/vehicle type, ranks by ETA and acceptance likelihood, and manages the offer/retry loop if a driver declines. Trip service: owns the durable trip record from acceptance through completion, including state transitions and fare calculation. Payment service: settles the fare at trip completion, independent of the real-time matching path so a payment provider slowdown never blocks matching.",
        codeExample: "Location Ingestion -> write to Geo-Index, TTL stale entries\\nGeo-Index -> in-memory geohash/quad-tree, radius queries\\nMatching Service -> query + filter + rank + offer/retry loop\\nTrip Service -> durable trip state machine + fare calc\\nPayment Service -> settle fare, decoupled from matching path"
      },
      {
        title: "Data model and schema",
        content: "Driver location itself lives only in the fast geo-index (it is transient by nature), while the durable database stores driver profile/availability flags and the full trip lifecycle, which does need durability and auditability.",
        codeExample: "GeoIndex: driverId -> {lat, lng, updatedAt}  -- in-memory, TTL-expired, not the source of truth for anything but position\\nDriver{id, vehicleType, rating, isAvailable}  -- durable\\nTrip{id, riderId, driverId, pickup, dropoff, state, fare, createdAt, completedAt}  -- durable, state machine: requested->matched->in_progress->completed/cancelled"
      },
      {
        title: "Bottlenecks and scaling",
        content: "The primary bottleneck is location-update volume, addressed by partitioning the geo-index regionally (a driver in Tokyo never needs to be in the same index as one in Denver) and by writing to an in-memory store rather than a durable database on every ping. A secondary bottleneck is a sudden demand spike (surge) where many riders request rides in the same small area at once; this is addressed by widening the search radius and increasing price (surge pricing) to pull in more available drivers rather than letting the matching engine simply fail to find candidates.",
        codeExample: "Location volume -> regional geo-index partitioning + in-memory writes, not per-ping DB writes\\nDemand spikes -> widen search radius + surge pricing to attract supply, rather than failing to match"
      },
      {
        title: "Consistency, reliability, security, and observability",
        content: "Consistency: driver location is eventually consistent by nature (a driver could have moved slightly since their last ping); this is acceptable because ETA is always an estimate. Reliability: trip state transitions are the correctness-critical part and use a durable state machine with idempotent transitions (e.g. accepting an already-accepted trip is a no-op, not an error) to survive retries and partial failures. Security: verify driver identity and vehicle registration before allowing them online, and encrypt in-trip location sharing between rider and driver apps. Observability: monitor match latency (request to offer), geo-index query latency, driver location staleness, and surge-pricing trigger frequency per region.",
        codeExample: "Consistency: location eventually consistent, acceptable since ETA is always an estimate\\nReliability: trip state machine with idempotent transitions\\nSecurity: verified driver identity/vehicle, encrypted in-trip location sharing\\nObservability: match latency, geo-index query latency, location staleness, surge trigger frequency"
      },
      {
        title: "Trade-offs",
        content: "Writing every location ping straight to a durable database would give perfect durability of location history but would not scale to millions of pings per second and is unnecessary since only the latest position matters for matching; the in-memory geo-index trades some durability (a brief gap in history if the index restarts) for the throughput the system actually needs. Nearest-driver-only matching is simple and fast but can produce a poor match (e.g. an inexperienced driver or wrong vehicle type); ranking by ETA plus acceptance probability adds computation but produces materially better matches, which is why production systems go beyond pure distance.",
        codeExample: "Durable per-ping writes -> perfect history, doesn't scale to millions/sec\\nIn-memory geo-index -> scales, small durability trade-off, acceptable since only latest position matters\\nNearest-only matching -> simple, fast, sometimes poor match\\nETA+acceptance-probability ranking -> more compute, materially better match quality"
      }
    ],
    examples: [
      {
        title: "Rider request matching",
        input: "A rider in downtown requests a ride; 50 drivers are nearby but several are already on trip or unavailable",
        output: "The system filters by availability, ranks candidates by ETA, and returns the best suitable driver or retries quickly",
        explanation: "Step 1: The matching service queries the geo-index for drivers within a radius of the pickup point. Step 2: It excludes drivers who are not available or have low acceptance probability. Step 3: It estimates ETA for each remaining candidate and sorts by best match. Step 4: It offers the rider the top result. Step 5: If the offer is declined or the driver cancels, the system retries with the next candidate from the already-fetched list, avoiding a full re-query. This is the operational complexity hidden behind a simple 'match a nearby driver' summary.",
        diagram: asciiDiagram(
`Interview drawing order: 1) rider 2) matching service 3) geo-index 4) rank/filter 5) offer 6) driver

Rider --request ride--> [Matching Service] --radius query--> [Geo-Index]
                               |                                   |
                               |<---- candidate drivers -----------+
                               |
                        filter (availability) + rank (ETA, acceptance prob.)
                               |
                               +--offer--> [Driver #1]
                                              |
                                    decline/timeout -> next candidate (no re-query)
                                              |
                                           accept -> [Trip Service]`
        )
      },
      {
        title: "Surge pricing under heavy demand",
        input: "A large event ends and 4x demand hits the market instantly in a small area",
        output: "Price increases and the system widens the search radius to attract idle drivers while keeping matching latency stable",
        explanation: "Step 1: A demand-and-supply monitor watches the ratio of open ride requests to available drivers per region in near-real-time. Step 2: When the ratio crosses a threshold, surge pricing is applied to new fare estimates in that region, and the matching service widens its search radius to consider drivers slightly further away who might otherwise be idle. Step 3: Riders see the surge price before confirming and can accept or cancel. Step 4: As more drivers reposition toward the surge area (attracted by the price), the ratio normalizes and surge multiplier decreases. This shows that matching and pricing are coupled control loops in a real system, not independent features.",
        diagram: asciiDiagram(
`Interview drawing order: 1) demand/supply monitor 2) surge trigger 3) widened matching 4) rider confirmation

[Demand/Supply Monitor] --ratio > threshold--> [Surge Pricing Engine]
                                                        |
                                          apply surge multiplier + widen radius
                                                        |
                                                        v
                                          [Matching Service] --offer w/ surge price--> Rider
                                                                                          |
                                                                                accept/cancel`
        )
      }
    ],
    tips: ["Geo-spatial indexes are critical for performance; keep them in-memory, not in the primary durable DB", "driver locations change frequently, so eventual consistency is acceptable", "Queue/retry matching requests to handle spikes without failing outright", "Rank by ETA + acceptance probability, not just nearest distance", "Surge pricing and matching radius are coupled control loops, not separate features"],
    references: [
      { source: "interview-experience", attribution: "Uber System Design", insight: "Geo-spatial matching and real-time availability is the heart of the system." },
      { source: "note", attribution: "AlgoMaster - System Design: Ride Sharing structural framing (requirements -> estimates -> architecture -> flows -> trade-offs)", insight: "Used only as a structural template; all prose and diagrams here are original." }
    ],
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
  },

  // ---- Deep-dive replacements for previously shallow expanded-coverage HLD
  // topics. IDs intentionally match the shallow versions in
  // expanded-coverage.ts; all-topics.ts's collect() keeps the first topic
  // seen for a given id and hldTopics is collected before coverageTopics, so
  // these authored versions take precedence.
  {
    id: "topic-hld-load-balancer",
    moduleId: "mod-hld-foundations",
    title: "Load Balancing",
    intuition: "A single server cannot absorb all traffic or all failure risk; a load balancer spreads requests across a fleet and hides individual server failures from clients.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A load balancer (LB) sits between clients and a fleet of application servers, distributing incoming requests so no single server is overwhelmed and so a failed server is transparently routed around. Clarifying questions before designing one: is traffic HTTP/L7 (needs to inspect paths/headers) or raw TCP/L4 (faster, protocol-agnostic)? Do backend requests need to stick to the same server (session affinity) or are they stateless? Is the LB itself allowed to be a single point of failure?",
        codeExample: "Clarify: L4 or L7? stateless or sticky sessions? LB HA requirement (active-passive vs anycast)?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: accept client connections, select a healthy backend using a load-balancing algorithm, forward the request, and return the response. Detect and stop routing to unhealthy backends via health checks. Non-functional: the LB itself must not be a single point of failure (run at least 2 in active-passive or use DNS/anycast for multiple active LBs); added latency should be low single-digit milliseconds; it must handle failover within seconds of a backend or LB instance failing.",
        codeExample: "Functional: route(request) -> healthy backend\\nNon-functional: LB HA, <5ms added latency, failover in seconds"
      },
      {
        title: "Back-of-envelope estimates",
        content: "10,000 requests/sec average, 3x burst at peak = 30,000 requests/sec. If each backend instance safely handles 1,000 requests/sec, peak load requires at least 30 backend instances, plus headroom for one instance's traffic to be absorbed by the rest during a rolling deploy or failure, so provision ~35-40 instances. The LB itself, at L4, can typically handle hundreds of thousands of connections/sec on modest hardware, so the backend fleet size is the real constraint, not the LB.",
        codeExample: "peak 30k req/sec / 1k req/sec per instance = 30 instances minimum, +~20% headroom = ~36 instances"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> DNS (or anycast IP) -> Load Balancer tier (2+ instances for HA, or a managed LB service) -> health-checked pool of stateless application servers. The LB tier itself is made highly available either by running an active-passive pair with a floating IP (keepalived/VRRP-style), or by using DNS/anycast to route to multiple LB instances directly, avoiding a single LB as a SPOF.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client 2) DNS/anycast 3) LB pair (active + standby) 4) backend pool 5) health-check loop

Client --> DNS/Anycast --> [ LB (active) ] --> Backend 1
                                |  \\ health checks --> Backend 2
                          [ LB (standby) ]              Backend 3 (unhealthy, excluded)
                          takes over via floating IP
                          if active LB fails`
        )
      },
      {
        title: "Component responsibilities",
        content: "LB: connection handling/termination (and TLS termination if L7), algorithm-based backend selection, health checking, and failover of its own HA pair. Health check subsystem: periodic HTTP/TCP probes per backend with a failure threshold before marking a backend unhealthy, and a success threshold before re-including it, to avoid flapping. Backend pool: stateless application servers registered/deregistered dynamically (e.g., via service discovery) so scaling out or in doesn't require manual LB reconfiguration.",
        codeExample: "healthCheck(backend): GET /healthz every 5s; 3 consecutive failures -> mark unhealthy; 2 consecutive successes -> mark healthy again"
      },
      {
        title: "Algorithms and bottlenecks",
        content: "Round-robin is simplest and fine when backends are homogeneous and requests are roughly equal cost. Least-connections is better when request cost varies, routing to whichever backend currently has the fewest in-flight requests. Weighted variants of either handle heterogeneous instance sizes. Consistent-hash-based routing (hash of client IP or session key) supports session affinity without a shared session store, at the cost of uneven load if key distribution is skewed. The main bottleneck is usually backend capacity, not the LB itself; a second-order bottleneck is health-check flapping if the failure threshold is too aggressive, which can cause needless traffic shifting under transient blips.",
        codeExample: "round-robin: next = (last + 1) % n\\nleast-connections: pick backend with min(activeConnections)\\nconsistent-hash: hash(sessionKey) -> ring position -> nearest backend"
      },
      {
        title: "Reliability, security, and observability",
        content: "Reliability: LB HA pair with automatic failover, health checks with hysteresis (different thresholds for marking down vs up) to avoid flapping, and connection draining so in-flight requests complete before a backend is removed during a deploy. Security: TLS termination at the LB (or pass-through for L4), rate limiting at the edge to blunt abusive clients before they reach backends, and restricting direct backend access so only the LB can reach them. Observability: per-backend request rate, error rate, and latency (so a single slow backend is visible), health-check pass/fail history, and LB failover events.",
        codeExample: "Metrics: per-backend p50/p95/p99 latency, error rate, active connections, health-check state transitions"
      },
      {
        title: "Trade-offs",
        content: "L4 load balancing is faster and protocol-agnostic but cannot make routing decisions based on HTTP path/headers (no path-based routing to different services). L7 load balancing enables smarter routing (path/header-based, retries, circuit breaking) at the cost of more CPU per connection and needing to terminate/inspect the request. Sticky sessions (consistent-hash routing) simplify stateful backends but risk uneven load and complicate scaling the backend pool; the generally preferred approach is to keep backends stateless and put session state in a shared store instead.",
        codeExample: "L4: fast, protocol-agnostic, no path-based routing\\nL7: smarter routing, more CPU, enables retries/circuit-breaking\\nSticky sessions: simple statefulness, but uneven load risk"
      }
    ],
    examples: [
      {
        title: "Rolling deploy without dropping requests",
        input: "A fleet of 36 backend instances behind an L7 LB needs a rolling deploy of a new version, one instance at a time",
        output: "Zero dropped requests: each instance is drained, deployed, health-checked, and re-added before the next one starts",
        explanation: "Step 1: The deploy tool marks one backend instance for removal; the LB stops sending it new requests but lets in-flight requests finish (connection draining). Step 2: Once drained, the instance is upgraded and restarted with the new version. Step 3: The LB's health check begins probing it; only after it passes the success threshold is it re-added to the active pool. Step 4: The deploy tool repeats this one instance at a time, so at most one instance's capacity (1/36th) is ever missing, well within the fleet's headroom.",
        diagram: asciiDiagram(
`LB pool: [1][2][3]...[36]
Deploy step: drain(3) -> remove from pool -> upgrade -> health-check -> re-add
At any time: 35/36 capacity available, client requests unaffected`
        )
      }
    ],
    complexity: { time: "O(1) per routing decision", space: "O(n) for n tracked backends" },
    tips: ["Health checks need separate up/down thresholds (hysteresis) to avoid flapping", "The LB tier itself must be made HA (active-passive or anycast), not just the backends", "Prefer stateless backends over sticky sessions where possible"],
    tricks: ["If asked 'what happens when the LB itself fails?', answer with the HA mechanism (floating IP/anycast), not just backend failover", "Quantify backend fleet size from real request-rate math instead of guessing"],
    memoryAids: ["LB hides individual server failure from the client", "Round-robin = simple/equal cost, least-connections = uneven cost, consistent-hash = session affinity"],
    interviewPatterns: ["Comes up in almost every HLD design as the entry point after DNS/CDN", "Follow-up: 'how do you scale to 10x traffic?' -> add backend instances behind the same LB, verify LB tier itself is not now the bottleneck"],
    references: [
      { source: "note", attribution: "NGINX/HAProxy load-balancing algorithm documentation (concept reference)", insight: "Round-robin, least-connections, and consistent-hash routing are the standard algorithm choices, each with a distinct trade-off." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-load-balancer-rolling-deploy", "hld-load-balancer-ha-failover"]
  },

  {
    id: "topic-hld-cdn",
    moduleId: "mod-hld-foundations",
    title: "CDN and Edge Caching",
    intuition: "Serving every request from one origin region means every user, no matter where they are, pays the round-trip latency to that region; a CDN caches content at edge locations near users instead.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A CDN (content delivery network) is a globally distributed set of edge servers that cache content close to end users, so requests are served from a nearby edge node instead of a distant origin. Clarifying questions: is the content static (images, video, JS/CSS bundles) or dynamic/personalized (a user's own feed)? What is the acceptable staleness window if content changes? Do assets need signed/expiring URLs (paid content, private media)?",
        codeExample: "Clarify: static or dynamic content? staleness tolerance? private/signed URL requirement?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: serve cached content from the nearest edge location on a cache hit; on a miss, fetch from origin, cache it at the edge, and return it; support cache invalidation/purge when origin content changes. Non-functional: edge cache hit latency in the low tens of milliseconds; origin load should drop substantially (a well-tuned CDN handles 90%+ of requests at the edge for cacheable content); purges should propagate globally within seconds to a few minutes.",
        codeExample: "Functional: GET asset -> edge cache hit/miss -> (miss) fetch origin, cache, return\\nNon-functional: edge hit latency ~10-30ms, purge propagation seconds-to-minutes"
      },
      {
        title: "Back-of-envelope estimates",
        content: "A media site serves 500M image requests/day globally (~5,800 requests/sec average, higher at peak). With a 95% CDN cache hit ratio, only ~5% (~290 requests/sec average) reach the origin, letting the origin fleet be sized for a fraction of total traffic. Each cached image averaging 200KB, edge storage for the hot working set (say the top 1M frequently requested images) needs roughly 200GB per edge location, well within typical edge cache capacity.",
        codeExample: "500M req/day = ~5,800 req/sec avg; 95% cache hit -> only ~290 req/sec reaches origin\\nhot set: 1M images * 200KB = ~200GB per edge node"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> DNS resolves to the nearest edge PoP (point of presence, via anycast or geo-DNS) -> edge cache. On a cache hit, the edge responds directly. On a miss, the edge server fetches from the origin (or a regional mid-tier cache first, for very large deployments), stores the response according to its TTL/cache-control headers, and returns it to the client.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client 2) DNS/anycast to nearest PoP 3) edge cache 4) (on miss) origin

Client --> nearest Edge PoP --cache hit--> response (10-30ms)
                |
           cache miss
                v
           Origin Server --> response cached at edge with TTL --> client`
        )
      },
      {
        title: "Component responsibilities and data model",
        content: "Edge cache: keyed by request URL (plus vary headers like Accept-Encoding), stores the response body plus cache-control metadata (TTL, must-revalidate). Origin: the source of truth; sets Cache-Control/ETag headers to communicate freshness rules to the CDN. Purge/invalidation API: allows explicitly evicting a URL or a tag/prefix from all edge locations when origin content changes before its TTL expires.",
        codeExample: "CacheEntry{url, varyKey, body, etag, ttl, cachedAt}; purge(url|prefix) -> propagate eviction to all PoPs"
      },
      {
        title: "Bottlenecks, reliability, security, and observability",
        content: "Bottlenecks: a very low cache hit ratio (highly personalized content) means the CDN adds an extra hop with little benefit; a thundering herd on a popular but just-expired URL can cause many simultaneous origin fetches (mitigated by request collapsing at the edge, where only one fetch is issued and others wait on it). Reliability: if an edge node is unhealthy, DNS/anycast routes around it to the next-nearest PoP. Security: signed/expiring URLs for private content, and origin access restricted so only the CDN's edge servers (not end users) can hit it directly. Observability: cache hit ratio per content type, origin request rate, purge propagation latency, and edge error rate.",
        codeExample: "Request collapsing: if 1,000 clients request the same just-expired URL simultaneously, only 1 origin fetch happens; the other 999 wait on that result"
      },
      {
        title: "Trade-offs",
        content: "Longer TTLs improve cache hit ratio and reduce origin load but increase staleness risk after content changes (mitigated with purge APIs or cache-busting URLs with a version/hash in the path). CDNs are excellent for static/cacheable content but add limited value for highly personalized, per-user dynamic content, where the origin (or an application-layer cache like Redis) is a better fit than edge caching.",
        codeExample: "Long TTL: fewer origin hits, more staleness risk\\nShort TTL: fresher content, more origin load\\nVersioned/hashed URLs (asset.v3.js) sidestep the trade-off for static assets entirely"
      }
    ],
    examples: [
      {
        title: "Thundering herd on a viral image",
        input: "A product image's cache TTL just expired at the exact moment it goes viral, and 50,000 concurrent requests hit the same edge PoP",
        output: "Only 1 request reaches the origin; the other 49,999 are held and served the same response once it returns (request collapsing)",
        explanation: "Step 1: The first request for the expired URL at this edge node triggers an origin fetch and marks the URL as 'revalidating'. Step 2: All subsequent concurrent requests for the same URL at this edge are collapsed into waiters on that single in-flight fetch instead of each triggering their own origin request. Step 3: When the origin responds, the edge caches the fresh response and releases it to all 50,000 waiting requests at once. Step 4: Without request collapsing, this scenario would send 50,000 simultaneous requests to the origin, likely overloading it."
      }
    ],
    complexity: { time: "O(1) per cache lookup", space: "O(hot content size) per edge node" },
    tips: ["Cache hit ratio, not raw traffic volume, is the metric that determines origin load reduction", "Use versioned/hashed URLs for static assets to sidestep the TTL staleness trade-off entirely", "Request collapsing at the edge prevents thundering-herd origin overload on popular content"],
    tricks: ["When asked about CDN staleness, propose a purge API plus short TTL for mutable content, and versioned URLs plus long TTL for immutable assets", "Distinguish clearly between static-content CDN use and (usually weaker) fit for personalized dynamic content"],
    memoryAids: ["CDN = cache close to the user, not just a bigger cache", "Versioned URL = cache forever; dynamic content = cache rarely or not at all"],
    interviewPatterns: ["Comes up whenever global users and static/media assets are mentioned", "Follow-up: 'what if the content changes before the TTL expires?' -> purge API or versioned URLs"],
    references: [
      { source: "note", attribution: "CDN edge-caching and cache-control header concepts (general web architecture reference)", insight: "Cache hit ratio and TTL strategy, not the number of edge locations alone, determine how effective a CDN is at protecting the origin." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-cdn-thundering-herd", "hld-cdn-ttl-staleness-tradeoff"]
  },

  {
    id: "topic-hld-replication",
    moduleId: "mod-hld-foundations",
    title: "Replication and Failover",
    intuition: "A single database instance is both a durability risk (disk failure loses data) and an availability risk (instance failure takes down all reads/writes); replication keeps copies elsewhere and failover promotes one when the primary dies.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "Replication keeps additional copies (replicas) of a primary database's data, either for read scaling, geographic locality, or disaster recovery. Clarifying questions: is the goal read scaling, high availability, or both? Can reads tolerate a small replication lag (eventual consistency) or must every read see the latest write (strong consistency)? Is cross-region replication needed for disaster recovery against a full region outage?",
        codeExample: "Clarify: read scaling vs HA vs disaster recovery? read staleness tolerance? cross-region requirement?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: the primary accepts writes and streams a change log (WAL/binlog) to replicas; replicas apply changes and can serve reads; on primary failure, a replica is promoted to primary and clients are redirected. Non-functional: replication lag should stay in the low milliseconds to low seconds under normal load; failover should complete within a bounded window (commonly seconds to tens of seconds) and must not silently lose acknowledged writes.",
        codeExample: "Functional: primary -> WAL stream -> replicas apply -> promote replica on failure\\nNon-functional: lag <1s typical, failover <30s, no silent data loss on acknowledged writes"
      },
      {
        title: "Back-of-envelope estimates",
        content: "A primary handling 5,000 writes/sec streams roughly that many WAL entries/sec to each replica; at ~500 bytes per entry, that is ~2.5MB/sec of replication traffic per replica, easily handled by a single network link. With 3 replicas across 2 regions, the system tolerates the loss of the primary plus one additional replica before running out of up-to-date copies, and cross-region replication adds one-way network latency (commonly 50-150ms) to synchronous replication if used for that link.",
        codeExample: "5,000 writes/sec * 500 bytes/entry = ~2.5MB/sec replication stream per replica"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client writes -> Primary -> WAL/binlog stream -> N replicas (same region for low-latency sync replication, other regions for disaster recovery, typically async). A failover controller (or the database's built-in consensus mechanism) monitors primary health and, on failure, promotes the most up-to-date replica to primary and repoints client connections (via DNS, a proxy, or service discovery).",
        diagram: asciiDiagram(
`Interview drawing order:
1) client writes 2) primary 3) WAL stream 4) replicas 5) failover controller 6) promotion

Client --writes--> Primary --WAL stream--> Replica A (sync, same region)
                       |                --> Replica B (async, other region)
                       v
              Failover Controller (health-checks primary)
              on primary failure: promote most-caught-up replica -> new Primary
              repoint clients via DNS/proxy`
        )
      },
      {
        title: "Component responsibilities and consistency",
        content: "Primary: single writer, generates the ordered change stream. Replicas: apply the stream in order, can serve reads (with a documented staleness bound), and are candidates for promotion. Failover controller: distinct from the replicas themselves (often a quorum-based coordination service) to avoid a single node unilaterally deciding it should be primary, which risks split-brain. Consistency: synchronous replication to at least one replica gives zero data loss on failover at the cost of write latency; asynchronous replication is faster but risks losing the last few unacknowledged writes if the primary fails before they replicate.",
        codeExample: "sync replica ack required before commit -> zero data loss, higher write latency\\nasync replica ack not required -> lower latency, risk losing last N ms of writes on primary crash"
      },
      {
        title: "Reliability, security, and observability",
        content: "Reliability: quorum-based failover (not a single node self-promoting) prevents split-brain where two nodes both believe they are primary; a promoted replica must be the most caught-up candidate to minimize lost writes. Security: replication traffic between nodes is encrypted in transit; only the primary accepts writes, replicas are read-only to prevent accidental divergent writes. Observability: replication lag per replica (critical metric - if it grows, reads may serve very stale data or failover may promote a badly lagging replica), failover event history, and WAL/binlog throughput.",
        codeExample: "Alert if: replication lag > threshold (e.g. 5s), or a replica falls too far behind to be a safe failover candidate"
      },
      {
        title: "Trade-offs",
        content: "Synchronous replication guarantees no data loss on failover but adds write latency (worse across regions); asynchronous replication is faster but risks losing the last unacknowledged writes. More replicas improve read capacity and durability but increase write-side coordination cost (for sync replication) and storage cost. Cross-region replication protects against a full regional outage but is almost always asynchronous due to speed-of-light latency, so it accepts some data-loss risk in exchange for disaster-recovery capability.",
        codeExample: "same-region sync replica: low latency, strong durability\\ncross-region async replica: disaster recovery, some data-loss risk on primary crash"
      }
    ],
    examples: [
      {
        title: "Primary fails mid-write-burst",
        input: "The primary crashes with 40 writes acknowledged synchronously to Replica A but not yet applied to async Replica B in another region",
        output: "Replica A (fully caught up) is promoted to new primary with zero data loss; Replica B catches up afterward via the new primary's stream",
        explanation: "Step 1: The failover controller detects the primary is unreachable via repeated failed health checks (avoiding a false trigger from a single blip). Step 2: It queries replicas for their last applied WAL position; Replica A, having synchronously acknowledged all 40 writes, is fully caught up while Replica B lags. Step 3: Replica A is promoted to primary since it is the safe choice for zero data loss. Step 4: Clients are repointed to the new primary via DNS/proxy update. Step 5: Replica B resumes streaming from the new primary and catches up to the current state."
      }
    ],
    complexity: { time: "O(1) per replicated write (streamed asynchronously)", space: "O(n) per additional replica" },
    tips: ["Replication lag is the key metric: too much lag means stale reads or an unsafe failover candidate", "Quorum-based failover, not single-node self-promotion, prevents split-brain", "Sync replication = safety at latency cost; async = speed at data-loss-risk cost"],
    tricks: ["When asked 'can you lose data on failover?', the honest answer depends entirely on sync vs async replication mode - state that trade-off explicitly", "Name a concrete failover mechanism (quorum-based controller or the DB's built-in consensus) rather than 'it just switches over'"],
    memoryAids: ["Sync replica = zero data loss, higher latency; async replica = lower latency, some loss risk", "Promote the most caught-up replica, not just any replica"],
    interviewPatterns: ["Comes up whenever database high-availability or disaster recovery is discussed", "Follow-up: 'what if the primary and its sync replica both go down at once?' -> discuss the async cross-region replica as the disaster-recovery fallback, with its data-loss trade-off named explicitly"],
    references: [
      { source: "note", attribution: "PostgreSQL/MySQL replication and failover documentation (concept reference)", insight: "Synchronous vs asynchronous replication is the central trade-off between write latency and failover data-loss risk." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-replication-primary-failover", "hld-replication-sync-vs-async"]
  },

  {
    id: "topic-hld-estimation-read-write",
    moduleId: "mod-hld-estimation-tradeoffs",
    title: "Read/Write Estimation",
    intuition: "Every capacity, storage, and bottleneck decision in a system design interview flows from one skill: turning vague user counts into concrete requests/sec, bytes/sec, and storage-over-time numbers.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "Back-of-envelope estimation converts business-level numbers (daily active users, actions per user) into engineering-level numbers (requests/sec, bytes/sec, storage growth) that drive every subsequent design decision: how many servers, what read/write ratio the datastore must handle, whether a cache is needed, and how much storage to provision. Clarifying questions: what is DAU (daily active users)? How many actions of each type does an average user perform per day? What is the peak-to-average traffic ratio? What is the data retention period?",
        codeExample: "Clarify: DAU? actions/user/day per type? peak:average ratio? retention period?"
      },
      {
        title: "The core estimation method",
        content: "The standard method: (1) DAU * actions/user/day = total daily actions. (2) total daily actions / 86,400 seconds = average requests/sec. (3) average * peak-to-average ratio (commonly 2-10x depending on traffic pattern) = peak requests/sec, which is what you provision for. (4) payload size * total daily actions = daily storage growth; multiply by retention period for total storage needed.",
        codeExample: "avg req/sec = (DAU * actions/user/day) / 86,400\\npeak req/sec = avg req/sec * peak_ratio\\ndaily storage = actions/day * avg payload size\\ntotal storage = daily storage * retention_days"
      },
      {
        title: "Worked estimate: a photo-sharing app",
        content: "10M DAU, each user uploads 0.5 photos/day and views 50 photos/day. Uploads: 10M * 0.5 = 5M photos/day = ~58 uploads/sec average, ~230/sec at 4x peak. Views: 10M * 50 = 500M views/day = ~5,800 views/sec average, ~23,000/sec at 4x peak - views dominate writes by roughly 100x, which is the single most important finding: this system needs a strong read path (cache/CDN), not just write-scalable storage. Storage: 5M photos/day * 2MB average = 10TB/day; over a 3-year retention period, roughly 11PB total, driving the choice of cheap object storage (like S3) over a traditional database for the photo bytes themselves.",
        codeExample: "uploads: 10M*0.5/86,400 = ~58/sec avg, ~230/sec peak\\nviews: 10M*50/86,400 = ~5,800/sec avg, ~23,000/sec peak (100x more than writes)\\nstorage: 5M*2MB/day = 10TB/day -> ~11PB over 3 years"
      },
      {
        title: "Requirement-driven architecture implication",
        content: "The estimate directly determines architecture: a 100:1 read:write ratio means the design should prioritize a cache-first read path and possibly a CDN for the hottest content, while writes can go through a simpler, less-optimized path since they are a small fraction of total load. A write-heavy system (e.g., 1:1 or write-dominant like a logging pipeline) instead prioritizes ingestion throughput (partitioned queues, bulk writes) over read caching.",
        diagram: asciiDiagram(
`Interview drawing order:
1) DAU + actions/user 2) daily totals 3) avg req/sec 4) peak req/sec 5) storage/day 6) total storage

DAU=10M, uploads=0.5/day, views=50/day
   |
   v
uploads/day=5M (58/sec avg, 230/sec peak)      views/day=500M (5,800/sec avg, 23,000/sec peak)
   |                                                |
   v                                                v
storage: 10TB/day, ~11PB over 3yr           read:write ratio ~100:1 -> cache-first read path`
        )
      },
      {
        title: "Common estimation mistakes and how to avoid them",
        content: "Mistake 1: using average traffic to provision capacity instead of peak, which under-provisions for real-world bursty traffic. Mistake 2: forgetting retention period when estimating storage, which drastically understates total storage needed. Mistake 3: not separating read and write estimates, which hides read:write imbalance that should drive the caching/architecture decision. Mistake 4: over-precision - round numbers aggressively (58 uploads/sec, not 57.87) since the goal is order-of-magnitude reasoning, not exact arithmetic.",
        codeExample: "Provision for peak, not average. Always multiply storage-per-day by retention period. Keep read and write numbers separate."
      }
    ],
    examples: [
      {
        title: "Estimating a URL shortener's storage need",
        input: "100M new short URLs created per month, each mapping stored as ~500 bytes (short code, long URL, metadata), with a 5-year retention policy",
        output: "~600GB total storage after 5 years - small enough that a single well-indexed database (not a distributed store) is sufficient purely on storage grounds",
        explanation: "Step 1: 100M/month * 12 months * 5 years = 6B total mappings created over the retention window. Step 2: 6B * 500 bytes = 3TB raw... but wait, only 5 years of the *ongoing* rate matters if older links are pruned; assuming no pruning, cumulative storage is 6B mappings * 500 bytes = 3TB. Step 3: This modest total (a few TB) is well within a single scaled-up database instance's capacity, meaning the storage-size argument alone does not force sharding - sharding here would instead be justified by the read/write request rate, not the byte volume."
      }
    ],
    complexity: { time: "O(1) arithmetic per estimate", space: "N/A (an estimation technique, not a running system)" },
    tips: ["Always provision for peak traffic, not average", "Separate read and write estimates - the ratio drives the caching/architecture decision", "Round aggressively; the goal is order-of-magnitude reasoning, not precise arithmetic", "Always multiply per-day storage by the retention period"],
    tricks: ["State the method out loud (DAU -> daily actions -> avg req/sec -> peak req/sec) before plugging in numbers, so the interviewer can follow and correct any wrong assumption early", "When the read:write ratio comes out lopsided (like 100:1), immediately connect that number to an architecture decision (cache/CDN) rather than leaving it as an isolated fact"],
    memoryAids: ["DAU -> actions/day -> /86,400 for avg/sec -> * peak ratio for peak/sec", "Storage = bytes/action * actions/day * retention days"],
    interviewPatterns: ["This is the near-universal first step of any HLD interview after requirements gathering", "Follow-up: 'so what does that number mean for your design?' - always connect the estimate back to an architecture decision, not just state it"],
    references: [
      { source: "note", attribution: "Back-of-envelope estimation technique (standard system-design-interview practice)", insight: "The read:write ratio derived from estimation, more than the absolute traffic numbers, is what should drive the architecture's caching and storage decisions." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-estimation-photo-app-readwrite", "hld-estimation-url-shortener-storage"]
  },

  {
    id: "topic-hld-caching-strategy",
    moduleId: "mod-hld-design-exercises",
    title: "Caching Strategy",
    intuition: "Caching only helps if the strategy matches the read/write pattern; the wrong strategy (e.g. write-through for rarely-read data) adds latency without earning back a benefit.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A cache is a fast, usually smaller, storage layer that sits in front of a slower source of truth (typically a database), holding a subset of hot data to serve reads without hitting the slower store. Clarifying questions: is the access pattern read-heavy or write-heavy? Can the application tolerate briefly stale reads, or must every read see the latest write? Is the data naturally hot/skewed (a small set of keys gets most traffic) or uniformly accessed?",
        codeExample: "Clarify: read-heavy or write-heavy? staleness tolerance? hot-key skew or uniform access?"
      },
      {
        title: "The four core caching strategies",
        content: "Cache-aside (lazy loading): application checks the cache first; on a miss, reads from the database and populates the cache. Simple and only caches what is actually requested, but the first request for any key always misses. Read-through: similar to cache-aside but the cache library itself handles the miss-then-populate logic, transparent to the application. Write-through: every write goes to the cache and the database synchronously, keeping them always in sync at the cost of write latency. Write-back (write-behind): writes go to the cache first and are asynchronously flushed to the database later, giving very fast writes at the risk of data loss if the cache fails before flushing.",
        codeExample: "cache-aside: on read, check cache -> miss -> read DB -> populate cache -> return\\nwrite-through: on write, write cache AND DB synchronously\\nwrite-back: on write, write cache only, flush to DB async later"
      },
      {
        title: "Matching strategy to access pattern",
        content: "Read-heavy, rarely-changing data (a user's profile, a product catalog page): cache-aside with a moderate TTL is the standard choice - simple, and only pays the cache-population cost for keys actually requested. Write-heavy data where reads must always be fresh (an inventory counter used for both display and decrementing): write-through keeps cache and database in lockstep, avoiding stale reads, accepting the extra write latency. Very write-heavy, latency-critical, and tolerant of rare data loss (view counters, activity logs): write-back trades some durability for very low write latency.",
        codeExample: "profile page -> cache-aside + TTL\\ninventory counter (must stay fresh) -> write-through\\nview counter (latency-critical, loss-tolerant) -> write-back"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> Application service -> Cache (Redis/Memcached) -> on miss -> Database. Cache invalidation on writes: for cache-aside, either invalidate the key on write (forcing the next read to repopulate) or update it directly; for write-through, the cache is updated as part of the write path itself, so no separate invalidation step is needed.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client 2) app service 3) cache 4) database (on miss)

Read: Client -> App -> Cache --hit--> response
                          |
                        miss
                          v
                       Database --> populate cache --> response

Write (write-through): Client -> App -> Cache AND Database (synchronous, both updated)`
        )
      },
      {
        title: "Bottlenecks, reliability, and observability",
        content: "Bottlenecks: a low cache hit ratio (uniform access with no hot keys) means the cache adds an extra network hop with little benefit - measure hit ratio before assuming caching helps. A hot key (one item vastly more popular than others) can overload a single cache shard even though overall cache capacity is fine; mitigated by key-level replication or local in-process caching for the very hottest few keys. Reliability: a cache-aside design degrades gracefully on cache failure (falls back to the database, just slower); write-back risks losing unflushed writes if the cache node crashes, so it should only be used where that risk is explicitly acceptable. Observability: cache hit ratio, per-key request rate (to detect hot keys), and cache eviction rate (frequent evictions under memory pressure signal the cache is undersized for the working set).",
        codeExample: "Alert if: cache hit ratio drops below target, or eviction rate spikes (undersized cache), or a single key exceeds X% of total cache traffic (hot key)"
      },
      {
        title: "Trade-offs",
        content: "Cache-aside is simple and resilient to cache failure but has a cold-start miss penalty and a window of staleness until TTL expiry or invalidation. Write-through keeps data fresh but adds latency to every write and does no good for keys that are never read. Write-back has the best write latency but the worst durability guarantee. TTL length itself is a trade-off: longer TTLs raise hit ratio and lower database load, but increase the staleness window.",
        codeExample: "cache-aside: simple, resilient, cold-start miss, staleness until TTL/invalidation\\nwrite-through: fresh, write-latency cost\\nwrite-back: fastest writes, weakest durability"
      }
    ],
    examples: [
      {
        title: "Choosing a strategy for a flash-sale inventory counter",
        input: "An inventory count is both displayed to shoppers and decremented on every purchase during a flash sale with heavy concurrent traffic",
        output: "Write-through is chosen: every purchase decrements both cache and database synchronously, so the displayed count is never stale and never oversells",
        explanation: "Step 1: Because the inventory count is used to make a business-critical decision (whether to allow a purchase), staleness is unacceptable, ruling out plain cache-aside with a TTL. Step 2: Write-through keeps the cache and database in lockstep on every write, so a read immediately after a decrement always sees the correct value. Step 3: The extra write latency from writing to two stores synchronously is an acceptable cost given the correctness requirement, and write volume (purchases) is far lower than read volume (page views), so the added cost applies to a small fraction of total traffic."
      }
    ],
    complexity: { time: "O(1) per cache read/write", space: "O(hot key set size)" },
    tips: ["Measure cache hit ratio before assuming caching helps - uniform access patterns don't benefit much", "Match the strategy (cache-aside/read-through/write-through/write-back) to the read/write pattern and staleness tolerance, don't default to one", "Watch for hot keys separately from overall cache capacity"],
    tricks: ["When asked to justify a caching strategy, name the specific staleness tolerance and write frequency that led to the choice, not just 'to make it faster'", "If write-back comes up, immediately name its data-loss risk and when that risk is acceptable"],
    memoryAids: ["cache-aside = app manages the miss, write-through = always in sync, write-back = fast but risky"],
    interviewPatterns: ["Follow-up after any 'add a cache' suggestion: 'which strategy, and why?' - always tie the answer to the specific access pattern", "'What happens if the cache goes down?' -> cache-aside degrades gracefully to DB, write-back risks losing unflushed writes"],
    references: [
      { source: "note", attribution: "Redis/Memcached caching pattern documentation (concept reference)", insight: "Cache-aside, read-through, write-through, and write-back each fit a distinct read/write and staleness-tolerance profile; there is no universally correct default." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-caching-strategy-inventory-counter", "hld-caching-strategy-hot-key"]
  },

  {
    id: "topic-hld-db-sharding",
    moduleId: "mod-hld-design-exercises",
    title: "Sharding",
    intuition: "A single database server has a ceiling on both storage and throughput; sharding splits data across multiple independent database servers so the system can scale past that ceiling.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "Sharding partitions a dataset across multiple independent database instances (shards), each holding a subset of the data, so total storage and throughput scale with the number of shards rather than being capped by one machine. Clarifying questions: what is the natural partition key (user ID, tenant ID, geographic region)? Are cross-shard queries/joins required, or does each query naturally target a single shard? Is resharding (adding shards later) a requirement from day one?",
        codeExample: "Clarify: partition key? cross-shard query need? resharding requirement?"
      },
      {
        title: "Sharding strategies",
        content: "Hash-based sharding: hash(key) % N (or, better, consistent hashing) determines the shard; gives even distribution for high-cardinality keys but makes range queries across keys expensive (they hit every shard). Range-based sharding: contiguous key ranges live on the same shard (e.g., user IDs 1-1M on shard 1); supports efficient range queries but risks hotspots if certain ranges are much more active (e.g., newest users, who are often the most active, all landing on the newest shard). Directory-based sharding: a lookup service maps each key to its shard explicitly, offering maximum flexibility for rebalancing at the cost of an extra lookup hop and the lookup service itself becoming a critical dependency.",
        codeExample: "hash-based: shard = consistentHash(key) -> even distribution, poor range queries\\nrange-based: shard = rangeOf(key) -> good range queries, hotspot risk\\ndirectory-based: shard = lookup(key) -> flexible, extra hop + lookup service dependency"
      },
      {
        title: "Choosing the partition key",
        content: "The partition key should match the dominant query pattern: if nearly all queries filter by user ID, shard by user ID so those queries hit exactly one shard. A poorly chosen partition key forces most queries to scatter-gather across all shards (query every shard, merge results), which multiplies load and defeats much of sharding's benefit. Multi-tenant systems commonly shard by tenant ID so each tenant's data (and load) stays fully contained within one shard.",
        codeExample: "queries filter by user_id 95% of the time -> shard by user_id, most queries hit exactly 1 shard\\nwrong key choice -> most queries become scatter-gather across all shards"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> Application/routing layer computes shard(key) -> connects to the correct shard's database instance. A shard map (which key ranges/hashes map to which physical shard) is maintained either in application config, a directory service, or derived algorithmically (consistent hashing) so it does not need a central lookup on every request.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client 2) app/routing layer 3) shard() function 4) target shard DB

Client --> App/Routing Layer --shard(user_id)--> Shard 1 DB (users 1-1M)
                                              --> Shard 2 DB (users 1M-2M)
                                              --> Shard 3 DB (users 2M-3M)`
        )
      },
      {
        title: "Bottlenecks, reliability, and observability",
        content: "Bottlenecks: cross-shard joins/aggregations require scatter-gather across all shards and merging results in the application layer, which is slow and complex - designs should minimize how often this is needed. A hot shard (one shard receiving disproportionate traffic, e.g. from a viral user) needs either finer-grained partitioning or per-shard read replicas to absorb the extra load. Reliability: each shard should be independently replicated (see replication/failover), since losing a shard loses that portion of the dataset entirely, not just some capacity. Observability: per-shard request rate, storage size, and latency, specifically to detect shard imbalance (skew) early, before it becomes a hot-shard incident.",
        codeExample: "Alert if: any single shard's request rate or storage exceeds N% of total, indicating skew that may require resharding or splitting that shard"
      },
      {
        title: "Trade-offs",
        content: "Sharding unlocks storage and throughput scale well beyond a single machine, but complicates cross-shard transactions (often requiring a distributed transaction protocol or accepting eventual consistency across shards), rebalancing (moving data when adding/removing shards), and operational complexity (N databases to manage instead of 1). It should be adopted when a single instance's storage or throughput ceiling is the actual bottleneck, not preemptively, since it is one of the harder-to-reverse architectural decisions.",
        codeExample: "Sharding gains: storage/throughput scale beyond one machine\\nSharding costs: cross-shard query complexity, rebalancing effort, N-database operational overhead"
      }
    ],
    examples: [
      {
        title: "A poorly chosen shard key causing scatter-gather",
        input: "A multi-tenant analytics platform shards by event_id (random UUID) instead of tenant_id, but 90% of queries filter by tenant_id for a single tenant's dashboard",
        output: "Nearly every dashboard query must scatter-gather across all shards and merge results, even though each query only needs one tenant's data",
        explanation: "Step 1: Because event_id is unrelated to tenant_id, a single tenant's events are scattered randomly across every shard. Step 2: A query for 'show tenant X's last 100 events' must query all N shards, since any of them might hold a matching event, then merge and re-sort the combined results in the application layer. Step 3: Fixing this means resharding by tenant_id instead, so each tenant's data lives on one (or a small, known, set of) shard(s), and the dashboard query becomes a single-shard query - the resharding effort here is the direct cost of the original wrong key choice."
      }
    ],
    complexity: { time: "O(1) to route to a shard, O(shards) for cross-shard scatter-gather", space: "O(n) total across all shards" },
    tips: ["Choose the partition key to match the dominant query pattern, not an arbitrary unique ID", "A wrong shard key forces scatter-gather queries across every shard, which multiplies load", "Adopt sharding when storage/throughput ceiling is the real bottleneck, not preemptively"],
    tricks: ["When proposing sharding, immediately state the chosen partition key and justify it against the dominant query pattern", "If cross-shard joins are unavoidable, name the mitigation explicitly (denormalize, scatter-gather with merge, or a separate analytical store) rather than ignoring the problem"],
    memoryAids: ["Shard key should match your most common query filter", "Hash-based = even but no ranges, range-based = ranges but hotspots, directory-based = flexible but extra hop"],
    interviewPatterns: ["Comes up whenever a single database's storage or throughput is clearly insufficient for the estimated load", "Follow-up: 'how do you handle a query that needs data from multiple tenants/shards?' - discuss scatter-gather cost or a separate analytical/aggregation store"],
    references: [
      { source: "note", attribution: "Distributed database sharding strategy documentation (concept reference, e.g. Vitess/Citus patterns)", insight: "The partition key choice, matched to the dominant query pattern, determines whether sharding helps or forces expensive scatter-gather queries." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-sharding-key-choice", "hld-sharding-scatter-gather-fix"]
  },

  {
    id: "topic-hld-message-queue",
    moduleId: "mod-hld-design-exercises",
    title: "Message Queues",
    intuition: "Handling every task synchronously ties the caller's latency and availability to the slowest downstream step; a queue decouples producers from consumers so bursts are absorbed and slow consumers don't block callers.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "A message queue decouples producers (that enqueue work) from consumers (that process it asynchronously), smoothing traffic spikes and letting each side scale and fail independently. Clarifying questions: does processing order matter (strict per-key ordering vs any order)? Is at-least-once delivery (with consumer-side dedup) acceptable, or is exactly-once required (harder, usually approximated via idempotency)? What is the acceptable processing delay (seconds vs minutes)?",
        codeExample: "Clarify: ordering requirement? at-least-once + dedup, or exactly-once? acceptable processing delay?"
      },
      {
        title: "Functional & non-functional requirements",
        content: "Functional: producers enqueue messages durably; consumers dequeue, process, and acknowledge (ack) messages; unacknowledged messages are redelivered after a visibility timeout; a dead-letter queue captures messages that repeatedly fail processing. Non-functional: the queue should absorb bursts well above steady-state throughput without dropping messages; consumer failure should not lose messages (they become visible again for redelivery); processing should scale horizontally by adding more consumers.",
        codeExample: "Functional: enqueue(msg) -> durable store -> consumer dequeues -> processes -> ack (or nack/timeout -> redeliver)\\nNon-functional: absorb bursts, no message loss on consumer failure, horizontally scalable consumers"
      },
      {
        title: "Back-of-envelope estimates",
        content: "An email-sending pipeline enqueues 2M jobs/day (~23 jobs/sec average, ~230/sec at a 10x campaign-send burst). If each consumer processes 50 jobs/sec, roughly 5 consumer instances handle peak load; provisioning ~8 gives headroom for one instance's failure. Queue storage for a 2KB average message with a 24-hour retention window: 2M * 2KB = 4GB/day, trivial for the queue's durable storage.",
        codeExample: "peak 230 jobs/sec / 50 jobs/sec per consumer = ~5 consumers minimum, ~8 with headroom"
      },
      {
        title: "Requirement-driven architecture",
        content: "Producer (application service) -> durable queue (partitioned by a key if ordering matters) -> pool of consumers that pull/receive messages, process them, and ack. Failed processing results in the message becoming visible again after a timeout (retry) or, after N failed attempts, being routed to a dead-letter queue for manual inspection instead of retrying forever.",
        diagram: asciiDiagram(
`Interview drawing order:
1) producer 2) queue (partitioned) 3) consumer pool 4) ack/nack 5) dead-letter queue

Producer --enqueue--> Queue (partition by key if ordering matters) --> Consumer 1
                                                                    --> Consumer 2
                                                                    --> Consumer 3
failed after N retries --> Dead-Letter Queue (for manual inspection)`
        )
      },
      {
        title: "Component responsibilities and ordering",
        content: "Queue/broker: durably stores messages until acknowledged, tracks per-message delivery attempts, and manages the visibility timeout for redelivery. Consumer: processes a message idempotently (safe to reprocess, since at-least-once delivery means duplicates are possible) and explicitly acks only after successful processing, never before. Ordering: if strict per-key ordering is required (e.g. all events for one user must be processed in order), partition the queue by that key and ensure only one consumer processes a given partition at a time; global ordering across all messages is rarely required and would force a single consumer, defeating the purpose of horizontal scaling.",
        codeExample: "process(msg): if alreadyProcessed(msg.idempotencyKey) return; doWork(msg); markProcessed(msg.idempotencyKey); ack(msg)"
      },
      {
        title: "Reliability, security, and observability",
        content: "Reliability: at-least-once delivery (the practical default) means consumers must be idempotent to handle duplicate delivery safely; a dead-letter queue prevents a single poison message from blocking a partition forever by retrying indefinitely. Security: producers and consumers authenticate to the queue; message payloads containing sensitive data should be encrypted or reference a separate secure store rather than embedding secrets directly. Observability: queue depth/backlog (growing backlog signals consumers can't keep up), consumer processing latency, redelivery/retry rate, and dead-letter queue volume (a rising DLQ count signals a systemic processing bug, not just occasional bad messages).",
        codeExample: "Alert if: queue depth grows sustained over time (consumers falling behind), or DLQ volume spikes (systemic processing failure)"
      },
      {
        title: "Trade-offs",
        content: "Queues improve resilience (a slow/failed consumer doesn't block the producer) and let load be smoothed over time, but they add end-to-end latency (work is no longer synchronous) and complexity (idempotency, redelivery, ordering, dead-letter handling all need explicit design). Strict per-key ordering constrains scaling (only one consumer per ordered partition at a time), so it should only be required where genuinely necessary, not applied broadly by default.",
        codeExample: "Queue gains: resilience, burst absorption, decoupling\\nQueue costs: added latency, idempotency/dedup complexity, ordering constrains parallelism"
      }
    ],
    examples: [
      {
        title: "A poison message blocking a partition",
        input: "A malformed message (missing a required field) causes its consumer to throw an exception every time it's processed, and it keeps getting redelivered to the front of its ordered partition",
        output: "After 5 failed attempts, the message is routed to the dead-letter queue instead of retrying forever, unblocking the rest of that partition's messages",
        explanation: "Step 1: The consumer picks up the malformed message, fails to process it, and does not ack it, so after the visibility timeout it becomes available for redelivery. Step 2: Because this partition preserves ordering, this same message is redelivered before any later message in the partition can be processed, risking indefinitely blocking that partition. Step 3: A max-retry count (e.g., 5) is tracked per message; once exceeded, the queue routes the message to a dead-letter queue instead of redelivering it again. Step 4: The partition then proceeds to the next message, and the dead-lettered message is available for manual inspection and reprocessing after a fix."
      }
    ],
    complexity: { time: "O(1) enqueue/dequeue", space: "O(backlog size)" },
    tips: ["Consumers must be idempotent because at-least-once delivery means duplicates will happen", "A dead-letter queue prevents one bad message from blocking an ordered partition forever", "Only require strict ordering where genuinely necessary - it constrains consumer parallelism"],
    tricks: ["When asked 'what if a consumer crashes mid-processing?', answer with the visibility-timeout redelivery mechanism plus why idempotency is required as a result", "If ordering comes up, immediately connect it to the partitioning scheme and its parallelism cost"],
    memoryAids: ["Queue = decouple producer speed from consumer speed", "At-least-once + idempotent consumer = practical default; exactly-once is hard and rarely truly needed"],
    interviewPatterns: ["Comes up whenever a slow/unreliable downstream step (email, notifications, image processing) shouldn't block the user-facing request", "Follow-up: 'how do you guarantee no message is lost?' -> durable queue + ack-after-success + redelivery on timeout"],
    references: [
      { source: "note", attribution: "Kafka/SQS message-queue delivery-semantics documentation (concept reference)", insight: "At-least-once delivery with idempotent consumers is the practical default; true exactly-once delivery is rarely necessary and much harder to guarantee." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-message-queue-poison-message", "hld-message-queue-ordering-partition"]
  },

  {
    id: "topic-hld-consistency",
    moduleId: "mod-hld-design-exercises",
    title: "Consistency Trade-offs",
    intuition: "Consistency is not a single global setting for a system, it is a per-operation decision: some writes must be seen immediately and correctly everywhere, others can lag behind for the sake of speed and availability.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "Consistency describes what guarantee a read gives about seeing the most recent write. Strong consistency means every read sees the latest acknowledged write, everywhere, immediately. Eventual consistency means reads may see a stale value for some window after a write, but all replicas converge to the same value eventually. Clarifying questions: what is the actual cost of a stale read for this specific operation (a business risk like overselling, or a cosmetic issue like a slightly outdated like-count)? Is the operation a financial/inventory transaction or a social/content read?",
        codeExample: "Clarify: cost of a stale read for THIS operation - business risk (financial/inventory) or cosmetic (social feed)?"
      },
      {
        title: "Deciding per operation, not per system",
        content: "A bank transfer write needs strong consistency: a read immediately after the transfer must reflect the new balance, or a user could see stale data and make a decision based on wrong information (e.g., attempt to spend money that was already moved). A social media like-count read can be eventually consistent: showing a like-count that is a few seconds stale has no real business cost, and enforcing strong consistency there would add unnecessary latency and reduce availability during partitions for no benefit. Most large systems mix strategies: strongly consistent for the specific operations where correctness has real business cost, eventually consistent everywhere else for latency and availability.",
        codeExample: "bank transfer write/read -> strong consistency (quorum write, majority read)\\nlike-count/view-count read -> eventual consistency (any replica, no quorum needed)"
      },
      {
        title: "Mechanisms for each",
        content: "Strong consistency is typically achieved via quorum writes/reads (a write must be acknowledged by a majority of replicas before being considered committed, and a read queries a majority to ensure it sees the latest committed value) or by routing all reads/writes for a given key to a single primary. Eventual consistency is achieved by allowing any replica to serve reads and letting asynchronous replication catch replicas up over time, with conflict resolution (last-write-wins, vector clocks, or CRDTs) for the rare case of concurrent writes to the same key on different replicas.",
        codeExample: "Strong: write needs ack from majority(N/2+1) replicas; read queries majority, takes highest version\\nEventual: write acked by primary immediately, propagates async; any replica can serve reads"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> Application service -> routing decision per operation type: correctness-critical operations (payments, inventory decrements, account state changes) go through a strongly-consistent path (single primary or quorum-based store); everything else (feeds, counters, recommendations, search results) goes through an eventually-consistent path (cache, read replicas, or an eventually-consistent store) for lower latency and higher availability.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client 2) app service 3) classify operation 4) route to consistency-appropriate path

Client --> App Service --classify op-->
   correctness-critical (payment, inventory) --> Strong path: primary/quorum store
   cosmetic/high-volume (likes, views, feed)  --> Eventual path: replicas/cache, async propagation`
        )
      },
      {
        title: "Reliability and observability",
        content: "Reliability: strongly consistent paths must handle the case where a quorum cannot be reached (during a partition) by rejecting the operation rather than guessing - correctness takes priority over availability there. Eventually consistent paths should have a documented maximum staleness bound and should surface that bound if it grows unexpectedly (e.g., a lagging replica). Observability: for strongly consistent paths, track quorum-write latency and quorum-failure rate (partition indicator); for eventually consistent paths, track replication lag as the primary signal of how stale reads might currently be.",
        codeExample: "Alert if: quorum-write failure rate rises (partition/network issue), or eventual-path replication lag exceeds the documented staleness bound"
      },
      {
        title: "Trade-offs",
        content: "Strong consistency guarantees correctness but costs latency (must coordinate with a quorum or a single primary) and can reduce availability during a network partition (better to reject a write than risk an incorrect one). Eventual consistency maximizes latency and availability but accepts a staleness window and, in rare concurrent-write scenarios, requires an explicit conflict-resolution policy. The skill being tested in interviews is correctly classifying which operations need which guarantee, not defaulting the whole system to one extreme.",
        codeExample: "Strong: correctness first, costs latency + availability during partition\\nEventual: latency/availability first, costs staleness window + conflict resolution need"
      }
    ],
    examples: [
      {
        title: "Bank transfer vs social feed in the same platform",
        input: "A social app with an in-app wallet feature needs both a balance-transfer operation and a friend-activity feed",
        output: "Balance transfers route through a strongly consistent quorum-based store; the activity feed is served from eventually consistent read replicas with a cache",
        explanation: "Step 1: The balance transfer is classified as correctness-critical (a wrong balance read could let a user act on stale information), so its write requires quorum acknowledgment and its read queries a majority of replicas. Step 2: The activity feed is classified as cosmetic-tolerant: a few seconds of staleness in a friend's post appearing has no real cost, so it is served from any nearby read replica or cache for much lower latency and higher availability. Step 3: This is a single platform intentionally using two different consistency models for two different operations, which is the correct real-world pattern rather than picking one model for the whole system."
      }
    ],
    complexity: { time: "O(quorum size) per strongly consistent operation, O(1) per eventually consistent operation", space: "O(replicas)" },
    tips: ["Classify by operation, not by system: most large systems mix strong and eventual consistency", "Ask 'what is the real business cost of a stale read here?' before choosing a consistency model", "Strongly consistent operations should reject during a partition rather than guess"],
    tricks: ["When asked 'is your system consistent?', answer per operation type rather than declaring the whole system one model", "Name the concrete mechanism (quorum write/read, or async replication + conflict resolution) rather than only the label (strong/eventual)"],
    memoryAids: ["Money/inventory = strong (correctness matters); likes/views/feeds = eventual (speed matters)", "Strong = coordinate with quorum/primary; eventual = any replica, converge later"],
    interviewPatterns: ["Interviewers often probe with 'is that read guaranteed to be up to date?' - answer with the specific consistency model chosen for that specific operation and why", "Follow-up: 'what happens during a network partition?' -> strong path rejects/queues; eventual path keeps serving possibly-stale data"],
    references: [
      { source: "note", attribution: "CAP theorem and PACELC consistency-model documentation (concept reference)", insight: "Consistency is most usefully modeled per-operation rather than as a single global property of a system." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-consistency-wallet-vs-feed", "hld-consistency-partition-behavior"]
  },

  {
    id: "topic-hld-idempotent-design",
    moduleId: "mod-hld-design-exercises",
    title: "Idempotent APIs",
    intuition: "Networks drop responses, not just requests; a client that retries a payment after a timeout must not risk charging the customer twice, which means the operation itself must be safe to repeat.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "An idempotent operation produces the same end result no matter how many times it is applied with the same input, so a client retry after a timeout or dropped response is always safe. Clarifying questions: which operations are naturally idempotent already (e.g. 'set balance to $100' is idempotent, 'add $100 to balance' is not) and which need explicit idempotency support (payments, order creation, notification sends)? Does the client control the idempotency key, or must the server generate one?",
        codeExample: "Clarify: which operations are naturally idempotent vs need explicit support? client-supplied or server-generated idempotency key?"
      },
      {
        title: "The core mechanism: idempotency keys",
        content: "The client generates a unique idempotency key (typically a UUID) per logical operation attempt (not per HTTP retry - the same key is reused across retries of the same logical request) and sends it with the request. The server checks if it has already processed that key: if so, it returns the previously computed result without repeating the side effect (charging, creating, sending); if not, it processes the request and durably records the key with its result before responding.",
        codeExample: "POST /payments {idempotencyKey: 'req-abc123', amount: 100}\\nserver: if seen(idempotencyKey) return storedResult(idempotencyKey)\\nelse: process(); store(idempotencyKey, result); return result"
      },
      {
        title: "Requirement-driven architecture",
        content: "Client -> API gateway/service, with an idempotency-key lookup table (keyed by the client-supplied key, storing the request hash and the response) consulted before executing the underlying operation. The lookup and the underlying operation's write must be atomic (in the same transaction, or via a compare-and-set on the key) to avoid a race where two concurrent retries both pass the 'not yet processed' check and both execute the side effect.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client (idempotency key) 2) service 3) key lookup table 4) underlying operation (atomic with key insert)

Client --POST {idempotencyKey}--> Service
                                     |
                          key seen in lookup table?
                          yes -> return stored result (no side effect repeated)
                          no  -> atomically: insert key + execute operation -> store result -> return`
        )
      },
      {
        title: "Component responsibilities and concurrency",
        content: "Idempotency key store: a fast, durable key-value store (often the same database, in a dedicated table, or Redis with a TTL matching how long retries are expected) mapping key -> {status: in-progress|completed, result}. Concurrency handling: if two retries with the same key race, the first to insert the key (via a unique constraint or compare-and-set) proceeds with the operation; the second sees the key already exists in 'in-progress' state and either waits briefly for the result or returns a 'still processing' response rather than executing the operation a second time.",
        codeExample: "INSERT INTO idempotency_keys(key, status) VALUES (?, 'in-progress') ON CONFLICT DO NOTHING;\\nif inserted: proceed with operation, then UPDATE status='completed', result=...\\nif not inserted (conflict): read existing status/result, return it (or 'processing, retry shortly')"
      },
      {
        title: "Reliability, security, and observability",
        content: "Reliability: idempotency keys should have a bounded retention/TTL (e.g., 24 hours) matching realistic client retry windows, not kept forever, to bound storage growth. Security: the idempotency key should be scoped to the authenticated client/account (a key from one user should not let them read another user's stored result), and keys should be treated as sensitive-adjacent (unguessable, e.g. UUIDs) so they cannot be used to probe other users' operations. Observability: track the rate of idempotency-key hits (repeated requests with an already-seen key) as a signal of client-side retry behavior or network instability, and track in-progress keys that never complete (stuck operations).",
        codeExample: "Alert if: a meaningful fraction of requests are idempotency-key hits (indicates client retries or network issues upstream), or keys stay 'in-progress' past an expected completion window"
      },
      {
        title: "Trade-offs",
        content: "Idempotency adds a lookup-and-store step to every request (extra latency and storage), and requires careful atomicity to avoid a race where duplicate side effects still occur. The alternative - trusting clients not to double-submit, or relying on manual reconciliation after the fact - is fragile and unacceptable for financial or otherwise consequential operations. The cost of idempotency support is well justified specifically for operations where a duplicate side effect (double charge, duplicate order, duplicate notification) is costly; it may be unnecessary overhead for naturally idempotent or low-consequence operations.",
        codeExample: "Idempotency gains: safe client retries, no duplicate side effects\\nIdempotency costs: extra lookup/store step, atomicity complexity for the race case"
      }
    ],
    examples: [
      {
        title: "A payment retried after a network timeout",
        input: "A client sends a $50 payment request with idempotencyKey='pay-9f21', the server processes it and charges the card, but the response is lost in transit; the client, seeing a timeout, retries the exact same request with the same key",
        output: "The customer is charged exactly once; the retry returns the same success result as the original request without a second charge",
        explanation: "Step 1: The original request is processed: the payment provider is charged, and the result (success, transaction ID) is stored against key 'pay-9f21' before the response is sent - the response is lost afterward due to the network issue, but the side effect and its record are already durably committed. Step 2: The client's retry arrives with the same key. Step 3: The server looks up 'pay-9f21', finds it already completed, and returns the stored result directly without charging the payment provider again. Step 4: The customer sees a successful payment exactly once, and the client's retry-after-timeout behavior is safe by design rather than by luck."
      }
    ],
    complexity: { time: "O(1) key lookup per request", space: "O(active keys within the retention window)" },
    tips: ["The idempotency key must be reused across retries of the same logical request, not regenerated per HTTP attempt", "Key insertion and the underlying operation must be atomic to prevent a race where two concurrent retries both execute the side effect", "Scope idempotency keys to the authenticated caller so they can't be used to probe other users' results"],
    tricks: ["When asked how to prevent duplicate charges/orders on retry, describe the atomic insert-then-execute mechanism explicitly, not just 'use an idempotency key' as a label", "Name the concurrency race case (two simultaneous retries) and how the atomic key insert resolves it"],
    memoryAids: ["Idempotency key = same input, same result, no matter how many times it's sent", "Insert the key and do the work atomically, or a race can still cause duplicates"],
    interviewPatterns: ["Comes up whenever payments, order creation, or any consequential write is discussed under a 'what if the client retries?' follow-up", "Follow-up: 'what if two retries with the same key arrive at the exact same time?' -> atomic insert (unique constraint/CAS) ensures only one executes the operation"],
    references: [
      { source: "note", attribution: "Stripe API idempotency-key documentation (concept reference)", insight: "An idempotency key reused across retries, combined with an atomic insert-then-execute check, is the standard mechanism for making consequential operations safely retryable." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-idempotency-payment-retry", "hld-idempotency-concurrent-race"]
  },

  {
    id: "topic-hld-chat-system",
    moduleId: "mod-hld-design-exercises",
    title: "Chat System Design",
    intuition: "This is the same core problem as the Messaging/Chat System deep-dive: combining low-latency delivery for online users with durable, replayable storage for offline users and message history.",
    lesson: [
      {
        title: "Definition & clarifying questions",
        content: "This topic is the introductory framing for real-time chat system design, covered in full AlgoMaster-style depth (requirements, capacity estimates, APIs, architecture, data model, flows, scaling, consistency, reliability, security, observability, and trade-offs, with two dedicated flow diagrams) under 'Messaging / Chat System' in the HLD design-exercises module. Clarifying questions before designing one: 1:1 only or also group chat? What is the acceptable online-delivery latency? Must offline users receive full history on reconnect, and how far back?",
        codeExample: "See the full deep-dive: 'Messaging / Chat System' (topic-hld-messaging-chat) for the complete requirements-through-trade-offs treatment"
      },
      {
        title: "Why real-time delivery and durable storage must coexist",
        content: "A chat system cannot be purely real-time (an in-memory pub/sub) because offline users would lose messages sent while disconnected, and cannot be purely storage-based (poll the database) because that adds unacceptable latency for online users expecting near-instant delivery. The standard solution is a durable, ordered write path (so no message is ever lost and history can be replayed) combined with a low-latency push path (WebSocket) for currently-connected recipients.",
        codeExample: "message arrives -> durably written with a sequence number (never lost) -> pushed over WebSocket if recipient online (low latency) -> sits in offline inbox if not (delivered on reconnect)"
      },
      {
        title: "Core architecture at a glance",
        content: "Client maintains a persistent WebSocket connection to a stateless chat-service gateway. On send, the service durably writes the message (partitioned by conversation ID for ordering) and either pushes it immediately to online recipients (via a presence registry that tracks which gateway node holds each user's connection) or leaves it in an offline inbox for delivery on reconnect.",
        diagram: asciiDiagram(
`Interview drawing order:
1) client(s) 2) gateway/LB 3) chat service 4) message store 5) presence cache 6) offline inbox

Client(s) --WS--> Gateway/LB --> Chat Service (stateless)
                                    |            |
                                    v            v
                          Message Store    Presence Cache
                        (partitioned by      (who's online,
                         conversationId)      which gateway node)
                                    |
                          online -> push via WS
                          offline -> sits in inbox, delivered on reconnect`
        )
      },
      {
        title: "Where to go for the full depth",
        content: "For back-of-envelope capacity math, the full API contract, database schema, requirement-driven component breakdown, the create/delivery and offline-reconnect flow diagrams, scaling and partitioning strategy, consistency model (strong per-conversation ordering, eventually consistent presence/receipts), reliability (idempotent sends, dead-letter handling), security, observability, and the explicit trade-offs discussion, see the 'Messaging / Chat System' topic in this same HLD track, which covers this exact problem end-to-end.",
        codeExample: "This entry: framing + why real-time + durable storage coexist. Full spec: 'Messaging / Chat System' (topic-hld-messaging-chat)"
      }
    ],
    examples: [
      {
        title: "Why a purely real-time (no storage) design fails",
        input: "A design uses only an in-memory pub/sub (like a plain WebSocket broadcast) with no durable message store, to minimize latency",
        output: "Any message sent while a recipient is offline or briefly disconnected is permanently lost, which is unacceptable for a chat product",
        explanation: "Step 1: An in-memory-only pub/sub delivers a message only to currently-subscribed (online) connections; there is nothing to replay from once the message has been broadcast. Step 2: If the recipient's app was closed, their phone was off, or their connection briefly dropped during a network handoff, the message is gone. Step 3: The fix is the durable-write-then-push architecture: every message is first written to durable, ordered storage (never lost) and pushing to online recipients is a secondary, best-effort delivery path layered on top of that durable write - not a substitute for it."
      }
    ],
    complexity: { time: "Depends on request path and storage strategy", space: "Depends on retained data and replication" },
    tips: ["Real-time push and durable storage are not alternatives, they are complementary layers of the same design", "See 'Messaging / Chat System' in this track for the complete requirements-through-trade-offs treatment", "Always clarify 1:1-only vs group chat scope before designing, since group fan-out changes the architecture"],
    tricks: ["If asked to design a chat system, start by naming both layers (durable ordered write path + low-latency push path) before diving into either one", "Reference the presence registry explicitly as the mechanism that lets the system know which gateway node holds a given user's live connection"],
    memoryAids: ["Durable write first (never lose a message), push second (deliver it fast if you can)"],
    interviewPatterns: ["A very common HLD interview prompt on its own; see the full deep-dive topic in this track for the complete answer structure", "Follow-up: 'what if the recipient is offline?' -> offline inbox + push notification + full history fetch on reconnect"],
    references: [
      { source: "note", attribution: "See 'Messaging / Chat System' (topic-hld-messaging-chat) in this track for the complete AlgoMaster-style treatment with full API/data-model/flow detail", insight: "Durable, partition-ordered storage combined with a presence-aware push layer is the standard architecture for real-time chat with offline support." },
      systemDesignPrimerRef
    ],
    practiceProblems: ["hld-chat-system-realtime-vs-durable", "hld-chat-system-offline-delivery"]
  }
];
