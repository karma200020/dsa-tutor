// Audit: every LLD topic must (1) render at least one visible, non-empty
// diagram (in a lesson section or an example), and (2) cover the required
// solution structure markers across its lesson content, so LLD topics are
// not left as thin/generic placeholders. Run with:
//   npx tsx scripts/audit-lld-diagrams.ts
import { allLldTopics } from "../data/all-topics";

function hasDiagram(topic: (typeof allLldTopics)[number]): boolean {
  const lessonHasDiagram = (topic.lesson || []).some((s) => !!s.diagram && s.diagram.trim().length > 0);
  const exampleHasDiagram = (topic.examples || []).some((e) => !!e.diagram && e.diagram.trim().length > 0);
  return lessonHasDiagram || exampleHasDiagram;
}

// Foundational OOP/pattern topics (SOLID, DRY/YAGNI/KISS, individual pattern
// intros, UML, concurrency, interview framework) are scoped narrower than a
// full end-to-end design exercise, so they are only required to have a
// diagram, not the full requirements/entities/patterns/tests structure below.
// Design-exercise and mock topics (moduleId mod-lld-design-exercises or
// mod-lld-mocks) must show the complete structure.
function requiresFullStructure(topic: (typeof allLldTopics)[number]): boolean {
  return topic.moduleId === "mod-lld-design-exercises" || topic.moduleId === "mod-lld-mocks";
}

const requiredMarkers: { name: string; keywords: string[] }[] = [
  { name: "requirements/use-cases", keywords: ["requirement", "use case", "clarif"] },
  { name: "entities/responsibilities", keywords: ["entit", "responsibilit", "class"] },
  { name: "apis/interfaces", keywords: ["api", "interface", "method"] },
  { name: "patterns", keywords: ["pattern", "strategy", "state", "factory", "observer", "singleton", "decorator", "command"] },
  { name: "concurrency/error-handling", keywords: ["concurren", "thread", "lock", "race", "error", "fail"] },
  { name: "extensibility", keywords: ["extensib", "extend", "add"] },
  { name: "trade-offs", keywords: ["trade-off", "tradeoff", "trade off"] }
];

function lessonText(topic: (typeof allLldTopics)[number]): string {
  return (topic.lesson || [])
    .map((s) => `${s.title} ${s.content}`)
    .join(" \n ")
    .toLowerCase();
}

function missingMarkers(topic: (typeof allLldTopics)[number]): string[] {
  const text = lessonText(topic);
  return requiredMarkers
    .filter((marker) => !marker.keywords.some((kw) => text.includes(kw)))
    .map((marker) => marker.name);
}

const missingDiagram = allLldTopics.filter((t) => !hasDiagram(t));
const structureCandidates = allLldTopics.filter(requiresFullStructure);
const missingStructure = structureCandidates
  .map((t) => ({ topic: t, missing: missingMarkers(t) }))
  .filter((entry) => entry.missing.length > 0);

let failed = false;

if (missingDiagram.length > 0) {
  failed = true;
  console.error(`FAIL: ${missingDiagram.length} LLD topic(s) missing a diagram:`);
  for (const t of missingDiagram) console.error(` - ${t.id}: ${t.title}`);
}

if (missingStructure.length > 0) {
  failed = true;
  console.error(`FAIL: ${missingStructure.length} LLD design-exercise/mock topic(s) missing required solution section(s):`);
  for (const entry of missingStructure) {
    console.error(` - ${entry.topic.id}: ${entry.topic.title} -> missing [${entry.missing.join(", ")}]`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log(
    `PASS: all ${allLldTopics.length} LLD topics have a non-empty diagram, and all ${structureCandidates.length} design-exercise/mock topics cover the required solution sections (requirements/use-cases, entities, APIs, patterns, concurrency/error-handling, extensibility, trade-offs).`
  );
}
