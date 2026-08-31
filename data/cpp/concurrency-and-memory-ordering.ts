import { Topic } from "../syllabus";

const asciiDiagram = (art: string): string =>
  `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;

export const cppConcurrencyTopics: Topic[] = [
  {
    id: "topic-cpp-concurrency-threads-and-lifetime",
    moduleId: "mod-cpp-concurrency",
    title: "Threads, Locks, and Task Futures: The Concurrency Foundations",
    intuition:
      "C++11 gave the language a memory model and a threading library at the same time, which is the more important half: before it, multithreaded C++ was defined only by the platform, and the compiler was free to make optimisations that broke it. std::thread itself is a thin, deliberately unforgiving wrapper - it terminates the process if you destroy a joinable thread, it copies its arguments rather than referencing them, and it gives you no cancellation. C++20's std::jthread fixes the two worst parts by joining in its destructor and carrying a stop token, and it should be the default in new code.",
    complexity: {
      time:
        "Creating a thread costs on the order of tens of microseconds on Linux and rather more on Windows, because it involves a system call, a stack allocation of typically one to eight megabytes of virtual address space, and scheduler bookkeeping - which is why thread-per-task is a poor design and thread pools exist. join blocks until the target finishes, so its cost is the target's remaining work plus a context switch. Context switching between threads costs roughly one to several microseconds plus the indirect cost of a cold cache and TLB on the new core.",
      space:
        "Each thread gets its own stack, reserved at typically 8 MB of virtual memory on Linux and 1 MB on Windows, though only the touched pages are committed. The std::thread object itself is one word holding a handle. Thread-local storage adds one copy of each thread_local variable per thread, allocated lazily on first use for dynamically initialised ones, which is why a large thread_local buffer multiplied across a big pool is a real memory cost."
    },
    lesson: [
      {
        title: "Starting Threads and the Argument-Copying Rule",
        content:
          "A std::thread starts running its callable immediately on construction; there is no separate start step. Its constructor is variadic and decay-copies every argument into internal storage before the new thread begins, which is deliberate: the constructor returns immediately, so binding a reference to a caller local would dangle the moment the caller's frame went away. Passing a reference therefore requires wrapping it in std::ref or std::cref, which is copyable and converts back to a reference at the call - and doing so makes you responsible for the lifetime. Because the arguments are copied but the callable is invoked in the new thread, a member function is started by passing a pointer to the member and then the object pointer. The most vexing parse bites here too, since thread t(F()) declares a function, so brace initialisation or a named callable is safer.",
        codeExample: `#include <thread>

void work(int id, const std::string& name);

// Starts immediately; arguments are DECAY-COPIED into the thread
std::thread t(work, 1, "worker");
t.join();

// The copying rule, demonstrated
int counter = 0;
void increment(int& n) { ++n; }
std::thread bad(increment, counter);      // COMPILE ERROR in practice:
                                          // the internal copy is an rvalue
                                          // and cannot bind to int&
std::thread good(increment, std::ref(counter));   // explicit opt-in
good.join();
// std::ref makes YOU responsible for keeping 'counter' alive until join.

// Decay also strips array-ness and const:
char buf[64];
std::thread t2(consume, buf);             // passes char*, not char[64]

// Member functions: pointer-to-member, then the object
struct Server { void run(int port); };
Server s;
std::thread t3(&Server::run, &s, 8080);   // &s must outlive the thread
std::thread t4(&Server::run, std::ref(s), 8080);   // same requirement

// Lambdas are usually clearer, and capture rules make lifetime explicit
std::thread t5([&s] { s.run(8080); });    // capture by reference: s must
                                          // outlive the thread
std::thread t6([s = std::move(s)]() mutable { s.run(8080); });  // owned

// The most vexing parse
// std::thread t7(Worker());              // declares a FUNCTION
std::thread t7{Worker{}};                 // brace-init, unambiguous

// Moving, not copying - a thread has unique ownership of its handle
std::thread a(work, 1, "a");
// std::thread b = a;                     // ERROR: not copyable
std::thread b = std::move(a);             // a is now non-joinable
std::vector<std::thread> pool;
pool.emplace_back(work, 2, "b");          // vectors of threads work fine

// hardware_concurrency is a HINT, and may return 0
unsigned n = std::thread::hardware_concurrency();
if (n == 0) n = 4;
// It reports logical cores, ignores cgroup/container limits on most
// platforms, and ignores current load - do not treat it as a budget.

// Exceptions do NOT cross the thread boundary
std::thread t8([] {
    throw std::runtime_error("boom");     // std::terminate is called;
});                                       // the process dies
t8.join();
// To propagate, catch inside and use std::promise::set_exception,
// or use std::async, which captures exceptions into the future.`,
        diagram: asciiDiagram(`Thread argument passing: what is copied and when

  caller thread                          new thread
  ─────────────                          ──────────

  int counter = 0;
  ┌──────────────┐
  │ counter = 0  │  (caller's stack frame)
  └──────────────┘
         │
  std::thread t(increment, counter);
         │
         ▼
  ┌──────────────────────────────────────────────────┐
  │ thread constructor:                              │
  │   1. DECAY-COPY every argument into internal     │
  │      storage owned by the thread                 │
  │   2. start the OS thread                         │
  │   3. RETURN IMMEDIATELY  ── caller keeps running │
  └──────────────────────────────────────────────────┘
         │                                    │
         │                                    ▼
         │                       ┌──────────────────────┐
         │                       │ internal copy of     │
         │                       │ counter (value 0)    │
         │                       └──────────┬───────────┘
         │                                  │
         │                       increment(copy)  ──► copy becomes 1
         │
         ▼
  counter is STILL 0 ── the caller never sees the change

  ┌────────────────────────────────────────────────────────────┐
  │ WHY the copy is mandatory:                                 │
  │   the constructor returns immediately, so the caller may   │
  │   return from its function before the thread even starts.  │
  │   A stored reference would then dangle.                    │
  └────────────────────────────────────────────────────────────┘

  Opting in with std::ref
  ┌────────────────────────────────────────────────────────────┐
  │  std::thread t(increment, std::ref(counter));              │
  │                                                            │
  │  reference_wrapper is a COPYABLE object holding a pointer, │
  │  so it survives the decay-copy and converts back to int&   │
  │  at the call.                                              │
  │                                                            │
  │  ⇒ you have now promised that 'counter' outlives the       │
  │    thread.  Breaking that promise is a use-after-free.     │
  └────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "join, detach, and Why the Destructor Terminates",
        content:
          "A thread object is joinable from construction until you join or detach it. Destroying a joinable thread calls std::terminate, which kills the process - a deliberately harsh choice. The committee considered the alternatives and rejected both: joining in the destructor would make an ordinary scope exit block for an unbounded time, silently and invisibly, and detaching would leave a thread running with references to a destroyed frame, producing undefined behaviour instead of a clear failure. Terminating is loud and immediate. The consequence is that every path out of a scope containing a thread must join or detach, including exceptional ones, which is what makes a scope-guard wrapper necessary in C++11 through C++17. Detach is almost always the wrong answer, since a detached thread cannot be waited for, cannot be told to stop, and outlives everything it might reference.",
        codeExample: `// The trap, and why it is a trap
void f() {
    std::thread t(work);
    do_something();          // if this throws, t's destructor runs
}                            // t is still joinable -> std::terminate()

// C++11-17 fix: a scope guard
class ThreadGuard {
    std::thread t_;
public:
    explicit ThreadGuard(std::thread t) : t_(std::move(t)) {}
    ~ThreadGuard() { if (t_.joinable()) t_.join(); }
    ThreadGuard(const ThreadGuard&) = delete;
    ThreadGuard& operator=(const ThreadGuard&) = delete;
};
void f2() {
    ThreadGuard g{std::thread(work)};
    do_something();          // throws? g's destructor joins. Safe.
}

// C++20: jthread does this for you, and adds cooperative cancellation
void f3() {
    std::jthread t(work);
    do_something();
}                            // jthread's destructor: request_stop() then join()

// detach: the thread runs unattached, and you lose all control
void f4() {
    int local = 42;
    std::thread t([&local] {
        std::this_thread::sleep_for(std::chrono::seconds(1));
        use(local);          // 'local' is LONG GONE - undefined behaviour
    });
    t.detach();
}                            // f4 returns; the thread keeps running

// Detached threads and static destruction race at exit:
// main() returns -> static destructors run -> detached threads may
// still be using those statics. There is no standard way to wait.
// This is why detach is essentially never correct in application code.

// Cooperative cancellation with jthread (C++20)
std::jthread worker([](std::stop_token st) {
    while (!st.stop_requested()) {
        process_one();
    }
    cleanup();
});
worker.request_stop();       // sets the flag; the loop exits at its
                             // next check. Cooperative, not forced.
// The destructor calls request_stop() then join(), so even a scope
// exit shuts the worker down cleanly.

// Waking a blocked thread requires condition_variable_any
std::stop_token st = worker.get_stop_token();
std::condition_variable_any cv;
std::unique_lock lk(m);
cv.wait(lk, st, [&] { return has_work(); });    // returns on stop too
// A plain condition_variable would sleep through request_stop().

// std::stop_callback runs when a stop is requested
std::stop_callback cb(st, [] { close_socket(); });

// There is NO thread cancellation in C++. pthread_cancel exists but
// is unsafe with C++ destructors and exceptions - cooperative stop
// flags are the only correct mechanism.

// Waiting and sleeping
std::this_thread::sleep_for(std::chrono::milliseconds(10));
std::this_thread::yield();               // hint to the scheduler
std::this_thread::get_id();`
      },
      {
        title: "Mutexes, Lock Guards, and Deadlock",
        content:
          "A mutex provides mutual exclusion, and the RAII wrappers are how you use one correctly: lock_guard locks on construction and unlocks on destruction with no other operations, scoped_lock does the same for any number of mutexes using a deadlock-avoiding algorithm, and unique_lock adds the ability to unlock early, to defer locking, and to be moved, which is what condition variables require. Manual lock and unlock calls are wrong in essentially all code because an exception between them leaks the lock permanently. Deadlock requires four simultaneous conditions, and the practical defence is to break the circular-wait one by establishing a global lock ordering, or to remove the hold-and-wait one by acquiring all needed mutexes in a single scoped_lock. Recursive mutexes are almost always a sign that the locking design is unclear rather than a legitimate need.",
        codeExample: `#include <mutex>

std::mutex m;
std::vector<int> shared;

// lock_guard: the default, minimal, cannot be unlocked early
void add(int x) {
    std::lock_guard<std::mutex> lk(m);
    shared.push_back(x);
}                                 // unlocked here, even if push_back throws

// C++17 CTAD drops the template argument
void add17(int x) { std::lock_guard lk(m); shared.push_back(x); }

// Manual locking is wrong - an exception leaks the lock forever
void bad(int x) {
    m.lock();
    shared.push_back(x);          // throws? m is never unlocked. Deadlock.
    m.unlock();
}

// unique_lock: movable, deferrable, unlockable - required by cond vars
void with_unique() {
    std::unique_lock lk(m);
    prepare();
    lk.unlock();                  // release early for the slow part
    slow_io();
    lk.lock();
    finish();
}
std::unique_lock lk2(m, std::defer_lock);     // do not lock yet
std::unique_lock lk3(m, std::try_to_lock);    // attempt; check owns_lock()
std::unique_lock lk4(m, std::adopt_lock);     // already locked by caller

// scoped_lock: multiple mutexes, deadlock-free (C++17)
std::mutex m1, m2;
void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lk(from.m, to.m);        // locks BOTH atomically
    from.balance -= amount;
    to.balance   += amount;
}
// The implementation uses std::lock's back-off algorithm: try to
// acquire all, and on failure release everything and retry. No
// ordering is needed because no thread ever HOLDS one while WAITING
// for another.

// The classic deadlock scoped_lock prevents:
// thread A: lock(m1); lock(m2);      thread B: lock(m2); lock(m1);
// Each holds one and waits for the other. Both block forever.

// Coffman's four conditions - break ANY one to prevent deadlock:
//   1. mutual exclusion      (inherent to a mutex)
//   2. hold and wait         <- scoped_lock breaks this
//   3. no preemption         (try_lock with timeout breaks this)
//   4. circular wait         <- a global lock ORDER breaks this

// Ordering by address is a simple global order:
void transfer_ordered(Account& a, Account& b, int amt) {
    auto* first  = &a < &b ? &a : &b;
    auto* second = &a < &b ? &b : &a;
    std::lock_guard l1(first->m);
    std::lock_guard l2(second->m);
    // ...
}

// timed mutexes let you give up rather than block forever
std::timed_mutex tm;
if (tm.try_lock_for(std::chrono::milliseconds(100))) {
    std::lock_guard lk(tm, std::adopt_lock);
} else { /* back off, retry, or report contention */ }

// shared_mutex: many readers OR one writer (C++17)
std::shared_mutex sm;
std::string read()  { std::shared_lock lk(sm); return data; }   // shared
void write(std::string s) { std::unique_lock lk(sm); data = std::move(s); }
// Worth it only when reads greatly outnumber writes AND the critical
// section is long; the bookkeeping makes it slower than a plain mutex
// for short sections.

// recursive_mutex: allows the same thread to lock repeatedly.
// Almost always a design smell - it usually means a public function
// that locks is calling another public function that locks. Split
// into a locking public wrapper and a non-locking private helper.`,
        diagram: asciiDiagram(`Deadlock, and the two ways to prevent it

  THE DEADLOCK
  ┌──────────────────────────┐    ┌──────────────────────────┐
  │ Thread A                 │    │ Thread B                 │
  │   lock(m1)  ✓ acquired   │    │   lock(m2)  ✓ acquired   │
  │   lock(m2)  ✗ BLOCKED    │    │   lock(m1)  ✗ BLOCKED    │
  └──────────┬───────────────┘    └──────────┬───────────────┘
             │                                │
             │  waits for m2 ──────────────►  │ holds m2
             │                                │
             │  holds m1  ◄──────────────────  waits for m1
             ▼                                ▼
        ┌─────────────────────────────────────────┐
        │  circular wait  ⇒  both block forever   │
        └─────────────────────────────────────────┘

  FIX 1 ── global lock ORDER (breaks "circular wait")
  ┌────────────────────────────────────────────────────────┐
  │  Rule: always acquire in increasing address order.     │
  │                                                        │
  │  Thread A: lock(m1) then lock(m2)                      │
  │  Thread B: lock(m1) then lock(m2)     ← same order     │
  │                                                        │
  │  Whoever gets m1 first proceeds; the other waits on    │
  │  m1 while HOLDING NOTHING.  No cycle is possible.      │
  └────────────────────────────────────────────────────────┘

  FIX 2 ── scoped_lock (breaks "hold and wait")
  ┌────────────────────────────────────────────────────────┐
  │  std::scoped_lock lk(m1, m2);                          │
  │                                                        │
  │  internally:                                           │
  │    ┌──────────────────────────────────────────────┐    │
  │    │ retry:                                       │    │
  │    │   lock(m1)                                   │    │
  │    │   if (try_lock(m2) fails) {                  │    │
  │    │       unlock(m1);          ← release ALL     │    │
  │    │       yield();                               │    │
  │    │       goto retry;                            │    │
  │    │   }                                          │    │
  │    └──────────────────────────────────────────────┘    │
  │                                                        │
  │  A thread never HOLDS one lock while WAITING for       │
  │  another ⇒ no cycle, and no ordering discipline needed │
  └────────────────────────────────────────────────────────┘

  Coffman's four conditions ── break any ONE
    ┌── mutual exclusion   inherent to a mutex
    ├── hold and wait      ◄── scoped_lock / std::lock
    ├── no preemption      ◄── try_lock_for with a timeout
    └── circular wait      ◄── a documented global lock order`)
      },
      {
        title: "Condition Variables and the Spurious Wakeup Rule",
        content:
          "A condition variable lets a thread sleep until another thread signals that some predicate may have become true. The interface is deliberately awkward because the underlying problem is: the waiter must check the predicate, and go to sleep, atomically with respect to the notifier, or a notification sent between the check and the sleep is lost forever. wait therefore takes a locked unique_lock, releases it and sleeps as one atomic step, and reacquires it before returning. Every wait must be inside a loop testing the predicate, both because a notification can be consumed by a different thread and because spurious wakeups are permitted by the standard and do occur - the predicate overload of wait writes that loop for you. Notifying while holding the lock is correct but can cause the woken thread to immediately block; notifying after unlocking avoids that, at the cost of a subtle lost-wakeup risk if the predicate can change in between.",
        codeExample: `#include <condition_variable>

std::mutex m;
std::condition_variable cv;
std::queue<Job> jobs;
bool done = false;

// Producer
void submit(Job j) {
    {
        std::lock_guard lk(m);
        jobs.push(std::move(j));
    }                                 // unlock BEFORE notifying
    cv.notify_one();                  // avoids waking a thread that
}                                     // immediately blocks on the mutex

// Consumer - the predicate loop is mandatory
void consume() {
    for (;;) {
        std::unique_lock lk(m);
        cv.wait(lk, [] { return !jobs.empty() || done; });
        // equivalent to:
        //   while (!(!jobs.empty() || done)) cv.wait(lk);
        if (jobs.empty() && done) return;
        Job j = std::move(jobs.front());
        jobs.pop();
        lk.unlock();                  // do the WORK outside the lock
        run(j);
    }
}

// Why the loop is not optional:
//   1. SPURIOUS WAKEUPS are explicitly allowed by the standard and
//      occur in practice on POSIX (a signal can interrupt futex wait).
//   2. STOLEN WAKEUPS: notify_one wakes thread A, but thread B
//      acquires the mutex first and takes the job. A wakes to an
//      empty queue.
//   3. The predicate may have been made false again before the woken
//      thread reacquired the lock.

// The lost-wakeup bug, without the mutex around the state change:
// BAD:
//   producer: jobs.push(j); cv.notify_one();         // no lock!
//   consumer: if (jobs.empty()) cv.wait(lk);
// Interleaving: consumer checks empty (true), producer pushes and
// notifies, consumer then sleeps -> the notification was sent before
// the wait began and is GONE. The consumer sleeps forever.
// The mutex is what makes check-then-sleep atomic.

// notify_one vs notify_all
cv.notify_one();      // one waiter; correct when any single waiter
                      // can handle the event (a work queue)
cv.notify_all();      // all waiters; required when the predicate
                      // differs per waiter, or on shutdown
done = true; cv.notify_all();     // every consumer must observe this

// The thundering herd: notify_all with N waiters wakes all N, and
// N-1 immediately block on the mutex, check the predicate, and sleep
// again. Prefer notify_one where the semantics allow it.

// Timed waits
std::unique_lock lk(m);
if (cv.wait_for(lk, std::chrono::seconds(1), [] { return ready; })) {
    // predicate true
} else {
    // TIMED OUT - the predicate overload returns the predicate's value
}
cv.wait_until(lk, deadline, pred);     // absolute deadline; immune to
                                       // the drift a wait_for loop has

// Waking a wait on cancellation needs condition_variable_any (C++20)
std::condition_variable_any cva;
std::jthread w([&](std::stop_token st) {
    std::unique_lock lk(m);
    cva.wait(lk, st, [] { return !jobs.empty(); });    // returns on stop
});

// A correct bounded blocking queue
template <class T>
class BlockingQueue {
    std::mutex m_;
    std::condition_variable not_empty_, not_full_;
    std::queue<T> q_;
    std::size_t cap_;
    bool closed_ = false;
public:
    explicit BlockingQueue(std::size_t cap) : cap_(cap) {}
    bool push(T v) {
        std::unique_lock lk(m_);
        not_full_.wait(lk, [&] { return q_.size() < cap_ || closed_; });
        if (closed_) return false;
        q_.push(std::move(v));
        lk.unlock();
        not_empty_.notify_one();
        return true;
    }
    bool pop(T& out) {
        std::unique_lock lk(m_);
        not_empty_.wait(lk, [&] { return !q_.empty() || closed_; });
        if (q_.empty()) return false;              // closed and drained
        out = std::move(q_.front());
        q_.pop();
        lk.unlock();
        not_full_.notify_one();
        return true;
    }
    void close() {
        { std::lock_guard lk(m_); closed_ = true; }
        not_empty_.notify_all();
        not_full_.notify_all();
    }
};`
      },
      {
        title: "Futures, Promises, and std::async",
        content:
          "The future and promise pair is the standard's channel for a single value passed once between threads, with the shared state handling synchronisation and, crucially, exception propagation - a thrown exception is captured into the state and rethrown at the consumer's get. std::async wraps the whole pattern: it runs a callable and returns a future, choosing between a new thread and deferred lazy evaluation unless you specify a launch policy. Two behaviours surprise people. The default policy is implementation-chosen, so a call with no policy may never run concurrently, which makes async unsuitable for anything requiring actual parallelism unless you pass launch::async explicitly. And the future returned by async has a destructor that blocks until the task completes, which is unique to async's futures and turns a discarded return value into an accidental synchronous call.",
        codeExample: `#include <future>

// async: run and get a future back
std::future<int> f = std::async(std::launch::async, compute, 42);
do_other_work();
int result = f.get();                    // blocks until ready; rethrows
                                         // any exception from compute

// TRAP 1: the default policy may not create a thread
auto f2 = std::async(compute, 42);       // policy is async|deferred:
                                         // the implementation chooses.
// If it chooses deferred, 'compute' runs lazily INSIDE f2.get() on the
// calling thread - no concurrency at all. Always pass launch::async
// when you need parallelism.

// TRAP 2: async's future BLOCKS in its destructor
std::async(std::launch::async, slow_task);      // temporary future is
                                                // destroyed at the ;
                                                // which WAITS for the task
// This makes the call fully synchronous. So does:
for (int i = 0; i < 10; ++i)
    std::async(std::launch::async, work, i);    // runs one at a time!
// Fix: keep the futures alive
std::vector<std::future<void>> futures;
for (int i = 0; i < 10; ++i)
    futures.push_back(std::async(std::launch::async, work, i));
// now all ten run concurrently; the vector's destruction waits for all

// This blocking-destructor behaviour is UNIQUE to futures from async.
// A future from promise::get_future or packaged_task does NOT block.

// promise/future: manual control over the shared state
std::promise<Config> p;
std::future<Config> cf = p.get_future();
std::jthread loader([&p] {
    try {
        p.set_value(load_config());
    } catch (...) {
        p.set_exception(std::current_exception());   // propagates to get()
    }
});
Config c = cf.get();                     // rethrows here if it failed

// packaged_task: a callable bundled with its future - the thread-pool
// building block
std::packaged_task<int(int)> task(compute);
std::future<int> tf = task.get_future();
std::jthread runner(std::move(task), 42);
int r = tf.get();

// shared_future: many consumers of one result
std::shared_future<Config> shared = cf.share();
std::jthread a([shared] { use(shared.get()); });     // copyable, and
std::jthread b([shared] { use(shared.get()); });     // get() is repeatable

// A minimal thread pool from packaged_task
class Pool {
    std::vector<std::jthread> workers_;
    BlockingQueue<std::function<void()>> tasks_{1024};
public:
    explicit Pool(unsigned n) {
        for (unsigned i = 0; i < n; ++i)
            workers_.emplace_back([this] {
                std::function<void()> t;
                while (tasks_.pop(t)) t();
            });
    }
    template <class F, class... A>
    auto submit(F&& f, A&&... a) -> std::future<std::invoke_result_t<F, A...>> {
        using R = std::invoke_result_t<F, A...>;
        auto task = std::make_shared<std::packaged_task<R()>>(
            std::bind(std::forward<F>(f), std::forward<A>(a)...));
        auto fut = task->get_future();
        tasks_.push([task] { (*task)(); });
        return fut;
    }
    ~Pool() { tasks_.close(); }         // jthreads join automatically
};
// The shared_ptr is needed because std::function requires a copyable
// target and packaged_task is move-only - a known wart, fixed in C++23
// by std::move_only_function.

// Future state and readiness
if (f.wait_for(std::chrono::seconds(0)) == std::future_status::ready) { }
// deferred futures report future_status::deferred, never ready, until
// get() is called - another reason to be explicit about the policy.

// std::future has no continuations. .then() was proposed and did not
// land; C++20 coroutines and the C++26 executors work fill that gap.`
      }
    ],
    examples: [
      {
        title: "A program that terminates on a normal scope exit",
        input: "void f() { std::thread t(work); do_something(); } where do_something completes normally.",
        output: "std::terminate is called and the process aborts at the closing brace.",
        explanation:
          "Step 1: A std::thread is joinable from construction until join or detach is called, and this thread has had neither.\nStep 2: The destructor of a joinable thread is specified to call std::terminate rather than joining or detaching implicitly.\nStep 3: The rationale is that joining would make an ordinary scope exit block for an unbounded and invisible time, while detaching would leave a thread holding references to a frame that is about to disappear - so the committee chose the loud failure over two silent ones.\nStep 4: The C++11 remedy is a scope guard that joins in its own destructor, which also covers the exceptional path where do_something throws.\nStep 5: C++20's std::jthread makes this the default behaviour, requesting a stop and then joining in its destructor, which is why jthread should be preferred in all new code and why a bare std::thread in a function body is now a code smell."
      },
      {
        title: "A condition variable that sleeps through its notification",
        input: "A producer that pushes to a queue and calls notify_one without holding the mutex, paired with a consumer using an if rather than a while around wait.",
        output: "The consumer occasionally sleeps forever despite work being available.",
        explanation:
          "Step 1: The consumer checks the predicate, finds the queue empty, and is about to call wait, but has not yet done so.\nStep 2: The producer pushes an item and calls notify_one, but there is no waiter registered yet, so the notification is delivered to nobody and is simply lost - condition variables have no memory.\nStep 3: The consumer then calls wait and sleeps, with the queue non-empty and no further notification pending, so it sleeps until some unrelated future notification arrives.\nStep 4: The mutex is what makes this impossible when used correctly: because the producer must hold it to modify the queue, and because wait atomically releases the lock as it begins sleeping, there is no window between the consumer's check and its sleep in which the producer can act.\nStep 5: The predicate overload of wait writes the required while loop automatically and should always be used, since it also handles spurious wakeups and the case where another consumer steals the item before this one reacquires the lock."
      },
      {
        title: "An async loop that runs serially",
        input: "A loop calling std::async(std::launch::async, work, i) ten times without storing the returned futures.",
        output: "The ten tasks run one after another rather than concurrently, taking ten times as long as expected.",
        explanation:
          "Step 1: std::async returns a std::future, and discarding the return value creates a temporary that is destroyed at the end of the full expression.\nStep 2: Futures obtained from std::async have a special destructor that blocks until the associated task has completed, which no other future in the standard does.\nStep 3: Each loop iteration therefore starts a task and then immediately waits for it at the semicolon, serialising the entire loop while still paying the cost of creating ten threads.\nStep 4: The behaviour was a deliberate committee decision to prevent tasks outliving the objects they reference, and it was contentious enough that a proposal to remove it was seriously considered.\nStep 5: The fix is to store the futures in a container so they stay alive for the duration of the loop, after which the container's destruction waits for all of them - and the related trap of the default launch policy, which may choose deferred execution and provide no concurrency at all, means launch::async should always be specified explicitly."
      }
    ],
    tips: [
      "Prefer std::jthread over std::thread in all new code, since it joins in its destructor and carries a stop token, eliminating the terminate-on-scope-exit hazard.",
      "Always pass std::launch::async explicitly to std::async, because the default policy permits the implementation to run the task lazily on the calling thread.",
      "Release the mutex before calling notify, so the woken thread does not immediately block on a lock the notifier still holds."
    ],
    tricks: [
      "std::scoped_lock over several mutexes uses a back-off algorithm that cannot deadlock, which removes the need for a documented lock ordering in the code it covers.",
      "std::condition_variable_any's three-argument wait accepts a stop_token, which is the only way to wake a blocked waiter on a jthread cancellation.",
      "Wrapping a packaged_task in a shared_ptr is the standard workaround for storing a move-only task in a std::function-based work queue, until C++23's move_only_function is available."
    ],
    memoryAids: [
      "Destroying a joinable thread terminates the process - loud failure was chosen over silent blocking or silent dangling.",
      "Threads copy their arguments; std::ref is how you promise the original will outlive them.",
      "Always wait in a loop on a predicate, because wakeups can be spurious, stolen, or stale."
    ],
    interviewPatterns: [
      "'Implement a thread-safe bounded queue' tests the mutex plus two condition variables pattern and whether you handle shutdown.",
      "'What is wrong with this async loop?' probes the blocking future destructor and the default launch policy.",
      "Frequency and companies: very common at Bloomberg, Nvidia, HFT firms, and any systems role; usually followed by a memory-ordering question."
    ],
    practiceProblems: [
      "Why does std::thread's constructor decay-copy its arguments rather than forwarding references? Answer: the constructor returns immediately while the new thread may not have started, so the calling function can return and destroy its locals before the argument is ever used; storing a reference would therefore dangle by construction, and the standard chose to make the safe behaviour the default with std::ref as an explicit, visible opt-in that transfers the lifetime responsibility to the caller.",
      "You need to shut down a pool of worker threads blocked on a condition variable. What is the correct sequence? Answer: set a closed flag while holding the mutex, then call notify_all - not notify_one - so that every waiter observes the flag; each waiter's predicate must include the flag so it returns rather than sleeping again, and the drain semantics must be decided explicitly, since consumers that return immediately on the flag will discard queued work while consumers that check emptiness first will finish it.",
      "Why is a recursive_mutex usually a design smell? Answer: it is needed when a function that acquires the lock calls another function that acquires the same lock, which means the locking boundaries are unclear and the invariants protected by the mutex may be temporarily broken at the point of the inner acquisition; the fix is to split each such function into a public wrapper that locks and a private implementation that assumes the lock is held, which makes the invariant boundaries explicit and is also faster, since recursive mutexes carry an owner and a count."
    ],
    faq: [
      {
        question: "Why does destroying a joinable thread terminate the program instead of joining?",
        answer:
          "Because both alternatives are worse in ways that are harder to notice. If the destructor joined, then any scope containing a thread could block for an unbounded time at its closing brace, invisibly - a function that looks like it returns immediately might wait minutes, and worse, this would happen during stack unwinding from an exception, potentially deadlocking if the thread being joined is waiting on something the unwinding thread holds. If the destructor detached, the thread would keep running with pointers and references into a frame that is being destroyed, converting a clear programming error into undefined behaviour that manifests as memory corruption somewhere else entirely. The committee, following Hans Boehm's analysis, concluded that neither implicit behaviour could be made safe and that the programmer must state the intent explicitly, so failing to do so is a bug that should be reported immediately and unmistakably. std::terminate does exactly that. The consequence is that C++11 through C++17 code needs a scope guard around every thread to be exception-safe, which is boilerplate that everyone rewrote. C++20's std::jthread resolves it by choosing the join behaviour deliberately and pairing it with a stop token, so its destructor requests a stop and then joins - the request makes the join bounded, which was the missing piece that made joining acceptable as a default."
      },
      {
        question: "What is a spurious wakeup and why does the standard permit it?",
        answer:
          "It is a return from a condition variable wait that was not caused by any notification. The standard explicitly allows it, and it genuinely occurs on POSIX systems, where the underlying futex wait can be interrupted by a signal and where some implementations may wake waiters during internal reorganisation. There are also two related phenomena that are not technically spurious but are indistinguishable to the waiter: a stolen wakeup, where notify_one wakes thread A but thread B acquires the mutex first and consumes the item so A finds nothing; and a stale wakeup, where the predicate was true when the notification was sent but has become false again by the time the woken thread reacquires the lock. The reason the standard permits spurious wakeups is pragmatic - forbidding them would require implementations to add synchronisation to eliminate cases that correct code must handle anyway, since stolen and stale wakeups cannot be eliminated at all. The consequence for you is absolute: every wait must be inside a loop that re-tests the predicate, and treating wait as returning only when the condition holds is a bug even on platforms where true spurious wakeups never occur, because the stolen and stale cases will find you. The predicate overload of wait writes the loop for you and should be used unconditionally, which is why modern code rarely contains an explicit while around wait even though the loop is still there."
      },
      {
        question: "Should I notify while holding the mutex or after releasing it?",
        answer:
          "Release first in the common case, but understand why both are defensible. Notifying while holding the lock means the woken thread immediately tries to acquire a mutex the notifier still owns, so it wakes, blocks, and sleeps again - a wasted round trip sometimes called hurry-up-and-wait. Releasing first avoids that, and on most platforms it measurably reduces contention in a producer-consumer loop. The argument for notifying while holding the lock is that it eliminates a narrow window: if you unlock, and another thread then changes the state so the predicate becomes false again, and only then does your notify land, the woken thread finds nothing and sleeps - which is harmless given the mandatory predicate loop, but wastes a wakeup. There is one case where holding matters for correctness rather than efficiency: if the condition variable or the waiting thread's lifetime is tied to the state you just changed, unlocking first can let the waiter observe the change, wake, and destroy the condition variable before your notify executes, which is undefined behaviour. That pattern arises in shutdown sequences and is the reason some codebases adopt notify-under-lock as a blanket rule. The reasonable position is to notify after unlocking in ordinary producer-consumer code, and to notify under the lock in any sequence where the waiter may destroy the condition variable or the enclosing object. Also note that some implementations, including glibc, perform wait morphing, which transfers the waiter directly to the mutex queue and largely removes the penalty of notifying under the lock."
      },
      {
        question: "When should I use std::async and when should I use a thread pool?",
        answer:
          "std::async is appropriate for a small number of independent, coarse-grained tasks whose results you actually need, and it is a poor fit for anything else. Its advantages are real: it handles thread creation, it captures exceptions into the future so they surface at get rather than terminating the process, and it expresses the intent of a task returning a value more directly than a promise and a thread. Its drawbacks accumulate quickly at scale. Each call with launch::async typically creates a fresh operating system thread, which costs tens of microseconds and a megabyte or more of stack, so launching thousands of tasks is far slower than the work in many cases. There is no bounding, so a loop can oversubscribe the machine badly. The default launch policy is implementation-defined and may run the task lazily on the calling thread, giving no concurrency at all. The returned future's destructor blocks, so discarding it silently serialises everything. And there is no way to compose futures, since continuations were proposed and never standardised. A thread pool fixes all of this: threads are created once and reused, the work queue bounds concurrency to something matching the hardware, tasks are fine-grained without penalty, and shutdown is explicit. The standard has no pool, so you use a library one - Intel TBB, a coroutine-based scheduler, or the thirty-line packaged_task pool that most codebases end up writing. The rule of thumb is that async is fine for a handful of long tasks and wrong for many short ones."
      },
      {
        question: "What is a data race, and how is it different from a race condition?",
        answer:
          "A data race is a precisely defined term in the standard: two threads access the same memory location, at least one access is a write, the accesses are not both atomic, and they are not ordered by a happens-before relationship. A program containing a data race has undefined behaviour for its entire execution, not merely at the racing access - the compiler is permitted to assume races do not occur, and it exploits that assumption when optimising, so the consequences can include reordered code, values cached in registers across supposed synchronisation points, and loops that never terminate because a flag was hoisted. This is why a data race cannot be reasoned about as merely getting a stale value. A race condition is a broader and less formal term describing any situation where the correctness of a program depends on the relative timing of operations. Every data race is a race condition, but many race conditions involve no data race at all: a check-then-act sequence where each step is individually protected by a mutex is race-free by the standard's definition and still wrong, because another thread can act between the check and the act. The classic example is testing whether a map contains a key under a lock, releasing the lock, and then inserting under the lock again. The practical implication is that eliminating data races - by using mutexes or atomics on every shared mutable location - is necessary but not sufficient, and that the correctness argument must be about invariants and critical section boundaries rather than about individual accesses. ThreadSanitizer detects data races reliably and cannot detect the higher-level races at all."
      },
      {
        question: "How do I choose the number of threads for a pool?",
        answer:
          "Start from what the work is bound by. For CPU-bound work, the useful number is the count of hardware threads available to the process, since additional threads only add context switching and cache pressure without adding throughput - std::thread::hardware_concurrency reports the logical core count, though it may return zero, ignores container CPU limits on most platforms, and counts hyperthreads that may or may not help depending on the workload's instruction mix. For IO-bound work, threads spend most of their time blocked, so a higher count is justified, and the classic estimate is the core count multiplied by one plus the ratio of wait time to compute time, which for work that waits ninety percent of the time suggests roughly ten threads per core. For mixed workloads, the honest answer is to separate them into two pools rather than trying to size one pool for both, since a blocked IO thread occupying a slot starves the CPU work. Two practical adjustments matter in production. In a container, hardware_concurrency usually reports the host's cores rather than the cgroup quota, so a pod limited to two CPUs may create sixty-four threads and thrash; reading the cgroup limit directly is necessary. And leaving one core free for the operating system and for the process's own non-pool threads often improves tail latency more than the extra worker helps throughput. Beyond sizing, the larger wins usually come from reducing contention on shared state and from work-stealing schedulers that keep tasks on the core that produced them, which is what TBB and similar libraries provide."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Anthony Williams - C++ Concurrency in Action, second edition",
        insight: "The standard reference for the threading library, including the rationale for the joinable-destructor rule."
      },
      {
        source: "note",
        attribution: "cppreference - Thread support library, std::jthread, std::condition_variable, std::async",
        insight: "Specifies the launch policy semantics and the blocking destructor unique to async's futures."
      },
      {
        source: "video",
        attribution: "Hans Boehm - Threads and Shared Variables in C++11 (and related committee papers)",
        insight: "Why implicit join or detach in the destructor was rejected, and the formal definition of a data race."
      }
    ]
  },
  {
    id: "topic-cpp-concurrency-sync-primitives",
    moduleId: "mod-cpp-concurrency",
    title: "Shared Mutexes, call_once, and the C++20 Coordination Primitives",
    intuition:
      "A plain mutex is a blunt instrument: it serialises everything, including readers that only observe. The library provides a graded set of tools above it - shared_mutex for read-heavy state, call_once for exactly-once initialisation that is safe and cheap, and the C++20 additions latch, barrier, and counting_semaphore for the coordination shapes that people previously hand-rolled out of a mutex and a condition variable, usually with a bug. Choosing correctly matters because each of these has a cost profile, and the intuitive choice is often the wrong one: shared_mutex is slower than a mutex for short critical sections despite allowing concurrent readers.",
    complexity: {
      time:
        "An uncontended mutex lock is a single atomic compare-and-exchange, roughly 15 to 25 nanoseconds; a contended one costs a futex syscall and a context switch, on the order of a microsecond or more. shared_mutex read locking is more expensive than mutex locking - typically two to five times - because it must update a reader count atomically and coordinate with waiting writers, so it only pays off when the critical section is long enough that the concurrency gain exceeds the fixed overhead. call_once after the first call is a single acquire load of a flag, effectively free. latch and barrier arrive at O(1) atomic operations per participant plus one wakeup broadcast.",
      space:
        "std::mutex is typically 40 bytes on Linux and 80 on Windows; shared_mutex is larger, around 56 to 80 bytes, since it holds a reader count and writer state. once_flag is a single word. latch and barrier hold a counter and the wait state, around 8 to 64 bytes. counting_semaphore with a small maximum can be lock-free and is then a single atomic counter. None of these are large, but placing several in one object invites false sharing, so hot locks deserve alignas of the destructive interference size."
    },
    lesson: [
      {
        title: "shared_mutex and the Reader-Writer Trade-off",
        content:
          "std::shared_mutex, added in C++17 with a timed variant in C++14, allows either any number of concurrent shared owners or exactly one exclusive owner. std::shared_lock acquires it in shared mode and std::unique_lock or std::lock_guard in exclusive mode, and mixing those up is the common bug - a shared_lock around a write compiles and silently permits concurrent mutation. The important and counter-intuitive fact is that a shared_mutex is slower than a plain mutex per operation, because acquiring shared ownership still requires atomically incrementing a reader count on a cache line every reader contends for, plus logic to prevent writer starvation. The break-even point is a critical section long enough that genuine reader parallelism outweighs that overhead, which in practice means microseconds, not the few nanoseconds a pointer read takes. For very read-heavy, short-critical-section data the right answer is usually an atomic shared_ptr, a copy-on-write pointer swap, or read-copy-update, not a shared_mutex.",
        codeExample: `#include <shared_mutex>

class ConfigStore {
    mutable std::shared_mutex m_;
    std::map<std::string, std::string> data_;
public:
    // Many readers may hold this concurrently
    std::string get(const std::string& k) const {
        std::shared_lock lk(m_);                  // SHARED mode
        auto it = data_.find(k);
        return it == data_.end() ? std::string{} : it->second;
    }
    // Exclusive: blocks until every reader has released
    void set(std::string k, std::string v) {
        std::unique_lock lk(m_);                  // EXCLUSIVE mode
        data_[std::move(k)] = std::move(v);
    }
};
// NOTE: m_ is 'mutable' so const member functions can lock it - the
// standard idiom for a logically-const but internally-synchronised class.

// THE BUG: using the wrong lock type for a write
void broken(ConfigStore& s) {
    std::shared_lock lk(s.m_);       // shared!
    s.data_["x"] = "y";              // concurrent writers -> data race
}
// It compiles. The type system does not connect lock mode to
// mutability. Discipline (or a wrapper type) is the only defence.

// Writer starvation: implementations differ
// libstdc++ and MSVC give waiting writers priority over new readers,
// so a steady stream of readers cannot starve a writer indefinitely.
// The STANDARD guarantees no such thing, so do not rely on fairness.

// Upgrading is NOT supported
std::shared_lock lk(m_);
// there is no lk.upgrade() - two threads upgrading would deadlock.
// You must release the shared lock and reacquire exclusively, then
// RE-CHECK your assumption, because the state may have changed:
lk.unlock();
std::unique_lock wlk(m_);
if (!data_.count(k)) data_[k] = compute();       // re-check!

// When shared_mutex is the WRONG answer: short reads
// A pointer read under shared_mutex costs ~40ns of locking for ~1ns
// of work. Prefer an atomic snapshot pointer:
std::atomic<std::shared_ptr<const Config>> cfg;  // C++20
std::shared_ptr<const Config> snap = cfg.load(); // wait-free read
use(*snap);                                      // no lock at all
// Writers publish a whole new immutable Config:
cfg.store(std::make_shared<const Config>(build_new()));
// Pre-C++20: std::atomic_load(&cfg) on a shared_ptr (deprecated in
// C++20, removed in C++26).

// once_flag: exactly-once initialisation, thread-safe and cheap
std::once_flag flag;
Connection* conn = nullptr;
void ensure_connected() {
    std::call_once(flag, [] { conn = new Connection(); });
}
// If the callable THROWS, the flag is not set and the next caller
// retries - unlike a bool guard, which would be left inconsistent.

// A function-local static is usually simpler and does the same thing:
Connection& instance() {
    static Connection c;          // C++11 guarantees thread-safe,
    return c;                     // exactly-once initialisation
}
// This is the "magic statics" guarantee. Use call_once only when the
// initialised object is not a static, or the flag must be reset.`,
        diagram: asciiDiagram(`shared_mutex: the concurrency gain versus the fixed cost

  PLAIN MUTEX ── everything serialises
  time ──────────────────────────────────────────────────────►
  R1  ████
  R2      ████
  R3          ████
  W1              ████
        total = 4 × (lock 20ns + work)

  SHARED MUTEX ── readers overlap
  time ──────────────────────────────────────────────────────►
  R1  ██████
  R2  ██████        all three share the lock concurrently
  R3  ██████
  W1        ██████  waits for ALL readers to release
        total = 1 × read-work + 1 × write-work
        BUT each shared acquire costs ~2-5× a mutex acquire

  ┌──────────────────────────────────────────────────────────┐
  │ BREAK-EVEN                                               │
  │                                                          │
  │   work per read = 1 ns   (a pointer dereference)         │
  │     mutex:        20 + 1  = 21 ns  serial × 3 = 63 ns    │
  │     shared_mutex: 60 + 1  = 61 ns  parallel   = 61 ns    │
  │     ⇒ no benefit; the locking dominates                  │
  │                                                          │
  │   work per read = 1000 ns  (a tree walk)                 │
  │     mutex:        20 + 1000 = 1020  × 3 = 3060 ns        │
  │     shared_mutex: 60 + 1000 = 1060  parallel = 1060 ns   │
  │     ⇒ nearly 3× faster                                   │
  └──────────────────────────────────────────────────────────┘

  reader-count contention
  ┌─────────────────────────────────────────────────────┐
  │  every shared acquire writes the SAME cache line    │
  │                                                     │
  │    core0 ──┐                                        │
  │    core1 ──┼──► [ reader_count ]  ← ping-pongs      │
  │    core2 ──┘      one cache line    between cores   │
  │                                                     │
  │  ⇒ "concurrent" readers still serialise on the      │
  │    coherence protocol for the counter itself        │
  └─────────────────────────────────────────────────────┘

  The alternative for short reads: publish immutable snapshots
    writers ──► make_shared<const Config>(new) ──► atomic store
    readers ──► atomic load ──► use  (NO LOCK, wait-free)`)
      },
      {
        title: "latch, barrier, and counting_semaphore (C++20)",
        content:
          "C++20 added three coordination primitives that previously had to be built from a mutex and a condition variable, which people routinely got wrong. A latch is a single-use downward counter: threads count it down and any number of threads can wait for it to reach zero, after which it can never be reused - the natural fit for start-gate and completion-fence patterns. A barrier is the reusable version, with an arrival count that resets each cycle and an optional completion function invoked exactly once, by one arriving thread, between phases - which is precisely what iterative parallel algorithms need. A counting_semaphore holds a permit count with acquire and release, and unlike a mutex it has no ownership, so one thread may release a permit another acquired; that makes it the right tool for resource pools and for signalling, and binary_semaphore is the special case with a maximum of one. All three are typically implemented over atomic wait and notify, so uncontended use avoids a syscall entirely.",
        codeExample: `#include <latch>
#include <barrier>
#include <semaphore>

// LATCH: single-use countdown
std::latch start_gate{1};
std::latch finished{N};

for (int i = 0; i < N; ++i)
    workers.emplace_back([&] {
        start_gate.wait();          // all block until main opens the gate
        do_work();
        finished.count_down();      // signal completion
    });
start_gate.count_down();            // release every worker at once
finished.wait();                    // main blocks until all N are done
// A latch can NEVER be reset. Counting past zero is undefined.
finished.arrive_and_wait();         // count_down() then wait(), fused

// BARRIER: reusable, with a phase-completion function
std::barrier sync(N, [] {
    // runs ONCE per phase, on one arriving thread, while all others
    // are still blocked - so it can safely touch shared state
    swap_grids();
    ++generation;
});
for (int i = 0; i < N; ++i)
    workers.emplace_back([&, i] {
        for (int step = 0; step < steps; ++step) {
            compute_slice(i);
            sync.arrive_and_wait();      // wait for the whole phase
        }
    });
// This is the classic iterative-solver / cellular-automaton shape.
// The completion function removes the "who swaps the buffers?" race.
sync.arrive_and_drop();     // leave the barrier permanently; the
                            // expected count drops for future phases

// COUNTING SEMAPHORE: permits, not ownership
std::counting_semaphore<8> pool{8};      // 8 connections available
void query() {
    pool.acquire();                       // blocks if none free
    auto conn = take_connection();
    run(conn);
    give_back(conn);
    pool.release();                       // any thread may release
}
// Prefer RAII:
struct Permit {
    std::counting_semaphore<8>& s;
    Permit(std::counting_semaphore<8>& s) : s(s) { s.acquire(); }
    ~Permit() { s.release(); }
};

// BINARY SEMAPHORE: signalling between two specific threads
std::binary_semaphore signal{0};          // starts empty
std::jthread producer([&] { prepare(); signal.release(); });
signal.acquire();                          // main waits for the signal
// A mutex CANNOT do this: a mutex must be unlocked by the thread that
// locked it. A semaphore has no owner, which is exactly the point.

if (pool.try_acquire()) { /* non-blocking */ }
pool.try_acquire_for(std::chrono::milliseconds(50));
pool.try_acquire_until(deadline);

// atomic wait/notify (C++20) underpins all of the above and is
// directly usable - a futex-like primitive with no mutex needed
std::atomic<bool> ready{false};
// waiter:
ready.wait(false);                  // sleeps while the value == false
// notifier:
ready.store(true, std::memory_order_release);
ready.notify_all();
// wait() has no spurious wakeups in the condition-variable sense: it
// returns only when the value differs from the one you passed, though
// it may still wake and re-check internally.

// Choosing between them
//   latch      one-shot: "wait for N things to finish"
//   barrier    repeated phases: "everyone reach step k before step k+1"
//   semaphore  resource permits, or cross-thread signalling
//   cond var   an arbitrary predicate over shared state under a mutex`,
        diagram: asciiDiagram(`latch versus barrier versus semaphore

  LATCH ── single use, counts DOWN to zero, then stays open
  ┌────────────────────────────────────────────────────────┐
  │  latch finished{3}                                     │
  │                                                        │
  │  T1 ──work──► count_down()   3 ──► 2                   │
  │  T2 ──work──► count_down()   2 ──► 1                   │
  │  T3 ──work──► count_down()   1 ──► 0  ◄── gate opens   │
  │                                                        │
  │  main ── wait() ──────────────────────► resumes        │
  │                                                        │
  │  cannot be reset.  counting past 0 is undefined.       │
  └────────────────────────────────────────────────────────┘

  BARRIER ── reusable, resets each phase, completion callback
  ┌────────────────────────────────────────────────────────┐
  │  barrier sync{3, on_phase_end}                         │
  │                                                        │
  │  phase 0                                               │
  │    T1 ─compute─► arrive_and_wait  ░░░░░░ blocked       │
  │    T2 ─compute─► arrive_and_wait  ░░░░ blocked         │
  │    T3 ─compute─► arrive_and_wait  ← last arrival       │
  │                       │                                │
  │                       ▼                                │
  │              on_phase_end()  ← runs ONCE, alone,       │
  │                                while others block      │
  │                       │                                │
  │                       ▼  counter resets to 3           │
  │    T1 ─┐  T2 ─┐  T3 ─┐   all released together         │
  │  phase 1                                               │
  │    ...repeat...                                        │
  └────────────────────────────────────────────────────────┘

  COUNTING SEMAPHORE ── permits, NO ownership
  ┌────────────────────────────────────────────────────────┐
  │  counting_semaphore<4> pool{4}    permits: ████        │
  │                                                        │
  │  T1 acquire()  ███░       T2 acquire()  ██░░           │
  │  T3 acquire()  █░░░       T4 acquire()  ░░░░           │
  │  T5 acquire()  ══► BLOCKS until someone releases       │
  │                                                        │
  │  T2 release()  █░░░  ──► T5 wakes and proceeds         │
  │                                                        │
  │  KEY: T2 may release a permit T1 acquired.             │
  │       A mutex forbids this - it has an OWNER.          │
  └────────────────────────────────────────────────────────┘

  choosing
    "wait for N things, once"        ──► latch
    "sync every iteration"           ──► barrier
    "at most K at a time" / signal   ──► semaphore
    "arbitrary predicate on state"   ──► mutex + condition_variable`)
      },
      {
        title: "Lock Granularity, Hierarchies, and Contention",
        content:
          "Once correctness is settled, the remaining question is how much a lock costs, and the answer is dominated by contention rather than by the lock operation itself. An uncontended mutex acquisition is a single atomic exchange in user space, tens of nanoseconds; a contended one falls into the kernel, parks the thread, and costs a microsecond or more plus a cold cache on resumption. That asymmetry drives every practical guideline: hold locks briefly, never call into unknown code while holding one, and split a single hot lock into many by sharding the data. A lock hierarchy - assigning each mutex a level and refusing to acquire one at or above the level already held - converts potential deadlocks into immediate, testable failures, and a fifty-line hierarchical_mutex catches ordering violations the first time they execute rather than at three in the morning under load.",
        codeExample: `// Granularity: the same data, three lock designs
// 1. ONE global lock - correct, and a bottleneck
class CoarseCache {
    std::mutex m_;
    std::unordered_map<Key, Value> map_;
public:
    Value get(const Key& k) { std::lock_guard lk(m_); return map_[k]; }
};

// 2. SHARDED - N independent locks, contention divided by N
class ShardedCache {
    static constexpr std::size_t kShards = 64;
    struct Shard {
        alignas(64) std::mutex m;              // one lock per cache line
        std::unordered_map<Key, Value> map;
    };
    std::array<Shard, kShards> shards_;
    Shard& shard_for(const Key& k) {
        return shards_[std::hash<Key>{}(k) % kShards];
    }
public:
    Value get(const Key& k) {
        Shard& s = shard_for(k);
        std::lock_guard lk(s.m);
        return s.map[k];
    }
};
// alignas(64) prevents false sharing between adjacent shard locks -
// without it, two locks share a cache line and contend even when the
// data does not. Use std::hardware_destructive_interference_size.

// 3. Copy the RESULT, work outside the lock
Value expensive(const Key& k) {
    Value v;
    { std::lock_guard lk(m_); v = map_[k]; }   // lock is held for ~50ns
    return transform(v);                        // slow work, unlocked
}

// NEVER call unknown code while holding a lock
void bad(const Data& d) {
    std::lock_guard lk(m_);
    callback_(d);       // user code. May block, may take another lock,
}                       // may re-enter THIS class. Unbounded risk.
void good(const Data& d) {
    Callback cb;
    { std::lock_guard lk(m_); cb = callback_; }
    cb(d);              // invoked with NOTHING held
}

// A lock hierarchy makes ordering violations fail loudly
class HierarchicalMutex {
    std::mutex m_;
    const unsigned level_;
    unsigned prev_ = 0;
    static thread_local unsigned current_;      // 0 = holding nothing
    void check() const {
        if (current_ <= level_)
            throw std::logic_error("lock hierarchy violated");
    }
public:
    explicit HierarchicalMutex(unsigned level)
        : level_(level), prev_(0) {}
    void lock() {
        check();                                // must go strictly DOWN
        m_.lock();
        prev_ = current_;
        current_ = level_;
    }
    void unlock() {
        if (current_ != level_) throw std::logic_error("bad unlock order");
        current_ = prev_;
        m_.unlock();
    }
    bool try_lock() {
        check();
        if (!m_.try_lock()) return false;
        prev_ = current_; current_ = level_;
        return true;
    }
};
thread_local unsigned HierarchicalMutex::current_ = ~0u;   // top level

HierarchicalMutex ui_lock{10000};       // high level: outermost
HierarchicalMutex db_lock{5000};        // mid
HierarchicalMutex log_lock{100};        // low: innermost, leaf
// ui -> db -> log is allowed. log -> db THROWS on the spot, in a unit
// test, instead of deadlocking in production once a month.

// Measuring contention rather than guessing
//   perf lock contention / perf record -e sched:sched_switch
//   Linux: /proc/<pid>/status voluntary_ctxt_switches - a spike means
//          threads are blocking on locks
//   ThreadSanitizer: -fsanitize=thread finds races, not contention
//   Instrument directly: if (!m.try_lock()) { ++contended; m.lock(); }

// Rule of thumb ordering of remedies, best first:
//   1. Do not share the data at all (thread-local, or partitioned)
//   2. Make it immutable and publish snapshots atomically
//   3. Shard the lock
//   4. Shorten the critical section
//   5. Only then consider lock-free structures`
      },
      {
        title: "Thread-Local Storage and Initialisation Order",
        content:
          "thread_local gives each thread its own instance of a variable, which removes sharing entirely and is therefore the cheapest possible answer to a contention problem when it applies. The cost is real but modest: access usually compiles to a TLS-register-relative load, though a variable in a dynamically loaded library may need a call into the runtime's TLS resolver on first access per thread. Constructors run lazily on first use in each thread and destructors run at that thread's exit, which creates two hazards - a thread_local in a detached thread may be destroyed after main returns, and a thread_local whose destructor touches another thread_local can observe one that has already been destroyed. The static initialisation order fiasco has a thread-local analogue, and the reliable defence is the same: prefer function-local statics, which are initialised on first call and destroyed in reverse order of completed initialisation.",
        codeExample: `// Per-thread state removes contention entirely
thread_local std::mt19937 rng{std::random_device{}()};
int roll() { return std::uniform_int_distribution{1, 6}(rng); }
// No lock, no sharing, no false sharing. Each thread pays one
// construction and one 5 KB engine.

// Per-thread accumulation, merged once at the end - the standard
// pattern for parallel reductions
class Stats {
    struct Local { std::uint64_t count = 0, sum = 0; };
    static thread_local Local local_;
    static inline std::mutex m_;
    static inline Local global_;
public:
    static void record(std::uint64_t v) {
        ++local_.count; local_.sum += v;        // NO synchronisation
    }
    static void flush() {                       // called rarely
        std::lock_guard lk(m_);
        global_.count += local_.count; global_.sum += local_.sum;
        local_ = {};
    }
};
thread_local Stats::Local Stats::local_;

// Lazy construction, per thread
struct Tracer { Tracer()  { open_file(); }
                ~Tracer() { close_file(); } };
thread_local Tracer tracer;      // constructed on FIRST USE in each
                                 // thread, destroyed at thread exit

// HAZARD 1: detached threads and process exit
// A detached thread's thread_local destructors may run after main
// returns and after namespace-scope statics are gone, so a destructor
// that logs to a global logger touches a destroyed object.
// This is a strong argument for jthread over detach.

// HAZARD 2: destruction order between thread_locals
thread_local Logger  logger;
thread_local Session session;      // ~Session logs via 'logger'
// Destruction order is reverse of COMPLETED CONSTRUCTION order. If
// 'session' was constructed first, 'logger' is destroyed first and
// ~Session uses a dead object.
// Fix: function-local statics force the dependency to be constructed
// first, because the accessor is CALLED during construction:
Logger& logger_ref() { thread_local Logger l; return l; }
struct Session2 {
    Session2() { logger_ref(); }               // guarantee ordering
    ~Session2() { logger_ref().write("bye"); }  // safe
};

// Storage duration recap
int                g;         // static duration, whole program
thread_local int   t;         // thread duration, one per thread
void f() { static int s;      // static duration, magic-static init
           thread_local int u; }  // thread duration, lazily per thread

// thread_local at namespace scope in a shared library may use the
// slower general-dynamic TLS model with a __tls_get_addr call on
// first access per thread; -ftls-model=initial-exec avoids it when
// the library is never dlopen'd.

// Cost comparison for a hot counter
//   std::atomic<uint64_t> shared;          ~20ns, cache line ping-pong
//   mutex + uint64_t                       ~25ns uncontended, worse under load
//   thread_local uint64_t + periodic merge  ~1ns, scales linearly
// The last one is why per-thread accumulation dominates metrics code.`
      },
      {
        title: "Testing and Debugging Concurrent Code",
        content:
          "Concurrency bugs resist ordinary testing because a passing run proves nothing about the interleavings that did not occur, and the probability of hitting a narrow window may be one in millions on a developer machine and one in ten under production load. The single highest-value tool is ThreadSanitizer, which instruments memory accesses and tracks a happens-before relation, so it reports a data race after observing the two accesses in any order rather than requiring them to actually collide - a race that manifests once a year is usually found on the first instrumented run. Beyond that, the practical toolkit is: stress with more threads than cores to force preemption, inject delays at suspected windows, use assertions on invariants rather than on outcomes, and prefer designs whose correctness is argued structurally rather than tested statistically.",
        codeExample: `// ThreadSanitizer - the single most valuable tool
//   g++ -fsanitize=thread -g -O1 prog.cpp
//   clang++ -fsanitize=thread -g -O1 prog.cpp
// Reports: data races, lock-order inversions (potential deadlocks),
//          use of a destroyed mutex, thread leaks.
// Cost: 5-15x slower, 5-10x more memory. Run it in CI on the test
// suite, not in production.
// It finds races it OBSERVES - so coverage still matters, but it does
// not require the two accesses to actually interleave.

// AddressSanitizer catches the use-after-free that races produce
//   g++ -fsanitize=address,undefined -g
// TSan and ASan cannot be combined; run two CI jobs.

// Helgrind / DRD (valgrind) are alternatives with no rebuild needed
//   valgrind --tool=helgrind ./prog

// Stress patterns that actually find bugs
TEST(Queue, ConcurrentPushPop) {
    BlockingQueue<int> q{16};
    constexpr int kProducers = 8, kConsumers = 8, kPerProducer = 10000;
    std::atomic<long> consumed_sum{0};
    std::vector<std::jthread> ts;
    for (int p = 0; p < kProducers; ++p)
        ts.emplace_back([&] {
            for (int i = 0; i < kPerProducer; ++i) q.push(i);
        });
    for (int c = 0; c < kConsumers; ++c)
        ts.emplace_back([&] {
            int v; while (q.pop(v)) consumed_sum += v;
        });
    // OVERSUBSCRIBE: more threads than cores forces preemption at
    // arbitrary points, which is what widens the racy windows.
    ...
}

// Deliberate delay injection to widen a suspected window
#ifdef STRESS_TEST
  #define RACE_WINDOW() std::this_thread::yield()
#else
  #define RACE_WINDOW() ((void)0)
#endif
void publish() {
    node->next = head;
    RACE_WINDOW();                 // makes the CAS window huge
    head.compare_exchange_weak(...);
}

// Assert INVARIANTS, not outcomes. Outcomes are timing-dependent;
// invariants must hold in every interleaving.
void pop() {
    std::lock_guard lk(m_);
    assert(size_ <= capacity_);            // invariant: always true
    // NOT: assert(size_ == expected);     // timing-dependent
}

// Reproducibility techniques
//   - fixed seeds for any randomised scheduling
//   - run the test 10,000 times in CI (--gtest_repeat=10000)
//   - taskset to a single core to expose different interleavings
//   - run on ARM as well as x86: ARM's weaker memory model exposes
//     missing acquire/release that x86's TSO hides completely

// What TSan CANNOT find
//   - higher-level race conditions with no data race (check-then-act
//     where each step is individually locked)
//   - deadlocks that require a specific interleaving it never sees
//     (though it does report lock-order inversions proactively)
//   - livelock and starvation
//   - performance problems: contention, false sharing, convoying

// For those, model checking is the tool: CDSChecker, GenMC, or
// relacy explore ALL interleavings of a small test exhaustively.
// Worth it for a lock-free data structure, overkill for a mutex.

// Static analysis: clang thread-safety annotations
class Counter {
    std::mutex m_;
    int n_ GUARDED_BY(m_) = 0;         // -Wthread-safety
public:
    void inc() { std::lock_guard lk(m_); ++n_; }
    int bad() const { return n_; }     // WARNING: reading without m_
};
// Compile-time, zero cost, and catches the whole class of "forgot the
// lock" bugs. Requires -Wthread-safety and the annotation macros.`
      }
    ],
    examples: [
      {
        title: "A shared_mutex that makes a read-heavy cache slower",
        input: "A cache of pointers guarded by shared_mutex, read by sixteen threads with a critical section consisting of one map lookup returning a pointer.",
        output: "Throughput is lower than the same cache guarded by a plain std::mutex.",
        explanation:
          "Step 1: The critical section is a hash lookup, on the order of 20 to 50 nanoseconds, while acquiring a shared_mutex in shared mode costs roughly 40 to 100 nanoseconds against 15 to 25 for a plain mutex.\nStep 2: Acquiring shared ownership requires an atomic read-modify-write on the reader count, so every reader on every core writes the same cache line, and the coherence protocol serialises those writes exactly as a mutex would.\nStep 3: The result is that the readers do not actually proceed in parallel through the lock acquisition, they merely proceed in parallel through the tiny body, so the concurrency gain is smaller than the extra fixed cost.\nStep 4: shared_mutex pays off when the critical section is long enough to dominate - roughly a microsecond or more - such as a tree traversal, a serialisation pass, or anything touching many cache lines.\nStep 5: For short read-mostly access the right structure is an immutable snapshot published through an atomic shared_ptr, which makes reads wait-free with no shared write at all, at the cost of allocating a new snapshot per write."
      },
      {
        title: "A deadlock caught by a lock hierarchy in a unit test",
        input: "Code that acquires a database lock while already holding a low-level logging lock, using hierarchical_mutex with levels 5000 and 100 respectively.",
        output: "std::logic_error(\"lock hierarchy violated\") is thrown on the first execution of that path.",
        explanation:
          "Step 1: The hierarchy assigns each mutex a level and maintains a thread_local variable holding the level of the innermost lock currently held, initialised to the maximum value so the first acquisition always succeeds.\nStep 2: Acquiring a mutex requires its level to be strictly below the current one, encoding the rule that locks are always taken outermost first and released innermost first.\nStep 3: Holding the log lock at level 100 and then requesting the database lock at level 5000 violates that, because 5000 is not below 100, so the check throws before the underlying mutex is ever touched.\nStep 4: This converts a latent deadlock - which needs another thread to take the two locks in the opposite order, at the same moment, to manifest - into a deterministic failure on the very first execution of the offending path, whether or not any other thread exists.\nStep 5: The cost is one thread_local read and one comparison per lock, which is negligible next to the atomic exchange the mutex performs anyway, so many codebases keep the hierarchy enabled in release builds as well as tests."
      },
      {
        title: "Replacing an atomic counter with per-thread accumulation",
        input: "A metrics counter incremented by every request across sixteen threads, implemented as std::atomic<uint64_t> with fetch_add.",
        output: "Switching to a thread_local counter merged periodically raises throughput by more than an order of magnitude on the counter itself.",
        explanation:
          "Step 1: Every fetch_add is a read-modify-write that must obtain the cache line in exclusive state, so with sixteen cores incrementing the same line the coherence protocol transfers it back and forth continuously.\nStep 2: Each transfer costs roughly 40 to 100 nanoseconds of latency depending on whether the line comes from another core's L1 on the same socket or across sockets, and the operations serialise completely.\nStep 3: A thread_local counter is a plain non-atomic increment on a line that no other core touches, so it stays in L1 and costs about one nanosecond, and the throughput scales linearly with cores instead of degrading.\nStep 4: The trade-off is that the global total is now approximate between merges, which is acceptable for metrics and unacceptable for anything the program's logic depends on, so the choice hinges on whether the reader needs an exact instantaneous value.\nStep 5: The merge itself takes the mutex, but at a frequency of once per second rather than once per request, so its contention is irrelevant - this asymmetry, cheap common path and expensive rare path, is the general shape of most successful concurrency optimisations."
      }
    ],
    tips: [
      "Reach for std::shared_mutex only when the critical section is long; for short read-mostly data an atomically published immutable snapshot is faster and simpler.",
      "Use a function-local static rather than std::call_once when the object being initialised is itself a static, since C++11 already guarantees thread-safe exactly-once initialisation.",
      "Align each mutex in an array of shards to std::hardware_destructive_interference_size, or adjacent locks will contend through false sharing even when their data does not."
    ],
    tricks: [
      "A hierarchical mutex costs one thread_local comparison per acquisition and turns latent lock-ordering deadlocks into deterministic exceptions on first execution.",
      "std::barrier's completion function runs on exactly one arriving thread while all others are still blocked, which is a race-free place to swap buffers between phases.",
      "A binary_semaphore can be released by a thread that never acquired it, which is the one thing a mutex cannot do and the reason it is the right primitive for cross-thread signalling."
    ],
    memoryAids: [
      "latch counts down once, barrier resets every phase, semaphore counts permits with no owner.",
      "Contention, not the lock operation, is what costs - an uncontended lock is nanoseconds and a contended one is microseconds.",
      "Never call unknown code while holding a lock: it may block, re-enter, or take another lock."
    ],
    interviewPatterns: [
      "'When would a reader-writer lock be slower than a plain mutex?' tests whether you understand fixed overhead versus concurrency gain.",
      "'Design a thread-safe cache for sixty-four cores' expects sharding, alignment against false sharing, and a discussion of snapshot publication.",
      "Frequency and companies: common at Google, Meta, and low-latency shops; usually a follow-up to a basic mutex question."
    ],
    practiceProblems: [
      "Why can a std::shared_lock not be upgraded to an exclusive lock? Answer: if two threads holding shared ownership both requested an upgrade, each would have to wait for the other to release before it could become exclusive, which is an unavoidable deadlock; the standard therefore omits the operation, and the correct pattern is to release the shared lock, acquire exclusively, and then re-check the condition that motivated the upgrade, because the state may have changed while no lock was held.",
      "Design a shutdown sequence for a thread pool whose workers block on a bounded queue. Answer: set a closed flag under the queue's mutex and notify_all on both the not-empty and not-full condition variables so that producers blocked on a full queue also wake; each worker's predicate must include the flag, popping returns false once the queue is closed and drained, workers then exit their loops, and the pool's destructor joins them - using jthread makes the join automatic, and calling close before the members are destroyed is essential since destroying a condition variable with waiters is undefined.",
      "You measure that a sharded cache with sixty-four mutexes still scales poorly. What is the likely cause? Answer: false sharing between the shard locks, because a std::mutex is around 40 bytes and several therefore occupy one 64-byte cache line, so threads locking logically independent shards contend on the same line in the coherence protocol; aligning each shard to std::hardware_destructive_interference_size fixes it, and the same reasoning applies to the per-shard data if it is small and stored adjacently."
    ],
    faq: [
      {
        question: "Why is std::shared_mutex often slower than std::mutex even for read-heavy workloads?",
        answer:
          "Because acquiring it in shared mode is itself a write. The implementation must atomically increment a reader count and check whether a writer is waiting, which is a read-modify-write on a cache line that every reader on every core touches - so the coherence protocol serialises those acquisitions in exactly the way a plain mutex would, and the supposed reader parallelism applies only to the body of the critical section. On top of that, the state machine is more complex than a mutex's single atomic exchange: implementations must track shared owners, exclusive ownership, and pending writers to avoid starving writers, so libstdc++'s shared_mutex acquisition is typically two to five times the cost of a mutex acquisition. The consequence is a break-even point: if the critical section is a hash lookup returning a pointer, at twenty to fifty nanoseconds, the extra forty nanoseconds of locking overhead outweighs any parallelism and the plain mutex wins. If the critical section is a tree traversal or a serialisation pass at a microsecond or more, genuine reader concurrency dominates and shared_mutex wins substantially. The practical guidance is therefore to measure rather than assume, and for the very common case of short reads over rarely changing data, to sidestep locking entirely by making the data immutable and publishing new versions through an atomic shared_ptr, which makes readers wait-free."
      },
      {
        question: "What is the difference between a latch and a barrier, and when do I need each?",
        answer:
          "A latch is single-use and a barrier is reusable, and that difference determines almost everything else about them. A std::latch is constructed with a count, threads call count_down to decrement it, and any number of threads may wait until it reaches zero, at which point it is permanently open and every subsequent wait returns immediately - it cannot be reset, and decrementing past zero is undefined behaviour. This makes it the natural fit for two shapes: a start gate, where workers wait on a latch of one that the coordinator releases so they all begin together, which is essential for benchmarking; and a completion fence, where the coordinator waits on a latch of N that each worker counts down as it finishes. A std::barrier is constructed with an expected arrival count and a completion function, and each cycle proceeds when that many threads have arrived, after which the counter resets and the barrier is ready for the next phase. That makes it the fit for iterative parallel algorithms - stencil computations, simulation steps, parallel sorts with merge phases - where every thread must finish step k before any thread begins step k plus one. The completion function is the feature that makes barriers more than a loop of latches: it runs exactly once per phase, on one arriving thread, while all the others are still blocked, so it is a race-free place to swap double buffers, advance a generation counter, or check a convergence criterion. Threads may also leave a barrier permanently with arrive_and_drop, which reduces the expected count for future phases and is how you handle workers that finish early. Both are typically implemented over the C++20 atomic wait and notify primitives, so uncontended use stays in user space."
      },
      {
        question: "Is thread_local expensive, and what are its pitfalls?",
        answer:
          "Access is usually cheap and the pitfalls are all about lifetime. In the common case where the variable lives in the main executable or a library loaded at startup, the compiler uses the initial-exec or local-exec TLS model and access compiles to a load at a fixed offset from a thread pointer register, costing about the same as a global. In a library that may be dlopen'd, the general-dynamic model applies and the first access per thread calls into the runtime's __tls_get_addr, which is a function call plus a lookup - still small, but no longer free in a hot loop, and -ftls-model=initial-exec avoids it when you know the library is never dynamically loaded. Non-trivially-constructible thread_locals add a guard check on every access to handle lazy construction, which the compiler often cannot optimise away. The real hazards are lifetime-related. Construction happens on first use in each thread and destruction at that thread's exit, so a thread_local in a detached thread may be destroyed after main has returned and after namespace-scope statics are gone, meaning its destructor can touch a destroyed logger or allocator. Destruction order among thread_locals is the reverse of completed-construction order, which reproduces the static initialisation order fiasco at thread scope: if a Session was constructed before a Logger, the Logger is destroyed first and the Session's destructor logs into a dead object. The fix is the same as for statics - wrap each in an accessor function containing a function-local thread_local, and touch the dependency in the dependent's constructor so the construction order is forced. Memory cost also compounds: a five-kilobyte thread_local buffer in a two-hundred-thread pool is a megabyte."
      },
      {
        question: "How do I actually find concurrency bugs, given that tests pass?",
        answer:
          "Accept that ordinary testing is nearly useless here and lean on tools that reason about interleavings rather than sampling them. ThreadSanitizer is by far the highest-value one: it instruments every memory access and maintains a vector-clock happens-before relation, so it reports a data race after merely observing two conflicting accesses that are not ordered by synchronisation, without requiring them to actually collide in time. A race that would manifest once a year in production is typically caught on the first instrumented run of a test that exercises the code path at all. It costs five to fifteen times in speed and five to ten in memory, which is fine for a CI job and not for production. It also detects lock-order inversions proactively, so it warns about a potential deadlock even when the deadlock never occurs. Beyond TSan, the techniques that work are: oversubscribing threads well beyond the core count so the scheduler preempts at arbitrary points and widens racy windows; injecting yields or short sleeps at suspected windows behind a stress-build macro; repeating the test thousands of times in CI; and running on ARM as well as x86, since ARM's weaker memory model exposes missing acquire and release annotations that x86's total store ordering hides entirely. Clang's thread-safety annotations catch the forgot-the-lock class at compile time for free. And for a lock-free data structure specifically, exhaustive model checkers such as CDSChecker, GenMC, or Relacy explore all interleavings of a small test, which is the only method that actually proves anything. What none of these find is a higher-level race condition with no data race - a check-then-act where each step is individually locked - so the design argument still has to be made by hand."
      },
      {
        question: "When should I use call_once instead of a function-local static?",
        answer:
          "Almost never, if the thing being initialised can be a function-local static. Since C++11 the standard guarantees that a local static's initialisation is thread-safe and happens exactly once: the first thread to reach the declaration performs the initialisation while any concurrent thread blocks until it completes, and after that the check is a single acquire load of a guard byte that branch prediction makes effectively free. This so-called magic statics guarantee is implemented with the same machinery call_once uses, so there is no performance argument, and the static version is shorter, cannot be misused by passing the wrong flag, and ties the flag's lifetime to the object's automatically. There are three cases where call_once still earns its place. The first is when the initialised state is not a single object - for example when initialisation configures several existing objects or performs a side effect such as registering a signal handler - since there is nothing to make a static of. The second is when the flag must live inside an instance rather than being global, as with a per-connection lazy handshake, where each object carries its own once_flag. The third is portability to environments where magic statics are disabled, which happens in some embedded toolchains via -fno-threadsafe-statics, where the static form silently becomes racy while call_once remains correct. In all three, note the exception semantics that both share and that a naive bool guard lacks: if the initialisation throws, the flag is not marked as done and the next caller retries, which is usually what you want and is the single most common bug in hand-rolled double-checked locking."
      },
      {
        question: "What is lock convoying and how do I recognise it?",
        answer:
          "Lock convoying is a pathology where a group of threads repeatedly contending for the same lock end up moving through it in lockstep, each one blocking, being descheduled, and being woken in turn, so that throughput collapses far below what the critical section's length would suggest. It starts when a thread holding a hot lock is preempted or takes a page fault while holding it: every other thread that arrives blocks in the kernel, and when the holder finally releases, the operating system wakes one waiter, which must be scheduled onto a core with a cold cache before it can even enter the critical section. Meanwhile the thread that just released comes around the loop and blocks behind the queue it just created. The system now pays a full context switch and a cache reload for every single acquisition, turning a twenty-nanosecond operation into several microseconds, and the threads remain locked in this pattern because the timing that created it is self-sustaining. You recognise it by a throughput collapse that is superlinear in the thread count, by voluntary context switches in /proc/pid/status rising to roughly one per operation, and by perf showing most time in futex wait and scheduler paths rather than in your own code. The remedies are all about not forming the queue: shorten the critical section so the holder is unlikely to be preempted inside it; shard the lock so arrivals spread across many; use a small amount of spinning before parking, which most modern std::mutex implementations already do adaptively; back off randomly on failure so waiters do not re-collide; or restructure so the shared state is not touched on the hot path at all. Fair locks make convoying worse rather than better, because strict FIFO handoff guarantees the cold-cache wakeup on every acquisition, which is why most production mutexes are deliberately unfair."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - std::shared_mutex, std::latch, std::barrier, std::counting_semaphore, std::call_once",
        insight: "Specifies the C++17 and C++20 coordination primitives and their arrival and completion semantics."
      },
      {
        source: "book",
        attribution: "Anthony Williams - C++ Concurrency in Action, chapters on designing lock-based data structures",
        insight: "Source of the hierarchical mutex design and the granularity guidance."
      },
      {
        source: "blog",
        attribution: "Google ThreadSanitizer documentation and the Clang thread-safety analysis guide",
        insight: "How happens-before race detection works and how GUARDED_BY annotations catch missing locks at compile time."
      }
    ]
  },
  {
    id: "topic-cpp-concurrency-atomics-and-the-memory-model",
    moduleId: "mod-cpp-concurrency",
    title: "std::atomic, the Memory Model, and Compare-and-Swap",
    intuition:
      "C++11 did something more significant than adding a thread library: it gave the language a memory model, which for the first time made multithreaded C++ a defined thing rather than a platform accident. The model says what a thread is allowed to observe of another thread's writes, and it is deliberately weak so that both compilers and processors keep their reordering freedom. std::atomic is the interface to it. An atomic is not merely a variable you may touch from two threads without tearing; it is a synchronisation point that constrains reordering of everything around it, and that second role is what makes the ordering parameter matter.",
    complexity: {
      time:
        "An atomic load or store with relaxed or acquire/release ordering compiles to an ordinary load or store on x86, so it is as fast as a normal access, roughly one to four cycles from L1. A sequentially consistent store on x86 requires an MFENCE or a locked exchange, around 20 to 40 cycles. A read-modify-write such as fetch_add or compare_exchange is a locked instruction costing about 20 cycles uncontended and, critically, 40 to 400 nanoseconds under contention because the cache line must be transferred in exclusive state between cores. Contention, not the instruction, is what dominates.",
      space:
        "std::atomic<T> is the size of T for the lock-free types, plus alignment: atomic<uint64_t> is 8 bytes aligned to 8, and atomic<T> for a T too large for a native instruction is T plus an embedded lock, typically making it larger. The is_always_lock_free trait tells you at compile time. The real space concern is not the object but the cache line: two atomics sharing a 64-byte line contend even when logically unrelated, so hot atomics should be aligned to std::hardware_destructive_interference_size, which costs 64 bytes each."
    },
    lesson: [
      {
        title: "What an Atomic Actually Guarantees",
        content:
          "An atomic operation gives you three separate things, and conflating them is the usual source of confusion. First, indivisibility: no other thread can observe a half-written value, which matters because a plain 64-bit write on a 32-bit platform, or any unaligned write, can tear. Second, freedom from the compiler's assumption that no other thread writes the variable, which is what stops a value being hoisted into a register and a spin loop becoming infinite. Third, and most importantly, ordering: an atomic operation with an ordering stronger than relaxed constrains how the surrounding non-atomic operations may be reordered by both the compiler and the processor, which is what lets one thread publish data and another safely read it. A volatile variable gives you none of these in the C++ model - it is for memory-mapped hardware, not for threads, and using it for synchronisation is a well-known mistake.",
        codeExample: `#include <atomic>

std::atomic<int> counter{0};
counter.fetch_add(1);                     // atomic read-modify-write
++counter;                                // same, operator sugar
int v = counter.load();                   // atomic read
counter.store(5);                         // atomic write
int old = counter.exchange(9);            // swap, returns previous

// Default ordering for every operation is seq_cst - the strongest
// and slowest. Explicit is better:
counter.fetch_add(1, std::memory_order_relaxed);

// Lock-freedom is a property of the TYPE and the platform
static_assert(std::atomic<int>::is_always_lock_free);       // C++17
struct Big { double a, b, c; };
std::atomic<Big> ab;                      // requires trivially copyable
assert(!ab.is_lock_free());               // 24 bytes -> internal mutex
// A non-lock-free atomic is a mutex in disguise: correct, but it is
// NOT usable in a signal handler and does not help latency.
std::atomic_flag f = ATOMIC_FLAG_INIT;    // the ONLY always-lock-free type

// Why volatile is NOT for threading
volatile bool ready = false;              // WRONG for synchronisation
// volatile means: do not optimise away this access, it may have side
// effects. It does NOT imply atomicity - a volatile 64-bit write can
// still tear. It does NOT prevent the COMPILER from reordering it
// with respect to non-volatile accesses. It emits NO fences, so the
// CPU may reorder freely. It is for MMIO registers and setjmp, and
// on MSVC with /volatile:ms it accidentally has acquire/release
// semantics, which is a non-portable extension.
std::atomic<bool> ready2{false};          // RIGHT

// Why atomicity alone is not enough - the publication problem
Data* ptr = nullptr;                       // plain pointer
std::atomic<bool> ready3{false};
// producer:
ptr = new Data(42);                        // (1) plain write
ready3.store(true, std::memory_order_release);   // (2)
// consumer:
while (!ready3.load(std::memory_order_acquire)) {}
use(*ptr);                                 // sees the fully built Data
// The RELEASE store guarantees (1) is visible to any thread that
// observes (2) via an ACQUIRE load. Without those orderings, the
// compiler or CPU could move (1) after (2) and the consumer would
// dereference a partially constructed object.

// atomic<shared_ptr> and atomic<weak_ptr> (C++20) make snapshot
// publication safe without a lock:
std::atomic<std::shared_ptr<const Config>> cfg;
auto snapshot = cfg.load();               // readers never block

// atomic_ref (C++20): atomic access to an object you do not own
int data[1000];
void bump(int i) {
    std::atomic_ref<int> r(data[i]);
    r.fetch_add(1, std::memory_order_relaxed);
}
// The underlying object must be suitably aligned, and while any
// atomic_ref to it exists ALL access must go through atomic_refs.

// Signal-handler safety
// Only std::atomic_flag and lock-free atomics of integral types are
// guaranteed usable in a signal handler; std::atomic<T>::is_lock_free
// is a runtime query, is_always_lock_free a compile-time one.`,
        diagram: asciiDiagram(`The three guarantees of an atomic, and what volatile gives you

  ┌─────────────────────────────────────────────────────────────┐
  │ 1. INDIVISIBILITY (no tearing)                              │
  │                                                             │
  │    plain 64-bit store on a 32-bit target:                   │
  │      writer: [ lo=0xAAAA ] ... [ hi=0xBBBB ]                │
  │      reader:            ▲ observes lo new, hi OLD           │
  │                         └── a value that was never stored   │
  │                                                             │
  │    atomic store: the whole 64 bits become visible at once   │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ 2. THE COMPILER MUST RE-READ IT                             │
  │                                                             │
  │    while (!ready) { }        with plain bool:               │
  │      the compiler may hoist the load out of the loop        │
  │        r = ready;  while (!r) { }   ⇒ INFINITE LOOP         │
  │      because no other thread may legally write it           │
  │                                                             │
  │    with atomic: the load happens every iteration            │
  └─────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ 3. ORDERING  ◄── the one that actually matters              │
  │                                                             │
  │  producer                       consumer                    │
  │  ────────                       ────────                    │
  │  ptr = new Data(42);   (1)                                  │
  │      │                                                      │
  │      │ release store ── nothing above may sink below        │
  │      ▼                                                      │
  │  ready.store(true, release) ─────► ready.load(acquire)      │
  │                                          │                  │
  │        acquire load ── nothing below may hoist above        │
  │                                          ▼                  │
  │                                    use(*ptr);   sees (1)    │
  │                                                             │
  │  the release/acquire PAIR creates happens-before, so the    │
  │  plain write (1) is visible without being atomic itself     │
  └─────────────────────────────────────────────────────────────┘

  volatile gives                    atomic gives
  ┌──────────────────────┐          ┌──────────────────────┐
  │ re-read: YES         │          │ re-read: YES         │
  │ indivisible: NO      │          │ indivisible: YES     │
  │ ordering: NO         │          │ ordering: YES        │
  │ CPU fences: NONE     │          │ as requested         │
  └──────────────────────┘          └──────────────────────┘
     ⇒ volatile is for MMIO and signals, NEVER for threads`)
      },
      {
        title: "Compare-and-Exchange and the Lock-Free Update Loop",
        content:
          "compare_exchange is the primitive from which every lock-free algorithm is built. It atomically compares the current value with an expected value and, if they match, stores a desired value; if they do not, it writes the actual current value back into expected and returns false. That write-back is the detail people forget, and it is what makes the canonical retry loop work without an extra load. The weak form is permitted to fail spuriously even when the values match, which allows it to compile to a bare load-linked/store-conditional pair on ARM and POWER, so it is the right choice inside a loop; the strong form retries internally to suppress spurious failure and is only worth using when there is no loop. Two failure modes recur: forgetting that expected is modified, and the ABA problem, where a value changes to something else and back so that the comparison succeeds despite the state having moved.",
        codeExample: `// The canonical lock-free update loop
std::atomic<int> value{0};
void multiply_by(int factor) {
    int expected = value.load(std::memory_order_relaxed);
    while (!value.compare_exchange_weak(
               expected, expected * factor,
               std::memory_order_release,      // on SUCCESS
               std::memory_order_relaxed)) {   // on FAILURE
        // compare_exchange WROTE the current value into 'expected',
        // so the next iteration recomputes from the fresh value.
        // No explicit reload is needed - this is the whole point.
    }
}

// weak vs strong
// weak:   may fail spuriously (returns false with expected == actual).
//         On ARM/POWER it maps to a single LL/SC pair. Use IN A LOOP.
// strong: never fails spuriously; on LL/SC platforms it must add an
//         internal retry loop, so it is strictly more expensive.
//         Use only when there is no surrounding loop:
bool try_claim() {
    int expected = 0;
    return slot.compare_exchange_strong(expected, my_id);
}

// Two orderings: success and failure. The failure ordering may not be
// stronger than the success ordering, and cannot be release/acq_rel
// (a failed CAS performs no store, so there is nothing to release).

// A lock-free stack, and the ABA problem it exposes
template <class T>
class Stack {
    struct Node { T v; Node* next; };
    std::atomic<Node*> head_{nullptr};
public:
    void push(T v) {
        Node* n = new Node{std::move(v), head_.load(std::memory_order_relaxed)};
        while (!head_.compare_exchange_weak(
                   n->next, n,
                   std::memory_order_release,
                   std::memory_order_relaxed)) {}
        // n->next IS the 'expected' slot - elegant, and correct.
    }
    bool pop(T& out) {
        Node* old = head_.load(std::memory_order_acquire);
        while (old && !head_.compare_exchange_weak(
                          old, old->next,
                          std::memory_order_acquire,
                          std::memory_order_relaxed)) {}
        if (!old) return false;
        out = std::move(old->v);
        delete old;             // <-- UNSAFE: another thread may be
        return true;            //     dereferencing 'old' right now
    }
};

// THE ABA PROBLEM in pop():
//   T1 reads head = A, and is about to CAS(A -> A->next == B)
//   T2 pops A, pops B, pushes A back. head == A again, but A->next
//      is now C, and B has been deleted.
//   T1's CAS compares head against A - it MATCHES - and stores B.
//   head now points at freed memory.
// The comparison succeeded on the VALUE while the STATE had changed.

// Fix 1: a tagged pointer - pack a counter beside the pointer
struct TaggedPtr { Node* p; std::uintptr_t tag; };
std::atomic<TaggedPtr> head_;      // needs 128-bit CAS (cmpxchg16b);
// check is_lock_free(), and note the alignas(16) requirement.

// Fix 2: never reuse memory while a reader may hold it -
//   hazard pointers, epoch-based reclamation, or RCU.
//   C++26 adds std::hazard_pointer and std::rcu_domain.

// Fix 3: use shared_ptr and accept the cost (atomic<shared_ptr> in
//   C++20 is usually NOT lock-free, so this is a mutex in disguise).

// Fetch operations available on integral and pointer atomics
counter.fetch_add(1);  fetch_sub(1);
flags.fetch_or(kBit);  fetch_and(~kBit);  fetch_xor(kBit);
// There is NO fetch_mul or fetch_max before C++26 - use a CAS loop.

// atomic_flag: test_and_set / clear, and a spinlock built from it
class SpinLock {
    std::atomic_flag f_ = ATOMIC_FLAG_INIT;
public:
    void lock() {
        while (f_.test_and_set(std::memory_order_acquire)) {
            while (f_.test(std::memory_order_relaxed))   // C++20
                _mm_pause();     // reduce coherence traffic while spinning
        }
    }
    void unlock() { f_.clear(std::memory_order_release); }
};
// The inner relaxed test is the "test and test-and-set" optimisation:
// spinning on a plain load keeps the line SHARED rather than fighting
// for EXCLUSIVE ownership on every attempt.
// A spinlock is only correct when the critical section is a few
// nanoseconds AND the holder cannot be preempted. Otherwise use a
// mutex, which spins briefly and then parks.`,
        diagram: asciiDiagram(`compare_exchange, the retry loop, and ABA

  THE RETRY LOOP ── why 'expected' is an in/out parameter
  ┌──────────────────────────────────────────────────────────────┐
  │  int expected = value.load();          expected = 5          │
  │                                                              │
  │  compare_exchange_weak(expected, expected * 2)               │
  │        │                                                     │
  │        ├─ value == 5 ?                                       │
  │        │     YES ─► store 10, return true   ✓ done           │
  │        │                                                     │
  │        └─ NO (another thread stored 7)                       │
  │              ├─ WRITE 7 into 'expected'   ◄── the key step   │
  │              └─ return false                                 │
  │                                                              │
  │  loop again: compare_exchange_weak(expected=7, 14)           │
  │                                                              │
  │  ⇒ no explicit reload is ever needed                         │
  └──────────────────────────────────────────────────────────────┘

  weak vs strong on ARM (load-linked / store-conditional)
  ┌──────────────────────────────────────────────────────────────┐
  │  weak    LDXR / CMP / STXR          ← one attempt            │
  │          STXR may fail if the reservation was lost to an     │
  │          interrupt or a neighbouring write ⇒ SPURIOUS        │
  │                                                              │
  │  strong  must wrap the above in its own retry loop           │
  │          ⇒ strictly more code, so use weak inside a loop     │
  └──────────────────────────────────────────────────────────────┘

  THE ABA PROBLEM
  ┌──────────────────────────────────────────────────────────────┐
  │  initial     head ──► A ──► B ──► C                          │
  │                                                              │
  │  T1: reads head = A, computes next = B                       │
  │      ░░░ preempted before the CAS ░░░                        │
  │                                                              │
  │  T2: pop A     head ──► B ──► C      (A freed)               │
  │      pop B     head ──► C            (B freed)               │
  │      push A    head ──► A ──► C      (A reallocated!)        │
  │                                                              │
  │  T1: CAS(head, expected = A, desired = B)                    │
  │        head IS A  ⇒  the comparison SUCCEEDS                 │
  │        head ──► B ── but B was FREED                         │
  │                                                              │
  │  ┌────────────────────────────────────────────────────┐      │
  │  │ the pointer VALUE was unchanged;                   │      │
  │  │ the STATE it referred to was not.                  │      │
  │  └────────────────────────────────────────────────────┘      │
  └──────────────────────────────────────────────────────────────┘

  fixes
    tagged pointer   [ ptr | counter ]  128-bit CAS; the counter
                     changes on every push, so A-with-tag-7 never
                     compares equal to A-with-tag-9
    hazard pointers  a reader publishes what it is reading; memory
                     is not freed while any hazard names it
    epoch / RCU      defer reclamation until every reader that could
                     hold a reference has passed a quiescent point`)
      },
      {
        title: "Sequential Consistency and Why It Is the Default",
        content:
          "Sequential consistency is the model people already have in their heads: all sequentially consistent operations across all threads appear in one single total order that every thread agrees on, and each thread's operations appear in that order in program order. It is the default for every std::atomic operation precisely because it is the only model in which naive reasoning is sound, and because the classic reordering paradoxes - Dekker's algorithm, independent reads of independent writes, store buffering - simply cannot occur. Its cost is asymmetric across architectures and worth knowing: on x86 loads are free and only stores need a fence, because the hardware already provides total store ordering, so seq_cst costs about 20 to 40 cycles per store and nothing per load; on ARM and POWER both sides need barriers and the penalty is spread across every operation. The practical advice is to start with the default, and to weaken only where profiling shows an atomic on the hot path and where you can articulate the happens-before argument.",
        codeExample: `// Store buffering: the canonical test that seq_cst forbids
std::atomic<int> x{0}, y{0};
int r1, r2;
// thread 1: x.store(1); r1 = y.load();
// thread 2: y.store(1); r2 = x.load();
// Under seq_cst, r1 == 0 && r2 == 0 is IMPOSSIBLE: a single total
// order must place one store before the other's load.
// Under acquire/release it is POSSIBLE and happens on real x86,
// because each core's store buffer delays its write while its load
// proceeds from cache. This is the one case where release/acquire
// is genuinely weaker than seq_cst on x86.

// Independent reads of independent writes (IRIW)
// t1: x = 1        t2: y = 1
// t3: sees x then y        t4: sees y then x
// Under seq_cst all four must agree on one order. Under weaker
// orderings t3 and t4 may disagree - possible on POWER, not on x86.

// Cost on x86-64 (total store ordering hardware)
std::atomic<int> a;
a.load(std::memory_order_seq_cst);      // plain MOV - FREE
a.load(std::memory_order_acquire);      // plain MOV - FREE
a.load(std::memory_order_relaxed);      // plain MOV - FREE
a.store(1, std::memory_order_relaxed);  // plain MOV - free
a.store(1, std::memory_order_release);  // plain MOV - free
a.store(1, std::memory_order_seq_cst);  // XCHG or MOV+MFENCE
                                        // ~20-40 cycles
// ⇒ on x86 the ONLY thing seq_cst costs you is the store side.
// Weakening loads gains nothing; weakening stores gains ~30 cycles.

// Cost on AArch64
// seq_cst load  -> LDAR      seq_cst store -> STLR (+ DMB pre-v8.3)
// acquire load  -> LDAR      release store -> STLR
// relaxed       -> LDR / STR (no barrier at all)
// ⇒ acquire/release is nearly free relative to seq_cst on modern ARM,
//   but relaxed is meaningfully cheaper than both.

// Compiler reordering is constrained too, regardless of hardware
int data = 0;
std::atomic<bool> flag{false};
data = 42;
flag.store(true, std::memory_order_release);
// The compiler may NOT sink 'data = 42' below the release store, and
// may not hoist anything from after the store to before it in a way
// that breaks the release semantics.

// A seq_cst FENCE orders around it without being tied to one object
std::atomic_thread_fence(std::memory_order_seq_cst);
// Fences are strictly stronger than the equivalent operation ordering
// and are usually the wrong tool - prefer ordering on the operation
// itself, which the compiler can target more precisely.

// Rule of thumb
//   default to seq_cst; it is correct-by-construction
//   move to acquire/release when you can name the release store and
//     the acquire load that pair with it
//   use relaxed ONLY for counters whose value is not used to order
//     anything else (statistics, reference counts on increment)
//   use consume never - it is deprecated in practice and every
//     implementation promotes it to acquire`
      },
      {
        title: "Reference Counting: A Complete Ordering Case Study",
        content:
          "The reference count in shared_ptr is the best small example of ordering chosen deliberately, and it appears in interviews constantly. Incrementing can be fully relaxed, because the thread doing it already holds a reference, so the object cannot die underneath it and the increment orders nothing. Decrementing cannot be relaxed, because the thread that drops the count to zero must observe every write made by every other thread that ever held a reference before it runs the destructor. The standard solution is a release on the decrement, which publishes this thread's writes, followed by an acquire fence on the zero path only, which synchronises with all the other releases. This gives the fast path - the non-final decrement - no barrier at all on ARM, while the rare final decrement pays for the full ordering.",
        codeExample: `// The idiom, as it appears in libstdc++ and Boost
class ControlBlock {
    std::atomic<long> strong_{1};
    T* ptr_;
public:
    void add_ref() {
        // RELAXED is correct: the caller already holds a reference, so
        // the object cannot be destroyed, and the increment does not
        // order any other memory access.
        strong_.fetch_add(1, std::memory_order_relaxed);
    }
    void release() {
        // RELEASE: publish everything this thread did with the object
        // to whichever thread ends up destroying it.
        if (strong_.fetch_sub(1, std::memory_order_release) == 1) {
            // We took it to zero. Now ACQUIRE, so that every other
            // thread's release-decrement happens-before the destructor.
            std::atomic_thread_fence(std::memory_order_acquire);
            delete ptr_;
        }
    }
};

// Why relaxed would be WRONG for the decrement:
//   T1: obj->buffer[0] = 42;        release();     // count 2 -> 1
//   T2:                             release();     // count 1 -> 0
//                                   delete obj;    // reads buffer?
// With a relaxed decrement there is no happens-before between T1's
// write and T2's destructor, so the destructor could read a stale or
// torn value, and any sanitiser would flag it as a data race.

// Why the ACQUIRE FENCE rather than acq_rel on every decrement:
strong_.fetch_sub(1, std::memory_order_acq_rel);   // also correct
// but this pays for acquire on EVERY decrement. On ARM that is a real
// barrier each time. The fence version pays only on the final one,
// which happens once per object rather than once per reference drop.
// On x86 both compile identically (LOCK XADD), so the distinction
// matters on weakly-ordered hardware.

// The weak count and the two-phase teardown
// shared_ptr keeps TWO counts:
//   strong == 0  -> run the destructor, free the OBJECT
//   weak   == 0  -> free the CONTROL BLOCK itself
// A weak_ptr::lock() must atomically increment strong ONLY if it is
// currently non-zero, which is a CAS loop, not a fetch_add:
bool try_add_ref() {
    long n = strong_.load(std::memory_order_relaxed);
    do {
        if (n == 0) return false;          // already destroyed
    } while (!strong_.compare_exchange_weak(
                 n, n + 1,
                 std::memory_order_acquire,
                 std::memory_order_relaxed));
    return true;
}
// A plain fetch_add would resurrect an object whose destructor is
// already running.

// Relaxed's other legitimate uses
std::atomic<std::uint64_t> requests{0};
requests.fetch_add(1, std::memory_order_relaxed);   // pure statistic
// Correct because nothing is ordered by this counter; the value is
// only read for reporting.

std::atomic<bool> stop{false};
stop.store(true, std::memory_order_relaxed);        // a bare flag
while (!stop.load(std::memory_order_relaxed)) work();
// Correct ONLY if no data is published alongside the flag. The moment
// you want the worker to see something you wrote before setting it,
// you need release/acquire.

// Sequence generation
std::atomic<std::uint64_t> next_id{0};
std::uint64_t id = next_id.fetch_add(1, std::memory_order_relaxed);
// Uniqueness comes from atomicity, which relaxed still provides.
// Only the ORDERING is weakened, never the indivisibility.`
      }
    ],
    examples: [
      {
        title: "A spin loop that never terminates",
        input: "A worker looping on a plain bool flag, `while (!done) {}`, with another thread setting done to true.",
        output: "The loop runs forever at optimisation level two, even after the flag has been set.",
        explanation:
          "Step 1: The C++ memory model says a program with a data race has undefined behaviour, so the compiler is entitled to assume no other thread writes done.\nStep 2: Given that assumption, done cannot change inside the loop body, which does not touch it, so the compiler hoists the load out of the loop and tests a register once.\nStep 3: The generated code becomes a test of a cached value followed by an unconditional infinite branch, which is a legal transformation of a race-free program and a catastrophic one here.\nStep 4: Declaring the flag volatile forces the reload but is still wrong in principle, since volatile provides neither atomicity nor any ordering with respect to other data, and only works accidentally on x86 for this specific shape.\nStep 5: std::atomic<bool> is the correct fix, and the load may be relaxed if nothing else is being published alongside the flag, or must be acquire paired with a release store if the worker needs to see data written before the flag was set."
      },
      {
        title: "A lock-free stack corrupted by ABA",
        input: "A CAS-based pop that reads head into old, then compare-exchanges head from old to old->next, with concurrent pushes reusing freed nodes.",
        output: "head intermittently points at freed memory and the program crashes or silently loses elements.",
        explanation:
          "Step 1: Thread one reads head as node A and computes the intended new head as A's next pointer, node B, then is preempted before performing the exchange.\nStep 2: Thread two pops A, pops B, and pushes a new node that the allocator places at exactly A's old address, so head once again holds the value A but A's next now points to C and B has been freed.\nStep 3: Thread one resumes and its compare-exchange compares head against A, which matches, so the exchange succeeds and stores the stale B pointer into head.\nStep 4: The comparison was on the pointer value while the meaningful state was the list structure, and those diverged - this is the ABA problem, and it is specifically enabled by memory reuse, which is why allocators make it likely rather than rare.\nStep 5: The three standard remedies are a tagged pointer with a monotonically increasing counter packed alongside the pointer and compared with a double-width exchange, hazard pointers that let a reader publish which node it is currently examining so reclamation defers, and epoch-based reclamation or RCU which frees only after every reader that could hold a reference has passed a quiescent point."
      },
      {
        title: "Choosing the ordering for a reference count",
        input: "A control block whose strong count is incremented on copy and decremented on destruction, with the destructor running when it reaches zero.",
        output: "Relaxed on the increment, release on the decrement, and an acquire fence only on the zero path.",
        explanation:
          "Step 1: The increment can be relaxed because the thread performing it already holds a reference, so the object provably cannot be destroyed concurrently, and the increment does not order any other memory access.\nStep 2: The decrement cannot be relaxed, because the thread that drives the count to zero runs the destructor, which reads the object, and it must observe every write made by every other thread that previously held a reference.\nStep 3: Making the decrement a release publishes each thread's writes at the moment it drops its reference, so the writes are available to whichever thread eventually synchronises with them.\nStep 4: An acquire is needed to complete the pairing, but placing it on every decrement costs a barrier on every reference drop; putting a standalone acquire fence on the zero path instead means only the single final decrement pays, and that fence synchronises with all of the preceding releases.\nStep 5: On x86 the acq_rel and release-plus-fence versions compile to the same locked instruction so the distinction is invisible, but on AArch64 the fence version removes a barrier from the hot path, which is exactly why libstdc++ and Boost are written this way."
      }
    ],
    tips: [
      "Never use volatile for synchronisation; it provides no atomicity and no ordering in the C++ model, and any correct-looking use is an accident of the target architecture.",
      "Use compare_exchange_weak inside a loop and compare_exchange_strong only when there is no loop, because the strong form must add its own retry on load-linked/store-conditional hardware.",
      "Start with the default seq_cst ordering and weaken only where a profile shows the atomic on a hot path and you can name the release store and acquire load that pair."
    ],
    tricks: [
      "compare_exchange writes the observed value back into its expected argument on failure, so the canonical retry loop needs no explicit reload.",
      "Spin on a relaxed load before attempting test_and_set, since spinning on a read keeps the cache line in shared state instead of fighting for exclusive ownership on every attempt.",
      "In a lock-free push, passing the new node's own next member as the expected argument makes the retry loop update it automatically."
    ],
    memoryAids: [
      "An atomic gives indivisibility, forced re-reads, and ordering; volatile gives only the second.",
      "Relaxed is enough for counters that order nothing; the moment data rides alongside the flag you need release and acquire.",
      "ABA means the value matched but the state moved - a pointer comparison cannot see reuse."
    ],
    interviewPatterns: [
      "'Why can a shared_ptr reference count increment be relaxed but not the decrement?' is the single most common atomics question at systems companies.",
      "'Implement a lock-free stack' inevitably leads to ABA and memory reclamation, and the expected answer names hazard pointers or epochs.",
      "Frequency and companies: extremely common at HFT firms, Nvidia, and Bloomberg; usually paired with a question about false sharing."
    ],
    practiceProblems: [
      "Why is std::atomic<T> for a large struct not lock-free, and what are the consequences? Answer: no processor has a single instruction that atomically updates 24 or 40 bytes, so the implementation embeds a lock - often from a hashed table of locks indexed by address - which means the operation is correct but is a mutex in disguise; it cannot be used in a signal handler, it does not improve latency, it can deadlock if the hashed lock collides with one held elsewhere, and is_always_lock_free will be false, so checking that trait is how you find out at compile time.",
      "Explain why a failed compare_exchange may not use memory_order_release. Answer: a failed exchange performs no store, and release ordering is defined in terms of a store that publishes preceding writes, so there is nothing for it to attach to; the standard therefore requires the failure ordering to be a load ordering - relaxed, acquire, or seq_cst - and additionally forbids it from being stronger than the success ordering, which prevents the nonsensical case of a failure being more ordered than a success.",
      "You have a stop flag read in a tight loop by eight worker threads. Should it be relaxed? Answer: relaxed is correct if and only if the flag orders nothing else, meaning the workers do not need to observe any data written before the flag was set; if the setter also writes a result or a reason code that the workers read after seeing the flag, the store must be release and the load acquire, otherwise the workers may see the flag set while the accompanying data is still stale, and note that on x86 both compile to identical instructions so testing on x86 will never reveal the bug."
    ],
    faq: [
      {
        question: "What is the difference between volatile and std::atomic?",
        answer:
          "They solve entirely different problems and the overlap is coincidental. volatile tells the compiler that an object's value may change by means outside the program's control, so accesses to it must not be elided, duplicated, or cached in registers - it exists for memory-mapped hardware registers, for variables modified by signal handlers within a single thread, and for setjmp interaction. That is the whole of its meaning in the C++ abstract machine. It says nothing about atomicity, so a volatile 64-bit store on a 32-bit target can still tear and a reader can observe a value that was never written. It says nothing about ordering with respect to non-volatile accesses, so the compiler may freely move ordinary reads and writes across a volatile access. And it emits no processor fences whatsoever, so even if the compiler cooperates the hardware may reorder the store buffer and the loads as it likes. std::atomic provides all three: indivisibility, guaranteed re-reading, and a specified ordering relationship with surrounding operations, which is the only one of the three that lets you safely publish data between threads. The confusion persists because volatile appears to work on x86 for simple flags, since x86 provides total store ordering in hardware and compilers historically emitted conservative code around volatile - and because MSVC with the /volatile:ms setting deliberately gives volatile acquire and release semantics as a non-standard extension for compatibility with old code. Neither of these makes it correct or portable. The Linux kernel's use of volatile in READ_ONCE and WRITE_ONCE is a different case again: it is paired with explicit compiler barriers and architecture-specific fences that supply what volatile does not."
      },
      {
        question: "When is memory_order_relaxed actually safe to use?",
        answer:
          "When the atomic operation orders nothing other than itself - that is, when no other memory access depends on where this operation sits relative to it. Three patterns satisfy that reliably. The first is a pure statistic: a request counter or a histogram bucket that is incremented on a hot path and read only for reporting, where an approximate or slightly stale value is acceptable and no code branches on it in a way that must be consistent with other data. The second is a unique identifier generator, where fetch_add with relaxed ordering still guarantees that every caller gets a distinct value, because relaxed weakens the ordering but never the atomicity - a point people miss surprisingly often. The third is a reference count increment, where the incrementing thread already holds a reference so the object cannot be destroyed underneath it, and the increment publishes nothing. Note that the corresponding decrement is not safe to relax, because the thread that drives the count to zero must observe every other thread's prior writes before running the destructor. The unsafe pattern that looks safe is a flag: a relaxed store to a done flag with a relaxed load in the worker is fine if the flag genuinely carries no accompanying data, but as soon as the setter also writes a result or an error code that the worker reads after observing the flag, you need release on the store and acquire on the load, or the worker can see the flag set while the data is stale. The trap is that on x86 relaxed, acquire, and release loads all compile to a plain MOV, so this bug is invisible on the machine most people test on and appears only on ARM."
      },
      {
        question: "What is the ABA problem and how is it solved?",
        answer:
          "ABA is the failure mode where a compare-and-exchange succeeds because a value has returned to its original state, even though the state that value referred to has changed meaningfully in between. The canonical instance is a lock-free stack pop: a thread reads head as node A and prepares to swing head to A's next, node B, but is preempted; other threads pop A, pop B, and push a new node that the allocator happens to place at A's old address; the first thread resumes, its exchange finds head equal to A and succeeds, and head is set to B, which has been freed. Nothing detects this because a pointer comparison can only see the address, not the identity or generation of what lives there, and allocators make address reuse likely rather than exotic. There are three families of solution. A tagged or versioned pointer packs a monotonically increasing counter alongside the pointer and compares both with a double-width exchange - cmpxchg16b on x86-64, requiring sixteen-byte alignment - so A-with-tag-seven never compares equal to A-with-tag-nine; it is simple but consumes the wider exchange and only postpones failure until the counter wraps. Hazard pointers have each reader publish the node it is currently examining in a per-thread slot, and reclamation scans all slots and defers freeing anything named there, which bounds memory and is wait-free for readers at the cost of a store and a fence per access. Epoch-based reclamation and RCU instead track a global epoch that readers announce entering and leaving, freeing memory only once every reader that could hold a reference has passed a quiescent point, which is cheaper per access but can retain memory unboundedly if a reader stalls. C++26 standardises hazard pointers and an RCU domain. The general lesson is that ABA is really a symptom of the deeper problem, safe memory reclamation, which is what makes lock-free data structures genuinely hard rather than merely fiddly."
      },
      {
        question: "Why does the memory ordering I choose seem to make no difference on x86?",
        answer:
          "Because x86-64 implements a strong hardware memory model called total store ordering, in which the only reordering the processor performs is allowing a load to be satisfied before an earlier store to a different address has drained from the store buffer. Everything else - load-load, load-store, and store-store reordering - is already forbidden by the hardware. The consequence is that atomic loads with relaxed, acquire, and sequentially consistent ordering all compile to the same plain MOV instruction, and relaxed and release stores likewise compile to a plain MOV. The single place the ordering costs anything is a sequentially consistent store, which must prevent the store-buffer reordering and therefore compiles to an XCHG or a MOV followed by MFENCE, costing roughly twenty to forty cycles. So on x86 the entire observable difference between the orderings is the seq_cst store, and code with missing or wrong acquire and release annotations runs correctly. It does not run correctly on AArch64, POWER, or RISC-V, which allow far more reordering and where acquire and release map to genuinely different instructions - LDAR and STLR on ARM against plain LDR and STR for relaxed. This is why a codebase developed and tested only on x86 routinely breaks the first time it is built for ARM servers or Apple silicon, and why running the test suite on an ARM machine is one of the highest-value concurrency checks available. It is also worth remembering that the orderings constrain the compiler as well as the hardware, and compiler reordering is architecture-independent: a relaxed store gives the compiler permission to move surrounding code that a release store does not, so even on x86 the annotations are not purely decorative."
      },
      {
        question: "Is a lock-free algorithm always faster than one using a mutex?",
        answer:
          "No, and assuming so is the most common reason lock-free code is written where it should not be. Lock-freedom is a progress guarantee, not a performance claim: it says that at least one thread makes progress in a bounded number of steps regardless of what other threads do, which matters enormously for real-time deadlines, for code that may run in a signal handler, and for systems where a thread holding a lock might be preempted or killed. It says nothing about throughput. Under contention, a compare-and-exchange retry loop can perform far worse than a mutex, because every failed attempt still transfers the cache line into exclusive state on the retrying core and then loses it again, burning coherence bandwidth and doing no work - whereas a mutex parks the loser, which stops it consuming the line at all and lets the winner proceed at full speed. Modern mutexes also spin adaptively before parking, so they capture most of the benefit of a spinlock in the uncontended and lightly contended cases while degrading gracefully. Lock-free structures additionally carry costs a mutex does not: the memory reclamation scheme needed to avoid ABA and use-after-free adds per-access overhead and often retains memory, the algorithms are dramatically harder to get right and to review, and they frequently require stronger fences on weakly-ordered hardware than the equivalent locked code. The honest guidance is to reach for lock-free when the progress guarantee is the requirement - hard real-time, signal safety, a shared-memory region where a peer process may crash - or when profiling has demonstrated that a specific, small, extremely hot structure is the bottleneck and a sharded or thread-local design cannot avoid the sharing. For everything else a mutex with a short critical section, or better, an arrangement in which the data is not shared at all, wins on both performance and maintainability."
      },
      {
        question: "What does std::atomic_ref add, and when would I use it?",
        answer:
          "std::atomic_ref, added in C++20, applies atomic operations to an object that was not declared atomic, which decouples the storage from the access mode. The motivating case is a large array or an existing data structure that is accessed non-atomically during one phase of a computation and concurrently during another: declaring the whole array as std::atomic would force every access, including the single-threaded ones, through atomic operations and would prevent vectorisation entirely, whereas atomic_ref lets the parallel phase construct a reference around the specific element it touches while the sequential phases use ordinary loads and stores at full speed. It is also the only way to get atomic access to memory you do not control the declaration of - an element inside a third-party structure, a field in a memory-mapped shared region, or a member of a type that must remain trivially copyable for serialisation. The rules are strict and easy to violate. The referenced object must satisfy atomic_ref's required_alignment, which may be stricter than the type's natural alignment, so an int in a packed structure may not qualify. For as long as any atomic_ref to an object exists, every access to that object must go through an atomic_ref, so mixing a plain read with a concurrent atomic write through a reference is still a data race. The referenced object must outlive the atomic_ref, which is unchecked. And atomic_ref is itself copyable and cheap - it holds only a pointer - so it is intended to be created at the point of use rather than stored. The lock-freedom question also shifts: atomic_ref<T>::is_always_lock_free depends on T just as atomic does, and for large T it will use a hashed lock table indexed by the object's address, which means two references to different objects can contend if their addresses hash together."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Anthony Williams - C++ Concurrency in Action, chapter 5, The C++ Memory Model and Operations on Atomic Types",
        insight: "The clearest book-length treatment of the ordering parameters and the happens-before relation."
      },
      {
        source: "video",
        attribution: "Herb Sutter - atomic Weapons: The C++ Memory Model and Modern Hardware",
        insight: "Explains why seq_cst is the default and what each ordering costs on x86 versus weakly ordered hardware."
      },
      {
        source: "note",
        attribution: "cppreference - std::atomic, std::memory_order, std::atomic_ref",
        insight: "Normative wording for the failure-ordering restrictions on compare_exchange and for is_always_lock_free."
      }
    ]
  },
  {
    id: "topic-cpp-concurrency-memory-orderings",
    moduleId: "mod-cpp-concurrency",
    title: "Memory Orderings, Happens-Before, and Fences",
    intuition:
      "The memory orderings look like a menu of performance options, but they are really a menu of guarantees, and the only one that matters is happens-before: the partial order that determines whether a thread is allowed to see a write. A release store and an acquire load on the same atomic object build one edge in that order, and everything a thread did before the release becomes visible to a thread that observes it through the acquire. Once you think in terms of edges rather than barriers, the whole scheme becomes mechanical - you look for the pair, and if you cannot name both halves, the code is wrong.",
    complexity: {
      time:
        "Cost is entirely architecture-dependent. On x86-64, relaxed, acquire and seq_cst loads are all a plain MOV at one to four cycles, and relaxed and release stores are also a plain MOV; only a seq_cst store costs an XCHG or MFENCE at roughly 20 to 40 cycles. On AArch64, relaxed maps to LDR and STR with no barrier, acquire and release to LDAR and STLR at a few extra cycles, and seq_cst adds a DMB on older cores. A standalone seq_cst fence is the most expensive form on every architecture because it orders everything rather than a single object.",
      space:
        "Orderings consume no storage - they are properties of an operation, not of the object. The indirect space cost is that publishing data through release and acquire usually requires the published data to be immutable or separately allocated, since the pattern only works if nothing mutates the payload after the release store. A standalone fence generates instructions but no data. The genuine space concern remains cache line placement: the strongest ordering on a line shared by two hot atomics is still slower than the weakest ordering on two aligned, separate lines."
    },
    lesson: [
      {
        title: "The Six Orderings and What Each One Buys",
        content:
          "There are six enumerators but effectively four usable levels. relaxed guarantees atomicity and nothing else, so it participates in no happens-before edge and may be reordered freely with surrounding accesses. acquire applies to loads and prevents any subsequent operation from being moved before it. release applies to stores and prevents any preceding operation from being moved after it. acq_rel applies to read-modify-write operations and is both at once. seq_cst adds, on top of acquire and release, membership in a single global total order that all threads agree on. consume was intended as a cheaper acquire for pointer-chasing dependencies, but the specification proved impossible to implement without whole-program dependency tracking, so every compiler promotes it to acquire and the committee has discouraged its use since C++17.",
        codeExample: `enum class memory_order {
    relaxed,   // atomicity only; no ordering with anything else
    consume,   // DEPRECATED in practice; every compiler = acquire
    acquire,   // load: nothing after may be reordered before it
    release,   // store: nothing before may be reordered after it
    acq_rel,   // RMW: both of the above
    seq_cst    // acq_rel + a single global total order (the default)
};

// RELAXED: atomic, but orders nothing
std::atomic<int> n{0};
n.fetch_add(1, std::memory_order_relaxed);
// Correct for statistics and ID generation. NOT for publishing data.

// RELEASE / ACQUIRE: the publication pair
std::atomic<Payload*> ready{nullptr};
// producer
Payload* p = new Payload;
p->a = 1; p->b = 2;                               // plain writes
ready.store(p, std::memory_order_release);        // ── release ──┐
// consumer                                                      │
Payload* q = ready.load(std::memory_order_acquire);  // ◄─ acquire┘
if (q) { use(q->a); use(q->b); }   // guaranteed to see 1 and 2
// The edge exists ONLY because the consumer READ THE VALUE the
// producer WROTE. Release with nobody acquiring orders nothing.

// The release side is a ONE-WAY barrier
//   prior ops  ──┐
//                │ may NOT sink below
//   release store┤
//                │ later ops MAY be hoisted above
//   later ops  ──┘
// The acquire side is the mirror image.

// ACQ_REL for read-modify-write
head.compare_exchange_weak(expected, desired,
    std::memory_order_acq_rel,     // success: both sides
    std::memory_order_acquire);    // failure: load ordering only

// SEQ_CST: adds the single global order
// Needed only when two DIFFERENT atomics must be seen in a consistent
// order by all threads - the store-buffering shape:
std::atomic<bool> x{false}, y{false};
// T1: x.store(true, seq_cst); if (!y.load(seq_cst)) critical();
// T2: y.store(true, seq_cst); if (!x.load(seq_cst)) critical();
// Under seq_cst at most one enters critical(). Under acq_rel BOTH can,
// because each core's store sits in its store buffer while its load
// completes. This is Dekker's algorithm and it is THE reason seq_cst
// exists.

// CONSUME: do not use
std::atomic<Node*> head;
Node* h = head.load(std::memory_order_consume);
int v = h->value;      // "dependency-ordered before" - in theory only
// The idea: on ARM and POWER a data dependency already orders the
// dependent load in hardware, so no barrier is needed. The problem:
// the compiler must preserve the dependency chain through arbitrary
// code, and optimisations routinely destroy it (e.g. turning
// h->value into a constant when h is known). No implementation ever
// did this correctly, so all of them emit acquire instead. P0371
// formally discourages it; a replacement is still being designed.

// TRANSITIVITY: happens-before is transitive, so edges chain
// T1: data = 1;      flagA.store(true, release);
// T2: while(!flagA.load(acquire)); flagB.store(true, release);
// T3: while(!flagB.load(acquire)); assert(data == 1);   // HOLDS
// T3 never touched flagA, yet it is guaranteed to see data == 1.

// RELEASE SEQUENCES extend the edge through RMWs
// A release store, followed by any number of read-modify-write
// operations on the same object by any threads, forms a release
// sequence; an acquire load that reads ANY value in that sequence
// synchronises with the ORIGINAL release store.
// This is why fetch_sub on a reference count works: each decrement
// links into the chain.`,
        diagram: asciiDiagram(`Release and acquire as ONE-WAY barriers

  RELEASE STORE
  ┌──────────────────────────────────────────────────────┐
  │   a = 1;                                             │
  │   b = 2;              may NOT move down  ▼           │
  │   ══════════════════════════════════════════════     │
  │   flag.store(true, release)                          │
  │   ══════════════════════════════════════════════     │
  │   c = 3;              MAY move up        ▲           │
  └──────────────────────────────────────────────────────┘
      "everything I did before this is now published"

  ACQUIRE LOAD
  ┌──────────────────────────────────────────────────────┐
  │   x = 9;              MAY move down      ▼           │
  │   ══════════════════════════════════════════════     │
  │   flag.load(acquire)                                 │
  │   ══════════════════════════════════════════════     │
  │   read a;             may NOT move up    ▲           │
  │   read b;                                            │
  └──────────────────────────────────────────────────────┘
      "everything after this sees what was published"

  THE EDGE ── it exists only when the value is actually read
  ┌───────────────────────────────────────────────────────────┐
  │  producer                        consumer                 │
  │  ────────                        ────────                 │
  │  a = 1;         ┐                                         │
  │  b = 2;         │ sequenced-before                        │
  │  flag.store(    │                                         │
  │    true,        ▼                                         │
  │    release) ────────── synchronises-with ────►            │
  │                                  flag.load(acquire)       │
  │                                     returns TRUE          │
  │                                        │ sequenced-before │
  │                                        ▼                  │
  │                                  read a  ⇒ 1              │
  │                                  read b  ⇒ 2              │
  │                                                           │
  │  happens-before = sequenced-before ∪ synchronises-with,   │
  │  transitively closed                                      │
  └───────────────────────────────────────────────────────────┘

  IF THE LOAD RETURNS FALSE there is NO edge, and reading a or b
  is a data race — which is why the read must be guarded by the
  load's result, not merely placed after it.

  STORE BUFFERING ── the shape that needs seq_cst
  ┌───────────────────────────────────────────────────────────┐
  │  core 0                          core 1                   │
  │  x.store(1, release)             y.store(1, release)      │
  │      │ sits in store buffer          │ sits in buffer     │
  │      ▼                               ▼                    │
  │  r1 = y.load(acquire)  ⇒ 0       r2 = x.load(acquire) ⇒ 0 │
  │                                                           │
  │  BOTH read 0 — legal under acquire/release, observable    │
  │  on real x86.  seq_cst forbids it by forcing a single     │
  │  total order over the two stores.                         │
  └───────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Happens-Before, Synchronises-With, and the Data Race Definition",
        content:
          "The standard builds its guarantees from a small set of relations. Sequenced-before orders operations within a single thread. Synchronises-with is created by a release operation and an acquire operation on the same atomic object where the acquire reads the value written by the release, and also by thread creation, by join, by mutex unlock paired with a subsequent lock, and by a few other specified points. Happens-before is the transitive closure of those two, and it is what actually matters: if a write happens-before a read, the read sees that write or something later; if neither of two conflicting accesses happens-before the other and at least one is a write, the program has a data race and undefined behaviour. Note the consequences of transitivity - synchronisation edges chain through intermediate threads, so a third thread can be guaranteed to see a write it never synchronised with directly.",
        codeExample: `// The relations, concretely

// 1. SEQUENCED-BEFORE: within one thread, mostly program order
int a = 1;      // sequenced-before
int b = a + 1;  // this
f(g(), h());    // g and h are INDETERMINATELY sequenced in C++17
                // (unsequenced before C++17) - not a threading issue
                // but the same vocabulary

// 2. SYNCHRONISES-WITH: the standard's list of edge creators
//   - release store  <-> acquire load that READS THAT VALUE
//   - mutex unlock   <-> subsequent lock of the same mutex
//   - thread constructor <-> the start of the new thread's function
//   - the end of a thread's function <-> a successful join()
//   - promise::set_value <-> future::get()
//   - atomic::notify <-> the return of the corresponding wait
//   - the completion of a latch reaching zero <-> wait() returning

// 3. HAPPENS-BEFORE = transitive closure. It CHAINS:
int data = 0;
std::atomic<bool> a1{false}, a2{false};
// T1: data = 42;              a1.store(true, release);
// T2: while (!a1.load(acquire)) {}   a2.store(true, release);
// T3: while (!a2.load(acquire)) {}   assert(data == 42);  // HOLDS
// T3 never touched a1. The edge T1->T2 chains with T2->T3.

// Mutexes create the same edges - this is WHY they work
std::mutex m; int shared = 0;
// T1: { lock_guard lk(m); shared = 1; }     // unlock = release
// T2: { lock_guard lk(m); read(shared); }   // lock   = acquire
// The unlock synchronises-with the later lock, so T2 sees shared == 1.
// A mutex is not magic; it is a release/acquire pair with mutual
// exclusion attached.

// Thread creation and join are edges too
int result = 0;
std::thread t([&] { result = compute(); });   // body happens-after
                                              // everything before the
                                              // constructor
t.join();                                     // everything in the body
read(result);                                 // happens-before this
// This is why no extra synchronisation is needed around join.

// THE DATA RACE DEFINITION
// Two accesses CONFLICT if they touch the same memory location and
// at least one is a write. The program has a DATA RACE if two
// conflicting accesses from different threads are not ordered by
// happens-before and are not both atomic.
// A data race is UNDEFINED BEHAVIOUR for the whole program, not
// merely a stale read.

// The subtle consequence: the guard must be on the VALUE
std::atomic<bool> ready{false};
int payload = 0;
// producer: payload = 7; ready.store(true, release);
// consumer:
ready.load(std::memory_order_acquire);
int v = payload;                 // RACE: the load's result is ignored,
                                 // so no edge is established
if (ready.load(std::memory_order_acquire)) {
    int v2 = payload;            // OK: the read is guarded by having
}                                // OBSERVED the released value

// MODIFICATION ORDER: even relaxed operations have one
// Every atomic object has a single total modification order that all
// threads agree on. Relaxed operations respect it, so a thread can
// never see a value "go backwards" on one object:
std::atomic<int> c{0};
// T1: c.store(1, relaxed); c.store(2, relaxed);
// T2: r1 = c.load(relaxed); r2 = c.load(relaxed);
// r1 == 2 && r2 == 1 is IMPOSSIBLE, even fully relaxed.
// Coherence is per-object and always guaranteed; what relaxed loses
// is any ordering ACROSS different objects.

// OUT-OF-THIN-AIR values are forbidden by fiat rather than by the
// formal model - the standard says they must not occur, while
// admitting the wording does not fully exclude them. No real
// implementation produces them.`
      },
      {
        title: "Fences and When an Operation Ordering Is Not Enough",
        content:
          "std::atomic_thread_fence orders operations around it without being attached to any particular object, which makes it strictly stronger and usually less precise than putting the ordering on the operation itself. A release fence followed by any relaxed store behaves like a release store, and an acquire fence preceded by any relaxed load behaves like an acquire load, so fences let you amortise one barrier over several operations. That is the legitimate use: a loop of relaxed stores followed by a single release fence and a relaxed flag store, rather than paying for release on each. The other legitimate use is the reference-count teardown, where the acquire is needed only on the rare path that reaches zero. A signal fence is a different thing entirely - it constrains only the compiler, not the hardware, and exists for signal handlers on the same thread.",
        codeExample: `// Fence version of the publication pattern
int a, b, c;
std::atomic<bool> flag{false};
// producer
a = 1; b = 2; c = 3;                               // plain writes
std::atomic_thread_fence(std::memory_order_release);
flag.store(true, std::memory_order_relaxed);       // relaxed is enough
// consumer
if (flag.load(std::memory_order_relaxed)) {
    std::atomic_thread_fence(std::memory_order_acquire);
    use(a); use(b); use(c);                        // all visible
}
// A release FENCE orders every prior write against every subsequent
// atomic store, not just one object - which is why the flag store can
// be relaxed.

// When a fence is genuinely better: amortising over many operations
for (int i = 0; i < n; ++i)
    buckets[i].store(values[i], std::memory_order_relaxed);  // cheap
std::atomic_thread_fence(std::memory_order_release);         // once
published.store(true, std::memory_order_relaxed);
// versus paying release on all n stores.

// The reference-count teardown (from libstdc++)
if (count.fetch_sub(1, std::memory_order_release) == 1) {
    std::atomic_thread_fence(std::memory_order_acquire);
    delete ptr;
}
// acquire is paid ONCE per object rather than on every decrement.

// Fences are STRONGER than the equivalent operation ordering
// An acquire fence orders the preceding load against ALL subsequent
// operations; an acquire load orders only itself. That extra strength
// costs instructions and gives the compiler less to work with, so
// prefer ordering on the operation unless you have the amortisation
// or rare-path reason above.

// SEQ_CST fence: the heaviest form
std::atomic_thread_fence(std::memory_order_seq_cst);
// Compiles to MFENCE on x86 (~30-100 cycles) and DMB ISH on ARM.
// Needed for Dekker-style algorithms built on relaxed operations:
// x.store(1, relaxed); fence(seq_cst); r = y.load(relaxed);
// It participates in the single total order of seq_cst operations.

// SIGNAL FENCE: compiler-only, no hardware barrier at all
std::atomic_signal_fence(std::memory_order_acquire);
// Orders the compiler's code motion between a thread and a signal
// handler running ON THAT SAME THREAD. Emits ZERO instructions.
// Useless between threads; essential in async-signal-safe code.

// Double-checked locking, done correctly
std::atomic<Widget*> instance{nullptr};
std::mutex init_m;
Widget* get() {
    Widget* p = instance.load(std::memory_order_acquire);   // fast path
    if (!p) {
        std::lock_guard lk(init_m);
        p = instance.load(std::memory_order_relaxed);       // re-check
        if (!p) {
            p = new Widget;                    // fully constructed...
            instance.store(p, std::memory_order_release);   // ...then
        }                                                   // published
    }
    return p;
}
// The famous broken version used a PLAIN pointer: the compiler could
// publish the pointer before running the constructor, so another
// thread's fast path returned a pointer to raw memory. The release
// store forbids exactly that reordering.
// In practice, just write:  static Widget w; return &w;  which the
// compiler implements with the same machinery and no chance of error.

// Ordering compiles to nothing you can see on x86
// asm for load(acquire):  mov eax, [rdi]
// asm for load(seq_cst):  mov eax, [rdi]
// asm for store(release): mov [rdi], eax
// asm for store(seq_cst): xchg [rdi], eax     <- the only difference
// Verify with godbolt before optimising an ordering.`,
        diagram: asciiDiagram(`Fences versus operation orderings

  OPERATION ORDERING ── attached to one object
  ┌────────────────────────────────────────────────────────┐
  │   a = 1;                                               │
  │   b = 2;                                               │
  │   flag.store(true, RELEASE)  ← ordering lives here     │
  │                                                        │
  │   the barrier is tied to THIS store on THIS object     │
  │   ⇒ the compiler can place it precisely                │
  └────────────────────────────────────────────────────────┘

  FENCE ── a wall across all memory operations
  ┌────────────────────────────────────────────────────────┐
  │   a = 1;                                               │
  │   b = 2;                                               │
  │   ══════ atomic_thread_fence(RELEASE) ══════           │
  │   flag.store(true, RELAXED)   ← relaxed is enough now  │
  │   other.store(x, RELAXED)     ← this too               │
  │                                                        │
  │   the wall orders EVERYTHING before it against         │
  │   EVERY subsequent atomic store, on any object         │
  │   ⇒ stronger, but the compiler has less freedom        │
  └────────────────────────────────────────────────────────┘

  WHERE THE FENCE WINS ── amortisation
  ┌────────────────────────────────────────────────────────┐
  │  per-operation:                                        │
  │    for i in 0..n:  bucket[i].store(v, RELEASE)         │
  │                        n barriers                      │
  │                                                        │
  │  fence:                                                │
  │    for i in 0..n:  bucket[i].store(v, RELAXED)         │
  │    fence(RELEASE)                                      │
  │    published.store(true, RELAXED)                      │
  │                        1 barrier                       │
  └────────────────────────────────────────────────────────┘

  WHERE THE FENCE WINS ── rare-path acquire
  ┌────────────────────────────────────────────────────────┐
  │  if (count.fetch_sub(1, RELEASE) == 1) {               │
  │        ▲ every decrement pays release (free on x86,    │
  │        │ STLR on ARM)                                  │
  │      fence(ACQUIRE);   ← paid ONCE per object,         │
  │      delete ptr;         on the final decrement only   │
  │  }                                                     │
  │                                                        │
  │  versus fetch_sub(1, ACQ_REL) which pays acquire on    │
  │  EVERY decrement                                       │
  └────────────────────────────────────────────────────────┘

  atomic_signal_fence ── compiler only, ZERO instructions
  ┌────────────────────────────────────────────────────────┐
  │  orders code motion between a thread and a SIGNAL      │
  │  HANDLER on that same thread.  No hardware barrier is  │
  │  needed because there is only one core involved.       │
  │  Useless between threads.                              │
  └────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Practical Guidance and Common Mistakes",
        content:
          "The reliable working method is to start with everything sequentially consistent, get it correct, and then weaken only where a profile shows an atomic on a genuinely hot path - and at each weakening, write down the release store and the acquire load that pair with each other. If you cannot name both halves of a pair, the ordering is wrong regardless of whether the tests pass. Four mistakes recur: relaxing a flag that carries data alongside it; assuming an acquire load orders anything when its result is discarded rather than used to guard the dependent reads; expecting acquire and release to prevent store buffering, which only seq_cst does; and testing exclusively on x86, whose total store ordering makes almost every ordering error invisible. Building and running the test suite on ARM is the cheapest way to catch the last one.",
        codeExample: `// MISTAKE 1: a relaxed flag that carries data
int result;
std::atomic<bool> done{false};
// producer: result = compute(); done.store(true, relaxed);   // WRONG
// consumer: while (!done.load(relaxed)); use(result);        // RACE
// Nothing orders the write to 'result' against the flag. On ARM the
// consumer can observe done == true and a stale 'result'.
// FIX: release on the store, acquire on the load.

// MISTAKE 2: discarding the acquire load's result
std::atomic<Data*> ptr;
ptr.load(std::memory_order_acquire);     // result thrown away
use(*raw_ptr);                           // no edge was created
// The edge exists between a release store and an acquire load THAT
// READS THAT VALUE, and the dependent reads must be guarded by it:
if (Data* p = ptr.load(std::memory_order_acquire)) use(*p);   // OK

// MISTAKE 3: expecting release/acquire to stop store buffering
std::atomic<bool> x{false}, y{false};
// T1: x.store(true, release); if (!y.load(acquire)) enter();
// T2: y.store(true, release); if (!x.load(acquire)) enter();
// BOTH may enter(). Each store sits in its core's store buffer while
// the load reads from cache. Only seq_cst forbids this, because only
// seq_cst imposes a single total order over the two stores.
// This is the ONE case where seq_cst is not merely stylistic.

// MISTAKE 4: testing only on x86
// load(relaxed), load(acquire), load(seq_cst)  -> all MOV
// store(relaxed), store(release)               -> both MOV
// A missing acquire is INVISIBLE on x86 and breaks on AArch64.
// Run the test suite on ARM, or under a model checker.

// A defensible weakening, with the pairing written down
class SpscQueue {           // single producer, single consumer
    std::vector<T> buf_;
    std::atomic<std::size_t> head_{0}, tail_{0};
public:
    bool push(T v) {
        auto t = tail_.load(std::memory_order_relaxed);   // OUR index:
                                                          // only we
                                                          // write it
        auto next = (t + 1) % buf_.size();
        if (next == head_.load(std::memory_order_acquire))  // PAIRS
            return false;                       // with pop's release
        buf_[t] = std::move(v);                 // plain write
        tail_.store(next, std::memory_order_release);  // PAIRS with
        return true;                                   // pop's acquire
    }
    bool pop(T& out) {
        auto h = head_.load(std::memory_order_relaxed);   // ours
        if (h == tail_.load(std::memory_order_acquire))   // PAIRS with
            return false;                                 // push's rel
        out = std::move(buf_[h]);
        head_.store((h + 1) % buf_.size(),
                    std::memory_order_release);   // PAIRS with push's
        return true;                              // acquire
    }
};
// Every ordering here has a named partner. That is the standard to
// hold yourself to.
// Note: relaxed is correct for reading YOUR OWN index because no
// other thread writes it, so program order suffices.

// Verification tools
//   godbolt          - see what each ordering actually emits
//   TSan             - reports missing happens-before edges as races
//   CDSChecker/GenMC - exhaustively explore all interleavings and
//                      orderings for a small test; the only method
//                      that PROVES a lock-free algorithm correct
//   run on AArch64   - the cheapest real-world check available

// The honest default
// For 95% of code: use a mutex. For most of the rest: use seq_cst
// atomics. Weaken only with a profile and a written pairing argument.`
      }
    ],
    examples: [
      {
        title: "Publication that works on x86 and fails on ARM",
        input: "A producer writing a result then setting a relaxed atomic flag, and a consumer spinning on the relaxed flag then reading the result.",
        output: "The code passes every test on x86-64 and intermittently reads a stale result on AArch64.",
        explanation:
          "Step 1: A relaxed store and a relaxed load create no synchronises-with edge, so there is no happens-before relation between the producer's write to the result and the consumer's read of it, which by definition makes the program contain a data race.\nStep 2: On x86-64 the hardware provides total store ordering, so the store to the result cannot become visible after the store to the flag, and a relaxed load compiles to the same plain MOV as an acquire load, which means the code happens to behave correctly.\nStep 3: On AArch64 a relaxed store compiles to a plain STR with no barrier, and the processor is free to make the flag store visible to another core before the result store, so the consumer can observe the flag while the result is still stale in its cache.\nStep 4: The fix is to make the producer's store a release and the consumer's load an acquire, which creates the edge and on ARM compiles to STLR and LDAR respectively at a cost of a few cycles.\nStep 5: The general lesson is that x86's strong model hides essentially every ordering bug, so a codebase that has only ever been tested there should be assumed to contain them, and running the test suite once on an ARM machine is the highest-value single check available."
      },
      {
        title: "Dekker's algorithm broken by acquire/release",
        input: "Two threads that each store true to their own flag with release ordering and then load the other's flag with acquire ordering before entering a critical section.",
        output: "Both threads enter the critical section simultaneously on real x86 hardware.",
        explanation:
          "Step 1: Each core buffers its own store in a store buffer that is not yet visible to the other core, while its subsequent load is satisfied directly from cache.\nStep 2: Release ordering forbids earlier operations from moving after the store and acquire forbids later ones from moving before the load, but neither forbids a load from being reordered ahead of a preceding store to a different address, which is precisely the store-buffering relaxation that x86 permits.\nStep 3: Both threads therefore load false, both conclude the other has not entered, and both proceed, violating mutual exclusion despite every operation being atomic and annotated.\nStep 4: Sequential consistency forbids this because it requires a single total order over all seq_cst operations that every thread agrees on, and in any such order one of the two stores precedes the other's load, so at most one thread can read false.\nStep 5: This is the one case where seq_cst provides something acquire and release genuinely cannot, and it explains both why seq_cst is the default and why the additional cost on x86 falls entirely on the store side, which must become an XCHG or be followed by an MFENCE to drain the store buffer."
      },
      {
        title: "Reference counting with a fence on the rare path",
        input: "A control block that decrements with release ordering and, on reaching zero, executes a standalone acquire fence before destroying the object.",
        output: "The hot path emits no acquire barrier on ARM while correctness is preserved.",
        explanation:
          "Step 1: Every thread dropping a reference performs a release decrement, which publishes all of the writes it made to the object before releasing it.\nStep 2: Only the thread whose decrement returns one is going to run the destructor, and only that thread needs to acquire, because only it reads the object afterwards.\nStep 3: Placing a standalone acquire fence on that path synchronises with all of the preceding release decrements through the release sequence formed by the chain of read-modify-write operations on the count, giving the destructor visibility of every prior thread's writes.\nStep 4: The alternative of using acq_rel on the decrement itself is equally correct but pays for acquire on every single reference drop, which on AArch64 means an extra barrier per shared_ptr destruction rather than one per object destruction.\nStep 5: On x86 both forms compile to the same LOCK XADD so the optimisation is invisible, which is why the pattern looks like pointless sophistication until you read the ARM output - and it is exactly what libstdc++ and Boost implement."
      }
    ],
    tips: [
      "Never weaken an ordering without being able to name both halves of the pair - the specific release store and the specific acquire load that synchronise with each other.",
      "Guard the dependent reads with the acquire load's result; an acquire load whose value is discarded establishes no edge at all.",
      "Run the test suite on an ARM machine, because x86's total store ordering makes almost every missing acquire or release invisible."
    ],
    tricks: [
      "A release fence lets a batch of relaxed stores be published by a single barrier plus one relaxed flag store, which amortises the cost over the batch.",
      "Reading your own index in a single-producer single-consumer queue can be fully relaxed, since no other thread writes it and program order already suffices.",
      "Each atomic object has a single modification order that even relaxed operations respect, so a thread can never observe one object's values going backwards - what relaxed loses is ordering across different objects."
    ],
    memoryAids: [
      "Release publishes everything before it; acquire receives everything published - and the edge only exists if the acquire actually reads the released value.",
      "Acquire and release are one-way barriers; only seq_cst gives a single order everyone agrees on.",
      "consume is dead: every compiler promotes it to acquire."
    ],
    interviewPatterns: [
      "'Explain the difference between acquire/release and sequential consistency' expects the store-buffering example, not a definition.",
      "'Why is this lock-free queue's ordering correct?' asks you to name each pairing, which is the real test of understanding.",
      "Frequency and companies: standard at HFT firms, Nvidia, and kernel or database teams; rarely asked at product companies."
    ],
    practiceProblems: [
      "Why is memory_order_consume effectively unusable? Answer: it was meant to exploit the fact that ARM and POWER already order a load against a subsequent load that depends on its value, avoiding a barrier for pointer chasing; but the compiler must then preserve the dependency chain through arbitrary optimisation, and transformations such as constant propagation, common subexpression elimination, or turning a dependent index into a known value routinely destroy it, so no implementation ever tracked dependencies correctly and all of them emit acquire instead - P0371 formally discourages its use while a replacement is designed.",
      "In a single-producer single-consumer ring buffer, why can each thread read its own index with relaxed ordering? Answer: because only that thread ever writes that index, so program order alone guarantees it observes its own most recent value, and there is no cross-thread edge to establish; the cross-thread edges are the producer's release store of tail paired with the consumer's acquire load of tail, and the consumer's release store of head paired with the producer's acquire load of head, which is what makes the buffer's contents visible in each direction.",
      "What is a release sequence and why does reference counting depend on it? Answer: a release store followed by any number of read-modify-write operations on the same object, by any threads, forms a chain such that an acquire load reading any value in that chain synchronises with the original release store; reference counting relies on it because each thread's release decrement links into the chain, so the final decrement's acquire synchronises not merely with the immediately preceding decrement but with every prior one, giving the destructor visibility of all the writes made by every thread that ever held a reference."
    ],
    faq: [
      {
        question: "What exactly does happens-before mean, and why is it the only thing that matters?",
        answer:
          "Happens-before is the partial order the standard uses to define what a thread is permitted to observe, and every other concept in the memory model exists to build it. It is the transitive closure of two relations. Sequenced-before orders operations within a single thread, roughly program order with some latitude for unsequenced subexpressions. Synchronises-with is created between operations in different threads at specific points the standard enumerates: a release operation and an acquire operation on the same atomic object where the acquire reads the value the release wrote, a mutex unlock and a subsequent lock of that mutex, the thread constructor and the start of the new thread's function, the end of a thread's function and a successful join, set_value on a promise and get on its future, and a handful of others including latch and barrier arrivals. If a write happens-before a read, the read is guaranteed to see that write or a later one in that object's modification order. If two conflicting accesses - same location, at least one a write - are not ordered by happens-before and are not both atomic, the program contains a data race and has undefined behaviour for its entire execution, not merely at that access. The reason to reason in these terms rather than in terms of barriers or cache flushes is that the barrier intuition is architecture-specific and repeatedly misleads: it suggests a release store somehow pushes data to other cores, when in fact it establishes nothing at all unless some thread performs an acquire load that reads the value written. Two important consequences follow from transitivity. First, edges chain, so a third thread that synchronises with a second, which synchronised with the first, is guaranteed to see the first thread's writes without ever touching the object the first thread used. Second, the edge is created by the value read, not by the mere presence of an acquire load, which is why an acquire load whose result is discarded gives you nothing."
      },
      {
        question: "If x86 makes acquire and release free, why not use seq_cst everywhere?",
        answer:
          "Largely you should, and defaulting to seq_cst is defensible advice. There are three reasons not to make it an absolute rule. The first is that on x86 seq_cst is not entirely free: a sequentially consistent store must prevent the store-buffer reordering the hardware otherwise permits, so it compiles to an XCHG or a MOV followed by MFENCE, costing roughly twenty to forty cycles against effectively zero for a release store. In an atomic that is written on a hot path millions of times per second - a ring buffer index, a reference count - that is measurable. The second is that x86 is no longer the only target that matters. On AArch64 the ordering choices map to genuinely different instructions: relaxed to LDR and STR with no barrier, acquire and release to LDAR and STLR, and seq_cst historically to those plus a DMB, so the gap between relaxed and seq_cst is real on Apple silicon, Graviton, and every mobile device. The third and most important is that the orderings constrain the compiler as well as the hardware, and compiler reordering is architecture-independent: a seq_cst operation is an optimisation barrier that prevents surrounding code motion regardless of target, so heavy use in a hot loop can inhibit vectorisation and register allocation even where the emitted barrier instruction is free. Against that, the case for seq_cst is strong: it is the only model under which naive sequential reasoning about interleavings is sound, it makes the store-buffering paradoxes impossible, and the overwhelming majority of atomic operations in real code are not on a path where thirty cycles matters. The practical rule is to write seq_cst first, profile, and weaken only the specific operations that show up - documenting the pairing each time."
      },
      {
        question: "Why does an acquire load need to actually read the released value?",
        answer:
          "Because synchronises-with is defined in terms of the value, not the instruction. The standard says a release operation A on an atomic object M synchronises with an acquire operation B on M when B reads a value written by A, or by any operation in the release sequence headed by A. If B reads some earlier value - the initial value, say, because the producer has not stored yet - then no edge exists, and any dependent read the consumer performs is unordered with respect to the producer's writes and is therefore a data race. This is why the correct shape always guards the dependent access on the loaded value: you write if the loaded pointer is non-null then dereference it, or you spin until the loaded flag is true and only then read the payload. Writing an acquire load as a bare statement and then reading the payload underneath it establishes nothing, even though it looks like a barrier and would work under the barrier intuition. The same logic explains the release sequence rule, which extends the edge through intervening read-modify-write operations: if a release store publishes a value and several threads then perform fetch_add on the same object, an acquire load that reads any of the resulting values still synchronises with the original release store, which is exactly what makes the reference-counting teardown correct. It also explains why a failed compare_exchange cannot use release ordering: no store occurred, so there is no value for anyone to read and nothing for the release to attach to. The mental model to carry is that the atomic object is a channel and the value is the message; the ordering guarantees ride on the message being received, not on the channel existing."
      },
      {
        question: "When is a standalone fence better than putting the ordering on the operation?",
        answer:
          "In two situations, and it is worth being suspicious of any other use. The first is amortisation: if you are about to perform many relaxed stores that all need to be published together, a single release fence followed by a relaxed store to a flag orders all of them at the cost of one barrier, whereas making each store a release would pay per store. Building a large table and then publishing it is the archetype. The second is a rare path: in the reference-counting teardown, every thread's decrement must be a release so its writes are published, but only the thread that reaches zero needs to acquire, because only it runs the destructor. Placing a standalone acquire fence inside the zero branch means the acquire is paid once per object destroyed rather than once per reference dropped, which on ARM removes a real barrier from a very hot path. Outside of those, the operation ordering is preferable because a fence is strictly stronger and less precise. An acquire fence orders the preceding loads against every subsequent memory operation, whereas an acquire load orders only itself, and that extra strength both emits more constrained code and gives the optimiser less freedom around it. There is also a correctness subtlety that catches people: fence semantics are defined in terms of the atomic operations before and after them, so a release fence needs a subsequent atomic store to attach to and an acquire fence needs a preceding atomic load - a fence with no atomic operation on the relevant side orders nothing useful. Finally, std::atomic_signal_fence is a completely different tool despite the similar name: it constrains only compiler code motion and emits no instructions at all, and it exists for interaction with a signal handler running on the same thread, where there is no second core to synchronise with."
      },
      {
        question: "How do compiler optimisations interact with the memory model?",
        answer:
          "The compiler is bound by the same happens-before rules as the hardware, and in practice it is the more aggressive reorderer of the two. Its licence comes from the as-if rule combined with the undefined behaviour of data races: because a race-free program's observable behaviour must be preserved and a racy program has no defined behaviour at all, the compiler may optimise as though no other thread touches any non-atomic object. That single assumption enables the transformations that break naive threaded code. It hoists a loop-invariant load out of a spin loop, turning a wait on a plain bool into an infinite loop. It sinks a store past a call it can prove does not observe it. It merges adjacent stores, invents speculative writes to a location it can prove is written on all paths, and keeps values in registers across arbitrarily long stretches. Marking a variable atomic withdraws the assumption for that variable and additionally forbids the compiler from inventing writes to it or from fusing repeated operations on it in ways that change what another thread can observe - although note that the standard does permit merging adjacent relaxed operations, and implementations mostly decline to do so out of caution rather than obligation. The ordering annotations then constrain code motion across the operation in the direction the ordering specifies. The practical significance is that testing on x86 tells you nothing about compiler reordering, because the compiler's transformations are architecture-independent: a missing release can be broken by GCC on x86 just as readily as by hardware on ARM, and enabling higher optimisation levels or link-time optimisation can turn working code into broken code. It is also why volatile is not a substitute, since it constrains only the accesses to the volatile object itself and permits everything around it to move freely."
      },
      {
        question: "What is the modification order, and what does relaxed ordering still guarantee?",
        answer:
          "Every atomic object has a single total modification order: all the writes to that one object form a sequence that every thread agrees on, and this holds even when every operation is relaxed. It gives you a set of guarantees collectively called coherence, and they are stronger than people usually assume. A thread that reads an object twice can never see the values go backwards, so if it observes the third value in the modification order it will never subsequently observe the second. A thread's own writes to an object are seen by that thread in program order. A read-modify-write operation is guaranteed to read the value immediately preceding it in the modification order, which is precisely what makes fetch_add usable as a unique identifier generator under relaxed ordering - uniqueness follows from atomicity and from the RMW's position in the modification order, neither of which relaxed weakens. And writes eventually become visible, though the standard only says they should be visible in a finite period of time rather than imposing a bound. What relaxed gives up is any ordering across different objects, and any ordering between an atomic operation and the surrounding non-atomic accesses. So two relaxed operations on two different atomics can be observed in opposite orders by two different threads, and a plain write before a relaxed store carries no guarantee of being visible to a thread that observes the store. That distinction is the whole practical content of the ordering choice: relaxed is exactly right when the atomic object's own value is the only thing that matters, as in a statistics counter, a unique ID generator, or a reference count increment, and exactly wrong the moment the atomic is being used to signal that some other memory is ready."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Batty, Owens, Sarkar, Sewell, Weber - Mathematizing C++ Concurrency (POPL 2011)",
        insight: "The formal model behind the standard's wording, including the release sequence and data race definitions."
      },
      {
        source: "note",
        attribution: "cppreference - std::memory_order and the ordering examples",
        insight: "Normative descriptions of each ordering plus worked store-buffering and message-passing examples."
      },
      {
        source: "blog",
        attribution: "Preshing on Programming - Acquire and Release Semantics, Memory Barriers Are Like Source Control",
        insight: "The clearest informal explanation of one-way barriers and why x86 hides most ordering bugs."
      }
    ]
  },
  {
    id: "topic-cpp-concurrency-false-sharing-and-performance",
    moduleId: "mod-cpp-concurrency",
    title: "False Sharing, Cache Coherence, and Scalable Design",
    intuition:
      "Correct concurrent code that does not scale is the normal outcome, and the reason is almost always the cache coherence protocol rather than the synchronisation primitives. Hardware moves memory between cores in fixed-size lines, typically 64 bytes, and it can only track ownership at that granularity - so two threads writing to two entirely unrelated variables that happen to share a line will fight over it as though they shared the variable. That is false sharing, and it can cost an order of magnitude on a benchmark whose source contains no bug at all. Designing for scalability means designing for what each core writes and where it lives, not merely for correctness.",
    complexity: {
      time:
        "An L1 hit is about 1 nanosecond, L2 about 4, L3 about 12 to 20, and DRAM 60 to 100. A cache line owned exclusively by another core on the same socket costs 40 to 80 nanoseconds to acquire, and across sockets 100 to 300 - so a falsely shared counter turns a 1-nanosecond increment into 40 or more, and the effect worsens with core count rather than staying constant. An uncontended atomic increment is roughly 20 cycles; the same increment under 16-way false sharing can exceed 500. Padding to a full line removes the transfer entirely and restores linear scaling.",
      space:
        "Padding costs a whole cache line per hot object, so an array of 64 per-thread counters grows from 512 bytes to 4 kilobytes. That is almost always worth it for write-hot data and almost always wasted on read-only data, which benefits from being packed densely so that one line carries more useful bytes. std::hardware_destructive_interference_size gives the padding target, typically 64, and std::hardware_constructive_interference_size gives the packing target for data that should share a line - on some Intel parts the destructive value is 128 because of adjacent-line prefetching."
    },
    lesson: [
      {
        title: "Cache Coherence and Where the Time Actually Goes",
        content:
          "Multi-core processors keep caches consistent with a protocol - MESI and its variants - in which every cache line is in one of a few states: Modified when one core has the only dirty copy, Exclusive when one core has the only clean copy, Shared when several cores have read-only copies, and Invalid when a copy is stale. Reading a line others hold is cheap because Shared allows arbitrary replication. Writing is expensive because the writer must first invalidate every other copy and take the line in Modified state, which is a message to every other core and a wait for their acknowledgements. The whole of concurrent performance follows from that asymmetry: reads scale and writes to shared lines do not, and since the protocol operates on lines rather than variables, sharing is determined by address layout rather than by program meaning.",
        codeExample: `// MESI states and what each transition costs
//   M (Modified)  - this core has the only copy, and it is dirty
//   E (Exclusive) - this core has the only copy, and it is clean
//   S (Shared)    - several cores have read-only copies
//   I (Invalid)   - this copy is stale
//
//   read a line in S   -> cheap, any number of cores may hold it
//   write a line       -> must reach M, which INVALIDATES every
//                         other copy: a broadcast plus acknowledgements
//   read a line in M elsewhere -> that core must write back or
//                         forward it; 40-80ns same socket

// The cost hierarchy that governs every decision
//   L1 hit                        ~1 ns     (~4 cycles)
//   L2 hit                        ~4 ns
//   L3 hit                        ~12-20 ns
//   line owned by another core    ~40-80 ns  (same socket)
//   line owned across sockets     ~100-300 ns
//   DRAM                          ~60-100 ns
// Note that stealing a line from a peer core can cost MORE than
// reading from memory. This is why sharing is the enemy.

// FALSE SHARING: the classic demonstration
struct Counters {
    std::atomic<std::uint64_t> a{0};   // offset 0
    std::atomic<std::uint64_t> b{0};   // offset 8  - SAME 64B LINE
};
Counters c;
// thread 1 hammers c.a, thread 2 hammers c.b.
// The variables are independent. The LINE is not.
// Every increment by either thread invalidates the other's copy.
// Measured: ~10x slower than two counters on separate lines.

// The fix: pad to a full line
struct alignas(64) PaddedCounter {
    std::atomic<std::uint64_t> v{0};
    char pad[64 - sizeof(std::atomic<std::uint64_t>)];
};
PaddedCounter counters[kThreads];    // each owns its own line

// C++17 gives you the portable constant
#include <new>
struct alignas(std::hardware_destructive_interference_size) Slot {
    std::atomic<std::uint64_t> v{0};
};
// hardware_destructive_interference_size = minimum offset that
//   AVOIDS false sharing (typically 64, but 128 on some Intel parts
//   because the L2 prefetcher fetches adjacent line pairs)
// hardware_constructive_interference_size = maximum size that
//   PROMOTES true sharing - use it to pack data touched together
// GCC warns about ABI stability when you use them; -Wno-interference-size
// or define your own constant if that matters.

// TRUE SHARING is the other half of the problem
std::atomic<std::uint64_t> total{0};
// 16 threads doing total.fetch_add(1) contend on the same line
// LEGITIMATELY - they really do share the variable. Padding cannot
// help. The fix is to stop sharing:
thread_local std::uint64_t local = 0;      // no sharing at all
// ...then merge periodically.

// A real case: a mutex array
std::mutex locks[64];       // sizeof(std::mutex) == 40 on Linux
// 40 bytes each means TWO locks per 64-byte line, so threads taking
// "independent" locks 0 and 1 contend on the coherence protocol.
struct alignas(64) PaddedMutex { std::mutex m; };
PaddedMutex locks2[64];     // now genuinely independent

// Where false sharing hides
//   - adjacent elements of an array indexed by thread id
//   - two hot members of the same struct written by different threads
//   - a lock and the data it protects (usually GOOD - constructive)
//   - the head and tail indices of a ring buffer  <-- very common
//   - a refcount next to a frequently-read vtable pointer

// The ring buffer case, fixed
class SpscQueue {
    alignas(64) std::atomic<std::size_t> head_{0};   // consumer writes
    alignas(64) std::atomic<std::size_t> tail_{0};   // producer writes
    alignas(64) std::vector<T> buf_;
};
// Without the alignment, the producer's tail write invalidates the
// consumer's cached head on every single push. With it, each side
// owns its line and the queue runs several times faster.`,
        diagram: asciiDiagram(`False sharing: independent variables, shared line

  MEMORY LAYOUT ── one 64-byte cache line
  ┌──────────────────────────────────────────────────────────┐
  │ byte 0        8        16                            63  │
  │ ┌────────┬────────┬───────────────────────────────────┐  │
  │ │ a      │ b      │        (unused)                   │  │
  │ └────────┴────────┴───────────────────────────────────┘  │
  │   ▲        ▲                                             │
  │   │        └── thread 2 writes only this                 │
  │   └── thread 1 writes only this                          │
  └──────────────────────────────────────────────────────────┘

  WHAT THE COHERENCE PROTOCOL SEES
  ┌──────────────────────────────────────────────────────────┐
  │  core 0 cache          line state          core 1 cache  │
  │  ────────────          ──────────          ────────────  │
  │  writes a  ──►  M on core 0,  I on core 1                │
  │                                    ◄──  core 1 writes b  │
  │                 I on core 0,  M on core 1                │
  │  writes a  ──►  M on core 0,  I on core 1                │
  │                                    ◄──  core 1 writes b  │
  │                                                          │
  │  the LINE ping-pongs on every write, at 40-80 ns each,   │
  │  although the two variables are entirely unrelated       │
  └──────────────────────────────────────────────────────────┘

  AFTER PADDING
  ┌──────────────────────────────────────────────────────────┐
  │  line 0  ┌────────┬──────────── pad ──────────────────┐  │
  │          │ a      │                                   │  │
  │          └────────┴───────────────────────────────────┘  │
  │  line 1  ┌────────┬──────────── pad ──────────────────┐  │
  │          │ b      │                                   │  │
  │          └────────┴───────────────────────────────────┘  │
  │                                                          │
  │  core 0 holds line 0 in M forever                        │
  │  core 1 holds line 1 in M forever                        │
  │  ⇒ zero coherence traffic, ~1 ns per write               │
  └──────────────────────────────────────────────────────────┘

  MESI state costs
  ┌────────────────────────────────────────────────────────┐
  │  read a line held S by others      cheap, replicate    │
  │  write a line held S by others     invalidate ALL,     │
  │                                    wait for acks       │
  │  read a line held M by another     that core forwards  │
  │                                    or writes back      │
  │                                                        │
  │  ⇒ READS SCALE.  WRITES TO SHARED LINES DO NOT.        │
  └────────────────────────────────────────────────────────┘

  TRUE sharing cannot be padded away
    16 threads on one counter really do share it.
    The only fix is to stop sharing: per-thread accumulation,
    merged rarely.`)
      },
      {
        title: "Scalable Patterns: Sharding, Snapshots, and Per-Thread State",
        content:
          "Once the diagnosis is that a hot line is being written by many cores, the remedies form a short and well-ordered list. Best is not to share at all, giving each thread its own state and combining rarely, which turns a contended atomic into an ordinary increment. Next is to make the shared data immutable and publish new versions by swapping a pointer, so readers never write anything and scale perfectly. Next is to shard, splitting one lock and one structure into many keyed by a hash, which divides contention by the shard count provided the shards are line-aligned. Only after those should you consider lock-free structures, whose complexity and reclamation burden rarely pay for themselves. Reducing the size of the critical section helps at every level, and is often the cheapest change available.",
        codeExample: `// 1. DON'T SHARE - per-thread state, merged rarely
class Metrics {
    struct alignas(64) Local { std::uint64_t count = 0, bytes = 0; };
    static inline std::vector<Local> slots_;         // one per thread
    static thread_local std::size_t my_index_;
public:
    static void record(std::uint64_t n) {
        auto& s = slots_[my_index_];
        ++s.count; s.bytes += n;      // plain writes, own cache line
    }
    static Local total() {            // called once per second
        Local t{};
        for (auto& s : slots_) { t.count += s.count; t.bytes += s.bytes; }
        return t;                     // approximate; that is fine
    }
};
// ~1 ns per record, scales linearly. An atomic counter would be
// ~40 ns and would get WORSE with more cores.

// 2. IMMUTABLE SNAPSHOTS - readers never write
std::atomic<std::shared_ptr<const RouteTable>> routes;   // C++20
const Route* lookup(Key k) {
    auto snap = routes.load();        // readers never block or write
    return snap->find(k);             //   the shared structure
}
void reload() {
    routes.store(std::make_shared<const RouteTable>(build()));
}
// Cost: one allocation per update, plus a refcount bump per read
// (which IS a shared write - use hazard pointers or RCU if the read
// rate makes even that a bottleneck).

// 3. SHARDING - divide the contention
template <class K, class V>
class ShardedMap {
    static constexpr std::size_t kShards = 64;
    struct alignas(64) Shard {        // ALIGNED, or the locks
        std::shared_mutex m;          // falsely share
        std::unordered_map<K, V> data;
    };
    std::array<Shard, kShards> shards_;
    Shard& at(const K& k) { return shards_[std::hash<K>{}(k) & (kShards - 1)]; }
public:
    std::optional<V> get(const K& k) {
        Shard& s = at(k);
        std::shared_lock lk(s.m);
        auto it = s.data.find(k);
        return it == s.data.end() ? std::nullopt : std::optional{it->second};
    }
};
// Contention drops by roughly kShards, assuming a good hash. Use a
// power of two so the modulo is a mask.
// Multi-key operations now need multiple locks in a fixed order, and
// a global size() is no longer cheap or exact - that is the cost.

// 4. SHRINK THE CRITICAL SECTION
// before:
{ std::lock_guard lk(m); auto v = map_[k]; send_over_network(v); }
// after:
Value v;
{ std::lock_guard lk(m); v = map_[k]; }        // ~50 ns held
send_over_network(v);                           // ~1 ms, unlocked

// 5. BATCH to amortise the synchronisation
// before: N locks for N items
for (auto& item : items) { std::lock_guard lk(m); queue_.push(item); }
// after: 1 lock for N items
{ std::lock_guard lk(m);
  for (auto& item : items) queue_.push(item); }

// Amdahl's law is the ceiling
//   speedup = 1 / (s + p/N)   where s is the serial fraction
//   s = 0.05, N = 16  ->  speedup 9.1, not 16
//   s = 0.05, N = 64  ->  speedup 15.4  (adding 48 cores bought 6x)
//   s = 0.01, N = 64  ->  speedup 39
// A 5% critical section caps you at 20x no matter how many cores you
// buy. Reducing the serial fraction beats adding threads.

// NUMA: on a multi-socket machine, memory has an owner
//   first-touch allocation means a page belongs to the NUMA node of
//   the thread that first WRITES it, not the one that malloc'd it
//   ⇒ initialise per-thread data FROM that thread
//   numactl --cpunodebind=0 --membind=0 ./prog     to test
//   cross-socket access is 1.5-3x the latency of local`
      },
      {
        title: "Measuring Rather Than Guessing",
        content:
          "Concurrency performance intuition is unusually unreliable, because the dominant costs - coherence traffic, context switches, scheduler decisions - are invisible in the source. The tools that matter are hardware performance counters, which report cache misses and, on Intel, the specific HITM event that indicates a line was taken from another core in modified state, which is the direct fingerprint of false sharing. Scaling curves are the other essential measurement: run the same workload at one, two, four, eight, and sixteen threads and plot throughput, because a curve that flattens indicates a serial fraction and one that actually declines indicates contention or false sharing. Benchmark carefully, since microbenchmarks of atomics are dominated by whether the compiler optimised the loop away and by whether threads started simultaneously.",
        codeExample: `// perf: the false-sharing fingerprint on Intel
//   perf c2c record ./prog && perf c2c report
//     directly reports the cache lines with the most HITM events and
//     the source lines that touched them - purpose-built for this
//   perf stat -e cache-misses,cache-references,LLC-load-misses ./prog
//   perf stat -e mem_load_l3_hit_retired.xsnp_hitm ./prog
//     HITM = a load hit a line MODIFIED in another core's cache,
//     which is exactly what false sharing produces
//   perf record -e cycles:pp ./prog && perf report

// Context switches indicate lock contention
//   /proc/<pid>/status  voluntary_ctxt_switches
//   a value near one per operation means threads are parking on locks
//   perf stat -e context-switches,cpu-migrations ./prog

// Scaling curve: the single most informative measurement
//   threads:      1     2     4     8    16
//   throughput:  10M   19M   36M   40M   38M
//                            ▲           ▲
//                            │           └─ DECLINING = contention
//                            └─ flattening = serial fraction
// Ideal is linear. Flattening means Amdahl. Declining means the
// threads are actively fighting - false sharing or a hot lock.

// Writing a benchmark that is not a lie
void bench(int nthreads) {
    std::latch start{1};                 // release all threads at once
    std::atomic<std::uint64_t> ops{0};
    std::vector<std::jthread> ts;
    for (int i = 0; i < nthreads; ++i)
        ts.emplace_back([&] {
            std::uint64_t local = 0;     // accumulate LOCALLY, or the
            start.wait();                // benchmark measures its own
            auto end = Clock::now() + 3s;//  counter
            while (Clock::now() < end) { work(); ++local; }
            ops += local;                // one shared write at the end
        });
    auto t0 = Clock::now();
    start.count_down();                  // all threads begin together
    ts.clear();                          // jthread joins
    report(ops, Clock::now() - t0);
}
// Pitfalls this avoids:
//   - staggered starts, which make early threads look faster
//   - a shared counter inside the loop, which measures false sharing
//     rather than the workload
//   - too short a run, which measures thread creation

// Stopping the optimiser from deleting the work
static void escape(void* p) { asm volatile("" : : "g"(p) : "memory"); }
// or benchmark::DoNotOptimize from Google Benchmark

// Pin threads to reveal topology effects
//   taskset -c 0,1 ./prog        two cores on the same physical core
//                                (hyperthreads) - shared L1/L2
//   taskset -c 0,8 ./prog        two different physical cores
//   numactl --cpunodebind=0,1    cross-socket
// The same benchmark can differ 3x across these.

// A checklist for a workload that will not scale
//   1. perf c2c        -> false sharing on a specific line?
//   2. context switches -> lock contention?
//   3. scaling curve    -> flat (Amdahl) or declining (contention)?
//   4. Is the hot data written by more than one thread at all?
//   5. Is the critical section doing IO, allocation, or a callback?
//   6. Is per-thread data allocated by the thread that uses it (NUMA)?

// Allocation is a hidden shared resource
//   malloc contends on internal locks; tcmalloc, jemalloc and
//   mimalloc use per-thread caches and often give a large speedup
//   in allocation-heavy concurrent code for a one-line link change.
//   Better still: allocate outside the hot loop, or use a
//   std::pmr::monotonic_buffer_resource per thread.`,
        diagram: asciiDiagram(`Reading a scaling curve

  throughput
   (Mops/s)
      │
   80 ┤                                        ╭─── ideal (linear)
      │                                   ╭────╯
   60 ┤                              ╭────╯
      │                         ╭────╯
   40 ┤                    ╭────╯      ╭──────●──────●  A: flattening
      │               ╭────╯     ╭─────╯
   20 ┤          ╭────╯    ╭─────╯            ●         B: DECLINING
      │     ╭────╯   ╭─────╯                     ●
    0 ┼─────┴────┴────┴─────┴─────┴─────┴─────┴─────┴──► threads
      1     2    4    6     8    10    12    14    16

  ┌──────────────────────────────────────────────────────────┐
  │ CURVE A ── flattens and stays flat                       │
  │   diagnosis: Amdahl's law, a serial fraction             │
  │     speedup = 1 / (s + p/N)                              │
  │     s = 5%  ⇒  ceiling of 20x however many cores         │
  │   fix: shrink or remove the serial section; adding       │
  │        threads will not help                             │
  ├──────────────────────────────────────────────────────────┤
  │ CURVE B ── rises then FALLS                              │
  │   diagnosis: active interference between threads         │
  │     • false sharing   ⇒ perf c2c shows HITM on a line    │
  │     • lock contention ⇒ voluntary_ctxt_switches spikes   │
  │     • lock convoying  ⇒ time is in futex_wait            │
  │     • allocator locks ⇒ time is in malloc                │
  │   fix: pad, shard, or stop sharing                       │
  └──────────────────────────────────────────────────────────┘

  DIAGNOSTIC DECISION TREE
        does throughput fall as threads are added?
                    │
          ┌─────────┴─────────┐
         yes                  no
          │                    │
          ▼                    ▼
    perf c2c            does it flatten?
          │                    │
    ┌─────┴─────┐         ┌────┴────┐
   HITM        no HITM   yes        no
   on a line     │        │          │
    │            ▼        ▼          ▼
    ▼        check     Amdahl:    you are
  FALSE      ctxt      shrink     scaling —
  SHARING    switches  the        stop here
    │          │       serial
  pad to     LOCK      part
  64 bytes   CONTENTION

  remedies, best first
    1. do not share       thread_local, merge rarely
    2. immutable          publish snapshots atomically
    3. shard              N locks instead of 1, line-aligned
    4. shrink             hold the lock for fewer nanoseconds
    5. lock-free          last resort; reclamation is the hard part`)
      },
      {
        title: "Coroutines and Structured Alternatives to Threads",
        content:
          "Not every concurrency problem is a parallelism problem. Work that is dominated by waiting - network calls, disk reads, RPC fan-out - does not need a core per task, and dedicating an operating system thread with its megabyte stack to something that is blocked ninety-nine percent of the time is expensive and limits scale to a few thousand concurrent operations. C++20 coroutines provide suspendable functions whose state lives in a small heap allocation rather than a stack, so hundreds of thousands can coexist, and crucially they make asynchronous code read sequentially instead of as a chain of callbacks. The language provides only the mechanism, with no standard scheduler or task type until C++26's std::execution, so in practice you use a library. The trade-off is real: coroutines cost an allocation and a suspension protocol, and they solve latency and scale rather than throughput on CPU-bound work.",
        codeExample: `#include <coroutine>

// The problem coroutines solve: threads are expensive for waiting
//   10,000 concurrent HTTP requests
//     thread per request: 10,000 x 1-8 MB stack = 10-80 GB, plus
//                         scheduler thrash. Not viable.
//     coroutine per request: 10,000 x ~200 bytes = 2 MB, one thread
//                            per core running an event loop.

// A minimal Task type (real libraries are far more complete)
template <class T>
struct Task {
    struct promise_type {
        T value_;
        std::coroutine_handle<> continuation_;
        Task get_return_object() {
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }
        auto final_suspend() noexcept {
            struct Awaiter {
                bool await_ready() noexcept { return false; }
                std::coroutine_handle<> await_suspend(
                    std::coroutine_handle<promise_type> h) noexcept {
                    return h.promise().continuation_;   // symmetric
                }                                       // transfer
                void await_resume() noexcept {}
            };
            return Awaiter{};
        }
        void return_value(T v) { value_ = std::move(v); }
        void unhandled_exception() { std::terminate(); }
    };
    std::coroutine_handle<promise_type> h_;
    ~Task() { if (h_) h_.destroy(); }
};

// What the code looks like at the call site - sequential, not callbacks
Task<Response> handle(Request req) {
    auto user    = co_await db.find_user(req.id);      // suspends here
    auto profile = co_await cache.get(user.profile);   // and here
    co_return render(user, profile);
}
// Between each co_await the thread is FREE to run other coroutines.
// Compare the callback version, which inverts control flow and makes
// error handling and lifetime opaque.

// The three keywords, and what makes a function a coroutine
//   co_await expr   suspend until expr is ready
//   co_yield  v     produce a value and suspend (generators)
//   co_return v     finish
// A function containing ANY of these is a coroutine; there is no
// marker on the declaration, which is a known ergonomic wart.

// C++23 std::generator makes the common case trivial
std::generator<int> fib() {
    int a = 0, b = 1;
    while (true) { co_yield a; std::tie(a, b) = std::pair{b, a + b}; }
}
for (int x : fib()) { if (x > 100) break; use(x); }

// COSTS AND HAZARDS
// 1. The coroutine frame is heap-allocated unless the compiler can
//    prove it does not escape (HALO). Allocation is not elided as
//    reliably as the design hoped.
// 2. LIFETIME: a reference parameter is captured by reference into
//    the frame, and the caller's temporary may die at the first
//    suspension.
Task<void> broken(const std::string& s) {    // DANGLING
    co_await sleep(1s);
    use(s);                                   // s is long gone
}
Task<void> fixed(std::string s) { co_await sleep(1s); use(s); }
// Take parameters BY VALUE in coroutines. This is the single most
// common coroutine bug.
// 3. A coroutine may resume on a DIFFERENT THREAD than it suspended
//    on, so thread_local state and held locks do not survive a
//    co_await. Never hold a mutex across a suspension point.
// 4. There is no standard scheduler before C++26 (std::execution,
//    P2300). Use libunifex, stdexec, cppcoro, Boost.Asio, or Folly.

// WHEN TO USE WHAT
//   CPU-bound parallel work    -> thread pool, one thread per core
//   IO-bound concurrency       -> coroutines on a small event loop
//   a few long-lived services  -> plain jthreads
//   fine-grained data parallel -> std::execution policies, TBB, or a
//                                 GPU
//   Mixing: a coroutine event loop for IO plus a separate pool for
//   CPU work is the standard architecture for a modern server.

// Parallel algorithms need none of this machinery
#include <execution>
std::sort(std::execution::par_unseq, v.begin(), v.end());
std::transform_reduce(std::execution::par, v.begin(), v.end(), 0L,
                      std::plus{}, [](auto x) { return x * x; });
// The implementation supplies the pool. Requires TBB with libstdc++.
// The callable must be free of data races - the compiler does not
// check this.`
      }
    ],
    examples: [
      {
        title: "Two counters in one struct that scale negatively",
        input: "A struct holding two adjacent std::atomic<uint64_t> members, each incremented in a tight loop by a different thread.",
        output: "Throughput at two threads is lower than at one, and perf c2c shows heavy HITM traffic on a single cache line.",
        explanation:
          "Step 1: The two atomics occupy bytes zero to seven and eight to fifteen of the same 64-byte cache line, because the compiler lays out members contiguously and neither is over-aligned.\nStep 2: The coherence protocol tracks ownership per line, not per variable, so when thread one writes its counter it must take the entire line in Modified state, which invalidates thread two's copy.\nStep 3: Thread two's next increment therefore misses, must fetch the line from thread one's cache in modified state, and invalidates thread one in turn, so the line ping-pongs on every single increment at 40 to 80 nanoseconds per transfer.\nStep 4: The result is that an operation costing about one nanosecond in the single-threaded case costs forty or more with two threads, so adding a thread reduces total throughput - the signature of false sharing rather than of contention on a genuinely shared variable.\nStep 5: Declaring each counter alignas(std::hardware_destructive_interference_size) places them on separate lines, each core keeps its line in Modified state permanently, coherence traffic drops to zero, and scaling becomes linear - at the cost of 64 bytes per counter, which is the correct trade for write-hot data."
      },
      {
        title: "A sharded cache that still does not scale",
        input: "An array of 64 shards, each holding a std::mutex and an unordered_map, with keys distributed uniformly by hash.",
        output: "Throughput plateaus at four threads despite sixty-four independent locks.",
        explanation:
          "Step 1: A std::mutex is around 40 bytes on Linux, so an array of them packs one and a half locks per 64-byte cache line and adjacent shards share lines.\nStep 2: Acquiring a mutex is a read-modify-write on its state word, so a thread locking shard zero writes the same cache line that a thread locking shard one must write, and the two contend in the coherence protocol even though the locks are logically independent.\nStep 3: With sixty-four shards packed this way, the effective number of independent lines is roughly forty rather than sixty-four, but more importantly the hottest few lines carry two locks each and see double the traffic, so the practical contention reduction falls far short of the intended factor.\nStep 4: The fix is to wrap each shard in a struct declared alignas(64) so that its mutex and its data begin on a fresh line, which costs padding but makes the shards genuinely independent.\nStep 5: If the curve still plateaus after that, the remaining causes to check in order are a poor hash concentrating keys in a few shards, allocation inside the critical section contending on the allocator's own locks, and NUMA effects if the shards were all allocated and first-touched by the initialising thread on one socket."
      },
      {
        title: "Ten thousand concurrent requests without ten thousand threads",
        input: "A service handling ten thousand simultaneous HTTP requests, each spending 99 percent of its time waiting on a downstream call.",
        output: "A coroutine-based design uses about 2 megabytes of frame memory and a handful of threads, against tens of gigabytes for a thread-per-request design.",
        explanation:
          "Step 1: Each operating system thread reserves a stack of one to eight megabytes of virtual address space and commits pages as it touches them, so ten thousand threads reserve tens of gigabytes and commit far more than the workload needs.\nStep 2: The scheduler must also manage ten thousand runnable-or-blocked entities, and the context switching plus cache pollution when many wake at once dominates the actual work, which is nearly nothing per request.\nStep 3: A coroutine frame holds only the local variables live across suspension points plus a small amount of bookkeeping, typically a few hundred bytes, and it lives on the heap rather than on a reserved stack, so ten thousand of them fit in a couple of megabytes.\nStep 4: A single event loop thread per core resumes whichever coroutines have completed their IO, so the number of threads matches the hardware while the number of concurrent operations is bounded only by memory.\nStep 5: The costs to weigh are that each coroutine frame is a heap allocation the compiler often cannot elide, that a coroutine may resume on a different thread than it suspended on so no lock may be held across a co_await, and that reference parameters are captured into the frame by reference and dangle after the first suspension - which is why coroutine parameters should be taken by value."
      }
    ],
    tips: [
      "Align write-hot per-thread data to std::hardware_destructive_interference_size; the 64 bytes of padding routinely buys an order of magnitude.",
      "Align the head and tail indices of a ring buffer separately, since otherwise the producer's write invalidates the consumer's cached index on every operation.",
      "Take coroutine parameters by value, because reference parameters are captured into the frame and the caller's temporary dies at the first suspension point."
    ],
    tricks: [
      "perf c2c is purpose-built for false sharing and reports the exact cache lines and source locations generating HITM events.",
      "Accumulate into a local variable inside a benchmark loop and write the shared counter once at the end, or the benchmark measures its own instrumentation.",
      "Switching to tcmalloc, jemalloc, or mimalloc is a link-line change that often gives a large speedup in allocation-heavy concurrent code, because the default malloc contends on internal locks."
    ],
    memoryAids: [
      "Coherence works on lines, not variables - sharing is decided by address layout, not by meaning.",
      "Reads scale, writes to shared lines do not.",
      "A flattening scaling curve means Amdahl; a declining one means the threads are fighting."
    ],
    interviewPatterns: [
      "'Your counter array gets slower with more threads - why?' is the standard false-sharing question and expects padding plus the MESI explanation.",
      "'How would you make this cache scale to sixty-four cores?' expects sharding, alignment, per-thread accumulation, and a mention of NUMA first-touch.",
      "Frequency and companies: very common at HFT firms, Nvidia, Google infrastructure teams, and any performance-focused systems role."
    ],
    practiceProblems: [
      "Why is std::hardware_destructive_interference_size sometimes 128 rather than 64? Answer: some Intel processors prefetch cache lines in adjacent pairs, so a write to one line can cause the neighbouring line to be fetched and tracked together, and separating write-hot data by only 64 bytes leaves it in the same prefetch pair; the constant reports the minimum offset that reliably avoids interference on the target, which is why hard-coding 64 is not portable - note also that GCC warns about ABI stability when the constant is used across translation units.",
      "You add threads to a parallel workload and throughput rises then falls. Give three candidate causes and how to distinguish them. Answer: false sharing, which perf c2c identifies directly by reporting HITM events on a specific cache line and the source lines touching it; lock contention, which shows as a spike in voluntary context switches in /proc/pid/status and time spent in futex_wait; and allocator contention, which shows as time in malloc and is confirmed by relinking against jemalloc or tcmalloc - a fourth possibility on multi-socket machines is NUMA, where per-thread data was first-touched by an initialising thread on one socket and is now remote for most workers.",
      "Why should a mutex never be held across a co_await? Answer: a coroutine may be resumed on a different thread than the one that suspended it, and std::mutex must be unlocked by the thread that locked it, so resuming elsewhere and then unlocking is undefined behaviour; additionally the suspension may last arbitrarily long, so the lock would be held for the duration of an IO operation, serialising every other user of it - the correct pattern is to release the lock before the suspension and reacquire afterwards, re-checking any state the lock protected, or to use an async-aware mutex from a coroutine library that resumes the waiter rather than blocking a thread."
    ],
    faq: [
      {
        question: "What is false sharing and how do I detect it?",
        answer:
          "False sharing occurs when two threads write to distinct variables that happen to occupy the same cache line, so the coherence protocol treats their independent work as contention. Hardware tracks ownership at line granularity - almost universally 64 bytes on x86-64 and modern ARM - and a write requires the line in Modified state, which invalidates every other core's copy. So two adjacent counters, each touched by only one thread, cause the line to ping-pong between cores at 40 to 80 nanoseconds per transfer on the same socket and up to 300 across sockets, turning a one-nanosecond increment into forty or more. The distinguishing symptom is negative scaling: throughput actually falls as threads are added, which contention on a genuinely shared variable does not usually produce so dramatically. Detection is straightforward with the right tool. On Intel, perf c2c is purpose-built: it records HITM events, meaning a load that hit a line held in Modified state in another core's cache, and reports the specific cache lines with the most traffic along with the source locations that touched them. Failing that, perf stat on the mem_load_l3_hit_retired.xsnp_hitm event gives a scalar indicator, and a scaling curve that declines with thread count is a strong hint on its own. The fix is padding: declare the hot object alignas(std::hardware_destructive_interference_size), which is 64 on most targets and 128 on some Intel parts because of adjacent-line prefetching. The places it hides most often are arrays indexed by thread id, the head and tail indices of a ring buffer, arrays of mutexes since a std::mutex is only 40 bytes, and a reference count adjacent to a frequently-read vtable pointer. The reverse consideration also matters: data that is always read together should share a line, which is what hardware_constructive_interference_size is for."
      },
      {
        question: "Why does my concurrent code not scale even though there is no false sharing?",
        answer:
          "Work through the causes in order of likelihood. First is Amdahl's law, which is not a bug but a ceiling: if five percent of the work is serial, the maximum speedup is twenty regardless of core count, and sixty-four cores will deliver about fifteen. A scaling curve that rises and then flattens is the signature, and the only remedy is to shrink the serial fraction, not to add threads. Second is genuine lock contention, visible as a spike in voluntary context switches - roughly one per operation means threads are parking - and as time spent in futex_wait in a profile; the remedies are sharding the lock, shortening the critical section, or removing the sharing. Third is allocator contention, which is invisible in your source because it happens inside malloc: the default glibc allocator uses per-arena locks and can serialise allocation-heavy concurrent code badly, and relinking against tcmalloc, jemalloc, or mimalloc is a one-line change that often produces a large improvement. Fourth is memory bandwidth saturation, where the cores are all streaming and the memory controller is the bottleneck; this shows as a flat curve with high cache miss rates and low IPC, and the fix is algorithmic - improve locality, blocking, or data layout so that less data moves. Fifth is NUMA on multi-socket machines, where first-touch allocation means a page belongs to the node of the thread that first wrote it, so data initialised by a single setup thread is remote for most workers and costs one and a half to three times as much to access; the fix is to have each thread initialise its own data, or to use numactl to check whether binding changes the picture. Sixth is oversubscription: more runnable threads than cores means the scheduler preempts them mid-critical-section, which can trigger lock convoying. Finally, hyperthreading gives two logical cores that share L1, L2, and execution ports, so scaling from the physical core count to the logical count typically yields ten to thirty percent rather than double, and can be negative for cache-heavy work."
      },
      {
        question: "When are C++20 coroutines the right tool rather than threads?",
        answer:
          "Coroutines address concurrency, meaning many operations in flight, while threads address parallelism, meaning many operations executing simultaneously - and the distinction determines the choice. If the work is CPU-bound, coroutines buy nothing, because you still need a core per unit of actual computation and a thread pool sized to the hardware is the right structure. If the work is dominated by waiting on IO, coroutines are transformative: a thread blocked on a network call still holds a one to eight megabyte stack reservation and a scheduler entry, so ten thousand concurrent requests means tens of gigabytes of address space and severe scheduler pressure, whereas ten thousand coroutine frames holding only the locals live across suspension points might total two megabytes and be resumed by one event loop thread per core. The second benefit is expressive rather than performance-related: asynchronous code written with co_await reads sequentially, so control flow, error handling with exceptions, and RAII all work as they do in synchronous code, which callback-based designs destroy. The costs are real and worth stating. Each coroutine frame is a heap allocation that the compiler elides only when it can prove the frame does not escape, and that optimisation is less reliable than the design intended. A coroutine may resume on a different thread from the one that suspended it, so thread_local state does not persist across a suspension and a mutex must never be held across a co_await, since std::mutex must be unlocked by its locking thread. Reference parameters are captured into the frame by reference and dangle after the first suspension, which makes taking parameters by value the standard rule and is the most common coroutine bug. And the language provides only the mechanism - there is no standard task type, generator before C++23, or scheduler before C++26's std::execution - so a library such as stdexec, libunifex, cppcoro, Boost.Asio, or Folly is required in practice. The mature architecture for a server is a coroutine event loop for IO alongside a separate thread pool for CPU work."
      },
      {
        question: "How do I choose between a mutex, a lock-free structure, and not sharing at all?",
        answer:
          "Rank them by how much sharing they involve, and prefer the least. Not sharing is always best where it applies: per-thread state with periodic merging turns a contended atomic costing forty nanoseconds into a plain increment costing one, and it scales linearly with cores rather than degrading. It works whenever the shared value can tolerate being approximate between merges or can be reconstructed by combining per-thread parts, which covers metrics, histograms, allocation caches, and most accumulator patterns. Next best is immutability with atomic publication: readers load a shared_ptr to an immutable snapshot and never write the shared structure at all, so reads are wait-free and scale perfectly, at the cost of building a new snapshot per update and a reference count bump per read - which is itself a shared write, so hazard pointers or RCU are the next refinement if the read rate makes even that hurt. After that comes sharding, splitting one lock and structure into many keyed by hash, which divides contention by the shard count provided the shards are cache-line aligned; the costs are that multi-key operations need several locks in a fixed order and that global aggregate queries become expensive. A plain mutex with a short critical section is the right default for everything else, and modern implementations spin briefly before parking so they handle light contention well and degrade gracefully under heavy contention in a way spinning cannot. Lock-free structures should be last. Lock-freedom is a progress guarantee, not a performance claim, and under contention a compare-exchange retry loop often performs worse than a mutex because every failed attempt still transfers the cache line and does no work. They are the right answer when the progress guarantee is the actual requirement - hard real-time deadlines, signal handler safety, or shared memory where a peer process may die holding a lock - or when profiling shows one small, extremely hot structure is the bottleneck and none of the earlier options apply. Even then, the hard part is not the algorithm but safe memory reclamation."
      },
      {
        question: "What is NUMA and when do I need to care about it?",
        answer:
          "On a machine with more than one processor socket, memory is physically attached to specific sockets, and a core accessing memory attached to another socket goes across an interconnect - UPI on Intel, Infinity Fabric on AMD - paying roughly one and a half to three times the latency and sharing limited bandwidth. Large single-socket processors increasingly have internal NUMA domains too, so the effect appears on machines that look uniform. The mechanism that determines placement is first-touch: the operating system allocates a physical page on the node of the thread that first writes to it, not the thread that called malloc. That single fact causes the most common NUMA problem, where a setup thread allocates and zeroes a large buffer, placing every page on its own node, after which all the worker threads on other sockets access it remotely for the life of the program. The fix is to have each thread first-touch the region it will use, which for an array partitioned by thread means running the initialisation loop in parallel with the same partitioning as the work loop. Beyond that, the practical guidance is to keep per-thread data allocated by its own thread, to pin threads so the operating system does not migrate them away from their memory, and to replicate small read-only structures per node rather than sharing one copy. You need to care when the machine has more than one socket and the workload is memory-bound; you can usually ignore it on a single-socket machine or when the working set fits in cache. Measurement is straightforward: run under numactl with cpunodebind and membind set to a single node and compare against the unconstrained run, since a large improvement when constrained to one node means the unconstrained version is paying for remote access. numastat reports per-node hit and miss counts, and perf can attribute remote memory accesses to source lines on recent Intel parts."
      },
      {
        question: "How should I benchmark concurrent code so the numbers mean something?",
        answer:
          "Concurrent microbenchmarks are unusually easy to get wrong, and most published ones are. Start the threads simultaneously with a latch or barrier, because staggered creation means early threads run with less contention and inflate the result. Accumulate work counts into a thread-local variable inside the loop and write to any shared counter only once at the end, or the benchmark spends its time measuring false sharing on its own instrumentation rather than the workload. Run long enough that thread creation, on the order of tens of microseconds each, is negligible - a few seconds is usually right. Prevent the optimiser from deleting work whose results are unused, either with an escape helper using an inline assembly memory clobber or with a benchmark library's DoNotOptimize. Then measure a scaling curve rather than a single number, running at one, two, four, eight, and sixteen threads, because the shape carries the diagnosis: linear means you are scaling, flattening means a serial fraction and Amdahl's law, and declining means the threads are actively interfering through false sharing, lock contention, or allocator locks. Control the topology explicitly with taskset, since two threads on hyperthreads of one physical core share L1 and L2 and behave completely differently from two threads on separate physical cores, which in turn differ from two threads on separate sockets - the same benchmark can vary threefold across those placements, so an uncontrolled run is not reproducible. Report a distribution rather than a mean, because concurrent latency is heavily tailed and the ninety-ninth percentile is usually what the system is judged on. Finally, be suspicious of any microbenchmark's applicability: an atomic increment loop measures the coherence protocol under maximum pressure, which no real workload sustains, so the ratios it produces exaggerate what you will see in production. Confirm with an end-to-end measurement before acting on a microbenchmark result."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Ulrich Drepper - What Every Programmer Should Know About Memory",
        insight: "The definitive treatment of cache coherence, MESI, false sharing, and NUMA first-touch."
      },
      {
        source: "note",
        attribution: "cppreference - std::hardware_destructive_interference_size, std::coroutine_handle, execution policies",
        insight: "Specifies the interference size constants and the coroutine customisation points."
      },
      {
        source: "video",
        attribution: "Fedor Pikus - The Speed of Concurrency: Is Lock-Free Faster? (CppCon)",
        insight: "Measured comparison showing lock-free structures frequently losing to mutexes under contention."
      }
    ]
  }
];
