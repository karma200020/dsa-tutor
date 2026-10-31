import type { NetworkLesson } from "./schema";

export const transportLessons: NetworkLesson[] = [
  {
    id: "forwarding-lookup", module: "routing", title: "Control decisions and longest-prefix forwarding",
    concepts: ["routing-control-plane", "packet-data-plane", "routing-information-base", "forwarding-information-base", "longest-prefix-match", "next-hop-resolution"],
    prerequisites: [],
    meaning: "Routing chooses reachability information; forwarding applies an installed decision to each packet. A router does not run a complete routing algorithm for every arriving packet.",
    why: "A router needs rich, sometimes conflicting route candidates, but packet forwarding must be fast and predictable. Separating route learning from table lookup allows both jobs to scale.",
    model: "Think of a planning office and a delivery desk. The RIB stores route candidates and selected routes; the FIB holds forwarding-ready entries. This is a functional distinction, not a promise that they live on separate machines.",
    steps: [
      "The control plane learns candidate prefixes from configuration and routing protocols, then selects usable routes in its routing information base.",
      "Resolve a selected route's next hop to an outgoing interface and adjacency; install the forwarding information base entry when dependencies are usable.",
      "The data plane matches destination bits against installed prefixes and chooses the longest matching prefix, then forwards using that entry.",
      "If no usable entry matches, including no default, discard the packet; an error response is possible but not guaranteed."
    ],
    example: {
      given: "FIB: 0.0.0.0/0 via A, 10.0.0.0/8 via B, 10.2.0.0/16 via C. Destination is 10.2.7.9.",
      steps: ["The /0 matches every destination.", "The first 8 bits match 10/8; the first 16 match 10.2/16.", "Among matching entries, 16 is the longest prefix length, so choose C."],
      result: "Forward via C, even if the default route's protocol metric is smaller."
    },
    failure: "A route can exist in the RIB while absent or unusable in the FIB because its next hop cannot be resolved. Looking only at learned routes misses this failure.",
    confusions: ["Longest-prefix match compares prefix specificity, not path costs across unrelated prefixes.", "The data plane forwards packets; the control plane's protocol packets help build its decisions."],
    observe: "Compare a router's route database, forwarding table and adjacency state. On Linux, ip route get 10.2.7.9 shows the local selected forwarding decision, not every transit router's decision.",
    interview: { answer: "The control plane computes routes; the data plane uses the FIB and longest-prefix match to forward packets.", followups: ["Why can a RIB entry fail to install?", "How can an aggregate hide a missing specific route?"] },
    recall: [{ question: "What does RIB stand for?", answer: "Routing information base." }, { question: "What wins among matching FIB prefixes?", answer: "The longest prefix." }],
    tasks: [
      { kind: "Predict", prompt: "Remove the /16 in the example. Where does 10.2.7.9 go?", hint: "Re-evaluate all remaining matches.", answer: "Via B using 10/8.", reasoning: "The /8 remains more specific than the default /0." },
      { kind: "Diagnose", prompt: "A selected RIB route has no FIB entry. What dependency should you inspect first?", hint: "Forwarding needs a reachable immediate neighbor.", answer: "Next-hop resolution and outgoing adjacency/interface state.", reasoning: "A route candidate alone does not supply a usable packet forwarding action." }
    ],
    sources: ["systems", "cidr"], advanced: "FIB updates can lag control-plane changes, and recursive next-hop resolution can depend on other routes. Hardware capacity, policy and update ordering may cause transient differences; a route display is not proof that a packet crossed the device.",
    diagram: "protocols/config -> RIB selection -> next-hop resolution -> FIB\n                                                        ^\npacket -> destination -> longest-prefix lookup ----------+ -> interface"
  },
  {
    id: "static-default-metrics", module: "routing", title: "Static routes, defaults and metric boundaries",
    concepts: ["static-route", "default-route", "routing-metric", "route-preference", "floating-static-route"],
    prerequisites: ["forwarding-lookup"],
    meaning: "A static route is an operator-supplied destination and forwarding action. A default route is the least-specific fallback. Metrics rank paths according to a protocol's rules, not a universal quality scale.",
    why: "Small networks often need predictable routing without protocol exchanges. Larger networks need automatic choices, but cost values only make sense within the system that defines them.",
    model: "A default is a sign reading 'all other destinations this way,' not a list of every reachable network. A floating static is a backup sign enabled when the preferred route disappears; it cannot detect every remote failure by itself.",
    steps: [
      "Configure a prefix, next hop or interface, and optional tracking for a static route.",
      "For competing candidates for the same prefix, apply local route-source preference and the relevant protocol's path selection rules.",
      "Install the usable winner; a less-preferred floating static may become eligible if the preferred candidate is withdrawn.",
      "During packet lookup, apply longest-prefix match before using a default. A bad specific route is not normally bypassed merely because the default works."
    ],
    example: {
      given: "For 192.0.2.0/24, a dynamic route has local preference distance 110 and a configured backup static has 200. Default points to G.",
      steps: ["Under this device's lower-is-better route-source convention, 110 beats 200 for the same /24.", "Withdrawal of the dynamic candidate makes the usable backup static eligible.", "A packet to 198.51.100.7 matches neither /24 candidate and uses /0 via G."],
      result: "Dynamic first, backup static after withdrawal, and default only for otherwise unmatched destinations."
    },
    failure: "An untracked static next hop may remain locally reachable while its upstream path is broken. The static stays installed and blackholes traffic rather than triggering the backup.",
    confusions: ["Route-source preference is implementation/configuration dependent; it is not an Internet-wide metric.", "RIP hop count and OSPF cost cannot be compared numerically as though they share units."],
    observe: "Inspect configured static routes, tracking probes and the active candidate for one exact prefix. Verify the return path separately before blaming the default gateway.",
    interview: { answer: "Static routes are configured paths; defaults are fallback prefixes; metrics and source preferences select eligible candidates within defined boundaries.", followups: ["Why might a floating static never activate?", "Why does a specific blackhole beat a healthy default?"] },
    recall: [{ question: "What IPv4 prefix expresses a default?", answer: "0.0.0.0/0." }, { question: "What makes a static 'floating'?", answer: "Its deliberately less-preferred backup status." }],
    tasks: [
      { kind: "Predict", prompt: "A /24 discards traffic and /0 forwards. Which applies to an address inside /24?", hint: "Specificity still applies to discard actions.", answer: "The /24 discard.", reasoning: "Longest-prefix lookup does not search for the friendliest action." },
      { kind: "Compare", prompt: "Can RIP cost 3 prove a better path than OSPF cost 20?", hint: "Ask what the units and selection domain are.", answer: "No.", reasoning: "Different protocols define different metrics; local route preference resolves competing route sources." }
    ],
    sources: ["kr", "systems"], advanced: "Tracking and recursive resolution determine whether a configured route is eligible, while route preference determines whether it wins. Summarized defaults reduce state but can conceal partial reachability; validate failure behavior rather than assuming a backup configuration provides redundancy."
  },
  {
    id: "distance-vector-rip", module: "routing", title: "Distance vector, Bellman-Ford and RIP loops",
    concepts: ["distance-vector-routing", "bellman-ford", "rip", "routing-loop", "count-to-infinity", "split-horizon", "poison-reverse"],
    prerequisites: ["static-default-metrics"],
    meaning: "Distance-vector routers estimate destination cost using neighbors' advertised distances. Bellman-Ford says to choose the neighbor whose link cost plus advertised distance is smallest.",
    why: "A router can learn routes without holding a full network map. The tradeoff is that a neighbor's answer may depend on stale information originally learned from that very router.",
    model: "Ask nearby travelers their distance to a city, then add your distance to each traveler. They may be quoting one another rather than independent knowledge, so favorable numbers do not prove a working path.",
    steps: [
      "Maintain a distance and next hop per destination; initially know directly connected destinations.",
      "For each neighbor v, evaluate link-cost(u,v) + advertised-distance(v,d); choose the minimum eligible result.",
      "Advertise updated distances. Periodic and triggered updates propagate changes, but delivery and processing are asynchronous.",
      "RIP uses hop count, with 16 meaning unreachable. Split horizon suppresses routes back toward their source; poison reverse advertises them as unreachable instead."
    ],
    example: {
      given: "A has cost 1 to B and 4 to C. B advertises destination D at 3; C advertises D at 1.",
      steps: ["Via B, compute 1 + 3 = 4.", "Via C, compute 4 + 1 = 5.", "Choose B with distance 4. If B's actual path fails but C advertises stale information via A, their estimates can increase repeatedly."],
      result: "The initial best estimate is 4 via B; stale mutual dependence can count upward until an unreachable bound."
    },
    failure: "After a link fails, neighbors can mistakenly use one another as the alternative path. Packets loop while the advertised distance climbs: count-to-infinity.",
    confusions: ["An unreachable bound limits counting; it does not remove all transient loops.", "Poison reverse addresses simple mutual dependence, not every loop involving three or more routers."],
    observe: "In a lab, remove a destination link and record route updates, next hops and hop counts. RIP's small maximum diameter makes it inappropriate for many large modern networks.",
    interview: { answer: "Distance vector applies Bellman-Ford using neighbor distances; stale dependencies create loops and count-to-infinity, limited in RIP by infinity at 16.", followups: ["Why does bad news propagate slowly?", "Which loop can survive poison reverse?"] },
    recall: [{ question: "What is RIP's unreachable metric?", answer: "16." }, { question: "What quantity does Bellman-Ford minimize here?", answer: "Local link cost plus a neighbor's destination distance." }],
    tasks: [
      { kind: "Calculate", prompt: "B's advertised distance becomes 8. What route wins in the example?", hint: "Recompute both sums.", answer: "C at cost 5; B now costs 9.", reasoning: "The minimum changes from 4 to 5 because 1 + 8 exceeds 4 + 1." },
      { kind: "Diagnose", prompt: "Two neighbors increase their destination hop counts after a failure. What dependency is suspect?", hint: "Look at their next hops.", answer: "They may be learning the failed destination from each other.", reasoning: "Stale circular information creates count-to-infinity instead of independent reachability." }
    ],
    sources: ["rip", "kr", "systems"], advanced: "Bellman-Ford's convergence reasoning assumes stable costs and repeated information exchange; failures and asynchronous updates create a transient distributed-systems problem. Hold-down behavior and update timers vary by implementation, and TTL bounds a packet's looping lifetime rather than repairing the routing state."
  },
  {
    id: "link-state-dijkstra", module: "routing", title: "Link-state flooding and Dijkstra's calculation",
    concepts: ["link-state-routing", "link-state-database", "link-state-flooding", "dijkstra", "shortest-path-tree"],
    prerequisites: ["distance-vector-rip"],
    meaning: "A link-state router distributes descriptions of its own links, builds a topology database, and computes paths locally with Dijkstra. It learns a map rather than only neighbors' distance estimates.",
    why: "A shared topology view supports predictable least-cost calculations and richer hierarchy. Keeping that view synchronized requires flooding, freshness checks and computation resources.",
    model: "Every router redraws a map from signed-off local road reports. The maps can temporarily differ. Dijkstra finds shortest paths on the map it has, not necessarily on the network as it exists this instant.",
    steps: [
      "Discover neighbors and describe local links and their costs in protocol-specific link-state advertisements.",
      "Flood advertisements across the permitted scope; sequence and age information reject obsolete data and eventually remove stale entries.",
      "Run Dijkstra with nonnegative costs: settle the closest tentative node, then relax its outgoing edges.",
      "Translate the shortest-path tree into destination next hops and install selected routes."
    ],
    example: {
      given: "Edges: A-B=2, A-C=5, B-C=1, B-D=4, C-D=1. Compute from A.",
      steps: ["Settle A: tentative B=2 and C=5.", "Settle B at 2: improve C to 3 and set D=6.", "Settle C at 3: improve D to 4.", "Settle D at 4; D's path is A-B-C-D, first hop B."],
      result: "Shortest distances are B=2, C=3, D=4."
    },
    failure: "A delayed advertisement leaves one router calculating with an old link. Independently correct computations over inconsistent maps can cause transient forwarding loops.",
    confusions: ["Flooding distributes topology information; it is not flooding user packets to find a destination.", "A shortest-path tree from A need not be the same tree rooted at B."],
    observe: "Compare neighbor state, database versions and computed routes before inspecting the FIB. A missing adjacency or stale database explains more than simply rerunning the shortest-path calculation.",
    interview: { answer: "Link state floods local topology facts; each router runs Dijkstra on its database to derive least-cost next hops.", followups: ["What does edge relaxation do?", "Why can converging link-state routers still loop?"] },
    recall: [{ question: "What does an LSDB contain?", answer: "Protocol-scoped link-state topology information." }, { question: "Which tentative node does Dijkstra settle next?", answer: "The one with the smallest tentative distance." }],
    tasks: [
      { kind: "Calculate", prompt: "Change C-D to 10. What is A's shortest path to D?", hint: "Compare A-B-D against A-B-C-D.", answer: "A-B-D, cost 6.", reasoning: "2 + 4 = 6 beats 2 + 1 + 10 = 13." },
      { kind: "Compare", prompt: "What does a link-state neighbor advertise that differs from distance vector?", hint: "Map facts versus destination estimates.", answer: "Its local links and costs, rather than merely its best destination distances.", reasoning: "The receiver computes paths from topology instead of trusting a neighbor's end-to-end estimate." }
    ],
    sources: ["ospf", "systems"], advanced: "Database synchronization, flooding scope and route installation are distinct convergence stages. Equal-cost paths can produce multiple next hops rather than one tree edge; implementation throttling limits computation storms but also changes restoration time."
  },
  {
    id: "ospf-isis-hierarchy", module: "routing", title: "OSPF and IS-IS inside an autonomous system",
    concepts: ["ospf", "ospf-area", "ospf-backbone", "ospf-adjacency", "ospf-designated-router", "is-is", "is-is-levels"],
    prerequisites: ["link-state-dijkstra"],
    meaning: "OSPF and IS-IS are link-state interior routing protocols. Their hierarchy contains topology detail so a large administrative network does not require every router to flood every local change.",
    why: "Large domains need controlled database size and failure scope. Hierarchy reduces detail but introduces boundary design, summarization and backbone reachability requirements.",
    model: "Use detailed street maps within a district and summaries between districts. Summaries save space but cannot reveal every closed street. OSPF areas and IS-IS levels are related tools, not identical architectures.",
    steps: [
      "Establish neighbor relationships with compatible parameters; adjacency synchronization exchanges the relevant link-state database.",
      "In OSPFv2, calculate within an area; area border routers connect areas through backbone area 0 and originate inter-area reachability.",
      "On suitable OSPF broadcast networks, designated and backup designated routers reduce adjacency overhead; they are not mandatory data-path gateways.",
      "In IS-IS, Level 1 handles intra-area routing and Level 2 connects areas; L1/L2 routers bridge the hierarchy. IS-IS routing messages run directly over the link layer."
    ],
    example: {
      given: "An OSPF area router reaches border router X at cost 7. X advertises a remote-area prefix with summary cost 12.",
      steps: ["Use the intra-area database to find X at cost 7.", "Add the advertised inter-area cost 12: total 19.", "Install the first hop toward X, assuming route type and other protocol rules permit this candidate."],
      result: "The candidate cost is 19; the local router need not know every link in the remote area."
    },
    failure: "Mismatched area identifiers, authentication, network type or relevant parameters can prevent adjacency. A neighbor merely appearing in a discovery list does not prove full database synchronization.",
    confusions: ["OSPF's designated router coordinates control exchanges, not all transit forwarding.", "Two non-designated routers on an OSPF broadcast network can intentionally remain 2-WAY rather than form a full adjacency.", "OSPFv2 describes IPv4 operation; OSPFv3 has different packet/address-family details."],
    observe: "Inspect adjacency state and area/level membership, then database and route type. Check configuration on both ends instead of assuming ping reachability proves protocol compatibility.",
    interview: { answer: "OSPF uses areas and a backbone; IS-IS uses Level 1/Level 2 hierarchy. Both flood link state and compute interior least-cost paths.", followups: ["Why avoid excessive area fragmentation?", "What does a designated router actually reduce?"] },
    recall: [{ question: "What is OSPF's backbone area number?", answer: "0." }, { question: "Which IS-IS level provides inter-area connectivity?", answer: "Level 2." }],
    tasks: [
      { kind: "Calculate", prompt: "A second border router costs 9 to reach and advertises cost 8 for the same eligible inter-area prefix. Which total is smaller?", hint: "Add internal and summary costs.", answer: "The second, at 17 rather than 19.", reasoning: "9 + 8 beats 7 + 12 when candidates are otherwise comparable." },
      { kind: "Diagnose", prompt: "An OSPF neighbor is visible but never fully synchronizes. Is the shortest-path algorithm the first suspect?", hint: "Calculation follows database exchange.", answer: "No; inspect adjacency and database-exchange compatibility first.", reasoning: "Dijkstra cannot repair a relationship that never provides synchronized topology." }
    ],
    sources: ["ospf", "isis", "systems"], advanced: "OSPF route types and external-route rules are not reducible to one flat cost comparison. IS-IS's extensible information encoding and OSPF's versioned address-family support have deployment-specific tradeoffs; administrative design and operational familiarity matter more than claiming one protocol always converges faster."
  },
  {
    id: "bgp-business-relationships", module: "routing", title: "BGP, autonomous systems, peering and transit",
    concepts: ["autonomous-system", "bgp", "ebgp", "ibgp", "internet-peering", "internet-transit", "bgp-export-policy"],
    prerequisites: ["ospf-isis-hierarchy"],
    meaning: "An autonomous system is a routing administration identified by an AS number. BGP exchanges reachability between and within these administrations, subject to business and engineering policy.",
    why: "The Internet has no single operator minimizing one global distance. Networks choose who carries their traffic and which customers or partners may use their connectivity.",
    model: "BGP is a directory of acceptable commercial roads. Peering exchanges agreed traffic between networks; transit buys broader reachability. Neither relationship guarantees free service, symmetry or a physical direct cable.",
    steps: [
      "Establish BGP sessions: eBGP usually joins different ASes; iBGP distributes BGP information inside one AS.",
      "Import announced prefixes under local filters and preferences; reject unacceptable reachability.",
      "Select eligible routes and ensure their next hops are reachable using the local network.",
      "Export selected information according to relationships. A common policy exports customer routes broadly but does not give one peer free transit to another peer."
    ],
    example: {
      given: "AS65010 has customer C, peer P and paid provider T. It learns prefix X from P and prefix Y from C.",
      steps: ["Import X and Y if filters allow them.", "Under a common customer/peer/provider policy, advertise customer prefix Y to P and T.", "Do not advertise peer-learned X to T or another peer; customers may receive broader routes."],
      result: "Export choices follow relationship policy, not shortest physical distance."
    },
    failure: "An accidental export of a provider-learned full table to a peer can create a route leak. Sessions remain healthy while unintended traffic crosses the leaking AS.",
    confusions: ["iBGP is not the interior least-cost protocol; it carries BGP reachability internally.", "A BGP session running over TCP does not prove the announced destinations are reachable."],
    observe: "Inspect neighbor relationships, imported routes and advertised routes separately. Correlate selected next hops with actual traffic and upstream agreements.",
    interview: { answer: "BGP joins administrative networks using reachability and policy; peering and transit determine which paths may be used and exported.", followups: ["Why would a longer AS path be preferred?", "How does a route leak differ from a failed session?"] },
    recall: [{ question: "What does eBGP usually connect?", answer: "Different autonomous systems." }, { question: "What does transit generally provide?", answer: "Paid broader network reachability." }],
    tasks: [
      { kind: "Predict", prompt: "With the example policy, should P receive a route learned from T?", hint: "Would that provide unpaid transit?", answer: "Normally no.", reasoning: "Provider-to-peer export would let the peer use the AS as transit contrary to that relationship policy." },
      { kind: "Compare", prompt: "Why isn't BGP equivalent to OSPF across the Internet?", hint: "Compare administration and optimization goals.", answer: "BGP selects policy-acceptable interdomain paths; OSPF computes interior least-cost routes.", reasoning: "Independent organizations do not share one trusted topology or objective function." }
    ],
    sources: ["bgp", "global"], advanced: "Common valley-free commercial policies are conventions, not protocol requirements. Route servers, private agreements and partial transit complicate them. iBGP needs deliberate dissemination design because ordinary iBGP-learned routes are not simply re-advertised to every other iBGP peer."
  },
  {
    id: "bgp-path-policy", module: "routing", title: "BGP attributes and policy before path length",
    concepts: ["bgp-local-preference", "bgp-as-path", "bgp-next-hop", "bgp-med", "bgp-community", "bgp-route-selection", "bgp-as-loop-detection"],
    prerequisites: ["bgp-business-relationships"],
    meaning: "BGP attributes describe a route and influence policy selection. AS_PATH length is one consideration; local policy can deliberately choose a longer path.",
    why: "An operator may prefer customer traffic, avoid an expensive provider or steer entry points. Geographic distance and hop count alone cannot encode those objectives.",
    model: "Rank travel offers by eligibility and your priorities before considering itinerary length. Route attributes are inputs, not a universal ordered list identical on every router.",
    steps: [
      "Filter candidate routes and check next-hop usability. Reject an ordinary received AS_PATH containing your own AS to prevent inter-AS routing loops.",
      "Apply import policy, often assigning LOCAL_PREF inside the AS; higher values express a stronger local preference.",
      "Apply the platform's remaining selection rules, including AS_PATH and, in appropriate comparison scopes, MED. MED usually suggests a preferred entry among links to one neighboring AS.",
      "Use communities as policy labels when configured rules interpret them; export attributes under eBGP/iBGP rules and install the selected forwarding path."
    ],
    example: {
      given: "Route A: LOCAL_PREF 200, AS_PATH 65020 65030 65040. Route B: LOCAL_PREF 100, AS_PATH 65050. Both are eligible for the same prefix.",
      steps: ["Compare local preferences: 200 is higher than 100.", "Choose A before the shorter AS_PATH of B can win under this policy.", "Resolve A's NEXT_HOP through interior routing to obtain a usable forwarding adjacency."],
      result: "A wins despite three AS entries versus one."
    },
    failure: "A wrong local-preference rule can send all outbound traffic through a saturated provider. A community tag has no effect if no configured policy consumes it.",
    confusions: ["AS_PATH length measures AS entries, not routers, fiber distance or latency.", "MED comparisons across different neighboring ASes are configuration dependent, not a safe default assumption."],
    observe: "Read all paths for one prefix and the stated selection reason. Verify received attributes, policy transformations and next-hop reachability rather than inferring policy from traceroute alone.",
    interview: { answer: "BGP first enforces eligibility and policy; attributes such as LOCAL_PREF, AS_PATH, NEXT_HOP, MED and communities shape selection and export.", followups: ["Why does AS prepending sometimes have no effect?", "When might a reachable BGP peer advertise an unusable next hop?"] },
    recall: [{ question: "Which LOCAL_PREF value is preferred?", answer: "The higher value." }, { question: "What ordinary AS_PATH condition indicates a loop?", answer: "The local AS already appears in the received path." }],
    tasks: [
      { kind: "Predict", prompt: "Prepend three AS entries to A in the example without changing LOCAL_PREF. Does B necessarily win?", hint: "Consider comparison order.", answer: "No; A still wins under the stated preference-first policy.", reasoning: "Changing a later tie-break input does not override a decisive earlier policy choice." },
      { kind: "Diagnose", prompt: "A community requesting low preference changes no traffic. What should you check?", hint: "Labels need an interpreter.", answer: "Whether the recipient's import policy recognizes and acts on that community.", reasoning: "The attribute alone does not execute a forwarding instruction." }
    ],
    sources: ["bgp", "global"], advanced: "Exact selection order, MED scope and multipath eligibility vary by implementation and configuration. LOCAL_PREF generally remains inside an AS; communities can intentionally communicate policy requests across boundaries. AS-loop checks are not authentication of every advertised path."
  },
  {
    id: "routing-convergence-ecmp", module: "routing", title: "Convergence, redundancy and ECMP",
    concepts: ["routing-convergence", "routing-redundancy", "equal-cost-multipath", "flow-hashing", "routing-microloop", "fast-reroute"],
    prerequisites: ["bgp-path-policy", "link-state-dijkstra"],
    meaning: "Convergence is the process of detecting change, distributing information, choosing routes and updating forwarding. Redundancy supplies alternatives; ECMP can use multiple equally eligible paths at once.",
    why: "A second link is useful only if failures are detected and traffic can move to a usable alternative. Sharing paths also increases capacity, but balancing traffic is not the same as balancing bytes perfectly.",
    model: "Several checkout lanes provide alternatives, while hashing assigns each shopper to a lane. One enormous shopping cart can dominate a lane even when shopper counts look balanced.",
    steps: [
      "Detect loss of adjacency or reachability using link state, protocol timers or explicitly configured detection mechanisms.",
      "Propagate the change and recompute/select routes; install new forwarding entries, possibly at different times on different routers.",
      "For ECMP-eligible candidates, install several next hops and commonly hash packet flow fields to preserve ordering within a flow.",
      "On failure, remove unusable members and redistribute affected traffic; precomputed fast-reroute mechanisms may provide an earlier local detour."
    ],
    example: {
      given: "Two equal 10-Gbit/s paths serve four flows: 8, 1, 1, 1 Gbit/s. Hashing assigns the first two to A and the last two to B.",
      steps: ["A carries 8 + 1 = 9 Gbit/s.", "B carries 1 + 1 = 2 Gbit/s.", "Both have two flows, but their byte loads differ by 7 Gbit/s."],
      result: "ECMP does not guarantee equal utilization or allow one conventional hashed flow to consume 20 Gbit/s."
    },
    failure: "Routers update inconsistently during convergence and briefly point toward each other. Physical redundancy does not prevent this microloop or shared-risk failures affecting both paths.",
    confusions: ["Equal cost means equal under routing eligibility rules, not equal latency or bandwidth.", "Per-packet spreading can use more paths but may cause reordering; per-flow hashing usually avoids that tradeoff."],
    observe: "Measure failure detection, control updates and restored traffic separately. Test multiple flows and inspect per-member counters; one throughput test cannot characterize an ECMP bundle.",
    interview: { answer: "Convergence restores consistent forwarding after change; redundancy and ECMP offer alternatives but need detection, usable paths and careful traffic distribution.", followups: ["Why can two diverse interfaces share one failure risk?", "How does resilient hashing reduce disruption?"] },
    recall: [{ question: "What does ECMP expand to?", answer: "Equal-cost multipath." }, { question: "Why hash by flow?", answer: "To keep a flow on a consistent path and reduce reordering." }],
    tasks: [
      { kind: "Calculate", prompt: "Detection takes 50 ms, route processing 20 ms and installation 10 ms sequentially. What is restoration time in this simplified model?", hint: "Sum the stages.", answer: "80 ms.", reasoning: "50 + 20 + 10 = 80; overlapping work or remote convergence can change real timing." },
      { kind: "Diagnose", prompt: "A single transfer remains near 10 Gbit/s over two 10-Gbit/s ECMP paths. Is the bundle necessarily broken?", hint: "Consider the unit of hashing.", answer: "No; one flow may remain on one path.", reasoning: "Multiple next hops do not imply packet striping for an individual flow." }
    ],
    sources: ["systems", "ospf"], advanced: "Fast reroute protects only failures covered by its precomputed alternatives. Hash changes can move healthy flows during membership updates, and convergence may differ between prefixes. Compare packet loss and reordering during failover rather than reporting only the final route table."
  },
  {
    id: "reliable-arq-sequence", module: "reliable", title: "Reliability across loss, corruption and duplicates",
    concepts: ["automatic-repeat-request", "reliable-sequence-number", "duplicate-suppression", "corruption-detection"],
    prerequisites: [],
    meaning: "End-to-end reliability applies error detection, acknowledgments and retransmission between the communicating endpoints, beyond any individual reliable link. Retries recover missing information; sequence identities prevent a recovered copy from becoming duplicate delivered data.",
    why: "A frame crossing one link successfully can still be lost at a later router or endpoint. Both end-to-end data and acknowledgments can disappear, so endpoints must retain enough state to distinguish retries from new delivery.",
    model: "Send numbered envelopes and keep each until a receipt arrives. A missing receipt does not prove the envelope was missing. Numbering must have a lifetime rule; reusing a number too soon makes old envelopes ambiguous.",
    steps: [
      "Attach an integrity check and sequence identity to each unit. The receiver discards detected corruption rather than accepting damaged content.",
      "Retain sent content until the destination endpoint confirms acceptance, not merely until the next-hop link acknowledges a frame. The familiar stop-and-wait exchange below isolates why lost end-to-end confirmation matters.",
      "If no acceptable acknowledgment arrives before timeout, retransmit the same identified unit.",
      "The receiver delivers a new valid unit once, acknowledges duplicate retries without redelivering them, and advances expected sequence state."
    ],
    example: {
      given: "Alternating-bit stop-and-wait expects sequence 0. Data 0 arrives intact, but its ACK is lost.",
      steps: ["Receiver delivers data 0 and changes its expected bit to 1.", "Sender times out and sends data 0 again.", "Receiver sees old bit 0, sends another acknowledgment but does not deliver it again.", "Sender receives the receipt and proceeds with sequence 1."],
      result: "One delivery despite two arrivals; acknowledgment loss caused unnecessary transmission, not duplicate delivery."
    },
    failure: "If the receiver forgets its sequence state during a restart, a retry can look new. Checksums detect many accidental errors but have finite undetected-error probability and are not adversarial authentication.",
    confusions: ["A timeout is evidence of missing confirmation, not proof of data loss.", "A reliable exchange can still terminate with failure if retries, deadlines or endpoint availability run out."],
    observe: "Use a controlled lab loss injector and trace both directions. Count received copies separately from application deliveries; an ACK loss can explain retransmission with no forward-path loss.",
    interview: { answer: "Reliable protocols detect damage, acknowledge accepted data, retry missing confirmations and use sequence identities to suppress duplicate delivery.", followups: ["How can ACK loss produce duplicates?", "When is a one-bit sequence space insufficient?"] },
    recall: [{ question: "What does ARQ stand for?", answer: "Automatic repeat request." }, { question: "Why preserve identity during a retry?", answer: "So the receiver recognizes the same data rather than a new delivery." }],
    tasks: [
      { kind: "Predict", prompt: "Data arrives correctly but every ACK is lost. Will the sender confidently finish?", hint: "Separate receiver knowledge from sender knowledge.", answer: "No; it will retry or eventually fail under its retry policy.", reasoning: "Receiver acceptance alone does not provide the sender with confirmation." },
      { kind: "Diagnose", prompt: "A receiver delivers the same numbered unit twice after one lost ACK. What mechanism is missing?", hint: "Retransmission itself was expected.", answer: "Duplicate suppression using remembered receive sequence state.", reasoning: "The retry must be acknowledged without being treated as new content." }
    ],
    sources: ["reliable", "kr"], advanced: "The alternating-bit example inherits the foundation protocol's bounded old-packet lifetime and one-outstanding-unit assumptions; an end-to-end path can retain delayed copies across many hops. Endpoint restarts and new connection incarnations therefore need larger sequence spaces, lifetime protections or epochs. Transport-level duplicate suppression still does not deduplicate new application requests sent after reconnecting."
  },
  {
    id: "reliable-windows-acks", module: "reliable", title: "Pipelines, cumulative ACKs and selective reassembly",
    concepts: ["reliable-pipelining", "cumulative-acknowledgment", "selective-acknowledgment", "out-of-order-reassembly", "receive-buffer-limit", "sequence-space-wrap"],
    prerequisites: ["reliable-arq-sequence"],
    meaning: "End-to-end pipelining keeps several units outstanding across the entire path. Cumulative acknowledgments confirm a continuous prefix; selective acknowledgments describe additional received ranges beyond a gap, without promising application consumption.",
    why: "The foundation sliding-window mechanism avoids stop-and-wait idle time. Across multiple hops, however, changing round-trip delay, reordering and application read speed make feedback interpretation and bounded endpoint storage separate design problems.",
    model: "An assembly desk can hold pages arriving out of order, yet can hand over an ordered document only through the first missing page. Shelf capacity limits how far ahead the sender may work.",
    steps: [
      "Permit transmission within an advertised or negotiated window while retaining unconfirmed units.",
      "On arrival, validate sequence range and place acceptable out-of-order data into bounded reassembly storage.",
      "Report the next missing position with a cumulative ACK; optionally also report selectively received ranges.",
      "Recover gaps, release newly contiguous data, and advance the window as application consumption frees storage.",
      "Separate receipt from consumption: data buffered at the destination can be acknowledged while the application remains slow. End-to-end credit must reflect bounded endpoint storage, not a successful frame acknowledgment from an intermediate hop."
    ],
    example: {
      given: "Units 1-4 are sent; 1, 3 and 4 arrive, while 2 is lost. Define ACK n as 'next expected unit n.'",
      steps: ["After unit 1, send cumulative ACK 2.", "Store 3 and 4; cumulative ACK remains 2, while selective feedback can identify 3-4.", "Retransmit 2; the contiguous prefix now extends through 4.", "Advance the cumulative ACK to 5 and release ordered units 2-4."],
      result: "Selective information avoids resending received units, but does not erase the missing gap."
    },
    failure: "A sender overrunning receiver limits can cause drops even with a healthy path. Unlimited out-of-order buffering is not a safe reliability design.",
    confusions: ["Cumulative acknowledgment does not say all later data was lost.", "Foundation selective-repeat and go-back-N protocols illustrate recovery choices; selective transport feedback is not by itself a claim that the whole transport implements either textbook algorithm.", "An acknowledgment from one link does not establish receipt at the final transport endpoint."],
    observe: "Plot sequence arrivals, ACK advancement and reassembly occupancy during induced reordering. Distinguish reordered data from a confirmed loss before interpreting retry counters.",
    interview: { answer: "Pipelining improves utilization; cumulative ACKs confirm the ordered prefix, and selective feedback identifies received islands while bounded reassembly waits for gaps.", followups: ["Why does sequence-space size constrain the window?", "What happens when the application stops consuming?"] },
    recall: [{ question: "What does a cumulative ACK cover?", answer: "A contiguous accepted prefix." }, { question: "What does selective acknowledgment add?", answer: "Information about received ranges beyond a gap." }],
    tasks: [
      { kind: "Predict", prompt: "Unit 5 arrives before missing unit 2. Does the cumulative ACK become 6?", hint: "The first gap still matters.", answer: "No; it remains 2 under the example convention.", reasoning: "Receiving later units cannot establish that the prefix through unit 5 is complete." },
      { kind: "Calculate", prompt: "A pipeline holds 8 units of 1,000 bytes. How much payload may be outstanding?", hint: "Multiply window slots by unit size.", answer: "8,000 bytes.", reasoning: "Eight outstanding units each contribute 1,000 payload bytes; this excludes headers." }
    ],
    sources: ["reliable", "stanford"], advanced: "Foundation window/sequence-space constraints remain relevant, but production transports additionally compare wrapping byte ranges and protect against delayed data from earlier connection incarnations. Receiver memory pressure may permit reneging on selectively reported data, so selective receipt evidence need not authorize the sender to discard every reported range. Cumulative confirmation and application consumption remain distinct milestones."
  },
  {
    id: "rtt-retransmission-timers", module: "reliable", title: "RTT estimates, uncertainty and retransmission timers",
    concepts: ["round-trip-time-estimation", "retransmission-timeout", "rtt-variation", "karn-algorithm", "exponential-retransmission-backoff"],
    prerequisites: ["reliable-windows-acks"],
    meaning: "A retransmission timer estimates how long to wait for confirmation. It must accommodate both typical round-trip time and uncertainty, rather than equaling the latest sample.",
    why: "Too short a timer creates spurious retries; too long a timer delays recovery. Paths, queues and receiver acknowledgment behavior change, so a fixed delay is usually inadequate.",
    model: "Set a delivery reminder using expected travel time plus a variability cushion. A late receipt cannot always tell you which attempt arrived, so some timing observations must be excluded.",
    steps: [
      "Measure an unambiguous send-to-ACK sample; do not normally sample retransmitted data when the ACK cannot identify which transmission it acknowledges.",
      "Smooth the RTT and absolute deviation. In the conventional TCP estimator, update deviation using the old smoothed RTT before updating the mean.",
      "Derive an RTO from smoothed RTT plus a variation term, respecting timer granularity and protocol/implementation bounds.",
      "On timeout, retransmit as appropriate and exponentially back off the timer; later valid samples can refine the estimate."
    ],
    example: {
      given: "Illustrative estimator: SRTT=100 ms, RTTVAR=20 ms, new sample=140 ms, alpha=1/8, beta=1/4, negligible granularity.",
      steps: ["Deviation sample is |100 - 140| = 40 ms.", "RTTVAR becomes 0.75 x 20 + 0.25 x 40 = 25 ms.", "SRTT becomes 0.875 x 100 + 0.125 x 140 = 105 ms.", "Raw RTO is 105 + 4 x 25 = 205 ms, before mandated bounds."],
      result: "The arithmetic estimate is 205 ms; an RFC-style one-second lower bound would produce 1,000 ms instead."
    },
    failure: "Sampling an ambiguous retransmitted exchange can artificially shorten or lengthen the estimate and trigger a cascade of unnecessary retries.",
    confusions: ["RTO is not simply RTT; it includes uncertainty and bounds.", "Karn's exclusion avoids ambiguous samples; appropriate timestamp-based measurements can remove some ambiguity."],
    observe: "In a trace, correlate original transmissions, retries and ACKs. Linux ss -ti can expose RTT and timer information, but values depend on kernel and congestion-control implementation.",
    interview: { answer: "Retransmission timers smooth RTT, account for variation, avoid ambiguous samples and back off after timeouts to balance timely recovery against spurious retransmission.", followups: ["Why update variation with the old mean?", "How do timestamps help distinguish timing samples?"] },
    recall: [{ question: "What uncertainty term commonly appears in the raw TCP RTO?", answer: "Four times the RTT variation estimate." }, { question: "What does exponential backoff do?", answer: "Increases the retry timeout multiplicatively, commonly by doubling." }],
    tasks: [
      { kind: "Calculate", prompt: "A current 1-second RTO backs off twice by doubling. What is the next interval?", hint: "Apply two multiplications.", answer: "4 seconds.", reasoning: "1 x 2 x 2 = 4, before any maximum timer cap." },
      { kind: "Diagnose", prompt: "An ACK arrives after the same data was sent twice. Why exclude this sample without distinguishing timestamps?", hint: "Which send time should start the clock?", answer: "The ACK may correspond to either transmission.", reasoning: "An ambiguous starting time gives an unreliable RTT observation." }
    ],
    sources: ["tcp", "quicloss", "systems"], advanced: "Conventional TCP RTO calculation is further specified by RFC 6298; platform lower bounds and later loss-recovery mechanisms differ. QUIC's probe timeout is not a direct copy of TCP RTO: it uses packet-number spaces and acknowledgment-delay rules. A timer expiring is a suspicion, not a measurement of where loss occurred."
  },
  {
    id: "delivery-business-semantics", module: "reliable", title: "Transport acceptance is not business completion",
    concepts: ["transport-delivery-semantics", "application-completion-ack", "exactly-once-misconception", "idempotency-key", "durable-deduplication", "retry-ambiguity"],
    prerequisites: ["reliable-arq-sequence"],
    meaning: "Transport confirmation says something about peer transport receipt, not whether a purchase, database update or job completed. Reliability at one layer does not automatically provide exactly-once business effects.",
    why: "A server can accept bytes, commit a change and crash before replying. The client must decide whether to retry without knowing which stage completed.",
    model: "A courier's receipt is not a cashier's completed transaction. A transaction identifier can connect retries to one operation, but only if the server remembers it durably and coordinates it with the effect.",
    steps: [
      "Send an application request carrying a stable operation identity when retries must represent the same intent.",
      "The server validates and applies the operation, ideally atomically recording the identity and result with the durable business effect.",
      "Return an application-level completion result. Distinguish accepted, queued, committed and externally settled outcomes.",
      "After an ambiguous disconnect, retry with the same identity or query operation status; never infer nonexecution solely from a missing response."
    ],
    example: {
      given: "Balance is 100 units. Request K adds 30. The server commits balance 130 but its response is lost.",
      steps: ["A transport ACK cannot tell the client whether the balance update committed.", "Retrying a new unrecognized operation adds another 30, producing 160.", "Retrying K against an atomic durable deduplication record returns K's prior result without another addition."],
      result: "A coordinated idempotency design preserves balance 130; transport reliability alone does not."
    },
    failure: "Recording a deduplication key after, rather than atomically with, the effect leaves a crash window. A retry can repeat the effect even though a key mechanism exists.",
    confusions: ["TCP duplicate-byte suppression is not deduplication of two newly sent requests.", "Exactly-once claims require a defined effect, scope and failure assumptions, not merely reliable transport."],
    observe: "Correlate request IDs with server commit logs and responses. A successful local send or packet ACK cannot substitute for an application status check.",
    interview: { answer: "Transport receipt is not business completion; retries need application identities and durable, coordinated deduplication to avoid repeating effects after ambiguous failures.", followups: ["What crash window does atomic recording close?", "How long must a server retain a deduplication record?"] },
    recall: [{ question: "Does a TCP ACK prove a transaction committed?", answer: "No." }, { question: "Should a retry of the same intent reuse its idempotency key?", answer: "Yes, within the application's defined identity scope." }],
    tasks: [
      { kind: "Predict", prompt: "The server crashes after committing but before replying. May the client safely assume nothing happened?", hint: "Response delivery is a later event.", answer: "No.", reasoning: "The effect may be durable while its confirmation never reached the client." },
      { kind: "Compare", prompt: "Compare transport duplicate suppression with durable request deduplication.", hint: "Identify the unit each recognizes.", answer: "Transport recognizes repeated sequence data; application deduplication recognizes repeated business operation identities.", reasoning: "Two fresh byte-stream requests have different transport positions even when they request the same effect." }
    ],
    sources: ["tcp", "systems", "http"], advanced: "Deduplication retention, key reuse, tenant scope and result persistence are part of the contract. External effects such as payments or email may require another coordinated identity at the downstream service. 'Exactly once' is meaningful only inside explicitly specified boundaries; arbitrary failure and unbounded retries defeat a vague global guarantee."
  },
  {
    id: "ports-multiplexing", module: "transport", title: "Ports, endpoints and transport demultiplexing",
    concepts: ["transport-port", "transport-multiplexing", "transport-demultiplexing", "tcp-four-tuple", "listening-endpoint", "ephemeral-port"],
    prerequisites: [],
    meaning: "Ports distinguish transport endpoints on an address. Multiplexing lets many applications share a host's network interface; demultiplexing directs received traffic to the appropriate socket or connection.",
    why: "An IP destination identifies a host interface, not which service or client conversation should receive data. Servers must also distinguish many clients contacting the same service port.",
    model: "An address gets you to an office building; a port helps select a desk, and a connection tuple identifies a conversation. The analogy stops at security: a desk number does not authenticate who is speaking.",
    steps: [
      "An application binds a local endpoint, explicitly or through automatic ephemeral-port assignment.",
      "The operating system adds transport port fields and IP addresses to outgoing packets.",
      "Incoming traffic is classified by transport protocol and endpoint rules. An established TCP connection is identified by local/remote addresses and ports.",
      "A listening TCP socket can create many accepted connections sharing its local service port; UDP socket selection has binding and platform-specific reuse rules."
    ],
    example: {
      given: "Clients 192.0.2.10:51000 and 192.0.2.11:51000 contact TCP 198.51.100.5:443.",
      steps: ["Both packets target the same server address and port.", "Their remote addresses differ, so the two four-tuples differ.", "The listener accepts two separate connection states without needing a new server service port."],
      result: "One service endpoint supports two distinguishable TCP conversations."
    },
    failure: "A port collision can prevent binding; ephemeral-port exhaustion can prevent new outgoing connections. An open port alone does not establish service correctness or remote accessibility.",
    confusions: ["TCP port 53 and UDP port 53 are distinct transport namespaces.", "Ports identify endpoints, not permanent application identity; configuration can place different services on the same numeric port."],
    observe: "Use ss -lnt and ss -nt to distinguish listeners from established TCP sockets. Check both address binding and protocol when a service is reachable on one interface but not another.",
    interview: { answer: "Ports multiplex host traffic among endpoints, while TCP's address-and-port four-tuple distinguishes established conversations sharing a service port.", followups: ["Why can clients reuse the same numeric source port on different hosts?", "How do wildcard binds affect endpoint matching?"] },
    recall: [{ question: "How wide is a transport port field?", answer: "16 bits." }, { question: "What distinguishes TCP conversations at one service port?", answer: "Their complete local/remote address-and-port tuples." }],
    tasks: [
      { kind: "Predict", prompt: "Two clients on one host use source ports 51000 and 51001 to the same server:443. Can both connect?", hint: "Compare the complete tuples.", answer: "Yes, subject to ordinary resources and policy.", reasoning: "Different local ports create distinct established TCP tuples." },
      { kind: "Diagnose", prompt: "A UDP listener exists on port 9000, but a TCP probe fails. Does that prove the listener is down?", hint: "Transport protocol is part of classification.", answer: "No; the probe tests a different transport namespace.", reasoning: "A UDP endpoint is not a TCP listening socket." }
    ],
    sources: ["tcp", "udp", "linux"], advanced: "Address families, network namespaces, wildcard binds and socket-reuse settings affect matching. NAT may rewrite observed tuples, and QUIC identifies connections beyond a stable UDP tuple. Never treat a visible port as proof of authorization or an application-level readiness guarantee."
  },
  {
    id: "udp-datagrams-checksum", module: "transport", title: "UDP datagrams and checksum boundaries",
    concepts: ["udp", "udp-datagram", "udp-header", "udp-checksum", "internet-checksum", "transport-pseudo-header", "udp-message-boundary"],
    prerequisites: ["ports-multiplexing"],
    meaning: "UDP carries independent datagrams with ports, length and a checksum field. It preserves datagram boundaries but does not itself provide retransmission, ordered delivery or connection establishment.",
    why: "Some applications prefer to manage deadlines, loss recovery and message semantics themselves. A smaller transport contract avoids imposing ordered-stream behavior, but leaves important responsibilities to the application.",
    model: "Each datagram is a postcard, not a page in a reconstructed book. Missing or reordered postcards remain missing or reordered unless another protocol supplies recovery.",
    steps: [
      "Create one datagram with an 8-byte UDP header containing source port, destination port, length and checksum.",
      "Calculate the checksum over the pseudo-header, UDP header and payload; the pseudo-header includes IP addressing and protocol information to help detect misdelivery.",
      "Send through IP. Network MTU, fragmentation behavior and path filtering can affect delivery independently of UDP.",
      "The receiver checks validity and hands an available datagram to a matching socket. A too-small application buffer may truncate data under platform API rules rather than reconstructing it later."
    ],
    example: {
      given: "Send 20 payload bytes over UDP/IPv4 with a 20-byte IPv4 header and no options.",
      steps: ["UDP length is 8 + 20 = 28 bytes.", "The IP packet length is 20 + 28 = 48 bytes.", "Two such sends create two datagrams; receipt may be reversed, duplicated or absent."],
      result: "48 network-layer bytes per packet before link overhead, with no UDP ordering or recovery promise."
    },
    failure: "A checksum-valid datagram may never arrive, arrive too late or be dropped by a full socket buffer. Integrity checking is not delivery assurance.",
    confusions: ["UDP is not universally faster; application recovery, congestion and path support can dominate.", "IPv4 UDP can conventionally indicate no checksum with zero; IPv6 normally requires a checksum, with narrowly specified exceptions."],
    observe: "Capture udp traffic and compare application send/receive counts, lengths and timestamps. Include socket-drop counters; packet capture at one point cannot prove application receipt.",
    interview: { answer: "UDP preserves datagrams and uses a lightweight header and integrity check, while leaving ordering, recovery and congestion-responsive application behavior to higher layers.", followups: ["Why avoid oversized datagrams?", "What does the pseudo-header protect against?"] },
    recall: [{ question: "How large is the UDP header?", answer: "8 bytes." }, { question: "Does UDP preserve send message boundaries?", answer: "It preserves datagram boundaries, subject to API truncation and delivery loss." }],
    tasks: [
      { kind: "Calculate", prompt: "What UDP length field accompanies a 100-byte payload?", hint: "Include UDP's own header, not IP's.", answer: "108 bytes.", reasoning: "The UDP length covers 8 header bytes plus 100 payload bytes." },
      { kind: "Compare", prompt: "Does a valid checksum compensate for UDP packet loss?", hint: "Separate correctness from arrival.", answer: "No; it checks a received unit, not delivery of absent units.", reasoning: "Loss needs detection and any desired retry policy elsewhere." }
    ],
    sources: ["udp", "kr", "ipv6"],     advanced: "The Internet checksum adds 16-bit words with end-around carry and complements the sum; verification detects many changed-bit patterns, not deliberate forgery. UDP applications must control offered load appropriately; using UDP does not exempt a protocol from congestion control. Fragment loss can discard a whole oversized datagram, and checksum-offload capture artifacts can resemble bad checksums."
  },
  {
    id: "tcp-byte-stream-header", module: "transport", title: "TCP's byte stream, header and flags",
    concepts: ["tcp", "tcp-byte-stream", "tcp-segment", "tcp-header", "tcp-sequence-number", "tcp-ack-number", "tcp-flags", "tcp-psh", "tcp-urg", "tcp-checksum", "tcp-timestamps"],
    prerequisites: ["ports-multiplexing", "reliable-windows-acks"],
    meaning: "TCP offers an ordered byte stream while a connection remains viable. It retransmits missing data and suppresses duplicate sequence bytes, but can fail and does not preserve application write boundaries.",
    why: "Applications often need all bytes in order without implementing packet recovery. They still need their own message framing and completion semantics.",
    model: "TCP reconstructs a numbered paper roll. The receiver sees a continuous roll, not the sender's individual cuts. An intact roll does not tell an application where one business message ends.",
    steps: [
      "Accept application bytes into local transport buffers; assign byte sequence positions and segment them according to sending constraints.",
      "Transmit a header containing ports, sequence and acknowledgment numbers, header length, flags, advertised window, checksum and optional extensions. TCP's mandatory checksum covers the header, payload and IP pseudo-header; detected corruption is discarded, leaving recovery to acknowledgment and timer mechanisms.",
      "Reassemble accepted sequence ranges, acknowledge progress and retry missing data while enforcing receive and congestion limits.",
      "Expose available contiguous bytes through reads; the application accumulates and parses a framing scheme such as a length prefix."
    ],
    example: {
      given: "The next sequence position is 1000. An application writes 3 bytes then 2 bytes; the receiver reads into a 10-byte buffer.",
      steps: ["The five bytes occupy positions 1000-1004, regardless of segmentation.", "The next expected acknowledgment after all arrive is 1005.", "A read may return 5 bytes, or smaller available portions; it need not return 3 then 2."],
      result: "Byte order is retained, application write boundaries are not."
    },
    failure: "Assuming one read equals one message causes truncation or merging bugs. A connection reset or exhausted retry policy can end a transfer before all intended bytes arrive.",
    confusions: ["SYN/FIN consume sequence positions; ACK-only flags do not by themselves consume one.", "PSH is not a reliable application-message delimiter; ACK, SYN, FIN, RST, PSH and URG have transport control meanings."],
    observe: "Inspect tcp.seq, tcp.ack and header flags in Wireshark, and compare with application read logs. Modern offloads can make host captures show segments unlike on-wire packets.",
    interview: { answer: "TCP provides ordered, duplicate-suppressed bytes with recovery while viable, not message boundaries, guaranteed completion or business acknowledgments.", followups: ["How would you frame variable-sized messages?", "Why can one large write create many segments?"] },
    recall: [{ question: "What does TCP sequence space count for ordinary payload?", answer: "Bytes." }, { question: "What is TCP's minimum header size?", answer: "20 bytes without options." }],
    tasks: [
      { kind: "Calculate", prompt: "A payload starts at sequence 500 and carries 80 bytes. What ACK confirms this contiguous payload?", hint: "ACK identifies the next expected position.", answer: "580.", reasoning: "Positions 500-579 contain data, so the next position is 580." },
      { kind: "Diagnose", prompt: "A parser works locally but fails when one request arrives across three reads. What assumption is wrong?", hint: "TCP is not a record interface.", answer: "It assumes reads preserve request boundaries.", reasoning: "The parser must buffer incomplete frames and handle multiple frames per read." }
    ],
    sources: ["tcp", "stanford"], advanced: "TCP's 32-bit sequence arithmetic wraps and requires serial-number comparisons, not ordinary unbounded integer ordering. PSH requests prompt forwarding of buffered received data to the application, but does not delimit records. URG makes the urgent pointer meaningful; it does not create a separate high-priority stream. Negotiated timestamps carry a send-time value and echoed peer value, supporting less ambiguous RTT measurement and rejection of stale data under their rules."
  },
  {
    id: "tcp-handshake", module: "transport", title: "TCP deep pilot: trace the three-way handshake",
    concepts: ["tcp-three-way-handshake", "tcp-syn", "tcp-initial-sequence-number", "tcp-listen", "tcp-syn-sent", "tcp-syn-received", "tcp-established", "tcp-option-negotiation", "tcp-maximum-segment-size", "tcp-syn-cookie", "tcp-syn-flood", "tcp-fast-open", "tcp-simultaneous-open"],
    prerequisites: ["tcp-byte-stream-header"],
    meaning: "TCP's three-way handshake synchronizes both directions' initial sequence numbers and confirms that each endpoint can receive the other's traffic. It creates transport state, not authenticated identity.",
    why: "A server must distinguish a new conversation from delayed old traffic and know that its own initial sequence position was received. A one-way hello supplies neither assurance.",
    model: "Two people exchange numbered starting bookmarks, then acknowledge each other's bookmark. They agree where to begin, but have not proven who they are or that future delivery will succeed.",
    steps: [
      "The active opener sends SYN with its initial sequence number and enters SYN-SENT; the passive endpoint begins in LISTEN.",
      "The server records the client sequence, sends SYN+ACK acknowledging client ISN+1, and normally enters SYN-RECEIVED.",
      "The client validates the acknowledgment, records the server sequence, sends ACK for server ISN+1 and enters ESTABLISHED.",
      "The server validates that ACK and enters ESTABLISHED. SYN options advertise capabilities; their individual negotiation rules determine later use. Each endpoint's MSS advertisement bounds payload in segments it receives; it excludes headers and does not by itself discover the entire path's MTU."
    ],
    example: {
      given: "Client ISN=100, server ISN=700; no payload in the handshake and no sequence wrap.",
      steps: ["Client -> server: SYN, seq=100.", "Server -> client: SYN+ACK, seq=700, ack=101.", "Client -> server: ACK, seq=101, ack=701.", "The first client payload byte uses sequence 101; the first server payload byte uses 701."],
      result: "Both SYNs consume one sequence position; the final pure ACK does not."
    },
    failure: "If the final ACK is lost, the client may believe it is established while the server still awaits confirmation and retransmits SYN+ACK. A SYN flood can consume pending-state resources.",
    confusions: ["SYN+ACK acknowledges the client's SYN, not application processing.", "The handshake does not provide encryption; address reachability confirmation is not user authentication."],
    observe: "Filter a capture for tcp.flags.syn == 1 and inspect both sequence spaces, retransmissions and options. Relative numbering can display ISNs as zero even when raw values differ.",
    interview: { answer: "SYN, SYN+ACK and ACK exchange and confirm both initial sequence numbers; each SYN consumes one position and each side reaches ESTABLISHED after valid confirmation.", followups: ["Why are two messages insufficient to confirm both directions?", "What does a SYN cookie trade away under resource pressure?", "How does simultaneous open differ from passive open?"] },
    recall: [{ question: "How many sequence positions does SYN consume?", answer: "One." }, { question: "Does the final pure ACK consume sequence space?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "Client ISN=9000, server ISN=42000. Give the final pure ACK's seq and ack.", hint: "Advance each SYN by one.", answer: "seq=9001, ack=42001.", reasoning: "The client's SYN occupied 9000; the server's SYN occupied 42000." },
      { kind: "Diagnose", prompt: "Client sends SYN repeatedly but sees no SYN+ACK. What does this prove, and what does it not prove?", hint: "Observe direction, not an assumed cause.", answer: "It proves no response was observed at that capture point; it does not identify whether filtering, loss, listener absence or a return-path issue caused it.", reasoning: "Multiple distinct failures produce the same incomplete handshake trace." }
    ],
    sources: ["tcp", "labs", "linux"], advanced: "SYN floods create many uncompleted opens; SYN cookies encode enough pending state to validate the later ACK without normal per-SYN allocation, with implementation-dependent option tradeoffs. In simultaneous open, both endpoints actively send SYN, then process the crossed SYNs and confirmations rather than requiring one listener. TCP Fast Open can carry early data in SYN under extension rules, saving an establishment wait but requiring replay-aware application handling.",
    diagram: "client (ISN 100)                         server (ISN 700)\nSYN-SENT       -- SYN seq=100 ----------> LISTEN\n               <- SYN+ACK seq=700 ack=101 SYN-RECEIVED\nESTABLISHED    -- ACK seq=101 ack=701 ---> ESTABLISHED"
  },
  {
    id: "tcp-loss-recovery", module: "transport", title: "TCP ACKs, retransmission and SACK evidence",
    concepts: ["tcp-cumulative-ack", "tcp-duplicate-ack", "tcp-sack", "tcp-retransmission", "tcp-loss-scoreboard", "tcp-spurious-retransmission"],
    prerequisites: ["tcp-handshake", "rtt-retransmission-timers"],
    meaning: "TCP acknowledges a contiguous byte prefix and can report selectively received ranges. The sender uses this evidence and timers to decide what to retransmit; loss inference is not perfect.",
    why: "One missing segment can block ordered delivery even when later bytes arrive. Selective feedback lets the sender recover gaps without blindly repeating all outstanding data.",
    model: "A librarian reports 'I have everything before shelf position 2000, plus shelves 3000-5000.' Missing gaps require repair, but an absent shelf report does not prove every unmentioned book was lost.",
    steps: [
      "Interpret ACK as the next expected byte, advancing acknowledged send state only for an acceptable cumulative acknowledgment.",
      "When SACK was negotiated, process reported byte ranges beyond the cumulative gap and maintain a sender-side loss/recovery scoreboard.",
      "Infer suspected losses from acknowledgment patterns or time-based recovery rules; retransmit missing bytes with their original sequence positions.",
      "A cumulative ACK advancing past the gap confirms contiguous receipt; release acknowledged send buffers and adjust the relevant recovery state."
    ],
    example: {
      given: "Three 1,000-byte segments start at 1000, 2000 and 3000. Only the first and third arrive.",
      steps: ["The receiver cumulatively ACKs 2000 after bytes 1000-1999.", "On receiving bytes 3000-3999, it still ACKs 2000 and can SACK range [3000,4000).", "The sender recovers bytes [2000,3000) when loss detection warrants.", "After the gap fills, the receiver can ACK 4000."],
      result: "The retransmission reuses seq=2000; the SACK range identifies received data, not a new stream position."
    },
    failure: "Packet reordering or delayed ACKs can resemble loss, causing spurious retransmission. SACK information alone is not proof of application consumption.",
    confusions: ["One duplicate ACK does not universally trigger retransmission; algorithms and thresholds differ.", "Retransmissions do not receive fresh TCP byte sequence numbers; QUIC packet numbers behave differently."],
    observe: "Inspect ACK plateaus, SACK blocks, arrival order and retries together. Wireshark's retransmission labels are analyzer inferences, not direct statements from the sender's loss detector.",
    interview: { answer: "TCP uses cumulative byte ACKs, optional SACK ranges and timers or ACK-based loss inference to retransmit gaps while preserving stream sequence identity.", followups: ["What can cause a spurious retry?", "Why retain data until cumulative acknowledgment even after SACK?"] },
    recall: [{ question: "What does TCP ACK 4000 mean?", answer: "All bytes before 4000 are cumulatively acknowledged in that sequence space." }, { question: "Does a TCP retry change the bytes' sequence positions?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "In the example, the third segment arrives twice before the gap fills. Does ACK advance to 4000?", hint: "Duplicate later data does not fill earlier data.", answer: "No; cumulative ACK remains 2000.", reasoning: "Bytes 2000-2999 are still missing." },
      { kind: "Diagnose", prompt: "A supposedly lost segment appears later in the capture before its retry. What alternative explanation fits?", hint: "Arrival order can differ from send order.", answer: "Reordering caused a spurious loss inference.", reasoning: "The original was delayed rather than absent, so retry evidence alone overstates loss." }
    ],
    sources: ["tcp", "congestion", "stanford"], advanced: "SACK blocks can be limited by option space, and receivers may renege on selectively reported data under memory pressure. Modern recovery can use time-based mechanisms beyond classic duplicate-ACK counting. Distinguish the loss detector, retransmission scheduling and congestion controller: they cooperate but answer different questions."
  },
  {
    id: "tcp-close-time-wait", module: "transport", title: "FIN, RST, half-close and TIME_WAIT",
    concepts: ["tcp-fin", "tcp-rst", "tcp-half-close", "tcp-fin-wait", "tcp-close-wait", "tcp-last-ack", "tcp-closing", "tcp-time-wait", "tcp-maximum-segment-lifetime", "tcp-connection-incarnation", "socket-linger"],
    prerequisites: ["tcp-handshake", "tcp-loss-recovery"],
    meaning: "TCP can close each stream direction independently with FIN. RST aborts a connection rather than orderly finishing it. TIME_WAIT protects the transition between old and new conversations using the same tuple.",
    why: "A sender may finish sending a request while still waiting for a response. Delayed close packets and old data must not be mistaken for a new connection.",
    model: "Closing your outgoing mail slot does not close your incoming slot. TIME_WAIT is a quarantine for the old conversation; it is not evidence that an application forgot to close.",
    steps: [
      "An orderly local send shutdown transmits FIN after earlier data; FIN consumes one sequence position and moves through FIN-WAIT states.",
      "The peer acknowledges FIN and sees end-of-stream after prior bytes, entering CLOSE-WAIT while its application can still send.",
      "The peer eventually sends its own FIN and enters LAST-ACK; the active closer acknowledges it and normally enters TIME_WAIT.",
      "Keep TIME_WAIT for the protocol's old-segment protection interval, conventionally 2 x maximum segment lifetime; an abortive RST follows different error behavior."
    ],
    example: {
      given: "Client's next send sequence is 1500; server's is 9000. Both orderly close with no remaining payload.",
      steps: ["Client sends FIN seq=1500; server acknowledges 1501.", "Server may still send in its open direction, but here sends FIN seq=9000.", "Client acknowledges 9001 and retains TIME_WAIT state.", "A lost final ACK can be repaired by acknowledging a retransmitted server FIN."],
      result: "Each FIN advances its own sequence space by one; closure of one direction does not force immediate closure of the other."
    },
    failure: "Persistent CLOSE-WAIT commonly means the peer closed but the local application has not closed its side. An RST may discard unconsumed data and surface as an error rather than clean end-of-stream.",
    confusions: ["TIME_WAIT duration is implementation dependent; do not assume one universal number of seconds.", "The endpoint entering TIME_WAIT is usually the active closer, not necessarily the client."],
    observe: "Use ss -tan and application shutdown logs to distinguish CLOSE-WAIT leaks from normal TIME_WAIT. A FIN in a capture is not proof both directions are finished.",
    interview: { answer: "FIN orderly ends one byte-stream direction; RST aborts; half-close allows continued reverse traffic, and TIME_WAIT protects against old segments and lost final close ACKs.", followups: ["Why is CLOSE-WAIT usually an application concern?", "What happens during simultaneous FIN exchange?"] },
    recall: [{ question: "How much sequence space does FIN consume?", answer: "One position." }, { question: "Can a half-closed TCP endpoint still receive?", answer: "Yes, if only its send direction was closed." }],
    tasks: [
      { kind: "Calculate", prompt: "A FIN follows bytes through position 799. Give FIN's sequence and its acknowledging ACK.", hint: "Use the next available sequence position.", answer: "FIN seq=800; ACK=801.", reasoning: "FIN occupies position 800 just as a one-position control event." },
      { kind: "Diagnose", prompt: "Thousands of sockets stay in CLOSE-WAIT. Should you first shorten TIME_WAIT?", hint: "These are different states.", answer: "No; investigate application cleanup after peer EOF.", reasoning: "CLOSE-WAIT means local closure is pending, not that old-segment quarantine is too long." }
    ],
    sources: ["tcp", "linux"], advanced: "Simultaneous close can pass through CLOSING. Maximum segment lifetime bounds how long old packets may remain relevant; waiting twice that bound protects the final exchange and a reused tuple. Aggressive tuple reuse must follow platform incarnation-safety rules. Socket linger can change whether close waits for queued transmission or aborts under configured conditions; exact API behavior varies, and neither outcome proves business completion.",
    diagram: "A sends FIN -> FIN-WAIT-1       B receives FIN -> CLOSE-WAIT\nA gets ACK  -> FIN-WAIT-2       B may still send response\nA gets FIN  -> sends final ACK  B sends FIN    -> LAST-ACK\nA           -> TIME_WAIT       B gets ACK     -> CLOSED"
  },
  {
    id: "tcp-packetization-reuse", module: "transport", title: "Nagle, delayed ACK and connection reuse",
    concepts: ["nagle-algorithm", "tcp-delayed-ack", "tcp-nodelay", "tcp-small-write-latency", "transport-connection-reuse"],
    prerequisites: ["tcp-byte-stream-header", "tcp-loss-recovery"],
    meaning: "TCP packetization and acknowledgment policies trade small-packet overhead against responsiveness. Reusing a connection avoids repeated establishment, but does not remove queueing or application protocol requirements.",
    why: "Interactive programs often send tiny writes. Sending each immediately can waste bandwidth and processing; waiting for batching can instead add noticeable request latency.",
    model: "A courier batches small envelopes while another desk batches receipts. If each waits on the other, an incomplete request can sit unnecessarily. This is a timing interaction, not a universal TCP delay.",
    steps: [
      "With Nagle enabled, send an initial small segment, then generally hold additional small data while earlier data is unacknowledged unless enough accumulates for a full segment.",
      "A receiver may delay an ACK briefly to combine acknowledgments or piggyback on reverse data, subject to its protocol and implementation rules.",
      "If a request spans small writes and its final piece is held, the receiver may have nothing to respond to yet, exposing the interaction.",
      "Batch complete application messages deliberately or configure TCP_NODELAY where justified; reuse established connections when the application supports safe framing and lifecycle handling."
    ],
    example: {
      given: "Request header of 10 bytes is sent at t=0; a 10-byte body is written at t=1 ms. Assume Nagle holds it until an ACK and the receiver delays ACK until t=40 ms.",
      steps: ["The first small segment is outstanding when the body is written.", "The body remains buffered, so the server lacks the complete request.", "At 40 ms the ACK arrives in this simplified zero-transit model; the held body can then leave."],
      result: "The body waits about 39 ms due to these assumed policies, not a mandatory TCP-wide timer."
    },
    failure: "Turning off Nagle everywhere can increase packet rate without solving application batching or server queueing. Reused connections may be stale after idle middlebox timeouts.",
    confusions: ["Delayed ACK is a receiver policy; Nagle is a sender packetization policy.", "Connection reuse is not tuple reuse during TIME_WAIT; it continues an existing conversation."],
    observe: "Compare application write timestamps with on-wire segments and ACK timing. Test batching versus TCP_NODELAY with realistic request sizes, not only a synthetic one-byte benchmark.",
    interview: { answer: "Nagle reduces tiny outstanding sends, delayed ACK reduces receipt traffic, and their interaction can delay split requests; deliberate batching and measured configuration are better than blanket tuning.", followups: ["Why might TCP_NODELAY not remove every delay?", "What state does connection pooling need to manage?"] },
    recall: [{ question: "Which socket option commonly disables Nagle?", answer: "TCP_NODELAY." }, { question: "Which endpoint controls delayed ACK?", answer: "The receiver of the data being acknowledged." }],
    tasks: [
      { kind: "Calculate", prompt: "Under the same assumptions, write the body at 5 ms instead of 1 ms. How long is it held?", hint: "Subtract write time from release time.", answer: "About 35 ms.", reasoning: "The ACK still releases it at 40 ms, so 40 - 5 = 35." },
      { kind: "Compare", prompt: "Why can one combined 20-byte write improve this example without disabling Nagle?", hint: "The receiver gets a complete request initially.", answer: "The initial send can carry the entire request.", reasoning: "There is no second incomplete tiny piece waiting behind outstanding data." }
    ],
    sources: ["tcp", "linux", "systems"], advanced: "Delayed-ACK policies, segmentation offload, corking and pacing are platform dependent. Reuse saves handshake latency and can preserve controller history, but multiplexed work may still share stream or congestion bottlenecks. Retrying after discovering a stale pooled connection must respect operation idempotency."
  },
  {
    id: "tcp-liveness-heartbeat", module: "transport", title: "Keepalive, heartbeat and meaningful liveness",
    concepts: ["tcp-keepalive", "application-heartbeat", "idle-connection-timeout", "application-deadline", "liveness-detection", "half-open-connection"],
    prerequisites: ["tcp-close-time-wait", "delivery-business-semantics"],
    meaning: "An idle TCP connection can remain locally open after the peer or path disappears. Keepalive tests transport reachability; application heartbeats can test whether the intended application is making progress.",
    why: "Silence is ambiguous: the peer may be healthy and idle, partitioned, crashed or unable to process work. Applications need bounded waiting and a definition of what 'alive' means.",
    model: "A building answering its doorbell does not prove the person inside can complete your task. A transport response and an application response probe different failure boundaries.",
    steps: [
      "Define deadlines for useful work independently of the connection's open/closed state.",
      "If enabled and configured, TCP keepalive sends probes after idle time and declares failure only under its interval/count rules.",
      "An application heartbeat exchanges protocol messages and checks a timely meaningful response, possibly including progress or role information.",
      "On expiry, mark availability as uncertain or failed, reconnect under backoff policy and handle any outstanding operation as potentially ambiguous."
    ],
    example: {
      given: "Keepalive starts after 60 s idle, with 10 s intervals and three unanswered probes. For this example, declare failure one interval after the third probe.",
      steps: ["Send probes at idle times 60, 70 and 80 s.", "Wait until 90 s for the last response window to expire.", "An application request with a 2 s deadline should fail its wait long before this transport detector completes."],
      result: "Illustrative transport failure detection takes 90 s idle; it does not replace the 2 s application deadline."
    },
    failure: "A blocked server process can leave its kernel acknowledging TCP probes. Transport keepalive succeeds while useful application work is stalled.",
    confusions: ["Keepalive is normally optional and defaults vary; it is not an automatic quick failure guarantee.", "Heartbeats detect suspected failure under timing assumptions, not mathematical proof that a peer crashed."],
    observe: "Inspect socket keepalive configuration, idle middlebox limits and heartbeat logs together. A NAT or firewall may expire idle state before a leisurely keepalive begins.",
    interview: { answer: "TCP keepalive probes transport reachability; application heartbeats probe defined application health, and deadlines bound useful waiting regardless of connection state.", followups: ["Why can a heartbeat succeed while a business operation fails?", "How do partitions complicate failure detection?"] },
    recall: [{ question: "Does TCP keepalive prove application progress?", answer: "No." }, { question: "What bounds a request's useful waiting time?", answer: "An application deadline." }],
    tasks: [
      { kind: "Calculate", prompt: "Using the example convention, idle start is 30 s, interval 5 s, and two probes are allowed. When is failure declared?", hint: "Send at 30 and 35, then wait one interval.", answer: "40 s idle.", reasoning: "The last response window expires at 35 + 5." },
      { kind: "Diagnose", prompt: "Keepalive succeeds but heartbeats time out while the server CPU is saturated. What boundary differs?", hint: "Kernel response versus application scheduling.", answer: "The transport stack is reachable while the application cannot respond promptly.", reasoning: "The two probes depend on different components." }
    ],
    sources: ["tcp", "linux", "systems"], advanced: "Probe timing and failure counting are implementation dependent, so verify actual packet behavior. Aggressive heartbeats increase load and false suspicions during transient congestion. Reconnection cannot determine whether an in-flight request committed; carry operation identity and query or retry safely."
  },
  {
    id: "quic-streams-security", module: "transport", title: "QUIC streams, TLS and loss recovery",
    concepts: ["quic", "quic-stream", "quic-stream-offset", "quic-packet-number", "quic-tls", "quic-handshake", "quic-loss-recovery", "transport-head-of-line-blocking", "quic-stream-flow-control", "quic-zero-rtt"],
    prerequisites: ["udp-datagrams-checksum", "tcp-loss-recovery", "delivery-business-semantics"],
    meaning: "QUIC v1 is a secure transport carried in UDP datagrams. It provides reliable ordered bytes within independent streams, with integrated TLS 1.3 establishment and transport-managed loss recovery.",
    why: "A single TCP byte stream can block unrelated higher-level streams behind one missing byte range. QUIC makes stream delivery ordering independent while preserving shared congestion responsibility.",
    model: "Several numbered paper rolls share one courier. A missing part of roll A need not block already available data on roll B, but a missing courier bag can affect both and reduce shared sending capacity.",
    steps: [
      "Exchange QUIC handshake traffic carrying TLS handshake information; establish keys and negotiate transport parameters rather than placing TLS records over a TCP stream.",
      "Frame application data by stream identifier and byte offset; apply both stream-level and connection-level flow limits.",
      "Acknowledge packet numbers and infer losses. Retransmit needed information in newly numbered packets, not an identical packet with a reused packet number.",
      "Deliver contiguous bytes independently per stream, while the connection's congestion controller governs aggregate sending on the path."
    ],
    example: {
      given: "Packet 10 carries stream A offsets 0-999 and is lost. Packet 11 carries stream B offsets 0-999 and arrives.",
      steps: ["Stream A cannot deliver its first 1,000 bytes until recovered.", "Stream B's contiguous first range is available despite A's gap.", "A later packet 12 can carry replacement A data; packet number 10 is not reused."],
      result: "Cross-stream transport ordering blockage is avoided, but shared path loss still affects congestion and latency."
    },
    failure: "UDP blocking or severe path constraints can prevent QUIC operation. Independent streams do not remove application dependencies, connection flow limits or shared congestion bottlenecks.",
    confusions: ["QUIC is not unreliable merely because its carrier is UDP.", "QUIC stream offsets identify reliable data; packet numbers identify individual protected transmissions."],
    observe: "Use endpoint qlogs or transport telemetry for packet loss and stream offsets. Encrypted captures hide much information unless appropriate authorized secrets and tooling are available.",
    interview: { answer: "QUIC integrates TLS and reliable per-stream delivery over UDP, using fresh packet numbers for retransmitted information and avoiding TCP's cross-stream ordering blockage.", followups: ["Why do packet numbers and stream offsets need different semantics?", "What replay risk makes 0-RTT unsuitable for some operations?"] },
    recall: [{ question: "Is order guaranteed across different QUIC streams?", answer: "No; ordering is within a stream." }, { question: "Does QUIC reuse a packet number for retransmitted data?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "A missing range is on stream B itself. Can B deliver bytes after that gap as an ordered stream?", hint: "Independence is between streams.", answer: "Not as contiguous ordered bytes beyond the gap.", reasoning: "Per-stream ordering still waits for that stream's missing offsets." },
      { kind: "Compare", prompt: "Compare TCP byte sequence numbers with QUIC packet numbers during a retry.", hint: "Data identity versus transmission identity.", answer: "TCP retransmits bytes at the same sequence positions; QUIC resends information in new packet numbers.", reasoning: "QUIC's stream offsets preserve data identity separately from packet loss accounting." }
    ],
    sources: ["quic", "quictls", "quicloss"], advanced: "QUIC v1 separates Initial, Handshake and application-data packet-number spaces. 0-RTT is optional resumption data and is replayable, so application authorization alone does not make unsafe effects replay-safe. QUIC does not universally outperform TCP: handshake reuse, CPU, pacing, path filtering and workload determine results.",
    diagram: "UDP carrier:   packet 10 [A:0..999] --X    packet 11 [B:0..999] -->\nstream A:      [gap..............] waits   packet 12 repairs A -->\nstream B:      [0..999 received..] ready\nshared path:   congestion budget applies to both streams"
  },
  {
    id: "quic-connection-migration", module: "transport", title: "QUIC connection IDs and validated migration",
    concepts: ["quic-connection-id", "quic-connection-migration", "quic-path-validation", "quic-nat-rebinding", "quic-anti-amplification", "quic-path-state"],
    prerequisites: ["quic-streams-security", "ports-multiplexing"],
    meaning: "QUIC can associate packets with a connection using connection IDs even when the address-and-port tuple changes. Migration still requires permitted behavior and validation of the new path.",
    why: "A mobile device may move between networks, and a NAT may reassign its port. Binding connection identity solely to a fixed tuple would interrupt an otherwise ongoing conversation.",
    model: "A conversation has a ticket number independent of the current return address. A new return address must still be checked; possession of a routing ticket is not sufficient authority to redirect arbitrary traffic.",
    steps: [
      "Peers issue and manage connection IDs so incoming packets can be routed to existing connection state without relying exclusively on the old tuple.",
      "An endpoint observes a permitted address change, distinguishing deliberate migration from possible NAT rebinding and respecting negotiated restrictions.",
      "Validate reachability using PATH_CHALLENGE and a matching PATH_RESPONSE on the relevant path before treating the new path as established.",
      "Apply anti-amplification and path-specific congestion/RTT rules. Retire or rotate connection IDs according to protocol rules and privacy needs."
    ],
    example: {
      given: "Client changes from 192.0.2.10:50000 to 198.51.100.10:62000 while retaining a usable QUIC connection ID. An unvalidated server path receives 1,200 bytes.",
      steps: ["The server uses the connection ID and authenticated packet state to find the existing connection.", "It validates the new address rather than assuming the old path's reachability.", "While the applicable anti-amplification limit remains active, 3 x 1,200 = 3,600 bytes is the send budget on that unvalidated path."],
      result: "Connection continuity is possible, subject to migration support and validation, with bounded unvalidated response traffic."
    },
    failure: "A load balancer that misroutes a new tuple or an endpoint that disables migration can defeat continuity. The old path's bandwidth estimate may be unsafe on a slower new network.",
    confusions: ["Connection IDs are routing/demultiplexing identifiers, not passwords.", "Ordinary TCP does not inherently preserve one established connection across arbitrary tuple changes; separate extensions or proxies can alter that boundary."],
    observe: "In a controlled Wi-Fi-to-cellular test, correlate connection ID changes, path-validation events and application interruption using endpoint logs. Mere UDP source-port change does not prove successful migration.",
    interview: { answer: "QUIC separates connection identity from the network tuple using connection IDs and validates changed paths before relying on them, allowing supported migration or rebinding continuity.", followups: ["Why reset path congestion assumptions?", "How can rotating IDs improve privacy without guaranteeing unlinkability?"] },
    recall: [{ question: "Which frame challenges a new QUIC path?", answer: "PATH_CHALLENGE." }, { question: "What multiplier bounds applicable unvalidated-path amplification?", answer: "Three times bytes received." }],
    tasks: [
      { kind: "Calculate", prompt: "An unvalidated path receives 800 bytes under the three-times rule. What is the total allowed send budget?", hint: "Multiply received bytes, not payload requests.", answer: "2,400 bytes.", reasoning: "3 x 800 = 2,400 before address validation removes that restriction." },
      { kind: "Diagnose", prompt: "Migration packets reach a different server process with no connection state. What layer of support is missing?", hint: "An ID must route to its owner.", answer: "Connection-ID-aware routing or shared/appropriately transferred connection state.", reasoning: "An identifier cannot preserve a conversation if packets are delivered to an endpoint that cannot process it." }
    ],
    sources: ["quic", "quictls", "quicloss"], advanced: "Zero-length connection IDs and deployment routing constraints can limit migration. QUIC v1 has specific migration permissions and validation exceptions; do not generalize all versions or implementations. New paths normally require fresh congestion assumptions, while limited port-only rebinding heuristics may preserve state under specified conditions."
  },
  {
    id: "flow-versus-congestion-window", module: "performance", title: "Receiver flow control versus network congestion control",
    concepts: ["transport-flow-control", "tcp-receive-window", "tcp-congestion-window", "tcp-bytes-in-flight", "tcp-window-scaling", "tcp-zero-window", "tcp-persist-probe"],
    prerequisites: ["tcp-byte-stream-header", "reliable-windows-acks"],
    meaning: "Flow control protects receiver capacity; congestion control protects the network path. TCP's advertised receive window, rwnd, and sender congestion window, cwnd, are independent constraints.",
    why: "A fast sender can overwhelm either a slow application or a bottleneck link. One limit cannot identify and manage both resources correctly.",
    model: "The receiving warehouse has shelf space, while the road has a safe traffic load. Permission to use the road does not create shelves; empty shelves do not make the road wider.",
    steps: [
      "The receiver advertises acceptable byte-space capacity as rwnd, influenced by buffering and application consumption.",
      "The sender's congestion controller maintains cwnd from path feedback and its algorithm, separately from receiver advertisements.",
      "In a simplified steady window calculation, outstanding data is bounded by min(rwnd,cwnd); new allowance is that bound minus bytes already in flight.",
      "When rwnd becomes zero, ordinary data sending pauses. Persist probing can detect reopened capacity even if a window update was lost."
    ],
    example: {
      given: "rwnd=12 KB, cwnd=8 KB, in flight=6 KB; use decimal KB and ignore other sending constraints.",
      steps: ["The effective outstanding-data cap is min(12,8) = 8 KB.", "New send allowance is 8 - 6 = 2 KB.", "If the application drains and rwnd rises to 20 KB, allowance remains 2 KB.", "If instead cwnd rises to 16 KB while rwnd remains 12 KB, allowance becomes 12 - 6 = 6 KB."],
      result: "Changing one window helps only when that window is the active constraint."
    },
    failure: "A receiver application that stops reading can shrink rwnd to zero on an uncongested network. Increasing cwnd or link capacity does not fix its backpressure.",
    confusions: ["rwnd is advertised by the receiver; cwnd is sender state and is not a TCP header field.", "A zero-window probe seeks receive-window progress; it is not the same as idle keepalive."],
    observe: "Compare advertised windows, ss -ti controller state and application read rates. Account for negotiated window scaling before reading raw 16-bit window fields as byte capacity.",
    interview: { answer: "rwnd limits receiver buffering, cwnd limits path load, and in-flight data must fit both; the smaller bound determines available sending room.", followups: ["Why is scaling negotiated only during establishment?", "How can a lost window update create a persist problem?"] },
    recall: [{ question: "Who advertises rwnd?", answer: "The receiver." }, { question: "Is cwnd transmitted in the TCP window field?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "rwnd=30 KB, cwnd=10 KB and flight=7 KB. What is the simplified new allowance?", hint: "Minimum minus flight.", answer: "3 KB.", reasoning: "min(30,10) - 7 = 3." },
      { kind: "Diagnose", prompt: "Throughput stalls with zero advertised window and no packet loss. What should you inspect?", hint: "The receiver is explicitly refusing more bytes.", answer: "Receiver application consumption and buffer pressure.", reasoning: "The binding constraint is flow control, not inferred network congestion." }
    ],
    sources: ["tcp", "congestion", "linux"], advanced: "Actual sending also depends on queued application data, pacing, segment size, recovery rules and socket buffers. Window scaling expands rwnd representation but does not enlarge bandwidth or bypass memory limits. QUIC uses separate stream and connection flow-credit mechanisms rather than TCP's window field.",
    diagram: "receiver shelves -> rwnd --\\\n                            min -> cap - bytes in flight -> new allowance\nnetwork feedback -> cwnd --/\napplication drains shelves -> rwnd can grow (cwnd unchanged)"
  },
  {
    id: "reno-congestion-recovery", module: "performance", title: "Slow start, avoidance and Reno recovery",
    concepts: ["tcp-slow-start", "tcp-ssthresh", "tcp-congestion-avoidance", "tcp-fast-retransmit", "tcp-fast-recovery", "tcp-reno", "additive-increase-multiplicative-decrease"],
    prerequisites: ["flow-versus-congestion-window", "tcp-loss-recovery"],
    meaning: "Baseline TCP grows its sending window to discover capacity and reduces it after inferred congestion. Reno combines slow start, additive avoidance and duplicate-ACK-based fast recovery.",
    why: "Available bandwidth is not announced by the path. A sender must probe cautiously while responding to signs that its offered load is too high.",
    model: "Increase traffic until feedback suggests crowding, then retreat. Loss is an imperfect congestion signal: damage and reordering may also occur, so the model is a control approximation.",
    steps: [
      "Below ssthresh, slow start increases cwnd with acknowledgments, approximately doubling per RTT in a simple full-ACK round model.",
      "Above the threshold, congestion avoidance grows approximately one MSS per RTT under baseline additive-increase behavior.",
      "Classic fast retransmit uses three duplicate ACKs as evidence to retransmit a missing segment without waiting for RTO.",
      "In classic Reno recovery, set ssthresh near half flight size, temporarily inflate cwnd for duplicate-ACK accounting, then deflate on the recovery ACK; timeout recovery is more conservative."
    ],
    example: {
      given: "Teaching trace: MSS=1 KB, initial cwnd=1 MSS, ssthresh=8 MSS, ACKs every segment, rwnd unlimited. Later flight size is 10 MSS when three duplicate ACKs arrive.",
      steps: ["Clean slow-start rounds grow cwnd 1 -> 2 -> 4 -> 8 MSS.", "Avoidance then grows approximately 8 -> 9 -> 10 MSS per RTT.", "At loss, classic Reno sets ssthresh=5 MSS and initial recovery cwnd=5 + 3 = 8 MSS.", "A new ACK ending this recovery deflates cwnd to 5 MSS."],
      result: "Exponential discovery becomes linear growth, then multiplicative reduction; initial window 1 is illustrative, not a claim about modern defaults."
    },
    failure: "Multiple losses in one window can expose classic Reno's recovery limitations and cause timeout. Other recovery algorithms improve this, so a Reno trace is not every modern TCP trace.",
    confusions: ["Slow start is exponential window growth despite its name.", "Fast recovery's inflated cwnd is bookkeeping for departed packets, not permission to ignore congestion."],
    observe: "Use a controlled bottleneck and inspect cwnd, ssthresh, retries and RTT. State which congestion and loss-recovery algorithms the host actually runs.",
    interview: { answer: "Reno discovers capacity with slow start, grows additively in avoidance and halves its operating scale after congestion, using fast retransmit/recovery for classic duplicate-ACK loss signals.", followups: ["How does an RTO differ from fast recovery?", "Why does delayed ACK change simple round-by-round growth?"] },
    recall: [{ question: "What separates slow start from avoidance?", answer: "ssthresh." }, { question: "How many duplicate ACKs trigger classic fast retransmit?", answer: "Three." }],
    tasks: [
      { kind: "Calculate", prompt: "Under the stated classic rule, flight=20 MSS at fast retransmit. Give ssthresh and initial inflated cwnd.", hint: "Half flight, then add three MSS.", answer: "ssthresh=10 MSS, cwnd=13 MSS.", reasoning: "20/2 = 10, then 10 + 3 = 13." },
      { kind: "Compare", prompt: "Why is timeout recovery generally more conservative than three-duplicate-ACK recovery?", hint: "What receipt evidence is available?", answer: "A timeout lacks the same evidence that later data is flowing.", reasoning: "Duplicate ACKs show some packets still reach the receiver, while a prolonged silence is less informative." }
    ],
    sources: ["congestion", "tcp"], advanced: "RFC 5681 describes baseline algorithms, while production systems may combine CUBIC with SACK-based or time-based recovery and a larger initial window. Appropriate byte counting, acknowledgment frequency and application-limited sending alter growth. Do not infer a controller from one sawtooth chart without endpoint evidence."
  },
  {
    id: "cubic-window-growth", module: "performance", title: "CUBIC's time-shaped congestion window",
    concepts: ["tcp-cubic", "cubic-window-function", "cubic-previous-maximum", "cubic-beta", "cubic-tcp-friendly-region"],
    prerequisites: ["reno-congestion-recovery"],
    meaning: "CUBIC grows a congestion window using elapsed time since a reduction and a remembered maximum. It is designed to recover and probe efficiently on high-bandwidth, long-delay paths.",
    why: "Adding roughly one segment per RTT can take too long to regain a very large window. Time-shaped growth accelerates recovery while slowing near the previously observed operating point.",
    model: "Approach a remembered ceiling cautiously, then probe beyond it increasingly. The ceiling is historical, not a discovered physical capacity, and the target is not an unconditional right to send.",
    steps: [
      "After a congestion event, remember a prior maximum Wmax and reduce the current window using the configured/specification reduction factor.",
      "Compute a cubic target W(t)=C(t-K)^3 + Wmax, with K chosen so the curve starts near the reduced window.",
      "Below the old maximum, approach it with a flattening curve; past it, grow more aggressively to probe for new capacity.",
      "Apply ACK-driven update rules, TCP-friendly behavior, receiver constraints and loss recovery; actual in-flight bytes need not equal the mathematical target."
    ],
    example: {
      given: "Illustrative CUBIC values: Wmax=100 packets, beta=0.7, C=0.4 packets/s^3. K=cube-root(100 x 0.3 / 0.4), about 4.22 s.",
      steps: ["At t=0, W=0.4(-4.22)^3 + 100, approximately 70 packets.", "At t=K, the cubic term is zero, so target W=100.", "At t=K+2 s, target W=0.4 x 8 + 100 = 103.2 packets."],
      result: "The curve flattens near 100 and then probes above it; these are idealized targets, not exact packet sends."
    },
    failure: "Random noncongestive loss can still reduce a loss-responsive CUBIC window. A large target with large buffers may coexist with excessive queueing delay.",
    confusions: ["CUBIC changes congestion-window growth, not TCP's byte-stream semantics.", "Time-based shape reduces some RTT sensitivity but does not guarantee equal throughput among arbitrary flows."],
    observe: "Confirm the selected controller with host tooling and compare loss events, RTT and window growth over time. A short application-limited transfer may never reveal the steady CUBIC curve.",
    interview: { answer: "CUBIC uses a time-based cubic window target around a remembered maximum, slowing near that point and probing beyond it while retaining congestion response and TCP-friendly behavior.", followups: ["Why is the old maximum not capacity?", "What does an application-limited period do to observed growth?"] },
    recall: [{ question: "At t=K, what is the cubic target?", answer: "Wmax." }, { question: "Does CUBIC remove TCP loss recovery?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "Using the example parameters, what is the target at t=K+3 s?", hint: "Cube 3, multiply by 0.4, then add 100.", answer: "110.8 packets.", reasoning: "0.4 x 27 + 100 = 110.8." },
      { kind: "Compare", prompt: "How does CUBIC's main growth shape differ from baseline Reno avoidance?", hint: "Time-shaped target versus approximately per-RTT linear increase.", answer: "CUBIC uses a cubic function of elapsed time; Reno avoidance grows roughly one MSS per RTT.", reasoning: "Their probing schedules differ, especially at large windows and long RTTs." }
    ],
    sources: ["cubic", "congestion"], advanced: "CUBIC's TCP-friendly region compares its cubic target with a Reno-like window estimate and uses friendly growth when that estimate dominates, avoiding overly slow growth at modest windows. RFC 9438 specifies the detailed rules. Reduction factors, application-limited handling and host versions matter. Coexistence with other controllers, queues and RTT distributions determines practical fairness, not the cubic equation alone."
  },
  {
    id: "bbr-model-control", module: "performance", title: "BBR and model-based congestion control",
    concepts: ["bbr", "bottleneck-bandwidth-estimate", "minimum-rtt-estimate", "delivery-rate-sampling", "ack-compression", "application-limited-sending", "transport-pacing", "model-based-congestion-control", "loss-based-congestion-control"],
    prerequisites: ["flow-versus-congestion-window", "cubic-window-growth"],
    meaning: "BBR-family controllers estimate bottleneck delivery bandwidth and baseline RTT, then use a path model to choose pacing and in-flight targets. Versions differ; BBR is not one universally standardized or identical deployment.",
    why: "Waiting for loss to locate capacity can fill large buffers and can mistake noncongestive loss for overload. Model-based control tries to estimate the useful operating point from delivered data and timing.",
    model: "Estimate the road's service rate and its empty-road travel time, then regulate departures. Estimates can be stale or biased; a model is not a direct reservation of link capacity.",
    steps: [
      "Sample delivered bytes over meaningful intervals and track a bandwidth estimate. An application-limited sender may offer less than path capacity, so its low delivered rate should not automatically replace a higher usable capacity estimate.",
      "Track a minimum RTT estimate over the version's observation rules to approximate propagation and baseline processing without persistent queue delay.",
      "Set pacing and in-flight targets using gains around estimated bandwidth and bandwidth-delay product.",
      "Probe for changed capacity or baseline delay and react to congestion signals according to the BBR version; newer families use additional loss/ECN and in-flight constraints."
    ],
    example: {
      given: "Measured delivery is 250,000 bytes in 20 ms; estimated minimum RTT is 40 ms. Use illustrative pacing gain 1.25.",
      steps: ["Rate estimate = 250,000 / 0.02 = 12,500,000 bytes/s = 100 Mbit/s.", "Estimated baseline BDP = 12,500,000 x 0.04 = 500,000 bytes.", "Illustrative probe pacing target = 1.25 x 100 = 125 Mbit/s."],
      result: "The model estimates a 500 KB baseline pipe and a 125-Mbit/s probe target, not a guarantee that the path can sustain the probe."
    },
    failure: "ACK compression, changing paths or stale minimum RTT can bias the model. Competing controllers and shallow or deep queues can expose version-specific fairness and loss behavior.",
    confusions: ["BBR does not mean 'ignore all loss' across all versions.", "Pacing rate and cwnd/in-flight cap are different controls; both can constrain transmission."],
    observe: "Record controller version, pacing rate, delivery samples, RTT and losses. Compare the same workload and bottleneck with another controller rather than claiming BBR always wins.",
    interview: { answer: "BBR estimates delivery bandwidth and minimum RTT to pace around a modeled operating point, whereas classic loss-based control primarily adjusts its window around inferred congestion events.", followups: ["How does ACK compression distort rate samples?", "Why must path migration refresh model assumptions?"] },
    recall: [{ question: "What two path estimates define BBR's baseline model?", answer: "Bottleneck bandwidth and minimum RTT." }, { question: "Is every BBR version behaviorally identical?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "Bandwidth estimate is 50 Mbit/s and min RTT 80 ms. What is estimated BDP?", hint: "Convert bits to bytes after multiplying.", answer: "4,000,000 bits, or 500,000 bytes.", reasoning: "50,000,000 x 0.08 = 4,000,000; divide by 8." },
      { kind: "Diagnose", prompt: "ACKs arrive in a burst although the bottleneck served data steadily. Why can a naive rate estimate be too high?", hint: "Feedback timing is not identical to service timing.", answer: "ACK compression shrinks the apparent delivery interval.", reasoning: "Dividing acknowledged bytes by an artificially short interval overestimates bottleneck rate." }
    ],
    sources: ["systems", "congestion", "linux"], advanced: "The cited general references explain control and host inspection; BBR-specific algorithm details require version-matched implementation or research documentation. BBRv1, later versions and deployment forks differ in probing, loss response and coexistence. A minimum observed RTT includes more than propagation and can remain above an empty-path baseline if queues never drain."
  },
  {
    id: "ecn-congestion-fairness", module: "performance", title: "ECN signals and the limits of fairness",
    concepts: ["explicit-congestion-notification", "ecn-capable-transport", "congestion-experienced", "tcp-ecn-echo", "tcp-congestion-window-reduced", "congestion-fairness", "rtt-unfairness", "per-flow-fairness"],
    prerequisites: ["reno-congestion-recovery", "bbr-model-control"],
    meaning: "ECN allows participating network devices to signal congestion by marking instead of necessarily dropping a packet. Fairness describes how a shared bottleneck's service is divided, and requires a stated definition.",
    why: "Dropping useful data is an expensive way to ask senders to slow down. Marking can preserve delivery while giving feedback, but only when endpoints and network behavior cooperate.",
    model: "A warning light asks drivers to reduce arrivals before a parking lot overflows. The light does not assign everyone equal space, and an unresponsive driver can still cause congestion.",
    steps: [
      "Endpoints negotiate or enable an appropriate ECN-capable transport mode and mark IP packets as capable under its rules.",
      "A congested ECN-aware queue can mark Congestion Experienced rather than drop an eligible packet; severe overload can still require drops.",
      "The receiver feeds congestion information back. Classic TCP uses ECE feedback and CWR acknowledgment of its response; other modes use different signaling.",
      "The sender adjusts load according to its controller. Evaluate fairness by flow, user, byte rate or latency rather than assuming they coincide."
    ],
    example: {
      given: "A 100-Mbit/s bottleneck is equally shared per flow. User A opens four long flows; user B opens one.",
      steps: ["There are five competing flows.", "An ideal equal-per-flow split gives each 100/5 = 20 Mbit/s.", "A obtains 4 x 20 = 80 Mbit/s and B obtains 20 Mbit/s."],
      result: "Equal per-flow sharing can be unequal per-user sharing."
    },
    failure: "If marking is enabled but the sender does not respond correctly, queues can remain overloaded. ECN also cannot avoid all drops when buffer capacity is exhausted.",
    confusions: ["ECN is a congestion signal, not receiver flow credit.", "Loss-based fairness depends on RTT and controller behavior; AIMD does not promise equal service for every deployment."],
    observe: "Correlate IP ECN bits, transport feedback, controller response and queue delay. State whether classic ECN or another version is used before interpreting flag patterns.",
    interview: { answer: "ECN conveys congestion without necessarily losing data; its benefit needs responsive endpoints, and fairness must specify whether it is per flow, user, rate or latency.", followups: ["Why can shorter-RTT flows gain an advantage?", "How does opening more flows change a user's share?"] },
    recall: [{ question: "What does CE indicate?", answer: "Congestion Experienced." }, { question: "Does ECN make packet drops impossible?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "A 120-Mbit/s ideal per-flow bottleneck serves two flows from A and one from B. What are user shares?", hint: "Divide by three, then count flows.", answer: "A gets 80 Mbit/s; B gets 40 Mbit/s.", reasoning: "Each flow gets 40, so two flows get 80." },
      { kind: "Compare", prompt: "Why might ECN improve completion time over drop-only signaling at equal congestion response?", hint: "Which useful work avoids repetition?", answer: "Marked packets can arrive without requiring loss recovery.", reasoning: "The sender can reduce load without retransmitting otherwise useful data." }
    ],
    sources: ["congestion", "queues", "dctcp"], advanced: "Shorter-RTT Reno flows can complete more increase cycles per second and gain a rate advantage. In classic TCP ECN, the receiver continues ECE feedback until the sender signals its congestion response with CWR; an isolated observed flag is not the entire feedback cycle. Marks can originate at multiple bottlenecks and arrive after a feedback delay, so they do not identify one queue's location or instantaneous capacity. Specialized modes such as DCTCP require compatible receiver and queue behavior; validate transport, controller and AQM together."
  },
  {
    id: "queues-aqm-bufferbloat", module: "performance", title: "Queues, scheduling, bufferbloat, RED and CoDel",
    concepts: ["packet-queue", "fifo-scheduling", "fair-queueing", "strict-priority-scheduling", "bufferbloat", "active-queue-management", "random-early-detection", "codel", "packet-sojourn-time", "tail-drop"],
    prerequisites: ["ecn-congestion-fairness"],
    meaning: "Queues absorb temporary bursts but add waiting time. Scheduling chooses which packet leaves next; active queue management signals persistent congestion before a queue simply fills.",
    why: "A large buffer can prevent immediate loss while making interactive traffic painfully slow. The right question is useful burst absorption versus sustained standing delay, not 'more buffers are always better.'",
    model: "A waiting room has both an admission policy and a service order. RED and CoDel influence admission/congestion signals; FIFO, priority and fair queueing influence service order. These are related but different controls.",
    steps: [
      "Packets arriving faster than an output can serve accumulate in a queue; tail drop rejects arrivals once the buffer is full.",
      "A scheduler selects service: FIFO follows arrival order; strict priority serves eligible higher classes first; fair queueing separates competing flows or classes and distributes service among active queues, commonly approximating equal or weighted byte shares.",
      "RED uses average queue occupancy and configured thresholds to probabilistically signal congestion before full-buffer overflow.",
      "CoDel measures packet sojourn time and persistent delay over an interval, then drops or marks according to its control procedure to reduce standing queues."
    ],
    example: {
      given: "A 10-Mbit/s output has 250,000 queued bytes before a new packet. Ignore service interruptions and link overhead.",
      steps: ["Convert rate: 10,000,000/8 = 1,250,000 bytes/s.", "Waiting time for existing bytes is 250,000/1,250,000 = 0.2 s.", "The new packet's own serialization adds further time after that wait."],
      result: "About 200 ms queueing delay from only 250 KB of queued data."
    },
    failure: "Strict priority can starve low-priority traffic if the high-priority class is unbounded. Huge FIFO buffers can produce bufferbloat under sustained load.",
    confusions: ["AQM is not the same as fair scheduling; they can be combined.", "CoDel responds to persistent sojourn delay, not just a fixed queue-length threshold."],
    observe: "Measure unloaded versus loaded ping while saturating a controlled link. Inspect queue statistics and qdisc configuration; low packet loss can coexist with unacceptable delay.",
    interview: { answer: "Buffers absorb bursts but cause delay; schedulers allocate service, while RED and CoDel signal persistent congestion early to reduce standing queues and bufferbloat.", followups: ["Why does queue size in bytes imply different delays at different rates?", "How can fair queueing and CoDel complement each other?"] },
    recall: [{ question: "What does packet sojourn time measure?", answer: "Time spent in the queue." }, { question: "What can unbounded strict priority cause?", answer: "Starvation of lower-priority traffic." }],
    tasks: [
      { kind: "Calculate", prompt: "How long do 100,000 queued bytes wait at 20 Mbit/s?", hint: "Convert service rate to bytes per second.", answer: "40 ms.", reasoning: "20,000,000/8 = 2,500,000 bytes/s; 100,000/2,500,000 = 0.04 s." },
      { kind: "Diagnose", prompt: "Bulk throughput is high and loss low, but voice latency rises by 500 ms under load. What should you investigate?", hint: "Successful buffering can be the problem.", answer: "Standing queue delay, bufferbloat and scheduling/AQM configuration.", reasoning: "A deep queue can sustain throughput while delaying time-sensitive packets." }
    ],
    sources: ["queues", "systems"], advanced: "CoDel's RFC 8289 status is Experimental, and deployment parameters matter; combined fair-queue variants add isolation not supplied by plain CoDel. RED depends on appropriate thresholds and averaging. AQM requires sender response for stable load, and cannot manufacture capacity during overload."
  },
  {
    id: "qos-dscp-policy", module: "performance", title: "QoS classes, DSCP and bounded priority",
    concepts: ["quality-of-service", "differentiated-services", "dscp", "per-hop-behavior", "traffic-classification", "weighted-scheduling", "qos-trust-boundary", "qos-admission-control"],
    prerequisites: ["queues-aqm-bufferbloat"],
    meaning: "QoS is deliberate treatment of traffic classes. DSCP is an IP-layer classification label that can select configured per-hop behavior; the label alone provides no end-to-end performance guarantee.",
    why: "Voice, interactive requests and bulk replication tolerate delay and loss differently. A shared link needs explicit policy to protect important traffic without letting one class consume everything.",
    model: "Colored boarding passes identify service classes, but each airport decides what the colors mean. Untrusted passengers cannot be allowed to grant themselves unlimited first priority.",
    steps: [
      "Classify traffic by trusted identity, application or configured match rules at a policy boundary.",
      "Mark or remark the 6-bit DSCP field and map it to local queue and per-hop treatment.",
      "Allocate service through weighted scheduling or bounded priority, with admission/rate controls where necessary.",
      "Verify each congested hop's behavior; upstream marking does not guarantee downstream preservation or matching policy."
    ],
    example: {
      given: "A 100-Mbit/s link allocates two continuously backlogged weighted classes in a 1:3 ratio; there is no other traffic.",
      steps: ["Total weight is 1 + 3 = 4.", "Class A's ideal share is 100 x 1/4 = 25 Mbit/s.", "Class B's ideal share is 100 x 3/4 = 75 Mbit/s.", "If one class is idle, a work-conserving scheduler may lend its unused service."],
      result: "25/75 Mbit/s under the stated saturated model, not fixed caps for every scheduler."
    },
    failure: "Trusting arbitrary client DSCP can let bulk traffic impersonate voice. A downstream router may clear marks or map them differently, breaking assumed class treatment.",
    confusions: ["DSCP is six bits; ECN uses the other two bits of the differentiated-services field.", "Priority affects service order and congestion outcomes; it does not increase physical capacity."],
    observe: "Inspect IP marks before and after policy boundaries, plus queue counters during contention. Compare class latency and drops rather than testing QoS only on an idle link.",
    interview: { answer: "QoS classifies and marks traffic, then uses configured per-hop scheduling and controls; DSCP is a policy input, not a universal latency promise.", followups: ["Why define a marking trust boundary?", "When does weighted sharing differ from strict priority?"] },
    recall: [{ question: "How many bits identify DSCP?", answer: "Six." }, { question: "What does PHB stand for?", answer: "Per-hop behavior." }],
    tasks: [
      { kind: "Calculate", prompt: "An 80-Mbit/s link shares saturated classes with weights 2 and 6. What are their ideal rates?", hint: "Divide by total weight eight.", answer: "20 and 60 Mbit/s.", reasoning: "80 x 2/8 = 20 and 80 x 6/8 = 60." },
      { kind: "Diagnose", prompt: "Packets retain a voice DSCP but still wait behind bulk traffic. What configuration might be absent?", hint: "A label is not a scheduler.", answer: "A matching queue map and service policy at the congested hop.", reasoning: "Without configured treatment, a mark need not change packet service." }
    ],
    sources: ["systems", "kr", "queues"], advanced: "QoS admission control rejects or redirects new reserved work when its requirements would exceed the class budget; priority alone cannot honor unlimited admissions. Domains must agree on mappings and objectives for broader guarantees. Packet sizes and nonpreemptive transmission affect short-term latency even with priority. Encryption can limit classification, so use trusted endpoint policy rather than speculative payload inspection."
  },
  {
    id: "shaping-policing-buckets", module: "performance", title: "Shaping, policing, token buckets and leaky buckets",
    concepts: ["traffic-shaping", "traffic-policing", "token-bucket", "token-bucket-burst", "leaky-bucket", "traffic-contract", "peak-rate-limit", "two-rate-meter"],
    prerequisites: ["qos-dscp-policy"],
    meaning: "Shaping delays traffic to fit a sending contract; policing drops or remarks traffic that violates a contract. A token bucket permits a bounded burst while controlling sustained average rate.",
    why: "Bursty applications can exceed a service agreement momentarily even when their average load is modest. Policy must specify both long-term rate and acceptable bursts.",
    model: "Tokens are prepaid permission to send bytes. Saving tokens allows a brief spending burst, but the wallet has a maximum balance. A leaky bucket as a queued constant-rate drain smooths departures instead.",
    steps: [
      "Configure token rate r and bucket capacity b; replenish tokens with elapsed time up to capacity.",
      "For an arriving packet, compare its accounted size with available tokens and consume tokens if it conforms.",
      "A policer rejects or remarks nonconforming arrivals; a shaper queues them until enough credit or scheduled service is available.",
      "A constant-rate leaky-bucket shaper drains queued traffic at its configured rate; overflow still requires a finite-buffer policy."
    ],
    example: {
      given: "Token rate=1,000 bytes/s, capacity=2,000 bytes, initially full. A 1,500-byte packet and then a 1,000-byte packet arrive immediately.",
      steps: ["First packet consumes 1,500 tokens, leaving 500.", "Second packet lacks 500 tokens.", "A shaper can wait 500/1,000 = 0.5 s before sending it, ignoring other constraints.", "A policer may drop or remark the second packet instead of waiting."],
      result: "The same contract can yield delay under shaping or loss/remarking under policing."
    },
    failure: "A bucket smaller than an accounted packet may never permit that packet under a simple full-packet token rule. An oversized shaping queue can reintroduce bufferbloat.",
    confusions: ["Token rate is not necessarily the instantaneous peak departure rate; saved tokens allow bursts.", "The term leaky bucket is used for both meter and shaper formulations; state the specific drain/queue model."],
    observe: "Compare offered rate, conforming/nonconforming counters, queue delay and actual departures. Verify whether the platform accounts payload, IP bytes or link overhead.",
    interview: { answer: "Shaping waits, policing drops or remarks; token buckets bound sustained rate while allowing stored-credit bursts, whereas a constant-drain leaky-bucket shaper smooths departures.", followups: ["Why must bucket size cover normal packets?", "How do two-rate meters express committed and peak behavior?"] },
    recall: [{ question: "What happens to excess traffic under shaping?", answer: "It is delayed, subject to finite queue limits." }, { question: "What bounds saved token credit?", answer: "Bucket capacity." }],
    tasks: [
      { kind: "Calculate", prompt: "An empty bucket refills at 2,000 bytes/s. How long to admit one 1,000-byte packet if capacity is sufficient?", hint: "Required tokens divided by refill rate.", answer: "0.5 s.", reasoning: "1,000/2,000 = 0.5." },
      { kind: "Compare", prompt: "Why might policing harm a loss-recovering transfer more abruptly than shaping?", hint: "Compare packet fate.", answer: "Policing can discard bursts, triggering retransmission and congestion response; shaping instead queues them.", reasoning: "Both enforce rate but expose different loss-versus-delay feedback." }
    ],
    sources: ["systems", "kr"], advanced: "For a token-bucket contract, admissible bytes over interval t are bounded by b + r t under its accounting model. A two-rate meter can use committed and peak buckets: packets meeting both contracts conform, those exceeding committed but within peak receive another treatment, and those exceeding peak are rejected or marked more severely. Exact rules vary. Chained policers can lose upstream-permitted bursts when downstream buckets are smaller."
  },
  {
    id: "bdp-throughput-goodput", module: "performance", title: "Bandwidth-delay product, throughput and goodput",
    concepts: ["bandwidth-delay-product", "transport-throughput", "application-goodput", "window-limited-throughput", "bottleneck-rate", "protocol-overhead"],
    prerequisites: ["flow-versus-congestion-window", "bbr-model-control"],
    meaning: "Bandwidth-delay product estimates how much data must be outstanding to keep a path busy. Throughput measures delivered rate at a defined layer; goodput counts useful application data rather than protocol or repeated bytes.",
    why: "A fast long-delay link can be underused when windows are too small. Reported wire rate can also exaggerate useful work when headers, retries or application overhead consume capacity.",
    model: "A pipeline needs enough water in transit to keep its exit flowing. The pipe's transit volume is distinct from extra water stored in a tank at a bottleneck queue.",
    steps: [
      "Identify the bottleneck service rate and an appropriate RTT, using explicit units and a baseline-delay assumption.",
      "Compute BDP as rate x RTT; convert bits to bytes when sizing byte windows.",
      "Estimate window-limited rate as outstanding-data allowance/RTT, bounded by link capacity and other constraints.",
      "Define measurement boundaries and subtract headers, duplicate transmissions and nonuseful application bytes when reporting goodput."
    ],
    example: {
      given: "Path rate=100 Mbit/s, baseline RTT=80 ms. Effective window=200,000 bytes. An observed 1,000,000 transmitted bytes include 100,000 retry bytes and 50,000 headers over 1 s.",
      steps: ["BDP = 100,000,000 x 0.08 / 8 = 1,000,000 bytes.", "Window rate ceiling = 200,000/0.08 = 2,500,000 bytes/s = 20 Mbit/s.", "Useful unique payload in the separate 1-second observation is 1,000,000 - 100,000 - 50,000 = 850,000 bytes.", "That observation's goodput is 6.8 Mbit/s."],
      result: "The window is one-fifth the baseline BDP; measured goodput must exclude repeat and overhead bytes under the stated accounting."
    },
    failure: "Sizing a window from a queue-inflated RTT can perpetuate excessive buffering. A large window cannot overcome a slower bottleneck or insufficient application production.",
    confusions: ["BDP is in-flight volume, not a recommendation to add that much bottleneck queue.", "Throughput and goodput need a layer definition; benchmark labels alone are ambiguous."],
    observe: "Compare sustained useful bytes/time, RTT under load, retransmissions and effective windows. Multiple flows can mask one flow's window limitation.",
    interview: { answer: "BDP is rate times RTT; a window below it can cap utilization, while goodput measures useful unique application data rather than all transmitted bytes.", followups: ["Why distinguish baseline and loaded RTT?", "How does protocol overhead change a nominal line-rate result?"] },
    recall: [{ question: "What is BDP's basic formula?", answer: "Bandwidth multiplied by round-trip time." }, { question: "Do retry bytes count as useful unique goodput?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "At 1 Gbit/s and 40 ms baseline RTT, what is BDP in bytes?", hint: "Multiply, then divide by eight.", answer: "5,000,000 bytes.", reasoning: "1,000,000,000 x 0.04 / 8 = 5,000,000." },
      { kind: "Diagnose", prompt: "A 100-Mbit/s path delivers near 20 Mbit/s with 80 ms RTT and a 200 KB effective window. What bottleneck fits?", hint: "Compare window/RTT with link rate.", answer: "Window-limited sending fits the observation.", reasoning: "200,000/0.08 x 8 = 20 Mbit/s; increasing physical capacity alone would not remove this cap." }
    ],
    sources: ["kr", "systems", "congestion"], advanced: "The simple window/RTT model assumes sustained backlogged work and no independent CPU, pacing, recovery or receive constraints. Short transfers are dominated by establishment and startup rather than steady-state BDP. Goodput accounting must avoid subtracting overlapping categories twice and should distinguish compression benefits from transport efficiency."
  },
  {
    id: "jitter-tail-latency-incast", module: "performance", title: "Jitter, tail latency and incast",
    concepts: ["packet-delay-variation", "jitter-buffer", "tail-latency", "latency-percentile", "fanout-tail-amplification", "incast", "incast-queue-burst"],
    prerequisites: ["queues-aqm-bufferbloat", "bdp-throughput-goodput"],
    meaning: "Latency is waiting and travel time; jitter is variation under a stated metric. Tail latency describes unusually slow outcomes, and incast is many senders converging on one receiver or bottleneck at once.",
    why: "Average performance hides missed media deadlines and rare slow dependencies. Parallel request fanout can amplify rare delays, while synchronized replies create bursts that average-rate calculations overlook.",
    model: "A group meal finishes when the last required dish arrives. Many kitchens sending dishes simultaneously can overwhelm the single serving hatch even when their long-term average production looks safe.",
    steps: [
      "Measure delay distributions and define the jitter statistic. One simple metric is absolute adjacent-delay change: delays 20, 35 and 25 ms give changes 15 and 10 ms, averaging 12.5 ms; media protocols may use different smoothed definitions.",
      "A jitter buffer delays playout to absorb some variation, trading extra baseline delay against fewer late arrivals.",
      "For fanout waiting on every required branch, completion depends on the slowest branch; examine tail percentiles rather than only means.",
      "For incast, sum synchronized arrivals at the converging queue and compare with output service and buffering; reduce synchronization, pace senders or control admission where appropriate."
    ],
    example: {
      given: "A request waits for 100 independent branches. Each branch has 1% probability of exceeding 200 ms. Separately, 20 senders each return 50 KB to one 1-Gbit/s output.",
      steps: ["Probability all branches finish within 200 ms is 0.99^100, approximately 0.366.", "Probability the request exceeds 200 ms is therefore about 63.4%.", "The synchronized reply burst totals 20 x 50,000 = 1,000,000 bytes.", "Minimum serialization at 1 Gbit/s is 1,000,000 x 8 / 1,000,000,000 = 8 ms, excluding queue competition."],
      result: "Rare per-branch delays become common request delays; synchronized replies create a substantial burst."
    },
    failure: "A buffer sized for average traffic can overflow during incast, causing losses and recovery delays. A larger jitter buffer cannot repair absent packets and can violate interactive latency budgets.",
    confusions: ["High throughput does not imply low tail latency.", "Percentile latencies cannot generally be added to derive an end-to-end percentile; dependence and distributions matter."],
    observe: "Record p50/p95/p99 completion times, late-packet rates and queue bursts under realistic fanout. Average ping on an idle path misses synchronized production failures.",
    interview: { answer: "Jitter measures delay variation, tails expose rare slow outcomes, and incast creates synchronized converging bursts; fanout can amplify tail risk even when each branch is usually fast.", followups: ["How do correlated branches change the independence calculation?", "Why can pacing improve tail behavior at the same average load?"] },
    recall: [{ question: "What does p99 identify?", answer: "A latency threshold at or below which roughly 99% of observations fall, under the chosen percentile convention." }, { question: "What direction pattern defines incast?", answer: "Many simultaneous senders converging toward one receiver or bottleneck." }],
    tasks: [
      { kind: "Calculate", prompt: "Ten independent branches each meet a deadline with probability 0.95. What is the chance all meet it?", hint: "Multiply independent success probabilities.", answer: "0.95^10, approximately 59.9%.", reasoning: "An all-required request succeeds only when every branch meets the deadline." },
      { kind: "Diagnose", prompt: "Mean load is below capacity, but synchronized replies lose packets. What measurement is missing?", hint: "Average rate hides short intervals.", answer: "Burst arrival volume/rate and queue occupancy during reply synchronization.", reasoning: "Transient aggregate arrivals can exceed service and buffer capacity despite a safe long-term mean." }
    ],
    sources: ["kr", "systems", "dctcp"], advanced: "Fanout calculations depend on independence and an all-branches completion rule; shared infrastructure can correlate delays. Hedged requests may reduce tails but increase offered load and duplicate-work risk. In controlled datacenters, ECN-responsive schemes can help incast, yet admission, pacing and application synchronization remain essential."
  }
];
