import type { NetworkLesson } from "./schema";

export const specialistLessons: NetworkLesson[] = [
  {
    id: "multicast-trees",
    module: "enterprise",
    title: "Multicast membership and distribution trees",
    concepts: ["ip-multicast", "igmp", "mld", "pim-sparse-mode", "reverse-path-forwarding"],
    prerequisites: [],
    meaning: "IP multicast delivers one source stream to a receiver group. Routers copy packets only where paths split. IGMP reports IPv4 receiver membership. MLD performs that job for IPv6. Neither protocol builds the whole routed tree.",
    why: "Sending a separate video stream to every viewer wastes bandwidth on shared links. Multicast saves those repeated bytes, but requires membership state and routing support. It is not automatically available across the public Internet.",
    model: "Think of a water pipe with branches opened by interested receivers. LIMITS: a group address is not a subscriber identity. Delivery is best effort. Membership does not authenticate viewers or encrypt content.",
    steps: [
      "A host joins a group with IGMP or MLD. A local querier refreshes membership. Snooping switches use these messages to avoid flooding every access port.",
      "PIM sparse mode initially joins toward a rendezvous point. The rendezvous point connects source registration with receiver interest through a shared tree.",
      "Routers can change to a source-specific shortest-path tree. Reverse-path forwarding checks whether traffic arrived through the expected upstream interface.",
      "Leave messages and membership timers remove unused branches. Wrong unicast routes can break the reverse-path check even when group membership is correct."
    ],
    example: {
      given: "One source sends 8 Mb/s. Four viewers share one upstream link, then split onto two branches with two viewers each.",
      result: "The upstream carries 8 Mb/s rather than 32 Mb/s. Each branch carries 8 Mb/s before its final split.",
      steps: [
        "Four separate unicast copies would require 4 x 8 = 32 Mb/s upstream.",
        "Both downstream routers join the same multicast tree. The source-side router forwards one upstream stream.",
        "The split router creates two copies, totaling 16 Mb/s across its two branch interfaces.",
        "The final switches replicate toward viewer ports. They do not send four copies across the shared upstream."
      ]
    },
    failure: "A stale snooping entry can black-hole a receiver. A missing querier can let membership expire. A reverse-path failure drops traffic even though a packet capture shows the sender transmitting.",
    confusions: ["IGMP and MLD manage local membership; PIM manages routed distribution.", "Multicast is not broadcast, and a joined group does not promise reliable delivery."],
    observe: "Compare membership tables, multicast route entries, incoming-interface checks and interface counters. Capture joins before investigating the application decoder.",
    interview: {
      answer: "Multicast shares a stream until paths diverge. Membership protocols identify interested links, while PIM builds forwarding trees.",
      followups: ["Why can a unicast routing change disrupt multicast?", "When would source-specific multicast avoid rendezvous-point complexity?"]
    },
    recall: [
      { question: "Which protocol reports IPv6 multicast membership?", answer: "MLD." },
      { question: "What does PIM sparse mode use a rendezvous point for?", answer: "Connecting source registration with receiver interest on an initial shared distribution tree." },
      { question: "What does reverse-path forwarding check?", answer: "The packet arrived through the expected interface toward its source or tree root." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Six viewers share an upstream link for a 5 Mb/s stream. Compare unicast and multicast upstream rates.", hint: "Count upstream copies, not final receiver deliveries.", answer: "Unicast needs 30 Mb/s; multicast needs 5 Mb/s.", reasoning: "Six independent streams use 6 x 5. A shared tree carries one copy before branching." },
      { kind: "Diagnose", prompt: "IGMP joins exist, but PIM drops packets on the wrong incoming interface. What should you inspect?", hint: "The tree relies on another routing view.", answer: "Inspect the unicast route and reverse-path interface toward the source or rendezvous point.", reasoning: "Local receiver interest cannot override an upstream reverse-path mismatch." }
    ],
    sources: ["multicast", "systems"],
    advanced: "PIM sparse mode is an Internet Standard. IGMP/MLD versions differ in source filtering. Verify host, switch and router support before assuming source-specific behavior.",
    diagram: "source -- 8 Mb/s -- router\n                      |-- 8 Mb/s -- branch -- viewers\n                      `-- 8 Mb/s -- branch -- viewers"
  },
  {
    id: "mpls-vrf-vpns",
    module: "enterprise",
    title: "MPLS labels, VRFs and provider VPNs",
    concepts: ["mpls", "label-switched-path", "vrf", "route-distinguisher", "route-target", "mpls-ip-vpn"],
    prerequisites: [],
    meaning: "MPLS forwards packets using locally meaningful labels. A label-switched path connects ingress and egress routers. A VRF is a separate routing table. A provider VPN combines separate tables with controlled route exchange.",
    why: "Two customers can both use 10.0.0.0/24. One global table cannot distinguish their destinations. Provider edges keep separate customer tables while the backbone transports packets toward the correct edge.",
    model: "An outer shipping label selects the depot. An inner label selects the customer delivery context. LIMITS: MPLS VPN isolation is not encryption. Labels are locally assigned, not globally meaningful host addresses.",
    steps: [
      "The ingress edge selects a route in the customer's VRF. A route distinguisher makes an overlapping prefix unique in the VPN route distribution system.",
      "Route targets express import and export policy. They decide which VRFs receive a route, rather than making the prefix unique.",
      "The ingress typically pushes a transport label above a VPN label. Core routers swap the transport label without looking up the customer's IP route.",
      "The egress uses the VPN label to select a forwarding context or action. Some paths remove the outer label at the penultimate router."
    ],
    example: {
      given: "Customer A and B both advertise 10.0.0.0/24. A uses distinguisher 65000:1 and target 65000:10. B uses 65000:2 and 65000:20.",
      result: "Both routes coexist. A-only import policy does not install B's route.",
      steps: [
        "Represent A's route as 65000:1 plus 10.0.0.0/24, and B's as 65000:2 plus the same prefix.",
        "A remote A VRF imports target 65000:10. It rejects B's target 65000:20.",
        "For an A packet, push an illustrative VPN label 240 beneath transport label 100.",
        "A core hop swaps outer 100 to 180. The egress interprets inner 240 within its assigned label context."
      ]
    },
    failure: "An incorrect route-target import can expose another customer's routes. A correct VPN label with a broken transport path still cannot reach the egress.",
    confusions: ["Route distinguishers create uniqueness; route targets control membership.", "A provider VPN does not replace authenticated encryption when confidentiality is required."],
    observe: "Inspect VRF routes, VPN advertisements, imported targets and label forwarding entries. Test using the correct source VRF, not the provider's global table.",
    interview: {
      answer: "MPLS transports labeled packets. VRFs isolate routing contexts, and BGP VPN attributes control overlapping routes and their distribution.",
      followups: ["How can an import-policy error cross an isolation boundary?", "Why can the core lack all customer prefixes?"]
    },
    recall: [
      { question: "What makes identical VPN prefixes unique?", answer: "The route distinguisher combined with the prefix." },
      { question: "Which attribute controls VRF route import?", answer: "The route target." }
    ],
    tasks: [
      { kind: "Predict", prompt: "A VRF imports targets 65000:10 and 65000:20. Which customer routes from the example can enter?", hint: "Import targets are membership policy.", answer: "Routes from both A and B can enter.", reasoning: "Separate distinguishers prevent identity collisions but do not forbid imports. An overlapping destination may then require local route selection." },
      { kind: "Explain", prompt: "A core router swaps outer label 100 for 180. Did the customer's destination address change?", hint: "Separate the transport envelope from its payload.", answer: "No. The local transport label changed; the customer IP destination stayed the same.", reasoning: "Label swapping advances the packet along the path without rewriting its IP destination." }
    ],
    sources: ["mpls", "vrf"],
    advanced: "RFC 3031 and RFC 4364 are Proposed Standards. Label distribution, segment routing and encrypted VPN technologies are separate mechanisms with separate deployment requirements."
  },
  {
    id: "ospf-areas",
    module: "enterprise",
    title: "OSPF areas, flooding and convergence",
    concepts: ["ospf-areas", "ospf-lsa", "ospf-spf", "ospf-summarization"],
    prerequisites: [],
    meaning: "OSPF routers flood link-state advertisements and calculate shortest paths from a topology database. Areas limit the scope of detailed topology. Area border routers connect those scopes and advertise reachability between them.",
    why: "A large flat topology makes every change visible to many routers. Areas reduce detailed flooding and calculation work. They also introduce boundaries where summaries can hide failures.",
    model: "Each area has a shared map, not a shared forwarding table. Every router runs its own calculation from its own position. LIMITS: synchronized maps do not imply identical next hops. OSPF metric is administrative cost, not live queue delay.",
    steps: [
      "Hello messages discover neighbors and check compatible settings. Selected neighbors exchange database descriptions and request missing advertisements.",
      "New advertisements carry sequence and age information. Flooding distributes a newer topology record within its allowed scope.",
      "Each router runs shortest-path first and installs eligible routes. On broadcast networks, a designated router reduces adjacency overhead.",
      "Area border routers advertise inter-area reachability through the backbone. Summarization can reduce route count but must match actual destination coverage."
    ],
    example: {
      given: "Within one area, A-B costs 10, B-D costs 10, A-C costs 5 and C-D costs 30.",
      result: "A initially reaches D through B at cost 20. After B-D fails, the remaining route through C costs 35.",
      steps: [
        "Compare A-B-D: 10 + 10 = 20, with A-C-D: 5 + 30 = 35.",
        "Select B as the next hop for D because 20 is smaller.",
        "Detect B-D failure and flood a changed link-state record.",
        "Run shortest-path first again. Remove the failed edge and select the 35-cost path."
      ]
    },
    failure: "Mismatched area IDs, authentication or timers can prevent adjacency. MTU mismatch may stall database exchange. An overly broad summary can attract traffic for a failed subnet.",
    confusions: ["An OSPF neighbor is not necessarily a fully adjacent database-exchange peer.", "Lower cost means preferred by this configured metric, not automatically faster in every workload."],
    observe: "Read neighbor state, link-state database age, interface cost and route installation timestamps. Distinguish failure detection time from flooding and calculation time.",
    interview: {
      answer: "OSPF distributes a topology map, computes shortest paths locally and uses areas to contain detailed state.",
      followups: ["Why can summarization create a black hole?", "Which parts of convergence remain slow even with a fast shortest-path calculation?"]
    },
    recall: [
      { question: "What is an LSA?", answer: "A link-state advertisement describing scoped routing information." },
      { question: "What does an area boundary hide?", answer: "Detailed topology from other areas, while exporting reachability." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A-B costs 7 and B-D costs 8. A-C costs 4 and C-D costs 15. Which path wins?", hint: "Add link costs on each complete path.", answer: "A-B-D wins with 15 versus 19.", reasoning: "Shortest-path first minimizes total configured cost, not the first link alone." },
      { kind: "Predict", prompt: "An area border router keeps advertising a summary after one covered subnet fails. Can remote routers still send packets for that subnet toward it?", hint: "A summary hides individual subnet detail.", answer: "Yes, potentially causing a black hole.", reasoning: "Other areas still see aggregate reachability and may lack a more specific route describing the failure." },
      { kind: "Diagnose", prompt: "Hellos arrive, but database exchange repeatedly stalls with different interface MTUs. What is the likely boundary?", hint: "Neighbor discovery succeeds before full synchronization.", answer: "Adjacency formation and database exchange, not basic packet reachability.", reasoning: "Compatible discovery does not guarantee that the database exchange checks and packet sizes succeed." }
    ],
    sources: ["ospf", "systems"],
    advanced: "OSPFv2 is an Internet Standard for IPv4. OSPFv3 and specialized area extensions have separate specifications. Area design must preserve backbone connectivity."
  },
  {
    id: "bgp-policy-reflection",
    module: "enterprise",
    title: "BGP policy and route reflection",
    concepts: ["bgp-policy", "bgp-communities", "route-reflection"],
    prerequisites: [],
    meaning: "BGP distributes reachability with path attributes. An operator's policy decides which paths are acceptable and preferred. Route reflection lets selected internal routers relay routes without a full mesh of internal BGP sessions.",
    why: "Business relationships can matter more than shortest physical distance. An autonomous system may prefer a paid customer path over a provider path. Internal route distribution must scale without losing reachable next hops.",
    model: "BGP is a policy-filtered set of offers, not a global fastest-path algorithm. A route reflector is an internal distributor. LIMITS: its selected offer may hide alternatives from clients, and reflection does not make a next hop reachable.",
    steps: [
      "Apply import filters and set attributes such as local preference. A community is a policy tag only when receiving routers have rules that interpret it.",
      "Select among eligible routes. Local preference commonly precedes AS-path length; exact later tie-breakers depend on implementation and configuration.",
      "Reflect eligible internal routes between clients and other peers. Originator and cluster information prevent reflection loops.",
      "Resolve the selected next hop through the internal routing system. Export only routes allowed by the neighbor relationship."
    ],
    example: {
      given: "An AS learns a prefix from a customer with local preference 200 and AS-path length 4. A provider offers preference 100 and length 2.",
      result: "The customer route wins despite its longer AS path. A reflector can distribute that selected route to clients.",
      steps: [
        "Confirm both routes pass import policy and have reachable next hops.",
        "Compare local preferences: 200 exceeds 100.",
        "Choose the customer route before comparing AS-path length.",
        "Reflect the selected route. Each client still needs an internal path to its advertised next hop."
      ]
    },
    failure: "A reflector can hide a better exit for a distant client. A route can appear in BGP yet fail installation because its next hop is unresolved. An ignored community does not enforce policy.",
    confusions: ["BGP AS-path length is not hop count through all routers.", "Route reflection reduces sessions; it does not automatically optimize every client's forwarding path."],
    observe: "Inspect accepted and rejected advertisements, local preference, communities, reflector attributes and next-hop resolution. Compare the BGP table with the forwarding table.",
    interview: {
      answer: "BGP chooses policy-compliant paths. Route reflectors scale internal distribution, but selection and next-hop reachability remain separate concerns.",
      followups: ["How does route reflection hide alternative exits?", "Why must export policy distinguish customer, peer and provider routes?"]
    },
    recall: [
      { question: "What does local preference express?", answer: "Preference among paths inside an AS, with higher values normally preferred." },
      { question: "What scaling problem does route reflection address?", answer: "The number of internal BGP sessions required by a full mesh." },
      { question: "Does a community enforce policy by itself?", answer: "No. Receiving policy must interpret its tag." }
    ],
    tasks: [
      { kind: "Predict", prompt: "Path X has preference 150 and length 5. Path Y has preference 100 and length 1. Both are eligible. Which wins at this stage?", hint: "Compare local preference first.", answer: "Path X.", reasoning: "A shorter AS path does not override the higher local preference in the usual ordering." },
      { kind: "Diagnose", prompt: "A reflected route has an unreachable next hop. Will adding more reflector clients fix forwarding?", hint: "Separate control-plane distribution from internal connectivity.", answer: "No. Repair next-hop reachability or the intended next-hop policy.", reasoning: "More copies of the same unresolved route do not create a usable forwarding action." }
    ],
    sources: ["bgp", "systems"],
    advanced: "Base BGP-4 is a Draft Standard, which is a standards-track status rather than an Internet-Draft. Route reflection, communities and additional-path capabilities are separately specified."
  },
  {
    id: "bgp-origin-safety",
    module: "enterprise",
    title: "Route leaks, hijacks, RPKI and BGPsec",
    concepts: ["bgp-route-leak", "bgp-prefix-hijack", "rpki", "route-origin-authorization", "origin-validation", "bgpsec", "bgp-path-validation", "bgpsec-signatures"],
    prerequisites: ["bgp-policy-reflection"],
    meaning: "A route leak violates intended export scope. A hijack advertises unauthorized reachability. RPKI origin validation checks origin AS and prefix length against signed authorizations. BGPsec adds cryptographic AS-path validation.",
    why: "BGP accepts advertisements from configured peers, but peer trust alone does not prove prefix ownership. Incorrect exports can redirect traffic even when the advertised origin really owns the prefix.",
    model: "An origin authorization grants prefix permission. BGPsec is a signed chain of route propagation. LIMITS: neither proves acceptable export policy. A valid origin and authentic path can still describe a leak.",
    steps: [
      "A resource holder publishes a signed authorization containing prefix, origin AS and maximum permitted prefix length.",
      "Validators verify the resource certificate chain and deliver validated records to routers. Routers compare each advertisement with covering records.",
      "Classify a route as valid when an applicable authorization permits it, invalid when covering records exist but none permit it, or not found when no covering record exists.",
      "Apply explicit routing policy to these states. Combine origin checks with prefix filters and export rules; not found does not prove an attack.",
      "In BGPsec, participating ASes sign propagation information using RPKI-certified router keys. Each signature binds the prefix and intended next AS into the chain. Validators check the chain, not just the origin authorization."
    ],
    example: {
      given: "A validated authorization allows AS65010 to originate 203.0.113.0/24 with maximum length /24. Consider three advertisements.",
      result: "The /24 from AS65010 is valid. The /24 from AS65020 is invalid. A /25 from AS65010 is also invalid.",
      steps: [
        "For AS65010's /24, both origin and allowed length match.",
        "For AS65020's /24, a covering authorization exists but the origin does not match.",
        "For AS65010's /25, the origin matches but 25 exceeds the maximum length 24.",
        "A leak of AS65010's valid /24 still passes origin validation.",
        "In a BGPsec example, AS65010 signs toward AS65030, which signs toward AS65040. Substituting AS65020 breaks chain validation without corresponding valid signatures. Honest signatures on an improper export still do not prove policy compliance."
      ]
    },
    failure: "A stale authorization can invalidate legitimate deaggregation. Validator outages need a defined policy. BGPsec requires participating equipment and key operations; unsigned fallback routes lack its path assurance.",
    confusions: ["Not found means no covering authorization, not confirmed illegitimacy.", "Origin validation checks prefix permission; BGPsec checks signed propagation. Neither encrypts traffic or verifies commercial export policy."],
    observe: "Inspect origin state, authorization maximum length, validator freshness and export relationships. Correlate route changes with reachability and independent observations.",
    interview: {
      answer: "RPKI origin validation checks prefix permission. BGPsec verifies signed path propagation. Both still need export policy to prevent route leaks.",
      followups: ["How can an authentic BGPsec path still contain a leak?", "What assurance remains when partial deployment accepts unsigned fallback routes?"]
    },
    recall: [
      { question: "What does an authorization's maximum length limit?", answer: "The most specific permitted prefix advertisement." },
      { question: "What does BGPsec add beyond origin validation?", answer: "Verification of a signed AS propagation chain, including the intended next AS." },
      { question: "Does origin validation verify every AS-path hop?", answer: "No." }
    ],
    tasks: [
      { kind: "Predict", prompt: "A ROA permits AS64500 for 198.51.100.0/24, max /26. What state does its /27 get?", hint: "Compare prefix length with the maximum.", answer: "Invalid.", reasoning: "The origin matches, but a /27 is more specific than the allowed /26." },
      { kind: "Compare", prompt: "An attacker invents an intermediate AS but keeps the authorized origin. Contrast origin validation with a fully validated BGPsec chain.", hint: "Prefix permission and signed propagation prove different claims.", answer: "Origin validation can still report valid. BGPsec rejects the changed chain without valid corresponding signatures.", reasoning: "The origin check does not inspect intermediate hops; chained signatures bind propagation information. This assumes a fully protected path rather than accepted unsigned fallback." },
      { kind: "Compare", prompt: "An AS exports its provider's valid-origin route to another provider. Is the main fault origin ownership or export policy?", hint: "The prefix holder can remain unchanged.", answer: "Export policy: this is a route leak.", reasoning: "The route can have a valid origin while violating the intended transit relationship." }
    ],
    sources: ["rpki", "bgp", "bgpsec"],
    advanced: "RFC 6811 origin validation and RFC 8205 BGPsec Protocol Specification are Proposed Standards. BGPsec is not universal deployment. Validation state, unsigned fallback and operational rejection policy are separate decisions."
  },
  {
    id: "evpn-vxlan",
    module: "enterprise",
    title: "EVPN control plane and VXLAN overlays",
    concepts: ["evpn", "vxlan", "vtep", "vni", "evpn-mac-learning", "overlay-underlay"],
    prerequisites: [],
    meaning: "VXLAN carries an Ethernet frame inside an IP/UDP tunnel. A tunnel endpoint is a VTEP. A virtual network identifier selects an overlay segment. EVPN distributes endpoint reachability using BGP rather than relying only on data-plane flooding.",
    why: "A routed fabric can carry many isolated tenant segments without extending one physical VLAN everywhere. Endpoint moves still need timely distribution, and the fabric must carry larger encapsulated packets.",
    model: "The underlay delivers an envelope to a tunnel endpoint. The overlay identifies the tenant and destination inside it. LIMITS: overlay reachability cannot repair a broken underlay. A VNI is isolation metadata, not cryptographic authentication.",
    steps: [
      "Learn a local endpoint's MAC and possibly IP address. Advertise that binding with an EVPN MAC/IP route.",
      "Remote VTEPs import relevant EVPN routes and map the destination to a remote tunnel endpoint.",
      "Encapsulate the tenant Ethernet frame with a VXLAN header, UDP header and outer IP header. Route that packet through the underlay.",
      "The receiving VTEP removes the envelope and forwards in the matching tenant context. Broadcast, unknown-unicast and multicast delivery still need an explicit replication design."
    ],
    example: {
      given: "A tenant sends a 1500-byte IP packet. Use a 14-byte inner Ethernet header without FCS, 8-byte VXLAN, 8-byte UDP and 20-byte outer IPv4 headers.",
      result: "The outer IP packet is 1550 bytes, so a 1500-byte underlay IP MTU is insufficient.",
      steps: [
        "The inner Ethernet frame carried in the tunnel is 1500 + 14 = 1514 bytes.",
        "Add 8 + 8 + 20 = 36 bytes of tunnel headers.",
        "The outer IP packet is 1514 + 36 = 1550 bytes.",
        "Provision adequate underlay MTU or reduce tenant MTU. Outer Ethernet framing is additional and is not part of IP MTU."
      ]
    },
    failure: "A stale endpoint route sends traffic to an old VTEP. MTU mismatch may allow small pings but drop real payloads. Missing replication state breaks discovery even when known-unicast routes work.",
    confusions: ["EVPN is the reachability control plane; VXLAN is an encapsulation.", "A healthy BGP session does not prove the underlay can transport the tunnel's packet size."],
    observe: "Inspect EVPN MAC/IP routes, VNI mappings, endpoint move state, tunnel counters and large-packet tests. Compare inner and outer packet captures.",
    interview: {
      answer: "EVPN tells VTEPs where endpoints live. VXLAN carries their frames across a routed underlay with explicit tenant context.",
      followups: ["How does endpoint mobility differ from ordinary MAC aging?", "Why does an overlay need a deliberate unknown-destination policy?"]
    },
    recall: [
      { question: "What is a VTEP?", answer: "A VXLAN tunnel endpoint that encapsulates or decapsulates frames." },
      { question: "How does EVPN distribute learned MAC/IP reachability?", answer: "Through BGP route advertisements imported by relevant remote VTEPs." },
      { question: "What selects the VXLAN segment?", answer: "The VNI." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Repeat the example with a 40-byte outer IPv6 header. What outer IP packet size results?", hint: "Only the outer IP header changes.", answer: "1570 bytes.", reasoning: "1514 + 8 + 8 + 40 = 1570. Outer link framing remains outside IP MTU." },
      { kind: "Diagnose", prompt: "Small tenant packets pass, but 1500-byte packets fail on a 1500-byte underlay. Which layer should you check first?", hint: "The tunnel adds bytes.", answer: "Underlay MTU and tunnel PMTU handling.", reasoning: "A full-size tenant packet becomes larger than the underlay's allowed IP packet." }
    ],
    sources: ["evpn", "systems"],
    advanced: "RFC 8365 is a Proposed Standard. EVPN route types, multihoming and implementation-specific suppression features need separate verification.",
    diagram: "host -- VTEP A == outer IP underlay == VTEP B -- host\n        [inner frame + VNI inside UDP/IP envelope]"
  },
  {
    id: "programmable-forwarding",
    module: "enterprise",
    title: "SDN, OpenFlow and P4 pipelines",
    concepts: ["sdn", "openflow", "match-action-pipeline", "p4", "programmable-parser"],
    prerequisites: [],
    meaning: "Software-defined networking makes control policy programmable and separates it from packet forwarding. OpenFlow exposes flow-table control. P4 describes packet parsing and match-action processing on a supported forwarding target.",
    why: "An operator may need a consistent policy across many switches or a new packet-processing function. Installing table entries and changing what a switch can parse are different jobs.",
    model: "OpenFlow resembles filling rule rows in a supported machine. P4 resembles describing parts of the machine's packet pipeline. LIMITS: neither gives unlimited memory or arbitrary computation at wire speed. Hardware stages and supported actions constrain both.",
    steps: [
      "A controller translates intent into rules and reconciles actual device state. Logical centralization need not mean one physical controller.",
      "An OpenFlow switch matches fields and priorities, then applies actions such as forwarding or dropping. A table miss follows configured behavior.",
      "A P4 parser extracts declared headers. Tables match fields and run permitted actions. A deparser emits the resulting packet.",
      "A control-plane API installs table entries for the compiled P4 program. Coordinate updates so partially installed policy does not create loops or unintended access."
    ],
    example: {
      given: "An OpenFlow table has priority 100: destination 10.0.0.0/24 -> port 2, and priority 200: destination 10.0.0.7 -> drop.",
      result: "A packet for 10.0.0.7 is dropped. A packet for 10.0.0.8 uses port 2.",
      steps: [
        "For .7, both rules match the destination field.",
        "Priority 200 wins over 100, so the drop action applies.",
        "For .8, only the subnet rule matches, so output is port 2.",
        "If a custom header is needed, first verify the pipeline can parse it. A controller cannot install a field match that the target cannot represent."
      ]
    },
    failure: "Controller disconnection may leave old rules active or trigger configured fail behavior. A compiled P4 program can exceed table resources. Non-atomic multi-switch updates can briefly violate policy.",
    confusions: ["SDN is an architectural approach, not a synonym for OpenFlow.", "P4 defines packet processing; its control plane still needs to install entries and manage state."],
    observe: "Inspect actual table entries, priorities, miss counters and controller reconciliation logs. For P4, inspect parser errors, compiler resource reports and target-specific counters.",
    interview: {
      answer: "SDN separates programmable control from forwarding. OpenFlow programs supported tables; P4 specifies supported packet-processing pipelines.",
      followups: ["How would you update multiple switches without a transient loop?", "Why does a valid P4 program still fail to fit a particular ASIC?"]
    },
    recall: [
      { question: "Does SDN require one physical controller?", answer: "No. Logically centralized policy can be implemented by a distributed control system." },
      { question: "Which OpenFlow rule wins when two entries match?", answer: "The higher-priority applicable entry." },
      { question: "What is the P4 deparser's job?", answer: "Emit packet headers and payload in the programmed output form." }
    ],
    tasks: [
      { kind: "Predict", prompt: "Add priority 300: source 192.0.2.5 -> port 4. A packet from that source targets 10.0.0.7 in the same table. What happens?", hint: "This example uses one highest-priority match.", answer: "It uses port 4.", reasoning: "The priority-300 entry overrides the priority-200 destination drop. Rule ordering can unintentionally weaken policy." },
      { kind: "Compare", prompt: "You need to parse a new custom header, not just update destinations. Is adding an OpenFlow destination entry enough?", hint: "Separate parser capability from table contents.", answer: "No. You need a supporting pipeline, potentially a compiled P4 program on a capable target.", reasoning: "A table update cannot create an unsupported parsed field." }
    ],
    sources: ["sdn", "p4"],
    advanced: "OpenFlow specifications are versioned industry specifications. P4_16 is a language specification with target-dependent support. SDN products need not use either interface."
  },
  {
    id: "nfv-traffic-engineering",
    module: "enterprise",
    title: "NFV service chains and traffic engineering",
    concepts: ["nfv", "service-function-chain", "traffic-engineering", "admission-control", "stateful-service-placement"],
    prerequisites: ["mpls-vrf-vpns"],
    meaning: "Network functions virtualization runs functions such as firewalls on software compute rather than only dedicated appliances. A service chain orders those functions. Traffic engineering steers demand across paths using capacity and policy constraints.",
    why: "Shortest paths can overload one link while another is idle. Moving a firewall instance can add capacity, but its session state and packet steering must move consistently.",
    model: "Choose both the road and the inspection stations. LIMITS: an engineered path cannot create link capacity. A software function is not stateless merely because it runs in a virtual machine or container.",
    steps: [
      "Measure demand, link capacity, latency and function processing limits. Include headroom for bursts and failures rather than planning only for averages.",
      "Choose a path and function order. Label-switched paths or other steering methods can separate the chosen path from ordinary shortest-path routing.",
      "Admit traffic only when required links and functions have sufficient resources. Configure forward and reverse steering consistently for stateful functions.",
      "Scale or move functions with a state-transfer or connection-draining plan. Verify the real data plane follows the intended chain."
    ],
    example: {
      given: "Two paths each offer 10 Gb/s. Path A already carries 8 Gb/s and B carries 3 Gb/s. A new 4 Gb/s chain needs a firewall able to process 6 Gb/s.",
      result: "Path B can carry the new flow at 7 Gb/s total. Path A would be overloaded at 12 Gb/s.",
      steps: [
        "Compute residual capacity: A has 10 - 8 = 2 Gb/s; B has 10 - 3 = 7 Gb/s.",
        "Reject A for a 4 Gb/s demand because 4 exceeds 2.",
        "Check the selected firewall's 6 Gb/s processing capacity against the new 4 Gb/s demand.",
        "Place the flow on B and steer both directions through the same stateful context. Keep remaining headroom in the failure plan."
      ]
    },
    failure: "A backup path may exist but lack capacity after a failure. Asymmetric steering can bypass connection state. Adding virtual instances may not help if all share one saturated NIC.",
    confusions: ["NFV describes software function deployment; SDN describes control and forwarding programmability.", "Bandwidth reservation alone does not prove bounded latency or sufficient CPU."],
    observe: "Measure link utilization, function queue delay, CPU, packet drops and chain traversal. Track per-flow state and failure recovery, not only instance count.",
    interview: {
      answer: "NFV changes where functions run. Traffic engineering selects feasible paths and placements while respecting capacity, state and failure constraints.",
      followups: ["How would you preserve sessions during firewall migration?", "What happens when a protected link fails and backup capacity is insufficient?"]
    },
    recall: [
      { question: "What changes when a firewall is deployed through NFV?", answer: "Its function runs on software compute instead of only a dedicated appliance; its session-state requirements remain." },
      { question: "What is a service chain?", answer: "An ordered sequence of network functions that traffic must traverse." },
      { question: "What does admission control prevent?", answer: "Accepting demand that exceeds the planned resource constraints." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A 20 Gb/s link carries 14 Gb/s. A chain requests 8 Gb/s. Can that link admit it without oversubscription?", hint: "Compute residual capacity.", answer: "No. Only 6 Gb/s remains.", reasoning: "14 + 8 = 22 Gb/s exceeds the 20 Gb/s link." },
      { kind: "Diagnose", prompt: "Forward traffic uses firewall X; replies use fresh firewall Y and are dropped. What is the likely problem?", hint: "A connection has state at one function.", answer: "Asymmetric steering without shared or transferred session state.", reasoning: "Y may not recognize the return packet as part of an established session." }
    ],
    sources: ["sdn", "mpls", "systems"],
    advanced: "NFV is an industry architecture, not one wire protocol. Traffic-engineering signaling and service-chain encapsulations have separate standards. Feasibility depends on measured workloads and failure assumptions."
  },
  {
    id: "cellular-registration",
    module: "mobile",
    title: "LTE and 5G radio, core and registration",
    concepts: ["lte-4g", "5g", "cellular-radio-access", "cellular-core", "cellular-registration", "cellular-user-plane"],
    prerequisites: [],
    meaning: "A cellular network combines scheduled radio access with a core that manages identity, mobility and user traffic. LTE uses an evolved packet core. Standalone 5G uses a service-based control architecture and separate user-plane forwarding functions.",
    why: "A phone must prove subscriber credentials and establish packet service while moving across cells. Receiving a strong radio signal does not prove registration, session setup or Internet routing has succeeded.",
    model: "The radio grants airtime; the core authorizes service and anchors traffic. LIMITS: a 5G radio icon does not reveal whether the deployment uses a standalone 5G core. Control-plane registration is not application connectivity.",
    steps: [
      "The device searches for a cell, reads system information and performs random access. The base station establishes radio control signaling.",
      "In LTE, the MME coordinates attachment and authentication with subscriber systems. Gateways support the packet bearer. In standalone 5G, the AMF handles access and mobility control.",
      "A standalone 5G device registers, authenticates through the relevant authentication functions and obtains security context. An SMF manages a PDU session and selects user-plane forwarding.",
      "The radio scheduler grants resources. User packets traverse the base station and packet core toward the data network, independently of many control messages."
    ],
    example: {
      given: "A standalone 5G phone finds a cell. Its registration succeeds, but its requested data-network session is rejected. Compare this with a radio-access failure.",
      result: "The first failure is after identity registration, in session establishment. A radio-access failure occurs before successful core registration.",
      steps: [
        "Cell search and random access establish an initial signaling path.",
        "Registration and authentication create an accepted access context at the core.",
        "The device requests a PDU session through session-management signaling.",
        "A rejected data-network or subscription policy prevents user-plane service even though registration remains successful."
      ]
    },
    failure: "Bad subscription policy can block a session after authentication. A congested radio scheduler can delay traffic despite a healthy core. A broken user-plane tunnel can leave signaling functional.",
    confusions: ["LTE attachment and 5G registration are related procedures, not identical message sequences.", "5G is not just a higher radio bit rate; radio and core deployment choices both matter."],
    observe: "Separate cell selection, access signaling, authentication, session status and user-plane counters. Avoid exposing subscriber identifiers when sharing diagnostic traces.",
    interview: {
      answer: "Cellular service needs radio access, authenticated registration and a usable packet session. LTE and standalone 5G divide these jobs differently.",
      followups: ["Why can a registered device lack data service?", "How does a non-standalone deployment differ from standalone 5G?"]
    },
    recall: [
      { question: "Which LTE core function coordinates attachment and mobility control?", answer: "The MME in the evolved packet core." },
      { question: "Which standalone 5G function manages access and mobility?", answer: "The AMF." },
      { question: "Which standalone 5G function manages PDU sessions?", answer: "The SMF." }
    ],
    tasks: [
      { kind: "Diagnose", prompt: "Authentication succeeds and registration is accepted, but a PDU session is rejected. Should you start by changing the antenna?", hint: "Identify the last successful boundary.", answer: "No. Inspect session policy, subscription and requested data-network configuration first.", reasoning: "The signaling path already supported registration; the explicit failure is session establishment." },
      { kind: "Compare", prompt: "A strong radio signal carries slow data during a busy event. Can the signal reading rule out radio congestion?", hint: "Signal quality and scheduled capacity are different.", answer: "No.", reasoning: "Many users can share limited scheduler resources even with good received signal strength." }
    ],
    sources: ["cellular", "kr"],
    advanced: "LTE and 5G are release-dependent 3GPP standard families. Optional slicing and deployment modes require specific support. Architecture names alone do not promise a particular latency."
  },
  {
    id: "handover-radio-energy",
    module: "mobile",
    title: "Handover, radio scheduling and battery energy",
    concepts: ["cellular-handover", "radio-measurement", "discontinuous-reception", "radio-tail-energy", "scheduled-radio-access"],
    prerequisites: ["cellular-registration"],
    meaning: "Handover moves an active connection between radio cells. Measurement reports help the network choose a target. Discontinuous reception lets a device sleep between listening windows. Traffic timing therefore affects battery use as well as delay.",
    why: "A moving phone needs continuity without repeatedly rebuilding every application connection. A battery device also cannot keep its receiver fully awake forever. Mobility reliability and sleep efficiency can pull in different directions.",
    model: "Handover is a coordinated change of radio attachment, not simply choosing the strongest visible cell. Sleep windows resemble appointments for listening. LIMITS: the device cannot receive every packet instantly while asleep, and handover can still lose or reorder packets.",
    steps: [
      "Measure serving and neighboring cells. Thresholds, hysteresis and time conditions reduce rapid back-and-forth moves near a boundary.",
      "Prepare a target with available resources and security context. The network commands the device to access that target.",
      "Switch or update the traffic path and release old resources. Transport protocols may repair remaining loss or reordering.",
      "Configure sleep cycles and batch suitable application traffic. Scheduled grants coordinate transmission, while initial access may still use contention."
    ],
    example: {
      given: "An illustrative device remains at 0.8 W for a 2-second active tail after each isolated report. It otherwise sleeps at 0.02 W. Compare six reports 10 seconds apart with one batch over 60 seconds.",
      result: "Tail-related energy is about 9.36 J for separate reports and 1.56 J for one batch, excluding transfer and baseline energy.",
      steps: [
        "The active increment above sleep is 0.8 - 0.02 = 0.78 W.",
        "One 2-second tail adds 0.78 x 2 = 1.56 J.",
        "Six non-overlapping tails add 6 x 1.56 = 9.36 J.",
        "One batch creates one illustrative tail, but delays some reports. Real state timers and transfer energy must be measured."
      ]
    },
    failure: "Too little hysteresis creates ping-pong handovers. Too much delay leaves the old link unusable. Aggressive sleeping can miss an application's latency target even when average throughput is adequate.",
    confusions: ["Cell reselection while idle is not the same as active handover.", "Batching saves energy only within application freshness and real modem-state constraints."],
    observe: "Correlate cell-change events, packet gaps, radio state and battery power. Test at cell edges and under movement, not only beside a stationary base station.",
    interview: {
      answer: "Handover coordinates target access and traffic-path change. Radio sleep and traffic batching trade response time against energy consumption.",
      followups: ["How do hysteresis and time-to-trigger reduce ping-pong?", "How would you measure energy without confusing radio tails with application CPU work?"]
    },
    recall: [
      { question: "What does discontinuous reception allow?", answer: "The receiver sleeps between configured listening occasions." },
      { question: "Why use handover hysteresis?", answer: "To avoid repeated cell changes caused by small fluctuating measurements." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A radio tail adds 0.5 W for 3 seconds. Four isolated sends occur. What incremental tail energy results?", hint: "Energy is power multiplied by time.", answer: "6 J.", reasoning: "Each tail costs 0.5 x 3 = 1.5 J; four cost 6 J." },
      { kind: "Predict", prompt: "A receiver checks only every 100 ms. Can that sleep configuration guarantee delivery within 10 ms of arbitrary packet arrival?", hint: "A packet can arrive just after a listening window.", answer: "No.", reasoning: "The next listening opportunity may be nearly 100 ms away, before processing or scheduling delay." }
    ],
    sources: ["cellular", "kr"],
    advanced: "Handover and discontinuous-reception details depend on 3GPP release and configuration. The energy numbers are an explicit model, not standardized modem power figures."
  },
  {
    id: "bluetooth-ble",
    module: "mobile",
    title: "Bluetooth Classic and BLE timing",
    concepts: ["bluetooth-classic", "bluetooth-low-energy", "ble-advertising", "ble-connection-events", "ble-gatt"],
    prerequisites: [],
    meaning: "Bluetooth Classic commonly supports continuous audio and data profiles. Bluetooth Low Energy uses advertising and timed connection events for low-duty-cycle devices. GATT organizes BLE application values into services and characteristics.",
    why: "A sensor needs discovery and small exchanges without continuously listening. An audio stream needs sustained timely delivery. Protocol mode and profile choice matter more than treating all Bluetooth traffic as one behavior.",
    model: "Advertising is a short announcement. A connection event is an agreed meeting. GATT is a structured attribute interface. LIMITS: low energy is a design opportunity, not a guaranteed battery lifetime. Profiles and optional features differ across devices.",
    steps: [
      "A BLE peripheral advertises presence or small data. A scanner must listen during overlapping time and channel opportunities to discover it.",
      "A central establishes a connection with an interval and other timing parameters. Devices exchange packets during connection events and can sleep between them.",
      "The client discovers GATT services and reads, writes or subscribes to characteristics. Notifications and acknowledged indications have different application semantics.",
      "Pairing and link security must be selected deliberately. Protect sensitive values and limit identifiers that enable passive tracking."
    ],
    example: {
      given: "A simplified BLE sensor wakes for 2 ms every 100 ms. It draws 10 mA while awake and 0.01 mA while sleeping. Ignore advertising, retries and processing outside that window.",
      result: "Its modeled average current is 0.2098 mA.",
      steps: [
        "Duty cycle is 2 / 100 = 0.02, or 2 percent.",
        "Active contribution is 10 x 0.02 = 0.2 mA.",
        "Sleep contribution is 0.01 x 0.98 = 0.0098 mA.",
        "Add them: 0.2098 mA. Shorter intervals or retries increase the measured current."
      ]
    },
    failure: "Long intervals can make controls feel slow. Interference causes retries and more energy use. A connected sensor may expose data if characteristic permissions are weaker than the intended trust boundary.",
    confusions: ["Advertising does not mean a connection already exists.", "GATT services describe data organization, not automatic authorization or guaranteed delivery to an application."],
    observe: "Inspect advertising discovery time, negotiated interval, retransmissions and characteristic permissions. Measure current over complete sleep and wake cycles.",
    interview: {
      answer: "BLE reduces duty cycle with advertising and scheduled connection events. GATT exposes application attributes; timing and security choices determine actual behavior.",
      followups: ["How would a shorter connection interval change latency and energy?", "How can a device leak location through identifiers even when payloads are encrypted?"]
    },
    recall: [
      { question: "What is a BLE connection event?", answer: "A scheduled opportunity for connected devices to exchange packets." },
      { question: "What does GATT organize?", answer: "Services and characteristics representing application attributes." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A device is awake 5 ms in each 100 ms period. What is its duty cycle?", hint: "Divide awake time by total time.", answer: "5 percent.", reasoning: "5 / 100 = 0.05." },
      { kind: "Compare", prompt: "A continuous audio product and a once-per-minute sensor both say Bluetooth. Must they use the same transport and profile?", hint: "Classic, BLE and audio features have distinct requirements.", answer: "No. Select and verify the mode and profile for each workload.", reasoning: "Sustained audio timing and sparse sensor transfers require different feature and scheduling support." }
    ],
    sources: ["kr", "systems"],
    advanced: "Bluetooth and BLE are Bluetooth SIG specification families. Newer LE Audio support is not implied by basic BLE capability. This lesson's power model is illustrative, not a product specification."
  },
  {
    id: "lowpan-thread-zigbee",
    module: "mobile",
    title: "6LoWPAN, Thread and Zigbee",
    concepts: ["sixlowpan", "sixlowpan-compression", "lowpan-fragmentation", "thread", "zigbee", "ieee-802154"],
    prerequisites: [],
    meaning: "IEEE 802.15.4 provides small low-power link frames. 6LoWPAN adapts IPv6 to such links with compression and fragmentation. Thread builds an IPv6 mesh using that adaptation. Zigbee uses its own network and application stack over compatible low-power radio.",
    why: "An IPv6 packet can be much larger than a sensor radio frame. Small devices need compact headers, sensible fragmentation and a way to reach other networks without assuming desktop-sized links.",
    model: "6LoWPAN packs a large letter into small envelopes and removes reconstructible header details. LIMITS: compression does not remove application data or create bandwidth. Thread and Zigbee sharing a radio does not make their network stacks interchangeable.",
    steps: [
      "The link sends frames of at most 127 bytes before accounting for MAC and security overhead. Available adaptation payload is therefore smaller.",
      "Compression encodes known or inferable IPv6 header fields compactly. Sender and receiver must agree on any context used for reconstruction.",
      "Fragmentation divides an oversized datagram into pieces with identification and offset information. The receiver buffers pieces until reassembly completes or expires.",
      "Thread routers forward IPv6 mesh traffic, while a border router links the mesh to other IP networks. Zigbee usually needs an application-aware gateway for integration with IP services."
    ],
    example: {
      given: "Assume a link offers 80 useful bytes per fragment after all headers. A compressed datagram still needs 190 bytes. Each fragment independently arrives with probability 0.9.",
      result: "Three fragments are required. Without retries, complete-datagram success is 0.729.",
      steps: [
        "Two fragments carry only 160 bytes, so 190 requires ceiling(190 / 80) = 3.",
        "The final fragment carries 30 bytes in this simplified model.",
        "All three must arrive for complete reassembly.",
        "Multiply 0.9 x 0.9 x 0.9 = 0.729. Real fragment headers, retries and correlated losses change the result."
      ]
    },
    failure: "One missing fragment can waste all other pieces. Reassembly buffers can fill on a constrained node. A Thread border-router outage can isolate the mesh from outside services without breaking local radio links.",
    confusions: ["6LoWPAN is an adaptation layer, not a complete sensor application protocol.", "Thread is IP-based; Zigbee is not simply Thread with a different brand."],
    observe: "Check fragment count, reassembly failures, compression contexts and border-router reachability. Prefer small application messages when loss or memory is constrained.",
    interview: {
      answer: "6LoWPAN fits IPv6 onto small low-power frames. Thread uses it for IP mesh networking; Zigbee uses a different network stack.",
      followups: ["Why do more fragments amplify datagram loss?", "What can still work inside a Thread mesh when its border router fails?"]
    },
    recall: [
      { question: "What is 6LoWPAN's main role?", answer: "Adapting IPv6 packets to constrained low-power links." },
      { question: "What connects a Thread mesh to other IP networks?", answer: "A border router." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A datagram needs four independently delivered fragments with success probability 0.95 each. Find complete success without retries.", hint: "All fragments must succeed.", answer: "0.95^4 = 0.81450625, about 81.45 percent.", reasoning: "Complete reassembly requires the intersection of four independent successful deliveries." },
      { kind: "Compare", prompt: "Two products use 802.15.4, one Thread and one Zigbee. Does radio compatibility ensure application interoperability?", hint: "The stack above the radio differs.", answer: "No.", reasoning: "They use different network and application mechanisms; an appropriate gateway or supported integration is needed." }
    ],
    sources: ["lowpan", "systems"],
    advanced: "RFC 4944 is a Proposed Standard; header compression is updated separately by RFC 6282. Thread and Zigbee are industry specification families with version-dependent capabilities."
  },
  {
    id: "sensor-mesh-adhoc",
    module: "mobile",
    title: "Sensor meshes and ad hoc routing",
    concepts: ["wireless-mesh", "ad-hoc-routing", "sensor-networks", "mesh-route-metric", "sensor-energy-budget"],
    prerequisites: ["lowpan-thread-zigbee"],
    meaning: "A wireless mesh relays packets through intermediate nodes. An ad hoc network forms without a fixed infrastructure path. Sensor networks often route measurements toward a collector while balancing loss, airtime and battery cost.",
    why: "A distant sensor may not reach the gateway directly. Relays extend coverage, but every forwarded packet consumes shared airtime and energy. A nearby relay can become a battery and congestion bottleneck.",
    model: "A mesh is a chain of couriers sharing a narrow hallway. LIMITS: more nodes do not automatically increase throughput. Wireless interference makes simultaneous links dependent, and sleeping nodes are not always available relays.",
    steps: [
      "Discover neighbors and estimate link quality. Count retries rather than relying only on received signal strength.",
      "Choose routes using a metric such as expected transmission count. Proactive routing maintains information; reactive routing discovers it when needed, with different overhead and delay.",
      "Forward packets hop by hop with loop prevention and lifetime limits. Repair routes when a relay disappears or a link deteriorates.",
      "Budget relay energy and collector traffic. Aggregate suitable sensor measurements, but retain required freshness and avoid hiding important outliers."
    ],
    example: {
      given: "A direct link succeeds with probability 0.5 per attempt. A two-hop route has probability 0.9 on each link. Assume independent attempts and unlimited retry opportunity.",
      result: "Direct delivery needs 2 expected transmissions. The two-hop route needs about 2.22, despite each link being better.",
      steps: [
        "A geometric retry model gives expected transmissions 1 / p.",
        "The direct route costs 1 / 0.5 = 2.",
        "Each good hop costs 1 / 0.9 = 1.111..., totaling 2.222....",
        "This metric prefers the direct route, but energy, delay or bounded retry requirements could change the decision."
      ]
    },
    failure: "A popular relay drains its battery and partitions downstream sensors. Stale routes create repeated retries. Route repair broadcasts can consume the same scarce channel needed for measurements.",
    confusions: ["A mesh describes multi-hop connectivity, not a guarantee that every node routes.", "The smallest hop count may not minimize retries, and best retry count may not maximize battery lifetime."],
    observe: "Measure per-hop delivery, retry counts, parent changes, relay queues and remaining energy. Inspect the collector's ingress load when many sensors report together.",
    interview: {
      answer: "Meshes trade direct-link range for relay work. Ad hoc routing must choose and repair paths while accounting for airtime, reliability and energy.",
      followups: ["Why can a gateway-adjacent relay die first?", "When would reactive route discovery be worse than maintaining routes?"]
    },
    recall: [
      { question: "How does reactive ad hoc routing find a needed route?", answer: "It starts route discovery on demand instead of continuously maintaining every route." },
      { question: "What does expected transmission count estimate?", answer: "The average number of link transmissions needed for delivery under its loss model." },
      { question: "Why can mesh relaying reduce shared-channel capacity?", answer: "The same packet consumes airtime on several interfering hops." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A three-hop path has success probability 0.8 per attempt on each hop. Find summed expected transmissions.", hint: "Sum 1 / p for each link.", answer: "3.75.", reasoning: "Each hop costs 1.25 transmissions on average; three cost 3.75." },
      { kind: "Diagnose", prompt: "Sensors near the collector drain faster than leaf sensors even with equal reporting rates. Why?", hint: "Count forwarded packets as well as originated packets.", answer: "They relay downstream traffic in addition to their own reports.", reasoning: "Forwarding and receive listening consume energy concentrated near the collector." }
    ],
    sources: ["lowpan", "kr", "systems"],
    advanced: "Mesh and ad hoc are architectures, not one protocol. Thread, routing protocols for constrained networks and mobile ad hoc protocols have distinct specifications and assumptions."
  },
  {
    id: "leo-delay-tolerant",
    module: "mobile",
    title: "LEO satellite paths and delay-tolerant delivery",
    concepts: ["leo-satellite", "satellite-propagation", "satellite-handover", "delay-tolerant-networking", "bundle-protocol", "store-carry-forward"],
    prerequisites: [],
    meaning: "Low Earth orbit satellites move relative to ground users and can offer shorter propagation paths than geostationary satellites. Delay-tolerant networking stores complete messages across interrupted contacts. Bundle Protocol supplies a message envelope for such delivery.",
    why: "Remote sites may have intermittent visibility or no continuous end-to-end path. Ordinary immediate forwarding cannot cross a gap when the next link does not exist yet.",
    model: "A satellite path is a moving set of links. A bundle is mail that can wait at a relay until its next transport appears. LIMITS: low orbit does not mean zero delay, and stored messages still need capacity, expiration and security policy.",
    steps: [
      "Separate geometric propagation from radio scheduling, processing and Internet backhaul delay. Track beam and satellite changes as the constellation moves.",
      "For continuous service, update forwarding and access attachment across those changes. Loss and reordering can reach the transport layer.",
      "For intermittent service, accept a bundle into persistent storage and select a feasible future contact.",
      "Forward over a supported convergence layer when contact appears. Enforce lifetime and storage limits; handle retries and duplicates according to implementation and application requirements."
    ],
    example: {
      given: "A toy satellite route has two 1000 km space legs. Ignore other links. A remote relay instead gets its next contact in 8 minutes, lasting 30 seconds at 2 Mb/s.",
      result: "Space-leg propagation is about 6.67 ms one way. The contact can carry at most 7.5 MB before overhead.",
      steps: [
        "Total modeled space distance is 2000 km.",
        "Divide by 300000 km/s: 0.00667 s one way, about 13.33 ms for a symmetric round trip.",
        "The delayed relay must wait up to 480 seconds, which dominates millisecond propagation.",
        "Contact capacity is 2 x 30 = 60 megabits, or 7.5 megabytes. Protocol overhead reduces useful capacity."
      ]
    },
    failure: "A bundle can expire before contact or exceed storage. A handover can interrupt a continuous satellite session. Large queues can make measured delay much larger than the geometric lower bound.",
    confusions: ["LEO is an orbit class, not a promise of a particular Internet RTT.", "Bundle storage enables delayed delivery; it does not guarantee arrival or replace application authentication."],
    observe: "Measure contact schedules, queue occupancy, bundle expiration, handover gaps and real RTT. Protect stored payloads and metadata at untrusted relays.",
    interview: {
      answer: "LEO reduces some propagation distance but adds moving-link management. DTN survives disconnected periods by storing messages until a usable contact.",
      followups: ["How would you schedule bundles when contact capacity is limited?", "Why does a propagation estimate understate measured satellite latency?"]
    },
    recall: [
      { question: "What does store-carry-forward allow?", answer: "A relay keeps a message while no usable next-hop contact exists." },
      { question: "What limits a bundle waiting for contact?", answer: "Its lifetime, available storage and future contact capacity." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A contact lasts 20 seconds at 4 Mb/s. What is its ideal byte capacity?", hint: "Multiply rate by time, then divide by eight.", answer: "10 MB before overhead.", reasoning: "4 x 20 = 80 megabits, which is 10 million bytes." },
      { kind: "Predict", prompt: "A bundle expires in 5 minutes, but the only next contact is in 7 minutes. Can that contact deliver a still-live bundle?", hint: "Waiting consumes lifetime.", answer: "No, under this plan.", reasoning: "The lifetime ends before the contact begins; another contact or a valid application lifetime policy is needed." }
    ],
    sources: ["dtn", "kr", "cellular"],
    advanced: "Bundle Protocol v7 is a Proposed Standard, not an automatic custody or delivery guarantee. LEO constellations use deployment-specific access and routing designs; 3GPP non-terrestrial features are release-dependent."
  },
  {
    id: "mmwave-visible-light",
    module: "mobile",
    title: "Millimeter-wave and visible-light links",
    concepts: ["millimeter-wave", "beamforming", "beam-blockage", "visible-light-communication", "optical-wireless-boundary"],
    prerequisites: [],
    meaning: "Millimeter-wave radio uses high-frequency bands with wide channel opportunities and often directional beams. Visible-light communication modulates emitted light and detects changes with an optical receiver. Both can offer localized capacity with important blockage limits.",
    why: "Crowded lower-frequency radio bands limit available capacity. Higher radio frequencies and optical links offer alternatives, but coverage, mobility and physical obstructions must be designed rather than assumed away.",
    model: "A directional radio beam is like aiming a narrow flashlight, but it is still radio. A visible-light link literally depends on an optical path. LIMITS: the analogy does not predict exact propagation. Neither medium guarantees privacy merely because coverage is localized.",
    steps: [
      "For millimeter-wave, train and track transmit and receive beams. Directional gain helps the link budget but requires alignment as users move.",
      "Handle blockage by selecting another beam, another access point or a lower-frequency fallback. Reflections can help, but cannot be assumed at every location.",
      "For visible light, modulate a suitable emitter and detect intensity changes. Ambient light, receiver orientation and line-of-sight or reflected paths affect decoding.",
      "Plan bidirectional service, mobility and authentication. A lighting downlink may need a separate uplink medium, and the lighting function must remain acceptable to people."
    ],
    example: {
      given: "Assume received useful power starts at -60 dBm and decoding requires at least -75 dBm. A hand adds 20 dB loss. A backup path instead adds 8 dB loss.",
      result: "The blocked primary becomes -80 dBm and fails this threshold. The backup becomes -68 dBm and retains 7 dB margin.",
      steps: [
        "Initial margin is -60 - (-75) = 15 dB.",
        "Subtract 20 dB blockage: -60 - 20 = -80 dBm, 5 dB below threshold.",
        "Subtract 8 dB on the alternate path: -60 - 8 = -68 dBm.",
        "Compare -68 with -75: the alternate has 7 dB margin. This toy budget omits interference and fading."
      ]
    },
    failure: "A human body can abruptly block a narrow radio path. An optical receiver turned away from a lamp can lose service. Sunlight can change receiver conditions, and unplanned fallback can add a long outage.",
    confusions: ["Wide bandwidth does not guarantee coverage or stable application throughput.", "Visible-light confinement is not encryption; receivers in the illuminated area may still observe traffic."],
    observe: "Test walking, rotation, blockage, ambient lighting and fallback time. Measure packet delivery and energy during beam search rather than only peak stationary throughput.",
    interview: {
      answer: "Millimeter-wave and visible-light links exploit different media for localized capacity. Both require path management, realistic coverage tests and independent security.",
      followups: ["How would you design fallback without disrupting an interactive session?", "Why does a high peak rate fail to predict mobility reliability?"]
    },
    recall: [
      { question: "Why does beamforming help a millimeter-wave link?", answer: "It concentrates transmitted or received energy in useful directions." },
      { question: "What physical condition can break a visible-light link?", answer: "Insufficient usable light reaching the receiver, due to blockage, orientation or interference." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A link has 12 dB margin. Blockage adds 17 dB loss. What is the new margin?", hint: "Loss consumes margin.", answer: "-5 dB.", reasoning: "12 - 17 = -5; the signal is below the modeled decoding requirement." },
      { kind: "Compare", prompt: "Can an optical downlink alone supply a complete bidirectional Internet service to a device without an optical transmitter?", hint: "Requests also need a return path.", answer: "No. It needs another supported uplink.", reasoning: "Receiving light does not create a channel for the device's acknowledgments or requests." }
    ],
    sources: ["kr", "systems", "cellular"],
    advanced: "Millimeter-wave cellular support depends on 3GPP band and release. Optical wireless includes standardized families and ongoing research; a laboratory proposal is not proof of interoperable deployed equipment."
  },
  {
    id: "clos-leaf-spine",
    module: "datacenter",
    title: "Leaf-spine Clos fabrics and oversubscription",
    concepts: ["clos", "leaf-spine", "oversubscription", "bisection-bandwidth"],
    prerequisites: [],
    meaning: "A leaf-spine fabric is a common folded Clos topology. Leaves connect servers and spines connect leaves. Multiple equal-cost paths spread traffic. Oversubscription compares possible offered edge traffic with available uplink capacity.",
    why: "Datacenter traffic often moves between servers rather than only toward an Internet gateway. A tree with narrow upper links can bottleneck those exchanges and create uneven path lengths.",
    model: "Leaves are entrances to several parallel cross-building corridors. LIMITS: multiple corridors do not make one flow use all of them. Hash-based multipath can collide, and nonblocking capacity depends on port counts, traffic pattern and failures.",
    steps: [
      "Attach servers to leaves and connect each leaf to the spine set. Ordinary leaf-to-leaf traffic crosses one chosen spine in a two-tier fabric.",
      "Install equal-cost routes over available uplinks. Per-flow hashing commonly keeps packets ordered but may distribute large flows unevenly.",
      "Calculate server-facing aggregate rate and uplink aggregate rate. Their ratio expresses a planned oversubscription level.",
      "Evaluate failure capacity and cross-fabric traffic, not just a healthy leaf's port sum. Traffic local to one leaf may not consume spine bandwidth."
    ],
    example: {
      given: "A leaf has 32 server ports at 25 Gb/s and four uplinks at 100 Gb/s. One uplink fails.",
      result: "Healthy oversubscription is 2:1. With one uplink down it is about 2.67:1.",
      steps: [
        "Server-facing total is 32 x 25 = 800 Gb/s.",
        "Healthy uplink total is 4 x 100 = 400 Gb/s.",
        "Compute 800 / 400 = 2, so the rate ratio is 2:1.",
        "After failure, uplinks total 300 Gb/s. Compute 800 / 300 = 2.667. This assumes all offered server traffic needs uplinks."
      ]
    },
    failure: "Several elephant flows can hash onto one uplink while others remain idle. A spine failure reduces capacity across many leaves. Port sums alone can hide a constrained fabric cut.",
    confusions: ["Equal-cost multipath distributes flows, not guaranteed equal byte volumes.", "A 2:1 design does not imply every workload runs at half speed; demand and locality matter."],
    observe: "Inspect per-uplink utilization, flow distribution, queue drops and capacity after failures. Compute bandwidth across the cut relevant to the workload's communicating groups.",
    interview: {
      answer: "Clos fabrics provide parallel leaf-to-leaf paths. Oversubscription and multipath behavior determine how much simultaneous traffic those paths can carry.",
      followups: ["How can an apparently idle fabric still drop one workload's packets?", "How would you calculate useful capacity after losing a spine?"]
    },
    recall: [
      { question: "What is the usual spine's role?", answer: "Connecting leaves through parallel transit paths." },
      { question: "What does oversubscription compare?", answer: "Potential edge demand with available upstream capacity." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Twenty-four 25 Gb/s server ports share three 100 Gb/s uplinks. Find the ratio.", hint: "Sum each side's rates.", answer: "2:1.", reasoning: "24 x 25 = 600 Gb/s and 3 x 100 = 300 Gb/s; 600 / 300 = 2." },
      { kind: "Diagnose", prompt: "One uplink is full and others are lightly used under a few large TCP flows. What should you investigate?", hint: "Flow count is not byte balance.", answer: "ECMP hash collisions and flow distribution.", reasoning: "Per-flow hashing can place several large flows on one path without moving individual packets across all paths." }
    ],
    sources: ["systems", "ieee3"],
    advanced: "Clos is a topology family, not a wire standard. Routing, link speeds and multipath features have their own specifications. A nonblocking claim must state topology and traffic assumptions.",
    diagram: "servers -- leaf A --+-- spine 1 --+-- leaf B -- servers\n                   `-- spine 2 --'\n                 parallel routed paths"
  },
  {
    id: "incast-dctcp",
    module: "datacenter",
    title: "Incast queues and DCTCP feedback",
    concepts: ["dctcp", "ecn-marking", "dctcp-alpha", "datacenter-queue-burst"],
    prerequisites: ["clos-leaf-spine"],
    meaning: "Incast occurs when many senders reply toward one receiver at nearly the same time. Their shared output queue can overflow. DCTCP uses the fraction of ECN-marked data to estimate congestion in a controlled datacenter environment.",
    why: "A distributed query can trigger small synchronized replies. Each sender sees a fast network, but their sum exceeds the last link. Timeouts can dominate query completion even when average link utilization looks modest.",
    model: "Many taps fill one narrow drain. ECN marks are feedback about the accumulating queue. LIMITS: feedback arrives after some traffic has already been sent. DCTCP cannot absorb an arbitrarily large instantaneous burst.",
    steps: [
      "A receiver or coordinator triggers multiple replies. At a shared egress, arrival rate exceeds service rate and the queue grows.",
      "Configured switches mark ECN-capable traffic when the queue crosses a threshold rather than waiting only for loss.",
      "DCTCP estimates the marked fraction F over a measurement window and updates alpha using alpha = (1 - g) x alpha + g x F.",
      "At its specified congestion response point, the sender reduces its congestion window proportionally, using roughly window x (1 - alpha / 2). Keep endpoint and marking behavior compatible."
    ],
    example: {
      given: "Eight senders each inject 1 MB toward a receiver. A toy queue sees aggregate arrivals at 80 Gb/s and drains at 10 Gb/s for 0.1 ms. Separately, alpha is 0.2, g is 0.25 and F is 0.6.",
      result: "The queue grows by 0.875 MB in that interval. Updated alpha is 0.3; a 100-packet window becomes about 85 packets at the reduction point.",
      steps: [
        "Excess arrival rate is 80 - 10 = 70 Gb/s.",
        "Backlog increase is 70e9 x 0.0001 / 8 = 875000 bytes.",
        "Update alpha: 0.75 x 0.2 + 0.25 x 0.6 = 0.3.",
        "Apply the modeled response: 100 x (1 - 0.3 / 2) = 85 packets."
      ]
    },
    failure: "A synchronized burst can overflow buffers before ECN feedback returns. Incompatible ECN behavior or an unsuitable marking threshold can undermine the controller. Averaged metrics hide short queue spikes.",
    confusions: ["Incast is a many-to-one traffic pattern, not simply any slow TCP connection.", "DCTCP uses marked fraction; it does not treat every marked byte as a full loss event."],
    observe: "Capture egress queue peaks, ECN marking, retransmissions and query tail latency. Compare response fan-in and size before blaming link speed alone.",
    interview: {
      answer: "Incast overloads a shared receiver path with synchronized replies. DCTCP uses ECN fraction to respond more proportionally in managed datacenters.",
      followups: ["Why can feedback be too late for a microburst?", "How would batching or pacing replies complement congestion control?"]
    },
    recall: [
      { question: "What creates incast?", answer: "Many synchronized senders converging on a shared receiver bottleneck." },
      { question: "What does DCTCP alpha estimate?", answer: "A smoothed fraction of congestion-marked data." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Alpha is 0.4, g is 0.5 and marked fraction is 0.2. Find new alpha.", hint: "Use the weighted update.", answer: "0.3.", reasoning: "0.5 x 0.4 + 0.5 x 0.2 = 0.3." },
      { kind: "Explain", prompt: "Why can an incast queue overflow even if DCTCP eventually lowers every sender's rate?", hint: "Compare burst arrival with feedback travel time.", answer: "The initial synchronized burst can exceed buffer space before senders receive feedback.", reasoning: "Control is delayed; a later window reduction cannot undo already dropped packets." }
    ],
    sources: ["dctcp", "systems"],
    advanced: "RFC 8257 is Informational. DCTCP assumes a controlled deployment with suitable ECN handling; it is not a universal replacement for Internet congestion control."
  },
  {
    id: "rdma-fabric-tradeoffs",
    module: "datacenter",
    title: "RDMA, InfiniBand, RoCE and PFC tradeoffs",
    concepts: ["rdma", "memory-registration", "queue-pair", "infiniband", "roce", "priority-flow-control", "pfc-head-of-line-blocking"],
    prerequisites: ["incast-dctcp"],
    meaning: "RDMA lets a capable adapter transfer data involving registered memory with little host CPU involvement on the fast path. InfiniBand provides a dedicated fabric architecture. RoCE carries RDMA over Ethernet; RoCEv2 uses UDP/IP.",
    why: "Storage and distributed computation can spend significant CPU time copying and processing network data. RDMA reduces some of that work, but requires memory protection, completion handling and carefully managed congestion.",
    model: "An adapter acts as a permission-checked courier into prepared memory. LIMITS: RDMA does not make arbitrary remote memory safe or coherent. Completion semantics vary by operation and do not automatically mean an application committed a transaction.",
    steps: [
      "Register a memory region and configure access keys and permissions. Create queue pairs and post work requests to send or receive queues.",
      "The adapter moves data and reports completion according to the selected operation and transport. Applications must still coordinate buffer ownership and lifetime.",
      "InfiniBand uses its fabric's credit-based link flow control. Ethernet RoCE deployments often combine ECN-based congestion control with carefully scoped PFC.",
      "PFC pauses a selected Ethernet priority when buffers need relief. It can spread congestion upstream, block unrelated traffic in that priority and create deadlock risks without careful design."
    ],
    example: {
      given: "A receiver has a 64 KB registered region. A remote write requests 8 KB at offset 60 KB. Separately, a 100 Gb/s link is paused for 10 microseconds.",
      result: "The write exceeds the region by 4 KB and must not be accepted as authorized access. The pause removes 125 KB of potential transmission time.",
      steps: [
        "The requested end is 60 + 8 = 68 KB.",
        "Compare 68 KB with the 64 KB region boundary: 4 KB lies outside.",
        "Protection checking must reject that operation rather than treating registration as unlimited permission.",
        "For the pause, 100e9 x 10e-6 / 8 = 125000 bytes of link opportunity are unavailable."
      ]
    },
    failure: "Reusing a buffer before completion corrupts data. Broad PFC classes can pause innocent flows. Cyclic pause dependencies can prevent progress even without packet loss.",
    confusions: ["RDMA is a programming and transport capability, not a synonym for InfiniBand.", "Loss avoidance through PFC is not end-to-end congestion control or an application correctness proof."],
    observe: "Inspect completion errors, region permissions, ECN counters, PFC duration and queue occupancy. Measure blocked traffic across the fabric, not just at the original bottleneck.",
    interview: {
      answer: "RDMA moves data through registered memory and adapter queues. InfiniBand and RoCE provide different fabrics; PFC introduces important congestion-propagation tradeoffs.",
      followups: ["How do you prevent premature buffer reuse?", "Why can lossless link behavior increase application tail latency?"]
    },
    recall: [
      { question: "Why register RDMA memory?", answer: "To establish adapter-accessible regions with defined bounds and permissions." },
      { question: "What can PFC block besides the congesting flow?", answer: "Other traffic sharing the paused priority." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A 32 KB region receives a 6 KB write at offset 28 KB. Is it in bounds?", hint: "Add offset and length.", answer: "No. It ends at 34 KB, exceeding the region by 2 KB.", reasoning: "Authorization covers the registered range, not every address following the start." },
      { kind: "Compare", prompt: "Does an Ethernet switch carrying RoCEv2 automatically provide InfiniBand's credit-based link flow control?", hint: "RDMA capability does not make the underlying fabrics identical.", answer: "No. RoCEv2 uses Ethernet and UDP/IP; InfiniBand has its own fabric flow control.", reasoning: "RoCE requires its Ethernet congestion and loss-management design. An RDMA API does not import InfiniBand link semantics." },
      { kind: "Compare", prompt: "Two RoCE flows share a paused priority, but only one caused congestion. Can the other stop too?", hint: "PFC selects a priority, not an individual application flow.", answer: "Yes.", reasoning: "Priority-level pause creates head-of-line blocking for other traffic in that class." }
    ],
    sources: ["rdma", "ieee3", "systems"],
    advanced: "InfiniBand and RoCE have industry specifications; the cited RDMA guide is vendor documentation. PFC is an IEEE 802.1 feature. RoCE deployments differ in whether and how they use PFC."
  },
  {
    id: "dpdk-kernel-bypass",
    module: "datacenter",
    title: "DPDK poll-mode packet processing",
    concepts: ["kernel-bypass", "dpdk", "poll-mode-driver", "packet-buffer-pool", "batch-packet-processing", "numa-locality"],
    prerequisites: [],
    meaning: "DPDK supplies user-space packet-processing libraries and poll-mode drivers. A dedicated loop retrieves bursts of packets from NIC queues and processes them without the usual kernel network-stack path.",
    why: "Interrupt handling, repeated allocation and per-packet transitions can limit small-packet throughput. Batching and prepared buffer pools reduce overhead, but reserve CPU and change operational integration.",
    model: "A worker continuously checks an inbox and handles letters in batches. LIMITS: avoiding the kernel stack is not avoiding all hardware, copying or synchronization. A busy poller may consume energy even when traffic is absent.",
    steps: [
      "Assign supported NIC queues and cores to the application. Configure device access, memory and CPU affinity using the deployment's driver model.",
      "Allocate packet buffers from memory pools. Retrieve a burst through a poll-mode driver rather than waiting for an interrupt per packet.",
      "Parse and act on packets, then enqueue transmit bursts. Return buffers only when ownership permits reuse; count unsent packets explicitly.",
      "Keep queues, workers and memory NUMA-local when practical. Add management, security and low-load behavior that the bypassed kernel path would otherwise provide."
    ],
    example: {
      given: "At a modeled 3 GHz, a worker spends 300 cycles per packet plus 600 cycles of fixed overhead per burst. Compare bursts of 1 and 20 packets.",
      result: "One-packet bursts cost 900 cycles per packet. Twenty-packet bursts cost 330 cycles per packet, giving an idealized 9.09 Mpps upper estimate.",
      steps: [
        "For one packet, total cost is 300 + 600 = 900 cycles.",
        "For twenty, total cost is 20 x 300 + 600 = 6600 cycles.",
        "Divide by 20: 330 cycles per packet.",
        "Compute 3e9 / 330 = about 9.09 million packets per second. Cache misses, I/O limits and contention lower real performance."
      ]
    },
    failure: "A leaked buffer gradually exhausts the pool. Wrong NUMA placement adds remote-memory cost. A poll loop can monopolize a core while the application still drops packets at a full transmit queue.",
    confusions: ["DPDK is not a standard Internet protocol.", "Kernel bypass does not automatically provide zero-copy application processing, firewall policy or fair CPU sharing."],
    observe: "Track packets per burst, pool availability, queue drops, cycles per packet and power at idle and load. Compare NIC counters with application counters.",
    interview: {
      answer: "DPDK trades dedicated polling and explicit buffer management for reduced per-packet overhead. Its gains depend on workload, locality and safe queue ownership.",
      followups: ["Why can larger batches hurt low-load latency?", "Which protections need rebuilding when traffic bypasses the ordinary kernel stack?"]
    },
    recall: [
      { question: "What does a poll-mode driver avoid on its main path?", answer: "Waiting for ordinary per-packet interrupt-driven delivery through the kernel stack." },
      { question: "Why use a packet-buffer pool?", answer: "To reuse prepared buffers rather than repeatedly allocate packet memory." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Fixed burst overhead is 800 cycles and per-packet work is 200 cycles. What is cost per packet for a burst of 16?", hint: "Amortize fixed overhead.", answer: "250 cycles.", reasoning: "200 + 800 / 16 = 250." },
      { kind: "Diagnose", prompt: "The buffer pool shrinks after every burst despite stable traffic. What ownership error should you check?", hint: "Every consumed buffer needs a defined eventual owner.", answer: "Buffers may not be returned after processing, dropping or transmission completion.", reasoning: "A leak exhausts a finite pool and creates drops independent of link bandwidth." }
    ],
    sources: ["dpdk", "systems"],
    advanced: "DPDK is a versioned software project. Driver support and device-binding requirements vary. Compare poll-mode and interrupt-based approaches under realistic latency, security and energy requirements."
  },
  {
    id: "ebpf-xdp-offloads",
    module: "datacenter",
    title: "eBPF, XDP, zero-copy and NIC offloads",
    concepts: ["ebpf", "bpf-verifier", "xdp", "af-xdp", "zero-copy", "checksum-offload", "segmentation-offload", "receive-coalescing"],
    prerequisites: [],
    meaning: "eBPF runs verified programs at supported kernel hooks. XDP processes packets early in receive handling. AF_XDP can connect selected traffic to user-space buffers. NIC offloads perform jobs such as checksum calculation or segmentation outside ordinary software processing.",
    why: "Early filtering can discard unwanted packets before expensive work. Avoiding copies or combining processing can save CPU. These optimizations change buffer ownership and the packet view seen by diagnostic tools.",
    model: "Put a small inspected decision point near the entrance, and delegate repetitive work to hardware. LIMITS: verification is not proof of correct security policy. Zero-copy means avoiding specified copies, not eliminating every data movement.",
    steps: [
      "Load an eBPF program through the verifier. The verifier checks allowed memory access and other safety properties under the current kernel's rules.",
      "At XDP, return an action such as pass, drop or redirect. Native driver support differs from generic fallback processing.",
      "AF_XDP rings transfer ownership of user memory frames between application and networking path. Supported zero-copy mode still requires strict lifetime and completion handling.",
      "Transmit offloads can defer checksums or split a large software buffer into wire packets. Receive coalescing can combine packets before upper layers see them."
    ],
    example: {
      given: "A host submits a 6000-byte TCP payload with segmentation offload and a 1500-byte IP MTU. Assume 20-byte IPv4 and 20-byte TCP headers without options.",
      result: "The NIC emits five TCP segments: four with 1460-byte payloads and one with 160 bytes.",
      steps: [
        "Available payload per wire IP packet is 1500 - 20 - 20 = 1460 bytes.",
        "Four full segments carry 4 x 1460 = 5840 bytes.",
        "Remaining payload is 6000 - 5840 = 160 bytes.",
        "A capture before NIC segmentation may show one large buffer or an unfinished checksum. That is not evidence that oversized packets went onto the wire."
      ]
    },
    failure: "An incorrect XDP rule can drop legitimate traffic before ordinary socket diagnostics. Reusing an AF_XDP frame too early corrupts packets. Offload artifacts can mislead checksum investigations.",
    confusions: ["eBPF is the execution framework; XDP is one networking attachment point.", "Verifier acceptance does not validate business logic, authorization policy or every concurrency assumption."],
    observe: "Check hook counters, verifier logs, frame-ring ownership and offload settings. Compare host captures with an independent wire-side capture before claiming corruption.",
    interview: {
      answer: "eBPF and XDP enable constrained early packet logic. Zero-copy and offloads reduce selected costs but require careful ownership and capture interpretation.",
      followups: ["Why can a local capture show a checksum that was never sent?", "Which copy does an AF_XDP zero-copy path avoid, and what work remains?"]
    },
    recall: [
      { question: "Does eBPF verifier acceptance prove that a firewall rule permits only intended users?", answer: "No. Verifier safety checks do not prove authorization-policy correctness." },
      { question: "What does XDP_PASS request?", answer: "Continue the packet through the normal networking path." },
      { question: "What does receive coalescing change for upper layers?", answer: "Several received wire packets can appear as one combined software buffer." },
      { question: "Does segmentation offload raise the wire MTU?", answer: "No. It splits a larger host buffer into MTU-sized wire packets." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A 3000-byte TCP payload uses the same 1460-byte segment limit. How many segments and what final payload?", hint: "Subtract full segments.", answer: "Three segments; the last carries 80 bytes.", reasoning: "Two full segments carry 2920 bytes, leaving 80." },
      { kind: "Predict", prompt: "In AF_XDP zero-copy mode, an application rewrites a transmitted frame before ownership returns. Is skipping a copy enough to make this safe?", hint: "The NIC may still read that memory.", answer: "No. Wait for the required completion and ownership return.", reasoning: "Zero-copy shares the original storage with the transfer path; premature reuse can alter an in-flight packet." },
      { kind: "Diagnose", prompt: "A host capture shows bad outgoing checksums with offload enabled, but a switch capture shows valid checksums. Is the wire corrupt?", hint: "Locate capture relative to NIC processing.", answer: "Not on that evidence. The host capture preceded checksum completion.", reasoning: "The NIC filled the checksum after the host-side observation." }
    ],
    sources: ["ebpf", "dpdk", "ieee3"],
    advanced: "eBPF and XDP behavior depends on Linux version and driver support. AF_XDP zero-copy is optional. Offload naming and capture behavior vary by operating system and adapter."
  },
  {
    id: "storage-ai-fabrics",
    module: "datacenter",
    title: "Distributed storage and AI training traffic",
    concepts: ["distributed-storage-network", "storage-replication", "storage-quorum", "ai-training-network", "all-reduce", "collective-tail-latency"],
    prerequisites: ["clos-leaf-spine", "rdma-fabric-tradeoffs"],
    meaning: "Distributed storage exchanges replication, recovery and client data across a fabric. Distributed AI training exchanges gradients or parameters between workers. Both workloads depend on network completion behavior, not just nominal link rate.",
    why: "A storage write may wait for several replicas. A training step may wait for the slowest participant in a collective. Background recovery or one congested path can delay foreground progress across many machines.",
    model: "A replicated write gathers receipts. A collective is a coordinated team exchange. LIMITS: a network acknowledgment is not automatically durable storage, and fast transport does not define a correct consistency or training algorithm.",
    steps: [
      "For storage, distinguish client traffic from replication and repair. Define which replicas must acknowledge and what durability each acknowledgment promises.",
      "Place replicas across failure domains. Reserve bandwidth for recovery so a failure does not consume all capacity needed by live requests.",
      "For training, choose a collective algorithm and map workers to the topology. Ring all-reduce distributes exchange work; other algorithms have different latency and bandwidth costs.",
      "Measure completion distributions, not only average throughput. RDMA can reduce transport overhead but cannot remove slow disks, worker stalls or fabric contention."
    ],
    example: {
      given: "A simplified ring all-reduce has four workers, each with a 100 MB vector. Use ideal effective per-worker bandwidth of 10 GB/s and ignore startup delay.",
      result: "Each worker sends 150 MB across both phases, requiring at least 15 ms of serialization in this model.",
      steps: [
        "Split the vector into four 25 MB chunks.",
        "Reduce-scatter takes three rounds, sending one chunk per round: 75 MB per worker.",
        "All-gather takes three more rounds: another 75 MB.",
        "Total is 150 MB. Divide by 10000 MB/s to get 0.015 seconds. Startup, contention and synchronization add delay."
      ]
    },
    failure: "Recovery traffic can saturate the same links used for writes. A slow worker extends a synchronous training step. RDMA completion can be mistaken for durable commit without the storage protocol's required acknowledgment.",
    confusions: ["Replication is not a backup against every logical deletion or corruption.", "All-reduce combines values; it does not merely copy a full vector independently to every other worker."],
    observe: "Separate foreground and repair bandwidth, quorum acknowledgment times and collective phase times. Correlate slow workers with link queues and storage or compute stalls.",
    interview: {
      answer: "Storage and training networks carry coordinated multi-node work. Topology, failure recovery and tail completion determine performance beyond raw bandwidth.",
      followups: ["Which acknowledgment makes a replicated write durable?", "How does worker placement affect all-reduce congestion?"]
    },
    recall: [
      { question: "What does a storage quorum count?", answer: "The protocol's required set or number of replica responses." },
      { question: "What does all-reduce produce?", answer: "A reduced combined value made available to all participating workers." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "For eight workers and a 160 MB vector, use ring traffic 2 x (n - 1) / n x size. How much does each worker send?", hint: "Two phases each have seven chunk exchanges.", answer: "280 MB.", reasoning: "2 x 7 / 8 x 160 = 280." },
      { kind: "Compare", prompt: "A write requires two durable replica acknowledgments. Three responses arrive at 2, 4 and 20 ms. What completion time follows, ignoring other work?", hint: "Wait for the required number, not every replica.", answer: "4 ms, if the first two responses satisfy the required durability and placement rules.", reasoning: "The second qualifying response completes this quorum; the slow third does not delay this stated policy." }
    ],
    sources: ["systems", "rdma", "dctcp"],
    advanced: "Storage quorum semantics and training collectives are application-specific. Ring traffic here is an algorithmic model. Research on collective scheduling does not imply universal gains for every fabric."
  },
  {
    id: "token-ring-fddi",
    module: "history",
    title: "Token Ring and FDDI access control",
    concepts: ["token-ring", "token-passing", "fddi", "dual-ring-recovery", "historical-lan-replacement"],
    prerequisites: [],
    meaning: "Token-passing LANs grant transmission permission through a circulating token. Token Ring used a logical ring access discipline. FDDI used fiber rings, commonly with a second counter-rotating ring for resilience.",
    why: "Early shared LANs needed a way to avoid competing transmissions. A controlled turn-taking system offered more predictable access than unscheduled contention, especially under heavy load.",
    model: "Only the holder of a speaking baton may talk. FDDI adds a backup route for the baton and frames. LIMITS: bounded waiting requires bounded token rotation and healthy management. A logical ring need not look like a physical cable circle.",
    steps: [
      "An eligible station receives a free token and transmits under its holding rules. Other stations forward frames around the logical ring.",
      "The destination copies an addressed frame. The source removes its returning frame and permits further token circulation according to the system's rules.",
      "Ring management detects lost tokens or malformed circulation and restores a usable token. Management overhead and faults affect access delay.",
      "FDDI can wrap traffic between its dual rings around certain failures. Protection depends on attachment design and the failure pattern, not merely the presence of two fibers."
    ],
    example: {
      given: "A toy ring has four stations. Each can hold the token for at most 1 ms. One full circulation adds 0.2 ms propagation and management overhead. Ignore priority extensions.",
      result: "A station that just missed its turn may wait about 3.2 ms before the token returns under this model.",
      steps: [
        "There are three other stations before the waiting station's next turn.",
        "Their maximum holding time totals 3 x 1 = 3 ms.",
        "Add the stated 0.2 ms circulation overhead.",
        "The modeled wait is 3.2 ms. Lost-token recovery or different rules invalidate this simple bound."
      ]
    },
    failure: "A lost token can stop ordinary transmission until recovery. Multiple ring breaks may defeat a protection design. A malfunctioning station can disrupt forwarding beyond its own traffic.",
    confusions: ["Token passing avoids normal access collisions; it does not eliminate physical errors.", "Token Ring's logical order does not require every installation to use a physical ring cable layout."],
    observe: "In legacy documentation, identify token timers, ring insertion, monitor roles and wrap events. Do not apply Ethernet learning-table assumptions to a token ring.",
    interview: {
      answer: "Token Ring and FDDI coordinate access with a circulating permission token. Switched Ethernet displaced them through cost, scale and increasingly fast dedicated links.",
      followups: ["What assumptions make a token waiting bound meaningful?", "Which failures can a dual ring survive, and which can partition it?"]
    },
    recall: [
      { question: "What grants access in a token-passing LAN?", answer: "Possession of the transmission token." },
      { question: "Why did FDDI use a second ring?", answer: "To support recovery paths around certain failures." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "Six stations each hold a token for at most 0.5 ms. Add 0.1 ms overhead. What is the modeled wait after just missing a turn?", hint: "Count the five other stations.", answer: "2.6 ms.", reasoning: "5 x 0.5 + 0.1 = 2.6 ms under the stated healthy-ring assumptions." },
      { kind: "Compare", prompt: "Why did full-duplex switched Ethernet weaken token passing's collision-avoidance advantage?", hint: "Each dedicated link no longer has ordinary shared-medium contention.", answer: "Full-duplex switched links removed the shared collision domain while Ethernet gained favorable cost and speed.", reasoning: "Turn-taking offered less benefit once ordinary simultaneous link transmission no longer collided." }
    ],
    sources: ["systems", "kr"],
    advanced: "Token Ring and FDDI were standardized deployed technologies, not current research proposals. They are primarily historical LAN architectures today; legacy systems can still exist.",
    diagram: "station A -> station B -> station C -> station D\n    ^                                         |\n    `------------- circulating token ---------'\nFDDI adds a second, counter-rotating ring."
  },
  {
    id: "legacy-packet-circuits",
    module: "history",
    title: "X.25, Frame Relay and ATM virtual circuits",
    concepts: ["x25", "frame-relay", "atm", "virtual-circuit", "atm-cell", "atm-adaptation"],
    prerequisites: [],
    meaning: "X.25, Frame Relay and ATM used virtual-circuit identifiers to forward traffic along established service paths. X.25 included extensive error and flow control. Frame Relay reduced that network work. ATM switched fixed-size cells.",
    why: "Early wide-area links could be slow and error-prone. Later links improved, making per-hop reliability overhead less attractive. ATM also sought predictable multiplexing for mixed voice, video and data.",
    model: "A virtual circuit is a prearranged labeled itinerary. ATM cuts cargo into identical containers. LIMITS: an identifier is locally scoped service state, not necessarily reserved bandwidth. Fixed cells do not remove congestion or adaptation overhead.",
    steps: [
      "Establish or provision a virtual circuit and map its local identifier to an outgoing interface and identifier. This differs from looking up every destination independently.",
      "X.25 uses link and packet-layer control to recover from errors and regulate delivery. Those mechanisms can add delay and state.",
      "Frame Relay carries variable-length frames with DLCI identifiers. It relies more on endpoints for recovery and can mark congestion or discard eligibility.",
      "ATM carries 53-byte cells: a 5-byte header and 48-byte payload. Adaptation layers segment higher-layer data and reassemble it at the destination."
    ],
    example: {
      given: "An ATM AAL5 transfer contains a 1500-byte payload and an 8-byte trailer. Ignore other higher-layer headers. Each cell carries 48 bytes.",
      result: "It requires 32 cells, placing 1696 bytes onto the cell stream.",
      steps: [
        "Add the AAL5 trailer: 1500 + 8 = 1508 bytes.",
        "Thirty-one cell payloads hold 31 x 48 = 1488 bytes, which is insufficient.",
        "Use 32 cells: 1536 payload bytes, including 28 padding bytes.",
        "Total cell bytes are 32 x 53 = 1696. Useful payload efficiency is about 1500 / 1696 = 88.4 percent."
      ]
    },
    failure: "Loss of one ATM cell can invalidate an entire reassembled packet. Incorrect circuit mappings black-hole traffic. Network-side recovery can interact with endpoint retries and inflate latency.",
    confusions: ["A virtual circuit is not automatically a physical dedicated wire.", "Frame Relay and ATM are different framing systems; a DLCI is not an ATM cell header."],
    observe: "Read circuit status, identifier mappings, discard counters and adaptation errors in legacy traces. Separate payload rate from line rate and control overhead.",
    interview: {
      answer: "These WAN systems used virtual circuits with different reliability and framing choices. IP and Ethernet displaced much of their use through simpler integration, scale and economics.",
      followups: ["Why can one lost cell waste a much larger packet?", "What changed when reliability moved toward endpoints?"]
    },
    recall: [
      { question: "How large is an ATM cell?", answer: "53 bytes: 5 header bytes and 48 payload bytes." },
      { question: "What identifies a Frame Relay circuit locally?", answer: "A DLCI." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "An AAL5 transfer has 100 bytes of payload plus an 8-byte trailer. How many ATM cells and cell-stream bytes?", hint: "Round up to complete 48-byte payload units.", answer: "Three cells and 159 bytes.", reasoning: "108 bytes need ceiling(108 / 48) = 3 cells; 3 x 53 = 159." },
      { kind: "Compare", prompt: "Why did Frame Relay remove much of X.25's recovery work?", hint: "Consider link quality and endpoint capability.", answer: "Improved links and capable endpoints reduced the value of heavy per-hop recovery.", reasoning: "Removing repeated control work could improve efficiency while endpoints handled remaining loss." }
    ],
    sources: ["systems", "kr"],
    advanced: "These are historical standardized service families, not new Internet-Drafts. Replacement was gradual; ATM and circuit services persisted in some access and carrier equipment."
  },
  {
    id: "isdn-sonet-sdh",
    module: "history",
    title: "ISDN and synchronous optical transport",
    concepts: ["isdn", "isdn-b-channel", "isdn-d-channel", "sonet", "sdh", "synchronous-transport", "optical-protection"],
    prerequisites: [],
    meaning: "ISDN integrated digital circuit services with separate signaling. Its bearer channels carried user traffic. SONET and SDH organized synchronous optical transport into recurring frames and tributary slots.",
    why: "Telephone networks needed reliable digital voice and predictable transport timing. Fixed circuits gave each connection an assigned share, while optical hierarchies combined many lower-rate services onto high-capacity fiber.",
    model: "A timetable reserves repeated slots for tributaries. Signaling books the service; bearer channels carry it. LIMITS: reserved slots can sit idle during silence, and optical protection does not restore an application endpoint that has failed.",
    steps: [
      "In ISDN basic-rate service, two 64 kb/s B channels carry bearer traffic and one 16 kb/s D channel carries signaling and related functions.",
      "Signaling establishes and releases circuit service. Combining bearer channels can raise user rate when supported, but does not remove protocol overhead.",
      "SONET and SDH multiplex tributaries in repeating synchronous optical frames. Pointers help locate payloads when clocks or tributaries differ slightly.",
      "Protection designs switch traffic to alternate optical resources after supported faults. Plan capacity and distinguish line protection from packet routing and end-system recovery."
    ],
    example: {
      given: "An ISDN basic-rate user combines both B channels for a 1 MB transfer. Ignore setup time and protocol overhead. A transport frame elsewhere repeats every 125 microseconds.",
      result: "The ideal transfer takes 62.5 seconds. The transport framing rate is 8000 frames per second.",
      steps: [
        "Two B channels offer 2 x 64 = 128 kb/s, not 144 kb/s of ordinary bearer capacity.",
        "A decimal 1 MB contains 8 million bits.",
        "Divide 8e6 by 128000 to obtain 62.5 seconds.",
        "For frame timing, 1 / 0.000125 = 8000 frames per second. This does not specify useful payload rate without the frame format."
      ]
    },
    failure: "Circuit capacity can remain reserved while applications are idle. Multiple fiber failures may exceed protection assumptions. A successful optical switch cannot repair failed signaling or an unavailable server.",
    confusions: ["The D channel is not an extra ordinary 16 kb/s bearer added to both B channels.", "SONET/SDH are transport hierarchies; they are not the same layer as TCP or IP routing."],
    observe: "Inspect bearer setup, optical alarms, frame synchronization and protection events. Compare usable payload with line rate before making migration claims.",
    interview: {
      answer: "ISDN separates circuit signaling from bearer channels. SONET and SDH multiplex synchronous optical transport; packet networks improved efficiency for bursty data.",
      followups: ["Why does statistical multiplexing help bursty applications?", "Which failures remain after an optical protection switch succeeds?"]
    },
    recall: [
      { question: "What is an ISDN B channel's usual rate?", answer: "64 kb/s." },
      { question: "What do synchronous transport slots provide?", answer: "Recurring allocated capacity for multiplexed tributaries." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "How long does an ideal 2 MB transfer take over two 64 kb/s bearer channels?", hint: "Convert bytes to bits and sum bearer rates.", answer: "125 seconds.", reasoning: "16e6 bits / 128000 bits per second = 125 seconds." },
      { kind: "Compare", prompt: "A circuit stays reserved while a user pauses. How can packet statistical multiplexing use that idle capacity differently?", hint: "Packet capacity need not be permanently assigned to that user.", answer: "Other users' packets can consume currently unused transmission opportunities.", reasoning: "Shared demand-driven scheduling avoids keeping every user's fixed share idle, though congestion remains possible." }
    ],
    sources: ["systems", "kr"],
    advanced: "ISDN, SONET and SDH are standardized historical service and transport families. Packet transport and Ethernet displaced many uses, but optical synchronous equipment still exists in carrier networks."
  },
  {
    id: "research-quantum-boundaries",
    module: "history",
    title: "Research proposals, quantum networks and QKD limits",
    concepts: ["internet-draft", "standards-status", "quantum-network", "entanglement", "quantum-repeater", "qkd", "qkd-authentication", "no-faster-than-light-signaling"],
    prerequisites: [],
    meaning: "An Internet-Draft is a working proposal, not an approved standard. Quantum networks aim to distribute quantum states or entanglement. Quantum key distribution produces key material under physical and protocol assumptions; it is not a general payload-encryption service.",
    why: "New networking ideas attract claims stronger than their evidence. Learners must separate deployable interoperability, research architecture and limited experimental demonstrations before making performance or security promises.",
    model: "Entanglement is a shared quantum resource, not a hidden instant message channel. QKD is a constrained way to establish keys. LIMITS: classical authenticated communication is still required. Quantum repeaters cannot simply copy unknown states like ordinary packet buffers.",
    steps: [
      "Check the exact document status, revision and scope. Standards-track RFCs can have different maturity levels; Informational research RFCs do not define an Internet Standard.",
      "A quantum link attempts state transmission or entanglement generation. Loss, noise and finite memory lifetimes limit usable rates and distances.",
      "Entanglement swapping can connect shorter quantum links using intermediate operations. Successful use still needs classical outcomes and coordination, preventing faster-than-light signaling.",
      "In QKD, parties measure quantum signals, compare selected information on an authenticated classical channel, estimate errors, reconcile and apply privacy amplification. Use the resulting keys in a separate suitable cryptographic system."
    ],
    example: {
      given: "In a simplified BB84 teaching model, 1000 detected signals use independently random choices between two bases. Ignore finite-key effects initially. Suppose reconciliation and privacy processing later remove 200 bits.",
      result: "About 500 bits remain after basis sifting, and a toy accounting leaves 300 bits. This is not a proven secure-key estimate.",
      steps: [
        "Independent basis choices agree with probability one half.",
        "Expected sifted size is 1000 x 0.5 = 500 bits.",
        "Subtract the stipulated 200-bit processing cost: 300 bits.",
        "A real secure rate requires observed error statistics, finite-key analysis, device assumptions and authenticated classical communication."
      ]
    },
    failure: "Unauthenticated classical exchange permits impersonation. Device side channels can defeat idealized security assumptions. High loss may leave too little secure key for the intended use.",
    confusions: ["Entanglement does not carry controllable information faster than light.", "QKD is neither ordinary encryption nor immunity to compromised endpoints.", "A Draft Standard RFC is not the same thing as an Internet-Draft."],
    observe: "For proposals, inspect status and interoperability evidence. For experiments, request secure-key rate, distance, error model and authentication assumptions, not only raw detection rate.",
    interview: {
      answer: "Quantum networking is an active research field. QKD can establish keys under explicit assumptions, but still needs authentication and cannot enable faster-than-light messages.",
      followups: ["Why does entanglement require classical coordination for communication?", "Which device and finite-key assumptions separate raw detections from usable secure keys?"]
    },
    recall: [
      { question: "Is an Internet-Draft an approved standard?", answer: "No. It is a revisionable working document." },
      { question: "What must QKD's classical channel provide?", answer: "Authentication against impersonation." },
      { question: "Why is an ordinary copying repeater unsuitable for unknown quantum states?", answer: "Unknown quantum states cannot be freely cloned." }
    ],
    tasks: [
      { kind: "Calculate", prompt: "A toy two-basis scheme detects 2400 signals and expects half to survive sifting. What sifted size is expected, before security processing?", hint: "Use basis agreement probability, not a secure-key claim.", answer: "1200 bits in expectation.", reasoning: "2400 x 0.5 = 1200; error correction, privacy amplification and finite-key analysis still remain." },
      { kind: "Diagnose", prompt: "A vendor claims QKD removes all need for authentication and instantly signals across distance. Which two boundaries are violated?", hint: "Separate key establishment from identity and propagation.", answer: "QKD requires authenticated classical coordination; entanglement does not allow faster-than-light signaling.", reasoning: "Without authentication an adversary can impersonate participants, and usable communication still obeys classical causal constraints." },
      { kind: "Compare", prompt: "A document is an Informational IRTF RFC. Is that equivalent to an Internet Standard?", hint: "Publication format and standards status are separate.", answer: "No.", reasoning: "An RFC can document research architecture without standardizing an interoperable Internet protocol." }
    ],
    sources: ["quantum", "systems", "kr"],
    advanced: "RFC 9340 is Informational IRTF research, not an Internet transport standard. Quantum-network architectures remain research and experimental deployment work. Specific QKD systems have additional security and certification boundaries."
  }
];
