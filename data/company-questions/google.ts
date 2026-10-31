import type { CompanyReport, QuestionBank } from "./schema";
import { additionalEvidence, expandedQuestions, expandedReports } from "./expanded";

const archive = "https://interviewexperiences.in/experience/google/";
const checkedOn = "2026-10-30";
const unknown = { precision: "unknown" } as const;
const day = (value: string) => ({ precision: "day", value }) as const;
const month = (value: string) => ({ precision: "month", value }) as const;

function account(
  id: string, slug: string, title: string, published: string,
  interview: CompanyReport["interview"], dateNote: string, evidence: string,
  role?: string, region?: string
): CompanyReport {
  return {
    id, accountKey: id, companyId: "google", title, url: archive + slug,
    provenance: "community-account", published: day(published), interview,
    dateNote, checkedOn, evidence, ...(role ? { role } : {}), ...(region ? { region } : {})
  };
}

export const googleQuestionBank: QuestionBank = {
  asOf: "2026-10-31",
  recentFrom: "2025-10-31",
  checkedOn: "2026-10-31",
  companies: [{ id: "google", name: "Google" }],
  reports: [
    account("google-onsite-oct-account", "google-l4-onsite-experience", "Google L4 on-site account", "2026-10-14", unknown,
      "Individual page header says Posted 14 Oct 2026; no interview date is stated.",
      "The account explicitly identifies on-site coding rounds as LeetCode 1101 and 715. Original authorship/republication is not independently established.", "L4"),
    account("google-shifts-phone", "google-l3-phone-screen-googlyness", "Google L3 phone screen and Googliness", "2026-10-10", unknown,
      "Publication comes from the company listing; 'recently' does not establish an interview date.",
      "First-person narrative labels the shift-segmentation problem Phone Screen, Virtual. The writer discloses AI-assisted writing; the OA questions are explicitly not remembered.", "L3", "India"),
    account("google-oct5-virtual", "google-l4-interview-experience-date-october-5th-2026", "Google L4 virtual technical interview", "2026-10-09", day("2026-10-05"),
      "Body explicitly dates the virtual technical and Googliness interviews October 5, 2026; publication is October 9 in the listing.",
      "Body describes an X/water grid and a supplied coordinate, BFS similar to Number of Islands, and an enclosed-lakes follow-up whose expectation the writer found unclear.", "L4"),
    account("google-l3-offer-account", "google-india-l3-interview-experience-offer-accepted", "Google India L3 interview account", "2026-09-27", unknown,
      "September 27, 2026 is the listing publication date, not a stated interview date.",
      "Narrative specifies a maximum-good-subarray-sum variant, a two-cut a/b string task, and removing one array item before an equal-sum split. It thanks LeetCode Discuss but supplies no independently verified original permalink.", "L3", "India"),
    account("google-dec24-oa-phone", "google-oaphonescreen-l4-24-dec-2025", "Google L4 OA and phone screen account", "2025-12-24", unknown,
      "December 24 is the title/listing date; the body only says 'recently participated'. It is not treated as an interview date.",
      "Body separates two OA tasks (distinct coin selection, a weighted-tree cut) from a phone-screen playlist task.", "L4"),
    account("google-summer-intern", "google-sde-intern-interview-summer-2026", "Google summer 2026 intern account", "2026-07-29", unknown,
      "Listing says July 29, 2026; Summer 2026 is a recruiting-cycle title and the application was mid-July. No interview date is established.",
      "Narrative assigns two tasks to a 90-minute OA, randomized data-structure operations to Technical Interview, and cycle entry to Technical + Project.", "SDE intern"),
    account("google-aug-two-sum", "google-l4-software-engineer-india-aug-2026-reject", "Google L4 India, August 2026", "2026-10-02", month("2026-08"),
      "The account title explicitly dates the interview August 2026; October 2 is publication, from the listing.",
      "The DSA round explicitly links Two Sum. Forgotten OA tasks and an incompletely specified advertising puzzle are not included.", "L4", "India"),
    account("google-aug-loop", "google-l4-interview-experience-aug-2026", "Google L4 interview loop, August 2026", "2026-09-16", month("2026-08"),
      "The account title states interview August 2026; publication is September 16 in the listing.",
      "Narrative separates phone grid-path counting, on-site shortest paths, and on-site timestamped friendship connectivity. Ambiguous escape-game follow-ups are excluded.", "L4"),
    account("google-aug-safest", "google-august-2026-virtual", "Google virtual interview, August 2026", "2026-10-03", month("2026-08"),
      "Title and narrative summary identify the interview as August 2026; October 3 is the listing publication date.",
      "The account describes a source-to-target rat path on open grid cells maximizing minimum Manhattan distance from a stationary cat, then multiple cats. The screening modality is virtual; phone vs on-site is not stated."),
    account("google-pi-phone", "google-l3-technical-phone-screening-2025-nov", "Google L3 technical phone screen, November 2025", "2025-11-28", month("2025-11"),
      "Title states November 2025. The body says 'yesterday'; month precision is retained rather than converting that relative phrase into an exact day.",
      "Narrative describes matching a one-based index's decimal digits to consecutive digits of pi ending at that index. Its example uses index 13; generated question text elsewhere on the page is inconsistent.", "L3"),
    {
      id: "google-gfg-jan2025", accountKey: "google-gfg-jan2025", companyId: "google", title: "Google SDE-2 interview account, January 2025",
      url: "https://www.geeksforgeeks.org/interview-experiences/google-interview-experience-for-software-engineer-sde-2-2025/",
      provenance: "community-account", published: day("2026-02-21"), interview: day("2025-01-15"), checkedOn,
      dateNote: "Body explicitly says Interview Date: January 15, 2025. HTML article:published_time is February 21, 2026. A newer publication does not make this a recent interview.",
      evidence: "First-person published narrative assigns unique target-sum pairs in a sorted array to the phone screen and binary-tree LCA (BST follow-up) to on-site. The system-design round is outside this coding bank.",
      role: "SDE-2"
    },
    {
      id: "google-cf-swaps-partitions", accountKey: "google-cf-swaps-partitions", companyId: "google",
      title: "Google SDE intern OA, IIT Bhubaneswar (2025)",
      url: "https://codeforces.com/blog/entry/145084", provenance: "first-person-original",
      published: unknown, interview: { precision: "year", value: "2025" }, checkedOn,
      dateNote: "Title labels the OA 2025. Page displayed '15 months ago' when checked; no exact publication date was captured. A year spanning the cutoff is unknown recency.",
      evidence: "First-person OA post gives two questions in 60 minutes: distinct strings after non-overlapping adjacent swaps, and partitions with coprime products. Solution sketches are not used as verified solutions.",
      role: "SDE intern"
    },
    {
      id: "google-cf-parity-palindrome", accountKey: "google-cf-parity-palindrome", companyId: "google", title: "Google intern OA problems",
      url: "https://codeforces.com/blog/entry/144519", provenance: "first-person-original",
      published: unknown, interview: unknown, checkedOn,
      dateNote: "Post displayed '16 months ago' and a 2025 tag, not a verified interview date. Publication age does not establish an exact event date.",
      evidence: "Author's OA account gives parity-constrained subsequence counting and a digit-frequency palindrome task. Comments identify solution bugs, so no claimed solution is reproduced.",
      role: "Intern"
    },
    {
      id: "google-cf-prime-tree", accountKey: "google-cf-prime-tree", companyId: "google", title: "Google OA, SWE summer intern 2025",
      url: "https://codeforces.com/blog/entry/136251", provenance: "first-person-original",
      published: unknown, interview: unknown, checkedOn,
      dateNote: "Summer intern 2025 is the role cycle, not an interview date; the page displayed '2 years ago'. Exact interview and publication dates remain unknown.",
      evidence: "Writer explicitly says the prime-labelled tree task was in their Google summer intern on-campus OA.",
      role: "SWE summer intern"
    }
  ],
  questions: [
    {
      id: "google-earliest-friendship", title: "Earliest full friendship connectivity",
      summary: "Find the earliest timestamp at which friendship events connect everyone. The August account also asks about supporting friendship removals; that changes the connectivity problem.",
      tags: ["graphs", "union-find"], difficulty: "unknown",
      evidence: [
        { reportId: "google-onsite-oct-account", stage: "onsite", locator: "Onsite coding 1", note: "The account names LeetCode 1101." },
        { reportId: "google-aug-loop", stage: "onsite", locator: "Onsite 2: timestamped friendships", note: "Distinct account; deletion is a follow-up, not part of the static practice problem." }
      ],
      practice: { url: "https://leetcode.com/problems/the-earliest-moment-when-everyone-become-friends/", title: "LeetCode 1101", relationship: "exact", note: "The October on-site account explicitly names 1101; this does not verify its interview date or match the deletion follow-up." },
      lessons: [{ topicId: "topic-graph-dsu", title: "Disjoint-set union" }]
    },
    {
      id: "google-range-module", title: "Range tracking module",
      summary: "Implement interval addition, removal and coverage queries. The account identifies the reported task by its canonical problem number, without additional interview-specific constraints.",
      tags: ["intervals", "data-structures"], difficulty: "unknown",
      evidence: [{ reportId: "google-onsite-oct-account", stage: "onsite", locator: "Onsite coding 2", note: "The account names LeetCode 715." }],
      practice: { url: "https://leetcode.com/problems/range-module/", title: "LeetCode 715: Range Module", relationship: "exact", note: "The narrative explicitly names LeetCode 715." }
    },
    {
      id: "google-employee-shifts", title: "Segment overlapping employee shifts",
      summary: "Given employees' shift ranges, produce non-overlapping time segments listing the employees active in each segment. Clarify endpoint and empty-segment conventions.",
      tags: ["intervals", "arrays"], difficulty: "unknown",
      evidence: [{ reportId: "google-shifts-phone", stage: "phone", locator: "1st round: employee shift ranges", note: "Source discloses AI-assisted writing; the underlying account is not independently corroborated." }]
    },
    {
      id: "google-island-lakes", title: "Explore a land/water grid and enclosed lakes",
      summary: "Process a land/water grid from a supplied coordinate using a traversal. The account describes an enclosed-lake follow-up but is unsure of its required output; clarify the exact contract before practicing.",
      tags: ["graphs", "bfs"], difficulty: "unknown",
      evidence: [{ reportId: "google-oct5-virtual", stage: "technical", locator: "October 5 technical: grid and lake follow-up", note: "Incomplete account: not asserted to be exactly Number of Islands or a fully specified lake-counting task." }],
      lessons: [{ topicId: "topic-graph-bfs-models", title: "BFS modeling" }]
    },
    {
      id: "google-good-subarray-indices", title: "Good subarray: return indices",
      summary: "Adapt the good-subarray condition to return any qualifying pair of boundary indices rather than the maximum sum. This is a reported variant, not the canonical optimization task.",
      tags: ["arrays", "prefix-sums", "hashing"], difficulty: "unknown",
      evidence: [{ reportId: "google-l3-offer-account", stage: "technical", locator: "Virtual round: good subarray variant" }],
      practice: { url: "https://leetcode.com/problems/maximum-good-subarray-sum/", title: "Maximum Good Subarray Sum", relationship: "related", note: "The body explicitly links this problem but replaces its max-sum output with any valid index pair." }
    },
    {
      id: "google-ab-cuts", title: "Share an a/b string with at most two cuts",
      summary: "A string has even counts of both a and b. Make at most two cuts and distribute the resulting pieces between two people so each receives equal counts of each character.",
      tags: ["strings", "prefix-sums", "counting"], difficulty: "unknown",
      evidence: [{ reportId: "google-l3-offer-account", stage: "onsite", locator: "Onsite: Alice and Bob string cuts" }]
    },
    {
      id: "google-delete-equal-split", title: "Delete one item before an equal-sum split",
      summary: "Determine whether deleting one array element permits splitting the remaining array into two contiguous subarrays with equal sums.",
      tags: ["arrays", "prefix-sums"], difficulty: "unknown",
      evidence: [{ reportId: "google-l3-offer-account", stage: "onsite", locator: "Onsite: array removal and split" }]
    },
    {
      id: "google-modular-coins", title: "Count distinct coin selections with divisible sum",
      summary: "Choose K distinct values from 0 through N-1. Count selections whose sum is divisible by M, reporting the count modulo 1,000,000,007.",
      tags: ["counting", "dynamic-programming", "number-theory"], difficulty: "unknown",
      evidence: [{ reportId: "google-dec24-oa-phone", stage: "oa", locator: "OA question 1: coin selection" }]
    },
    {
      id: "google-tree-cut", title: "Balance a weighted tree with one edge cut",
      summary: "Remove one tree edge to minimize the absolute difference between the sums of node weights in the two resulting components.",
      tags: ["trees"], difficulty: "unknown",
      evidence: [{ reportId: "google-dec24-oa-phone", stage: "oa", locator: "OA question 2: minTownsDiff" }],
      lessons: [{ topicId: "topic-tree-postorder-contracts", title: "Tree postorder contracts" }]
    },
    {
      id: "google-playlist-artists", title: "Reorder a playlist to separate artists",
      summary: "Reorder songs to avoid consecutive songs by the same artist where possible, minimizing such adjacencies otherwise. Clarify ties and the required output arrangement.",
      tags: ["greedy", "arrays"], difficulty: "unknown",
      evidence: [{ reportId: "google-dec24-oa-phone", stage: "phone", locator: "Phone screen: song playlist" }]
    },
    {
      id: "google-bounded-subarray", title: "Longest subarray with sum at most k",
      summary: "Find a longest contiguous subarray whose sum is at most k. The account does not specify whether values can be negative, so a sliding-window solution is not assumed to be valid.",
      tags: ["arrays", "prefix-sums"], difficulty: "unknown",
      evidence: [{ reportId: "google-summer-intern", stage: "oa", locator: "Round 1 OA: longest subarray" }]
    },
    {
      id: "google-leaf-path-sum", title: "Maximum leaf-to-leaf tree path sum",
      summary: "Find the maximum sum of a tree path whose two endpoints are leaves. Clarify handling of negative weights and trees with fewer than two leaves.",
      tags: ["trees", "dynamic-programming"], difficulty: "unknown",
      evidence: [{ reportId: "google-summer-intern", stage: "oa", locator: "Round 1 OA: leaf-to-leaf path" }],
      lessons: [{ topicId: "topic-tree-postorder-contracts", title: "Tree path contracts" }]
    },
    {
      id: "google-randomized-collection", title: "Insert, delete and sample in average constant time",
      summary: "Design a collection with insertion, deletion and random selection in average O(1) time. Extend the design to allow duplicate values.",
      tags: ["hashing", "arrays", "data-structures"], difficulty: "unknown",
      evidence: [{ reportId: "google-summer-intern", stage: "technical", locator: "Round 2 technical: randomized collection" }]
    },
    {
      id: "google-cycle-entry", title: "Locate a linked-list cycle entry",
      summary: "Determine the node where a linked-list cycle begins, rather than only testing whether a cycle exists.",
      tags: ["linked-lists"], difficulty: "unknown",
      evidence: [{ reportId: "google-summer-intern", stage: "technical", locator: "Round 3 technical: cycle entry" }]
    },
    {
      id: "google-two-sum", title: "Two Sum",
      summary: "Find two array positions whose values sum to a target. The account explicitly links the canonical task; no unreported extra constraints are added.",
      tags: ["arrays", "hashing"], difficulty: "unknown",
      evidence: [{ reportId: "google-aug-two-sum", stage: "technical", locator: "DSA interview: Two Sum link" }],
      practice: { url: "https://leetcode.com/problems/two-sum/", title: "Two Sum", relationship: "exact", note: "The body explicitly links the Two Sum description." }
    },
    {
      id: "google-sorted-unique-pairs", title: "Unique target-sum pairs in a sorted array",
      summary: "Find all distinct value pairs in a sorted array that sum to a target, avoiding duplicate output pairs.",
      tags: ["arrays"], difficulty: "unknown",
      evidence: [{ reportId: "google-gfg-jan2025", stage: "phone", locator: "Phone screening: sorted target-sum pairs" }]
    },
    {
      id: "google-lca-bst-followup", title: "Lowest common ancestor, then a BST follow-up",
      summary: "Find the lowest common ancestor of two nodes in a binary tree, then discuss how the approach changes for a binary search tree.",
      tags: ["trees"], difficulty: "unknown",
      evidence: [{ reportId: "google-gfg-jan2025", stage: "onsite", locator: "Onsite: LCA and BST follow-up" }]
    },
    {
      id: "google-rightward-grid-paths", title: "Count rightward grid paths with checkpoints",
      summary: "Count paths from the bottom-left to bottom-right of an n by m grid using right, up-right or down-right moves. Follow-ups require visiting checkpoints, including a specified order; clarify checkpoint rules.",
      tags: ["dynamic-programming", "graphs", "counting"], difficulty: "unknown",
      evidence: [{ reportId: "google-aug-loop", stage: "phone", locator: "Phone: grid paths and checkpoints" }]
    },
    {
      id: "google-shortest-path-membership", title: "Nodes on some shortest path",
      summary: "In an unweighted undirected graph, find a shortest path and then identify the nodes belonging to at least one shortest path between the endpoints. This is not the intersection of all shortest paths.",
      tags: ["graphs", "bfs"], difficulty: "unknown",
      evidence: [{ reportId: "google-aug-loop", stage: "onsite", locator: "Onsite 1: shortest path and node membership" }],
      lessons: [{ topicId: "topic-graph-bfs-models", title: "BFS modeling" }]
    },
    {
      id: "google-rat-safest-path", title: "Safest grid path away from a cat",
      summary: "Move through open cells in four directions from source to target, maximizing the minimum Manhattan distance to a stationary cat along the path. Return -1 if unreachable; a follow-up introduces multiple cats.",
      tags: ["graphs", "bfs"], difficulty: "unknown",
      evidence: [{ reportId: "google-aug-safest", stage: "technical", locator: "Virtual screening: rat safest path", note: "Virtual screening is explicit; phone vs on-site is unspecified." }]
    },
    {
      id: "google-pi-index", title: "Match an index to digits of pi",
      summary: "Search the digits of pi for a one-based position whose decimal index matches the consecutive digits ending at that position. The account's example tests digits at positions 12 and 13 against index 13; input bounds are not supplied.",
      tags: ["strings", "arrays"], difficulty: "unknown",
      evidence: [{ reportId: "google-pi-phone", stage: "phone", locator: "Phone screen narrative: index 13 example", note: "Use the narrative, not the page's inconsistent generated question block." }]
    },
    {
      id: "google-disjoint-swaps", title: "Count strings after disjoint adjacent swaps",
      summary: "Count distinct strings obtainable by swapping non-overlapping adjacent character pairs. Equal characters can make different swap choices produce the same string, so count outputs rather than operation schedules.",
      tags: ["strings", "counting", "dynamic-programming"], difficulty: "unknown",
      evidence: [{ reportId: "google-cf-swaps-partitions", stage: "oa", locator: "Problem 1: adjacent swaps" }]
    },
    {
      id: "google-coprime-partitions", title: "Partitions with coprime subset products",
      summary: "Count ways to divide the input values into two groups whose products are coprime. The account leaves group labelling and treatment of empty groups or ones insufficiently clear; resolve those conventions before implementing.",
      tags: ["number-theory", "union-find", "counting"], difficulty: "unknown",
      evidence: [{ reportId: "google-cf-swaps-partitions", stage: "oa", locator: "Problem 2: coprime products", note: "The post's DSU sketch is not treated as a verified solution." }]
    },
    {
      id: "google-parity-subsequences", title: "Count subsequences without three equal parities",
      summary: "Count nonempty subsequences in which no three consecutive selected elements share the same parity. Return the count modulo 1,000,000,007.",
      tags: ["arrays", "dynamic-programming", "counting"], difficulty: "unknown",
      evidence: [{ reportId: "google-cf-parity-palindrome", stage: "oa", locator: "OA problem 1: parity subsequences" }]
    },
    {
      id: "google-digit-palindrome", title: "Next palindrome with self-counting digits",
      summary: "Find the smallest palindrome greater than N in which each digit d that occurs appears exactly d times. Clarify the number range and treatment of zero; do not rely on the post's disputed solution.",
      tags: ["strings", "number-theory", "counting"], difficulty: "unknown",
      evidence: [{ reportId: "google-cf-parity-palindrome", stage: "oa", locator: "OA problem 2: digit-frequency palindrome" }]
    },
    {
      id: "google-prime-labelled-tree", title: "Prime labels with non-prime adjacent sums",
      summary: "Assign each tree node a prime no greater than 100 so that the sum of labels on every edge is non-prime. Count valid assignments modulo 1,000,000,007.",
      tags: ["trees", "number-theory", "dynamic-programming"], difficulty: "unknown",
      evidence: [{ reportId: "google-cf-prime-tree", stage: "oa", locator: "On-campus OA: prime tree" }]
    }
  ]
};

googleQuestionBank.reports.push(...expandedReports);
googleQuestionBank.questions.push(...expandedQuestions);
for (const question of googleQuestionBank.questions) {
  question.evidence.push(...(additionalEvidence[question.id] ?? []));
}
