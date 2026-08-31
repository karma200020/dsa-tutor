import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-io-and-system-calls - "OS: I/O and System Calls" (5 topics).

export const osIoAndSystemCallsTopics: Topic[] = [
  {
    id: "topic-os-kernel-and-user-mode",
    moduleId: "mod-os-io-and-system-calls",
    title: "Kernel Mode, User Mode, and the Protection Boundary",
    intuition:
      "Every guarantee an operating system makes rests on one hardware feature: the CPU can run in a privileged mode where all instructions are legal, and an unprivileged mode where the dangerous ones trap. User code physically cannot disable interrupts, load a page table, or touch another process's memory, because the hardware refuses. Everything else - process isolation, memory protection, controlled device access - is built on top of that single asymmetry, and the entire interface between the two worlds is the system call.",
    complexity: {
      time:
        "A modern system call costs roughly 50 to 100 nanoseconds of pure transition on x86-64 with syscall and sysret, but Spectre and Meltdown mitigations raised that substantially - kernel page-table isolation alone can add hundreds of nanoseconds because it flushes address-space state on every crossing. Against a page cache hit measured in hundreds of nanoseconds, the boundary crossing is a first-order cost, which is why batching interfaces such as io_uring and vDSO exist.",
      space:
        "Each thread has a separate kernel stack, typically 8 or 16 KB, allocated for the duration of its life, so a system with 100,000 threads spends over a gigabyte on kernel stacks alone. Deep kernel recursion is therefore forbidden and the kernel uses explicit iteration where user code would recurse."
    },
    lesson: [
      {
        title: "Rings, Privilege, and What User Code Cannot Do",
        content:
          "x86 defines four privilege rings, of which practical operating systems use two: ring 0 for the kernel and ring 3 for user code. ARM uses the equivalent notion of exception levels, with EL0 for applications and EL1 for the kernel. The privilege level is a property of the running CPU, checked by hardware on every instruction and every memory access. In user mode, privileged instructions - loading the page table base register, disabling interrupts, executing an I/O port instruction, halting the processor - fault rather than execute, and every memory access is checked against page table entries whose user-supervisor bit determines whether user code may touch that page at all. This is why a bug in one process cannot corrupt another and why an application cannot simply write to a disk controller. The consequence is that a program which needs to do anything real - open a file, allocate memory, send a packet, create a thread - must ask the kernel to do it, and the only way to ask is a controlled transition that enters the kernel at an address the kernel itself chose. The design principle worth naming in an interview is that the boundary is enforced by hardware rather than by convention, which is exactly why it holds against malicious code and not merely against buggy code.",
        diagram: asciiDiagram(`The protection boundary

  ┌─────────────────────────────────────────────────────────┐
  │  USER MODE  (ring 3 / EL0)                              │
  │                                                          │
  │   your process: browser, database, shell                │
  │   CAN:  arithmetic, its own memory, its own registers   │
  │   CANNOT:                                                │
  │     ├── disable interrupts (cli)                        │
  │     ├── load a page table (mov cr3)                     │
  │     ├── execute I/O port instructions (in / out)        │
  │     ├── halt the CPU (hlt)                              │
  │     └── read any page whose U/S bit says supervisor     │
  │                                                          │
  │   ▶ these do not "fail politely" - the HARDWARE traps.  │
  └─────────────────────────────────────────────────────────┘
                    │                    ▲
       syscall /    │                    │  sysret / eret
       svc / int    │                    │
                    ▼                    │
  ┌─────────────────────────────────────────────────────────┐
  │  KERNEL MODE  (ring 0 / EL1)                            │
  │                                                          │
  │   entry is at an address THE KERNEL CHOSE               │
  │   (MSR_LSTAR on x86-64, VBAR_EL1 on ARM)                │
  │   ──▶ user code cannot jump into the middle of the      │
  │       kernel; it can only arrive at the front door.     │
  │                                                          │
  │   full access: all memory, all devices, all instructions│
  └─────────────────────────────────────────────────────────┘

  THREE WAYS TO CROSS (all of them are traps)
    ├── SYSTEM CALL  - voluntary, synchronous, requested
    ├── EXCEPTION    - involuntary: page fault, divide by
    │                  zero, invalid opcode
    └── INTERRUPT    - asynchronous, from a device or timer;
                       unrelated to the running instruction

  ▶ The kernel is not a process. It is a mode your thread
    enters, running on that thread's own kernel stack.`)
      },
      {
        title: "The Anatomy of a Crossing",
        content:
          "When a thread executes the syscall instruction, the hardware does a specific and minimal set of things: it saves the return address and flags into registers, switches the privilege level to ring 0, and jumps to the address the kernel installed in a model-specific register at boot. Software then takes over. The kernel entry stub switches to the thread's kernel stack, saves the remaining user registers, and validates the system call number against the syscall table before dispatching. Crucially, every pointer the user passed must be treated as hostile: the kernel copies data across the boundary with copy_from_user and copy_to_user rather than dereferencing user pointers directly, because a user pointer might point into kernel memory, might be unmapped, or might be changed by another thread between the check and the use. Getting this wrong produces the classic confused-deputy and time-of-check-to-time-of-use vulnerabilities. On return, sysret restores the user privilege level and jumps back. Two optimisations matter for performance discussion. The vDSO is a small kernel-provided shared library mapped into every process, letting calls like clock_gettime read a kernel-maintained page directly in user mode with no crossing at all. And io_uring amortises the cost differently, using shared ring buffers so that many operations can be submitted and completed with few or even zero crossings.",
        codeExample: `/* What a system call actually is, from three angles. */

/* 1. What you write */
ssize_t n = read(fd, buf, count);

/* 2. What libc does - a thin wrapper, then the instruction.
      x86-64 Linux convention:
        rax = syscall number (0 for read)
        args in rdi, rsi, rdx, r10, r8, r9
        NOT rcx and r11 - the syscall instruction CLOBBERS
        those to hold the return address and flags.        */
static inline long sys_read(int fd, void *buf, size_t n) {
    long ret;
    __asm__ volatile (
        "syscall"
        : "=a" (ret)
        : "a" (0L), "D" (fd), "S" (buf), "d" (n)
        : "rcx", "r11", "memory"
    );
    return ret;                 /* negative = -errno */
}
/*   libc turns a negative return into -1 plus errno.
     This is why a raw syscall returns -EBADF while the libc
     wrapper returns -1 and sets errno = EBADF.            */

/* 3. What the kernel side must never forget */
SYSCALL_DEFINE3(read, unsigned int, fd, char __user *, buf,
                size_t, count)
{
    /*  __user marks a pointer as UNTRUSTED. sparse warns if
        you dereference it directly. NEVER do:
              memcpy(kbuf, buf, count);       // WRONG
        Always:                                              */
    if (copy_to_user(buf, kbuf, count))
        return -EFAULT;
    /*   copy_*_user validates the range, handles faults, and
         cannot be tricked into touching kernel memory.
         Skipping it is the classic privilege-escalation bug.
         Re-reading a user pointer after validating it is the
         classic TOCTOU bug - copy ONCE, then use the copy.  */
}

/* OBSERVING the boundary */
// strace -c ./prog          # count and time syscalls
// strace -T -e trace=read ./prog   # per-call duration
// ltrace ./prog             # library calls instead

/* AVOIDING the boundary */
// vDSO: clock_gettime(), gettimeofday(), getcpu(), time()
//   are served from a kernel-maintained page mapped into
//   your address space ──▶ NO transition at all.
// ldd /bin/ls  ──▶  linux-vdso.so.1 (not a real file)

/* SECCOMP - restricting which crossings are even allowed */
prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog);
/*   a BPF program inspects the syscall number and arguments
     and returns ALLOW / ERRNO / KILL / TRAP. This is how
     container and browser sandboxes shrink the kernel attack
     surface from ~350 syscalls to a few dozen.             */`
      },
      {
        title: "Why the Crossing Got Expensive Again",
        content:
          "For most of the 2000s the trend was downward: the int 0x80 software interrupt cost hundreds of cycles, and dedicated syscall and sysenter instructions cut that to well under a hundred nanoseconds by avoiding the general trap machinery. Then the speculative execution vulnerabilities of 2018 reversed the trend. Meltdown showed that user code could speculatively read kernel memory that happened to be mapped in its own address space, so the mitigation - kernel page-table isolation - stopped mapping the kernel into user page tables at all, which means every crossing now switches address spaces and pays TLB costs. Spectre mitigations added indirect branch barriers on entry. The measured effect varied enormously by workload: compute-bound programs barely noticed, while syscall-heavy workloads such as databases and network servers lost anywhere from five to thirty percent. This is the direct reason io_uring was designed and adopted so quickly - it replaces per-operation crossings with shared submission and completion ring buffers, so thousands of operations can be issued with one crossing or, in polled mode, none. The general lesson is that the cost of a boundary is not fixed by physics but by the security properties you need from it, and that batching is the standard response to a boundary becoming expensive.",
        diagram: asciiDiagram(`The cost of crossing, over time

  int 0x80 (legacy)      ████████████████████  ~500+ ns
  sysenter / syscall     ███                    ~50-100 ns
  + KPTI (Meltdown)      ███████                ~200-800 ns
  + retpoline (Spectre)  ████████               more still

  ▶ Compare against the work being done:
      page cache hit        ~1 us     ── crossing is ~10-50%
      NVMe read             ~80 us    ── crossing is noise
      network round trip    ~500 us   ── crossing is nothing
    The boundary matters when the WORK is small.

  WHY KPTI IS EXPENSIVE
    before:  ┌──────────── one address space ────────────┐
             │ user pages │ kernel pages (supervisor U/S)│
             └────────────────────────────────────────────┘
             crossing = flip a privilege bit. Cheap.
             ◀── but Meltdown could SPECULATIVELY read the
                 kernel half before the permission check
                 retired, leaking it via a cache side channel.

    after:   ┌── user space ──┐   ┌── kernel space ──┐
             │ user pages     │   │ kernel pages     │
             │ tiny trampoline│   │ everything       │
             └────────────────┘   └──────────────────┘
             crossing = SWITCH PAGE TABLES ──▶ TLB cost
             (PCID tags soften this on newer CPUs)

  THE RESPONSE: BATCH, or ELIMINATE
    ┌──────────────────────────────────────────────────────┐
    │ vDSO      ── no crossing at all for clock_gettime,   │
    │              gettimeofday, getcpu                    │
    │ io_uring  ── shared SQ/CQ ring buffers in mmap'd     │
    │              memory. Submit N ops, cross ONCE.       │
    │              SQPOLL mode: a kernel thread polls the  │
    │              ring ──▶ ZERO crossings in steady state │
    │ sendfile  ── move a file to a socket without ever    │
    │ splice       copying through user space              │
    │ readv/writev ── one call, many buffers               │
    └──────────────────────────────────────────────────────┘

  ▶ Every one of these is the same idea: make the amount of
    work per crossing larger.`)
      }
    ],
    examples: [
      {
        title: "A program spending 40 percent of its time in the kernel",
        input: "strace -c shows 3 million read calls of 64 bytes each.",
        output: "The boundary cost dominates because each crossing does almost no work.",
        explanation:
          "Step 1: Each read moves 64 bytes but pays a full transition, argument validation, and copy setup.\nStep 2: With the crossing at roughly 200 nanoseconds under mitigations, three million calls is 0.6 seconds of pure overhead.\nStep 3: Buffering in user space so each read fetches 64 KB reduces the call count by a thousandfold.\nStep 4: This is exactly why stdio buffers, why readv exists, and why unbuffered I/O in a loop is one of the most common performance mistakes."
      },
      {
        title: "clock_gettime that never enters the kernel",
        input: "A tight loop calls clock_gettime a million times and strace shows nothing.",
        output: "The vDSO served it entirely in user mode.",
        explanation:
          "Step 1: The kernel maps a small shared library, the vDSO, into every process's address space.\nStep 2: It maintains a page of timekeeping data that the vDSO code reads directly.\nStep 3: Because the read happens in user mode, no privilege transition occurs, so strace sees no system call.\nStep 4: This is why timing calls are cheap enough to instrument hot paths, and it is a good illustration that the fastest system call is the one that is not a system call."
      },
      {
        title: "A container escape blocked by seccomp",
        input: "Exploit code calls an obscure syscall to reach a vulnerable kernel path.",
        output: "The seccomp filter returned KILL before the kernel handler ran.",
        explanation:
          "Step 1: The kernel exposes roughly 350 system calls, but a typical application uses a few dozen.\nStep 2: A seccomp BPF filter inspects the syscall number and arguments at the entry point, before dispatch.\nStep 3: Calls outside the allowed set are denied with an error or terminate the process outright.\nStep 4: This shrinks the attack surface enormously, which is why Docker, Chrome, and systemd all install seccomp filters and why it is the standard answer to hardening a sandbox."
      }
    ],
    tips: [
      "State plainly that the boundary is enforced by hardware, not convention - that is what makes it hold against malicious code.",
      "Mention copy_from_user and the untrusted-pointer discipline when asked what the kernel does on a syscall; it separates memorised answers from understood ones.",
      "Bring up KPTI and io_uring together: the mitigation raised the cost, the interface amortises it."
    ],
    tricks: [
      "The vDSO makes some calls free, which is why strace shows nothing for clock_gettime.",
      "A raw syscall returns a negative errno; the libc wrapper converts it to -1 plus errno, which explains the two conventions you see in kernel versus application code.",
      "The syscall instruction clobbers rcx and r11 on x86-64, which is why they are not used for arguments."
    ],
    memoryAids: [
      "Ring 3 asks, ring 0 acts; the door is at an address only the kernel can choose.",
      "Three ways in: syscall (voluntary), exception (involuntary), interrupt (asynchronous).",
      "The fastest syscall is no syscall - vDSO eliminates, io_uring batches."
    ],
    interviewPatterns: [
      "Conceptual: 'what happens when you call read' - trace the full path from libc to the kernel handler.",
      "Security: 'why can't a process write to the disk directly' and 'how does seccomp harden a container'.",
      "Frequency and companies: Tier 1 for systems, security, and infrastructure roles; a very common warm-up question generally."
    ],
    practiceProblems: [
      "Why is a system call more expensive than a function call? Answer: A function call is a jump and a stack push, costing a few nanoseconds. A system call is a privilege transition: the hardware changes rings and jumps to a fixed kernel entry point, the kernel switches to the thread's kernel stack, saves user registers, validates the call number, and validates every user pointer before copying data across the boundary; on return it reverses all of that. Post-Meltdown, kernel page-table isolation also switches address spaces on each crossing, adding TLB pressure. The result is roughly a hundredfold difference. The practical consequence is that interfaces should be designed so each crossing does substantial work - which is what buffering, readv, sendfile, and io_uring all achieve.",
      "How does the kernel safely handle a pointer passed from user space? Answer: By treating it as hostile and never dereferencing it directly. The pointer is marked with the __user annotation so static analysis flags misuse, and all access goes through copy_from_user and copy_to_user, which validate that the range lies within user address space and handle page faults gracefully by returning EFAULT rather than oopsing. Two classes of bug follow from getting this wrong: dereferencing directly lets a user pointer aimed at kernel memory turn the kernel into a confused deputy that reads or writes on the attacker's behalf, and validating a value and then re-reading it from user memory creates a time-of-check-to-time-of-use race, because another thread can change it in between. The discipline is to copy once into kernel memory and then use only the copy.",
      "What is the vDSO and why does it exist? Answer: The vDSO is a small shared library that the kernel maps into every process's address space at exec time, containing user-mode implementations of a handful of system calls that need only read kernel-maintained data. clock_gettime, gettimeofday, time, and getcpu are the usual members. The kernel keeps a page of timekeeping state up to date, and the vDSO code reads it directly using a seqlock to get a consistent snapshot, so no privilege transition happens at all. It exists because those calls are made extremely frequently - every logging statement, every timeout check, every latency measurement - and paying a full crossing for what amounts to reading a variable was pure waste. It also gives the kernel a place to hide CPU-specific details, since it can ship different implementations depending on the available timekeeping hardware without applications noticing."
    ],
    faq: [
      {
        question: "What actually happens, step by step, when a program calls read?",
        answer:
          "The application calls the libc wrapper, which is an ordinary function. The wrapper places the system call number for read into rax and the arguments into rdi, rsi, and rdx following the kernel calling convention, which differs from the ordinary C convention in that it uses r10 rather than rcx for the fourth argument, because the syscall instruction clobbers rcx and r11 to hold the return address and flags. Executing syscall causes the hardware to switch to ring 0 and jump to the address the kernel installed in the LSTAR model-specific register at boot; user code cannot influence that address, which is why it cannot jump into the middle of the kernel. The kernel entry stub then does the software half: switches to the thread's kernel stack, saves the remaining user registers into a pt_regs structure, applies any speculation mitigations, and, if kernel page-table isolation is enabled, switches to the full kernel page tables. It validates the call number against the size of the syscall table, runs any seccomp filter, and dispatches to the handler. The handler looks up the file descriptor in the process's file table, obtains the file object, dispatches through its operations vector to the filesystem or socket implementation, and either satisfies the request from the page cache or sleeps until the underlying I/O completes. Data is moved to the user buffer with copy_to_user, never by dereferencing the pointer directly. On return, the value is placed in rax as a negative errno on failure, pending signals and rescheduling are checked, registers are restored, and sysret returns to ring 3, where libc converts a negative return into -1 plus errno."
      },
      {
        question: "Why can't user code simply access hardware directly?",
        answer:
          "Because the hardware refuses, and that refusal is the foundation of every isolation guarantee the system makes. On x86, the instructions that talk to devices through I/O ports are privileged and fault when executed in ring 3, and memory-mapped device registers live on pages whose page table entries are marked supervisor-only, so a user access to them faults too. The reasons this design won are worth stating separately. Isolation: if any process could program a disk controller, it could read or overwrite any file regardless of permissions, so the entire filesystem security model would be decorative. Arbitration: devices are shared, and something must serialise access, queue requests, and allocate bandwidth, which requires a single authority rather than mutual cooperation between untrusting programs. Abstraction: applications work with files and sockets rather than sector numbers and Ethernet frames, so hardware can change without breaking software. Correctness: device programming involves precise register sequences and DMA setup where a mistake corrupts memory or hangs the machine. There are controlled exceptions that prove the rule - iopl and ioperm can grant a privileged process direct port access, VFIO and userspace drivers such as DPDK and SPDK map device registers into a process behind an IOMMU that constrains what the device can touch - and each one is accompanied by hardware-enforced containment rather than trust. Notably, these bypasses exist precisely because the crossing is expensive, and they trade isolation for latency in exactly the way high-frequency networking and storage workloads demand."
      },
      {
        question: "How did Meltdown and Spectre change system call performance?",
        answer:
          "Before 2018 the kernel was mapped into every process's address space, present but marked supervisor-only in the page tables, so a crossing needed only a privilege change - no address space switch, and the TLB entries stayed valid. Meltdown demonstrated that this was unsafe: a CPU would speculatively execute a load from a kernel address before the permission check retired, and although the architectural result was discarded, the load's effect on the cache remained measurable, so an attacker could reconstruct kernel memory a bit at a time through a cache side channel. The mitigation, kernel page-table isolation, removes the kernel mapping from user page tables entirely, leaving only a small trampoline, which means every system call and every interrupt now switches page tables in both directions. That is inherently more expensive, and on processors without process-context identifiers it causes TLB flushes as well; PCID tagging reduces but does not eliminate the cost. Spectre mitigations layered on further work at the boundary, including indirect branch predictor barriers and retpoline-style call sequences. The measured impact ranged from negligible for compute-bound workloads to twenty or thirty percent for syscall-intensive ones such as databases, proxies, and anything doing small-granularity I/O. The architectural response was to reduce the number of crossings rather than to make each cheaper, which is the direct motivation for io_uring's shared ring buffers and for the renewed interest in batching interfaces generally."
      },
      {
        question: "What is seccomp and how does it fit into the boundary?",
        answer:
          "Seccomp is a filter that runs at the system call entry point, after the kernel has recovered the call number and arguments but before it dispatches to the handler. In its modern filter mode, the process installs a BPF program that inspects the architecture, the syscall number, and the raw argument registers, and returns a verdict: allow the call, fail it with a chosen errno, trap to a signal handler, log it, notify a supervising process, or kill the calling thread or the whole process. Once installed, a filter cannot be removed or weakened, and any child inherits it, so it is a one-way narrowing of privilege that composes safely with fork and exec. Its purpose is attack surface reduction. The kernel exposes roughly 350 system calls, many of them obscure, and historically a large fraction of privilege escalation bugs have lived in rarely-exercised handlers; an application that only needs read, write, mmap, futex, and a few dozen others gains nothing from the rest being reachable. Docker's default profile blocks around forty calls outright, Chrome's renderer processes run under a very tight filter, and systemd exposes it through SystemCallFilter directives. The important limitation is that the filter cannot dereference pointer arguments, because doing so would reintroduce a time-of-check-to-time-of-use race where another thread modifies the pointed-to data after the check and before the handler reads it, so filtering on a path name or a socket address is not possible - only on scalar arguments such as flags and file descriptors."
      },
      {
        question: "Is the kernel a separate process, and what does it mean to say a thread is 'in the kernel'?",
        answer:
          "The kernel is not a process and does not have its own scheduling entity for ordinary work; it is a mode that a thread enters. When your thread calls read, it is still your thread - the same task structure, the same scheduling priority, the same accounting - but it is now executing kernel code at ring 0 on that thread's dedicated kernel stack, which is a separate 8 or 16 KB region allocated when the thread was created. That is why the time is charged to your process and shows up as system time rather than being attributed to some kernel entity, and why a blocking system call blocks your thread specifically rather than the kernel. It also explains several practical facts. Kernel stacks are small and fixed, so kernel code avoids deep recursion and large stack allocations, using iteration and heap allocation where user code would recurse. A thread in a system call can be preempted on a preemptible kernel, and can sleep, in which case the scheduler saves its kernel-mode context exactly as it would save user context. Memory cost is real: a hundred thousand threads consume more than a gigabyte in kernel stacks alone before any user memory is counted, which is one of the reasons thread-per-connection servers do not scale and why async models exist. The kernel does also have genuine kernel threads - kswapd, the writeback flushers, ksoftirqd - which are scheduling entities with no user address space, but those are separate from the mode-switching that a system call performs."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Bovet and Cesati - Understanding the Linux Kernel, chapter on system calls",
        insight: "The most careful treatment of the entry path, argument validation, and why user pointers are never dereferenced directly."
      },
      {
        source: "paper",
        attribution: "Lipp et al. - Meltdown, and Kocher et al. - Spectre Attacks (2018)",
        insight: "The primary sources for why the kernel mapping was removed from user page tables and why crossings became expensive again."
      },
      {
        source: "note",
        attribution: "Linux kernel Documentation/userspace-api/seccomp_filter.rst",
        insight: "Explains the filter model, its verdicts, and precisely why pointer arguments cannot be inspected."
      }
    ]
  },
  {
    id: "topic-os-interrupts-and-exceptions",
    moduleId: "mod-os-io-and-system-calls",
    title: "Interrupts, Exceptions, and Deferred Work",
    intuition:
      "A CPU cannot afford to ask a device repeatedly whether it is finished, so devices interrupt instead - they raise a line, the processor abandons what it was doing between instructions, and it jumps to a handler the kernel installed. That inversion of control is what lets one processor manage hundreds of devices. But it creates a hard constraint: the handler runs with the interrupted thread's context stolen and often with interrupts disabled, so it must be extremely short. Everything interesting therefore gets deferred to a second stage that runs with interrupts on and is allowed to sleep.",
    complexity: {
      time:
        "Interrupt latency - the delay from a device raising the line to the handler's first instruction - is typically a few microseconds on a general-purpose kernel and under ten on a real-time one. The handler itself should finish in nanoseconds to low microseconds. A high-rate device can deliver hundreds of thousands of interrupts per second, at which point per-interrupt overhead alone can consume a core, which is what coalescing and polling exist to prevent.",
      space:
        "Each CPU has an interrupt stack, separate from any thread stack, because an interrupt can arrive while a thread is deep in the kernel. The interrupt descriptor table on x86 has 256 entries, of which the first 32 are reserved for architecture-defined exceptions, leaving the rest for device vectors that the kernel allocates and programs into the interrupt controller."
    },
    lesson: [
      {
        title: "Three Kinds of Trap, and Why the Distinction Matters",
        content:
          "Everything that diverts the processor from sequential execution is a trap, but the three kinds behave very differently and confusing them produces wrong answers. An interrupt is asynchronous: it comes from outside the CPU, from a device or the timer, and bears no relation to the instruction that happens to be executing, so it is delivered cleanly between instructions and the interrupted work resumes exactly where it left off. An exception, or fault, is synchronous and caused by the current instruction - a page fault, a divide by zero, an invalid opcode - so it is inherently attributable to the running thread, and the important subclass is the fault, which is restartable: the handler fixes the condition, such as by allocating a page, and the offending instruction is re-executed as though nothing happened. A trap in the narrow sense is a deliberate exception used to request service, which is how int 0x80 worked and how breakpoints work. The distinction matters because it determines who is charged for the time, whether the work can be resumed, and what the handler is allowed to do: a page fault handler runs in the faulting thread's context and may sleep waiting for I/O, whereas a device interrupt handler runs in whatever context it stole and may not sleep at all, because there is no meaningful thread to block.",
        diagram: asciiDiagram(`Three kinds of trap

  ┌───────────────┬──────────────┬────────────────────────────┐
  │               │ SOURCE       │ RESUMES                    │
  ├───────────────┼──────────────┼────────────────────────────┤
  │ INTERRUPT     │ external     │ at the NEXT instruction    │
  │  (async)      │ device,timer │ - the interrupted work was │
  │               │              │   innocent                 │
  ├───────────────┼──────────────┼────────────────────────────┤
  │ FAULT         │ the CURRENT  │ RE-EXECUTES the SAME       │
  │  (sync)       │ instruction  │ instruction after the      │
  │               │ page fault,  │ handler fixes things       │
  │               │ #GP, #UD     │ ◀── this is how demand     │
  │               │              │     paging is invisible    │
  ├───────────────┼──────────────┼────────────────────────────┤
  │ TRAP / ABORT  │ deliberate   │ next instruction (trap),   │
  │               │ int3, int80  │ or NOT AT ALL (abort:      │
  │               │              │ machine check, double      │
  │               │              │ fault)                     │
  └───────────────┴──────────────┴────────────────────────────┘

  DELIVERY PATH of a device interrupt

    device raises line
        │
        ▼
    ┌────────────────────┐
    │ interrupt          │  decides WHICH CPU, and whether
    │ controller         │  the vector is masked
    │ (APIC / GIC)       │
    └────────────────────┘
        │  vector number
        ▼
    ┌────────────────────┐
    │ CPU finishes the   │   ◀── delivered BETWEEN
    │ current instruction│       instructions, never
    │ then looks up IDT  │       in the middle of one
    │ entry[vector]      │
    └────────────────────┘
        │
        ▼
    switch to the per-CPU INTERRUPT STACK
    (not the thread's stack - an interrupt can arrive while
     a thread is already deep inside the kernel)
        │
        ▼
    run the handler ── with this vector MASKED, and
                       historically with interrupts OFF
        │
        ▼
    acknowledge (EOI) ──▶ restore ──▶ resume

  ▶ The interrupted thread is charged nothing and knows
    nothing. Its registers are saved and restored exactly.`)
      },
      {
        title: "Top Half, Bottom Half: Why Handlers Are Split",
        content:
          "An interrupt handler runs in a borrowed context with no process to block and, in the classic model, with its own interrupt line masked and often all interrupts disabled, so any time it spends is time during which further interrupts are delayed or lost and some unrelated thread is stalled. It therefore may not sleep, may not take a mutex that could sleep, and may not allocate memory in a way that could block. But real device work - copying a received packet up the network stack, waking the process that was waiting for a disk read, running filesystem completion logic - is far too large for that budget. Linux resolves this by splitting the work. The top half is the actual handler: it acknowledges the device so the line drops, does the minimum required to keep the hardware moving, such as reading a status register or pulling a descriptor off a ring, records what needs doing, and returns. The bottom half runs later with interrupts enabled and does the real work, in one of several mechanisms with different rules. Softirqs are statically defined, run on the same CPU, can run concurrently on different CPUs, and cannot sleep; tasklets are built on softirqs and are serialised per tasklet, which makes them easier but less scalable; workqueues run in kernel threads and therefore can sleep, allocate, and take mutexes, which makes them the right choice whenever the deferred work might block. Threaded interrupt handlers generalise this by running the entire handler in a dedicated kernel thread, which is the default in real-time kernels because it makes interrupt work schedulable and preemptible.",
        codeExample: `/* Registering a handler and deferring the real work. */

#include <linux/interrupt.h>
#include <linux/workqueue.h>

static struct work_struct my_work;

/* BOTTOM HALF - runs in a kernel thread. MAY SLEEP. */
static void my_work_fn(struct work_struct *w)
{
    mutex_lock(&dev->lock);           /* legal here */
    process_received_packets(dev);    /* may allocate, may
                                         block on I/O      */
    mutex_unlock(&dev->lock);
}

/* TOP HALF - the actual interrupt handler.
   MUST NOT sleep. MUST NOT take a mutex. MUST be short. */
static irqreturn_t my_handler(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;
    u32 status = readl(dev->regs + STATUS);

    if (!(status & IRQ_PENDING))
        return IRQ_NONE;              /* not ours - shared
                                         line, let the next
                                         handler try       */

    writel(status, dev->regs + STATUS);   /* ACK the device */
    schedule_work(&my_work);              /* defer the rest */
    return IRQ_HANDLED;
}

/* Registration. IRQF_SHARED means the line is shared, so the
   handler MUST check whether the interrupt was really ours
   and return IRQ_NONE if not - otherwise a spurious storm on
   someone else's device looks like ours.                    */
request_irq(irq, my_handler, IRQF_SHARED, "mydev", dev);

/* THREADED handler - top half + a thread fn in one call.
   The thread fn may sleep. This is the modern default and
   the mandatory form under PREEMPT_RT.                     */
request_threaded_irq(irq, my_quick_check, my_thread_fn,
                     IRQF_ONESHOT, "mydev", dev);

/* LOCKING ACROSS THE BOUNDARY - the classic deadlock.
   Thread context takes a lock; an interrupt arrives on the
   SAME CPU and its handler wants the same lock. The handler
   spins forever because the thread it preempted can never
   run to release it.                                       */
spin_lock_irqsave(&dev->lock, flags);   /* disables IRQs on
                                           THIS cpu ◀── the
                                           fix               */
/* ... critical section shared with the handler ... */
spin_unlock_irqrestore(&dev->lock, flags);
/*   Inside the handler, plain spin_lock() suffices - IRQs
     are already off there.                                 */

/* OBSERVING */
// cat /proc/interrupts     # per-CPU counts per vector
// cat /proc/softirqs       # NET_RX, NET_TX, TIMER, BLOCK...
// mpstat -P ALL 1          # %irq and %soft per CPU
// cat /proc/irq/24/smp_affinity_list   # which CPUs may take it
// echo 2-5 > /proc/irq/24/smp_affinity_list`
      },
      {
        title: "When Interrupts Become the Bottleneck",
        content:
          "Interrupts are an optimisation over polling, but the optimisation inverts at high rates. A ten gigabit interface receiving small packets can generate over a million events per second, and at a few microseconds of overhead each, that consumes a core entirely before any packet is processed - a receive livelock, where the system spends all its time acknowledging interrupts and none doing work, and throughput collapses as load increases rather than plateauing. The responses form a clear progression. Coalescing has the device wait for several events or a short timer before raising the line, trading a little latency for far fewer interrupts, and is configured with ethtool -C. NAPI goes further by switching modes: on the first interrupt the driver disables further interrupts for that queue and polls the ring until it drains, then re-enables them, so the system is interrupt-driven when idle and poll-driven when busy, which is the best of both. Multi-queue devices with MSI-X spread interrupts across many vectors so different CPUs handle different queues, and receive-side scaling hashes flows to queues so a connection's packets always land on the same core and stay cache-warm. At the extreme, kernel-bypass frameworks such as DPDK dedicate a core to pure polling and never take an interrupt at all, which is only sensible when the load is known to be continuously high. The same pattern appears in storage with NVMe polled completions, and it is the general lesson: interrupt when events are rare, poll when they are dense.",
        diagram: asciiDiagram(`Receive livelock and the escape from it

  throughput
      │        ideal (plateau)
      │      ┌─────────────────────────
      │     ╱
      │    ╱   ▒▒▒
      │   ╱  ▒▒   ▒▒▒
      │  ╱ ▒▒         ▒▒▒▒            ◀── LIVELOCK: throughput
      │ ╱▒▒               ▒▒▒▒▒▒          FALLS as load rises
      └──────────────────────────────▶ offered load

  ▶ every cycle goes to taking and acknowledging interrupts;
    none is left to actually process the packets.

  THE PROGRESSION OF FIXES

  1. COALESCING - device waits before raising the line
     ethtool -C eth0 rx-usecs 100 rx-frames 64
     ┌────────────────────────────────────────────┐
     │ 1 interrupt per packet  ──▶ 1 per 64       │
     │ cost: up to 100 us of added latency        │
     └────────────────────────────────────────────┘

  2. NAPI - switch modes based on load
     idle    ──▶ INTERRUPT-driven (low latency, no spin)
       │ first packet arrives
       ▼
     DISABLE that queue's interrupts
       │
       ▼
     POLL the ring until empty ──▶ many packets, ZERO
                                   further interrupts
       │ ring drained
       ▼
     RE-ENABLE interrupts ──▶ back to idle mode
     ▶ interrupt-driven when quiet, polled when busy.

  3. MULTI-QUEUE + MSI-X + RSS
     ┌──────── NIC ────────┐
     │ q0 │ q1 │ q2 │ q3   │  hash(5-tuple) ──▶ queue
     └──┬───┬────┬────┬────┘
        │   │    │    │       each queue has its OWN vector
        ▼   ▼    ▼    ▼
      cpu0 cpu1 cpu2 cpu3     ──▶ parallel, and a flow always
                                  lands on the SAME core, so
                                  its socket state stays
                                  cache-warm

  4. FULL POLLING - DPDK, SPDK, NVMe poll queues
     dedicate a core, spin forever, never take an interrupt
     ▶ lowest latency, but burns 100% of a core even at idle.
       Only correct when load is KNOWN to be continuous.

  ▶ THE RULE: interrupt when events are RARE,
              poll when events are DENSE.`)
      }
    ],
    examples: [
      {
        title: "A network card consuming a whole core at idle traffic levels",
        input: "mpstat shows 100 percent %soft on CPU 0 while other cores are idle.",
        output: "All device interrupts are pinned to one CPU and NET_RX softirq saturates it.",
        explanation:
          "Step 1: /proc/interrupts shows every vector for the NIC incrementing only on CPU 0.\nStep 2: Each interrupt schedules a NET_RX softirq, which runs on the same CPU that took the interrupt.\nStep 3: With a single queue there is no way to spread the work, so one core does all receive processing.\nStep 4: Enabling multiple queues with MSI-X, distributing smp_affinity across cores, and enabling RSS spreads flows over CPUs; irqbalance does this automatically but is often disabled on tuned systems in favour of explicit pinning."
      },
      {
        title: "A driver deadlock that only happens under load",
        input: "The machine hangs with a spinlock held, in a handler, on one CPU.",
        output: "Thread context took a lock without disabling interrupts.",
        explanation:
          "Step 1: A kernel thread acquired a spinlock shared with the interrupt handler using plain spin_lock.\nStep 2: An interrupt arrived on the same CPU while the lock was held.\nStep 3: The handler tried to take the same lock and spun, but the thread holding it cannot run until the handler returns.\nStep 4: The lock must be taken with spin_lock_irqsave in thread context so interrupts are disabled on that CPU for the duration; inside the handler plain spin_lock is sufficient because interrupts are already off."
      },
      {
        title: "Latency improving after enabling coalescing but throughput mattering more",
        input: "A trading system disables rx coalescing entirely and accepts higher CPU cost.",
        output: "Latency and throughput are being traded deliberately.",
        explanation:
          "Step 1: Coalescing makes the device wait for several packets or a timer before interrupting, reducing interrupt count.\nStep 2: That wait is added directly to the latency of the first packet in each batch.\nStep 3: A throughput-oriented server wants large batches; a latency-sensitive one wants none.\nStep 4: Setting rx-usecs to 0 removes the wait at the cost of far more interrupts, which is only affordable if there is CPU headroom - the same trade-off DPDK resolves by polling continuously."
      }
    ],
    tips: [
      "Lead with the top-half/bottom-half split when asked about interrupt handling; it is the organising idea and it explains every rule that follows.",
      "Say explicitly that an interrupt handler has no process context and therefore cannot sleep - that single fact derives the whole design.",
      "Mention NAPI as the resolution of the interrupt-versus-poll debate rather than picking a side."
    ],
    tricks: [
      "A fault re-executes the offending instruction while an interrupt resumes at the next one, which is exactly why demand paging is invisible to the program.",
      "Softirqs run on the CPU that took the interrupt, so pinning interrupts also pins the deferred work.",
      "Shared interrupt handlers must return IRQ_NONE when the interrupt was not theirs, or the kernel cannot detect a spurious storm."
    ],
    memoryAids: [
      "Top half acknowledges, bottom half works; only the bottom half may sleep.",
      "Interrupt equals asynchronous and innocent; fault equals synchronous and restartable.",
      "Interrupt when rare, poll when dense - NAPI does both."
    ],
    interviewPatterns: [
      "Conceptual: 'why can't an interrupt handler sleep' and 'what is a bottom half' - the standard driver questions.",
      "Performance: 'one core is at 100 percent soft interrupt time' - queue and affinity diagnosis.",
      "Frequency and companies: Tier 1 for kernel, driver, and networking roles; Tier 2 for SRE as a saturation-diagnosis question."
    ],
    practiceProblems: [
      "Why can an interrupt handler not sleep? Answer: Because there is nothing meaningful to put to sleep. The handler runs in whatever context it interrupted, borrowing that thread's identity without any relationship to it, so blocking would suspend an arbitrary innocent thread that has nothing to do with the device - and on return there would be no correct way to resume, since the scheduler would have to pick something to run while an interrupt was still in progress. Additionally the handler often runs with its own line masked and interrupts disabled, so any delay directly increases interrupt latency for the whole system and can cause events to be lost. This is why anything that might block - allocating memory that could wait for reclaim, taking a mutex, waiting for I/O - must be deferred to a workqueue or a threaded handler that runs in a real kernel thread with a real context.",
      "What is receive livelock and how is it avoided? Answer: Livelock occurs when a device generates interrupts faster than the system can process the events they signal, so the CPU spends all its time entering and acknowledging handlers and none running the bottom halves that actually consume the data. The signature is throughput that falls as offered load rises, rather than plateauing. It is avoided by decoupling the event rate from the interrupt rate. Coalescing makes the device batch events before signalling. NAPI is the general solution: on the first interrupt the driver disables that queue's interrupts and polls the ring until it is empty, then re-enables them, so the system behaves as interrupt-driven when idle and poll-driven when saturated. At the extreme, dedicating a core to continuous polling as DPDK does removes interrupts entirely, which is worthwhile only when load is reliably high.",
      "You see 100 percent softirq time on one CPU. What do you check? Answer: First /proc/interrupts, to see whether all of the device's vectors are incrementing on that single CPU, which indicates either a single-queue device or affinity pinned to one core. Then /proc/softirqs to identify which softirq dominates - NET_RX points at receive processing, BLOCK at storage completions, TIMER at timer expiry. Then whether the device supports multiple queues and MSI-X, checked with ethtool -l, and whether receive-side scaling is distributing flows. The fixes in order are: enable and size multiple queues, spread the vectors across cores via smp_affinity or irqbalance, enable RSS or RPS so flow processing parallelises, and tune coalescing to reduce the interrupt rate if there is latency budget for it. If a single flow is the source, RSS cannot help, because a flow hashes to one queue by design, and the answer is to spread the load across connections."
    ],
    faq: [
      {
        question: "What is the difference between an interrupt and an exception, and why does it matter?",
        answer:
          "An interrupt is asynchronous and externally caused: a device or the timer raises a signal that has no relationship to whatever instruction the CPU happens to be executing. It is delivered cleanly between instructions, the interrupted work is entirely innocent, and execution resumes at the next instruction as though nothing occurred. An exception is synchronous and caused by the executing instruction itself - a page fault because the referenced page is not present, a general protection fault, an invalid opcode, a divide by zero. The subclassification matters: a fault is detected before the instruction completes and is restartable, so after the handler fixes the condition the same instruction is re-executed, which is precisely the mechanism that makes demand paging invisible to programs; a trap is reported after completion and resumes at the next instruction, which is how breakpoints and the legacy int 0x80 system call work; an abort is unrecoverable, such as a machine check or double fault, and there is no resuming. The practical consequences are substantial. An exception has a clear responsible thread, so its cost is charged to that process and the handler runs in that thread's context and may sleep - a page fault handler routinely waits for disk I/O. An interrupt has no responsible thread, so nothing may block, the time is charged to whoever was unlucky enough to be running, and all substantial work must be deferred. Confusing the two leads directly to wrong answers about what a handler may do."
      },
      {
        question: "Why is interrupt handling split into a top half and a bottom half?",
        answer:
          "Because the two halves face opposite constraints and cannot be satisfied by one piece of code. The top half runs in the most restricted environment the kernel has: no process context to block, the device's interrupt line masked, historically all interrupts disabled on that CPU, and an unrelated thread stalled for the entire duration. Everything it does adds directly to interrupt latency for the whole machine and risks losing events from other devices. So the top half is limited to the minimum that keeps the hardware moving - read a status register, acknowledge the device so the line drops, pull descriptors off a ring into a queue, record what happened - and then it returns. The actual work is deferred. Linux offers several bottom-half mechanisms with different capabilities: softirqs are statically defined, run on the CPU that took the interrupt with interrupts enabled, can execute concurrently on different CPUs, and still cannot sleep; tasklets are built on softirqs and serialised per instance, simpler but less scalable; workqueues run in real kernel threads and therefore may sleep, allocate with blocking flags, and take mutexes, which makes them the right choice whenever the work might block. Threaded interrupt handlers unify this by moving the whole handler into a dedicated kernel thread with only a tiny hard-IRQ stub remaining, which makes interrupt work schedulable, preemptible, and priority-controllable - and is mandatory under PREEMPT_RT, because unbounded interrupt work is exactly what destroys real-time latency guarantees."
      },
      {
        question: "How does NAPI resolve the interrupt-versus-polling trade-off?",
        answer:
          "It refuses to choose statically and instead switches based on observed load. Pure interrupt-driven receive is ideal at low rates: the CPU does nothing until a packet arrives, and latency is minimal because the handler runs immediately. It fails at high rates because each packet costs a full interrupt entry and exit, and beyond some threshold the machine spends every cycle on interrupt overhead and none on processing, so throughput collapses - receive livelock. Pure polling is ideal at high rates, since a single loop drains many packets with no per-packet overhead, but it wastes an entire core when traffic is light. NAPI's mechanism is simple: when the first packet arrives, the driver's handler disables further interrupts for that queue and schedules the NAPI poll routine. That routine then processes packets from the ring in a loop, bounded by a budget so it cannot monopolise the CPU, and if it drains the ring completely it re-enables interrupts and goes back to sleep; if the budget is exhausted with packets remaining, it stays in poll mode and is rescheduled. The result is that the system is interrupt-driven exactly when that is cheap and poll-driven exactly when that is efficient, with the transition happening automatically per queue. The same idea appears in storage, where NVMe supports polled completion queues used by latency-sensitive workloads, and in the hybrid polling that spins briefly before falling back to interrupts."
      },
      {
        question: "What is interrupt affinity and when should you tune it?",
        answer:
          "Affinity determines which CPUs the interrupt controller is permitted to deliver a given vector to, exposed per interrupt in /proc/irq/N/smp_affinity. It matters because the softirq or tasklet deferred by a handler runs on the CPU that took the interrupt, so affinity effectively places the entire receive or completion processing pipeline. The default is usually to let irqbalance distribute vectors dynamically, which is reasonable for general-purpose systems, but tuned systems frequently disable it and pin explicitly for three reasons. First, cache locality: if a NIC queue's interrupts, its softirq processing, and the application thread reading that socket all run on the same core or at least the same NUMA node, the packet data and the socket state stay in local cache, and the difference across a socket boundary is easily a factor of two on remote memory access. Second, isolation: latency-sensitive threads can be given cores that take no interrupts at all, which is what isolcpus and nohz_full arrangements do, so that jitter from device activity never touches them. Third, parallelism: a multi-queue device with MSI-X has one vector per queue, and spreading them across cores is what allows receive processing to scale beyond a single core - without it, one CPU shows 100 percent soft interrupt time while others idle. The limitation to remember is that receive-side scaling hashes a flow's five-tuple to a queue deliberately, so a single heavy connection cannot be spread; parallelism requires multiple flows."
      },
      {
        question: "Why must a spinlock shared with an interrupt handler be taken with interrupts disabled?",
        answer:
          "Because otherwise the same CPU can deadlock against itself in a way that no amount of lock ordering discipline prevents. Suppose a kernel thread takes a spinlock that protects data also touched by a device's interrupt handler. While the thread holds it, that device raises an interrupt on the same CPU. The handler runs immediately, preempting the thread, and attempts to take the same spinlock. A spinlock does not sleep - it spins - so the handler spins waiting for a lock held by a thread that cannot possibly run again until the handler returns. The CPU is wedged permanently, and because it depends on the interrupt arriving during a short window, it reproduces only under load and looks maddeningly random. The fix is spin_lock_irqsave in thread context, which disables interrupts on the local CPU before acquiring, so no handler can run in the window, and spin_unlock_irqrestore to restore the previous state rather than blindly enabling - important because the caller might itself have been in an interrupts-disabled region. Inside the handler, plain spin_lock is sufficient, since interrupts are already off there. Note that only local interrupts need disabling: a handler on a different CPU spinning on the lock is fine, because the holder is still running and will release it. This is one of the clearest examples of how concurrency between an asynchronous context and a normal context requires different tools than concurrency between two normal contexts."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Corbet, Rubini, Kroah-Hartman - Linux Device Drivers, chapter on interrupt handling",
        insight: "The canonical explanation of top and bottom halves, shared interrupt lines, and the irqsave locking discipline."
      },
      {
        source: "paper",
        attribution: "Mogul and Ramakrishnan - Eliminating Receive Livelock in an Interrupt-Driven Kernel (1996)",
        insight: "Identified livelock and proposed the interrupt-disable-and-poll approach that became NAPI."
      },
      {
        source: "note",
        attribution: "Linux kernel Documentation/core-api/workqueue.rst and networking/napi.rst",
        insight: "Authoritative on when deferred work may sleep and on the NAPI budget and mode-switching rules."
      }
    ]
  },
  {
    id: "topic-os-dma-and-device-io",
    moduleId: "mod-os-io-and-system-calls",
    title: "DMA, Device Memory, and Zero-Copy",
    intuition:
      "Having the CPU copy every byte between a device and memory wastes the most expensive resource in the machine on the least interesting work. Direct memory access lets the device write into memory itself while the CPU does something useful, interrupting only when the transfer is done. Once you accept that devices touch memory directly, a series of consequences follow - cache coherence, address translation, isolation from a malicious or buggy device - and the same reasoning extends upward into zero-copy interfaces that stop the kernel copying data needlessly too.",
    complexity: {
      time:
        "Programmed I/O moves data at the cost of a CPU instruction per word, so transferring a megabyte occupies a core for the entire duration. DMA reduces the CPU cost to setting up a descriptor and handling one completion interrupt, roughly a microsecond regardless of transfer size, so the CPU cost per byte approaches zero for large transfers. Setup overhead means DMA is not worthwhile below a few hundred bytes, which is why small transfers still use programmed I/O.",
      space:
        "Scatter-gather descriptors let a transfer target a list of physically discontiguous pages, which is essential because a user buffer is contiguous only in virtual memory. Without scatter-gather, the kernel must use a bounce buffer - a physically contiguous region allocated below the device's addressing limit - and copy through it, which reintroduces exactly the copy DMA was meant to avoid."
    },
    lesson: [
      {
        title: "How a DMA Transfer Actually Works",
        content:
          "The driver does not hand the device a pointer. It builds a description of the transfer in terms the device can use: physical or bus addresses, lengths, and flags, usually assembled into a descriptor ring that the device consumes. The sequence is precise. The driver maps the buffer for DMA, which pins the pages so they cannot be swapped or moved, obtains bus addresses for them, and performs any cache maintenance required so the device sees current data or the CPU will see the device's data afterwards. It writes descriptors and then rings a doorbell register to tell the device that work is available. The device reads or writes memory directly, without CPU involvement, and raises an interrupt when it has finished. The handler then unmaps the buffer, completing the cache maintenance in the opposite direction, and wakes whoever was waiting. Two categories of mapping exist for good reasons: coherent mappings are used for long-lived structures such as the descriptor rings themselves, where both CPU and device access them continuously and hardware coherence or uncached memory is required, while streaming mappings are used for one-shot data buffers and permit explicit cache maintenance at the start and end, which is cheaper on architectures where coherence is not automatic. Getting the direction wrong - synchronising for the CPU when the device is still writing - produces corruption that appears only under specific timing and is notoriously hard to diagnose.",
        diagram: asciiDiagram(`Programmed I/O versus DMA

  PROGRAMMED I/O
    CPU ──▶ read device register ──▶ write to memory
    CPU ──▶ read device register ──▶ write to memory
    CPU ──▶ read device register ──▶ write to memory
    ▶ one instruction per word. The CPU is a copy engine.
      1 MB transfer = the core is BUSY for the whole transfer.

  DMA
    ┌──────┐  1. build descriptors    ┌──────────────┐
    │ CPU  │ ────────────────────────▶│ descriptor   │
    │      │  2. ring doorbell        │ ring in RAM  │
    └──────┘ ─────────┐               └──────────────┘
       │              │                      ▲
       │ 3. CPU does  ▼                      │
       │    OTHER     ┌──────────┐           │ reads descriptors
       │    WORK      │  DEVICE  │───────────┘
       │              │          │
       │              │          │──▶ writes DATA straight
       │              └──────────┘    into memory
       │                   │
       ▼                   │ 4. interrupt on completion
    ┌──────┐ ◀─────────────┘
    │ CPU  │  5. unmap, sync caches, wake the waiter
    └──────┘
    ▶ CPU cost is ~constant regardless of transfer SIZE.

  THE FOUR THINGS THAT MUST BE HANDLED

  ├── PINNING - pages must not be swapped or migrated while
  │   the device holds their physical address
  │
  ├── ADDRESSES - the device needs BUS addresses. A user
  │   buffer is contiguous in VIRTUAL memory only:
  │       virtual:  ████████████████████  contiguous
  │       physical: ██░░██░░░░██░░██░░██  scattered!
  │   ──▶ SCATTER-GATHER lists, or a BOUNCE BUFFER + copy
  │
  ├── CACHES - the device does not see the CPU's cache
  │     TO_DEVICE:   flush CPU caches BEFORE  ──▶ device
  │     FROM_DEVICE: invalidate caches AFTER  ◀── device
  │   getting the direction wrong = silent, timing-dependent
  │   corruption
  │
  └── ISOLATION - a device writing a raw physical address can
      write ANYWHERE, including kernel memory
      ──▶ IOMMU

  THE IOMMU - an MMU for devices
    device ──▶ IOVA ──▶ ┌────────┐ ──▶ physical address
                        │ IOMMU  │
                        └────────┘
    ├── a device can only reach pages EXPLICITLY mapped to it
    ├── makes scattered physical pages look CONTIGUOUS to the
    │   device, so no scatter-gather support is needed
    └── enables safe device passthrough to VMs and to
        userspace drivers (VFIO, DPDK, SPDK)`)
      },
      {
        title: "Zero-Copy: Removing the Copies Above DMA",
        content:
          "DMA removes the CPU from the device-to-memory copy, but a naive server still copies the data several more times on its way out. Reading a file and writing it to a socket traditionally involves a DMA into the page cache, a copy from the page cache into the user buffer, a copy from the user buffer into socket buffers, and a DMA out to the network card - four transfers and two full CPU copies of every byte, plus two boundary crossings. Zero-copy interfaces collapse this. sendfile moves data from a file descriptor to a socket entirely inside the kernel, so the user buffer disappears and with it both CPU copies, provided the network card supports scatter-gather so it can read the page cache pages directly; without that support one copy remains to assemble a contiguous buffer. splice generalises the idea using a pipe as an in-kernel conduit between arbitrary descriptors, moving page references rather than bytes. mmap plus write removes one copy by letting the application see page cache pages directly, at the cost of page faults and TLB pressure, and with the hazard that another writer truncating the file can deliver SIGBUS. The gains are largest exactly where they matter most - static file serving, proxying, video streaming - and Kafka's throughput is frequently attributed to precisely this, since it writes to a log and serves it with sendfile without ever materialising messages in user space.",
        codeExample: `/* Removing copies, one interface at a time. */

/* NAIVE - 4 transfers, 2 CPU copies, 2 crossings */
while ((n = read(file_fd, buf, sizeof buf)) > 0)
    write(sock_fd, buf, n);
/*   disk ──DMA──▶ page cache ──copy──▶ buf
     buf  ──copy──▶ socket buffer ──DMA──▶ NIC          */

/* SENDFILE - the copies vanish into the kernel */
#include <sys/sendfile.h>
off_t off = 0;
sendfile(sock_fd, file_fd, &off, count);
/*   disk ──DMA──▶ page cache ──(descriptors only)──▶ NIC
     With a scatter-gather-capable NIC the card reads the
     page cache pages DIRECTLY: ZERO CPU copies.
     Without it, one copy remains to build a contiguous
     buffer. Source must be a file (mmap-able); destination
     was socket-only historically, any fd since Linux 2.6.33. */

/* SPLICE - generalised, using a pipe as the conduit */
int p[2];
pipe(p);
splice(file_fd, NULL, p[1], NULL, len, SPLICE_F_MOVE);
splice(p[0], NULL, sock_fd, NULL, len, SPLICE_F_MOVE);
/*   moves PAGE REFERENCES between descriptors, not bytes.
     tee() duplicates a pipe's contents without consuming;
     vmsplice() maps user pages into a pipe.               */

/* MMAP + WRITE - one copy removed, different trade-offs */
void *m = mmap(NULL, len, PROT_READ, MAP_SHARED, file_fd, 0);
write(sock_fd, m, len);
/*   + application can INSPECT or transform the data
     - page faults and TLB pressure on every new page
     - if another process TRUNCATES the file, you get SIGBUS
       ◀── a real production hazard, not a theoretical one   */

/* COPY BETWEEN FILES without user space at all */
copy_file_range(in_fd, &off_in, out_fd, &off_out, len, 0);
/*   on btrfs/XFS with reflink support this becomes a
     metadata-only operation - no data movement whatsoever. */

/* IO_URING - registered buffers avoid even the per-op
   pinning and mapping cost */
io_uring_register_buffers(&ring, iovecs, n);
/*   then use IORING_OP_READ_FIXED / WRITE_FIXED, which skip
     the get_user_pages work on every operation.            */

/* MEASURING the difference */
// perf stat -e task-clock,cycles ./server
// sar -n DEV 1        # throughput vs CPU
// ▶ the signature of a zero-copy win is throughput rising
//   while CPU time per byte FALLS.`
      },
      {
        title: "Memory-Mapped I/O, Barriers, and Why Device Access Is Not Ordinary",
        content:
          "Device registers are usually reached by mapping them into the kernel's address space, so writing a register looks like writing memory - but it is not memory, and treating it as such produces bugs that vary by compiler version and CPU model. Device memory must be mapped uncached, because caching a status register means reading a stale value forever and buffering a command write means the device never sees it. Accesses must not be reordered, but both compilers and processors reorder freely by default, and a device that requires a command register written after its argument registers will simply misbehave if the store order is not enforced. This is why kernels provide readl and writel rather than plain pointer dereferences: they include the compiler barriers and the architecture-specific memory barriers needed to make the access ordered and non-speculative. The same reasoning governs the interaction with DMA, where the driver must ensure descriptor writes are visible in memory before the doorbell write reaches the device - otherwise the device reads a descriptor that has not yet landed. On strongly-ordered x86 many of these barriers are no-ops and mistakes go unnoticed, which is exactly why drivers written and tested only on x86 so often break on ARM, where the memory model is weak and the reordering is real.",
        diagram: asciiDiagram(`Why device access needs barriers

  THE BUG
    writel(addr,  dev->regs + ADDR);   ── set the address
    writel(len,   dev->regs + LEN);    ── set the length
    writel(GO,    dev->regs + CMD);    ── start!
                                          ▲
    ┌──────────────────────────────────────────────────────┐
    │ If these reach the device OUT OF ORDER, the device   │
    │ starts a transfer using a STALE address and length.  │
    │ Compilers reorder. CPUs reorder. Write buffers       │
    │ coalesce and delay. NONE of this is visible in the C.│
    └──────────────────────────────────────────────────────┘

  THE ORDERING LADDER
    ├── volatile          ── stops the COMPILER caching the
    │                        value in a register. Does NOTHING
    │                        about the CPU. Not sufficient.
    ├── compiler barrier  ── stops compiler reordering only
    ├── CPU memory barrier── stops the PROCESSOR reordering
    └── readl / writel    ── the kernel accessors, which
                             bundle the right combination for
                             the architecture. USE THESE.

  x86 vs ARM - why "it works on my machine" fails
    x86:  strongly ordered. Most barriers compile to nothing.
          A driver with MISSING barriers works anyway.
    ARM:  weakly ordered. The same driver corrupts data.
    ▶ the classic "works on x86, broken on ARM" driver bug.

  DMA ORDERING - the doorbell problem
    write descriptor to RAM   ┐
    write descriptor to RAM   │  these must be VISIBLE
    write descriptor to RAM   ┘  in memory FIRST
            │
            ▼
        wmb()  ◀── write barrier
            │
            ▼
    writel(GO, doorbell)      ── only NOW tell the device

    Without the barrier the device may read descriptors that
    have not yet reached memory. Symptom: rare, load-
    dependent corruption. Cause: one missing line.

  MAPPING TYPES
    ┌──────────────┬───────────────────────────────────────┐
    │ normal RAM   │ cached, reorderable, speculatable     │
    │ device (MMIO)│ UNCACHED, ordered, never speculated   │
    │ write-combine│ buffered+coalesced - for framebuffers │
    │              │ where many writes and no reads occur  │
    └──────────────┴───────────────────────────────────────┘
    ▶ Speculation matters: a speculative READ of a device
      register can have SIDE EFFECTS (clearing a status bit),
      which is why device memory is never speculatable.`)
      }
    ],
    examples: [
      {
        title: "A file server's CPU usage halving after switching to sendfile",
        input: "Throughput was CPU-bound at 4 Gbps with a read/write loop.",
        output: "Two full copies of every byte were eliminated.",
        explanation:
          "Step 1: The read/write loop copied each byte from the page cache into a user buffer and again into socket buffers.\nStep 2: At multi-gigabit rates those copies saturate memory bandwidth and consume most of the CPU budget.\nStep 3: sendfile keeps the data in the kernel, passing page references to the network stack.\nStep 4: With a scatter-gather-capable NIC the card reads page cache pages directly, so no CPU copy remains and throughput becomes network-bound rather than CPU-bound."
      },
      {
        title: "A driver that works on x86 and corrupts data on ARM",
        input: "Descriptor writes followed immediately by a doorbell write.",
        output: "A missing write barrier let the device read descriptors that had not reached memory.",
        explanation:
          "Step 1: The code assumed stores would become visible in program order.\nStep 2: x86's strong ordering made that true by accident, so the bug never appeared in testing.\nStep 3: ARM's weak memory model permits the doorbell store to become visible before the descriptor stores.\nStep 4: Inserting wmb between the descriptor writes and the doorbell fixes it; this class of bug is the most common reason drivers ported to ARM fail under load only."
      },
      {
        title: "A malicious device blocked by the IOMMU",
        input: "A Thunderbolt peripheral attempts DMA to kernel memory.",
        output: "The IOMMU faulted the access because that page was never mapped for the device.",
        explanation:
          "Step 1: Without an IOMMU, any device capable of DMA can write any physical address, which is the basis of DMA attacks over hot-pluggable buses.\nStep 2: With the IOMMU enabled, the device issues I/O virtual addresses that must be translated.\nStep 3: Only pages the driver explicitly mapped for that device have translations.\nStep 4: The unmapped access raises an IOMMU fault instead of corrupting memory, which is also the mechanism that makes device passthrough to virtual machines and userspace drivers safe."
      }
    ],
    tips: [
      "When asked about zero-copy, count the copies in the naive path first - four transfers and two CPU copies - then show which each interface removes.",
      "Name the IOMMU as the isolation answer whenever DMA and security appear together; it is the expected term.",
      "Mention that mmap plus write can deliver SIGBUS if the file is truncated; it distinguishes practical from textbook knowledge."
    ],
    tricks: [
      "A user buffer is contiguous only virtually, which is the entire reason scatter-gather lists and bounce buffers exist.",
      "volatile stops the compiler but not the CPU, so it is never sufficient for device access on its own.",
      "sendfile only achieves true zero copy when the NIC supports scatter-gather; otherwise one copy remains."
    ],
    memoryAids: [
      "DMA moves data; the CPU only writes descriptors and rings a doorbell.",
      "Pin, translate, sync caches, isolate - the four obligations of every DMA mapping.",
      "Descriptors before doorbell, always with a write barrier in between."
    ],
    interviewPatterns: [
      "Systems design: 'how would you serve static files at ten gigabits' - zero-copy is the expected answer.",
      "Driver-level: 'why does this work on x86 and fail on ARM' - memory ordering and barriers.",
      "Frequency and companies: Tier 1 for kernel, embedded, and high-performance networking roles; Tier 2 for backend infrastructure."
    ],
    practiceProblems: [
      "Count the copies in a naive file-to-socket transfer and explain what sendfile removes. Answer: The naive path has four data transfers and two of them are CPU copies. First a DMA from disk into the page cache, which costs no CPU. Second a copy from the page cache into the user buffer inside read, which is a CPU copy. Third a copy from the user buffer into socket buffers inside write, another CPU copy. Fourth a DMA from those buffers to the network card. There are also two boundary crossings. sendfile eliminates the user buffer entirely, so both CPU copies disappear: the kernel passes page cache references to the network stack, and if the card supports scatter-gather it reads those pages directly, leaving only the two DMA transfers and one crossing. If the card lacks scatter-gather, one copy remains to assemble a contiguous buffer.",
      "Why does DMA require pinning pages? Answer: Because the device is given a physical or bus address and has no ability to handle a page fault or to be notified that memory has moved. If the page were swapped out while the transfer was in flight, the device would write into whatever now occupies that physical frame - which could be another process's memory or kernel data - producing corruption with no diagnostic. The same applies to page migration for compaction or NUMA balancing, which relocates a page's physical backing while keeping the virtual address stable. Pinning takes a reference that prevents both, and the pin is released when the buffer is unmapped after completion. The cost is that pinned pages are unreclaimable, so a process that pins large amounts reduces the memory available to everyone, which is why RLIMIT_MEMLOCK exists and why io_uring's registered buffers are an explicit, accounted arrangement.",
      "What does an IOMMU protect against and what else does it enable? Answer: It protects against a device reading or writing memory it was never given. Without one, any DMA-capable device can address any physical page, so a buggy driver, malicious firmware, or a hot-plugged peripheral on Thunderbolt or PCIe can read encryption keys out of kernel memory or write arbitrary data - the classic DMA attack. The IOMMU inserts a translation stage so devices issue I/O virtual addresses and can reach only pages explicitly mapped for them, faulting otherwise. Two further capabilities follow. It makes physically scattered pages appear contiguous to the device, so a device without scatter-gather support can still target a normal user buffer without a bounce buffer. And it makes safe passthrough possible: a device can be assigned directly to a virtual machine or to a userspace driver such as DPDK or SPDK, with the IOMMU rather than the hypervisor enforcing containment, which is what makes those high-performance arrangements acceptable at all."
    ],
    faq: [
      {
        question: "Why is DMA better than having the CPU copy, and when is it not?",
        answer:
          "With programmed I/O the CPU executes an instruction per word moved, so transferring a megabyte occupies a core for the whole transfer doing work that requires no intelligence whatsoever, and it also pollutes the cache with data the CPU has no further interest in. DMA reduces the CPU's involvement to building descriptors and handling one completion interrupt, a fixed cost of roughly a microsecond that does not grow with transfer size, so the per-byte CPU cost approaches zero and the core is free to run useful work while the transfer proceeds in parallel. That is why every high-throughput device - disks, network cards, GPUs - uses it. It is not better for small transfers, because the setup is not free: the driver must pin pages, obtain bus addresses, build a scatter-gather list, perform cache maintenance, and later tear all of that down, which for a few dozen bytes costs far more than simply reading a register. Drivers therefore commonly use programmed I/O below a threshold of a few hundred bytes and DMA above it. There is a second limitation worth naming: DMA consumes memory bandwidth and cache coherency traffic that the CPU also needs, so on a saturated memory subsystem a DMA-heavy workload can slow down compute that appears unrelated, which is one of the reasons NUMA placement of device buffers matters."
      },
      {
        question: "What is scatter-gather DMA and why is it necessary?",
        answer:
          "A buffer that is contiguous in a process's virtual address space is almost never contiguous in physical memory; the MMU assembles it from whatever page frames were free, which may be scattered arbitrarily. A device, however, operates on physical or bus addresses and knows nothing of virtual memory, so handing it a start address and a length would have it read or write a range of physical memory that has nothing to do with the intended buffer. Scatter-gather solves this by letting the driver describe the transfer as a list of address and length pairs, one per physically contiguous fragment, which the device walks in order. Modern devices support this natively and it is the normal path. When a device does not - because it is old, or because it can only address a limited range such as the classic 32-bit or 24-bit ISA limits - the kernel falls back to a bounce buffer: it allocates a physically contiguous region within the device's addressable range, copies the data through it, and performs the DMA against that. This works but reintroduces exactly the CPU copy that DMA was meant to eliminate, and it can also fail under memory pressure since large physically contiguous allocations are hard to satisfy on a fragmented system. An IOMMU offers a third and better answer, since it can present scattered physical pages to the device as a single contiguous I/O virtual address range, giving a device without scatter-gather support the benefits of it for free."
      },
      {
        question: "How do cache coherence issues arise with DMA and how are they handled?",
        answer:
          "The problem is that the CPU's caches and the device's view of memory can disagree. If the CPU has written data destined for the device and those writes are still sitting in a write-back cache line, the device reading main memory sees stale contents. Conversely, if the device has written into memory and the CPU has cached lines covering that region from an earlier read, the CPU sees stale contents until the lines are invalidated. On x86 the hardware maintains coherence between DMA and caches, so this is largely invisible, but on many ARM, MIPS, and embedded platforms it is not, and the driver must perform explicit cache maintenance. The kernel's DMA API encodes this in the mapping direction. DMA_TO_DEVICE means the CPU wrote the data, so caches must be cleaned - written back - before the device is allowed to read. DMA_FROM_DEVICE means the device will write, so the CPU's cached copies must be invalidated after the transfer completes, and often before it starts as well to avoid a dirty line being written back over the device's data. DMA_BIDIRECTIONAL does both and is more expensive. The API also distinguishes coherent mappings, used for long-lived shared structures such as descriptor rings where both parties access continuously and the memory is allocated uncached or in a hardware-coherent region, from streaming mappings for one-shot data buffers where explicit sync points are cheaper. Specifying the wrong direction produces corruption that depends on cache state and timing, so it appears intermittently under load and disappears under a debugger - one of the least pleasant bug classes in systems programming."
      },
      {
        question: "What exactly does sendfile eliminate, and when does it not help?",
        answer:
          "In the naive path, serving a file to a socket involves a DMA from storage into the page cache, a CPU copy from the page cache into the application's buffer during read, a CPU copy from that buffer into socket buffers during write, and a DMA from there to the network card - four transfers, two of them CPU copies of every byte, plus two boundary crossings. sendfile performs the whole operation inside the kernel: it locates the page cache pages for the requested range and hands references to them to the network stack, so no user buffer exists and neither CPU copy occurs. Whether it achieves literal zero copy depends on the network card: with scatter-gather and checksum offload the card reads the page cache pages directly, so no byte is ever touched by the CPU; without those features the kernel must assemble a contiguous buffer and one copy remains, though the user-space round trip is still saved. It does not help in several important situations. If the application must transform the data - compress it, encrypt it at the application layer, template it - the bytes must be in user space by definition, so there is nothing to eliminate. TLS traditionally defeated it for the same reason, until kernel TLS moved encryption into the kernel and restored the benefit. And if the file is not in the page cache, the transfer is dominated by storage latency and the copy savings are irrelevant. The measurable signature of a genuine win is throughput rising while CPU time per byte falls, which is exactly the profile Kafka exhibits when serving a log segment."
      },
      {
        question: "Why do drivers need memory barriers, and why is x86 so misleading here?",
        answer:
          "Because both the compiler and the processor are permitted to reorder memory operations that appear sequential in the source, and a device does not tolerate that. The canonical case is a driver that writes an address register, then a length register, then a command register that starts the transfer: if the command write becomes visible to the device before the address and length writes, the device begins a transfer using stale parameters. The same problem occurs with DMA descriptors, where the driver writes descriptors into memory and then writes a doorbell register; if the doorbell reaches the device first, the device reads descriptors that have not yet landed in memory. The tools form a ladder. volatile prevents the compiler from caching a value in a register or eliding a repeated access, but does nothing at all about processor reordering, which is why it is necessary but never sufficient. A compiler barrier constrains the compiler only. A processor memory barrier - wmb, rmb, mb in Linux terms - constrains the hardware. In practice, drivers use the kernel's accessor functions readl and writel for register access, which bundle the correct combination for the architecture, and explicit barriers such as wmb between descriptor writes and doorbell writes. x86 is misleading because its memory model is strongly ordered: stores become visible in program order, so most barriers compile to nothing and a driver with missing barriers works perfectly. Move the same code to ARM, where the model is weak and reordering genuinely happens, and it corrupts data intermittently under load. This is the single most common reason drivers ported from x86 to ARM fail, and it is why review of new driver code focuses heavily on ordering even when testing passes."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Linux kernel Documentation/core-api/dma-api.rst and dma-api-howto.rst",
        insight: "The authoritative statement of coherent versus streaming mappings and why direction must be specified correctly."
      },
      {
        source: "book",
        attribution: "Corbet, Rubini, Kroah-Hartman - Linux Device Drivers, chapters on memory mapping and DMA",
        insight: "Explains bus addresses, scatter-gather, bounce buffers, and the accessor functions in a single coherent narrative."
      },
      {
        source: "blog",
        attribution: "Kafka design documentation on zero-copy transfer",
        insight: "A concrete production account of why sendfile rather than clever user-space buffering produces the throughput."
      }
    ]
  },
  {
    id: "topic-os-blocking-and-nonblocking-io",
    moduleId: "mod-os-io-and-system-calls",
    title: "Blocking, Non-Blocking, and Asynchronous I/O Models",
    intuition:
      "There are only a few ways for a program to wait for I/O, and each one places the cost somewhere different. Blocking is the simplest and puts the cost in threads, which are expensive at scale. Non-blocking with readiness notification puts the cost in complexity, requiring an event loop and state machines. Truly asynchronous I/O moves the completion itself into the kernel. Choosing among them is not a matter of one being modern and the others obsolete - it is a question of how many concurrent operations you have and how much you value simple code.",
    complexity: {
      time:
        "A blocking call parks the thread with essentially no CPU cost while waiting, but each context switch to and from it costs one to five microseconds. Readiness-based loops replace those switches with one call reporting many ready descriptors, so the per-connection cost falls sharply; epoll is O(ready) rather than O(watched), which is the entire reason it replaced select. io_uring reduces per-operation cost further by amortising or eliminating the boundary crossing.",
      space:
        "The decisive figure for thread-per-connection is stack memory: 8 MB of virtual address space reserved per thread by default and typically 8 to 64 KB actually touched, plus a kernel stack. Ten thousand threads is therefore gigabytes of virtual space and hundreds of megabytes resident, before any application data - which is the concrete meaning of the C10K problem."
    },
    lesson: [
      {
        title: "The Five Models, and What Each One Costs",
        content:
          "Blocking I/O is the default: the thread calls read, the kernel parks it until data arrives, and it resumes with the data in hand. The code is linear and obvious, which is its overwhelming advantage, and its cost is that concurrency requires a thread per concurrent operation. Non-blocking I/O sets O_NONBLOCK so the call returns EAGAIN rather than waiting, which alone is useless because the only way to make progress is to spin. It becomes useful combined with readiness notification: select, poll, or epoll tell the program which of many descriptors can be operated on without blocking, so one thread can service thousands of connections in an event loop. Signal-driven I/O asks the kernel to send SIGIO when a descriptor becomes ready, but signal handling is awkward and signals can be coalesced, so it is rarely used. Genuinely asynchronous I/O is different in kind: the program submits an operation and the kernel performs the entire transfer, notifying only on completion, so there is no readiness step at all - POSIX AIO was the standard attempt and was widely regarded as poor, Linux native AIO worked only for O_DIRECT file I/O, and io_uring is the design that finally made it general. The crucial distinction to state clearly in an interview is readiness versus completion: epoll tells you that you may now perform an operation without blocking, whereas io_uring and Windows IOCP tell you that the operation has already been performed.",
        diagram: asciiDiagram(`The models, and where each puts the cost

  1. BLOCKING
     thread ──▶ read() ──▶ ░░░░ parked ░░░░ ──▶ data
     ├── code is LINEAR and obvious       ◀── the real win
     └── concurrency costs a THREAD each

  2. NON-BLOCKING alone
     thread ──▶ read() ──▶ EAGAIN
            ──▶ read() ──▶ EAGAIN     ◀── busy spin
            ──▶ read() ──▶ data           useless alone

  3. NON-BLOCKING + READINESS  (select / poll / epoll)
     ┌──────────────────────────────────────────────┐
     │ epoll_wait() ──▶ "fds 3, 17, 402 are ready"  │
     │    for each: read() until EAGAIN             │
     └──────────────────────────────────────────────┘
     ├── ONE thread, thousands of connections
     ├── ▶ tells you an op WILL NOT BLOCK
     └── cost: your logic becomes a STATE MACHINE

  4. SIGNAL-DRIVEN (SIGIO)
     kernel ──signal──▶ handler
     ├── async-signal-safe functions only
     └── signals COALESCE ──▶ events lost. Rarely used.

  5. ASYNCHRONOUS  (io_uring, IOCP)
     submit op ──▶ kernel does the WHOLE transfer
              ◀── completion: "it is DONE, here is the data"
     ├── ▶ no readiness step AT ALL
     └── works for files, not just sockets

  ┌──────────────────────────────────────────────────────────┐
  │ THE DISTINCTION INTERVIEWERS TEST                        │
  │   READINESS  (epoll): "you MAY now read without blocking"│
  │              ──▶ you still call read() yourself          │
  │   COMPLETION (io_uring, IOCP): "the read HAS HAPPENED"   │
  │              ──▶ the data is already in your buffer      │
  └──────────────────────────────────────────────────────────┘

  WHY READINESS FAILS FOR FILES
    a regular file is ALWAYS "ready" - there is no such thing
    as a socket-style wait for data to arrive. epoll on a file
    returns immediately and the subsequent read() BLOCKS on
    the disk anyway.
    ▶ this is exactly the gap io_uring filled, and why
      thread pools were the only prior answer for file I/O.`)
      },
      {
        title: "C10K: Why Thread-Per-Connection Stopped Working",
        content:
          "The thread-per-connection model is correct and was adequate for a long time, and its collapse is worth understanding numerically rather than as folklore. Each thread reserves virtual address space for a stack, eight megabytes by default on Linux, and touches perhaps eight to sixty-four kilobytes of it, plus a kernel stack of eight or sixteen kilobytes that is fully resident. At ten thousand connections that is eighty gigabytes of virtual address space and hundreds of megabytes of physical memory before a single byte of application state. Beyond memory, the scheduler's run queue operations, though O(1) in modern kernels, still involve real per-switch cost of one to five microseconds including the cache and TLB damage a switch inflicts, and with most threads blocked most of the time the useful work per switch is small. The result is that throughput stops rising with connection count and then falls. The event-loop answer - one or a few threads multiplexing over many descriptors with epoll - removes the per-connection thread entirely, so memory becomes a small per-connection structure and there are no switches for idle connections at all. The cost is paid in program structure: what was a linear function becomes a state machine driven by callbacks, error handling becomes harder, and any accidental blocking call stalls every connection the loop is serving. Modern languages recover much of the readability with async/await or green threads, which are event loops with the state machine generated by the compiler or runtime rather than written by hand.",
        codeExample: `/* The same server, three ways. */

/* 1. THREAD PER CONNECTION - linear and obvious */
while ((c = accept(listen_fd, NULL, NULL)) >= 0)
    pthread_create(&t, NULL, handle_client, (void *)(long)c);
/*   ~10 MB virtual + ~8-64 KB resident per thread.
     10k connections ──▶ 80 GB virtual, and the scheduler
     manages 10k mostly-idle threads.                      */

/* 2. EPOLL EVENT LOOP - one thread, many connections */
int ep = epoll_create1(0);
struct epoll_event ev = { .events = EPOLLIN | EPOLLET,
                          .data.fd = listen_fd };
epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);

struct epoll_event events[MAX];
for (;;) {
    int n = epoll_wait(ep, events, MAX, -1);
    for (int i = 0; i < n; i++) {
        int fd = events[i].data.fd;
        /* EDGE-TRIGGERED: you are told ONCE. You MUST drain
           until EAGAIN or you will never be told again and
           the connection HANGS - the classic ET bug.      */
        for (;;) {
            ssize_t r = read(fd, buf, sizeof buf);
            if (r > 0)      { process(buf, r); continue; }
            if (r == 0)     { close(fd); break; }  /* EOF   */
            if (errno == EAGAIN) break;            /* drained */
            close(fd); break;                      /* error  */
        }
    }
}
/*   LEVEL-triggered (default): re-notified while data
     remains. Forgiving; more epoll_wait wakeups.
     EDGE-triggered: notified on TRANSITION only. Fewer
     wakeups; unforgiving.                                 */

/* 3. IO_URING - submit operations, collect completions */
struct io_uring ring;
io_uring_queue_init(256, &ring, 0);

struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, len, offset);
io_uring_sqe_set_data(sqe, conn);
io_uring_submit(&ring);          /* ONE crossing for MANY ops */

struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
/*   cqe->res is the RESULT - the read has ALREADY happened.
     Works for FILES too, unlike epoll.
     SQPOLL mode: a kernel thread polls the submission ring,
     so the steady state has ZERO system calls.            */
io_uring_cqe_seen(&ring, cqe);

/* THE CARDINAL SIN of any event loop */
// void handle(int fd) {
//     char *r = getaddrinfo_blocking(host);  // BLOCKS
//     ...
// }
// ▶ one blocking call stalls EVERY connection this loop
//   serves. Includes: DNS, disk reads, mutex contention,
//   page faults on cold memory, and logging to a slow disk.`
      },
      {
        title: "Choosing, and the Traps in Each Choice",
        content:
          "The decision is driven by concurrency count and by whether the I/O is socket-based or file-based. Below a few hundred concurrent operations, blocking threads are usually right: the code is dramatically simpler, debugging is straightforward because stack traces mean something, and the resource cost is irrelevant. Above a few thousand, an event loop is necessary for sockets. For file I/O, readiness notification does not work at all, because a regular file is always reported ready and the subsequent read blocks on the disk regardless - which is why file I/O in event-driven servers was historically handled by a thread pool, and why io_uring's ability to handle files asynchronously was such a significant addition. Each model carries characteristic traps. With threads, the traps are unbounded thread creation and unsynchronised shared state. With edge-triggered epoll, the trap is failing to drain a descriptor until EAGAIN, after which no further notification arrives and the connection hangs silently. With any event loop, the cardinal sin is a blocking call inside a handler - a DNS lookup, a synchronous file read, a contended mutex, even a page fault on cold memory - which stalls every connection the loop serves and produces latency spikes that are extremely hard to attribute. With io_uring, the traps are lifetime management, since buffers must remain valid until completion rather than until submission, and the security surface, which led several distributions to restrict it by default.",
        diagram: asciiDiagram(`Choosing a model

  concurrency
      │
  10k+│  ┌─────────────────────────────────────────┐
      │  │ EVENT LOOP (epoll) or io_uring          │
      │  │ + multiple loops, one per core,         │
      │  │   SO_REUSEPORT to spread accepts        │
      │  └─────────────────────────────────────────┘
      │
   1k │  ┌─────────────────────────────────────────┐
      │  │ event loop, OR async/await runtime      │
      │  │ (Go, Rust tokio, Node) - the runtime    │
      │  │ writes the state machine for you        │
      │  └─────────────────────────────────────────┘
      │
  100 │  ┌─────────────────────────────────────────┐
      │  │ THREADS. Simpler code wins. Bounded     │
      │  │ pool, not unbounded creation.           │
      │  └─────────────────────────────────────────┘
      └────────────────────────────────────────────▶

  ┌──────────────┬────────────────┬────────────────────────┐
  │              │ SOCKETS        │ REGULAR FILES          │
  ├──────────────┼────────────────┼────────────────────────┤
  │ blocking     │ works, 1 thread│ works, 1 thread each   │
  │              │ each           │                        │
  │ epoll        │ EXCELLENT      │ USELESS - always ready │
  │ thread pool  │ works          │ the historical answer  │
  │ io_uring     │ works          │ WORKS - the reason it  │
  │              │                │ exists                 │
  └──────────────┴────────────────┴────────────────────────┘

  THE TRAPS, PER MODEL
    threads    ├── unbounded creation ──▶ memory exhaustion
               └── shared state without locks
    epoll ET   ├── not draining to EAGAIN ──▶ SILENT HANG
               └── thundering herd on a shared listen fd
                   (use EPOLLEXCLUSIVE or SO_REUSEPORT)
    any loop   └── ▼ THE BIG ONE ▼
                   a BLOCKING call inside a handler stalls
                   every connection. DNS, disk, mutex, or a
                   page fault on cold memory all qualify.
    io_uring   ├── buffers must live until COMPLETION, not
               │   until submission
               └── restricted by default on some distros
                   for security reasons`)
      }
    ],
    examples: [
      {
        title: "A connection that hangs forever under edge-triggered epoll",
        input: "The handler calls read once per notification and processes what it got.",
        output: "Data left in the socket buffer generates no further edge, so the connection stalls.",
        explanation:
          "Step 1: Edge-triggered mode notifies on the transition from not-ready to ready, once.\nStep 2: If the handler reads only part of the available data, the descriptor remains readable but no new transition occurs.\nStep 3: epoll_wait therefore never reports it again and the remaining data is never consumed.\nStep 4: The handler must loop reading until it receives EAGAIN, which is the invariant edge-triggered mode requires; level-triggered mode is forgiving here at the cost of more wakeups."
      },
      {
        title: "An event-loop server with unexplained latency spikes",
        input: "p99 latency spikes to hundreds of milliseconds with no CPU saturation.",
        output: "A synchronous DNS lookup inside a handler blocked the loop.",
        explanation:
          "Step 1: The handler called a blocking resolver, which waits on a network round trip.\nStep 2: While it waited, the single loop thread could not service any other connection.\nStep 3: Every pending connection's latency increased by the full lookup time, not just the one that triggered it.\nStep 4: The fix is to make the lookup asynchronous or move it to a thread pool; the general rule is that nothing inside a handler may block, and that includes disk reads, contended mutexes, and page faults on cold memory."
      },
      {
        title: "A file-serving loop that epoll cannot help",
        input: "An event-driven server adds regular files to its epoll set and sees no benefit.",
        output: "Files are always reported ready and the reads block anyway.",
        explanation:
          "Step 1: Readiness notification is meaningful for sockets and pipes, where data arrives over time.\nStep 2: A regular file has no such notion, so epoll reports it immediately readable regardless of whether the data is cached.\nStep 3: The subsequent read then blocks on the disk, stalling the loop exactly as any blocking call would.\nStep 4: The historical answer was a thread pool dedicated to file I/O; io_uring is the first general Linux interface that handles file operations asynchronously, which is a large part of why it was adopted so quickly."
      }
    ],
    tips: [
      "Draw the readiness-versus-completion distinction explicitly; it is the single point that separates a rehearsed answer from an understood one.",
      "Say that epoll is useless for regular files and explain why - this detail is frequently probed and frequently missed.",
      "Justify thread-per-connection for low concurrency rather than dismissing it; simplicity is a real engineering argument."
    ],
    tricks: [
      "Edge-triggered epoll requires draining to EAGAIN, and forgetting it produces a silent hang rather than an error.",
      "select is limited to FD_SETSIZE descriptors and rescans the whole set, which is why it is O(watched) while epoll is O(ready).",
      "SO_REUSEPORT gives each loop its own listening socket, which removes the accept thundering herd and balances in the kernel."
    ],
    memoryAids: [
      "Readiness says you may; completion says it is done.",
      "Blocking costs threads, readiness costs complexity, asynchrony costs lifetime discipline.",
      "Edge-triggered means drain until EAGAIN, every time."
    ],
    interviewPatterns: [
      "Design: 'build a server handling 100,000 connections' - the C10K reasoning is the expected structure.",
      "Debugging: 'the event loop has latency spikes with idle CPU' - find the blocking call.",
      "Frequency and companies: Tier 1 for backend and infrastructure roles everywhere; a staple of systems interviews."
    ],
    practiceProblems: [
      "Why does thread-per-connection fail at 10,000 connections? Answer: Primarily memory and secondarily scheduling. Each thread reserves eight megabytes of virtual address space for its stack by default and typically touches eight to sixty-four kilobytes, plus a fully resident kernel stack of eight or sixteen kilobytes, so ten thousand threads consume eighty gigabytes of virtual space and hundreds of megabytes of physical memory before any application state exists. The scheduler handles that many runnable threads in constant time per operation, but each context switch costs one to five microseconds including the cache and TLB pollution it causes, and with most threads blocked most of the time the useful work accomplished per switch is small. The result is that throughput plateaus and then declines as connection count rises. An event loop replaces the per-connection thread with a small per-connection structure and performs no switches at all for idle connections, which is why it scales.",
      "What is the difference between level-triggered and edge-triggered epoll? Answer: Level-triggered mode reports a descriptor as ready whenever the condition holds, so if data remains unread it will be reported again on the next epoll_wait. Edge-triggered mode reports only the transition from not-ready to ready, so a descriptor is reported once and not again until new data arrives after the buffer has been fully drained. Edge-triggered produces fewer wakeups and is therefore more efficient at high event rates, but it imposes an obligation: the handler must read in a loop until it receives EAGAIN, because any data left behind produces no further notification and the connection hangs silently with no error anywhere. Level-triggered is forgiving of partial reads and is the right default; edge-triggered is the optimisation you adopt deliberately, and it is a common source of subtle production bugs.",
      "When would you still use blocking I/O today? Answer: Whenever concurrency is low enough that threads are affordable, which covers a great deal of real software. Below a few hundred concurrent operations the memory and scheduling cost is irrelevant, and the benefit is substantial: the code reads as a linear sequence, error handling uses ordinary control flow, stack traces identify what the program was doing, and debuggers work normally. Batch processing, command-line tools, internal services with modest connection counts, and any component where correctness matters more than peak throughput are all reasonable candidates. It is also the right choice when the work per request is CPU-heavy rather than I/O-heavy, since a bounded thread pool sized to the core count is then the natural structure and an event loop adds complexity without benefit. The failure mode to avoid is not blocking itself but unbounded thread creation; a bounded pool with a queue retains the simplicity while capping the resource cost."
    ],
    faq: [
      {
        question: "What precisely is the difference between non-blocking and asynchronous I/O?",
        answer:
          "They answer different questions, and conflating them is the most common error in this area. Non-blocking I/O, meaning O_NONBLOCK combined with readiness notification from select, poll, or epoll, tells you that an operation can now be performed without waiting. You are still the one who performs it: epoll_wait returns that descriptor 17 is readable, and you then call read yourself, which copies data from the kernel's socket buffer into your buffer while your thread executes. The data transfer happens synchronously inside your call; what you avoided was the waiting. Asynchronous I/O in the strict sense means you submit a description of an operation and the kernel performs the entire operation, including the data transfer, then notifies you that it is finished. You never call read at all; the completion event tells you that the bytes are already in your buffer. Windows I/O completion ports have worked this way for decades, and io_uring finally brought a general version to Linux. The distinction has real consequences. Readiness works only for objects that have a meaningful notion of becoming ready, which sockets and pipes do and regular files do not, so epoll cannot help with file I/O at all. Completion has no such restriction, which is why io_uring handles files, sockets, and even operations like openat and statx uniformly. It also means the kernel can perform the work at a time of its choosing, batch it, and use polled submission so that a busy server issues no system calls at all in steady state."
      },
      {
        question: "Why did epoll replace select and poll?",
        answer:
          "Because their cost scales with the number of descriptors watched rather than the number that are actually ready, and at high connection counts almost none are ready at any moment. With select or poll, the application passes the entire set of descriptors into the kernel on every call, the kernel copies that set in, scans every entry to check readiness, and copies results back; the application then scans the whole set again to find which entries changed. Watching ten thousand descriptors to discover that three are ready means twenty thousand redundant examinations plus the copying, on every iteration of the loop. select adds the further indignity of a compile-time limit, FD_SETSIZE, usually 1024, and of destroying its input sets so they must be rebuilt each time. epoll splits the operation in two: epoll_ctl registers interest once, so the kernel maintains the watch set persistently, and epoll_wait returns only the descriptors that are ready, making the cost proportional to the number of events rather than the number of connections. For a server with ten thousand mostly-idle connections that is the difference between a loop that scales and one that does not. The same reasoning produced kqueue on BSD and macOS and IOCP on Windows. epoll's remaining limitations are that it is Linux-specific, that it does not work for regular files, and that edge-triggered mode is easy to misuse - all of which are among the reasons io_uring was eventually designed."
      },
      {
        question: "What makes io_uring different from earlier Linux async I/O?",
        answer:
          "Linux had asynchronous I/O before, and it was poor enough that almost nobody used it. POSIX AIO on Linux was implemented in glibc using a hidden thread pool, so it offered the interface without the benefit. Native Linux AIO, the io_submit family, was genuinely kernel-level but worked only for O_DIRECT file I/O, silently became blocking for buffered I/O, could not handle sockets, and had an interface widely described as unpleasant. io_uring is a redesign around shared memory rather than system calls. The application and the kernel share two ring buffers mapped into the process: a submission queue into which the application writes operation descriptions, and a completion queue from which it reads results. Submitting work is a memory write and a queue index update, so many operations can be submitted with a single io_uring_enter call, and in SQPOLL mode a kernel thread polls the submission ring so the steady state requires no system calls whatsoever. It supports essentially the whole I/O surface - reads, writes, accept, connect, send, recv, openat, statx, timeouts, and more - for both files and sockets, and it supports linking operations so that a chain such as accept then read then write executes without returning to user space between steps. Registered buffers and registered file descriptors remove per-operation pinning and lookup costs. The trade-offs are real: buffer lifetimes now extend to completion rather than to submission, which is a discipline C programmers find easy to get wrong, the interface is complex enough that most people use liburing rather than the raw rings, and its rapid growth in kernel attack surface led several distributions and cloud providers to restrict or disable it by default."
      },
      {
        question: "What goes wrong when something blocks inside an event loop?",
        answer:
          "Everything the loop is responsible for stops. An event loop is a single thread servicing thousands of connections by cycling through ready events, so the implicit contract is that each handler returns quickly. If a handler blocks - a synchronous DNS resolution, a read from a file that misses the page cache, a contended mutex, a synchronous logging write to a slow disk, or even a major page fault on cold memory - then the loop thread is parked and no other connection is serviced for the entire duration. A fifty millisecond disk read does not add fifty milliseconds to one request; it adds up to fifty milliseconds to every request queued behind it, so the tail latency degrades far more than the average and the correlation between cause and symptom is weak. Diagnosis is genuinely difficult because CPU utilisation looks low - the thread is blocked, not busy - so the usual saturation signals are absent, and the affected requests have nothing in common with the one that caused the stall. The disciplines that prevent it are architectural: route any operation that might block to a thread pool or an asynchronous equivalent, use asynchronous DNS libraries rather than getaddrinfo, never hold a lock across an await point, keep logging asynchronous, and treat file I/O as blocking unless it goes through io_uring. Runtimes such as Go and Tokio mitigate this by multiplexing many tasks over several OS threads so one blocked task does not stall everything, but even there a blocking syscall in a worker consumes a thread from a finite pool and the same pathology appears at larger scale."
      },
      {
        question: "How do modern async/await runtimes relate to these models?",
        answer:
          "They are event loops with the state machine generated automatically rather than written by hand. The fundamental problem with the readiness model is not performance but structure: a linear function that reads a request, queries a database, and writes a response must be rewritten as a set of callbacks each holding a fragment of the state, and error handling, cancellation, and cleanup all become manual. async/await preserves the linear source structure while compiling it into exactly that state machine. In Rust, an async function becomes a generated state machine implementing Future, and a runtime such as Tokio drives it over an epoll or io_uring reactor. In Python and JavaScript, coroutines suspend at await points and the loop resumes them when the awaited operation is ready. Go takes a different route with goroutines, which look like threads but are multiplexed by the runtime onto a small number of OS threads, with the runtime intercepting blocking operations and switching to another goroutine transparently - so the programmer writes blocking code and gets event-loop efficiency, at the cost of a runtime that must be involved in every I/O operation. The important point for an interview is that none of these eliminate the underlying models; they are ergonomics layered over epoll, kqueue, IOCP, or io_uring. The old rules therefore still apply underneath: a genuinely blocking call inside an async task still stalls a worker thread, cold page faults still block, and CPU-heavy work in an async task still starves the loop."
      }
    ],
    references: [
      {
        source: "blog",
        attribution: "Kegel - The C10K problem",
        insight: "The document that framed the whole discussion, enumerating every I/O model and its scaling behaviour."
      },
      {
        source: "book",
        attribution: "Stevens, Fenner, Rudoff - UNIX Network Programming, chapter on I/O models",
        insight: "The clearest formal treatment of the five models and of the readiness versus completion distinction."
      },
      {
        source: "note",
        attribution: "Axboe - Efficient IO with io_uring",
        insight: "The design document explaining the shared ring buffers, SQPOLL, registered buffers, and why earlier Linux AIO failed."
      }
    ]
  },
  {
    id: "topic-os-io-multiplexing-and-event-loops",
    moduleId: "mod-os-io-and-system-calls",
    title: "select, poll, epoll, and Building an Event Loop",
    intuition:
      "Multiplexing is the answer to a specific question: one thread, many descriptors, how do I wait for whichever becomes ready first? Every mechanism that answers it - select, poll, epoll, kqueue, IOCP - is doing the same thing, and they differ almost entirely in how the cost scales with the number of descriptors you are watching versus the number that actually fire. Once you have the primitive, an event loop is a small amount of code and a large amount of discipline, because every architectural mistake in an event-driven server traces back to something blocking that should not have.",
    complexity: {
      time:
        "select and poll are O(n) in the number of watched descriptors on every call, because the whole set is copied into the kernel and scanned. epoll and kqueue are O(1) for registration and O(ready) for waiting, since the kernel maintains the interest set persistently and returns only the descriptors that fired. At ten thousand connections with three ready, that is the difference between twenty thousand examinations per iteration and three.",
      space:
        "An event loop's per-connection cost is a small structure holding the descriptor, buffers, and parse state - typically a few kilobytes - against roughly eight to sixty-four kilobytes of touched stack plus a kernel stack for a thread. select additionally requires a fixed-size bitmap bounded by FD_SETSIZE, usually 1024, which is a hard compile-time ceiling rather than a performance concern."
    },
    lesson: [
      {
        title: "The Three Interfaces and Their Scaling",
        content:
          "select is the oldest and the most constrained. The caller builds three bitmaps of descriptors - readable, writable, exceptional - passes them to the kernel, and receives them back modified in place to indicate which fired. The kernel must scan every descriptor in the set on every call, and because the bitmaps are overwritten they must be rebuilt each iteration; worse, the bitmap size is fixed at compile time by FD_SETSIZE, conventionally 1024, so descriptors above that number cannot be watched at all without undefined behaviour. poll removes the size limit by taking an array of structures rather than bitmaps and separates the requested events from the returned ones so the array can be reused, but the fundamental cost is unchanged: the whole array is copied into the kernel and scanned on every call. epoll changes the shape of the problem by splitting registration from waiting. epoll_ctl adds, modifies, or removes interest in a descriptor and the kernel keeps that set persistently in a red-black tree; when a descriptor becomes ready, the kernel moves it onto a ready list, and epoll_wait simply returns whatever is on that list. Nothing is copied per call except the results, and nothing is scanned. The equivalent on BSD and macOS is kqueue, which is more general still since it can watch file modifications, process exits, signals, and timers through the same interface, and on Windows IOCP achieves a similar result from the completion side rather than the readiness side.",
        diagram: asciiDiagram(`How the cost scales

  WATCHING 10,000 descriptors, 3 are ready

  select
    ┌──────────────────────────────────────────────────┐
    │ build 3 bitmaps          ── every iteration      │
    │ copy 10,000 bits IN      ── every iteration      │
    │ kernel SCANS all 10,000  ── every iteration      │
    │ copy results OUT                                 │
    │ you SCAN all 10,000 to find the 3                │
    └──────────────────────────────────────────────────┘
    ▶ O(n) twice per iteration, plus FD_SETSIZE=1024 CEILING
      (descriptors above it are undefined behaviour, not an
       error - a genuine security bug class)

  poll
    ┌──────────────────────────────────────────────────┐
    │ array of pollfd, reusable (events vs revents)    │
    │ copy 10,000 entries IN   ── every iteration      │
    │ kernel SCANS all 10,000  ── every iteration      │
    │ you SCAN all 10,000                              │
    └──────────────────────────────────────────────────┘
    ▶ no size limit, same O(n) cost

  epoll
    ┌──────────────────────────────────────────────────┐
    │ epoll_ctl(ADD)  ── ONCE per descriptor, ever     │
    │                    kernel keeps a red-black tree │
    │                                                  │
    │   descriptor becomes ready                       │
    │        │                                         │
    │        ▼                                         │
    │   kernel moves it to a READY LIST                │
    │                                                  │
    │ epoll_wait ──▶ returns the 3 ready entries       │
    │                nothing scanned, nothing copied   │
    └──────────────────────────────────────────────────┘
    ▶ O(1) register, O(ready) wait  ◀── the whole point

  ACROSS PLATFORMS
    Linux   ── epoll          readiness
    BSD/mac ── kqueue         readiness, and also watches
                              files, processes, signals,
                              timers through ONE interface
    Windows ── IOCP           COMPLETION-based
    portable── libuv, libevent wrap all of the above
                              (this is what Node.js uses)`)
      },
      {
        title: "Writing the Loop: Structure and Invariants",
        content:
          "The loop itself is short: wait for events, dispatch each to the connection that owns it, and repeat. The difficulty lies in the invariants. Every descriptor must be non-blocking, without exception, because in edge-triggered mode you must read until EAGAIN and in level-triggered mode a spurious readiness report - which can genuinely happen, for instance when a packet arrives with a bad checksum and is discarded after readiness was signalled - would otherwise block the entire loop. Writes need particular care: a write may accept only part of your buffer, so the remainder must be buffered and the descriptor registered for write readiness, and crucially that registration must be removed once the buffer drains, or the loop will spin at full CPU being told endlessly that the socket is writable. Connection state must be owned by a structure reachable from the event, which is what the epoll_event data field carries, and closing a descriptor while an event for it is still in a batch you are processing is a use-after-free waiting to happen, so deferred close is the standard discipline. For multi-core scaling, a single loop saturates one core, so the usual arrangement is one loop per core, each with its own listening socket via SO_REUSEPORT so the kernel distributes incoming connections and no thundering herd occurs on accept. Timers are handled either by the epoll_wait timeout computed from the nearest deadline or, more cleanly, by timerfd so that timers become just another readable descriptor, which is the same trick signalfd and eventfd apply to signals and to cross-thread wakeups.",
        codeExample: `/* A correct minimal event loop, with the invariants marked. */

/* INVARIANT 1: every fd is non-blocking. No exceptions. */
static void set_nonblocking(int fd) {
    int fl = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, fl | O_NONBLOCK);
}

struct conn {
    int fd;
    char out[BUFSZ];
    size_t out_len, out_sent;
    bool want_write, closing;
};

int ep = epoll_create1(EPOLL_CLOEXEC);

/* Register the listener. EPOLLEXCLUSIVE avoids waking every
   loop for one incoming connection (the thundering herd).
   SO_REUSEPORT per loop is the better answer still.        */
struct epoll_event ev = { .events = EPOLLIN | EPOLLEXCLUSIVE,
                          .data.ptr = &listener };
epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);

for (;;) {
    int timeout = next_timer_ms();      /* or use timerfd */
    int n = epoll_wait(ep, events, MAX, timeout);

    for (int i = 0; i < n; i++) {
        struct conn *c = events[i].data.ptr;
        uint32_t e = events[i].events;

        /* INVARIANT 2: always check errors first. EPOLLHUP
           and EPOLLERR arrive whether or not you asked.   */
        if (e & (EPOLLHUP | EPOLLERR)) { defer_close(c); continue; }

        if (e & EPOLLIN) {
            /* INVARIANT 3: edge-triggered ──▶ DRAIN to EAGAIN.
               Stop early and you are NEVER told again.      */
            for (;;) {
                ssize_t r = read(c->fd, buf, sizeof buf);
                if (r > 0)  { on_data(c, buf, r); continue; }
                if (r == 0) { defer_close(c); break; }
                if (errno == EAGAIN) break;
                if (errno == EINTR)  continue;
                defer_close(c); break;
            }
        }

        if (e & EPOLLOUT) flush_output(c);
    }

    /* INVARIANT 4: close AFTER the batch. Closing inside the
       loop while a later event in the SAME batch references
       the same conn is a use-after-free.                   */
    run_deferred_closes();
    run_expired_timers();
}

/* INVARIANT 5: writes are partial, and EPOLLOUT must be
   DEREGISTERED when the buffer drains - otherwise the loop
   spins at 100% CPU being told "still writable".          */
static void flush_output(struct conn *c) {
    while (c->out_sent < c->out_len) {
        ssize_t w = write(c->fd, c->out + c->out_sent,
                          c->out_len - c->out_sent);
        if (w > 0) { c->out_sent += w; continue; }
        if (errno == EAGAIN) {          /* kernel buffer full */
            if (!c->want_write) {
                c->want_write = true;
                mod_events(c, EPOLLIN | EPOLLOUT | EPOLLET);
            }
            return;
        }
        if (errno == EINTR) continue;
        defer_close(c); return;
    }
    if (c->want_write) {                /* drained ──▶ STOP  */
        c->want_write = false;          /* asking, or SPIN   */
        mod_events(c, EPOLLIN | EPOLLET);
    }
}

/* MAKING EVERYTHING A DESCRIPTOR - the unifying trick */
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK);
int sfd = signalfd(-1, &mask, SFD_NONBLOCK);   /* signals   */
int efd = eventfd(0, EFD_NONBLOCK);            /* wake from
                                                  another
                                                  thread    */
/*   ▶ now timers, signals, and cross-thread wakeups are
     ordinary readable fds and the loop has ONE mechanism. */

/* SCALING ACROSS CORES */
setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &(int){1}, sizeof(int));
/*   one listening socket and one loop PER CORE; the kernel
     hashes incoming connections across them. No shared
     accept, no herd, no cross-core cache traffic.         */`
      },
      {
        title: "Where Event Loops Go Wrong in Production",
        content:
          "The failure modes are consistent enough to be a checklist. The most damaging is a blocking operation inside a handler, which stalls every connection the loop owns and shows up as latency spikes with idle CPU, so the usual saturation metrics give no signal; DNS resolution, file reads, contended mutexes, synchronous logging, and page faults on cold memory all qualify. Second is the edge-triggered drain bug, where a handler reads once and leaves data behind, after which no further notification arrives and that connection hangs silently and permanently. Third is the EPOLLOUT spin, where a handler registers for write readiness and never deregisters, so the loop burns a full core being repeatedly told that a socket with an empty buffer is writable. Fourth is the use-after-free from closing a descriptor while another event in the same batch still refers to it, which is why closes are deferred to the end of the batch and why descriptor numbers must never be used as identities across batches, since the kernel reuses them immediately. Fifth is CPU-heavy work inside the loop, which is not blocking but has the same effect - a hundred-millisecond computation delays every pending connection by that much. Sixth is the thundering herd when many loops share one listening descriptor, addressed by EPOLLEXCLUSIVE or, preferably, by SO_REUSEPORT giving each loop its own socket. The unifying observation is that an event loop trades a scheduler you did not have to write for one you now own, and every rule above is a scheduling rule.",
        diagram: asciiDiagram(`Production failure modes, in order of damage

  1. ▼ BLOCKING INSIDE A HANDLER ▼   ── the big one
     ┌──────────────────────────────────────────────────┐
     │ symptom: p99 latency spikes, CPU near IDLE       │
     │ cause:   DNS, file read, contended mutex, sync   │
     │          logging, page fault on cold memory      │
     │ effect:  EVERY connection on this loop waits     │
     │ why hard: no saturation signal, and the stalled  │
     │           requests are unrelated to the culprit  │
     └──────────────────────────────────────────────────┘
     fix: thread pool or async equivalent for anything
          that can wait

  2. EDGE-TRIGGERED DRAIN BUG
     read once ──▶ data remains ──▶ no new edge ──▶
     ──▶ connection HANGS FOREVER, silently, no error
     fix: loop until EAGAIN, always

  3. EPOLLOUT SPIN
     register for writable ──▶ buffer drains ──▶ forget to
     deregister ──▶ "still writable" ──▶ "still writable"
     ──▶ 100% CPU on one core, doing nothing
     fix: deregister EPOLLOUT the moment the buffer empties

  4. USE-AFTER-FREE ON CLOSE
     batch: [ event for fd 7 ][ ... ][ event for fd 7 ]
                  │                          │
             close(7), free(conn)      conn is FREED
                                       ──▶ crash, or worse,
                                           fd 7 was REUSED
                                           by a new connection
     fix: DEFER closes to the end of the batch; never use a
          raw fd number as an identity across batches

  5. CPU-HEAVY WORK IN A HANDLER
     not blocking, identical effect. 100 ms of computation
     delays every pending connection by 100 ms.

  6. THUNDERING HERD ON ACCEPT
     one listen fd shared by 16 loops ──▶ one connection
     wakes all 16, 15 get EAGAIN
     fix: EPOLLEXCLUSIVE, or SO_REUSEPORT per loop

  ┌──────────────────────────────────────────────────────┐
  │ THE UNIFYING POINT                                   │
  │ An event loop trades a scheduler you did not have to │
  │ write for one you now OWN. Every rule above is a     │
  │ scheduling rule you are now responsible for.         │
  └──────────────────────────────────────────────────────┘`)
      }
    ],
    examples: [
      {
        title: "A loop burning a core with no traffic",
        input: "One thread at 100 percent CPU while connection count is near zero.",
        output: "EPOLLOUT remained registered on an idle socket with an empty write buffer.",
        explanation:
          "Step 1: The handler registered for write readiness when a write returned EAGAIN.\nStep 2: The buffer later drained but the registration was never removed.\nStep 3: Level-triggered epoll therefore reports the socket writable on every iteration, since a socket with an empty send buffer is always writable.\nStep 4: The loop spins with no work to do; the fix is to deregister EPOLLOUT as soon as the output buffer empties, which is why the write path must always pair registration with deregistration."
      },
      {
        title: "A crash traced to a reused file descriptor",
        input: "A batch contained two events for the same descriptor and the first closed it.",
        output: "The second event referenced freed connection state, or worse, a new connection.",
        explanation:
          "Step 1: epoll_wait returned a batch of events, one of which triggered a close and free.\nStep 2: A later event in the same batch still held a pointer to the freed structure.\nStep 3: Because the kernel reuses the lowest available descriptor number immediately, that number may already belong to a newly accepted connection, so the bug can silently cross-wire two clients rather than crashing.\nStep 4: Deferring closes until after the batch is processed, and using generation counters rather than raw descriptor numbers as identities, eliminates the class."
      },
      {
        title: "Sixteen loops woken by one connection",
        input: "A server shares one listening socket across sixteen accept loops.",
        output: "Every connection wakes all sixteen, fifteen of which get EAGAIN.",
        explanation:
          "Step 1: All loops registered interest in the same listening descriptor.\nStep 2: A single incoming connection makes that descriptor readable, so all waiters are woken.\nStep 3: One wins the accept and the rest waste a wakeup, a context switch, and a syscall each.\nStep 4: EPOLLEXCLUSIVE limits wakeups to one waiter, and SO_REUSEPORT is better still because each loop has its own listening socket and the kernel hashes connections across them, eliminating both the herd and the shared cache line."
      }
    ],
    tips: [
      "Explain epoll's advantage as O(ready) versus O(watched) rather than as being generally faster; the scaling argument is the answer.",
      "Bring up timerfd, signalfd, and eventfd as the unification trick - making everything a descriptor is what keeps the loop simple.",
      "When designing a multi-core server, propose SO_REUSEPORT with one loop per core rather than one loop with worker threads."
    ],
    tricks: [
      "A socket with an empty send buffer is always writable, so leaving EPOLLOUT registered guarantees a busy loop.",
      "Descriptor numbers are reused immediately, so they are unsafe as identities across event batches.",
      "Level-triggered readiness can be spurious - a discarded packet is the classic case - which is another reason every descriptor must be non-blocking."
    ],
    memoryAids: [
      "select scans everything, poll scans everything without a limit, epoll returns only what fired.",
      "Register once, wait many - that is the whole epoll idea.",
      "Non-blocking always, drain to EAGAIN, deregister EPOLLOUT, defer closes."
    ],
    interviewPatterns: [
      "Implementation: 'write an echo server with epoll' - the invariants are what is being graded, not the syntax.",
      "Diagnosis: 'one core at 100 percent with no traffic' and 'a connection that hangs silently' - the two signature bugs.",
      "Frequency and companies: Tier 1 for backend, networking, and infrastructure roles; extremely common in systems-focused interviews."
    ],
    practiceProblems: [
      "Why is epoll O(1) where poll is O(n)? Answer: Because epoll separates registering interest from waiting for events. With poll, the complete set of descriptors is passed into the kernel on every call, so the kernel must copy it in and examine each entry to determine readiness, and the application must then scan the returned array to find which entries fired - both are proportional to the number of descriptors watched regardless of how few are ready. epoll registers interest once via epoll_ctl, and the kernel maintains that set persistently in a red-black tree with a callback attached to each watched object; when an object becomes ready its callback moves it onto a ready list. epoll_wait then simply harvests that list, so the work is proportional to the number of ready descriptors. For a server with ten thousand connections of which three are active at any instant, that is the difference between twenty thousand examinations per iteration and three.",
      "How do you handle a partial write correctly in an event loop? Answer: A write on a non-blocking socket may accept fewer bytes than offered, or return EAGAIN having accepted none, because the kernel's send buffer is full. The handler must therefore keep the unsent remainder in a per-connection output buffer, track how much has been sent, and register the descriptor for EPOLLOUT so the loop is notified when the socket becomes writable again. On that notification it resumes writing from the recorded offset. The step people forget is the reverse transition: once the buffer is fully drained, EPOLLOUT must be deregistered, because a socket with an empty send buffer is always writable and the loop will otherwise spin at full CPU being told so repeatedly. Two further considerations matter in production: the output buffer must be bounded, or a slow client can make the server allocate without limit, and a client that never drains should eventually be disconnected.",
      "How would you scale an event-loop server across sixteen cores? Answer: Run one loop per core rather than one loop feeding worker threads, because the latter reintroduces cross-thread handoff, cache line bouncing, and synchronisation on the shared queue. Give each loop its own listening socket on the same address using SO_REUSEPORT, so the kernel hashes incoming connections across the sockets and each loop owns its connections exclusively - no shared accept, no thundering herd, no shared state between loops. Pin each loop thread to a core, and align network interrupt affinity so that a connection's receive processing happens on the same core as its loop, keeping socket state and packet data in local cache. Anything that genuinely must block, such as file I/O or DNS, goes to a separate thread pool, or is handled through io_uring so it stays in the loop. The residual weakness is that SO_REUSEPORT hashing can distribute unevenly if connection lifetimes vary widely, which is why long-lived connection workloads sometimes need explicit rebalancing."
    ],
    faq: [
      {
        question: "What is the real difference between level-triggered and edge-triggered, and which should you use?",
        answer:
          "Level-triggered reports a condition whenever it holds. If a socket has unread data, every call to epoll_wait reports it readable until the data is consumed. Edge-triggered reports only transitions: a descriptor is reported when it goes from having no data to having data, and it will not be reported again until the buffer is emptied and new data arrives. The performance argument for edge-triggered is fewer wakeups and fewer redundant reports at high event rates, and it is what allows a handler to read in a tight loop without returning to epoll_wait between reads. The correctness obligation is severe: because you are told once, you must consume everything available before returning, looping on read until it returns EAGAIN, and if you stop early the remaining data produces no further notification and the connection hangs permanently with no error logged anywhere - a bug that typically appears only when a message spans buffer boundaries under load. The same obligation applies to accept, where a single edge may correspond to several pending connections, so the handler must accept in a loop. Level-triggered forgives partial consumption and is the right default; it is also easier to combine with backpressure, since you can simply not read when a downstream buffer is full and be reminded later, whereas under edge-triggered you must remember for yourself. The pragmatic answer is to start level-triggered and adopt edge-triggered only where measurement shows the wakeup rate matters, ensuring the drain discipline is enforced everywhere."
      },
      {
        question: "Why must every descriptor in an event loop be non-blocking, even with level-triggered epoll?",
        answer:
          "Because readiness is a hint about the past, not a guarantee about the present, and because a single blocking call destroys the entire loop rather than one connection. The most cited reason applies to edge-triggered mode, where you must read repeatedly until EAGAIN and the final read is by construction one that would block. But it applies to level-triggered too, for several reasons. Readiness can be spurious: the classic documented case is a packet that arrives and makes the socket readable, then fails checksum validation and is discarded, so by the time your handler runs there is nothing to read and a blocking read waits indefinitely. With multiple threads sharing an epoll set, another thread may consume the data between the notification and your read. Accept has an equivalent race where another thread takes the pending connection first. Writes are worse still, since readiness says the buffer has room, not that it has room for the amount you intend to write, so a large blocking write can partially complete and then block. In every one of these cases the consequence is not a slow connection but a stalled loop, with every other connection it serves frozen until the call returns. Setting O_NONBLOCK converts all of them into an EAGAIN return that the loop handles as an ordinary case, which is why it is treated as an unconditional invariant rather than an optimisation."
      },
      {
        question: "How do timers, signals, and cross-thread wakeups fit into an event loop?",
        answer:
          "The unifying technique on Linux is to turn each of them into a file descriptor so the loop needs only one mechanism. Timers can be handled by computing the time until the nearest deadline and passing it as the epoll_wait timeout, which works but tangles timer management into the loop's control flow and becomes awkward with many timers; timerfd_create instead produces a descriptor that becomes readable when the timer expires, so a timer is just another event and can be stored in the same data structures as connections. Signals are notoriously difficult to combine with event loops because handlers run asynchronously, may interrupt the loop at any point, may only call async-signal-safe functions, and can be coalesced so that several occurrences appear as one; the traditional workaround was the self-pipe trick, where the handler writes one byte to a pipe the loop watches, and signalfd formalises this by delivering signals as readable events on a descriptor with the full siginfo available. eventfd provides a lightweight counter-based descriptor used to wake a loop from another thread, which is how work is handed to a loop from a thread pool. inotify and fanotify similarly expose filesystem changes as readable descriptors. The result is a loop with a single dispatch path, and it explains why libuv and similar libraries present timers, signals, and I/O through one uniform API - the operating system already made them uniform. Beyond timer delivery, a production loop needs an efficient structure for many timers, typically a hierarchical timing wheel for O(1) insertion or a heap when exact ordering matters."
      },
      {
        question: "What is the thundering herd on accept and how is it solved?",
        answer:
          "It occurs when multiple threads or processes wait for connections on the same listening socket. A single incoming connection makes that socket readable, and because all waiters registered interest in the same object, the kernel wakes all of them. One wins the accept; the rest wake, perform a context switch, issue a system call, receive EAGAIN, and go back to sleep. With sixteen loops that is fifteen wasted wakeups per connection, plus contention on the listening socket's lock and on the shared cache lines involved, and the waste grows linearly with the number of waiters. Historically the workaround was a mutex around accept so only one thread waited at a time, which serialises acceptance and adds its own latency. Linux later added EPOLLEXCLUSIVE, which tells epoll to wake only one waiter for a given event on that descriptor, solving the wakeup waste directly, though the listening socket is still shared and its lock still contended. The better modern answer is SO_REUSEPORT, which permits multiple sockets to bind the same address and port, giving each loop its own listening socket and its own accept queue; the kernel hashes each incoming connection to one of them, so there is no shared object, no herd, and no cross-core cache traffic on accept. It also allows graceful restarts, since a new process can bind alongside the old one and take a share of new connections while the old drains. The one caveat is that the hash distributes connections rather than load, so if connection lifetimes or costs vary substantially the loops can become unbalanced."
      },
      {
        question: "Does io_uring make epoll obsolete?",
        answer:
          "Not yet, and possibly not entirely. io_uring is more capable on every axis that matters technically: it is completion-based rather than readiness-based, so the kernel performs the operation and hands you the result instead of telling you to go and do it; it works for regular files, which epoll fundamentally cannot; it batches many operations into a single system call and, in SQPOLL mode, requires no system calls at all in the steady state, which matters more since Spectre mitigations raised the cost of each crossing; it supports linked operations so a chain like accept-then-read executes without returning to user space; and registered buffers and files remove per-operation setup costs. For a new high-performance server on a recent Linux kernel it is the better foundation, and the measured differences on small-request workloads are substantial. The reasons epoll persists are practical rather than technical. It is available everywhere Linux is, including old kernels and constrained environments, whereas io_uring requires a reasonably modern kernel and its capabilities vary considerably by version. It is far simpler to use correctly - io_uring requires buffers to remain valid until completion rather than until submission, which is a lifetime discipline that C and C++ code frequently gets wrong and that borrow-checked languages find awkward to express. And its rapid growth in kernel attack surface produced a steady stream of vulnerabilities, leading Google, several distributions, and various container platforms to disable or restrict it by default, which limits where it can actually be deployed. The realistic outlook is coexistence: io_uring for performance-critical and file-heavy paths, epoll for portability, simplicity, and restricted environments, with portability layers such as libuv abstracting the choice."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Lemon - Kqueue: A generic and scalable event notification facility (USENIX 2001)",
        insight: "Articulates why register-once-wait-many replaced scan-everything, and generalises the idea beyond descriptors."
      },
      {
        source: "note",
        attribution: "Linux epoll(7) man page, particularly the level-triggered versus edge-triggered section",
        insight: "The authoritative statement of the drain-to-EAGAIN obligation and of why spurious readiness can occur."
      },
      {
        source: "blog",
        attribution: "Cloudflare engineering posts on SO_REUSEPORT, EPOLLEXCLUSIVE, and accept queue behaviour",
        insight: "Production measurements of the thundering herd and of how connection distribution actually behaves at scale."
      }
    ]
  }
];
