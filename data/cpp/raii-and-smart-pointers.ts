import { Topic } from "../syllabus";

// Module: mod-cpp-raii - "C++: RAII and Smart Pointers" (5 topics).
// Coverage: the RAII principle and scope guards, unique_ptr, shared_ptr and
// control blocks, weak_ptr and cycle breaking, and the rules of zero/three/five
// with custom deleters.
function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

export const cppRaiiTopics: Topic[] = [
  {
    id: "topic-cpp-raii-principle-and-scope-guards",
    moduleId: "mod-cpp-raii",
    title: "RAII: Tying Resource Lifetime to Object Lifetime",
    intuition:
      "RAII is the observation that C++ already guarantees one thing absolutely - destructors of automatic objects run when the scope exits, including during exception unwinding - so if you make acquisition happen in a constructor and release happen in a destructor, correctness stops depending on programmer memory. Every resource fits: memory, file descriptors, mutexes, sockets, database transactions, OpenGL handles, even a temporary change to global state. It is the single idea that separates C++ from C in day-to-day reliability, and interviews test it because a candidate who reaches for try/finally patterns has not internalised it.",
    complexity: {
      time:
        "RAII is free at runtime in the ordinary case: the destructor call is exactly the release you would have written, and the compiler emits it at each exit point. The only additional cost is on the exception path, where unwinding walks the frames consulting unwind tables - typically microseconds, which is why exceptions are cheap when not thrown and expensive when thrown. A scope guard with a stateless lambda compiles to the same instructions as an inline release.",
      space:
        "A wrapper adds only the resource handle it stores, usually one pointer or one integer, and empty base or [[no_unique_address]] optimisation removes stateless deleters entirely, which is why std::unique_ptr<T> is exactly the size of T*. Exception support costs unwind tables in the binary, typically a few percent of image size, and no runtime memory when no exception is thrown."
    },
    lesson: [
      {
        title: "The Guarantee RAII Is Built On",
        content:
          "When control leaves a scope by any means - falling off the end, return, break, goto, or an exception propagating - every automatic object constructed in that scope is destroyed, in reverse order of construction. That guarantee is unconditional and is what makes RAII total rather than best-effort. Manual release cannot match it, because every new early return and every new statement that might throw adds another path where the release is skipped. Java-style try/finally and Go's defer approximate it but require the programmer to write the release at each site, whereas RAII attaches it to the type once and gets it right at every use forever after.",
        codeExample: `// Manual release: correct today, broken the first time someone adds a return.
void manual() {
    std::FILE* f = std::fopen("data", "r");
    if (!f) return;
    auto* buf = new char[4096];
    if (parse(f, buf) < 0) { delete[] buf; std::fclose(f); return; }
    validate(buf);                       // throws? both resources leak
    delete[] buf;
    std::fclose(f);
}

// RAII: release is attached to the TYPE, so every path is covered.
void raii() {
    std::ifstream f{"data"};             // closed by ~ifstream
    if (!f) return;
    std::vector<char> buf(4096);         // freed by ~vector
    if (parse(f, buf) < 0) return;       // both released here
    validate(buf);                       // throws? both released by unwinding
}                                        // and here`,
        diagram: asciiDiagram(`Every exit path is covered - that is the whole idea

  void f() {
      Lock  l(m);        ── acquired
      File  h("x");      ── acquired
      Buffer b(4096);    ── acquired
      ...
  }

  exit path              what runs (reverse construction order)
  ─────────────────────  ────────────────────────────────────────
  fall off the end   ──▶ ~Buffer → ~File → ~Lock
  return early       ──▶ ~Buffer → ~File → ~Lock
  break / goto out   ──▶ ~Buffer → ~File → ~Lock
  exception thrown   ──▶ ~Buffer → ~File → ~Lock   then propagate
  std::terminate     ──▶ nothing (by design: no unwinding)
  std::exit / abort  ──▶ nothing for automatics

  ┌──────────────────────────────────────────────────────────┐
  │ The programmer writes the release ONCE, in the destructor│
  │ The compiler emits it at EVERY exit, forever             │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Writing a Correct RAII Wrapper",
        content:
          "A minimal wrapper acquires in the constructor, releases in the destructor, and decides explicitly what copying and moving mean. Most handles are not copyable, because two owners closing one file descriptor is a double-close bug, so copy operations are deleted and move operations transfer the handle and null the source. The destructor must be noexcept, which it is by default, and must therefore never let an exception escape - a close that can fail needs an explicit close() method that reports the error, with the destructor swallowing or logging any failure as a last resort. Finally the wrapper should be usable as a drop-in for the raw handle, which usually means an explicit get() rather than an implicit conversion, so that ownership cannot leak out by accident.",
        codeExample: `class FileDescriptor {
    int fd_ = -1;
public:
    FileDescriptor() = default;
    explicit FileDescriptor(const char* path, int flags)
        : fd_(::open(path, flags)) {
        if (fd_ < 0) throw std::system_error(errno, std::system_category());
    }
    ~FileDescriptor() { if (fd_ >= 0) ::close(fd_); }   // noexcept, never throws

    FileDescriptor(const FileDescriptor&)            = delete;
    FileDescriptor& operator=(const FileDescriptor&)  = delete;

    FileDescriptor(FileDescriptor&& o) noexcept : fd_(std::exchange(o.fd_, -1)) {}
    FileDescriptor& operator=(FileDescriptor&& o) noexcept {
        if (this != &o) { if (fd_ >= 0) ::close(fd_); fd_ = std::exchange(o.fd_, -1); }
        return *this;
    }

    int get() const noexcept { return fd_; }           // explicit, not implicit
    [[nodiscard]] int release() noexcept { return std::exchange(fd_, -1); }
    // Errors on close must be reportable explicitly:
    void close() {
        if (fd_ >= 0 && ::close(std::exchange(fd_, -1)) != 0)
            throw std::system_error(errno, std::system_category());
    }
};`
      },
      {
        title: "Scope Guards for Resources You Do Not Own",
        content:
          "Sometimes the release action does not belong to a type you can wrap: restoring a global setting, rolling back a partially applied change, unregistering a callback, or calling a C API's cleanup function. A scope guard is a tiny RAII object holding a callable that it invokes in its destructor, optionally with a dismiss() to cancel the action when the operation succeeds. This gives you commit-or-rollback semantics without inventing a wrapper type per resource. The pattern generalises into three variants popularised by the Guidelines Support Library: scope_exit always runs, scope_fail runs only when unwinding due to an exception, detectable with std::uncaught_exceptions(), and scope_success runs only on the normal path.",
        codeExample: `template <typename F>
class ScopeGuard {
    F f_; bool active_ = true;
public:
    explicit ScopeGuard(F f) : f_(std::move(f)) {}
    ~ScopeGuard() noexcept { if (active_) { try { f_(); } catch (...) {} } }
    void dismiss() noexcept { active_ = false; }
    ScopeGuard(const ScopeGuard&) = delete;
    ScopeGuard(ScopeGuard&& o) noexcept : f_(std::move(o.f_)), active_(o.active_) {
        o.active_ = false;
    }
};
template <typename F> ScopeGuard(F) -> ScopeGuard<F>;   // CTAD

void transfer(Account& from, Account& to, Money amount) {
    from.debit(amount);
    ScopeGuard rollback{[&] { from.credit(amount); }};   // undo on any failure
    to.credit(amount);                                   // may throw
    log_transfer(from, to, amount);                      // may throw
    rollback.dismiss();                                  // committed: cancel undo
}

// Temporarily changing state and restoring it, exception-safely:
void with_precision(int p) {
    auto old = std::cout.precision(p);
    ScopeGuard restore{[old] { std::cout.precision(old); }};
    emit_report();                                       // may throw
}`
      },
      {
        title: "RAII and the Exception-Safety Guarantees",
        content:
          "Exception safety is usually described as three levels. The basic guarantee says no leaks and all invariants intact, though values may have changed. The strong guarantee says the operation either completes or has no effect, which is commit-or-rollback. The nothrow guarantee says the operation cannot fail and is required of destructors, swap, and move operations if containers are to use them. RAII delivers the basic guarantee almost for free, because every resource is released during unwinding. Reaching the strong guarantee usually requires the copy-and-swap idiom: build the new state completely in a temporary, then swap it into place with a noexcept swap, so the only step that can fail happens before anything is modified.",
        codeExample: `class Config {
    std::map<std::string, std::string> values_;
public:
    // BASIC guarantee only: if the second insert throws, the first remains.
    void update_weak(const std::string& k1, const std::string& v1,
                     const std::string& k2, const std::string& v2) {
        values_[k1] = v1;
        values_[k2] = v2;          // throws -> half-applied
    }

    // STRONG guarantee via copy-and-swap: all work happens off to the side.
    void update_strong(const std::string& k1, const std::string& v1,
                       const std::string& k2, const std::string& v2) {
        auto copy = values_;       // may throw - nothing modified yet
        copy[k1] = v1;             // may throw - still nothing modified
        copy[k2] = v2;             // may throw - still nothing modified
        values_.swap(copy);        // noexcept - the commit point
    }
};
// The cost of the strong guarantee is the copy. That is why the standard
// gives push_back the strong guarantee only when the element's move
// constructor is noexcept - otherwise it must copy during reallocation.`,
        diagram: asciiDiagram(`The three guarantees, and what buys each one

  ┌───────────────┬──────────────────────────┬────────────────────────┐
  │ GUARANTEE     │ MEANING                  │ HOW YOU GET IT         │
  ├───────────────┼──────────────────────────┼────────────────────────┤
  │ nothrow       │ cannot fail              │ noexcept + only        │
  │               │                          │ nothrow operations     │
  │               │ required of: destructors,│ (swap pointers, not    │
  │               │ swap, move ops used by   │  allocate)             │
  │               │ containers               │                        │
  ├───────────────┼──────────────────────────┼────────────────────────┤
  │ strong        │ completes fully, or has  │ copy-and-swap:         │
  │ (commit/      │ NO effect at all         │ build aside → noexcept │
  │  rollback)    │                          │ swap → commit          │
  │               │                          │ or a scope guard undo  │
  ├───────────────┼──────────────────────────┼────────────────────────┤
  │ basic         │ no leaks, invariants     │ RAII everywhere.       │
  │               │ hold, values unspecified │ Essentially free.      │
  ├───────────────┼──────────────────────────┼────────────────────────┤
  │ none          │ anything may happen      │ raw new/delete and     │
  │               │                          │ manual release         │
  └───────────────┴──────────────────────────┴────────────────────────┘

  Rule: aim for BASIC everywhere by default, and pay for STRONG only
  where a caller genuinely needs to retry after a failure.`)
      },
      {
        title: "Why Destructors Must Not Throw",
        content:
          "Since C++11 destructors are implicitly noexcept, so an exception escaping one calls std::terminate immediately. The deeper reason predates that rule: if an exception is already propagating and a destructor run during unwinding throws a second one, there is no defined way to handle two simultaneous exceptions, so the standard terminates. The practical consequence is that any release which can genuinely fail - closing a file where the final flush may report a disk error, committing a transaction, closing a socket where the shutdown handshake matters - needs an explicit method that reports the failure, with the destructor as a silent fallback for the case where the user did not call it. std::uncaught_exceptions() lets a destructor detect whether it is running during unwinding, which is exactly how scope_fail and scope_success are implemented.",
        codeExample: `class Transaction {
    Connection* c_; bool committed_ = false;
public:
    explicit Transaction(Connection& c) : c_(&c) { c_->begin(); }

    // Explicit commit CAN throw: the caller wants to know.
    void commit() { c_->commit(); committed_ = true; }

    // Destructor must NOT throw: roll back quietly if commit never happened.
    ~Transaction() noexcept {
        if (!committed_) {
            try { c_->rollback(); }
            catch (...) { log_error("rollback failed during unwinding"); }
        }
    }
};

// Detecting unwinding, the basis of scope_fail / scope_success:
class OnFailure {
    int depth_ = std::uncaught_exceptions();
    std::function<void()> f_;
public:
    explicit OnFailure(std::function<void()> f) : f_(std::move(f)) {}
    ~OnFailure() noexcept {
        if (std::uncaught_exceptions() > depth_) {   // we ARE unwinding
            try { f_(); } catch (...) {}
        }
    }
};`
      }
    ],
    examples: [
      {
        title: "Lock released correctly on every path",
        input:
          "A function takes a mutex, performs three validation steps that each may throw, and returns early on two of them.",
        output: "With std::lock_guard the mutex is always released; with manual lock/unlock it deadlocks on the throwing path.",
        explanation:
          "Step 1: The manual version calls m.lock() and m.unlock(), and each early return or throw between them is a path where unlock is skipped.\nStep 2: A skipped unlock leaves the mutex held by a thread that has moved on, so the next acquirer blocks forever and the process appears hung.\nStep 3: std::lock_guard acquires in its constructor and releases in its destructor, so unwinding releases it exactly as a normal return does.\nStep 4: The guard also makes the critical section visible in the source, since its scope is the critical section, which is easier to review than matched call pairs.\nStep 5: Where the lock must be released early or transferred, std::unique_lock adds unlock, try_lock, and movability while keeping the same automatic-release guarantee."
      },
      {
        title: "Scope guard giving transactional rollback",
        input:
          "A transfer debits one account, credits another, and writes an audit record; the audit write throws on a full disk.",
        output: "Without a guard the money vanishes; with a guard the debit is reversed and the exception propagates cleanly.",
        explanation:
          "Step 1: The debit has already been applied when the audit write throws, so the in-memory state is inconsistent.\nStep 2: A scope guard constructed immediately after the debit holds a lambda that credits the same amount back.\nStep 3: Because the guard is an automatic object, unwinding runs its destructor and applies the compensating action without any catch block.\nStep 4: On the success path the code calls dismiss(), which clears the active flag so the destructor does nothing and the transfer commits.\nStep 5: This gives the strong exception guarantee for an operation that has no natural copy-and-swap formulation, and it keeps the undo logic adjacent to the action it undoes rather than in a distant catch."
      },
      {
        title: "A destructor that throws terminates the program",
        input:
          "A Logger destructor flushes to disk and lets a std::ios_base::failure escape while an exception is already propagating.",
        output: "std::terminate is called; the original exception is never handled and no other destructors run.",
        explanation:
          "Step 1: Destructors are implicitly noexcept since C++11, so any exception escaping one invokes std::terminate directly.\nStep 2: Even without that rule, the object is being destroyed during unwinding, so a second exception would be in flight simultaneously, which the language has no way to reconcile.\nStep 3: Termination happens without unwinding the remaining frames, so other RAII objects are not destroyed and buffered data elsewhere is lost.\nStep 4: The correct design provides an explicit flush() that can throw and is called by the user when they want to know about failures.\nStep 5: The destructor then attempts the flush inside a try block and logs or swallows any error, accepting silent failure as strictly better than terminating the process."
      }
    ],
    tips: [
      "Every resource should be owned by an object whose destructor releases it; if you can see an explicit release call in business logic, there is a missing wrapper.",
      "Make destructors noexcept and provide an explicit close or commit method for any release that can genuinely fail.",
      "Use a scope guard whenever the cleanup is an action rather than a resource - restoring state, unregistering, or compensating."
    ],
    tricks: [
      "std::exchange is the cleanest way to write a move constructor for a handle: fd_(std::exchange(o.fd_, -1)) transfers and nulls in one expression.",
      "std::uncaught_exceptions() lets a destructor distinguish normal scope exit from unwinding, which is how scope_fail and scope_success are built.",
      "Mark release() with [[nodiscard]] so that accidentally discarding a released handle - and therefore leaking it - is a compiler warning."
    ],
    memoryAids: [
      "Acquire in the constructor, release in the destructor, and the compiler covers every exit path you will ever write.",
      "Basic guarantee is free with RAII; the strong guarantee costs a copy and a noexcept swap.",
      "Destructors never throw; if release can fail, give the user an explicit method that does."
    ],
    interviewPatterns: [
      "'Why does C++ not need finally?' The expected answer is deterministic destruction plus RAII, with scope guards covering the non-resource cases.",
      "'Make this function exception-safe.' Watch for the candidate to reach for RAII and copy-and-swap rather than nested try/catch.",
      "Frequency and companies: essentially guaranteed in any C++ interview; deeper exception-safety follow-ups are standard at Bloomberg, Microsoft, and finance firms."
    ],
    practiceProblems: [
      "Why is std::lock_guard preferable to manual lock and unlock even in a function with a single return? Answer: because the single return is a property of today's code, and any future early return, break, or throwing call silently removes the unlock; the guard makes release a property of the type rather than of the control flow, and it also documents the critical section's extent.",
      "Implement a scope guard that only runs on failure. Answer: record std::uncaught_exceptions() in the constructor and compare it in the destructor - a larger value means an exception is propagating, so run the action; equal means the scope exited normally, so do nothing.",
      "What exception-safety guarantee does std::vector::push_back provide and why does it depend on the element type? Answer: it gives the strong guarantee when the element's move constructor is noexcept or the element is copyable, because reallocation must be abandonable; if moving can throw partway through relocation the original elements are already gone, so the implementation copies instead via move_if_noexcept."
    ],
    faq: [
      {
        question: "Why does C++ have no finally block, and is that a limitation?",
        answer:
          "It is a deliberate design position rather than an omission. Bjarne Stroustrup's argument is that finally forces the release logic to be repeated at every site that acquires the resource, whereas a destructor writes it once in the type and then applies automatically to every use, including uses in code the resource's author never saw. In a language with deterministic destruction of automatic objects, RAII is strictly more powerful: it composes, because a class containing several RAII members gets correct cleanup for free, and it cannot be forgotten, because there is no separate statement to omit. The one thing finally offers that a plain destructor does not is a cleanup action that is not naturally a resource - restoring a global, compensating a partial update - and scope guards fill that gap in a few lines, with std::experimental::scope_exit and the GSL's finally providing standardised versions. The practical evidence is that well-written modern C++ contains very few try blocks, mostly at subsystem boundaries where errors are actually handled, rather than the pervasive cleanup blocks typical of languages without deterministic destruction."
      },
      {
        question: "What exactly happens during stack unwinding?",
        answer:
          "When a throw expression executes, the runtime constructs the exception object in a special storage area, then walks the call stack looking for a handler whose type matches. As it passes each frame it consults the compiler-generated unwind tables to find which automatic objects in that frame have been fully constructed, and it calls their destructors in reverse order of construction before moving to the caller. This continues until a matching catch is found, at which point control transfers there, or until the stack is exhausted, at which point std::terminate is called. Two details matter in practice. First, unwinding only destroys automatic objects; anything owned by a raw pointer is leaked, which is the entire motivation for RAII. Second, if a destructor invoked during unwinding itself throws, there are two exceptions in flight and the standard mandates termination, which is why destructors are implicitly noexcept. The performance model is table-driven and zero-cost on the non-throwing path, meaning try blocks cost nothing to enter, while the throwing path costs microseconds because it involves table lookups and indirect destructor calls."
      },
      {
        question: "How do I write an RAII wrapper for a C API handle?",
        answer:
          "For most cases you do not need a bespoke class at all - std::unique_ptr with a custom deleter covers it. Using a stateless function-object deleter keeps the pointer the size of a raw handle, whereas a function pointer deleter adds eight bytes, so prefer a small struct with an operator() over decltype(&fclose). If the handle is not a pointer - a file descriptor, an OpenGL name, a Windows HANDLE - unique_ptr does not fit directly and a small dedicated class is cleaner: store the handle, initialise it to the API's invalid value, release in the destructor, delete the copy operations, and implement the move operations with std::exchange. Three details separate a good wrapper from a fragile one. The destructor must be noexcept and must check for the invalid value, since a moved-from object will hold it. There should be an explicit get() rather than an implicit conversion, so ownership cannot escape by accident. And any release that can report a real error deserves an explicit close() that throws, with the destructor swallowing errors only as a fallback."
      },
      {
        question: "Is the strong exception guarantee always worth providing?",
        answer:
          "No, and the standard library itself is selective about it. The strong guarantee means the operation either completes or leaves the object exactly as it was, which almost always requires doing the work on a copy and committing with a noexcept swap. That copy is a real cost, and for a large container it can double peak memory and halve throughput. The right question is whether any caller can actually do something useful with the guarantee - typically retrying the operation or reporting failure while continuing to use the object. For a configuration update or a transactional change, that is valuable. For a bulk data transformation where a failure means the whole request is abandoned anyway, the basic guarantee is sufficient and much cheaper. The standard library reflects this: vector::push_back offers the strong guarantee, but only because it can, and only when the element's move constructor is noexcept; vector::insert in the middle offers only the basic guarantee for the same reason. The pragmatic rule is to provide the basic guarantee universally, since RAII makes it nearly free, and to provide the strong guarantee deliberately where a documented caller need exists."
      },
      {
        question: "Does RAII apply to things that are not memory?",
        answer:
          "Memory is actually the least interesting application, because containers and smart pointers already handle it. The pattern's real reach is over everything with a paired acquire and release. Mutexes are the canonical example, wrapped by lock_guard, unique_lock, scoped_lock, and shared_lock. File descriptors, sockets, and pipes are wrapped by ifstream and by hand-written handle classes. Database transactions become objects that roll back unless committed. Graphics APIs are full of handles - textures, buffers, shader programs - that map perfectly onto RAII. Beyond resources, the pattern covers temporary state changes: raising and restoring a thread's priority, entering and leaving a profiling region, pushing and popping a logging context, disabling and re-enabling interrupts in embedded code, and setting and restoring stream formatting flags. In each case the value is the same - the release becomes structurally impossible to skip - and where the release is an action rather than an owned handle, a scope guard expresses it without inventing a type. A useful review heuristic is to look for any two calls that must always pair; that pairing is a wrapper waiting to be written."
      },
      {
        question: "What are the limits of RAII - when does it not save you?",
        answer:
          "Four situations. First, abnormal termination: std::abort, std::_Exit, a signal that kills the process, and std::terminate all bypass unwinding entirely, so destructors do not run. That is why durable state must be committed explicitly rather than relying on a destructor to flush it. Second, objects that are not automatic: a resource owned by a raw pointer, a static-duration object at exit if the process is killed, or an object leaked deliberately is never destroyed. Third, cycles and shared ownership: two objects that keep each other alive through shared_ptr have destructors that never run, which is a leak RAII cannot detect because ownership itself is malformed. Fourth, ordering across independent objects: RAII guarantees reverse construction order within a scope, but says nothing about the relative destruction order of namespace-scope objects in different translation units, so a destructor depending on another global may find it already gone. Recognising these boundaries is what distinguishes someone who has used RAII from someone who has debugged it, and each has a standard mitigation - explicit commit, ownership types, weak_ptr, and function-local statics respectively."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Bjarne Stroustrup - The C++ Programming Language, 4th ed., section 13.3 (Resource Management)",
        insight: "The original articulation of RAII and the rationale for preferring destructors over a finally construct."
      },
      {
        source: "book",
        attribution: "Herb Sutter - Exceptional C++, Items 8-19 on exception safety",
        insight: "Defines the basic, strong, and nothrow guarantees and shows copy-and-swap as the route to the strong one."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - E.6, R.1, R.5 (use RAII to prevent leaks) - https://isocpp.github.io/CppCoreGuidelines/",
        insight: "States the rules concisely and gives the scope-guard pattern for cleanup actions that are not owned resources."
      }
    ]
  },
  {
    id: "topic-cpp-raii-unique-ptr",
    moduleId: "mod-cpp-raii",
    title: "std::unique_ptr: Exclusive Ownership at Zero Cost",
    intuition:
      "unique_ptr is a raw pointer that knows how to delete itself and refuses to be copied. That refusal is the whole design: exclusive ownership is expressed in the type system, so the compiler rejects the code that would have caused a double free, and the destructor removes the code that would have caused a leak. With a stateless deleter it is exactly the size of a raw pointer and compiles to identical machine code, which is why 'zero-overhead abstraction' is not marketing here - there is genuinely nothing to pay for.",
    complexity: {
      time:
        "Construction, destruction, move, and dereference are all identical to the equivalent raw-pointer operations after optimisation; the destructor is a null check plus a delete, and the null check is usually eliminated when the compiler can prove the state. There is no reference count, no atomic, and no synchronisation, which is the main performance argument for preferring it over shared_ptr.",
      space:
        "sizeof(unique_ptr<T>) equals sizeof(T*) when the deleter is stateless, because the deleter is stored as an empty base or a [[no_unique_address]] member. A function-pointer deleter such as decltype(&std::fclose) doubles the size to two pointers, and a capturing lambda deleter adds the closure's size, which is a real and frequently overlooked cost."
    },
    lesson: [
      {
        title: "Exclusive Ownership, Enforced by the Type",
        content:
          "unique_ptr deletes its copy constructor and copy assignment, so there is no way to end up with two owners of one allocation; the only way to transfer ownership is std::move, which nulls the source. That makes every ownership transfer visible at the call site, which is exactly what reviewers want. Passing a unique_ptr by value in a function signature says 'this function takes ownership', returning one says 'the caller now owns this', and taking a raw pointer or reference says 'I am only borrowing'. The whole vocabulary of ownership becomes expressible in signatures rather than in comments.",
        codeExample: `auto p = std::make_unique<Widget>(1, 2);

// std::unique_ptr<Widget> q = p;          // ERROR: copy is deleted
auto q = std::move(p);                     // OK: p is now nullptr
assert(p == nullptr);

// Signatures document ownership:
void consume(std::unique_ptr<Widget> w);          // takes ownership
std::unique_ptr<Widget> produce();                // gives ownership
void observe(const Widget& w);                    // borrows, must exist
void maybe_observe(const Widget* w);              // borrows, may be null

consume(std::move(q));                            // transfer is EXPLICIT
// consume(q);                                    // ERROR: cannot copy

// Storing in containers works because unique_ptr is movable:
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>(1.0));
shapes.emplace_back(std::make_unique<Square>(2.0));`,
        diagram: asciiDiagram(`Ownership transfer is visible; copying is impossible

  auto p = make_unique<Widget>();

  ┌─────────────┐            heap
  │  p          │       ┌──────────────┐
  │  ptr ───────┼──────▶│   Widget     │
  └─────────────┘       └──────────────┘

  auto q = std::move(p);        ← the ONLY way to transfer

  ┌─────────────┐            heap
  │  p          │       ┌──────────────┐
  │  ptr = null │       │   Widget     │
  └─────────────┘       └──────▲───────┘
  ┌─────────────┐              │
  │  q          │              │
  │  ptr ───────┼──────────────┘
  └─────────────┘

  auto r = p;   ✘ COMPILE ERROR - copy constructor is deleted
                  the double-free bug is unrepresentable

  scope exit ──▶ ~unique_ptr ──▶ if (ptr) deleter(ptr)
                 every exit path, including unwinding`)
      },
      {
        title: "The Interface: get, release, reset, and Why It Matters",
        content:
          "get() returns the raw pointer without giving up ownership, and is the right way to pass the resource to a C API that will not free it. release() returns the raw pointer and gives up ownership, making you responsible for deletion, which is what you use when handing a resource to a C API that takes ownership. reset() destroys the current object and optionally adopts a new one, in that order, which matters because reset(get()) would be self-destruction. operator bool tests for non-null, and operator* and operator-> dereference without any check, so dereferencing a moved-from unique_ptr is undefined behaviour just as with a raw null pointer. Mixing these up is the most common unique_ptr bug: calling release() where get() was meant silently leaks.",
        codeExample: `auto p = std::make_unique<Widget>();

Widget* raw = p.get();          // borrow: p still owns it
legacy_read(raw);               // C API that does not free

Widget* owned = p.release();    // p is now null; YOU must delete owned
legacy_take_ownership(owned);   // C API that will free it

p.reset(new Widget);            // destroys the old (already null here), adopts new
p.reset();                      // destroys and becomes null

if (p) p->tick();               // operator bool then operator->

// Common bug: release() where get() was intended.
// legacy_read(p.release());    // LEAK: nobody deletes it

// Interop with an out-parameter C API:
Widget* out = nullptr;
if (legacy_create(&out) == 0) {
    std::unique_ptr<Widget> owner{out};   // adopt immediately
    use(*owner);
}                                          // freed on every path`
      },
      {
        title: "Custom Deleters and the Size Trap",
        content:
          "The deleter is a template parameter, so it is part of the type: unique_ptr<FILE, decltype(&fclose)> is a different type from unique_ptr<FILE, FileCloser>. The choice matters for size. A stateless function-object deleter is stored via the empty base optimisation and costs nothing, keeping the smart pointer at one pointer. A function pointer is state, so it must be stored, doubling the size. A capturing lambda stores its captures. Because the deleter type is baked into the type, unique_ptr with a custom deleter is not interchangeable with a plain unique_ptr in a signature, which is a real ergonomic cost and the main reason shared_ptr's type-erased deleter is sometimes preferred despite its overhead.",
        codeExample: `// GOOD: stateless functor, empty base optimisation, size == 1 pointer.
struct FileCloser {
    void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); }
};
using FilePtr = std::unique_ptr<std::FILE, FileCloser>;
static_assert(sizeof(FilePtr) == sizeof(std::FILE*));

FilePtr open(const char* path) { return FilePtr{std::fopen(path, "r")}; }

// WORSE: function pointer is state, size == 2 pointers.
using FilePtr2 = std::unique_ptr<std::FILE, decltype(&std::fclose)>;
static_assert(sizeof(FilePtr2) == 2 * sizeof(void*));

// The deleter is part of the TYPE:
void takes_plain(std::unique_ptr<std::FILE>);
// takes_plain(open("x"));       // ERROR: different type entirely

// Array form calls delete[]:
auto buf = std::make_unique<char[]>(4096);   // unique_ptr<char[]>
buf[0] = 'a';                                 // operator[] instead of operator*
// Prefer std::vector<char> unless you need a raw buffer with no size.`
      },
      {
        title: "unique_ptr in Class Design: Pimpl and Polymorphic Members",
        content:
          "Two idioms account for most unique_ptr members. The pimpl idiom hides a class's private data behind a forward-declared Impl held by unique_ptr, so the header no longer includes the implementation's dependencies and changing private members does not force recompilation of every consumer. The catch is that the destructor must be declared in the header and defined in the source file after Impl is complete, because unique_ptr's destructor requires a complete type - the notorious 'invalid application of sizeof to an incomplete type' error. The second idiom is a polymorphic member: holding unique_ptr<Strategy> lets a class own a behaviour chosen at runtime, and requires the base class to have a virtual destructor so that deleting through the base pointer runs the derived destructor.",
        codeExample: `// widget.h - no implementation headers needed here
class Widget {
public:
    Widget();
    ~Widget();                              // DECLARED here, defined in the .cpp
    Widget(Widget&&) noexcept;              // same requirement
    Widget& operator=(Widget&&) noexcept;
    void render() const;
private:
    struct Impl;                            // incomplete type
    std::unique_ptr<Impl> impl_;
};

// widget.cpp
#include "heavy_dependency.h"
struct Widget::Impl { HeavyThing thing; int cache; };
Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;                // Impl is COMPLETE here
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;

// Polymorphic member: base MUST have a virtual destructor.
struct Strategy { virtual ~Strategy() = default; virtual int apply(int) const = 0; };
class Engine {
    std::unique_ptr<Strategy> s_;
public:
    explicit Engine(std::unique_ptr<Strategy> s) : s_(std::move(s)) {}
    int run(int x) const { return s_->apply(x); }
};`,
        diagram: asciiDiagram(`Pimpl: why the destructor must move to the .cpp

  widget.h                              widget.cpp
  ┌────────────────────────────┐        ┌────────────────────────────┐
  │ struct Impl;   ← incomplete│        │ struct Widget::Impl {      │
  │ unique_ptr<Impl> impl_;    │        │     HeavyThing thing;      │
  │ ~Widget();     ← DECLARED  │        │ };            ← complete   │
  └────────────────────────────┘        │ Widget::~Widget() = default│
              │                         └────────────────────────────┘
              │ if ~Widget() were =default IN THE HEADER:
              ▼
  the compiler must instantiate ~unique_ptr<Impl> there
              │
              ▼
  ~unique_ptr calls  delete impl_  which needs  sizeof(Impl)
              │
              ▼
  ✘ "invalid application of sizeof to an incomplete type Widget::Impl"

  Fix: declare all five special members in the header, define them
  in the .cpp AFTER Impl is complete. This applies to the destructor,
  both move operations, and (if you want them) both copy operations.`)
      },
      {
        title: "Performance and When Not to Use It",
        content:
          "With a stateless deleter, unique_ptr generates the same code as a raw pointer: no reference count, no atomics, no allocation beyond the object itself. The only measurable difference from a raw pointer is that a unique_ptr parameter is passed on the stack rather than in a register under the Itanium ABI, because it is a non-trivially-destructible class type - a real but tiny cost that matters only in the hottest call sequences. The genuine question is not unique_ptr versus raw pointer but unique_ptr versus a value. If the object does not need to be polymorphic, does not need a stable address, and is not large, holding it by value avoids the allocation entirely and is faster in every dimension. Reach for unique_ptr when you need polymorphism, an optional or deferred object, a stable address across container growth, or interoperability with a C API.",
        codeExample: `// Unnecessary indirection: an allocation and a dereference for nothing.
class Bad { std::unique_ptr<Point> p_; };

// Better: no allocation, better locality, trivially copyable.
class Good { Point p_; };

// unique_ptr EARNS its place when:
class Renderer {
    std::unique_ptr<Backend> backend_;      // 1. polymorphic, chosen at runtime
    std::unique_ptr<Impl> impl_;            // 2. pimpl, breaks the include graph
};
std::vector<std::unique_ptr<Node>> nodes_;  // 3. stable addresses across growth
FilePtr handle_;                            // 4. C resource with a custom closer

// std::optional expresses "maybe present" WITHOUT an allocation:
std::optional<Config> cfg;                  // prefer this over unique_ptr<Config>
                                            // when the type is not polymorphic`
      }
    ],
    examples: [
      {
        title: "Factory returning a polymorphic object",
        input:
          "std::unique_ptr<Shape> make(ShapeKind k) returning make_unique<Circle>() or make_unique<Square>(), stored in a vector.",
        output: "Correct polymorphic ownership with no explicit delete anywhere, and no leak on any path.",
        explanation:
          "Step 1: Returning by value moves the unique_ptr out, and because the return is a prvalue no copy is attempted and no move is even required thanks to guaranteed copy elision.\nStep 2: The derived-to-base conversion works because unique_ptr<Derived> converts to unique_ptr<Base> when Derived* converts to Base*.\nStep 3: The vector stores the unique_ptrs by move, so ownership follows the object into the container with no ambiguity.\nStep 4: Destroying the vector destroys each unique_ptr, which calls delete on the Base pointer - correct only because Shape declares a virtual destructor.\nStep 5: Omitting that virtual destructor would make every destruction undefined behaviour, silently leaking derived members, which is why the base class of any unique_ptr-managed hierarchy must declare one."
      },
      {
        title: "The pimpl incomplete-type error",
        input:
          "A header declares std::unique_ptr<Impl> impl_; with struct Impl; forward-declared and no user-declared destructor.",
        output: "Compile error: invalid application of sizeof to an incomplete type Widget::Impl.",
        explanation:
          "Step 1: With no user-declared destructor the compiler generates ~Widget implicitly, inline, at the point of the class definition in the header.\nStep 2: That implicit destructor must destroy impl_, which instantiates unique_ptr's destructor, which calls the default_delete deleter.\nStep 3: default_delete performs delete on the pointer and static_asserts that the type is complete, because deleting an incomplete type would skip the destructor and is undefined behaviour.\nStep 4: At that point in the header Impl is only forward-declared, so the static assert fires and the build fails at every including translation unit.\nStep 5: Declaring ~Widget(); in the header and writing Widget::~Widget() = default; in the source file after Impl's definition moves the instantiation to a place where Impl is complete - and the same treatment is required for both move operations."
      },
      {
        title: "release used where get was intended",
        input: "auto cfg = std::make_unique<Config>(); legacy_apply(cfg.release()); where legacy_apply does not take ownership.",
        output: "A leaked Config on every call; LeakSanitizer reports it at exit.",
        explanation:
          "Step 1: release() returns the raw pointer and sets the unique_ptr to null, so the smart pointer no longer has any obligation to delete.\nStep 2: legacy_apply only reads the object and never frees it, so the allocation now has no owner at all.\nStep 3: Because the unique_ptr is null, its destructor does nothing, and the leak is completely silent at runtime.\nStep 4: The correct call is legacy_apply(cfg.get()), which lends the pointer while the unique_ptr retains ownership and still deletes at scope exit.\nStep 5: The mnemonic that prevents this is that get lends and release abdicates - use release only when something else is definitively taking over the deletion."
      }
    ],
    tips: [
      "Prefer std::make_unique over unique_ptr<T>(new T): it is exception-safe in argument lists and states the type once instead of twice.",
      "Use a stateless functor deleter rather than a function pointer so the smart pointer stays the size of a raw pointer.",
      "Any base class held by unique_ptr must declare a virtual destructor, or destruction through the base is undefined behaviour."
    ],
    tricks: [
      "For a C API with an out-parameter, adopt the raw pointer into a unique_ptr on the very next line so every later error path is covered.",
      "Declare all five special members in a pimpl header and define them in the source file; forgetting the move operations produces the same incomplete-type error as the destructor.",
      "unique_ptr<T[]> exists and calls delete[], but std::vector is almost always the better answer because it also carries the size."
    ],
    memoryAids: [
      "One owner, moved not copied - the double free is a compile error rather than a runtime crash.",
      "get lends, release abdicates, reset replaces.",
      "Custom deleter is part of the type for unique_ptr and erased for shared_ptr; that single difference explains most API choices between them."
    ],
    interviewPatterns: [
      "'How would you return a polymorphic object from a factory?' unique_ptr<Base> with a virtual destructor is the expected answer.",
      "'Explain the pimpl idiom and the destructor problem it causes.' A very common senior-level question because it tests instantiation timing, not just syntax.",
      "Frequency and companies: near-universal in modern C++ interviews; pimpl and deleter-size follow-ups appear at Bloomberg, Qt-adjacent teams, and library-heavy shops."
    ],
    practiceProblems: [
      "Why is sizeof(unique_ptr<FILE, decltype(&fclose)>) sixteen bytes while a functor deleter gives eight? Answer: a function pointer is stateful and must be stored alongside the managed pointer, whereas a stateless functor has no members and is stored as an empty base or a no_unique_address member, so the empty base optimisation removes it entirely.",
      "Can you put unique_ptr in a std::vector, and what changed in C++11 to allow it? Answer: yes, because containers require movable rather than copyable elements since C++11; the pre-C++11 auto_ptr had copy semantics that secretly transferred ownership, which broke container invariants and is why it was deprecated and removed.",
      "What happens if you delete a Derived through unique_ptr<Base> with a non-virtual base destructor? Answer: default_delete calls delete on a Base*, which invokes only ~Base, so Derived members are never destroyed and their resources leak, and the deallocation size may be wrong; the standard calls this undefined behaviour, and the fix is a virtual destructor on Base."
    ],
    faq: [
      {
        question: "Why prefer std::make_unique over unique_ptr<T>(new T)?",
        answer:
          "Three reasons, in decreasing order of importance. First, exception safety in argument lists: when two such expressions appear as arguments to one call, the compiler may evaluate both new expressions before wrapping either in a smart pointer, so a throw in between leaks one allocation. make_unique makes allocation and ownership a single indivisible step, closing that window. Second, it eliminates the duplicated type name - auto p = std::make_unique<Widget>(args) mentions Widget once, whereas the explicit form mentions it twice and lets them drift apart during refactoring, which can produce a unique_ptr<Base> constructed from a new Derived without a virtual destructor. Third, it is consistent with make_shared, which additionally offers a real performance benefit, so a codebase that uses both uniformly is easier to read. The cases where make_unique does not apply are when you need a custom deleter, since make_unique always uses default_delete, and when you are adopting a pointer produced by a C API, where the explicit constructor is exactly right."
      },
      {
        question: "How does unique_ptr achieve zero overhead compared with a raw pointer?",
        answer:
          "It stores exactly one pointer and, when the deleter is stateless, stores the deleter using the empty base optimisation or [[no_unique_address]] so it contributes no bytes - hence sizeof(unique_ptr<T>) equals sizeof(T*). Every operation is a thin inline wrapper: operator-> returns the stored pointer, the move constructor copies it and nulls the source, and the destructor is an if statement plus a delete. Because all of this is inline and the deleter's call is a direct call to a known function, the optimiser flattens it to precisely the instructions you would have written by hand, and in optimised builds the generated assembly for a unique_ptr-based function is typically identical to the raw-pointer version. The one honest caveat is calling convention: under the Itanium ABI a class with a non-trivial destructor must be passed on the stack rather than in a register, so a unique_ptr parameter is marginally more expensive to pass than a raw pointer. This is measurable only in extremely hot call paths, and the usual mitigation is to pass a raw pointer or reference when the callee is only borrowing, which is what you should be doing anyway."
      },
      {
        question: "When should I use unique_ptr rather than holding the object by value?",
        answer:
          "Holding by value should be the default, because it avoids an allocation, gives better locality, and keeps the type trivially copyable when the member is. unique_ptr earns its place in four situations. Polymorphism: you need to store a Base and dispatch to a Derived, which requires indirection. Optionality or deferred construction: the object may not exist yet, although std::optional is better when the type is not polymorphic, since it avoids the allocation. Stable addresses: pointers or references to the object must remain valid while a containing vector grows or elements are moved, which a value member cannot guarantee. And compilation firewalls: the pimpl idiom deliberately uses indirection so the header need not include the implementation's dependencies. A fifth practical case is very large objects that would otherwise blow the stack or make moves expensive, since moving a unique_ptr is a pointer copy regardless of the object's size. If none of these apply, an added unique_ptr is pure cost - an allocation, a cache miss on every access, and a loss of value semantics."
      },
      {
        question: "What is the array form and should I use it?",
        answer:
          "std::unique_ptr<T[]> is a partial specialisation that calls delete[] instead of delete, provides operator[] instead of operator* and operator->, and deliberately refuses the derived-to-base pointer conversion, because array-to-base conversion would break element indexing given the size difference. std::make_unique<T[]>(n) value-initialises n elements, and C++20 added make_unique_for_overwrite for the case where you want the elements left uninitialised because you are about to overwrite them - a genuine performance win on large buffers. Despite all that, it is rarely the right choice. It does not store the size, so you must carry that separately, and it offers no bounds checking, no iterators, no growth, and no interoperability with algorithms and range-based for. std::vector<T> provides all of those for the same single allocation and the same access cost, and std::array covers compile-time sizes. The remaining legitimate uses are interoperating with a C API that hands back an array, and implementing a container where you deliberately want raw storage without vector's semantics - and in the latter case you usually want raw bytes plus placement new rather than an array of constructed objects."
      },
      {
        question: "How do I pass a unique_ptr to a function correctly?",
        answer:
          "The signature should state the intent. If the function takes ownership, take std::unique_ptr<T> by value and require callers to write std::move at the call site, which makes the transfer visible during review. If the function only uses the object and the argument must exist, take const T& or T&, which also lets callers pass objects that are not heap-allocated at all - a considerable flexibility gain. If the object is optional, take const T* or T*, which documents that null is meaningful. If the function needs to replace what the caller owns, take std::unique_ptr<T>& and mutate it, though this is rare and usually a sign the design could be simpler. What you should not do is take const std::unique_ptr<T>&, which is almost always wrong: it forces the caller to have heap-allocated the object via a unique_ptr specifically, it conveys no ownership meaning, and it is strictly less useful than taking const T&. The overall rule from the Core Guidelines is that smart pointers appear in signatures only when ownership is part of the contract; otherwise the function should speak in terms of the object, not the owner."
      },
      {
        question: "Is unique_ptr thread-safe?",
        answer:
          "It provides exactly the same guarantees as any other standard library type, which is to say: concurrent reads of the same object are safe, and any concurrent access where at least one is a write is a data race unless you synchronise. Because unique_ptr is exclusively owned, this is rarely a problem in practice - the whole point is that only one place owns it - but two situations catch people out. First, a unique_ptr member of a shared object is shared state: if one thread calls reset while another dereferences, that is a race regardless of the smart pointer, and you need a mutex or a redesign. Second, unlike shared_ptr, unique_ptr has no atomic reference count, so there is no partial thread safety to rely on and no atomic operations to pay for - which is precisely why it is faster. If you need a pointer that multiple threads can rewrite, std::atomic<std::shared_ptr<T>> in C++20 or a mutex-protected unique_ptr are the options; there is no atomic unique_ptr because the ownership model does not admit one. The practical takeaway for interviews is that unique_ptr's lack of synchronisation is a feature, and that shared_ptr's thread-safe count protects the control block only, never the pointed-to object."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 18 and 21 (unique_ptr and make_unique)",
        insight: "Covers deleter size effects, the pimpl destructor requirement, and why make_unique is the default."
      },
      {
        source: "note",
        attribution: "cppreference - std::unique_ptr - https://en.cppreference.com/w/cpp/memory/unique_ptr",
        insight: "Complete interface including the array specialisation, deleter requirements, and conversion rules."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - R.20, R.21, R.30 (prefer unique_ptr; take smart pointers only to express ownership)",
        insight: "The parameter-passing rules that keep smart pointers out of signatures where a reference would do."
      }
    ]
  },
  {
    id: "topic-cpp-raii-shared-ptr-and-control-blocks",
    moduleId: "mod-cpp-raii",
    title: "std::shared_ptr and the Control Block",
    intuition:
      "shared_ptr is two pointers: one to the object and one to a control block holding a strong count, a weak count, and a type-erased deleter. Almost every shared_ptr question in an interview is really a question about the control block - why the handle is 16 bytes, why make_shared is faster, why constructing two shared_ptrs from one raw pointer double-frees, why the count is atomic but the object is not thread-safe, and why weak_ptr can outlive the object. Draw the control block and the answers fall out.",
    complexity: {
      time:
        "Copying a shared_ptr is an atomic increment and destroying one is an atomic decrement plus a branch, typically 10 to 30 nanoseconds and considerably worse under cross-core contention because the counter's cache line ping-pongs. Dereferencing is a plain load with no synchronisation. make_shared performs one allocation instead of two, roughly halving construction cost.",
      space:
        "sizeof(shared_ptr<T>) is two pointers, 16 bytes on a 64-bit platform, regardless of the deleter, because the deleter lives in the control block. The control block itself is typically 16 to 32 bytes and holds both counts, the deleter, and the allocator. make_shared fuses the object and the control block into a single allocation, which improves locality but keeps the object's storage alive until the last weak_ptr disappears."
    },
    lesson: [
      {
        title: "Anatomy of the Control Block",
        content:
          "A shared_ptr stores a pointer to the managed object and a pointer to a control block. The control block holds the strong reference count, which is the number of shared_ptrs owning the object, the weak count, which is the number of weak_ptrs plus one while any strong reference exists, and a type-erased deleter and allocator. When the strong count reaches zero the object is destroyed; when the weak count then reaches zero the control block itself is freed. That two-phase teardown is why a weak_ptr can safely ask whether the object is still alive after it has been destroyed - the control block outlives the object precisely so that question has somewhere to be answered.",
        codeExample: `#include <memory>

auto sp = std::make_shared<Widget>(1, 2);
assert(sp.use_count() == 1);

{
    auto sp2 = sp;                 // atomic increment
    assert(sp.use_count() == 2);
    std::weak_ptr<Widget> wp = sp; // weak count increments, strong unchanged
    assert(sp.use_count() == 2);
}                                  // sp2 destroyed: atomic decrement

assert(sp.use_count() == 1);
sp.reset();                        // strong hits 0 -> ~Widget runs
                                   // control block survives until the last weak_ptr

// The handle is always two pointers, whatever the deleter:
static_assert(sizeof(std::shared_ptr<Widget>) == 2 * sizeof(void*));
std::shared_ptr<std::FILE> f{std::fopen("x","r"),
                             [](std::FILE* p){ if (p) std::fclose(p); }};
static_assert(sizeof(f) == 2 * sizeof(void*));   // deleter lives in the block`,
        diagram: asciiDiagram(`shared_ptr, weak_ptr, and the control block

  shared_ptr<Widget> a          shared_ptr<Widget> b       weak_ptr<Widget> w
  ┌──────────────────┐          ┌──────────────────┐       ┌──────────────────┐
  │ obj  ────────────┼──┐       │ obj  ────────────┼──┐    │ obj  (unused)    │
  │ ctrl ────────────┼┐ │       │ ctrl ────────────┼┐ │    │ ctrl ───────────┼┐
  └──────────────────┘│ │       └──────────────────┘│ │    └─────────────────┘│
                      │ │                           │ │                       │
                      └─┼───────────────────────────┴─┼───────────────────────┘
                        │                             │
                        ▼                             ▼
        ┌───────────────────────────┐   ┌──────────────────────┐
        │      CONTROL BLOCK        │   │       Widget         │
        ├───────────────────────────┤   │  (the managed object)│
        │ strong count : 2          │   └──────────────────────┘
        │ weak count   : 1 (+1)     │              ▲
        │ deleter      : type-erased│──────────────┘  destroyed when
        │ allocator    : type-erased│                 strong hits 0
        └───────────────────────────┘
                    ▲
                    └── freed when weak hits 0, which is why a weak_ptr
                        can still ASK whether the object is alive

  Two-phase teardown:  strong → 0 : destroy the OBJECT
                       weak   → 0 : free the CONTROL BLOCK`)
      },
      {
        title: "make_shared: One Allocation, and Its One Drawback",
        content:
          "Constructing a shared_ptr from a raw pointer requires a separate allocation for the control block, so shared_ptr<T>(new T) allocates twice. make_shared allocates one block large enough for both the control block and the object, constructs the object inside it, and points both at that block. That halves allocator traffic, improves locality since the count sits next to the data, and closes the same unowned-window leak that make_unique closes. The drawback is that the object's storage cannot be released independently of the control block, so if a large object is observed by a long-lived weak_ptr, its bytes remain resident after destruction until the last weak_ptr goes away. make_shared also cannot be used with a custom deleter or with a non-public constructor without a helper.",
        codeExample: `// Two allocations: object, then control block.
std::shared_ptr<Widget> a{new Widget};

// One allocation: control block and object fused.
auto b = std::make_shared<Widget>();

// The retention caveat:
struct Huge { char data[64 * 1024 * 1024]; };
std::weak_ptr<Huge> observer;
{
    auto h = std::make_shared<Huge>();
    observer = h;
}   // ~Huge runs, but the 64 MB allocation is NOT returned to the allocator
    // until 'observer' is destroyed, because they share one block.
// With shared_ptr<Huge>(new Huge) the 64 MB is freed immediately and only
// the small control block is retained.

// make_shared cannot take a custom deleter - use the constructor:
auto file = std::shared_ptr<std::FILE>{
    std::fopen("data", "r"),
    [](std::FILE* p) { if (p) std::fclose(p); }};

// Private constructor: the usual workaround is a passkey or a factory.
class Session {
    struct Key {};
public:
    explicit Session(Key) {}
    static std::shared_ptr<Session> create() {
        return std::make_shared<Session>(Key{});
    }
};`
      },
      {
        title: "The Two-Control-Block Disaster",
        content:
          "Each time you construct a shared_ptr from a raw pointer, a new control block is created. Doing that twice with the same raw pointer produces two independent control blocks, each with its own strong count of one, so both will delete the object - a double free. This is the single most common shared_ptr bug, and it usually enters through a function that receives a raw this or a raw pointer and wraps it. The mechanism to avoid it is std::enable_shared_from_this: derive from it, and the first shared_ptr constructed from a raw pointer to your object stores a weak reference inside the base, so shared_from_this() can later hand out additional shared_ptrs sharing the original control block.",
        codeExample: `Widget* raw = new Widget;
std::shared_ptr<Widget> a{raw};
std::shared_ptr<Widget> b{raw};     // SECOND control block -> DOUBLE FREE
// a.use_count() == 1 and b.use_count() == 1: they know nothing of each other

// Correct: share the existing shared_ptr, never the raw pointer.
std::shared_ptr<Widget> c = a;      // same control block, count becomes 2

// The 'this' version of the same bug:
class Bad {
public:
    std::shared_ptr<Bad> self() { return std::shared_ptr<Bad>(this); }  // BOOM
};

// Fix: enable_shared_from_this
class Good : public std::enable_shared_from_this<Good> {
public:
    std::shared_ptr<Good> self() { return shared_from_this(); }
    void schedule(Executor& e) {
        e.post([self = shared_from_this()] { self->run(); });  // keeps it alive
    }
    void run();
};
// Precondition: the object MUST already be owned by a shared_ptr.
// Calling shared_from_this() on a stack object throws std::bad_weak_ptr.
auto g = std::make_shared<Good>();
auto s = g->self();                 // OK: same control block`,
        diagram: asciiDiagram(`One object, two control blocks: guaranteed double free

  Widget* raw = new Widget;
  shared_ptr<Widget> a{raw};
  shared_ptr<Widget> b{raw};        ← the mistake

  ┌──────────────┐                          ┌──────────────┐
  │      a       │                          │      b       │
  │ obj ─────────┼──┐                  ┌────┼───────  obj  │
  │ ctrl ───┐    │  │                  │    │    ┌──── ctrl│
  └─────────┼────┘  │                  │    └────┼─────────┘
            ▼       │                  │         ▼
  ┌──────────────┐  │                  │  ┌──────────────┐
  │ CONTROL BLK 1│  │                  │  │ CONTROL BLK 2│
  │ strong = 1   │  │                  │  │ strong = 1   │
  └──────────────┘  ▼                  ▼  └──────────────┘
                  ┌────────────────────────┐
                  │       Widget           │
                  └────────────────────────┘
                            ▲
              a dies → block 1 strong 0 → delete Widget
              b dies → block 2 strong 0 → delete Widget AGAIN
                            │
                            ▼
                  heap corruption / abort

  Rule: a raw pointer may be handed to shared_ptr EXACTLY ONCE.
  After that, always copy an existing shared_ptr, or use
  enable_shared_from_this to reach the original control block.`)
      },
      {
        title: "What Is and Is Not Thread-Safe",
        content:
          "The reference counts are atomic, so copying and destroying shared_ptrs that refer to the same object from different threads is safe, and the object will be destroyed exactly once. That is the entirety of the guarantee. The pointed-to object is not protected at all, so concurrent mutation of the Widget still needs a mutex. Nor is a single shared_ptr instance protected: if one thread reads a shared_ptr while another calls reset or assigns to that same shared_ptr object, that is a data race on the handle, requiring either a mutex, the deprecated std::atomic_load and atomic_store free functions, or C++20's std::atomic<std::shared_ptr<T>>. Distinguishing 'the control block is thread-safe' from 'the shared_ptr variable is thread-safe' is a standard senior-level discriminator.",
        codeExample: `std::shared_ptr<Config> g_cfg = std::make_shared<Config>();

// SAFE: two threads each copy from their own shared_ptr instance.
void reader(std::shared_ptr<Config> local) { use(*local); }

// RACE: concurrent read and write of the SAME shared_ptr object.
void bad_reload() { g_cfg = std::make_shared<Config>(); }   // writer
void bad_read()   { use(*g_cfg); }                          // reader -> race

// C++20 fix: an atomic shared_ptr.
std::atomic<std::shared_ptr<Config>> g_atomic{std::make_shared<Config>()};
void reload() { g_atomic.store(std::make_shared<Config>()); }
void read()   { auto snapshot = g_atomic.load(); use(*snapshot); }

// Pre-C++20 fix: the free functions (deprecated in C++20).
// auto snapshot = std::atomic_load(&g_cfg);

// The OBJECT is never protected by shared_ptr:
auto s = std::make_shared<std::vector<int>>();
// two threads calling s->push_back(1) concurrently is a data race`
      },
      {
        title: "Cost, Aliasing, and When to Choose It",
        content:
          "shared_ptr is the most expensive smart pointer: 16 bytes per handle, an extra allocation without make_shared, and an atomic read-modify-write on every copy and destruction that becomes a serious bottleneck when many threads copy the same pointer, because the counter's cache line bounces between cores. Prefer unique_ptr and pass raw pointers or references for observation; reach for shared_ptr only when ownership is genuinely shared and the last owner is not statically known - caches, observer graphs, and asynchronous callbacks that must keep a subject alive. One underused feature is the aliasing constructor, which lets a shared_ptr point at a subobject while sharing the parent's control block, so a shared_ptr to a member keeps the whole parent alive without a second allocation.",
        codeExample: `struct Frame { Header header; std::vector<std::byte> body; };

auto frame = std::make_shared<Frame>();

// Aliasing constructor: points at the header, owns the whole Frame.
std::shared_ptr<Header> header{frame, &frame->header};
frame.reset();                     // Frame is still alive: header owns it
use(*header);                      // valid
// header.use_count() reflects the shared Frame control block

// Cost comparison for a hot path:
//   raw pointer / reference : 0 overhead, no ownership
//   unique_ptr              : 0 overhead, exclusive ownership
//   shared_ptr copy         : atomic inc + atomic dec, contended cache line
//
// A common profiling finding is that passing shared_ptr BY VALUE through
// several layers costs more than the work being done. Pass by const& when
// the callee does not extend the lifetime, or pass the raw T& outright.
void process(const Widget& w);                 // best: no ownership implied
void keep(std::shared_ptr<Widget> w);          // only when it stores the pointer`
      }
    ],
    examples: [
      {
        title: "shared_from_this keeping an object alive across an async callback",
        input:
          "A Session posts a completion handler to an executor and may be released by the owner before the handler runs.",
        output: "With a captured shared_from_this the object survives; with a captured raw this it is a use-after-free.",
        explanation:
          "Step 1: The handler runs later on another thread, so the object must remain alive until it completes, independently of the owner's decisions.\nStep 2: Capturing this stores only an address, so if the owner resets its shared_ptr before the handler runs, the object is destroyed and the handler dereferences freed memory.\nStep 3: Capturing shared_from_this() copies a shared_ptr into the closure, incrementing the strong count, which extends the object's life to at least the handler's completion.\nStep 4: The precondition is that the object is already owned by a shared_ptr, because enable_shared_from_this only stores its weak reference when the first shared_ptr adopts the object; otherwise shared_from_this throws std::bad_weak_ptr.\nStep 5: This is why classes designed for asynchronous use expose a static create() returning a shared_ptr and keep their constructor inaccessible, so no one can create one on the stack."
      },
      {
        title: "make_shared retaining a large buffer",
        input:
          "auto big = std::make_shared<std::array<char, 64*1024*1024>>(); a weak_ptr observer is stored in a long-lived registry; big is reset.",
        output: "The array's destructor runs immediately, but 64 MB stays resident until the registry entry is removed.",
        explanation:
          "Step 1: make_shared fused the control block and the object into a single allocation, so their storage cannot be released separately.\nStep 2: When the strong count reaches zero, the object's destructor runs, but the allocation must survive because the control block inside it is still needed by the weak_ptr.\nStep 3: The weak_ptr correctly reports expired, so the program is functionally right; only the memory is retained.\nStep 4: RSS therefore shows 64 MB held by an object that no longer exists, which looks exactly like a leak in a profiler and is easy to misdiagnose.\nStep 5: Using std::shared_ptr<Big>(new Big) instead trades a second allocation for independent release, so the 64 MB is freed at destruction and only the small control block lingers - the one situation where the explicit constructor beats make_shared."
      },
      {
        title: "Passing shared_ptr by value through a call chain",
        input:
          "Five layers of functions each taking std::shared_ptr<Request> by value, handling 200,000 requests per second across 16 threads.",
        output: "Roughly 20 percent of CPU time in atomic increments and decrements; contention visible in perf c2c.",
        explanation:
          "Step 1: Each by-value parameter copies the shared_ptr, performing an atomic increment on entry and an atomic decrement on destruction.\nStep 2: Five layers therefore cost ten atomic read-modify-write operations per request, on a counter shared by every thread handling that request family.\nStep 3: Because the counter is one cache line and many cores touch it, each operation forces a coherence transfer rather than an L1 hit, multiplying the nominal cost.\nStep 4: None of the intermediate layers actually stores the pointer, so none of them needs ownership - they only need access to the Request.\nStep 5: Changing the intermediate signatures to const Request& removes all ten atomics, leaving ownership expressed exactly once at the layer that genuinely retains the object, which is the Core Guidelines rule for smart pointer parameters."
      }
    ],
    tips: [
      "Hand a raw pointer to shared_ptr exactly once; afterwards copy the existing shared_ptr or use shared_from_this to reach the same control block.",
      "Pass shared_ptr by value only to functions that store it; everything else should take const T& or T* so no atomic traffic is generated.",
      "Prefer make_shared for the single allocation, except when the object is large and long-lived weak_ptrs will retain its storage."
    ],
    tricks: [
      "The aliasing constructor lets you hand out a shared_ptr to a member that keeps the whole parent alive, with no extra allocation and no separate lifetime.",
      "use_count is a debugging aid only - it is approximate under concurrency and must never drive logic; use expired or lock on a weak_ptr instead.",
      "std::atomic<std::shared_ptr<T>> in C++20 replaces the deprecated atomic_load and atomic_store free functions for a concurrently replaced pointer."
    ],
    memoryAids: [
      "Two pointers in the handle, two counts in the block: strong destroys the object, weak frees the block.",
      "One raw pointer, one control block - a second wrap is a second owner and a guaranteed double free.",
      "The count is atomic; the object is not. shared_ptr protects the bookkeeping, never the data."
    ],
    interviewPatterns: [
      "'Draw what a shared_ptr looks like in memory.' The control block, the two counts, and the type-erased deleter are the expected content.",
      "'Is shared_ptr thread-safe?' The discriminating answer separates the atomic control block from the unprotected object and the unprotected handle.",
      "Frequency and companies: very common at Amazon, Bloomberg, Nvidia, and any team doing asynchronous C++; enable_shared_from_this appears in almost every networking interview."
    ],
    practiceProblems: [
      "Why is sizeof(shared_ptr) two pointers regardless of the deleter, while unique_ptr grows with a stateful deleter? Answer: shared_ptr type-erases the deleter into the control block, which is allocated separately, so the handle only needs the object and control pointers; unique_ptr stores the deleter inline to avoid any allocation, so a stateful deleter necessarily enlarges the object.",
      "What happens if you call shared_from_this in a constructor? Answer: it throws std::bad_weak_ptr, because enable_shared_from_this's internal weak reference is only initialised when the first shared_ptr takes ownership, which happens after the constructor completes; use a static factory that constructs the shared_ptr and then performs any post-construction registration.",
      "Two threads copy the same shared_ptr 10 million times each and throughput is far below expectation. Diagnose. Answer: the strong count is a single atomic on one cache line, so every increment from either core invalidates the other's copy, producing coherence ping-pong; pass by const reference where ownership is not needed, or give each thread its own shared_ptr copy so the counter is touched once rather than per access."
    ],
    faq: [
      {
        question: "Why does shared_ptr need a control block at all?",
        answer:
          "Because the information it holds cannot live in the handles. The strong count must be shared by every owner, so it needs a single location all of them point at; putting it in the object would require the object's type to cooperate, which would rule out managing types you do not control and types without a common base. The deleter must be type-erased so that shared_ptr<Base> can correctly destroy a Derived even without a virtual destructor - a real and underappreciated difference from unique_ptr - and erasing it requires storage the handle's type does not know the size of. The weak count must survive the object's destruction so a weak_ptr can ask whether the object still exists without touching freed memory, which forces the counts into an allocation with an independent lifetime. Once you see those three requirements, the design is forced: two pointers in the handle, and a separately allocated block holding both counts and the erased deleter and allocator. It also explains why make_shared can fuse the two allocations but cannot separate their lifetimes."
      },
      {
        question: "How does shared_ptr destroy a Derived through a Base with no virtual destructor?",
        answer:
          "Because the deleter is captured at construction time, when the static type is still known. When you write std::shared_ptr<Base> p{new Derived}, the constructor is a template on the argument type, so it records a deleter that performs delete on a Derived*, and stores it type-erased in the control block. At destruction the control block invokes that stored deleter, which runs ~Derived correctly regardless of what Base declares. This genuinely works, and it is a real capability difference from unique_ptr, whose default_delete is parameterised on the declared type and therefore calls delete on a Base*, which is undefined behaviour without a virtual destructor. That said, relying on it is fragile: it only holds when the shared_ptr was constructed directly from a Derived*, so any path that goes through a Base* - a factory that returns Base*, an intermediate variable typed Base* - loses the information and reinstates the undefined behaviour. The dependable engineering answer remains that any polymorphic base intended for dynamic allocation should declare a virtual destructor, and the shared_ptr behaviour is a useful safety net rather than a licence to omit it."
      },
      {
        question: "When is shared_ptr the wrong choice?",
        answer:
          "Whenever ownership is not genuinely shared, which is more often than codebases suggest. If exactly one place owns the object and everyone else merely uses it, unique_ptr plus raw pointers or references is faster, smaller, and clearer about who is responsible. Reaching for shared_ptr because the lifetime is unclear is a warning sign, not a solution - it converts a design question into diffuse ownership where no one can say when the object dies, which makes shutdown ordering and resource release unpredictable. The costs are concrete: 16-byte handles, an extra allocation without make_shared, an atomic pair on every copy that contends badly across cores, and the risk of cycles that leak silently. There is also a subtler cost in reasoning, since an object with several owners can be destroyed on any thread that happens to drop the last reference, so its destructor must be safe to run anywhere. Legitimate uses do exist and are important: caches whose entries may be in use while being evicted, observer graphs, asynchronous handlers that must keep a subject alive, and any structure where the last user genuinely cannot be determined statically."
      },
      {
        question: "What exactly does enable_shared_from_this do?",
        answer:
          "It gives a class a member weak_ptr that points at its own control block, so the object can produce additional shared_ptrs that share ownership rather than creating a rival control block. The wiring happens in shared_ptr's constructor: when a shared_ptr takes ownership of a raw pointer whose type derives from enable_shared_from_this, the constructor detects that base and initialises the stored weak reference. From then on shared_from_this() locks that weak reference and returns a shared_ptr on the original control block, and weak_from_this() in C++17 returns the weak_ptr directly. Two preconditions catch people out. The object must already be owned by a shared_ptr, so calling shared_from_this in a constructor or on a stack object throws std::bad_weak_ptr - in C++11 through C++14 it was undefined behaviour, so the exception is a relatively recent improvement. And the inheritance should be public and non-ambiguous, so a class hierarchy must derive from it exactly once. The idiomatic pattern is a class with a non-public constructor and a static create() that returns a make_shared result, which makes the precondition structurally impossible to violate."
      },
      {
        question: "How expensive is copying a shared_ptr really?",
        answer:
          "Uncontended, an increment and a decrement are each a locked read-modify-write costing roughly 10 to 20 cycles on modern x86, so a copy-and-destroy pair is a few tens of cycles - negligible next to almost any real work. The problem is contention. The counter is a single memory location, so when many cores copy shared_ptrs to the same object, its cache line must be transferred exclusively to each core in turn, turning a would-be L1 hit into a cross-core transaction of a hundred cycles or more, and the effect worsens superlinearly with core count. This is why passing shared_ptr by value through several layers of a hot request path can consume a surprising fraction of CPU, and why profiles of such systems often show the atomics rather than the business logic at the top. Two mitigations cover most cases. Take const references or raw references in functions that do not store the pointer, so the count is touched once per request rather than once per call. And where a hot loop needs the object repeatedly, hoist a single local shared_ptr copy outside the loop and use the raw reference inside it. Only if those are insufficient do intrusive reference counts or hazard pointers become worth their complexity."
      },
      {
        question: "What is the aliasing constructor for?",
        answer:
          "It builds a shared_ptr that points at one object while sharing ownership of a different one. The signature takes an existing shared_ptr, whose control block is adopted, plus a raw pointer, which becomes the stored value. The canonical use is handing out a pointer to a member or subobject that must keep its parent alive: given a shared_ptr<Frame>, you can produce a shared_ptr<Header> aimed at frame->header, and as long as that header pointer exists the whole Frame stays alive, with no second allocation and no separate lifetime to reason about. It is also how you expose an element of a shared container safely, and how you can hand out a pointer to a member of an object whose type you do not want to leak into an interface. Two cautions are worth knowing. The stored pointer is entirely unchecked, so nothing stops you aliasing to unrelated memory, and use_count reflects the parent's control block rather than anything about the aliased subobject. C++17 also added an aliasing constructor taking an rvalue shared_ptr, which moves rather than copies and so avoids the atomic increment - a small but free improvement when you are converting rather than duplicating."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 19 and 22 (shared_ptr and make_shared)",
        insight: "Control block creation rules, the two-control-block bug, and when make_shared's retention behaviour hurts."
      },
      {
        source: "note",
        attribution: "cppreference - std::shared_ptr and std::enable_shared_from_this - https://en.cppreference.com/w/cpp/memory/shared_ptr",
        insight: "Precise thread-safety guarantees, the aliasing constructor, and the shared_from_this preconditions."
      },
      {
        source: "video",
        attribution: "Nicolai Josuttis - The Nightmare of Move Semantics and Smart Pointer Pitfalls (CppCon)",
        insight: "Practical demonstrations of shared_ptr misuse, including parameter-passing costs and cycle leaks."
      }
    ]
  },
  {
    id: "topic-cpp-raii-weak-ptr-and-cycles",
    moduleId: "mod-cpp-raii",
    title: "weak_ptr, Reference Cycles, and Caches",
    intuition:
      "Reference counting cannot collect cycles. Two objects that hold shared_ptrs to each other keep each other's strong count at one forever, so neither destructor ever runs and the memory leaks silently with no invalid pointer to catch. weak_ptr is the escape hatch: a non-owning observer that participates in the control block but not in the strong count, and that can be atomically upgraded to a shared_ptr only if the object is still alive. Every parent-child graph, observer list, and cache in C++ is a weak_ptr question in disguise.",
    complexity: {
      time:
        "weak_ptr::lock is an atomic compare-exchange loop that increments the strong count only if it is currently non-zero, so it costs a little more than a shared_ptr copy but remains constant time and lock free. expired() is a single relaxed load of the strong count. Constructing and destroying a weak_ptr are atomic operations on the weak count.",
      space:
        "sizeof(weak_ptr<T>) is two pointers, the same 16 bytes as shared_ptr, since it stores the object pointer and the control block pointer. A live weak_ptr keeps the control block allocated after the object dies, which is 16 to 32 bytes, or the whole fused allocation if the object was created with make_shared."
    },
    lesson: [
      {
        title: "Why Reference Counting Leaks Cycles",
        content:
          "A strong count only reaches zero when every owner has released. In a cycle, each participant is an owner of the next, so releasing all external references leaves the internal ones holding the counts at one. Nothing external can now reach the cycle, and nothing internal will ever release, so the objects are unreachable but never destroyed. This is a true leak - destructors never run, so files stay open and sockets stay bound - and it is invisible to the usual tools because the memory is still referenced from live objects, so valgrind reports it as still reachable rather than definitely lost. Tracing garbage collectors do not have this problem because they ask reachability from roots instead of counting references; reference counting trades that for determinism, and cycles are the price.",
        diagram: asciiDiagram(`A two-node cycle that reference counting can never collect

  Step 1: both created and linked
  ┌───────────────────────┐              ┌───────────────────────┐
  │  Node A               │              │  Node B               │
  │  strong count : 2     │              │  strong count : 2     │
  │  next  ───────────────┼─────────────▶│                       │
  │                       │◀─────────────┼───────────────  prev  │
  └───────────────────────┘              └───────────────────────┘
            ▲                                       ▲
            │  external shared_ptr a                │  external shared_ptr b
            └───────────────────────┐   ┌───────────┘

  Step 2: main() returns, a and b are destroyed
  ┌───────────────────────┐              ┌───────────────────────┐
  │  Node A               │              │  Node B               │
  │  strong count : 1     │◀────────┐    │  strong count : 1     │
  │  next  ───────────────┼─────────┼───▶│                       │
  └───────────────────────┘         └────┼───────────────  prev  │
                                         └───────────────────────┘
     unreachable from anywhere, yet neither count reaches 0
     → destructors never run → memory, files, sockets all leak

  Step 3: the fix - make ONE direction weak
  ┌───────────────────────┐              ┌───────────────────────┐
  │  Node A               │   shared     │  Node B               │
  │  strong : 1 → 0       │─────────────▶│  strong : 1 → 0       │
  │                       │◀ ─ ─ ─ ─ ─ ─ ┼─ prev (weak_ptr)      │
  └───────────────────────┘   weak       └───────────────────────┘
     a released → A strong 0 → ~A → releases next → B strong 0 → ~B`)
      },
      {
        title: "weak_ptr: Observe Without Owning",
        content:
          "A weak_ptr stores the same two pointers as a shared_ptr but increments the weak count instead of the strong count, so it does not keep the object alive. Because it does not own, it cannot be dereferenced directly; you must call lock(), which returns a shared_ptr that is empty if the object has already been destroyed and otherwise holds a fresh strong reference. That upgrade is atomic - it increments the strong count only if it was non-zero - which is what makes weak_ptr usable across threads where the object may be destroyed concurrently. expired() answers the same question without producing a reference, but it is only a hint: between the check and any subsequent use the object may die, so lock() is the only correct way to actually use the object.",
        codeExample: `std::weak_ptr<Widget> wp;
{
    auto sp = std::make_shared<Widget>();
    wp = sp;                          // weak count up, strong unchanged
    assert(!wp.expired());
    assert(wp.use_count() == 1);      // reports the STRONG count

    if (auto locked = wp.lock()) {    // atomic upgrade
        locked->use();                // safe: strong count is now 2
    }
}                                     // sp gone -> ~Widget runs

assert(wp.expired());
auto locked = wp.lock();
assert(locked == nullptr);            // upgrade fails cleanly, no UB

// WRONG - a check-then-use race:
if (!wp.expired()) {
    wp.lock()->use();                 // another thread may destroy it here
}                                     // and lock() then returns null -> UB

// RIGHT - upgrade once, then use the result:
if (auto sp = wp.lock()) {
    sp->use();
}

// weak_ptr cannot be dereferenced:
// wp->use();     // does not compile - by design`
      },
      {
        title: "Breaking Cycles: Ownership Direction",
        content:
          "The cure for a cycle is to decide which direction expresses ownership and make the other direction weak. In a tree, the parent owns its children with shared_ptr and each child observes its parent with weak_ptr, so dropping the root destroys the whole tree. In an observer pattern, the subject holds weak_ptrs to observers so a dead observer simply fails to lock instead of being kept alive by its subject. In a doubly linked list, next is shared and prev is weak. The discipline is to ask 'who should die last?' - that participant is the owner. A cycle in a design is nearly always a sign that the question was never asked, and adding weak_ptr without answering it just moves the problem.",
        codeExample: `struct Node {
    std::string                        name;
    std::vector<std::shared_ptr<Node>> children;   // owns downward
    std::weak_ptr<Node>                parent;     // observes upward

    ~Node() { std::puts("~Node"); }                // now actually runs
};

auto root  = std::make_shared<Node>();
auto child = std::make_shared<Node>();
root->children.push_back(child);
child->parent = root;                  // weak: no cycle

if (auto p = child->parent.lock()) {   // safe upward navigation
    use(*p);
}
root.reset();                          // whole tree destroyed correctly

// Observer pattern with self-cleaning registration:
class Subject {
    std::vector<std::weak_ptr<Observer>> observers_;
public:
    void attach(std::shared_ptr<Observer> o) { observers_.push_back(o); }

    void notify(const Event& e) {
        std::erase_if(observers_, [](auto& w) { return w.expired(); });  // C++20
        for (auto& w : observers_) {
            if (auto o = w.lock()) o->on_event(e);   // skips dead observers
        }
    }
};
// No detach() needed: destroying an Observer is enough.`
      },
      {
        title: "The Caching Idiom",
        content:
          "A cache of weak_ptrs holds entries only while someone else is using them, which gives an eviction policy for free: the entry disappears as soon as the last real user releases it. The lookup is lock-then-rebuild - try to upgrade the stored weak_ptr, and if that fails, construct a new value and store a fresh weak_ptr. This is the standard shape for expensive shared immutable resources such as parsed shaders, decoded images, or database connections keyed by endpoint. Two refinements matter in practice: expired entries accumulate as null map slots and need periodic sweeping, and under concurrency the whole lock-or-create sequence must be guarded so two threads do not build the value twice, which is why production versions hold a mutex over the map rather than only over the insert.",
        codeExample: `class TextureCache {
    std::unordered_map<std::string, std::weak_ptr<Texture>> map_;
    std::mutex mutex_;
public:
    std::shared_ptr<Texture> get(const std::string& path) {
        std::lock_guard lock{mutex_};

        auto it = map_.find(path);
        if (it != map_.end()) {
            if (auto cached = it->second.lock()) return cached;  // still live
            map_.erase(it);                                      // expired slot
        }

        auto fresh = std::make_shared<Texture>(load_from_disk(path));
        map_.emplace(path, fresh);      // stores a weak_ptr
        return fresh;                   // caller holds the only strong ref
    }

    void sweep() {                      // reclaim dead slots periodically
        std::lock_guard lock{mutex_};
        std::erase_if(map_, [](const auto& kv) { return kv.second.expired(); });
    }
};
// While any caller holds the texture, everyone shares one copy.
// When the last caller releases it, the texture is freed and the slot expires.`,
        diagram: asciiDiagram(`weak_ptr cache: lookup, hit, miss, and self-eviction

  get("brick.png")
        │
        ▼
  ┌────────────────────────────┐
  │ find key in map            │
  └────────────┬───────────────┘
               │
       ┌───────┴────────┐
       │ found?         │
       ├── no ──────────┼──────────────────────┐
       │ yes            │                      │
       ▼                                       ▼
  ┌────────────────────────────┐   ┌────────────────────────────┐
  │ weak.lock()                │   │ load from disk             │
  └────────────┬───────────────┘   │ make_shared<Texture>       │
               │                   │ store weak_ptr in map      │
       ┌───────┴────────┐          └────────────┬───────────────┘
       │ non-null?      │                       │
       ├── no (expired) ┼───────────────────────┘   rebuild
       │ yes                                        and cache
       ▼
  ┌────────────────────────────┐
  │ return the cached shared   │   CACHE HIT: one Texture shared
  └────────────────────────────┘   by every current user

  Self-eviction:  last strong ref released
                          │
                          ▼
                  ~Texture runs, memory freed
                          │
                          ▼
                  map slot becomes expired, swept later`)
      },
      {
        title: "Costs, Diagnosis, and Limits",
        content:
          "A weak_ptr is not free. It keeps the control block alive after the object dies, and with make_shared that means the whole fused allocation, so a long-lived weak_ptr to a large make_shared object retains its bytes. lock() is more expensive than a shared_ptr copy because it is a compare-exchange loop rather than a plain increment, so calling it in a tight loop is a mistake - lock once outside the loop and use the resulting shared_ptr. Diagnosing an existing cycle is the harder skill: the symptom is a destructor that never prints, memory that grows without bound, and a leak checker that reports still reachable rather than lost. The practical technique is to add a logging destructor, confirm it never runs, then walk the ownership graph and find the loop.",
        codeExample: `// Diagnosis: a destructor that never fires
struct Tracked {
    ~Tracked() { std::printf("~Tracked %p\\n", (void*)this); }
};
// If the program ends with no output, the object is in a cycle.

// Cost: lock() in a loop is wasteful
for (int i = 0; i < 1'000'000; ++i) {
    if (auto sp = wp.lock()) sp->step();      // CAS loop every iteration
}
// Better: one upgrade, then plain use
if (auto sp = wp.lock()) {
    for (int i = 0; i < 1'000'000; ++i) sp->step();
}

// Retention: weak_ptr keeps the control block (and, with make_shared,
// the object's storage) alive.
std::weak_ptr<Huge> observer;
{
    auto h = std::make_shared<Huge>();        // 64 MB fused allocation
    observer = h;
}   // ~Huge ran, but 64 MB stays until 'observer' dies

// weak_ptr cannot break every cycle: a cycle through a
// std::function capturing shared_ptr is just as fatal.
struct Button {
    std::function<void()> on_click;
    std::shared_ptr<Model> model;
};
auto b = std::make_shared<Button>();
b->on_click = [b] { b->model->refresh(); };   // LEAK: closure owns the Button
b->on_click = [w = std::weak_ptr(b)] {        // fix: capture weakly
    if (auto s = w.lock()) s->model->refresh();
};`
      }
    ],
    examples: [
      {
        title: "A lambda capturing shared_ptr to its owner",
        input:
          "A Button stores a std::function callback, and the callback is assigned a lambda that captures a shared_ptr to the Button itself.",
        output: "The Button's destructor never runs; the leak survives every reset of the external handle.",
        explanation:
          "Step 1: The lambda's closure object stores a shared_ptr<Button>, and that closure is stored inside the Button's own std::function member.\nStep 2: The Button therefore owns a closure that owns the Button, which is a one-node cycle with a strong count that can never fall below one.\nStep 3: Releasing every external shared_ptr leaves the count at one, so ~Button never runs and the std::function is never destroyed, keeping the cycle intact.\nStep 4: This form is especially easy to miss because the cycle is not visible in the class's member declarations - it exists only in the value assigned to on_click at runtime.\nStep 5: Capturing std::weak_ptr(b) and locking inside the lambda breaks it, and as a bonus makes the callback a no-op after the Button dies rather than a use-after-free."
      },
      {
        title: "Observer list that cleans itself",
        input:
          "A Subject stores std::weak_ptr<Observer> entries; an observer is destroyed without ever calling detach.",
        output: "The next notify skips and removes the dead entry with no dangling pointer and no explicit deregistration.",
        explanation:
          "Step 1: Storing weak_ptrs means the Subject never keeps observers alive, so observer lifetime is decided entirely by their real owners.\nStep 2: When an observer is destroyed, its control block records the strong count reaching zero, and the Subject's stored weak_ptr becomes expired.\nStep 3: During notify, lock() on that entry returns an empty shared_ptr, so the loop simply skips it instead of dereferencing freed memory.\nStep 4: A sweep with erase_if on expired entries reclaims the slots, keeping the container from growing with tombstones.\nStep 5: Compare this with storing raw pointers, where forgetting detach in a destructor is a use-after-free, or storing shared_ptrs, where the Subject would keep every observer alive forever - weak_ptr is the only option with both safety and correct lifetime."
      },
      {
        title: "Cycle turning a bounded cache into unbounded growth",
        input:
          "A connection pool where each Connection holds a shared_ptr to its Pool and the Pool holds shared_ptrs to its Connections; the service runs for days.",
        output: "Memory grows monotonically; every Connection ever created is retained even after the pool is cleared.",
        explanation:
          "Step 1: Pool to Connection is genuine ownership, since the pool decides how many connections exist and when they retire.\nStep 2: Connection to Pool was added for convenience so a connection could reach pool-level configuration, and making it shared created a cycle per connection.\nStep 3: Clearing the pool's vector drops one reference each, but each Connection's own back-pointer keeps its Pool alive, and the Pool's other members keep further Connections alive.\nStep 4: Because the objects remain referenced from live memory, the leak checker reports them as still reachable, so the problem was invisible in CI and only appeared as slow RSS growth in production.\nStep 5: Changing the back-pointer to weak_ptr, or better to a plain Pool& since the pool provably outlives its connections, restores correct teardown and removes the atomic traffic of the extra count."
      }
    ],
    tips: [
      "Ask 'who should die last?' before choosing pointer types - the answer is the owner, everything pointing back at it should be weak or a plain reference.",
      "Never write if (!wp.expired()) followed by wp.lock()->use(); upgrade once with if (auto sp = wp.lock()) and use sp.",
      "Prefer a plain reference or raw pointer to weak_ptr when the observed object provably outlives the observer - weak_ptr costs 16 bytes and a CAS per use."
    ],
    tricks: [
      "A destructor that prints and never fires is the fastest cycle detector you have; leak checkers report cycles as still reachable, not as leaks.",
      "Capturing weak_ptr in a lambda gives a callback that becomes a safe no-op after its target dies, which is often better behaviour than keeping the target alive.",
      "weak_ptr::use_count reports the strong count, so it can be used to check whether you hold the only reference before mutating a shared immutable value."
    ],
    memoryAids: [
      "Strong means keep alive; weak means tell me if it is still alive. Cycles need exactly one weak link to break.",
      "Down is shared, up is weak: parents own children, children observe parents.",
      "expired is a hint, lock is the truth - only the atomic upgrade is safe to act on."
    ],
    interviewPatterns: [
      "'Two objects point at each other with shared_ptr. What happens?' They must name the leak, explain that destructors never run, and break it with weak_ptr in the non-owning direction.",
      "'Implement a cache that drops entries when nobody is using them.' The expected answer is a map of weak_ptrs with lock-or-rebuild lookup and periodic sweeping.",
      "Frequency and companies: appears in most senior C++ interviews at Bloomberg, Nvidia, Adobe, and games studios; the lambda-capture cycle is a favourite follow-up."
    ],
    practiceProblems: [
      "Why can weak_ptr not simply be dereferenced? Answer: between the moment you observe that the object is alive and the moment you use it, another thread can drop the last strong reference, so any direct access would be a race; requiring lock() forces the check and the reference acquisition to be one atomic step, and the returned shared_ptr guarantees the object stays alive for the duration of the use.",
      "You have a cycle but cannot change either class. What options remain? Answer: break the cycle from outside by clearing one of the links explicitly at teardown, introduce an intermediate owner that holds one side and is destroyed deterministically, or replace one link with a raw pointer or reference if the lifetime relationship is actually provable - all of these are worse than fixing the design, so treat them as migration steps.",
      "A weak_ptr keeps 500 MB resident after the object is destroyed. Explain and fix. Answer: the object was created with make_shared, fusing the object storage and control block into one allocation that cannot be freed while any weak_ptr exists; construct with shared_ptr<T>(new T) so the object's memory is released at destruction and only the small control block is retained, or shorten the weak_ptr's lifetime."
    ],
    faq: [
      {
        question: "Why does reference counting leak cycles when garbage collection does not?",
        answer:
          "The two schemes answer different questions. Reference counting asks 'how many owners does this object have?' and destroys when the answer reaches zero, which is a purely local decision made at the moment of a release and gives deterministic, immediate destruction. Tracing garbage collection asks 'is this object reachable from a root?' and collects everything that is not, which is a global decision made periodically. In a cycle the local question has a misleading answer: each participant genuinely does have an owner, so its count is legitimately non-zero, even though the whole group is unreachable from any root. Only the global question can see that. This is the fundamental trade of reference counting - determinism and no pauses in exchange for an inability to collect cycles - and it is why languages like Python bolt a cycle collector onto their reference counts, and why Rust's Rc has exactly the same problem as shared_ptr with exactly the same Weak fix. In C++ the language has decided that determinism is worth more, so cycle avoidance is a design responsibility rather than a runtime service."
      },
      {
        question: "What exactly happens inside weak_ptr::lock?",
        answer:
          "It performs a compare-exchange loop on the strong count that increments it only if it is currently non-zero. Concretely, it reads the strong count, and if the value is zero it returns an empty shared_ptr immediately; otherwise it attempts a compare-exchange from the observed value to that value plus one, retrying if another thread changed the count in between. The zero check and the increment therefore happen as one atomic step, which is what makes the operation safe against a concurrent last-release: it is impossible for lock to observe a non-zero count, have another thread drop it to zero and destroy the object, and then increment a count belonging to a dead object. The consequence is that lock is more expensive than copying a shared_ptr, which is a plain unconditional fetch-add, because a CAS loop can spin under contention. It also explains why expired() cannot be used as a guard for a subsequent use: it performs only the load, leaving a window between the check and the increment. The correct idiom is always to capture the result of lock and branch on it."
      },
      {
        question: "How do I decide which link in a cycle should be weak?",
        answer:
          "Choose based on lifetime, not on convenience or on which direction you happen to be navigating. Ask which object should still exist after the other has gone: that object's reference is the weak one, because it must not be kept alive by something that should die first. In a tree, dropping the root should destroy the whole subtree, so parents own children with shared_ptr and children observe parents with weak_ptr. In an observer relationship, destroying an observer should not require the subject's cooperation, so the subject holds weak references. In a connection pool, the pool decides when connections retire, so the pool owns and the connection looks back weakly. A useful cross-check is to imagine the destruction order you want in a debugger and confirm your pointer types produce it. If both directions seem equally to be ownership, the design usually has a missing third object that should own both - extracting that owner is a better fix than picking a direction arbitrarily. And if one side provably outlives the other, a plain reference or raw pointer is better still, since it is free, self-documenting, and cannot participate in a cycle at all."
      },
      {
        question: "Is the weak_ptr cache idiom safe under concurrency?",
        answer:
          "Only if the entire lookup-or-create sequence is guarded, which is the part people get wrong. The individual operations are safe: lock is atomic, and the control block's counts are thread-safe. But the composite operation - find the key, try to lock, and if that fails build a fresh value and insert it - is a check-then-act sequence with two race windows. Two threads can both fail to lock the same expired entry and both construct the value, wasting work and, worse, producing two distinct objects where callers assumed a single shared instance, which breaks any per-resource invariant such as a cached GPU handle or a connection identity. The unordered_map itself is also not thread-safe, so concurrent find and emplace is undefined behaviour independent of the smart pointers. The standard fix is a mutex held across the whole get(), which is usually acceptable because the expensive part is the load rather than the map access. If lookup contention genuinely matters, the usual refinements are sharding the map by hash bucket so threads rarely collide, or storing a shared_future of the value so a second thread waits on the first thread's construction instead of duplicating it."
      },
      {
        question: "Does weak_ptr have a memory cost worth worrying about?",
        answer:
          "Yes, in two specific ways. First, the handle is two pointers, the same 16 bytes as shared_ptr, so a container of a million weak observers costs 16 MB before any objects exist - if the observed objects provably outlive the observers, a raw pointer at 8 bytes and zero atomic traffic is strictly better. Second, and more surprising, a live weak_ptr keeps the control block allocated after the object has been destroyed, because the control block is where the 'is it still alive' answer lives. For a shared_ptr created with new that is only a few dozen bytes, but for one created with make_shared the control block and the object share a single allocation, so the object's entire storage is retained until the last weak_ptr disappears. A long-lived registry of weak_ptrs to large make_shared objects therefore shows exactly the profile of a leak - RSS held by objects that no longer exist - and the fix is either to construct those particular objects with the explicit constructor so their storage is released independently, or to sweep the registry so the weak_ptrs do not outlive their usefulness. Sweeping is worth doing anyway, since expired entries otherwise accumulate as tombstones in the container."
      },
      {
        question: "Can weak_ptr break every kind of cycle?",
        answer:
          "No, and assuming it can is a common trap. weak_ptr only helps where the cycle is expressed through shared_ptr members you control. Cycles through type-erased storage are just as fatal and much harder to see: a std::function stored in an object whose closure captures a shared_ptr to that same object is a one-node cycle that no member declaration reveals, and the same happens with coroutine frames, callbacks registered in an event loop, and shared_ptrs stashed inside std::any. In those cases the fix is the same in spirit - capture weakly and lock inside the callback - but you have to notice the cycle first, which typically means auditing every lambda that captures a shared_ptr and is stored rather than called immediately. There are also cycles weak_ptr cannot express away because the design genuinely needs mutual strong references, such as a bidirectional graph where any node may be the last survivor; those need a different ownership model, usually an arena or a separate owner object that holds all nodes strongly while the nodes reference each other with raw pointers or indices. Arena ownership is in fact the standard answer for general graphs, and reaching for it earlier than you think you need to saves a great deal of weak_ptr plumbing."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Item 20 (use weak_ptr for shared_ptr-like pointers that can dangle)",
        insight: "The caching and observer idioms, and why lock is the only safe way to use a weak_ptr."
      },
      {
        source: "note",
        attribution: "cppreference - std::weak_ptr - https://en.cppreference.com/w/cpp/memory/weak_ptr",
        insight: "Exact semantics of lock, expired, and use_count, plus the control block lifetime rules."
      },
      {
        source: "blog",
        attribution: "Herb Sutter - GotW and the Core Guidelines rules on ownership (R.20 through R.24)",
        insight: "Guidance on choosing owning versus non-owning pointer types and avoiding cycles by design."
      }
    ]
  },
  {
    id: "topic-cpp-raii-rule-of-zero-three-five",
    moduleId: "mod-cpp-raii",
    title: "Rule of Zero, Three, Five and Custom Deleters",
    intuition:
      "The compiler generates copy, move, and destruction for you, but the generation rules interact: declaring a destructor suppresses the move operations, declaring a move suppresses copy. The Rule of Zero says the best class manages no resource directly, so all six special members can be generated correctly and you write none. When you must manage a resource - the Rule of Three, extended to Five by move semantics - you write all of them consistently. Custom deleters are how you attach non-delete cleanup to a smart pointer so that Rule of Zero applies again.",
    complexity: {
      time:
        "Compiler-generated copy is memberwise copy, so its cost is the sum of the members' copies; generated move is memberwise move, which for pointer-holding members is a few register moves and is therefore constant time. Copy-and-swap assignment costs one full copy plus cheap swaps, trading a little performance for exception safety. A stateless custom deleter such as a capture-free lambda is inlined and costs nothing at run time.",
      space:
        "Rule-of-Zero classes add no storage beyond their members. A unique_ptr with a stateless deleter is one pointer thanks to empty base optimisation, while a stateful deleter such as a function pointer or a capturing lambda enlarges it to two pointers or more. shared_ptr always stores its deleter in the control block, so its handle stays at two pointers."
    },
    lesson: [
      {
        title: "The Six Special Members and Their Generation Rules",
        content:
          "Every class has six special members: default constructor, destructor, copy constructor, copy assignment, move constructor, and move assignment. The compiler generates them on demand, but the rules are asymmetric and easy to get wrong. Declaring any destructor, copy constructor, or copy assignment prevents the move operations from being generated at all, so the class silently falls back to copying where you expected moving - a common and invisible performance bug. Declaring any move operation deletes both copy operations. Declaring any constructor suppresses the default constructor. The practical consequence is that adding a logging destructor to a class holding a vector can quietly turn every move into a deep copy, which is why the guidance is to declare all five or none.",
        diagram: asciiDiagram(`Special member generation: what suppresses what

  You declare ...          Compiler still generates ...
  ┌──────────────────────┬───────────────────────────────────────────┐
  │ nothing              │ default ctor, dtor, copy ctor, copy asgn, │
  │                      │ move ctor, move asgn        ← Rule of 0   │
  ├──────────────────────┼───────────────────────────────────────────┤
  │ any constructor      │ everything EXCEPT the default ctor        │
  ├──────────────────────┼───────────────────────────────────────────┤
  │ a destructor         │ copy ctor, copy asgn  (deprecated)        │
  │                      │ ✗ move ctor, ✗ move asgn   ← the trap     │
  ├──────────────────────┼───────────────────────────────────────────┤
  │ a copy operation     │ the other copy op (deprecated), dtor      │
  │                      │ ✗ move ctor, ✗ move asgn                  │
  ├──────────────────────┼───────────────────────────────────────────┤
  │ a move operation     │ dtor only                                 │
  │                      │ ✗ copy ctor, ✗ copy asgn  (deleted)       │
  └──────────────────────┴───────────────────────────────────────────┘

  The silent-copy trap
  ────────────────────
  struct Log {
      std::vector<std::string> lines;   // 10 MB
      ~Log() { flush(); }               ← innocent-looking addition
  };
  Log a = make_log();
  Log b = std::move(a);                 ← NOT a move: deep copy of 10 MB
                                          because ~Log suppressed move ctor
  Fix: = default all five, or delete the destructor and use RAII members.`)
      },
      {
        title: "Rule of Zero: The Target State",
        content:
          "A class that owns no raw resource needs no special members. If every member is itself correctly copyable and movable - a vector, a string, a unique_ptr, another Rule-of-Zero class - then the compiler-generated memberwise operations are exactly right, and they stay right when you add a member later. This is the single most valuable rule in modern C++ resource management because it removes an entire category of bug rather than managing it. The way to reach it when you do hold a raw handle is to wrap that handle in a small dedicated RAII type, or in a unique_ptr with a custom deleter, and then let the enclosing class go back to Rule of Zero. Note that a class holding a unique_ptr member is automatically move-only, which is usually the correct default; if you need copying you must write it, and that is the moment to ask whether the type should be shared instead.",
        codeExample: `// Rule of Zero: correct copy, move, and destruction, zero code.
struct Report {
    std::string              title;
    std::vector<Row>         rows;
    std::unique_ptr<Cache>   cache;    // makes Report move-only
};
static_assert(std::is_move_constructible_v<Report>);
static_assert(!std::is_copy_constructible_v<Report>);   // because of unique_ptr

// A raw handle would break Rule of Zero, so wrap it once:
class FileHandle {                       // Rule of Five lives HERE, alone
    std::FILE* f_ = nullptr;
public:
    explicit FileHandle(const char* p) : f_{std::fopen(p, "rb")} {
        if (!f_) throw std::runtime_error{"open failed"};
    }
    ~FileHandle() { if (f_) std::fclose(f_); }

    FileHandle(FileHandle&& o) noexcept : f_{std::exchange(o.f_, nullptr)} {}
    FileHandle& operator=(FileHandle&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
        return *this;
    }
    FileHandle(const FileHandle&)            = delete;
    FileHandle& operator=(const FileHandle&) = delete;

    std::FILE* get() const noexcept { return f_; }
};

// And everything above it is Rule of Zero again:
struct Parser {
    FileHandle  input;
    std::string buffer;
};                                        // no special members needed`
      },
      {
        title: "Rule of Five When You Must Manage",
        content:
          "When a class genuinely owns a raw resource, all five must be written and must agree. The destructor releases; the copy constructor performs a deep copy; copy assignment must handle self-assignment and release the old resource without leaking; the move constructor steals and leaves the source in a valid, destructible state; move assignment does both. Two details separate correct implementations from plausible ones. Move operations must be marked noexcept, because std::vector will silently fall back to copying during reallocation if the element's move constructor is not noexcept - a large and invisible performance loss. And the moved-from object must be left valid, not merely empty, since its destructor will still run and code may still assign to it.",
        codeExample: `class Buffer {
    std::byte*  data_ = nullptr;
    std::size_t size_ = 0;
public:
    explicit Buffer(std::size_t n)
        : data_{n ? new std::byte[n] : nullptr}, size_{n} {}

    ~Buffer() { delete[] data_; }                          // 1: destructor

    Buffer(const Buffer& o)                                // 2: copy ctor
        : data_{o.size_ ? new std::byte[o.size_] : nullptr}, size_{o.size_} {
        std::copy_n(o.data_, size_, data_);
    }

    Buffer& operator=(const Buffer& o) {                   // 3: copy assign
        if (this == &o) return *this;                      // self-assignment
        auto* fresh = o.size_ ? new std::byte[o.size_] : nullptr;
        std::copy_n(o.data_, o.size_, fresh);              // copy BEFORE release
        delete[] data_;                                    // strong guarantee
        data_ = fresh; size_ = o.size_;
        return *this;
    }

    Buffer(Buffer&& o) noexcept                            // 4: move ctor
        : data_{std::exchange(o.data_, nullptr)},
          size_{std::exchange(o.size_, 0)} {}

    Buffer& operator=(Buffer&& o) noexcept {               // 5: move assign
        if (this == &o) return *this;
        delete[] data_;
        data_ = std::exchange(o.data_, nullptr);
        size_ = std::exchange(o.size_, 0);
        return *this;
    }
};
// noexcept matters: without it, vector<Buffer> reallocation COPIES.
static_assert(std::is_nothrow_move_constructible_v<Buffer>);`
      },
      {
        title: "Copy-and-Swap",
        content:
          "Copy-and-swap implements assignment by constructing a copy of the source and swapping it into place, letting the temporary's destructor release the old resource. It gives the strong exception guarantee for free, since the only operation that can throw is the copy, which happens before any modification of the target, and it handles self-assignment naturally without a check. Taking the parameter by value is the modern refinement: callers passing an lvalue get a copy, callers passing an rvalue get a move, so one function serves as both copy and move assignment. The trade-off is a small performance cost in copy assignment, because assigning into an object that already has sufficient capacity cannot reuse that capacity, which is exactly why std::string and std::vector do not use it internally.",
        codeExample: `class Buffer {
    std::byte*  data_ = nullptr;
    std::size_t size_ = 0;

    friend void swap(Buffer& a, Buffer& b) noexcept {
        using std::swap;
        swap(a.data_, b.data_);
        swap(a.size_, b.size_);
    }
public:
    // ... ctor, dtor, copy ctor, move ctor as before ...

    // ONE assignment operator serving both copy and move:
    Buffer& operator=(Buffer rhs) noexcept {   // by value: copy or move
        swap(*this, rhs);
        return *this;
    }                                          // rhs destructor frees the old data
};

Buffer a{1024}, b{2048};
a = b;              // b copied into rhs, then swapped -> strong guarantee
a = std::move(b);   // b moved into rhs, then swapped -> no allocation
a = a;              // self-assignment: copies, swaps, destroys the copy - safe

// Why containers avoid it:
//   v1 = v2;  with copy-and-swap always allocates,
//   even when v1 already has capacity >= v2.size().`
      },
      {
        title: "Custom Deleters",
        content:
          "A custom deleter lets a smart pointer manage a resource whose release is not delete, which restores Rule of Zero for C APIs, OS handles, and pooled objects. unique_ptr takes the deleter as a template parameter, so a stateless deleter costs nothing thanks to empty base optimisation, while a function pointer or capturing lambda adds storage. shared_ptr takes the deleter as a constructor argument and type-erases it into the control block, so its size never changes and the deleter type does not appear in the pointer's type - which is why shared_ptr<FILE> with a custom close is easy while unique_ptr needs the deleter spelled in the type. A common trap is that a null pointer is never passed to the deleter, so cleanup code that must always run belongs in a dedicated RAII type rather than a deleter.",
        codeExample: `// unique_ptr: deleter is part of the type.
struct FileCloser {
    void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); }
};
using FilePtr = std::unique_ptr<std::FILE, FileCloser>;
static_assert(sizeof(FilePtr) == sizeof(std::FILE*));   // EBO: still 8 bytes

FilePtr f{std::fopen("data.bin", "rb")};

// A function pointer deleter costs an extra pointer:
using RawFilePtr = std::unique_ptr<std::FILE, decltype(&std::fclose)>;
static_assert(sizeof(RawFilePtr) == 2 * sizeof(void*));

// shared_ptr: deleter is a runtime argument, type-erased into the block.
std::shared_ptr<std::FILE> sf{std::fopen("data.bin", "rb"),
                              [](std::FILE* p) { if (p) std::fclose(p); }};
static_assert(sizeof(sf) == 2 * sizeof(void*));

// Returning objects to a pool instead of deleting them:
auto from_pool(Pool& pool) {
    return std::unique_ptr<Conn, std::function<void(Conn*)>>{
        pool.acquire(),
        [&pool](Conn* c) { pool.release(c); }};
}

// C API resources become Rule-of-Zero members:
struct Decoder {
    std::unique_ptr<AVCodecContext, void(*)(AVCodecContext**)> ctx;
    std::unique_ptr<std::FILE, FileCloser>                     source;
};   // no destructor, no copy, no move written - all correct`,
        diagram: asciiDiagram(`Where the deleter lives, and what it costs

  unique_ptr<T, D> : deleter is part of the TYPE, stored inline
  ┌──────────────────────────────────────────────────────────────┐
  │ D = stateless functor (capture-free lambda / struct)          │
  │ ┌─────────────┐                                               │
  │ │ T* ptr      │  ← 8 bytes total, deleter is empty base       │
  │ └─────────────┘    call is inlined, zero overhead             │
  ├──────────────────────────────────────────────────────────────┤
  │ D = function pointer (decltype(&fclose))                      │
  │ ┌─────────────┬─────────────┐                                 │
  │ │ T* ptr      │ void(*)(T*) │  ← 16 bytes, indirect call      │
  │ └─────────────┴─────────────┘                                 │
  ├──────────────────────────────────────────────────────────────┤
  │ D = capturing lambda / std::function                          │
  │ ┌─────────────┬───────────────────────────┐                   │
  │ │ T* ptr      │ closure state (may be 32+)│  ← grows          │
  │ └─────────────┴───────────────────────────┘                   │
  └──────────────────────────────────────────────────────────────┘

  shared_ptr<T> : deleter is TYPE-ERASED into the control block
  ┌─────────────┬─────────────┐
  │ T* ptr      │ ctrl block ─┼──▶ ┌──────────────────────────┐
  └─────────────┴─────────────┘    │ strong / weak counts     │
        always 16 bytes,           │ deleter (any type)       │
        deleter absent from        │ allocator                │
        the pointer's TYPE         └──────────────────────────┘

  Consequence: shared_ptr<FILE> with a lambda closer needs no typedef,
  unique_ptr<FILE, D> must spell D in every signature that passes it.`)
      }
    ],
    examples: [
      {
        title: "A logging destructor turning moves into copies",
        input:
          "A struct holding a 10 MB vector gains a destructor that flushes a log; the surrounding code moves objects of that type into a container.",
        output: "Every move silently becomes a deep copy; throughput drops by an order of magnitude with no compiler warning.",
        explanation:
          "Step 1: Declaring a destructor suppresses generation of both move operations, which the standard specifies deliberately because a user destructor implies non-trivial ownership.\nStep 2: Overload resolution then selects the copy constructor for std::move(x), because binding an rvalue to a const lvalue reference is legal and the move overload does not exist.\nStep 3: The code still compiles and produces correct results, so nothing signals the regression except performance.\nStep 4: The vector amplifies it further: because the type is not nothrow-move-constructible, reallocation also copies rather than moves every element.\nStep 5: Adding = default for both move operations, or removing the destructor by making the log flush an RAII member, restores moves - and a static_assert on is_nothrow_move_constructible_v locks the fix in place."
      },
      {
        title: "Self-assignment destroying data in a naive copy assignment",
        input:
          "A copy assignment written as: delete[] data_; data_ = new T[o.size_]; copy from o; and then the caller writes a = a.",
        output: "The source data is freed before it is read, so the copy reads freed memory and the object is corrupted.",
        explanation:
          "Step 1: With self-assignment, this and &o are the same object, so deleting data_ also destroys o.data_.\nStep 2: The subsequent copy loop then reads through a dangling pointer, which is undefined behaviour and in practice yields garbage or a crash.\nStep 3: The common patch is an if (this == &o) return *this; guard, which fixes the bug but leaves the operator without the strong exception guarantee, since a throw from new occurs after the old data has been released.\nStep 4: Reordering to allocate and copy first, then delete the old buffer, fixes both problems at once and makes the self-assignment check a pure optimisation rather than a correctness requirement.\nStep 5: Copy-and-swap achieves the same result structurally, which is why it is the recommended default for hand-written resource classes."
      },
      {
        title: "unique_ptr with a stateful versus stateless deleter",
        input:
          "The same FILE* wrapped as unique_ptr<FILE, decltype(&fclose)> and as unique_ptr<FILE, FileCloser> with a capture-free functor.",
        output: "16 bytes with the function pointer, 8 bytes with the functor, and better inlining in the second case.",
        explanation:
          "Step 1: unique_ptr stores its deleter as a member, so a function pointer deleter genuinely occupies eight additional bytes.\nStep 2: A capture-free class type has no state, so unique_ptr's implementation uses empty base optimisation or [[no_unique_address]] to give it zero size, leaving the pointer at eight bytes.\nStep 3: The functor's operator() is also a known static target, so the compiler inlines the fclose call, whereas a function pointer stored at run time may prevent that.\nStep 4: The size difference matters in aggregate - a vector of a million such handles is 16 MB versus 8 MB - and in structures where the smart pointer is a hot member.\nStep 5: The general rule is to prefer a stateless functor or a capture-free lambda type for unique_ptr deleters, and to accept type erasure only with shared_ptr, where the deleter lives in the control block and never affects the handle's size."
      }
    ],
    tips: [
      "Declare all five special members or none; declaring only a destructor silently disables moves and turns them into copies.",
      "Always mark move operations noexcept, or std::vector will copy instead of move during reallocation.",
      "Wrap each raw resource in its own small RAII class so every class above it can remain Rule of Zero."
    ],
    tricks: [
      "std::exchange writes a move constructor's body in one expression and guarantees the source is left in a valid empty state.",
      "static_assert(std::is_nothrow_move_constructible_v<T>) is a cheap regression test that catches an accidentally suppressed or throwing move.",
      "A by-value assignment operator plus copy-and-swap gives you copy assignment, move assignment, self-assignment safety, and the strong guarantee in four lines."
    ],
    memoryAids: [
      "Zero is the goal, five is the price, three is history - if you write one of the five, write all of them.",
      "Destructor declared means moves deleted: the most expensive one-line change in C++.",
      "unique_ptr wears its deleter, shared_ptr hides it - which is why only shared_ptr's size never changes."
    ],
    interviewPatterns: [
      "'What does the compiler generate if I declare only a destructor?' The expected answer names the suppressed move operations and the silent fallback to copying.",
      "'Write a class that owns a raw buffer.' All five members, noexcept moves, self-assignment safety, and allocate-before-release ordering are being checked.",
      "Frequency and companies: near-universal in C++ interviews at Bloomberg, Jane Street, Nvidia, and Microsoft; copy-and-swap is a standard follow-up."
    ],
    practiceProblems: [
      "Why must a moved-from object be left valid rather than simply emptied? Answer: its destructor will still run when it goes out of scope, and the standard library permits assigning a new value to a moved-from object, so it must satisfy its class invariants; leaving a dangling pointer would double-free at destruction, which is why std::exchange to nullptr is the idiomatic move body.",
      "Explain why vector reallocation copies when the move constructor is not noexcept. Answer: reallocation must offer the strong exception guarantee, and if a move throws partway through, the already-moved elements cannot be restored because moving them back could throw again; copying leaves the original untouched so the operation can be abandoned safely, so vector uses move_if_noexcept and falls back to copy.",
      "When should a class have a public copy constructor but a deleted move constructor? Answer: essentially never - deleting move while leaving copy makes std::move silently select the deleted overload and fail to compile at surprising call sites; if a type must not be moved, express that by not declaring moves at all and relying on the copy, or make the type immovable by deleting both."
    ],
    faq: [
      {
        question: "Why does declaring a destructor suppress the move operations?",
        answer:
          "Because a user-provided destructor is evidence that the class manages something non-trivially, and a memberwise move would very likely be wrong for it. If a class holds a raw handle and closes it in its destructor, a compiler-generated move would copy the handle into the destination while leaving the source's copy intact, so both objects would close the same handle and the program would double-free. The committee chose to disable move generation in that case rather than to generate something plausibly wrong, and the same reasoning explains why declaring a copy operation also suppresses moves. The cost is the trap this creates for classes whose destructor does something harmless, such as logging or timing, where memberwise move would have been perfectly correct: those classes lose their moves silently, and since copying still compiles the only symptom is performance. The remedy is mechanical - if you declare a destructor and the memberwise move is correct, write both move operations as = default. Note also that copy generation in the presence of a user destructor is deprecated rather than removed, so relying on it is legal today but may warn, which is one more reason to be explicit about all five."
      },
      {
        question: "Why must move operations be noexcept?",
        answer:
          "Because the standard library inspects that property and changes its behaviour based on it. The clearest case is vector reallocation, which must provide the strong exception guarantee: if moving elements to the new buffer could throw partway through, the vector cannot restore the original state, since moving the already-transferred elements back could throw again and the source elements have already been modified. So vector uses std::move_if_noexcept, which moves only when the element's move constructor is declared noexcept and otherwise copies, because copying leaves the source intact and the failed operation can simply discard the new buffer. The consequence is that a type with a correct but non-noexcept move constructor gets deep-copied on every growth, which for a vector of vectors or a vector of strings can be an enormous and completely invisible cost. The same reasoning applies to several other library operations that must not fail after modifying state. Writing noexcept on a move that merely steals pointers is almost always accurate, since pointer assignment and std::exchange cannot throw, so there is rarely a reason to omit it. The exception is a move that allocates, such as one for a type with a non-propagating allocator, and that is precisely the case where the library's fallback to copying is the correct behaviour."
      },
      {
        question: "Is copy-and-swap always the right way to write assignment?",
        answer:
          "It is the right default for a hand-written resource-owning class, and the wrong choice for a container aiming at maximum performance. Its strengths are real: the copy happens before anything is modified, so a throw leaves the target untouched and you get the strong exception guarantee without effort; self-assignment works without a special case; and taking the parameter by value collapses copy assignment and move assignment into one function that does the right thing for both. Its weakness is that it always allocates, because it constructs a complete copy of the source rather than reusing whatever the target already holds. For a std::string assigned repeatedly in a loop, reusing an existing sufficiently large buffer avoids the allocator entirely, which is why the standard containers implement assignment directly with a capacity check and a copy into place. The practical rule is to use copy-and-swap unless assignment is on a hot path and profiling shows the allocation matters, in which case write a direct assignment that reuses capacity and takes on the burden of self-assignment safety and exception ordering yourself. Best of all is to avoid the question by reaching Rule of Zero, where the members' own assignment operators, which are already tuned, do the work."
      },
      {
        question: "When should I write a custom deleter instead of a small RAII class?",
        answer:
          "Use a custom deleter when the resource is a pointer-shaped handle and release is a single call, and write a dedicated RAII class when the resource is not pointer-shaped, needs more than release, or needs its own interface. A FILE*, an OpenSSL context, an ffmpeg codec context, or a pooled connection all fit the deleter model perfectly: unique_ptr already provides correct move semantics, null checking, release and reset, and a stateless deleter costs nothing, so you get the whole Rule of Five for free. The model breaks down in a few recognisable ways. A resource identified by an integer, such as a POSIX file descriptor or an OpenGL name, does not fit because unique_ptr insists on a pointer-like type - you can bend it with a custom pointer typedef, but a fifteen-line class is clearer. Cleanup that must run even when the handle is null does not fit either, since a null pointer is never passed to the deleter. And if the resource has a natural interface, such as a file wanting read and write methods, the class gives you somewhere to put them instead of scattering free functions around a unique_ptr. A good heuristic: if the only thing you would add to unique_ptr is the release call, use a deleter; if you would add anything else, write the class."
      },
      {
        question: "What exactly must a moved-from object satisfy?",
        answer:
          "The standard requires that a moved-from object of a library type is in a valid but unspecified state, and the same contract is the right one for your own types. Valid means all class invariants hold, the destructor will run correctly, and any operation with no precondition on the current value - assignment, clear, size, comparison - works. Unspecified means you may not assume which value it holds, so reading it without first assigning is a logic error even though it is not undefined behaviour. In practice this translates to a simple implementation rule: a move must leave the source in a state its own destructor can handle, which for pointer-owning types means null and for size-carrying types means zero, and std::exchange expresses both in one line. The distinction matters because moved-from objects are far more common than people expect - every vector reallocation, every sort, and every container insertion produces them - and code that leaves a dangling pointer behind will double-free at the next scope exit rather than at the move. It is also why you should never assume a moved-from std::string is empty: libstdc++ and libc++ usually leave it empty for heap-allocated buffers, but a short string using the small-buffer optimisation may keep its characters, and relying on either is a portability bug."
      },
      {
        question: "How do I refactor an existing Rule-of-Five class toward Rule of Zero?",
        answer:
          "Work member by member, replacing each raw resource with a type that already manages it, and delete special members as they become unnecessary. Start with the most common case: a raw owning pointer plus a size becomes a std::vector or a std::unique_ptr<T[]>, which immediately supplies correct copy or move semantics for that member. A raw pointer to a single object becomes unique_ptr, or shared_ptr if ownership is genuinely shared. A C handle becomes a unique_ptr with a custom deleter, or a small purpose-built RAII class if it is not pointer-shaped. After each replacement, remove the corresponding lines from the destructor and the copy and move operations, and once the destructor's body is empty, delete the destructor entirely - that is the step that re-enables compiler-generated moves, so it is worth confirming with a static_assert on is_nothrow_move_constructible_v. Two decisions come up along the way. If the class held a raw pointer that was copied shallowly, you must decide whether the new type should be copyable at all, and making it move-only with unique_ptr is usually the honest answer. And if the class had a copy constructor doing something other than a deep copy, such as resetting a cache or generating a new id, that logic has to survive the refactor, which is a case where a small amount of Rule of Five legitimately remains."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 17 and 25 (special member generation, moves and forwarding)",
        insight: "The exact generation rules, the destructor trap, and why noexcept moves matter to the library."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - C.20, C.21, C.66 (Rule of Zero, Rule of Five, noexcept moves)",
        insight: "Normative guidance on declaring all or none of the special members and on resource wrapping."
      },
      {
        source: "blog",
        attribution: "Howard Hinnant - Everything You Ever Wanted to Know About Move Semantics",
        insight: "Precise treatment of moved-from states, noexcept requirements, and copy-and-swap trade-offs."
      }
    ]
  }
];
