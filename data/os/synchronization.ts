import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-synchronization - "OS: Synchronization" (5 topics).
export const osSynchronizationTopics: Topic[] = [
  {
    id: "topic-os-race-conditions",
    moduleId: "mod-os-synchronization",
    title: "Race Conditions and the Critical Section Problem",
    intuition:
      "A race condition is not a bug in any single line of code; it is a bug in the set of interleavings your code permits. The classic counter++ looks atomic in source form and is three instructions in machine form - load, add, store - and any other thread may execute between them. The critical section problem asks for three properties simultaneously: mutual exclusion so at most one thread is inside, progress so a free section is eventually entered by someone who wants it, and bounded waiting so no thread is passed over forever. Every synchronisation primitive you will ever use is an answer to those three requirements, and the reason correct answers are hard is that modern hardware and compilers reorder memory operations behind your back.",
    complexity: {
      time:
        "An uncontended atomic read-modify-write costs roughly 20 to 50 cycles because it must lock the cache line, versus about 1 cycle for a plain increment. Under contention the cost is dominated by cache-line ping-ponging between cores, which is 100 to 300 cycles per transfer and scales badly - N threads hammering one counter degrade roughly linearly in N.",
      space:
        "Negligible per operation, but false sharing makes layout matter enormously: two independent variables in the same 64-byte cache line behave as one contended variable. Padding hot per-thread counters to a full cache line trades 64 bytes for the elimination of an invisible serialisation point."
    },
    lesson: [
      {
        title: "Why counter++ Is Three Operations",
        content:
          "The single most useful demonstration in this whole area is the shared counter. Two threads each increment a shared integer one million times, and the final value is reliably less than two million. The reason is that the increment compiles into a load from memory into a register, an arithmetic add on the register, and a store back to memory. If thread A loads the value 100 and is preempted before storing, thread B may load 100, add, and store 101; when A resumes it stores its own 101, and one increment has evaporated. This is a lost update, and the interleaving that causes it may occur once in millions of iterations, which is exactly why race conditions survive testing and appear in production. Notice that the window does not require preemption on a single core - on a multicore machine the two threads genuinely execute simultaneously, and the store buffer means even the timing of when a store becomes visible to other cores is not what the source code suggests.",
        diagram: asciiDiagram(`The lost update: counter++ is load, add, store

  Source:   counter++;
  Machine:  mov  eax, [counter]     ; LOAD
            add  eax, 1             ; ADD
            mov  [counter], eax     ; STORE

  Interleaving that loses an increment (counter starts at 100):

   Thread A                     Thread B              counter
  ──────────────────────────────────────────────────────────────
   LOAD  eax = 100                                      100
                                LOAD  eax = 100         100
   ADD   eax = 101                                      100
                                ADD   eax = 101         100
   STORE counter = 101                                  101
                                STORE counter = 101     101
                                                         ▲
                              two increments applied ────┘
                              but counter advanced by ONE

  ──▶ Correct interleavings vastly outnumber broken ones, so the bug
      appears at a rate of maybe 1 in 10^6 - it will pass your tests
      and fail in production under load.`)
      },
      {
        title: "The Three Requirements, and Why Naive Solutions Fail",
        content:
          "Any correct solution to the critical section problem must provide mutual exclusion, progress, and bounded waiting. Mutual exclusion alone is easy to get wrong in a way that looks right: the obvious attempt is a boolean lock flag that you test and then set, but between the test and the set another thread may run the same test, and both enter. That is why hardware provides atomic read-modify-write instructions - test-and-set, compare-and-swap, fetch-and-add - which perform the read and the write as one indivisible operation with respect to other cores. Progress rules out solutions that leave a free critical section unentered, which strict alternation between two threads violates because a thread that does not want the section still blocks the other. Bounded waiting rules out solutions where an unlucky thread can be overtaken indefinitely; a plain test-and-set spin lock technically permits starvation, which is why fair variants such as ticket locks exist.",
        codeExample: `// The broken flag, and the hardware primitive that fixes it.

bool locked = false;

void broken_lock(void) {
    while (locked) { }     // TEST  ──┐ another thread can run
    locked = true;         // SET   ──┘ between these two lines
}                          // ──▶ both threads enter. Not a lock.

// Atomic test-and-set: read and write are ONE indivisible operation.
atomic_bool locked = false;

void spin_lock(void) {
    // Returns the OLD value and sets true, atomically.
    while (atomic_exchange_explicit(&locked, true, memory_order_acquire))
        cpu_relax();       // PAUSE / YIELD hint on x86
}
void spin_unlock(void) {
    atomic_store_explicit(&locked, false, memory_order_release);
}

/* Correct, but NOT fair: a thread can lose the exchange forever.
   Ticket lock adds bounded waiting - FIFO service order: */
typedef struct { atomic_uint next, now; } ticket_lock;

void ticket_acquire(ticket_lock *l) {
    unsigned my = atomic_fetch_add(&l->next, 1);       // take a number
    while (atomic_load_explicit(&l->now, memory_order_acquire) != my)
        cpu_relax();                                    // wait your turn
}
void ticket_release(ticket_lock *l) {
    atomic_store_explicit(&l->now, l->now + 1, memory_order_release);
}
// ──▶ mutual exclusion + progress + bounded waiting (at most N-1 ahead).`
      },
      {
        title: "Memory Reordering: The Race You Cannot See in the Source",
        content:
          "Even code with no obvious interleaving problem can break, because neither the compiler nor the CPU promises to execute your memory operations in program order. The compiler reorders to improve register allocation and hide latency; the CPU reorders through store buffers, speculative execution, and out-of-order retirement. The canonical failure is the double-checked initialisation, where thread A allocates an object, writes its fields, and publishes the pointer - and thread B observes the pointer before the field writes, seeing a fully non-null pointer to a partially constructed object. Memory barriers fix this by constraining the order in which operations become visible: a release store guarantees that everything written before it is visible to any thread that performs a matching acquire load of that location. This is why every mutex implementation contains barriers, and why using a mutex correctly gives you ordering for free - it is also why replacing a mutex with a plain volatile variable does not work, since volatile prevents compiler optimisation but says nothing about hardware ordering.",
        diagram: asciiDiagram(`Publication without a barrier: a pointer arrives before its data

  Thread A (writer)                    Thread B (reader)
  ┌──────────────────────────┐        ┌──────────────────────────┐
  │ p = malloc(...)          │        │ q = shared;              │
  │ p->field = 42;      (1)  │        │ if (q) use(q->field);    │
  │ shared   = p;       (2)  │        └──────────────────────────┘
  └──────────────────────────┘

  Program order says (1) then (2).
  The hardware store buffer may make (2) visible FIRST:

     Core A store buffer ──▶ drains out of order ──▶ memory
        [ shared = p ]   ◀── reaches memory first
        [ p->field = 42 ] ◀── still in flight
                            │
     Core B loads shared ───┘  sees non-NULL p
     Core B loads p->field  ──▶ reads GARBAGE

  The fix - release/acquire pairing:

     A: p->field = 42;
        atomic_store_explicit(&shared, p, memory_order_release);
                                            ▲ everything before this
                                              is visible to anyone who
                                              acquires the same location
     B: q = atomic_load_explicit(&shared, memory_order_acquire);
        if (q) use(q->field);   ──▶ guaranteed to see 42

  ──▶ 'volatile' does NOT do this. It stops compiler caching only;
      it emits no barrier and orders nothing at the hardware level.`)
      },
      {
        title: "Recognising Races in Real Code",
        content:
          "Races in production rarely look like a shared counter. The recurring shapes are check-then-act, where a thread verifies a condition and acts on it after the condition may have changed, as in checking a map for a key and then inserting; read-modify-write on any shared aggregate, including appending to a list or updating a struct with several fields that must agree; and lazy initialisation, where two threads both observe an uninitialised state and both construct. A useful discipline is to write down, for every piece of mutable shared state, which lock protects it, and to treat any access without that lock as a bug regardless of how safe it looks - reads race too, because a reader can observe a half-updated multi-field structure. Tooling is genuinely effective here in a way it rarely is elsewhere: ThreadSanitizer instruments memory accesses and maintains happens-before relationships, so it reports races on interleavings that did not actually occur in the run, which means it finds bugs your test run did not trigger.",
        codeExample: `// The three shapes that produce almost every real race.

// 1. CHECK-THEN-ACT ----------------------------------------------
if (!map.contains(key))        // another thread may insert HERE
    map.insert(key, value);    // ──▶ duplicate or overwrite
// Fix: one atomic operation.
map.insert_if_absent(key, value);        // or hold the lock across both

// 2. READ-MODIFY-WRITE on an aggregate ---------------------------
account.balance -= amount;     // load, subtract, store
if (account.balance < 0) { /* ... */ }
// Two fields that must AGREE are worse: a reader can see the new
// balance with the old transaction_count. Locks protect INVARIANTS,
// not individual variables.

// 3. LAZY INITIALISATION -----------------------------------------
if (instance == NULL)          // both threads see NULL
    instance = create();       // ──▶ two objects, one leaked
// Fix in C++: static local (guaranteed thread-safe since C++11)
// Fix in C:   pthread_once / call_once

// Find them mechanically - this is worth doing routinely:
//   gcc -fsanitize=thread -g -O1 prog.c && ./a.out
//   go test -race ./...
//   ThreadSanitizer reports races based on happens-before, so it
//   flags a bug even when the losing interleaving did not occur.`
      }
    ],
    examples: [
      {
        title: "The million-increment demonstration",
        input: "Two threads each increment a shared int 1,000,000 times with no synchronisation.",
        output: "Final value is typically 1.0-1.6 million, not 2 million, and differs on every run.",
        explanation:
          "Step 1: Each increment is load, add, store, and the two threads execute genuinely simultaneously on separate cores.\nStep 2: Whenever both threads load the same value, one of the two stores is overwritten and an increment is lost.\nStep 3: The loss rate depends on scheduling and cache-line transfer timing, so results are nondeterministic.\nStep 4: Replacing the increment with atomic_fetch_add produces exactly 2,000,000 every time, because the read and write are indivisible."
      },
      {
        title: "False sharing that looks like a race but is not",
        input: "Four threads each increment their own element of int counters[4], and the code is 8x slower than expected.",
        output: "Correct results, terrible performance - the four counters share one cache line.",
        explanation:
          "Step 1: There is no correctness bug: each thread touches a distinct variable, so no interleaving loses an update.\nStep 2: Cache coherence operates on 64-byte lines, and four 4-byte ints occupy one line.\nStep 3: Every write invalidates the line in the other three cores, forcing a transfer of 100-300 cycles.\nStep 4: Padding each counter to its own 64-byte line, or accumulating in a thread-local and merging at the end, restores the expected scaling."
      },
      {
        title: "A race that only appears on ARM",
        input: "Publication code with a plain pointer store passes years of testing on x86, then corrupts data on an ARM server.",
        output: "x86's strong memory model was hiding a missing release barrier.",
        explanation:
          "Step 1: x86 does not reorder stores with other stores, so the field write became visible before the pointer write by accident.\nStep 2: ARM has a weak memory model and freely reorders stores, so the pointer can arrive first.\nStep 3: The reader then dereferences a non-null pointer to an object whose fields are not yet written.\nStep 4: The code was always incorrect; only the hardware was forgiving. The fix is a release store paired with an acquire load, which is correct on every architecture."
      }
    ],
    tips: [
      "Open with 'counter++ is three instructions' - it is the fastest way to make the problem concrete and it sets up everything that follows.",
      "Name all three requirements - mutual exclusion, progress, bounded waiting - because most candidates name only the first, and the other two explain why fair locks exist.",
      "Mention that reads race too: a reader without the lock can observe a half-updated multi-field structure even though it writes nothing."
    ],
    tricks: [
      "Locks protect invariants, not variables. If two fields must agree, one lock must cover both, and making each field individually atomic does not help.",
      "volatile is not a synchronisation primitive in C or C++ - it stops compiler caching and emits no barrier, so it orders nothing at the hardware level.",
      "If a bug only reproduces under load or only on ARM, suspect a missing barrier; x86's strong ordering hides missing release semantics for free."
    ],
    memoryAids: [
      "counter++ is load, add, store - three chances to be interrupted, one lost update.",
      "Locks protect invariants, not variables: if two fields must agree, one lock must cover both.",
      "volatile stops the compiler, barriers stop the CPU - only one of those is a synchronisation primitive."
    ],
    interviewPatterns: [
      "Definition probe: 'What is a race condition?' - answer in terms of permitted interleavings and the load-add-store decomposition, not vague simultaneity.",
      "Code review: given a snippet, identify check-then-act or lazy initialisation and propose the atomic or lock-based fix.",
      "Frequency and companies: Tier 1 everywhere for backend and systems roles; asked in almost every concurrency screen at Google, Amazon, Meta, and Microsoft."
    ],
    practiceProblems: [
      "Two threads run 'if (balance >= amount) balance -= amount' concurrently on a balance of 100 with amount 100 each. What can go wrong? Answer: Both can evaluate the condition as true before either subtracts, so the balance ends at -100. This is check-then-act: the check and the action must be inside one critical section, and making balance atomic does not help because the invariant spans both operations.",
      "Why is a plain test-and-set spin lock correct but not fair, and how does a ticket lock fix it? Answer: Test-and-set gives mutual exclusion and progress, but which waiter wins the exchange is arbitrary, so one thread can lose indefinitely - unbounded waiting. A ticket lock has each arriving thread atomically fetch-and-add a ticket number and wait until a 'now serving' counter reaches it, giving FIFO order and a bound of N-1 waiters ahead of you.",
      "Explain why declaring a shared flag volatile does not make a producer-consumer handoff safe in C. Answer: volatile guarantees the compiler will re-read the variable from memory and will not elide the access, but it emits no memory barrier. The CPU may still make the flag store visible before the data stores it was meant to guard, so the consumer sees the flag set and reads stale data. Correct code uses an atomic with release/acquire ordering, or a mutex, both of which emit real barriers."
    ],
    faq: [
      {
        question: "What exactly is a race condition, and how is it different from a data race?",
        answer:
          "A data race is the narrow, formally defined thing: two threads access the same memory location concurrently, at least one access is a write, and there is no synchronisation ordering them. In C, C++, Go, and Rust this is undefined behaviour, which means the compiler is entitled to assume it never happens and may optimise accordingly - so a data race is not merely 'you might get an old value', it can produce arbitrary miscompilation. A race condition is broader: it is any situation where correctness depends on the relative timing of events, and it can exist even in code that is completely free of data races. Two threads that each correctly take a lock, check a balance, release the lock, then take the lock again and withdraw, have no data race at all and still have a race condition, because the invariant they care about spans both critical sections. This distinction matters in interviews and in practice: ThreadSanitizer and similar tools detect data races reliably, but they cannot detect the higher-level race, which is why 'the race detector is clean' is not the same as 'the code is correct'. Reasoning about which invariants must hold, and ensuring each invariant is protected across its entire span, is the part no tool does for you."
      },
      {
        question: "Why can't I just make each shared variable atomic?",
        answer:
          "Because locks protect invariants, and invariants usually span several variables. Consider a bounded buffer with a data array, a head index, and a count. Making each of the three atomic guarantees that no individual read observes a torn value, but it guarantees nothing about their mutual consistency: a reader can observe the new count and the old head, conclude that an item is available, and read a slot that has not been written. The rule to internalise is that the unit of protection is the invariant, not the variable, so one lock must cover every access that participates in maintaining it. There is a second, more practical reason too. Atomic operations are individually cheap but they are not free - an uncontended atomic read-modify-write is roughly 20 to 50 cycles because it must lock the cache line - so a data structure built from many atomics can easily be slower than the same structure under one mutex, while also being far harder to reason about. Atomics are the right tool for genuinely single-word state such as a reference count, a flag, or a sequence number, and the wrong tool for anything with a multi-variable invariant."
      },
      {
        question: "Does a single-core machine eliminate race conditions?",
        answer:
          "No, and this is a common misconception worth correcting explicitly. On a single core, threads do not execute simultaneously, but they are still preempted at arbitrary points, including in the middle of a read-modify-write sequence. The timer interrupt can fire between the load and the store of counter++, the scheduler can run the other thread, and the lost update occurs exactly as it would on multiple cores - just at a lower rate, because the window is only hit when a preemption lands inside it. What single-core execution does change is which mitigations work: disabling interrupts genuinely provides mutual exclusion on a single core, which is why old kernel code used it as a lock, and why that approach broke completely when symmetric multiprocessing arrived. Single-core also removes the memory reordering problem between cores, since there is only one core observing memory, so a missing barrier is invisible. That is precisely why a program can work perfectly on a single-core embedded target for years and then fail immediately on a multicore one - the code was always wrong, and the hardware was simply not exercising the flaw."
      },
      {
        question: "How do I find race conditions that only appear in production?",
        answer:
          "Start with dynamic analysis, because it is unusually effective here. ThreadSanitizer, available in GCC and Clang via -fsanitize=thread and built into Go via -race, instruments every memory access and maintains a happens-before relation, so it reports a race whenever two conflicting accesses are unordered even if the harmful interleaving did not actually occur during the run. That property is what makes it far more powerful than stress testing: a single normal-looking run can surface a bug that would take millions of production requests to trigger naturally. Combine it with stress techniques that widen the windows - running many more threads than cores so preemption is frequent, inserting random sleeps or yields at suspicious points, and running the test suite on a weakly-ordered architecture such as ARM, which will expose missing barriers that x86 hides. For issues already in production, look for the symptoms rather than the cause: counters that drift from their expected totals, assertions that fail rarely, structures whose fields disagree, and crashes clustered at high load. Finally, adopt the discipline of documenting, for each piece of shared mutable state, which lock protects it, since most production races come from a later change that touched the state without knowing the rule."
      },
      {
        question: "What is false sharing and why does it matter if there is no race?",
        answer:
          "False sharing is a performance problem that arises from the granularity of cache coherence. Coherence protocols track ownership per cache line, typically 64 bytes, not per variable. If two threads write to two distinct variables that happen to sit in the same line, the hardware treats those writes as conflicting: each write invalidates the line in the other core's cache, so the line ping-pongs between cores, and every access pays a 100 to 300 cycle transfer instead of a few cycles from L1. The program is completely correct - no update is lost, no invariant is violated - but throughput can collapse by a factor of five or more, and the scaling curve becomes negative, so adding threads makes it slower. The classic instance is an array of per-thread counters, where several counters share one line. Fixes are to pad each hot per-thread datum to its own cache line, typically with an alignas(64) declaration, or better to accumulate in a genuinely thread-local variable and merge the results at the end, which avoids the shared line entirely. Diagnose it with perf c2c on Linux, which attributes cache-line contention to specific lines and code sites."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapters 25-26 (Concurrency, Threads)",
        insight: "The clearest exposition of the shared-counter demonstration and the three requirements, written to be understood rather than to be complete."
      },
      {
        source: "paper",
        attribution: "Adve and Boehm - Memory Models: A Case for Rethinking Parallel Languages and Hardware (CACM 2010)",
        insight: "Explains precisely why volatile is not a synchronisation primitive and why data races must be undefined behaviour for compilers to optimise at all."
      },
      {
        source: "interview-experience",
        attribution: "Common backend concurrency screen, reported across Google, Amazon, and Microsoft loops",
        insight: "The near-universal opener is 'why does this counter lose increments' - candidates who answer with load-add-store and then name all three critical-section requirements move straight to harder follow-ups."
      }
    ]
  },
  {
    id: "topic-os-mutex-semaphore-condvar",
    moduleId: "mod-os-synchronization",
    title: "Mutexes, Semaphores, and Condition Variables",
    intuition:
      "Three primitives cover almost everything, and they answer three different questions. A mutex answers 'who may touch this state right now' - it has an owner, and only the owner releases it. A semaphore answers 'how many of this resource remain' - it is a counter with a waiting list and no owner, so one thread may signal what another waits on. A condition variable answers 'wait until this predicate becomes true' - it holds no state at all, it is purely a place to sleep and be woken, and it must be paired with a mutex because the predicate it describes is protected by that mutex. Choosing wrongly among the three is the most common cause of concurrency code that is technically correct but impossible to maintain.",
    complexity: {
      time:
        "An uncontended mutex acquire is roughly 20 to 50 cycles - one atomic operation and no system call, because modern implementations are futex-based and only enter the kernel on contention. A contended acquire that blocks costs a system call plus a context switch, on the order of 1 to 10 microseconds, which is 100 to 1000 times more expensive.",
      space:
        "A pthread mutex is around 40 bytes, a condition variable around 48, and a semaphore around 32 on typical Linux builds. The kernel-side wait queue is allocated only when contention actually occurs, which is why an uncontended futex costs no kernel memory at all."
    },
    lesson: [
      {
        title: "The Futex: Why Uncontended Locks Are Nearly Free",
        content:
          "A naive mutex would enter the kernel on every acquire and release, costing a system call each way, which would make fine-grained locking hopeless. The futex design, introduced in Linux 2.6 and mirrored on other systems, avoids this by keeping the lock word in user space and only calling into the kernel when a thread actually has to sleep. The fast path is a single compare-and-swap on a user-space integer: if it succeeds, the lock is yours and the kernel never hears about it. Only when the compare-and-swap fails does the thread issue a FUTEX_WAIT system call, passing the expected value so the kernel can re-check it atomically against a concurrent release and avoid a lost-wakeup race. On release, the fast path is a store, plus a FUTEX_WAKE call only if the lock word indicates that waiters exist. This is why the correct mental model is that a mutex is cheap when uncontended and expensive when contended, and why reducing contention matters far more than micro-optimising the lock itself.",
        diagram: asciiDiagram(`Futex: user-space fast path, kernel only on contention

  Lock word in USER memory:  0 = free, 1 = held, 2 = held + waiters

  ACQUIRE
    CAS(word, 0 ──▶ 1)
        │
        ├── success ──▶ LOCK HELD. ~20-50 cycles. Kernel never involved.
        │
        └── failure ──▶ contended
                 set word = 2 (mark "waiters exist")
                 syscall FUTEX_WAIT(&word, 2)
                        │  kernel re-checks *word == 2 atomically
                        │  (this closes the lost-wakeup race against
                        │   a release happening right now)
                        ▼
                 ┌──────────────────┐
                 │ kernel wait queue│  thread SLEEPS, no CPU burned
                 └──────────────────┘

  RELEASE
    if word was 1 ──▶ store 0.  Done. No syscall.
    if word was 2 ──▶ store 0 then syscall FUTEX_WAKE(&word, 1)

  ──▶ Cost model:
        uncontended   ~25 cycles      (one atomic)
        contended     ~1-10 µs        (syscall + context switch)
      A 100-1000x cliff. Optimise CONTENTION, not the lock.`)
      },
      {
        title: "Semaphores Count; Mutexes Own",
        content:
          "A semaphore is an integer with two atomic operations: wait decrements and blocks if the result would be negative, and post increments and wakes a waiter. A binary semaphore initialised to one superficially resembles a mutex, and the difference is ownership. A mutex records which thread holds it, which enables three things a semaphore cannot offer: error detection when the wrong thread unlocks, recursive acquisition when the implementation supports it, and crucially priority inheritance, where the kernel can temporarily boost the holder's priority because it knows who the holder is. A semaphore has no owner by design, and that is exactly what makes it the right tool for signalling between threads - a producer posts and a consumer waits, which is a handoff, not a critical section. The practical rule is to use a mutex whenever the same thread that acquires will release, and a semaphore when you are counting a resource or signalling across threads.",
        codeExample: `#include <pthread.h>
#include <semaphore.h>

/* MUTEX - ownership. Same thread locks and unlocks. */
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_lock(&m);
shared_state++;                 /* critical section: keep it SHORT */
pthread_mutex_unlock(&m);

/* SEMAPHORE - counting / signalling. Any thread may post. */
sem_t slots;
sem_init(&slots, 0, 10);        /* 10 permits: a connection pool */

sem_wait(&slots);               /* take a permit, block if none */
use_connection();
sem_post(&slots);               /* return it */

/* Signalling across threads - a mutex CANNOT do this: */
sem_t ready;
sem_init(&ready, 0, 0);         /* start empty */
// thread A:  produce(); sem_post(&ready);
// thread B:  sem_wait(&ready); consume();
// Unlocking a mutex you never locked is undefined behaviour.

/* Why ownership matters - priority inheritance needs an owner: */
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&m, &attr);
/* Now if a low-priority holder blocks a high-priority waiter, the
   kernel boosts the holder until it releases. A semaphore has no
   owner, so it can never do this - the classic Mars Pathfinder bug. */`
      },
      {
        title: "Condition Variables and the Mandatory while Loop",
        content:
          "A condition variable is not a flag and stores no state; it is a queue of sleeping threads associated with a predicate that some mutex protects. The wait operation must be given that mutex, because it performs an atomic three-step dance: release the mutex, sleep, and reacquire the mutex before returning. Doing those atomically is essential, since if the mutex were released before sleeping as separate operations, a signal could arrive in the gap and be lost forever. The rule that trips up nearly everyone is that wait must always be called inside a while loop testing the predicate, never an if. There are two independent reasons. Spurious wakeups are permitted by POSIX and do occur, because allowing them makes the implementation dramatically simpler and faster. More importantly, between the signal and the woken thread reacquiring the mutex, another thread can run and invalidate the predicate - so even with no spurious wakeups the condition must be rechecked. Writing while instead of if costs nothing and makes both problems disappear.",
        diagram: asciiDiagram(`pthread_cond_wait: the atomic release-sleep-reacquire

  Consumer                                    Producer
  ─────────────────────────────────────────────────────────────
  lock(m)
  while (queue.empty())      ◀── WHILE, never IF
      cond_wait(&cv, &m)
         │
         ├─ 1. release m      ─────┐  atomic w.r.t. signal
         ├─ 2. sleep on cv         │  ──▶ no lost wakeup possible
         │                         ▼
         │                    lock(m)
         │                    queue.push(item)
         │                    cond_signal(&cv)
         │                    unlock(m)
         │                         │
         ├─ 3. WOKEN ◀─────────────┘
         └─ 4. REACQUIRE m  ◀── may block here; meanwhile ANOTHER
              │                 consumer can grab the item first
              ▼
      loop re-tests queue.empty()  ──▶ empty again? sleep again.
                                       This is why IF is a BUG.
  item = queue.pop()
  unlock(m)

  Two independent reasons the loop is mandatory:
    1. Spurious wakeups are permitted by POSIX and do happen.
    2. Between signal and reacquire, another thread can consume
       the very item you were signalled about (Mesa semantics).

  signal    ──▶ wake ONE waiter   (fine when all waiters are alike)
  broadcast ──▶ wake ALL waiters  (needed when waiters await
                                   DIFFERENT predicates on one cv)`)
      },
      {
        title: "Reader-Writer Locks and When They Are Worth It",
        content:
          "A reader-writer lock allows any number of concurrent readers or one exclusive writer, which sounds like a straightforward win for read-mostly data and often is not. The bookkeeping is heavier than a plain mutex: acquiring a read lock still requires an atomic read-modify-write on a shared counter, so concurrent readers contend on that counter's cache line even though they do not block each other. The result is that for short critical sections a plain mutex frequently outperforms a reader-writer lock even at a 99 percent read ratio, because the mutex does less work per acquisition. Reader-writer locks pay off when critical sections are long enough that genuine parallelism among readers outweighs the extra atomic traffic, roughly microseconds rather than nanoseconds. There is also a fairness question with no universally right answer: reader-preferring implementations can starve writers under continuous read load, writer-preferring ones can starve readers, and task-fair ones queue everyone in arrival order at some throughput cost. For genuinely read-dominated hot paths the better answer is often not a lock at all but read-copy-update or an immutable snapshot that readers take without any atomic operation.",
        codeExample: `#include <pthread.h>

pthread_rwlock_t rw = PTHREAD_RWLOCK_INITIALIZER;

pthread_rwlock_rdlock(&rw);     /* many readers concurrently... */
value = lookup(key);
pthread_rwlock_unlock(&rw);

pthread_rwlock_wrlock(&rw);     /* ...or one exclusive writer */
table[key] = value;
pthread_rwlock_unlock(&rw);

/* Measured reality on a 16-core box, 99% reads:
     critical section ~50 ns   ──▶ plain mutex is FASTER
                                   (rwlock bookkeeping dominates)
     critical section ~5 µs    ──▶ rwlock wins clearly
   Reason: rdlock still does an atomic RMW on a shared counter, so
   readers ping-pong that cache line even though they never block. */

/* Read-mostly done properly - copy-on-write snapshot.
   Readers do ZERO atomics beyond one acquire load: */
_Atomic(config_t *) current;

const config_t *read_config(void) {
    return atomic_load_explicit(&current, memory_order_acquire);
}
void update_config(config_t *fresh) {
    config_t *old = atomic_exchange(&current, fresh);
    defer_free(old);            /* free after readers drain (RCU/epoch) */
}
/* ──▶ readers scale perfectly; writers pay the copy. */`
      }
    ],
    examples: [
      {
        title: "The if-versus-while bug in a bounded buffer",
        input: "A consumer uses 'if (queue.empty()) cond_wait(&cv, &m);' with two consumers and one producer.",
        output: "Intermittent crash popping from an empty queue.",
        explanation:
          "Step 1: The producer pushes one item and signals; both consumers are waiting.\nStep 2: Consumer A wakes, reacquires the mutex, pops the item, and unlocks.\nStep 3: Consumer B, already woken, now reacquires the mutex, but with if it does not recheck and proceeds to pop.\nStep 4: The queue is empty and the pop is undefined. Changing if to while makes B retest, find the queue empty, and sleep again."
      },
      {
        title: "A semaphore used where a mutex belonged",
        input: "A team uses a binary semaphore as a lock; a bug causes thread B to post a semaphore acquired by thread A.",
        output: "Silent corruption - two threads inside the critical section, and no error is reported.",
        explanation:
          "Step 1: A semaphore has no owner, so posting from a non-acquiring thread is entirely legal.\nStep 2: The count rises above one, and two threads pass wait simultaneously.\nStep 3: With a mutex the same mistake would be detected: unlocking a mutex you do not hold returns EPERM with an error-checking mutex, or is diagnosable under a sanitizer.\nStep 4: The rule follows directly - if the same thread acquires and releases, use a mutex and get the ownership checks for free."
      },
      {
        title: "A reader-writer lock that made things slower",
        input: "A hash table with 50 ns lookups is switched from a mutex to a reader-writer lock at a 99% read ratio.",
        output: "Throughput drops about 30% on 16 cores.",
        explanation:
          "Step 1: Every rdlock performs an atomic increment on a shared reader counter.\nStep 2: That counter's cache line ping-pongs between all 16 cores, costing 100-300 cycles per acquisition.\nStep 3: The critical section itself is only about 150 cycles, so the added coherence traffic dominates the parallelism gained.\nStep 4: Either revert to the mutex or, better, move to a copy-on-write snapshot so readers perform a single acquire load and no atomic write at all."
      }
    ],
    tips: [
      "Answer 'mutex versus semaphore' with ownership first, then give the consequence: priority inheritance and error checking are only possible when the lock knows its holder.",
      "Always write condition variable waits inside a while loop and be ready to give both reasons - spurious wakeups and Mesa semantics - because most candidates know only the first.",
      "Quote the cost cliff: an uncontended mutex is tens of cycles, a contended one is microseconds, so the engineering target is reducing contention, not replacing the primitive."
    ],
    tricks: [
      "The three-line rule of thumb: mutex when the same thread acquires and releases, semaphore when counting or signalling across threads, condition variable when waiting for a predicate.",
      "Prefer signalling with the mutex held; it costs a negligible extra wakeup on some implementations and eliminates an entire class of lost-wakeup reasoning.",
      "If a reader-writer lock did not make things faster, the critical section was probably too short - measure before adopting one, and consider an immutable snapshot instead."
    ],
    memoryAids: [
      "Mutex owns, semaphore counts, condition variable waits - three questions, three answers.",
      "Uncontended tens of cycles, contended microseconds: a 100x cliff at the futex boundary.",
      "while not if - spurious wakeups and Mesa semantics, two reasons, either one sufficient."
    ],
    interviewPatterns: [
      "Compare-and-contrast: 'mutex versus semaphore versus condition variable' - a near-guaranteed question in any concurrency round.",
      "Implementation: 'implement a bounded buffer' - correct answer uses a mutex plus two condition variables, with while loops.",
      "Frequency and companies: Tier 1 for all backend and systems roles; the bounded buffer specifically appears at Amazon, Microsoft, Bloomberg, and most trading firms."
    ],
    practiceProblems: [
      "Implement a bounded buffer with a mutex and condition variables. How many condition variables and why? Answer: Two - not_full and not_empty. With one shared condition variable a producer's signal can wake another producer, which finds the buffer still full and sleeps again while the waiting consumer is never woken. Two variables direct each signal to the right waiter set; if you insist on one, you must use broadcast, which wastes wakeups.",
      "Why must pthread_cond_wait take the mutex as an argument? Answer: Because it must release the mutex and enqueue the thread on the condition variable atomically. If those were separate steps, a signaller could acquire the mutex, find the predicate true, and signal in the gap after the release but before the sleep - the wakeup would be delivered to nobody and the waiter would sleep forever. Passing the mutex lets the implementation close that window.",
      "You have a resource pool of 10 connections. Which primitive, and why not the others? Answer: A counting semaphore initialised to 10. A mutex only expresses one-at-a-time, so it would serialise the pool entirely. A condition variable alone stores no count and would need a mutex plus a manually maintained counter, which is exactly what a semaphore already is. The semaphore's wait blocks when all permits are taken and post returns one, which is the pool's semantics precisely."
    ],
    faq: [
      {
        question: "What is the real difference between a mutex and a binary semaphore?",
        answer:
          "Ownership, and everything that follows from it. A mutex records which thread holds it; a semaphore is just a counter with a wait queue and no notion of a holder. That single difference produces several practical consequences. Error detection: unlocking a mutex you do not hold is an error that an error-checking mutex will report with EPERM, while posting a semaphore you never waited on is completely legal and silently raises the count, which can let two threads into a critical section with no diagnostic at all. Priority inheritance: when a high-priority thread blocks on a mutex held by a low-priority thread, the kernel can boost the holder because it knows who the holder is, and this is the standard fix for priority inversion - a semaphore fundamentally cannot do it. Recursion: a mutex can support recursive acquisition by the owning thread because it can compare thread identities. Semantics: a mutex expresses a critical section, whereas a semaphore expresses either a resource count or a signal, and a signal is inherently a cross-thread handoff where one thread posts what another waits on. The rule that follows is simple - if the same thread acquires and releases, use a mutex; if you are counting permits or signalling between threads, use a semaphore."
      },
      {
        question: "Why must I use while rather than if around a condition variable wait?",
        answer:
          "There are two independent reasons and each one is sufficient on its own. The first is spurious wakeups: POSIX explicitly permits pthread_cond_wait to return without any corresponding signal, because allowing this makes implementations substantially simpler and faster, particularly around signal delivery and futex requeueing. Any code that assumes a return implies a signal is therefore wrong by specification. The second reason is more fundamental and applies even on an implementation with no spurious wakeups at all. Almost all condition variables use Mesa semantics, meaning that signalling makes a waiter runnable but does not transfer the mutex or any guarantee to it. Between the moment a waiter is signalled and the moment it actually reacquires the mutex and returns, other threads can run and change the state - in a bounded buffer, a different consumer can take the item that the signal announced. The waiter therefore has no right to assume the predicate holds; it only knows the predicate might hold. Retesting in a while loop handles both cases at zero cost, and the loop is not a workaround for a defect in the primitive but the correct way to use it. The contrasting design, Hoare semantics, transfers the mutex directly to the waiter so the predicate is guaranteed, but it requires an extra context switch per signal and is essentially unused in practice."
      },
      {
        question: "Should I signal while holding the mutex or after releasing it?",
        answer:
          "Both are correct, and the practical advice is to signal while holding the mutex unless you have measured a reason not to. Signalling after release is a classic optimisation aimed at avoiding the hurry-up-and-wait pattern, where the woken thread immediately blocks again on a mutex the signaller still holds - and on old implementations that cost an extra context switch. Modern Linux implementations largely eliminate this through futex requeue, which moves the waiter directly to the mutex's wait queue rather than waking it to fail, so the optimisation buys much less than it used to. Signalling inside the lock has real advantages: the predicate you are signalling about is guaranteed to still hold at the moment of the signal, which makes the code far easier to reason about; and it avoids a subtle lifetime hazard where, after unlocking, another thread may destroy the condition variable or the object containing it before your signal executes, producing a use-after-free that is extremely hard to diagnose. Given that the performance difference is now small and the correctness difference is not, hold the lock. As for signal versus broadcast: use signal when all waiters are interchangeable and any one can make progress, and broadcast when waiters are waiting on different predicates through the same condition variable, or when a state change could allow several waiters to proceed at once."
      },
      {
        question: "When is a spinlock better than a mutex?",
        answer:
          "A spinlock is better in a narrow set of circumstances that is easy to state and easy to get wrong. It wins when the expected wait is shorter than the cost of blocking and rescheduling, which is roughly one to ten microseconds, so the critical section must be genuinely tiny - a handful of instructions updating a counter or a list head. It requires multiple cores, because spinning on a single core simply burns the entire quantum waiting for a thread that cannot run until you yield. And it requires that the holder cannot be preempted or blocked while holding the lock, which is why spinlocks are natural in interrupt handlers and kernel code where preemption is disabled, and dangerous in user space where the scheduler can deschedule the holder at any moment and leave every spinner burning CPU for a full time slice. In practice, user-space code should almost always use a mutex, because production mutex implementations already begin with a brief adaptive spin before falling back to a futex wait, giving you the spinlock's advantage on short waits and the mutex's advantage on long ones automatically. If you do write a spinlock, use a PAUSE or YIELD instruction in the loop to reduce memory-order violation penalties and power consumption, and read the lock with a plain load before attempting the atomic exchange so that spinning does not generate coherence traffic on every iteration."
      },
      {
        question: "How do I decide between a reader-writer lock and a plain mutex?",
        answer:
          "Measure, because intuition fails here in a specific and predictable way. The intuitive argument - most operations are reads, readers do not conflict, therefore let them run concurrently - ignores that acquiring a read lock is itself a write to shared state, since the implementation must atomically increment a reader count. That atomic increment invalidates the counter's cache line in every other core, so N concurrent readers generate exactly the coherence traffic you were trying to avoid, and they generate more of it than a mutex would, because the reader-writer lock's bookkeeping is heavier. The consequence is that for short critical sections, on the order of tens or a couple of hundred nanoseconds, a plain mutex often beats a reader-writer lock even at a 99 percent read ratio. Reader-writer locks win when the critical section is long enough - roughly microseconds - that real reader parallelism outweighs the extra atomic traffic. You must also decide a fairness policy: reader-preferring implementations can starve writers under sustained read load, writer-preferring ones can starve readers, and task-fair queuing costs throughput. If the workload is genuinely read-dominated and performance-critical, the strongest answer usually avoids locking on the read path altogether - a copy-on-write snapshot where readers take a single acquire load of an immutable pointer, with reclamation handled by read-copy-update or epoch-based schemes, scales essentially perfectly and moves all the cost onto the rare writer."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Franke, Russell, Kirkwood - Fuss, Futexes and Furwocks: Fast Userlevel Locking in Linux (OLS 2002)",
        insight: "The original futex paper; explains the user-space fast path and exactly how the kernel re-check closes the lost-wakeup race."
      },
      {
        source: "book",
        attribution: "Butenhof - Programming with POSIX Threads, chapters 3-4",
        insight: "Still the best treatment of Mesa semantics and why the predicate loop is mandatory rather than defensive."
      },
      {
        source: "blog",
        attribution: "Preshing on Programming - Locks Aren't Slow; Lock Contention Is - https://preshing.com/20111118/locks-arent-slow-lock-contention-is/",
        insight: "Measured data behind the uncontended-versus-contended cost cliff, and the reason to attack contention rather than swap primitives."
      }
    ]
  },
  {
    id: "topic-os-monitors-and-mesa-semantics",
    moduleId: "mod-os-synchronization",
    title: "Monitors, Mesa Semantics, and Language-Level Concurrency",
    intuition:
      "A monitor bundles the state, the mutex that protects it, and the condition variables that wait on it into one construct, so the lock cannot be forgotten because it is not a separate object you must remember to take. Java's synchronized, C#'s lock, and Python's with statement are all monitors in this sense. The subtle part is not the bundling but the signalling discipline: when a thread signals, does the waiter get the monitor immediately with the predicate guaranteed, or does it merely become runnable and have to re-check? Hoare said the former, Mesa said the latter, and essentially every real system chose Mesa - which is why the predicate loop is not a defensive habit but a direct consequence of the semantics your language actually implements.",
    complexity: {
      time:
        "Entering an uncontended Java synchronized block is a few nanoseconds because the JVM uses thin locks - a compare-and-swap on the object header - and inflates to a full OS monitor only under contention. Contended entry costs a park and unpark pair, roughly 1 to 10 microseconds, the same cliff as any futex-based mutex.",
      space:
        "A Java object header carries the lock word inline, so an uncontended monitor adds no allocation. Inflation allocates a monitor structure of roughly 100 bytes per contended object, which is why locking on millions of distinct small objects has a real memory cost as well as a coherence cost."
    },
    lesson: [
      {
        title: "What a Monitor Actually Is",
        content:
          "Brinch Hansen and Hoare proposed the monitor as a module whose data is accessible only through its procedures, with the guarantee that at most one thread executes inside any of those procedures at a time. Mutual exclusion becomes a property of the module rather than a discipline the caller must follow, which removes the largest single source of concurrency bugs - forgetting to take the lock, or taking the wrong one. Condition variables live inside the monitor because the predicates threads wait on are precisely the invariants over the monitor's state. Modern languages implement this in slightly different shapes: Java attaches a monitor to every object and exposes it through synchronized plus wait, notify, and notifyAll; C# does the same through lock and Monitor.Wait; Python's threading.Condition wraps a lock and exposes wait and notify with a context manager. In every case the crucial property is the same, that the lock is released automatically when control leaves the region, including by exception, which eliminates the leaked-lock failure mode that plagues manual lock and unlock pairs.",
        diagram: asciiDiagram(`A monitor: state + mutex + condition queues, as one unit

  ┌──────────────── Monitor: BoundedBuffer ────────────────┐
  │                                                        │
  │   STATE   items[N], head, tail, count                  │
  │           └── reachable ONLY through the procedures    │
  │                                                        │
  │   ┌────────────── entry queue ──────────────┐          │
  │   │  threads waiting to ENTER the monitor   │          │
  │   └────────────────┬────────────────────────┘          │
  │                    ▼                                   │
  │        ┌───────────────────────┐                       │
  │        │  ONE thread executing │                       │
  │        └───────────┬───────────┘                       │
  │                    │ predicate false ──▶ wait()        │
  │                    ▼                                   │
  │   ┌─── condition queue: not_full ───┐                  │
  │   ┌─── condition queue: not_empty ──┐                  │
  │        │ signalled ──▶ back to the ENTRY queue,        │
  │        │              NOT straight to running          │
  │        └──────────────────────────────────────▲        │
  │                                               │        │
  └───────────────────────────────────────────────┼────────┘
                                                  │
       ──▶ THAT arrow is Mesa semantics, and it is why the
           predicate must be re-tested in a while loop.

  Invariant: at most one thread inside, ever.
  The lock is released on EVERY exit path, including exceptions.`)
      },
      {
        title: "Hoare Versus Mesa: The Decision Everyone Inherits",
        content:
          "Under Hoare semantics, signalling immediately transfers the monitor to the woken thread, so the predicate that prompted the signal is guaranteed true when wait returns, and an if statement would be sufficient. That guarantee is expensive: it requires an immediate context switch to the waiter, and the signaller must then be restored afterwards, so every signal costs two switches, and the implementation must maintain an extra queue for signallers awaiting re-entry. Under Mesa semantics, introduced in the Mesa language at Xerox PARC, signalling merely moves the waiter from the condition queue to the entry queue; the signaller keeps running, and the waiter competes for the monitor like anyone else. That is far cheaper and much simpler, but it means arbitrary other threads may execute between the signal and the waiter's resumption, so the predicate may no longer hold. Every mainstream system - POSIX threads, Java, C#, Go's sync.Cond, Python - uses Mesa. The practical consequence is one line of code: while, not if. It is worth being able to explain that this is a deliberate performance trade, not an implementation defect.",
        codeExample: `// Java: the monitor is built into every object.

class BoundedBuffer<T> {
    private final Object[] items = new Object[16];
    private int count = 0, head = 0, tail = 0;

    public synchronized void put(T x) throws InterruptedException {
        while (count == items.length)   // WHILE - Mesa semantics
            wait();                     // releases the monitor, sleeps
        items[tail] = x;
        tail = (tail + 1) % items.length;
        count++;
        notifyAll();                    // wake anyone who may proceed
    }

    @SuppressWarnings("unchecked")
    public synchronized T take() throws InterruptedException {
        while (count == 0)
            wait();
        T x = (T) items[head];
        head = (head + 1) % items.length;
        count--;
        notifyAll();
        return x;
    }
}
/* Java has ONE condition queue per object, so notify() might wake a
   producer when a consumer needed waking - a lost-wakeup deadlock.
   notifyAll() is the safe default here. To get two queues, use
   ReentrantLock with two Condition objects and signal() precisely: */

class Better<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public void put(T x) throws InterruptedException {
        lock.lock();
        try {
            while (full()) notFull.await();
            enqueue(x);
            notEmpty.signal();          // signal(), not signalAll() -
        } finally {                     // the right waiter is targeted
            lock.unlock();              // finally = never leak the lock
        }
    }
}`
      },
      {
        title: "Reentrancy, Nested Monitors, and the Failure Modes",
        content:
          "Java and C# monitors are reentrant, meaning a thread already holding a monitor may re-enter it, which is necessary because one synchronized method routinely calls another on the same object. Reentrancy is implemented with an owner field and a recursion count, and it removes an entire class of accidental self-deadlock. It does not remove the harder failure modes. The nested monitor problem occurs when a thread holding monitor A waits on a condition inside monitor B: waiting releases B but not A, so a thread that needs A in order to make the condition true can never run, and the system deadlocks with no lock cycle in the classical sense. The other recurring hazard is calling out of a monitor into unknown code - invoking a callback or a listener while holding the lock - because that code may take other locks in another order, or may call back into the monitor and deadlock. The standard discipline is to keep monitor procedures self-contained, to never invoke user-supplied callbacks while holding a lock, and to copy the data you need and release the lock before doing anything slow.",
        diagram: asciiDiagram(`Two failure modes that reentrancy does NOT fix

  1. NESTED MONITOR LOCKOUT
  ─────────────────────────
     Thread 1                        Thread 2
     synchronized (A) {              synchronized (A) {   ◀── BLOCKED
        synchronized (B) {              b.setReady(true);
           while (!ready)               B.notify();
               B.wait();   ◀── releases B, HOLDS A       }
        }
     }
                    │
                    └──▶ Thread 2 can never enter A, so ready is
                         never set, so Thread 1 waits forever.
                         No lock CYCLE exists - a deadlock detector
                         looking for cycles will not find this.

     Fix: never wait on an inner monitor while holding an outer one.
          Restructure so one monitor owns the whole condition.

  2. CALLING OUT WHILE HOLDING THE LOCK
  ─────────────────────────────────────
     synchronized (this) {
         for (Listener l : listeners)
             l.onEvent(e);       ──▶ UNKNOWN code, holding our lock
     }                               may take lock X ──▶ ABBA deadlock
                                     may call back in ──▶ reentrancy
                                        saves you, or corrupts the
                                        invariant mid-update
     Fix:
     List<Listener> snapshot;
     synchronized (this) { snapshot = new ArrayList<>(listeners); }
     for (Listener l : snapshot) l.onEvent(e);   ◀── lock RELEASED`)
      },
      {
        title: "Higher-Level Constructs Built on Monitors",
        content:
          "Most production concurrency should not use raw monitors at all, because the standard patterns have been packaged and the packaged versions are both faster and harder to misuse. A blocking queue is a monitor-based bounded buffer with the while loops already correct, and it is the right answer to the overwhelming majority of producer-consumer problems. A countdown latch lets threads wait until a set of operations completes, a cyclic barrier synchronises a group repeatedly across phases, and a semaphore bounds a resource pool. Java's java.util.concurrent, C#'s System.Threading, and Go's sync package all provide these. Go additionally offers channels, which are a different model entirely - communicating sequential processes, where synchronisation is achieved by passing values rather than by protecting shared state - and that model eliminates whole categories of bug by removing the shared state that needed protecting. The interview-relevant point is knowing when to reach for which layer: raw monitors for genuinely novel coordination, library constructs for everything standard, and message passing when the problem is really a pipeline.",
        codeExample: `// The same producer-consumer, three levels of abstraction.

// LEVEL 1 - raw monitor: correct but you own every detail.
//   see BoundedBuffer above: while loops, notifyAll, finally

// LEVEL 2 - library construct: the loops are already right.
BlockingQueue<Task> q = new ArrayBlockingQueue<>(100);
q.put(task);              // blocks when full
Task t = q.take();        // blocks when empty
// ──▶ prefer this. Almost no producer-consumer needs level 1.

// Coordination primitives worth knowing by name:
CountDownLatch ready = new CountDownLatch(3);
ready.countDown();        // each worker signals completion
ready.await();            // main thread waits for all three
                          // ONE-SHOT: cannot be reset

CyclicBarrier phase = new CyclicBarrier(4, () -> mergeResults());
phase.await();            // all 4 meet here, then the action runs,
                          // then the barrier RESETS for the next phase

Semaphore pool = new Semaphore(10);
pool.acquire(); try { useConnection(); } finally { pool.release(); }

// LEVEL 3 - Go: share memory by communicating, not the reverse.
//   ch := make(chan Task, 100)
//   ch <- task            // blocks when the buffer is full
//   t := <-ch             // blocks when empty
//   ──▶ no lock, no condition variable, no predicate loop, because
//       there is no shared mutable state left to protect.`
      }
    ],
    examples: [
      {
        title: "notify versus notifyAll causing a hang",
        input: "A Java bounded buffer with one condition queue uses notify(); under load it hangs with both producers and consumers blocked.",
        output: "A lost wakeup - notify() woke the wrong kind of waiter.",
        explanation:
          "Step 1: Java gives each object exactly one wait set, so producers and consumers wait in the same queue.\nStep 2: A consumer takes an item and calls notify(), which happens to wake another consumer.\nStep 3: That consumer re-tests, finds the buffer still empty, and goes back to sleep; the producer that was waiting for space is never woken.\nStep 4: Either use notifyAll(), or switch to ReentrantLock with separate notFull and notEmpty conditions so signal() reaches the correct waiter set."
      },
      {
        title: "Nested monitor lockout in a listener registry",
        input: "A cache holds its own monitor and waits on a loader object's monitor for a value to be fetched.",
        output: "Permanent deadlock with no lock cycle for a detector to find.",
        explanation:
          "Step 1: The waiting thread holds the cache monitor and calls wait() on the loader monitor.\nStep 2: wait() releases only the loader monitor; the cache monitor is still held.\nStep 3: The loader thread needs the cache monitor to publish its result, so it blocks and never signals.\nStep 4: The fix is structural - the condition and the state it describes must be owned by a single monitor, so restructure to wait on the cache's own condition after the loader publishes through a separate mechanism."
      },
      {
        title: "A callback invoked under lock causing an ABBA deadlock",
        input: "An event bus iterates listeners inside a synchronized block; one listener acquires an unrelated lock that another thread holds while entering the bus.",
        output: "Classic two-lock deadlock, reproducible only when both paths run concurrently.",
        explanation:
          "Step 1: Thread 1 holds the bus monitor and, inside a callback, requests lock X.\nStep 2: Thread 2 holds lock X and calls into the bus, requesting the bus monitor.\nStep 3: Neither can proceed - locks acquired in opposite orders.\nStep 4: Copy the listener list under the lock, release it, then invoke callbacks outside; the bus monitor is no longer held during unknown code and the cycle disappears."
      }
    ],
    tips: [
      "Define a monitor as state plus mutex plus condition queues bundled together, then note that automatic release on every exit path is the property that removes leaked locks.",
      "Explain Mesa versus Hoare as a performance trade rather than a defect, and connect it directly to the while loop - that connection is what distinguishes a strong answer.",
      "Say that Java has one wait set per object, which is why notifyAll is the safe default and why ReentrantLock with multiple Conditions is the better structure."
    ],
    tricks: [
      "Never call unknown code - a callback, a listener, a virtual method - while holding a lock; copy what you need, release, then call.",
      "Reentrancy prevents self-deadlock but not nested monitor lockout, because wait releases only the monitor you waited on.",
      "If you find yourself writing a monitor for producer-consumer, stop and use a blocking queue; the library version already has every while loop right."
    ],
    memoryAids: [
      "Monitor = state + mutex + condition queues, bundled so the lock cannot be forgotten.",
      "Hoare hands over the monitor, Mesa hands over a hint - and everyone shipped Mesa.",
      "One wait set per Java object, which is why notifyAll is the safe default."
    ],
    interviewPatterns: [
      "Concept probe: 'what is a monitor and how does it differ from a mutex' - bundling, automatic release, and integrated condition queues.",
      "Java-specific: 'notify versus notifyAll' - a very common follow-up; answer with the single wait set and the lost-wakeup scenario.",
      "Frequency and companies: Tier 1 for Java and C# backend roles at Amazon, Oracle, Bloomberg, and most financial firms; Tier 2 for C and Go roles where the vocabulary differs."
    ],
    practiceProblems: [
      "Under Hoare semantics an if would suffice around wait; under Mesa it must be while. Explain the mechanism and why Mesa won. Answer: Hoare transfers the monitor directly to the waiter at the moment of signalling, so the predicate is guaranteed on return, but this costs two context switches per signal and needs an extra queue for the suspended signaller. Mesa moves the waiter to the entry queue and lets the signaller continue, so other threads can invalidate the predicate before the waiter runs. Mesa is cheaper and simpler, so every mainstream system adopted it, and the cost is one while loop.",
      "Why is notifyAll safer than notify in Java, and what does it cost? Answer: Java provides one wait set per object, so producers and consumers share a queue and notify may wake a thread that cannot proceed while the one that could stays asleep - a lost wakeup that deadlocks. notifyAll wakes everyone so the right thread definitely re-tests, at the cost of a thundering herd where N threads wake, contend for the monitor, and all but one sleep again. The better fix is ReentrantLock with separate Condition objects, which allows a precise signal.",
      "You must invoke registered listeners when a value changes. Sketch a safe design. Answer: Update the state under the monitor, take a snapshot of the listener collection while still holding it, release the monitor, then iterate the snapshot and invoke the callbacks with no lock held. This avoids calling unknown code under the lock, which prevents both ABBA deadlocks with locks the callbacks take and reentrant calls that would observe or mutate a half-updated invariant."
    ],
    faq: [
      {
        question: "What does a monitor give me that a mutex plus a condition variable does not?",
        answer:
          "Structurally nothing - a monitor is exactly a mutex plus condition variables plus the state they protect - but the bundling changes the failure modes substantially, and that is the whole point. With separate objects, the association between a piece of state and the lock that protects it exists only in the programmer's head and possibly in a comment, so the commonest concurrency bug in large codebases is a new code path that touches the state without taking the lock, or takes a different lock. A monitor makes the association structural: the data is private to the module and reachable only through procedures that hold the lock by construction. The second benefit is automatic release on every exit path. Manual lock and unlock pairs leak the lock whenever an early return or an exception escapes between them, and the resulting deadlock is far from the code that caused it. A synchronized block, a C# lock statement, or a Python with statement releases on any exit including a thrown exception, and the equivalent discipline in C++ is a scoped lock guard and in Java a try-finally around ReentrantLock. The third benefit is that the condition variables are attached to the same object, so it is obvious which mutex must be passed to wait - a mismatch there is undefined behaviour in POSIX and simply cannot be expressed in a monitor."
      },
      {
        question: "Are Java's synchronized blocks slow?",
        answer:
          "Not in the uncontended case, and the folklore that they are is roughly fifteen years out of date. The JVM implements uncontended locking with a thin lock: the object header holds a lock word, and entering the monitor is a compare-and-swap that stores the owning thread's identity, costing on the order of a few nanoseconds with no system call and no allocation. Biased locking went further, eliminating even the compare-and-swap when one thread repeatedly locked the same object, though it was deprecated and removed in later JDKs because it complicated the runtime and its benefit shrank as workloads became genuinely multithreaded. Only when a second thread actually contends does the JVM inflate the lock into a full OS monitor with a wait queue, at which point you pay the park and unpark costs of any futex-based mutex, roughly one to ten microseconds. Escape analysis removes locking entirely for objects the JIT can prove are thread-local. The practical implication is the same as everywhere else in this topic: the primitive is not the problem, contention is. If synchronized is showing up in profiles, reduce the size of the critical section, shard the lock across independent objects, or remove the shared state, rather than reaching for a supposedly faster primitive."
      },
      {
        question: "What is the nested monitor problem?",
        answer:
          "It is a deadlock that arises when a thread waits on a condition belonging to an inner monitor while still holding an outer one. The mechanism is precise: waiting releases only the monitor associated with the condition variable being waited on, and every other lock the thread holds stays held. So if thread one enters monitor A, then enters monitor B, then waits on a condition of B, it releases B and sleeps while continuing to hold A. Thread two, which would set the condition and signal, needs A to do its work, blocks at A's entry, and the signal is never sent. The result is a permanent deadlock that classical cycle-detection tools frequently miss, because the dependency runs through a condition variable rather than through a second lock acquisition, so there is no lock-order cycle to find. The remedy is structural rather than tactical. Do not wait on an inner monitor from inside an outer one; restructure so that the state a condition describes and the condition itself belong to a single monitor. Where a layered design genuinely requires two, invert the relationship so the outer layer waits on its own condition and the inner layer publishes results through a mechanism that does not require re-entering the outer monitor - a queue, a future, or a callback delivered without holding locks."
      },
      {
        question: "How do Go channels relate to monitors?",
        answer:
          "They are an alternative model rather than an implementation detail, though internally a Go channel is built from a mutex and wait queues much like a monitor. The conceptual difference is where the synchronisation lives. A monitor protects shared mutable state and coordinates threads that all reach into that state. A channel moves values between goroutines, and the Go idiom - share memory by communicating, rather than communicating by sharing memory - means that after a value is sent, the sender no longer touches it, so there is no shared mutable state left to protect. That eliminates entire categories of bug by construction: no forgotten lock, no predicate loop, no lock ordering, and no question of which mutex guards which field. It is not universally superior. Channels have real costs, since every handoff involves a lock and possibly a goroutine park, so a channel is far more expensive than an atomic increment for something like a shared counter, and Go's own standard library uses sync.Mutex and sync/atomic extensively where that is the right tool. Channels also make certain patterns awkward - a shared cache that many goroutines read is naturally a mutex-protected map or a sync.Map, not a channel-fronted server goroutine, which would serialise all readers. The sound rule is to use channels for transferring ownership and structuring pipelines, and mutexes for protecting state that is genuinely shared and read frequently."
      },
      {
        question: "When should I write my own monitor instead of using a library construct?",
        answer:
          "Rarely, and the bar should be high. The standard concurrency libraries - java.util.concurrent, System.Threading, Go's sync package, C++'s standard library plus its condition variables - already contain correct, tuned implementations of blocking queues, latches, barriers, semaphores, thread pools, and concurrent maps, and those implementations have had far more scrutiny and far more production hours than anything you will write for a single project. They also avoid the specific mistakes that keep recurring: an if instead of a while, a notify where notifyAll was required, a missed signal on an error path, a lock leaked by an exception. The legitimate reasons to write your own are a coordination pattern the library genuinely does not express, a measured performance requirement that the general-purpose implementation cannot meet because it is paying for generality you do not need, or an embedded environment without the library. Even then, build on the highest-level primitive available: prefer a ReentrantLock with named Condition objects to raw synchronized and wait, because separate condition queues let you signal precisely rather than broadcasting; wrap acquisition in try-finally or a scope guard so no path leaks the lock; write the predicate loop before writing anything else; and test with a race detector and with far more threads than cores so the interleavings you did not consider actually occur."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Lampson and Redell - Experience with Processes and Monitors in Mesa (CACM 1980)",
        insight: "The source of Mesa semantics; states plainly why immediate transfer was rejected and why waiters must re-check, which is the origin of the while loop rule."
      },
      {
        source: "book",
        attribution: "Goetz et al. - Java Concurrency in Practice, chapters 5 and 14",
        insight: "The definitive treatment of notify versus notifyAll, the single wait set problem, and why library constructs should be preferred to hand-written monitors."
      },
      {
        source: "note",
        attribution: "Hoare - Monitors: An Operating System Structuring Concept (CACM 1974)",
        insight: "The original formulation, useful for contrast: it shows exactly what guarantee Mesa gave up and what that guarantee would have cost."
      }
    ]
  },
  {
    id: "topic-os-classic-sync-problems",
    moduleId: "mod-os-synchronization",
    title: "The Classic Synchronization Problems",
    intuition:
      "Producer-consumer, readers-writers, and dining philosophers are not historical curiosities; they are the three canonical shapes that real coordination problems reduce to. Producer-consumer is buffering and backpressure, which is every queue, every pipeline, and every thread pool. Readers-writers is shared state with asymmetric access, which is every cache and every configuration object, and it teaches that fairness policy is a design decision rather than an implementation detail. Dining philosophers is resource ordering, which is every situation where a thread needs two or more locks - and its lesson, that a global acquisition order eliminates deadlock by construction, is the single most useful rule in multi-lock code.",
    complexity: {
      time:
        "All three are O(1) per operation in the algorithmic sense; what matters is contention. Producer-consumer on a single lock serialises at roughly one handoff per lock round trip, around 100 nanoseconds contended. Sharded or lock-free queues raise that ceiling substantially by removing the single contended cache line.",
      space:
        "A bounded buffer of N slots plus one mutex and two condition variables. Readers-writers adds a counter and possibly a waiting-writer count. Dining philosophers needs one lock per fork, and the ordered-acquisition solution needs no extra state at all, which is part of why it is the preferred answer."
    },
    lesson: [
      {
        title: "Producer-Consumer: Buffering and Backpressure",
        content:
          "A bounded buffer decouples producers from consumers so that neither has to run at the other's rate, and the bound is the essential part. An unbounded queue looks friendlier but converts a throughput mismatch into unbounded memory growth, so the process eventually dies from memory exhaustion instead of slowing down, and it dies long after the mismatch began, which makes diagnosis harder. A bounded buffer applies backpressure: when it is full, producers block, and the slowdown propagates upstream to whatever is generating work. The canonical implementation needs one mutex and two condition variables, not one, because producers and consumers wait for different predicates - if they share a queue, a signal intended for a consumer may wake a producer that immediately sleeps again, and the actual waiter is never woken. Both waits must use while loops. In practice you should almost never write this yourself: a blocking queue from the standard library is the same structure with the loops already correct.",
        codeExample: `#include <pthread.h>

#define N 16
typedef struct {
    int buf[N], head, tail, count;
    pthread_mutex_t m;
    pthread_cond_t not_full, not_empty;   /* TWO, not one */
} bbuf;

void put(bbuf *b, int x) {
    pthread_mutex_lock(&b->m);
    while (b->count == N)                        /* WHILE */
        pthread_cond_wait(&b->not_full, &b->m);
    b->buf[b->tail] = x;
    b->tail = (b->tail + 1) % N;
    b->count++;
    pthread_cond_signal(&b->not_empty);          /* precise wakeup */
    pthread_mutex_unlock(&b->m);
}

int take(bbuf *b) {
    pthread_mutex_lock(&b->m);
    while (b->count == 0)
        pthread_cond_wait(&b->not_empty, &b->m);
    int x = b->buf[b->head];
    b->head = (b->head + 1) % N;
    b->count--;
    pthread_cond_signal(&b->not_full);
    pthread_mutex_unlock(&b->m);
    return x;
}

/* Why TWO condition variables:
     with one shared cv, signal() may wake a PRODUCER when a
     CONSUMER needed waking. The producer re-tests, finds the
     buffer still full, sleeps again ──▶ lost wakeup ──▶ hang.
   With one cv you MUST broadcast, which wakes N threads so that
   one can proceed - a thundering herd on every operation. */

/* Why BOUNDED matters more than it looks:
     unbounded queue + producers faster than consumers
       ──▶ latency grows without limit, memory grows without limit,
           the process OOMs minutes after the real problem started.
     bounded queue ──▶ producers block ──▶ backpressure reaches the
           source ──▶ the system degrades gracefully and visibly. */`
      },
      {
        title: "Readers-Writers: Fairness Is a Policy Choice",
        content:
          "The readers-writers problem permits any number of concurrent readers or exactly one writer, and the interesting content is entirely in what happens when both are waiting. A reader-preferring solution lets an arriving reader join an in-progress read even if a writer is queued, which maximises read throughput and starves writers under continuous read load - a configuration object that is read constantly may never be updated. A writer-preferring solution blocks new readers as soon as a writer is waiting, which bounds writer latency and can starve readers under continuous write load. A task-fair solution queues everyone in arrival order, so readers that arrive consecutively still batch, but a reader arriving after a waiting writer must wait, which gives bounded waiting for both at some throughput cost. There is no universally correct choice: a metrics registry that is read constantly and written rarely wants reader preference, while a configuration store that must apply updates promptly wants writer preference. Most standard library implementations default to something close to task-fair for exactly this reason.",
        diagram: asciiDiagram(`Three fairness policies, same arrival sequence

  Arrivals over time:  R1 R2 [W1] R3 R4 R5 R6 ...  (reads keep coming)

  READER-PREFERRING
     R1 ──────▶
     R2 ──────▶      readers overlap freely
     R3     ──────▶  new readers join the in-progress read
     R4       ──────▶
     R5         ──────▶
     W1 ................................. STARVED ✗
     ──▶ max read throughput, writer may NEVER run

  WRITER-PREFERRING
     R1 ──────▶
     R2 ──────▶
                │ W1 waiting ──▶ GATE CLOSES to new readers
     W1         ──────▶ (runs as soon as R1,R2 drain)
     R3                 ──────▶
     R4                 ──────▶
     ──▶ bounded writer latency; readers starve if writes are continuous

  TASK-FAIR (arrival order, adjacent readers still batch)
     R1 ──────▶
     R2 ──────▶   ┐ batch
     W1         ──────▶
     R3                 ──────▶ ┐
     R4                 ──────▶ ┘ batch
     ──▶ bounded waiting for BOTH, slightly lower peak throughput
         ──▶ this is what most standard libraries actually do

  Choose by workload:
     read-constantly, write-rarely (metrics)   ──▶ reader preference
     updates must land promptly (config)       ──▶ writer preference
     unknown / general purpose                 ──▶ task-fair`)
      },
      {
        title: "Dining Philosophers: Ordered Acquisition",
        content:
          "Five philosophers sit around a table with one fork between each pair, and each needs both neighbouring forks to eat. If every philosopher picks up the left fork first, all five can succeed simultaneously, and then all five wait forever for a right fork that no one will release - a textbook deadlock in which all four Coffman conditions hold. Several solutions exist and it is worth knowing why one dominates. Limiting the table to four simultaneous diners with a semaphore breaks the hold-and-wait pattern by guaranteeing at least one philosopher can always complete. Having odd-numbered philosophers reverse their pick-up order breaks the circular wait asymmetrically. Acquiring both forks atomically under a global lock works but serialises the table. The best answer is a global ordering on the resources: number the forks and always acquire the lower-numbered one first, which means the last philosopher takes his right fork first and the cycle cannot form. This generalises directly to real systems as the lock-ordering rule, and it is the standard prescription for any code that takes more than one lock.",
        codeExample: `/* Deadlock: everyone takes their LEFT fork first. */
void philosopher_broken(int i) {
    lock(&fork[i]);              /* left  */
    lock(&fork[(i + 1) % 5]);    /* right ──▶ all 5 block here */
    eat();
    unlock(&fork[(i + 1) % 5]);
    unlock(&fork[i]);
}

/* Solution: GLOBAL RESOURCE ORDERING. Always take the lower id first. */
void philosopher_ordered(int i) {
    int a = i, b = (i + 1) % 5;
    int lo = a < b ? a : b, hi = a < b ? b : a;
    lock(&fork[lo]);
    lock(&fork[hi]);
    eat();
    unlock(&fork[hi]);
    unlock(&fork[lo]);
}
/* Philosopher 4 now takes fork 0 before fork 4 - the asymmetry that
   breaks the cycle. No extra state, no semaphore, no arbitrator. */

/* This IS the real-world lock ordering rule: */
void transfer(account *from, account *to, long amount) {
    account *first  = from->id < to->id ? from : to;
    account *second = from->id < to->id ? to   : from;
    lock(&first->m);
    lock(&second->m);            /* ──▶ transfer(A,B) and transfer(B,A)
                                       now acquire in the SAME order */
    from->balance -= amount;
    to->balance   += amount;
    unlock(&second->m);
    unlock(&first->m);
}

/* Alternative when no natural order exists - try-and-back-off: */
while (1) {
    lock(&a->m);
    if (trylock(&b->m) == 0) break;   /* got both */
    unlock(&a->m);
    nanosleep(&randomised_backoff, NULL);  /* randomise or you LIVELOCK */
}`
      },
      {
        title: "What These Problems Actually Teach",
        content:
          "Each classic problem encodes one transferable rule. Producer-consumer teaches that bounds are a feature, because backpressure turns an unbounded memory failure into a visible slowdown at the source, and it teaches that distinct predicates need distinct condition queues. Readers-writers teaches that fairness is a policy with no default answer, and that the asymmetry between readers and writers must be resolved deliberately based on workload rather than inherited from whichever implementation was nearest. Dining philosophers teaches resource ordering, which is the single most practical deadlock-prevention technique because it requires no runtime machinery and no detection - it makes the cycle unconstructible. There is also a meta-lesson that interviewers look for: all three are solved in every standard library, and the mark of experience is recognising the shape, naming the standard solution, and only then discussing the hand-rolled version. A candidate who says 'this is producer-consumer, so a bounded blocking queue, and here is why bounded matters' is demonstrating more than one who immediately starts writing condition variables.",
        diagram: asciiDiagram(`Recognising the shape in real systems

  PRODUCER-CONSUMER
    ┌──────────┐   bounded    ┌──────────┐
    │ producer │──▶ [ □□□□ ] ──▶ consumer │
    └──────────┘   backpressure└──────────┘
    Real instances: thread pool queue, log shipper, Kafka consumer,
                    HTTP request buffer, media decode pipeline
    Rule learned:  BOUND IT. Two condition queues, not one.

  READERS-WRITERS
              ┌── reader ──┐
    shared ◀──┼── reader ──┤   many concurrent
    state     ┌── reader ──┘
        ▲     └── WRITER ─────  exclusive
        │
    Real instances: config object, route table, metrics registry,
                    in-memory cache, DNS resolver cache
    Rule learned:  fairness is a POLICY. Pick it deliberately.

  DINING PHILOSOPHERS
      P0 ──fork0── P1 ──fork1── P2
       │                         │
     fork4                     fork2
       │                         │
      P4 ──────── fork3 ──────── P3
    Real instances: bank transfer (two accounts), graph algorithms
                    locking two nodes, two-phase commit, any code
                    that takes more than one lock
    Rule learned:  GLOBAL ACQUISITION ORDER. Cycles become
                   unconstructible - prevention, not detection.`)
      }
    ],
    examples: [
      {
        title: "An unbounded queue that killed a service",
        input: "A log-shipping service uses an unbounded in-memory queue; the downstream sink slows by 20%.",
        output: "The process OOMs 40 minutes later with no obvious trigger.",
        explanation:
          "Step 1: Producers outpace consumers by 20%, so the queue grows steadily rather than reaching a steady state.\nStep 2: Nothing signals the problem, since producers never block and latency inside the queue is not measured.\nStep 3: Memory grows until the OOM killer intervenes, long after the slowdown began, so the correlation is lost.\nStep 4: A bounded queue would have blocked producers within seconds, pushing backpressure to the request path where it is visible and where load shedding can happen deliberately."
      },
      {
        title: "Writer starvation in a metrics registry",
        input: "A reader-preferring rwlock guards a metrics map read by 200 threads and updated by a config thread.",
        output: "The config update takes minutes to apply, or never applies.",
        explanation:
          "Step 1: Under reader preference, an arriving reader joins the in-progress read even with a writer queued.\nStep 2: With 200 reader threads there is essentially never a moment with zero active readers.\nStep 3: The writer waits for a gap that never occurs - starvation, not deadlock, so no detector fires.\nStep 4: Switching to a writer-preferring or task-fair lock bounds the writer's wait, and a copy-on-write snapshot removes the contention entirely."
      },
      {
        title: "Bank transfer deadlock and its two-line fix",
        input: "transfer(A, B) and transfer(B, A) run concurrently, each locking the source account then the destination.",
        output: "Deadlock under load; reproduces only when both directions overlap.",
        explanation:
          "Step 1: Thread 1 holds A's lock and waits for B's; thread 2 holds B's and waits for A's - a circular wait.\nStep 2: This is dining philosophers with two forks and no natural asymmetry.\nStep 3: Order the acquisitions by a stable key such as the account id, always locking the lower id first.\nStep 4: Both directions now acquire A before B, the cycle cannot form, and the fix needs no detection machinery or timeouts."
      }
    ],
    tips: [
      "Name the shape before writing code: saying 'this is producer-consumer, so a bounded blocking queue' shows pattern recognition that a condition-variable dump does not.",
      "For producer-consumer, always justify two condition variables and the bound - those are the two details interviewers probe.",
      "For any multi-lock question, reach immediately for global ordering; it is prevention rather than detection and needs no extra state."
    ],
    tricks: [
      "Unbounded queues do not remove backpressure, they relocate it to the memory allocator, where it presents as an OOM long after the cause.",
      "If you use one condition variable for two different predicates, you must broadcast; if you want to signal, you need two queues.",
      "Any try-lock-and-back-off scheme must randomise the backoff, or two threads retry in lockstep and you have traded a deadlock for a livelock."
    ],
    memoryAids: [
      "Producer-consumer means bound it; readers-writers means pick a fairness policy; philosophers means order your locks.",
      "An unbounded queue does not remove backpressure, it relocates it to the allocator.",
      "Lowest id first - two lines that make a deadlock cycle unconstructible."
    ],
    interviewPatterns: [
      "Implementation: 'write a bounded buffer' - the most frequently asked concurrency coding question in existence.",
      "Design probe: 'how do you avoid deadlock when a transfer needs two account locks' - dining philosophers in disguise.",
      "Frequency and companies: Tier 1 everywhere; the bounded buffer appears at Amazon, Microsoft, Bloomberg, Goldman Sachs, and virtually every trading firm."
    ],
    practiceProblems: [
      "Implement a bounded buffer supporting multiple producers and consumers, and justify every design choice. Answer: One mutex protecting buffer, head, tail, and count; two condition variables not_full and not_empty so each signal reaches a waiter that can actually proceed; while loops around both waits for Mesa semantics and spurious wakeups; signal rather than broadcast because the two queues make the wakeup precise; and a fixed bound so that a producer-consumer rate mismatch produces backpressure instead of unbounded memory growth.",
      "Design a readers-writers lock that cannot starve writers, and state the cost. Answer: Maintain a waiting-writer count. A reader entering must check that count and block if it is non-zero, which closes the gate as soon as a writer queues. Writers then wait only for the currently active readers to drain, bounding their latency to one read critical section. The cost is that readers arriving behind a writer wait even though they could have proceeded safely, reducing peak read throughput - the deliberate trade of task-fair and writer-preferring designs.",
      "Give three distinct solutions to dining philosophers and say which generalises best. Answer: Limit concurrent diners to N-1 with a semaphore, which breaks hold-and-wait; make odd philosophers reverse their pick-up order, which breaks circular wait asymmetrically; and impose a global fork ordering so everyone takes the lower-numbered fork first. The third generalises best because it needs no extra state and no arbitrator, and it applies unchanged to any code taking multiple locks - order them by a stable key such as an object id or address."
    ],
    faq: [
      {
        question: "Why does the bounded buffer need two condition variables?",
        answer:
          "Because producers and consumers wait on different predicates, and a condition variable is a queue of threads waiting on one predicate. Producers wait for the buffer to be not full; consumers wait for it to be not empty. If both sleep on a single condition variable, then when a consumer removes an item and signals, the implementation is free to wake any waiter - and it may wake another consumer, which re-tests, finds the buffer empty, and sleeps again, while the producer that was waiting for space is never woken. Because that signal has already been consumed, it is gone; this is a lost wakeup and it deadlocks the system with a full buffer and a sleeping producer. With one condition variable the only correct option is broadcast, which wakes every waiter so at least the right one re-tests. That works, but it produces a thundering herd on every single operation: N threads wake, contend for the mutex, and all but one immediately sleep again, which wastes context switches and generates lock contention proportional to the number of waiters. Two condition variables make each signal precise, so exactly one thread that can actually make progress is woken, and cost stays constant regardless of how many threads are blocked. The same reasoning applies whenever several distinct predicates would otherwise share a queue, and it is the main practical argument for Java's ReentrantLock with multiple Condition objects over synchronized with its single wait set."
      },
      {
        question: "Should queues be bounded or unbounded in practice?",
        answer:
          "Bounded, in essentially all cases, and the reasoning is about failure modes rather than performance. An unbounded queue does not eliminate the mismatch between production and consumption rates; it converts a rate problem into a memory problem and delays the symptom. If producers run even slightly faster than consumers, the queue grows without limit, in-queue latency grows without limit, and the process eventually dies from memory exhaustion - typically long after the underlying slowdown started, so the correlation between cause and effect is lost and diagnosis is painful. A bounded queue makes the mismatch visible immediately: producers block, and that backpressure propagates upstream to whatever is generating work, where it can be handled deliberately by shedding load, returning a 503, slowing an ingestion loop, or scaling out. The right bound is usually small - large enough to absorb bursts on the timescale of your consumers' jitter, and no larger, because a very deep queue is functionally an unbounded one with a slower failure. Choosing what happens when the bound is reached is a separate and equally important decision: block the producer, drop the newest item, drop the oldest item, or reject with an error. Real-time telemetry usually prefers dropping the oldest, request handling usually prefers rejecting so the caller learns immediately, and internal pipelines usually prefer blocking. What you should never do is silently grow."
      },
      {
        question: "Is the dining philosophers problem actually relevant to real code?",
        answer:
          "Very much so, though it rarely arrives labelled as such. It is the abstract form of any situation in which a thread must hold more than one lock at once, and the deadlock it demonstrates appears in production constantly. The canonical instance is a bank transfer that locks the source account and then the destination: run transfer(A, B) and transfer(B, A) concurrently and you have exactly the circular wait, with two forks instead of five. The same shape appears when locking two nodes of a graph to update an edge, when a two-phase commit acquires resources in caller-determined order, when a cache and a loader each hold state the other needs, and whenever an object's method takes its own lock and then calls into another object that does the same. The problem's real contribution is its solution: impose a total order on resources and always acquire in that order. This is prevention rather than detection - the cycle becomes unconstructible, so no detector, timeout, or recovery path is needed. In real code the order is usually derived from something stable such as an object id, a primary key, or even a memory address, and the acquisition site sorts before locking. When no natural order exists, the fallback is try-lock with backoff: take the first lock, attempt the second, and on failure release the first and retry after a randomised delay. Randomisation is not optional there, since synchronised retries produce livelock instead of deadlock."
      },
      {
        question: "How do I choose a fairness policy for a readers-writers lock?",
        answer:
          "From the workload and from what a delay actually costs, because none of the three policies is generally correct. Reader preference maximises read throughput by letting arriving readers join an in-progress read, and it starves writers whenever the read rate is high enough that active readers never drop to zero - a metrics registry read by 200 threads will effectively never let a writer in. Choose it only when writes are genuinely rare, latency-insensitive, and ideally driven by a process that can retry. Writer preference closes the gate to new readers the moment a writer queues, so writer latency is bounded by one read critical section, at the cost of starving readers under sustained write load. Choose it when updates must land promptly and staleness has a real cost, such as a feature flag or a routing table. Task-fair queuing serves everyone in arrival order while still allowing adjacent readers to batch, giving bounded waiting to both classes at a modest throughput cost, and it is what most standard library implementations approximate precisely because it has no catastrophic case. Before settling on any of them, ask whether you need a reader-writer lock at all: for short critical sections a plain mutex is often faster because rdlock still performs an atomic write to a shared counter, and for read-dominated data a copy-on-write snapshot lets readers proceed with a single acquire load and no contention whatsoever, which sidesteps the fairness question completely."
      },
      {
        question: "What is the difference between deadlock, livelock, and starvation here?",
        answer:
          "They are three distinct failure modes that a superficial glance can confuse, and distinguishing them is a standard interview probe. Deadlock is a permanent circular wait: each thread holds a resource another needs, no thread can proceed, and the situation cannot resolve itself no matter how long you wait - the philosophers each holding a left fork are deadlocked. It is diagnosable from a stack dump, since every involved thread is blocked at a lock acquisition and the cycle is visible. Livelock is threads actively executing but making no progress, typically produced by a naive deadlock avoidance scheme: philosophers who all pick up the left fork, notice the right is taken, put the left down, and retry in unison will loop forever while burning CPU. It is harder to spot than deadlock precisely because the process looks busy, and the standard fix is randomised backoff so the symmetry breaks. Starvation is a specific thread being perpetually denied a resource that other threads are successfully obtaining, so the system as a whole makes progress and one participant does not - the writer waiting behind an endless stream of readers is starved, as is a low-weight task on a saturated CPU. Starvation is the hardest of the three to detect because throughput metrics look healthy; you find it by measuring per-participant wait times, such as wait_max for a task or the age of the oldest queued writer, rather than aggregate rates."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Downey - The Little Book of Semaphores",
        insight: "Works through all three classics plus many variants with semaphores only, which makes the fairness and lost-wakeup subtleties unusually explicit."
      },
      {
        source: "paper",
        attribution: "Dijkstra - Hierarchical Ordering of Sequential Processes (EWD310, 1971)",
        insight: "The original dining philosophers formulation and the resource-ordering argument that remains the standard deadlock prevention technique fifty years later."
      },
      {
        source: "interview-experience",
        attribution: "Widely reported concurrency rounds at Amazon, Bloomberg, and trading firms",
        insight: "The bounded buffer is asked more often than any other concurrency implementation; the two follow-ups that separate candidates are why two condition variables and why the buffer must be bounded."
      }
    ]
  },
  {
    id: "topic-os-lock-free-basics",
    moduleId: "mod-os-synchronization",
    title: "Lock-Free Programming: Atomics, CAS, and the ABA Problem",
    intuition:
      "Lock-free does not mean fast; it means that at least one thread makes progress regardless of what any other thread does, including being preempted or killed mid-operation. That property is what you are actually buying: a lock-based structure stops entirely if its holder is descheduled, while a lock-free one does not, which matters enormously for latency tails, for signal handlers, and for anything that must not block. The mechanism is compare-and-swap in a retry loop - read the current value, compute a new one, and swap only if nothing changed - and the hard parts are that the retry loop is not obviously bounded, that memory reclamation becomes unsolved, and that ABA makes 'nothing changed' a lie.",
    complexity: {
      time:
        "An uncontended compare-and-swap is roughly 20 to 50 cycles, comparable to a mutex acquire. Under contention throughput can be worse than a lock, because every failed CAS wastes a full cache-line transfer of 100 to 300 cycles and the loop retries; a mutex at least parks the loser instead of burning coherence bandwidth.",
      space:
        "The data structure itself is often smaller than the locked equivalent, but safe reclamation is not free: hazard pointers cost one slot per thread per protected reference, and epoch-based reclamation defers frees, so memory usage rises with the number of in-flight readers rather than with the live set."
    },
    lesson: [
      {
        title: "Compare-and-Swap and the Retry Loop",
        content:
          "Compare-and-swap takes a memory location, an expected value, and a new value, and atomically writes the new value only if the location still holds the expected one, reporting whether it succeeded. Every lock-free algorithm is built from this shape: read the current state, compute the desired next state, attempt the swap, and on failure re-read and try again. The failure case is not an error but the normal mechanism for detecting that someone else got there first. What distinguishes lock-free from wait-free is exactly this loop - lock-free guarantees system-wide progress because a failed CAS implies someone else succeeded, while wait-free additionally guarantees per-thread progress with a bounded number of steps, which requires helping schemes and is far more complex. The practical consequence of the retry loop is that lock-free structures degrade under contention rather than serialising: as more threads pile on, the failure rate rises, each failure costs a cache-line transfer, and total throughput can fall below the mutex-based version even though no thread is ever blocked.",
        codeExample: `#include <stdatomic.h>

/* The universal shape of every lock-free update. */
void atomic_max(_Atomic long *target, long candidate) {
    long cur = atomic_load_explicit(target, memory_order_relaxed);
    while (candidate > cur) {
        /* Writes the OBSERVED value back into cur on failure, so the
           loop needs no explicit re-read. */
        if (atomic_compare_exchange_weak_explicit(
                target, &cur, candidate,
                memory_order_release, memory_order_relaxed))
            return;                 /* succeeded */
        /* failed ──▶ cur now holds the current value ──▶ retry */
    }
}

/* Lock-free stack push - the classic Treiber stack. */
typedef struct node { struct node *next; int val; } node;
_Atomic(node *) top;

void push(node *n) {
    n->next = atomic_load_explicit(&top, memory_order_relaxed);
    while (!atomic_compare_exchange_weak_explicit(
               &top, &n->next, n,
               memory_order_release, memory_order_relaxed))
        ;                           /* n->next auto-updated on failure */
}

/* weak vs strong:
     _weak   may fail SPURIOUSLY even when the value matches, but
             compiles to a single LL/SC pair on ARM/POWER.
             Correct and FASTER inside a loop you retry anyway.
     _strong retries internally to suppress spurious failure.
             Use only when there is no surrounding loop. */

/* Progress guarantees, strongest to weakest:
     wait-free    every thread finishes in a BOUNDED number of steps
     lock-free    at least ONE thread makes progress system-wide
     obstruction-free  a thread finishes if it runs in ISOLATION
     blocking     a descheduled holder stops everyone                */`
      },
      {
        title: "The ABA Problem: When 'Unchanged' Is a Lie",
        content:
          "Compare-and-swap answers the question 'is this location still equal to what I read', which is not the question you actually wanted answered - you wanted to know whether anything had changed. Those differ whenever a value can return to a previous state. In a lock-free stack, thread one reads the top pointer as node A and is preempted. Thread two pops A, pops B, and then pushes A back, so the top pointer is A again but A's next pointer now points somewhere entirely different. Thread one resumes, its CAS sees A and succeeds, and the stack is corrupted - typically by resurrecting a node that has been freed or by losing every node that was pushed in between. This is the ABA problem, and it is the reason naive lock-free code passes review and fails in production. The standard remedies are a tagged pointer, where a monotonically increasing counter is packed alongside the pointer so that a reused address still fails the comparison, or a hardware primitive that detects any intervening write such as load-linked/store-conditional on ARM and POWER, which fails if the cache line was touched at all.",
        diagram: asciiDiagram(`ABA: the pointer is the same, the world is not

  Stack:  top ──▶ [A] ──▶ [B] ──▶ [C] ──▶ NULL

  T1: reads  top = A,  next = A->next = B
      computes "new top should be B"
      ── PREEMPTED here ──────────────────────────┐
                                                  │
  T2: pop A          top ──▶ [B] ──▶ [C]          │
      pop B          top ──▶ [C]                  │
      free(B)        ◀── B is now GARBAGE         │
      push A         top ──▶ [A] ──▶ [C]          │
                             ▲                    │
                    A is back on top,             │
                    but A->next is now C          │
                                                  │
  T1: resumes ◀───────────────────────────────────┘
      CAS(top, expected=A, new=B)
           top IS A  ──▶ CAS SUCCEEDS ✗
      Result: top ──▶ [B] ──▶ ???
              B was FREED. Use-after-free, and [C] is lost.

  The CAS answered "is it still A?" - TRUE.
  You needed "has anything changed?" - FALSE.

  FIX 1 - tagged pointer (128-bit CAS, or pack a counter in spare bits):
      struct { node *ptr; uintptr_t tag; }
      every push/pop increments tag ──▶ {A, 7} != {A, 9} ──▶ CAS fails ✓

  FIX 2 - LL/SC (ARM, POWER, RISC-V):
      store-conditional fails if the line was written AT ALL,
      regardless of the value ──▶ ABA impossible by construction ✓

  FIX 3 - never reuse the memory while a reader might hold it:
      hazard pointers / epoch-based reclamation / RCU`)
      },
      {
        title: "Memory Reclamation: The Actual Hard Problem",
        content:
          "In a lock-based structure, freeing a removed node is trivial because the lock guarantees no other thread is looking at it. In a lock-free structure there is no such moment: a thread may have loaded a pointer to a node microseconds before you unlinked it, and may dereference it at any time afterwards. Freeing immediately is a use-after-free, and never freeing is a leak, so lock-free code needs an explicit reclamation scheme. Hazard pointers have each thread publish, in a per-thread slot, the pointers it is currently dereferencing; a thread wishing to free scans all published slots and defers the free if its node appears, which gives bounded memory at the cost of a store and a fence on every read. Epoch-based reclamation has threads announce entry into a critical region by recording a global epoch, and memory retired in epoch N is freed only once every thread has been observed past N; reads are much cheaper but a single stalled thread can pin memory indefinitely. Read-copy-update, used pervasively in the Linux kernel, is a variant where readers are free and reclamation waits for a grace period during which every CPU has passed through a quiescent state. Garbage-collected languages get all of this for free, which is precisely why lock-free code is dramatically easier in Java or Go than in C.",
        diagram: asciiDiagram(`Why you cannot just free() in lock-free code

  T1: p = atomic_load(&head);   ◀── holds a pointer to node X
      ── preempted ──
  T2: unlink X from the list
      free(X)                    ◀── X returned to the allocator
      malloc(...) ──▶ reuses X's memory for something else
  T1: resumes, reads p->field   ──▶ USE-AFTER-FREE ✗

  HAZARD POINTERS - readers publish what they hold
  ┌──────────────────────────────────────────────┐
  │ hazard[T1] = X        ◀── published before   │
  │ hazard[T2] = NULL         dereferencing      │
  │ hazard[T3] = Y                               │
  └──────────────────────────────────────────────┘
     retire(X) ──▶ scan all hazard slots
                   X found in hazard[T1] ──▶ DEFER
                   later scan: not found ──▶ free(X) ✓
     cost: one store + fence per READ
     benefit: memory bounded by (threads x max hazards)

  EPOCH-BASED - readers announce an epoch, not a pointer
     global epoch: 7
     T1 enters ──▶ local_epoch[T1] = 7
     retire(X) ──▶ tagged with epoch 7
     free X only when ALL threads have been seen at epoch >= 8
     cost: nearly free on the read side
     risk: ONE stalled thread pins every retired object ──▶ unbounded

  RCU (Linux kernel) - readers are literally free
     rcu_read_lock() is a compiler barrier, often a NO-OP
     writer: unlink, then synchronize_rcu() waits for a grace period
     ──▶ perfect read scaling, writers pay everything

  Managed languages: the GC already solves this.
  ──▶ this is why lock-free is far easier in Java/Go than in C.`)
      },
      {
        title: "When Lock-Free Is Actually Worth It",
        content:
          "The honest answer is: less often than enthusiasm suggests. Lock-free is worth the complexity when blocking is unacceptable rather than merely undesirable - in a signal handler where taking a lock can self-deadlock, in an interrupt context, in hard real-time code where a priority inversion would miss a deadline, or in a system where a thread may be killed or preempted arbitrarily and must not take the structure down with it. It is also worth it for genuinely simple state: a counter, a flag, a sequence number, a single-pointer configuration swap. These are the cases where the atomic operation is the entire algorithm, so there is no retry loop to analyse and no reclamation problem to solve. For anything with real structure - a queue, a map, a list - the sober advice is to use a well-tested library implementation rather than writing your own, because the bugs are non-deterministic, survive code review, and often survive testing too. And measure first: a sharded design that gives each thread its own mutex-protected partition frequently outperforms a single lock-free structure, because it eliminates the contended cache line entirely rather than fighting over it.",
        codeExample: `/* WORTH IT - the atomic operation IS the whole algorithm. */
_Atomic long requests;
atomic_fetch_add_explicit(&requests, 1, memory_order_relaxed);

_Atomic(config_t *) live_config;                 /* pointer swap */
const config_t *c = atomic_load_explicit(&live_config,
                                         memory_order_acquire);

_Atomic bool shutting_down;                      /* safe in a signal
                                                    handler; a mutex
                                                    is NOT */

/* NOT WORTH IT - hand-rolling structure. Use the library: */
//   C++    boost::lockfree::queue, folly::MPMCQueue
//   Java   ConcurrentLinkedQueue, ConcurrentHashMap, LongAdder
//   Go     sync.Map, sync/atomic
//   Rust   crossbeam::queue

/* OFTEN BETTER THAN BOTH - shard, and remove the sharing: */
struct counter_shard {
    _Atomic long v;
    char pad[64 - sizeof(long)];    /* own cache line: no false sharing */
} shards[NUM_CPUS];

void bump(void) {
    atomic_fetch_add_explicit(&shards[cpu_id()].v, 1,
                              memory_order_relaxed);
}
long total(void) {                  /* readers pay; writers scale */
    long s = 0;
    for (int i = 0; i < NUM_CPUS; i++)
        s += atomic_load_explicit(&shards[i].v, memory_order_relaxed);
    return s;
}
/* This is exactly what Java's LongAdder does, and it beats both a
   single AtomicLong and a mutex-protected long by a wide margin
   under write-heavy load. */`
      }
    ],
    examples: [
      {
        title: "A lock-free stack corrupted by ABA",
        input: "A Treiber stack in C using a plain pointer CAS, running on x86-64 under heavy push/pop churn.",
        output: "Rare crashes with a freed node linked back into the stack.",
        explanation:
          "Step 1: A popping thread reads top as A and its next as B, then stalls.\nStep 2: Other threads pop A and B, free B, and push A back, so top is A again but A's next is now a different node.\nStep 3: The stalled thread's CAS compares equal and succeeds, installing the freed B as the new top.\nStep 4: A tagged pointer with a version counter, updated on every modification, makes the comparison fail, and a reclamation scheme is still needed so B is not freed while readers hold it."
      },
      {
        title: "Lock-free that was slower than a mutex",
        input: "A single lock-free counter incremented by 32 threads on a 32-core machine.",
        output: "Throughput roughly 3x worse than a sharded mutex design.",
        explanation:
          "Step 1: Every increment is a CAS on one cache line, so that line ping-pongs across all 32 cores.\nStep 2: Under this contention most CAS attempts fail, and each failure still costs a full 100-300 cycle line transfer.\nStep 3: Lock-freedom guarantees progress, not throughput - it removes blocking, not coherence traffic.\nStep 4: Sharding the counter so each core increments its own padded cache line, and summing on read, removes the sharing entirely - which is exactly what Java's LongAdder does."
      },
      {
        title: "An atomic flag that needed a barrier",
        input: "A worker publishes results then sets an atomic done flag with memory_order_relaxed; the reader sometimes sees stale results.",
        output: "Correct on x86, broken on ARM - the relaxed ordering provided no publication guarantee.",
        explanation:
          "Step 1: relaxed ordering guarantees atomicity of the flag itself and nothing about surrounding operations.\nStep 2: The result writes may therefore become visible after the flag store on a weakly-ordered machine.\nStep 3: The reader observes done as true and reads results that have not landed yet.\nStep 4: The store must be memory_order_release and the load memory_order_acquire, which establishes the happens-before edge that makes the results visible."
      }
    ],
    tips: [
      "Define lock-free by its progress guarantee, not by performance - 'at least one thread makes progress regardless of what others do' is the answer interviewers want.",
      "Bring up ABA unprompted whenever you sketch a lock-free structure; recognising it is the main signal that you have done this for real.",
      "Say explicitly that memory reclamation, not the algorithm, is the hard part in a non-garbage-collected language."
    ],
    tricks: [
      "compare_exchange_weak inside a retry loop is both correct and faster than strong on ARM and POWER, because it maps to a bare LL/SC pair.",
      "If lock-free code is slower than the mutex version, the problem is the contended cache line - shard the state rather than tuning the loop.",
      "Relaxed ordering is for counters where only the final total matters; anything that publishes data to another thread needs release/acquire."
    ],
    memoryAids: [
      "Lock-free is a progress guarantee, not a speed guarantee: someone advances, not necessarily you.",
      "CAS answers 'is it still A', not 'did anything change' - that gap is ABA.",
      "In C the algorithm is the easy half; reclamation is the hard half. In Java the GC already did it."
    ],
    interviewPatterns: [
      "Definition probe: 'what does lock-free mean' - progress guarantee, and the distinction from wait-free.",
      "Depth probe: 'implement a lock-free stack' followed immediately by 'what goes wrong' - the expected answer is ABA plus reclamation.",
      "Frequency and companies: Tier 2 generally, Tier 1 for systems, database, kernel, and trading roles at Jane Street, Citadel, Nvidia, and infrastructure teams at Google and Meta."
    ],
    practiceProblems: [
      "Explain ABA using a lock-free stack and give two fixes. Answer: A popping thread reads top as A with next B, stalls, and meanwhile A is popped, B is popped and freed, and A is pushed back with a different next. The stalled CAS sees A, succeeds, and installs a freed node. Fix one is a tagged pointer - pack a version counter with the pointer and use a double-width CAS so a reused address still compares unequal. Fix two is LL/SC on ARM or POWER, where store-conditional fails if the line was written at all, regardless of value.",
      "Why is a single lock-free counter sometimes slower than a mutex-protected one under heavy contention? Answer: Both serialise on one cache line, but the lock-free version has every failing thread spin and retry, and each attempt costs a full coherence transfer of 100-300 cycles. A mutex parks the losers, so they stop generating traffic. Lock-freedom guarantees progress, not throughput. The real fix is neither: shard the counter so each core writes its own padded line and sum on read.",
      "You need a shutdown flag readable from a signal handler. What are your options? Answer: An atomic of a lock-free type, ideally sig_atomic_t or an atomic bool, written with a release store and read with an acquire load. A mutex is unsafe because the handler can interrupt a thread that already holds it, producing self-deadlock, and almost no locking function is async-signal-safe. This is a case where lock-free is not an optimisation but the only correct choice."
    ],
    faq: [
      {
        question: "What is the difference between lock-free and wait-free?",
        answer:
          "They are points on a hierarchy of progress guarantees, and the distinction is about which entity is guaranteed to make progress. Lock-free guarantees system-wide progress: at any point, at least one thread will complete its operation in a finite number of steps, no matter what the others do - including being preempted, descheduled, or killed. That follows directly from the CAS retry loop, since a CAS failure means some other thread's CAS succeeded, so failure by one implies progress by another. What lock-free does not promise is that any particular thread finishes; an unlucky thread can lose every race indefinitely, which is starvation. Wait-free strengthens this to a per-thread guarantee with a bound on the number of steps, which requires helping schemes where a thread that observes another's incomplete operation finishes it on that thread's behalf. Wait-free algorithms are substantially more complex, usually slower in the common case, and used mainly where a hard per-operation bound is required, such as hard real-time systems. Below lock-free sits obstruction-freedom, which promises only that a thread running in isolation completes, and which needs a contention manager to be useful in practice. Blocking algorithms sit below all of these: if the lock holder stops, everyone stops. The practical significance is that lock-freedom is what you want when a thread may be preempted or killed at any moment, and wait-freedom is what you want when tail latency must be bounded rather than merely finite."
      },
      {
        question: "Is lock-free code always faster than lock-based code?",
        answer:
          "No, and expecting it to be is the most common reason teams adopt it and regret it. Under low contention, a lock-free operation and an uncontended mutex acquire cost about the same, since both are a single atomic read-modify-write of around 20 to 50 cycles - the mutex fast path never enters the kernel. Under high contention on a single shared location, lock-free can be considerably worse, because every thread keeps retrying and every failed CAS still pays a full cache-line transfer of 100 to 300 cycles, so the cores saturate the coherence interconnect doing no useful work. A mutex, by contrast, parks the losers, which removes them from the contention entirely and lets the winner proceed at full speed; this is why a contended lock-free counter can be several times slower than the equivalent mutex. What lock-free actually buys is a property, not speed: no thread can be blocked by another thread's preemption, death, or page fault, which improves worst-case latency and makes the structure usable from contexts where blocking is illegal. When throughput is the goal, the winning move is usually neither primitive but a change of data layout - shard the state so that threads stop sharing a cache line at all. Java's LongAdder does exactly this and beats both AtomicLong and a synchronized counter by a wide margin under write-heavy load, because eliminating sharing beats optimising how you share."
      },
      {
        question: "How do I safely free memory in a lock-free data structure?",
        answer:
          "With an explicit reclamation scheme, because the natural moment to free does not exist. When you unlink a node, another thread may already hold a pointer to it that it loaded a moment earlier and has not yet dereferenced, so freeing immediately risks use-after-free, and never freeing is a leak. There are three standard approaches with different trade-offs. Hazard pointers have each thread publish, in a globally visible per-thread slot, the pointers it is currently dereferencing; a thread that wants to free a node scans every published slot and defers the free if the node appears, retrying later. This bounds memory to roughly the number of threads times the maximum hazards each holds, at the cost of a store plus a fence on every read, which is real overhead on the hot path. Epoch-based reclamation instead has readers record a global epoch on entry to a critical region; nodes retired during epoch N are freed only once every thread has been observed at epoch N plus one or later. Reads are nearly free, but a single thread stalled inside a critical region pins every retired object, so memory use is unbounded in the presence of a stuck reader. Read-copy-update, used throughout the Linux kernel, is the extreme version: rcu_read_lock is often a no-op, readers pay literally nothing, and writers wait for a grace period during which every CPU has passed through a quiescent state. In a garbage-collected language the entire problem disappears, since the collector already tracks reachability - which is the single biggest reason lock-free programming is dramatically more approachable in Java, Go, or C# than in C or C++."
      },
      {
        question: "When should I use relaxed memory ordering?",
        answer:
          "Only when the atomic operation carries no information about other memory, which in practice means counters and statistics whose intermediate values nobody acts on. A request counter incremented with relaxed ordering is a good use: each increment is atomic so no count is lost, and nothing else in the program depends on when a particular increment becomes visible relative to other writes, so the compiler and CPU are free to reorder around it and you avoid the barrier cost. The moment an atomic is used to signal that other data is ready, relaxed is wrong. Publication requires a release store on the flag or pointer, paired with an acquire load on the reader side; that pairing is what creates the happens-before edge guaranteeing everything the writer wrote before the release is visible to anyone who observes it through the acquire. Code that uses relaxed for a done flag typically works perfectly on x86, because x86's memory model does not reorder stores with stores or loads with loads, and then corrupts data on ARM, POWER, or RISC-V, which reorder freely. Sequentially consistent ordering, the default in C++ and Java, additionally provides a single global total order over all such operations, which you need only for algorithms that depend on multiple threads agreeing on the order of independent operations - Dekker-style mutual exclusion is the textbook case. The pragmatic rule is to use the default sequentially consistent ordering until profiling shows the barriers matter, then relax deliberately with release and acquire on publication paths, and reserve relaxed for pure counters."
      },
      {
        question: "Should I write my own lock-free data structures?",
        answer:
          "Almost never for anything with structure, and freely for single-word state. The distinction is whether the atomic operation is the entire algorithm. An atomic counter, a flag, a sequence number, a monotonic maximum, or a single-pointer swap that publishes a new immutable configuration are all cases where there is no retry loop worth analysing, no ABA scenario, and no reclamation question beyond deferring one free - write those directly and be confident. Queues, stacks, lists, maps, and anything with multiple mutable links are a different matter. Their bugs are non-deterministic, depend on interleavings that occur once in millions of executions, frequently manifest only on weakly-ordered hardware, and routinely survive both code review and testing because the correct behaviour is overwhelmingly more likely than the incorrect one. Published lock-free algorithms have a well-documented history of subtle errors found years after peer review, and the reclamation layer is a second, equally difficult problem stacked on top. Use a library: boost::lockfree or folly in C++, java.util.concurrent in Java, crossbeam in Rust, sync and sync/atomic in Go. Before reaching for any of them, check whether the problem can be dissolved instead - sharding state so threads do not share it, giving each thread a private accumulator merged at the end, or using an immutable snapshot that readers take with a single load. Those designs are simpler than lock-free code and usually faster, because they remove contention rather than manage it."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Michael - Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects (IEEE TPDS 2004)",
        insight: "The canonical solution to the reclamation problem, and the clearest statement of why lock-free structures cannot simply free removed nodes."
      },
      {
        source: "book",
        attribution: "Herlihy and Shavit - The Art of Multiprocessor Programming, chapters 3-4 and 10-11",
        insight: "Rigorous treatment of the progress hierarchy - wait-free, lock-free, obstruction-free - and why the distinctions are operational rather than academic."
      },
      {
        source: "blog",
        attribution: "Preshing on Programming - An Introduction to Lock-Free Programming - https://preshing.com/20120612/an-introduction-to-lock-free-programming/",
        insight: "The most accessible explanation of memory ordering, the ABA problem, and why lock-free means progress rather than speed."
      }
    ]
  }
];
