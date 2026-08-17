import { Topic, Reference } from "./syllabus";

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
        diagram: undefined
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
        diagram: undefined
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
        diagram: undefined
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
        diagram: undefined
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
        title: "Core Components",
        content: "ParkingLot: Manages levels and availability. Level: Contains spots. Spot: Available or occupied. Vehicle: Car, Bike, Truck (different sizes). Ticket: Entry time, exit time, charge calculation. PaymentProcessor: Handles payment methods.",
        codeExample: "class ParkingLot {\n  private levels: Level[];\n  findAvailableSpot(vehicleType): Spot { /* Search levels */ }\n  parkVehicle(vehicle): Ticket { /* Assign spot */ }\n  unparkVehicle(ticket): amount { /* Calculate charge */ }\n}\n\nclass Level {\n  private spots: Spot[];\n  getAvailableSpot(size): Spot { /* Find spot of size */ }\n}",
        diagram: undefined
      },
      {
        title: "Extensibility",
        content: "Use Strategy for different parking fee algorithms (flat rate, hourly, peak-hour surcharge). Use Observer for level capacity alerts. Use Factory for different vehicle types.",
        codeExample: "interface PricingStrategy { calculateFee(hours, vehicleType): amount; }\nclass HourlyPricing implements PricingStrategy { }\nclass PeakHourPricing implements PricingStrategy { }\n\nclass ParkingLot {\n  constructor(private pricing: PricingStrategy) { }\n  calculateCharge(ticket) { return this.pricing.calculateFee(...); }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Park and Unpark Sequence",
        input: "Car enters parking lot, parks at Level 2 Spot 5, later exits",
        output: "Ticket issued with entry time, exit time recorded, fee calculated",
        explanation: "Step 1: Car requests spot. ParkingLot searches levels. Level 2 has available spot. Step 2: Spot marked occupied, Ticket created with entry time. Step 3: Car exits, exit time recorded. Step 4: PricingStrategy calculates fee based on duration and vehicle type. Step 5: PaymentProcessor charges vehicle.",
        diagram: undefined
      }
    ],
    tips: ["Different vehicle sizes need different spot sizes", "Ticket should be immutable once created", "Consider overflow/queue when lot is full"],
    references: [{ source: "interview-experience", attribution: "Amazon LLD", insight: "Test extensibility: ask how to add electric charging stations." }],
    practiceProblems: []
  },

  {
    id: "topic-lld-library-management",
    moduleId: "mod-lld-design-exercises",
    title: "Library Management System",
    intuition: "Track books, members, borrowing, returning. Entities: Book, Member, Librarian, Reservation, Fine.",
    lesson: [
      {
        title: "Core Entities",
        content: "Book: Title, author, ISBN, availability. Member: Name, ID, borrowing history. Librarian: Issues tickets, processes returns. Reservation: Queue for unavailable books. Fine: Calculated for overdue.",
        codeExample: "class Book {\n  private isbn: String;\n  private title: String;\n  private available: boolean;\n}\n\nclass Member {\n  private id: String;\n  private borrowedBooks: Book[];\n  borrowBook(book: Book): BorrowTicket { }\n}\n\nclass Librarian {\n  issueBook(member, book) { /* Mark as borrowed */ }\n  receiveBook(member, book) { /* Check for overdue, calculate fine */ }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Borrow and Return Workflow",
        input: "Member requests book, books out for 2 weeks, member returns 1 week late",
        output: "Ticket issued, fine calculated for 1 week overdue",
        explanation: "Step 1: Member.borrowBook() creates ticket with due date. Book marked borrowed. Step 2: Return after due date. Librarian.receiveBook() calculates days overdue (7 days). Step 3: Fine = 7 days Ã per-day rate. Step 4: Fine processed before member can borrow again.",
        diagram: undefined
      }
    ],
    tips: ["Handle multiple copies of same book", "Reservation queue when book unavailable", "Max borrowing limit per member"],
    references: [{ source: "interview-experience", attribution: "Facebook LLD", insight: "Discuss edge cases: book damaged, reservation cancellation." }],
    practiceProblems: []
  },

  {
    id: "topic-lld-movie-booking",
    moduleId: "mod-lld-design-exercises",
    title: "Movie Booking System",
    intuition: "Theater chains, movies, shows, seat reservation, payment. Entities: Theater, Movie, Show, Seat, Booking, Payment.",
    lesson: [
      {
        title: "Core Entities",
        content: "Theater: Multiple screens/auditoriums. Movie: Title, duration, rating. Show: Specific date/time for movie at theater. Seat: Reserved or available. Booking: Links member to seats, payment status.",
        codeExample: "class Theater {\n  private screens: Screen[];\n}\n\nclass Screen {\n  private seats: Seat[];\n  reserveSeats(seatIds[], member): Booking { }\n}\n\nclass Booking {\n  private member: Member;\n  private seats: Seat[];\n  private totalPrice: float;\n  private status: BookingStatus; // PENDING, CONFIRMED, CANCELLED\n}",
        diagram: undefined
      },
      {
        title: "Concurrency Handling",
        content: "Multiple members book simultaneously. Lock seats during selection, reserve after payment confirmation. Timeout after 5 minutes frees unreserved seats.",
        codeExample: "class Screen {\n  private seatLocks: Map<Seat, Timestamp>; // Track locks\n  reserveSeats(seatIds[], member) {\n    // Lock seats (5 min timeout)\n    // Proceed to payment\n    // Confirm or timeout\n  }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Booking Workflow with Concurrency",
        input: "Two members select same seats simultaneously. Member A pays, Member B times out.",
        output: "Member A gets seats, Member B's seats released after timeout",
        explanation: "Member A and B select seats â both locked. Member A completes payment â seats confirmed to A. Member B's session expires (5 min timeout) â locks released, seats available again.",
        diagram: undefined
      }
    ],
    tips: ["Handle concurrent bookings with locks/transactions", "Implement seat hold timeout", "Support partial bookings (some seats unavailable)"],
    references: [{ source: "interview-experience", attribution: "Google System Design", insight: "Concurrency is the tricky part - discuss locking strategy." }],
    practiceProblems: []
  },

  {
    id: "topic-lld-elevator-system",
    moduleId: "mod-lld-design-exercises",
    title: "Elevator System Design",
    intuition: "Multi-floor building, multiple elevators, button requests, scheduling. Entities: Building, Elevator, FloorRequest, Controller.",
    lesson: [
      {
        title: "Elevator Movement Logic",
        content: "Elevator serves requests in optimal order (scan algorithm). Going up: visit all up-requests. Going down: visit all down-requests. Controller assigns new requests to elevators.",
        codeExample: "class Elevator {\n  private currentFloor: int;\n  private direction: Direction; // UP, DOWN, IDLE\n  private requestQueue: Queue<FloorRequest>;\n  move() {\n    if (direction == UP) goToNextUpRequest();\n    else goToNextDownRequest();\n  }\n}\n\nclass Controller {\n  assignRequest(request): Elevator { /* Find nearest idle or moving elevator */ }\n}",
        diagram: undefined
      }
    ],
    examples: [
      {
        title: "Multi-Elevator Scheduling",
        input: "Building with 3 elevators. Requests from floors 2, 5, 3, 8",
        output: "Optimal assignment minimizing wait time",
        explanation: "Elevator 1 going up (floor 1): take floor 2, 3, 5. Elevator 2 going down (floor 10): take floor 8. Distribute load across elevators to minimize average wait.",
        diagram: undefined
      }
    ],
    tips: ["Scan algorithm: Go up serving all ups, then down serving downs", "Handle simultaneous requests on same floor", "Emergency stop and manual override buttons"],
    references: [{ source: "interview-experience", attribution: "Amazon LLD", insight: "Discussion on scheduling algorithms and optimality." }],
    practiceProblems: []
  }
];
