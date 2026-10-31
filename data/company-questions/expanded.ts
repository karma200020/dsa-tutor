import type { CompanyQuestion, CompanyReport, QuestionEvidence, QuestionTag, Stage } from "./schema";

const unknown = { precision: "unknown" } as const;
const month = (value: string) => ({ precision: "month", value }) as const;
function report(id: string, slug: string, published: string, evidence: string, interview: CompanyReport["interview"] = unknown): CompanyReport {
  return {
    id, accountKey: id, companyId: "google", title: slug.replace(/-/g, " "),
    url: `https://interviewexperiences.in/experience/google/${slug}`,
    provenance: "community-account", published: { precision: "day", value: published },
    interview, checkedOn: "2026-10-31", evidence,
    dateNote: interview.precision === "unknown"
      ? "Publication is from the company archive listing. No unambiguous actual interview date is established; title years and relative timelines are not promoted to event dates. Archive authorship/republication is unverified."
      : `The narrative/title explicitly identifies interview ${interview.value}; publication is independently listed. Month precision is retained. Archive authorship/republication is unverified.`
  };
}

export const expandedReports: CompanyReport[] = [
  report("sweep-squares-phone", "l3-google-chances", "2026-10-05", "Phone: count squares in points, rotated included; duplicate-point follow-up. October 1 phone-screen-chances page repeats this account and is not independent evidence."),
  report("sweep-india-timeline", "google-swe-ii-l3-interview-experience-india-2026", "2026-09-18", "Title establishes 2026 context. Narrative dates phone July 15, onsite August 31 and September 17. Each occurrence retains its own month, rather than assigning all rounds one date."),
  report("sweep-l3-rounds", "google-l3-swe-interviews", "2026-09-16", "Technical roster with empty gaps, score-decrement ad service, and adjacent substrings with equal distinct-character sets."),
  report("sweep-city", "google-question-3", "2026-09-16", "Weighted-road favorite city, then a fixed via-city follow-up; stage unspecified."),
  report("sweep-area", "google-question-2", "2026-09-16", "Horizontal square-area bisection. Overlap semantics missing; the source centroid claim is not adopted."),
  report("sweep-l4-8613", "google-l4-interview-experience-8613", "2026-09-15", "Virtual cat/grid task; onsite maximum-area unoriented rectangle, job scheduling and static uniqueness queries. Round-count inconsistencies not propagated."),
  report("sweep-l4-tree", "google-swe-iiil4-interview-experience", "2026-09-15", "Screen rooting degree-three tree; colored-layer follow-up. Onsite lakes and weighted scheduling."),
  report("sweep-closed-walk", "google-sde-3-interview-95lakhs-ctc", "2026-09-12", "Onsite grid: exact-length lexicographically smallest closed walk, obstacles and D/L/R/U moves."),
  report("sweep-device", "usa-google-swe-iii-1st-round-technical", "2026-09-03", "Phone timestamped device-event deduplication within ten seconds; cooldown convention unclear."),
  report("sweep-r1", "google-r1-two-round-interview-experience", "2026-06-24", "Coding: top-k frequent and increasing parent-child consecutive binary-tree path. Appears republished from interview-aid.com; source dates lack a year."),
  report("sweep-oct2025", "google-interview-experience-l4-october-2025-reject", "2026-06-22", "Phone periodic-table segmentation; onsite rank determination and piano hand placement. Source piano example is inconsistent and not used.", month("2025-10")),
  report("sweep-univalue", "google-l4-interview-experience-chances", "2026-06-10", "Virtual longest equal-value binary-tree path; underspecified scheduling excluded."),
  report("sweep-bangalore", "google-l4-banglore", "2026-05-19", "Online rated movie similarity graph; onsite decrementing-score ad selection. Cooldown extension incompletely specified."),
  report("sweep-rooks", "google-l3-bangalore-india-interview-experience", "2026-05-18", "Onsite n-1 nonattacking rooks on a hidden n by n board, rectangle-count API."),
  report("sweep-courses", "google-l4-interview-reject", "2026-05-18", "Online dependency tasks described as similar to Course Schedule I/II, not exact canonical matches. Linked placeholder round shares another account's original."),
  report("sweep-placeholder", "google-l4-in-person-interview", "2026-05-14", "Onsite recursive %key% expansion with explicit missing-key and cycle errors."),
  report("sweep-edge-removal", "google-interview-experience-2-rounds-swe-ii-l3", "2026-05-08", "Maximum surviving weighted edge after a queried vertex and its incident edges are removed; all-vertex preprocessing requested."),
  report("sweep-fence", "google-question-paint-fence-with-circular-fences", "2026-05-02", "Body says circular LC 276 variation; generated text instead forbids equal adjacent colors. Contract contradiction retained, not silently resolved."),
  report("sweep-ml", "google-ml-engineer-l4l5-interview-experience-hire", "2026-04-29", "Onsite transitive movie similarity with ratings and lexicographic tie, and subsets whose sum exceeds half the total."),
  report("sweep-hash", "reverser-ll-nodes-with-verifying-hash-values-coding-question-onsite-google", "2026-04-11", "Onsite reversing a hashed linked list; stated suffix-hash equation conflicts with displayed reversed prefix sums. Conditional suffix model, not copied expected hashes."),
  report("sweep-frontend", "google-l5-frontend-interview-experience-bangalore-rejected", "2026-04-10", "Screen maximum-sum subarray with equal boundary values. Rate limiting and nonmonotone path follow-ups lack sufficiently fixed contracts."),
  report("sweep-stuck", "google-l5-screening-reject", "2026-04-10", "Screen recover dictionary candidates from repeated stuck-key characters; no expressive-word threshold of three."),
  report("sweep-clock", "google-phone-screening", "2026-03-29", "Phone masked 24-hour time nearest a reference, midnight wrap. Malformed example and tie/distance ambiguity retained."),
  report("sweep-arithmetic", "l3-google-onsite-arithmetic-sequence-question", "2026-03-28", "Onsite sum of sums of contiguous arithmetic subarrays with constant difference +1 or -1, singles included."),
  report("sweep-partition", "google-interview-l4", "2026-03-23", "Phone partition valid strings using a provided validity API with minimum moves, unstable order acceptable. Slug service and TTL-LRU designs have missing operational contracts."),
  report("sweep-connected", "google-screening-rounds-swe4", "2026-03-19", "Screen sorted-array graph with edges where value difference is at most diff; answer connectivity queries."),
  report("sweep-web", "google-web-solutions-engineer-l3", "2026-02-26", "Technical CSV quoting/doubled-quote parsing, alien friendships/planet pairs, and validating a parent array."),
  report("sweep-parent", "google-intern-interview-experience", "2026-02-04", "Technical parent-array validity task, root sentinel unspecified."),
  report("sweep-free", "google-phone-screening-l4-1", "2026-02-04", "Phone inclusive blocked-day ranges and free days; at-least-k-free-people follow-up requires per-person overlap merging."),
  report("sweep-parity-ranges", "google-l4-interview-experience-timeline", "2026-01-04", "Coding static alternating-parity range queries and shortest subarray with at least k distinct values. Nov/Dec timeline has no year."),
  report("sweep-step2024", "google-step-internship-interview-experience-india-2024", "2026-01-08", "Body explicitly calls this the writer's 2024 interview; beach seating with at most k occupied separators.", { precision: "year", value: "2024" }),
  report("sweep-intern2024-title", "google-summer-intern-2024-interview-experience", "2026-01-31", "Summer 2024 title is a recruiting cycle, not a stated event date. Incremental rotated-square detection and sum of subarray sums with constant difference 0 or +1."),
  report("sweep-europe", "google-europe-l3-interview-experience", "2025-12-11", "Phone ordered index-pair equation including i=j. Onsite security bottleneck, balanced packet sizing and completed event durations exceeding timeout."),
  report("sweep-delete-files", "google-swe-sre-onsite-round-1", "2025-12-09", "Onsite delete a directory tree with supplied GetDirectoryChildren/IsDirectory/Delete APIs. No real filesystem access is needed."),
  report("sweep-poland", "google-poland-l4-interview-experience", "2025-12-04", "Screen graph serialization preserving DAG identity, cycles follow-up; onsite hash(value,next.hash) validation. Parking API lacks type/clock contract."),
  report("sweep-filesizes", "google-interview-filesystem-handling", "2025-11-13", "Dictionary nodes with directory children or file size; get_size with static repeated-query caching."),
  report("sweep-older-aug", "google-l4-reject", "2025-11-07", "Body explicitly dates interviews August 2025. Screen adjacent-duplicate removal and Russian Doll Envelopes; probability task incompletely remembered.", month("2025-08")),
  report("sweep-seller", "google-web-solution-engineer-interview-experience", "2025-11-06", "Technical dynamic seller orders, arbitrary removals and cheapest-order query; ties and identity require a practice contract.")
];

expandedReports.find((r) => r.id === "sweep-india-timeline")!.dateNote += " Per-round occurrence dates are explicitly stored at month precision using the stated 2026 context.";
expandedReports.push({
  id: "sweep-beyondleet", accountKey: "sweep-beyondleet", companyId: "google",
  title: "Google SWE2 early-careers account and linked task notes",
  url: "https://beyondleet.dev/experiences/google-swe2-early-careers-2026",
  provenance: "community-account", published: unknown, interview: unknown, checkedOn: "2026-10-31",
  dateNote: "Recruiter June 2026 and relative round timeline do not establish a complete interview date. Original authorship and the archive's conflicting status are not independently verified; this underlying account is counted once.",
  evidence: "First-person narrative links task notes for trie wildcard enumeration, weighted ratio DSU, and weighted interval scheduling. Linked notes are editorial descriptions, not independently corroborated official prompts."
});

function q(id: string, title: string, summary: string, tags: QuestionTag[], reportId: string, stage: Stage, locator: string, interview?: QuestionEvidence["interview"]): CompanyQuestion {
  return { id: `google-${id}`, title, summary, tags, difficulty: "unknown", evidence: [{ reportId, stage, locator, ...(interview ? { interview } : {}) }] };
}
export const expandedQuestions: CompanyQuestion[] = [
  q("point-squares", "Count squares in a point set", "Count squares whose vertices are supplied points, including rotated squares. Duplicate-coordinate multiplicity is a follow-up, not part of the unique-point baseline.", ["arrays","hashing"], "sweep-squares-phone","phone","Phone: all squares"),
  q("step-subsequence", "Increasing subsequence with bounded steps", "Find the longest increasing subsequence whose consecutive selected values differ by exactly one; extend to differences from one through d.", ["arrays","dynamic-programming"], "sweep-india-timeline","phone","July 15: bounded-step LIS", month("2026-07")),
  q("security-path", "Minimum security threshold on a directed path", "Choose a directed path minimizing its largest edge security level. One account asks for the smallest threshold S permitting only edges with level strictly below S; negative levels and cycles are possible.", ["graphs"], "sweep-india-timeline","onsite","August 31: security path",month("2026-08")),
  q("root-leaf-cut", "Cut all root-to-original-leaf connections", "In a positive-edge-weighted rooted tree, minimize removed-edge cost so the root is disconnected from every original leaf. An n-ary extension is reported; the negative-edge follow-up lacks a clear cut model.", ["trees","dynamic-programming"],"sweep-india-timeline","onsite","September 17: root-leaf cuts",month("2026-09")),
  q("ad-selection", "Select highest-score nonrepeating ads", "Insert ads with scores; select the highest-score eligible ad, never immediately repeat the same ad, and decrement its score after selection. Tie and single-ad behavior need clarification.",["data-structures","greedy"],"sweep-l3-rounds","technical","Technical 3: ad service"),
  q("equal-set-substrings", "Adjacent substrings with equal character sets", "Count triples i <= j < k for which the adjacent nonempty lowercase substrings s[i..j] and s[j+1..k] have equal sets of distinct characters.",["strings","counting"],"sweep-l3-rounds","technical","Technical 4: equal character sets"),
  q("favorite-city", "Fastest reachable favorite city", "Given weighted roads and favorite cities, find a favorite reachable fastest from a source. Follow-ups route through a fixed via-city or onward to a target through any favorite.",["graphs"],"sweep-city","unknown","Favorite-city narrative"),
  q("bisect-square-area", "Bisect area of axis-aligned squares", "Find a horizontal line splitting the total square area equally. The account supplies top-left coordinates and side lengths but does not settle whether overlapping area counts once or multiple times.",["arrays","intervals"],"sweep-area","unknown","Square-area narrative"),
  q("maximum-rectangle", "Largest rectangle in points, any orientation", "Find the maximum area of a rectangle with vertices in the supplied point set; rotated rectangles are allowed. A linked minimum-area problem is only related practice.",["arrays","hashing"],"sweep-l4-8613","onsite","Onsite: maximum-area rectangle"),
  q("weighted-jobs", "Maximum-profit nonoverlapping jobs", "Choose nonoverlapping time intervals maximizing total profit. Explicit linked notes permit a job starting exactly when another ends; extra dependencies or a job-count cap require a different recurrence.",["intervals","dynamic-programming"],"sweep-l4-8613","onsite","Onsite: weighted interval scheduling"),
  q("unique-range", "Constant-time all-distinct range queries", "Preprocess a static array so queries can decide whether every value in an inclusive subarray occurs only once within that subarray.",["arrays","hashing"],"sweep-l4-8613","onsite","Onsite: static all-unique queries"),
  q("binary-tree-root", "Choose a binary-tree root", "Root an undirected tree with maximum degree three so each node has at most two children. A two-color follow-up asks for alternating colored layers.",["trees"],"sweep-l4-tree","phone","Screen: binary root"),
  q("closed-grid-walk", "Lexicographically smallest exact-length closed walk", "Starting on an obstacle grid, return to the start after exactly k four-direction steps, minimizing the D/L/R/U move string lexicographically. Revisiting cells is permitted by the walk interpretation.",["graphs","bfs","greedy"],"sweep-closed-walk","onsite","Onsite: k-step closed walk"),
  q("device-cooldown", "Deduplicate timestamped device utterances", "Suppress repeated device events within a ten-second window. Clarify whether suppressed events extend the cooldown and whether exactly ten seconds is accepted.",["hashing"],"sweep-device","phone","Phone: timestamp deduplication"),
  q("top-k-frequency", "Top k frequent values", "Return k most frequent values from a collection. The report does not prescribe frequency ties or output order.",["hashing","arrays"],"sweep-r1","technical","Coding: top-k frequent"),
  q("tree-consecutive", "Increasing consecutive parent-child path", "Find a longest downward binary-tree path with each child's value exactly one greater than its parent's. An any-direction extension is separate.",["trees","dynamic-programming"],"sweep-r1","technical","Coding: consecutive binary tree"),
  q("element-segmentation", "Count periodic-table word segmentations", "Count ways to split a word into periodic-table element symbols. Case treatment, reuse and numeric output bounds must be specified.",["strings","dynamic-programming"],"sweep-oct2025","phone","Phone: element symbols"),
  q("determined-ranks", "Players with fully determined ranks", "Given pairwise outcomes where the better player has the lower rank number, count players whose exact rank is forced by the known relations and their transitive consequences.",["graphs"],"sweep-oct2025","onsite","Onsite: chess ranks"),
  q("piano-repositions", "Minimum piano hand repositions", "Play a note sequence with one hand covering a span of at most k. Minimize repositioning between consecutive played blocks; an inconsistent source example is not used as an expected answer.",["arrays","greedy"],"sweep-oct2025","onsite","Onsite: piano span"),
  q("univalue-path", "Longest equal-value tree path", "Find the longest binary-tree path whose nodes all have the same value; the path need not pass through the root.",["trees","dynamic-programming"],"sweep-univalue","technical","Virtual: same-value path"),
  q("movie-component", "Best-rated movies in a similarity component", "Traverse a movie-similarity graph and return highest-rated transitively related movies excluding the queried movie. One account specifies lexicographic title ties and a top-k extension.",["graphs","arrays"],"sweep-ml","onsite","Onsite: rated transitive movies"),
  q("missing-rook", "Missing row and column through rectangle counts", "A hidden n by n board contains n-1 rooks in distinct rows and columns. Using a rectangle-count API, locate the empty row and empty column.",["arrays"],"sweep-rooks","onsite","Onsite: hidden rook board"),
  q("course-order", "Dependency feasibility and ordering", "Determine whether prerequisite tasks can all be completed and return a valid order if possible. Reported as similar to Course Schedule, without an exact canonical-contract claim.",["graphs"],"sweep-courses","technical","Online: course dependency variants"),
  q("placeholder-expansion", "Recursively expand dictionary placeholders", "Expand %key% placeholders in a string, including placeholders inside dictionary values. A missing key or dependency cycle must produce an error.",["strings","graphs","hashing"],"sweep-placeholder","onsite","Onsite: recursive placeholders"),
  q("edge-after-removal", "Maximum edge after a vertex deletion", "Preprocess a weighted graph so queries removing one vertex and all its incident edges can return the maximum remaining edge weight.",["graphs","arrays"],"sweep-edge-removal","technical","Weighted-edge node removal"),
  q("circular-fence", "Circular fence coloring: clarify the run rule", "Color a circular fence. The body names a circular variation of LC 276, while generated text forbids any equal adjacent colors; these are different tasks and the ambiguity is unresolved.",["counting","dynamic-programming"],"sweep-fence","unknown","Circular fence body vs generated text"),
  q("majority-subsets", "Subsets exceeding half the total sum", "Count index subsets whose sum exceeds half the total array sum. Value signs and bounds are not established by the narrative.",["arrays","dynamic-programming","counting"],"sweep-ml","onsite","Onsite: majority-sum subsets"),
  q("reverse-hashed-list", "Reverse and validate a hashed linked list", "Reverse a linked list while checking stored hashes. One account states an additive suffix hash but displays incompatible prefix sums after reversal; another supplies an unspecified hash(value,nextHash) function.",["linked-lists"],"sweep-hash","onsite","Onsite: reverse stored hashes"),
  q("equal-end-sum", "Maximum subarray sum with equal endpoints", "Maximize the sum of a contiguous subarray whose first and last values are equal. Negative values make storing only the first occurrence insufficient.",["arrays","prefix-sums","hashing"],"sweep-frontend","phone","Screen: equal-endpoint max sum"),
  q("stuck-key-words", "Dictionary candidates after stuck keys", "Given typed text with repeated characters caused by stuck keys, return dictionary words that could have produced it. Each intended character may repeat one or more times.",["strings"],"sweep-stuck","phone","Screen: stuck-key dictionary"),
  q("masked-clock", "Nearest time matching a mask", "Fill '?' digits in a 24-hour HH:MM mask to find a time nearest a reference, allowing midnight wrap. Distance direction and ties are not completely specified.",["strings"],"sweep-clock","phone","Phone: masked time"),
  q("arithmetic-sum", "Sum of sums of unit-step arithmetic subarrays", "Sum all element sums of contiguous subarrays having constant difference +1 or -1. Singletons count once, not once for each difference.",["arrays","dynamic-programming"],"sweep-arithmetic","onsite","Onsite: constant +/-1 subarray sums"),
  q("valid-partition", "Partition valid strings with minimum swaps", "Rearrange a string array so all values accepted by a provided validity API precede invalid values. Order within each partition need not be preserved.",["arrays"],"sweep-partition","phone","Phone: valid/invalid partition"),
  q("gap-connectivity", "Connectivity through sorted-array gaps", "Array indices form a graph with an edge whenever their value difference is at most diff. Preprocess a sorted array to answer whether two queried indices are connected.",["arrays","graphs"],"sweep-connected","phone","Screen: value-gap connectivity"),
  q("csv-parser", "Parse quoted CSV records", "Parse CSV records containing quoted fields, embedded commas and escaped double quotes. The report calls out parsing edge cases but does not specify a complete dialect.",["strings"],"sweep-web","technical","Round 1: CSV parsing"),
  q("planet-pairs", "Pairs from different friendship components", "Given alien friendships, count alien pairs belonging to different inferred planets/components. The component-to-planet interpretation is a required practice assumption, not a confirmation of unknown friendships.",["graphs","union-find","counting"],"sweep-web","technical","Round 2: aliens and planets"),
  q("parent-array", "Validate a rooted-tree parent array", "Determine whether an array of node parents describes one valid rooted tree, rejecting invalid parents, cycles and disconnected structures.",["trees","graphs"],"sweep-web","technical","Round 3: parent array"),
  q("free-days", "Days with enough free people", "From inclusive per-person blocked-day intervals, find days when nobody is blocked. A follow-up asks for at least k free people, requiring overlapping intervals of the same person not be counted twice.",["intervals","arrays"],"sweep-free","phone","Phone: free days and k people"),
  q("parity-ranges", "Static alternating-parity range queries", "Preprocess an array to decide whether a queried subarray alternates even and odd values at every adjacent pair.",["arrays","prefix-sums"],"sweep-parity-ranges","technical","Coding: alternating parity queries"),
  q("shortest-distinct", "Shortest subarray with at least k distinct values", "Return the minimum length of a contiguous subarray containing at least k distinct integers, or -1 when none exists.",["arrays","hashing"],"sweep-parity-ranges","technical","Coding: shortest k-distinct subarray"),
  q("beach-gap", "Most free seats with at most k occupied separators", "Maximize the number of free seats in a contiguous span with at most k occupied places between them. Occupied seats are not counted as newly available; the report explicitly describes a 2024 interview.",["arrays"],"sweep-step2024","technical","Coding: beach seating"),
  q("arithmetic-zero-one", "Sum of sums of constant zero-or-one-step subarrays", "Sum all element sums of contiguous subarrays with constant difference zero or +1. This differs from the separately reported +1/-1 variant.",["arrays","dynamic-programming"],"sweep-intern2024-title","technical","Technical: constant 0/+1 arithmetic subarrays"),
  q("ordered-index-pairs", "Ordered pairs with equal value-minus-index", "Count ordered index pairs satisfying a[i]-a[j] = i-j, including i=j. Reversed pairs are counted separately.",["arrays","hashing","counting"],"sweep-europe","phone","Phone: ordered pair equation"),
  q("balanced-packets", "Fewest packets, then smallest largest packet", "Split a total integer data size S into packets of capacity C: first minimize packet count, then minimize the largest packet size. Free splitting into integer units is an explicit assumption.",["greedy","number-theory"],"sweep-europe","onsite","Onsite: packet balancing"),
  q("event-timeouts", "Completed events exceeding a timeout", "Given timestamped start/end logs, identify completed events whose elapsed duration exceeds a timeout. The requested constant-memory follow-up cannot be assumed possible for arbitrary interleaving.",["hashing"],"sweep-europe","onsite","Onsite: event duration logs"),
  q("delete-directory", "Delete a directory tree through supplied APIs", "Delete files and directories using supplied child-listing, directory-test and deletion APIs; a directory can be deleted only after its children.",["trees"],"sweep-delete-files","onsite","Onsite: directory deletion"),
  q("graph-codec", "Serialize graphs while preserving shared nodes", "Serialize and reconstruct a DAG without duplicating shared child nodes. Extend the representation to cycles by preserving explicit node identities.",["graphs","data-structures"],"sweep-poland","phone","Screen: DAG codec and cycles"),
  q("filesystem-size", "Cached sizes in a directory dictionary", "Compute a node's total file size from a dictionary of files and directory children, and cache results for repeated queries on unchanged data.",["trees","hashing"],"sweep-filesizes","technical","Coding: directory get_size"),
  q("adjacent-duplicates", "Remove adjacent duplicate pairs", "Repeatedly remove adjacent equal-character pairs until no removable pair remains; the older account explicitly names the canonical task.",["strings","data-structures"],"sweep-older-aug","phone","Screen: Remove All Adjacent Duplicates"),
  q("envelopes", "Russian doll envelopes", "Find the maximum strictly nested envelope chain; both width and height must increase. This task is explicitly named in the older account.",["arrays","dynamic-programming"],"sweep-older-aug","phone","Screen: Russian Doll Envelopes"),
  q("cheapest-order", "Dynamic cheapest seller order", "Add priced seller orders, remove any order, and return the cheapest currently available order. Stable identity and price/timestamp ties require clarification.",["data-structures"],"sweep-seller","technical","Technical: minimum-priced orders"),
  q("wildcard-words", "Enumerate words matching dot wildcards", "Insert lowercase words and return all words matching a pattern where '.' matches exactly one character. The linked task notes describe enumeration, not a boolean search.",["strings","trees"],"sweep-beyondleet","technical","Linked notes: trie-hashmap-string-matching"),
  q("weighted-ratios", "Maintain graph value ratios", "Add relations value[u]/value[v] = weight and query ratios for connected nodes. Contradictions and deletions are follow-ups; ordinary connectivity DSU alone does not store the ratios.",["graphs","union-find"],"sweep-beyondleet","technical","Linked notes: modified-union-find-graph-components")
];

export const additionalEvidence: Record<string, QuestionEvidence[]> = {
  "google-employee-shifts": [
    {reportId:"sweep-l3-rounds",stage:"technical",locator:"Technical 1: roster including empty gaps",note:"Unlike the earlier account, this narrative explicitly wants empty gaps."}
  ],
  "google-rat-safest-path": [{reportId:"sweep-l4-8613",stage:"technical",locator:"Virtual: stationary-cat grid"}],
  "google-weighted-jobs": [
    {reportId:"sweep-l4-tree",stage:"onsite",locator:"Onsite: weighted jobs"},
    {reportId:"sweep-beyondleet",stage:"technical",locator:"Linked notes: dp-to-binary-search-optimization",note:"Linked notes permit equal start/end boundaries and describe extra constraints separately."}
  ],
  "google-security-path": [{reportId:"sweep-europe",stage:"onsite",locator:"Onsite: minimax security edges"}],
  "google-ad-selection": [{reportId:"sweep-bangalore",stage:"onsite",locator:"Onsite: decrementing ad scores"}],
  "google-parent-array": [{reportId:"sweep-parent",stage:"technical",locator:"Technical: parent-array tree"}],
  "google-point-squares": [{reportId:"sweep-intern2024-title",stage:"technical",locator:"Technical: incremental square detection",note:"Boolean incremental detection is a variant of counting; no new interview date is inferred from the cycle title."}],
  "google-reverse-hashed-list": [{reportId:"sweep-poland",stage:"onsite",locator:"Onsite: hash(value,nextHash)",note:"Uses a supplied hash function rather than an additive checksum; practice assumptions distinguish the models."}]
};

expandedQuestions.find((question) => question.id === "google-maximum-rectangle")!.practice = {
  url: "https://leetcode.com/problems/minimum-area-rectangle-ii/",
  title: "Minimum Area Rectangle II", relationship: "related",
  note: "The account links a minimum-area problem, but asks for maximum area; it is not an exact output match."
};
expandedQuestions.find((question) => question.id === "google-weighted-jobs")!.practice = {
  url: "https://leetcode.com/problems/maximum-profit-in-job-scheduling/",
  title: "Maximum Profit in Job Scheduling", relationship: "exact",
  note: "The source account explicitly links this canonical task; extra constraints in linked task notes are separate follow-ups."
};
expandedQuestions.find((question) => question.id === "google-wildcard-words")!.evidence[0].detailUrl =
  "https://beyondleet.dev/questions/trie-hashmap-string-matching";
expandedQuestions.find((question) => question.id === "google-weighted-ratios")!.evidence[0].detailUrl =
  "https://beyondleet.dev/questions/modified-union-find-graph-components";
additionalEvidence["google-weighted-jobs"][1].detailUrl =
  "https://beyondleet.dev/questions/dp-to-binary-search-optimization";
