import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-deadlocks - "OS: Deadlocks" (5 topics).
export const osDeadlocksTopics: Topic[] = [
  {
    id: "topic-os-coffman-conditions",
    moduleId: "mod-os-deadlocks",
    title: "The Four Coffman Conditions and the Resource Allocation Graph",
    intuition:
      "Deadlock is not a mysterious event; it is a state that requires four specific conditions to hold simultaneously, and breaking any one of them makes deadlock impossible. Mutual exclusion, hold-and-wait, no preemption, and circular wait are individually reasonable design decisions that only become fatal together. That framing is what makes the topic tractable in an interview and in production: instead of asking 'is this code deadlock-free', you ask 'which of the four conditions have I broken', and if the answer is none, you have a latent deadlock whether or not it has fired yet.",
    complexity: {
      time:
        "Detecting a cycle in a resource allocation graph is O(V + E) with a depth-first search, where V is processes plus resource types and E is the allocation and request edges. With multiple instances per resource type the test is not a simple cycle check but a reduction algorithm costing O(P^2 * R) for P processes and R resource types.",
      space:
        "The graph needs O(P * R) space for the allocation and request matrices. In practice the kernel does not maintain such a graph for user locks at all, which is why deadlock detection in application code is normally done by timeouts or by external tooling rather than by the operating system."
    },
    lesson: [
      {
        title: "The Four Conditions, and Why All Four Are Required",
        content:
          "Coffman, Elphick, and Shoshani identified four necessary conditions in 1971, and the word necessary is doing real work: all four must hold simultaneously for deadlock to be possible, so eliminating any single one prevents it entirely. Mutual exclusion means at least one resource is held in a non-shareable mode; a read-only file shared by many readers cannot participate in a deadlock. Hold-and-wait means a process holding at least one resource is waiting to acquire another; if every process requested everything at once, this would not hold. No preemption means a resource cannot be forcibly taken from its holder and must be released voluntarily; a database that can abort and roll back a transaction has broken this condition deliberately. Circular wait means there is a cycle of processes each waiting on a resource held by the next. In practice circular wait is the condition engineers attack, because breaking it costs almost nothing - impose a global ordering on lock acquisition - while breaking the others usually means giving up performance, correctness, or both.",
        diagram: asciiDiagram(`All FOUR must hold. Break any ONE and deadlock is impossible.

  ┌─ 1. MUTUAL EXCLUSION ───────────────────────────────────┐
  │  at least one resource is non-shareable                 │
  │  break it? ──▶ make resources shareable (read-only      │
  │                data, immutable snapshots, copies)       │
  │  cost: often impossible - writes genuinely conflict     │
  └─────────────────────────────────────────────────────────┘
  ┌─ 2. HOLD AND WAIT ──────────────────────────────────────┐
  │  a holder blocks while requesting more                  │
  │  break it? ──▶ request ALL resources atomically up      │
  │                front, or release everything before      │
  │                requesting anything new                  │
  │  cost: low utilisation + starvation of big requests     │
  └─────────────────────────────────────────────────────────┘
  ┌─ 3. NO PREEMPTION ──────────────────────────────────────┐
  │  resources are released only voluntarily                │
  │  break it? ──▶ abort and roll back (databases do this)  │
  │  cost: needs rollback machinery; wasted work            │
  └─────────────────────────────────────────────────────────┘
  ┌─ 4. CIRCULAR WAIT ──────────────────────────────────────┐
  │  P1 ──waits──▶ P2 ──waits──▶ P3 ──waits──▶ P1           │
  │  break it? ──▶ GLOBAL ORDERING on resources; always     │
  │                acquire lowest id first                  │
  │  cost: NEARLY ZERO                                      │
  │  ──▶ this is the one you attack in real code            │
  └─────────────────────────────────────────────────────────┘

  Necessary, not sufficient: all four holding means deadlock is
  POSSIBLE. It fires only when the interleaving actually occurs,
  which is why latent deadlocks survive years of testing.`)
      },
      {
        title: "Resource Allocation Graphs and Cycle Detection",
        content:
          "The resource allocation graph makes the circular wait condition visible. Processes and resources are nodes; an assignment edge runs from a resource to the process holding it, and a request edge runs from a process to the resource it wants. When every resource type has exactly one instance, a cycle in this graph is both necessary and sufficient for deadlock, so a simple depth-first search decides the question. With multiple instances per type the picture changes: a cycle becomes necessary but not sufficient, because another holder of the same resource type may release an instance and break the wait without any process in the cycle acting. This distinction matters more than it looks, because most real resources are multi-instance - a connection pool with ten connections, a semaphore with N permits, a page frame pool - and reasoning that treats them as single-instance produces false alarms. For multi-instance detection you need a reduction algorithm that repeatedly finds a process whose outstanding requests can be satisfied from available instances, grants it, reclaims everything it holds, and repeats; whatever cannot be reduced is deadlocked.",
        diagram: asciiDiagram(`Resource allocation graph: two shapes, two verdicts

  Notation:   R ──▶ P   assignment (R is held BY P)
              P ──▶ R   request    (P wants R)

  SINGLE INSTANCE - a cycle IS a deadlock
  ────────────────────────────────────────
        ┌──────── R1 ────────┐
        │ (held by P1)       ▼
        │                   [P2]
       [P1]                  │
        ▲                    │ requests R2
        │ requests R1        ▼
        └──────── R2 ◀───────┘
                 (held by P2)

     Cycle: P1 ▶ R1 ▶ ... wait, trace it properly:
       P1 requests R2, R2 held by P2
       P2 requests R1, R1 held by P1
       ──▶ P1 ▶ R2 ▶ P2 ▶ R1 ▶ P1  ── CYCLE ──▶ DEADLOCK ✗

  MULTI INSTANCE - a cycle MAY be harmless
  ────────────────────────────────────────
     R1 has 2 instances:  [■][■]
        instance 1 ──▶ P1
        instance 2 ──▶ P3      ◀── P3 is NOT in the cycle
     P1 ──requests──▶ R2 ──held by──▶ P2 ──requests──▶ R1

     Cycle exists (P1 ▶ R2 ▶ P2 ▶ R1 ▶ P1)
     BUT P3 can finish and release its R1 instance
        ──▶ P2 gets it, finishes, releases R2
        ──▶ P1 proceeds.  NO deadlock ✓

  ──▶ single instance: cycle = deadlock (necessary AND sufficient)
  ──▶ multi instance:  cycle is NECESSARY ONLY. You must run the
      reduction algorithm to decide.`)
      },
      {
        title: "Deadlock in Real Systems Rarely Looks Like the Textbook",
        content:
          "Textbook deadlocks involve processes and physical resources; production deadlocks involve mutexes, database rows, connection pools, and thread pools, and they frequently span abstraction layers in ways that make the cycle hard to see. A recurring shape is the thread pool deadlock, where a task submitted to a fixed pool blocks waiting for the result of another task it submitted to the same pool; if the pool is saturated with such tasks, none can complete. Another is the lock-ordering inversion across modules, where module A takes its own lock then calls into module B which takes B's lock, while another path does the reverse, and neither module's author could see the cycle because each is locally consistent. A third is database deadlock between transactions updating the same rows in different orders, which most engines detect and resolve by aborting one transaction with a deadlock error - which is why application code must be prepared to retry. Recognising these shapes matters more than the graph theory, because the graph is never actually drawn in production.",
        codeExample: `// Three deadlocks you will actually meet.

// 1. THREAD POOL EXHAUSTION -------------------------------------
ExecutorService pool = Executors.newFixedThreadPool(4);
pool.submit(() -> {
    Future<Integer> inner = pool.submit(() -> compute());
    return inner.get();          // BLOCKS a pool thread waiting
});                              // on a task that needs a pool thread
// 4 such tasks ──▶ all 4 threads blocked, queue full of inner tasks
// ──▶ deadlock with no lock involved at all.
// Fix: separate pools per stage, or never block on a task from
//      inside the same pool (use composition: thenApply/thenCompose).

// 2. LOCK ORDERING INVERSION ACROSS MODULES ----------------------
// Module A                       Module B
synchronized (aLock) {            synchronized (bLock) {
    b.notifyChanged();   // takes     a.readState();   // takes aLock
}                        // bLock }
// Each module is locally consistent. The cycle only exists in
// the composition, which is why review misses it.
// Fix: never call OUT of a module while holding its lock.

// 3. DATABASE DEADLOCK -------------------------------------------
// T1: UPDATE accounts SET .. WHERE id=1;  then WHERE id=2;
// T2: UPDATE accounts SET .. WHERE id=2;  then WHERE id=1;
// ──▶ Postgres/MySQL DETECT this and abort one with
//     SQLSTATE 40P01 / ER_LOCK_DEADLOCK.
// Fix: order updates by primary key, AND retry on deadlock error -
//      detection means your code MUST handle the abort.

/* Diagnose a JVM deadlock instantly:
     jstack <pid> | grep -A 20 "Found one Java-level deadlock"
   Diagnose a native one:
     gdb -p <pid>, then "thread apply all bt" - look for several
     threads parked in pthread_mutex_lock with a cycle of owners. */`
      }
    ],
    examples: [
      {
        title: "Two-account transfer deadlock",
        input: "transfer(A,B) and transfer(B,A) run concurrently, each locking the source then the destination.",
        output: "Both threads block permanently; jstack shows a two-node cycle.",
        explanation:
          "Step 1: All four conditions hold - the account locks are exclusive, each thread holds one while waiting for the other, locks cannot be preempted, and the wait is circular.\nStep 2: Only circular wait is cheap to break here, since the locks genuinely must be exclusive and there is no rollback machinery.\nStep 3: Sort the two accounts by primary key and always lock the lower one first.\nStep 4: Both call directions now acquire in the same order, so the cycle cannot form and no detection or timeout is needed."
      },
      {
        title: "A cycle that was not a deadlock",
        input: "A monitoring tool reports a cycle in a graph where R1 is a connection pool with ten connections.",
        output: "False alarm - multi-instance resources make a cycle necessary but not sufficient.",
        explanation:
          "Step 1: The cycle involves two processes, but eight other connections are held by processes outside the cycle.\nStep 2: Any of those can finish and return a connection, which satisfies the request and dissolves the wait.\nStep 3: Deciding the question requires the reduction algorithm, not a depth-first search.\nStep 4: The tool was applying single-instance reasoning to a multi-instance resource, which is the most common source of spurious deadlock reports."
      },
      {
        title: "Thread pool deadlock with no locks",
        input: "A fixed pool of four threads; each task submits a subtask to the same pool and blocks on its result.",
        output: "Complete stall once four such tasks are in flight.",
        explanation:
          "Step 1: Each of the four threads is occupied by an outer task that is blocked on a Future.\nStep 2: The inner tasks sit in the queue and can never be picked up, because no thread is free.\nStep 3: This is hold-and-wait plus circular wait where the held resource is a pool thread rather than a lock.\nStep 4: Fix by using separate pools per pipeline stage, or by composing futures with thenCompose so nothing blocks a pool thread."
      }
    ],
    tips: [
      "Name all four conditions and immediately say which one you would break in real code and why - circular wait, because global ordering is nearly free.",
      "State that the conditions are necessary, not sufficient, so a latent deadlock exists whenever all four hold even if it has never fired.",
      "Distinguish single-instance from multi-instance resources explicitly; a cycle proves deadlock only in the single-instance case."
    ],
    tricks: [
      "If a deadlock has no locks in it, look for a bounded pool - threads, connections, or permits are resources and they deadlock the same way.",
      "A module that calls out to unknown code while holding its own lock has created a cycle that no local review can see.",
      "Database deadlock detection means your application must handle the abort; retry logic is part of the fix, not an optional extra."
    ],
    memoryAids: [
      "Mutual exclusion, hold-and-wait, no preemption, circular wait - MHNC, and you only ever break the last one.",
      "Necessary, not sufficient: all four holding means the deadlock is latent, not that it has fired.",
      "Single instance, a cycle is the verdict; multiple instances, a cycle is only a suspicion."
    ],
    interviewPatterns: [
      "Definition probe: 'name the conditions for deadlock' - a near-universal opener, and the follow-up is always which one you would break.",
      "Applied: 'this service hangs under load with no CPU usage' - the expected diagnosis path is thread dump, find the cycle, name the ordering fix.",
      "Frequency and companies: Tier 1 for all backend and systems roles; asked in essentially every operating systems screen."
    ],
    practiceProblems: [
      "Which Coffman condition does a database break when it aborts a transaction, and what does that cost? Answer: No preemption. The engine forcibly takes the locks from one transaction by rolling it back, which requires undo logging and wastes the work already done. It is affordable precisely because databases already maintain rollback machinery for atomicity, which is why the same technique is impractical for in-memory mutexes with no undo log.",
      "Explain why a cycle in a resource allocation graph does not always mean deadlock. Answer: With multiple instances of a resource type, a process outside the cycle may hold an instance and later release it, satisfying a request in the cycle and dissolving the wait. A cycle is therefore necessary but not sufficient. Deciding the question requires a reduction: repeatedly find a process whose requests can be met from available instances, grant it, reclaim its holdings, and repeat; anything left unreduced is genuinely deadlocked.",
      "A service hangs with all threads idle and zero CPU. Outline the diagnosis. Answer: Take a thread dump - jstack for the JVM, gdb with thread apply all bt for native code. Look for threads blocked at lock acquisition and construct the owner-waiter cycle, which jstack reports directly as a Java-level deadlock. If no lock cycle exists, look for a bounded pool: threads blocked on Future.get, on a connection pool checkout, or on a semaphore acquire, where the held resource is a pool slot rather than a mutex."
    ],
    faq: [
      {
        question: "Why do we say the four conditions are necessary rather than sufficient?",
        answer:
          "Because their simultaneous presence makes deadlock possible but does not make it happen. Deadlock also requires that the processes actually reach the specific interleaving in which the circular wait materialises, and in most runs they do not. The transfer function that locks two accounts in caller-determined order satisfies all four conditions on every single call, yet it deadlocks only when two opposing transfers overlap in a narrow window - which might be once in millions of executions, or never during testing and repeatedly under production load. This distinction has an important practical consequence: you cannot conclude that code is deadlock-free because it has never deadlocked. The correct test is structural rather than empirical - examine whether all four conditions can hold, and if they can, the deadlock is latent and will eventually fire under sufficient concurrency. That is also why static analysis and lock-ordering discipline are so much more valuable here than testing. Tools that build a lock-order graph from observed acquisitions, such as the kernel's lockdep or ThreadSanitizer's lock-order checking, report a violation the first time two locks are taken in opposite orders anywhere in the program, even if the two paths never ran concurrently - they check the structural condition rather than waiting for the interleaving."
      },
      {
        question: "Which condition should I break in real code?",
        answer:
          "Circular wait, in almost every case, because it is the only one whose elimination is nearly free. Mutual exclusion usually cannot be given up, since the resources genuinely conflict - two threads cannot both hold a write lock on the same row and remain correct - though there is a real version of this fix when you replace shared mutable state with immutable snapshots that readers never lock at all. Breaking hold-and-wait means acquiring every resource atomically up front, which requires knowing the full set in advance, reduces utilisation because resources are held longer than needed, and starves large requests that can rarely find everything free simultaneously. Breaking no preemption means being able to take a resource back, which requires rollback machinery; databases have it because they need undo logs for atomicity anyway, but an in-memory mutex has no way to undo the partial mutation its holder performed. Circular wait, by contrast, is broken by imposing a total order on resources and always acquiring in that order - sort by object id, primary key, or even memory address before locking. It costs two lines at each acquisition site, requires no runtime machinery, no detection, and no recovery, and it converts deadlock from something you detect into something that cannot be constructed. The only real difficulty is enforcing the discipline across a large codebase, which is what lock-order checkers exist to automate."
      },
      {
        question: "Does the operating system detect deadlocks between application threads?",
        answer:
          "Generally no, and this surprises people who learned the resource allocation graph first. Unix-like kernels do not maintain a graph of which thread holds which user-space mutex, because with futexes an uncontended lock is never visible to the kernel at all - the fast path is a compare-and-swap on user memory - so the kernel simply does not have the information. Even for contended futexes it knows only that a thread is waiting on an address, not what that address protects or who owns it. There are narrow exceptions: pthread mutexes created with the error-checking attribute detect the trivial case of a thread relocking a mutex it already holds and return EDEADLK, and robust mutexes handle the case of a holder dying. But a genuine multi-thread cycle produces threads that are simply blocked, and the process hangs with no diagnostic. Detection therefore lives elsewhere. Language runtimes can do it because they own the lock implementation: the JVM's thread dump explicitly reports Java-level deadlocks with the full cycle. Databases do it because they own the lock manager and can afford the graph, and they resolve cycles by aborting a victim transaction. The Linux kernel runs lockdep on its own internal locks in debug builds. For ordinary application code the practical tools are thread dumps, watchdog timers that fire when an operation exceeds its expected duration, and lock-order checkers run during testing."
      },
      {
        question: "How does a thread pool deadlock without any locks?",
        answer:
          "Because a pool thread is itself a resource, and the four conditions apply to it exactly as they apply to a mutex. The pattern is a task that runs on the pool and blocks waiting for the result of another task submitted to the same pool. The outer task holds a thread - mutual exclusion, since one thread runs one task - and waits for the inner task, which needs a thread it cannot get because all threads are held by outer tasks doing the same thing. The wait is circular through the pool's queue, and a pool thread cannot be preempted from its task. With a pool of four threads, four such outer tasks stall the whole pool permanently, and the symptom is a service that stops making progress with zero CPU usage and a queue that only grows. The same shape appears with any bounded resource: a request handler that checks out a database connection and then, while holding it, calls a helper that also checks one out will deadlock the pool at half its size. The fixes are structural. Use separate pools for stages that depend on each other, so a stall in one cannot starve the other. Never block on a task from inside the same pool - compose asynchronously with thenCompose or its equivalent so the outer task returns its thread while waiting. Acquire all pool resources at one level rather than nesting checkouts. And where a bound exists, instrument checkout wait time so saturation is visible before it becomes a hang."
      },
      {
        question: "What is the difference between the resource allocation graph and a wait-for graph?",
        answer:
          "A wait-for graph is the resource allocation graph with the resource nodes collapsed away, leaving only processes. If process P holds resource R and process Q is requesting R, the resource allocation graph has an assignment edge from R to P and a request edge from Q to R; the wait-for graph simply has an edge from Q to P meaning Q waits for P. The collapse is valid only for single-instance resources, because with multiple instances the identity of who will eventually satisfy a request is not determined, so the edge is ambiguous. Within that restriction the wait-for graph is far more convenient: it is smaller, and a cycle in it is exactly a deadlock, so detection is an ordinary depth-first search over processes. This is the representation real systems use. A JVM thread dump effectively prints a wait-for graph, naming for each blocked thread the lock it awaits and the thread that owns it, which is why the deadlock report reads as a chain of threads. Database lock managers maintain a wait-for graph explicitly and run cycle detection either periodically or on each blocking wait, then abort the transaction with the least work done. The resource allocation graph remains the right model when reasoning about multi-instance resources such as pools and semaphores, where you need the reduction algorithm rather than a cycle test, but the wait-for graph is what you will actually read in a production diagnosis."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Coffman, Elphick, Shoshani - System Deadlocks (ACM Computing Surveys, 1971)",
        insight: "The original enumeration of the four conditions and the argument for their necessity, which is still the exact framing used in interviews fifty years later."
      },
      {
        source: "book",
        attribution: "Silberschatz, Galvin, Gagne - Operating System Concepts, chapter 8 (Deadlocks)",
        insight: "The clearest treatment of the single-instance versus multi-instance distinction and why a cycle is only sometimes conclusive."
      },
      {
        source: "blog",
        attribution: "Linux kernel documentation - lockdep design (Documentation/locking/lockdep-design.rst)",
        insight: "Shows how structural lock-order checking finds latent deadlocks that have never fired, which is the production answer to 'necessary but not sufficient'."
      }
    ]
  },
  {
    id: "topic-os-deadlock-prevention",
    moduleId: "mod-os-deadlocks",
    title: "Deadlock Prevention: Lock Ordering and Structural Fixes",
    intuition:
      "Prevention means arranging the system so that deadlock cannot occur, as opposed to avoidance, which permits the dangerous shape but refuses individual requests, and detection, which lets it happen and cleans up afterwards. Prevention is the strongest of the three and, when it is available, the cheapest, because it needs no runtime bookkeeping at all. The overwhelming majority of production deadlock prevention is one technique: impose a total order on locks and always acquire in that order. Everything else in this topic is either a way to enforce that order, or a way to avoid needing more than one lock in the first place.",
    complexity: {
      time:
        "Lock ordering adds a comparison at each acquisition site - effectively zero cost. Trylock with backoff costs an extra failed acquisition and a randomised sleep per conflict, so its expected cost rises with contention. Acquiring all resources up front costs nothing per operation but reduces effective concurrency because resources are held for the whole operation rather than only when needed.",
      space:
        "Lock ordering requires no additional state, which is a large part of its appeal. Lock-order verification tooling such as lockdep maintains a graph of observed acquisition orders costing O(L^2) in the worst case for L lock classes, but only in debug builds."
    },
    lesson: [
      {
        title: "Global Lock Ordering: The Technique That Matters",
        content:
          "Assign every lock a position in a total order and require that any thread holding a lock may only acquire locks later in the order. A circular wait then becomes impossible, because a cycle would require some thread to acquire a lower-ordered lock while holding a higher-ordered one. The order can come from anything stable: an explicit integer rank assigned per lock class, a natural key such as an account id or file inode number, or as a last resort the lock's memory address, which is arbitrary but consistent within a process. At the acquisition site the code sorts the locks it needs and takes them in that sequence. What makes this powerful is that it is prevention rather than detection - there is no cycle to find, no timeout to tune, and no recovery path to test, because the bad state is unconstructible. What makes it hard is not the technique but the discipline: in a large codebase the order must be documented and enforced, and the failure mode is a new code path that takes two locks in the wrong order and introduces a latent deadlock that testing will probably not find.",
        codeExample: `/* The two-line fix that prevents most real deadlocks. */

void transfer(account *from, account *to, long amount) {
    account *first  = from->id < to->id ? from : to;
    account *second = from->id < to->id ? to   : from;
    lock(&first->m);
    lock(&second->m);
    from->balance -= amount;
    to->balance   += amount;
    unlock(&second->m);
    unlock(&first->m);
}
/* transfer(A,B) and transfer(B,A) now acquire in the SAME order. */

/* Careful: identical ids means the same account. Handle it or you
   self-deadlock on a non-recursive mutex: */
if (from->id == to->id) return;

/* For lock CLASSES rather than instances, use an explicit rank: */
enum lock_rank {
    RANK_CONFIG   = 10,     /* outermost */
    RANK_REGISTRY = 20,
    RANK_ENTRY    = 30,
    RANK_STATS    = 40,     /* innermost */
};
/* Rule: while holding rank N you may take only rank > N.
   Write it in a header, enforce it in review, verify it in debug
   builds by tracking the current thread's max held rank: */

#ifndef NDEBUG
static __thread int held_rank = 0;
#define LOCK(l) do {                                    \\
    assert((l)->rank > held_rank && "lock order violation"); \\
    int saved = held_rank; held_rank = (l)->rank;       \\
    pthread_mutex_lock(&(l)->m);
#define UNLOCK(l) pthread_mutex_unlock(&(l)->m); held_rank = saved; \\
} while (0)
#endif
/* ──▶ this catches the violation the FIRST time the path runs,
       even if the concurrent interleaving never occurs. That is
       the whole value of structural checking over testing. */`
      },
      {
        title: "Eliminating the Need for Two Locks",
        content:
          "The most reliable way to prevent a multi-lock deadlock is to stop taking multiple locks. Several structural techniques achieve this. Coarsening replaces several fine-grained locks with one, which trivially eliminates ordering questions at the cost of concurrency, and is often the right answer for code that is not actually hot. Reducing lock scope so that each lock is taken, used, and released before the next is needed converts nested acquisition into sequential acquisition, which cannot deadlock - though it also means the operation is no longer atomic across both, so it is only valid when the invariant does not span them. Copying data under one lock and releasing before taking the next achieves the same. Replacing shared mutable state with immutable snapshots removes locking from the read path entirely, since readers take a single atomic load of a pointer to an immutable object and writers publish a new one. And moving from shared state to message passing, where each piece of state is owned by exactly one thread that others communicate with through a queue, removes the locks rather than ordering them.",
        diagram: asciiDiagram(`Four ways to stop needing two locks at once

  NESTED (deadlock-capable)          SEQUENTIAL (deadlock-free)
  ┌────────────────────────┐         ┌────────────────────────┐
  │ lock(A)                │         │ lock(A)                │
  │   lock(B)   ◀── cycle  │   ──▶   │   x = read(A)          │
  │     work(A, B)         │         │ unlock(A)              │
  │   unlock(B)            │         │ lock(B)                │
  │ unlock(A)              │         │   work(x, B)           │
  └────────────────────────┘         │ unlock(B)              │
                                     └────────────────────────┘
                                     valid ONLY if no invariant
                                     spans A and B

  COARSEN                            IMMUTABLE SNAPSHOT
  ┌────────────────────────┐         ┌────────────────────────┐
  │ lock(big)              │         │ c = atomic_load(&cfg)  │
  │   work(A, B, C)        │         │ use(c)   ◀── no lock   │
  │ unlock(big)            │         │                        │
  └────────────────────────┘         │ writer: build new,     │
  cost: concurrency                  │   atomic_exchange      │
  fine when the path is cold         └────────────────────────┘
                                     readers scale perfectly

  MESSAGE PASSING - state has ONE owner
     ┌────────┐  request   ┌──────────────┐
     │ caller │ ─────────▶ │ owner thread │  holds the state
     │        │ ◀───────── │  (no lock)   │  exclusively
     └────────┘  response  └──────────────┘
     ──▶ no shared mutable state ──▶ nothing to order

  Rule of thumb: if you are designing a lock ORDER, first ask
  whether you can design the second lock AWAY.`)
      },
      {
        title: "Trylock, Timeouts, and Their Traps",
        content:
          "When no natural order exists - for instance when locks are chosen dynamically and their identities are not comparable - the fallback is to acquire the first lock normally and attempt the second with a non-blocking trylock. On failure the thread releases everything it holds and retries. This breaks the hold-and-wait condition rather than circular wait, since a thread never blocks while holding. It works, but it has two traps. The first is livelock: if two threads back off and retry in lockstep, they will collide again indefinitely while burning CPU, so the backoff must be randomised, ideally with exponential growth. The second is that any partial work performed before the release must be undone or must have been deferred, which means the retry loop cannot wrap arbitrary code. Timed lock acquisition is a weaker relative, used mainly as a safety net rather than a design: setting a timeout converts a permanent hang into an error that can be logged and handled, which is genuinely valuable for diagnosis, but a timeout that fires is evidence of a design bug rather than a fix for it.",
        codeExample: `/* Trylock with randomised backoff - when no natural order exists. */
int transfer_dynamic(node *a, node *b, long amount) {
    for (int attempt = 0; ; attempt++) {
        pthread_mutex_lock(&a->m);
        if (pthread_mutex_trylock(&b->m) == 0) {
            do_transfer(a, b, amount);
            pthread_mutex_unlock(&b->m);
            pthread_mutex_unlock(&a->m);
            return 0;
        }
        pthread_mutex_unlock(&a->m);        /* release EVERYTHING */

        /* RANDOMISED exponential backoff. Without randomisation two
           threads retry in lockstep forever ──▶ LIVELOCK, which is
           worse than deadlock because the process looks BUSY. */
        int us = (rand() % (1 << (attempt < 10 ? attempt : 10))) + 1;
        usleep(us);
    }
}

/* Timed acquisition - a DIAGNOSTIC, not a design. */
struct timespec deadline;
clock_gettime(CLOCK_REALTIME, &deadline);
deadline.tv_sec += 5;
if (pthread_mutex_timedlock(&m, &deadline) == ETIMEDOUT) {
    log_error("lock held >5s - probable deadlock, dumping threads");
    dump_all_threads();
    return -EAGAIN;
}
/* A firing timeout means you have a design bug. It converts a
   silent hang into a loud, diagnosable failure - valuable - but
   it does not make the code deadlock-free. */

/* Java equivalent: */
// if (lock.tryLock(500, TimeUnit.MILLISECONDS)) {
//     try { ... } finally { lock.unlock(); }
// } else { throw new ResourceBusyException(); }`
      },
      {
        title: "Enforcing the Discipline at Scale",
        content:
          "A lock order that exists only in a design document decays, because every new contributor is one unnoticed acquisition away from a latent cycle. Real systems therefore mechanise the check. The Linux kernel's lockdep assigns every lock a class, records the order in which classes are acquired, and reports a violation the first time any path takes two classes in an order inconsistent with previous observations - crucially, without requiring the two paths to run concurrently, so a single-threaded test run can find a deadlock that would only fire under production concurrency. ThreadSanitizer performs a similar lock-order check for user-space code, and Java's ThreadMXBean can report deadlocks at runtime. A lighter-weight version, sufficient for many codebases, is to give each lock class an integer rank and assert in debug builds that a thread only ever acquires strictly increasing ranks. Beyond tooling, two coding conventions do most of the work: never call unknown code such as a callback or a virtual method while holding a lock, and keep the set of locks any one function may hold small enough to state in a comment.",
        diagram: asciiDiagram(`Structural checking finds what testing cannot

  Test run, single-threaded, path 1:
      acquire CONFIG ──▶ acquire ENTRY
      lockdep records:  CONFIG ──▶ ENTRY

  Test run, single-threaded, path 2 (a different request type):
      acquire ENTRY  ──▶ acquire CONFIG
      lockdep checks:   ENTRY ──▶ CONFIG contradicts the
                        recorded edge ──▶ REPORT ✗

  ──▶ Neither run deadlocked. Neither run was even concurrent.
      The VIOLATION is structural, so it is caught immediately.

  Compare with testing for the deadlock itself:
      requires both paths to run CONCURRENTLY, and to interleave
      in the narrow window ──▶ maybe 1 in 10^6 ──▶ never in CI,
      always in production at 3am.

  Enforcement ladder, cheapest first:
  ┌────────────────────────────────────────────────────────┐
  │ 1. Document the order in a header, next to the locks   │
  │ 2. Assert increasing rank in debug builds (~20 lines)  │
  │ 3. ThreadSanitizer / lockdep in CI                     │
  │ 4. Runtime deadlock reporting (ThreadMXBean, jstack    │
  │    on a watchdog timer) as the last line of defence    │
  └────────────────────────────────────────────────────────┘

  Two conventions that prevent most violations outright:
     ▸ never call OUT (callback, virtual method, listener) while
       holding a lock - you cannot know what it will acquire
     ▸ keep the held-lock set small enough to state in a comment`)
      }
    ],
    examples: [
      {
        title: "Ordering by primary key in a payments service",
        input: "A transfer path deadlocks in production roughly once a day under peak load.",
        output: "Fixed by sorting the two account locks by id before acquisition.",
        explanation:
          "Step 1: The deadlock requires opposing transfers between the same pair of accounts to overlap, which is rare but inevitable at scale.\nStep 2: Ordering by account id makes both directions acquire the same lock first.\nStep 3: The equal-id case must be handled separately, or a non-recursive mutex will self-deadlock on a self-transfer.\nStep 4: No detection, timeout, or retry logic is needed, because the cycle is now unconstructible rather than merely unlikely."
      },
      {
        title: "Trading a deadlock for a livelock",
        input: "A team replaces nested locking with trylock and a fixed 1 ms backoff.",
        output: "Deadlock disappears; CPU usage spikes to 100% with no throughput.",
        explanation:
          "Step 1: Two threads collide, both release, both sleep exactly 1 ms, and both retry simultaneously.\nStep 2: The collision repeats indefinitely, so the threads are running but never progressing - livelock.\nStep 3: It is harder to diagnose than the original deadlock because the process appears busy rather than hung.\nStep 4: Randomising the backoff, ideally with exponential growth, breaks the symmetry and restores progress."
      },
      {
        title: "lockdep catching a latent inversion",
        input: "A kernel patch adds a path that takes an inode lock while holding a filesystem lock.",
        output: "lockdep reports a possible circular locking dependency during a normal single-threaded test.",
        explanation:
          "Step 1: An earlier path had already been observed acquiring the inode lock before the filesystem lock.\nStep 2: lockdep records edges between lock classes rather than waiting for a concurrent interleaving.\nStep 3: The new edge contradicts the recorded one, so the cycle is reported immediately.\nStep 4: The deadlock had never occurred and might not have for years, which is exactly why structural checking beats testing here."
      }
    ],
    tips: [
      "Lead with global lock ordering and say why: it is prevention, needs no runtime state, and costs a comparison per acquisition.",
      "Offer 'design the second lock away' before 'order the two locks' - coarsening, snapshots, and message passing are stronger answers.",
      "If you propose trylock with backoff, mention randomisation in the same breath, or the interviewer will ask about livelock."
    ],
    tricks: [
      "When no natural key exists, ordering by lock address is arbitrary but perfectly valid within a process, and it is what many library implementations do.",
      "Handle the same-object case explicitly when sorting two locks, or a self-transfer will self-deadlock on a non-recursive mutex.",
      "A twenty-line debug-build rank assertion catches ordering violations on the first execution of a path, without any concurrency at all."
    ],
    memoryAids: [
      "Lowest id first - the whole of deadlock prevention in four words.",
      "Design the second lock away before you design an order for it.",
      "Never call out under a lock: you cannot order what you cannot see."
    ],
    interviewPatterns: [
      "Applied fix: 'how would you make this two-lock function safe' - ordering, with the same-key edge case.",
      "Trade-off probe: 'why not just use timeouts' - because a firing timeout is evidence of a design bug, not a fix.",
      "Frequency and companies: Tier 1 for backend and systems roles; the ordered-transfer question specifically appears at Amazon, Stripe, Bloomberg, and most payment and trading systems teams."
    ],
    practiceProblems: [
      "Give a total order for locks that have no natural key, and state a caveat. Answer: Order by the lock object's memory address, which is arbitrary but stable within a process, so all threads agree. The caveat is that addresses are not stable across processes or after relocation, so this fails for locks in shared memory mapped at different addresses in different processes - there you need an explicit rank or an index stored in the shared segment.",
      "Why is a lock timeout a diagnostic rather than a fix? Answer: A timeout converts an indefinite hang into a bounded failure that can be logged, alerted on, and recovered from, which is genuinely useful. But the deadlock still occurs, work is still lost, and the timeout value is a guess that trades false positives under load against slow detection. It also leaves the code with a rarely exercised error path. The structural fix - ordering or eliminating the second lock - removes the possibility instead of bounding its damage.",
      "You must call a user-supplied callback when state changes. How do you avoid deadlock? Answer: Never invoke it while holding your lock, because you cannot know what locks it takes and it may call back into you. Update state under the lock, copy whatever the callback needs including a snapshot of the listener list, release the lock, then invoke the callbacks. This removes your lock from any cycle the callback might participate in and also prevents reentrant calls from observing a half-updated invariant."
    ],
    faq: [
      {
        question: "How do I choose a lock ordering in a large codebase?",
        answer:
          "Use two levels: a coarse ordering over lock classes and a fine ordering within a class. The coarse ordering is a documented rank assigned to each kind of lock according to the layering of the system - configuration locks outermost, then registry or index locks, then per-entry locks, then statistics or logging locks innermost. The rule becomes that while holding a lock of rank N you may acquire only locks of strictly greater rank, which mirrors the natural direction in which calls flow through the layers and is therefore easy to remember and to review. Within a class, where you might hold two per-entry locks at once, order by a stable natural key such as an entity id, a primary key, or an inode number; when no such key exists, ordering by memory address is arbitrary but consistent and is what many library implementations do. Write the ranks in a header next to the lock declarations rather than in a design document, so they are visible at the point of use. Then mechanise the check: a debug-build assertion that tracks the highest rank the current thread holds catches violations the first time a path executes, without needing concurrency, and ThreadSanitizer or lockdep in CI catches cross-path inversions. The failure mode you are defending against is not a careless engineer but a reasonable one who cannot see the other half of the cycle, which is why the check must be automatic."
      },
      {
        question: "Is acquiring all locks up front a good idea?",
        answer:
          "It prevents deadlock by breaking hold-and-wait, but it is usually the wrong trade and it is worth knowing why. The technique requires that a thread request every resource it will need in a single atomic step, blocking until all are available and holding none in the meantime. That immediately imposes three costs. You must know the full resource set in advance, which fails for any operation that discovers what it needs as it proceeds - a graph traversal, a cascading update, or anything driven by data read under the first lock. Utilisation drops, because resources are held for the entire operation rather than only for the portion that needs them, so a lock needed for the last five percent of the work is unavailable to everyone during the first ninety-five. And large requests starve: a thread needing five locks may repeatedly find that some subset is taken, while threads needing one or two make continual progress. There is also an implementation problem, since acquiring several locks atomically usually means acquiring a global lock first, which reintroduces a serialisation point. The technique earns its place in specific settings - static resource allocation in embedded or real-time systems where the set is genuinely known and utilisation matters less than guarantees, and in database systems that use conservative two-phase locking for particular workloads. For general application code, ordering is strictly better: it prevents the same deadlocks, allows resources to be acquired lazily as needed, and costs a comparison."
      },
      {
        question: "What is lock coarsening and when should I do it?",
        answer:
          "Lock coarsening replaces several fine-grained locks with one that covers all the state they protected. It eliminates ordering questions entirely, because with one lock there is no order, and it usually simplifies the code substantially since the invariants no longer have to be decomposed across lock boundaries. The obvious cost is concurrency: threads that could have operated on disjoint state now serialise. The reason coarsening is undervalued is that engineers reach for fine-grained locking prematurely, on paths that are not hot, and pay the complexity cost without measuring the benefit. If a lock is held for two hundred nanoseconds and contended by four threads a second, splitting it buys nothing measurable while introducing a lock-ordering problem, a harder review, and a class of bug that testing will not find. The reasonable sequence is to start with one lock per logically cohesive unit of state, measure contention - via lock profilers, or simply by observing wait times - and split only where the data shows a bottleneck. When you do split, prefer sharding over layering: partitioning a map into sixteen independently locked buckets gives concurrency without any thread ever needing two locks, whereas a hierarchy of container and entry locks requires ordering. Sharding is the shape that scales without introducing cycles, which is why concurrent hash maps are built that way rather than as a tree of nested locks."
      },
      {
        question: "Why is calling out to unknown code while holding a lock so dangerous?",
        answer:
          "Because a lock order is a global property of the program, and unknown code makes it unknowable at the call site. When your method holds its own lock and then invokes a callback, a listener, a virtual method, or an interface implementation supplied by someone else, that code may acquire any lock in the system, including one whose holder is currently blocked trying to acquire yours. Neither author can see the cycle: your module is locally consistent, theirs is locally consistent, and the inversion exists only in the composition. Worse, the callback may call back into your own object, which either self-deadlocks on a non-recursive lock or, with a reentrant lock, succeeds and observes state that is halfway through an update, violating the invariant the lock was protecting. The problem also appears in less obvious forms: logging while holding a lock invokes an appender that may lock, allocating memory may take an allocator lock, and calling a virtual method on a subclass you did not write is exactly the unknown-code case. The discipline is to make the critical section self-contained. Mutate state under the lock, copy out everything the external call needs - including a snapshot of the listener collection so it cannot be mutated during iteration - release the lock, and then make the call. This costs one allocation and removes your lock from every cycle it might otherwise have joined."
      },
      {
        question: "Can I prevent deadlock by making all locks reentrant?",
        answer:
          "No, and this is a common misconception because reentrancy does fix one specific failure. A reentrant lock lets a thread that already holds it acquire it again, incrementing a recursion count, which prevents self-deadlock when one method holding the lock calls another method that takes the same lock - a real and common pattern in object-oriented code where public methods are individually synchronised. That is the entire benefit. Reentrancy has no effect whatsoever on deadlocks involving two or more distinct locks, because the circular wait there is between different locks held by different threads, and no amount of recursion counting changes that. It also does not help with the nested monitor problem, where a thread waits on an inner condition variable while holding an outer lock, since waiting releases only the lock associated with the condition and the outer lock stays held. Reentrancy even carries a cost worth naming: because the second acquisition succeeds silently, a method can be entered recursively in a state that violates the class invariant - the outer call was midway through an update - and the resulting bug is subtle because the lock did exactly what it was asked to do. Some designs deliberately use non-reentrant locks so that accidental recursion fails loudly instead. The real prevention tools remain ordering, reducing the number of locks held simultaneously, and never calling out under a lock."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Goetz et al. - Java Concurrency in Practice, chapter 10 (Avoiding Liveness Hazards)",
        insight: "The best practical treatment of lock ordering, open calls, and why calling unknown code under a lock is the recurring source of production deadlocks."
      },
      {
        source: "note",
        attribution: "Linux kernel - Documentation/locking/lockdep-design.rst",
        insight: "Describes class-based lock-order validation, and why detecting an inconsistent edge beats waiting for the concurrent interleaving that would deadlock."
      },
      {
        source: "interview-experience",
        attribution: "Backend systems rounds at payment and trading firms",
        insight: "The ordered two-account transfer is asked repeatedly; strong answers volunteer the equal-id edge case and explain why a timeout would be a diagnostic rather than a fix."
      }
    ]
  },
  {
    id: "topic-os-bankers-algorithm",
    moduleId: "mod-os-deadlocks",
    title: "Deadlock Avoidance and the Banker's Algorithm",
    intuition:
      "Avoidance sits between prevention and detection: it allows the four conditions to hold structurally, but examines every individual resource request and refuses any grant that would move the system into an unsafe state. Safe means there exists at least one ordering in which all processes can finish, given what they still might claim. The banker's algorithm implements exactly this, named for a banker who will not lend so much that no customer can ever be fully funded. It is elegant, it is the standard textbook example, and it is essentially never used in production - and being able to say precisely why is what makes it worth studying.",
    complexity: {
      time:
        "The safety check is O(P^2 * R) for P processes and R resource types, since each of up to P iterations scans the remaining processes and compares R resource counts. It must run on every request, so a system with hundreds of threads and several resource types pays a substantial cost on every acquisition.",
      space:
        "O(P * R) for the four matrices: maximum claim, current allocation, outstanding need, and the available vector. The claim matrix must be declared up front, which is the requirement that makes the algorithm impractical rather than merely expensive."
    },
    lesson: [
      {
        title: "Safe, Unsafe, and Deadlocked Are Three Different States",
        content:
          "A state is safe if there is at least one sequence in which every process can obtain its maximum remaining need, run to completion, and release everything, with each process's need met from what is available plus what the earlier processes in the sequence release. A state is unsafe if no such sequence exists. Crucially, unsafe is not the same as deadlocked: an unsafe state has not deadlocked and might never, because processes may not actually request their declared maximum. Avoidance is therefore conservative by construction - it refuses requests that could lead to deadlock, not only those that will. This is the conceptual heart of the topic and the point interviewers probe, because candidates routinely conflate unsafe with deadlocked. The relationship is a strict containment: every deadlocked state is unsafe, every safe state is deadlock-free, and between them lies a band of unsafe-but-not-deadlocked states that avoidance refuses to enter and that the system might have survived.",
        diagram: asciiDiagram(`Three states, strictly nested

  ┌──────────────────── ALL STATES ─────────────────────────┐
  │                                                         │
  │   ┌──────────────── UNSAFE ─────────────────────────┐   │
  │   │  no completion sequence exists given the        │   │
  │   │  declared maximum claims                        │   │
  │   │                                                 │   │
  │   │      ┌────────── DEADLOCKED ──────────┐         │   │
  │   │      │ a circular wait EXISTS NOW     │         │   │
  │   │      │ nothing can proceed            │         │   │
  │   │      └────────────────────────────────┘         │   │
  │   │                                                 │   │
  │   │   ◀── the gap: unsafe but still running.        │   │
  │   │       May finish fine if processes do not       │   │
  │   │       actually claim their stated maximum.      │   │
  │   └─────────────────────────────────────────────────┘   │
  │                                                         │
  │   ┌──────────────── SAFE ───────────────────────────┐   │
  │   │  at least one sequence completes everyone       │   │
  │   │  ──▶ deadlock is IMPOSSIBLE from here           │   │
  │   └─────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────┘

  Avoidance keeps the system inside SAFE by refusing any grant
  that would step outside it.

  ▲ This is CONSERVATIVE: it also refuses states that would
    have been fine, because it must assume every process may
    demand its full declared maximum.`)
      },
      {
        title: "The Banker's Algorithm, Concretely",
        content:
          "The algorithm maintains four structures: Available, a vector of unallocated instances per resource type; Max, a matrix of each process's declared maximum claim; Allocation, what each process currently holds; and Need, which is Max minus Allocation. When a process requests resources, the algorithm performs three checks. First, the request must not exceed the declared need, or the process has violated its contract. Second, the request must not exceed what is available, or the process simply waits. Third and most importantly, the system pretends to grant the request and runs the safety check on the resulting hypothetical state; if that state is unsafe, the grant is rolled back and the process waits even though the resources were physically available. The safety check itself is a simulation: repeatedly look for any process whose entire remaining need can be met from Available, assume it runs to completion and releases everything it holds, add that to Available, and mark it finished. If every process can be finished this way, a safe sequence exists.",
        codeExample: `/* Banker's algorithm - the safety check is the whole idea. */

int available[R];          /* free instances per resource type */
int max_claim[P][R];       /* declared up front - the hard part */
int allocation[P][R];      /* currently held */
int need[P][R];            /* max_claim - allocation */

bool is_safe(void) {
    int work[R];
    bool finish[P] = { false };
    memcpy(work, available, sizeof work);

    for (int done = 0; done < P; ) {
        bool progressed = false;
        for (int p = 0; p < P; p++) {
            if (finish[p]) continue;
            /* Can p's ENTIRE remaining need be met right now? */
            bool ok = true;
            for (int r = 0; r < R; r++)
                if (need[p][r] > work[r]) { ok = false; break; }
            if (!ok) continue;

            /* Assume p runs to completion and releases everything. */
            for (int r = 0; r < R; r++) work[r] += allocation[p][r];
            finish[p] = true; progressed = true; done++;
        }
        if (!progressed) return false;   /* stuck ──▶ UNSAFE */
    }
    return true;                         /* a safe sequence exists */
}

int request(int p, int req[R]) {
    for (int r = 0; r < R; r++)
        if (req[r] > need[p][r])  return -EINVAL;   /* broke contract */
    for (int r = 0; r < R; r++)
        if (req[r] > available[r]) return -EAGAIN;  /* must wait */

    /* Tentatively grant, then test. */
    for (int r = 0; r < R; r++) {
        available[r]  -= req[r];
        allocation[p][r] += req[r];
        need[p][r]    -= req[r];
    }
    if (is_safe()) return 0;

    /* UNSAFE ──▶ roll back. The resources were AVAILABLE, and we
       still refuse, because granting could strand everyone. */
    for (int r = 0; r < R; r++) {
        available[r]  += req[r];
        allocation[p][r] -= req[r];
        need[p][r]    += req[r];
    }
    return -EAGAIN;
}`
      },
      {
        title: "Worked Example: Why a Grant Gets Refused",
        content:
          "Consider three processes and a single resource type with twelve instances. Process zero declares a maximum of ten and holds five, process one declares four and holds two, process two declares nine and holds two - so nine instances are allocated and three are available. This state is safe: process one needs only two more, which the three available cover, and when it finishes it releases four, giving seven available; process zero then needs five, which seven covers, and on completion releases ten, leaving twelve for process two. The sequence one, zero, two works. Now suppose process two requests one more instance. Granting it would leave two available, and no process could be completed: process one needs two, which exactly matches - so actually that grant remains safe. The instructive refusal is process zero requesting two more: available drops to one, process one still needs two, process two needs six, and nothing can finish, so the state is unsafe and the request is denied despite the instances being physically free. Walking through this arithmetic slowly is the standard exam question, and doing it accurately is worth more than reciting the pseudocode.",
        diagram: asciiDiagram(`One resource type, 12 instances. Who gets refused, and why?

  Process   Max   Allocated   Need
  ────────────────────────────────
    P0       10       5         5
    P1        4       2         2
    P2        9       2         7
  ────────────────────────────────
  allocated = 9        AVAILABLE = 3

  SAFETY CHECK: is there a completion sequence?
     work = 3
     P1 needs 2 <= 3  ──▶ run it ──▶ work = 3 + 2 = 5   ✓
     P0 needs 5 <= 5  ──▶ run it ──▶ work = 5 + 5 = 10  ✓
     P2 needs 7 <= 10 ──▶ run it ──▶ work = 10 + 2 = 12 ✓
     Safe sequence  ⟨P1, P0, P2⟩ ──▶ state is SAFE ✓

  NOW: P0 requests 2 more.
     Tentatively: P0 allocated 7, need 3, AVAILABLE = 1
     work = 1
        P0 needs 3 > 1   ✗
        P1 needs 2 > 1   ✗
        P2 needs 7 > 1   ✗
     nothing can run ──▶ UNSAFE ──▶ REQUEST REFUSED

  ▲ The 2 instances were PHYSICALLY AVAILABLE and the request was
    within P0's declared need. It is refused anyway, because after
    the grant no ordering completes everyone.

  ▲ Note: the system is NOT deadlocked in that hypothetical state -
    if P0 never actually asks for its last 3, everything finishes.
    Avoidance refuses possible futures, not observed failures.`)
      },
      {
        title: "Why Nobody Uses It",
        content:
          "The banker's algorithm fails in practice for reasons that are worth stating precisely, because the reasons illuminate what real systems do instead. First and fatally, it requires each process to declare its maximum resource claim in advance, and general-purpose programs do not know this - a request handler's memory and lock requirements depend on the request. Second, it assumes a fixed number of processes and resource instances, whereas real systems create threads dynamically and resources such as memory are elastic. Third, the safety check runs on every request at O(P^2 * R), which is prohibitive when P is thousands of threads and requests are millions per second. Fourth, it is conservative: it refuses grants that would have been perfectly fine, reducing utilisation for a guarantee most systems do not need. What real systems do instead is prevention where it is cheap - lock ordering - and detection with recovery where prevention is impossible, which is precisely the database approach: allow the deadlock, detect the cycle, abort a victim, and retry. The one place avoidance-like reasoning does appear is admission control, where a system refuses to start work it cannot guarantee resources for, which is the same idea applied at a much coarser granularity.",
        diagram: asciiDiagram(`Four reasons the banker's algorithm stays in textbooks

  1. MAXIMUM CLAIM MUST BE DECLARED UP FRONT
     ┌────────────────────────────────────────────────┐
     │ handle_request(req) {                          │
     │    // how many locks?  depends on req          │
     │    // how much memory? depends on the data     │
     │    // how many connections? depends on fanout  │
     │ }                                              │
     └────────────────────────────────────────────────┘
     ──▶ nobody can fill in the Max matrix. FATAL.

  2. FIXED P AND R
     real systems spawn threads dynamically, resize pools,
     and treat memory as elastic ──▶ the matrices are not static

  3. COST
     O(P² · R) per REQUEST.  P = 2000 threads, R = 6 types
     ──▶ ~24M comparisons on every lock acquisition ✗

  4. CONSERVATISM
     refuses states that would have completed fine
     ──▶ measurable utilisation loss for a guarantee most
         services do not need

  WHAT REAL SYSTEMS DO INSTEAD
  ┌──────────────────┬─────────────────────────────────────┐
  │ locks            │ PREVENTION: global ordering         │
  │ database txns    │ DETECTION: wait-for graph + abort   │
  │ memory           │ OVERCOMMIT + OOM killer (recovery)  │
  │ thread pools     │ ADMISSION CONTROL: bound the queue, │
  │                  │ reject rather than accept work you  │
  │                  │ cannot resource ◀── the ONE place   │
  │                  │ avoidance-style reasoning survives  │
  └──────────────────┴─────────────────────────────────────┘`)
      }
    ],
    examples: [
      {
        title: "A refused request that was physically satisfiable",
        input: "Twelve instances, three processes with needs 5, 2, and 7 and three available; P0 requests two.",
        output: "Refused - the resulting state has no completion sequence.",
        explanation:
          "Step 1: Granting leaves one instance available while the smallest outstanding need is two.\nStep 2: No process can be driven to completion, so no process will release anything.\nStep 3: The state is unsafe, though not yet deadlocked, since P0 might never claim its remaining need.\nStep 4: The algorithm refuses anyway, which illustrates that avoidance trades utilisation for a guarantee."
      },
      {
        title: "Unsafe but perfectly fine in practice",
        input: "A system enters an unsafe state because the safety check is disabled for performance.",
        output: "All processes complete normally; no deadlock ever occurs.",
        explanation:
          "Step 1: Safety is defined against declared maximum claims, which are upper bounds rather than predictions.\nStep 2: If processes release resources before ever reaching their maximum, the dangerous request is never made.\nStep 3: The unsafe state was therefore survivable, and the algorithm would have refused a grant unnecessarily.\nStep 4: This is the routine case, which is why detection-and-recovery beats avoidance for most workloads."
      },
      {
        title: "Where avoidance actually survives",
        input: "A service refuses new requests when its thread pool queue is full rather than accepting unboundedly.",
        output: "Admission control - avoidance reasoning at coarse granularity.",
        explanation:
          "Step 1: The system knows a bound on resources per request, even though it cannot know exact per-lock claims.\nStep 2: It refuses to admit work it cannot guarantee resources for, exactly as the banker refuses a loan.\nStep 3: The check is O(1) rather than O(P^2 * R), because the granularity is a whole request rather than each acquisition.\nStep 4: This is the practical descendant of the banker's algorithm, and naming it shows you understand why the original failed."
      }
    ],
    tips: [
      "Distinguish unsafe from deadlocked explicitly and early; conflating them is the single most common error on this topic.",
      "Be able to run the safety check by hand on a small table - the arithmetic walkthrough is the actual exam question, not the pseudocode.",
      "Volunteer why the algorithm is unused, and land on the maximum-claim requirement as the fatal one."
    ],
    tricks: [
      "The safety check is just repeated 'can anyone finish with what is free' - if you remember that sentence you can reconstruct the whole algorithm.",
      "A refused request in the banker's algorithm always looks unfair, because the resources really are available; that discomfort is the definition of conservatism.",
      "Admission control in a service is the banker's algorithm with one resource type and a granularity of whole requests."
    ],
    memoryAids: [
      "Safe, unsafe, deadlocked - three nested rings, and avoidance refuses to leave the innermost.",
      "The safety check is one sentence repeated: can anyone finish with what is free right now?",
      "The banker needs your maximum claim, and no real program knows its own."
    ],
    interviewPatterns: [
      "Mechanical: 'given this allocation table, is the state safe' - expect to produce the safe sequence.",
      "Judgement: 'would you use the banker's algorithm in a real system' - the expected answer is no, with the maximum-claim reason.",
      "Frequency and companies: Tier 2 in industry interviews, Tier 1 in academic and new-graduate operating systems screens."
    ],
    practiceProblems: [
      "Given Available = (3,3,2), and processes with Need rows (7,4,3), (1,2,2), (6,0,0), (0,1,1), (4,3,1) and Allocation rows (0,1,0), (2,0,0), (3,0,2), (2,1,1), (0,0,2), is the state safe? Answer: Yes. P1's need (1,2,2) fits in (3,3,2), so run it and Available becomes (5,3,2). P3's need (0,1,1) fits, giving (7,4,3). P4's need (4,3,1) fits, giving (7,4,5). P0's need (7,4,3) fits, giving (7,5,5). P2 finishes last. A safe sequence is P1, P3, P4, P0, P2.",
      "Explain why an unsafe state is not necessarily a deadlock. Answer: Safety is computed against declared maximum claims, which are upper bounds on future behaviour rather than predictions of it. A state is unsafe when no completion sequence exists assuming every process eventually demands its full maximum. If processes in fact release resources without reaching that maximum, the dangerous request never occurs and everything completes. Deadlock requires an actual circular wait to exist now; unsafe only means one could arise.",
      "Name the requirement that makes the banker's algorithm impractical and describe what replaced it. Answer: The advance declaration of each process's maximum resource claim, which general-purpose software cannot supply because requirements depend on runtime data. Real systems use prevention where it is cheap - global lock ordering - and detection with recovery where it is not, as databases do by maintaining a wait-for graph, detecting cycles, and aborting a victim transaction that the application then retries."
    ],
    faq: [
      {
        question: "What is the difference between deadlock prevention and deadlock avoidance?",
        answer:
          "Prevention makes deadlock structurally impossible by ensuring at least one of the four Coffman conditions can never hold, and it does so statically, as a property of how the code is written. Global lock ordering is the canonical example: because a thread holding a lock may only acquire higher-ordered locks, a circular wait cannot be constructed, and this requires no runtime state, no bookkeeping, and no decision-making at request time. Avoidance takes the opposite approach: it permits all four conditions to hold, so a deadlock is structurally possible, but it inspects every individual resource request at runtime and refuses any grant that would move the system into a state from which deadlock could later arise. That requires global knowledge - the current allocation, what is available, and crucially each process's maximum future claim - and it requires running a safety analysis on every request. The trade-offs are stark. Prevention is free at runtime but constrains how you write code, and sometimes the constraint is impossible to satisfy, as when the locks needed are discovered dynamically. Avoidance imposes no coding constraint but demands information the system usually does not have and computation it usually cannot afford. In practice prevention wins wherever it applies, which is most places, and detection with recovery fills the remainder; avoidance occupies a narrow middle ground that has largely been abandoned outside of specialised real-time and embedded systems where resource sets are genuinely static."
      },
      {
        question: "Why must processes declare their maximum claim in advance?",
        answer:
          "Because the safety check is a proof that a completion sequence exists no matter what the processes do next, and such a proof is impossible without an upper bound on future behaviour. The algorithm's core step asks whether some process's entire remaining need can be met from what is currently free; without a declared maximum, remaining need is unknown and unbounded, so the question has no answer and any process might turn out to require everything. With the declaration, need is defined as maximum minus current allocation, and the simulation can proceed. This is exactly the requirement that dooms the algorithm in practice. A general-purpose program does not know how many locks it will take, how much memory it will allocate, or how many connections it will open, because those depend on the data it is processing - a request handler's resource profile varies with the request. Declaring a very large maximum to be safe defeats the purpose, since the algorithm would then refuse almost every grant, and declaring too small a maximum is a contract violation that the algorithm treats as an error. The requirement is satisfiable only in systems where resource usage is statically known, such as fixed-function embedded software or hard real-time control loops with preallocated buffers - and those systems typically use static allocation with no dynamic requests at all, which makes the algorithm unnecessary as well as satisfiable."
      },
      {
        question: "How expensive is the safety check really?",
        answer:
          "The safety check is O(P squared times R) for P processes and R resource types, and the important part is that it must run on every resource request rather than periodically. The outer loop can iterate up to P times, because in the worst case only one process becomes completable per pass, and each iteration scans all remaining processes comparing R resource counts. For textbook figures - five processes and three resource types - this is trivial, perhaps seventy-five comparisons, which is why the algorithm looks affordable on paper. Scale it to a realistic server with two thousand threads and six resource types and a single check becomes roughly twenty-four million comparisons, on an acquisition path that may execute millions of times per second. That is many orders of magnitude more expensive than the operation it is guarding: an uncontended mutex acquisition is around twenty-five cycles. The cost is also serialised, since the check reads global allocation state and must therefore run under a global lock, which converts every resource acquisition in the system into a contended global operation and destroys scalability independently of the raw instruction count. Even with incremental optimisations that avoid recomputing from scratch, the fundamental problem remains that a global consistency check on a per-acquisition path cannot scale. This is the second-order reason nobody uses the algorithm; the first-order reason remains that the maximum claim matrix cannot be filled in."
      },
      {
        question: "Does anything in modern systems resemble the banker's algorithm?",
        answer:
          "Yes, at a much coarser granularity and under a different name: admission control. The pattern is that a system refuses to accept new work when it cannot guarantee the resources to complete work already in flight, which is structurally the banker's refusal to lend beyond what it can honour. A thread pool with a bounded queue that rejects submissions rather than queueing without limit is doing this, as is a service that returns 503 when concurrent requests exceed a threshold, and as is a connection pool that fails a checkout rather than blocking indefinitely. Real-time scheduling contains a purer form: SCHED_DEADLINE performs an explicit admission test, computing whether the total utilisation of the requested task set fits within the available capacity and refusing sched_setattr with EBUSY if it does not, which is exactly a safety check on a declared maximum claim - and it works precisely because real-time tasks genuinely can declare their runtime and period. Cluster schedulers such as Kubernetes do something similar with resource requests, refusing to place a pod on a node whose remaining allocatable capacity is insufficient. What all of these share, and what makes them practical where the banker's algorithm is not, is that the granularity is a whole unit of work with a declared resource envelope, so the check runs once per admission rather than once per acquisition, and the declaration is something the operator or the workload can genuinely supply."
      },
      {
        question: "If avoidance is impractical, how do databases handle deadlock?",
        answer:
          "By detection and recovery, which accepts deadlock as a normal occurrence and makes it cheap to resolve. The lock manager maintains a wait-for graph over transactions, adding an edge whenever a transaction blocks on a lock held by another. Cycle detection runs either periodically - Postgres waits for deadlock_timeout, typically one second, before checking, so brief legitimate waits are not disturbed - or eagerly when a wait begins, as InnoDB does. When a cycle is found the engine selects a victim, usually the transaction with the least work done or the fewest locks held, aborts it, rolls back its changes, and returns a deadlock error such as SQLSTATE 40P01 in Postgres or ER_LOCK_DEADLOCK in MySQL. This approach is viable in databases for a reason that does not generalise: the engine already implements full rollback for atomicity, so preempting a transaction's locks costs nothing new architecturally, which effectively means databases break the no-preemption condition rather than the circular wait one. The critical implication for application developers is that detection makes deadlock the caller's problem to retry. Any code issuing multi-statement transactions must catch the deadlock error and retry the whole transaction, ideally with randomised backoff, and must be written so that retry is safe. Reducing the frequency is still worthwhile - order updates by primary key, keep transactions short, and use a lower isolation level where correctness permits - but the retry path is mandatory, not optional, and omitting it is a common production defect."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Dijkstra - EWD108: Een algorithme ter voorkoming van de dodelijke omarming (1965), and Silberschatz chapter 8",
        insight: "The original formulation of safe states and the banker's analogy, plus the standard modern presentation with the four matrices."
      },
      {
        source: "note",
        attribution: "PostgreSQL documentation - deadlock_timeout and the deadlock detector",
        insight: "Shows the production alternative concretely: wait a fixed interval, build the wait-for graph, abort a victim, and require the client to retry."
      },
      {
        source: "note",
        attribution: "Linux kernel documentation - Documentation/scheduler/sched-deadline.rst, admission control section",
        insight: "The rare case where avoidance-style reasoning survives in a modern kernel, because real-time tasks can genuinely declare their maximum claim."
      }
    ]
  },
  {
    id: "topic-os-deadlock-detection-and-recovery",
    moduleId: "mod-os-deadlocks",
    title: "Deadlock Detection and Recovery in Practice",
    intuition:
      "Detection accepts that deadlock will happen and invests in noticing it and undoing it, which is the right trade whenever prevention is impossible and the cost of an occasional abort is low. Databases live here: they cannot order locks because the order is chosen by application SQL they do not control, but they already have rollback machinery for atomicity, so preempting a transaction costs almost nothing extra. Operating systems mostly do not live here - Linux does not track user-space lock ownership at all - which is why application-level deadlock manifests as an unexplained hang and why your diagnostic toolkit is thread dumps and watchdogs rather than a kernel facility.",
    complexity: {
      time:
        "Wait-for graph cycle detection is O(V + E) by depth-first search, where V is the number of transactions or threads and E the number of blocking edges. Running it on every blocking wait costs more in aggregate but detects immediately; running it on a timer amortises the cost at the price of a detection delay equal to the timer period.",
      space:
        "O(V + E) for the graph. Databases keep this in the lock manager alongside state they already maintain, so the marginal cost is small. Recovery additionally requires undo information, which transactional systems have and ordinary mutex-based code does not - that asymmetry is the entire reason detection is viable in one and not the other."
    },
    lesson: [
      {
        title: "Building and Checking the Wait-For Graph",
        content:
          "A wait-for graph has one node per transaction or thread and an edge from A to B whenever A is blocked waiting for a resource that B holds. It is the resource allocation graph with the resource nodes collapsed, valid when each resource has a single holder, which is true of exclusive locks. A cycle in this graph is exactly a deadlock, so detection is an ordinary depth-first search. The interesting engineering choice is when to run it. Eager detection checks on every blocking wait, so a deadlock is caught the moment it forms, at the cost of running the search on a hot path - InnoDB does this and has a fallback limit on search depth to bound the cost. Lazy detection runs on a timer, so the check is cheap in aggregate but transactions sit blocked for up to one period before anything happens; PostgreSQL waits deadlock_timeout, one second by default, before checking at all, on the reasoning that most waits are legitimate and short, so running the detector immediately would waste work on waits that were about to resolve.",
        diagram: asciiDiagram(`Wait-for graph: collapse the resources, look for a cycle

  Resource allocation graph            Wait-for graph
  ─────────────────────────            ──────────────
   T1 ──wants──▶ [row 7]                    T1
                    │                      ▲  │
                 held by                   │  │ waits for
                    ▼                      │  ▼
                   T2                      │  T2
   T2 ──wants──▶ [row 3]                   │  │
                    │                      │  │ waits for
                 held by                   │  ▼
                    ▼                      └─ T3
                   T3                    (T3 waits for T1)
   T3 ──wants──▶ [row 7] held by T1

   ──▶ CYCLE T1 ▶ T2 ▶ T3 ▶ T1 = DEADLOCK

  WHEN to run the search:
  ┌─────────────┬──────────────────────┬─────────────────────┐
  │ EAGER       │ check on every       │ instant detection,  │
  │ (InnoDB)    │ blocking wait        │ hot-path cost, so   │
  │             │                      │ depth is capped     │
  ├─────────────┼──────────────────────┼─────────────────────┤
  │ LAZY        │ wait deadlock_timeout│ cheap; victims sit  │
  │ (Postgres)  │ (default 1s) then    │ blocked up to one   │
  │             │ check                │ period first        │
  └─────────────┴──────────────────────┴─────────────────────┘
  Rationale for lazy: nearly every wait is legitimate and short,
  so checking immediately burns CPU on waits about to resolve.`)
      },
      {
        title: "Choosing and Killing a Victim",
        content:
          "Once a cycle is found, something in it must be preempted, and the choice is a cost minimisation with a fairness constraint. Sensible criteria include the amount of work already done, so aborting the youngest transaction wastes least; the number of locks held, since releasing more breaks more waits; whether the transaction has already written, because a read-only participant is cheaper to restart; and how many times this transaction has already been chosen, which prevents perpetual victimisation of one unlucky transaction - a real starvation risk if the policy is purely cost-based. InnoDB picks the transaction that has modified the fewest rows; PostgreSQL aborts the transaction that detected the cycle, which is simpler and biases toward the newest waiter. After the abort, rollback restores the victim's changes and releases its locks, the cycle dissolves, and the surviving transactions proceed. The application then receives an error and must decide whether to retry, which is where most production bugs on this topic actually live.",
        codeExample: `-- Detection means YOUR CODE must handle the abort.

-- Postgres raises SQLSTATE 40P01 (deadlock_detected)
-- MySQL/InnoDB raises error 1213 (ER_LOCK_DEADLOCK)

-- Reduce the FREQUENCY: order writes by primary key.
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = LEAST(1, 2);
  UPDATE accounts SET balance = balance + 100 WHERE id = GREATEST(1, 2);
COMMIT;
-- ──▶ every transaction now touches the lower id first.

-- Handle the abort: retry is MANDATORY, not optional.
-- Java, with randomised backoff:
for (int attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
        conn.setAutoCommit(false);
        doTransfer(conn, from, to, amount);   // idempotent by design
        conn.commit();
        return;
    } catch (SQLException e) {
        conn.rollback();
        boolean deadlock = "40P01".equals(e.getSQLState())    // PG
                        || e.getErrorCode() == 1213;          // MySQL
        if (!deadlock || attempt == MAX_RETRIES - 1) throw e;
        // randomise, or both victims retry in lockstep and collide
        Thread.sleep(ThreadLocalRandom.current()
                        .nextInt(10 << attempt));
    }
}

-- Inspect what happened:
--   Postgres: the server log records both statements and the cycle
--   MySQL:    SHOW ENGINE INNODB STATUS \\G   ──▶ LATEST DETECTED
--             DEADLOCK section names both transactions and locks

/* The commonest production defect here is not the deadlock - it is
   the missing retry. Detection guarantees an abort will happen;
   code that cannot survive an abort is simply incorrect. */`
      },
      {
        title: "Detection Outside Databases: Timeouts and Watchdogs",
        content:
          "Application code that uses mutexes has no lock manager, so there is no graph to search and no rollback to perform. Detection therefore degrades to noticing that something has stopped. The practical mechanisms are a timed lock acquisition that logs and dumps threads when it expires, a watchdog thread that periodically checks whether each worker has made progress since the last tick, and external observation - a health endpoint that stops responding, a queue depth that only grows, or a thread pool whose active count is pinned at maximum with zero completions. When a hang is suspected, a thread dump is decisive: the JVM reports Java-level deadlocks with the full cycle, and for native code gdb with thread apply all bt shows every thread's stack, where a cluster parked in pthread_mutex_lock with a consistent owner chain is the signature. Recovery in this world usually means restarting the process, because there is no undo log and no safe way to take a mutex away from a thread that may have left shared state half-updated - which is precisely why prevention matters so much more here than in a database.",
        diagram: asciiDiagram(`Detecting an application deadlock without a lock manager

  Symptom                          What it means
  ─────────────────────────────────────────────────────────────
  CPU ≈ 0%, requests time out  ──▶ threads BLOCKED (deadlock or
                                   pool exhaustion), not spinning
  CPU ≈ 100%, no throughput    ──▶ LIVELOCK, not deadlock
  queue depth grows monotonically ▶ consumers stalled
  pool active == max, completions 0 ▶ pool deadlock

  Decision path
  ─────────────
   service unresponsive
        │
        ├── take a thread dump
        │      jstack <pid>          (JVM: reports the cycle directly)
        │      gdb -p <pid>          then "thread apply all bt"
        │      go: SIGQUIT           dumps all goroutines
        │
        ├── many threads in lock acquisition?
        │      ├── owner chain forms a CYCLE ──▶ DEADLOCK
        │      │      fix: lock ordering (prevention)
        │      └── all waiting on ONE owner ──▶ convoy, not deadlock
        │             fix: shrink the critical section
        │
        └── threads parked in Future.get / pool checkout?
               ──▶ POOL EXHAUSTION deadlock
                   fix: separate pools, or never block on a task
                        submitted to your own pool

  Recovery options, application vs database
  ┌────────────┬───────────────────┬──────────────────────────┐
  │            │ database          │ mutex-based application  │
  ├────────────┼───────────────────┼──────────────────────────┤
  │ undo log   │ YES               │ NO                       │
  │ preempt?   │ abort + rollback  │ IMPOSSIBLE safely        │
  │ recovery   │ retry the txn     │ RESTART THE PROCESS      │
  └────────────┴───────────────────┴──────────────────────────┘
  ──▶ that asymmetry is why prevention is non-negotiable in
      application code and optional in a database.`)
      },
      {
        title: "Distributed Deadlock and Why It Is Harder",
        content:
          "In a distributed system the wait-for graph is spread across nodes, so no single participant can see a cycle, and constructing a global view requires either a coordinator that collects edges or an algorithm that passes probes along wait edges - the Chandy-Misra-Haas scheme sends a probe message down each wait edge and declares deadlock if a node receives its own probe back. Both approaches suffer from the same fundamental problem: the graph is observed asynchronously, so by the time edges from different nodes are assembled the situation may have changed, producing phantom deadlocks in which a cycle is reported for a state that no longer exists. Aborting a victim for a phantom is wasteful but safe; missing a real deadlock is worse. Because of this, most distributed systems avoid detection entirely and use timeouts plus retry, or eliminate the problem structurally by ordering resource acquisition globally, by acquiring all locks at one coordinator, or by using optimistic concurrency where conflicts are detected at commit rather than prevented by locking.",
        codeExample: `/* Distributed deadlock: nobody can see the whole cycle. */

//  Node A            Node B            Node C
//   T1 holds X        T2 holds Y        T3 holds Z
//   T1 wants Y ──────▶ T2 wants Z ─────▶ T3 wants X ──┐
//   ▲                                                  │
//   └──────────────────────────────────────────────────┘
//   Each node sees ONE edge. The cycle exists only globally.

/* Chandy-Misra-Haas edge chasing: send a probe along wait edges. */
struct probe { int initiator, sender, receiver; };

void on_blocked(int me, int holder) {
    send(holder, (struct probe){ .initiator = me,
                                 .sender = me, .receiver = holder });
}
void on_probe(int me, struct probe p) {
    if (p.initiator == me) {
        declare_deadlock();          /* probe returned ──▶ cycle */
        return;
    }
    if (blocked(me))                 /* forward along MY wait edge */
        send(my_holder, (struct probe){ p.initiator, me, my_holder });
}

/* The PHANTOM problem:
     edges are observed at different times on different nodes.
     By the time the probe completes, T2 may have committed and
     released Y ──▶ the reported cycle no longer exists ──▶ a
     victim is aborted for nothing. Safe, but wasteful.        */

/* What real distributed systems do instead: */
//  1. TIMEOUT + RETRY with randomised backoff  (simplest, common)
//  2. GLOBAL LOCK ORDERING across nodes        (prevention)
//  3. SINGLE COORDINATOR holds all locks       (no distribution)
//  4. OPTIMISTIC CONCURRENCY - no locks; detect write conflicts
//     at commit and retry  (Spanner, CockroachDB, most MVCC stores)`
      }
    ],
    examples: [
      {
        title: "A deadlock error with no retry path",
        input: "A payments service receives SQLSTATE 40P01 roughly ten times a day and surfaces it as a 500.",
        output: "Customer-visible failures for a condition the database expected the client to retry.",
        explanation:
          "Step 1: The engine detected a cycle and aborted one transaction, rolling back its changes cleanly.\nStep 2: The abort is a normal, expected outcome of detection-based deadlock handling, not a system fault.\nStep 3: The application had no retry logic, so a recoverable event became a user-facing error.\nStep 4: Adding a bounded retry with randomised backoff, plus ordering the updates by primary key to reduce frequency, eliminated the failures."
      },
      {
        title: "Distinguishing a convoy from a deadlock",
        input: "A thread dump shows forty threads blocked on the same mutex, CPU near zero.",
        output: "Not a deadlock - a lock convoy behind one slow holder.",
        explanation:
          "Step 1: A deadlock requires a cycle in the owner-waiter relation; here all forty wait on a single owner.\nStep 2: That owner is itself runnable, typically performing I/O or a long computation inside the critical section.\nStep 3: The system will recover on its own once the holder finishes, so it is a throughput problem rather than a hang.\nStep 4: The fix is to shrink the critical section - move the slow operation outside the lock - rather than to change lock ordering."
      },
      {
        title: "A phantom distributed deadlock",
        input: "An edge-chasing detector reports a three-node cycle and aborts a transaction.",
        output: "The cycle had already dissolved before the probe completed.",
        explanation:
          "Step 1: Each node contributed its wait edge at a different instant, so the assembled graph reflects no single point in time.\nStep 2: One transaction committed and released its lock while the probe was still propagating.\nStep 3: The reported cycle therefore described a state that no longer existed - a phantom.\nStep 4: Aborting is safe but wasteful, which is why most distributed systems prefer timeouts or optimistic concurrency over global detection."
      }
    ],
    tips: [
      "Say that detection is viable in databases specifically because rollback already exists, and infeasible for mutexes because there is no undo log.",
      "When asked how you would find a production deadlock, lead with the thread dump and the owner-waiter cycle, not with theory.",
      "Distinguish deadlock from a convoy and from livelock using the CPU signature - zero CPU with a cycle, zero CPU without a cycle, and full CPU with no progress."
    ],
    tricks: [
      "PostgreSQL's one-second deadlock_timeout exists because almost every lock wait is legitimate; detecting eagerly would burn CPU on waits that were about to clear.",
      "A retry loop for database deadlocks must randomise its backoff, or both victims of a repeated conflict retry in lockstep and collide again.",
      "If the wait-for graph has no cycle but everything is blocked, look for a bounded pool - the resource may be a thread or a connection rather than a lock."
    ],
    memoryAids: [
      "Detection needs an undo log - that is why databases can preempt and mutexes cannot.",
      "Wait-for graph is the allocation graph with the resources collapsed away; a cycle there is the whole diagnosis.",
      "The abort is the database's half of the deal; the retry is yours."
    ],
    interviewPatterns: [
      "Applied diagnosis: 'the service is hung, walk me through what you do' - thread dump, cycle, then classify deadlock versus convoy versus pool exhaustion.",
      "Database probe: 'what happens when two transactions deadlock' - detection, victim selection, abort, and the client's obligation to retry.",
      "Frequency and companies: Tier 1 for backend roles with database ownership at Amazon, Stripe, Shopify, and any payments or ledger team."
    ],
    practiceProblems: [
      "Why can a database preempt a lock while an operating system cannot preempt a mutex? Answer: The database maintains an undo log for atomicity, so it can roll a transaction back to a consistent state and safely release its locks. A mutex has no undo information, and its holder may have left the protected data structure half-updated, so forcibly taking the lock would expose corrupted state. Preemption requires the ability to restore consistency, which transactional systems have and general application code does not.",
      "You see forty threads blocked on one mutex with near-zero CPU. Deadlock or not, and how do you tell? Answer: Not a deadlock unless the owner-waiter relation contains a cycle. Here all forty wait on one owner; if that owner is runnable and progressing, this is a convoy caused by a slow critical section, and it resolves itself. Confirm by checking the owner's stack - if it is doing I/O or a long computation under the lock, shrink the critical section. It is a deadlock only if following the owner chain returns to a thread already in the chain.",
      "Design a retry policy for database deadlock errors. Answer: Catch the specific deadlock SQLSTATE or error code, roll back, and retry the whole transaction rather than the failing statement, since the abort discarded all of it. Bound the attempts, typically three to five, and use exponential backoff with randomisation so two mutual victims do not collide again in lockstep. Ensure the transaction is safe to re-execute, which usually means it is idempotent or keyed by a client-supplied request id. Log the retry rate as a metric, because a rising rate signals a lock-ordering problem worth fixing at the source."
    ],
    faq: [
      {
        question: "Why does PostgreSQL wait a full second before even checking for deadlock?",
        answer:
          "Because the overwhelming majority of lock waits are legitimate and short, and running a graph search on every one of them would spend real CPU on situations that were about to resolve themselves. A transaction waiting two milliseconds for another to commit is normal behaviour under any concurrency, not a pathology, and there may be thousands of such waits per second on a busy server. PostgreSQL therefore treats deadlock as a rare event and pays detection cost only when a wait has already lasted long enough to be suspicious - deadlock_timeout, one second by default. When that timer fires, the waiting backend builds the wait-for graph and searches for a cycle; if none exists it simply continues waiting. The trade-off is a detection delay: a genuine deadlock stalls its participants for up to a second before anyone notices, which is acceptable because deadlocks are rare and the alternative is a permanent hang. The setting is tunable, and lowering it makes sense for latency-sensitive workloads where a one-second stall is unacceptable, at the cost of more frequent detector runs. InnoDB takes the opposite position, checking eagerly on each blocking wait so detection is immediate, and bounds the cost by capping the search depth and falling back to a heuristic if the graph is too large. Neither choice is wrong; they reflect different assumptions about how expensive a stall is relative to how expensive a check is."
      },
      {
        question: "How does a database choose which transaction to abort?",
        answer:
          "By minimising the cost of the abort, subject to not starving any particular transaction. The natural cost measures are how much work the transaction has already performed, how many rows it has modified, how many locks it holds, and how long it has been running, since aborting a transaction that has written ten thousand rows wastes far more than aborting one that has written three. InnoDB explicitly selects the transaction that has modified the fewest rows, treating undo log size as its proxy for work done. PostgreSQL is simpler: the backend that ran the detector - that is, the one whose wait triggered the check - aborts itself, which biases toward the most recent waiter and avoids the complexity of coordinating an abort of another backend. A pure cost-based policy has a starvation hazard, because a long-running transaction that repeatedly loses will be aborted, restarted, and aborted again, making no progress while shorter transactions succeed; systems guard against this by tracking how many times a transaction has been victimised and preferring not to choose it again, which is the same reasoning behind aging in CPU scheduling. From the application's perspective the choice does not matter much - what matters is that some transaction receives an error and must retry, and that the retry is written to be safe."
      },
      {
        question: "Should application code use lock timeouts as a deadlock recovery mechanism?",
        answer:
          "As a diagnostic and a last line of defence, yes; as a design, no. A timed lock acquisition converts an indefinite hang into a bounded failure that can be logged with a full thread dump, alerted on, and possibly recovered from, which is genuinely valuable because a silent hang is among the hardest production failures to diagnose. What a timeout does not do is make the code correct. The deadlock still occurs, work is still lost, and the timeout value is a guess that trades false positives - legitimate waits under load exceeding the threshold and being aborted - against slow detection. It also leaves the codebase with an error path that is exercised only during the failure it was meant to handle, so it is rarely tested and often wrong. There is a deeper problem specific to mutexes: when a timeout fires, the thread has typically already acquired some locks and performed partial mutations, and unlike a database there is no undo log, so unwinding safely requires manual compensation that is easy to get wrong. That is why the honest position is that a firing timeout is evidence of a design bug. Use it to find the bug, then fix the bug structurally with lock ordering or by eliminating the second lock, and keep the timeout afterwards as a watchdog rather than as the mechanism you rely on."
      },
      {
        question: "What is a lock convoy and how is it different from a deadlock?",
        answer:
          "A convoy is a queue of threads all waiting for the same lock behind a holder that is slow, and it is a throughput problem rather than a liveness failure. The distinguishing property is that the owner-waiter relation contains no cycle: every waiter is blocked on one owner, and that owner is runnable and will eventually finish, at which point the queue drains. A deadlock, by contrast, has a cycle, and no participant can ever proceed without intervention. The symptoms can look similar in a monitoring dashboard - low CPU, rising latency, requests timing out - which is why the thread dump matters: follow the owner chain and see whether it terminates at a runnable thread or returns to a thread already in the chain. Convoys typically arise when a critical section contains something slow that does not belong there, such as an I/O operation, a network call, a log write that blocks on a full appender queue, or a memory allocation that triggers a garbage collection. They can also be self-sustaining, because once a queue forms, each release hands the lock to a waiter that must be scheduled in, adding a context switch per handoff and keeping the queue occupied even after the original slow operation ends. The fix is to shrink the critical section - copy what you need, release, then do the slow work - or to shard the lock so that unrelated operations stop queueing behind each other."
      },
      {
        question: "How do distributed systems handle deadlock?",
        answer:
          "Mostly by not detecting it. Global detection requires assembling a wait-for graph whose edges live on different nodes and are observed at different instants, so any cycle you find describes a state that may already be obsolete - the phantom deadlock problem. Edge-chasing algorithms such as Chandy-Misra-Haas reduce the coordination cost by sending a probe along each wait edge and declaring deadlock when a node receives its own probe back, but they do not eliminate phantoms, and they add message traffic proportional to the depth of the wait chain. Aborting a victim for a phantom is safe but wasteful, and the machinery is complex enough that most systems choose differently. The common approaches in practice are timeouts with randomised retry, which is crude but robust and requires no global state; global resource ordering, so that distributed transactions acquire locks in a consistent order across nodes and cycles cannot form; centralising the lock manager, which removes distribution from the problem at the cost of a bottleneck and a single point of failure; and optimistic concurrency control, where transactions take no locks at all, read a consistent snapshot, and detect write conflicts at commit time, retrying on failure. The last is what most modern distributed databases do - Spanner, CockroachDB, and MVCC-based systems generally - because it converts a distributed liveness problem into a local commit-time check, which is far easier to reason about and to operate."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Chandy, Misra, Haas - Distributed Deadlock Detection (ACM TOCS, 1983)",
        insight: "The edge-chasing probe algorithm and an honest account of why asynchronous observation produces phantom deadlocks."
      },
      {
        source: "note",
        attribution: "MySQL reference manual - InnoDB deadlock detection and SHOW ENGINE INNODB STATUS",
        insight: "Documents eager detection, the fewest-rows-modified victim policy, and the diagnostic output that names both transactions and their locks."
      },
      {
        source: "interview-experience",
        attribution: "Production incident reviews across payments and ledger teams",
        insight: "The recurring root cause is not the deadlock but the missing retry: detection guarantees an abort, and code that cannot survive an abort is incorrect regardless of lock ordering."
      }
    ]
  },
  {
    id: "topic-os-livelock-starvation-priority-inversion",
    moduleId: "mod-os-deadlocks",
    title: "Livelock, Starvation, and Priority Inversion",
    intuition:
      "Deadlock is the famous liveness failure but not the most common one, and the others are harder to diagnose precisely because the system looks healthy. Livelock has threads executing constantly and accomplishing nothing, so CPU is at 100% and throughput is zero. Starvation has the system as a whole making progress while one participant never does, so aggregate metrics look fine and one customer times out. Priority inversion has a high-priority task blocked behind a low-priority one that cannot run, which is the failure that nearly ended the Mars Pathfinder mission. All three are consequences of scheduling and lock policy rather than of cycles, which is why cycle-based detection misses them entirely.",
    complexity: {
      time:
        "Priority inheritance adds a bounded cost to lock acquisition and release: on contention the kernel must boost the holder and later restore its priority, which is a handful of microseconds and, importantly, bounds the inversion to the length of the critical section rather than to the arrival pattern of medium-priority work.",
      space:
        "Priority inheritance requires the lock to store its owner and the owner's original priority, a few words per mutex. Fair locks such as ticket or queue locks need a node per waiter, which is why they cost more memory traffic than a plain test-and-set lock but bound waiting to N-1 predecessors."
    },
    lesson: [
      {
        title: "Livelock: Busy and Going Nowhere",
        content:
          "Livelock occurs when threads keep changing state in response to each other without any of them making progress. It is the standard failure mode of naive deadlock avoidance: two threads each grab their first lock, discover the second is taken, politely release and retry, and if their timing is symmetric they collide again on every attempt, forever. Unlike deadlock, the threads are runnable and consuming CPU, so monitoring shows a busy process rather than a hung one, and a thread dump shows threads in different places on each sample rather than parked at a lock. The general cure is to break the symmetry, almost always with randomised backoff, ideally growing exponentially so that repeated collisions spread the retries further apart. Livelock also appears in forms that have nothing to do with locks: a retry storm where every client retries a failing service simultaneously and keeps it saturated, two components each undoing the other's work, or an interrupt livelock where a machine under heavy network load spends all its time in interrupt handlers and never runs the code that would drain the packets.",
        codeExample: `/* Livelock: politeness without randomisation. */

// BROKEN - both threads back off by the SAME amount, forever.
while (1) {
    lock(&a);
    if (trylock(&b) == 0) break;
    unlock(&a);
    usleep(1000);              /* fixed 1 ms ──▶ they re-collide */
}

// FIXED - randomised exponential backoff breaks the symmetry.
for (int attempt = 0; ; attempt++) {
    lock(&a);
    if (trylock(&b) == 0) break;
    unlock(&a);
    int cap = attempt < 10 ? attempt : 10;
    usleep((rand() % (1000 << cap)) + 1);
}

/* Livelock without any locks at all: */

// 1. RETRY STORM - every client retries at the same instant,
//    keeping the service saturated so every retry also fails.
//    Fix: exponential backoff + jitter + a circuit breaker.

// 2. INTERRUPT LIVELOCK - under heavy packet load the machine
//    spends 100% of its time in the NIC interrupt handler and
//    never runs the softirq that drains the queue.
//    Fix: NAPI - disable the interrupt and switch to polling
//         once the rate crosses a threshold.

// 3. MUTUAL UNDO - two controllers each "correcting" the other's
//    state, e.g. two config reconcilers with different desired
//    states, flipping a resource back and forth forever.

/* SIGNATURE, and how to tell the three apart:
     deadlock    CPU ~0%,   threads parked at lock acquisition
     livelock    CPU ~100%, threads MOVE between dump samples
     starvation  CPU normal, aggregate throughput FINE, one
                 participant's wait time unbounded              */`
      },
      {
        title: "Starvation: The Failure That Hides in Averages",
        content:
          "Starvation is a specific participant being indefinitely denied a resource that others keep obtaining. The system makes progress, so throughput, CPU utilisation, and error rates all look normal, and the only signal is in per-participant latency - which is exactly why starvation is usually discovered by a customer rather than by monitoring. The causes are all policy choices. An unfair lock, such as a plain test-and-set spinlock, hands the lock to whichever thread happens to win the race, and an unlucky thread can lose indefinitely; ticket locks and queue locks bound this to N-1 predecessors by serving in arrival order. A reader-preferring reader-writer lock starves writers whenever the read rate is high enough that active readers never reach zero. Priority scheduling starves low-priority work whenever higher-priority work is always available, which is why aging - gradually raising the priority of waiting tasks - is the standard remedy. In each case the fix is to add a fairness mechanism that bounds waiting, and the cost is throughput, because fairness means sometimes serving a request that arrived earlier rather than the one that is cheapest to serve now.",
        diagram: asciiDiagram(`Starvation is invisible in aggregate metrics

  Dashboard view                    Per-participant view
  ──────────────                    ────────────────────
  throughput   12,000 rps  ✓         P1  p99 =    8 ms  ✓
  CPU               62%    ✓         P2  p99 =    9 ms  ✓
  error rate       0.01%   ✓         P3  p99 =    7 ms  ✓
  ──▶ "everything is fine"           P4  p99 = 45,000 ms ✗
                                          ▲
                                          └── STARVED
                                              never appears in
                                              an average of 12k

  Three mechanisms, three fixes
  ┌──────────────────────┬──────────────────────────────────┐
  │ unfair lock          │ ticket / queue lock              │
  │  test-and-set: the   │  take a number, served in        │
  │  winner is arbitrary │  arrival order ──▶ bound N-1     │
  ├──────────────────────┼──────────────────────────────────┤
  │ reader-preferring    │ writer-preferring or task-fair   │
  │  rwlock: writers     │  close the gate to new readers   │
  │  never see 0 readers │  once a writer queues            │
  ├──────────────────────┼──────────────────────────────────┤
  │ strict priority      │ AGING: raise a waiter's priority │
  │  scheduling: low     │  the longer it waits, until it   │
  │  priority never runs │  eventually outranks the flood   │
  └──────────────────────┴──────────────────────────────────┘

  How to SEE it - measure waits, not throughput:
     /proc/<pid>/sched  ──▶ wait_max  (longest runnable-but-not-run)
     age of the oldest queued item, not the average queue depth
     p99.9 per tenant / per key, not p99 overall`)
      },
      {
        title: "Priority Inversion and the Pathfinder Bug",
        content:
          "Priority inversion occurs when a high-priority task is blocked on a resource held by a low-priority task. That much is unavoidable and bounded - the high-priority task waits for one critical section. The dangerous form is unbounded priority inversion, where a medium-priority task that needs no lock at all preempts the low-priority holder, so the holder cannot run, cannot release, and the high-priority task waits for as long as medium-priority work keeps arriving. This is precisely what happened on Mars Pathfinder in 1997: a high-priority bus management task blocked on a mutex held by a low-priority meteorological task, a medium-priority communications task preempted the holder, the watchdog observed the bus task missing its deadline, and the spacecraft reset repeatedly. The fix, uploaded to Mars, was to enable priority inheritance on that mutex. Priority inheritance works by temporarily raising the holder's priority to that of the highest-priority waiter, so the holder can no longer be preempted by medium-priority work and the inversion is bounded by the critical section length. The alternative, priority ceiling, raises the holder to a statically computed ceiling on acquisition, which avoids the dynamic bookkeeping and can prevent deadlock as well.",
        diagram: asciiDiagram(`Unbounded priority inversion - the Pathfinder failure

  Priority:  H (high, bus mgmt)  M (medium, comms)  L (low, weather)

  Time ──────────────────────────────────────────────────────▶
   L   ████ acquires mutex ██▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒██ releases
                             ▲ PREEMPTED by M        ▲
   M                         ████████████████████████
                             (needs NO lock, just runs)
   H          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ BLOCKED
              ▲ tries to take the mutex
              └── waits for L ... which waits for M ... which
                  has no bound. H misses its deadline ──▶ the
                  watchdog resets the spacecraft. Repeatedly.

  ──▶ H is effectively running at L's priority. The whole
      priority scheme has been inverted by a task that is not
      even involved in the lock.

  WITH PRIORITY INHERITANCE
   L   ████ acquires ████████████ releases          (boosted to H)
                     ▲ H blocks ──▶ kernel raises L to H
   M                                ████████        (must wait: L
                                                     now outranks it)
   H          ░░░░░░░░░░░░░░░░░░░░█████████         bounded wait
                                  ▲ acquires
  ──▶ inversion is now bounded by the CRITICAL SECTION length,
      not by how much medium-priority work arrives.

  Two protocols:
    INHERITANCE  boost dynamically to the highest waiter's priority
                 ──▶ pays only on contention; PTHREAD_PRIO_INHERIT
    CEILING      boost on acquisition to a STATIC per-lock ceiling
                 ──▶ no waiter tracking, and prevents deadlock too,
                     but the ceiling must be computed in advance`)
      },
      {
        title: "Diagnosing Which One You Have",
        content:
          "The three failures have distinct signatures and the fastest route to the right fix is classifying correctly. Deadlock shows near-zero CPU with threads parked at lock acquisitions and an owner chain that forms a cycle; the fix is lock ordering. Livelock shows high CPU with no throughput and threads that appear in different places on successive thread dumps; the fix is randomised backoff or breaking whatever symmetry the threads share. Starvation shows normal aggregate metrics with an unbounded wait for one participant, visible only in per-participant latency or in fields such as wait_max in /proc/<pid>/sched; the fix is a fairness mechanism - a ticket lock, a task-fair reader-writer lock, or aging. Priority inversion shows a high-priority task missing deadlines while lower-priority work runs, and it is confirmed by observing that the high-priority task is blocked on a lock whose holder is not scheduled; the fix is to enable priority inheritance on that mutex. The practical lesson is that monitoring must include per-participant wait times, because three of these four are invisible in throughput averages.",
        diagram: asciiDiagram(`Classify first, then fix

                    system not delivering
                            │
              ┌─────────────┴──────────────┐
              ▼                            ▼
         CPU ≈ 0%                     CPU ≈ 100%
              │                            │
   ┌──────────┴──────────┐         threads MOVE between
   ▼                     ▼         successive dumps?
 owner chain          all waiting        │
 forms a CYCLE        on ONE owner   ┌───┴────┐
   │                     │           ▼        ▼
   ▼                     ▼          yes      no
 DEADLOCK             CONVOY          │        │
 fix: lock            fix: shrink     ▼        ▼
 ordering             the critical  LIVELOCK  genuine
                      section       fix:      CPU-bound
                                    randomise work
                                    backoff

         aggregate metrics look NORMAL?
                     │
                     ▼
         check PER-PARTICIPANT wait time
           wait_max in /proc/<pid>/sched
           age of oldest queued item
           p99.9 per tenant, not p99 overall
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
   one participant's      a HIGH-priority task
   wait is unbounded      waits while LOWER
          │               priority work runs
          ▼                      │
     STARVATION                  ▼
     fix: ticket lock,   PRIORITY INVERSION
     task-fair rwlock,   fix: PTHREAD_PRIO_INHERIT
     or aging                on that mutex`)
      }
    ],
    examples: [
      {
        title: "Mars Pathfinder, 1997",
        input: "A high-priority bus task blocks on a mutex held by a low-priority weather task; a medium-priority comms task runs.",
        output: "Repeated watchdog resets on the surface of Mars.",
        explanation:
          "Step 1: The low-priority holder is preempted by medium-priority work that needs no lock.\nStep 2: The holder cannot run, so it cannot release, so the high-priority task stays blocked for an unbounded time.\nStep 3: The watchdog observed the bus task missing its deadline and reset the system.\nStep 4: Enabling priority inheritance on that mutex, uploaded from Earth, bounded the inversion to the critical section and ended the resets."
      },
      {
        title: "Fixed backoff converting deadlock into livelock",
        input: "A trylock retry loop with a constant 1 ms sleep between attempts.",
        output: "No more deadlocks; CPU pinned at 100% with zero throughput.",
        explanation:
          "Step 1: Two colliding threads both release and both sleep for exactly the same duration.\nStep 2: They wake simultaneously and collide again, repeating indefinitely.\nStep 3: The process appears healthy to a liveness check because threads are running, which delays diagnosis.\nStep 4: Randomising the sleep, with exponential growth across attempts, breaks the symmetry and restores progress."
      },
      {
        title: "A starved tenant behind a healthy dashboard",
        input: "A multi-tenant queue served by a policy that always picks the cheapest available job.",
        output: "Aggregate throughput at target; one tenant's jobs never run.",
        explanation:
          "Step 1: The cheapest-first policy is throughput-optimal and has no fairness constraint.\nStep 2: One tenant submits consistently expensive jobs, which are always outranked by cheaper arrivals.\nStep 3: Averages remain healthy because the other tenants absorb all the capacity successfully.\nStep 4: Adding aging, so a job's effective rank improves with waiting time, bounds the wait at a small throughput cost."
      }
    ],
    tips: [
      "Classify by CPU signature first: zero CPU points at deadlock or a convoy, full CPU at livelock, normal metrics at starvation.",
      "Tell the Pathfinder story when priority inversion comes up - it is short, memorable, and demonstrates the unbounded case rather than the trivial one.",
      "Say explicitly that priority inheritance requires the lock to have an owner, which is why a semaphore cannot provide it and a mutex can."
    ],
    tricks: [
      "Any backoff that is not randomised has traded a deadlock for a livelock; jitter is the whole mechanism, not a refinement.",
      "Starvation is only visible in per-participant wait times - measure wait_max and the age of the oldest queued item, never just the average.",
      "Bounded priority inversion is normal and unavoidable; the bug is always the unbounded form caused by an uninvolved medium-priority task."
    ],
    memoryAids: [
      "Deadlock is stuck, livelock is busy, starvation is ignored - zero CPU, full CPU, normal CPU.",
      "Backoff without jitter is a deadlock wearing a disguise.",
      "Pathfinder: high blocked on low, medium ran anyway - inheritance is the fix, and it needs an owner."
    ],
    interviewPatterns: [
      "Comparison: 'deadlock versus livelock versus starvation' - a very common follow-up once deadlock has been covered.",
      "Story probe: 'have you heard of the Mars Pathfinder bug' - or, phrased neutrally, 'what is priority inversion and how do you fix it'.",
      "Frequency and companies: Tier 1 for embedded, real-time, and trading roles; Tier 2 elsewhere, usually as a follow-up to a deadlock question."
    ],
    practiceProblems: [
      "Explain the difference between bounded and unbounded priority inversion. Answer: Bounded inversion is a high-priority task waiting for a low-priority task to finish one critical section, which is unavoidable when they share a lock and is bounded by that section's length. Unbounded inversion happens when a medium-priority task that does not use the lock preempts the low-priority holder, so the holder cannot run or release, and the high-priority task waits for as long as medium-priority work keeps arriving - there is no bound at all. Priority inheritance converts the second case into the first.",
      "Why can a semaphore not implement priority inheritance? Answer: Inheritance requires boosting the priority of whichever thread is holding the resource, so the kernel must know who the holder is. A semaphore is a counter with a wait queue and deliberately has no owner - any thread may post it, which is what makes it suitable for cross-thread signalling. A mutex records its owner, so the kernel can identify and boost it, which is why PTHREAD_PRIO_INHERIT exists for mutexes only.",
      "Your service shows healthy throughput but one customer reports constant timeouts. What do you measure? Answer: Per-participant wait times rather than aggregates - p99 per tenant or per key, the age of the oldest queued item rather than average queue depth, and wait_max from /proc/<pid>/sched for the relevant threads. Starvation leaves aggregate metrics healthy by construction, since other participants absorb the capacity successfully. Once confirmed, the fix is a fairness mechanism: aging so waiting improves rank, or a fair queueing policy that bounds per-tenant wait."
    ],
    faq: [
      {
        question: "How is livelock different from deadlock in practice?",
        answer:
          "The threads are running, which changes both the symptoms and the diagnosis. In deadlock, every participant is blocked at a lock acquisition, so CPU usage attributable to them is zero, and successive thread dumps show identical stacks parked in the same place - which is exactly why a JVM can report a Java-level deadlock automatically. In livelock, the threads execute continuously, so CPU can be at 100%, and successive thread dumps show them at different points in the retry loop, which makes automated detection much harder because there is no cycle to find and nothing is technically blocked. That difference makes livelock more insidious operationally: a health check that verifies the process responds may pass, monitoring that watches CPU sees a busy system rather than a stuck one, and the failure presents as throughput collapse rather than as a hang, so it is often initially misdiagnosed as a capacity problem. The typical cause is a retry or backoff mechanism with no randomisation, where symmetric participants keep colliding in lockstep, and the typical cure is jitter. It is worth noting that livelock is often introduced by an attempt to fix a deadlock: replacing nested blocking acquisition with trylock and a fixed retry delay removes the deadlock and creates the livelock, which is why randomisation must be part of the change rather than an afterthought."
      },
      {
        question: "Is starvation always a bug?",
        answer:
          "Not always, because some starvation is a deliberate policy choice, but it is always something you should have decided rather than inherited. A strict priority scheduler intentionally starves low-priority work whenever higher-priority work is available - that is what strict priority means, and in a real-time control system it is correct, since a background logging task genuinely should never run at the expense of a control loop deadline. Similarly, a reader-preferring lock in a metrics registry that is read constantly and written once at startup may be exactly right. The bug is when starvation is an unintended consequence of a policy chosen for another reason: a cheapest-first queue that starves an expensive tenant, a test-and-set lock whose arbitrary winner selection lets one thread lose indefinitely, or a reader-preferring lock guarding a configuration object that genuinely needs to be updated. The diagnostic question is whether any participant's wait time is unbounded, and whether that is acceptable for that participant. Where it is not, the standard remedies bound the wait: aging raises a waiter's effective priority over time so it eventually outranks the flood, fair queueing serves participants in rotation, and ticket or queue locks serve in arrival order. All of them cost throughput, because serving the longest-waiting request is rarely the same as serving the cheapest one, and that trade should be made explicitly."
      },
      {
        question: "How exactly does priority inheritance work?",
        answer:
          "When a high-priority thread blocks on a mutex, the kernel looks up the mutex's owner and, if that owner has a lower priority, temporarily raises it to match the blocked thread's priority. The holder can then no longer be preempted by medium-priority work, so it runs, completes its critical section, and releases the lock; at that point its priority is restored to its original value and the waiting high-priority thread acquires. The inversion is thereby bounded by the length of the critical section rather than by however much medium-priority work happens to arrive. Inheritance is transitive: if the boosted holder is itself blocked on another mutex, the boost propagates to that lock's owner too, which is necessary for correctness in chained-lock scenarios and is what makes the implementation non-trivial. On Linux you enable it per mutex with pthread_mutexattr_setprotocol and PTHREAD_PRIO_INHERIT, and the kernel supports it through PI-futexes. The requirement that makes it possible is ownership - the kernel must be able to name the holder - which is precisely why a semaphore cannot offer inheritance no matter how it is used. The main costs are a slightly more expensive contended acquire and release path, and the bookkeeping to restore priorities correctly when a thread holds several locks; the alternative protocol, priority ceiling, avoids the dynamic tracking by raising the holder to a statically computed ceiling on every acquisition, which is cheaper at runtime and additionally prevents deadlock, but requires knowing all users of the lock in advance."
      },
      {
        question: "What causes livelock in distributed systems?",
        answer:
          "The same symmetry problem, amplified by scale. The commonest form is the retry storm: a service degrades slightly, clients time out and retry, the retries add load that makes the degradation worse, and the system settles into a state where it is fully saturated serving requests that will all time out, so useful throughput is zero while utilisation is at 100%. Because every client retries on roughly the same schedule after the same timeout, the retries arrive in synchronised waves that keep re-saturating the service just as it recovers. The mitigations are all about breaking that synchronisation and reducing offered load: exponential backoff so repeated failures spread out, jitter so clients do not retry in phase, a retry budget that caps retries as a fraction of original requests, and circuit breakers that stop sending traffic entirely once the failure rate crosses a threshold, letting the service recover before probing it again. A related form is the reconciliation loop conflict, where two controllers with different desired states each keep undoing the other's changes, consuming resources indefinitely with the system oscillating - the fix there is ownership, ensuring exactly one controller owns each resource. A third is interrupt livelock at the machine level, where a host under extreme packet load spends all its time in interrupt handlers and never runs the code that would drain the queues; Linux solves this with NAPI, switching from interrupts to polling once the rate crosses a threshold."
      },
      {
        question: "Why do aggregate metrics hide starvation, and what should I measure instead?",
        answer:
          "Because starvation is by definition a condition in which the system continues to make progress - the starved participant's share of the resource is simply going to other participants, who complete successfully and contribute to every aggregate you are watching. Throughput stays at target, CPU utilisation looks reasonable, the error rate is unaffected until the starved participant finally times out, and even p99 latency can look healthy if the starved participant represents less than one percent of traffic. A single tenant waiting forty-five seconds among twelve thousand requests per second of otherwise healthy traffic is statistically invisible. What you need instead are measurements that expose the tail per participant rather than across the population. Track latency percentiles broken down by tenant, customer, or partition key rather than globally, so one participant's pathology cannot be averaged away. Measure the age of the oldest item in a queue rather than the queue's average depth, since a growing maximum age is the direct signature of something never being served. For threads, wait_max in /proc/<pid>/sched records the longest a task ever sat runnable without being scheduled, which is exactly the quantity starvation makes large. And where a fairness policy exists, instrument it: count how often each participant is chosen and alert on a participant whose selection rate falls to zero while it still has pending work. The general principle is that liveness properties are about individuals, so they must be measured per individual."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Reeves - What Really Happened on Mars? (JPL, 1997) - the Pathfinder priority inversion postmortem",
        insight: "First-hand account of the unbounded inversion, the watchdog resets, and the decision to enable priority inheritance on a live spacecraft."
      },
      {
        source: "paper",
        attribution: "Sha, Rajkumar, Lehoczky - Priority Inheritance Protocols: An Approach to Real-Time Synchronization (IEEE ToC, 1990)",
        insight: "The formal treatment of both inheritance and ceiling protocols, including the proof that ceiling additionally prevents deadlock."
      },
      {
        source: "blog",
        attribution: "AWS Architecture Blog - Exponential Backoff and Jitter",
        insight: "Measured evidence that unjittered backoff produces synchronised retry waves, which is distributed livelock with a different name."
      }
    ]
  }
];
