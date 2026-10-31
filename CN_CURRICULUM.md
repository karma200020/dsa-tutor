# Computer Networks curriculum

## Delivered scope

The seventh track contains **170 independently authored lessons: 145 core and 25 optional specialists**, across 20 core and four specialist modules. It adds 898 uniquely owned concept mappings, 352 atomic retrieval cards, 349 practice tasks, 27 original ASCII diagrams and 12 labs. Module hour estimates total 121; these are planning estimates, not measured reading times.

The count follows coverage rather than a quota. IPv6 source selection, congestion controllers, performance measurements, security/privacy, application clocks/P2P and difficult radio links received separate leaves instead of overloaded headings. Introductory and advanced contexts can discuss the same idea, but each concept has one canonical owner. Integration cases apply earlier material rather than manufacture new protocol definitions.

| Module | Lessons | Scope |
|---|---:|---|
| Foundations and packet journey | 7 | Core |
| Signals and transmission | 6 | Core |
| Frames, errors and link reliability | 7 | Core |
| Ethernet and switched LANs | 6 | Core |
| Wi-Fi | 5 | Core |
| IPv4 and subnetting | 7 | Core |
| Host configuration | 5 | Core |
| IPv6 and coexistence | 7 | Core |
| Routing and forwarding | 8 | Core |
| Reliable communication principles | 4 | Core |
| UDP, TCP and QUIC | 10 | Core |
| Flow, congestion and performance | 10 | Core |
| DNS | 7 | Core |
| HTTP and browsers | 8 | Core |
| TLS and security | 9 | Core |
| Other applications and media | 10 | Core |
| Sockets and OS | 6 | Core |
| Cloud production | 9 | Core |
| Troubleshooting | 6 | Core |
| End-to-end cases | 8 | Core |
| Enterprise and backbone | 8 | Optional |
| Mobile, IoT and difficult links | 7 | Optional |
| Datacenter and high performance | 6 | Optional |
| Historical and emerging | 4 | Optional |

The complete leaf/title/concept inventory is [data/cn/inventory.json](data/cn/inventory.json). The independent approved-syllabus checklist is [data/cn/approved-scope.ts](data/cn/approved-scope.ts). [data/cn/coverage.ts](data/cn/coverage.ts) joins each concept to its owner, prerequisites, learning outcome, worked example, assessment and exact source/version records. It also contains the exclusion/access-limit ledger and outline crosswalks.

## Teaching and study behavior

Each lesson states a plain meaning, why the problem exists, a mental model with limits, numbered mechanism, concrete intermediate-step example, failure, comparisons, observation, short interview answer, deeper follow-ups and advanced boundary. Acronyms are expanded in teaching, and numerical/protocol examples name their assumptions. Theory has no fabricated algorithmic Big-O or filler C++ loops.

Learn, Revise and Practice render the **same authored `NetworkLesson`**, not three unrelated summaries. CN module cheat sheets derive an atomic fact from each loaded lesson rather than using generic keyword fallback; this content is not shipped in home metadata. Practice hints, answers, solution reasoning and worked solutions start closed; retrieval cards start closed too. Native disclosures support keyboard operation. Switching modes resets disclosures. Mastery remains the existing local-storage model: explain, predict and apply before marking readiness. Suggested review intervals are tomorrow, a few days, a week and several weeks; no automatic SM-2 scheduler is claimed.

Specialist IDs use `topic-specialist-cn-*`; core IDs use `topic-cn-*`. Specialists never become a core dependency and are excluded from ordinary readiness. This is the application's study policy, **not a claim that ACM classifies all these topics as electives**. Prior identities and migration behavior remain unchanged.

## Provenance and crosswalk

The final **ACM/IEEE-CS/AAAI CS2023 Body of Knowledge**, April 2024, is the reference for the eight NC units. The crosswalk uses printed chapter pages 135-141 and competency-table pages 277-280, not the Gamma, Beta or 2022 drafts:

- NC-Fundamentals, NC-Applications, NC-Reliability, NC-Routing.
- NC-SingleHop, NC-Security, NC-Mobility, NC-Emerging.

The crosswalk identifies outcomes and actual assessment surfaces, not just headings. For NC-Reliability's simple-protocol development outcome, `reliable-arq-sequence` exposes the original alternating-bit sender/receiver model in `data/cn/models.ts` through `NetworkReliabilityModel`. `scripts/test-cn.ts` checks lost DATA, lost ACK, retransmitted duplicates, sequence transitions and bounded multiple-message delivery. **TCP echo and length framing are not presented as implementing ARQ.** The finite channel assumes no stale packet survives a sequence-bit wrap; it is not TCP or a general exactly-once guarantee.

There are 96 used source records, including Kurose/Ross ninth edition (2025), the stable Systems Approach text, Stanford CS144, final CS2023, IEEE working-group authorities, original RFCs, Wireshark, MDN, Linux/Microsoft manuals and practical protocol/project specifications. Each reference has a public URL, version boundary and locator. Public-source existence does not imply all paywalled or account-only content was read. All teaching, diagrams, traces and solutions are original; restricted instructor solutions and copied chapters are excluded.

Selected original standards metadata and errata were checked in October 2026 during implementation:

- **RFC 9846 (July 2026) obsoletes RFC 8446; both describe TLS 1.3, not TLS 1.4.**
- RFC 9673 updates IPv6 Hop-by-Hop processing; routers need not process every option, and skipping processing does not mean blanket dropping.
- RFC 9931 updates HTTP/1.1 optimistic-transition security. The local teaching policy waits for accepted CONNECT before forwarding untrusted data.
- TCP RFC 9293 replaces 793. DNS uses UDP **and** TCP. HTTP semantics/cache/versions and QUIC transport/TLS/loss have separate specifications.

Current status/updates can be checked at `https://www.rfc-editor.org/rfc/rfcNUMBER.json`; errata at `https://www.rfc-editor.org/errata/rfcNUMBER`. Verified corrections are distinct from Reported, Held and Rejected records. This is selected verification, not an exhaustive or permanently current errata claim.

`.test` fixtures are explicitly simulated or locally configured private hierarchies under RFC 6761, not a publicly delegated test TLD. Documentation IP ranges are diagrams, not live service targets. NPTEL's course existence was verified but its detailed outline did not load; no detailed NPTEL crosswalk is claimed. NetAcad account lessons and full IEEE paywalled text were not reproduced. No approved core group is silently deferred; vendor-specific certification minutiae and all future research proposals are not claimed exhaustive.

## Safe practical access

Twelve wired labs cover address/route/neighbor inspection, DHCP/ARP, DNS, TCP loss/setup, HTTP miss/hit/revalidation, TLS visibility, echo, framing, subnet/LPM, broken configuration, dual stack and proxy/LB delivery. Each specifies platform, prerequisites, setup, expected observations, explanation and cleanup. Every lab is attached to a visible lesson; traces can be downloaded and stepped deterministically in the browser.

Static Pages cannot execute sockets or capture traffic. Optional commands inspect an authorized local machine, loopback or a disposable sandbox only. No primary address, DNS, route or Wi-Fi change is needed. There is no fake Run button, public load test or privileged capture requirement.

The exact displayed/downloaded `cn_echo.py` is generated from `data/cn/native.ts`. It uses Python's standard library, binds only `127.0.0.1`, serves one client, bounds framed messages at 65,536 bytes, uses explicit errors and closes sockets. Its five-second waits are teaching limits, not an overall production deadline implementation.

Validation scope:

- Linux Python 3.12.3: compilation and actual loopback plain/framed self-tests.
- Windows Python 3.13.5: compilation, same self-tests, separate plain/framed CLI exchanges, UTF-8, empty frames, invalid-port rejection and natural no-client timeout/port cleanup.
- Framing: all 25 two-chunk positions for the 24-byte hello/empty/network stream, coalesced and bytewise input, UTF-8 byte length, exact maximum and oversized/truncated rejection.
- LF source SHA-256: `cdf7b630e3e3e4d21c0e31ab5fc1fb78ba7c44f0623d42ff2e95be85e769c6ff`.
- The identical Windows CRLF serialization hashes to `c90e1e2fb34c004c6fa2e618327dc574286cec837fc3a7440afa9798ca0ae7c6`.

Windows console encoding/font output can vary. This evidence does not claim executable validation of all Windows network commands or an IOCP implementation.

## Maintenance and validation

Keep `data/cn-catalog.ts` identity/count metadata separate from content. `data/topics/cn.ts` imports CN only; the home loader is dynamic, server props are numbers only, and `progress-catalog.json` is identity-only. Production export uses `/dsa-tutor`. Initial home JavaScript was approximately 108 kB before this change and builds at approximately 109 kB after it; the small metadata increase does not fetch CN lesson content. The separately loaded curriculum chunk measures 654,393 bytes raw and 212,173 bytes with local gzip; those are file measurements, not a claim about every host's transfer compression.

Before changing content:

1. Edit the canonical lesson, then adjust independent approved requirements only for a reviewed scope change.
2. Update references, examples, assessment and prerequisite relationships together. Check protocol/version assumptions and failure edges.
3. Update declared module counts when leaves genuinely change.
4. Review the inventory, then intentionally run `npx tsx scripts/snapshot-cn-inventory.ts --write`. The audit never regenerates it.
5. Run `npm run verify -- --complete`, `npx tsc --noEmit`, `npm run lint`, `git diff --check` and `NEXT_PUBLIC_BASE_PATH=/dsa-tutor npm run build`.

The existing nine verification gates remain, with two added gates: `audit-cn.ts` and `test-cn.ts`. The CN audit rejects missing owners/mappings, duplicates, empty or generic teaching, invalid references/labs, cycles, optional prerequisites, count drift and changed frozen identities. Mutation tests remove a required mapping/owner, inject duplicates, empty content and a cycle. Checks also conserve the six prior tracks' 345 topics and the separate 79 Google questions.

The optional real-browser gate is `scripts/test-cn-browser.mjs`. After building, run `python3 scripts/serve-export.py` in one terminal for the loopback-only `/dsa-tutor` preview. Supply `CN_PLAYWRIGHT_PATH` pointing to an isolated Playwright installation, `CN_CHROME_PATH` if using an installed Chrome, and optionally `CN_PREVIEW_URL` for another local basepath-aware export server. `CN_BROWSER_EVIDENCE` optionally writes its result outside the repository. It checks all 170 lesson deep links and all three modes at mobile width, closed disclosures, keyboard, history/refresh, legacy and specialist mastery, every lab, the ARQ model, Google disclosures and absence of home CN payload. Stop the preview with Ctrl-C.

Numeric fixtures independently cover units/rates, Nyquist/Shannon, BDP/window limits, subnet /0-/31-/32 boundaries, LPM, fragmentation offsets, HTTP age corrections and TTL expiry. Content audits are structural and semantic-regression guards, **not a substitute for human editorial or standards review**. The five deep pilots were reviewed for concrete mechanisms, examples, failure reasoning and corrected edge cases.

This implementation and export are local to the feature worktree. No deployment or live publication is claimed.
