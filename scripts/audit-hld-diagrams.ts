// Audit: every HLD topic must render at least one visible, non-empty diagram
// (in a lesson section or an example) once enrichTopic() has run. Run with:
//   npx tsx scripts/audit-hld-diagrams.ts
import { allHldTopics } from "../data/all-topics";

function hasDiagram(topic: (typeof allHldTopics)[number]): boolean {
  const lessonHasDiagram = (topic.lesson || []).some((s) => !!s.diagram && s.diagram.trim().length > 0);
  const exampleHasDiagram = (topic.examples || []).some((e) => !!e.diagram && e.diagram.trim().length > 0);
  return lessonHasDiagram || exampleHasDiagram;
}

const missing = allHldTopics.filter((t) => !hasDiagram(t));

if (missing.length > 0) {
  console.error(`FAIL: ${missing.length} HLD topic(s) missing a diagram:`);
  for (const t of missing) console.error(` - ${t.id}: ${t.title}`);
  process.exit(1);
} else {
  console.log(`PASS: all ${allHldTopics.length} HLD topics have at least one non-empty diagram.`);
}
