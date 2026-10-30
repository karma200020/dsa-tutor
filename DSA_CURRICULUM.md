# DSA curriculum contract

The completeness contract is [`data/dsa-coverage-manifest.ts`](data/dsa-coverage-manifest.ts), not a target topic count. It records module, canonical topic ID, priority, scope, current status, initial status, and dedicated prose/implementation evidence. The 103 retained live lessons have a separate explicit inventory in the same file. New teaching covers **69 core concept mappings and 8 specialist mappings in 32 substantial lessons**; several closely related algorithms share a lesson.

Only the assembled datasets in `data/topics/{dsa,lld,hld,ai,os,cpp}.ts` are live curriculum. Backups, unused catalogs and Google cheat-sheet reference exports are not counted as coverage. Initial coverage was checked against lesson bodies, implementations and examples, separately from practice mentions. `variation-only` includes incidental mentions without an actual dedicated explanation/implementation; a matching word in a title, tip, or exercise does not satisfy coverage.

## What changed

The original DSA assembly contained 129 entries: 105 DSA, 11 LLD and 13 HLD. Selection now uses syllabus track ownership, and the 24 foreign entries remain available in their proper LLD/HLD tracks. No LLD/HLD enricher is imported by the DSA assembly.

Two exact duplicate-title pairs were consolidated:

| Retired ID | Stable canonical ID |
|---|---|
| `topic-stack-valid-parentheses` | `topic-strings-valid-parentheses` |
| `topic-monotonic-stack` | `topic-monotonic-stack-mastery` |

Consolidation retains alternate intuitions, bounds, sections, implementations, traces, examples, tips, references, FAQs and every practice entry. Both canonical topics now expose 12 structured variations. The overlapping Two Sum lessons remain distinct introductory, hash-map, sorted-input and multi-sum treatments. Fixed/variable-window and window-mastery lessons, and list-cycle/fast-slow/mastery lessons, also retain their different contracts and authored follow-ups; they were not blindly merged.

Accounting: **129 - 24 foreign - 2 duplicates + 32 authored = 135 DSA topics**. All **630 original structured DSA variations** remain, plus **96 new variations**, for **726**. The original 24 plain-string practice entries belonged to the foreign-track entries; they are retained in LLD/HLD, not deleted. The aggregate live total is **345 unique topics**, versus the inflated original 339 (which counted the 24 foreign topics twice).

## Current inventory

| Track | Modules | Topics |
|---|---:|---:|
| DSA | 19 | 135 (130 core, 5 optional) |
| LLD | 4 | 28 |
| HLD | 4 | 27 |
| AI | 10 | 75 |
| OS | 8 | 40 |
| CPP | 8 | 40 |
| Total | 53 | 345 |

| DSA module ID | Topics |
|---|---:|
| `mod-foundations` | 3 |
| `mod-arrays-strings` | 24 |
| `mod-two-pointers-sliding` | 17 |
| `mod-stack-monotonic` | 12 |
| `mod-binary-search-intervals` | 9 |
| `mod-linked-list` | 10 |
| `mod-trees-bst` | 10 |
| `mod-heaps` | 4 |
| `mod-graphs` | 9 |
| `mod-dynamic-programming` | 9 |
| `mod-greedy-backtracking` | 6 |
| `mod-range-queries` | 3 |
| `mod-tries-strings` | 2 |
| `mod-advanced-graphs` | 4 |
| `mod-advanced-trees` | 2 |
| `mod-advanced-dp` | 2 |
| `mod-bits-math` | 1 |
| `mod-dsa-specialist` | 5 |
| `mod-dsa-mocks` | 3 |

Other module populations, in syllabus order:

| Track | Module suffixes and actual counts (`mod-<track>-` prefix) |
|---|---|
| LLD | oop-foundations 7; core-patterns 7; design-exercises 11; mocks 3 |
| HLD | foundations 11; estimation-tradeoffs 2; design-exercises 11; mocks 3 |
| AI | foundations 8; ml-bridge 7; rag 10; agents-architecture 10; evaluation 7; adaptation-safety 9; llmops 6; estimation-tradeoffs 6; design-exercises 8; mocks 4 |
| OS | processes-and-threads, cpu-scheduling, synchronization, deadlocks, memory-management, virtual-memory-and-paging, file-systems-and-storage, io-and-system-calls: 5 each |
| CPP | fundamentals-and-memory-model, pointers-and-memory-management, raii-and-smart-pointers, move-semantics-and-value-categories, templates-and-generic-programming, stl-containers-and-algorithms, concurrency-and-memory-ordering, modern-cpp-and-interview-patterns: 5 each |

Displayed counts and progress denominators derive from live data. Retained `syllabus.topicCount` declarations are reconciled and audited for drift. Module lists topologically order prerequisites and display their titles; no core module requires a specialist module.

## Authored scope and boundaries

`data/dsa-curriculum/` contains explicit contracts, recognition cues, prerequisites, correctness invariants, traced examples, full C++17 programs, bounds, edge cases, alternatives, three structured code variations and topic-specific FAQs per new lesson. Its helper shares presentation structure only, never teaching prose or fallback algorithms. New lessons bypass generic enrichment. C++ regression fixtures live under `scripts/`, not in client curriculum chunks.

| File | Teaching scope |
|---|---|
| `range.ts` | Fenwick point-delta/range sums; segment point assignment, range assignment/addition and lazy-tag composition; static RMQ, compression and structure decision guide |
| `structures.ts` | Trie; diameter/path sums/height balance; tree codec/reconstruction; list identity/copy; merge-k lists and task cooldown scheduling |
| `sorting-matrix.ts` | Merge/quick/counting/bucket sort, quickselect, stable ordering/comparator pitfalls; rotation, spiral and zero markers |
| `graphs.ts` | DSU; Dijkstra; bipartite/multi-source/clone BFS; Kruskal/Prim; Bellman-Ford/Floyd/0-1 BFS; SCC/cuts; Euler trails |
| `dp.ts` | Knapsack/subset/partition; grid/LCS/palindrome; stock state machines; constraint backtracking/pruning; interval/DAG; subset DP/meet-in-the-middle |
| `trees-strings-math.ts` | Lifting/LCA, tree take/skip DP, Morris; KMP/Z/verified Rabin-Karp; XOR/masks/GCD/sieve/modular powers |
| `avl.ts` | Balanced BST insertion, single/double rotations, height invariants and ordered lookup |
| `specialist.ts` | The bounded optional extensions below |

Specialists are authored and gated, but **not ordinary interview prerequisites**:

| Specialist | Concrete boundary |
|---|---|
| Suffix array/LCP | Comparison-sort doubling O(n log squared n), Kasai O(n); not SA-IS or an online text index |
| Digit DP | Count no-equal-adjacent decimal digits on [0,10^18], including explicit zero/leading-padding semantics |
| Heavy-light decomposition | Static tree, node point replacement and inclusive path sums, O(log squared n) query; not dynamic link/cut |
| Maximum flow | General-capacity Dinic, residual min-cut extraction and matching/vertex-capacity reductions; not min-cost flow |
| Advanced number theory | Extended GCD/inverse, coprime two-modulus CRT and totient, bounded to 10^9; not arbitrary 64-bit factorization or exhaustive number theory |

Fenwick uses one-based internals and zero-based half-open public ranges. Its sums support signed deltas, not arbitrary minimum replacement. The lazy segment tree explicitly composes assignment before subsequent addition and distinguishes assignment-to-zero from no assignment. Both specify overflow assumptions. Rolling hashes verify candidates and disclose their worst-case verification cost. AVL deletion is not claimed.

## Progress and navigation

Previously mastery was in-memory only. It now persists under localStorage key `dsa-tutor-mastery`. `data/topic-migrations.ts` maps retired IDs and merges collisions by the highest mastery level, idempotently. Old deep links redirect to the canonical topic and actual owning track. Unknown saved IDs are excluded after validation against the static `/progress-catalog.json` identity list; errors are visible and do not overwrite malformed saved data.

Restoring progress downloads only identities, not six lesson datasets. Home cards and total counts remain server-derived numbers; track datasets and module/topic viewers remain dynamically imported. Interview readiness uses **340 core topics across all tracks**; the **5 optional specialist topics** have a separate progress count and do not depress ordinary interview readiness.

## Verification

```bash
npm run audit:dsa -- --complete
npm run test:dsa-cpp
npm run audit:generic
npm run verify
npm run verify -- --complete
npx tsc --noEmit
npm run build
```

`verify` runs the existing semantic generic/FAQ/diagram/AI audits plus DSA structure/coverage and actual C++ execution. `--complete` gates **both core and specialist mappings**, as well as AI/OS/CPP module population. The DSA audit checks all-track ownership, unique IDs, reviewed duplicate titles, module counts/population, retained inventory, valid acyclic dependencies, optional/core separation and required authored fields. Detector self-tests remove a required topic, leave only its variation mention, inject a foreign topic, stale a module count, remove a specialist, introduce a cycle/duplicate and demote coverage status; each must fail for the expected reason.

A C++17 compiler is required (`CXX` or `g++`); absence is a hard failure, never a skipped success. All 32 primary implementations execute with undefined-behavior sanitization; all 96 practice snippets compile, and executable usage examples run. Fixed-seed reference checks cover signed Fenwick updates, mixed assignment/add lazy trees, Dijkstra/Floyd/Bellman/0-1 BFS, DSU connectivity, MST agreement, SCC reachability, brute-force cuts, subset/assignment/stock/LCS/palindrome DP, sorting, matrices, AVL invariants, HLD, suffix/LCP, digit counts, totient and max-flow versus enumerated min cuts.

The isolated production build is compared to a clean archive of the same baseline commit and dependency installation. Both report **108 kB first-load JS for `/`** (initial artifact gzip sum: 108,318 baseline bytes versus 108,338 after remediation, a 20-byte difference). A first pass grew to 111 kB from metadata/progress UI, not eager topic imports; loading module/topic viewers lazily removed that regression. Static initial scripts are also checked for absence of actual implementation payloads. Browser checks visit all 32 new lessons, verify their sections/code/variations and expanding FAQs, exercise history and canonical links, and verify persisted alias/collision migration and optional denominators. Build only in an isolated worktree; the primary checkout may have live dev servers.
