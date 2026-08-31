import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-processes-and-threads - "OS: Processes and Threads" (5 topics).
// Coverage: process vs thread and the isolation boundary, the process control
// block and address-space layout, context switching mechanics and cost, the
// process lifecycle state machine, and process creation via fork/exec/clone.
// This module is the vocabulary layer for the whole OS track: scheduling,
// synchronization, and memory management all reuse these objects.
//
// Authoring rules: every field explicit, 5+ FAQs with real answers, at least two
// box-drawing diagrams per topic via `asciiDiagram` from "./_shared".
export const osProcessesAndThreadsTopics: Topic[] = [
  {
    id: "topic-os-processes-vs-threads",
    moduleId: "mod-os-processes-and-threads",
    title: "Processes vs. Threads: The Isolation Boundary",
    intuition:
      "A process is a container for resources; a thread is a stream of execution inside that container. The single question that resolves almost every process-vs-thread interview follow-up is: what is shared and what is private? Everything the operating system isolates between processes - the address space, file descriptor table, and permissions - is shared freely between threads of one process. Everything that describes where a flow of control currently is - program counter, registers, and stack - stays private per thread. Once you can recite that split confidently, performance, safety, and crash-blast-radius answers all fall out of it mechanically.",
    complexity: {
      time:
        "Thread creation is typically one to two orders of magnitude cheaper than process creation because there is no address-space duplication or page-table construction: microseconds versus hundreds of microseconds to milliseconds. Switching between threads of the same process is also cheaper because the page table base register does not change and the TLB is not invalidated.",
      space:
        "A process costs a full page table hierarchy, a file descriptor table, signal handlers, and a kernel-side control block, so several tens of kilobytes minimum before any user memory. A thread costs a kernel task structure plus a stack, which defaults to 8 MB of virtual reservation on Linux but only commits pages that are actually touched."
    },
    lesson: [
      {
        title: "The Shared vs. Private Table Is the Whole Answer",
        content:
          "Threads inside one process share the code segment, the initialized and uninitialized data segments, the heap, memory-mapped regions, the file descriptor table, the current working directory, the user and group identity, and the signal handler dispositions. Each thread privately owns its stack, its register set including the program counter and stack pointer, its thread-local storage block, its signal mask, its scheduling priority, and its kernel-visible thread ID. Sharing the heap is what makes inter-thread communication a simple pointer dereference. Sharing the heap is also exactly what makes data races possible, so the same property that gives you speed is the property that gives you bugs.",
        diagram: asciiDiagram(`One process containing three threads

Process (one address space, one FD table)
   │
   ├── Shared by every thread
   │      ├── text / code segment
   │      ├── data + bss segments
   │      ├── heap (malloc arena)
   │      ├── memory-mapped files
   │      ├── file descriptor table
   │      └── uid / gid / cwd / signal handlers
   │
   └── Private per thread
          ├── Thread 1 ──▶ stack │ registers │ PC │ TLS │ signal mask
          ├── Thread 2 ──▶ stack │ registers │ PC │ TLS │ signal mask
          └── Thread 3 ──▶ stack │ registers │ PC │ TLS │ signal mask`)
      },
      {
        title: "Why Isolation Costs Money",
        content:
          "Process isolation is enforced by hardware. Each process gets its own page-table root, so a pointer value in process A means something entirely different in process B, and the memory management unit refuses any translation that is not present in the current process's tables. That guarantee is why a segmentation fault in one process cannot corrupt another, and it is also why crossing between processes requires the kernel to copy bytes or remap pages. Threads skip all of that because they run against the same page-table root, which is why a wild pointer write in one thread can silently corrupt another thread's data and why one thread calling abort takes down every sibling with it.",
        codeExample: `// Same variable, two very different meanings.

// Threads: shared heap, so this is a genuine race.
int counter = 0;                 // in .bss, shared by all threads
void *worker(void *arg) {
    for (int i = 0; i < 100000; i++) counter++;   // read-modify-write, not atomic
    return NULL;
}
// Two threads => final value is almost never 200000.

// Processes: fork() copies the address space, so each child
// increments its OWN private copy and the parent sees nothing.
int counter = 0;
if (fork() == 0) { counter++; _exit(0); }        // child's copy only
wait(NULL);
printf("%d\\n", counter);                         // always prints 0`
      },
      {
        title: "Choosing Between Them in a Design Answer",
        content:
          "Pick threads when the workload needs frequent, fine-grained sharing of large mutable state and the components trust each other: a database page cache, a game engine, a request handler pool over a shared connection pool. Pick processes when fault isolation, security boundaries, or independent restartability matter more than communication cost: a browser rendering untrusted web content, an nginx worker model, a plugin host executing third-party code. The decisive question is not 'which is faster' but 'what happens when one unit misbehaves'. If a crash or a memory-safety bug in one unit must not compromise the others, you are being asked for processes even if nobody used the word.",
        diagram: asciiDiagram(`Decision path used in system-design interviews

Do the units need to share large mutable state constantly?
        │
        ├── Yes ──▶ Can you trust every unit with the whole address space?
        │              │
        │              ├── Yes ──▶ Threads (shared heap, cheap handoff)
        │              │
        │              └── No  ──▶ Processes + shared memory for the hot data only
        │
        └── No  ──▶ Must a crash or exploit stay contained?
                       │
                       ├── Yes ──▶ Processes (browser / nginx worker model)
                       │
                       └── No  ──▶ Threads if simpler, processes if easier to deploy`)
      },
      {
        title: "The Middle Ground: Shared Memory and Clone Flags",
        content:
          "The process-thread distinction is a spectrum on Linux, not a binary. Both are created by the same clone system call, and the flags decide how much is shared. CLONE_VM shares the address space, CLONE_FILES shares the descriptor table, CLONE_FS shares the filesystem view, and CLONE_THREAD puts the new task in the same thread group. A classic 'thread' sets all of them; a classic 'fork' sets none. In between, you can create processes that share only a mapped region via shm_open plus mmap, which is exactly how Chrome, PostgreSQL, and most high-performance IPC layers get near-thread throughput while keeping separate page tables for everything else.",
        codeExample: `// One syscall, two familiar abstractions.

// pthread_create() ends up roughly here:
clone(CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND |
      CLONE_THREAD | CLONE_SETTLS, stack_top, ...);

// fork() ends up roughly here:
clone(SIGCHLD, 0, ...);          // nothing shared, copy-on-write address space

// Deliberate middle ground: separate processes, one shared arena.
int fd = shm_open("/ring", O_CREAT | O_RDWR, 0600);
ftruncate(fd, SIZE);
void *ring = mmap(NULL, SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
// After fork(), parent and child see the SAME physical pages here,
// but private page tables everywhere else.`
      },
      {
        title: "Where the Performance Difference Actually Comes From",
        content:
          "People say threads are faster, but the cost lives in three specific places. First, creation: fork must build a new page-table hierarchy and mark every writable page copy-on-write, while thread creation allocates a stack and a task struct. Second, switching: switching processes writes a new page-table base into CR3 on x86, which flushes non-global TLB entries and forces expensive page walks until the working set is re-cached, whereas a same-process thread switch keeps translations valid. Third, communication: threads pass a pointer, processes pass bytes through a pipe or socket with at least one kernel copy in each direction. Shared memory removes the third cost but never the first two.",
        diagram: asciiDiagram(`Cost breakdown, cheapest to most expensive

Same-thread function call        ~1 ns      no privilege change
        ▼
Thread switch, same process      ~1-5 us    registers + stack, TLB stays warm
        ▼
Process switch                   ~3-10 us   + CR3 write, TLB flush, cold cache
        ▼
Thread creation                  ~20-50 us  stack + task struct
        ▼
Process creation (fork+exec)     ~0.5-5 ms  page tables, COW setup, ELF load

Communication
   pointer handoff (threads)     ~0 copies
   shared memory (processes)     ~0 copies + explicit synchronization
   pipe / socket (processes)     1-2 kernel copies + 2 mode switches`)
      }
    ],
    examples: [
      {
        title: "Browser tab architecture",
        input:
          "A browser must render untrusted JavaScript from many sites while a bug in one page must not read another site's cookies.",
        output: "One process per site-instance, threads inside each renderer.",
        explanation:
          "Step 1: Untrusted code plus a security boundary immediately rules out a shared address space across sites.\nStep 2: Choose processes so the MMU, not the language runtime, enforces isolation.\nStep 3: Inside a single renderer the compositor, parser, and raster work all touch the same DOM and layout tree, so use threads there.\nStep 4: Accept the higher memory cost as the price of site isolation, and reduce it by capping the process count and reusing renderers per site."
      },
      {
        title: "Web server request handling",
        input:
          "A service handles 20k concurrent requests that all read from one in-memory cache and one database connection pool.",
        output: "A small pool of threads (or an event loop) inside one process.",
        explanation:
          "Step 1: All handlers need constant access to the same mutable cache and pool, which is fine-grained sharing.\nStep 2: Handlers are all our own trusted code, so a shared address space carries no security cost.\nStep 3: Threads let a handler grab a cached object by pointer instead of serializing it over IPC.\nStep 4: Size the pool near the core count for CPU-bound work, or use async I/O so blocking calls do not pin a thread each."
      },
      {
        title: "Nightly batch pipeline",
        input:
          "Eight independent report generators run overnight; each reads its own input files and writes its own output. One of them occasionally segfaults on malformed input.",
        output: "Eight separate processes supervised by a parent.",
        explanation:
          "Step 1: The units share almost nothing, so the communication advantage of threads is worth nothing here.\nStep 2: One generator crashing must not kill the other seven, which a shared address space cannot promise.\nStep 3: Separate processes give independent exit codes, independent memory limits, and independent restarts.\nStep 4: The supervisor reaps children with waitpid and retries only the failed report."
      }
    ],
    tips: [
      "Answer with the shared-vs-private table first; every other point in this topic is a consequence of it.",
      "Say 'blast radius' out loud: threads share a fate, processes fail independently.",
      "Never claim processes cannot share memory - say they do not share it by default, then mention shm_open plus mmap."
    ],
    tricks: [
      "Remember that only the calling thread survives exec and only the calling thread is duplicated by fork - that single fact explains most fork-in-threaded-program bugs.",
      "If asked 'threads or processes' with no other context, ask whether the code being run is trusted; that one question usually decides it.",
      "Quote the ratio rather than absolute numbers: thread creation is roughly 10-100x cheaper than fork plus exec, which survives hardware changes."
    ],
    memoryAids: [
      "Process = the house (address space, doors, utilities). Thread = a person walking around inside it.",
      "Threads share the heap and split the stack.",
      "Isolation is bought with page tables, and page tables are paid for in TLB misses."
    ],
    interviewPatterns: [
      "Warm-up question in nearly every OS screen: 'What is the difference between a process and a thread?' - answer with the shared/private split, not a definition.",
      "Follow-up trap: 'Then why does anything still use processes?' - answer fault isolation, security boundaries, and independent restart.",
      "Frequency and companies: Tier 1 at Amazon, Microsoft, and Google phone screens; also appears as the framing for browser and web-server design questions."
    ],
    practiceProblems: [
      "Two threads increment a shared int one million times each with no lock. What values are possible and why? Answer: Anything from just over one million up to two million. The increment is a load, add, and store, so one thread can read a stale value and overwrite the other's update; the interleavings that lose updates are far more likely than the perfectly serialized one.",
      "A thread in a multithreaded process calls fork(). The child then tries to lock a mutex held by another thread at fork time. What happens? Answer: The child deadlocks. Only the calling thread exists in the child, but the mutex was copied in its locked state and the holder does not exist to unlock it - which is why the child of a fork in a threaded program should only call async-signal-safe functions before exec.",
      "Your service uses 200 processes at 300 MB resident each and you must cut memory without losing crash isolation between customers. Answer: Group by trust boundary rather than by request. Keep one process per customer tenant for isolation, use threads inside each tenant, and move genuinely read-only shared data (models, static tables) into a MAP_SHARED mapping so it is backed by one set of physical pages."
    ],
    faq: [
      {
        question: "If threads share the heap, do they also share the stack?",
        answer:
          "No. Every thread gets its own stack, which is where its local variables, return addresses, and saved registers live. That is precisely why two threads can execute the same function at the same time without stomping on each other's locals. But the stacks are only private by convention, not by hardware: they live in the same address space, so if one thread passes the address of a local variable to another thread, the second thread can read and write it perfectly well. That is a legitimate technique for short-lived worker handoffs and a notorious source of use-after-return bugs when the owning frame exits first. Contrast that with processes, where passing a stack address to another process is meaningless because the same numeric address maps to a completely different physical page."
      },
      {
        question: "Are threads always faster than processes?",
        answer:
          "No, and saying so is a common way to lose an interview. Threads are cheaper to create and to switch between, and they communicate by pointer instead of by copy, so for fine-grained sharing they win clearly. But for CPU-bound work with little sharing, a process does essentially the same amount of work per unit of computation as a thread, so the difference disappears once startup is amortized. Threads can even be slower when shared mutable state forces lock contention or false sharing, where two threads write to different variables that happen to sit in the same cache line and ping-pong that line between cores. In some languages the answer flips completely - CPython's global interpreter lock means CPU-bound Python scales with processes and not with threads."
      },
      {
        question: "What are user-level threads versus kernel-level threads?",
        answer:
          "Kernel-level threads are scheduled by the operating system, so each one is a schedulable entity the kernel knows about and can place on any core. User-level threads, sometimes called green threads, coroutines, or fibers, are multiplexed by a runtime library on top of one or more kernel threads, and the kernel never sees them. User-level threads are far cheaper - creation is a heap allocation and a switch is a register save - and they can scale to millions, which is how Go goroutines and Erlang processes work. The classic weakness is that a blocking system call in one user-level thread blocks the whole kernel thread underneath it, which is why modern runtimes use an M:N model: many user threads mapped onto a smaller pool of kernel threads, with the runtime intercepting blocking calls and parking the user thread instead."
      },
      {
        question: "Why can one thread crash the entire process?",
        answer:
          "Because a fatal fault is delivered to the process, not to the thread. When a thread dereferences an invalid pointer, the MMU raises a page fault the kernel cannot resolve, and the kernel sends SIGSEGV. The default disposition of SIGSEGV terminates the whole process along with every thread in it, because there is no way to prove that the corruption was confined to one thread's data - they all share the same heap and the same page tables. The same is true for abort, an uncaught C++ exception reaching the top of a thread, or a failed assertion. This is the core practical reason to reach for processes when a component is untrusted or merely unreliable: the kernel can guarantee containment, and no amount of careful coding inside one address space can."
      },
      {
        question: "How do processes communicate if they do not share memory?",
        answer:
          "Through explicit inter-process communication mechanisms that the kernel mediates. Pipes and FIFOs give a byte stream with the kernel buffering data between writer and reader. Unix domain sockets add message boundaries, bidirectional flow, and the ability to pass file descriptors between processes. Message queues offer prioritized discrete messages. Signals carry a tiny asynchronous notification with no payload beyond the signal number. And shared memory via shm_open plus mmap, or via mmap with MAP_SHARED on a file, actually does give processes a common region - the kernel maps the same physical pages into both page tables, so after setup there is no per-message kernel involvement at all. Shared memory is the fastest option and also the only one that requires you to bring your own synchronization, usually a process-shared mutex or an atomic ring buffer."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapters 4 and 26 - https://pages.cs.wisc.edu/~remzi/OSTEP/",
        insight: "Builds the process abstraction first and then introduces threads as 'a process with multiple points of execution', which is the cleanest framing of the shared/private split."
      },
      {
        source: "book",
        attribution: "Kerrisk - The Linux Programming Interface, chapters 24 and 29",
        insight: "Enumerates exactly which attributes are shared and which are per-thread on Linux, including the ones people forget such as signal masks and the filesystem view."
      },
      {
        source: "blog",
        attribution: "Chromium design docs - Multi-process Architecture - https://www.chromium.org/developers/design-documents/multi-process-architecture/",
        insight: "Real production justification for paying the memory cost of processes to obtain hardware-enforced isolation for untrusted code."
      }
    ]
  },
  {
    id: "topic-os-process-control-block",
    moduleId: "mod-os-processes-and-threads",
    title: "The Process Control Block and Address-Space Layout",
    intuition:
      "A process is not a thing the CPU understands; the CPU only understands instructions and registers. A process is a bookkeeping fiction maintained by the kernel, and the process control block is where that fiction is written down. Everything the kernel must remember to pause a process now and resume it correctly later lives in the PCB: saved registers, the page-table root, open files, the parent link, accounting counters, and pending signals. Its mirror image in user space is the address-space layout, which is how the process's own memory is organized. Interviewers ask about both because together they explain why a stack overflow, a memory leak, and a file-descriptor leak are three completely different bugs.",
    complexity: {
      time:
        "Looking up a PCB by PID is a hash-table or radix-tree lookup, effectively constant time. Saving and restoring PCB state during a context switch is a fixed cost dominated by register moves plus, for a cross-process switch, the page-table base write - a few microseconds in total, independent of how much memory the process uses.",
      space:
        "The Linux task_struct is roughly 4-10 KB depending on configuration, plus a kernel stack per task (8 or 16 KB), plus the page-table hierarchy which starts around 12-16 KB for a minimal 64-bit process and grows with the number of distinct mapped regions rather than with total virtual size."
    },
    lesson: [
      {
        title: "What the Kernel Must Remember",
        content:
          "The PCB - task_struct on Linux, EPROCESS on Windows - is the kernel's complete record of one schedulable entity. It holds identification (PID, TGID, parent and child pointers, real and effective UID/GID), CPU state (saved general-purpose registers, program counter, stack pointer, and processor flags, saved into the kernel stack or a thread_struct on switch), memory state (a pointer to an mm_struct that owns the page-table root and the list of virtual memory areas), I/O state (the file descriptor table, current working directory, and root directory), scheduling state (policy, priority, nice value, virtual runtime, CPU affinity mask), signal state (pending set, blocked mask, handler dispositions), and accounting (user and system CPU time, page-fault counts, start time). If you can name those seven buckets you have answered the question completely.",
        diagram: asciiDiagram(`Anatomy of a process control block

task_struct (PCB)
   │
   ├── Identity
   │      ├── pid, tgid, ppid
   │      └── uid / gid / euid / egid
   │
   ├── CPU state (saved on switch out)
   │      ├── general-purpose registers
   │      ├── program counter, stack pointer, flags
   │      └── FPU / SIMD state (often lazily saved)
   │
   ├── Memory ──▶ mm_struct
   │                 ├── pgd  (page-table root, loaded into CR3)
   │                 └── list of VMAs: text, data, heap, mmaps, stack
   │
   ├── I/O ──▶ files_struct
   │              └── fd table: 0 ▶ stdin, 1 ▶ stdout, 2 ▶ stderr, 3 ▶ ...
   │
   ├── Scheduling: policy, prio, vruntime, cpus_allowed
   ├── Signals: pending, blocked, handler table
   └── Accounting: utime, stime, min_flt, maj_flt, start_time`)
      },
      {
        title: "The Virtual Address-Space Layout",
        content:
          "From the process's own point of view memory is a flat range of virtual addresses divided into regions with different permissions and growth behaviour. At the low end sits the text segment, which is read-only and executable so that self-modifying code faults and so that many processes running the same binary can share one physical copy. Above it come the initialized data segment and the bss, which holds zero-initialized globals and costs nothing on disk. Above that the heap grows upward through brk or, for larger allocations, through anonymous mmap. The memory-mapping region in the middle holds shared libraries, file mappings, and large mallocs. At the top the stack grows downward, one region per thread. The gap between heap and stack is what makes both able to grow without a fixed partition, and modern kernels randomize the base of each region under ASLR so that exploit payloads cannot rely on fixed addresses.",
        diagram: asciiDiagram(`Virtual address space of one 64-bit process (high to low)

  0xFFFF... ┌──────────────────────────┐
            │  kernel space            │  not accessible in user mode
  0x7FFF... ├──────────────────────────┤
            │  stack   (thread 1)      │  grows ▼ downward
            │            │             │
            │            ▼             │
            ├──────────────────────────┤
            │  ...unmapped gap...      │  a fault here = SIGSEGV
            ├──────────────────────────┤
            │  mmap region             │  shared libs, big mallocs, files
            │            ▲             │
            ├──────────────────────────┤
            │            ▲             │
            │  heap                    │  grows ▲ upward (brk / mmap)
            ├──────────────────────────┤
            │  bss   (zero-init data)  │  rw-, no disk cost
            ├──────────────────────────┤
            │  data  (init globals)    │  rw-
            ├──────────────────────────┤
            │  text  (code)            │  r-x, shareable between processes
  0x400000  └──────────────────────────┘
  0x000000     null page: deliberately unmapped so *NULL faults`)
      },
      {
        title: "How the PCB Is Used During a Switch",
        content:
          "When the scheduler decides to preempt a running task, the kernel is already executing on that task's kernel stack because entry happened through an interrupt or a system call. It saves the user register set into the task's saved-state area, updates accounting fields, and moves the task to a run queue or wait queue. It then picks the next task, restores its saved registers, and - if the next task belongs to a different process - writes the new page-table root into the hardware register (CR3 on x86-64, TTBR0 on ARM64). The final step returns to user mode with the restored program counter, so the incoming task resumes at the exact instruction it was interrupted on. Nothing about this is magic: the PCB is simply the durable copy of everything the registers were holding.",
        codeExample: `// Simplified sketch of what the kernel does. Real code is
// __schedule() -> context_switch() -> switch_mm() + switch_to().

void context_switch(struct task_struct *prev, struct task_struct *next) {
    // 1. Memory: only swap page tables if the address space differs.
    if (prev->mm != next->mm)
        switch_mm(prev->mm, next->mm);   // writes CR3, may flush TLB

    // 2. CPU: save prev's callee-saved regs + SP, restore next's.
    switch_to(prev, next);               // after this line we are 'next'

    // 3. Accounting is updated on both sides of the switch.
}

// Observable proof that the PCB exists, from user space:
//   /proc/<pid>/status   -> identity, signal masks, memory summary
//   /proc/<pid>/maps     -> the VMA list (address-space layout)
//   /proc/<pid>/fd/      -> the file descriptor table
//   /proc/<pid>/stat     -> scheduling + accounting fields`
      },
      {
        title: "Thread Group Leaders, PIDs, and TIDs",
        content:
          "Linux does not have a separate thread object. Every thread is a task_struct with its own thread ID, and threads of one process are grouped by sharing a thread group ID, which equals the PID of the first thread. What getpid() returns is the TGID, which is why every thread of a process reports the same PID even though gettid() gives each one a distinct number. Shared state is shared by pointer: all tasks in a thread group point at the same mm_struct, the same files_struct, and the same signal handler table, with reference counts protecting them. That single design choice is why the fork/thread distinction collapses into clone flags - a fork allocates fresh copies of those structures, while a thread creation simply bumps their reference counts.",
        codeExample: `#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <sys/syscall.h>

void *show(void *_) {
    printf("getpid()=%d  gettid()=%ld\\n",
           getpid(), (long)syscall(SYS_gettid));
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, show, NULL);
    pthread_create(&t2, NULL, show, NULL);
    show(NULL);
    pthread_join(t1, NULL); pthread_join(t2, NULL);
}

/* Output shape:
   getpid()=4211  gettid()=4211    <- leader: tid == tgid
   getpid()=4211  gettid()=4212
   getpid()=4211  gettid()=4213
   Same PID (== TGID), three distinct task_structs. */`
      },
      {
        title: "Why Layout Knowledge Debugs Real Bugs",
        content:
          "Each failure mode maps to a specific region. A stack overflow from unbounded recursion walks the stack VMA down into the guard page and raises SIGSEGV, and the giveaway in a core dump is a stack pointer just below the mapped stack range. A heap overflow corrupts allocator metadata and typically crashes later, inside free or malloc rather than at the faulty write, which is why address sanitizers exist. Writing through a null or freed pointer faults on the deliberately unmapped null page or on a region whose contents have been recycled. A file-descriptor leak never touches memory at all but exhausts the fd table and surfaces as EMFILE. Being able to say which structure is being exhausted turns a vague 'the process died' into a targeted investigation.",
        diagram: asciiDiagram(`Symptom ──▶ which structure is broken

SIGSEGV near the stack VMA
      └──▶ stack region: deep recursion, huge alloca, small thread stack

Crash inside malloc/free, far from the real bug
      └──▶ heap region: buffer overflow smashed allocator metadata

SIGSEGV at address 0x0 or 0x8
      └──▶ null page: dereferenced NULL or an offset from NULL

"Too many open files" (EMFILE), memory looks fine
      └──▶ files_struct: descriptors opened and never closed

RSS climbs forever, no crash
      └──▶ heap / mmap VMAs: genuine leak or unbounded cache

"Cannot allocate memory" with plenty of free RAM
      └──▶ VMA count limit (max_map_count) or an rlimit in the PCB`)
      }
    ],
    examples: [
      {
        title: "Reading a real address space",
        input: "cat /proc/self/maps on a small C program",
        output: "One line per VMA showing range, permissions, and backing file.",
        explanation:
          "Step 1: The first r-xp line backed by the binary is the text segment.\nStep 2: The rw-p line right after it is data plus bss.\nStep 3: The region labelled [heap] is what brk currently covers.\nStep 4: The libc lines in the middle are shared-library mappings, and [stack] sits near the top - reading this file is the fastest way to prove the layout diagram is real rather than a textbook drawing."
      },
      {
        title: "Diagnosing an EMFILE storm",
        input:
          "A long-running service starts failing every accept() with 'Too many open files' after several days of uptime.",
        output: "A file-descriptor leak in the PCB's files_struct, not a memory problem.",
        explanation:
          "Step 1: Note that memory use is flat, so the heap is not the culprit.\nStep 2: Count entries with ls /proc/<pid>/fd | wc -l and compare against the RLIMIT_NOFILE soft limit.\nStep 3: Inspect the symlink targets to identify which resource type is accumulating - sockets, log files, or inotify handles.\nStep 4: Fix the missing close on the error path; raising the limit only delays the failure."
      },
      {
        title: "Why the same binary run twice uses less memory than expected",
        input: "Two copies of a 200 MB binary are running, but total RSS is far below 400 MB.",
        output: "Text and read-only data pages are shared physical pages.",
        explanation:
          "Step 1: Each process has its own page tables, so the virtual sizes really do add up.\nStep 2: But both page tables point at the same physical frames for the read-only, executable text segment.\nStep 3: Writable data is copy-on-write, so identical untouched pages are also shared until first write.\nStep 4: This is why RSS overcounts and why PSS - proportional set size - is the metric to quote for per-process memory attribution."
      }
    ],
    tips: [
      "Answer 'what is in a PCB' with the seven buckets: identity, CPU state, memory, I/O, scheduling, signals, accounting.",
      "Always mention that text is read-only and shareable - it explains why running many copies of a binary is cheap.",
      "Point at /proc/<pid>/maps and /proc/<pid>/fd as the observable proof; concrete evidence reads as real experience."
    ],
    tricks: [
      "The null page is unmapped on purpose - that is why dereferencing NULL faults deterministically instead of corrupting data.",
      "Heap and stack grow toward each other so neither needs a fixed size chosen at load time.",
      "If someone says a process 'uses' 8 MB per thread, correct it: that is reserved virtual address space, and only touched pages are committed."
    ],
    memoryAids: [
      "PCB = the kernel's passport for a process: who it is, where it lives, what it owns, and where it was going.",
      "Bottom to top: Text, Data, BSS, Heap, mmap, Stack - 'The Dog Barks, Hens Migrate South'.",
      "Virtual size is a promise; resident size is a payment."
    ],
    interviewPatterns: [
      "Direct recall: 'What does the OS store in a process control block?' - enumerate buckets rather than listing random fields.",
      "Applied variant: 'Draw the memory layout of a running C program and say where a local, a global, and a malloc'd buffer live.'",
      "Frequency and companies: Tier 1 in systems-heavy screens at Microsoft, Nvidia, Qualcomm, and any embedded or infrastructure role."
    ],
    practiceProblems: [
      "In which segment does each of these live: a string literal, a global initialized to 5, a global initialized to 0, a local int, and a malloc(1<<20) buffer? Answer: read-only data (often inside text), data, bss, the caller's stack, and - because it exceeds the mmap threshold - a fresh anonymous mmap region rather than the brk heap.",
      "A process shows 12 GB virtual size but only 300 MB resident. Is that a leak? Answer: Not necessarily. Large reservations such as thread stacks, a big MAP_NORESERVE arena, or memory-mapped files inflate virtual size without committing physical pages. Judge leaks by RSS or PSS growth over time, not by VSZ.",
      "Why does the kernel need a separate kernel stack per task rather than reusing the user stack? Answer: Because the user stack may be invalid, unmapped, or attacker-controlled at the moment of trap entry, and because the kernel must be able to run even when the fault was caused by the user stack itself. A dedicated per-task kernel stack in the PCB makes trap handling safe and lets the task block inside the kernel with its kernel-side call frames intact."
    ],
    faq: [
      {
        question: "Is there one PCB per process or one per thread?",
        answer:
          "On Linux there is one task_struct per thread, and 'the process' is simply a group of task_structs sharing a thread group ID and pointing at the same mm_struct, files_struct, and signal handler table. That design is why the scheduler is uniformly a thread scheduler: it never has to distinguish processes from threads at dispatch time. Other systems make a stronger split - Windows has an EPROCESS for the process and an ETHREAD per thread, with the address space and handle table hanging off the process object. Either way the substance is identical: per-thread execution state is stored separately from per-process resource state, and the only question is whether they live in one struct with reference-counted sub-objects or in two explicit object types."
      },
      {
        question: "Where exactly are registers saved during a context switch?",
        answer:
          "In two places, depending on how the switch was entered. When a trap, interrupt, or system call takes the CPU from user mode to kernel mode, the hardware and the entry stub push the user-visible register set onto that task's kernel stack, forming a pt_regs frame. If the kernel then decides to switch tasks, the low-level switch_to routine saves the remaining callee-saved registers and the kernel stack pointer into the outgoing task's thread_struct, then loads the incoming task's equivalents. Resuming is the same steps in reverse: restore the kernel stack pointer, return through the entry path, and pop pt_regs back into the user registers. Floating-point and vector state is usually handled lazily - the kernel marks it unavailable and only saves and restores it if the new task actually executes an FPU instruction, because that state is large and many tasks never touch it."
      },
      {
        question: "Why is the heap not just one contiguous growing region any more?",
        answer:
          "Because a single brk-based heap cannot return memory to the operating system unless the freed block happens to sit at the very top, and because it serializes badly across threads. Modern allocators therefore use brk only for small allocations and switch to anonymous mmap above a threshold - 128 KB by default in glibc - so that large blocks can be unmapped individually the moment they are freed. Thread-aware allocators go further and give each thread its own arena, which is a separate mmap region, so concurrent mallocs rarely contend on the same lock. The practical consequence is that /proc/<pid>/maps on a busy multithreaded service shows many anonymous regions rather than one big [heap], and that freeing memory does not always reduce RSS because the allocator may legitimately keep small freed blocks for reuse."
      },
      {
        question: "What is ASLR and how does it affect this layout?",
        answer:
          "Address space layout randomization moves the base of the stack, the heap, the mmap region, and - for position-independent executables - the text segment itself to a randomly chosen offset at each execution. The relative structure of the diagram is unchanged; only the absolute addresses shift. The security purpose is to break exploits that need to know a fixed address, such as a return-to-libc payload that jumps to the address of system(). With randomization the attacker must first leak an address, which raises the bar substantially. The practical side effects are that pointer values differ between runs, making bug reports harder to compare, and that debugging often involves disabling it with setarch -R or letting the debugger disable it automatically so that breakpoints and addresses stay reproducible across runs."
      },
      {
        question: "Does the kernel keep a PCB for a process after it exits?",
        answer:
          "Partly, and that residue is the zombie state. When a process exits, the kernel tears down its address space, closes its file descriptors, and releases most of its resources immediately - so a zombie consumes essentially no memory beyond its task_struct. What it cannot release is the exit status and the final accounting numbers, because the parent has the right to read them with wait or waitpid. The stripped-down PCB therefore lingers in the process table until the parent reaps it or until the parent dies and init, or a subreaper, adopts and reaps it. A process leaking zombies is not leaking memory in any meaningful sense; it is leaking PID table slots, and it eventually fails to fork because the PID space or the per-user process limit is exhausted."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Bovet and Cesati - Understanding the Linux Kernel, chapter 3 (Processes)",
        insight: "Field-by-field walkthrough of task_struct and how the process list, PID hash, and run queues reference it."
      },
      {
        source: "book",
        attribution: "Silberschatz, Galvin, Gagne - Operating System Concepts, chapter 3",
        insight: "The canonical PCB definition that most interview answers are graded against, plus the standard address-space diagram."
      },
      {
        source: "note",
        attribution: "Linux proc(5) manual page - /proc/[pid]/maps, /proc/[pid]/status, /proc/[pid]/stat",
        insight: "Turns every abstract PCB field into something you can print on a real machine, which is the fastest way to make this topic stick."
      }
    ]
  },
  {
    id: "topic-os-context-switching",
    moduleId: "mod-os-processes-and-threads",
    title: "Context Switching: Mechanics, Cost, and the Hidden Bill",
    intuition:
      "A context switch is the operation that lets one CPU pretend to be many. The direct cost is small and easy to describe: save registers, maybe swap page tables, restore registers. The cost that actually shows up in production is indirect - the incoming task arrives to find the L1 and L2 caches, the TLB, and the branch predictor full of the outgoing task's data, so it runs slowly for thousands of instructions while it warms them back up. Interviewers who ask 'how expensive is a context switch' are usually testing whether you know that the direct cost is a couple of microseconds and the indirect cost can be ten times larger and completely invisible in a microbenchmark.",
    complexity: {
      time:
        "Direct cost is roughly 1-3 microseconds for a same-process thread switch and 3-10 microseconds when the address space changes, dominated by the page-table base write and TLB effects. Indirect cache-warming cost can add tens of microseconds for a large working set. A voluntary switch on a blocking call is cheaper than an involuntary preemption because the task often has less live state.",
      space:
        "Per switch the kernel writes a saved register frame (a few hundred bytes including FPU and vector state) plus scheduler bookkeeping. The steady-state memory cost is per task, not per switch: one kernel stack of 8-16 KB and one task_struct. The real 'space' cost is cache and TLB capacity, which is shared and evicted rather than allocated."
    },
    lesson: [
      {
        title: "The Three Ways a Switch Starts",
        content:
          "Every context switch begins with an entry into the kernel, and there are only three doorways. A timer interrupt fires at the scheduling tick and the scheduler decides the running task has used its slice - this is an involuntary preemption. A system call blocks, for example a read on an empty socket, so the task voluntarily gives up the CPU and moves to a wait queue. Or a hardware interrupt or a wakeup makes a higher-priority task runnable and the kernel preempts immediately. The distinction matters because Linux counts voluntary and involuntary switches separately in /proc/<pid>/status, and the ratio is diagnostic: high involuntary counts mean CPU contention, while high voluntary counts mean the task is I/O bound or lock bound.",
        diagram: asciiDiagram(`Entry paths into a context switch

  Running task (user mode)
        │
        ├── timer interrupt at scheduler tick
        │        └──▶ slice exhausted ──▶ INVOLUNTARY switch (nivcsw)
        │
        ├── blocking syscall: read/recv/futex wait/sleep
        │        └──▶ task ▶ wait queue ──▶ VOLUNTARY switch (nvcsw)
        │
        └── device IRQ or wakeup makes a higher-prio task runnable
                 └──▶ need_resched set ──▶ PREEMPTION at next safe point

  All three converge here:
        ▼
  save registers ─▶ update accounting ─▶ pick_next_task()
        ▼
  switch_mm() if address space differs ─▶ switch_to()
        ▼
  restore registers ─▶ return to user mode as the NEW task`)
      },
      {
        title: "Direct Cost: What the CPU Literally Does",
        content:
          "The mandatory work is small and bounded. Entering the kernel changes privilege level and switches to the task's kernel stack. The register file is pushed into a pt_regs frame. Floating-point and vector registers - which on a modern x86 with AVX-512 are several kilobytes - are usually not saved eagerly; the kernel sets a lazy flag and only pays for them if the incoming task actually uses those units. Then the scheduler picks the next task, and if that task belongs to a different process the kernel writes the new page-table root into CR3. Finally the incoming registers are restored and the CPU returns to user mode. Add it up and you land near a microsecond of real instruction execution, which is why the direct cost is not the interesting part of the answer.",
        codeExample: `# Measuring it yourself.

# 1. Count switches for one process:
grep ctxt_switches /proc/$PID/status
#   voluntary_ctxt_switches:     18422    <- blocked on I/O or locks
#   nonvoluntary_ctxt_switches:   3901    <- preempted, CPU contention

# 2. System-wide rate:
vmstat 1
#   procs ---------memory---------- ---system--
#    r  b   swpd   free   buff cache   in    cs
#    4  0      0  2.1G   180M  6.2G  9812  41250   <- cs = switches/sec

# 3. Per-process detail while running:
pidstat -w 1        # cswch/s and nvcswch/s per task

# 4. Latency attribution:
perf sched latency  # who waited, how long, and who preempted them`
      },
      {
        title: "Indirect Cost: The Bill Nobody Sees",
        content:
          "The expensive part is what the switch destroys rather than what it copies. The L1 data cache is tens of kilobytes; the incoming task's working set is not in it, so its first thousands of memory accesses miss and go to L2, L3, or DRAM at 100 to 300 cycles each. The TLB caches virtual-to-physical translations, and on a cross-process switch every non-global entry becomes invalid, so each first touch of a page requires a hardware page walk. The branch predictor and return-stack buffer are similarly polluted. Measured end to end, a task can run at a fraction of its steady-state IPC for tens of microseconds after resuming. This is precisely why pinning threads to cores, sizing thread pools near the core count, and batching work all improve throughput even though none of them reduce the number of instructions executed.",
        diagram: asciiDiagram(`Where the time actually goes

Direct (visible in a microbenchmark)
   ├── privilege change + kernel stack switch      ~100-300 ns
   ├── save/restore general registers              ~100-200 ns
   ├── scheduler pick_next_task                    ~200-500 ns
   └── CR3 write, only on process change           ~200-500 ns
                                          total ≈ 1-3 us

Indirect (invisible until you measure real workloads)
   ├── L1/L2 cache refill for the new working set  ▶ 5-50 us
   ├── TLB misses ▶ hardware page walks            ▶ 1-20 us
   ├── branch predictor + RSB re-training          ▶ 1-5 us
   └── LLC pollution felt by OTHER cores too       ▶ variable
                                          total ≈ 10-100+ us

Rule of thumb: indirect cost >> direct cost whenever the
working set is larger than the last-level cache slice.`)
      },
      {
        title: "Why Same-Process Switches Are Cheaper",
        content:
          "Switching between two threads of the same process skips the address-space swap entirely: the page-table root is unchanged, so the TLB stays valid and previously cached translations remain usable. Cache lines belonging to shared data structures also stay warm, because both threads are touching the same heap. Modern CPUs soften even the cross-process case with tagged TLBs - process context identifiers on x86 and address space identifiers on ARM - which let entries from several address spaces coexist so a CR3 write no longer forces a full flush. That optimisation is real but partial: capacity is finite, so heavy multiprogramming still evicts entries, and kernel page-table isolation mitigations for Meltdown reintroduced extra switching work on affected hardware.",
        codeExample: `// Why thread-pool sizing matters more than switch cost per se.

// Bad: one thread per connection, 10k connections.
//   - 10k kernel stacks, 10k task_structs
//   - scheduler run queue churn, huge involuntary switch rate
//   - each thread's working set evicts the others' cache lines
for (;;) { int c = accept(s,0,0); pthread_create(&t, 0, handle, &c); }

// Better: bounded pool ~= number of cores for CPU-bound work.
//   - each thread runs long enough to amortize its cache warm-up
int n = sysconf(_SC_NPROCESSORS_ONLN);
for (int i = 0; i < n; i++) pthread_create(&pool[i], 0, worker, q);

// Best for I/O-bound work: don't block a thread at all.
//   - epoll_wait returns many ready fds per switch,
//     so one kernel entry amortizes across hundreds of events
int nfds = epoll_wait(ep, evs, MAXEV, -1);
for (int i = 0; i < nfds; i++) handle_nonblocking(evs[i].data.fd);`
      },
      {
        title: "Reducing Switches in Practice",
        content:
          "There are four durable levers. Batch work so one kernel entry does more: epoll returning many ready descriptors, io_uring submitting and reaping many operations per syscall, or writev instead of many writes. Bound concurrency so runnable tasks do not vastly exceed cores, which turns involuntary preemption into simple queueing. Improve locality with CPU affinity or NUMA-aware placement so a woken task returns to the core whose cache still holds its data - this is why the Linux scheduler prefers the previous CPU on wakeup. And avoid switching on very short waits by spinning briefly before sleeping, which is exactly what adaptive mutexes and futexes do: spin for a few hundred cycles on the assumption the holder will release soon, then fall back to a syscall and a real switch only if it does not.",
        diagram: asciiDiagram(`Lock wait strategy and its switch cost

  Thread wants a mutex that is currently held
        │
        ├── Expected hold time SHORT (< ~1 us)
        │        └──▶ spin in user space
        │                 ├── acquired ──▶ 0 context switches
        │                 └── timeout  ──▶ fall through
        │
        └── Expected hold time LONG or spin timed out
                 └──▶ futex(FUTEX_WAIT) ──▶ task ▶ wait queue
                          ▼
                    2 context switches minimum
                    (sleep now, wake later) + cache cost

  glibc adaptive mutex = the top branch first, bottom branch as fallback.
  Uncontended fast path = one atomic compare-exchange, no kernel entry at all.`)
      }
    ],
    examples: [
      {
        title: "Thread pool sized 10x the core count",
        input:
          "A CPU-bound image service runs 80 worker threads on 8 cores and throughput is lower than with 8 workers.",
        output: "Oversubscription; reduce the pool to roughly the core count.",
        explanation:
          "Step 1: With 80 runnable threads on 8 cores, each thread is preempted repeatedly before finishing its work item.\nStep 2: Every preemption throws away the cache lines that thread just warmed for its image tile.\nStep 3: Total instructions executed are unchanged, but IPC collapses, so wall-clock throughput drops.\nStep 4: Confirm with pidstat -w showing a high nvcswch/s, then cut the pool to the core count and measure again."
      },
      {
        title: "Voluntary vs involuntary ratio as a diagnostic",
        input:
          "Two services both show 50k context switches per second, but one is healthy and one is slow.",
        output: "Read the split in /proc/<pid>/status before concluding anything.",
        explanation:
          "Step 1: The healthy service shows almost all voluntary switches - it is I/O bound and sleeping on epoll, which is normal and cheap per unit of work.\nStep 2: The slow service shows mostly non-voluntary switches, meaning it is being preempted while it still wants the CPU.\nStep 3: That points at CPU oversubscription or noisy neighbours rather than at the code itself.\nStep 4: Fix by reducing runnable concurrency or by giving the workload dedicated cores, not by micro-optimising the handler."
      },
      {
        title: "Spin-then-sleep for a short critical section",
        input:
          "A hot counter is protected by a mutex held for about 200 nanoseconds, and profiles show most time inside futex syscalls.",
        output: "Use an adaptive or spin lock, or make the counter atomic.",
        explanation:
          "Step 1: A sleep-wake pair costs two context switches, so several microseconds, to protect a 200 ns section.\nStep 2: That is a 10x or worse overhead ratio, which is the classic signal that sleeping is wrong here.\nStep 3: Spinning briefly lets the waiter acquire the lock without ever entering the kernel.\nStep 4: Better still, remove the lock: a single relaxed atomic fetch-add has no waiting and therefore no switches at all."
      }
    ],
    tips: [
      "Always split your answer into direct and indirect cost - naming the cache and TLB effects is what separates a senior answer from a textbook one.",
      "Quote the voluntary versus involuntary switch counters as your evidence; they are one grep away on any Linux box.",
      "Say that a same-process thread switch skips the page-table swap, and that tagged TLBs (PCID/ASID) soften but do not remove the cross-process penalty."
    ],
    tricks: [
      "If a lock is held for less time than a context switch costs, spinning is not a hack - it is the correct engineering choice.",
      "Batching is a switch-reduction technique in disguise: epoll, io_uring, and writev all amortise one kernel entry over many operations.",
      "The scheduler prefers waking a task on its previous CPU for cache reasons; mention wake affinity if asked how the OS itself mitigates the cost."
    ],
    memoryAids: [
      "Saving registers is the receipt; refilling the caches is the actual bill.",
      "Voluntary switch = 'I am waiting'. Involuntary switch = 'you are waiting'.",
      "Same process, same page table, warm TLB. Different process, new CR3, cold translations."
    ],
    interviewPatterns: [
      "Quantitative probe: 'How long does a context switch take?' - give a microsecond range for the direct cost and immediately raise the indirect cost.",
      "Applied probe: 'Adding threads made it slower - why?' - oversubscription, preemption, and cache thrash.",
      "Frequency and companies: Tier 1 in performance-oriented interviews at Meta, Netflix, trading firms, and any low-latency systems role."
    ],
    practiceProblems: [
      "A task shows 200k voluntary and 500 involuntary switches per second. What kind of workload is it and where would you look for wins? Answer: Overwhelmingly I/O or lock bound - it sleeps far more often than it is preempted. Look for a chatty syscall pattern; batching with epoll, readv/writev, or io_uring will collapse many sleeps into one.",
      "Explain why disabling hyper-threading sometimes improves tail latency for a latency-sensitive service. Answer: Sibling threads share L1/L2 and execution ports, so a co-resident task acts like a continuous partial context switch, evicting cache lines and stealing issue slots. Removing the sibling gives the critical thread a private cache footprint and far more predictable p99, at the cost of peak throughput.",
      "Your service is pinned to 4 cores with 4 threads yet still shows 30k involuntary switches per second. What else could be preempting it? Answer: Anything else runnable on those cores - kernel threads, interrupt handling and softirqs, other containers sharing the cgroup CPU quota, or cgroup throttling itself, which forcibly deschedules tasks when the quota is exhausted within a period."
    ],
    faq: [
      {
        question: "Why is a mode switch not the same as a context switch?",
        answer:
          "A mode switch is a privilege-level transition within the same task: the CPU moves from user mode to kernel mode to run a system call or handle an interrupt, and then returns to the very same task. It costs a few hundred nanoseconds, saves a register frame, and touches no scheduler data structures. A context switch changes which task the CPU is running, which additionally requires the scheduler to choose a successor, update run-queue and accounting state, and possibly install a different address space. Every context switch contains a mode switch, but the vast majority of mode switches do not lead to a context switch - a getpid or a read that hits the page cache returns straight to the caller. Conflating the two makes people wildly overestimate syscall cost, which historically led to bad designs that avoided syscalls at the expense of much larger inefficiencies elsewhere."
      },
      {
        question: "Does a context switch always flush the TLB?",
        answer:
          "Not on modern hardware, and not for same-process thread switches at all. A thread switch within one process leaves the page-table root unchanged, so every translation remains valid. For cross-process switches, older x86 hardware did flush all non-global entries on every CR3 write, which was a significant part of the penalty. Process context identifiers on x86-64 and address space identifiers on ARM64 tag each TLB entry with the address space it belongs to, so entries for several processes can coexist and a switch back to a recently-run process finds its translations still present. The catch is that the tag space is small - 4096 PCIDs, and Linux uses only a handful per CPU - and TLB capacity is finite, so entries still get evicted under heavy multiprogramming. Kernel page-table isolation, added to mitigate Meltdown, also reintroduced extra page-table switching on kernel entry for affected CPUs."
      },
      {
        question: "Are context switches the reason async I/O is faster than threads?",
        answer:
          "They are a large part of it, but not the whole story. With blocking I/O and one thread per connection, every operation that would block costs a pair of switches - one to sleep and one to wake - plus the cache disruption that comes with them, and 10,000 connections means 10,000 kernel stacks and a run queue the scheduler must manage. An event loop with epoll or io_uring collects many ready events in a single kernel entry and processes them on one warm thread, so the per-operation switch cost tends toward zero. The rest of the benefit is memory and scheduler pressure: fewer tasks means less kernel memory, shorter run queues, and better cache locality. The tradeoff is that async code must never block, because a single blocking call stalls every connection multiplexed onto that loop, whereas the thread-per-connection model degrades gracefully in that scenario."
      },
      {
        question: "How does the scheduler decide it is time to switch?",
        answer:
          "In Linux CFS, each runnable task accumulates virtual runtime that advances in proportion to real execution time divided by its weight, so low-priority tasks accrue vruntime faster. The scheduler always runs the task with the smallest vruntime, kept in a red-black tree ordered by that key. On each timer tick the kernel checks whether the current task has exceeded its share relative to the leftmost pending task, and if so it sets the need_resched flag, which triggers a switch at the next safe point - typically on return from the interrupt to user mode. A wakeup can also set need_resched immediately if the woken task's vruntime is far enough behind, which is how interactive tasks preempt batch tasks quickly. Two guards prevent thrashing: a minimum granularity so a task is not preempted after a handful of microseconds, and a wakeup granularity so a marginally more deserving task cannot immediately displace the running one."
      },
      {
        question: "Can you have too few context switches?",
        answer:
          "Yes, and that is the interactivity side of the tradeoff. Long time slices maximise throughput because each task runs long enough to amortise its cache warm-up, but they also mean a newly-ready interactive task can wait a full slice before it runs, which shows up directly as input lag or request tail latency. This is the classic throughput-versus-latency knob, and it is why real schedulers do not use one fixed quantum: CFS derives an effective slice from a target latency divided by the number of runnable tasks, bounded below by a minimum granularity, and real-time policies bypass the calculation entirely so a SCHED_FIFO task preempts immediately. Batch-oriented tunings deliberately lengthen slices, while desktop and low-latency tunings shorten them and accept the extra switching cost as the price of responsiveness."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Li, Ding, Shen - Quantifying the Cost of Context Switch (2007) - https://www.cs.rochester.edu/u/cli/research/switch.pdf",
        insight: "Measures the indirect cache-refill component separately from the direct cost and shows it dominating for realistic working sets."
      },
      {
        source: "book",
        attribution: "Gregg - Systems Performance, 2nd edition, chapters 6 and 13",
        insight: "Practical methodology for reading cswch/s, nvcswch/s, and perf sched output, and for deciding when switching is actually the bottleneck."
      },
      {
        source: "note",
        attribution: "Linux kernel source - kernel/sched/core.c, __schedule() and context_switch()",
        insight: "The authoritative sequence: pick_next_task, switch_mm, switch_to - short enough to read and it settles most arguments about ordering."
      }
    ]
  },
  {
    id: "topic-os-process-lifecycle",
    moduleId: "mod-os-processes-and-threads",
    title: "The Process Lifecycle: States, Zombies, and Orphans",
    intuition:
      "The process state machine is small enough to draw from memory and rich enough to explain a startling number of production incidents. A process is either running on a CPU, ready and waiting for one, blocked waiting for something that is not a CPU, stopped by a signal, or dead but not yet reaped. The two transitions people get wrong are the exit path and the block path. Exit is not a single event: the process dies, but its status record survives until a parent collects it, which is what a zombie is. And blocked is not one state on Linux - interruptible and uninterruptible sleep behave very differently, which is why a hung NFS mount produces processes that even SIGKILL cannot touch.",
    complexity: {
      time:
        "State transitions are constant-time queue operations: moving a task between a run queue and a wait queue is a few pointer updates. Process termination is proportional to the resources held - unmapping the address space costs work per mapped region, and closing descriptors costs work per open file. Reaping a zombie with wait is constant time.",
      space:
        "A live process holds its full PCB, page tables, and kernel stack. A zombie holds only a stripped task_struct with its exit status and accounting numbers, a few kilobytes, but it also holds a PID table slot - which is the resource that actually runs out when zombies accumulate."
    },
    lesson: [
      {
        title: "The Five-State Model and Its Linux Refinement",
        content:
          "The textbook model has new, ready, running, waiting, and terminated. Linux refines it into task states you can actually observe in ps: R covers both running and runnable, because from the kernel's point of view they are the same queue membership with a different CPU assignment. S is interruptible sleep, the normal blocked state, where the task waits on a condition and can be woken early by a signal. D is uninterruptible sleep, used when waking early would corrupt kernel state - typically during a disk or network filesystem operation that has already been issued to hardware. T is stopped, entered via SIGSTOP or a debugger. Z is zombie: the process has exited and its status awaits collection. Knowing that R merges two textbook states and that D exists at all is what makes the Linux answer stronger than the textbook one.",
        diagram: asciiDiagram(`Process state machine as Linux implements it

                    fork()
                       │
                       ▼
                 ┌──────────┐  scheduler dispatch   ┌──────────┐
                 │  READY   │ ────────────────────▶ │ RUNNING  │
                 │   (R)    │ ◀──────────────────── │   (R)    │
                 └──────────┘  preempted / yield    └──────────┘
                       ▲                              │      │
        wakeup / event │                              │      │ exit()
                       │              blocking call   │      │ or signal
                 ┌─────┴──────┐ ◀─────────────────────┘      ▼
                 │  SLEEPING  │                         ┌──────────┐
                 │  S = interruptible (signal can wake) │  ZOMBIE  │
                 │  D = uninterruptible (signal cannot) │   (Z)    │
                 └────────────┘                         └──────────┘
                       ▲                                     │
         SIGCONT       │  SIGSTOP / SIGTSTP / ptrace          │ parent
                 ┌─────┴──────┐                              │ wait()
                 │  STOPPED   │ ◀── from RUNNING             ▼
                 │    (T)     │                          reaped, PID freed
                 └────────────┘`)
      },
      {
        title: "Zombies: Why Dead Processes Linger",
        content:
          "When a process calls exit, the kernel immediately releases almost everything: the address space is unmapped, file descriptors are closed, and memory returns to the system. What cannot be released is the exit status, because POSIX guarantees the parent can retrieve it. So the kernel keeps a stripped task_struct in the process table and sends SIGCHLD to the parent. When the parent calls wait or waitpid, it receives the status and the kernel frees the last remnant, including the PID. A zombie therefore consumes essentially no memory but does consume a PID slot and a process-table entry. A parent that never reaps produces an accumulating pile of them, and the eventual symptom is fork failing with EAGAIN because the PID space or the per-user process limit is exhausted - a failure that looks nothing like a memory leak and will not be found by looking at memory graphs.",
        codeExample: `#include <stdlib.h>
#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>

// BUG: parent never reaps -> every child becomes a permanent zombie.
void leaky(void) {
    for (;;) { if (fork() == 0) _exit(0); sleep(1); }
}

// FIX 1: reap explicitly, non-blocking, in the parent's loop.
void reap_all(void) {
    while (waitpid(-1, NULL, WNOHANG) > 0) { }
}

// FIX 2: tell the kernel you do not want statuses at all.
//        Children are then auto-reaped and never become zombies.
signal(SIGCHLD, SIG_IGN);          // portable-ish
// or explicitly:
struct sigaction sa = {0};
sa.sa_handler = SIG_DFL;
sa.sa_flags   = SA_NOCLDWAIT;      // POSIX: no zombie, no status
sigaction(SIGCHLD, &sa, NULL);

// FIX 3 (servers): handle SIGCHLD and reap in a loop, never a single
// waitpid() - signals coalesce, so one SIGCHLD may mean N dead children.`
      },
      {
        title: "Orphans and Reparenting",
        content:
          "An orphan is the mirror image of a zombie: the child is still alive but its parent has exited. Since every process must have a parent to receive its eventual exit status, the kernel reparents orphans - historically always to PID 1, and since Linux 3.4 to the nearest ancestor that has marked itself a child subreaper with prctl, falling back to init. Because init and well-written subreapers reap unconditionally in a loop, orphans are harmless: they finish their work and are collected automatically. This is exactly the mechanism daemons exploit when they double-fork. The intermediate process exits immediately, the grandchild is orphaned and adopted by init, and the original caller can return without ever needing to wait for the long-running daemon. Container runtimes rely on the same machinery, which is why running a non-reaping application as PID 1 inside a container is a classic zombie-accumulation bug.",
        diagram: asciiDiagram(`Zombie versus orphan - the two halves of the exit protocol

ZOMBIE                                ORPHAN
  child exits, parent alive             parent exits, child alive
  but parent never wait()s

  parent (running, negligent)           parent ──▶ exited
      │                                     ╳ link broken
      └── child ──▶ Z                        │
             └── status held forever         └── child (still running)
                                                    │
  Cost: PID slot leaked                             ▼ reparented
  Fix : wait()/waitpid(), SIGCHLD           init (PID 1) or nearest
        handler, or SA_NOCLDWAIT           subreaper adopts the child
                                                    │
                                                    ▼ reaps on exit
                                             Cost: none, self-healing

Double-fork daemon trick = deliberately creating an orphan:
  caller ─fork──▶ child ─fork──▶ grandchild
                    │                 │
                    └─ _exit(0)       └── adopted by init, runs forever
  caller waits only for the short-lived child, never blocks.`)
      },
      {
        title: "Uninterruptible Sleep and the Unkillable Process",
        content:
          "State D is the one that generates support tickets. A task enters uninterruptible sleep when it is waiting for an operation the kernel cannot safely abandon halfway - most commonly a block-device read or a network filesystem call that has already handed a request to hardware. Signals, including SIGKILL, are not delivered while in this state; they are recorded as pending and only act when the task returns to an interruptible point. So a process stuck on a dead NFS server or a failing disk truly cannot be killed, and kill -9 does nothing at all. The diagnostics are to read /proc/<pid>/stack or /proc/<pid>/wchan to see which kernel function it is parked in, and the fixes are to restore the underlying device, unmount with the force flag, or mount with the intr or soft options so the wait becomes interruptible. Linux later added a killable sleep state that responds to fatal signals only, and many filesystem paths now use it, which is why fewer operations are truly unkillable than a decade ago. High load average with idle CPUs is the system-level fingerprint, because Linux counts D-state tasks in the load average.",
        codeExample: `# Triage for a process that will not die.

ps -eo pid,stat,wchan:30,comm | awk '$2 ~ /D/'
#   PID STAT WCHAN                          COMMAND
#  9182 D    rpc_wait_bit_killable          cp        <- stuck on NFS

cat /proc/9182/stack        # kernel call stack (needs privileges)
cat /proc/9182/wchan        # the single function it is sleeping in

uptime
#  load average: 42.10, 39.88, 30.12   <- huge load, but:
mpstat 1
#  %idle 98.7                          <- CPUs are idle
#  => the load is D-state tasks waiting on I/O, not CPU demand

# kill -9 will NOT work here. Fix the storage/mount instead:
umount -f /mnt/nfs        # or restore the server, or remount with 'intr'`
      },
      {
        title: "Termination Paths and Exit Status Encoding",
        content:
          "A process can end voluntarily by returning from main or calling exit, or involuntarily by receiving a fatal signal, or by being killed by the out-of-memory killer when the system is under memory pressure. The distinction is preserved in the status word the parent receives, which is why the macros exist: WIFEXITED with WEXITSTATUS gives the value passed to exit, while WIFSIGNALED with WTERMSIG gives the signal number that killed it. Shells flatten this into a single number by reporting 128 plus the signal, which is why 137 means SIGKILL - almost always the OOM killer or a container memory limit - and 139 means SIGSEGV. Recognising 137 on sight and immediately checking dmesg for an OOM record is one of the highest-value pieces of operational knowledge in this entire topic. Note also that exit runs atexit handlers and flushes stdio buffers while _exit does not, which is why a forked child that calls exit can duplicate the parent's unflushed output.",
        diagram: asciiDiagram(`Reading an exit status

  waitpid(pid, &status, 0)
        │
        ├── WIFEXITED(status) ──▶ normal return / exit(n)
        │        └── WEXITSTATUS(status) = n        shell shows n
        │
        ├── WIFSIGNALED(status) ──▶ killed by a signal
        │        └── WTERMSIG(status) = sig         shell shows 128+sig
        │
        └── WIFSTOPPED(status) ──▶ stopped, not dead (needs WUNTRACED)

  Shell exit codes worth memorising
     0    success
     1-125 application-defined failure
     126  found but not executable
     127  command not found
     130  = 128 + 2   SIGINT     (Ctrl-C)
     137  = 128 + 9   SIGKILL    ▶ check dmesg for the OOM killer
     139  = 128 + 11  SIGSEGV    ▶ check for a core dump
     143  = 128 + 15  SIGTERM    ▶ orderly shutdown request`)
      }
    ],
    examples: [
      {
        title: "Container restarts with exit code 137",
        input:
          "A Kubernetes pod restarts every few hours; the container's last state shows exit code 137 and no application error log.",
        output: "SIGKILL from the memory cgroup limit, not an application crash.",
        explanation:
          "Step 1: Decode 137 as 128 plus 9, meaning the process was killed by SIGKILL.\nStep 2: SIGKILL cannot be caught, which explains why no shutdown handler ran and no error was logged.\nStep 3: Check dmesg or the pod events for a memory-cgroup OOM record naming the process.\nStep 4: Fix by raising the memory limit or reducing the working set; adding a signal handler is impossible for SIGKILL and would not help anyway."
      },
      {
        title: "PID exhaustion from a non-reaping server",
        input:
          "A forking server runs fine for a week and then fork() begins returning EAGAIN, though memory and disk look healthy.",
        output: "Accumulated zombies consuming PID slots.",
        explanation:
          "Step 1: Count zombies with ps -eo stat | grep -c Z and compare against /proc/sys/kernel/pid_max.\nStep 2: Confirm the parent never calls wait, so every finished child stays in state Z.\nStep 3: Note that memory is unaffected because a zombie has already released its address space - which is why memory dashboards showed nothing.\nStep 4: Fix by reaping in a SIGCHLD handler with waitpid in a while loop, since coalesced signals mean one SIGCHLD can represent several dead children."
      },
      {
        title: "Load average of 40 on an idle machine",
        input:
          "Monitoring pages on load average 40, but every CPU shows 95% idle and no process is using measurable CPU time.",
        output: "Tasks parked in uninterruptible sleep waiting on storage.",
        explanation:
          "Step 1: Recall that Linux load average counts running, runnable, and D-state tasks, unlike classic Unix which counts only CPU demand.\nStep 2: List D-state tasks with ps -eo pid,stat,wchan and see them all blocked in a filesystem or block-layer function.\nStep 3: Correlate with iostat showing device utilisation pinned at 100% or a network filesystem that has stopped responding.\nStep 4: Treat it as a storage incident; killing the processes is impossible until the underlying I/O completes or the mount is forcibly removed."
      }
    ],
    tips: [
      "Draw the state machine before talking - the transitions prompt the rest of the answer for you.",
      "Say explicitly that a zombie leaks PIDs rather than memory; that single sentence signals real operational experience.",
      "Whenever you see exit code 137, check dmesg for the OOM killer before you look at application logs."
    ],
    tricks: [
      "Always reap with waitpid in a while loop inside the SIGCHLD handler, because standard signals coalesce and one delivery can cover several children.",
      "The double-fork daemon idiom works precisely because orphans are adopted and unconditionally reaped by init.",
      "High load average plus idle CPUs is an I/O diagnosis on Linux, because D-state tasks are counted in the load."
    ],
    memoryAids: [
      "Zombie = dead child nobody collected. Orphan = live child with no parent left.",
      "R runnable, S sleeping softly, D deaf to signals, T stopped, Z awaiting burial.",
      "128 plus the signal number: 137 is 9, 139 is 11, 143 is 15."
    ],
    interviewPatterns: [
      "Classic pair: 'What is a zombie process and how do you prevent one?' followed by 'and what is an orphan?'",
      "Debug scenario: 'kill -9 does nothing - explain' - uninterruptible sleep, pending signal, fix the device not the process.",
      "Frequency and companies: Tier 1 in Linux, SRE, and backend infrastructure interviews at Amazon, Google, Red Hat, and most systems-adjacent roles."
    ],
    practiceProblems: [
      "Write the smallest program that creates a permanent zombie, and then the smallest change that prevents it. Answer: fork, have the child _exit immediately, and have the parent sleep forever without waiting. Prevent it either by calling waitpid or by installing SIGCHLD with SA_NOCLDWAIT (or SIG_IGN), which tells the kernel to discard statuses and auto-reap.",
      "Why can a process in state D not be killed, and what would you check first? Answer: The task is blocked inside the kernel at a point where returning early would leave kernel or device state inconsistent, so the signal is only recorded as pending. Check /proc/<pid>/wchan and /proc/<pid>/stack to identify the subsystem, then investigate the underlying device or mount rather than the process.",
      "A shell script reports exit status 139 for a child. What happened and what artefact should exist? Answer: 139 is 128 plus 11, so the child was killed by SIGSEGV. There should be a core dump if ulimit -c is non-zero and the core pattern is configured, plus a kernel log line naming the faulting address and instruction pointer."
    ],
    faq: [
      {
        question: "Why does the kernel keep zombies at all instead of discarding the status?",
        answer:
          "Because the exit status is the only reliable channel through which a parent learns how its child ended, and discarding it would create an unavoidable race. Consider a shell running a command: if the kernel freed everything the instant the child exited, and the shell was descheduled at that moment, the shell could never determine whether the command succeeded. Keeping a minimal record until the parent explicitly collects it makes the protocol race-free - the status is guaranteed to be available whenever the parent gets around to asking. The cost is deliberately kept tiny: everything expensive is released at exit time and only the status word, the accounting totals, and the PID reservation survive. And the system offers an opt-out for parents that genuinely do not care, via SA_NOCLDWAIT or ignoring SIGCHLD, which instructs the kernel to reap automatically."
      },
      {
        question: "What is the difference between exit() and _exit()?",
        answer:
          "exit is a C library function that performs cleanup before terminating: it runs functions registered with atexit and, in C++, destructors for objects with static storage duration, then flushes and closes all stdio streams, then invokes the _exit system call. _exit skips every one of those steps and traps straight into the kernel. The distinction matters enormously after a fork, because the child inherits a copy of the parent's stdio buffers. If the parent had unflushed output pending and the child calls exit, the child flushes that inherited buffer and the same text is emitted twice. This is the standard explanation for duplicated log lines in forking programs. The rule is that a child which is not going to call exec should terminate with _exit, and the same applies inside signal handlers, where the stdio machinery is not async-signal-safe."
      },
      {
        question: "How does the out-of-memory killer choose its victim?",
        answer:
          "When the kernel cannot satisfy an allocation and reclaim has failed, it scores every eligible task and kills the highest scorer. The score is driven mainly by memory footprint - resident set plus swap and page-table usage - so the process using the most memory is the usual victim, deliberately, because killing it is most likely to resolve the shortage. Administrators can bias the decision per process by writing to /proc/<pid>/oom_score_adj, where negative values protect a process and the special value -1000 makes it immune, while positive values volunteer it. Under memory cgroups the scope narrows: the kill happens within the cgroup that hit its limit rather than machine-wide, which is exactly how container memory limits are enforced. The victim receives SIGKILL, so no handler runs and no graceful shutdown is possible, and the kernel logs a detailed record to dmesg listing the candidates and the chosen task."
      },
      {
        question: "Can a process have no parent at all?",
        answer:
          "Only PID 1. Every other process has a parent by construction because processes come into existence through fork or clone, and when a parent dies the kernel immediately reparents its children rather than leaving them unparented. The adopter is the nearest ancestor that has called prctl with PR_SET_CHILD_SUBREAPER, and if there is none, it is PID 1 within the process's PID namespace. PID 1 itself is special in several ways: it is started by the kernel, it cannot be reparented, and it is protected from signals whose default action would kill it unless it has explicitly installed a handler. That protection is why a container whose PID 1 is a plain application often ignores SIGTERM entirely and has to be SIGKILLed at the end of the termination grace period - the application never installed a handler, and the kernel refuses to apply the default action to PID 1."
      },
      {
        question: "What actually happens between fork() returning and the child running?",
        answer:
          "The child is created in a runnable state and placed on a run queue, so it is competing for a CPU just like any other task. Which of parent and child runs first is not specified by POSIX and has changed across Linux versions and scheduler tunables, so correct programs never assume an order - any code that depends on the child running first is a latent bug. The child's address space is set up copy-on-write: page tables are duplicated with writable pages marked read-only in both, so the first write by either side triggers a fault that allocates a private copy. That is why fork is far cheaper than its naive description suggests, and why a fork immediately followed by exec wastes almost nothing. It also explains a memory subtlety: forking a process with a large heap can succeed instantly yet later fail with out-of-memory errors when the copies are finally materialised, which is one motivation for posix_spawn and vfork in memory-constrained settings."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Kerrisk - The Linux Programming Interface, chapters 24-26 (process creation, termination, monitoring)",
        insight: "Definitive treatment of wait semantics, zombie prevention, orphan reparenting, and the exit status encoding."
      },
      {
        source: "note",
        attribution: "Linux manual pages - wait(2), _exit(2), signal(7), proc(5)",
        insight: "Precise rules for status macros, SA_NOCLDWAIT, and which process states are visible where."
      },
      {
        source: "blog",
        attribution: "Phusion - Docker and the PID 1 zombie reaping problem - https://blog.phusion.nl/2015/01/20/docker-and-the-pid-1-zombie-reaping-problem/",
        insight: "Shows the classic failure mode of running a non-reaping application as PID 1 in a container, and why an init shim fixes it."
      }
    ]
  },
  {
    id: "topic-os-process-creation",
    moduleId: "mod-os-processes-and-threads",
    title: "Process Creation: fork, exec, clone, and posix_spawn",
    intuition:
      "Unix made an unusual design choice: creating a process and choosing what program it runs are two separate operations. fork duplicates the caller, exec replaces the current program image with a new one, and normal process launching is the two composed. The separation looks wasteful until you notice what it buys - the window between fork and exec is where the child can redirect file descriptors, change its identity, join a new namespace, or set resource limits, all using ordinary code rather than a giant options structure. Every shell pipeline, every container runtime, and every process supervisor is built on that window.",
    complexity: {
      time:
        "fork is dominated by duplicating page tables and marking pages copy-on-write, so it scales with the number of mapped pages, not with the amount of memory actually used - roughly hundreds of microseconds for a small process and several milliseconds for a multi-gigabyte one. exec is dominated by ELF loading, dynamic-linker relocation, and demand-paging the new binary. Thread creation via clone skips both and lands in the tens of microseconds.",
      space:
        "Immediately after fork the child adds only new page tables and a task_struct, because data pages are shared copy-on-write. Each subsequent write by either process allocates one private 4 KB page. exec discards the entire inherited address space and builds a fresh one from the new binary, so post-exec memory is unrelated to the parent's footprint."
    },
    lesson: [
      {
        title: "fork: One Call, Two Returns",
        content:
          "fork creates a near-duplicate of the calling process and returns twice: zero in the child and the child's PID in the parent, or minus one on failure. The child inherits a copy of the address space, the open file descriptors, the current working directory, the environment, the signal handler dispositions, and the resource limits. Crucially, inherited descriptors share the underlying open file description, so parent and child share one file offset - which is exactly why two processes writing to the same inherited descriptor append correctly instead of overwriting each other. What the child does not inherit is equally examinable: it gets a new PID, its parent PID becomes the caller, pending signals and pending alarms are cleared, file locks are not inherited, and - the big one - only the calling thread exists in the child. Every other thread of a multithreaded parent simply does not exist on the other side.",
        diagram: asciiDiagram(`fork() returns twice

              parent, before fork()
                       │
                       ▼
                  ┌─────────┐
                  │ fork()  │
                  └─────────┘
                   │       │
       returns pid │       │ returns 0
                   ▼       ▼
             ┌────────┐  ┌────────┐
             │ PARENT │  │ CHILD  │
             └────────┘  └────────┘

  Inherited by the child          NOT inherited
    ├── address space (COW)         ├── PID (new one)
    ├── open fds (shared offsets)   ├── pending signals / alarms
    ├── cwd, root, umask            ├── file locks
    ├── env and argv                ├── CPU time accounting (reset)
    ├── signal dispositions         └── OTHER THREADS
    └── rlimits, uid/gid                 (only the caller survives)`)
      },
      {
        title: "Copy-on-Write: Why fork Is Not as Expensive as It Sounds",
        content:
          "A naive fork would copy every byte of the parent's memory, which would make forking a database with a large buffer pool absurd. Instead the kernel copies only the page tables and marks every writable page read-only in both processes. Reads proceed normally against shared physical frames. The first write by either side traps into the kernel, which allocates a fresh frame, copies the 4 KB page into it, restores write permission for the writer, and resumes. Pages neither side writes are never duplicated at all, and read-only text pages are shared permanently. The consequence is that fork's cost tracks the size of the page-table hierarchy rather than the resident set - but it also means memory is committed lazily, so a fork that succeeded can still lead to an out-of-memory kill later when the copies actually materialise. Redis background saving is the canonical example: it forks to get a consistent snapshot, and its extra memory use during the save is proportional to how much the parent writes while the child runs.",
        codeExample: `#include <unistd.h>
#include <sys/wait.h>
#include <stdio.h>

int main(void) {
    int x = 1;
    pid_t pid = fork();

    if (pid < 0) { perror("fork"); return 1; }

    if (pid == 0) {                 // child
        x = 42;                     // <- triggers a COW fault here
        printf("child  x=%d pid=%d ppid=%d\\n", x, getpid(), getppid());
        _exit(0);                   // _exit, not exit: no duplicated flush
    }

    int status;
    waitpid(pid, &status, 0);       // reap; otherwise child becomes a zombie
    printf("parent x=%d (unchanged)  child exited %d\\n",
           x, WIFEXITED(status) ? WEXITSTATUS(status) : -1);
    return 0;
}

/* child  x=42 ...
   parent x=1 (unchanged)  child exited 0
   Same variable, two physical pages after the child's first write. */`
      },
      {
        title: "exec: Replacing the Program, Keeping the Process",
        content:
          "The exec family does not create anything. It discards the current address space and loads a new program image into the same process, so the PID, the parent link, and - by default - the open file descriptors all survive. On success exec never returns, because there is no longer any code to return to; a line after execvp only runs if the call failed. What persists across exec is the examinable part: PID, PPID, cwd, umask, resource limits, and open descriptors unless they were marked close-on-exec. What is reset is signal handlers, because the handler functions no longer exist in the new image - though ignored signals stay ignored and the signal mask is preserved. The close-on-exec flag matters far more than it appears: without it, a server that forks and execs a helper silently leaks its listening sockets and database connections into an unrelated program, which is both a descriptor leak and a security hole. Modern code should open with O_CLOEXEC by default and clear the flag deliberately for the few descriptors the child genuinely needs.",
        codeExample: `// The shell's core loop, in miniature: fork, adjust, exec.

pid_t pid = fork();
if (pid == 0) {
    // ---- the window between fork and exec ----
    // 1. Redirect stdout to a file:  cmd > out.txt
    int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    dup2(fd, STDOUT_FILENO);
    close(fd);

    // 2. Drop privileges before running untrusted code.
    setgid(nobody_gid); setuid(nobody_uid);   // gid FIRST, always

    // 3. Constrain the child.
    struct rlimit rl = { .rlim_cur = 1<<30, .rlim_max = 1<<30 };
    setrlimit(RLIMIT_AS, &rl);

    execvp("grep", (char *[]){ "grep", "-r", "TODO", ".", NULL });
    _exit(127);                 // only reached if exec FAILED
}
waitpid(pid, NULL, 0);

// Everything above is ordinary code. That is the whole argument
// for splitting fork from exec instead of one create_process() call.`
      },
      {
        title: "clone: The Real Primitive Underneath Both",
        content:
          "On Linux, fork, vfork, and pthread_create are all thin wrappers over clone, and the flags decide how much of the parent is shared rather than copied. CLONE_VM shares the address space, CLONE_FILES shares the descriptor table, CLONE_FS shares the filesystem view, CLONE_SIGHAND shares handler dispositions, and CLONE_THREAD places the new task in the caller's thread group so it reports the same PID. A plain fork passes none of them. A thread passes essentially all of them. The namespace flags - CLONE_NEWPID, CLONE_NEWNET, CLONE_NEWNS, CLONE_NEWUSER and friends - are what make containers possible: the child gets a private view of process IDs, network interfaces, or mounts while remaining an ordinary process on the same kernel. Saying that a container is 'a process created with namespace clone flags plus cgroup limits' is a compact and accurate answer that lands well in interviews.",
        diagram: asciiDiagram(`clone() flags: one syscall, a spectrum of outcomes

  nothing shared ◀───────────────────────────────▶ everything shared

  fork()                vfork()              pthread_create()
     │                     │                        │
     │                CLONE_VM                 CLONE_VM
     │                CLONE_VFORK              CLONE_FS
     │                                         CLONE_FILES
     │                                         CLONE_SIGHAND
     │                                         CLONE_THREAD
     ▼                     ▼                        ▼
  separate            shares memory,           same PID (TGID),
  address space       parent suspended         shared heap + fds
  COW pages           until exec/_exit

  Container runtimes add isolation flags on top of fork-like creation:
     ├── CLONE_NEWPID  ──▶ private PID space, child sees itself as PID 1
     ├── CLONE_NEWNS   ──▶ private mount table
     ├── CLONE_NEWNET  ──▶ private interfaces and routing
     ├── CLONE_NEWUTS  ──▶ private hostname
     └── CLONE_NEWUSER ──▶ uid/gid remapping, rootless containers`)
      },
      {
        title: "When fork Is the Wrong Tool: posix_spawn and vfork",
        content:
          "fork has two well-known failure modes. First, forking a huge process to immediately exec a small one duplicates page tables for gigabytes that are about to be thrown away, and on systems without memory overcommit the fork can fail outright even though the child would have needed almost nothing - the JVM hitting this when spawning a helper is a famous case. Second, fork in a multithreaded program is genuinely dangerous: only the calling thread survives, but all the locks held by the other threads are copied in their locked state, with no owner left to release them. If the child then calls malloc, which takes an internal lock, it can deadlock permanently. POSIX's answer is that between fork and exec a child of a threaded parent may only call async-signal-safe functions. posix_spawn sidesteps both problems by expressing the whole fork-adjust-exec sequence declaratively, letting the implementation use vfork or the clone flag CLONE_VFORK internally so no page tables are copied. Modern runtimes increasingly use posix_spawn, or a small pre-forked helper process spawned before any threads exist.",
        diagram: asciiDiagram(`Choosing a creation mechanism

  Need a new flow of control sharing this memory?
        └── Yes ──▶ pthread_create / clone(CLONE_VM|CLONE_THREAD|...)

  Need a new process running a DIFFERENT program?
        │
        ├── Parent is single-threaded and small
        │        └──▶ fork() + exec()    (max flexibility in the window)
        │
        ├── Parent is huge or multithreaded
        │        └──▶ posix_spawn()      (no page-table copy, no lock trap)
        │
        └── Need isolation (containers, sandboxes)
                 └──▶ clone() with CLONE_NEW* namespace flags + cgroups

  Need a copy of THIS program's state (snapshot, prefork worker)?
        └──▶ fork() and rely on copy-on-write
             e.g. Redis BGSAVE, nginx workers, PostgreSQL backends`)
      }
    ],
    examples: [
      {
        title: "Implementing shell redirection",
        input: "The shell must run `sort < in.txt > out.txt` as a child process.",
        output: "fork, dup2 both ends in the child, then execvp sort.",
        explanation:
          "Step 1: fork so the shell keeps running and can wait for the result.\nStep 2: In the child, open in.txt and dup2 it onto descriptor 0, then open out.txt and dup2 it onto descriptor 1.\nStep 3: exec sort, which inherits those descriptors and has no idea it is not talking to a terminal.\nStep 4: The parent waitpids for the exit status - and this only works because fork and exec are separate, giving the child a window to rearrange descriptors with ordinary code."
      },
      {
        title: "Redis background snapshot",
        input:
          "Redis holds 20 GB in memory and must write a consistent point-in-time snapshot without blocking client traffic.",
        output: "fork a child that serialises its copy-on-write view of the heap.",
        explanation:
          "Step 1: fork gives the child a frozen logical snapshot at essentially zero copy cost, because pages are shared read-only.\nStep 2: The child walks its address space and writes the RDB file while the parent keeps serving requests.\nStep 3: Every key the parent modifies during the save triggers a COW fault and duplicates one 4 KB page.\nStep 4: Peak extra memory is therefore proportional to the write rate during the save, which is why Redis documentation warns about overcommit settings and why a write-heavy workload can double memory use mid-snapshot."
      },
      {
        title: "A container start, decoded",
        input: "docker run starts a process that believes it is PID 1 on a private network.",
        output: "clone with namespace flags plus cgroup limits plus pivot_root and exec.",
        explanation:
          "Step 1: The runtime clones with CLONE_NEWPID, CLONE_NEWNS, CLONE_NEWNET, CLONE_NEWUTS and usually CLONE_NEWUSER.\nStep 2: The child sets up the root filesystem with pivot_root so it sees the image rather than the host tree.\nStep 3: It is placed in cgroups that cap CPU, memory, and I/O, which is where exit code 137 comes from when the memory cap is hit.\nStep 4: It execs the container entrypoint - an ordinary Linux process throughout, just with a restricted view, which is why containers start in milliseconds while virtual machines take seconds."
      }
    ],
    tips: [
      "State the fork return convention precisely - zero in the child, the PID in the parent, minus one on error - because sloppiness here is an instant credibility hit.",
      "Mention copy-on-write unprompted; interviewers are usually waiting to see whether you know fork does not really copy memory.",
      "Say that only the calling thread survives fork - it is the single fact behind most fork-related production bugs."
    ],
    tricks: [
      "Open every descriptor with O_CLOEXEC by default and clear it deliberately; leaking sockets into exec'd helpers is both a leak and a security bug.",
      "Always drop the group ID before the user ID when de-privileging a child, because after setuid you no longer have the privilege to call setgid.",
      "If asked what a container is, answer 'a process with namespace clone flags and cgroup limits' - it is accurate and immediately demonstrates the connection to this topic."
    ],
    memoryAids: [
      "fork copies the container, exec replaces the contents.",
      "fork returns twice; exec returns never.",
      "Copy-on-write means fork copies the map, not the territory."
    ],
    interviewPatterns: [
      "Recall plus reasoning: 'What does fork return and why twice?' followed by 'why are they separate calls at all?'",
      "Trap question: 'What is wrong with calling fork in a multithreaded program?' - surviving thread, copied locked mutexes, async-signal-safe rule.",
      "Frequency and companies: Tier 1 at Amazon, Microsoft, Bloomberg, and any Unix systems role; also the standard bridge into container questions."
    ],
    practiceProblems: [
      "How many processes does `fork(); fork(); fork();` create in total, including the original? Answer: Eight processes exist at the end, so seven new ones. Each fork doubles the population, giving 2^3, and the standard follow-up is to print getpid before and after each call to see the tree.",
      "A parent forks a child that execs a helper. The helper unexpectedly holds the parent's listening socket open, so restarting the parent fails with 'address already in use'. What went wrong? Answer: The listening descriptor was not marked close-on-exec, so it was inherited across exec. Open it with O_CLOEXEC or set FD_CLOEXEC with fcntl before exec.",
      "Why can fork() fail with ENOMEM on a 20 GB process even though the child will immediately exec a 1 MB binary? Answer: fork must build a duplicate page-table hierarchy and, when overcommit is disabled, the kernel accounts for the potential private copy of every writable page. posix_spawn or vfork plus exec avoids the accounting entirely because the child never gets an independent address space."
    ],
    faq: [
      {
        question: "Why did Unix separate fork and exec instead of one spawn call?",
        answer:
          "Because the gap between them is a general-purpose configuration point that costs the kernel nothing. After fork the child is a full process running the parent's code, so it can perform any adjustment using ordinary library calls: redirect descriptors with dup2, change directory, alter the environment, drop privileges, set resource limits, install a seccomp filter, or enter new namespaces. A single spawn primitive would have to anticipate every one of those needs as an explicit parameter, and Windows CreateProcess - with its dozen arguments and several attribute structures - illustrates exactly what that looks like. The design also composes beautifully: pipelines, job control, and process supervision all fall out of the same two primitives. The costs are real, though, and modern practice acknowledges them: forking a huge or multithreaded process is problematic, which is why posix_spawn exists as a declarative alternative that implementations can optimise."
      },
      {
        question: "What exactly is unsafe about fork in a multithreaded program?",
        answer:
          "Only the thread that called fork exists in the child, but the child inherits a full copy of the parent's memory - including every mutex, in whatever state it happened to be in at the instant of the fork. If another thread held the malloc arena lock at that moment, the child's copy of that lock is held by a thread that does not exist, so the very next allocation in the child blocks forever. The same applies to stdio locks, logging locks, and any library's internal state. POSIX therefore restricts a child of a multithreaded parent to async-signal-safe functions only until it calls exec, which rules out malloc, printf, and most of the standard library. pthread_atfork handlers were introduced to let libraries acquire their locks before the fork and release them on both sides afterwards, but getting complete coverage across every library in a large program proved impractical, so the modern guidance is simply to use posix_spawn, or to fork a helper process before any threads are created."
      },
      {
        question: "What survives an exec and what does not?",
        answer:
          "Surviving: the process ID and parent process ID, the process group and session, the current working directory and root directory, the umask, resource limits, the real user and group IDs, the signal mask, pending signals, interval timers in some cases, and open file descriptors that lack the close-on-exec flag. Not surviving: the entire address space, so all memory contents, memory mappings, and shared-memory attachments are gone; installed signal handlers, because the handler code no longer exists - though signals that were ignored remain ignored and signals set to default remain default; threads other than the caller; and descriptors marked FD_CLOEXEC. The effective user and group IDs can change if the executed file has the setuid or setgid bit set, which is the mechanism behind programs like sudo and ping. The descriptor rules are the ones tested most often, because inherited descriptors are simultaneously the feature that makes shell redirection work and the bug that leaks sockets into unrelated programs."
      },
      {
        question: "What is vfork and should I ever use it?",
        answer:
          "vfork creates a child that shares the parent's address space rather than getting a copy-on-write duplicate, and it suspends the parent until the child calls exec or _exit. It exists because on systems without copy-on-write, fork genuinely copied everything, making the fork-then-exec pattern enormously wasteful. The child must not return from the function that called vfork and must not modify any variable other than the return value of vfork itself, because it is writing directly into the parent's memory - violating that constraint corrupts the parent in ways that are extremely hard to debug. Because copy-on-write made ordinary fork cheap, vfork became largely obsolete for application code and was even removed from some standards editions before returning. The right modern approach is to use posix_spawn, which is allowed to use vfork or CLONE_VFORK internally where it is safe, giving you the performance benefit without exposing the sharp edges to application code."
      },
      {
        question: "How do containers relate to process creation?",
        answer:
          "A container is not a new kind of object; it is an ordinary Linux process created with extra clone flags and placed under extra restrictions. The namespace flags give it a private view of specific kernel resources - CLONE_NEWPID for process IDs so the entrypoint sees itself as PID 1, CLONE_NEWNS for the mount table, CLONE_NEWNET for interfaces and routing, CLONE_NEWUTS for the hostname, CLONE_NEWIPC for System V objects, and CLONE_NEWUSER for user and group ID remapping which enables rootless containers. Cgroups then impose quantitative limits on CPU shares, memory, PIDs, and I/O bandwidth. The filesystem view is switched with pivot_root onto the container image, and finally the runtime execs the entrypoint. Nothing here is virtualised in the hardware sense - there is one kernel, one scheduler, one page-cache - which is why containers start in milliseconds and why a kernel vulnerability is a container escape risk in a way it is not for a virtual machine."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Kerrisk - The Linux Programming Interface, chapters 24, 27, and 28",
        insight: "Exhaustive inheritance tables for fork and exec, plus the practical consequences of shared open file descriptions."
      },
      {
        source: "paper",
        attribution: "Baumann, Appavoo, Krieger, Roscoe - A fork() in the road (HotOS 2019) - https://dl.acm.org/doi/10.1145/3317550.3321435",
        insight: "A well-argued critique of fork's interaction with threads, large address spaces, and modern hardware - excellent material for the 'why posix_spawn' follow-up."
      },
      {
        source: "note",
        attribution: "Linux manual pages - fork(2), execve(2), clone(2), posix_spawn(3)",
        insight: "clone(2) in particular is the single best reference for seeing processes, threads, and containers as one parameterised mechanism."
      }
    ]
  }
];
