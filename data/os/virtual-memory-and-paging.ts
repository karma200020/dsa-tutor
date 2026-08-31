import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-virtual-memory-and-paging - "OS: Virtual Memory and Paging" (5 topics).
export const osVirtualMemoryTopics: Topic[] = [
  {
    id: "topic-os-demand-paging",
    moduleId: "mod-os-virtual-memory-and-paging",
    title: "Demand Paging and the Page Fault Path",
    intuition:
      "Demand paging is the decision to bring a page into memory only when it is actually touched, rather than when it is mapped. That one policy is what makes it possible to start a 200 MB executable in milliseconds, to overcommit memory, and to map a file larger than RAM. The cost is that the fault becomes a routine event rather than an error, so the fault handler is on the critical path of ordinary program execution - and understanding the difference between a minor fault, which is microseconds, and a major fault, which is tens of microseconds to milliseconds, is the whole of practical memory performance.",
    complexity: {
      time:
        "Minor fault: roughly 1 to 3 microseconds - a trap, a frame allocation or page cache lookup, a page-table update, and a return. Major fault: 50 to 100 microseconds on NVMe, 100 to 500 on SATA SSD, 5 to 10 milliseconds on rotating media. The ratio between minor and major is three to four orders of magnitude, which is why the two are counted separately everywhere.",
      space:
        "Demand paging lets resident set size stay far below virtual size; a process mapping a 4 GB file may hold only the few megabytes it has touched. The kernel's cost is a page-table entry per resident page plus the page cache or swap metadata tracking where a non-resident page lives."
    },
    lesson: [
      {
        title: "Lazy Loading and Why Programs Start Fast",
        content:
          "When the loader runs an executable it does not read the binary into memory; it creates mappings. The text segment becomes a private file mapping, the data segment another, the BSS an anonymous zero-filled mapping, and nothing at all is read from disk until the first instruction executes and faults. Execution then pulls in pages one at a time, or in small clusters through readahead, so a program that uses ten percent of its code and touches a fraction of its data reads only that fraction. This is why startup time is roughly proportional to the working set rather than to the binary size, why a 200 MB binary can start in milliseconds, and why the resident set of a large application is typically a small fraction of its virtual size. The same laziness applies to anonymous memory: a fresh anonymous page is satisfied by mapping a shared, read-only page of zeros, and only a write triggers the allocation of a real frame - so an enormous calloc costs almost nothing until written. The consequence to internalise is that the fault is not an exception in the error sense; it is the normal mechanism by which memory becomes present.",
        diagram: asciiDiagram(`Starting a program: nothing is read until it is touched

  execve("/usr/bin/big")   binary is 200 MB
     │
     ├── create VMA: .text   ──▶ MAP_PRIVATE file, r-x   0 pages read
     ├── create VMA: .rodata ──▶ MAP_PRIVATE file, r--   0 pages read
     ├── create VMA: .data   ──▶ MAP_PRIVATE file, rw-   0 pages read
     ├── create VMA: .bss    ──▶ MAP_ANONYMOUS,    rw-   0 pages
     ├── create VMA: stack   ──▶ MAP_ANONYMOUS,    rw-   0 pages
     └── jump to entry point
            │
            ▼  ── FAULT on the very first instruction
        ┌──────────────────────────────────────────┐
        │ read ONE page (plus readahead) of .text  │
        └──────────────────────────────────────────┘
            │
            ▼  program runs, faulting as it goes

  After 200 ms of execution:
     VmSize  ████████████████████████████████  200 MB mapped
     VmRSS   ███                                18 MB resident
     ──▶ 91% of the binary was never read from disk.

  ANONYMOUS memory is lazier still
     calloc(1 GB)  ──▶ 1 GB of VMA, zero frames
     read a byte   ──▶ maps the SHARED ZERO PAGE, read-only
                       still zero frames allocated!
     write a byte  ──▶ COW fault ──▶ ONE real frame
     ┌──────────────────────────────────────────────────┐
     │ This is why calloc of a huge array is instant and │
     │ why RSS grows only as you write into it.          │
     └──────────────────────────────────────────────────┘`)
      },
      {
        title: "Classifying a Fault: Minor, Major, Invalid",
        content:
          "The fault handler's first task is classification, and the categories behave completely differently. A minor fault is resolved without I/O: the page is already in the page cache because another process read the file or it was recently evicted from a process but not from the cache, or it is a first touch of anonymous memory needing only a zeroed frame, or it is a copy-on-write fault needing a copy of a resident frame. A major fault requires reading from storage - from a file for file-backed pages, from swap for anonymous ones - and blocks the thread for the duration of the I/O. An invalid access is a genuine error: an address in no mapping at all, or a write to a read-only page that is not marked copy-on-write, or a user-mode access to a kernel page, and the kernel delivers SIGSEGV. Two special cases round out the list: an access just below the stack mapping is treated as legitimate stack growth and the mapping is extended, and an access to a userfaultfd-registered range is forwarded to a user-space handler. The operational skill is knowing that /proc/pid/stat, ps, and perf all report minor and major counts separately, and that a rising major fault rate is the signature of memory pressure while a high minor rate is usually just normal allocation activity.",
        codeExample: `/* The fault handler's decision tree, in essence. */

void handle_page_fault(unsigned long addr, unsigned int flags) {
    struct vm_area_struct *vma = find_vma(current->mm, addr);

    /* 1. No mapping at all? */
    if (!vma || addr < vma->vm_start) {
        if (vma && (vma->vm_flags & VM_GROWSDOWN) && addr >= sp - 65536)
            expand_stack(vma, addr);        /* legit stack growth */
        else
            return force_sig(SIGSEGV);      /* wild pointer       */
    }

    /* 2. Mapping exists - are the permissions satisfied? */
    if ((flags & FAULT_WRITE) && !(vma->vm_flags & VM_WRITE))
        return force_sig(SIGSEGV);          /* write to r-- page  */
    if ((flags & FAULT_EXEC) && !(vma->vm_flags & VM_EXEC))
        return force_sig(SIGSEGV);          /* NX violation       */

    /* 3. Where does the content come from? */
    if (pte_none(*pte)) {
        if (vma_is_anonymous(vma))
            anon_fault(vma, addr);          /* MINOR: zero page,
                                               or a fresh frame   */
        else
            filemap_fault(vma, addr);       /* page cache hit  ──▶ MINOR
                                               cache miss      ──▶ MAJOR */
    } else if (!pte_present(*pte)) {
        swap_in(pte);                       /* MAJOR: read swap   */
    } else if (flags & FAULT_WRITE) {
        do_cow_fault(vma, addr);            /* MINOR: copy a frame*/
    }
    /* return ──▶ hardware RE-EXECUTES the faulting instruction */
}

/* Measure the two kinds - they differ by ~1000x: */
// ps -o min_flt,maj_flt,cmd -p <pid>
// perf stat -e page-faults,major-faults ./prog
// /usr/bin/time -v ./prog     # "Major (requiring I/O) page faults"
// vmstat 1                    # si/so columns = swap in/out`
      },
      {
        title: "Readahead, Prefaulting, and Fighting Fault Cost",
        content:
          "Because a fault costs a trap and a page-table update even when no I/O is needed, faulting a large region one page at a time is measurably slow, and if I/O is required the cost is dominated by per-request latency rather than by bandwidth. Systems therefore batch aggressively. The kernel's file readahead detects sequential access and issues reads for pages ahead of the current position, growing the window as the pattern holds and collapsing it when access looks random, so a sequential scan of a mapped file takes far fewer major faults than it has pages. Fault-around does the same for the page-table side: on a minor fault for a file-backed page, the kernel maps a cluster of nearby pages that are already in the cache, typically sixteen, so one trap installs many mappings. Applications can help explicitly: MAP_POPULATE pre-faults an entire mapping at creation, madvise with MADV_WILLNEED starts asynchronous readahead, MADV_SEQUENTIAL and MADV_RANDOM tune the readahead heuristic directly, and mlock pins pages so they can never fault again. The design principle behind all of these is the same one that governs disk I/O generally - per-operation cost dominates, so amortise it over as many pages as the access pattern justifies.",
        diagram: asciiDiagram(`Amortising fault cost

  NAIVE: one fault per page
    touch p[0]     ──▶ trap ──▶ I/O ──▶ map ──▶ resume
    touch p[4096]  ──▶ trap ──▶ I/O ──▶ map ──▶ resume
    touch p[8192]  ──▶ trap ──▶ I/O ──▶ map ──▶ resume
    ▶ 1 GB sequential = 262,144 faults. Unacceptable.

  READAHEAD (the I/O side)
    kernel sees 2 sequential faults ──▶ starts a window
      fault at page N
        └──▶ issue read for N .. N+31 in ONE request
             ▶ next 31 touches are MINOR (already in cache)
      window GROWS while the pattern holds (up to ~128 pages)
      window COLLAPSES on a random-looking access
    ┌────────────────────────────────────────────────────┐
    │ sequential mmap scan: ~1 major fault per 32 pages  │
    │ random mmap access:   ~1 major fault per page      │
    │ ──▶ the SAME code can be 30x apart in speed        │
    └────────────────────────────────────────────────────┘

  FAULT-AROUND (the page-table side)
    minor fault on a file page that IS in the cache
      └──▶ map 16 surrounding cached pages in the same trap
           ▶ 16x fewer traps for no extra I/O

  EXPLICIT CONTROL
    ┌──────────────────────┬─────────────────────────────┐
    │ MAP_POPULATE         │ prefault the WHOLE mapping  │
    │ MADV_WILLNEED        │ async readahead, now        │
    │ MADV_SEQUENTIAL      │ readahead ON, aggressive    │
    │ MADV_RANDOM          │ readahead OFF - stop wasting│
    │ mlock / mlockall     │ pin: never fault, never swap│
    └──────────────────────┴─────────────────────────────┘

  Getting MADV_RANDOM wrong on a random-access index means the
  kernel reads 32 pages to serve 1 ──▶ 32x wasted bandwidth.`)
      }
    ],
    examples: [
      {
        title: "Instant start of a huge binary",
        input: "A 200 MB statically linked binary starts in 30 milliseconds.",
        output: "Only the pages actually executed were read.",
        explanation:
          "Step 1: execve creates mappings for the segments and reads nothing.\nStep 2: The first instruction faults, pulling in one page plus readahead.\nStep 3: Execution continues faulting only for code paths it takes, so unused code and data are never read.\nStep 4: RSS after startup is a few tens of megabytes against 200 MB of virtual size, which is the normal signature of demand paging rather than evidence of anything unusual."
      },
      {
        title: "Random access on a mapped index running 30 times slower than expected",
        input: "A memory-mapped index scans at 3 GB/s sequentially but 100 MB/s randomly.",
        output: "Readahead is reading 32 pages to serve each single useful page.",
        explanation:
          "Step 1: The kernel's heuristic infers a sequential pattern from consecutive faults and grows the readahead window.\nStep 2: For genuinely random access those extra pages are never touched, so nearly all the I/O bandwidth is wasted.\nStep 3: The page cache is also polluted, evicting pages that would have been reused.\nStep 4: Calling madvise with MADV_RANDOM on the mapping disables readahead and recovers most of the gap; the same tuning is why databases mark index and heap regions differently."
      },
      {
        title: "Latency spikes from swap-in on a memory-constrained host",
        input: "p99 latency jumps to 40 ms; vmstat shows non-zero si and so columns.",
        output: "Major faults on anonymous memory - the process is being swapped.",
        explanation:
          "Step 1: si and so report pages swapped in and out per second, which are zero on a healthy host.\nStep 2: Non-zero values mean anonymous pages are being written to swap and read back, and each read back is a major fault blocking the thread.\nStep 3: ps with maj_flt confirms which process is paying, and the count rises in step with the latency.\nStep 4: The fixes are reducing the working set, adding memory, mlocking latency-critical regions, or disabling swap and accepting an OOM kill instead of unbounded latency - which is what most latency-sensitive services choose."
      }
    ],
    tips: [
      "Always separate minor from major faults explicitly; conflating them makes every performance answer in this area wrong by three orders of magnitude.",
      "Say that the hardware re-executes the faulting instruction after the handler returns - it shows you know the fault is resumable rather than an error.",
      "Bring up readahead and MADV_RANDOM when discussing mmap performance; it is the single most common real-world tuning fix."
    ],
    tricks: [
      "A high minor fault rate is usually just allocation activity; a high major fault rate is memory pressure and is the number to alert on.",
      "The shared zero page means reading fresh anonymous memory costs no frame at all - only writing does.",
      "Non-zero si/so in vmstat is the fastest confirmation that latency problems are swap-related rather than CPU-related."
    ],
    memoryAids: [
      "Minor fault: microseconds, no disk. Major fault: milliseconds, disk. Invalid: SIGSEGV.",
      "Nothing is read at exec time - the first instruction is the first fault.",
      "Readahead is a guess; MADV_RANDOM is you telling it to stop guessing."
    ],
    interviewPatterns: [
      "Mechanism: 'walk me through what happens on a page fault' - classify first, then resolve, then re-execute.",
      "Performance: 'why is my mmap'd random access so slow' - readahead amplification and MADV_RANDOM.",
      "Frequency and companies: Tier 1 for systems and performance roles; Tier 2 for backend, where it appears as latency debugging."
    ],
    practiceProblems: [
      "A process has 2 million minor faults and 40 major faults. Is that healthy? Answer: Almost certainly yes. Minor faults are the normal mechanism by which allocated memory becomes resident - every first touch of anonymous memory, every copy-on-write split, and every page cache hit is a minor fault costing a couple of microseconds. Two million of them over a process's life is unremarkable for anything allocation-heavy. Forty major faults means the process almost never waited on storage. The number to watch is major faults per second under steady load, not the cumulative minor count.",
      "Why does a forked child that immediately calls exec cause almost no faults? Answer: fork copies only page tables and marks pages read-only, so no data is copied and no faults occur at fork time. The child then calls exec, which tears down the entire address space and replaces it with fresh mappings for the new binary - so the copy-on-write pages the child would have faulted are discarded before it ever writes to them. The only faults are the ones the new program takes as it begins executing. This is why the fork-exec pair is efficient despite fork's apparent semantics of duplicating memory.",
      "How would you eliminate page faults from a latency-critical trading path? Answer: Pre-fault and pin everything the path touches. Allocate with mmap and MAP_POPULATE so every page is backed before trading starts, or touch the whole region explicitly in a warm-up loop. Then call mlockall with MCL_CURRENT and MCL_FUTURE so the kernel can never reclaim or swap those pages. Pre-touch thread stacks, since a deep call can otherwise fault. Disable transparent huge pages to avoid compaction stalls, and combine with a real-time scheduling policy, because after faults are eliminated preemption is the remaining source of jitter."
    ],
    faq: [
      {
        question: "What is the difference between a minor and a major page fault?",
        answer:
          "The distinction is whether the fault requires disk I/O, and the difference in cost is roughly a thousandfold, which is why every measurement tool reports them separately. A minor fault is resolved entirely in memory: the page might already be in the page cache because another process read the file or because it was unmapped from this process but not evicted from the cache; it might be a first touch of anonymous memory, requiring only that the kernel hand over a zeroed frame; or it might be a copy-on-write fault, requiring a copy of a frame that is already resident. All of these cost a trap, some bookkeeping, a page-table update, and a return - one to three microseconds. A major fault means the content must be fetched from storage, either from a file for a file-backed page or from the swap device for an anonymous one, and the faulting thread blocks for the duration: fifty to a hundred microseconds on NVMe, several milliseconds on rotating media. The practical implications follow directly. A high minor fault rate is normal and usually reflects allocation activity, so alerting on total page faults produces noise. A rising major fault rate is the definitive signature of memory pressure and correlates directly with latency, so that is the metric to alert on. You read them from /proc/pid/stat, from ps with min_flt and maj_flt, from /usr/bin/time with the verbose flag, or from perf, and si and so in vmstat give the system-wide swap view."
      },
      {
        question: "Why does the kernel use a shared zero page?",
        answer:
          "Because an enormous proportion of anonymous memory is allocated, read, and never written, and allocating a real frame for each such page would waste memory for no benefit. When a process takes a read fault on a fresh anonymous page, the kernel maps a single system-wide page full of zeros, read-only, into that process's page table - no frame is allocated at all. Every process that reads untouched anonymous memory maps that same physical page. Only when the process writes does a copy-on-write fault occur, at which point the kernel allocates a real frame, zeroes it, and installs it writable. The payoff is visible in several common patterns: calloc of a huge array is instant and costs no memory until written; a sparse array or hash table that is mostly empty consumes memory proportional to what is actually used rather than to its declared size; and a process that reserves a large buffer defensively pays nothing for the unused portion. It also explains a measurement subtlety - reading fresh anonymous memory does not increase RSS in a way you might expect, because the zero page is shared and accounted differently. The mechanism is a neat illustration of the general principle that virtual memory turns 'allocate' into 'promise', and only writing converts the promise into a commitment."
      },
      {
        question: "How does the kernel decide how much to read ahead?",
        answer:
          "Adaptively, by inferring the access pattern from the sequence of faults and adjusting a per-file window. When the kernel sees a fault for a page immediately following one it recently served, it treats the access as sequential and issues a read for a batch of pages ahead of the current position rather than just the one requested. If subsequent accesses continue to land within the region it read ahead, the pattern is confirmed and the window doubles, up to a configurable maximum of typically 128 kilobytes; if an access falls outside the window, the pattern looks random and the window collapses back to a minimal size. It also maintains an async readahead marker inside the window so that touching the marker page triggers the next batch before the application actually runs out, keeping the pipeline full. The reason this matters so much is that per-request latency dominates storage cost - a single 128 KB read costs barely more than a single 4 KB read on NVMe and dramatically less than 32 separate reads - so sequential streaming can approach device bandwidth while page-at-a-time access cannot. The failure mode is a genuinely random workload that happens to look sequential for a few accesses, where readahead reads 32 pages to serve one, wasting bandwidth and polluting the cache. Applications that know their pattern should say so: madvise with MADV_SEQUENTIAL, MADV_RANDOM, or MADV_WILLNEED, or posix_fadvise for the read and write path, and databases routinely set different hints for sequential scans and index lookups on the same file."
      },
      {
        question: "What happens if a page fault occurs inside the kernel?",
        answer:
          "It depends entirely on why, and the kernel distinguishes several cases with very different handling. The routine and legitimate case is the kernel touching user memory on behalf of a process - copy_to_user and copy_from_user access the current process's mappings, and those pages may not be resident, so a fault there is expected and is handled exactly as a user-mode fault would be, with the kernel blocking on I/O if necessary. Related is faulting on vmalloc memory, which is lazily mapped into each address space and simply needs its mapping propagated. The dangerous case is a fault on an address the kernel believed valid - a corrupted pointer, a use-after-free of kernel memory, or dereferencing an unchecked user pointer - and the kernel cannot deliver a signal to itself, so it panics, printing an oops with the faulting address and a stack trace. The special case worth naming in an interview is a fault in a context where the kernel must not sleep: inside an interrupt handler, while holding a spinlock, or in any atomic section. Sleeping there would deadlock or lose the interrupt, so the kernel detects it and treats it as a bug. This is exactly why kernel code must use GFP_ATOMIC rather than GFP_KERNEL in interrupt context, why kernel stacks and interrupt-path data structures must be pinned rather than pageable, and why copy_from_user is forbidden in atomic context. The design principle is that faults are permitted where blocking is permitted, and nowhere else."
      },
      {
        question: "Why is prefaulting sometimes better and sometimes worse?",
        answer:
          "It is a straight trade of predictable upfront cost against unpredictable later cost, and which one you want depends entirely on whether latency or throughput matters and on whether you will actually use the memory. Prefaulting - through MAP_POPULATE, an explicit touch loop, or madvise with MADV_WILLNEED - moves all the fault work to a point you choose, typically startup, so the hot path afterwards runs with every page resident and takes no traps at all. That is exactly right for a trading system, a real-time audio path, or a low-latency service where a five-microsecond fault at the wrong moment blows a deadline, and it composes with mlockall to guarantee the pages also stay resident. It is exactly wrong for three common situations. If the program will touch only part of the region - a large sparse structure, a memory-mapped file where queries hit a fraction of the data - prefaulting reads and commits memory that is never used, wasting both time and RAM. If startup time is itself the metric, as for a short-lived command-line tool or a serverless function, moving all the cost to startup makes the visible number worse. And if the region is large relative to available memory, prefaulting can trigger reclaim or an OOM kill for memory the program would never have needed. The honest answer in an interview is to name the axis - do you know you will touch it, and do you care more about the tail or the total - and then give the mechanism that follows."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapter 21 (Beyond Physical Memory: Mechanisms)",
        insight: "Separates the mechanism of demand paging from the policy of replacement, which is exactly the split interviewers probe."
      },
      {
        source: "book",
        attribution: "Gorman - Understanding the Linux Virtual Memory Manager",
        insight: "Traces the actual fault path through the kernel, including the classification order that makes the decision tree memorable."
      },
      {
        source: "note",
        attribution: "Linux man pages - madvise(2), posix_fadvise(2), mmap(2)",
        insight: "The complete list of hints an application can give the kernel, which is where most real mmap performance fixes come from."
      }
    ]
  },
  {
    id: "topic-os-page-replacement-algorithms",
    moduleId: "mod-os-virtual-memory-and-paging",
    title: "Page Replacement: Choosing What to Evict",
    intuition:
      "Once memory is full, every new page requires evicting an old one, and the choice determines how often you pay a major fault. The optimal policy - evict the page whose next use is furthest away - requires knowing the future, so it exists only as a benchmark. Every real algorithm approximates recency or frequency with information the hardware is willing to provide for free, which on essentially all hardware means a single accessed bit per page. The entire field is therefore about extracting a usable eviction order from one bit per page, sampled periodically.",
    complexity: {
      time:
        "FIFO and clock are O(1) per eviction. True LRU requires updating a list on every access, which is impossible in hardware, so it is O(1) only in software caches. Clock's scan is amortised O(1) but can degenerate to a full sweep when most pages are recently accessed. LFU with aging costs a periodic scan proportional to resident pages.",
      space:
        "FIFO needs one pointer. Clock needs one bit per page plus a hand. LRU needs two pointers per page for a doubly-linked list, which is 16 bytes per 4 KB page or 0.4 percent overhead. ARC and 2Q maintain ghost lists of evicted page identifiers, typically doubling the metadata."
    },
    lesson: [
      {
        title: "Belady's Optimal, FIFO, and the Anomaly",
        content:
          "The optimal replacement policy evicts the page whose next reference is furthest in the future, which provably minimises faults and is unimplementable because it requires the future reference string. It matters as a benchmark: when a paper claims an algorithm is within ten percent of optimal, that is the comparison. FIFO evicts the oldest-loaded page, which is trivially cheap and terrible in practice, because age of loading has almost no relationship to future use - a page loaded early and used constantly is exactly the wrong thing to evict. FIFO also exhibits Belady's anomaly, where adding more memory can increase the fault count, which is deeply counterintuitive and worth being able to demonstrate on the classic reference string. The anomaly is possible because FIFO is not a stack algorithm: the set of pages resident with three frames is not necessarily a subset of the set resident with four. LRU, clock, and optimal are all stack algorithms and cannot exhibit the anomaly, so more memory never hurts them. Being able to name that property - stack algorithm - and explain why it excludes the anomaly is a strong signal in an interview.",
        diagram: asciiDiagram(`Belady's anomaly: MORE memory, MORE faults (FIFO only)

  reference string: 1 2 3 4 1 2 5 1 2 3 4 5

  THREE frames, FIFO
    1  2  3  4  1  2  5  1  2  3  4  5
    ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
  a │1 │1 │1 │4 │4 │4 │5 │5 │5 │5 │5 │5 │
  b │  │2 │2 │2 │1 │1 │1 │1 │1 │3 │3 │3 │
  c │  │  │3 │3 │3 │2 │2 │2 │2 │2 │4 │4 │
    └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
    F  F  F  F  F  F  F  .  .  F  F  .     = 9 faults

  FOUR frames, FIFO
    1  2  3  4  1  2  5  1  2  3  4  5
    ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
  a │1 │1 │1 │1 │1 │1 │5 │5 │5 │5 │4 │4 │
  b │  │2 │2 │2 │2 │2 │2 │1 │1 │1 │1 │5 │
  c │  │  │3 │3 │3 │3 │3 │3 │2 │2 │2 │2 │
  d │  │  │  │4 │4 │4 │4 │4 │4 │3 │3 │3 │
    └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
    F  F  F  F  .  .  F  F  F  F  F  F     = 10 faults

  ▶ 33% MORE memory ──▶ 11% MORE faults.

  WHY: FIFO is not a STACK ALGORITHM.
    stack property: contents(n frames) ⊆ contents(n+1 frames)
    LRU, LFU, and OPTIMAL all have it ──▶ anomaly impossible
    FIFO and (naive) CLOCK do not     ──▶ anomaly possible

  ▶ This is the standard "prove you understand replacement"
    question. Know the string and know the term.`)
      },
      {
        title: "LRU, and Why Nobody Implements It Exactly",
        content:
          "Least recently used evicts the page unused for the longest time, on the assumption that recent use predicts future use - which holds for most real workloads because programs have temporal locality. LRU is the reference point for practical algorithms and is a stack algorithm, so it is immune to Belady's anomaly. The problem is implementation. Exact LRU requires reordering a list on every memory access, and memory accesses happen billions of times per second inside the hardware, far below any level software can observe. Hardware could in principle maintain timestamps per page, but that would mean a memory write on every access, which is absurd. So exact LRU is implementable only where every access already passes through software - a database buffer pool, an application-level cache, a CPU cache set with a handful of ways - and never for physical page replacement. LRU also has a well-known pathology: a sequential scan larger than the cache evicts everything useful while gaining nothing, since each scanned page is used exactly once and yet becomes the most-recently-used page. That single weakness is what motivated LRU-K, 2Q, ARC, and the scan-resistant policies that every serious database uses.",
        codeExample: `/* Exact LRU: fine for a software cache, impossible for paging. */

struct Node { uint64_t key; void *val; Node *prev, *next; };

class LRUCache {                       /* O(1) get and put */
    unordered_map<uint64_t, Node*> map;
    Node *head, *tail;                 /* head = most recent */

    void touch(Node *n) { unlink(n); push_front(n); }

public:
    void *get(uint64_t k) {
        auto it = map.find(k);
        if (it == map.end()) return nullptr;
        touch(it->second);             /* ◀── ON EVERY ACCESS */
        return it->second->val;
    }
    void put(uint64_t k, void *v) {
        if (map.size() == capacity) {
            Node *victim = tail->prev; /* least recently used */
            unlink(victim); map.erase(victim->key); delete victim;
        }
        push_front(new Node{k, v});
    }
};

/* Why this cannot work for PHYSICAL page replacement:
     touch() must run on EVERY memory access.
     A memory access is a hardware event, billions/second.
     Software never sees it. Hardware will not maintain a list.
   ──▶ the OS gets ONE BIT per page, set by hardware, and must
       approximate LRU from periodic samples of that bit.      */

/* THE SEQUENTIAL SCAN PATHOLOGY
     cache holds the hot working set
     one full table scan streams through, N pages, each used once
     ──▶ every scanned page becomes MOST recently used
     ──▶ the entire hot set is evicted for data never reused
     ──▶ post-scan performance collapses until the set reloads

   Fixes: 2Q / LRU-K / ARC (scan resistance), or tell the cache:
     posix_fadvise(fd, off, len, POSIX_FADV_DONTNEED)
     madvise(p, len, MADV_DONTNEED)
     O_DIRECT to bypass the page cache entirely             */`
      },
      {
        title: "Clock, Second Chance, and What Linux Actually Does",
        content:
          "Clock is the practical approximation of LRU that runs on real hardware. Pages are arranged in a circular list with a hand; to evict, the hand advances and examines each page's accessed bit. If the bit is set, the page has been used since the last sweep, so the hand clears the bit and moves on - a second chance. If the bit is clear, the page has not been touched since the last sweep and is evicted. The result approximates 'not recently used' at the cost of one bit per page and no per-access software work at all. Enhanced clock additionally considers the dirty bit, preferring clean victims because they can be dropped without I/O, and sweeping twice if necessary. Linux extends this into a two-list scheme: an active list and an inactive list, with pages promoted to active on a second reference and demoted toward the tail of the inactive list as pressure grows, which gives frequency information as well as recency and provides scan resistance, since a page touched once stays inactive and is evicted first. Linux also separates anonymous from file-backed pages into distinct LRU pairs, since their eviction costs differ - a clean file page can be dropped, an anonymous page must be written to swap - and swappiness tunes the balance between them.",
        diagram: asciiDiagram(`Clock: approximating LRU with one hardware bit

           hand
            │
            ▼
      ┌───────────┐
      │ P0  A=1   │──┐        A = accessed bit, set BY HARDWARE
      └───────────┘  │        on any read or write
      ┌───────────┐  │
   ┌──│ P7  A=0   │  │        TO EVICT:
   │  └───────────┘  ▼          A=1 ──▶ clear it, advance
   │  ┌───────────┐┌───────────┐        ("second chance")
   │  │ P6  A=1   ││ P1  A=1   │        A=0 ──▶ EVICT THIS ONE
   │  └───────────┘└───────────┘
   │  ┌───────────┐┌───────────┐      Cost: one bit per page,
   │  │ P5  A=0   ││ P2  A=0   │      ZERO per-access software.
   │  └───────────┘└───────────┘
   │  ┌───────────┐┌───────────┐      ENHANCED CLOCK also reads
   └─▶│ P4  A=1   ││ P3  A=1   │      the DIRTY bit and prefers
      └───────────┘└───────────┘      clean victims (no I/O).

  LINUX: two lists, and anon separated from file

    ┌──────────── ACTIVE list ────────────┐
    │  referenced twice ──▶ promoted here │
    │  hot working set lives here         │
    └──────────────┬──────────────────────┘
                   │ demote under pressure
                   ▼
    ┌─────────── INACTIVE list ───────────┐
    │  new pages land here                │
    │  second reference ──▶ promote       │  ◀── SCAN RESISTANCE:
    │  no second reference ──▶ EVICT      │      a page touched
    └─────────────────────────────────────┘      once never gets
                                                 into ACTIVE

    and each list is split:
       ┌── ANON  (must be WRITTEN to swap to evict)
       └── FILE  (clean ──▶ just DROP it, no I/O)
       vm.swappiness tunes which side to pressure
         0   ──▶ avoid swapping anon; evict file pages
         60  ──▶ default balance
         100 ──▶ treat them equally`)
      }
    ],
    examples: [
      {
        title: "Demonstrating Belady's anomaly",
        input: "Reference string 1 2 3 4 1 2 5 1 2 3 4 5 under FIFO with 3 then 4 frames.",
        output: "9 faults with 3 frames, 10 faults with 4 frames.",
        explanation:
          "Step 1: With three frames, several pages happen to be evicted just before their reuse ends, producing 9 faults.\nStep 2: With four frames the eviction order changes such that pages 1 and 2 are evicted right before they are needed again.\nStep 3: This is possible only because FIFO is not a stack algorithm - the resident set with three frames is not a subset of the set with four.\nStep 4: LRU and optimal are stack algorithms, so their fault count is monotonically non-increasing in memory size and the anomaly cannot occur."
      },
      {
        title: "A nightly report destroying daytime cache performance",
        input: "A full table scan runs at 2 a.m.; query latency is poor for an hour afterwards.",
        output: "The scan evicted the hot working set under plain LRU.",
        explanation:
          "Step 1: Each page of the scan is read once and becomes the most-recently-used page, pushing hot pages toward eviction.\nStep 2: By the end of the scan the buffer pool contains only scan data, none of which will be read again.\nStep 3: Normal queries then run entirely from disk until the working set reloads, which takes as long as the warm-up.\nStep 4: Scan-resistant policies like 2Q or ARC keep single-reference pages out of the protected region, and explicitly hinting with POSIX_FADV_DONTNEED or reading with O_DIRECT achieves the same effect from the application side."
      },
      {
        title: "Tuning swappiness on a database host",
        input: "A database host with ample page cache begins swapping anonymous memory under load.",
        output: "Lowering vm.swappiness biases reclaim toward dropping file pages instead.",
        explanation:
          "Step 1: Linux keeps separate LRU lists for anonymous and file-backed pages because their eviction costs differ.\nStep 2: Evicting a clean file page costs nothing but a re-read later; evicting an anonymous page requires writing it to swap first and reading it back on a major fault.\nStep 3: For a database whose anonymous memory is the buffer pool, swapping it out is precisely backwards - the cache is being paged to disk.\nStep 4: Setting swappiness low, or to zero, tells reclaim to prefer file pages; the more decisive option is disabling swap entirely and accepting an OOM kill rather than unbounded latency."
      }
    ],
    tips: [
      "Name the stack-algorithm property when Belady's anomaly comes up; it is the reason LRU is immune and FIFO is not.",
      "Explain that exact LRU is impossible for paging because software never observes an individual memory access - the hardware gives one bit.",
      "Mention the sequential-scan pathology whenever LRU is praised; it is the motivation for every modern replacement policy."
    ],
    tricks: [
      "Clock is not a compromise nobody wanted - it is exactly what one hardware bit plus periodic sampling can buy, which is the honest framing.",
      "Preferring clean victims is a bigger win than any refinement of recency, because it converts an eviction from a write plus a read into just a read.",
      "Splitting anonymous from file-backed LRU lists is the reason swappiness exists; without the split there would be nothing to tune."
    ],
    memoryAids: [
      "Optimal needs the future, LRU needs every access, clock needs one bit - each step down is a step toward implementability.",
      "Belady's anomaly is a FIFO disease; stack algorithms are immune.",
      "One scan can evict everything - that single sentence is the whole case for scan resistance."
    ],
    interviewPatterns: [
      "Classic: 'simulate FIFO and LRU on this reference string' - be able to draw the frame table and count faults.",
      "Depth probe: 'why does no real system implement true LRU' - the per-access update requirement and the one-bit hardware budget.",
      "Frequency and companies: Tier 1 for OS-heavy interviews and database roles; the LRU cache implementation itself is a top-50 coding question."
    ],
    practiceProblems: [
      "Implement an LRU cache with O(1) get and put. Answer: Combine a hash map from key to node with a doubly-linked list ordered by recency. get looks up the node, unlinks it, pushes it to the front, and returns the value. put inserts at the front, and when at capacity removes the tail node and erases its key from the map. Both operations are O(1) because the map gives direct access to the node and the doubly-linked list allows unlinking without a search. The subtlety interviewers probe is why a singly-linked list fails - unlinking would be O(n) without a previous pointer.",
      "Design a scan-resistant cache. Answer: Use two queues, as 2Q does. New pages enter a small FIFO probation queue; a page referenced again while in probation is promoted to a main LRU queue, and pages that are never re-referenced age out of probation without ever displacing the protected set. A sequential scan therefore flows through probation and evicts only itself. ARC refines this by maintaining ghost lists of recently evicted keys from both a recency and a frequency list, using ghost hits to adaptively resize the split between them - so it self-tunes rather than requiring a fixed probation size.",
      "Why does replacement prefer clean pages over dirty ones? Answer: A clean page has an identical copy elsewhere - in the file it was read from, or unmodified since load - so evicting it costs nothing but dropping the mapping and freeing the frame. A dirty page must first be written to storage, which costs an I/O and, worse, must complete before the frame can be reused, so the reclaiming path blocks. Evicting a clean page turns one future read into the total cost; evicting a dirty page costs a write now plus a read later. This is why writeback runs continuously in the background, keeping the proportion of dirty pages low so reclaim usually finds clean victims."
    ],
    faq: [
      {
        question: "Why can't the operating system implement true LRU?",
        answer:
          "Because true LRU requires updating a data structure on every memory access, and the operating system never sees an individual memory access. A load or store is executed by the hardware in a fraction of a nanosecond, resolved through the TLB and caches without any software involvement whatsoever; there is no trap, no hook, and no opportunity for the kernel to record anything. Making the hardware maintain LRU order is equally infeasible: it would require either a timestamp write to memory on every access, which would roughly double memory traffic, or a globally ordered list updated by hardware, which no architecture provides. What the hardware does provide is one accessed bit per page-table entry, set on any access and cleared only by software. That single bit, sampled periodically, is the entire information budget for replacement. Clock is the algorithm that makes the best of it: sweeping a circular list, treating a set bit as evidence of use since the last sweep and clearing it, evicting pages whose bit is clear. The result approximates 'not recently used' rather than 'least recently used', which is a coarser but adequate signal. Where every access does pass through software - a database buffer pool, an application cache, a CPU cache set with few ways - exact LRU is implementable and commonly used, which is why the LRU cache is a standard coding interview question even though the operating system cannot use it."
      },
      {
        question: "What is thrashing and how does the system recover?",
        answer:
          "Thrashing is the state where the combined working sets of running processes exceed physical memory, so pages are evicted almost immediately after being loaded and every process spends most of its time waiting on major faults rather than executing. It is a positive feedback collapse rather than a gradual degradation: as fault rates rise, CPU utilisation falls because everyone is blocked on I/O; a scheduler that interprets low CPU utilisation as spare capacity admits more work, which enlarges the total working set, which increases faulting further. The classic symptom set is near-zero useful throughput, near-100 percent disk utilisation, high major fault counts, and non-zero si and so in vmstat, with the machine appearing simultaneously idle and completely unresponsive. Recovery requires reducing the number of concurrently resident working sets, not tuning the replacement algorithm, because no eviction order helps when there is no set of resident pages that satisfies everyone. The mechanisms are suspending or swapping out entire processes so the remainder fit, which is medium-term scheduling; admission control that refuses new work; killing the largest consumer, which is what the OOM killer does; or adding memory. Modern Linux systems often prefer to avoid the thrashing regime entirely by running without swap, so memory exhaustion produces a fast OOM kill rather than a slow collapse, and by using pressure stall information to detect and act on the condition before it becomes self-sustaining."
      },
      {
        question: "How do modern caching algorithms improve on LRU?",
        answer:
          "By adding frequency information and scan resistance, which are the two things pure recency lacks. LRU's fatal weakness is that a single reference makes a page maximally protected, so any sequential pass over data larger than the cache evicts the entire working set in exchange for pages that will never be read again. LRU-K addresses this by tracking the time of the K-th most recent reference rather than the most recent one, so a page needs a history of use before it is treated as valuable. 2Q approximates the same idea more cheaply with a probation FIFO and a main LRU queue: new pages enter probation, only a second reference promotes them, and a scan therefore evicts only itself. ARC maintains four lists - a recency list, a frequency list, and ghost lists of keys recently evicted from each - and uses hits in the ghost lists as a signal to adaptively resize the split between recency and frequency, so it tunes itself to the workload without any parameter. LIRS uses reuse distance directly and performs very well on database workloads. TinyLFU takes a different route, using a compact approximate frequency sketch as an admission filter in front of an LRU or segmented-LRU cache, so a new page is admitted only if its estimated frequency exceeds that of the eviction candidate; this is what Caffeine uses and it achieves near-optimal hit rates with modest metadata. Linux's active and inactive list scheme is essentially a simplified 2Q, and the practical lesson is that scan resistance, not a cleverer recency estimate, is where the real gains live."
      },
      {
        question: "What is the working set model and what is it used for?",
        answer:
          "The working set of a process at time t, with window parameter delta, is the set of distinct pages it referenced during the interval from t minus delta to t. Denning introduced it as a way to make thrashing analysable: if the sum of all processes' working set sizes exceeds physical memory, thrashing is inevitable regardless of replacement policy, because there is no allocation that keeps everyone's actively used pages resident. That gives a principled admission rule - run only as many processes as fit - and a principled allocation rule, giving each process enough frames to hold its working set rather than a fixed equal share. The model captures locality directly: programs reference a small subset of their pages over any short interval, and the subset changes gradually with phase transitions between subsets. Measuring it exactly is impractical because it requires tracking every reference, so real systems approximate. The page fault frequency scheme monitors each process's fault rate and grows its allocation when the rate is high and shrinks it when the rate is low, which converges on working set sizing without measuring the set. Linux approximates through its active list, which is roughly the pages referenced more than once recently, and through pressure stall information, which measures the time processes spend stalled on memory. The model is also directly useful in modern container settings, where the practical question - how much memory should this container's limit be - is exactly the question of how large its working set is, and where setting the limit below it produces the same collapse at container scope."
      },
      {
        question: "Why does Linux separate anonymous and file-backed pages for reclaim?",
        answer:
          "Because their eviction costs and their recovery costs are fundamentally asymmetric, so treating them with a single policy makes bad decisions. A clean file-backed page - executable text, a mapped read-only file, a page read into the cache and not modified - can be evicted by simply dropping it, since an identical copy exists on disk; the only future cost is a re-read if it is needed again. An anonymous page has no backing store by default, so evicting it requires writing it to a swap device first, which is an immediate I/O cost, and recovering it later is a major fault reading from swap. If there is no swap device configured, anonymous pages cannot be evicted at all, which is why a swapless system under memory pressure has only file pages to reclaim and then must invoke the OOM killer. Keeping the two on separate LRU lists lets the kernel apply a deliberate bias, controlled by vm.swappiness, ranging from zero, which avoids swapping anonymous memory until file pages are exhausted, through the default of sixty, to one hundred, which treats both equally. The tuning matters enormously in practice. On a database host the anonymous memory is the buffer pool, so swapping it out means paging the cache to disk - exactly backwards - and low swappiness or no swap at all is standard. On a machine running many idle daemons, swapping their untouched anonymous memory to make room for page cache is genuinely beneficial. Cgroup v2 extends the same split per container, and modern kernels add zswap and zram, which compress anonymous pages in memory rather than writing them out, changing the cost balance again."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Belady - A Study of Replacement Algorithms for a Virtual-Storage Computer (1966)",
        insight: "Introduces both the optimal policy and the anomaly named after him, which are still the two anchors of every replacement discussion."
      },
      {
        source: "paper",
        attribution: "Megiddo and Modha - ARC: A Self-Tuning, Low Overhead Replacement Cache (FAST 2003)",
        insight: "Shows how ghost lists let a cache adaptively balance recency against frequency with no tunable parameter, which is the modern state of the art."
      },
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapter 22 (Swapping: Policies)",
        insight: "Works the classic reference strings by hand, which is exactly the exercise an interviewer will ask you to reproduce on a whiteboard."
      }
    ]
  },
  {
    id: "topic-os-thrashing-and-working-set",
    moduleId: "mod-os-virtual-memory-and-paging",
    title: "Thrashing, Working Sets, and Memory Pressure",
    intuition:
      "Thrashing is not slow memory; it is a collapse. When the combined working sets of running processes exceed physical memory, every page loaded evicts a page someone is about to need, so the system spends its time moving pages rather than executing instructions. The defining property is positive feedback: as faulting rises, CPU utilisation falls, and any mechanism that reacts to idle CPU by admitting more work makes the situation worse. Recovering requires reducing the number of resident working sets, not tuning replacement - which is why the working set model, admission control, and ultimately the OOM killer all exist.",
    complexity: {
      time:
        "In the thrashing regime, useful throughput falls by one to three orders of magnitude, because each instruction's progress is gated by a major fault of tens of microseconds to milliseconds. Recovery by suspending a process is immediate once its pages are reclaimed; recovery by waiting is effectively never, since the feedback loop is self-sustaining.",
      space:
        "The condition is defined by the sum of working set sizes exceeding available frames. Working set size is measured over a window and typically much smaller than a process's resident set, which is why a process can often be given far less memory than its RSS suggests before it starts faulting."
    },
    lesson: [
      {
        title: "The Working Set Model",
        content:
          "Denning defined the working set of a process at time t, with window delta, as the set of distinct pages referenced during the interval from t minus delta to t. The value of the definition is that it turns a vague notion of 'how much memory does this need' into something measurable and predictive: if the sum of all processes' working sets exceeds the number of available frames, thrashing is unavoidable no matter which replacement algorithm is used, because there is no allocation that keeps everyone's actively-referenced pages resident. That gives both an admission rule - run only as many processes as fit - and an allocation rule, giving each process frames proportional to its working set rather than an equal share. The model also captures program behaviour accurately: programs exhibit locality, referencing a small subset of pages over any short interval, with the subset shifting at phase boundaries, so the working set is stable for stretches and then jumps. The window size matters and is a genuine trade: too small and the model misses pages the process will re-reference imminently, too large and it includes pages from a previous phase that are no longer needed.",
        diagram: asciiDiagram(`Working set: what a process is actually using right now

  reference string over time, window delta = 10 references
  ──────────────────────────────────────────────────────────▶ t
  2 6 1 5 7 7 7 7 5 1 | 6 2 3 4 1 2 3 4 4 4 | 3 4 4 4 1 3 2 3 4 4
  └──── WS = {1,2,5,6,7} ┘└─ WS = {1,2,3,4,6} ┘└─ WS = {1,2,3,4} ┘
        size 5                  size 5              size 4
                            ▲
                            └── PHASE TRANSITION: the working set
                                shifts, faults spike briefly, then
                                the new set stabilises.

  WORKING SET SIZE over time - the classic shape
    size │      ┌──┐        ┌────┐
         │ ─────┘  └────────┘    └───────
         │  stable  spike  stable  spike
         └────────────────────────────────▶ t
                    ▲              ▲
                 phase change   phase change

  THE ADMISSION RULE
    Σ WS(i)  ≤  available frames   ──▶ healthy
    Σ WS(i)  >  available frames   ──▶ THRASHING IS INEVITABLE
                                       (no policy can fix it)

  THE COLLAPSE - positive feedback, not gradual decay
    ┌──────────────────────────────────────────────┐
    │  fault rate ▲                                │
    │             │  ┌── CPU util collapses here   │
    │  CPU util   │  ▼                             │
    │      ▲──────┼────╲                           │
    │      │      │     ╲                          │
    │      │      │      ╲______                   │
    │      └──────┴─────────────────▶ degree of    │
    │                                 multiprogramming
    └──────────────────────────────────────────────┘
    Add MORE processes past the knee ──▶ throughput FALLS.
    A scheduler that sees idle CPU and admits more work
    accelerates the collapse. This is the whole trap.`)
      },
      {
        title: "Detecting and Breaking the Feedback Loop",
        content:
          "The symptom pattern is distinctive and worth memorising: throughput near zero, disk utilisation near 100 percent, major fault counts climbing, non-zero si and so in vmstat, and a machine that appears simultaneously idle and completely unresponsive - because the CPU genuinely is idle, waiting on I/O. Load average rises because processes are runnable-blocked on page-ins. The most direct modern signal on Linux is pressure stall information, exposed at /proc/pressure/memory, which reports the fraction of time tasks were stalled waiting on memory, and it is far more actionable than fault counts because it is a direct measure of lost work. Breaking the loop requires reducing the number of concurrently resident working sets. Historically this was medium-term scheduling: suspend a process entirely, swap out all its pages, and let the survivors run at full speed, then resume it later - which is strictly better than letting everyone thrash, because serialising the work completes it faster than interleaving it. Modern systems do less of this and more of admission control, cgroup memory limits that contain the damage to one container, and the OOM killer as a last resort. Many operators deliberately disable swap so that memory exhaustion produces a fast kill rather than a slow collapse, on the reasoning that an unresponsive machine is worse than a dead process.",
        codeExample: `# Diagnosing thrashing - the signals in the order you check them.

vmstat 1
#  procs -----------memory---------- ---swap-- -----io---- -system-- ----cpu----
#   r  b   swpd   free  buff  cache   si   so    bi    bo   in   cs us sy id wa
#   1 12  4194  10240  1024  20480 8912 9410 42000 39000 12k  38k  2  4  6 88
#            ▲                       ▲    ▲                            ▲
#            swap in use      si/so NON-ZERO = swapping        wa = 88%
#   ──▶ 12 processes BLOCKED, CPU 88% waiting on I/O, 6% idle.
#       This is thrashing, not "the CPU is busy".

# Pressure stall information - the best single signal (Linux 4.20+)
cat /proc/pressure/memory
# some avg10=62.31 avg60=58.02 avg300=41.55 total=...
# full avg10=41.02 avg60=39.11 avg300=27.83 total=...
#   some = at least one task stalled on memory
#   full = ALL tasks stalled ──▶ zero useful work
#   avg10 > 10% sustained is already a problem.

# Who is paying the major faults?
ps -eo pid,min_flt,maj_flt,rss,comm --sort=-maj_flt | head
sar -B 1          # majflt/s, pgscank/s, pgsteal/s

# Per-container view (cgroup v2)
cat /sys/fs/cgroup/<slice>/memory.pressure
cat /sys/fs/cgroup/<slice>/memory.events   # "high" and "max" counts
cat /sys/fs/cgroup/<slice>/memory.current

# THE INTERVENTIONS, in increasing severity
#  1. reduce concurrency        - fewer workers, smaller pools
#  2. shrink the working set    - smaller caches, streaming not slurping
#  3. cgroup memory.high        - throttle before it spreads
#  4. suspend/stop a process    - medium-term scheduling by hand
#  5. add memory                - the honest answer, often
#  6. no swap + let OOM kill    - fast failure over slow collapse

# Why many operators disable swap entirely:
#   with swap:    slow collapse, machine unreachable, no clear culprit
#   without swap: fast OOM kill, one process dies, service recovers
#   ──▶ Kubernetes required swap off for years for exactly this reason.`
      },
      {
        title: "Containers, Limits, and Pressure at Small Scale",
        content:
          "Cgroup memory limits reproduce the entire thrashing problem inside a single container, which is where most engineers now meet it. A container whose limit is below its working set will reclaim its own pages continuously - evicting page cache it is about to re-read, or swapping anonymous memory if swap is permitted - and will exhibit exactly the classic signature at container scope while the host looks healthy. Cgroup v2 makes the controls explicit: memory.max is a hard limit whose breach triggers an OOM kill within the cgroup, while memory.high is a throttling threshold that puts pressure on the cgroup's own reclaim and deliberately slows the offending workload rather than killing it, which is usually a better failure mode because it degrades instead of dying. memory.pressure gives the same stall accounting per container, so an autoscaler or an operator can act before the limit is hit. The sizing question - what limit should this container have - is precisely the working set question, and the honest method is measurement: run under load, watch memory.current and the pressure metrics, and set the limit above the working set with headroom for phase transitions. Setting limits by guessing at RSS is the most common cause of containers that are killed under load despite having 'enough' memory, because RSS includes reclaimable page cache that the container would have given up happily.",
        diagram: asciiDiagram(`Thrashing inside a container - the host looks fine

  HOST: 64 GB, 40 GB free       ◀── "we have plenty of memory"
  ┌───────────────────────────────────────────────────────┐
  │ container A   memory.max = 512 MB                     │
  │   working set ≈ 900 MB                                │
  │   ┌─────────────────────────────────────────────────┐ │
  │   │ reclaims its OWN page cache continuously        │ │
  │   │ re-reads the same files over and over           │ │
  │   │ memory.pressure some avg10 = 70%                │ │
  │   │ ──▶ p99 latency 40x worse, CPU looks IDLE       │ │
  │   └─────────────────────────────────────────────────┘ │
  └───────────────────────────────────────────────────────┘
     ▶ host metrics: healthy. container metrics: collapsing.
     ▶ This is why per-cgroup pressure is the metric that matters.

  CGROUP v2 CONTROLS
    ┌──────────────┬────────────────────────────────────────┐
    │ memory.low   │ soft protection - reclaim avoids this  │
    │              │ cgroup until others are exhausted      │
    ├──────────────┼────────────────────────────────────────┤
    │ memory.high  │ THROTTLE point. Exceed it and the      │
    │              │ cgroup is forced to reclaim and is     │
    │              │ slowed down. Degrades, does not die.   │
    ├──────────────┼────────────────────────────────────────┤
    │ memory.max   │ HARD limit. Exceed it ──▶ OOM kill     │
    │              │ inside the cgroup.                     │
    └──────────────┴────────────────────────────────────────┘
    ▶ high < max gives you a warning zone instead of a cliff.

  SIZING A LIMIT - it is the working set question
    WRONG: read RSS once and add 20%
           (RSS includes reclaimable cache it would give up)
    RIGHT: run under real load, watch
              memory.current, memory.pressure, memory.events
           set max above the WORKING SET, with headroom for
           phase transitions (startup, compaction, GC).`)
      }
    ],
    examples: [
      {
        title: "A host that is idle and unresponsive at the same time",
        input: "CPU shows 90 percent iowait, load average 40, no process consuming CPU.",
        output: "Classic thrashing - everyone is blocked on major faults.",
        explanation:
          "Step 1: High iowait with low user time means the CPU is waiting rather than working.\nStep 2: Load average counts processes blocked on page-ins as runnable-blocked, so it climbs even though nothing executes.\nStep 3: vmstat confirms with non-zero si and so, and ps ordered by maj_flt names the processes paying.\nStep 4: The fix is reducing concurrently resident working sets - suspend or kill a process, reduce worker counts, or add memory; no replacement tuning helps once the sum exceeds available frames."
      },
      {
        title: "A container OOM-killed despite the host having free memory",
        input: "memory.max is 512 MB; the workload's working set is 900 MB; the host has 40 GB free.",
        output: "The limit, not the host, defines the available memory.",
        explanation:
          "Step 1: Cgroup limits are enforced independently of host free memory, so host metrics look healthy throughout.\nStep 2: The container reclaims its own page cache continuously, re-reading the same files and showing high memory.pressure.\nStep 3: When anonymous memory alone exceeds the limit, reclaim cannot free enough and the cgroup OOM killer fires.\nStep 4: The correct sizing method is measuring memory.current and pressure under real load rather than reading RSS once, and setting memory.high below memory.max to get a throttling warning zone instead of a cliff."
      },
      {
        title: "Choosing a fast kill over a slow collapse",
        input: "An operator disables swap on a fleet of application servers.",
        output: "Memory exhaustion now produces an immediate OOM kill rather than degradation.",
        explanation:
          "Step 1: With swap enabled, memory pressure first produces swapping, which degrades latency by orders of magnitude while the process stays alive.\nStep 2: The machine can become unreachable, making diagnosis and remediation hard, and the culprit is not obvious.\nStep 3: Without swap, anonymous memory cannot be evicted, so pressure escalates quickly to an OOM kill that names a single victim.\nStep 4: A supervisor restarts the process and the service recovers in seconds, which for a replicated stateless service is strictly better - the trade is different for a single-instance database, where swapping may be preferable to dying."
      }
    ],
    tips: [
      "Describe thrashing as a positive feedback collapse, not as slowness; the feedback loop is what makes it qualitatively different.",
      "Point out that no replacement algorithm can fix thrashing - that reframing shows you understand the working set condition.",
      "Name pressure stall information as the modern signal; fault counts are lagging and harder to threshold."
    ],
    tricks: [
      "Low CPU utilisation during thrashing is the trap - a scheduler or autoscaler that reads idle CPU as spare capacity accelerates the collapse.",
      "Suspending one process outright is better than letting all of them thrash, because serialising the work finishes it sooner than interleaving.",
      "Container memory limits should be set from working set measurements under load, never from a single RSS reading."
    ],
    memoryAids: [
      "Thrashing: everyone is busy, nothing gets done, and adding capacity makes it worse.",
      "Sum of working sets over available frames - no policy escapes that inequality.",
      "memory.high throttles, memory.max kills. Set high below max to get a warning."
    ],
    interviewPatterns: [
      "Diagnosis: 'the host shows 90 percent iowait and no CPU usage, what is happening' - thrashing, and the vmstat evidence.",
      "Design: 'how would you size a container memory limit' - working set measurement, memory.high versus memory.max.",
      "Frequency and companies: Tier 1 for SRE, infrastructure, and platform roles; Tier 2 for backend, usually as an incident-review question."
    ],
    practiceProblems: [
      "Why can adding more processes reduce total throughput? Answer: Because each process needs its working set resident to make progress, and past a threshold the sum of working sets exceeds physical memory. Every additional process then steals frames from the others, so all of them start faulting, and the time spent waiting on I/O dominates the time spent executing. Throughput as a function of multiprogramming degree therefore rises to a knee and then falls sharply. The correct response is admission control - refusing to run more than fits - which is why medium-term scheduling and connection-pool sizing exist.",
      "How would you distinguish a memory leak from a large but stable working set? Answer: Watch the shape over time under steady load. A working set plateaus - RSS rises during warm-up and then stabilises, and it falls back after load subsides or when the process is asked to release caches. A leak grows monotonically and never plateaus, and the growth correlates with cumulative request count rather than with concurrent load. Confirm with heap profiling - jemalloc's profiling, massif, or a language-level heap dump - and check whether the growth is in anonymous memory rather than page cache, since page cache growth is reclaimable and not a leak at all.",
      "Should a database server have swap enabled? Answer: Usually not, or with swappiness at zero. A database's anonymous memory is its buffer pool, which is already a cache of disk contents, so swapping it out means writing a cache to disk in order to make room - strictly wasted work, and the page it evicts will be faulted back in on the next query. Swapping also converts predictable millisecond latency into unpredictable multi-hundred-millisecond latency, which is far worse for a service with an SLO. The counterargument is that for a single-instance database an OOM kill is a full outage while degradation is not, so some operators keep a small swap as an emergency buffer while relying on limits and monitoring to never reach it."
    ],
    faq: [
      {
        question: "What exactly makes thrashing a collapse rather than gradual slowdown?",
        answer:
          "The positive feedback. In a system that is merely short of memory, higher fault rates slow things down proportionally and the system finds a new, slower equilibrium. Thrashing is different because the response to the symptom amplifies the cause. As fault rates rise, processes spend their time blocked on I/O rather than executing, so measured CPU utilisation falls sharply - the CPU genuinely is idle. Any mechanism that interprets idle CPU as spare capacity then adds work: a scheduler admitting more processes, an autoscaler declining to scale out because CPU looks low, a thread pool growing because tasks are queuing, a connection pool accepting more clients. Each addition brings another working set into competition for the same frames, so the eviction rate rises further and utilisation falls further. The result is a cliff rather than a slope: performance is acceptable right up to the point where the sum of working sets crosses available memory, and then falls by orders of magnitude over a very short range. The second reason it is a collapse is that recovery is not automatic. Once in the regime, no process makes enough progress to finish and release its memory, so the condition sustains itself indefinitely; something external must reduce the number of resident working sets. That is why the classical remedy is medium-term scheduling - suspend a process entirely and swap it out so the rest can run - and why the modern remedy is admission control, cgroup limits, and an OOM kill, all of which act on the number of competitors rather than on the eviction order."
      },
      {
        question: "Why is low CPU utilisation a dangerous signal during memory pressure?",
        answer:
          "Because it is measuring the wrong thing and it points every automated response in exactly the wrong direction. CPU utilisation measures the fraction of time the processor executed instructions, and during memory pressure processes are not executing, they are blocked waiting for pages to arrive from storage - so utilisation falls even though the system is doing worse than ever. Anything that treats low utilisation as headroom then makes it worse: a horizontal autoscaler scaled on CPU will refuse to add replicas precisely when it should, or worse, a scheduler will pack more pods onto the node; a thread pool sized by CPU utilisation will grow; a load balancer using CPU-based weights will send more traffic to the struggling host. The correct signals are the ones that measure lost work rather than busy work. Pressure stall information at /proc/pressure/memory reports the fraction of wall time tasks spent stalled on memory, with 'some' meaning at least one task was stalled and 'full' meaning none could progress, and it is directly interpretable as lost capacity. Major fault rate, si and so from vmstat, and iowait are supporting evidence. Load average is also informative here because it counts tasks blocked on page-in, so a high load average with low CPU utilisation is a strong fingerprint of exactly this condition. The general lesson - that utilisation is a poor proxy for saturation, and saturation is what you actually want to alert on - is worth stating explicitly in an interview because it generalises well beyond memory."
      },
      {
        question: "How do you measure a process's working set in practice?",
        answer:
          "There is no exact measurement, because it would require observing every memory reference, so all practical methods are approximations chosen for cost. The cheapest is experimental: run the workload under a constrained memory limit and reduce the limit until fault rate or pressure rises sharply; the knee is roughly the working set size, and this is exactly what cgroup memory.max lets you do safely per container. The second approach reads the kernel's own approximation. /proc/pid/smaps reports per-mapping resident, proportional, and referenced sizes, and writing to /proc/pid/clear_refs clears the referenced bits so that a subsequent read tells you which pages were touched during the interval - which is the working set definition implemented directly, with the window being the time between the clear and the read. Idle page tracking via /sys/kernel/mm/page_idle offers the same idea system-wide with less disturbance. The third approach uses pressure signals as a feedback loop rather than measuring directly: increase the limit until memory.pressure falls below a threshold under representative load. Two cautions are worth voicing. RSS is not the working set - it includes pages that are resident but no longer referenced, especially reclaimable page cache the process would surrender without harm, so sizing limits from RSS systematically overprovisions or, when cache is excluded, underprovisions. And the working set is not a single number: it varies by phase, so startup, steady state, compaction, and garbage collection may each have very different requirements, and the limit must accommodate the peak phase rather than the average."
      },
      {
        question: "Is swap useful at all on modern systems?",
        answer:
          "Yes, but for different reasons than the ones it was originally designed for, and the answer differs by workload. The original purpose - extending physical memory so that programs larger than RAM can run - is largely obsolete, because storage is still four to five orders of magnitude slower than memory and any workload genuinely running from swap is thrashing. The remaining legitimate uses are narrower and quite valuable. First, evicting genuinely cold anonymous memory: long-running daemons accumulate pages that are touched once at startup and never again, and swapping those out frees real memory for page cache, which improves performance rather than harming it. Second, providing a buffer that converts an abrupt OOM kill into a period of degradation during which monitoring can fire and an operator or autoscaler can act. Third, enabling hibernation, which requires somewhere to write memory contents. Fourth, and increasingly important, compressed in-memory swap - zram and zswap - which changes the economics entirely: compressing a cold anonymous page to a third of its size and keeping it in RAM costs microseconds of CPU rather than milliseconds of I/O, so it genuinely extends usable memory without the latency cliff, which is why Android, ChromeOS, and Fedora enable it by default. The argument against swap on servers is that for a replicated stateless service, a fast OOM kill and restart is a better failure mode than an unreachable machine, which is why Kubernetes required swap to be disabled for years. The nuanced position - the one worth giving in an interview - is that swap should be small, swappiness low, and pressure monitored, so it acts as a shock absorber rather than as an extension of memory."
      },
      {
        question: "What is medium-term scheduling and does anything still do it?",
        answer:
          "Medium-term scheduling, also called swapping in the classical sense, is the decision to remove an entire process from memory - writing all of its pages out and marking it not runnable - in order to reduce the degree of multiprogramming, and later to bring it back. It sits between long-term scheduling, which decides which jobs to admit at all, and short-term scheduling, which decides which runnable thread gets the CPU next. Its purpose is precisely the thrashing remedy: when the sum of working sets exceeds memory, the best available action is to stop competing for it, and serialising two workloads that each fit completes both faster than interleaving two that do not. Classical time-sharing systems did this routinely and Unix's swapper process was exactly this mechanism. Modern general-purpose systems do much less of it, for several reasons: memory is abundant enough that the case arises less often, suspending an interactive process produces a terrible user experience, and the modern deployment model favours failing fast and letting an orchestrator reschedule work elsewhere rather than suspending it locally. But the idea has not disappeared, it has moved up the stack. A container orchestrator evicting a pod from an overcommitted node and rescheduling it elsewhere is medium-term scheduling. A job queue that limits concurrent workers to what memory supports is admission control implementing the same principle. Mobile operating systems do it aggressively and explicitly, freezing and then terminating background applications and restoring their saved state on return. The concept is worth naming in an interview because it demonstrates that you see admission control and eviction as the structural answer to thrashing, rather than reaching for replacement-policy tuning."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Peter Denning - The Working Set Model for Program Behavior (1968)",
        insight: "The definition that turned thrashing from folklore into an analysable condition, and the source of the admission rule."
      },
      {
        source: "note",
        attribution: "Linux kernel documentation - Documentation/accounting/psi.rst (Pressure Stall Information)",
        insight: "Explains why measuring stalled time beats measuring utilisation, which is the central diagnostic insight for memory pressure."
      },
      {
        source: "blog",
        attribution: "Chris Down - In defence of swap: common misconceptions",
        insight: "The most careful modern argument for what swap is actually for, and why disabling it does not do what most operators think."
      }
    ]
  },
  {
    id: "topic-os-swap-and-reclaim",
    moduleId: "mod-os-virtual-memory-and-paging",
    title: "Swap, Writeback, and the Reclaim Path",
    intuition:
      "Reclaim is the machinery that produces free frames when memory runs low, and it is where several policies meet: which list to scan, whether to drop a page or write it out, when to start writing back dirty data, and when to give up and kill something. The single most important asymmetry is that a clean page can be freed instantly while a dirty page must be written first - so the kernel writes back continuously in the background specifically to keep reclaim cheap. Understanding that chain, from watermarks through kswapd to direct reclaim to the OOM killer, explains most production memory incidents.",
    complexity: {
      time:
        "Background reclaim by kswapd is asynchronous and costs the allocating thread nothing. Direct reclaim happens in the allocator's own context and blocks it, typically for hundreds of microseconds to milliseconds, and is the source of most allocation latency spikes. Writing back a dirty page costs one I/O; swapping in costs a major fault of tens of microseconds to milliseconds.",
      space:
        "Reclaim targets are set by watermarks - min, low, and high - expressed as free page counts derived from total memory. Dirty page limits are proportional, defaulting to 10 percent of available memory for background writeback and 20 percent for the blocking threshold."
    },
    lesson: [
      {
        title: "Watermarks, kswapd, and Direct Reclaim",
        content:
          "Each memory zone has three watermarks. Above the high watermark there is ample free memory and nothing happens. When free memory falls below the low watermark, the kernel wakes kswapd, a background thread that reclaims pages asynchronously until free memory rises above the high watermark again - and because this happens in a separate thread, allocating processes never notice. If allocation outpaces kswapd and free memory falls below the min watermark, the allocating thread must perform direct reclaim: it scans and frees pages itself, in its own context, blocking until it succeeds. Direct reclaim is where allocation latency spikes come from, and it is the transition worth alerting on because the same total memory pressure is invisible when kswapd keeps up and painful when it does not. If direct reclaim cannot free enough - because everything is dirty, pinned, or unreclaimable - the allocation fails, and for a kernel allocation that cannot fail this triggers the OOM killer. The min watermark also reserves a small amount of memory for allocations that genuinely cannot wait, such as those made in interrupt context, which is why a system can appear to have free memory and still refuse an allocation.",
        diagram: asciiDiagram(`The reclaim escalation ladder

  free memory
      ▲
      │
  ────┼──── HIGH watermark ─────────────────────────────────
      │     kswapd stops here
      │     ┌──────────────────────────────────────────┐
      │     │ ZONE 1: plenty free. Nothing happens.    │
      │     └──────────────────────────────────────────┘
  ────┼──── LOW watermark ──────────────────────────────────
      │     ┌──────────────────────────────────────────┐
      │     │ ZONE 2: kswapd WAKES and reclaims in the │
      │     │ BACKGROUND. Allocators are unaffected.   │
      │     │ ──▶ pressure exists but is INVISIBLE     │
      │     └──────────────────────────────────────────┘
  ────┼──── MIN watermark ──────────────────────────────────
      │     ┌──────────────────────────────────────────┐
      │     │ ZONE 3: DIRECT RECLAIM. The allocating   │
      │     │ thread reclaims in its OWN context and   │
      │     │ BLOCKS. ◀── this is your latency spike   │
      │     └──────────────────────────────────────────┘
      │     ┌──────────────────────────────────────────┐
      0     │ ZONE 4: cannot reclaim enough ──▶ OOM    │
            └──────────────────────────────────────────┘

  ▶ THE ALERT: not "free memory low" but
    allocstall (direct reclaim entries) becoming non-zero.
    Same pressure, but kswapd keeping up is fine and
    kswapd falling behind is a latency incident.

  WHAT RECLAIM PREFERS, in order
    ┌──────────────────────────┬────────────────────────────┐
    │ clean FILE page          │ just DROP it. Free.        │
    │ dirty FILE page          │ write it back, THEN drop   │
    │ clean ANON page (in swap)│ drop; swap copy is current │
    │ dirty ANON page          │ write to SWAP, then drop   │
    │ mlocked / pinned / slab  │ CANNOT reclaim at all      │
    └──────────────────────────┴────────────────────────────┘
    ▶ this ordering is why background WRITEBACK matters:
      it converts dirty pages into cheap clean victims
      BEFORE reclaim needs them.

  Watch it: grep -E 'allocstall|pgscan|pgsteal' /proc/vmstat
            sar -B 1        # pgscank/s (kswapd) vs pgscand/s (direct)`)
      },
      {
        title: "Dirty Pages and Writeback Throttling",
        content:
          "A page in the page cache that has been modified is dirty, meaning memory and storage disagree, and it cannot be reclaimed until written back. The kernel therefore runs writeback continuously rather than waiting for pressure: when dirty pages exceed vm.dirty_background_ratio, defaulting to ten percent of available memory, background flusher threads begin writing them out without blocking anyone. If dirty pages continue to grow past vm.dirty_ratio, defaulting to twenty percent, the kernel throttles writers - a process calling write is made to participate in writeback or is simply put to sleep until the backlog drains. That throttling is deliberate back-pressure, and it is why a program that writes faster than the disk can absorb eventually slows to disk speed rather than consuming all of memory. The tuning consequences are significant on machines with large memory: twenty percent of 256 GB is 51 GB of dirty data, which on a slow device represents minutes of writeback and produces enormous latency spikes when it is finally flushed, so large-memory hosts usually set the byte-based variants dirty_background_bytes and dirty_bytes instead of the ratios. The same mechanism explains why an fsync can take far longer than the data being synced would suggest - it must wait behind whatever backlog already exists.",
        codeExample: `# Dirty page management - the knobs and what they actually do.

# How much dirty data is outstanding right now:
grep -E 'Dirty|Writeback' /proc/meminfo
# Dirty:            412536 kB    ◀── modified, not yet written
# Writeback:         28160 kB    ◀── currently in flight

# The thresholds (ratios are of AVAILABLE memory, not total):
sysctl vm.dirty_background_ratio   # default 10 - flushers WAKE
sysctl vm.dirty_ratio              # default 20 - writers THROTTLE
sysctl vm.dirty_expire_centisecs   # default 3000 - age-based flush
sysctl vm.dirty_writeback_centisecs # default 500 - flusher interval

# THE LARGE-MEMORY TRAP
#   256 GB host, dirty_ratio = 20
#   ──▶ up to 51 GB of dirty data before throttling
#   ──▶ on a 200 MB/s device that is ~4 MINUTES of writeback
#   ──▶ an fsync() lands behind ALL of it
#   ──▶ multi-second latency spikes with no obvious cause
#
#   FIX: use the byte-based variants on big machines
sysctl -w vm.dirty_background_bytes=268435456   # 256 MB
sysctl -w vm.dirty_bytes=1073741824             # 1 GB
#   (setting the _bytes form zeroes the _ratio form and vice versa)

# Durability is a separate question from writeback:
#   write()          ──▶ page cache, marked dirty. NOT durable.
#   fsync(fd)        ──▶ data + metadata to stable storage
#   fdatasync(fd)    ──▶ data + only ESSENTIAL metadata - cheaper
#   msync(p,len,MS_SYNC) ──▶ the mmap equivalent
#   O_DIRECT         ──▶ bypass the cache entirely; you manage it
#   O_SYNC           ──▶ every write is durable before returning

# Why an fsync can take seconds on an idle-looking system:
#   it waits for the device queue, which may already hold
#   gigabytes of another process's background writeback.
#   ──▶ this is the classic "the database froze" incident.`
      },
      {
        title: "Swap, Compression, and the OOM Endgame",
        content:
          "Anonymous pages - heap, stack, and anonymous mappings - have no file behind them, so reclaiming one requires writing it somewhere, and that somewhere is the swap device. Without swap configured, anonymous memory is simply unreclaimable, so a system under pressure can only evict file-backed pages, and once those are gone the OOM killer is the only remaining option. This is precisely why swapless systems fail fast: the escalation ladder has fewer rungs. Compressed swap changes the economics substantially. zram creates a block device backed by compressed RAM, and zswap places a compressed cache in front of a real swap device; either way a cold anonymous page is compressed to roughly a third of its size and stays in memory, costing microseconds of CPU instead of milliseconds of I/O. That makes swapping genuinely useful again rather than a latency cliff, which is why Android, ChromeOS, and several desktop distributions enable it by default. When reclaim finally fails, the OOM killer selects a victim by a badness score dominated by resident set size and adjusted by oom_score_adj, then kills it - or, with cgroup v2, kills within the offending cgroup so the blast radius is contained. Modern deployments increasingly prefer user-space OOM management, with daemons like systemd-oomd or earlyoom acting on pressure stall information before the kernel's own last resort fires.",
        diagram: asciiDiagram(`Anonymous memory: the reclaim options

  NO SWAP
    file pages   ──▶ reclaimable (drop or write back)
    anon  pages  ──▶ NOT RECLAIMABLE AT ALL
    ┌────────────────────────────────────────────────┐
    │ pressure ──▶ evict all file cache              │
    │          ──▶ nothing left to reclaim           │
    │          ──▶ OOM KILL                          │
    │ Fast, loud, one victim. Good for replicas.     │
    └────────────────────────────────────────────────┘

  DISK SWAP
    anon page ──▶ write 4 KB to disk ──▶ free the frame
                  swap-in later = MAJOR FAULT
    ┌────────────────────────────────────────────────┐
    │ cost: ~100 us (NVMe) to ~10 ms (spinning)      │
    │ ──▶ p99 latency cliff, machine may go dark     │
    │ ──▶ slow collapse instead of fast failure      │
    └────────────────────────────────────────────────┘

  COMPRESSED SWAP (zram / zswap) - changes the economics
    anon page ──▶ LZ4/zstd compress ──▶ ~1.3 KB, STAYS IN RAM
    ┌────────────────────────────────────────────────┐
    │ cost: a few MICROSECONDS of CPU, no I/O        │
    │ effective memory gain: ~2-3x on typical data   │
    │ ──▶ Android, ChromeOS, Fedora enable by default│
    │ zswap = compressed cache IN FRONT of real swap │
    │ zram  = compressed RAM disk USED AS swap       │
    └────────────────────────────────────────────────┘

  THE ENDGAME
    reclaim fails ──▶ select victim by oom_score
                        ≈ RSS, adjusted by oom_score_adj
                          (-1000 = never, +1000 = first)
                  ──▶ SIGKILL
    cgroup v2: kill INSIDE the offending cgroup
               memory.oom.group=1 kills the whole cgroup
               ──▶ blast radius contained to one workload

    USER-SPACE OOM (systemd-oomd, earlyoom, Facebook's oomd)
      watch /proc/pressure/memory and act EARLY, with policy,
      before the kernel's last-resort heuristic picks badly.
      ──▶ kill the batch job, not the database.`)
      }
    ],
    examples: [
      {
        title: "Allocation latency spikes with plenty of free memory reported",
        input: "p99 allocation latency jumps to 8 ms; free memory shows several gigabytes.",
        output: "Direct reclaim - kswapd fell behind the allocation rate.",
        explanation:
          "Step 1: Free memory being non-zero says nothing, because watermarks and reserves mean allocation can still block.\nStep 2: /proc/vmstat shows allocstall counters rising, which means allocating threads entered reclaim themselves.\nStep 3: kswapd was reclaiming but could not keep pace with the allocation burst, so the min watermark was crossed.\nStep 4: The remedies are reducing allocation burstiness, raising min_free_kbytes so kswapd starts earlier and has more headroom, or reducing the working set - not adding swap, which would make the reclaim slower still."
      },
      {
        title: "A multi-second fsync on an otherwise idle database",
        input: "A commit that syncs 4 KB takes 3 seconds.",
        output: "The sync queued behind a large accumulated writeback backlog.",
        explanation:
          "Step 1: On a large-memory host, dirty_ratio of 20 percent may permit tens of gigabytes of dirty pages.\nStep 2: A batch job wrote heavily, filling the cache with dirty pages that background flushers had not yet drained.\nStep 3: The database's fsync must wait for the device queue, which is saturated by that backlog, so a tiny sync inherits a huge wait.\nStep 4: Setting dirty_background_bytes and dirty_bytes to fixed, modest values caps the backlog and keeps sync latency proportional to the data being synced."
      },
      {
        title: "The OOM killer choosing the wrong victim",
        input: "A memory spike in a batch job causes the kernel to kill the database instead.",
        output: "Badness score is dominated by RSS, and the database was the largest process.",
        explanation:
          "Step 1: The kernel's heuristic scores candidates mainly by resident set size, so the largest process is the default victim regardless of importance.\nStep 2: The database legitimately holds a large buffer pool, making it the biggest target even though the batch job caused the pressure.\nStep 3: Setting oom_score_adj to a strongly negative value on the database and a positive value on batch jobs corrects the ranking.\nStep 4: The more robust fix is a user-space OOM daemon acting on pressure stall information with explicit policy, plus cgroup limits so the batch job is killed within its own cgroup before host-wide pressure ever develops."
      }
    ],
    tips: [
      "Distinguish kswapd from direct reclaim explicitly - the same pressure is harmless in one and a latency incident in the other.",
      "Explain writeback as the mechanism that keeps reclaim cheap by manufacturing clean victims, rather than as an unrelated durability feature.",
      "When swap comes up, mention compressed swap; it is the detail that shows current knowledge rather than textbook knowledge."
    ],
    tricks: [
      "Alert on allocstall, not on free memory - free memory is a poor signal because kswapd is supposed to keep it low.",
      "Percentage-based dirty limits scale badly on large-memory hosts; the byte-based variants are what production systems set.",
      "A swapless system has a shorter escalation ladder, which is a deliberate choice of fast failure over slow degradation."
    ],
    memoryAids: [
      "High, low, min: nothing, kswapd, direct reclaim - and below min, the OOM killer.",
      "Writeback exists so reclaim finds clean pages; a dirty page is a victim you have to pay for twice.",
      "No swap means anonymous memory is unreclaimable - that single fact explains swapless OOM behaviour."
    ],
    interviewPatterns: [
      "Incident analysis: 'allocation latency spiked but free memory looked fine' - direct reclaim and the watermark ladder.",
      "Tuning: 'why would fsync take seconds' - dirty ratio on large-memory hosts and device queue depth.",
      "Frequency and companies: Tier 1 for SRE, database, and kernel roles; Tier 2 for backend, usually via a production incident story."
    ],
    practiceProblems: [
      "Why does the kernel keep free memory low rather than high? Answer: Free memory is wasted memory - a frame holding nothing is doing no work, whereas the same frame holding page cache saves a future disk read. The kernel therefore uses essentially all memory for cache and reclaims on demand, keeping only enough free to satisfy allocations between reclaim cycles, which is what the watermarks define. This is why 'free memory' is a misleading metric on Linux and why available memory, which counts reclaimable cache, is the number to read. The corollary is that low free memory is normal and only direct reclaim indicates a problem.",
      "How does the OOM killer pick a victim, and how would you influence it? Answer: It computes a badness score per process dominated by resident set size - so the largest memory consumer is the default victim - normalised against available memory and then adjusted by the process's oom_score_adj, which ranges from -1000, meaning never kill, to +1000, meaning kill first. You influence it by setting oom_score_adj on important processes to a strongly negative value and on sacrificial ones to a positive value. The more robust approach is cgroup v2 limits so pressure is contained and the kill happens within the offending cgroup, optionally killing the whole cgroup with memory.oom.group, plus a user-space daemon acting on pressure before the kernel heuristic runs.",
      "Would adding swap fix a system that is entering direct reclaim frequently? Answer: Usually not, and it may make things worse. Direct reclaim means the allocation rate exceeds the rate at which kswapd can free pages; adding swap gives reclaim more pages it could free but makes each reclaim more expensive, since evicting an anonymous page now requires a write rather than being impossible. The genuine fixes are reducing the allocation rate or working set, raising min_free_kbytes so kswapd starts earlier with more headroom, or adding memory. Compressed swap is the exception worth considering, because compressing to RAM costs microseconds rather than an I/O."
    ],
    faq: [
      {
        question: "What is the difference between free memory and available memory on Linux?",
        answer:
          "Free memory is the amount holding nothing at all, and it is deliberately kept low because a frame holding nothing is doing no useful work. Available memory is an estimate of how much could be given to a new allocation without swapping, and it includes free memory plus the reclaimable portion of the page cache and of the slab caches. The distinction matters enormously in practice because the classic misreading - looking at free, seeing a small number on a machine with 64 GB of RAM, and concluding that memory is exhausted - is wrong essentially always. Linux uses all otherwise-idle memory as page cache, so on a healthy long-running system free is small by design and cache is large; that cache is not consumption, it is opportunistically retained data that will be dropped the instant anyone needs the memory. The available figure, reported in /proc/meminfo as MemAvailable since Linux 3.14 and by free as the 'available' column, accounts for this and is the number to alert on. It is still an estimate rather than a guarantee, because some cache is dirty and needs writing before it can be freed, some is mapped and in active use, and slab reclaimability varies. The genuinely reliable pressure signals are direct reclaim counters and pressure stall information, which measure whether allocations are actually suffering rather than predicting whether they might."
      },
      {
        question: "Why does the kernel throttle writers instead of just buffering more?",
        answer:
          "Because unbounded buffering converts a storage bottleneck into a memory exhaustion, and defers a bounded problem into an unbounded one. If a process writes faster than the device can absorb and the kernel accepted every write into the cache, dirty pages would grow without limit until memory ran out; at that point reclaim would find nothing clean to evict, since everything is dirty and awaiting writeback, and the system would either stall completely or invoke the OOM killer. Throttling is deliberate back-pressure that pushes the constraint back to its source: past vm.dirty_background_ratio the flusher threads start writing without disturbing anyone, and past vm.dirty_ratio the writing process is made to participate in writeback or is put to sleep until the backlog drains, so it proceeds at approximately device speed. There is a second, subtler reason: bounding the dirty set bounds worst-case latency for everyone else. An fsync from an unrelated process must wait behind the device queue, so allowing tens of gigabytes of dirty data means allowing multi-second sync latencies for processes that wrote nothing. This is exactly the incident pattern where a batch job's writes freeze a database's commits. The tuning implication is that the default percentages, chosen when machines had gigabytes rather than hundreds of gigabytes, are far too permissive on modern hardware, and production systems set dirty_background_bytes and dirty_bytes to fixed modest values so the backlog stays proportional to device throughput rather than to RAM size."
      },
      {
        question: "How do zram and zswap differ, and when would you use each?",
        answer:
          "Both compress anonymous pages to reduce memory pressure, but they sit at different points in the stack. zram creates a virtual block device whose contents are held compressed in RAM, and you configure it as a swap device; when the kernel swaps a page out, it is compressed and stored in RAM, and swapping it back in is a decompression rather than an I/O. There is no disk involved at all, so it works on systems with no swap device and gives an effective memory multiplier of roughly two to three on typical data at a cost of microseconds of CPU per page. zswap is a compressed write-back cache placed in front of a real swap device: pages are compressed into a memory pool first, and only when that pool fills are the least valuable of them decompressed and written to the actual swap device. The practical distinction is that zram is a complete replacement for disk swap and bounds itself by a configured size, whereas zswap is an accelerator for disk swap that absorbs bursts while retaining the disk as an overflow. Choose zram on systems with no suitable swap device or where you want a hard bound and no I/O at all - phones, ChromeOS, containers, embedded systems, and increasingly desktop distributions. Choose zswap when you already have swap and want to avoid most of its latency while keeping the capacity of the device for genuinely cold pages. Both change the swap conversation meaningfully, because the historical objection to swap is the millisecond-scale I/O latency, and compression replaces that with microsecond-scale CPU cost."
      },
      {
        question: "What does the page cache do and why is it the largest consumer of memory?",
        answer:
          "The page cache holds file contents in memory, keyed by file and offset, and it sits between every filesystem operation and the storage device. When a process reads a file, the data is read into the cache and then copied to the user buffer, so a subsequent read of the same data is served from memory; when a process writes, the data lands in the cache and is marked dirty, to be written back later by the flusher threads. Memory-mapped files map cache pages directly into the process's address space, so mmap and read are two views of the same cache. It is the largest consumer of memory on essentially every long-running system for the simple reason that the kernel has no better use for otherwise-idle memory: retaining a file page costs nothing and might save a disk read, so the cache grows to fill whatever is available and shrinks the instant anything else needs the memory. This is why 'my server is using all its memory' is almost never a problem and why the available metric exists. The cache is also what makes several other behaviours make sense - readahead populating it ahead of sequential access, writeback draining its dirty portion continuously so reclaim finds clean victims, and the drop_caches interface existing only for benchmarking, since dropping the cache in production simply destroys performance for no gain. The one operational subtlety worth naming is that clean cache pages are free to reclaim while dirty ones are not, so a workload that writes heavily converts cheap reclaimable memory into expensive unreclaimable memory until writeback catches up."
      },
      {
        question: "Why do people run user-space OOM daemons instead of relying on the kernel?",
        answer:
          "Because the kernel's OOM killer is a last-resort correctness mechanism, not a policy engine, and by the time it fires the system has usually been unusable for a while. Three specific deficiencies drive the move to user space. First, timing: the kernel kills only when an allocation genuinely cannot be satisfied, which is long after the system entered a degraded thrashing state, so users experience minutes of an unresponsive machine before any resolution. A user-space daemon watching pressure stall information can act while the system is merely under strain, killing early and keeping the machine responsive throughout. Second, policy: the kernel's badness score is dominated by resident set size, so it kills the largest process, which is very often the most important one - a database with a legitimately large buffer pool is the default victim even when a runaway batch job caused the pressure. A user-space daemon can encode real policy, understanding service tiers, cgroup membership, restart cost, and which workloads are sacrificial. Third, granularity: modern systems care about workloads rather than processes, so killing one process of a multi-process service often leaves it broken rather than recovered; cgroup-aware daemons kill a whole unit cleanly, which is what memory.oom.group also enables. Facebook's oomd was the influential implementation, systemd-oomd brought the idea into mainstream distributions, and earlyoom is a simpler variant widely used on desktops. The kernel killer remains as the backstop, which is exactly the right relationship - policy in user space, correctness guarantee in the kernel."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Linux kernel documentation - Documentation/admin-guide/sysctl/vm.rst",
        insight: "The authoritative reference for watermarks, dirty ratios, and swappiness, which are the knobs behind most memory incidents."
      },
      {
        source: "blog",
        attribution: "Facebook Engineering - oomd: a userspace out-of-memory killer",
        insight: "Articulates why the kernel killer fires too late and with the wrong policy, which is the argument behind systemd-oomd and earlyoom."
      },
      {
        source: "book",
        attribution: "Brendan Gregg - Systems Performance, chapter 7 (Memory)",
        insight: "Ties the reclaim path to the observable metrics, which is what turns this topic from theory into a usable diagnostic method."
      }
    ]
  },
  {
    id: "topic-os-locality-and-memory-performance",
    moduleId: "mod-os-virtual-memory-and-paging",
    title: "Locality, NUMA, and Memory Performance in Practice",
    intuition:
      "Virtual memory works at all because programs have locality - they reuse recently touched data and touch neighbouring data soon after. Every layer of the hierarchy, from cache lines through TLB entries to page cache and readahead, is a bet on that property, and performance problems are almost always a violation of it. On modern multi-socket machines a second dimension appears: memory is not uniformly distant, so where a page physically lives relative to the core using it matters as much as whether it is resident at all. Diagnosing memory performance means asking which locality assumption the workload is breaking.",
    complexity: {
      time:
        "Rough latencies on a modern server: L1 about 1 ns, L2 about 4 ns, L3 about 15 ns, local DRAM about 80 ns, remote-socket DRAM about 130 ns, NVMe about 80 microseconds, rotating disk about 8 milliseconds. Each level is roughly an order of magnitude, and the DRAM-to-storage gap is three orders.",
      space:
        "A cache line is 64 bytes on x86-64 and is the unit of coherence, so false sharing is a 64-byte-granularity problem. A page is 4 KB and is the unit of residency and NUMA placement. These two granularities explain most of the alignment and padding advice in performance work."
    },
    lesson: [
      {
        title: "Temporal and Spatial Locality Across the Hierarchy",
        content:
          "Temporal locality is the tendency to reuse data soon after using it, and it is what caching of any kind exploits: CPU caches, the TLB, the page cache, and replacement algorithms are all bets that recently used means soon used again. Spatial locality is the tendency to use data near data just used, and it is what prefetching exploits: cache lines fetch 64 bytes when you asked for 4, readahead fetches 128 kilobytes when you asked for one page, and huge pages extend the same idea to translation. The critical realisation is that these are assumptions, not laws, and a workload that violates them gets no benefit from any of the machinery while still paying its costs. A linked list traversal has poor spatial locality because each node may be anywhere, so every hop is a cache miss and a possible TLB miss; the same data in an array is traversed at near memory bandwidth. A hash table lookup has poor spatial locality by design, which is why open addressing with linear probing often outperforms chaining despite worse theoretical clustering behaviour. The practical skill is recognising which granularity is being violated - 64 bytes for cache, 4 KB for TLB and paging, and 128 KB for readahead - because the fix differs at each level.",
        diagram: asciiDiagram(`The memory hierarchy, and which locality each level bets on

  ┌──────────────┬──────────┬─────────┬──────────────────────┐
  │ level        │ latency  │ unit    │ exploits             │
  ├──────────────┼──────────┼─────────┼──────────────────────┤
  │ register     │  0 ns    │ 8 B     │ compiler allocation  │
  │ L1 cache     │  ~1 ns   │ 64 B    │ temporal + spatial   │
  │ L2 cache     │  ~4 ns   │ 64 B    │ temporal             │
  │ L3 (shared)  │ ~15 ns   │ 64 B    │ temporal, cross-core │
  │ LOCAL DRAM   │ ~80 ns   │ 4 KB pg │ TLB + page cache     │
  │ REMOTE DRAM  │ ~130 ns  │ 4 KB pg │ NUMA placement       │
  │ NVMe         │ ~80 us   │ 4 KB    │ readahead, page cache│
  │ spinning disk│  ~8 ms   │ 4 KB    │ readahead, elevator  │
  └──────────────┴──────────┴─────────┴──────────────────────┘
     ▲                                    ▲
     └── each step ~10x                   └── DRAM ──▶ NVMe is 1000x

  THE THREE GRANULARITIES THAT MATTER
    64 B   cache line  ──▶ false sharing, padding, alignment
     4 KB  page        ──▶ TLB reach, residency, NUMA node
   128 KB  readahead   ──▶ sequential vs random file access

  SAME ALGORITHM, DIFFERENT LAYOUT
    linked list of 1M nodes, scattered
      ┌───┐   ┌───┐         ┌───┐
      │ n │──▶│ n │────────▶│ n │  ──▶ 1 cache miss PER HOP
      └───┘   └───┘         └───┘      ~80 ns each = 80 ms
    array of 1M elements, contiguous
      ┌───────────────────────────┐
      │███████████████████████████│  ──▶ 1 miss per 16 elements
      └───────────────────────────┘      + hardware prefetch
                                         ──▶ ~2 ms
    ▶ 40x, from LAYOUT alone. Same asymptotic complexity.

  WHAT BREAKS EACH BET
    pointer chasing     ──▶ breaks spatial locality (cache)
    huge scattered heap ──▶ breaks TLB reach (translation)
    random file access  ──▶ breaks readahead (storage)
    streaming scan      ──▶ breaks temporal locality (evicts all)`)
      },
      {
        title: "NUMA: Memory Has a Location",
        content:
          "On a multi-socket server, each socket has its own memory controller and its own directly attached DRAM, and access to another socket's memory travels over an interconnect - UPI on Intel, Infinity Fabric on AMD. The result is non-uniform memory access: local memory might be 80 nanoseconds away and remote memory 130, with lower bandwidth and contention on the interconnect. Large AMD and Intel processors expose sub-NUMA domains within a socket as well, so even a single-socket machine can be NUMA. Linux defaults to a first-touch policy: a page is allocated on the node of whichever CPU first writes to it, not the one that allocated the address space, which is why initialisation patterns matter enormously. A program whose main thread touches an entire array before spawning workers places every page on one node, and every worker on other nodes then pays remote latency for the whole run; initialising in parallel with the same partitioning the workers will use places each page correctly. The tools are numactl for policy at launch, mbind and set_mempolicy for programmatic control, and numastat to observe hits and misses. The automatic NUMA balancing in Linux periodically unmaps pages to sample which node accesses them and migrates accordingly, which helps unattended workloads but adds its own faults and is often disabled for carefully tuned ones.",
        codeExample: `# NUMA: where a page lives decides how fast it is.

numactl --hardware
# available: 2 nodes (0-1)
# node 0 cpus: 0-23,48-71    node 0 size: 128 GB
# node 1 cpus: 24-47,72-95   node 1 size: 128 GB
# node distances:
# node   0   1
#    0: 10  21      ◀── remote is ~2.1x the cost of local
#    1: 21  10

numastat -p <pid>
#                  Node 0   Node 1
# numa_hit         840123    12045
# numa_miss             0   402118   ◀── allocations that had to
# other_node            0   402118       go to the wrong node

/* THE FIRST-TOUCH TRAP - the single most common NUMA bug */

/* WRONG: main thread touches everything ──▶ all on node 0 */
double *a = malloc(N * sizeof(double));
memset(a, 0, N * sizeof(double));          /* ◀── ALL node 0 */
#pragma omp parallel for
for (i = 0; i < N; i++) a[i] = f(a[i]);    /* half the threads
                                              pay REMOTE latency
                                              for the whole run */

/* RIGHT: initialise with the SAME partitioning as the work */
double *a = malloc(N * sizeof(double));
#pragma omp parallel for
for (i = 0; i < N; i++) a[i] = 0.0;        /* first touch by the
                                              thread that will USE
                                              it ──▶ correct node */
#pragma omp parallel for
for (i = 0; i < N; i++) a[i] = f(a[i]);    /* all LOCAL */

# Pin a process to one node entirely (databases do this):
numactl --cpunodebind=0 --membind=0 ./server
# Interleave across nodes (good for a shared read-mostly cache):
numactl --interleave=all ./cache_server

# Automatic NUMA balancing: kernel samples by unmapping pages,
# observes which node faults, and migrates.
cat /proc/sys/kernel/numa_balancing     # 1 = on
#   helps unattended workloads; adds faults and jitter.
#   Carefully pinned workloads usually turn it OFF.`
      },
      {
        title: "False Sharing and the Cost of Coherence",
        content:
          "Cache coherence operates at cache-line granularity, so two variables that are independent to the programmer but land on the same 64-byte line are not independent to the hardware. If two threads on different cores write to them, every write invalidates the other core's copy, and the line ping-pongs across the interconnect at tens of nanoseconds per transfer - producing a slowdown of an order of magnitude with no lock, no contention in the program's logic, and nothing visible in the source. This is false sharing, and it is one of the most common causes of concurrent code that scales negatively. The classic instances are an array of per-thread counters, adjacent fields in a struct written by different threads, and a lock placed next to the data it protects, where waiters spinning on the lock invalidate the data line. The fix is padding to cache-line boundaries, expressed as alignas(64) in C++ or as explicit padding fields, and the diagnostic is that performance improves when threads are moved to the same core - which is backwards for genuine parallelism and therefore diagnostic. True sharing has the same signature but a different cause: the data genuinely is shared, and the fix is algorithmic, typically per-thread accumulation with a final combine rather than a shared counter.",
        diagram: asciiDiagram(`False sharing: independent variables, shared cache line

  struct Counters { long a; long b; };   /* 16 bytes */
  thread 0 increments a, thread 1 increments b.
  Logically independent. Physically:

    ONE 64-byte cache line
    ┌──────┬──────┬────────────────────────────────────┐
    │  a   │  b   │        (padding/other data)        │
    └──▲───┴──▲───┴────────────────────────────────────┘
       │      │
    core 0  core 1

  every a++ on core 0:
     ──▶ core 0 must own the line EXCLUSIVE
     ──▶ INVALIDATE core 1's copy
  every b++ on core 1:
     ──▶ core 1 must own the line EXCLUSIVE
     ──▶ INVALIDATE core 0's copy

     core0  ──E──▶ ◀──I── core1
     core1  ──E──▶ ◀──I── core0     ping-pong, ~tens of ns
     ┌────────────────────────────────────────────────────┐
     │ NO lock. NO logical contention. 10-100x slowdown.  │
     │ Invisible in the source code.                      │
     └────────────────────────────────────────────────────┘

  FIX: pad to a cache line
    struct alignas(64) Counter { long v; char pad[56]; };
    Counter counters[NTHREADS];          /* one line each */
    ▶ C++17: std::hardware_destructive_interference_size

  DIAGNOSTIC (counter-intuitive, therefore reliable)
    pin both threads to the SAME core ──▶ gets FASTER
    ▶ real parallelism never gets faster on one core.
    ▶ perf c2c records exactly which line and which offsets.

  TRUE sharing looks identical but the data really IS shared
    ┌─────────────────────┬────────────────────────────────┐
    │ FALSE sharing       │ TRUE sharing                   │
    │ fix = padding       │ fix = ALGORITHM                │
    │ (layout change)     │ per-thread accumulate, then    │
    │                     │ combine once at the end        │
    └─────────────────────┴────────────────────────────────┘

  The lock-next-to-data variant
    struct { spinlock_t lock; int data; };   ◀── same line
    waiters spinning on lock invalidate data for the holder
    ▶ pad the lock, or use an MCS/queued lock that spins
      on a thread-local node instead.`)
      }
    ],
    examples: [
      {
        title: "A parallel loop that gets slower with more threads",
        input: "An OpenMP reduction into an array of per-thread counters scales negatively past two threads.",
        output: "False sharing on the counter array.",
        explanation:
          "Step 1: The counters are adjacent longs, so eight of them share a single 64-byte cache line.\nStep 2: Each thread's increment requires exclusive ownership of that line, invalidating every other thread's copy.\nStep 3: The line ping-pongs between cores on every increment, costing tens of nanoseconds for what should be a register operation.\nStep 4: Padding each counter to its own cache line with alignas(64) restores linear scaling; perf c2c identifies the offending line and offsets directly."
      },
      {
        title: "A NUMA machine where half the threads are twice as slow",
        input: "A parallel numerical kernel shows uneven per-thread timings on a two-socket host.",
        output: "First-touch placed all pages on one node during serial initialisation.",
        explanation:
          "Step 1: The main thread memset the entire array before the parallel region, so every page was allocated on its node.\nStep 2: Threads on the other socket then access remote memory for the whole computation, paying about 1.6 times the latency and competing on the interconnect.\nStep 3: numastat confirms a large numa_miss count on the second node.\nStep 4: Initialising in parallel with the same loop partitioning places each page on the node that will use it; alternatively numactl --interleave spreads the array evenly, which is worse than correct placement but far better than all-on-one."
      },
      {
        title: "A hash map slower than a linear scan for small sizes",
        input: "Lookups in a 500-element hash map are slower than scanning a 500-element array.",
        output: "Locality dominates asymptotic complexity at small sizes.",
        explanation:
          "Step 1: The array scan touches contiguous memory, so each cache line brings 16 elements and the hardware prefetcher stays ahead.\nStep 2: The hash lookup performs a hash, an indirection into a bucket array, and often a pointer dereference into a node, each a potential cache miss.\nStep 3: 500 sequential comparisons at roughly one nanosecond amortised beats two or three misses at 80 nanoseconds each.\nStep 4: This is why flat, open-addressed maps outperform chained ones, why small vectors beat sets, and why complexity analysis must be paired with a constant-factor model that includes the memory hierarchy."
      }
    ],
    tips: [
      "Name the three granularities - 64-byte line, 4 KB page, 128 KB readahead - and identify which one a workload is violating before proposing a fix.",
      "Bring up first-touch immediately when NUMA is mentioned; it is the mechanism behind most real NUMA bugs.",
      "Describe false sharing as a correctness-free performance bug that is invisible in source - that framing is what makes it memorable."
    ],
    tricks: [
      "If pinning threads to one core makes a parallel program faster, you have false sharing; genuine parallelism never improves under that change.",
      "Automatic NUMA balancing helps unattended workloads and hurts pinned ones, so it is usually disabled on carefully tuned systems.",
      "Asymptotic complexity ignores the memory hierarchy, which routinely dominates at the sizes real systems actually use."
    ],
    memoryAids: [
      "Temporal locality feeds caches; spatial locality feeds prefetchers. Break either and the machinery costs without paying.",
      "First touch decides the NUMA node - allocate anywhere, touch where you will use it.",
      "False sharing: no lock, no logic error, ten times slower, invisible in the source."
    ],
    interviewPatterns: [
      "Performance: 'this parallel code scales negatively, why' - false sharing, and the same-core diagnostic.",
      "Systems depth: 'what is NUMA and how would you tune for it' - first touch, pinning, interleaving, numastat.",
      "Frequency and companies: Tier 1 for performance, HFT, database, and HPC roles; Tier 2 elsewhere as a data-structure choice question."
    ],
    practiceProblems: [
      "Why is iterating an array of structs sometimes slower than several arrays of fields? Answer: Because a cache line brings 64 bytes regardless of how much of it you use. If a loop reads one 4-byte field from a 64-byte struct, each line delivers one useful field and 60 wasted bytes, so effective bandwidth is a sixteenth of peak. Splitting into separate arrays per field - structure of arrays instead of array of structures - makes every byte of every line useful and lets the hardware prefetcher and vector units work. This is why columnar storage dominates analytics and row storage dominates transactional workloads, where whole records are read.",
      "How would you lay out a per-thread statistics structure? Answer: One cache-line-aligned instance per thread, padded so no two threads share a line, allocated so each lands on the NUMA node of the thread that owns it - which means allocating and first-touching it from that thread. Aggregate only at read time by summing across the per-thread instances, so the hot path is an uncontended local increment with no atomics. Use alignas(64) or std::hardware_destructive_interference_size rather than hardcoding, and verify with perf c2c that no cross-core traffic remains.",
      "A service is slow on a two-socket machine but fast on a one-socket machine with the same core count. What would you check? Answer: NUMA effects. Check numastat for numa_miss counts indicating remote allocations, and check whether memory was first-touched by an initialisation thread rather than by the workers. Check whether threads migrate between sockets, which invalidates both cache and locality, and pin them if so. Check whether a shared data structure is written by threads on both sockets, which forces coherence traffic across the interconnect. Common fixes are running one instance per socket with numactl --cpunodebind and --membind, parallel first-touch initialisation, and sharding shared state per node."
    ],
    faq: [
      {
        question: "Why does data layout matter more than algorithmic complexity at small sizes?",
        answer:
          "Because complexity analysis counts operations while hardware charges for memory accesses, and the two differ by nearly two orders of magnitude per access. A cache hit costs about a nanosecond and a DRAM access about eighty, so an algorithm doing ten times fewer operations but incurring cache misses on each one loses badly to a simple linear scan over contiguous memory that the prefetcher can stream. Concretely, scanning 500 contiguous elements touches about 32 cache lines, most of which the hardware prefetcher fetches before they are needed, so the whole scan may cost a few hundred nanoseconds; a hash lookup costs a hash computation, an indirect access into a bucket array that is likely a miss, and often a pointer dereference into a node that is another miss, so two misses alone approach the cost of the entire scan. The crossover point where asymptotics finally dominate is usually in the thousands of elements, which is above the size of a great many real collections. The design consequences are pervasive: flat open-addressed hash maps beat chained ones, small-vector optimisations beat sets and maps for small collections, B-trees beat binary search trees because their node size matches a cache line or page, and columnar layouts beat row layouts for analytic scans. The interview-ready formulation is that big-O describes the shape of the curve and the memory hierarchy sets the constant, and at realistic sizes the constant frequently wins."
      },
      {
        question: "What is the difference between false sharing and true sharing?",
        answer:
          "Both produce cache-line ping-ponging between cores with the same symptoms - poor or negative scaling, high coherence traffic, and the counter-intuitive property that pinning the threads to one core makes the program faster - but they have different causes and different fixes. False sharing means the threads are accessing logically independent data that happens to occupy the same 64-byte cache line: two adjacent counters in an array, two fields in a struct written by different threads, or a lock stored next to the data it protects. Nothing in the program's logic is shared; the hardware simply cannot track ownership at finer granularity than a line, so every write by one core invalidates the other's copy. The fix is purely a layout change - pad each item to its own cache line with alignas(64) or the standard's hardware_destructive_interference_size - and it costs memory but nothing else. True sharing means the threads genuinely access the same variable, such as a shared counter or a shared queue head, and no amount of padding helps because the contention is real. The fix must be algorithmic: accumulate per thread and combine at the end, shard the structure so each thread owns a partition, use a lock-free structure designed for the access pattern, or restructure so the sharing does not occur on the hot path. Distinguishing them in practice is what perf c2c is for - it reports the offending cache line and the offsets accessed by each core, so identical offsets mean true sharing and different offsets on the same line mean false sharing."
      },
      {
        question: "How does the hardware prefetcher work and how can you defeat it?",
        answer:
          "Modern CPUs contain several prefetchers that observe the address stream and speculatively fetch lines they predict will be needed. The simplest fetches the next sequential line on a miss; a stride prefetcher detects constant-stride patterns, such as walking an array of structs with a fixed element size, and continues the pattern ahead of the program; a stream prefetcher tracks several concurrent sequential streams; and adjacent-line prefetching pulls the paired line into L2. When they work, they hide most of DRAM latency, which is why a sequential scan of a large array achieves near memory bandwidth despite every line technically missing in cache. They are defeated by any pattern they cannot predict: pointer chasing, where the next address is unknown until the current line arrives, so misses serialise into a dependency chain and the effective throughput collapses to one miss latency per hop; random access, where there is no pattern to extrapolate; and crossing page boundaries, since prefetchers generally do not cross a 4 KB page for fear of touching unmapped memory - which is another reason huge pages help. The countermeasures when you cannot restructure the data are software prefetch instructions issued far enough ahead to cover the latency, which is delicate to tune and easy to make counterproductive; and structural changes that convert dependent loads into independent ones, such as processing several independent chains simultaneously so their misses overlap, which is exactly what a batched or vectorised hash probe does. The general principle worth stating is that memory-level parallelism - how many misses are in flight at once - matters as much as the miss count."
      },
      {
        question: "When is NUMA worth tuning for explicitly?",
        answer:
          "Whenever the workload is memory-bandwidth or memory-latency bound and runs on a machine with more than one NUMA node, which today includes many single-socket machines because large AMD and Intel parts expose internal sub-NUMA domains. The clearest signals are a measurable gap between the same core count on one socket versus spread across two, a high numa_miss count in numastat, and per-thread timings that cluster into two groups. The situations that reward tuning most are dense numerical work where every thread streams through its own partition, in-memory databases where the buffer pool is the working set, and any service with a large shared cache. The tuning has three levers. Placement policy: first-touch is the default, so the fix is usually to initialise memory in parallel with the same partitioning the computation will use, rather than serially from one thread. Pinning: binding a process to one node's CPUs and memory with numactl gives fully local access and is standard practice for databases, often run as one instance per socket. Interleaving: spreading pages round-robin across nodes with numactl --interleave, which is worse than correct placement but much better than accidental concentration, and is the right default for a shared read-mostly structure accessed from everywhere. It is worth naming when not to tune: small working sets that fit in cache do not care, workloads dominated by I/O do not care, and automatic NUMA balancing handles unattended mixed workloads reasonably well, though it adds sampling faults and is usually disabled once explicit pinning is in place."
      },
      {
        question: "Why do B-trees beat binary search trees in real systems?",
        answer:
          "Because the cost model that makes a binary search tree look good counts comparisons, and real systems pay for cache lines and pages rather than comparisons. A binary search tree with a million nodes has depth about twenty, and because the nodes are individually allocated and scattered, essentially every one of those twenty steps is a cache miss - roughly twenty times eighty nanoseconds, or 1.6 microseconds, of pure memory latency that cannot be overlapped because each step depends on the previous one. A B-tree sized so that a node fills a cache line or a page has a much higher branching factor: a 4 KB node holding, say, 256 keys gives depth three for the same million elements, so the same lookup costs three misses instead of twenty. Within a node the search is a scan or a branchless binary search over contiguous memory that the prefetcher handles, so it is nearly free. The same reasoning explains the whole family of cache-conscious structures: B+ trees for databases and filesystems, where the node size matches the storage block; adaptive radix trees and their cache-aware variants for in-memory indexes; flat open-addressed hash tables instead of chained ones; and skip lists losing ground to B-trees for the same reason binary trees do. The general statement, and the one to give in an interview, is that the right branching factor is determined by the transfer unit of the level you are optimising for - 64 bytes for cache, 4 KB for memory pages, and the block or erase-block size for storage - and that a structure tuned to that unit converts a long dependent chain of misses into a few."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Ulrich Drepper - What Every Programmer Should Know About Memory (2007)",
        insight: "Still the definitive treatment of cache lines, prefetching, NUMA, and false sharing, with measurements rather than assertions."
      },
      {
        source: "book",
        attribution: "Hennessy and Patterson - Computer Architecture: A Quantitative Approach, chapter 2 and appendix B",
        insight: "Provides the latency numbers and the analytical model that turn locality from intuition into arithmetic."
      },
      {
        source: "note",
        attribution: "Linux perf documentation - perf c2c for cache-to-cache and false sharing analysis",
        insight: "The tool that turns a suspected sharing problem into an exact cache line and offset, which is what separates a guess from a diagnosis."
      }
    ]
  }
];
