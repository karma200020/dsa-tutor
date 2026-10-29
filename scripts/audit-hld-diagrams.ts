// Audit: every HLD topic must render a visible diagram and substantive lesson
// content. Mock interviews additionally retain the full solution structure.
//   npx tsx scripts/audit-hld-diagrams.ts
import { allHldTopics } from "../data/all-topics";

function hasDiagram(topic: (typeof allHldTopics)[number]): boolean {
  const lessonHasDiagram = (topic.lesson || []).some((s) => !!s.diagram && s.diagram.trim().length > 0);
  const exampleHasDiagram = (topic.examples || []).some((e) => !!e.diagram && e.diagram.trim().length > 0);
  return lessonHasDiagram || exampleHasDiagram;
}

// Each marker is a set of keyword alternatives; the combined lesson text
// (titles + content, case-insensitive) must contain at least one keyword
// from each marker group for the topic to count as having full structural
// depth, rather than the short generic fallback.
const requiredMarkers: { name: string; keywords: string[] }[] = [
  { name: "requirements", keywords: ["requirement"] },
  { name: "capacity/estimates", keywords: ["capacity", "estimate", "back-of-envelope", "back of envelope"] },
  { name: "apis/contracts", keywords: ["api", "endpoint", "contract"] },
  { name: "architecture", keywords: ["architecture", "component"] },
  { name: "flow", keywords: ["flow", "walkthrough"] },
  { name: "scaling", keywords: ["scal"] },
  { name: "reliability/consistency", keywords: ["reliab", "consisten", "failover", "failure"] },
  { name: "trade-offs", keywords: ["trade-off", "tradeoff", "trade off"] }
];

function lessonText(topic: (typeof allHldTopics)[number]): string {
  return (topic.lesson || [])
    .map((s) => `${s.title} ${s.content}`)
    .join(" \n ")
    .toLowerCase();
}

function missingMarkers(topic: (typeof allHldTopics)[number]): string[] {
  const text = lessonText(topic);
  return requiredMarkers
    .filter((marker) => !marker.keywords.some((kw) => text.includes(kw)))
    .map((marker) => marker.name);
}

const missingDiagram = allHldTopics.filter((t) => !hasDiagram(t));
const mockTopics = allHldTopics.filter((topic) => topic.id.includes("-mock-"));
const missingStructure = mockTopics
  .map((t) => ({ topic: t, missing: missingMarkers(t) }))
  .filter((entry) => entry.missing.length > 0);

let failed = false;
const shallowTopics = allHldTopics.filter((topic) => {
  const contentLength = (topic.lesson || []).reduce((sum, section) => sum + section.content.trim().length, 0);
  return (topic.lesson || []).length < 2 || contentLength < 300;
});

if (missingDiagram.length > 0) {
  failed = true;
  console.error(`FAIL: ${missingDiagram.length} HLD topic(s) missing a diagram:`);
  for (const t of missingDiagram) console.error(` - ${t.id}: ${t.title}`);
}

if (missingStructure.length > 0) {
  failed = true;
  console.error(`FAIL: ${missingStructure.length} HLD topic(s) missing required structural section(s):`);
  for (const entry of missingStructure) {
    console.error(` - ${entry.topic.id}: ${entry.topic.title} -> missing [${entry.missing.join(", ")}]`);
  }
}

if (shallowTopics.length > 0) {
  failed = true;
  console.error(`FAIL: ${shallowTopics.length} HLD topic(s) lack substantive topic-specific lesson depth:`);
  for (const topic of shallowTopics) console.error(` - ${topic.id}: ${topic.title}`);
}

if (failed) {
  process.exit(1);
} else {
  console.log(
    `PASS: all ${allHldTopics.length} HLD topics have a non-empty diagram and substantive topic-specific lessons; all ${mockTopics.length} mocks retain the complete system-design structure.`
  );
}
