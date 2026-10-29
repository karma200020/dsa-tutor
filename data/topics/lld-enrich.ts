// LLD-specific enrichment: the mock-interview solution specs and the LLD FAQ
// builder. Only imported by data/topics/lld.ts, so it is never bundled with
// another track.
import { Example, FaqItem, LessonSection, Topic } from "../syllabus";
import { diagramBlock, primerSourceLinks } from "./shared";
import { TrackEnricher } from "./enrich";

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

function compact(text: string, limit = 1200): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function lessonEvidence(topic: Topic, keywords: string[], fallbackIndex: number): string {
  const lessons = topic.lesson || [];
  const match = lessons.find((section) => {
    const text = `${section.title} ${section.content}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
  const section = match || lessons[Math.min(fallbackIndex, Math.max(lessons.length - 1, 0))];
  if (!section) return topic.intuition;
  const code = section.codeExample ? ` Contract/example: ${section.codeExample}` : "";
  return compact(`${section.title}: ${section.content}${code}`);
}

function exampleEvidence(topic: Topic): string {
  const example = topic.examples?.[0];
  if (!example) return topic.intuition;
  return compact(`Input/scenario: ${example.input}. Expected result: ${example.output}. Walkthrough: ${example.explanation}`);
}

function buildLldFaq(
  topic: Topic,
  title: string,
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
  const relationshipEvidence = lessonEvidence(topic, ["relationship", "composition", "inheritance", "association", "depend"], 0);
  const contractEvidence = lessonEvidence(topic, ["api", "interface", "contract", "method"], 1);
  const patternEvidence = lessonEvidence(topic, ["pattern", "strategy", "factory", "observer", "state"], 0);
  const transitionEvidence = lessonEvidence(topic, ["state", "transition", "flow", "lifecycle"], 1);
  const extensionEvidence = lessonEvidence(topic, ["extens", "variant", "change", "open-closed"], 1);
  const concreteExample = exampleEvidence(topic);
  return [
    {
      question: `What authored requirement defines ${title}?`,
      answer: topic.intuition,
      source: track,
      category: "Requirements",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `Which entities or relationships carry the behavior in ${title}?`,
      answer: `${topic.intuition} Authored relationship evidence: ${relationshipEvidence}`,
      source: track,
      category: "Entities & Relationships",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What contract or public operation is central to ${title}?`,
      answer: `${topic.intuition} Authored contract evidence: ${contractEvidence}`,
      source: track,
      category: "Contracts",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `Which pattern or modeling choice is actually used by ${title}?`,
      answer: `${topic.intuition} Authored pattern evidence: ${patternEvidence}`,
      source: track,
      category: "Patterns",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `How does the primary state or interaction progress in ${title}?`,
      answer: `${topic.intuition} Authored state/interaction evidence: ${transitionEvidence}`,
      source: track,
      category: "State & Interaction",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What authored seam allows ${title} to change without losing its contract?`,
      answer: `${topic.intuition} Authored change-point evidence: ${extensionEvidence}`,
      source: track,
      category: "Extensibility",
      sourceLinks: [primerSourceLinks.lld]
    },
    {
      question: `What concrete scenario should a ${title} implementation reproduce?`,
      answer: `${topic.intuition} ${concreteExample}`,
      source: track,
      category: "Testing",
      sourceLinks: [primerSourceLinks.lld]
    }
  ];
}

export const lldEnricher: TrackEnricher = {
  buildSolution: (topic, title) => buildLldMockSolution(topic.id, title),
  buildFaq: (topic, title) => buildLldFaq(topic, title, lldMockSolutions[topic.id] || null)
};
