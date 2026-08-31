import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-os-cpu-scheduling - "OS: CPU Scheduling" (5 topics).
// Coverage: scheduling goals and metrics, the classic batch algorithms
// (FCFS/SJF/SRTF), preemption and round robin, priority scheduling with
// starvation and multi-level feedback queues, and real schedulers - Linux CFS
// plus real-time policies and deadline scheduling.
//
// Authoring rules: every field explicit, 5+ FAQs with real answers, at least two
// box-drawing diagrams per topic via `asciiDiagram` from "./_shared".
export const osCpuSchedulingTopics: Topic[] = [
  {
    id: "topic-os-scheduling-goals-and-metrics",
    moduleId: "mod-os-cpu-scheduling",
    title: "Scheduling Goals, Metrics, and the Workload Question",
    intuition:
      "There is no best scheduling algorithm, only a best algorithm for a stated goal, and the fastest way to sound senior is to refuse to name an algorithm before naming the metric. Throughput, turnaround time, response time, fairness, and predictability pull in different directions: the policy that finishes the most jobs per hour is usually the one that makes an interactive user wait, and the policy that feels instant on a desktop wastes cycles on a batch cluster. Every scheduler in existence is a specific answer to 'which of these do I sacrifice', so start by classifying the workload, then let the metric select the algorithm.",
    complexity: {
      time:
        "Scheduling decisions sit on the hot path of every context switch, so the selection itself must be cheap: O(1) for bitmap priority arrays, O(log n) for the red-black tree that Linux CFS uses, and O(n) only in naive textbook designs. A scheduler that costs more than a few hundred nanoseconds per decision starts eating the workload it is meant to serve.",
      space:
        "Per-CPU run queues plus a small amount of state per task - priority, weight, accumulated runtime, and queue links. The important space consideration is cache: keeping run queues per-CPU rather than global avoids a shared cache line that every core would contend on, which is the main reason modern schedulers are per-CPU with periodic load balancing."
    },
    lesson: [
      {
        title: "The Five Metrics and How They Conflict",
        content:
          "Throughput is completed work per unit time and favours long uninterrupted runs. Turnaround time is completion minus arrival, measuring total elapsed time for a job, and is minimised by running short jobs first. Response time is first-run minus arrival, measuring how quickly a task begins reacting, and is minimised by short quanta and frequent preemption. Waiting time is time spent runnable but not running. Fairness means each task receives a proportional share regardless of behaviour. The conflicts are structural, not incidental: short quanta improve response time but add context-switch overhead and hurt throughput; running short jobs first minimises average turnaround but starves long ones; strict fairness prevents starvation but denies latency-critical tasks the preferential treatment they need.",
        diagram: asciiDiagram(`The scheduling metric triangle

                    THROUGHPUT
                  (jobs per hour)
                         ▲
                         │  long quanta, few switches,
                         │  batch-friendly, cache stays warm
                         │
                         │
        RESPONSE ◀───────┼───────▶ FAIRNESS
        (time to first   │        (proportional share,
         reaction)       │         no starvation)
                         │
      short quanta,      │      equal weights, aging,
      preempt eagerly    │      no priority favouritism
      interactive-first  │
                         ▼
   Pick any two. Real schedulers pick a weighted blend and
   expose the weights as tunables (nice, cgroup shares, policy).

   Timeline vocabulary for one job:
      arrival ──▶ [ waiting ] ──▶ first run ──▶ ... ──▶ completion
                  └── response time ──┘
      └─────────────── turnaround time ──────────────────┘`)
      },
      {
        title: "Classifying the Workload First",
        content:
          "Workloads fall into recognisable families and each one implies a different policy. Batch or throughput-oriented work - compilation farms, ETL jobs, video encoding - has no human waiting, so long quanta and minimal switching are right. Interactive work - shells, editors, user-facing request handlers - needs low response time and short quanta, and it happens to be easy to serve because interactive tasks are usually I/O bound and give the CPU back voluntarily. Real-time work - audio processing, motor control, packet forwarding - needs deadline guarantees, and here average latency is irrelevant because only the worst case matters. Mixed general-purpose workloads, which is what a desktop or a shared server runs, need a scheduler that infers the class from behaviour rather than being told, which is exactly what multi-level feedback queues and CFS's sleeper fairness do.",
        diagram: asciiDiagram(`Workload class ──▶ metric ──▶ policy family

  BATCH (no human waiting)
     ├── metric: throughput, average turnaround
     └── policy: long quanta, SJF-like ordering, FCFS for simplicity
                 e.g. build farms, Hadoop/Spark stages, video encode

  INTERACTIVE (human or client waiting)
     ├── metric: response time, p99 latency
     └── policy: short quanta, preemption, boost after I/O wait
                 e.g. shells, editors, web request handlers

  REAL-TIME (physics is waiting)
     ├── metric: worst-case deadline miss, jitter
     └── policy: fixed priority (RM) or earliest-deadline-first
                 e.g. audio, avionics, industrial control

  MIXED (a normal machine)
     ├── metric: all of the above, weighted
     └── policy: infer class from behaviour ──▶ MLFQ or CFS
                 + separate real-time classes that always win`)
      },
      {
        title: "Preemptive vs Non-Preemptive, and Where Decisions Happen",
        content:
          "A non-preemptive scheduler only reconsiders when the running task blocks or exits, which makes it trivially simple and immune to mid-critical-section preemption, but it lets one long-running task monopolise the CPU indefinitely. A preemptive scheduler can also reconsider on a timer tick or when a higher-priority task wakes, which is what makes responsiveness and fairness enforceable at all. Concretely, there are four decision points: a task moves from running to waiting when it blocks, from running to ready when it is preempted, from waiting to ready when its I/O completes, and it terminates. Non-preemptive schedulers act only on the first and fourth; preemptive schedulers act on all four. Every general-purpose operating system since the 1990s is preemptive, because cooperative scheduling means one buggy loop freezes the machine - a failure mode Windows 3.x and classic Mac OS demonstrated at scale.",
        codeExample: `# The knobs that expose these tradeoffs on Linux.

# Nice value: -20 (greedy) .. 0 (default) .. 19 (generous).
# In CFS this maps to a weight; each step of 1 changes CPU share ~10%.
nice -n 10 ./batch_job          # deliberately deprioritise a batch task
renice -n -5 -p 4211            # give a latency-sensitive task more weight

# Scheduling policy: normal vs real-time.
chrt -f 50 ./audio_engine       # SCHED_FIFO prio 50: runs until it yields
chrt -r 50 ./control_loop       # SCHED_RR: FIFO + a quantum among equals
chrt -b 0  ./nightly_etl        # SCHED_BATCH: longer effective slices
chrt -i 0  ./scavenger          # SCHED_IDLE: only when nothing else wants CPU

# CFS target latency: the period over which every runnable task
# should get a turn. Lower = better response, more switches.
cat /proc/sys/kernel/sched_latency_ns          # e.g. 24000000 (24 ms)
cat /proc/sys/kernel/sched_min_granularity_ns  # floor on a slice

# Container share, same idea expressed as a cgroup weight:
echo 200 > /sys/fs/cgroup/mygroup/cpu.weight`
      },
      {
        title: "CPU-Bound vs I/O-Bound and Why Mixing Them Is the Whole Problem",
        content:
          "A CPU-bound task runs long bursts and rarely blocks; an I/O-bound task runs a short burst, issues a request, and sleeps. If the scheduler treats them identically, the I/O-bound task suffers badly: it waits behind long CPU bursts, then uses the CPU for a few microseconds before sleeping again, so it makes almost no progress while the device sits idle. The classic fix is to favour tasks with short bursts, because doing so costs the CPU-bound task very little - it is going to run for a long time anyway - while dramatically improving the interactive task's response and keeping devices busy. Every practical scheduler implements some version of this: MLFQ pushes tasks that block down toward higher-priority short-quantum queues, and CFS achieves it implicitly, since a task that sleeps stops accumulating virtual runtime and therefore looks 'owed' time when it wakes.",
        diagram: asciiDiagram(`Why favouring short bursts is nearly free

Bad: FCFS with a CPU hog first
  CPU  │████████████████████████│I│████████████████│I│
  Disk │                        │ │                │ │
       └── device idle almost the whole time ────────┘
  Interactive task waits a full CPU burst for each keystroke.

Good: run the short-burst task first
  CPU  │I│████████████████████████│I│████████████████
  Disk │ │########################│ │################
       └── device busy in parallel with CPU work ────┘
  Interactive task responds immediately; the CPU-bound job
  finishes essentially as soon as it would have anyway.

  Cost to the long job:  a few microseconds per interruption
  Gain to the short job: orders of magnitude in response time
  ──▶ this asymmetry is why "shortest job first" heuristics
      dominate interactive scheduling design.`)
      },
      {
        title: "Why the Optimal Algorithm Is Unimplementable",
        content:
          "Shortest-job-first provably minimises average waiting time, and shortest-remaining-time-first does the same for the preemptive case. Both require knowing burst lengths in advance, which is impossible for general workloads - it reduces to predicting program behaviour. Real schedulers therefore estimate the future from the past, most classically with an exponentially weighted moving average over observed bursts, and more practically by watching whether a task blocks quickly. This is the deep idea behind multi-level feedback queues: instead of asking a task how long it will run, put every newcomer at the top priority and demote it whenever it uses a full quantum. Tasks that block early stay high, tasks that grind stay low, and the scheduler has effectively learned the classification without being told. Understanding SJF as an unreachable optimum that real designs approximate is the framing that makes the rest of this module coherent.",
        codeExample: `// Classic burst-length prediction: exponential moving average.
//   tau[n+1] = alpha * t[n] + (1 - alpha) * tau[n]
// t[n]   = most recently observed CPU burst
// tau[n] = previous prediction
// alpha  = 0.5 typically: half weight to the newest observation

double predict_next_burst(double last_actual, double last_prediction) {
    const double alpha = 0.5;
    return alpha * last_actual + (1.0 - alpha) * last_prediction;
}

/* alpha = 0   -> ignore recent history entirely (prediction never moves)
   alpha = 1   -> trust only the last burst (very jumpy)
   alpha = 0.5 -> geometric decay: the k-th oldest burst has weight
                  0.5^(k+1), so history fades but is not discarded.

   MLFQ replaces this arithmetic with an observation:
     "used the whole quantum" ~= long burst  -> demote
     "blocked before quantum" ~= short burst -> keep high
   Same prediction, no floating point, no per-task history array. */`
      }
    ],
    examples: [
      {
        title: "Choosing a metric for a build farm",
        input:
          "A CI cluster runs 2000 compile jobs per hour with no human waiting on any individual job.",
        output: "Optimise throughput; use long quanta and batch policies.",
        explanation:
          "Step 1: Note that no one is watching an individual job, so response time is nearly worthless as a metric.\nStep 2: The scarce resource is aggregate cycles, so anything that wastes them - frequent preemption, cache thrash - is a direct loss.\nStep 3: Give jobs long slices and run close to the core count so caches stay warm.\nStep 4: On Linux, SCHED_BATCH is literally designed for this: it suppresses wakeup preemption and lengthens effective slices."
      },
      {
        title: "The same machine running a desktop session",
        input:
          "A developer compiles in one terminal while typing in an editor in another on the same laptop.",
        output: "Optimise response time for the editor without starving the build.",
        explanation:
          "Step 1: The editor is I/O bound with tiny bursts; the compiler is CPU bound with long bursts.\nStep 2: Favouring the editor costs the compiler microseconds per keystroke, which is negligible against a multi-minute build.\nStep 3: A scheduler that infers class from behaviour handles this automatically - the editor sleeps constantly, so it is always 'owed' time.\nStep 4: If it still feels sluggish, nice the compiler up rather than renicing the editor down, because the build has slack and the editor does not."
      },
      {
        title: "Metric mismatch causing a bad decision",
        input:
          "A team sees average request latency of 40 ms and declares the service healthy, but users complain constantly.",
        output: "Wrong metric: measure p99 and p999, not the mean.",
        explanation:
          "Step 1: Averages hide the tail, and a user experiences the tail because a single page load touches many requests.\nStep 2: A scheduler tuned for throughput can produce an excellent mean while occasionally making a request wait several full quanta.\nStep 3: Re-measure with percentiles and correlate spikes against involuntary context switches and run-queue depth.\nStep 4: Fix by reducing runnable concurrency or by giving latency-critical work a higher weight, which trades a little throughput for a much better tail."
      }
    ],
    tips: [
      "Never name an algorithm before naming the metric - 'which are we optimising, throughput or response time?' is the strongest opening line in this whole module.",
      "Define response time and turnaround time precisely; interviewers use them as a quick check that you are not paraphrasing from memory.",
      "Say that favouring short bursts is nearly free for long jobs - it is the asymmetry that justifies every interactive heuristic."
    ],
    tricks: [
      "If a question mentions humans or clients waiting, the answer is response time and the tail, not throughput and the mean.",
      "Whenever someone proposes SJF, immediately ask how burst length will be known; that question is the whole point of the algorithm's inclusion in curricula.",
      "Per-CPU run queues plus periodic load balancing beat one global queue, because a global queue puts a hot cache line in the path of every scheduling decision."
    ],
    memoryAids: [
      "Response time is when it starts; turnaround time is when it ends.",
      "Throughput loves long slices, response loves short ones - the quantum is the dial between them.",
      "You cannot know the future, so schedulers judge tasks by their recent past."
    ],
    interviewPatterns: [
      "Opener: 'What makes a good CPU scheduler?' - answer with metrics and their conflicts, not with a list of algorithms.",
      "Applied: 'This machine runs both batch and interactive work - what policy?' - classify, then pick per class and isolate them.",
      "Frequency and companies: Tier 2 as a standalone question, but Tier 1 as the framing that every other scheduling question builds on."
    ],
    practiceProblems: [
      "Three jobs arrive at time 0 with bursts 10, 1, and 2. Compute average turnaround for FCFS in that order versus shortest-job-first. Answer: FCFS gives completions 10, 11, 13 for an average of 11.33. SJF orders them 1, 2, 10 with completions 1, 3, 13 for an average of 5.67 - the same work, half the average turnaround, purely from ordering.",
      "Why does lowering the scheduling quantum eventually reduce throughput even though it improves response time? Answer: Each preemption costs a direct switch plus cache and TLB refill for the incoming task. Once the quantum approaches the switch overhead, a growing fraction of every slice is spent re-warming state rather than executing useful work.",
      "A latency-critical service and a batch job share 16 cores and the service's p99 is unstable. Name three fixes and their costs. Answer: raise the service's weight or lower the batch job's (cheap, but the batch job still steals cache); pin them to disjoint core sets with cpuset (better isolation, less peak throughput); or move the batch job to a separate machine (best isolation, highest cost). The general pattern is that isolation is bought with utilisation."
    ],
    faq: [
      {
        question: "What is the difference between response time and turnaround time?",
        answer:
          "Response time is the interval from a task becoming runnable to the moment it first gets the CPU, and turnaround time is the interval from becoming runnable to finishing entirely. The distinction is the difference between 'the cursor moved' and 'the job is done'. For an interactive workload response time is what a human perceives - a text editor that starts handling your keystroke within five milliseconds feels instant even if it takes another hundred milliseconds to finish redrawing. For a batch workload response time is meaningless because nobody is watching the start, and turnaround is the only thing that matters. Schedulers optimise these differently: short quanta and eager preemption minimise response time by getting every task started quickly, while running jobs to completion in shortest-first order minimises average turnaround. A scheduler cannot maximise both, which is exactly why general-purpose systems classify tasks and apply different treatment to each class."
      },
      {
        question: "Is a preemptive scheduler always better than a non-preemptive one?",
        answer:
          "For general-purpose systems, yes, because non-preemptive scheduling makes correctness depend on every program voluntarily yielding, and a single infinite loop then freezes the machine. That is not a theoretical concern - it was the everyday experience of Windows 3.x and classic Mac OS. But preemption is not free and not universally right. It adds context-switch overhead, it can preempt a thread inside a critical section and thereby delay everyone waiting on that lock, and it introduces nondeterminism that makes worst-case timing analysis harder. Hard real-time systems sometimes deliberately restrict preemption points to bound worst-case latency, and cooperative scheduling remains the norm inside user-space runtimes where the runtime controls every yield point - Go's goroutine scheduler was cooperative for years before adding asynchronous preemption precisely to handle tight loops that never yielded."
      },
      {
        question: "Why do schedulers use per-CPU run queues instead of one global queue?",
        answer:
          "A single global queue would be the most straightforward design and it gives perfect load balance for free, but it puts a shared lock and a shared cache line in the path of every scheduling decision on every core. With dozens of cores, that line ping-pongs between caches and the lock becomes a serialisation point at exactly the moment the system is busiest. Per-CPU queues eliminate the contention: each core makes decisions against its own queue with no cross-core communication in the common case. The price is that load can become uneven, so the kernel runs periodic load balancing that migrates tasks between queues, and wakeup paths try to place a task on a CPU that is idle or that shares a cache with its previous CPU. Migration is deliberately reluctant because moving a task to a different core throws away its warm cache, which is why the scheduler tolerates modest imbalance rather than chasing perfect equality."
      },
      {
        question: "How does the scheduler know a task is interactive without being told?",
        answer:
          "It infers it from behaviour, and the observable signal is whether a task uses its full time slice or blocks before exhausting it. A task that issues a read and sleeps after two hundred microseconds is behaving interactively regardless of what it claims to be; a task that runs for a full slice every time is CPU bound. Multi-level feedback queues encode this directly by demoting any task that consumes a whole quantum and keeping tasks that block at high priority. Linux CFS gets the same effect from a different mechanism: virtual runtime only accumulates while a task is actually running, so a task that sleeps falls behind the others and is chosen first when it wakes - and CFS additionally caps how far behind a long sleeper can get, so a task returning from a long sleep gets prompt service without being able to monopolise the CPU. Both designs deliberately avoid trusting any declaration from the process itself, because a process has every incentive to claim it is interactive."
      },
      {
        question: "What is convoy effect and where does it show up?",
        answer:
          "The convoy effect is what happens when a set of short tasks queues behind one long task under a non-preemptive, arrival-ordered policy: every short task waits for the entire long burst even though each would have finished almost instantly. The classic illustration is FCFS with one CPU-bound job and several I/O-bound jobs - the I/O devices sit idle while the long job runs, then all the short jobs run briefly and block again, and the pattern repeats with terrible utilisation on both the CPU and the devices. The name comes from traffic: one slow vehicle on a single-lane road creates a queue behind it regardless of how fast the other vehicles could travel. The effect is not limited to CPU scheduling; it appears in any FIFO service point, including database lock queues, single-threaded event loops that perform one long blocking operation, and thread pools where one slow request occupies a worker. The fixes are the same everywhere: preempt, reorder by expected service time, or isolate long work in a separate queue."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapters 7-8 (Scheduling, MLFQ) - https://pages.cs.wisc.edu/~remzi/OSTEP/",
        insight: "Develops the metrics first and then derives each algorithm as a response to a specific metric failure, which is exactly the structure a strong interview answer follows."
      },
      {
        source: "book",
        attribution: "Silberschatz, Galvin, Gagne - Operating System Concepts, chapter 5",
        insight: "Canonical definitions of turnaround, waiting, and response time plus the exponential-averaging burst prediction that interviewers often ask about by name."
      },
      {
        source: "note",
        attribution: "Linux manual page - sched(7)",
        insight: "Concise authoritative summary of every Linux scheduling policy, nice-to-weight mapping, and the tunables that expose these tradeoffs in production."
      }
    ]
  },
  {
    id: "topic-os-fcfs-sjf-srtf",
    moduleId: "mod-os-cpu-scheduling",
    title: "FCFS, SJF, and SRTF: The Batch Algorithms and What They Teach",
    intuition:
      "These three algorithms exist in every syllabus not because anyone ships them but because each one isolates a single idea. FCFS shows what happens with no policy at all and produces the convoy effect. SJF proves that reordering alone - with no extra hardware and no extra cycles - can halve average waiting time. SRTF adds preemption and shows that the gain grows further, at the cost of starvation and switching overhead. Learn them as a chain of arguments rather than as three procedures, and the Gantt-chart questions that open most scheduling interviews become mechanical.",
    complexity: {
      time:
        "FCFS selection is O(1) with a FIFO queue. SJF requires finding the minimum burst among ready tasks, which is O(n) with a scan or O(log n) with a heap. SRTF must re-evaluate on every arrival as well as every completion, so it performs more decisions and more context switches for the same workload.",
      space:
        "All three need only a ready queue holding one entry per runnable task. SJF and SRTF additionally require a burst-length estimate per task, which in practice means storing an exponentially weighted average of observed bursts - a single floating-point value per task."
    },
    lesson: [
      {
        title: "FCFS: Simplicity and the Convoy Effect",
        content:
          "First-come first-served runs tasks in arrival order and never preempts. It is trivially fair in the queueing sense, has zero starvation, and costs nothing to implement. Its fatal weakness is that average waiting time depends entirely on arrival order: put one long job first and every short job behind it inherits the full delay. This is the convoy effect, and it is worse than the raw numbers suggest because the short jobs are usually I/O bound, so while the long job holds the CPU every device sits idle, and when the short jobs finally run they block again almost immediately. FCFS is still the right answer in narrow cases - inside a single priority level where all tasks are equivalent, or in systems where predictability matters more than average latency - but as a general-purpose policy it is a demonstration of what not to do.",
        diagram: asciiDiagram(`Convoy effect: same three jobs, two arrival orders

Jobs: P1 burst 24 │ P2 burst 3 │ P3 burst 3   (all arrive at t=0)

Order P1, P2, P3
  0        24    27    30
  ├────────┼─────┼─────┤
  │   P1   │ P2  │ P3  │
  └────────┴─────┴─────┘
  wait: P1=0  P2=24  P3=27   ──▶ average wait 17.0

Order P2, P3, P1
  0   3     6              30
  ├───┼─────┼──────────────┤
  │P2 │ P3  │      P1      │
  └───┴─────┴──────────────┘
  wait: P2=0  P3=3  P1=6    ──▶ average wait 3.0

Identical work, identical CPU, 5.7x difference in average wait.
Nothing changed except the order ──▶ ordering IS the algorithm.`)
      },
      {
        title: "SJF: Provably Optimal, Practically Impossible",
        content:
          "Shortest-job-first always dispatches the ready task with the smallest next CPU burst, and it provably minimises average waiting time for a fixed set of jobs. The proof is an exchange argument: if a longer job runs before a shorter one, swapping them reduces the longer job's contribution to total waiting by less than it reduces the shorter one's, so any non-sorted order can be improved. The catch is the input - the algorithm needs the length of the next burst, which is a prediction about the future. Systems approximate it either with an exponentially weighted moving average over past bursts, or, far more practically, by observing whether a task blocks before exhausting its quantum. SJF also starves long jobs whenever short ones keep arriving, because a long job is only selected when nothing shorter is ready, and the standard remedy is aging - gradually improving a waiting task's effective priority so it eventually wins regardless.",
        codeExample: `// Non-preemptive SJF over a set of jobs, with the exchange-argument
// intuition made concrete: sort by burst, then run to completion.

typedef struct { int id, arrival, burst, start, finish; } Job;

int by_burst(const void *a, const void *b) {
    return ((Job*)a)->burst - ((Job*)b)->burst;
}

void sjf(Job *jobs, int n) {
    qsort(jobs, n, sizeof(Job), by_burst);   // all arrive at t=0
    int t = 0;
    for (int i = 0; i < n; i++) {
        jobs[i].start  = t;
        t             += jobs[i].burst;
        jobs[i].finish = t;
    }
}

/* Jobs (burst): A=6 B=8 C=7 D=3
   SJF order   : D(3) A(6) C(7) B(8)
   waits       : 0, 3, 9, 16      -> average 7.0
   FCFS order  : A B C D
   waits       : 0, 6, 14, 21     -> average 10.25

   The gap is pure ordering. No faster CPU, no extra core. */`
      },
      {
        title: "SRTF: Preemption Sharpens the Blade",
        content:
          "Shortest-remaining-time-first is the preemptive form of SJF. Whenever a task arrives, the scheduler compares its burst against the remaining time of the running task and switches if the newcomer is shorter. This lowers average waiting time further than non-preemptive SJF because a short job no longer has to wait for a long job that happened to start first. The costs are concrete: more context switches, therefore more direct and indirect switching overhead, and a much harsher starvation profile, since a long job can be preempted repeatedly and never accumulate progress while short jobs keep arriving. SRTF is the theoretical bound that practical interactive schedulers are chasing, and the multi-level feedback queue is best understood as SRTF implemented without knowledge of the future.",
        diagram: asciiDiagram(`SRTF with staggered arrivals

  Job  arrival  burst
   P1     0       8
   P2     1       4
   P3     2       9
   P4     3       5

  t=0  P1 starts (remaining 8)
  t=1  P2 arrives, burst 4 < P1 remaining 7 ──▶ PREEMPT
  t=2  P3 arrives, burst 9 > P2 remaining 3 ──▶ keep P2
  t=3  P4 arrives, burst 5 > P2 remaining 2 ──▶ keep P2
  t=5  P2 done, choose min remaining: P4=5 vs P1=7 vs P3=9 ──▶ P4

  0  1        5        10          17              26
  ├──┼────────┼────────┼───────────┼───────────────┤
  │P1│   P2   │   P4   │    P1     │      P3       │
  └──┴────────┴────────┴───────────┴───────────────┘

  turnaround: P1=17  P2=4  P3=24  P4=7   ──▶ average 13.0
  non-preemptive SJF on the same input gives 13.75, FCFS 15.75
  and note P3 - the longest job - paid for everyone else's gain.`)
      },
      {
        title: "Working a Gantt Question Under Interview Pressure",
        content:
          "These questions are graded on process as much as on the final number, so use a fixed procedure. Write the arrival and burst table first. Draw a timeline and advance it event by event, where events are arrivals and completions only - nothing happens between them. At each event, apply the selection rule explicitly and say it out loud. Record each job's start and finish time as you go. Then compute turnaround as finish minus arrival, waiting as turnaround minus burst, and response as start minus arrival. Two traps account for most mistakes: forgetting that a job which has not arrived yet cannot be selected, which leaves the CPU idle, and computing waiting time from time zero instead of from arrival. State your tie-breaking rule aloud as well, because a different rule gives a different chart and interviewers accept any consistent choice.",
        codeExample: `// The formula sheet, stated once, so nothing is derived under pressure.

turnaround = finish  - arrival
waiting    = turnaround - burst        // == total time ready but not running
response   = first_start - arrival

// Worked example, all arriving at t = 0.
//   Job  burst   FCFS order A,B,C,D
//    A     6     start 0   finish 6
//    B     8     start 6   finish 14
//    C     7     start 14  finish 21
//    D     3     start 21  finish 24
//
//   turnaround: 6, 14, 21, 24   -> average 16.25
//   waiting   : 0,  6, 14, 21   -> average 10.25
//   response  : same as waiting (non-preemptive, single burst each)
//
// Sanity checks that catch most arithmetic slips:
//   * waiting >= 0 for every job, always
//   * turnaround >= burst for every job, always
//   * sum of bursts == last finish time, IF the CPU never idled
//   * if any job arrives later than the CPU goes idle, insert the gap`
      },
      {
        title: "What Survives Into Real Schedulers",
        content:
          "None of these three algorithms ships as a general-purpose policy, yet each contributes a durable idea. FCFS survives as the tie-breaker within a single priority level, because once tasks are genuinely equivalent, arrival order is a defensible and cheap rule. SJF survives as the principle that favouring short bursts is nearly free, which every interactive heuristic encodes. SRTF survives as the justification for wakeup preemption: when a task with a small demand becomes runnable, letting it interrupt a long-running task costs the long task almost nothing. And the failure modes survive too - starvation is why aging and minimum-share guarantees exist, and the switching cost of SRTF is why real schedulers impose a minimum granularity so that no task can be preempted after only a few microseconds.",
        diagram: asciiDiagram(`From textbook algorithm to shipped scheduler

  FCFS
   ├── keeps: arrival order as an intra-priority tie-break
   └── fixes needed: preemption, otherwise one job freezes the system

  SJF
   ├── keeps: "short bursts first is almost free for long jobs"
   ├── blocked by: burst length is unknowable
   └── approximated by: EWMA prediction, or MLFQ demotion on quantum use

  SRTF
   ├── keeps: preempt on wakeup when the newcomer is cheap
   ├── blocked by: starvation + switch overhead
   └── bounded by: aging, minimum granularity, wakeup granularity

              ▼ combine all three lessons ▼

  Linux CFS: pick smallest virtual runtime (SJF-like ordering by
  "who is owed"), preempt on wakeup (SRTF-like), never starve
  (weights guarantee a share), and refuse to switch below
  sched_min_granularity_ns (bounds SRTF's overhead).`)
      }
    ],
    examples: [
      {
        title: "FCFS Gantt with staggered arrivals",
        input: "P1 arrives t=0 burst 5, P2 arrives t=1 burst 3, P3 arrives t=8 burst 2.",
        output: "Timeline 0-5 P1, 5-8 P2, 8-10 P3; average turnaround 3.67.",
        explanation:
          "Step 1: At t=0 only P1 has arrived, so it runs to t=5.\nStep 2: At t=5 only P2 is waiting, so it runs to t=8.\nStep 3: P3 arrives exactly at t=8 and runs to t=10 - note the CPU never idles here, but check for a gap whenever the next arrival is later than the current finish.\nStep 4: Turnarounds are 5-0=5, 8-1=7, 10-8=2, averaging 4.67; waits are 0, 4, 0, averaging 1.33."
      },
      {
        title: "Starvation under SJF",
        input:
          "A 100-second job is queued while 1-second jobs arrive every 0.5 seconds indefinitely.",
        output: "The long job never runs; aging is required.",
        explanation:
          "Step 1: SJF selects the minimum burst among ready tasks, and a 1-second job always beats 100 seconds.\nStep 2: Because arrivals never stop, there is never an instant when the long job is the shortest ready task.\nStep 3: The long job waits forever even though the system is not overloaded in aggregate.\nStep 4: Aging fixes it by improving effective priority with waiting time, so the long job eventually outranks newcomers - which is precisely what MLFQ's periodic priority boost does."
      },
      {
        title: "Why SRTF is unusable for a database",
        input:
          "A team proposes SRTF for query scheduling because it minimises average completion time.",
        output: "Reject it: unbounded tail latency for large queries and heavy switching.",
        explanation:
          "Step 1: Average completion time is the wrong metric when users have per-query expectations and SLAs.\nStep 2: Under SRTF a large analytical query is preempted by every small point lookup that arrives, so its completion time is unbounded.\nStep 3: The constant preemption also destroys cache locality for the large query, making its actual work slower, not just delayed.\nStep 4: The practical design is separate queues with guaranteed shares - small queries get low latency, large queries get a floor on progress, and neither can starve the other."
      }
    ],
    tips: [
      "Draw the timeline before computing anything; almost every arithmetic error comes from skipping the chart.",
      "Say your tie-breaking rule out loud - lower ID first, or earlier arrival first - because interviewers accept any consistent rule but penalise silent inconsistency.",
      "Check that the sum of bursts equals the last finish time whenever the CPU never idled; it catches most slips instantly."
    ],
    tricks: [
      "SJF's optimality has a one-line proof by exchange argument - offering it unprompted is a cheap way to show you understand rather than memorised.",
      "If a question stresses 'minimise average waiting time', it is fishing for SJF; if it stresses 'no job may be delayed indefinitely', it is fishing for aging or round robin.",
      "SRTF only needs to re-evaluate on arrivals and completions, so a question with n jobs has at most 2n decision points - enumerate them and the chart writes itself."
    ],
    memoryAids: [
      "FCFS is a supermarket queue: fair, and ruined by one customer with a full trolley.",
      "SJF is optimal but clairvoyant - it needs a crystal ball, so we approximate the ball with recent history.",
      "SRTF is SJF that is allowed to interrupt, and interruption is bought with starvation."
    ],
    interviewPatterns: [
      "Mechanical Gantt question: given arrivals and bursts, compute average waiting and turnaround under two policies and compare.",
      "Follow-up reasoning: 'SJF is optimal - so why does nobody use it?' - unknowable bursts plus starvation.",
      "Frequency and companies: Tier 1 in campus and new-grad screens everywhere; Tier 2 for experienced roles, where the follow-up matters more than the chart."
    ],
    practiceProblems: [
      "Jobs arrive at times 0, 2, 4 with bursts 7, 4, 1. Compute average waiting time for FCFS, non-preemptive SJF, and SRTF. Answer: FCFS runs 0-7, 7-11, 11-12 with waits 0, 5, 7 averaging 4.0. Non-preemptive SJF at t=7 picks the burst-1 job first, giving waits 0, 6, 3 averaging 3.0. SRTF preempts nothing at t=2 (remaining 5 < 4 is false, so it does preempt) - work it as an event list and you get 2.67, the lowest of the three.",
      "Prove informally that SJF minimises average waiting time when all jobs are available at t=0. Answer: Suppose a longer job L runs immediately before a shorter job S. Swapping them reduces S's wait by L's burst and increases L's wait by S's burst, and since S's burst is smaller the total wait strictly decreases. Repeating the swap on any inversion sorts the order, so the sorted order is optimal.",
      "Under SRTF, can a job be preempted more than once? Give a scenario. Answer: Yes, arbitrarily many times. A 100-unit job started at t=0 is preempted at t=1 by a 2-unit arrival, resumes at t=3, is preempted again at t=4 by another 2-unit arrival, and so on; every new short arrival re-preempts it, which is exactly the starvation and switch-overhead objection to SRTF."
    ],
    faq: [
      {
        question: "If SJF is provably optimal, why does no real system use it?",
        answer:
          "Because the proof assumes an input the operating system cannot obtain. SJF needs the length of each task's next CPU burst before choosing, and that is a prediction about arbitrary program behaviour, equivalent in general to solving the halting problem. Even a cooperative program cannot reliably supply it, since a burst ends whenever the task happens to block on I/O or a lock, which depends on conditions outside the program's control. Systems therefore approximate it, either by predicting from history with an exponentially weighted moving average or - far more robustly - by observing behaviour, which is what multi-level feedback queues do when they demote any task that consumes an entire quantum. The second problem is starvation: even with perfect predictions, a steady stream of short jobs would keep a long job waiting forever, so any deployment of SJF would need aging bolted on, at which point it has become an MLFQ."
      },
      {
        question: "Does SRTF always beat SJF on average waiting time?",
        answer:
          "On the idealised model, yes: preemption gives the scheduler strictly more freedom, and the ability to abandon a long job when a short one arrives can only reduce average waiting time, never increase it. But the idealised model charges nothing for a context switch. Once you account for the direct switch cost and, more importantly, the indirect cost of refilling caches, TLBs, and branch predictors for the resumed task, SRTF's advantage narrows and can invert for workloads with large working sets and many arrivals. It also produces markedly worse worst-case behaviour, since a long job may be preempted repeatedly and see its completion time grow without bound. This is why practical schedulers impose a minimum granularity - a floor on how briefly a task may run before being preempted - which deliberately gives up a little of the theoretical optimum to bound the overhead."
      },
      {
        question: "How do I handle ties in a Gantt chart question?",
        answer:
          "Pick a rule, state it explicitly before you start drawing, and apply it consistently. The conventional choices are lower process ID first, or earlier arrival time first, and interviewers accept either because the underlying algorithm does not specify tie-breaking. What loses marks is switching rules mid-problem or leaving the choice unstated, because then your chart disagrees with the interviewer's and neither of you can tell whether the disagreement is a tie-break or a genuine error. There is one tie that is not arbitrary and does have a conventional answer: when a newly arriving job has exactly the same remaining time as the running job under SRTF, the standard convention is not to preempt, because preempting buys nothing and costs a context switch. Saying that out loud demonstrates that you are reasoning about the algorithm rather than mechanically applying it."
      },
      {
        question: "What is the difference between waiting time and response time here?",
        answer:
          "Waiting time is the total time a job spends in the ready queue across its entire life, while response time is only the delay until it first runs. For non-preemptive algorithms where each job has a single burst, the two are numerically equal, which is why they are often conflated in textbook examples. For preemptive algorithms they diverge sharply: under SRTF a job might start almost immediately, giving it excellent response time, then be preempted repeatedly and accumulate a large total waiting time before finishing. That divergence is exactly why interactive systems optimise response time rather than waiting time - a user cares that the application reacted, not that it was momentarily descheduled afterwards. When answering a numeric question, compute waiting as turnaround minus burst rather than by summing queue intervals, because that formula is correct for both preemptive and non-preemptive cases and avoids missing a fragment."
      },
      {
        question: "Where does FCFS still make sense in a modern system?",
        answer:
          "In three places. First, as the tie-breaker inside one priority level of a more sophisticated scheduler - once tasks are genuinely equivalent, arrival order is cheap, defensible, and starvation-free. Second, in real-time systems using fixed priorities, where SCHED_FIFO on Linux runs the highest-priority runnable task until it blocks or yields; the predictability of never being preempted by an equal-priority peer is precisely the property those workloads want. Third, in any queue where the service times are nearly uniform, because the convoy effect requires variance in burst length to bite - if every request takes roughly the same time, FCFS is both fair and near-optimal. This last case is common in well-designed request handling, and it is the reason some systems work hard to make request costs homogeneous, splitting large operations into bounded chunks so that a simple FIFO queue behaves well."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Silberschatz, Galvin, Gagne - Operating System Concepts, chapter 5 (CPU Scheduling)",
        insight: "The source of the canonical Gantt-chart exercises and the exact metric definitions most interviewers grade against."
      },
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapter 7 - https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf",
        insight: "Presents FCFS, SJF, and STCF as successive fixes to a specific measured failure, which makes the motivation for each far easier to reproduce under pressure."
      },
      {
        source: "note",
        attribution: "Linux manual page - sched(7), section on SCHED_FIFO",
        insight: "Concrete evidence that run-to-completion FIFO scheduling still ships, and why predictability rather than average latency is its justification."
      }
    ]
  },
  {
    id: "topic-os-round-robin-and-quantum",
    moduleId: "mod-os-cpu-scheduling",
    title: "Round Robin and the Time Quantum Tradeoff",
    intuition:
      "Round robin is FCFS plus a timer. Each task runs for at most one quantum, then goes to the back of the queue whether it is finished or not. That single change converts the worst property of FCFS - unbounded waiting behind a long job - into a bounded guarantee: with n runnable tasks and quantum q, no task waits more than roughly (n-1)q before running again. Everything interesting about round robin is the choice of q, because it is a direct dial between responsiveness and overhead, and knowing how to reason about that dial is what the question is really testing.",
    complexity: {
      time:
        "Selection is O(1) - dequeue the head, enqueue the tail. The meaningful cost is the switch rate: with quantum q and switch overhead s, the fraction of CPU lost to switching is s/(q+s), so a 10 microsecond quantum with 2 microsecond overhead throws away roughly 17% of the machine while a 10 millisecond quantum throws away 0.02%.",
      space:
        "One FIFO queue plus per-task state, so O(n) in the number of runnable tasks. No sorting structure is needed, which is why round robin is the natural policy inside a single priority level of a larger scheduler."
    },
    lesson: [
      {
        title: "The Mechanism and Its Guarantee",
        content:
          "The ready queue is a FIFO. The scheduler dequeues the head, programs a timer for one quantum, and dispatches. If the task blocks or finishes before the timer expires, the scheduler simply moves on. If the timer fires first, an interrupt preempts the task and it is enqueued at the tail. The consequence is a hard bound on response time: a newly ready task sits behind at most n-1 others, each of which runs for at most q, so it starts within about (n-1)q. That bound is the entire point. It is why round robin cannot starve anything, why it needs no knowledge of burst lengths, and why it is the default policy within an equal-priority group in essentially every real scheduler, including Linux's SCHED_RR.",
        diagram: asciiDiagram(`Round robin with quantum 4

  Jobs (all arrive t=0): P1 burst 10 │ P2 burst 4 │ P3 burst 6

  Ready queue evolves:
    t=0   [P1 P2 P3]  dispatch P1, runs 4, remaining 6 ──▶ tail
    t=4   [P2 P3 P1]  dispatch P2, runs 4, DONE
    t=8   [P3 P1]     dispatch P3, runs 4, remaining 2 ──▶ tail
    t=12  [P1 P3]     dispatch P1, runs 4, remaining 2 ──▶ tail
    t=16  [P3 P1]     dispatch P3, runs 2, DONE
    t=18  [P1]        dispatch P1, runs 2, DONE

  0    4    8    12   16  18  20
  ├────┼────┼────┼────┼───┼───┤
  │ P1 │ P2 │ P3 │ P1 │P3 │P1 │
  └────┴────┴────┴────┴───┴───┘

  response: P1=0  P2=4  P3=8       ──▶ every task started by (n-1)q = 8
  turnaround: P1=20 P2=8 P3=18     ──▶ average 15.33
  Note P2, the short job, finished early WITHOUT the scheduler
  knowing its burst length. That is round robin's real trick.`)
      },
      {
        title: "Choosing the Quantum",
        content:
          "Too small and the machine spends its time switching rather than working: the overhead fraction is the switch cost divided by the sum of quantum and switch cost, and it also destroys cache locality, so effective throughput falls faster than the arithmetic suggests. Too large and round robin degenerates into FCFS, since almost every task finishes within its quantum and the bound on response time becomes useless. The classical rule of thumb is that the quantum should be large enough that roughly 80% of CPU bursts complete within it, which keeps preemption rare while still bounding the damage from the long tail. Typical values land between 10 and 100 milliseconds for general-purpose systems, and the modern refinement is to derive the quantum dynamically rather than fixing it - Linux computes an effective slice from a target latency divided by the number of runnable tasks, with a floor to prevent it from collapsing under high load.",
        codeExample: `# Quantum selection, quantitatively.

# Overhead fraction = s / (q + s), where s = context switch cost.
#   s = 2 us
#   q = 10 us   -> 2/12   = 16.7% of the CPU burned switching
#   q = 100 us  -> 2/102  = 2.0%
#   q = 1 ms    -> 2/1002 = 0.2%
#   q = 10 ms   -> 2/10002= 0.02%
#
# Response bound = (n - 1) * q
#   n = 50 tasks, q = 10 ms -> 490 ms worst case: sluggish
#   n = 50 tasks, q = 1 ms  ->  49 ms worst case: acceptable
#
# The two constraints pull opposite ways, which is why a FIXED
# quantum is wrong under variable load. Linux derives it:

#   slice = max(sched_latency_ns / nr_running, sched_min_granularity_ns)

sysctl kernel.sched_latency_ns           # target: everyone runs within this
sysctl kernel.sched_min_granularity_ns   # floor: never slice thinner than this
sysctl kernel.sched_wakeup_granularity_ns# how much better a waker must be
                                         # before it may preempt immediately

# Above nr_running = latency/min_granularity, the target latency is
# abandoned and the effective period grows - a deliberate admission
# that you cannot serve everyone quickly when everyone is runnable.`
      },
      {
        title: "Why Round Robin Is Unfair to I/O-Bound Tasks",
        content:
          "Round robin gives every task an equal share of dispatch opportunities, which sounds fair but is not fair in terms of useful work. A CPU-bound task consumes its full quantum every time it is dispatched. An I/O-bound task runs for a fraction of a quantum, blocks, and by the time its I/O completes it must queue behind everyone again. Over any window, the CPU-bound task therefore receives far more CPU time, and the I/O-bound task's device sits idle waiting for it to be redispatched. The standard remedies all amount to compensating tasks that yield voluntarily: give a task that blocks early a priority boost, or credit it with the unused portion of its quantum, or - as CFS does - track virtual runtime so that a task which barely ran is automatically the most deserving next. Recognising that equal dispatch is not equal service is the insight this topic is testing.",
        diagram: asciiDiagram(`Equal turns is not equal service

  Quantum = 10 ms. C = CPU-bound. I = I/O-bound (needs 1 ms then blocks).

  Dispatch order over 5 rounds with queue [C1 C2 I]:
    C1 ████████████ 10 ms
    C2 ████████████ 10 ms
    I  █             1 ms  ──▶ blocks, joins tail after I/O
    C1 ████████████ 10 ms
    C2 ████████████ 10 ms
    I  █             1 ms
    ...

  CPU received per round:  C1 = 10 ms │ C2 = 10 ms │ I = 1 ms
  Turns received per round: 1 : 1 : 1        ← "fair"
  Service received:        10 :10 : 1        ← plainly not

  And the disk is idle for ~20 ms between each of I's requests,
  so BOTH the interactive task and the device are underused.

  Fixes, all the same idea in different clothing:
     ├── boost priority of tasks that block before their quantum ends
     ├── credit unused quantum back to the task
     └── track virtual runtime, not turns  ──▶ CFS`)
      },
      {
        title: "Round Robin Inside Bigger Schedulers",
        content:
          "Pure round robin is rarely the whole policy, but it is almost always part of one. Linux's SCHED_RR is exactly round robin among real-time tasks of equal priority: the highest-priority runnable task runs, and if several share that priority they take turns with a fixed quantum, while SCHED_FIFO at the same priority would let the first one run until it yields. Inside a multi-level feedback queue, each level is typically round robin with a level-specific quantum - short at the top for interactive tasks, long at the bottom for batch. Container and cgroup CPU sharing is round robin generalised to weights, where the 'turn' is proportional to a share rather than equal. Even Linux's CFS, which is not literally round robin, preserves its guarantee: the target latency is the period within which every runnable task should get a turn, which is the round-robin bound restated as a tunable.",
        codeExample: `// The three Linux policies that use "take turns" semantics differently.

// SCHED_FIFO prio 50: run until you block or yield. No quantum.
//   Two equal-priority FIFO tasks -> the first one can hold the CPU forever.
struct sched_param p = { .sched_priority = 50 };
sched_setscheduler(0, SCHED_FIFO, &p);

// SCHED_RR prio 50: same priority ordering, but with a quantum.
//   Two equal-priority RR tasks -> they alternate every timeslice.
sched_setscheduler(0, SCHED_RR, &p);
int q_ms;
struct timespec ts;
sched_rr_get_interval(0, &ts);        // read the RR quantum (often 100 ms)

// SCHED_OTHER (CFS): weighted fair share, no fixed quantum at all.
//   The "turn" length is derived from load, and the ordering key is
//   accumulated virtual runtime rather than queue position.
struct sched_param z = { .sched_priority = 0 };
sched_setscheduler(0, SCHED_OTHER, &z);
setpriority(PRIO_PROCESS, 0, 5);      // nice 5 -> smaller weight

/* Safety note: a runaway SCHED_FIFO task can lock out everything
   else on its CPU, including your shell. That is why
   /proc/sys/kernel/sched_rt_runtime_us reserves a slice of every
   period for non-real-time work by default. */`
      },
      {
        title: "Weighted Round Robin and Proportional Share",
        content:
          "Equal turns generalise naturally to proportional turns. In weighted round robin each task has a weight and receives a quantum proportional to it, so a task with weight 2 gets twice the CPU of a task with weight 1. This is the conceptual basis for nice values, cgroup CPU shares, and container CPU limits: none of them are hard caps by default, they are relative weights that only matter when there is contention. Lottery scheduling expresses the same idea probabilistically by giving each task a number of tickets and drawing at random, which gives correct proportions in expectation with a very simple implementation. Stride scheduling makes it deterministic by advancing each task's counter by an amount inversely proportional to its weight and always running the task with the smallest counter - which is, essentially, what CFS's virtual runtime does. The chain from round robin to weighted round robin to stride scheduling to CFS is a clean narrative to have ready.",
        diagram: asciiDiagram(`From equal turns to weighted fair share

  ROUND ROBIN            every task: one quantum q
       │                 share = 1/n each
       │  add weights
       ▼
  WEIGHTED RR            task i gets q * w_i
       │                 share = w_i / sum(w)
       │  make it fine-grained instead of per-turn
       ▼
  STRIDE SCHEDULING      stride_i = BIG / w_i
       │                 pass_i += stride_i each time it runs
       │                 always run min(pass) ──▶ exact proportions
       │  measure in real time, not in passes
       ▼
  CFS                    vruntime_i += runtime * (NICE_0_WEIGHT / w_i)
                         always run min(vruntime) via a red-black tree
                         ──▶ same math, O(log n) selection, and
                             sleeping tasks stay "owed" automatically

  Linux nice ▶ weight table (each step ≈ 1.25x):
     nice -20 ▶ 88761        nice  0 ▶ 1024        nice +19 ▶ 15
     ratio between nice 0 and nice 5 ≈ 1024/335 ≈ 3x the CPU`)
      }
    ],
    examples: [
      {
        title: "Quantum too small on a loaded server",
        input:
          "An engineer sets the scheduling granularity to 100 microseconds hoping to improve latency, and throughput drops 20%.",
        output: "Switch overhead now dominates; raise the floor back.",
        explanation:
          "Step 1: With a 100 microsecond slice and roughly 2 microseconds of direct switch cost, 2% is lost directly.\nStep 2: The indirect cost is much larger, because each task gets barely enough time to refill its cache before being preempted again.\nStep 3: Measure with pidstat -w to confirm the involuntary switch rate exploded.\nStep 4: Restore sched_min_granularity_ns to a value where most bursts complete within a slice; latency was likely bounded by queueing, not by slice length."
      },
      {
        title: "Interactive task starved by equal turns",
        input:
          "A monitoring agent that polls every 100 ms shows growing jitter as batch jobs are added to a machine.",
        output: "Round-robin turn equality gives the agent a shrinking share of wall-clock attention.",
        explanation:
          "Step 1: The agent needs one short burst per poll, but must queue behind every batch task each time.\nStep 2: As n grows, the response bound (n-1)q grows linearly, so the poll drifts later and later.\nStep 3: Equal turns do not help because the agent uses only a sliver of each turn while the batch tasks use all of theirs.\nStep 4: Give the agent a higher weight, or a real-time policy if the timing is genuinely a requirement, so it preempts rather than queues."
      },
      {
        title: "Container CPU shares behaving unintuitively",
        input:
          "Two containers are configured with shares 1024 and 512, yet the smaller one sometimes uses more CPU than the larger one.",
        output: "Shares are relative weights under contention, not caps.",
        explanation:
          "Step 1: When the machine is not saturated, both containers run whenever they are runnable, so shares have no effect at all.\nStep 2: The ratio only manifests when both are continuously runnable and competing for the same cores.\nStep 3: A container that is idle for part of the window can therefore consume more absolute CPU than its share suggests when the other is idle.\nStep 4: If a hard ceiling is required, use cpu.max quota rather than weights - and expect throttling stalls at period boundaries as the cost."
      }
    ],
    tips: [
      "Give the response-time bound as (n-1) times the quantum; it is the single most quotable fact about round robin.",
      "Always mention that the quantum must be chosen relative to context-switch cost, and give the s/(q+s) overhead fraction.",
      "Note that round robin is fair in turns but not in service, and that this is exactly why CFS measures virtual runtime instead of turns."
    ],
    tricks: [
      "The rule of thumb is that roughly 80% of CPU bursts should complete within one quantum - concrete and easy to justify.",
      "If asked why Linux has no fixed quantum, answer that it derives one from sched_latency_ns divided by the runnable count, with a minimum granularity floor.",
      "Weighted round robin, lottery, stride, and CFS are the same idea at four levels of precision; presenting them as a chain reads as depth rather than trivia."
    ],
    memoryAids: [
      "Round robin is FCFS with an alarm clock.",
      "Small quantum, snappy but wasteful. Large quantum, efficient but sluggish. At infinity it is just FCFS.",
      "Equal turns, unequal service - the I/O-bound task never uses its whole turn."
    ],
    interviewPatterns: [
      "Mechanical: draw the round-robin Gantt chart for a given quantum and compute average turnaround and response.",
      "Conceptual: 'How would you choose the time quantum?' - overhead fraction versus response bound, plus the 80% rule.",
      "Frequency and companies: Tier 1 in new-grad OS screens; appears at senior level mainly as the lead-in to CFS and cgroup share questions."
    ],
    practiceProblems: [
      "Three tasks with bursts 5, 3, 8 arrive at t=0 and the quantum is 2. Draw the schedule and give each task's response time. Answer: Order of dispatch is P1 P2 P3 P1 P2 P3 P1 P3 P3, so responses are 0, 2, and 4 - all within (n-1)q = 4, which is the guarantee in action. Turnarounds are 13, 8, and 16.",
      "A system has 200 runnable tasks and a 10 ms quantum. What is the worst-case time before a given task runs, and what would you change? Answer: Roughly 199 x 10 ms, or about 2 seconds, which is unusable interactively. Either shrink the quantum, accepting more switch overhead, or - better - stop treating all 200 as equals and give latency-sensitive tasks higher weight or a separate class.",
      "Explain why increasing the quantum toward infinity turns round robin into FCFS, and why decreasing it toward zero does not turn it into processor sharing in practice. Answer: With an infinite quantum no task is ever preempted, so tasks run to completion in arrival order, which is FCFS exactly. With a quantum approaching zero the idealised model approaches perfect processor sharing, but real switches cost a fixed amount, so the overhead fraction approaches one and the machine does no useful work at all."
    ],
    faq: [
      {
        question: "How is the time quantum actually enforced?",
        answer:
          "By a hardware timer. The kernel programs a timer device - historically a periodic tick at 100, 250, or 1000 Hz, and on modern tickless kernels a one-shot high-resolution timer set to the exact expiry - and the device raises an interrupt when it fires. The interrupt forcibly transfers control to the kernel regardless of what the user task was doing, which is what makes preemption possible at all: without a timer the kernel would only regain control when a task voluntarily made a system call. In the handler, the kernel updates accounting, decides whether the current task has exhausted its entitlement, and if so sets a flag that causes a reschedule on the return path. Modern Linux prefers one-shot timers over a fixed tick because a periodic tick wakes idle CPUs unnecessarily, wasting power, and because a single fixed frequency cannot serve both a 1 ms latency target and a 100 ms batch slice well."
      },
      {
        question: "Does round robin guarantee fairness?",
        answer:
          "It guarantees equal dispatch opportunities, which is a much weaker property than equal service. Every runnable task is dequeued exactly once per cycle through the queue, so no task can be starved and the response-time bound holds. But a task that blocks after one microsecond and a task that uses its entire ten millisecond quantum both count as having had one turn, so over any window the CPU-bound task receives thousands of times more CPU. That is precisely backwards from what users want, since the task that blocks quickly is usually the interactive one. It is also unfair in the other direction when weights matter, because pure round robin has no notion of priority at all. Real schedulers therefore measure service rather than turns: CFS accumulates virtual runtime only while a task is actually executing, so a task that barely ran remains the most deserving candidate, and weights scale the accumulation rate so that priority is expressed as a share."
      },
      {
        question: "What is the difference between SCHED_RR and SCHED_FIFO?",
        answer:
          "Both are fixed-priority real-time policies on Linux, and both always preempt every normal SCHED_OTHER task. The difference appears only among tasks at the same priority level. Under SCHED_FIFO, a task runs until it blocks, yields explicitly with sched_yield, or is preempted by something of strictly higher priority - so two equal-priority FIFO tasks do not share the CPU, and whichever runs first can hold it indefinitely. Under SCHED_RR, equal-priority tasks take turns with a quantum, typically 100 milliseconds and readable with sched_rr_get_interval. Choose FIFO when a task must not be interrupted by its peers, which is common in tightly-coupled control loops, and RR when several equally-critical tasks must all make progress. Both are dangerous on a shared machine because a runaway real-time task can lock out everything below it, which is why Linux by default reserves a fraction of each period for non-real-time work via sched_rt_runtime_us."
      },
      {
        question: "Why does a smaller quantum not simply give better latency?",
        answer:
          "Because latency has two components and shrinking the quantum only attacks one of them. The queueing component - how long you wait behind other tasks - does shrink, since the bound is (n-1)q. But the service component grows, because the task you eventually run executes more slowly: it is preempted more often, and each resumption begins with cold caches, an invalidated TLB working set, and an untrained branch predictor. Below a certain point the machine spends a large fraction of every slice simply re-establishing the state it just discarded, so total elapsed time to finish a unit of work increases even though the task started sooner. There is also a floor effect from the timer itself, since programming and servicing a high-resolution timer has a cost of its own. This is why Linux enforces sched_min_granularity_ns as a hard floor and why tuning guides warn against lowering it: the knob looks like a latency dial but past a threshold it is a throughput dial pointing the wrong way."
      },
      {
        question: "How do cgroup CPU shares relate to round robin?",
        answer:
          "They are weighted proportional sharing applied at the level of groups rather than individual tasks, and the scheduler treats a group as a single entity when deciding shares, then recurses into the group to decide which of its tasks runs. A container with weight 200 competing against one with weight 100 receives roughly two thirds of the contended CPU, and the arithmetic is the same weighted-round-robin arithmetic scaled up a level. Two properties surprise people. First, shares are relative and only bind under contention, so an unconstrained container will happily use the whole machine when nothing else is runnable - shares are not caps. Second, if you do want a cap, cpu.max expresses a quota per period, and enforcing it means the group is forcibly descheduled once it exhausts the quota within a period, which appears in application metrics as periodic multi-millisecond stalls. Diagnosing 'my container is slow but CPU usage is only 40%' almost always ends at throttling statistics, because the average hides the fact that the work was concentrated and then cut off."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapters 7 and 9 (Scheduling, Proportional Share)",
        insight: "Derives the quantum tradeoff quantitatively and then builds lottery and stride scheduling as the bridge from round robin to weighted fair sharing."
      },
      {
        source: "paper",
        attribution: "Waldspurger and Weihl - Lottery Scheduling: Flexible Proportional-Share Resource Management (OSDI 1994)",
        insight: "The clearest original argument for treating scheduling as proportional resource allocation rather than as ordering, which is the idea cgroup shares implement today."
      },
      {
        source: "note",
        attribution: "Linux manual pages - sched(7) and sched_rr_get_interval(2); /proc/sys/kernel/sched_* tunables",
        insight: "Shows exactly which knobs exist in production and confirms that the effective slice is derived from load rather than fixed."
      }
    ]
  },
  {
    id: "topic-os-priority-and-mlfq",
    moduleId: "mod-os-cpu-scheduling",
    title: "Priority Scheduling, Starvation, and Multi-Level Feedback Queues",
    intuition:
      "Priority scheduling says: run the most important runnable task. That is obviously right and immediately creates two problems. First, low-priority tasks can starve forever if high-priority work never stops arriving. Second, somebody has to assign the priorities, and neither users nor programs can be trusted to do it honestly. The multi-level feedback queue solves both at once with a genuinely elegant move - it assigns priority by observing behaviour rather than by asking, and it periodically resets everything to prevent starvation. MLFQ is the single most important classical algorithm in this module because it is the ancestor of every practical interactive scheduler.",
    complexity: {
      time:
        "With a fixed number of priority levels, selection is O(1): keep a bitmap of non-empty queues and find the highest set bit with a single instruction. Within a level, round robin is O(1) as well. This is why priority-array schedulers were attractive - the decision cost is independent of the number of runnable tasks.",
      space:
        "One queue per priority level plus per-task bookkeeping: current level, accumulated runtime at that level, and time of last boost. Linux's older O(1) scheduler used 140 levels with two arrays per CPU, which is a few kilobytes of pointers regardless of how many tasks exist."
    },
    lesson: [
      {
        title: "Static Priority and Its Failure Mode",
        content:
          "In a static priority scheme every task carries a fixed number and the scheduler always runs the highest-priority runnable task, using round robin among equals. It is simple, it is O(1) with a bitmap, and it is exactly right for real-time systems where importance genuinely is known in advance and where a rate-monotonic analysis can prove the deadlines are met. On a general-purpose system it fails in two ways. Starvation is the obvious one: a low-priority task runs only when nothing above it is ready, so on a busy machine it may never run at all - the folklore example being an MIT IBM 7094 shut down in 1973 with a job from 1967 still queued. The subtler failure is that static priorities do not know what a task is doing, so an interactive task that was assigned a low priority stays sluggish, and a CPU-bound task assigned a high one hogs the machine even though it would barely notice being deprioritised.",
        diagram: asciiDiagram(`Static priority: correct, and starving

  prio 90 ┃ ████ real-time audio        runs whenever ready
  prio 80 ┃ ██   network softirq work   runs whenever audio is not
  prio 50 ┃ ███████████ web workers     runs when nothing above is ready
  prio 20 ┃ ▒▒▒▒▒▒▒▒▒▒ batch analytics  starving
  prio  5 ┃ ░░░░░░░░░░ nightly cleanup  never runs at all
          ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶ time

  Selection rule: highest non-empty level, round robin within it.
  Cost: O(1) via a bitmap of non-empty queues.

  Two fixes, and they are NOT interchangeable:
    ├── AGING       raise priority with waiting time
    │                 ▶ bounds starvation, keeps the priority concept
    └── BOOSTING    periodically reset everyone to the top
                      ▶ simpler, also re-classifies tasks that changed
                        behaviour (batch phase ▶ interactive phase)`)
      },
      {
        title: "Aging: The Minimal Fix",
        content:
          "Aging increases the effective priority of a task in proportion to how long it has been waiting, so any task eventually becomes the highest-priority one and runs. It preserves the meaning of the assigned priority in the common case while placing a bound on the worst case, and the bound is tunable: if priority rises one level per second and there are 100 levels, no task waits more than about 100 seconds. Once the task runs, its effective priority resets to its base value. Aging is cheap, easy to reason about, and appears in many production systems well beyond CPU scheduling - request queues, lock acquisition, and job schedulers all use it. Its limitation is that it only addresses starvation; it does nothing about the second problem, which is that the base priorities may simply be wrong because nobody could correctly predict which tasks would turn out to be interactive.",
        codeExample: `// Aging in a fixed-priority scheduler, in the shape it usually ships.

typedef struct {
    int base_prio;        // administrator- or user-assigned
    int eff_prio;         // what the scheduler actually compares
    long waiting_ticks;   // time spent ready but not running
} Task;

// Called on every scheduler tick, for every READY (not running) task.
void age(Task *t) {
    t->waiting_ticks++;
    if (t->waiting_ticks % AGING_INTERVAL == 0 && t->eff_prio < MAX_PRIO)
        t->eff_prio++;                   // creep upward
}

// Called when the task is dispatched.
void on_dispatch(Task *t) {
    t->eff_prio      = t->base_prio;     // pay out and reset
    t->waiting_ticks = 0;
}

/* Worst-case wait is now bounded:
     (MAX_PRIO - base_prio) * AGING_INTERVAL ticks
   Choose AGING_INTERVAL to trade responsiveness for priority fidelity:
     small -> priorities barely matter, everything converges to fair
     large -> priorities matter, but the starvation bound is loose. */`
      },
      {
        title: "MLFQ: Learning Priority From Behaviour",
        content:
          "The multi-level feedback queue keeps several priority levels, each with its own quantum, and moves tasks between them based on observed behaviour. The rules are short enough to memorise. If two tasks are at different levels, the higher one runs. If they are at the same level, they take turns via round robin. Every new task enters at the highest priority - an optimistic assumption that it is interactive. If a task uses up its entire allotment at a level, it is demoted one level and given a longer quantum. And periodically, every task is boosted back to the top. Those five rules produce something remarkable: the scheduler approximates shortest-job-first without ever knowing a burst length, because tasks that block quickly stay near the top and tasks that grind sink to the bottom where they get long, cache-friendly slices. It also self-corrects when a task changes phase, since the periodic boost re-tests every assumption.",
        diagram: asciiDiagram(`MLFQ: five rules, drawn

  Q3 (highest, quantum 8 ms)   ◀── new arrivals enter HERE
       ├── interactive shell    blocks after 1 ms ──▶ stays at Q3
       └── editor               blocks after 2 ms ──▶ stays at Q3
              │
              │ used the full quantum? ──▶ demote
              ▼
  Q2 (quantum 16 ms)
       └── request handler      mixed behaviour, drifts between levels
              │
              ▼ used full quantum again
  Q1 (quantum 32 ms)
       └── compiler
              │
              ▼
  Q0 (lowest, quantum 64 ms)
       └── video encode         pure CPU work, long warm slices

              ▲
              ┃  every S ms: BOOST — everyone returns to Q3
              ┃  ├── prevents starvation of Q0
              ┗━━┴── re-classifies tasks whose behaviour changed

  Rule 1: higher level wins.       Rule 4: full allotment ▶ demote.
  Rule 2: same level ▶ round robin. Rule 5: periodic boost to top.
  Rule 3: enter at the top.`)
      },
      {
        title: "Gaming MLFQ and How Real Systems Prevent It",
        content:
          "The naive rule 'demote a task that uses its entire quantum' is exploitable. A task that issues a pointless I/O operation just before its quantum expires never gets demoted, so it keeps the highest priority while consuming almost all of the CPU. This was a real attack on early time-sharing systems and it is a favourite interview follow-up. The fix is to account for total allotment at a level rather than for a single uninterrupted slice: track cumulative CPU time consumed at the current priority, and demote once that budget is exhausted no matter how many times the task voluntarily yielded. A second, complementary defence is the periodic boost, which bounds how long any task can be held down and simultaneously bounds how long a cheater's advantage persists. Being able to state the attack and both defences is the difference between having read about MLFQ and having understood it.",
        codeExample: `// The gaming attack and the accounting fix.

// ATTACK: yield just before the quantum expires, forever stay at top.
void malicious_worker(void) {
    for (;;) {
        compute_for(QUANTUM_MS - 1);   // burn 99% of the slice
        usleep(1);                     // token yield: "I am interactive!"
    }                                  // naive MLFQ: never demoted
}

// NAIVE RULE (broken):
if (used_entire_slice_uninterrupted) demote(t);

// FIXED RULE: budget per level, not per slice.
typedef struct { int level; long allotment_used_us; } Task;

void on_tick(Task *t, long ran_us) {
    t->allotment_used_us += ran_us;                 // counts partial slices
    if (t->allotment_used_us >= ALLOTMENT[t->level]) {
        demote(t);
        t->allotment_used_us = 0;
    }
}

void periodic_boost(Task *all, int n) {             // every S milliseconds
    for (int i = 0; i < n; i++) {
        all[i].level = TOP_LEVEL;                   // no starvation
        all[i].allotment_used_us = 0;               // and re-classify
    }
}`
      },
      {
        title: "Tuning MLFQ and Its Descendants",
        content:
          "MLFQ has three parameter families and each has a characteristic failure when set badly. The number of levels controls how finely tasks are classified; too few and interactive and batch work are lumped together, too many and tasks spend their lives migrating. The per-level quanta should grow as priority falls, because low-priority tasks are the CPU-bound ones that benefit most from long, cache-warm slices and care least about latency. The boost period S is the most delicate: too short and MLFQ collapses toward round robin because nothing stays demoted long enough to matter, too long and low-priority tasks visibly stall between boosts. The historical answer is 'voodoo constants', and the modern answer is to stop tuning them - Linux replaced its MLFQ-style O(1) scheduler with CFS in 2007 precisely because the heuristics were unmaintainable, replacing dozens of tunables with a single fairness invariant. Windows and macOS still use MLFQ-derived designs with dynamic priority boosts on I/O completion and on foreground focus.",
        diagram: asciiDiagram(`Parameter ──▶ failure mode when wrong

  NUMBER OF LEVELS
     too few  ──▶ interactive and batch share a level, no separation
     too many ──▶ tasks migrate constantly, classification never settles
     typical  ──▶ 3-8 in teaching designs; Windows uses 32, Linux O(1) 140

  QUANTUM PER LEVEL  (must GROW as priority falls)
     equal everywhere ──▶ CPU-bound tasks preempted constantly,
                          cache never warms, throughput collapses
     correct          ──▶ Q3: 8 ms │ Q2: 16 ms │ Q1: 32 ms │ Q0: 64 ms

  BOOST PERIOD S
     too small ──▶ everything is always at the top ▶ plain round robin
     too large ──▶ Q0 tasks visibly stall for seconds between boosts
     typical   ──▶ tens to hundreds of milliseconds

  The tuning burden is the reason CFS exists:
     MLFQ  ▶ many heuristics, each with a workload that defeats it
     CFS   ▶ one invariant (equal virtual runtime), weights as the
             only knob ──▶ far fewer pathological cases to patch`)
      }
    ],
    examples: [
      {
        title: "Interactive task classified automatically",
        input:
          "A text editor and a video encoder start at the same time with no priority hints from the user.",
        output: "The editor settles at the top level and the encoder sinks to the bottom.",
        explanation:
          "Step 1: Both enter at the highest priority under rule 3, so the editor is responsive immediately.\nStep 2: The encoder consumes its entire allotment at every level and is demoted repeatedly until it reaches the bottom.\nStep 3: The editor blocks on keyboard input after a fraction of a millisecond, so it never exhausts an allotment and never demotes.\nStep 4: The result is correct classification with no user input and no burst prediction - and the encoder is barely harmed, since it gets long slices whenever the editor sleeps."
      },
      {
        title: "Phase change caught by the boost",
        input:
          "A build tool spends ten minutes compiling and then becomes an interactive test runner waiting on user input.",
        output: "The periodic boost lifts it back to the top and it stays there.",
        explanation:
          "Step 1: During compilation it is demoted to the lowest level, which is correct for that phase.\nStep 2: Without a boost, its now-interactive phase would be served from the bottom queue and feel sluggish.\nStep 3: At the next boost it returns to the top level along with everyone else.\nStep 4: Because it now blocks quickly, it no longer exhausts its allotment and remains at the top - so the boost is not just an anti-starvation device, it is the re-classification mechanism."
      },
      {
        title: "Gaming detected in production",
        input:
          "A tenant's process maintains near-100% CPU usage while staying at the highest priority level, starving other tenants.",
        output: "It is yielding just before each quantum expires; switch to allotment accounting.",
        explanation:
          "Step 1: Confirm the pattern by comparing voluntary switch counts against CPU time - a genuinely interactive task has high switches and low CPU.\nStep 2: Recognise the classic attack: a token sleep before the quantum boundary defeats per-slice demotion.\nStep 3: Change the rule to accumulate CPU used at the level and demote when the cumulative budget is spent, which no amount of yielding can avoid.\nStep 4: Additionally cap the tenant with a cgroup quota, since scheduler heuristics should not be the only defence against a hostile workload."
      }
    ],
    tips: [
      "Recite the five MLFQ rules in order; the structure of the answer is itself part of what is being graded.",
      "Say explicitly that MLFQ approximates SJF without knowing burst lengths - that sentence is the whole insight.",
      "Distinguish aging from boosting: aging is gradual and preserves priority meaning, boosting is periodic and also re-classifies."
    ],
    tricks: [
      "Expect the gaming follow-up and pre-empt it: mention the yield-before-quantum attack and the allotment-accounting fix before being asked.",
      "Quanta must grow as priority falls; if you say they shrink, you have inverted the entire design and it is immediately obvious.",
      "If asked why Linux abandoned this design, answer 'unmaintainable heuristics' and pivot to CFS's single fairness invariant."
    ],
    memoryAids: [
      "MLFQ judges you by your behaviour, not by your claims.",
      "Enter at the top, sink if you are greedy, everyone rises again at boost time.",
      "High priority means short quantum and fast response; low priority means long quantum and warm caches."
    ],
    interviewPatterns: [
      "Structured recall: 'Explain multi-level feedback queues' - give the rules, then the properties they produce.",
      "Attack-and-defence: 'How would a process game this scheduler?' - token yielding, fixed by per-level allotment accounting.",
      "Frequency and companies: Tier 1 in OS-heavy interviews and a standard follow-up after any starvation question; near-universal in graduate-level screens."
    ],
    practiceProblems: [
      "Why does MLFQ give longer quanta to lower-priority queues rather than shorter ones? Answer: Low-priority tasks are the CPU-bound ones, identified precisely because they used their whole allotment. They gain most from long slices - fewer switches, warmer caches - and lose least, because nobody is waiting on their response time. Short quanta at the bottom would maximise overhead for exactly the tasks that benefit from it least.",
      "A system uses MLFQ with a boost period of 10 seconds and users report the machine 'stutters' every 10 seconds. Diagnose it. Answer: At each boost every CPU-bound task returns to the top level and competes with interactive tasks until it is demoted again. Shorten the boost period, or boost tasks individually based on how long they have waited rather than resetting everyone simultaneously, which spreads the disruption out.",
      "Describe how you would prevent a low-priority task from starving without using boosting or aging. Answer: Give every level a guaranteed minimum share of CPU rather than strict precedence - for example, reserve 5% of each scheduling period for the lowest queue. This converts strict priority into proportional share with a floor, which is essentially what cgroup weights and Linux's sched_rt_runtime_us reservation do."
    ],
    faq: [
      {
        question: "What is the difference between aging and priority boosting?",
        answer:
          "Aging raises a task's effective priority gradually and individually, in proportion to how long that particular task has been waiting, and the increase is undone once the task runs. Boosting resets every task to the highest priority simultaneously at fixed intervals. Aging is the more surgical instrument: it bounds starvation while preserving the relative meaning of the assigned priorities in the common case, and it disturbs nothing when the system is not congested. Boosting is blunter but does something aging cannot - it re-tests the scheduler's classification of every task, so a process that has changed phase from CPU-bound to interactive is discovered promptly rather than remaining stuck at the bottom. That is why MLFQ specifically wants boosting rather than aging: in MLFQ the priority is not an assignment to be preserved, it is an inference to be revisited. Some systems use both, aging within a level and boosting across levels."
      },
      {
        question: "Is nice value the same as priority?",
        answer:
          "Related but not identical, and conflating them causes real confusion. On Linux, nice is a user-facing hint ranging from -20 to +19 that applies to normal SCHED_OTHER tasks, and it is translated into a scheduling weight through a lookup table where each step of one corresponds to roughly a 25% change in weight - so nice 0 has weight 1024 and nice 5 has weight 335, roughly a threefold difference in contended CPU share. Crucially, in CFS this weight determines a proportion of CPU, not an absolute precedence, so a nice +19 task still runs, just slowly; it is not starved. Real-time priorities are a completely separate axis, ranging from 1 to 99 under SCHED_FIFO and SCHED_RR, and those are strict precedence - any runnable real-time task preempts every normal task regardless of nice values. The practical implication is that renicing cannot fix a latency problem caused by real-time interference, and that only a privileged process may lower its nice value below zero."
      },
      {
        question: "Why did Linux move away from its MLFQ-style scheduler?",
        answer:
          "The O(1) scheduler used 140 priority levels with active and expired arrays and a set of heuristics that estimated interactivity from sleep time in order to grant priority bonuses. It was fast and it worked well for the workloads it was tuned against, but the interactivity estimator was a collection of empirical constants, and every few months someone found a workload that it misclassified - a task that slept in an unusual pattern and was wrongly treated as interactive, or a genuinely interactive task that was penalised. Each fix added another special case, and the heuristics became mutually entangled. CFS replaced the entire estimator with one invariant: track how much CPU each task has received, weighted by its priority, and always run whoever is furthest behind. Interactivity then needs no detection at all, because a task that sleeps stops accumulating virtual runtime and is automatically owed time when it wakes. The result was dramatically fewer pathological cases and a scheduler that could be reasoned about rather than tuned."
      },
      {
        question: "Do Windows and macOS use multi-level feedback queues?",
        answer:
          "Yes, both use designs recognisably descended from MLFQ, which is a useful counterweight to the impression that CFS made the approach obsolete. Windows maintains 32 priority levels split into a real-time range and a variable range, and it applies dynamic boosts: a thread receives a priority increase when an I/O operation completes, when it acquires a resource it had been waiting on, and when its window has foreground focus, with the boost decaying by one level each time the thread is scheduled until it returns to its base. It also has an explicit anti-starvation mechanism that periodically promotes threads that have been ready for several seconds. macOS derives from Mach and similarly adjusts thread priority based on recent CPU usage, decaying the priority of threads that consume a lot. The common structure - a base priority, a behaviour-derived adjustment, and an anti-starvation escape hatch - is exactly MLFQ's, which is why the algorithm remains worth knowing in detail even though Linux went another way."
      },
      {
        question: "How does MLFQ handle a task that is neither clearly interactive nor clearly batch?",
        answer:
          "It lets the task find an equilibrium level, which is one of the design's quieter strengths. A request handler that performs a few milliseconds of computation and then waits on a database will exhaust its allotment at the top level and be demoted, but at the next level the longer allotment may exceed its typical burst, so it stops being demoted and stabilises there. That equilibrium level is a reasonable encoding of 'moderately CPU-hungry but latency-sensitive', which is precisely what such a task is - and the scheduler arrived at it without any classification logic beyond the demotion rule. If the task's mix shifts, it drifts to a different level automatically, and the periodic boost guarantees it re-explores the top rather than being trapped by a stale inference. The main weakness in this region is oscillation: a task sitting exactly at a boundary can bounce between two levels, which adds switching without changing service much, and mitigations such as hysteresis in the demotion threshold exist for that reason."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Arpaci-Dusseau - Operating Systems: Three Easy Pieces, chapter 8 (Multi-Level Feedback Queue) - https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf",
        insight: "Builds MLFQ rule by rule, each one introduced to repair a demonstrated failure of the previous set - including the gaming attack and the allotment fix."
      },
      {
        source: "book",
        attribution: "Russinovich, Solomon, Ionescu - Windows Internals, chapter on Thread Scheduling",
        insight: "Documents a shipped MLFQ descendant in detail: priority boosts on I/O completion, foreground focus, and the anti-starvation promotion mechanism."
      },
      {
        source: "paper",
        attribution: "Corbato, Merwin-Daggett, Daley - An Experimental Time-Sharing System (1962)",
        insight: "The original multi-level feedback design, which established the idea of inferring a job's character from its observed CPU consumption rather than from a declaration."
      }
    ]
  },
  {
    id: "topic-os-cfs-and-realtime",
    moduleId: "mod-os-cpu-scheduling",
    title: "Real Schedulers: Linux CFS, Real-Time Policies, and Multicore",
    intuition:
      "Linux's Completely Fair Scheduler replaces a pile of interactivity heuristics with one invariant: every runnable task should have received CPU time proportional to its weight, so always run whoever is furthest behind. Tracking 'furthest behind' as virtual runtime makes interactivity detection unnecessary - a sleeping task stops accumulating, so it is automatically owed time on wakeup. Above CFS sit the real-time classes, which are strict precedence rather than proportional share, because some work is not negotiable. And underneath all of it sits the multicore reality: per-CPU run queues, load balancing, and cache affinity, which frequently matter more to observed latency than the policy does.",
    complexity: {
      time:
        "CFS selects the leftmost node of a red-black tree keyed by virtual runtime, which is O(1) because the leftmost node is cached, with O(log n) insertion when a task is enqueued or re-queued. Load balancing across CPUs runs periodically and on idle, and its cost scales with the scheduling-domain hierarchy rather than with the task count.",
      space:
        "One red-black tree per CPU run queue plus a sched_entity per task holding virtual runtime, weight, and load-tracking averages. Group scheduling nests entities, so a cgroup hierarchy adds one scheduling entity per group per CPU - real but modest, and the reason deep cgroup nesting has measurable overhead."
    },
    lesson: [
      {
        title: "Virtual Runtime: One Number Replaces Every Heuristic",
        content:
          "Each task accumulates virtual runtime as it executes, advancing at a rate inversely proportional to its weight: a task with the default nice 0 weight of 1024 accrues one nanosecond of virtual runtime per nanosecond of real execution, while a lower-weight task accrues faster and a higher-weight task slower. The scheduler always runs the task with the smallest virtual runtime, so the tasks that have been served least go first, and over time all runnable tasks converge toward equal weighted service. Interactivity falls out for free: a task that sleeps does not accumulate anything, so when it wakes it is behind everyone and runs immediately. To stop a task that slept for an hour from monopolising the CPU on return, CFS clamps a waking task's virtual runtime to no less than the run queue's minimum minus a threshold, which grants promptness without granting unlimited credit.",
        diagram: asciiDiagram(`CFS: pick the leftmost node of a red-black tree

  Key = vruntime (nanoseconds of weighted service received)

                       [ 4200 ]
                      /        \\
              [ 2100 ]          [ 6800 ]
             /       \\               \\
     [ 1500 ]         [ 3300 ]        [ 9100 ]
        ▲
        └── leftmost = smallest vruntime = runs NEXT
            (cached in rq->cfs.rb_leftmost ──▶ O(1) pick)

  Accumulation rule while running:
     vruntime += delta_exec * (NICE_0_WEIGHT / weight)

     nice   0  weight 1024 ──▶ vruntime advances at 1.00x real time
     nice  +5  weight  335 ──▶ advances at 3.06x  (falls behind slower,
                               so it is chosen less often ▶ less CPU)
     nice  -5  weight 3121 ──▶ advances at 0.33x  ▶ more CPU

  Sleeping task: vruntime FROZEN ──▶ wakes up "owed" ──▶ runs promptly.
  Clamp on wake: vruntime = max(own, min_vruntime - sched_latency)
                 ──▶ prompt, but not unlimited credit.`)
      },
      {
        title: "There Is No Fixed Time Slice",
        content:
          "CFS does not hand out a quantum in the round-robin sense. Instead it defines a target latency - the period within which every runnable task should get a turn, roughly 6 to 24 milliseconds depending on core count - and each task's share of that period is its weight divided by the total weight of runnable tasks. With four equal tasks and a 24 millisecond target, each gets 6 milliseconds. With 24 equal tasks each would get 1 millisecond, which would be mostly switching overhead, so a minimum granularity floor kicks in and the effective period stretches instead. Preemption is checked at each tick and on wakeup: a waking task preempts the running one only if it is behind by more than the wakeup granularity, a hysteresis that prevents two tasks with nearly equal virtual runtime from ping-ponging. These three tunables - target latency, minimum granularity, and wakeup granularity - are essentially the entire CFS control surface, which is a dramatic reduction from the O(1) scheduler's heuristics.",
        codeExample: `# CFS in production: the knobs and what they do.

sysctl kernel.sched_latency_ns            # 24000000 = 24 ms target period
sysctl kernel.sched_min_granularity_ns    #  3000000 =  3 ms slice floor
sysctl kernel.sched_wakeup_granularity_ns #  4000000 = preempt hysteresis

# Effective slice for one task:
#   slice = max(latency * weight_i / total_weight, min_granularity)
# Above (latency / min_granularity) runnable tasks, the period stretches:
#   nr_running > 8  ->  period = nr_running * min_granularity

# Observe it directly:
cat /proc/sched_debug | head -40      # per-CPU runqueues, min_vruntime
cat /proc/<pid>/sched                 # se.vruntime, se.sum_exec_runtime,
                                      # nr_switches, wait_sum, wait_max

# wait_max is the single most useful field here: the longest this task
# ever sat runnable without running. If p99 latency is bad and wait_max
# is large, the problem is scheduling contention, not your code.

# Weighted share between two cgroups (cgroup v2):
echo 200 > /sys/fs/cgroup/svc-a/cpu.weight   # 2:1 against...
echo 100 > /sys/fs/cgroup/svc-b/cpu.weight
# Hard cap instead of a weight (quota per period):
echo "50000 100000" > /sys/fs/cgroup/svc-b/cpu.max   # 50% of one CPU`
      },
      {
        title: "Real-Time Classes Sit Above CFS",
        content:
          "Linux runs a strict hierarchy of scheduling classes. SCHED_DEADLINE is checked first, then the fixed-priority real-time policies SCHED_FIFO and SCHED_RR, then CFS handles SCHED_OTHER, SCHED_BATCH, and SCHED_IDLE. Any runnable real-time task preempts every normal task on that CPU regardless of nice values, which is exactly what makes hard deadlines possible and exactly what makes real-time policies dangerous. SCHED_DEADLINE is the most principled of the three: each task declares a runtime, a deadline, and a period, the kernel performs an admission test and refuses to accept a task set it cannot guarantee, and it then schedules by earliest deadline first. Because a runaway FIFO task at high priority would otherwise lock out the shell and every other task on its CPU, the kernel reserves a fraction of each period for non-real-time work by default, configurable via sched_rt_runtime_us.",
        codeExample: `#include <sched.h>
#include <linux/sched/types.h>
#include <sys/syscall.h>

// Fixed-priority real time: simple, no guarantees beyond precedence.
struct sched_param p = { .sched_priority = 80 };
sched_setscheduler(0, SCHED_FIFO, &p);   // needs CAP_SYS_NICE

// SCHED_DEADLINE: declare the contract, kernel admits or refuses.
struct sched_attr attr = {
    .size           = sizeof(attr),
    .sched_policy   = SCHED_DEADLINE,
    .sched_runtime  =  10 * 1000 * 1000,   // 10 ms of CPU...
    .sched_deadline =  30 * 1000 * 1000,   // ...must finish within 30 ms...
    .sched_period   = 100 * 1000 * 1000,   // ...every 100 ms period.
};
if (syscall(SYS_sched_setattr, 0, &attr, 0) < 0)
    perror("sched_setattr");   // EBUSY = admission test FAILED:
                               // the CPU cannot guarantee this task set.

/* Why DEADLINE beats FIFO for periodic work:
     FIFO     - you choose a number; nothing checks feasibility;
                priority inversion and overrun are your problem.
     DEADLINE - the kernel verifies total utilisation <= capacity and
                enforces the runtime budget, so one task overrunning
                cannot consume another's guaranteed allocation. */

// Safety valve that keeps a runaway RT task from freezing the box:
//   /proc/sys/kernel/sched_rt_period_us   = 1000000  (1 s)
//   /proc/sys/kernel/sched_rt_runtime_us  =  950000  (95% max for RT)`
      },
      {
        title: "Multicore: Per-CPU Queues, Balancing, and Affinity",
        content:
          "On a multicore machine each CPU has its own run queue, because a single global queue would put a contended lock and a shared cache line in the path of every scheduling decision. The cost of that choice is that queues drift out of balance, so the kernel periodically migrates tasks, guided by a scheduling-domain hierarchy that mirrors the hardware: sibling hyperthreads share the most, cores on one package share a last-level cache, and NUMA nodes have distinct memory latencies. Balancing is deliberately reluctant at the higher levels because migrating a task discards its warm cache and, across NUMA nodes, leaves its memory on the wrong node entirely. On wakeup the scheduler prefers a CPU that is idle and shares a cache with the task's previous CPU. Applications can override all of this with sched_setaffinity or cpusets, which is standard practice for latency-critical services, and the usual reason to do so is not raw speed but predictability.",
        diagram: asciiDiagram(`Scheduling domains mirror the cache hierarchy

  NUMA node 0                          NUMA node 1
  ┌───────────────────────────┐        ┌───────────────────────────┐
  │ Package (shared L3)       │        │ Package (shared L3)       │
  │  ┌─────────┐ ┌─────────┐  │        │  ┌─────────┐ ┌─────────┐  │
  │  │ Core 0  │ │ Core 1  │  │        │  │ Core 2  │ │ Core 3  │  │
  │  │ HT0 HT1 │ │ HT0 HT1 │  │        │  │ HT0 HT1 │ │ HT0 HT1 │  │
  │  │ L1 L2   │ │ L1 L2   │  │        │  │ L1 L2   │ │ L1 L2   │  │
  │  └─────────┘ └─────────┘  │        │  └─────────┘ └─────────┘  │
  │        local DRAM         │◀──────▶│        local DRAM         │
  └───────────────────────────┘  slow  └───────────────────────────┘

  Migration cost, cheapest ──▶ most expensive:
     between hyperthread siblings   L1 still warm        ~free
     between cores in a package     L3 still warm        cheap
     between packages, same node    L3 cold              moderate
     across NUMA nodes              memory is REMOTE     expensive
                                    and stays remote until reclaimed

  ──▶ the balancer tries hard within a domain and reluctantly across
      domains. Wakeup placement prefers "idle AND cache-sharing".

  Pinning for predictability:
     taskset -c 4-7 ./service           # restrict to cores 4-7
     numactl --cpunodebind=1 --membind=1 ./service   # CPU + memory together`)
      },
      {
        title: "Diagnosing Scheduling Problems in Production",
        content:
          "Scheduling issues have a recognisable signature and a standard toolchain. Start by separating waiting from running: /proc/<pid>/sched exposes wait_sum and wait_max, which say how long the task sat runnable without a CPU, and a large wait_max alongside poor tail latency points at contention rather than at your code. Run-queue depth from vmstat's r column tells you whether the machine is oversubscribed. The voluntary versus involuntary switch split from pidstat -w distinguishes a task that is blocking from one that is being preempted. For containers, always check cgroup throttling statistics, because a service can show 40% average CPU while being cut off repeatedly at period boundaries. And perf sched latency attributes delay to specific tasks and identifies who preempted whom. The most common real-world causes, in rough order, are cgroup quota throttling, oversubscription, real-time interference, and NUMA-remote memory access after an unlucky migration.",
        diagram: asciiDiagram(`Latency triage: is the scheduler the problem?

  p99 latency is bad
        │
        ├── /proc/<pid>/sched: wait_max large?
        │        ├── No  ──▶ not scheduling. Look at locks, I/O, GC.
        │        └── Yes ──▶ the task was ready but not running
        │                          │
        │      ┌───────────────────┼────────────────────┐
        │      ▼                   ▼                    ▼
        │  vmstat r >> cores   cgroup throttled    RT class active
        │  ──▶ oversubscribed  ──▶ nr_throttled    ──▶ chrt -p to
        │      reduce threads      rising in            confirm; RT
        │      or add cores        cpu.stat            preempts you
        │                          raise cpu.max        unconditionally
        │
        └── Also check: migrations across NUMA nodes
                 numastat -p <pid>  ──▶ high numa_miss = remote memory
                 fix with numactl --cpunodebind + --membind, or cpusets

  Golden signals, in order of how often they are the answer:
     1. cgroup quota throttling  (containers: by far the most common)
     2. oversubscription         (threads >> cores)
     3. real-time interference   (an RT task on your CPU)
     4. NUMA-remote memory       (migrated away from its pages)`)
      }
    ],
    examples: [
      {
        title: "Why nice -19 does not double throughput",
        input:
          "An engineer renices a service to -19 expecting it to run twice as fast, and sees almost no change.",
        output: "Weights only bind under contention, and the service was not CPU-starved.",
        explanation:
          "Step 1: CFS weights determine proportional share among runnable tasks; if the CPU is not saturated, every runnable task runs anyway.\nStep 2: Check wait_max in /proc/<pid>/sched - if it is small, the task was never waiting for a CPU.\nStep 3: The real bottleneck is therefore elsewhere: I/O, locks, or a downstream service.\nStep 4: Renicing is the right tool only when run-queue depth exceeds core count, and even then it buys share, not speed."
      },
      {
        title: "Container throttling masquerading as slow code",
        input:
          "A container with cpu.max set to 50% of one CPU shows 40% average CPU usage yet has 300 ms p99 spikes.",
        output: "Quota exhaustion within each 100 ms period, not slow code.",
        explanation:
          "Step 1: Read nr_throttled and throttled_usec from cpu.stat and confirm they are climbing.\nStep 2: Understand the mechanism - the group burns its 50 ms of quota in the first 40 ms of the period and is then descheduled for the remaining 60 ms.\nStep 3: The average looks fine precisely because the idle time at the end of each period is counted in the average.\nStep 4: Fix by raising the quota, shortening the period, or reducing thread count so the work spreads more evenly rather than being consumed in a burst."
      },
      {
        title: "A real-time task freezing a machine",
        input:
          "A SCHED_FIFO priority 90 thread enters a spin loop after a bug, and the machine becomes unresponsive on that CPU.",
        output: "Strict precedence means nothing below it runs; the RT bandwidth reservation is the only escape.",
        explanation:
          "Step 1: Real-time classes are checked before CFS, so no normal task on that CPU can preempt the spinner.\nStep 2: Without the kernel's default reservation the CPU would be permanently unavailable, including to the shell.\nStep 3: sched_rt_runtime_us caps real-time usage at 95% of each second, which is exactly enough to log in and kill it.\nStep 4: The durable fix is SCHED_DEADLINE, where the kernel enforces a runtime budget per period so an overrunning task is throttled automatically instead of relying on a global safety valve."
      }
    ],
    tips: [
      "Lead with the invariant - 'always run the task with the smallest weighted service received' - before mentioning red-black trees, which are an implementation detail.",
      "State that CFS has no fixed quantum and derives a slice from target latency divided by load; it is the fact that most candidates get wrong.",
      "Say that real-time classes are strict precedence above CFS, and mention the bandwidth reservation that stops a runaway RT task from freezing the machine."
    ],
    tricks: [
      "Interactivity needs no detection in CFS: sleeping freezes virtual runtime, so waking tasks are automatically owed time - that one sentence explains why CFS replaced the heuristics.",
      "For container latency problems, check cgroup throttling statistics before anything else; it is the single most common cause and it hides completely in average CPU metrics.",
      "wait_max in /proc/<pid>/sched is the fastest way to prove or disprove that the scheduler is responsible for a latency problem."
    ],
    memoryAids: [
      "CFS runs whoever is owed the most; weight decides how fast your debt grows.",
      "Class order: DEADLINE, then FIFO/RR, then CFS, then IDLE - importance descends, share replaces precedence at the CFS boundary.",
      "Migration is a cache eviction with extra steps; across NUMA it is a memory relocation you did not ask for."
    ],
    interviewPatterns: [
      "Depth probe: 'How does Linux schedule normal tasks?' - virtual runtime, weights, leftmost node, no fixed quantum.",
      "Applied: 'This container is slow but CPU usage is low' - cgroup quota throttling and the period mechanism.",
      "Frequency and companies: Tier 1 for infrastructure, SRE, and performance roles at Google, Meta, Netflix, and trading firms; Tier 2 elsewhere."
    ],
    practiceProblems: [
      "Two tasks run on one CPU, one at nice 0 and one at nice 5. What share does each receive and why? Answer: Weights are 1024 and 335, so roughly 75% and 25%. Virtual runtime advances at real time divided by weight, so the nice 5 task's clock runs about three times faster, and it therefore reaches the leftmost position about a third as often.",
      "Explain why a task waking from a one-hour sleep does not monopolise the CPU under CFS. Answer: On enqueue, CFS clamps the task's virtual runtime to at least min_vruntime minus the target latency. Without the clamp its virtual runtime would be an hour behind and it would run until it caught up; with the clamp it is only slightly behind, so it runs promptly once and then competes normally.",
      "A latency-critical service is pinned to cores 8-15 but still shows sporadic 20 ms stalls. Name three plausible causes. Answer: Interrupt handling and softirqs on those cores, which are not controlled by affinity and need IRQ affinity tuning or isolcpus; a real-time or high-weight task sharing those cores; and memory allocated on a remote NUMA node, so the stalls are memory latency rather than scheduling - check numastat and bind memory with numactl as well as CPUs."
    ],
    faq: [
      {
        question: "Is CFS actually fair?",
        answer:
          "It is fair in a precise and limited sense: over a window, each runnable task receives CPU time proportional to its weight, and no runnable task is starved regardless of its nice value. That is stronger than most schedulers offer and it is achieved without heuristics. But there are three important qualifications. First, fairness is per-CPU, not global - two tasks on different run queues are not directly compared, and correcting imbalance is the load balancer's job, which it does periodically rather than continuously. Second, fairness is measured in CPU time, not in useful work, so a task suffering cache interference from a noisy neighbour gets its fair share of cycles while accomplishing much less with them. Third, fairness across cgroups is hierarchical, so a group with many tasks divides the group's share among them rather than getting more total CPU. Newer work in this area, notably the EEVDF scheduler that has begun replacing the classic CFS logic in recent kernels, tightens the latency guarantee by adding an explicit eligibility and deadline notion rather than relying on virtual runtime ordering alone."
      },
      {
        question: "When should I actually use a real-time policy?",
        answer:
          "Only when missing a deadline is a correctness failure rather than a quality-of-service degradation, and only after you have established that ordinary weights are insufficient. Genuine cases are audio and video processing where a late buffer produces an audible artefact, industrial and robotic control where late output is physically wrong, and high-frequency packet processing where the pipeline must not stall. In those cases prefer SCHED_DEADLINE over SCHED_FIFO, because DEADLINE requires you to declare a runtime, deadline, and period, and the kernel performs an admission test that refuses a task set it cannot guarantee - which converts a silent overload into an explicit error at configuration time. If you do use SCHED_FIFO, keep the priority as low as it can be while still above the interfering work, keep the critical section short, lock memory with mlockall to avoid page faults, and never hold a lock that a lower-priority task also takes unless priority inheritance is enabled, or you will construct a priority inversion."
      },
      {
        question: "What is CPU affinity and when does pinning help?",
        answer:
          "Affinity restricts which CPUs a task may run on, set with sched_setaffinity, the taskset command, or cpuset cgroups. Pinning helps in three situations. It preserves cache warmth for a task with a large working set, since the task is never migrated away from the cache that holds its data. It provides isolation when combined with keeping other work off those CPUs, which is how latency-critical services get predictable behaviour - and full isolation usually also requires moving interrupt affinity and, on tuned systems, using isolcpus or the nohz_full option so the timer tick itself stops disturbing the core. And it enables NUMA locality when paired with memory binding, so a thread and the memory it touches stay on the same node. Pinning hurts when it is done carelessly: a pinned task cannot use an idle CPU outside its mask, so a machine can show idle cores while pinned tasks queue. The rule of thumb is that pinning buys predictability at the cost of utilisation, which is a good trade for latency-critical services and a bad one for general throughput work."
      },
      {
        question: "Why is my container slow when CPU usage looks low?",
        answer:
          "Almost always cgroup CPU quota throttling, and the reason it hides is arithmetic. A quota is expressed as an allowance per period - for example 50 milliseconds of CPU every 100 milliseconds. If the container's threads consume that allowance in the first 40 milliseconds, every thread in the group is descheduled for the remaining 60 milliseconds, producing a stall that is invisible in an average because the enforced idleness is averaged in. The problem is worse with many threads, because parallel work burns the quota faster in wall-clock terms, so a service can become slower as you add threads. Diagnose it by reading nr_throttled and throttled_usec from the cgroup's cpu.stat and watching whether they increase. Fixes are to raise the quota, to reduce the thread count so consumption spreads across the period, or to switch from a quota to a weight if a hard ceiling is not genuinely required. This is the single most common production scheduling issue in containerised environments and it is worth naming immediately when the symptom appears."
      },
      {
        question: "How does the load balancer decide to migrate a task?",
        answer:
          "It runs periodically from the scheduler tick and also opportunistically when a CPU is about to go idle, and it works up a hierarchy of scheduling domains that mirrors the hardware topology - hyperthread siblings, cores sharing a last-level cache, packages, and NUMA nodes. At each level it compares the load of the local group against the busiest sibling group, where load is a weighted, time-decayed average of runnable time rather than an instantaneous count, so short spikes do not trigger migrations. If the imbalance exceeds a threshold it pulls tasks from the busiest queue, preferring tasks that are not cache-hot and are permitted by their affinity mask. The imbalance thresholds grow as you move up the hierarchy, encoding the fact that migrating across a NUMA boundary is far more expensive than migrating between hyperthread siblings - the task loses its cache and, worse, its memory stays on the original node and every subsequent access is remote. There is also a separate NUMA balancing mechanism that samples memory access patterns and can migrate pages toward the task rather than the task toward the pages."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Linux kernel documentation - Documentation/scheduler/sched-design-CFS.rst and sched-deadline.rst",
        insight: "Authoritative description of the virtual-runtime invariant, the derived slice, and the deadline admission test, straight from the implementers."
      },
      {
        source: "book",
        attribution: "Gregg - Systems Performance, 2nd edition, chapter 6 (CPUs)",
        insight: "The practical triage methodology: run-queue depth, wait_max, throttling statistics, and NUMA misses, with the tools for each."
      },
      {
        source: "blog",
        attribution: "LWN.net - An EEVDF CPU scheduler for Linux - https://lwn.net/Articles/925371/",
        insight: "Explains what CFS's virtual-runtime ordering cannot guarantee about latency and how the newer eligibility-plus-deadline model fixes it, which is a strong senior-level talking point."
      }
    ]
  }
];
