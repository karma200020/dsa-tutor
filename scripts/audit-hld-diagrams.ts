// Audit: every HLD topic must (1) render at least one visible, non-empty
// diagram (in a lesson section or an example), and (2) cover the required
// AlgoMaster-style structural markers across its lesson content - i.e. it
// must not be left on the generic short fallback format. Run with:
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
const missingStructure = allHldTopics
  .map((t) => ({ topic: t, missing: missingMarkers(t) }))
  .filter((entry) => entry.missing.length > 0);

let failed = false;

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

if (failed) {
  process.exit(1);
} else {
  console.log(
    `PASS: all ${allHldTopics.length} HLD topics have a non-empty diagram and cover all required structural sections (requirements, capacity, APIs, architecture, flow, scaling, reliability/consistency, trade-offs).`
  );
}
