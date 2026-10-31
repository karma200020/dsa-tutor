import { cnLessons, allCnTopics } from "../topics/cn";
import { cnModules } from "../cn-catalog";
import { cnSources } from "./sources";

export const cnCoverage = cnLessons.flatMap((lesson) => lesson.concepts.map((concept) => ({
  concept,
  ownerLesson: lesson.id,
  ownerTopic: allCnTopics.find((topic) => topic.network.id === lesson.id)!.id,
  module: lesson.module,
  scope: cnModules.find((module) => module.id === `mod-cn-${lesson.module}`)!.optional ? "specialist" : "core",
  prerequisites: lesson.prerequisites,
  modulePrerequisites: cnModules.find((module) => module.id === `mod-cn-${lesson.module}`)!.dependencies,
  learningOutcome: lesson.interview.answer,
  workedExample: lesson.example,
  assessment: lesson.tasks,
  sources: lesson.sources.map((id) => ({ id, ...cnSources[id] }))
})));

export const cnCrosswalk = [
  {
    unit: "NC-Fundamentals", heading: "Fundamentals",
    outcome: "Explain Internet organization, terminology, layers and edge/core complexity; evaluate circuit versus packet switching.",
    modules: ["foundations", "physical", "performance"],
    assessment: "Trace the packet journey and compare switching under explicit workload assumptions."
  },
  {
    unit: "NC-Applications", heading: "Networked Applications",
    outcome: "Explain naming and socket interaction, evaluate paradigms and demands, develop an application protocol.",
    modules: ["dns", "http", "applications", "sockets", "cloud", "cases"],
    assessment: "Execute local echo/framing, recover truncated messages and defend application delivery choices."
  },
  {
    unit: "NC-Reliability", heading: "Reliability Support",
    outcome: "Develop reliability and flow-control mechanisms; evaluate error control and TCP performance.",
    modules: ["link", "reliable", "transport", "performance"],
    assessment: "reliable-arq-sequence owns the end-to-end ARQ exercise. The browser exposes data/cn/models.ts stopAndWait via NetworkReliabilityModel; scripts/test-cn.ts checks no loss, lost DATA, lost ACK and duplicate suppression. This original bounded implementation, not TCP echo/framing, supplies the simple-protocol design/development example. Also calculate window/RTT limits."
  },
  {
    unit: "NC-Routing", heading: "Routing and Forwarding",
    outcome: "Evaluate routing paradigms, apply forwarding table matching and explain Internet scalability.",
    modules: ["ipv4", "host", "ipv6", "routing", "cloud", "enterprise"],
    assessment: "Apply subnet/LPM fixtures and defend policy versus shortest-path routing."
  },
  {
    unit: "NC-SingleHop", heading: "Single Hop Communication",
    outcome: "Evaluate media, modulation, encoding and MAC access; apply switching and LAN topology design.",
    modules: ["physical", "link", "ethernet", "wifi", "datacenter"],
    assessment: "Trace learned/flooded frames, diagnose loops and compare random with scheduled access."
  },
  {
    unit: "NC-Security", heading: "Network Security",
    outcome: "Explain threats, countermeasures and a concrete network-security case.",
    modules: ["security", "dns", "enterprise", "troubleshooting", "cases"],
    assessment: "Diagnose certificate and policy failures; state encryption visibility and routing-validation limits."
  },
  {
    unit: "NC-Mobility", heading: "Mobility",
    outcome: "Explain cellular registration, WLAN mobility and device-to-device/multihop applications.",
    modules: ["wifi", "mobile"],
    assessment: "Trace registration/handover and compare low-power or delayed-delivery link requirements."
  },
  {
    unit: "NC-Emerging", heading: "Emerging Topics",
    outcome: "Explain middleboxes, virtualization, SDN and quantum-networking value with physical limits.",
    modules: ["cloud", "enterprise", "datacenter", "mobile", "history"],
    assessment: "Defend an overlay/programmable path and distinguish deployed standards from research proposals."
  }
] as const;

export const cnOutlineCrosswalk = [
  { source: "kr", outline: "1 Internet; 2 applications; 3 transport; 4 data-plane network; 5 control-plane network; 6 link/LAN; 7 wireless/mobile; 8 security", modules: ["foundations", "dns", "http", "applications", "transport", "performance", "ipv4", "ipv6", "routing", "link", "ethernet", "wifi", "mobile", "security"] },
  { source: "systems", outline: "Foundation; direct links; internetworking; advanced internetworking; end-to-end protocols; congestion; data; applications", modules: ["foundations", "physical", "link", "ethernet", "ipv4", "routing", "enterprise", "reliable", "transport", "performance", "sockets", "applications"] },
  { source: "stanford", outline: "Public course: layers, reliable byte stream, IP routing and implementation labs", modules: ["foundations", "reliable", "transport", "routing", "sockets"] },
  { source: "labs", outline: "Public student lab families: HTTP, DNS, TCP, UDP, IP, Ethernet, Wi-Fi, TLS", modules: ["http", "dns", "transport", "ipv4", "ethernet", "wifi", "security", "troubleshooting"] },
  { source: "linux", outline: "Practical socket interfaces, options, I/O and errors", modules: ["sockets", "troubleshooting", "cloud"] },
  { source: "windows", outline: "Platform-specific connectivity and route diagnostics", modules: ["host", "troubleshooting"] }
];

export const cnScopeLedger = [
  { item: "Public Internet exhaustiveness", decision: "Not claimed. Crosswalk is the approved scope plus diverse cited authoritative outlines.", reason: "No finite curriculum can claim to cover every online resource or vendor extension." },
  { item: "Restricted instructor solutions and copied textbook chapters", decision: "Excluded", reason: "All teaching, diagrams, traces and answers are independently authored." },
  { item: "IEEE full paywalled standard text", decision: "Working-group authority linked; no claimed full-text reproduction", reason: "Version-specific implementations and public documentation remain qualified." },
  { item: "NPTEL detailed syllabus", decision: "Course existence verified in planning; detailed crosswalk not claimed", reason: "Detailed syllabus did not load. Public course: https://nptel.ac.in/courses/106105183." },
  { item: "NetAcad account lessons", decision: "Optional additional resource, not an audited source outline", reason: "Public course exists; account-specific content not inspected: https://www.netacad.com/courses/networking-basics." },
  { item: "Hardware operation and vendor certification minutiae", decision: "Not exhaustively enumerated", reason: "Focused on concepts, trace reasoning and practical boundaries; no approved core group deferred." },
  { item: "Live capture, public load tests and physical network mutation", decision: "Excluded from static application", reason: "Offline traces and authorized loopback labs provide safe deterministic access." },
  { item: "Automatic spaced repetition scheduling", decision: "Not implemented or claimed", reason: "Atomic retrieval cards and review recommendations use existing local mastery, not a fictitious SM-2 backend." },
  { item: "Windows validation scope", decision: "Portable Python program compiled/self-tested and its CLI cases executed on Windows Python 3.13.5", reason: "Separate Windows runner supplied evidence for identical CRLF source. Other Windows network tools, IOCP implementations and all terminal encodings were not executable-tested." },
  { item: "Standards status and errata", decision: "Selected original metadata checked October 2026; not exhaustive future updates", reason: "Verified corrections differ from Reported, Held and Rejected records. RFC 9846 replaces 8446 without changing TLS version to 1.4." }
];
