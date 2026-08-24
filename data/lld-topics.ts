import { Topic, Reference } from "./syllabus";

// Text/monospace diagram helper, matching the ASCII-flow convention used in
// hld-topics.ts and all-topics.ts. Renders class/sequence-style diagrams
// natively (no external images) so they stay readable and easy to redraw on
// an interview whiteboard.
function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

// Shared citation for the benchmark LLD interview-prep repo used as
// inspiration for gap-filling topics below. Explanations are original; only
// the category checklist (OOP fundamentals, SOLID/DRY/YAGNI/KISS, creational/
// structural/behavioral patterns, UML, concurrency, interview framework,
// tiered problems) guided which topics to add.
const lldPrimerRef: Reference = {
  source: "note",
  attribution: "ashishps1/awesome-low-level-design (GitHub: https://github.com/ashishps1/awesome-low-level-design) - used as an inspiration/category checklist only",
  insight: "The repo's curriculum structure (OOP fundamentals, principles, creational/structural/behavioral patterns, UML, concurrency, interview framework, tiered problems) guided which topics to add here; all explanations below are original."
};

export const lldTopics: Topic[] = [
  // ===== OOP FOUNDATIONS (2 Topics) =====
  {
    id: "topic-lld-oop-solid",
    moduleId: "mod-lld-oop-foundations",
    title: "SOLID Principles",
    intuition: "Design classes and interfaces following SOLID principles to make systems extensible, testable, and maintainable.",
    lesson: [
      {
        title: "The Five SOLID Principles",
        content: "S: Single Responsibility - One reason to change. O: Open-Closed - Open for extension, closed for modification. L: Liskov Substitution - Derived classes must be substitutable. I: Interface Segregation - Clients depend on focused interfaces. D: Dependency Inversion - Depend on abstractions, not concretions.",
        codeExample: "// S: Single Responsibility\nclass UserRepository {\n  saveUser(user) { /* DB save */ }\n}\nclass UserValidator {\n  validate(user) { /* Validation */ }\n}\n\n// O: Open-Closed (extend with Strategy)\ninterface PaymentStrategy {\n  process(amount): boolean;\n}\nclass CreditCardPayment implements PaymentStrategy { }\nclass PayPalPayment implements PaymentStrategy { }",
        diagram: asciiDiagram(
`Open-Closed via Strategy (drawing order: client, abstraction, implementations):

PaymentProcessor --depends on--> <<interface>> PaymentStrategy
                                       ^
                        +--------------+--------------+
                CreditCardPayment  PayPalPayment  BitcoinPayment (added later, no edits above)`
        )
      },
      {
        title: "Applying SOLID to Interviews",
        content: "When designing a system, ask: Does each class have one clear responsibility? Can I add new features without modifying existing code (Open-Closed)? Can I swap implementations without breaking client code (Liskov + Dependency Inversion)?",
        codeExample: "// BAD: Violates Open-Closed and SRP\nclass PaymentProcessor {\n  process(type, amount) {\n    if (type == 'CC') { /* credit card */ }\n    else if (type == 'PP') { /* paypal */ }\n  }\n}\n\n// GOOD: Follows Open-Closed via Strategy\nclass PaymentProcessor {\n  constructor(private strategy: PaymentStrategy) {}\n  process(amount) { return this.strategy.process(amount); }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Payment System Design",
        input: "Design payment system supporting credit card, PayPal, Apple Pay, Bitcoin",
        output: "Strategy pattern with PaymentStrategy interface and implementations",
        explanation: "Step 1: Define PaymentStrategy interface with process(amount) method. Step 2: Implement CreditCardPayment, PayPalPayment, ApplePayPayment, BitcoinPayment. Step 3: PaymentProcessor takes strategy in constructor. Step 4: Adding new payment type requires only new implementation, no modification to existing code (Open-Closed).",
        diagram: undefined
      }
    ],
    tips: ["Ask 'What if we add a new feature?' If answer requires modifying multiple classes, you likely violate Open-Closed", "Thread-safe singletons need double-checked locking or enum", "Composition over inheritance - always prefer"],
    references: [{ source: "book", attribution: "Clean Code by Robert C. Martin", insight: "SOLID is expected knowledge for senior roles." }],
    practiceProblems: []
  },

  {
    id: "topic-lld-composition-abstraction",
    moduleId: "mod-lld-oop-foundations",
    title: "Composition vs Inheritance",
    intuition: "Prefer composition (has-a) over inheritance (is-a). Use abstraction to hide implementation details.",
    lesson: [
      {
        title: "When to Use Each",
        content: "Inheritance: true 'is-a' relationship sharing core behavior. Composition: 'has-a' relationships, flexible behavior variation. Rule: Composition is safer, use first. Inheritance only for genuine hierarchies.",
        codeExample: "// Inheritance (is-a) - OK when genuine\nclass Animal { }\nclass Dog extends Animal { }\n\n// Composition (has-a) - More flexible\nclass Car {\n  private engine: Engine;\n  private wheels: Wheel[];\n  constructor(engine: Engine, wheels: Wheel[]) { }\n}",
        diagram: asciiDiagram(
`Composition vs inheritance (drawing order: is-a edge, then has-a edge):

Vehicle <|--is-a-- Car          Car --has-a--> Engine
                                Car --has-a--> Wheel[]`
        )
      }
    ],
    examples: [
      {
        title: "Vehicle Design Problem",
        input: "Design Vehicle, Car, Bike, Truck with shared and unique behaviors",
        output: "Use inheritance for is-a (Vehicle base), composition for has-a (Engine, Wheel)",
        explanation: "Car is-a Vehicle (inheritance). Car has-a Engine (composition). This avoids deep hierarchies and allows flexible component reuse.",
        diagram: undefined
      }
    ],
    tips: ["Deep inheritance (AâBâCâD) is a red flag", "Different types of X usually means interface + composition", "Swap implementations at runtime with composition"],
    references: [{ source: "book", attribution: "Head First Design Patterns", insight: "Composition provides runtime flexibility." }],
    practiceProblems: []
  },

  // ===== CORE DESIGN PATTERNS (4 Topics) =====
  {
    id: "topic-lld-singleton-factory",
    moduleId: "mod-lld-core-patterns",
    title: "Singleton & Factory Patterns",
    intuition: "Singleton: Ensure only one instance (config, logger). Factory: Create objects without specifying concrete classes.",
    lesson: [
      {
        title: "Singleton Implementation",
        content: "Private constructor blocks direct instantiation. Static instance field holds sole instance. Public getInstance() returns it. Thread-safe approaches: eager initialization, lazy with double-checked locking, or enum (safest).",
        codeExample: "// Enum Singleton (safest in Java)\npublic enum Logger {\n  INSTANCE;\n  public void log(String msg) { /* ... */ }\n}\n\n// Usage\nLogger.INSTANCE.log(\"message\");",
        diagram: asciiDiagram(
`Singleton + Factory (drawing order: singleton first, then factory delegation):

[Logger.getInstance()] --always same--> [Logger INSTANCE]

[Client] --create("CC")--> [PaymentProcessorFactory] --returns--> [CreditCardProcessor]`
        )
      },
      {
        title: "Factory Pattern",
        content: "Static method encapsulates object creation. Takes input (type/params), returns appropriate subclass instance. Client decoupled from concrete classes. Adding new types doesn't require client changes.",
        codeExample: "class PaymentProcessorFactory {\n  static PaymentProcessor create(String type) {\n    switch(type) {\n      case 'CC': return new CreditCardProcessor();\n      case 'PP': return new PayPalProcessor();\n    }\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Logger Singleton",
        input: "Requirement: Single logger instance used across application",
        output: "Enum singleton ensuring thread-safe single instance",
        explanation: "Enum automatically provides thread-safe singleton. All loggers write to same instance. Prevents multiple instances which would duplicate logs.",
        diagram: undefined
      }
    ],
    tips: ["Singleton: Mention thread-safety", "Factory benefit: New types without client changes", "Lazy vs Eager: Discuss tradeoff"],
    references: [{ source: "book", attribution: "Design Patterns Gang of Four", insight: "These are bread-and-butter patterns." }],
    practiceProblems: []
  },

  {
    id: "topic-lld-strategy-observer",
    moduleId: "mod-lld-core-patterns",
    title: "Strategy & Observer Patterns",
    intuition: "Strategy: Encapsulate algorithms, pick at runtime. Observer: Notify multiple subscribers of state changes.",
    lesson: [
      {
        title: "Strategy Pattern",
        content: "Define interface for algorithm family. Implement concrete strategies. Client chooses strategy at runtime. Enables runtime behavior switching without modifying client.",
        codeExample: "interface SortStrategy { sort(List items); }\nclass QuickSortStrategy implements SortStrategy { }\nclass MergeSortStrategy implements SortStrategy { }\n\nclass SortingService {\n  private strategy: SortStrategy;\n  constructor(strategy: SortStrategy) { this.strategy = strategy; }\n  sort(items) { return this.strategy.sort(items); }\n}",
        diagram: asciiDiagram(
`Strategy + Observer (drawing order: strategy swap, then observer fan-out):

SortingService --uses--> <<interface>> SortStrategy <|-- QuickSortStrategy / MergeSortStrategy

Subject --notify()--> [Observer A] [Observer B] [Observer C]`
        )
      },
      {
        title: "Observer Pattern",
        content: "Subject maintains list of observers. On state change, notify all observers by calling their update() method. Observers unsubscribe when no longer interested.",
        codeExample: "interface Observer { update(data); }\nclass Subject {\n  private observers: Observer[] = [];\n  subscribe(o: Observer) { this.observers.push(o); }\n  notify(data) { this.observers.forEach(o => o.update(data)); }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "E-commerce Notification System",
        input: "Order placed. Notify email, SMS, push notification, inventory",
        output: "Observer pattern with multiple listeners",
        explanation: "Order is Subject. EmailNotifier, SMSNotifier, PushNotifier are Observers. OrderService.placeOrder() calls subject.notify(). Each observer reacts independently. Adding new notifier requires only new Observer implementation.",
        diagram: undefined
      }
    ],
    tips: ["Strategy: Vary algorithm. Observer: Vary reactions", "Observer: Implement unsubscribe to prevent memory leaks", "Both achieve: Loose coupling"],
    references: [{ source: "interview-experience", attribution: "Google LLD", insight: "Adding new notification types becomes one-liner with Observer." }],
    practiceProblems: []
  },

  // ===== DESIGN EXERCISES (9 Topics) =====
  {
    id: "topic-lld-parking-lot",
    moduleId: "mod-lld-design-exercises",
    title: "Parking Lot Design",
    intuition: "Multi-level parking lot with spots, tickets, payment. Entities: ParkingLot, Level, Spot, Vehicle, Ticket, PaymentProcessor.",
    lesson: [
      {
        title: "Requirements, clarifications, and core entities/responsibilities",
        content: "Requirements: support multiple levels, different vehicle sizes (compact/large/motorcycle/EV), ticket-based entry/exit with fee calculation, and clarify whether reservations and EV charging are in scope. Entities and responsibilities: ParkingLot (owns Levels, exposes park/unpark APIs); Level (owns ParkingSpots, tracks per-size availability); ParkingSpot (size, occupied state, single responsibility of tracking its own occupancy); Vehicle (type: compact/large/motorcycle/EV); Ticket (immutable record of entry time and assigned spot); PaymentProcessor (handles payment methods, kept separate from parking logic).",
        codeExample: "class ParkingLot {\n  private levels: Level[];\n  findAvailableSpot(vehicleType): Spot { /* Search levels */ }\n  parkVehicle(vehicle): Ticket { /* Assign spot */ }\n  unparkVehicle(ticket): amount { /* Calculate charge */ }\n}\n\nclass Level {\n  private spots: Spot[];\n  getAvailableSpot(size): Spot { /* Find spot of size */ }\n}",
        diagram: undefined
      },
      {
        title: "Interfaces/APIs, patterns, and extensibility",
        content: "APIs: ParkingLot.parkVehicle(vehicle) -> Ticket; ParkingLot.unparkVehicle(ticket) -> amountDue; ParkingLot.findAvailableSpot(vehicleType) -> Spot. Patterns: Strategy for different parking fee algorithms (flat rate, hourly, peak-hour surcharge), rejecting a single hardcoded if/else as it violates Open-Closed; Observer for level capacity alerts so displays are notified without polling; Factory for constructing different vehicle/spot types. Concurrency: two cars racing for the last spot must be serialized with a per-spot lock (or an atomic compare-and-swap on the spot's occupied flag) so only one Ticket is ever issued for that spot; a full lot must fail fast with a clear error rather than issuing an invalid ticket. Extensibility: adding electric charging stations only requires a new ParkingSpot subtype and a pricing rule in the Strategy, not a change to the core parking algorithm. Trade-offs: a single global lock across the whole lot is simpler to reason about but serializes all park/unpark calls lot-wide; per-spot locking scales better under concurrent load at the cost of slightly more complex code - for a multi-level lot with hundreds of spots, per-spot locking is the better trade-off.",
        codeExample: "interface PricingStrategy { calculateFee(hours, vehicleType): amount; }\nclass HourlyPricing implements PricingStrategy { }\nclass PeakHourPricing implements PricingStrategy { }\n\nclass ParkingLot {\n  constructor(private pricing: PricingStrategy) { }\n  calculateCharge(ticket) { return this.pricing.calculateFee(...); }\n}",
        diagram: asciiDiagram(
`Class diagram (drawing order: ParkingLot -> Level -> Spot, then Strategy):

  ParkingLot --1..*--> Level --1..*--> ParkingSpot
       |
       + uses PricingStrategy (Strategy, injected)
       + notifies Observer on level full/available`
        )
      }
    ],
    examples: [
      {
        title: "Park and unpark sequence",
        input: "Car enters parking lot, parks at Level 2 Spot 5, later exits",
        output: "Ticket issued with entry time, exit time recorded, fee calculated",
        explanation: "Step 1: Car requests spot. ParkingLot searches levels. Level 2 has available spot. Step 2: Spot marked occupied, Ticket created with entry time. Step 3: Car exits, exit time recorded. Step 4: PricingStrategy calculates fee based on duration and vehicle type. Step 5: PaymentProcessor charges vehicle. Concurrency: two cars racing for the last spot must be serialized with a per-spot lock or compare-and-swap so only one Ticket is ever issued for that spot, and a full lot returns a clear 'no spot available' error instead of an invalid ticket.",
        diagram: undefined
      }
    ],
    tips: ["Different vehicle sizes need different spot sizes", "Ticket should be immutable once created", "Consider overflow/queue when lot is full"],
    references: [{ source: "interview-experience", attribution: "Amazon LLD", insight: "Test extensibility: ask how to add electric charging stations." }, lldPrimerRef],
    practiceProblems: []
  },

  {
    id: "topic-lld-library-management",
    moduleId: "mod-lld-design-exercises",
    title: "Library Management System",
    intuition: "Track books, members, borrowing, returning. Entities: Book, Member, Librarian, Reservation, Fine.",
    lesson: [
      {
        title: "Requirements/use-cases and core entities",
        content: "Requirements: clarify max books per member, loan duration, and whether multiple copies of the same book must be tracked individually. Use cases: a member borrows an available book or joins a reservation queue if it is checked out; an overdue return triggers a fine; a librarian issues and receives books. Entities: Book (title, author, ISBN, availability), Member (name, ID, borrowing history), Librarian (issues tickets, processes returns), Reservation (FIFO queue for unavailable books), Fine (calculated for overdue returns).",
        codeExample: "class Book {\n  private isbn: String;\n  private title: String;\n  private available: boolean;\n}\n\nclass Member {\n  private id: String;\n  private borrowedBooks: Book[];\n  borrowBook(book: Book): BorrowTicket { }\n}\n\nclass Librarian {\n  issueBook(member, book) { /* Mark as borrowed */ }\n  receiveBook(member, book) { /* Check for overdue, calculate fine */ }\n}",
        diagram: undefined
      },
      {
        title: "APIs, patterns, extensibility, and trade-offs",
        content: "APIs: Library.checkout(memberId, bookId) -> BookIssue; Library.returnBook(issueId) -> Fine|null; Library.reserve(memberId, bookId) -> Reservation. Patterns: Observer so the next member in a reservation queue is notified when a held book becomes available, rather than polling; Strategy for fine calculation (flat per-day vs tiered). Concurrency/error handling: checkout must be guarded by a per-book lock (or an atomic decrement of available-copy count) so two members cannot both check out the last copy; returnBook must handle the error case of an already-returned or unknown issueId by raising a typed error instead of silently succeeding. Extensibility: adding e-book holds only requires a new Reservable type behind the same reservation queue interface, not a rewrite of Library. Trade-offs: a per-book FIFO reservation queue is simple and fair but does not optimize for which waiting member is physically closest to the branch holding the book - an acceptable simplification for a single-branch system.",
        codeExample: "interface Reservable { reserve(member): Reservation; }\nclass Book implements Reservable { }",
        diagram: asciiDiagram(
`Class diagram (drawing order: Library -> Book/Member -> BookIssue/Reservation):

  Library --*--> Book --*--> Reservation (FIFO queue)
     |
     +--*--> Member --*--> BookIssue (loan record, due date, fine)`
        )
      }
    ],
    examples: [
      {
        title: "Borrow and return workflow",
        input: "Member requests book, books out for 2 weeks, member returns 1 week late",
        output: "Ticket issued, fine calculated for 1 week overdue",
        explanation: "Step 1: Member.borrowBook() creates ticket with due date. Book marked borrowed. Step 2: Return after due date. Librarian.receiveBook() calculates days overdue (7 days). Step 3: Fine = 7 days x per-day rate. Step 4: Fine processed before member can borrow again. Concurrency: two members reserving the last copy simultaneously must be serialized so only one wins the queue position, and a returned copy with a pending reservation must atomically transition to 'held' rather than racing with a walk-in checkout.",
        diagram: undefined
      }
    ],
    tips: ["Handle multiple copies of same book", "Reservation queue when book unavailable", "Max borrowing limit per member"],
    references: [{ source: "interview-experience", attribution: "Facebook LLD", insight: "Discuss edge cases: book damaged, reservation cancellation." }, lldPrimerRef],
    practiceProblems: []
  },

  {
    id: "topic-lld-movie-booking",
    moduleId: "mod-lld-design-exercises",
    title: "Movie Booking System",
    intuition: "Theater chains, movies, shows, seat reservation, payment. Entities: Theater, Movie, Show, Seat, Booking, Payment.",
    lesson: [
      {
        title: "Requirements/use-cases and core entities",
        content: "Requirements: clarify seat hold duration, whether partial bookings are allowed, and payment methods supported. Use cases: a member searches shows, selects seats, holds them temporarily, and pays to confirm; an expired hold releases seats automatically. Entities: Theater (multiple screens/auditoriums), Movie (title, duration, rating), Show (specific date/time for a movie at a theater), Seat (reserved or available), Booking (links member to seats, payment status).",
        codeExample: "class Theater {\n  private screens: Screen[];\n}\n\nclass Screen {\n  private seats: Seat[];\n  reserveSeats(seatIds[], member): Booking { }\n}\n\nclass Booking {\n  private member: Member;\n  private seats: Seat[];\n  private totalPrice: float;\n  private status: BookingStatus; // PENDING, CONFIRMED, CANCELLED\n}",
        diagram: undefined
      },
      {
        title: "APIs, concurrency handling, patterns, and extensibility",
        content: "APIs: Screen.reserveSeats(seatIds, member) -> Booking(PENDING); Booking.confirm(payment) -> Booking(CONFIRMED); Booking.cancel() -> releases seats. Concurrency: multiple members booking simultaneously must lock seats during selection (per-seat lock or optimistic version check), reserve after payment confirmation, and use a 5-minute timeout to free unreserved seats so a stalled client never blocks a seat indefinitely. Patterns: State pattern for Booking (PENDING/CONFIRMED/CANCELLED) so an already-cancelled booking cannot be confirmed by construction. Extensibility: adding dynamic/surge pricing only requires a new PricingStrategy, not a change to seat-locking logic. Trade-offs: per-seat locking with a timeout is simpler than a full reservation-queue system but can very rarely release a seat mid-payment on a slow network - acceptable given the short hold window.",
        codeExample: "class Screen {\n  private seatLocks: Map<Seat, Timestamp>; // Track locks\n  reserveSeats(seatIds[], member) {\n    // Lock seats (5 min timeout)\n    // Proceed to payment\n    // Confirm or timeout\n  }\n}",
        diagram: asciiDiagram(
`Booking state diagram (drawing order: states, then transitions):

[Seats Free] --hold(5 min timer)--> [PENDING] --payment ok--> [CONFIRMED]
                                          |
                                     timeout/cancel
                                          v
                                    [Seats Free again]`
        )
      }
    ],
    examples: [
      {
        title: "Booking workflow with concurrency",
        input: "Two members select same seats simultaneously. Member A pays, Member B times out.",
        output: "Member A gets seats, Member B's seats released after timeout",
        explanation: "Member A and B select seats - both locked. Member A completes payment - seats confirmed to A. Member B's session expires (5 min timeout) - locks released, seats available again.",
        diagram: undefined
      }
    ],
    tips: ["Handle concurrent bookings with locks/transactions", "Implement seat hold timeout", "Support partial bookings (some seats unavailable)"],
    references: [{ source: "interview-experience", attribution: "Google System Design", insight: "Concurrency is the tricky part - discuss locking strategy." }, lldPrimerRef],
    practiceProblems: []
  },

  {
    id: "topic-lld-elevator-system",
    moduleId: "mod-lld-design-exercises",
    title: "Elevator System Design",
    intuition: "Multi-floor building, multiple elevators, button requests, scheduling. Entities: Building, Elevator, FloorRequest, Controller.",
    lesson: [
      {
        title: "Requirements/use-cases and core entities/responsibilities",
        content: "Requirements: clarify number of elevators, capacity limits, and whether express/maintenance modes are in scope. Use cases: a rider presses a floor/direction button and the closest compatible elevator is dispatched; an elevator in motion continues in its current direction until its queue in that direction is empty (SCAN-style). Entities and responsibilities: Building (owns Elevators), Elevator (current floor, direction, request queue - single responsibility of servicing its own queue), FloorRequest (floor + direction), Controller (dispatcher that assigns each request to the best elevator).",
        codeExample: "class Elevator {\n  private currentFloor: int;\n  private direction: Direction; // UP, DOWN, IDLE\n  private requestQueue: Queue<FloorRequest>;\n  move() {\n    if (direction == UP) goToNextUpRequest();\n    else goToNextDownRequest();\n  }\n}\n\nclass Controller {\n  assignRequest(request): Elevator { /* Find nearest idle or moving elevator */ }\n}",
        diagram: undefined
      },
      {
        title: "APIs, patterns, concurrency, and extensibility trade-offs",
        content: "APIs: Controller.requestElevator(floor, direction) -> Elevator; Elevator.moveTo(floor) -> void. Patterns: State pattern for Elevator (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance) so an elevator cannot open doors while moving by construction; Strategy for the dispatch algorithm (nearest-car vs SCAN vs zone-based), naming SCAN as the choice here because it reduces total wait time under load, trading away fairness for a lone far-away request (an explicit trade-off to state in interview). Concurrency: a request arriving mid-dispatch must not corrupt another car's in-flight queue, so each Elevator's queue is mutated behind its own lock. Extensibility: adding express elevators only requires a new State/filter in the dispatch Strategy, not a controller rewrite.",
        codeExample: "interface DispatchStrategy { assign(request: FloorRequest, elevators: Elevator[]): Elevator; }\nclass ScanDispatch implements DispatchStrategy { }",
        diagram: asciiDiagram(
`Elevator state diagram (drawing order: states, then transitions):

[Idle] --request(floor,dir)--> [MovingUp/MovingDown] --arrived--> [DoorsOpen] --closed--> [Idle]
                                                                        |
                                                                  (emergency) --> [Maintenance]`
        )
      }
    ],
    examples: [
      {
        title: "Multi-elevator scheduling",
        input: "Building with 3 elevators. Requests from floors 2, 5, 3, 8",
        output: "Optimal assignment minimizing wait time",
        explanation: "Elevator 1 going up (floor 1): take floor 2, 3, 5. Elevator 2 going down (floor 10): take floor 8. Distribute load across elevators to minimize average wait.",
        diagram: undefined
      }
    ],
    tips: ["Scan algorithm: Go up serving all ups, then down serving downs", "Handle simultaneous requests on same floor", "Emergency stop and manual override buttons"],
    references: [{ source: "interview-experience", attribution: "Amazon LLD", insight: "Discussion on scheduling algorithms and optimality." }, lldPrimerRef],
    practiceProblems: []
  },


  // ===== PRINCIPLES BEYOND SOLID (1 Topic) =====
  {
    id: "topic-lld-dry-yagni-kiss",
    moduleId: "mod-lld-oop-foundations",
    title: "DRY, YAGNI, and KISS in Interview Design",
    intuition: "Beyond SOLID, interviewers reward designs that avoid duplication (DRY), resist speculative complexity (YAGNI), and stay as simple as the requirements allow (KISS).",
    lesson: [
      {
        title: "What each principle actually protects against",
        content: "DRY (Don't Repeat Yourself): duplicated logic across classes drifts out of sync as requirements change - extract it into one shared abstraction (a base class, a utility, or a Strategy) instead of copy-pasting. YAGNI (You Aren't Gonna Need It): do not add a plugin system, generic config layer, or extra abstraction 'in case' a requirement shows up later - it adds cognitive load and slows interviews down without buying credit. KISS (Keep It Simple): prefer the design that a teammate could understand in five minutes over one that is 'clever' but hard to reason about under interview time pressure.",
        codeExample: "// DRY violation: fee calculation duplicated\nclass ParkingTicket { calculateFee() { return hours * rate; } }\nclass MonthlyPass { calculateFee() { return hours * rate; } } // duplicated formula\n\n// DRY fix: shared PricingStrategy\ninterface PricingStrategy { calculateFee(hours: number): number; }\nclass HourlyPricing implements PricingStrategy { calculateFee(hours) { return hours * this.rate; } }",
        diagram: asciiDiagram(
`DRY fix via shared Strategy (drawing order: duplicated classes, then extracted abstraction):

ParkingTicket --duplicated logic--x   MonthlyPass --duplicated logic--x
                 \\_______________  extract  _______________/
                                    v
                         <<interface>> PricingStrategy`
        )
      },
      {
        title: "Applying this under interview time pressure",
        content: "A common trap is over-engineering the first design (YAGNI violation): adding a generic 'Rule Engine' for a parking lot fee when the requirement only asks for hourly + peak pricing. State the requirement out loud, design only for it, and explicitly say what you would generalize later if asked ('If we needed N pricing schemes, I'd introduce a Strategy interface here') - this shows judgment without spending interview time building it prematurely.",
        codeExample: "// KISS: don't build a generic rules engine for two pricing tiers\n// Just use two Strategy implementations; add a Factory only if a third\n// or fourth pricing scheme is actually requested.",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Refactoring duplicated validation logic",
        input: "BookCheckout and BookReturn both re-implement 'is this member allowed to transact' checks with slightly different, drifting logic",
        output: "A single MembershipPolicy.canTransact(member) used by both, eliminating drift",
        explanation: "Step 1: Notice the duplicated eligibility checks during a code walkthrough. Step 2: Extract a MembershipPolicy class owning canTransact(member). Step 3: Both BookCheckout and BookReturn call the same policy method. Step 4: A future rule change (e.g., suspend members with 3+ overdue fines) is now made in exactly one place.",
        diagram: undefined
      }
    ],
    tips: [
      "If you catch yourself designing for a requirement nobody asked for, say so out loud and defer it (YAGNI).",
      "Duplicated conditional logic across two classes is a DRY smell - look for a shared Strategy or base method.",
      "When two designs solve the requirement equally well, pick the one with fewer moving parts (KISS)."
    ],
    references: [lldPrimerRef, { source: "book", attribution: "The Pragmatic Programmer", insight: "DRY was originally framed as a knowledge-duplication problem, not just code duplication." }],
    practiceProblems: []
  },

  // ===== STRUCTURAL & BEHAVIORAL PATTERNS (2 Topics) =====
  {
    id: "topic-lld-structural-patterns",
    moduleId: "mod-lld-core-patterns",
    title: "Structural Patterns: Adapter, Decorator, Facade",
    intuition: "Structural patterns compose classes/objects into larger structures without changing their internals: Adapter bridges incompatible interfaces, Decorator adds behavior dynamically, Facade simplifies a complex subsystem behind one entry point.",
    lesson: [
      {
        title: "Adapter: bridging incompatible interfaces",
        content: "Use Adapter when you must integrate a third-party or legacy class whose interface does not match what your client code expects, without modifying either side. The adapter implements your target interface and internally delegates to the adaptee's real method names.",
        codeExample: "interface PaymentGateway { charge(amountCents: number): boolean; }\n\nclass LegacyStripeClient { makePaymentInDollars(amount: number): string { /* returns 'OK' or 'FAIL' */ return 'OK'; } }\n\nclass StripeAdapter implements PaymentGateway {\n  constructor(private legacy: LegacyStripeClient) {}\n  charge(amountCents: number): boolean {\n    return this.legacy.makePaymentInDollars(amountCents / 100) === 'OK';\n  }\n}",
        diagram: asciiDiagram(
`Client -> [PaymentGateway interface] -> [StripeAdapter] -> [LegacyStripeClient]
                                            (translates units/method names)`
        )
      },
      {
        title: "Decorator: adding behavior without subclass explosion",
        content: "Use Decorator to layer optional behaviors (logging, caching, retry, compression) around a base object at runtime, avoiding a combinatorial explosion of subclasses (e.g., CachedRetryingLoggingGateway). Each decorator implements the same interface and wraps the next layer.",
        codeExample: "interface Notifier { send(msg: string): void; }\nclass EmailNotifier implements Notifier { send(msg) { /* ... */ } }\n\nclass LoggingDecorator implements Notifier {\n  constructor(private inner: Notifier) {}\n  send(msg) { console.log('sending: ' + msg); this.inner.send(msg); }\n}\n\nconst notifier = new LoggingDecorator(new EmailNotifier());",
        diagram: undefined
      },
      {
        title: "Facade: one simple entry point over a complex subsystem",
        content: "Use Facade when clients should not need to know about the internal orchestration of several subsystems (inventory check, payment, shipping) - expose a single OrderFacade.placeOrder(...) that internally coordinates them, hiding the complexity and reducing client coupling to internal classes.",
        codeExample: "class OrderFacade {\n  constructor(private inventory: InventoryService, private payment: PaymentService, private shipping: ShippingService) {}\n  placeOrder(order: Order): Receipt {\n    this.inventory.reserve(order.items);\n    this.payment.charge(order.total);\n    return this.shipping.schedule(order);\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Choosing Adapter vs Decorator vs Facade in an interview",
        input: "Interviewer: 'We have an old SMS library with a weird interface, we also want optional retry+logging on top of any notifier, and we want one simple call for the whole checkout process.'",
        output: "Adapter wraps the old SMS library; Decorator layers retry+logging on any Notifier; Facade exposes OrderFacade.placeOrder() over inventory/payment/shipping",
        explanation: "Step 1: Recognize 'old library with a mismatched interface' as an Adapter signal. Step 2: Recognize 'optional behavior layered on top, combinable' as a Decorator signal (not inheritance, to avoid a subclass per combination). Step 3: Recognize 'one simple call hiding several subsystems' as a Facade signal. Step 4: Explain each choice's trade-off: Adapter adds an indirection layer, Decorator composition order matters, Facade can become a god-object if it starts containing business logic instead of just delegating.",
        diagram: undefined
      }
    ],
    tips: [
      "Adapter changes an interface's shape; Decorator keeps the same interface but adds behavior; Facade simplifies access to several interfaces at once.",
      "Watch for Decorator overuse creating a long, hard-to-debug call chain - keep each decorator single-purpose.",
      "A Facade should delegate, not implement business logic itself, or it becomes a hidden god-object."
    ],
    references: [lldPrimerRef, { source: "book", attribution: "Design Patterns: Elements of Reusable Object-Oriented Software (GoF)", insight: "Structural patterns are about object composition, distinct from creational (object creation) and behavioral (object interaction) patterns." }],
    practiceProblems: []
  },
  {
    id: "topic-lld-behavioral-patterns-extra",
    moduleId: "mod-lld-core-patterns",
    title: "Behavioral Patterns: State, Command, Chain of Responsibility",
    intuition: "Beyond Strategy/Observer, State encodes valid transitions as classes instead of if/else flags, Command turns a request into an object you can queue/undo, and Chain of Responsibility passes a request along a chain until something handles it.",
    lesson: [
      {
        title: "State: eliminate boolean/enum-flag soup",
        content: "When an object's behavior depends on a mode (Idle/MovingUp/MovingDown/DoorsOpen for an elevator, or Pending/Paid/Shipped/Cancelled for an order), model each mode as a class implementing a shared interface, so invalid transitions are compile-time impossible rather than runtime `if` checks scattered everywhere.",
        codeExample: "interface ElevatorState { handleRequest(e: Elevator, floor: number): void; }\nclass IdleState implements ElevatorState { handleRequest(e, floor) { e.setState(new MovingState(floor > e.currentFloor ? 'UP' : 'DOWN')); } }\nclass MovingState implements ElevatorState { /* ignores conflicting-direction requests until queue drains */ }",
        diagram: asciiDiagram(
`State + Command + Chain of Responsibility (drawing order: state machine, then command queue, then handler chain):

[Idle] --request--> [MovingState] --arrived--> [DoorsOpenState] --timeout--> [Idle]

Client -> Command object -> CommandQueue -> invoke()/undo()

Request -> Handler1 --cannot handle--> Handler2 --handles--> [done]`
        )
      },
      {
        title: "Command: requests as first-class, queueable, undoable objects",
        content: "Wrap an action (and its parameters) into a Command object with execute()/undo(), so the invoker (a queue, a remote control, a transaction log) does not need to know the concrete operation. This enables undo/redo stacks, request queuing, and audit logs for free.",
        codeExample: "interface Command { execute(): void; undo(): void; }\nclass PlaceOrderCommand implements Command {\n  constructor(private order: Order, private service: OrderService) {}\n  execute() { this.service.place(this.order); }\n  undo() { this.service.cancel(this.order.id); }\n}",
        diagram: undefined
      },
      {
        title: "Chain of Responsibility: pass a request until someone handles it",
        content: "Use a chain when a request may need one of several handlers depending on runtime conditions (e.g., support-ticket escalation, request validation pipelines, middleware). Each handler either processes the request or forwards it to the next link, decoupling sender from the eventual handler.",
        codeExample: "abstract class Validator { protected next?: Validator; setNext(n: Validator) { this.next = n; return n; } handle(req) { if (!this.check(req)) return false; return this.next ? this.next.handle(req) : true; } abstract check(req): boolean; }",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Elevator door state machine",
        input: "Elevator in DoorsOpenState receives a new floor request while doors are still open",
        output: "The request is queued, not executed immediately; doors close first, then the state transitions to MovingState",
        explanation: "Step 1: DoorsOpenState.handleRequest() enqueues the request instead of acting on it directly. Step 2: A timer or sensor event triggers doorsClosed(), transitioning state to IdleState or directly to MovingState if requests are queued. Step 3: The new state's handleRequest() (or an internal dequeue) now actually dispatches motion. Step 4: Because each state class only implements the transitions valid for that mode, an 'open doors while moving' bug is impossible by construction rather than by a scattered boolean check.",
        diagram: undefined
      }
    ],
    tips: [
      "State pattern signal: an object's method behavior branches heavily on a status/mode field.",
      "Command pattern signal: you need undo, request queuing, or logging of 'what was requested' independent of 'how it's fulfilled'.",
      "Chain of Responsibility signal: multiple handlers could apply and the exact one depends on runtime data (validation pipelines, approval chains, support escalation)."
    ],
    references: [lldPrimerRef, { source: "book", attribution: "Design Patterns: Elements of Reusable Object-Oriented Software (GoF)", insight: "Behavioral patterns focus on communication and responsibility assignment between objects, not just structure or creation." }],
    practiceProblems: []
  },

  // ===== UML & INTERVIEW FRAMEWORK (2 Topics) =====
  {
    id: "topic-lld-uml-diagrams",
    moduleId: "mod-lld-oop-foundations",
    title: "UML Essentials: Class, Sequence, Activity, State Diagrams",
    intuition: "Interviewers expect you to communicate a design visually, not just verbally - a class diagram shows structure, a sequence diagram shows a specific flow over time, an activity diagram shows a process/decision flow, and a state diagram shows valid mode transitions.",
    lesson: [
      {
        title: "Class diagram: structure and relationships",
        content: "Boxes are classes (name / attributes / methods); lines show relationships: a plain line is association, a diamond-tailed line is aggregation (has-a, can outlive the container) or composition (has-a, owned lifecycle), and a hollow-arrow line is inheritance/implementation. Draw this first in any LLD interview - it anchors the rest of the conversation.",
        codeExample: undefined,
        diagram: asciiDiagram(
`Class diagram notation (drawing order: entities first, then relationships):

  +----------------+          1   *   +----------------+
  |  ParkingLot    |----------------->|    Level       |   (composition: filled diamond)
  +----------------+                  +----------------+
  | -levels: Level[]|                 | -spots: Spot[] |
  +----------------+                  +----------------+
                                              |
                                              | 1        *
                                              v
                                       +----------------+
                                       |  ParkingSpot   |
                                       +----------------+

  +----------------+   implements   +--------------------+
  | HourlyPricing  |--------------->| <<interface>>       |
  +----------------+   (hollow arrow)| PricingStrategy    |
                                     +--------------------+`
        )
      },
      {
        title: "Sequence, activity, and state diagrams: pick the right one for the moment",
        content: "Sequence diagram: use when the interviewer asks 'walk me through what happens when X occurs' - vertical lifelines per object, horizontal arrows for calls in time order. Activity diagram: use for a process with decision branches (e.g., 'what happens on checkout') - swimlane boxes and diamonds for decisions. State diagram: use when an entity has explicit modes (order status, elevator state) - circles/boxes for states, labeled arrows for triggering events.",
        codeExample: undefined,
        diagram: asciiDiagram(
`Sequence diagram (drawing order: actors/objects as lifelines, then arrows top-down):

Member        Library        BookIssue        Book
  |  checkout()  |               |             |
  |------------->|  create()     |             |
  |              |-------------->|             |
  |              |               |  markBorrowed()
  |              |               |------------>|
  |<---- BookIssue returned -----|             |

State diagram (Elevator):

  [Idle] --request(floor)--> [MovingUp/Down] --arrived--> [DoorsOpen] --closed--> [Idle]`
        )
      }
    ],
    examples: [
      {
        title: "Drawing order for a fresh LLD problem",
        input: "Interviewer asks you to design a ride-booking matching service on a whiteboard",
        output: "Class diagram first (Rider, Driver, Ride, MatchingStrategy), then a sequence diagram for 'rider requests a ride', then a state diagram for Ride status",
        explanation: "Step 1: Draw the class diagram first so both you and the interviewer agree on the nouns and relationships (Rider has-many Ride, Ride has-a Driver, MatchingStrategy is injected). Step 2: Draw a sequence diagram for the single most important flow (request -> match -> accept) to prove the classes actually collaborate correctly. Step 3: If the entity has a lifecycle (Requested -> Matched -> InProgress -> Completed/Cancelled), add a state diagram to show valid transitions and catch missing edge cases (e.g., can a Matched ride be cancelled?) before coding.",
        diagram: undefined
      }
    ],
    tips: [
      "Always draw the class diagram first - it forces you to agree on entities before discussing behavior.",
      "Use a sequence diagram only for the one or two flows the interviewer cares about most, not every possible interaction.",
      "A state diagram is the fastest way to catch missing transitions (e.g., 'what if the return happens twice?')."
    ],
    references: [lldPrimerRef, { source: "note", attribution: "UML 2.5 Specification (OMG)", insight: "Composition vs aggregation is about ownership/lifecycle, not just multiplicity - a common interview follow-up." }],
    practiceProblems: []
  },
  {
    id: "topic-lld-interview-framework",
    moduleId: "mod-lld-oop-foundations",
    title: "LLD Interview Answer Framework",
    intuition: "A repeatable framework - clarify, identify actors/use cases, define entities and relationships, design interfaces, apply patterns, trace a flow, discuss edge cases and trade-offs - prevents freezing on unfamiliar problems and signals structured thinking.",
    lesson: [
      {
        title: "The seven-step framework",
        content: "1) Clarify requirements and explicit non-goals (ask 2-3 pointed questions, do not assume). 2) List actors and primary use cases in plain English. 3) Identify core entities/value objects and their relationships (has-a/is-a). 4) Define the key interfaces/APIs between components. 5) Choose design patterns only where they solve a stated requirement (extensibility, decoupling, lifecycle) - name the rejected alternative too. 6) Trace one concrete end-to-end flow on the whiteboard. 7) Discuss edge cases, concurrency, and trade-offs, and state what you would do differently at 10x scale.",
        codeExample: undefined,
        diagram: asciiDiagram(
`LLD framework (say this order out loud as you work):

1. Clarify requirements  -->  2. Actors & use cases  -->  3. Entities & relationships
        |                                                          |
        v                                                          v
7. Edge cases & trade-offs  <--  6. Trace one flow  <--  5. Patterns  <--  4. Interfaces/APIs`
        )
      },
      {
        title: "Common failure modes and how the framework avoids them",
        content: "Failure mode A: jumping straight to code without clarifying requirements, then redesigning mid-interview when a missed constraint surfaces - the framework's step 1 prevents this. Failure mode B: applying a pattern because it's familiar rather than because it's needed (pattern-first instead of requirement-first) - step 5 explicitly ties each pattern choice to a stated requirement and names the rejected alternative, showing judgment instead of pattern-matching.",
        codeExample: undefined,
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Applying the framework to 'design a splitwise-like expense sharing app'",
        input: "Interviewer: 'Design a system where a group of friends can split and settle shared expenses.'",
        output: "Clarify (equal/percentage/exact splits? multi-currency? settle-up algorithm?) -> Actors (User, Group) -> Entities (Expense, Split, Balance, SettlementTransaction) -> APIs (addExpense, getBalances, settleUp) -> Patterns (Strategy for split type) -> Trace a 3-person unequal split -> Edge cases (a user leaves the group with a nonzero balance; floating-point rounding on splits).",
        explanation: "Step 1: Ask whether splits can be unequal/percentage-based and whether settle-up should minimize the number of transactions (a classic follow-up). Step 2: Define User and Group as actors/use-case holders. Step 3: Model Expense (payer, amount, splits[]), Split (owed amount per user), and a Balance ledger. Step 4: Define ExpenseService.addExpense(...) and BalanceService.getBalances(groupId). Step 5: Use a SplitStrategy (Equal, Percentage, Exact) chosen at addExpense time - reject a single giant if/else as violating Open-Closed. Step 6: Trace: Alice pays $90 split equally 3 ways -> Bob and Carol each owe Alice $30 -> balances updated. Step 7: Discuss rounding (splits must sum exactly to the total, remainder assigned to the payer) and a user leaving with a nonzero balance (block removal or force settle-up first).",
        diagram: undefined
      }
    ],
    tips: [
      "Say the framework step you're on out loud ('Let me clarify requirements first') - it signals structure even before you've designed anything.",
      "Never pick a pattern without stating the requirement it satisfies and the simpler alternative you rejected.",
      "Always reserve time for step 7 (edge cases/trade-offs) - many candidates run out of time before discussing it, which costs points."
    ],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "Big Tech LLD rounds (aggregated)", insight: "Interviewers consistently rank 'structured process' above 'clever pattern usage' when the two conflict." }],
    practiceProblems: []
  },

  // ===== CONCURRENCY (1 Topic) =====
  {
    id: "topic-lld-concurrency",
    moduleId: "mod-lld-core-patterns",
    title: "Concurrency Primitives, Challenges, and Patterns",
    intuition: "LLD interviews for systems with shared mutable state (parking spots, cache entries, seat reservations, bank balances) expect you to name the race condition, the primitive that fixes it, and its cost.",
    lesson: [
      {
        title: "Core primitives",
        content: "Mutex/lock: mutual exclusion around a critical section - simple, but can serialize throughput and risks deadlock if multiple locks are acquired out of order. Read-write lock: allows concurrent reads, exclusive writes - good for read-heavy structures like a cache. Semaphore: bounds concurrent access to N units of a resource (e.g., N parking spots, N DB connections). Atomic/compare-and-swap: lock-free single-variable updates (e.g., an inventory counter), cheaper than a full lock but limited to simple operations. Optimistic locking (version/CAS on a row): read a version, write only if unchanged, retry on conflict - avoids holding a lock across I/O.",
        codeExample: "// Optimistic locking for seat reservation\nclass Seat {\n  private version: number;\n  private status: 'FREE' | 'HELD' | 'BOOKED';\n  reserve(expectedVersion: number): boolean {\n    // CAS: only succeeds if version matches, else caller retries\n    return db.updateIf('seat', this.id, { status: 'HELD', version: expectedVersion + 1 }, expectedVersion);\n  }\n}",
        diagram: asciiDiagram(
`Concurrency primitives at a glance (drawing order: shared resource, then guards):

           +--> Mutex/Lock (exclusive)
[Shared    |
 Resource] +--> Read-Write Lock (N readers, 1 writer)
           |
           +--> Semaphore (N permits)  |  CAS/Optimistic version check`
        )
      },
      {
        title: "Common challenges and the pattern that addresses each",
        content: "Race condition (two threads both read 'available' then both write 'occupied'): fix with a lock or CAS scoped to the smallest critical section. Deadlock (thread A holds lock1 waiting for lock2, thread B holds lock2 waiting for lock1): fix by always acquiring locks in a global, consistent order, or avoid nested locks entirely. Starvation (a request never gets scheduled because others keep jumping ahead): fix with fair queuing (FIFO) or aging priority. Thundering herd on a popular cache key expiring: fix with a single-flight/lock-per-key pattern so only one request repopulates the cache while others wait or serve stale data briefly.",
        codeExample: "// Deadlock avoidance: always lock in ascending id order\nfunction transferSeats(a: Seat, b: Seat) {\n  const [first, second] = a.id < b.id ? [a, b] : [b, a];\n  synchronized(first, () => synchronized(second, () => { /* transfer */ }));\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Two riders booking the last movie seat concurrently",
        input: "Rider A and Rider B both call bookSeat(seatId=42) within milliseconds of each other; only one seat is left",
        output: "Exactly one booking succeeds; the other receives a clear 'seat no longer available' response instead of a silent double-booking",
        explanation: "Step 1: Both requests read seat 42's current version (v=3, status=FREE). Step 2: Both attempt a compare-and-swap update to status=HELD with expectedVersion=3. Step 3: The database (or an in-process lock keyed by seatId) allows only one CAS to succeed atomically; the loser's CAS fails because the version already advanced to 4. Step 4: The losing request retries by re-reading state, sees status=HELD/BOOKED, and returns a clean 'seat unavailable' error rather than corrupting the booking.",
        diagram: undefined
      }
    ],
    tips: [
      "Name the exact race condition in plain English before naming the fix - interviewers want to see you spot the bug, not just recite a primitive.",
      "Prefer optimistic locking/CAS over long-held locks when the critical section might include slow I/O.",
      "Always state the lock-ordering rule you'd use to avoid deadlock whenever more than one lock is involved."
    ],
    references: [lldPrimerRef, { source: "book", attribution: "Java Concurrency in Practice", insight: "Most concurrency bugs in interviews stem from an unstated invariant about which thread may mutate what, not from missing 'a lock' in general." }],
    practiceProblems: []
  },

  // ===== ADDITIONAL DESIGN EXERCISES: BENCHMARK PROBLEM COVERAGE (5 Topics) =====
  {
    id: "topic-lld-lru-cache",
    moduleId: "mod-lld-design-exercises",
    title: "LRU Cache Design",
    intuition: "Bounded-capacity cache that evicts the Least Recently Used entry on overflow, using a hash map (O(1) lookup) plus a doubly linked list (O(1) reordering/eviction) together.",
    lesson: [
      {
        title: "Requirements, clarifications, and entities",
        content: "Clarify: capacity is fixed at construction; get(key) counts as a 'use' that must move the entry to most-recently-used; is thread-safety required (assume yes for a production discussion); is TTL/expiration in scope (a common follow-up, not the base requirement). Entities: Node (key, value, prev, next pointers), DoublyLinkedList (maintains recency order: head=most-recent, tail=least-recent), HashMap<key, Node> (O(1) lookup into the list).",
        codeExample: "class Node { constructor(public key: any, public value: any) { this.prev = null; this.next = null; } }\nclass LRUCache {\n  private capacity: number;\n  private map = new Map<any, Node>();\n  private head: Node; private tail: Node; // sentinels\n}",
        diagram: undefined
      },
      {
        title: "get/put in O(1) via list + map",
        content: "get(key): if present in map, unlink the node from its current position and move it to the head (most-recently-used), return its value; else return miss. put(key, value): if key exists, update value and move to head; else create a node, insert at head, and if size exceeds capacity, evict the tail's node (least-recently-used) and remove it from the map too.",
        codeExample: "get(key) {\n  const node = this.map.get(key);\n  if (!node) return -1;\n  this.moveToHead(node);\n  return node.value;\n}\nput(key, value) {\n  let node = this.map.get(key);\n  if (node) { node.value = value; this.moveToHead(node); return; }\n  node = new Node(key, value);\n  this.map.set(key, node);\n  this.addToHead(node);\n  if (this.map.size > this.capacity) {\n    const lru = this.removeTail();\n    this.map.delete(lru.key);\n  }\n}",
        diagram: asciiDiagram(
`Class + structure diagram (drawing order: map first, then list):

  HashMap<key, Node*>              Doubly Linked List (MRU -> LRU)
  --------------------             head <-> [k2] <-> [k5] <-> [k1] <-> tail
  k2 -> ------------------------------------^
  k5 -> ------------------------------------------------^
  k1 -> ------------------------------------------------------------^

  get(k5): unlink [k5], move to just after head -> O(1)
  eviction: drop node just before tail -> O(1)`
        )
      },
      {
        title: "Thread safety and extensibility",
        content: "A single coarse-grained lock around get/put is the simplest correct thread-safe version; for higher concurrency, shard the cache into N independently-locked segments keyed by hash(key) % N (similar to Java's ConcurrentHashMap striping). Extending to LFU (Least Frequently Used) swaps the recency-ordered list for a frequency-bucketed structure (a map of frequency -> ordered set of keys), while keeping the same O(1) map-based lookup contract - discuss this as a design extension without necessarily implementing it.",
        codeExample: undefined,
        diagram: undefined
      },
      {
        title: "Requirements, APIs, pattern choice, and trade-offs",
        content: "Requirements/use cases: clarify fixed vs dynamic capacity, whether TTL/expiration is in scope, and thread-safety expectations. Interfaces/APIs: LRUCache.get(key) -> value|-1; LRUCache.put(key, value) -> void; both must run in O(1) amortized time. Pattern choice: this is a Strategy-friendly design (the eviction policy is swappable behind the same Cache interface for LRU vs LFU vs FIFO), rejecting a naive array-scan design as it costs O(n) per operation. Trade-offs: the map+list combination trades O(n) extra pointer memory for guaranteed O(1) operations - worth it whenever get/put frequency matters more than raw memory footprint.",
        codeExample: undefined,
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Capacity-2 cache trace",
        input: "capacity=2; put(1,A); put(2,B); get(1); put(3,C); get(2)",
        output: "get(1) -> A; put(3,C) evicts key 2 (least recently used); get(2) -> miss (-1)",
        explanation: "Step 1: put(1,A) -> list: [1]. Step 2: put(2,B) -> list: [2,1] (2 is MRU). Step 3: get(1) -> returns A, moves 1 to MRU -> list: [1,2]. Step 4: put(3,C) -> capacity exceeded, evict tail (2, the LRU) -> list: [3,1]. Step 5: get(2) -> key 2 was evicted -> miss.",
        diagram: undefined
      }
    ],
    tips: [
      "Say 'map for O(1) lookup, doubly linked list for O(1) reorder/eviction' immediately - it's the expected answer shape.",
      "Sentinel head/tail nodes avoid null-checks on every insert/remove.",
      "If asked for thread safety, propose lock striping before reaching for a single global lock at scale."
    ],
    references: [lldPrimerRef, { source: "leetcode", attribution: "LeetCode 146: LRU Cache", insight: "One of the most frequently asked LLD+DS hybrid problems across all major companies." }],
    practiceProblems: ["lld-lru-cache"]
  },
  {
    id: "topic-lld-vending-machine-atm",
    moduleId: "mod-lld-design-exercises",
    title: "Vending Machine & ATM State Machines",
    intuition: "Both are physical-device state machines: a vending machine transitions Idle -> HasMoney -> Dispensing -> Idle, and an ATM transitions Idle -> CardInserted -> PinEntered -> TransactionSelected -> Dispensing -> Idle, each state restricting which actions are valid.",
    lesson: [
      {
        title: "Vending machine: entities and state pattern",
        content: "Entities: VendingMachine (context holding current State), Inventory (slot -> Item + quantity), Item (price), Coin/Note acceptor, CashBox (change dispensing). State pattern models: IdleState (accepts coins/selection), HasMoneyState (accepts more money or a selection, allows refund), DispensingState (releases item + change, then returns to Idle). Each state only exposes the transitions valid for that mode - selecting an item while Idle (no money inserted) is rejected by construction, not by a runtime flag check.",
        codeExample: "interface VendingState { insertCoin(vm: VendingMachine, amount: number): void; selectItem(vm: VendingMachine, slot: string): void; }\nclass IdleState implements VendingState {\n  insertCoin(vm, amount) { vm.balance += amount; vm.setState(new HasMoneyState()); }\n  selectItem(vm, slot) { /* reject: no money inserted */ }\n}",
        diagram: undefined
      },
      {
        title: "ATM: PIN, session, and dispensing correctness",
        content: "ATM entities: Card, Account, ATM (cash inventory by denomination), Transaction (Withdraw/Deposit/Balance). Correctness constraints: PIN attempts are capped (e.g., 3) before the card is retained; a withdrawal must check both the account balance and the ATM's available denominations (e.g., cannot dispense $50 if it only has $20 bills and $10 requested is fine but $30 needs specific bill combinations); the debit and the physical cash dispense must be treated as a single transaction - if dispensing hardware fails after the account was debited, the system must reverse the debit (compensating transaction), not silently lose the money.",
        codeExample: "class ATM {\n  withdraw(account: Account, amount: number): Receipt {\n    if (!this.canDispense(amount)) throw new Error('Insufficient denominations');\n    account.debit(amount); // step 1: reserve funds\n    try {\n      this.dispenseCash(amount); // step 2: physical action\n    } catch (e) {\n      account.credit(amount); // compensating transaction on hardware failure\n      throw e;\n    }\n    return new Receipt(amount);\n  }\n}",
        diagram: asciiDiagram(
`ATM state diagram (drawing order: states first, then triggering events):

[Idle] --insertCard--> [CardInserted] --enterPin(ok)--> [Authenticated]
                              |                                 |
                        enterPin(fail x3)                selectTransaction
                              v                                 v
                        [CardRetained]                   [Dispensing] --done--> [Idle]`
        )
      },
      {
        title: "Requirements/use cases, APIs, extensibility, and trade-offs",
        content: "Requirements/use cases: clarify supported transactions (withdraw/deposit/balance), denomination inventory tracking, and PIN retry limits, for both the vending machine (item stock, exact-change-only mode) and the ATM. Interfaces/APIs: VendingMachine.insertCoin(amount) -> void; VendingMachine.selectItem(slot) -> Item|InsufficientFundsError; ATM.insertCard(card) -> Session; ATM.withdraw(amount) -> Receipt. Extensibility: adding a card-payment option to the vending machine only requires a new payment State/Strategy behind the same insertCoin-equivalent interface; adding transaction types to the ATM (e.g., bill pay) only requires a new Transaction subclass. Trade-offs: modeling both as explicit State machines costs more upfront classes than a single flag-driven class, but eliminates an entire category of 'invalid action in current mode' bugs - the trade favors correctness for cash-handling systems."
      }
    ],
    examples: [
      {
        title: "ATM withdrawal with a dispensing failure",
        input: "Account balance $500; withdraw $200; the cash dispenser jams after the debit is applied",
        output: "The $200 debit is reversed (account back to $500) and the transaction is reported as failed, not silently lost",
        explanation: "Step 1: ATM checks it can dispense $200 in available denominations - yes. Step 2: account.debit(200) is applied first (balance now $300). Step 3: dispenseCash(200) throws a hardware exception. Step 4: The catch block issues a compensating account.credit(200), restoring the balance to $500, and the ATM reports 'transaction failed, no cash dispensed' rather than leaving the account debited with nothing dispensed.",
        diagram: undefined
      }
    ],
    tips: [
      "Model both machines with the State pattern - it directly prevents 'select item with no money' or 'withdraw before PIN' bugs.",
      "Always pair a debit with a compensating credit on downstream (physical) failure - never leave money 'in limbo'.",
      "Cap PIN retries and transition to a CardRetained state instead of an infinite retry loop."
    ],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "Payments/fintech LLD rounds (aggregated)", insight: "The compensating-transaction detail on hardware failure is what differentiates a strong ATM answer from a shallow one." }],
    practiceProblems: ["lld-vending-machine", "lld-atm"]
  },
  {
    id: "topic-lld-tic-tac-toe",
    moduleId: "mod-lld-design-exercises",
    title: "Tic-Tac-Toe (Generalized N x N)",
    intuition: "A deceptively simple problem used to test clean board abstraction, win-condition checking that scales to N x N without O(N^2) re-scans per move, and extensibility to different players/board sizes.",
    lesson: [
      {
        title: "Entities and the O(N) win-check trick",
        content: "Entities: Board (N x N grid), Player (symbol), Game (turn order, win/draw detection), Move (row, col, player). Naive win-check re-scans all rows/cols/diagonals after every move (O(N) per move, O(N^2) total moves worst case fine, but wasteful). The efficient approach maintains four running counters per player: rowCount[N], colCount[N], diagonalCount, antiDiagonalCount, incremented/decremented on each move, so checking a win after a move is O(1).",
        codeExample: "class Game {\n  private rows: number[]; private cols: number[]; private diag = 0; private antiDiag = 0;\n  move(row: number, col: number, playerId: number) {\n    const delta = playerId === 1 ? 1 : -1;\n    this.rows[row] += delta; this.cols[col] += delta;\n    if (row === col) this.diag += delta;\n    if (row + col === this.n - 1) this.antiDiag += delta;\n    if (Math.abs(this.rows[row]) === this.n || Math.abs(this.cols[col]) === this.n\n        || Math.abs(this.diag) === this.n || Math.abs(this.antiDiag) === this.n) {\n      this.winner = playerId;\n    }\n  }\n}",
        diagram: asciiDiagram(
`Board/Game/Move relationship (drawing order: board grid, then counters, then move flow):

[Board NxN grid]        rows[N] cols[N] diag antiDiag  (O(1) win counters)
        ^                              ^
        |                              |
     [Game] <--move(row,col,player)-- [Move]`
        )
      },
      {
        title: "Extensibility: more players, different board shapes",
        content: "Supporting more than 2 players only changes the counter increment (track per-player counts rather than a single +1/-1 signed counter) and the win threshold (K-in-a-row instead of full-row for Gomoku-style variants). The Board/Game separation means a UI (console, web) is a separate concern that only calls Game.move() and reads Game.getState() - it never touches the win-detection internals.",
        codeExample: undefined,
        diagram: undefined
      },
      {
        title: "Requirements, use cases, APIs, and trade-offs",
        content: "Requirements/use cases: clarify board size (default 3x3, but design for N x N), number of players, and whether draws must be detected. Interfaces/APIs: Game.move(row, col, playerId) -> MoveResult; Game.getState() -> Board; Game.getWinner() -> playerId|null. Error handling: move() must reject out-of-turn plays and occupied-cell plays with a typed error (InvalidMoveError) rather than silently ignoring them. Concurrency: for a multiplayer server, guard move() with a per-game lock (or a single-threaded actor per game) so two simultaneous move requests from different clients cannot both be applied to the same cell/turn. Trade-offs: the O(1)-per-move counter approach uses O(N) extra memory for the counters versus a pure O(1)-space full-rescan approach that costs O(N) time per move - for interview-scale boards this trade-off strongly favors the counters, but the rescan is simpler to explain if memory were somehow constrained.",
        codeExample: undefined,
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "3x3 win detection trace",
        input: "Player 1 plays (0,0), (0,1), (0,2) on a 3x3 board across three of their turns",
        output: "After (0,2), rows[0] reaches 3, so Player 1 is declared the winner in O(1) at that move",
        explanation: "Step 1: (0,0) -> rows[0]=1, diag=1. Step 2: (0,1) -> rows[0]=2. Step 3: (0,2) -> rows[0]=3, and since |rows[0]|==n(3), the win check fires immediately without rescanning the board.",
        diagram: undefined
      }
    ],
    tips: [
      "Lead with the O(1)-per-move win-check trick - it's the signal that differentiates a strong answer from a brute-force one.",
      "Keep Board/Game logic UI-agnostic so a console and a web frontend can share the same core classes.",
      "Discuss the N-player, K-in-a-row generalization even if not asked - it shows the design isn't hardcoded to 2 players/3x3."
    ],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "Early-stage LLD screens (aggregated)", insight: "Often used as a warm-up problem before a harder follow-up like Connect Four or Gomoku." }],
    practiceProblems: ["lld-tic-tac-toe"]
  },
  {
    id: "topic-lld-pub-sub",
    moduleId: "mod-lld-design-exercises",
    title: "In-Memory Publish-Subscribe System",
    intuition: "A minimal message broker: publishers publish to named topics, subscribers register callbacks per topic, and the broker fans out each message to all current subscribers of that topic - the in-process precursor to Kafka/Redis Pub-Sub.",
    lesson: [
      {
        title: "Entities and the core contract",
        content: "Entities: Topic (name, list of Subscriber callbacks), Broker (topic registry: name -> Topic), Publisher (calls broker.publish(topic, message)), Subscriber (callback invoked with each message). Contract: subscribe(topic, callback) -> subscriptionId; unsubscribe(subscriptionId); publish(topic, message) delivers to every currently-subscribed callback, in whatever order they subscribed (no ordering guarantee across topics).",
        codeExample: "class Broker {\n  private topics = new Map<string, Set<(msg: any) => void>>();\n  subscribe(topic: string, cb: (msg: any) => void) {\n    if (!this.topics.has(topic)) this.topics.set(topic, new Set());\n    this.topics.get(topic)!.add(cb);\n    return () => this.topics.get(topic)!.delete(cb); // unsubscribe fn\n  }\n  publish(topic: string, msg: any) {\n    this.topics.get(topic)?.forEach((cb) => cb(msg));\n  }\n}",
        diagram: asciiDiagram(
`Broker structure (drawing order: broker, topics, subscribers):

 [Publisher] --publish(topic,msg)--> [Broker] --topic map--> [Topic "orders"]
                                                                 |     |
                                                          Subscriber A  Subscriber B`
        )
      },
      {
        title: "Delivery semantics, ordering, and failure isolation",
        content: "Synchronous delivery (calling each subscriber inline during publish()) is simplest but a slow/throwing subscriber blocks or breaks the publisher - wrap each callback invocation in a try/catch (and optionally dispatch async via a queue per subscriber) so one bad subscriber cannot take down the broker or delay others. For ordering guarantees across multiple publishers to the same topic, a per-topic sequence number or a single-threaded dispatch queue per topic keeps delivery order deterministic.",
        codeExample: "publish(topic, msg) {\n  this.topics.get(topic)?.forEach((cb) => {\n    try { cb(msg); } catch (e) { /* isolate: log and continue to next subscriber */ }\n  });\n}",
        diagram: undefined
      },
      {
        title: "Requirements, use cases, APIs, patterns, extensibility, and trade-offs",
        content: "Requirements/use cases: clarify delivery guarantee (at-most-once vs at-least-once), whether topics need wildcard matching, and expected subscriber count per topic. Interfaces/APIs: Broker.subscribe(topic, callback) -> unsubscribeFn; Broker.publish(topic, message) -> void. Pattern: this is the Observer pattern generalized across named topics instead of a single subject, with the Broker acting as a topic-keyed subject registry. Extensibility: adding wildcard topic matching (e.g., 'orders.*') only requires a lookup-time pattern match in the Broker, not a change to Publisher/Subscriber contracts. Trade-offs: this in-memory design is simple and fast but loses all messages on process restart and offers no durability/replay - a real system needing at-least-once delivery and replay (like Kafka) would trade simplicity for a persisted, partitioned log plus consumer offsets.",
        codeExample: undefined,
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Subscriber throwing an exception",
        input: "Topic 'orders' has subscribers A, B, C; publish(orders, msg) is called and B throws an exception",
        output: "A and C both still receive the message; the broker logs B's failure without crashing or skipping C",
        explanation: "Step 1: Broker iterates subscribers in order A, B, C. Step 2: A.callback(msg) succeeds. Step 3: B.callback(msg) throws; the try/catch around the invocation isolates the failure. Step 4: C.callback(msg) still executes normally, proving one bad subscriber cannot break delivery to the rest.",
        diagram: undefined
      }
    ],
    tips: [
      "Always isolate each subscriber invocation in its own try/catch - a shared broker must not fail because one consumer is broken.",
      "State explicitly whether delivery is at-most-once (this simple design) vs at-least-once (would need persistence/ack, like Kafka) - a common follow-up.",
      "Unsubscribe should be O(1) and safe to call during an in-flight publish (use a copy of the subscriber set per publish call, or a concurrent-safe set)."
    ],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "Infra/platform LLD rounds (aggregated)", insight: "A common follow-up asks to compare this in-memory design to Kafka's durable, partitioned, ordered log model." }],
    practiceProblems: ["lld-pub-sub"]
  },

  // ===== DEEP-DIVE OVERRIDES FOR SHALLOW expanded-coverage.ts ENTRIES =====
  // Same ids as the makeTopic() versions in expanded-coverage.ts; collect()'s
  // first-wins dedup in all-topics.ts makes these authored versions win.
  {
    id: "topic-lld-observer-pattern",
    moduleId: "mod-lld-design-exercises",
    title: "Observer Pattern: Order Notification System",
    intuition: "Subjects notify all observers when state changes; this is the standard fit for notifications, stock-price updates, or UI state changes where multiple independent listeners must react to one event.",
    lesson: [
      {
        title: "Requirements, use cases, and entities",
        content: "Requirements/use cases: when an Order transitions state (e.g., PLACED, SHIPPED), every currently-registered notifier (Email, SMS, Push) must be informed without the Order needing to know their concrete types. Entities/responsibilities: Subject/Observable (Order) holds a list of Observer references and exposes subscribe/unsubscribe; Observer (interface with update(event)) is implemented by EmailObserver, SMSObserver, PushObserver, each owning only its own notification logic.",
        codeExample: "interface Observer { update(event: OrderEvent): void; }\nclass Order {\n  private observers: Observer[] = [];\n  subscribe(o: Observer) { this.observers.push(o); }\n  unsubscribe(o: Observer) { this.observers = this.observers.filter(x => x !== o); }\n  private notify(event: OrderEvent) { this.observers.forEach(o => o.update(event)); }\n  ship() { this.status = 'SHIPPED'; this.notify({ type: 'SHIPPED', orderId: this.id }); }\n}",
        diagram: asciiDiagram(
`Class diagram (drawing order: Subject, then Observer interface, then implementations):

  Order (Subject) --notifies--> <<interface>> Observer
                                       ^
                        +--------------+--------------+
                   EmailObserver   SMSObserver    PushObserver`
        )
      },
      {
        title: "APIs, concurrency/error handling, extensibility, and trade-offs",
        content: "APIs: Order.subscribe(observer) -> void; Order.unsubscribe(observer) -> void; Observer.update(event) -> void. Concurrency/error handling: iterate over a snapshot (copy) of the observer list during notify() so an observer that unsubscribes itself mid-notification does not corrupt iteration, and wrap each observer's update() in a try/catch so one failing notifier (e.g., SMS provider down) does not block Email/Push from firing. Extensibility: adding a new notification channel (e.g., WebhookObserver) requires zero changes to Order - only a new Observer implementation. Trade-offs: synchronous notify() is simple but ties the Order's response time to the slowest observer; an async event queue per observer decouples this at the cost of eventual (not immediate) delivery - state this trade-off explicitly if asked about latency.",
        codeExample: "notify(event: OrderEvent) {\n  for (const o of [...this.observers]) { // snapshot copy\n    try { o.update(event); } catch (e) { /* isolate failure, continue */ }\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Order shipped notifies three observers",
        input: "Order #42 subscribed by EmailObserver, SMSObserver, PushObserver; Order.ship() is called",
        output: "All three observers receive an update({type:'SHIPPED', orderId:42}) call; the SMS provider throwing does not block Email/Push",
        explanation: "Step 1: ship() sets status and calls notify(). Step 2: notify() iterates a snapshot of [Email, SMS, Push]. Step 3: Email fires successfully. Step 4: SMS throws (provider timeout) - caught and logged, iteration continues. Step 5: Push fires successfully, proving isolation between observers.",
        diagram: undefined
      }
    ],
    tips: ["Strategy: Vary algorithm. Observer: Vary reactions", "Observer: Implement unsubscribe to prevent memory leaks", "Both achieve: Loose coupling"],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "Google LLD", insight: "Adding new notification types becomes one-liner with Observer." }],
    practiceProblems: ["lld-observer"]
  },
  {
    id: "topic-lld-cache-design",
    moduleId: "mod-lld-design-exercises",
    title: "Generic Cache Design: TTL, Eviction, and Concurrency",
    intuition: "Use a TTL, LRU eviction, and concurrency protection to keep hot data fast and safe - a general Cache abstraction distinct from the LRU-specific data-structure deep dive, focused on the surrounding system design (invalidation, stampede protection, distributed consistency).",
    lesson: [
      {
        title: "Requirements/use cases and entities/responsibilities",
        content: "Requirements/use cases: clarify acceptable staleness window, whether the cache must survive a process restart, and expected read:write ratio. Entities/responsibilities: Cache (interface: get/put/invalidate), CacheEntry (value, expiresAt, version), EvictionPolicy (LRU/LFU/FIFO, pluggable), CacheLoader (fetches from the source of truth on a miss, used for read-through). A user-profile cache sits in front of the database: reads check the cache first and fall back to the DB on a miss, then populate the cache with a bounded TTL.",
        codeExample: "interface Cache<K, V> {\n  get(key: K): V | undefined;\n  put(key: K, value: V, ttlMs: number): void;\n  invalidate(key: K): void;\n}\nclass ReadThroughCache<K, V> implements Cache<K, V> {\n  constructor(private inner: Cache<K, V>, private loader: (k: K) => V) {}\n  get(key: K) { return this.inner.get(key) ?? this.populate(key); }\n}",
        diagram: undefined
      },
      {
        title: "APIs, patterns, concurrency handling, extensibility, and trade-offs",
        content: "APIs: Cache.get(key) -> value|miss; Cache.put(key, value, ttl) -> void; Cache.invalidate(key) -> void. Patterns: Strategy for the EvictionPolicy (LRU vs LFU vs FIFO) and Decorator for layering read-through/write-through behavior over a base Cache implementation. Concurrency/error handling: a 'thundering herd' on a popular key's expiry (many concurrent requests all miss simultaneously and all hit the DB) is fixed with a single-flight/lock-per-key pattern so only one request repopulates the cache while others wait briefly or serve slightly stale data. Extensibility: swapping from an in-process cache to a distributed one (Redis) only requires a new Cache implementation behind the same interface, not client changes. Trade-offs: a short TTL reduces staleness risk but increases DB load and cache-miss latency; a long TTL is fast and cheap but risks serving stale data - the choice must match the business tolerance for staleness stated in requirements.",
        codeExample: "// Single-flight pattern to avoid thundering herd\nconst inflight = new Map<string, Promise<any>>();\nasync function getOrLoad(key: string, loader: () => Promise<any>) {\n  if (inflight.has(key)) return inflight.get(key);\n  const p = loader().finally(() => inflight.delete(key));\n  inflight.set(key, p);\n  return p;\n}",
        diagram: asciiDiagram(
`Read-through cache flow (drawing order: client, cache, single-flight lock, DB):

Client -> [Cache.get] -- hit --> return value
              | miss
              v
      [single-flight lock per key] --first caller--> [DB] -> populate cache -> return
                              \\--other callers wait on the same in-flight promise`
        )
      }
    ],
    examples: [
      {
        title: "Popular key expiring under load",
        input: "Cache key 'user:99' (a celebrity profile) expires while 500 requests/sec are reading it",
        output: "Only one request reads from the DB and repopulates the cache; the other 499 wait briefly on the same result instead of all hitting the DB",
        explanation: "Step 1: The TTL for 'user:99' expires. Step 2: The next 500 concurrent requests all miss simultaneously. Step 3: The single-flight lock ensures only the first request calls the DB loader; the other 499 attach to the same in-flight promise. Step 4: When the DB read completes, the cache is populated and all 500 callers receive the result, avoiding a 500x DB load spike.",
        diagram: undefined
      }
    ],
    tips: ["State the staleness tolerance explicitly before picking a TTL.", "Always guard against thundering herd on popular keys with single-flight/lock-per-key.", "Prefer read-through/write-through decorators over scattering cache logic across callers."],
    references: [lldPrimerRef, { source: "note", attribution: "Caching patterns (aggregated interview notes)", insight: "A good cache design balances stale data risk, memory footprint, and invalidation complexity." }],
    practiceProblems: ["lld-cache"]
  },
  {
    id: "topic-lld-rate-limiter",
    moduleId: "mod-lld-design-exercises",
    title: "Rate Limiter: Token Bucket vs Sliding Window",
    intuition: "Token bucket and sliding-window designs protect backend stability and prevent abuse by enforcing a request quota at the API boundary before expensive downstream work begins.",
    lesson: [
      {
        title: "Requirements/use cases and entities/responsibilities",
        content: "Requirements/use cases: clarify the limiting key (per-user, per-IP, per-API-key), the quota (e.g., 100 requests/minute), and whether limiting must be consistent across multiple server instances (distributed). Entities/responsibilities: RateLimiter (interface: allowRequest(key) -> boolean), TokenBucket (per-key token count + refill rate), SlidingWindowLog (per-key timestamped request log), Client (identity used as the limiting key).",
        codeExample: "interface RateLimiter { allowRequest(key: string): boolean; }\nclass TokenBucket implements RateLimiter {\n  private tokens: Map<string, number> = new Map();\n  allowRequest(key: string): boolean {\n    const t = this.tokens.get(key) ?? this.capacity;\n    if (t <= 0) return false;\n    this.tokens.set(key, t - 1);\n    return true;\n  }\n}",
        diagram: undefined
      },
      {
        title: "APIs, patterns, concurrency handling, extensibility, and trade-offs",
        content: "APIs: RateLimiter.allowRequest(key) -> boolean; RateLimiter.getRemainingQuota(key) -> number. Patterns: Strategy so TokenBucket, LeakyBucket, FixedWindow, and SlidingWindowLog are interchangeable behind the same interface; Decorator/middleware to wrap any API handler with rate limiting without modifying the handler itself. Concurrency/error handling: in a distributed deployment, the counter update must be atomic across server instances (e.g., Redis INCR + TTL, or a Lua script for check-and-decrement) to prevent two servers from both admitting a request that should have been throttled - a naive per-instance in-memory counter under-throttles in a multi-instance deployment. Extensibility: swapping the algorithm from token bucket to sliding-window log only requires a new RateLimiter implementation behind the same interface, with no client changes. Trade-offs: token bucket is cheap and allows small bursts (simpler, less precise); sliding-window log is precise but costs more memory (one timestamp per request in the window) - choose based on whether burst tolerance or precision matters more for the API being protected.",
        codeExample: "-- Redis Lua script for atomic distributed rate limiting\nlocal count = redis.call('INCR', KEYS[1])\nif count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\nreturn count <= tonumber(ARGV[2])",
        diagram: asciiDiagram(
`Rate limiter as middleware (drawing order: client, limiter, handler):

Client --request--> [RateLimiter.allowRequest(key)] --false--> 429 Too Many Requests
                              | true
                              v
                      [API Handler] --response-->`
        )
      }
    ],
    examples: [
      {
        title: "Client exceeding quota",
        input: "API client exceeds 100 requests/minute",
        output: "429 Too Many Requests",
        explanation: "Step 1: RateLimiter.allowRequest(clientId) checks the token bucket for this client's key. Step 2: The bucket is empty (100 tokens already consumed this window). Step 3: The request is rejected with a 429 before it reaches the expensive downstream handler, protecting backend stability.",
        diagram: undefined
      }
    ],
    tips: ["Name the limiting key (user/IP/API key) explicitly before choosing an algorithm.", "For distributed deployments, insist on an atomic counter update (Redis INCR/Lua), not per-instance memory.", "State the token-bucket-vs-sliding-window trade-off (burst tolerance vs precision) explicitly."],
    references: [lldPrimerRef, { source: "interview-experience", attribution: "API/platform LLD rounds (aggregated)", insight: "A rate limiter enforces a policy at the API boundary before expensive downstream work begins." }],
    practiceProblems: ["lld-rate-limiter"]
  },
  {
    id: "topic-lld-abstraction",
    moduleId: "mod-lld-oop-foundations",
    title: "Abstraction & Encapsulation",
    intuition: "Hide implementation details behind clear interfaces and public APIs, exposing only what clients need.",
    lesson: [
      {
        title: "Public API vs hidden internals",
        content: "UserService exposes login() and register() while internally using DatabaseClient and TokenService. Callers depend only on the two public methods; the concrete storage mechanism and token format can change freely without touching any caller.",
        codeExample: "class UserService {\n  private db: DatabaseClient;\n  private tokens: TokenService;\n  login(email, password) { /* uses db + tokens internally */ }\n  register(email, password) { /* uses db + tokens internally */ }\n}",
        diagram: asciiDiagram(
`Encapsulation boundary (drawing order: public surface, then hidden internals):

Client --calls--> [UserService public API: login(), register()]
                          | (hidden)
                          v
                 DatabaseClient   TokenService`
        )
      }
    ],
    examples: [
      {
        title: "Swapping the database without breaking callers",
        input: "UserService.login() and register() are the only methods callers use",
        output: "Migrating from a SQL DatabaseClient to a NoSQL one requires zero caller changes",
        explanation: "A clean public interface reduces coupling and makes unit tests easier.",
        diagram: undefined
      }
    ],
    tips: ["Expose only what clients truly need to call.", "Keep fields private; mutate state only through methods that preserve invariants."],
    references: [{ source: "book", attribution: "Clean Code by Robert C. Martin", insight: "A clean public interface reduces coupling and makes unit tests easier." }],
    practiceProblems: ["lld-encapsulation"]
  },
  {
    id: "topic-lld-dependency-inversion",
    moduleId: "mod-lld-oop-foundations",
    title: "Dependency Inversion",
    intuition: "Depend on abstractions such as interfaces, not concrete classes, so the code remains flexible and testable.",
    lesson: [
      {
        title: "Depending on PaymentGateway, not StripeGateway",
        content: "PaymentProcessor depends on the PaymentGateway interface, not on StripeGateway directly. This lets the processor work with Stripe, Razorpay, or PayPal without rewriting core logic, and lets tests inject a FakePaymentGateway.",
        codeExample: "interface PaymentGateway { charge(amount: number): boolean; }\nclass PaymentProcessor {\n  constructor(private gateway: PaymentGateway) {}\n  pay(amount: number) { return this.gateway.charge(amount); }\n}",
        diagram: asciiDiagram(
`Dependency inversion (drawing order: high-level module, then abstraction, then implementations):

PaymentProcessor --depends on--> <<interface>> PaymentGateway
                                       ^
                        +--------------+--------------+
                  StripeGateway   RazorpayGateway   FakePaymentGateway (tests)`
        )
      }
    ],
    examples: [
      {
        title: "Swapping payment providers",
        input: "PaymentProcessor is constructed with a StripeGateway in production",
        output: "Swapping to RazorpayGateway requires only a different constructor argument",
        explanation: "This lets the processor work with Stripe, Razorpay, or PayPal without rewriting core logic.",
        diagram: undefined
      }
    ],
    tips: ["Inject abstractions through constructors, not concrete classes.", "This is what makes unit testing with fakes/mocks possible."],
    references: [{ source: "book", attribution: "Clean Code by Robert C. Martin", insight: "Depending on abstractions keeps high-level modules independent of low-level details." }],
    practiceProblems: ["lld-dependency-inversion"]
  },
  {
    id: "topic-lld-singleton-usage",
    moduleId: "mod-lld-core-patterns",
    title: "Singleton in Practice",
    intuition: "Use singletons only for globally shared, truly unique resources like a logger or configuration manager.",
    lesson: [
      {
        title: "When a singleton is the right call - and when it isn't",
        content: "Logger.getInstance() used across services is a reasonable singleton: the logger is shared, and multiple instances would fragment log output. A singleton is easy to misuse; forcing thread safety and lifecycle control matters in production systems - prefer dependency injection when the 'shared instance' requirement is really just 'convenient to construct once'.",
        codeExample: "class Logger {\n  private static instance: Logger;\n  private constructor() {}\n  static getInstance(): Logger {\n    if (!Logger.instance) Logger.instance = new Logger();\n    return Logger.instance;\n  }\n}",
        diagram: asciiDiagram(
`Singleton access (drawing order: all callers converge on one instance):

ServiceA --getInstance()--\\
ServiceB --getInstance()---> [Logger.instance] (created once, shared)
ServiceC --getInstance()--/`
        )
      }
    ],
    examples: [
      {
        title: "Shared logger across services",
        input: "ServiceA, ServiceB, ServiceC all call Logger.getInstance().log(msg)",
        output: "logger is shared - all writes land in the same underlying log stream",
        explanation: "A singleton is easy to misuse; forcing thread safety and lifecycle control matters in production systems.",
        diagram: undefined
      }
    ],
    tips: ["Only reach for Singleton when there is a genuine single-instance requirement, not just convenience.", "Guard lazy initialization with double-checked locking or an enum in multi-threaded environments."],
    references: [{ source: "book", attribution: "Design Patterns Gang of Four", insight: "Singleton is one of the most overused - and most misused - creational patterns." }],
    practiceProblems: ["lld-singleton"]
  },
  {
    id: "topic-lld-factory-usage",
    moduleId: "mod-lld-core-patterns",
    title: "Factory Pattern",
    intuition: "Factories create concrete objects without exposing instantiation logic to clients.",
    lesson: [
      {
        title: "VehicleFactory: hiding the branching creation logic",
        content: "VehicleFactory.create(\"bike\") returns a BikeVehicle; create(\"car\") returns a CarVehicle. This is ideal when object creation has branching logic or new types may be added frequently - the client never sees the if/switch that decides which concrete class to instantiate.",
        codeExample: "class VehicleFactory {\n  static create(type: string): Vehicle {\n    switch (type) {\n      case 'bike': return new BikeVehicle();\n      case 'car': return new CarVehicle();\n      default: throw new Error('Unknown vehicle type: ' + type);\n    }\n  }\n}",
        diagram: asciiDiagram(
`Factory hides branching creation (drawing order: client request, then factory, then concrete types):

Client --create("bike")--> [VehicleFactory] --returns--> BikeVehicle
Client --create("car")--> [VehicleFactory] --returns--> CarVehicle`
        )
      }
    ],
    examples: [
      {
        title: "Creating a vehicle by type string",
        input: "VehicleFactory.create(\"bike\")",
        output: "BikeVehicle",
        explanation: "This is ideal when object creation has branching logic or new types may be added frequently.",
        diagram: undefined
      }
    ],
    tips: ["Throw a clear error for unknown types rather than returning undefined/null.", "Adding a new vehicle type only touches the factory's switch, not every call site."],
    references: [{ source: "book", attribution: "Design Patterns Gang of Four", insight: "Factory Method decouples object creation from the code that uses the object." }],
    practiceProblems: ["lld-factory"]
  }
];
